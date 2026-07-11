<script setup lang="ts">
/**
 * 古籍卡 · 竖版仿真书封 3:4 · 左上「古籍」金标 · 共读xx人
 * 有扫描封面用真图；无封面用现成 FlatCover 仿真书封组件（题签逐字竖排·永不缺图）。
 */
import { computed } from 'vue'
import FlatCover from '@/components/classics/flat-cover.vue'
import { coverColorForBook } from '@/lib/classics-cover'
import { type FeedEnvelope, ratioPadding, formatCount } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const pad = computed(() => ratioPadding('3:4'))
const hasCover = computed(() => !!(props.item.cover && props.item.cover.trim()))
const coverColor = computed(() => coverColorForBook(props.item.title))
const readers = computed(() => {
  const m = props.item.metric
  if (m && (m.kind === 'readers' || m.kind === 'view')) return `共读${formatCount(m.value as number)}人`
  return props.item.subtitle || '附白话译注'
})
</script>

<template>
  <view class="fcard">
    <view class="cov" :style="{ paddingTop: pad }">
      <!-- 有扫描封面：真图；无图：FlatCover 仿真书封（自带 3:4，绝对定位铺满） -->
      <image v-if="hasCover" class="cov-img" :src="item.cover" mode="aspectFill" />
      <view v-else class="cov-img flat-wrap">
        <flat-cover :title="item.title" :footer="item.author?.name" :cover-color="coverColor" title-size="40rpx" />
      </view>
      <text class="seal gold">古籍</text>
    </view>
    <view class="body">
      <text class="title serif">{{ item.title }}</text>
      <view class="meta">
        <text class="readers">{{ readers }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(60,50,40,.06); }
.cov { position: relative; width: 100%; overflow: hidden; background: #f2efea; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.flat-wrap { display: flex; align-items: stretch; justify-content: center; }
/* FlatCover 内部按宽度撑 3:4，容器已固定 3:4，让其宽度撑满即等高铺满 */
.flat-wrap > :deep(.flat-cover) { width: 100%; }
.seal { position: absolute; top: 16rpx; left: 16rpx; font-size: 20rpx; color: #fff; font-weight: 500; padding: 4rpx 14rpx; border-radius: 999rpx; z-index: 2; }
.seal.gold { background: rgba(201,169,110,.95); }
.body { padding: 20rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; line-height: 1.45; font-weight: 700; color: #2c2c2c; }
.serif { font-family: var(--font-serif, 'STSong', serif); }
.meta { margin-top: 14rpx; display: flex; align-items: center; }
.readers { font-size: 22rpx; color: #999; }
</style>
