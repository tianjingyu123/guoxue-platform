<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import {
  pointsApi,
  exchangeTypeLabels,
  type PointsInfo,
  type PointsExchangeItem,
  type ExchangeType,
} from '@/lib/points-data'

const { data: pageData, isLoading, loadError, reload } = useAsyncData(async () => {
  const [infoData, items] = await Promise.all([pointsApi.getPoints(), pointsApi.getExchangeItems()])
  return { info: infoData, exchangeItems: items }
})

const dataIsEmpty = computed(() => {
  const raw = pageData.value
  return raw != null && raw.info === undefined
})

const info = ref<PointsInfo>({ balance: 0, totalEarned: 0, totalSpent: 0, todayEarned: 0 })
const exchangeItems = ref<PointsExchangeItem[]>([])

watch(() => pageData.value, (val) => {
  if (val) {
    info.value = { ...val.info }
    exchangeItems.value = val.exchangeItems.map((e: any) => ({ ...e }))
  }
}, { immediate: true })

const activeType = ref<ExchangeType | 'all'>('all')
const exchanging = ref<number | null>(null)
const successId = ref<number | null>(null)

const tabs: { key: ExchangeType | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'coupon', label: '优惠券' },
  { key: 'coin', label: '国学币' },
  { key: 'vip', label: '会员' },
  { key: 'gift', label: '实物' },
]

const filteredItems = computed(() =>
  exchangeItems.value.filter((item) => (activeType.value === 'all' ? true : item.type === activeType.value)),
)

function goBack() {
  uni.navigateBack()
}
function go(url: string) {
  uni.navigateTo({ url })
}
function typeLabel(t: ExchangeType) {
  return exchangeTypeLabels[t]
}
function handleExchange(item: PointsExchangeItem) {
  if (info.value.balance < item.points || exchanging.value !== null) return
  exchanging.value = item.id
  setTimeout(() => {
    info.value.balance -= item.points
    info.value.totalSpent += item.points
    successId.value = item.id
    exchanging.value = null
    setTimeout(() => (successId.value = null), 2000)
  }, 400)
}
</script>

