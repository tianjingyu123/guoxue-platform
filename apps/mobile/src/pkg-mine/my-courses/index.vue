<template>
  <view class="page">
    <!-- 顶部导航 + Tab -->
    <view class="header">
      <view class="nav">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="24" color="#2C2C2C" />
        </view>
        <text class="nav-title">我的课程</text>
        <view class="nav-refresh" :class="{ spinning: isRefreshing }" @tap="refresh">
          <app-icon name="refresh-cw" :size="20" color="#666666" />
        </view>
      </view>
      <view class="tabs">
        <view
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ 'tab-active': activeTab === tab.id }"
          @tap="activeTab = tab.id as TabId"
        >
          <text class="tab-txt">{{ tab.label }}</text>
          <view v-if="activeTab === tab.id" class="tab-line" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll-area">
      <!-- 学习统计卡 -->
      <view class="stat-wrap">
        <view class="stat-card">
          <view class="stat-head">
            <view class="stat-head-left">
              <app-icon name="trending-up" :size="20" color="#fff" />
              <text class="stat-head-txt">学习概览</text>
            </view>
            <view class="stat-plan" @tap="goPlan">
              <text class="stat-plan-txt">学习计划</text>
              <app-icon name="chevron-right" :size="12" color="rgba(255,255,255,0.8)" />
            </view>
          </view>
          <view class="stat-grid">
            <view class="stat-col">
              <text class="stat-num">{{ learningCount }}</text>
              <text class="stat-label">学习中</text>
            </view>
            <view class="stat-col">
              <text class="stat-num">{{ completedCount }}</text>
              <text class="stat-label">已完结</text>
            </view>
            <view class="stat-col">
              <view class="stat-flame">
                <app-icon name="flame" :size="20" color="#fde047" />
                <text class="stat-num">{{ streak }}</text>
              </view>
              <text class="stat-label">连续天数</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 课程列表 -->
      <view class="list">
        <!-- 加载态 -->
        <view v-if="loading" class="state-box"><text class="state-txt">加载中...</text></view>
        <!-- 错误态 -->
        <view v-else-if="error" class="state-box">
          <text class="state-txt">{{ error }}</text>
          <view class="state-btn" @tap="fetchData"><text class="state-btn-txt">重试</text></view>
        </view>
        <!-- 空态 -->
        <view v-else-if="filteredCourses.length === 0" class="empty">
          <view class="empty-icon">
            <app-icon name="book-open" :size="40" color="#C9A96E" />
          </view>
          <text class="empty-txt">{{ activeTab === 'learning' ? '暂无学习中的课程' : '暂无已完结的课程' }}</text>
          <text class="empty-link" @tap="goCourseList">去发现精品课程</text>
        </view>

        <!-- 课程卡 -->
        <view
          v-for="c in (loading || error ? [] : filteredCourses)"
          :key="c.id"
          class="ccard"
          @tap="openCourse(c)"
        >
          <view class="ccard-main">
            <!-- 封面 -->
            <view class="ccard-cover">
              <image lazy-load :src="c.cover" mode="aspectFill" class="ccard-img" />
              <view v-if="c.status === 'completed'" class="ccard-cover-mask">
                <view class="ccard-award">
                  <app-icon name="award" :size="16" color="#fff" />
                </view>
              </view>
            </view>
            <!-- 信息 -->
            <view class="ccard-info">
              <text class="ccard-title">{{ c.title }}</text>
              <text class="ccard-sub">{{ c.instructor }} · {{ c.totalLessons }}课时</text>
              <!-- 进度 -->
              <view class="ccard-prog">
                <view class="ccard-prog-row">
                  <text class="ccard-prog-label">{{ c.status === 'completed' ? '已完成' : `${c.completedLessons}/${c.totalLessons}课时` }}</text>
                  <text class="ccard-prog-pct" :class="c.status === 'completed' ? 'c-gold' : 'c-red'">{{ c.progressPercent }}%</text>
                </view>
                <view class="ccard-prog-track">
                  <view
                    class="ccard-prog-fill"
                    :class="c.status === 'completed' ? 'fill-gold' : 'fill-red'"
                    :style="{ width: c.progressPercent + '%' }"
                  />
                </view>
              </view>
              <!-- 底部 -->
              <view class="ccard-foot">
                <view v-if="c.status === 'completed'" class="ccard-cert">
                  <app-icon name="award" :size="12" color="#C9A96E" />
                  <text class="ccard-cert-txt">已获得证书</text>
                </view>
                <view v-else class="ccard-time">
                  <app-icon name="clock" :size="12" color="#999999" />
                  <text class="ccard-time-txt">{{ c.lastStudyAt ? fmtDate(c.lastStudyAt) : '未开始学习' }}</text>
                </view>
                <view v-if="c.status !== 'completed'" class="ccard-continue" @tap.stop="continueStudy(c)">
                  <app-icon name="play" :size="12" color="#fff" />
                  <text class="ccard-continue-txt">继续学习</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 上次学习 -->
          <view v-if="c.status !== 'completed' && c.lastLesson" class="ccard-last">
            <text class="ccard-last-txt">上次学到: {{ c.lastLesson }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { mineApi, type MyCourseItem } from '@/lib/mine-data'

type TabId = 'learning' | 'completed'

const day = 24 * 60 * 60 * 1000

const courses = ref<MyCourseItem[]>([])
const streak = ref(0)
const loading = ref(true)
const error = ref('')

const tabs = [
  { id: 'learning', label: '学习中' },
  { id: 'completed', label: '已完结' },
]
const activeTab = ref<TabId>('learning')
const isRefreshing = ref(false)

const learningCount = computed(() => courses.value.filter((c) => c.status === 'learning').length)
const completedCount = computed(() => courses.value.filter((c) => c.status === 'completed').length)
const filteredCourses = computed(() => courses.value.filter((c) => c.status === activeTab.value))

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await mineApi.getMyCourses()
    courses.value = res.courses
    streak.value = res.streak
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

function fmtDate(iso?: string) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / day)
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
async function refresh() {
  if (isRefreshing.value) return
  isRefreshing.value = true
  try { await fetchData() } finally { isRefreshing.value = false }
}
function openCourse(c: MyCourseItem) {
  // 课程 V0 重构：per-course learn 页已退役，进行中课程直接进播放页续学
  if (c.status === 'completed') navigateTo(`/courses/${c.id}`)
  else navigateTo(`/courses/${c.id}/player`)
}
function continueStudy(c: MyCourseItem) {
  navigateTo(`/courses/${c.id}/player`)
}
function goPlan() {
  navigateTo('/courses/study-plan')
}
function goCourseList() {
  navigateTo('/courses-list')
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #faf8f5;
}
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #faf8f5;
  border-bottom: 1rpx solid #e8e3db;
}
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}
.nav-back,
.nav-refresh {
  padding: 8rpx;
}
.nav-refresh.spinning {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.tabs {
  display: flex;
  gap: 48rpx;
  padding: 0 32rpx;
}
.tab {
  position: relative;
  padding: 24rpx 0;
}
.tab-txt {
  font-size: 30rpx;
  font-weight: 500;
  color: #666666;
}
.tab-active .tab-txt {
  color: var(--brand);
}
.tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.scroll-area {
  height: calc(100vh - 88rpx - 96rpx);
}

/* 学习统计卡 */
.stat-wrap {
  padding: 32rpx 32rpx 16rpx;
}
.stat-card {
  background: linear-gradient(135deg, var(--brand), #e74c3c);
  border-radius: 32rpx;
  padding: 32rpx;
  color: #fff;
}
.stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.stat-head-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.stat-head-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}
.stat-plan {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.stat-plan-txt {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
}
.stat-grid {
  display: flex;
}
.stat-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.stat-flame {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.stat-num {
  font-size: 44rpx;
  font-weight: 700;
  color: #fff;
}
.stat-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}
.stat-goal {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.2);
}
.stat-goal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.stat-goal-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
}
.stat-goal-val {
  font-size: 22rpx;
  color: #fff;
}
.stat-goal-track {
  height: 16rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999rpx;
  overflow: hidden;
}
.stat-goal-fill {
  height: 100%;
  background: #fde047;
  border-radius: 999rpx;
}

