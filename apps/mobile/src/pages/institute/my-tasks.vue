<template>
  <view class="page">
    <!-- 头部 -->
    <view class="nav-header">
      <view class="nav-header-inner">
        <text
          class="nav-back"
          @click="goBack"
        >
          ←
        </text>
        <text class="nav-title">
          我的任务
        </text>
      </view>
    </view>

    <!-- 奖励统计 -->
    <view class="reward-banner">
      <view class="reward-info">
        <text class="reward-label">
          累计奖励
        </text>
        <text class="reward-amount">
          {{ stats?.totalReward || 0 }} <text class="reward-unit">
            积分
          </text>
        </text>
      </view>
      <text class="reward-icon">
        🪙
      </text>
    </view>

    <!-- Tabs -->
    <view class="tabs-bar">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ 'tab-active': activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <text>{{ tab.label }}</text>
        <text
          v-if="tab.count !== undefined && tab.count > 0"
          class="tab-badge"
          :class="{ 'tab-badge-active': activeTab === tab.key }"
        >
          {{ tab.count }}
        </text>
        <view
          v-if="activeTab === tab.key"
          class="tab-indicator"
        />
      </view>
    </view>

    <!-- 任务列表 -->
    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!loading && tasks.length === 0"
      empty-icon="📄"
      :empty-title="emptyTitle"
      :empty-show-action="false"
      @retry="loadData"
    >
      <view class="task-list">
        <view
          v-for="task in tasks"
          :key="task.id"
          class="task-card"
        >
          <view class="task-body">
            <view class="task-header">
              <view
                class="task-type-wrap"
                :style="{ backgroundColor: getTaskTypeColor(task.type) + '20' }"
              >
                <text class="task-type-icon">
                  {{ taskTypeIcon(task.type) }}
                </text>
                <text
                  class="task-type-label"
                  :style="{ color: getTaskTypeColor(task.type) }"
                >
                  {{ getTaskTypeLabel(task.type) }}
                </text>
              </view>
              <text
                class="task-status-tag"
                :style="{ backgroundColor: getTaskStatusColor(task.status), color: '#fff' }"
              >
                {{ getTaskStatusLabel(task.status) }}
              </text>
            </view>
            <text class="task-title">
              {{ task.title }}
            </text>
            <text class="task-desc">
              {{ task.description }}
            </text>

            <!-- 任务要求 -->
            <view
              v-if="task.requirements?.length"
              class="task-reqs"
            >
              <text class="reqs-label">
                任务要求：
              </text>
              <text
                v-for="(req, i) in task.requirements.slice(0, 3)"
                :key="i"
                class="req-tag"
              >
                {{ req }}
              </text>
              <text
                v-if="task.requirements.length > 3"
                class="req-more"
              >
                +{{ task.requirements.length - 3 }}
              </text>
            </view>

            <!-- 信息行 -->
            <view class="task-meta">
              <text :class="getDaysLeftClass(task.deadline)">
                🕐 {{ getDaysLeft(task.deadline) }}
              </text>
              <text class="task-reward">
                🎁 {{ task.reward.points }}积分
              </text>
              <text
                v-if="task.reward.bonus"
                class="task-bonus"
              >
                +¥{{ task.reward.bonus }}
              </text>
            </view>

            <!-- 已提交内容 -->
            <view
              v-if="task.submission"
              class="task-submission"
            >
              <text class="sub-label">
                已提交内容：
              </text>
              <text class="sub-content">
                {{ task.submission.content }}
              </text>
              <text class="sub-time">
                提交于 {{ task.submission.submittedAt }}
              </text>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="task-actions">
            <view
              v-if="task.status === 'available'"
              class="btn btn-primary flex-1"
              @click="handleAcceptTask(task)"
            >
              领取任务
            </view>
            <template v-if="task.status === 'in_progress'">
              <view
                class="btn btn-outline flex-1"
                @click="handleOpenAbandon(task)"
              >
                放弃任务
              </view>
              <view
                class="btn btn-primary flex-1"
                @click="handleOpenSubmit(task)"
              >
                提交成果
              </view>
            </template>
            <view
              v-if="task.status === 'submitted'"
              class="task-status-row"
            >
              <text class="warning-text">
                ⚠
              </text>
              <text class="warning-label">
                等待审核中
              </text>
            </view>
            <view
              v-if="task.status === 'completed'"
              class="task-status-row"
            >
              <text class="success-text">
                ✓
              </text>
              <text class="success-label">
                已完成，奖励已发放
              </text>
            </view>
          </view>
        </view>
      </view>
    </DataState>

    <!-- 提交任务弹窗 -->
    <view
      v-if="submitModalOpen && selectedTask"
      class="modal-mask"
      @click="closeSubmitModal"
    >
      <view
        class="modal-sheet"
        @click.stop
      >
        <view class="modal-header">
          <text class="modal-title">
            提交任务成果
          </text>
          <text
            class="modal-close"
            @click="closeSubmitModal"
          >
            ✕
          </text>
        </view>
        <view class="modal-body">
          <view class="modal-info">
            <text class="info-label">
              任务
            </text>
            <text class="info-value">
              {{ selectedTask.title }}
            </text>
          </view>
          <view class="form-group">
            <text class="form-label">
              成果描述 <text class="required">
                *
              </text>
            </text>
            <textarea
              v-model="submitContent"
              class="form-textarea"
              placeholder="请描述您的任务完成情况和成果..."
            />
          </view>
          <view class="form-group">
            <text class="form-label">
              附件（可选）
            </text>
            <view class="upload-area">
              <text class="upload-icon">
                ⬆️
              </text>
              <text class="upload-text">
                点击上传附件
              </text>
            </view>
          </view>
          <view
            class="btn btn-primary btn-block"
            :class="{ 'btn-disabled': !submitContent.trim() || submitting }"
            @click="handleSubmitTask"
          >
            {{ submitting ? '提交中...' : '确认提交' }}
          </view>
        </view>
      </view>
    </view>

    <!-- 放弃任务弹窗 -->
    <view
      v-if="abandonModalOpen && selectedTask"
      class="modal-mask"
      @click="closeAbandonModal"
    >
      <view
        class="modal-dialog"
        @click.stop
      >
        <text class="dialog-title">
          确认放弃任务
        </text>
        <text class="dialog-desc">
          放弃后任务将重新进入可领取状态，确定要放弃吗？
        </text>
        <view class="form-group">
          <text class="form-label">
            放弃原因（可选）
          </text>
          <textarea
            v-model="abandonReason"
            class="form-textarea"
            placeholder="请输入放弃原因..."
          />
        </view>
        <view class="dialog-actions">
          <view
            class="btn btn-outline flex-1"
            @click="closeAbandonModal"
          >
            取消
          </view>
          <view
            class="btn btn-danger flex-1"
            @click="handleAbandonTask"
          >
            确认放弃
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { ComponentOptions } from 'vue'
import DataState from '../../components/DataState.vue'
import { instituteApi } from '../../api'

