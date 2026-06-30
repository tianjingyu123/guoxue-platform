<template>
  <view class="page">
    <view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="44" color="#2C2C2C" />
        </view>
        <text class="nav-title">我的售后</text>
        <view class="nav-placeholder" />
      </view>
      <view class="tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          @tap="activeTab = tab.key"
        >
          <text class="tab-text" :class="{ active: activeTab === tab.key }">{{ tab.label }}</text>
          <view v-if="activeTab === tab.key" class="tab-bar" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll-area" :style="{ paddingTop: navHeight + 'px' }">
      <view v-if="loading" class="loading-state">加载中...</view>
      <view v-else-if="error" class="error-state">
        <text>{{ error }}</text>
        <view @tap="fetchData">重试</view>
      </view>
      <template v-else>
        <view v-if="filtered.length === 0" class="empty">
          <view class="empty-icon">
            <app-icon name="package" :size="80" color="#999999" />
          </view>
          <text class="empty-text">暂无售后记录</text>
          <view class="empty-btn" @tap="navigateTo('/orders')">
            <text class="empty-btn-text">查看订单</text>
          </view>
        </view>

        <view
          v-for="item in filtered"
          :key="item.id"
          class="as-card"
        >
          <view class="as-head">
            <view class="as-head-left">
              <view class="as-status" :style="{ color: sCfg(item.status).color, background: sCfg(item.status).bg }">
                <app-icon :name="sCfg(item.status).icon" :size="22" :color="sCfg(item.status).color" />
                <text class="as-status-text" :style="{ color: sCfg(item.status).color }">{{ sCfg(item.status).label }}</text>
              </view>
              <text class="as-type">{{ item.type === 'refund_only' ? '仅退款' : '退货退款' }}</text>
            </view>
            <text class="as-time">{{ item.createdAt }}</text>
          </view>

          <view class="as-body" @tap="navigateTo(`/shop/after-sale/${item.id}`)">
            <image lazy-load class="as-cover" :src="item.product.cover" mode="aspectFill" />
            <view class="as-info">
              <text class="as-name">{{ item.product.name }}</text>
              <text class="as-sku">{{ item.product.skuName }}</text>
              <view class="as-foot">
                <view class="as-amount">
                  <text class="amount-label">退款金额：</text>
                  <text class="amount-value">¥{{ item.amount }}</text>
                </view>
                <app-icon name="chevron-right" :size="28" color="#999999" />
              </view>
            </view>
          </view>

          <view v-if="item.canCancel" class="as-actions">
            <view class="act-btn ghost" @tap="confirmCancel(item.id)">
              <text class="act-text">取消售后</text>
            </view>
            <view class="act-btn primary" @tap="navigateTo(`/shop/after-sale/${item.id}`)">
              <text class="act-text-primary">查看进度</text>
            </view>
          </view>
          <view v-else-if="item.status === 'rejected'" class="as-actions">
            <view class="act-btn outline" @tap="navigateTo(`/shop/after-sale-rejected?id=${item.id}`)">
              <text class="act-text-outline">查看原因</text>
            </view>
            <view class="act-btn primary" @tap="navigateTo(`/shop/after-sale?orderId=${item.orderId}`)">
              <text class="act-text-primary">重新申请</text>
            </view>
          </view>
        </view>

        <view class="bottom-gap" />
      </template>
    </scroll-view>

    <!-- 取消确认弹窗 -->
    <view v-if="cancelId" class="mask mask-fade-in" @tap="cancelId = ''">
      <view class="confirm-box dialog-pop-in" @tap.stop>
        <view class="confirm-icon">
          <app-icon name="alert-circle" :size="48" color="#E8820C" />
        </view>
        <text class="confirm-title">确认取消售后？</text>
        <text class="confirm-desc">取消后如需继续申请，请重新提交</text>
        <view class="confirm-actions">
          <view class="confirm-btn ghost" @tap="cancelId = ''">
            <text class="confirm-btn-text">再想想</text>
          </view>
          <view class="confirm-btn primary" @tap="doCancel">
            <text class="confirm-btn-text-primary">确认取消</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack, navigateTo } from '@/utils/router'
import { accountApi, afterSaleTabs, afterSaleStatusConfig, type AfterSaleListItem } from '@/lib/account-data'

const statusBarHeight = ref(20)
const navHeight = ref(108)

const tabs = afterSaleTabs
const activeTab = ref('')
const list = ref<AfterSaleListItem[]>([])
const cancelId = ref('')
const loading = ref(false)
const error = ref('')

