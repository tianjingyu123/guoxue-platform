<template>
  <view class="paying">
    <!-- 顶部导航 -->
    <app-nav-bar :title="isRecharge ? '充值中' : '支付中'" back-icon="x" :back-size="44" :title-weight="500" :bar-height="106" custom-back @back="handleCancel" />

    <view class="main">
      <!-- 加载中 -->
      <block v-if="status === 'loading'">
        <view class="spinner" />
        <text class="sub">正在准备支付...</text>
      </block>

      <!-- 支付中 -->
      <block v-else-if="status === 'paying'">
        <view class="pay-logo">
          <view class="ring r1" :style="{ background: methodColor + '15' }">
            <view class="ring r2" :style="{ background: methodColor + '25' }">
              <view class="ring r3" :style="{ background: methodColor }" />
            </view>
          </view>
          <view class="ping" :style="{ background: methodColor }" />
        </view>
        <text class="title">正在支付中...</text>
        <text class="method-name">{{ methodName }}</text>
        <text class="amount">¥{{ formatPrice(amount) }}</text>
        <view class="countdown-box">
          <app-icon name="alert-circle" :size="30" color="#666666" />
          <text class="cd-text">请在 <text class="cd-num">{{ countdown }}</text> 秒内完成支付</text>
        </view>
        <text class="cancel-link" @tap="handleCancel">取消支付</text>
      </block>

      <!-- 普通浏览器不调用微信 H5 支付：扫码后在微信内走公众号 JSAPI -->
      <block v-else-if="status === 'wechat_required'">
        <view class="wechat-mark"><app-icon name="message-circle" :size="64" color="#FFFFFF" /></view>
        <text class="title">请在微信中打开</text>
        <text class="sub wechat-sub">使用微信扫描二维码，在微信内完成支付</text>
        <!-- #ifdef H5 -->
        <view class="wechat-qr-wrap">
          <canvas
            id="wechatPayQr"
            canvas-id="wechatPayQr"
            class="wechat-qr"
            :style="{ width: WECHAT_QR_PX + 'px', height: WECHAT_QR_PX + 'px' }"
          />
          <text v-if="!wechatQrReady" class="wechat-qr-loading">二维码生成中…</text>
        </view>
        <view class="btn-row wechat-actions">
          <view class="btn ghost" @tap="handleCancel"><text>{{ isRecharge ? '返回钱包' : '返回订单' }}</text></view>
          <view class="btn primary" @tap="copyWechatPayLink"><app-icon name="copy" :size="28" color="#fff" /><text>复制链接</text></view>
        </view>
        <!-- #endif -->
        <text class="wechat-waiting">{{ isRecharge ? '请在微信页面查看充值结果' : '扫码后本页面会自动查询支付结果' }}</text>
      </block>

      <!-- 确认支付结果中（倒计时归零但仍在查单，不判失败） -->
      <block v-else-if="status === 'confirming'">
        <view class="spinner" />
        <text class="title">正在确认支付结果...</text>
        <text class="sub">若已完成支付请稍候，系统正在核对到账状态</text>
        <text class="cancel-link" @tap="handleCancel">{{ isRecharge ? '返回钱包查看' : '返回订单查看' }}</text>
      </block>

      <!-- 成功 -->
      <block v-else-if="status === 'success'">
        <view class="result-icon green"><app-icon name="check-circle" :size="72" color="#4CAF50" /></view>
        <text class="title">{{ isRecharge ? '充值成功' : '支付成功' }}</text>
        <text class="sub">正在跳转...</text>
      </block>

      <!-- 失败 -->
      <block v-else-if="status === 'failed'">
        <view class="result-icon red"><app-icon name="x-circle" :size="72" color="#E74C3C" /></view>
        <text class="title">支付失败</text>
        <text class="sub">{{ failReason || '请重新尝试' }}</text>
        <view class="btn-row">
          <view class="btn ghost" @tap="handleCancel"><text>{{ isRecharge ? '返回钱包' : '返回订单' }}</text></view>
          <view class="btn primary" @tap="handleRetry"><app-icon name="refresh-cw" :size="30" color="#fff" /><text>{{ rechargeOrderNo ? '继续查询' : '重新支付' }}</text></view>
        </view>
      </block>

      <!-- 超时 -->
      <block v-else-if="status === 'timeout'">
        <view class="result-icon orange"><app-icon name="alert-circle" :size="72" color="#FF9800" /></view>
        <text class="title">支付超时</text>
        <text class="sub">未收到支付结果，请确认支付状态</text>
        <view class="btn-row">
          <view class="btn ghost" @tap="goOrder"><text>{{ isRecharge ? '返回钱包' : '查看订单' }}</text></view>
          <view class="btn primary" @tap="handleRetry"><app-icon name="refresh-cw" :size="30" color="#fff" /><text>{{ rechargeOrderNo ? '继续查询' : '重新支付' }}</text></view>
        </view>
      </block>

      <!-- 已取消 -->
      <block v-else-if="status === 'cancelled'">
        <view class="result-icon gray"><app-icon name="x" :size="72" color="#999999" /></view>
        <text class="title">支付已取消</text>
        <text class="sub">您已取消本次支付</text>
        <view class="btn primary single" @tap="goOrder"><text>{{ isRecharge ? '返回钱包' : '查看订单' }}</text></view>
      </block>
    </view>

    <!-- 底部安全提示 -->
    <view class="footer">
      <view class="safe-row">
        <app-icon name="shield" :size="30" color="#999999" />
        <text class="safe-text">支付环境安全 · 资金加密保护</text>
      </view>
      <text class="brand-tip">{{ BRAND.name }} 提供安全支付保障</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
