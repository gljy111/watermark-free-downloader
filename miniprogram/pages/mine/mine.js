Page({
  data: {
    version: '1.0.0'
  },

  onAbout() {
    wx.showModal({
      title: '关于',
      content: '无水印下载 v1.0.0\n支持数百个视频平台 · 基于yt-dlp',
      showCancel: false
    })
  },

  onFeedback() {
    // 使用微信内置反馈
  },

  onShareAppMessage() {
    return {
      title: '无水印下载 - 一键保存无水印视频/图片',
      path: '/pages/index/index'
    }
  }
})
