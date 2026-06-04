<template>
  <view class="page">
    <!-- 红色顶部背景 -->
    <view class="fail-header">
      <view
        class="deco-circle"
        style="top:80rpx;right:80rpx;width:256rpx;height:256rpx"
      />
      <view
        class="deco-circle"
        style="top:160rpx;right:160rpx;width:160rpx;height:160rpx"
      />

      <view class="fail-icon-group">
        <view class="fail-ring" />
        <view class="fail-icon-wrap">
          <text class="fail-icon">
            ✕
          </text>
        </view>
      </view>

      <text class="fail-title">
        {{ failInfo.title }}
      </text>
      <view class="fail-amount">
        <text class="fail-amount-sign">
          ¥
        </text>
        <text class="fail-amount-num">
          {{ parseFloat(amountStr).toFixed(2) }}
        </text>
      </view>
    </view>

    <!-- 失败原因卡片 -->
    <view class="fail-card">
      <view class="fail-reason">
        <view class="reason-icon-wrap">
          <text class="reason-icon">
            {{ failInfo.icon }}
          </text>
        </view>
        <view class="reason-text">
          <text class="reason-title">
            {{ failInfo.title }}
          </text>
          <text class="reason-desc">
            {{ failInfo.desc }}
          </text>
        </view>
      </view>

      <view class="order-info">
        <view class="order-info-row">
          <text class="order-info-label">
            订单编号
          </text>
          <text class="order-info-value">
            {{ orderId || '—' }}
          </text>
        </view>
        <view class="order-info-row">
          <text class="order-info-label">
            失败时间
          </text>
          <text class="order-info-value">
            {{ currentTime }}
          </text>
        </view>
      </view>

      <view class="fail-actions">
        <view
          class="btn-retry"
          @click="retryPay"
        >
          <text class="btn-retry-icon">
            🔄
          </text>
          <text>重新支付</text>
        </view>
        <view
          class="btn-switch"
          @click="switchPay"
        >
          <text class="btn-switch-icon">
            💳
          </text>
          <text>换个方式支付</text>
        </view>
        <view
          class="btn-order"
          @click="goOrder"
        >
          <text class="btn-order-icon">
            🧾
          </text>
          <text>查看订单详情</text>
        </view>
      </view>
    </view>

    <!-- 温馨提示 -->
    <view class="tips-card">
      <view class="tips-content">
        <text class="tips-icon">
          ⚠
        </text>
        <view class="tips-text">
          <text class="tips-title">
            温馨提示
          </text>
          <text class="tips-item">
            • 请检查支付账户余额是否充足
          </text>
          <text class="tips-item">
            • 确保网络连接稳定后重试
          </text>
          <text class="tips-item">
            • 如多次失败，请尝试其他支付方式
          </text>
          <text class="tips-item">
            • 订单将保留30分钟，请尽快完成支付
          </text>
        </view>
      </view>
    </view>

    <!-- 返回商城 -->
    <view
      class="footer-link"
      @click="goShop"
    >
      返回商城首页
    </view>

    <view class="shake-keyframes" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { shopApi } from '../../api'

const failReasons: Record<string, { title: string; desc: string; icon: string }> = {
  insufficient_balance: { title: '余额不足', desc: '您的账户余额不足以完成本次支付', icon: '👛' },
  timeout: { title: '支付超时', desc: '支付时间已超过限制，请重新发起支付', icon: '🕐' },
  cancelled: { title: '支付已取消', desc: '您已取消本次支付', icon: '🚫' },
  network_error: { title: '网络异常', desc: '网络连接出现问题，请检查网络后重试', icon: '⚠' },
  default: { title: '支付失败', desc: '支付过程中出现问题，请稍后重试', icon: '⚠' },
}

