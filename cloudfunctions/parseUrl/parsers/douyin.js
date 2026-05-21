const got = require('got')

async function resolveShortUrl(url) {
  try {
    const res = await got(url, {
      followRedirect: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'
      }
    })
    return res.headers.location || url
  } catch (e) {
    if (e.response && e.response.headers && e.response.headers.location) {
      return e.response.headers.location
    }
    return url
  }
}

function extractVideoId(url) {
  const match = url.match(/video\/(\d+)/)
  return match ? match[1] : null
}

async function parse(url) {
  let realUrl = url
  if (url.includes('v.douyin.com')) {
    realUrl = await resolveShortUrl(url)
  }

  const videoId = extractVideoId(realUrl)
  if (!videoId) {
    throw new Error('无法提取视频ID')
  }

  const apiUrl = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`
  const res = await got(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      'Referer': 'https://www.douyin.com/'
    },
    responseType: 'json'
  })

  const data = res.body
  if (!data.item_list || data.item_list.length === 0) {
    throw new Error('未获取到视频信息')
  }

  const item = data.item_list[0]
  const videoUrl = item.video.play_addr.url_list[0].replace('playwm', 'play')

  return {
    type: 'video',
    title: item.desc || '',
    author: item.author.nickname || '',
    cover: item.video.cover.url_list[0] || '',
    videoUrl: videoUrl
  }
}

module.exports = { parse }
