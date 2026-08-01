<template>
  <view class="js-page">
    <!-- 自定义导航（statusBarHeight 留白） -->
    <view class="js-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="js-nav-bar">
        <view class="js-nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="40" color="#2C2C2C" />
        </view>
        <text class="js-nav-title">{{ pageTitle }}</text>
        <view class="js-nav-holder" />
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="state-loading" :style="{ paddingTop: navHeight + 'px' }">
      <text class="state-loading-text">加载中...</text>
    </view>
    <!-- 错误 -->
    <view v-else-if="error" class="state-error" :style="{ paddingTop: navHeight + 'px' }">
      <text class="state-error-text">{{ error }}</text>
      <view class="state-retry-btn" @tap="retry"><text>重试</text></view>
    </view>


    <!-- 正常内容 -->
    <template v-else>
      <scroll-view scroll-y class="js-scroll" :style="{ paddingTop: navHeight + 'px' }">
        <!-- Hero -->
        <view class="js-hero">
          <view class="js-hero-badge">
            <app-icon name="home" :size="30" color="#ffffff" />
          </view>
          <text class="js-hero-title serif">{{ heroTitle }}</text>
          <text class="js-hero-sub">{{ heroSubtitle }}</text>
        </view>

        <!-- 运营商邀请归属横幅（仅邀请开通态显示） -->
        <view v-if="!existingStation && invitedByOperator" class="js-invite">
          <view class="js-invite-av">
            <text class="js-invite-av-text">{{ operatorInitial }}</text>
          </view>
          <view class="js-invite-info">
            <text class="js-invite-n">{{ operatorName }} 邀请你开通分站</text>
            <text class="js-invite-s">开通后你将归属该运营商团队</text>
          </view>
          <view class="js-invite-badge"><text class="js-invite-badge-text">邀请码已验证</text></view>
        </view>

        <!-- 费用说明 -->
        <text class="js-sec-title serif">费用说明</text>
        <view class="js-fee">
          <view class="js-fee-tag"><text class="js-fee-tag-text">{{ existingStation ? '权益顺延' : '无门槛加入' }}</text></view>
          <text class="js-fee-name">{{ existingStation ? '系统租赁续费' : '系统租赁费' }}</text>
          <view class="js-fee-price serif">
            <text class="js-fee-price-yuan">¥</text>
            <text class="js-fee-price-num">{{ displayPrice }}</text>
            <text class="js-fee-price-unit"> / {{ servicePeriodLabel }}</text>
          </view>
          <text class="js-fee-nolimit">开通无门槛 · 人人可开</text>
          <view class="js-fee-div" />
          <text class="js-rule-title">费用执行说明</text>
          <!-- 以当前真实资金能力为准 -->
          <view class="js-rule">
            <view class="js-rule-ic waive"><text class="js-rule-ic-text">免</text></view>
            <text class="js-rule-tx">当前在线订单按<text class="js-b">服务端显示金额</text>收取，支付成功后激活或顺延{{ servicePeriodText }}。</text>
          </view>
          <view class="js-rule">
            <view class="js-rule-ic refund"><text class="js-rule-ic-text">退</text></view>
            <text class="js-rule-tx"><text class="js-b">自动减免与原路退还尚未开放</text>，当前不作为支付条件；后续上线将另行公示。</text>
          </view>
        </view>

        <!-- 开通后你可以 -->
        <text class="js-sec-title serif">{{ existingStation ? '续费后继续享有' : '开通后你可以' }}</text>
        <view class="js-steps">
          <view class="js-step">
            <view class="js-step-ic"><app-icon name="grid" :size="20" color="#C41E3A" /></view>
            <view class="js-step-body">
              <text class="js-step-n">主推位选品</text>
              <text class="js-step-d">平台每个板块保留 6 个主推位，你从内容库挑选内容锁定</text>
            </view>
          </view>
          <view class="js-step">
            <view class="js-step-ic"><app-icon name="share-2" :size="20" color="#C41E3A" /></view>
            <view class="js-step-body">
              <text class="js-step-n">推广拉客</text>
              <text class="js-step-d">专属推广码 / 海报 / 文案，引流客户到平台消费</text>
            </view>
          </view>
          <view class="js-step">
            <view class="js-step-ic"><app-icon name="trending-up" :size="20" color="#C41E3A" /></view>
            <view class="js-step-body">
              <text class="js-step-n">获得分销佣金</text>
              <text class="js-step-d">归属客户消费后，按约定比例结算佣金</text>
            </view>
          </view>
        </view>

        <!-- 风险提示（合规红线·逐字） -->
        <view v-if="!existingStation" class="js-risk">
          <view class="js-risk-t">
            <app-icon name="alert-triangle" :size="15" color="#9A6E24" />
            <text class="js-risk-t-text">加入前请务必阅读</text>
          </view>
          <view class="js-risk-i"><view class="js-risk-dot" /><text class="js-risk-i-text">请先评估你是否具备推广渠道与资源；若没有推广能力，请勿加入。</text></view>
          <view class="js-risk-i"><view class="js-risk-dot" /><text class="js-risk-i-text">这是投资行为，存在亏损风险，收益取决于你的推广，平台不作任何收益承诺。</text></view>
          <view class="js-risk-i"><view class="js-risk-dot" /><text class="js-risk-i-text">请理性决策，量力而行。</text></view>
        </view>

        <!-- 首次开通填写分站信息；已有 PENDING/ACTIVE/EXPIRED 分站直接继续支付或续费 -->
        <template v-if="!existingStation">
          <text class="js-sec-title serif">分站信息（必填）</text>
          <view class="js-invite-input-card">
            <input
              v-model="stationName"
              class="js-invite-input"
              placeholder="分站名称（如：XX国学驿站）"
              placeholder-class="js-invite-ph"
              maxlength="50"
            />
            <input
              v-model="stationCode"
              class="js-invite-input js-invite-input-gap"
              placeholder="专属推广码（字母/数字·全平台唯一）"
              placeholder-class="js-invite-ph"
              maxlength="30"
            />
            <text class="js-invite-input-note">名称与推广码用于生成你的专属分站入口，支付完成后即开通。</text>
          </view>
        </template>
        <template v-else>
          <text class="js-sec-title serif">当前分站</text>
          <view class="js-current-station">
            <view class="js-current-head">
              <view class="js-current-icon"><app-icon name="home" :size="20" color="#C41E3A" /></view>
              <view class="js-current-main">
                <text class="js-current-name">{{ existingStation.name }}</text>
                <text class="js-current-code">推广码 {{ existingStation.code }}</text>
              </view>
              <text class="js-current-status">{{ existingStatusLabel }}</text>
            </view>
            <text class="js-current-note">{{ existingStation.status === 'PENDING' ? '申请已保留，可直接重新发起支付，无需重复填写资料。' : '续费成功后有效期在当前剩余时间基础上顺延，不会吞掉未到期天数。' }}</text>
            <text v-if="existingStation.expireAt" class="js-current-expire">当前有效期至 {{ formatDate(existingStation.expireAt) }}</text>
          </view>
        </template>

        <!-- 运营商邀请码（选填·自主开通态可填） -->
        <template v-if="!existingStation && !invitedByOperator">
          <text class="js-sec-title serif">运营商邀请码（选填）</text>
          <view class="js-invite-input-card">
            <input
              v-model="inviteCode"
              class="js-invite-input"
              placeholder="如有运营商邀请码请填写"
              placeholder-class="js-invite-ph"
              @blur="verifyInvite"
            />
            <text class="js-invite-input-note">填写并验证邀请码可加入运营商团队；不填写则自主开通。费用规则一致。</text>
          </view>
        </template>

        <!-- 常见问题（逐字照 mockup） -->
        <text class="js-sec-title serif">常见问题</text>
        <view class="js-faqs">
          <view v-for="(f, i) in faqs" :key="i" class="js-faq">
            <view class="js-faq-q" @tap="toggleFaq(i)">
              <text class="js-faq-qt">{{ f.q }}</text>
              <view class="js-faq-ar" :class="{ open: expandedFaq === i }">
                <app-icon name="chevron-right" :size="26" color="#9A9A9A" />
              </view>
            </view>
            <view v-if="expandedFaq === i" class="js-faq-a">
              <text class="js-faq-a-text">{{ f.a }}</text>
            </view>
          </view>
        </view>

        <view class="js-bottom-pad" />
      </scroll-view>

      <!-- 底部 CTA -->
      <view class="js-cta">
        <text class="js-cta-price">系统租赁费 <text class="js-cta-price-b">¥{{ displayPrice }} / {{ servicePeriodLabel }}</text> · 与订单配置同步</text>
        <text class="js-cta-hint">点击即表示已阅读并同意 <text class="js-cta-hint-link" @tap="openAgreement">《站长服务协议》</text></text>
        <view class="js-cta-btn" :class="{ 'js-cta-btn-disabled': submitting || renewalBlocked }" @tap="handleOpen">
          <text class="js-cta-btn-text">{{ submitting ? '处理中…' : ctaLabel }}</text>
        </view>
      </view>
    </template>

    <!-- 待支付：微信 Native 扫码 + 轮询（范式同 join-operator） -->
    <view v-if="payPending" class="modal-mask">
      <view class="modal-card" @tap.stop>
        <text class="modal-title">请使用微信扫码{{ paymentPurpose === 'renew' ? '续费' : '开通' }}</text>
        <text class="pay-amount"><text class="pay-amount-yuan">¥</text>{{ payPending.amount }}</text>
        <text class="pay-tip">请使用微信扫描二维码完成支付</text>
        <view class="pay-qr-wrap">
          <canvas id="stationPayQr" canvas-id="stationPayQr" class="pay-qr" />
          <text v-if="!qrReady" class="pay-qr-loading">二维码生成中…</text>
        </view>
        <view class="modal-btn" @tap="openWechatPay">
          <text class="modal-btn-txt">在微信中打开</text>
        </view>
        <text class="pay-copy" @tap="copyCodeUrl">无法打开？复制支付链接</text>
        <text class="pay-poll">正在等待支付结果（{{ pollCount }}/{{ POLL_MAX }}），支付成功后自动{{ paymentPurpose === 'renew' ? '续费' : '开通' }}</text>
        <text class="pay-cancel" @tap="cancelPay">取消</text>
      </view>
    </view>

    <!-- 支付渠道未就绪：诚实降级，不假装成功（分站已建，订单已保留） -->
    <view v-if="payUnavailable" class="modal-mask" @tap="payUnavailable = false">
      <view class="modal-card" @tap.stop>
        <text class="modal-title">暂时无法获取付款码</text>
        <text class="modal-desc">本次未能获取微信付款码，分站资料不会丢失。你可以稍后关闭本页重新发起支付；系统不会把未付款订单当作已开通。</text>
        <view class="modal-btn" @tap="payUnavailable = false">
          <text class="modal-btn-txt">我知道了</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, onUnmounted, ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { operatorApi, type StationPlan } from '@/pkg-operator/lib/operator-data'