// #ifdef H5
import { getCurrentInstance, nextTick } from 'vue'
// #endif
import { onLoad } from '@dcloudio/uni-app'
import { redirectTo, navigateTo } from '@/utils/router'
import { apiGet, apiPost } from '@/utils/request'
import { shopApi } from '@/lib/shop-data'
import { mineApi } from '@/lib/mine-data'
import { track } from '@/composables/useTrack'
import { BRAND } from '@/lib/brand'
import { formatPrice } from '@/utils/format'
// #ifdef H5
import { drawQrToCanvas } from '@/utils/qrcode'
// #endif

type Status = 'loading' | 'paying' | 'wechat_required' | 'confirming' | 'success' | 'failed' | 'timeout' | 'cancelled'

const orderId = ref('')
const scene = ref<'order' | 'recharge'>('order')
const amountCoin = ref(0)
const rechargeOrderNo = ref('')
const payMethod = ref('wechat')
const amount = ref('0')
const isRecharge = computed(() => scene.value === 'recharge')
const status = ref<Status>('loading')
const countdown = ref(180)
const failReason = ref('')
const submitting = ref(false)
// #ifdef H5
const instance = getCurrentInstance()?.proxy
const WECHAT_QR_PX = 196
const wechatPayUrl = ref('')
const wechatQrReady = ref(false)
// #endif

let cdTimer: ReturnType<typeof setInterval> | null = null
let pollTimer: ReturnType<typeof setTimeout> | null = null
// handleCancel 独立防抖守卫：与 submitting（支付发起中守卫）解耦，
// 否则慢支付 confirming 态下 submitting 仍为 true 会误挡用户取消/返回
let cancelling = false
let pollCount = 0
// 3s/次 × 70 ≈ 210s，覆盖倒计时 180s 之外的回调延迟；轮询（而非倒计时）才是「真超时」的唯一判定者
const maxPolls = 70

const methodName = computed(() => {
  if (payMethod.value === 'wechat') return '微信支付'
  if (payMethod.value === 'alipay') return '支付宝'
  if (payMethod.value === 'coins') return '学习币支付'
  return '在线支付'
})
const methodColor = computed(() => {
  if (payMethod.value === 'wechat') return '#07C160'
  if (payMethod.value === 'alipay') return '#1677FF'
  if (payMethod.value === 'coins') return '#C9A96E'
  return '#C41E3A'
})

