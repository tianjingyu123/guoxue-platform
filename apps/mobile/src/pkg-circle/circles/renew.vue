<script setup lang="ts">
/**
 * 续费圈子 — V0 circle-renew.html 还原·降级版（2026-07-10 新建）
 * 结构：到期提醒卡 → 续费方案（单档） → 续费规则 → 到期后将暂停 → 保留说明 → 吸底续费栏。
 * 数据：circleDetailApi.detail + getJoinStatus（到期时间）+ renewPrepare/renewConfirm（现金订单双段）。
 * 董事长拍板 2026-07-10：续费与入圈一样只能人民币（微信/支付宝）——建 CIRCLE_RENEW 订单→拉起聚合支付→确认顺延。
 * #33 年度报告：GET annual-report 真实聚合 →「你的这一年」卡（有数据才渲染·失败不渲染）。
 * #34 老成员折扣：GET renew/quote 真实报价 → 折扣开启时原价划线+折后价（默认关闭无任何变化·不硬编码折扣文案）。
 * TODO(#34)：两年档 years=2 后端已支持（quote.twoYear），档位选择 UI 待做。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { formatPrice } from '@/utils/format'
import { circleDetailApi, type CircleDetail, type RenewQuote, type CircleAnnualReport } from '@/lib/circle-detail-data'
import { purchaseApi, type PayChannel } from '@/lib/purchase-data'

const circleId = ref('')
const circle = ref<CircleDetail | null>(null)
const expireAt = ref<string | null>(null)
const joined = ref(false)
const isLoading = ref(true)
const error = ref('')
const submitting = ref(false)
const renewed = ref(false)

const remainingDays = computed(() => {
  if (!expireAt.value) return 0
  const t = new Date(expireAt.value).getTime()
  if (Number.isNaN(t)) return 0
  return Math.ceil((t - Date.now()) / 86400000)
})
const expired = computed(() => !!expireAt.value && remainingDays.value <= 0)

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}
/** 续费后新到期日（未过期从原到期日顺延，已过期从今天起算·与后端口径一致） */
const newExpireDate = computed(() => {
  const base = expireAt.value && !expired.value ? new Date(expireAt.value) : new Date()
  return fmtDate(new Date(base.getTime() + 365 * 86400000).toISOString())
})

// ── #34 续费报价（折扣关闭时 priceYuan===originalPriceYuan → 页面零变化） ──
const quote = ref<RenewQuote | null>(null)
/** 实际应付价（有报价用报价·失败回落圈子标价） */
const payPrice = computed(() => quote.value?.priceYuan ?? Number(circle.value?.price ?? 0))
/** 折扣露出条件：报价存在且折后价 < 原价（读后端真实价，不硬编码折扣文案） */
const hasDiscount = computed(() => !!quote.value && quote.value.priceYuan < quote.value.originalPriceYuan)
/** 折扣标签（由真实价格反推，如 292/365 → 8折） */
const discountTag = computed(() => {
  if (!hasDiscount.value || !quote.value) return ''
  const z = (quote.value.priceYuan / quote.value.originalPriceYuan) * 10
  const txt = (Math.round(z * 10) / 10).toString().replace(/\.0$/, '')
  return `老成员 ${txt} 折`
})

// ── #33 年度报告（真实聚合·有数据才渲染） ──
const report = ref<CircleAnnualReport | null>(null)
const showReport = computed(() => {
  const r = report.value
  if (!r) return false
  return (r.posts || 0) + (r.questions || 0) + (r.liveCount || 0) + (r.likesReceived || 0) > 0 || r.earningsRmb !== undefined
})

async function loadData() {
  isLoading.value = true
  error.value = ''
  try {
    const [c, st] = await Promise.all([
      circleDetailApi.detail(circleId.value),
      circleDetailApi.getJoinStatus(circleId.value),
    ])
    circle.value = c
    expireAt.value = st.expireAt
    joined.value = st.joined || st.expired
    // 增值信息并行拉取（各自失败静默：报价回落标价·报告卡不渲染）
    circleDetailApi.renewQuote(circleId.value).then((q) => { quote.value = q })
    circleDetailApi.annualReport(circleId.value).then((r) => { report.value = r })
  } catch {
    error.value = '加载失败，请重试'
  } finally {
    isLoading.value = false
  }
}

