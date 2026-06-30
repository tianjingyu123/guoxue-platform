<template>
  <view class="pm-page">
    <!-- 顶部导航：返回 + 搜索框 + 随机 -->
    <view class="pm-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="pm-header-row">
        <view class="pm-icon-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#f5ead8" />
        </view>
        <view class="pm-search">
          <app-icon name="search" :size="32" color="rgba(245,234,216,0.3)" class="pm-search-icon" />
          <input
            v-model="searchQuery"
            class="pm-search-input"
            placeholder="搜索诗词、诗人…"
            placeholder-class="pm-search-ph"
          />
        </view>
        <view class="pm-icon-btn" @tap="toCategories">
          <app-icon name="shuffle" :size="40" color="rgba(245,234,216,0.55)" />
        </view>
      </view>
    </view>

    <view class="pm-main">
      <!-- 加载态 -->
      <view v-if="loading" class="pm-loading">
        <text class="pm-loading-text">诗词加载中...</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="error" class="pm-error">
        <text class="pm-error-text">{{ error }}</text>
        <view class="pm-retry" @tap="fetchData"><text class="pm-retry-text">重试</text></view>
      </view>
      <!-- 正常内容 -->
      <template v-else>
      <!-- 编辑式大标题 -->
      <view class="pm-hero">
        <text class="pm-hero-title">诗词雅集</text>
        <text class="pm-hero-sub">品味千年风雅，与诗为友</text>
      </view>

      <!-- 每日一首 -->
      <view class="pm-sec">
        <view class="pm-sec-label">
          <app-icon name="calendar" :size="28" color="#e8c07a" />
          <text class="pm-label-gold">每日一首</text>
          <text class="pm-label-muted">今日精选</text>
        </view>

        <view class="pm-today" @tap="toDetail(todayPoem.id)">
          <view class="pm-today-glow" />
          <view class="pm-today-row">
            <!-- 竖排摘句 -->
            <view class="poem-vertical pm-today-verse">{{ todayPoem.lines[0] }}{{ todayPoem.lines[1] }}</view>
            <view class="pm-today-divider" />
            <view class="pm-today-body">
              <view>
                <text class="pm-today-title">{{ todayPoem.title }}</text>
                <text class="pm-today-author">〔{{ todayPoem.dynasty }}〕{{ todayPoem.author }}</text>
                <view class="pm-today-tags">
                  <text v-for="t in todayPoem.tags" :key="t" class="pm-tag-gold">{{ t }}</text>
                </view>
              </view>
              <view class="pm-today-foot">
                <view class="pm-today-actions">
                  <view class="pm-act" @tap.stop="onTodayLike">
                    <app-icon name="heart" :size="28" :color="todayLiked ? '#c0433a' : 'rgba(245,234,216,0.3)'" :fill="todayLiked" />
                    <text class="pm-act-text">{{ fmtCount(todayLikeCount) }}</text>
                  </view>
                  <view class="pm-act" @tap.stop="onTodayCollect">
                    <app-icon name="bookmark" :size="28" :color="todayBookmarked ? '#e8c07a' : 'rgba(245,234,216,0.3)'" :fill="todayBookmarked" />
                  </view>
                  <app-icon name="volume-2" :size="28" color="rgba(245,234,216,0.3)" @tap.stop="toDetail(todayPoem.id)" />
                </view>
                <view class="pm-today-more">
                  <text class="pm-more-gold">阅读全文</text>
                  <app-icon name="chevron-right" :size="26" color="#e8c07a" />
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 朝代 Tab -->
      <scroll-view scroll-x :show-scrollbar="false" class="pm-tabs">
        <view class="pm-tabs-row">
          <view
            v-for="d in dynastyTabs"
            :key="d"
            class="pm-tab"
            :class="{ 'pm-tab-active': activeDynasty === d }"
            @tap="activeDynasty = d"
          >
            <text class="pm-tab-text" :class="{ 'pm-tab-text-active': activeDynasty === d }">{{ d }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 著名诗人 -->
      <view class="pm-sec">
        <view class="pm-sec-head">
          <view class="pm-sec-label">
            <app-icon name="user" :size="28" color="#e8c07a" />
            <text class="pm-label-text">著名诗人</text>
          </view>
          <view class="pm-sec-more" @tap="toCollections">
            <text class="pm-more-muted">更多</text>
            <app-icon name="chevron-right" :size="28" color="rgba(245,234,216,0.3)" />
          </view>
        </view>
        <scroll-view scroll-x :show-scrollbar="false" class="pm-poets">
          <view class="pm-poets-row">
            <view v-for="poet in poets" :key="poet.id" class="pm-poet" @tap="toPoet(poet.name)">
              <view class="pm-poet-avatar">
                <text class="pm-poet-avatar-text">{{ poet.avatar }}</text>
              </view>
              <text class="pm-poet-name">{{ poet.name }}</text>
              <text class="pm-poet-meta">{{ poet.dynasty }} · {{ poet.poemCount }}首</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 热门诗词列表 -->
      <view class="pm-sec">
        <view class="pm-sec-head">
          <view class="pm-sec-label">
            <app-icon name="trending-up" :size="28" color="#e8c07a" />
            <text class="pm-label-text">{{ isSearching ? '搜索结果' : '热门诗词' }}</text>
          </view>
          <view class="pm-sec-more" @tap="toCategories">
            <text class="pm-more-muted">分类浏览</text>
            <app-icon name="chevron-right" :size="28" color="rgba(245,234,216,0.3)" />
          </view>
        </view>

        <view v-if="filtered.length" class="pm-list">
          <view v-for="(poem, idx) in filtered" :key="poem.id" class="pm-item" @tap="toDetail(poem.id)">
            <view class="pm-rank" :class="{ 'pm-rank-top': idx < 3 }">
              <text class="pm-rank-text" :class="{ 'pm-rank-text-top': idx < 3 }">{{ idx + 1 }}</text>
            </view>
            <view class="pm-item-body">
              <view class="pm-item-head">
                <text class="pm-item-title">{{ poem.title }}</text>
                <text class="pm-item-author">〔{{ poem.dynasty }}〕{{ poem.author }}</text>
                <text class="pm-item-form">{{ poem.form }}</text>
              </view>
              <text class="pm-item-preview">{{ poem.preview }}…</text>
            </view>
            <view class="pm-item-like">
              <app-icon name="heart" :size="26" color="rgba(245,234,216,0.3)" />
              <text class="pm-item-like-text">{{ fmtCount(poem.likes) }}</text>
            </view>
          </view>
        </view>
        <view v-else class="pm-empty">
          <text class="pm-empty-text">{{ searching ? '搜索中…' : (isSearching ? '未找到相关诗词' : '暂无相关诗词') }}</text>
        </view>
      </view>

      <!-- AI 诗词创作入口 -->
      <view class="pm-sec">
        <view class="pm-ai-entry" @tap="toPublish">
          <view class="pm-ai-icon">
            <app-icon name="sparkles" :size="28" color="#9b7ec8" />
          </view>
          <view class="pm-ai-body">
            <text class="pm-ai-title">AI 诗词创作辅助</text>
            <text class="pm-ai-sub">输入主题，AI 生成草稿，你来润色</text>
          </view>
          <app-icon name="chevron-right" :size="28" color="#9b7ec8" />
        </view>
      </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { poetryApi, type PoemItem, type PoetItem, type TodayPoem } from '@/lib/poetry-data'
import { getToken } from '@/utils/storage'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const loading = ref(true)
const error = ref('')
const todayPoem = ref<TodayPoem>({
  id: '',
  title: '', author: '', dynasty: '',
  lines: [], tags: [], likes: 0,
})
const poems = ref<PoemItem[]>([])
const poets = ref<PoetItem[]>([])
const dynastyTabs = ['全部', '唐', '宋', '元', '明', '清', '先秦']

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const data = await poetryApi.home()
    todayPoem.value = data.todayPoem
    poems.value = data.poems
    poets.value = data.poets
    todayLikeCount.value = data.todayPoem.likes
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchData() })

