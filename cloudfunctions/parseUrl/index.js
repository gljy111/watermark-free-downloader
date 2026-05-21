const cloud = require('wx-server-sdk')
const douyinParser = require('./parsers/douyin')
const kuaishouParser = require('./parsers/kuaishou')
const xiaohongshuParser = require('./parsers/xiaohongshu')
const bilibiliParser = require('./parsers/bilibili')
const weiboParser = require('./parsers/weibo')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const PARSERS = {
  douyin: douyinParser,
  kuaishou: kuaishouParser,
  xiaohongshu: xiaohongshuParser,
  bilibili: bilibiliParser,
  weibo: weiboParser
}

const PLATFORM_RULES = [
  { name: 'douyin', patterns: [/v\.douyin\.com/i, /www\.douyin\.com\/video/i, /www\.iesdouyin\.com/i] },
  { name: 'kuaishou', patterns: [/v\.kuaishou\.com/i, /www\.kuaishou\.com\/short-video/i] },
  { name: 'xiaohongshu', patterns: [/xhslink\.com/i, /www\.xiaohongshu\.com/i] },
  { name: 'bilibili', patterns: [/b23\.tv/i, /www\.bilibili\.com\/video/i, /m\.bilibili\.com/i] },
  { name: 'weibo', patterns: [/weibo\.com/i, /m\.weibo\.cn/i] }
]

function detectPlatform(url) {
  for (const rule of PLATFORM_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(url)) return rule.name
    }
  }
  return null
}

const PLATFORM_LABELS = {
  douyin: '抖音',
  kuaishou: '快手',
  xiaohongshu: '小红书',
  bilibili: 'B站',
  weibo: '微博'
}

const CACHE_TTL = 24 * 60 * 60 * 1000

exports.main = async (event) => {
  const { url } = event

  if (!url) {
    return { success: false, message: '请提供链接' }
  }

  const platform = detectPlatform(url)
  if (!platform) {
    return { success: false, message: '暂不支持该平台' }
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

  const parser = PARSERS[platform]
  if (!parser) {
    return { success: false, message: '解析器不可用' }
  }

  try {
    const result = await parser.parse(url)
    result.platform = platform
    result.platformLabel = PLATFORM_LABELS[platform]
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
    console.error(`[${platform}] 解析失败:`, err)
    return { success: false, message: '解析失败，请稍后重试' }
  }
}
