<template>
  <!-- 申请提现表单 -->
  <view v-if="showForm" class="wd-page">
    <view class="wd-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="wd-nav-inner">
        <view class="wd-icon-btn" @tap="showForm = false"><AppIcon name="arrow-left" :size="24" color="#1a1a1a" /></view>
        <text class="wd-title">申请提现</text>
        <view class="wd-w8" />
      </view>
    </view>

    <scroll-view scroll-y class="wd-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <view class="wd-balance-box">
        <text class="wd-balance-label">可提现余额</text>
        <text class="wd-balance-num">¥{{ withdrawable.toFixed(2) }}</text>
      </view>

      <view class="wd-amount-sec">
        <text class="wd-sec-title">提现金额</text>
        <view class="wd-amount-input-wrap">
          <text class="wd-amount-prefix">¥</text>
          <input class="wd-amount-input" type="number" v-model="withdrawAmount" placeholder="0.00" />
          <view class="wd-all-btn" @tap="withdrawAll">全部提现</view>
        </view>
        <view v-if="amount > 0" class="wd-fee">
          <view class="wd-fee-row"><text>手续费（0.6%，最低¥1）</text><text>-¥{{ fee.toFixed(2) }}</text></view>
          <view class="wd-fee-row wd-fee-actual"><text>实际到账</text><text>¥{{ actualAmount.toFixed(2) }}</text></view>
        </view>
        <text v-if="amount > 0 && amount < minWithdraw" class="wd-warn">最低提现金额为 {{ minWithdraw }} 元</text>
        <text v-else-if="amount > withdrawable" class="wd-warn">超出可提现余额</text>
      </view>

      <view class="wd-method-sec">
        <text class="wd-sec-title">提现方式</text>
        <view class="wd-method" :class="{ 'wd-method-active': method === 'alipay' }" @tap="method = 'alipay'">
          <view class="wd-method-icon" style="background:#3b82f6"><AppIcon name="smartphone" :size="20" color="#ffffff" /></view>
          <view class="wd-method-info">
            <text class="wd-method-name">支付宝</text>
            <text class="wd-method-desc">2小时内到账</text>
          </view>
          <AppIcon v-if="method === 'alipay'" name="check-circle" :size="20" color="#c41e3a" />
        </view>
        <view class="wd-method" :class="{ 'wd-method-active': method === 'bank' }" @tap="method = 'bank'">
          <view class="wd-method-icon" style="background:#16a34a"><AppIcon name="landmark" :size="20" color="#ffffff" /></view>
          <view class="wd-method-info">
            <text class="wd-method-name">银行卡</text>
            <text class="wd-method-desc">1-3个工作日到账</text>
          </view>
          <AppIcon v-if="method === 'bank'" name="check-circle" :size="20" color="#c41e3a" />
        </view>
      </view>

      <view class="wd-account-sec">
        <text class="wd-sec-title">收款账号</text>
        <input class="wd-account-input" v-model="account" :placeholder="method === 'alipay' ? '请输入支付宝账号' : '请输入银行卡号'" />
      </view>
      <view class="wd-pad" />
    </scroll-view>

    <view class="wd-footer">
      <view class="wd-submit" :class="{ 'wd-submit-disabled': submitDisabled }" @tap="handleSubmit">
        {{ submitting ? '提交中...' : '确认提现 ¥' + actualAmount.toFixed(2) }}
      </view>
    </view>
  </view>

  <!-- 提现总览 -->
  <view v-else class="wd-page">
    <view class="wd-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="wd-nav-inner">
        <view class="wd-icon-btn" @tap="goBack"><AppIcon name="arrow-left" :size="24" color="#1a1a1a" /></view>
        <text class="wd-title">创作者提现</text>
        <view class="wd-w8" />
      </view>
    </view>

    <scroll-view scroll-y class="wd-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- 加载态 -->
      <view v-if="loading" class="wd-state">
        <text class="wd-state-txt">加载中…</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="errMsg" class="wd-state">
        <AppIcon name="alert-circle" :size="40" color="#ccc" />
        <text class="wd-state-txt">{{ errMsg }}</text>
        <view class="wd-state-btn" @tap="load">重试</view>
      </view>

      <template v-else-if="overview">
        <!-- 余额卡片 -->
        <view class="wd-card-balance">
          <view class="wd-card-top">
            <view>
              <text class="wd-card-label">可提现余额</text>
              <text class="wd-card-num">¥{{ overview.withdrawable.toFixed(2) }}</text>
              <text class="wd-card-sub">冻结 ¥{{ overview.frozen.toFixed(2) }} · 待结算 ¥{{ overview.pending.toFixed(2) }}</text>
            </view>
            <view class="wd-card-icon"><AppIcon name="wallet" :size="24" color="#ffffff" /></view>
          </view>
          <view class="wd-card-btn" @tap="openForm">
            <AppIcon name="arrow-up-right" :size="16" color="#ffffff" />
            <text>申请提现</text>
          </view>
        </view>

        <!-- 数据概览 -->
        <view class="wd-overview">
          <view class="wd-ov-card">
            <text class="wd-ov-label">累计收益</text>
            <text class="wd-ov-num">¥{{ Math.round(overview.totalRevenue).toLocaleString('zh-CN') }}</text>
          </view>
          <view class="wd-ov-card">
            <text class="wd-ov-label">本月收益</text>
            <text class="wd-ov-num">¥{{ overview.monthRevenue.toFixed(2) }}</text>
          </view>
        </view>

        <!-- 提现记录 -->
        <view class="wd-section">
          <text class="wd-sec-title">提现记录</text>
          <view v-if="history.length === 0" class="wd-empty">
            <text class="wd-empty-txt">暂无提现记录</text>
          </view>
          <view v-else class="wd-records">
            <view v-for="record in history" :key="record.id" class="wd-record">
              <AppIcon :name="statusInfo(record.status).icon" :size="16" :color="statusInfo(record.status).color" />
              <view class="wd-record-body">
                <view class="wd-record-top">
                  <text class="wd-record-method">{{ record.method }}<text v-if="record.account"> · {{ record.account }}</text></text>
                  <text class="wd-record-amount">¥{{ record.actualAmount.toFixed(2) }}</text>
                </view>
                <view class="wd-record-mid">
                  <text class="wd-record-badge" :class="'wd-badge-' + record.status">{{ statusInfo(record.status).label }}</text>
                  <text class="wd-record-time">{{ record.createdAt }}</text>
                </view>
                <text class="wd-record-detail">申请 ¥{{ record.amount.toFixed(2) }} · 手续费 ¥{{ record.fee.toFixed(2) }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 提现说明 -->
        <view class="wd-tips">
          <text class="wd-tips-title">提现说明</text>
          <text class="wd-tip">• 手续费为提现金额的 0.6%，最低 1 元</text>
          <text class="wd-tip">• 支付宝通常 2 小时内到账</text>
          <text class="wd-tip">• 银行卡通常 1-3 个工作日到账</text>
          <text class="wd-tip">• 最低提现金额为 {{ minWithdraw }} 元</text>
        </view>
      </template>
      <view class="wd-pad" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { creatorApi, type CreatorRevenue, type CreatorWithdrawRecord } from '@/lib/creator-data'

const statusBarHeight = ref(0)
const showForm = ref(false)
const withdrawAmount = ref('')
const account = ref('')
const method = ref<'alipay' | 'bank'>('alipay')
const submitting = ref(false)

const loading = ref(true)
const errMsg = ref('')
const overview = ref<CreatorRevenue | null>(null)
const history = ref<CreatorWithdrawRecord[]>([])

function statusInfo(status: string) {
  const map: Record<string, { label: string; color: string; icon: string }> = {
    success: { label: '已到账', color: '#16a34a', icon: 'check-circle' },
    processing: { label: '处理中', color: '#2563eb', icon: 'clock' },
    failed: { label: '提现失败', color: '#dc2626', icon: 'alert-circle' },
  }
  return map[status] ?? map.processing
}

const feeRate = 0.006
const minFee = 1
const minWithdraw = 10
const withdrawable = computed(() => overview.value?.withdrawable ?? 0)
const amount = computed(() => parseFloat(withdrawAmount.value) || 0)
const fee = computed(() => (amount.value > 0 ? Math.max(amount.value * feeRate, minFee) : 0))
const actualAmount = computed(() => (amount.value > 0 ? amount.value - fee.value : 0))
const submitDisabled = computed(
  () => submitting.value || amount.value < minWithdraw || amount.value > withdrawable.value,
)

function withdrawAll() {
  withdrawAmount.value = withdrawable.value.toFixed(2)
}
function openForm() {
  withdrawAmount.value = ''
  account.value = ''
  showForm.value = true
}

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const [ov, his] = await Promise.all([creatorApi.getRevenueOverview(), creatorApi.getWithdrawHistory()])
    overview.value = ov
    history.value = his
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (submitDisabled.value) return
  if (!account.value.trim()) {
    uni.showToast({ title: '请输入收款账号', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const methodLabel = method.value === 'alipay' ? '支付宝' : '银行卡'
    const res = await creatorApi.submitWithdraw({ amount: amount.value, method: methodLabel, account: account.value.trim() })
    if (res.success) {
      uni.showToast({ title: res.message || '提现申请已提交', icon: 'success' })
      showForm.value = false
      withdrawAmount.value = ''
      account.value = ''
      await load()
    } else {
      uni.showToast({ title: res.message || '提现失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '提现失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  uni.getSystemInfo({ success: (res) => { statusBarHeight.value = res.statusBarHeight || 0 } })
  load()
})
</script>

<style scoped>
.wd-page { min-height: 100vh; background: #f5f5f5; }
.wd-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 10; background: #ffffff; border-bottom: 1px solid #eee; }
.wd-nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; height: 44px; }
.wd-icon-btn { padding: 4px; }
.wd-w8 { width: 32px; }
.wd-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.wd-scroll { height: 100vh; box-sizing: border-box; }
.wd-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 80px 32px; }
.wd-state-txt { font-size: 14px; color: #999; }
.wd-state-btn { margin-top: 4px; padding: 8px 24px; background: var(--brand); color: #ffffff; border-radius: 999px; font-size: 14px; }
.wd-empty { padding: 24px; text-align: center; }
.wd-empty-txt { font-size: 13px; color: #999; }
/* 余额卡片 */
.wd-card-balance { margin: 16px; padding: 24px; border-radius: 16px; background: linear-gradient(135deg, var(--brand), #b91c1c); color: #ffffff; }
.wd-card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
.wd-card-label { font-size: 14px; opacity: 0.8; }
.wd-card-num { display: block; font-size: 36px; font-weight: 700; margin-top: 4px; }
.wd-card-sub { display: block; font-size: 14px; opacity: 0.7; margin-top: 4px; }
.wd-card-icon { width: 48px; height: 48px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.wd-card-btn { display: flex; align-items: center; justify-content: center; gap: 4px; height: 40px; background: rgba(255, 255, 255, 0.2); border-radius: 8px; font-size: 14px; font-weight: 500; }
/* 数据概览 */
.wd-overview { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0 16px; }
.wd-ov-card { background: #ffffff; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #f0f0f0; }
.wd-ov-label { font-size: 12px; color: #999; }
.wd-ov-num { display: block; font-size: 20px; font-weight: 700; color: #1a1a1a; margin-top: 4px; }
/* 提现记录 */
.wd-section { margin: 24px 16px 0; }
.wd-sec-title { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.wd-records { display: flex; flex-direction: column; gap: 8px; }
.wd-record { display: flex; gap: 12px; background: #ffffff; border-radius: 12px; padding: 16px; border: 1px solid #f0f0f0; }
.wd-record-body { flex: 1; min-width: 0; }
.wd-record-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.wd-record-method { font-size: 14px; font-weight: 600; color: #1a1a1a; }
.wd-record-amount { font-size: 14px; font-weight: 700; color: #1a1a1a; }
.wd-record-mid { display: flex; align-items: center; gap: 8px; }
.wd-record-badge { font-size: 10px; padding: 1px 6px; border-radius: 4px; }
.wd-badge-success { background: #dcfce7; color: #166534; }
.wd-badge-processing { background: #dbeafe; color: #1e40af; }
.wd-badge-failed { background: #fee2e2; color: #991b1b; }
.wd-record-time { font-size: 12px; color: #999; }
.wd-record-detail { display: block; font-size: 12px; color: #999; margin-top: 4px; }
/* 提示 */
.wd-tips { margin: 24px 16px 0; padding: 16px; background: rgba(0, 0, 0, 0.02); border-radius: 12px; display: flex; flex-direction: column; gap: 4px; }
.wd-tips-title { font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
.wd-tip { font-size: 12px; color: #999; line-height: 1.5; }
/* 表单 */
.wd-balance-box { margin: 16px; padding: 16px; background: rgba(0, 0, 0, 0.03); border-radius: 12px; }
.wd-balance-label { font-size: 14px; color: #999; }
.wd-balance-num { display: block; font-size: 24px; font-weight: 700; color: #1a1a1a; margin-top: 4px; }
.wd-amount-sec { margin: 16px; }
.wd-amount-input-wrap { position: relative; display: flex; align-items: center; }
.wd-amount-prefix { position: absolute; left: 12px; font-size: 18px; font-weight: 600; color: #1a1a1a; }
.wd-amount-input {
  width: 100%; height: 52px; padding: 0 64px 0 32px; box-sizing: border-box;
  font-size: 20px; font-weight: 700; color: #1a1a1a;
  border: 1px solid #e5e5e5; border-radius: 12px; background: #ffffff;
}
.wd-all-btn { position: absolute; right: 12px; font-size: 12px; color: var(--brand); font-weight: 500; }
.wd-fee { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.wd-fee-row { display: flex; justify-content: space-between; font-size: 12px; color: #999; }
.wd-fee-actual { font-weight: 500; color: #1a1a1a; }
.wd-warn { display: block; margin-top: 8px; font-size: 12px; color: #dc2626; }
.wd-method-sec { margin: 20px 16px 0; }
.wd-method { display: flex; align-items: center; gap: 12px; padding: 16px; border: 1px solid #e5e5e5; border-radius: 12px; margin-bottom: 8px; }
.wd-method-active { border-color: var(--brand); background: rgba(196, 30, 58, 0.05); }
.wd-method-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.wd-method-info { flex: 1; }
.wd-method-name { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.wd-method-desc { display: block; font-size: 12px; color: #999; }
.wd-account-sec { margin: 20px 16px 0; }
.wd-account-input {
  width: 100%; height: 48px; padding: 0 16px; box-sizing: border-box; margin-top: 4px;
  font-size: 14px; color: #1a1a1a; border: 1px solid #e5e5e5; border-radius: 12px; background: #ffffff;
}
.wd-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #ffffff; border-top: 1px solid #eee; padding: 16px; }
.wd-submit { height: 44px; line-height: 44px; text-align: center; background: var(--brand); color: #ffffff; border-radius: 8px; font-size: 14px; font-weight: 500; }
.wd-submit-disabled { opacity: 0.5; }
.wd-pad { height: 80px; }
</style>
