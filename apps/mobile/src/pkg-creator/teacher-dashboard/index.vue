<template>
  <view class="td-page">
    <!-- 头部 -->
    <view class="td-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="td-header-bar">
        <view class="td-left">
          <view class="td-icon-btn" @tap="back">
            <AppIcon name="chevron-left" :size="22" color="#fff" />
          </view>
          <text class="td-title">讲师工作台</text>
        </view>
        <view class="td-right">
          <view class="td-icon-btn td-bell" @tap="go('/notifications')">
            <AppIcon name="bell" :size="20" color="#fff" />
            <view class="td-dot" />
          </view>
          <view class="td-icon-btn" @tap="go('/teacher/settings')">
            <AppIcon name="settings" :size="20" color="#fff" />
          </view>
        </view>
      </view>

      <!-- 身份卡 -->
      <view class="td-identity">
        <view class="td-avatar">
          <AppIcon name="award" :size="32" color="#fff" />
        </view>
        <view class="td-id-info">
          <view class="td-id-name-row">
            <text class="td-id-name">李明德</text>
            <text class="td-id-badge">金牌讲师</text>
          </view>
          <text class="td-id-sub">命理咨询师 · 从业20年</text>
          <view class="td-id-rating">
            <AppIcon name="star" :size="14" color="#f0b400" />
            <text class="td-id-score">{{ stats.rating }}</text>
            <text class="td-id-count">({{ stats.ratingCount }}评价)</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="td-body">
      <view class="td-grid">
        <view v-for="i in 4" :key="i" class="td-skeleton td-skeleton-card" />
      </view>
      <view class="td-skeleton td-skeleton-block" />
      <view class="td-skeleton td-skeleton-block-lg" />
    </view>

    <view v-else class="td-body">
      <!-- 数据概览 -->
      <view class="td-grid">
        <view class="td-stat">
          <view class="td-stat-label">
            <AppIcon name="users" :size="16" color="#999" />
            <text class="td-stat-label-text">累计学员</text>
          </view>
          <text class="td-stat-num">{{ formatNum(stats.studentCount) }}</text>
          <text class="td-stat-extra td-green">+128 本月新增</text>
        </view>
        <view class="td-stat">
          <view class="td-stat-label">
            <AppIcon name="book-open" :size="16" color="#999" />
            <text class="td-stat-label-text">课程数量</text>
          </view>
          <text class="td-stat-num">{{ stats.courseCount }}</text>
          <text class="td-stat-extra">3 门草稿中</text>
        </view>
        <view class="td-stat">
          <view class="td-stat-label">
            <AppIcon name="wallet" :size="16" color="#999" />
            <text class="td-stat-label-text">累计收入</text>
          </view>
          <text class="td-stat-num td-brand">¥{{ (stats.totalIncome / 10000).toFixed(1) }}万</text>
          <text class="td-stat-extra">可提现 ¥8,650</text>
        </view>
        <view class="td-stat">
          <view class="td-stat-label">
            <AppIcon name="trending-up" :size="16" color="#999" />
            <text class="td-stat-label-text">本月收入</text>
          </view>
          <text class="td-stat-num">¥{{ formatNum(stats.monthIncome) }}</text>
          <text class="td-stat-extra td-green">+12.5% 环比</text>
        </view>
      </view>

      <!-- 待处理事项 -->
      <view class="td-card">
        <view class="td-card-head">
          <text class="td-card-title">待处理事项</text>
          <text class="td-card-sub">共 {{ pendingTotal }} 项</text>
        </view>
        <view class="td-list">
          <view
            v-for="item in pendingItems"
            :key="item.id"
            class="td-list-item"
            @tap="go(pendingPath(item.type))"
          >
            <view class="td-list-icon">
              <AppIcon :name="pendingIcon(item.type)" :size="20" :color="pendingColor(item.type)" />
            </view>
            <view class="td-list-main">
              <text class="td-list-title">{{ item.title }}</text>
              <text class="td-list-time">{{ item.time }}</text>
            </view>
            <view class="td-list-right">
              <text class="td-count-badge">{{ item.count }}</text>
              <AppIcon name="chevron-right" :size="16" color="#bbb" />
            </view>
          </view>
        </view>
      </view>

      <!-- 收入趋势 -->
      <view class="td-card td-card-pad">
        <view class="td-card-head td-no-border">
          <text class="td-card-title">收入趋势</text>
          <view class="td-link" @tap="go('/teacher/income')">
            <text class="td-link-text">查看详情</text>
            <AppIcon name="chevron-right" :size="12" color="#c41e3a" />
          </view>
        </view>
        <view class="td-chart">
          <view
            v-for="(item, index) in incomeTrend"
            :key="item.month"
            class="td-bar-col"
          >
            <view
              class="td-bar"
              :class="{ 'td-bar-active': index === incomeTrend.length - 1 }"
              :style="{ height: barHeight(item.income) }"
            />
            <text class="td-bar-label">{{ item.month }}</text>
          </view>
        </view>
      </view>

      <!-- 我的课程 -->
      <view class="td-card">
        <view class="td-card-head">
          <text class="td-card-title">我的课程</text>
          <view class="td-link" @tap="go('/teacher/courses')">
            <text class="td-link-text">全部课程</text>
            <AppIcon name="chevron-right" :size="12" color="#c41e3a" />
          </view>
        </view>
        <view class="td-list">
          <view
            v-for="course in courses"
            :key="course.id"
            class="td-list-item"
            @tap="go('/teacher/courses/' + course.id)"
          >
            <view class="td-course-cover">
              <AppIcon name="video" :size="24" color="#c41e3a" />
            </view>
            <view class="td-list-main">
              <view class="td-course-title-row">
                <text class="td-list-title">{{ course.title }}</text>
                <text v-if="course.status === 'draft'" class="td-draft-tag">草稿</text>
              </view>
              <view class="td-course-meta">
                <view class="td-meta-item">
                  <AppIcon name="users" :size="12" color="#999" />
                  <text class="td-meta-text">{{ course.students }}</text>
                </view>
                <view class="td-meta-item">
                  <AppIcon name="star" :size="12" color="#f0b400" />
                  <text class="td-meta-text">{{ course.rating }}</text>
                </view>
              </view>
            </view>
            <AppIcon name="chevron-right" :size="16" color="#bbb" />
          </view>
        </view>
      </view>

      <!-- 快捷操作 -->
      <view class="td-card td-card-pad">
        <text class="td-card-title td-block-title">快捷操作</text>
        <view class="td-quick-grid">
          <view
            v-for="action in quickActions"
            :key="action.label"
            class="td-quick-item"
            @tap="go(action.path)"
          >
            <view class="td-quick-icon">
              <AppIcon :name="action.icon" :size="20" color="#c41e3a" />
            </view>
            <text class="td-quick-label">{{ action.label }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, goBack } from '@/utils/router'

