<script setup lang="ts">
/**
 * 连麦咨询说明页 — 当前尚无预约时段或可用的实时通话界面。
 * 数据：consultApi.listExperts(circleId) 反查达人和当前单价；链接参数不作为报价依据。
 * 降级（后端为准·记台账）：
 *  - 后端无预约模型（ConsultCall.initiate 为即时通话·无时段/预约时长字段）→ V0「选择时段/预计时长/
 *    预扣金额=时长×单价」不做，费用区改为真实计费规则说明（预扣按后端 initiate 返回为准）。
 *  - App 端 TRTC 通话组件尚未集成（后端 initiate 已就绪但无通话界面）→ 不呈现发起按钮，
 *    防「扣金币无界面」资金事故；如实告知各端暂未开放。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo, redirectTo } from '@/utils/router'
import { consultApi, type ConsultExpert } from '@/lib/circle-consult-data'

const circleId = ref('')
const expertId = ref('')
const fallbackName = ref('')
const fallbackAvatar = ref('')

const loading = ref(true)
const error = ref('')
const expert = ref<ConsultExpert | null>(null)

const name = computed(() => expert.value?.name || fallbackName.value || '达人')
const avatar = computed(() => expert.value?.avatar || fallbackAvatar.value)
const price = computed(() => expert.value?.callPrice || 0)

async function load() {
  if (!circleId.value || !expertId.value) { error.value = '缺少达人参数，请从达人列表进入'; loading.value = false; return }
  loading.value = true
  error.value = ''
  try {
    const list = await consultApi.listExperts(circleId.value, { throwOnError: true })
    expert.value = list.find(e => e.id === expertId.value) || null
    if (!expert.value?.callPrice) error.value = '该达人暂未开通连麦咨询'
  } catch {
    error.value = '暂时无法核实连麦服务与价格，请重试'
  } finally {
    loading.value = false
  }
}

function goMyCalls() { navigateTo('/pkg-circle/circles/my-calls') }
function goExperts() {
  const pages = getCurrentPages()
  const previous = pages[pages.length - 2]?.route || ''
  if (previous.includes('pkg-circle/circles/consult-experts')) goBack()
  else redirectTo(`/pkg-circle/circles/consult-experts?circleId=${encodeURIComponent(circleId.value)}`)
}

onLoad((opt) => {
  circleId.value = (opt?.circleId || opt?.id || '') as string
  expertId.value = (opt?.expertId || '') as string
  fallbackName.value = decodeURIComponent((opt?.name || '') as string)
  fallbackAvatar.value = decodeURIComponent((opt?.avatar || '') as string)
  load()
})
</script>

<template>
  <view class="bk-page">
    <view class="bk-topbar">
      <view class="bk-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="bk-title">连麦咨询</text>
    </view>

    <!-- 三态 -->
    <view v-if="loading" class="bk-state"><view class="bk-skel" /></view>
    <view v-else-if="error" class="bk-state">
      <text class="bk-state-t">{{ error }}</text>
      <view class="bk-retry" @tap="load"><text class="bk-retry-t">重试</text></view>
    </view>

    <template v-else>
      <!-- 达人与单价 -->
      <view class="bk-card">
        <view class="bk-expert-row">
          <view class="bk-expert-avatar">
            <image v-if="avatar" lazy-load class="bk-expert-img" :src="avatar" mode="aspectFill" />
            <view v-else class="bk-expert-img bk-expert-ph"><app-icon name="user" :size="36" color="#C9A96E" /></view>
          </view>
          <view class="bk-expert-main">
            <text class="bk-expert-name">{{ name }} · 连麦咨询</text>
            <text class="bk-expert-price"><text class="bk-price-b">{{ price }}</text> 金币/分钟 · 按实际通话时长结算</text>
          </view>
        </view>

        <!-- 计费规则（后端真实规则：预扣→按实结算多退少不补→不足1分钟按1分钟→未接通全额退） -->
        <view class="bk-fee">
          <view class="bk-fee-row"><text class="bk-fee-l">计费单价</text><text class="bk-fee-v">{{ price }} 金币/分钟</text></view>
          <view class="bk-fee-row"><text class="bk-fee-l">计费方式</text><text class="bk-fee-v">发起时预扣 · 按实际时长结算</text></view>
          <text class="bk-fee-note">发起通话时预扣一定时长的金币额度，通话结束按实际时长结算：多扣部分自动退回，不足 1 分钟按 1 分钟计；未接通则预扣金币全额退还。</text>
        </view>

        <!-- #ifdef APP-PLUS -->
        <view class="bk-unavailable" role="status">实时语音／视频正在联调，暂时不能发起，也不会扣除金币。</view>
        <view class="bk-book-btn bk-book-btn--secondary" @tap="goExperts"><text class="bk-book-btn-t">返回达人列表</text></view>
        <!-- #endif -->
      </view>

      <!-- H5/小程序端：优雅降级，不做死按钮 -->
      <!-- #ifndef APP-PLUS -->
      <view class="bk-downgrade">
        <view class="bk-down-icon"><app-icon name="smartphone" :size="56" color="#6E6E73" /></view>
        <text class="bk-down-title">连麦服务准备中</text>
        <text class="bk-down-desc">实时语音／视频尚在联调，目前各端均不能发起。已有通话记录仍可查看。</text>
        <view class="bk-down-btn" @tap="goMyCalls"><text class="bk-down-btn-t">查看我的通话记录</text></view>
        <text class="bk-down-alt" @tap="goExperts">先看看达人的图文咨询</text>
      </view>
      <!-- #endif -->
    </template>
  </view>
</template>

<style scoped lang="scss">
.bk-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 80rpx; }

.bk-topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.bk-back { display: flex; padding: 8rpx; margin-left: -8rpx; }
.bk-title { flex: 1; font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }

.bk-state { padding: 120rpx 32rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.bk-state-t { font-size: 26rpx; color: var(--text-tertiary, #999); }
.bk-retry { padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.bk-retry-t { font-size: 26rpx; color: #fff; }
.bk-skel { width: 100%; height: 360rpx; border-radius: 36rpx; background: #ede7dd; }

/* 预约卡 */
.bk-card {
  margin: 24rpx 32rpx 0; padding: 32rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.bk-expert-row { display: flex; align-items: center; gap: 24rpx; }
.bk-expert-avatar { width: 88rpx; height: 88rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; box-shadow: 0 0 0 3rpx var(--gold, #c9a96e); }
.bk-expert-img { width: 88rpx; height: 88rpx; border-radius: 999rpx; }
.bk-expert-ph { background: var(--bg-warm, #f8f4ec); display: flex; align-items: center; justify-content: center; }
.bk-expert-main { flex: 1; min-width: 0; }
.bk-expert-name { display: block; font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.bk-expert-price { display: block; font-size: 24rpx; color: var(--text-tertiary, #999); margin-top: 4rpx; }
.bk-price-b { color: var(--gold, #c9a96e); font-weight: 700; font-size: 28rpx; }

/* 计费规则 */
.bk-fee { margin-top: 32rpx; padding: 26rpx 28rpx; background: var(--bg-warm, #f8f4ec); border-radius: 28rpx; }
.bk-fee-row { display: flex; justify-content: space-between; font-size: 24rpx; color: var(--text-secondary, #6e6e73); }
.bk-fee-row + .bk-fee-row { margin-top: 14rpx; }
.bk-fee-v { font-weight: 600; color: var(--text-primary, #2c2c2c); }
.bk-fee-note { display: block; font-size: 20rpx; color: var(--text-tertiary, #999); line-height: 1.7; margin-top: 18rpx; }

.bk-book-btn {
  height: 92rpx; margin-top: 28rpx; border-radius: 46rpx;
  background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.bk-book-btn:active { opacity: 0.88; }
.bk-book-btn-t { font-size: 30rpx; font-weight: 600; letter-spacing: 2rpx; color: #fff; }
.bk-book-btn--secondary { background: var(--bg-warm, #f8f4ec); }
.bk-book-btn--secondary .bk-book-btn-t { color: var(--text-primary, #2c2c2c); }
.bk-unavailable {
  margin-top: 28rpx;
  font-size: 24rpx;
  color: var(--text-secondary, #6e6e73);
  line-height: 1.6;
}

/* H5 降级引导卡 */
.bk-downgrade {
  margin: 24rpx 32rpx 0; padding: 64rpx 48rpx; text-align: center;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.bk-down-icon {
  width: 128rpx; height: 128rpx; margin: 0 auto 32rpx; border-radius: 999rpx;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.bk-down-title { display: block; font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.bk-down-desc { display: block; font-size: 26rpx; color: var(--text-secondary, #6e6e73); line-height: 1.8; margin-top: 16rpx; }
.bk-down-btn {
  margin: 36rpx auto 0; padding: 0 64rpx; height: 88rpx; border-radius: 44rpx;
  background: var(--brand, #c41e3a);
  display: inline-flex; align-items: center; justify-content: center;
}
.bk-down-btn:active { opacity: 0.88; }
.bk-down-btn-t { font-size: 28rpx; font-weight: 600; color: #fff; }
.bk-down-alt { display: block; margin-top: 28rpx; font-size: 24rpx; color: var(--text-tertiary, #999); text-decoration: underline; }
</style>
