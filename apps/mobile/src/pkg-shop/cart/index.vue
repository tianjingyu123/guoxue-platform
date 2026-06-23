<template>
  <view class="cart-page">
    <!-- 顶部导航 -->
    <app-nav-bar :title="`购物车(${items.length})`" back-icon="arrow-left" :back-size="40" :title-size="36" :bar-height="106">
      <template #right>
        <text v-if="items.length" class="nav-edit" @tap="editMode = !editMode">{{ editMode ? '完成' : '编辑' }}</text>
      </template>
    </app-nav-bar>

    <!-- 加载态 -->
    <view v-if="loading" class="loading-zone">
      <view v-for="i in 3" :key="i" class="sk-cart-item" />
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="error-zone">
      <text class="error-text">{{ error }}</text>
      <view class="error-retry" @tap="fetchCartData()"><text>重试</text></view>
    </view>

    <!-- 购物车列表 -->
    <scroll-view v-else-if="items.length" scroll-y class="content">
      <view class="list">
        <!-- 有效商品 -->
        <view
          v-for="item in validItems"
          :key="item.id"
          class="swipe-wrap"
          @touchstart="onTouchStart($event, item.id)"
          @touchmove="onTouchMove($event, item.id)"
          @touchend="onTouchEnd"
        >
          <!-- 左滑删除按钮 -->
          <view class="swipe-delete" :class="{ show: swipedId === item.id }" @tap="removeItem(item.id)">
            <app-icon name="trash-2" :size="32" color="#FFFFFF" />
            <text class="swipe-delete-text">删除</text>
          </view>

          <!-- 商品卡片 -->
          <view class="cart-card" :class="{ swiped: swipedId === item.id }">
            <view class="item-check tap-press" @tap="toggleSelect(item.id)">
              <app-icon
                :name="item.selected ? 'check-circle' : 'circle'"
                :size="38"
                :color="item.selected ? '#C41E3A' : '#CCCCCC'"
              />
            </view>
            <image class="item-img" :src="item.productCover" mode="aspectFill" @tap="goProduct(item.productId)" />
            <view class="item-info">
              <text class="item-name" @tap="goProduct(item.productId)">{{ item.productName }}</text>
              <text class="item-sku">{{ item.skuName }}</text>
              <view class="item-bottom">
                <view class="price-box">
                  <text class="cur">¥{{ item.price }}</text>
                  <text v-if="item.originalPrice > item.price" class="ori">¥{{ item.originalPrice }}</text>
                </view>
                <!-- 编辑模式：删除按钮 -->
                <view v-if="editMode" class="del-btn tap-press" @tap="removeItem(item.id)">
                  <app-icon name="trash-2" :size="28" color="#E74C3C" />
                </view>
                <!-- 正常模式：数量步进 -->
                <view v-else class="stepper">
                  <view
                    class="step-btn tap-press"
                    :class="{ disabled: item.quantity <= 1 }"
                    @tap="changeQty(item, -1)"
                  >
                    <app-icon name="minus" :size="24" :color="item.quantity <= 1 ? '#CCCCCC' : '#666666'" />
                  </view>
                  <text class="step-num">{{ item.quantity }}</text>
                  <view
                    class="step-btn tap-press"
                    :class="{ disabled: item.quantity >= item.stock }"
                    @tap="changeQty(item, 1)"
                  >
                    <app-icon name="plus" :size="24" :color="item.quantity >= item.stock ? '#CCCCCC' : '#666666'" />
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 失效商品区 -->
        <view v-if="invalidItems.length" class="invalid-block">
          <view class="invalid-header">
            <view class="invalid-left">
              <app-icon name="alert-circle" :size="28" color="#999999" />
              <text class="invalid-title">失效商品 ({{ invalidItems.length }})</text>
            </view>
            <text class="invalid-clear" @tap="clearInvalid">清除全部</text>
          </view>
          <view v-for="iv in invalidItems" :key="iv.id" class="invalid-item">
            <view class="invalid-img-wrap">
              <image class="invalid-img" :src="iv.productCover" mode="aspectFill" />
              <view class="invalid-mask"><text class="invalid-mask-text">已失效</text></view>
            </view>
            <view class="item-info">
              <text class="invalid-name">{{ iv.productName }}</text>
              <text class="invalid-sku">{{ iv.skuName }}</text>
              <text class="invalid-reason">{{ iv.invalidReason }}</text>
            </view>
            <view class="invalid-close tap-press" @tap="removeItem(iv.id)">
              <app-icon name="x" :size="32" color="#CCCCCC" />
            </view>
          </view>
        </view>
      </view>
      <view style="height: 140rpx;" />
    </scroll-view>

    <!-- 空态 -->
    <view class="empty" v-else>
      <view class="empty-icon">
        <app-icon name="shopping-bag" :size="80" color="#999999" />
      </view>
      <text class="empty-text">购物车空空如也</text>
      <view class="empty-btn btn-press" @tap="goMall"><text class="empty-btn-text">去逛逛</text></view>
    </view>

    <!-- 底部结算栏 -->
    <view class="footer" v-if="items.length">
      <view class="all-check-wrap tap-press" @tap="toggleSelectAll">
        <app-icon
          :name="allSelected ? 'check-circle' : 'circle'"
          :size="38"
          :color="allSelected ? '#C41E3A' : '#CCCCCC'"
        />
        <text class="all-label">全选</text>
      </view>

      <!-- 编辑模式：删除选中 -->
      <view
        v-if="editMode"
        class="footer-btn danger btn-press"
        :class="{ disabled: selectedCount === 0 }"
        @tap="removeSelected"
      >
        <text class="footer-btn-text">删除选中({{ selectedCount }})</text>
      </view>

      <!-- 正常模式：合计 + 结算 -->
      <view v-else class="footer-right">
        <view class="footer-total">
          <text class="total-count">已选 {{ selectedCount }} 件</text>
          <view class="total-row">
            <text class="total-label">合计：</text>
            <text class="total-amount">¥{{ totalAmount.toFixed(2) }}</text>
          </view>
        </view>
        <view
          class="footer-btn btn-press"
          :class="{ disabled: selectedCount === 0 }"
          @tap="goCheckout"
        >
          <text class="footer-btn-text">结算({{ selectedCount }})</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo, reLaunch } from '@/utils/router'
