<template>
  <view class="page">
    <!-- 加载态 -->
    <view v-if="loading" class="loading-wrap">
      <view class="skeleton-cover" />
      <view class="skeleton-body">
        <view class="skeleton-line w-80" />
        <view class="skeleton-line w-full" />
        <view class="skeleton-line w-60" />
      </view>
    </view>

    <!-- 错误态 -->
    <view v-else-if="loadError" class="error-wrap">
      <view class="error-inner">
        <text class="error-icon">⚠️</text>
        <text class="error-text">{{ loadError }}</text>
        <view class="error-retry" @click="loadRoom">重新加载</view>
      </view>
    </view>

    <view v-else-if="!room" class="empty-state">
      <text class="empty-text">直播不存在</text>
    </view>

    <template v-else>
      <!-- 封面区域 -->
      <view class="cover-section">
        <image :src="room.cover" mode="aspectFill" class="cover-bg" />
        <view class="cover-gradient" />

        <!-- 顶部导航 -->
        <view class="cover-top">
          <view class="top-btn" @click="goBack">
            <text class="top-btn-icon">←</text>
          </view>
          <view class="top-btn" @click="handleShare">
            <text class="top-btn-icon">↗️</text>
          </view>
        </view>

        <!-- 预告标签 -->
        <view class="cover-label">
          <text class="label-icon">📅</text>
          <text class="label-text">直播预告</text>
        </view>

        <!-- 底部信息 -->
        <view class="cover-bottom">
          <text class="cover-title">{{ room.title }}</text>

          <!-- 讲师信息 -->
          <view class="host-row" @click="goProfile(room.host.id)">
            <image :src="room.host.avatar" mode="aspectFill" class="host-avatar" />
            <view class="host-info">
              <text class="host-name">{{ room.host.name }}</text>
              <text class="host-fans">{{ room.host.followers.toLocaleString() }} 粉丝</text>
            </view>
          </view>

          <!-- 倒计时 -->
          <view class="countdown-box">
            <view v-if="isStartingSoon" class="countdown-soon">
              <text class="soon-icon">▶</text>
              <text class="soon-text">即将开始</text>
            </view>
            <template v-else>
              <text class="countdown-label">距开播还有</text>
              <view class="countdown-display">
                <template v-if="countdown.days > 0">
                  <view class="countdown-block">
                    <text class="cd-num">{{ countdown.days }}</text>
                    <text class="cd-unit">天</text>
                  </view>
                  <text class="cd-sep">:</text>
                </template>
                <view class="countdown-block">
                  <text class="cd-num">{{ String(countdown.hours).padStart(2, '0') }}</text>
                  <text class="cd-unit">时</text>
                </view>
                <text class="cd-sep">:</text>
                <view class="countdown-block">
                  <text class="cd-num">{{ String(countdown.minutes).padStart(2, '0') }}</text>
                  <text class="cd-unit">分</text>
                </view>
                <text class="cd-sep">:</text>
                <view class="countdown-block">
                  <text class="cd-num">{{ String(countdown.seconds).padStart(2, '0') }}</text>
                  <text class="cd-unit">秒</text>
                </view>
              </view>
            </template>
          </view>
        </view>
      </view>

      <!-- 详情内容 -->
      <view class="detail-section">
        <!-- 信息卡片 -->
        <view class="info-card">
          <view class="info-grid">
            <view class="info-item">
              <view class="info-value-row">
                <text class="info-icon accent">👥</text>
                <text class="info-value">{{ bookedCount.toLocaleString() }}</text>
              </view>
              <text class="info-label">已预约</text>
            </view>
            <view class="info-item">
              <view class="info-value-row">
                <text class="info-icon gold">⏱️</text>
                <text class="info-value">{{ room.estimatedDuration || 60 }}</text>
              </view>
              <text class="info-label">预计时长(分钟)</text>
            </view>
            <view class="info-item">
              <text class="info-value">{{ formatDate(room.startTime) }}</text>
              <text class="info-label">{{ formatTime(room.startTime) }}</text>
            </view>
          </view>
        </view>

        <!-- 标签 -->
        <view v-if="room.tags && room.tags.length > 0" class="tags-row">
          <text v-for="(tag, i) in room.tags" :key="i" class="tag">{{ tag }}</text>
        </view>

        <!-- 直播简介 -->
        <view class="desc-card">
          <text class="section-title">直播简介</text>
          <view class="desc-content">
            <template v-for="(line, i) in descLines" :key="i">
              <text v-if="line.type === 'h3'" class="desc-h3">{{ line.text }}</text>
              <text v-else-if="line.type === 'bold'" class="desc-bold">{{ line.text }}</text>
              <text v-else-if="line.type === 'list'" class="desc-list-item">• {{ line.text }}</text>
              <text v-else-if="line.type === 'numbered'" class="desc-numbered">{{ line.text }}</text>
              <text v-else-if="line.text === ''" class="desc-break" />
              <text v-else class="desc-paragraph">{{ line.text }}</text>
            </template>
          </view>
        </view>

        <!-- 讲师介绍 -->
        <view class="teacher-card">
          <text class="section-title">讲师介绍</text>
          <view class="teacher-row" @click="goProfile(room.host.id)">
            <image :src="room.host.avatar" mode="aspectFill" class="teacher-avatar" />
            <view class="teacher-info">
              <text class="teacher-name">{{ room.host.name }}</text>
              <text class="teacher-fans">{{ room.host.followers.toLocaleString() }} 粉丝</text>
            </view>
            <text class="teacher-link">查看主页 →</text>
          </view>
        </view>
      </view>

      <!-- 底部固定按钮 -->
      <view class="bottom-bar">
        <view class="bottom-inner">
          <view :class="['book-btn', isBooked ? 'booked' : '']" @click="handleBook">
            <text v-if="isBooked">✓ 已预约</text>
            <text v-else>🔔 立即预约</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { liveApi, liveRoomApi } from '../../api'

