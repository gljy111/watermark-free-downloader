function downloadAndSaveVideo(url, platform, headers) {
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
          wx.showToast({ title: `下载失败(${res.statusCode})，尝试代理下载...`, icon: 'none' })
          downloadViaProxy(url, platform, headers).then(resolve).catch(reject)
        }
      },
      fail(err) {
        wx.hideLoading()
        if (err.errMsg && err.errMsg.indexOf('url not in domain list') !== -1) {
          wx.showToast({ title: '正在通过代理下载...', icon: 'loading' })
          downloadViaProxy(url, platform, headers).then(resolve).catch(reject)
        } else {
          reject({ type: 'network', message: err.errMsg || '网络错误' })
        }
      }
    })
  })
}

function downloadViaProxy(url, platform, headers) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'downloadProxy',
      data: { url, platform, headers }
    }).then(res => {
      if (!res.result || !res.result.success) {
        reject({ type: 'proxy', message: '代理下载失败' })
        return
      }
      const fileID = res.result.data.fileID
      wx.cloud.downloadFile({ fileID }).then(tempRes => {
        wx.saveVideoToPhotosAlbum({
          filePath: tempRes.tempFilePath,
          success() { resolve({ success: true }) },
          fail(err) {
            if (err.errMsg.indexOf('auth deny') !== -1) {
              reject({ type: 'auth', message: '请授权相册权限' })
            } else {
              reject({ type: 'save', message: '保存失败' })
            }
          }
        })
      }).catch(() => reject({ type: 'proxy', message: '云存储下载失败' }))
    }).catch(() => reject({ type: 'proxy', message: '代理下载失败' }))
  })
}

function downloadAndSaveImage(url, platform, headers) {
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
      fail(err) {
        if (err.errMsg && err.errMsg.indexOf('url not in domain list') !== -1) {
          downloadImageViaProxy(url, platform, headers).then(resolve).catch(reject)
        } else {
          reject({ type: 'network', message: err.errMsg || '网络错误' })
        }
      }
    })
  })
}

function downloadImageViaProxy(url, platform, headers) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'downloadProxy',
      data: { url, platform, headers }
    }).then(res => {
      if (!res.result || !res.result.success) {
        reject({ type: 'proxy', message: '代理下载失败' })
        return
      }
      const fileID = res.result.data.fileID
      wx.cloud.downloadFile({ fileID }).then(tempRes => {
        wx.saveImageToPhotosAlbum({
          filePath: tempRes.tempFilePath,
          success() { resolve({ success: true }) },
          fail(err) {
            if (err.errMsg.indexOf('auth deny') !== -1) {
              reject({ type: 'auth', message: '请授权相册权限' })
            } else {
              reject({ type: 'save', message: '保存失败' })
            }
          }
        })
      }).catch(() => reject({ type: 'proxy', message: '云存储下载失败' }))
    }).catch(() => reject({ type: 'proxy', message: '代理下载失败' }))
  })
}

async function saveImages(urls, platform, headers) {
  wx.showLoading({ title: '保存中...' })
  const results = []
  for (let i = 0; i < urls.length; i++) {
    try {
      wx.showLoading({ title: `保存中 ${i + 1}/${urls.length}` })
      await downloadAndSaveImage(urls[i], platform, headers)
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
