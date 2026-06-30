<template>
  <view class="dashboard-page">
    <app-nav-bar title="学习看板" :show-back="true">
      <template #right>
        <view class="nav-refresh" :class="{ spinning: refreshing }" @tap="refresh">
          <app-icon name="refresh-cw" :size="36" color="#fff" />
        </view>
      </template>
    </app-nav-bar>

    <!-- 加载态 -->
    <view v-if="loading" class="state-box"><text class="state-txt">加载中...</text></view>
    <!-- 错误态 -->
    <view v-else-if="error" class="state-box">
      <text class="state-txt">{{ error }}</text>
      <view class="state-btn" @tap="fetchData"><text class="state-btn-txt">重试</text></view>
    </view>
    <!-- 空态 -->
    <view v-else-if="totalCourses === 0" class="state-box">
      <view class="empty-icon"><app-icon name="book-open" :size="40" color="#C9A96E" /></view>
      <text class="state-txt">暂无学习数据</text>
      <text class="empty-link" @tap="goCourseList">去发现精品课程</text>
    </view>

    <scroll-view v-else scroll-y class="dashboard-scroll">
      <view class="dashboard-body">
        <!-- 连续学习徽章 -->
        <view class="streak-card">
          <view class="streak-deco streak-deco-1" />
          <view class="streak-deco streak-deco-2" />
          <view class="streak-top">
            <view class="streak-left">
              <view class="streak-label-row">
                <app-icon name="flame" :size="34" color="#FACC15" />
                <text class="streak-label">连续学习</text>
              </view>
              <view class="streak-num-row">
                <text class="streak-num">{{ streak }}</text>
                <text class="streak-unit">天</text>
              </view>
            </view>
          </view>
          <view class="streak-grid">
            <view
              v-for="i in 7"
              :key="i"
              class="streak-cell"
              :class="{ active: i <= Math.min(streak, 7) }"
            />
          </view>
          <text class="streak-progress">坚持学习，习惯成自然</text>
        </view>

        <!-- 概览统计（仅真实指标） -->
        <view class="stat-grid">
          <view class="stat-card" @tap="goCourses">
            <view class="stat-icon" style="background:rgba(74,144,217,0.1)">
              <app-icon name="book-open" :size="36" color="#4A90D9" />
            </view>
            <text class="stat-value">{{ totalCourses }} 门</text>
            <text class="stat-label">学习课程</text>
            <text class="stat-sub">点击查看全部</text>
          </view>
          <view class="stat-card">
            <view class="stat-icon" style="background:rgba(196,30,58,0.1)">
              <app-icon name="play-circle" :size="36" color="#C41E3A" />
            </view>
            <text class="stat-value">{{ learningCount }} 门</text>
            <text class="stat-label">学习中</text>
          </view>
          <view class="stat-card">
            <view class="stat-icon" style="background:rgba(39,174,96,0.1)">
              <app-icon name="award" :size="36" color="#27AE60" />
            </view>
            <text class="stat-value">{{ completedCount }} 门</text>
            <text class="stat-label">已完结</text>
          </view>
        </view>

        <!-- 最近学习记录 -->
        <view class="recent-card">
          <view class="recent-head">
            <text class="recent-title">最近学习</text>
            <view class="recent-more" @tap="goCourses">
              <text class="recent-more-text">全部课程</text>
              <app-icon name="chevron-right" :size="28" color="#C41E3A" />
            </view>
          </view>
          <view class="recent-list">
            <view v-if="recentRecords.length === 0" class="recent-empty">暂无学习记录</view>
            <view
              v-for="r in recentRecords"
              :key="r.id"
              class="recent-item"
              @tap="goLearn(r.id)"
            >
              <view class="recent-cover">
                <image lazy-load v-if="r.cover" :src="r.cover" mode="aspectFill" class="recent-cover-img" />
                <app-icon v-else name="book-open" :size="44" color="rgba(196,30,58,0.5)" />
                <view class="recent-ring">
                  <text class="recent-ring-text">{{ r.progressPercent }}%</text>
                </view>
              </view>
              <view class="recent-info">
                <text class="recent-course">{{ r.title }}</text>
                <text v-if="r.lastLesson" class="recent-lesson">{{ r.lastLesson }}</text>
                <view class="recent-meta">
                  <text v-if="r.lastStudyAt" class="recent-meta-item">{{ relativeTime(r.lastStudyAt) }}</text>
                  <text class="recent-meta-progress">进度 {{ r.progressPercent }}%</text>
                </view>
              </view>
              <app-icon name="chevron-right" :size="28" color="#CCC" />
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '@/utils/router'
import { mineApi, type MyCourseItem } from '@/lib/mine-data'

const loading = ref(true)
const error = ref('')
const refreshing = ref(false)

const courses = ref<MyCourseItem[]>([])
const streak = ref(0)
const learningCount = ref(0)
const completedCount = ref(0)

