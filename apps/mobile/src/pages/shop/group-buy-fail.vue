<template>
  <view class="page">
    <template v-if="!info">
      <view class="loading-wrap">
        <view class="loading-spinner" />
      </view>
    </template>
    <template v-else>
      <view class="header-area">
        <view class="header-top">
          <view
            class="header-left"
            @click="goBack"
          >
            <text class="header-icon">
              ‹
            </text>
          </view>
          <text class="header-title">
            拼团结果
          </text>
        </view>
        <view class="header-result">
          <view class="result-icon-wrap">
            <text class="result-icon">
              ⚠
            </text>
          </view>
          <text class="result-title">
            拼团未成功
          </text>
          <text class="result-desc">
            {{ getReasonText(info.reason) }}
          </text>
        </view>
      </view>

      <view class="content-area">
        <view class="product-card">
          <image
            :src="info.productCover || ''"
            class="product-img"
            mode="aspectFill"
          />
          <view class="product-info">
            <text class="product-name">
              {{ info.productName }}
            </text>
            <text class="product-price">
              ¥{{ info.price }}
            </text>
          </view>
          <view class="product-meta">
            <view class="meta-row">
              <text class="meta-label">
                参团人数
              </text>
              <view class="meta-users">
                <view class="user-avatars">
                  <image
                    v-for="m in info.members"
                    :key="m.id"
                    :src="m.avatar || ''"
                    class="user-avatar"
                    mode="aspectFill"
                  />
                  <view
                    v-for="i in (info.minMembers - info.currentMembers)"
                    :key="i"
                    class="user-placeholder"
                  >
                    <text class="placeholder-text">
                      ?
                    </text>
                  </view>
                </view>
                <text class="user-count">
                  {{ info.currentMembers }}/{{ info.minMembers }}人
                </text>
              </view>
            </view>
            <view class="meta-row">
              <text class="meta-label">
                失败时间
              </text><text class="meta-value">
                {{ info.failedAt }}
              </text>
            </view>
          </view>
        </view>

        <view class="refund-card">
          <view class="refund-header">
            <text class="refund-icon">
              👛
            </text><text class="refund-title">
              退款信息
            </text>
          </view>
          <view class="refund-detail">
            <view class="refund-amount-row">
              <text class="refund-amount-label">
                退款金额
              </text><text class="refund-amount-value">
                ¥{{ info.refundAmount.toFixed(2) }}
              </text>
            </view>
            <view class="refund-date-row">
              <text class="refund-date-label">
                预计到账
              </text><text class="refund-date-value">
                {{ info.estimatedRefundTime }}（1-3个工作日）
              </text>
            </view>
          </view>
          <view class="refund-progress">
            <view class="progress-labels">
              <text>申请退款</text><text>处理中</text><text>退款完成</text>
            </view>
            <view class="progress-bar">
              <view
                class="progress-fill"
                :style="{ width: getRefundProgress() + '%' }"
              />
            </view>
            <view class="progress-dots">
              <view
                class="progress-dot"
                :class="{ done: info.refundStatus !== 'pending' }"
              >
                <text
                  v-if="info.refundStatus !== 'pending'"
                  class="dot-check"
                >
                  ✓
                </text>
              </view>
              <view
                class="progress-dot"
                :class="{ done: info.refundStatus === 'completed', processing: info.refundStatus === 'processing' }"
              >
                <text
                  v-if="info.refundStatus === 'completed'"
                  class="dot-check"
                >
                  ✓
                </text>
              </view>
              <view
                class="progress-dot"
                :class="{ done: info.refundStatus === 'completed' }"
              >
                <text
                  v-if="info.refundStatus === 'completed'"
                  class="dot-check"
                >
                  ✓
                </text>
              </view>
            </view>
          </view>
          <view class="refund-note">
            <text class="refund-note-icon">
              🕐
            </text><text class="refund-note-text">
              退款将原路返回至您的支付账户，请留意账户变动
            </text>
          </view>
        </view>

        <view class="order-card">
          <text class="order-label">
            订单编号
          </text>
          <view class="order-value-row">
            <text class="order-value">
              {{ info.orderId }}
            </text><text
              class="order-copy"
              @click="copyOrderId"
            >
              {{ copied ? '✓' : '📋' }}
            </text>
          </view>
        </view>

        <view class="tips-card">
          <text class="tips-text">
            温馨提示：拼团失败不影响您再次参与，我们为您推荐了更多热门拼团商品，快去看看吧！
          </text>
        </view>
      </view>

      <view class="bottom-bar">
        <view class="bottom-btn-row">
          <view
            class="btn-secondary"
            @click="goRefund"
          >
            查看退款
          </view>
          <view
            class="btn-primary"
            @click="recreate"
          >
            <text class="btn-icon">
              🔄
            </text><text>重新开团</text>
          </view>
        </view>
        <view
          class="btn-link"
          @click="goGroupBuy"
        >
          <text class="btn-icon">
            🛒
          </text><text>浏览其他拼团</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../../api'

