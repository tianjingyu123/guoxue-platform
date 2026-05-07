<template>
  <div class="search-analytics">
    <div class="page-header">
      <h3>搜索分析</h3>
      <el-button size="small" @click="fetchData">刷新</el-button>
    </div>

    <!-- 概览卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="12">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">总搜索次数</span>
            <span class="stat-val">{{ fmt(stats.totalSearches) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" class="stat-card today">
          <div class="stat-inner">
            <span class="stat-label">今日搜索次数</span>
            <span class="stat-val blue">{{ fmt(stats.todaySearches) }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 热搜关键词 + 最近搜索 -->
    <el-row :gutter="16">
      <el-col :span="14">
        <el-card shadow="hover">
          <template #header><span>热搜关键词 TOP20</span></template>
          <div class="keyword-cloud" v-if="stats.hotKeywords?.length">
            <el-tag
              v-for="(kw, idx) in stats.hotKeywords"
              :key="kw.keyword"
              :type="idx < 3 ? 'danger' : idx < 10 ? 'warning' : 'info'"
              size="large"
              class="keyword-tag"
            >
              {{ kw.keyword }} <span class="kw-count">({{ kw.count }})</span>
            </el-tag>
          </div>
          <el-empty v-else description="暂无热搜数据" />
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card shadow="hover">
          <template #header><span>最近搜索</span></template>
          <div class="recent-list" v-if="stats.recentSearches?.length">
            <div v-for="s in stats.recentSearches" :key="s.keyword + s.createdAt" class="recent-item">
              <span class="recent-keyword">{{ s.keyword }}</span>
              <span class="recent-meta">{{ s.user?.nickname || '匿名' }} · {{ fmtTime(s.createdAt) }}</span>
            </div>
          </div>
          <el-empty v-else description="暂无搜索记录" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'

const api = axios.create({ baseURL: '/api/v1' })
api.interceptors.request.use(c => {
  const t = localStorage.getItem('token')
  if (t) c.headers.Authorization = `Bearer ${t}`
  return c
})

const stats = reactive({
  totalSearches: 0,
  todaySearches: 0,
  hotKeywords: [] as { keyword: string; count: number }[],
  recentSearches: [] as { keyword: string; createdAt: string; user?: { nickname: string } }[],
})
const loading = ref(false)

function fmt(v: number): string {
  if (!v) return '0'
  if (v >= 10000) return (v / 10000).toFixed(1) + 'w'
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
  return String(v)
}

function fmtTime(t: string): string {
  const d = new Date(t)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${h}:${m}`
}

async function fetchData() {
  loading.value = true
  try {
    const { data } = await api.get('/search/stats')
    if (data) Object.assign(stats, data)
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.search-analytics { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: #333; }

.stat-row { margin-bottom: 16px; }
.stat-card { border-radius: 8px; }
.stat-card.today { border-left: 3px solid #409eff; }
.stat-inner { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.stat-label { font-size: 13px; color: #999; }
.stat-val { font-size: 28px; font-weight: bold; color: #333; }
.stat-val.blue { color: #409eff; }

.keyword-cloud { display: flex; flex-wrap: wrap; gap: 10px; padding: 8px 0; }
.keyword-tag { cursor: default; }
.kw-count { opacity: 0.7; font-size: 11px; margin-left: 2px; }

.recent-list { max-height: 360px; overflow-y: auto; }
.recent-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
.recent-keyword { font-size: 14px; color: #333; }
.recent-meta { font-size: 12px; color: #bbb; }
</style>
