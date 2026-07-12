<template>
  <view class="earn-page">
    <!-- 自定义导航：statusBarHeight 留白 -->
    <view class="earn-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="earn-nav-inner">
        <view class="earn-nav-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="44" color="#2C2C2C" />
        </view>
        <text class="earn-nav-title">收益明细</text>
        <view class="earn-nav-btn" :class="{ spinning: loading }" @tap="onRefresh">
          <app-icon name="refresh-cw" :size="38" color="#6E6E73" />
        </view>
      </view>
    </view>

    <!-- loading -->
    <view v-if="loading" class="earn-state">
      <view class="earn-spinner" /><text class="earn-state-txt">加载中...</text>
    </view>

    <!-- 未开通分站 -->
    <view v-else-if="notOpened" class="earn-state">
      <app-icon name="store" :size="92" color="#D8D2C8" />
      <text class="earn-state-txt">你还没有开通分站</text>
      <view class="earn-state-btn" @tap="goJoin"><text class="earn-state-btn-txt">去开通分站</text></view>
    </view>

    <!-- error -->
    <view v-else-if="error" class="earn-state">
      <app-icon name="alert-circle" :size="92" color="#D8D2C8" />
      <text class="earn-state-txt">{{ error }}</text>
      <view class="earn-state-btn" @tap="load"><text class="earn-state-btn-txt">重新加载</text></view>
    </view>

    <scroll-view v-else scroll-y class="earn-scroll" @scrolltolower="loadMore">
      <view class="earn-content">
        <!-- 收益概览卡（朱红渐变 · 金色衬线大字） -->
        <view class="hero">
          <view class="hero-top">
            <view class="hero-main">
              <text class="hero-label">本月收益（待结算）</text>
              <text class="hero-num serif"><text class="hero-num-sym">¥</text>{{ fmtMoney(overview.monthEarning) }}</text>
            </view>
            <view class="hero-settle">
              <text class="hero-settle-h">下次结算</text>
              <text class="hero-settle-d serif">{{ settleDateLabel }}</text>
            </view>
          </view>
          <view class="hero-row">
            <view class="hero-item">
              <text class="hero-item-num gold serif">¥{{ fmtMoney(overview.pendingSettlement) }}</text>
              <text class="hero-item-label">待结算</text>
            </view>
            <view class="hero-item">
              <text class="hero-item-num serif">¥{{ fmtMoney(overview.totalEarning) }}</text>
              <text class="hero-item-label">累计收益</text>
            </view>
            <view class="hero-item hero-item-btn" @tap="goWithdraw">
              <view class="hero-withdraw">
                <app-icon name="wallet" :size="30" color="#C41E3A" />
                <text class="hero-withdraw-txt">提现</text>
              </view>
              <text class="hero-item-label">前往钱包</text>
            </view>
          </view>
        </view>

        <!-- 自购已省（后端真有则显示） -->
        <view v-if="overview.selfPurchaseSaved > 0" class="saved-tip">
          <app-icon name="gift" :size="28" color="#97794A" />
          <text class="saved-tip-txt">自购已省 ¥{{ fmtMoney(overview.selfPurchaseSaved) }} · 站长自购下单直接立减</text>
        </view>

        <!-- 状态筛选 Tab（下划线激活，按后端真实收益类型 type 筛选） -->
        <scroll-view scroll-x class="tabs-scroll">
          <view class="tabs-row">
            <view
              v-for="f in filterTypes"
              :key="f.value"
              class="tab"
              :class="{ on: filterType === f.value }"
              @tap="filterType = f.value"
            >
              <text class="tab-txt" :class="{ on: filterType === f.value }">{{ f.label }}</text>
              <view v-if="filterType === f.value" class="tab-underline" />
            </view>
          </view>
        </scroll-view>

        <!-- 结算说明 -->
        <view class="notice">
          <text class="notice-txt">每月 <text class="notice-strong">25 日</text> 结算上月已确认订单佣金，已结算收益进入个人钱包，提现请前往「钱包」操作。</text>
        </view>

        <!-- 账单区标题 -->
        <view class="bills-head">
          <text class="bills-head-title">{{ filterLabel }}</text>
          <text v-if="filteredEarnings.length > 0" class="bills-head-count">共 {{ filteredEarnings.length }} 笔</text>
        </view>

        <!-- 空态 -->
        <view v-if="filteredEarnings.length === 0" class="empty">
          <view class="empty-ic">
            <app-icon name="dollar-sign" :size="72" color="#C9A96E" />
          </view>
          <text class="empty-t serif">{{ filterType === 'all' ? '还没有收益' : '该类型暂无收益' }}</text>
          <text class="empty-d">推广你的主推内容，用户下单成交后佣金会在这里显示。</text>
        </view>

        <!-- 账单列表 -->
        <view v-else class="bills">
          <view v-for="item in filteredEarnings" :key="item.id" class="bill">
            <view class="bill-ic" :style="{ background: typeColor(item.type) }">
              <text class="bill-ic-txt">{{ typeShort(item.type) }}</text>
            </view>
            <view class="bill-info">
              <text class="bill-t">{{ typeLabel(item.type) }}</text>
              <text class="bill-s">{{ subLine(item) }}</text>
            </view>
            <view class="bill-r">
              <text class="bill-amt">+¥{{ fmtMoney(item.earned) }}</text>
              <text class="bill-st">佣金 {{ ratePct(item.rate) }}</text>
            </view>
          </view>

          <view v-if="hasMore" class="loadmore" @tap="loadMore">
            <text class="loadmore-txt">{{ loadingMore ? '加载中...' : '上滑加载更多' }}</text>
          </view>
          <view v-else class="loadmore">
            <text class="loadmore-txt loadmore-end">没有更多了</text>
          </view>
        </view>
      </view>
    </scroll-view>
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
  totalEarning: 0, monthEarning: 0, pendingSettlement: 0, nextSettleDate: '', remainingDays: 0, selfPurchaseSaved: 0,
})
const earnings = ref<StationEarningItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

