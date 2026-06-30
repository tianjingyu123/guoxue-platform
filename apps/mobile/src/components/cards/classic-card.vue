<script setup lang="ts">
/** 古籍卡(feed,宣纸质感+印章)- 从原型 components/cards/classic-card.tsx 迁移 */
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { track } from '@/composables/useTrack'
import { type ClassicCardData, formatCount } from '@/lib/card-utils'

const props = defineProps<{ data: ClassicCardData }>()
function open() {
  track.click('classic_card', { id: props.data.id })
  navigateTo(`/classics/${props.data.id}`)
}
</script>

<template>
  <view class="card" hover-class="card-press" @tap="open">
    <!-- 印章装饰 -->
    <view class="seal"><text class="seal-txt">典藏</text></view>
    <view class="inner">
      <!-- 标签 -->
      <view class="tags">
        <text v-if="data.isFree" class="tag tag-free">免费</text>
        <view v-if="data.hasAudio" class="tag tag-audio"><AppIcon name="mic" :size="18" color="#ffffff" /><text>有声</text></view>
        <text v-if="data.dynasty" class="tag-dynasty">{{ data.dynasty }}代</text>
      </view>
      <!-- 书名区 -->
      <view class="title-area">
        <text class="book-title">{{ data.title }}</text>
        <text v-if="data.author" class="book-author">{{ data.author }} 著</text>
      </view>
      <!-- 底部 -->
      <text v-if="data.description" class="desc">{{ data.description }}</text>
      <view class="foot">
        <text v-if="data.readers" class="readers">{{ formatCount(data.readers) }}人阅读</text>
        <text v-else />
        <view class="read-btn"><AppIcon name="book-open" :size="22" color="#c41e3a" /><text class="read-txt">开始阅读</text></view>
      </view>
    </view>

  </view>
</template>

<style scoped lang="scss">
.card { position: relative; overflow: hidden; border-radius: 24rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05); margin-bottom: 12rpx; background: linear-gradient(135deg, #F8F4EC, #F5EFE3 50%, #EDE4D3); border: 2rpx solid rgba(212,196,168,0.5); }
.card-press { transform: scale(0.98); }
.seal { position: absolute; top: 20rpx; right: 20rpx; width: 72rpx; height: 72rpx; border: 4rpx solid rgba(196,30,58,0.3); border-radius: 8rpx; display: flex; align-items: center; justify-content: center; transform: rotate(12deg); }
.seal-txt { color: rgba(196,30,58,0.4); font-size: 20rpx; font-family: var(--font-serif); }
.inner { padding: 28rpx; }
.tags { display: flex; align-items: center; gap: 12rpx; }
.tag { font-size: 18rpx; padding: 2rpx 12rpx; border-radius: 8rpx; font-weight: 500; }
.tag-free { background: var(--success); color: #fff; }
.tag-audio { display: flex; align-items: center; gap: 4rpx; background: var(--brand); color: #fff; font-size: 18rpx; padding: 2rpx 12rpx; border-radius: 8rpx; font-weight: 500; }
.tag-dynasty { font-size: 20rpx; color: #8B6914; }
.title-area { display: flex; flex-direction: column; align-items: center; padding: 40rpx 0; }
.book-title { font-size: 44rpx; font-weight: 700; color: #2C1810; font-family: var(--font-serif); letter-spacing: 8rpx; }
.book-author { font-size: 26rpx; color: #5D4037; margin-top: 12rpx; }
.desc { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 24rpx; color: #8B7355; line-height: 1.6; }
.foot { display: flex; align-items: center; justify-content: space-between; margin-top: 20rpx; }
.readers { font-size: 22rpx; color: var(--text-soft); }
.read-btn { display: flex; align-items: center; gap: 4rpx; }
.read-txt { font-size: 24rpx; color: var(--brand); font-weight: 500; }
</style>
