// 云函数 submitReservation：提交借用申请（服务端做完整校验与冲突检测）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 每日可预约时间范围：8:00 - 22:00
const OPEN_HOUR = 8
const CLOSE_HOUR = 22

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const {
    roomId,
    applicantName,
    applicantDept,
    phone,
    useReason,
    peopleNum,
    startTime,
    endTime,
    dateStr
  } = event

  // ---------- 1. 基础参数校验 ----------
  if (!roomId || !dateStr) return { code: 400, msg: '参数不完整' }
  if (!applicantName || !String(applicantName).trim()) return { code: 400, msg: '请填写申请人姓名' }
  if (!applicantDept || !String(applicantDept).trim()) return { code: 400, msg: '请填写部门/社团' }
  if (!phone || !/^1[3-9]\d{9}$/.test(String(phone))) return { code: 400, msg: '联系电话格式不正确' }
  if (!useReason || !String(useReason).trim()) return { code: 400, msg: '请填写借用事由' }
  if (!Number.isInteger(peopleNum) || peopleNum <= 0) return { code: 400, msg: '使用人数不合法' }
  if (!startTime || !endTime || startTime >= endTime) return { code: 400, msg: '借用时间不合法' }

  // ---------- 1.5 文本内容安全检测：识别用户输入中的违法违规内容 ----------
  try {
    const checkContent = `${applicantName} ${applicantDept} ${useReason}`
    const secResult = await cloud.openapi.security.msgSecCheck({
      openid: OPENID,
      scene: 1, // 1 = 资料类场景
      version: 2,
      content: String(checkContent).slice(0, 2500)
    })
    const suggest = secResult && secResult.result && secResult.result.suggest
    if (suggest === 'risky') {
      return { code: 400, msg: '输入内容含违法违规信息，请修改后再提交' }
    }
    // suggest 为 pass 或 review 均放行；review 内容由管理员审批时人工把关
  } catch (secErr) {
    // 安全接口临时异常时不阻断提交，后续由管理员人工审核兜底
    console.error('内容安全检测异常：', secErr)
  }

  // ---------- 2. 时间范围校验：必须在北京时间 8:00-22:00 之间 ----------
  // 云函数容器时区是 UTC，不能直接用 new Date 解析，需显式按 UTC+8 计算当天边界
  const BJT_OFFSET = 8 * 3600 * 1000
  const ONE_DAY = 24 * 3600 * 1000
  const dayStart = Math.floor((startTime + BJT_OFFSET) / ONE_DAY) * ONE_DAY - BJT_OFFSET
  const openTime = dayStart + OPEN_HOUR * 3600 * 1000
  const closeTime = dayStart + CLOSE_HOUR * 3600 * 1000

  if (startTime < openTime || endTime > closeTime) {
    return { code: 400, msg: `借用时间需在 ${OPEN_HOUR}:00 - ${CLOSE_HOUR}:00 之间` }
  }

  // 不能预约已经过去的时间
  if (startTime < Date.now()) {
    return { code: 400, msg: '不能预约已过去的时间' }
  }

  // ---------- 3. 校验会议室是否存在且启用 ----------
  try {
    const roomRes = await db.collection('meeting_rooms').doc(roomId).get()
    if (!roomRes.data) return { code: 400, msg: '会议室不存在' }
    if (roomRes.data.enable === false) return { code: 400, msg: '该会议室已停用预约' }
    if (roomRes.data.capacity && peopleNum > roomRes.data.capacity) {
      return { code: 400, msg: `人数超过会议室容量（${roomRes.data.capacity}人）` }
    }
  } catch (err) {
    return { code: 400, msg: '会议室不存在' }
  }

  // ---------- 4. 服务端时间冲突校验（核心安全逻辑，前端无法绕过）----------
  const conflictRes = await db.collection('reservations').where({
    roomId,
    dateStr,
    status: 1, // 仅已通过的预约占用时段
    startTime: _.lt(endTime),
    endTime: _.gt(startTime)
  }).count()

  if (conflictRes.total > 0) {
    return { code: 400, msg: '该时段已被预约，请更换时间' }
  }

  // ---------- 5. 写入待审批记录 ----------
  try {
    const result = await db.collection('reservations').add({
      data: {
        roomId,
        applicantOpenid: OPENID,
        applicantName: String(applicantName).trim(),
        applicantDept: String(applicantDept).trim(),
        phone: String(phone),
        useReason: String(useReason).trim(),
        peopleNum,
        startTime,
        endTime,
        dateStr,
        status: 0, // 0 = 待审批
        createTime: Date.now(),
        auditTime: null,
        auditRemark: ''
      }
    })
    return { code: 200, msg: '申请提交成功，请等待审批', id: result._id }
  } catch (err) {
    return { code: 500, msg: '写入失败：' + err.message }
  }
}
