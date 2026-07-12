<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { operatorApi } from '@/lib/operator-data'

// —— 自定义导航：顶部状态栏留白 ——
const statusBarHeight = ref(0)

const loading = ref(true)
const error = ref('')
const agreed = ref(false)
const submitting = ref(false)
const expandedFaq = ref<number | null>(0)

// ★ 合规红线：文案逐字照 mockup-C1，不复用可能过时的营销常量。
// 单档 4999 = 1 自用 + 5 可售（名额不可加购）；团队管理奖 = 名下站长收入的 10%。
// 严禁承诺式/收益诱导宣传，风险提示三条必须存在。
const PRICE = 4999
const OWN_SLOTS = 1
const SELLABLE_SLOTS = 5

const heroNums = [
  { value: '¥4999', label: '唯一对外档位', gold: false },
  { value: '1+5', label: '分站（自用+可售）', gold: true },
  { value: '10%', label: '团队管理奖', gold: false },
]

// 运营商权益（去承诺·陈述功能）
const benefits = [
  { icon: 'building-2', name: '1+5 个分站', desc: '1 个自用分站 + 5 个可对外销售的分站名额' },
  { icon: 'award', name: '团队管理奖 10%', desc: '名下站长产生收入时，你获得其收入的 10% 作为团队管理奖' },
  { icon: 'bar-chart-3', name: '团队业绩看板', desc: '查看名下站长的收益、活跃度与转化情况' },
  { icon: 'bell', name: '沉寂预警 + 批量提醒', desc: '站长长时间无活动时预警，可批量发送提醒' },
]

// ★ 风险提示三条（替代承诺宣传·必须醒目）
const risks = [
  '请先评估你是否具备推广渠道与资源；若没有推广能力，请勿加入。',
  '这是投资行为，存在亏损风险，收益取决于你的团队与推广，平台不作任何收益承诺。',
  '请理性决策，量力而行。',
]

// 常见问题（照 mockup 原文）
const faqs = [
  {
    q: '运营商和站长有什么区别？',
    a: '运营商负责邀请与管理一支站长团队，从名下站长收入中获得 10% 团队管理奖；站长自己开分站、在主推位选品推广，获得分销佣金。',
  },
  {
    q: '团队管理奖 10% 怎么算？',
    a: '名下站长每产生一笔真实推广收入，你按其收入的 10% 获得团队管理奖，随其收入结算发放。',
  },
  {
    q: '1+5 个分站分别是什么？',
    a: '1 个自用分站（你本人运营），5 个可对外销售的分站名额（用于邀请新站长加入你的团队）。名额不可加购。',
  },
  {
    q: '需要单独注册账号吗？',
    a: '不需要。沿用平台统一账号，无独立登录与密码，开通后即以运营商身份使用。',
  },
]

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    // 复用现有数据调用以维持数据依赖与三态骨架；文案不采用其营销常量，一律以 mockup 内联为准
    await operatorApi.getOperatorPricing()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function retry() {
  fetchData()
}

onMounted(() => {
  try {
    statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
  } catch {
    statusBarHeight.value = 0
  }
  fetchData()
})

function toggleFaq(i: number) {
  expandedFaq.value = expandedFaq.value === i ? null : i
}

function goBack() {
  uni.navigateBack({ delta: 1 })
}

async function onSubmit() {
  if (submitting.value) return
  submitting.value = true
  try {
    // 沿用平台账号：确认开通 → 走支付/申请流程（后端 POST /operator/apply）
    uni.showToast({ title: '功能开发中', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="statusbar" :style="{ height: statusBarHeight + 'px' }" />
    <view class="nav">
      <view class="nav-back" @tap="goBack">
        <AppIcon name="chevron-left" :size="40" color="#2C2C2C" />
      </view>
      <text class="nav-title">成为运营商</text>
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

        <!-- 单档套餐（唯一对外档位）-->
        <text class="sec-title serif">开通档位</text>
        <view class="pkg">
          <view class="pkg-tag"><text class="pkg-tag-text">唯一对外档位</text></view>
          <text class="pkg-name">一级运营商</text>
          <view class="pkg-price serif">
            <text class="pkg-price-symbol">¥</text>
            <text class="pkg-price-num">{{ PRICE }}</text>
          </view>
          <text class="pkg-sub">一次性开通 · 获得 1+5 个分站</text>
          <view class="pkg-div" />
          <view class="slots">
            <view class="slot">
              <text class="slot-n">{{ OWN_SLOTS }}</text>
              <text class="slot-l">自用分站</text>
            </view>
            <view class="slot">
              <text class="slot-n gold">{{ SELLABLE_SLOTS }}</text>
              <text class="slot-l">可对外销售分站</text>
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
        <text class="cta-price">开通费用 <text class="cta-price-b">¥{{ PRICE }}</text> · 获得 1+5 个分站</text>
        <view class="cta-hint">
          <view class="agree-box" :class="{ on: agreed }" @tap="agreed = !agreed">
            <AppIcon v-if="agreed" name="check" :size="20" color="#fff" />
          </view>
          <text class="cta-hint-text">
            点击即表示已阅读并同意
            <text class="cta-hint-link" @tap="navigateTo('/pkg-operator/agreement-operator/index')">《运营商服务协议》</text>
          </text>
        </view>
        <view class="cta-btn" :class="{ disabled: !agreed }" @tap="onSubmit">
          <text class="cta-btn-text">确认开通运营商</text>
        </view>
      </view>
    </template>
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
</style>
