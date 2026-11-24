// 云函数 cancelReservation：申请人取消自己的待审批申请
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { reservationId } = event

  if (!reservationId) return { code: 400, msg: '缺少申请单 ID' }

  try {
    // 先取出记录，校验归属和状态
    const recordRes = await db.collection('reservations').doc(reservationId).get()
    const record = recordRes.data

    if (!record) return { code: 400, msg: '申请单不存在' }
    if (record.applicantOpenid !== OPENID) return { code: 403, msg: '只能取消本人的申请' }
    if (record.status !== 0) return { code: 400, msg: '仅待审批的申请可以取消' }

    // 更新为已取消
    await db.collection('reservations').doc(reservationId).update({
      data: {
        status: 3, // 3 = 已取消
        auditTime: Date.now(),
        auditRemark: record.auditRemark || '申请人主动取消'
      }
    })

    return { code: 200, msg: '申请已取消' }
  } catch (err) {
    return { code: 500, msg: err.message }
  }
}