const totalCourses = computed(() => courses.value.length)

// 最近学习：取有学习记录的课程，按最近学习时间倒序，取前 5
const recentRecords = computed(() =>
  courses.value
    .filter((c) => c.lastStudyAt)
    .sort((a, b) => new Date(b.lastStudyAt!).getTime() - new Date(a.lastStudyAt!).getTime())
    .slice(0, 5),
)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await mineApi.getMyCourses()
    courses.value = res.courses
    streak.value = res.streak
    learningCount.value = res.learningCount
    completedCount.value = res.completedCount
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await fetchData()
  } finally {
    refreshing.value = false
  }
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d <= 0) return '今天'
  if (d === 1) return '昨天'
  if (d < 7) return `${d}天前`
  const dt = new Date(iso)
  return `${dt.getMonth() + 1}月${dt.getDate()}日`
}

function goCourses() {
  navigateTo('/mine/my-courses')
}
function goCourseList() {
  navigateTo('/courses-list')
}
function goLearn(courseId: string) {
  navigateTo(`/courses/${courseId}/learn`)
}

onMounted(fetchData)
</script>

<style lang="scss" scoped>
.dashboard-page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}

.nav-refresh {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  &.spinning {
    animation: spin 0.8s linear infinite;
  }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 三态 */
.state-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 160rpx 0;
}
.state-txt { font-size: 28rpx; color: #999; }
.state-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 12rpx; }
.state-btn-txt { font-size: 26rpx; color: #fff; }
.empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 999rpx;
  background: #f5f0e8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-link { font-size: 26rpx; font-weight: 500; color: var(--brand); }

.dashboard-scroll {
  flex: 1;
  height: 0;
}

.dashboard-body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  padding-bottom: 80rpx;
}

/* 连续学习徽章 */
.streak-card {
  position: relative;
  overflow: hidden;
  border-radius: 32rpx;
  padding: 32rpx;
  background: linear-gradient(135deg, var(--brand), #8b0000);
  box-shadow: 0 8rpx 32rpx rgba(196, 30, 58, 0.3);
}
.streak-deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
}
.streak-deco-1 { right: -48rpx; top: -48rpx; width: 192rpx; height: 192rpx; }
.streak-deco-2 { right: -16rpx; bottom: -64rpx; width: 256rpx; height: 256rpx; }
.streak-top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.streak-label-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}
.streak-label { font-size: 26rpx; color: rgba(255, 255, 255, 0.8); font-weight: 500; }
.streak-num-row { display: flex; align-items: baseline; gap: 8rpx; }
.streak-num { font-size: 72rpx; font-weight: 900; color: #fff; line-height: 1; }
.streak-unit { font-size: 28rpx; color: rgba(255, 255, 255, 0.7); }
.streak-grid {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 12rpx;
  margin-top: 24rpx;
}
.streak-cell {
  flex: 1;
  height: 12rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  &.active { background: #facc15; }
}
.streak-progress {
  position: relative;
  z-index: 1;
  display: block;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 8rpx;
}

/* 统计卡 */
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.stat-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
}
.stat-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stat-value { font-size: 44rpx; font-weight: 900; color: #2c2c2c; line-height: 1; }
.stat-label { font-size: 24rpx; color: #999; }
.stat-sub { font-size: 22rpx; color: var(--brand); font-weight: 500; }

/* 最近学习 */
.recent-card {
  background: #fff;
  border-radius: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
.recent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 16rpx;
}
.recent-title { font-size: 30rpx; font-weight: 700; color: #2c2c2c; }
.recent-more { display: flex; align-items: center; gap: 4rpx; }
.recent-more-text { font-size: 24rpx; color: var(--brand); }
.recent-list { padding: 0 32rpx 16rpx; }
.recent-empty { padding: 80rpx 0; text-align: center; color: #999; font-size: 26rpx; }
.recent-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 0;
  border-bottom: 2rpx solid #f2efea;
  &:last-child { border-bottom: 0; }
}
.recent-cover {
  position: relative;
  width: 112rpx;
  height: 112rpx;
  border-radius: 24rpx;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.2), rgba(201, 169, 110, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
}
.recent-cover-img { width: 100%; height: 100%; }
.recent-ring {
  position: absolute;
  bottom: 4rpx;
  right: 4rpx;
  background: rgba(196, 30, 58, 0.9);
  border-radius: 999rpx;
  padding: 2rpx 10rpx;
}
.recent-ring-text { font-size: 18rpx; color: #fff; font-weight: 600; }
.recent-info { flex: 1; min-width: 0; }
.recent-course {
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.recent-lesson {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.recent-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 12rpx;
}
.recent-meta-item { font-size: 20rpx; color: #999; }
.recent-meta-progress { font-size: 20rpx; color: var(--brand); font-weight: 500; }
</style>