interface InstructorTask {
  id: number; title: string; description: string; type: string; status: string
  deadline: string; requirements?: string[]
  reward: { points: number; bonus?: number }
  submission?: { content: string; submittedAt: string }
}
interface TaskStats { available: number; inProgress: number; completed: number; totalReward: number }

type TabType = 'available' | 'in_progress' | 'completed'

const activeTab = ref<TabType>('available')
const tasks = ref<InstructorTask[]>([])
const stats = ref<TaskStats | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
let memberId = 0

const submitModalOpen = ref(false)
const selectedTask = ref<InstructorTask | null>(null)
const submitContent = ref('')
const submitting = ref(false)
const abandonModalOpen = ref(false)
const abandonReason = ref('')

const tabs = computed(() => [
  { key: 'available' as TabType, label: '可领取', count: stats.value?.available },
  { key: 'in_progress' as TabType, label: '进行中', count: stats.value?.inProgress },
  { key: 'completed' as TabType, label: '已完成', count: stats.value?.completed },
])

const emptyTitle = computed(() => {
  const map: Record<TabType, string> = { available: '暂无可领取的任务', in_progress: '暂无进行中的任务', completed: '暂无已完成的任务' }
  return map[activeTab.value]
})

watch(activeTab, () => loadData())
onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.$page?.options || currentPage?.options || {}
  memberId = Number(options.memberId || 0)
  loadData()
})

/**
 * 加载讲师任务列表
 * 当前使用 memberDetail 获取讲师数据，如后端提供独立的任务列表 API 可替换
 * FIXME: 后端暂无独立的任务列表查询接口，后续可新增 instituteApi.getTasks(memberId)
 */
