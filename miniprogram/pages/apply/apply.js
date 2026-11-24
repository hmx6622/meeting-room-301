// pages/apply/apply.js 申请页逻辑
const util = require('../../utils/util.js')
const db = wx.cloud.database()

Page({
  data: {
    dateStr: '',
    roomId: '',
    capacity: 0,
    occupiedList: [],   // 当天已占用时段文本
    submitting: false,
    agreed: false,      // 用户是否已勾选同意协议
    form: {
      applicantName: '',
      applicantDept: '',
      phone: '',
      peopleNum: '',
      useReason: '',
      startTimeStr: '',
      endTimeStr: ''
    }
  },

  onLoad(options) {
    // 接收首页传来的日期和会议室 ID
    const dateStr = options.date || util.formatDate(new Date())
    const roomId = options.roomId || ''
    this.setData({ dateStr, roomId })
    this.loadRoomCapacity()
    this.loadOccupied()
  },

  // 查询会议室容量，用于人数上限校验
  async loadRoomCapacity() {
    if (!this.data.roomId) return
    try {
      const res = await db.collection('meeting_rooms').doc(this.data.roomId).get()
      this.setData({ capacity: res.data.capacity || 0 })
    } catch (err) {
      console.error('容量查询失败：', err)
    }
  },

  // 加载当天已通过预约，生成时段提示
  async loadOccupied() {
    if (!this.data.roomId) return
    try {
      const res = await wx.cloud.callFunction({
        name: 'getRoomSchedule',
        data: { roomId: this.data.roomId, dateStr: this.data.dateStr }
      })
      const records = (res.result && res.result.data) || []
      const occupiedList = records.map(r =>
        `${util.formatTime(r.startTime)}-${util.formatTime(r.endTime)}`
      )
      this.setData({ occupiedList })
    } catch (err) {
      console.error('占用时段加载失败：', err)
    }
  },

  // 通用输入处理，根据 data-field 自动更新对应字段
  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [`form.${field}`]: e.detail.value
    })
  },

  onStartTimeChange(e) {
    this.setData({ 'form.startTimeStr': e.detail.value })
  },

  onEndTimeChange(e) {
    this.setData({ 'form.endTimeStr': e.detail.value })
  },

  // 切换协议勾选状态
  onToggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },

  // 打开用户服务协议
  openService() {
    wx.navigateTo({ url: '/pages/agreement/agreement?type=service' })
  },

  // 打开隐私政策
  openPrivacy() {
    wx.navigateTo({ url: '/pages/agreement/agreement?type=privacy' })
  },

  // 提交前的前端校验（服务端云函数会再校验一次，双重保险）
  validateForm() {
    const f = this.data.form

    if (!f.applicantName.trim()) return '请填写申请人姓名'
    if (!f.applicantDept.trim()) return '请填写部门或社团名称'
    if (!f.phone.trim()) return '请填写联系电话'
    if (!util.isValidPhone(f.phone.trim())) return '请输入正确的11位手机号'
    if (!f.peopleNum) return '请填写使用人数'

    const num = Number(f.peopleNum)
    if (!Number.isInteger(num) || num <= 0) return '使用人数必须是正整数'
    if (this.data.capacity && num > this.data.capacity) {
      return `使用人数不能超过会议室容量（${this.data.capacity}人）`
    }

    if (!f.startTimeStr || !f.endTimeStr) return '请选择借用的开始和结束时间'
    if (f.startTimeStr >= f.endTimeStr) return '结束时间必须晚于开始时间'
    if (!f.useReason.trim()) return '请填写借用事由'

    return ''
  },

  // 提交申请
  async onSubmit() {
    const errorMsg = this.validateForm()
    if (errorMsg) {
      util.toast(errorMsg)
      return
    }

    // 未同意协议，不能提交（取得用户授权同意后才可收集信息）
    if (!this.data.agreed) {
      util.toast('请先阅读并勾选同意协议')
      return
    }

    const f = this.data.form
    const startTime = util.toTimestamp(this.data.dateStr, f.startTimeStr)
    const endTime = util.toTimestamp(this.data.dateStr, f.endTimeStr)

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'submitReservation',
        data: {
          roomId: this.data.roomId,
          applicantName: f.applicantName.trim(),
          applicantDept: f.applicantDept.trim(),
          phone: f.phone.trim(),
          peopleNum: Number(f.peopleNum),
          useReason: f.useReason.trim(),
          startTime,
          endTime,
          dateStr: this.data.dateStr
        }
      })

      const result = res.result || {}
      if (result.code === 200) {
        wx.showModal({
          title: '提交成功',
          content: '申请已提交，请等待管理员审批',
          showCancel: false,
          confirmText: '查看进度',
          success: () => {
            // 我的申请是 tabBar 页面，必须用 switchTab
            wx.switchTab({ url: '/pages/my/my' })
          }
        })
      } else {
        util.toast(result.msg || '提交失败，请重试')
      }
    } catch (err) {
      console.error('提交失败：', err)
      util.toast('网络异常，请稍后重试')
    } finally {
      this.setData({ submitting: false })
      wx.hideLoading()
    }
  }
})
