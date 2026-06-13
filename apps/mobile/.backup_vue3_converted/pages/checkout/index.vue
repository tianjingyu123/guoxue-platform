<template>
  <view class="min-h-screen" style="background-color: #FAF8F5; padding-bottom: 192rpx;">
    <!-- 加载态 -->
    <view v-if="loading" class="flex items-center justify-center" style="min-height: 100vh;">
      <text style="font-size: 48rpx; color: #C41E3A;"></text>
    </view>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-50" style="background-color: rgba(250,248,245,0.95); backdrop-filter: blur(20rpx); border-bottom: 2rpx solid #E8E0D5;">
        <view class="flex items-center justify-between" style="max-width: 750rpx; margin: 0 auto; padding: 0 32rpx; height: 96rpx;">
          <view @click="goBack" style="padding: 16rpx;">
            <text style="font-size: 36rpx; color: #2C2C2C;">&#8592;</text>
          </view>
          <text style="font-size: 30rpx; font-weight: 600; color: #2C2C2C;">确认订单</text>
          <view style="width: 72rpx;" />
        </view>
      </view>

      <view style="max-width: 750rpx; margin: 0 auto; padding: 32rpx; display: flex; flex-direction: column; gap: 24rpx;">
        <!-- 收货地址区 -->
        <view @click="goTo('/pages/address/index')" style="background-color: #FFFFFF; border-radius: 24rpx; padding: 32rpx;">
          <view v-if="hasAddress" class="flex items-start" style="gap: 24rpx;">
            <view style="width: 80rpx; height: 80rpx; border-radius: 50%; background-color: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4rpx;">
              <text style="font-size: 36rpx; color: #C41E3A;">📍</text>
            </view>
            <view style="flex: 1; min-width: 0;">
              <view class="flex items-center" style="gap: 16rpx; margin-bottom: 8rpx;">
                <text style="font-size: 28rpx; font-weight: 600; color: #2C2C2C;">{{ defaultAddress.name }}</text>
                <text style="font-size: 24rpx; color: #999999;">{{ defaultAddress.phone }}</text>
                <view v-if="defaultAddress.isDefault" style="font-size: 20rpx; padding: 4rpx 12rpx; background-color: rgba(196,30,58,0.1); color: #C41E3A; border-radius: 8rpx;">
                  <text>默认</text>
                </view>
              </view>
              <text style="font-size: 24rpx; color: #999999; display: block; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                {{ defaultAddress.province }} {{ defaultAddress.city }} {{ defaultAddress.detail }}
              </text>
            </view>
            <text style="font-size: 32rpx; color: #999999; flex-shrink: 0;">›</text>
          </view>
          <view v-else class="flex items-center" style="gap: 24rpx;">
            <view style="width: 80rpx; height: 80rpx; border-radius: 50%; background-color: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center;">
              <text style="font-size: 36rpx; color: #C41E3A;">+</text>
            </view>
            <view style="flex: 1;">
              <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block;">请添加收货地址</text>
              <text style="font-size: 22rpx; color: #999999; margin-top: 4rpx;">添加地址后才能下单</text>
            </view>
            <text style="font-size: 32rpx; color: #999999;">›</text>
          </view>
        </view>

        <!-- 商品清单区 -->
        <view style="background-color: #FFFFFF; border-radius: 24rpx; overflow: hidden;">
          <view style="padding: 24rpx 32rpx; border-bottom: 2rpx solid #E8E0D5;">
            <text style="font-size: 26rpx; font-weight: 600; color: #2C2C2C;">商品清单</text>
          </view>
          <view>
            <view v-for="item in orderItems" :key="item.id" style="padding: 32rpx; display: flex; gap: 24rpx; border-bottom: 2rpx solid #E8E0D5;">
              <view style="width: 160rpx; height: 160rpx; border-radius: 16rpx; background-color: #F5F1EB; overflow: hidden; flex-shrink: 0;">
                <image :src="item.image" mode="aspectFill" style="width: 100%; height: 100%;" />
              </view>
              <view style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between;">
                <view>
                  <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.name }}</text>
                  <text style="font-size: 22rpx; color: #999999; margin-top: 4rpx; display: block;">{{ item.spec }}</text>
                </view>
                <view class="flex items-center justify-between">
                  <text style="font-size: 28rpx; font-weight: 600; color: #C41E3A;">&yen;{{ item.price }}</text>
                  <text style="font-size: 24rpx; color: #999999;">x{{ item.quantity }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 优惠券选择 -->
        <view @click="showCouponPanel = true" style="background-color: #FFFFFF; border-radius: 24rpx; padding: 32rpx;">
          <view class="flex items-center justify-between">
            <view class="flex items-center" style="gap: 24rpx;">
              <text style="font-size: 36rpx; color: #C41E3A;"></text>
              <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C;">优惠券</text>
            </view>
            <view class="flex items-center" style="gap: 16rpx;">
              <text v-if="selectedCoupon" style="font-size: 24rpx; color: #C41E3A;">-&yen;{{ selectedCoupon.discount }}</text>
              <text v-else style="font-size: 24rpx; color: #999999;">{{ availableCoupons.length }}张可用</text>
              <text style="font-size: 28rpx; color: #999999;">›</text>
            </view>
          </view>
        </view>

        <!-- 订单备注 -->
        <view style="background-color: #FFFFFF; border-radius: 24rpx; padding: 32rpx;">
          <view class="flex items-center" style="gap: 24rpx;">
            <text style="font-size: 32rpx; color: #999999;"></text>
            <input v-model="orderNote" placeholder="添加订单备注..." maxlength="100"
              style="flex: 1; font-size: 24rpx; background-color: transparent; color: #2C2C2C;"
              placeholder-style="color: #999999;" />
            <text v-if="orderNote" style="font-size: 22rpx; color: #999999;">{{ orderNote.length }}/100</text>
          </view>
        </view>

        <!-- 发票选择 -->
        <view @click="showInvoicePanel = true" style="background-color: #FFFFFF; border-radius: 24rpx; padding: 32rpx;">
          <view class="flex items-center justify-between">
            <view class="flex items-center" style="gap: 24rpx;">
              <text style="font-size: 32rpx; color: #999999;"></text>
              <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C;">发票</text>
            </view>
            <view class="flex items-center" style="gap: 16rpx;">
              <text style="font-size: 24rpx; color: #999999;">{{ invoiceType === 'none' ? '不开发票' : invoiceType === 'personal' ? '个人发票' : '企业发票' }}</text>
              <text style="font-size: 28rpx; color: #999999;">›</text>
            </view>
          </view>
        </view>

        <!-- 价格明细 -->
        <view style="background-color: #FFFFFF; border-radius: 24rpx; padding: 32rpx;">
          <text style="font-size: 26rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 24rpx; display: block;">价格明细</text>
          <view style="display: flex; flex-direction: column; gap: 16rpx; font-size: 24rpx;">
            <view class="flex items-center justify-between">
              <text style="color: #999999;">商品总额</text>
              <text style="color: #2C2C2C;">&yen;{{ subtotal.toFixed(2) }}</text>
            </view>
            <view class="flex items-center justify-between">
              <text style="color: #999999;">运费</text>
              <text style="color: #2C2C2C;">{{ shipping === 0 ? '包邮' : '¥' + shipping.toFixed(2) }}</text>
            </view>
            <view v-if="couponDiscount > 0" class="flex items-center justify-between">
              <text style="color: #999999;">优惠券抵扣</text>
              <text style="color: #C41E3A;">-&yen;{{ couponDiscount.toFixed(2) }}</text>
            </view>
            <view class="flex items-center justify-between" style="padding-top: 16rpx; margin-top: 16rpx; border-top: 2rpx solid #E8E0D5;">
              <text style="font-weight: 500; color: #2C2C2C;">实付金额</text>
              <text style="font-size: 40rpx; font-weight: 700; color: #C41E3A;">&yen;{{ totalPrice.toFixed(2) }}</text>
            </view>
          </view>
        </view>

        <!-- 支付方式 -->
        <view style="background-color: #FFFFFF; border-radius: 24rpx; padding: 32rpx;">
          <text style="font-size: 26rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 24rpx; display: block;">支付方式</text>
          <view style="display: flex; flex-direction: column; gap: 16rpx;">
            <!-- 微信支付 -->
            <view @click="paymentMethod = 'wechat'"
              :style="{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '24rpx',
                borderRadius: '16rpx',
                border: '2rpx solid',
                borderColor: paymentMethod === 'wechat' ? '#C41E3A' : '#E8E0D5',
                backgroundColor: paymentMethod === 'wechat' ? 'rgba(196,30,58,0.05)' : '#FFFFFF'
              }">
              <view class="flex items-center" style="gap: 24rpx;">
                <view style="width: 64rpx; height: 64rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; background-color: #07C160;">
                  <text style="font-size: 28rpx; color: #FFFFFF;"></text>
                </view>
                <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C;">微信支付</text>
              </view>
              <view :style="{
                width: '40rpx',
                height: '40rpx',
                borderRadius: '50%',
                border: '4rpx solid',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: paymentMethod === 'wechat' ? '#C41E3A' : '#999999',
                backgroundColor: paymentMethod === 'wechat' ? '#C41E3A' : 'transparent'
              }">
                <text v-if="paymentMethod === 'wechat'" style="font-size: 20rpx; color: #FFFFFF;">✓</text>
              </view>
            </view>

            <!-- 支付宝 -->
            <view @click="paymentMethod = 'alipay'"
              :style="{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '24rpx',
                borderRadius: '16rpx',
                border: '2rpx solid',
                borderColor: paymentMethod === 'alipay' ? '#C41E3A' : '#E8E0D5',
                backgroundColor: paymentMethod === 'alipay' ? 'rgba(196,30,58,0.05)' : '#FFFFFF'
              }">
              <view class="flex items-center" style="gap: 24rpx;">
                <view style="width: 64rpx; height: 64rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; background-color: #1677FF;">
                  <text style="font-size: 28rpx; color: #FFFFFF;"></text>
                </view>
                <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C;">支付宝</text>
              </view>
              <view :style="{
                width: '40rpx',
                height: '40rpx',
                borderRadius: '50%',
                border: '4rpx solid',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: paymentMethod === 'alipay' ? '#C41E3A' : '#999999',
                backgroundColor: paymentMethod === 'alipay' ? '#C41E3A' : 'transparent'
              }">
                <text v-if="paymentMethod === 'alipay'" style="font-size: 20rpx; color: #FFFFFF;">✓</text>
              </view>
            </view>

            <!-- 国学币余额 -->
            <view @click="balanceAmount >= totalPrice ? (paymentMethod = 'balance') : () => {}"
              :style="{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '24rpx',
                borderRadius: '16rpx',
                border: '2rpx solid',
                borderColor: paymentMethod === 'balance' ? '#C41E3A' : '#E8E0D5',
                backgroundColor: paymentMethod === 'balance' ? 'rgba(196,30,58,0.05)' : '#FFFFFF',
                opacity: balanceAmount < totalPrice ? 0.5 : 1
              }">
              <view class="flex items-center" style="gap: 24rpx;">
                <view style="width: 64rpx; height: 64rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; background-color: #C9A96E;">
                  <text style="font-size: 28rpx; color: #FFFFFF;"></text>
                </view>
                <view>
                  <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block;">国学币余额</text>
                  <text style="font-size: 22rpx; color: #999999;">
                    可用 &yen;{{ balanceAmount.toFixed(2) }}{{ balanceAmount < totalPrice ? ' (余额不足)' : '' }}
                  </text>
                </view>
              </view>
              <view :style="{
                width: '40rpx',
                height: '40rpx',
                borderRadius: '50%',
                border: '4rpx solid',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: paymentMethod === 'balance' ? '#C41E3A' : '#999999',
                backgroundColor: paymentMethod === 'balance' ? '#C41E3A' : 'transparent'
              }">
                <text v-if="paymentMethod === 'balance'" style="font-size: 20rpx; color: #FFFFFF;">✓</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部固定操作栏 -->
      <view style="position: fixed; bottom: 0; left: 0; right: 0; background-color: rgba(255,255,255,0.95); backdrop-filter: blur(20rpx); border-top: 2rpx solid #E8E0D5; padding-bottom: env(safe-area-inset-bottom);">
        <view class="flex items-center justify-between" style="max-width: 750rpx; margin: 0 auto; padding: 24rpx 32rpx;">
          <view>
            <text style="font-size: 24rpx; color: #999999;">实付：</text>
            <text style="font-size: 40rpx; font-weight: 700; color: #C41E3A;">&yen;{{ totalPrice.toFixed(2) }}</text>
          </view>
          <view v-if="hasAddress" @click="goTo('/pages/payment/result?status=success')"
            style="padding: 20rpx 64rpx; border-radius: 999rpx; font-size: 26rpx; font-weight: 600; background-color: #C41E3A; color: #FFFFFF; transition: all 0.2s;">
            <text>立即支付</text>
          </view>
          <view v-else
            style="padding: 20rpx 64rpx; border-radius: 999rpx; font-size: 26rpx; font-weight: 600; background-color: #F0EBE5; color: #999999;">
            <text>立即支付</text>
          </view>
        </view>
      </view>

      <!-- 优惠券选择面板 -->
      <view v-if="showCouponPanel" style="position: fixed; inset: 0; z-index: 999;">
        <view style="position: absolute; inset: 0; background-color: rgba(0,0,0,0.6);" @click="showCouponPanel = false" />
        <view style="position: absolute; bottom: 0; left: 0; right: 0; background-color: #FFFFFF; border-radius: 32rpx 32rpx 0 0; max-height: 70vh; overflow: hidden;">
          <view class="flex items-center justify-between" style="padding: 32rpx; border-bottom: 2rpx solid #E8E0D5;">
            <text style="font-size: 28rpx; font-weight: 600; color: #2C2C2C;">选择优惠券</text>
            <text @click="showCouponPanel = false" style="font-size: 24rpx; color: #999999;">完成</text>
          </view>
          <scroll-view scroll-y style="padding: 32rpx; max-height: 50vh; display: flex; flex-direction: column; gap: 24rpx;">
            <!-- 不使用优惠券选项 -->
            <view @click="selectedCoupon = null; showCouponPanel = false"
              :style="{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '32rpx',
                borderRadius: '16rpx',
                border: '2rpx solid',
                borderColor: !selectedCoupon ? '#C41E3A' : '#E8E0D5',
                backgroundColor: !selectedCoupon ? 'rgba(196,30,58,0.05)' : '#FFFFFF',
                marginBottom: '24rpx'
              }">
              <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C;">不使用优惠券</text>
              <view :style="{
                width: '40rpx',
                height: '40rpx',
                borderRadius: '50%',
                border: '4rpx solid',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: !selectedCoupon ? '#C41E3A' : '#999999',
                backgroundColor: !selectedCoupon ? '#C41E3A' : 'transparent'
              }">
                <text v-if="!selectedCoupon" style="font-size: 20rpx; color: #FFFFFF;">✓</text>
              </view>
            </view>

            <view v-for="coupon in availableCoupons" :key="coupon.id" @click="subtotal >= coupon.minAmount ? (selectedCoupon = coupon, showCouponPanel = false) : () => {}"
              :style="{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '32rpx',
                borderRadius: '16rpx',
                border: '2rpx solid',
                borderColor: selectedCoupon?.id === coupon.id ? '#C41E3A' : '#E8E0D5',
                backgroundColor: selectedCoupon?.id === coupon.id ? 'rgba(196,30,58,0.05)' : '#FFFFFF',
                opacity: subtotal < coupon.minAmount ? 0.5 : 1,
                marginBottom: '16rpx'
              }">
              <view>
                <view class="flex items-center" style="gap: 16rpx;">
                  <text style="font-size: 36rpx; font-weight: 700; color: #C41E3A;">&yen;{{ coupon.discount }}</text>
                  <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C;">{{ coupon.name }}</text>
                </view>
                <text style="font-size: 22rpx; color: #999999;">
                  {{ coupon.minAmount > 0 ? '满¥' + coupon.minAmount + '可用' : '无门槛' }}{{ subtotal < coupon.minAmount ? ' · 未满足条件' : '' }}
                </text>
              </view>
              <view :style="{
                width: '40rpx',
                height: '40rpx',
                borderRadius: '50%',
                border: '4rpx solid',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: selectedCoupon?.id === coupon.id ? '#C41E3A' : '#999999',
                backgroundColor: selectedCoupon?.id === coupon.id ? '#C41E3A' : 'transparent'
              }">
                <text v-if="selectedCoupon?.id === coupon.id" style="font-size: 20rpx; color: #FFFFFF;">✓</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 发票选择面板 -->
      <view v-if="showInvoicePanel" style="position: fixed; inset: 0; z-index: 999;">
        <view style="position: absolute; inset: 0; background-color: rgba(0,0,0,0.6);" @click="showInvoicePanel = false" />
        <view style="position: absolute; bottom: 0; left: 0; right: 0; background-color: #FFFFFF; border-radius: 32rpx 32rpx 0 0; max-height: 50vh; overflow: hidden;">
          <view class="flex items-center justify-between" style="padding: 32rpx; border-bottom: 2rpx solid #E8E0D5;">
            <text style="font-size: 28rpx; font-weight: 600; color: #2C2C2C;">选择发票类型</text>
            <text @click="showInvoicePanel = false" style="font-size: 24rpx; color: #999999;">完成</text>
          </view>
          <view style="padding: 32rpx; display: flex; flex-direction: column; gap: 24rpx;">
            <view v-for="option in invoiceOptions" :key="option.value" @click="invoiceType = option.value; showInvoicePanel = false"
              :style="{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '32rpx',
                borderRadius: '16rpx',
                border: '2rpx solid',
                borderColor: invoiceType === option.value ? '#C41E3A' : '#E8E0D5',
                backgroundColor: invoiceType === option.value ? 'rgba(196,30,58,0.05)' : '#FFFFFF'
              }">
              <view>
                <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block;">{{ option.label }}</text>
                <text style="font-size: 22rpx; color: #999999;">{{ option.desc }}</text>
              </view>
              <view :style="{
                width: '40rpx',
                height: '40rpx',
                borderRadius: '50%',
                border: '4rpx solid',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: invoiceType === option.value ? '#C41E3A' : '#999999',
                backgroundColor: invoiceType === option.value ? '#C41E3A' : 'transparent'
              }">
                <text v-if="invoiceType === option.value" style="font-size: 20rpx; color: #FFFFFF;">✓</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Address {
  id: number
  name: string
  phone: string
  province: string
  city: string
  detail: string
  isDefault: boolean
}

