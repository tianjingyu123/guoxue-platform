<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  mineApi,
  type WalletTxRecord,
  type WalletTxCategory,
} from '@/lib/mine-data'

const loading = ref(true)
const error = ref('')
const balance = ref({ coin: 0, points: 0, frozen: 0 })
const allRecords = ref<WalletTxRecord[]>([])

// 筛选状态
const filterType = ref<'' | 'income' | 'expense'>('')
const selectedMonth = ref('')
const showMonthPicker = ref(false)
const showTypePicker = ref(false)

// 最近12个月
const months = Array.from({ length: 12 }, (_, i) => {
  const d = new Date()
  d.setMonth(d.getMonth() - i)
  return {
    value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
  }
})

const typeOptions = [
  { value: '' as const, label: '全部类型' },
  { value: 'income' as const, label: '收入' },
  { value: 'expense' as const, label: '支出' },
]

const monthLabel = computed(
  () => months.find((m) => m.value === selectedMonth.value)?.label || '全部月份',
)
const typeLabel = computed(
  () => typeOptions.find((t) => t.value === filterType.value)?.label || '全部类型',
)

// 类别图标/配色
const catIcon: Record<WalletTxCategory, string> = {
  purchase: 'shopping-bag',
  refund: 'refresh-cw',
  reward: 'gift',
  recharge: 'credit-card',
  withdraw: 'wallet',
  transfer: 'send',
  other: 'help-circle',
}
const catClass: Record<WalletTxCategory, string> = {
  purchase: 'cat-blue',
  refund: 'cat-green',
  reward: 'cat-yellow',
  recharge: 'cat-purple',
  withdraw: 'cat-orange',
  transfer: 'cat-pink',
  other: 'cat-gray',
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [wallet, records] = await Promise.all([
      mineApi.getWallet(),
      mineApi.getTransactions(),
    ])
    balance.value = { coin: wallet.balance, points: wallet.points, frozen: 0 }
    allRecords.value = records
  } catch (e: any) {
    error.value = e?.message || '加载失败'
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

// 过滤
const filtered = computed(() => {
  let list = allRecords.value
  if (filterType.value) list = list.filter((t) => t.type === filterType.value)
  if (selectedMonth.value)
    list = list.filter((t) => t.createdAt.slice(0, 7) === selectedMonth.value)
  return list
})

// 按日分组
const grouped = computed(() => {
  const groups: Record<string, { date: string; items: WalletTxRecord[] }> = {}
  for (const t of filtered.value) {
    const key = t.createdAt.slice(0, 10)
    if (!groups[key]) groups[key] = { date: key, items: [] }
    groups[key].items.push(t)
  }
  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date))
})

function formatGroupDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n))
  const today = new Date()
  const target = new Date(y, m - 1, d)
  const diff = Math.floor((today.getTime() - target.getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  return `${m}月${d}日`
}
function formatTime(dateStr: string) {
  return dateStr.slice(5).replace('-', '月').replace(' ', '日 ')
}

function selectMonth(v: string) {
  selectedMonth.value = v
  showMonthPicker.value = false
}
function selectType(v: '' | 'income' | 'expense') {
  filterType.value = v
  showTypePicker.value = false
}
function closePickers() {
  showMonthPicker.value = false
  showTypePicker.value = false
}
function openDetail(id: string) {
  navigateTo(`/wallet/transactions/${id}`)
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航(红色渐变) -->
    <view class="topbar">
      <view class="back-btn" @tap="goBack">
        <app-icon name="chevron-left" :size="44" color="#FFFFFF" />
      </view>
      <text class="topbar-title">交易记录</text>
    </view>

    <!-- 余额卡 -->
    <view class="balance-card">
      <view class="bal-left">
        <text class="bal-label">学习币余额</text>
        <text class="bal-coin">{{ balance.coin.toLocaleString() }}</text>
        <text v-if="balance.frozen > 0" class="bal-frozen">冻结: {{ balance.frozen }}</text>
      </view>
      <view class="bal-right">
        <text class="bal-label">积分</text>
        <text class="bal-points">{{ balance.points.toLocaleString() }}</text>
      </view>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-item">
        <view
          class="filter-chip"
          @tap="((showMonthPicker = !showMonthPicker), (showTypePicker = false))"
        >
          <text>{{ monthLabel }}</text>
          <app-icon name="chevron-down" :size="28" color="#999999" />
        </view>
        <view v-if="showMonthPicker" class="dropdown month-dropdown">
          <view
            class="dropdown-item"
            :class="{ active: !selectedMonth }"
            @tap="selectMonth('')"
            >全部月份</view
          >
          <view
            v-for="m in months"
            :key="m.value"
            class="dropdown-item"
            :class="{ active: selectedMonth === m.value }"
            @tap="selectMonth(m.value)"
            >{{ m.label }}</view
          >
        </view>
      </view>

      <view class="filter-item">
        <view
          class="filter-chip"
          @tap="((showTypePicker = !showTypePicker), (showMonthPicker = false))"
        >
          <text>{{ typeLabel }}</text>
          <app-icon name="chevron-down" :size="28" color="#999999" />
        </view>
        <view v-if="showTypePicker" class="dropdown">
          <view
            v-for="opt in typeOptions"
            :key="opt.value"
            class="dropdown-item"
            :class="{ active: filterType === opt.value }"
            @tap="selectType(opt.value)"
            >{{ opt.label }}</view
          >
        </view>
      </view>
    </view>

    <!-- 加载/错误/列表 -->
    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-else-if="error" class="error-state">
      <text>{{ error }}</text>
      <view class="retry-btn" @tap="retry">重试</view>
    </view>
    <view v-else class="list-wrap">
      <view v-if="grouped.length === 0" class="empty">
        <view class="empty-icon">
          <app-icon name="wallet" :size="56" color="#d1d1d1" />
        </view>
        <text class="empty-txt">暂无交易记录</text>
      </view>

      <view v-else class="groups">
        <view v-for="g in grouped" :key="g.date" class="group">
          <text class="group-date">{{ formatGroupDate(g.date) }}</text>
          <view class="group-card">
            <view
              v-for="(t, idx) in g.items"
              :key="t.id"
              class="tx-item"
              :class="{ bordered: idx > 0 }"
              @tap="openDetail(t.id)"
            >
              <view class="tx-icon" :class="catClass[t.category]">
                <app-icon :name="catIcon[t.category]" :size="28" />
              </view>
              <view class="tx-info">
                <view class="tx-title-row">
                  <text class="tx-title">{{ t.title }}</text>
                  <app-icon
                    :name="t.type === 'income' ? 'arrow-down-left' : 'arrow-up-right'"
                    :size="26"
                    :color="t.type === 'income' ? '#22c55e' : '#ef4444'"
                  />
                </view>
                <text class="tx-desc">{{ t.description }}</text>
                <text class="tx-time">{{ formatTime(t.createdAt) }}</text>
              </view>
              <view class="tx-amount">
                <text class="tx-num" :class="{ income: t.type === 'income' }"
                  >{{ t.type === 'income' ? '+' : '' }}{{ t.amount.toLocaleString() }}</text
                >
                <text class="tx-bal">余额 {{ t.balance.toLocaleString() }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 点击外部关闭 -->
    <view
      v-if="showMonthPicker || showTypePicker"
      class="picker-mask"
      @tap="closePickers"
    />
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 顶部导航 */
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(90deg, #c41e3a, #e85a6b);
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 32rpx;
}
.back-btn {
  margin-left: -8rpx;
}
.topbar-title {
  font-size: 34rpx;
  font-weight: 500;
  color: #fff;
}

/* 余额卡 */
.balance-card {
  margin: 32rpx;
  background: linear-gradient(135deg, #c41e3a, #e85a6b);
  border-radius: 32rpx;
  padding: 32rpx;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  color: #fff;
}
.bal-left {
  display: flex;
  flex-direction: column;
}
.bal-label {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.7);
}
.bal-coin {
  font-size: 60rpx;
  font-weight: 700;
  margin-top: 8rpx;
}
.bal-frozen {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 8rpx;
}
.bal-right {
  text-align: right;
  display: flex;
  flex-direction: column;
}
.bal-points {
  font-size: 40rpx;
  font-weight: 500;
  margin-top: 8rpx;
}

/* 筛选栏 */
.filter-bar {
  position: sticky;
  top: 96rpx;
  z-index: 10;
  background: #faf8f5;
  padding: 24rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  border-bottom: 2rpx solid #e8e3db;
}
.filter-item {
  position: relative;
}
.filter-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: #fff;
  border: 2rpx solid #e8e3db;
  border-radius: 999rpx;
  font-size: 28rpx;
  color: #2c2c2c;
}
.filter-chip text {
  white-space: nowrap;
}
.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8rpx;
  background: #fff;
  border: 2rpx solid #e8e3db;
  border-radius: 20rpx;
  padding: 8rpx 0;
  z-index: 20;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}
.month-dropdown {
  max-height: 520rpx;
  overflow-y: auto;
}
.dropdown-item {
  padding: 16rpx 32rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  white-space: nowrap;
}
.dropdown-item.active {
  color: #c41e3a;
  background: #fdf0f2;
}

/* 列表 */
.list-wrap {
  padding: 32rpx;
}
.groups {
  display: flex;
  flex-direction: column;
  gap: 48rpx;
}
.group-date {
  display: block;
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 16rpx;
}
.group-card {
  background: #fff;
  border-radius: 32rpx;
  overflow: hidden;
}
.tx-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
}
.tx-item.bordered {
  border-top: 2rpx solid #e8e3db;
}
.tx-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cat-blue {
  background: #dbeafe;
  color: #2563eb;
}
.cat-green {
  background: #dcfce7;
  color: #16a34a;
}
.cat-yellow {
  background: #fef9c3;
  color: #ca8a04;
}
.cat-purple {
  background: #f3e8ff;
  color: #9333ea;
}
.cat-orange {
  background: #ffedd5;
  color: #ea580c;
}
.cat-pink {
  background: #fce7f3;
  color: #db2777;
}
.cat-gray {
  background: #f3f4f6;
  color: #6b7280;
}
.tx-info {
  flex: 1;
  min-width: 0;
}
.tx-title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.tx-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.tx-desc {
  display: block;
  font-size: 26rpx;
  color: #999999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tx-time {
  display: block;
  font-size: 22rpx;
  color: #999999;
  margin-top: 4rpx;
}
.tx-amount {
  text-align: right;
  flex-shrink: 0;
}
.tx-num {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.tx-num.income {
  color: #16a34a;
}
.tx-bal {
  font-size: 22rpx;
  color: #999999;
}

/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 0;
}
.empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.empty-txt {
  font-size: 28rpx;
  color: #999999;
}

.picker-mask {
  position: fixed;
  inset: 0;
  z-index: 10;
}
.loading { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: #8a8178; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: #C41E3A; color: #fff; border-radius: 12rpx; font-size: 26rpx; }
</style>
