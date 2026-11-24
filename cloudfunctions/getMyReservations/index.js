// 云函数 getMyReservations：查询当前用户的全部借用申请
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    const res = await db.collection('reservations')
      .where({ applicantOpenid: OPENID })
      .orderBy('createTime', 'desc')
      .get()

    return { code: 200, data: res.data }
  } catch (err) {
    return { code: 500, msg: err.message, data: [] }
  }
}