onLoad((q) => {
  scene.value = q?.scene === 'recharge' ? 'recharge' : 'order'
  orderId.value = (q?.orderId as string) || ''
  amountCoin.value = Number(q?.amountCoin || 0)
  rechargeOrderNo.value = (q?.rechargeOrderNo as string) || ''
  payMethod.value = (q?.method as string) || 'wechat'
  amount.value = (q?.amount as string) || '0'
  if (isRecharge.value) {
    if (!Number.isInteger(amountCoin.value) || amountCoin.value <= 0) {
      status.value = 'failed'
      failReason.value = '缺少有效充值金额'
      return
    }
    if (rechargeOrderNo.value) {
      status.value = 'confirming'
      startCountdown()
      startPolling(300)
      return
    }
    startPaying()
    return
  }
  if (!orderId.value) {
    status.value = 'failed'
    failReason.value = '缺少订单信息'
    return
  }
  startPaying()
})

async function startPaying() {
  // 真守卫：发起阶段进行中忽略重复触发（handleRetry 快速连点 / onLoad 重入），杜绝多个 pollTimer 泄漏与重复下单
  if (submitting.value) return
  submitting.value = true
  status.value = 'paying'
  countdown.value = 180
  pollCount = 0
  failReason.value = ''
  clearTimers('all') // 清掉上一轮遗留的倒计时/轮询 timer，防泄漏
  startCountdown()
  try {
  // #ifdef MP-WEIXIN
  // 微信小程序内：走 JSAPI 支付，唤起微信收银台（到账以支付回调为准）
  try {
    let p
    if (isRecharge.value) {
      const recharge = await mineApi.rechargeWechat(amountCoin.value)
      rechargeOrderNo.value = recharge.orderNo
      amount.value = String(recharge.amountRmb)
      p = recharge.payParams
    } else {
      p = await shopApi.payOrderJsapi(orderId.value)
    }
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
  } catch (e) {
    const msg = (e as Error)?.message || ''
    if (msg.includes('取消') || msg.includes('cancel')) {
      status.value = 'cancelled'
      clearTimers('all')
      return
    }
    // 唤起/支付失败不阻断：继续轮询订单状态以等待支付确认
    console.warn('[paying] JSAPI 支付未完成，继续轮询订单状态', e)
  }
  // #endif
  // #ifdef H5
  /*
   * H5 真实微信支付分流（2026-07-11 接线·2026-07-15 公众号授权改造）：
   * ① 微信内置浏览器（UA 含 micromessenger）：微信内不允许 H5 支付（mweb_url 打不开）——
   *    走公众号 JSAPI：先经公众号网页授权(snsapi_base 静默)拿公众号 openid（ensureOaOpenid，
   *    sessionStorage 缓存 / URL code 兑换 / 无 code 则跳授权后回本页），
   *    再调 /shop/orders/:id/pay/jsapi（channel=OFFICIAL·公众号 appid 下单），
   *    WeixinJSBridge 调起收银台；授权失败/调起失败 → 留在微信内提示重试，
   *    不阻断：继续轮询订单状态。
   *    ⚠️不再依赖 Auth 表的微信记录——那是小程序 openid，与公众号 appid 不同应用，微信必拒。
   * ② 外部浏览器：绝不请求微信 H5 支付接口。展示当前支付页二维码，用户用微信扫码后
   *    在微信内完成公众号 OAuth + JSAPI 支付；电脑页仅轮询原订单状态，不创建新支付单。
   */
  try {
    const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase()
    const isWechatBrowser = ua.includes('micromessenger')
    if (isWechatBrowser) {
      // 微信内 → 公众号 JSAPI（openid 来自公众号网页授权）
      try {
        const openid = await ensureOaOpenid()
        if (!openid) return // 已跳转微信授权页，本页即将卸载，回跳后重走 onLoad
        let p
        if (isRecharge.value) {
          const recharge = await mineApi.rechargeWechat(amountCoin.value, { openid, channel: 'OFFICIAL' })
          rechargeOrderNo.value = recharge.orderNo
          amount.value = String(recharge.amountRmb)
          p = recharge.payParams
        } else {
          p = await shopApi.payOrderJsapi(orderId.value, { openid, channel: 'OFFICIAL' })
        }
        await invokeWechatJsapiPay(p)
      } catch (e) {
        const msg = (e as Error)?.message || ''
        if (msg.includes('取消')) {
          status.value = 'cancelled'
          clearTimers('all')
          return
        }
        // 授权失败/未配置/调起失败：留在微信内重试，继续轮询兜底
        uni.showToast({ title: msg.includes('未配置') || msg.includes('授权') ? msg : '微信支付暂未调起，请刷新页面后重试', icon: 'none', duration: 3500 })
      }
    } else {
      // 外部浏览器 → 只展示微信打开引导；禁止调用 /shop/pay/h5 或充值 H5 下单接口。
      // 二维码指向同一支付页，微信扫码后会命中上面的公众号 JSAPI 分支并支付原订单。
      status.value = 'wechat_required'
      clearTimers('all')
      await renderWechatOpenQr()
      // 商城订单在扫码前已存在，电脑页可以轮询同一订单；充值单要到微信内才创建，结果在微信页查看。
      if (!isRecharge.value) startPolling(1000)
      return
    }
  } catch (e) {
    // 结构化错误（如未配置商户证书 400）直接进入失败态，文案透出
    status.value = 'failed'
    failReason.value = (e as Error)?.message || '支付发起失败，请稍后重试'
    clearTimers('all')
    return
  }
  // #endif
  // #ifndef MP-WEIXIN || H5
  // App 等其他端：微信 APP 支付需客户端 SDK 接入（未接），提示改用小程序/H5 支付；仍轮询兜底（可换端支付）
  uni.showToast({ title: '当前端暂不支持在线支付，请在小程序或浏览器中完成支付', icon: 'none', duration: 3000 })
  // #endif
    // 首查用 600ms 短延迟：支付唤起成功后回调多在 1~2s 内到账，快探能把感知等待压到 ~1s
    startPolling(600)
  } finally {
    // 发起阶段结束即释放守卫（无论：成功唤起 / 用户取消早返回 / 失败早返回 / 外部浏览器外跳），
    // 之后的「支付中/确认中→结果」由倒计时与轮询驱动，不再依赖 submitting
    submitting.value = false
  }
}

