// pages/admin/admin.js 管理员审批逻辑
const util = require('../../utils/util.js')
const app = getApp()

Page({
  data: {
    checking: true,
    isAdmin: false,
    tabs: [
      { label: '待审批', value: 0 },
      { label: '已通过', value: 1 },
      { label: '已驳回', value: 2 },
      { label: '已取消', value: 3 }
    ],
    currentTab: 0,
    allList: [],
    filteredList: [],
    countMap: { 0: 0, 1: 0, 2: 0, 3: 0 }
  },

  async onLoad() {
    await this.checkIdentity()
  },

  onShow() {
    // 从其他页面切回时，若是管理员则刷新数据
    if (this.data.isAdmin) this.loadList()
  },

  // 检查管理员身份
  async checkIdentity() {
    this.setData({ checking: true })
    try {
      // 以云函数实时结果为准，防止本地缓存不准
      const res = await wx.cloud.callFunction({ name: 'checkAdmin' })
      const isAdmin = !!(res.result && res.result.isAdmin)
      this.setData({ isAdmin })
      app.globalData.isAdmin = isAdmin
      if (isAdmin) {
        await this.loadList()
      }
    } catch (err) {
      console.error('身份校验失败：', err)
      util.toast('身份校验失败，请稍后重试')
    } finally {
      this.setData({ checking: false })
    }
  },

  // 加载全部申请记录
  async loadList() {
    wx.showLoading({ title: '加载中...' })
    try {
      const res = await wx.cloud.callFunction({ name: 'getAdminList' })
      const result = res.result || {}
      if (result.code === 403) {
        this.setData({ isAdmin: false })
        return
      }
      const records = result.data || []

      const allList = records.map(item => ({
        ...item,
        statusText: util.STATUS_MAP[item.status],
        statusClass: util.STATUS_CLASS[item.status],
        timeText: `${util.formatTime(item.startTime)} - ${util.formatTime(item.endTime)}`
      }))

      this.setData({ allList })
      this.refreshView()
    } catch (err) {
      console.error('记录加载失败：', err)
      util.toast('加载失败，请稍后重试')
    } finally {
      wx.hideLoading()
    }
  },

  // 根据当前 tab 过滤列表并统计各状态数量
  refreshView() {
    const { allList, currentTab } = this.data
    const countMap = { 0: 0, 1: 0, 2: 0, 3: 0 }
    allList.forEach(item => { countMap[item.status] += 1 })

    const filteredList = allList.filter(item => item.status === currentTab)
    this.setData({ filteredList, countMap })
  },

  onTabChange(e) {
    this.setData({ currentTab: Number(e.currentTarget.dataset.value) })
    this.refreshView()
  },

  // 通过审批
  onApprove(e) {
    const reservationId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认通过',
      content: '确定通过该借用申请吗？',
      success: async (res) => {
        if (!res.confirm) return
        await this.doAudit(reservationId, 1, '')
      }
    })
  },

  // 驳回审批
  onReject(e) {
    const reservationId = e.currentTarget.dataset.id
    wx.showModal({
      title: '驳回申请',
      editable: true,
      placeholderText: '请填写驳回原因（选填）',
      success: async (res) => {
        if (!res.confirm) return
        await this.doAudit(reservationId, 2, res.content || '')
      }
    })
  },

  // 调用审批云函数
  async doAudit(reservationId, status, auditRemark) {
    wx.showLoading({ title: '处理中...' })
    try {
      const res = await wx.cloud.callFunction({
        name: 'auditReservation',
        data: { reservationId, status, auditRemark }
      })
      const result = res.result || {}
      if (result.code === 200) {
        util.toast('审批完成', 'success')
        this.loadList()
      } else {
        util.toast(result.msg || '审批失败')
      }
    } catch (err) {
      console.error('审批失败：', err)
      util.toast('网络异常，请稍后重试')
    } finally {
      wx.hideLoading()
    }
  },

  // 点击电话号码直接拨打
  onCallPhone(e) {
    wx.makePhoneCall({ phoneNumber: e.currentTarget.dataset.phone })
  },

  async onPullDownRefresh() {
    if (this.data.isAdmin) {
      await this.loadList()
    } else {
      await this.checkIdentity()
    }
    wx.stopPullDownRefresh()
  }
})
