// pages/index/index.js 首页逻辑
const util = require('../../utils/util.js')
const db = wx.cloud.database()

Page({
  data: {
    today: '',
    tomorrow: '',
    dayAfter: '',
    currentDate: '',
    weekText: '',
    roomInfo: {},
    timeSlots: []
  },

  onLoad() {
    // 计算今天、明天、后天三个日期
    const now = new Date()
    const today = util.formatDate(now)
    const tomorrow = util.formatDate(new Date(now.getTime() + 24 * 3600 * 1000))
    const dayAfter = util.formatDate(new Date(now.getTime() + 2 * 24 * 3600 * 1000))

    this.setData({
      today,
      tomorrow,
      dayAfter,
      currentDate: today,
      weekText: this.getWeekText(today)
    })

    this.initPage()
  },

  // 并行加载会议室信息和预约时段
  async initPage() {
    wx.showLoading({ title: '加载中...' })
    try {
      await this.getRoomInfo()
      await this.loadSchedule()
    } catch (err) {
      console.error(err)
      util.toast('加载失败，请检查云环境配置')
    } finally {
      wx.hideLoading()
    }
  },

  // 获取 301 会议室基础信息（meeting_rooms 集合对所有用户可读）
  async getRoomInfo() {
    const res = await db.collection('meeting_rooms')
      .where({ name: '301会议室' })
      .get()
    if (res.data && res.data.length) {
      this.setData({ roomInfo: res.data[0] })
    }
  },

  // 调用云函数获取当天已通过的预约时段（不返回他人隐私信息）
  async loadSchedule() {
    const { currentDate, roomInfo } = this.data
    if (!roomInfo._id) return

    const res = await wx.cloud.callFunction({
      name: 'getRoomSchedule',
      data: {
        roomId: roomInfo._id,
        dateStr: currentDate
      }
    })

    const records = (res.result && res.result.data) || []
    const slots = this.buildTimeSlots(currentDate, records)
    this.setData({ timeSlots: slots })
  },

  // 生成 8:00 - 22:00 的整点时段，并标记是否被占用
  buildTimeSlots(dateStr, records) {
    const slots = []
    for (let i = 8; i < 22; i++) {
      const timeStr = `${String(i).padStart(2, '0')}:00`
      const slotStart = util.toTimestamp(dateStr, timeStr)
      const slotEnd = slotStart + 60 * 60 * 1000

      // 区间重叠判断：两个时间段有交集即算占用
      const isOccupied = records.some(record => {
        return slotStart < record.endTime && slotEnd > record.startTime
      })

      slots.push({ time: timeStr, isOccupied })
    }
    return slots
  },

  // 计算星期几
  getWeekText(dateStr) {
    const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekMap[new Date(`${dateStr}T00:00:00`).getDay()]
  },

  // 日期选择器切换
  onDateChange(e) {
    const date = e.detail.value
    this.setData({ currentDate: date, weekText: this.getWeekText(date) })
    this.loadSchedule()
  },

  // 今天 / 明天 / 后天快捷按钮
  onQuickDate(e) {
    const days = Number(e.currentTarget.dataset.days)
    const base = new Date(this.data.today + 'T00:00:00').getTime()
    const date = util.formatDate(new Date(base + days * 24 * 3600 * 1000))
    this.setData({ currentDate: date, weekText: this.getWeekText(date) })
    this.loadSchedule()
  },

  // 下拉刷新
  async onPullDownRefresh() {
    try {
      await this.loadSchedule()
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  // 跳转申请页，把日期和会议室 ID 带过去
  goApply() {
    const { currentDate, roomInfo } = this.data
    if (!roomInfo._id) {
      util.toast('会议室信息未加载，请稍后再试')
      return
    }
    wx.navigateTo({
      url: `/pages/apply/apply?date=${currentDate}&roomId=${roomInfo._id}`
    })
  }
})
