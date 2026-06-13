<template>
  <view class="min-h-screen bg-background">
    <!-- 头部 -->
    <header class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1 -ml-1"><text class="text-xl leading-none">←</text></view>
          <text class="text-lg font-semibold">我的任务</text>
        </view>
      </view>
    </header>

    <!-- 统计卡片 -->
    <view class="p-4" style="background:linear-gradient(135deg,rgba(196,30,58,0.1),rgba(196,30,58,0.05))">
      <view class="flex items-center justify-between">
        <view>
          <text class="text-sm text-muted-foreground">累计奖励</text>
          <text class="text-2xl font-bold text-primary">
            {{ stats?.totalReward || 0 }}
            <text class="text-sm font-normal ml-1">积分</text>
          </text>
        </view>
        <text class="text-4xl text-primary/30"></text>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="sticky z-10 bg-background border-b border-border" style="top:57px">
      <view class="flex">
        <view v-for="tab in tabs" :key="tab.key as string" @click="activeTab = tab.key"
          class="flex-1 py-3 text-sm font-medium relative text-center"
          :class="activeTab === tab.key ? 'text-primary' : 'text-muted-foreground'">
          <text>{{ tab.label }}</text>
          <text v-if="tab.count !== undefined && tab.count > 0"
            class="ml-1 px-1.5 py-0.5 text-xs rounded-full"
            :class="activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'">{{ tab.count }}</text>
          <view v-if="activeTab === tab.key" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
        </view>
      </view>
    </view>

    <!-- 任务列表 -->
    <view class="p-4 space-y-3">
      <!-- 加载骨架 -->
      <template v-if="loading">
        <view v-for="i in 3" :key="i" class="bg-white rounded-xl p-4 space-y-3" style="border:1px solid rgba(232,224,213,0.6)">
          <view class="flex items-start justify-between">
            <view class="h-5 w-48 rounded bg-muted animate-pulse" />
            <view class="h-5 w-16 rounded bg-muted animate-pulse" />
          </view>
          <view class="h-12 w-full rounded bg-muted animate-pulse" />
          <view class="flex items-center gap-4">
            <view class="h-4 w-20 rounded bg-muted animate-pulse" />
            <view class="h-4 w-24 rounded bg-muted animate-pulse" />
          </view>
        </view>
      </template>

      <!-- 空状态 -->
      <view v-else-if="tasks.length === 0" class="text-center py-12">
        <view class="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <text class="text-3xl text-muted-foreground"></text>
        </view>
        <text class="text-muted-foreground">
          {{ activeTab === 'available' ? '暂无可领取的任务' :
             activeTab === 'in_progress' ? '暂无进行中的任务' : '暂无已完成的任务' }}
        </text>
      </view>

      <!-- 任务卡片 -->
      <view v-else v-for="task in tasks" :key="task.id"
        class="bg-white rounded-xl overflow-hidden" style="border:1px solid rgba(232,224,213,0.6)">
        <view class="p-4">
          <!-- 标题行 -->
          <view class="flex items-start justify-between mb-2">
            <view class="flex items-center gap-2 flex-1 min-w-0">
              <text class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
                :style="`background:${getTaskTypeColor(task.type)}`">
                <text>{{ taskTypeIcon(task.type) }}</text>
                <text>{{ getTaskTypeLabel(task.type) }}</text>
              </text>
              <text class="font-medium" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ task.title }}</text>
            </view>
            <text class="text-xs px-2 py-0.5 rounded-full shrink-0"
              :style="`background:${getTaskStatusColor(task.status)}`">
              {{ getTaskStatusLabel(task.status) }}
            </text>
          </view>

          <!-- 描述 -->
          <text class="text-sm text-muted-foreground block mb-3" style="overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">
            {{ task.description }}
          </text>

          <!-- 要求 -->
          <view v-if="task.requirements && task.requirements.length > 0" class="mb-3">
            <text class="text-xs text-muted-foreground block mb-1">任务要求：</text>
            <view class="flex flex-wrap gap-1">
              <text v-for="(req, i) in task.requirements.slice(0,3)" :key="i"
                class="text-xs px-2 py-0.5 bg-muted rounded-full">{{ req }}</text>
              <text v-if="task.requirements.length > 3" class="text-xs text-muted-foreground">
                +{{ task.requirements.length - 3 }}
              </text>
            </view>
          </view>

          <!-- 信息行 -->
          <view class="flex items-center gap-4 text-sm">
            <view class="flex items-center gap-1 text-muted-foreground">
              <text>🕐</text>
              <text :class="getDaysLeft(task.deadline).includes('已过期') ? 'text-red-500' : ''">
                {{ getDaysLeft(task.deadline) }}
              </text>
            </view>
            <view class="flex items-center gap-1 text-primary">
              <text>🎁</text>
              <text>{{ task.reward.points }}积分</text>
              <text v-if="task.reward.bonus" class="text-amber-600">+¥{{ task.reward.bonus }}</text>
            </view>
          </view>

          <!-- 已提交内容 -->
          <view v-if="task.submission" class="mt-3 p-3 rounded-lg" style="background:rgba(250,248,245,0.5)">
            <text class="text-xs text-muted-foreground block mb-1">已提交内容：</text>
            <text class="text-sm block" style="overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">{{ task.submission.content }}</text>
            <text class="text-xs text-muted-foreground block mt-1">提交于 {{ task.submission.submittedAt }}</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="flex gap-2 p-3" style="border-top:1px solid rgba(232,224,213,0.6)">
          <template v-if="task.status === 'available'">
            <view @click="handleAcceptTask(task)" class="flex-1 py-2.5 bg-primary text-white rounded-full text-center text-sm">领取任务</view>
          </template>
          <template v-else-if="task.status === 'in_progress'">
            <view @click="handleOpenAbandon(task)" class="flex-1 py-2.5 rounded-full text-center text-sm" style="border:1px solid rgba(232,224,213,0.6)">放弃任务</view>
            <view @click="handleOpenSubmit(task)" class="flex-1 py-2.5 bg-primary text-white rounded-full text-center text-sm">提交成果</view>
          </template>
          <template v-else-if="task.status === 'submitted'">
            <view class="flex-1 flex items-center justify-center gap-2 text-orange-600">
              <text></text>
              <text class="text-sm">等待审核中</text>
            </view>
          </template>
          <template v-else-if="task.status === 'completed'">
            <view class="flex-1 flex items-center justify-center gap-2 text-green-600">
              <text>✓</text>
              <text class="text-sm">已完成，奖励已发放</text>
            </view>
          </template>
        </view>
      </view>
    </view>

    <!-- 提交任务弹窗 -->
    <view v-if="submitModalOpen && selectedTask" class="fixed inset-0 z-50 bg-black/50 flex items-end" @click="submitModalOpen = false">
      <view class="w-full bg-background rounded-t-2xl max-h-[80vh] overflow-y-auto" @click.stop>
        <view class="sticky top-0 bg-background p-4 flex items-center justify-between" style="border-bottom:1px solid rgba(232,224,213,0.6)">
          <text class="font-semibold">提交任务成果</text>
          <view @click="submitModalOpen = false" class="p-1"><text class="text-xl">✕</text></view>
        </view>
        <view class="p-4 space-y-4">
          <view>
            <text class="text-sm text-muted-foreground block mb-1">任务</text>
            <text class="font-medium">{{ selectedTask.title }}</text>
          </view>
          <view>
            <text class="text-sm font-medium block mb-2">
              成果描述 <text class="text-red-500">*</text>
            </text>
            <textarea v-model="submitContent" placeholder="请描述您的任务完成情况和成果..."
              rows="5" class="w-full px-3 py-2 rounded-xl text-sm box-border" style="border:1px solid rgba(232,224,213,0.6)"></textarea>
          </view>
          <view>
            <text class="text-sm font-medium block mb-2">附件（可选）</text>
            <view class="w-full py-6 text-center rounded-lg" style="border:2px dashed rgba(232,224,213,0.6)">
              <text class="text-3xl block text-muted-foreground mb-2"></text>
              <text class="text-sm text-muted-foreground">点击上传附件</text>
            </view>
          </view>
          <view @click="handleSubmitTask"
            class="w-full py-3 rounded-full text-center text-sm font-medium"
            :class="submitContent.trim() && !submitting ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'">
            {{ submitting ? '提交中...' : '确认提交' }}
          </view>
        </view>
      </view>
    </view>

    <!-- 放弃任务弹窗 -->
    <view v-if="abandonModalOpen && selectedTask" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" @click="abandonModalOpen = false">
      <view class="w-full max-w-sm bg-background rounded-xl overflow-hidden" @click.stop>
        <view class="p-4" style="border-bottom:1px solid rgba(232,224,213,0.6)">
          <text class="font-semibold text-center block">确认放弃任务</text>
        </view>
        <view class="p-4 space-y-4">
          <text class="text-sm text-muted-foreground text-center block">放弃后任务将重新进入可领取状态，确定要放弃吗？</text>
          <view>
            <text class="text-sm font-medium block mb-2">放弃原因（可选）</text>
            <textarea v-model="abandonReason" placeholder="请输入放弃原因..."
              rows="3" class="w-full px-3 py-2 rounded-xl text-sm box-border" style="border:1px solid rgba(232,224,213,0.6)"></textarea>
          </view>
          <view class="flex gap-3">
            <view @click="abandonModalOpen = false"
              class="flex-1 py-2.5 rounded-full text-center text-sm" style="border:1px solid rgba(232,224,213,0.6)">取消</view>
            <view @click="handleAbandonTask"
              class="flex-1 py-2.5 rounded-full text-center text-sm bg-red-500 text-white">确认放弃</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

