<!--
  B1 · 商家工作台（V0 还原·合并 dashboard + analytics + content-stats 概览/图表）
  结构：店铺头(朱红) → 信用分金色卡 → 数据概览(今日/本月·真实字段) → 近7日订单趋势(metrics.items)
        → 待办三卡(待发货/待处理咨询/待回评·可点跳) → 快捷入口(B2/B4/B5/B6/B7/B8/B9)
  硬约束：纯 uni-app · rpx · @tap · padding-top 比例框（无 aspect-ratio）· 实色卡片 · 真实数据接线 · 三态
-->
<template>
  <view class="page">
    <!-- 店铺头（朱红品牌头） -->
    <view class="head" :style="{ paddingTop: statusBarH + 'px' }">
      <text class="head-wm">铺</text>
      <view class="head-top">
        <view class="shop">
          <view class="shop-logo">
            <image v-if="profile?.shopLogo" :src="profile.shopLogo" class="shop-logo-img" mode="aspectFill" />
            <text v-else class="shop-logo-txt">店招</text>
          </view>
          <view class="shop-info">
            <text class="shop-nm">{{ profile?.shopName || '我的店铺' }}</text>
            <text class="shop-st">{{ statusInfo.text }}</text>
          </view>
        </view>
        <view class="bell" @tap="go('/pkg-merchant/notices/index')">
          <AppIcon name="bell" :size="44" color="#ffffff" :stroke-width="1.8" />
          <view v-if="hasNotice" class="bell-rd" />
        </view>
      </view>
    </view>

    <!-- 全局加载态 -->
    <view v-if="loading" class="state">
      <text class="state-t">加载中…</text>
    </view>
    <!-- 全局错误态 -->
    <view v-else-if="error" class="state">
      <AppIcon name="alert-circle" :size="80" color="#c41e3a" />
      <text class="state-t">{{ error }}</text>
      <view class="state-btn" @tap="load"><text>重试</text></view>
    </view>

    <scroll-view v-else scroll-y class="scroll">
      <!-- 信用分金色卡（叠品牌头下缘·独立三态不阻塞主数据） -->
      <view class="credit" @tap="creditPopupOpen = credit && credit.logs.length ? true : creditPopupOpen">
        <template v-if="creditLoading">
          <view><text class="credit-l">店铺信用分</text><text class="credit-v">…</text></view>
          <view class="credit-g"><text class="credit-g-txt">加载中</text></view>
        </template>
        <template v-else-if="creditError">
          <view><text class="credit-l">店铺信用分</text><text class="credit-v">—</text></view>
          <view class="credit-g" @tap.stop="loadCredit"><text class="credit-g-txt">重试</text></view>
        </template>
        <template v-else-if="credit">
          <view>
            <text class="credit-l">店铺信用分</text>
            <text class="credit-v">{{ credit.creditScore }}</text>
          </view>
          <view class="credit-g">
            <text class="credit-g-txt">{{ gradeUi.label }} ›</text>
          </view>
        </template>
      </view>

      <!-- 数据概览 -->
      <view class="sect-t"><text class="sect-t-txt">数据概览</text></view>
      <view v-if="dashboard" class="card metrics">
        <view class="m-head">
          <view class="m-tab" :class="{ on: tab === 'today' }" @tap="tab = 'today'"><text class="m-tab-txt">今日</text></view>
          <view class="m-tab" :class="{ on: tab === 'month' }" @tap="tab = 'month'"><text class="m-tab-txt">本月</text></view>
        </view>

        <!-- 今日：dashboard 真实字段 -->
        <view v-if="tab === 'today'" class="m-row">
          <view class="m-cell">
            <text class="mv red">¥{{ money(dashboard.todaySales) }}</text>
            <text class="ml">今日成交额</text>
          </view>
          <view class="m-cell">
            <text class="mv">{{ dashboard.todayOrders }}</text>
            <text class="ml">今日订单</text>
          </view>
          <view class="m-cell">
            <text class="mv">{{ dashboard.totalProducts }}</text>
            <text class="ml">在售商品</text>
          </view>
          <view class="m-cell">
            <text class="mv">{{ Number(dashboard.rating || 0).toFixed(1) }}</text>
            <text class="ml">店铺评分</text>
          </view>
        </view>

        <!-- 本月：累计 + 近7日汇总（metrics.summary 真实字段·取不到诚实降级） -->
        <view v-else class="m-row">
          <view class="m-cell">
            <text class="mv red">¥{{ money(dashboard.totalSales) }}</text>
            <text class="ml">累计成交额</text>
          </view>
          <view class="m-cell">
            <text class="mv">{{ dashboard.totalOrders }}</text>
            <text class="ml">累计订单</text>
          </view>
          <view class="m-cell">
            <text class="mv">{{ metrics ? metrics.summary.ordersCount : '—' }}</text>
            <text class="ml">近7日订单</text>
          </view>
          <view class="m-cell">
            <text class="mv">{{ metrics && metrics.summary.avgRating !== null ? Number(metrics.summary.avgRating).toFixed(1) : '—' }}</text>
            <text class="ml">近7日评分</text>
          </view>
        </view>

        <!-- 近7日订单趋势（metrics.items 真实数据·带Y轴刻度柱图） -->
        <view class="trend">
          <view class="tl">
            <text class="tl-l">近 7 日订单数</text>
            <text class="tl-r">本周合计 <text class="tl-b">{{ trend.total }}</text> 单</text>
          </view>

          <view v-if="metricsLoading" class="trend-state"><text class="trend-state-t">加载中…</text></view>
          <view v-else-if="metricsError" class="trend-state">
            <text class="trend-state-t">{{ metricsError }}</text>
            <view class="trend-retry" @tap="loadMetrics"><text>重试</text></view>
          </view>
          <view v-else-if="!trend.bars.length" class="trend-state">
            <text class="trend-state-t">暂无趋势数据，指标每日凌晨聚合生成</text>
          </view>
          <view v-else class="chart">
            <view class="yaxis">
              <text class="yaxis-t">{{ trend.yMax }}</text>
              <text class="yaxis-t">{{ Math.round(trend.yMax / 2) }}</text>
              <text class="yaxis-t">0</text>
            </view>
            <view class="plot">
              <view class="bars">
                <view v-for="(b, i) in trend.bars" :key="i" class="bcol" :class="{ hot: i === trend.bars.length - 1 }">
                  <text class="bval">{{ b.value }}</text>
                  <view class="bar" :style="{ height: b.pct + '%' }" />
                </view>
              </view>
              <view class="xaxis">
                <text v-for="(b, i) in trend.bars" :key="i" class="xaxis-t">{{ b.label }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 待办事项 -->
      <view class="sect-t"><text class="sect-t-txt">待办事项</text></view>
      <view class="todo">
        <view class="tcard" @tap="go('/pkg-merchant/orders/index')">
          <view v-if="pendingShip > 0" class="badge"><text class="badge-t">{{ badgeNum(pendingShip) }}</text></view>
          <text class="tn">{{ pendingShip }}</text>
          <text class="tt">待发货</text>
        </view>
        <view class="tcard" @tap="go('/pkg-merchant/notices/index')">
          <view v-if="pendingInquiry > 0" class="badge"><text class="badge-t">{{ badgeNum(pendingInquiry) }}</text></view>
          <text class="tn">{{ pendingInquiry }}</text>
          <text class="tt">待处理咨询</text>
        </view>
        <view class="tcard" @tap="go('/pkg-merchant/reviews/index')">
          <view v-if="pendingReviews > 0" class="badge"><text class="badge-t">{{ badgeNum(pendingReviews) }}</text></view>
          <text class="tn">{{ pendingReviews }}</text>
          <text class="tt">待回复评价</text>
        </view>
      </view>

      <!-- 快捷入口 -->
      <view class="sect-t"><text class="sect-t-txt">快捷入口</text></view>
      <view class="quick">
        <view v-for="q in quickItems" :key="q.label" class="qi" @tap="go(q.path)">
          <view class="qc">
            <AppIcon :name="q.icon" :size="40" color="#c41e3a" :stroke-width="2" />
          </view>
          <text class="qi-t">{{ q.label }}</text>
        </view>
      </view>

      <view class="foot-gap" />
    </scroll-view>

    <!-- 信用变动明细弹层 -->
    <view v-if="creditPopupOpen" class="pop-mask" @tap="creditPopupOpen = false">
      <view class="pop" @tap.stop>
        <view class="pop-head">
          <text class="pop-title">信用变动明细</text>
          <view class="pop-close" @tap="creditPopupOpen = false">
            <AppIcon name="x" :size="40" color="#6e6e73" />
          </view>
        </view>
        <scroll-view scroll-y class="pop-body">
          <view v-for="log in credit?.logs ?? []" :key="log.id" class="pop-log">
            <view class="pop-log-head">
              <text class="pop-log-week">{{ log.factors?.weekKey || fmtDate(log.createdAt) }} 周评估</text>
              <text class="pop-log-delta" :class="deltaClass(log)">{{ log.oldScore }} → {{ log.newScore }}</text>
            </view>
            <view v-if="log.factors?.factors" class="pop-factors">
              <view v-for="(fd, key) in log.factors.factors" :key="key" class="pop-factor">
                <text class="pop-factor-name">{{ creditFactorNames[key] || key }}</text>
                <text class="pop-factor-score">{{ fd.score }}/{{ fd.weight }}{{ fd.neutral ? '（中性）' : '' }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  merchantBackendApi,
  type MerchantDashboard,
  type MerchantProfile,
  type MerchantStatus,
  type MerchantMetricsResp,
  type MerchantCreditResp,
  type MerchantCreditLogItem,
  creditGradeConfig,
  creditFactorNames,
} from '@/lib/merchant-data'

const statusBarH = ref(0)
const loading = ref(true)
const error = ref('')
const dashboard = ref<MerchantDashboard | null>(null)
const profile = ref<MerchantProfile | null>(null)
const hasNotice = ref(false)

const tab = ref<'today' | 'month'>('today')

// 待办计数（待发货来自订单 PAID·待咨询来自 inquiries·待回评来自 dashboard）
const pendingShip = ref(0)
const pendingInquiry = ref(0)
const pendingReviews = computed(() => dashboard.value?.pendingReviews ?? 0)

// 履约趋势卡（近7日·独立三态不阻塞主数据）
const metricsLoading = ref(true)
const metricsError = ref('')
const metrics = ref<MerchantMetricsResp | null>(null)

// 信用评级卡（独立三态·周更变动 log）
const creditLoading = ref(true)
const creditError = ref('')
const credit = ref<MerchantCreditResp | null>(null)
const creditPopupOpen = ref(false)
const gradeUi = computed(() => creditGradeConfig[credit.value?.creditGrade ?? 'B'] ?? creditGradeConfig.B)

// 快捷入口：B2 商品 / B4 订单 / B5 结算 / B6 评价 / B7 店铺 / B8 操作员 / B9 消息
const quickItems = [
  { label: '新建商品', icon: 'plus', path: '/pkg-merchant/product-edit/index' },
  { label: '商品管理', icon: 'package', path: '/pkg-merchant/products/index' },
  { label: '库存采购', icon: 'archive', path: '/pkg-merchant/inventory/index' },
  { label: '订单管理', icon: 'shopping-cart', path: '/pkg-merchant/orders/index' },
  { label: '结算收入', icon: 'credit-card', path: '/pkg-merchant/revenue/index' },
  { label: '评价管理', icon: 'star', path: '/pkg-merchant/reviews/index' },
  { label: '客户管理', icon: 'user-check', path: '/pkg-merchant/customers/index' },
  { label: '店铺资料', icon: 'store', path: '/pkg-merchant/profile/index' },
  { label: '操作员', icon: 'users', path: '/pkg-merchant/operators/index' },
  { label: '消息中心', icon: 'message-square', path: '/pkg-merchant/notices/index' },
]

const statusTextMap: Record<MerchantStatus, string> = {
  ACTIVE: '官方认证 · 营业中',
  SUSPENDED: '已暂停营业',
  CLOSED: '已关闭',
  PENDING_REVIEW: '审核中',
  REVIEW_FAILED: '审核未通过',
  DEPOSIT_PENDING: '待缴保证金',
  AGREEMENT_PENDING: '待签协议',
}
const statusInfo = computed(() => ({ text: statusTextMap[profile.value?.status ?? 'ACTIVE'] ?? '官方认证' }))

// 近7日订单趋势：由 metrics.items 归一化为柱图（真实数据·无金额字段故取 ordersCount）
const trend = computed(() => {
  const items = metrics.value?.items ?? []
  if (!items.length) return { bars: [] as { label: string; value: number; pct: number }[], yMax: 0, total: 0 }
  const vals = items.map((it) => Number(it.ordersCount || 0))
  const max = Math.max(...vals, 1)
  // Y 轴刻度取 max 向上取整到 2 的整倍（保证顶格美观）
  const yMax = Math.max(2, Math.ceil(max / 2) * 2)
  const bars = items.map((it, i) => {
    const v = Number(it.ordersCount || 0)
    const isLast = i === items.length - 1
    return {
      label: isLast ? '今日' : weekLabel(it.date),
      value: v,
      pct: Math.round((v / yMax) * 100),
    }
  })
  return { bars, yMax, total: vals.reduce((a, b) => a + b, 0) }
})

function weekLabel(dateStr: string): string {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const d = new Date((dateStr || '').replace(/-/g, '/'))
  const idx = d.getDay()
  return isNaN(idx) ? (dateStr || '').slice(5) : names[idx]
}

function money(v: string | number): string {
  return Number(v ?? 0).toFixed(2)
}
function badgeNum(n: number): string {
  return n > 99 ? '99+' : String(n)
}
function fmtDate(iso: string): string {
  return (iso || '').slice(0, 10)
}
function deltaClass(log: MerchantCreditLogItem): string {
  if (log.newScore > log.oldScore) return 'pop-up'
  if (log.newScore < log.oldScore) return 'pop-down'
  return ''
}

async function loadCredit() {
  creditLoading.value = true
  creditError.value = ''
  try {
    credit.value = await merchantBackendApi.getMyCredit()
  } catch (e) {
    creditError.value = (e as Error)?.message || '信用数据加载失败'
  } finally {
    creditLoading.value = false
  }
}

async function loadMetrics() {
  metricsLoading.value = true
  metricsError.value = ''
  try {
    metrics.value = await merchantBackendApi.getMyMetrics(7)
  } catch (e) {
    metricsError.value = (e as Error)?.message || '履约数据加载失败'
  } finally {
    metricsLoading.value = false
  }
}

// 待办侧栏计数（失败静默·不阻塞主数据）
async function loadTodo() {
  try {
    const paid = await merchantBackendApi.getOrders({ status: 'PAID', page: 1, pageSize: 1 })
    pendingShip.value = paid.total
  } catch { pendingShip.value = 0 }
  try {
    const inq = await merchantBackendApi.getInquiries({ page: 1, pageSize: 1 })
    pendingInquiry.value = inq.total
  } catch { pendingInquiry.value = 0 }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [d, p] = await Promise.all([
      merchantBackendApi.getDashboard(),
      merchantBackendApi.getProfile(),
    ])
    dashboard.value = d
    profile.value = p
    // 公告小红点（可选·失败静默）
    try {
      const notices = await merchantBackendApi.getNotices()
      hasNotice.value = notices.some((n) => !n.read)
    } catch { hasNotice.value = false }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function go(path: string) {
  navigateTo(path)
}

onLoad(() => {
  try {
    statusBarH.value = uni.getSystemInfoSync().statusBarHeight || 0
  } catch {
    statusBarH.value = 0
  }
  load()
  loadMetrics()
  loadCredit()
  loadTodo()
})
</script>

<style lang="scss" scoped>
$paper: #faf8f5;
$card: #ffffff;
$red: #c41e3a;
$gold: #c9a96e;
$ink: #2c2c2c;
$ink2: #6e6e73;
$ink3: #9a9a9a;
$line: #ece7e0;
$wash: #f5f1eb;

.page {
  min-height: 100vh;
  background: $paper;
  display: flex;
  flex-direction: column;
}

/* 店铺头（朱红品牌头） */
.head {
  background: linear-gradient(140deg, #c41e3a, #9e1830);
  padding: 0 40rpx 40rpx;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
.head-wm {
  position: absolute;
  right: -12rpx;
  bottom: -60rpx;
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 220rpx;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.08);
  line-height: 1;
}
.head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 28rpx;
  position: relative;
  z-index: 1;
}
.shop {
  display: flex;
  align-items: center;
  gap: 22rpx;
}
.shop-logo {
  width: 84rpx;
  height: 84rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.15);
  border: 1rpx solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.shop-logo-img {
  width: 84rpx;
  height: 84rpx;
  border-radius: 22rpx;
}
.shop-logo-txt {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.7);
}
.shop-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.shop-nm {
  font-family: 'Songti SC', serif;
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
}
.shop-st {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
}
.bell {
  position: relative;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bell-rd {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 16rpx;
  height: 16rpx;
  background: $gold;
  border-radius: 50%;
  border: 3rpx solid #b01b34;
}

/* 全局三态 */
.state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding-top: 200rpx;
}
.state-t {
  font-size: 27rpx;
  color: $ink3;
  text-align: center;
  padding: 0 60rpx;
}
.state-btn {
  padding: 14rpx 44rpx;
  border: 1rpx solid $red;
  border-radius: 999rpx;
}
.state-btn text {
  font-size: 27rpx;
  color: $red;
}

.scroll {
  flex: 1;
  height: 0; /* flex 子项内滚动 */
}

/* 信用分金色卡（叠品牌头下缘） */
.credit {
  margin: -20rpx 40rpx 0;
  position: relative;
  z-index: 2;
  border: 1rpx solid $gold;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #fdf9f0, #f5ead3);
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 12rpx 36rpx rgba(150, 120, 60, 0.15);
}
.credit-l {
  font-size: 22rpx;
  color: #96814f;
  display: block;
}
.credit-v {
  font-family: 'Songti SC', serif;
  font-size: 56rpx;
  font-weight: 700;
  color: #8a6d2f;
  line-height: 1.15;
}
.credit-g {
  border: 1rpx solid $gold;
  border-radius: 999rpx;
  padding: 8rpx 22rpx;
  background: rgba(255, 255, 255, 0.5);
}
.credit-g-txt {
  font-size: 22rpx;
  color: #8a6d2f;
}

/* 章节标题（朱红竖条） */
.sect-t {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 40rpx 40rpx 24rpx;
}
.sect-t::before {
  content: '';
  width: 8rpx;
  height: 32rpx;
  background: $red;
  border-radius: 4rpx;
}
.sect-t-txt {
  font-family: 'Songti SC', serif;
  font-size: 32rpx;
  font-weight: 700;
  color: $ink;
}

.card {
  margin: 0 40rpx;
  background: $card;
  border: 1rpx solid $line;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(80, 60, 40, 0.04);
}

/* 数据概览 */
.m-head {
  display: flex;
  gap: 16rpx;
  margin-bottom: 28rpx;
}
.m-tab {
  border: 1rpx solid $line;
  border-radius: 999rpx;
  padding: 8rpx 28rpx;
  background: $card;
}
.m-tab-txt {
  font-size: 24rpx;
  color: $ink2;
}
.m-tab.on {
  background: $red;
  border-color: $red;
}
.m-tab.on .m-tab-txt {
  color: #fff;
  font-weight: 700;
}
.m-row {
  display: flex;
  justify-content: space-between;
}
.m-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.mv {
  font-family: 'Songti SC', serif;
  font-size: 44rpx;
  font-weight: 700;
  color: $ink;
  line-height: 1.1;
}
.mv.red {
  color: $red;
}
.ml {
  font-size: 20rpx;
  color: $ink3;
  margin-top: 8rpx;
}

/* 近7日趋势 */
.trend {
  margin-top: 32rpx;
  border-top: 1rpx dashed $line;
  padding-top: 28rpx;
}
.tl {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.tl-l {
  font-size: 22rpx;
  color: $ink3;
}
.tl-r {
  font-size: 22rpx;
  color: $ink3;
}
.tl-b {
  color: $ink2;
  font-weight: 600;
}
.trend-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 32rpx 0;
}
.trend-state-t {
  font-size: 24rpx;
  color: $ink3;
  text-align: center;
}
.trend-retry {
  padding: 8rpx 32rpx;
  border: 1rpx solid $line;
  border-radius: 12rpx;
}
.trend-retry text {
  font-size: 22rpx;
  color: $ink;
}

.chart {
  display: flex;
  gap: 16rpx;
}
.yaxis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 176rpx;
  padding-bottom: 32rpx;
}
.yaxis-t {
  font-size: 18rpx;
  color: $ink3;
  text-align: right;
}
.plot {
  flex: 1;
}
.bars {
  display: flex;
  align-items: flex-end;
  gap: 14rpx;
  height: 176rpx;
  border-left: 1rpx solid $line;
  border-bottom: 1rpx solid $line;
  padding: 0 4rpx;
}
.bcol {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
}
.bval {
  font-size: 16rpx;
  color: $ink3;
  margin-bottom: 4rpx;
}
.bcol.hot .bval {
  color: $red;
  font-weight: 700;
}
.bar {
  width: 100%;
  background: #e8dfd0;
  border-radius: 6rpx 6rpx 0 0;
  min-height: 4rpx;
}
.bcol.hot .bar {
  background: $red;
}
.xaxis {
  display: flex;
  gap: 14rpx;
  margin-top: 10rpx;
  padding: 0 4rpx;
}
.xaxis-t {
  flex: 1;
  text-align: center;
  font-size: 18rpx;
  color: $ink3;
}

