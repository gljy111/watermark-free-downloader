const { extractUrl } = require('./platform')

function readClipboard() {
  return new Promise((resolve, reject) => {
    wx.getClipboardData({
      success(res) {
        resolve(res.data || '')
      },
      fail(err) {
        reject(err)
      }
    })
  })
}

async function checkClipboardForLink() {
  try {
    const text = await readClipboard()
    if (!text) return null

    const url = extractUrl(text)
    if (!url) return null

    return { url, rawText: text }
  } catch (e) {
    return null
  }
}

module.exports = {
  readClipboard,
  checkClipboardForLink
}
