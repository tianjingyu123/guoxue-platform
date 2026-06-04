<template>
  <view class="page">
    <!-- 加载态 -->
    <view v-if="loading" class="loading-wrap">
      <view class="loading-spinner" />
    </view>

    <!-- 错误态 -->
    <view v-else-if="loadError" class="error-wrap">
      <view class="error-inner">
        <text class="error-icon">⚠️</text>
        <text class="error-text">{{ loadError }}</text>
        <view class="error-retry" @click="loadReplay">重新加载</view>
      </view>
    </view>

    <view v-else-if="!replay" class="empty-state">
      <text class="empty-text">回放不存在</text>
    </view>

    <template v-else>
      <!-- 播放器区域 -->
      <view class="player-container" @click="handleVideoClick">
        <!-- 返回按钮 -->
        <view :class="['player-top-left', showControls ? 'fade-in' : 'fade-out']">
          <view class="player-btn" @click.stop="goBack">
            <text class="btn-icon">←</text>
          </view>
        </view>

        <!-- 原生视频 -->
        <video
          id="replay-video"
          :src="playUrl"
          :controls="false"
          :autoplay="false"
          :muted="isMuted"
          :playback-rate="speed"
          @timeupdate="onTimeUpdate"
          @play="onVideoPlay"
          @pause="onVideoPause"
          @ended="onVideoEnded"
          @error="onVideoError"
          @click="handleVideoClick"
          class="native-video"
          object-fit="contain"
        />

        <!-- 播放按钮覆盖层 -->
        <view v-if="!isPlaying && playUrl && !videoEnded" class="play-button-wrap" @click.stop="handlePlayPause">
          <view class="play-button">
            <text class="play-icon">▶</text>
          </view>
        </view>

        <!-- 重播按钮 -->
        <view v-if="videoEnded" class="replay-overlay" @click.stop="handleReplay">
          <view class="replay-btn">
            <text class="replay-icon">🔄</text>
            <text class="replay-text">重新播放</text>
          </view>
        </view>

        <!-- 回放+倍速标签 -->
        <view :class="['player-top-right', showControls ? 'fade-in' : 'fade-out']">
          <view class="player-badge">
            <text>⏱️ 回放</text>
          </view>
          <view v-if="speed !== 1" class="player-badge speed-badge">{{ speed }}x</view>
        </view>

        <!-- 当前章节 -->
        <view v-if="currentChapter" :class="['chapter-badge', showControls ? 'fade-in' : 'fade-out']">
          <text>{{ currentChapter.title }}</text>
        </view>

        <!-- 控制栏 -->
        <view :class="['controls-bar', showControls ? 'fade-in' : 'fade-out']">
          <!-- 进度条 -->
          <view class="progress-bar" @click.stop="handleProgressClick">
            <!-- 章节标记点 -->
            <view
              v-for="ch in replay.chapters"
              :key="ch.id"
              class="chapter-marker"
              :style="{ left: `${(ch.startTime / duration) * 100}%` }"
              @click.stop="handleChapterClick(ch)"
            />
            <!-- 进度 -->
            <view class="progress-fill" :style="{ width: `${progress}%` }">
              <view class="progress-thumb" />
            </view>
          </view>

          <!-- 控制按钮 -->
          <view class="controls-row">
            <view class="controls-left">
              <view class="ctrl-btn" @click.stop="handlePlayPause">
                <text v-if="isPlaying" class="ctrl-icon">⏸️</text>
                <text v-else class="ctrl-icon">▶️</text>
              </view>
              <view class="ctrl-btn" @click.stop="handleSeek(currentTime - 10)">
                <text class="ctrl-icon">⏪</text>
              </view>
              <view class="ctrl-btn" @click.stop="handleSeek(currentTime + 10)">
                <text class="ctrl-icon">⏩</text>
              </view>
              <text class="time-display">{{ formatSeconds(currentTime) }} / {{ formatSeconds(duration) }}</text>
            </view>
            <view class="controls-right">
              <!-- 章节按钮 -->
              <view class="ctrl-btn-sm" @click.stop="toggleChapters">
                <text class="ctrl-icon-sm">📋</text>
                <text class="ctrl-label">章节</text>
              </view>
              <!-- 倍速 -->
              <view class="speed-menu-wrap">
                <view class="ctrl-btn-sm" @click.stop="showSpeedMenu = !showSpeedMenu">
                  <text class="ctrl-label">{{ getSpeedLabel(speed) }}</text>
                  <text class="arrow-down">▼</text>
                </view>
                <view v-if="showSpeedMenu" class="speed-menu">
                  <text
                    v-for="s in playbackSpeeds"
                    :key="s"
                    :class="['speed-opt', speed === s ? 'speed-opt-active' : '']"
                    @click.stop="handleSpeedChange(s)"
                  >{{ s }}x</text>
                </view>
              </view>
              <!-- 课件 -->
              <view v-if="replay.slides && replay.slides.length > 0" class="ctrl-btn-sm" @click.stop="showSlides = !showSlides">
                <text class="ctrl-icon-sm">🖼️</text>
              </view>
              <view class="ctrl-btn" @click.stop="toggleMuted">
                <text v-if="isMuted" class="ctrl-icon">🔇</text>
                <text v-else class="ctrl-icon">🔊</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 章节侧边栏 -->
        <view v-if="showChapters" class="chapters-sidebar" @click.stop>
          <view class="sidebar-header">
            <text class="sidebar-title">章节列表</text>
            <text class="sidebar-close" @click="showChapters = false">›</text>
          </view>
          <view class="chapter-list">
            <view
              v-for="ch in replay.chapters"
              :key="ch.id"
              :class="['chapter-item', currentChapter?.id === ch.id ? 'chapter-active' : '']"
              @click="handleChapterClick(ch)"
            >
              <text class="chapter-time">{{ ch.timeDisplay }}</text>
              <view class="chapter-text">
                <text :class="['chapter-title', currentChapter?.id === ch.id ? 'ch-active-text' : '']">{{ ch.title }}</text>
                <text v-if="ch.description" class="chapter-desc">{{ ch.description }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 课件预览 -->
        <view v-if="showSlides && currentSlide" class="slides-sidebar" @click.stop>
          <view class="sidebar-header">
            <text class="sidebar-title">课件同步</text>
            <text class="sidebar-close" @click="showSlides = false">›</text>
          </view>
          <view class="slides-body">
            <image :src="currentSlide.imageUrl" mode="widthFix" class="slide-current-img" />
            <text v-if="currentSlide.title" class="slide-title">{{ currentSlide.title }}</text>
            <text class="slide-time">{{ currentSlide.timeDisplay }}</text>
          </view>
          <view class="slide-thumbs">
            <image
              v-for="sl in replay.slides"
              :key="sl.id"
              :src="sl.imageUrl"
              mode="aspectFill"
              :class="['slide-thumb', currentSlide.id === sl.id ? 'slide-thumb-active' : '']"
              @click="handleSeek(sl.time)"
            />
          </view>
        </view>
      </view>

      <!-- 回放信息 -->
      <view class="info-section">
        <text class="info-title">{{ replay.title }}</text>
        <view class="info-host-row">
          <view class="info-host-left" @click="goExpert(replay.host.id)">
            <image :src="replay.host.avatar" mode="aspectFill" class="info-host-avatar" />
            <view class="info-host-text">
              <view class="info-host-name-row">
                <text class="info-host-name">{{ replay.host.name }}</text>
                <text v-if="replay.host.isVerified" class="verified-badge">V</text>
              </view>
              <text class="info-host-fans">{{ replay.host.followers.toLocaleString() }} 粉丝</text>
            </view>
          </view>
          <text class="follow-btn">+ 关注</text>
        </view>
        <view class="info-stats">
          <text class="info-stat">⏱️ {{ replay.startTime }}</text>
          <text class="info-stat">👁️ {{ replay.viewerCount.toLocaleString() }} 观看</text>
          <text class="info-stat">❤️ {{ replay.likeCount.toLocaleString() }} 点赞</text>
        </view>
      </view>

      <!-- 互动回顾Tab -->
      <view class="tabs-bar">
        <view
          v-for="tab in tabList"
          :key="tab.key"
          :class="['tab-item', activeTab === tab.key ? 'tab-active' : '']"
          @click="activeTab = tab.key"
        >
          <text>{{ tab.icon }} {{ tab.label }}({{ tab.count }})</text>
          <view v-if="activeTab === tab.key" class="tab-indicator" />
        </view>
      </view>

      <!-- Tab内容 -->
      <view class="tab-content">
        <!-- 章节Tab -->
        <view v-if="activeTab === 'chapters'" class="chapter-tab-list">
          <view
            v-for="ch in replay.chapters"
            :key="ch.id"
            :class="['chapter-tab-item', currentChapter?.id === ch.id ? 'ct-item-active' : '']"
            @click="handleChapterClick(ch)"
          >
            <text class="ct-time">{{ ch.timeDisplay }}</text>
            <view class="ct-text">
              <text :class="['ct-title', currentChapter?.id === ch.id ? 'ct-title-active' : '']">{{ ch.title }}</text>
              <text v-if="ch.description" class="ct-desc">{{ ch.description }}</text>
            </view>
            <text v-if="currentChapter?.id === ch.id" class="ct-current-badge">当前</text>
          </view>
        </view>

        <!-- 讨论Tab -->
        <view v-if="activeTab === 'discussion'" class="discuss-list">
          <view
            v-for="item in replay.discussions"
            :key="item.id"
            class="discuss-item"
            @click="handleSeek(item.time)"
          >
            <text class="discuss-time">{{ item.timeDisplay }}</text>
            <image :src="item.userAvatar" mode="aspectFill" class="discuss-avatar" />
            <view class="discuss-body">
              <view class="discuss-name-row">
                <text :class="['discuss-name', item.isHost ? 'discuss-host' : '']">{{ item.userName }}</text>
                <text v-if="item.isHost" class="host-tag">主播</text>
              </view>
              <text class="discuss-content">{{ item.content }}</text>
            </view>
          </view>
        </view>

        <!-- 问答Tab -->
        <view v-if="activeTab === 'qa'" class="qa-list">
          <view v-for="item in replay.qaList" :key="item.id" class="qa-item" @click="handleSeek(item.time)">
            <view class="qa-question">
              <text class="qa-time">{{ item.timeDisplay }}</text>
              <text class="qa-icon">❓</text>
              <view class="qa-texts">
                <text class="qa-asker">{{ item.questionerName }} 提问</text>
                <text class="qa-question-text">{{ item.question }}</text>
              </view>
            </view>
            <view class="qa-answer">
              <image :src="item.answererAvatar || ''" mode="aspectFill" class="qa-answer-avatar" />
              <view class="qa-answer-body">
                <text class="qa-answerer">{{ item.answererName }} 回答</text>
                <text class="qa-answer-text">{{ item.answer }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 商品Tab -->
        <view v-if="activeTab === 'products' && replay.products" class="product-list">
          <view v-for="item in replay.products" :key="item.id" class="product-item">
            <view class="product-img-wrap">
              <image v-if="item.image" :src="item.image" mode="aspectFill" class="product-img" />
              <text v-else class="product-placeholder">🛍️</text>
            </view>
            <view class="product-info">
              <text class="product-name">{{ item.name }}</text>
              <text class="product-jump" @click="handleSeek(item.mentionTime)">跳转到 {{ item.mentionTimeDisplay }}</text>
              <view class="product-bottom">
                <text class="product-price">{{ item.price }}</text>
                <text class="product-original">{{ item.originalPrice }}</text>
                <text class="product-sales">{{ item.sales }}人购买</text>
              </view>
            </view>
            <text class="product-buy-btn" @click="goProduct(item.id)">购买</text>
          </view>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view class="bottom-action-bar">
        <view class="action-btn" @click="isCollected = !isCollected">
          <text :class="['action-icon', isCollected ? 'collected' : '']">❤️</text>
          <text class="action-label">收藏</text>
        </view>
        <view class="action-btn">
          <text class="action-icon">↗️</text>
          <text class="action-label">分享</text>
        </view>
        <view v-if="replay.isPaid && !replay.isPurchased" class="action-primary" @click="buyReplay">
          购买回放 {{ replay.price }}
        </view>
        <view v-else-if="replay.circle" class="action-primary" @click="goCircle(replay.circle.id)">
          加入「{{ replay.circle.name }}」
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { liveApi, liveRoomApi } from '../../api'

interface ReplayChapter { id: number; title: string; startTime: number; timeDisplay: string; description?: string }
interface ReplaySlide { id: number; imageUrl: string; title?: string; time: number; timeDisplay: string }
interface ReplayDiscussion { id: number; time: number; timeDisplay: string; userName: string; userAvatar: string; content: string; isHost: boolean }
interface ReplayQA { id: number; time: number; timeDisplay: string; questionerName: string; question: string; answererName: string; answererAvatar?: string; answer: string }
interface ReplayProduct { id: number; name: string; image?: string; price: string; originalPrice: string; sales: number; mentionTime: number; mentionTimeDisplay: string }
interface ReplayDetail {
  id: number; title: string; startTime: string; viewerCount: number; likeCount: number
  duration: string; isPaid: boolean; isPurchased?: boolean; price?: string
  host: { id: number; name: string; avatar: string; followers: number; isVerified: boolean }
  circle?: { id: number; name: string }
  chapters: ReplayChapter[]; slides: ReplaySlide[]
  discussions: ReplayDiscussion[]; qaList: ReplayQA[]; products?: ReplayProduct[]
}

const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2]

const replay = ref<any>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const playUrl = ref('')
const isPlaying = ref(false)
const isMuted = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const speed = ref<number>(1)
const showSpeedMenu = ref(false)
const showChapters = ref(false)
const showSlides = ref(false)
const activeTab = ref<string>('chapters')
const isCollected = ref(false)
const showControls = ref(true)
const videoEnded = ref(false)
const videoLoading = ref(false)
let controlsTimer: any = null

const roomId = ref('')

const tabList = computed(() => {
  if (!replay.value) return []
  const list = [
    { key: 'chapters', icon: '📋', label: '章节', count: replay.value.chapters.length },
    { key: 'discussion', icon: '💬', label: '讨论', count: replay.value.discussions.length },
    { key: 'qa', icon: '❓', label: '问答', count: replay.value.qaList.length },
  ]
  if (replay.value.products?.length) {
    list.push({ key: 'products', icon: '🛍️', label: '商品', count: replay.value.products.length })
  }
  return list
})

const progress = computed(() => duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0)

const currentChapter = computed(() => {
  if (!replay.value?.chapters) return null
  const chs = replay.value.chapters
  for (let i = chs.length - 1; i >= 0; i--) {
    if (currentTime.value >= chs[i].startTime) return chs[i]
  }
  return chs[0] || null
})

const currentSlide = computed(() => {
  if (!replay.value?.slides) return null
  const sls = replay.value.slides
  for (let i = sls.length - 1; i >= 0; i--) {
    if (currentTime.value >= sls[i].time) return sls[i]
  }
  return sls[0] || null
})

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  roomId.value = opts.id || ''
  if (roomId.value) loadReplay()
  else { loading.value = false; loadError.value = '缺少回放ID' }
})

