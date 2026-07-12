<script setup lang="ts">
/**
 * 直播卡 · 统一 3:4（cover 填满）· 左上「播」朱红印章 · LIVE 呼吸角标 · 左下状态 badge（正在讲…）
 * 去数字化：不显观看数，meta 右侧钩子「直播中」
 */
import { computed } from 'vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { type FeedEnvelope, payloadBool, payloadStr } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const isLive = computed(() => payloadBool(props.item, 'isLive'))
// 左下状态标：subtitle（「正在讲·香方配伍」）或缺省
const statusBadge = computed(() => props.item.subtitle || (isLive.value ? '正在直播' : '直播预告'))
const hook = computed(() => (isLive.value ? '直播中' : '看回放'))
const avatarChar = computed(() => (props.item.author?.name || '').charAt(0))
</script>

<template>
  <view class="fcard">
    <view class="cov">
      <smart-cover :src="item.cover" :title="item.title" type="live" class="cov-img" />
      <text class="seal serif">播</text>
      <!-- LIVE 呼吸角标 -->
      <view v-if="isLive" class="badge live"><view class="live-dot" /><text class="live-t">LIVE</text></view>
      <!-- 左下状态标 -->
      <text v-if="statusBadge" class="badge bl">{{ statusBadge }}</text>
    </view>
    <view class="body">
      <text class="title">{{ item.title }}</text>
      <view class="meta">
        <view v-if="item.author?.avatar" class="ava"><image class="ava-img" :src="item.author.avatar" mode="aspectFill" /></view>
        <view v-else class="ava"><text class="ava-char">{{ avatarChar }}</text></view>
        <text class="name">{{ item.author?.name }}</text>
        <text class="hook">{{ hook }} ›</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); }
.cov { position: relative; width: 100%; padding-top: 133.33%; overflow: hidden; background: #f6f1e7; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.seal {
  position: absolute; top: 16rpx; left: 16rpx; width: 44rpx; height: 44rpx; border-radius: 12rpx;
  background: rgba(196,30,58,.92); color: #fff; font-size: 24rpx; font-weight: 700;
  display: flex; align-items: center; justify-content: center; z-index: 3;
  font-family: var(--font-serif, 'STSong', serif);
}
.badge {
  position: absolute; font-size: 20rpx; color: #fff; background: rgba(20,15,10,.55);
  border-radius: 8rpx; padding: 4rpx 12rpx; z-index: 3;
}
.badge.bl { left: 16rpx; bottom: 16rpx; max-width: 70%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.badge.live {
  right: 16rpx; top: 16rpx; background: rgba(196,30,58,.92);
  display: flex; align-items: center; gap: 6rpx; padding: 4rpx 12rpx;
}
.live-dot { width: 10rpx; height: 10rpx; border-radius: 999rpx; background: #fff; animation: livePulse 1.6s ease-in-out infinite; }
.live-t { font-size: 20rpx; color: #fff; font-weight: 700; }
.serif { font-family: var(--font-serif, 'STSong', serif); }
.body { padding: 18rpx 20rpx 22rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; line-height: 1.45; font-weight: 500; color: #2c2c2c; }
.meta { margin-top: 16rpx; display: flex; align-items: center; gap: 10rpx; }
.ava { width: 36rpx; height: 36rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; background: rgba(150,150,150,.18); display: flex; align-items: center; justify-content: center; }
.ava-img { width: 100%; height: 100%; }
.ava-char { font-size: 20rpx; color: #6e6e73; }
.name { flex: 1; min-width: 0; font-size: 22rpx; color: #9a9184; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hook { flex-shrink: 0; font-size: 22rpx; color: #8a6420; }
@keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
</style>
