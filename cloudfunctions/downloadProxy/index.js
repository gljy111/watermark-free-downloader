const cloud = require('wx-server-sdk')
const got = require('got')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { url, headers: customHeaders } = event

  if (!url) {
    return { success: false, message: '缺少下载地址' }
  }

  try {
    const headers = {
      'User-Agent': (customHeaders && customHeaders['User-Agent']) || 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'
    }

    if (customHeaders && customHeaders['Referer']) {
      headers['Referer'] = customHeaders['Referer']
    }

    const res = await got(url, {
      headers,
      responseType: 'buffer',
      timeout: { request: 60000 }
    })

    const fileExt = url.includes('.mp4') ? 'mp4' : 'jpg'
    const fileName = `download_${Date.now()}.${fileExt}`

    const uploadRes = await cloud.uploadFile({
      cloudPath: `temp/${fileName}`,
      fileContent: res.body
    })

    const tempUrlRes = await cloud.getTempFileURL({
      fileList: [uploadRes.fileID]
    })

    const tempUrl = tempUrlRes.fileList[0].tempFileURL

    return { success: true, data: { url: tempUrl, fileID: uploadRes.fileID } }
  } catch (err) {
    console.error('代理下载失败:', err)
    return { success: false, message: '下载失败' }
  }
}
