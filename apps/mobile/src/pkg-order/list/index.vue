<template>
  <view class="orders">
    <!-- 顶部导航 + 状态Tab -->
    <view class="header" :style="{ paddingTop: 'calc(20rpx + var(--status-bar-height, 0px))' }">
      <app-nav-bar title="我的订单" background="transparent" no-border />
      <scroll-view scroll-x class="tabs" :show-scrollbar="false">
        <view class="tabs-inner">
          <view
            v-for="tab in statusTabs"
            :key="tab.key"
            class="tab"
            :class="{ active: activeTab === tab.key }"
            @tap="activeTab = tab.key"
          >
            <text class="tab-text">{{ tab.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 列表 -->
    <view class="content">
      <view v-if="filteredOrders.length === 0" class="empty">
        <app-icon name="package" :size="120" color="#E8E3DB" />
        <text class="empty-text">暂无订单</text>
        <view class="empty-btn" @tap="goShop"><text>去逛逛</text></view>
      </view>

      <view
        v-for="order in filteredOrders"
        :key="order.id"
        class="order-card"
        @tap="goDetail(order.id)"
      >
        <!-- 卡头 -->
        <view class="card-head">
          <view class="head-left">
            <text class="order-no">订单号: {{ order.orderNo }}</text>
            <view class="copy-btn" @tap.stop="copyNo(order.orderNo)"><app-icon name="copy" :size="26" color="#999999" /></view>
          </view>
          <view class="status" :style="{ color: cfg(order.status).color }">
            <app-icon :name="cfg(order.status).icon" :size="28" :color="cfg(order.status).color" />
            <text class="status-text">{{ cfg(order.status).label }}</text>
          </view>
        </view>

        <!-- 商品 -->
        <view class="products">
          <view
            v-for="(p, idx) in order.products.slice(0, 2)"
            :key="p.id"
            class="product"
            :class="{ bordered: idx > 0 }"
          >
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
          <text v-if="order.products.length > 2" class="more">共 {{ order.products.length }} 件商品</text>
        </view>

        <!-- 卡脚 -->
        <view class="card-foot">
          <view class="pay-sum">
            <text class="pay-label">实付: </text>
            <text class="pay-value">¥{{ order.payAmount }}</text>
          </view>
          <view class="actions" @tap.stop>
            <template v-if="order.status === 'pending_pay'">
              <view class="btn ghost" @tap="askCancel(order.id)"><text>取消订单</text></view>
              <view class="btn primary" @tap="goPay(order.id)"><text>去支付</text></view>
            </template>
            <template v-else-if="order.status === 'pending_ship'">
              <view v-if="order.canCancel" class="btn ghost" @tap="askCancel(order.id)"><text>取消订单</text></view>
            </template>
            <template v-else-if="order.status === 'pending_receive'">
              <view class="btn ghost" @tap="goLogistics(order.id)"><text>查看物流</text></view>
              <view v-if="order.canConfirm" class="btn primary" @tap="confirmReceive(order.id)"><text>确认收货</text></view>
            </template>
            <template v-else-if="order.status === 'completed'">
              <view v-if="order.canReview" class="btn outline" @tap="goReview(order.id)"><text>去评价</text></view>
              <view class="btn ghost" @tap="goAfterSale(order.id)"><text>申请售后</text></view>
              <view class="btn primary" @tap="buyAgain"><text>再次购买</text></view>
            </template>
          </view>
        </view>
      </view>
    </view>

    <!-- 取消弹窗 -->
    <view v-if="showCancel" class="mask mask-fade-in" @tap="closeCancel">
      <view class="dialog dialog-pop-in" @tap.stop>
        <view class="dialog-head"><text class="dialog-title">取消订单</text></view>
        <view class="dialog-body">
          <text class="dialog-tip">请选择取消原因：</text>
          <view
            v-for="r in cancelReasons"
            :key="r"
            class="reason"
            :class="{ active: cancelReason === r }"
            @tap="cancelReason = r"
          >
            <text class="reason-text" :class="{ active: cancelReason === r }">{{ r }}</text>
          </view>
        </view>
        <view class="dialog-foot">
          <view class="btn ghost flex1" @tap="closeCancel"><text>暂不取消</text></view>
          <view class="btn primary flex1" :class="{ disabled: !cancelReason }" @tap="doCancel"><text>确认取消</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { mockOrders, orderStatusTabs, orderStatusConfig, orderCancelReasons, type OrderListItem } from '@/lib/order-data'

const statusTabs = orderStatusTabs
const cancelReasons = orderCancelReasons
const activeTab = ref('')
const orders = ref<OrderListItem[]>([...mockOrders])
const showCancel = ref(false)
const cancelId = ref<string | null>(null)
const cancelReason = ref('')

const filteredOrders = computed(() =>
  activeTab.value ? orders.value.filter((o) => o.status === activeTab.value) : orders.value
)

function cfg(status: string) {
  return orderStatusConfig[status] || orderStatusConfig.completed
}
function copyNo(no: string) {
  uni.setClipboardData({ data: no, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
}
function goDetail(id: string) { navigateTo(`/orders/${id}`) }
function goPay(id: string) { navigateTo(`/shop/paying?orderId=${id}`) }
function goLogistics(id: string) { navigateTo(`/orders/logistics?orderId=${id}`) }
function goReview(id: string) { navigateTo(`/orders/${id}/review`) }
function goAfterSale(id: string) { navigateTo(`/shop/after-sale?orderId=${id}`) }
function goShop() { navigateTo('/shop') }
function buyAgain() { navigateTo('/shop/cart') }
function confirmReceive(id: string) {
  orders.value = orders.value.map((o) =>
    o.id === id ? { ...o, status: 'completed', canConfirm: false, canReview: true } : o
  )
  uni.showToast({ title: '确认收货成功', icon: 'none' })
}
function askCancel(id: string) { cancelId.value = id; showCancel.value = true }
function closeCancel() { showCancel.value = false; cancelId.value = null; cancelReason.value = '' }
function doCancel() {
  if (!cancelReason.value || !cancelId.value) return
  orders.value = orders.value.map((o) =>
    o.id === cancelId.value ? { ...o, status: 'cancelled', canCancel: false } : o
  )
  closeCancel()
}
</script>

<style lang="scss" scoped>
.orders { min-height: 100vh; background: #FAF8F5; padding-bottom: 40rpx; }
.header { position: sticky; top: 0; z-index: 20; background: #FFFFFF; border-bottom: 1rpx solid #E8E3DB; }
.tabs { white-space: nowrap; }
.tabs-inner { display: inline-flex; }
.tab { flex-shrink: 0; padding: 22rpx 32rpx; border-bottom: 4rpx solid transparent; }
.tab.active { border-bottom-color: #C41E3A; }
.tab-text { font-size: 28rpx; color: #666666; }
.tab.active .tab-text { color: #C41E3A; font-weight: 600; }
.content { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-text { font-size: 28rpx; color: #999999; margin: 24rpx 0; }
.empty-btn { padding: 16rpx 48rpx; background: #C41E3A; border-radius: 40rpx; }
.empty-btn text { font-size: 28rpx; color: #FFFFFF; }
.order-card { background: #FFFFFF; border-radius: 24rpx; overflow: hidden; }
.card-head { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; border-bottom: 1rpx solid #E8E3DB; }
.head-left { display: flex; align-items: center; gap: 8rpx; }
.order-no { font-size: 26rpx; color: #666666; }
.copy-btn { padding: 4rpx; }
.status { display: flex; align-items: center; gap: 6rpx; }
.status-text { font-size: 26rpx; font-weight: 600; }
.products { padding: 24rpx; }
.product { display: flex; gap: 20rpx; }
.product.bordered { margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx solid #E8E3DB; }
.p-cover { width: 140rpx; height: 140rpx; border-radius: 12rpx; background: #FAF8F5; flex-shrink: 0; }
.p-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.p-name { font-size: 28rpx; color: #2C2C2C; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.p-sku { font-size: 24rpx; color: #999999; margin-top: 8rpx; }
.p-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
.p-price { font-size: 28rpx; font-weight: 600; color: #C41E3A; }
.p-qty { font-size: 24rpx; color: #999999; }
.more { display: block; text-align: center; font-size: 24rpx; color: #999999; margin-top: 24rpx; }
.card-foot { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; border-top: 1rpx solid #E8E3DB; }
.pay-label { font-size: 26rpx; color: #666666; }
.pay-value { font-size: 30rpx; font-weight: 700; color: #C41E3A; }
.actions { display: flex; align-items: center; gap: 16rpx; flex-wrap: wrap; justify-content: flex-end; }
.btn { padding: 12rpx 28rpx; border-radius: 40rpx; font-size: 26rpx; }
.btn text { font-size: 26rpx; }
.btn.ghost { border: 1rpx solid #E8E3DB; color: #666666; }
.btn.outline { border: 1rpx solid #C41E3A; color: #C41E3A; }
.btn.primary { background: #C41E3A; color: #FFFFFF; }
.btn.disabled { opacity: 0.5; }
.btn.flex1 { flex: 1; text-align: center; padding: 20rpx 0; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { width: 600rpx; background: #FFFFFF; border-radius: 24rpx; overflow: hidden; }
.dialog-head { padding: 28rpx; border-bottom: 1rpx solid #E8E3DB; }
.dialog-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; text-align: center; display: block; }
.dialog-body { padding: 24rpx; }
.dialog-tip { font-size: 26rpx; color: #666666; margin-bottom: 16rpx; display: block; }
.reason { padding: 24rpx; border-radius: 12rpx; margin-bottom: 16rpx; background: #FAF8F5; }
.reason.active { background: rgba(196,30,58,0.1); border: 1rpx solid #C41E3A; }
.reason-text { font-size: 28rpx; color: #2C2C2C; }
.reason-text.active { color: #C41E3A; }
.dialog-foot { display: flex; gap: 24rpx; padding: 24rpx; border-top: 1rpx solid #E8E3DB; }
</style>
