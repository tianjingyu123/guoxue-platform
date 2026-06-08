<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <text class="back-btn" @click="goBack">‹</text>
        <text class="header-title">交易记录</text>
        <view style="width:60rpx" />
      </view>
    </view>

    <!-- 余额卡片 -->
    <view class="balance-card">
      <view class="bc-left">
        <text class="bc-label">学习币余额</text>
        <text class="bc-amount">{{ (balance.coin || 0).toLocaleString() }}</text>
        <text
          v-if="balance.frozen > 0"
          class="bc-frozen"
        >
          冻结: {{ balance.frozen }}
        </text>
      </view>
      <view class="bc-right">
        <text class="bc-label">积分</text>
        <text class="bc-points">{{ (balance.points || 0).toLocaleString() }}</text>
      </view>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-left">
        <view
          class="filter-select"
          @click="toggleMonthPicker"
        >
          <text class="fs-text">{{ selectedMonth ? monthLabel : '全部月份' }}</text>
          <text class="fs-arrow" :class="{ open: showMonthPicker }">▼</text>
        </view>
        <view
          class="filter-select"
          @click="toggleTypePicker"
        >
          <text class="fs-text">{{ filterType === 'income' ? '收入' : filterType === 'expense' ? '支出' : '全部类型' }}</text>
          <text class="fs-arrow" :class="{ open: showTypePicker }">▼</text>
        </view>
      </view>
    </view>

    <!-- 交易列表 -->
    <scroll-view
      scroll-y
      class="list-scroll"
      @scrolltolower="loadMore"
    >
      <!-- 加载态 -->
      <view
        v-if="loading && items.length === 0"
        class="loading-state"
      >
        <view
          v-for="i in 5"
          :key="i"
          class="skeleton-item"
        />
      </view>

      <!-- 空态 -->
      <view
        v-else-if="groupedList.length === 0"
        class="empty-state"
      >
        <text class="empty-icon">💰</text>
        <text class="empty-text">暂无交易记录</text>
      </view>

      <!-- 列表 -->
      <template v-else>
        <view
          v-for="group in groupedList"
          :key="group.date"
          class="date-group"
        >
          <text class="date-label">{{ formatGroupDate(group.date) }}</text>
          <view class="txn-list">
            <view
              v-for="t in group.items"
              :key="t.id"
              class="txn-item"
              @click="goDetail(t)"
            >
              <view
                class="txn-icon"
                :class="'bg-' + (t.category || 'other')"
              >
                <text>{{ categoryIcon(t.category) }}</text>
              </view>
              <view class="txn-info">
                <view class="txn-title-row">
                  <text class="txn-title">{{ t.title }}</text>
                  <text class="txn-direction">{{ t.type === 'income' ? '↓' : '↑' }}</text>
                </view>
                <text class="txn-desc">{{ t.description }}</text>
                <text class="txn-time">{{ formatDate(t.createdAt) }}</text>
              </view>
              <view class="txn-amount-wrap">
                <text
                  class="txn-amount"
                  :class="{ income: t.type === 'income' }"
                >
                  {{ t.type === 'income' ? '+' : '' }}{{ t.amount }}
                </text>
                <text class="txn-balance">余额 {{ t.balance }}</text>
              </view>
            </view>
          </view>
        </view>
        <!-- 加载更多 -->
        <view
          v-if="hasMore && !loading"
          class="load-more-btn"
          @click="loadMore"
        >
          <text>加载更多</text>
        </view>
        <view
          v-if="!hasMore && items.length > 0"
          class="load-more-btn no-more"
        >
          <text>— 已全部加载 —</text>
        </view>
      </template>
    </scroll-view>

    <!-- 月份选择器 -->
    <view
      v-if="showMonthPicker"
      class="picker-overlay"
      @click="showMonthPicker = false"
    >
      <view
        class="picker-sheet"
        @click.stop
      >
        <view class="picker-header">
          <text class="picker-title">选择月份</text>
          <text
            class="picker-close"
            @click="showMonthPicker = false"
          >
            ✕
          </text>
        </view>
        <scroll-view
          scroll-y
          class="picker-list"
        >
          <text
            class="picker-item"
            :class="{ active: !selectedMonth }"
            @click="selectMonth('')"
          >
            全部月份
          </text>
          <text
            v-for="m in months"
            :key="m.value"
            class="picker-item"
            :class="{ active: selectedMonth === m.value }"
            @click="selectMonth(m.value)"
          >
            {{ m.label }}
          </text>
        </scroll-view>
      </view>
    </view>

    <!-- 类型选择器 -->
    <view
      v-if="showTypePicker"
      class="picker-overlay"
      @click="showTypePicker = false"
    >
      <view
        class="picker-sheet"
        @click.stop
      >
        <view class="picker-header">
          <text class="picker-title">选择类型</text>
          <text
            class="picker-close"
            @click="showTypePicker = false"
          >
            ✕
          </text>
        </view>
        <view class="picker-list">
          <text
            v-for="opt in typeOptions"
            :key="opt.value"
            class="picker-item"
            :class="{ active: filterType === opt.value }"
            @click="selectType(opt.value)"
          >
            {{ opt.label }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { coinApi } from '../../api'

interface BalanceInfo {
  coin: number
  points: number
  frozen?: number
}

interface Transaction {
  id: string
  type: string
  category: string
  title: string
  description: string
  amount: number
  balance: number
  createdAt: string
}

// ====== 状态 ======
const loading = ref(true)
const balance = ref<BalanceInfo>({ coin: 0, points: 0 })
const items = ref<Transaction[]>([])
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)

