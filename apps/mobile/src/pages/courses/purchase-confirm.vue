<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <view class="course-summary">
        <image :src="course.cover || ''" class="cover" mode="aspectFill" />
        <text class="c-title">{{ course.title }}</text>
        <text class="c-price">¥{{ course.price }}</text>
      </view>
      <view class="section">
        <text class="section-title">优惠券</text>
        <view v-if="coupons.length" class="coupon-list">
          <view v-for="c in coupons" :key="c.id" class="coupon-item" :class="{ selected: selectedCoupon === c.id }" @click="selectCoupon(c)">
            <text class="coupon-amount">¥{{ c.amount || c.value }}</text>
            <text class="coupon-cond">{{ c.minAmount ? '满' + c.minAmount + '可用' : '无门槛' }}</text>
          </view>
        </view>
        <text v-else class="empty-tip">暂无可用优惠券</text>
      </view>
      <view class="total">
        <text class="total-label">实付</text>
        <text class="total-price">¥{{ finalPrice }}</text>
      </view>
      <button class="btn-pay" @click="pay">立即支付</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import { courseApi, shopApi } from '../../api'

const loading = ref(true)
const course = ref<any>({})
const coupons = ref<any[]>([])
const selectedCoupon = ref<string>('')

const finalPrice = computed(() => {
  const coupon = coupons.value.find(c => c.id === selectedCoupon.value)
  const discount = coupon ? (coupon.amount || coupon.value || 0) : 0
  return Math.max(0, (course.value.price || 0) - discount)
})

onMounted(async () => {
  const query = getCurrentPages().pop()?.options || {}
  const courseId = query.courseId || query.id || ''
  if (!courseId) { loading.value = false; return }
  try {
    const [detail, couponData] = await Promise.all([
      courseApi.detail(courseId),
      shopApi.myCoupons(),
    ])
    course.value = detail || {}
    coupons.value = Array.isArray(couponData) ? couponData : couponData?.data || couponData?.list || []
  } catch {} finally { loading.value = false }
})

function selectCoupon(c: any) {
  selectedCoupon.value = selectedCoupon.value === c.id ? '' : c.id
}
async function pay() {
  try {
    uni.showLoading({ title: '支付中' })
    const res: any = await courseApi.purchase(course.value.id, { couponId: selectedCoupon.value })
    uni.hideLoading()
    uni.navigateTo({ url: `/pages/shop/pay-success?orderId=${res?.orderId || res?.id}` })
  } catch { uni.hideLoading() }
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; padding-bottom: 80px; }
.course-summary { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.cover { width: 100%; height: 160px; border-radius: 8px; }
.c-title { font-size: 16px; font-weight: bold; margin-top: 12px; display: block; }
.c-price { font-size: 24px; color: #C41E3A; font-weight: bold; margin-top: 8px; display: block; }
.section { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.section-title { font-size: 14px; font-weight: 500; margin-bottom: 8px; display: block; }
.coupon-list { display: flex; flex-wrap: wrap; gap: 8px; }
.coupon-item { padding: 8px 16px; background: #F5F0E8; border-radius: 8px; border: 1px solid transparent; }
.coupon-item.selected { border-color: #C41E3A; background: #FFF0F0; }
.coupon-amount { font-size: 16px; color: #C41E3A; font-weight: bold; }
.coupon-cond { font-size: 11px; color: #999; display: block; }
.empty-tip { font-size: 13px; color: #999; }
.total { display: flex; justify-content: space-between; padding: 16px; background: #fff; border-radius: 12px; margin-bottom: 12px; }
.total-label { font-size: 14px; }
.total-price { font-size: 24px; color: #C41E3A; font-weight: bold; }
.btn-pay { width: calc(100% - 24px); height: 48px; position: fixed; bottom: 0; left: 12px; background: #C41E3A; color: #fff; border-radius: 24px; font-size: 16px; font-weight: bold; border: none; margin-bottom: 20px; }
</style>
