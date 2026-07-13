<!--
  B2 · 商品管理（商家端 V0 重构版）
  规格：商品列表 + 状态筛选Tab(全部/在售/下架/审核中) + 库存预警 + 新建商品跳 B3 编辑器。
  每项可上/下架、编辑(带 id)、删除。下拉刷新 + 触底加载。
  设计token：页底#FAF8F5·卡片#FFF·朱红#C41E3A·金#C9A96E·描边#EDEAE4·圆角18px≈36rpx·胶囊999rpx。
  硬约束：纯 uni-app · @tap · rpx · 商品图 padding-top 比例框 · 实色卡片 · 真实数据接线。
  注：后端 ProductStatus 仅 ON_SALE/OFF_SHELF/PENDING（无「驳回」枚举），Tab 按真实状态呈现，不造假。
-->
<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @tap="go('/merchant/dashboard')">
          <AppIcon name="arrow-left" :size="40" color="#2c2c2c" />
        </view>
        <text class="nav-title">商品管理</text>
        <view class="nav-add" @tap="goNew">
          <AppIcon name="plus" :size="30" color="#fff" />
          <text class="nav-add-t">新建</text>
        </view>
      </view>
    </view>

    <!-- 状态筛选 Tab -->
    <view class="tabs-wrap" :style="{ top: statusBarH + 44 + 'px' }">
      <scroll-view scroll-x class="tabs-scroll" :show-scrollbar="false">
        <view class="tabs">
          <view
            v-for="t in tabs"
            :key="t.key"
            class="tab"
            :class="{ active: activeTab === t.key }"
            @tap="switchTab(t.key)"
          >
            <text class="tab-t">{{ t.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
      :style="{ paddingTop: statusBarH + 44 + 88 + 'px' }"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onReachBottom"
    >
      <!-- 加载态（首屏） -->
      <view v-if="loading && !products.length" class="state">
        <text class="state-t">加载中…</text>
      </view>

      <!-- 错误态 -->
      <view v-else-if="error && !products.length" class="state">
        <AppIcon name="alert-circle" :size="88" color="#d0342c" />
        <text class="state-t">{{ error }}</text>
        <view class="state-btn" @tap="reload"><text class="state-btn-t">重试</text></view>
      </view>

      <!-- 空态 -->
      <view v-else-if="!products.length" class="state">
        <AppIcon name="package" :size="96" color="#d8cfc0" />
        <text class="state-t">{{ activeTab === 'ALL' ? '还没有商品' : '该状态下暂无商品' }}</text>
        <view v-if="activeTab === 'ALL'" class="state-btn" @tap="goNew">
          <text class="state-btn-t">发布第一个商品</text>
        </view>
      </view>

      <!-- 商品列表 -->
      <view v-else class="list">
        <view v-for="p in products" :key="p.id" class="card" @tap="goEdit(p)">
          <view class="card-body">
            <!-- 商品图：padding-top 比例框 -->
            <view class="thumb">
              <view class="thumb-ratio">
                <image
                  v-if="p.images && p.images.length"
                  :src="p.images[0]"
                  class="thumb-img"
                  mode="aspectFill"
                  lazy-load
                />
                <view v-else class="thumb-ph">
                  <AppIcon name="package" :size="56" color="#c9a96e" />
                </view>
              </view>
              <!-- 库存预警角标 -->
              <view v-if="isLowStock(p)" class="thumb-warn">
                <text class="thumb-warn-t">{{ p.stock <= 0 ? '缺货' : '库存紧张' }}</text>
              </view>
            </view>

            <!-- 信息区 -->
            <view class="info">
              <text class="name">{{ p.title }}</text>
              <view class="tag-row">
                <text class="tag-cat">{{ categoryName(p.categoryId) }}</text>
                <text
                  class="tag-status"
                  :style="{ color: statusLabel(p).color, background: statusLabel(p).bg }"
                >{{ statusLabel(p).label }}</text>
              </view>
              <view class="price-row">
                <text class="price">¥{{ Number(p.price).toFixed(2) }}</text>
                <text
                  v-if="p.originalPrice && Number(p.originalPrice) > Number(p.price)"
                  class="price-origin"
                >¥{{ Number(p.originalPrice).toFixed(2) }}</text>
              </view>
              <view class="meta-row">
                <text class="meta">库存 <text :class="{ 'meta-warn': isLowStock(p) }">{{ p.stock }}</text></text>
                <text class="meta-dot">·</text>
                <text class="meta">销量 {{ p.salesCount }}</text>
              </view>
            </view>
          </view>

          <!-- 操作条 -->
          <view class="actions">
            <view class="act" @tap.stop="goEdit(p)">
              <AppIcon name="edit" :size="30" color="#6e6e73" />
              <text class="act-t">编辑</text>
            </view>
            <view v-if="p.status === 'ON_SALE'" class="act" @tap.stop="doUnlist(p)">
              <AppIcon name="eye-off" :size="30" color="#6e6e73" />
              <text class="act-t">下架</text>
            </view>
            <view v-else-if="p.status === 'OFF_SHELF'" class="act" @tap.stop="doList(p)">
              <AppIcon name="eye" :size="30" color="#c9a96e" />
              <text class="act-t gold">上架</text>
            </view>
            <view class="act" @tap.stop="doDelete(p)">
              <AppIcon name="trash-2" :size="30" color="#d0342c" />
              <text class="act-t danger">删除</text>
            </view>
          </view>
        </view>

        <!-- 触底加载态 -->
        <view class="foot">
          <text v-if="loadingMore" class="foot-t">加载中…</text>
          <text v-else-if="!hasMore" class="foot-t">没有更多了</text>
        </view>
      </view>

      <view style="height: 40rpx" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  merchantBackendApi,
  categoryName,
  productStatusLabel,
  type MerchantProduct,
  type ProductStatus,
} from '@/lib/merchant-data'

const statusBarH = ref(0)

type TabKey = 'ALL' | ProductStatus
// 后端 ProductStatus 仅 ON_SALE/OFF_SHELF/PENDING，故无「驳回」页（不造假）。
const tabs: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: '全部' },
  { key: 'ON_SALE', label: '在售' },
  { key: 'OFF_SHELF', label: '已下架' },
  { key: 'PENDING', label: '审核中' },
]

