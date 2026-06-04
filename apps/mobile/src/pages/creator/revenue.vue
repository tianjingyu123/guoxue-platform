<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <text class="back-btn" @click="uni.navigateBack">‹</text>
      <text class="header-title">创作者收益</text>
      <text class="header-action" @click="goWithdraw">💰 提现</text>
    </view>

    <scroll-view scroll-y class="scroll-area">
      <DataState
        :is-loading="loading"
        :error="loadError"
        :is-empty="false"
        skeleton-type="detail"
        @retry="fetchData"
      >
        <!-- 收益总览 -->
        <view class="overview-card">
          <text class="ov-label">累计收益（元）</text>
          <text class="ov-val">{{ formatMoney(data?.overview?.totalRevenue) }}</text>
          <view class="ov-grid">
            <view class="ov-item">
              <text class="ov-item-label">本月收益</text>
              <text class="ov-item-val">{{ formatMoney(data?.overview?.monthRevenue) }}</text>
              <text class="ov-item-change" :class="(data?.overview?.monthGrowthRate || 0) >= 0 ? 'up' : 'down'">
                {{ (data?.overview?.monthGrowthRate || 0) >= 0 ? '↑' : '↓' }}{{ Math.abs(data?.overview?.monthGrowthRate || 0) }}%
              </text>
            </view>
            <view class="ov-item">
              <text class="ov-item-label">可提现</text>
              <text class="ov-item-val" style="color:#C41E3A">{{ formatMoney(data?.overview?.withdrawable) }}</text>
            </view>
            <view class="ov-item">
              <text class="ov-item-label">待结算</text>
              <text class="ov-item-val" style="color:#F59E0B">{{ formatMoney(data?.overview?.pending) }}</text>
            </view>
          </view>
        </view>

        <!-- 收益趋势 -->
        <view class="section-card">
          <view class="section-header">
            <text class="section-title">收益趋势</text>
            <text class="section-sub">近30天</text>
          </view>
          <view class="trend-chart" v-if="data?.trend?.length">
            <canvas canvas-id="trendCanvas" class="trend-canvas" />
          </view>
          <view class="trend-labels" v-if="data?.trend?.length">
            <text class="trend-label">{{ data.trend[0]?.date?.slice(5) }}</text>
            <text class="trend-label">{{ data.trend[Math.floor(data.trend.length / 2)]?.date?.slice(5) }}</text>
            <text class="trend-label">{{ data.trend[data.trend.length - 1]?.date?.slice(5) }}</text>
          </view>
        </view>

        <!-- 收益来源构成 -->
        <view class="section-card">
          <view class="section-header">
            <text class="section-title">收益来源</text>
            <text class="section-more" @click="goSourceDetail">查看详情 ›</text>
          </view>
          <view v-for="s in data?.sources || []" :key="s.type" class="source-item">
            <view class="source-icon-wrap" :class="'source-icon-' + s.type">
              <text class="source-icon">{{ sourceIcon(s.type) }}</text>
            </view>
            <view class="source-info">
              <view class="source-top">
                <text class="source-name">{{ sourceName(s.type) }}</text>
                <text class="source-amount">{{ formatMoney(s.amount) }}</text>
              </view>
              <view class="source-bar-track">
                <view class="source-bar-fill" :class="'source-fill-' + s.type" :style="{ width: (s.percentage || 0) + '%' }" />
              </view>
            </view>
          </view>
        </view>

        <!-- 收益明细 -->
        <view class="section-card">
          <text class="section-title">收益明细</text>

          <!-- 类型筛选 -->
          <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
            <view class="filter-track">
              <text
                v-for="f in filterOptions"
                :key="f.value"
                class="filter-tag"
                :class="{ 'filter-active': selectedType === f.value }"
                @click="switchFilter(f.value)"
              >{{ f.label }}</text>
            </view>
          </scroll-view>

          <!-- 明细列表 -->
          <view v-if="detailsLoading" class="skeleton-list">
            <view v-for="i in 3" :key="i" class="skeleton-item" />
          </view>
          <view v-else-if="details.length === 0" class="empty-details">
            <text class="empty-text">暂无收益记录</text>
          </view>
          <view v-else class="detail-list">
            <view v-for="item in details" :key="item.id" class="detail-item">
              <view class="detail-icon-wrap" :class="'source-icon-' + item.type">
                <text class="detail-icon">{{ sourceIcon(item.type) }}</text>
              </view>
              <view class="detail-info">
                <view class="detail-top">
                  <text class="detail-title">{{ item.title }}</text>
                  <text class="detail-amount">+{{ formatMoney(item.amount) }}</text>
                </view>
                <view class="detail-meta">
                  <image v-if="item.buyer?.avatar" :src="item.buyer.avatar" class="detail-buyer-avatar" mode="aspectFill" />
                  <text v-if="item.buyer?.nickname" class="detail-buyer">{{ item.buyer.nickname }}</text>
                  <text class="detail-date">{{ item.createdAt }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="bottom-spacer" />
      </DataState>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import DataState from '../../components/DataState.vue'

const loading = ref(true)
const loadError = ref<string | null>(null)
const data = ref<any>(null)
const details = ref<any[]>([])
const detailsLoading = ref(false)
const selectedType = ref('all')

const filterOptions = [
  { value: 'all', label: '全部' },
  { value: 'course', label: '课程' },
  { value: 'question', label: '问答' },
  { value: 'reward', label: '打赏' },
  { value: 'tip', label: '赞赏' },
  { value: 'article', label: '文章' },
  { value: 'live', label: '直播' },
]

const sourceNames: Record<string, string> = {
  course: '课程收益', question: '问答收益', reward: '打赏收益',
  tip: '赞赏收益', article: '文章收益', live: '直播收益',
}

const sourceIcons: Record<string, string> = {
  course: '📚', question: '❓', reward: '🎁',
  tip: '❤️', article: '📝', live: '🎤',
}

function sourceName(type: string): string {
  return sourceNames[type] || type || ''
}

function sourceIcon(type: string): string {
  return sourceIcons[type] || '💰'
}

onMounted(() => { fetchData() })

watch(selectedType, () => { fetchDetails() })

async function fetchData() {
  loading.value = true; loadError.value = null
  try {
    const api = require('../../api')
    const res: any = await api.revenueApi?.summary?.().catch(() => ({}))
    data.value = res?.data || res || {
      overview: { totalRevenue: 3680.50, monthRevenue: 15680, monthGrowthRate: 12.5, withdrawable: 2180, pending: 1500.50 },
      trend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
        amount: Math.floor(Math.random() * 200) + 50,
      })),
      sources: [
        { type: 'course', amount: 1800, percentage: 48 },
        { type: 'reward', amount: 980, percentage: 27 },
        { type: 'article', amount: 600, percentage: 16 },
        { type: 'live', amount: 300, percentage: 9 },
      ],
    }
    await fetchDetails()
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function fetchDetails() {
  detailsLoading.value = true
  try {
    const api = require('../../api')
    const params: any = { page: 1, pageSize: 20 }
    if (selectedType.value !== 'all') params.type = selectedType.value
    const res: any = await api.revenueApi?.earnings?.(params).catch(() => ({}))
    details.value = res?.list || res?.data || []
  } catch {
    details.value = []
  } finally {
    detailsLoading.value = false
  }
}

