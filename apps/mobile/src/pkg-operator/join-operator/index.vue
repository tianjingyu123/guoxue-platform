<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, onUnmounted, ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  operatorApi,
  type CurrentOperator,
  type OperatorPlan,
} from '@/pkg-operator/lib/operator-data'
import { shopApi } from '@/lib/shop-data'
import { getToken } from '@/utils/storage'
import { drawQrToCanvas } from '@/utils/qrcode'

const instance = getCurrentInstance()?.proxy
const QR_PX = 176
const statusBarHeight = ref(0)
const loading = ref(true)
const error = ref('')
const agreed = ref(false)
const submitting = ref(false)
const expandedFaq = ref<number | null>(0)
const plan = ref<OperatorPlan | null>(null)
const currentOperator = ref<CurrentOperator | null>(null)

const price = computed(() => plan.value?.price ?? 0)
const ownSlots = 1
const inviteSlots = computed(() => Math.max(0, (plan.value?.quotaTotal ?? 1) - ownSlots))
const serviceMonths = computed(() => plan.value?.serviceMonths ?? 0)
const managementPct = computed(() => Math.round((plan.value?.managementRate ?? 0) * 100))
const isRenewal = computed(() => Boolean(currentOperator.value))
const renewalBlocked = computed(() => currentOperator.value?.status === 'DISABLED')
const OPERATOR_STATUS_LABEL: Record<string, string> = {
  ACTIVE: '服务中',
  EXPIRED: '已到期，可续费恢复',
  DISABLED: '平台停用',
}
const statusLabel = computed(() => OPERATOR_STATUS_LABEL[currentOperator.value?.status || ''] || currentOperator.value?.status || '')
const actionLabel = computed(() => isRenewal.value ? '确认续费运营商' : '确认开通运营商')
const heroNums = computed(() => [
  { value: `¥${price.value}`, label: `${serviceMonths.value}个月服务期`, gold: false },
  { value: `${ownSlots}+${inviteSlots.value}`, label: '分站（自用+邀请）', gold: true },
  { value: `${managementPct.value}%`, label: '团队管理奖', gold: false },
])
const benefits = computed(() => [
  { icon: 'building-2', name: `${ownSlots}+${inviteSlots.value} 个分站`, desc: `${ownSlots} 个自用分站 + ${inviteSlots.value} 个站长邀请名额，邀请成功后自动占用` },
  { icon: 'award', name: `团队管理奖 ${managementPct.value}%`, desc: `名下站长产生真实推广收入时，按当前规则获得 ${managementPct.value}% 团队管理奖` },
  { icon: 'bar-chart-3', name: '团队业绩看板', desc: '查看名下站长的收益、活跃度与团队表现' },
  { icon: 'user-plus', name: '邀请归属管理', desc: '生成专属邀请链接，查看已加入并归属团队的分站' },
])
const risks = [
  '请先评估你是否具备推广渠道与资源；若没有推广能力，请勿加入。',
  '这是经营投入，存在亏损风险，收益取决于团队实际运营，平台不作任何收益承诺。',
  '请理性决策，量力而行。',
]
const faqs = computed(() => [
  { q: '运营商和站长有什么区别？', a: `运营商负责邀请与管理一支站长团队，并按当前 ${managementPct.value}% 规则获得团队管理奖；站长负责运营自己的分站并获得真实推广佣金。` },
  { q: '团队管理奖怎么计算？', a: `名下站长每产生一笔真实推广收入，平台按当前 ${managementPct.value}% 规则核算团队管理奖；具体以实际账单为准。` },
  { q: `${ownSlots}+${inviteSlots.value} 个分站分别是什么？`, a: `${ownSlots} 个名额用于自有分站，其余 ${inviteSlots.value} 个用于邀请站长加入团队。名额不可私下出售、转让或加购，邀请成功后自动占用。` },
  { q: '服务期多久，如何续费？', a: `本方案每次开通或续费增加 ${serviceMonths.value} 个月服务期；有效期内提前续费会在原到期日后顺延，不会损失剩余天数。` },
])

