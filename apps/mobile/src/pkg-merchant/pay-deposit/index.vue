<template>
  <view class="deposit-page">
    <view
      class="deposit-nav"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="deposit-nav-inner">
        <view
          class="deposit-back"
          @tap="go('/merchant/application-status')"
        >
          <AppIcon
            name="arrow-left"
            :size="19"
            color="#2c2722"
          />
        </view>
        <text class="deposit-nav-title">
          入驻保证金
        </text>
      </view>
    </view>

    <view
      class="deposit-main"
      :style="{ paddingTop: statusBarHeight + 76 + 'px' }"
    >
      <view
        v-if="loading"
        class="state-card"
      >
        <view class="state-spinner" />
        <text class="state-text">
          正在核验保证金状态…
        </text>
      </view>

      <view
        v-else-if="error"
        class="state-card"
      >
        <view class="state-icon state-icon-error">
          <AppIcon
            name="alert-circle"
            :size="30"
            color="#b45309"
          />
        </view>
        <text class="state-title">
          暂时无法核验
        </text>
        <text class="state-text">
          {{ error }}
        </text>
        <view
          class="state-action"
          @tap="load"
        >
          <text>重新核验</text>
        </view>
      </view>

      <template v-else-if="info">
        <view
          class="hero-card"
          :class="{ 'hero-card-blocked': !canContinue }"
        >
          <view class="hero-orbit">
            <view class="hero-icon">
              <AppIcon
                :name="canContinue ? 'shield-check' : 'shield'"
                :size="34"
                :color="canContinue ? '#a5843f' : '#b45309'"
              />
            </view>
          </view>
          <text class="hero-kicker">
            商家入驻权益
          </text>
          <text class="hero-title serif">
            {{ canContinue ? '当前免缴保证金' : '保证金待平台核验' }}
          </text>
          <text class="hero-desc">
            {{ canContinue
              ? '本平台当前实行免保证金入驻，你无需支付任何费用，可直接继续签署合作协议。'
              : `系统记录应缴 ¥${formatAmount(info.depositAmount)}，但在线收款尚未开放，平台不会要求你在此页面付款。` }}
          </text>
          <view class="amount-pill">
            <text class="amount-label">
              本次应付
            </text>
            <text class="amount-value">
              ¥{{ canContinue ? '0.00' : formatAmount(info.depositAmount) }}
            </text>
          </view>
        </view>

        <view class="policy-card">
          <view class="policy-head">
            <text class="policy-title serif">
              你需要知道
            </text>
            <text class="policy-badge">
              资金安全
            </text>
          </view>
          <view
            v-for="item in policyItems"
            :key="item.title"
            class="policy-row"
          >
            <view class="policy-number">
              <text>{{ item.no }}</text>
            </view>
            <view class="policy-copy">
              <text class="policy-row-title">
                {{ item.title }}
              </text>
              <text class="policy-row-desc">
                {{ item.desc }}
              </text>
            </view>
          </view>
        </view>

        <view
          v-if="!canContinue"
          class="warning-card"
        >
          <AppIcon
            name="info"
            :size="20"
            color="#b45309"
          />
          <view class="warning-copy">
            <text class="warning-title">
              不会在未核验到账时开通店铺
            </text>
            <text class="warning-desc">
              请联系平台客服核对历史记录。真实支付与原路退款能力上线前，系统不会生成“支付成功”或“退款成功”流水。
            </text>
          </view>
        </view>
      </template>
    </view>

    <view
      v-if="!loading && !error && info"
      class="deposit-footer"
      :style="{ paddingBottom: 18 + safeBottom + 'px' }"
    >
      <view class="footer-note">
        <AppIcon
          name="lock"
          :size="13"
          color="#8a8178"
        />
        <text>{{ canContinue ? '本次无需支付，不会调起收银台' : '资金状态未核验前不可签约' }}</text>
      </view>
      <view
        class="footer-button"
        :class="{ 'footer-button-help': !canContinue }"
        @tap="handleContinue"
      >
        <AppIcon
          :name="canContinue ? 'check-circle-2' : 'customer-service'"
          :size="19"
          color="#ffffff"
        />
        <text>{{ canContinue ? '继续签署入驻协议' : '联系平台客服' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { merchantApi, type DepositInfo } from '@/pkg-merchant/lib/merchant-data'

const loading = ref(true)
const error = ref('')
const info = ref<DepositInfo | null>(null)
const statusBarHeight = ref(0)
const safeBottom = ref(0)

const canContinue = computed(() => !!info.value && (info.value.waived || info.value.depositPaid))

const policyItems = [
  { no: '01', title: '当前政策', desc: '平台现阶段免收商家入驻保证金，不设置隐藏收费。' },
  { no: '02', title: '真实凭证', desc: '只有经支付渠道核验的成功流水才会被认定为到账。' },
  { no: '03', title: '政策变更', desc: '未来如调整，将提前通知并以届时生效的协议为准。' },
]

function formatAmount(value: number): string {
  return Number(value || 0).toFixed(2)
}

async function load() {
  loading.value = true
  error.value = ''
  info.value = null
  try {
    info.value = await merchantApi.getDepositInfo()
  } catch (e) {
    error.value = (e as Error)?.message || '保证金状态加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function handleContinue() {
  navigateTo(canContinue.value ? '/merchant/sign-agreement' : '/customer-service')
}

function go(url: string) {
  navigateTo(url)
}

onMounted(() => {
  uni.getSystemInfo({
    success: (res) => {
      statusBarHeight.value = res.statusBarHeight || 0
      safeBottom.value = res.safeAreaInsets?.bottom || 0
    },
  })
  load()
})
</script>

<style lang="scss" scoped>
$paper: #f7f3ec;
$card: #fffdf9;
$ink: #2c2722;
$muted: #776f66;
$gold: #a5843f;
$red: #b82b42;
$line: rgba(83, 68, 51, 0.1);

.serif { font-family: "Songti SC", "STSong", serif; }
.deposit-page { min-height: 100vh; background: $paper; color: $ink; }
.deposit-nav { position: fixed; inset: 0 0 auto; z-index: 20; background: rgba(247, 243, 236, 0.94); border-bottom: 1rpx solid $line; backdrop-filter: blur(18px); }
.deposit-nav-inner { position: relative; height: 52px; display: flex; align-items: center; justify-content: center; }
.deposit-back { position: absolute; left: 28rpx; width: 68rpx; height: 68rpx; border: 1rpx solid $line; border-radius: 50%; background: rgba(255,255,255,.78); display: flex; align-items: center; justify-content: center; }
.deposit-nav-title { font-size: 32rpx; font-weight: 700; }
.deposit-main { padding-left: 32rpx; padding-right: 32rpx; padding-bottom: 260rpx; box-sizing: border-box; }

.state-card { min-height: 440rpx; padding: 60rpx 42rpx; border: 1rpx solid $line; border-radius: 36rpx; background: $card; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; }
.state-spinner { width: 48rpx; height: 48rpx; border: 5rpx solid rgba(165,132,63,.18); border-top-color: $gold; border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: 24rpx; }
.state-icon { width: 92rpx; height: 92rpx; border-radius: 28rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.state-icon-error { background: #fff7ed; }
.state-title { font-size: 34rpx; font-weight: 700; margin-bottom: 12rpx; }
.state-text { font-size: 25rpx; color: $muted; line-height: 1.7; }
.state-action { margin-top: 34rpx; padding: 20rpx 48rpx; border-radius: 999px; background: $red; }
.state-action text { color: #fff; font-size: 26rpx; font-weight: 600; }

.hero-card { position: relative; overflow: hidden; padding: 54rpx 42rpx 42rpx; border: 1rpx solid rgba(165,132,63,.24); border-radius: 40rpx; background: radial-gradient(circle at 82% 4%, rgba(207,178,116,.26), transparent 34%), linear-gradient(145deg, #fffdf8 0%, #f5ead2 100%); box-shadow: 0 22rpx 70rpx rgba(91,70,35,.1); text-align: center; }
.hero-card-blocked { border-color: rgba(180,83,9,.22); background: radial-gradient(circle at 82% 4%, rgba(245,158,11,.18), transparent 34%), linear-gradient(145deg, #fffdf9 0%, #fff7ed 100%); }
.hero-orbit { width: 128rpx; height: 128rpx; margin: 0 auto 24rpx; border: 1rpx solid rgba(165,132,63,.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.hero-icon { width: 94rpx; height: 94rpx; border-radius: 32rpx; background: rgba(255,255,255,.8); display: flex; align-items: center; justify-content: center; box-shadow: 0 12rpx 34rpx rgba(98,75,35,.12); }
.hero-kicker { display: block; color: $gold; font-size: 21rpx; letter-spacing: 6rpx; margin-bottom: 14rpx; }
.hero-title { display: block; font-size: 44rpx; font-weight: 700; letter-spacing: 2rpx; }
.hero-desc { display: block; margin-top: 18rpx; color: $muted; font-size: 25rpx; line-height: 1.75; }
.amount-pill { margin: 34rpx auto 0; padding: 18rpx 26rpx; max-width: 360rpx; border: 1rpx solid rgba(165,132,63,.16); border-radius: 22rpx; background: rgba(255,255,255,.62); display: flex; justify-content: space-between; align-items: baseline; }
.amount-label { font-size: 22rpx; color: $muted; }
.amount-value { font-size: 33rpx; font-weight: 800; color: $red; }

.policy-card { margin-top: 28rpx; padding: 36rpx 34rpx 12rpx; border: 1rpx solid $line; border-radius: 36rpx; background: $card; }
.policy-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14rpx; }
.policy-title { font-size: 31rpx; font-weight: 700; }
.policy-badge { padding: 8rpx 16rpx; border-radius: 999px; background: #f4eddd; color: $gold; font-size: 20rpx; }
.policy-row { display: flex; gap: 22rpx; padding: 26rpx 0; border-bottom: 1rpx solid $line; }
.policy-row:last-child { border-bottom: 0; }
.policy-number { width: 52rpx; height: 52rpx; border-radius: 18rpx; background: #f4eddd; display: flex; align-items: center; justify-content: center; flex: none; }
.policy-number text { color: $gold; font-size: 19rpx; font-weight: 700; }
.policy-copy { flex: 1; min-width: 0; }
.policy-row-title { display: block; font-size: 26rpx; font-weight: 700; margin-bottom: 7rpx; }
.policy-row-desc { display: block; color: $muted; font-size: 23rpx; line-height: 1.6; }
.warning-card { margin-top: 28rpx; padding: 28rpx; border: 1rpx solid rgba(180,83,9,.2); border-radius: 30rpx; background: #fff8ed; display: flex; align-items: flex-start; gap: 18rpx; }
.warning-copy { flex: 1; }
.warning-title { display: block; color: #92400e; font-size: 25rpx; font-weight: 700; margin-bottom: 8rpx; }
.warning-desc { display: block; color: #a16207; font-size: 22rpx; line-height: 1.65; }

.deposit-footer { position: fixed; inset: auto 0 0; z-index: 15; padding: 22rpx 32rpx 34rpx; border-top: 1rpx solid $line; background: rgba(255,253,249,.96); backdrop-filter: blur(18px); }
.footer-note { display: flex; align-items: center; justify-content: center; gap: 9rpx; margin-bottom: 15rpx; }
.footer-note text { color: #8a8178; font-size: 20rpx; }
.footer-button { height: 94rpx; border-radius: 28rpx; background: $red; box-shadow: 0 16rpx 34rpx rgba(184,43,66,.25); display: flex; align-items: center; justify-content: center; gap: 14rpx; }
.footer-button-help { background: #9a5a16; box-shadow: 0 16rpx 34rpx rgba(154,90,22,.22); }
.footer-button text { color: #fff; font-size: 29rpx; font-weight: 700; }

@keyframes spin { to { transform: rotate(360deg); } }
</style>
