<template>
  <view class="pay-success" :class="{ verified: viewState === 'success' }">
    <view v-if="viewState === 'loading'" class="verify-state">
      <view class="verify-spinner" />
      <text class="verify-title">正在核验支付结果</text>
      <text class="verify-desc">请稍候，正在读取订单最新状态</text>
    </view>

    <view v-else-if="viewState === 'error'" class="verify-state">
      <view class="verify-mark">!</view>
      <text class="verify-title">暂时无法确认支付成功</text>
      <text class="verify-desc">{{ errorMessage }}</text>
      <view class="verify-actions">
        <view class="action-btn primary" @tap="goOrders">
          <app-icon name="shopping-bag" :size="36" color="#fff" />
          <text>查看订单</text>
        </view>
        <view class="action-btn ghost" @tap="goHome">
          <app-icon name="home" :size="36" color="#2C2C2C" />
          <text>返回首页</text>
        </view>
      </view>
      <text class="verify-help">若已完成付款，请稍后在订单中心刷新状态；请勿重复支付。</text>
    </view>

    <template v-else>
    <!-- 成功动画区域 -->
    <view class="hero" :style="{ paddingTop: 'calc(120rpx + var(--status-bar-height, 0px))' }">
      <!-- 品牌朱印「成」盖章入场（视觉签名批1·一屏仅此一枚·斜置于成功勾右上侧） -->
      <view class="hero-seal">
        <brand-seal chars="成" :size="120" variant="zhu" stamped />
      </view>
      <view class="check-wrap" :class="{ show: showAnim }">
        <view class="check-bg" />
        <view class="check-icon" :class="{ show: showAnim }">
          <app-icon name="check-circle" :size="96" color="#4CAF50" />
        </view>
        <view class="check-ripple" :class="{ show: showAnim }" />
      </view>
      <text class="hero-title" :class="{ show: showAnim }">支付成功</text>
      <view class="hero-amount" :class="{ show: showAnim }">
        <text class="amt">¥{{ orderInfo.amount.toFixed(2) }}</text>
        <text class="amt-desc">{{ orderInfo.payMethod }} · {{ orderInfo.itemCount }}件商品</text>
      </view>
    </view>

    <!-- 白色卡片区域 -->
    <view class="sheet">
      <!-- 订单信息卡片 -->
      <view class="info-card" :class="{ show: showAnim }">
        <view class="info-row bordered">
          <text class="info-label">订单编号</text>
          <view class="info-right">
            <text class="info-value">{{ orderInfo.orderId }}</text>
            <view class="copy-btn" @tap="handleCopy">
              <app-icon name="copy" :size="28" color="#C41E3A" />
              <text class="copy-text">{{ copied ? '已复制' : '复制' }}</text>
            </view>
          </view>
        </view>
        <view class="info-row bordered">
          <text class="info-label">支付方式</text>
          <text class="info-value">{{ orderInfo.payMethod }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">支付时间</text>
          <text class="info-value">{{ orderInfo.paidAt }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="actions" :class="{ show: showAnim }">
        <view class="action-btn primary" @tap="goOrder">
          <app-icon name="shopping-bag" :size="36" color="#fff" />
          <text>查看订单</text>
        </view>
        <view class="action-btn ghost" @tap="goHome">
          <app-icon name="home" :size="36" color="#2C2C2C" />
          <text>返回首页</text>
        </view>
      </view>

      <!-- 推荐入口 -->
      <view class="recommend" :class="{ show: showAnim }">
        <text class="rec-title">猜你喜欢</text>
        <view class="rec-card" @tap="goShop">
          <view class="rec-icon"><app-icon name="gift" :size="36" color="#fff" /></view>
          <view class="rec-info">
            <text class="rec-name">更多好物</text>
            <text class="rec-desc">发现更多国学精品</text>
          </view>
          <app-icon name="chevron-right" :size="36" color="#999999" />
        </view>
      </view>

      <view class="bottom-tip">
        <text>如有问题请联系客服</text>
        <text class="tip2">感谢您的支持，祝您学习愉快！</text>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import BrandSeal from '@/components/common/brand-seal.vue'
import { navigateTo, reLaunch } from '@/utils/router'
import { shopApi } from '@/lib/shop-data'

const orderInfo = reactive({
  orderId: '',
  amount: 0,
  payMethod: '在线支付',
  paidAt: '',
  itemCount: 1,
})
const copied = ref(false)
const showAnim = ref(false)
const submitting = ref(false)
const viewState = ref<'loading' | 'success' | 'error'>('loading')
const errorMessage = ref('')

onLoad(async (q) => {
  orderInfo.orderId = String(q?.orderId || '').trim()
  if (!orderInfo.orderId) {
    viewState.value = 'error'
    errorMessage.value = '缺少订单信息，无法核验支付结果。'
    return
  }
  try {
    // 同一次订单查询同时返回摘要和真实状态，只有已支付状态才能进入成功页。
    const s = await shopApi.getOrderSummary(orderInfo.orderId)
    if (!s.paid) {
      viewState.value = 'error'
      errorMessage.value = '订单尚未支付完成，请到订单中心查看最新状态。'
      return
    }
    orderInfo.orderId = s.orderId
    orderInfo.amount = s.amount
    orderInfo.payMethod = s.payMethod
    orderInfo.paidAt = s.paidAt || '支付时间待同步'
    orderInfo.itemCount = s.itemCount
    viewState.value = 'success'
    setTimeout(() => { showAnim.value = true }, 100)
  } catch (e) {
    console.warn('[pay-success] 支付结果核验失败', e)
    viewState.value = 'error'
    errorMessage.value = '订单状态查询失败，请到订单中心确认后再继续。'
  }
})

function handleCopy() {
  if (copied.value || !orderInfo.orderId) return
  uni.setClipboardData({
    data: orderInfo.orderId,
    success: () => {
      copied.value = true
      setTimeout(() => { copied.value = false }, 2000)
    },
  })
}
function goOrder() {
  if (submitting.value) return
  submitting.value = true
  // 走订单详情真路由 /orders/:id（原 /shop/orders/:id 无映射为死链）
  navigateTo(`/orders/${orderInfo.orderId}`)
  setTimeout(() => { submitting.value = false }, 500)
}
function goOrders() {
  if (submitting.value) return
  submitting.value = true
  navigateTo('/orders')
  setTimeout(() => { submitting.value = false }, 500)
}
function goHome() {
  if (submitting.value) return
  submitting.value = true
  reLaunch('/')
}
function goShop() {
  if (submitting.value) return
  submitting.value = true
  navigateTo('/mall')
  setTimeout(() => { submitting.value = false }, 500)
}
</script>

<style lang="scss" scoped>
.pay-success {
  min-height: 100vh;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  overflow-x: hidden;
  background: #FAF8F5;
}
.pay-success.verified {
  background: linear-gradient(180deg, #4CAF50 0%, #45a049 100%);
}
.hero {
  position: relative;
  padding-bottom: 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
/* 朱印定位：成功勾右侧留白处，微斜似手工钤印；旋转放外层容器，
   不与内层 seal-stamp-in 的 transform 动画互相覆盖 */
.hero-seal {
  position: absolute;
  right: 64rpx;
  top: calc(96rpx + var(--status-bar-height, 0px));
  transform: rotate(9deg);
  z-index: 1;
}
.check-wrap {
  position: relative;
  width: 192rpx;
  height: 192rpx;
  margin-bottom: 48rpx;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.5s;
  &.show { opacity: 1; transform: scale(1); }
}
.check-bg {
  position: absolute;
  inset: 0;
  background: #FFFFFF;
  border-radius: 50%;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.15);
}
.check-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: scale(0);
  transition: all 0.7s 0.3s;
  &.show { transform: scale(1); }
}
.check-ripple {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 8rpx solid rgba(255,255,255,0.3);
  transform: scale(1);
  opacity: 1;
  transition: all 1s;
  &.show { transform: scale(1.5); opacity: 0; }
}
.hero-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #FFFFFF;
  margin-bottom: 16rpx;
  opacity: 0;
  transform: translateY(16rpx);
  transition: all 0.5s 0.2s;
  &.show { opacity: 1; transform: translateY(0); }
}
.hero-amount {
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0;
  transform: translateY(16rpx);
  transition: all 0.5s 0.3s;
  &.show { opacity: 1; transform: translateY(0); }
}
.amt { font-size: 72rpx; font-weight: bold; color: #FFFFFF; line-height: 1.2; }
.amt-desc { font-size: 26rpx; color: rgba(255,255,255,0.8); margin-top: 8rpx; }
.sheet {
  background: #FAF8F5;
  border-radius: 48rpx 48rpx 0 0;
  min-height: 60vh;
  padding: 32rpx;
}
.info-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 0 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
  opacity: 0;
  transform: translateY(16rpx);
  transition: all 0.5s 0.4s;
  &.show { opacity: 1; transform: translateY(0); }
}
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  &.bordered { border-bottom: 1rpx solid #E8E3DB; }
}
.info-label { flex-shrink: 0; font-size: 28rpx; color: #666666; }
.info-right { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: flex-end; gap: 16rpx; }
.info-value {
  display: block;
  min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 28rpx; color: #2C2C2C; font-weight: 500; text-align: right;
}
.info-right .info-value { flex: 1; }
.info-value :deep(span) {
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.copy-btn { flex-shrink: 0; display: flex; align-items: center; gap: 6rpx; }
.copy-text { font-size: 24rpx; color: var(--brand); }
.actions {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 48rpx;
  opacity: 0;
  transform: translateY(16rpx);
  transition: all 0.5s 0.5s;
  &.show { opacity: 1; transform: translateY(0); }
}
.action-btn {
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 500;
  &.primary { background: var(--brand); color: #FFFFFF; }
  &.ghost { background: #FFFFFF; border: 1rpx solid #E8E3DB; color: #2C2C2C; }
}
.recommend {
  opacity: 0;
  transform: translateY(16rpx);
  transition: all 0.5s 0.6s;
  &.show { opacity: 1; transform: translateY(0); }
}
.rec-title { display: block; font-size: 26rpx; color: #666666; margin-bottom: 20rpx; }
.rec-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.rec-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, var(--brand), #e85a6b);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rec-info { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.rec-name { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.rec-desc { font-size: 24rpx; color: #999999; }
.bottom-tip {
  margin-top: 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.bottom-tip text { font-size: 22rpx; color: #999999; }
.verify-state {
  min-height: 100vh;
  box-sizing: border-box;
  padding: calc(180rpx + var(--status-bar-height, 0px)) 48rpx 80rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.verify-spinner {
  width: 72rpx;
  height: 72rpx;
  border: 6rpx solid #eadfe0;
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: verify-spin .8s linear infinite;
}
.verify-mark {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: #fff1f2;
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64rpx;
  font-weight: 700;
  font-family: Georgia, serif;
}
.verify-title {
  margin-top: 36rpx;
  font-size: 36rpx;
  font-weight: 700;
  color: #2C2C2C;
}
.verify-desc {
  margin-top: 20rpx;
  max-width: 600rpx;
  font-size: 28rpx;
  color: #6E6E73;
  line-height: 1.7;
}
.verify-actions { width: 100%; margin-top: 56rpx; display: flex; flex-direction: column; gap: 24rpx; }
.verify-help { margin-top: 32rpx; font-size: 24rpx; color: #999; line-height: 1.6; }
@keyframes verify-spin { to { transform: rotate(360deg); } }
</style>
