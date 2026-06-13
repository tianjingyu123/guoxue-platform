<template>
  <view class="min-h-screen" style="background-color: #FAF8F5;">
    <!-- 导航栏 -->
    <view class="sticky top-0 z-50" style="background: linear-gradient(to right, #C41E3A, #A01830); color: #FFFFFF;">
      <view class="flex items-center justify-between px-4" style="height: 48px;">
        <view @click="goBack" class="p-1 rounded-full" hover-class="nav-btn-hover" style="cursor: pointer;">
          <text style="color: #FFFFFF; font-size: 18px; line-height: 1;">←</text>
        </view>
        <view class="flex items-center gap-2">
          <image
            v-if="stationLogo"
            :src="stationLogo"
            mode="aspectFill"
            class="w-6 h-6 rounded-full"
            style="border-radius: 50%;"
          />
          <view v-else class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style="background-color: rgba(255,255,255,0.2);">
            <text>国</text>
          </view>
          <text class="font-medium" style="color: #FFFFFF;">{{ stationName }} - 直播</text>
        </view>
        <view
          @click="handleRefresh"
          class="p-1 rounded-full"
          hover-class="nav-btn-hover"
          :class="refreshing ? 'animate-spin-custom' : ''"
          style="cursor: pointer;"
        >
          <text style="color: #FFFFFF; font-size: 16px; line-height: 1;"></text>
        </view>
      </view>

      <!-- 搜索框 -->
      <view class="px-4 pb-3">
        <view class="relative">
          <input
            v-model="searchKeyword"
            placeholder="搜索直播间"
            class="w-full px-9 py-2 rounded-full text-sm"
            style="background-color: rgba(255,255,255,0.9); color: #2C2C2C;"
            placeholder-style="color: #999;"
          />
          <text class="absolute left-3 top-1/2 text-sm" style="color: #999; transform: translateY(-50%);"></text>
        </view>
      </view>
    </view>

    <!-- 筛选标签 -->
    <view class="sticky z-40 px-4 py-3" style="top: 104px; background-color: #FAF8F5; border-bottom: 1px solid #E8E0D5;">
      <scroll-view scroll-x class="flex-nowrap" style="white-space: nowrap;">
        <view
          v-for="option in filterOptions"
          :key="option.value"
          @click="switchFilter(option.value)"
          class="inline-block px-4 py-1.5 rounded-full text-sm whitespace-nowrap mr-2"
          :style="{
            backgroundColor: filter === option.value ? '#C41E3A' : '#FFFFFF',
            color: filter === option.value ? '#FFFFFF' : '#999',
            cursor: 'pointer',
          }"
        >
          <text>{{ option.label }}</text>
          <text v-if="option.value === 'live' && liveCount > 0" class="ml-1">({{ liveCount }})</text>
        </view>
      </scroll-view>
    </view>

    <!-- 直播列表 -->
    <view class="px-4 py-4">
      <!-- Loading State -->
      <view v-if="loading" class="space-y-4">
        <view v-for="i in 3" :key="i" class="rounded-xl overflow-hidden" style="background-color: #FFFFFF;">
          <view class="w-full skeleton-pulse" style="aspect-ratio: 16/9; background-color: #F0EBE5;" />
          <view class="p-3 space-y-2">
            <view class="h-5 w-3/4 rounded skeleton-pulse" style="background-color: #F0EBE5;" />
            <view class="flex items-center gap-2">
              <view class="w-8 h-8 rounded-full skeleton-pulse" style="background-color: #F0EBE5;" />
              <view class="h-4 w-24 rounded skeleton-pulse" style="background-color: #F0EBE5;" />
            </view>
            <view class="flex items-center gap-3">
              <view class="h-4 w-16 rounded skeleton-pulse" style="background-color: #F0EBE5;" />
              <view class="h-4 w-16 rounded skeleton-pulse" style="background-color: #F0EBE5;" />
            </view>
          </view>
        </view>
      </view>

      <!-- Error State -->
      <view v-else-if="error" class="flex flex-col items-center justify-center py-16">
        <text class="text-sm mb-3" style="color: #999;">{{ error }}</text>
        <view @click="loadData" class="px-6 py-2 rounded-full text-sm" style="background-color: #C41E3A; color: #FFFFFF; cursor: pointer;">重试</view>
      </view>

      <template v-else>
        <view v-if="groupedRooms.length > 0" class="space-y-4">
          <view
            v-for="room in groupedRooms"
            :key="room.id"
            @click="enterLiveRoom(room.id)"
            class="rounded-xl overflow-hidden"
            :style="{
              backgroundColor: '#FFFFFF',
              boxShadow: room.status === 'live' ? '0 0 0 2px #C41E3A' : 'none',
              cursor: 'pointer',
            }"
          >
            <!-- 封面 -->
            <view class="relative" style="aspect-ratio: 16/9;">
              <image
                :src="room.cover"
                mode="aspectFill"
                class="w-full h-full"
                style="background: linear-gradient(135deg, rgba(196,30,58,0.2), rgba(201,169,110,0.1));"
                @error="onCoverError(room)"
              />
              <view
                v-if="room._coverError"
                class="absolute inset-0 flex items-center justify-center"
                style="background: linear-gradient(135deg, rgba(196,30,58,0.2), rgba(201,169,110,0.1));"
              >
                <text style="font-size: 36px; color: rgba(153,153,153,0.3);">📻</text>
              </view>

              <!-- 状态标签 -->
              <view
                class="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1"
                :style="{ backgroundColor: room._statusInfo.bg, color: room._statusInfo.color }"
              >
                <view v-if="room.status === 'live'" class="w-1.5 h-1.5 rounded-full" style="background-color: #FFFFFF;" />
                <text>{{ room._statusInfo.label }}</text>
              </view>

              <!-- LIVE 角标 -->
              <view
                v-if="room.status === 'live'"
                class="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-0.5"
                style="background-color: #C41E3A;"
              >
                <text>LIVE</text>
              </view>

              <!-- 回放时长 -->
              <view
                v-if="room.status === 'replay'"
                class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-xs text-white"
                style="background-color: rgba(0,0,0,0.6);"
              >
                <text>{{ room._replayDurationFormatted }}</text>
              </view>

              <!-- 预告倒计时 -->
              <view
                v-if="room.status === 'preview'"
                class="absolute inset-0 flex items-center justify-center"
                style="background-color: rgba(0,0,0,0.4);"
              >
                <view class="text-center text-white">
                  <text class="text-2xl block mb-1"></text>
                  <text class="text-sm font-medium">{{ room._countdownStr }}</text>
                </view>
              </view>

              <!-- 商品数量 -->
              <view
                v-if="room.productCount > 0"
                class="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-xs text-white flex items-center gap-0.5"
                style="background-color: #C9A96E;"
              >
                <text>️ {{ room.productCount }}件商品</text>
              </view>
            </view>

            <!-- 信息 -->
            <view class="p-3">
              <text class="font-medium text-sm block mb-2" style="color: #2C2C2C; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">{{ room.title }}</text>

              <!-- 主播信息 -->
              <view class="flex items-center gap-2 mb-2">
                <image
                  :src="room.anchorAvatar"
                  mode="aspectFill"
                  class="w-6 h-6 rounded-full"
                  style="border-radius: 50%; background-color: #F0EBE5;"
                  @error="room._anchorError = true"
                />
                <view
                  v-if="room._anchorError || !room.anchorAvatar"
                  class="w-6 h-6 rounded-full flex items-center justify-center text-[10px]" style="background-color: #F5F1EB; color: #999;"
                >
                  <text>{{ room.anchorName.charAt(0) }}</text>
                </view>
                <text class="text-xs truncate flex-1" style="color: #999;">{{ room.anchorName }}</text>
                <view
                  v-if="room.isStationExclusive"
                  class="text-[10px] px-1.5 py-0.5 rounded"
                  style="background-color: rgba(196,30,58,0.1); color: #C41E3A;"
                >
                  <text>专属</text>
                </view>
              </view>

              <!-- 统计数据 -->
              <view class="flex items-center gap-3 text-xs" style="color: #999;">
                <text class="flex items-center gap-1"> {{ formatViewCount(room.viewCount) }}</text>
                <text class="flex items-center gap-1">♥ {{ formatViewCount(room.likeCount) }}</text>
              </view>

              <!-- 标签 -->
              <view v-if="room.tags && room.tags.length > 0" class="flex items-center gap-1 mt-2 flex-wrap">
                <view
                  v-for="(tag, idx) in room.tags.slice(0, 3)"
                  :key="idx"
                  class="text-[10px] px-1.5 py-0.5 rounded"
                  style="background-color: #F5F1EB; color: #999;"
                >
                  <text>{{ tag }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- Empty State -->
        <view v-else-if="!loading" class="text-center py-16">
          <text class="text-sm mb-3 block" style="color: #999;">暂无相关内容</text>
        </view>

        <!-- 空态引导：直播中无内容 -->
        <view v-if="!loading && filteredList.length === 0 && filter === 'live'" class="text-center py-4">
          <text class="block mb-4" style="color: #999;">暂无正在直播的内容</text>
          <view
            @click="filter = 'preview'"
            class="inline-block px-4 py-2 rounded-lg border text-sm"
            style="border-color: #C9A96E; color: #C9A96E; cursor: pointer;"
          >
            <text class="mr-1"></text>
            <text>查看直播预告</text>
          </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="hasMore" class="mt-4 flex justify-center">
          <view
            @click="loadMore"
            class="flex items-center gap-1 text-sm"
            style="color: #C9A96E; cursor: pointer;"
          >
            <text>{{ loadingMore ? '加载中...' : '加载更多' }}</text>
            <text v-if="!loadingMore" style="font-size: 14px;">❯</text>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// --- Types ---
type LiveStatus = 'live' | 'preview' | 'replay'
type LiveFilter = 'all' | 'live' | 'preview' | 'replay'

interface LiveRoom {
  id: number
  title: string
  anchorName: string
  anchorAvatar: string
  status: LiveStatus
  cover: string
  viewCount: number
  likeCount: number
  productCount: number
  isStationExclusive: boolean
  tags: string[]
  replayDuration?: number // seconds
  scheduledTime?: number  // timestamp
  // UI-only
  _coverError: boolean
  _anchorError: boolean
  _replayDurationFormatted: string
  _countdownStr: string
  _statusInfo: { label: string; color: string; bg: string }
}

// --- Filter Options (V0 一致) ---
const filterOptions: { value: LiveFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'live', label: '直播中' },
  { value: 'preview', label: '预告' },
  { value: 'replay', label: '回放' },
]

