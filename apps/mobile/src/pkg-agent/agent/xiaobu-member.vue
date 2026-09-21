<script setup lang="ts">
/**
 * 小卜AI会员（决策人 2026-09-21：独立于书院会员）
 *
 * 会员免费不限次生成排盘报告，会员期内每月赠送 AI 语音对话时长。
 * 档位与价格以服务端为准（前端只展示）；下单走平台订单 type=XIAOBU_MEMBER，支付进平台收银页，
 * 会员期与当月赠送由支付回调在同一事务里登记。会员期内续买从到期日往后顺延。
 */
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { shopApi } from '@/lib/shop-data'
import { xiaobuVoiceApi, type XiaobuMemberOverview } from '@/lib/xiaobu-voice-data'

const info = ref<XiaobuMemberOverview | null>(null)
const loading = ref(true)
const error = ref('')
const picked = ref('')
const buying = ref(false)

const pickedPlan = computed(() => info.value?.plans.find((p) => p.key === picked.value) || null)

function perMonth(p: { months: number; priceYuan: number }) {
  return Math.round(p.priceYuan / p.months)
}

function fmtDate(d: string | null) {
  if (!d) return ''
  const t = new Date(d)
  return `${t.getFullYear()}年${t.getMonth() + 1}月${t.getDate()}日`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    info.value = await xiaobuVoiceApi.xiaobuMember()
    const plans = info.value.plans
    if (plans.length && !plans.some((p) => p.key === picked.value)) {
      // 默认选年会员（第二档），没有则第一档
      picked.value = plans[Math.min(1, plans.length - 1)].key
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function buy() {
  if (buying.value || !pickedPlan.value) return
  buying.value = true
  try {
    // 金额由服务端按档位计算，这里的数量固定 1
    const order = await shopApi.createOrder({ type: 'XIAOBU_MEMBER', targetId: pickedPlan.value.key, quantity: 1 })
    if (!order.id) throw new Error('订单创建失败')
    navigateTo(`/shop/paying?orderId=${order.id}&method=wechat&amount=${Number(order.amount) || pickedPlan.value.priceYuan}`)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '下单失败，请重试', icon: 'none' })
  } finally {
    buying.value = false
  }
}

onShow(load)
</script>

<template>
  <view class="page">
    <view class="hdr">
      <view class="hdr-bar">
        <view class="hdr-back" @tap="goBack()"><app-icon name="chevron-left" :size="40" color="#666666" /></view>
        <text class="hdr-title">小卜AI会员</text>
        <view class="hdr-side" />
      </view>
    </view>

    <view v-if="loading" class="state"><text class="hint">加载中…</text></view>
    <view v-else-if="error" class="state">
      <text class="state-text">{{ error }}</text>
      <view class="btn" @tap="load"><text class="btn-text">重试</text></view>
    </view>
    <template v-else-if="info">
      <view class="card" data-testid="member-status">
        <template v-if="info.active">
          <text class="label">会员有效期至</text>
          <text class="big">{{ fmtDate(info.expireAt) }}</text>
          <text class="hint">续费从到期日往后顺延，不会浪费剩余天数。</text>
        </template>
        <template v-else>
          <text class="label">尚未开通</text>
          <text class="card-text">开通后排盘报告免费、不限次数生成。</text>
        </template>
      </view>

      <view class="card">
        <text class="label">会员权益</text>
        <view class="perk"><text class="perk-dot">·</text><text class="card-text">排盘报告免费生成，不限次数（非会员 29 元一份）</text></view>
        <view class="perk"><text class="perk-dot">·</text><text class="card-text">每月赠送 {{ info.monthlyVoiceMinutes }} 分钟 AI 语音对话</text></view>
        <view class="perk"><text class="perk-dot">·</text><text class="card-text">与书院会员相互独立，互不影响</text></view>
      </view>

      <view class="plans">
        <view
          v-for="p in info.plans"
          :key="p.key"
          class="plan"
          :class="{ on: picked === p.key }"
          :data-testid="`member-plan-${p.key}`"
          @tap="picked = p.key"
        >
          <text class="plan-name">{{ p.label }}</text>
          <text class="plan-price">¥{{ p.priceYuan }}</text>
          <text class="plan-sub">{{ p.months > 1 ? `约 ¥${perMonth(p)}/月` : '按月' }}</text>
        </view>
      </view>
      <text class="note">到账以支付成功为准；赠送的语音时长按自然月发放。</text>
      <view class="btn btn-primary" :class="{ disabled: buying || !pickedPlan }" data-testid="member-buy" @tap="buy">
        <text class="btn-text-primary">{{ buying ? '正在下单…' : (info.active ? '续费' : '开通') + (pickedPlan ? ` ¥${pickedPlan.priceYuan}` : '') }}</text>
      </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.page { min-height: 100vh; background: var(--bg-paper); padding-bottom: calc(40rpx + env(safe-area-inset-bottom)); }
.hdr { position: sticky; top: 0; z-index: 20; background: var(--card); border-bottom: 2rpx solid var(--border, rgba(0,0,0,0.08)); padding-top: var(--status-bar-height, 0); }
.hdr-bar { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; }
.hdr-back { width: 88rpx; height: 88rpx; margin: -20rpx; display: flex; align-items: center; justify-content: center; }
.hdr-title { font-size: 32rpx; font-weight: 700; color: var(--text-ink); }
.hdr-side { width: 48rpx; }
.state { padding: 100rpx 48rpx; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.state-text { font-size: 28rpx; color: var(--text-ink); }
.card { margin: 20rpx 24rpx 0; padding: 28rpx; background: var(--card); border-radius: 24rpx; display: flex; flex-direction: column; gap: 12rpx; }
.card-text { font-size: 27rpx; line-height: 1.7; color: var(--text-ink); }
.label { font-size: 26rpx; color: var(--text-soft); }
.big { font-size: 44rpx; font-weight: 700; color: var(--text-ink); font-variant-numeric: tabular-nums; }
.hint { font-size: 23rpx; line-height: 1.6; color: var(--text-soft); }
.perk { display: flex; gap: 10rpx; }
.perk-dot { font-size: 27rpx; line-height: 1.7; color: #C41E3A; }
.plans { margin: 24rpx 24rpx 0; display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.plan { padding: 28rpx 0; border-radius: 20rpx; background: var(--card); border: 3rpx solid transparent; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.plan.on { border-color: #C41E3A; background: #fbf3ef; }
.plan-name { font-size: 27rpx; color: var(--text-ink); }
.plan-price { font-size: 40rpx; font-weight: 700; color: var(--text-ink); font-variant-numeric: tabular-nums; }
.plan-sub { font-size: 22rpx; color: var(--text-soft); }
.note { display: block; margin: 20rpx 32rpx 0; font-size: 22rpx; line-height: 1.6; color: var(--text-soft); }
.btn { margin: 32rpx 24rpx 0; height: 92rpx; border-radius: 46rpx; background: var(--card); display: flex; align-items: center; justify-content: center; }
.btn-primary { background: #C41E3A; }
.btn.disabled { opacity: 0.55; }
.btn-text { font-size: 28rpx; color: var(--text-ink); }
.btn-text-primary { font-size: 30rpx; font-weight: 600; color: #fff; }
</style>
