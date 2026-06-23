<script setup lang="ts">
/** 课程购买确认页 - 从原型 app/courses/purchase-confirm/page.tsx 迁移 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import { useSubmitLock } from '@/composables/use-submit-lock'
// @data-needs: 购买确认聚合, 参数 courseId, 返回 { course:PurchaseCourse, coupons:PurchaseCoupon[] }
// 通过 courseApi.getPurchaseData(id) 获取，mock/真实由 useMock() 控制
import { courseApi, type PurchaseCourse, type PurchaseCoupon } from '@/lib/course-data'

const selectedCoupon = ref<string | null>(null)
const payMethod = ref('wechat')
const agreed = ref(false)
const showCouponList = ref(false)
const { submitting, withLock } = useSubmitLock()

// 异步获取购买数据
const purchaseCourseId = ref('')
const course = ref<PurchaseCourse>({} as PurchaseCourse)
const coupons = ref<PurchaseCoupon[]>([])

onLoad((opts?: Record<string, string>) => {
  if (opts?.id) purchaseCourseId.value = opts.id
})

onMounted(async () => {
  const res = await courseApi.getPurchaseData(purchaseCourseId.value || '1')
  course.value = res.course
  coupons.value = res.coupons
})

const payMethods = [
  { id: 'wechat', name: '微信支付', icon: 'smartphone', color: '#22c55e' },
  { id: 'alipay', name: '支付宝', icon: 'credit-card', color: '#3b82f6' },
  { id: 'unionpay', name: '云闪付', icon: 'landmark', color: '#ef4444' },
  { id: 'huifu', name: '汇付天下', icon: 'building-2', color: '#f97316' },
]

const availableCoupons = computed(() => coupons.value.filter((c) => c.isAvailable && c.minAmount <= course.value.price))
const selectedCouponData = computed(() => (selectedCoupon.value ? coupons.value.find((c) => c.id === selectedCoupon.value) : null))
const discount = computed(() => {
  const c = selectedCouponData.value
  if (!c) return 0
  if (c.type === 'amount') return c.value
  return Math.min(course.value.price * (c.value / 100), c.maxDiscount || Infinity)
})
const finalPrice = computed(() => course.value.price - discount.value)

function selectCoupon(id: string | null) {
  selectedCoupon.value = id
  showCouponList.value = false
}
function isCouponAvailable(c: PurchaseCoupon) {
  return c.isAvailable && c.minAmount <= course.value.price
}
async function submitPay() {
  if (!agreed.value) return
  await withLock(async () => {
    // @todo: 接入真实支付接口
    uni.showToast({ title: '支付成功', icon: 'success' })
  })
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view
        class="nav-back"
        @tap="goBack"
      >
        <app-icon
          name="arrow-left"
          :size="40"
          color="#2C2C2C"
        />
      </view>
      <text class="nav-title">
        确认订单
      </text>
      <view class="nav-right" />
    </view>

    <view class="body">
      <!-- 课程信息 -->
      <view class="card course-card">
        <image
          class="course-cover"
          :src="course.cover"
          mode="aspectFill"
        />
        <view class="course-info">
          <text class="course-title">
            {{ course.title }}
          </text>
          <text class="course-meta">
            {{ course.instructorName }} | {{ course.chapters }}课时
          </text>
          <view class="course-price">
            <text class="price-now">
              ¥{{ course.price }}
            </text>
            <text class="price-old">
              ¥{{ course.originalPrice }}
            </text>
          </view>
        </view>
      </view>

      <!-- 优惠券 -->
      <view class="card">
        <view
          class="coupon-head"
          @tap="showCouponList = !showCouponList"
        >
          <view class="coupon-head-left">
            <app-icon
              name="tag"
              :size="40"
              color="#C41E3A"
            />
            <text class="coupon-label">
              优惠券
            </text>
            <text
              v-if="availableCoupons.length > 0"
              class="coupon-badge"
            >
              {{ availableCoupons.length }}张可用
            </text>
          </view>
          <view class="coupon-head-right">
            <text
              v-if="selectedCouponData"
              class="coupon-discount"
            >
              -¥{{ discount }}
            </text>
            <text
              v-else-if="availableCoupons.length > 0"
              class="coupon-hint"
            >
              选择优惠券
            </text>
            <text
              v-else
              class="coupon-hint"
            >
              暂无可用
            </text>
            <app-icon
              name="chevron-right"
              :size="32"
              color="#999999"
              :class="{ rotated: showCouponList }"
            />
          </view>
        </view>

        <view
          v-if="showCouponList"
          class="coupon-list"
        >
          <view
            class="coupon-item simple"
            :class="{ active: !selectedCoupon }"
            @tap="selectCoupon(null)"
          >
            <text class="coupon-none-txt">
              不使用优惠券
            </text>
            <app-icon
              v-if="!selectedCoupon"
              name="check"
              :size="40"
              color="#C41E3A"
            />
          </view>
          <view
            v-for="c in coupons"
            :key="c.id"
            class="coupon-item"
            :class="{ active: selectedCoupon === c.id, disabled: !isCouponAvailable(c) }"
            @tap="isCouponAvailable(c) && selectCoupon(c.id)"
          >
            <view class="coupon-item-left">
              <view class="coupon-val">
                <template v-if="c.type === 'percent'">
                  <text class="coupon-val-num">
                    {{ c.value }}%
                  </text>
                  <text class="coupon-val-unit">
                    折扣
                  </text>
                </template>
                <template v-else>
                  <text class="coupon-val-yen">
                    ¥
                  </text>
                  <text class="coupon-val-num2">
                    {{ c.value }}
                  </text>
                </template>
              </view>
              <view class="coupon-detail">
                <text class="coupon-name">
                  {{ c.name }}
                </text>
                <text class="coupon-min">
                  满{{ c.minAmount }}可用
                </text>
                <view class="coupon-expire">
                  <app-icon
                    name="clock"
                    :size="24"
                    color="#999999"
                  />
                  <text class="coupon-expire-txt">
                    {{ c.expireAt }}到期
                  </text>
                </view>
              </view>
            </view>
            <app-icon
              v-if="selectedCoupon === c.id"
              name="check"
              :size="40"
              color="#C41E3A"
            />
          </view>
        </view>
      </view>

      <!-- 支付方式 -->
      <view class="card">
        <text class="section-title">
          支付方式
        </text>
        <view class="pay-list">
          <view
            v-for="m in payMethods"
            :key="m.id"
            class="pay-item"
            :class="{ active: payMethod === m.id }"
            @tap="payMethod = m.id"
          >
            <view class="pay-item-left">
              <app-icon
                :name="m.icon"
                :size="48"
                :color="m.color"
              />
              <text class="pay-name">
                {{ m.name }}
              </text>
            </view>
            <app-icon
              v-if="payMethod === m.id"
              name="check"
              :size="40"
              color="#C41E3A"
            />
          </view>
        </view>
      </view>

      <!-- 价格明细 -->
      <view class="card">
        <text class="section-title">
          价格明细
        </text>
        <view class="price-rows">
          <view class="price-row">
            <text class="price-row-label">
              课程原价
            </text>
            <text class="price-row-val">
              ¥{{ course.price }}
            </text>
          </view>
          <view
            v-if="discount"
            class="price-row discount"
          >
            <text class="price-row-label red">
              优惠券抵扣
            </text>
            <text class="price-row-val red">
              -¥{{ discount }}
            </text>
          </view>
          <view class="price-row total">
            <text class="price-row-label">
              实付金额
            </text>
            <text class="price-total">
              ¥{{ finalPrice }}
            </text>
          </view>
        </view>
      </view>

      <!-- 用户协议 -->
      <view class="agree">
        <view
          class="agree-box"
          :class="{ checked: agreed }"
          @tap="agreed = !agreed"
        >
          <app-icon
            v-if="agreed"
            name="check"
            :size="24"
            color="#ffffff"
          />
        </view>
        <text class="agree-txt">
          我已阅读并同意<text class="agree-link">
            《用户协议》
          </text>和<text class="agree-link">
            《隐私政策》
          </text>，购买后不支持退款
        </text>
      </view>
    </view>

    <!-- 底部支付栏 -->
    <view class="footer">
      <view class="footer-price">
        <view class="footer-price-row">
          <text class="footer-pay-label">
            实付
          </text>
          <text class="footer-yen">
            ¥
          </text>
          <text class="footer-amount">
            {{ finalPrice }}
          </text>
        </view>
        <text
          v-if="discount"
          class="footer-saved"
        >
          已优惠 ¥{{ discount }}
        </text>
      </view>
      <view
        class="footer-btn"
        :class="{ disabled: !agreed || submitting }"
        @tap="submitPay"
      >
        <app-icon
          name="shield-check"
          :size="40"
          color="#ffffff"
        />
        <text class="footer-btn-txt">
          {{ submitting ? '支付中...' : '确认支付' }}
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; padding-bottom: 160rpx; }

.nav { position: sticky; top: 0; z-index: 50; background: #fff; border-bottom: 1rpx solid #E8E3DB; display: flex; align-items: center; height: 96rpx; padding: 0 32rpx; }
.nav-back { margin-left: -8rpx; padding: 8rpx; }
.nav-title { flex: 1; text-align: center; font-size: 32rpx; font-weight: 500; color: #2C2C2C; }
.nav-right { width: 48rpx; }

.body { padding: 32rpx; display: flex; flex-direction: column; gap: 24rpx; }
.card { background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }

.course-card { display: flex; gap: 24rpx; }
.course-cover { width: 192rpx; height: 144rpx; border-radius: 16rpx; flex-shrink: 0; background: #F2EFEA; }
.course-info { flex: 1; min-width: 0; }
.course-title { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 8rpx; line-height: 1.4; }
.course-meta { display: block; font-size: 24rpx; color: #999; margin-bottom: 16rpx; }
.course-price { display: flex; align-items: baseline; gap: 16rpx; }
.price-now { font-size: 36rpx; font-weight: 700; color: #C41E3A; }
.price-old { font-size: 24rpx; color: #999; text-decoration: line-through; }

.coupon-head { display: flex; align-items: center; justify-content: space-between; }
.coupon-head-left { display: flex; align-items: center; gap: 16rpx; }
.coupon-label { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.coupon-badge { font-size: 20rpx; color: #C41E3A; background: rgba(196,30,58,0.1); padding: 4rpx 12rpx; border-radius: 8rpx; }
.coupon-head-right { display: flex; align-items: center; gap: 8rpx; }
.coupon-discount { font-size: 28rpx; color: #C41E3A; }
.coupon-hint { font-size: 28rpx; color: #999; }
.rotated { transform: rotate(90deg); }

.coupon-list { border-top: 1rpx solid #F2EFEA; margin-top: 32rpx; padding-top: 32rpx; display: flex; flex-direction: column; gap: 16rpx; }
.coupon-item { border: 4rpx solid #E8E3DB; border-radius: 16rpx; padding: 24rpx; display: flex; align-items: center; justify-content: space-between; }
.coupon-item.simple { justify-content: space-between; }
.coupon-item.active { border-color: #C41E3A; background: rgba(196,30,58,0.05); }
.coupon-item.disabled { opacity: 0.5; }
.coupon-none-txt { font-size: 28rpx; color: #666; }
.coupon-item-left { display: flex; align-items: center; gap: 24rpx; }
.coupon-val { width: 112rpx; height: 112rpx; border-radius: 16rpx; background: linear-gradient(135deg, #C41E3A, #8B0000); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; }
.coupon-val-num { font-size: 32rpx; font-weight: 700; color: #fff; }
.coupon-val-unit { font-size: 20rpx; color: #fff; }
.coupon-val-yen { font-size: 20rpx; color: #fff; }
.coupon-val-num2 { font-size: 36rpx; font-weight: 700; color: #fff; line-height: 1; }
.coupon-detail { text-align: left; }
.coupon-name { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.coupon-min { display: block; font-size: 24rpx; color: #999; }
.coupon-expire { display: flex; align-items: center; gap: 4rpx; margin-top: 4rpx; }
.coupon-expire-txt { font-size: 20rpx; color: #999; }

.section-title { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 24rpx; }
.pay-list { display: flex; flex-direction: column; gap: 16rpx; }
.pay-item { border: 4rpx solid #E8E3DB; border-radius: 16rpx; padding: 24rpx; display: flex; align-items: center; justify-content: space-between; }
.pay-item.active { border-color: #C41E3A; background: rgba(196,30,58,0.05); }
.pay-item-left { display: flex; align-items: center; gap: 24rpx; }
.pay-name { font-size: 28rpx; color: #2C2C2C; }

.price-rows { display: flex; flex-direction: column; gap: 16rpx; }
.price-row { display: flex; align-items: center; justify-content: space-between; }
.price-row-label { font-size: 28rpx; color: #666; }
.price-row-val { font-size: 28rpx; color: #2C2C2C; }
.price-row-label.red, .price-row-val.red { color: #C41E3A; }
.price-row.total { padding-top: 16rpx; border-top: 1rpx solid #F2EFEA; align-items: baseline; }
.price-total { font-size: 48rpx; font-weight: 700; color: #C41E3A; }

.agree { display: flex; align-items: flex-start; gap: 16rpx; padding: 0 8rpx; }
.agree-box { width: 40rpx; height: 40rpx; border-radius: 8rpx; border: 4rpx solid #CCC; flex-shrink: 0; margin-top: 4rpx; display: flex; align-items: center; justify-content: center; }
.agree-box.checked { background: #C41E3A; border-color: #C41E3A; }
.agree-txt { font-size: 24rpx; color: #999; line-height: 1.6; }
.agree-link { color: #C41E3A; }

.footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E8E3DB; padding: 24rpx 32rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 32rpx; }
.footer-price { flex: 1; }
.footer-price-row { display: flex; align-items: baseline; gap: 4rpx; }
.footer-pay-label { font-size: 24rpx; color: #666; }
.footer-yen { font-size: 20rpx; color: #C41E3A; }
.footer-amount { font-size: 48rpx; font-weight: 700; color: #C41E3A; }
.footer-saved { font-size: 22rpx; color: #999; }
.footer-btn { display: flex; align-items: center; gap: 12rpx; padding: 24rpx 64rpx; border-radius: 999rpx; background: linear-gradient(to right, #C41E3A, #E74C3C); box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); }
.footer-btn.disabled { background: #CCC; box-shadow: none; }
.footer-btn-txt { font-size: 32rpx; font-weight: 700; color: #fff; }
</style>
