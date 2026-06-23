<template>
  <view class="cat-page">
    <!-- 顶部导航 -->
    <app-nav-bar title="商品分类" back-icon="arrow-left" :back-size="34">
      <template #right>
        <view class="nav-btn" hover-class="nav-hover" @tap="goSearch">
          <app-icon name="search" :size="34" color="#2C2C2C" />
        </view>
      </template>
    </app-nav-bar>

    <!-- 双栏布局 -->
    <view class="body">
      <!-- 左侧一级分类 -->
      <scroll-view class="left-rail" scroll-y>
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="rail-item"
          :class="{ 'rail-active': selectedCategory === cat.id }"
          hover-class="rail-hover"
          @tap="handleCategoryClick(cat.id)"
        >
          <view v-if="selectedCategory === cat.id" class="rail-bar" />
          <view class="rail-icon"><app-icon :name="cat.icon" :size="36" :color="selectedCategory === cat.id ? '#c41e3a' : '#8c8c8c'" /></view>
          <text class="rail-name">{{ cat.name }}</text>
        </view>
      </scroll-view>

      <!-- 右侧内容区 -->
      <view class="right-panel">
        <!-- 二级分类标签 -->
        <view v-if="currentCategory && currentCategory.children.length" class="sub-tabs">
          <view
            v-for="sub in currentCategory.children"
            :key="sub.id"
            class="sub-tab"
            :class="{ 'sub-tab-active': selectedSubCategory === sub.id }"
            @tap="selectSub(sub.id)"
          >
            {{ sub.name }}
          </view>
        </view>

        <!-- 商品列表 -->
        <scroll-view class="goods-scroll" scroll-y>
          <!-- 切换分类骨架屏占位 -->
          <view v-if="loading" class="sk-grid">
            <view v-for="i in 6" :key="i" class="sk-card">
              <AppSkeleton width="100%" height="280rpx" radius="12rpx" mb="16rpx" />
              <AppSkeleton width="90%" height="26rpx" mb="12rpx" />
              <AppSkeleton width="50%" height="30rpx" mb="10rpx" />
              <AppSkeleton width="40%" height="22rpx" />
            </view>
          </view>
          <view v-else-if="error" class="empty">
            <view class="empty-icon">
              <app-icon name="alert-circle" :size="56" color="#E74C3C" />
            </view>
            <text class="empty-text">{{ error }}</text>
            <view class="retry-btn" hover-class="opt-hover" @tap="retry">
              <text class="retry-text">重试</text>
            </view>
          </view>
          <view v-else-if="products.length" class="goods-grid content-fade-in">
            <view
              v-for="p in products"
              :key="p.id"
              class="goods-card"
              hover-class="card-hover"
              @tap="goProduct(p.id)"
            >
              <image class="goods-img" :src="p.cover" mode="aspectFill" />
              <text class="goods-name">{{ p.name }}</text>
              <view class="goods-price-row">
                <text class="goods-price">¥{{ p.price }}</text>
                <text v-if="p.originalPrice > p.price" class="goods-old">¥{{ p.originalPrice }}</text>
              </view>
              <text class="goods-sales">已售 {{ p.sales }}</text>
            </view>
          </view>
          <view v-else class="empty">
            <view class="empty-icon">
              <app-icon name="search" :size="56" color="#999999" />
            </view>
            <text class="empty-text">暂无商品</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '@/utils/router'
import { shopApi, type ShopCategoryNode, type ShopCategoryProduct } from '@/lib/shop-data'
import AppSkeleton from '@/components/common/app-skeleton.vue'

const IMG = '/static/images/products'

/** 本地产品后备数据（待后端 API 支持品类产品后移除） */
const _localProducts: ShopCategoryProduct[] = [
  { id: 'cp1', name: '易经全解', cover: `${IMG}/book1.jpg`, price: 128, originalPrice: 168, sales: 100 },
  { id: 'cp2', name: '毛笔套装', cover: `${IMG}/item4.jpg`, price: 89, originalPrice: 128, sales: 237 },
  { id: 'cp3', name: '沉香线香', cover: `${IMG}/item5.jpg`, price: 168, originalPrice: 218, sales: 374 },
  { id: 'cp4', name: '紫砂茶壶', cover: `${IMG}/item3.jpg`, price: 299, originalPrice: 399, sales: 511 },
  { id: 'cp5', name: '艾灸盒', cover: `${IMG}/item6.jpg`, price: 68, originalPrice: 98, sales: 648 },
  { id: 'cp6', name: '招财貔貅', cover: `${IMG}/item2.jpg`, price: 388, originalPrice: 488, sales: 785 },
  { id: 'cp7', name: '小叶紫檀念珠', cover: `${IMG}/item1.jpg`, price: 258, originalPrice: 328, sales: 922 },
  { id: 'cp8', name: '古琴入门', cover: `${IMG}/item7.jpg`, price: 1999, originalPrice: 2599, sales: 1059 },
]