type TabType = 'available' | 'in_progress' | 'completed'
type TaskStatus = 'available' | 'in_progress' | 'submitted' | 'completed' | 'abandoned'

interface TaskReward {
  points: number
  bonus?: number
}

interface TaskSubmission {
  content: string
  submittedAt: string
  attachments?: string[]
}

interface InstructorTask {
  id: number
  title: string
  description: string
  type: string
  status: TaskStatus
  deadline: string
  reward: TaskReward
  requirements?: string[]
  submission?: TaskSubmission
  createdAt: string
}

interface TaskStats {
  available: number
  inProgress: number
  completed: number
  totalReward: number
}

const activeTab = ref<TabType>('available')
const tasks = ref<InstructorTask[]>([])
const stats = ref<TaskStats | null>(null)
const loading = ref(true)

// 提交任务弹窗
const submitModalOpen = ref(false)
const selectedTask = ref<InstructorTask | null>(null)
const submitContent = ref('')
const submitting = ref(false)

// 放弃任务弹窗
const abandonModalOpen = ref(false)
const abandonReason = ref('')

const tabs = computed(() => [
  { key: 'available' as TabType, label: '可领取', count: stats.value?.available },
  { key: 'in_progress' as TabType, label: '进行中', count: stats.value?.inProgress },
  { key: 'completed' as TabType, label: '已完成', count: stats.value?.completed },
])