import { shopApi } from '@/lib/shop-data'
import { apiGet, apiPost } from '@/utils/request'
import { getToken } from '@/utils/storage'
import { drawQrToCanvas } from '@/utils/qrcode'

const instance = getCurrentInstance()?.proxy
const QR_PX = 176

// ===== 状态栏留白（自定义导航） =====
const statusBarHeight = ref(20)
const navHeight = ref(64)

// ===== 三态 =====
const loading = ref(true)
const error = ref('')
const submitting = ref(false)

// ===== 分站信息（后端 ApplyStationDto 必填 name+code） =====
interface ExistingStation {
  id: string
  name: string
  code: string
  status: string
  expireAt?: string | null
}

const stationName = ref('')
const stationCode = ref('')
const existingStation = ref<ExistingStation | null>(null)
const stationPlan = ref<StationPlan | null>(null)
const paymentPurpose = ref<'open' | 'renew'>('open')

// ===== 支付状态（范式对齐 join-operator：Native 扫码 + 轮询 + 渠道未就绪诚实降级）=====
const payPending = ref<{ orderId: string; codeUrl: string; amount: number } | null>(null)
const payUnavailable = ref(false)
const qrReady = ref(false)
const pollCount = ref(0)
const POLL_MAX = 40 // 3s × 40 ≈ 2 分钟
let pollTimer: ReturnType<typeof setTimeout> | null = null

