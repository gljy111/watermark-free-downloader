function downloadAndSaveVideo(url) {
  return new Promise((resolve, reject) => {
    wx.showLoading({ title: '下载中...' })
    wx.downloadFile({
      url,
      success(res) {
        if (res.statusCode === 200) {
          wx.saveVideoToPhotosAlbum({
            filePath: res.tempFilePath,
            success() {
              wx.hideLoading()
              resolve({ success: true })
            },
            fail(err) {
              wx.hideLoading()
              if (err.errMsg.indexOf('auth deny') !== -1) {
                reject({ type: 'auth', message: '请授权相册权限' })
              } else {
                reject({ type: 'save', message: '保存失败' })
              }
            }
          })
        } else {
          wx.hideLoading()
          reject({ type: 'download', message: '下载失败' })
        }
      },
      fail() {
        wx.hideLoading()
        reject({ type: 'network', message: '网络错误' })
      }
    })
  })
}

function downloadAndSaveImage(url) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success(res) {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success() {
              resolve({ success: true })
            },
            fail(err) {
              if (err.errMsg.indexOf('auth deny') !== -1) {
                reject({ type: 'auth', message: '请授权相册权限' })
              } else {
                reject({ type: 'save', message: '保存失败' })
              }
            }
          })
        } else {
          reject({ type: 'download', message: '下载失败' })
        }
      },
      fail() {
        reject({ type: 'network', message: '网络错误' })
      }
    })
  })
}

async function saveImages(urls) {
  wx.showLoading({ title: '保存中...' })
  const results = []
  for (let i = 0; i < urls.length; i++) {
    try {
      wx.showLoading({ title: `保存中 ${i + 1}/${urls.length}` })
      await downloadAndSaveImage(urls[i])
      results.push({ url: urls[i], success: true })
    } catch (err) {
      results.push({ url: urls[i], success: false, error: err })
      if (err.type === 'auth') {
        wx.hideLoading()
        throw err
      }
    }
  }
  wx.hideLoading()
  return results
}

function openAuthSetting() {
  wx.showModal({
    title: '需要相册权限',
    content: '请在设置中开启相册权限以保存文件',
    confirmText: '去设置',
    success(res) {
      if (res.confirm) {
        wx.openSetting()
      }
    }
  })
}

module.exports = {
  downloadAndSaveVideo,
  downloadAndSaveImage,
  saveImages,
  openAuthSetting
}