// 模拟数据
const mockTasks: InstructorTask[] = [
  {
    id: 1, title: '完成本月线上直播课程', description: '根据课程大纲，完成本月2场线上直播教学任务，每场时长不少于60分钟。',
    type: 'live', status: 'available', deadline: '2024-04-30', reward: { points: 500, bonus: 200 },
    requirements: ['直播时长≥60分钟', '互动问答环节≥15分钟', '提供回放'], createdAt: '2024-03-01'
  },
  {
    id: 2, title: '撰写一篇学术文章', description: '围绕国学主题撰写一篇不少于3000字的学术文章，发表在研究院期刊。',
    type: 'article', status: 'in_progress', deadline: '2024-04-15', reward: { points: 300 },
    requirements: ['原创文章', '字数≥3000', '主题需审核通过'], createdAt: '2024-03-05'
  },
  {
    id: 3, title: '线上答疑互动', description: '在研究院社群内完成一次线上答疑互动，回答学员提问不少于20个。',
    type: 'qa', status: 'completed', deadline: '2024-03-20', reward: { points: 200, bonus: 100 },
    submission: { content: '已完成线上答疑，共回答学员问题32个。', submittedAt: '2024-03-18' }, createdAt: '2024-03-01'
  },
]

const mockStats: TaskStats = { available: 1, inProgress: 1, completed: 1, totalReward: 1000 }