import { shopApi, type FlatCartItem } from '@/lib/shop-data'

const loading = ref(true)
const error = ref('')
const items = ref<FlatCartItem[]>([])
const editMode = ref(false)
const swipedId = ref<number | null>(null)
const submitting = ref(false)

let touchStartX = 0

async function fetchCartData() {
  error.value = ''
  loading.value = true
  try {
    const result = await shopApi.getCart()
    items.value = result.items || []
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchCartData() })

const validItems = computed(() => items.value.filter((i) => i.isValid))
const invalidItems = computed(() => items.value.filter((i) => !i.isValid))
const allSelected = computed(() => validItems.value.length > 0 && validItems.value.every((i) => i.selected))
const selectedCount = computed(() =>
  validItems.value.filter((i) => i.selected).reduce((s, i) => s + i.quantity, 0),
)
const totalAmount = computed(() =>
  validItems.value.filter((i) => i.selected).reduce((s, i) => s + i.price * i.quantity, 0),
)

function toggleSelect(id: number) {
  const it = items.value.find((i) => i.id === id)
  if (it) it.selected = !it.selected
}
function toggleSelectAll() {
  const next = !allSelected.value
  items.value.forEach((i) => {
    if (i.isValid) i.selected = next
  })
}
function changeQty(item: FlatCartItem, delta: number) {
  const next = Math.max(1, Math.min(item.stock, item.quantity + delta))
  item.quantity = next
}
function removeItem(id: number) {
  if (submitting.value) return
  submitting.value = true
  items.value = items.value.filter((i) => i.id !== id)
  swipedId.value = null
  submitting.value = false
}
function removeSelected() {
  if (selectedCount.value === 0 || submitting.value) return
  submitting.value = true
  items.value = items.value.filter((i) => !(i.isValid && i.selected))
  submitting.value = false
}
function clearInvalid() {
  if (submitting.value) return
  submitting.value = true
  items.value = items.value.filter((i) => i.isValid)
  submitting.value = false
}

// 左滑手势
function onTouchStart(e: TouchEvent, _id: number) {
  touchStartX = e.touches[0].clientX
}
function onTouchMove(e: TouchEvent, id: number) {
  const diff = touchStartX - e.touches[0].clientX
  if (diff > 50) swipedId.value = id
  else if (diff < -30) swipedId.value = null
}
function onTouchEnd() {
  // 保持当前滑动状态
}

function goMall() {
  reLaunch('/mall')
}
function goProduct(id: number) {
  navigateTo(`/pkg-shop/product/index?id=${id}`)
}
function goCheckout() {
  if (selectedCount.value === 0) return
  const ids = validItems.value.filter((i) => i.selected).map((i) => i.id)
  navigateTo(`/pkg-shop/checkout/index?items=${ids.join(',')}`)
}
</script>

