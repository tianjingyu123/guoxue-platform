<template>
  <view class="min-h-screen" style="background-color: #FAF8F5;">
    <!-- 顶部搜索栏 -->
    <view class="sticky top-0 z-40"
      style="background-color: rgba(250,248,245,0.95); border-bottom: 2rpx solid #E8E0D5; backdrop-filter: blur(20rpx);">
      <view class="flex items-center" style="gap: 24rpx; padding: 0 32rpx; height: 112rpx;">
        <view style="width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center;" @click="goBack">
          <text style="font-size: 36rpx; color: #2C2C2C;">←</text>
        </view>
        <view style="flex: 1; position: relative;">
          <text style="position: absolute; left: 24rpx; top: 50%; transform: translateY(-50%); font-size: 24rpx; color: #999999;"></text>
          <input type="text" v-model="searchQuery" placeholder="搜索商品"
            style="width: 100%; height: 72rpx; padding-left: 72rpx; padding-right: 32rpx; border-radius: 999rpx; background-color: #F5F1EB; font-size: 26rpx; color: #2C2C2C;"
            placeholder-style="color: #999999;" />
        </view>
      </view>
    </view>

    <view class="flex">
      <!-- 左侧分类栏 -->
      <view class="flex-shrink-0"
        style="width: 160rpx; background-color: rgba(245,241,235,0.3); border-right: 2rpx solid #E8E0D5; min-height: calc(100vh - 112rpx); position: sticky; top: 112rpx;">
        <view style="padding: 16rpx 0;">
          <view v-for="cat in categories" :key="cat.id" @click="activeCategory = cat.id; showSortMenu = false"
            :style="{
              width: '100%',
              padding: '24rpx 16rpx',
              textAlign: 'center',
              fontSize: '22rpx',
              position: 'relative',
              color: activeCategory === cat.id ? '#C41E3A' : '#999999',
              fontWeight: activeCategory === cat.id ? 500 : 400,
              backgroundColor: activeCategory === cat.id ? '#FFFFFF' : 'transparent'
            }">
            <view v-if="activeCategory === cat.id"
              style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 4rpx; height: 48rpx; background-color: #C41E3A; border-radius: 0 4rpx 4rpx 0;" />
            <text style="display: block; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">{{ cat.name }}</text>
            <text style="font-size: 18rpx; color: rgba(153,153,153,0.7); margin-top: 4rpx; display: block;">{{ cat.count }}</text>
          </view>
        </view>
      </view>

      <!-- 右侧商品列表 -->
      <view class="flex-1" style="min-width: 0;">
        <!-- 排序栏 -->
        <view class="sticky z-30"
          style="top: 112rpx; background-color: #FAF8F5; border-bottom: 2rpx solid #E8E0D5;">
          <view class="flex items-center justify-between" style="padding: 0 24rpx; height: 80rpx;">
            <!-- 排序下拉 -->
            <view style="position: relative;">
              <view class="flex items-center" style="gap: 8rpx; font-size: 26rpx; color: #2C2C2C;" @click="showSortMenu = !showSortMenu">
                <text>{{ sortOptions.find(s => s.id === sortBy)?.name }}</text>
                <text :style="{ fontSize: '20rpx', transition: 'transform 0.2s', transform: showSortMenu ? 'rotate(180deg)' : 'rotate(0deg)' }">▾</text>
              </view>
              <!-- 遮罩层 -->
              <view v-if="showSortMenu" style="position: fixed; inset: 0; z-index: 40;" @click="showSortMenu = false" />
              <!-- 下拉菜单 -->
              <view v-if="showSortMenu"
                style="position: absolute; top: 100%; left: 0; margin-top: 8rpx; width: 224rpx; background-color: #FFFFFF; border: 2rpx solid #E8E0D5; border-radius: 16rpx; box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.1); z-index: 50; padding: 8rpx 0;">
                <view v-for="option in sortOptions" :key="option.id" @click="sortBy = option.id; showSortMenu = false"
                  :style="{
                    width: '100%',
                    padding: '16rpx 24rpx',
                    textAlign: 'left',
                    fontSize: '26rpx',
                    color: sortBy === option.id ? '#C41E3A' : '#2C2C2C',
                    backgroundColor: sortBy === option.id ? 'rgba(196,30,58,0.05)' : 'transparent'
                  }">
                  <text>{{ option.name }}</text>
                </view>
              </view>
            </view>

            <!-- 筛选按钮 -->
            <view class="flex items-center" style="gap: 8rpx; font-size: 26rpx;"
              :style="{ color: hasActiveFilter ? '#C41E3A' : '#999999' }"
              @click="showFilter = true">
              <text style="font-size: 28rpx;">⚙️</text>
              <text>筛选</text>
            </view>
          </view>
        </view>

        <!-- 商品网格 -->
        <view v-if="sortedProducts.length > 0" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; padding: 16rpx;">
          <view v-for="product in sortedProducts" :key="product.id" @click="goProduct(product.id)"
            style="background-color: #FFFFFF; border-radius: 16rpx; overflow: hidden;">
            <view style="aspect-ratio: 1; background-color: #F5F1EB; position: relative; display: flex; align-items: center; justify-content: center;">
              <text style="font-size: 64rpx; color: rgba(153,153,153,0.3);">{{ getCategoryInitial(product.category) }}</text>
              <text v-if="product.isMemberFree"
                style="position: absolute; top: 12rpx; left: 12rpx; padding: 4rpx 12rpx; background-color: #C9A96E; color: #FFFFFF; font-size: 18rpx; border-radius: 8rpx;">
                会员免费
              </text>
            </view>
            <view style="padding: 16rpx;">
              <text style="font-size: 22rpx; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; min-height: 60rpx;">
                {{ product.name }}
              </text>
              <view class="flex items-baseline" style="gap: 8rpx; margin-top: 8rpx;">
                <text style="font-size: 28rpx; color: #C41E3A; font-weight: 600;">¥{{ product.price }}</text>
                <text style="font-size: 18rpx; color: #999999; text-decoration: line-through;">¥{{ product.originalPrice }}</text>
              </view>
              <text style="font-size: 18rpx; color: #999999; margin-top: 4rpx; display: block;">
                已售{{ product.sales > 1000 ? (product.sales / 1000).toFixed(1) + 'k' : product.sales }}
              </text>
            </view>
          </view>
        </view>
        <!-- 空状态 -->
        <view v-else style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 0;">
          <view style="width: 160rpx; height: 160rpx; border-radius: 50%; background-color: #F5F1EB; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx;">
            <text style="font-size: 64rpx; color: #999999;"></text>
          </view>
          <text style="color: #999999; font-size: 26rpx;">暂无相关商品</text>
          <view style="margin-top: 24rpx; font-size: 26rpx; color: #C41E3A;" @click="resetFilters">重置筛选条件</view>
        </view>
      </view>
    </view>

    <!-- 筛选面板 -->
    <view v-if="showFilter" style="position: fixed; inset: 0; z-index: 999;">
      <view style="position: fixed; inset: 0; background-color: rgba(0,0,0,0.5);" @click="showFilter = false" />
      <view style="position: fixed; bottom: 0; left: 0; right: 0; background-color: #FFFFFF; border-radius: 24rpx 24rpx 0 0; z-index: 999; padding-bottom: env(safe-area-inset-bottom);"
        :style="{ animation: 'slideUp 0.3s ease-out' }">
        <view class="flex items-center justify-between" style="padding: 24rpx 32rpx; border-bottom: 2rpx solid #E8E0D5;">
          <text style="font-size: 30rpx; font-weight: 600; color: #2C2C2C;">筛选</text>
          <text style="color: #999999;" @click="showFilter = false">✕</text>
        </view>
        <view style="padding: 32rpx; max-height: 60vh; overflow-y: auto;">
          <!-- 价格区间 -->
          <view style="margin-bottom: 48rpx;">
            <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 24rpx; display: block;">价格区间</text>
            <view class="flex items-center" style="gap: 24rpx;">
              <input type="number" :value="priceRange[0] || ''" @input="onPriceMinInput"
                placeholder="最低价"
                style="flex: 1; height: 80rpx; padding: 0 24rpx; border-radius: 16rpx; background-color: #F5F1EB; font-size: 26rpx; color: #2C2C2C;"
                placeholder-style="color: #999999;" />
              <text style="color: #999999;">-</text>
              <input type="number" :value="priceRange[1] === 1000 ? '' : priceRange[1]" @input="onPriceMaxInput"
                placeholder="最高价"
                style="flex: 1; height: 80rpx; padding: 0 24rpx; border-radius: 16rpx; background-color: #F5F1EB; font-size: 26rpx; color: #2C2C2C;"
                placeholder-style="color: #999999;" />
            </view>
            <!-- 快捷价格标签 -->
            <view style="display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 24rpx;">
              <view v-for="[min, max] in quickPrices" :key="`${min}-${max}`" @click="priceRange = [min, max]"
                :style="{
                  padding: '12rpx 24rpx',
                  borderRadius: '999rpx',
                  fontSize: '22rpx',
                  backgroundColor: priceRange[0] === min && priceRange[1] === max ? '#C41E3A' : '#F5F1EB',
                  color: priceRange[0] === min && priceRange[1] === max ? '#FFFFFF' : '#2C2C2C'
                }">
                <text>¥{{ min }}-{{ max }}</text>
              </view>
            </view>
          </view>

          <!-- 其他筛选 -->
          <view>
            <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 24rpx; display: block;">其他</text>
            <view class="flex items-center" style="gap: 24rpx;" @click="onlyMemberFree = !onlyMemberFree">
              <view :style="{
                width: '40rpx',
                height: '40rpx',
                borderRadius: '8rpx',
                border: '4rpx solid',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: onlyMemberFree ? '#C41E3A' : 'transparent',
                borderColor: onlyMemberFree ? '#C41E3A' : 'rgba(153,153,153,0.3)'
              }">
                <text v-if="onlyMemberFree" style="color: #FFFFFF; font-size: 22rpx;">✓</text>
              </view>
              <text style="font-size: 26rpx; color: #2C2C2C;">仅看会员免费</text>
            </view>
          </view>
        </view>
        <!-- 底部按钮 -->
        <view class="flex" style="gap: 24rpx; padding: 32rpx; border-top: 2rpx solid #E8E0D5;">
          <view @click="priceRange = [0, 1000]; onlyMemberFree = false"
            style="flex: 1; padding: 24rpx 0; background-color: #F5F1EB; color: #2C2C2C; font-size: 26rpx; font-weight: 500; border-radius: 16rpx; text-align: center;">
            重置
          </view>
          <view @click="showFilter = false"
            style="flex: 1; padding: 24rpx 0; background-color: #C41E3A; color: #FFFFFF; font-size: 26rpx; font-weight: 500; border-radius: 16rpx; text-align: center;">
            确定
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const categories = [
  { id: 'all', name: '全部', count: 256 },
  { id: 'books', name: '书籍', count: 86 },
  { id: 'creative', name: '文创', count: 42 },
  { id: 'jewelry', name: '饰品', count: 38 },
  { id: 'course', name: '课程周边', count: 24 },
  { id: 'tea', name: '茶具香道', count: 32 },
  { id: 'stationery', name: '文房四宝', count: 28 },
  { id: 'clothing', name: '国风服饰', count: 18 },
]

