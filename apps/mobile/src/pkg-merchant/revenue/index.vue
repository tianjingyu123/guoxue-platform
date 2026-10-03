<!--
  B5 · 结算收入（商家侧只读 · V0 还原）
  态A 结算总览：金色深色总览卡（可提现余额金色数字 + 待结算/累计已结算/平台费率）
              + 只读提示条 + 结算账单列表（周期·状态胶囊·朱红金额·订单笔数/到账）
  态B 结算单详情：点击账单展开「金额构成 + 结算信息」明细
  规格红线：商家侧只读；结算周期与费率由平台设定；生成/发放在管理后台，不做发放操作。
  数据：merchantBackendApi.getRevenue() / getSettlements()
-->
<template>
  <view class="rv-page">
    <!-- 顶部导航（朱红渐变） -->
    <view class="rv-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="rv-nav-inner">
        <view class="rv-back" @tap="go('/merchant/dashboard')">
          <AppIcon name="arrow-left" :size="20" color="#ffffff" />
        </view>
        <text class="rv-title">结算收入</text>
        <view class="rv-nav-ph" />
      </view>
    </view>

    <scroll-view scroll-y class="rv-scroll">
      <!-- Loading -->
      <view v-if="loading" class="rv-state">
        <text class="rv-state-txt">加载中…</text>
      </view>
      <!-- Error -->
      <view v-else-if="error" class="rv-state">
        <AppIcon name="alert-circle" :size="48" color="#c41e3a" />
        <text class="rv-state-title">加载失败</text>
        <text class="rv-state-txt">{{ error }}</text>
        <view class="rv-retry" @tap="load"><text>重试</text></view>
      </view>

      <template v-else>
        <view class="rv-body">
          <!-- 金色深色总览卡 -->
          <view class="rv-overview">
            <view class="rv-ov-mark">◈</view>
            <!-- 🔴 原文案「可提现余额（元）· 提现至绑定的平台钱包」是错的：
                 后端 getRevenueOverview 返回的是订单聚合的【累计应得分成】(totalSales × 分成率)，
                 不是一笔可提取的钱包余额；且商家侧本就只读、无自助提现（结算单由平台生成并打款）。
                 照原文案商家会以为"钱看得见却拿不出、提现按钮找不到"——按事实陈述。 -->
            <text class="rv-ov-label">累计应得分成（元）</text>
            <text class="rv-ov-amount">{{ money(revenue.merchantShare) }}</text>
            <text class="rv-ov-hint">已扣除平台服务费 · 由平台按结算周期生成结算单并打款</text>
            <view class="rv-ov-row">
              <view class="rv-ov-cell">
                <text class="rv-ov-n">¥{{ money(pendingAmount) }}</text>
                <text class="rv-ov-t">待结算</text>
              </view>
              <view class="rv-ov-cell">
                <text class="rv-ov-n">¥{{ money(settledAmount) }}</text>
                <text class="rv-ov-t">累计已结算</text>
              </view>
              <view class="rv-ov-cell">
                <text class="rv-ov-n">{{ platformFeePct }}</text>
                <text class="rv-ov-t">平台费率</text>
              </view>
            </view>
          </view>

          <!-- 只读提示条：讲清「钱怎么到账」，否则商家会一直找提现按钮（本页无自助提现是设计如此） -->
          <view class="rv-readonly">
            <text class="rv-readonly-txt">◈ 结算数据由平台统一核算，商家侧仅供查看，不可修改</text>
            <text class="rv-readonly-txt">◈ 无需手动提现：平台按结算周期生成结算单，审核后打款至你的收款账户，进度见下方账单</text>
          </view>

          <!-- 结算账单 -->
          <text class="rv-sec-title">结算账单</text>

          <view v-if="settlements.length" class="rv-list">
            <view v-for="s in settlements" :key="s.id" class="rv-bill" @tap="toggle(s.id)">
              <view class="rv-bill-top">
                <text class="rv-bill-period">{{ periodText(s) }}</text>
                <text class="rv-bill-status" :class="statusClass(s.status)">{{ stCfg(s.status).label }}</text>
              </view>
              <view class="rv-bill-mid">
                <text class="rv-bill-amount">¥{{ money(s.settlementAmount) }}</text>
                <view class="rv-bill-meta">
                  <text class="rv-bill-meta-l">订单 {{ s.orderCount }} 笔</text>
                  <text class="rv-bill-meta-l">{{ toAccountText(s) }}</text>
                </view>
              </view>

              <!-- 态B 展开：金额构成 + 结算信息 -->
              <view v-if="expandedId === s.id" class="rv-detail">
                <view class="rv-detail-block">
                  <view class="rv-detail-h">
                    <text class="rv-detail-h-ic">◈</text>
                    <text class="rv-detail-h-t">金额构成</text>
                  </view>
                  <view class="rv-kv">
                    <text class="rv-kv-k">订单成交额（{{ s.orderCount }} 笔）</text>
                    <text class="rv-kv-v">¥{{ money(s.totalRevenue) }}</text>
                  </view>
                  <view class="rv-kv">
                    <text class="rv-kv-k">平台服务费（{{ platformFeePct }}）</text>
                    <text class="rv-kv-v minus">− ¥{{ money(s.commission) }}</text>
                  </view>
                  <view class="rv-kv total">
                    <text class="rv-kv-k">实际结算</text>
                    <text class="rv-kv-v">¥{{ money(s.settlementAmount) }}</text>
                  </view>
                </view>
                <view class="rv-detail-block">
                  <view class="rv-detail-h">
                    <text class="rv-detail-h-ic">◈</text>
                    <text class="rv-detail-h-t">结算信息</text>
                  </view>
                  <view class="rv-kv">
                    <text class="rv-kv-k">结算单号</text>
                    <text class="rv-kv-v">{{ s.id }}</text>
                  </view>
                  <view class="rv-kv">
                    <text class="rv-kv-k">结算周期</text>
                    <text class="rv-kv-v">{{ periodRange(s) }}</text>
                  </view>
                  <view class="rv-kv">
                    <text class="rv-kv-k">结算状态</text>
                    <text class="rv-kv-v">{{ stCfg(s.status).label }}</text>
                  </view>
                  <view class="rv-kv">
                    <text class="rv-kv-k">到账时间</text>
                    <text class="rv-kv-v">{{ s.paidAt ? dt(s.paidAt) : '待结算' }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 空态 -->
          <view v-else class="rv-empty">
            <AppIcon name="file-text" :size="40" color="#cccccc" />
            <text class="rv-empty-txt">暂无结算账单</text>
          </view>

          <!-- 结算周期说明 -->
          <view class="rv-note">
            <AppIcon name="clock" :size="16" color="#c9a96e" />
            <view class="rv-note-body">
              <text class="rv-note-title">结算周期说明</text>
              <text class="rv-note-desc">订单完成后平台按半月周期统一核算，生成结算单。实际结算 = 订单成交额 − 平台服务费。结算与到账走平台统一账户/钱包体系，商家侧仅供查看。</text>
            </view>
          </view>

          <view class="rv-bottom-gap" />
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  merchantBackendApi,
  settlementStatusConfig,
  type RevenueOverview,
  type MerchantSettlement,
} from '@/pkg-merchant/lib/merchant-data'

