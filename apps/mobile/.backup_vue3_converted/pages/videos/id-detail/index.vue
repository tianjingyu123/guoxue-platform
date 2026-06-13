<template>
  <!-- ===== 骨架屏 ===== -->
  <view v-if="loading" class="min-h-screen bg-background">
    <view class="bg-black animate-pulse" style="aspect-ratio:16/9" />
    <view class="p-4 space-y-4">
      <view class="h-6 bg-[#E8E0D5] rounded w-3/4" />
      <view class="h-4 bg-[#E8E0D5] rounded w-1/2" />
      <view class="flex items-center gap-3 mt-4">
        <view class="w-12 h-12 bg-[#E8E0D5] rounded-full" />
        <view class="space-y-2 flex-1">
          <view class="h-4 bg-[#E8E0D5] rounded w-1/4" />
          <view class="h-3 bg-[#E8E0D5] rounded w-1/5" />
        </view>
      </view>
      <view class="h-24 bg-[#E8E0D5] rounded-xl" />
      <view class="h-32 bg-[#E8E0D5] rounded-xl" />
    </view>
  </view>

  <!-- ===== 错误或不存在 ===== -->
  <view v-else-if="!video" class="min-h-screen flex flex-col items-center justify-center bg-background p-4">
    <text class="text-5xl text-[#E8E0D5] block mb-4"></text>
    <text class="text-muted-foreground text-sm">视频不存在或已删除</text>
    <view @click="goBack" class="mt-6 px-6 py-2 bg-primary text-white text-sm rounded-full active:opacity-80">返回</view>
  </view>

  <!-- ===== 主内容 ===== -->
  <template v-else>
    <view class="min-h-screen bg-background">
      <!-- ===== 视频播放器区域 ===== -->
      <view class="relative bg-black" style="aspect-ratio:16/9" @click="handlePlayerClick">
        <!-- UniApp 原生视频组件 -->
        <video
          id="video-player"
          ref="videoRef"
          :src="video.videoUrl || ''"
          :poster="video.coverUrl"
          :controls="false"
          :autoplay="false"
          :muted="isMuted"
          :show-center-play-btn="false"
          :enable-progress-gesture="false"
          object-fit="contain"
          class="absolute inset-0 w-full h-full"
          @play="onVideoPlay"
          @pause="onVideoPause"
          @ended="onVideoEnded"
          @timeupdate="onVideoTimeUpdate"
          @error="onVideoError"
        />

        <!-- 封面图 + 播放按钮（未开始播放时显示） -->
        <view v-if="!hasStarted" class="absolute inset-0 flex items-center justify-center bg-black" @click.stop="togglePlay">
          <image v-if="video.coverUrl" :src="video.coverUrl" mode="aspectFill" class="absolute inset-0 w-full h-full opacity-60" />
          <view class="w-16 h-16 rounded-full flex items-center justify-center z-10" style="background:rgba(255,255,255,0.25);backdrop-filter:blur(4px)">
            <text class="text-white text-3xl leading-none">▶</text>
          </view>
        </view>

        <!-- 播放中叠加层（点击暂停/播放） -->
        <view
          v-else
          :class="['absolute inset-0 z-10', showControls ? '' : 'pointer-events-none']"
          @click.stop="togglePlay"
        >
          <view :class="['absolute inset-0 flex items-center justify-center transition-opacity duration-200', isPlaying && !showControls ? 'opacity-0' : 'opacity-100']">
            <view class="w-12 h-12 rounded-full flex items-center justify-center" style="background:rgba(255,255,255,0.2);backdrop-filter:blur(4px)">
              <text class="text-white text-2xl leading-none">⏸</text>
            </view>
          </view>
        </view>

        <!-- 顶部导航 -->
        <view :class="['absolute top-0 left-0 right-0 z-20 transition-opacity duration-300', showControls ? 'opacity-100' : 'opacity-0 pointer-events-none']">
          <view class="flex items-center justify-between p-4" style="background:linear-gradient(to bottom,rgba(0,0,0,0.6),transparent)">
            <view @click.stop="goBack" class="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 active:bg-black/60">
              <text class="text-white text-xl leading-none">←</text>
            </view>
            <text class="text-white text-sm font-medium truncate max-w-[200px]">{{ video.title }}</text>
            <view @click.stop="handleShare" class="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 active:bg-black/60">
              <text class="text-white text-lg leading-none"></text>
            </view>
          </view>
        </view>

        <!-- 底部控制栏 -->
        <view :class="['absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300', showControls ? 'opacity-100' : 'opacity-0 pointer-events-none']">
          <view class="p-4 pt-8" style="background:linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 100%)">
            <!-- 进度条 -->
            <view class="flex items-center gap-2 mb-3">
              <text class="text-white text-xs font-mono w-10 text-center">{{ formatTime(currentTime) }}</text>
              <view class="flex-1 relative h-1.5 bg-white/30 rounded-full" @click.stop="handleProgressBarClick">
                <view class="h-full bg-primary rounded-full relative" :style="{ width: progress + '%' }">
                  <view class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
                </view>
              </view>
              <text class="text-white text-xs font-mono w-10 text-center">{{ formatTime(duration) }}</text>
            </view>

            <!-- 控制按钮 -->
            <view class="flex items-center justify-between">
              <view class="flex items-center gap-4">
                <view @click.stop="togglePlay" class="active:opacity-60">
                  <text class="text-white text-2xl leading-none">{{ isPlaying ? '⏸' : '▶' }}</text>
                </view>
                <view @click.stop="seekRelative(-10)" class="active:opacity-60">
                  <text class="text-white text-lg leading-none">⏪</text>
                </view>
                <view @click.stop="seekRelative(10)" class="active:opacity-60">
                  <text class="text-white text-lg leading-none">⏩</text>
                </view>
              </view>
              <view class="flex items-center gap-3">
                <view @click.stop="isMuted = !isMuted" class="active:opacity-60">
                  <text class="text-white text-lg leading-none">{{ isMuted ? '' : '' }}</text>
                </view>
                <view @click.stop="requestFullscreen" class="active:opacity-60">
                  <text class="text-white text-lg leading-none">⛶</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- ===== 内容信息区 ===== -->
      <view class="px-4 pt-4 pb-2 bg-white border-b border-border">
        <!-- 标题 -->
        <text class="text-lg font-bold text-foreground block leading-snug">{{ video.title }}</text>

        <!-- 描述（可展开） -->
        <view class="mt-2">
          <text :class="['text-sm text-ink-soft block leading-relaxed', showFullDesc ? '' : 'line-clamp-2']">{{ video.description }}</text>
          <text v-if="video.description.length > 60" @click="showFullDesc = !showFullDesc" class="text-primary text-xs mt-1 block active:opacity-70">
            {{ showFullDesc ? '收起 ▲' : '展开 ▼' }}
          </text>
        </view>

        <!-- 标签 -->
        <view v-if="video.tags && video.tags.length > 0" class="flex flex-wrap gap-2 mt-3">
          <text v-for="(tag, idx) in video.tags" :key="idx"
            class="px-2.5 py-1 bg-[#FFF5F5] text-primary text-xs rounded-full">#{{ tag }}</text>
        </view>

        <!-- 统计数据 -->
        <view class="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <text class="flex items-center gap-1"> {{ formatCount(viewCount) }} 次观看</text>
          <text class="flex items-center gap-1"> {{ formatCount(likes) }}</text>
          <text class="flex items-center gap-1"> {{ formatCount(commentList.length) }}</text>
          <text class="flex items-center gap-1"> {{ formatCount(collects) }}</text>
        </view>
      </view>

      <!-- ===== 作者信息 ===== -->
      <view class="px-4 py-4 bg-white border-b border-border">
        <view class="flex items-center justify-between">
          <view @click="goTo('/pages/profile/index?id=' + video.authorId)" class="flex items-center gap-3 flex-1 min-w-0 active:opacity-70">
            <view class="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0" style="background:linear-gradient(135deg,#C41E3A,#E74C3C)">
              <text>{{ video.authorName[0] }}</text>
            </view>
            <view class="min-w-0">
              <view class="flex items-center gap-1">
                <text class="font-medium text-sm text-foreground truncate">{{ video.authorName }}</text>
                <text v-if="video.authorVerified" class="text-[10px] px-1 py-0.5 rounded bg-accent/20 text-accent leading-none">V</text>
              </view>
              <text class="text-xs text-muted-foreground block">{{ formatCount(video.authorFollowers) }} 粉丝</text>
            </view>
          </view>
          <view @click="handleFollow"
            class="shrink-0 ml-3 px-4 py-1.5 rounded-full text-sm font-medium active:opacity-80"
            :class="isFollowed ? 'bg-secondary text-muted-foreground' : 'bg-primary text-white'">
            <text>{{ isFollowed ? '已关注' : '+ 关注' }}</text>
          </view>
        </view>
      </view>

      <!-- ===== 互动操作栏 ===== -->
      <view class="mx-4 mt-4 p-3 bg-white rounded-xl border border-border flex items-center justify-around">
        <view @click="handleLike" class="flex flex-col items-center gap-1 min-w-[64px] active:opacity-70">
          <view :class="['w-10 h-10 rounded-full flex items-center justify-center transition-colors', isLiked ? 'bg-[#FFF5F5]' : 'bg-secondary']">
            <text :class="['text-lg leading-none', isLiked ? 'text-primary' : 'text-muted-foreground']">{{ isLiked ? '' : '🤍' }}</text>
          </view>
          <text :class="['text-xs', isLiked ? 'text-primary' : 'text-muted-foreground']">{{ formatCompact(likes) }}</text>
        </view>
        <view @click="handleCollect" class="flex flex-col items-center gap-1 min-w-[64px] active:opacity-70">
          <view :class="['w-10 h-10 rounded-full flex items-center justify-center transition-colors', isCollected ? 'bg-[#FFF9E6]' : 'bg-secondary']">
            <text :class="['text-lg leading-none', isCollected ? 'text-accent' : 'text-muted-foreground']">{{ isCollected ? '' : '☆' }}</text>
          </view>
          <text :class="['text-xs', isCollected ? 'text-accent' : 'text-muted-foreground']">{{ formatCompact(collects) }}</text>
        </view>
        <view @click="scrollToComment" class="flex flex-col items-center gap-1 min-w-[64px] active:opacity-70">
          <view class="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <text class="text-lg leading-none text-muted-foreground"></text>
          </view>
          <text class="text-xs text-muted-foreground">评论</text>
        </view>
        <view @click="handleShare" class="flex flex-col items-center gap-1 min-w-[64px] active:opacity-70">
          <view class="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <text class="text-lg leading-none text-muted-foreground"></text>
          </view>
          <text class="text-xs text-muted-foreground">分享</text>
        </view>
      </view>

      <!-- ===== 推荐商品卡片 ===== -->
      <view v-if="video.product" @click="goTo('/pages/shop/product/index?id=' + video.product.id)"
        class="mx-4 mt-4 p-3 bg-white rounded-xl border border-border flex items-center gap-3 active:bg-secondary/50">
        <view class="w-16 h-16 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-secondary">
          <image v-if="video.product.image" :src="video.product.image" mode="aspectFill" class="w-full h-full" />
          <text v-else class="text-2xl text-muted-foreground"></text>
        </view>
        <view class="flex-1 min-w-0">
          <text class="text-sm font-medium text-foreground truncate block">{{ video.product.name }}</text>
          <text class="text-primary font-bold block mt-1">¥{{ video.product.price }}</text>
        </view>
        <text class="shrink-0 px-3 py-1.5 bg-primary text-white text-xs rounded-full active:bg-primary/90">去购买</text>
      </view>

      <!-- ===== 评论区标题 ===== -->
      <view ref="commentSection" class="mt-6 bg-white">
        <view class="px-4 py-3 border-b border-border">
          <text class="font-semibold text-base text-foreground">评论 ({{ commentList.length }})</text>
        </view>

        <!-- 评论输入框 -->
        <view class="px-4 py-3 border-b border-border">
          <view class="flex items-center gap-3">
            <view class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs shrink-0" style="background:linear-gradient(135deg,#C41E3A,#E74C3C)">
              <text>我</text>
            </view>
            <view class="flex-1 flex items-center gap-2 px-3 py-2 bg-secondary rounded-full">
              <input v-model="commentText" placeholder="发表评论..." class="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground" @confirm="handleSubmitComment" />
              <text class="text-muted-foreground text-sm">@</text>
            </view>
            <view @click="handleSubmitComment"
              class="w-9 h-9 rounded-full flex items-center justify-center active:opacity-80"
              :class="commentText.trim() ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'">
              <text class="text-lg leading-none">➤</text>
            </view>
          </view>
        </view>

        <!-- 评论列表 -->
        <view class="divide-y divide-border">
          <view v-for="comment in commentList" :key="comment.id" class="px-4 py-3">
            <view class="flex gap-3">
              <!-- 头像 -->
              <view class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs shrink-0" style="background:linear-gradient(135deg,#C41E3A,#E74C3C)">
                <text>{{ comment.userName[0] }}</text>
              </view>
              <view class="flex-1 min-w-0">
                <!-- 用户名 -->
                <view class="flex items-center gap-2">
                  <text class="text-sm font-medium text-foreground">{{ comment.userName }}</text>
                  <text v-if="comment.isAuthor" class="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded leading-none">作者</text>
                </view>
                <!-- 内容 -->
                <text class="text-sm text-ink-soft block mt-1 leading-relaxed">{{ comment.content }}</text>
                <!-- 操作栏 -->
                <view class="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <text>{{ formatDate(comment.createdAt) }}</text>
                  <view @click="handleCommentLike(comment.id)" :class="['flex items-center gap-1 active:opacity-70', comment.isLiked ? 'text-primary' : '']">
                    <text>{{ comment.isLiked ? '' : '🤍' }}</text>
                    <text>{{ comment.likes }}</text>
                  </view>
                  <text class="active:opacity-70">回复</text>
                </view>

                <!-- 回复列表 -->
                <view v-if="comment.replies && comment.replies.length > 0" class="mt-3 pl-3 border-l-2 border-border space-y-3">
                  <view v-for="reply in comment.replies" :key="reply.id">
                    <view class="flex items-center gap-2">
                      <view class="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] shrink-0" style="background:linear-gradient(135deg,#C41E3A,#E74C3C)">
                        <text>{{ reply.userName[0] }}</text>
                      </view>
                      <text class="text-sm font-medium text-foreground">{{ reply.userName }}</text>
                      <text v-if="reply.isAuthor" class="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded leading-none">作者</text>
                    </view>
                    <text class="text-sm text-ink-soft block mt-1 ml-8 leading-relaxed">{{ reply.content }}</text>
                  </view>
                </view>

                <!-- 查看全部回复 -->
                <text v-if="comment.replyCount > (comment.replies ? comment.replies.length : 0)"
                  class="text-primary text-xs mt-2 block active:opacity-70">
                  查看全部 {{ comment.replyCount }} 条回复 →
                </text>
              </view>
            </view>
          </view>

          <!-- 空评论状态 -->
          <view v-if="commentList.length === 0" class="py-12 flex flex-col items-center">
            <text class="text-4xl text-[#E8E0D5] block mb-3"></text>
            <text class="text-sm text-muted-foreground">暂无评论，来说两句吧</text>
          </view>
        </view>
      </view>

      <!-- 底部间距 -->
      <view class="h-24" />
    </view>
  </template>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { api } from '@/api'

// ===== 类型定义 =====
interface VideoProduct {
  id: string
  name: string
  image?: string
  price: number
}

interface VideoReply {
  id: string
  userId: string
  userName: string
  content: string
  likes: number
  isLiked: boolean
  isAuthor: boolean
  createdAt: string
}

interface VideoComment {
  id: string
  userId: string
  userName: string
  content: string
  likes: number
  isLiked: boolean
  isAuthor: boolean
  replies: VideoReply[]
  replyCount: number
  createdAt: string
}

interface VideoDetailData {
  id: string
  title: string
  description: string
  videoUrl?: string
  coverUrl: string
  duration: number
  authorId: string
  authorName: string
  authorFollowers: number
  authorVerified: boolean
  tags: string[]
  viewCount: number
  likes: number
  comments: number
  collects: number
  shares: number
  isLiked: boolean
  isCollected: boolean
  isFollowed: boolean
  product?: VideoProduct
  createdAt: string
}

// ===== 状态 =====
const loading = ref(true)
const video = ref<VideoDetailData | null>(null)

// 播放状态
const isPlaying = ref(false)
const isMuted = ref(false)
const hasStarted = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const showControls = ref(true)

// 视频上下文
let videoContext: any = null

// 交互状态
const isFollowed = ref(false)
const isLiked = ref(false)
const isCollected = ref(false)
const likes = ref(0)
const collects = ref(0)
const viewCount = ref(0)
const showFullDesc = ref(false)
const commentText = ref('')

// 评论列表
const commentList = ref<VideoComment[]>([])

// 控制栏自动隐藏定时器
let controlsTimer: ReturnType<typeof setTimeout> | null = null

// ===== 引用 =====
const playerContainer = ref<any>(null)
const commentSection = ref<any>(null)

// ===== 计算属性 =====
const progress = computed(() => {
  if (duration.value <= 0) return 0
  return (currentTime.value / duration.value) * 100
})

// ===== 工具函数 =====
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatCount(n: number): string {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿'
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return String(n)
}

function formatCompact(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return '999+'
  return String(n)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return minutes + '分钟前'
  if (hours < 24) return hours + '小时前'
  if (days < 30) return days + '天前'
  return d.getMonth() + 1 + '月' + d.getDate() + '日'
}

// ===== 生命周期 =====
onMounted(async () => {
  await loadVideo()
  // #ifdef H5
  videoContext = uni.createVideoContext('video-player')
  // #endif
  // #ifdef MP-WEIXIN
  videoContext = uni.createVideoContext('video-player')
  // #endif
})

onUnmounted(() => {
  if (videoContext) {
    videoContext.pause()
  }
  if (controlsTimer) clearTimeout(controlsTimer)
})

// ===== 数据加载 =====
async function loadVideo() {
  loading.value = true
  try {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1] as any
    const videoId = currentPage?.$page?.options?.id || ''

    const res = await api.get(`/videos/${videoId}`)
    if (res && typeof res === 'object' && 'title' in res) {
      const data = res as unknown as VideoDetailData
      video.value = data
      isFollowed.value = data.isFollowed
      isLiked.value = data.isLiked
      isCollected.value = data.isCollected
      likes.value = data.likes
      collects.value = data.collects
      viewCount.value = data.viewCount
      duration.value = data.duration
    } else {
      throw new Error('video data missing')
    }
  } catch {
    // Mock fallback
    await new Promise(r => setTimeout(r, 300))
    video.value = {
      id: '1',
      title: '八字入门：如何看日元强弱',
      description: '八字命理中，日元的强弱是分析命局的基础...',
      videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
      coverUrl: '/images/videos/cover-1.jpg',
      duration: 185,
      authorId: '1',
      authorName: '易学大师张三',
      authorFollowers: 128000,
      authorVerified: true,
      tags: ['八字', '命理', '入门教程'],
      viewCount: 15800,
      likes: 3256,
      comments: 428,
      collects: 892,
      shares: 156,
      isLiked: false,
      isCollected: false,
      isFollowed: false,
      product: {
        id: 'p1',
        name: '八字命理全套课程',
        image: '',
        price: 299,
      },
      createdAt: '2024-01-15T10:30:00Z',
    }
    isFollowed.value = false
    isLiked.value = false
    isCollected.value = false
    likes.value = 3256
    collects.value = 892
    viewCount.value = 15800
    duration.value = 185
  } finally {
    loading.value = false
    await nextTick()
    showControlsTimer()
  }
}

// 加载评论
async function loadComments() {
  if (!video.value) return
  try {
    const res = await api.get(`/videos/${video.value.id}/comments`)
    if (Array.isArray(res)) {
      commentList.value = res as unknown as VideoComment[]
      return
    }
  } catch {}
  // Mock comments
  commentList.value = [
    {
      id: 'c1', userId: 'u1', userName: '易学爱好者',
      content: '讲得太好了！终于理解日元强弱的判断方法了，得令、得地、得生、得助四个方面讲得很清楚。',
      likes: 128, isLiked: false, isAuthor: false,
      replies: [
        {
          id: 'r1', userId: 'u5', userName: '命理初学者',
          content: '同感，这个视频让我茅塞顿开！',
          likes: 15, isLiked: false, isAuthor: false, createdAt: '2024-01-15T13:30:00Z',
        },
      ],
      replyCount: 3, createdAt: '2024-01-15T12:00:00Z',
    },
    {
      id: 'c2', userId: 'u2', userName: '命理初学',
      content: '请问老师，得令和得地有什么区别？是不是一个看月令一个看地支？',
      likes: 56, isLiked: false, isAuthor: false,
      replies: [
        {
          id: 'r2', userId: '1', userName: '易学大师张三',
          content: '得令是指日元生于当令之月，比如甲木生于寅卯月；得地是指日元在地支有根，比如甲木地支见寅卯亥子等。两者都是判断旺衰的重要依据。',
          likes: 89, isLiked: false, isAuthor: true, createdAt: '2024-01-15T13:00:00Z',
        },
        {
          id: 'r3', userId: 'u2', userName: '命理初学',
          content: '明白了，感谢老师解答！',
          likes: 8, isLiked: false, isAuthor: false, createdAt: '2024-01-15T14:00:00Z',
        },
      ],
      replyCount: 2, createdAt: '2024-01-15T12:30:00Z',
    },
    {
      id: 'c3', userId: 'u3', userName: '风水玄学',
      content: '已收藏，反复学习中。老师讲得很系统，适合初学者入门。',
      likes: 23, isLiked: false, isAuthor: false,
      replies: [],
      replyCount: 0, createdAt: '2024-01-15T14:00:00Z',
    },
    {
      id: 'c4', userId: 'u4', userName: '传统文化爱好者',
      content: '希望老师能出一期关于十神分析的视频，对十神一直不太理解。',
      likes: 67, isLiked: false, isAuthor: false,
      replies: [],
      replyCount: 5, createdAt: '2024-01-15T15:30:00Z',
    },
  ]
}

// ===== 视频事件处理 =====
function onVideoPlay() {
  isPlaying.value = true
  hasStarted.value = true
}

function onVideoPause() {
  isPlaying.value = false
}

function onVideoEnded() {
  isPlaying.value = false
}

function onVideoTimeUpdate(e: any) {
  currentTime.value = e.detail.currentTime
  duration.value = e.detail.duration
}

function onVideoError() {
  uni.showToast({ title: '视频加载失败', icon: 'none' })
}

// ===== 播放器控制 =====
function togglePlay() {
  if (!videoContext) {
    videoContext = uni.createVideoContext('video-player')
  }
  if (isPlaying.value) {
    videoContext.pause()
  } else {
    videoContext.play()
  }
  showControls.value = true
  showControlsTimer()
}

function seekRelative(offset: number) {
  if (!videoContext) {
    videoContext = uni.createVideoContext('video-player')
  }
  const target = Math.max(0, Math.min(currentTime.value + offset, duration.value))
  videoContext.seek(target)
  showControls.value = true
  showControlsTimer()
}

function handleProgressBarClick(e: any) {
  if (!videoContext) {
    videoContext = uni.createVideoContext('video-player')
  }
  const rect = e.currentTarget.getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  const target = Math.floor(percent * duration.value)
  videoContext.seek(target)
  showControls.value = true
  showControlsTimer()
}

function handlePlayerClick() {
  showControls.value = true
  showControlsTimer()
}

function requestFullscreen() {
  uni.showToast({ title: '全屏播放', icon: 'none' })
}

// ===== 控制栏自动隐藏 =====
function showControlsTimer() {
  if (controlsTimer) clearTimeout(controlsTimer)
  if (isPlaying.value) {
    controlsTimer = setTimeout(() => {
      showControls.value = false
    }, 3000)
  }
}

// ===== 交互操作 =====
function handleFollow() {
  isFollowed.value = !isFollowed.value
  uni.showToast({ title: isFollowed.value ? '已关注' : '已取消关注', icon: 'success' })
}

function handleLike() {
  isLiked.value = !isLiked.value
  likes.value = isLiked.value ? likes.value + 1 : likes.value - 1
}

function handleCollect() {
  isCollected.value = !isCollected.value
  collects.value = isCollected.value ? collects.value + 1 : collects.value - 1
}

function handleCommentLike(commentId: string) {
  const c = commentList.value.find(c => c.id === commentId)
  if (c) {
    c.isLiked = !c.isLiked
    c.likes = c.isLiked ? c.likes + 1 : c.likes - 1
  }
}

function handleSubmitComment() {
  if (!commentText.value.trim()) return
  commentList.value.unshift({
    id: 'c' + Date.now(),
    userId: 'me',
    userName: '我',
    content: commentText.value,
    likes: 0,
    isLiked: false,
    isAuthor: false,
    replies: [],
    replyCount: 0,
    createdAt: new Date().toISOString(),
  })
  commentText.value = ''
  uni.showToast({ title: '评论成功', icon: 'success' })
}

function handleShare() {
  uni.showActionSheet({
    itemList: ['分享到微信', '分享到朋友圈', '复制链接'],
    success: (res) => {
      if (res.tapIndex === 2) {
        uni.setClipboardData({
          data: `我正在看「${video.value?.title}」，一起来学习吧！`,
          success: () => uni.showToast({ title: '链接已复制', icon: 'success' }),
        })
      } else {
        uni.showToast({ title: '分享成功', icon: 'success' })
      }
    },
  })
}

function scrollToComment() {
  if (commentSection.value) {
    uni.pageScrollTo({
      selector: '.mt-6.bg-white',
      duration: 300,
    })
  }
}

// ===== 导航 =====
function goBack() {
  uni.navigateBack()
}

function goTo(url: string) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
/* 加载动画 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* 进度条过渡 */
.transition-all {
  transition: all 0.3s ease;
}

/* 行数限制 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 分割线 */
.divide-y > view + view {
  border-top: 1px solid #E8E0D5;
}

/* 触摸反馈 */
.active\:opacity-70:active {
  opacity: 0.7;
}

.active\:opacity-80:active {
  opacity: 0.8;
}

.active\:scale-\[0\.98\]:active {
  transform: scale(0.98);
}
</style>
