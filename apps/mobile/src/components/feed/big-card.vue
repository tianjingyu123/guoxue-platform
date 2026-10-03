<script setup lang="ts">
/**
 * 16:9 内容大卡（董事长 2026-07-17 拍板：2:1 废弃·课程/直播封面原生 16:9 零裁切）
 * 仅支持 live/course 两类可升大卡；守卫在 feed-card（非 live/course 或无封面回退普通卡），
 * 本组件默认 item 已是合法大卡项。
 * 结构：16:9 封面（padding-top 56.25% · aspectFill · smart-cover 兜底）
 *      + 底部 40% 高深色渐变（transparent → rgba(0,0,0,.55)）
 *      + 标题 32rpx/600 白字两行 clamp 叠左下
 *      + 直播：真实画面 + 轻量扫描光 + 带呼吸灯的“直播中”角标
 *      + 课程：价格金黄右下角（免费显「免费」）
 * X5 安全：无 aspect-ratio（padding-top 撑比例）、无 backdrop-filter、动画只动 opacity。
 */
import { computed } from 'vue'
import SmartCover from '@/components/common/smart-cover.vue'
import LiveCardMedia from '@/components/live/live-card-media.vue'
import LiveStatusBadge from '@/components/live/live-status-badge.vue'
import { formatPrice } from '@/utils/format'
import { type FeedEnvelope, payloadNum, payloadBool, payloadStr } from '@/lib/feed-data'
import type { LiveStatus } from '@/lib/live-data'

const props = defineProps<{ item: FeedEnvelope }>()

const isLive = computed(() => props.item.type === 'live')
const liveStatus = computed<LiveStatus>(() => {
  const value = payloadStr(props.item, 'status')
  return value === 'live' || value === 'replay' || value === 'upcoming' ? value : 'live'
})
const replayUrl = computed(() => payloadStr(props.item, 'replayUrl') || '')
const isCourse = computed(() => props.item.type === 'course')
const price = computed(() => payloadNum(props.item, 'price'))
const isFree = computed(() => payloadBool(props.item, 'free') || price.value === 0)
/** smart-cover 兜底主题：按类型取色系（仅 live/course 两类） */
const coverType = computed(() => (isLive.value ? 'live' : 'course'))
</script>

<template>
  <view class="bigcard" :class="{ 'is-live': isLive && liveStatus === 'live' }">
    <view class="bc">
      <live-card-media
        v-if="isLive"
        :room-id="item.id"
        :cover="item.cover"
        :title="item.title"
        :status="liveStatus"
        :replay-url="replayUrl"
        class="bc-img"
      />
      <smart-cover v-else :src="item.cover" :title="item.title" :type="coverType" class="bc-img" />
      <view class="shade" />
    </view>
    <view v-if="isLive && liveStatus === 'live'" class="live-scan" />
    <live-status-badge v-if="isLive && liveStatus === 'live'" />
    <text v-else-if="isLive && liveStatus === 'upcoming'" class="state-tag">预约</text>
    <text v-else-if="isLive && liveStatus === 'replay'" class="state-tag">回放</text>
    <!-- 底部文字区：标题左下 + 课程价格右下 -->
    <view class="txt">
      <text class="h3">{{ item.title }}</text>
      <text v-if="isCourse && isFree" class="price">免费</text>
      <text v-else-if="isCourse" class="price"><text class="yuan">¥</text>{{ formatPrice(price) }}</text>
    </view>
  </view>
</template>

<style scoped>
.bigcard {
  position: relative;
  border-radius: 28rpx;
  overflow: hidden;
  background: #f6f1e7;
  box-shadow: 0 4rpx 20rpx rgba(60, 50, 40, 0.1);
}
.bigcard.is-live { animation: live-aura 2.8s ease-in-out infinite; }
/* 16:9：padding-top 56.25% 撑比例（X5 不用 aspect-ratio） */
.bc { position: relative; width: 100%; height: 0; padding-top: 56.25%; overflow: hidden; }
.bc-img { position: absolute; inset: 0; width: 100%; height: 100%; }
/* 底部 40% 高渐变蒙层：上透明 → 下 rgba(0,0,0,.55)，保障白字可读 */
.shade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 40%;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.55));
}
.state-tag { position: absolute; top: 20rpx; right: 20rpx; z-index: 3; padding: 6rpx 14rpx; border-radius: 8rpx; background: rgba(30,25,22,.66); color: #fff; font-size: 22rpx; }
.live-scan { position: absolute; top: -20%; right: 0; left: 0; z-index: 3; height: 20%; pointer-events: none; background: linear-gradient(180deg, transparent, rgba(255,235,224,.18), transparent); animation: live-scan 4.2s ease-in-out infinite; }
/* 底部文字行：标题占满左侧，价格贴右下 */
.txt {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: 20rpx;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
}
.h3 {
  flex: 1;
  min-width: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.4;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}
.price { flex-shrink: 0; font-size: 30rpx; font-weight: 700; color: #ffd98a; }
.yuan { font-size: 22rpx; }
@keyframes live-aura {
  0%, 100% { box-shadow: 0 4rpx 20rpx rgba(60,50,40,.1), inset 0 0 0 1rpx rgba(196,30,58,.12); }
  50% { box-shadow: 0 10rpx 32rpx rgba(196,30,58,.18), inset 0 0 0 2rpx rgba(196,30,58,.32); }
}
@keyframes live-scan {
  0%, 18% { transform: translateY(0); opacity: 0; }
  28% { opacity: 1; }
  68% { opacity: .7; }
  82%, 100% { transform: translateY(600%); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .bigcard.is-live,
  .live-scan { animation: none; }
}
</style>