/* 待办三卡 */
.todo {
  margin: 0 40rpx;
  display: flex;
  gap: 22rpx;
}
.tcard {
  flex: 1;
  background: $card;
  border: 1rpx solid $line;
  border-radius: 28rpx;
  padding: 28rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  box-shadow: 0 4rpx 16rpx rgba(80, 60, 40, 0.04);
}
.badge {
  position: absolute;
  top: 16rpx;
  right: 20rpx;
  background: $red;
  border-radius: 999rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.badge-t {
  font-size: 18rpx;
  color: #fff;
  line-height: 1;
}
.tn {
  font-family: 'Songti SC', serif;
  font-size: 48rpx;
  font-weight: 700;
  color: $ink;
  line-height: 1.1;
}
.tt {
  font-size: 20rpx;
  color: $ink2;
  margin-top: 8rpx;
}

/* 快捷入口 */
.quick {
  margin: 0 40rpx;
  display: flex;
  flex-wrap: wrap;
}
.qi {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32rpx;
}
.qc {
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
  background: $wash;
  border: 1rpx solid $line;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}
.qi-t {
  font-size: 22rpx;
  color: $ink2;
}

.foot-gap {
  height: 40rpx;
}

/* 信用变动明细弹层 */
.pop-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.pop {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.pop-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.pop-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $ink;
}
.pop-close {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pop-body {
  flex: 1;
  max-height: 56vh;
}
.pop-log {
  border: 1rpx solid $line;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.pop-log-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.pop-log-week {
  font-size: 26rpx;
  font-weight: 600;
  color: $ink;
}
.pop-log-delta {
  font-size: 26rpx;
  font-weight: 600;
  color: $ink2;
}
.pop-log-delta.pop-up {
  color: #16a34a;
}
.pop-log-delta.pop-down {
  color: $red;
}
.pop-factors {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.pop-factor {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pop-factor-name {
  font-size: 24rpx;
  color: $ink2;
}
.pop-factor-score {
  font-size: 24rpx;
  color: $ink;
}
</style>