function fmtCount(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)
}

// ── 搜索（真连 /poetry/search，防抖） ──
const searchQuery = ref('')
const activeDynasty = ref('全部')
const searchResults = ref<PoemItem[]>([])
const searching = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (kw) => {
  if (searchTimer) clearTimeout(searchTimer)
  const q = kw.trim()
  if (!q) { searchResults.value = []; searching.value = false; return }
  searching.value = true
  searchTimer = setTimeout(async () => {
    try { searchResults.value = await poetryApi.search(q) }
    catch { searchResults.value = [] }
    finally { searching.value = false }
  }, 300)
})

const isSearching = computed(() => !!searchQuery.value.trim())
const filtered = computed(() => {
  if (isSearching.value) return searchResults.value
  return poems.value.filter((p) => activeDynasty.value === '全部' || p.dynasty === activeDynasty.value)
})

// ── 每日一首互动（真实，需登录） ──
const todayLiked = ref(false)
const todayBookmarked = ref(false)
const todayLikeCount = ref(0)
const todayLiking = ref(false)
const todayCollecting = ref(false)

function requireLogin(): boolean {
  if (getToken()) return true
  uni.showModal({
    title: '登录后体验',
    content: '登录后可点赞、收藏诗词',
    confirmText: '去登录',
    cancelText: '再看看',
    success: (r) => { if (r.confirm) navigateTo('/login') },
  })
  return false
}

