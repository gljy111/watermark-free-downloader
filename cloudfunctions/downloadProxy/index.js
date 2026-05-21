const cloud = require('wx-server-sdk')
const got = require('got')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const REFERER_MAP = {
  bilibili: 'https://www.bilibili.com/',
  douyin: 'https://www.douyin.com/',
  kuaishou: 'https://www.kuaishou.com/',
  xiaohongshu: 'https://www.xiaohongshu.com/',
  weibo: 'https://weibo.com/'
}

exports.main = async (event) => {
  const { url, platform } = event

  if (!url) {
    return { success: false, message: '缺少下载地址' }
  }

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'
    }

    if (platform && REFERER_MAP[platform]) {
      headers['Referer'] = REFERER_MAP[platform]
    }

    const res = await got(url, {
      headers,
      responseType: 'buffer',
      timeout: { request: 30000 }
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