interface FailInfo { groupId: string; orderId: string; productName: string; productCover: string; price: number; reason: 'timeout'|'stock'|'other'; members: {id:string;name:string;avatar:string}[]; minMembers: number; currentMembers: number; failedAt: string; refundStatus: 'pending'|'processing'|'completed'; refundAmount: number; estimatedRefundTime: string }

const defaultFailInfo: FailInfo = { groupId:'g123', orderId:'2024010100001', productName:'紫微斗数入门教程（精装版）', productCover:'', price:128, reason:'timeout', members:[{id:'1',name:'张三',avatar:''}], minMembers:3, currentMembers:1, failedAt:'2024-01-15 18:00:00', refundStatus:'processing', refundAmount:128, estimatedRefundTime:'2024-01-18' }

const info = ref<FailInfo | null>(null)
const copied = ref(false)

function normalizeInfo(raw: any, fallback: FailInfo): FailInfo {
  if (!raw) return { ...fallback }
  return {
    groupId: raw.id || raw.groupId || fallback.groupId,
    orderId: raw.orderId || fallback.orderId,
    productName: raw.productName || raw.product?.name || fallback.productName,
    productCover: raw.productCover || raw.product?.cover || '',
    price: raw.price ?? raw.product?.price ?? fallback.price,
    reason: raw.reason || fallback.reason,
    members: raw.members || fallback.members,
    minMembers: raw.minMembers || raw.minPeople || fallback.minMembers,
    currentMembers: raw.currentMembers || raw.joinedCount || fallback.currentMembers,
    failedAt: raw.failedAt || raw.endTime || fallback.failedAt,
    refundStatus: raw.refundStatus || 'pending',
    refundAmount: raw.refundAmount ?? raw.amount ?? fallback.refundAmount,
    estimatedRefundTime: raw.estimatedRefundTime || fallback.estimatedRefundTime,
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
    info.value = normalizeInfo(res, { ...defaultFailInfo, orderId: orderId || defaultFailInfo.orderId, groupId: groupBuyId || defaultFailInfo.groupId })
  } catch {
    info.value = { ...defaultFailInfo, orderId: orderId || defaultFailInfo.orderId, groupId: groupBuyId || defaultFailInfo.groupId }
  }
})

