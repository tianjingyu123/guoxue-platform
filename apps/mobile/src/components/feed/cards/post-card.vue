<script setup lang="ts">
/**
 * 圈子帖卡 · 同文章卡（浮动比例）· 左下圈子名小胶囊 ·♥点赞
 * 无图降级同文摘卡（取正文首段）。
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { type FeedEnvelope, ratioPadding, formatCount, payloadStr } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const hasCover = computed(() => !!(props.item.cover && props.item.cover.trim()))
const pad = computed(() => ratioPadding(props.item.coverRatio || '4:3'))
const circleName = computed(() => payloadStr(props.item, 'circleName'))
const likeVal = computed(() => {
  const m = props.item.metric
  return m ? formatCount(m.value as number) : ''
})
const avatarChar = computed(() => (props.item.author?.name || '').charAt(0))
</script>

<template>
  <!-- 有图 -->
  <view v-if="hasCover" class="fcard">
    <view class="cov" :style="{ paddingTop: pad }">
      <smart-cover :src="item.cover" :title="item.title" type="default" class="cov-img" />
      <!-- 左下圈子名胶囊（圈子帖独有槽位） -->
      <text v-if="circleName" class="circle-tag">{{ circleName }}</text>
    </view>
    <view class="body">
      <text class="title serif">{{ item.title }}</text>
      <view class="meta">
        <view v-if="item.author?.avatar" class="ava"><image class="ava-img" :src="item.author.avatar" mode="aspectFill" /></view>
        <view v-else class="ava"><text class="ava-char">{{ avatarChar }}</text></view>
        <text class="name">{{ item.author?.name }}</text>
        <view class="metric"><app-icon name="heart" :size="22" color="#999999" /><text class="metric-t">{{ likeVal }}</text></view>
      </view>
    </view>
  </view>

  <!-- 无图降级：文摘态 -->
  <view v-else class="fcard digest">
    <text v-if="circleName" class="circle-tag-inline">{{ circleName }}</text>
    <view class="digest-q-wrap">
      <text class="digest-q serif">{{ item.subtitle || item.title }}</text>
    </view>
    <view class="digest-foot"><text class="digest-title">{{ item.title }}</text></view>
    <view class="body digest-body">
      <view class="meta">
        <view v-if="item.author?.avatar" class="ava"><image class="ava-img" :src="item.author.avatar" mode="aspectFill" /></view>
        <view v-else class="ava"><text class="ava-char">{{ avatarChar }}</text></view>
        <text class="name">{{ item.author?.name }}</text>
        <view class="metric"><app-icon name="heart" :size="22" color="#999999" /><text class="metric-t">{{ likeVal }}</text></view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(60,50,40,.06); }
.cov { position: relative; width: 100%; overflow: hidden; background: #f2efea; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.circle-tag {
  position: absolute; bottom: 16rpx; left: 16rpx;
  font-size: 20rpx; color: #fff; padding: 4rpx 14rpx; border-radius: 999rpx; background: rgba(0,0,0,.55);
}
.circle-tag-inline {
  display: inline-block; margin: 24rpx 28rpx 0;
  font-size: 20rpx; color: #8a8578; padding: 4rpx 14rpx; border-radius: 999rpx; background: rgba(201,169,110,.12);
}
.body { padding: 20rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; line-height: 1.45; font-weight: 700; color: #2c2c2c; }
.serif { font-family: var(--font-serif, 'STSong', serif); }
.meta { margin-top: 16rpx; display: flex; align-items: center; gap: 10rpx; }
.ava { width: 36rpx; height: 36rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; background: rgba(150,150,150,.18); display: flex; align-items: center; justify-content: center; }
.ava-img { width: 100%; height: 100%; }
.ava-char { font-size: 20rpx; color: #6e6e73; }
.name { flex: 1; min-width: 0; font-size: 24rpx; color: #6e6e73; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.metric { display: flex; align-items: center; gap: 4rpx; flex-shrink: 0; }
.metric-t { font-size: 22rpx; color: #999; }

.digest { background: #f6f1e7; border-top: 2rpx solid #e5dcc9; border-bottom: 2rpx solid #e5dcc9; }
.digest-q-wrap { padding: 24rpx 28rpx 12rpx; }
.digest-q { display: block; font-family: var(--font-serif, 'STSong', serif); font-size: 30rpx; line-height: 1.9; color: #4a4438; }
.digest-q::before { content: '「'; color: #c9a96e; }
.digest-q::after { content: '」'; color: #c9a96e; }
.digest-foot { padding: 0 28rpx; display: flex; justify-content: flex-end; }
.digest-title { font-size: 24rpx; color: #8a8578; font-family: var(--font-serif, 'STSong', serif); }
.digest-body { padding-top: 16rpx; }
</style>