const room = ref<any>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const isBooked = ref(false)
const bookedCount = ref(0)
const bookLoading = ref(false)
const countdown = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 })
let countdownTimer: any = null

const roomId = ref('')

const isStartingSoon = computed(() =>
  countdown.value.days === 0 && countdown.value.hours === 0 && countdown.value.minutes < 60
)

const descLines = computed(() => {
  if (!room.value?.description) return []
  const lines = room.value.description.split('\n')
  return lines.map(line => {
    const t = line.trim()
    if (t.startsWith('### ')) return { type: 'h3', text: t.replace('### ', '') }
    if (t.startsWith('**') && t.endsWith('**')) return { type: 'bold', text: t.replace(/\*\*/g, '') }
    if (t.startsWith('- ')) return { type: 'list', text: t.replace('- ', '') }
    if (t.match(/^\d+\./)) return { type: 'numbered', text: t }
    if (t === '') return { type: 'break', text: '' }
    return { type: 'p', text: t }
  })
})

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  roomId.value = opts.id || ''
  if (roomId.value) loadRoom()
  else { loading.value = false; loadError.value = '缺少直播ID' }
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

async function loadRoom() {
  loading.value = true
  loadError.value = null
  try {
    const raw = await liveApi.roomDetail(roomId.value)
    room.value = mapPreviewRoom(raw)
    isBooked.value = raw.isBooked || false
    bookedCount.value = raw.bookedCount || raw.bookingCount || 0
    startCountdown()
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
    console.error(e)
  } finally { loading.value = false }
}

