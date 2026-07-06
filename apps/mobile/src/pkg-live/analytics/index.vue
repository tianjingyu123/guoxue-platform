<template>
  <!-- 加载态 -->
  <view v-if="loading" class="state-page">
    <view class="state-spinner" />
    <text class="state-text">加载数据中…</text>
  </view>
  <!-- 错误态 -->
  <view v-else-if="error" class="state-page">
    <text class="state-text">{{ error }}</text>
    <view class="state-retry" @tap="fetchData">重试</view>
  </view>
  <!-- 正常内容 -->
  <view v-else class="analytics-page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-left">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="40" color="#1a1a1a" />
        </view>
        <view class="nav-title-wrap">
          <text class="nav-title">{{ liveInfo.title }}</text>
          <text class="nav-sub">{{ liveInfo.startTime }}</text>
        </view>
      </view>
      <view class="nav-right">
        <view class="nav-btn">
          <app-icon name="download" :size="28" color="#1a1a1a" />
          <text class="nav-btn-text">导出报告</text>
        </view>
        <view class="nav-btn">
          <app-icon name="share-2" :size="28" color="#1a1a1a" />
          <text class="nav-btn-text">分享</text>
        </view>
      </view>
    </view>

    <!-- Tab -->
    <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false">
      <view class="tab-row">
        <view
          v-for="t in tabs"
          :key="t.key"
          class="tab-item"
          :class="{ 'tab-item-active': activeTab === t.key }"
          @tap="activeTab = t.key"
        >
          {{ t.label }}
        </view>
      </view>
    </scroll-view>

    <!-- 数据总览 -->
    <view v-if="activeTab === 'overview'" class="tab-content">
      <view class="info-card">
        <view class="info-cover">
          <app-icon name="play" :size="64" color="#fff" />
        </view>
        <view class="info-body">
          <view class="info-badges">
            <view class="badge badge-gray">{{ liveInfo.type === 'knowledge' ? '知识授课' : '电商带货' }}</view>
            <view class="badge badge-dark">已结束</view>
          </view>
          <text class="info-title">{{ liveInfo.title }}</text>
          <text class="info-duration">时长：{{ liveInfo.duration }}</text>
        </view>
      </view>

      <view class="core-grid">
        <view v-for="stat in coreStats" :key="stat.label" class="core-card">
          <view class="core-head">
            <view class="core-text">
              <text class="core-label">{{ stat.label }}</text>
              <text class="core-value">{{ stat.value }}</text>
            </view>
            <view class="core-icon" :class="trendBg(stat.trend)">
              <app-icon :name="stat.icon" :size="32" :color="trendColor(stat.trend)" />
            </view>
          </view>
          <view class="core-trend" :style="{ color: trendColor(stat.trend) }">
            <app-icon :name="stat.trend === 'up' ? 'arrow-up' : stat.trend === 'down' ? 'arrow-down' : 'minus'" :size="24" :color="trendColor(stat.trend)" />
            <text class="core-trend-text" :style="{ color: trendColor(stat.trend) }">较上场 {{ stat.change }}</text>
          </view>
        </view>
      </view>

      <view v-if="insights.length" class="card">
        <view class="card-title">
          <app-icon name="zap" :size="32" color="#f59e0b" />
          <text class="card-title-text">数据洞察</text>
        </view>
        <view v-for="(text, i) in insights" :key="i" class="insight" :class="iStyle(i).box">
          <app-icon :name="iStyle(i).icon" :size="32" :color="iStyle(i).color" />
          <text class="insight-text" :class="iStyle(i).textClass">{{ text }}</text>
        </view>
      </view>
    </view>

    <!-- 流量分析 -->
    <view v-if="activeTab === 'traffic'" class="tab-content">
      <view class="card">
        <view class="card-head-row">
          <view class="card-title">
            <app-icon name="bar-chart-3" :size="32" color="#C41E3A" />
            <text class="card-title-text">在线人数趋势</text>
          </view>
          <view class="badge badge-outline">峰值 {{ maxTraffic.toLocaleString() }}</view>
        </view>
        <view class="chart">
          <view v-for="(item, i) in trafficData" :key="i" class="chart-col">
            <view
              class="chart-bar"
              :class="{ 'chart-bar-peak': item.value === maxTraffic }"
              :style="{ height: (item.value / maxTraffic * 100) + '%' }"
            />
            <text class="chart-label">{{ item.time.split(':')[1] }}</text>
          </view>
        </view>
        <view class="chart-axis">
          <text v-for="t in axisTicks" :key="t" class="axis-text">{{ t }}</text>
        </view>
      </view>

      <view v-if="keyMoments.length" class="card">
        <text class="card-title-text card-title-block">关键时刻</text>
        <view v-for="(item, i) in keyMoments" :key="i" class="moment-row">
          <view class="moment-dot-col">
            <view class="moment-dot" />
            <view v-if="i < keyMoments.length - 1" class="moment-line" />
          </view>
          <view class="moment-body">
            <view class="moment-head">
              <text class="moment-time">{{ item.time }}</text>
              <view class="badge badge-gray">{{ item.event }}</view>
            </view>
            <text class="moment-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 观众画像 -->
    <view v-if="activeTab === 'audience'" class="tab-content">
      <view v-if="!audience.gender.length && !audience.age.length && !audience.region.length && !audience.source.length" class="empty-hint">
        <app-icon name="users" :size="64" color="rgba(0,0,0,0.15)" />
        <text class="empty-hint-text">本场暂无观众画像数据</text>
      </view>
      <view v-if="audience.gender.length" class="card">
        <view class="card-title">
          <app-icon name="pie-chart" :size="32" color="#C41E3A" />
          <text class="card-title-text">性别分布</text>
        </view>
        <view class="gender-row">
          <view class="gender-ring">
            <view class="gender-ring-inner">
              <app-icon name="users" :size="48" color="#999" />
            </view>
          </view>
          <view class="gender-list">
            <view v-for="item in audience.gender" :key="item.label" class="gender-item">
              <view class="gender-dot" :style="{ background: item.color }" />
              <text class="gender-label">{{ item.label }}</text>
              <text class="gender-value">{{ item.value }}%</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="audience.age.length" class="card">
        <text class="card-title-text card-title-block">年龄分布</text>
        <view v-for="item in audience.age" :key="item.label" class="age-row">
          <view class="age-head">
            <text class="age-label">{{ item.label }}岁</text>
            <text class="age-value">{{ item.value }}%</text>
          </view>
          <view class="progress-track">
            <view class="progress-fill" :style="{ width: item.value + '%' }" />
          </view>
        </view>
      </view>

      <view v-if="audience.region.length" class="card">
        <view class="card-title">
          <app-icon name="map-pin" :size="32" color="#C41E3A" />
          <text class="card-title-text">地域Top5</text>
        </view>
        <view v-for="(item, i) in audience.region.slice(0, 5)" :key="item.name" class="region-row">
          <view class="region-rank" :class="rankClass(i)">{{ i + 1 }}</view>
          <text class="region-name">{{ item.name }}</text>
          <text class="region-value">{{ item.value }}%</text>
        </view>
      </view>

      <view v-if="audience.source.length" class="card">
        <text class="card-title-text card-title-block">来源渠道</text>
        <view class="source-grid">
          <view v-for="item in audience.source" :key="item.label" class="source-item">
            <text class="source-icon">{{ item.icon }}</text>
            <view class="source-info">
              <text class="source-label">{{ item.label }}</text>
              <text class="source-value">{{ item.value }}%</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 互动分析 -->
    <view v-if="activeTab === 'interaction'" class="tab-content">
      <view class="inter-grid">
        <view v-for="item in interStats" :key="item.label" class="inter-card">
          <app-icon :name="item.icon" :size="32" color="#999" />
          <text class="inter-value">{{ item.value.toLocaleString() }}</text>
          <text class="inter-label">{{ item.label }}</text>
        </view>
      </view>

      <view v-if="wordCloud.length" class="card">
        <text class="card-title-text card-title-block">弹幕热词</text>
        <view class="word-cloud">
          <text
            v-for="(item, i) in wordCloud"
            :key="i"
            class="word-item"
            :style="{ fontSize: item.size + 'rpx', color: item.color }"
          >{{ item.word }}</text>
        </view>
      </view>

      <view class="card">
        <view class="card-title">
          <app-icon name="gift" :size="32" color="#f59e0b" />
          <text class="card-title-text">打赏明细</text>
        </view>
        <view v-for="(gift, i) in interaction.gifts" :key="gift.name" class="gift-row">
          <view class="gift-rank">{{ i + 1 }}</view>
          <text class="gift-name">{{ gift.name }}</text>
          <text class="gift-count">{{ gift.count }}个</text>
          <text class="gift-amount">{{ gift.amount }}金币</text>
        </view>
      </view>

      <view class="card">
        <view class="card-title">
          <app-icon name="shopping-bag" :size="32" color="#C41E3A" />
          <text class="card-title-text">商品数据Top3</text>
        </view>
        <view v-for="(p, i) in productStats" :key="p.id" class="prod-card">
          <view class="prod-head">
            <view class="prod-rank" :class="rankClass(i)">{{ i + 1 }}</view>
            <text class="prod-name">{{ p.name }}</text>
          </view>
          <view class="prod-stats">
            <view class="prod-stat">
              <text class="prod-stat-label">点击</text>
              <text class="prod-stat-value">{{ p.clicks || '-' }}</text>
            </view>
            <view class="prod-stat">
              <text class="prod-stat-label">下单</text>
              <text class="prod-stat-value">{{ p.orders }}</text>
            </view>
            <view class="prod-stat">
              <text class="prod-stat-label">成交</text>
              <text class="prod-stat-value prod-stat-primary">¥{{ formatPrice(p.amount) }}</text>
            </view>
            <view class="prod-stat">
              <text class="prod-stat-label">转化率</text>
              <text class="prod-stat-value">{{ p.conversion ? p.conversion + '%' : '-' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 回放管理 -->
    <view v-if="activeTab === 'replay'" class="tab-content">
      <view v-if="replay.playCount > 0 || replay.revenue > 0" class="card">
        <view class="card-title">
          <app-icon name="play" :size="32" color="#C41E3A" />
          <text class="card-title-text">回放数据</text>
        </view>
        <view class="replay-grid">
          <view class="replay-stat">
            <text class="replay-num">{{ replay.playCount.toLocaleString() }}</text>
            <text class="replay-label">播放次数</text>
          </view>
          <view class="replay-stat">
            <text class="replay-num">{{ replay.playDuration }}</text>
            <text class="replay-label">平均时长</text>
          </view>
          <view class="replay-stat">
            <text class="replay-num">¥{{ formatPrice(replay.revenue) }}</text>
            <text class="replay-label">回放收益</text>
          </view>
        </view>
      </view>

      <view class="card">
        <text class="card-title-text card-title-block">回放设置</text>
        <view class="setting-row">
          <view class="setting-text">
            <text class="setting-name">公开回放</text>
            <text class="setting-desc">允许所有用户观看直播回放</text>
          </view>
          <view class="switch" :class="{ 'switch-on': replayPublic }" @tap="replayPublic = !replayPublic">
            <view class="switch-knob" />
          </view>
        </view>
        <view class="setting-row">
          <view class="setting-text">
            <text class="setting-name">付费观看</text>
            <text class="setting-desc">设置回放为付费内容</text>
          </view>
          <view class="switch" :class="{ 'switch-on': replayPaid }" @tap="replayPaid = !replayPaid">
            <view class="switch-knob" />
          </view>
        </view>
        <view v-if="replayPaid" class="paid-tip">
          <text class="paid-tip-text">付费价格将在保存后设置，建议定价区间：9.9-99元</text>
        </view>
      </view>

      <view class="card">
        <text class="card-title-text card-title-block">上架至</text>
        <view class="shelf-btn">
          <view class="shelf-icon shelf-icon-violet">
            <app-icon name="upload" :size="40" color="#8b5cf6" />
          </view>
          <view class="shelf-text">
            <text class="shelf-name">上架为付费课程</text>
            <text class="shelf-desc">将回放转为独立课程销售</text>
          </view>
        </view>
        <view class="shelf-btn">
          <view class="shelf-icon shelf-icon-primary">
            <app-icon name="lock" :size="40" color="#C41E3A" />
          </view>
          <view class="shelf-text">
            <text class="shelf-name">设为圈子专属</text>
            <text class="shelf-desc">仅圈子成员可观看回放</text>
          </view>
        </view>
      </view>

      <view class="card card-flush">
        <view class="replay-preview">
          <app-icon name="play" :size="96" color="rgba(255,255,255,0.5)" />
          <view class="preview-badge">回放</view>
          <text class="preview-duration">{{ liveInfo.duration }}</text>
        </view>
        <view class="preview-info">
          <text class="preview-title">{{ liveInfo.title }}</text>
          <text class="preview-time">{{ liveInfo.startTime }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { liveApi } from '@/lib/live-data'
import { formatPrice } from '@/utils/format'

const loading = ref(true)
const error = ref('')
const analyticsId = ref('1')

// 以下分析数据模板裸访问大量字段，保留 any 避免收敛触发大量报错
const liveInfo = ref<any>({ title: '', startTime: '', duration: '' })
const coreStats = ref<any[]>([])
const trafficData = ref<any[]>([])
const keyMoments = ref<any[]>([])
const audience = ref<any>({ gender: [], age: [], region: [], source: [] })
const interaction = ref<any>({ danmaku: 0, likes: 0, comments: 0, shares: 0, gifts: [] })
const wordCloud = ref<any[]>([])
const productStats = ref<any[]>([])
const replay = ref<any>({ isPublic: false, isPaid: false, playCount: 0, playDuration: '', revenue: 0 })
const insights = ref<string[]>([])

const activeTab = ref('overview')
const replayPublic = ref(false)
const replayPaid = ref(false)

const tabs = [
  { key: 'overview', label: '数据总览' },
  { key: 'traffic', label: '流量分析' },
  { key: 'audience', label: '观众画像' },
  { key: 'interaction', label: '互动分析' },
  { key: 'replay', label: '回放管理' },
]

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await liveApi.getAnalytics(analyticsId.value)
    liveInfo.value = res.info
    coreStats.value = res.coreStats
    trafficData.value = res.trafficData
    keyMoments.value = res.keyMoments
    audience.value = res.audience
    interaction.value = res.interaction
    wordCloud.value = res.wordCloud
    productStats.value = res.productStats
    insights.value = res.insights || []
    replay.value = res.replay
    replayPublic.value = res.replay?.isPublic ?? false
    replayPaid.value = res.replay?.isPaid ?? false
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

const maxTraffic = computed(() => {
  if (trafficData.value.length === 0) return 0
  return Math.max(...trafficData.value.map((d) => d.value))
})

const axisTicks = computed(() => {
  const d = trafficData.value
  if (!d.length) return []
  const idx = [0, Math.floor(d.length / 3), Math.floor((d.length * 2) / 3), d.length - 1]
  return [...new Set(idx)].map((i) => d[i]?.time).filter(Boolean)
})

const interStats = computed(() => [
  { label: '弹幕', value: interaction.value?.danmaku || 0, icon: 'message-circle' },
  { label: '点赞', value: interaction.value?.likes || 0, icon: 'heart' },
  { label: '评论', value: interaction.value?.comments || 0, icon: 'message-circle' },
  { label: '分享', value: interaction.value?.shares || 0, icon: 'share-2' },
])

function trendColor(trend: string) {
  return trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#9ca3af'
}
function trendBg(trend: string) {
  return trend === 'up' ? 'bg-green' : trend === 'down' ? 'bg-red' : 'bg-gray'
}
function rankClass(i: number) {
  return i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : 'rank-default'
}
const insightStyles = [
  { box: 'insight-green', icon: 'star', color: '#22c55e', textClass: 'insight-text-green' },
  { box: 'insight-blue', icon: 'target', color: '#3b82f6', textClass: 'insight-text-blue' },
  { box: 'insight-amber', icon: 'trending-up', color: '#f59e0b', textClass: 'insight-text-amber' },
]
function iStyle(i: number) { return insightStyles[i % insightStyles.length] }
function goBack() {
  uni.navigateBack()
}

onLoad((options) => {
  if (options?.id) analyticsId.value = String(options.id)
  fetchData()
})
</script>

<style scoped>
.analytics-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 80rpx;
}

/* 顶部导航 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background: rgba(250, 248, 245, 0.95);
  border-bottom: 1px solid #ece8e1;
  gap: 16rpx;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
  min-width: 0;
}
.nav-back {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.nav-title-wrap {
  min-width: 0;
  flex: 1;
}
.nav-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.nav-sub {
  font-size: 20rpx;
  color: #999;
  display: block;
  margin-top: 2rpx;
}
.nav-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}
.nav-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 52rpx;
  padding: 0 16rpx;
  border: 1px solid #d8d2c8;
  border-radius: 10rpx;
}
.nav-btn-text {
  font-size: 22rpx;
  color: #1a1a1a;
}

/* Tab */
.tab-scroll {
  background: #faf8f5;
  border-bottom: 1px solid #ece8e1;
  white-space: nowrap;
  position: sticky;
  top: 88rpx;
  z-index: 40;
}
.tab-row {
  display: inline-flex;
  padding: 0 24rpx;
}
.tab-item {
  flex-shrink: 0;
  padding: 20rpx 24rpx;
  font-size: 24rpx;
  color: #999;
  border-bottom: 4rpx solid transparent;
}
.tab-item-active {
  color: var(--brand);
  border-bottom-color: var(--brand);
  font-weight: 500;
}

/* 内容 */
.tab-content {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.card {
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 16rpx;
  padding: 28rpx;
}
.card-flush {
  padding: 0;
  overflow: hidden;
}
.card-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}
.card-title-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.card-title-block {
  display: block;
  margin-bottom: 24rpx;
}
.card-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

/* 直播信息卡 */
.info-card {
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 16rpx;
  padding: 28rpx;
  display: flex;
  gap: 20rpx;
}
.info-cover {
  width: 160rpx;
  height: 108rpx;
  border-radius: 12rpx;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.info-body {
  flex: 1;
  min-width: 0;
}
.info-badges {
  display: flex;
  gap: 8rpx;
}
.badge {
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
}
.badge-gray {
  background: #f0ece5;
  color: #666;
}
.badge-dark {
  background: #6b7280;
  color: #fff;
}
.badge-outline {
  border: 1px solid #d8d2c8;
  color: #666;
}
.info-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1a1a;
  margin-top: 8rpx;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.info-duration {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
}

/* 核心数据 */
.core-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}
.core-card {
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 16rpx;
  padding: 24rpx;
}
.core-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.core-text {
  min-width: 0;
}
.core-label {
  font-size: 22rpx;
  color: #999;
  display: block;
}
.core-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-top: 6rpx;
  display: block;
}
.core-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.bg-green {
  background: rgba(34, 197, 94, 0.1);
}
.bg-red {
  background: rgba(239, 68, 68, 0.1);
}
.bg-gray {
  background: rgba(107, 114, 128, 0.1);
}
.core-trend {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 16rpx;
}
.core-trend-text {
  font-size: 22rpx;
}

/* AI洞察 */
.insight {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}
.insight:last-child {
  margin-bottom: 0;
}
.insight-green {
  background: rgba(34, 197, 94, 0.05);
  border: 1px solid rgba(34, 197, 94, 0.2);
}
.insight-blue {
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
}
.insight-amber {
  background: rgba(245, 158, 11, 0.05);
  border: 1px solid rgba(245, 158, 11, 0.2);
}
.insight-text {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.5;
}
.insight-text-green {
  color: #15803d;
}
.insight-text-blue {
  color: #1d4ed8;
}
.insight-text-amber {
  color: #b45309;
}

/* 趋势图 */
.chart {
  height: 320rpx;
  display: flex;
  align-items: flex-end;
  gap: 10rpx;
}
.chart-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  height: 100%;
  justify-content: flex-end;
}
.chart-bar {
  width: 100%;
  border-radius: 6rpx 6rpx 0 0;
  background: rgba(196, 30, 58, 0.4);
}
.chart-bar-peak {
  background: var(--brand);
}
.chart-label {
  font-size: 16rpx;
  color: #999;
}
.chart-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 24rpx;
}
.axis-text {
  font-size: 22rpx;
  color: #999;
}