// 状态筛选：后端 StationEarning 无 status（待结算/已结算/已取消）字段，
// 故按后端真实存在的收益类型 type 分类筛选（诚实降级，不虚构状态）
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
const filterLabel = computed(() => filterTypes.find((f) => f.value === filterType.value)?.label || '收益明细')

// 下次结算日：优先用后端 nextSettleDate（取 MM-DD），无则按结算规则显示每月 25 日
const settleDateLabel = computed(() => {
  const raw = overview.value.nextSettleDate
  if (raw) {
    const d = new Date(raw)
    if (!isNaN(d.getTime())) {
      const p = (n: number) => String(n).padStart(2, '0')
      return `${p(d.getMonth() + 1)}-${p(d.getDate())}`
    }
    return raw
  }
  return '每月25日'
})

function typeLabel(t: string): string {
  return STATION_EARNING_TYPE_LABELS[t] || '推广佣金'
}
function typeShort(t: string): string {
  const map: Record<string, string> = {
    COURSE: '课程', PRODUCT: '商城', MEMBER: '会员', CIRCLE: '圈子', BOT: '智能体',
  }
  return map[t] || '佣金'
}
function typeColor(t: string): string {
  const map: Record<string, string> = {
    COURSE: '#C41E3A', PRODUCT: '#C9A96E', MEMBER: '#A01828', CIRCLE: '#8A6F3F', BOT: '#6E6E73',
  }
  return map[t] || '#B8B0A4'
}
function ratePct(rate: number): string {
  return (rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 1) + '%'
}
function shortId(id: string): string {
  return id.length > 10 ? id.slice(-8) : id
}
function fmtMoney(n: number): string {
  const v = Number(n) || 0
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function subLine(item: StationEarningItem): string {
  const parts: string[] = []
  if (item.orderId) parts.push('订单 #' + shortId(item.orderId))
  parts.push('订单金额 ¥' + fmtMoney(item.amount))
  const dt = fmtDate(item.createdAt)
  if (dt) parts.push(dt)
  return parts.join(' · ')
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
  } catch (e) {
    const msg = (e as Error)?.message || ''
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
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '加载失败', icon: 'none' })
  } finally {
    loadingMore.value = false
  }
}

