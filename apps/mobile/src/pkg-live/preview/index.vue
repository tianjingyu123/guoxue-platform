<template>
  <view class="page">
    <!-- 加载骨架 -->
    <view v-if="loading" class="state-skeleton">
      <view class="state-skeleton__cover" />
      <view v-for="i in 3" :key="i" class="state-skeleton__row" />
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="state-error">
      <text class="state-error__txt">{{ error }}</text>
      <view class="state-error__retry" @tap="fetchData(roomId)"><text class="state-error__retry-txt">重试</text></view>
    </view>

    <template v-else>
    <!-- 封面区域 -->
    <view class="cover-area">
      <image lazy-load class="cover-img" :src="room.cover" mode="aspectFill" />
      <view class="cover-mask" />

      <!-- 顶部导航 -->
      <view class="cover-nav">
        <view class="circle-btn" @tap="goBack">
          <AppIcon name="chevron-left" :size="48" color="#fff" />
        </view>
        <view class="circle-btn">
          <AppIcon name="share-2" :size="40" color="#fff" />
        </view>
      </view>

      <!-- 预告标签 -->
      <view class="preview-badge">
        <AppIcon name="calendar" :size="32" color="#fff" />
        <text class="preview-badge-txt">直播预告</text>
      </view>

      <!-- 底部信息 -->
      <view class="cover-bottom">
        <text class="cover-title">{{ room.title }}</text>
        <!-- 讲师 -->
        <view class="host-row">
          <smart-avatar :src="room.hostAvatar" :name="room.hostName" class="host-avatar" />
          <view class="host-info">
            <text class="host-name">{{ room.hostName }}</text>
            <text class="host-fans">{{ (room.hostFollowers ?? 0).toLocaleString() }} 粉丝</text>
          </view>
        </view>
        <!-- 倒计时 -->
        <view class="countdown">
          <text class="countdown-label">{{ scheduledAtMs ? '距开播还有' : '开播时间' }}</text>
          <view v-if="scheduledAtMs" class="countdown-row">
            <template v-if="countdown.days > 0">
              <view class="cd-box">
                <text class="cd-num">{{ countdown.days }}</text>
                <text class="cd-unit">天</text>
              </view>
              <text class="cd-colon">:</text>
            </template>
            <view class="cd-box">
              <text class="cd-num">{{ pad(countdown.hours) }}</text>
              <text class="cd-unit">时</text>
            </view>
            <text class="cd-colon">:</text>
            <view class="cd-box">
              <text class="cd-num">{{ pad(countdown.minutes) }}</text>
              <text class="cd-unit">分</text>
            </view>
            <text class="cd-colon">:</text>
            <view class="cd-box">
              <text class="cd-num">{{ pad(countdown.seconds) }}</text>
              <text class="cd-unit">秒</text>
            </view>
          </view>
          <text v-else class="countdown-pending">等待主播确认</text>
        </view>
      </view>
    </view>

    <!-- 详情内容 -->
    <view class="body">
      <!-- 信息卡 -->
      <view class="info-card">
        <view class="info-col">
          <view class="info-top info-red">
            <AppIcon name="users" :size="32" color="#C41E3A" />
            <text class="info-num">{{ (room.bookedCount ?? 0).toLocaleString() }}</text>
          </view>
          <text class="info-label">已预约</text>
        </view>
        <view class="info-col">
          <view class="info-top info-gold">
            <AppIcon name="clock" :size="32" color="#C9A96E" />
            <text class="info-num">{{ room.estimatedDuration ?? 0 }}</text>
          </view>
          <text class="info-label">预计时长(分钟)</text>
        </view>
        <view class="info-col">
          <text class="info-num info-dark">{{ startDateText }}</text>
          <text class="info-label">{{ startTimeText }}</text>
        </view>
      </view>

      <!-- 标签 -->
      <view v-if="room.tags?.length" class="tag-row">
        <text v-for="(tag, i) in room.tags" :key="i" class="tag">{{ tag }}</text>
      </view>

      <!-- 直播简介 -->
      <view v-if="descLines.length" class="detail-card">
        <text class="detail-title">直播简介</text>
        <view class="desc">
          <template v-for="(line, i) in descLines" :key="i">
            <text v-if="line.type === 'h3'" class="desc-h3">{{ line.text }}</text>
            <text v-else-if="line.type === 'bold'" class="desc-bold">{{ line.text }}</text>
            <view v-else-if="line.type === 'bullet'" class="desc-bullet">
              <text class="desc-dot">•</text>
              <text class="desc-bullet-txt">{{ line.text }}</text>
            </view>
            <text v-else-if="line.type === 'num'" class="desc-num">{{ line.text }}</text>
            <text v-else-if="line.type === 'p'" class="desc-p">{{ line.text }}</text>
            <view v-else class="desc-br" />
          </template>
        </view>
      </view>

      <!-- 讲师卡 -->
      <view class="detail-card">
        <text class="detail-title">讲师介绍</text>
        <view class="teacher-row" @tap="openHost">
          <smart-avatar :src="room.hostAvatar" :name="room.hostName" class="teacher-avatar" />
          <view class="teacher-info">
            <text class="teacher-name">{{ room.hostName }}</text>
            <text class="teacher-fans">{{ (room.hostFollowers ?? 0).toLocaleString() }} 粉丝</text>
          </view>
          <text class="teacher-link">查看主页 →</text>
        </view>
      </view>
    </view>

    <!-- 底部预约按钮 -->
    <view class="footer">
      <view class="book-btn" :class="{ 'book-btn--booked': booked, 'book-btn--disabled': !booked && !canBook && room.status !== 'LIVING' }" @tap="onToggleBook">
        <AppIcon :name="room.status === 'LIVING' && !booked ? 'play' : 'bell'" :size="40" color="#fff" />
        <text class="book-txt">{{ bookingSubmitting ? '提交中…' : booked ? '已预约' : canBook ? '立即预约' : room.status === 'LIVING' ? '进入直播' : '预约已结束' }}</text>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { goBack, navigateTo } from '@/utils/router'