// #ifdef H5
const OA_OPENID_KEY = 'wx_oa_openid'

function currentWechatPayUrl(): string {
  const url = new URL(window.location.href)
  // OAuth code/state 都是一次性参数，不能被复制或编码进二维码。
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  return url.toString()
}

async function renderWechatOpenQr(): Promise<void> {
  wechatPayUrl.value = currentWechatPayUrl()
  wechatQrReady.value = false
  await nextTick()
  const ctx = uni.createCanvasContext('wechatPayQr', instance)
  const ok = drawQrToCanvas(ctx, wechatPayUrl.value, 8, 8, WECHAT_QR_PX - 16, {
    padding: 0,
    radius: 0,
    foreground: '#1F2937',
  })
  if (!ok) return
  await new Promise<void>((resolve) => ctx.draw(false, () => resolve()))
  wechatQrReady.value = true
}

function copyWechatPayLink() {
  const data = wechatPayUrl.value || currentWechatPayUrl()
  uni.setClipboardData({
    data,
    success: () => uni.showToast({ title: '支付链接已复制，请发送到微信打开', icon: 'none' }),
  })
}

/**
 * 公众号网页授权取 openid（微信内 JSAPI 支付前置）：
 * ① sessionStorage 有缓存 → 直接用（会话内一次授权多次支付）；
 * ② URL 带授权回跳 code → 调后端兑换 openid，成功后缓存并用 replaceState 清掉 code（code 一次性，防刷新复用）；
 * ③ 都没有 → 请求后端 oauth-url（snsapi_base 静默授权，无弹窗），整页跳转微信授权，回跳本页后重走 onLoad。
 * 返回 ''=已发起跳转（调用方直接 return）；抛错=授权失败（调用方走外部浏览器引导兜底）。
 */
