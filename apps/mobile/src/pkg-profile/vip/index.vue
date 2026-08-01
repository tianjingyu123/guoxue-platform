<template>
  <view class="page">
    <!-- 顶部金色渐变背景 -->
    <view class="top-glow" />

    <!-- 顶部导航（透明） -->
    <app-nav-bar
      title="会员中心"
      :title-size="36"
      :bar-height="112"
      background="transparent"
      :no-border="true"
    >
      <template #right>
        <text class="nav-records" @tap="go('/vip/records')">购买记录</text>
      </template>
    </app-nav-bar>

    <!-- 骨架屏 -->
    <view v-if="loading" class="body">
      <app-skeleton width="100%" height="352rpx" radius="24rpx" />
      <view style="margin-top: 48rpx;">
        <app-skeleton width="160rpx" height="40rpx" radius="8rpx" mb="24rpx" />
        <view class="sk-grid">
          <app-skeleton v-for="i in 4" :key="i" width="100%" height="256rpx" radius="24rpx" />
        </view>
      </view>
    </view>

    <!-- 错误态 -->
    <app-error v-else-if="error" :message="error" @retry="loadData" />

    <!-- 正常内容 -->
    <view v-else-if="data" class="body">
      <!-- 会员卡片 -->
      <view class="vip-card">
        <view class="card-deco">
          <view class="deco-ring" />
        </view>
        <view class="card-inner">
          <view class="card-head">
            <view class="crown-circle">
              <app-icon name="crown" :size="64" color="#FFFFFF" />
            </view>
            <view class="card-head-text">
              <view class="card-title-row">
                <text class="card-title">{{ data.status.level !== 'none' ? memberLevelName : '书院会员' }}</text>
                <text v-if="data.status.level !== 'none'" class="card-badge">{{ memberLevelLabel(data.status.level) }}</text>
              </view>
              <text class="card-sub">
                {{ data.status.level !== 'none'
                  ? (data.status.isLifetime
                    ? '终身会员 · 永久有效'
                    : (data.status.isExpired
                      ? '会员已过期'
                      : `有效期至 ${data.status.expireAt}，还剩 ${data.status.daysLeft} 天`))
                  : '解锁全部特权，畅享国学智慧' }}
              </text>
            </view>
          </view>

          <!-- 核心数据（只列兑现得了的权益）
               🔴 2026-07-14 撤下「付费精品电子书·畅读」一栏：电子书板块 07-08 已整体下线，
               这条权益兑现不了，挂在付费页上就是虚假宣传。不虚构新权益顶替 —— 要补需董事长拍板。 -->
          <view class="card-stats">
            <view class="stat-col">
              <text class="stat-num">不限量</text>
              <text class="stat-label">AI 伴读·白话对照</text>
            </view>
            <view class="stat-col">
              <text class="stat-num">{{ selectedPlan?.monthlyPoints ?? 0 }}</text>
              <text class="stat-label">每月赠积分</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 等级选择 -->
      <view class="section">
        <text class="section-title">选择等级</text>
        <scroll-view scroll-x class="level-scroll" :show-scrollbar="false">
          <view class="level-row">
            <view
              v-for="group in data.planGroups"
              :key="group.level"
              class="level-btn"
              :class="selectedLevel === group.level ? ['level-active', `lvl-${group.level}`] : 'level-outline'"
              @tap="selectLevel(group.level)"
            >
              <text class="level-btn-txt" :class="{ 'level-btn-txt-active': selectedLevel === group.level }">{{ group.levelName }}</text>
            </view>
          </view>
        </scroll-view>
        <text v-if="currentPlanGroup" class="section-desc">{{ currentPlanGroup.description }}</text>
      </view>

      <!-- 套餐选择（真源 GET /member/plans·MemberConfig） -->
      <view class="section">
        <text class="section-title">选择套餐</text>
        <view class="plan-grid">
          <view
            v-for="plan in currentPlanGroup?.plans"
            :key="plan.id"
            class="plan-card"
            :class="selectedPlan?.id === plan.id ? 'plan-selected' : 'plan-normal'"
            @tap="selectedPlan = plan"
          >
            <view v-if="plan.popular" class="plan-tag tag-popular">主推</view>
            <view v-else-if="plan.autoRenew" class="plan-tag tag-auto">更划算</view>

            <text class="plan-duration">{{ plan.durationName }}</text>
            <view class="plan-price-row">
              <text class="plan-yuan">¥</text>
              <text class="plan-price">{{ formatPrice(plan.price) }}</text>
            </view>
            <text v-if="plan.dailyPrice" class="plan-daily">¥{{ formatPrice(plan.dailyPrice) }}/天</text>
            <text v-else class="plan-daily">一次开通 永久有效</text>

            <view v-if="selectedPlan?.id === plan.id" class="plan-check">
              <app-icon name="check" :size="24" color="#FFFFFF" />
            </view>
          </view>
        </view>
        <!-- 连续包年说明（诚实降级：代扣能力开通前=到期提醒按续费价续费） -->
        <text v-if="selectedPlan?.autoRenew" class="auto-renew-note">
          连续包年：首年 ¥{{ formatPrice(selectedPlan.price) }} 开通；自动扣费能力开通前，到期我们会提醒你以 ¥{{ formatPrice(selectedPlan.price) }} 优惠价续费，不会不经确认扣款。
        </text>
      </view>

      <!-- 会员权益（真源 MemberConfig.benefits） -->
      <view v-if="displayBenefits.length" class="section">
        <text class="section-title">会员专属权益</text>
        <view class="benefit-grid">
          <view v-for="benefit in displayBenefits" :key="benefit.id" class="benefit-card">
            <view class="benefit-icon">
              <app-icon :name="benefit.icon" :size="40" color="#C9A96E" />
            </view>
            <view class="benefit-text">
              <text class="benefit-title">{{ benefit.title }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 权益对比 -->
      <view class="section">
        <view class="section-title-row">
          <app-icon name="trending-up" :size="32" color="#16A34A" />
          <text class="section-title">权益对比</text>
        </view>
        <membership-comparison @select-vip="showPaySheet = true" />
      </view>

      <!-- 常见问题 -->
      <view class="section">
        <text class="section-title">常见问题</text>
        <view class="faq-card">
          <view v-for="(faq, idx) in faqs" :key="idx" class="faq-item" :class="{ 'faq-divider': idx > 0 }">
            <text class="faq-q">{{ faq.q }}</text>
            <text class="faq-a">{{ faq.a }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部购买栏 -->
    <view v-if="data && selectedPlan" class="buy-bar">
      <view class="buy-bar-inner">
        <view class="buy-price-box">
          <view class="buy-price-row">
            <text class="buy-yuan">¥</text>
            <text class="buy-price">{{ formatPrice(selectedPlan.price) }}</text>
            <text class="buy-duration">/{{ selectedPlan.durationName }}</text>
          </view>
          <text class="buy-plan-name">{{ selectedPlan.name }}</text>
        </view>
        <view class="buy-btn" @tap="showPaySheet = true">
          <text class="buy-btn-txt">{{ isRenew ? '续费' : '立即开通' }}</text>
        </view>
      </view>
    </view>

    <!-- 支付方式选择 Sheet（V1：确认后创建订单跳统一收银页 /pkg-shop/paying，原 Native 扫码弹层已移除——
         手机端无从扫码属死路；收银页覆盖微信内 JSAPI/外部浏览器 mweb/小程序 requestPayment 全端） -->
    <view v-if="showPaySheet" class="sheet-mask" @tap="closePaySheet" @touchmove.self.prevent>
      <view class="sheet" @tap.stop @touchmove.stop>
        <view>
          <text class="sheet-title">选择支付方式</text>
          <view v-if="selectedPlan" class="sheet-summary">
            <text class="sheet-plan">{{ selectedPlan.name }} · {{ selectedPlan.durationName }}</text>
            <text class="sheet-amount"><text class="sheet-amount-yuan">¥</text>{{ formatPrice(selectedPlan.price) }}</text>
          </view>

          <view class="pay-list">
            <view
              v-for="m in payMethods"
              :key="m.key"
              class="pay-item"
            >
              <view class="pay-radio pay-radio-on">
                <view class="pay-radio-dot" />
              </view>
              <view class="pay-logo" :style="{ background: m.color }">
                <text class="pay-logo-txt">{{ m.short }}</text>
              </view>
              <text class="pay-name">{{ m.label }}</text>
            </view>
          </view>

          <!-- 会员服务协议勾选 -->
          <view class="agree-row">
            <view class="agree-check" :class="{ 'agree-check-on': agreementChecked }" @tap="agreementChecked = !agreementChecked">
              <app-icon v-if="agreementChecked" name="check" :size="22" color="#FFFFFF" />
            </view>
            <text class="agree-txt" @tap="agreementChecked = !agreementChecked">已阅读并同意</text>
            <text class="agree-link" @tap.stop="openAgreement">《会员服务协议》</text>
          </view>

          <view
            class="sheet-confirm"
            :class="{ disabled: purchasing || !agreementChecked }"
            @tap="handlePurchase"
          >
            <text class="sheet-confirm-txt">{{ purchasing ? '处理中...' : '确认支付' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 会员服务协议弹层（真源 GET /system/legal/member） -->
    <view v-if="showAgreement" class="sheet-mask agreement-mask" @tap="showAgreement = false" @touchmove.self.prevent>
      <view class="agreement-sheet" @tap.stop @touchmove.stop>
        <view class="agreement-head">
          <text class="agreement-title">{{ agreement?.title || '会员服务协议' }}</text>
          <text v-if="agreement?.version" class="agreement-version">版本 {{ agreement.version }}</text>
        </view>

        <!-- 协议加载中 -->
        <view v-if="agreementLoading" class="agreement-state">
          <text class="agreement-state-txt">协议加载中...</text>
        </view>
        <!-- 协议加载失败 → 重试 -->
        <view v-else-if="agreementError" class="agreement-state">
          <text class="agreement-state-txt">{{ agreementError }}</text>
          <view class="agreement-retry" @tap="loadAgreement">
            <text class="agreement-retry-txt">重试</text>
          </view>
        </view>
        <!-- 协议正文（滚动阅读） -->
        <scroll-view v-else scroll-y class="agreement-scroll">
          <text class="agreement-content">{{ agreement?.content }}</text>
        </scroll-view>

        <view
          class="sheet-confirm agreement-confirm"
          :class="{ disabled: agreementLoading || !!agreementError }"
          @tap="confirmAgreementRead"
        >
          <text class="sheet-confirm-txt">我已阅读</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppError from '@/components/common/app-error.vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import MembershipComparison from '@/components/marketing/membership-comparison.vue'
import { navigateTo } from '@/utils/router'
import { track } from '@/composables/useTrack'
import { vipApi, memberLevelLabel } from '@/lib/vip-data'
import type { VipPlan, VipMemberStatus, VipAgreement } from '@/lib/vip-data'
import { shopApi } from '@/lib/shop-data'
import { formatPrice } from '@/utils/format'

// —— 页面数据结构（planGroups 渲染骨架保持不变，数据真源为 GET /member/plans）——
interface VipPlanGroup { level: string; levelName: string; description: string; plans: VipPlan[] }
interface VipCenterData { status: VipMemberStatus; planGroups: VipPlanGroup[] }

// 正式收银入口只展示已经接通并完成验收的支付方式
interface PayMethodItem { key: 'wechat'; label: string; short: string; color: string }
const payMethods: PayMethodItem[] = [
  { key: 'wechat', label: '微信支付', short: '微', color: '#22C55E' },
]

// 常见问题（运营文案；V3：年费价从套餐真数据取，不再硬编码 ¥148——后台改价 FAQ 就变成假承诺）
const faqs = computed(() => {
  const plans = data.value?.planGroups[0]?.plans || []
  const yearly = plans.find(p => p.autoRenew) || plans.find(p => p.level === 'YEARLY')
  const renewText = yearly
    ? `自动扣费能力开通前不会自动扣款：到期前我们会提醒你，由你确认后以 ¥${formatPrice(yearly.price)} 优惠价续费。`
    : '自动扣费能力开通前不会自动扣款：到期前我们会提醒你，由你确认后以优惠价续费。'
  return [
    { q: '连续包年会自动扣款吗？', a: renewText },
    { q: '免费用户能用 AI 伴读吗？', a: '可以，每天有免费次数；开通书院会员后 AI 伴读与白话对照不限量。' },
    { q: '开通后可以退款吗？', a: '会员服务一经开通，暂不支持退款，请确认后购买。' },
    { q: '会员到期后权益还在吗？', a: '到期后会员权益将失效，已购买的内容不受影响。' },
  ]
})

// 权益卡图标轮换（纯展示层，权益文案来自后端 MemberConfig.benefits）
const BENEFIT_ICONS = ['crown', 'book-open', 'gift', 'zap', 'shield', 'shopping-bag', 'bot', 'star']

const data = ref<VipCenterData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const selectedLevel = ref('vip')
const selectedPlan = ref<VipPlan | null>(null)
const showPaySheet = ref(false)
const purchasing = ref(false)

// —— 会员协议 ——
const agreementChecked = ref(false)
const showAgreement = ref(false)
const agreement = ref<VipAgreement | null>(null)
const agreementLoading = ref(false)
const agreementError = ref<string | null>(null)

const currentPlanGroup = computed(() => data.value?.planGroups.find(g => g.level === selectedLevel.value))

// 当前会员等级对应的套餐名（会员卡片标题用；LIFETIME 已停售不在套餐列表，走档位名兜底）
const memberLevelName = computed(() => {
  const lv = data.value?.status.level
  if (!lv || lv === 'none') return '书院会员'
  const plan = data.value?.planGroups[0]?.plans.find(p => p.level === lv)
  return plan?.name || `书院会员·${memberLevelLabel(lv).replace('会员', '')}`
})

// 当前选中套餐的权益（后端 benefits 字符串数组 → 权益卡）
const displayBenefits = computed(() =>
  (selectedPlan.value?.benefits || []).map((title, i) => ({
    id: `b-${i}`,
    title,
    icon: BENEFIT_ICONS[i % BENEFIT_ICONS.length],
  })),
)

// 已是同档有效会员 → 按钮文案为「续费」（连续包年档对齐 YEARLY 身份）
const isRenew = computed(() => {
  const st = data.value?.status
  const planLevel = selectedPlan.value?.level === 'YEARLY_AUTO' ? 'YEARLY' : selectedPlan.value?.level
  return !!st && st.level !== 'none' && !st.isExpired && planLevel === st.level
})

// 加载套餐（必需）与会员状态（未登录/异常按无会员展示，不阻塞套餐）
async function loadData() {
  loading.value = true
  error.value = null
  try {
    const [plans, status] = await Promise.all([
      vipApi.getPlans(),
      vipApi.getStatus().catch((): VipMemberStatus => ({
        level: 'none', isExpired: false, isLifetime: false, expireAt: '', daysLeft: 0, autoRenew: false,
      })),
    ])
    if (!plans.length) {
      error.value = '会员套餐暂未配置，请稍后再来'
      data.value = null
      return
    }
    data.value = {
      status,
      planGroups: [{
        level: 'vip',
        levelName: '书院会员',
        description: 'AI 伴读不限量 · 每月赠积分与优惠券 · 专属标识与客服',
        plans,
      }],
    }
    selectedLevel.value = 'vip'
    selectedPlan.value = plans.find(p => p.popular) || plans[0] || null
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败，请重试'
    data.value = null
  } finally {
    loading.value = false
  }
}

function selectLevel(level: string) {
  selectedLevel.value = level
  const group = data.value?.planGroups.find(g => g.level === level)
  selectedPlan.value = group?.plans.find(p => p.popular) || group?.plans[0] || null
}

// —— 会员服务协议 ——
function openAgreement() {
  showAgreement.value = true
  if (!agreement.value && !agreementLoading.value) loadAgreement()
}

async function loadAgreement() {
  agreementLoading.value = true
  agreementError.value = null
  try {
    const doc = await vipApi.getAgreement()
    if (!doc) {
      agreementError.value = '协议文档暂未发布，请稍后重试'
      return
    }
    agreement.value = doc
  } catch {
    agreementError.value = '协议加载失败，请检查网络后重试'
  } finally {
    agreementLoading.value = false
  }
}

// 底部「我已阅读」→ 关闭协议弹层并自动勾选
function confirmAgreementRead() {
  if (agreementLoading.value || agreementError.value) return
  showAgreement.value = false
  agreementChecked.value = true
}

/**
 * V1 真实购买链路（2026-07-17 审计修复）：创建 MEMBER 订单 → 跳统一收银页 /pkg-shop/paying。
 * 原实现走 payOrderNative（Native 扫码协议）——手机上没有第二台设备扫码，就是死路；
 * 统一收银页对齐 purchase-sheet 范式，微信内公众号 JSAPI / 外部浏览器 mweb / 小程序 requestPayment
 * 全端可付，到账由支付回调驱动、收银页轮询订单状态并展示结果。
 * 扫码弹层整体移除（选择说明：本产品仅移动端 H5/小程序两种形态，无 PC 宽屏版；
 * 收银页已覆盖全部真实端型，保留扫码层只会再次成为无人可用的死 UI）。
 */
async function handlePurchase() {
  if (purchasing.value || !selectedPlan.value) return
  if (!agreementChecked.value) {
    uni.showToast({ title: '请先阅读并同意会员服务协议', icon: 'none' })
    return
  }
  // F2 会员漏斗埋点：支付点击（D-T1）
  track.custom('member_pay_click', { planId: selectedPlan.value.id, level: selectedPlan.value.level })
  purchasing.value = true
  try {
    // 创建会员订单（服务端按 MemberConfig 真价计费；amount 语义=数量，固定 1）
    const order = await shopApi.createOrder({
      type: 'MEMBER',
      targetId: selectedPlan.value.id,
      quantity: 1,
    })
    if (!order.id) throw new Error('订单创建失败')
    // 金额展示优先用订单真实应付额（服务端计价），异常时回退套餐标价
    const payAmount = Number(order.amount) || selectedPlan.value.price
    showPaySheet.value = false
    navigateTo(`/pkg-shop/paying?orderId=${order.id}&method=wechat&amount=${payAmount}`)
  } catch (e) {
    const msg = (e as Error)?.message || ''
    uni.showToast({ title: msg || '下单失败，请重试', icon: 'none' })
  } finally {
    purchasing.value = false
  }
}

function closePaySheet() {
  showPaySheet.value = false
}

function go(path: string) { navigateTo(path) }

onMounted(() => {
  // F2 会员漏斗埋点：会员页曝光（D-T1）
  track.custom('member_page_view')
  loadData()
})
// 支付跳收银页后返回本页 → 回刷会员状态：否则陈旧"开通会员"未购态诱导再点一次
// 而后端 MEMBER 下单不校验已有有效会员 → 二次建单二次扣款（首次 onShow 进页由标记跳过）
let vipFirstShow = true
onShow(() => {
  if (vipFirstShow) { vipFirstShow = false; return }
  loadData()
})
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #FAF8F5; padding-bottom: 192rpx; position: relative; }
.top-glow { position: absolute; top: 0; left: 0; right: 0; height: 640rpx; background: linear-gradient(180deg, rgba(201,169,110,0.2) 0%, rgba(201,169,110,0.1) 40%, transparent 100%); pointer-events: none; }
.nav-records { font-size: 28rpx; color: var(--brand); }

.body { position: relative; z-index: 1; padding: 0 32rpx; }
.sk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; }

/* 会员卡片 */
.vip-card { position: relative; overflow: hidden; border-radius: 24rpx; padding: 48rpx; background: linear-gradient(135deg in oklab, #C9A96E 0%, rgba(201,169,110,0.9) 50%, rgba(196,30,58,0.8) 100%); box-shadow: 0 20rpx 40rpx rgba(201,169,110,0.2); }
.card-deco { position: absolute; right: -80rpx; top: -80rpx; width: 320rpx; height: 320rpx; opacity: 0.1; }
.deco-ring { width: 100%; height: 100%; border: 4rpx solid #FFFFFF; border-radius: 50%; }
.card-inner { position: relative; z-index: 1; }
.card-head { display: flex; align-items: center; gap: 24rpx; margin-bottom: 32rpx; }
.crown-circle { width: 112rpx; height: 112rpx; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.card-head-text { flex: 1; min-width: 0; }
.card-title-row { display: flex; align-items: center; gap: 16rpx; }
.card-title { font-size: 40rpx; font-weight: 700; color: #FFFFFF; }
.card-badge { font-size: 22rpx; color: #FFFFFF; background: rgba(255,255,255,0.2); padding: 4rpx 16rpx; border-radius: 8rpx; }
.card-sub { font-size: 26rpx; color: rgba(255,255,255,0.7); margin-top: 8rpx; display: block; }

.card-stats { display: flex; padding-top: 32rpx; border-top: 2rpx solid rgba(255,255,255,0.2); }
.stat-col { flex: 1; text-align: center; }
.stat-num { font-size: 44rpx; font-weight: 700; color: #FFFFFF; display: block; }
.stat-label { font-size: 22rpx; color: rgba(255,255,255,0.7); margin-top: 4rpx; display: block; }

/* section */
.section { margin-top: 48rpx; }
.section-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.section-title-row { display: flex; align-items: center; gap: 16rpx; }
.section-desc { font-size: 26rpx; color: #8A8478; margin-top: 16rpx; display: block; }

/* 等级选择 */
.level-scroll { white-space: nowrap; margin-top: 24rpx; }
.level-row { display: inline-flex; gap: 16rpx; padding-bottom: 16rpx; }
.level-btn { flex-shrink: 0; height: 72rpx; padding: 0 32rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; white-space: nowrap; }
.level-outline { background: #FFFFFF; border: 2rpx solid #E8E3DB; }
.level-active.lvl-vip { background: linear-gradient(90deg in oklab, #C9A96E, var(--brand)); }
.level-btn-txt { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.level-btn-txt-active { color: #FFFFFF; }

/* 套餐选择（四档 2×2） */
.plan-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; margin-top: 24rpx; }
.auto-renew-note { font-size: 22rpx; color: #8A8478; line-height: 1.6; margin-top: 16rpx; display: block; }
.plan-card { position: relative; overflow: hidden; border-radius: 16rpx; padding: 24rpx 16rpx; background: #FFFFFF; }
.plan-normal { border: 2rpx solid #E8E3DB; }
.plan-selected { border: 4rpx solid #C9A96E; background: rgba(201,169,110,0.05); }
.plan-tag { position: absolute; top: 0; right: 0; padding: 4rpx 16rpx; font-size: 20rpx; font-weight: 500; border-bottom-left-radius: 16rpx; }
.tag-popular { background: #C9A96E; color: #FFFFFF; }
.tag-auto { background: rgba(22,163,74,0.9); color: #FFFFFF; }
.plan-duration { font-size: 28rpx; font-weight: 500; color: #2C2C2C; text-align: center; display: block; }
.plan-price-row { display: flex; align-items: baseline; justify-content: center; gap: 2rpx; margin-top: 16rpx; }
.plan-yuan { font-size: 22rpx; color: #8A8478; }
.plan-price { font-size: 48rpx; font-weight: 700; color: var(--brand); }
.plan-daily { font-size: 22rpx; color: #C9A96E; text-align: center; margin-top: 8rpx; display: block; }
.plan-check { position: absolute; top: 16rpx; left: 16rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: #C9A96E; display: flex; align-items: center; justify-content: center; }

/* 会员权益 */
.benefit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; margin-top: 24rpx; }
.benefit-card { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; border-radius: 16rpx; background: rgba(201,169,110,0.05); border: 2rpx solid rgba(201,169,110,0.3); }
.benefit-icon { width: 80rpx; height: 80rpx; border-radius: 16rpx; background: rgba(201,169,110,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.benefit-text { flex: 1; min-width: 0; }
.benefit-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; line-height: 1.4; }

/* FAQ */
.faq-card { background: #FFFFFF; border-radius: 16rpx; margin-top: 24rpx; }
.faq-item { padding: 24rpx; }
.faq-divider { border-top: 2rpx solid #E8E3DB; }
.faq-q { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.faq-a { font-size: 22rpx; color: #8A8478; margin-top: 8rpx; display: block; line-height: 1.5; }

/* 底部购买栏 */
.buy-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(250,248,245,0.95); backdrop-filter: blur(16rpx); border-top: 2rpx solid #E8E3DB; padding-bottom: env(safe-area-inset-bottom); z-index: 50; }
.buy-bar-inner { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; }
.buy-price-box { display: flex; flex-direction: column; }
.buy-price-row { display: flex; align-items: baseline; gap: 4rpx; }
.buy-yuan { font-size: 28rpx; color: #8A8478; }
.buy-price { font-size: 60rpx; font-weight: 700; color: var(--brand); }
.buy-duration { font-size: 28rpx; color: #8A8478; }
.buy-plan-name { font-size: 22rpx; color: #8A8478; }
.buy-btn { padding: 0 64rpx; height: 96rpx; border-radius: 999rpx; background: linear-gradient(90deg in oklab, #C9A96E, var(--brand)); display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 24rpx rgba(201,169,110,0.3); }
.buy-btn-txt { font-size: 30rpx; font-weight: 500; color: #FFFFFF; }

/* 支付 Sheet */
.sheet-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #FFFFFF; border-radius: 32rpx 32rpx 0 0; padding: 32rpx; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); }
.sheet-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; text-align: center; display: block; }
.sheet-summary { text-align: center; margin: 32rpx 0; padding-bottom: 32rpx; border-bottom: 2rpx solid #E8E3DB; }
.sheet-plan { font-size: 26rpx; color: #8A8478; display: block; }
.sheet-amount { font-size: 60rpx; font-weight: 700; color: var(--brand); margin-top: 8rpx; display: block; }
.sheet-amount-yuan { font-size: 32rpx; }
.pay-list { display: flex; flex-direction: column; gap: 24rpx; }
.pay-item { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; border: 2rpx solid #E8E3DB; border-radius: 16rpx; }
.pay-radio { width: 36rpx; height: 36rpx; border-radius: 50%; border: 2rpx solid #C9C4BB; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pay-radio-on { border-color: var(--brand); }
.pay-radio-dot { width: 20rpx; height: 20rpx; border-radius: 50%; background: var(--brand); }
.pay-logo { width: 64rpx; height: 64rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pay-logo-txt { font-size: 24rpx; font-weight: 700; color: #FFFFFF; }
.pay-name { font-size: 28rpx; color: #2C2C2C; flex: 1; }
.sheet-confirm { margin-top: 32rpx; height: 96rpx; border-radius: 16rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; }
.sheet-confirm.disabled { opacity: 0.5; }
.sheet-confirm-txt { font-size: 30rpx; font-weight: 500; color: #FFFFFF; }

/* 协议勾选行 */
.agree-row { display: flex; align-items: center; margin-top: 32rpx; }
.agree-check { width: 36rpx; height: 36rpx; border-radius: 50%; border: 2rpx solid #C9C4BB; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 12rpx; }
.agree-check-on { background: var(--brand); border-color: var(--brand); }
.agree-txt { font-size: 26rpx; color: #8A8478; }
.agree-link { font-size: 26rpx; color: var(--brand); }

/* 协议弹层 */
.agreement-mask { z-index: 300; }
.agreement-sheet { width: 100%; height: 78vh; background: #FFFFFF; border-radius: 32rpx 32rpx 0 0; padding: 32rpx; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); display: flex; flex-direction: column; }
.agreement-head { text-align: center; padding-bottom: 24rpx; border-bottom: 2rpx solid #E8E3DB; }
.agreement-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; display: block; }
.agreement-version { font-size: 22rpx; color: #8A8478; margin-top: 8rpx; display: block; }
.agreement-scroll { flex: 1; height: 0; min-height: 0; margin-top: 24rpx; }
.agreement-scroll :deep(.uni-scroll-view),
.agreement-scroll :deep(.uni-scroll-view-content) { overscroll-behavior: contain; }
.agreement-content { font-size: 26rpx; color: #4A4A4A; line-height: 1.8; white-space: pre-wrap; word-break: break-all; }
.agreement-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; }
.agreement-state-txt { font-size: 26rpx; color: #8A8478; }
.agreement-retry { padding: 12rpx 48rpx; border-radius: 999rpx; border: 2rpx solid var(--brand); }
.agreement-retry-txt { font-size: 26rpx; color: var(--brand); }
.agreement-confirm { flex-shrink: 0; }
</style>
