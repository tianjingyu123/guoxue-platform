<template>
  <view class="sku-cart">
    <app-nav-bar title="购物车" back-icon="arrow-left" :back-size="40" :title-size="36" :bar-height="106">
      <template #right>
        <text class="nav-edit" @tap="editMode = !editMode">{{ editMode ? '完成' : '管理' }}</text>
      </template>
    </app-nav-bar>

    <!-- 加载中 -->
    <view v-if="loading" class="state-wrap">
      <text class="state-text">加载中...</text>
    </view>
    <!-- 错误 -->
    <view v-else-if="error" class="state-wrap">
      <app-icon name="alert-circle" :size="56" color="#E74C3C" />
      <text class="state-text">{{ error }}</text>
      <view class="retry-btn" @tap="retry">
        <text class="retry-btn-text">重试</text>
      </view>
    </view>
    <!-- 数据内容 -->
    <template v-else>
    <scroll-view scroll-y class="content" v-if="validItems.length || invalidItems.length">
      <!-- 有效商品 -->
      <view class="item-list">
        <view
          v-for="item in validItems"
          :key="item.id"
          class="swipe-wrap"
        >
          <view class="swipe-inner" :style="{ transform: openId === item.id ? 'translateX(-160rpx)' : 'translateX(0)' }">
            <view class="cart-item" @tap="onItemTap(item)">
              <view class="item-check" :class="{ checked: item.selected }" @tap.stop="toggleItem(item)">
                <app-icon v-if="item.selected" name="check" :size="28" color="#FFFFFF" />
              </view>
              <image lazy-load class="item-img" :src="item.productCover" mode="aspectFill" />
              <view class="item-info">
                <text class="item-name">{{ item.productName }}</text>
                <view class="sku-tag"><text>{{ item.skuName }}</text></view>
                <view class="item-bottom">
                  <view class="price-box">
                    <text class="cur">¥{{ formatPrice(item.price) }}</text>
                    <text class="ori">¥{{ formatPrice(item.originalPrice) }}</text>
                  </view>
                  <view class="stepper">
                    <view class="step-btn" :class="{ disabled: item.quantity <= 1 }" @tap.stop="changeQty(item, -1)"><app-icon name="minus" :size="24" color="#666666" /></view>
                    <text class="step-num">{{ item.quantity }}</text>
                    <view class="step-btn" :class="{ disabled: item.quantity >= item.stock }" @tap.stop="changeQty(item, 1)"><app-icon name="plus" :size="24" color="#666666" /></view>
                  </view>
                </view>
              </view>
            </view>
            <view class="swipe-delete" @tap="removeItem(item.id)">
              <text>删除</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 失效区 -->
      <view class="invalid-block" v-if="invalidItems.length">
        <view class="invalid-header">
          <text class="invalid-title">失效商品</text>
          <view class="invalid-clear" @tap="clearInvalid"><app-icon name="trash-2" :size="26" color="#999999" /><text>清空失效</text></view>
        </view>
        <view v-for="iv in invalidItems" :key="iv.id" class="cart-item invalid">
          <view class="invalid-badge"><text>失效</text></view>
          <image lazy-load class="item-img gray" :src="iv.productCover" mode="aspectFill" />
          <view class="item-info">
            <text class="item-name gray">{{ iv.productName }}</text>
            <text class="invalid-reason">{{ iv.invalidReason }}</text>
          </view>
        </view>
      </view>
      <view style="height: 160rpx;" />
    </scroll-view>

    <view class="empty" v-else>
      <app-icon name="shopping-cart" :size="120" color="#DDDDDD" />
      <text class="empty-text">购物车是空的</text>
      <view class="empty-btn" @tap="goShop"><text>去选购</text></view>
    </view>

    <!-- 底部渐变结算栏 -->
    <view class="footer" v-if="validItems.length">
      <view class="all-check" :class="{ checked: isAllChecked }" @tap="toggleAll">
        <app-icon v-if="isAllChecked" name="check" :size="28" color="#FFFFFF" />
      </view>
      <text class="all-label">全选</text>
      <view class="footer-info" v-if="!editMode">
        <view class="total-row">
          <text class="total-label">合计</text>
          <text class="total-amount">¥{{ formatPrice(totalAmount) }}</text>
        </view>
        <text class="saved">已优惠 ¥{{ formatPrice(savedAmount) }}</text>
      </view>
      <view class="footer-spacer" v-else />
      <view class="checkout-btn" v-if="!editMode" @tap="goCheckout">
        <text>结算({{ selectedCount }})</text>
      </view>
      <view class="checkout-btn danger" v-else @tap="removeSelected">
        <text>删除</text>
      </view>
    </view>
      </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo, reLaunch } from '@/utils/router'