function formatDate(value?: string | null) {
  return value ? String(value).slice(0, 10) : '—'
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    plan.value = await operatorApi.getOperatorPricing()
    currentOperator.value = null
    if (getToken()) {
      try {
        currentOperator.value = await operatorApi.getCurrentOperator(true)
      } catch (e) {
        const message = (e as Error)?.message || ''
        if (!/运营商|不是|未找到|未登录|登录已过期/.test(message)) throw e
      }
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function retry() { fetchData() }
onMounted(() => {
  try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch { statusBarHeight.value = 0 }
  fetchData()
})
function toggleFaq(i: number) { expandedFaq.value = expandedFaq.value === i ? null : i }
function goBack() { uni.navigateBack({ delta: 1 }) }

const payPending = ref<{ orderId: string; codeUrl: string; amount: number } | null>(null)
const payFailure = ref('')
const payOrderKept = ref(false)
const qrReady = ref(false)
const pollCount = ref(0)
const POLL_MAX = 40
let pollTimer: ReturnType<typeof setTimeout> | null = null

async function onSubmit() {
  if (submitting.value || !agreed.value || renewalBlocked.value || !plan.value) return
  submitting.value = true
  payFailure.value = ''
  payOrderKept.value = false
  try {
    const order = await shopApi.createOrder({ type: 'OPERATOR', targetId: plan.value.level, quantity: 1 })
    if (!order.id) throw new Error('订单创建失败')
    payOrderKept.value = true
    const pay = await shopApi.payOrderNative(order.id)
    if (!pay.codeUrl) throw new Error('微信支付未返回支付二维码，请稍后重试')
    payPending.value = { orderId: order.id, codeUrl: pay.codeUrl, amount: order.amount }
    qrReady.value = false
    await nextTick()
    renderPayQr()
    startPolling(order.id)
  } catch (e) {
    payFailure.value = (e as Error)?.message || '支付发起失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

function renderPayQr() {
  const value = payPending.value?.codeUrl
  if (!value) return
  try {
    const ctx = uni.createCanvasContext('operatorPayQr', instance)
    const ok = drawQrToCanvas(ctx, value, 8, 8, QR_PX - 16, {})
    ctx.draw(false, () => { qrReady.value = ok })
  } catch { qrReady.value = false }
}

function startPolling(orderId: string) {
  stopPolling()
  pollCount.value = 0
  const tick = async () => {
    pollCount.value++
    try {
      const st = await shopApi.getOrderPayState(orderId)
      if (st.paid) { onPaid(); return }
    } catch { /* 单次查询失败不中断轮询 */ }
    if (pollCount.value >= POLL_MAX) {
      uni.showToast({ title: '暂未检测到支付结果，再次进入本页可继续支付', icon: 'none' })
      payPending.value = null
      return
    }
    pollTimer = setTimeout(tick, 3000)
  }
  pollTimer = setTimeout(tick, 3000)
}
function stopPolling() { if (pollTimer) { clearTimeout(pollTimer); pollTimer = null } }
function onPaid() {
  stopPolling()
  payPending.value = null
  uni.showToast({ title: isRenewal.value ? '续费成功' : '开通成功', icon: 'success' })
  setTimeout(() => navigateTo('/pkg-operator/dashboard/index'), 1200)
}
function copyCodeUrl() {
  if (!payPending.value) return
  uni.setClipboardData({ data: payPending.value.codeUrl, success: () => uni.showToast({ title: '支付链接已复制', icon: 'none' }) })
}
function openWechatPay() {
  if (!payPending.value) return
  // #ifdef H5
  window.location.href = payPending.value.codeUrl
  // #endif
  // #ifndef H5
  copyCodeUrl()
  // #endif
}
function cancelPay() { stopPolling(); payPending.value = null }
onUnmounted(() => stopPolling())
</script>

<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="statusbar" :style="{ height: statusBarHeight + 'px' }" />
    <view class="nav">
      <view class="nav-back" @tap="goBack">
        <AppIcon name="chevron-left" :size="40" color="#2C2C2C" />
      </view>
      <text class="nav-title">{{ isRenewal ? '续费运营商' : '成为运营商' }}</text>
      <view class="nav-holder" />
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="state-loading">
      <text class="state-loading-text">加载中…</text>
    </view>
    <!-- 错误 -->
    <view v-else-if="error" class="state-error">
      <text class="state-error-text">{{ error }}</text>
      <view class="state-retry-btn" @tap="retry"><text class="state-retry-text">重试</text></view>
    </view>

    <!-- 正常内容 -->
    <template v-else>
      <scroll-view scroll-y class="scroll">
        <!-- 英雄区：只陈述"是什么"，无收益承诺 -->
        <view class="hero">
          <view class="hero-badge">
            <AppIcon name="users" :size="56" color="#fff" />
          </view>
          <text class="hero-title serif">成为运营商</text>
          <text class="hero-sub">带一支站长团队，负责邀请与管理{{ '\n' }}从名下站长的收入中获得团队管理奖</text>
          <!-- 事实性参数（非承诺）：档位 / 分站数 / 团队管理奖比例 -->
          <view class="hero-nums">
            <view v-for="(n, i) in heroNums" :key="i" class="hn">
              <text class="hn-v" :class="{ gold: n.gold }">{{ n.value }}</text>
              <text class="hn-l">{{ n.label }}</text>
            </view>
          </view>
        </view>

        <view v-if="currentOperator" class="current-card" :class="{ blocked: renewalBlocked }">
          <view class="current-main">
            <text class="current-title">当前运营商资格</text>
            <text class="current-status">{{ statusLabel }}</text>
          </view>
          <text class="current-meta">当前到期日：{{ formatDate(currentOperator.expireAt) }}</text>
          <text v-if="renewalBlocked" class="current-warn">该资格已被平台停用，暂不能通过付款解除，请联系平台客服。</text>
          <text v-else class="current-tip">续费成功后将在当前有效期基础上顺延 {{ serviceMonths }} 个月。</text>
        </view>

        <!-- 单档套餐（唯一对外档位）-->
        <text class="sec-title serif">{{ isRenewal ? '续费方案' : '开通方案' }}</text>
        <view class="pkg">
          <view class="pkg-tag"><text class="pkg-tag-text">唯一对外档位</text></view>
          <text class="pkg-name">一级运营商</text>
          <view class="pkg-price serif">
            <text class="pkg-price-symbol">¥</text>
            <text class="pkg-price-num">{{ price }}</text>
          </view>
          <text class="pkg-sub">{{ serviceMonths }} 个月运营服务 · {{ ownSlots }} 个自用 + {{ inviteSlots }} 个邀请名额</text>
          <view class="pkg-div" />
          <view class="slots">
            <view class="slot">
              <text class="slot-n">{{ ownSlots }}</text>
              <text class="slot-l">自用分站</text>
            </view>
            <view class="slot">
              <text class="slot-n gold">{{ inviteSlots }}</text>
              <text class="slot-l">站长邀请名额</text>
            </view>
          </view>
        </view>

        <!-- 运营商权益 -->
        <text class="sec-title serif">运营商权益</text>
        <view class="benefits">
          <view v-for="(b, i) in benefits" :key="i" class="bf">
            <view class="bf-ic">
              <AppIcon :name="b.icon" :size="36" color="#C9A96E" />
            </view>
            <view class="bf-body">
              <text class="bf-n">{{ b.name }}</text>
              <text class="bf-d">{{ b.desc }}</text>
            </view>
          </view>
        </view>

        <!-- ★ 风险与资源提示（必须醒目·替代承诺宣传）-->
        <view class="risk">
          <view class="risk-t">
            <AppIcon name="triangle-alert" :size="28" color="#9A6E24" />
            <text class="risk-t-text">加入前请务必阅读</text>
          </view>
          <view v-for="(r, i) in risks" :key="i" class="risk-i">
            <view class="risk-dot" />
            <text class="risk-i-text">{{ r }}</text>
          </view>
        </view>

        <!-- 常见问题 -->
        <text class="sec-title serif faq-sec-title">常见问题</text>
        <view class="faqs">
          <view v-for="(f, i) in faqs" :key="i" class="faq" @tap="toggleFaq(i)">
            <view class="faq-q">
              <text class="faq-qt">{{ f.q }}</text>
              <view class="faq-ar" :class="{ open: expandedFaq === i }">
                <AppIcon name="chevron-right" :size="30" color="#9A9A9A" />
              </view>
            </view>
            <text v-if="expandedFaq === i" class="faq-a">{{ f.a }}</text>
          </view>
        </view>

        <view class="bottom-gap" />
      </scroll-view>

      <!-- 底部 CTA -->
      <view class="cta">
        <text class="cta-price">{{ isRenewal ? '续费' : '开通' }}金额 <text class="cta-price-b">¥{{ price }}</text> · {{ serviceMonths }}个月服务期</text>
        <view class="cta-hint">
          <view class="agree-box" :class="{ on: agreed }" @tap="agreed = !agreed">
            <AppIcon v-if="agreed" name="check" :size="20" color="#fff" />
          </view>
          <text class="cta-hint-text">
            点击即表示已阅读并同意
            <text class="cta-hint-link" @tap="navigateTo('/pkg-operator/agreement-operator/index')">《运营商服务协议》</text>
          </text>
        </view>
        <view class="cta-btn" :class="{ disabled: !agreed || renewalBlocked || submitting }" @tap="onSubmit">
          <text class="cta-btn-text">{{ renewalBlocked ? '资格已停用' : (submitting ? '正在创建订单…' : actionLabel) }}</text>
        </view>
      </view>
    </template>

    <!-- 待支付：微信 Native 扫码 + 轮询（范式同 pkg-profile/vip） -->
    <view v-if="payPending" class="modal-mask">
      <view class="modal-card" @tap.stop>
        <text class="modal-title">微信支付</text>
        <text class="pay-amount"><text class="pay-amount-yuan">¥</text>{{ payPending.amount }}</text>
        <text class="pay-tip">请使用微信扫描二维码完成支付</text>
        <view class="pay-qr-wrap">
          <canvas id="operatorPayQr" canvas-id="operatorPayQr" class="pay-qr" />
          <text v-if="!qrReady" class="pay-qr-loading">二维码生成中…</text>
        </view>
        <view class="modal-btn" @tap="openWechatPay">
          <text class="modal-btn-txt">在微信中打开</text>
        </view>
        <text class="pay-copy" @tap="copyCodeUrl">无法打开？复制支付链接</text>
        <text class="pay-poll">正在等待支付结果（{{ pollCount }}/{{ POLL_MAX }}），支付成功后{{ isRenewal ? '自动续期' : '自动开通' }}</text>
        <text class="pay-cancel" @tap="cancelPay">取消</text>
      </view>
    </view>

    <view v-if="payFailure" class="modal-mask" @tap="payFailure = ''">
      <view class="modal-card" @tap.stop>
        <text class="modal-title">支付未发起</text>
        <text class="modal-desc">{{ payFailure }}</text>
        <text v-if="payOrderKept" class="modal-order-tip">订单已安全保留，再次点击开通/续费将继续使用同一张待支付订单。</text>
        <view class="modal-btn" @tap="payFailure = ''">
          <text class="modal-btn-txt">我知道了</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.serif { font-family: 'Songti SC', 'STSong', serif; }

/* 自定义导航 */
.statusbar { width: 100%; }
.nav { height: 92rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 38rpx; background: #FAF8F5; }
.nav-back { width: 88rpx; height: 88rpx; display: flex; align-items: center; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.nav-holder { width: 88rpx; }

.scroll { flex: 1; }

/* 英雄区 */
.hero { text-align: center; padding: 38rpx 38rpx 54rpx; display: flex; flex-direction: column; align-items: center; }
.hero-badge { width: 124rpx; height: 124rpx; border-radius: 35rpx; margin-bottom: 30rpx;
  background: linear-gradient(135deg, #C9A96E, #B8935A); display: flex; align-items: center; justify-content: center;
  box-shadow: 0 20rpx 50rpx rgba(201,169,110,0.35); }
.hero-title { font-size: 50rpx; font-weight: 700; color: #2C2C2C; }
.hero-sub { font-size: 25rpx; color: #6E6E73; margin-top: 20rpx; line-height: 1.7; }
.hero-nums { display: flex; margin-top: 42rpx; width: 100%; background: #FFFFFF;
  border: 1rpx solid #EFEBE4; border-radius: 31rpx; padding: 30rpx 0; }
.hn { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
.hn::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); height: 58rpx; width: 1rpx; background: #EFEBE4; }
.hn:first-child::before { display: none; }
.hn-v { font-size: 38rpx; font-weight: 700; color: #C41E3A; }
.hn-v.gold { color: #C9A96E; }
.hn-l { font-size: 21rpx; color: #9A9A9A; margin-top: 10rpx; }

.sec-title { display: block; font-size: 31rpx; font-weight: 600; color: #2C2C2C; padding: 16rpx 38rpx 23rpx; }
.faq-sec-title { margin-top: 16rpx; }

/* 单档套餐卡 */
.pkg { margin: 0 38rpx; background: #FFFFFF; border: 4rpx solid #C41E3A; border-radius: 35rpx;
  padding: 42rpx 38rpx; position: relative; box-shadow: 0 23rpx 65rpx rgba(196,30,58,0.1); }
.pkg-tag { position: absolute; top: 0; right: 42rpx; background: #C41E3A; border-radius: 0 0 17rpx 17rpx; padding: 8rpx 23rpx; }
.pkg-tag-text { font-size: 21rpx; font-weight: 600; color: #fff; }
.current-card { margin: 0 38rpx 30rpx; padding: 28rpx 30rpx; border-radius: 27rpx; background: #F4F8F2; border: 1rpx solid #D9E7D4; }
.current-card.blocked { background: #FFF3F1; border-color: #F1C7C1; }
.current-main { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }
.current-title { font-size: 27rpx; font-weight: 700; color: #2C2C2C; }
.current-status { font-size: 22rpx; font-weight: 600; color: #47713C; }
.current-card.blocked .current-status { color: #C41E3A; }
.current-meta, .current-tip, .current-warn { display: block; margin-top: 10rpx; font-size: 22rpx; line-height: 1.55; color: #6E6E73; }
.current-warn { color: #A53B2E; }
.pkg-name { font-size: 27rpx; font-weight: 600; color: #6E6E73; }
.pkg-price { display: flex; align-items: baseline; margin-top: 16rpx; }
.pkg-price-symbol { font-size: 35rpx; font-weight: 700; color: #C41E3A; }
.pkg-price-num { font-size: 73rpx; font-weight: 700; color: #C41E3A; line-height: 1; }
.pkg-sub { display: block; font-size: 23rpx; color: #9A9A9A; margin-top: 16rpx; }
.pkg-div { height: 1rpx; background: #EFEBE4; margin: 35rpx 0; }
.slots { display: flex; gap: 23rpx; }
.slot { flex: 1; background: #FAF8F5; border-radius: 25rpx; padding: 27rpx; display: flex; flex-direction: column; align-items: center; }
.slot-n { font-size: 46rpx; font-weight: 700; color: #2C2C2C; }
.slot-n.gold { color: #C9A96E; }
.slot-l { font-size: 21rpx; color: #6E6E73; margin-top: 10rpx; }

/* 权益 */
.benefits { padding: 0 38rpx; display: flex; flex-direction: column; gap: 19rpx; }
.bf { background: #FFFFFF; border: 1rpx solid #EFEBE4; border-radius: 27rpx; padding: 27rpx 31rpx; display: flex; gap: 25rpx; align-items: flex-start; }
.bf-ic { width: 73rpx; height: 73rpx; border-radius: 21rpx; background: rgba(201,169,110,0.14); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.bf-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.bf-n { font-size: 27rpx; font-weight: 600; color: #2C2C2C; }
.bf-d { font-size: 23rpx; color: #6E6E73; margin-top: 8rpx; line-height: 1.6; }

/* 风险提示 */
.risk { margin: 31rpx 38rpx 0; background: #FCF3E4; border-left: 6rpx solid #DDA149; border-radius: 23rpx; padding: 31rpx; }
.risk-t { display: flex; align-items: center; gap: 12rpx; margin-bottom: 19rpx; }
.risk-t-text { font-size: 25rpx; font-weight: 700; color: #9A6E24; }
.risk-i { display: flex; gap: 15rpx; margin-top: 12rpx; }
.risk-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #DDA149; flex-shrink: 0; margin-top: 13rpx; }
.risk-i-text { flex: 1; font-size: 23rpx; color: #8A6A30; line-height: 1.7; }

/* FAQ */
.faqs { padding: 0 38rpx; display: flex; flex-direction: column; gap: 17rpx; }
.faq { background: #FFFFFF; border: 1rpx solid #EFEBE4; border-radius: 27rpx; padding: 29rpx 31rpx; }
.faq-q { display: flex; align-items: center; justify-content: space-between; gap: 19rpx; }
.faq-qt { flex: 1; font-size: 27rpx; font-weight: 500; color: #2C2C2C; }
.faq-ar { flex-shrink: 0; transition: transform 0.2s; }
.faq-ar.open { transform: rotate(90deg); }
.faq-a { display: block; font-size: 24rpx; color: #6E6E73; line-height: 1.75; margin-top: 19rpx; }

.bottom-gap { height: 40rpx; }

/* 底部 CTA */
.cta { background: #FFFFFF; border-top: 1rpx solid #EFEBE4; padding: 27rpx 38rpx calc(46rpx + env(safe-area-inset-bottom)); }
.cta-price { display: block; font-size: 23rpx; color: #6E6E73; text-align: center; margin-bottom: 12rpx; }
.cta-price-b { color: #C41E3A; font-size: 31rpx; font-weight: 700; }
.cta-hint { display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-bottom: 21rpx; }
.agree-box { width: 34rpx; height: 34rpx; border-radius: 8rpx; border: 1rpx solid #9A9A9A; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.agree-box.on { background: #C41E3A; border-color: #C41E3A; }
.cta-hint-text { font-size: 21rpx; color: #9A9A9A; }
.cta-hint-link { color: #C41E3A; }
.cta-btn { height: 96rpx; border-radius: 27rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; box-shadow: 0 15rpx 46rpx rgba(196,30,58,0.3); }
.cta-btn.disabled { opacity: 0.5; }
.cta-btn-text { font-size: 31rpx; font-weight: 600; color: #fff; }

/* 三态 */
.state-loading { flex: 1; display: flex; align-items: center; justify-content: center; }
.state-loading-text { font-size: 28rpx; color: #6E6E73; }
.state-error { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 48rpx; }
.state-error-text { font-size: 28rpx; color: #C41E3A; text-align: center; }
.state-retry-btn { padding: 20rpx 60rpx; background: #C41E3A; border-radius: 999rpx; }
.state-retry-text { font-size: 28rpx; color: #fff; }

/* 支付弹层（待支付扫码 / 渠道未就绪） */
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-card { width: 600rpx; background: #FFFFFF; border-radius: 27rpx; padding: 46rpx 38rpx; display: flex; flex-direction: column; align-items: center; }
.modal-title { font-size: 33rpx; font-weight: 700; color: #1A1A1A; text-align: center; }
.modal-desc { font-size: 25rpx; color: #6E6E73; line-height: 1.6; text-align: center; margin-top: 20rpx; }
.modal-btn { margin-top: 31rpx; width: 100%; height: 84rpx; border-radius: 21rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; }
.modal-btn-txt { font-size: 28rpx; color: #FFFFFF; font-weight: 600; }
.pay-amount { margin-top: 21rpx; font-size: 54rpx; font-weight: 700; color: #C41E3A; }
.pay-amount-yuan { font-size: 31rpx; }
.pay-tip { margin-top: 21rpx; font-size: 23rpx; color: #6E6E73; text-align: center; line-height: 1.6; }
.pay-qr-wrap { width: 352rpx; height: 352rpx; margin-top: 20rpx; position: relative; border-radius: 20rpx; overflow: hidden; background: #F7F5F2; }
.pay-qr { width: 352rpx; height: 352rpx; }
.pay-qr-loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 23rpx; color: #9A9A9A; }
.pay-copy { margin-top: 18rpx; font-size: 23rpx; color: #97794a; }
.modal-order-tip { display: block; margin-top: 14rpx; font-size: 22rpx; line-height: 1.55; color: #97794a; text-align: center; }
.pay-poll { margin-top: 23rpx; font-size: 21rpx; color: #9A9A9A; text-align: center; line-height: 1.6; }
.pay-cancel { margin-top: 20rpx; font-size: 25rpx; color: #9A9A9A; }
</style>