async function ensureOaOpenid(): Promise<string> {
  const cached = sessionStorage.getItem(OA_OPENID_KEY)
  if (cached) return cached

  const sp = new URLSearchParams(window.location.search)
  const code = sp.get('code')
  if (code) {
    try {
      const res = await apiPost<{ openid: string }>('/auth/wechat/oa-openid', { code })
      if (!res?.openid) throw new Error('微信授权失败，请重试')
      sessionStorage.setItem(OA_OPENID_KEY, res.openid)
      return res.openid
    } finally {
      // 无论成败都清掉 code：code 一次性，留在 URL 里刷新必报 40163(code been used)
      sp.delete('code'); sp.delete('state')
      const qs = sp.toString()
      history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash)
    }
  }

  const { url } = await apiGet<{ url: string }>(`/auth/wechat/oauth-url?redirectUri=${encodeURIComponent(window.location.href)}&scope=snsapi_base`)
  if (!url) throw new Error('微信授权发起失败')
  window.location.href = url
  return ''
}
// #endif

/** 微信内置浏览器 JSAPI 调起收银台（WeixinJSBridge.getBrandWCPayRequest） */
function invokeWechatJsapiPay(p: { appId: string; timeStamp: string; nonceStr: string; package: string; signType: string; paySign: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    const doInvoke = (bridge: { invoke: (api: string, params: Record<string, string>, cb: (res: { err_msg?: string }) => void) => void }) => {
      bridge.invoke(
        'getBrandWCPayRequest',
        { appId: p.appId, timeStamp: p.timeStamp, nonceStr: p.nonceStr, package: p.package, signType: p.signType, paySign: p.paySign },
        (res) => {
          if (res?.err_msg === 'get_brand_wcpay_request:ok') resolve()
          else if (res?.err_msg === 'get_brand_wcpay_request:cancel') reject(new Error('支付已取消'))
          else reject(new Error(`微信支付调起失败${res?.err_msg ? `(${res.err_msg})` : ''}`))
        },
      )
    }
    const w = window as unknown as { WeixinJSBridge?: { invoke: (api: string, params: Record<string, string>, cb: (res: { err_msg?: string }) => void) => void } }
    if (w.WeixinJSBridge) { doInvoke(w.WeixinJSBridge); return }
    // 微信内注入 WeixinJSBridge 是异步的，页面加载早期可能未就绪 → 等 ready 事件（5s 超时兜底）
    const timer = setTimeout(() => reject(new Error('微信支付环境未就绪，请刷新页面重试')), 5000)
    document.addEventListener('WeixinJSBridgeReady', () => {
      clearTimeout(timer)
      if (w.WeixinJSBridge) doInvoke(w.WeixinJSBridge)
      else reject(new Error('微信支付环境未就绪，请刷新页面重试'))
    }, { once: true })
    // #endif
    // #ifndef H5
    reject(new Error('非 H5 环境'))
    // #endif
  })
}

/**
 * 圈子订单支付兑现（2026-07-16 接线）：圈子入圈/续费是双段模式——支付回调只把订单标 PAID，
 * 建成员关系/顺延到期须再调 confirm（后端 paidPostProcessors 无 CIRCLE 类型，此前无任何调用方=付了钱不入圈）。
 * 幂等：重复调用后端报「已是圈子成员」，吞掉视为已兑现；COMPLETED 订单同理。
 */
