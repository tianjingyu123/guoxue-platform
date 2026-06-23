<template>
  <view class="page">
    <!-- 头部 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">我的任务</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- 累计奖励统计 -->
      <view class="reward-card">
        <view>
          <text class="reward-label">累计奖励</text>
          <view class="reward-value-row">
            <text class="reward-value">{{ taskStats.totalReward }}</text>
            <text class="reward-unit">积分</text>
          </view>
        </view>
        <app-icon name="coins" :size="40" color="rgba(196,30,58,0.3)" />
      </view>

      <!-- Tab 切换 -->
      <view class="tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ 'tab-active': activeTab === tab.key }"
          @tap="activeTab = tab.key"
        >
          <text class="tab-text" :class="{ 'tab-text-active': activeTab === tab.key }">{{ tab.label }}</text>
          <text v-if="tab.count > 0" class="tab-badge" :class="{ 'tab-badge-active': activeTab === tab.key }">{{ tab.count }}</text>
          <view v-if="activeTab === tab.key" class="tab-underline" />
        </view>
      </view>

      <!-- 任务列表 -->
      <view class="list">
        <view v-if="filteredTasks.length === 0" class="empty">
          <view class="empty-icon">
            <app-icon name="file-text" :size="32" color="#9ca3af" />
          </view>
          <text class="empty-text">{{ emptyText }}</text>
        </view>

        <view v-for="task in filteredTasks" :key="task.id" class="task-card">
          <view class="task-body">
            <!-- 标题行 -->
            <view class="task-head">
              <view class="task-head-left">
                <view class="type-badge" :style="{ color: taskTypeColor[task.type].color, background: taskTypeColor[task.type].bg }">
                  <app-icon :name="typeIcon(task.type)" :size="13" :color="taskTypeColor[task.type].color" />
                  <text class="type-badge-text" :style="{ color: taskTypeColor[task.type].color }">{{ taskTypeLabel[task.type] }}</text>
                </view>
                <text class="task-title">{{ task.title }}</text>
              </view>
              <text class="status-badge" :style="{ color: taskStatusColor[task.status].color, background: taskStatusColor[task.status].bg }">{{ taskStatusLabel[task.status] }}</text>
            </view>

            <!-- 描述 -->
            <text class="task-desc">{{ task.description }}</text>

            <!-- 要求 -->
            <view v-if="task.requirements && task.requirements.length" class="req">
              <text class="req-label">任务要求：</text>
              <view class="req-tags">
                <text v-for="(r, i) in task.requirements.slice(0, 3)" :key="i" class="req-tag">{{ r }}</text>
                <text v-if="task.requirements.length > 3" class="req-more">+{{ task.requirements.length - 3 }}</text>
              </view>
            </view>

            <!-- 信息行 -->
            <view class="info-row">
              <view class="info-item">
                <app-icon name="clock" :size="14" color="#6b7280" />
                <text class="info-text" :class="{ 'info-expired': daysLeft(task.deadline) === '已过期' }">{{ daysLeft(task.deadline) }}</text>
              </view>
              <view class="info-item">
                <app-icon name="gift" :size="14" color="#c41e3a" />
                <text class="info-reward">{{ task.reward.points }}积分</text>
                <text v-if="task.reward.bonus" class="info-bonus">+¥{{ task.reward.bonus }}</text>
              </view>
            </view>

            <!-- 已提交内容 -->
            <view v-if="task.submission" class="submission">
              <text class="submission-label">已提交内容：</text>
              <text class="submission-content">{{ task.submission.content }}</text>
              <text class="submission-time">提交于 {{ task.submission.submittedAt }}</text>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="task-actions">
            <view v-if="task.status === 'available'" class="btn btn-primary" @tap="acceptTask(task)">
              <text class="btn-primary-text">领取任务</text>
            </view>
            <template v-else-if="task.status === 'in_progress'">
              <view class="btn btn-outline" @tap="openAbandon(task)">
                <text class="btn-outline-text">放弃任务</text>
              </view>
              <view class="btn btn-primary" @tap="openSubmit(task)">
                <text class="btn-primary-text">提交成果</text>
              </view>
            </template>
            <view v-else-if="task.status === 'submitted'" class="status-hint status-hint-orange">
              <app-icon name="alert-circle" :size="14" color="#ea580c" />
              <text class="status-hint-text" style="color:#ea580c">等待审核中</text>
            </view>
            <view v-else-if="task.status === 'completed'" class="status-hint status-hint-green">
              <app-icon name="check-circle" :size="14" color="#16a34a" />
              <text class="status-hint-text" style="color:#16a34a">已完成，奖励已发放</text>
            </view>
          </view>
        </view>
      </view>
      <view style="height: 24px" />
    </scroll-view>

    <!-- 提交任务弹窗 -->
    <view v-if="submitModalOpen" class="mask mask-bottom" @tap="submitModalOpen = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">提交任务成果</text>
          <view @tap="submitModalOpen = false"><app-icon name="x" :size="20" color="#1a1a1a" /></view>
        </view>
        <view class="sheet-body">
          <view>
            <text class="field-hint">任务</text>
            <text class="field-value">{{ selectedTask?.title }}</text>
          </view>
          <view>
            <text class="field-label">成果描述 <text class="req-star">*</text></text>
            <textarea v-model="submitContent" class="textarea" placeholder="请描述您的任务完成情况和成果..." :maxlength="-1" />
          </view>
          <view>
            <text class="field-label">附件（可选）</text>
            <view class="upload-box">
              <app-icon name="upload" :size="32" color="#9ca3af" />
              <text class="upload-text">点击上传附件</text>
            </view>
          </view>
          <view class="btn btn-primary btn-block" :class="{ 'btn-disabled': !submitContent.trim() || submitting }" @tap="submitTask">
            <text class="btn-primary-text">{{ submitting ? '提交中...' : '确认提交' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 放弃任务弹窗 -->
    <view v-if="abandonModalOpen" class="mask mask-center" @tap="abandonModalOpen = false">
      <view class="dialog" @tap.stop>
        <view class="dialog-head">
          <text class="dialog-title">确认放弃任务</text>
        </view>
        <view class="dialog-body">
          <text class="dialog-desc">放弃后任务将重新进入可领取状态，确定要放弃吗？</text>
          <view>
            <text class="field-label">放弃原因（可选）</text>
            <textarea v-model="abandonReason" class="textarea textarea-sm" placeholder="请输入放弃原因..." :maxlength="-1" />
          </view>
          <view class="dialog-actions">
            <view class="btn btn-outline btn-flex" @tap="abandonModalOpen = false">
              <text class="btn-outline-text">取消</text>
            </view>
            <view class="btn btn-danger btn-flex" @tap="abandonTask">
              <text class="btn-danger-text">确认放弃</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  instructorTasks, taskStats,
  taskTypeLabel, taskTypeColor, taskStatusLabel, taskStatusColor,
  type InstructorTask, type TaskType,
} from '@/lib/institute-data'

const statusBarHeight = ref(0)
const scrollHeight = ref(600)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  scrollHeight.value = (info.windowHeight || 700) - statusBarHeight.value - 44
} catch (e) {}

