import { defineStore } from "pinia"
import { ref } from "vue"
import { dashboardApi } from "../api"

export const useDashboardStore = defineStore("dashboard", () => {
  const stats = ref({
    articleCount: 0,
    userCount: 0,
    courseCount: 0,
    classicBookCount: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalCollects: 0,
    circleCount: 0,
    productCount: 0,
    orderCount: 0,
    paidOrderCount: 0,
    todayNewUsers: 0,
    monthNewUsers: 0,
    monthNewArticles: 0,
    pendingReports: 0,
    liveRoomCount: 0,
    videoCount: 0,
  })
  const trends = ref<{ dates: string[]; userTrend: number[]; articleTrend: number[] } | null>(null)
  const charts = ref<{
    userGrowth: { date: string; count: number }[]
    contentDistribution: { name: string; count: number }[]
    topArticles: { id: string; title: string; viewCount: number; likeCount: number; commentCount: number; createdAt: string; author: string }[]
  } | null>(null)
  const loading = ref(false)

  async function fetchStats() {
    loading.value = true
    try {
      const { data } = await dashboardApi.stats()
      if (data) Object.assign(stats.value, data)
    } finally {
      loading.value = false
    }
  }

  async function fetchTrends() {
    try {
      const { data } = await dashboardApi.trends()
      if (data) trends.value = data
    } catch { /* 非关键，静默失败 */ }
  }

  async function fetchCharts() {
    try {
      const { data } = await dashboardApi.charts()
      if (data) charts.value = data
    } catch { /* 非关键，静默失败 */ }
  }

  return { stats, trends, charts, loading, fetchStats, fetchTrends, fetchCharts }
})
