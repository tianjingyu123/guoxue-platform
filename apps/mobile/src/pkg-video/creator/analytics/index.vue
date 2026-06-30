<template>
  <view class="an-page">
    <!-- 顶部导航 -->
    <view class="an-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="an-nav-inner">
        <view class="an-icon-btn" @tap="goBack">
          <AppIcon name="arrow-left" :size="24" color="#1a1a1a" />
        </view>
        <text class="an-title">数据分析</text>
        <view class="an-icon-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="an-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- 加载态 -->
      <view v-if="loading" class="an-state">
        <text class="an-state-txt">加载中…</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="errMsg" class="an-state">
        <AppIcon name="alert-circle" :size="40" color="#ccc" />
        <text class="an-state-txt">{{ errMsg }}</text>
        <view class="an-state-btn" @tap="load">重试</view>
      </view>

      <template v-else-if="data">
        <!-- 关键指标 -->
        <view class="an-section">
          <text class="an-section-title">关键指标（累计）</text>
          <view class="an-metric-grid">
            <view class="an-card an-metric">
              <text class="an-metric-label">总观看</text>
              <text class="an-metric-num">{{ fmt(data.totalViews) }}</text>
            </view>
            <view class="an-card an-metric">
              <text class="an-metric-label">总点赞</text>
              <text class="an-metric-num">{{ fmt(data.totalLikes) }}</text>
            </view>
            <view class="an-card an-metric">
              <text class="an-metric-label">评论数</text>
              <text class="an-metric-num">{{ fmt(data.totalComments) }}</text>
            </view>
            <view class="an-card an-metric">
              <text class="an-metric-label">分享数</text>
              <text class="an-metric-num">{{ fmt(data.totalShares) }}</text>
            </view>
          </view>
        </view>

        <!-- 观看趋势（仅当后端有按天快照数据时展示，否则诚实隐藏）-->
        <view v-if="hasTrend" class="an-section">
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
                  <text v-for="(item, i) in trend" :key="i" class="an-xtick">{{ item.date }}</text>
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
          <view v-if="data.videoMetrics.length === 0" class="an-empty">
            <AppIcon name="file-video" :size="40" color="#ccc" />
            <text class="an-empty-txt">还没有视频数据</text>
          </view>
          <view v-else class="an-list">
            <view v-for="(video, idx) in data.videoMetrics" :key="video.id" class="an-card an-video">
              <view class="an-video-head">
                <view class="an-video-info">
                  <text class="an-video-title">{{ video.title }}</text>
                  <text class="an-video-meta">{{ video.uploadDate }} • {{ video.duration }}</text>
                </view>
                <text class="an-rank">#{{ idx + 1 }}</text>
              </view>
              <view class="an-video-stats">
                <view class="an-vstat"><AppIcon name="eye" :size="12" color="#999" /><text>{{ fmt(video.views) }}</text></view>
                <view class="an-vstat"><AppIcon name="thumbs-up" :size="12" color="#999" /><text>{{ fmt(video.likes) }}</text></view>
                <view class="an-vstat"><AppIcon name="message-square" :size="12" color="#999" /><text>{{ fmt(video.comments) }}</text></view>
                <view class="an-vstat"><AppIcon name="trending-up" :size="12" color="#999" /><text>{{ fmt(video.shares) }}</text></view>
              </view>
            </view>
          </view>
        </view>
      </template>
      <view class="an-pad" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { creatorApi, formatCreatorNumber, type CreatorAnalytics } from '@/lib/creator-data'

const statusBarHeight = ref(0)
const fmt = formatCreatorNumber

const loading = ref(true)
const errMsg = ref('')
const data = ref<CreatorAnalytics | null>(null)

const trend = computed(() => data.value?.viewTrend ?? [])
const hasTrend = computed(() => trend.value.length > 0)

// 折线图：Y轴上界取整到 1500 的倍数
const chartMax = computed(() => {
  if (!trend.value.length) return 1500
  const peak = Math.max(...trend.value.map((d) => d.views))
  const step = 1500
  return Math.max(step, Math.ceil(peak / step) * step)
})
const yTicks = computed(() => {
  const step = 1500
  const ticks: number[] = []
  for (let v = chartMax.value; v >= 0; v -= step) ticks.push(v)
  return ticks
})
const svgW = 300
const svgH = 200
const pointCoords = computed(() => {
  const n = trend.value.length
  return trend.value.map((d, i) => ({
    x: n > 1 ? (i / (n - 1)) * svgW : svgW / 2,
    y: svgH - (d.views / chartMax.value) * svgH,
  }))
})
const linePoints = computed(() => pointCoords.value.map((p) => `${p.x},${p.y}`).join(' '))

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    data.value = await creatorApi.getAnalytics()
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  uni.getSystemInfo({ success: (res) => { statusBarHeight.value = res.statusBarHeight || 0 } })
  load()
})
</script>

<style scoped>
.an-page { min-height: 100vh; background: #f5f5f5; }
.an-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 10;
  background: #ffffff; border-bottom: 1px solid #eee;
}
.an-nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; height: 44px; }
.an-icon-btn { padding: 4px; width: 32px; }
.an-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.an-scroll { height: 100vh; box-sizing: border-box; }
.an-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 80px 32px; }
.an-state-txt { font-size: 14px; color: #999; }
.an-state-btn { margin-top: 4px; padding: 8px 24px; background: var(--brand); color: #ffffff; border-radius: 999px; font-size: 14px; }
.an-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 32px; }
.an-empty-txt { font-size: 14px; color: #999; }
.an-section { margin: 16px 16px 0; }
.an-section-title { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.an-card { background: #ffffff; border-radius: 12px; padding: 12px; border: 1px solid #f0f0f0; }
.an-metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.an-metric { display: flex; flex-direction: column; }
.an-metric-label { font-size: 12px; color: #999; margin-bottom: 4px; }
.an-metric-num { font-size: 24px; font-weight: 700; color: #1a1a1a; }
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
</style>