import { shopApi, type SkuCartItem } from '@/lib/shop-data'
import { formatPrice } from '@/utils/format'

const items = ref<SkuCartItem[]>([])
const loading = ref(true)
const error = ref('')
const submitting = ref(false)
const editMode = ref(false)
const openId = ref<string | null>(null)

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    items.value = await shopApi.getSkuCart()
  } catch (_e) {
    error.value = '加载失败，请重试'
  } finally {
    loading.value = false
  }
})

function retry() {
  loading.value = true
  error.value = ''
  shopApi.getSkuCart().then((data) => {
    items.value = data
  }).catch(() => {
    error.value = '加载失败，请重试'
  }).finally(() => {
    loading.value = false
  })
}

const validItems = computed(() => items.value.filter((i) => i.isValid))
const invalidItems = computed(() => items.value.filter((i) => !i.isValid))

function onItemTap(item: SkuCartItem) {
  if (openId.value === item.id) {
    openId.value = null
    return
  }
  openId.value = item.id
}
function toggleItem(item: SkuCartItem) {
  item.selected = !item.selected
}
const isAllChecked = computed(() => validItems.value.length > 0 && validItems.value.every((i) => i.selected))
function toggleAll() {
  const next = !isAllChecked.value
  validItems.value.forEach((i) => (i.selected = next))
}
const selectedCount = computed(() => validItems.value.filter((i) => i.selected).reduce((s, i) => s + i.quantity, 0))
const totalAmount = computed(() => validItems.value.filter((i) => i.selected).reduce((s, i) => s + i.price * i.quantity, 0))
const savedAmount = computed(() => validItems.value.filter((i) => i.selected).reduce((s, i) => s + (i.originalPrice - i.price) * i.quantity, 0))
/** 写操作后重拉购物车，保留用户当前勾选状态 */
async function refreshSku() {
  const selectedMap = new Map(items.value.map((i) => [i.id, i.selected]))
  const next = await shopApi.getSkuCart()
  items.value = next.map((i) => ({ ...i, selected: selectedMap.has(i.id) ? selectedMap.get(i.id)! : i.selected }))
}
async function changeQty(item: SkuCartItem, delta: number) {
  const next = item.quantity + delta
  if (next < 1 || next > item.stock || submitting.value) return
  submitting.value = true
  try {
    await shopApi.updateCartItem(item.id, next)
    await refreshSku()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '更新失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
async function removeItem(id: string) {
  if (submitting.value) return
  submitting.value = true
  try {
    await shopApi.removeCartItem(id)
    await refreshSku()
    openId.value = null
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '删除失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
async function removeSelected() {
  if (submitting.value) return
  submitting.value = true
  try {
    const targets = items.value.filter((i) => i.isValid && i.selected).map((i) => i.id)
    for (const id of targets) await shopApi.removeCartItem(id)
    await refreshSku()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '删除失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
async function clearInvalid() {
  if (submitting.value) return
  submitting.value = true
  try {
    const targets = items.value.filter((i) => !i.isValid).map((i) => i.id)
    for (const id of targets) await shopApi.removeCartItem(id)
    await refreshSku()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '清除失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
function goShop() { reLaunch('/mall') }
function goCheckout() {
  if (submitting.value) return
  if (selectedCount.value === 0) { uni.showToast({ title: '请选择商品', icon: 'none' }); return }
  submitting.value = true
  navigateTo('/shop/checkout')
  setTimeout(() => (submitting.value = false), 500)
}
</script>

<style lang="scss" scoped>
.sku-cart { min-height: 100vh; background: #F5F5F5; display: flex; flex-direction: column; }
.nav-edit { font-size: 28rpx; color: var(--brand); }
.content { flex: 1; }
.item-list { padding: 20rpx; display: flex; flex-direction: column; gap: 20rpx; }
.swipe-wrap { overflow: hidden; border-radius: 20rpx; }
.swipe-inner { display: flex; transition: transform 0.25s; position: relative; }
.cart-item {
  display: flex; gap: 16rpx; align-items: center;
  background: #FFFFFF; border-radius: 20rpx; padding: 24rpx;
  width: 100%; box-sizing: border-box; flex-shrink: 0;
}
.cart-item.invalid { margin-top: 20rpx; }
.swipe-delete {
  width: 160rpx; flex-shrink: 0;
  background: #E74C3C;
  display: flex; align-items: center; justify-content: center;
  margin-left: 20rpx; border-radius: 20rpx;
}
.swipe-delete text { color: #FFFFFF; font-size: 28rpx; }
.item-check, .all-check {
  width: 40rpx; height: 40rpx; border-radius: 50%;
  border: 2rpx solid #CCCCCC;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  &.checked { background: var(--brand); border-color: var(--brand); }
}
.item-img { width: 160rpx; height: 160rpx; border-radius: 12rpx; flex-shrink: 0; }
.item-img.gray { opacity: 0.5; }
.item-info { flex: 1; display: flex; flex-direction: column; gap: 10rpx; min-width: 0; }
.item-name { font-size: 28rpx; color: #1A1A1A; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.item-name.gray { color: #999999; }
.sku-tag { align-self: flex-start; background: #F5F5F5; padding: 4rpx 14rpx; border-radius: 8rpx; }
.sku-tag text { font-size: 22rpx; color: #999999; }
.item-bottom { display: flex; align-items: center; justify-content: space-between; }
.price-box { display: flex; align-items: baseline; gap: 10rpx; }
.cur { font-size: 32rpx; color: var(--brand); font-weight: 700; }
.ori { font-size: 22rpx; color: #BBBBBB; text-decoration: line-through; }
.stepper { display: flex; align-items: center; border: 2rpx solid #EEEEEE; border-radius: 8rpx; }
.step-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; &.disabled { opacity: 0.3; } }
.step-num { width: 56rpx; text-align: center; font-size: 26rpx; color: #1A1A1A; }
.invalid-block { padding: 0 20rpx; }
.invalid-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 4rpx 0; }
.invalid-title { font-size: 26rpx; color: #999999; }
.invalid-clear { display: flex; align-items: center; gap: 8rpx; }
.invalid-clear text { font-size: 24rpx; color: #999999; }
.invalid-badge { background: #999999; padding: 4rpx 12rpx; border-radius: 8rpx; }
.invalid-badge text { font-size: 20rpx; color: #FFFFFF; }
.invalid-reason { font-size: 24rpx; color: #999999; }
.empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; }
.empty-text { font-size: 28rpx; color: #999999; }
.empty-btn { padding: 16rpx 60rpx; background: var(--brand); border-radius: 40rpx; }
.empty-btn text { color: #FFFFFF; font-size: 28rpx; }
.footer {
  position: fixed; left: 0; right: 0; bottom: 0;
  display: flex; align-items: center; gap: 16rpx;
  padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #FFFFFF; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.05);
}
.all-label { font-size: 28rpx; color: #1A1A1A; }
.footer-info { margin-left: auto; display: flex; flex-direction: column; align-items: flex-end; }
.footer-spacer { margin-left: auto; }
.total-row { display: flex; align-items: baseline; gap: 6rpx; }
.total-label { font-size: 26rpx; color: #666666; }
.total-amount { font-size: 36rpx; color: var(--brand); font-weight: 700; }
.saved { font-size: 22rpx; color: #999999; }
.checkout-btn {
  padding: 20rpx 50rpx; border-radius: 40rpx; margin-left: 20rpx;
  background: linear-gradient(90deg, var(--brand), #C8453E);
}
.checkout-btn text { color: #FFFFFF; font-size: 30rpx; font-weight: 600; }
.checkout-btn.danger { background: #E74C3C; }

/* 加载/错误状态 */
.state-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 120rpx 0;
}
.state-text {
  font-size: 28rpx;
  color: #999;
}
.retry-btn {
  padding: 16rpx 48rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.retry-btn-text {
  font-size: 26rpx;
  color: #fff;
}
</style>
