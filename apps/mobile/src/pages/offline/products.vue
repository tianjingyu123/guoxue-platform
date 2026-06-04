<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <view class="header-row">
        <text
          class="back-btn"
          @click="goBack"
        >
          ←
        </text>
        <text class="header-title">
          驿站商品
        </text>
        <view
          class="cart-btn-wrap"
          @click="goCart"
        >
          <text>🛒</text>
          <text
            v-if="cartCount > 0"
            class="cart-badge"
          >
            {{ cartCount }}
          </text>
        </view>
      </view>
      <!-- 搜索框 -->
      <view class="search-wrap">
        <text class="search-icon">
          🔍
        </text>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索商品..."
          @confirm="handleSearch"
        >
      </view>
      <!-- 筛选栏 -->
      <view class="filter-row">
        <view
          class="filter-btn"
          @click="showStationPicker = true"
        >
          <text class="filter-text">
            {{ selectedStationName }}
          </text>
          <text>▼</text>
        </view>
        <view
          class="filter-btn"
          @click="showSortPicker = true"
        >
          <text>☰</text>
          <text class="filter-text">
            {{ sortLabel }}
          </text>
        </view>
      </view>
      <!-- 分类Tab -->
      <scroll-view
        scroll-x
        class="category-scroll"
        show-scrollbar="false"
      >
        <view class="category-inner">
          <text
            v-for="cat in categories"
            :key="cat.value"
            class="category-tab"
            :class="{ active: selectedCategory === cat.value }"
            @click="selectedCategory = cat.value"
          >
            {{ cat.value !== 'all' ? (categoryIcons[cat.value] || '') : '' }} {{ cat.label }}
          </text>
        </view>
      </scroll-view>
    </view>

    <!-- 商品网格 -->
    <DataState
      :is-loading="loading && products.length === 0"
      :is-empty="!loading && products.length === 0"
      empty-icon="📦"
      empty-title="暂无商品"
      skeleton-type="card"
      @retry="loadProducts"
    >
      <view class="product-grid">
        <view
          v-for="p in products"
          :key="p.id"
          class="product-card"
          @click="goProduct(p)"
        >
          <view class="product-img-wrap">
            <image
              :src="p.cover"
              class="product-img"
              mode="aspectFill"
            />
            <text
              v-if="p.originalPrice && p.originalPrice > p.price"
              class="product-discount"
            >
              {{ Math.round((1 - p.price / p.originalPrice) * 100) }}%OFF
            </text>
          </view>
          <view class="product-body">
            <text class="product-name">
              {{ p.name }}
            </text>
            <view
              v-if="p.tags && p.tags.length"
              class="product-tags"
            >
              <text
                v-for="tag in p.tags.slice(0, 2)"
                :key="tag"
                class="product-tag"
              >
                {{ tag }}
              </text>
            </view>
            <view class="product-bottom">
              <view class="product-price-row">
                <text class="product-price">
                  ¥{{ p.price }}
                </text>
                <text
                  v-if="p.originalPrice && p.originalPrice > p.price"
                  class="product-original-price"
                >
                  ¥{{ p.originalPrice }}
                </text>
              </view>
              <text
                class="product-add-cart"
                :class="{ added: addingToCart === p.id }"
                @click.stop="handleAddToCart(p.id)"
              >
                {{ addingToCart === p.id ? '✓' : '+' }}
              </text>
            </view>
            <text class="product-sales">
              已售 {{ p.sales || 0 }}
            </text>
          </view>
        </view>
      </view>
    </DataState>

    <!-- 驿站选择弹窗 -->
    <view
      v-if="showStationPicker"
      class="mask"
      @click="showStationPicker = false"
    >
      <view
        class="bottom-sheet"
        @click.stop
      >
        <view class="sheet-header">
          <text class="sheet-title">
            选择驿站
          </text>
          <text @click="showStationPicker = false">
            ▼
          </text>
        </view>
        <scroll-view
          scroll-y
          class="sheet-scroll"
        >
          <view
            class="sheet-item"
            :class="{ active: !selectedStation }"
            @click="selectStation(undefined)"
          >
            <text>全部驿站</text>
            <text v-if="!selectedStation">
              ✓
            </text>
          </view>
          <view
            v-for="s in stations"
            :key="s.id"
            class="sheet-item"
            :class="{ active: selectedStation === s.id }"
            @click="selectStation(s.id)"
          >
            <view>
              <text class="sheet-item-name">
                {{ s.name }}
              </text>
              <text class="sheet-item-city">
                {{ s.city }}
              </text>
            </view>
            <text v-if="selectedStation === s.id">
              ✓
            </text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 排序选择弹窗 -->
    <view
      v-if="showSortPicker"
      class="mask"
      @click="showSortPicker = false"
    >
      <view
        class="bottom-sheet"
        @click.stop
      >
        <view class="sheet-header">
          <text class="sheet-title">
            排序方式
          </text>
          <text @click="showSortPicker = false">
            ▼
          </text>
        </view>
        <view>
          <view
            v-for="opt in sortOptions"
            :key="opt.value"
            class="sheet-item"
            :class="{ active: sortBy === opt.value }"
            @click="selectSort(opt.value)"
          >
            <text>{{ opt.label }}</text>
            <text v-if="sortBy === opt.value">
              ✓
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { offlineApi, shopApi } from '../../api'
import DataState from '../../components/DataState.vue'