interface OrderItem {
  id: number
  name: string
  spec: string
  price: number
  quantity: number
  image: string
}

interface Coupon {
  id: number
  name: string
  discount: number
  minAmount: number
}

interface InvoiceOption {
  value: 'none' | 'personal' | 'company'
  label: string
  desc: string
}

function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack()
  } else {
    uni.navigateTo({ url: '/pages/cart/index' })
  }
}

function goTo(url: string) {
  uni.navigateTo({ url })
}

const loading = ref(true)

const hasAddress = ref(true)

const defaultAddress: Address = {
  id: 1,
  name: '张三',
  phone: '138****8888',
  province: '北京市',
  city: '朝阳区',
  detail: '建国路88号SOHO现代城A座1208室',
  isDefault: true,
}

const orderItems: OrderItem[] = [
  { id: 1, name: '《渊海子平》精装典藏版', spec: '精装版 / 全四册', price: 168, quantity: 1, image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&q=80' },
  { id: 2, name: '天然黑曜石本命佛吊坠', spec: '属猴 / 大日如来', price: 299, quantity: 2, image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=200&q=80' },
]

const availableCoupons: Coupon[] = [
  { id: 1, name: '满300减50', discount: 50, minAmount: 300 },
  { id: 2, name: '满500减100', discount: 100, minAmount: 500 },
  { id: 3, name: '新人专享9折券', discount: 76.6, minAmount: 0 },
]

const invoiceOptions: InvoiceOption[] = [
  { value: 'none', label: '不开发票', desc: '无需发票' },
  { value: 'personal', label: '个人发票', desc: '电子发票，购买后发送至邮箱' },
  { value: 'company', label: '企业发票', desc: '需要填写企业税号' },
]

const selectedCoupon = ref<Coupon | null>(availableCoupons[0])
const showCouponPanel = ref(false)
const paymentMethod = ref<'wechat' | 'alipay' | 'balance'>('wechat')
const orderNote = ref('')
const invoiceType = ref<'none' | 'personal' | 'company'>('none')
const showInvoicePanel = ref(false)

const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
const shipping = 0
const couponDiscount = computed(() => selectedCoupon.value?.discount || 0)
const totalPrice = computed(() => subtotal + shipping - couponDiscount.value)
const balanceAmount = 888.88

onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 300)
})
</script>

<style scoped>
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.items-start { align-items: flex-start; }
</style>