const PAGE_SIZE = 20
const LOW_STOCK = 5 // 库存预警阈值

const activeTab = ref<TabKey>('ALL')
const products = ref<MerchantProduct[]>([])
const page = ref(1)
const hasMore = ref(true)
const loading = ref(true)
const loadingMore = ref(false)
const refreshing = ref(false)
const error = ref('')
const submitting = ref(false)

const statusLabel = (p: MerchantProduct) => productStatusLabel(p)

/** 库存预警：在售商品且库存 <= 阈值 */
function isLowStock(p: MerchantProduct): boolean {
  return p.status === 'ON_SALE' && p.stock <= LOW_STOCK
}

async function fetchPage(reset: boolean) {
  if (reset) {
    page.value = 1
    hasMore.value = true
  }
  const status = activeTab.value === 'ALL' ? undefined : activeTab.value
  const res = await merchantBackendApi.getProducts({
    status: status as ProductStatus | undefined,
    page: page.value,
    pageSize: PAGE_SIZE,
  })
  if (reset) products.value = res.items
  else products.value = products.value.concat(res.items)
  hasMore.value = products.value.length < res.total && res.items.length > 0
}

/** 首屏 / 切 Tab 加载 */
async function load() {
  loading.value = true
  error.value = ''
  try {
    await fetchPage(true)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function reload() {
  products.value = []
  load()
}

function switchTab(key: TabKey) {
  if (activeTab.value === key) return
  activeTab.value = key
  products.value = []
  load()
}

/** 下拉刷新 */
async function onRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  error.value = ''
  try {
    await fetchPage(true)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '刷新失败', icon: 'none' })
  } finally {
    refreshing.value = false
  }
}

/** 触底加载 */
async function onReachBottom() {
  if (loadingMore.value || !hasMore.value || loading.value) return
  loadingMore.value = true
  try {
    page.value += 1
    await fetchPage(false)
  } catch (e) {
    page.value -= 1
    uni.showToast({ title: (e as Error)?.message || '加载失败', icon: 'none' })
  } finally {
    loadingMore.value = false
  }
}

function goNew() {
  navigateTo('/merchant/product-edit')
}
function goEdit(p: MerchantProduct) {
  navigateTo(`/merchant/product-edit?id=${p.id}`)
}

