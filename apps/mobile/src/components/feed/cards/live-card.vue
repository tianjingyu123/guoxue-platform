<script setup lang="ts">
/**
 * 直播卡 · 统一 3:4，直播画面居中裁剪。
 * 直播中显示带呼吸灯的状态角标；预约显示真实开播时间或 24 小时内倒计时。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import LiveCardMedia from '@/components/live/live-card-media.vue'
import LiveStatusBadge from '@/components/live/live-status-badge.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { type FeedEnvelope, payloadBool, payloadStr } from '@/lib/feed-data'
import type { LiveStatus } from '@/lib/live-data'

const props = defineProps<{ item: FeedEnvelope }>()
const isLive = computed(() => payloadBool(props.item, 'isLive'))
const status = computed<LiveStatus>(() => {
  const value = payloadStr(props.item, 'status')
  if (value === 'live' || value === 'replay' || value === 'upcoming') return value
  return isLive.value ? 'live' : 'upcoming'
})
const replayUrl = computed(() => payloadStr(props.item, 'replayUrl') || '')
const hook = computed(() => (
  status.value === 'live' ? '进入直播' : status.value === 'replay' ? '看回放' : '去预约'
))

const now = ref(Date.now())
let clockTimer: ReturnType<typeof setInterval> | null = null
const scheduledTime = computed(() => payloadStr(props.item, 'scheduledTime') || '')
const scheduledAt = computed(() => {
  const value = scheduledTime.value
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
})
const upcomingTimeText = computed(() => {
  const start = scheduledAt.value
  if (!start) return '开播时间待定'
  const diff = start - now.value
  if (diff > 0 && diff <= 24 * 60 * 60 * 1000) {
    const totalMinutes = Math.max(1, Math.ceil(diff / 60000))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return hours > 0 ? `距开播 ${hours}时${minutes}分` : `距开播 ${minutes}分钟`
  }
  const date = new Date(start)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${hour}:${minute}`
})

onMounted(() => {
  clockTimer = setInterval(() => { now.value = Date.now() }, 30000)
})
onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
  clockTimer = null
})
</script>

<template>
  <view class="fcard" :class="{ 'is-live': status === 'live' }">
    <view class="cov">
      <live-card-media
        :room-id="item.id"
        :cover="item.cover"
        :title="item.title"
        :status="status"
        :replay-url="replayUrl"
        deco
        class="cov-img"
      />
      <view v-if="status === 'live'" class="live-scan" />
      <live-status-badge v-if="status === 'live'" />
      <view v-else-if="status === 'upcoming'" class="upcoming-badge">
        <view class="upcoming-pulse" />
        <view class="upcoming-copy">
          <text class="upcoming-label">预约直播</text>
          <text class="upcoming-time">{{ upcomingTimeText }}</text>
        </view>
      </view>
      <text v-else-if="status === 'replay'" class="badge state">回放</text>
    </view>
    <view class="body">
      <text class="title">{{ item.title }}</text>
      <view class="meta">
        <smart-avatar :src="item.author?.avatar" :name="item.author?.name || ''" class="ava" />
        <text class="name">{{ item.author?.name }}</text>
        <text class="hook">{{ hook }} ›</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); }
.fcard.is-live { animation: live-aura 2.8s ease-in-out infinite; }
.cov { position: relative; width: 100%; padding-top: 133.33%; overflow: hidden; background: #f6f1e7; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.badge {
  position: absolute; font-size: 20rpx; color: #fff; background: rgba(20,15,10,.55);
  border-radius: 8rpx; padding: 4rpx 12rpx; z-index: 3;
}
.badge.state {
  top: 16rpx;
  right: 16rpx;
  background: rgba(38, 31, 26, .72);
  letter-spacing: 1rpx;
}
.upcoming-badge {
  position: absolute;
  top: 14rpx;
  right: 14rpx;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 9rpx;
  max-width: calc(100% - 28rpx);
  padding: 8rpx 11rpx;
  border: 1rpx solid rgba(255, 255, 255, .28);
  border-radius: 12rpx;
  background: rgba(43, 31, 29, .78);
  box-shadow: 0 4rpx 14rpx rgba(35, 22, 19, .2);
  box-sizing: border-box;
  backdrop-filter: blur(8rpx);
}
.upcoming-pulse {
  width: 10rpx;
  height: 10rpx;
  flex-shrink: 0;
  border-radius: 999rpx;
  background: #ffcab8;
  box-shadow: 0 0 0 0 rgba(255, 202, 184, .45);
  animation: upcoming-breathe 2.2s ease-out infinite;
}
.upcoming-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.upcoming-label {
  font-size: 18rpx;
  line-height: 1.2;
  font-weight: 600;
  color: #fff;
}
.upcoming-time {
  margin-top: 2rpx;
  font-size: 18rpx;
  line-height: 1.2;
  color: rgba(255, 255, 255, .82);
  white-space: nowrap;
}
.live-scan {
  position: absolute;
  z-index: 2;
  top: -18%;
  right: 0;
  left: 0;
  height: 18%;
  pointer-events: none;
  background: linear-gradient(180deg, transparent, rgba(255, 235, 224, .16), transparent);
  animation: live-scan 4.2s ease-in-out infinite;
}
.body { padding: 18rpx 20rpx 22rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; line-height: 1.45; font-weight: 500; color: #2c2c2c; }
.meta { margin-top: 16rpx; display: flex; align-items: center; gap: 10rpx; }
.ava { width: 36rpx; height: 36rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; background: rgba(150,150,150,.18); display: flex; align-items: center; justify-content: center; }
.ava-img { width: 100%; height: 100%; }
.ava-char { font-size: 20rpx; color: #6e6e73; }
.name { flex: 1; min-width: 0; font-size: 22rpx; color: #9a9184; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hook { flex-shrink: 0; font-size: 22rpx; color: #8a6420; }
@keyframes live-aura {
  0%, 100% { box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06), inset 0 0 0 1rpx rgba(196,30,58,.12); }
  50% { box-shadow: 0 8rpx 28rpx rgba(196,30,58,.16), inset 0 0 0 2rpx rgba(196,30,58,.32); }
}
@keyframes live-scan {
  0%, 18% { transform: translateY(0); opacity: 0; }
  28% { opacity: 1; }
  68% { opacity: .7; }
  82%, 100% { transform: translateY(650%); opacity: 0; }
}
@keyframes upcoming-breathe {
  0% { opacity: .72; transform: scale(.82); box-shadow: 0 0 0 0 rgba(255, 202, 184, .45); }
  68%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 10rpx rgba(255, 202, 184, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .fcard.is-live,
  .live-scan,
  .upcoming-pulse { animation: none; }
}
</style>
