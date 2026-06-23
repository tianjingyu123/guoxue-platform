<template>
  <view class="detail">
    <!-- 顶部 -->
    <app-nav-bar title="订单详情" :back-size="40" :title-weight="500" title-align="left">
      <template #right>
        <view class="nav-act" @tap="toService"><app-icon name="message-circle" :size="40" color="#666666" /></view>
      </template>
    </app-nav-bar>

    <!-- 状态卡 -->
    <view class="status-card" :style="{ background: status.bg }">
      <view class="status-row">
        <view class="status-icon" :style="{ background: status.bg }">
          <app-icon :name="status.icon" :size="56" :color="status.color" />
        </view>
        <view class="status-text-box">
          <text class="status-text" :style="{ color: status.color }">{{ status.text }}</text>
          <text v-if="order.status === 'pending_pay'" class="status-sub">请在30分钟内完成支付</text>
          <text v-else-if="order.status === 'pending_receive' && order.logistics" class="status-sub">{{ order.logistics.status }}</text>
        </view>
      </view>
      <!-- 进度步骤 -->
      <view v-if="order.status !== 'cancelled'" class="steps">
        <view v-for="(step, idx) in steps" :key="step.key" class="step-item">
          <view class="step-col">
            <view class="step-dot" :class="{ done: idx < status.step }">
              <app-icon v-if="idx < status.step" name="check-circle" :size="24" color="#FFFFFF" />
              <text v-else class="step-num">{{ idx + 1 }}</text>
            </view>
            <text class="step-label" :class="{ done: idx < status.step }">{{ step.label }}</text>
          </view>
          <view v-if="idx < steps.length - 1" class="step-line" :class="{ done: idx < status.step - 1 }" />
        </view>
      </view>
    </view>

    <!-- 物流入口 -->
    <view
      v-if="order.logistics && order.status !== 'pending_pay' && order.status !== 'cancelled'"
      class="card logistics-entry"
      @tap="goLogistics"
    >
      <view class="log-icon"><app-icon name="truck" :size="36" color="#3B82F6" /></view>
      <view class="log-info">
        <view class="log-top">
          <text class="log-company">{{ order.logistics.company }}</text>
          <text class="log-no">{{ order.logistics.trackingNo }}</text>
        </view>
        <text class="log-latest">{{ order.logistics.timeline[0].content }}</text>
        <text class="log-time">{{ order.logistics.timeline[0].time }}</text>
      </view>
      <app-icon name="chevron-right" :size="32" color="#CCCCCC" />
    </view>

    <!-- 地址 -->
    <view class="card address">
      <view class="addr-icon"><app-icon name="map-pin" :size="36" color="#C41E3A" /></view>
      <view class="addr-info">
        <view class="addr-top">
          <text class="addr-name">{{ order.address.name }}</text>
          <text class="addr-phone">{{ order.address.phone }}</text>
        </view>
        <text class="addr-detail">{{ order.address.province }}{{ order.address.city }}{{ order.address.district }}{{ order.address.address }}</text>
      </view>
    </view>

    <!-- 商品清单 -->
    <view class="card products">
      <view class="card-title-row"><text class="card-title">商品清单</text></view>
      <view v-for="p in order.products" :key="p.id" class="product">
        <image class="p-cover" :src="p.cover" mode="aspectFill" />
        <view class="p-info">
          <text class="p-name">{{ p.name }}</text>
          <text class="p-sku">{{ p.skuName }}</text>
          <view class="p-bottom">
            <text class="p-price">¥{{ p.price }}</text>
            <text class="p-qty">x{{ p.quantity }}</text>
          </view>
        </view>
      </view>
      <view v-if="order.status === 'completed' || order.status === 'pending_receive'" class="quick-acts">
        <view v-if="order.canReview" class="quick primary" @tap="goReview"><app-icon name="star" :size="30" color="#C41E3A" /><text>评价晒单</text></view>
        <view class="quick ghost" @tap="goAfterSale"><app-icon name="undo-2" :size="30" color="#666666" /><text>申请售后</text></view>
      </view>
    </view>

    <!-- 价格明细 -->
    <view class="card">
      <text class="card-title">价格明细</text>
      <view class="price-rows">
        <view class="price-row"><text class="pr-label">商品总额</text><text class="pr-value">¥{{ order.totalAmount.toFixed(2) }}</text></view>
        <view class="price-row"><text class="pr-label">运费</text><text class="pr-value">包邮</text></view>
        <view v-if="order.coupon" class="price-row"><text class="pr-label">{{ order.coupon.name }}</text><text class="pr-value red">-¥{{ order.coupon.discount.toFixed(2) }}</text></view>
        <view class="price-row total"><text class="pr-label bold">实付金额</text><text class="pr-pay">¥{{ order.payAmount.toFixed(2) }}</text></view>
      </view>
    </view>

    <!-- 订单信息 -->
    <view class="card last">
      <text class="card-title">订单信息</text>
      <view class="info-rows">
        <view class="info-row">
          <text class="ir-label">订单编号</text>
          <view class="ir-right">
            <text class="ir-value mono">{{ order.orderNo }}</text>
            <view @tap="copyNo"><app-icon name="copy" :size="28" color="#C41E3A" /></view>
          </view>
        </view>
        <view class="info-row"><text class="ir-label">下单时间</text><text class="ir-value">{{ order.createdAt }}</text></view>
        <view v-if="order.paidAt" class="info-row"><text class="ir-label">付款时间</text><text class="ir-value">{{ order.paidAt }}</text></view>
        <view v-if="order.payMethod" class="info-row"><text class="ir-label">支付方式</text><text class="ir-value">{{ order.payMethod }}</text></view>
        <view v-if="order.remark" class="info-row"><text class="ir-label">备注</text><text class="ir-value">{{ order.remark }}</text></view>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="footer">
      <view class="foot-service" @tap="toService"><app-icon name="phone" :size="30" color="#666666" /><text>联系客服</text></view>
      <view class="foot-actions">
        <template v-if="order.status === 'pending_pay'">
          <view class="fbtn ghost"><text>取消订单</text></view>
          <view class="fbtn primary" @tap="goPay"><text>去支付</text></view>
        </template>
        <template v-else-if="order.status === 'pending_receive'">
          <view class="fbtn ghost" @tap="goLogistics"><text>查看物流</text></view>
          <view class="fbtn primary" @tap="confirmReceive"><text>确认收货</text></view>
        </template>
        <template v-else-if="order.status === 'completed'">
          <view v-if="order.canReview" class="fbtn outline" @tap="goReview"><text>去评价</text></view>
          <view class="fbtn ghost" @tap="goAfterSale"><text>申请售后</text></view>
          <view class="fbtn primary" @tap="goShop"><app-icon name="shopping-bag" :size="28" color="#FFFFFF" /><text>再次购买</text></view>
        </template>
        <template v-else-if="order.status === 'cancelled'">
          <view class="fbtn primary" @tap="goShop"><text>重新下单</text></view>
        </template>
      </view>
    </view>

    <!-- 复制提示 -->
    <view v-if="copied" class="toast"><text>复制成功</text></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { mockOrderDetail, detailSteps, detailStatusConfig, type OrderDetail } from '@/lib/order-data'