/* 关键时刻 */
.moment-row {
  display: flex;
  gap: 16rpx;
}
.moment-dot-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.moment-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: var(--brand);
  margin-top: 6rpx;
}
.moment-line {
  width: 2rpx;
  flex: 1;
  background: #ece8e1;
}
.moment-body {
  flex: 1;
  padding-bottom: 24rpx;
}
.moment-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.moment-time {
  font-size: 22rpx;
  font-weight: 500;
  color: #1a1a1a;
}
.moment-desc {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
  line-height: 1.5;
}

/* 性别 */
.gender-row {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.gender-ring {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: conic-gradient(#3b82f6 0% 42%, #ec4899 42% 97%, #9ca3af 97% 100%);
  padding: 10rpx;
  flex-shrink: 0;
}
.gender-ring-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gender-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.gender-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.gender-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}
.gender-label {
  flex: 1;
  font-size: 22rpx;
  color: #1a1a1a;
}
.gender-value {
  font-size: 22rpx;
  font-weight: 500;
  color: #1a1a1a;
}

/* 年龄进度 */
.age-row {
  margin-bottom: 24rpx;
}
.age-row:last-child {
  margin-bottom: 0;
}
.age-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.age-label {
  font-size: 22rpx;
  color: #1a1a1a;
}
.age-value {
  font-size: 22rpx;
  font-weight: 500;
  color: #1a1a1a;
}
.progress-track {
  height: 12rpx;
  border-radius: 6rpx;
  background: #f0ece5;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--brand);
  border-radius: 6rpx;
}

/* 地域 */
.region-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.region-row:last-child {
  margin-bottom: 0;
}
.region-rank {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 700;
  flex-shrink: 0;
}
.rank-gold {
  background: #f59e0b;
  color: #fff;
}
.rank-silver {
  background: #9ca3af;
  color: #fff;
}
.rank-bronze {
  background: #b45309;
  color: #fff;
}
.rank-default {
  background: #f0ece5;
  color: #999;
}
.region-name {
  flex: 1;
  font-size: 26rpx;
  color: #1a1a1a;
}
.region-value {
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1a1a;
}

/* 来源渠道 */
.source-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
}
.source-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx;
  background: #f7f4ef;
  border-radius: 12rpx;
}
.source-icon {
  font-size: 32rpx;
}
.source-info {
  flex: 1;
  min-width: 0;
}
.source-label {
  font-size: 22rpx;
  color: #1a1a1a;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.source-value {
  font-size: 26rpx;
  font-weight: 700;
  color: #1a1a1a;
  display: block;
}