async function onTodayLike() {
  if (!todayPoem.value.id || !requireLogin() || todayLiking.value) return
  todayLiking.value = true
  try {
    const r = await poetryApi.toggleLike(todayPoem.value.id)
    todayLiked.value = r.liked
    todayLikeCount.value = r.likes
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  } finally {
    todayLiking.value = false
  }
}

async function onTodayCollect() {
  if (!todayPoem.value.id || !requireLogin() || todayCollecting.value) return
  todayCollecting.value = true
  try {
    const r = await poetryApi.toggleCollect(todayPoem.value.id)
    todayBookmarked.value = r.collected
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  } finally {
    todayCollecting.value = false
  }
}

function goBack() {
  navigateBack()
}
function toDetail(id: string) {
  navigateTo(`/poetry/${id}`)
}
function toCategories() {
  navigateTo('/poetry/categories')
}
function toCollections() {
  navigateTo('/poetry/collections')
}
function toPoet(name: string) {
  if (name) navigateTo(`/poetry/poet?name=${encodeURIComponent(name)}`)
}
function toPublish() {
  navigateTo('/publish?type=poem')
}
</script>

<style scoped>
.pm-page {
  min-height: 100vh;
  background: radial-gradient(ellipse at top, #2a1a0a 0%, #1c1208 60%, #0e0b06 100%);
  padding-bottom: 40rpx;
  color: var(--poem-text);
}

/* 顶栏 */
.pm-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(28, 18, 8, 0.92);
  backdrop-filter: blur(12rpx);
  -webkit-backdrop-filter: blur(12rpx);
  border-bottom: 2rpx solid var(--poem-border);
}
.pm-header-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 0 32rpx;
  height: 112rpx;
}
.pm-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 24rpx;
  flex-shrink: 0;
}
.pm-search {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.pm-search-icon {
  position: absolute;
  left: 24rpx;
  z-index: 1;
}
.pm-search-input {
  width: 100%;
  height: 72rpx;
  padding: 0 32rpx 0 72rpx;
  border-radius: 999rpx;
  background: var(--poem-surface);
  color: var(--poem-text);
  font-size: 26rpx;
}
.pm-search-ph {
  color: var(--poem-text-muted);
}

.pm-main {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 48rpx;
}

/* Hero */
.pm-hero {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.pm-hero-title {
  font-family: var(--font-serif, serif);
  font-size: 60rpx;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.5rpx;
  color: var(--poem-gold);
}
.pm-hero-sub {
  font-size: 28rpx;
  color: var(--poem-text-soft);
}

/* 区块标题 */
.pm-sec {
  display: flex;
  flex-direction: column;
}
.pm-sec-label {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.pm-label-gold {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--poem-gold);
}
.pm-label-muted {
  font-size: 22rpx;
  color: var(--poem-text-muted);
}
.pm-label-text {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--poem-text);
}
.pm-sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.pm-sec-more {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.pm-more-muted {
  font-size: 22rpx;
  color: var(--poem-text-muted);
}

/* 每日一首卡片 */
.pm-today {
  position: relative;
  border-radius: 32rpx;
  overflow: hidden;
  padding: 40rpx;
  background: linear-gradient(135deg, #2e1f10 0%, #1c1208 60%, #241a0e 100%);
  border: 2rpx solid var(--poem-gold-dim);
  box-shadow: 0 16rpx 64rpx rgba(0, 0, 0, 0.4), inset 0 2rpx 0 rgba(232, 192, 122, 0.15);
}
.pm-today-glow {
  position: absolute;
  top: 0;
  right: 0;
  width: 256rpx;
  height: 256rpx;
  border-radius: 999rpx;
  background: radial-gradient(circle, rgba(232, 192, 122, 0.08) 0%, transparent 70%);
  pointer-events: none;
}
.pm-today-row {
  display: flex;
  align-items: stretch;
  gap: 40rpx;
}
.pm-today-verse {
  flex-shrink: 0;
  height: 224rpx;
  font-family: var(--font-serif, serif);
  font-size: 36rpx;
  letter-spacing: 0.3em;
  color: var(--poem-text);
}
.pm-today-divider {
  width: 2rpx;
  flex-shrink: 0;
  background: var(--poem-border);
}
.pm-today-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.pm-today-title {
  display: block;
  font-family: var(--font-serif, serif);
  font-size: 40rpx;
  font-weight: 700;
  color: var(--poem-gold);
  margin-bottom: 8rpx;
}
.pm-today-author {
  display: block;
  font-size: 26rpx;
  color: var(--poem-text-soft);
}
.pm-today-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}
.pm-tag-gold {
  font-size: 20rpx;
  padding: 2rpx 16rpx;
  border-radius: 999rpx;
  background: var(--poem-gold-soft);
  color: var(--poem-gold);
}
.pm-today-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
}
.pm-today-actions {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.pm-act {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.pm-act-text {
  font-size: 22rpx;
  color: var(--poem-text-muted);
}
.pm-today-more {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.pm-more-gold {
  font-size: 22rpx;
  color: var(--poem-gold);
}

/* 朝代 Tab */
.pm-tabs {
  white-space: nowrap;
}
.pm-tabs-row {
  display: inline-flex;
  gap: 16rpx;
  padding-bottom: 4rpx;
}
.pm-tab {
  flex-shrink: 0;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background: var(--poem-surface);
  border: 2rpx solid var(--poem-border);
}
.pm-tab-active {
  background: var(--poem-gold);
  border-color: transparent;
}
.pm-tab-text {
  font-size: 26rpx;
  color: var(--poem-text-soft);
}
.pm-tab-text-active {
  color: var(--poem-bg);
  font-weight: 600;
}

/* 诗人横滚 */
.pm-poets {
  white-space: nowrap;
}
.pm-poets-row {
  display: inline-flex;
  gap: 24rpx;
  padding-bottom: 8rpx;
}
.pm-poet {
  width: 160rpx;
  flex-shrink: 0;
  padding: 24rpx;
  border-radius: 24rpx;
  text-align: center;
  background: var(--poem-surface);
  border: 2rpx solid var(--poem-border);
}
.pm-poet-avatar {
  width: 88rpx;
  height: 88rpx;
  margin: 0 auto 16rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--poem-gold-soft), var(--poem-ai-soft));
}
.pm-poet-avatar-text {
  font-family: var(--font-serif, serif);
  font-size: 36rpx;
  font-weight: 700;
  color: var(--poem-gold);
}
.pm-poet-name {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: var(--poem-text);
}
.pm-poet-meta {
  display: block;
  font-size: 20rpx;
  margin-top: 4rpx;
  color: var(--poem-text-muted);
}

/* 热门列表 */
.pm-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.pm-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: var(--poem-surface);
  border: 2rpx solid var(--poem-border);
}
.pm-rank {
  width: 48rpx;
  height: 48rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--poem-border);
}
.pm-rank-top {
  background: var(--poem-gold);
}
.pm-rank-text {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--poem-text-muted);
}
.pm-rank-text-top {
  color: var(--poem-bg);
}
.pm-item-body {
  flex: 1;
  min-width: 0;
}
.pm-item-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 4rpx;
}
.pm-item-title {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--poem-text);
}
.pm-item-author {
  font-size: 20rpx;
  color: var(--poem-text-muted);
}
.pm-item-form {
  font-size: 18rpx;
  padding: 1rpx 12rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
  background: rgba(232, 192, 122, 0.12);
  color: var(--poem-gold);
}
.pm-item-preview {
  font-size: 22rpx;
  color: var(--poem-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pm-item-like {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}
.pm-item-like-text {
  font-size: 22rpx;
  color: var(--poem-text-muted);
}
.pm-empty {
  text-align: center;
  padding: 96rpx 0;
}
.pm-empty-text {
  font-size: 26rpx;
  color: var(--poem-text-muted);
}

/* AI 入口 */
.pm-ai-entry {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  background: var(--poem-ai-soft);
  border: 2rpx solid rgba(155, 126, 200, 0.2);
}
.pm-ai-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(155, 126, 200, 0.25);
}
.pm-ai-body {
  flex: 1;
  min-width: 0;
}
.pm-ai-title {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: var(--poem-ai);
}
.pm-ai-sub {
  display: block;
  font-size: 22rpx;
  margin-top: 4rpx;
  color: var(--poem-text-muted);
}
/* 加载/错误态 */
.pm-loading { display: flex; align-items: center; justify-content: center; padding: 120rpx 48rpx; }
.pm-loading-text { font-size: 28rpx; color: var(--poem-text-muted); }
.pm-error { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 48rpx; gap: 24rpx; }
.pm-error-text { font-size: 28rpx; color: #e74c3c; text-align: center; }
.pm-retry { padding: 16rpx 48rpx; background: var(--poem-gold); border-radius: 24rpx; }
.pm-retry-text { font-size: 28rpx; color: var(--poem-bg); font-weight: 600; }
</style>
