<template>
  <!-- 团队任务卡（商-P2）：站长工作台展示运营商下发的任务进度；
       未归属任何运营商团队（inTeam=false）整卡隐藏，不打扰独立站长 -->
  <view v-if="visible" class="ttc-card">
    <view class="ttc-head">
      <text class="ttc-title">团队任务</text>
      <view v-if="openTasks.length" class="ttc-count"><text class="ttc-count-txt">{{ openTasks.length }}</text></view>
      <text v-if="operatorName" class="ttc-from">来自 {{ operatorName }}</text>
    </view>

    <!-- 三态 -->
    <view v-if="loading" class="ttc-state"><view class="ttc-sk" /><view class="ttc-sk" /></view>
    <view v-else-if="error" class="ttc-state">
      <text class="ttc-err">{{ error }}</text>
      <view class="ttc-retry" @tap="load"><text class="ttc-retry-txt">重试</text></view>
    </view>
    <view v-else-if="!openTasks.length" class="ttc-state">
      <text class="ttc-empty">暂无进行中的团队任务</text>
    </view>

    <template v-else>
      <view v-for="t in openTasks" :key="t.taskId" class="ttc-item">
        <view class="ttc-item-head">
          <view class="ttc-kind" :class="t.type.toLowerCase()"><text class="ttc-kind-txt">{{ typeLabel(t.type) }}</text></view>
          <text class="ttc-item-title">{{ t.title }}</text>
          <text v-if="t.completedAt" class="ttc-done">已完成</text>
          <text v-else class="ttc-deadline" :class="{ urgent: daysLeft(t.deadline) <= 3 }">{{ deadlineText(t.deadline) }}</text>
        </view>
        <text v-if="t.desc" class="ttc-desc">{{ t.desc }}</text>

        <!-- 自动结算类型：进度条 -->
        <view v-if="t.type !== 'CUSTOM' && t.targetValue" class="ttc-progress">
          <view class="ttc-bar-track">
            <view class="ttc-bar-fill" :class="{ full: t.currentValue >= t.targetValue }" :style="{ width: percent(t) + '%' }" />
          </view>
          <text class="ttc-progress-txt">{{ t.currentValue }}/{{ t.targetValue }}{{ unitOf(t.type) }}</text>
        </view>
        <view v-else-if="t.type !== 'CUSTOM'" class="ttc-progress">
          <text class="ttc-progress-txt">当前进度 {{ t.currentValue }}{{ unitOf(t.type) }}</text>
        </view>

        <!-- CUSTOM：站长手动标记完成 -->
        <view v-if="t.type === 'CUSTOM' && !t.completedAt" class="ttc-actions">
          <view class="ttc-btn" :class="{ disabled: submittingId === t.taskId }" @tap="onComplete(t)">
            <text class="ttc-btn-txt">标记完成</text>
          </view>
        </view>
      </view>
      <text class="ttc-note">任务进度由系统按真实数据自动结算，奖励为荣誉表彰/资源位</text>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { teamTaskApi, TEAM_TASK_TYPE_LABELS, TEAM_TASK_UNIT, type MyTeamTask } from '@/lib/operator-data'

const loading = ref(true)
const error = ref('')
const inTeam = ref(false)
const items = ref<MyTeamTask[]>([])
const submittingId = ref('')

/** 三态齐全：加载/错误期间展示；成功后仅团队成员可见（未入团队整卡隐藏） */
const visible = computed(() => loading.value || !!error.value || inTeam.value)
const openTasks = computed(() => items.value.filter((t) => t.status === 'OPEN'))
const operatorName = computed(() => items.value[0]?.operatorName || '')