const statusBarHeight = ref(0)
const loading = ref(true)
const error = ref('')

const revenue = ref<RevenueOverview>({ totalSales: 0, totalOrders: 0, merchantShare: 0, platformShare: 0, commissionRate: 0 })
const settlements = ref<MerchantSettlement[]>([])
const expandedId = ref('')

// 聚合总额由后端对全量结算单计算；旧接口缺少聚合字段时才回落到当前列表求和。
const pendingAmount = computed(() => {
  if (revenue.value.pendingSettlement != null) return Number(revenue.value.pendingSettlement) || 0
  return settlements.value
    .filter((s) => s.status === 'PENDING')
    .reduce((sum, s) => sum + (Number(s.settlementAmount) || 0), 0)
})
const settledAmount = computed(() => {
  if (revenue.value.settledAmount != null) return Number(revenue.value.settledAmount) || 0
  return settlements.value
    .filter((s) => s.status === 'PAID')
    .reduce((sum, s) => sum + (Number(s.settlementAmount) || 0), 0)
})

// commissionRate 是兼容旧字段，实际语义为“商家留成比例”；平台服务费应显示 1 - 留成比例。
const merchantShareRate = computed(() => {
  const raw = Number(revenue.value.merchantShareRate ?? revenue.value.commissionRate)
  if (!Number.isFinite(raw)) return 0.85
  return Math.min(1, Math.max(0, raw > 1 ? raw / 100 : raw))
})
const platformFeePct = computed(() => `${Number(((1 - merchantShareRate.value) * 100).toFixed(2))}%`)

