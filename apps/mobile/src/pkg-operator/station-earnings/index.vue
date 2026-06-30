<template>
  <view class="earn-page">
    <!-- 顶部导航 -->
    <view class="earn-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="earn-nav-inner">
        <view class="earn-nav-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="48" color="#1f2937" />
        </view>
        <text class="earn-nav-title">分站收益</text>
        <view class="earn-nav-btn" :class="{ spinning: loading }" @tap="onRefresh">
          <app-icon name="refresh-cw" :size="40" color="#4b5563" />
        </view>
      </view>
    </view>

    <!-- loading -->
    <view v-if="loading" class="earn-state">
      <view class="earn-spinner" /><text class="earn-state-txt">加载中...</text>
    </view>

    <!-- 未开通分站 -->
    <view v-else-if="notOpened" class="earn-state">
      <app-icon name="store" :size="96" color="#d1d5db" />
      <text class="earn-state-txt">你还没有开通分站</text>
      <view class="earn-state-btn" @tap="goJoin"><text class="earn-state-btn-txt">去开通分站</text></view>
    </view>

    <!-- error -->
    <view v-else-if="error" class="earn-state">
      <app-icon name="alert-circle" :size="96" color="#d1d5db" />
      <text class="earn-state-txt">{{ error }}</text>
      <view class="earn-state-btn" @tap="load"><text class="earn-state-btn-txt">重新加载</text></view>
    </view>

    <view v-else class="earn-content">
      <!-- 收益总览卡片（真实字段：累计/本月/待结算/下次结算） -->
      <view class="earn-overview">
        <view class="earn-overview-top">
          <view>
            <text class="earn-ov-label">累计收益（元）</text>
            <text class="earn-ov-balance">¥{{ overview.totalEarning.toFixed(2) }}</text>
          </view>
          <view class="earn-withdraw-btn" @tap="goWithdraw">
            <app-icon name="wallet" :size="32" color="#C41E3A" />
            <text class="earn-withdraw-txt">提现</text>
          </view>
        </view>
        <view class="earn-ov-stats">
          <view class="earn-ov-stat">
            <view class="earn-ov-stat-head">
              <app-icon name="trending-up" :size="24" color="rgba(255,255,255,0.7)" />
              <text class="earn-ov-stat-label">本月收益</text>
            </view>
            <text class="earn-ov-stat-val">¥{{ overview.monthEarning.toFixed(2) }}</text>
          </view>
          <view class="earn-ov-stat">
            <view class="earn-ov-stat-head">
              <app-icon name="clock" :size="24" color="rgba(255,255,255,0.7)" />
              <text class="earn-ov-stat-label">待结算</text>
            </view>
            <text class="earn-ov-stat-val">¥{{ overview.pendingSettlement.toFixed(2) }}</text>
          </view>
          <view class="earn-ov-stat">
            <view class="earn-ov-stat-head">
              <app-icon name="calendar" :size="24" color="rgba(255,255,255,0.7)" />
              <text class="earn-ov-stat-label">下次结算</text>
            </view>
            <text class="earn-ov-stat-val">{{ overview.remainingDays > 0 ? overview.remainingDays + '天后' : '—' }}</text>
          </view>
        </view>
      </view>

      <!-- 收益明细 -->
      <view class="earn-section-head">
        <text class="earn-section-title">收益明细</text>
        <text v-if="total > 0" class="earn-section-count">共 {{ total }} 笔</text>
      </view>

      <scroll-view scroll-x class="earn-filter-scroll">
        <view class="earn-filter-row">
          <view
            v-for="f in filterTypes"
            :key="f.value"
            class="earn-filter"
            :class="{ active: filterType === f.value }"
            @tap="filterType = f.value"
          >
            <text class="earn-filter-txt" :style="{ color: filterType === f.value ? '#fff' : '#4b5563' }">{{ f.label }}</text>
          </view>
        </view>
      </scroll-view>

      <view v-if="filteredEarnings.length === 0" class="earn-empty">
        <app-icon name="file-text" :size="96" color="#d1d5db" />
        <text class="earn-empty-txt">{{ filterType === 'all' ? '暂无收益记录' : '该类型暂无收益记录' }}</text>
      </view>
      <view v-else class="earn-list">
        <view v-for="item in filteredEarnings" :key="item.id" class="earn-item">
          <view class="earn-item-main">
            <view class="earn-item-icon">
              <app-icon :name="typeIcon(item.type)" :size="32" color="#C41E3A" />
            </view>
            <view class="earn-item-info">
              <view class="earn-item-row1">
                <text class="earn-item-title">{{ typeLabel(item.type) }}</text>
                <text class="earn-item-amount">+¥{{ item.earned.toFixed(2) }}</text>
              </view>
              <text class="earn-item-desc">订单金额 ¥{{ item.amount.toFixed(2) }} · 佣金率 {{ ratePct(item.rate) }}</text>
              <view class="earn-item-row2">
                <text class="earn-item-time">{{ fmtTime(item.createdAt) }}</text>
                <text v-if="item.orderId" class="earn-item-order">订单 {{ shortId(item.orderId) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-if="hasMore && filteredEarnings.length > 0" class="earn-more" @tap="loadMore">
        <text class="earn-more-txt">{{ loadingMore ? '加载中...' : '加载更多' }}</text>
      </view>

      <!-- 底部提示（诚实：提现走钱包） -->
      <view class="earn-tip">
        <text class="earn-tip-txt"><text class="earn-tip-bold">收益说明：</text>分站推广佣金在订单完成后按平台结算周期入账，已结算收益进入个人钱包，提现请前往「钱包」操作。</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import {
  operatorApi,
  STATION_EARNING_TYPE_LABELS,
  type StationBalanceInfo,
  type StationEarningItem,
} from '@/lib/operator-data'

const statusBarHeight = ref(20)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 20
} catch (e) {}

const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const notOpened = ref(false)

const overview = ref<StationBalanceInfo>({
  totalEarning: 0, monthEarning: 0, pendingSettlement: 0, nextSettleDate: '', remainingDays: 0,
})
const earnings = ref<StationEarningItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const filterType = ref<string>('all')
const filterTypes = [
  { value: 'all', label: '全部' },
  { value: 'COURSE', label: '课程佣金' },
  { value: 'PRODUCT', label: '商品佣金' },
  { value: 'MEMBER', label: '会员佣金' },
  { value: 'CIRCLE', label: '圈子佣金' },
  { value: 'BOT', label: '智能体佣金' },
]

const filteredEarnings = computed(() =>
  filterType.value === 'all' ? earnings.value : earnings.value.filter((i) => i.type === filterType.value),
)
const hasMore = computed(() => earnings.value.length < total.value)

function typeLabel(t: string): string {
  return STATION_EARNING_TYPE_LABELS[t] || '推广佣金'
}
function typeIcon(t: string): string {
  const map: Record<string, string> = {
    COURSE: 'book-open', PRODUCT: 'shopping-bag', MEMBER: 'crown', CIRCLE: 'users', BOT: 'bot',
  }
  return map[t] || 'wallet'
}
function ratePct(rate: number): string {
  return (rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 1) + '%'
}
function shortId(id: string): string {
  return id.length > 10 ? id.slice(-8) : id
}
function fmtTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function load() {
  loading.value = true
  error.value = ''
  notOpened.value = false
  page.value = 1
  try {
    const [ov, list] = await Promise.all([
      operatorApi.getStationPanelBalance(),
      operatorApi.getMyStationEarnings(1, pageSize),
    ])
    overview.value = ov
    earnings.value = list.items
    total.value = list.total
  } catch (e: any) {
    const msg = e?.message || ''
    if (msg.includes('开通分站') || msg.includes('没有开通') || msg.includes('NOT_FOUND')) {
      notOpened.value = true
    } else {
      error.value = msg || '加载失败，请重试'
    }
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const next = page.value + 1
    const list = await operatorApi.getMyStationEarnings(next, pageSize)
    earnings.value = [...earnings.value, ...list.items]
    total.value = list.total
    page.value = next
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loadingMore.value = false
  }
}

function onRefresh() {
  if (loading.value) return
  load()
}
function goWithdraw() {
  navigateTo('/wallet/withdraw')
}
function goJoin() {
  navigateTo('/pkg-operator/join-station/index')
}
function goBack() {
  navigateBack()
}

onMounted(load)
</script>

<style lang="scss" scoped>
.earn-page { min-height: 100vh; background: #faf8f5; }
.earn-nav { position: sticky; top: 0; z-index: 10; background: #faf8f5; border-bottom: 1rpx solid #f3f4f6; }
.earn-nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; }
.earn-nav-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.earn-nav-btn.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.earn-nav-title { font-size: 36rpx; font-weight: 600; color: #111827; }

.earn-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 32rpx; gap: 24rpx; }
.earn-state-txt { font-size: 28rpx; color: #6b7280; }
.earn-spinner { width: 56rpx; height: 56rpx; border: 6rpx solid #f0d0d4; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
.earn-state-btn { margin-top: 8rpx; padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.earn-state-btn-txt { color: #fff; font-size: 28rpx; }

.earn-content { padding: 32rpx; }

.earn-overview { background: linear-gradient(to bottom right, var(--brand), #A01830); border-radius: 32rpx; padding: 40rpx; margin-bottom: 32rpx; }
.earn-overview-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32rpx; }
.earn-ov-label { font-size: 28rpx; color: rgba(255, 255, 255, 0.8); margin-bottom: 8rpx; display: block; }
.earn-ov-balance { font-size: 60rpx; font-weight: 700; color: #fff; }
.earn-withdraw-btn { display: flex; align-items: center; gap: 8rpx; background: #fff; border-radius: 12rpx; padding: 16rpx 28rpx; }
.earn-withdraw-txt { font-size: 28rpx; font-weight: 500; color: var(--brand); }
.earn-ov-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32rpx; padding-top: 32rpx; border-top: 1rpx solid rgba(255, 255, 255, 0.2); }
.earn-ov-stat-head { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.earn-ov-stat-label { font-size: 22rpx; color: rgba(255, 255, 255, 0.7); }
.earn-ov-stat-val { font-size: 30rpx; font-weight: 600; color: #fff; }

.earn-section-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16rpx; }
.earn-section-title { font-size: 32rpx; font-weight: 600; color: #111827; }
.earn-section-count { font-size: 24rpx; color: #9ca3af; }

.earn-filter-scroll { white-space: nowrap; margin-bottom: 16rpx; }
.earn-filter-row { display: inline-flex; gap: 16rpx; padding-bottom: 12rpx; }
.earn-filter { padding: 12rpx 24rpx; border-radius: 999rpx; background: #fff; }
.earn-filter.active { background: var(--brand); }
.earn-filter-txt { font-size: 28rpx; }

.earn-empty { background: #fff; border-radius: 16rpx; padding: 64rpx 32rpx; display: flex; flex-direction: column; align-items: center; }
.earn-empty-txt { font-size: 28rpx; color: #6b7280; margin-top: 24rpx; }

.earn-list { display: flex; flex-direction: column; gap: 24rpx; }
.earn-item { background: #fff; border-radius: 16rpx; padding: 32rpx; }
.earn-item-main { display: flex; align-items: flex-start; gap: 24rpx; }
.earn-item-icon { width: 80rpx; height: 80rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #fef2f4; }
.earn-item-info { flex: 1; min-width: 0; }
.earn-item-row1 { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.earn-item-title { font-size: 30rpx; font-weight: 500; color: #111827; }
.earn-item-amount { font-size: 30rpx; font-weight: 600; color: var(--brand); }
.earn-item-desc { font-size: 26rpx; color: #6b7280; margin-bottom: 16rpx; display: block; }
.earn-item-row2 { display: flex; align-items: center; justify-content: space-between; }
.earn-item-time { font-size: 22rpx; color: #9ca3af; }
.earn-item-order { font-size: 22rpx; color: #9ca3af; }

.earn-more { padding: 32rpx; text-align: center; }
.earn-more-txt { font-size: 26rpx; color: var(--brand); }

.earn-tip { margin-top: 48rpx; padding: 32rpx; background: #fffbeb; border-radius: 16rpx; }
.earn-tip-txt { font-size: 28rpx; color: #92400e; line-height: 1.6; }
.earn-tip-bold { font-weight: 500; color: #92400e; }
</style>
