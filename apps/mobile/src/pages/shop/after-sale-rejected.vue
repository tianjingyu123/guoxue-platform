<template>
  <view class="page">
    <template v-if="loading">
      <view class="skeleton-header" />
      <view class="skeleton-body">
        <view
          v-for="i in 3"
          :key="i"
          class="skeleton-card"
        />
      </view>
    </template>

    <template v-else-if="detail">
      <!-- 顶部导航 -->
      <view class="header-bar">
        <view
          class="header-left"
          @click="goBack"
        >
          <text class="header-icon">
            ‹
          </text>
        </view>
        <text class="header-title">
          售后结果
        </text>
      </view>

      <!-- 结果区域 -->
      <view class="result-area">
        <view class="result-icon-wrap">
          <text class="result-icon">
            ✕
          </text>
        </view>
        <text class="result-title">
          售后申请已驳回
        </text>
        <text class="result-desc">
          您的售后申请未通过审核
        </text>
      </view>

      <!-- 驳回原因 -->
      <view class="reject-card">
        <view class="reject-body">
          <view class="reject-header">
            <text class="reject-icon">
              ⚠
            </text>
            <text class="reject-label">
              驳回原因
            </text>
          </view>
          <text class="reject-text">
            {{ detail.rejectReason }}
          </text>
        </view>
        <view class="reject-time">
          <text class="reject-time-label">
            处理时间
          </text>
          <text class="reject-time-value">
            {{ rejectTime }}
          </text>
        </view>
      </view>

      <!-- 售后信息 -->
      <view class="info-card">
        <view class="info-title-row">
          <text class="info-title-icon">
            🧾
          </text>
          <text class="info-title-text">
            售后信息
          </text>
        </view>

        <!-- 商品 -->
        <view class="product-info">
          <image
            :src="detail.product.cover || ''"
            class="product-cover"
            mode="aspectFill"
          />
          <view class="product-detail">
            <text class="product-name">
              {{ detail.product.name }}
            </text>
            <text class="product-sku">
              {{ detail.product.skuName }}
            </text>
            <view class="product-price-row">
              <text class="product-price">
                ¥{{ detail.product.price }}
              </text>
              <text class="product-qty">
                x{{ detail.product.quantity }}
              </text>
            </view>
          </view>
        </view>

        <!-- 信息列表 -->
        <view class="info-list">
          <view class="info-row">
            <text class="info-label">
              售后类型
            </text>
            <text class="info-value">
              {{ detail.type === 'refund_only' ? '仅退款' : '退货退款' }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">
              退款金额
            </text>
            <text class="info-value price">
              ¥{{ detail.amount.toFixed(2) }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">
              退款原因
            </text>
            <text class="info-value">
              {{ detail.reason }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">
              售后单号
            </text>
            <view class="info-value-row">
              <text class="info-value">
                {{ detail.id }}
              </text>
              <text
                class="copy-btn"
                @click="handleCopy(detail.id)"
              >
                {{ copied ? '✓' : '📋' }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 问题描述 -->
      <view
        v-if="detail.description"
        class="desc-card"
      >
        <text class="desc-title">
          问题描述
        </text>
        <text class="desc-text">
          {{ detail.description }}
        </text>
      </view>

      <!-- 凭证图片 -->
      <view
        v-if="detail.images && detail.images.length > 0"
        class="image-card"
      >
        <text class="desc-title">
          凭证图片
        </text>
        <view class="image-list">
          <image
            v-for="(img, idx) in detail.images"
            :key="idx"
            :src="img"
            class="evidence-img"
            mode="aspectFill"
          />
        </view>
      </view>

      <!-- 申诉提示 -->
      <view class="appeal-tips">
        <view class="appeal-icon-wrap">
          <text class="appeal-icon">
            💬
          </text>
        </view>
        <view class="appeal-content">
          <text class="appeal-title">
            对结果有异议？
          </text>
          <text class="appeal-desc">
            如果您对驳回结果有疑问，可以发起申诉，我们会安排专人重新审核您的售后申请。
          </text>
        </view>
      </view>

      <!-- 联系客服 -->
      <view
        class="contact-card"
        @click="goContact"
      >
        <view class="contact-left">
          <view class="contact-icon-wrap">
            <text class="contact-icon">
              📞
            </text>
          </view>
          <view class="contact-info">
            <text class="contact-title">
              联系客服
            </text>
            <text class="contact-desc">
              在线客服为您解答
            </text>
          </view>
        </view>
        <text class="contact-arrow">
          ›
        </text>
      </view>

      <!-- 底部固定按钮 -->
      <view class="bottom-bar">
        <view class="bottom-btn-row">
          <view
            class="btn-secondary"
            @click="reapply"
          >
            <text class="btn-icon">
              🔄
            </text>
            <text>重新申请</text>
          </view>
          <view
            class="btn-primary"
            @click="goDispute"
          >
            <text class="btn-icon">
              ⚠
            </text>
            <text>我要申诉</text>
          </view>
        </view>
        <view
          class="btn-order-link"
          @click="goOrder"
        >
          查看订单详情
        </view>
      </view>

      <view
        v-if="showCopiedToast"
        class="toast"
      >
        已复制
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { shopApi } from '../../api'

interface AfterSaleDetail {
  id: string
  orderId: string
  orderNo: string
  type: string
  status: string
  reason: string
  amount: number
  description: string
  images: string[]
  product: { id: string; name: string; cover: string; skuName: string; price: number; quantity: number }
  timeline: Array<{ status: string; title: string; time: string; description?: string; isCurrent: boolean }>
  rejectReason: string
  createdAt: string
  canCancel: boolean
}

const mockDetail: AfterSaleDetail = {
  id: 'as001', orderId: 'order001', orderNo: '202401150001', type: 'refund_only', status: 'rejected',
  reason: '商品质量问题', amount: 168, description: '收到商品后发现印刷模糊，影响阅读体验', images: [],
  product: { id: 'p1', name: '周易六十四卦详解（精装典藏版）', cover: '', skuName: '精装版', price: 168, quantity: 1 },
  timeline: [
    { status: 'submitted', title: '提交申请', time: '2024-01-15 10:30', isCurrent: false },
    { status: 'reviewing', title: '商家审核', time: '2024-01-15 14:20', isCurrent: false },
    { status: 'rejected', title: '申请驳回', description: '商家已驳回您的售后申请', time: '2024-01-16 09:15', isCurrent: true },
  ],
  rejectReason: '经核实，您购买的商品为正品且印刷清晰，不符合退款条件。商品在发货前已经过严格质检，如有疑问请联系客服进一步沟通。',
  createdAt: '2024-01-15 10:30', canCancel: false,
}

const loading = ref(true)
const detail = ref<AfterSaleDetail | null>(null)
const copied = ref(false)
const showCopiedToast = ref(false)
const id = ref('as001')

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  id.value = page?.options?.id || 'as001'
  await fetchDetail()
})

async function fetchDetail() {
  loading.value = true
  try {
    detail.value = await shopApi.afterSaleDetail(id.value)
  } catch {
    detail.value = mockDetail
  } finally { loading.value = false }
}

const rejectTime = computed(() => {
  if (!detail.value) return ''
  const found = detail.value.timeline.find(t => t.status === 'rejected')
  return found?.time || detail.value.createdAt
})

function handleCopy(text: string) {
  uni.setClipboardData({ data: text, success: () => {
    copied.value = true; showCopiedToast.value = true
    setTimeout(() => { showCopiedToast.value = false; copied.value = false }, 2000)
  }})
}

function goBack() { uni.navigateBack() }
function reapply() { if (detail.value) uni.navigateTo({ url: `/pages/shop/after-sale?orderId=${detail.value.orderId}&prefill=true` }) }
function goDispute() { if (detail.value) uni.navigateTo({ url: `/pages/shop/dispute?afterSaleId=${detail.value.id}` }) }
function goOrder() { if (detail.value) uni.navigateTo({ url: `/pages/orders/order-detail?id=${detail.value.orderId}` }) }
function goContact() { uni.navigateTo({ url: '/pages/customer-service/chat' }) }
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; padding-bottom: 280rpx; }
.skeleton-header { height: 112rpx; background: linear-gradient(to right, #C41E3A, #E53E3E); }
.skeleton-body { padding: 32rpx; display: flex; flex-direction: column; gap: 24rpx; }
.skeleton-card { height: 256rpx; background: #fff; border-radius: 24rpx; }
.header-bar { background: linear-gradient(to right, #C41E3A, #E53E3E); display: flex; align-items: center; gap: 16rpx; padding: 24rpx 32rpx; }
.header-left { padding: 8rpx; }
.header-icon { font-size: 48rpx; color: #fff; }
.header-title { font-size: 36rpx; font-weight: 500; color: #fff; }
.result-area { background: linear-gradient(to bottom right, #C41E3A, #E53E3E); padding: 48rpx 32rpx 96rpx; display: flex; flex-direction: column; align-items: center; color: #fff; }
.result-icon-wrap { width: 160rpx; height: 160rpx; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.result-icon { font-size: 96rpx; }
.result-title { font-size: 40rpx; font-weight: bold; margin-bottom: 12rpx; }
.result-desc { font-size: 26rpx; color: rgba(255,255,255,0.8); }
.reject-card { margin: -48rpx 24rpx 24rpx; background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); }
.reject-body { padding: 32rpx; border-bottom: 2rpx solid #E8E3DB; }
.reject-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; }
.reject-icon { font-size: 36rpx; color: #C41E3A; }
.reject-label { font-size: 28rpx; font-weight: 500; color: #C41E3A; }
.reject-text { font-size: 26rpx; color: #666; line-height: 1.7; }
.reject-time { padding: 24rpx 32rpx; background: #FAF8F5; display: flex; justify-content: space-between; }
.reject-time-label { font-size: 26rpx; color: #999; }
.reject-time-value { font-size: 26rpx; color: #2C2C2C; }
.info-card { margin: 0 24rpx 24rpx; background: #fff; border-radius: 24rpx; padding: 32rpx; }
.info-title-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 24rpx; }
.info-title-icon { font-size: 36rpx; }
.info-title-text { font-size: 30rpx; font-weight: 500; color: #C9A96E; }
.product-info { display: flex; gap: 20rpx; padding-bottom: 24rpx; border-bottom: 2rpx solid #E8E3DB; }
.product-cover { width: 128rpx; height: 128rpx; border-radius: 12rpx; background: #f0f0f0; flex-shrink: 0; }
.product-detail { flex: 1; min-width: 0; }
.product-name { font-size: 26rpx; color: #2C2C2C; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; overflow: hidden; }
.product-sku { font-size: 22rpx; color: #999; margin-top: 8rpx; display: block; }
.product-price-row { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.product-price { font-size: 28rpx; color: #C41E3A; font-weight: 500; }
.product-qty { font-size: 22rpx; color: #999; }
.info-list { padding-top: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.info-row { display: flex; justify-content: space-between; align-items: center; }
.info-label { font-size: 26rpx; color: #999; }
.info-value { font-size: 26rpx; color: #2C2C2C; }
.info-value.price { color: #C41E3A; font-weight: 500; }
.info-value-row { display: flex; align-items: center; gap: 12rpx; }
.copy-btn { font-size: 24rpx; color: #C9A96E; }
.desc-card, .image-card { margin: 0 24rpx 24rpx; background: #fff; border-radius: 24rpx; padding: 32rpx; }
.desc-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 16rpx; }
.desc-text { font-size: 26rpx; color: #666; line-height: 1.7; }
.image-list { display: flex; gap: 16rpx; flex-wrap: wrap; }
.evidence-img { width: 160rpx; height: 160rpx; border-radius: 12rpx; background: #f0f0f0; }
.appeal-tips { margin: 0 24rpx 24rpx; background: linear-gradient(to right, #FFF7ED, #FFFBF5); border-radius: 24rpx; padding: 32rpx; border: 2rpx solid rgba(251,191,36,0.2); display: flex; gap: 20rpx; }
.appeal-icon-wrap { width: 80rpx; height: 80rpx; background: rgba(251,191,36,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.appeal-icon { font-size: 36rpx; }
.appeal-content { flex: 1; }
.appeal-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 8rpx; }
.appeal-desc { font-size: 26rpx; color: #666; line-height: 1.6; }
.contact-card { margin: 0 24rpx 24rpx; background: #fff; border-radius: 24rpx; padding: 32rpx; display: flex; align-items: center; justify-content: space-between; }
.contact-left { display: flex; align-items: center; gap: 20rpx; }
.contact-icon-wrap { width: 80rpx; height: 80rpx; background: rgba(201,169,110,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.contact-icon { font-size: 36rpx; }
.contact-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.contact-desc { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.contact-arrow { font-size: 40rpx; color: #ccc; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 2rpx solid #E8E3DB; padding: 24rpx 32rpx; display: flex; flex-direction: column; gap: 16rpx; }
.bottom-btn-row { display: flex; gap: 16rpx; }
.btn-secondary { flex: 1; height: 88rpx; line-height: 88rpx; text-align: center; border-radius: 16rpx; border: 2rpx solid #C41E3A; color: #C41E3A; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 12rpx; font-size: 28rpx; }
.btn-primary { flex: 1; height: 88rpx; line-height: 88rpx; text-align: center; border-radius: 16rpx; background: linear-gradient(to right, #C41E3A, #E53E3E); color: #fff; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 12rpx; font-size: 28rpx; }
.btn-icon { font-size: 28rpx; }
.btn-order-link { height: 72rpx; line-height: 72rpx; text-align: center; background: #FAF8F5; color: #666; border-radius: 16rpx; font-size: 26rpx; }
.toast { position: fixed; top: 160rpx; left: 50%; transform: translateX(-50%); z-index: 50; background: rgba(44,44,44,0.9); color: #fff; font-size: 28rpx; padding: 16rpx 32rpx; border-radius: 50rpx; }
</style>
