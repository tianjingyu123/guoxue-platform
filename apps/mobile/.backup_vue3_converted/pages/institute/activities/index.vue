<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view class="flex items-center gap-3">
          <view @click="goBackToInstitute" class="p-1 -ml-1">
            <text class="text-lg text-foreground">&#8592;</text>
          </view>
          <text class="text-lg font-semibold text-foreground">研究院活动</text>
        </view>
        <text class="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{{ stats.enrolling }}个报名中</text>
      </view>
    </header>

    <!-- 任务提醒卡片 -->
    <view class="px-4 py-3">
      <view class="p-3 rounded-xl" style="background:linear-gradient(135deg,rgba(201,169,110,0.1),rgba(201,169,110,0.1));border:1px solid rgba(201,169,110,0.2)">
        <view class="flex items-start gap-3">
          <view class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style="background:rgba(201,169,110,0.2)">
            <text class="text-lg text-accent">&#9888;&#65039;</text>
          </view>
          <view class="flex-1">
            <text class="text-sm font-medium text-foreground block">任务进度提醒</text>
            <text class="text-xs text-muted-foreground block mt-0.5">
              本月需完成2场线上直播，已完成1场；本季度需完成1次线下交流
            </text>
            <view @click="goTo('/pages/mine/institute')" class="text-xs mt-1 inline-block" style="color:#C9A96E">
              <text>查看我的任务 &#8594;</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Tab切换 -->
    <scroll-view scroll-x class="px-4 py-2" style="white-space:nowrap;">
      <view v-for="tab in tabs" :key="tab.id"
        @click="activeTab = tab.id"
        :class="['inline-flex px-4 py-1.5 rounded-full text-xs mr-2 flex-shrink-0', activeTab === tab.id ? 'bg-primary text-white' : 'bg-white text-muted-foreground border border-border']">
        <text>{{ tab.label }}</text>
      </view>
    </scroll-view>

    <!-- 活动列表 -->
    <view class="px-4 py-3 space-y-3">
      <view v-for="activity in filteredActivities" :key="activity.id"
        @click="goTo('/pages/institute/activities/' + activity.id)"
        class="bg-white rounded-xl overflow-hidden hover:bg-secondary/30 transition-colors">
        <!-- 封面区域 -->
        <view class="relative h-32 flex items-center justify-center" style="background:linear-gradient(135deg,rgba(201,169,110,0.2),rgba(201,169,110,0.2))">
          <!-- 直播中标记 -->
          <view v-if="activity.status === 'ongoing'" class="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-white text-[10px]">
            <view class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></view>
            <text>直播中</text>
          </view>
          <view class="text-center">
            <view class="w-12 h-12 mx-auto mb-2 rounded-full bg-white/80 flex items-center justify-center">
              <text :class="[activity.type === 'online_live' ? 'text-blue-500' : 'text-green-500', 'text-xl']">{{ activity.type === 'online_live' ? '&#127916;' : '&#128205;' }}</text>
            </view>
            <text :class="['text-[10px] px-2 py-0.5 rounded-full inline-block', getTypeConfig(activity.type).color]" :style="{ background: getTypeConfig(activity.type).bgColor }">
              {{ getTypeConfig(activity.type).label }}
            </text>
          </view>
          <!-- 任务计入标记 -->
          <view v-if="activity.isRequired" class="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded" style="background:rgba(217,119,6,0.1);color:#d97706">
            <text>计入{{ activity.taskType === 'monthly' ? '月度' : activity.taskType === 'quarterly' ? '季度' : '年度' }}任务</text>
          </view>
        </view>

        <!-- 内容区域 -->
        <view class="p-3">
          <view class="flex items-start justify-between gap-2">
            <text class="font-medium text-sm text-foreground line-clamp-1">{{ activity.title }}</text>
            <text :class="['text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0', getStatusConfig(activity.status).color]" :style="{ background: getStatusConfig(activity.status).bgColor }">
              {{ getStatusConfig(activity.status).label }}
            </text>
          </view>

          <text v-if="activity.summary" class="text-xs text-muted-foreground mt-1 line-clamp-2 block">{{ activity.summary }}</text>

          <view class="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <text class="flex items-center gap-1">&#128197; {{ activity.date }}</text>
            <text class="flex items-center gap-1">&#128339; {{ activity.time }}</text>
            <text class="flex items-center gap-1">&#128101; {{ activity.participants }}{{ activity.maxParticipants ? '/' + activity.maxParticipants : '' }}人</text>
          </view>

          <view class="flex items-center justify-between mt-2 pt-2 border-t border-border">
            <view class="flex items-center gap-2">
              <view class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style="background:rgba(201,169,110,0.2);color:#C9A96E">
                <text>{{ activity.host.slice(0, 1) }}</text>
              </view>
              <text class="text-xs text-muted-foreground">{{ activity.host }} 主持</text>
            </view>
            <text class="text-xs text-muted-foreground flex items-center gap-1">&#128205; {{ activity.location.length > 10 ? activity.location.slice(0, 10) + '...' : activity.location }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="filteredActivities.length === 0" class="text-center py-12">
      <text class="text-4xl block text-muted-foreground/50">&#128197;</text>
      <text class="text-sm text-muted-foreground mt-3 block">暂无相关活动</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

