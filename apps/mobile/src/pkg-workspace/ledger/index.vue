<script setup lang="ts">
/**
 * 收入账本（对应 V0 ledger-book.tsx）
 *
 * 账本 = 平台内收益（UserEarning，只读）+ 线下手记两条流。
 * 老师面客收的现金、微信转账，平台本来一无所知；不给手记的口子，账本永远对不上，
 * 老师就不会用它做经营决策，这个板块也就白做了。所以手记是刚需，不是补充。
 * 平台结算的条目 editable=false —— 平台算出来的钱不能让老师自己改，否则对账失去意义。
 */
import { ref, computed, onMounted } from 'vue'
import { useOverlayScrollLock } from '@/composables/use-overlay-scroll-lock'
import AppIcon from '@/components/common/app-icon.vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import { wsApi, type LedgerEntry } from '../lib/workspace-api'

interface LedgerStats {
  total: number
  manualTotal: number
  platformTotal: number
  count: number
  avg: number
}
interface ServiceSlice {
  service: string
  count: number
  amount: number
}

/** 收款方式：只做单选 chip，别让老师打字，打字就会出现「微信」「微信支付」「wx」三种写法 */
const PAY_METHODS = ['现金', '微信', '支付宝', '转账']

const month = ref(todayMonth())
const loading = ref(true)
const failed = ref(false)
const entries = ref<LedgerEntry[]>([])
const stats = ref<LedgerStats>({ total: 0, manualTotal: 0, platformTotal: 0, count: 0, avg: 0 })
const byService = ref<ServiceSlice[]>([])

const addOpen = ref(false)
useOverlayScrollLock(() => addOpen.value)
const saving = ref(false)
const fService = ref('')
const fAmount = ref('')
const fClient = ref('')
const fPayMethod = ref(PAY_METHODS[0])
const fDate = ref(todayDate())
const fNote = ref('')

/** 占比条以「本月最大的那类」为满格，而不是以总额为满格——总额满格时小类几乎看不见 */
const maxServiceAmount = computed(() =>
  byService.value.reduce((m, s) => Math.max(m, Number(s.amount) || 0), 0),
)

function todayMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function todayDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function money(n: unknown): string {
  const v = Number(n)
  return Number.isFinite(v) ? v.toFixed(2) : '0.00'
}