function money(v: number | string | null | undefined) {
  return (Number(v) || 0).toFixed(2)
}
function dt(v?: string | null) {
  return v ? String(v).slice(0, 10) : ''
}
function periodText(s: MerchantSettlement) {
  return `${dt(s.periodStart)} ~ ${dt(s.periodEnd)}`
}
function periodRange(s: MerchantSettlement) {
  const a = dt(s.periodStart).slice(5)
  const b = dt(s.periodEnd).slice(5)
  return `${a} ~ ${b}`
}
function toAccountText(s: MerchantSettlement) {
  return s.status === 'PAID' && s.paidAt ? `已到账 ${dt(s.paidAt).slice(5)}` : '待结算'
}
function stCfg(status: string) {
  return settlementStatusConfig[status] || { label: status, color: '#6e6e73', bg: '#f3f4f6' }
}
// 状态胶囊配色：已结算=金 / 待结算=朱红 / 其他=灰
function statusClass(status: string) {
  if (status === 'PAID') return 'settled'
  if (status === 'PENDING') return 'pending'
  return 'other'
}
function toggle(id: string) {
  expandedId.value = expandedId.value === id ? '' : id
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [rev, settle] = await Promise.all([
      merchantBackendApi.getRevenue(),
      merchantBackendApi.getSettlements({ pageSize: 50 }),
    ])
    revenue.value = rev
    settlements.value = settle.items
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function go(path: string) {
  navigateTo(path)
}

onMounted(() => {
  try {
    statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
  } catch (e) {
    statusBarHeight.value = 0
  }
  load()
})
</script>

<style lang="scss" scoped>
.rv-page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}

/* 顶部导航（朱红渐变） */
.rv-nav {
  background: linear-gradient(135deg, #c41e3a, #a01830);
  flex-shrink: 0;
}
.rv-nav-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 32rpx;
}
.rv-back {
  width: 60rpx;
  display: flex;
  align-items: center;
}
.rv-title {
  flex: 1;
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
  font-family: 'Songti SC', serif;
}
.rv-nav-ph {
  width: 60rpx;
}

.rv-scroll {
  flex: 1;
  height: 0;
}
.rv-body {
  padding: 32rpx 40rpx 60rpx;
}

/* 金色深色总览卡 */
.rv-overview {
  position: relative;
  background: linear-gradient(135deg, #2c2620, #3a322a);
  border-radius: 36rpx;
  padding: 44rpx;
  margin-bottom: 36rpx;
  overflow: hidden;
}
.rv-ov-mark {
  position: absolute;
  right: 32rpx;
  top: 24rpx;
  font-size: 80rpx;
  color: rgba(201, 169, 110, 0.18);
  line-height: 1;
}
.rv-ov-label {
  font-size: 24rpx;
  color: #c9a96e;
  display: block;
}
.rv-ov-amount {
  font-family: 'Songti SC', serif;
  font-size: 68rpx;
  font-weight: 700;
  color: #c9a96e;
  margin: 12rpx 0 4rpx;
  display: block;
}
.rv-ov-hint {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
  display: block;
}
.rv-ov-row {
  display: flex;
  margin-top: 36rpx;
  padding-top: 28rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.12);
}
.rv-ov-cell {
  flex: 1;
}
.rv-ov-n {
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;
  display: block;
}
.rv-ov-t {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.55);
  margin-top: 4rpx;
  display: block;
}

