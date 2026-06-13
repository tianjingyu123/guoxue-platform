<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(true)
const searchKeyword = ref('')

const instituteInfo = ref({
  name: '热卜国学研究院',
  slogan: '传承国学精粹，点亮智慧人生',
  bannerUrl: '/static/placeholder.svg',
  description: '热卜国学研究院是国内领先的国学文化研究与传播机构，汇聚八字命理、风水堪舆、紫微斗数等各领域顶级大师，致力于为广大国学爱好者提供专业、系统、权威的学习与交流平台。',
  mission: '让国学智慧走进现代生活，服务每一个寻求人生指引的人',
  stats: { instructorCount: 128, studentCount: 280000, courseCount: 360, eventCount: 48 },
})
const instructors = ref([
  { id: '1', name: '周易大师', avatar: '/static/placeholder.svg', title: '八字命理专家', specialties: ['八字', '流年'], studentCount: '3.2万', rating: 4.9, verified: true },
  { id: '2', name: '张玄风', avatar: '/static/placeholder.svg', title: '紫微传承人', specialties: ['紫微', '命盘'], studentCount: '1.8万', rating: 4.8, verified: true },
  { id: '3', name: '陈风水', avatar: '/static/placeholder.svg', title: '实战风水师', specialties: ['风水', '堪舆'], studentCount: '2.1万', rating: 4.7, verified: true },
  { id: '4', name: '李道长', avatar: '/static/placeholder.svg', title: '武当道士', specialties: ['道家', '养生'], studentCount: '2.6万', rating: 4.9, verified: false },
])
const events = ref([
  { id: '1', title: '2024八字命理高阶研讨会', cover: '/static/placeholder.svg', status: 'enrolling', type: 'offline', startTime: '2024-12-20 09:00', location: '北京国际会议中心', isOnline: false, price: 1980, currentParticipants: 156 },
  { id: '2', title: '紫微斗数在线直播课', cover: '/static/placeholder.svg', status: 'enrolling', type: 'online', startTime: '2024-12-15 19:00', location: '', isOnline: true, price: 0, currentParticipants: 892 },
  { id: '3', title: '国学传统节气养生讲座', cover: '/static/placeholder.svg', status: 'enrolling', type: 'online', startTime: '2024-12-18 15:00', location: '', isOnline: true, price: 99, currentParticipants: 234 },
])

function getEventStatusLabel(status: string) {
  const map: Record<string, string> = { enrolling: '报名中', started: '进行中', ended: '已结束' }
  return map[status] || status
}
function getEventStatusClass(status: string) {
  const map: Record<string, string> = {
    enrolling: 'bg-green-500/90 text-white',
    started: 'bg-red-500/90 text-white',
    ended: 'bg-gray-400/90 text-white',
  }
  return map[status] || 'bg-gray-400/90 text-white'
}

onMounted(() => { setTimeout(() => { loading.value = false }, 600) })

function goBack() { uni.navigateBack() }
function handleSearch() {
  if (searchKeyword.value.trim()) {
    uni.navigateTo({ url: `/pages/institute/instructors?keyword=${encodeURIComponent(searchKeyword.value)}` })
  }
}
function goInstructors() { uni.navigateTo({ url: '/pages/institute/instructors' }) }
function goInstructor(id: string) { uni.navigateTo({ url: `/pages/institute/instructor-detail?id=${id}` }) }
function goEvents() { uni.navigateTo({ url: '/pages/institute/events' }) }
function goEvent(id: string) { uni.navigateTo({ url: `/pages/institute/event-detail?id=${id}` }) }
function goApply() { uni.navigateTo({ url: '/pages/institute/apply' }) }
</script>

