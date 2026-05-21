function extractUrl(text) {
  const urlPattern = /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/gi
  const matches = text.match(urlPattern)
  if (!matches || matches.length === 0) return null
  return matches[0]
}

const DEMO_PLATFORMS = [
  { name: 'douyin', label: '抖音' },
  { name: 'xiaohongshu', label: '小红书' },
  { name: 'bilibili', label: 'B站' },
  { name: 'weibo', label: '微博' }
]

function getDemoPlatforms() {
  return DEMO_PLATFORMS
}

module.exports = {
  extractUrl,
  getDemoPlatforms
}
