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
  if (url.includes('xhslink.com')) {
    realUrl = await resolveShortUrl(url)
  }

  const noteIdMatch = realUrl.match(/explore\/(\w+)/) || realUrl.match(/discovery\/item\/(\w+)/)
  if (!noteIdMatch) {
    throw new Error('无法提取笔记ID')
  }

  const noteId = noteIdMatch[1]
  const pageUrl = `https://www.xiaohongshu.com/explore/${noteId}`

  const res = await got(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    }
  })

  const html = res.body
  const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?})\s*<\/script>/)
    || html.match(/"note":\s*({.+?})\s*,\s*"/)

  if (!jsonMatch) {
    throw new Error('页面解析失败')
  }

  let noteData
  try {
    const stateStr = jsonMatch[1].replace(/undefined/g, 'null')
    const state = JSON.parse(stateStr)
    noteData = state.note && state.note.noteDetailMap
      ? Object.values(state.note.noteDetailMap)[0].note
      : state
  } catch (e) {
    throw new Error('数据解析失败')
  }

  if (noteData.type === 'video' && noteData.video) {
    const videoUrl = noteData.video.media && noteData.video.media.stream
      && noteData.video.media.stream.h264
      && noteData.video.media.stream.h264[0]
      && noteData.video.media.stream.h264[0].masterUrl

    return {
      type: 'video',
      title: noteData.title || noteData.desc || '',
      author: noteData.user && noteData.user.nickname || '',
      cover: noteData.imageList && noteData.imageList[0] && noteData.imageList[0].urlDefault || '',
      videoUrl: videoUrl || ''
    }
  }

  const images = (noteData.imageList || []).map(img => {
    return img.urlDefault || img.url || ''
  }).filter(Boolean)

  if (images.length === 0) {
    throw new Error('未获取到图片')
  }

  return {
    type: 'images',
    title: noteData.title || noteData.desc || '',
    author: noteData.user && noteData.user.nickname || '',
    cover: images[0],
    images: images
  }
}

module.exports = { parse }
