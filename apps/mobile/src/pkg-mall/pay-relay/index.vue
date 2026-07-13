<template>
  <view class="relay">
    <app-nav-bar title="微信支付" back-icon="x" :back-size="44" :title-weight="500" :bar-height="106" custom-back @back="goOrder" />

    <view class="main">
      <!-- 唤起中 / 支付中 -->
      <block v-if="status === 'loading' || status === 'paying'">
        <view class="pay-logo">
          <view class="ring r1"><view class="ring r2"><view class="ring r3" /></view></view>
          <view class="ping" />
        </view>
        <text class="title">{{ status === 'loading' ? '正在唤起微信支付…' : '正在支付中…' }}</text>
        <text class="sub">请在微信收银台完成支付</text>
      </block>

      <!-- 成功 -->
      <block v-else-if="status === 'success'">
        <view class="result-icon green"><app-icon name="check-circle" :size="72" color="#4CAF50" /></view>
        <text class="title">支付成功</text>
        <text class="sub">正在跳转…</text>
      </block>

      <!-- 失败 / 取消 -->
      <block v-else>
        <view class="result-icon" :class="status === 'cancelled' ? 'gray' : 'red'">
          <app-icon :name="status === 'cancelled' ? 'x' : 'x-circle'" :size="72" :color="status === 'cancelled' ? '#999999' : '#E74C3C'" />
        </view>
        <text class="title">{{ status === 'cancelled' ? '支付已取消' : '支付失败' }}</text>
        <text class="sub">{{ failReason || '请重新尝试支付' }}</text>
        <view class="btn-row">
          <view class="btn ghost" @tap="goOrder"><text>查看订单</text></view>
          <view class="btn primary" @tap="startPay"><app-icon name="refresh-cw" :size="30" color="#fff" /><text>重新支付</text></view>
        </view>
      </block>
    </view>

    <view class="footer">
      <view class="safe-row">
        <app-icon name="shield" :size="30" color="#999999" />
        <text class="safe-text">支付环境安全 · 资金加密保护</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 支付中转页（pay-relay）—— 外部浏览器唤起小程序支付的落点页。
 *
 * 背景：平台八字命理类目导致「直连微信 H5 支付」商户申请被驳回。自建替代路径为：
 * 外部浏览器 → 后端 /shop/pay/url-link 生成小程序 url_link（带一次性令牌 t）→ 唤起微信小程序
 * 打开本页 → 本页 uni.login 取 code + 令牌 t → 后端 /shop/pay/relay-jsapi 发起已审批通过的
 * JSAPI 支付 → uni.requestPayment 调起微信收银台。
 *
 * 【为何不靠登录态】外部浏览器与小程序登录态相互独立、可能非同一账号；令牌即支付这一笔订单的
 * 凭证，openid 用「当前打开小程序者」的 uni.login code 换取（代付合法·订单归属不变），故本页
 * 无需登录、无需账号一致，进来即可支付。
 *
 * 本页仅在微信小程序（MP-WEIXIN）内有意义；其它端进入直接提示改用对应端支付。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { redirectTo, navigateTo } from '@/utils/router'
import { shopApi } from '@/lib/shop-data'
import { track } from '@/composables/useTrack'

type Status = 'loading' | 'paying' | 'success' | 'failed' | 'cancelled'

const payToken = ref('')
const orderId = ref('') // 支付发起后由后端返回，用于跳转订单/成功页
const status = ref<Status>('loading')
const failReason = ref('')
let busy = false

onLoad((q) => {
  // 令牌参数 t；兼容旧链接直接带 orderId 的历史情况（此时无令牌，走失败提示重新发起）
  payToken.value = (q?.t as string) || ''
  if (!payToken.value) {
    status.value = 'failed'
    failReason.value = '支付链接无效，请重新发起支付'
    return
  }
  startPay()
})

/** 小程序静默登录取临时 code（不弹窗，仅用于换 openid，不建立会话） */
function getLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res: { code?: string }) => res?.code ? resolve(res.code) : reject(new Error('获取微信登录凭证失败')),
      fail: () => reject(new Error('获取微信登录凭证失败')),
    })
  })
}

async function startPay() {
  if (busy) return
  busy = true
  failReason.value = ''
  status.value = 'loading'
  // #ifdef MP-WEIXIN
  try {
    const code = await getLoginCode()
    const { orderId: oid, payParams: p } = await shopApi.payOrderRelayJsapi(payToken.value, code)
    orderId.value = oid || ''
    status.value = 'paying'
    await new Promise<void>((resolve, reject) => {
      uni.requestPayment({
        provider: 'wxpay',
        timeStamp: p.timeStamp,
        nonceStr: p.nonceStr,
        package: p.package,
        signType: p.signType as 'MD5' | 'HMAC-SHA256' | 'RSA',
        paySign: p.paySign,
        success: () => resolve(),
        fail: (err: { errMsg?: string }) => reject(new Error(err?.errMsg?.includes('cancel') ? '支付已取消' : (err?.errMsg || '支付失败'))),
      })
    })
    // 调起成功：以支付回调为准，这里乐观置成功并跳成功页（成功页会真查订单状态）
    status.value = 'success'
    track.purchase({ type: 'shop_order', orderId: orderId.value, method: 'wechat' })
    setTimeout(() => redirectTo(`/shop/pay-success?orderId=${orderId.value}`), 1200)
  } catch (e) {
    const msg = (e as Error)?.message || ''
    status.value = msg.includes('取消') || msg.includes('cancel') ? 'cancelled' : 'failed'
    if (status.value === 'failed') failReason.value = msg || '支付失败，请重试'
  } finally {
    busy = false
  }
  // #endif
  // #ifndef MP-WEIXIN
  status.value = 'failed'
  failReason.value = '请在微信内打开支付'
  busy = false
  // #endif
}

function goOrder() {
  if (orderId.value) navigateTo(`/orders/${orderId.value}`)
  else redirectTo('/orders')
}
</script>

<style lang="scss" scoped>
.relay {
  min-height: 100vh;
  background: #FAF8F5;
  display: flex;
  flex-direction: column;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 48rpx;
}
.pay-logo { position: relative; width: 192rpx; height: 192rpx; margin-bottom: 56rpx; }
.ring { border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.r1 { width: 192rpx; height: 192rpx; background: #07C16015; animation: breathe 1.5s ease-in-out infinite; }
.r2 { width: 128rpx; height: 128rpx; background: #07C16025; }
.r3 { width: 80rpx; height: 80rpx; background: #07C160; }
@keyframes breathe { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
.ping { position: absolute; inset: 0; border-radius: 50%; background: #07C160; opacity: 0.3; animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite; }
@keyframes ping { 75%,100% { transform: scale(1.6); opacity: 0; } }
.title { font-size: 40rpx; font-weight: bold; color: #2C2C2C; margin-bottom: 16rpx; }
.sub { font-size: 28rpx; color: #666666; margin-bottom: 48rpx; }
.result-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
  &.green { background: #E8F5E9; }
  &.red { background: #FDECEA; }
  &.gray { background: #F0F0F0; }
}
.btn-row { display: flex; gap: 32rpx; }
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 0 48rpx;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  &.ghost { border: 1rpx solid #E8E3DB; color: #666666; }
  &.primary { background: #07C160; color: #FFFFFF; }
}
.footer { padding: 0 48rpx 64rpx; }
.safe-row { display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.safe-text { font-size: 24rpx; color: #999999; }
</style>