const statusBarHeight = ref(0)
const loading = ref(true)

const stats = ref({
  rating: 4.9,
  ratingCount: 328,
  studentCount: 3256,
  courseCount: 12,
  totalIncome: 128650,
  monthIncome: 15680,
})

const pendingItems = ref([
  { id: 1, type: 'homework', title: '八字命理入门-第3章作业', count: 8, time: '最近提交: 10分钟前' },
  { id: 2, type: 'question', title: '学员提问待回答', count: 5, time: '最近提问: 30分钟前' },
  { id: 3, type: 'booking', title: '预约咨询待确认', count: 2, time: '最近预约: 1小时前' },
  { id: 4, type: 'review', title: '课程评价待回复', count: 3, time: '最近评价: 2小时前' },
])

const courses = ref([
  { id: 1, title: '八字命理入门实战班', students: 1256, rating: 4.9, status: 'active' },
  { id: 2, title: '紫微斗数进阶课程', students: 890, rating: 4.8, status: 'active' },
  { id: 3, title: '风水堪舆基础', students: 567, rating: 4.7, status: 'draft' },
])

const incomeTrend = ref([
  { month: '1月', income: 12500 },
  { month: '2月', income: 15200 },
  { month: '3月', income: 11800 },
  { month: '4月', income: 18600 },
  { month: '5月', income: 16400 },
  { month: '6月', income: 15680 },
])

const quickActions = [
  { icon: 'edit', label: '发布课程', path: '/teacher/courses/create' },
  { icon: 'video', label: '开始直播', path: '/live/create' },
  { icon: 'file-text', label: '发布文章', path: '/teacher/articles/create' },
  { icon: 'calendar', label: '预约管理', path: '/teacher/bookings' },
]

const pendingTotal = computed(() => pendingItems.value.reduce((s, i) => s + i.count, 0))
const maxIncome = computed(() => Math.max(...incomeTrend.value.map((d) => d.income)))

function barHeight(income: number) {
  return Math.max((income / maxIncome.value) * 100, 8) + '%'
}

function formatNum(n: number) {
  return n.toLocaleString('en-US')
}

function pendingIcon(type: string) {
  const map: Record<string, string> = {
    homework: 'file-text',
    question: 'message-square',
    booking: 'calendar',
    review: 'star',
  }
  return map[type] || 'bell'
}

function pendingColor(type: string) {
  const map: Record<string, string> = {
    homework: '#2563eb',
    question: '#16a34a',
    booking: '#7c3aed',
    review: '#ea580c',
  }
  return map[type] || '#666'
}

