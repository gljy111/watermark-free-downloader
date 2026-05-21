const { downloadAndSaveVideo, saveImages, openAuthSetting } = require('../../utils/download')

Page({
  data: {
    result: null,
    saving: false
  },

  onLoad(options) {
    if (options.data) {
      try {
        const result = JSON.parse(decodeURIComponent(options.data))
        this.setData({ result })
        this.saveToHistory(result)
      } catch (e) {
        wx.showToast({ title: '数据解析错误', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
      }
    }
  },

  saveToHistory(result) {
    const db = wx.cloud.database()
    db.collection('parse_history').add({
      data: {
        platform: result.platform,
        platformLabel: result.platformLabel || result.platform || '',
        title: result.title,
        author: result.author,
        cover: result.cover,
        type: result.type,
        url: result.originalUrl,
        createTime: db.serverDate()
      }
    }).catch(() => {})
  },

  async onSaveVideo() {
    if (this.data.saving) return
    this.setData({ saving: true })

    try {
      await downloadAndSaveVideo(this.data.result.videoUrl, this.data.result.platform, this.data.result._headers)
      wx.showToast({ title: '已保存到相册', icon: 'success' })
    } catch (err) {
      if (err.type === 'auth') {
        openAuthSetting()
      } else {
        wx.showToast({ title: err.message || '保存失败', icon: 'none' })
      }
    } finally {
      this.setData({ saving: false })
    }
  },

  async onSaveImages() {
    if (this.data.saving) return
    this.setData({ saving: true })

    try {
      const results = await saveImages(this.data.result.images, this.data.result.platform, this.data.result._headers)
      const successCount = results.filter(r => r.success).length
      wx.showToast({
        title: `已保存 ${successCount}/${results.length} 张`,
        icon: successCount === results.length ? 'success' : 'none'
      })
    } catch (err) {
      if (err.type === 'auth') {
        openAuthSetting()
      } else {
        wx.showToast({ title: err.message || '保存失败', icon: 'none' })
      }
    } finally {
      this.setData({ saving: false })
    }
  },

  onCopyLink() {
    const url = this.data.result.videoUrl || (this.data.result.images && this.data.result.images[0])
    if (!url) return

    wx.setClipboardData({
      data: url,
      success() {
        wx.showToast({ title: '链接已复制', icon: 'success' })
      }
    })
  },

  onPreviewImage(e) {
    const { url } = e.currentTarget.dataset
    wx.previewImage({
      current: url,
      urls: this.data.result.images || [url]
    })
  }
})
