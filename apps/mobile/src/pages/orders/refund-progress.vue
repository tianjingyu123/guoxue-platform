<template>
  <view class="page">
    <view class="header">
      <view class="header-inner">
        <text
          class="back-btn"
          @click="goBack"
        >
          ‹
        </text>
        <text class="header-title">
          退款进度
        </text>
        <view style="width:60rpx" />
      </view>
    </view>

    <view
      v-if="loading"
      class="loading-skeleton"
    >
      <view
        v-for="i in 3"
        :key="i"
        class="s-card"
      />
    </view>

    <template v-else-if="refund">
      <!-- 退款金额卡片 -->
      <view class="amount-card">
        <view class="ac-top">
          <text class="ac-icon">
            💰
          </text><text class="ac-label">
            退款金额
          </text>
        </view>
        <text class="ac-amount">
          ¥{{ (refund.amount || 0).toFixed(2) }}
        </text>
        <text class="ac-method">
          退款方式：原路退回
        </text>
        <view
          v-if="refund.status === 'refunding'"
          class="ac-eta"
        >
          <text>🕐</text><text>预计 3个工作日内 到账</text>
        </view>
        <view
          v-if="refund.status === 'completed'"
          class="ac-done"
        >
          <text>✅</text><text>退款已到账</text>
        </view>
      </view>

      <!-- 进度时间轴 -->
      <view class="timeline-card">
        <text class="tl-title">
          退款进度
        </text>
        <view class="timeline">
          <view
            v-for="(s, idx) in steps"
            :key="idx"
            class="tl-item"
            :class="{ completed: idx < currentStepIndex, current: idx === currentStepIndex, pending: idx > currentStepIndex }"
          >
            <view class="tl-dot-row">
              <view
                class="tl-dot"
                :class="{ completed: idx < currentStepIndex, current: idx === currentStepIndex }"
              >
                <text v-if="idx < currentStepIndex">
                  ✓
                </text>
                <text v-else-if="idx === currentStepIndex">
                  🕐
                </text>
              </view>
            </view>
            <view class="tl-content">
              <text class="tl-title-text">
                {{ s.title }}
              </text>
              <text class="tl-desc">
                {{ s.desc }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 退款信息 -->
      <view class="info-card">
        <text class="info-title">
          退款信息
        </text>
        <view class="info-rows">
          <view class="info-row">
            <text class="ir-label">
              退款单号
            </text><text class="ir-val">
              {{ refund.id }}
            </text>
          </view>
          <view class="info-row">
            <text class="ir-label">
              关联订单
            </text><text
              class="ir-val link"
              @click="goOrder(refund.orderId)"
            >
              {{ refund.orderNo }} ›
            </text>
          </view>
          <view class="info-row">
            <text class="ir-label">
              退款类型
            </text><text class="ir-val">
              {{ refund.type === 'refund_only' ? '仅退款' : '退货退款' }}
            </text>
          </view>
          <view class="info-row">
            <text class="ir-label">
              退款原因
            </text><text class="ir-val">
              {{ refund.reason }}
            </text>
          </view>
          <view class="info-row">
            <text class="ir-label">
              申请时间
            </text><text class="ir-val">
              {{ refund.createdAt }}
            </text>
          </view>
        </view>
      </view>

      <!-- 商品信息 -->
      <view
        v-if="refund.product"
        class="product-card"
      >
        <text class="info-title">
          退款商品
        </text>
        <view class="product-item">
          <view class="pi-cover">
            <text>📦</text>
          </view>
          <view class="pi-info">
            <text class="pi-name">
              {{ refund.product.name }}
            </text>
            <text class="pi-sku">
              {{ refund.product.skuName }}
            </text>
            <view class="pi-price-row">
              <text class="pi-price">
                ¥{{ refund.product.price }}
              </text>
              <text class="pi-qty">
                ×{{ refund.product.quantity }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 温馨提示 -->
      <view class="tip-card">
        <text class="tip-icon">
          ⚠️
        </text>
        <view class="tip-content">
          <text class="tip-title">
            温馨提示
          </text>
          <text class="tip-text">
            退款将在1-3个工作日内原路退回
          </text>
          <text class="tip-text">
            银行卡退款可能延迟，具体以银行到账时间为准
          </text>
        </view>
      </view>

      <!-- 底部操作 -->
      <view class="bottom-bar">
        <view class="bottom-inner">
          <view class="bb-btn">
            💬 联系客服
          </view>
          <view class="bb-btn">
            🛡 我要申诉
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface ProductInfo { name: string; cover?: string; skuName?: string; price: number; quantity: number }
interface RefundData { id: string; orderId: string; orderNo: string; type: string; status: string; reason: string; amount: number; createdAt: string; product?: ProductInfo }

const loading = ref(true); const refund = ref<RefundData | null>(null)

const steps = [
  { title: '申请提交', desc: '您的退款申请已提交' },
  { title: '商家审核', desc: '商家正在处理您的退款' },
  { title: '平台审核', desc: '平台审核中' },
  { title: '退款处理', desc: '正在处理退款...' },
  { title: '退款到账', desc: '预计1-3个工作日到账' },
]

const stepMap: Record<string, number> = { submitted: 0, merchant_review: 1, platform_review: 2, refunding: 3, completed: 4 }

const currentStepIndex = computed(() => stepMap[refund.value?.status || ''] ?? 0)

onMounted(() => {
  const opts = (getCurrentPages().pop()?.options || {})
  refund.value = { id: opts.id || '1', orderId: opts.orderId || '', orderNo: opts.orderNo || '', type: opts.type || 'refund_only', status: opts.status || 'refunding', reason: opts.reason || '不想要了', amount: Number(opts.amount) || 168, createdAt: opts.createdAt || '2026-06-01 10:30', product: { name: opts.productName || '国学课程', skuName: opts.skuName || '标准版', price: Number(opts.price) || 168, quantity: 1 } }
  loading.value = false
})

function goOrder(id: string) { uni.navigateTo({ url: `/pages/orders/order-detail?id=${id}` }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 120rpx; }
.header { background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.loading-skeleton { padding: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.s-card { height: 160rpx; background: #e8e3db; border-radius: 16rpx; }
.amount-card { margin: 16rpx 24rpx; background: linear-gradient(135deg, #4CAF50, #45a049); border-radius: 20rpx; padding: 28rpx; color: #fff; }
.ac-top { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.ac-icon { font-size: 28rpx; } .ac-label { font-size: 24rpx; opacity: 0.9; }
.ac-amount { font-size: 64rpx; font-weight: bold; display: block; margin-bottom: 8rpx; }
.ac-method { font-size: 22rpx; opacity: 0.8; display: block; }
.ac-eta, .ac-done { display: flex; align-items: center; gap: 8rpx; background: rgba(255,255,255,0.15); border-radius: 12rpx; padding: 12rpx; font-size: 24rpx; margin-top: 12rpx; }
.timeline-card { margin: 0 24rpx 16rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.tl-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 24rpx; }
.timeline { position: relative; }
.tl-item { display: flex; gap: 16rpx; padding-bottom: 28rpx; position: relative; }
.tl-item:last-child { padding-bottom: 0; }
.tl-dot-row { width: 40rpx; display: flex; flex-direction: column; align-items: center; }
.tl-dot { width: 36rpx; height: 36rpx; border-radius: 50%; border: 2rpx solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 18rpx; color: #ccc; background: #fff; }
.tl-dot.completed { background: #4CAF50; border-color: #4CAF50; color: #fff; }
.tl-dot.current { background: #ff9800; border-color: #ff9800; color: #fff; }
.tl-item:not(:last-child) .tl-dot-row::after { content: ''; width: 2rpx; flex: 1; background: #eee; margin-top: 6rpx; }
.tl-item.completed:not(:last-child) .tl-dot-row::after { background: #4CAF50; }
.tl-title-text { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.tl-item.pending .tl-title-text { color: #ccc; }
.tl-item.current .tl-title-text { color: #ff9800; }
.tl-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.tl-item.current .tl-desc { color: #666; }
.info-card, .product-card, .tip-card { margin: 0 24rpx 16rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.info-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 16rpx; }
.info-rows { display: flex; flex-direction: column; gap: 16rpx; }
.info-row { display: flex; justify-content: space-between; align-items: center; }
.ir-label { font-size: 24rpx; color: #999; }
.ir-val { font-size: 24rpx; color: #2C2C2C; }
.ir-val.link { color: #C41E3A; }
.product-item { display: flex; gap: 16rpx; }
.pi-cover { width: 100rpx; height: 100rpx; background: #f5f0e8; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; flex-shrink: 0; }
.pi-info { flex: 1; }
.pi-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.pi-sku { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.pi-price-row { display: flex; justify-content: space-between; align-items: center; margin-top: 8rpx; }
.pi-price { font-size: 28rpx; font-weight: bold; color: #C41E3A; }
.pi-qty { font-size: 22rpx; color: #999; }
.tip-card { display: flex; gap: 12rpx; }
.tip-icon { font-size: 32rpx; }
.tip-content { flex: 1; }
.tip-title { font-size: 24rpx; font-weight: 500; color: #e65100; display: block; margin-bottom: 6rpx; }
.tip-text { font-size: 22rpx; color: #a08030; display: block; margin-bottom: 4rpx; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E5E1DB; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); }
.bottom-inner { display: flex; gap: 16rpx; }
.bb-btn { flex: 1; text-align: center; padding: 18rpx; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 26rpx; color: #666; }
</style>
