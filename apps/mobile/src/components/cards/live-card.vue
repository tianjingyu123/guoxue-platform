<script setup lang="ts">
/** 直播卡(feed)- 从原型 components/cards/live-card.tsx 迁移 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import LiveCardMedia from '@/components/live/live-card-media.vue'
import LiveStatusBadge from '@/components/live/live-status-badge.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { navigateToContent } from '@/utils/router'
import { track } from '@/composables/useTrack'
import { type LiveCardData, normalizeRatio, formatCount } from '@/lib/card-utils'

const props = defineProps<{ data: LiveCardData }>()
const booked = ref(false)
const ratio = computed(() => normalizeRatio(props.data.coverRatio))
const status = computed(() => props.data.status ?? 'live')
const accessibilityLabel = computed(() => {
  const stateText = status.value === 'live' ? '正在直播' : status.value === 'upcoming' ? '直播预约' : '直播回放'
  const hostText = props.data.host ? `，主播 ${props.data.host}` : ''
  return `观看${stateText}：${props.data.title}${hostText}`
})
function open(event?: unknown) {
  track.click('live_card', { id: props.data.id })
  navigateToContent(`/live/${props.data.id}`, event)
}
function toggleBook() { booked.value = !booked.value }
function activateOnKeyboard(event: KeyboardEvent, action: () => unknown) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  void action()
}
</script>

<template>
  <view
    class="card"
    data-content-card
    :class="status === 'live' && 'card-live'"
    role="link"
    :aria-label="accessibilityLabel"
    tabindex="0"
    hover-class="card-press"
    @tap="open"
    @keydown="activateOnKeyboard($event, () => open($event))"
  >
    <view class="cover" :class="ratio === '1:1' ? 'r-sq' : 'r-34'">
      <live-card-media
        class="cover-img"
        :room-id="String(data.id)"
        :cover="data.cover"
        :title="data.title"
        :status="status"
        :replay-url="data.replayUrl"
      />
      <view class="grad" />
      <view v-if="status === 'live'" class="live-scan" />
      <live-status-badge v-if="status === 'live'" />
      <view v-else-if="status === 'upcoming'" class="time-badge">
        <AppIcon name="clock" :size="20" color="#ffffff" /><text class="time-txt">预约</text>
      </view>
      <text v-else class="time-badge time-txt">回放</text>
      <!-- 人数 -->
      <view class="viewers">
        <AppIcon :name="status === 'upcoming' ? 'users' : 'eye'" :size="20" color="rgba(255,255,255,0.8)" />
        <text class="viewers-txt">{{ status === 'upcoming' ? formatCount(data.reservations) + '预约' : formatCount(data.viewers) + (status === 'replay' ? '次观看' : '') }}</text>
      </view>
      <!-- 预约按钮 -->
      <view
        v-if="status === 'upcoming'"
        class="book-btn"
        :class="booked ? 'book-on' : 'book-off'"
        role="button"
        :aria-label="booked ? `取消预约：${data.title}` : `预约直播：${data.title}`"
        :aria-pressed="booked ? 'true' : 'false'"
        tabindex="0"
        @tap.stop="toggleBook"
        @keydown.stop="activateOnKeyboard($event, toggleBook)"
      >
        <AppIcon name="bell" :size="20" :color="booked ? '#ffffff' : '#ffffff'" /><text class="book-txt">{{ booked ? '已约' : '预约' }}</text>
      </view>
    </view>
    <view class="body">
      <text class="title">{{ data.title }}</text>
      <view v-if="data.host" class="author">
        <smart-avatar :src="data.hostAvatar" :name="data.host" class="avatar" />
        <text class="author-name">{{ data.host }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.card { overflow: hidden; background: var(--surface); border-radius: 24rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05); margin-bottom: 12rpx; }
.card-live { animation: live-aura 2.8s ease-in-out infinite; }
.card-press { transform: scale(0.98); }
.cover { position: relative; width: 100%; background: var(--surface-sunken); overflow: hidden; }
.r-34 { padding-bottom: 133.33%; }
.r-sq { padding-bottom: 100%; }
.cover-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.grad { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%); }
.time-badge { position: absolute; top: 16rpx; right: 16rpx; z-index: 10; display: flex; align-items: center; gap: 6rpx; padding: 4rpx 14rpx; border-radius: 999rpx; background: rgba(0,0,0,0.45); }
.time-txt { font-size: 20rpx; color: rgba(255,255,255,0.95); font-weight: 500; }
.live-scan { position: absolute; top: -20%; right: 0; left: 0; z-index: 4; height: 20%; pointer-events: none; background: linear-gradient(180deg, transparent, rgba(255,235,224,.18), transparent); animation: live-scan 4.2s ease-in-out infinite; }
.viewers { position: absolute; bottom: 16rpx; left: 16rpx; z-index: 10; display: flex; align-items: center; gap: 6rpx; padding: 4rpx 14rpx; border-radius: 999rpx; background: rgba(0,0,0,0.5); }
.viewers-txt { font-size: 20rpx; color: #fff; }
.book-btn { position: absolute; bottom: 16rpx; right: 16rpx; z-index: 10; display: flex; align-items: center; justify-content: center; gap: 6rpx; min-height: 52rpx; padding: 8rpx 22rpx; border-radius: 999rpx; box-sizing: border-box; }
.book-off { background: var(--brand); }
.book-on { background: rgba(255,255,255,0.2); border: 2rpx solid rgba(255,255,255,0.3); }
.book-txt { font-size: 20rpx; color: #fff; font-weight: 500; }
.body { padding: 18rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; font-weight: 500; color: var(--text-strong); line-height: 1.5; margin-bottom: 14rpx; }
.author { display: flex; align-items: center; gap: 10rpx; }
.avatar { width: 32rpx; height: 32rpx; border-radius: 999rpx; overflow: hidden; background: rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-img { width: 100%; height: 100%; }
.avatar-ph { font-size: 16rpx; color: var(--text); }
.author-name { font-size: 22rpx; color: var(--text); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
@keyframes live-aura {
  0%, 100% { box-shadow: 0 2rpx 16rpx rgba(0,0,0,.05), inset 0 0 0 1rpx rgba(196,30,58,.12); }
  50% { box-shadow: 0 8rpx 28rpx rgba(196,30,58,.17), inset 0 0 0 2rpx rgba(196,30,58,.32); }
}
@keyframes live-scan {
  0%, 18% { transform: translateY(0); opacity: 0; }
  28% { opacity: 1; }
  68% { opacity: .7; }
  82%, 100% { transform: translateY(600%); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .card-live,
  .live-scan { animation: none; }
}
</style>
