<!--
  B4 · 订单管理（列表·V0 视觉稿 1:1 还原）
  态A 订单列表：按状态 Tab(全部/待付款/待发货/待收货/已完成/退款) + 订单卡
  规格红线：商家只做发货与查看；退款/售后审批由平台处理，商家侧仅展示进度
  视觉 token：宣纸白#FAF8F5 / 卡片白#FFF / 朱红#C41E3A / 金#C9A96E
-->
<template>
  <view class="page">
    <!-- 品牌头（朱红渐变） -->
    <view class="nav" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @tap="go('/merchant/dashboard')">
          <AppIcon name="arrow-left" :size="20" color="#ffffff" />
        </view>
        <text class="nav-title">订单管理</text>
      </view>
    </view>

    <!-- 状态 Tab -->
    <view class="tabs" :style="{ top: statusBarH + 48 + 'px' }">
      <scroll-view scroll-x class="tabs-scroll" :show-scrollbar="false">
        <view class="tabs-row">
          <view
            v-for="t in tabs"
            :key="t.key"
            class="tab"
            :class="{ on: activeTab === t.key }"
            @tap="switchTab(t.key)"
          >
            <text class="tab-txt">{{ t.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: statusBarH + 48 + 44 + 'px' }">
      <!-- 加载态 -->
      <view v-if="loading" class="state">
        <text class="state-txt">加载中…</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="error" class="state">
        <AppIcon name="alert-circle" :size="44" color="#C41E3A" />
        <text class="state-title">加载失败</text>
        <text class="state-txt">{{ error }}</text>
        <view class="state-btn" @tap="load"><text>重试</text></view>
      </view>
      <!-- 空态 -->
      <view v-else-if="filteredOrders.length === 0" class="empty">
        <view class="empty-ic">
          <AppIcon name="package" :size="40" color="#C9A96E" />
        </view>
        <text class="empty-title">还没有订单</text>
        <text class="empty-sub">上架优质商品后，买家下单会自动出现在这里。先去发布你的第一个商品吧。</text>
        <view class="empty-btn" @tap="go('/merchant/product-edit')">
          <text>去发布商品</text>
        </view>
      </view>

      <!-- 订单列表 -->
      <view v-else class="list">
        <view
          v-for="o in filteredOrders"
          :key="o.id"
          class="order"
          @tap="goDetail(o.id)"
        >
          <!-- 顶部：订单号 + 状态 -->
          <view class="order-top">
            <text class="order-no">订单号 {{ o.id }}</text>
            <text class="status" :class="statusTone(o.status)">{{ statusCfg[o.status].label }}</text>
          </view>

          <!-- 商品行 -->
          <view class="goods">
            <image
              v-if="o.productImage"
              class="goods-img"
              :src="o.productImage"
              mode="aspectFill"
              lazy-load
            />
            <view v-else class="goods-img goods-img-ph">
              <AppIcon name="package" :size="24" color="#B0A088" />
            </view>
            <view class="goods-info">
              <text class="goods-name">{{ o.productTitle || '商品' }}</text>
              <text class="goods-spec">{{ o.buyerNickname || '匿名买家' }}</text>
            </view>
            <view class="goods-price">
              <text class="goods-p">¥{{ money(o.amount) }}</text>
              <text class="goods-q">×1</text>
            </view>
          </view>

          <!-- 底部：合计 + 操作 -->
          <view class="order-foot">
            <text class="total">合计 <text class="total-b">¥{{ money(o.amount) }}</text></text>
            <view v-if="o.status === 'PAID'" class="btn btn-primary" @tap.stop="goDetail(o.id)">
              <text>去发货</text>
            </view>
            <view v-else-if="o.status === 'REFUNDED'" class="btn btn-primary" @tap.stop="goDetail(o.id)">
              <text>处理退款</text>
            </view>
            <view v-else class="btn btn-ghost" @tap.stop="goDetail(o.id)">
              <text>查看详情</text>
            </view>
          </view>
        </view>

        <view style="height: 40rpx" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  merchantBackendApi,
  orderStatusConfig,
  type MerchantOrder,
  type MerchantOrderStatus,
} from '@/lib/merchant-data'

const statusBarH = ref(0)
uni.getSystemInfo({ success: (e) => { statusBarH.value = e.statusBarHeight || 0 } })

const statusCfg = orderStatusConfig

// tab key：'all' 不传 status；其余直接映射后端订单状态
type TabKey = 'all' | MerchantOrderStatus
const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'PENDING', label: '待付款' },
  { key: 'PAID', label: '待发货' },
  { key: 'SHIPPED', label: '待收货' },
  { key: 'COMPLETED', label: '已完成' },
  { key: 'REFUNDED', label: '退款' },
]

const orders = ref<MerchantOrder[]>([])
const loading = ref(true)
const error = ref('')
const activeTab = ref<TabKey>('all')