const filtered = computed(() => {
  if (!activeTab.value) return list.value
  if (activeTab.value === 'pending') {
    return list.value.filter((i) => ['pending', 'approved', 'refunding'].includes(i.status))
  }
  return list.value.filter((i) => i.status === activeTab.value)
})

function sCfg(status: string) {
  return afterSaleStatusConfig[status] || { label: status, color: '#999', bg: '#F5F5F5', icon: 'clock' }
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const data = await accountApi.afterSales()
    list.value = data || []
  } catch (e: any) {
    error.value = e?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
    navHeight.value = statusBarHeight.value + 44 + 44
  } catch (e) {
    statusBarHeight.value = 20
    navHeight.value = 108
  }
  fetchData()
})

function confirmCancel(id: string) {
  cancelId.value = id
}
const cancelling = ref(false)
async function doCancel() {
  if (cancelling.value) return
  const id = cancelId.value
  cancelling.value = true
  try {
    await accountApi.cancelAfterSale(id)
    list.value = list.value.map((i) =>
      i.id === id ? { ...i, status: 'cancelled' as const, canCancel: false } : i,
    )
    cancelId.value = ''
    uni.showToast({ title: '已取消', icon: 'none' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '取消失败', icon: 'none' })
  } finally {
    cancelling.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #FAF8F5;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #FFFFFF;
  border-bottom: 1rpx solid #E8E3DB;
}
.nav-bar {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 12px;
}
.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.nav-placeholder {
  width: 60rpx;
}
.tabs {
  display: flex;
  height: 44px;
  padding: 0 24rpx;
  border-top: 1rpx solid #E8E3DB;
}
.tab-item {
  position: relative;
  margin-right: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tab-text {
  font-size: 28rpx;
  color: #666666;
}
.tab-text.active {
  color: var(--brand);
  font-weight: 500;
}
.tab-bar {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  border-radius: 2rpx;
  background: var(--brand);
}

.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 140rpx;
}
.empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #F5F0EA;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #666666;
  margin-bottom: 28rpx;
}
.empty-btn {
  padding: 16rpx 48rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.empty-btn-text {
  font-size: 26rpx;
  color: #FFFFFF;
}

.as-card {
  margin: 24rpx 24rpx 0;
  background: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
}
.as-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 1rpx solid #E8E3DB;
}
.as-head-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.as-status {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}
.as-status-text {
  font-size: 22rpx;
}
.as-type {
  font-size: 22rpx;
  color: #999999;
}
.as-time {
  font-size: 22rpx;
  color: #999999;
}

.as-body {
  display: flex;
  gap: 20rpx;
  padding: 24rpx;
}
.as-cover {
  width: 150rpx;
  height: 150rpx;
  border-radius: 16rpx;
  background: #FAF8F5;
}
.as-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.as-name {
  font-size: 28rpx;
  color: #2C2C2C;
  line-height: 1.4;
}
.as-sku {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999999;
}
.as-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}
.as-amount {
  display: flex;
  align-items: baseline;
}
.amount-label {
  font-size: 24rpx;
  color: #666666;
}
.amount-value {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--brand);
}

.as-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  padding: 24rpx;
  border-top: 1rpx solid #E8E3DB;
}
.act-btn {
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
}
.act-btn.ghost {
  border: 1rpx solid #E8E3DB;
}
.act-btn.outline {
  border: 1rpx solid var(--brand);
}
.act-btn.primary {
  background: var(--brand);
}
.act-text {
  font-size: 26rpx;
  color: #666666;
}
.act-text-outline {
  font-size: 26rpx;
  color: var(--brand);
}
.act-text-primary {
  font-size: 26rpx;
  color: #FFFFFF;
}

.bottom-gap {
  height: 40rpx;
}

.mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-box {
  width: 600rpx;
  padding: 48rpx 40rpx 40rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.confirm-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(232, 130, 12, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.confirm-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
  margin-bottom: 12rpx;
}
.confirm-desc {
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 40rpx;
}
.confirm-actions {
  display: flex;
  gap: 20rpx;
  width: 100%;
}
.confirm-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-btn.ghost {
  border: 1rpx solid #E8E3DB;
}
.confirm-btn.primary {
  background: var(--brand);
}
.confirm-btn-text {
  font-size: 28rpx;
  color: #666666;
}
.confirm-btn-text-primary {
  font-size: 28rpx;
  color: #FFFFFF;
}
</style>