// --- State ---
const filter = ref<LiveFilter>('all')
const searchKeyword = ref('')
const loading = ref(true)
const error = ref<string | null>(null)
const refreshing = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const page = ref(1)

const stationName = '国学推广联盟'
const stationLogo = ''

let countdownTimers: ReturnType<typeof setInterval>[] = []

// --- Mock Data ---
const allRooms = ref<LiveRoom[]>([])

function createMockRooms(): LiveRoom[] {
  const now = Date.now()
  const rooms: LiveRoom[] = [
    {
      id: 1, title: '八字命理实战：教你一眼看透财运', anchorName: '周易大师', anchorAvatar: '',
      status: 'live', cover: '', viewCount: 1280, likeCount: 356, productCount: 2,
      isStationExclusive: true, tags: ['八字', '财运'], replayDuration: undefined, scheduledTime: undefined,
      _coverError: false, _anchorError: false, _replayDurationFormatted: '', _countdownStr: '', _statusInfo: { label: '直播中', color: '#fff', bg: '#EF4444' },
    },
    {
      id: 2, title: '紫微斗数在线答疑专场', anchorName: '紫微传承人', anchorAvatar: '',
      status: 'live', cover: '', viewCount: 856, likeCount: 228, productCount: 0,
      isStationExclusive: false, tags: ['紫微', '答疑'], replayDuration: undefined, scheduledTime: undefined,
      _coverError: false, _anchorError: false, _replayDurationFormatted: '', _countdownStr: '', _statusInfo: { label: '直播中', color: '#fff', bg: '#EF4444' },
    },
    {
      id: 3, title: '风水布局：2025年居家旺运指南', anchorName: '风水实战派', anchorAvatar: '',
      status: 'preview', cover: '', viewCount: 0, likeCount: 0, productCount: 1,
      isStationExclusive: true, tags: ['风水', '居家'], replayDuration: undefined, scheduledTime: now + 2 * 3600 * 1000,
      _coverError: false, _anchorError: false, _replayDurationFormatted: '', _countdownStr: '', _statusInfo: { label: '预告', color: '#C9A96E', bg: 'rgba(201,169,110,0.2)' },
    },
    {
      id: 4, title: '六爻占卜入门教学', anchorName: '易学小白导师', anchorAvatar: '',
      status: 'preview', cover: '', viewCount: 0, likeCount: 0, productCount: 0,
      isStationExclusive: false, tags: ['六爻'], replayDuration: undefined, scheduledTime: now + 12 * 3600 * 1000,
      _coverError: false, _anchorError: false, _replayDurationFormatted: '', _countdownStr: '', _statusInfo: { label: '预告', color: '#C9A96E', bg: 'rgba(201,169,110,0.2)' },
    },
    {
      id: 5, title: '过去一周八字热点解析（回放）', anchorName: '周易大师', anchorAvatar: '',
      status: 'replay', cover: '', viewCount: 3560, likeCount: 892, productCount: 3,
      isStationExclusive: true, tags: ['八字', '热点'], replayDuration: 5025, scheduledTime: undefined,
      _coverError: false, _anchorError: false, _replayDurationFormatted: '', _countdownStr: '', _statusInfo: { label: '回放', color: '#999', bg: 'rgba(153,153,153,0.2)' },
    },
    {
      id: 6, title: '奇门遁甲决策应用分享', anchorName: '奇门研究员', anchorAvatar: '',
      status: 'replay', cover: '', viewCount: 1860, likeCount: 456, productCount: 0,
      isStationExclusive: false, tags: ['奇门'], replayDuration: 3390, scheduledTime: undefined,
      _coverError: false, _anchorError: false, _replayDurationFormatted: '', _countdownStr: '', _statusInfo: { label: '回放', color: '#999', bg: 'rgba(153,153,153,0.2)' },
    },
  ]
  // Pre-compute UI fields
  for (const room of rooms) {
    room._replayDurationFormatted = formatDuration(room.replayDuration || 0)
    room._countdownStr = computeCountdownStr(room)
  }
  return rooms
}

