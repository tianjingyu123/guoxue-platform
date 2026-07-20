<script setup lang="ts">
/**
 * 从业者会员购买页（对应 V0 workspace-purchase.tsx）
 *
 * 独立于书院会员（月19/季49/年168，权益是电子书/积分/AI 伴读）——那是 C 端读者的；
 * 这是 B 端执业工具的，两者互不影响，用户可以同时是两者。
 *
 * 价格不写死：后端 CommissionConfig(practitioner_pro_monthly).rateA 是真源，
 * 改价改后台就行，前端不用发版。
 *
 * 支付链路照抄书院会员页（pkg-profile/vip）：创建订单 → 微信 Native 扫码 → 轮询订单状态。
 * 渠道未就绪就诚实降级，不假装成功。
 */
import { getCurrentInstance, nextTick, ref, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import { shopApi } from '@/lib/shop-data'
import { drawQrToCanvas } from '@/utils/qrcode'
import { wsApi, type ProStatus } from '../lib/workspace-api'

const instance = getCurrentInstance()?.proxy
const QR_PX = 176
const loading = ref(true)
const pro = ref<ProStatus | null>(null)
const purchasing = ref(false)
const payPending = ref<{ orderId: string; codeUrl: string; amount: number } | null>(null)
const payFailure = ref('')
const payOrderKept = ref(false)
const qrReady = ref(false)
const POLL_MAX = 40
const pollCount = ref(0)
let pollTimer: ReturnType<typeof setTimeout> | null = null

/** 会员权益（对应后端的分级闸门，别在这里写后端没实现的承诺） */
const PERKS = [
  { icon: 'scroll-text', title: '报告不限份数', desc: '免费版最多存 3 份；会员想写多少写多少' },
  { icon: 'share-2', title: '只读链接交付客户', desc: '生成专属链接，客户无需登录即可查看报告' },
  { icon: 'crown', title: '品牌落款', desc: '报告署你的工作室名号与印章，是你的作品' },
]

/** 免费本来就能用的（别让老师以为不买就什么都干不了） */
const FREE = ['全部 24 个排盘工具', '客户档案与回访提醒', '收入账本（平台 + 线下手记）', '案例库沉淀', '报告草稿 3 份']

onLoad(load)
onUnmounted(stopPolling)

async function load() {
  loading.value = true
  try {
    pro.value = await wsApi.pro()
  } catch {
    pro.value = null
  } finally {
    loading.value = false
  }
}

async function purchase() {
  if (purchasing.value) return
  purchasing.value = true
  payFailure.value = ''
  payOrderKept.value = false
  try {
    // 服务端按 CommissionConfig 真价计费，前端传的任何金额都无效（防篡改）
    const order = await shopApi.createOrder({ type: 'PRACTITIONER_PRO', targetId: 'practitioner_pro_monthly', quantity: 1 })
    if (!order.id) throw new Error('订单创建失败')
    payOrderKept.value = true
    const pay = await shopApi.payOrderNative(order.id)
    if (!pay.codeUrl) throw new Error('微信支付未返回付款二维码，请稍后重试')
    payPending.value = { orderId: order.id, codeUrl: pay.codeUrl, amount: order.amount }
    qrReady.value = false
    await nextTick()
    renderPayQr()
    startPolling(order.id)
  } catch (e) {
    payFailure.value = (e as Error)?.message || '支付发起失败，请稍后重试'
  } finally {
    purchasing.value = false
  }
}

function renderPayQr() {
  const value = payPending.value?.codeUrl
  if (!value) return
  try {
    const ctx = uni.createCanvasContext('practitionerPayQr', instance)
    const ok = drawQrToCanvas(ctx, value, 8, 8, QR_PX - 16, {})
    ctx.draw(false, () => { qrReady.value = ok })
  } catch {
    qrReady.value = false
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
        payPending.value = null
        uni.showToast({ title: '已开通', icon: 'success' })
        await load()
        return
      }
    } catch {
      /* 单次查询失败不中断轮询 */
    }
    if (pollCount.value >= POLL_MAX) {
      uni.showToast({ title: '未检测到支付结果，可稍后在订单中查看', icon: 'none' })
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

function copyCode() {
  if (!payPending.value) return
  uni.setClipboardData({
    data: payPending.value.codeUrl,
    success: () => uni.showToast({ title: '支付链接已复制', icon: 'none' }),
  })
}

function openWechatPay() {
  if (!payPending.value) return
  // #ifdef H5
  window.location.href = payPending.value.codeUrl
  // #endif
  // #ifndef H5
  copyCode()
  // #endif
}

function dateText(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <view class="pro">
    <ToolHeader title="从业者会员" subtitle="排盘 · 出报告 · 管客户" />

    <scroll-view class="pro-body" scroll-y :show-scrollbar="false">
      <!-- 状态 / 价格 -->
      <PaperCard gold padding="lg">
        <view class="pro-hero">
          <view class="pro-crown">
            <AppIcon name="crown" :size="28" color="#fff" />
          </view>
          <view class="pro-hero-info">
            <text class="pro-hero-title">从业者会员</text>
            <text class="pro-hero-sub">专为传统文化 / 命理文化研究从业者打造</text>
          </view>
        </view>

        <view v-if="loading" class="pro-price-skeleton" />
        <template v-else-if="pro?.isPro">
          <view class="pro-active">
            <AppIcon name="check-circle" :size="18" color="#2D7A4E" />
            <text class="pro-active-txt">已开通 · 剩 {{ pro.daysLeft }} 天（{{ dateText(pro.expireAt) }} 到期）</text>
          </view>
          <view class="pro-btn pro-btn--ghost" @tap="purchase">
            <text class="pro-btn-txt pro-btn-txt--ghost">
              {{ purchasing ? '处理中…' : `续费 ¥${pro.price}/${pro.period}` }}
            </text>
          </view>
          <text class="pro-renew-tip">续费从当前到期日往后叠加，不吞剩余天数</text>
        </template>
        <template v-else-if="pro">
          <view class="pro-price">
            <text class="pro-price-symbol">¥</text>
            <text class="pro-price-num">{{ pro.price }}</text>
            <text class="pro-price-unit">/ {{ pro.period }}</text>
          </view>
          <view class="pro-btn pro-btn--primary" @tap="purchase">
            <text class="pro-btn-txt pro-btn-txt--primary">{{ purchasing ? '处理中…' : '立即开通' }}</text>
          </view>
        </template>
        <view v-else class="pro-failed" @tap="load">
          <text class="pro-failed-txt">价格加载失败，点击重试</text>
        </view>
      </PaperCard>

      <!-- 会员解锁什么 -->
      <PaperCard padding="lg">
        <text class="pro-sec-title">会员解锁</text>
        <view class="pro-perks">
          <view v-for="p in PERKS" :key="p.title" class="pro-perk">
            <view class="pro-perk-icon">
              <AppIcon :name="p.icon" :size="20" color="#C41E3A" />
            </view>
            <view class="pro-perk-info">
              <text class="pro-perk-title">{{ p.title }}</text>
              <text class="pro-perk-desc">{{ p.desc }}</text>
            </view>
          </view>
        </view>
      </PaperCard>

      <!-- 免费本来就能用 -->
      <PaperCard padding="lg">
        <text class="pro-sec-title">不开通也能用</text>
        <text class="pro-sec-sub">工作台对所有人开放，这些一直免费</text>
        <view class="pro-free">
          <view v-for="f in FREE" :key="f" class="pro-free-item">
            <AppIcon name="check" :size="14" color="#2D7A4E" />
            <text class="pro-free-txt">{{ f }}</text>
          </view>
        </view>
      </PaperCard>

      <!-- 与书院会员的区别（不说清楚会有人买重） -->
      <PaperCard padding="lg">
        <text class="pro-sec-title">和「书院会员」有什么区别</text>
        <view class="pro-diff">
          <text class="pro-diff-txt">
            <text class="pro-diff-b">书院会员</text>是读者的：电子书畅读、AI 伴读、积分与优惠券。
          </text>
          <text class="pro-diff-txt">
            <text class="pro-diff-b">从业者会员</text>是老师的：报告交付、品牌落款、执业工具。
          </text>
          <text class="pro-diff-txt pro-diff-txt--muted">两者互不影响，可以同时开通，也可以只开一个。</text>
        </view>
      </PaperCard>

      <view class="pro-space" />
    </scroll-view>

    <!-- 扫码支付 -->
    <view v-if="payPending" class="pro-mask" @tap="payPending = null; stopPolling()">
      <view class="pro-sheet" @tap.stop>
        <text class="pro-sheet-title">请使用微信扫码支付</text>
        <text class="pro-sheet-amount">¥{{ payPending.amount }}</text>
        <text class="pro-sheet-tip">请使用微信扫描二维码完成支付</text>
        <view class="pro-qr-wrap">
          <canvas id="practitionerPayQr" canvas-id="practitionerPayQr" class="pro-qr" />
          <text v-if="!qrReady" class="pro-qr-loading">二维码生成中…</text>
        </view>
        <view class="pro-btn pro-btn--ghost" @tap="openWechatPay">
          <text class="pro-btn-txt pro-btn-txt--ghost">在微信中打开</text>
        </view>
        <text class="pro-copy" @tap="copyCode">无法打开？复制支付链接</text>
        <text class="pro-poll">正在等待支付结果（{{ pollCount }}/{{ POLL_MAX }}），支付成功后自动开通</text>
      </view>
    </view>

    <!-- 支付失败：展示真实错误；只有订单确实建成时才提示已保留 -->
    <view v-if="payFailure" class="pro-mask" @tap="payFailure = ''">
      <view class="pro-modal" @tap.stop>
        <text class="pro-modal-title">支付未发起</text>
        <text class="pro-modal-desc">{{ payFailure }}</text>
        <text v-if="payOrderKept" class="pro-order-tip">订单已安全保留，可稍后重新发起支付；系统不会把未付款订单当作已开通。</text>
        <view class="pro-btn pro-btn--primary" @tap="payFailure = ''">
          <text class="pro-btn-txt pro-btn-txt--primary">知道了</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.pro {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F7F3EC;
}

.pro-body {
  flex: 1;
  min-height: 0;
  padding: 24rpx;
  box-sizing: border-box;
}

.pro-body > * {
  margin-bottom: 24rpx;
}

/* Hero */
.pro-hero {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.pro-crown {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  flex-shrink: 0;
  border-radius: 20rpx;
  background: #C41E3A;
}

.pro-hero-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.pro-hero-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #9A8C7E;
}

.pro-price {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
  margin-top: 32rpx;
}

.pro-price-symbol {
  font-size: 32rpx;
  font-weight: 700;
  color: #C41E3A;
}

.pro-price-num {
  font-size: 72rpx;
  font-weight: 700;
  color: #C41E3A;
  line-height: 1;
}

.pro-price-unit {
  font-size: 26rpx;
  color: #9A8C7E;
}

.pro-price-skeleton {
  height: 100rpx;
  margin-top: 32rpx;
  border-radius: 12rpx;
  background: rgba(154, 140, 126, 0.1);
}

.pro-active {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 28rpx;
  padding: 20rpx;
  border-radius: 12rpx;
  background: rgba(45, 122, 78, 0.08);
}

.pro-active-txt {
  font-size: 24rpx;
  color: #2D7A4E;
}

.pro-renew-tip {
  display: block;
  margin-top: 12rpx;
  font-size: 21rpx;
  color: #B8AA9A;
  text-align: center;
}

.pro-failed {
  padding: 32rpx;
  text-align: center;
}

.pro-failed-txt {
  font-size: 24rpx;
  color: #C41E3A;
}

/* 权益 */
.pro-sec-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.pro-sec-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.pro-perks {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 28rpx;
}

.pro-perk {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.pro-perk-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  border-radius: 16rpx;
  background: rgba(196, 30, 58, 0.08);
}

.pro-perk-info {
  flex: 1;
  min-width: 0;
}

.pro-perk-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.pro-perk-desc {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: #9A8C7E;
}

/* 免费 */
.pro-free {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 24rpx;
}

.pro-free-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.pro-free-txt {
  font-size: 25rpx;
  color: #3A2A1E;
}

/* 区别 */
.pro-diff {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-top: 24rpx;
}

.pro-diff-txt {
  font-size: 25rpx;
  line-height: 1.7;
  color: #3A2A1E;
}

.pro-diff-b {
  font-weight: 700;
  color: #C41E3A;
}

.pro-diff-txt--muted {
  color: #9A8C7E;
  font-size: 22rpx;
}

/* 按钮 */
.pro-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96rpx;
  margin-top: 28rpx;
  border-radius: 48rpx;
}

.pro-btn--primary {
  background: #C41E3A;
}

.pro-btn--ghost {
  border: 1rpx solid rgba(196, 30, 58, 0.4);
}

.pro-btn-txt {
  font-size: 30rpx;
  font-weight: 600;
}

.pro-btn-txt--primary {
  color: #fff;
}

.pro-btn-txt--ghost {
  color: #C41E3A;
}

.pro-space {
  height: 40rpx;
}

/* 弹层 */
.pro-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}

.pro-sheet,
.pro-modal {
  width: 100%;
  padding: 40rpx;
  border-radius: 24rpx;
  background: #FDFAF4;
  box-sizing: border-box;
}

.pro-sheet-title,
.pro-modal-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #3A2A1E;
  text-align: center;
}

.pro-sheet-amount {
  display: block;
  margin-top: 16rpx;
  font-size: 48rpx;
  font-weight: 700;
  color: #C41E3A;
  text-align: center;
}

.pro-sheet-tip,
.pro-modal-desc {
  display: block;
  margin-top: 20rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #7A6C5E;
}

.pro-qr-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 352rpx;
  height: 352rpx;
  margin: 24rpx auto 0;
  border-radius: 20rpx;
  background: #fff;
  overflow: hidden;
}

.pro-qr { width: 352rpx; height: 352rpx; }
.pro-qr-loading { position: absolute; font-size: 22rpx; color: #9A8C7E; }
.pro-copy { display: block; margin-top: 18rpx; text-align: center; font-size: 22rpx; color: #9A8C7E; }
.pro-order-tip { display: block; margin-top: 14rpx; font-size: 22rpx; line-height: 1.6; color: #9A8C7E; }

.pro-poll {
  display: block;
  margin-top: 20rpx;
  font-size: 21rpx;
  color: #B8AA9A;
  text-align: center;
}
</style>
