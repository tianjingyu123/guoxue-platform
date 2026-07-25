<script setup lang="ts">
/** 全平台商品卡：与首页/发现页统一为 1:1 首图 + 真实销售信息区。 */
import { computed } from 'vue'
import { navigateToContent } from '@/utils/router'
import SmartCover from '@/components/common/smart-cover.vue'
import { type ProductCardData } from '@/lib/card-utils'
import { formatPrice } from '@/utils/format'

const props = defineProps<{ data: ProductCardData }>()
const saving = computed(() => {
  const price = Number(props.data.price || 0)
  const original = Number(props.data.originalPrice || 0)
  return original > price ? original - price : 0
})
function open(event?: unknown) { navigateToContent(`/mall/product/${props.data.id}`, event) }
</script>

<template>
  <view class="card sales-card" data-content-card hover-class="card-press" @tap="open">
    <view class="cover">
      <smart-cover class="cover-img" :src="data.cover" :title="data.title" type="product" />
      <text v-if="saving > 0" class="saving-badge">立省 ¥{{ formatPrice(saving) }}</text>
    </view>
    <view class="body">
      <view class="eyebrow">
        <text class="select-tag">{{ data.reason || (data.isOfficialSelfOwned ? '官方严选' : '严选好物') }}</text>
        <text v-for="tag in (data.tags || []).slice(0, 2)" :key="tag" class="benefit-tag">{{ tag }}</text>
      </view>
      <text class="title">{{ data.title }}</text>
      <text v-if="data.subtitle" class="subtitle">{{ data.subtitle }}</text>
      <view v-if="data.sales || (data.stock != null && data.stock > 0)" class="sales-proof">
        <text v-if="data.sales">已售 {{ data.sales }}</text>
        <text v-if="data.sales && data.stock != null && data.stock > 0" class="proof-dot">·</text>
        <text v-if="data.stock != null && data.stock > 0">现货</text>
      </view>
      <view class="foot">
        <view class="price-block">
          <text class="price-prefix">到手价</text>
          <text class="price"><text class="price-cny">¥</text>{{ formatPrice(data.price) }}</text>
          <text v-if="data.originalPrice && data.originalPrice > (data.price || 0)" class="price-orig">¥{{ formatPrice(data.originalPrice) }}</text>
        </view>
        <text class="buy">立即选购</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.card {
  overflow: hidden;
  margin-bottom: 12rpx;
  border: 2rpx solid rgba(201,169,110,.16);
  border-radius: 24rpx;
  background: #fff;
  box-shadow: 0 6rpx 20rpx rgba(74,54,30,.08);
  transition: transform .15s ease-out, opacity .15s ease-out;
}
.card-press { transform: scale(0.98); }
.cover { position: relative; width: 100%; background: var(--surface-sunken); overflow: hidden; }
.cover { padding-bottom: 100%; }
.cover-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.saving-badge {
  position: absolute; left: 14rpx; bottom: 14rpx;
  padding: 7rpx 12rpx; border-radius: 8rpx;
  background: rgba(196,30,58,.92); color: #fff;
  font-size: 20rpx; font-weight: 700;
  box-shadow: 0 4rpx 12rpx rgba(196,30,58,.22);
}
.body { padding: 18rpx 18rpx 20rpx; background: linear-gradient(180deg,#fff 0%,#fffcf7 100%); }
.eyebrow { min-height: 32rpx; display: flex; align-items: center; gap: 8rpx; overflow: hidden; }
.select-tag,.benefit-tag { flex-shrink: 0; padding: 3rpx 8rpx; border-radius: 6rpx; font-size: 18rpx; line-height: 1.3; }
.select-tag { color: #9d2b3d; background: #fff0f2; }
.benefit-tag { color: #7b6332; background: #f6eedf; }
.title {
  display: -webkit-box; overflow: hidden; margin-top: 10rpx;
  -webkit-box-orient: vertical; -webkit-line-clamp: 2;
  color: #2c2c2c; font-size: 28rpx; font-weight: 650; line-height: 1.4;
}
.subtitle {
  display: -webkit-box; overflow: hidden; margin-top: 8rpx;
  -webkit-box-orient: vertical; -webkit-line-clamp: 2;
  color: #8b8175; font-size: 21rpx; line-height: 1.45;
}
.sales-proof { display: flex; align-items: center; gap: 6rpx; margin-top: 10rpx; color: #9b8c78; font-size: 20rpx; }
.proof-dot { color: #c9a96e; }
.foot {
  display: flex; align-items: flex-end; gap: 8rpx;
  margin-top: 14rpx; padding-top: 14rpx; border-top: 2rpx solid #f3ece2;
}
.price-block { min-width: 0; display: flex; align-items: baseline; gap: 6rpx; flex-wrap: wrap; }
.price-prefix { width: 100%; color: #9d2b3d; font-size: 18rpx; line-height: 1; }
.price { flex-shrink: 0; color: #c41e3a; font-size: 31rpx; font-weight: 750; line-height: 1.1; }
.price-cny { font-size: 20rpx; font-weight: 400; }
.price-orig { color: #aaa096; font-size: 18rpx; text-decoration: line-through; }
.buy {
  flex-shrink: 0; margin-left: auto; padding: 9rpx 13rpx; border-radius: 999rpx;
  color: #fff; font-size: 20rpx; font-weight: 650;
  background: linear-gradient(135deg,#c41e3a,#a81730);
  box-shadow: 0 4rpx 12rpx rgba(196,30,58,.18);
}
</style>
