<template>
  <view class="page">
    <template v-if="!result"><view class="loading-wrap"><view class="loading-spinner" /></view></template>
    <template v-else>
      <view class="success-header">
        <view class="header-decorations">
          <view v-for="i in 6" :key="i" class="header-circle" :style="{ left: (20+i*15)+'%', top: (10+(i%3)*30)+'%', transform: 'scale('+(0.5+i*0.2)+')' }" />
        </view>
        <view class="header-content" :class="{ visible: showAnimation }">
          <view class="success-icon-wrap">
            <text class="success-icon">✓</text>
            <view class="success-ring" :class="{ ping: showAnimation }" />
          </view>
          <text class="success-title">拼团成功</text>
          <text class="success-desc">恭喜您，已成功拼团！</text>
        </view>
      </view>

      <view class="content-area">
        <view class="card product-card" :class="{ visible: showAnimation }">
          <view class="card-body">
            <image :src="result.productCover || ''" class="card-img" mode="aspectFill" />
            <view class="card-info">
              <text class="card-name">{{ result.productName }}</text>
              <view class="card-price-row">
                <text class="card-price">¥{{ result.price }}</text>
                <text class="card-original">¥{{ result.originalPrice }}</text>
                <text class="card-save">省¥{{ result.originalPrice - result.price }}</text>
              </view>
            </view>
          </view>
          <view class="card-members">
            <text class="members-label">成团成员</text>
            <view class="members-row">
              <view class="members-avatars"><image v-for="member in result.members" :key="member.id" :src="member.avatar || ''" class="member-avatar" mode="aspectFill" /></view>
              <text class="members-count">共{{ result.members.length }}人</text>
            </view>
          </view>
          <view class="card-time">
            <view class="time-row"><text class="time-label">成团时间</text><text class="time-value">{{ result.completedAt }}</text></view>
            <view class="time-row">
              <text class="time-label">订单编号</text>
              <view class="time-value-row"><text class="time-value">{{ result.orderId }}</text><text class="copy-btn" @click="handleCopy(result.orderId)">{{ copied ? '✓' : '📋' }}</text></view>
            </view>
          </view>
        </view>

        <view class="card shipping-card" :class="{ visible: showAnimation }">
          <view class="shipping-content">
            <view class="shipping-icon-wrap"><text class="shipping-icon">📦</text></view>
            <view class="shipping-info"><text class="shipping-title">预计发货时间</text><text class="shipping-desc">{{ result.estimatedShipDate }}（工作日）</text></view>
          </view>
        </view>

        <view class="card coupon-card" :class="{ visible: showAnimation }" @click="handleShare">
          <view class="coupon-content">
            <view class="coupon-left">
              <view class="coupon-icon-wrap"><text class="coupon-icon">🎁</text></view>
              <view class="coupon-text"><text class="coupon-title">分享得优惠券</text><text class="coupon-desc">邀请好友拼团，获10元优惠券</text></view>
            </view>
            <view class="coupon-btn"><text>↗</text><text>分享</text></view>
          </view>
        </view>

        <view class="actions" :class="{ visible: showAnimation }">
          <view class="btn-primary" @click="goOrder"><text>查看订单</text><text class="btn-arrow">›</text></view>
          <view class="btn-secondary" @click="goShop">继续逛逛</view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { api } from '../../api'

interface GroupBuyResult { id: string; productName: string; productCover: string; price: number; originalPrice: number; members: {id:string;name:string;avatar:string}[]; completedAt: string; orderId: string; estimatedShipDate: string }

const defaultResult: GroupBuyResult = { id:'1', productName:'周易六十四卦详解（精装典藏版）', productCover:'', price:128, originalPrice:298, members:[{id:'1',name:'张三',avatar:''},{id:'2',name:'李四',avatar:''},{id:'3',name:'王五',avatar:''}], completedAt:'2024-01-15 14:30:00', orderId:'GB202401150001', estimatedShipDate:'2024-01-17' }

const result = ref<GroupBuyResult | null>(null)
const copied = ref(false)
const showAnimation = ref(false)

function normalizeResult(raw: any, fallback: GroupBuyResult): GroupBuyResult {
  if (!raw) return { ...fallback }
  return {
    id: raw.id || fallback.id,
    productName: raw.productName || raw.product?.name || fallback.productName,
    productCover: raw.productCover || raw.product?.cover || '',
    price: raw.price ?? raw.product?.price ?? fallback.price,
    originalPrice: raw.originalPrice ?? raw.product?.originalPrice ?? fallback.originalPrice,
    members: raw.members || fallback.members,
    completedAt: raw.completedAt || raw.successTime || fallback.completedAt,
    orderId: raw.orderId || fallback.orderId,
    estimatedShipDate: raw.estimatedShipDate || raw.shipDate || fallback.estimatedShipDate,
  }
}

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.options || {}
  const groupBuyId = opts.groupBuyId || opts.id || ''
  const orderId = opts.orderId || ''

  try {
    const res = await api.get(`/marketing/group-buy/${groupBuyId || orderId}`)
    result.value = normalizeResult(res, { ...defaultResult, orderId: orderId || defaultResult.orderId, id: groupBuyId || defaultResult.id })
  } catch {
    result.value = { ...defaultResult, orderId: orderId || defaultResult.orderId, id: groupBuyId || defaultResult.id }
  }

  await nextTick()
  setTimeout(() => { showAnimation.value = true }, 100)
})