async function settleCircleIfNeeded(st: { type?: string; targetId?: string }) {
  if (!st.targetId) return
  try {
    if (st.type === 'CIRCLE_JOIN') await apiPost(`/circles/${st.targetId}/join/confirm`, { orderId: orderId.value })
    else if (st.type === 'CIRCLE_RENEW') await apiPost(`/circles/${st.targetId}/renew/confirm`, { orderId: orderId.value })
  } catch (e) {
    const msg = (e as Error)?.message || ''
    if (!msg.includes('已是圈子成员')) console.warn('[paying] 圈子兑现确认失败（订单已支付，稍后可在圈子页重试加入）', e)
  }
}

function startCountdown() {
  clearTimers('cd')
  cdTimer = setInterval(() => {
    if (countdown.value <= 1) {
      countdown.value = 0
      clearTimers('cd') // 只停倒计时，绝不停轮询
      // 🔴命脉：倒计时归零 ≠ 支付失败。慢支付/晚 resolve 时用户其实已扣款，
      // 此处若判 timeout 就会「已付却显示超时」。改为进入「确认支付结果中」中间态，
      // 让 startPolling 继续查单直到查到 paid 或耗尽 maxPolls 才由轮询判真超时。
      if (status.value === 'paying') status.value = 'confirming'
      return
    }
    countdown.value -= 1
  }, 1000)
}

// 真实轮询支付状态：商城读 Order，充值读本人 VirtualCoinRecharge；都只认服务端 PAID，不认前端调起成功。
// 首次由支付唤起成功后以短延迟触发；微信回调多在支付后 1~2s 到账，故前几次用 1s 短间隔快探
// （把「支付完成→结果页」的等待从最多 3s 压到 ~1s），耗尽快探次数后退回 3s 稳态轮询。
function startPolling(delayMs?: number) {
  const delay = delayMs ?? (pollCount < 6 ? 1000 : 3000)
  pollTimer = setTimeout(async () => {
    // 放行支付中、电脑扫码等待、结果确认三态：慢支付晚 resolve、倒计时已归零进确认态时，都必须继续查单，
    // 唯有已进 success/failed/timeout/cancelled 结果态才停（否则重复跳转/重复兑现）
    if (status.value !== 'paying' && status.value !== 'wechat_required' && status.value !== 'confirming') return
    pollCount += 1
    try {
      if (isRecharge.value) {
        if (!rechargeOrderNo.value) throw new Error('充值订单尚未创建')
        const st = await mineApi.getRechargePaymentStatus(rechargeOrderNo.value)
        if (st.status === 'PAID') {
          if (st.amountRmb != null) amount.value = String(st.amountRmb)
          status.value = 'success'
          track.purchase({ type: 'recharge', orderId: rechargeOrderNo.value, amount: Number(amount.value), method: 'wechat' })
          clearTimers('all')
          setTimeout(() => redirectTo('/pkg-mine/wallet/index'), 900)
          return
        }
        if (st.status === 'FAILED' || st.status === 'REFUNDED') {
          status.value = 'failed'
          failReason.value = st.status === 'REFUNDED' ? '本次充值已退款' : '本次充值未完成'
          clearTimers('all')
          return
        }
      } else {
        const st = await shopApi.getOrderPayState(orderId.value)
        if (st.paid) {
          await settleCircleIfNeeded(st)
          status.value = 'success'
          track.purchase({ type: 'shop_order', orderId: orderId.value, amount: amount.value, method: payMethod.value })
          clearTimers('all')
          setTimeout(() => redirectTo(`/shop/pay-success?orderId=${orderId.value}`), 900)
          return
        }
      }
    } catch (e) {
      console.warn('[paying] 查询支付状态失败', e)
    }
    if (pollCount >= maxPolls) {
      status.value = 'timeout'
      clearTimers('all')
    } else {
      startPolling()
    }
  }, delay)
}

