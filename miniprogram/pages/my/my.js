// pages/my/my.js 我的申请逻辑
const util = require('../../utils/util.js')

Page({
  data: {
    list: [],
    loading: true
  },

  onLoad() {
    this.loadList()
  },

  // 每次页面显示都刷新，保证状态最新
  onShow() {
    if (this.data.list.length) this.loadList()
  },

  async loadList() {
    this.setData({ loading: true })
    try {
      const res = await wx.cloud.callFunction({ name: 'getMyReservations' })
      const records = (res.result && res.result.data) || []

      const list = records.map(item => ({
        ...item,
        statusText: util.STATUS_MAP[item.status] || '未知',
        statusClass: util.STATUS_CLASS[item.status] || 'tag-cancel',
        timeText: `${util.formatTime(item.startTime)} - ${util.formatTime(item.endTime)}`
      }))

      this.setData({ list })
    } catch (err) {
      console.error('我的申请加载失败：', err)
      util.toast('加载失败，请稍后重试')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 取消待审批申请
  onCancel(e) {
    const reservationId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这条借用申请吗？取消后不可恢复。',
      confirmText: '确认取消',
      confirmColor: '#D54941',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '处理中...' })
        try {
          const result = await wx.cloud.callFunction({
            name: 'cancelReservation',
            data: { reservationId }
          })
          if (result.result.code === 200) {
            util.toast('已取消', 'success')
            this.loadList()
          } else {
            util.toast(result.result.msg || '取消失败')
          }
        } catch (err) {
          console.error(err)
          util.toast('网络异常，请稍后重试')
        } finally {
          wx.hideLoading()
        }
      }
    })
  },

  async onPullDownRefresh() {
    await this.loadList()
    wx.stopPullDownRefresh()
  }
})
