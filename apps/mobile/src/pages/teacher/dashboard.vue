<template>
  <view class="page">
    <!-- 头部 -->
    <view
      class="header"
      style="background:#C41E3A"
    >
      <view class="header-top">
        <view class="header-left">
          <text
            class="back-btn"
            @click="uni.navigateBack"
          >
            ‹
          </text>
          <text class="header-title">
            讲师工作台
          </text>
        </view>
        <view class="header-actions">
          <text
            class="header-icon"
            @click="goNotifications"
          >
            🔔
          </text>
          <text
            class="header-icon"
            @click="goSettings"
          >
            ⚙️
          </text>
        </view>
      </view>
      <!-- 讲师身份卡片 -->
      <view class="teacher-card">
        <view class="teacher-avatar">
          <text class="teacher-avatar-icon">
            🏆
          </text>
        </view>
        <view class="teacher-info">
          <view class="teacher-name-row">
            <text class="teacher-name">
              {{ teacherName }}
            </text>
            <text class="teacher-level">
              金牌讲师
            </text>
          </view>
          <text class="teacher-title">
            命理咨询师 · 从业20年
          </text>
          <view class="teacher-rating">
            <text class="rating-star">
              ⭐
            </text>
            <text class="rating-val">
              {{ stats.rating }}
            </text>
            <text class="rating-count">
              ({{ stats.ratingCount }}评价)
            </text>
          </view>
        </view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
    >
      <!-- 数据概览 -->
      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-icon">
            👥
          </text>
          <text class="stat-val">
            {{ formatCount(stats.studentCount) }}
          </text>
          <text class="stat-label">
            累计学员
          </text>
          <text class="stat-change">
            +128 本月新增
          </text>
        </view>
        <view class="stat-card">
          <text class="stat-icon">
            📚
          </text>
          <text class="stat-val">
            {{ stats.courseCount }}
          </text>
          <text class="stat-label">
            课程数量
          </text>
          <text class="stat-sub">
            3 门草稿中
          </text>
        </view>
        <view class="stat-card">
          <text class="stat-icon">
            💰
          </text>
          <text
            class="stat-val"
            style="color:#C41E3A"
          >
            ¥{{ formatWan(stats.totalIncome) }}
          </text>
          <text class="stat-label">
            累计收入
          </text>
          <text class="stat-sub">
            可提现 ¥{{ formatMoney(stats.withdrawable) }}
          </text>
        </view>
        <view class="stat-card">
          <text class="stat-icon">
            📈
          </text>
          <text class="stat-val">
            ¥{{ formatMoney(stats.monthIncome) }}
          </text>
          <text class="stat-label">
            本月收入
          </text>
          <text class="stat-change up">
            +12.5% 环比
          </text>
        </view>
      </view>

      <!-- 待处理事项 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">
            待处理事项
          </text>
          <text class="section-count">
            共 {{ pendingTotal }} 项
          </text>
        </view>
        <view class="pending-list">
          <view
            v-for="item in pendingItems"
            :key="item.id"
            class="pending-item"
            @click="goPending(item.type)"
          >
            <view
              class="pending-icon-wrap"
              :class="'pending-' + item.type"
            >
              <text class="pending-icon">
                {{ pendingIcon(item.type) }}
              </text>
            </view>
            <view class="pending-info">
              <text class="pending-title">
                {{ item.title }}
              </text>
              <text class="pending-time">
                {{ item.time }}
              </text>
            </view>
            <view class="pending-right">
              <text class="pending-count">
                {{ item.count }}
              </text>
              <text class="pending-arrow">
                ›
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 收入趋势 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">
            收入趋势
          </text>
          <text
            class="section-more"
            @click="goIncomeDetail"
          >
            查看详情 ›
          </text>
        </view>
        <view class="income-chart">
          <view
            v-for="(item, idx) in incomeTrend"
            :key="item.month"
            class="income-bar-wrap"
          >
            <view
              class="income-bar"
              :class="{ 'income-bar-current': idx === incomeTrend.length - 1 }"
              :style="{ height: (item.income / maxIncome) * 100 + '%' }"
            />
            <text class="income-label">
              {{ item.month }}
            </text>
          </view>
        </view>
      </view>

      <!-- 我的课程 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">
            我的课程
          </text>
          <text
            class="section-more"
            @click="goAllCourses"
          >
            全部课程 ›
          </text>
        </view>
        <view class="course-list">
          <view
            v-for="c in courses"
            :key="c.id"
            class="course-item"
            @click="goCourseDetail(c.id)"
          >
            <view class="course-icon-wrap">
              <text class="course-icon">
                🎬
              </text>
            </view>
            <view class="course-info">
              <view class="course-name-row">
                <text class="course-name">
                  {{ c.title }}
                </text>
                <text
                  v-if="c.status === 'draft'"
                  class="course-draft"
                >
                  草稿
                </text>
              </view>
              <view class="course-meta">
                <text>👥 {{ c.students }}</text>
                <text>⭐ {{ c.rating }}</text>
              </view>
            </view>
            <text class="course-arrow">
              ›
            </text>
          </view>
        </view>
      </view>

      <!-- 快捷操作 -->
      <view class="section-card">
        <text class="section-title">
          快捷操作
        </text>
        <view class="quick-grid">
          <view
            v-for="act in quickActions"
            :key="act.label"
            class="quick-item"
            @click="goQuick(act.path)"
          >
            <view class="quick-icon-wrap">
              <text class="quick-icon">
                {{ act.icon }}
              </text>
            </view>
            <text class="quick-label">
              {{ act.label }}
            </text>
          </view>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

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
const teacherName = ref('李明德')
const stats = ref({
  rating: 4.9,
  ratingCount: 328,
  studentCount: 3256,
  courseCount: 12,
  totalIncome: 128650,
  monthIncome: 15680,
  withdrawable: 8650,
})