const orderId = ref('')
const reason = ref('default')
const amountStr = ref('0')
const currentTime = ref('')

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.options || {}
  orderId.value = opts.orderId || ''
  reason.value = opts.reason || 'default'
  amountStr.value = opts.amount || '0'
  currentTime.value = new Date().toLocaleString('zh-CN')

  // 尝试从 API 获取真实订单信息补充失败原因和金额
  if (orderId.value) {
    try {
      const detail: any = await shopApi.orderDetail(orderId.value)
      if (detail) {
        amountStr.value = String(detail.actualAmount ?? detail.amount ?? amountStr.value)
        currentTime.value = detail.paidAt || detail.updatedAt || currentTime.value
      }
    } catch {
      // 静默失败，使用已有参数
    }
  }
})

const failInfo = computed(() => failReasons[reason.value] || failReasons.default)

function retryPay() { uni.navigateTo({ url: `/pages/shop/paying?orderId=${orderId.value}` }) }
function switchPay() { uni.navigateTo({ url: `/pages/shop/checkout?orderId=${orderId.value}` }) }
function goOrder() { uni.navigateTo({ url: `/pages/orders/order-detail?id=${orderId.value}` }) }
function goShop() { uni.navigateTo({ url: '/pages/shop/shop' }) }
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; padding-bottom: 120rpx; }

/* 顶部 */
.fail-header { background: linear-gradient(to bottom, #C41E3A, #E8534A); padding: 128rpx 32rpx 192rpx; position: relative; overflow: hidden; text-align: center; }
.deco-circle { position: absolute; border: 4rpx solid rgba(255,255,255,0.1); border-radius: 50%; }
.fail-icon-group { position: relative; display: inline-block; margin-bottom: 48rpx; }
.fail-ring { position: absolute; inset: 0; width: 192rpx; height: 192rpx; border-radius: 50%; background: rgba(255,255,255,0.2); }
.fail-icon-wrap { position: relative; width: 192rpx; height: 192rpx; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.15); }
.fail-icon { font-size: 96rpx; color: #C41E3A; font-weight: bold; }
.fail-title { font-size: 40rpx; font-weight: bold; color: #fff; margin-bottom: 16rpx; }
.fail-amount { color: rgba(255,255,255,0.9); }
.fail-amount-sign { font-size: 26rpx; }
.fail-amount-num { font-size: 60rpx; font-weight: bold; margin-left: 8rpx; }

/* 卡片 */
.fail-card { position: relative; z-index: 10; margin: -96rpx 24rpx 24rpx; background: #fff; border-radius: 24rpx; padding: 40rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); }
.fail-reason { display: flex; align-items: center; gap: 20rpx; padding-bottom: 24rpx; border-bottom: 2rpx solid #E8E3DB; }
.reason-icon-wrap { width: 96rpx; height: 96rpx; border-radius: 50%; background: #FEF2F2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.reason-icon { font-size: 40rpx; }
.reason-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 6rpx; }
.reason-desc { font-size: 24rpx; color: #999; }

.order-info { padding: 24rpx 0; display: flex; flex-direction: column; gap: 16rpx; }
.order-info-row { display: flex; justify-content: space-between; }
.order-info-label { font-size: 26rpx; color: #999; }
.order-info-value { font-size: 26rpx; color: #2C2C2C; font-family: monospace; }

.fail-actions { display: flex; flex-direction: column; gap: 16rpx; }
.btn-retry, .btn-switch, .btn-order { height: 88rpx; line-height: 88rpx; text-align: center; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; font-size: 28rpx; font-weight: 500; }
.btn-retry { background: linear-gradient(to right, #C41E3A, #E8534A); color: #fff; }
.btn-switch { background: #FAF8F5; color: #2C2C2C; }
.btn-order { color: #666; font-weight: normal; }

/* 温馨提示 */
.tips-card { margin: 0 24rpx 24rpx; background: #FFF7ED; border-radius: 16rpx; padding: 32rpx; }
.tips-content { display: flex; gap: 20rpx; }
.tips-icon { font-size: 36rpx; color: #F97316; flex-shrink: 0; margin-top: 4rpx; }
.tips-title { font-size: 28rpx; font-weight: 500; color: #C2410C; display: block; margin-bottom: 12rpx; }
.tips-item { font-size: 24rpx; color: #9A3412; line-height: 1.8; display: block; }

/* 底部 */
.footer-link { text-align: center; padding: 32rpx; color: #999; font-size: 26rpx; }
</style>
