<template>
  <view class="dashboard-page">
    <app-nav-bar title="学习看板" :show-back="true">
      <template #right>
        <view class="nav-refresh" :class="{ spinning: refreshing }" @tap="refresh">
          <app-icon name="refresh-cw" :size="36" color="#fff" />
        </view>
      </template>
    </app-nav-bar>

    <scroll-view scroll-y class="dashboard-scroll">
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
                <text class="streak-num">{{ data.streak }}</text>
                <text class="streak-unit">天</text>
              </view>
            </view>
            <view class="streak-right">
              <text class="streak-week-label">本周学习</text>
              <text class="streak-week-val">{{ fmtMinutes(data.weeklyMinutes) }}</text>
            </view>
          </view>
          <view class="streak-grid">
            <view
              v-for="i in 7"
              :key="i"
              class="streak-cell"
              :class="{ active: i <= data.streak % 7 }"
            />
          </view>
          <text class="streak-progress">本周进度 {{ data.streak % 7 }}/7天</text>
        </view>

        <!-- 四项概览统计 -->
        <view class="stat-grid">
          <view class="stat-card">
            <view class="stat-icon" style="background:rgba(196,30,58,0.1)">
              <app-icon name="clock" :size="36" color="#C41E3A" />
            </view>
            <text class="stat-value">{{ fmtMinutes(data.totalMinutes) }}</text>
            <text class="stat-label">累计学习</text>
          </view>
          <view class="stat-card">
            <view class="stat-icon" style="background:rgba(74,144,217,0.1)">
              <app-icon name="book-open" :size="36" color="#4A90D9" />
            </view>
            <text class="stat-value">{{ data.totalCourses }} 门</text>
            <text class="stat-label">学习课程</text>
            <text class="stat-sub">点击查看全部</text>
          </view>
          <view class="stat-card">
            <view class="stat-icon" style="background:rgba(201,169,110,0.1)">
              <app-icon name="pen-line" :size="36" color="#C9A96E" />
            </view>
            <text class="stat-value">{{ data.totalNotes }} 篇</text>
            <text class="stat-label">学习笔记</text>
          </view>
          <view class="stat-card">
            <view class="stat-icon" style="background:rgba(39,174,96,0.1)">
              <app-icon name="file-text" :size="36" color="#27AE60" />
            </view>
            <text class="stat-value">{{ data.totalWorks }} 次</text>
            <text class="stat-label">提交作业</text>
          </view>
        </view>

        <!-- 近30天趋势图 -->
        <view class="trend-card">
          <view class="trend-head">
            <text class="trend-title">近30天学习趋势</text>
            <view class="trend-week">
              <app-icon name="trending-up" :size="28" color="#C41E3A" />
              <text class="trend-week-text">本周 {{ fmtMinutes(weekSum) }}</text>
            </view>
          </view>
          <view class="trend-bars">
            <view
              v-for="(d, i) in data.trend"
              :key="i"
              class="trend-bar-wrap"
            >
              <view
                class="trend-bar"
                :class="barClass(d, i)"
                :style="{ height: barHeight(d) }"
              />
            </view>
          </view>
          <view class="trend-labels">
            <view v-for="(d, i) in data.trend" :key="i" class="trend-label-cell">
              <text v-if="labelIndices.includes(i)" class="trend-label-text">
                {{ i === 29 ? '今' : (new Date(d.date).getMonth() + 1) + '/' + new Date(d.date).getDate() }}
              </text>
            </view>
          </view>
          <view class="trend-legend">
            <view class="legend-item">
              <view class="legend-dot" style="background:#C41E3A" />
              <text class="legend-text">今日</text>
            </view>
            <view class="legend-item">
              <view class="legend-dot" style="background:rgba(196,30,58,0.25)" />
              <text class="legend-text">工作日</text>
            </view>
            <view class="legend-item">
              <view class="legend-dot" style="background:rgba(201,169,110,0.6)" />
              <text class="legend-text">周末</text>
            </view>
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
            <view v-if="data.recentRecords.length === 0" class="recent-empty">暂无学习记录</view>
            <view
              v-for="(r, i) in data.recentRecords"
              :key="i"
              class="recent-item"
              @tap="goLearn(r.courseId)"
            >
              <view class="recent-cover">
                <app-icon name="book-open" :size="44" color="rgba(196,30,58,0.5)" />
                <view class="recent-ring">
                  <text class="recent-ring-text">{{ r.progress }}%</text>
                </view>
              </view>
              <view class="recent-info">
                <text class="recent-course">{{ r.courseTitle }}</text>
                <text class="recent-lesson">{{ r.lessonTitle }}</text>
                <view class="recent-meta">
                  <text class="recent-meta-item">{{ relativeTime(r.studyAt) }}</text>
                  <text class="recent-meta-item">学习 {{ r.duration }} 分钟</text>
                  <text class="recent-meta-progress">进度 {{ r.progress }}%</text>
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
import { ref, computed } from 'vue'
import { navigateTo, navigateBack } from '@/utils/router'

