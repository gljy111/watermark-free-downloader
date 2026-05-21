const cloud = require('wx-server-sdk')
const got = require('got')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 替换为你的 Python 后端地址
const BACKEND_URL = 'https://yesterday-pouch-unworldly.ngrok-free.dev'

const CACHE_TTL = 24 * 60 * 60 * 1000

async function parseViaBackend(url) {
  const apiUrl = `${BACKEND_URL}/api/parse?url=${encodeURIComponent(url)}`

  const res = await got(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'ngrok-skip-browser-warning': '1',
      'Accept': 'application/json'
    },
    responseType: 'json',
    timeout: { request: 55000 }
  })

  const body = res.body
  if (!body.success || !body.data) {
    throw new Error(body.message || '后端解析失败')
  }

  const d = body.data

  if (d.type === 'images' && d.images && d.images.length > 0) {
    return {
      type: 'images',
      title: d.title || '',
      author: d.author || '',
      cover: d.cover || d.images[0],
      images: d.images,
      platform: d.platform || '',
      platformLabel: d.platformLabel || d.platform || ''
    }
  }

  if (d.videoUrl) {
    return {
      type: 'video',
      title: d.title || '',
      author: d.author || '',
      cover: d.cover || '',
      videoUrl: d.videoUrl,
      _headers: d.headers || null,
      platform: d.platform || '',
      platformLabel: d.platformLabel || d.platform || ''
    }
  }

  throw new Error('后端未返回视频或图片')
}

exports.main = async (event) => {
  const { url } = event

  if (!url) {
    return { success: false, message: '请提供链接' }
  }

  try {
    const cached = await db.collection('parse_cache')
      .where({ url, expireAt: db.command.gt(new Date()) })
      .limit(1)
      .get()

    if (cached.data && cached.data.length > 0) {
      return { success: true, data: cached.data[0].result }
    }
  } catch (e) {}

  try {
    const result = await parseViaBackend(url)
    result.originalUrl = url

    try {
      await db.collection('parse_cache').add({
        data: {
          url,
          result,
          expireAt: new Date(Date.now() + CACHE_TTL),
          createTime: db.serverDate()
        }
      })
    } catch (e) {}

    return { success: true, data: result }
  } catch (err) {
    console.error('解析失败:', err.message)
    return {
      success: false,
      message: err.message.includes('Unsupported URL')
        ? '暂不支持该链接格式，请尝试其他链接'
        : err.message.includes('yt-dlp')
          ? err.message
          : `解析失败: ${err.message}`
    }
  }
}
