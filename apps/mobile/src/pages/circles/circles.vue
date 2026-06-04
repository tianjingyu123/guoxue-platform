<template>
  <view class="page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">圈子</text>
      <text class="page-subtitle">以文会友 · 以友辅仁</text>
    </view>

    <!-- 搜索栏 + 创建 -->
    <view class="toolbar">
      <view class="search-bar" @click="goSearch">
        <text class="search-icon">🔍</text>
        <text class="search-placeholder">搜索圈子...</text>
      </view>
      <view class="create-btn" @click="goCreateCircle">
        <text class="create-icon">＋</text>
      </view>
    </view>

    <!-- 分类筛选 -->
    <scroll-view scroll-x class="tabs-scroll" show-scrollbar="false">
      <view class="tabs-inner">
        <text
          v-for="tab in typeTabs"
          :key="tab.key"
          class="tab"
          :class="{ active: currentTab === tab.key }"
          @click="switchTab(tab.key)"
        >{{ tab.label }}</text>
      </view>
    </scroll-view>

    <!-- 数据状态 -->
    <DataState
      :is-loading="loading && circles.length === 0"
      :error="loadError"
      :is-empty="!loading && circles.length === 0"
      empty-icon="👥"
      empty-title="暂无圈子"
      empty-description="还没有圈子，快去创建一个吧"
      empty-action-text="创建圈子"
      :empty-show-action="true"
      skeleton-type="card"
      @retry="fetchCircles"
      @empty-action="goCreateCircle"
    >
      <!-- 圈子卡片网格 -->
      <view class="circle-grid" v-if="circles.length > 0">
        <view
          v-for="c in circles"
          :key="c.id"
          class="circle-card"
          @click="goCircleDetail(c.id)"
        >
          <!-- 封面 -->
          <view class="cc-cover-wrap">
            <image
              v-if="c.cover"
              :src="c.cover"
              class="cc-cover"
              mode="aspectFill"
            />
            <view v-else class="cc-cover-placeholder">
              <text class="cc-placeholder-icon">{{ c.name?.charAt(0) || '圈' }}</text>
            </view>
            <!-- 排名角标 -->
            <view v-if="c.rank && c.rank <= 3" class="cc-rank-badge" :class="'rank-' + c.rank">
              <text>{{ c.rank }}</text>
            </view>
            <!-- 今日活跃 -->
            <view v-if="c.todayActive" class="cc-active-badge">
              <text>🔥 {{ c.todayActive }}</text>
            </view>
          </view>

          <!-- 信息 -->
          <view class="cc-info">
            <text class="cc-name">{{ c.name }}</text>
            <text class="cc-intro">{{ c.intro || c.description || '' }}</text>
            <view class="cc-bottom">
              <view class="cc-stats">
                <text class="cc-stat">👤 {{ formatCount(c.memberCount) }}</text>
                <text class="cc-stat">📝 {{ formatCount(c.postCount) }}</text>
              </view>
              <text
                v-if="!c.isJoined"
                class="cc-join-btn"
                @click.stop="joinCircle(c)"
              >加入</text>
              <text v-else class="cc-joined-tag">已加入</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="loadingMore" class="load-more">加载更多...</view>
      <view v-if="!hasMore && circles.length > 0" class="no-more">— 已全部加载 —</view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import DataState from '../../components/DataState.vue'
import { circleApi } from '../../api'

interface CircleItem {
  id: string
  name: string
  cover?: string
  intro?: string
  description?: string
  memberCount: number
  postCount: number
  type?: string
  tags?: string[]
  isJoined: boolean
  rank?: number
  todayActive?: number
}

const typeTabs = [
  { key: '', label: '全部' },
  { key: 'free', label: '免费' },
  { key: 'paid', label: '付费' },
  { key: 'hot', label: '热门' },
  { key: 'new', label: '最新' },
]

const currentTab = ref('')
const circles = ref<CircleItem[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const loadError = ref<string | null>(null)
const refreshing = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 20

onMounted(() => {
  fetchCircles(true)
})

function switchTab(key: string) {
  if (currentTab.value === key) return
  currentTab.value = key
  page.value = 1
  hasMore.value = true
  fetchCircles(true)
}

// 下拉刷新
onPullDownRefresh(() => {
  refreshing.value = true
  page.value = 1
  hasMore.value = true
  fetchCircles(true).finally(() => {
    refreshing.value = false
    uni.stopPullDownRefresh()
  })
})

// 上拉加载更多
onReachBottom(() => {
  if (!hasMore.value || loadingMore.value || loading.value) return
  loadingMore.value = true
  page.value++
  fetchCircles(false).finally(() => {
    loadingMore.value = false
  })
})

async function fetchCircles(reset: boolean) {
  if (reset && !refreshing.value) loading.value = true
  loadError.value = null
  try {
    const params: Record<string, any> = { page: page.value, pageSize }
    if (currentTab.value) {
      if (currentTab.value === 'hot') {
        params.sortBy = 'activity'
      } else if (currentTab.value === 'new') {
        params.sortBy = 'createdAt'
      } else {
        params.type = currentTab.value
      }
    }
    const data = await circleApi.list(params)
    const items: any[] = data.list || data.items || data.data || data || []
    const mapped: CircleItem[] = items
      .filter((c: any) => c && c.id)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        cover: c.cover,
        intro: c.intro || c.description,
        description: c.description,
        memberCount: c.memberCount ?? c.members ?? 0,
        postCount: c.postCount ?? c.posts ?? 0,
        type: c.type,
        tags: c.tags,
        isJoined: c.isJoined ?? c.joined ?? false,
        rank: c.rank,
        todayActive: c.todayActive,
      }))

    if (reset) {
      circles.value = mapped
    } else {
      const existIds = new Set(circles.value.map((x) => x.id))
      const news = mapped.filter((x) => !existIds.has(x.id))
      circles.value.push(...news)
    }
    hasMore.value = mapped.length >= pageSize
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
    if (reset) circles.value = []
    hasMore.value = false
  } finally {
    if (reset) loading.value = false
  }
}

