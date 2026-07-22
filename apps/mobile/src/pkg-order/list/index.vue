<template>
  <view class="orders">
    <!-- 顶部导航 + 状态Tab（含角标数） -->
    <view class="header" :style="{ paddingTop: 'calc(20rpx + var(--status-bar-height, 0px))' }">
      <app-nav-bar title="我的订单" background="transparent" no-border />
      <scroll-view scroll-x class="tabs" :show-scrollbar="false">
        <view class="tabs-inner">
          <view
            v-for="tab in statusTabs"
            :key="tab.key"
            class="tab"
            :class="{ active: activeTab === tab.key }"
            @tap="selectTab(tab.key)"
          >
            <view class="tab-label">
              <text class="tab-text">{{ tab.label }}</text>
              <view v-if="counts[tab.key] > 0" class="tab-badge">
                <text class="tab-badge-text">{{ counts[tab.key] > 99 ? '99+' : counts[tab.key] }}</text>
              </view>
            </view>
            <view class="tab-ind" :class="{ on: activeTab === tab.key }" />
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="content">
      <!-- 骨架屏加载态 -->
      <view v-if="loading" class="sk-list">
        <view v-for="i in 3" :key="i" class="sk-card">
          <view class="sk-head"><view class="sk-bar sk-w220" /><view class="sk-bar sk-w100" /></view>
          <view class="sk-body">
            <view class="sk-thumb" />
            <view class="sk-lines"><view class="sk-bar sk-full" /><view class="sk-bar sk-w300" /><view class="sk-bar sk-w160" /></view>
          </view>
          <view class="sk-foot"><view class="sk-bar sk-w180" /><view class="sk-pill" /><view class="sk-pill" /></view>
        </view>
      </view>

      <!-- 错误态 -->
      <view v-else-if="error" class="error-state">
        <view class="empty-icon-wrap"><app-icon name="alert-circle" :size="72" color="var(--brand)" /></view>
        <text class="error-text">{{ error }}</text>
        <view class="empty-btn" @tap="retry"><text class="empty-btn-text">点击重试</text></view>
      </view>

      <!-- 空态 -->
      <view v-else-if="isEmpty" class="empty">
        <view class="empty-icon-wrap">
          <view class="empty-dot empty-dot-a" />
          <view class="empty-dot empty-dot-b" />
          <app-icon name="package" :size="88" color="var(--brand)" />
        </view>
        <text class="empty-title">{{ emptyTitle }}</text>
        <text class="empty-sub">去商城逛逛，发现好物</text>
        <view class="empty-btn" @tap="goShop"><text class="empty-btn-text">去逛逛</text></view>
      </view>

      <!-- 订单卡 -->
      <view
        v-for="order in orders"
        :key="order.id"
        class="order-card"
        hover-class="card-press"
        @tap="goDetail(order.id)"
      >
        <!-- 卡头：来源 + 状态（语义色右对齐） -->
        <view class="card-head">
          <view class="head-source">
            <view class="source-ico"><app-icon :name="typeMeta(order).icon" :size="26" color="var(--brand)" /></view>
            <text class="source-name">{{ typeMeta(order).label }}</text>
          </view>
          <view class="status" :style="{ color: cfg2(order).color }">
            <app-icon :name="cfg2(order).icon" :size="26" :color="cfg2(order).color" />
            <text class="status-text">{{ cfg2(order).label }}</text>
          </view>
        </view>

        <!-- 商品行 -->
        <view class="products">
          <view
            v-for="(p, idx) in order.products.slice(0, 2)"
            :key="p.id"
            class="product"
            :class="{ bordered: idx > 0 }"
          >
            <smart-cover class="p-cover" :src="p.cover" :title="p.name" type="product" deco :deco-size="48" />
            <view class="p-info">
              <text class="p-name">{{ p.name }}</text>
              <text v-if="p.skuName" class="p-sku">{{ p.skuName }}</text>
              <view class="p-bottom">
                <view class="p-price"><text class="p-price-sym">¥</text><text class="p-price-num">{{ formatPrice(p.price) }}</text></view>
                <text class="p-qty">x{{ p.quantity }}</text>
              </view>
            </view>
          </view>
          <text v-if="order.products.length > 2" class="more">共 {{ order.products.length }} 件商品</text>
        </view>

        <!-- 单号/时间 + 合计行 -->
        <view class="card-meta">
          <view class="meta-left" @tap.stop="copyNo(order.orderNo)">
            <text class="meta-text">{{ order.createdAt }} · 单号 {{ order.orderNo }}</text>
            <app-icon name="copy" :size="24" color="var(--text-soft)" />
          </view>
          <view class="pay-sum">
            <text class="pay-label">共{{ order.products.length }}件 实付</text>
            <text class="pay-sym">¥</text>
            <text class="pay-value">{{ formatPrice(order.payAmount) }}</text>
          </view>
        </view>

        <!-- 操作按钮组：幽灵描边 + 主操作实底 -->
        <view class="card-foot" @tap.stop>
          <template v-if="order.status === 'pending_pay'">
            <view class="btn ghost" hover-class="btn-press" @tap="askCancel(order.id)"><text class="btn-t">取消订单</text></view>
            <view class="btn primary" hover-class="btn-press" @tap="goPay(order)"><text class="btn-t btn-t-light">去支付</text></view>
          </template>
          <template v-else-if="order.status === 'pending_ship'">
            <view v-if="order.canCancel" class="btn ghost" hover-class="btn-press" @tap="askCancel(order.id)"><text class="btn-t">取消订单</text></view>
            <view class="btn ghost" hover-class="btn-press" @tap="goDetail(order.id)"><text class="btn-t">查看详情</text></view>
          </template>
          <!-- 虚拟订单（课程/会员）：无物流/收货/实物售后操作，课程给学习入口 -->
          <template v-else-if="order.isVirtual && (order.status === 'pending_receive' || order.status === 'completed')">
            <view v-if="order.canReview" class="btn outline" hover-class="btn-press" @tap="goReview(order.id)"><text class="btn-t btn-t-brand">去评价</text></view>
            <view v-if="order.orderType === 'COURSE'" class="btn primary" hover-class="btn-press" @tap="goLearn(order)"><text class="btn-t btn-t-light">立即学习</text></view>
            <view v-else class="btn ghost" hover-class="btn-press" @tap="goDetail(order.id)"><text class="btn-t">查看详情</text></view>
          </template>
          <template v-else-if="order.status === 'pending_receive'">
            <view class="btn ghost" hover-class="btn-press" @tap="goLogistics(order.id)"><text class="btn-t">查看物流</text></view>
            <view v-if="order.canConfirm" class="btn primary" hover-class="btn-press" @tap="confirmReceive(order.id)"><text class="btn-t btn-t-light">确认收货</text></view>
          </template>
          <template v-else-if="order.status === 'completed'">
            <view class="btn ghost" hover-class="btn-press" @tap="goAfterSale(order.id)"><text class="btn-t">申请售后</text></view>
            <view v-if="order.canReview" class="btn outline" hover-class="btn-press" @tap="goReview(order.id)"><text class="btn-t btn-t-brand">去评价</text></view>
            <view class="btn primary" hover-class="btn-press" @tap="buyAgain"><text class="btn-t btn-t-light">再次购买</text></view>
          </template>
          <template v-else>
            <view class="btn ghost" hover-class="btn-press" @tap="goDetail(order.id)"><text class="btn-t">查看详情</text></view>
          </template>
        </view>
      </view>

      <app-load-more v-if="!loading && !error && orders.length" :status="loadStatus" />
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
          <view class="btn ghost flex1" @tap="closeCancel"><text class="btn-t">暂不取消</text></view>
          <view class="btn primary flex1" :class="{ disabled: !cancelReason }" @tap="doCancel"><text class="btn-t btn-t-light">确认取消</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import AppLoadMore from '@/components/common/app-load-more.vue'
