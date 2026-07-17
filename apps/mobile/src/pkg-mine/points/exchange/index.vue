<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  pointsApi,
  exchangeTypeLabels,
  type PointsExchangeItem,
  type ExchangeType,
} from '@/lib/points-data'

const info = ref({ balance: 0, totalEarned: 0, totalSpent: 0, todayEarned: 0 })
const exchangeItems = ref<PointsExchangeItem[]>([])
const loading = ref(true)
const error = ref('')
const activeType = ref<ExchangeType | 'all'>('all')
const exchanging = ref<string | null>(null)
const successId = ref<string | null>(null)
const submitting = ref(false)

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

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [pointsInfo, items] = await Promise.all([
      pointsApi.getInfo(),
      pointsApi.getExchangeItems(),
    ])
    info.value = pointsInfo
    exchangeItems.value = items
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function retry() {
  fetchData()
}

onMounted(() => {
  fetchData()
})

function goBack() {
  uni.navigateBack()
}
// 统一走 @/utils/router 的 navigateTo（自带失败兜底 toast），替代裸 uni.navigateTo
function go(url: string) {
  navigateTo(url)
}
function typeLabel(t: ExchangeType) {
  return exchangeTypeLabels[t]
}
function fmt(n: number) {
  return n.toLocaleString()
}
/* —— 兑换确认弹窗（对齐 points 首页范式）——
 * 兑换说明写明「不支持退换」，原实现单击立即扣积分无确认，且失败静默吞错。
 * 现改为：点卡片按钮 → 确认弹窗 → 确认后调后端；失败 toast 后端 message（兜底「兑换失败，请重试」）。 */
const showExchangeModal = ref(false)
const selectedItem = ref<PointsExchangeItem | null>(null)
const exchangeSuccess = ref(false)

function handleExchange(item: PointsExchangeItem) {
  if (submitting.value || info.value.balance < item.points) return
  selectedItem.value = item
  showExchangeModal.value = true
}
function closeExchangeModal() {
  if (exchangeSuccess.value || submitting.value) return
  showExchangeModal.value = false
  selectedItem.value = null
}
async function confirmExchange() {
  const item = selectedItem.value
  if (!item || submitting.value) return
  exchanging.value = item.id
  submitting.value = true
  try {
    const res = await pointsApi.exchange(item.id)
    if (res.success) {
      info.value.balance -= item.points
      info.value.totalSpent += item.points
      exchangeSuccess.value = true
      successId.value = item.id
      setTimeout(() => {
        showExchangeModal.value = false
        exchangeSuccess.value = false
        selectedItem.value = null
        successId.value = null
      }, 2000)
    } else {
      showExchangeModal.value = false
      selectedItem.value = null
      uni.showToast({ title: res.message || '兑换失败，请重试', icon: 'none' })
    }
  } catch (e) {
    showExchangeModal.value = false
    selectedItem.value = null
    uni.showToast({ title: (e as Error)?.message || '兑换失败，请重试', icon: 'none' })
  } finally {
    exchanging.value = null
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <view class="nav">
      <view class="nav-back" @tap="goBack">
        <AppIcon name="arrow-left" :size="44" color="#2D2A26" />
      </view>
      <text class="nav-title">积分兑换</text>
      <text class="nav-link" @tap="go('/pkg-mine/points/history/index')">记录</text>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-else-if="error" class="error-state">
      <text>{{ error }}</text>
      <view class="retry-btn" @tap="retry">重试</view>
    </view>
    <view v-else-if="!exchangeItems.length" class="empty"><text>暂无兑换商品</text></view>
    <scroll-view v-else scroll-y class="scroll">
      <!-- 积分余额 -->
      <view class="balance">
        <view>
          <text class="balance-label">当前积分</text>
          <text class="balance-num">{{ info.balance.toLocaleString() }}</text>
        </view>
        <view class="balance-btn" @tap="go('/pkg-mine/points/tasks/index')">
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
          <text class="card-stock">{{ item.stock < 0 ? '不限量' : `库存 ${item.stock > 100 ? '充足' : item.stock}` }}</text>
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
        <text class="note-item">• 兑换后奖励将由系统发放到账户/卡券中心</text>
        <text class="note-item">• 实物奖品将在 3-7 个工作日内寄出</text>
        <text class="note-item">• 兑换不支持退换，请谨慎操作</text>
      </view>
      <view class="bottom-space" />
    </scroll-view>

    <!-- 兑换确认弹窗（对齐 points 首页同功能范式） -->
    <view v-if="showExchangeModal && selectedItem" class="modal-mask" @tap="closeExchangeModal">
      <view class="modal" @tap.stop>
        <template v-if="!exchangeSuccess">
          <view class="modal-icon">
            <AppIcon name="gift" :size="32" color="#c9a96e" />
          </view>
          <text class="modal-title">确认兑换</text>
          <text class="modal-sub">使用 {{ selectedItem.points }}积分 兑换，兑换后不支持退换</text>
          <view class="modal-card">
            <text class="modal-card-text">{{ selectedItem.title }}</text>
          </view>
          <text class="modal-balance">兑换后积分余额：{{ fmt(info.balance - selectedItem.points) }}</text>
          <view class="modal-actions">
            <view class="modal-btn modal-btn-cancel" @tap="closeExchangeModal">
              <text class="modal-btn-text">取消</text>
            </view>
            <view class="modal-btn modal-btn-confirm" @tap="confirmExchange">
              <text class="modal-btn-text modal-btn-text-light">{{ submitting ? '兑换中...' : '确认兑换' }}</text>
            </view>
          </view>
        </template>
        <template v-else>
          <view class="modal-icon modal-icon-success">
            <AppIcon name="check-circle" :size="32" color="#22c55e" />
          </view>
          <text class="modal-title">兑换成功</text>
          <text class="modal-sub">{{ selectedItem.title }} 已发放至您的账户</text>
        </template>
      </view>
    </view>
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
  min-width: 48rpx;
  white-space: nowrap;
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
.loading { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: #8a8178; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); color: #fff; border-radius: 12rpx; font-size: 26rpx; }
.empty { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: #8a8178; }

/* 兑换确认弹窗（样式对齐 points 首页） */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  width: 85%;
  max-width: 560rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.modal-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: rgba(201, 169, 110, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.modal-icon-success {
  background: rgba(34, 197, 94, 0.1);
}
.modal-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2d2a26;
}
.modal-sub {
  font-size: 26rpx;
  color: #8a8178;
  margin-top: 8rpx;
  text-align: center;
}
.modal-card {
  width: 100%;
  background: rgba(236, 231, 223, 0.5);
  border-radius: 16rpx;
  padding: 24rpx;
  margin: 28rpx 0;
}
.modal-card-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #2d2a26;
  text-align: center;
  display: block;
}
.modal-balance {
  font-size: 22rpx;
  color: #8a8178;
  margin-bottom: 28rpx;
}
.modal-actions {
  display: flex;
  gap: 24rpx;
  width: 100%;
}
.modal-btn {
  flex: 1;
  padding: 22rpx 0;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-btn-cancel {
  background: #ece7df;
}
.modal-btn-confirm {
  background: #9a2e22;
}
.modal-btn-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #2d2a26;
}
.modal-btn-text-light {
  color: #fff;
}
</style>
