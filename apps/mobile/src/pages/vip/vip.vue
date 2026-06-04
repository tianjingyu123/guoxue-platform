<template>
  <view class="page">
    <DataState
      :is-loading="loading"
      :error="error"
      :is-empty="false"
      skeleton-type="card"
      @retry="loadData"
    >
      <!-- ==================== 会员等级卡片 ==================== -->
      <view class="vip-header">
        <view class="vh-bg-deco" />
        <view class="vh-content">
          <text class="vh-icon">
            {{ memberStatus?.isMember ? '👑' : '🔓' }}
          </text>
          <text class="vh-title">
            {{ memberStatus?.isMember ? planNameLabel : '解锁国学之旅' }}
          </text>
          <text class="vh-sub">
            {{ memberStatus?.isMember ? '享受专属会员权益' : '开通会员，享受更多精彩内容' }}
          </text>
          <view
            v-if="memberStatus?.isMember"
            class="vh-badge"
          >
            <text>{{ planNameLabel }}</text>
            <text
              v-if="memberStatus?.expireAt"
              class="vh-expire"
            >
              到期 {{ formatDate(memberStatus.expireAt) }}
            </text>
            <text
              v-if="memberStatus?.daysLeft !== undefined"
              class="vh-days"
            >
              剩余 {{ memberStatus.daysLeft }} 天
            </text>
          </view>
        </view>
      </view>

      <!-- ==================== 会员等级切换 ==================== -->
      <view class="level-tabs">
        <view
          v-for="tab in levelTabs"
          :key="tab.key"
          class="level-tab"
          :class="{ active: selectedLevel === tab.key }"
          @click="selectedLevel = tab.key"
        >
          <text class="lt-name">
            {{ tab.label }}
          </text>
          <text class="lt-price">
            ¥{{ tab.price }}{{ tab.unit }}
          </text>
        </view>
      </view>

      <!-- ==================== 权益图标 ==================== -->
      <view class="benefit-icons">
        <view
          v-for="b in benefitItems"
          :key="b.name"
          class="bi-item"
        >
          <text class="bi-icon">
            {{ b.icon }}
          </text>
          <text class="bi-name">
            {{ b.name }}
          </text>
          <text class="bi-desc">
            {{ b.desc }}
          </text>
        </view>
      </view>

      <!-- ==================== 套餐卡片 ==================== -->
      <view class="section">
        <text class="section-title">
          选择套餐
        </text>
        <view class="plans-list">
          <view
            v-for="(plan, idx) in plans"
            :key="idx"
            class="plan-card"
            :class="{
              featured: plan.featured,
              selected: selectedPlanIndex === idx,
            }"
            @click="selectedPlanIndex = idx"
          >
            <view
              v-if="plan.featured"
              class="plan-ribbon"
            >
              推荐
            </view>
            <view class="plan-header">
              <view>
                <text class="plan-name">
                  {{ plan.name }}
                </text>
                <text
                  v-if="plan.originalPrice"
                  class="plan-original"
                >
                  原价 ¥{{ plan.originalPrice }}
                </text>
              </view>
              <view class="plan-price">
                <text class="price-symbol">
                  ¥
                </text>
                <text class="price-num">
                  {{ plan.price }}
                </text>
                <text
                  v-if="plan.unit"
                  class="price-unit"
                >
                  /{{ plan.unit }}
                </text>
              </view>
            </view>
            <view class="plan-benefits">
              <text
                v-for="b in plan.benefits"
                :key="b"
                class="plan-benefit"
              >
                ✓ {{ b }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- ==================== 购买按钮 ==================== -->
      <view class="buy-section">
        <button
          class="buy-btn"
          :disabled="buying"
          :loading="buying"
          @click="handleBuy"
        >
          立即开通 · ¥{{ selectedPlan?.price || 0 }}
        </button>
        <text class="buy-disclaimer">
          支付即表示同意《会员服务协议》
        </text>
      </view>

      <!-- ==================== 会员权益对比 ==================== -->
      <view class="section">
        <text class="section-title">
          会员权益对比
        </text>
        <view class="compare-table">
          <view class="compare-row head">
            <text class="col-name">
              权益
            </text>
            <text class="col-val">
              普通
            </text>
            <text class="col-val">
              月会员
            </text>
            <text class="col-val">
              年会员
            </text>
            <text class="col-val">
              终身
            </text>
          </view>
          <view
            v-for="r in compareRows"
            :key="r.name"
            class="compare-row"
          >
            <text class="col-name">
              {{ r.name }}
            </text>
            <text class="col-val">
              {{ r.free }}
            </text>
            <text class="col-val">
              {{ r.monthly }}
            </text>
            <text class="col-val">
              {{ r.yearly }}
            </text>
            <text class="col-val">
              {{ r.lifetime }}
            </text>
          </view>
        </view>
      </view>
    </DataState>

    <!-- 支付弹窗 -->
    <view
      v-if="showPaySheet"
      class="modal-overlay"
      @click="showPaySheet = false"
    >
      <view
        class="pay-sheet"
        @click.stop
      >
        <text class="pay-title">
          选择支付方式
        </text>
        <view class="pay-methods">
          <view
            class="pay-method"
            :class="{ active: payMethod === 'wechat' }"
            @click="payMethod = 'wechat'"
          >
            <view class="pm-left">
              <text class="pm-icon pay-wechat">
                💚
              </text>
              <text class="pm-name">
                微信支付
              </text>
            </view>
            <text
              class="pm-check"
              :class="{ checked: payMethod === 'wechat' }"
            >
              ✓
            </text>
          </view>
          <view
            class="pay-method"
            :class="{ active: payMethod === 'alipay' }"
            @click="payMethod = 'alipay'"
          >
            <view class="pm-left">
              <text class="pm-icon pay-alipay">
                💙
              </text>
              <text class="pm-name">
                支付宝
              </text>
            </view>
            <text
              class="pm-check"
              :class="{ checked: payMethod === 'alipay' }"
            >
              ✓
            </text>
          </view>
        </view>
        <view class="pay-summary">
          <text class="pay-summary-label">
            {{ selectedPlan?.name }}
          </text>
          <text class="pay-summary-price">
            ¥{{ selectedPlan?.price || 0 }}
          </text>
        </view>
        <view class="pay-actions">
          <button
            class="pay-cancel"
            @click="showPaySheet = false"
          >
            取消
          </button>
          <button
            class="pay-confirm"
            :loading="paying"
            :disabled="paying"
            @click="confirmPay"
          >
            确认支付
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { useUserStore } from '../../store/user'
import { memberApi, shopApi } from '../../api'

interface PlanItem {
  level: string
  name: string
  price: number
  originalPrice?: number
  unit: string
  featured: boolean
  benefits: string[]
}

interface MemberStatus {
  isMember: boolean
  planName?: string
  expireAt?: string
  daysLeft?: number
  level?: string
}

const userStore = useUserStore()

const loading = ref(true)
const error = ref<string | null>(null)
const buying = ref(false)
const paying = ref(false)
const selectedPlanIndex = ref(0)
const selectedLevel = ref('YEARLY')
const showPaySheet = ref(false)
const payMethod = ref<'wechat' | 'alipay'>('wechat')
const memberStatus = ref<MemberStatus>({ isMember: false })

const unitMap: Record<string, string> = {
  MONTHLY: '月',
  YEARLY: '年',
  LIFETIME: '',
}

const defaultPlans: PlanItem[] = [
  {
    level: 'MONTHLY', name: '月会员', price: 39, originalPrice: 59,
    unit: '月', featured: false,
    benefits: ['AI排盘分析免费看', '智能体调用额度×5', '专属会员标识', '部分课程9折'],
  },
  {
    level: 'YEARLY', name: '年会员', price: 365, originalPrice: 468,
    unit: '年', featured: true,
    benefits: ['月会员全部权益', '部分课程免费学', '商城95折优惠', '圈子入圈8折', '每月AI额度×50'],
  },
  {
    level: 'LIFETIME', name: '终身会员', price: 9999,
    unit: '', featured: false,
    benefits: ['年会员全部权益', '终身有效', '全部课程免费', '专属客服通道', '商城9折优惠', '线下活动优先'],
  },
]

const plans = ref<PlanItem[]>([...defaultPlans])

const levelTabs = computed(() => [
  { key: 'MONTHLY', label: '月会员', price: plans.value.find(p => p.level === 'MONTHLY')?.price || 39, unit: '/月' },
  { key: 'YEARLY', label: '年会员', price: plans.value.find(p => p.level === 'YEARLY')?.price || 365, unit: '/年' },
  { key: 'LIFETIME', label: '终身', price: plans.value.find(p => p.level === 'LIFETIME')?.price || 9999, unit: '' },
])

/** 权益图标 */
const benefitItems = [
  { name: 'AI解读', icon: '🤖', desc: 'AI排盘免费看' },
  { name: '课程', icon: '📚', desc: '精选课程免费' },
  { name: '商城', icon: '🛒', desc: '商品折扣优惠' },
  { name: '圈子', icon: '👥', desc: '入圈优惠' },
  { name: '客服', icon: '🎧', desc: '专属客服通道' },
  { name: '标识', icon: '👑', desc: '专属会员标识' },
]

const selectedPlan = computed(() => plans.value[selectedPlanIndex.value])

const planNameLabel = computed(() => {
  const m: Record<string, string> = {
    MONTHLY: '月会员', YEARLY: '年会员', LIFETIME: '终身会员',
  }
  return m[memberStatus.value?.level || ''] || '会员'
})

const compareRows = [
  { name: 'AI排盘分析', free: '限1次/天', monthly: '无限次', yearly: '无限次', lifetime: '无限次' },
  { name: '智能体额度', free: '5次/天', monthly: '25次/天', yearly: '50次/天', lifetime: '无限' },
  { name: '免费课程', free: '--', monthly: '--', yearly: '部分', lifetime: '全部' },
  { name: '商城折扣', free: '--', monthly: '--', yearly: '95折', lifetime: '9折' },
  { name: '圈子优惠', free: '--', monthly: '--', yearly: '8折', lifetime: '7折' },
  { name: '专属客服', free: '--', monthly: '--', yearly: '--', lifetime: '✓' },
]

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  error.value = null
  selectedPlanIndex.value = 0
  try {
    const [plansRes, statusRes] = await Promise.all([
      memberApi.plans().catch(() => null),
      memberApi.myStatus().catch(() => null),
    ])

    if (plansRes && Array.isArray(plansRes) && plansRes.length > 0) {
      plans.value = plansRes.map((p: any) => ({
        level: p.level,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        unit: unitMap[p.level] || '',
        featured: p.level === 'YEARLY',
        benefits: Array.isArray(p.benefits) ? p.benefits : [],
      }))
    }

    const status: any = statusRes
    if (status) {
      memberStatus.value = {
        isMember: status.isMember ?? status.isVip ?? false,
        planName: status.planName,
        expireAt: status.expireAt || status.vipExpireAt,
        daysLeft: status.daysLeft,
        level: status.level,
      }
    } else if (userStore.isVip) {
      memberStatus.value = {
        isMember: true,
        expireAt: userStore.user?.vipExpireAt,
        level: userStore.user?.memberLevel || 'YEARLY',
      }
    }
  } catch (e) {
    error.value = '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function handleBuy() {
  showPaySheet.value = true
}

async function confirmPay() {
  if (!selectedPlan.value) return
  paying.value = true
  try {
    // 创建会员订单
    const orderRes = await shopApi.createOrder({
      type: 'MEMBER',
      targetId: `MEMBER_${selectedPlan.value.level}`,
      amount: selectedPlan.value.price,
    })
    const order = (orderRes as any).data || orderRes

    // 支付
    await shopApi.payOrder(order.id)

    // 刷新用户信息
    await userStore.fetchProfile()

    showPaySheet.value = false
    uni.showToast({ title: '开通成功！', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (e: any) {
    uni.showToast({ title: e.message || '支付失败', icon: 'none' })
  } finally {
    paying.value = false
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.page {
  background: $bg;
  min-height: 100vh;
  padding-bottom: 40rpx;
}

/* ── 会员头部 ── */
.vip-header {
  background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
  padding: 60rpx 32rpx 50rpx;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.vh-bg-deco {
  position: absolute;
  top: -60rpx;
  right: -60rpx;
  width: 300rpx;
  height: 300rpx;
  border-radius: 50%;
  background: rgba(201, 169, 110, 0.08);
}
.vh-bg-deco::after {
  content: '';
  position: absolute;
  bottom: -80rpx;
  left: -100rpx;
  width: 350rpx;
  height: 350rpx;
  border-radius: 50%;
  background: rgba(201, 169, 110, 0.05);
}
.vh-content {
  position: relative;
  z-index: 1;
}
.vh-icon {
  font-size: 56rpx;
  display: block;
  margin-bottom: 16rpx;
}
.vh-title {
  font-size: 40rpx;
  font-weight: bold;
  background: linear-gradient(135deg, $gold, $gold-light);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: block;
}
.vh-sub {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
  display: block;
  margin-top: 8rpx;
}
.vh-badge {
  display: inline-flex;
  flex-direction: column;
  gap: 4rpx;
  margin-top: 20rpx;
  padding: 12rpx 24rpx;
  background: rgba(201, 169, 110, 0.12);
  border: 1rpx solid rgba(201, 169, 110, 0.3);
  border-radius: 16rpx;
  color: $gold;
  font-size: 24rpx;
}
.vh-expire,
.vh-days {
  font-size: 20rpx;
  opacity: 0.7;
}

/* ── 等级切换 ── */
.level-tabs {
  display: flex;
  margin: -24rpx 24rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  position: relative;
  z-index: 2;
}
.level-tab {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-bottom: 3rpx solid transparent;
  transition: all 0.2s;
}
.level-tab.active {
  border-bottom-color: $gold;
  background: #fdf8ee;
}
.lt-name {
  font-size: 26rpx;
  color: $text;
  display: block;
  font-weight: 500;
}
.lt-price {
  font-size: 20rpx;
  color: $gold;
  display: block;
  margin-top: 4rpx;
}

/* ── 权益图标 ── */
.benefit-icons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin: 0 24rpx 24rpx;
}
.bi-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  text-align: center;
}
.bi-icon {
  font-size: 48rpx;
  display: block;
  margin-bottom: 8rpx;
}
.bi-name {
  font-size: 24rpx;
  color: $text;
  font-weight: 500;
  display: block;
}
.bi-desc {
  font-size: 20rpx;
  color: $text-tertiary;
  display: block;
  margin-top: 4rpx;
}

/* ── 区块 ── */
.section {
  margin: 0 24rpx 24rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: $text;
  display: block;
  margin-bottom: 16rpx;
  padding-left: 12rpx;
  border-left: 4rpx solid $gold;
}

/* ── 套餐列表 ── */
.plans-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.plan-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  border: 2rpx solid $border;
  position: relative;
  overflow: hidden;
}
.plan-card.featured {
  border-color: $gold;
  box-shadow: 0 4rpx 24rpx rgba(201, 169, 110, 0.2);
}
.plan-card.selected {
  border-color: $gold-light;
  background: #fdf8ee;
}
.plan-ribbon {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  background: linear-gradient(135deg, $gold, $gold-light);
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-weight: 500;
}
.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
}
.plan-name {
  font-size: 30rpx;
  font-weight: bold;
  color: $text;
  display: block;
}
.plan-original {
  font-size: 22rpx;
  color: $text-tertiary;
  text-decoration: line-through;
  display: block;
  margin-top: 4rpx;
}
.plan-price {
  text-align: right;
}
.price-symbol {
  font-size: 24rpx;
  color: $primary;
  font-weight: bold;
}
.price-num {
  font-size: 44rpx;
  font-weight: bold;
  color: $primary;
}
.price-unit {
  font-size: 22rpx;
  color: $text-tertiary;
}
.plan-benefits {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid $border-light;
}
.plan-benefit {
  font-size: 24rpx;
  color: $text-secondary;
}

/* ── 购买区 ── */
.buy-section {
  margin: 0 24rpx 24rpx;
}
.buy-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, $primary, $primary-dark);
  color: #fff;
  border: none;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(196, 30, 58, 0.3);
}
.buy-btn:active {
  transform: scale(0.98);
}
.buy-disclaimer {
  text-align: center;
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: $text-tertiary;
}

/* ── 权益对比表 ── */
.compare-table {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.compare-row {
  display: flex;
  padding: 18rpx 20rpx;
  border-bottom: 1rpx solid $border-light;
  font-size: 24rpx;
}
.compare-row.head {
  background: linear-gradient(135deg, $primary, $primary-dark);
  color: #fff;
  font-weight: bold;
  font-size: 22rpx;
}
.compare-row.head .col-name,
.compare-row.head .col-val {
  color: #fff;
}
.compare-row:last-child {
  border-bottom: none;
}
.col-name {
  flex: 2;
  color: $text;
  font-weight: 500;
}
.col-val {
  flex: 1;
  text-align: center;
  color: $text-secondary;
  font-size: 22rpx;
}

/* ── 支付弹窗 ── */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.pay-sheet {
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 40rpx 32rpx;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
  width: 100%;
  max-width: 600rpx;
}
.pay-title {
  font-size: 30rpx;
  font-weight: bold;
  color: $text;
  display: block;
  text-align: center;
  margin-bottom: 32rpx;
}
.pay-methods {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.pay-method {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 20rpx;
  border: 2rpx solid $border;
  border-radius: 16rpx;
}
.pay-method.active {
  border-color: $gold;
  background: #fdf8ee;
}
.pm-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.pm-icon {
  font-size: 36rpx;
}
.pm-name {
  font-size: 26rpx;
  color: $text;
  font-weight: 500;
}
.pm-check {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid $border;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: transparent;
}
.pm-check.checked {
  background: $gold;
  border-color: $gold;
  color: #fff;
}
.pay-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-top: 1rpx solid $border;
}
.pay-summary-label {
  font-size: 26rpx;
  color: $text;
}
.pay-summary-price {
  font-size: 36rpx;
  font-weight: bold;
  color: $primary;
}
.pay-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}
.pay-cancel {
  flex: 1;
  height: 80rpx;
  background: $bg;
  border: none;
  border-radius: 40rpx;
  font-size: 26rpx;
  color: $text-secondary;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pay-confirm {
  flex: 1.5;
  height: 80rpx;
  background: linear-gradient(135deg, $primary, $primary-dark);
  border: none;
  border-radius: 40rpx;
  font-size: 28rpx;
  color: #fff;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pay-confirm[disabled] {
  opacity: 0.5;
}
</style>