// --- Computed ---
const liveCount = computed(() => allRooms.value.filter(r => r.status === 'live').length)

const filteredList = computed(() => {
  let list = allRooms.value
  if (filter.value !== 'all') {
    list = list.filter(r => r.status === filter.value)
  }
  if (searchKeyword.value) {
    const kw = searchKeyword.value
    list = list.filter(r => r.title.includes(kw) || r.anchorName.includes(kw))
  }
  return list
})

const groupedRooms = computed(() => {
  // V0 排序：直播中 → 预告 → 回放
  const live = filteredList.value.filter(r => r.status === 'live')
  const preview = filteredList.value.filter(r => r.status === 'preview')
  const replay = filteredList.value.filter(r => r.status === 'replay')
  return [...live, ...preview, ...replay]
})

// --- Helpers ---
function formatViewCount(count: number): string {
  if (count >= 10000) return (count / 10000).toFixed(1) + '万'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return String(count)
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function computeCountdownStr(room: LiveRoom): string {
  if (room.status !== 'preview' || !room.scheduledTime) return ''
  const diff = Math.max(0, Math.floor((room.scheduledTime - Date.now()) / 1000))
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function updateCountdowns() {
  for (const room of allRooms.value) {
    if (room.status === 'preview' && room.scheduledTime) {
      room._countdownStr = computeCountdownStr(room)
    }
  }
}

// --- Lifecycle ---
onMounted(() => {
  loadData()
  // Start countdown timer (1s interval, V0 一致)
  const timer = setInterval(updateCountdowns, 1000)
  countdownTimers.push(timer)
})

onUnmounted(() => {
  for (const t of countdownTimers) clearInterval(t)
  countdownTimers = []
})

// --- Data Loading ---
function loadData() {
  loading.value = true
  error.value = null
  setTimeout(() => {
    try {
      allRooms.value = createMockRooms()
      hasMore.value = false
      loading.value = false
    } catch {
      error.value = '网络错误，请重试'
      loading.value = false
    }
  }, 800)
}

function switchFilter(value: LiveFilter) {
  filter.value = value
}

function handleRefresh() {
  refreshing.value = true
  setTimeout(() => {
    loadData()
    refreshing.value = false
    uni.showToast({ title: '已刷新', icon: 'success' })
  }, 1000)
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  setTimeout(() => {
    page.value++
    hasMore.value = false
    loadingMore.value = false
  }, 800)
}

function enterLiveRoom(roomId: number) {
  uni.navigateTo({ url: '/pages/live/room/index?id=' + roomId })
}

function onCoverError(room: LiveRoom) {
  room._coverError = true
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
@keyframes skeletonPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.skeleton-pulse {
  animation: skeletonPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes customSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin-custom {
  animation: customSpin 1s linear infinite;
}
.nav-btn-hover {
  background-color: rgba(255, 255, 255, 0.2) !important;
}
</style>
