<script setup lang="ts">
/**
 * 短视频卡 · 统一 3:4（首帧 cover 填满）· 左上「视」朱红印章 · 右下时长角标（mm:ss ▶）
 * 去数字化：不显播放量，meta 右侧钩子（subtitle 或「看视频」）
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { type FeedEnvelope, payloadStr, formatDuration } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const duration = computed(() => formatDuration(payloadStr(props.item, 'duration')))
const videoUrl = computed(() => payloadStr(props.item, 'videoUrl'))
const hook = computed(() => props.item.subtitle || '看视频')
</script>

<template>
  <view class="fcard">
    <view class="cov">
      <smart-cover :src="item.cover" :video-url="videoUrl" :title="item.title" type="default" class="cov-img" />
      <view class="play-btn"><app-icon name="play" :size="34" color="#ffffff" :fill="true" /></view>
      <text class="seal serif">视</text>
      <!-- 右下时长角标 -->
      <text v-if="duration" class="badge br">{{ duration }} ▶</text>
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
.cov { position: relative; width: 100%; padding-top: 133.33%; overflow: hidden; background: #f6f1e7; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.play-btn {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 72rpx; height: 72rpx; border-radius: 999rpx; background: rgba(0,0,0,.38);
  display: flex; align-items: center; justify-content: center; z-index: 2;
}
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
.badge.br { right: 16rpx; bottom: 16rpx; }
.serif { font-family: var(--font-serif, 'STSong', serif); }
.body { padding: 18rpx 20rpx 22rpx; }
.title {
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
  font-size: 28rpx; line-height: 1.45; font-weight: 500; color: #2c2c2c;
}
.meta { margin-top: 16rpx; display: flex; align-items: center; gap: 10rpx; }
.ava { width: 36rpx; height: 36rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; background: rgba(150,150,150,.18); display: flex; align-items: center; justify-content: center; }
.ava-img { width: 100%; height: 100%; }
.ava-char { font-size: 20rpx; color: #6e6e73; }
.name { flex: 1; min-width: 0; font-size: 22rpx; color: #9a9184; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hook { flex-shrink: 0; font-size: 22rpx; color: #8a6420; }
</style>
