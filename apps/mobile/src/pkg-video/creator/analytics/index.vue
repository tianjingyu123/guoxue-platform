<template>
  <view class="an-page">
    <!-- 顶部导航 -->
    <view class="an-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="an-nav-inner">
        <view class="an-icon-btn" @tap="goBack">
          <AppIcon name="arrow-left" :size="24" color="#1a1a1a" />
        </view>
        <text class="an-title">数据分析</text>
        <view class="an-icon-btn">
          <AppIcon name="download" :size="24" color="#999" />
        </view>
      </view>
      <!-- 时间周期 -->
      <view class="an-period">
        <view
          v-for="p in periods"
          :key="p.key"
          class="an-period-btn"
          :class="{ 'an-period-active': period === p.key }"
          @tap="period = p.key"
        >
          {{ p.label }}
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="an-scroll" :style="{ paddingTop: statusBarHeight + 96 + 'px' }">
      <!-- 加载/错误 -->
      <view v-if="loading" class="an-loading">
        <view class="an-loading-spin" />
        <text class="an-loading-txt">加载中...</text>
      </view>
      <view v-if="error" class="an-error">
        <text class="an-error-txt">加载失败</text>
        <view class="an-error-btn" @tap="fetchData"><text class="an-error-btn-txt">重试</text></view>
      </view>
      <template v-if="!loading && !error">
      <!-- 关键指标 -->
      <view class="an-section">
        <text class="an-section-title">关键指标</text>
        <view class="an-metric-grid">
          <view class="an-card an-metric">
            <text class="an-metric-label">总观看</text>
            <text class="an-metric-num">{{ (data.totalViews / 1000).toFixed(0) }}K</text>
            <view class="an-trend an-up"><AppIcon name="trending-up" :size="12" color="#16a34a" /><text>12%</text></view>
          </view>
          <view class="an-card an-metric">
            <text class="an-metric-label">总点赞</text>
            <text class="an-metric-num">{{ data.totalLikes }}</text>
            <view class="an-trend an-up"><AppIcon name="trending-up" :size="12" color="#16a34a" /><text>8%</text></view>
          </view>
          <view class="an-card an-metric">
            <text class="an-metric-label">评论数</text>
            <text class="an-metric-num">{{ data.totalComments }}</text>
            <view class="an-trend an-down"><AppIcon name="trending-down" :size="12" color="#dc2626" /><text>2%</text></view>
          </view>
          <view class="an-card an-metric">
            <text class="an-metric-label">分享数</text>
            <text class="an-metric-num">{{ data.totalShares }}</text>
            <view class="an-trend an-up"><AppIcon name="trending-up" :size="12" color="#16a34a" /><text>5%</text></view>
          </view>
        </view>
      </view>

      <!-- 观看趋势 -->
      <view class="an-section">
        <text class="an-section-title">观看趋势</text>
        <view class="an-card">
          <view class="an-chart-wrap">
            <view class="an-yaxis">
              <text v-for="t in yTicks" :key="t" class="an-ytick">{{ t }}</text>
            </view>
            <view class="an-chart-main">
              <view class="an-grid">
                <view v-for="t in yTicks" :key="t" class="an-gridline" />
              </view>
              <view class="an-svg-box">
                <svg :viewBox="`0 0 ${svgW} ${svgH}`" preserveAspectRatio="none" class="an-svg">
                  <polyline :points="linePoints" fill="none" stroke="#c41e3a" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
                  <circle v-for="(pt, i) in pointCoords" :key="i" :cx="pt.x" :cy="pt.y" r="3" fill="#c41e3a" />
                </svg>
              </view>
              <view class="an-xaxis">
                <text v-for="(item, i) in data.viewTrend" :key="i" class="an-xtick">{{ item.date }}</text>
              </view>
            </view>
          </view>
          <view class="an-legend">
            <view class="an-legend-item"><view class="an-dot" style="background:#C41E3A" /><text>观看</text></view>
          </view>
        </view>
      </view>

      <!-- 视频统计 -->
      <view class="an-section">
        <text class="an-section-title">视频统计</text>
        <view class="an-list">
          <view v-for="(video, idx) in data.videoMetrics" :key="video.id" class="an-card an-video">
            <view class="an-video-head">
              <view class="an-video-info">
                <text class="an-video-title">{{ video.title }}</text>
                <text class="an-video-meta">{{ video.uploadDate }} • {{ video.duration }}</text>
              </view>
              <text class="an-rank">#{{ idx + 1 }}</text>
            </view>
            <view class="an-video-stats">
              <view class="an-vstat"><AppIcon name="eye" :size="12" color="#999" /><text>{{ video.views }}</text></view>
              <view class="an-vstat"><AppIcon name="thumbs-up" :size="12" color="#999" /><text>{{ video.likes }}</text></view>
              <view class="an-vstat"><AppIcon name="message-square" :size="12" color="#999" /><text>{{ video.comments }}</text></view>
              <view class="an-vstat"><AppIcon name="trending-up" :size="12" color="#999" /><text>{{ video.shares }}</text></view>
            </view>
          </view>
        </view>
      </view>
      <view class="an-pad" />
      </template>
    </scroll-view>
  </view>

  </view>
  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onMounted } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { creatorApi } from '@/lib/creator-data'