type TabType = 'available' | 'in_progress' | 'completed'
const activeTab = ref<TabType>('available')
const tasks = ref<InstructorTask[]>([...instructorTasks])

const tabs = computed(() => [
  { key: 'available' as TabType, label: '可领取', count: taskStats.available },
  { key: 'in_progress' as TabType, label: '进行中', count: taskStats.inProgress },
  { key: 'completed' as TabType, label: '已完成', count: taskStats.completed },
])

const filteredTasks = computed(() => tasks.value.filter(t => {
  if (activeTab.value === 'in_progress') return t.status === 'in_progress' || t.status === 'submitted'
  return t.status === activeTab.value
}))

const emptyText = computed(() => {
  if (activeTab.value === 'available') return '暂无可领取的任务'
  if (activeTab.value === 'in_progress') return '暂无进行中的任务'
  return '暂无已完成的任务'
})

const typeIconMap: Record<TaskType, string> = {
  course: 'video', article: 'file-text', qa: 'message-square', live: 'radio', review: 'clipboard-check', other: 'more-horizontal',
}
const typeIcon = (t: TaskType) => typeIconMap[t] || 'more-horizontal'

function daysLeft(deadline: string) {
  const now = new Date()
  const end = new Date(deadline.replace(/-/g, '/'))
  const diff = Math.ceil((end.getTime() - now.getTime()) / 86400000)
  if (diff < 0) return '已过期'
  if (diff === 0) return '今天截止'
  return `剩余${diff}天`
}