onMounted(load)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await teamTaskApi.listMine()
    inTeam.value = res.inTeam
    items.value = res.items
  } catch (e) {
    // 错误传播给卡片错误态（不回退假数据）
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function onComplete(t: MyTeamTask) {
  if (submittingId.value) return
  submittingId.value = t.taskId
  try {
    await teamTaskApi.complete(t.taskId)
    t.completedAt = new Date().toISOString()
    t.currentValue = 1
    uni.showToast({ title: '已标记完成', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败，请重试', icon: 'none' })
  } finally {
    submittingId.value = ''
  }
}

function typeLabel(type: string) { return TEAM_TASK_TYPE_LABELS[type] || type }
function unitOf(type: string) { return TEAM_TASK_UNIT[type] || '' }
function percent(t: MyTeamTask) {
  if (!t.targetValue) return 0
  return Math.min(100, Math.round((t.currentValue / t.targetValue) * 100))
}
function daysLeft(deadline: string) {
  const d = new Date(deadline)
  if (Number.isNaN(d.getTime())) return 99
  return Math.ceil((d.getTime() - Date.now()) / 86400_000)
}
function deadlineText(deadline: string) {
  const n = daysLeft(deadline)
  if (n < 0) return '已截止'
  if (n === 0) return '今日截止'
  return `剩 ${n} 天`
}
</script>

<style scoped lang="scss">
.ttc-card { margin: 0 24rpx 24rpx; padding: 28rpx; border-radius: 24rpx; background: #ffffff; }

.ttc-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.ttc-title { font-size: 30rpx; font-weight: 700; color: #1a1a1a; }
.ttc-count { min-width: 32rpx; height: 32rpx; padding: 0 8rpx; border-radius: 999rpx; background: #c41e3a; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.ttc-count-txt { font-size: 20rpx; font-weight: 600; color: #fff; }
.ttc-from { margin-left: auto; font-size: 22rpx; color: #999; }

.ttc-state { padding: 24rpx 0 8rpx; display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.ttc-sk { width: 100%; height: 72rpx; border-radius: 12rpx; background: #f3f0ea; opacity: 0.7; }
.ttc-err { font-size: 24rpx; color: #ef4444; }
.ttc-retry { padding: 8rpx 36rpx; border-radius: 999rpx; background: #c41e3a; }
.ttc-retry-txt { font-size: 24rpx; color: #fff; }
.ttc-empty { font-size: 24rpx; color: #9ca3af; padding: 8rpx 0; }

.ttc-item { margin-top: 20rpx; padding: 20rpx; border-radius: 16rpx; background: #fafafa; }
.ttc-item-head { display: flex; align-items: center; gap: 12rpx; }
.ttc-kind { padding: 2rpx 14rpx; border-radius: 8rpx; background: #ffedd5; flex-shrink: 0;
  &.recruit { background: #dbeafe; }
  &.sales { background: #dcfce7; }
  &.custom { background: #f3e8ff; }
}
.ttc-kind-txt { font-size: 20rpx; font-weight: 600; color: #9a3412; }
.ttc-item-title { flex: 1; min-width: 0; font-size: 26rpx; font-weight: 600; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ttc-deadline { font-size: 22rpx; color: #999; flex-shrink: 0;
  &.urgent { color: #f59e0b; font-weight: 600; }
}
.ttc-done { font-size: 22rpx; font-weight: 600; color: #16a34a; flex-shrink: 0; }
.ttc-desc { display: block; margin-top: 10rpx; font-size: 22rpx; color: #8a8178; line-height: 1.5; }

.ttc-progress { display: flex; align-items: center; gap: 16rpx; margin-top: 16rpx; }
.ttc-bar-track { flex: 1; height: 14rpx; border-radius: 999rpx; background: #eee7db; overflow: hidden; }
.ttc-bar-fill { height: 100%; border-radius: 999rpx; background: linear-gradient(90deg, #c41e3a 0%, #e85d75 100%); transition: width 0.3s;
  &.full { background: #16a34a; }
}
.ttc-progress-txt { font-size: 22rpx; color: #8a8178; flex-shrink: 0; }

.ttc-actions { display: flex; justify-content: flex-end; margin-top: 16rpx; }
.ttc-btn { padding: 8rpx 32rpx; border-radius: 999rpx; background: #c41e3a;
  &.disabled { opacity: 0.5; }
}
.ttc-btn-txt { font-size: 24rpx; font-weight: 600; color: #fff; }

.ttc-note { display: block; margin-top: 16rpx; font-size: 20rpx; color: #b8b0a4; }
</style>