interface Product {
  id: number
  name: string
  cover: string
  price: number
  originalPrice?: number
  sales?: number
  tags?: string[]
}

interface Station {
  id: number
  name: string
  city?: string
}

const categoryIcons: Record<string, string> = {
  book: '📖',
  tool: '🧭',
  tea: '☕',
  incense: '🔥',
  ornament: '💎',
  other: '📦',
}

const categories = [
  { value: 'all', label: '全部' },
  { value: 'book', label: '图书' },
  { value: 'tool', label: '工具' },
  { value: 'tea', label: '茶品' },
  { value: 'incense', label: '香品' },
  { value: 'ornament', label: '饰品' },
  { value: 'other', label: '其他' },
]

const sortOptions = [
  { value: 'default', label: '默认排序' },
  { value: 'sales', label: '销量优先' },
  { value: 'price', label: '价格优先' },
  { value: 'newest', label: '最新上架' },
]

const products = ref<Product[]>([])
const stations = ref<Station[]>([])
const loading = ref(false)
const keyword = ref('')
const selectedStation = ref<number | undefined>()
const selectedCategory = ref('all')
const sortBy = ref('default')
const showStationPicker = ref(false)
const showSortPicker = ref(false)
const cartCount = ref(0)
const addingToCart = ref<number | null>(null)

const selectedStationName = computed(() =>
  selectedStation.value
    ? stations.value.find(s => s.id === selectedStation.value)?.name || '选择驿站'
    : '全部驿站'
)

const sortLabel = computed(() =>
  sortOptions.find(s => s.value === sortBy.value)?.label || '默认排序'
)

onMounted(() => {
  loadStations()
  loadProducts()
})

watch([selectedStation, selectedCategory, sortBy, keyword], () => { loadProducts() })

async function loadStations() {
  try {
    const res: any = await offlineApi.stations()
    stations.value = Array.isArray(res) ? res : res?.list || res?.data || []
  } catch (e: any) {
    console.error(e)
  }
}

