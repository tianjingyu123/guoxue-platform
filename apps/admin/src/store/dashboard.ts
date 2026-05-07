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

  return { stats, loading, fetchStats }
})
