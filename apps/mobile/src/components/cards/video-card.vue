<script setup lang="ts">
/** 视频卡(feed,全图覆盖式)- 从原型 components/cards/video-card.tsx 迁移 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { navigateTo } from '@/utils/router'
import { track } from '@/composables/useTrack'
import { type VideoCardData, normalizeRatio, formatCount } from '@/lib/card-utils'

const props = defineProps<{ data: VideoCardData }>()
const ratio = computed(() => normalizeRatio(props.data.coverRatio))
function open() {
  track.click('video_card', { id: props.data.id })
  navigateTo(`/video/${props.data.id}`)
}
</script>

<template>
  <view class="card" hover-class="card-press" @tap="open">
    <view class="cover" :class="ratio === '1:1' ? 'r-sq' : 'r-34'">
      <smart-cover class="cover-img" :src="data.cover" :title="data.title" type="video" />
      <text class="type-badge">视频</text>
      <!-- 播放按钮 -->
      <view class="play"><AppIcon name="play" :size="40" color="#ffffff" :fill="true" /></view>
      <text v-if="data.duration" class="duration">{{ data.duration }}</text>
      <!-- 底部信息渐变层 -->
      <view class="info">
        <text class="title">{{ data.title }}</text>
        <view class="meta">
          <text class="author">@{{ data.author }}</text>
          <view class="likes"><AppIcon name="heart" :size="20" color="rgba(255,255,255,0.8)" /><text class="likes-txt">{{ formatCount(data.likes) }}</text></view>
        </view>
      </view>
    </view>

  </view>
</template>

<style scoped lang="scss">
.card { position: relative; overflow: hidden; background: var(--surface); border-radius: 24rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05); margin-bottom: 12rpx; }
.card-press { transform: scale(0.98); }
.cover { position: relative; width: 100%; background: var(--surface-sunken); overflow: hidden; }
.r-34 { padding-bottom: 133.33%; }
.r-sq { padding-bottom: 100%; }
.cover-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.type-badge { position: absolute; top: 16rpx; left: 16rpx; z-index: 10; font-size: 20rpx; padding: 2rpx 14rpx; border-radius: 999rpx; color: rgba(255,255,255,0.95); font-weight: 500; background: rgba(0,0,0,0.45); }
.play { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 96rpx; height: 96rpx; border-radius: 999rpx; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; }
.duration { position: absolute; bottom: 16rpx; right: 16rpx; padding: 2rpx 12rpx; border-radius: 8rpx; background: rgba(0,0,0,0.6); color: #fff; font-size: 20rpx; }
.info { position: absolute; left: 0; right: 0; bottom: 0; padding: 18rpx; padding-top: 64rpx; background: linear-gradient(to top, rgba(0,0,0,0.75), transparent); }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 26rpx; font-weight: 500; color: #fff; line-height: 1.4; }
.meta { display: flex; align-items: center; justify-content: space-between; margin-top: 12rpx; }
.author { font-size: 22rpx; color: rgba(255,255,255,0.8); max-width: 180rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.likes { display: flex; align-items: center; gap: 4rpx; }
.likes-txt { font-size: 22rpx; color: rgba(255,255,255,0.8); }
</style>