async function loadData() {
  loading.value = true
  loadError.value = null
  try {
    if (!memberId) {
      tasks.value = []
      stats.value = null
      return
    }
    const res: any = await instituteApi.memberDetail(String(memberId))
    // memberDetail 可能返回 tasks/stats 字段，若无则置空
    if (res?.tasks) {
      tasks.value = res.tasks
    } else {
      tasks.value = []
    }
    if (res?.stats) {
      stats.value = res.stats
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally { loading.value = false }
}

function switchTab(tab: TabType) { activeTab.value = tab }

async function handleAcceptTask(task: InstructorTask) {
  uni.showModal({
    title: '提示',
    content: '确定领取此任务吗？领取后请在截止日期前完成。',
    success: async (res) => {
      if (res.confirm) {
        await instituteApi.acceptTask(String(memberId), { taskId: task.id })
        loadData()
      }
    },
  })
}

function handleOpenSubmit(task: InstructorTask) {
  selectedTask.value = task
  submitContent.value = task.submission?.content || ''
  submitModalOpen.value = true
}

function closeSubmitModal() { submitModalOpen.value = false; selectedTask.value = null }

async function handleSubmitTask() {
  if (!selectedTask.value || !submitContent.value.trim()) return
  submitting.value = true
  try {
    await instituteApi.completeTask(String(selectedTask.value.id))
    closeSubmitModal()
    loadData()
  } finally { submitting.value = false }
}

function handleOpenAbandon(task: InstructorTask) {
  selectedTask.value = task
  abandonReason.value = ''
  abandonModalOpen.value = true
}

function closeAbandonModal() { abandonModalOpen.value = false; selectedTask.value = null }

async function handleAbandonTask() {
  if (!selectedTask.value) return
  await instituteApi.acceptTask(String(memberId), { taskId: selectedTask.value.id, abandon: true, reason: abandonReason.value })
  closeAbandonModal()
  loadData()
}

function getDaysLeft(deadline: string): string {
  const now = Date.now()
  const end = new Date(deadline).getTime()
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  if (diff < 0) return '已过期'
  if (diff === 0) return '今天截止'
  return `剩余${diff}天`
}

function getDaysLeftClass(deadline: string): string {
  return getDaysLeft(deadline).includes('已过期') ? 'text-danger' : 'meta-text'
}

function taskTypeIcon(type: string): string {
  const map: Record<string, string> = { course: '🎬', article: '📄', qa: '💬', live: '📡', review: '✓', other: '⋮' }
  return map[type] || '⋮'
}

function getTaskTypeLabel(t: string): string {
  const map: Record<string, string> = { course: '课程', article: '文章', qa: '问答', live: '直播', review: '审核', other: '其他' }
  return map[t] || t
}
function getTaskTypeColor(t: string): string {
  const map: Record<string, string> = { course: '#C41E3A', article: '#1890ff', qa: '#52c41a', live: '#C9A96E', review: '#722ed1', other: '#999' }
  return map[t] || '#999'
}
function getTaskStatusLabel(s: string): string {
  const map: Record<string, string> = { available: '可领取', in_progress: '进行中', submitted: '已提交', completed: '已完成', abandoned: '已放弃' }
  return map[s] || s
}
function getTaskStatusColor(s: string): string {
  const map: Record<string, string> = { available: '#C41E3A', in_progress: '#C9A96E', submitted: '#fa8c16', completed: '#52c41a', abandoned: '#999' }
  return map[s] || '#999'
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }

/* 导航 */
.nav-header { position: sticky; top: 0; z-index: 10; background: rgba(245,240,232,0.95); border-bottom: 1rpx solid #E5E1DB; padding: 20rpx 24rpx; }
.nav-header-inner { display: flex; align-items: center; gap: 16rpx; }
.nav-back { font-size: 36rpx; color: #2C2C2C; padding: 4rpx; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }

/* 奖励 */
.reward-banner { padding: 24rpx; background: linear-gradient(90deg, rgba(196,30,58,0.1), rgba(196,30,58,0.05)); display: flex; align-items: center; justify-content: space-between; }
.reward-label { display: block; font-size: 24rpx; color: #666; }
.reward-amount { display: block; font-size: 48rpx; font-weight: bold; color: #C41E3A; }
.reward-unit { font-size: 24rpx; font-weight: normal; }
.reward-icon { font-size: 80rpx; opacity: 0.3; }

/* Tabs */
.tabs-bar { position: sticky; top: 88rpx; z-index: 10; background: #F5F0E8; border-bottom: 1rpx solid #E5E1DB; display: flex; }
.tab { flex: 1; text-align: center; padding: 20rpx 0; font-size: 26rpx; color: #999; position: relative; display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.tab-active { color: #C41E3A; font-weight: 500; }
.tab-badge { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 20rpx; background: #F5F0E8; color: #999; }
.tab-badge-active { background: rgba(196,30,58,0.1); color: #C41E3A; }
.tab-indicator { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 80rpx; height: 4rpx; background: #C41E3A; border-radius: 4rpx; }

/* 任务列表 */
.task-list { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.task-card { background: #fff; border-radius: 16rpx; border: 1rpx solid #E5E1DB; overflow: hidden; }
.task-body { padding: 24rpx; }
.task-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12rpx; }
.task-type-wrap { display: inline-flex; align-items: center; gap: 8rpx; padding: 6rpx 16rpx; border-radius: 20rpx; }
.task-type-icon { font-size: 24rpx; }
.task-type-label { font-size: 22rpx; }
.task-status-tag { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 20rpx; flex-shrink: 0; }
.task-title { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 8rpx; }
.task-desc { display: block; font-size: 24rpx; color: #666; line-height: 1.5; margin-bottom: 16rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.task-reqs { margin-bottom: 16rpx; }
.reqs-label { display: block; font-size: 22rpx; color: #999; margin-bottom: 8rpx; }
.req-tag { display: inline-block; font-size: 22rpx; padding: 4rpx 12rpx; background: #F5F0E8; border-radius: 20rpx; color: #666; margin-right: 4rpx; }
.req-more { font-size: 22rpx; color: #999; }
.task-meta { display: flex; align-items: center; gap: 24rpx; font-size: 24rpx; }
.meta-text { color: #999; }
.text-danger { color: #ff4d4f; }
.task-reward { color: #C41E3A; }
.task-bonus { color: #C9A96E; }
.task-submission { margin-top: 16rpx; padding: 16rpx; background: rgba(245,240,232,0.5); border-radius: 12rpx; }
.sub-label { display: block; font-size: 22rpx; color: #999; margin-bottom: 4rpx; }
.sub-content { display: block; font-size: 24rpx; color: #666; margin-bottom: 4rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.sub-time { display: block; font-size: 22rpx; color: #ccc; }

/* 操作 */
.task-actions { display: flex; gap: 12rpx; padding: 16rpx 24rpx; border-top: 1rpx solid #E5E1DB; }
.task-status-row { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.warning-text { font-size: 28rpx; color: #fa8c16; }
.warning-label { font-size: 24rpx; color: #fa8c16; }
.success-text { font-size: 28rpx; color: #52c41a; }
.success-label { font-size: 24rpx; color: #52c41a; }
.flex-1 { flex: 1; }
.btn { display: flex; align-items: center; justify-content: center; padding: 16rpx 24rpx; border-radius: 12rpx; font-size: 26rpx; font-weight: 500; }
.btn-primary { background: #C41E3A; color: #fff; }
.btn-outline { background: transparent; color: #C41E3A; border: 1rpx solid #C41E3A; }
.btn-danger { background: #ff4d4f; color: #fff; }
.btn-block { width: 100%; box-sizing: border-box; }
.btn-disabled { opacity: 0.6; }

/* 弹窗 */
.modal-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); display: flex; }
.modal-sheet { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; max-height: 80vh; overflow-y: auto; margin-top: auto; }
.modal-dialog { width: 80%; max-width: 600rpx; background: #fff; border-radius: 16rpx; padding: 32rpx; margin: auto; }
.modal-header { position: sticky; top: 0; background: #fff; display: flex; align-items: center; justify-content: space-between; padding: 24rpx; border-bottom: 1rpx solid #E5E1DB; }
.modal-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.modal-close { font-size: 32rpx; color: #999; padding: 8rpx; }
.modal-body { padding: 24rpx; }
.modal-info { margin-bottom: 24rpx; }
.info-label { display: block; font-size: 22rpx; color: #999; margin-bottom: 4rpx; }
.info-value { display: block; font-size: 26rpx; color: #2C2C2C; font-weight: 500; }
.dialog-title { display: block; font-size: 30rpx; font-weight: 600; color: #2C2C2C; text-align: center; margin-bottom: 16rpx; }
.dialog-desc { display: block; font-size: 26rpx; color: #666; text-align: center; margin-bottom: 24rpx; }
.dialog-actions { display: flex; gap: 16rpx; margin-top: 24rpx; }

/* 表单 */
.form-group { margin-bottom: 20rpx; }
.form-label { display: block; font-size: 24rpx; color: #666; margin-bottom: 12rpx; }
.required { color: #ff4d4f; }
.form-textarea { width: 100%; padding: 20rpx; background: #F5F0E8; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 26rpx; color: #2C2C2C; min-height: 160rpx; box-sizing: border-box; }
.upload-area { width: 100%; padding: 40rpx; border: 2rpx dashed #E5E1DB; border-radius: 12rpx; text-align: center; box-sizing: border-box; }
.upload-icon { display: block; font-size: 64rpx; margin-bottom: 8rpx; }
.upload-text { font-size: 24rpx; color: #999; }
</style>