const submitModalOpen = ref(false)
const abandonModalOpen = ref(false)
const selectedTask = ref<InstructorTask | null>(null)
const submitContent = ref('')
const abandonReason = ref('')
const submitting = ref(false)

function acceptTask(task: InstructorTask) {
  uni.showModal({
    title: '领取任务',
    content: '确定领取此任务吗？领取后请在截止日期前完成。',
    success: (res) => {
      if (res.confirm) {
        task.status = 'in_progress'
        task.acceptedAt = new Date().toISOString().slice(0, 10)
        uni.showToast({ title: '已领取', icon: 'success' })
      }
    },
  })
}

function openSubmit(task: InstructorTask) {
  selectedTask.value = task
  submitContent.value = task.submission?.content || ''
  submitModalOpen.value = true
}

function submitTask() {
  if (!selectedTask.value || !submitContent.value.trim() || submitting.value) return
  submitting.value = true
  setTimeout(() => {
    if (selectedTask.value) {
      selectedTask.value.status = 'submitted'
      selectedTask.value.submission = { content: submitContent.value, submittedAt: new Date().toLocaleString() }
    }
    submitting.value = false
    submitModalOpen.value = false
    selectedTask.value = null
    submitContent.value = ''
    uni.showToast({ title: '已提交', icon: 'success' })
  }, 1000)
}

function openAbandon(task: InstructorTask) {
  selectedTask.value = task
  abandonReason.value = ''
  abandonModalOpen.value = true
}

