<script setup lang="ts">
/**
 * 古籍卡 · 统一 3:4（2:3 书封 cover 填满）· 左上「籍」金印章 · hook「附白话译注」
 * 去数字化：不显共读人数。有扫描封面用真图；无封面用 FlatCover 仿真书封（永不缺图）。
 */
import { computed } from 'vue'
import FlatCover from '@/components/classics/flat-cover.vue'
import { coverColorForBook } from '@/lib/classics-cover'
import { type FeedEnvelope } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const hasCover = computed(() => !!(props.item.cover && props.item.cover.trim()))
const coverColor = computed(() => coverColorForBook(props.item.title))
</script>

<template>
  <view class="fcard">
    <view class="cov">
      <image v-if="hasCover" class="cov-img" :src="item.cover" mode="aspectFill" />
      <view v-else class="cov-img flat-wrap">
        <flat-cover :title="item.title" :footer="item.author?.name" :cover-color="coverColor" title-size="40rpx" />
      </view>
      <text class="seal gold serif">籍</text>
    </view>
    <view class="body">
      <text class="title serif">{{ item.title }}</text>
      <view class="meta">
        <text v-if="item.author?.name" class="name">{{ item.author.name }}</text>
        <text class="hook">附白话译注 ›</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); }
.cov { position: relative; width: 100%; padding-top: 133.33%; overflow: hidden; background: #f6f1e7; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.flat-wrap { display: flex; align-items: stretch; justify-content: center; }
.flat-wrap > :deep(.flat-cover) { width: 100%; }
.seal {
  position: absolute; top: 16rpx; left: 16rpx; width: 44rpx; height: 44rpx; border-radius: 12rpx;
  color: #fff; font-size: 24rpx; font-weight: 700;
  display: flex; align-items: center; justify-content: center; z-index: 3;
  font-family: var(--font-serif, 'STSong', serif);
}
.seal.gold { background: rgba(180,140,70,.92); }
.serif { font-family: var(--font-serif, 'STSong', serif); }
.body { padding: 18rpx 20rpx 22rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; line-height: 1.45; font-weight: 500; color: #2c2c2c; }
.meta { margin-top: 16rpx; display: flex; align-items: center; gap: 10rpx; }
.name { flex: 1; min-width: 0; font-size: 22rpx; color: #9a9184; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hook { flex-shrink: 0; margin-left: auto; font-size: 22rpx; color: #8a6420; }
</style>
