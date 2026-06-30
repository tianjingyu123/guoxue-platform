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
                <text class="card-title">{{ data.status.level !== 'none' ? data.status.levelName : '热卜国学VIP' }}</text>
                <text v-if="data.status.level !== 'none'" class="card-badge">{{ data.status.level.toUpperCase() }}</text>
              </view>
              <text class="card-sub">
                {{ data.status.level !== 'none'
                  ? (data.status.isExpired
                    ? '会员已过期'
                    : `有效期至 ${data.status.expireAt}，还剩 ${data.status.daysLeft} 天`)
                  : '解锁全部特权，畅享国学智慧' }}
              </text>
            </view>
          </view>

          <!-- 核心数据 -->
          <view class="card-stats">
            <view class="stat-col">
              <text class="stat-num">500+</text>
              <text class="stat-label">免费课程</text>
            </view>
            <view class="stat-col">
              <text class="stat-num">无限</text>
              <text class="stat-label">AI对话</text>
            </view>
            <view class="stat-col">
              <text class="stat-num">{{ data.status.points }}</text>
              <text class="stat-label">会员积分</text>
            </view>
          </view>

          <!-- 自动续费 -->
          <view v-if="data.status.level !== 'none'" class="card-autorenew">
            <text class="autorenew-label">自动续费</text>
            <switch
              :checked="data.status.autoRenew"
              :disabled="autoRenewLoading"
              color="rgba(255,255,255,0.3)"
              style="transform: scale(0.85);"
              @change="onToggleAutoRenew"
            />
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

      <!-- 套餐选择 -->
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
            <view v-if="plan.popular" class="plan-tag tag-popular">推荐</view>
            <view v-else-if="plan.discount" class="plan-tag tag-discount">{{ plan.discount }}</view>

            <text class="plan-duration">{{ plan.durationName }}</text>
            <view class="plan-price-row">
              <text class="plan-yuan">¥</text>
              <text class="plan-price">{{ plan.price }}</text>
            </view>
            <text v-if="plan.originalPrice > plan.price" class="plan-original">¥{{ plan.originalPrice }}</text>
            <text class="plan-daily">¥{{ plan.dailyPrice }}/天</text>

            <view v-if="selectedPlan?.id === plan.id" class="plan-check">
              <app-icon name="check" :size="24" color="#FFFFFF" />
            </view>
          </view>
        </view>
      </view>

      <!-- 会员权益 -->
      <view class="section">
        <text class="section-title">会员专属权益</text>
        <view class="benefit-grid">
          <view
            v-for="benefit in data.benefits"
            :key="benefit.id"
            class="benefit-card"
            :class="{ 'benefit-off': !benefit.levels.includes(selectedLevel) }"
          >
            <view class="benefit-icon" :class="{ 'benefit-icon-off': !benefit.levels.includes(selectedLevel) }">
              <app-icon
                :name="benefitIconName(benefit.icon)"
                :size="40"
                :color="benefit.levels.includes(selectedLevel) ? '#C9A96E' : '#8A8478'"
              />
            </view>
            <view class="benefit-text">
              <text class="benefit-title">{{ benefit.title }}</text>
              <text class="benefit-desc">{{ benefit.description }}</text>
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

      <!-- 用户评价 -->
      <view class="section">
        <text class="section-title">会员评价</text>
        <view class="review-list">
          <view v-for="(review, idx) in reviews" :key="idx" class="review-card">
            <view class="review-avatar">
              <text class="review-avatar-txt">{{ review.avatar }}</text>
            </view>
            <view class="review-body">
              <view class="review-head">
                <text class="review-name">{{ review.name }}</text>
                <view class="review-stars">
                  <app-icon v-for="i in 5" :key="i" name="star" :size="24" color="#C9A96E" :fill="true" />
                </view>
              </view>
              <text class="review-content">{{ review.content }}</text>
              <text class="review-days">已开通{{ review.days }}天</text>
            </view>
          </view>
        </view>
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
            <text class="buy-price">{{ selectedPlan.price }}</text>
            <text class="buy-duration">/{{ selectedPlan.durationName }}</text>
          </view>
          <text class="buy-original">原价 ¥{{ selectedPlan.originalPrice }}</text>
        </view>
        <view class="buy-btn" @tap="showPaySheet = true">
          <text class="buy-btn-txt">{{ data.status.level === selectedLevel && !data.status.isExpired ? '续费' : '立即开通' }}</text>
        </view>
      </view>
    </view>

    <!-- 支付方式选择 Sheet -->
    <view v-if="showPaySheet" class="sheet-mask" @tap="showPaySheet = false">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">选择支付方式</text>
        <view v-if="selectedPlan" class="sheet-summary">
          <text class="sheet-plan">{{ selectedPlan.levelName }} · {{ selectedPlan.durationName }}</text>
          <text class="sheet-amount"><text class="sheet-amount-yuan">¥</text>{{ selectedPlan.price }}</text>
        </view>

        <view class="pay-list">
          <view
            v-for="m in payMethods"
            :key="m.key"
            class="pay-item"
            @tap="paymentMethod = m.key"
          >
            <view class="pay-radio" :class="{ 'pay-radio-on': paymentMethod === m.key }">
              <view v-if="paymentMethod === m.key" class="pay-radio-dot" />
            </view>
            <view class="pay-logo" :style="{ background: m.color }">
              <text class="pay-logo-txt">{{ m.short }}</text>
            </view>
            <text class="pay-name">{{ m.label }}</text>
          </view>
        </view>

        <view class="sheet-confirm" :class="{ disabled: purchasing }" @tap="handlePurchase">
          <text class="sheet-confirm-txt">{{ purchasing ? '处理中...' : '确认支付' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppError from '@/components/common/app-error.vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import MembershipComparison from '@/components/marketing/membership-comparison.vue'
import { navigateTo } from '@/utils/router'
import { track } from '@/composables/useTrack'

type VipLevel = 'none' | 'basic' | 'pro' | 'premium'
interface VipPlan {
  id: string; level: VipLevel; levelName: string; duration: number; durationName: string
  originalPrice: number; price: number; dailyPrice: number; discount?: string; popular?: boolean; features: string[]
}
interface VipPlanGroup { level: VipLevel; levelName: string; description: string; plans: VipPlan[] }
interface VipBenefit { id: string; icon: string; title: string; description: string; levels: VipLevel[] }
interface VipStatus {
  level: VipLevel; levelName: string; expireAt: string; isExpired: boolean
  daysLeft: number; autoRenew: boolean; points: number; growthValue: number
}
interface VipCenterData { status: VipStatus; benefits: VipBenefit[]; planGroups: VipPlanGroup[] }

// @data-needs: 接入 lib/api/vip.ts getVipCenterData/purchaseVip/toggleAutoRenew（数值照抄原型 mock）
const mockStatus: VipStatus = {
  level: 'pro', levelName: '专业会员', expireAt: '2026-12-31', isExpired: false,
  daysLeft: 211, autoRenew: true, points: 3680, growthValue: 4520,
}
const mockBenefits: VipBenefit[] = [
  { id: '1', icon: 'crown', title: '身份标识', description: '专属会员头像框和昵称徽章', levels: ['basic', 'pro', 'premium'] },
  { id: '2', icon: 'video', title: '视频加速', description: '视频播放免广告，支持2倍速', levels: ['basic', 'pro', 'premium'] },
  { id: '3', icon: 'download', title: '离线下载', description: '课程视频支持离线观看', levels: ['pro', 'premium'] },
  { id: '4', icon: 'discount', title: '购课优惠', description: '课程购买享9折优惠', levels: ['basic', 'pro', 'premium'] },
  { id: '5', icon: 'gift', title: '专属礼包', description: '每月领取会员专属礼包', levels: ['pro', 'premium'] },
  { id: '6', icon: 'customer-service', title: '专属客服', description: '1对1专属客服服务', levels: ['premium'] },
  { id: '7', icon: 'book', title: '古籍阅读', description: '解锁全部古籍内容', levels: ['pro', 'premium'] },
  { id: '8', icon: 'calculator', title: '高级排盘', description: '解锁所有排盘工具', levels: ['premium'] },
]
const mockPlanGroups: VipPlanGroup[] = [
  {
    level: 'basic', levelName: '基础会员', description: '入门首选，享基础权益',
    plans: [
      { id: 'basic_1', level: 'basic', levelName: '基础会员', duration: 1, durationName: '月付', originalPrice: 28, price: 28, dailyPrice: 0.93, features: ['免广告', '9折购课'] },
      { id: 'basic_3', level: 'basic', levelName: '基础会员', duration: 3, durationName: '季付', originalPrice: 84, price: 68, dailyPrice: 0.76, discount: '8.1折', features: ['免广告', '9折购课'] },
      { id: 'basic_12', level: 'basic', levelName: '基础会员', duration: 12, durationName: '年付', originalPrice: 336, price: 198, dailyPrice: 0.54, discount: '5.9折', popular: true, features: ['免广告', '9折购课'] },
    ],
  },
  {
    level: 'pro', levelName: '专业会员', description: '进阶学习，权益全面升级',
    plans: [
      { id: 'pro_1', level: 'pro', levelName: '专业会员', duration: 1, durationName: '月付', originalPrice: 68, price: 68, dailyPrice: 2.27, features: ['全部基础权益', '离线下载', '古籍阅读', '每月礼包'] },
      { id: 'pro_3', level: 'pro', levelName: '专业会员', duration: 3, durationName: '季付', originalPrice: 204, price: 168, dailyPrice: 1.87, discount: '8.2折', features: ['全部基础权益', '离线下载', '古籍阅读', '每月礼包'] },
      { id: 'pro_12', level: 'pro', levelName: '专业会员', duration: 12, durationName: '年付', originalPrice: 816, price: 498, dailyPrice: 1.36, discount: '6.1折', popular: true, features: ['全部基础权益', '离线下载', '古籍阅读', '每月礼包'] },
    ],
  },
  {
    level: 'premium', levelName: '尊享会员', description: '顶级权益，专属尊贵体验',
    plans: [
      { id: 'premium_1', level: 'premium', levelName: '尊享会员', duration: 1, durationName: '月付', originalPrice: 128, price: 128, dailyPrice: 4.27, features: ['全部专业权益', '高级排盘', '专属客服', '优先体验'] },
      { id: 'premium_3', level: 'premium', levelName: '尊享会员', duration: 3, durationName: '季付', originalPrice: 384, price: 328, dailyPrice: 3.64, discount: '8.5折', features: ['全部专业权益', '高级排盘', '专属客服', '优先体验'] },
      { id: 'premium_12', level: 'premium', levelName: '尊享会员', duration: 12, durationName: '年付', originalPrice: 1536, price: 998, dailyPrice: 2.74, discount: '6.5折', popular: true, features: ['全部专业权益', '高级排盘', '专属客服', '优先体验'] },
    ],
  },
]

// 权益图标映射（照抄原型 benefitIcons）
const benefitIconMap: Record<string, string> = {
  crown: 'crown', video: 'bot', download: 'book-open', gift: 'gift',
  book: 'book-open', calculator: 'zap', 'customer-service': 'shield', discount: 'shopping-bag',
}
function benefitIconName(icon: string) { return benefitIconMap[icon] || 'gift' }

const payMethods = [
  { key: 'wechat' as const, label: '微信支付', short: '微', color: '#22C55E' },
  { key: 'alipay' as const, label: '支付宝', short: '支', color: '#3B82F6' },
  { key: 'unionpay' as const, label: '云闪付', short: '云', color: '#EF4444' },
  { key: 'huifu' as const, label: '汇付天下', short: '汇', color: '#F97316' },
]

const reviews = [
  { name: '易*明', avatar: '易', content: '开通年度会员后，学习效率提升很多，课程质量很高！', days: 128 },
  { name: '张*华', avatar: '张', content: 'AI智能体太好用了，排盘解读很专业，物超所值。', days: 56 },
]
const faqs = [
  { q: '开通后可以退款吗？', a: '会员服务一经开通，暂不支持退款，请确认后购买。' },
  { q: '会员可以多设备登录吗？', a: '同一账号最多支持3台设备同时登录。' },
  { q: '会员到期后权益还在吗？', a: '到期后会员权益将失效，但已下载的内容可继续保留。' },
]

const data = ref<VipCenterData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const selectedLevel = ref<VipLevel>('pro')
const selectedPlan = ref<VipPlan | null>(null)
const showPaySheet = ref(false)
const paymentMethod = ref<'wechat' | 'alipay' | 'unionpay' | 'huifu'>('wechat')
const purchasing = ref(false)
const autoRenewLoading = ref(false)

const currentPlanGroup = computed(() => data.value?.planGroups.find(g => g.level === selectedLevel.value))

function loadData() {
  loading.value = true
  error.value = null
  setTimeout(() => {
    data.value = { status: mockStatus, benefits: mockBenefits, planGroups: mockPlanGroups }
    const defaultLevel = data.value.status.level !== 'none' ? data.value.status.level : 'pro'
    selectedLevel.value = defaultLevel
    const group = data.value.planGroups.find(g => g.level === defaultLevel)
    selectedPlan.value = group?.plans.find(p => p.popular) || group?.plans[0] || null
    loading.value = false
  }, 500)
}

function selectLevel(level: VipLevel) {
  selectedLevel.value = level
  const group = data.value?.planGroups.find(g => g.level === level)
  selectedPlan.value = group?.plans.find(p => p.popular) || group?.plans[0] || null
}

function handlePurchase() {
  if (!selectedPlan.value || purchasing.value) return
  // @data-needs: 接入 use-payment-bindings 判断渠道是否已绑定，未绑定则引导绑定弹窗
  purchasing.value = true
  setTimeout(() => {
    track.purchase({ type: 'vip', planId: selectedPlan.value?.id, level: selectedPlan.value?.level, amount: selectedPlan.value?.price })
    uni.showToast({ title: '购买成功', icon: 'success' })
    showPaySheet.value = false
    purchasing.value = false
    loadData()
  }, 800)
}

function onToggleAutoRenew(e: any) {
  const enabled = e.detail.value
  autoRenewLoading.value = true
  setTimeout(() => {
    if (data.value) data.value.status.autoRenew = enabled
    uni.showToast({ title: enabled ? '已开启自动续费' : '已关闭自动续费', icon: 'none' })
    autoRenewLoading.value = false
  }, 300)
}

function go(path: string) { navigateTo(path) }

onMounted(loadData)
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

.card-autorenew { display: flex; align-items: center; justify-content: space-between; margin-top: 32rpx; padding-top: 32rpx; border-top: 2rpx solid rgba(255,255,255,0.2); }
.autorenew-label { font-size: 28rpx; color: rgba(255,255,255,0.8); }

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
.level-active.lvl-basic { background: #F59E0B; }
.level-active.lvl-pro { background: #A855F7; }
.level-active.lvl-premium { background: linear-gradient(90deg, #FBBF24, #F97316); }
.level-active.lvl-none { background: #E8E3DB; }
.level-btn-txt { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.level-btn-txt-active { color: #FFFFFF; }

/* 套餐选择 */
.plan-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24rpx; margin-top: 24rpx; }
.plan-card { position: relative; overflow: hidden; border-radius: 16rpx; padding: 24rpx 16rpx; background: #FFFFFF; }
.plan-normal { border: 2rpx solid #E8E3DB; }
.plan-selected { border: 4rpx solid #C9A96E; background: rgba(201,169,110,0.05); }
.plan-tag { position: absolute; top: 0; right: 0; padding: 4rpx 16rpx; font-size: 20rpx; font-weight: 500; border-bottom-left-radius: 16rpx; }
.tag-popular { background: #C9A96E; color: #FFFFFF; }
.tag-discount { background: #EF4444; color: #FFFFFF; }
.plan-duration { font-size: 28rpx; font-weight: 500; color: #2C2C2C; text-align: center; display: block; }
.plan-price-row { display: flex; align-items: baseline; justify-content: center; gap: 2rpx; margin-top: 16rpx; }
.plan-yuan { font-size: 22rpx; color: #8A8478; }
.plan-price { font-size: 48rpx; font-weight: 700; color: var(--brand); }
.plan-original { font-size: 22rpx; color: #8A8478; text-decoration: line-through; text-align: center; margin-top: 8rpx; display: block; }
.plan-daily { font-size: 22rpx; color: #C9A96E; text-align: center; margin-top: 8rpx; display: block; }
.plan-check { position: absolute; top: 16rpx; left: 16rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: #C9A96E; display: flex; align-items: center; justify-content: center; }

/* 会员权益 */
.benefit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; margin-top: 24rpx; }
.benefit-card { display: flex; align-items: flex-start; gap: 24rpx; padding: 24rpx; border-radius: 16rpx; background: rgba(201,169,110,0.05); border: 2rpx solid rgba(201,169,110,0.3); }
.benefit-off { opacity: 0.5; background: #FFFFFF; border: 2rpx solid #E8E3DB; }
.benefit-icon { width: 80rpx; height: 80rpx; border-radius: 16rpx; background: rgba(201,169,110,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.benefit-icon-off { background: #F0EDE8; }
.benefit-text { flex: 1; min-width: 0; }
.benefit-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.benefit-desc { font-size: 22rpx; color: #8A8478; margin-top: 4rpx; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* 评价 */
.review-list { display: flex; flex-direction: column; gap: 24rpx; margin-top: 24rpx; }
.review-card { display: flex; align-items: flex-start; gap: 24rpx; padding: 24rpx; background: #FFFFFF; border-radius: 16rpx; }
.review-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(201,169,110,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.review-avatar-txt { font-size: 28rpx; font-weight: 500; color: #C9A96E; }
.review-body { flex: 1; min-width: 0; }
.review-head { display: flex; align-items: center; justify-content: space-between; }
.review-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.review-stars { display: flex; align-items: center; gap: 2rpx; }
.review-content { font-size: 22rpx; color: #8A8478; margin-top: 8rpx; display: block; line-height: 1.5; }
.review-days { font-size: 22rpx; color: #8A8478; margin-top: 16rpx; display: block; }

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
.buy-original { font-size: 22rpx; color: #8A8478; text-decoration: line-through; }
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
.pay-name { font-size: 28rpx; color: #2C2C2C; }
.sheet-confirm { margin-top: 48rpx; height: 96rpx; border-radius: 16rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; }
.sheet-confirm.disabled { opacity: 0.6; }
.sheet-confirm-txt { font-size: 30rpx; font-weight: 500; color: #FFFFFF; }
</style>