const categories = ref<ShopCategoryNode[]>([])
const products = ref<ShopCategoryProduct[]>([])
const selectedCategory = ref('')
const selectedSubCategory = ref('')
const loading = ref(true)
const error = ref('')

async function loadCategories() {
  loading.value = true
  error.value = ''
  try {
    categories.value = await shopApi.getCategories()
    products.value = _localProducts
    if (categories.value.length > 0 && !selectedCategory.value) {
      selectedCategory.value = categories.value[0].id
      if (categories.value[0].children.length > 0) {
        selectedSubCategory.value = categories.value[0].children[0].id
      }
    }
  } catch (_e) {
    error.value = '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadCategories() })

function retry() { loadCategories() }

function triggerLoading() {
  loading.value = true
  setTimeout(() => (loading.value = false), 450)
}
function selectSub(id: string) {
  if (selectedSubCategory.value === id) return
  selectedSubCategory.value = id
  triggerLoading()
}

const currentCategory = computed(() => categories.value.find((c) => c.id === selectedCategory.value))

function handleCategoryClick(id: string) {
  if (selectedCategory.value === id) return
  selectedCategory.value = id
  const cat = categories.value.find((c) => c.id === id)
  if (cat?.children.length) selectedSubCategory.value = cat.children[0].id
  triggerLoading()
}
function goProduct(id: string) {
  navigateTo(`/shop/${id}`)
}
function goSearch() {
  navigateTo('/shop/search')
}
</script>

<style scoped lang="scss">
.cat-page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}
.nav-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-hover {
  opacity: 0.6;
}
.body {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.left-rail {
  width: 180rpx;
  background: #f5f2ef;
  border-right: 1rpx solid #e8e3db;
  height: 100%;
}
.rail-item {
  position: relative;
  padding: 28rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  transition: background-color 0.25s ease, color 0.25s ease;
}
.rail-active {
  background: #fff;
}
.rail-bar {
  animation: rail-bar-in 0.25s ease-out;
}
@keyframes rail-bar-in {
  from { transform: translateY(-50%) scaleY(0); opacity: 0; }
  to { transform: translateY(-50%) scaleY(1); opacity: 1; }
}
.rail-hover {
  background: rgba(255, 255, 255, 0.5);
}
.rail-bar {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 8rpx;
  height: 56rpx;
  background: #c41e3a;
  border-radius: 0 6rpx 6rpx 0;
}
.rail-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.rail-name {
  font-size: 24rpx;
  color: #666;
  line-height: 1.3;
  text-align: center;
}
.rail-active .rail-name {
  color: #c41e3a;
  font-weight: 500;
}
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sub-tabs {
  background: #fff;
  border-bottom: 1rpx solid #e8e3db;
  padding: 20rpx 24rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.sub-tab {
  padding: 10rpx 24rpx;
  border-radius: 30rpx;
  font-size: 26rpx;
  color: #666;
  background: #f5f2ef;
  transition: background-color 0.25s ease, color 0.25s ease, transform 0.12s ease;
}
.sub-tab:active {
  transform: scale(0.95);
}
.sub-tab-active {
  background: #c41e3a;
  color: #fff;
}
.goods-card {
  transition: transform 0.12s ease, box-shadow 0.15s ease;
}
.goods-card:active {
  transform: scale(0.98);
}
.sk-grid {
  padding: 20rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.sk-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx;
}
.opt-hover {
  opacity: 0.7;
}
.goods-scroll {
  flex: 1;
  height: 100%;
}
.goods-grid {
  padding: 20rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.goods-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.card-hover {
  opacity: 0.9;
}
.goods-img {
  width: 100%;
  height: 280rpx;
  border-radius: 12rpx;
  background: #f5f2ef;
}
.goods-name {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.4;
  margin: 12rpx 0 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.goods-price-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.goods-price {
  font-size: 30rpx;
  font-weight: 700;
  color: #c41e3a;
}
.goods-old {
  font-size: 22rpx;
  color: #999;
  text-decoration: line-through;
}
.goods-sales {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}
.empty-icon {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: #f5f2ef;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #999;
}
.retry-btn {
  margin-top: 24rpx;
  padding: 16rpx 48rpx;
  background: #c41e3a;
  border-radius: 999rpx;
}
.retry-text {
  font-size: 26rpx;
  color: #fff;
}
</style>
