<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-12">
        <view class="flex items-center gap-3">
          <view class="p-1" @click="goBack">
            <text class="text-xl text-foreground">←</text>
          </view>
          <text class="font-medium text-foreground">老师邀约管理</text>
        </view>
        <view class="px-3 py-1.5 rounded-lg text-sm" style="color:#C41E3A" @click="goTo('/institute/teacher-pool')">
          <text class="mr-1"></text>
          <text>找老师</text>
        </view>
      </view>
    </view>

    <!-- 快捷操作 -->
    <view class="px-4 py-3" style="background:linear-gradient(to right,rgba(196,30,58,0.05),rgba(201,169,110,0.05))">
      <view class="flex gap-2">
        <view class="flex-1 py-3 rounded-xl border border-border flex flex-col items-center gap-1" @click="goTo('/institute/teacher-pool')">
          <text class="text-lg" style="color:#C41E3A"></text>
          <text class="text-xs text-foreground">浏览人才库</text>
        </view>
        <view class="flex-1 py-3 rounded-xl border border-border flex flex-col items-center gap-1" @click="goTo('/institute/teacher-demand/create')">
          <text class="text-lg" style="color:#C41E3A">+</text>
          <text class="text-xs text-foreground">发布需求</text>
        </view>
      </view>
    </view>

    <!-- Tab切换 -->
    <view class="sticky top-12 z-40 bg-white border-b border-border">
      <view class="flex">
        <view
          v-for="tab in tabs"
          :key="tab.id"
          class="flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors"
          :class="activeTab === tab.id ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent'"
          :style="activeTab === tab.id ? 'border-color:#C41E3A;color:#C41E3A' : ''"
          @click="activeTab = tab.id"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <!-- 内容区域 -->
    <view class="px-4 py-4">
      <!-- 邀约记录 -->
      <view v-if="activeTab === 'invitations'" class="space-y-3">
        <view v-for="item in invitations" :key="item.id" class="p-4 bg-white rounded-xl">
          <view class="flex items-start gap-3">
            <view class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style="background-color:rgba(196,30,58,0.1)">
              <text class="text-base" style="color:#C41E3A">{{ item.teacher.name.charAt(0) }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-center justify-between">
                <text class="font-medium text-foreground text-sm">{{ item.teacher.name }}</text>
                <view :class="['text-[10px] px-2 py-0.5 rounded', getStatusColor(item.status)]">
                  <text>{{ getStatusLabel(item.status) }}</text>
                </view>
              </view>
              <text class="text-xs text-muted-foreground block">{{ item.teacher.title }}</text>
              <view class="mt-2 p-2 rounded-lg" style="background-color:rgba(241,237,232,0.3)">
                <text class="text-sm font-medium text-foreground block">{{ item.course }}</text>
                <view class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <text class="flex items-center gap-1"> {{ item.date }}</text>
                  <text class="flex items-center gap-1">🕐 {{ item.time }}</text>
                </view>
              </view>
              <view class="flex items-center justify-between mt-2">
                <text class="text-sm font-medium" style="color:#C41E3A">¥{{ item.fee }}</text>
                <text v-if="item.status === 'confirmed'" class="text-xs text-muted-foreground">{{ item.attendees }}人报名</text>
                <text v-if="item.status === 'completed'" class="text-xs text-green-600">{{ item.attendees }}人参与</text>
              </view>
              <view v-if="item.status === 'pending'" class="flex gap-2 mt-3">
                <view class="flex-1 py-2 rounded-lg border border-border text-xs text-center text-muted-foreground">
                  <text> 联系老师</text>
                </view>
                <view class="py-2 rounded-lg border border-border text-xs text-center" style="color:#EF4444">
                  <text>取消邀约</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 我的需求 -->
      <view v-if="activeTab === 'demands'" class="space-y-3">
        <view class="py-3 rounded-xl border border-border text-center text-sm" @click="goTo('/institute/teacher-demand/create')">
          <text class="mr-2">+</text>
          <text class="text-foreground">发布新需求</text>
        </view>
        <view v-for="item in demands" :key="item.id" class="p-4 bg-white rounded-xl">
          <view class="flex items-start justify-between">
            <view class="flex-1">
              <view class="flex items-center gap-2">
                <text class="font-medium text-foreground text-sm">{{ item.title }}</text>
                <view :class="['text-[10px] px-2 py-0.5 rounded', getStatusColor(item.status)]">
                  <text>{{ getStatusLabel(item.status) }}</text>
                </view>
              </view>
              <view class="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <view class="px-2 py-0.5 rounded border border-border text-[10px]">{{ item.category }}</view>
                <text>{{ item.date }}</text>
                <text>预算 ¥{{ item.budget }}</text>
              </view>
            </view>
            <text class="text-sm text-muted-foreground">›</text>
          </view>
          <view class="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <text class="text-sm">
              <text class="font-medium" style="color:#C41E3A">{{ item.applications }}</text>
              <text class="text-muted-foreground"> 位老师申请</text>
            </text>
            <view class="px-3 py-1 rounded-lg text-xs text-white" style="background-color:#C41E3A">
              <text>查看申请</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 课程排期 -->
      <view v-if="activeTab === 'schedule'" class="space-y-4">
        <view class="p-4 bg-white rounded-xl">
          <text class="font-medium text-foreground block mb-3">2024年4月</text>
          <view class="space-y-2">
            <view v-for="item in confirmedItems" :key="item.id" class="flex items-center gap-3 p-3 rounded-xl" style="background-color:rgba(34,197,94,0.05)">
              <view class="w-12 text-center">
                <text class="text-lg font-bold block" style="color:#22C55E">{{ item.date.split('-')[2] }}</text>
                <text class="text-[10px]" style="color:#22C55E">周一</text>
              </view>
              <view class="flex-1">
                <text class="font-medium text-sm text-foreground block">{{ item.course }}</text>
                <text class="text-xs text-muted-foreground">{{ item.teacher.name }} · {{ item.time }}</text>
              </view>
              <view class="px-2 py-0.5 rounded text-[10px] text-white" style="background-color:#22C55E">
                <text>{{ item.attendees }}人</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 费用结算 -->
      <view v-if="activeTab === 'settlement'" class="space-y-4">
        <!-- 待结算 -->
        <view class="p-4 bg-white rounded-xl">
          <view class="flex items-center justify-between mb-3">
            <text class="font-medium text-foreground">待结算</text>
            <text class="text-lg font-bold" style="color:#C41E3A">¥3,000</text>
          </view>
          <view v-for="item in confirmedItems" :key="item.id" class="flex items-center justify-between p-3 rounded-lg mb-2" style="background-color:rgba(241,237,232,0.3)">
            <view>
              <text class="text-sm font-medium text-foreground block">{{ item.course }}</text>
              <text class="text-xs text-muted-foreground">{{ item.teacher.name }} · {{ item.date }}</text>
            </view>
            <text class="font-medium text-foreground">¥{{ item.fee }}</text>
          </view>
        </view>

        <!-- 已结算 -->
        <view class="p-4 bg-white rounded-xl">
          <text class="font-medium text-foreground block mb-3">已结算记录</text>
          <view v-for="item in completedItems" :key="item.id" class="flex items-center justify-between py-3 border-b border-border last:border-0">
            <view>
              <text class="text-sm text-foreground block">{{ item.course }}</text>
              <text class="text-xs text-muted-foreground">{{ item.teacher.name }} · {{ item.date }}</text>
            </view>
            <view class="text-right">
              <text class="font-medium" style="color:#22C55E">¥{{ item.fee }}</text>
              <text class="text-[10px] text-muted-foreground block">已支付</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type InvitationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

const activeTab = ref('invitations')

const tabs = [
  { id: 'invitations', label: '邀约记录' },
  { id: 'demands', label: '我的需求' },
  { id: 'schedule', label: '课程排期' },
  { id: 'settlement', label: '费用结算' },
]

const invitations = [
  {
    id: 1,
    teacher: { name: '张道源', avatar: '', title: '八字命理专家', rating: 4.9 },
    course: '八字实战精讲',
    date: '2024-04-15',
    time: '14:00-17:00',
    fee: 3000,
    status: 'confirmed' as InvitationStatus,
    attendees: 25,
  },
  {
    id: 2,
    teacher: { name: '李易卿', avatar: '', title: '紫微斗数研究员', rating: 4.8 },
    course: '紫微斗数入门',
    date: '2024-04-20',
    time: '09:00-12:00',
    fee: 2500,
    status: 'pending' as InvitationStatus,
    attendees: 0,
  },
  {
    id: 3,
    teacher: { name: '王文昌', avatar: '', title: '风水堪舆大师', rating: 4.7 },
    course: '阳宅风水实操',
    date: '2024-03-28',
    time: '14:00-17:00',
    fee: 3500,
    status: 'completed' as InvitationStatus,
    attendees: 32,
  },
]

const demands = [
  {
    id: 1,
    title: '八字命理高级课程',
    category: '八字命理',
    date: '2024-04-25',
    budget: '3000-5000',
    applications: 5,
    status: 'open',
  },
  {
    id: 2,
    title: '风水实地考察',
    category: '风水堪舆',
    date: '2024-05-01',
    budget: '5000-8000',
    applications: 3,
    status: 'open',
  },
]

const confirmedItems = computed(() => invitations.filter(i => i.status === 'confirmed'))
const completedItems = computed(() => invitations.filter(i => i.status === 'completed'))

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-600',
    confirmed: 'bg-green-500/10 text-green-600',
    completed: 'bg-[#F1EDE8] text-muted-foreground',
    cancelled: 'bg-red-500/10 text-red-600',
    open: 'bg-blue-500/10 text-blue-600',
  }
  return map[status] || 'bg-[#F1EDE8] text-muted-foreground'
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认',
    completed: '已完成',
    cancelled: '已取消',
    open: '招募中',
  }
  return map[status] || status
}

function goBack() {
  uni.navigateBack()
}

function goTo(path: string) {
  uni.navigateTo({ url: path })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