async function loadProducts() {
  loading.value = true
  try {
    const params: any = {}
    if (selectedStation.value) params.stationId = selectedStation.value
    if (selectedCategory.value !== 'all') params.category = selectedCategory.value
    if (keyword.value) params.keyword = keyword.value
    if (sortBy.value !== 'default') params.sortBy = sortBy.value
    const { stationId: sid, ...filters } = params
    const res: any = await offlineApi.getProducts(String(sid || 1), filters)
    const list = Array.isArray(res) ? res : res?.list || res?.data || []
    products.value = list
  } catch (e: any) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function selectStation(id: number | undefined) {
  selectedStation.value = id
  showStationPicker.value = false
}

function selectSort(val: string) {
  sortBy.value = val
  showSortPicker.value = false
}

async function handleAddToCart(productId: number) {
  addingToCart.value = productId
  try {
    await shopApi.addToCart({ productId: String(productId) })
    cartCount.value += 1
  } catch (e: any) {
    console.error(e)
  }
  setTimeout(() => { addingToCart.value = null }, 500)
}

function handleSearch() {
  // 搜索会自动通过watch触发loadProducts
}

function goProduct(p: Product) {
  uni.navigateTo({ url: `/pages/shop/product-detail?id=${p.id}` })
}

function goCart() {
  uni.navigateTo({ url: '/pages/shop/cart' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 40rpx;
}
.header {
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1rpx solid #E5E1DB;
}
.header-row {
  display: flex;
  align-items: center;
  padding: 24rpx;
  gap: 12rpx;
}
.back-btn { font-size: 36rpx; }
.header-title { font-size: 32rpx; font-weight: 600; flex: 1; }
.cart-btn-wrap { position: relative; font-size: 32rpx; padding: 8rpx; }
.cart-badge {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  width: 32rpx;
  height: 32rpx;
  background: #C41E3A;
  color: #fff;
  font-size: 20rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-wrap {
  position: relative;
  margin: 0 24rpx 12rpx;
}
.search-icon {
  position: absolute;
  left: 20rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 28rpx;
}
.search-input {
  width: 100%;
  height: 64rpx;
  background: #F5F0E8;
  border-radius: 32rpx;
  padding-left: 60rpx;
  font-size: 26rpx;
  border: none;
  box-sizing: border-box;
}

.filter-row {
  display: flex;
  gap: 12rpx;
  padding: 0 24rpx 12rpx;
}
.filter-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 20rpx;
  background: #F5F0E8;
  border-radius: 28rpx;
  font-size: 24rpx;
}
.filter-text { max-width: 140rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.category-scroll {
  white-space: nowrap;
  padding: 0 24rpx 16rpx;
}
.category-inner { display: inline-flex; gap: 12rpx; }
.category-tab {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  font-size: 24rpx;
  color: #666;
  padding: 8rpx 22rpx;
  border-radius: 28rpx;
  background: #F5F0E8;
  border: 1rpx solid #E8E0D5;
}
.category-tab.active {
  background: linear-gradient(135deg, #C41E3A, #A01830);
  color: #fff;
  border-color: #C41E3A;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  padding: 20rpx 24rpx;
}
.product-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04);
}
.product-img-wrap { position: relative; aspect-ratio: 1; background: #f0ebe3; }
.product-img { width: 100%; height: 100%; }
.product-discount {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  background: #C41E3A;
  color: #fff;
  font-size: 18rpx;
  padding: 2rpx 10rpx;
  border-radius: 4rpx;
}
.product-body { padding: 16rpx; }
.product-name { font-size: 24rpx; font-weight: 500; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 8rpx; }
.product-tags { display: flex; gap: 6rpx; margin-bottom: 8rpx; }
.product-tag { font-size: 18rpx; color: #C41E3A; background: rgba(196,30,58,0.08); padding: 2rpx 8rpx; border-radius: 4rpx; }
.product-bottom { display: flex; justify-content: space-between; align-items: flex-end; }
.product-price-row { display: flex; align-items: baseline; gap: 6rpx; }
.product-price { font-size: 26rpx; color: #C41E3A; font-weight: bold; }
.product-original-price { font-size: 18rpx; color: #999; text-decoration: line-through; }
.product-add-cart {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: bold;
}
.product-add-cart.added { background: #27ae60; }
.product-sales { font-size: 18rpx; color: #999; display: block; margin-top: 4rpx; }

.mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0,0,0,0.5);
}
.bottom-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
}
.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #E5E1DB;
  font-size: 28rpx;
}
.sheet-title { font-weight: 600; }
.sheet-scroll { flex: 1; overflow-y: auto; }
.sheet-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid #f5f0e8;
  font-size: 24rpx;
  color: #666;
}
.sheet-item.active { color: #C41E3A; font-weight: 500; background: rgba(196,30,58,0.03); }
.sheet-item-name { display: block; }
.sheet-item-city { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }
</style>
