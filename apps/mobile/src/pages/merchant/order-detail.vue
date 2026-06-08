<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
      <text class="header-title">订单详情</text>
      <view class="header-spacer" />
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="loading-wrap"><text class="loading-text">加载中...</text></view>

    <!-- 订单内容 -->
    <template v-else-if="order">
      <!-- 订单状态横幅 -->
      <view class="status-banner">
        <text class="status-tag" :class="orderStatusClass(order.status)">{{ orderStatusLabel(order.status) }}</text>
      </view>

      <!-- 订单信息 -->
      <view class="card">
        <view class="card-row">
          <text class="label">订单号</text>
          <text class="val selectable">{{ order.orderNo || order.id }}</text>
        </view>
        <view class="card-row">
          <text class="label">下单时间</text>
          <text class="val">{{ order.createdAt }}</text>
        </view>
      </view>

      <!-- 商品信息 -->
      <view class="card">
        <view class="card-title">商品信息</view>
        <view
          v-for="(item, idx) in orderItems"
          :key="idx"
          class="product-row"
        >
          <view class="product-info">
            <text class="product-name">{{ item.productTitle || item.productName || '商品' }}</text>
            <text class="product-spec" v-if="item.spec">{{ item.spec }}</text>
          </view>
          <view class="product-meta">
            <text class="product-qty">x{{ item.quantity || 1 }}</text>
            <text class="product-price">¥{{ item.price || item.unitPrice || 0 }}</text>
          </view>
        </view>
      </view>

      <!-- 价格明细 -->
      <view class="card">
        <view class="card-row">
          <text class="label">商品金额</text>
          <text class="val">¥{{ order.productAmount || order.subtotal || order.amount || 0 }}</text>
        </view>
        <view class="card-row" v-if="order.shippingFee !== undefined && order.shippingFee !== null">
          <text class="label">运费</text>
          <text class="val">¥{{ order.shippingFee }}</text>
        </view>
        <view class="card-row total">
          <text class="label">合计</text>
          <text class="val">¥{{ order.totalAmount || order.amount || 0 }}</text>
        </view>
      </view>

      <!-- 收货信息 -->
      <view class="card" v-if="order.consignee || order.receiverName">
        <view class="card-title">收货信息</view>
        <view class="card-row">
          <text class="label">收货人</text>
          <text class="val">{{ order.consignee || order.receiverName }}</text>
        </view>
        <view class="card-row" v-if="order.phone || order.receiverPhone">
          <text class="label">联系电话</text>
          <text class="val">{{ order.phone || order.receiverPhone }}</text>
        </view>
        <view class="card-row" v-if="order.address || order.receiverAddress">
          <text class="label">收货地址</text>
          <text class="val">{{ order.address || order.receiverAddress }}</text>
        </view>
      </view>

      <!-- 物流信息（已发货） -->
      <view class="card" v-if="order.status === 'SHIPPED' && order.trackingNo">
        <view class="card-title">物流信息</view>
        <view class="card-row">
          <text class="label">快递公司</text>
          <text class="val">{{ order.company || order.carrier || '-' }}</text>
        </view>
        <view class="card-row">
          <text class="label">运单号</text>
          <text class="val selectable">{{ order.trackingNo }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="actions" v-if="actionBtns.length">
        <view
          v-for="btn in actionBtns"
          :key="btn.text"
          class="action-btn"
          :class="btn.type"
          @click="btn.handler"
        >
          {{ btn.text }}
        </view>
      </view>
    </template>

    <!-- 加载失败 -->
    <view v-else class="empty-wrap">
      <text class="empty-text">订单不存在</text>
    </view>

    <!-- 发货弹窗 -->
    <view v-if="showShipPopup" class="popup-mask" @click.self="showShipPopup = false">
      <view class="popup-content">
        <text class="popup-title">填写物流信息</text>
        <input
          class="popup-input"
          v-model="shipForm.company"
          placeholder="快递公司（如：顺丰速运）"
        />
        <input
          class="popup-input"
          v-model="shipForm.trackingNo"
          placeholder="物流单号"
        />
        <view class="popup-btns">
          <view class="popup-btn cancel" @click="showShipPopup = false">取消</view>
          <view class="popup-btn confirm" @click="submitShip">确认发货</view>
        </view>
      </view>
    </view>

    <!-- 拒绝退款弹窗 -->
    <view v-if="showRejectPopup" class="popup-mask" @click.self="showRejectPopup = false">
      <view class="popup-content">
        <text class="popup-title">拒绝退款</text>
        <textarea
          class="popup-textarea"
          v-model="rejectReason"
          placeholder="请填写拒绝原因（必填）"
        />
        <view class="popup-btns">
          <view class="popup-btn cancel" @click="showRejectPopup = false">取消</view>
          <view class="popup-btn confirm" @click="submitReject">确认拒绝</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { merchantApi } from '@/api'

const order = ref<any>(null)
const loading = ref(true)

// 弹窗状态
const showShipPopup = ref(false)
const shipForm = ref({ company: '', trackingNo: '' })
const showRejectPopup = ref(false)
const rejectReason = ref('')

// 计算商品列表（兼容单商品和多商品）
const orderItems = computed(() => {
  if (!order.value) return []
  if (order.value.items && order.value.items.length) return order.value.items
  return [{ ...order.value }]
})

// 操作按钮配置
const actionBtns = computed(() => {
  const btns: { text: string; type: string; handler: () => void }[] = []
  const s = order.value?.status
  if (s === 'PAID') {
    btns.push({ text: '发货', type: 'primary', handler: () => { showShipPopup.value = true } })
  } else if (s === 'REFUNDING') {
    btns.push({ text: '同意退款', type: 'danger', handler: handleApproveRefund })
    btns.push({ text: '拒绝退款', type: 'outline', handler: () => { showRejectPopup.value = true } })
  }
  return btns
})

// 加载订单详情
async function loadOrder() {
  loading.value = true
  try {
    const res = await merchantApi.getOrder(orderId.value)
    order.value = res?.data || res
  } catch {
    order.value = null
  } finally {
    loading.value = false
  }
}

const orderId = ref('')

onLoad((opt?: any) => {
  orderId.value = opt?.id || ''
  loadOrder()
})

// 状态映射
function orderStatusClass(s: string) {
  const m: Record<string, string> = {
    PENDING: 'pending',
    PAID: 'paid',
    SHIPPED: 'shipped',
    COMPLETED: 'completed',
    REFUNDING: 'refund',
  }
  return m[s] || ''
}
function orderStatusLabel(s: string) {
  const m: Record<string, string> = {
    PENDING: '待支付',
    PAID: '待发货',
    SHIPPED: '已发货',
    COMPLETED: '已完成',
    REFUNDING: '退款中',
  }
  return m[s] || s
}

// 发货
async function submitShip() {
  if (!shipForm.value.company.trim()) {
    uni.showToast({ title: '请输入快递公司', icon: 'none' })
    return
  }
  if (!shipForm.value.trackingNo.trim()) {
    uni.showToast({ title: '请输入物流单号', icon: 'none' })
    return
  }
  try {
    await merchantApi.shipOrder(orderId.value, {
      company: shipForm.value.company.trim(),
      trackingNo: shipForm.value.trackingNo.trim(),
    })
    uni.showToast({ title: '发货成功', icon: 'success' })
    showShipPopup.value = false
    loadOrder()
  } catch {
    /* handled by api interceptor */
  }
}

// 同意退款（商户API暂无该方法，直接调用底层API）
async function handleApproveRefund() {
  uni.showModal({
    title: '同意退款',
    content: '确定要同意该退款申请吗？此操作不可撤销。',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await merchantApi.approveRefund(orderId.value)
        uni.showToast({ title: '已同意退款', icon: 'success' })
        loadOrder()
      } catch {
        /* handled by api interceptor */
      }
    },
  })
}

