<template>
  <view class="page">
    <!-- 加载状态 -->
    <DataState
      :is-loading="loading"
      :error="error"
      :is-empty="!loading && !error && items.length === 0"
      empty-title="购物车是空的"
      empty-description="快去商城挑选心仪的商品吧"
      empty-action-text="去逛逛"
      skeleton-type="list"
      @retry="fetchCart"
      @empty-action="goShop"
    >
      <!-- 购物车列表 -->
      <view class="cart-list">
        <view
          v-for="item in items"
          :key="item.id"
          class="cart-item"
          @touchstart="onTouchStart($event, item.id)"
          @touchmove="onTouchMove($event, item.id)"
          @touchend="onTouchEnd(item.id)"
        >
          <view class="item-left">
            <!-- 选择框 -->
            <view
              class="item-checkbox"
              @click.stop="toggleSelect(item.id)"
            >
              <view :class="['checkbox-circle', { checked: selectedIds.has(item.id) }]">
                <text
                  v-if="selectedIds.has(item.id)"
                  class="check-mark"
                >
                  ✓
                </text>
              </view>
            </view>
            <!-- 商品图 -->
            <image
              :src="item.cover"
              class="item-img"
              mode="aspectFill"
              @click="goProduct(item.productId)"
            />
          </view>
          <view class="item-info">
            <text
              class="item-title"
              @click="goProduct(item.productId)"
            >
              {{ item.title }}
            </text>
            <text
              v-if="item.skuAttrs"
              class="item-sku"
            >
              {{ item.skuAttrs }}
            </text>
            <view class="item-bottom">
              <view class="item-price-col">
                <text class="item-price">
                  ¥{{ toYuan(item.price) }}
                </text>
              </view>
              <view class="qty-ctrl">
                <text
                  class="qty-btn"
                  @click.stop="decrease(item)"
                >
                  −
                </text>
                <text class="qty-val">
                  {{ item.quantity }}
                </text>
                <text
                  class="qty-btn"
                  @click.stop="increase(item)"
                >
                  +
                </text>
              </view>
            </view>
          </view>
          <!-- 左滑删除按钮 -->
          <view
            class="delete-btn"
            :class="{ visible: swipeItemId === item.id }"
            @click.stop="removeItem(item)"
          >
            <text class="delete-text">
              删除
            </text>
          </view>
        </view>
      </view>

      <!-- 底部结算栏 -->
      <view class="bottom-bar">
        <view
          class="select-all"
          @click="toggleAll"
        >
          <view :class="['checkbox-circle', { checked: isAllSelected }]">
            <text
              v-if="isAllSelected"
              class="check-mark"
            >
              ✓
            </text>
          </view>
          <text class="select-label">
            全选
          </text>
        </view>
        <view class="total-area">
          <text class="total-label">
            合计：
          </text>
          <text class="total-price">
            ¥{{ toYuan(totalAmount) }}
          </text>
        </view>
        <view
          class="btn-checkout"
          :class="{ disabled: selectedIds.size === 0 }"
          @click="goCheckout"
        >
          结算({{ selectedIds.size }})
        </view>
      </view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { shopApi } from '../../api'
import DataState from '../../components/DataState.vue'
import type { CartItem } from '../../types'

const loading = ref(true)
const error = ref<string | null>(null)
const items = ref<CartItem[]>([])
const selectedIds = ref<Set<string>>(new Set())

// 左滑删除状态
const swipeItemId = ref<string | null>(null)
const touchStartX = ref(0)

onMounted(() => {
  fetchCart()
})