/** 支付方式（拍板：续费只能人民币·微信/支付宝） */
const payMethod = ref<'wechat' | 'alipay'>('wechat')
const PAY_METHODS = [
  { id: 'wechat' as const, name: '微信支付', badge: '微', color: '#07C160' },
  { id: 'alipay' as const, name: '支付宝', badge: '支', color: '#1677FF' },
]

async function doRenew() {
  if (submitting.value || !circle.value) return
  submitting.value = true
  try {
    // ① 创建现金续费订单
    const prep = await circleDetailApi.renewPrepare(circleId.value, payMethod.value === 'alipay' ? 'ALIPAY' : 'WECHAT')
    const orderId = prep?.orderId
    if (!orderId) throw new Error(prep?.message || '下单失败，请重试')
    // ② 拉起聚合支付（无支付环境时静默失败，订单可在订单中心继续支付）
    try {
      const pay = await purchaseApi.payByChannel(orderId, payMethod.value as PayChannel)
      const jumpUrl = pay?.h5Url || pay?.payUrl
      // #ifdef H5
      if (jumpUrl) { window.location.href = jumpUrl; return }
      // #endif
    } catch { /* 无支付环境，止于下单 */ }
    // ③ 尝试确认续费（已支付则顺延；未支付提示去订单中心）
    try {
      const r = await circleDetailApi.renewConfirm(circleId.value, orderId)
      if (r?.newExpireAt) expireAt.value = r.newExpireAt
      renewed.value = true
      uni.showToast({ title: '续费成功，有效期已顺延一年', icon: 'none' })
    } catch {
      uni.showToast({ title: '订单已提交，支付完成后有效期自动顺延', icon: 'none' })
    }
  } catch (e) {
    const x = e as { message?: string; data?: { message?: string } }
    uni.showToast({ title: x?.message || x?.data?.message || '续费失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onLoad((q) => {
  circleId.value = (q?.id || q?.circleId || '') as string
  loadData()
})
</script>

<template>
  <view class="rn-page">
    <!-- 顶栏 -->
    <view class="rn-topbar">
      <view class="rn-back" @tap="goBack"><app-icon name="chevron-left" :size="32" color="#2C2C2C" /></view>
      <text class="rn-title">续费圈子</text>
    </view>

    <!-- 骨架 -->
    <view v-if="isLoading" class="rn-state">
      <view class="rn-skel" /><view class="rn-skel tall" />
    </view>
    <!-- 错误态 -->
    <view v-else-if="error || !circle" class="rn-state center">
      <text class="rn-state-t">{{ error || '加载失败' }}</text>
      <view class="rn-retry" @tap="loadData"><text class="rn-retry-t">重试</text></view>
    </view>
    <!-- 非年费圈 / 未加入：无需续费 -->
    <view v-else-if="circle.type !== 'YEARLY' || !joined" class="rn-state center">
      <view class="rn-empty-icon"><app-icon name="check-circle" :size="52" color="#5B8A5E" /></view>
      <text class="rn-empty-title">{{ circle.type !== 'YEARLY' ? '该圈子无需续费' : '你还不是该圈子成员' }}</text>
      <text class="rn-state-t">{{ circle.type !== 'YEARLY' ? '仅年费制圈子需要按年续费' : '加入圈子后才能续费' }}</text>
    </view>

    <template v-else>
      <!-- 到期提醒卡 -->
      <view class="rn-expire-card">
        <view class="rn-expire-icon"><app-icon name="clock" :size="38" color="#C41E3A" /></view>
        <view class="rn-expire-main">
          <text class="rn-expire-title">
            「{{ circle.name }}」会员<template v-if="expired">已过期</template><template v-else>还有 <text class="rn-expire-b">{{ remainingDays }} 天</text>到期</template>
          </text>
          <text class="rn-expire-sub">{{ fmtDate(expireAt) }}到期 · 到期前续费有效期顺延</text>
        </view>
      </view>

      <!-- #33 你的这一年（真实聚合·有数据才渲染·V0 report-card） -->
      <template v-if="showReport && report">
        <text class="rn-label">你的这一年</text>
        <view class="rn-report-card">
          <view class="rn-report-head">
            <app-icon name="bar-chart-3" :size="30" color="#C9A96E" />
            <view class="rn-report-head-main">
              <text class="rn-report-title">在圈子里的一年</text>
              <text class="rn-report-sub">数据由系统自动统计生成 · 入圈 {{ report.joinedDays }} 天</text>
            </view>
          </view>
          <view class="rn-report-grid">
            <view class="rn-report-item">
              <text class="rn-report-num">{{ report.posts }}<text class="rn-report-unit">篇</text></text>
              <text class="rn-report-label">发布的帖子</text>
            </view>
            <view class="rn-report-item">
              <text class="rn-report-num">{{ report.questions }}<text class="rn-report-unit">次</text></text>
              <text class="rn-report-label">向达人提问</text>
            </view>
            <view class="rn-report-item">
              <text class="rn-report-num">{{ report.liveCount }}<text class="rn-report-unit">场</text></text>
              <text class="rn-report-label">参与的直播</text>
            </view>
            <view class="rn-report-item">
              <text class="rn-report-num">{{ report.likesReceived }}<text class="rn-report-unit">赞</text></text>
              <text class="rn-report-label">获得的点赞</text>
            </view>
            <view v-if="report.earningsRmb !== undefined" class="rn-report-item wide">
              <text class="rn-report-num">+{{ formatPrice(report.earningsRmb) }}<text class="rn-report-unit">元</text></text>
              <text class="rn-report-label">在圈内获得的分成收益</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 续费方案（#34：折扣开启时原价划线+折后价·两年档 UI TODO） -->
      <text class="rn-label">续费方案{{ hasDiscount ? ' · 老成员专享' : '' }}</text>
      <view class="rn-plan-card">
        <view class="rn-plan-option">
          <view class="rn-radio"><view class="rn-radio-dot" /></view>
          <view class="rn-plan-main">
            <view class="rn-plan-name-row">
              <text class="rn-plan-name">续费一年</text>
              <view v-if="hasDiscount" class="rn-plan-tag"><text class="rn-plan-tag-t">{{ discountTag }}</text></view>
            </view>
            <text class="rn-plan-desc">有效期顺延至 {{ newExpireDate }}</text>
          </view>
          <view class="rn-plan-price">
            <text class="rn-plan-now">¥{{ formatPrice(payPrice) }}<text class="rn-plan-unit"> /年</text></text>
            <text v-if="hasDiscount && quote" class="rn-plan-was">原价 ¥{{ formatPrice(quote.originalPriceYuan) }}</text>
          </view>
        </view>
      </view>
      <!-- 支付方式（拍板：续费只能人民币） -->
      <text class="rn-label">支付方式</text>
      <view class="rn-plan-card">
        <view
          v-for="m in PAY_METHODS" :key="m.id"
          class="rn-pay-row" @tap="payMethod = m.id"
        >
          <view class="rn-pay-badge" :style="{ background: m.color }"><text class="rn-pay-badge-t">{{ m.badge }}</text></view>
          <text class="rn-pay-name">{{ m.name }}</text>
          <view class="rn-radio" :class="{ off: payMethod !== m.id }">
            <view v-if="payMethod === m.id" class="rn-radio-dot" />
          </view>
        </view>
      </view>
      <text class="rn-rule-note">续费以<text class="rn-rule-b">人民币</text>支付（微信/支付宝）；到期前续费有效期顺延，<text class="rn-rule-b">不损失剩余天数</text>；新周期按相同退款规则保障。</text>

      <!-- 到期后将暂停 -->
      <text class="rn-label">到期后将暂停</text>
      <view class="rn-lose-card">
        <view class="rn-lose-row">
          <app-icon name="lock" :size="28" color="#999999" />
          <text class="rn-lose-t">圈内帖子、长文与往期问答的查看权限</text>
        </view>
        <view class="rn-lose-row">
          <app-icon name="star" :size="28" color="#999999" />
          <text class="rn-lose-t">向圈内达人提问与围观的成员价</text>
        </view>
        <view class="rn-lose-row">
          <app-icon name="video" :size="28" color="#999999" />
          <text class="rn-lose-t">直播答疑参与与回放观看</text>
        </view>
      </view>
      <text class="rn-keep">你发布过的内容与获得的收益<text class="rn-rule-b">永久保留</text>，重新加入后自动恢复。</text>

      <!-- 吸底续费栏（#34：展示后端真实应付价·折扣态附原价划线） -->
      <view class="rn-bar">
        <view class="rn-bar-price">
          <text class="rn-bar-num">¥{{ formatPrice(payPrice) }}</text>
          <text class="rn-bar-unit"> /年</text>
          <text v-if="hasDiscount && quote" class="rn-bar-was">¥{{ formatPrice(quote.originalPriceYuan) }}</text>
        </view>
        <view class="rn-bar-btn" :class="{ disabled: submitting || renewed }" @tap="doRenew">
          <text class="rn-bar-btn-t">{{ submitting ? '处理中…' : renewed ? '已续费' : '立即续费' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.rn-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 216rpx; }

/* 顶栏 */
.rn-topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.88); backdrop-filter: blur(24rpx);
}
.rn-back {
  width: 64rpx; height: 64rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.rn-title { font-size: 34rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); }

/* 三态 */
.rn-state { padding: 24rpx 32rpx; }
.rn-state.center { padding: 180rpx 80rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.rn-skel { height: 160rpx; border-radius: 36rpx; background: #fff; margin-bottom: 24rpx; }
.rn-skel.tall { height: 300rpx; }
.rn-state-t { font-size: 28rpx; color: var(--text-tertiary, #999); text-align: center; line-height: 1.6; }
.rn-retry { margin-top: 12rpx; padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.rn-retry-t { font-size: 26rpx; color: #fff; }
.rn-empty-icon {
  width: 128rpx; height: 128rpx; border-radius: 40rpx;
  background: rgba(91, 138, 94, 0.1);
  display: flex; align-items: center; justify-content: center;
}
.rn-empty-title { font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); margin-top: 20rpx; }

/* 到期提醒卡 */
.rn-expire-card {
  margin: 16rpx 32rpx 0; padding: 32rpx 36rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  display: flex; align-items: center; gap: 28rpx;
}
.rn-expire-icon {
  width: 88rpx; height: 88rpx; border-radius: 999rpx; flex-shrink: 0;
  background: var(--brand-soft, rgba(196, 30, 58, 0.08));
  display: flex; align-items: center; justify-content: center;
}
.rn-expire-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rn-expire-title { font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); line-height: 1.5; }
.rn-expire-b { color: var(--brand, #c41e3a); font-weight: 700; }
.rn-expire-sub { font-size: 24rpx; color: var(--text-tertiary, #999); margin-top: 4rpx; }

/* 分区标题 */
.rn-label { display: block; margin: 44rpx 40rpx 16rpx; font-size: 26rpx; color: var(--text-tertiary, #999); }

/* #33 年度报告卡（V0 report-card·米金渐变+金描边） */
.rn-report-card {
  margin: 0 32rpx; padding: 30rpx 32rpx;
  background: linear-gradient(135deg, #fdfbf7, #f8f2e7);
  border: 1rpx solid #e8dcc4; border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.rn-report-head { display: flex; align-items: center; gap: 18rpx; }
.rn-report-head-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rn-report-title { font-size: 29rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); }
.rn-report-sub { font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; }
.rn-report-grid { display: flex; flex-wrap: wrap; gap: 20rpx; margin-top: 26rpx; }
.rn-report-item {
  width: calc(50% - 10rpx); box-sizing: border-box;
  padding: 20rpx 24rpx; border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.72);
  display: flex; flex-direction: column;
}
.rn-report-item.wide { width: 100%; }
.rn-report-num { font-size: 40rpx; font-weight: 700; color: var(--gold, #c9a96e); font-variant-numeric: tabular-nums; }
.rn-report-unit { font-size: 22rpx; font-weight: 400; color: var(--text-tertiary, #999); margin-left: 4rpx; }
.rn-report-label { font-size: 23rpx; color: var(--text-secondary, #6e6e73); margin-top: 4rpx; }

/* 续费方案 */
.rn-plan-card {
  margin: 0 32rpx; background: var(--bg-card, #fff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.rn-plan-option { display: flex; align-items: center; gap: 24rpx; padding: 30rpx 32rpx; }
.rn-radio {
  width: 40rpx; height: 40rpx; border-radius: 999rpx; flex-shrink: 0;
  border: 3rpx solid var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.rn-radio.off { border-color: var(--separator, #ede7dd); }
.rn-radio-dot { width: 20rpx; height: 20rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }

/* 支付方式 */
.rn-pay-row { display: flex; align-items: center; gap: 22rpx; padding: 26rpx 32rpx; }
.rn-pay-row + .rn-pay-row { border-top: 1rpx solid var(--separator, #ede7dd); }
.rn-pay-badge {
  width: 56rpx; height: 56rpx; border-radius: 16rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.rn-pay-badge-t { font-size: 26rpx; font-weight: 700; color: #fff; }
.rn-pay-name { flex: 1; font-size: 28rpx; color: var(--text-primary, #2c2c2c); }
.rn-plan-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rn-plan-name-row { display: flex; align-items: center; gap: 12rpx; }
.rn-plan-name { font-size: 30rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
/* #34 折扣标签（由后端真实价反推折数·非硬编码文案） */
.rn-plan-tag {
  height: 34rpx; padding: 0 12rpx; border-radius: 10rpx;
  background: var(--brand-soft, rgba(196, 30, 58, 0.08));
  display: inline-flex; align-items: center;
}
.rn-plan-tag-t { font-size: 20rpx; font-weight: 600; color: var(--brand, #c41e3a); }
.rn-plan-was { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); text-decoration: line-through; margin-top: 2rpx; text-align: right; }
.rn-plan-desc { font-size: 23rpx; color: var(--text-tertiary, #999); margin-top: 4rpx; }
.rn-plan-price { flex-shrink: 0; }
.rn-plan-now { font-size: 34rpx; font-weight: 700; color: var(--gold, #c9a96e); }
.rn-plan-unit { font-size: 22rpx; font-weight: 400; color: var(--text-tertiary, #999); }
.rn-rule-note { display: block; margin: 20rpx 44rpx 0; font-size: 22rpx; color: var(--text-tertiary, #999); line-height: 1.75; }
.rn-rule-b { color: var(--text-secondary, #6e6e73); font-weight: 600; }

/* 到期后将暂停 */
.rn-lose-card {
  margin: 0 32rpx; background: var(--bg-card, #fff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  padding: 8rpx 0;
}
.rn-lose-row { display: flex; align-items: center; gap: 20rpx; padding: 22rpx 32rpx; }
.rn-lose-row + .rn-lose-row { border-top: 1rpx solid var(--separator, #ede7dd); }
.rn-lose-t { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.rn-keep { display: block; margin: 20rpx 44rpx 0; font-size: 22rpx; color: var(--text-tertiary, #999); line-height: 1.7; }

/* 吸底续费栏 */
.rn-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
  padding: 24rpx 40rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-top: 1rpx solid var(--separator, #ede7dd);
  display: flex; align-items: center; justify-content: space-between; gap: 24rpx;
}
.rn-bar-price { display: flex; align-items: baseline; }
.rn-bar-num { font-size: 40rpx; font-weight: 700; color: var(--gold, #c9a96e); }
.rn-bar-unit { font-size: 24rpx; color: var(--text-tertiary, #999); }
.rn-bar-was { font-size: 24rpx; color: var(--text-tertiary, #999); text-decoration: line-through; margin-left: 12rpx; }
.rn-bar-btn {
  height: 88rpx; padding: 0 68rpx; border-radius: 44rpx;
  background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.rn-bar-btn.disabled { opacity: 0.6; }
.rn-bar-btn:active { opacity: 0.88; }
.rn-bar-btn-t { font-size: 30rpx; font-weight: 600; letter-spacing: 2rpx; color: #fff; }
</style>
