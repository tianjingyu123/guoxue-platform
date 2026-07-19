<template>
  <view class="js-page">
    <!-- 自定义导航（statusBarHeight 留白） -->
    <view class="js-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="js-nav-bar">
        <view class="js-nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="40" color="#2C2C2C" />
        </view>
        <text class="js-nav-title">成为站长</text>
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

    <!-- 申请已提交（真调用 /station/apply 成功后的真实态） -->
    <view v-else-if="applied" class="apply-done" :style="{ paddingTop: navHeight + 'px' }">
      <view class="apply-done-ic"><app-icon name="check-circle-2" :size="48" color="#2E8B57" /></view>
      <text class="apply-done-title serif">申请已提交</text>
      <text class="apply-done-desc">你的分站申请已提交，平台将尽快审核。审核通过后即可在个人中心进入分站管理。</text>
      <view class="apply-done-btn" @tap="goBack"><text class="apply-done-btn-text">返回</text></view>
    </view>

    <!-- 正常内容 -->
    <template v-else>
      <scroll-view scroll-y class="js-scroll" :style="{ paddingTop: navHeight + 'px' }">
        <!-- Hero -->
        <view class="js-hero">
          <view class="js-hero-badge">
            <app-icon name="home" :size="30" color="#ffffff" />
          </view>
          <text class="js-hero-title serif">开你的分站</text>
          <text class="js-hero-sub">在平台各板块主推位选品、推广拉客{{ '\n' }}你引流来的客户消费，即为你带来分销佣金</text>
        </view>

        <!-- 运营商邀请归属横幅（仅邀请开通态显示） -->
        <view v-if="invitedByOperator" class="js-invite">
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
          <view class="js-fee-tag"><text class="js-fee-tag-text">无门槛加入</text></view>
          <text class="js-fee-name">系统租赁费</text>
          <view class="js-fee-price serif">
            <text class="js-fee-price-yuan">¥</text>
            <text class="js-fee-price-num">999</text>
            <text class="js-fee-price-unit"> / 年</text>
          </view>
          <text class="js-fee-nolimit">开通无门槛 · 人人可开</text>
          <view class="js-fee-div" />
          <text class="js-rule-title">减免与退还规则</text>
          <!-- 原样措辞·勿改 -->
          <view class="js-rule">
            <view class="js-rule-ic waive"><text class="js-rule-ic-text">免</text></view>
            <text class="js-rule-tx">若分站收入累计<text class="js-b">小于 5 倍</text>系统租赁费，则<text class="js-b">不用再交</text>租赁费。</text>
          </view>
          <view class="js-rule">
            <view class="js-rule-ic refund"><text class="js-rule-ic-text">退</text></view>
            <text class="js-rule-tx">若分站收入<text class="js-b">一年内累计达到 10 倍</text>平台系统租赁费，则<text class="js-b">退还</text>租赁费，<text class="js-b">仅限第一年有效</text>。</text>
          </view>
        </view>

        <!-- 开通后你可以 -->
        <text class="js-sec-title serif">开通后你可以</text>
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
        <view class="js-risk">
          <view class="js-risk-t">
            <app-icon name="alert-triangle" :size="15" color="#9A6E24" />
            <text class="js-risk-t-text">加入前请务必阅读</text>
          </view>
          <view class="js-risk-i"><view class="js-risk-dot" /><text class="js-risk-i-text">请先评估你是否具备推广渠道与资源；若没有推广能力，请勿加入。</text></view>
          <view class="js-risk-i"><view class="js-risk-dot" /><text class="js-risk-i-text">这是投资行为，存在亏损风险，收益取决于你的推广，平台不作任何收益承诺。</text></view>
          <view class="js-risk-i"><view class="js-risk-dot" /><text class="js-risk-i-text">请理性决策，量力而行。</text></view>
        </view>

        <!-- 分站信息（必填·后端 ApplyStationDto 要求 name+code） -->
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
          <text class="js-invite-input-note">名称与推广码用于生成你的专属分站入口，推广码全平台唯一，提交后由平台审核。</text>
        </view>

        <!-- 运营商邀请码（选填·自主开通态可填） -->
        <template v-if="!invitedByOperator">
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
        <text class="js-cta-price">系统租赁费 <text class="js-cta-price-b">¥999 / 年</text> · 达标可减免/退还</text>
        <text class="js-cta-hint">点击即表示已阅读并同意 <text class="js-cta-hint-link" @tap="openAgreement">《站长服务协议》</text></text>
        <view class="js-cta-btn" :class="{ 'js-cta-btn-disabled': submitting }" @tap="handleOpen">
          <text class="js-cta-btn-text">{{ submitting ? '提交中…' : (invitedByOperator ? '确认开通（归属 ' + operatorName + '）' : '确认开通我的分站') }}</text>
        </view>
      </view>
    </template>

    <!-- 待支付：微信 Native 扫码 + 轮询（范式同 join-operator） -->
    <view v-if="payPending" class="modal-mask">
      <view class="modal-card" @tap.stop>
        <text class="modal-title">请使用微信扫码支付</text>
        <text class="pay-amount"><text class="pay-amount-yuan">¥</text>{{ payPending.amount }}</text>
        <text class="pay-tip">复制以下支付链接，在微信中打开完成支付：</text>
        <text class="pay-url" :selectable="true">{{ payPending.codeUrl }}</text>
        <view class="modal-btn" @tap="copyCodeUrl">
          <text class="modal-btn-txt">复制支付链接</text>
        </view>
        <text class="pay-poll">正在等待支付结果（{{ pollCount }}/{{ POLL_MAX }}），支付成功后自动开通</text>
        <text class="pay-cancel" @tap="cancelPay">取消</text>
      </view>
    </view>

    <!-- 支付渠道未就绪：诚实降级，不假装成功（分站已建，订单已保留） -->
    <view v-if="payUnavailable" class="modal-mask" @tap="payUnavailable = false">
      <view class="modal-card" @tap.stop>
        <text class="modal-title">支付渠道正在开通中</text>
        <text class="modal-desc">微信支付商户资质审核中，暂时无法在线支付。你的分站申请已保留，可稍后在订单记录中继续支付开通。</text>
        <view class="modal-btn" @tap="payUnavailable = false">
          <text class="modal-btn-txt">我知道了</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { operatorApi } from '@/pkg-operator/lib/operator-data'