async function fetchCart() {
  loading.value = true
  error.value = null
  try {
    const data = await shopApi.getCart()
    if (data && data.items) {
      items.value = data.items
    } else if (Array.isArray(data)) {
      items.value = data
    } else {
      items.value = []
    }
    // 如果没有已选中的，默认全选
    if (selectedIds.value.size === 0 && items.value.length > 0) {
      items.value.forEach(i => selectedIds.value.add(i.id))
    }
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const isAllSelected = computed(() => {
  return items.value.length > 0 && selectedIds.value.size === items.value.length
})

const totalAmount = computed(() => {
  return items.value
    .filter(i => selectedIds.value.has(i.id))
    .reduce((sum, i) => sum + i.price * i.quantity, 0)
})

function toggleSelect(id: string) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

function toggleAll() {
  if (isAllSelected.value) {
    selectedIds.value.clear()
  } else {
    items.value.forEach(i => selectedIds.value.add(i.id))
  }
}

async function decrease(item: CartItem) {
  if (item.quantity <= 1) {
    removeItem(item)
    return
  }
  try {
    await shopApi.updateCartItem(item.id, { quantity: item.quantity - 1 })
    item.quantity--
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function increase(item: CartItem) {
  if (item.quantity >= item.stock) {
    uni.showToast({ title: '已达库存上限', icon: 'none' })
    return
  }
  try {
    await shopApi.updateCartItem(item.id, { quantity: item.quantity + 1 })
    item.quantity++
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function removeItem(item: CartItem) {
  const { confirm } = await uni.showModal({
    title: '移除商品',
    content: `确定要从购物车移除「${item.title}」吗？`,
  })
  if (!confirm) return
  try {
    await shopApi.removeCartItem(item.id)
    items.value = items.value.filter(i => i.id !== item.id)
    selectedIds.value.delete(item.id)
    swipeItemId.value = null
    uni.showToast({ title: '已移除', icon: 'success' })
  } catch {
    uni.showToast({ title: '移除失败', icon: 'none' })
  }
}

function toYuan(fen: number): string {
  return (fen / 100).toFixed(2)
}

function goProduct(productId: string) {
  uni.navigateTo({ url: `/pages/shop/product-detail?id=${productId}` })
}

function goCheckout() {
  if (selectedIds.value.size === 0) {
    uni.showToast({ title: '请选择商品', icon: 'none' })
    return
  }
  const ids = Array.from(selectedIds.value).join(',')
  uni.navigateTo({ url: `/pages/shop/checkout?ids=${ids}` })
}

function goShop() {
  uni.switchTab({ url: '/pages/shop/shop' })
}

// 左滑删除手势
function onTouchStart(e: TouchEvent, id: string) {
  touchStartX.value = e.touches[0].clientX
}
function onTouchMove(e: TouchEvent, id: string) {
  const diff = touchStartX.value - e.touches[0].clientX
  if (diff > 50) {
    swipeItemId.value = id
  } else if (diff < -30) {
    swipeItemId.value = null
  }
}
function onTouchEnd(id: string) {
  // 延时关闭
  setTimeout(() => {
    if (swipeItemId.value === id) {
      swipeItemId.value = null
    }
  }, 3000)
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 120rpx;
}

/* ===== 购物车列表 ===== */
.cart-list {
  padding: 0 0 12rpx;
}
.cart-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  margin: 12rpx 20rpx 0;
  padding: 20rpx;
  border-radius: 16rpx;
  position: relative;
  overflow: hidden;
}
.item-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-shrink: 0;
}

/* ===== 选择框 ===== */
.item-checkbox {
  padding: 8rpx;
}
.checkbox-circle {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.checkbox-circle.checked {
  background: #C41E3A;
  border-color: #C41E3A;
}
.check-mark {
  font-size: 22rpx;
  color: #fff;
  font-weight: bold;
}

/* ===== 商品图 ===== */
.item-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #F5F0E8;
  flex-shrink: 0;
}

/* ===== 商品信息 ===== */
.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.item-title {
  font-size: 28rpx;
  color: #2C2C2C;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  line-height: 1.4;
  font-weight: 500;
}
.item-sku {
  font-size: 22rpx;
  color: #bbb;
}
.item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4rpx;
}
.item-price-col {
  display: flex;
  flex-direction: column;
}
.item-price {
  font-size: 32rpx;
  font-weight: bold;
  color: #C41E3A;
}

/* ===== 数量控制 ===== */
.qty-ctrl {
  display: flex;
  align-items: center;
  border: 1rpx solid #E8E0D5;
  border-radius: 32rpx;
  overflow: hidden;
}
.qty-btn {
  width: 56rpx;
  height: 52rpx;
  text-align: center;
  line-height: 52rpx;
  font-size: 30rpx;
  color: #666;
  background: #F5F0E8;
}
.qty-val {
  width: 64rpx;
  text-align: center;
  font-size: 26rpx;
  color: #333;
}

/* ===== 左滑删除 ===== */
.delete-btn {
  position: absolute;
  right: -150rpx;
  top: 0;
  bottom: 0;
  width: 140rpx;
  background: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: right 0.25s ease;
}
.delete-btn.visible {
  right: 0;
}
.delete-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

/* ===== 底部结算栏 ===== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border-top: 1rpx solid #E8E0D5;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  z-index: 50;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06);
}
.select-all {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}
.select-label {
  font-size: 26rpx;
  color: #666;
}
.total-area {
  flex: 1;
  text-align: right;
}
.total-label {
  font-size: 26rpx;
  color: #666;
}
.total-price {
  font-size: 34rpx;
  font-weight: bold;
  color: #C41E3A;
}
.btn-checkout {
  padding: 18rpx 44rpx;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  color: #fff;
  border-radius: 44rpx;
  font-size: 28rpx;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: 0 4rpx 16rpx rgba(196, 30, 58, 0.25);
}
.btn-checkout.disabled {
  background: #ccc;
  box-shadow: none;
}
</style>
