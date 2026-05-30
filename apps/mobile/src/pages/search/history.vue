<template>
  <view class="page">
    <SearchBar v-model="q" @search="doSearch" />
    <view class="hot-section">
      <text class="section-label">热门搜索</text>
      <view class="hot-tags">
        <text v-for="h in hotWords" :key="h" class="hot-tag" @click="q = h; doSearch()">{{ h }}</text>
      </view>
    </view>
    <view class="history-section">
      <view class="history-header">
        <text class="section-label">搜索历史</text>
        <text class="btn-clear" @click="clearHistory">清空</text>
      </view>
      <view v-for="h in history" :key="h" class="history-item" @click="q = h; doSearch()">
        <text>{{ h }}</text>
      </view>
      <EmptyState v-if="!history.length" text="暂无搜索历史" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SearchBar from '../../components/SearchBar.vue'
import EmptyState from '../../components/EmptyState.vue'
import { searchApi } from '../../api'

const q = ref('')
const hotWords = ref<string[]>([])
const history = ref<string[]>([])

onMounted(async () => {
  try {
    const [hotRes, histRes] = await Promise.all([searchApi.hot(), searchApi.history()])
    hotWords.value = Array.isArray(hotRes) ? hotRes : (hotRes as any)?.words || []
    history.value = Array.isArray(histRes) ? histRes : (histRes as any)?.keywords || []
  } catch {}
})

function doSearch() {
  if (!q.value.trim()) return
  uni.navigateTo({ url: `/pages/search/result?q=${encodeURIComponent(q.value)}` })
}
async function clearHistory() {
  try { await searchApi.clearHistory(); history.value = [] } catch {}
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.hot-section, .history-section { background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 12px; }
.section-label { font-size: 14px; font-weight: 500; display: block; margin-bottom: 8px; }
.hot-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.hot-tag { padding: 6px 14px; background: #F5F0E8; border-radius: 14px; font-size: 12px; color: #666; }
.history-header { display: flex; justify-content: space-between; align-items: center; }
.btn-clear { font-size: 12px; color: #C41E3A; }
.history-item { padding: 8px 0; font-size: 13px; color: #666; border-bottom: 1px solid #f8f8f8; }
.history-item:last-child { border-bottom: none; }
</style>