async function joinCircle(c: CircleItem) {
  try {
    await circleApi.join(c.id)
    c.isJoined = true
    c.memberCount = (c.memberCount || 0) + 1
    uni.showToast({ title: '已加入 ' + c.name, icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.errMsg || '加入失败', icon: 'none' })
  }
}

function goCircleDetail(id: string) {
  uni.navigateTo({ url: `/pages/circles/circle-detail?id=${id}` })
}

function goSearch() {
  uni.navigateTo({ url: '/pages/search/search?type=circles' })
}

function goCreateCircle() {
  uni.navigateTo({ url: '/pages/circles/circle-manage' })
}

function formatCount(n: number | undefined): string {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 20rpx;
}

/* ===== 页面标题 ===== */
.page-header {
  text-align: center;
  padding: 32rpx 24rpx 16rpx;
  background: linear-gradient(180deg, #fff, #F5F0E8);
}
.page-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #C41E3A;
  display: block;
  font-family: 'Noto Serif SC', serif;
  letter-spacing: 6rpx;
}
.page-subtitle {
  font-size: 24rpx;
  color: #C9A96E;
  margin-top: 8rpx;
  display: block;
  letter-spacing: 4rpx;
}

/* ===== 工具栏 ===== */
.toolbar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 24rpx 16rpx;
}
.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #fff;
  border-radius: 40rpx;
  padding: 16rpx 24rpx;
  border: 1rpx solid #E8E0D5;
}
.search-icon {
  font-size: 28rpx;
}
.search-placeholder {
  font-size: 26rpx;
  color: #ccc;
}
.create-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(196, 30, 58, 0.25);
  flex-shrink: 0;
}
.create-icon {
  font-size: 40rpx;
  color: #fff;
  font-weight: 300;
}

/* ===== 分类Tab ===== */
.tabs-scroll {
  white-space: nowrap;
  padding: 0 24rpx 16rpx;
}
.tabs-inner {
  display: inline-flex;
  gap: 16rpx;
}
.tab {
  display: inline-block;
  font-size: 26rpx;
  color: #666;
  padding: 10rpx 28rpx;
  border-radius: 28rpx;
  background: #fff;
  border: 1rpx solid #E8E0D5;
}
.tab.active {
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  color: #fff;
  border-color: #C41E3A;
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(196, 30, 58, 0.2);
}

/* ===== 圈子卡片网格 ===== */
.circle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  padding: 0 24rpx;
}

.circle-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
}
.circle-card:active {
  transform: scale(0.97);
}

/* 封面 */
.cc-cover-wrap {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
}
.cc-cover {
  width: 100%;
  height: 100%;
}
.cc-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cc-placeholder-icon {
  font-size: 64rpx;
  color: rgba(255, 255, 255, 0.6);
  font-weight: bold;
}

/* 角标 */
.cc-rank-badge {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: bold;
  color: #fff;
}
.cc-rank-badge.rank-1 {
  background: linear-gradient(135deg, #FFD700, #FFA500);
}
.cc-rank-badge.rank-2 {
  background: linear-gradient(135deg, #C0C0C0, #A0A0A0);
}
.cc-rank-badge.rank-3 {
  background: linear-gradient(135deg, #FF8C00, #FF6B00);
}

.cc-active-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  padding: 4rpx 12rpx;
  background: rgba(196, 30, 58, 0.9);
  border-radius: 20rpx;
  font-size: 20rpx;
  color: #fff;
}

/* 信息 */
.cc-info {
  padding: 16rpx;
}
.cc-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #2C2C2C;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4rpx;
}
.cc-intro {
  font-size: 22rpx;
  color: #999;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 12rpx;
}
.cc-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cc-stats {
  display: flex;
  gap: 12rpx;
}
.cc-stat {
  font-size: 20rpx;
  color: #999;
}
.cc-join-btn {
  font-size: 22rpx;
  color: #fff;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  padding: 6rpx 20rpx;
  border-radius: 24rpx;
  font-weight: 500;
  flex-shrink: 0;
}
.cc-joined-tag {
  font-size: 20rpx;
  color: #999;
  background: #F5F0E8;
  padding: 6rpx 16rpx;
  border-radius: 24rpx;
  flex-shrink: 0;
}

/* 加载更多 */
.load-more {
  text-align: center;
  color: #C9A96E;
  padding: 32rpx 0;
  font-size: 26rpx;
}
.no-more {
  text-align: center;
  color: #ccc;
  padding: 24rpx 0;
  font-size: 24rpx;
}
</style>
