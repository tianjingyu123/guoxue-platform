<script setup lang="ts">
/** 直播卡(feed)- 从原型 components/cards/live-card.tsx 迁移 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { type LiveCardData, normalizeRatio, formatCount } from '@/lib/card-utils'

const props = defineProps<{ data: LiveCardData }>()
const booked = ref(false)
const ratio = computed(() => normalizeRatio(props.data.coverRatio))
const status = computed(() => props.data.status ?? 'live')
const typeLabel = computed(() => (props.data.liveType === 'commerce' ? '电商带货' : '知识授课'))
function open() { navigateTo(`/live/${props.data.id}`) }
function toggleBook() { booked.value = !booked.value }
</script>

<template>
  <view class="card" :class="status === 'live' && 'card-live'" hover-class="card-press" @tap="open">
    <view class="cover" :class="ratio === '1:1' ? 'r-sq' : 'r-34'">
      <image v-if="data.cover" class="cover-img" :src="data.cover" mode="aspectFill" />
      <view class="grad" />
      <!-- 类型标 -->
      <text class="type-badge">{{ typeLabel }}</text>
      <!-- 状态标 -->
      <view v-if="status === 'live'" class="live-badge"><view class="live-dot" /><text class="live-txt">直播中</text></view>
      <view v-else-if="status === 'upcoming'" class="time-badge">
        <AppIcon name="clock" :size="20" color="#ffffff" /><text class="time-txt">{{ data.scheduledTime }}</text>
      </view>
      <text v-else class="time-badge time-txt">{{ data.duration || '回放' }}</text>
      <!-- 人数 -->
      <view class="viewers">
        <AppIcon :name="status === 'upcoming' ? 'users' : 'eye'" :size="20" color="rgba(255,255,255,0.8)" />
        <text class="viewers-txt">{{ status === 'upcoming' ? formatCount(data.reservations) + '预约' : formatCount(data.viewers) + (status === 'replay' ? '次观看' : '') }}</text>
      </view>
      <!-- 预约按钮 -->
      <view v-if="status === 'upcoming'" class="book-btn" :class="booked ? 'book-on' : 'book-off'" @tap.stop="toggleBook">
        <AppIcon name="bell" :size="20" :color="booked ? '#ffffff' : '#ffffff'" /><text class="book-txt">{{ booked ? '已约' : '预约' }}</text>
      </view>
    </view>
    <view class="body">
      <text class="title">{{ data.title }}</text>
      <view v-if="data.host" class="author">
        <view class="avatar">
          <image v-if="data.hostAvatar" class="avatar-img" :src="data.hostAvatar" mode="aspectFill" />
          <text v-else class="avatar-ph">{{ data.host.charAt(0) }}</text>
        </view>
        <text class="author-name">{{ data.host }}</text>
      </view>
    </view>
</template>

<style scoped lang="scss">
.card { overflow: hidden; background: var(--surface); border-radius: 24rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05); margin-bottom: 12rpx; }
.card-live { box-shadow: 0 0 0 2rpx rgba(196,30,58,0.4), 0 2rpx 16rpx rgba(196,30,58,0.15); }
.card-press { transform: scale(0.98); }
.cover { position: relative; width: 100%; background: var(--surface-sunken); overflow: hidden; }
.r-34 { padding-bottom: 133.33%; }
.r-sq { padding-bottom: 100%; }
.cover-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.grad { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%); }
.type-badge { position: absolute; top: 16rpx; left: 16rpx; z-index: 10; font-size: 20rpx; padding: 2rpx 14rpx; border-radius: 999rpx; color: rgba(255,255,255,0.95); font-weight: 500; background: rgba(0,0,0,0.45); }
.live-badge { position: absolute; top: 16rpx; right: 16rpx; z-index: 10; display: flex; align-items: center; gap: 6rpx; padding: 4rpx 14rpx; border-radius: 999rpx; background: var(--brand); }
.live-dot { width: 10rpx; height: 10rpx; background: #fff; border-radius: 999rpx; }
.live-txt { font-size: 20rpx; color: #fff; font-weight: 500; }
.time-badge { position: absolute; top: 16rpx; right: 16rpx; z-index: 10; display: flex; align-items: center; gap: 6rpx; padding: 4rpx 14rpx; border-radius: 999rpx; background: rgba(0,0,0,0.45); }
.time-txt { font-size: 20rpx; color: rgba(255,255,255,0.95); font-weight: 500; }
.viewers { position: absolute; bottom: 16rpx; left: 16rpx; z-index: 10; display: flex; align-items: center; gap: 6rpx; padding: 4rpx 14rpx; border-radius: 999rpx; background: rgba(0,0,0,0.5); }
.viewers-txt { font-size: 20rpx; color: #fff; }
.book-btn { position: absolute; bottom: 16rpx; right: 16rpx; z-index: 10; display: flex; align-items: center; gap: 6rpx; padding: 6rpx 18rpx; border-radius: 999rpx; }
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
</style>
