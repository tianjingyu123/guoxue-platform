<template>
  <view class="pd-page">
    <!-- 顶部导航 -->
    <view class="pd-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="pd-header-inner">
        <view class="pd-back" @tap="go('/merchant/application-status')">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="pd-title">缴纳保证金</text>
      </view>
    </view>

    <!-- 成功态 -->
    <view v-if="isPaid" class="pd-content" :style="{ paddingTop: statusBarHeight + 44 + 16 + 'px' }">
      <view class="pd-success-card">
        <view class="pd-success-icon">
          <AppIcon name="check-circle-2" :size="48" color="#22c55e" />
        </view>
        <text class="pd-success-title">支付成功</text>
        <text class="pd-success-sub">保证金已缴纳，即将跳转...</text>
        <view class="pd-success-info">
          <view class="pd-info-row">
            <text class="pd-info-label">缴纳金额</text>
            <text class="pd-info-val pd-text-red">¥{{ totalDeposit }}.00</text>
          </view>
          <view class="pd-info-row">
            <text class="pd-info-label">缴纳时间</text>
            <text class="pd-info-val">{{ paidInfo.paidAt }}</text>
          </view>
          <view class="pd-info-row">
            <text class="pd-info-label">交易流水号</text>
            <text class="pd-info-mono">{{ paidInfo.transactionId }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 缴费态 -->
    <template v-else>
      <scroll-view scroll-y class="pd-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
        <view class="pd-body">
          <!-- 金额卡 -->
          <view class="pd-amount-card">
            <text class="pd-amount-label">应缴保证金</text>
            <view class="pd-amount-row">
              <text class="pd-amount-sym">¥</text>
              <text class="pd-amount-num">{{ totalDeposit }}</text>
              <text class="pd-amount-cents">.00</text>
            </view>
            <view class="pd-amount-detail">
              <view class="pd-detail-row">
                <text class="pd-detail-label">基础保证金</text>
                <text class="pd-detail-val">¥{{ baseDeposit }}.00</text>
              </view>
              <view class="pd-detail-row">
                <text class="pd-detail-label">类目保证金</text>
                <text class="pd-detail-val">¥{{ categoryDeposit }}.00</text>
              </view>
            </view>
          </view>

          <!-- 说明 -->
          <view class="pd-card pd-tip-card">
            <AppIcon name="shield" :size="20" color="#22c55e" />
            <view class="pd-tip-text">
              <text class="pd-tip-title">保证金说明</text>
              <text class="pd-tip-desc">保证金用于保障消费者权益和平台交易安全。在您退出经营且无违规记录的情况下，保证金将全额退还。</text>
            </view>
          </view>

          <!-- 支付方式 -->
          <view class="pd-card">
            <text class="pd-card-title">选择支付方式</text>
            <view class="pd-methods">
              <view
                v-for="method in paymentMethods"
                :key="method.id"
                class="pd-method"
                :class="{ 'pd-method-on': selectedMethod === method.id }"
                @tap="selectedMethod = method.id"
              >
                <view class="pd-method-left">
                  <AppIcon :name="method.icon" :size="24" :color="method.color" />
                  <text class="pd-method-name">{{ method.name }}</text>
                </view>
                <view class="pd-radio" :class="{ 'pd-radio-on': selectedMethod === method.id }">
                  <AppIcon v-if="selectedMethod === method.id" name="check" :size="12" color="#ffffff" />
                </view>
              </view>
            </view>
          </view>

        </view>
        <view class="pd-bottom-placeholder" />
      </scroll-view>

      <!-- 底部支付 -->
      <view class="pd-footer">
        <view class="pd-pay-btn" :class="{ 'pd-pay-btn-disabled': isPaying }" @tap="handlePay">
          <template v-if="isPaying">
            <view class="pd-spin"><AppIcon name="loader-2" :size="18" color="#ffffff" /></view>
            <text>支付中...</text>
          </template>
          <template v-else>
            <AppIcon name="credit-card" :size="18" color="#ffffff" />
            <text>确认支付 ¥{{ totalDeposit }}.00</text>
          </template>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { merchantApi } from '@/pkg-merchant/lib/merchant-data'

// 后端 PayDepositDto 仅支持微信/支付宝（银行转账无对应支付能力）
const paymentMethods = [
  { id: 'WECHAT' as const, name: '微信支付', icon: 'smartphone', color: '#22c55e' },
  { id: 'ALIPAY' as const, name: '支付宝', icon: 'smartphone', color: '#3b82f6' },
]

const baseDeposit = 1000 // 基础保证金（与后端 merchant_deposit_base 配置一致）

const loading = ref(true)
const totalDeposit = ref(0)
const selectedMethod = ref<'WECHAT' | 'ALIPAY'>('WECHAT')
const isPaying = ref(false)
const isPaid = ref(false)
const paidInfo = ref({ paidAt: '', transactionId: '' })
const statusBarHeight = ref(0)

// 类目保证金 = 总额 - 基础（拆分明细，总额来自后端真实计算）
const categoryDeposit = computed(() => Math.max(0, totalDeposit.value - baseDeposit))

function formatNow(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function load() {
  loading.value = true
  try {
    const info = await merchantApi.getDepositInfo()
    totalDeposit.value = Math.round(Number(info.depositAmount || 0))
    if (info.depositPaid || info.status !== 'DEPOSIT_PENDING') {
      uni.showToast({ title: '当前无需缴纳保证金', icon: 'none' })
      setTimeout(() => navigateTo('/merchant/application-status'), 800)
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function handlePay() {
  if (isPaying.value) return
  isPaying.value = true
  try {
    const res = await merchantApi.payDeposit(selectedMethod.value) as { depositRecordId?: string }
    paidInfo.value = { paidAt: formatNow(), transactionId: res?.depositRecordId || '' }
    isPaid.value = true
    setTimeout(() => navigateTo('/merchant/application-status'), 2000)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '支付失败', icon: 'none' })
  } finally {
    isPaying.value = false
  }
}

function go(url: string) {
  navigateTo(url)
}

onMounted(() => {
  uni.getSystemInfo({ success: (res) => { statusBarHeight.value = res.statusBarHeight || 0 } })
  load()
})
</script>

<style scoped>
.pd-page { min-height: 100vh; background: #f5f5f5; display: flex; flex-direction: column; }

.pd-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.06); }
.pd-header-inner { display: flex; align-items: center; height: 44px; padding: 0 16px; }
.pd-back { margin-right: 12px; }
.pd-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }

/* 成功态 */
.pd-content { padding: 16px; }
.pd-success-card { background: #f0fdf4; border-radius: 12px; padding: 32px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.pd-success-icon { width: 80px; height: 80px; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.pd-success-title { font-size: 20px; font-weight: 700; color: #16a34a; margin-bottom: 8px; }
.pd-success-sub { font-size: 14px; color: #999; margin-bottom: 16px; }
.pd-success-info { width: 100%; background: #fff; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.pd-info-row { display: flex; align-items: center; justify-content: space-between; }
.pd-info-label { font-size: 14px; color: #999; }
.pd-info-val { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.pd-info-mono { font-size: 12px; font-family: monospace; color: #1a1a1a; }
.pd-text-red { color: var(--brand); }

.pd-scroll { flex: 1; height: 100vh; box-sizing: border-box; }
.pd-body { padding: 16px; display: flex; flex-direction: column; gap: 16px; }

/* 金额卡 */
.pd-amount-card { background: linear-gradient(135deg, rgba(196,30,58,0.05), rgba(196,30,58,0.1)); border-radius: 12px; padding: 24px; }
.pd-amount-label { display: block; font-size: 14px; color: #999; text-align: center; margin-bottom: 8px; }
.pd-amount-row { display: flex; align-items: baseline; justify-content: center; }
.pd-amount-sym { font-size: 14px; color: var(--brand); }
.pd-amount-num { font-size: 36px; font-weight: 700; color: var(--brand); }
.pd-amount-cents { font-size: 14px; color: var(--brand); }
.pd-amount-detail { margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.08); display: flex; flex-direction: column; gap: 8px; }
.pd-detail-row { display: flex; align-items: center; justify-content: space-between; }
.pd-detail-label { font-size: 14px; color: #999; }
.pd-detail-val { font-size: 14px; color: #444; }

/* Card */
.pd-card { background: #fff; border-radius: 12px; padding: 16px; }
.pd-card-title { display: block; font-size: 15px; font-weight: 500; color: #1a1a1a; margin-bottom: 16px; }
.pd-tip-card { display: flex; align-items: flex-start; gap: 12px; }
.pd-tip-text { flex: 1; }
.pd-tip-title { display: block; font-size: 15px; font-weight: 500; color: #1a1a1a; margin-bottom: 4px; }
.pd-tip-desc { font-size: 14px; color: #999; line-height: 1.5; }

/* 支付方式 */
.pd-methods { display: flex; flex-direction: column; gap: 12px; }
.pd-method { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-radius: 12px; border: 2px solid #eee; }
.pd-method-on { border-color: var(--brand); background: rgba(196,30,58,0.05); }
.pd-method-left { display: flex; align-items: center; gap: 12px; }
.pd-method-name { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.pd-radio { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #999; display: flex; align-items: center; justify-content: center; }
.pd-radio-on { background: var(--brand); border-color: var(--brand); }

/* 银行 */
.pd-bank { display: flex; flex-direction: column; gap: 16px; }
.pd-bank-item { flex: 1; }
.pd-bank-label { display: block; font-size: 12px; color: #999; margin-bottom: 4px; }
.pd-bank-val { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.pd-bank-mono { font-size: 14px; font-weight: 500; font-family: monospace; color: #1a1a1a; }
.pd-bank-row { display: flex; align-items: center; justify-content: space-between; }
.pd-copy-btn { width: 36px; height: 36px; border: 1px solid #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.pd-bank-remark { padding: 12px; background: #fffbeb; border-radius: 8px; }
.pd-remark-txt { font-size: 14px; color: #d97706; }

.pd-bottom-placeholder { height: 96px; }

/* Footer */
.pd-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 16px 16px calc(16px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid rgba(0,0,0,0.06); }
.pd-pay-btn { height: 48px; background: var(--brand); border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.pd-pay-btn text { font-size: 16px; font-weight: 500; color: #fff; }
.pd-pay-btn-disabled { opacity: 0.5; }
.pd-spin { display: inline-flex; animation: pd-spin 1s linear infinite; }
@keyframes pd-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
