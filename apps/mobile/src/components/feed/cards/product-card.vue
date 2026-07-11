<script setup lang="ts">
/** 商品卡 · 白底商品图 1:1（等比完整置入·唯一允许补白）· 左上「好物」· ¥朱红加粗价 */
import { computed } from 'vue'
import { formatPrice } from '@/utils/format'
import { type FeedEnvelope, ratioPadding, payloadNum } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
// 商品固定 1:1 白底（电商惯例·完整不裁切）
const pad = computed(() => ratioPadding('1:1'))
const hasCover = computed(() => !!(props.item.cover && props.item.cover.trim()))
const price = computed(() => payloadNum(props.item, 'price'))
const originalPrice = computed(() => payloadNum(props.item, 'originalPrice'))
</script>

<template>
  <view class="fcard">
    <view class="cov" :style="{ paddingTop: pad }">
      <!-- 商品必须完整：等比缩放置入白底（aspectFit + 白底），非裁切 -->
      <image v-if="hasCover" class="cov-img fit" :src="item.cover" mode="aspectFit" />
      <view v-else class="cov-img ph"><text class="ph-t">{{ item.title.charAt(0) }}</text></view>
      <text class="seal gold">好物</text>
    </view>
    <view class="body">
      <text class="title">{{ item.title }}</text>
      <view class="foot">
        <view class="price-row">
          <text class="price"><text class="yuan">¥</text>{{ formatPrice(price) }}</text>
          <text v-if="originalPrice" class="origin">¥{{ formatPrice(originalPrice) }}</text>
        </view>
        <text v-if="item.author?.name" class="shop">{{ item.author.name }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(60,50,40,.06); }
.cov { position: relative; width: 100%; overflow: hidden; background: #fff; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.fit { background: #fff; }
.ph { display: flex; align-items: center; justify-content: center; background: #f6f3ee; }
.ph-t { font-size: 60rpx; color: #d8d0c4; font-family: var(--font-serif, serif); }
.seal { position: absolute; top: 16rpx; left: 16rpx; font-size: 20rpx; color: #fff; font-weight: 500; padding: 4rpx 14rpx; border-radius: 999rpx; }
.seal.gold { background: rgba(201,169,110,.95); }
.body { padding: 20rpx; }
.title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; line-height: 1.45; font-weight: 500; color: #2c2c2c; }
.foot { margin-top: 16rpx; display: flex; align-items: baseline; justify-content: space-between; gap: 12rpx; }
.price-row { display: flex; align-items: baseline; gap: 10rpx; min-width: 0; }
.price { font-size: 32rpx; font-weight: 700; color: #c41e3a; }
.yuan { font-size: 22rpx; font-weight: 400; }
.origin { font-size: 22rpx; color: #999; text-decoration: line-through; }
.shop { flex-shrink: 0; font-size: 22rpx; color: #999; max-width: 180rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
</style>
