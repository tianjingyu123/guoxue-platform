<template>
  <view class="page">
    <template v-if="loading">
      <view class="sk-top">
        <view
          class="sk-line mx-auto"
          style="width:192rpx;height:48rpx"
        />
      </view>
      <view class="flex h-[calc(100vh-112rpx)]">
        <view class="sk-sidebar">
          <view
            v-for="i in 8"
            :key="i"
            class="sk-bar-item"
          />
        </view>
        <view class="sk-content">
          <view class="grid grid-cols-2 gap-6">
            <view
              v-for="i in 6"
              :key="i"
              class="sk-product"
            />
          </view>
        </view>
      </view>
    </template>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="nav-bar">
        <view
          class="nav-left"
          @click="goBack"
        >
          <text class="nav-icon">
            ←
          </text>
        </view>
        <text class="nav-title">
          商品分类
        </text>
        <view
          class="nav-right"
          @click="goSearch"
        >
          <text class="nav-icon">
            🔍
          </text>
        </view>
      </view>

      <!-- 双栏布局 -->
      <view class="main-layout">
        <!-- 左侧一级分类 -->
        <scroll-view
          class="left-sidebar"
          scroll-y
        >
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="cat-item"
            :class="{ active: selectedCategory === cat.id }"
            @click="handleCategoryClick(cat.id)"
          >
            <view
              v-if="selectedCategory === cat.id"
              class="cat-indicator"
            />
            <text class="cat-icon">
              {{ cat.icon || '⊞' }}
            </text>
            <text class="cat-name">
              {{ cat.name }}
            </text>
          </view>
        </scroll-view>

        <!-- 右侧 -->
        <scroll-view
          class="right-panel"
          scroll-y
        >
          <!-- 二级分类 -->
          <view
            v-if="currentCategory?.children?.length"
            class="sub-tab-bar"
          >
            <scroll-view
              scroll-x
              show-scrollbar="false"
            >
              <view class="sub-tab-list">
                <view
                  v-for="sub in currentCategory.children"
                  :key="sub.id"
                  class="sub-tab"
                  :class="{ active: selectedSubCategory === sub.id }"
                  @click="selectedSubCategory = sub.id"
                >
                  <text>{{ sub.name }}</text>
                </view>
              </view>
            </scroll-view>
          </view>

          <!-- 商品列表 -->
          <view class="product-area">
            <template v-if="productsLoading">
              <view class="product-grid">
                <view
                  v-for="i in 6"
                  :key="i"
                  class="sk-product-item"
                >
                  <view class="sk-product-img" />
                  <view class="sk-product-name" />
                  <view class="sk-product-price" />
                </view>
              </view>
            </template>
            <template v-else-if="products.length > 0">
              <view class="product-grid">
                <view
                  v-for="product in products"
                  :key="product.id"
                  class="product-card"
                  @click="goProduct(product.id)"
                >
                  <view class="product-img-wrap">
                    <image
                      :src="product.cover || ''"
                      class="product-img"
                      mode="aspectFill"
                    />
                  </view>
                  <text class="product-title">
                    {{ product.name }}
                  </text>
                  <view class="product-price-row">
                    <text class="product-price">
                      ¥{{ product.price }}
                    </text>
                    <text
                      v-if="product.originalPrice > product.price"
                      class="product-original"
                    >
                      ¥{{ product.originalPrice }}
                    </text>
                  </view>
                  <text class="product-sales">
                    已售 {{ product.sales }}
                  </text>
                </view>
              </view>
            </template>
            <template v-else>
              <view class="empty-state">
                <view class="empty-icon-wrap">
                  <text class="empty-icon">
                    🔍
                  </text>
                </view>
                <text class="empty-text">
                  暂无商品
                </text>
              </view>
            </template>
          </view>
        </scroll-view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { shopApi } from '../../api'

interface ProductCategory { id: string; name: string; icon: string; children?: ProductCategory[] }
interface Product { id: string; name: string; cover: string; price: number; originalPrice: number; sales: number; rating: number; category: string }


const categories = ref<ProductCategory[]>([])
const products = ref<Product[]>([])
const selectedCategory = ref('')
const selectedSubCategory = ref('')
const loading = ref(true)
const productsLoading = ref(false)
const error = ref<string | null>(null)

onMounted(() => { loadCategories() })

watch(selectedSubCategory, (nv) => { if (nv) loadProducts(nv) })

async function loadCategories() {
  try {
    const data = await shopApi.categoryTree()
    categories.value = data
    if (data.length > 0) {
      selectedCategory.value = data[0].id
      if (data[0].children?.length) selectedSubCategory.value = data[0].children[0].id
    }
  } catch {
    categories.value = []
    error.value = '加载分类失败'
  } finally { loading.value = false }
}

