const got = require('got')

async function parse(url) {
  let realUrl = url

  const statusMatch = url.match(/status\/(\w+)/) || url.match(/\/(\d+)\/(\w+)/)
  if (!statusMatch) {
    throw new Error('无法提取微博ID')
  }

  const statusId = statusMatch[1] || statusMatch[2]
  const apiUrl = `https://m.weibo.cn/statuses/show?id=${statusId}`

  const res = await got(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      'Referer': 'https://m.weibo.cn/',
      'X-Requested-With': 'XMLHttpRequest'
    },
    responseType: 'json'
  })

  const data = res.body
  if (!data.data) {
    throw new Error('获取微博信息失败')
  }

  const weibo = data.data
  const author = weibo.user && weibo.user.screen_name || ''

  if (weibo.page_info && weibo.page_info.urls) {
    const videoUrl = weibo.page_info.urls.mp4_720p_mp4
      || weibo.page_info.urls.mp4_hd_mp4
      || weibo.page_info.urls.mp4_ld_mp4
      || ''

    return {
      type: 'video',
      title: weibo.text ? weibo.text.replace(/<[^>]+>/g, '').substring(0, 100) : '',
      author,
      cover: weibo.page_info.page_pic && weibo.page_info.page_pic.url || '',
      videoUrl
    }
  }

  if (weibo.pics && weibo.pics.length > 0) {
    const images = weibo.pics.map(pic => pic.large && pic.large.url || pic.url).filter(Boolean)

    return {
      type: 'images',
      title: weibo.text ? weibo.text.replace(/<[^>]+>/g, '').substring(0, 100) : '',
      author,
      cover: images[0],
      images
    }
  }

  throw new Error('未找到视频或图片内容')
}

module.exports = { parse }