function onRefresh() {
  if (loading.value) return
  load()
}
// 提现入口：走个人钱包提现页（收益已结算入钱包，分站侧无独立提现）
function goWithdraw() {
  navigateTo('/pkg-mine/wallet/withdraw')
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
/* ===== token ===== */
$paper: #FAF8F5;
$card: #FFFFFF;
$red: #C41E3A;
$red-deep: #A01828;
$gold: #C9A96E;
$t1: #2C2C2C;
$t2: #6E6E73;
$t3: #9A9A9A;
$line: #ECE7DF;
$radius: 35rpx;
$px: 38rpx;
$shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05);
$serif: 'Songti SC', 'STSong', serif;

.serif { font-family: $serif; }

.earn-page { min-height: 100vh; background: $paper; display: flex; flex-direction: column; }

/* 导航 */
.earn-nav { background: $paper; }
.earn-nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 16rpx $px; height: 92rpx; }
.earn-nav-btn { width: 88rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; }
.earn-nav-btn.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.earn-nav-title { font-size: 34rpx; font-weight: 600; color: $t1; }

/* 三态 */
.earn-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx $px; gap: 28rpx; }
.earn-state-txt { font-size: 28rpx; color: $t2; text-align: center; }
.earn-spinner { width: 56rpx; height: 56rpx; border: 6rpx solid rgba(196, 30, 58, 0.15); border-top-color: $red; border-radius: 50%; animation: spin 0.8s linear infinite; }
.earn-state-btn { margin-top: 8rpx; min-height: 88rpx; padding: 0 56rpx; display: flex; align-items: center; justify-content: center; background: $red; border-radius: 999rpx; }
.earn-state-btn-txt { color: #fff; font-size: 28rpx; }

.earn-scroll { flex: 1; }
.earn-content { padding: 12rpx $px 60rpx; }

/* 收益概览卡 · 朱红渐变 */
.hero {
  position: relative; overflow: hidden; border-radius: $radius; padding: 42rpx 40rpx; color: #fff;
  background: linear-gradient(135deg, $red-deep, $red); box-shadow: 0 8rpx 32rpx rgba(196, 30, 58, 0.24);
}
.hero-top { display: flex; align-items: flex-start; justify-content: space-between; position: relative; z-index: 1; }
.hero-main { display: flex; flex-direction: column; }
.hero-label { font-size: 24rpx; color: rgba(255, 255, 255, 0.85); margin-bottom: 14rpx; }
.hero-num { font-size: 74rpx; font-weight: 700; color: #fff; line-height: 1; letter-spacing: -1rpx; }
.hero-num-sym { font-size: 38rpx; font-weight: 600; margin-right: 4rpx; }
.hero-settle { display: flex; flex-direction: column; align-items: flex-end; }
.hero-settle-h { font-size: 22rpx; color: rgba(255, 255, 255, 0.8); }
.hero-settle-d { font-size: 38rpx; font-weight: 700; color: #fff; margin-top: 6rpx; }

.hero-row {
  display: flex; margin-top: 38rpx; position: relative; z-index: 1;
  background: rgba(255, 255, 255, 0.12); border-radius: 24rpx; padding: 26rpx 0;
}
.hero-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
.hero-item + .hero-item::before {
  content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  height: 48rpx; width: 1rpx; background: rgba(255, 255, 255, 0.2);
}
.hero-item-num { font-size: 36rpx; font-weight: 700; color: #fff; }
.hero-item-num.gold { color: #F2D9A6; }
.hero-item-label { font-size: 22rpx; color: rgba(255, 255, 255, 0.82); margin-top: 8rpx; }
.hero-item-btn .hero-item-label { color: rgba(255, 255, 255, 0.9); }
.hero-withdraw { display: flex; align-items: center; gap: 8rpx; background: #fff; border-radius: 999rpx; min-height: 56rpx; padding: 0 24rpx; }
.hero-withdraw-txt { font-size: 26rpx; font-weight: 600; color: $red; }

/* 自购已省 */
.saved-tip {
  margin-top: 20rpx; display: flex; align-items: center; gap: 12rpx; padding: 22rpx 28rpx;
  background: rgba(201, 169, 110, 0.1); border: 1rpx solid rgba(201, 169, 110, 0.28); border-radius: 24rpx;
}
.saved-tip-txt { font-size: 24rpx; color: #8A6F3F; }

/* 状态筛选 Tab · 下划线激活 */
.tabs-scroll { white-space: nowrap; margin-top: 28rpx; }
.tabs-row { display: inline-flex; gap: 40rpx; padding: 0 4rpx; }
.tab { position: relative; height: 76rpx; display: flex; align-items: center; justify-content: center; }
.tab-txt { font-size: 28rpx; color: $t2; }
.tab-txt.on { color: $red; font-weight: 600; }
.tab-underline { position: absolute; bottom: 6rpx; left: 50%; transform: translateX(-50%); width: 40rpx; height: 4rpx; background: $red; border-radius: 2rpx; }

/* 结算说明 */
.notice {
  margin-top: 24rpx; background: rgba(201, 169, 110, 0.1); border: 1rpx solid rgba(201, 169, 110, 0.28);
  border-radius: 24rpx; padding: 24rpx 28rpx;
}
.notice-txt { font-size: 24rpx; color: #8A6F3F; line-height: 1.7; }
.notice-strong { color: $red-deep; font-weight: 600; }

/* 账单区标题 */
.bills-head { display: flex; align-items: baseline; justify-content: space-between; margin: 36rpx 4rpx 20rpx; }
.bills-head-title { font-size: 28rpx; font-weight: 600; color: $t1; }
.bills-head-count { font-size: 24rpx; color: $t3; }

/* 空态 */
.empty { padding: 90rpx 60rpx; display: flex; flex-direction: column; align-items: center; }
.empty-ic {
  width: 160rpx; height: 160rpx; border-radius: 50%; margin-bottom: 32rpx;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle, rgba(201, 169, 110, 0.18), rgba(201, 169, 110, 0.04));
}
.empty-t { font-size: 36rpx; font-weight: 600; color: $t1; margin-bottom: 16rpx; }
.empty-d { font-size: 26rpx; color: $t2; line-height: 1.7; text-align: center; }

/* 账单列表 */
.bills { display: flex; flex-direction: column; }
.bill {
  display: flex; align-items: center; gap: 24rpx; background: $card; border: 1rpx solid $line;
  border-radius: 28rpx; padding: 28rpx; margin-bottom: 20rpx; box-shadow: $shadow;
}
.bill-ic { width: 84rpx; height: 84rpx; border-radius: 22rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.bill-ic-txt { font-size: 24rpx; font-weight: 600; color: #fff; }
.bill-info { flex: 1; min-width: 0; }
.bill-t { font-size: 30rpx; font-weight: 600; color: $t1; }
.bill-s { font-size: 22rpx; color: $t3; margin-top: 8rpx; }
.bill-r { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.bill-amt { font-size: 32rpx; font-weight: 700; color: $gold; font-family: $serif; }
.bill-st { font-size: 22rpx; color: $t3; margin-top: 6rpx; }

.loadmore { min-height: 88rpx; display: flex; align-items: center; justify-content: center; padding: 12rpx 0 20rpx; }
.loadmore-txt { font-size: 24rpx; color: $t3; }
.loadmore-end { color: #C8C2B8; }
</style>