<template>
  <view v-if="isLoading" class="page">
    <view style="padding: 24rpx;">
      <AppSkeleton width="100%" height="88rpx" radius="0" mb="24rpx" />
      <AppSkeleton width="100%" height="100rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="60rpx" radius="0" mb="24rpx" />
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="dataIsEmpty" title="暂无数据" />
  <view v-else class="page">
    <view class="nav">
      <view class="nav-back" @tap="goBack">
        <AppIcon name="arrow-left" :size="44" color="#2D2A26" />
      </view>
      <text class="nav-title">积分兑换</text>
      <text class="nav-link" @tap="go('/pkg-mine/points/history')">记录</text>
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 积分余额 -->
      <view class="balance">
        <view>
          <text class="balance-label">当前积分</text>
          <text class="balance-num">{{ info.balance.toLocaleString() }}</text>
        </view>
        <view class="balance-btn" @tap="go('/pkg-mine/points/tasks')">
          <text class="balance-btn-text">去做任务获取积分</text>
        </view>
      </view>

      <!-- 分类筛选 -->
      <scroll-view scroll-x class="tabs" :show-scrollbar="false">
        <view class="tabs-inner">
          <view
            v-for="tab in tabs"
            :key="tab.key"
            class="tab"
            :class="{ 'tab-active': activeType === tab.key }"
            @tap="activeType = tab.key"
          >
            <text class="tab-text" :class="{ 'tab-text-active': activeType === tab.key }">{{ tab.label }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 兑换商品网格 -->
      <view class="grid">
        <view
          v-for="item in filteredItems"
          :key="item.id"
          class="card"
          :class="{ disabled: info.balance < item.points }"
        >
          <view class="card-icon">
            <AppIcon :name="item.icon" :size="26" :color="item.color" />
          </view>
          <text class="card-title">{{ item.title }}</text>
          <text class="card-type">{{ typeLabel(item.type) }}</text>
          <text class="card-points">{{ item.points.toLocaleString() }} 积分</text>
          <text class="card-stock">库存 {{ item.stock > 100 ? '充足' : item.stock }}</text>
          <view
            class="card-btn"
            :class="{
              'card-btn-success': successId === item.id,
              'card-btn-disabled': info.balance < item.points && successId !== item.id,
            }"
            @tap="handleExchange(item)"
          >
            <view v-if="successId === item.id" class="card-btn-inner">
              <AppIcon name="check-circle" :size="13" color="#fff" />
              <text class="card-btn-text">兑换成功</text>
            </view>
            <text v-else-if="exchanging === item.id" class="card-btn-text">兑换中...</text>
            <text v-else-if="info.balance >= item.points" class="card-btn-text">立即兑换</text>
            <text v-else class="card-btn-text card-btn-text-muted">积分不足</text>
          </view>
        </view>
      </view>

      <!-- 说明 -->
      <view class="note">
        <text class="note-title">兑换说明</text>
        <text class="note-item">• 优惠券和国学币兑换后实时到账</text>
        <text class="note-item">• 实物奖品将在 3-7 个工作日内寄出</text>
        <text class="note-item">• 兑换不支持退换，请谨慎操作</text>
      </view>
      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: rgba(250, 248, 245, 0.95);
  border-bottom: 2rpx solid rgba(201, 169, 110, 0.2);
}
.nav-back {
  width: 48rpx;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2d2a26;
}
.nav-link {
  font-size: 28rpx;
  color: #9a2e22;
  width: 48rpx;
  text-align: right;
}
.scroll {
  height: calc(100vh - 92rpx);
}
.balance {
  margin: 32rpx;
  padding: 32rpx;
  background: #fdf6e9;
  border: 2rpx solid #f0dcae;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.balance-label {
  font-size: 22rpx;
  color: #b8923f;
  display: block;
  margin-bottom: 6rpx;
}
.balance-num {
  font-size: 60rpx;
  font-weight: 700;
  color: #a67c1a;
}
.balance-btn {
  background: #f5e6c4;
  border-radius: 32rpx;
  padding: 14rpx 24rpx;
}
.balance-btn-text {
  font-size: 22rpx;
  color: #b8923f;
}
.tabs {
  white-space: nowrap;
  padding: 0 32rpx;
}
.tabs-inner {
  display: inline-flex;
  gap: 16rpx;
}
.tab {
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  background: #ece7df;
}
.tab-active {
  background: #c9a96e;
}
.tab-text {
  font-size: 26rpx;
  color: #2d2a26;
}
.tab-text-active {
  color: #fff;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
  padding: 32rpx;
}
.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.disabled {
  opacity: 0.6;
}
.card-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #f7f3ec;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}
.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2d2a26;
  margin-bottom: 8rpx;
}
.card-type {
  font-size: 20rpx;
  color: #8a8178;
  background: #f2ede4;
  border-radius: 12rpx;
  padding: 2rpx 14rpx;
  margin-bottom: 20rpx;
}
.card-points {
  font-size: 32rpx;
  font-weight: 700;
  color: #d97706;
  margin-bottom: 6rpx;
}
.card-stock {
  font-size: 22rpx;
  color: #8a8178;
  margin-bottom: 20rpx;
}
.card-btn {
  width: 100%;
  height: 56rpx;
  border-radius: 28rpx;
  background: #c9a96e;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-btn-success {
  background: #22c55e;
}
.card-btn-disabled {
  background: #ece7df;
}
.card-btn-inner {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.card-btn-text {
  font-size: 22rpx;
  color: #fff;
}
.card-btn-text-muted {
  color: #8a8178;
}
.note {
  margin: 16rpx 32rpx 0;
  padding: 28rpx;
  background: rgba(236, 231, 223, 0.5);
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.note-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #2d2a26;
  margin-bottom: 8rpx;
}
.note-item {
  font-size: 22rpx;
  color: #8a8178;
  line-height: 1.5;
}
.bottom-space {
  height: 48rpx;
}
</style>