function dateText(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function barWidth(s: ServiceSlice): string {
  if (!maxServiceAmount.value) return '0%'
  return `${Math.max(4, (Number(s.amount) / maxServiceAmount.value) * 100)}%`
}

async function load() {
  loading.value = true
  failed.value = false
  try {
    const res = await wsApi.ledger(month.value)
    entries.value = res?.entries ?? []
    stats.value = res?.stats ?? { total: 0, manualTotal: 0, platformTotal: 0, count: 0, avg: 0 }
    byService.value = res?.byService ?? []
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)

function onMonthChange(e: any) {
  month.value = e?.detail?.value ?? month.value
  load()
}

function onDateChange(e: any) {
  fDate.value = e?.detail?.value ?? fDate.value
}

function openAdd() {
  fService.value = ''
  fAmount.value = ''
  fClient.value = ''
  fPayMethod.value = PAY_METHODS[0]
  fDate.value = todayDate()
  fNote.value = ''
  addOpen.value = true
}

async function submitAdd() {
  if (!fService.value.trim()) {
    uni.showToast({ title: '请填服务名目', icon: 'none' })
    return
  }
  const amount = Number(fAmount.value)
  if (!Number.isFinite(amount) || amount <= 0) {
    uni.showToast({ title: '请填正确金额', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await wsApi.addLedger({
      service: fService.value.trim(),
      amount,
      clientName: fClient.value.trim() || undefined,
      payMethod: fPayMethod.value,
      occurredAt: fDate.value || undefined,
      note: fNote.value.trim() || undefined,
    })
    addOpen.value = false
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '记账失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function confirmDelete(en: LedgerEntry) {
  uni.showModal({
    title: '删除这笔',
    content: `确定删除「${en.service} · ¥${money(en.amount)}」？删除后不可恢复。`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await wsApi.deleteLedger(en.id)
        await load()
      } catch (e: any) {
        uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
      }
    },
  })
}
</script>

<template>
  <view class="lg-page">
    <ToolHeader title="收入账本" subtitle="平台结算 + 线下手记" back-href="/pkg-workspace/index/index" />

    <view class="lg">
      <!-- 月份 + 总收入 -->
      <PaperCard gold padding="lg">
        <view class="lg-top">
          <picker mode="date" fields="month" :value="month" @change="onMonthChange">
            <view class="lg-month">
              <AppIcon name="calendar-days" :size="16" color="#C41E3A" />
              <text class="lg-month-txt">{{ month }}</text>
              <AppIcon name="chevron-right" :size="14" color="#9A8C7E" />
            </view>
          </picker>
          <view class="lg-add" @tap="openAdd">
            <AppIcon name="plus" :size="16" color="#fff" />
            <text class="lg-add-txt">记一笔</text>
          </view>
        </view>

        <view class="lg-total">
          <text class="lg-total-label">本月总收入</text>
          <text class="lg-total-num">¥{{ money(stats.total) }}</text>
        </view>

        <view class="lg-stats">
          <view class="lg-stat">
            <AppIcon name="wallet" :size="16" color="#B8860B" />
            <text class="lg-stat-num">¥{{ money(stats.platformTotal) }}</text>
            <text class="lg-stat-label">平台内</text>
          </view>
          <view class="lg-stat">
            <AppIcon name="coins" :size="16" color="#B8860B" />
            <text class="lg-stat-num">¥{{ money(stats.manualTotal) }}</text>
            <text class="lg-stat-label">线下手记</text>
          </view>
          <view class="lg-stat">
            <AppIcon name="file-text" :size="16" color="#B8860B" />
            <text class="lg-stat-num">{{ stats.count }}</text>
            <text class="lg-stat-label">单数</text>
          </view>
          <view class="lg-stat">
            <AppIcon name="bar-chart-3" :size="16" color="#B8860B" />
            <text class="lg-stat-num">¥{{ money(stats.avg) }}</text>
            <text class="lg-stat-label">客单价</text>
          </view>
        </view>
      </PaperCard>

      <!-- 服务类型分布 -->
      <template v-if="!loading && byService.length">
        <SectionTitle title="收入构成" subtitle="按服务类型" />
        <PaperCard padding="lg">
          <view v-for="s in byService" :key="s.service" class="lg-bar-row">
            <view class="lg-bar-head">
              <text class="lg-bar-name">{{ s.service }}</text>
              <text class="lg-bar-amount">¥{{ money(s.amount) }} · {{ s.count }}单</text>
            </view>
            <view class="lg-bar-track">
              <view class="lg-bar-fill" :style="{ width: barWidth(s) }" />
            </view>
          </view>
        </PaperCard>
      </template>

      <!-- 流水 -->
      <SectionTitle title="收入流水" :subtitle="`${entries.length} 笔`" />

      <view v-if="loading" class="lg-skeleton" />

      <PaperCard v-else-if="!entries.length" padding="lg">
        <view class="lg-empty">
          <AppIcon name="wallet" :size="40" color="#D5C9B8" />
          <text class="lg-empty-txt">本月还没有收入记录</text>
          <text class="lg-empty-sub">平台内的成交会自动入账；线下收的现金点上方「记一笔」补上，账才对得齐</text>
        </view>
      </PaperCard>

      <PaperCard v-else padding="none">
        <view
          v-for="(en, i) in entries"
          :key="en.id"
          class="lg-item"
          :class="{ 'lg-item--line': i !== entries.length - 1 }"
        >
          <view class="lg-item-main">
            <view class="lg-item-row">
              <text class="lg-item-service">{{ en.service }}</text>
              <text v-if="en.source === 'platform'" class="lg-item-badge">平台结算</text>
            </view>
            <view class="lg-item-meta">
              <text v-if="en.clientName" class="lg-item-client">{{ en.clientName }}</text>
              <text v-if="en.payMethod" class="lg-item-pay">{{ en.payMethod }}</text>
              <text class="lg-item-date">{{ dateText(en.occurredAt) }}</text>
            </view>
          </view>
          <text class="lg-item-amount">+¥{{ money(en.amount) }}</text>
          <!-- 平台结算的钱不给删，删了对账就废了 -->
          <view v-if="en.editable" class="lg-item-del" @tap.stop="confirmDelete(en)">
            <AppIcon name="trash-2" :size="16" color="#B8AA9A" />
          </view>
          <view v-else class="lg-item-lock" />
        </view>
      </PaperCard>

      <view v-if="failed" class="lg-failed" @tap="load">
        <text class="lg-failed-txt">加载失败，点击重试</text>
      </view>
    </view>

    <!-- 记一笔 -->
    <view v-if="addOpen" class="lg-mask" @tap="addOpen = false" @touchmove.self.prevent>
      <view class="lg-sheet" @tap.stop @touchmove.stop>
        <text class="lg-sheet-title">记一笔</text>
        <text class="lg-sheet-sub">线下收的钱，记下来账才是全的</text>

        <text class="lg-label">服务名目</text>
        <input v-model="fService" class="lg-input" placeholder="如：八字详批" placeholder-class="lg-ph" />

        <text class="lg-label">金额（元）</text>
        <input v-model="fAmount" type="digit" class="lg-input" placeholder="如：800" placeholder-class="lg-ph" />

        <text class="lg-label">客户称呼（选填）</text>
        <input v-model="fClient" class="lg-input" placeholder="如：陈女士" placeholder-class="lg-ph" />

        <text class="lg-label">收款方式</text>
        <view class="lg-chips">
          <view
            v-for="p in PAY_METHODS"
            :key="p"
            class="lg-chip"
            :class="{ 'lg-chip--on': fPayMethod === p }"
            @tap="fPayMethod = p"
          >
            <text class="lg-chip-txt" :class="{ 'lg-chip-txt--on': fPayMethod === p }">{{ p }}</text>
          </view>
        </view>

        <text class="lg-label">收款日期</text>
        <picker mode="date" :value="fDate" @change="onDateChange">
          <view class="lg-picker">
            <text class="lg-picker-txt">{{ fDate }}</text>
            <AppIcon name="calendar-days" :size="16" color="#9A8C7E" />
          </view>
        </picker>

        <text class="lg-label">备注（选填）</text>
        <input v-model="fNote" class="lg-input" placeholder="如：老客介绍" placeholder-class="lg-ph" />

        <view class="lg-btn" @tap="submitAdd">
          <text class="lg-btn-txt">{{ saving ? '保存中…' : '保存' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.lg-page {
  min-height: 100vh;
  background: #F7F3EC;
}

.lg {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx 24rpx 48rpx;
}

/* 顶部 */
.lg-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lg-month {
  display: flex;
  align-items: center;
  gap: 8rpx;
  height: 64rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 32rpx;
  background: #fff;
}

.lg-month-txt {
  font-size: 26rpx;
  font-weight: 600;
  color: #3A2A1E;
}

.lg-add {
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 32rpx;
  background: #C41E3A;
  flex-shrink: 0;
}

.lg-add-txt {
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
}

.lg-total {
  margin-top: 28rpx;
  text-align: center;
}

.lg-total-label {
  display: block;
  font-size: 22rpx;
  color: #9A8C7E;
}

.lg-total-num {
  display: block;
  margin-top: 8rpx;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 56rpx;
  font-weight: 700;
  color: #C41E3A;
}

.lg-stats {
  display: flex;
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(58, 42, 30, 0.08);
}

.lg-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.lg-stat-num {
  font-size: 24rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.lg-stat-label {
  font-size: 20rpx;
  color: #9A8C7E;
}

/* 占比条 */
.lg-bar-row {
  margin-bottom: 24rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.lg-bar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.lg-bar-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #3A2A1E;
}

.lg-bar-amount {
  font-size: 22rpx;
  color: #9A8C7E;
}

.lg-bar-track {
  height: 14rpx;
  border-radius: 999rpx;
  background: rgba(154, 140, 126, 0.12);
  overflow: hidden;
}

.lg-bar-fill {
  height: 100%;
  border-radius: 999rpx;
  background: #C41E3A;
}

/* 流水 */
.lg-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
}

.lg-item--line {
  border-bottom: 1rpx solid rgba(58, 42, 30, 0.08);
}

.lg-item-main {
  flex: 1;
  min-width: 0;
}

.lg-item-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.lg-item-service {
  font-size: 28rpx;
  font-weight: 700;
  color: #3A2A1E;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lg-item-badge {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: rgba(196, 30, 58, 0.08);
  font-size: 20rpx;
  color: #C41E3A;
}

.lg-item-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 8rpx;
}

.lg-item-client,
.lg-item-pay,
.lg-item-date {
  font-size: 21rpx;
  color: #9A8C7E;
}

.lg-item-amount {
  flex-shrink: 0;
  font-size: 28rpx;
  font-weight: 700;
  color: #C41E3A;
}

.lg-item-del {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  flex-shrink: 0;
}

/* 占位，保证平台条目与手记条目右侧对齐 */
.lg-item-lock {
  width: 56rpx;
  height: 56rpx;
  flex-shrink: 0;
}

/* 空态 */
.lg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 56rpx 24rpx;
}

.lg-empty-txt {
  font-size: 28rpx;
  color: #7A6C5E;
}

.lg-empty-sub {
  font-size: 22rpx;
  line-height: 1.6;
  color: #B8AA9A;
  text-align: center;
}

.lg-skeleton {
  height: 300rpx;
  border-radius: 16rpx;
  background: rgba(154, 140, 126, 0.1);
}

.lg-failed {
  padding: 24rpx;
  text-align: center;
}

.lg-failed-txt {
  font-size: 24rpx;
  color: #C41E3A;
}

/* 弹层 */
.lg-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
}

.lg-sheet {
  width: 100%;
  max-height: 84vh;
  overflow-y: auto;
  padding: 32rpx 32rpx calc(48rpx + env(safe-area-inset-bottom));
  border-radius: 24rpx 24rpx 0 0;
  background: #FDFAF4;
}

.lg-sheet-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #3A2A1E;
  text-align: center;
}

.lg-sheet-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9A8C7E;
  text-align: center;
}

.lg-label {
  display: block;
  margin: 24rpx 0 12rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.lg-input {
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 12rpx;
  background: #fff;
  font-size: 26rpx;
  color: #3A2A1E;
}

.lg-ph {
  color: #C4B8A8;
}

.lg-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 12rpx;
  background: #fff;
}

.lg-picker-txt {
  font-size: 26rpx;
  color: #3A2A1E;
}

.lg-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.lg-chip {
  padding: 10rpx 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 30rpx;
}

.lg-chip--on {
  border-color: #C41E3A;
  background: #C41E3A;
}

.lg-chip-txt {
  font-size: 24rpx;
  color: #3A2A1E;
}

.lg-chip-txt--on {
  color: #fff;
}

.lg-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  margin-top: 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
}

.lg-btn-txt {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}
</style>