import { navigateTo, redirectTo } from '@/utils/router'
import { useList } from '@/composables/useList'
import { orderApi, orderStatusTabs, orderStatusConfig, orderCancelReasons, orderTypeMeta, type OrderListItem } from '@/pkg-order/lib/order-data'
import { formatPrice } from '@/utils/format'

const statusTabs = orderStatusTabs
const cancelReasons = orderCancelReasons
const activeTab = ref('')
const showCancel = ref(false)
const cancelId = ref<string | null>(null)
const cancelReason = ref('')
const submitting = ref(false)
/** Tab 角标计数（待付款/待发货/待收货，轻量探测 total） */
const counts = ref<Record<string, number>>({})

// 状态过滤已下沉后端(orderApi.list 传 tab→后端枚举)，切 tab 重载、上拉加载更多
const { list: orders, loading, error, isEmpty, loadStatus, refresh, loadMore } = useList<OrderListItem>({
  fetcher: ({ page, pageSize }) => orderApi.list(activeTab.value || undefined, page, pageSize),
})

const emptyTitle = computed(() => {
  const label = statusTabs.find((t) => t.key === activeTab.value)?.label
  return activeTab.value && label ? `暂无${label}订单` : '还没有订单'
})

async function loadCounts() {
  try { counts.value = await orderApi.statusCounts() } catch { /* 角标失败不阻断列表 */ }
}

