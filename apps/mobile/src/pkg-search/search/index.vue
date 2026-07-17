<template>
  <view class="search-page">
    <!-- 顶部搜索栏 -->
    <view class="search-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="search-bar-row">
        <view class="back-btn" @click="goBack">
          <app-icon name="arrow-left" :size="40" color="var(--text-main)" />
        </view>
        <view class="search-input-wrap">
          <app-icon name="search" :size="32" color="var(--text-soft)" />
          <input
            class="search-input"
            v-model="keyword"
            placeholder="搜索课程、文章、古籍、达人"
            placeholder-class="search-input-ph"
            confirm-type="search"
            :focus="autoFocus"
            @input="onInput"
            @confirm="doSearch(keyword)"
          />
          <view v-if="keyword" class="clear-btn" @click="keyword = ''; suggestList = []">
            <app-icon name="x" :size="28" color="var(--text-soft)" />
          </view>
        </view>
        <view class="search-action" @click="doSearch(keyword)">
          <text class="search-action-text">搜索</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="search-body">
      <!-- 输入联想（250ms 防抖拉 /search/suggest；点击回填并触发搜索） -->
      <view v-if="suggestList.length" class="suggest-list">
        <view
          v-for="(sug, i) in suggestList"
          :key="i"
          class="suggest-item"
          @click="doSearch(sug)"
        >
          <app-icon name="search" :size="28" color="var(--text-soft)" />
          <text class="suggest-text">{{ sug }}</text>
        </view>
      </view>

      <!-- AI 智能搜索入口 -->
      <view class="ai-entry" @click="aiModalOpen = true">
        <view class="ai-entry-icon">
          <app-icon name="sparkles" :size="36" color="#ffffff" />
        </view>
        <view class="ai-entry-text">
          <text class="ai-entry-title">AI智能搜索</text>
          <text class="ai-entry-desc">用自然语言提问，获取精准答案</text>
        </view>
        <app-icon name="arrow-right" :size="32" color="var(--gold)" />
      </view>

      <!-- 搜索历史 -->
      <view v-if="historyList.length" class="sec">
        <view class="sec-head">
          <text class="sec-title">搜索历史</text>
          <view class="sec-clear" @click="clearHistory">
            <app-icon name="trash-2" :size="28" color="var(--text-soft)" />
          </view>
        </view>
        <view class="tag-wrap">
          <view
            v-for="(h, i) in historyList"
            :key="i"
            class="tag tag--history"
            @click="doSearch(h)"
          >
            <text class="tag-text">{{ h }}</text>
          </view>
        </view>
      </view>

      <!-- 热门搜索 -->
      <view v-if="hotList.length" class="sec">
        <view class="sec-head">
          <view class="sec-title-row">
            <app-icon name="flame" :size="32" color="#e8743b" />
            <text class="sec-title">热门搜索</text>
          </view>
        </view>
        <view class="hot-list">
          <view
            v-for="(item, idx) in hotList"
            :key="item.keyword"
            class="hot-item"
            @click="doSearch(item.keyword)"
          >
            <text class="hot-rank" :class="{ 'hot-rank--top': idx < 3 }">{{ idx + 1 }}</text>
            <text class="hot-keyword">{{ item.keyword }}</text>
            <view v-if="item.hot" class="hot-badge">
              <app-icon name="trending-up" :size="22" color="#e8743b" />
              <text class="hot-badge-text">热</text>
            </view>
            <text class="hot-count">{{ item.count }}</text>
          </view>
        </view>
      </view>

      <!-- 猜你想搜（无推荐时整栏隐藏，不露空标题） -->
      <view v-if="guessList.length" class="sec">
        <view class="sec-head">
          <text class="sec-title">猜你想搜</text>
        </view>
        <view class="tag-wrap">
          <view
            v-for="(g, i) in guessList"
            :key="i"
            class="tag tag--guess"
            @click="doSearch(g)"
          >
            <text class="tag-text tag-text--guess">{{ g }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-gap" />
    </scroll-view>

    <!-- AI 搜索弹窗 -->
    <ai-search-modal :is-open="aiModalOpen" @close="aiModalOpen = false" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AiSearchModal from '@/components/common/ai-search-modal.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { searchApi, type HotSearchItem } from '@/lib/search-data'
import { track } from '@/composables/useTrack'

// ===== UI 状态 =====
const statusBarHeight = ref(0)
const autoFocus = ref(false)
const aiModalOpen = ref(false)
const keyword = ref('')

/**
 * 🔴 2026-07-14 真连：这三块原来全是写死的假数据（「八字入门教程 12.8万」等 8 条假热搜、
 *    4 条假历史、6 条假"猜你想搜"），而后端 /search/hot、/search/history、/search/suggest 一直都在。
 *    最荒唐的是历史：doSearch 一直在往后端 saveHistory 写，前端却从来不读 —— 写进去的永远看不见，
 *    用户看到的始终是那 4 个假词。
 */
const historyList = ref<string[]>([])
const hotList = ref<HotSearchItem[]>([])
const guessList = ref<string[]>([])

// 输入联想（防抖）：/search/suggest 已封装，原本只用来取热搜首词做「猜你想搜」，
// 这里给输入框接上实时联想下拉
const suggestList = ref<string[]>([])
let suggestTimer: ReturnType<typeof setTimeout> | null = null

function onInput() {
  if (suggestTimer) clearTimeout(suggestTimer)
  const q = keyword.value.trim()
  if (!q) { suggestList.value = []; return }
  suggestTimer = setTimeout(async () => {
    // 防抖窗口内关键词可能又变，落地前再校验一次，避免旧词覆盖
    if (keyword.value.trim() !== q) return
    suggestList.value = await searchApi.getSuggestions(q, 8).catch(() => [])
  }, 250)
}

/** 热搜 + 历史并行拉取；任一失败都不阻断页面（搜索框本身要能用） */
async function loadPanels() {
  const [hot, history] = await Promise.all([
    searchApi.getHot(8).catch(() => [] as HotSearchItem[]),
    searchApi.getHistory().catch(() => [] as string[]),
  ])
  hotList.value = hot
  historyList.value = history
  // 「猜你想搜」按热搜首词做语义相似推荐；没有热搜就不显示这一栏（不再编 6 个假词）
  if (hot.length) {
    guessList.value = await searchApi.getSuggestions(hot[0].keyword, 6).catch(() => [])
  }
}

onLoad((opt) => {
  try {
    const sys = uni.getSystemInfoSync()
    statusBarHeight.value = sys.statusBarHeight || 0
  } catch (e) {
    statusBarHeight.value = 0
  }
  if (opt && opt.keyword) {
    keyword.value = decodeURIComponent(opt.keyword)
  } else {
    autoFocus.value = true
  }
  loadPanels()
})

function goBack() {
  navigateBack()
}

async function clearHistory() {
  const list = historyList.value
  historyList.value = [] // 先清 UI，失败再回滚（清历史是高频轻操作，不该等一个 loading）
  try {
    await searchApi.clearHistory()
  } catch (e) {
    historyList.value = list
    uni.showToast({ title: (e as Error)?.message || '清空失败', icon: 'none' })
  }
}

function doSearch(kw: string) {
  const q = (kw || '').trim()
  if (!q) return
  suggestList.value = [] // 收起联想下拉（点词或回车搜索后）
  track.search(q) // 搜索词埋点（搜索词分析）
  // 真持久化历史（后端 SearchHistory 表 —— 也是热搜词频的数据源）；本地先插一条让用户立刻看见
  if (!historyList.value.includes(q)) {
    historyList.value = [q, ...historyList.value].slice(0, 10)
  }
  searchApi.saveHistory(q) // fire-and-forget：失败不该挡住跳转
  navigateTo(`/search/result?keyword=${encodeURIComponent(q)}`)
}
</script>

<style scoped>
.search-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--background);
}