function abandonTask() {
  if (!selectedTask.value) return
  selectedTask.value.status = 'available'
  abandonModalOpen.value = false
  selectedTask.value = null
  abandonReason.value = ''
  uni.showToast({ title: '已放弃', icon: 'none' })
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: sticky; top: 0; z-index: 20; background: #fff; border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 32px; }
.scroll { width: 100%; }

.reward-card { display: flex; align-items: center; justify-content: space-between; padding: 16px; background: linear-gradient(to right, rgba(196,30,58,0.1), rgba(196,30,58,0.05)); }
.reward-label { font-size: 13px; color: #6b7280; }
.reward-value-row { display: flex; align-items: baseline; margin-top: 2px; }
.reward-value { font-size: 26px; font-weight: 700; color: #c41e3a; }
.reward-unit { font-size: 13px; color: #c41e3a; margin-left: 4px; }

.tabs { display: flex; background: #fff; border-bottom: 1px solid #ededed; position: sticky; top: 0; z-index: 10; }
.tab { flex: 1; display: flex; align-items: center; justify-content: center; height: 44px; position: relative; gap: 4px; }
.tab-text { font-size: 14px; color: #6b7280; }
.tab-text-active { color: #c41e3a; font-weight: 500; }
.tab-badge { font-size: 11px; padding: 1px 6px; border-radius: 999px; background: #f3f4f6; color: #6b7280; }
.tab-badge-active { background: rgba(196,30,58,0.1); color: #c41e3a; }
.tab-underline { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 48px; height: 2px; background: #c41e3a; border-radius: 2px; }

.list { padding: 16px; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 48px 0; }
.empty-icon { width: 64px; height: 64px; border-radius: 999px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.empty-text { font-size: 14px; color: #6b7280; }

.task-card { background: #fff; border-radius: 12px; border: 1px solid #ededed; overflow: hidden; margin-bottom: 12px; }
.task-body { padding: 16px; }
.task-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; gap: 8px; }
.task-head-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.type-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; flex-shrink: 0; }
.type-badge-text { font-size: 11px; }
.task-title { font-size: 15px; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; flex-shrink: 0; }
.task-desc { display: block; font-size: 13px; color: #6b7280; line-height: 1.5; margin-bottom: 12px; }

.req { margin-bottom: 12px; }
.req-label { font-size: 11px; color: #6b7280; display: block; margin-bottom: 4px; }
.req-tags { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.req-tag { font-size: 11px; padding: 2px 8px; background: #f3f4f6; border-radius: 999px; color: #4b5563; }
.req-more { font-size: 11px; color: #6b7280; }

.info-row { display: flex; align-items: center; gap: 16px; }
.info-item { display: flex; align-items: center; gap: 4px; }
.info-text { font-size: 13px; color: #6b7280; }
.info-expired { color: #ef4444; }
.info-reward { font-size: 13px; color: #c41e3a; }
.info-bonus { font-size: 13px; color: #d97706; }

.submission { margin-top: 12px; padding: 12px; background: rgba(0,0,0,0.03); border-radius: 8px; }
.submission-label { font-size: 11px; color: #6b7280; display: block; margin-bottom: 4px; }
.submission-content { font-size: 13px; color: #1a1a1a; display: block; line-height: 1.5; }
.submission-time { font-size: 11px; color: #6b7280; display: block; margin-top: 4px; }

.task-actions { border-top: 1px solid #ededed; padding: 12px; display: flex; gap: 8px; }
.btn { height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.btn-primary { flex: 1; background: #c41e3a; }
.btn-primary-text { font-size: 14px; color: #fff; font-weight: 500; }
.btn-outline { flex: 1; border: 1px solid #d1d5db; background: #fff; }
.btn-outline-text { font-size: 14px; color: #4b5563; }
.btn-danger { background: #dc2626; }
.btn-danger-text { font-size: 14px; color: #fff; font-weight: 500; }
.btn-disabled { opacity: 0.5; }
.btn-block { width: 100%; height: 44px; }
.btn-flex { flex: 1; height: 42px; }
.status-hint { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; }
.status-hint-text { font-size: 13px; }

.mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); }
.mask-bottom { display: flex; align-items: flex-end; }
.mask-center { display: flex; align-items: center; justify-content: center; padding: 16px; }
.sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; max-height: 80vh; overflow-y: auto; }
.sheet-head { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #ededed; padding: 16px; display: flex; align-items: center; justify-content: space-between; }
.sheet-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.sheet-body { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.field-hint { font-size: 13px; color: #6b7280; display: block; margin-bottom: 4px; }
.field-value { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.field-label { font-size: 14px; font-weight: 500; color: #1a1a1a; display: block; margin-bottom: 8px; }
.req-star { color: #ef4444; }
.textarea { width: 100%; box-sizing: border-box; min-height: 110px; padding: 10px 12px; font-size: 14px; background: #fff; border: 1px solid #d1d5db; border-radius: 8px; }
.textarea-sm { min-height: 72px; }
.upload-box { width: 100%; box-sizing: border-box; border: 2px dashed #d1d5db; border-radius: 8px; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.upload-text { font-size: 13px; color: #6b7280; }

.dialog { width: 100%; max-width: 320px; background: #fff; border-radius: 12px; overflow: hidden; }
.dialog-head { padding: 16px; border-bottom: 1px solid #ededed; }
.dialog-title { font-size: 16px; font-weight: 600; color: #1a1a1a; text-align: center; display: block; }
.dialog-body { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.dialog-desc { font-size: 13px; color: #6b7280; text-align: center; line-height: 1.5; }
.dialog-actions { display: flex; gap: 12px; }
</style>
