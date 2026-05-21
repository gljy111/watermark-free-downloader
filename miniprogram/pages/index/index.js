const { checkClipboardForLink } = require('../../utils/clipboard')
const { extractUrl } = require('../../utils/platform')

Page({
  data: {
    inputUrl: '',
    parsing: false,
    showClipboardModal: false,
    clipboardUrl: '',
    lastClipboardUrl: ''
  },

  onShow() {
    this.checkClipboard()
  },

  async checkClipboard() {
    const result = await checkClipboardForLink()
    if (!result) return
    if (result.url === this.data.lastClipboardUrl) return

    this.setData({
      showClipboardModal: true,
      clipboardUrl: result.url,
      lastClipboardUrl: result.url
    })
  },

  onInputChange(e) {
    this.setData({ inputUrl: e.detail.value })
  },

  onPaste() {
    wx.getClipboardData({
      success: (res) => {
        if (res.data) {
          this.setData({ inputUrl: res.data })
        }
      }
    })
  },

  onClear() {
    this.setData({ inputUrl: '' })
  },

  onUseClipboard() {
    this.setData({
      inputUrl: this.data.clipboardUrl,
      showClipboardModal: false
    })
    this.doParse(this.data.clipboardUrl)
  },

  onDismissClipboard() {
    this.setData({ showClipboardModal: false })
  },

  onParse() {
    const text = this.data.inputUrl.trim()
    if (!text) {
      wx.showToast({ title: '请输入链接', icon: 'none' })
      return
    }

    const url = extractUrl(text)
    if (!url) {
      wx.showToast({ title: '未识别到有效链接', icon: 'none' })
      return
    }

    this.doParse(url)
  },

  async doParse(url) {
    if (this.data.parsing) return
    this.setData({ parsing: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'parseUrl',
        data: { url }
      })

      if (res.result && res.result.success) {
        wx.navigateTo({
          url: `/pages/result/result?data=${encodeURIComponent(JSON.stringify(res.result.data))}`
        })
      } else {
        const msg = (res.result && res.result.message) || '解析失败，请稍后重试'
        wx.showToast({ title: msg, icon: 'none' })
      }
    } catch (err) {
      console.error('解析失败:', err)
      wx.showToast({ title: '解析失败，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ parsing: false })
    }
  }
})
