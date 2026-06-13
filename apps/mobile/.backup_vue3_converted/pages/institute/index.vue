<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- ===== Loading骨架屏 ===== -->
    <template v-if="loading">
      <header class="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <view class="flex items-center gap-3">
          <view class="w-8 h-8 rounded-full skeleton-bg" />
          <view class="h-5 w-24 skeleton-bg rounded" />
        </view>
      </header>
      <view class="space-y-4">
        <view class="h-48 w-full skeleton-bg" />
        <view class="p-4 space-y-4">
          <view class="h-10 w-full skeleton-bg rounded-lg" />
          <view class="h-24 w-full skeleton-bg rounded-lg" />
          <view class="grid grid-cols-2 gap-3">
            <view v-for="i in 4" :key="i" class="h-32 skeleton-bg rounded-lg" />
          </view>
        </view>
      </view>
    </template>

    <!-- ===== 主内容 ===== -->
    <template v-else>
      <!-- 顶部导航 -->
      <header class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1 -ml-1">
            <text class="text-2xl leading-none">←</text>
          </view>
          <text class="text-lg font-semibold">研究院</text>
        </view>
      </header>

      <!-- Banner -->
      <view v-if="instituteInfo" class="relative h-48" style="background:linear-gradient(135deg,rgba(196,30,58,0.2),rgba(201,169,110,0.2))">
        <image :src="instituteInfo.bannerUrl" mode="aspectFill" class="absolute inset-0 w-full h-full" />
        <view class="absolute inset-0" style="background:linear-gradient(to top,rgba(0,0,0,0.6),transparent)" />
        <view class="absolute bottom-4 left-4 right-4 text-white">
          <text class="text-xl font-bold block mb-1">{{ instituteInfo.name }}</text>
          <text class="text-sm opacity-90 block">{{ instituteInfo.slogan }}</text>
        </view>
      </view>

      <!-- 搜索栏 -->
      <view class="px-4 py-3 sticky top-[57px] z-10 bg-background border-b border-border">
        <view class="relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索讲师、课程..."
            @confirm="handleSearch"
            class="w-full h-9 pl-9 pr-16 bg-background rounded-lg text-sm box-border"
            style="border:1px solid rgba(232,224,213,0.6)"
          />
          <view @click="handleSearch" class="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-white rounded text-xs">搜索</view>
        </view>
      </view>

      <!-- 统计数据 -->
      <view v-if="instituteInfo" class="px-4 py-4">
        <view class="grid grid-cols-4 gap-2 p-4 rounded-xl" style="background:rgba(250,248,245,0.5)">
          <view class="text-center">
            <text class="text-xl font-bold text-primary block">{{ instituteInfo.stats.instructorCount }}</text>
            <text class="text-xs text-muted-foreground">讲师</text>
          </view>
          <view class="text-center">
            <text class="text-xl font-bold text-primary block">{{ (instituteInfo.stats.studentCount / 10000).toFixed(1) }}万</text>
            <text class="text-xs text-muted-foreground">学员</text>
          </view>
          <view class="text-center">
            <text class="text-xl font-bold text-primary block">{{ instituteInfo.stats.courseCount }}</text>
            <text class="text-xs text-muted-foreground">课程</text>
          </view>
          <view class="text-center">
            <text class="text-xl font-bold text-primary block">{{ instituteInfo.stats.eventCount }}</text>
            <text class="text-xs text-muted-foreground">活动</text>
          </view>
        </view>
      </view>

      <!-- 研究院简介 -->
      <view v-if="instituteInfo" class="px-4 pb-4">
        <view class="p-4 bg-white rounded-xl" style="border:1px solid rgba(232,224,213,0.6)">
          <text class="font-semibold mb-2 block">关于我们</text>
          <text class="text-sm text-muted-foreground leading-relaxed block">{{ instituteInfo.description }}</text>
          <view class="mt-3 p-3 rounded-lg" style="background:rgba(196,30,58,0.05);border-left:2px solid #c41e3a">
            <text class="text-sm text-primary font-medium block">使命：{{ instituteInfo.mission }}</text>
          </view>
        </view>
      </view>

      <!-- 讲师列表 -->
      <view class="px-4 pb-4">
        <view class="flex items-center justify-between mb-3">
          <text class="font-semibold flex items-center gap-2">
            <text class="text-primary"></text> 金牌讲师
          </text>
          <view @click="goInstructorsList" class="text-sm text-primary flex items-center gap-1">
            查看全部 <text class="text-sm">›</text>
          </view>
        </view>

        <view class="grid grid-cols-2 gap-3">
          <view
            v-for="inst in instructors.slice(0, 4)"
            :key="inst.id"
            @click="goInstructorDetail(inst.id)"
            class="bg-white rounded-xl p-3"
            style="border:1px solid rgba(232,224,213,0.6)"
            hover-class="hover-shadow"
          >
            <view class="flex items-center gap-2 mb-2">
              <view class="relative">
                <image :src="inst.avatar" mode="aspectFill" class="w-11 h-11 rounded-full" />
                <text v-if="inst.verified" class="absolute -bottom-1 -right-1 text-sm bg-white rounded-full"></text>
              </view>
              <view class="flex-1 min-w-0">
                <view class="font-medium text-sm truncate">{{ inst.name }}</view>
                <view class="text-xs text-muted-foreground truncate">{{ inst.title }}</view>
              </view>
            </view>

            <view class="flex flex-wrap gap-1 mb-2">
              <text
                v-for="s in inst.specialties.slice(0, 2)"
                :key="s"
                class="text-xs px-1.5 py-0.5 rounded"
                style="background:rgba(232,224,213,0.5)"
              >{{ s }}</text>
            </view>

            <view class="flex items-center justify-between text-xs text-muted-foreground">
              <text class="flex items-center gap-1"> {{ inst.studentCount }}</text>
              <text class="flex items-center gap-1"> {{ inst.rating }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 近期活动 -->
      <view v-if="events.length > 0" class="px-4 pb-4">
        <view class="flex items-center justify-between mb-3">
          <text class="font-semibold flex items-center gap-2">
            <text class="text-primary"></text> 近期活动
          </text>
          <view @click="goMoreEvents" class="text-sm text-primary flex items-center gap-1">
            更多活动 <text class="text-sm">›</text>
          </view>
        </view>

        <view class="space-y-3">
          <view
            v-for="evt in events"
            :key="evt.id"
            @click="goEventDetail(evt.id)"
            class="bg-white rounded-xl overflow-hidden"
            style="border:1px solid rgba(232,224,213,0.6)"
            hover-class="hover-shadow"
          >
            <view class="flex">
              <view class="relative w-28 h-24 flex-shrink-0">
                <image :src="evt.cover" mode="aspectFill" class="w-full h-full" />
                <view :class="getEventStatusColor(evt.status)" class="absolute top-1 left-1 text-xs px-1.5 py-0.5 rounded">
                  {{ getEventStatusLabel(evt.status) }}
                </view>
              </view>
              <view class="flex-1 p-3 min-w-0">
                <view class="flex items-start justify-between gap-2">
                  <text class="font-medium text-sm line-clamp-1">{{ evt.title }}</text>
                  <text class="text-xs text-muted-foreground whitespace-nowrap">{{ getEventTypeLabel(evt.type) }}</text>
                </view>
                <view class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  🕐 {{ evt.startTime.split(' ')[0] }}
                </view>
                <view class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  📍 {{ evt.isOnline ? '线上直播' : evt.location }}
                </view>
                <view class="mt-2 flex items-center justify-between">
                  <text class="text-primary font-semibold text-sm">{{ evt.price === 0 ? '免费' : `¥${evt.price}` }}</text>
                  <text class="text-xs text-muted-foreground">{{ evt.currentParticipants }}人已报名</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 成为讲师入口 -->
      <view class="px-4 pb-6">
        <view @click="goApply"
          class="relative overflow-hidden rounded-xl p-4 text-white"
          style="background:linear-gradient(135deg,#c41e3a,rgba(196,30,58,0.8))"
        >
          <view class="relative z-10">
            <text class="font-bold text-lg block mb-1">成为讲师</text>
            <text class="text-sm opacity-90 block mb-3">加入热卜研究院，分享你的专业知识</text>
            <view class="inline-flex px-4 py-1.5 bg-white text-primary rounded-full text-sm font-medium">立即申请 →</view>
          </view>
          <view class="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full" style="margin-right:-2.5rem;margin-bottom:-2.5rem" />
          <view class="absolute right-8 top-0 w-20 h-20 bg-white/10 rounded-full" style="margin-top:-2.5rem" />
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// ===== 类型定义 =====
interface InstituteStats {
  instructorCount: number
  studentCount: number
  courseCount: number
  eventCount: number
}

interface InstituteInfo {
  bannerUrl: string
  name: string
  slogan: string
  description: string
  mission: string
  stats: InstituteStats
}

interface Instructor {
  id: string
  avatar: string
  name: string
  title: string
  verified: boolean
  specialties: string[]
  studentCount: number
  rating: number
}

interface InstituteEvent {
  id: string
  cover: string
  title: string
  type: string
  status: string
  startTime: string
  location: string
  isOnline: boolean
  price: number
  currentParticipants: number
}

// ===== 状态 =====
const loading = ref(true)
const instituteInfo = ref<InstituteInfo | null>(null)
const instructors = ref<Instructor[]>([])
const events = ref<InstituteEvent[]>([])
const searchKeyword = ref('')

// ===== 工具函数 =====
function getEventStatusLabel(status: string): string {
  const map: Record<string, string> = { enrolling: '报名中', ongoing: '进行中', ended: '已结束' }
  return map[status] || status
}

function getEventStatusColor(status: string): string {
  const map: Record<string, string> = { enrolling: 'bg-primary text-white', ongoing: 'bg-accent text-white', ended: 'bg-gray-400 text-white' }
  return map[status] || 'bg-gray-400 text-white'
}

function getEventTypeLabel(type: string): string {
  const map: Record<string, string> = { lecture: '讲座', workshop: '工作坊', seminar: '研讨班', course: '课程' }
  return map[type] || type
}

// ===== 模拟数据 =====
const mockInstituteInfo: InstituteInfo = {
  bannerUrl: 'https://picsum.photos/seed/institute/800/400',
  name: '热卜国学研究院',
  slogan: '传承国学经典，汇聚名家智慧',
  description: '热卜国学研究院是一家致力于传统文化研究与传承的学术机构，汇聚了众多国学领域的专家学者。',
  mission: '传承国粹，弘扬中华文化',
  stats: { instructorCount: 12, studentCount: 32000, courseCount: 48, eventCount: 36 }
}

const mockInstructors: Instructor[] = [
  { id: '1', avatar: 'https://picsum.photos/seed/teacher1/100/100', name: '张明远', title: '周易研究专家', verified: true, specialties: ['易经', '风水'], studentCount: 5280, rating: 4.9 },
  { id: '2', avatar: 'https://picsum.photos/seed/teacher2/100/100', name: '李素文', title: '国学教育专家', verified: true, specialties: ['论语', '大学'], studentCount: 4320, rating: 4.8 },
  { id: '3', avatar: 'https://picsum.photos/seed/teacher3/100/100', name: '王德厚', title: '历史学教授', verified: false, specialties: ['史记', '资治通鉴'], studentCount: 3180, rating: 4.7 },
  { id: '4', avatar: 'https://picsum.photos/seed/teacher4/100/100', name: '赵清雅', title: '诗词研究专家', verified: true, specialties: ['唐诗', '宋词'], studentCount: 2960, rating: 4.9 },
  { id: '5', avatar: 'https://picsum.photos/seed/teacher5/100/100', name: '陈伯元', title: '中医文化学者', verified: false, specialties: ['黄帝内经', '本草纲目'], studentCount: 2150, rating: 4.6 },
  { id: '6', avatar: 'https://picsum.photos/seed/teacher6/100/100', name: '刘子墨', title: '书法艺术大师', verified: true, specialties: ['书法', '篆刻'], studentCount: 1890, rating: 4.8 },
]

const mockEvents: InstituteEvent[] = [
  { id: '1', cover: 'https://picsum.photos/seed/event1/400/300', title: '周易与人生智慧讲座', type: 'lecture', status: 'enrolling', startTime: '2026-06-20 14:00', location: '北京市朝阳区国学馆', isOnline: false, price: 0, currentParticipants: 128 },
  { id: '2', cover: 'https://picsum.photos/seed/event2/400/300', title: '论语精读工作坊', type: 'workshop', status: 'enrolling', startTime: '2026-06-25 09:00', location: '', isOnline: true, price: 199, currentParticipants: 67 },
  { id: '3', cover: 'https://picsum.photos/seed/event3/400/300', title: '书法艺术高级研讨班', type: 'seminar', status: 'enrolling', startTime: '2026-07-01 10:00', location: '上海市黄浦区文化艺术中心', isOnline: false, price: 599, currentParticipants: 34 },
]

// ===== 数据加载 =====
onMounted(() => {
  loadData()
})

function loadData() {
  loading.value = true
  setTimeout(() => {
    instituteInfo.value = mockInstituteInfo
    instructors.value = mockInstructors
    events.value = mockEvents
    loading.value = false
  }, 800)
}

// ===== 交互处理 =====
function goBack() { uni.navigateBack() }

function handleSearch() {
  if (searchKeyword.value.trim()) {
    uni.navigateTo({ url: `/pages/institute/instructors/index?keyword=${encodeURIComponent(searchKeyword.value)}` })
  }
}

function goInstructorsList() {
  uni.navigateTo({ url: '/pages/institute/instructors/index' })
}

function goInstructorDetail(id: string) {
  uni.navigateTo({ url: `/pages/institute/instructors/detail?id=${id}` })
}

function goMoreEvents() {
  uni.navigateTo({ url: '/pages/institute/events/index' })
}

function goEventDetail(id: string) {
  uni.navigateTo({ url: `/pages/institute/events/detail?id=${id}` })
}

function goApply() {
  uni.navigateTo({ url: '/pages/institute/apply/index' })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
.skeleton-bg {
  background: linear-gradient(90deg, #f0ece6 25%, #e8e0d5 50%, #f0ece6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.hover-shadow:active {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
</style>
