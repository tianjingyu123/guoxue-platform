<template>
  <view class="page">
    <!-- Header -->
    <view class="header">
      <text
        class="back-btn"
        @click="uni.navigateBack"
      >
        ‹
      </text>
      <text class="header-title">
        创作者中心
      </text>
      <text
        class="header-refresh"
        :class="{ refreshing }"
        @click="handleRefresh"
      >
        🔄
      </text>
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
      refresher-enabled
      @refresherrefresh="handleRefresh"
    >
      <!-- 概览卡片 -->
      <view class="overview-grid">
        <view
          v-for="(card, idx) in overviewCards"
          :key="idx"
          class="overview-card"
          :class="'card-bg-' + idx"
        >
          <view class="card-top">
            <text class="card-icon">
              {{ card.icon }}
            </text>
            <text
              class="card-growth"
              :class="card.growth >= 0 ? 'growth-up' : 'growth-down'"
            >
              {{ card.growth >= 0 ? '↑' : '↓' }}{{ Math.abs(card.growth) }}%
            </text>
          </view>
          <text class="card-val">
            {{ card.value }}
          </text>
          <text class="card-label">
            {{ card.label }}
          </text>
        </view>
      </view>

      <!-- Tab 切换 -->
      <view class="tabs">
        <text
          v-for="t in tabOptions"
          :key="t.value"
          class="tab"
          :class="{ 'tab-active': activeTab === t.value }"
          @click="activeTab = t.value"
        >
          {{ t.icon }} {{ t.label }}
        </text>
      </view>

      <!-- 内容管理 -->
      <view
        v-if="activeTab === 'content'"
        class="tab-content"
      >
        <view
          v-for="c in contentList"
          :key="c.id"
          class="content-card"
        >
          <view class="content-left">
            <image
              v-if="c.cover"
              :src="c.cover"
              class="content-cover"
              mode="aspectFill"
            />
          </view>
          <view class="content-right">
            <view class="content-top">
              <text class="content-title">
                {{ c.title }}
              </text>
            </view>
            <view class="content-tags">
              <text
                class="content-status"
                :class="'status-' + c.status"
              >
                {{ statusLabel(c.status) }}
              </text>
              <text class="content-type">
                {{ c.type === 'article' ? '文章' : '帖子' }}
              </text>
            </view>
            <view
              v-if="c.status === 'published'"
              class="content-stats"
            >
              <text>👁 {{ c.views || 0 }}</text>
              <text>❤ {{ c.likes || 0 }}</text>
              <text>💬 {{ c.comments || 0 }}</text>
              <text
                v-if="c.revenue"
                class="content-rev"
              >
                ¥{{ c.revenue }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 数据分析 -->
      <view
        v-if="activeTab === 'analytics'"
        class="tab-content"
      >
        <view class="chart-card">
          <text class="chart-title">
            近30天阅读趋势
          </text>
          <view class="bar-chart">
            <view
              v-for="(v, i) in trendData"
              :key="i"
              class="bar-item"
            >
              <view
                class="bar-fill"
                :class="{ 'bar-today': i === 29 }"
                :style="{ height: v + '%' }"
              />
            </view>
          </view>
          <view class="chart-labels">
            <text>30天前</text>
            <text>今天</text>
          </view>
        </view>
        <view class="chart-card">
          <text class="chart-title">
            内容表现 TOP5
          </text>
          <view
            v-for="(c, idx) in topContents"
            :key="c.id"
            class="top-item"
          >
            <text
              class="top-num"
              :class="'top-num-' + (idx + 1)"
            >
              {{ idx + 1 }}
            </text>
            <view class="top-info">
              <text class="top-title">
                {{ c.title }}
              </text>
              <text class="top-views">
                {{ (c.views || 0).toLocaleString() }} 阅读
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 收益概览 -->
      <view
        v-if="activeTab === 'revenue'"
        class="tab-content"
      >
        <view class="revenue-hero">
          <text class="rev-label">
            累计收益
          </text>
          <text class="rev-val">
            ¥{{ overview.totalRevenue?.toFixed(2) || '0.00' }}
          </text>
          <view class="rev-sub">
            <view class="rev-sub-item">
              <text class="rev-sub-label">
                可提现
              </text>
              <text class="rev-sub-val">
                ¥2,180.00
              </text>
            </view>
            <view class="rev-sub-item">
              <text class="rev-sub-label">
                待结算
              </text>
              <text class="rev-sub-val">
                ¥1,500.50
              </text>
            </view>
          </view>
          <text class="rev-withdraw">
            提现
          </text>
        </view>
        <view class="chart-card">
          <text class="chart-title">
            收益趋势
          </text>
          <view class="bar-chart">
            <view
              v-for="(v, i) in revenueTrend"
              :key="i"
              class="bar-item"
            >
              <view
                class="bar-fill bar-revenue"
                :style="{ height: v + '%' }"
              />
            </view>
          </view>
        </view>
        <view class="chart-card">
          <text class="chart-title">
            收益构成
          </text>
          <view
            v-for="item in revenueSources"
            :key="item.name"
            class="source-row"
          >
            <view class="source-header">
              <text class="source-name">
                {{ item.name }}
              </text>
              <text class="source-val">
                ¥{{ item.value }}
              </text>
            </view>
            <view class="source-track">
              <view
                class="source-fill"
                :class="item.color"
                :style="{ width: item.percent + '%' }"
              />
            </view>
          </view>
        </view>
      </view>

      <!-- 互动 -->
      <view
        v-if="activeTab === 'interaction'"
        class="tab-content"
      >
        <view class="chart-card">
          <view class="interact-header">
            <text class="chart-title">
              新增粉丝
            </text>
            <text class="interact-week">
              +12 本周
            </text>
          </view>
          <view
            v-for="f in followers"
            :key="f.id"
            class="follower-item"
          >
            <view class="follower-avatar" />
            <view class="follower-info">
              <text class="follower-name">
                {{ f.name }}
              </text>
              <text class="follower-date">
                {{ f.followedAt }} 关注
              </text>
            </view>
            <text
              v-if="f.hasInteracted"
              class="follower-badge"
            >
              已互动
            </text>
          </view>
        </view>
        <view class="chart-card">
          <text class="chart-title">
            互动统计
          </text>
          <view class="interact-stats">
            <view class="is-item">
              <text class="is-val">
                156
              </text>
              <text class="is-label">
                收到点赞
              </text>
            </view>
            <view class="is-item">
              <text class="is-val">
                42
              </text>
              <text class="is-label">
                收到评论
              </text>
            </view>
            <view class="is-item">
              <text class="is-val">
                18
              </text>
              <text class="is-label">
                被转发
              </text>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- FAB 发布 -->
    <text
      class="fab"
      @click="goCreate"
    >
      ✏️
    </text>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="false"
      skeleton-type="detail"
      @retry="fetchData"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'

const loading = ref(true)
const loadError = ref<string | null>(null)
const refreshing = ref(false)
const activeTab = ref('content')

const overview = ref({
  contents: 28,
  totalViews: 125600,
  totalRevenue: 3680.50,
  followers: 1256,
  contentsGrowth: 12,
  viewsGrowth: 8.5,
  revenueGrowth: 15.2,
  followersGrowth: 5.8,
})

const contentList = ref<any[]>([
  { id: '1', type: 'article', title: '八字命理入门：天干地支的基础知识', status: 'published', views: 3280, likes: 156, comments: 42, revenue: 128.5 },
  { id: '2', type: 'post', title: '今日分享：如何看流年运势', status: 'published', views: 1560, likes: 89, comments: 23, revenue: 45.0 },
  { id: '3', type: 'article', title: '紫微斗数与八字的区别', status: 'reviewing' },
  { id: '4', type: 'article', title: '风水布局的基本原则', status: 'draft' },
])

const trendData = ref<number[]>([])
const revenueTrend = ref<number[]>([])
const followers = ref<any[]>([])

const tabOptions = [
  { value: 'content', label: '内容', icon: '📝' },
  { value: 'analytics', label: '数据', icon: '📊' },
  { value: 'revenue', label: '收益', icon: '💰' },
  { value: 'interaction', label: '互动', icon: '👥' },
]

const overviewCards = computed(() => [
  { icon: '📝', label: '内容数', value: overview.value.contents, growth: overview.value.contentsGrowth },
  { icon: '👁', label: '总阅读', value: overview.value.totalViews.toLocaleString(), growth: overview.value.viewsGrowth },
  { icon: '💰', label: '总收益', value: '¥' + overview.value.totalRevenue.toFixed(2), growth: overview.value.revenueGrowth },
  { icon: '👥', label: '粉丝数', value: overview.value.followers.toLocaleString(), growth: overview.value.followersGrowth },
])

const topContents = computed(() =>
  contentList.value.filter(c => c.status === 'published').slice(0, 5)
)

const revenueSources = [
  { name: '打赏收入', value: 1580, percent: 43, color: 'source-red' },
  { name: '付费内容', value: 1200, percent: 33, color: 'source-gold' },
  { name: '课程分成', value: 900, percent: 24, color: 'source-blue' },
]

onMounted(() => {
  fetchData()
  generateMockData()
})

function generateMockData() {
  trendData.value = Array.from({ length: 30 }, () => Math.floor(Math.random() * 80) + 10)
  revenueTrend.value = Array.from({ length: 14 }, () => Math.floor(Math.random() * 70) + 20)
  followers.value = [
    { id: '1', name: '命理爱好者', followedAt: '2024-01-15', hasInteracted: true },
    { id: '2', name: '易学新人', followedAt: '2024-01-14', hasInteracted: false },
    { id: '3', name: '周易研习', followedAt: '2024-01-13', hasInteracted: true },
  ]
}

async function fetchData() {
  loading.value = true; loadError.value = null
  try {
    const api = require('../../api')
    const res: any = await api.courseApi.dashboard?.().catch(() => ({}))
    if (res?.data) {
      // use real data
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || null
  } finally {
    loading.value = false
  }
}

async function handleRefresh() {
  refreshing.value = true
  await fetchData()
  setTimeout(() => { refreshing.value = false }, 500)
}

function statusLabel(status?: string): string {
  const map: Record<string, string> = { published: '已发布', draft: '草稿', reviewing: '审核中', rejected: '未通过' }
  return map[status || ''] || status || ''
}

function goCreate() {
  uni.navigateTo({ url: '/pages/articles/editor' })
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }

.header { background: #fff; padding: 20rpx 24rpx; display: flex; align-items: center; gap: 16rpx; border-bottom: 1rpx solid #E8E0D5; position: sticky; top: 0; z-index: 10; }
.back-btn { font-size: 44rpx; color: #2C2C2C; line-height: 1; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.header-refresh { font-size: 36rpx; }
.header-refresh.refreshing { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.scroll-area { padding: 24rpx; }

.overview-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; margin-bottom: 20rpx; }
.overview-card { border-radius: 16rpx; padding: 20rpx; background: #fff; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.card-bg-0 { background: linear-gradient(135deg, rgba(196,30,58,0.08), rgba(196,30,58,0.02)); }
.card-bg-1 { background: linear-gradient(135deg, rgba(74,144,217,0.08), rgba(74,144,217,0.02)); }
.card-bg-2 { background: linear-gradient(135deg, rgba(201,169,110,0.15), rgba(201,169,110,0.03)); }
.card-bg-3 { background: linear-gradient(135deg, rgba(82,196,26,0.08), rgba(82,196,26,0.02)); }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-icon { font-size: 36rpx; }
.card-growth { font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 8rpx; }
.growth-up { color: #52C41A; background: rgba(82,196,26,0.1); }
.growth-down { color: #C41E3A; background: rgba(196,30,58,0.1); }
.card-val { font-size: 36rpx; font-weight: bold; color: #2C2C2C; display: block; }
.card-label { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }

.tabs { display: flex; background: #fff; border-radius: 16rpx; padding: 8rpx; margin-bottom: 20rpx; }
.tab { flex: 1; text-align: center; padding: 16rpx 0; font-size: 24rpx; color: #666; border-radius: 12rpx; }
.tab-active { background: #C41E3A; color: #fff; font-weight: 500; }

.tab-content { }

.content-card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; display: flex; gap: 16rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.content-left { width: 120rpx; height: 120rpx; flex-shrink: 0; }
.content-cover { width: 100%; height: 100%; border-radius: 12rpx; background: linear-gradient(135deg, rgba(196,30,58,0.15), rgba(201,169,110,0.15)); }
.content-right { flex: 1; display: flex; flex-direction: column; }
.content-top { display: flex; justify-content: space-between; }
.content-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.content-tags { display: flex; gap: 8rpx; margin: 8rpx 0; }
.content-status { padding: 2rpx 12rpx; border-radius: 8rpx; font-size: 20rpx; }
.status-published { background: rgba(82,196,26,0.1); color: #52C41A; }
.status-draft { background: #F5F0E8; color: #999; }
.status-reviewing { background: rgba(245,158,11,0.1); color: #F59E0B; }
.status-rejected { background: rgba(196,30,58,0.1); color: #C41E3A; }
.content-type { font-size: 20rpx; color: #999; }
.content-stats { display: flex; gap: 16rpx; font-size: 22rpx; color: #999; }
.content-rev { color: #C9A96E; }

.chart-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.chart-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 20rpx; }

.bar-chart { display: flex; align-items: flex-end; gap: 4rpx; height: 200rpx; }
.bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
.bar-fill { width: 100%; background: rgba(196,30,58,0.3); border-radius: 4rpx 4rpx 0 0; min-height: 4rpx; }
.bar-today { background: #C41E3A; }
.bar-revenue { background: #C9A96E; }
.chart-labels { display: flex; justify-content: space-between; font-size: 20rpx; color: #999; margin-top: 8rpx; }

.top-item { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.top-num { width: 40rpx; height: 40rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: bold; flex-shrink: 0; }
.top-num-1 { background: #C9A96E; color: #fff; }
.top-num-2 { background: #ccc; color: #fff; }
.top-num-3 { background: #A0522D; color: #fff; }
.top-num-4, .top-num-5 { background: #E8E0D5; color: #999; }
.top-info { flex: 1; }
.top-title { font-size: 24rpx; color: #2C2C2C; display: block; }
.top-views { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }

.revenue-hero { background: linear-gradient(135deg, #C9A96E, #B8956A); border-radius: 16rpx; padding: 32rpx; text-align: center; color: #fff; margin-bottom: 16rpx; }
.rev-label { font-size: 24rpx; opacity: 0.8; display: block; }
.rev-val { font-size: 56rpx; font-weight: bold; display: block; margin: 8rpx 0 20rpx; }
.rev-sub { display: flex; gap: 40rpx; justify-content: center; margin-bottom: 20rpx; }
.rev-sub-item { text-align: center; }
.rev-sub-label { font-size: 22rpx; opacity: 0.8; display: block; }
.rev-sub-val { font-size: 28rpx; font-weight: 600; display: block; margin-top: 4rpx; }
.rev-withdraw { display: inline-block; padding: 12rpx 48rpx; background: rgba(255,255,255,0.2); border-radius: 24rpx; font-size: 26rpx; backdrop-filter: blur(10rpx); }

.source-row { margin-bottom: 16rpx; }
.source-header { display: flex; justify-content: space-between; font-size: 24rpx; margin-bottom: 8rpx; }
.source-name { color: #666; }
.source-val { color: #2C2C2C; font-weight: 500; }
.source-track { height: 12rpx; background: #F5F0E8; border-radius: 6rpx; overflow: hidden; }
.source-fill { height: 100%; border-radius: 6rpx; }
.source-red { background: #C41E3A; }
.source-gold { background: #C9A96E; }
.source-blue { background: #4A90D9; }

.interact-header { display: flex; justify-content: space-between; align-items: center; }
.interact-week { font-size: 24rpx; color: #C41E3A; }

.follower-item { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.follower-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: linear-gradient(135deg, rgba(196,30,58,0.2), rgba(201,169,110,0.2)); }
.follower-info { flex: 1; }
.follower-name { font-size: 26rpx; color: #2C2C2C; display: block; }
.follower-date { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }
.follower-badge { font-size: 20rpx; color: #52C41A; background: rgba(82,196,26,0.1); padding: 4rpx 16rpx; border-radius: 12rpx; }

.interact-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; text-align: center; }
.is-val { font-size: 40rpx; font-weight: bold; color: #2C2C2C; display: block; }
.is-label { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }

.bottom-spacer { height: 120rpx; }

.fab { position: fixed; right: 32rpx; bottom: 80rpx; width: 96rpx; height: 96rpx; background: #C41E3A; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 44rpx; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); z-index: 20; }
</style>
