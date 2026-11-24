// 云函数 auditReservation：管理员审批（通过 / 驳回）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { reservationId, status, auditRemark } = event

  // ---------- 1. 管理员身份校验 ----------
  const adminCheck = await db.collection('admins').where({ openid: OPENID }).count()
  if (adminCheck.total === 0) {
    return { code: 403, msg: '无审批权限' }
  }

  // ---------- 2. 参数校验 ----------
  if (!reservationId) return { code: 400, msg: '缺少申请单 ID' }
  // 审批操作只允许 1（通过）或 2（驳回）
  if (status !== 1 && status !== 2) return { code: 400, msg: '审批状态不合法' }

  let record
  try {
    const recordRes = await db.collection('reservations').doc(reservationId).get()
    record = recordRes.data
  } catch (err) {
    return { code: 400, msg: '申请单不存在' }
  }

  if (!record) return { code: 400, msg: '申请单不存在' }
  if (record.status !== 0) return { code: 400, msg: '该申请已审批，请勿重复操作' }

  // ---------- 3. 通过时再次做冲突校验 ----------
  // 防止两个待审批申请时段重叠，审批后产生冲突
  if (status === 1) {
    const conflictRes = await db.collection('reservations').where({
      _id: _.neq(reservationId),
      roomId: record.roomId,
      dateStr: record.dateStr,
      status: 1,
      startTime: _.lt(record.endTime),
      endTime: _.gt(record.startTime)
    }).count()

    if (conflictRes.total > 0) {
      return { code: 400, msg: '该时段与已通过的其他预约冲突，无法通过' }
    }
  }

  // ---------- 4. 更新审批结果 ----------
  try {
    await db.collection('reservations').doc(reservationId).update({
      data: {
        status,
        auditTime: Date.now(),
        auditRemark: auditRemark || ''
      }
    })
    return { code: 200, msg: '审批完成' }
  } catch (err) {
    return { code: 500, msg: err.message }
  }
}
