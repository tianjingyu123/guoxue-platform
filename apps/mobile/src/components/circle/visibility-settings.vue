<script setup lang="ts">
/**
 * 可见范围 + 付费设置（深色表单块，从原型 components/content/visibility-settings.tsx 迁移）
 * 供发布页/课程发布等复用。v-model 经 props + emit 双向。
 */
import AppIcon from '@/components/common/app-icon.vue'

export type Visibility = 'circle_only' | 'platform_wide'
export type PaymentType = 'free' | 'paid' | 'member_free'

const props = withDefaults(defineProps<{
  visibility: Visibility
  paymentType: PaymentType
  price: number
  priceError?: string
  contentType?: 'article' | 'course' | 'post' | 'live'
}>(), {
  contentType: 'article',
})

const emit = defineEmits<{
  (e: 'update:visibility', v: Visibility): void
  (e: 'update:paymentType', v: PaymentType): void
  (e: 'update:price', v: number): void
}>()

const labelMap = { article: '阅读', course: '学习', post: '查看', live: '观看' }
const contentLabel = () => labelMap[props.contentType]

function onPriceInput(e: any) {
  emit('update:price', parseFloat(e.detail.value) || 0)
}
</script>

<template>
  <view class="vs">
    <!-- 可见范围 -->
    <view class="vs-block">
      <text class="vs-label">可见范围</text>
      <view class="vs-grid2">
        <view class="vs-card" :class="{ on: visibility === 'circle_only' }" @tap="emit('update:visibility', 'circle_only')">
          <view class="vs-card-icon" :class="{ on: visibility === 'circle_only' }"><app-icon name="lock" :size="28" :color="visibility === 'circle_only' ? '#ffffff' : 'rgba(255,255,255,0.6)'" /></view>
          <text class="vs-card-title" :class="{ on: visibility === 'circle_only' }">仅圈内可见</text>
          <text class="vs-card-desc">仅圈子成员可查看</text>
        </view>
        <view class="vs-card" :class="{ on: visibility === 'platform_wide' }" @tap="emit('update:visibility', 'platform_wide')">
          <view class="vs-card-icon" :class="{ on: visibility === 'platform_wide' }"><app-icon name="globe" :size="28" :color="visibility === 'platform_wide' ? '#ffffff' : 'rgba(255,255,255,0.6)'" /></view>
          <text class="vs-card-title" :class="{ on: visibility === 'platform_wide' }">全平台可见</text>
          <text class="vs-card-desc">所有用户可发现查看</text>
        </view>
      </view>
    </view>

    <!-- 付费设置 -->
    <view class="vs-block">
      <text class="vs-label">付费设置</text>
      <view class="vs-pay-list">
        <!-- 免费 -->
        <view class="vs-pay" :class="{ on: paymentType === 'free' }" @tap="emit('update:paymentType', 'free')">
          <view class="vs-pay-icon free" :class="{ on: paymentType === 'free' }"><text class="vs-pay-icon-t">免</text></view>
          <view class="vs-pay-main">
            <text class="vs-pay-title" :class="{ on: paymentType === 'free' }">免费</text>
            <text class="vs-pay-desc">所有人免费{{ contentLabel() }}</text>
          </view>
          <view v-if="paymentType === 'free'" class="vs-check"><app-icon name="check" :size="20" color="#ffffff" /></view>
        </view>

        <!-- 付费（仅全平台可见） -->
        <view v-if="visibility === 'platform_wide'" class="vs-pay" :class="{ on: paymentType === 'paid' }" @tap="emit('update:paymentType', 'paid')">
          <view class="vs-pay-icon paid" :class="{ on: paymentType === 'paid' }"><app-icon name="coins" :size="26" :color="paymentType === 'paid' ? '#ffffff' : 'rgba(255,255,255,0.6)'" /></view>
          <view class="vs-pay-main">
            <text class="vs-pay-title" :class="{ on: paymentType === 'paid' }">付费</text>
            <text class="vs-pay-desc">所有人需付费{{ contentLabel() }}</text>
          </view>
          <view v-if="paymentType === 'paid'" class="vs-check"><app-icon name="check" :size="20" color="#ffffff" /></view>
        </view>

        <!-- 圈内免费（仅全平台可见） -->
        <view v-if="visibility === 'platform_wide'" class="vs-pay" :class="{ on: paymentType === 'member_free' }" @tap="emit('update:paymentType', 'member_free')">
          <view class="vs-pay-icon member" :class="{ on: paymentType === 'member_free' }"><app-icon name="users" :size="26" :color="paymentType === 'member_free' ? '#ffffff' : 'rgba(255,255,255,0.6)'" /></view>
          <view class="vs-pay-main">
            <text class="vs-pay-title" :class="{ on: paymentType === 'member_free' }">圈内免费</text>
            <text class="vs-pay-desc">圈子成员免费，非成员付费</text>
          </view>
          <view v-if="paymentType === 'member_free'" class="vs-check"><app-icon name="check" :size="20" color="#ffffff" /></view>
        </view>

        <!-- 价格输入 -->
        <view v-if="paymentType === 'paid' || paymentType === 'member_free'" class="vs-price">
          <text class="vs-price-label">{{ paymentType === 'member_free' ? '非圈子成员价格' : '价格' }}</text>
          <view class="vs-price-row">
            <text class="vs-price-symbol">¥</text>
            <input class="vs-price-input" type="digit" :value="price || ''" placeholder="0.00" @input="onPriceInput" />
          </view>
          <text v-if="priceError" class="vs-price-err">{{ priceError }}</text>
          <text class="vs-price-tip">{{ contentType === 'course' ? '建议定价：9.9-999元' : '建议定价：0.1-99元' }}</text>
        </view>
      </view>
    </view>
