<template>
  <view class="page">
    <view class="search-header">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input v-model="q" class="search-input" placeholder="搜索感兴趣的内容" @confirm="doSearch" @input="onInput" />
        <text v-if="q" class="clear-btn" @click="q = ''">✕</text>
      </view>
      <text class="search-cancel" @click="doSearch">搜索</text>
    </view>

    <scroll-view scroll-y class="content-scroll">
      <!-- 热门搜索 -->
      <view class="section">
        <text class="section-label">🔥 热门搜索</text>
        <view class="hot-tags">
          <text v-for="h in hotWords" :key="h" class="hot-tag" @click="selectWord(h)">{{ h }}</text>
        </view>
      </view>

      <!-- 搜索历史 -->
      <view class="section">
        <view class="section-header">
          <text class="section-label">🕐 搜索历史</text>
          <text v-if="history.length" class="clear-all" @click="clearHistory">清空</text>
        </view>
        <view v-if="history.length" class="history-list">
          <view v-for="(h, idx) in history" :key="idx" class="history-item" @click="selectWord(h)">
            <text class="hi-icon">🕐</text>
            <text class="hi-word">{{ h }}</text>
          </view>
        </view>
        <view v-else class="history-empty">暂无搜索历史</view>
      </view>

      <!-- 搜索建议 -->
      <view v-if="suggestions.length" class="section">
        <text class="section-label">💡 搜索建议</text>
        <view class="suggest-list">
          <view v-for="(s, idx) in suggestions" :key="idx" class="suggest-item" @click="selectWord(s)">
            <text class="sg-icon">🔍</text>
            <text class="sg-word">{{ s }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { searchApi } from '../../api'

const q = ref(''); const hotWords = ref<string[]>([]); const history = ref<string[]>([]); const suggestions = ref<string[]>([])

onMounted(async () => {
  try {
    const [hotRes, histRes] = await Promise.all([searchApi.hot(), searchApi.history()])
    hotWords.value = Array.isArray(hotRes) ? hotRes : (hotRes as any)?.words || (hotRes as any)?.data || []
    history.value = Array.isArray(histRes) ? histRes : (histRes as any)?.keywords || (histRes as any)?.data || []
  } catch {}
})

function onInput() {
  if (q.value.trim().length >= 2) {
    suggestions.value = [`${q.value}入门`, `${q.value}教程`, `${q.value}案例`]
  } else { suggestions.value = [] }
}

function selectWord(word: string) { q.value = word; doSearch() }

function doSearch() {
  if (!q.value.trim()) return
  // 保存到本地历史
  if (!history.value.includes(q.value.trim())) { history.value.unshift(q.value.trim()); if (history.value.length > 20) history.value.pop() }
  uni.navigateTo({ url: `/pages/search/result?q=${encodeURIComponent(q.value)}` })
}

async function clearHistory() {
  try { await searchApi.clearHistory() } catch {}
  history.value = []
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.search-header { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.search-input-wrap { flex: 1; display: flex; align-items: center; background: #F5F0E8; border-radius: 28rpx; padding: 0 16rpx; }
.search-icon { font-size: 28rpx; }
.search-input { flex: 1; padding: 14rpx 8rpx; font-size: 26rpx; background: transparent; }
.clear-btn { font-size: 24rpx; color: #999; padding: 8rpx; }
.search-cancel { font-size: 26rpx; color: #C41E3A; }
.content-scroll { padding: 24rpx; }
.section { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.section-label { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 12rpx; }
.section-header .section-label { margin-bottom: 0; }
.hot-tags { display: flex; flex-wrap: wrap; gap: 10rpx; }
.hot-tag { padding: 10rpx 24rpx; background: #F5F0E8; border-radius: 20rpx; font-size: 24rpx; color: #666; }
.clear-all { font-size: 22rpx; color: #C41E3A; }
.history-list { display: flex; flex-direction: column; }
.history-item { display: flex; align-items: center; gap: 10rpx; padding: 14rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.history-item:last-child { border-bottom: none; }
.hi-icon { font-size: 24rpx; color: #ccc; }
.hi-word { font-size: 26rpx; color: #666; flex: 1; }
.history-empty { text-align: center; padding: 20rpx 0; font-size: 24rpx; color: #999; }
.suggest-list { display: flex; flex-direction: column; }
.suggest-item { display: flex; align-items: center; gap: 10rpx; padding: 14rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.suggest-item:last-child { border-bottom: none; }
.sg-icon { font-size: 24rpx; color: #ccc; }
.sg-word { font-size: 26rpx; color: #C41E3A; }
</style>