async function doList(p: MerchantProduct) {
  if (submitting.value) return
  submitting.value = true
  try {
    await merchantBackendApi.listProduct(p.id)
    uni.showToast({ title: '已上架', icon: 'success' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function doUnlist(p: MerchantProduct) {
  if (submitting.value) return
  submitting.value = true
  try {
    await merchantBackendApi.unlistProduct(p.id)
    uni.showToast({ title: '已下架', icon: 'success' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function doDelete(p: MerchantProduct) {
  uni.showModal({
    title: '确认删除商品？',
    content: `删除「${p.title}」后将无法恢复，确定继续吗？`,
    confirmColor: '#c41e3a',
    success: async (res) => {
      if (!res.confirm || submitting.value) return
      submitting.value = true
      try {
        await merchantBackendApi.deleteProduct(p.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        await load()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '删除失败', icon: 'none' })
      } finally {
        submitting.value = false
      }
    },
  })
}

function go(path: string) {
  navigateTo(path)
}

onLoad(() => {
  try {
    statusBarH.value = uni.getSystemInfoSync().statusBarHeight || 0
  } catch (e) {
    statusBarH.value = 0
  }
  load()
})
</script>

<style lang="scss" scoped>
$brand: #c41e3a;
$gold: #c9a96e;
$ink: #2c2c2c;
$ink2: #6e6e73;
$ink3: #999999;
$border: #edeae4;
$bg: #faf8f5;

.page {
  min-height: 100vh;
  background: $bg;
}

/* 顶部导航 */
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: #fff;
  border-bottom: 1rpx solid $border;
}
.nav-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 40rpx;
}
.nav-back {
  width: 56rpx;
  display: flex;
  align-items: center;
}
.nav-title {
  flex: 1;
  font-size: 34rpx;
  font-weight: 600;
  color: $ink;
}
.nav-add {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: $brand;
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  box-shadow: 0 6rpx 18rpx rgba(196, 30, 58, 0.22);
}
.nav-add-t {
  font-size: 25rpx;
  color: #fff;
  font-weight: 500;
}

/* 状态 Tab */
.tabs-wrap {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 49;
  height: 88rpx;
  background: $bg;
  display: flex;
  align-items: center;
}
.tabs-scroll {
  width: 100%;
  white-space: nowrap;
}
.tabs {
  display: inline-flex;
  align-items: center;
  gap: 18rpx;
  padding: 0 40rpx;
}
.tab {
  padding: 12rpx 34rpx;
  border-radius: 999rpx;
  background: #fff;
  border: 1rpx solid $border;
}
.tab.active {
  background: $brand;
  border-color: $brand;
}
.tab-t {
  font-size: 26rpx;
  color: $ink2;
}
.tab.active .tab-t {
  color: #fff;
  font-weight: 600;
}

/* 滚动区 */
.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

/* 列表 */
.list {
  padding: 24rpx 40rpx 0;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.card {
  background: #fff;
  border-radius: 36rpx;
  border: 1rpx solid $border;
  overflow: hidden;
  box-shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05);
}
.card-body {
  display: flex;
  gap: 24rpx;
  padding: 26rpx;
}

/* 商品图：padding-top 比例框（1:1） */
.thumb {
  width: 176rpx;
  flex-shrink: 0;
  position: relative;
}
.thumb-ratio {
  width: 100%;
  padding-top: 100%;
  position: relative;
  border-radius: 24rpx;
  overflow: hidden;
  background: #f5f2ec;
}
.thumb-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.thumb-ph {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.thumb-warn {
  position: absolute;
  top: 10rpx;
  left: 10rpx;
  background: rgba(196, 30, 58, 0.92);
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}
.thumb-warn-t {
  font-size: 20rpx;
  color: #fff;
  font-weight: 500;
}

/* 信息 */
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.name {
  font-size: 29rpx;
  font-weight: 600;
  color: $ink;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.tag-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
}
.tag-cat {
  font-size: 21rpx;
  color: $ink2;
  background: #f5f2ec;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}
.tag-status {
  font-size: 21rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}
.price-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-top: 14rpx;
}
.price {
  font-size: 34rpx;
  font-weight: 700;
  color: $brand;
}
.price-origin {
  font-size: 22rpx;
  color: $ink3;
  text-decoration: line-through;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 10rpx;
}
.meta {
  font-size: 23rpx;
  color: $ink3;
}
.meta-warn {
  color: $brand;
  font-weight: 600;
}
.meta-dot {
  font-size: 23rpx;
  color: #d8cfc0;
}

/* 操作条 */
.actions {
  display: flex;
  align-items: center;
  border-top: 1rpx solid $border;
}
.act {
  flex: 1;
  height: 82rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.act + .act {
  border-left: 1rpx solid $border;
}
.act-t {
  font-size: 25rpx;
  color: $ink2;
}
.act-t.gold {
  color: $gold;
}
.act-t.danger {
  color: #d0342c;
}

/* 触底 */
.foot {
  padding: 28rpx 0 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.foot-t {
  font-size: 23rpx;
  color: $ink3;
}

/* 状态占位 */
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding: 180rpx 60rpx 0;
}
.state-t {
  font-size: 27rpx;
  color: $ink3;
  text-align: center;
}
.state-btn {
  margin-top: 8rpx;
  background: $brand;
  padding: 20rpx 48rpx;
  border-radius: 999rpx;
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.22);
}
.state-btn-t {
  font-size: 27rpx;
  color: #fff;
  font-weight: 500;
}
</style>