function mapPreviewRoom(raw: any) {
  return {
    id: raw.id,
    title: raw.title || '',
    cover: raw.cover || '',
    status: raw.status || 'preview',
    tags: raw.tags || [],
    estimatedDuration: raw.estimatedDuration || raw.duration || 60,
    startTime: raw.startAt || raw.startTime || '',
    description: raw.description || '',
    category: raw.category || '',
    host: {
      id: raw.hostId || raw.userId || raw.host?.id || '',
      name: raw.hostName || raw.host?.name || raw.user?.nickname || '',
      avatar: raw.hostAvatar || raw.host?.avatar || raw.user?.avatar || '',
      followers: raw.hostFans || raw.host?.followers || 0,
    },
  }
}

function startCountdown() {
  if (!room.value?.startTime) return
  const updateCountdown = () => {
    const now = Date.now()
    const start = new Date(room.value.startTime).getTime()
    const diff = start - now
    if (diff <= 0) {
      countdown.value = { days: 0, hours: 0, minutes: 0, seconds: 0 }
      return
    }
    countdown.value = {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    }
  }
  updateCountdown()
  countdownTimer = setInterval(updateCountdown, 1000)
}

async function handleBook() {
  if (bookLoading.value || !room.value) return
  bookLoading.value = true
  const newBooked = !isBooked.value
  // 乐观更新
  isBooked.value = newBooked
  bookedCount.value = newBooked ? bookedCount.value + 1 : bookedCount.value - 1
  try {
    if (newBooked) {
      await liveRoomApi.book(roomId.value)
    } else {
      await liveRoomApi.unbook(roomId.value)
    }
  } catch (e) {
    // 回滚
    isBooked.value = !newBooked
    bookedCount.value = newBooked ? bookedCount.value - 1 : bookedCount.value + 1
    uni.showToast({ title: '操作失败,请重试', icon: 'none' })
  }
  finally { bookLoading.value = false }
}

function handleShare() {
  uni.share({
    title: room.value?.title,
    content: `${room.value?.host.name}的直播预告：${room.value?.title}`,
  })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function goBack() { uni.navigateBack() }
function goProfile(id: string) { uni.navigateTo({ url: `/pages/user/profile?id=${id}` }) }
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; padding-bottom: 120rpx; }

