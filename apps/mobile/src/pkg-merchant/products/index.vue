<!--
  B2 · 商品管理（商家端 V0 重构版·对着 mockup-B2 1:1 还原）
  态A 在售列表：搜索 + 状态Tab(带计数) + 商品卡(封面左/信息中/竖排操作右) + 库存预警(补库存) + 悬浮新建FAB。
  态C 空态：新店无商品引导「发布第一个商品」→ B3 空白态。
  设计token：宣纸白#FAF8F5·卡片#FFF·朱红#C41E3A·金#C9A96E·描边#ECE7E0·圆角16px·胶囊999px。
  注：后端 ProductStatus 仅 ON_SALE/OFF_SHELF/PENDING（无「驳回/草稿」枚举），Tab 按真实状态呈现不造假；
      故 mockup 里的「驳回/草稿」两 Tab 不做（不造空壳）。
-->
<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @tap="go('/merchant/dashboard')">
          <AppIcon name="chevron-left" :size="34" color="#6e6e73" />
          <text class="nav-back-t">工作台</text>
        </view>
        <text class="nav-title serif">商品管理</text>
        <view class="nav-right" />
      </view>
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
      :style="{ paddingTop: statusBarH + 44 + 'px' }"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onReachBottom"
    >
      <!-- 搜索栏 -->
      <view class="search">
        <AppIcon name="search" :size="26" color="#9a9a9a" />
        <input
          class="search-input"
          v-model="keyword"
          type="text"
          placeholder="搜索商品名称"
          placeholder-class="search-ph"
          confirm-type="search"
        />
        <text v-if="keyword" class="search-clear" @tap="keyword = ''">×</text>
      </view>

      <!-- 状态筛选 Tab（带计数） -->
      <scroll-view scroll-x class="tabs-scroll" :show-scrollbar="false">
        <view class="tabs">
          <view
            v-for="t in tabs"
            :key="t.key"
            class="tab"
            :class="{ on: activeTab === t.key }"
            @tap="switchTab(t.key)"
          >
            <text class="tab-t">{{ t.label }}<text v-if="counts[t.key] != null" class="tab-n"> {{ counts[t.key] }}</text></text>
          </view>
        </view>
      </scroll-view>

      <view class="body">
        <!-- 加载态（首屏） -->
        <view v-if="loading && !products.length" class="state">
          <text class="state-t">加载中…</text>
        </view>

        <!-- 错误态 -->
        <view v-else-if="error && !products.length" class="state">
          <AppIcon name="alert-circle" :size="80" color="#d0342c" />
          <text class="state-t">{{ error }}</text>
          <view class="state-btn" @tap="reload"><text class="state-btn-t">重试</text></view>
        </view>

        <!-- 空态（态C 新店无商品 / 筛选无结果） -->
        <view v-else-if="!filtered.length" class="empty">
          <view class="empty-ic"><AppIcon name="package" :size="42" color="#c9a96e" /></view>
          <text class="empty-t serif">{{ emptyTitle }}</text>
          <text class="empty-d">{{ emptyDesc }}</text>
          <view v-if="activeTab === 'ALL' && !keyword" class="empty-btn" @tap="goNew">
            <AppIcon name="plus" :size="28" color="#fff" />
            <text class="empty-btn-t">发布第一个商品</text>
          </view>
        </view>

        <!-- 商品列表 -->
        <block v-else>
          <view
            v-for="p in filtered"
            :key="p.id"
            class="card"
            :class="{ warn: isLowStock(p) }"
            @tap="goEdit(p)"
          >
            <!-- 封面（1:1·padding-top 比例框） -->
            <view class="cover">
              <view class="cover-ratio">
                <image
                  v-if="p.images && p.images.length"
                  :src="p.images[0]"
                  class="cover-img"
                  mode="aspectFill"
                  lazy-load
                />
                <view v-else class="cover-ph"><text>主图 1:1</text></view>
              </view>
            </view>

            <!-- 信息 -->
            <view class="info">
              <text class="title">{{ p.title }}</text>
              <text class="meta">销量 {{ p.salesCount || 0 }} · 库存 <text :class="{ 'meta-warn': isLowStock(p) }">{{ p.stock }}</text></text>
              <view class="price-row">
                <text class="price serif">¥{{ Number(p.price).toFixed(2) }}</text>
                <text
                  v-if="p.originalPrice && Number(p.originalPrice) > Number(p.price)"
                  class="strike"
                >¥{{ Number(p.originalPrice).toFixed(2) }}</text>
              </view>
              <view class="tags">
                <text v-if="isLowStock(p)" class="tag tag-warn">⚠ 库存预警</text>
                <text
                  class="tag tag-status"
                  :style="{ color: statusLabel(p).color, background: statusLabel(p).bg, borderColor: statusLabel(p).color + '4d' }"
                >{{ statusLabel(p).label }}</text>
              </view>
            </view>

            <!-- 竖排操作 -->
            <view class="ops">
              <view v-if="isLowStock(p)" class="op pri" @tap.stop="goEdit(p)"><text>补库存</text></view>
              <view v-else class="op" @tap.stop="goEdit(p)"><text>编辑</text></view>
              <view v-if="p.status === 'ON_SALE'" class="op" @tap.stop="doUnlist(p)"><text>下架</text></view>
              <view v-else-if="p.status === 'OFF_SHELF'" class="op pri" @tap.stop="doList(p)"><text>上架</text></view>
              <view class="op danger" @tap.stop="doDelete(p)"><text>删除</text></view>
            </view>
          </view>

          <!-- 触底加载态 -->
          <view class="loadmore">
            <text v-if="loadingMore">加载中…</text>
            <text v-else-if="!hasMore">— 没有更多了 —</text>
            <text v-else>— 上拉加载更多 —</text>
          </view>
        </block>
      </view>

      <view style="height: 140rpx" />
    </scroll-view>

    <!-- 悬浮新建 FAB -->
    <view class="fab" :style="{ bottom: 40 + safeBottom + 'px' }" @tap="goNew">
      <AppIcon name="plus" :size="32" color="#fff" />
      <text class="fab-t">新建商品</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  merchantBackendApi,
  productStatusLabel,
  type MerchantProduct,
  type ProductStatus,
} from '@/pkg-merchant/lib/merchant-data'

