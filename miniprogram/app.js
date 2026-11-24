// app.js —— 小程序全局入口
App({
  globalData: {
    openid: '',        // 当前用户 openid，登录后缓存
    isAdmin: false,    // 当前用户是否为管理员
    envId: 'your-env-id' // 云开发环境 ID，在云开发控制台可复制
  },

  onLaunch() {
    // 校验环境 ID 是否已填写
    if (!this.globalData.envId || this.globalData.envId.indexOf('请替换') !== -1) {
      console.warn('请先在 app.js 中填写你的云开发环境 ID（envId）')
    }

    // 初始化云开发
    if (!wx.cloud) {
      console.error('当前基础库版本过低，请使用 2.2.3 或以上的基础库')
      return
    }
    wx.cloud.init({
      env: this.globalData.envId,
      traceUser: true
    })

    // 启动时静默登录，拿到 openid 并判断管理员身份
    this.silentLogin()
  },

  // 静默登录：调用 login 云函数获取 openid，再查管理员身份
  silentLogin() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login',
        data: {}
      }).then(res => {
        const openid = res.result.openid
        this.globalData.openid = openid
        // 再调用 checkAdmin 判断是否管理员
        return wx.cloud.callFunction({ name: 'checkAdmin' })
      }).then(res => {
        this.globalData.isAdmin = !!(res.result && res.result.isAdmin)
        resolve(this.globalData)
      }).catch(err => {
        console.error('登录失败：', err)
        reject(err)
      })
    })
  }
})