/* 装载 */
.loading-wrap { }
.skeleton-cover { height: 60vh; min-height: 640rpx; background: #E8E3DB; }
.skeleton-body { padding: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.skeleton-line { height: 32rpx; background: #E8E3DB; border-radius: 6rpx; }
.w-80 { width: 80%; }
.w-60 { width: 60%; }
.w-full { width: 100%; }

/* 空状态 */
/* 错误态 */
.error-wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 48rpx; }
.error-inner { text-align: center; }
.error-icon { font-size: 72rpx; display: block; margin-bottom: 16rpx; }
.error-text { font-size: 26rpx; color: #999; margin-bottom: 24rpx; display: block; }
.error-retry { display: inline-block; padding: 16rpx 48rpx; background: #C41E3A; color: #fff; border-radius: 40rpx; font-size: 26rpx; }

.empty-state { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
.empty-text { font-size: 28rpx; color: #999; }

/* 封面区域 */
.cover-section { position: relative; height: 60vh; min-height: 640rpx; overflow: hidden; }
.cover-bg { position: absolute; inset: 0; width: 100%; height: 100%; }
.cover-gradient { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%); }

.cover-top { position: absolute; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; padding: 24rpx; z-index: 2; }
.top-btn { width: 64rpx; height: 64rpx; background: rgba(0,0,0,0.3); backdrop-filter: blur(8px); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.top-btn-icon { font-size: 32rpx; color: #fff; }

.cover-label { position: absolute; top: 32rpx; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8rpx; padding: 8rpx 24rpx; background: #C41E3A; border-radius: 40rpx; z-index: 2; }
.label-icon { font-size: 24rpx; }
.label-text { font-size: 24rpx; color: #fff; font-weight: 500; }

.cover-bottom { position: absolute; bottom: 0; left: 0; right: 0; padding: 24rpx; z-index: 2; }
.cover-title { display: block; font-size: 36rpx; font-weight: bold; color: #fff; margin-bottom: 20rpx; line-height: 1.3; }

.host-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 20rpx; }
.host-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; border: 2rpx solid rgba(255,255,255,0.3); background: #E8E3DB; flex-shrink: 0; }
.host-name { display: block; font-size: 28rpx; font-weight: 500; color: #fff; }
.host-fans { display: block; font-size: 22rpx; color: rgba(255,255,255,0.7); margin-top: 4rpx; }

/* 倒计时 */
.countdown-box { background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); border-radius: 24rpx; padding: 24rpx; }
.countdown-soon { display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.soon-icon { font-size: 32rpx; color: #FFD700; }
.soon-text { font-size: 32rpx; font-weight: bold; color: #FFD700; }
.countdown-label { display: block; text-align: center; font-size: 22rpx; color: rgba(255,255,255,0.7); margin-bottom: 16rpx; }
.countdown-display { display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.countdown-block { background: rgba(255,255,255,0.2); border-radius: 12rpx; padding: 12rpx 20rpx; min-width: 80rpx; text-align: center; }
.cd-num { display: block; font-size: 40rpx; font-weight: bold; color: #fff; }
.cd-unit { display: block; font-size: 20rpx; color: rgba(255,255,255,0.7); }
.cd-sep { font-size: 28rpx; font-weight: bold; color: #fff; }

/* 详情区 */
.detail-section { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }

/* 信息卡片 */
.info-card { background: #fff; border-radius: 24rpx; padding: 24rpx; }
.info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; text-align: center; }
.info-value-row { display: flex; align-items: center; justify-content: center; gap: 8rpx; margin-bottom: 8rpx; }
.info-icon { font-size: 28rpx; }
.info-icon.accent { color: #C41E3A; }
.info-icon.gold { color: #C9A96E; }
.info-value { font-size: 32rpx; font-weight: bold; color: #2C2C2C; }
.info-label { display: block; font-size: 22rpx; color: #999; }

/* 标签 */
.tags-row { display: flex; flex-wrap: wrap; gap: 12rpx; }
.tag { padding: 8rpx 24rpx; background: rgba(196,30,58,0.1); color: #C41E3A; border-radius: 40rpx; font-size: 24rpx; }

/* 简介 */
.desc-card, .teacher-card { background: #fff; border-radius: 24rpx; padding: 24rpx; }
.section-title { display: block; font-size: 30rpx; font-weight: bold; color: #2C2C2C; margin-bottom: 20rpx; }
.desc-content { }
.desc-h3 { display: block; font-size: 28rpx; font-weight: bold; color: #2C2C2C; margin-top: 24rpx; margin-bottom: 12rpx; }
.desc-bold { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; margin: 8rpx 0; }
.desc-paragraph { display: block; font-size: 24rpx; color: #666; line-height: 1.8; margin: 4rpx 0; }
.desc-list-item { display: block; font-size: 24rpx; color: #666; padding-left: 24rpx; margin: 4rpx 0; }
.desc-numbered { display: block; font-size: 24rpx; color: #666; padding-left: 16rpx; margin: 4rpx 0; }
.desc-break { display: block; height: 16rpx; }

/* 讲师 */
.teacher-row { display: flex; align-items: center; gap: 20rpx; }
.teacher-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: #E8E3DB; flex-shrink: 0; }
.teacher-info { flex: 1; }
.teacher-name { display: block; font-size: 28rpx; font-weight: bold; color: #2C2C2C; margin-bottom: 8rpx; }
.teacher-fans { display: block; font-size: 22rpx; color: #999; }
.teacher-link { font-size: 24rpx; color: #C41E3A; }

/* 底部按钮 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E8E3DB; padding: 24rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); z-index: 20; }
.bottom-inner { }
.book-btn { text-align: center; padding: 24rpx 0; border-radius: 16rpx; font-size: 28rpx; font-weight: 500; background: #C41E3A; color: #fff; }
.book-btn.booked { background: #F5F5F5; color: #666; }
</style>