async function loadProducts(categoryId: string) {
  productsLoading.value = true
  try {
    const res = await shopApi.categoryProducts(categoryId)
    products.value = res?.data || res || []
  } catch {
    products.value = []
  } finally { productsLoading.value = false }
}

const currentCategory = computed(() => categories.value.find(c => c.id === selectedCategory.value))

function handleCategoryClick(categoryId: string) {
  selectedCategory.value = categoryId
  const cat = categories.value.find(c => c.id === categoryId)
  if (cat?.children?.length) selectedSubCategory.value = cat.children[0].id
}

function goBack() { uni.navigateBack() }
function goSearch() { uni.navigateTo({ url: '/pages/shop/search' }) }
function goProduct(id: string) { uni.navigateTo({ url: `/pages/shop/product-detail?id=${id}` }) }
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; }
.sk-top { background: #fff; padding: 24rpx; border-bottom: 2rpx solid #E8E3DB; }
.sk-line { background: #E8E3DB; border-radius: 8rpx; }
.sk-sidebar { width: 192rpx; background: #F5F2EF; padding: 12rpx; }
.sk-bar-item { height: 96rpx; background: #E8E3DB; border-radius: 8rpx; margin-bottom: 12rpx; }
.sk-content { flex: 1; padding: 24rpx; }
.sk-product { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.sk-product-item { background: #fff; border-radius: 16rpx; padding: 20rpx; }
.sk-product-img { aspect-ratio: 1; background: #E8E3DB; border-radius: 12rpx; margin-bottom: 12rpx; }
.sk-product-name { height: 32rpx; background: #E8E3DB; border-radius: 8rpx; width: 75%; margin-bottom: 8rpx; }
.sk-product-price { height: 32rpx; background: #E8E3DB; border-radius: 8rpx; width: 50%; }
.flex { display: flex; }
.grid { display: grid; }
.grid-cols-2 { grid-template-columns: 1fr 1fr; }
.gap-6 { gap: 24rpx; }
.mx-auto { margin-left: auto; margin-right: auto; }
.nav-bar { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 2rpx solid #E8E3DB; display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; }
.nav-left, .nav-right { padding: 8rpx; }
.nav-icon { font-size: 40rpx; color: #2C2C2C; }
.nav-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.main-layout { display: flex; height: calc(100vh - 112rpx); }
.left-sidebar { width: 192rpx; background: #F5F2EF; border-right: 2rpx solid #E8E3DB; flex-shrink: 0; overflow-y: auto; }
.cat-item { padding: 32rpx 16rpx; text-align: center; font-size: 26rpx; position: relative; transition: all 0.2s; color: #666; }
.cat-item.active { background: #fff; color: #C41E3A; font-weight: 500; }
.cat-indicator { position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 8rpx; height: 64rpx; background: #C41E3A; border-radius: 0 8rpx 8rpx 0; }
.cat-icon { display: block; font-size: 36rpx; margin-bottom: 8rpx; }
.cat-name { display: block; line-height: 1.3; }
.right-panel { flex: 1; overflow-y: auto; }
.sub-tab-bar { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 2rpx solid #E8E3DB; padding: 20rpx 24rpx; white-space: nowrap; }
.sub-tab-list { display: flex; gap: 16rpx; }
.sub-tab { padding: 10rpx 24rpx; border-radius: 50rpx; font-size: 26rpx; background: #F5F2EF; color: #666; flex-shrink: 0; }
.sub-tab.active { background: #C41E3A; color: #fff; }
.product-area { padding: 20rpx; }
.product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.product-card { background: #fff; border-radius: 16rpx; padding: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.product-img-wrap { aspect-ratio: 1; border-radius: 12rpx; overflow: hidden; background: #F5F2EF; margin-bottom: 12rpx; }
.product-img { width: 100%; height: 100%; }
.product-title { font-size: 26rpx; color: #2C2C2C; font-weight: 500; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; margin-bottom: 8rpx; }
.product-price-row { display: flex; align-items: baseline; gap: 8rpx; }
.product-price { font-size: 28rpx; color: #C41E3A; font-weight: bold; }
.product-original { font-size: 20rpx; color: #999; text-decoration: line-through; }
.product-sales { font-size: 20rpx; color: #999; margin-top: 6rpx; display: block; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.empty-icon-wrap { width: 160rpx; height: 160rpx; border-radius: 50%; background: #F5F2EF; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.empty-icon { font-size: 56rpx; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