const displayPrice = computed(() => {
  const price = stationPlan.value?.price ?? 0
  return Number.isInteger(price) ? String(price) : price.toFixed(2)
})
const servicePeriodText = computed(() => {
  const months = stationPlan.value?.serviceMonths ?? 0
  if (months === 12) return '一年'
  if (months > 0 && months % 12 === 0) return `${months / 12} 年`
  return `${months} 个月`
})
const servicePeriodLabel = computed(() => servicePeriodText.value === '一年' ? '年' : servicePeriodText.value)

// ===== 邀请开通态 =====
const inviteCode = ref('')
const operatorName = ref('')
const invitedByOperator = computed(() => !!operatorName.value)
const operatorInitial = computed(() => operatorName.value ? operatorName.value.charAt(0) : '运')
const renewalBlocked = computed(() => existingStation.value?.status === 'DISABLED')
const pageTitle = computed(() => {
  if (!existingStation.value) return '成为站长'
  return existingStation.value.status === 'PENDING' ? '继续开通分站' : '分站续费'
})
const heroTitle = computed(() => {
  if (!existingStation.value) return '开你的分站'
  return existingStation.value.status === 'PENDING' ? '完成分站开通' : '为分站续费'
})
const heroSubtitle = computed(() => existingStation.value
  ? (existingStation.value.status === 'PENDING'
      ? '资料已经保留，只需完成支付即可正式开通'
      : '续费从当前到期日顺延，保留全部经营数据与客户归属')
  : '在平台各板块主推位选品、推广拉客\n你引流来的客户消费，即为你带来分销佣金')
