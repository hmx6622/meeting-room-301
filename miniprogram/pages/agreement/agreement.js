// pages/agreement/agreement.js 用户服务协议 / 隐私政策
Page({
  data: {
    activeTab: 'service' // service = 用户服务协议，privacy = 隐私政策
  },

  onLoad(options) {
    // 申请页可通过 type=privacy 直接定位到隐私政策
    if (options.type === 'privacy') {
      this.setData({ activeTab: 'privacy' })
    }
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  }
})
