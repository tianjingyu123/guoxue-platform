<script setup lang="ts">
/**
 * 小卜语音时长充值（决策人 2026-09-21：报告赠送的 30 分钟用完后，支持充值继续使用）
 *
 * 价格与档位以服务端为准（前端只展示）；下单走平台订单 type=VOICE_MINUTES，支付进平台收银页，
 * 到账由支付回调在同一事务里加时长。语音尚未开始计费时不给充值入口，避免服务没开放就先收钱。
 */
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { queryString } from '@/utils/query-string'
import { shopApi } from '@/lib/shop-data'
import { xiaobuVoiceApi, type VoiceTopupPacks } from '@/lib/xiaobu-voice-data'

const info = ref<VoiceTopupPacks | null>(null)
const loading = ref(true)
const error = ref('')
const unavailable = ref(false)
const picked = ref(0)
const buying = ref(false)
/** 从圈子语音页进入时带的圈子编号：服务端校验后记圈主分成，无效则按普通充值处理 */
const circleId = ref('')
const returnVoiceScene = ref('')
const returnVoiceContextId = ref('')
const returnVoiceSectionId = ref('')
onLoad((q) => {
  circleId.value = String(q?.circleId || '')
  const scene = String(q?.returnVoiceScene || '')
  const contextId = String(q?.returnVoiceContextId || '')
  if (['report_dialogue', 'circle_assistant'].includes(scene) && contextId) {
    returnVoiceScene.value = scene
    returnVoiceContextId.value = contextId
    returnVoiceSectionId.value = scene === 'report_dialogue' ? String(q?.returnVoiceSectionId || '') : ''
  }
})

async function load() {
  loading.value = true
  error.value = ''
  unavailable.value = false
  try {
    info.value = await xiaobuVoiceApi.topupPacks()
    if (info.value.packs.length && !info.value.packs.some((p) => p.minutes === picked.value)) {
      picked.value = info.value.packs[Math.min(1, info.value.packs.length - 1)].minutes
    }
  } catch (e) {
    const message = (e as Error)?.message || '加载失败'
    unavailable.value = /接口不存在|请求失败\(404\)|\/voice\/topup\/packs/.test(message)
    error.value = unavailable.value ? '语音时长充值暂未开放，请稍后再来' : message
  } finally {
    loading.value = false
  }
}

async function buy() {
  if (buying.value || !picked.value) return
  buying.value = true
  try {
    // 金额由服务端按分钟档位计算，这里的数量固定 1
    const order = await shopApi.createOrder({
      type: 'VOICE_MINUTES',
      targetId: String(picked.value),
      quantity: 1,
      ...(circleId.value ? { sourceContentType: 'CIRCLE_VOICE', sourceContentId: circleId.value } : {}),
    })
    if (!order.id) throw new Error('订单创建失败')
    const pack = info.value?.packs.find((p) => p.minutes === picked.value)
    const voiceReturn = Boolean(returnVoiceScene.value && returnVoiceContextId.value)
    const payQuery = queryString([
      ['orderId', order.id],
      ['method', 'wechat'],
      ['amount', String(Number(order.amount) || pack?.amountYuan || 0)],
      ['returnVoiceScene', voiceReturn ? returnVoiceScene.value : undefined],
      ['returnVoiceContextId', voiceReturn ? returnVoiceContextId.value : undefined],
      ['returnVoiceSectionId', voiceReturn ? returnVoiceSectionId.value || undefined : undefined],
    ])
    navigateTo(`/shop/paying?${payQuery}`)
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
        <text class="hdr-title">语音时长充值</text>
        <view class="hdr-side" />
      </view>
    </view>

    <view v-if="loading" class="state"><text class="hint">加载中…</text></view>
    <view v-else-if="error" class="state">
      <text class="state-text">{{ error }}</text>
      <view class="btn" @tap="unavailable ? goBack() : load()"><text class="btn-text">{{ unavailable ? '返回' : '重试' }}</text></view>
    </view>
    <template v-else-if="info">
      <view class="card">
        <text class="label">当前可用</text>
        <text class="big" data-testid="topup-available">{{ info.availableMinutes }} 分钟</text>
        <text class="hint">购买一份报告附赠 30 分钟，小卜AI会员每月赠送 300 分钟；用完后可在这里充值继续和小卜语音交流。</text>
        <text class="link" data-testid="topup-member" @tap="navigateTo('/pkg-agent/agent/xiaobu-member')">了解小卜AI会员 ›</text>
      </view>

      <view v-if="!info.canTopUp" class="card muted" data-testid="topup-closed">
        <text class="card-text">{{ info.reason || '暂不需要充值' }}</text>
      </view>

      <template v-else>
        <view class="packs">
          <view
            v-for="p in info.packs"
            :key="p.minutes"
            class="pack"
            :class="{ on: picked === p.minutes }"
            :data-testid="`topup-pack-${p.minutes}`"
            @tap="picked = p.minutes"
          >
            <text class="pack-min">{{ p.minutes }} 分钟</text>
            <text class="pack-price">¥{{ p.amountYuan.toFixed(2) }}</text>
          </view>
        </view>
        <text class="note">{{ (info.pricePerMinuteCents / 100).toFixed(0) }} 元/分钟，按实际通话时长扣减；到账以支付成功为准。</text>
        <view class="btn btn-primary" :class="{ disabled: buying }" data-testid="topup-buy" @tap="buy">
          <text class="btn-text-primary">{{ buying ? '正在下单…' : '去支付' }}</text>
        </view>
      </template>
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
.card.muted { background: #f3efe8; }
.card-text { font-size: 27rpx; line-height: 1.7; color: var(--text-ink); }
.label { font-size: 26rpx; color: var(--text-soft); }
.big { font-size: 48rpx; font-weight: 700; color: var(--text-ink); font-variant-numeric: tabular-nums; }
.hint { font-size: 23rpx; line-height: 1.6; color: var(--text-soft); }
.link { font-size: 24rpx; color: #C41E3A; }
.packs { margin: 24rpx 24rpx 0; display: flex; gap: 16rpx; }
.pack { flex: 1; padding: 28rpx 0; border-radius: 20rpx; background: var(--card); border: 3rpx solid transparent; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.pack.on { border-color: #C41E3A; background: rgba(196,30,58,0.06); }
.pack-min { font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.pack-price { font-size: 26rpx; color: #C41E3A; }
.note { display: block; margin: 20rpx 32rpx 0; font-size: 23rpx; color: var(--text-soft); }
.btn { min-height: 88rpx; border-radius: 999rpx; border: 2rpx solid var(--border, rgba(0,0,0,0.12)); display: flex; align-items: center; justify-content: center; padding: 0 40rpx; }
.btn-primary { margin: 32rpx 24rpx 0; background: #C41E3A; border-color: #C41E3A; }
.btn.disabled { opacity: 0.5; }
.btn-text { font-size: 28rpx; color: var(--text-ink); }
.btn-text-primary { font-size: 28rpx; color: #ffffff; }
</style>