const existingStatusLabel = computed(() => {
  const map: Record<string, string> = { PENDING: '待支付', ACTIVE: '运营中', EXPIRED: '已到期', DISABLED: '已停用' }
  return map[existingStation.value?.status || ''] || '状态待核验'
})
const ctaLabel = computed(() => {
  if (!existingStation.value) return invitedByOperator.value ? `确认开通（归属 ${operatorName.value}）` : '确认开通我的分站'
  if (existingStation.value.status === 'PENDING') return '继续支付开通'
  if (renewalBlocked.value) return '分站已停用，请联系平台'
  return `续费 ${servicePeriodText.value}`
})

// ===== FAQ（合规文案·逐字照 mockup-C2） =====
const expandedFaq = ref<number | null>(0)
const faqs = [
  { q: '什么是「主推位」？', a: '平台每个板块保留 6 个主推位，由你从平台内容库挑内容锁定。你引流来的客户浏览平台该板块时，会优先看到你锁定的内容，其余位置照常走平台推荐。你不需要、也不能装修页面。' },
  { q: '租赁费是否支持自动减免或退还？', a: '当前在线开通与续费按服务端订单金额收取，自动减免和原路退还能力尚未开放，不作为本次支付条件；后续如上线，平台会另行公示规则。' },
  { q: '需要单独注册账号吗？', a: '无需单独注册，沿用你的平台账号即可开通，无分站装修、无独立页面、无独立账号。' },
  { q: '佣金什么时候结算？', a: '归属客户消费后，按平台约定比例结算佣金。佣金仅基于真实交易结算，收益取决于你的实际推广，平台不作任何收益承诺。' },
]

async function loadExistingStation() {
  if (!getToken()) return
  try {
    const station = await apiGet<ExistingStation>('/station/my')
    existingStation.value = station
    stationName.value = station.name
    stationCode.value = station.code
  } catch (e) {
    const msg = (e as Error)?.message || ''
    if (!msg.includes('还没有开通') && !msg.includes('未找到') && !msg.includes('不存在')) throw e
    existingStation.value = null
  }
}