/* 列表 */
.list {
  padding: 32rpx;
}
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding: 120rpx 0;
}
.state-txt {
  font-size: 28rpx;
  color: #999999;
}
.state-btn {
  padding: 16rpx 48rpx;
  background: var(--brand);
  border-radius: 12rpx;
}
.state-btn-txt {
  font-size: 26rpx;
  color: #fff;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}
.empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 999rpx;
  background: #f5f0e8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.empty-txt {
  font-size: 28rpx;
  color: #666666;
  margin-bottom: 16rpx;
}
.empty-link {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--brand);
}

/* 课程卡 */
.ccard {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.ccard-main {
  display: flex;
  gap: 24rpx;
}
.ccard-cover {
  width: 224rpx;
  height: 160rpx;
  border-radius: 16rpx;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
}
.ccard-img {
  width: 100%;
  height: 100%;
}
.ccard-cover-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ccard-award {
  width: 56rpx;
  height: 56rpx;
  border-radius: 999rpx;
  background: #c9a96e;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ccard-info {
  flex: 1;
  min-width: 0;
}
.ccard-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8rpx;
}
.ccard-sub {
  display: block;
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 16rpx;
}
.ccard-prog {
  margin-bottom: 16rpx;
}
.ccard-prog-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.ccard-prog-label {
  font-size: 22rpx;
  color: #666666;
}
.ccard-prog-pct {
  font-size: 22rpx;
  font-weight: 500;
}
.c-red {
  color: var(--brand);
}
.c-gold {
  color: #c9a96e;
}
.ccard-prog-track {
  height: 12rpx;
  background: #f2efea;
  border-radius: 999rpx;
  overflow: hidden;
}
.ccard-prog-fill {
  height: 100%;
  border-radius: 999rpx;
}
.fill-red {
  background: linear-gradient(90deg, var(--brand), #e74c3c);
}
.fill-gold {
  background: linear-gradient(90deg, #c9a96e, #d4b896);
}
.ccard-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ccard-cert,
.ccard-time {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.ccard-cert-txt {
  font-size: 22rpx;
  color: #c9a96e;
}
.ccard-time-txt {
  font-size: 22rpx;
  color: #999999;
}
.ccard-continue {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 20rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.ccard-continue-txt {
  font-size: 22rpx;
  font-weight: 500;
  color: #fff;
}
.ccard-last {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f2efea;
}
.ccard-last-txt {
  font-size: 22rpx;
  color: #999999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ccard-expire {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f2efea;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.ccard-expire-txt {
  font-size: 22rpx;
  color: #d97706;
}
</style>