import { liveApi } from '@/lib/live-data'

const loading = ref(true)
const error = ref('')
const roomId = ref('')
const room = ref<any>({})
const booked = ref(false)
const bookingSubmitting = ref(false)

async function fetchData(previewId: string) {
  if (!previewId) return
  loading.value = true
  error.value = ''
  try {
    const data = await liveApi.getPreview(previewId)
    room.value = data
    booked.value = !!data.isBooked
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onLoad((opts) => {
  roomId.value = String(opts?.id || '')
  if (!roomId.value) {
    loading.value = false
    error.value = '缺少直播预告信息，请返回后重新进入'
    return
  }
  fetchData(roomId.value)
})

const now = ref(Date.now())
const scheduledAtMs = computed(() => {
  const value = Date.parse(String(room.value?.scheduledAt || ''))
  return Number.isFinite(value) ? value : 0
})
const canBook = computed(() => room.value?.status === 'WAITING' && scheduledAtMs.value > now.value)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

async function onToggleBook() {
  if (bookingSubmitting.value) return
  const id = String(room.value?.id || roomId.value)
  if (!id) return
  if (!booked.value && !canBook.value) {
    if (room.value?.status === 'LIVING') navigateTo(`/pkg-live/watch/index?id=${id}`)
    else uni.showToast({ title: '该场直播已无法预约', icon: 'none' })
    return
  }

  bookingSubmitting.value = true
  try {
    if (!booked.value) {
      const result = await liveApi.bookRoom(id)
      booked.value = result.booked
      room.value.bookedCount = result.bookingCount
      uni.showToast({ title: '预约成功，开播前将提醒你', icon: 'none' })
    } else {
      const result = await liveApi.unbookRoom(id)
      booked.value = result.booked
      room.value.bookedCount = result.bookingCount
      uni.showToast({ title: '已取消预约', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败，请重试', icon: 'none' })
  } finally {
    bookingSubmitting.value = false
  }
}

const countdown = computed(() => {
  const diff = Math.max(0, scheduledAtMs.value - now.value)
  const totalSec = Math.floor(diff / 1000)
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  }
})

const startDateText = computed(() => {
  if (!scheduledAtMs.value) return '待定'
  const date = new Date(scheduledAtMs.value)
  return `${date.getMonth() + 1}/${date.getDate()}`
})
const startTimeText = computed(() => {
  if (!scheduledAtMs.value) return '等待主播确认'
  const date = new Date(scheduledAtMs.value)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
})

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function openHost() {
  if (room.value?.hostId) navigateTo(`/pkg-circle/user/profile?id=${room.value.hostId}`)
}

const descLines = computed(() => {
  const lines = room.value.descriptionLines || []
  return lines.map((line: string) => {
    if (line.startsWith('### ')) return { type: 'h3', text: line.replace('### ', '') }
    if (line.startsWith('**') && line.endsWith('**')) return { type: 'bold', text: line.replace(/\*\*/g, '') }
    if (line.startsWith('- ')) return { type: 'bullet', text: line.replace('- ', '') }
    if (/^\d+\./.test(line)) return { type: 'num', text: line.replace(/\*\*/g, '') }
    if (line) return { type: 'p', text: line }
    return { type: 'br', text: '' }
  })
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: calc(192rpx + env(safe-area-inset-bottom));
}

/* 加载骨架 */
.state-skeleton__cover { width: 100%; height: 50vh; min-height: 640rpx; background: linear-gradient(90deg, #e8e4dc 25%, #f0ece5 50%, #e8e4dc 75%); animation: shimmer 1.5s infinite; background-size: 200% 100%; }
.state-skeleton__row { height: 48rpx; margin: 16rpx 32rpx; border-radius: 12rpx; background: linear-gradient(90deg, #e8e4dc 25%, #f0ece5 50%, #e8e4dc 75%); animation: shimmer 1.5s infinite; background-size: 200% 100%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* 错误状态 */
.state-error { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 320rpx 0; }
.state-error__txt { font-size: 28rpx; color: #999; margin-bottom: 32rpx; }
.state-error__retry { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.state-error__retry-txt { font-size: 28rpx; color: #fff; font-weight: 500; }

/* 封面 */
.cover-area {
  position: relative;
  height: 50vh;
  min-height: 640rpx;
}
.cover-img {
  width: 100%;
  height: 100%;
}
.cover-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.2) 50%, transparent);
}
.cover-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: calc(var(--status-bar-height) + 32rpx) 32rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.circle-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-badge {
  position: absolute;
  top: calc(var(--status-bar-height) + 32rpx);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 32rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.preview-badge-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}
.cover-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32rpx;
  color: #fff;
}
.cover-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.25;
  color: #fff;
  margin-bottom: 24rpx;
}
.host-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 32rpx;
}
.host-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
}
.host-name {
  display: block;
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}
.host-fans {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
}
.countdown {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 32rpx;
  padding: 32rpx;
}
.countdown-label {
  display: block;
  text-align: center;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16rpx;
}
.countdown-pending { font-size: 32rpx; font-weight: 600; color: #fff; }
.countdown-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.cd-box {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  min-width: 100rpx;
  text-align: center;
}
.cd-num {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #fff;
}
.cd-unit {
  display: block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}
.cd-colon {
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
}

/* 详情 */
.body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.info-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.info-col {
  text-align: center;
}
.info-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}
.info-num {
  font-size: 36rpx;
  font-weight: 700;
}
.info-red .info-num {
  color: var(--brand);
}
.info-gold .info-num {
  color: #C9A96E;
}
.info-dark {
  display: block;
  color: #2C2C2C;
  margin-bottom: 8rpx;
}
.info-label {
  font-size: 22rpx;
  color: #999999;
}

/* 标签 */
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.tag {
  padding: 8rpx 24rpx;
  background: rgba(196, 30, 58, 0.1);
  color: var(--brand);
  font-size: 26rpx;
  border-radius: 999rpx;
}

/* 简介卡 */
.detail-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.detail-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #2C2C2C;
  margin-bottom: 24rpx;
}
.desc {
  display: flex;
  flex-direction: column;
}
.desc-h3 {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #2C2C2C;
  margin-top: 32rpx;
  margin-bottom: 16rpx;
}
.desc-bold {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  line-height: 1.6;
}
.desc-bullet {
  display: flex;
  gap: 12rpx;
  padding-left: 8rpx;
}
.desc-dot {
  color: var(--brand);
  font-size: 28rpx;
}
.desc-bullet-txt {
  flex: 1;
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
}
.desc-num {
  display: block;
  padding-left: 32rpx;
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
}
.desc-p {
  display: block;
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
}
.desc-br {
  height: 24rpx;
}

/* 讲师卡 */
.teacher-row {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.teacher-avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
}
.teacher-info {
  flex: 1;
}
.teacher-name {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #2C2C2C;
}
.teacher-fans {
  display: block;
  font-size: 26rpx;
  color: #999999;
  margin-top: 8rpx;
}
.teacher-link {
  font-size: 26rpx;
  color: var(--brand);
}

/* 底部按钮 */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1rpx solid #E8E3DB;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.book-btn {
  flex: 1;
  padding: 28rpx 0;
  background: var(--brand);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.book-txt {
  font-size: 32rpx;
  font-weight: 500;
  color: #fff;
}
.book-btn--disabled { opacity: 0.58; }
.book-btn--booked {
  background: #B8B2A8;
}
</style>