<template>
  <view class="min-h-screen bg-background pb-20">

    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background/95 border-b border-border px-4 py-3">
      <view class="flex items-center gap-3">
        <view class="p-1 -ml-1" @click="goBack">
          <svg class="w-6 h-6 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </view>
        <text class="text-lg font-semibold text-foreground">研究院</text>
      </view>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="p-4 space-y-4">
      <view class="h-48 w-full rounded-xl bg-secondary animate-pulse" />
      <view class="h-10 w-full rounded-lg bg-secondary animate-pulse" />
      <view class="h-24 w-full rounded-lg bg-secondary animate-pulse" />
      <view class="grid grid-cols-2 gap-3">
        <view v-for="i in 4" :key="i" class="h-32 rounded-lg bg-secondary animate-pulse" />
      </view>
    </view>

    <view v-else>

      <!-- Banner -->
      <view class="relative h-48">
        <image :src="instituteInfo.bannerUrl" class="w-full h-full" mode="aspectFill" />
        <view class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <view class="absolute bottom-4 left-4 right-4">
          <text class="text-xl font-bold text-white block">{{ instituteInfo.name }}</text>
          <text class="text-sm text-white/90 block mt-0.5">{{ instituteInfo.slogan }}</text>
        </view>
      </view>

      <!-- 搜索栏 -->
      <view class="px-4 py-3 bg-background border-b border-border">
        <view class="relative flex items-center">
          <view class="absolute left-3 pointer-events-none">
            <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </view>
          <input
            v-model="searchKeyword"
            placeholder="搜索讲师、课程..."
            class="w-full pl-9 pr-20 h-10 rounded-lg bg-secondary text-sm text-foreground border-none outline-none"
            placeholder-class="text-muted-foreground"
            @confirm="handleSearch"
          />
          <view
            class="absolute right-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground"
            @click="handleSearch"
          >
            <text class="text-xs font-medium">搜索</text>
          </view>
        </view>
      </view>

      <!-- 统计数据 4宫格 -->
      <view class="px-4 py-4">
        <view class="grid grid-cols-4 gap-2 p-4 bg-secondary/40 rounded-xl">
          <view class="text-center">
            <text class="text-xl font-bold text-primary block">{{ instituteInfo.stats.instructorCount }}</text>
            <text class="text-xs text-muted-foreground block">讲师</text>
          </view>
          <view class="text-center">
            <text class="text-xl font-bold text-primary block">{{ (instituteInfo.stats.studentCount / 10000).toFixed(1) }}万</text>
            <text class="text-xs text-muted-foreground block">学员</text>
          </view>
          <view class="text-center">
            <text class="text-xl font-bold text-primary block">{{ instituteInfo.stats.courseCount }}</text>
            <text class="text-xs text-muted-foreground block">课程</text>
          </view>
          <view class="text-center">
            <text class="text-xl font-bold text-primary block">{{ instituteInfo.stats.eventCount }}</text>
            <text class="text-xs text-muted-foreground block">活动</text>
          </view>
        </view>
      </view>

      <!-- 研究院简介 -->
      <view class="px-4 pb-4">
        <view class="p-4 bg-card rounded-xl border border-border">
          <text class="font-semibold text-foreground block mb-2">关于我们</text>
          <text class="text-sm text-muted-foreground leading-relaxed block">{{ instituteInfo.description }}</text>
          <view class="mt-3 p-3 bg-primary/5 rounded-lg border-l-2 border-primary">
            <text class="text-sm text-primary font-medium block">使命：{{ instituteInfo.mission }}</text>
          </view>
        </view>
      </view>

      <!-- 金牌讲师 -->
      <view class="px-4 pb-4">
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-2">
            <svg class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <text class="font-semibold text-foreground">金牌讲师</text>
          </view>
          <view class="flex items-center gap-1 text-sm text-primary" @click="goInstructors">
            <text>查看全部</text>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </view>
        </view>

        <view class="grid grid-cols-2 gap-3">
          <view
            v-for="instructor in instructors.slice(0, 4)"
            :key="instructor.id"
            class="bg-card rounded-xl border border-border p-3"
            @click="goInstructor(instructor.id)"
          >
            <view class="flex items-center gap-2 mb-2">
              <view class="relative flex-shrink-0">
                <image :src="instructor.avatar" class="w-11 h-11 rounded-full" mode="aspectFill" />
                <view v-if="instructor.verified" class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-card flex items-center justify-center">
                  <svg class="w-3 h-3 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </view>
              </view>
              <view class="flex-1 min-w-0">
                <text class="font-medium text-sm text-foreground block truncate">{{ instructor.name }}</text>
                <text class="text-xs text-muted-foreground block truncate">{{ instructor.title }}</text>
              </view>
            </view>

            <view class="flex flex-wrap gap-1 mb-2">
              <view
                v-for="s in instructor.specialties.slice(0, 2)"
                :key="s"
                class="px-1.5 py-0.5 bg-secondary rounded"
              >
                <text class="text-xs text-muted-foreground">{{ s }}</text>
              </view>
            </view>

            <view class="flex items-center justify-between">
              <view class="flex items-center gap-1">
                <svg class="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <text class="text-xs text-muted-foreground">{{ instructor.studentCount }}</text>
              </view>
              <view class="flex items-center gap-1">
                <svg class="w-3 h-3 text-accent" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <text class="text-xs text-muted-foreground">{{ instructor.rating }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 近期活动 -->
      <view v-if="events.length > 0" class="px-4 pb-4">
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-2">
            <svg class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <text class="font-semibold text-foreground">近期活动</text>
          </view>
          <view class="flex items-center gap-1 text-sm text-primary" @click="goEvents">
            <text>更多活动</text>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </view>
        </view>

        <view class="space-y-3">
          <view
            v-for="event in events"
            :key="event.id"
            class="bg-card rounded-xl border border-border overflow-hidden"
            @click="goEvent(event.id)"
          >
            <view class="flex">
              <view class="relative w-28 h-24 flex-shrink-0">
                <image :src="event.cover" class="w-full h-full" mode="aspectFill" />
                <view
                  class="absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs"
                  :class="getEventStatusClass(event.status)"
                >
                  <text>{{ getEventStatusLabel(event.status) }}</text>
                </view>
              </view>
              <view class="flex-1 p-3 min-w-0">
                <view class="flex items-start justify-between gap-2">
                  <text class="font-medium text-sm text-foreground line-clamp-1 block flex-1">{{ event.title }}</text>
                  <text class="text-xs text-muted-foreground flex-shrink-0">{{ event.isOnline ? '线上' : '线下' }}</text>
                </view>
                <view class="flex items-center gap-1 mt-1">
                  <svg class="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <text class="text-xs text-muted-foreground">{{ event.startTime.split(' ')[0] }}</text>
                </view>
                <view class="flex items-center gap-1 mt-1">
                  <svg class="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <text class="text-xs text-muted-foreground">{{ event.isOnline ? '线上直播' : event.location }}</text>
                </view>
                <view class="flex items-center justify-between mt-2">
                  <text class="text-primary font-semibold text-sm">{{ event.price === 0 ? '免费' : `¥${event.price}` }}</text>
                  <text class="text-xs text-muted-foreground">{{ event.currentParticipants }}人已报名</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 成为讲师 CTA -->
      <view class="px-4 pb-6">
        <view
          class="relative overflow-hidden rounded-xl bg-primary p-4"
          @click="goApply"
        >
          <view class="relative z-10">
            <text class="font-bold text-lg text-primary-foreground block">成为讲师</text>
            <text class="text-sm text-primary-foreground/90 block mt-1 mb-3">加入热卜研究院，分享你的专业知识</text>
            <view class="px-4 py-2 bg-card rounded-full inline-flex items-center gap-1">
              <text class="text-sm font-medium text-primary">立即申请</text>
              <svg class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </view>
          </view>
          <view class="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mb-10" />
          <view class="absolute right-8 top-0 w-20 h-20 bg-white/10 rounded-full -mt-10" />
        </view>
      </view>

    </view>
  </view>
</template>
