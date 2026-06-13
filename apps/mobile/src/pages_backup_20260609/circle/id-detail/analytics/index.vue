<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-header">
      <view class="nav-left" @click="goBack">
        <text class="nav-back-icon">←</text>
        <text class="nav-title">圈子数据</text>
      </view>
      <!-- 日期选择 -->
      <view class="date-picker" @click="toggleDatePicker">
        <text class="date-label">{{ selectedRangeLabel }}</text>
        <text class="date-arrow">▼</text>
      </view>
    </view>
    <!-- 日期下拉菜单 -->
    <view v-if="showDatePicker" class="date-dropdown-mask" @click="showDatePicker = false" />
    <view v-if="showDatePicker" class="date-dropdown">
      <view
        v-for="range in dateRanges"
        :key="range.id"
        class="date-dropdown-item"
        :class="{ active: dateRange === range.id }"
        @click="selectDateRange(range.id)"
      >
        {{ range.label }}
      </view>
    </view>

    <scroll-view scroll-y class="content" :style="{ height: 'calc(100vh - 56px)' }">
      <!-- 核心数据卡片 -->
      <view class="metrics-grid">
        <view class="metric-card" v-for="metric in coreMetrics" :key="metric.label">
          <view class="metric-icon-wrap" :style="{ backgroundColor: metric.bgColor }">
            <text class="metric-icon">{{ metric.icon }}</text>
          </view>
          <text class="metric-label">{{ metric.label }}</text>
          <text class="metric-value">{{ metric.displayValue }}</text>
          <view class="metric-trend" :class="metric.trend === 'up' ? 'trend-up' : 'trend-down'">
            <text>{{ metric.trend === 'up' ? '↑' : '↓' }} {{ Math.abs(metric.change) }}%</text>
          </view>
        </view>
      </view>

      <!-- 成员增长趋势 -->
      <view class="section-card">
        <text class="section-title">成员增长趋势</text>
        <view class="bar-chart">
          <view v-for="item in memberGrowthData" :key="item.day" class="bar-col">
            <text class="bar-value-text">{{ item.value }}</text>
            <view class="bar" :style="{ height: (item.value / maxGrowth) * 100 + '%' }" />
            <text class="bar-label-text">{{ item.day }}</text>
          </view>
        </view>
      </view>

      <!-- 内容互动概览 -->
      <view class="section-card">
        <text class="section-title">内容互动概览</text>
        <view class="stats-row">
          <view class="stat-item" v-for="(stat, key) in contentStats" :key="key">
            <text class="stat-value">{{ stat.displayValue }}</text>
            <text class="stat-desc">{{ stat.label }}</text>
          </view>
        </view>
      </view>

      <!-- 收入来源 -->
      <view class="section-card">
        <text class="section-title">收入来源分布</text>
        <view class="pie-row">
          <view class="pie-chart-simple">
            <view class="pie-outer">
              <view class="pie-inner">
                <text class="pie-center-text">收入</text>
              </view>
            </view>
          </view>
          <view class="pie-legend">
            <view v-for="(item, i) in revenueSourceData" :key="i" class="legend-item">
              <view class="legend-dot" :style="{ backgroundColor: item.dotColor }" />
              <text class="legend-name">{{ item.name }}</text>
              <text class="legend-amount">¥{{ item.displayValue }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 热门内容Top5 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">热门内容 Top5</text>
          <text class="section-more" @click="goPage('/pages/circle/id-detail/analytics/contents/index')">查看全部</text>
        </view>
        <view v-for="(item, index) in hotContents" :key="item.id" class="hot-item">
          <view class="hot-rank" :class="index < 3 ? 'rank-top' : 'rank-normal'">
            <text>{{ index + 1 }}</text>
          </view>
          <view class="hot-info">
            <text class="hot-title">{{ item.title }}</text>
            <view class="hot-meta">
              <text class="hot-type-tag">{{ item.type === 'article' ? '文章' : '帖子' }}</text>
              <text class="hot-stat">❤️ {{ item.likes }}</text>
              <text class="hot-stat">💬 {{ item.comments }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 活跃成员榜 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">活跃成员榜</text>
          <text class="section-more" @click="goPage('/pages/circle/id-detail/members/index')">查看全部</text>
        </view>
        <view v-for="(member, index) in activeMembers" :key="member.id" class="member-item">
          <view class="member-rank" :class="index < 3 ? 'rank-top' : 'rank-normal'">
            <text>{{ index === 0 ? '👑' : index + 1 }}</text>
          </view>
          <view class="member-avatar">{{ member.name[0] }}</view>
          <view class="member-info">
            <text class="member-name">{{ member.name }}</text>
            <text class="member-detail">发帖 {{ member.posts }} · 互动 {{ member.interactions }}</text>
          </view>
          <view class="member-contribution">
            <text class="contribution-value">{{ member.contribution }}</text>
            <text class="contribution-label">贡献值</text>
          </view>
        </view>
      </view>

      <view style="height: 32rpx;" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

// 日期范围
const dateRanges = [
  { id: 'today', label: '今日' },
  { id: '7days', label: '近7天' },
  { id: '30days', label: '近30天' },
  { id: 'custom', label: '自定义' },
]
const dateRange = ref('7days')
const showDatePicker = ref(false)
const selectedRangeLabel = computed(() => dateRanges.find(r => r.id === dateRange.value)?.label || '近7天')

function toggleDatePicker() { showDatePicker.value = !showDatePicker.value }
function selectDateRange(id: string) { dateRange.value = id; showDatePicker.value = false }

// 核心指标
const coreMetrics = [
  { label: '总成员数', value: 1280, change: 12.5, trend: 'up', icon: '👥', bgColor: 'rgba(196,30,58,0.1)' },
  { label: '新增成员', value: 86, change: 23.1, trend: 'up', icon: '➕', bgColor: 'rgba(201,169,110,0.1)' },
  { label: '活跃成员', value: 428, change: -5.2, trend: 'down', icon: '📊', bgColor: 'rgba(59,130,246,0.1)' },
  { label: '本月收入', value: 12680, change: 18.6, trend: 'up', icon: '💰', bgColor: 'rgba(34,197,94,0.1)' },
].map(m => ({ ...m, displayValue: m.value.toLocaleString() }))

const memberGrowthData = [
  { day: '周一', value: 12 }, { day: '周二', value: 8 }, { day: '周三', value: 15 },
  { day: '周四', value: 10 }, { day: '周五', value: 18 }, { day: '周六', value: 14 }, { day: '周日', value: 9 },
]
const maxGrowth = computed(() => Math.max(...memberGrowthData.map(d => d.value)))

const contentStats = {
  posts: { label: '帖子发布', value: 156, displayValue: '156' },
  comments: { label: '评论数', value: 892, displayValue: '892' },
  likes: { label: '点赞数', value: 2340, displayValue: '2,340' },
}

const hotContents = [
  { id: 1, title: '八字入门：如何看懂自己的命盘', type: 'article', views: 1280, likes: 356, comments: 89 },
  { id: 2, title: '今日分享：食神制杀格局详解', type: 'post', views: 986, likes: 234, comments: 67 },
  { id: 3, title: '紫微斗数与八字的区别与联系', type: 'article', views: 876, likes: 198, comments: 54 },
  { id: 4, title: '风水小知识：办公桌摆放禁忌', type: 'post', views: 765, likes: 167, comments: 42 },
  { id: 5, title: '学员案例分析：日主身弱如何补救', type: 'article', views: 654, likes: 145, comments: 38 },
]

const activeMembers = [
  { id: 1, name: '易学小白', posts: 28, interactions: 156, contribution: 184 },
  { id: 2, name: '命理爱好者', posts: 22, interactions: 134, contribution: 156 },
  { id: 3, name: '风水研究员', posts: 18, interactions: 128, contribution: 146 },
  { id: 4, name: '紫微新手', posts: 15, interactions: 112, contribution: 127 },
  { id: 5, name: '八字学徒', posts: 12, interactions: 98, contribution: 110 },
]

const revenueSourceData = [
  { name: '入圈费', value: 4860, percent: 38, dotColor: '#C41E3A' },
  { name: '课程销售', value: 3580, percent: 28, dotColor: '#C9A96E' },
  { name: '商品分佣', value: 2120, percent: 17, dotColor: '#3b82f6' },
  { name: '直播打赏', value: 1280, percent: 10, dotColor: '#a855f7' },
  { name: '付费问答', value: 840, percent: 7, dotColor: '#22c55e' },
].map(s => ({ ...s, displayValue: s.value.toLocaleString() }))

// 导航辅助
function goBack() { uni.navigateBack() }
function goPage(url: string) { uni.navigateTo({ url }) }

onPullDownRefresh(() => { setTimeout(() => uni.stopPullDownRefresh(), 500) })
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; }
.nav-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24rpx; height: 56px; background: rgba(250,248,245,0.95);
  backdrop-filter: blur(10px); border-bottom: 1px solid #E8E0D5;
  position: sticky; top: 0; z-index: 40;
}
.nav-left { display: flex; align-items: center; gap: 12rpx; }
.nav-back-icon { font-size: 36rpx; color: #2C2C2C; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.date-picker { display: flex; align-items: center; gap: 4rpx; padding: 8rpx 16rpx; background: #F5F1EB; border-radius: 16rpx; }
.date-label { font-size: 24rpx; color: #2C2C2C; }
.date-arrow { font-size: 20rpx; color: #999; }
.date-dropdown-mask { position: fixed; inset: 0; z-index: 40; }
.date-dropdown {
  position: absolute; top: 56px; right: 24rpx; z-index: 50;
  background: #FFFFFF; border-radius: 16rpx; box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.1);
  overflow: hidden; width: 200rpx;
}
.date-dropdown-item { padding: 16rpx 24rpx; font-size: 26rpx; color: #2C2C2C; }
.date-dropdown-item.active { background: rgba(196,30,58,0.08); color: #C41E3A; }

.content { padding: 0; }

.metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; padding: 24rpx; }
.metric-card {
  background: #FFFFFF; border-radius: 20rpx; padding: 28rpx;
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.04);
}
.metric-icon-wrap { width: 56rpx; height: 56rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 12rpx; }
.metric-icon { font-size: 28rpx; }
.metric-label { font-size: 22rpx; color: #999; }
.metric-value { font-size: 40rpx; font-weight: 700; color: #2C2C2C; margin-top: 4rpx; display: block; }
.metric-trend { font-size: 20rpx; margin-top: 4rpx; }
.trend-up { color: #22c55e; }
.trend-down { color: #ef4444; }

.section-card { background: #FFFFFF; border-radius: 20rpx; padding: 28rpx; margin: 0 24rpx 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 24rpx; display: block; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.section-header .section-title { margin-bottom: 0; }
.section-more { font-size: 24rpx; color: #C41E3A; }

.bar-chart { display: flex; align-items: flex-end; gap: 16rpx; height: 220rpx; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx; height: 100%; justify-content: flex-end; }
.bar-value-text { font-size: 18rpx; color: #999; }
.bar { width: 100%; background: #C41E3A; border-radius: 8rpx 8rpx 0 0; min-height: 8rpx; opacity: 0.85; }
.bar-label-text { font-size: 18rpx; color: #999; margin-top: 8rpx; }

.stats-row { display: flex; justify-content: space-around; }
.stat-item { text-align: center; }
.stat-value { font-size: 36rpx; font-weight: 700; color: #2C2C2C; display: block; }
.stat-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; }

.pie-row { display: flex; align-items: center; gap: 40rpx; }
.pie-chart-simple { width: 140rpx; height: 140rpx; flex-shrink: 0; }
.pie-outer {
  width: 100%; height: 100%; border-radius: 50%;
  background: conic-gradient(#C41E3A 0% 38%, #C9A96E 38% 66%, #3b82f6 66% 83%, #a855f7 83% 93%, #22c55e 93% 100%);
}
.pie-inner {
  position: absolute; top: 15%; left: 15%; width: 70%; height: 70%; border-radius: 50%; background: #FFFFFF;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.pie-center-text { font-size: 20rpx; color: #999; }
.pie-legend { flex: 1; }
.legend-item { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.legend-dot { width: 16rpx; height: 16rpx; border-radius: 50%; }
.legend-name { font-size: 22rpx; color: #999; flex: 1; }
.legend-amount { font-size: 22rpx; color: #2C2C2C; font-weight: 500; }

.hot-item { display: flex; align-items: flex-start; gap: 16rpx; margin-bottom: 20rpx; }
.hot-rank { width: 44rpx; height: 44rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; flex-shrink: 0; }
.rank-top { background: #C9A96E; color: #FFFFFF; }
.rank-normal { background: #F5F1EB; color: #999; }
.hot-info { flex: 1; min-width: 0; }
.hot-title { font-size: 26rpx; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.hot-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 6rpx; }
.hot-type-tag { font-size: 18rpx; padding: 2rpx 8rpx; border: 1px solid #E8E0D5; border-radius: 6rpx; color: #999; }
.hot-stat { font-size: 20rpx; color: #999; }

.member-item { display: flex; align-items: center; gap: 16rpx; margin-bottom: 20rpx; }
.member-rank { width: 44rpx; height: 44rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; flex-shrink: 0; }
.member-avatar { width: 60rpx; height: 60rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #2C2C2C; flex-shrink: 0; }
.member-info { flex: 1; min-width: 0; }
.member-name { font-size: 26rpx; color: #2C2C2C; display: block; }
.member-detail { font-size: 22rpx; color: #999; margin-top: 2rpx; }
.member-contribution { text-align: right; flex-shrink: 0; }
.contribution-value { font-size: 28rpx; font-weight: 600; color: #C9A96E; display: block; }
.contribution-label { font-size: 18rpx; color: #999; }
</style>