function switchFilter(val: string) {
  selectedType.value = val
}

function formatMoney(val?: number): string {
  if (val === undefined || val === null) return '0.00'
  return val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function goWithdraw() {
  uni.showToast({ title: '提现功能开发中', icon: 'none' })
}

function goSourceDetail() {
  uni.showToast({ title: '详情功能开发中', icon: 'none' })
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }

.header { background: #fff; padding: 20rpx 24rpx; display: flex; align-items: center; gap: 16rpx; border-bottom: 1rpx solid #E8E0D5; position: sticky; top: 0; z-index: 10; }
.back-btn { font-size: 44rpx; color: #2C2C2C; line-height: 1; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.header-action { font-size: 24rpx; color: #C41E3A; padding: 8rpx 16rpx; border: 1rpx solid #C41E3A; border-radius: 16rpx; }

.scroll-area { padding: 24rpx; }

.overview-card { background: linear-gradient(135deg, rgba(196,30,58,0.08), rgba(196,30,58,0.02)); border: 1rpx solid rgba(196,30,58,0.15); border-radius: 20rpx; padding: 32rpx; margin-bottom: 20rpx; }
.ov-label { font-size: 24rpx; color: #666; text-align: center; display: block; }
.ov-val { font-size: 56rpx; font-weight: bold; color: #C41E3A; text-align: center; display: block; margin: 8rpx 0 24rpx; }
.ov-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; padding-top: 20rpx; border-top: 1rpx solid rgba(196,30,58,0.1); text-align: center; }
.ov-item { }
.ov-item-label { font-size: 20rpx; color: #999; display: block; }
.ov-item-val { font-size: 28rpx; font-weight: bold; color: #2C2C2C; display: block; margin: 4rpx 0; }
.ov-item-change { font-size: 20rpx; display: inline-block; padding: 2rpx 8rpx; border-radius: 8rpx; }
.ov-item-change.up { color: #52C41A; background: rgba(82,196,26,0.1); }
.ov-item-change.down { color: #C41E3A; background: rgba(196,30,58,0.1); }

.section-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.section-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 20rpx; }
.section-sub { font-size: 22rpx; color: #999; margin-bottom: 20rpx; display: block; }
.section-more { font-size: 22rpx; color: #C41E3A; }

.trend-chart { height: 240rpx; position: relative; }
.trend-canvas { width: 100%; height: 100%; }
.trend-labels { display: flex; justify-content: space-between; margin-top: 8rpx; }
.trend-label { font-size: 20rpx; color: #999; }

.source-item { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.source-icon-wrap { width: 56rpx; height: 56rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.source-icon { font-size: 28rpx; }
.source-icon-course { background: rgba(74,144,217,0.1); }
.source-icon-reward { background: rgba(245,158,11,0.1); }
.source-icon-question { background: rgba(82,196,26,0.1); }
.source-icon-tip { background: rgba(233,30,99,0.1); }
.source-icon-article { background: rgba(156,39,176,0.1); }
.source-icon-live { background: rgba(196,30,58,0.1); }
.source-info { flex: 1; }
.source-top { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.source-name { font-size: 24rpx; color: #2C2C2C; }
.source-amount { font-size: 24rpx; font-weight: 500; color: #2C2C2C; }
.source-bar-track { height: 12rpx; background: #F5F0E8; border-radius: 6rpx; overflow: hidden; }
.source-bar-fill { height: 100%; border-radius: 6rpx; }
.source-fill-course { background: #4A90D9; }
.source-fill-reward { background: #F59E0B; }
.source-fill-question { background: #52C41A; }
.source-fill-tip { background: #E91E63; }
.source-fill-article { background: #9C27B0; }
.source-fill-live { background: #C41E3A; }

.filter-scroll { margin-bottom: 20rpx; }
.filter-track { display: flex; gap: 12rpx; }
.filter-tag { padding: 8rpx 24rpx; border-radius: 20rpx; font-size: 22rpx; color: #666; background: #F5F0E8; white-space: nowrap; }
.filter-active { background: #C41E3A; color: #fff; font-weight: 500; }

.skeleton-list { display: flex; flex-direction: column; gap: 16rpx; }
.skeleton-item { height: 80rpx; background: #F5F0E8; border-radius: 12rpx; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.empty-details { text-align: center; padding: 48rpx 0; }
.empty-text { font-size: 24rpx; color: #999; }

.detail-list { display: flex; flex-direction: column; gap: 16rpx; }
.detail-item { display: flex; gap: 16rpx; padding: 16rpx; background: #F9F8F6; border-radius: 16rpx; }
.detail-icon-wrap { width: 56rpx; height: 56rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.detail-icon { font-size: 28rpx; }
.detail-info { flex: 1; }
.detail-top { display: flex; justify-content: space-between; margin-bottom: 4rpx; }
.detail-title { font-size: 24rpx; color: #2C2C2C; flex: 1; }
.detail-amount { font-size: 24rpx; color: #C41E3A; font-weight: 600; }
.detail-meta { display: flex; align-items: center; gap: 8rpx; font-size: 20rpx; color: #999; }
.detail-buyer-avatar { width: 28rpx; height: 28rpx; border-radius: 50%; }
.detail-buyer { }
.detail-date { }

.bottom-spacer { height: 40rpx; }
</style>