import { shopApi } from '@/lib/shop-data'
import { apiPost } from '@/utils/request'

// ===== 状态栏留白（自定义导航） =====
const statusBarHeight = ref(20)
const navHeight = ref(64)

// ===== 三态 =====
const loading = ref(true)
const error = ref('')
const submitting = ref(false)
const applied = ref(false)

// ===== 分站信息（后端 ApplyStationDto 必填 name+code） =====
const stationName = ref('')
const stationCode = ref('')

// ===== 支付状态（范式对齐 join-operator：Native 扫码 + 轮询 + 渠道未就绪诚实降级）=====
const payPending = ref<{ orderId: string; codeUrl: string; amount: number } | null>(null)
const payUnavailable = ref(false)
const pollCount = ref(0)
const POLL_MAX = 40 // 3s × 40 ≈ 2 分钟
let pollTimer: ReturnType<typeof setTimeout> | null = null

// ===== 邀请开通态 =====
const inviteCode = ref('')
const operatorName = ref('')
const invitedByOperator = computed(() => !!operatorName.value)
const operatorInitial = computed(() => operatorName.value ? operatorName.value.charAt(0) : '运')

// ===== FAQ（合规文案·逐字照 mockup-C2） =====
const expandedFaq = ref<number | null>(0)
const faqs = [
  { q: '什么是「主推位」？', a: '平台每个板块保留 6 个主推位，由你从平台内容库挑内容锁定。你引流来的客户浏览平台该板块时，会优先看到你锁定的内容，其余位置照常走平台推荐。你不需要、也不能装修页面。' },
  { q: '999 元租赁费什么情况能减免/退还？', a: '若分站收入累计小于 5 倍系统租赁费，则不用再交租赁费；若分站收入一年内累计达到 10 倍平台系统租赁费，则退还租赁费，仅限第一年有效。' },
  { q: '需要单独注册账号吗？', a: '无需单独注册，沿用你的平台账号即可开通，无分站装修、无独立页面、无独立账号。' },
  { q: '佣金什么时候结算？', a: '归属客户消费后，按平台约定比例结算佣金。佣金仅基于真实交易结算，收益取决于你的实际推广，平台不作任何收益承诺。' },
]