onLoad((opts) => {
  if (opts?.status && tabs.some((t) => t.key === opts.status)) activeTab.value = opts.status as TabKey
  load()
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await merchantBackendApi.getOrders({
      status: activeTab.value === 'all' ? undefined : activeTab.value,
      page: 1,
      pageSize: 50,
    })
    orders.value = res.items
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function switchTab(key: TabKey) {
  if (activeTab.value === key) return
  activeTab.value = key
  load()
}

const filteredOrders = computed(() => orders.value)

// 状态色调映射到视觉稿三色（朱红待办 / 金已发 / 灰完成）
function statusTone(s: MerchantOrderStatus): string {
  if (s === 'PENDING' || s === 'PAID' || s === 'REFUNDED') return 'wait'
  if (s === 'SHIPPED') return 'sent'
  return 'done'
}

function money(v: string | number | null | undefined) {
  return Number(v ?? 0).toFixed(2)
}
function goDetail(id: string) {
  navigateTo(`/merchant/order-detail?id=${id}`)
}
function go(path: string) {
  navigateTo(path)
}
</script>

<style lang="scss" scoped>
$paper: #faf8f5;
$card: #ffffff;
$red: #c41e3a;
$red-dark: #a01830;
$gold: #c9a96e;
$t1: #2c2c2c;
$t2: #6e6e73;
$t3: #999999;
$line: #edeae4;

.page {
  min-height: 100vh;
  background: $paper;
}

/* 品牌头 */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: linear-gradient(135deg, $red, $red-dark);
}
.nav-inner {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
}
.nav-back {
  width: 56rpx;
  height: 48px;
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

/* Tab */
.tabs {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 40;
  background: $card;
  border-bottom: 1px solid $line;
}
.tabs-scroll {
  width: 100%;
  white-space: nowrap;
}
.tabs-row {
  display: flex;
  padding: 0 8rpx;
}
.tab {
  flex-shrink: 0;
  padding: 13px 20rpx 0;
  height: 44px;
  box-sizing: border-box;
  position: relative;
}
.tab-txt {
  font-size: 13px;
  color: $t2;
}
.tab.on .tab-txt {
  color: $red;
  font-weight: 600;
}
.tab.on::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: $red;
  border-radius: 2px;
}

.scroll {
  height: 100vh;
  box-sizing: border-box;
}

/* 列表 */
.list {
  padding: 32rpx 40rpx 60rpx;
}
.order {
  background: $card;
  border-radius: 18px;
  padding: 28rpx;
  margin-bottom: 28rpx;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.order-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20rpx;
  border-bottom: 1px dashed $line;
}
.order-no {
  font-size: 12px;
  color: $t3;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 12rpx;
}
.status {
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}
.status.wait {
  color: $red;
}
.status.sent {
  color: $gold;
}
.status.done {
  color: $t2;
}

.goods {
  display: flex;
  gap: 24rpx;
  padding: 24rpx 0;
}
.goods-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12px;
  background: linear-gradient(135deg, #e8dfd3, #d8ccb8);
  flex-shrink: 0;
}
.goods-img-ph {
  display: flex;
  align-items: center;
  justify-content: center;
}
.goods-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.goods-name {
  font-size: 14px;
  color: $t1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goods-spec {
  font-size: 12px;
  color: $t3;
  margin-top: 8rpx;
}
.goods-price {
  text-align: right;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.goods-p {
  color: $red;
  font-size: 14px;
  font-weight: 600;
}
.goods-q {
  font-size: 12px;
  color: $t3;
  margin-top: 4rpx;
}

.order-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  border-top: 1px dashed $line;
}
.total {
  font-size: 13px;
  color: $t2;
}
.total-b {
  color: $red;
  font-size: 16px;
  font-weight: 700;
}
.btn {
  border-radius: 999px;
  padding: 14rpx 36rpx;
}
.btn text {
  font-size: 13px;
}
.btn-primary {
  background: $red;
}
.btn-primary text {
  color: #fff;
}
.btn-ghost {
  background: #fff;
  border: 1px solid #ddd;
}
.btn-ghost text {
  color: $t2;
}

/* 加载/错误态 */
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
  gap: 12px;
}
.state-title {
  font-size: 16px;
  font-weight: 600;
  color: $t1;
  margin-top: 4px;
}
.state-txt {
  font-size: 14px;
  color: $t3;
  text-align: center;
  line-height: 1.5;
}
.state-btn {
  margin-top: 8px;
  padding: 16rpx 48rpx;
  border: 1px solid $line;
  border-radius: 999px;
  background: #fff;
}
.state-btn text {
  font-size: 14px;
  color: $red;
}

/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 140rpx 48rpx;
  text-align: center;
}
.empty-ic {
  width: 176rpx;
  height: 176rpx;
  border-radius: 50%;
  background: #f5f1ea;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 36rpx;
}
.empty-title {
  font-size: 16px;
  font-weight: 700;
  color: $t1;
  margin-bottom: 16rpx;
}
.empty-sub {
  font-size: 12px;
  color: $t3;
  line-height: 1.7;
  max-width: 460rpx;
  margin-bottom: 44rpx;
}
.empty-btn {
  background: $red;
  border-radius: 999px;
  padding: 22rpx 56rpx;
}
.empty-btn text {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}
</style>
