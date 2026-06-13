<template>
  <view class="min-h-screen bg-background max-w-lg mx-auto pb-24">
    <!-- Header -->
    <view class="sticky top-0 z-50 bg-primary text-white">
      <view class="flex items-center justify-between h-12 px-4">
        <view @click="goBack" class="p-1 -ml-1">
          <text class="text-white text-lg">←</text>
        </view>
        <text class="font-semibold text-base text-white">我的研究院</text>
        <view class="text-xs opacity-80" @click="goInstitute">
          <text>研究院首页</text>
        </view>
      </view>
    </view>

    <!-- Member Info -->
    <view class="bg-gradient-to-b from-primary to-primary/80 px-4 pb-6">
      <view class="bg-white/10 backdrop-blur rounded-2xl p-4">
        <view class="flex items-center gap-3 mb-4">
          <view class="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30">
            <text class="text-white text-xl font-bold">{{ memberInfo.name[0] }}</text>
          </view>
          <view class="flex-1">
            <view class="flex items-center gap-2">
              <text class="font-bold text-white">{{ memberInfo.name }}</text>
              <text class="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full">研究院成员</text>
            </view>
            <text class="text-xs text-white/70 mt-0.5 block">{{ memberInfo.circleName }}</text>
          </view>
        </view>

        <!-- Validity -->
        <view class="flex items-center justify-between mb-2">
          <text class="text-xs text-white/70">会员有效期</text>
          <text class="text-xs text-white">{{ memberInfo.joinDate }} ~ {{ memberInfo.expireDate }}</text>
        </view>
        <view class="flex items-center gap-2">
          <view class="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <view :style="{ width: daysProgress + '%' }" class="h-full bg-white rounded-full" />
          </view>
          <text :class="['text-xs font-medium', memberInfo.daysLeft <= 30 ? 'text-amber-300' : 'text-white']">剩余{{ memberInfo.daysLeft }}天</text>
        </view>

        <view v-if="memberInfo.daysLeft <= 30" class="mt-3 flex items-center justify-between p-2 bg-amber-500/20 rounded-lg">
          <view class="flex items-center gap-2">
            <text class="text-amber-300"></text>
            <text class="text-xs text-amber-100">会员即将到期</text>
          </view>
          <view class="h-6 px-3 bg-white text-primary rounded-full text-xs flex items-center" @click="goRenew">
            <text>立即续费</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Stats Cards -->
    <view class="px-4 -mt-3">
      <view class="bg-white rounded-xl p-4 border border-border">
        <view class="grid grid-cols-3 gap-4 text-center">
          <view>
            <text class="text-2xl font-bold text-primary block">{{ taskCompletionRate }}%</text>
            <text class="text-[10px] text-muted-foreground">任务完成率</text>
          </view>
          <view>
            <text class="text-2xl font-bold text-green-600 block">¥{{ totalIncome }}</text>
            <text class="text-[10px] text-muted-foreground">累计收益</text>
          </view>
          <view>
            <text class="text-2xl font-bold text-amber-600 block">{{ depositStatusText }}</text>
            <text class="text-[10px] text-muted-foreground">保证金状态</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Tabs -->
    <view class="sticky top-12 z-40 bg-white border-b border-border mt-4">
      <view class="flex items-center px-4">
        <view
          v-for="tab in pageTabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="['flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2', activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground']"
        >
          <text>{{ tab.icon }}</text>
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <!-- Content Area -->
    <view class="p-4 space-y-4">
      <!-- Tasks Tab -->
      <template v-if="activeTab === 'tasks'">
        <view class="bg-white rounded-xl p-4 border border-border bg-gradient-to-r from-primary/10 to-primary/5">
          <view class="flex items-center justify-between mb-3">
            <text class="font-medium flex items-center gap-2 text-foreground">
              <text></text>
              <text>任务完成情况</text>
            </text>
            <text class="text-xs text-muted-foreground">完成全部任务可退还保证金</text>
          </view>
          <view class="flex items-center gap-3">
            <view class="relative w-20 h-20">
              <svg class="w-full h-full" viewBox="0 0 100 100" style="transform: rotate(-90deg);">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#E8E0D5" stroke-width="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#C41E3A" stroke-width="8" stroke-linecap="round"
                  :stroke-dasharray="taskCompletionRate * 2.51 + ' 251'" />
              </svg>
              <view class="absolute inset-0 flex items-center justify-center">
                <text class="text-lg font-bold text-foreground">{{ taskCompletionRate }}%</text>
              </view>
            </view>
            <view class="flex-1 space-y-1">
              <view class="flex items-center justify-between text-xs">
                <text class="text-muted-foreground">月度任务</text>
                <text class="text-green-600">2/2 已完成</text>
              </view>
              <view class="flex items-center justify-between text-xs">
                <text class="text-muted-foreground">季度任务</text>
                <text class="text-green-600">1/1 已完成</text>
              </view>
              <view class="flex items-center justify-between text-xs">
                <text class="text-muted-foreground">年度任务</text>
                <text class="text-amber-600">0/1 进行中</text>
              </view>
            </view>
          </view>
        </view>

        <!-- Task List -->
        <view class="space-y-3">
          <view v-for="task in tasks" :key="task.id" class="bg-white rounded-xl p-3 border border-border">
            <view class="flex items-center gap-3">
              <view :class="['w-10 h-10 rounded-xl flex items-center justify-center', task.status === 'completed' ? 'bg-green-100' : task.status === 'in_progress' ? 'bg-blue-100' : 'bg-muted']">
                <text class="text-lg">{{ taskIcon(task.type) }}</text>
              </view>
              <view class="flex-1">
                <view class="flex items-center justify-between">
                  <text class="font-medium text-sm text-foreground">{{ task.title }}</text>
                  <text :class="['text-[10px] px-2 py-0.5 rounded-full', task.status === 'completed' ? 'bg-green-100 text-green-600' : task.status === 'in_progress' ? 'bg-blue-100 text-blue-600' : 'bg-muted text-muted-foreground']">
                    {{ task.status === 'completed' ? '已完成' : task.status === 'in_progress' ? '进行中' : '未开始' }}
                  </text>
                </view>
                <view class="flex items-center justify-between mt-1">
                  <text class="text-[10px] text-muted-foreground">{{ task.period }} · 截止 {{ task.deadline }}</text>
                  <text class="text-xs font-medium">{{ task.completed }}/{{ task.target }}</text>
                </view>
                <view class="h-1 bg-muted rounded-full mt-2 overflow-hidden">
                  <view :style="{ width: (task.completed / task.target) * 100 + '%' }" class="h-full bg-primary rounded-full" />
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- Deposit Status -->
        <view class="bg-white rounded-xl p-4 border border-border">
          <text class="font-medium mb-3 flex items-center gap-2 text-foreground">
            <text></text>
            <text>保证金状态</text>
          </text>
          <view class="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
            <view>
              <text class="text-2xl font-bold">¥{{ memberInfo.depositAmount.toLocaleString() }}</text>
              <text class="text-xs text-muted-foreground mt-0.5 block">{{ depositDesc }}</text>
            </view>
            <view v-if="memberInfo.depositStatus === 'paid' && taskCompletionRate === 100" class="h-8 px-4 bg-primary text-white rounded-lg text-xs flex items-center">
              <text>申请退还</text>
            </view>
          </view>
        </view>
      </template>

      <!-- Income Tab -->
      <template v-if="activeTab === 'income'">
        <view class="bg-white rounded-xl p-4 border border-border bg-gradient-to-r from-green-50 to-green-50/50">
          <view class="flex items-center justify-between mb-2">
            <text class="font-medium flex items-center gap-2 text-foreground">
              <text></text>
              <text>累计收益</text>
            </text>
            <view class="text-xs text-primary flex items-center gap-1" @click="goWallet">
              <text>钱包 ›</text>
            </view>
          </view>
          <text class="text-3xl font-bold text-green-600 block">¥{{ totalIncome }}</text>
          <text class="text-xs text-muted-foreground mt-1 block">包含分红、奖励、直播分成等</text>
        </view>

        <view class="bg-white rounded-xl p-4 border border-border">
          <text class="font-medium mb-3 text-foreground block">收益明细</text>
          <view class="space-y-3">
            <view v-for="record in incomeRecords" :key="record.id" class="flex items-center justify-between py-2 border-b border-border last:border-0">
              <view>
                <text class="text-sm font-medium text-foreground block">{{ record.title }}</text>
                <text class="text-[10px] text-muted-foreground">{{ record.date }}</text>
              </view>
              <text class="font-bold text-green-600">+¥{{ record.amount }}</text>
            </view>
          </view>
          <view class="w-full mt-3 h-9 rounded-lg border border-border text-xs flex items-center justify-center text-muted-foreground" @click="goAllRecords">
            <text>查看全部记录</text>
          </view>
        </view>
      </template>

      <!-- Events Tab -->
      <template v-if="activeTab === 'events'">
        <view class="space-y-3">
          <view v-for="event in upcomingEvents" :key="event.id" class="bg-white rounded-xl p-4 border border-border">
            <view class="flex items-start justify-between">
              <view class="flex-1">
                <view class="flex items-center gap-2 mb-1">
                  <text :class="['text-[10px] px-2 py-0.5 rounded-full', event.type === 'online' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600']">{{ event.type === 'online' ? '线上' : '线下' }}</text>
                  <text v-if="event.enrolled" class="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">已报名</text>
                </view>
                <text class="font-medium text-sm text-foreground block">{{ event.title }}</text>
                <text class="text-xs text-muted-foreground mt-1 flex items-center gap-1 block"> {{ event.date }}</text>
              </view>
              <view v-if="!event.enrolled" class="h-8 px-3 rounded-lg border border-border text-xs flex items-center text-muted-foreground" @click.stop="goSignUp(event.id)">
                <text>报名</text>
              </view>
            </view>
          </view>
        </view>

        <view class="w-full h-10 rounded-lg border border-border text-sm flex items-center justify-center text-muted-foreground" @click="goAllEvents">
          <text>查看更多活动 ›</text>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeTab = ref<'tasks' | 'income' | 'events'>('tasks')

const pageTabs = [
  { key: 'tasks', label: '任务进度', icon: '' },
  { key: 'income', label: '我的收益', icon: '' },
  { key: 'events', label: '活动日程', icon: '' },
]

const memberInfo = {
  id: '1',
  name: '张玄风',
  avatar: '',
  title: '研究院成员',
  joinDate: '2023-12-15',
  expireDate: '2024-12-15',
  daysLeft: 40,
  circleName: '八字命理研习社',
  circleId: '1',
  depositStatus: 'paid' as const,
  depositAmount: 10000,
}

const daysProgress = computed(() => (memberInfo.daysLeft / 365) * 100)

const depositStatusText = computed(() => {
  const map: Record<string, string> = { paid: '待退还', refunding: '退还中', refunded: '已退还' }
  return map[memberInfo.depositStatus] || ''
})

const depositDesc = computed(() => {
  const map: Record<string, string> = { paid: '完成全部任务后可申请退还', refunding: '退还申请审核中', refunded: '已退还至原支付账户' }
  return map[memberInfo.depositStatus] || ''
})

interface Task {
  id: string
  type: string
  title: string
  target: number
  completed: number
  period: string
  deadline: string
  status: string
}

const tasks: Task[] = [
  { id: '1', type: 'monthly', title: '线上直播', target: 2, completed: 2, period: '2024年1月', deadline: '2024-01-31', status: 'completed' },
  { id: '2', type: 'monthly', title: '线上直播', target: 2, completed: 1, period: '2024年2月', deadline: '2024-02-29', status: 'in_progress' },
  { id: '3', type: 'quarterly', title: '线下小范围交流', target: 1, completed: 1, period: '2024年Q1', deadline: '2024-03-31', status: 'completed' },
  { id: '4', type: 'yearly', title: '大范围交流分享', target: 1, completed: 0, period: '2024年', deadline: '2024-12-31', status: 'not_started' },
]

const completedTasks = computed(() => tasks.filter(t => t.status === 'completed').length)
const totalTasks = tasks.length
const taskCompletionRate = computed(() => Math.round((completedTasks.value / totalTasks) * 100))

const incomeRecords = [
  { id: '1', title: '研究院分红', amount: 500, date: '2024-01-15', type: 'dividend' },
  { id: '2', title: '优秀老师奖励', amount: 200, date: '2024-01-10', type: 'reward' },
  { id: '3', title: '直播打赏分成', amount: 150, date: '2024-01-05', type: 'share' },
]

const totalIncome = computed(() => incomeRecords.reduce((sum, r) => sum + r.amount, 0))

const upcomingEvents = [
  { id: '1', title: '月度研讨会：八字流年解析', date: '2024-02-15 19:00', type: 'online', enrolled: true },
  { id: '2', title: '季度线下交流会·北京站', date: '2024-03-20 14:00', type: 'offline', enrolled: false },
]

function taskIcon(type: string): string {
  const map: Record<string, string> = { monthly: '', quarterly: '📍', yearly: '' }
  return map[type] || ''
}

function goBack() {
  uni.navigateBack()
}

function goInstitute() {
  uni.navigateTo({ url: '/pages/institute/index' })
}

function goRenew() {
  uni.navigateTo({ url: '/pages/renew/index?type=institute' })
}

function goWallet() {
  uni.navigateTo({ url: '/pages/mine/wallet/index' })
}

function goAllRecords() {
  uni.navigateTo({ url: '/pages/mine/wallet/index' })
}

function goAllEvents() {
  uni.navigateTo({ url: '/pages/institute/events/index' })
}

function goSignUp(eventId: string) {
  uni.navigateTo({ url: '/pages/institute/events/signup?id=' + eventId })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
