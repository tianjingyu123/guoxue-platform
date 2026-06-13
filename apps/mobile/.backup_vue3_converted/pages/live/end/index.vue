<template>
  <view v-if="loading" class="min-h-screen bg-background">
    <view class="h-64 bg-gray-200" />
    <view class="p-4 space-y-4">
      <view v-for="i in 3" :key="i" class="bg-white rounded-2xl h-32" />
    </view>
  </view>

  <view v-else class="min-h-screen bg-background pb-24">
    <!-- 封面区域 -->
    <view class="relative h-64">
      <view class="absolute inset-0 bg-gradient-to-br from-gray-600 to-gray-800" />
      <view class="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

      <!-- 顶部导航 -->
      <view class="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
        <view @click="goBack" class="w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
          <text class="text-white text-lg">←</text>
        </view>
      </view>

      <!-- 直播已结束标识 -->
      <view class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <view class="bg-black/60 backdrop-blur-sm rounded-2xl px-6 py-4 text-center">
          <view class="w-12 h-12 mx-auto mb-2 rounded-full bg-white/20 flex items-center justify-center">
            <text class="text-white text-lg">📡</text>
          </view>
          <text class="text-white font-medium block">直播已结束</text>
          <text class="text-white/70 text-sm block mt-1">时长 {{ formatDuration(room.stats.duration) }}</text>
        </view>
      </view>

      <!-- 底部信息 -->
      <view class="absolute bottom-0 left-0 right-0 p-4">
        <text class="text-white font-bold text-lg line-clamp-2 block">{{ room.title }}</text>
        <view class="flex items-center gap-2 mt-2">
          <view v-for="tag in room.tags" :key="tag" class="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full">
            <text>{{ tag }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 主播信息 -->
    <view class="mx-4 -mt-6 relative z-10 bg-white rounded-2xl p-4 shadow-sm">
      <view class="flex items-center justify-between">
        <view class="flex items-center gap-3 flex-1" @click="goTo('/pages/user/index?id=' + room.host.id)">
          <view class="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
            <text class="text-sm text-ink-soft">{{ room.host.name[0] }}</text>
          </view>
          <view>
            <text class="font-medium text-foreground block">{{ room.host.name }}</text>
            <text class="text-sm text-muted-foreground block">{{ formatNumber(room.host.followers) }} 粉丝</text>
          </view>
        </view>
        <view
          @click="isFollowing = !isFollowing"
          :class="['flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium', isFollowing ? 'bg-background text-muted-foreground' : 'bg-primary text-white']"
        >
          <text>{{ isFollowing ? '✓ 已关注' : '＋ 关注' }}</text>
        </view>
      </view>
    </view>

    <!-- 直播数据统计 -->
    <view class="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
      <text class="font-medium text-foreground mb-4 block">直播数据</text>
      <view class="grid grid-cols-4 gap-2">
        <view class="text-center p-3 bg-background rounded-xl">
          <text class="text-primary text-lg block mb-1"></text>
          <text class="text-lg font-bold text-foreground block">{{ formatNumber(room.stats.totalViewers) }}</text>
          <text class="text-xs text-muted-foreground">总观看</text>
        </view>
        <view class="text-center p-3 bg-background rounded-xl">
          <text class="text-accent text-lg block mb-1"></text>
          <text class="text-lg font-bold text-foreground block">{{ formatNumber(room.stats.peakViewers) }}</text>
          <text class="text-xs text-muted-foreground">峰值在线</text>
        </view>
        <view class="text-center p-3 bg-background rounded-xl">
          <text class="text-pink-500 text-lg block mb-1"></text>
          <text class="text-lg font-bold text-foreground block">{{ formatNumber(room.stats.totalLikes) }}</text>
          <text class="text-xs text-muted-foreground">总点赞</text>
        </view>
        <view class="text-center p-3 bg-background rounded-xl">
          <text class="text-orange-500 text-lg block mb-1">🎁</text>
          <text class="text-lg font-bold text-foreground block">{{ formatNumber(room.stats.totalGifts) }}</text>
          <text class="text-xs text-muted-foreground">礼物收入</text>
        </view>
      </view>
    </view>

    <!-- 讲师其他直播 -->
    <view class="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
      <view class="flex items-center justify-between mb-4">
        <text class="font-medium text-foreground">讲师其他直播</text>
        <view @click="goTo('/pages/user/index?id=' + room.host.id + '&tab=lives')" class="flex items-center text-sm text-muted-foreground">
          <text>查看全部 ›</text>
        </view>
      </view>
      <view class="flex flex-col gap-3">
        <view v-for="l in mockRecommendLives" :key="l.id" class="flex gap-3" @click="goToLive(l)">
          <view class="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
            <view class="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/50" />
            <view v-if="l.status === 'live'" class="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 bg-primary text-white text-[10px] rounded">
              <view class="w-1.5 h-1.5 bg-white rounded-full" />
              <text>直播中</text>
            </view>
            <view v-if="l.status === 'preview'" class="absolute top-1 left-1 px-1.5 py-0.5 bg-accent text-white text-[10px] rounded">
              <text>预告</text>
            </view>
          </view>
          <view class="flex-1 min-w-0">
            <text class="font-medium text-foreground text-sm line-clamp-2 block">{{ l.title }}</text>
            <view class="flex items-center gap-2 mt-1">
              <text class="text-xs text-muted-foreground">{{ l.status === 'live' ? formatNumber(l.viewers) + ' 观看' : (l as any).bookedCount + ' 人预约' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 相关课程推荐 -->
    <view class="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
      <view class="flex items-center justify-between mb-4">
        <text class="font-medium text-foreground">相关课程推荐</text>
        <view @click="goTo('/pages/courses/index')" class="flex items-center text-sm text-muted-foreground">
          <text>查看更多 ›</text>
        </view>
      </view>
      <view class="grid grid-cols-2 gap-3">
        <view v-for="course in mockRecommendCourses" :key="course.id" class="bg-background rounded-xl overflow-hidden" @click="goTo('/pages/courses/index?id=' + course.id)">
          <view class="relative aspect-video bg-muted">
            <view class="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/50" />
          </view>
          <view class="p-3">
            <text class="font-medium text-foreground text-sm line-clamp-1 block">{{ course.title }}</text>
            <view class="flex items-center justify-between mt-2">
              <text class="text-primary font-bold">¥{{ course.price }}</text>
              <text class="text-xs text-muted-foreground">{{ course.lessons }}课时</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部固定按钮 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4">
      <view class="flex gap-3">
        <view
          @click="goTo('/pages/circles/index?hostId=' + room.host.id)"
          class="flex-1 py-3 border border-border rounded-xl text-foreground font-medium text-center"
        >
          <text>进入讲师圈子</text>
        </view>
        <view
          v-if="room.hasReplay"
          @click="goTo('/pages/live/replay/index?id=' + room.id)"
          class="flex-1 py-3 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2"
        >
          <text class="text-white">▶</text>
          <text>查看回放</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// ============================================================
// Types
// ============================================================
interface LiveRoomStats {
  totalViewers: number
  peakViewers: number
  totalLikes: number
  totalGifts: number
  duration: number
}

interface RoomData {
  id: string
  title: string
  cover: string
  status: string
  host: { id: string; name: string; avatar: string; followers: number }
  viewers: number
  likes: number
  startTime: string
  endTime: string
  category: string
  tags: string[]
  stats: LiveRoomStats
  hasReplay: boolean
  replayUrl: string
}

interface RecommendLive {
  id: string
  title: string
  cover: string
  status: string
  host: { id: string; name: string; avatar: string; followers: number }
  viewers: number
  likes: number
  startTime: string
  category: string
  isBooked?: boolean
  bookedCount?: number
}

interface RecommendCourse {
  id: string
  title: string
  cover: string
  price: number
  lessons: number
}

// ============================================================
// Mock data
// ============================================================
const mockRoom: RoomData = {
  id: '1',
  title: '《周易》六十四卦精讲：乾卦的智慧',
  cover: '/placeholder.svg',
  status: 'replay',
  host: { id: 'h1', name: '易经大师·张道长', avatar: '/placeholder.svg', followers: 12580 },
  viewers: 0,
  likes: 8532,
  startTime: '2024-01-15T14:00:00',
  endTime: '2024-01-15T16:30:00',
  category: '易经',
  tags: ['周易', '六十四卦', '国学'],
  stats: { totalViewers: 15680, peakViewers: 3256, totalLikes: 8532, totalGifts: 1256, duration: 9000 },
  hasReplay: true,
  replayUrl: '/live/1?replay=true',
}

const mockRecommendLives: RecommendLive[] = [
  { id: '2', title: '紫微斗数入门：认识你的命盘', cover: '/placeholder.svg', status: 'preview', host: { id: 'h1', name: '易经大师·张道长', avatar: '/placeholder.svg', followers: 12580 }, viewers: 0, likes: 0, startTime: '2024-01-20T14:00:00', category: '紫微斗数', isBooked: false, bookedCount: 856 },
  { id: '3', title: '风水布局与家居吉凶', cover: '/placeholder.svg', status: 'live', host: { id: 'h2', name: '风水师·李明', avatar: '/placeholder.svg', followers: 8960 }, viewers: 1256, likes: 3200, category: '风水' },
]

const mockRecommendCourses: RecommendCourse[] = [
  { id: 'c1', title: '周易六十四卦系统课', cover: '/placeholder.svg', price: 299, lessons: 64 },
  { id: 'c2', title: '紫微斗数精讲班', cover: '/placeholder.svg', price: 399, lessons: 48 },
]

// ============================================================
// State
// ============================================================
const loading = ref(true)
const room = ref<RoomData>(mockRoom)
const isFollowing = ref(false)

// ============================================================
// Lifecycle
// ============================================================
onMounted(() => {
  setTimeout(() => { loading.value = false }, 500)
})

// ============================================================
// Methods
// ============================================================
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}小时${mins}分钟`
  return `${mins}分钟`
}

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return String(num)
}

function goBack() {
  uni.navigateBack()
}

function goTo(url: string) {
  uni.navigateTo({ url })
}

function goToLive(l: RecommendLive) {
  if (l.status === 'live') {
    uni.navigateTo({ url: '/pages/live/id-detail/index?id=' + l.id })
  } else if (l.status === 'preview') {
    uni.navigateTo({ url: '/pages/live/preview/index?id=' + l.id })
  }
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
