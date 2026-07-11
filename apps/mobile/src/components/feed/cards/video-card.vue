<script setup lang="ts">
/** 短视频卡 · 首帧竖图 3:4 · 右上时长胶囊 · ▶播放量 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import {
  type FeedEnvelope,
  ratioPadding,
  formatCount,
  payloadStr,
} from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const pad = computed(() => ratioPadding(props.item.coverRatio || '3:4'))
const duration = computed(() => payloadStr(props.item, 'duration'))
const metricVal = computed(() => {
  const m = props.item.metric
  if (m && (m.kind === 'play' || m.kind === 'view')) return formatCount(m.value as number)
  return m ? String(m.value) : ''
})
const avatarChar = computed(() => (props.item.author?.name || '').charAt(0))
</script>

<template>
  <view class="fcard">
    <view class="cov" :style="{ paddingTop: pad }">
      <smart-cover :src="item.cover" :title="item.title" type="default" class="cov-img" />
      <!-- 播放遮罩按钮 -->
      <view class="play-btn"><app-icon name="play" :size="36" color="#ffffff" :fill="true" /></view>
      <!-- 右上时长胶囊（深底白字） -->
      <text v-if="duration" class="dur">{{ duration }}</text>
    </view>
    <view class="body">
      <text class="title">{{ item.title }}</text>
      <view class="meta">
        <view v-if="item.author?.avatar" class="ava"><image class="ava-img" :src="item.author.avatar" mode="aspectFill" /></view>
        <view v-else class="ava"><text class="ava-char">{{ avatarChar }}</text></view>
        <text class="name">{{ item.author?.name }}</text>
        <view class="metric"><app-icon name="play" :size="22" color="#999999" :fill="true" /><text class="metric-t">{{ metricVal }}</text></view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(60,50,40,.06); }
.cov { position: relative; width: 100%; overflow: hidden; background: #f2efea; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.play-btn {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 76rpx; height: 76rpx; border-radius: 999rpx; background: rgba(0,0,0,.38);
  display: flex; align-items: center; justify-content: center;
}
.dur {
  position: absolute; top: 16rpx; right: 16rpx;
  font-size: 20rpx; color: #fff; padding: 4rpx 12rpx; border-radius: 999rpx; background: rgba(0,0,0,.6);
}
.body { padding: 20rpx; }
.title {
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
  font-size: 28rpx; line-height: 1.45; font-weight: 500; color: #2c2c2c;
}
.meta { margin-top: 16rpx; display: flex; align-items: center; gap: 10rpx; }
.ava { width: 36rpx; height: 36rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; background: rgba(150,150,150,.18); display: flex; align-items: center; justify-content: center; }
.ava-img { width: 100%; height: 100%; }
.ava-char { font-size: 20rpx; color: #6e6e73; }
.name { flex: 1; min-width: 0; font-size: 24rpx; color: #6e6e73; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.metric { display: flex; align-items: center; gap: 4rpx; flex-shrink: 0; }
.metric-t { font-size: 22rpx; color: #999; }
</style>