/* 顶部搜索栏 */
.search-header {
  background: var(--surface);
  border-bottom: 2rpx solid var(--line);
}
.search-bar-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
}
.back-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 72rpx;
  padding: 0 24rpx;
  background: var(--background);
  border-radius: 36rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--text-main);
}
.search-input-ph {
  color: var(--text-soft);
}
.clear-btn {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.search-action {
  flex-shrink: 0;
  padding: 0 8rpx;
}
.search-action-text {
  font-size: 30rpx;
  color: var(--gold);
  font-weight: 500;
  white-space: nowrap;
}

/* 主体 */
.search-body {
  flex: 1;
  overflow: hidden;
}

/* 输入联想下拉 */
.suggest-list {
  background: var(--surface);
  border-bottom: 2rpx solid var(--line);
}
.suggest-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid var(--line);
}
.suggest-item:last-child {
  border-bottom: none;
}
.suggest-text {
  flex: 1;
  font-size: 28rpx;
  color: var(--text-main);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* AI 入口 */
.ai-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: 24rpx;
  padding: 28rpx 24rpx;
  background: linear-gradient(135deg, rgba(201, 169, 110, 0.14), rgba(201, 169, 110, 0.04));
  border: 2rpx solid rgba(201, 169, 110, 0.3);
  border-radius: 20rpx;
}
.ai-entry-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #c9a96e, #b8935a);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-entry-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.ai-entry-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-main);
}
.ai-entry-desc {
  font-size: 24rpx;
  color: var(--text-soft);
}

/* 区块 */
.sec {
  padding: 8rpx 24rpx 24rpx;
}
.sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72rpx;
}
.sec-title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.sec-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-main);
}
.sec-clear {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 标签云 */
.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.tag {
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  background: var(--surface);
  border: 2rpx solid var(--line);
}
.tag--guess {
  background: rgba(201, 169, 110, 0.08);
  border-color: rgba(201, 169, 110, 0.2);
}
.tag-text {
  font-size: 26rpx;
  color: var(--text-main);
  white-space: nowrap;
}
.tag-text--guess {
  color: var(--gold);
}

/* 热门列表 */
.hot-list {
  display: flex;
  flex-direction: column;
}
.hot-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  height: 88rpx;
}
.hot-rank {
  width: 40rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-soft);
  text-align: center;
  flex-shrink: 0;
}
.hot-rank--top {
  color: #e8743b;
}
.hot-keyword {
  flex: 1;
  font-size: 28rpx;
  color: var(--text-main);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.hot-badge {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 12rpx;
  border-radius: 16rpx;
  background: rgba(232, 116, 59, 0.12);
  flex-shrink: 0;
}
.hot-badge-text {
  font-size: 20rpx;
  color: #e8743b;
}
.hot-count {
  font-size: 24rpx;
  color: var(--text-soft);
  flex-shrink: 0;
}

.bottom-gap {
  height: 40rpx;
}
</style>