<style lang="scss" scoped>
.cart-page {
  min-height: 100vh;
  background: #FAF8F5;
  display: flex;
  flex-direction: column;
}
.nav-edit { font-size: 28rpx; color: #C41E3A; }
.content { flex: 1; }
.list { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }

/* 左滑容器 */
.swipe-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 24rpx;
}
.swipe-delete {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 120rpx;
  background: #E74C3C;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.swipe-delete.show { opacity: 1; }
.swipe-delete-text { font-size: 22rpx; color: #FFFFFF; }

.cart-card {
  position: relative;
  background: #FFFFFF;
  padding: 24rpx;
  display: flex;
  gap: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03);
  transition: transform 0.25s cubic-bezier(0.16,1,0.3,1);
}
.cart-card.swiped { transform: translateX(-120rpx); }
.item-check {
  flex-shrink: 0;
  margin-top: 40rpx;
  width: 38rpx;
  height: 38rpx;
}
.item-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}
.item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.item-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.item-sku { font-size: 24rpx; color: #999999; margin-top: 8rpx; }
.item-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.price-box { display: flex; align-items: baseline; gap: 10rpx; }
.cur { font-size: 32rpx; color: #C41E3A; font-weight: 600; }
.ori { font-size: 22rpx; color: #999999; text-decoration: line-through; }
.del-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(231,76,60,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.stepper {
  display: flex;
  align-items: center;
  background: #F5F0EB;
  border-radius: 40rpx;
  padding: 0 6rpx;
}
.step-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease;
}
.step-btn.disabled { opacity: 0.3; }
.step-num { width: 56rpx; text-align: center; font-size: 28rpx; color: #2C2C2C; }

/* 失效商品 */
.invalid-block { margin-top: 24rpx; }
.invalid-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.invalid-left { display: flex; align-items: center; gap: 12rpx; }
.invalid-title { font-size: 26rpx; color: #999999; }
.invalid-clear { font-size: 24rpx; color: #C41E3A; }
.invalid-item {
  background: rgba(255,255,255,0.6);
  border-radius: 24rpx;
  padding: 24rpx;
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
  opacity: 0.7;
}
.invalid-img-wrap { position: relative; width: 160rpx; height: 160rpx; flex-shrink: 0; }
.invalid-img { width: 160rpx; height: 160rpx; border-radius: 12rpx; filter: grayscale(1); }
.invalid-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.invalid-mask-text { font-size: 22rpx; color: #FFFFFF; }
.invalid-name {
  font-size: 28rpx;
  color: #999999;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.invalid-sku { font-size: 24rpx; color: #CCCCCC; margin-top: 8rpx; }
.invalid-reason { font-size: 24rpx; color: #FF6B6B; margin-top: 12rpx; }
.invalid-close { flex-shrink: 0; width: 48rpx; height: 48rpx; }

/* 空态 */
.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 140rpx 0;
}
.empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #F5F0EB;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.empty-text { font-size: 28rpx; color: #666666; margin-bottom: 32rpx; }
.empty-btn { padding: 16rpx 56rpx; background: #C41E3A; border-radius: 40rpx; }
.empty-btn-text { color: #FFFFFF; font-size: 28rpx; }

/* 底部结算栏 */
.footer {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  border-top: 1rpx solid #E8E3DB;
}
.all-check-wrap { display: flex; align-items: center; gap: 12rpx; }
.all-label { font-size: 28rpx; color: #666666; }
.footer-right { display: flex; align-items: center; gap: 24rpx; }
.footer-total { text-align: right; }
.total-count { font-size: 22rpx; color: #999999; display: block; }
.total-row { display: flex; align-items: baseline; gap: 4rpx; }
.total-label { font-size: 26rpx; color: #666666; }
.total-amount { font-size: 40rpx; color: #C41E3A; font-weight: 700; }
.footer-btn {
  padding: 20rpx 48rpx;
  background: linear-gradient(135deg, #C41E3A, #E85050);
  border-radius: 40rpx;
}
.footer-btn.danger { background: #E74C3C; }
.footer-btn.disabled { opacity: 0.5; }
.footer-btn-text { color: #FFFFFF; font-size: 28rpx; font-weight: 500; }

/* 加载态 */
.loading-zone { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.sk-cart-item { height: 200rpx; background: #ececec; border-radius: 24rpx; }

/* 错误态 */
.error-zone { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; }
.error-text { font-size: 28rpx; color: #999999; }
.error-retry { padding: 16rpx 56rpx; background: #C41E3A; border-radius: 40rpx; }
.error-retry text { color: #FFFFFF; font-size: 28rpx; }
</style>
