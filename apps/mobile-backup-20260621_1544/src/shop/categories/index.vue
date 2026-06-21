<template>
  <view class="cat-page">
    <!-- 顶部导航 -->
    <view
      class="navbar"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view
        class="nav-btn"
        hover-class="nav-hover"
        @tap="goBack"
      >
        <app-icon
          name="arrow-left"
          :size="34"
          color="#2C2C2C"
        />
      </view>
      <text class="nav-title">
        商品分类
      </text>
      <view
        class="nav-btn"
        hover-class="nav-hover"
        @tap="goSearch"
      >
        <app-icon
          name="search"
          :size="34"
          color="#2C2C2C"
        />
      </view>
    </view>

    <!-- 双栏布局 -->
    <view class="body">
      <!-- 左侧一级分类 -->
      <scroll-view
        class="left-rail"
        scroll-y
      >
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="rail-item"
          :class="{ 'rail-active': selectedCategory === cat.id }"
          hover-class="rail-hover"
          @tap="handleCategoryClick(cat.id)"
        >
          <view
            v-if="selectedCategory === cat.id"
            class="rail-bar"
          />
          <text class="rail-icon">
            {{ cat.icon }}
          </text>
          <text class="rail-name">
            {{ cat.name }}
          </text>
        </view>
      </scroll-view>

      <!-- 右侧内容区 -->
      <view class="right-panel">
        <!-- 二级分类标签 -->
        <view
          v-if="currentCategory && currentCategory.children.length"
          class="sub-tabs"
        >
          <view
            v-for="sub in currentCategory.children"
            :key="sub.id"
            class="sub-tab"
            :class="{ 'sub-tab-active': selectedSubCategory === sub.id }"
            hover-class="opt-hover"
            @tap="selectedSubCategory = sub.id"
          >
            {{ sub.name }}
          </view>
        </view>

        <!-- 商品列表 -->
        <scroll-view
          class="goods-scroll"
          scroll-y
        >
          <view
            v-if="products.length"
            class="goods-grid"
          >
            <view
              v-for="p in products"
              :key="p.id"
              class="goods-card"
              hover-class="card-hover"
              @tap="goProduct(p.id)"
            >
              <image
                class="goods-img"
                :src="p.cover"
                mode="aspectFill"
              />
              <text class="goods-name">
                {{ p.name }}
              </text>
              <view class="goods-price-row">
                <text class="goods-price">
                  ¥{{ p.price }}
                </text>
                <text
                  v-if="p.originalPrice > p.price"
                  class="goods-old"
                >
                  ¥{{ p.originalPrice }}
                </text>
              </view>
              <text class="goods-sales">
                已售 {{ p.sales }}
              </text>
            </view>
          </view>
          <view
            v-else
            class="empty"
          >
            <view class="empty-icon">
              <app-icon
                name="search"
                :size="56"
                color="#999999"
              />
            </view>
            <text class="empty-text">
              暂无商品
            </text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack, navigateTo } from '@/utils/router'
import { shopApi, type ShopCategoryNode } from '@/lib/shop-data'

const statusBarHeight = ref(0)
const categories = ref<ShopCategoryNode[]>([])
const products = ref<any[]>([])
const selectedCategory = ref('')
const selectedSubCategory = ref('')

const currentCategory = computed(() => categories.value.find((c) => c.id === selectedCategory.value))

async function loadCategoryProducts(categoryId: string) {
  try {
    const res = await shopApi.getCategoryProducts(categoryId)
    products.value = (res as any)?.items || []
  } catch { products.value = [] }
}

onLoad(async () => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
  } catch (e) {
    statusBarHeight.value = 0
  }
  try {
    categories.value = await shopApi.getCategoryTree()
  } catch { categories.value = [] }
  selectedCategory.value = categories.value[0]?.id || ''
  selectedSubCategory.value = categories.value[0]?.children[0]?.id || ''
  if (selectedCategory.value) {
    await loadCategoryProducts(selectedCategory.value)
  }
})

function handleCategoryClick(id: string) {
  selectedCategory.value = id
  const cat = categories.value.find((c) => c.id === id)
  if (cat?.children.length) selectedSubCategory.value = cat.children[0].id
  loadCategoryProducts(id)
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
.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #e8e3db;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
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
}
.rail-active {
  background: #fff;
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
  font-size: 36rpx;
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
}
.sub-tab-active {
  background: #c41e3a;
  color: #fff;
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
</style>
