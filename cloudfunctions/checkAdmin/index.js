// 云函数 checkAdmin：判断当前用户是否在 admins 管理员表中
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  try {
    const res = await db.collection('admins').where({ openid: OPENID }).count()
    return { isAdmin: res.total > 0, openid: OPENID }
  } catch (err) {
    // admins 集合不存在等异常时，按非管理员处理，避免前端崩溃
    return { isAdmin: false, error: err.message }
  }
}