const steps = detailSteps
const order = ref<OrderDetail>({ ...mockOrderDetail })
const copied = ref(false)
const orderId = ref('1')

const status = computed(() => detailStatusConfig[order.value.status] || detailStatusConfig.pending_pay)

onLoad((q) => { if (q?.id) orderId.value = q.id })

function copyNo() {
  uni.setClipboardData({ data: order.value.orderNo, success: () => { copied.value = true; setTimeout(() => (copied.value = false), 1500) } })
}
function goLogistics() { navigateTo(`/orders/logistics?orderId=${order.value.id}`) }
function goReview() { navigateTo(`/orders/${order.value.id}/review`) }
function goAfterSale() { navigateTo(`/shop/after-sale?orderId=${order.value.id}`) }
function goPay() { navigateTo(`/shop/paying?orderId=${order.value.id}`) }
function goShop() { navigateTo('/shop') }
function toService() { navigateTo('/customer-service') }
function confirmReceive() {
  order.value = { ...order.value, status: 'completed', canConfirm: false, canReview: true }
  uni.showToast({ title: '确认收货成功', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.detail { min-height: 100vh; background: #FAF8F5; padding-bottom: 140rpx; }
.nav-act { display: flex; justify-content: flex-end; }
.status-card { padding: 40rpx 32rpx; }
.status-row { display: flex; align-items: center; gap: 24rpx; }
.status-icon { width: 100rpx; height: 100rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.status-text { font-size: 40rpx; font-weight: 700; }
.status-sub { display: block; font-size: 26rpx; color: #666666; margin-top: 8rpx; }
.steps { display: flex; align-items: flex-start; justify-content: space-between; margin-top: 40rpx; }
.step-item { display: flex; align-items: center; flex: 1; }
.step-item:last-child { flex: 0; }
.step-col { display: flex; flex-direction: column; align-items: center; }
.step-dot { width: 44rpx; height: 44rpx; border-radius: 50%; background: #E8E3DB; display: flex; align-items: center; justify-content: center; }
.step-dot.done { background: #C41E3A; }
.step-num { font-size: 24rpx; color: #999999; }
.step-label { font-size: 22rpx; color: #999999; margin-top: 8rpx; white-space: nowrap; }
.step-label.done { color: #2C2C2C; }
.step-line { flex: 1; height: 2rpx; background: #E8E3DB; margin: 22rpx 8rpx 0; }
.step-line.done { background: #C41E3A; }
.card { margin: 24rpx 32rpx 0; background: #FFFFFF; border-radius: 20rpx; padding: 28rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03); }
.card.last { margin-bottom: 24rpx; }
.logistics-entry { display: flex; align-items: flex-start; gap: 20rpx; }
.log-icon { width: 64rpx; height: 64rpx; border-radius: 50%; background: rgba(59,130,246,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.log-info { flex: 1; min-width: 0; }
.log-top { display: flex; align-items: center; gap: 16rpx; }
.log-company { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.log-no { font-size: 22rpx; color: #999999; }
.log-latest { display: block; font-size: 26rpx; color: #2C2C2C; margin-top: 12rpx; line-height: 1.4; }
.log-time { display: block; font-size: 22rpx; color: #999999; margin-top: 6rpx; }
.address { display: flex; align-items: flex-start; gap: 20rpx; }
.addr-icon { width: 64rpx; height: 64rpx; border-radius: 50%; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.addr-info { flex: 1; }
.addr-top { display: flex; align-items: center; gap: 16rpx; }
.addr-name { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.addr-phone { font-size: 28rpx; color: #666666; }
.addr-detail { display: block; font-size: 26rpx; color: #666666; margin-top: 8rpx; line-height: 1.5; }
.card-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.card-title-row { padding-bottom: 20rpx; border-bottom: 1rpx solid #E8E3DB; margin-bottom: 20rpx; }
.product { display: flex; gap: 20rpx; padding: 20rpx 0; border-bottom: 1rpx solid #F0EBE3; }
.p-cover { width: 120rpx; height: 120rpx; border-radius: 12rpx; background: #FAF8F5; flex-shrink: 0; }
.p-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.p-name { font-size: 28rpx; color: #2C2C2C; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.p-sku { font-size: 24rpx; color: #999999; margin-top: 8rpx; }
.p-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
.p-price { font-size: 28rpx; font-weight: 500; color: #C41E3A; }
.p-qty { font-size: 26rpx; color: #999999; }
.quick-acts { display: flex; gap: 16rpx; padding-top: 24rpx; }
.quick { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx; height: 72rpx; border-radius: 12rpx; }
.quick text { font-size: 26rpx; font-weight: 500; }
.quick.primary { background: rgba(196,30,58,0.1); color: #C41E3A; }
.quick.ghost { background: #F3F0EB; color: #666666; }
.price-rows, .info-rows { margin-top: 20rpx; display: flex; flex-direction: column; gap: 16rpx; }
.price-row { display: flex; align-items: center; justify-content: space-between; }
.price-row.total { padding-top: 16rpx; border-top: 1rpx solid #E8E3DB; }
.pr-label { font-size: 26rpx; color: #666666; }
.pr-label.bold { font-weight: 500; color: #2C2C2C; }
.pr-value { font-size: 26rpx; color: #2C2C2C; }
.pr-value.red { color: #C41E3A; }
.pr-pay { font-size: 34rpx; font-weight: 700; color: #C41E3A; }
.info-row { display: flex; align-items: center; justify-content: space-between; }
.ir-label { font-size: 26rpx; color: #666666; }
.ir-right { display: flex; align-items: center; gap: 12rpx; }
.ir-value { font-size: 26rpx; color: #2C2C2C; }
.mono { font-family: monospace; }
.footer { position: fixed; bottom: 0; left: 0; right: 0; height: 112rpx; background: #FFFFFF; border-top: 1rpx solid #E8E3DB; display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx calc(0px + env(safe-area-inset-bottom)); }
.foot-service { display: flex; align-items: center; gap: 6rpx; }
.foot-service text { font-size: 26rpx; color: #666666; }
.foot-actions { display: flex; align-items: center; gap: 16rpx; }
.fbtn { display: flex; align-items: center; gap: 6rpx; padding: 16rpx 32rpx; border-radius: 40rpx; }
.fbtn text { font-size: 26rpx; }
.fbtn.ghost { border: 1rpx solid #E8E3DB; color: #666666; }
.fbtn.outline { border: 1rpx solid #C41E3A; color: #C41E3A; }
.fbtn.primary { background: #C41E3A; color: #FFFFFF; }
.toast { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); padding: 16rpx 32rpx; border-radius: 12rpx; z-index: 100; }
.toast text { font-size: 26rpx; color: #FFFFFF; }
</style>
