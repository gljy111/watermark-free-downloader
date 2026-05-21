const PLATFORM_RULES = [
  {
    name: 'douyin',
    label: '抖音',
    patterns: [
      /v\.douyin\.com\/\w+/i,
      /www\.douyin\.com\/video\/\d+/i,
      /www\.iesdouyin\.com\/share\/video\/\d+/i
    ]
  },
  {
    name: 'kuaishou',
    label: '快手',
    patterns: [
      /v\.kuaishou\.com\/\w+/i,
      /www\.kuaishou\.com\/short-video\/\w+/i
    ]
  },
  {
    name: 'xiaohongshu',
    label: '小红书',
    patterns: [
      /xhslink\.com\/\w+/i,
      /www\.xiaohongshu\.com\/explore\/\w+/i,
      /www\.xiaohongshu\.com\/discovery\/item\/\w+/i
    ]
  },
  {
    name: 'bilibili',
    label: 'B站',
    patterns: [
      /b23\.tv\/\w+/i,
      /www\.bilibili\.com\/video\/\w+/i,
      /m\.bilibili\.com\/video\/\w+/i
    ]
  },
  {
    name: 'weibo',
    label: '微博',
    patterns: [
      /weibo\.com\/tv\/show\/\w+/i,
      /weibo\.com\/\d+\/\w+/i,
      /m\.weibo\.cn\/\d+\/\w+/i,
      /m\.weibo\.cn\/status\/\w+/i
    ]
  }
]

function detectPlatform(text) {
  for (const rule of PLATFORM_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        return rule.name
      }
    }
  }
  return null
}

function extractUrl(text) {
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
  const matches = text.match(urlPattern)
  if (!matches || matches.length === 0) return null

  for (const url of matches) {
    if (detectPlatform(url)) {
      return url
    }
  }
  return matches[0]
}

function getPlatformLabel(name) {
  const rule = PLATFORM_RULES.find(r => r.name === name)
  return rule ? rule.label : '未知平台'
}

function getSupportedPlatforms() {
  return PLATFORM_RULES.map(r => ({ name: r.name, label: r.label }))
}

module.exports = {
  detectPlatform,
  extractUrl,
  getPlatformLabel,
  getSupportedPlatforms
}