/* 只读提示条 */
.rv-readonly {
  background: #fbf7ef;
  border-radius: 24rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 32rpx;
}
.rv-readonly-txt {
  font-size: 22rpx;
  color: #c9a96e;
  text-align: center;
  display: block;
}

.rv-sec-title {
  font-family: 'Songti SC', serif;
  font-size: 30rpx;
  color: #2c2c2c;
  margin: 8rpx 0 24rpx;
  display: block;
}

/* 账单列表 */
.rv-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.rv-bill {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 28rpx 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(44, 38, 30, 0.04);
}
.rv-bill-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rv-bill-period {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.rv-bill-status {
  font-size: 22rpx;
  padding: 4rpx 20rpx;
  border-radius: 999rpx;
}
.rv-bill-status.settled {
  background: #f0eae0;
  color: #c9a96e;
}
.rv-bill-status.pending {
  background: #fbe9ec;
  color: #c41e3a;
}
.rv-bill-status.other {
  background: #f3f0eb;
  color: #6e6e73;
}
.rv-bill-mid {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 20rpx;
}
.rv-bill-amount {
  font-family: 'Songti SC', serif;
  font-size: 44rpx;
  font-weight: 700;
  color: #c41e3a;
}
.rv-bill-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
}
.rv-bill-meta-l {
  font-size: 22rpx;
  color: #999999;
}

/* 态B 展开明细 */
.rv-detail {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #edeae4;
}
.rv-detail-block {
  margin-bottom: 20rpx;
}
.rv-detail-block:last-child {
  margin-bottom: 0;
}
.rv-detail-h {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 12rpx;
}
.rv-detail-h-ic {
  font-size: 26rpx;
  color: #c9a96e;
}
.rv-detail-h-t {
  font-family: 'Songti SC', serif;
  font-size: 28rpx;
  color: #2c2c2c;
}
.rv-kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14rpx 0;
  border-bottom: 1rpx dashed #edeae4;
}
.rv-kv:last-child {
  border-bottom: none;
}
.rv-kv-k {
  font-size: 25rpx;
  color: #6e6e73;
}
.rv-kv-v {
  font-size: 25rpx;
  color: #2c2c2c;
}
.rv-kv-v.minus {
  color: #6e6e73;
}
.rv-kv.total .rv-kv-v {
  color: #c41e3a;
  font-weight: 700;
  font-size: 30rpx;
}

/* 空态 */
.rv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 96rpx 0;
  gap: 24rpx;
}
.rv-empty-txt {
  font-size: 27rpx;
  color: #999999;
}

/* 结算周期说明 */
.rv-note {
  margin-top: 32rpx;
  background: #fbf7ef;
  border: 1rpx solid #edeae4;
  border-radius: 24rpx;
  padding: 28rpx;
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
}
.rv-note-body {
  flex: 1;
  min-width: 0;
}
.rv-note-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #2c2c2c;
  display: block;
}
.rv-note-desc {
  font-size: 23rpx;
  color: #6e6e73;
  margin-top: 8rpx;
  line-height: 1.6;
  display: block;
}

/* 三态 */
.rv-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
  gap: 24rpx;
}
.rv-state-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.rv-state-txt {
  font-size: 27rpx;
  color: #999999;
  text-align: center;
}
.rv-retry {
  margin-top: 8rpx;
  padding: 18rpx 60rpx;
  border: 1rpx solid #c41e3a;
  border-radius: 999rpx;
}
.rv-retry text {
  font-size: 27rpx;
  color: #c41e3a;
}

.rv-bottom-gap {
  height: 48rpx;
}
</style>
