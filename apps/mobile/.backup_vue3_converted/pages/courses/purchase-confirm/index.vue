<template>
  <!-- 加载骨架 -->
  <view v-if="isLoading" class="min-h-screen bg-background">
    <view class="h-12 bg-white" />
    <view class="p-4 space-y-4">
      <view class="bg-white rounded-xl p-4">
        <view class="flex gap-3">
          <view class="w-24 h-[72px] bg-[#F2EFEA] rounded-lg animate-pulse" />
          <view class="flex-1 space-y-2">
            <view class="h-5 bg-[#F2EFEA] rounded w-3/4" />
            <view class="h-4 bg-[#F2EFEA] rounded w-1/2" />
            <view class="h-6 bg-[#F2EFEA] rounded w-1/3" />
          </view>
        </view>
      </view>
      <view class="bg-white rounded-xl p-4 space-y-3">
        <view class="h-5 bg-[#F2EFEA] rounded w-1/4" />
        <view class="h-16 bg-[#F2EFEA] rounded" />
        <view class="h-16 bg-[#F2EFEA] rounded" />
      </view>
    </view>
  </view>

  <!-- 主内容 -->
  <view v-else class="min-h-screen bg-background pb-32">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center h-12 px-4">
        <view class="p-1 -ml-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
        <text class="flex-1 text-center text-base font-medium text-foreground">确认订单</text>
        <view class="w-6" />
      </view>
    </view>

    <view class="p-4 space-y-3">
      <!-- 课程信息 -->
      <view class="bg-white rounded-xl p-4 shadow-sm">
        <view class="flex gap-3">
          <image :src="course?.cover" mode="aspectFill" class="w-24 h-[72px] rounded-lg flex-shrink-0" />
          <view class="flex-1 min-w-0">
            <text class="text-sm font-medium text-foreground line-clamp-2 mb-1 block">{{ course?.title }}</text>
            <text class="text-xs text-muted-foreground mb-2 block">{{ course?.instructor?.name }} | {{ course?.chapters }}课时</text>
            <view class="flex items-baseline gap-2">
              <text class="text-lg font-bold text-primary">¥{{ course?.price }}</text>
              <text class="text-xs text-muted-foreground line-through">¥{{ course?.originalPrice }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 优惠券 -->
      <view class="bg-white rounded-xl shadow-sm">
        <view class="w-full p-4 flex items-center justify-between" @click="showCouponList = !showCouponList">
          <view class="flex items-center gap-2">
            <text class="text-primary text-lg">️</text>
            <text class="text-sm font-medium text-foreground">优惠券</text>
            <text v-if="availableCoupons.length > 0" class="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{{ availableCoupons.length }}张可用</text>
          </view>
          <view class="flex items-center gap-1">
            <text v-if="selectedCouponData" class="text-sm text-primary">-¥{{ priceResult?.couponUsed?.discount || 0 }}</text>
            <text v-else-if="availableCoupons.length > 0" class="text-sm text-muted-foreground">选择优惠券</text>
            <text v-else class="text-sm text-muted-foreground">暂无可用</text>
            <text :class="['text-muted-foreground text-lg transition-transform', showCouponList ? 'rotate-90' : '']">›</text>
          </view>
        </view>

        <!-- 优惠券列表 -->
        <view v-if="showCouponList" class="border-t border-[#F2EFEA] p-4 space-y-2">
          <view
            :class="['w-full p-3 rounded-lg border-2 flex items-center justify-between transition-all', !selectedCoupon ? 'border-primary bg-primary/5' : 'border-border']"
            @click="handleSelectCoupon(null)"
          >
            <text class="text-sm text-ink-soft">不使用优惠券</text>
            <text v-if="!selectedCoupon" class="text-primary font-bold">✓</text>
          </view>

          <view
            v-for="coupon in coupons"
            :key="coupon.id"
            :class="[
              'w-full p-3 rounded-lg border-2 transition-all',
              selectedCoupon === coupon.id ? 'border-primary bg-primary/5' : 'border-border',
              !isCouponAvailable(coupon) ? 'opacity-50' : ''
            ]"
            @click="isCouponAvailable(coupon) && handleSelectCoupon(coupon.id)"
          >
            <view class="flex items-center justify-between">
              <view class="flex items-center gap-3">
                <view class="w-14 h-14 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex flex-col items-center justify-center text-white">
                  <template v-if="coupon.type === 'percent'">
                    <text class="text-base font-bold">{{ coupon.value }}%</text>
                    <text class="text-[10px]">折扣</text>
                  </template>
                  <template v-else>
                    <text class="text-[10px]">¥</text>
                    <text class="text-lg font-bold leading-none">{{ coupon.value }}</text>
                  </template>
                </view>
                <view class="text-left">
                  <text class="text-sm font-medium text-foreground block">{{ coupon.name }}</text>
                  <text class="text-xs text-muted-foreground block">满{{ coupon.minAmount }}可用</text>
                  <view class="flex items-center gap-1 mt-0.5">
                    <text class="text-[10px] text-muted-foreground">🕐</text>
                    <text class="text-[10px] text-muted-foreground">{{ coupon.expireAt }}到期</text>
                  </view>
                </view>
              </view>
              <text v-if="selectedCoupon === coupon.id" class="text-primary font-bold">✓</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 支付方式 -->
      <view class="bg-white rounded-xl p-4 shadow-sm">
        <text class="text-sm font-medium text-foreground mb-3 block">支付方式</text>
        <view class="space-y-2">
          <view
            v-for="method in payMethods"
            :key="method.id"
            :class="['w-full p-3 rounded-lg border-2 flex items-center justify-between transition-all', payMethod === method.id ? 'border-primary bg-primary/5' : 'border-border']"
            @click="payMethod = method.id"
          >
            <view class="flex items-center gap-3">
              <text class="text-xl">{{ method.icon }}</text>
              <text class="text-sm text-foreground">{{ method.name }}</text>
              <text v-if="method.balance !== undefined" class="text-xs text-muted-foreground">余额: {{ method.balance }}币</text>
            </view>
            <text v-if="payMethod === method.id" class="text-primary font-bold">✓</text>
          </view>
        </view>
      </view>

      <!-- 价格明细 -->
      <view class="bg-white rounded-xl p-4 shadow-sm">
        <text class="text-sm font-medium text-foreground mb-3 block">价格明细</text>
        <view class="text-sm space-y-2">
          <view class="flex justify-between">
            <text class="text-ink-soft">课程原价</text>
            <text class="text-foreground">¥{{ priceResult?.originalPrice || course?.price }}</text>
          </view>
          <view v-if="priceResult?.discountAmount" class="flex justify-between text-primary">
            <text>优惠券抵扣</text>
            <text>-¥{{ priceResult.discountAmount }}</text>
          </view>
          <view class="pt-2 border-t border-[#F2EFEA] flex justify-between items-baseline">
            <text class="text-ink-soft">实付金额</text>
            <text class="text-2xl font-bold text-primary">¥{{ priceResult?.finalPrice || course?.price }}</text>
          </view>
        </view>
      </view>

      <!-- 用户协议 -->
      <view class="flex items-start gap-2 px-1">
        <view
          :class="['w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors', agreed ? 'bg-primary border-primary' : 'border-[#CCC]']"
          @click="agreed = !agreed"
        >
          <text v-if="agreed" class="text-white text-xs font-bold">✓</text>
        </view>
        <text class="text-xs text-muted-foreground leading-relaxed">
          我已阅读并同意
          <text class="text-primary" @click="navigateToPolicy('/policy/user')">《用户协议》</text>
          和
          <text class="text-primary" @click="navigateToPolicy('/policy/privacy')">《隐私政策》</text>
          ，购买后不支持退款
        </text>
      </view>
    </view>

    <!-- 底部支付栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4" style="padding-bottom: calc(env(safe-area-inset-bottom) + 16px)">
      <view class="flex items-center gap-4">
        <view class="flex-1">
          <view class="flex items-baseline gap-1">
            <text class="text-xs text-ink-soft">实付</text>
            <text class="text-[10px] text-primary">¥</text>
            <text class="text-2xl font-bold text-primary">{{ priceResult?.finalPrice || course?.price }}</text>
          </view>
          <text v-if="priceResult?.discountAmount" class="text-xs text-muted-foreground">已优惠 ¥{{ priceResult.discountAmount }}</text>
        </view>
        <view
          :class="['px-8 py-3 rounded-full text-base font-bold flex items-center gap-2 transition-all', agreed && !isSubmitting ? 'bg-gradient-to-r from-primary to-[#E74C3C] text-white shadow-lg' : 'bg-[#CCC] text-white']"
          @click="handleSubmit"
        >
          <view v-if="isSubmitting" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <template v-else><text>🛡️</text><text>确认支付</text></template>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Instructor {
  id: string; name: string; avatar: string; title: string
}