interface TrendItem { date: string; minutes: number }
interface RecentRecord {
  courseId: string; courseTitle: string; cover: string
  lessonTitle: string; studyAt: string; duration: number; progress: number
}
interface DashboardData {
  totalMinutes: number; totalCourses: number; totalNotes: number; totalWorks: number
  streak: number; weeklyMinutes: number; trend: TrendItem[]; recentRecords: RecentRecord[]
}

// 固定趋势数据（确定性，保证渲染可复现，与原型一致）
const TREND_MINUTES = [
  35, 52, 18, 64, 41, 28, 73, 46, 12, 58,
  31, 67, 24, 49, 38, 71, 15, 55, 42, 63,
  48, 82, 36, 91, 57, 74, 45, 88, 62, 39,
]

function buildTrend(): TrendItem[] {
  const arr: TrendItem[] = []
  for (let i = 0; i < 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    arr.push({
      date: d.toISOString().slice(0, 10),
      minutes: TREND_MINUTES[i],
    })
  }
  return arr
}

const data = ref<DashboardData>({
  totalMinutes: 1240,
  totalCourses: 8,
  totalNotes: 36,
  totalWorks: 12,
  streak: 7,
  weeklyMinutes: 185,
  trend: buildTrend(),
  recentRecords: [
    { courseId: '1', courseTitle: '八字命理入门精讲', cover: '', lessonTitle: '第三讲：天干地支详解', studyAt: '2024-01-15T14:30:00Z', duration: 45, progress: 68 },
    { courseId: '2', courseTitle: '紫微斗数基础课程', cover: '', lessonTitle: '第一讲：命盘排列方法', studyAt: '2024-01-14T20:15:00Z', duration: 32, progress: 25 },
    { courseId: '3', courseTitle: '周易易经入门到精通', cover: '', lessonTitle: '第八讲：六十四卦详解', studyAt: '2024-01-13T11:00:00Z', duration: 58, progress: 90 },
    { courseId: '1', courseTitle: '八字命理入门精讲', cover: '', lessonTitle: '第二讲：阴阳五行基础', studyAt: '2024-01-12T16:45:00Z', duration: 41, progress: 55 },
  ],
})

const refreshing = ref(false)
const labelIndices = [0, 6, 13, 20, 27, 29]

const maxVal = computed(() => Math.max(...data.value.trend.map((d) => d.minutes), 1))
const weekSum = computed(() => data.value.trend.slice(-7).reduce((s, d) => s + d.minutes, 0))
const today = new Date().toISOString().slice(0, 10)

function fmtMinutes(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}小时${m > 0 ? m + '分' : ''}` : `${m}分钟`
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d <= 0) return '今天'
  if (d === 1) return '昨天'
  return `${d}天前`
}

function barHeight(d: TrendItem) {
  return `${Math.max((d.minutes / maxVal.value) * 100, 4)}%`
}

function barClass(d: TrendItem, _i: number) {
  if (d.date === today) return 'bar-today'
  const day = new Date(d.date).getDay()
  return day === 0 || day === 6 ? 'bar-weekend' : 'bar-weekday'
}

function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  setTimeout(() => {
    data.value.trend = buildTrend()
    refreshing.value = false
  }, 600)
}

function goCourses() {
  navigateTo('/mine/my-courses')
}

function goLearn(courseId: string) {
  navigateTo(`/courses/${courseId}/learn`)
}
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
  background: linear-gradient(135deg, #c41e3a, #8b0000);
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
.streak-right { text-align: right; }
.streak-week-label { display: block; font-size: 26rpx; color: rgba(255, 255, 255, 0.7); margin-bottom: 8rpx; }
.streak-week-val { font-size: 40rpx; font-weight: 700; color: #fff; }
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
.stat-sub { font-size: 22rpx; color: #c41e3a; font-weight: 500; }

/* 趋势图 */
.trend-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
}
.trend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.trend-title { font-size: 30rpx; font-weight: 700; color: #2c2c2c; }
.trend-week { display: flex; align-items: center; gap: 8rpx; }
.trend-week-text { font-size: 24rpx; color: #c41e3a; font-weight: 500; }
.trend-bars {
  display: flex;
  align-items: flex-end;
  gap: 4rpx;
  height: 160rpx;
  margin-bottom: 16rpx;
}
.trend-bar-wrap {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}
.trend-bar {
  width: 100%;
  border-radius: 4rpx 4rpx 0 0;
}
.bar-today { background: #c41e3a; }
.bar-weekday { background: rgba(196, 30, 58, 0.25); }
.bar-weekend { background: rgba(201, 169, 110, 0.6); }
.trend-labels { display: flex; align-items: flex-end; }
.trend-label-cell { flex: 1; text-align: center; }
.trend-label-text { font-size: 18rpx; color: #999; }
.trend-legend {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid #f2efea;
}
.legend-item { display: flex; align-items: center; gap: 12rpx; }
.legend-dot { width: 20rpx; height: 20rpx; border-radius: 4rpx; }
.legend-text { font-size: 22rpx; color: #999; }

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
.recent-more-text { font-size: 24rpx; color: #c41e3a; }
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
.recent-meta-progress { font-size: 20rpx; color: #c41e3a; font-weight: 500; }
</style>
