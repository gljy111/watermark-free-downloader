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

async function parse(url) {
  let realUrl = url
  if (url.includes('v.kuaishou.com')) {
    realUrl = await resolveShortUrl(url)
  }

  const photoIdMatch = realUrl.match(/short-video\/(\w+)/) || realUrl.match(/photo\/(\w+)/)
  if (!photoIdMatch) {
    throw new Error('无法提取视频ID')
  }

  const photoId = photoIdMatch[1]
  const apiUrl = `https://m.gifshow.com/rest/wd/photo/info?photoId=${photoId}&isLongVideo=false`

  const res = await got(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      'Referer': 'https://m.gifshow.com/',
      'Cookie': 'did=web_default'
    },
    responseType: 'json'
  })

  const data = res.body
  if (!data.photo) {
    throw new Error('未获取到视频信息')
  }

  const photo = data.photo
  const videoUrl = photo.mainMvUrls && photo.mainMvUrls[0] && photo.mainMvUrls[0].url

  if (!videoUrl) {
    throw new Error('未获取到视频地址')
  }

  return {
    type: 'video',
    title: photo.caption || '',
    author: photo.userName || '',
    cover: photo.coverUrls && photo.coverUrls[0] && photo.coverUrls[0].url || '',
    videoUrl: videoUrl
  }
}

module.exports = { parse }