interface Course {
  id: string; title: string; cover: string
  instructor?: Instructor
  price: number; originalPrice: number; students: number; rating: number
  chapters: number; category: string; isFree: boolean
}

interface Coupon {
  id: string; name: string; type: 'amount' | 'percent'
  value: number; minAmount?: number; maxDiscount?: number
  expireAt: string; scope: string[]; isAvailable: boolean
}

interface PriceCalcResult {
  originalPrice: number
  discountAmount: number
  finalPrice: number
  couponUsed?: { id: string; name: string; discount: number }
}

const mockCourse: Course = {
  id: '1', title: '八字命理入门到精通',
  cover: 'https://picsum.photos/seed/course1/400/300',
  instructor: { id: '1', name: '张老师', avatar: 'https://i.pravatar.cc/100?img=1', title: '资深命理师' },
  price: 299, originalPrice: 599, students: 2860, rating: 4.9, chapters: 32, category: '命理', isFree: false,
}

const mockCoupons: Coupon[] = [
  { id: '1', name: '新人专享券', type: 'amount', value: 50, minAmount: 100, expireAt: '2024-12-31', scope: ['course'], isAvailable: true },
  { id: '2', name: '课程9折券', type: 'percent', value: 10, minAmount: 200, maxDiscount: 100, expireAt: '2024-06-30', scope: ['course'], isAvailable: true },
  { id: '3', name: '满300减30', type: 'amount', value: 30, minAmount: 300, expireAt: '2024-07-15', scope: ['course'], isAvailable: false },
]

