<template>
  <view class="vip-page">
    <!-- 金色渐变背景 -->
    <view class="bg-gradient" />

    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">会员中心</text>
        <text class="header-action" @click="goPage('/pages/vip/records/index')">购买记录</text>
      </view>
    </view>

    <!-- 会员卡片 -->
    <view class="vip-card">
      <view class="vc-decoration" />
      <view class="vc-content">
        <view class="vc-top">
          <view class="vc-crown">👑</view>
          <view class="vc-info">
            <view class="vc-level-row">
              <text class="vc-level">{{ vipStatus.level !== 'none' ? vipStatus.levelName : '热卜国学VIP' }}</text>
              <text v-if="vipStatus.level !== 'none'" class="vc-badge">{{ vipStatus.level.toUpperCase() }}</text>
            </view>
            <text class="vc-expiry">
              {{ vipStatus.level !== 'none' ? (vipStatus.isExpired ? '会员已过期' : `有效期至 ${vipStatus.expireAt}，还剩 ${vipStatus.daysLeft} 天`) : '解锁全部特权，畅享国学智慧' }}
            </text>
          </view>
        </view>

        <!-- 核心数据 -->
        <view class="vc-stats">
          <view class="vc-stat"><text class="vcs-num">500+</text><text class="vcs-label">免费课程</text></view>
          <view class="vc-stat"><text class="vcs-num">无限</text><text class="vcs-label">AI对话</text></view>
          <view class="vc-stat"><text class="vcs-num">{{ vipStatus.points }}</text><text class="vcs-label">会员积分</text></view>
        </view>

        <!-- 自动续费 -->
        <view v-if="vipStatus.level !== 'none'" class="vc-renew">
          <text class="vcr-label">自动续费</text>
          <switch :checked="vipStatus.autoRenew" @change="toggleAutoRenew" color="#fff" />
        </view>
      </view>
    </view>

    <!-- 等级选择 -->
    <view class="section">
      <text class="section-title">选择等级</text>
      <scroll-view scroll-x :show-scrollbar="false" class="level-scroll">
        <view class="level-row">
          <view
            v-for="g in planGroups"
            :key="g.level"
            class="level-chip"
            :class="{ sel: selectedLevel === g.level }"
            @click="selectLevel(g.level)"
          >{{ g.levelName }}</view>
        </view>
      </scroll-view>
      <text v-if="currentGroup" class="level-desc">{{ currentGroup.description }}</text>
    </view>

    <!-- 套餐选择 -->
    <view class="section">
      <text class="section-title">选择套餐</text>
      <view class="plan-grid">
        <view
          v-for="p in currentGroup?.plans"
          :key="p.id"
          class="plan-card"
          :class="{ sel: selectedPlan?.id === p.id }"
          @click="selectedPlan = p"
        >
          <view v-if="p.popular" class="plan-popular">推荐</view>
          <view v-else-if="p.discount" class="plan-discount">{{ p.discount }}</view>
          <text class="plan-duration">{{ p.durationName }}</text>
          <view class="plan-price-row">
            <text class="plan-yuan">¥</text>
            <text class="plan-price">{{ p.price }}</text>
          </view>
          <text v-if="p.originalPrice > p.price" class="plan-original">¥{{ p.originalPrice }}</text>
          <text class="plan-daily">¥{{ p.dailyPrice }}/天</text>
          <view v-if="selectedPlan?.id === p.id" class="plan-check">✓</view>
        </view>
      </view>
    </view>

    <!-- 会员权益 -->
    <view class="section">
      <text class="section-title">会员专属权益</text>
      <view class="benefits-grid">
        <view v-for="b in benefits" :key="b.id" class="benefit-card" :class="{ off: !b.levels.includes(selectedLevel) }">
          <view class="bc-icon" :class="{ dimmed: !b.levels.includes(selectedLevel) }">{{ b.icon }}</view>
          <view class="bc-info">
            <text class="bc-title">{{ b.title }}</text>
            <text class="bc-desc">{{ b.description }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 用户评价 -->
    <view class="section">
      <text class="section-title">会员评价</text>
      <view class="review-list">
        <view v-for="r in reviews" :key="r.name" class="review-card">
          <view class="rv-avatar"><text>{{ r.avatar }}</text></view>
          <view class="rv-body">
            <view class="rv-name-row">
              <text class="rv-name">{{ r.name }}</text>
              <text class="rv-stars">⭐⭐⭐⭐⭐</text>
            </view>
            <text class="rv-text">{{ r.content }}</text>
            <text class="rv-days">已开通{{ r.days }}天</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 常见问题 -->
    <view class="section">
      <text class="section-title">常见问题</text>
      <view class="faq-list">
        <view v-for="f in faqs" :key="f.q" class="faq-item">
          <text class="faq-q">{{ f.q }}</text>
          <text class="faq-a">{{ f.a }}</text>
        </view>
      </view>
    </view>

    <view style="height: 140rpx;" />

    <!-- 底部购买栏 -->
    <view v-if="selectedPlan" class="bottom-bar">
      <view class="bb-price">
        <view class="bb-price-row">
          <text class="bb-yuan">¥</text>
          <text class="bb-num">{{ selectedPlan.price }}</text>
          <text class="bb-dur">/{{ selectedPlan.durationName }}</text>
        </view>
        <text class="bb-original">原价 ¥{{ selectedPlan.originalPrice }}</text>
      </view>
      <view class="bb-btn" @click="showPaySheet = true">
        <text>{{ vipStatus.level === selectedLevel && !vipStatus.isExpired ? '续费' : '立即开通' }}</text>
      </view>
    </view>

    <!-- 支付弹窗 -->
    <view v-if="showPaySheet" class="modal-mask" @click="showPaySheet = false">
      <view class="pay-sheet" @click.stop>
        <text class="ps-title">选择支付方式</text>
        <view v-if="selectedPlan" class="ps-summary">
          <text class="pss-plan">{{ selectedPlan.levelName }} · {{ selectedPlan.durationName }}</text>
          <text class="pss-price"><text style="font-size: 28rpx;">¥</text>{{ selectedPlan.price }}</text>
        </view>
        <view class="pay-options">
          <view v-for="m in payMethods" :key="m.value" class="pay-option" :class="{ sel: paymentMethod === m.value }" @click="paymentMethod = m.value">
            <view class="po-icon" :class="m.bg">{{ m.label[0] }}</view>
            <text class="po-label">{{ m.label }}</text>
            <view v-if="paymentMethod === m.value" class="po-check">✓</view>
          </view>
        </view>
        <view class="ps-confirm" :class="{ off: purchasing }" @click="handlePurchase">
          <text>{{ purchasing ? '处理中...' : '确认支付' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Plan { id: number; durationName: string; price: number; originalPrice: number; dailyPrice: number; popular?: boolean; discount?: string; levelName: string }
interface PlanGroup { level: string; levelName: string; description: string; plans: Plan[] }
interface Benefit { id: number; icon: string; title: string; description: string; levels: string[] }

const vipStatus = ref({
  level: 'pro' as string,
  levelName: '专业会员',
  isExpired: false,
  expireAt: '2027-06-08',
  daysLeft: 365,
  points: 1280,
  autoRenew: true,
})

const selectedLevel = ref('pro')
const selectedPlan = ref<Plan | null>(null)
const showPaySheet = ref(false)
const paymentMethod = ref<'wechat' | 'alipay' | 'balance'>('wechat')
const purchasing = ref(false)

const planGroups = ref<PlanGroup[]>([
  {
    level: 'basic', levelName: '基础会员', description: '适合初学者，享受基础课程和有限AI对话',
    plans: [
      { id: 1, durationName: '月卡', price: 19, originalPrice: 29, dailyPrice: 0.6, levelName: '基础会员' },
      { id: 2, durationName: '季卡', price: 49, originalPrice: 79, dailyPrice: 0.5, discount: '8折', levelName: '基础会员' },
      { id: 3, durationName: '年卡', price: 168, originalPrice: 298, dailyPrice: 0.4, popular: true, levelName: '基础会员' },
    ],
  },
  {
    level: 'pro', levelName: '专业会员', description: '适合深度学习者，解锁全部课程、无限AI对话和排盘工具',
    plans: [
      { id: 4, durationName: '月卡', price: 39, originalPrice: 59, dailyPrice: 1.3, levelName: '专业会员' },
      { id: 5, durationName: '季卡', price: 99, originalPrice: 159, dailyPrice: 1.1, discount: '8折', levelName: '专业会员' },
      { id: 6, durationName: '年卡', price: 299, originalPrice: 499, dailyPrice: 0.8, popular: true, levelName: '专业会员' },
    ],
  },
  {
    level: 'premium', levelName: '尊享会员', description: '尊享全部特权，含一对一咨询和线下活动优先权',
    plans: [
      { id: 7, durationName: '年卡', price: 699, originalPrice: 999, dailyPrice: 1.9, popular: true, levelName: '尊享会员' },
      { id: 8, durationName: '永久', price: 1999, originalPrice: 2999, dailyPrice: 0, discount: '限量', levelName: '尊享会员' },
    ],
  },
])

const benefits = ref<Benefit[]>([
  { id: 1, icon: '📚', title: '全部课程免费', description: '畅享平台全部付费课程', levels: ['pro', 'premium'] },
  { id: 2, icon: '🤖', title: '无限AI对话', description: '智能命盘解读不限次数', levels: ['basic', 'pro', 'premium'] },
  { id: 3, icon: '📥', title: '离线下载', description: '课程视频支持离线观看', levels: ['pro', 'premium'] },
  { id: 4, icon: '🎁', title: '生日礼物', description: '生日月赠送专属优惠券', levels: ['basic', 'pro', 'premium'] },
  { id: 5, icon: '🧮', title: '专业排盘工具', description: '解锁全部排盘分析功能', levels: ['pro', 'premium'] },
  { id: 6, icon: '🎧', title: '优先客服', description: '专属客服通道快速响应', levels: ['premium'] },
  { id: 7, icon: '🎫', title: '会员折扣', description: '商城购物享专属折扣', levels: ['basic', 'pro', 'premium'] },
  { id: 8, icon: '👨‍🏫', title: '一对一咨询', description: '每月1次免费专家咨询', levels: ['premium'] },
])

const reviews = [
  { name: '易*明', avatar: '易', content: '开通年度会员后，学习效率提升很多，课程质量很高！', days: 128 },
  { name: '张*华', avatar: '张', content: 'AI智能体太好用了，排盘解读很专业，物超所值。', days: 56 },
]

const faqs = [
  { q: '开通后可以退款吗？', a: '会员服务一经开通，暂不支持退款，请确认后购买。' },
  { q: '会员可以多设备登录吗？', a: '同一账号最多支持3台设备同时登录。' },
  { q: '会员到期后权益还在吗？', a: '到期后会员权益将失效，但已下载的内容可继续保留。' },
]

const payMethods = [
  { value: 'wechat' as const, label: '微信支付', bg: 'wechat' },
  { value: 'alipay' as const, label: '支付宝', bg: 'alipay' },
  { value: 'balance' as const, label: '余额支付', bg: 'balance' },
]

const currentGroup = computed(() => planGroups.value.find(g => g.level === selectedLevel.value))

function selectLevel(level: string) {
  selectedLevel.value = level
  const group = planGroups.value.find(g => g.level === level)
  if (group) { selectedPlan.value = group.plans.find(p => p.popular) || group.plans[0] }
}

function toggleAutoRenew() {
  vipStatus.value.autoRenew = !vipStatus.value.autoRenew
  uni.showToast({ title: vipStatus.value.autoRenew ? '已开启自动续费' : '已关闭自动续费', icon: 'success' })
}

function handlePurchase() {
  if (purchasing.value) return
  purchasing.value = true
  setTimeout(() => {
    purchasing.value = false
    showPaySheet.value = false
    uni.showToast({ title: '购买成功！', icon: 'success' })
  }, 1500)
}

function goPage(url: string) { uni.navigateTo({ url }) }

// 初始化默认套餐
selectLevel('pro')
</script>

<style scoped>
.vip-page { min-height: 100vh; background: #FAF8F5; position: relative; }
.bg-gradient { position: absolute; top: 0; left: 0; right: 0; height: 400rpx; background: linear-gradient(180deg, rgba(201,169,110,0.15), rgba(201,169,110,0.05), transparent); pointer-events: none; }

.header-sticky { position: sticky; top: 0; z-index: 30; background: transparent; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { flex: 1; font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.header-action { font-size: 26rpx; color: #C41E3A; }

/* VIP卡片 */
.vip-card { margin: 0 24rpx; background: linear-gradient(135deg, #C9A96E, #B8943D, #C41E3A); border-radius: 24rpx; overflow: hidden; position: relative; box-shadow: 0 12rpx 40rpx rgba(201,169,110,0.3); }
.vc-decoration { position: absolute; right: -40rpx; top: -40rpx; width: 240rpx; height: 240rpx; border: 4rpx solid rgba(255,255,255,0.1); border-radius: 50%; }
.vc-content { position: relative; padding: 32rpx; }
.vc-top { display: flex; align-items: center; gap: 20rpx; margin-bottom: 24rpx; }
.vc-crown { font-size: 56rpx; }
.vc-info { flex: 1; }
.vc-level-row { display: flex; align-items: center; gap: 12rpx; }
.vc-level { font-size: 36rpx; font-weight: 700; color: #fff; }
.vc-badge { font-size: 18rpx; color: #fff; background: rgba(255,255,255,0.2); padding: 2rpx 12rpx; border-radius: 8rpx; }
.vc-expiry { font-size: 24rpx; color: rgba(255,255,255,0.75); margin-top: 6rpx; }

.vc-stats { display: grid; grid-template-columns: repeat(3, 1fr); padding: 24rpx 0; border-top: 1px solid rgba(255,255,255,0.2); }
.vc-stat { text-align: center; }
.vcs-num { font-size: 36rpx; font-weight: 700; color: #fff; display: block; }
.vcs-label { font-size: 20rpx; color: rgba(255,255,255,0.7); margin-top: 4rpx; display: block; }

.vc-renew { display: flex; justify-content: space-between; align-items: center; padding-top: 20rpx; border-top: 1px solid rgba(255,255,255,0.2); }
.vcr-label { font-size: 26rpx; color: rgba(255,255,255,0.85); }

/* 区块 */
.section { padding: 32rpx 24rpx 0; }
.section-title { font-size: 30rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 20rpx; display: block; }

.level-scroll { white-space: nowrap; }
.level-row { display: flex; gap: 12rpx; }
.level-chip { flex-shrink: 0; padding: 12rpx 28rpx; border-radius: 32rpx; font-size: 26rpx; color: #666; background: #fff; border: 1px solid #EEE; }
.level-chip.sel { background: #C9A96E; color: #fff; border-color: #C9A96E; }
.level-desc { font-size: 24rpx; color: #999; margin-top: 16rpx; display: block; }

.plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; }
.plan-card { padding: 24rpx 8rpx; border-radius: 16rpx; border: 2rpx solid #F0EDE5; background: #fff; text-align: center; position: relative; overflow: hidden; }
.plan-card.sel { border-color: #C9A96E; background: rgba(201,169,110,0.04); }
.plan-popular { position: absolute; top: 0; right: 0; font-size: 18rpx; color: #fff; background: #C9A96E; padding: 2rpx 14rpx; border-radius: 0 0 0 12rpx; }
.plan-discount { position: absolute; top: 0; right: 0; font-size: 18rpx; color: #fff; background: #C41E3A; padding: 2rpx 14rpx; border-radius: 0 0 0 12rpx; }
.plan-duration { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.plan-price-row { margin-top: 8rpx; display: flex; align-items: baseline; justify-content: center; gap: 2rpx; }
.plan-yuan { font-size: 22rpx; color: #999; }
.plan-price { font-size: 44rpx; font-weight: 700; color: #C41E3A; }
.plan-original { font-size: 20rpx; color: #BBB; text-decoration: line-through; }
.plan-daily { font-size: 20rpx; color: #C9A96E; margin-top: 4rpx; display: block; }
.plan-check { position: absolute; top: 8rpx; left: 8rpx; width: 36rpx; height: 36rpx; border-radius: 50%; background: #C9A96E; color: #fff; font-size: 20rpx; display: flex; align-items: center; justify-content: center; }

.benefits-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }
.benefit-card { display: flex; gap: 16rpx; padding: 20rpx; border-radius: 16rpx; background: rgba(201,169,110,0.04); border: 1px solid rgba(201,169,110,0.15); }
.benefit-card.off { opacity: 0.45; background: #F9F9F9; border-color: #EEE; }
.bc-icon { font-size: 36rpx; flex-shrink: 0; }
.bc-icon.dimmed { filter: grayscale(1); }
.bc-info { flex: 1; min-width: 0; }
.bc-title { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.bc-desc { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; line-height: 1.4; }

.review-list { display: flex; flex-direction: column; gap: 12rpx; }
.review-card { display: flex; gap: 16rpx; padding: 20rpx; border-radius: 16rpx; background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.rv-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(201,169,110,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 28rpx; color: #C9A96E; font-weight: 600; }
.rv-body { flex: 1; }
.rv-name-row { display: flex; justify-content: space-between; align-items: center; }
.rv-name { font-size: 26rpx; font-weight: 500; color: #333; }
.rv-stars { font-size: 20rpx; }
.rv-text { font-size: 24rpx; color: #666; margin-top: 8rpx; line-height: 1.5; }
.rv-days { font-size: 20rpx; color: #BBB; margin-top: 8rpx; }

.faq-list { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.faq-item { padding: 24rpx; }
.faq-item + .faq-item { border-top: 1px solid #F5F1EB; }
.faq-q { font-size: 26rpx; font-weight: 500; color: #333; }
.faq-a { font-size: 24rpx; color: #999; margin-top: 6rpx; display: block; line-height: 1.5; }

/* 底部栏 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; background: rgba(255,255,255,0.97); border-top: 1px solid #E8E0D5; display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); }
.bb-price-row { display: flex; align-items: baseline; gap: 2rpx; }
.bb-yuan { font-size: 24rpx; color: #999; }
.bb-num { font-size: 52rpx; font-weight: 700; color: #C41E3A; }
.bb-dur { font-size: 24rpx; color: #999; }
.bb-original { font-size: 22rpx; color: #BBB; text-decoration: line-through; }
.bb-btn { padding: 20rpx 56rpx; border-radius: 48rpx; background: linear-gradient(135deg, #C9A96E, #C41E3A); color: #fff; font-size: 30rpx; font-weight: 600; box-shadow: 0 8rpx 24rpx rgba(201,169,110,0.35); }

/* 支付弹窗 */
.modal-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.pay-sheet { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 32rpx 32rpx 40rpx; }
.ps-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; text-align: center; display: block; margin-bottom: 24rpx; }
.ps-summary { text-align: center; padding-bottom: 24rpx; border-bottom: 1px solid #F5F1EB; margin-bottom: 24rpx; }
.pss-plan { font-size: 26rpx; color: #999; display: block; }
.pss-price { font-size: 52rpx; font-weight: 700; color: #C41E3A; margin-top: 8rpx; display: block; }
.pay-options { display: flex; flex-direction: column; gap: 16rpx; }
.pay-option { display: flex; align-items: center; gap: 20rpx; padding: 20rpx; border-radius: 16rpx; border: 1px solid #EEE; }
.pay-option.sel { border-color: #C9A96E; background: rgba(201,169,110,0.04); }
.po-icon { width: 56rpx; height: 56rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24rpx; font-weight: 600; }
.po-icon.wechat { background: #52C41A; }
.po-icon.alipay { background: #1677FF; }
.po-icon.balance { background: #FA8C16; }
.po-label { flex: 1; font-size: 28rpx; color: #333; }
.po-check { font-size: 28rpx; color: #C9A96E; font-weight: 700; }
.ps-confirm { width: 100%; padding: 24rpx 0; border-radius: 48rpx; background: #C41E3A; color: #fff; font-size: 30rpx; font-weight: 500; text-align: center; margin-top: 32rpx; }
.ps-confirm.off { opacity: 0.5; }
</style>
