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

function extractBvid(url) {
  const match = url.match(/video\/(BV\w+)/)
  return match ? match[1] : null
}

async function parse(url) {
  let realUrl = url
  if (url.includes('b23.tv')) {
    realUrl = await resolveShortUrl(url)
  }

  const bvid = extractBvid(realUrl)
  if (!bvid) {
    throw new Error('无法提取视频ID')
  }

  const infoUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`
  const infoRes = await got(infoUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.bilibili.com/'
    },
    responseType: 'json'
  })

  const info = infoRes.body
  if (info.code !== 0 || !info.data) {
    throw new Error('获取视频信息失败')
  }

  const videoData = info.data
  const cid = videoData.cid

  const playUrl = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=64&type=mp4&platform=html5`
  const playRes = await got(playUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.bilibili.com/'
    },
    responseType: 'json'
  })

  const playData = playRes.body
  if (playData.code !== 0 || !playData.data) {
    throw new Error('获取播放地址失败')
  }

  const videoUrl = playData.data.durl && playData.data.durl[0] && playData.data.durl[0].url

  if (!videoUrl) {
    throw new Error('未获取到视频地址')
  }

  return {
    type: 'video',
    title: videoData.title || '',
    author: videoData.owner && videoData.owner.name || '',
    cover: videoData.pic || '',
    videoUrl: videoUrl
  }
}

module.exports = { parse }
