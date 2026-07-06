<template>
  <view class="ex-page">
    <!-- Header -->
    <app-nav-bar title="申请换货" :back-size="38" />

    <view class="content">
      <!-- 加载中 -->
      <view v-if="loading" class="state-box">
        <view class="state-spin" />
        <text class="state-text">加载中...</text>
      </view>
      <!-- 加载失败 -->
      <view v-else-if="error" class="state-box">
        <view class="state-icon">
          <app-icon name="alert-circle" :size="72" color="#b8ab94" />
        </view>
        <text class="state-text">{{ error }}</text>
        <view class="state-retry" @tap="retryLoad">
          <text class="state-retry-text">重试</text>
        </view>
      </view>
      <!-- 空数据 -->
      <view v-else-if="!products.length" class="state-box">
        <view class="state-icon">
          <app-icon name="package" :size="72" color="#b8ab94" />
        </view>
        <text class="state-text">暂无商品数据</text>
      </view>
      <template v-else>
        <!-- 选择换货商品 -->
        <view class="card">
        <view class="card-head">
          <app-icon name="package" :size="34" color="#C41E3A" />
          <text class="card-title">选择换货商品</text>
          <text v-if="errors.product" class="err">{{ errors.product }}</text>
        </view>
        <view class="prod-list">
          <view
            v-for="p in products"
            :key="p.id"
            class="prod-item"
            :class="{ 'prod-active': selectedProduct && selectedProduct.id === p.id }"
            hover-class="card-hover"
            @tap="selectProduct(p)"
          >
            <view class="prod-cover-wrap">
              <image lazy-load class="prod-cover" :src="p.cover" mode="aspectFill" />
              <view v-if="selectedProduct && selectedProduct.id === p.id" class="prod-check">
                <app-icon name="check" :size="20" color="#fff" />
              </view>
            </view>
            <view class="prod-info">
              <text class="prod-name">{{ p.name }}</text>
              <text class="prod-sku">{{ p.skuName }}</text>
              <view class="prod-bottom">
                <text class="prod-price">¥{{ formatPrice(p.price) }}</text>
                <text class="prod-qty">x{{ p.quantity }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 换货原因 -->
      <view class="card">
        <view class="cell" hover-class="card-hover" @tap="showReasonPicker = true">
          <view class="cell-left">
            <text class="cell-label">换货原因</text>
            <text v-if="errors.reason" class="err">{{ errors.reason }}</text>
          </view>
          <view class="cell-right">
            <text class="cell-value" :class="{ placeholder: !reason }">{{ reasonLabel }}</text>
            <app-icon name="chevron-right" :size="32" color="#CCCCCC" />
          </view>
        </view>
      </view>

      <!-- 换货类型 -->
      <view class="card">
        <view class="card-head">
          <app-icon name="refresh-cw" :size="34" color="#C41E3A" />
          <text class="card-title">换货类型</text>
        </view>
        <view class="type-grid">
          <view
            v-for="t in exchangeTypes"
            :key="t.value"
            class="type-item"
            :class="{ 'type-active': exchangeType === t.value }"
            hover-class="card-hover"
            @tap="selectType(t.value)"
          >
            <view class="type-top">
              <view class="radio" :class="{ 'radio-active': exchangeType === t.value }">
                <view v-if="exchangeType === t.value" class="radio-dot" />
              </view>
              <text class="type-label">{{ t.label }}</text>
            </view>
            <text class="type-desc">{{ t.desc }}</text>
          </view>
        </view>

        <!-- 选择新规格 -->
        <view v-if="exchangeType === 'different' && selectedProduct" class="new-sku">
          <view class="new-sku-head">
            <text class="new-sku-label">选择新规格</text>
            <text v-if="errors.sku" class="err">{{ errors.sku }}</text>
          </view>
          <view v-if="availableSkus.length" class="sku-opts">
            <view
              v-for="sku in availableSkus"
              :key="sku.id"
              class="sku-opt"
              :class="{ 'sku-opt-active': newSkuId === sku.id }"
              hover-class="opt-hover"
              @tap="newSkuId = sku.id"
            >
              {{ sku.name }} ¥{{ formatPrice(sku.price) }}
            </view>
          </view>
          <text v-else class="no-sku">该商品暂无其他可换规格</text>
        </view>
      </view>

      <!-- 问题描述 -->
      <view class="card">
        <text class="card-title block">问题描述（选填）</text>
        <textarea
          v-model="description"
          class="textarea"
          placeholder="请详细描述换货原因，以便我们更好处理..."
          :maxlength="200"
        />
        <text class="counter">{{ description.length }}/200</text>
      </view>

      <!-- 上传凭证 -->
      <view class="card">
        <text class="card-title block">上传凭证（选填，最多5张）</text>
        <view class="img-grid">
          <view v-for="(img, idx) in images" :key="idx" class="img-item">
            <image lazy-load class="up-img" :src="img" mode="aspectFill" />
            <view class="img-del" @tap="removeImage(idx)">
              <app-icon name="x" :size="20" color="#fff" />
            </view>
          </view>
          <view v-if="images.length < 5" class="img-add" hover-class="card-hover" @tap="addImage">
            <app-icon name="camera" :size="40" color="#999999" />
            <text class="add-count">{{ images.length }}/5</text>
          </view>
        </view>
      </view>

      <!-- 取件地址 -->
      <view class="card">
        <view class="card-head">
          <app-icon name="map-pin" :size="34" color="#C41E3A" />
          <text class="card-title">取件地址</text>
          <text v-if="errors.address" class="err">{{ errors.address }}</text>
        </view>
        <view v-if="selectedAddress" class="addr" hover-class="card-hover" @tap="showAddressPicker = true">
          <view class="addr-info">
            <view class="addr-top">
              <text class="addr-name">{{ selectedAddress.name }}</text>
              <text class="addr-phone">{{ selectedAddress.phone }}</text>
            </view>
            <text class="addr-detail">{{ fullAddress(selectedAddress) }}</text>
          </view>
          <app-icon name="chevron-right" :size="32" color="#CCCCCC" />
        </view>
        <view v-else class="addr-empty" hover-class="card-hover" @tap="showAddressPicker = true">
          <text class="addr-empty-text">请选择取件地址</text>
        </view>
      </view>

      <!-- 换货须知 -->
      <view class="notice">
        <text class="notice-title">换货须知</text>
        <view class="notice-list">
          <text class="notice-item">• 审核通过后，快递员将上门取件</text>
          <text class="notice-item">• 请保持商品完好，配件齐全</text>
          <text class="notice-item">• 新商品将在收到退回商品后3个工作日内发出</text>
        </view>
      </view>
      </template>
    </view>

    <!-- 提交按钮 -->
    <view class="submit-bar" :style="{ paddingBottom: (safeBottom + 16) + 'px' }">
      <view class="submit-btn" :class="{ disabled: submitting }" hover-class="btn-hover" @tap="handleSubmit">
        <text class="submit-text">{{ submitting ? '提交中...' : '提交换货申请' }}</text>
      </view>
    </view>

    <!-- 原因选择弹窗 -->
    <view v-if="showReasonPicker" class="mask" @tap="showReasonPicker = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">选择换货原因</text>
          <text class="sheet-close" @tap="showReasonPicker = false">关闭</text>
        </view>
        <view class="sheet-body" :style="{ paddingBottom: (safeBottom + 24) + 'px' }">
          <view
            v-for="r in reasons"
            :key="r.value"
            class="reason-item"
            :class="{ 'reason-active': reason === r.value }"
            hover-class="opt-hover"
            @tap="pickReason(r.value)"
          >
            <text>{{ r.label }}</text>
            <app-icon v-if="reason === r.value" name="check" :size="32" color="#C41E3A" />
          </view>
        </view>
      </view>
    </view>

    <!-- 地址选择弹窗 -->
    <view v-if="showAddressPicker" class="mask" @tap="showAddressPicker = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">选择取件地址</text>
          <text class="sheet-close" @tap="showAddressPicker = false">关闭</text>
        </view>
        <view class="sheet-body" :style="{ paddingBottom: (safeBottom + 24) + 'px' }">
          <view
            v-for="addr in addresses"
            :key="addr.id"
            class="addr-pick"
            :class="{ 'addr-pick-active': selectedAddress && selectedAddress.id === addr.id }"
            hover-class="card-hover"
            @tap="pickAddress(addr)"
          >
            <view class="addr-top">
              <text class="addr-name">{{ addr.name }}</text>
              <text class="addr-phone">{{ addr.phone }}</text>
              <text v-if="addr.isDefault" class="addr-default">默认</text>
            </view>
            <text class="addr-detail">{{ fullAddress(addr) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateTo } from '@/utils/router'
import {
  shopApi,
  type ShopExchangeProduct,
  type ShopExchangeAddress,
} from '@/lib/shop-data'
import { formatPrice } from '@/utils/format'

const safeBottom = ref(0)
const orderId = ref('')
const loading = ref(true)
const error = ref('')

const reasons = ref<{ value: string; label: string }[]>([])
const products = ref<ShopExchangeProduct[]>([])
const addresses = ref<ShopExchangeAddress[]>([])

const selectedProduct = ref<ShopExchangeProduct | null>(null)
const reason = ref('')
const exchangeType = ref<'same' | 'different'>('same')
const newSkuId = ref('')
const description = ref('')
const images = ref<string[]>([])
const selectedAddress = ref<ShopExchangeAddress | null>(null)
const showReasonPicker = ref(false)
const showAddressPicker = ref(false)
const submitting = ref(false)
const errors = ref<Record<string, string>>({})

const exchangeTypes = [
  { value: 'same' as const, label: '同款换同款', desc: '更换相同规格商品' },
  { value: 'different' as const, label: '换其他规格', desc: '更换其他规格' },
]

const reasonLabel = computed(() => (reason.value ? reasons.value.find((r) => r.value === reason.value)?.label : '请选择'))
const availableSkus = computed(() => selectedProduct.value?.skus.filter((s) => s.id !== selectedProduct.value?.skuId) || [])

onLoad((q) => {
  if (q && q.orderId) orderId.value = String(q.orderId)
  try {
    const info = uni.getSystemInfoSync()
    safeBottom.value = info.safeAreaInsets ? info.safeAreaInsets.bottom : 0
  } catch (e) {
    safeBottom.value = 0
  }
})
onMounted(async () => {
  try {
    const res = await shopApi.getExchange(orderId.value)
    reasons.value = res.reasons
    products.value = res.products
    addresses.value = res.addresses
    if (products.value.length === 1) selectedProduct.value = products.value[0]
    const def = addresses.value.find((a) => a.isDefault)
    if (def) selectedAddress.value = def
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
})

function fullAddress(a: ShopExchangeAddress) {
  return `${a.province}${a.city}${a.district}${a.address}`
}
function selectProduct(p: ShopExchangeProduct) {
  selectedProduct.value = p
  newSkuId.value = ''
}
function selectType(t: 'same' | 'different') {
  exchangeType.value = t
  newSkuId.value = ''
}
function pickReason(v: string) {
  reason.value = v
  showReasonPicker.value = false
}
function pickAddress(a: ShopExchangeAddress) {
  selectedAddress.value = a
  showAddressPicker.value = false
}
function addImage() {
  if (images.value.length >= 5) return
  images.value.push(`https://picsum.photos/200/200?random=${Date.now()}`)
}
function removeImage(idx: number) {
  images.value.splice(idx, 1)
}
function validate() {
  const e: Record<string, string> = {}
  if (!selectedProduct.value) e.product = '请选择要换货的商品'
  if (!reason.value) e.reason = '请选择换货原因'
  if (exchangeType.value === 'different' && !newSkuId.value) e.sku = '请选择新规格'
  if (!selectedAddress.value) e.address = '请选择取件地址'
  errors.value = e
  return Object.keys(e).length === 0
}
async function handleSubmit() {
  if (submitting.value) return
  if (!validate()) return
  submitting.value = true
  try {
    // 组装换货说明并提交售后(type=exchange)
    const typeLabel = exchangeType.value === 'different' ? '换其他规格' : '换同款'
    const newSku = exchangeType.value === 'different'
      ? availableSkus.value.find((s) => s.id === newSkuId.value)?.name
      : ''
    const parts = [
      `换货商品：${selectedProduct.value?.name || ''}`,
      `换货方式：${typeLabel}${newSku ? `（${newSku}）` : ''}`,
      `原因：${reasons.value.find((r) => r.value === reason.value)?.label || reason.value}`,
      description.value ? `补充：${description.value}` : '',
    ].filter(Boolean)
    await shopApi.submitExchange(orderId.value, parts.join('；').slice(0, 500))
    uni.showToast({ title: '换货申请已提交', icon: 'success' })
    setTimeout(() => navigateTo('/shop/my-after-sales'), 1200)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '提交失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
async function retryLoad() {
  loading.value = true
  error.value = ''
  try {
    const res = await shopApi.getExchange(orderId.value)
    reasons.value = res.reasons
    products.value = res.products
    addresses.value = res.addresses
    if (products.value.length === 1) selectedProduct.value = products.value[0]
    const def = addresses.value.find((a) => a.isDefault)
    if (def) selectedAddress.value = def
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.ex-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 160rpx;
}
.content {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
}
.card-hover {
  opacity: 0.92;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}
.card-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.card-title.block {
  display: block;
  margin-bottom: 24rpx;
}
.err {
  margin-left: auto;
  font-size: 22rpx;
  color: #ef4444;
}
.prod-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.prod-item {
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  border-radius: 18rpx;
  border: 2rpx solid #e8e3db;
}
.prod-active {
  border-color: var(--brand);
  background: #fdf2f3;
}
.prod-cover-wrap {
  position: relative;
}
.prod-cover {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #f0ece4;
}
.prod-check {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}
.prod-info {
  flex: 1;
  min-width: 0;
}
.prod-name {
  display: block;
  font-size: 28rpx;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prod-sku {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin: 8rpx 0;
}
.prod-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.prod-price {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--brand);
}
.prod-qty {
  font-size: 24rpx;
  color: #999;
}
.cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cell-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.cell-label {
  font-size: 28rpx;
  color: #2c2c2c;
}
.cell-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.cell-value {
  font-size: 28rpx;
  color: #2c2c2c;
}
.placeholder {
  color: #999;
}
.type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.type-item {
  padding: 20rpx;
  border-radius: 18rpx;
  border: 2rpx solid #e8e3db;
}
.type-active {
  border-color: var(--brand);
  background: #fdf2f3;
}
.type-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.radio {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  border: 2rpx solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
}
.radio-active {
  border-color: var(--brand);
}
.radio-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: var(--brand);
}
.type-label {
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.type-desc {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
  margin-left: 44rpx;
}
.new-sku {
  margin-top: 28rpx;
  padding-top: 28rpx;
  border-top: 1rpx solid #e8e3db;
}
.new-sku-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.new-sku-label {
  font-size: 26rpx;
  color: #666;
}
.sku-opts {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.sku-opt {
  padding: 14rpx 24rpx;
  border-radius: 12rpx;
  border: 2rpx solid #e8e3db;
  font-size: 26rpx;
  color: #666;
}
.sku-opt-active {
  border-color: var(--brand);
  background: #fdf2f3;
  color: var(--brand);
}
.opt-hover {
  opacity: 0.7;
}
.no-sku {
  font-size: 26rpx;
  color: #999;
}
.textarea {
  width: 100%;
  height: 180rpx;
  padding: 24rpx;
  background: #faf8f5;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  box-sizing: border-box;
}
.counter {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}
.img-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}
.img-item {
  position: relative;
  width: 140rpx;
  height: 140rpx;
}
.up-img {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
  background: #f0ece4;
}
.img-del {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #2c2c2c;
  display: flex;
  align-items: center;
  justify-content: center;
}
.img-add {
  width: 140rpx;
  height: 140rpx;
  background: #faf8f5;
  border-radius: 12rpx;
  border: 2rpx dashed #e8e3db;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}
.add-count {
  font-size: 22rpx;
  color: #999;
}
.addr {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  background: #faf8f5;
  border-radius: 16rpx;
}
.addr-info {
  flex: 1;
  min-width: 0;
}
.addr-top {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.addr-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.addr-phone {
  font-size: 26rpx;
  color: #666;
}
.addr-default {
  font-size: 20rpx;
  color: #fff;
  background: var(--brand);
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.addr-detail {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-top: 8rpx;
}
.addr-empty {
  padding: 24rpx;
  background: #faf8f5;
  border-radius: 16rpx;
  text-align: center;
}
.addr-empty-text {
  font-size: 26rpx;
  color: #999;
}
.notice {
  background: #eff6ff;
  border-radius: 24rpx;
  padding: 28rpx;
}
.notice-title {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #1d4ed8;
  margin-bottom: 16rpx;
}
.notice-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.notice-item {
  font-size: 22rpx;
  color: #2563eb;
  line-height: 1.5;
}
.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 30;
  background: #fff;
  border-top: 1rpx solid #e8e3db;
  padding: 16rpx 24rpx;
}
.submit-btn {
  height: 88rpx;
  border-radius: 18rpx;
  background: linear-gradient(90deg, var(--brand), #e85d04);
  display: flex;
  align-items: center;
  justify-content: center;
}
.disabled {
  opacity: 0.5;
}
.submit-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}
.btn-hover {
  opacity: 0.88;
}
.mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid #e8e3db;
}
.sheet-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.sheet-close {
  font-size: 28rpx;
  color: #999;
}
.sheet-body {
  padding: 16rpx 24rpx;
  overflow-y: auto;
}
.reason-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #2c2c2c;
}
.reason-active {
  color: var(--brand);
}
.addr-pick {
  padding: 24rpx;
  border-radius: 18rpx;
  border: 2rpx solid #e8e3db;
  margin-bottom: 20rpx;
}
.addr-pick-active {
  border-color: var(--brand);
  background: #fdf2f3;
}

/* 三态UI */
.state-box {
  padding: 96rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}
.state-spin {
  width: 64rpx;
  height: 64rpx;
  border: 4rpx solid #e8e3db;
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.state-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #f0ece2;
  display: flex;
  align-items: center;
  justify-content: center;
}
.state-text {
  font-size: 26rpx;
  color: #b8ab94;
}
.state-retry {
  padding: 12rpx 48rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.state-retry-text {
  font-size: 26rpx;
  color: #fff;
}
</style>