const statusBarHeight = ref(0)
const loading = ref(true)
const error = ref(false)
const data = ref({ totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0, viewTrend: [] as Array<{ date: string; views: number; likes: number; comments: number }>, videoMetrics: [] as Array<{ id: string; title: string; views: number; likes: number; comments: number; shares: number; duration: string; uploadDate: string }> })
const period = ref<'week' | 'month' | 'year'>('week')
const periods = [
  { key: 'week' as const, label: '本周' },
  { key: 'month' as const, label: '本月' },
  { key: 'year' as const, label: '本年' },
]
onMounted(async () => {
  try {
    data.value = await creatorApi.getAnalytics()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

// 折线图：Y轴上界取整到 1500 的倍数(匹配原型刻度)
const chartMax = computed(() => {
  const trend = data.value.viewTrend
  if (trend.length === 0) return 1500
  const peak = Math.max(...trend.map((d) => d.views))
  const step = 1500
  return Math.ceil(peak / step) * step
})
const yTicks = computed(() => {
  const step = 1500
  const ticks: number[] = []
  for (let v = chartMax.value; v >= 0; v -= step) ticks.push(v)
  return ticks
})
// SVG 视图坐标系
const svgW = 300
const svgH = 200
const pointCoords = computed(() => {
  const trend = data.value.viewTrend
  const n = trend.length
  return trend.map((d, i) => ({
    x: n > 1 ? (i / (n - 1)) * svgW : svgW / 2,
    y: svgH - (d.views / chartMax.value) * svgH,
  }))
})
const linePoints = computed(() => pointCoords.value.map((p) => `${p.x},${p.y}`).join(' '))

async function fetchData() {
  error.value = false
  loading.value = true
  try {
    data.value = await creatorApi.getAnalytics()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

uni.getSystemInfo({ success: (res) => { statusBarHeight.value = res.statusBarHeight || 0 } })
</script>

<style scoped>
.an-page { min-height: 100vh; background: #f5f5f5; }
.an-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 10;
  background: #ffffff; border-bottom: 1px solid #eee;
}
.an-nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; height: 44px; }
.an-icon-btn { padding: 4px; }
.an-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.an-period { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #f5f5f5; }
.an-period-btn {
  padding: 6px 12px; border-radius: 999px; font-size: 14px; font-weight: 500;
  background: #f0f0f0; color: #1a1a1a;
}
.an-period-active { background: #c41e3a; color: #ffffff; }
.an-scroll { height: 100vh; box-sizing: border-box; }
.an-section { margin: 16px 16px 0; }
.an-section-title { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.an-card { background: #ffffff; border-radius: 12px; padding: 12px; border: 1px solid #f0f0f0; }
.an-metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.an-metric { display: flex; flex-direction: column; }
.an-metric-label { font-size: 12px; color: #999; margin-bottom: 4px; }
.an-metric-num { font-size: 24px; font-weight: 700; color: #1a1a1a; }
.an-trend { display: flex; align-items: center; gap: 2px; font-size: 12px; margin-top: 4px; }
.an-up { color: #16a34a; }
.an-down { color: #dc2626; }
/* 趋势折线图 */
.an-chart-wrap { display: flex; padding: 8px 0; }
.an-yaxis { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; padding-right: 8px; height: 200px; }
.an-ytick { font-size: 11px; color: #999; line-height: 1; }
.an-chart-main { position: relative; flex: 1; }
.an-grid { position: absolute; top: 0; left: 0; right: 0; height: 200px; display: flex; flex-direction: column; justify-content: space-between; }
.an-gridline { border-top: 1px dashed #ededed; height: 0; }
.an-svg-box { position: relative; height: 200px; width: 100%; }
.an-svg { width: 100%; height: 100%; display: block; overflow: visible; }
.an-xaxis { display: flex; justify-content: space-between; margin-top: 6px; }
.an-xtick { font-size: 11px; color: #999; }
.an-legend { display: flex; justify-content: center; gap: 16px; margin-top: 8px; }
.an-legend-item { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #666; }
.an-dot { width: 8px; height: 8px; border-radius: 50%; }
.an-list { display: flex; flex-direction: column; gap: 8px; }
.an-video-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
.an-video-info { flex: 1; }
.an-video-title {
  font-size: 14px; font-weight: 500; color: #1a1a1a;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
}
.an-video-meta { display: block; font-size: 12px; color: #999; margin-top: 2px; }
.an-rank { font-size: 12px; background: #f0f0f0; color: #666; padding: 2px 8px; border-radius: 4px; }
.an-video-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.an-vstat { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #666; }
.an-pad { height: 80px; }
/* 加载/错误 */
.an-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 200rpx 0; gap: 24rpx; }
.an-loading-spin { width: 56rpx; height: 56rpx; border: 4rpx solid #E5E7EB; border-top-color: #c41e3a; border-radius: 50%; animation: an-spin 0.8s linear infinite; }
@keyframes an-spin { to { transform: rotate(360deg); } }
.an-loading-txt { font-size: 26rpx; color: #999; }
.an-error { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 200rpx 48rpx; gap: 24rpx; }
.an-error-txt { font-size: 28rpx; color: #999; }
.an-error-btn { padding: 16rpx 48rpx; background: #c41e3a; border-radius: 999rpx; }
.an-error-btn-txt { font-size: 28rpx; color: #fff; font-weight: 500; }
</style>