function getReasonText(reason: string) { switch(reason) { case 'timeout': return '拼团超时，未能在规定时间内凑齐人数'; case 'stock': return '商品库存不足，无法完成拼团'; default: return '拼团未能成功，我们正在处理退款' } }
function getRefundProgress() { if (!info.value) return 0; switch(info.value.refundStatus) { case 'pending': return 33; case 'processing': return 66; case 'completed': return 100; default: return 0 } }
function copyOrderId() { if (!info.value) return; uni.setClipboardData({ data: info.value.orderId, success: () => { copied.value = true; setTimeout(() => { copied.value = false }, 2000) } }) }
function goBack() { uni.navigateBack() }
function goRefund() { if (info.value) uni.navigateTo({ url: `/pages/orders/refund-progress?orderId=${info.value.orderId}` }) }
function recreate() { if (info.value) uni.navigateTo({ url: `/pages/shop/group-buy-detail?id=${info.value.groupId}&action=create` }) }
function goGroupBuy() { uni.navigateTo({ url: '/pages/shop/group-buy' }) }
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; padding-bottom: 280rpx; }
.loading-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.loading-spinner { width: 64rpx; height: 64rpx; border: 4rpx solid #E8E3DB; border-top-color: #C41E3A; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.header-area { background: linear-gradient(135deg, #6b7280, #4b5563); }
.header-top { display: flex; align-items: center; gap: 16rpx; padding: 24rpx 32rpx; }
.header-left { padding: 8rpx; }
.header-icon { font-size: 48rpx; color: #fff; }
.header-title { font-size: 36rpx; font-weight: 500; color: #fff; }
.header-result { padding: 0 32rpx 64rpx; text-align: center; }
.result-icon-wrap { width: 160rpx; height: 160rpx; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 32rpx; }
.result-icon { font-size: 80rpx; color: #fff; }
.result-title { font-size: 40rpx; font-weight: bold; color: #fff; margin-bottom: 12rpx; }
.result-desc { font-size: 26rpx; color: rgba(255,255,255,0.8); }
.content-area { padding: 0 24rpx; margin-top: -24rpx; display: flex; flex-direction: column; gap: 24rpx; }
.product-card { background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); }
.product-info { display: flex; gap: 20rpx; }
.product-img { width: 160rpx; height: 160rpx; border-radius: 16rpx; background: #f0f0f0; flex-shrink: 0; }
.product-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; flex: 1; }
.product-price { font-size: 32rpx; font-weight: bold; color: #C41E3A; display: block; margin-top: 12rpx; }
.product-meta { margin-top: 24rpx; padding-top: 24rpx; border-top: 2rpx solid #E8E3DB; display: flex; flex-direction: column; gap: 16rpx; }
.meta-row { display: flex; justify-content: space-between; align-items: center; }
.meta-label { font-size: 26rpx; color: #999; }
.meta-value { font-size: 26rpx; color: #666; }
.meta-users { display: flex; align-items: center; gap: 12rpx; }
.user-avatars { display: flex; }
.user-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; border: 4rpx solid #fff; margin-left: -16rpx; background: #f0f0f0; }
.user-avatar:first-child { margin-left: 0; }
.user-placeholder { width: 48rpx; height: 48rpx; border-radius: 50%; border: 4rpx solid #fff; margin-left: -16rpx; background: #E8E3DB; display: flex; align-items: center; justify-content: center; }
.placeholder-text { font-size: 20rpx; color: #999; }
.user-count { font-size: 26rpx; color: #666; }
.refund-card { background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); }
.refund-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 24rpx; }
.refund-icon { font-size: 36rpx; }
.refund-title { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.refund-detail { background: #FAF8F5; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.refund-amount-row { display: flex; justify-content: space-between; margin-bottom: 16rpx; }
.refund-amount-label { font-size: 26rpx; color: #666; }
.refund-amount-value { font-size: 36rpx; font-weight: bold; color: #C41E3A; }
.refund-date-row { display: flex; justify-content: space-between; }
.refund-date-label { font-size: 24rpx; color: #999; }
.refund-date-value { font-size: 24rpx; color: #666; }
.refund-progress { margin-bottom: 24rpx; }
.progress-labels { display: flex; justify-content: space-between; font-size: 20rpx; color: #999; margin-bottom: 12rpx; }
.progress-bar { height: 12rpx; background: #E8E3DB; border-radius: 12rpx; overflow: hidden; margin-bottom: 8rpx; }
.progress-fill { height: 100%; background: linear-gradient(to right, #C41E3A, #E85A6B); border-radius: 12rpx; transition: width 0.5s; }
.progress-dots { display: flex; justify-content: space-between; }
.progress-dot { width: 32rpx; height: 32rpx; border-radius: 50%; background: #E8E3DB; display: flex; align-items: center; justify-content: center; }
.progress-dot.done { background: #C41E3A; }
.progress-dot.processing { background: #C41E3A; }
.dot-check { font-size: 20rpx; color: #fff; }
.refund-note { display: flex; gap: 12rpx; font-size: 22rpx; color: #999; }
.refund-note-icon { font-size: 28rpx; flex-shrink: 0; }
.refund-note-text { line-height: 1.5; }
.order-card { background: #fff; border-radius: 24rpx; padding: 32rpx; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); }
.order-label { font-size: 26rpx; color: #999; }
.order-value-row { display: flex; align-items: center; gap: 12rpx; }
.order-value { font-size: 26rpx; color: #2C2C2C; font-family: monospace; }
.order-copy { font-size: 24rpx; }
.tips-card { background: #EFF6FF; border-radius: 16rpx; padding: 32rpx; }
.tips-text { font-size: 26rpx; color: #2563EB; line-height: 1.6; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 2rpx solid #E8E3DB; padding: 24rpx 32rpx; display: flex; flex-direction: column; gap: 16rpx; }
.bottom-btn-row { display: flex; gap: 16rpx; }
.btn-secondary { flex: 1; height: 88rpx; line-height: 88rpx; text-align: center; border-radius: 16rpx; border: 2rpx solid #E8E3DB; color: #666; font-weight: 500; font-size: 28rpx; }
.btn-primary { flex: 1; height: 88rpx; line-height: 88rpx; text-align: center; border-radius: 16rpx; background: linear-gradient(to right, #C41E3A, #E85A6B); color: #fff; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 12rpx; font-size: 28rpx; }
.btn-icon { font-size: 28rpx; }
.btn-link { height: 72rpx; line-height: 72rpx; text-align: center; border-radius: 16rpx; background: #FAF8F5; color: #C41E3A; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 12rpx; font-size: 26rpx; }
</style>
