<script setup lang="ts">
/** 直播广场卡片 - 从原型 components/live/live-card.tsx 迁移（与首页 feed 的 cards/live-card 不同） */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import LiveCardMedia from '@/components/live/live-card-media.vue'
import LiveStatusBadge from '@/components/live/live-status-badge.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { navigateToContent } from '@/utils/router'
import type { LiveItem } from '@/lib/live-data'
import { formatPrice } from '@/utils/format'

const props = defineProps<{ data: LiveItem }>()
const booked = ref(false)

const viewerText = computed(() => {
  const v = props.data.viewerCount
  return v >= 10000 ? `${(v / 10000).toFixed(1)}万` : String(v)
})
const showSecondRow = computed(
  () => props.data.circleFree || (props.data.type === 'commerce' && !!props.data.productCount),
)

function open(event?: unknown) {
  navigateToContent(`/live/${props.data.id}`, event)
}
function toggleBook() {
  booked.value = !booked.value
}
</script>

<template>
  <view class="lc" data-content-card :class="{ 'is-live': data.status === 'live' }" hover-class="lc-press" @tap="open">
    <!-- 封面 -->
    <view class="cover" :class="data.orientation === 'horizontal' ? 'r-169' : 'r-34'">
      <live-card-media
        class="cover-img"
        :room-id="data.id"
        :cover="data.cover"
        :title="data.title"
        :status="data.status"
        :replay-url="data.replayUrl"
      />
      <view class="grad" />
      <view v-if="data.status === 'live'" class="live-scan" />
      <live-status-badge v-if="data.status === 'live'" />
      <view v-else-if="data.status === 'upcoming'" class="st-badge st-up">
        <AppIcon name="clock" :size="20" color="#ffffff" /><text class="st-txt">预约</text>
      </view>
      <view v-else class="st-badge st-replay">
        <text class="st-txt">回放</text>
      </view>
      <!-- 人数 左下 -->
      <view class="viewers">
        <AppIcon :name="data.status === 'upcoming' ? 'users' : 'eye'" :size="20" color="rgba(255,255,255,0.8)" />
        <text class="viewers-txt">
          {{ data.status === 'live' ? viewerText : data.status === 'upcoming' ? data.viewerCount + '人预约' : data.viewerCount + '次观看' }}
        </text>
      </view>
      <!-- 预约按钮 右下 -->
      <view
        v-if="data.status === 'upcoming'"
        class="book-btn"
        :class="booked ? 'book-on' : 'book-off'"
        @tap.stop="toggleBook"
      >
        <AppIcon name="bell" :size="20" color="#ffffff" /><text class="book-txt">{{ booked ? '已预约' : '预约' }}</text>
      </view>
    </view>
    <!-- 信息区 -->
    <view class="body">
      <text class="title">{{ data.title }}</text>
      <view class="host">
        <smart-avatar :src="data.hostAvatar" :name="data.hostName" class="avatar" />
        <text class="host-name">{{ data.hostName }}</text>
        <text v-if="data.priceType === 'paid'" class="price">¥{{ formatPrice(data.price) }}</text>
        <text v-else class="free">免费</text>
      </view>
      <view v-if="showSecondRow" class="sub-row">
        <text v-if="data.circleFree" class="circle-free">圈内免费</text>
        <text v-if="data.type === 'commerce' && data.productCount" class="goods">{{ data.productCount }}件好物</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.lc { overflow: hidden; border-radius: 20rpx; background: #ffffff; box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.08); }
.lc.is-live { animation: live-aura 2.8s ease-in-out infinite; }
.lc-press { transform: scale(0.98); }
.cover { position: relative; width: 100%; background: var(--surface-sunken); overflow: hidden; }
.r-169 { padding-bottom: 56.25%; }
.r-34 { padding-bottom: 133.33%; }
.cover-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.grad { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent 50%); }
.st-badge { position: absolute; top: 16rpx; right: 16rpx; z-index: 10; display: flex; align-items: center; gap: 6rpx; padding: 6rpx 12rpx; border-radius: 8rpx; }
.st-up { background: #4a90d9; }
.st-replay { background: rgba(0, 0, 0, 0.6); }
.st-txt { font-size: 20rpx; line-height: 1; color: #ffffff; font-weight: 500; white-space: nowrap; }
.live-scan { position: absolute; top: -20%; right: 0; left: 0; z-index: 4; height: 20%; pointer-events: none; background: linear-gradient(180deg, transparent, rgba(255,235,224,.18), transparent); animation: live-scan 4.2s ease-in-out infinite; }
.viewers { position: absolute; left: 16rpx; bottom: 16rpx; z-index: 10; display: flex; align-items: center; gap: 6rpx; padding: 6rpx 12rpx; border-radius: 8rpx; background: rgba(0, 0, 0, 0.5); }
.viewers-txt { font-size: 20rpx; line-height: 1; color: #ffffff; white-space: nowrap; }
.book-btn { position: absolute; right: 16rpx; bottom: 16rpx; z-index: 10; display: flex; align-items: center; gap: 6rpx; padding: 8rpx 18rpx; border-radius: 8rpx; }
.book-off { background: #4a90d9; }
.book-on { background: rgba(255, 255, 255, 0.2); border: 2rpx solid rgba(255, 255, 255, 0.3); }
.book-txt { font-size: 20rpx; line-height: 1; color: #ffffff; font-weight: 500; white-space: nowrap; }
.body { padding: 20rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 30rpx; font-weight: 500; color: #2c2c2c; line-height: 1.375; margin-bottom: 16rpx; }
.host { display: flex; align-items: center; gap: 12rpx; }
.avatar { width: 40rpx; height: 40rpx; border-radius: 999rpx; overflow: hidden; background: var(--surface-sunken); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-img { width: 100%; height: 100%; }
.avatar-ph { font-size: 18rpx; color: #666666; }
.host-name { flex: 1; font-size: 22rpx; color: #666666; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.price { flex-shrink: 0; font-size: 24rpx; font-weight: 700; line-height: 1; color: var(--danger); }
.free { flex-shrink: 0; font-size: 20rpx; font-weight: 500; line-height: 1; color: var(--success); padding: 4rpx 10rpx; border-radius: 8rpx; background: rgba(82, 196, 26, 0.1); }
.sub-row { display: flex; align-items: center; gap: 16rpx; margin-top: 12rpx; }
.circle-free { font-size: 20rpx; line-height: 1; color: var(--gold); padding: 4rpx 10rpx; border-radius: 8rpx; background: rgba(201, 169, 110, 0.1); white-space: nowrap; }
.goods { font-size: 20rpx; line-height: 1; color: #999999; white-space: nowrap; }
@keyframes live-aura {
  0%, 100% { box-shadow: 0 4rpx 24rpx rgba(0,0,0,.08), inset 0 0 0 1rpx rgba(196,30,58,.12); }
  50% { box-shadow: 0 8rpx 30rpx rgba(196,30,58,.18), inset 0 0 0 2rpx rgba(196,30,58,.32); }
}
@keyframes live-scan {
  0%, 18% { transform: translateY(0); opacity: 0; }
  28% { opacity: 1; }
  68% { opacity: .7; }
  82%, 100% { transform: translateY(600%); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .lc.is-live,
  .live-scan { animation: none; }
}
</style>