const pendingItems = ref([
  { id: 1, type: 'homework', title: '八字命理入门-第3章作业', count: 8, time: '最近提交: 10分钟前' },
  { id: 2, type: 'question', title: '学员提问待回答', count: 5, time: '最近提问: 30分钟前' },
  { id: 3, type: 'booking', title: '预约咨询待确认', count: 2, time: '最近预约: 1小时前' },
  { id: 4, type: 'review', title: '课程评价待回复', count: 3, time: '最近评价: 2小时前' },
])

const courses = ref([
  { id: '1', title: '八字命理入门实战班', students: 1256, rating: 4.9, status: 'active' },
  { id: '2', title: '紫微斗数进阶课程', students: 890, rating: 4.8, status: 'active' },
  { id: '3', title: '风水堪舆基础', students: 567, rating: 4.7, status: 'draft' },
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
  { icon: '📝', label: '发布课程', path: '/teacher/courses/create' },
  { icon: '🎤', label: '开始直播', path: '/live/create' },
  { icon: '📄', label: '发布文章', path: '/teacher/articles/create' },
  { icon: '📅', label: '预约管理', path: '/teacher/bookings' },
]

const pendingTotal = computed(() => pendingItems.value.reduce((s, i) => s + i.count, 0))
const maxIncome = computed(() => Math.max(...incomeTrend.value.map(d => d.income), 1))

onMounted(() => { fetchData() })

async function fetchData() {
  loading.value = true; loadError.value = null
  try {
    const api = require('../../api')
    const res: any = await api.courseApi?.dashboard?.().catch(() => ({}))
    if (res?.data) {
      // use real data
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || null
  } finally {
    loading.value = false
  }
}

function pendingIcon(type: string): string {
  const map: Record<string, string> = { homework: '📄', question: '💬', booking: '📅', review: '⭐' }
  return map[type] || '📋'
}

function formatCount(n?: number): string {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return String(n)
}

function formatWan(n?: number): string {
  if (!n) return '0'
  return (n / 10000).toFixed(1) + '万'
}

function formatMoney(n?: number): string {
  if (!n) return '0'
  return n.toLocaleString()
}

function goPending(type: string) {
  const paths: Record<string, string> = {
    homework: '/teacher/homework',
    question: '/teacher/questions',
    booking: '/teacher/bookings',
    review: '/teacher/reviews',
  }
  uni.navigateTo({ url: paths[type] || '/teacher/dashboard' })
}

function goIncomeDetail() {
  uni.navigateTo({ url: '/teacher/income' })
}

function goAllCourses() {
  uni.navigateTo({ url: '/teacher/courses' })
}

function goCourseDetail(id: string) {
  uni.navigateTo({ url: `/teacher/courses/${id}` })
}

function goQuick(path: string) {
  uni.navigateTo({ url: path })
}

function goNotifications() {
  uni.showToast({ title: '通知功能开发中', icon: 'none' })
}

function goSettings() {
  uni.showToast({ title: '设置功能开发中', icon: 'none' })
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }

.header { padding: 0 0 40rpx; }
.header-top { padding: 60rpx 24rpx 20rpx; display: flex; align-items: center; justify-content: space-between; }
.header-left { display: flex; align-items: center; gap: 16rpx; }
.back-btn { font-size: 44rpx; color: #fff; line-height: 1; }
.header-title { font-size: 32rpx; font-weight: 600; color: #fff; }
.header-actions { display: flex; gap: 12rpx; }
.header-icon { font-size: 36rpx; }

.teacher-card { display: flex; align-items: center; gap: 24rpx; padding: 0 24rpx; }
.teacher-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.teacher-avatar-icon { font-size: 52rpx; }
.teacher-info { flex: 1; }
.teacher-name-row { display: flex; align-items: center; gap: 12rpx; }
.teacher-name { font-size: 34rpx; font-weight: 600; color: #fff; }
.teacher-level { font-size: 20rpx; color: #C9A96E; background: rgba(201,169,110,0.2); padding: 4rpx 16rpx; border-radius: 12rpx; }
.teacher-title { font-size: 24rpx; color: rgba(255,255,255,0.7); display: block; margin: 4rpx 0; }
.teacher-rating { display: flex; align-items: center; gap: 8rpx; }
.rating-star { font-size: 28rpx; }
.rating-val { font-size: 26rpx; font-weight: 600; color: #fff; }
.rating-count { font-size: 20rpx; color: rgba(255,255,255,0.6); }

.scroll-area { padding: 24rpx; margin-top: -20rpx; }

.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; margin-bottom: 20rpx; }
.stat-card { background: #fff; border-radius: 16rpx; padding: 20rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.stat-icon { font-size: 32rpx; display: block; margin-bottom: 8rpx; }
.stat-val { font-size: 32rpx; font-weight: bold; color: #2C2C2C; display: block; }
.stat-label { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }
.stat-change { font-size: 18rpx; color: #52C41A; margin-top: 4rpx; display: block; }
.stat-change.up { color: #52C41A; }
.stat-sub { font-size: 18rpx; color: #999; margin-top: 4rpx; display: block; }

.section-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 16rpx; }
.section-count { font-size: 22rpx; color: #999; }
.section-more { font-size: 22rpx; color: #C41E3A; }

.pending-list { }
.pending-item { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 0; border-bottom: 1rpx solid #F5F0E8; }
.pending-item:last-child { border-bottom: none; }
.pending-icon-wrap { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pending-icon { font-size: 28rpx; }
.pending-homework { background: rgba(74,144,217,0.1); }
.pending-question { background: rgba(82,196,26,0.1); }
.pending-booking { background: rgba(156,39,176,0.1); }
.pending-review { background: rgba(245,158,11,0.1); }
.pending-info { flex: 1; }
.pending-title { font-size: 24rpx; color: #2C2C2C; display: block; }
.pending-time { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }
.pending-right { display: flex; align-items: center; gap: 12rpx; }
.pending-count { padding: 4rpx 16rpx; background: rgba(196,30,58,0.08); color: #C41E3A; border-radius: 20rpx; font-size: 22rpx; font-weight: 500; }
.pending-arrow { font-size: 32rpx; color: #ccc; }

.income-chart { display: flex; align-items: flex-end; gap: 16rpx; height: 200rpx; }
.income-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
.income-bar { width: 100%; background: rgba(196,30,58,0.25); border-radius: 6rpx 6rpx 0 0; min-height: 8rpx; }
.income-bar-current { background: #C41E3A; }
.income-label { font-size: 20rpx; color: #999; margin-top: 8rpx; }

.course-list { }
.course-item { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 0; border-bottom: 1rpx solid #F5F0E8; }
.course-item:last-child { border-bottom: none; }
.course-icon-wrap { width: 72rpx; height: 72rpx; border-radius: 12rpx; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.course-icon { font-size: 36rpx; }
.course-info { flex: 1; }
.course-name-row { display: flex; align-items: center; gap: 8rpx; }
.course-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.course-draft { font-size: 18rpx; color: #F59E0B; background: rgba(245,158,11,0.1); padding: 2rpx 10rpx; border-radius: 8rpx; }
.course-meta { display: flex; gap: 20rpx; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.course-arrow { font-size: 36rpx; color: #ccc; }

.quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.quick-item { text-align: center; }
.quick-icon-wrap { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; margin: 0 auto 8rpx; }
.quick-icon { font-size: 36rpx; }
.quick-label { font-size: 22rpx; color: #666; }

.bottom-spacer { height: 40rpx; }
</style>
