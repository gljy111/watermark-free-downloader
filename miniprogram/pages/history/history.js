Page({
  data: {
    historyList: [],
    loading: true,
    hasMore: true,
    page: 0,
    pageSize: 20
  },

  onShow() {
    this.setData({ historyList: [], page: 0, hasMore: true })
    this.loadHistory()
  },

  async loadHistory() {
    if (!this.data.hasMore) return
    this.setData({ loading: true })

    try {
      const db = wx.cloud.database()
      const res = await db.collection('parse_history')
        .orderBy('createTime', 'desc')
        .skip(this.data.page * this.data.pageSize)
        .limit(this.data.pageSize)
        .get()

      const list = res.data.map(item => ({
        ...item,
        platformLabel: item.platformLabel || item.platform || ''
      }))

      this.setData({
        historyList: [...this.data.historyList, ...list],
        hasMore: list.length === this.data.pageSize,
        page: this.data.page + 1,
        loading: false
      })
    } catch (err) {
      console.error('加载历史记录失败:', err)
      this.setData({ loading: false })
    }
  },

  onReachBottom() {
    this.loadHistory()
  },

  onItemTap(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.historyList.find(h => h._id === id)
    if (!item) return

    wx.navigateTo({
      url: `/pages/index/index?url=${encodeURIComponent(item.url)}`
    })
  },

  async onClearHistory() {
    const res = await wx.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？',
      confirmColor: '#ff4d4f'
    })

    if (!res.confirm) return

    try {
      const db = wx.cloud.database()
      const countRes = await db.collection('parse_history').count()
      const total = countRes.total
      const batchTimes = Math.ceil(total / 20)

      for (let i = 0; i < batchTimes; i++) {
        const list = await db.collection('parse_history').limit(20).get()
        const ids = list.data.map(d => d._id)
        for (const id of ids) {
          await db.collection('parse_history').doc(id).remove()
        }
      }

      this.setData({ historyList: [], hasMore: false })
      wx.showToast({ title: '已清空', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: '清空失败', icon: 'none' })
    }
  }
})