// 导航回研究院首页
const goBackToInstitute = () => {
  uni.switchTab({ url: '/pages/institute/index' })
}

type ActivityType = 'online_live' | 'offline_small' | 'offline_large' | 'sharing'
type ActivityStatus = 'upcoming' | 'enrolling' | 'ongoing' | 'ended'

interface InstituteActivity {
  id: number
  title: string
  type: ActivityType
  status: ActivityStatus
  date: string
  time: string
  location: string
  host: string
  hostAvatar: string
  participants: number
  maxParticipants?: number
  cover?: string
  summary?: string
  isRequired: boolean
  taskType?: 'monthly' | 'quarterly' | 'yearly'
}

const typeConfig: Record<ActivityType, { label: string; color: string; bgColor: string }> = {
  online_live: { label: '线上直播', color: 'text-blue-500', bgColor: 'rgba(59,130,246,0.1)' },
  offline_small: { label: '线下小范围', color: 'text-green-500', bgColor: 'rgba(34,197,94,0.1)' },
  offline_large: { label: '线下大范围', color: 'text-amber-600', bgColor: 'rgba(217,119,6,0.1)' },
  sharing: { label: '分享交流', color: 'text-purple-500', bgColor: 'rgba(168,85,247,0.1)' },
}

const statusConfig: Record<ActivityStatus, { label: string; color: string; bgColor: string }> = {
  upcoming: { label: '即将开始', color: 'text-amber-600', bgColor: 'rgba(217,119,6,0.1)' },
  enrolling: { label: '报名中', color: 'text-green-600', bgColor: 'rgba(22,163,74,0.1)' },
  ongoing: { label: '进行中', color: 'text-primary', bgColor: 'rgba(196,30,58,0.1)' },
  ended: { label: '已结束', color: 'text-muted-foreground', bgColor: 'rgba(153,153,153,0.1)' },
}

const mockActivities: InstituteActivity[] = [
  { id: 1, title: '八字命理高级研讨会', type: 'online_live', status: 'enrolling', date: '2024-03-25', time: '19:30-21:30', location: '线上直播间', host: '张道玄', hostAvatar: '', participants: 45, maxParticipants: 100, isRequired: true, taskType: 'monthly', summary: '深入探讨八字格局取用神的高级技法，结合实际案例分析。' },
  { id: 2, title: '长三角地区命理交流会', type: 'offline_small', status: 'enrolling', date: '2024-04-10', time: '14:00-17:00', location: '上海·静安区文化中心', host: '李易安', hostAvatar: '', participants: 18, maxParticipants: 30, isRequired: true, taskType: 'quarterly', summary: '长三角地区研究院成员线下交流，分享实战案例和心得。' },
  { id: 3, title: '2024年度国学高峰论坛', type: 'offline_large', status: 'upcoming', date: '2024-06-15', time: '09:00-17:00', location: '北京·国家会议中心', host: '研究院', hostAvatar: '', participants: 156, maxParticipants: 500, isRequired: true, taskType: 'yearly', summary: '年度最大规模的国学交流盛会，邀请业内顶尖专家分享。' },
  { id: 4, title: '紫微斗数入门精讲', type: 'online_live', status: 'ongoing', date: '2024-03-20', time: '20:00-21:30', location: '线上直播间', host: '李易安', hostAvatar: '', participants: 68, isRequired: true, taskType: 'monthly' },
  { id: 5, title: '风水堪舆实地考察', type: 'offline_small', status: 'ended', date: '2024-03-10', time: '09:00-16:00', location: '广州·白云山', host: '王明德', hostAvatar: '', participants: 24, isRequired: true, taskType: 'quarterly', summary: '实地考察风水案例，理论结合实践。' },
]

const tabs = [
  { id: 'all', label: '全部' },
  { id: 'enrolling', label: '报名中' },
  { id: 'online', label: '线上' },
  { id: 'offline', label: '线下' },
  { id: 'ended', label: '已结束' },
]

const activeTab = ref<string>('all')

const getTypeConfig = (type: ActivityType) => typeConfig[type]
const getStatusConfig = (status: ActivityStatus) => statusConfig[status]

const filteredActivities = computed(() => {
  return mockActivities.filter(activity => {
    if (activeTab.value === 'all') return true
    if (activeTab.value === 'enrolling') return activity.status === 'enrolling'
    if (activeTab.value === 'online') return activity.type === 'online_live'
    if (activeTab.value === 'offline') return activity.type.startsWith('offline')
    if (activeTab.value === 'ended') return activity.status === 'ended'
    return true
  })
})

const stats = computed(() => ({
  enrolling: mockActivities.filter(a => a.status === 'enrolling').length,
  thisMonth: mockActivities.filter(a => a.status !== 'ended').length,
}))
</script>

<style scoped>
</style>