const payMethods = [
  { id: 'wechat', name: '微信支付', icon: '', color: 'text-green-500' },
  { id: 'alipay', name: '支付宝', icon: '', color: 'text-blue-500' },
  { id: 'coins', name: '学习币', icon: '', color: 'text-amber-500', balance: 150 },
]

const course = ref<Course | null>(null)
const coupons = ref<Coupon[]>([])
const selectedCoupon = ref<string | null>(null)
const payMethod = ref('wechat')
const priceResult = ref<PriceCalcResult | null>(null)
const agreed = ref(false)
const isLoading = ref(true)
const isSubmitting = ref(false)
const showCouponList = ref(false)

const selectedCouponData = computed(() => selectedCoupon.value ? coupons.value.find(c => c.id === selectedCoupon.value) : null)
const availableCoupons = computed(() => coupons.value.filter(c => c.isAvailable && (c.minAmount || 0) <= (course.value?.price || 0)))

function isCouponAvailable(coupon: Coupon): boolean {
  return coupon.isAvailable && (coupon.minAmount || 0) <= (course.value?.price || 0)
}

onMounted(() => {
  loadData()
})

function loadData() {
  isLoading.value = true
  setTimeout(() => {
    course.value = mockCourse
    coupons.value = mockCoupons
    priceResult.value = {
      originalPrice: mockCourse.price,
      discountAmount: 0,
      finalPrice: mockCourse.price,
    }
    isLoading.value = false
  }, 300)
}

function goBack() {
  uni.navigateBack()
}

function handleSelectCoupon(couponId: string | null) {
  selectedCoupon.value = couponId
  showCouponList.value = false
  if (!course.value) return

  if (couponId) {
    const coupon = coupons.value.find(c => c.id === couponId)
    if (coupon) {
      let discount = 0
      if (coupon.type === 'amount') {
        discount = coupon.value
      } else if (coupon.type === 'percent') {
        discount = Math.min(course.value.price * (coupon.value / 100), coupon.maxDiscount || Infinity)
      }
      priceResult.value = {
        originalPrice: course.value.price,
        discountAmount: discount,
        finalPrice: course.value.price - discount,
        couponUsed: { id: coupon.id, name: coupon.name, discount },
      }
    }
  } else {
    priceResult.value = {
      originalPrice: course.value.price,
      discountAmount: 0,
      finalPrice: course.value.price,
    }
  }
}

function handleSubmit() {
  if (!agreed.value || isSubmitting.value || !course.value) return
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    uni.redirectTo({ url: `/pages/payment/result/index?status=success&orderId=mock123` })
  }, 1000)
}

function navigateToPolicy(url: string) {
  // 导航到协议页面
}
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