const sortOptions = [
  { id: 'default', name: '综合排序' },
  { id: 'sales', name: '销量优先' },
  { id: 'price_asc', name: '价格升序' },
  { id: 'price_desc', name: '价格降序' },
  { id: 'newest', name: '最新上架' },
]

const quickPrices: [number, number][] = [[0, 50], [50, 100], [100, 300], [300, 500], [500, 1000]]

const products = [
  { id: 1, name: '《渊海子平》精装典藏版', price: 128, originalPrice: 168, sales: 2856, category: 'books', isMemberFree: false },
  { id: 2, name: '八卦太极挂件纯铜', price: 68, originalPrice: 98, sales: 1256, category: 'jewelry', isMemberFree: false },
  { id: 3, name: '国学书签套装礼盒', price: 39, originalPrice: 59, sales: 3680, category: 'creative', isMemberFree: true },
  { id: 4, name: '《滴天髓》白话详解', price: 88, originalPrice: 118, sales: 1892, category: 'books', isMemberFree: false },
  { id: 5, name: '紫砂茶壶 手工刻绘', price: 368, originalPrice: 468, sales: 568, category: 'tea', isMemberFree: false },
  { id: 6, name: '湖笔套装 书法入门', price: 158, originalPrice: 198, sales: 892, category: 'stationery', isMemberFree: false },
  { id: 7, name: '罗盘模型 风水摆件', price: 199, originalPrice: 299, sales: 1456, category: 'jewelry', isMemberFree: false },
  { id: 8, name: '《三命通会》全译本', price: 148, originalPrice: 188, sales: 1128, category: 'books', isMemberFree: false },
  { id: 9, name: '沉香线香 养生助眠', price: 89, originalPrice: 128, sales: 2156, category: 'tea', isMemberFree: false },
  { id: 10, name: '课程笔记本 手账本', price: 29, originalPrice: 49, sales: 4562, category: 'course', isMemberFree: true },
  { id: 11, name: '五帝钱挂饰 开光铜钱', price: 58, originalPrice: 88, sales: 3256, category: 'jewelry', isMemberFree: false },
  { id: 12, name: '端砚 文房珍品', price: 688, originalPrice: 888, sales: 286, category: 'stationery', isMemberFree: false },
]