function pendingPath(type: string) {
  const map: Record<string, string> = {
    homework: '/teacher/homework',
    question: '/teacher/questions',
    booking: '/teacher/bookings',
    review: '/teacher/reviews',
  }
  return map[type] || '/teacher/dashboard'
}

function go(path: string) {
  navigateTo(path)
}

function back() {
  goBack()
}

onLoad(() => {
  try {
    const info = uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
  } catch (e) {
    statusBarHeight.value = 0
  }
  setTimeout(() => {
    loading.value = false
  }, 500)
})
</script>

<style scoped>
.td-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 40rpx;
}

/* 头部 */
.td-header {
  background: #c41e3a;
  color: #fff;
  padding-bottom: 48rpx;
}
.td-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
}
.td-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.td-icon-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.td-icon-btn:active {
  background: rgba(255, 255, 255, 0.15);
}
.td-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
}
.td-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.td-dot {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 14rpx;
  height: 14rpx;
  background: #ff3b30;
  border-radius: 50%;
}

/* 身份卡 */
.td-identity {
  display: flex;
  align-items: center;
  gap: 28rpx;
  padding: 0 32rpx;
}
.td-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.td-id-info {
  flex: 1;
}
.td-id-name-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.td-id-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #fff;
}
.td-id-badge {
  font-size: 20rpx;
  padding: 2rpx 14rpx;
  background: rgba(240, 180, 0, 0.25);
  color: #ffe08a;
  border-radius: 20rpx;
}
.td-id-sub {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 8rpx;
}
.td-id-rating {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 8rpx;
}
.td-id-score {
  font-size: 24rpx;
  font-weight: 500;
  color: #fff;
}
.td-id-count {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
}

/* body */
.td-body {
  padding: 0 24rpx;
  margin-top: -24rpx;
}

/* 数据概览 */
.td-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.td-stat {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.td-stat-label {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 14rpx;
}
.td-stat-label-text {
  font-size: 24rpx;
  color: #999;
}
.td-stat-num {
  font-size: 44rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.td-stat-num.td-brand {
  color: #c41e3a;
}
.td-stat-extra {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}
.td-stat-extra.td-green {
  color: #16a34a;
}

/* 卡片 */
.td-card {
  background: #fff;
  border-radius: 20rpx;
  margin-top: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
.td-card-pad {
  padding: 28rpx;
}
.td-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  border-bottom: 2rpx solid #f0f0f0;
}
.td-card-pad .td-card-head {
  padding: 0 0 24rpx;
}
.td-no-border {
  border-bottom: none;
}
.td-card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.td-block-title {
  display: block;
  margin-bottom: 24rpx;
}
.td-card-sub {
  font-size: 22rpx;
  color: #999;
}
.td-link {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.td-link-text {
  font-size: 24rpx;
  color: #c41e3a;
}

/* 列表 */
.td-list-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 28rpx;
  border-bottom: 2rpx solid #f5f5f5;
}
.td-list-item:last-child {
  border-bottom: none;
}
.td-list-item:active {
  background: #fafafa;
}
.td-list-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.td-list-main {
  flex: 1;
  min-width: 0;
}
.td-list-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.td-list-time {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}
.td-list-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.td-count-badge {
  font-size: 22rpx;
  font-weight: 500;
  padding: 4rpx 16rpx;
  background: rgba(196, 30, 58, 0.1);
  color: #c41e3a;
  border-radius: 20rpx;
}

/* 收入图表 */
.td-chart {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  height: 240rpx;
}
.td-bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  height: 100%;
  justify-content: flex-end;
}
.td-bar {
  width: 100%;
  border-radius: 8rpx 8rpx 0 0;
  background: rgba(196, 30, 58, 0.3);
}
.td-bar-active {
  background: #c41e3a;
}
.td-bar-label {
  font-size: 22rpx;
  color: #999;
}

/* 课程 */
.td-course-cover {
  width: 88rpx;
  height: 88rpx;
  border-radius: 16rpx;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.td-course-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.td-draft-tag {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  background: #fff0e6;
  color: #ea580c;
  border-radius: 8rpx;
  flex-shrink: 0;
}
.td-course-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 8rpx;
}
.td-meta-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.td-meta-text {
  font-size: 22rpx;
  color: #999;
}

/* 快捷操作 */
.td-quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}
.td-quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  padding: 16rpx 0;
}
.td-quick-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.td-quick-label {
  font-size: 24rpx;
  color: #2c2c2c;
}

/* 骨架 */
.td-skeleton {
  background: #ececec;
  border-radius: 16rpx;
  animation: td-pulse 1.5s ease-in-out infinite;
}
.td-skeleton-card {
  height: 180rpx;
}
.td-skeleton-block {
  height: 320rpx;
  margin-top: 24rpx;
}
.td-skeleton-block-lg {
  height: 420rpx;
  margin-top: 24rpx;
}
@keyframes td-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
