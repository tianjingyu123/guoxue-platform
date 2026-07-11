<script setup lang="ts">
/** 直播卡 · 封面 4:3 · 左上呼吸红点「直播中」动效 · 👁观看数 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { type FeedEnvelope, ratioPadding, formatCount, payloadBool } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const pad = computed(() => ratioPadding(props.item.coverRatio || '4:3'))
const isLive = computed(() => payloadBool(props.item, 'isLive'))
const viewers = computed(() => {
  const m = props.item.metric
  if (m && (m.kind === 'view' || m.kind === 'viewers')) return formatCount(m.value as number)
  return m ? String(m.value) : ''
})
const avatarChar = computed(() => (props.item.author?.name || '').charAt(0))
</script>

<template>
  <view class="fcard">
    <view class="cov" :style="{ paddingTop: pad }">
      <smart-cover :src="item.cover" :title="item.title" type="live" class="cov-img" />
      <!-- 左上呼吸红点「直播中」 -->
      <view v-if="isLive" class="live-tag">
        <view class="live-dot" /><text class="live-text">直播中</text>
      </view>
      <view v-else class="soon-tag"><text class="soon-text">预告</text></view>
      <!-- 观看数 -->
      <view v-if="viewers" class="viewers">
        <app-icon name="eye" :size="22" color="#ffffff" /><text class="viewers-t">{{ viewers }}</text>
      </view>
    </view>
    <view class="body">
      <text class="title">{{ item.title }}</text>
      <view class="meta">
        <view v-if="item.author?.avatar" class="ava"><image class="ava-img" :src="item.author.avatar" mode="aspectFill" /></view>
        <view v-else class="ava"><text class="ava-char">{{ avatarChar }}</text></view>
        <text class="name">{{ item.author?.name }}</text>
        <text class="status">{{ isLive ? '直播中' : '未开播' }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(60,50,40,.06); }
.cov { position: relative; width: 100%; overflow: hidden; background: #f2efea; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.live-tag {
  position: absolute; top: 16rpx; left: 16rpx;
  display: flex; align-items: center; gap: 8rpx;
  padding: 4rpx 14rpx; border-radius: 999rpx; background: #c41e3a;
}
.live-dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: #fff; animation: breathe 1.6s ease-in-out infinite; }
.live-text { font-size: 20rpx; color: #fff; font-weight: 700; }
.soon-tag { position: absolute; top: 16rpx; left: 16rpx; padding: 4rpx 14rpx; border-radius: 999rpx; background: rgba(0,0,0,.5); }
.soon-text { font-size: 20rpx; color: #fff; }
.viewers {
  position: absolute; bottom: 16rpx; right: 16rpx;
  display: flex; align-items: center; gap: 4rpx;
  padding: 4rpx 12rpx; border-radius: 8rpx; background: rgba(0,0,0,.5);
}
.viewers-t { font-size: 20rpx; color: #fff; }
.body { padding: 20rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; line-height: 1.45; font-weight: 500; color: #2c2c2c; }
.meta { margin-top: 16rpx; display: flex; align-items: center; gap: 10rpx; }
.ava { width: 36rpx; height: 36rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; background: rgba(150,150,150,.18); display: flex; align-items: center; justify-content: center; }
.ava-img { width: 100%; height: 100%; }
.ava-char { font-size: 20rpx; color: #6e6e73; }
.name { flex: 1; min-width: 0; font-size: 24rpx; color: #6e6e73; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.status { flex-shrink: 0; font-size: 22rpx; color: #c41e3a; }
@keyframes breathe { 0%, 100% { transform: scale(.75); opacity: .55; } 50% { transform: scale(1); opacity: 1; } }
</style>
