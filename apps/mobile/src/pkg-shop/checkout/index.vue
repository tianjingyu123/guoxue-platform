<template>
  <view class="checkout">
    <app-nav-bar title="确认订单" :back-size="40" :title-size="36" :bar-height="106" />

    <!-- 加载态 -->
    <view v-if="loading" class="loading-zone">
      <view class="sk-addr" />
      <view class="sk-goods" />
      <view class="sk-row" />
      <view class="sk-row" />
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="error-zone">
      <text class="error-text">{{ error }}</text>
      <view class="error-retry" @tap="fetchCheckoutData()"><text>重试</text></view>
    </view>

    <template v-else>
    <!-- 超时倒计时条 -->
    <view class="timer-bar" :class="{ urgent: isUrgent }">
      <view class="timer-left">
        <app-icon name="clock" :size="28" :color="isUrgent ? '#EF4444' : '#FF6B35'" />
        <text class="timer-text" :class="{ urgent: isUrgent }">请在 {{ countdown.m }}:{{ countdown.s }} 内完成支付</text>
      </view>
      <text v-if="isUrgent" class="timer-warn">即将超时</text>
    </view>

    <scroll-view scroll-y class="content">
      <!-- 地址 -->
      <view class="address-card" @tap="showAddress = true">
        <app-icon name="map-pin" :size="40" color="#C41E3A" />
        <view class="address-info" v-if="currentAddress">
          <view class="addr-top">
            <text class="addr-name">{{ currentAddress.name }}</text>
            <text class="addr-phone">{{ currentAddress.phone }}</text>
            <view v-if="currentAddress.isDefault" class="default-tag"><text>默认</text></view>
          </view>
          <text class="addr-detail">{{ currentAddress.province }}{{ currentAddress.city }}{{ currentAddress.district }}{{ currentAddress.address }}</text>
        </view>
        <app-icon name="chevron-right" :size="32" color="#CCCCCC" />
      </view>

      <!-- 商品 -->
      <view class="goods-card">
        <text class="goods-title">商品清单</text>
        <view v-for="g in items" :key="g.id" class="goods-item">
          <image lazy-load class="goods-img" :src="g.productCover" mode="aspectFill" />
          <view class="goods-info">
            <text class="goods-name">{{ g.productName }}</text>
            <view class="sku-tag"><text>{{ g.skuName }}</text></view>
            <view class="goods-bottom">
              <text class="goods-price">¥{{ g.price }}</text>
              <text class="goods-qty">x{{ g.quantity }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 优惠券 -->
      <view class="cell" @tap="showCoupon = true">
        <view class="cell-left">
          <app-icon name="tag" :size="36" color="#C41E3A" />
          <text class="cell-label">优惠券</text>
        </view>
        <!-- 券抵扣与明细行同口径（displayCouponDiscount=后端试算，多商品券仅抵首单），避免顶部显原始面值与明细不一致 -->
        <text class="cell-value active">{{ selectedCoupon ? '-¥' + displayCouponDiscount.toFixed(2) : (coupons.length > 0 ? coupons.length + '张可用' : '暂无可用') }}</text>
        <app-icon name="chevron-right" :size="32" color="#999999" />
      </view>

      <!-- 支付方式 -->
      <view class="pay-card">
        <text class="pay-title">支付方式</text>
        <view v-for="m in payMethods" :key="m.id" class="pay-item" @tap="payMethod = m.id">
          <view class="pay-badge" :style="{ background: m.badgeColor }"><text>{{ m.badge }}</text></view>
          <text class="pay-name">{{ m.name }}</text>
          <view class="radio" :class="{ checked: payMethod === m.id }">
            <view v-if="payMethod === m.id" class="radio-dot" />
          </view>
        </view>
      </view>

      <!-- 价格明细（后端试算优先：与下单定价引擎同口径，含券后价与分销自购立减；试算不可用回退前端预估） -->
      <view class="amount-card">
        <text class="amount-title">价格明细</text>
        <view class="amount-row"><text>商品金额</text><text class="amount-val">¥{{ displayGoods.toFixed(2) }}</text></view>
        <view class="amount-row"><text>运费</text><text class="amount-val">免运费</text></view>
        <view class="amount-row" v-if="displayCouponDiscount > 0"><text>优惠券抵扣</text><text class="discount">-¥{{ displayCouponDiscount.toFixed(2) }}</text></view>
        <!-- 分销自购立减：仅后端试算确认有该身份优惠时展示（拿不到身份不猜） -->
        <view class="amount-row" v-if="estimate && estimate.selfDiscount > 0"><text>分销自购立减</text><text class="discount">-¥{{ estimate.selfDiscount.toFixed(2) }}</text></view>
        <view class="amount-row total"><text>实付金额</text><text class="pay-amount">¥{{ displayPayTotal.toFixed(2) }}</text></view>
      </view>
      <view style="height: 140rpx;" />
    </scroll-view>

    <!-- 底部支付栏 -->
    <view class="footer">
      <view class="footer-total">
        <view class="ft-line">
          <text class="ft-label">合计:</text>
          <text class="ft-amount">¥{{ displayPayTotal.toFixed(2) }}</text>
        </view>
        <text v-if="displaySaved > 0" class="ft-saved">已优惠 ¥{{ displaySaved.toFixed(2) }}</text>
      </view>
      <view class="pay-btn" @tap="submitOrder"><text>提交订单</text></view>
    </view>

    <!-- 地址选择 -->
    <view v-if="showAddress" class="mask" @tap="showAddress = false">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">选择收货地址</text>
        <view v-for="a in addresses" :key="a.id" class="addr-option" @tap="selectAddress(a)">
          <view class="addr-option-info">
            <view class="addr-top"><text class="addr-name">{{ a.name }}</text><text class="addr-phone">{{ a.phone }}</text></view>
            <text class="addr-detail">{{ a.province }}{{ a.city }}{{ a.district }}{{ a.address }}</text>
          </view>
          <app-icon v-if="currentAddress && currentAddress.id === a.id" name="check" :size="36" color="#C41E3A" />
        </view>
        <!-- 添加新地址入口（新用户无地址时的唯一通道，此前缺失导致卡死） -->
        <view
          style="display:flex;align-items:center;justify-content:center;gap:10rpx;padding:28rpx;margin-top:12rpx;border:2rpx dashed #C41E3A;border-radius:16rpx;"
          @tap="goAddAddress"
        >
          <app-icon name="plus" :size="32" color="#C41E3A" />
          <text style="font-size:28rpx;color:#C41E3A;font-weight:500;">添加新地址</text>
        </view>
      </view>
    </view>

    <!-- 优惠券选择 -->
    <view v-if="showCoupon" class="mask" @tap="showCoupon = false">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">选择优惠券</text>
        <view class="coupon-option" @tap="selectCoupon(null)">
          <text>不使用优惠券</text>
          <view class="radio" :class="{ checked: !selectedCoupon }"><view v-if="!selectedCoupon" class="radio-dot" /></view>
        </view>
        <view v-for="c in coupons" :key="c.id" class="coupon-option" @tap="selectCoupon(c)">
          <view><text class="co-name">{{ c.name }} -¥{{ c.value }}</text><text class="co-min">满{{ c.minAmount }}可用</text></view>
          <view class="radio" :class="{ checked: selectedCoupon && selectedCoupon.id === c.id }"><view v-if="selectedCoupon && selectedCoupon.id === c.id" class="radio-dot" /></view>
        </view>
      </view>
    </view>

    <!-- 超时警告 -->
    <view v-if="showTimeout" class="mask center">
      <view class="dialog" @tap.stop>
        <app-icon name="clock" :size="80" color="#FF8800" />
        <text class="dialog-title">支付超时</text>
        <text class="dialog-desc">订单支付时间已超时，请重新下单</text>
        <view class="dialog-btn" @tap="onTimeout"><text>重新下单</text></view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { redirectTo, navigateTo } from '@/utils/router'
import { shopApi, formatCountdown, type ShippingAddress, type CheckoutCoupon, type OrderEstimate } from '@/lib/shop-data'

const loading = ref(true)
const error = ref('')
const items = ref<any[]>([]) // 结算商品(含 productId/skuId)：后端聚合结构无独立 interface，保留 any
const addresses = ref<ShippingAddress[]>([])
const coupons = ref<CheckoutCoupon[]>([])
const payMethods = ref<any[]>([]) // 支付方式(badge/badgeColor)：无导出 interface，保留 any
const currentAddress = ref<ShippingAddress | null>(null)
const selectedCoupon = ref<CheckoutCoupon | null>(null)
const payMethod = ref('wechat')
const showAddress = ref(false)
const showCoupon = ref(false)
const showTimeout = ref(false)
const submitting = ref(false)
// 多商品逐单创建时，缓存已成功建单（key=productId:skuId），失败重试跳过已建单，避免首商品重复下单产生孤儿单
const createdOrders = new Map<string, { id: string; amount: number }>()

// 结算来源：立即购买(productId+skuId+quantity) 或 购物车结算(itemIds)
const source = ref<{ productId?: string; skuId?: string; quantity?: number; itemIds?: string[] }>({})
// 内容场景来源（佣-V2-P3）：直播/文章/视频入口购买时 URL 透传，下单随 createOrder 落库（纯记录）
const contentSource = ref<{ type?: string; id?: string }>({})
const SOURCE_TYPES = ['LIVE', 'ARTICLE', 'VIDEO']

const goodsTotal = computed(() => items.value.reduce((s: number, i: any) => s + i.price * i.quantity, 0))
const payTotal = computed(() => Math.max(0, goodsTotal.value - (selectedCoupon.value?.value || 0)))

/*
 * 后端试算（POST /shop/orders/estimate）：与下单定价引擎同口径（活动价×数量 − 券 − 分销自购立减），
 * 保证「展示价 = 下单实付」。多商品与提交订单同规则逐单试算（券只用于第一单）后求和。
 * 试算失败（网络/旧后端）回退前端预估（displayX 兜底 goodsTotal/payTotal），且不显示自购立减行（拿不到身份不猜）。
 */
const estimate = ref<OrderEstimate | null>(null)
let estimateSeq = 0
async function refreshEstimate() {
  const seq = ++estimateSeq
  if (!items.value.length) { estimate.value = null; return }
  try {
    const results: OrderEstimate[] = []
    for (let i = 0; i < items.value.length; i++) {
      const it = items.value[i]
      results.push(await shopApi.estimateOrder({
        targetId: it.productId,
        skuId: it.skuId,
        quantity: it.quantity,
        couponId: i === 0 ? selectedCoupon.value?.id : undefined,
      }))
    }
    if (seq !== estimateSeq) return // 过期响应丢弃（快速切换券）
    estimate.value = results.reduce((acc, r) => ({
      goodsAmount: acc.goodsAmount + r.goodsAmount,
      couponDiscount: acc.couponDiscount + r.couponDiscount,
      selfDiscount: acc.selfDiscount + r.selfDiscount,
      payableAmount: acc.payableAmount + r.payableAmount,
    }), { goodsAmount: 0, couponDiscount: 0, selfDiscount: 0, payableAmount: 0 })
  } catch (e) {
    if (seq !== estimateSeq) return
    estimate.value = null // 回退前端预估
    console.warn('[checkout] 订单试算失败，回退前端预估', e)
  }
}
watch([items, selectedCoupon], () => { refreshEstimate() }, { deep: false })

// 展示口径：试算可用用试算（=实付），否则回退前端预估
const displayGoods = computed(() => estimate.value ? estimate.value.goodsAmount : goodsTotal.value)
const displayCouponDiscount = computed(() => estimate.value ? estimate.value.couponDiscount : (selectedCoupon.value?.value || 0))
const displayPayTotal = computed(() => estimate.value ? estimate.value.payableAmount : payTotal.value)
const displaySaved = computed(() => displayCouponDiscount.value + (estimate.value?.selfDiscount || 0))

async function fetchCheckoutData() {
  error.value = ''
  loading.value = true
  try {
    const result = await shopApi.getCheckout(source.value)
    items.value = result.items || []
    addresses.value = result.addresses || []
    coupons.value = result.coupons || []
    payMethods.value = result.payMethods || []
    currentAddress.value = addresses.value.find((a: ShippingAddress) => a.isDefault) || addresses.value[0] || null
    if (!items.value.length) error.value = '没有可结算的商品，请返回重新选择'
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((q) => {
  source.value = {
    productId: (q?.productId as string) || undefined,
    skuId: (q?.skuId as string) || undefined,
    quantity: q?.quantity ? Number(q.quantity) : undefined,
    itemIds: q?.items ? String(q.items).split(',').filter(Boolean) : undefined,
  }
  // 内容来源白名单校验后透传（成对才生效）
  const srcType = String(q?.sourceContentType || '')
  const srcId = String(q?.sourceContentId || '')
  if (SOURCE_TYPES.includes(srcType) && srcId) contentSource.value = { type: srcType, id: srcId }
})

// 15分钟倒计时
const remain = ref(15 * 60 * 1000)
const countdown = computed(() => formatCountdown(remain.value))
const isUrgent = computed(() => remain.value <= 180 * 1000)
let timer: ReturnType<typeof setInterval> | null = null
onMounted(async () => {
  await fetchCheckoutData()
  timer = setInterval(() => {
    remain.value -= 1000
    if (remain.value <= 0) {
      remain.value = 0
      showTimeout.value = true
      if (timer) clearInterval(timer)
    }
  }, 1000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })

function selectAddress(a: ShippingAddress) { currentAddress.value = a; showAddress.value = false }
function selectCoupon(c: CheckoutCoupon | null) { selectedCoupon.value = c; showCoupon.value = false }

// 跳地址编辑页新增地址（结算弹层无地址时的入口）
function goAddAddress() {
  showAddress.value = false
  navigateTo('/pkg-account/address-edit/index')
}
// 从地址编辑页返回时刷新地址列表（新增地址立即可选）；首次加载中跳过避免重复请求
onShow(() => {
  if (loading.value || !source.value) return
  shopApi.getCheckout(source.value).then((result) => {
    addresses.value = result.addresses || []
    if (!currentAddress.value) currentAddress.value = addresses.value.find((a: ShippingAddress) => a.isDefault) || addresses.value[0] || null
  }).catch(() => {})
})

async function submitOrder() {
  if (submitting.value) return
  if (!items.value.length) { uni.showToast({ title: '没有可结算的商品', icon: 'none' }); return }
  if (!currentAddress.value) { uni.showToast({ title: '请选择收货地址', icon: 'none' }); return }
  submitting.value = true
  try {
    const couponId = selectedCoupon.value?.id
    // 后端为单商品下单（无合并支付）：多商品逐个创建订单，券仅用于第一单；先支付第一笔，其余在「我的订单」继续支付
    const orders: { id: string; amount: number }[] = []
    for (let i = 0; i < items.value.length; i++) {
      const it = items.value[i]
      const key = `${it.productId}:${it.skuId || ''}`
      // 已成功建过的订单（上次提交中途失败留下）直接复用，不再重复下单
      const cached = createdOrders.get(key)
      if (cached) { orders.push(cached); continue }
      const order = await shopApi.createOrder({
        type: 'PRODUCT',
        targetId: it.productId,
        skuId: it.skuId,
        quantity: it.quantity,
        couponId: i === 0 ? couponId : undefined,
        addressId: currentAddress.value.id,
        // 内容场景来源（佣-V2-P3）：直播/文章/视频入口透传，随订单落库
        sourceContentType: contentSource.value.type,
        sourceContentId: contentSource.value.id,
      })
      const rec = { id: order.id, amount: order.amount }
      createdOrders.set(key, rec) // 建单成功立即缓存，失败重试时该商品跳过
      orders.push(rec)
    }
    const first = orders[0]
    if (orders.length > 1) {
      uni.showToast({ title: `已创建${orders.length}笔订单，先支付第一笔`, icon: 'none' })
    }
    redirectTo(`/shop/paying?orderId=${first.id}&method=${payMethod.value}&amount=${first.amount}`)
    // 成功跳转后不重置 submitting（页面已离开）
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '下单失败，请重试', icon: 'none' })
    submitting.value = false
  }
}
function onTimeout() { redirectTo('/shop/pay-timeout') }
</script>

<style lang="scss" scoped>
.checkout { min-height: 100vh; background: #F5F5F5; display: flex; flex-direction: column; }

.timer-bar { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 30rpx; background: #FFF5E6; &.urgent { background: #FEF2F2; } }
.timer-left { display: flex; align-items: center; gap: 12rpx; }
.timer-text { font-size: 26rpx; color: #FF6B35; &.urgent { color: #EF4444; } }
.timer-warn { font-size: 22rpx; color: #EF4444; }
.content { flex: 1; }
.address-card { display: flex; align-items: center; gap: 16rpx; background: #FFFFFF; margin: 20rpx; padding: 28rpx 24rpx; border-radius: 20rpx; }
.address-info { flex: 1; display: flex; flex-direction: column; gap: 10rpx; }
.addr-top { display: flex; align-items: center; gap: 16rpx; }
.addr-name { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.addr-phone { font-size: 26rpx; color: #666666; }
.default-tag { background: rgba(196, 30, 58,0.1); padding: 2rpx 10rpx; border-radius: 6rpx; }
.default-tag text { font-size: 20rpx; color: var(--brand); }
.addr-detail { font-size: 26rpx; color: #666666; line-height: 1.4; }
.goods-card { background: #FFFFFF; margin: 0 20rpx 20rpx; border-radius: 20rpx; padding: 24rpx; }
.goods-title { font-size: 28rpx; font-weight: 600; color: #1A1A1A; display: block; margin-bottom: 20rpx; }
.goods-item { display: flex; gap: 16rpx; margin-bottom: 20rpx; &:last-child { margin-bottom: 0; } }
.goods-img { width: 140rpx; height: 140rpx; border-radius: 12rpx; }
.goods-info { flex: 1; display: flex; flex-direction: column; gap: 10rpx; }
.goods-name { font-size: 28rpx; color: #1A1A1A; line-height: 1.4; }
.sku-tag { align-self: flex-start; background: #F5F5F5; padding: 4rpx 14rpx; border-radius: 8rpx; }
.sku-tag text { font-size: 22rpx; color: #999999; }
.goods-bottom { display: flex; justify-content: space-between; align-items: center; }
.goods-price { font-size: 30rpx; color: var(--brand); font-weight: 700; }
.goods-qty { font-size: 26rpx; color: #999999; }
.cell { display: flex; align-items: center; background: #FFFFFF; margin: 0 20rpx 20rpx; padding: 28rpx 24rpx; border-radius: 20rpx; }
.cell-left { display: flex; align-items: center; gap: 16rpx; }
.cell-label { font-size: 28rpx; color: #1A1A1A; }
.cell-value { margin-left: auto; font-size: 26rpx; color: #999999; margin-right: 10rpx; &.active { color: var(--brand); } }
.pay-card { background: #FFFFFF; margin: 0 20rpx 20rpx; padding: 24rpx; border-radius: 20rpx; }
.pay-title { font-size: 28rpx; font-weight: 600; color: #1A1A1A; display: block; margin-bottom: 16rpx; }
.pay-item { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; }
.pay-badge { width: 56rpx; height: 56rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; }
.pay-badge text { color: #FFFFFF; font-size: 28rpx; }
.pay-name { font-size: 28rpx; color: #1A1A1A; }
.radio { width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid #CCCCCC; margin-left: auto; display: flex; align-items: center; justify-content: center; &.checked { border-color: var(--brand); } }
.radio-dot { width: 22rpx; height: 22rpx; border-radius: 50%; background: var(--brand); }
.amount-card { background: #FFFFFF; margin: 0 20rpx; padding: 24rpx; border-radius: 20rpx; }
.amount-title { font-size: 28rpx; font-weight: 600; color: #1A1A1A; display: block; margin-bottom: 20rpx; }
.amount-val { color: #1A1A1A; }
.amount-row { display: flex; justify-content: space-between; font-size: 26rpx; color: #666666; margin-bottom: 16rpx; }
.amount-row .discount { color: var(--brand); }
.amount-row.total { margin-bottom: 0; padding-top: 16rpx; border-top: 2rpx solid #F0F0F0; }
.amount-row.total text { font-size: 28rpx; color: #1A1A1A; font-weight: 600; }
.pay-amount { color: var(--brand) !important; font-size: 34rpx !important; }
.footer { position: fixed; left: 0; right: 0; bottom: 0; display: flex; align-items: center; padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFFFFF; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.05); }
.footer-total { display: flex; flex-direction: column; }
.ft-line { display: flex; align-items: baseline; gap: 8rpx; }
.ft-label { font-size: 26rpx; color: #666666; }
.ft-amount { font-size: 38rpx; color: var(--brand); font-weight: 700; }
.ft-saved { font-size: 22rpx; color: #16A34A; }
.pay-btn { margin-left: auto; padding: 20rpx 60rpx; border-radius: 40rpx; background: linear-gradient(90deg, var(--brand), #C8453E); }
.pay-btn text { color: #FFFFFF; font-size: 30rpx; font-weight: 600; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; &.center { align-items: center; justify-content: center; } }
.sheet { width: 100%; background: #FFFFFF; border-radius: 24rpx 24rpx 0 0; padding: 32rpx; max-height: 70vh; }
.sheet-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; display: block; margin-bottom: 24rpx; }
.addr-option, .coupon-option { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 0; border-bottom: 2rpx solid #F5F5F5; }
.addr-option-info { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.co-name { font-size: 28rpx; color: #1A1A1A; display: block; }
.co-min { font-size: 24rpx; color: #999999; }
.dialog { width: 560rpx; background: #FFFFFF; border-radius: 24rpx; padding: 48rpx 40rpx; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.dialog-title { font-size: 34rpx; font-weight: 600; color: #1A1A1A; }
.dialog-desc { font-size: 28rpx; color: #666666; text-align: center; }
.dialog-btn { margin-top: 12rpx; width: 100%; height: 88rpx; border-radius: 44rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; }
.dialog-btn text { color: #FFFFFF; font-size: 30rpx; }

/* 加载态 */
.loading-zone { padding: 20rpx; display: flex; flex-direction: column; gap: 20rpx; }
.sk-addr { height: 120rpx; background: #ececec; border-radius: 20rpx; }
.sk-goods { height: 300rpx; background: #ececec; border-radius: 20rpx; }
.sk-row { height: 96rpx; background: #ececec; border-radius: 20rpx; }

/* 错误态 */
.error-zone { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; }
.error-text { font-size: 28rpx; color: #999999; }
.error-retry { padding: 16rpx 56rpx; background: var(--brand); border-radius: 40rpx; }
.error-retry text { color: #FFFFFF; font-size: 28rpx; }
</style>
