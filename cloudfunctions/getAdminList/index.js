// 云函数 getAdminList：管理员查询全部借用申请
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  // 管理员身份校验
  const adminCheck = await db.collection('admins').where({ openid: OPENID }).count()
  if (adminCheck.total === 0) {
    return { code: 403, msg: '无审批权限', data: [] }
  }

  try {
    const res = await db.collection('reservations')
      .orderBy('createTime', 'desc')
      .limit(100) // 单次最多取 100 条，数据量大时可改为分页
      .get()

    return { code: 200, data: res.data }
  } catch (err) {
    return { code: 500, msg: err.message, data: [] }
  }
}
