<script setup lang="ts">
/**
 * 圈子帖卡 · 统一 3:4（cover 填满）· 左上「圈」朱红印章 · 左下圈名 badge（payload.circleName）
 * 去数字化：meta 右侧钩子「来聊两句 ›」
 * 无封面降级 → 宣纸文摘卡（同文章卡范式）
 */
import { computed } from 'vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { type FeedEnvelope, payloadStr } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const hasCover = computed(() => !!(props.item.cover && props.item.cover.trim()))
const circleName = computed(() => payloadStr(props.item, 'circleName'))
const avatarChar = computed(() => (props.item.author?.name || '').charAt(0))
</script>

<template>
  <!-- 有图 -->
  <view v-if="hasCover" class="fcard">
    <view class="cov">
      <smart-cover :src="item.cover" :title="item.title" type="circle" class="cov-img" />
      <text class="seal serif">圈</text>
      <text v-if="circleName" class="badge bl">{{ circleName }}</text>
    </view>
    <view class="body">
      <text class="title">{{ item.title }}</text>
      <view class="meta">
        <view v-if="item.author?.avatar" class="ava"><image class="ava-img" :src="item.author.avatar" mode="aspectFill" /></view>
        <view v-else class="ava"><text class="ava-char">{{ avatarChar }}</text></view>
        <text class="name">{{ item.author?.name }}</text>
        <text class="hook">来聊两句 ›</text>
      </view>
    </view>
  </view>

  <!-- 无图降级：宣纸文摘卡 -->
  <view v-else class="fcard digest">
    <text v-if="circleName" class="circle-inline">{{ circleName }}</text>
    <view class="digest-q-wrap">
      <text class="digest-q serif">{{ item.subtitle || item.title }}</text>
    </view>
    <view class="digest-body">
      <view class="meta">
        <view v-if="item.author?.avatar" class="ava"><image class="ava-img" :src="item.author.avatar" mode="aspectFill" /></view>
        <view v-else class="ava"><text class="ava-char">{{ avatarChar }}</text></view>
        <text class="name">{{ item.author?.name }}</text>
        <text class="hook">来聊两句 ›</text>
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
.badge.bl { left: 16rpx; bottom: 16rpx; max-width: 76%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.serif { font-family: var(--font-serif, 'STSong', serif); }
.body { padding: 18rpx 20rpx 22rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; line-height: 1.45; font-weight: 500; color: #2c2c2c; }
.meta { margin-top: 16rpx; display: flex; align-items: center; gap: 10rpx; }
.ava { width: 36rpx; height: 36rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; background: rgba(150,150,150,.18); display: flex; align-items: center; justify-content: center; }
.ava-img { width: 100%; height: 100%; }
.ava-char { font-size: 20rpx; color: #6e6e73; }
.name { flex: 1; min-width: 0; font-size: 22rpx; color: #9a9184; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hook { flex-shrink: 0; font-size: 22rpx; color: #8a6420; }

/* 文摘卡：宣纸衬底 + 金色左边线，自适应高度 */
.digest { background: #f6f1e7; }
.circle-inline {
  display: inline-block; margin: 24rpx 24rpx 0;
  font-size: 20rpx; color: #8a8578; padding: 4rpx 14rpx; border-radius: 999rpx; background: rgba(201,169,110,.12);
}
.digest-q-wrap { padding: 20rpx 24rpx 8rpx; }
.digest-q {
  display: block; font-family: var(--font-serif, 'STSong', serif);
  font-size: 30rpx; line-height: 1.9; color: #4a4438;
  border-left: 4rpx solid #c9a96e; padding-left: 20rpx;
}
.digest-body { padding: 8rpx 24rpx 22rpx; }
</style>
