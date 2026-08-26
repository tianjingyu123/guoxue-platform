<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import { navigateTo } from '@/utils/router'
import { pointsApi, type PointsTask } from '@/lib/points-data'

const info = ref({ balance: 0, totalEarned: 0, totalSpent: 0, todayEarned: 0 })
const tasks = ref<PointsTask[]>([])
const loading = ref(true)
const error = ref('')

const taskColors = ['#9a2e22', '#2563eb', '#16a34a', '#d97706', '#7c3aed']
const completedCount = computed(() => tasks.value.filter((t) => t.completed).length)
const totalTasks = computed(() => tasks.value.length)
const progressPercent = computed(() =>
  totalTasks.value > 0 ? Math.round((completedCount.value / totalTasks.value) * 100) : 0,
)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [pointsInfo, taskList] = await Promise.all([
      pointsApi.getInfo(),
      pointsApi.getTasks(),
    ])
    info.value = pointsInfo
    tasks.value = taskList.map((t) => ({ ...t }))
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function retry() {
  fetchData()
}

onMounted(() => {
  fetchData()
})

function goBack() {
  uni.navigateBack()
}
// 统一走 @/utils/router 的 navigateTo（自带失败兜底 toast），替代裸 uni.navigateTo
function go(url: string) {
  navigateTo(url)
}
function pct(cur: number, max: number) {
  return Math.min(100, Math.round((cur / max) * 100))
}
/* 上线阶段只展示后端已有真实入账链路的签到任务。 */
const TASK_ROUTES: Record<string, string> = {
  '每日签到': '/profile', // 签到入口在个人中心（profile 页签到卡，POST /users/me/checkin）
}
function taskRoute(task: PointsTask): string | undefined {
  return TASK_ROUTES[task.title]
}
function goTask(task: PointsTask) {
  const route = taskRoute(task)
  if (route) navigateTo(route)
}
</script>

<template>
  <app-safe-area-top />
  <view class="page">
    <view class="nav">
      <view class="nav-back" @tap="goBack">
        <AppIcon name="arrow-left" :size="44" color="#2D2A26" />
      </view>
      <text class="nav-title">积分任务</text>
      <view class="nav-placeholder" />
    </view>

    <view v-if="loading" class="loading"><AppLoading /></view>
    <view v-else-if="error" class="error-state">
      <text>{{ error }}</text>
      <view class="retry-btn" @tap="retry">重试</view>
    </view>
    <view v-else-if="!tasks.length" class="empty-page"><text>暂无任务</text></view>
    <scroll-view v-else scroll-y class="scroll">
      <!-- 积分总览 -->
      <view class="overview">
        <view class="ov-top">
          <view>
            <text class="ov-label">当前积分</text>
            <text class="ov-num">{{ info.balance.toLocaleString() }}</text>
            <text class="ov-today">今日已获 +{{ info.todayEarned }}</text>
          </view>
          <view class="ov-btn" @tap="go('/pkg-mine/points/exchange/index')">
            <text class="ov-btn-text">积分兑换</text>
            <AppIcon name="chevron-right" :size="16" color="#fff" />
          </view>
        </view>
        <view class="ov-progress">
          <view class="ov-progress-head">
            <text class="ov-progress-label">今日任务进度</text>
            <text class="ov-progress-count">{{ completedCount }}/{{ totalTasks }}</text>
          </view>
          <view class="ov-track">
            <view class="ov-fill" :style="{ width: progressPercent + '%' }" />
          </view>
        </view>
      </view>

      <!-- 任务列表 -->
      <view class="section">
        <text class="section-title">可完成任务</text>
        <view class="task-list">
          <view v-for="(task, idx) in tasks" :key="task.id" class="task-card" :class="{ 'task-faded': task.completed }">
            <view class="task-icon" :style="{ background: taskColors[idx % taskColors.length] + '1a' }">
              <AppIcon :name="task.icon" :size="20" :color="taskColors[idx % taskColors.length]" />
            </view>
            <view class="task-info">
              <view class="task-title-row">
                <text class="task-title">{{ task.title }}</text>
                <text class="task-badge">+{{ task.points }} 积分起</text>
              </view>
              <text class="task-limit">{{ task.limit }}</text>
              <view v-if="task.max !== undefined && task.current !== undefined" class="task-progress">
                <view class="task-progress-head">
                  <text class="task-progress-label">进度</text>
                  <text class="task-progress-count">{{ task.current }}/{{ task.max }}</text>
                </view>
                <view class="task-track">
                  <view class="task-fill" :style="{ width: pct(task.current, task.max) + '%' }" />
                </view>
              </view>
            </view>
            <view class="task-action">
              <view v-if="task.completed" class="task-done">
                <AppIcon name="check-circle" :size="16" color="#16a34a" />
                <text class="task-done-text">已完成</text>
              </view>
              <view v-else-if="taskRoute(task)" class="task-btn" @tap="goTask(task)">
                <text class="task-btn-text">{{ task.action || '去完成' }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 真实积分规则 -->
      <view class="note">
        <text class="note-title">签到积分说明</text>
        <text class="note-item">• 每日签到基础获得 5 积分</text>
        <text class="note-item">• 连续签到每满 3 天，下一档起每日额外增加 3 积分</text>
        <text class="note-item">• 积分到账后可在积分明细中核对</text>
      </view>
      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}