const activeCategory = ref('all')
const sortBy = ref('default')
const showSortMenu = ref(false)
const showFilter = ref(false)
const searchQuery = ref('')
const priceRange = ref<[number, number]>([0, 1000])
const onlyMemberFree = ref(false)

const hasActiveFilter = computed(() =>
  priceRange.value[0] > 0 || priceRange.value[1] < 1000 || onlyMemberFree.value
)

const filteredProducts = computed(() => {
  return products.filter(product => {
    if (activeCategory.value !== 'all' && product.category !== activeCategory.value) return false
    if (searchQuery.value && !product.name.includes(searchQuery.value)) return false
    if (product.price < priceRange.value[0] || product.price > priceRange.value[1]) return false
    if (onlyMemberFree.value && !product.isMemberFree) return false
    return true
  })
})

const sortedProducts = computed(() => {
  return [...filteredProducts.value].sort((a, b) => {
    switch (sortBy.value) {
      case 'sales': return b.sales - a.sales
      case 'price_asc': return a.price - b.price
      case 'price_desc': return b.price - a.price
      case 'newest': return b.id - a.id
      default: return 0
    }
  })
})

function getCategoryInitial(catId: string): string {
  const cat = categories.find(c => c.id === catId)
  return cat ? cat.name.charAt(0) : '📦'
}

function onPriceMinInput(e: any) {
  const val = parseInt(e.detail.value) || 0
  priceRange.value = [val, priceRange.value[1]]
}

function onPriceMaxInput(e: any) {
  const val = parseInt(e.detail.value) || 1000
  priceRange.value = [priceRange.value[0], val]
}

function goBack() {
  uni.navigateBack()
}

function goProduct(id: number) {
  uni.navigateTo({ url: `/pages/mall/product/id-detail/index?id=${id}` })
}

function resetFilters() {
  activeCategory.value = 'all'
  searchQuery.value = ''
  priceRange.value = [0, 1000]
  onlyMemberFree.value = false
  showFilter.value = false
}
</script>

<style scoped>
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.items-baseline { align-items: baseline; }

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