const statusBarH = ref(0)
const safeBottom = ref(0)

type TabKey = 'ALL' | ProductStatus
// 后端 ProductStatus 仅 ON_SALE/OFF_SHELF/PENDING —— 无「驳回/草稿」，故不做那两 Tab（不造空壳）。
const tabs: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: '全部' },
  { key: 'ON_SALE', label: '在售' },
  { key: 'OFF_SHELF', label: '下架' },
  { key: 'PENDING', label: '审核中' },
]

const PAGE_SIZE = 20
const LOW_STOCK = 5 // 库存预警阈值

const activeTab = ref<TabKey>('ALL')
const keyword = ref('')
const products = ref<MerchantProduct[]>([])
const counts = ref<Record<string, number>>({})
const page = ref(1)
const hasMore = ref(true)
const loading = ref(true)
const loadingMore = ref(false)
const refreshing = ref(false)
const error = ref('')
const submitting = ref(false)

const statusLabel = (p: MerchantProduct) => productStatusLabel(p)

/** 前端关键词过滤（对已加载列表按标题筛，搜索栏即时反馈） */
const filtered = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return products.value
  return products.value.filter((p) => (p.title || '').includes(kw))
})

const emptyTitle = computed(() => {
  if (keyword.value.trim()) return '没有匹配的商品'
  return activeTab.value === 'ALL' ? '还没有商品' : '该状态下暂无商品'
})
const emptyDesc = computed(() => {
  if (keyword.value.trim()) return '换个关键词试试'
  return activeTab.value === 'ALL'
    ? '发布你的第一个商品，通过审核后即可进入全平台商品池对外售卖。'
    : ''
})

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
  counts.value[activeTab.value] = res.total
}

/** 拉取各 Tab 计数（轻量·pageSize:1 只读 total） */
async function loadCounts() {
  const jobs: Array<Promise<void>> = tabs.map(async (t) => {
    try {
      const res = await merchantBackendApi.getProducts({
        status: t.key === 'ALL' ? undefined : (t.key as ProductStatus),
        page: 1,
        pageSize: 1,
      })
      counts.value[t.key] = res.total
    } catch {
      /* 计数失败不影响主列表 */
    }
  })
  await Promise.all(jobs)
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
    loadCounts()
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
    loadCounts()
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
    loadCounts()
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
        loadCounts()
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
    const sys = uni.getSystemInfoSync()
    statusBarH.value = sys.statusBarHeight || 0
    safeBottom.value = sys.safeAreaInsets?.bottom || 0
  } catch (e) {
    statusBarH.value = 0
  }
  load()
  loadCounts()
})
</script>

<style lang="scss" scoped>
$brand: #c41e3a;
$gold: #c9a96e;
$ink: #2c2c2c;
$ink2: #6e6e73;
$ink3: #9a9a9a;
$line: #ece7e0;
$wash: #f5f1eb;
$bg: #faf8f5;

.page {
  min-height: 100vh;
  background: $bg;
}
.serif {
  font-family: 'Songti SC', 'STSong', serif;
}

/* 顶部导航 */
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: rgba(250, 248, 245, 0.94);
  border-bottom: 1rpx solid $line;
}
.nav-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30rpx;
}
.nav-back {
  display: flex;
  align-items: center;
  gap: 4rpx;
  width: 120rpx;
}
.nav-back-t {
  font-size: 24rpx;
  color: $ink2;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $ink;
}
.nav-right {
  width: 120rpx;
}