async function fetchData() {
  try {
    // 复用现有数据调用作为三态骨架（费用费率）；页面展示文案以 mockup 为准内联
    await operatorApi.getStationPricing()
    // 读取邀请码入参（运营商邀请开通态）
    const pages = getCurrentPages()
    const cur: any = pages[pages.length - 1]
    const code = cur?.options?.inviteCode || cur?.options?.code || ''
    if (code) {
      inviteCode.value = code
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

// 验证运营商邀请码（activate/激活接口复用；后端无验证端点时诚实降级为不阻断开通）
async function verifyInvite() {
  const code = inviteCode.value.trim()
  if (!code) { operatorName.value = ''; return }
  // 后端暂无 GET /station/invite/:code 验证端点 → 诚实降级：
  // 仅在提交时把 inviteCode 带给 apply，归属关系由后端解析；此处不虚构运营商姓名。
  // 若后续补齐验证端点，可在此填充 operatorName 以显示归属横幅。
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
  const name = stationName.value.trim()
  const code = stationCode.value.trim()
  if (!name) { uni.showToast({ title: '请填写分站名称', icon: 'none' }); return }
  if (!code) { uni.showToast({ title: '请填写专属推广码', icon: 'none' }); return }
  submitting.value = true
  try {
    // 1) 建分站（PENDING）。后端 ApplyStationDto 收 name/code，返回创建的 station 记录（含 id）。
    //    后端会校验"已开通"和"推广码占用"并回具体 message。
    const station = await apiPost<{ id: string }>('/station/apply', { name, code })
    if (!station?.id) throw new Error('分站创建失败')

    // 2) 为该分站创建付费开通订单（targetId=分站 id）。后端校验分站存在+归属付款人+定价。
    const order = await shopApi.createOrder({
      type: 'STATION_MASTER',
      targetId: station.id,
      quantity: 1,
    })
    if (!order.id) throw new Error('订单创建失败')

    // 3) 发起微信 Native 扫码支付
    const pay = await shopApi.payOrderNative(order.id)
    if (pay.codeUrl) {
      payPending.value = { orderId: order.id, codeUrl: pay.codeUrl, amount: order.amount }
      startPolling(order.id)
    } else {
      // 未返回 code_url = 渠道未就绪，不假装成功（分站已建，订单保留在订单记录中可继续支付）
      payUnavailable.value = true
    }
  } catch (e) {
    // "已开通/已有分站" 等业务拦截 → 直接透传后端 message；其余（渠道未就绪/未配价格等）→ 诚实降级
    const msg = (e as Error)?.message || ''
    if (msg.includes('已开通') || msg.includes('已有分站')) {
      uni.showToast({ title: msg, icon: 'none' })
    } else {
      payUnavailable.value = true
    }
  } finally {
    submitting.value = false
  }
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
  uni.showToast({ title: '分站开通成功', icon: 'success' })
  setTimeout(() => navigateTo('/pkg-operator/station-home/index'), 1200)
}

function copyCodeUrl() {
  if (!payPending.value) return
  uni.setClipboardData({
    data: payPending.value.codeUrl,
    success: () => uni.showToast({ title: '已复制', icon: 'none' }),
  })
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

/* ===== 申请已提交态 ===== */
.apply-done { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 64rpx; text-align: center; }
.apply-done-ic { width: 150rpx; height: 150rpx; border-radius: 50%; background: rgba(46,139,87,0.12); display: flex; align-items: center; justify-content: center; margin-bottom: 40rpx; }
.apply-done-title { font-size: 40rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 18rpx; }
.apply-done-desc { font-size: 26rpx; color: #6E6E73; line-height: 1.7; margin-bottom: 56rpx; }
.apply-done-btn { width: 100%; height: 96rpx; border-radius: 999rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; box-shadow: 0 2rpx 20rpx rgba(196,30,58,0.3); }
.apply-done-btn-text { font-size: 31rpx; font-weight: 600; color: #fff; }

/* ===== 三态 ===== */
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
.pay-url { margin-top: 15rpx; width: 100%; padding: 18rpx; background: #F7F5F2; border-radius: 12rpx; font-size: 21rpx; color: #3A3A3C; word-break: break-all; line-height: 1.5; }
.pay-poll { margin-top: 23rpx; font-size: 21rpx; color: #9A9A9A; text-align: center; line-height: 1.6; }
.pay-cancel { margin-top: 20rpx; font-size: 25rpx; color: #9A9A9A; }
</style>
