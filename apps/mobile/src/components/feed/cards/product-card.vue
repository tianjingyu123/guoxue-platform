<script setup lang="ts">
/**
 * 商品卡 · 1:1 首图 + 销售信息区。
 * 只展示接口真实字段：原价/立省、销量、库存与商品标签均无数据则不编造。
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
const originalPrice = computed(() => payloadNum(props.item, 'originalPrice'))
const salesCount = computed(() => payloadNum(props.item, 'salesCount'))
const stock = computed(() => payloadNum(props.item, 'stock'))
const saving = computed(() => {
  if (price.value == null || originalPrice.value == null || originalPrice.value <= price.value) return 0
  return originalPrice.value - price.value
})
const tags = computed(() => {
  const value = props.item.payload?.tags
  return Array.isArray(value) ? value.map(String).filter(Boolean).slice(0, 2) : []
})
</script>

<template>
  <view class="fcard sales-card">
    <view class="cov">
      <image v-if="hasCover" class="cov-img" :src="item.cover" mode="aspectFill" lazy-load @error="imgError = true" />
      <view v-else class="cov-img ph">
        <text class="ph-kicker">商品图片待完善</text>
      </view>
      <view v-if="saving > 0" class="saving-badge"><text>立省 ¥{{ formatPrice(saving) }}</text></view>
    </view>
    <view class="body">
      <view class="eyebrow">
        <text class="select-tag">{{ item.reason || '平台严选' }}</text>
        <text v-for="tag in tags" :key="tag" class="benefit-tag">{{ tag }}</text>
      </view>
      <text class="title">{{ item.title }}</text>
      <text v-if="item.subtitle" class="subtitle">{{ item.subtitle }}</text>
      <view v-if="salesCount || (stock != null && stock > 0)" class="sales-proof">
        <text v-if="salesCount">已售 {{ salesCount }}</text>
        <text v-if="salesCount && stock != null && stock > 0" class="proof-dot">·</text>
        <text v-if="stock != null && stock > 0">现货</text>
      </view>
      <view class="meta">
        <view class="price-block">
          <text class="price-prefix">到手价</text>
          <text class="price"><text class="yuan">¥</text>{{ formatPrice(price) }}</text>
          <text v-if="originalPrice != null && originalPrice > (price || 0)" class="original">¥{{ formatPrice(originalPrice) }}</text>
        </view>
        <text class="hook">立即选购</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; border: 2rpx solid rgba(201,169,110,.16); box-shadow: 0 6rpx 20rpx rgba(74,54,30,.08); }
.cov { position: relative; width: 100%; padding-top: 100%; overflow: hidden; background: #f6f1e7; }
.cov-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.ph { display: flex; align-items: center; justify-content: center; background: linear-gradient(145deg,#f8f4ec,#eee5d8); }
.ph-kicker { font-size: 22rpx; color: #9a9184; letter-spacing: 2rpx; }
.saving-badge { position: absolute; left: 14rpx; bottom: 14rpx; padding: 7rpx 12rpx; border-radius: 8rpx; background: rgba(196,30,58,.92); color: #fff; font-size: 20rpx; font-weight: 700; box-shadow: 0 4rpx 12rpx rgba(196,30,58,.22); }
.body { padding: 18rpx 18rpx 20rpx; background: linear-gradient(180deg,#fff 0%,#fffcf7 100%); }
.eyebrow { min-height: 32rpx; display: flex; align-items: center; gap: 8rpx; overflow: hidden; }
.select-tag,.benefit-tag { flex-shrink: 0; padding: 3rpx 8rpx; border-radius: 6rpx; font-size: 18rpx; line-height: 1.3; }
.select-tag { color: #9d2b3d; background: #fff0f2; }
.benefit-tag { color: #7b6332; background: #f6eedf; }
.title { margin-top: 10rpx; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 28rpx; line-height: 1.4; font-weight: 650; color: #2c2c2c; }
.subtitle { margin-top: 8rpx; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 21rpx; line-height: 1.45; color: #8b8175; }
.sales-proof { margin-top: 10rpx; display: flex; align-items: center; gap: 6rpx; color: #9b8c78; font-size: 20rpx; }
.proof-dot { color: #c9a96e; }
.meta { margin-top: 14rpx; padding-top: 14rpx; border-top: 2rpx solid #f3ece2; display: flex; align-items: flex-end; gap: 8rpx; }
.price-block { min-width: 0; display: flex; align-items: baseline; gap: 6rpx; flex-wrap: wrap; }
.price-prefix { width: 100%; font-size: 18rpx; line-height: 1; color: #9d2b3d; }
.price { flex-shrink: 0; font-size: 31rpx; line-height: 1.1; font-weight: 750; color: #c41e3a; }
.yuan { font-size: 20rpx; font-weight: 400; }
.original { font-size: 18rpx; color: #aaa096; text-decoration: line-through; }
.hook { margin-left: auto; flex-shrink: 0; padding: 9rpx 13rpx; border-radius: 999rpx; font-size: 20rpx; font-weight: 650; color: #fff; background: linear-gradient(135deg,#c41e3a,#a81730); box-shadow: 0 4rpx 12rpx rgba(196,30,58,.18); }
</style>
