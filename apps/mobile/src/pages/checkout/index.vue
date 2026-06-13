<script setup lang="ts">
import { ref, computed } from 'vue'

const hasAddress = ref(true)
const address = ref({ name: '张三', phone: '138****8888', province: '北京市', city: '朝阳区', detail: '建国路88号SOHO现代城A座1208室', isDefault: true })

const orderItems = ref([
  { id: 1, name: '《渊海子平》精装典藏版', spec: '精装版 / 全四册', price: 168, quantity: 1, image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&q=80' },
  { id: 2, name: '天然黑曜石本命佛吊坠', spec: '属猴 / 大日如来', price: 299, quantity: 2, image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=200&q=80' },
])

const availableCoupons = ref([
  { id: 1, name: '满300减50', discount: 50, minAmount: 300 },
  { id: 2, name: '满500减100', discount: 100, minAmount: 500 },
  { id: 3, name: '新人专享9折券', discount: 76.6, minAmount: 0 },
])

const selectedCoupon = ref(availableCoupons.value[0] as typeof availableCoupons.value[0] | null)
const orderNote = ref('')
const invoiceType = ref<'none' | 'personal' | 'company'>('none')
const paymentMethod = ref('wechat')
const showCouponPanel = ref(false)
const showInvoicePanel = ref(false)

const subtotal = computed(() => orderItems.value.reduce((s, i) => s + i.price * i.quantity, 0))
const totalPrice = computed(() => subtotal.value - (selectedCoupon.value?.discount || 0))
const invoiceLabel = computed(() => ({ none: '不开发票', personal: '个人发票', company: '企业发票' }[invoiceType.value]))

const paymentMethods = computed(() => [
  { id: 'wechat', label: '微信支付', color: '#07C160', sub: '', disabled: false },
  { id: 'alipay', label: '支付宝', color: '#1677FF', sub: '', disabled: false },
  { id: 'balance', label: '国学币余额', color: '#C9A96E', sub: `可用 ¥888.88${totalPrice.value > 888.88 ? ' (余额不足)' : ''}`, disabled: totalPrice.value > 888.88 },
])

const invoiceOptions = [
  { value: 'none', label: '不开发票', desc: '无需发票' },
  { value: 'personal', label: '个人发票', desc: '电子普通发票' },
  { value: 'company', label: '企业发票', desc: '增值税专用发票' },
]

function goAddress() { uni.navigateTo({ url: '/pages/shop/addresses/index' }) }
function submitOrder() { uni.navigateTo({ url: '/pages/payment/result?status=success' }) }
</script>

<template>
  <view class="min-h-screen bg-background pb-24">

    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-card/95 border-b border-border">
      <view class="flex items-center justify-between h-12 px-4">
        <view class="w-9 h-9 flex items-center justify-center" @tap="uni.navigateBack()">
          <svg class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </view>
        <text class="font-semibold text-base text-foreground">确认订单</text>
        <view class="w-9" />
      </view>
    </view>

    <view class="px-4 pt-4 space-y-4">

      <!-- 收货地址 -->
      <view class="p-4 bg-card rounded-xl" @tap="goAddress">
        <view v-if="hasAddress" class="flex items-start gap-3">
          <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-2 mb-1">
              <text class="font-semibold text-foreground">{{ address.name }}</text>
              <text class="text-muted-foreground text-sm">{{ address.phone }}</text>
              <view v-if="address.isDefault" class="px-1.5 py-0.5 rounded bg-primary/10">
                <text class="text-xs text-primary">默认</text>
              </view>
            </view>
            <text class="text-sm text-muted-foreground block">{{ address.province }} {{ address.city }} {{ address.detail }}</text>
          </view>
          <svg class="w-5 h-5 text-muted-foreground flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </view>
        <view v-else class="flex items-center gap-3">
          <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </view>
          <view class="flex-1">
            <text class="font-medium text-foreground block">请添加收货地址</text>
            <text class="text-xs text-muted-foreground">添加地址后才能下单</text>
          </view>
          <svg class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </view>
      </view>

      <!-- 商品清单 -->
      <view class="bg-card rounded-xl overflow-hidden">
        <view class="px-4 py-3 border-b border-border">
          <text class="font-semibold text-sm text-foreground">商品清单</text>
        </view>
        <view
          v-for="item in orderItems"
          :key="item.id"
          class="p-4 flex gap-3 border-b border-border last:border-0"
        >
          <image :src="item.image" class="w-20 h-20 rounded-lg flex-shrink-0" mode="aspectFill" />
          <view class="flex-1 min-w-0 flex flex-col justify-between">
            <view>
              <text class="font-medium text-sm text-foreground line-clamp-1 block">{{ item.name }}</text>
              <text class="text-xs text-muted-foreground mt-0.5 block">{{ item.spec }}</text>
            </view>
            <view class="flex items-center justify-between">
              <text class="text-primary font-semibold">¥{{ item.price }}</text>
              <text class="text-sm text-muted-foreground">x{{ item.quantity }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 优惠券 -->
      <view class="p-4 bg-card rounded-xl flex items-center justify-between" @tap="showCouponPanel = true">
        <view class="flex items-center gap-3">
          <svg class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          <text class="font-medium text-sm text-foreground">优惠券</text>
        </view>
        <view class="flex items-center gap-2">
          <text v-if="selectedCoupon" class="text-primary text-sm">-¥{{ selectedCoupon.discount }}</text>
          <text v-else class="text-muted-foreground text-sm">{{ availableCoupons.length }}张可用</text>
          <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </view>
      </view>

      <!-- 订单备注 -->
      <view class="p-4 bg-card rounded-xl flex items-center gap-3">
        <svg class="w-5 h-5 text-muted-foreground flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <input
          v-model="orderNote"
          placeholder="添加订单备注..."
          :maxlength="100"
          class="flex-1 text-sm bg-transparent border-none outline-none text-foreground"
          placeholder-class="text-muted-foreground"
        />
        <text v-if="orderNote" class="text-xs text-muted-foreground flex-shrink-0">{{ orderNote.length }}/100</text>
      </view>

      <!-- 发票 -->
      <view class="p-4 bg-card rounded-xl flex items-center justify-between" @tap="showInvoicePanel = true">
        <view class="flex items-center gap-3">
          <svg class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <text class="font-medium text-sm text-foreground">发票</text>
        </view>
        <view class="flex items-center gap-2">
          <text class="text-sm text-muted-foreground">{{ invoiceLabel }}</text>
          <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </view>
      </view>

      <!-- 价格明细 -->
      <view class="p-4 bg-card rounded-xl">
        <text class="font-semibold text-sm text-foreground block mb-3">价格明细</text>
        <view class="space-y-2">
          <view class="flex items-center justify-between">
            <text class="text-sm text-muted-foreground">商品总额</text>
            <text class="text-sm text-foreground">¥{{ subtotal.toFixed(2) }}</text>
          </view>
          <view class="flex items-center justify-between">
            <text class="text-sm text-muted-foreground">运费</text>
            <text class="text-sm text-foreground">包邮</text>
          </view>
          <view v-if="selectedCoupon" class="flex items-center justify-between">
            <text class="text-sm text-muted-foreground">优惠券抵扣</text>
            <text class="text-sm text-primary">-¥{{ selectedCoupon.discount.toFixed(2) }}</text>
          </view>
          <view class="pt-2 mt-2 border-t border-border flex items-center justify-between">
            <text class="font-medium text-foreground">实付金额</text>
            <text class="text-xl font-bold text-primary">¥{{ totalPrice.toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- 支付方式 -->
      <view class="p-4 bg-card rounded-xl">
        <text class="font-semibold text-sm text-foreground block mb-3">支付方式</text>
        <view class="space-y-3">
          <view
            v-for="method in paymentMethods"
            :key="method.id"
            class="flex items-center justify-between p-3 rounded-xl border transition-colors"
            :class="[
              paymentMethod === method.id ? 'border-primary bg-primary/5' : 'border-border',
              method.disabled ? 'opacity-50' : ''
            ]"
            @tap="!method.disabled && (paymentMethod = method.id)"
          >
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 rounded-lg flex items-center justify-center" :style="`background-color:${method.color}`">
                <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </view>
              <view>
                <text class="font-medium text-sm text-foreground block">{{ method.label }}</text>
                <text v-if="method.sub" class="text-xs text-muted-foreground">{{ method.sub }}</text>
              </view>
            </view>
            <view
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              :class="paymentMethod === method.id ? 'border-primary bg-primary' : 'border-muted-foreground'"
            >
              <view v-if="paymentMethod === method.id">
                <svg class="w-3 h-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-card/95 border-t border-border z-50">
      <view class="flex items-center justify-between px-4 py-3">
        <view>
          <text class="text-sm text-muted-foreground">实付：</text>
          <text class="text-xl font-bold text-primary">¥{{ totalPrice.toFixed(2) }}</text>
        </view>
        <view
          class="px-8 py-2.5 rounded-full font-semibold text-sm"
          :class="hasAddress ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
          @tap="hasAddress && submitOrder()"
        >
          <text>立即支付</text>
        </view>
      </view>
    </view>

    <!-- 优惠券面板 -->
    <view v-if="showCouponPanel" class="fixed inset-0 z-50">
      <view class="absolute inset-0 bg-black/60" @tap="showCouponPanel = false" />
      <view class="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[70vh] overflow-hidden">
        <view class="flex items-center justify-between p-4 border-b border-border">
          <text class="font-semibold text-foreground">选择优惠券</text>
          <text class="text-muted-foreground text-sm" @tap="showCouponPanel = false">完成</text>
        </view>
        <scroll-view scroll-y class="max-h-[50vh] p-4">
          <view
            class="flex items-center justify-between p-4 rounded-xl border mb-3"
            :class="!selectedCoupon ? 'border-primary bg-primary/5' : 'border-border'"
            @tap="selectedCoupon = null; showCouponPanel = false"
          >
            <text class="font-medium text-sm text-foreground">不使用优惠券</text>
            <view
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              :class="!selectedCoupon ? 'border-primary bg-primary' : 'border-muted-foreground'"
            >
              <view v-if="!selectedCoupon">
                <svg class="w-3 h-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </view>
            </view>
          </view>
          <view
            v-for="coupon in availableCoupons"
            :key="coupon.id"
            class="flex items-center justify-between p-4 rounded-xl border mb-3"
            :class="[
              selectedCoupon?.id === coupon.id ? 'border-primary bg-primary/5' : 'border-border',
              subtotal < coupon.minAmount ? 'opacity-50' : ''
            ]"
            @tap="subtotal >= coupon.minAmount && (selectedCoupon = coupon, showCouponPanel = false)"
          >
            <view>
              <view class="flex items-center gap-2">
                <text class="text-primary font-bold text-lg">¥{{ coupon.discount }}</text>
                <text class="font-medium text-sm text-foreground">{{ coupon.name }}</text>
              </view>
              <text class="text-xs text-muted-foreground block">{{ coupon.minAmount > 0 ? `满¥${coupon.minAmount}可用` : '无门槛' }}</text>
            </view>
            <view
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              :class="selectedCoupon?.id === coupon.id ? 'border-primary bg-primary' : 'border-muted-foreground'"
            >
              <view v-if="selectedCoupon?.id === coupon.id">
                <svg class="w-3 h-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 发票面板 -->
    <view v-if="showInvoicePanel" class="fixed inset-0 z-50">
      <view class="absolute inset-0 bg-black/60" @tap="showInvoicePanel = false" />
      <view class="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl overflow-hidden">
        <view class="flex items-center justify-between p-4 border-b border-border">
          <text class="font-semibold text-foreground">选择发票类型</text>
          <text class="text-muted-foreground text-sm" @tap="showInvoicePanel = false">完成</text>
        </view>
        <view class="p-4 space-y-3">
          <view
            v-for="opt in invoiceOptions"
            :key="opt.value"
            class="flex items-center justify-between p-4 rounded-xl border"
            :class="invoiceType === opt.value ? 'border-primary bg-primary/5' : 'border-border'"
            @tap="invoiceType = opt.value; showInvoicePanel = false"
          >
            <view>
              <text class="font-medium text-sm text-foreground block">{{ opt.label }}</text>
              <text class="text-xs text-muted-foreground">{{ opt.desc }}</text>
            </view>
            <view
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              :class="invoiceType === opt.value ? 'border-primary bg-primary' : 'border-muted-foreground'"
            >
              <view v-if="invoiceType === opt.value">
                <svg class="w-3 h-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

  </view>
</template>
