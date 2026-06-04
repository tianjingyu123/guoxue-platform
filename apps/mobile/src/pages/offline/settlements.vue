<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <view class="header-row">
        <view class="header-left">
          <text
            class="back-btn"
            @click="goBack"
          >
            ←
          </text>
          <text class="header-title">
            收入结算
          </text>
        </view>
        <text
          class="filter-icon"
          @click="showYearFilter = true"
        >
          📅
        </text>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view
      v-if="stats"
      class="stats-section"
    >
      <view class="stats-card">
        <text class="stats-label">
          累计收入
        </text>
        <text class="stats-amount">
          ¥{{ formatNumber(stats.totalNetAmount) }}
        </text>
        <view class="stats-grid">
          <view class="stats-item">
            <text class="stats-item-label">
              总收入
            </text>
            <text class="stats-item-val">
              ¥{{ formatNumber(stats.totalIncome) }}
            </text>
          </view>
          <view class="stats-item">
            <text class="stats-item-label">
              扣除
            </text>
            <text class="stats-item-val stats-deduction">
              ¥{{ formatNumber(stats.totalDeduction) }}
            </text>
          </view>
          <view class="stats-item">
            <text class="stats-item-label">
              待结算
            </text>
            <text class="stats-item-val stats-pending">
              ¥{{ formatNumber(stats.pendingAmount) }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 状态筛选 -->
    <scroll-view
      scroll-x
      class="status-scroll"
      show-scrollbar="false"
    >
      <view class="status-inner">
        <text
          v-for="opt in statusOptions"
          :key="opt.value"
          class="status-tab"
          :class="{ active: selectedStatus === opt.value }"
          @click="selectedStatus = opt.value"
        >
          {{ opt.label }}
        </text>
      </view>
    </scroll-view>

    <!-- 结算列表 -->
    <DataState
      :is-loading="loading && settlements.length === 0"
      :is-empty="!loading && settlements.length === 0"
      empty-icon="💰"
      empty-title="暂无结算记录"
      skeleton-type="list"
      @retry="loadSettlements"
    >
      <view class="settlement-list">
        <view
          v-for="s in settlements"
          :key="s.id"
          class="settlement-card"
          @click="openDetail(s)"
        >
          <view class="settlement-top">
            <view class="settlement-period">
              <text>📅</text>
              <text class="settlement-period-text">
                {{ s.periodStart }} ~ {{ s.periodEnd }}
              </text>
            </view>
            <text
              class="settlement-status"
              :class="'status-' + s.status"
            >
              {{ getStatusLabel(s.status) }}
            </text>
          </view>
          <text class="settlement-no">
            结算单号：{{ s.settlementNo }}
          </text>
          <view class="settlement-bottom">
            <view class="settlement-figures">
              <view class="settlement-figure">
                <text class="figure-label">
                  收入
                </text>
                <text class="figure-val">
                  ¥{{ formatNumber(s.totalIncome) }}
                </text>
              </view>
              <view class="settlement-figure">
                <text class="figure-label">
                  扣除
                </text>
                <text class="figure-val figure-deduction">
                  -¥{{ formatNumber(s.totalDeduction) }}
                </text>
              </view>
              <view class="settlement-figure">
                <text class="figure-label">
                  实收
                </text>
                <text class="figure-val figure-net">
                  ¥{{ formatNumber(s.netAmount) }}
                </text>
              </view>
            </view>
            <text class="settlement-arrow">
              ›
            </text>
          </view>
        </view>
      </view>
    </DataState>

    <!-- 年份筛选弹窗 -->
    <view
      v-if="showYearFilter"
      class="mask"
      @click="showYearFilter = false"
    >
      <view
        class="bottom-sheet"
        @click.stop
      >
        <view class="sheet-header">
          <text class="sheet-title">
            筛选年份
          </text>
          <text @click="showYearFilter = false">
            ✕
          </text>
        </view>
        <view class="year-grid">
          <text
            v-for="y in years"
            :key="y"
            class="year-btn"
            :class="{ active: selectedYear === y }"
            @click="selectedYear = y"
          >
            {{ y }}年
          </text>
        </view>
        <view class="sheet-footer">
          <view
            class="confirm-btn"
            @click="showYearFilter = false"
          >
            确定
          </view>
        </view>
      </view>
    </view>

    <!-- 结算详情弹窗 -->
    <view
      v-if="showDetail"
      class="mask"
      @click="showDetail = false"
    >
      <view
        class="bottom-sheet detail-sheet"
        @click.stop
      >
        <view class="sheet-header">
          <text class="sheet-title">
            结算详情
          </text>
          <text @click="showDetail = false">
            ✕
          </text>
        </view>
        <scroll-view
          scroll-y
          class="detail-scroll"
        >
          <view
            v-if="detailLoading"
            class="detail-loading"
          >
            <text>加载中...</text>
          </view>
          <view
            v-else-if="detailData"
            class="detail-body"
          >
            <!-- 概览 -->
            <view class="detail-overview">
              <view class="detail-period">
                <text>📅</text>
                <text class="detail-period-text">
                  {{ detailData.periodStart }} ~ {{ detailData.periodEnd }}
                </text>
                <text
                  class="settlement-status"
                  :class="'status-' + detailData.status"
                >
                  {{ getStatusLabel(detailData.status) }}
                </text>
              </view>
              <view class="detail-grid">
                <view class="detail-grid-item">
                  <text class="detail-grid-label">
                    总收入
                  </text>
                  <text class="detail-grid-val">
                    ¥{{ formatNumber(detailData.totalIncome) }}
                  </text>
                </view>
                <view class="detail-grid-item">
                  <text class="detail-grid-label">
                    扣除
                  </text>
                  <text class="detail-grid-val detail-grid-deduction">
                    -¥{{ formatNumber(detailData.totalDeduction) }}
                  </text>
                </view>
                <view class="detail-grid-item">
                  <text class="detail-grid-label">
                    实收
                  </text>
                  <text class="detail-grid-val detail-grid-net">
                    ¥{{ formatNumber(detailData.netAmount) }}
                  </text>
                </view>
              </view>
            </view>

            <!-- 收入构成 -->
            <view class="detail-section">
              <text class="detail-section-title">
                收入构成
              </text>
              <view class="income-type-grid">
                <view
                  v-for="item in detailData.incomeByType"
                  :key="item.type"
                  class="income-type-card"
                >
                  <view class="income-type-header">
                    <view
                      class="income-type-icon"
                      :class="'icon-' + item.type"
                    >
                      <text>{{ getIncomeTypeIcon(item.type) }}</text>
                    </view>
                    <text class="income-type-label">
                      {{ getIncomeTypeLabel(item.type) }}
                    </text>
                  </view>
                  <text class="income-type-amount">
                    ¥{{ formatNumber(item.amount) }}
                  </text>
                  <text class="income-type-count">
                    {{ item.count }}笔
                  </text>
                </view>
              </view>
            </view>

            <!-- 收入明细 -->
            <view class="detail-section">
              <text class="detail-section-title">
                收入明细
              </text>
              <view class="detail-items">
                <view
                  v-for="item in detailData.incomeItems"
                  :key="item.id"
                  class="detail-item"
                >
                  <view
                    class="detail-item-icon"
                    :class="'icon-' + item.type"
                  >
                    <text>{{ getIncomeTypeIcon(item.type) }}</text>
                  </view>
                  <view class="detail-item-info">
                    <text class="detail-item-title">
                      {{ item.title }}
                    </text>
                    <text class="detail-item-time">
                      {{ item.time }}
                    </text>
                  </view>
                  <text class="detail-item-amount income-amount">
                    +¥{{ formatNumber(item.amount) }}
                  </text>
                </view>
              </view>
            </view>

            <!-- 扣除明细 -->
            <view class="detail-section">
              <text class="detail-section-title">
                扣除明细
              </text>
              <view class="detail-items">
                <view
                  v-for="item in detailData.deductionItems"
                  :key="item.id"
                  class="detail-item"
                >
                  <view class="detail-item-info">
                    <text class="detail-item-title">
                      {{ item.title }}
                    </text>
                    <text
                      v-if="item.remark"
                      class="detail-item-time"
                    >
                      {{ item.remark }}
                    </text>
                  </view>
                  <text class="detail-item-amount deduction-amount">
                    -¥{{ formatNumber(item.amount) }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { offlineApi } from '../../api'
import DataState from '../../components/DataState.vue'

interface SettlementStats {
  totalIncome: number
  totalDeduction: number
  totalNetAmount: number
  pendingAmount: number
}

interface Settlement {
  id: number
  settlementNo: string
  periodStart: string
  periodEnd: string
  status: string
  totalIncome: number
  totalDeduction: number
  netAmount: number
}

interface IncomeTypeItem {
  type: string
  label: string
  amount: number
  count: number
}

interface IncomeItem {
  id: number
  type: string
  title: string
  amount: number
  time: string
}

interface DeductionItem {
  id: number
  title: string
  amount: number
  remark?: string
}

interface SettlementDetail {
  id: number
  settlementNo: string
  periodStart: string
  periodEnd: string
  status: string
  totalIncome: number
  totalDeduction: number
  netAmount: number
  incomeByType: IncomeTypeItem[]
  incomeItems: IncomeItem[]
  deductionItems: DeductionItem[]
}

const statusOptions = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待结算' },
  { value: 'processing', label: '结算中' },
  { value: 'completed', label: '已结算' },
]

const years = [2026, 2025, 2024]

const settlements = ref<Settlement[]>([])
const stats = ref<SettlementStats | null>(null)
const loading = ref(false)
const selectedStatus = ref('all')
const selectedYear = ref(new Date().getFullYear())
const showYearFilter = ref(false)
const showDetail = ref(false)
const detailData = ref<SettlementDetail | null>(null)
const detailLoading = ref(false)

watch([selectedStatus, selectedYear], () => { loadSettlements() })

onMounted(() => {
  loadSettlements()
})

async function loadSettlements() {
  loading.value = true
  try {
    const params: any = {}
    if (selectedStatus.value !== 'all') params.status = selectedStatus.value
    params.year = selectedYear.value
    const res: any = await offlineApi.getSettlements(params)
    const data = res?.list || res?.data || res || []
    settlements.value = Array.isArray(data) ? data : []
    stats.value = res?.stats || null
  } catch (e: any) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function openDetail(s: Settlement) {
  showDetail.value = true
  detailLoading.value = true
  detailData.value = null
  try {
    const res: any = await offlineApi.getSettlementDetail(s.id)
    detailData.value = res || null
  } catch (e: any) {
    console.error(e)
  } finally {
    detailLoading.value = false
  }
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待结算',
    processing: '结算中',
    completed: '已结算',
  }
  return map[status] || status
}

function getIncomeTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    course: '📖',
    product: '🛍',
    booking: '👥',
    commission: '🎁',
  }
  return icons[type] || '💰'
}

function getIncomeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    course: '课程',
    product: '商品',
    booking: '预约',
    commission: '佣金',
  }
  return labels[type] || type
}

function formatNumber(num: number): string {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString()
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 40rpx;
}
.header {
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1rpx solid #E5E1DB;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
}
.header-left { display: flex; align-items: center; gap: 12rpx; }
.back-btn { font-size: 36rpx; }
.header-title { font-size: 32rpx; font-weight: 600; }
.filter-icon { font-size: 28rpx; padding: 8rpx; }

/* 统计卡片 */
.stats-section { padding: 20rpx 24rpx; }
.stats-card {
  background: linear-gradient(135deg, #C41E3A, #A01830);
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  color: #fff;
}
.stats-label { font-size: 24rpx; opacity: 0.9; display: block; margin-bottom: 8rpx; }
.stats-amount { font-size: 48rpx; font-weight: bold; display: block; margin-bottom: 24rpx; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.stats-item { }
.stats-item-label { font-size: 22rpx; opacity: 0.75; display: block; margin-bottom: 4rpx; }
.stats-item-val { font-size: 28rpx; font-weight: 600; display: block; }
.stats-deduction { opacity: 0.85; }
.stats-pending { opacity: 0.85; }

/* 状态筛选 */
.status-scroll { white-space: nowrap; padding: 0 24rpx 16rpx; }
.status-inner { display: inline-flex; gap: 12rpx; }
.status-tab {
  display: inline-flex;
  padding: 8rpx 24rpx;
  border-radius: 28rpx;
  font-size: 24rpx;
  background: #fff;
  color: #666;
  border: 1rpx solid #E5E1DB;
}
.status-tab.active {
  background: linear-gradient(135deg, #C41E3A, #A01830);
  color: #fff;
  border-color: #C41E3A;
}

/* 结算列表 */
.settlement-list { padding: 0 24rpx; }
.settlement-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid #E5E1DB;
}
.settlement-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.settlement-period { display: flex; align-items: center; gap: 6rpx; }
.settlement-period-text { font-size: 24rpx; font-weight: 500; }
.settlement-no { font-size: 20rpx; color: #999; display: block; margin-bottom: 16rpx; }
.settlement-status {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}
.status-pending { background: rgba(243,156,18,0.1); color: #e67e22; }
.status-processing { background: rgba(52,152,219,0.1); color: #2980b9; }
.status-completed { background: rgba(39,174,96,0.1); color: #27ae60; }

.settlement-bottom { display: flex; align-items: center; gap: 12rpx; }
.settlement-figures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; flex: 1; }
.settlement-figure { }
.figure-label { font-size: 20rpx; color: #999; display: block; margin-bottom: 2rpx; }
.figure-val { font-size: 24rpx; font-weight: 600; display: block; }
.figure-deduction { color: #e74c3c; }
.figure-net { color: #27ae60; }
.settlement-arrow { font-size: 36rpx; color: #ccc; }

/* 弹窗 */
.mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0,0,0,0.5);
}
.bottom-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.detail-sheet { max-height: 85vh; }
.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #E5E1DB;
  font-size: 28rpx;
}
.sheet-title { font-weight: 600; }
.sheet-footer { padding: 24rpx 32rpx; }
.confirm-btn {
  width: 100%;
  height: 80rpx;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  color: #fff;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}

.year-grid { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 24rpx 32rpx; }
.year-btn {
  padding: 12rpx 32rpx;
  border-radius: 28rpx;
  font-size: 24rpx;
  background: #F5F0E8;
  color: #666;
  border: 1rpx solid #E5E1DB;
}
.year-btn.active {
  background: linear-gradient(135deg, #C41E3A, #A01830);
  color: #fff;
  border-color: #C41E3A;
}

/* 详情 */
.detail-scroll { overflow-y: auto; padding: 0; }
.detail-loading { padding: 60rpx; text-align: center; color: #999; }
.detail-body { padding: 24rpx 32rpx; }
.detail-overview {
  background: rgba(196,30,58,0.05);
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
}
.detail-period { display: flex; align-items: center; gap: 8rpx; margin-bottom: 16rpx; }
.detail-period-text { font-size: 24rpx; font-weight: 500; flex: 1; }
.detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; text-align: center; }
.detail-grid-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 4rpx; }
.detail-grid-val { font-size: 28rpx; font-weight: 600; display: block; }
.detail-grid-deduction { color: #e74c3c; }
.detail-grid-net { color: #27ae60; }

.detail-section { margin-bottom: 24rpx; }
.detail-section-title { font-size: 26rpx; font-weight: 600; display: block; margin-bottom: 16rpx; }

.income-type-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }
.income-type-card {
  background: #F9F7F4;
  border-radius: 12rpx;
  padding: 16rpx;
  border: 1rpx solid #E5E1DB;
}
.income-type-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.income-type-icon { width: 36rpx; height: 36rpx; border-radius: 8rpx; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }
.icon-course { background: rgba(196,30,58,0.1); }
.icon-product { background: rgba(52,152,219,0.1); }
.icon-booking { background: rgba(39,174,96,0.1); }
.icon-commission { background: rgba(243,156,18,0.1); }
.income-type-label { font-size: 22rpx; color: #666; }
.income-type-amount { font-size: 28rpx; font-weight: 600; display: block; margin-bottom: 4rpx; }
.income-type-count { font-size: 20rpx; color: #999; }

.detail-items { }
.detail-item { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 0; border-bottom: 1rpx solid #F5F0E8; }
.detail-item-icon { width: 40rpx; height: 40rpx; border-radius: 8rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; flex-shrink: 0; }
.detail-item-info { flex: 1; min-width: 0; }
.detail-item-title { font-size: 24rpx; display: block; }
.detail-item-time { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }
.detail-item-amount { font-size: 24rpx; font-weight: 500; white-space: nowrap; }
.income-amount { color: #27ae60; }
.deduction-amount { color: #e74c3c; }
</style>