async function fetchData() {
  try {
    stationPlan.value = await operatorApi.getStationPricing()
    await loadExistingStation()
    // 运营商邀请链接统一使用 op=<Operator.id>；兼容旧 inviteCode/code 参数。
    const pages = getCurrentPages()
    const cur: any = pages[pages.length - 1]
    const code = cur?.options?.op || cur?.options?.inviteCode || cur?.options?.code || ''
    if (!existingStation.value && code) {
      inviteCode.value = String(code)
      await verifyInvite()
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function retry() {
  loading.value = true
  error.value = ''
  await fetchData()
}

onMounted(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
    navHeight.value = (info.statusBarHeight || 20) + 44
  } catch (e) { /* 降级默认值 */ }
  fetchData()
})

// 公开端点只返回品牌名与剩余名额，不暴露运营商身份信息。
async function verifyInvite(): Promise<boolean> {
  const code = inviteCode.value.trim()
  if (!code) { operatorName.value = ''; return true }
  try {
    const result = await apiGet<{ operatorId: string; operatorName: string; availableQuota: number }>(
      `/station/operator-invite/${encodeURIComponent(code)}`,
    )
    operatorName.value = result.operatorName
    return true
  } catch (e) {
    operatorName.value = ''
    uni.showToast({ title: (e as Error)?.message || '运营商邀请码无效', icon: 'none' })
    return false
  }
}

function toggleFaq(i: number) {
  expandedFaq.value = expandedFaq.value === i ? null : i
}

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => navigateTo('/pages/index/index') })
}

function openAgreement() {
  navigateTo('/pkg-operator/agreement-station/index')
}

/**
 * 申请 + 999 付费开通：先建 PENDING 分站拿 id，再下 STATION_MASTER 订单发起 Native 扫码支付。
 * 付款后后端 processStationMasterPaid 把该分站 PENDING→ACTIVE（付款即激活·无需管理员审核）。
 * 金额由服务端读 CommissionConfig.station_master_price 定价，前端不参与计费（防篡改）。
 */
