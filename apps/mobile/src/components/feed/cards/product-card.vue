<script setup lang="ts">
/**
 * 商品卡 · 统一 3:4（1:1 商品图 cover 填满·居中裁剪绝不留白）· 左上「物」金印章 · price + hook「去看看 ›」
 * 去数字化：不显销量。
 */
import { computed, ref, watch } from 'vue'
import { formatPrice } from '@/utils/format'
import { type FeedEnvelope, payloadNum } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
// 封面加载失败(URL失效)时翻到「标题首字」占位，避免留空框；item 变化(列表复用)时重置
const imgError = ref(false)
watch(() => props.item?.cover, () => { imgError.value = false })
const hasCover = computed(() => !!(props.item.cover && props.item.cover.trim()) && !imgError.value)
const price = computed(() => payloadNum(props.item, 'price'))
</script>

<template>
  <view class="fcard">
    <view class="cov">
      <image v-if="hasCover" class="cov-img" :src="item.cover" mode="aspectFill" lazy-load @error="imgError = true" />
      <view v-else class="cov-img ph"><text class="ph-t">{{ item.title.charAt(0) }}</text></view>
      <text class="seal gold serif">物</text>
    </view>
    <view class="body">
      <text class="title">{{ item.title }}</text>
      <view class="meta">
        <text class="price"><text class="yuan">¥</text>{{ formatPrice(price) }}</text>
        <text class="hook">去看看 ›</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); }
.cov { position: relative; width: 100%; padding-top: 133.33%; overflow: hidden; background: #f6f1e7; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.ph { display: flex; align-items: center; justify-content: center; background: #f6f3ee; }
.ph-t { font-size: 60rpx; color: #d8d0c4; font-family: var(--font-serif, serif); }
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
.price { flex-shrink: 0; font-size: 30rpx; font-weight: 700; color: #c41e3a; }
.yuan { font-size: 20rpx; font-weight: 400; }
.hook { margin-left: auto; flex-shrink: 0; font-size: 22rpx; color: #8a6420; }
</style>
