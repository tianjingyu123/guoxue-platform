<script setup lang="ts">
/**
 * 提现记录 —— 兼「确认收款」入口。
 *
 * 🔴 这页不是可有可无的流水页：新版微信商家转账发起后，钱并没到用户手上，
 *    要他在微信里点「确认收款」，超时不点会自动退回平台。
 *    没有这个入口 = 用户拿不到 packageInfo = 钱永远到不了账。
 */
import { ref, onMounted } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { mineApi, type WithdrawRecord } from '@/lib/mine-data'

const loading = ref(false)
const error = ref('')
const list = ref<WithdrawRecord[]>([])
const confirming = ref('')

/** 小程序内才能调 wx.requestMerchantTransfer；其他端只能引导用户去小程序 */
const canConfirmInApp = ref(false)
// #ifdef MP-WEIXIN
canConfirmInApp.value = true
// #endif

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await mineApi.getMyWithdrawals(1, 50)
    list.value = res.list || []
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(loadData)

const STATUS_LABEL: Record<string, string> = {
  PENDING: '审核中',
  APPROVED: '待打款',
  TRANSFERRING: '待你确认收款',
  PAID: '已到账',
  REJECTED: '已驳回',
  CONVERTED: '已转国学币',
}
function statusLabel(r: WithdrawRecord) {
  return STATUS_LABEL[r.status] || r.status
}
function statusClass(r: WithdrawRecord) {
  if (r.status === 'PAID') return 'st-ok'
  if (r.status === 'REJECTED') return 'st-bad'
  if (r.status === 'TRANSFERRING') return 'st-warn'
  return 'st-normal'
}
function methodLabel(m: string) {
  const map: Record<string, string> = { WECHAT: '微信零钱', ALIPAY: '支付宝', BANK: '银行卡' }
  return map[String(m || '').toUpperCase()] || m
}
function fmtTime(t: string) {
  return String(t || '').replace('T', ' ').slice(0, 16)
}

/** 确认收款：拿 packageInfo → 调起微信确认页 → 成功后刷新（真正标 PAID 由渠道回调落地） */
async function confirmReceive(r: WithdrawRecord) {
  if (confirming.value) return
  if (!canConfirmInApp.value) {
    uni.showModal({
      title: '请在微信小程序内确认',
      content: '微信「确认收款」只能在小程序里完成。请打开本平台的微信小程序，进入「提现记录」点击确认收款。',
      showCancel: false,
    })
    return
  }
  confirming.value = r.id
  try {
    const info = await mineApi.getTransferConfirm(r.id)
    if (!info.needConfirm || !info.packageInfo) {
      uni.showToast({ title: '该笔无需确认或已处理', icon: 'none' })
      await loadData()
      return
    }
    const res = await mineApi.confirmWechatTransfer(info.packageInfo)
    uni.showToast({ title: res.message, icon: 'none' })
    // 确认成功后微信异步回调我们，状态未必立刻变 PAID —— 刷一次，剩下的交给回调
    await loadData()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '确认失败', icon: 'none' })
  } finally {
    confirming.value = ''
  }
}
</script>

<template>
  <view class="page">
    <app-nav-bar title="提现记录" back-icon="arrow-left" @back="goBack" />

    <view v-if="loading" class="state"><text>加载中...</text></view>
    <view v-else-if="error" class="state">
      <text>{{ error }}</text>
      <view class="retry-btn" @tap="loadData">重试</view>
    </view>
    <view v-else-if="!list.length" class="state">
      <AppIcon name="wallet" :size="56" color="#d1c9bf" />
      <text>暂无提现记录</text>
      <text class="state-hint">你发起的提现申请将在这里查看进度</text>
    </view>

    <view v-else class="body">
      <view v-for="r in list" :key="r.id" class="rec-card">
        <view class="rec-head">
          <text class="rec-amount">¥{{ r.amount.toFixed(2) }}</text>
          <text class="rec-status" :class="statusClass(r)">{{ statusLabel(r) }}</text>
        </view>
        <view class="rec-row">
          <text class="rec-k">实际到账</text>
          <text class="rec-v">¥{{ r.actualAmount.toFixed(2) }}（手续费 ¥{{ r.fee.toFixed(2) }}）</text>
        </view>
        <view class="rec-row">
          <text class="rec-k">收款方式</text>
          <text class="rec-v">{{ methodLabel(r.payMethod) }}</text>
        </view>
        <view class="rec-row">
          <text class="rec-k">申请时间</text>
          <text class="rec-v">{{ fmtTime(r.createdAt) }}</text>
        </view>
        <view v-if="r.status === 'REJECTED' && r.reviewNote" class="rec-row">
          <text class="rec-k">驳回原因</text>
          <text class="rec-v">{{ r.reviewNote }}</text>
        </view>
        <view v-if="r.transferFailReason" class="rec-row">
          <text class="rec-k">转账失败</text>
          <text class="rec-v">{{ r.transferFailReason }}</text>
        </view>

        <!-- 待确认收款：钱已从平台发出，用户不点这里就永远拿不到 -->
        <view v-if="r.needConfirm" class="confirm-box">
          <view class="confirm-tip">
            <app-icon name="alert-circle" :size="26" color="#b45309" />
            <text class="confirm-tip-t">
              转账已发起，需你在微信中确认收款，钱才会到账；长时间未确认将自动退回。
            </text>
          </view>
          <view
            class="confirm-btn"
            :class="{ disabled: confirming === r.id }"
            @tap="confirmReceive(r)"
          >
            {{ confirming === r.id ? '处理中...' : '确认收款' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}
.body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.state {
  padding: 160rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  font-size: 28rpx;
  color: rgba(92, 64, 51, 0.6);
}
.state-hint {
  font-size: 24rpx;
  color: rgba(92, 64, 51, 0.45);
  margin-top: -8rpx;
}
.retry-btn {
  padding: 16rpx 48rpx;
  background: var(--brand);
  color: #fff;
  border-radius: 12rpx;
  font-size: 26rpx;
}

.rec-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.rec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.rec-amount {
  font-size: 40rpx;
  font-weight: 600;
  color: #2f1810;
}
.rec-status {
  font-size: 26rpx;
}
.st-ok {
  color: #16a34a;
}
.st-bad {
  color: #dc2626;
}
.st-warn {
  color: #b45309;
}
.st-normal {
  color: rgba(92, 64, 51, 0.7);
}
.rec-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
}
.rec-k {
  font-size: 26rpx;
  color: rgba(92, 64, 51, 0.6);
  flex-shrink: 0;
}
.rec-v {
  font-size: 26rpx;
  color: #2f1810;
  text-align: right;
}

.confirm-box {
  margin-top: 8rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid rgba(201, 169, 110, 0.2);
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.confirm-tip {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 20rpx;
  border-radius: 12rpx;
  background: rgba(180, 83, 9, 0.08);
}
.confirm-tip-t {
  flex: 1;
  font-size: 24rpx;
  line-height: 1.5;
  color: #b45309;
}
.confirm-btn {
  height: 88rpx;
  border-radius: 16rpx;
  background: var(--brand);
  color: #fff;
  font-size: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-btn.disabled {
  opacity: 0.6;
}
</style>