onUnmounted(() => {
  if (controlsTimer) clearTimeout(controlsTimer)
})

watch(showControls, (val) => {
  if (val && isPlaying.value) {
    if (controlsTimer) clearTimeout(controlsTimer)
    controlsTimer = setTimeout(() => { showControls.value = false }, 3000)
  }
})

async function loadReplay() {
  loading.value = true
  loadError.value = null
  try {
    const raw = await liveApi.roomDetail(roomId.value)
    replay.value = mapReplayDetail(raw)

    // 获取播放地址
    try {
      const urlData = await liveRoomApi.getPlayUrl(roomId.value)
      playUrl.value = urlData?.hls || urlData?.flv || urlData?.url || ''
    } catch {
      // 播放地址获取失败不影响详情展示
      console.warn('获取播放地址失败')
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
    console.error(e)
  } finally {
    loading.value = false
  }
}

function mapReplayDetail(raw: any) {
  return {
    id: raw.id,
    title: raw.title || '',
    startTime: raw.startAt || raw.startTime || '',
    viewerCount: raw.viewCount || raw.views || 0,
    likeCount: raw.likeCount || raw.likes || 0,
    duration: raw.duration || 0,
    isPaid: raw.isPaid || false,
    isPurchased: raw.isPurchased || false,
    price: raw.price || '',
    host: {
      id: raw.hostId || raw.userId || raw.host?.id || 0,
      name: raw.hostName || raw.host?.name || raw.user?.nickname || '',
      avatar: raw.hostAvatar || raw.host?.avatar || raw.user?.avatar || '',
      followers: raw.hostFans || raw.host?.followers || 0,
      isVerified: raw.host?.isVerified || false,
    },
    circle: raw.circle || null,
    chapters: raw.chapters || [],
    slides: raw.slides || [],
    discussions: raw.discussions || [],
    qaList: raw.qaList || [],
    products: raw.products || [],
  }
}

function getVideoContext() {
  return uni.createVideoContext('replay-video')
}

function handlePlayPause() {
  const ctx = getVideoContext()
  if (isPlaying.value) {
    ctx.pause()
  } else {
    ctx.play()
  }
  showControls.value = true
}

function handleSeek(time: number) {
  const ctx = getVideoContext()
  ctx.seek(time)
  showControls.value = true
}

function handleProgressClick(e: any) {
  // UniApp 进度条点击事件处理
  const rect = e.currentTarget.getBoundingClientRect()
  const touch = e.touches?.[0] || e.changedTouches?.[0] || e.detail
  const x = touch?.x || touch?.clientX || e.detail?.x || e.clientX || 0
  const percent = Math.max(0, Math.min(1, (x - rect.left) / rect.width))
  handleSeek(Math.floor(percent * (duration.value || 1)))
}

function handleSpeedChange(s: number) {
  speed.value = s
  showSpeedMenu.value = false
}

function handleChapterClick(ch: ReplayChapter) {
  handleSeek(ch.startTime)
  showChapters.value = false
}

function toggleChapters() { showChapters.value = !showChapters.value }
function toggleMuted() {
  isMuted.value = !isMuted.value
  const ctx = getVideoContext()
  if (isMuted.value) ctx?.mute()
  else ctx?.unmute()
}

function handleVideoClick() {
  showControls.value = true
}

// ─── Video 事件处理器 ───

function onTimeUpdate(e: any) {
  currentTime.value = e.detail.currentTime
  if (e.detail.duration && e.detail.duration !== duration.value) {
    duration.value = e.detail.duration
  }
}

function onVideoPlay() {
  isPlaying.value = true
  videoEnded.value = false
  showControls.value = true
}

function onVideoPause() {
  isPlaying.value = false
  showControls.value = true
}

function onVideoEnded() {
  isPlaying.value = false
  videoEnded.value = true
  showControls.value = true
}

function onVideoError(e: any) {
  videoLoading.value = false
  uni.showToast({ title: '视频加载失败', icon: 'none' })
  console.error('Video error:', e.detail)
}

function handleReplay() {
  videoEnded.value = false
  const ctx = getVideoContext()
  ctx.seek(0)
  ctx.play()
}

function getSpeedLabel(s: number): string {
  return s === 1 ? '1.0x' : s + 'x'
}

function formatSeconds(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function goBack() { uni.navigateBack() }
function goExpert(id: number) { uni.navigateTo({ url: `/pages/user/profile?id=${id}` }) }
function goProduct(id: number) { uni.navigateTo({ url: `/pages/mall/product?id=${id}` }) }
function goCircle(id: number) { uni.navigateTo({ url: `/pages/circle/detail?id=${id}` }) }
function buyReplay() { uni.showToast({ title: '购买功能开发中', icon: 'none' }) }
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; padding-bottom: 120rpx; }

/* 加载/空/错误 */
.loading-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.loading-spinner { width: 48rpx; height: 48rpx; border: 4rpx solid #E8E3DB; border-top-color: #C41E3A; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.empty-state { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.empty-text { font-size: 28rpx; color: #999; }
.error-wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 48rpx; }
.error-inner { text-align: center; }
.error-icon { font-size: 72rpx; display: block; margin-bottom: 16rpx; }
.error-text { font-size: 26rpx; color: #999; margin-bottom: 24rpx; display: block; }
.error-retry { display: inline-block; padding: 16rpx 48rpx; background: #C41E3A; color: #fff; border-radius: 40rpx; font-size: 26rpx; }

/* 播放器 */
.player-container { position: relative; background: #000; aspect-ratio: 16/9; overflow: hidden; }
.native-video { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; }
.replay-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 5; background: rgba(0,0,0,0.4); }
.replay-btn { width: 160rpx; height: 160rpx; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; }
.replay-icon { font-size: 48rpx; color: #fff; }
.replay-text { font-size: 22rpx; color: #fff; }
.fade-in { opacity: 1; transition: opacity 0.3s; }
.fade-out { opacity: 0; transition: opacity 0.3s; pointer-events: none; }

.player-top-left { position: absolute; top: 24rpx; left: 24rpx; z-index: 10; }
.player-btn { width: 64rpx; height: 64rpx; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.btn-icon { font-size: 32rpx; color: #fff; }

.play-button-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 5; }
.play-button { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.play-icon { font-size: 48rpx; color: #fff; margin-left: 8rpx; }

.player-top-right { position: absolute; top: 24rpx; right: 24rpx; display: flex; gap: 8rpx; z-index: 10; }
.player-badge { padding: 8rpx 16rpx; background: rgba(0,0,0,0.6); color: #fff; border-radius: 8rpx; font-size: 20rpx; display: flex; align-items: center; gap: 4rpx; }
.speed-badge { background: rgba(196,30,58,0.8); }

.chapter-badge { position: absolute; top: 24rpx; left: 50%; transform: translateX(-50%); padding: 8rpx 24rpx; background: rgba(0,0,0,0.6); color: #fff; border-radius: 40rpx; font-size: 22rpx; z-index: 10; }

/* 控制栏 */
.controls-bar { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(180deg, transparent, rgba(0,0,0,0.8)); padding: 24rpx; z-index: 10; }
.progress-bar { height: 12rpx; background: rgba(255,255,255,0.3); border-radius: 8rpx; margin-bottom: 20rpx; position: relative; cursor: pointer; }
.chapter-marker { position: absolute; top: 50%; transform: translateY(-50%); width: 8rpx; height: 16rpx; background: #C9A96E; border-radius: 4rpx; z-index: 5; }
.progress-fill { height: 100%; background: #C41E3A; border-radius: 8rpx; position: relative; }
.progress-thumb { position: absolute; right: -6rpx; top: 50%; transform: translateY(-50%); width: 20rpx; height: 20rpx; background: #fff; border-radius: 50%; }

.controls-row { display: flex; align-items: center; justify-content: space-between; }
.controls-left, .controls-right { display: flex; align-items: center; gap: 20rpx; }
.ctrl-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.ctrl-icon { font-size: 36rpx; color: #fff; }
.time-display { font-size: 22rpx; color: rgba(255,255,255,0.8); }
.ctrl-btn-sm { display: flex; align-items: center; gap: 4rpx; padding: 8rpx 12rpx; background: rgba(255,255,255,0.2); border-radius: 8rpx; }
.ctrl-icon-sm { font-size: 24rpx; color: #fff; }
.ctrl-label { font-size: 20rpx; color: #fff; }
.arrow-down { font-size: 16rpx; color: #fff; }

/* 倍速菜单 */
.speed-menu-wrap { position: relative; }
.speed-menu { position: absolute; bottom: 100%; right: 0; margin-bottom: 8rpx; background: rgba(0,0,0,0.9); border-radius: 12rpx; overflow: hidden; }
.speed-opt { display: block; padding: 16rpx 32rpx; font-size: 22rpx; color: #fff; text-align: center; }
.speed-opt-active { color: #C41E3A; background: rgba(255,255,255,0.1); }

/* 章节侧边栏 */
.chapters-sidebar { position: absolute; top: 0; right: 0; bottom: 0; width: 480rpx; background: rgba(0,0,0,0.95); z-index: 15; overflow-y: auto; }
.sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; border-bottom: 1rpx solid rgba(255,255,255,0.1); }
.sidebar-title { font-size: 28rpx; font-weight: 500; color: #fff; }
.sidebar-close { font-size: 32rpx; color: rgba(255,255,255,0.6); }
.chapter-list { }
.chapter-item { display: flex; align-items: flex-start; gap: 16rpx; padding: 24rpx; border-bottom: 1rpx solid rgba(255,255,255,0.05); }
.chapter-active { background: rgba(255,255,255,0.1); }
.chapter-time { flex-shrink: 0; font-size: 22rpx; color: #C9A96E; font-family: monospace; }
.chapter-text { flex: 1; min-width: 0; }
.chapter-title { display: block; font-size: 24rpx; color: #fff; }
.ch-active-text { color: #C41E3A; }
.chapter-desc { display: block; font-size: 20rpx; color: rgba(255,255,255,0.5); margin-top: 4rpx; }

/* 课件侧边栏 */
.slides-sidebar { position: absolute; top: 0; left: 0; bottom: 0; width: 420rpx; background: rgba(0,0,0,0.95); z-index: 15; overflow-y: auto; }
.slides-body { padding: 24rpx; }
.slide-current-img { width: 100%; border-radius: 12rpx; }
.slide-title { display: block; font-size: 24rpx; color: #fff; margin-top: 12rpx; }
.slide-time { display: block; font-size: 20rpx; color: rgba(255,255,255,0.5); margin-top: 4rpx; }
.slide-thumbs { padding: 0 24rpx 24rpx; display: flex; flex-direction: column; gap: 12rpx; }
.slide-thumb { width: 100%; aspect-ratio: 16/9; border-radius: 12rpx; border: 2rpx solid transparent; }
.slide-thumb-active { border-color: #C41E3A; }

/* 回放信息 */
.info-section { padding: 24rpx; background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.info-title { display: block; font-size: 32rpx; font-weight: bold; color: #2C2C2C; margin-bottom: 20rpx; }
.info-host-row { display: flex; align-items: center; margin-bottom: 16rpx; }
.info-host-left { display: flex; align-items: center; gap: 16rpx; flex: 1; }
.info-host-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: #E8E3DB; flex-shrink: 0; }
.info-host-name-row { display: flex; align-items: center; gap: 8rpx; }
.info-host-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.verified-badge { font-size: 16rpx; background: rgba(201,169,110,0.2); color: #C9A96E; padding: 2rpx 8rpx; border-radius: 4rpx; }
.info-host-fans { display: block; font-size: 20rpx; color: #999; margin-top: 4rpx; }
.follow-btn { padding: 12rpx 32rpx; border: 1rpx solid #C41E3A; color: #C41E3A; border-radius: 40rpx; font-size: 22rpx; }
.info-stats { display: flex; gap: 24rpx; }
.info-stat { font-size: 22rpx; color: #999; display: flex; align-items: center; gap: 4rpx; }

/* Tabs */
.tabs-bar { display: flex; background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.tab-item { flex: 1; text-align: center; padding: 24rpx 0; font-size: 24rpx; color: #999; position: relative; }
.tab-active { color: #C41E3A; }
.tab-indicator { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 64rpx; height: 4rpx; background: #C41E3A; border-radius: 4rpx; }

/* Tab内容 */
.tab-content { padding-bottom: 24rpx; }

/* 章节Tab列表 */
.chapter-tab-list { }
.chapter-tab-item { display: flex; align-items: flex-start; gap: 16rpx; padding: 24rpx; border-bottom: 1rpx solid #F5F0E8; }
.ct-item-active { background: rgba(196,30,58,0.05); }
.ct-time { flex-shrink: 0; padding: 4rpx 12rpx; background: rgba(196,30,58,0.1); color: #C41E3A; border-radius: 6rpx; font-size: 20rpx; font-family: monospace; }
.ct-text { flex: 1; min-width: 0; }
.ct-title { display: block; font-size: 24rpx; font-weight: 500; color: #2C2C2C; }
.ct-title-active { color: #C41E3A; }
.ct-desc { display: block; font-size: 20rpx; color: #999; margin-top: 4rpx; }
.ct-current-badge { flex-shrink: 0; padding: 4rpx 12rpx; background: rgba(196,30,58,0.1); color: #C41E3A; border-radius: 6rpx; font-size: 18rpx; }

/* 讨论列表 */
.discuss-list { }
.discuss-item { display: flex; gap: 16rpx; padding: 24rpx; border-bottom: 1rpx solid #F5F0E8; }
.discuss-time { flex-shrink: 0; padding: 4rpx 12rpx; background: rgba(196,30,58,0.1); color: #C41E3A; border-radius: 6rpx; font-size: 20rpx; font-family: monospace; }
.discuss-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; background: #E8E3DB; flex-shrink: 0; }
.discuss-body { flex: 1; min-width: 0; }
.discuss-name-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 4rpx; }
.discuss-name { font-size: 24rpx; font-weight: 500; color: #2C2C2C; }
.discuss-host { color: #C9A96E; }
.host-tag { font-size: 16rpx; background: rgba(201,169,110,0.15); color: #C9A96E; padding: 2rpx 8rpx; border-radius: 4rpx; }
.discuss-content { font-size: 24rpx; color: #666; line-height: 1.6; }

/* 问答列表 */
.qa-list { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }
.qa-item { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.qa-question { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.qa-time { flex-shrink: 0; padding: 4rpx 12rpx; background: rgba(196,30,58,0.1); color: #C41E3A; border-radius: 6rpx; font-size: 20rpx; font-family: monospace; }
.qa-icon { font-size: 28rpx; flex-shrink: 0; }
.qa-texts { flex: 1; min-width: 0; }
.qa-asker { display: block; font-size: 20rpx; color: #999; margin-bottom: 4rpx; }
.qa-question-text { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.qa-answer { display: flex; gap: 12rpx; padding: 16rpx; background: #FAF8F5; border-radius: 12rpx; }
.qa-answer-avatar { width: 32rpx; height: 32rpx; border-radius: 50%; background: #E8E3DB; flex-shrink: 0; }
.qa-answer-body { flex: 1; min-width: 0; }
.qa-answerer { display: block; font-size: 20rpx; color: #C9A96E; font-weight: 500; margin-bottom: 4rpx; }
.qa-answer-text { display: block; font-size: 24rpx; color: #666; line-height: 1.6; }

/* 商品列表 */
.product-list { padding: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.product-item { display: flex; gap: 16rpx; padding: 20rpx; background: #fff; border-radius: 16rpx; }
.product-img-wrap { width: 120rpx; height: 120rpx; border-radius: 12rpx; background: #FAF8F5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.product-img { width: 100%; height: 100%; }
.product-placeholder { font-size: 48rpx; color: #ccc; }
.product-info { flex: 1; min-width: 0; }
.product-name { display: block; font-size: 24rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.product-jump { display: block; font-size: 20rpx; color: #C41E3A; margin-top: 8rpx; }
.product-bottom { display: flex; align-items: center; gap: 8rpx; margin-top: 12rpx; }
.product-price { font-size: 28rpx; font-weight: bold; color: #C41E3A; }
.product-original { font-size: 20rpx; color: #999; text-decoration: line-through; }
.product-sales { font-size: 20rpx; color: #999; margin-left: auto; }
.product-buy-btn { align-self: flex-end; padding: 12rpx 24rpx; background: #C41E3A; color: #fff; border-radius: 32rpx; font-size: 22rpx; font-weight: 500; flex-shrink: 0; }

/* 底部操作栏 */
.bottom-action-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-top: 1rpx solid #E8E3DB; display: flex; align-items: center; gap: 16rpx; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); z-index: 30; }
.action-btn { display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.action-icon { font-size: 32rpx; }
.action-label { font-size: 18rpx; color: #999; }
.action-icon.collected { }
.action-primary { flex: 1; text-align: center; padding: 18rpx 0; background: #C41E3A; color: #fff; border-radius: 40rpx; font-size: 26rpx; font-weight: 500; }
</style>