const retry = () => refresh()
// 支持 ?tab= 深链（我的页四状态入口直达对应筛选）
onLoad((query?: Record<string, string>) => {
  const tab = query?.tab
  if (tab === 'after_sale') {
    redirectTo('/shop/my-after-sales')
    return
  }
  if (tab && statusTabs.some((t) => t.key === tab)) activeTab.value = tab
  refresh()
  loadCounts()
})
onReachBottom(() => loadMore())
// 下拉刷新（pages.json 已开 enablePullDownRefresh）
onPullDownRefresh(() => {
  Promise.all([refresh(), loadCounts()]).finally(() => uni.stopPullDownRefresh())
})

function selectTab(key: string) {
  if (key === 'after_sale') {
    navigateTo('/shop/my-after-sales')
    return
  }
  if (activeTab.value === key) return
  activeTab.value = key
  refresh()
}

function cfg(status: string) {
  return orderStatusConfig[status] || orderStatusConfig.completed
}
/** 按订单类型修正状态展示：虚拟订单（课程/会员）付款即交付，不显示实物「待发货/待收货」 */
function cfg2(order: OrderListItem) {
  if (order.isVirtual && (order.status === 'pending_ship' || order.status === 'pending_receive')) {
    return { ...cfg('completed'), label: '已开通' }
  }
  return cfg(order.status)
}
/** 卡头来源行：按订单类型标识业务域（实物=热卜商城/课程/会员/权益包） */
function typeMeta(order: OrderListItem) {
  return orderTypeMeta[order.orderType] || orderTypeMeta.PRODUCT
}
function goLearn(order: OrderListItem) {
  const cid = order.products[0]?.id
  if (cid) navigateTo(`/courses/${cid}/player`)
}
function copyNo(no: string) {
  uni.setClipboardData({ data: no, success: () => uni.showToast({ title: '订单号已复制', icon: 'none' }) })
}
function goDetail(id: string) { navigateTo(`/orders/${id}`) }
// 带上订单真实实付金额，避免收银页显示 ¥0.00（列表无 payMethod 字段，收银页默认微信）
function goPay(order: OrderListItem) { navigateTo(`/shop/paying?orderId=${order.id}&amount=${order.payAmount}`) }
function goLogistics(id: string) { navigateTo(`/orders/logistics?orderId=${id}`) }
function goReview(id: string) { navigateTo(`/orders/${id}/review`) }
function goAfterSale(id: string) { navigateTo(`/shop/after-sale?orderId=${id}`) }
function goShop() { navigateTo('/mall') }
function buyAgain() { navigateTo('/shop/cart') }
async function confirmReceive(id: string) {
  if (submitting.value) return; submitting.value = true
  try {
    const ok = await orderApi.confirm(id)
    if (ok) {
      orders.value = orders.value.map((o) =>
        o.id === id ? { ...o, status: 'completed' as const, canConfirm: false, canReview: true } : o
      )
      uni.showToast({ title: '确认收货成功', icon: 'none' })
      loadCounts()
    }
  } catch (e) { uni.showToast({ title: (e as Error)?.message || '操作失败，请重试', icon: 'none' }) }
  finally { submitting.value = false }
}
function askCancel(id: string) { cancelId.value = id; showCancel.value = true }
function closeCancel() { showCancel.value = false; cancelId.value = null; cancelReason.value = '' }
async function doCancel() {
  if (!cancelReason.value || !cancelId.value || submitting.value) return
  submitting.value = true
  try {
    const ok = await orderApi.cancel(cancelId.value, cancelReason.value)
    if (ok) {
      orders.value = orders.value.map((o) =>
        o.id === cancelId.value ? { ...o, status: 'cancelled' as const, canCancel: false } : o
      )
      loadCounts()
    }
    closeCancel()
  } catch (e) { uni.showToast({ title: (e as Error)?.message || '操作失败，请重试', icon: 'none' }) }
  finally { submitting.value = false }
}
</script>

