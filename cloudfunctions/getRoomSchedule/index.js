// 云函数 getRoomSchedule：查询某会议室某天已通过的预约时段
// 只返回时间字段，不暴露申请人姓名、电话等隐私
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const { roomId, dateStr } = event

  if (!roomId || !dateStr) {
    return { code: 400, msg: '参数不完整', data: [] }
  }

  try {
    const res = await db.collection('reservations')
      .where({
        roomId,
        dateStr,
        status: 1 // 仅已通过的预约占用时段
      })
      .field({ startTime: true, endTime: true })
      .orderBy('startTime', 'asc')
      .get()

    return { code: 200, data: res.data }
  } catch (err) {
    return { code: 500, msg: err.message, data: [] }
  }
}