.nav {
  position: sticky;
  top: var(--status-bar-height, 0px);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: rgba(250, 248, 245, 0.95);
  border-bottom: 2rpx solid rgba(201, 169, 110, 0.2);
}
.nav-back {
  width: 48rpx;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2d2a26;
}
.nav-placeholder {
  width: 48rpx;
}
.scroll {
  height: calc(100vh - 92rpx);
}
.overview {
  margin: 32rpx;
  padding: 40rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #c9a96e 0%, #b8923f 60%, #a67c1a 100%);
}
.ov-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.ov-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
  margin-bottom: 8rpx;
}
.ov-num {
  font-size: 72rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
}
.ov-today {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 8rpx;
}
.ov-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 32rpx;
  padding: 12rpx 24rpx;
}
.ov-btn-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #fff;
}
.ov-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.ov-progress-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}
.ov-progress-count {
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
}
.ov-track {
  height: 16rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;
}
.ov-fill {
  height: 100%;
  border-radius: 16rpx;
  background: #fff;
}
.section {
  padding: 0 32rpx;
  margin-top: 40rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2d2a26;
  display: block;
  margin-bottom: 24rpx;
}
.task-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.task-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 24rpx;
}
.task-faded {
  opacity: 0.6;
}
.task-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.task-info {
  flex: 1;
  min-width: 0;
}
.task-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.task-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2d2a26;
}
.task-badge {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 16rpx;
  background: #fdf0d8;
  color: #b8923f;
}
.task-limit {
  display: block;
  font-size: 22rpx;
  color: #8a8178;
  margin-top: 6rpx;
}
.task-progress {
  margin-top: 16rpx;
}
.task-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.task-progress-label {
  font-size: 20rpx;
  color: #8a8178;
}
.task-progress-count {
  font-size: 20rpx;
  color: #8a8178;
}
.task-track {
  height: 12rpx;
  border-radius: 12rpx;
  background: #ece7df;
  overflow: hidden;
}
.task-fill {
  height: 100%;
  border-radius: 12rpx;
  background: #c9a96e;
}
.task-action {
  flex-shrink: 0;
}
.task-done {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.task-done-text {
  font-size: 22rpx;
  color: #16a34a;
}
.task-btn {
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  background: #9a2e22;
}
.task-btn-text {
  font-size: 22rpx;
  color: #fff;
}
.note {
  margin: 40rpx 32rpx 0;
  padding: 28rpx;
  background: rgba(236, 231, 223, 0.5);
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.note-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #2d2a26;
  margin-bottom: 8rpx;
}
.note-item {
  font-size: 22rpx;
  color: #8a8178;
  line-height: 1.5;
}
.bottom-space {
  height: 48rpx;
}
.loading { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: #8a8178; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); color: #fff; border-radius: 12rpx; font-size: 26rpx; }
.empty-page { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: #8a8178; }
</style>