// 拒绝退款
async function submitReject() {
  if (!rejectReason.value.trim()) {
    uni.showToast({ title: '请填写拒绝原因', icon: 'none' })
    return
  }
  try {
    await merchantApi.rejectRefund(orderId.value, { reason: rejectReason.value.trim() })
    uni.showToast({ title: '已拒绝退款', icon: 'success' })
    showRejectPopup.value = false
    rejectReason.value = ''
    loadOrder()
  } catch {
    /* handled by api interceptor */
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F0E8; padding-bottom: 80rpx; }

/* Header */
.header { display: flex; align-items: center; padding: 24rpx 32rpx; background: #fff; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { padding: 8rpx 16rpx 8rpx 0; }
.back-arrow { font-size: 40rpx; color: #3C2415; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #3C2415; text-align: center; }
.header-spacer { width: 60rpx; }

/* Loading & Empty */
.loading-wrap { display: flex; align-items: center; justify-content: center; height: 500rpx; }
.loading-text { font-size: 28rpx; color: #999; }
.empty-wrap { display: flex; align-items: center; justify-content: center; height: 500rpx; }
.empty-text { font-size: 28rpx; color: #ccc; }

/* Status Banner */
.status-banner { padding: 32rpx 32rpx 16rpx; }
.status-tag { display: inline-block; font-size: 28rpx; font-weight: 600; padding: 8rpx 32rpx; border-radius: 12rpx; }
.status-tag.pending { background: #FFF8E1; color: #F57F17; }
.status-tag.paid { background: #E3F2FD; color: #1565C0; }
.status-tag.shipped { background: #E8F5E9; color: #2E7D32; }
.status-tag.completed { background: #F5F0E8; color: #666; }
.status-tag.refund { background: #FFEBEE; color: #C62828; }

/* Card */
.card { margin: 0 24rpx 20rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.card-title { font-size: 26rpx; font-weight: 600; color: #3C2415; margin-bottom: 16rpx; padding-bottom: 12rpx; border-bottom: 1rpx solid #f0ebe0; }
.card-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 10rpx 0; }
.card-row .label { font-size: 26rpx; color: #999; flex-shrink: 0; margin-right: 16rpx; }
.card-row .val { font-size: 26rpx; color: #3C2415; text-align: right; flex: 1; word-break: break-all; }
.card-row.total { border-top: 1rpx solid #f0ebe0; margin-top: 8rpx; padding-top: 16rpx; }
.card-row.total .label { font-size: 28rpx; font-weight: 600; color: #3C2415; }
.card-row.total .val { font-size: 32rpx; font-weight: bold; color: #C41E3A; }
.selectable { user-select: text; }

/* Product Row */
.product-row { display: flex; justify-content: space-between; align-items: center; padding: 14rpx 0; }
.product-row + .product-row { border-top: 1rpx solid #f0ebe0; }
.product-info { flex: 1; margin-right: 16rpx; }
.product-name { font-size: 26rpx; color: #3C2415; display: block; }
.product-spec { font-size: 22rpx; color: #ccc; display: block; margin-top: 4rpx; }
.product-meta { display: flex; align-items: center; flex-shrink: 0; }
.product-qty { font-size: 24rpx; color: #999; margin-right: 12rpx; }
.product-price { font-size: 26rpx; color: #C41E3A; font-weight: 600; }

/* Actions */
.actions { margin: 0 24rpx; display: flex; justify-content: center; gap: 20rpx; padding: 8rpx 0 24rpx; }
.action-btn { padding: 18rpx 48rpx; border-radius: 12rpx; font-size: 28rpx; text-align: center; min-width: 200rpx; }
.action-btn.primary { background: #5a3a1a; color: #fff; }
.action-btn.danger { background: #C41E3A; color: #fff; }
.action-btn.outline { background: transparent; color: #C41E3A; border: 1rpx solid #C41E3A; }

/* Popup */
.popup-mask { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.popup-content { width: 560rpx; background: #fff; border-radius: 24rpx; padding: 40rpx; }
.popup-title { font-size: 32rpx; font-weight: 600; color: #3C2415; text-align: center; margin-bottom: 32rpx; }
.popup-input { width: 100%; height: 72rpx; border: 1rpx solid #E8E0D5; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; color: #3C2415; margin-bottom: 20rpx; box-sizing: border-box; }
.popup-textarea { width: 100%; height: 180rpx; border: 1rpx solid #E8E0D5; border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 26rpx; color: #3C2415; margin-bottom: 24rpx; box-sizing: border-box; }
.popup-btns { display: flex; gap: 20rpx; }
.popup-btn { flex: 1; text-align: center; padding: 20rpx 0; border-radius: 12rpx; font-size: 28rpx; }
.popup-btn.cancel { background: #F5F0E8; color: #666; }
.popup-btn.confirm { background: #5a3a1a; color: #fff; }
</style>