function handleCopy(text: string) { uni.setClipboardData({ data: text, success: () => { copied.value = true; setTimeout(() => { copied.value = false }, 2000) } }) }
function handleShare() { uni.share({ title: '拼团成功！', content: `我刚刚以${result.value?.price}元拼到了「${result.value?.productName}」，快来一起拼团吧！` }) }
function goOrder() { if (result.value) uni.navigateTo({ url: `/pages/orders/order-detail?id=${result.value.orderId}` }) }
function goShop() { uni.navigateTo({ url: '/pages/shop/shop' }) }
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; }
.loading-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.loading-spinner { width: 64rpx; height: 64rpx; border: 4rpx solid #E8E3DB; border-top-color: #C41E3A; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.success-header { background: linear-gradient(135deg, #22c55e, #16a34a); padding: 96rpx 32rpx 192rpx; text-align: center; position: relative; overflow: hidden; }
.header-decorations { position: absolute; inset: 0; opacity: 0.1; }
.header-circle { position: absolute; width: 256rpx; height: 256rpx; border: 4rpx solid rgba(255,255,255,0.2); border-radius: 50%; }
.header-content { position: relative; opacity: 0; transform: translateY(32rpx); transition: all 0.7s; }
.header-content.visible { opacity: 1; transform: translateY(0); }
.success-icon-wrap { width: 160rpx; height: 160rpx; background: #fff; border-radius: 50%; margin: 0 auto 32rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.15); position: relative; }
.success-icon { font-size: 96rpx; color: #22c55e; }
.success-ring { position: absolute; inset: 0; border-radius: 50%; border: 8rpx solid rgba(255,255,255,0.5); }
.success-ring.ping { animation: ping 1.5s ease-out 2; }
@keyframes ping { 75%,100% { transform: scale(1.5); opacity: 0; } }
.success-title { font-size: 40rpx; font-weight: bold; color: #fff; margin-bottom: 12rpx; }
.success-desc { font-size: 26rpx; color: rgba(255,255,255,0.8); }
.content-area { padding: 0 24rpx; margin-top: -128rpx; display: flex; flex-direction: column; gap: 24rpx; padding-bottom: 256rpx; }
.card { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); opacity: 0; transform: translateY(32rpx); transition: all 0.5s; }
.card.visible { opacity: 1; transform: translateY(0); }
.product-card { transition-delay: 0.2s; }
.card-body { display: flex; gap: 20rpx; padding: 32rpx; }
.card-img { width: 160rpx; height: 160rpx; border-radius: 16rpx; background: #f0f0f0; flex-shrink: 0; }
.card-info { flex: 1; min-width: 0; }
.card-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; display: block; margin-bottom: 12rpx; }
.card-price-row { display: flex; align-items: baseline; gap: 12rpx; flex-wrap: wrap; }
.card-price { font-size: 36rpx; font-weight: bold; color: #C41E3A; }
.card-original { font-size: 24rpx; color: #999; text-decoration: line-through; }
.card-save { padding: 4rpx 12rpx; background: #FEF3C7; color: #D97706; font-size: 20rpx; border-radius: 8rpx; }
.card-members { padding: 20rpx 32rpx; border-top: 2rpx solid #E8E3DB; display: flex; justify-content: space-between; align-items: center; }
.members-label { font-size: 26rpx; color: #666; }
.members-row { display: flex; align-items: center; gap: 12rpx; }
.members-avatars { display: flex; }
.member-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; border: 4rpx solid #fff; margin-left: -16rpx; background: #f0f0f0; }
.member-avatar:first-child { margin-left: 0; }
.members-count { font-size: 26rpx; color: #666; }
.card-time { padding: 20rpx 32rpx; border-top: 2rpx solid #E8E3DB; background: rgba(249,250,251,0.5); }
.time-row { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.time-row:last-child { margin-bottom: 0; }
.time-label { font-size: 24rpx; color: #999; }
.time-value { font-size: 24rpx; color: #666; }
.time-value-row { display: flex; align-items: center; gap: 8rpx; }
.copy-btn { font-size: 24rpx; color: #C41E3A; }
.shipping-card { transition-delay: 0.3s; }
.shipping-content { display: flex; align-items: center; gap: 20rpx; padding: 32rpx; }
.shipping-icon-wrap { width: 80rpx; height: 80rpx; background: #EFF6FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.shipping-icon { font-size: 36rpx; }
.shipping-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 4rpx; }
.shipping-desc { font-size: 26rpx; color: #666; }
.coupon-card { background: linear-gradient(to right, #F97316, #EF4444); transition-delay: 0.4s; }
.coupon-content { display: flex; align-items: center; justify-content: space-between; padding: 32rpx; }
.coupon-left { display: flex; align-items: center; gap: 20rpx; }
.coupon-icon-wrap { width: 80rpx; height: 80rpx; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.coupon-icon { font-size: 36rpx; color: #fff; }
.coupon-title { font-size: 28rpx; font-weight: 500; color: #fff; display: block; margin-bottom: 4rpx; }
.coupon-desc { font-size: 24rpx; color: rgba(255,255,255,0.8); }
.coupon-btn { padding: 14rpx 28rpx; background: #fff; border-radius: 50rpx; color: #F97316; font-size: 24rpx; font-weight: 500; display: flex; align-items: center; gap: 8rpx; }
.actions { display: flex; flex-direction: column; gap: 16rpx; opacity: 0; transform: translateY(32rpx); transition: all 0.5s; transition-delay: 0.5s; }
.actions.visible { opacity: 1; transform: translateY(0); }
.btn-primary { width: 100%; height: 96rpx; line-height: 96rpx; text-align: center; background: #C41E3A; color: #fff; border-radius: 16rpx; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8rpx; font-size: 30rpx; }
.btn-arrow { font-size: 32rpx; }
.btn-secondary { width: 100%; height: 96rpx; line-height: 96rpx; text-align: center; background: #fff; border: 2rpx solid #E8E3DB; color: #666; border-radius: 16rpx; font-weight: 500; font-size: 28rpx; }
</style>