</template>

<style scoped lang="scss">
.vs { display: flex; flex-direction: column; gap: 32rpx; }
.vs-label { display: block; font-size: 28rpx; font-weight: 500; color: #fff; margin-bottom: 24rpx; }
.vs-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; }
.vs-card { padding: 28rpx; border-radius: 20rpx; border: 4rpx solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); }
.vs-card.on { border-color: #C41E3A; background: rgba(196,30,58,0.1); }
.vs-card-icon { width: 64rpx; height: 64rpx; border-radius: 14rpx; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 16rpx; }
.vs-card-icon.on { background: #C41E3A; }
.vs-card-title { display: block; font-size: 28rpx; font-weight: 500; color: #fff; }
.vs-card-title.on { color: #C41E3A; }
.vs-card-desc { display: block; font-size: 20rpx; color: rgba(255,255,255,0.5); margin-top: 8rpx; }
.vs-pay-list { display: flex; flex-direction: column; gap: 20rpx; }
.vs-pay { display: flex; align-items: center; gap: 20rpx; padding: 28rpx; border-radius: 20rpx; border: 4rpx solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); }
.vs-pay.on { border-color: #C41E3A; background: rgba(196,30,58,0.1); }
.vs-pay-icon { width: 72rpx; height: 72rpx; border-radius: 14rpx; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.vs-pay-icon.free.on { background: #52C41A; }
.vs-pay-icon.paid.on { background: #C9A96E; }
.vs-pay-icon.member.on { background: #1890FF; }
.vs-pay-icon-t { font-size: 32rpx; font-weight: 700; color: rgba(255,255,255,0.6); }
.vs-pay-icon.free.on .vs-pay-icon-t { color: #fff; }
.vs-pay-main { flex: 1; }
.vs-pay-title { display: block; font-size: 28rpx; font-weight: 500; color: rgba(255,255,255,0.8); }
.vs-pay-title.on { color: #fff; }
.vs-pay-desc { display: block; font-size: 22rpx; color: rgba(255,255,255,0.5); margin-top: 4rpx; }
.vs-check { width: 36rpx; height: 36rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.vs-price { margin-top: 12rpx; padding: 28rpx; background: rgba(255,255,255,0.05); border-radius: 20rpx; }
.vs-price-label { display: block; font-size: 28rpx; font-weight: 500; color: #fff; margin-bottom: 16rpx; }
.vs-price-row { display: flex; align-items: center; gap: 16rpx; }
.vs-price-symbol { font-size: 36rpx; font-weight: 700; color: #C9A96E; }
.vs-price-input { flex: 1; padding: 24rpx 28rpx; border-radius: 16rpx; border: 2rpx solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff; font-size: 36rpx; font-weight: 700; }
.vs-price-err { display: block; font-size: 22rpx; color: #C41E3A; margin-top: 16rpx; }
.vs-price-tip { display: block; font-size: 20rpx; color: rgba(255,255,255,0.4); margin-top: 16rpx; }
</style>
