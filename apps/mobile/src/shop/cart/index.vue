<template>
  <view class="cart-page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: 'calc(20rpx + var(--status-bar-height, 0px))' }">
      <view class="nav-back" @tap="goBack">
        <app-icon name="arrow-left" :size="40" color="#1A1A1A" />
      </view>
      <text class="nav-title">购物车</text>
      <text class="nav-edit" @tap="editMode = !editMode">{{ editMode ? '完成' : '编辑' }}</text>
    </view>

    <!-- 加载骨架屏 -->
    <view v-if="loading" class="content">
      <view v-for="i in 3" :key="i" class="sk-group">
        <view class="sk-header" />
        <view class="sk-item">
          <view class="sk-img" />
          <view class="sk-info">
            <view class="sk-line" />
            <view class="sk-line sk-short" />
          </view>
        </view>
      </view>
    </view>

    <!-- 错误态 -->
    <error-state v-else-if="error" :message="error" @retry="loadCart" />

    <scroll-view scroll-y class="content" v-else-if="hasItems">
      <!-- 卖家分组 -->
      <view v-for="group in groups" :key="group.id" class="seller-group">
        <view class="seller-header">
          <view class="seller-check" :class="{ checked: isGroupChecked(group) }" @tap="toggleGroup(group)">
            <app-icon v-if="isGroupChecked(group)" name="check" :size="28" color="#FFFFFF" />
          </view>
          <image class="seller-avatar" :src="group.sellerAvatar" mode="aspectFill" />
          <text class="seller-name">{{ group.sellerName }}</text>
          <view class="seller-tag" :class="group.sellerType">
            <text>{{ group.sellerType === 'circle' ? '圈子' : '驿站' }}</text>
          </view>
          <app-icon name="chevron-right" :size="32" color="#CCCCCC" />
        </view>

        <!-- 凑单包邮提示 -->
        <view class="ship-tip" v-if="groupAmount(group) < group.freeShippingThreshold">
          <app-icon name="truck" :size="28" color="#9A2D2D" />
          <text class="ship-text">再买 ¥{{ group.freeShippingThreshold - groupAmount(group) }} 可包邮</text>
          <text class="ship-action">去凑单</text>
        </view>
        <view class="ship-tip free" v-else>
          <app-icon name="truck" :size="28" color="#2E7D32" />
          <text class="ship-text free">已满足包邮条件</text>
        </view>

        <!-- 商品项 -->
        <view v-for="item in group.items" :key="item.id" class="cart-item">
          <view class="item-check" :class="{ checked: selected[item.id] }" @tap="toggleItem(item.id)">
            <app-icon v-if="selected[item.id]" name="check" :size="28" color="#FFFFFF" />
          </view>
          <image class="item-img" :src="item.image" mode="aspectFill" />
          <view class="item-info">
            <text class="item-name">{{ item.name }}</text>
            <view class="item-spec-row">
              <text class="item-spec">{{ item.spec }}</text>
              <view v-if="item.type === 'course'" class="type-badge">课程</view>
            </view>
            <view class="item-bottom">
              <view class="price-box">
                <text class="cur">¥{{ item.price }}</text>
                <text class="ori">¥{{ item.originalPrice }}</text>
              </view>
              <view class="stepper">
                <view class="step-btn" @tap="changeQty(item, -1)"><app-icon name="minus" :size="24" color="#666666" /></view>
                <text class="step-num">{{ item.quantity }}</text>
                <view class="step-btn" @tap="changeQty(item, 1)"><app-icon name="plus" :size="24" color="#666666" /></view>
              </view>
            </view>
          </view>
        </view>

        <view class="group-subtotal">
          <text>小计：</text>
          <text class="subtotal-amount">¥{{ groupAmount(group) }}</text>
        </view>
      </view>

      <!-- 失效商品 -->
      <view class="invalid-block" v-if="invalidItems.length">
        <view class="invalid-header">
          <text class="invalid-title">失效商品 {{ invalidItems.length }} 件</text>
          <text class="invalid-clear" @tap="clearInvalid">清空</text>
        </view>
        <view v-for="iv in invalidItems" :key="iv.id" class="invalid-item">
          <view class="invalid-badge"><text>失效</text></view>
          <image class="item-img gray" :src="iv.image" mode="aspectFill" />
          <view class="item-info">
            <text class="item-name gray">{{ iv.name }}</text>
            <text class="item-spec">{{ iv.reason }}</text>
          </view>
        </view>
      </view>

      <!-- 横滑推荐 -->
      <view class="recommend">
        <text class="recommend-title">为你推荐</text>
        <scroll-view scroll-x class="recommend-scroll" :show-scrollbar="false">
          <view class="recommend-row">
            <view v-for="r in recommends" :key="r.id" class="rec-card" @tap="goProduct(r.id)">
              <image class="rec-img" :src="r.image" mode="aspectFill" />
              <text class="rec-name">{{ r.name }}</text>
              <text class="rec-price">¥{{ r.price }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
      <view style="height: 140rpx;" />
    </scroll-view>

    <!-- 空态 -->
    <view class="empty" v-else-if="!loading">
      <app-icon name="shopping-cart" :size="120" color="#DDDDDD" />
      <text class="empty-text">购物车空空如也</text>
      <view class="empty-btn" @tap="goMall"><text>去逛逛</text></view>
    </view>

    <!-- 底部结算栏 -->
    <view class="footer" v-if="hasItems">
      <view class="all-check" :class="{ checked: isAllChecked }" @tap="toggleAll">
        <app-icon v-if="isAllChecked" name="check" :size="28" color="#FFFFFF" />
      </view>
      <text class="all-label">全选</text>
      <view class="footer-total" v-if="!editMode">
        <text class="total-label">合计：</text>
        <text class="total-amount">¥{{ totalAmount }}</text>
      </view>
      <view class="footer-spacer" v-else />
      <view class="footer-btn" v-if="!editMode" @tap="goCheckout">
        <text>结算({{ selectedCount }})</text>
      </view>
      <view class="footer-btn danger" v-else @tap="removeSelected">
        <text>删除</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { navigateBack, navigateTo, reLaunch } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import ErrorState from '@/components/common/error-state.vue'
import { cartGroups, cartInvalidItems, cartRecommendProducts, shopApi, type CartSellerGroup } from '@/lib/shop-data'

const groups = ref<CartSellerGroup[]>([])
const invalidItems = ref([...cartInvalidItems])
const recommends = cartRecommendProducts
const editMode = ref(false)
const loading = ref(true)
const error = ref('')

async function loadCart() {
  loading.value = true
  error.value = ''
  try {
    const res = await shopApi.getCart()
    groups.value = res.items || []
  } catch (e: any) {
    error.value = e?.message || '加载失败'
    groups.value = JSON.parse(JSON.stringify(cartGroups))
  } finally { loading.value = false }
}

// 选中状态
const selected = reactive<Record<number, boolean>>({})

// groups 变化后重新默认全选
watch(groups, (g) => {
  Object.keys(selected).forEach((k) => delete selected[k])
  g.forEach((grp) => grp.items.forEach((it) => (selected[it.id] = true)))
}, { deep: true })

onMounted(() => { loadCart() })

const hasItems = computed(() => groups.value.some((g) => g.items.length > 0))

function groupAmount(group: CartSellerGroup): number {
  return group.items.reduce((sum, it) => sum + (selected[it.id] ? it.price * it.quantity : 0), 0)
}
function isGroupChecked(group: CartSellerGroup): boolean {
  return group.items.length > 0 && group.items.every((it) => selected[it.id])
}
function toggleGroup(group: CartSellerGroup) {
  const next = !isGroupChecked(group)
  group.items.forEach((it) => (selected[it.id] = next))
}
function toggleItem(id: number) {
  selected[id] = !selected[id]
}
const isAllChecked = computed(() => groups.value.every((g) => isGroupChecked(g)))
function toggleAll() {
  const next = !isAllChecked.value
  groups.value.forEach((g) => g.items.forEach((it) => (selected[it.id] = next)))
}
const totalAmount = computed(() => groups.value.reduce((s, g) => s + groupAmount(g), 0))
const selectedCount = computed(() => {
  let n = 0
  groups.value.forEach((g) => g.items.forEach((it) => selected[it.id] && (n += it.quantity)))
  return n
})
function changeQty(item: { id: number; quantity: number }, delta: number) {
  const next = item.quantity + delta
  if (next < 1) return
  item.quantity = next
}
function removeSelected() {
  groups.value.forEach((g) => {
    g.items = g.items.filter((it) => !selected[it.id])
  })
  groups.value = groups.value.filter((g) => g.items.length > 0)
}
function clearInvalid() {
  invalidItems.value = []
}
function goBack() {
  navigateBack()
}
function goMall() {
  reLaunch('/mall')
}
function goProduct(id: number) {
  navigateTo(`/mall/product/${id}`)
}
function goCheckout() {
  if (selectedCount.value === 0) {
    uni.showToast({ title: '请选择商品', icon: 'none' })
    return
  }
  navigateTo('/checkout')
}
</script>

<style lang="scss" scoped>
.cart-page {
  min-height: 100vh;
  background: #F5F5F5;
  display: flex;
  flex-direction: column;
}
.nav-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #FFFFFF;
}
.nav-back { width: 60rpx; }
.nav-title { flex: 1; text-align: center; font-size: 34rpx; font-weight: 600; color: #1A1A1A; }
.nav-edit { width: 60rpx; text-align: right; font-size: 28rpx; color: #9A2D2D; }
.content { flex: 1; }
.seller-group {
  background: #FFFFFF;
  margin: 20rpx;
  border-radius: 20rpx;
  padding: 24rpx;
}
.seller-header { display: flex; align-items: center; gap: 16rpx; }
.seller-check, .item-check, .all-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #CCCCCC;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &.checked { background: #9A2D2D; border-color: #9A2D2D; }
}
.seller-avatar { width: 44rpx; height: 44rpx; border-radius: 50%; }
.seller-name { font-size: 28rpx; font-weight: 600; color: #1A1A1A; }
.seller-tag {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  &.circle { background: rgba(154,45,45,0.1); }
  &.store { background: rgba(212,160,23,0.15); }
  text { font-size: 20rpx; }
  &.circle text { color: #9A2D2D; }
  &.store text { color: #B8860B; }
}
.seller-header .icon-last { margin-left: auto; }
.ship-tip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 16rpx;
  padding: 12rpx 16rpx;
  background: rgba(154,45,45,0.05);
  border-radius: 12rpx;
}
.ship-text { font-size: 24rpx; color: #9A2D2D; }
.ship-text.free { color: #2E7D32; }
.ship-tip.free { background: rgba(46,125,50,0.08); }
.ship-action { margin-left: auto; font-size: 24rpx; color: #9A2D2D; font-weight: 600; }
.cart-item { display: flex; gap: 16rpx; margin-top: 24rpx; align-items: center; }
.item-img { width: 160rpx; height: 160rpx; border-radius: 12rpx; flex-shrink: 0; }
.item-img.gray { opacity: 0.5; }
.item-info { flex: 1; display: flex; flex-direction: column; gap: 10rpx; }
.item-name { font-size: 28rpx; color: #1A1A1A; line-height: 1.4; }
.item-name.gray { color: #999999; }
.item-spec-row { display: flex; align-items: center; gap: 10rpx; }
.item-spec { font-size: 24rpx; color: #999999; }
.type-badge {
  font-size: 20rpx; color: #B8860B; background: rgba(212,160,23,0.15);
  padding: 2rpx 10rpx; border-radius: 6rpx;
}
.item-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 8rpx; }
.price-box { display: flex; align-items: baseline; gap: 10rpx; }
.cur { font-size: 32rpx; color: #9A2D2D; font-weight: 700; }
.ori { font-size: 22rpx; color: #BBBBBB; text-decoration: line-through; }
.stepper { display: flex; align-items: center; border: 2rpx solid #EEEEEE; border-radius: 8rpx; }
.step-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.step-num { width: 60rpx; text-align: center; font-size: 26rpx; color: #1A1A1A; }
.group-subtotal { display: flex; justify-content: flex-end; align-items: baseline; gap: 6rpx; margin-top: 20rpx; font-size: 24rpx; color: #666666; }
.subtotal-amount { font-size: 30rpx; color: #9A2D2D; font-weight: 700; }
.invalid-block { background: #FFFFFF; margin: 20rpx; border-radius: 20rpx; padding: 24rpx; }
.invalid-header { display: flex; justify-content: space-between; align-items: center; }
.invalid-title { font-size: 26rpx; color: #999999; }
.invalid-clear { font-size: 24rpx; color: #999999; }
.invalid-item { display: flex; gap: 16rpx; margin-top: 20rpx; align-items: center; }
.invalid-badge { background: #999999; padding: 4rpx 12rpx; border-radius: 8rpx; }
.invalid-badge text { font-size: 20rpx; color: #FFFFFF; }
.recommend { padding: 20rpx; }
.recommend-title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 20rpx; display: block; }
.recommend-scroll { white-space: nowrap; }
.recommend-row { display: inline-flex; gap: 20rpx; }
.rec-card { width: 220rpx; background: #FFFFFF; border-radius: 16rpx; padding: 16rpx; }
.rec-img { width: 188rpx; height: 188rpx; border-radius: 12rpx; }
.rec-name { font-size: 24rpx; color: #1A1A1A; margin-top: 12rpx; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rec-price { font-size: 28rpx; color: #9A2D2D; font-weight: 700; margin-top: 8rpx; display: block; }
.empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; }
.empty-text { font-size: 28rpx; color: #999999; }
.empty-btn { padding: 16rpx 60rpx; background: #9A2D2D; border-radius: 40rpx; }
.empty-btn text { color: #FFFFFF; font-size: 28rpx; }
.footer {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.05);
}
.all-label { font-size: 28rpx; color: #1A1A1A; }
.footer-total { margin-left: auto; display: flex; align-items: baseline; }
.footer-spacer { margin-left: auto; }
.total-label { font-size: 26rpx; color: #666666; }
.total-amount { font-size: 36rpx; color: #9A2D2D; font-weight: 700; }
.footer-btn {
  padding: 20rpx 50rpx;
  background: #9A2D2D;
  border-radius: 40rpx;
  margin-left: 20rpx;
}
.footer-btn text { color: #FFFFFF; font-size: 30rpx; font-weight: 600; }
.footer-btn.danger { background: #E74C3C; }

/* 骨架屏 */
.sk-group { margin: 24rpx 24rpx 0; background: #fff; border-radius: 24rpx; padding: 24rpx; }
.sk-header { height: 48rpx; background: #f0ece4; border-radius: 12rpx; margin-bottom: 20rpx; width: 40%; }
.sk-item { display: flex; gap: 20rpx; }
.sk-img { width: 140rpx; height: 140rpx; background: #f0ece4; border-radius: 12rpx; flex-shrink: 0; }
.sk-info { flex: 1; display: flex; flex-direction: column; gap: 16rpx; padding-top: 8rpx; }
.sk-line { height: 24rpx; background: #f0ece4; border-radius: 8rpx; }
.sk-short { width: 55%; }
</style>