function clearTimers(which: 'cd' | 'poll' | 'all') {
  if ((which === 'cd' || which === 'all') && cdTimer) { clearInterval(cdTimer); cdTimer = null }
  if ((which === 'poll' || which === 'all') && pollTimer) { clearTimeout(pollTimer); pollTimer = null }
}

function returnTarget() {
  return isRecharge.value ? '/pkg-mine/wallet/index' : `/orders/${orderId.value}`
}

function handleCancel() {
  if (cancelling) return
  cancelling = true
  clearTimers('all')
  navigateTo(returnTarget())
  setTimeout(() => { cancelling = false }, 500)
}
function handleRetry() {
  if (submitting.value) return
  failReason.value = ''
  if (isRecharge.value && rechargeOrderNo.value) {
    // 已创建微信单时只继续查原单，绝不再建第二笔，避免用户晚付导致重复扣款。
    status.value = 'confirming'
    countdown.value = 180
    pollCount = 0
    clearTimers('all')
    startCountdown()
    startPolling(300)
    return
  }
  startPaying()
}
function goOrder() {
  navigateTo(returnTarget())
}

onUnmounted(() => clearTimers('all'))
</script>

<style lang="scss" scoped>
.paying {
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
.spinner {
  width: 96rpx;
  height: 96rpx;
  border: 8rpx solid #E8E3DB;
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 40rpx;
}
@keyframes spin { to { transform: rotate(360deg); } }
.pay-logo { position: relative; width: 192rpx; height: 192rpx; margin-bottom: 56rpx; }
.ring {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.r1 { width: 192rpx; height: 192rpx; animation: breathe 1.5s ease-in-out infinite; }
.r2 { width: 128rpx; height: 128rpx; }
.r3 { width: 80rpx; height: 80rpx; }
@keyframes breathe { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
.ping {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  opacity: 0.3;
  animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
}
@keyframes ping { 75%,100% { transform: scale(1.6); opacity: 0; } }
.title { font-size: 40rpx; font-weight: bold; color: #2C2C2C; margin-bottom: 16rpx; }
.method-name { font-size: 28rpx; color: #666666; margin-bottom: 16rpx; }
.amount { font-size: 48rpx; font-weight: bold; color: var(--brand); margin-bottom: 48rpx; }
.countdown-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx 48rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
  margin-bottom: 48rpx;
}
.cd-text { font-size: 28rpx; color: #666666; }
.cd-num { color: var(--brand); font-weight: bold; }
.cancel-link { font-size: 26rpx; color: #666666; text-decoration: underline; }
.wechat-mark {
  width: 112rpx;
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 32rpx;
  background: #07C160;
  box-shadow: 0 12rpx 32rpx rgba(7, 193, 96, 0.2);
  margin-bottom: 32rpx;
}
.wechat-sub { margin-bottom: 28rpx; text-align: center; }
.wechat-qr-wrap {
  position: relative;
  width: 212px;
  height: 212px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 8px;
  border-radius: 24rpx;
  background: #FFFFFF;
  box-shadow: 0 8rpx 32rpx rgba(44, 44, 44, 0.08);
  margin-bottom: 32rpx;
}
.wechat-qr { width: 196px; height: 196px; }
.wechat-qr-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.94);
  color: #777777;
  font-size: 24rpx;
}
.wechat-actions { margin-bottom: 24rpx; }
.wechat-waiting { font-size: 24rpx; color: #999999; text-align: center; }
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
  &.orange { background: #FFF3E0; }
  &.gray { background: #F0F0F0; }
}
.sub { font-size: 28rpx; color: #666666; margin-bottom: 48rpx; }
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
  &.primary { background: var(--brand); color: #FFFFFF; }
  &.single { margin-top: 0; }
}
.footer { padding: 0 48rpx 64rpx; }
.safe-row { display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.safe-text { font-size: 24rpx; color: #999999; }
.brand-tip { display: block; text-align: center; font-size: 22rpx; color: #999999; margin-top: 12rpx; }
</style>
