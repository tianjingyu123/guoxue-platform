<template>
  <view class="products-page">
    <!-- 顶部 -->
    <view class="nav-bar">
      <view class="nav-left">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#1a1a1a" />
        </view>
        <text class="nav-title">带货商品</text>
      </view>
      <view class="nav-add" @tap="goAdd">
        <app-icon name="plus" :size="32" color="#C41E3A" />
        <text class="nav-add-text">添加商品</text>
      </view>
    </view>

    <view class="page-body">
      <!-- 搜索栏 -->
      <view class="search-bar">
        <app-icon name="search" :size="32" color="#999" class="search-icon" />
        <input
          v-model="search"
          class="search-input"
          placeholder="搜索商品名称..."
          placeholder-class="search-ph"
        />
      </view>

      <!-- 状态筛选 -->
      <view class="filter-row">
        <view
          v-for="f in filters"
          :key="f.key"
          class="filter-chip"
          :class="{ 'filter-chip-active': filter === f.key }"
          @tap="filter = f.key"
        >
          {{ f.label }}
        </view>
      </view>

      <!-- 统计 -->
      <text class="count-text">共 {{ filtered.length }} 件商品</text>

      <!-- 空态 -->
      <view v-if="filtered.length === 0" class="empty-box">
        <app-icon name="package" :size="96" color="#cbb8a8" />
        <text class="empty-text">暂无商品</text>
        <view class="empty-btn" @tap="goAdd">添加第一件商品</view>
      </view>

      <!-- 商品列表 -->
      <view v-else class="product-list">
        <view v-for="product in filtered" :key="product.id" class="product-card">
          <view class="product-main">
            <!-- 封面 -->
            <image class="product-cover" :src="product.cover" mode="aspectFill" />

            <!-- 信息 -->
            <view class="product-info">
              <text class="product-name">{{ product.name }}</text>
              <text class="product-price">¥{{ product.price }}</text>
              <view class="product-meta">
                <text class="meta-item">库存 {{ product.stock }}</text>
                <text class="meta-item">已售 {{ product.sold }}</text>
              </view>
            </view>

            <!-- 上架开关 -->
            <view class="product-toggle">
              <view
                class="switch"
                :class="{ 'switch-on': product.status === 'on' }"
                @tap="toggleStatus(product.id)"
              >
                <view class="switch-knob" />
              </view>
              <text
                class="status-text"
                :class="product.status === 'on' ? 'status-on' : 'status-off'"
              >
                {{ product.status === 'on' ? '已上架' : '已下架' }}
              </text>
            </view>
          </view>

          <!-- 操作行 -->
          <view class="product-ops">
            <view class="op-btn">
              <app-icon name="chevron-right" :size="28" color="#999" />
              <text class="op-text">编辑</text>
            </view>
            <view class="op-btn" @tap="remove(product.id)">
              <app-icon name="trash-2" :size="28" color="#C41E3A" />
              <text class="op-text op-text-danger">删除</text>
            </view>
            <text v-if="product.stock === 0" class="stock-warn">库存不足</text>
          </view>
        </view>
      </view>
    </view>
    <view class="bottom-spacer" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { goBack } from '@/utils/router'
import { liveProductFilters, liveProducts, type LiveProductItem } from '@/lib/live-data'

const filters = liveProductFilters
const filter = ref('all')
const search = ref('')
const products = ref<LiveProductItem[]>(liveProducts.map((p) => ({ ...p })))

const filtered = computed(() =>
  products.value.filter((p) => {
    const matchFilter = filter.value === 'all' || p.status === filter.value
    const matchSearch = !search.value || p.name.includes(search.value)
    return matchFilter && matchSearch
  }),
)

function toggleStatus(id: string) {
  products.value = products.value.map((p) =>
    p.id === id ? { ...p, status: p.status === 'on' ? 'off' : 'on' } : p,
  )
}
function remove(id: string) {
  products.value = products.value.filter((p) => p.id !== id)
}
function goAdd() {
  uni.navigateTo({
    url: '/pkg-live/products/add',
    fail: () => uni.showToast({ title: '功能开发中', icon: 'none' }),
  })
}
</script>

<style scoped>
.products-page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 顶部 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 96rpx;
  padding: 0 32rpx;
  background: #faf8f5;
  border-bottom: 1px solid #ece8e1;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.nav-back {
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.nav-add {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.nav-add-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #C41E3A;
}

.page-body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 搜索栏 */
.search-bar {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 24rpx;
  z-index: 1;
}
.search-input {
  width: 100%;
  height: 72rpx;
  padding: 0 24rpx 0 72rpx;
  font-size: 28rpx;
  color: #1a1a1a;
  background: #f0ece5;
  border-radius: 16rpx;
  box-sizing: border-box;
}
.search-ph {
  color: #999;
}

/* 状态筛选 */
.filter-row {
  display: flex;
  gap: 16rpx;
}
.filter-chip {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 500;
  color: #1a1a1a;
  background: #f0ece5;
}
.filter-chip-active {
  background: #C41E3A;
  color: #fff;
}

.count-text {
  font-size: 22rpx;
  color: #999;
}

/* 空态 */
.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 96rpx 0;
}
.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-top: 24rpx;
}
.empty-btn {
  margin-top: 24rpx;
  padding: 16rpx 32rpx;
  font-size: 24rpx;
  color: #fff;
  background: #C41E3A;
  border-radius: 999rpx;
}

/* 商品卡片 */
.product-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.product-card {
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 24rpx;
  padding: 28rpx;
}
.product-main {
  display: flex;
  gap: 24rpx;
}
.product-cover {
  width: 128rpx;
  height: 128rpx;
  border-radius: 16rpx;
  background: #f0ece5;
  flex-shrink: 0;
}
.product-info {
  flex: 1;
  min-width: 0;
}
.product-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.product-price {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #C41E3A;
}
.product-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 8rpx;
}
.meta-item {
  font-size: 22rpx;
  color: #999;
}
.product-toggle {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16rpx;
  flex-shrink: 0;
}

/* 自定义开关 */
.switch {
  position: relative;
  width: 80rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background: #d8d0c5;
  transition: background 0.2s;
}
.switch-on {
  background: #22c55e;
}
.switch-knob {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
  transition: left 0.2s;
}
.switch-on .switch-knob {
  left: 44rpx;
}
.status-text {
  font-size: 20rpx;
  font-weight: 500;
}
.status-on {
  color: #22c55e;
}
.status-off {
  color: #999;
}

/* 操作行 */
.product-ops {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1px solid #f0ece5;
}
.op-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.op-text {
  font-size: 22rpx;
  color: #999;
}
.op-text-danger {
  color: #C41E3A;
}
.stock-warn {
  margin-left: auto;
  font-size: 22rpx;
  font-weight: 500;
  color: #C41E3A;
}
.bottom-spacer {
  height: 64rpx;
}
</style>