// 模拟数据加载
stats.value = mockStats
tasks.value = mockTasks.filter(t => {
  if (activeTab.value === 'available') return t.status === 'available'
  if (activeTab.value === 'in_progress') return t.status === 'in_progress' || t.status === 'submitted'
  if (activeTab.value === 'completed') return t.status === 'completed'
  return true
})
loading.value = false

function getTaskTypeColor(type: string): string {
  const colors: Record<string, string> = {
    course: 'rgba(59,130,246,0.1)',
    article: 'rgba(168,85,247,0.1)',
    qa: 'rgba(34,197,94,0.1)',
    live: 'rgba(217,119,6,0.1)',
    review: 'rgba(196,30,58,0.1)',
    other: 'rgba(153,153,153,0.1)',
  }
  return colors[type] || colors.other
}

function getTaskTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    course: '课程', article: '文章', qa: '问答', live: '直播', review: '审校', other: '其他',
  }
  return labels[type] || labels.other
}

function getTaskStatusColor(status: string): string {
  const colors: Record<string, string> = {
    available: 'rgba(59,130,246,0.1)',
    in_progress: 'rgba(217,119,6,0.1)',
    submitted: 'rgba(168,85,247,0.1)',
    completed: 'rgba(34,197,94,0.1)',
    abandoned: 'rgba(153,153,153,0.1)',
  }
  return colors[status] || colors.abandoned
}

function getTaskStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    available: '可领取', in_progress: '进行中', submitted: '已提交', completed: '已完成', abandoned: '已放弃',
  }
  return labels[status] || '未知'
}

function taskTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    course: '🎥', article: '', qa: '', live: '📡', review: '', other: '',
  }
  return icons[type] || icons.other
}

function getDaysLeft(deadline: string): string {
  const now = new Date()
  const end = new Date(deadline)
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return '已过期'
  if (diff === 0) return '今天截止'
  return `剩余${diff}天`
}

function handleAcceptTask(task: InstructorTask) {
  uni.showModal({
    title: '确认领取',
    content: '确定领取此任务吗？领取后请在截止日期前完成。',
    success: (res) => {
      if (res.confirm) {
        tasks.value = tasks.value.filter(t => t.id !== task.id)
        uni.showToast({ title: '领取成功', icon: 'success' })
      }
    }
  })
}

function handleOpenSubmit(task: InstructorTask) {
  selectedTask.value = task
  submitContent.value = task.submission?.content || ''
  submitModalOpen.value = true
}

function handleSubmitTask() {
  if (!selectedTask.value || !submitContent.value.trim()) return
  submitting.value = true
  setTimeout(() => {
    const task = tasks.value.find(t => t.id === selectedTask.value!.id)
    if (task) {
      task.status = 'submitted'
      task.submission = { content: submitContent.value, submittedAt: new Date().toISOString().slice(0, 10) }
    }
    submitModalOpen.value = false
    selectedTask.value = null
    submitContent.value = ''
    submitting.value = false
    uni.showToast({ title: '提交成功', icon: 'success' })
  }, 1000)
}

function handleOpenAbandon(task: InstructorTask) {
  selectedTask.value = task
  abandonReason.value = ''
  abandonModalOpen.value = true
}

function handleAbandonTask() {
  if (!selectedTask.value) return
  tasks.value = tasks.value.filter(t => t.id !== selectedTask.value!.id)
  abandonModalOpen.value = false
  selectedTask.value = null
  abandonReason.value = ''
  uni.showToast({ title: '已放弃任务', icon: 'none' })
}

function goBack() { uni.navigateBack() }
</script>
<style scoped>
/* 样式由 Tailwind 处理 */
</style>