/* 互动概览 */
.inter-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}
.inter-card {
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 16rpx;
  padding: 20rpx 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.inter-value {
  font-size: 26rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-top: 8rpx;
}
.inter-label {
  font-size: 20rpx;
  color: #999;
}

/* 词云 */
.word-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  justify-content: center;
  padding: 24rpx 0;
}
.word-item {
  font-weight: 500;
}

/* 打赏 */
.gift-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx;
  background: #f7f4ef;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}
.gift-row:last-child {
  margin-bottom: 0;
}
.gift-rank {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24, #f97316);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: #fff;
  flex-shrink: 0;
}
.gift-name {
  flex: 1;
  font-size: 26rpx;
  color: #1a1a1a;
}
.gift-count {
  font-size: 22rpx;
  color: #999;
}
.gift-amount {
  font-size: 26rpx;
  font-weight: 700;
  color: #f59e0b;
}

/* 商品 */
.prod-card {
  border: 1px solid #ece8e1;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}
.prod-card:last-child {
  margin-bottom: 0;
}
.prod-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.prod-rank {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.prod-name {
  flex: 1;
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prod-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}
.prod-stat {
  text-align: center;
}
.prod-stat-label {
  font-size: 20rpx;
  color: #999;
  display: block;
}
.prod-stat-value {
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1a1a;
  display: block;
  margin-top: 4rpx;
}
.prod-stat-primary {
  color: var(--brand);
}

/* 回放数据 */
.replay-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}
.replay-stat {
  padding: 24rpx 8rpx;
  background: #f7f4ef;
  border-radius: 12rpx;
  text-align: center;
}
.replay-num {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
  display: block;
}
.replay-label {
  font-size: 20rpx;
  color: #999;
  display: block;
  margin-top: 6rpx;
}

/* 回放设置 */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.setting-row:last-child {
  margin-bottom: 0;
}
.setting-text {
  flex: 1;
}
.setting-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1a1a;
  display: block;
}
.setting-desc {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
}
.switch {
  width: 80rpx;
  height: 44rpx;
  border-radius: 22rpx;
  background: #d8d2c8;
  padding: 4rpx;
  flex-shrink: 0;
  transition: background 0.2s;
}
.switch-on {
  background: var(--brand);
}
.switch-knob {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}
.switch-on .switch-knob {
  transform: translateX(36rpx);
}
.paid-tip {
  margin-top: 24rpx;
  padding: 20rpx;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 12rpx;
}
.paid-tip-text {
  font-size: 22rpx;
  color: #b45309;
  line-height: 1.5;
}