/* 滚动区 */
.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

/* 搜索 */
.search {
  margin: 28rpx 40rpx 0;
  background: #fff;
  border: 1rpx solid $line;
  border-radius: 999rpx;
  height: 72rpx;
  padding: 0 30rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 26rpx;
  color: $ink;
}
.search-ph {
  color: $ink3;
}
.search-clear {
  font-size: 34rpx;
  color: $ink3;
  padding: 0 6rpx;
}

/* Tab */
.tabs-scroll {
  white-space: nowrap;
  margin-top: 24rpx;
}
.tabs {
  display: inline-flex;
  align-items: center;
  gap: 14rpx;
  padding: 0 40rpx;
}
.tab {
  border: 1rpx solid $line;
  border-radius: 999rpx;
  padding: 10rpx 26rpx;
  background: #fff;
}
.tab.on {
  background: $brand;
  border-color: $brand;
}
.tab-t {
  font-size: 24rpx;
  color: $ink2;
}
.tab.on .tab-t {
  color: #fff;
  font-weight: 700;
}
.tab-n {
  font-size: 22rpx;
}

/* 列表 */
.body {
  padding: 24rpx 40rpx 0;
}
.card {
  background: #fff;
  border-radius: 32rpx;
  border: 1rpx solid $line;
  padding: 26rpx;
  margin-bottom: 24rpx;
  display: flex;
  gap: 24rpx;
  box-shadow: 0 2rpx 20rpx rgba(80, 60, 40, 0.04);
}
.card.warn {
  border-color: rgba(196, 30, 58, 0.35);
}

/* 封面 1:1 */
.cover {
  width: 156rpx;
  flex-shrink: 0;
}
.cover-ratio {
  width: 100%;
  padding-top: 100%;
  position: relative;
  border-radius: 24rpx;
  overflow: hidden;
  background: linear-gradient(135deg, #ede4d6, #e3d6c2);
}
.cover-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.cover-ph {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: #b09a78;
}

/* 信息 */
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.title {
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.meta {
  font-size: 22rpx;
  color: $ink3;
  margin-top: 8rpx;
}
.meta-warn {
  color: $brand;
  font-weight: 700;
}
.price-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-top: 10rpx;
}
.price {
  font-size: 32rpx;
  font-weight: 700;
  color: $brand;
}
.strike {
  font-size: 22rpx;
  color: $ink3;
  text-decoration: line-through;
}
.tags {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 12rpx;
  flex-wrap: wrap;
}
.tag {
  font-size: 20rpx;
  padding: 3rpx 14rpx;
  border-radius: 8rpx;
  border: 1rpx solid $line;
  color: $ink2;
}
.tag-warn {
  border-color: rgba(196, 30, 58, 0.4);
  background: rgba(196, 30, 58, 0.06);
  color: $brand;
  font-weight: 700;
}
.tag-status {
  font-weight: 600;
}

/* 竖排操作 */
.ops {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12rpx;
  flex-shrink: 0;
}
.op {
  border: 1rpx solid $line;
  border-radius: 999rpx;
  padding: 8rpx 20rpx;
  font-size: 22rpx;
  color: $ink2;
  text-align: center;
  font-weight: 600;
  min-width: 96rpx;
}
.op.pri {
  border-color: $brand;
  color: $brand;
}
.op.danger {
  border-color: rgba(208, 52, 44, 0.4);
  color: #d0342c;
}

/* 触底 */
.loadmore {
  text-align: center;
  font-size: 22rpx;
  color: $ink3;
  padding: 20rpx 0;
}

/* 状态占位 */
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding: 160rpx 60rpx 0;
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
}
.state-btn-t {
  font-size: 27rpx;
  color: #fff;
  font-weight: 500;
}

/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 140rpx 48rpx 0;
  text-align: center;
}
.empty-ic {
  width: 184rpx;
  height: 184rpx;
  border-radius: 50%;
  background: $wash;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 36rpx;
}
.empty-t {
  font-size: 34rpx;
  font-weight: 700;
  color: $ink;
  margin-bottom: 16rpx;
}
.empty-d {
  font-size: 24rpx;
  color: $ink3;
  line-height: 1.7;
  max-width: 480rpx;
  margin-bottom: 40rpx;
}
.empty-btn {
  display: flex;
  align-items: center;
  gap: 10rpx;
  background: $brand;
  padding: 22rpx 56rpx;
  border-radius: 999rpx;
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.28);
}
.empty-btn-t {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}

/* 悬浮 FAB */
.fab {
  position: fixed;
  right: 36rpx;
  z-index: 60;
  background: $brand;
  border-radius: 999rpx;
  padding: 22rpx 36rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  box-shadow: 0 10rpx 28rpx rgba(196, 30, 58, 0.35);
}
.fab-t {
  font-size: 27rpx;
  color: #fff;
  font-weight: 600;
}
</style>