// 筛选
const filterType = ref('')
const selectedMonth = ref('')
const showMonthPicker = ref(false)
const showTypePicker = ref(false)

// ====== 月份 ======
const months = Array.from({ length: 12 }, (_, i) => {
  const d = new Date()
  d.setMonth(d.getMonth() - i)
  return {
    value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
  }
})

const typeOptions = [
  { value: '', label: '全部类型' },
  { value: 'income', label: '收入' },
  { value: 'expense', label: '支出' },
]

const monthLabel = computed(() => months.find(m => m.value === selectedMonth.value)?.label || '')

// ====== 分组计算 ======
const groupedList = computed(() => {
  const filtered = items.value.filter(t => {
    if (filterType.value && t.type !== filterType.value) return false
    if (selectedMonth.value && !t.createdAt.startsWith(selectedMonth.value)) return false
    return true
  })
  const groups: Record<string, { date: string; items: Transaction[] }> = {}
  filtered.forEach(t => {
    const key = t.createdAt.slice(0, 10)
    if (!groups[key]) groups[key] = { date: key, items: [] }
    groups[key].items.push(t)
  })
  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date))
})

// ====== 生命周期 ======
onMounted(async () => {
  await fetchData()
})

async function fetchData() {
  loading.value = true
  page.value = 1
  try {
    const [balRes, txnRes] = await Promise.all([
      coinApi.getBalance().catch(() => null),
      coinApi.getTransactions(1, pageSize).catch(() => null),
    ])

    if (balRes) balance.value = balRes as any

    const list = Array.isArray(txnRes) ? txnRes : (txnRes as any)?.list || []
    items.value = list
    hasMore.value = list.length >= pageSize
  } catch {
    // 兜底
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  try {
    const txnRes: any = await coinApi.getTransactions(page.value, pageSize)
    const list = Array.isArray(txnRes) ? txnRes : (txnRes as any)?.list || []
    items.value.push(...list)
    hasMore.value = list.length >= pageSize
  } catch {
    page.value--
  }
}

// ====== 筛选操作 ======
function toggleMonthPicker() {
  showMonthPicker.value = !showMonthPicker.value
  showTypePicker.value = false
}
function toggleTypePicker() {
  showTypePicker.value = !showTypePicker.value
  showMonthPicker.value = false
}
function selectMonth(v: string) {
  selectedMonth.value = v
  showMonthPicker.value = false
}
function selectType(v: string) {
  filterType.value = v
  showTypePicker.value = false
}

// ====== 工具函数 ======
function categoryIcon(cat?: string): string {
  const m: Record<string, string> = {
    purchase: '🛒',
    refund: '🔄',
    reward: '🎁',
    recharge: '💳',
    withdraw: '🏦',
    transfer: '📤',
  }
  return m[cat || ''] || '💳'
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatGroupDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const today = new Date()
  const target = new Date(Number(y), Number(m) - 1, Number(d))
  const diff = Math.floor((today.getTime() - target.getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  return `${Number(m)}月${Number(d)}日`
}

function goDetail(t: Transaction) {
  uni.showToast({ title: '查看详情', icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; }

.header { background: linear-gradient(135deg, #C41E3A, #e8546a); }
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
}
.back-btn { font-size: 36rpx; color: #fff; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #fff; }

.balance-card {
  margin: 16rpx 24rpx;
  background: linear-gradient(135deg, #C41E3A, #e8546a);
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  justify-content: space-between;
  color: #fff;
}
.bc-label { font-size: 22rpx; opacity: 0.8; display: block; }
.bc-amount { font-size: 52rpx; font-weight: bold; display: block; margin-top: 8rpx; }
.bc-frozen { font-size: 20rpx; opacity: 0.6; margin-top: 6rpx; display: block; }
.bc-right { text-align: right; }
.bc-points { font-size: 36rpx; font-weight: 500; display: block; margin-top: 8rpx; }

.filter-bar {
  padding: 12rpx 24rpx;
  background: #FAF8F5;
  border-bottom: 1rpx solid #E5E1DB;
}
.filter-left { display: flex; gap: 12rpx; }
.filter-select {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  background: #fff;
  border: 1rpx solid #E5E1DB;
  border-radius: 28rpx;
}
.fs-text { font-size: 24rpx; color: #2C2C2C; }
.fs-arrow { font-size: 16rpx; color: #999; transition: transform 0.2s; }
.fs-arrow.open { transform: rotate(180deg); }

.list-scroll { padding: 16rpx 24rpx; max-height: calc(100vh - 280rpx); }

.loading-state { display: flex; flex-direction: column; gap: 12rpx; }
.skeleton-item { height: 120rpx; background: #e8e3db; border-radius: 16rpx; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }

.date-group { margin-bottom: 24rpx; }
.date-label { font-size: 24rpx; color: #999; margin-bottom: 12rpx; display: block; }

.txn-list { background: #fff; border-radius: 16rpx; overflow: hidden; }
.txn-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}
.txn-item:last-child { border-bottom: none; }
.txn-item:active { background: #fafafa; }

.txn-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  flex-shrink: 0;
}
.bg-purchase { background: #e3f2fd; }
.bg-refund { background: #e8f5e9; }
.bg-reward { background: #fff8e1; }
.bg-recharge { background: #f3e5f5; }
.bg-withdraw { background: #fbe9e7; }
.bg-transfer { background: #fce4ec; }
.bg-other { background: #f5f5f5; }

.txn-info { flex: 1; min-width: 0; }
.txn-title-row { display: flex; align-items: center; gap: 4rpx; }
.txn-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.txn-direction { font-size: 22rpx; }
.txn-desc { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.txn-time { font-size: 20rpx; color: #ccc; display: block; margin-top: 4rpx; }

.txn-amount-wrap { text-align: right; }
.txn-amount { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; }
.txn-amount.income { color: #4CAF50; }
.txn-balance { font-size: 20rpx; color: #ccc; margin-top: 4rpx; display: block; }

.load-more-btn {
  text-align: center;
  padding: 20rpx 0;
  font-size: 24rpx;
  color: #C9A96E;
}
.load-more-btn:active { opacity: 0.7; }
.no-more { color: #999; }

/* 选择器弹窗 */
.picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.picker-sheet {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 60vh;
}
.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #E5E1DB;
}
.picker-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.picker-close { font-size: 32rpx; color: #999; }
.picker-list { padding: 8rpx 0; max-height: 50vh; overflow-y: auto; }
.picker-item { display: block; padding: 20rpx 24rpx; font-size: 26rpx; color: #2C2C2C; }
.picker-item.active { color: #C41E3A; background: #fef0f0; }
</style>
