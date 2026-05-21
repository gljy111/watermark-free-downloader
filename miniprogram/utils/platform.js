function extractUrl(text) {
  const urlPattern = /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/gi
  const matches = text.match(urlPattern)
  if (!matches || matches.length === 0) return null
  return matches[0]
}

module.exports = { extractUrl }