async function handleOpen() {
  if (submitting.value) return
  if (renewalBlocked.value) {
    uni.showToast({ title: '分站已被平台停用，请先联系平台客服', icon: 'none' })
    return
  }

  const wasExisting = !!existingStation.value
  const name = stationName.value.trim()
  const code = stationCode.value.trim()
  if (!wasExisting && !name) { uni.showToast({ title: '请填写分站名称', icon: 'none' }); return }
  if (!wasExisting && !code) { uni.showToast({ title: '请填写专属推广码', icon: 'none' }); return }
  if (!wasExisting && inviteCode.value.trim() && !(await verifyInvite())) return

  submitting.value = true
  paymentPurpose.value = wasExisting && existingStation.value?.status !== 'PENDING' ? 'renew' : 'open'
  try {
    let station = existingStation.value
    if (!station) {
      station = await apiPost<ExistingStation>('/station/apply', {
        name,
        code,
        ...(inviteCode.value.trim() ? { operatorId: inviteCode.value.trim() } : {}),
      })
      if (!station?.id) throw new Error('分站创建失败')
      // 申请一旦落库，即使支付渠道暂时不可用，下次点击也直接为同一分站续付，不再重复申请。
      existingStation.value = station
    }

    const order = await shopApi.createOrder({
      type: 'STATION_MASTER',
      targetId: station.id,
      quantity: 1,
    })
    if (!order.id) throw new Error('订单创建失败')

    const pay = await shopApi.payOrderNative(order.id)
    if (pay.codeUrl) {
      payPending.value = { orderId: order.id, codeUrl: pay.codeUrl, amount: order.amount }
      qrReady.value = false
      await nextTick()
      renderPayQr()
      startPolling(order.id)
    } else {
      payUnavailable.value = true
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '支付发起失败，请稍后重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function renderPayQr() {
  const value = payPending.value?.codeUrl
  if (!value) return
  try {
    const ctx = uni.createCanvasContext('stationPayQr', instance)
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
      if (st.paid) {
        onPaid()
        return
      }
    } catch {
      // 单次查询失败不中断轮询
    }
    if (pollCount.value >= POLL_MAX) {
      uni.showToast({ title: '未检测到支付结果，可稍后在订单记录中查看', icon: 'none' })
      payPending.value = null
      return
    }
    pollTimer = setTimeout(tick, 3000)
  }
  pollTimer = setTimeout(tick, 3000)
}

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

/**
 * 支付成功：后端支付后处理器已把分站 PENDING→ACTIVE，此处仅提示 + 跳站长预览自己的分站。
 */
function onPaid() {
  stopPolling()
  payPending.value = null
  uni.showToast({ title: paymentPurpose.value === 'renew' ? '分站续费成功' : '分站开通成功', icon: 'success' })
  setTimeout(() => navigateTo('/pkg-operator/station-home/index'), 1200)
}

function formatDate(value: string) {
  return String(value).replace('T', ' ').slice(0, 10)
}

function copyCodeUrl() {
  if (!payPending.value) return
  uni.setClipboardData({
    data: payPending.value.codeUrl,
    success: () => uni.showToast({ title: '已复制', icon: 'none' }),
  })
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

/** 取消只关弹层、停轮询；订单保留在订单记录中可继续支付（不擅自取消订单） */
function cancelPay() {
  stopPolling()
  payPending.value = null
}

onUnmounted(() => stopPolling())
</script>

<style scoped>
/* ===== token ===== */
.js-page { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }
.serif { font-family: 'Songti SC', 'STSong', serif; }
.js-b { color: #2C2C2C; font-weight: 600; }

/* ===== 自定义导航 ===== */
.js-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #FAF8F5; }
.js-nav-bar { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 38rpx; }
.js-nav-back { width: 88rpx; height: 88rpx; display: flex; align-items: center; justify-content: flex-start; margin-left: -20rpx; }
.js-nav-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.js-nav-holder { width: 88rpx; height: 88rpx; }

.js-scroll { flex: 1; }

/* ===== Hero ===== */
.js-hero { text-align: center; padding: 40rpx 38rpx 46rpx; display: flex; flex-direction: column; align-items: center; }
.js-hero-badge { width: 124rpx; height: 124rpx; border-radius: 35rpx; margin-bottom: 30rpx; background: linear-gradient(135deg, #C41E3A, #A01828); display: flex; align-items: center; justify-content: center; box-shadow: 0 2rpx 20rpx rgba(196,30,58,0.32); }
.js-hero-title { font-size: 50rpx; font-weight: 700; color: #2C2C2C; }
.js-hero-sub { font-size: 25rpx; color: #6E6E73; margin-top: 19rpx; line-height: 1.7; }

/* ===== 邀请归属横幅 ===== */
.js-invite { margin: 0 38rpx 8rpx; background: linear-gradient(135deg, rgba(201,169,110,0.16), rgba(201,169,110,0.06)); border: 1rpx solid rgba(201,169,110,0.4); border-radius: 27rpx; padding: 25rpx 29rpx; display: flex; align-items: center; gap: 23rpx; }
.js-invite-av { width: 77rpx; height: 77rpx; border-radius: 999rpx; flex-shrink: 0; background: linear-gradient(135deg, #C9A96E, #B8935A); display: flex; align-items: center; justify-content: center; }
.js-invite-av-text { color: #fff; font-weight: 600; font-size: 30rpx; }
.js-invite-info { flex: 1; min-width: 0; }
.js-invite-n { font-size: 27rpx; font-weight: 600; color: #2C2C2C; }
.js-invite-s { display: block; font-size: 21rpx; color: #6E6E73; margin-top: 6rpx; }
.js-invite-badge { flex-shrink: 0; background: rgba(46,139,87,0.12); border-radius: 13rpx; padding: 6rpx 15rpx; }
.js-invite-badge-text { font-size: 19rpx; color: #2E8B57; }

/* ===== 区块标题 ===== */
.js-sec-title { display: block; font-size: 31rpx; font-weight: 600; color: #2C2C2C; padding: 27rpx 38rpx 23rpx; }

/* ===== 费用卡 ===== */
.js-fee { margin: 0 38rpx; background: #FFFFFF; border: 4rpx solid #C9A96E; border-radius: 35rpx; padding: 42rpx 38rpx; position: relative; box-shadow: 0 2rpx 20rpx rgba(201,169,110,0.14); }
.js-fee-tag { position: absolute; top: 0; right: 42rpx; background: #C9A96E; border-radius: 0 0 17rpx 17rpx; padding: 8rpx 23rpx; }
.js-fee-tag-text { font-size: 21rpx; font-weight: 600; color: #fff; }
.js-fee-name { font-size: 27rpx; font-weight: 600; color: #6E6E73; }
.js-fee-price { display: flex; align-items: baseline; margin-top: 15rpx; }
.js-fee-price-yuan { font-size: 35rpx; font-weight: 700; color: #C41E3A; }
.js-fee-price-num { font-size: 73rpx; font-weight: 700; color: #C41E3A; line-height: 1; }
.js-fee-price-unit { font-size: 29rpx; color: #9A9A9A; font-weight: 500; }
.js-fee-nolimit { display: block; font-size: 23rpx; color: #9A9A9A; margin-top: 15rpx; }
.js-fee-div { height: 1rpx; background: #EFEBE4; margin: 35rpx 0; }
.js-rule-title { display: block; font-size: 25rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 23rpx; }
.js-rule { display: flex; gap: 21rpx; align-items: flex-start; margin-top: 21rpx; }
.js-rule-ic { width: 54rpx; height: 54rpx; border-radius: 17rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.js-rule-ic.waive { background: rgba(46,139,87,0.12); }
.js-rule-ic.refund { background: rgba(196,30,58,0.1); }
.js-rule-ic-text { font-size: 25rpx; font-weight: 600; }
.js-rule-ic.waive .js-rule-ic-text { color: #2E8B57; }
.js-rule-ic.refund .js-rule-ic-text { color: #C41E3A; }
.js-rule-tx { flex: 1; font-size: 24rpx; color: #6E6E73; line-height: 1.7; }

/* ===== 权益步骤 ===== */
.js-steps { padding: 0 38rpx; display: flex; flex-direction: column; gap: 19rpx; }
.js-step { background: #FFFFFF; border: 1rpx solid #EFEBE4; border-radius: 27rpx; padding: 27rpx 31rpx; display: flex; gap: 25rpx; align-items: flex-start; }
.js-step-ic { width: 73rpx; height: 73rpx; border-radius: 21rpx; background: rgba(196,30,58,0.08); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.js-step-body { flex: 1; }
.js-step-n { font-size: 27rpx; font-weight: 600; color: #2C2C2C; }
.js-step-d { display: block; font-size: 23rpx; color: #6E6E73; margin-top: 8rpx; line-height: 1.6; }

/* ===== 风险提示 ===== */
.js-risk { margin: 31rpx 38rpx 0; background: #FCF3E4; border-left: 6rpx solid #DDA149; border-radius: 23rpx; padding: 31rpx; }
.js-risk-t { display: flex; align-items: center; gap: 12rpx; margin-bottom: 19rpx; }
.js-risk-t-text { font-size: 25rpx; font-weight: 700; color: #9A6E24; }
.js-risk-i { display: flex; gap: 15rpx; margin-top: 12rpx; align-items: flex-start; }
.js-risk-dot { width: 10rpx; height: 10rpx; border-radius: 999rpx; background: #DDA149; flex-shrink: 0; margin-top: 13rpx; }
.js-risk-i-text { flex: 1; font-size: 23rpx; color: #8a6a30; line-height: 1.7; }

/* ===== 当前分站（续付/续费） ===== */
.js-current-station { margin: 0 38rpx; padding: 31rpx; border: 1rpx solid #E8DFD3; border-radius: 27rpx; background: #FFFFFF; }
.js-current-head { display: flex; align-items: center; gap: 20rpx; }
.js-current-icon { width: 72rpx; height: 72rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 20rpx; background: rgba(196,30,58,0.08); }
.js-current-main { flex: 1; min-width: 0; }
.js-current-name { display: block; overflow: hidden; color: #2C2C2C; font-size: 28rpx; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.js-current-code { display: block; margin-top: 7rpx; color: #8A8178; font-size: 21rpx; }
.js-current-status { flex-shrink: 0; padding: 7rpx 16rpx; border-radius: 999rpx; background: #FBEFF0; color: #C41E3A; font-size: 21rpx; }
.js-current-note { display: block; margin-top: 24rpx; padding-top: 22rpx; border-top: 1rpx solid #EFEBE4; color: #6E6E73; font-size: 23rpx; line-height: 1.65; }
.js-current-expire { display: block; margin-top: 12rpx; color: #9A6E24; font-size: 22rpx; }

/* ===== 邀请码输入 ===== */
.js-invite-input-card { margin: 0 38rpx; background: #FFFFFF; border: 1rpx solid #EFEBE4; border-radius: 27rpx; padding: 31rpx; }
.js-invite-input { height: 88rpx; background: rgba(138,129,120,0.06); border-radius: 17rpx; padding: 0 27rpx; font-size: 26rpx; color: #2C2C2C; }
.js-invite-input-gap { margin-top: 19rpx; }
.js-invite-ph { color: #9A9A9A; }
.js-invite-input-note { display: block; font-size: 21rpx; color: #9A9A9A; margin-top: 19rpx; line-height: 1.6; }

/* ===== FAQ ===== */
.js-faqs { padding: 0 38rpx; display: flex; flex-direction: column; gap: 17rpx; }
.js-faq { background: #FFFFFF; border: 1rpx solid #EFEBE4; border-radius: 27rpx; padding: 29rpx 31rpx; }
.js-faq-q { display: flex; align-items: center; justify-content: space-between; gap: 19rpx; min-height: 44rpx; }
.js-faq-qt { font-size: 27rpx; font-weight: 500; color: #2C2C2C; flex: 1; }
.js-faq-ar { flex-shrink: 0; transition: transform 0.2s; }
.js-faq-ar.open { transform: rotate(90deg); }
.js-faq-a { margin-top: 19rpx; }
.js-faq-a-text { font-size: 24rpx; color: #6E6E73; line-height: 1.75; }

.js-bottom-pad { height: 60rpx; }

/* ===== 底部 CTA ===== */
.js-cta { background: #FFFFFF; border-top: 1rpx solid #EFEBE4; padding: 27rpx 38rpx calc(46rpx + env(safe-area-inset-bottom)); }
.js-cta-price { display: block; font-size: 23rpx; color: #6E6E73; text-align: center; margin-bottom: 12rpx; }
.js-cta-price-b { color: #C41E3A; font-size: 31rpx; font-weight: 700; }
.js-cta-hint { display: block; font-size: 21rpx; color: #9A9A9A; text-align: center; margin-bottom: 21rpx; }
.js-cta-hint-link { color: #C41E3A; }
.js-cta-btn { height: 96rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; box-shadow: 0 2rpx 20rpx rgba(196,30,58,0.3); }
.js-cta-btn-disabled { opacity: 0.55; }
.js-cta-btn-text { font-size: 31rpx; font-weight: 600; color: #fff; }

/* ===== 加载与错误态 ===== */
.state-loading { flex: 1; display: flex; align-items: center; justify-content: center; }
.state-loading-text { font-size: 28rpx; color: #6E6E73; }
.state-error { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 48rpx; }
.state-error-text { font-size: 28rpx; color: #C41E3A; text-align: center; }
.state-retry-btn { padding: 16rpx 48rpx; background: #C41E3A; border-radius: 999rpx; }
.state-retry-btn text { font-size: 28rpx; color: #fff; }

/* ===== 支付弹层（待支付扫码 / 渠道未就绪·范式同 join-operator） ===== */
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
.pay-poll { margin-top: 23rpx; font-size: 21rpx; color: #9A9A9A; text-align: center; line-height: 1.6; }
.pay-cancel { margin-top: 20rpx; font-size: 25rpx; color: #9A9A9A; }
</style>