/* 上架 */
.shelf-btn {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  border: 1px solid #e5e0d8;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}
.shelf-btn:last-child {
  margin-bottom: 0;
}
.shelf-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.shelf-icon-violet {
  background: rgba(139, 92, 246, 0.1);
}
.shelf-icon-primary {
  background: rgba(196, 30, 58, 0.1);
}
.shelf-text {
  flex: 1;
}
.shelf-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1a1a;
  display: block;
}
.shelf-desc {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
}

/* 回放预览 */
.replay-preview {
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, #1f2937, #111827);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.preview-badge {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  background: var(--brand);
  color: #fff;
  font-size: 20rpx;
}
.preview-duration {
  position: absolute;
  bottom: 16rpx;
  right: 16rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}
.preview-info {
  padding: 20rpx;
}
.preview-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1a1a;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-time {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
  display: block;
}

/* 三态 */
.state-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #faf8f5;
  gap: 24rpx;
}
.state-spinner {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  border: 6rpx solid #ece8e1;
  border-top-color: var(--brand);
  animation: state-spin 0.8s linear infinite;
}
@keyframes state-spin {
  to { transform: rotate(360deg); }
}
.state-text {
  font-size: 26rpx;
  color: #999;
}
.state-retry {
  padding: 16rpx 56rpx;
  background: var(--brand);
  color: #fff;
  border-radius: 24rpx;
  font-size: 26rpx;
}
.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 80rpx 0;
}
.empty-hint-text {
  font-size: 24rpx;
  color: #999;
}
</style>