<style lang="scss" scoped>
.orders { min-height: 100vh; background: var(--bg-paper, #faf8f5); padding-bottom: 40rpx; }
.card-press { opacity: 0.92; }
.btn-press { opacity: 0.8; }

/* ── 顶部：导航 + 状态Tab（角标） ── */
.header { position: sticky; top: 0; z-index: 20; background: var(--surface, #fff); box-shadow: 0 2rpx 12rpx rgba(44, 44, 44, 0.04); }
.tabs { white-space: nowrap; }
.tabs-inner { display: flex; padding: 0 12rpx; }
.tab { flex: 1; min-width: 140rpx; display: flex; flex-direction: column; align-items: center; padding: 20rpx 8rpx 0; }
.tab-label { position: relative; display: flex; align-items: center; }
.tab-text { font-size: 28rpx; color: var(--text, #666); line-height: 1.2; transition: color 0.2s; }
.tab.active .tab-text { color: var(--brand); font-weight: 600; }
.tab-badge {
  position: absolute; top: -14rpx; right: -34rpx;
  min-width: 30rpx; height: 30rpx; padding: 0 8rpx; box-sizing: border-box;
  border-radius: 999rpx; background: var(--brand);
  display: flex; align-items: center; justify-content: center;
}
.tab-badge-text { position: relative; z-index: 1; font-size: 18rpx; line-height: 1; color: #fff; }
.tab-ind { width: 40rpx; height: 6rpx; border-radius: 999rpx; background: transparent; margin-top: 12rpx; }
.tab-ind.on { background: var(--brand); }

/* ── 列表 ── */
.content { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }

/* ── 订单卡 ── */
.order-card { background: var(--surface, #fff); border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(44, 44, 44, 0.03); }
.card-head { display: flex; align-items: center; justify-content: space-between; padding: 22rpx 24rpx; }
.head-source { display: flex; align-items: center; gap: 12rpx; min-width: 0; }
.source-ico { width: 44rpx; height: 44rpx; border-radius: 12rpx; background: var(--brand-soft, rgba(196,30,58,0.08)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.source-name { font-size: 26rpx; font-weight: 600; color: var(--text-strong, #2c2c2c); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status { display: flex; align-items: center; gap: 6rpx; flex-shrink: 0; }
.status-text { font-size: 26rpx; font-weight: 600; }

.products { padding: 0 24rpx; }
.product { display: flex; gap: 20rpx; padding: 8rpx 0; }
.product.bordered { margin-top: 12rpx; padding-top: 20rpx; border-top: 1rpx solid var(--line, #e8e0d5); }
.p-cover { width: 140rpx; height: 140rpx; border-radius: 16rpx; overflow: hidden; background: var(--surface-sunken, #f2efea); flex-shrink: 0; }
.p-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.p-name { font-size: 28rpx; color: var(--text-strong, #2c2c2c); line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.p-sku { align-self: flex-start; max-width: 100%; font-size: 22rpx; color: var(--text-soft, #999); background: var(--surface-sunken, #f2efea); border-radius: 8rpx; padding: 4rpx 12rpx; margin-top: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; box-sizing: border-box; }
.p-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
.p-price { display: flex; align-items: baseline; color: var(--text-strong, #2c2c2c); }
.p-price-sym { font-size: 22rpx; font-weight: 600; }
.p-price-num { font-size: 28rpx; font-weight: 600; }
.p-qty { font-size: 24rpx; color: var(--text-soft, #999); }
.more { display: block; text-align: center; font-size: 24rpx; color: var(--text-soft, #999); padding: 16rpx 0 4rpx; }

.card-meta { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 20rpx 24rpx 0; }
.meta-left { display: flex; align-items: center; gap: 8rpx; min-width: 0; }
.meta-text { font-size: 22rpx; color: var(--text-soft, #999); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pay-sum { display: flex; align-items: baseline; flex-shrink: 0; }
.pay-label { font-size: 24rpx; color: var(--text, #666); margin-right: 8rpx; }
.pay-sym { font-size: 24rpx; font-weight: 700; color: var(--brand); }
.pay-value { font-size: 34rpx; font-weight: 700; color: var(--brand); }

.card-foot { display: flex; align-items: center; justify-content: flex-end; gap: 16rpx; flex-wrap: wrap; padding: 20rpx 24rpx 24rpx; }

/* 按钮组：幽灵描边 999rpx / 品牌描边 / 主操作实底（文字层 z-index 防御 X5 层叠） */
.btn { position: relative; height: 60rpx; padding: 0 30rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.btn-t { position: relative; z-index: 1; font-size: 25rpx; color: var(--text, #666); line-height: 1; }
.btn.ghost { border: 1rpx solid var(--line, #e8e0d5); background: var(--surface, #fff); }
.btn.outline { border: 1rpx solid var(--brand); background: var(--surface, #fff); }
.btn-t-brand { color: var(--brand); font-weight: 500; }
.btn.primary { background: var(--brand); border: 1rpx solid var(--brand); }
.btn-t-light { color: #fff; font-weight: 500; }
.btn.disabled { opacity: 0.5; }
.btn.flex1 { flex: 1; height: 76rpx; }

/* ── 骨架屏 ── */
.sk-list { display: flex; flex-direction: column; gap: 24rpx; }
.sk-card { background: var(--surface, #fff); border-radius: 24rpx; padding: 24rpx; animation: sk-pulse 1.2s ease-in-out infinite; }
.sk-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.sk-body { display: flex; gap: 20rpx; }
.sk-thumb { width: 140rpx; height: 140rpx; border-radius: 16rpx; background: var(--surface-sunken, #f2efea); flex-shrink: 0; }
.sk-lines { flex: 1; display: flex; flex-direction: column; gap: 18rpx; padding-top: 6rpx; }
.sk-foot { display: flex; align-items: center; justify-content: flex-end; gap: 16rpx; margin-top: 24rpx; }
.sk-foot .sk-bar { margin-right: auto; }
.sk-bar { height: 26rpx; border-radius: 8rpx; background: var(--surface-sunken, #f2efea); }
.sk-pill { width: 140rpx; height: 56rpx; border-radius: 999rpx; background: var(--surface-sunken, #f2efea); }
.sk-full { width: 100%; }
.sk-w300 { width: 300rpx; }
.sk-w220 { width: 220rpx; }
.sk-w180 { width: 180rpx; }
.sk-w160 { width: 160rpx; }
.sk-w100 { width: 100rpx; }
@keyframes sk-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

/* ── 空态 / 错误态 ── */
.empty, .error-state { display: flex; flex-direction: column; align-items: center; padding: 140rpx 0 120rpx; }
.empty-icon-wrap {
  position: relative; width: 200rpx; height: 200rpx; border-radius: 50%;
  background: var(--brand-soft, rgba(196,30,58,0.08));
  display: flex; align-items: center; justify-content: center;
}
.empty-dot { position: absolute; border-radius: 50%; background: var(--gold, #c9a96e); opacity: 0.4; }
.empty-dot-a { width: 24rpx; height: 24rpx; top: 8rpx; right: 18rpx; }
.empty-dot-b { width: 14rpx; height: 14rpx; bottom: 22rpx; left: 6rpx; opacity: 0.55; }
.empty-title { font-size: 30rpx; font-weight: 600; color: var(--text-strong, #2c2c2c); margin-top: 32rpx; }
.empty-sub { font-size: 24rpx; color: var(--text-soft, #999); margin-top: 12rpx; }
.error-text { font-size: 28rpx; color: var(--text, #666); margin-top: 32rpx; }
.empty-btn {
  position: relative; margin-top: 40rpx; height: 72rpx; padding: 0 64rpx;
  border-radius: 999rpx; background: var(--brand);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6rpx 16rpx rgba(196, 30, 58, 0.25);
}
.empty-btn-text { position: relative; z-index: 1; font-size: 28rpx; font-weight: 500; color: #fff; }

/* ── 取消弹窗 ── */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { width: 600rpx; background: var(--surface, #fff); border-radius: 24rpx; overflow: hidden; }
.dialog-head { padding: 28rpx; border-bottom: 1rpx solid var(--line, #e8e0d5); }
.dialog-title { font-size: 32rpx; font-weight: 600; color: var(--text-strong, #2c2c2c); text-align: center; display: block; }
.dialog-body { padding: 24rpx; }
.dialog-tip { font-size: 26rpx; color: var(--text, #666); margin-bottom: 16rpx; display: block; }
.reason { padding: 24rpx; border-radius: 12rpx; margin-bottom: 16rpx; background: var(--bg-paper, #faf8f5); }
.reason.active { background: var(--brand-soft, rgba(196,30,58,0.08)); border: 1rpx solid var(--brand); }
.reason-text { font-size: 28rpx; color: var(--text-strong, #2c2c2c); }
.reason-text.active { color: var(--brand); font-weight: 500; }
.dialog-foot { display: flex; gap: 24rpx; padding: 24rpx; border-top: 1rpx solid var(--line, #e8e0d5); }
</style>
