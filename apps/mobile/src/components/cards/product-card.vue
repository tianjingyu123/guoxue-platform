<script setup lang="ts">
/** 商城商品卡：只呈现发布数据，整卡为唯一跳转入口。 */
import { computed } from 'vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { type ProductCardData } from '@/lib/card-utils'
import { formatPrice } from '@/utils/format'
import { navigateToContent } from '@/utils/router'

const props = withDefaults(defineProps<{
  data: ProductCardData
  variant?: 'grid' | 'list'
}>(), { variant: 'grid' })

const hasPrice = computed(() => props.data.price != null && Number.isFinite(Number(props.data.price)))
const label = computed(() => props.data.isOfficialSelfOwned ? '官方自营' : props.data.isSelected ? '平台严选' : '')
const originalPrice = computed(() => {
  const value = Number(props.data.originalPrice)
  return hasPrice.value && Number.isFinite(value) && value > Number(props.data.price) ? value : null
})
const accessibilityLabel = computed(() => [
  `查看商品：${props.data.title}`,
  label.value,
  hasPrice.value ? `价格 ${formatPrice(props.data.price)} 元` : '详情查看价格',
  props.data.stock === 0 ? '暂时缺货' : '',
].filter(Boolean).join('，'))

function open(event?: unknown) { navigateToContent(`/mall/product/${props.data.id}`, event) }
function openOnKeyboard(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  open(event)
}
</script>

<template>
  <view
    class="product-card"
    :class="`product-card--${variant}`"
    data-content-card
    role="link"
    :aria-label="accessibilityLabel"
    tabindex="0"
    hover-class="card-press"
    @tap="open"
    @keydown="openOnKeyboard"
  >
    <view class="cover">
      <smart-cover class="cover-img" :src="data.cover" :title="data.title" type="product" />
      <text v-if="data.stock === 0" class="stock-badge">暂时缺货</text>
    </view>
    <view class="body">
      <text v-if="label" class="label">{{ label }}</text>
      <text class="title">{{ data.title }}</text>
      <text v-if="data.subtitle" class="subtitle">{{ data.subtitle }}</text>
      <view class="foot">
        <view class="price-line">
          <text v-if="hasPrice" class="price">¥{{ formatPrice(data.price) }}</text>
          <text v-else class="price-pending">查看价格</text>
          <text v-if="originalPrice != null" class="original-price">¥{{ formatPrice(originalPrice) }}</text>
        </view>
        <text v-if="data.sales" class="sales">已售 {{ data.sales }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.product-card {
  min-width: 0; overflow: hidden; box-sizing: border-box;
  border: 1rpx solid rgba(63, 48, 36, .1); border-radius: 22rpx;
  background: #fff; box-shadow: 0 5rpx 18rpx rgba(45, 36, 27, .05);
}
.card-press { transform: scale(.985); opacity: .94; }
.cover { position: relative; overflow: hidden; background: var(--surface-sunken); }
.cover-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.stock-badge { position: absolute; left: 12rpx; bottom: 12rpx; padding: 5rpx 12rpx; border-radius: 999rpx; background: rgba(35, 31, 28, .76); color: #fff; font-size: 19rpx; }
.body { min-width: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: 17rpx 18rpx 18rpx; }
.label { align-self: flex-start; margin-bottom: 8rpx; color: #a4273b; font-size: 20rpx; font-weight: 600; }
.title { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: #262320; font-size: 27rpx; font-weight: 650; line-height: 1.38; }
.subtitle { display: -webkit-box; overflow: hidden; margin-top: 5rpx; -webkit-box-orient: vertical; -webkit-line-clamp: 1; color: #827970; font-size: 21rpx; line-height: 1.4; }
.foot { display: flex; flex-direction: column; align-items: flex-start; gap: 5rpx; margin-top: auto; padding-top: 14rpx; }
.price-line { display: flex; align-items: baseline; gap: 8rpx; max-width: 100%; }
.price { color: #b9283f; font-size: 31rpx; font-weight: 750; white-space: nowrap; }
.price-pending { color: #625a52; font-size: 23rpx; }
.original-price { color: #a69d94; font-size: 19rpx; text-decoration: line-through; white-space: nowrap; }
.sales { color: #8d847b; font-size: 19rpx; }
.product-card--grid .cover { width: 100%; padding-top: 78%; }
.product-card--grid .body { min-height: 198rpx; }
.product-card--list { display: flex; min-height: 190rpx; }
.product-card--list .cover { width: 190rpx; flex-shrink: 0; }
.product-card--list .body { flex: 1; }
</style>
