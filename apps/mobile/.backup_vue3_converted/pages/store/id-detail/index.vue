<template>
  <view class="min-h-screen bg-secondary/30 pb-20">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-border">
      <view class="flex items-center justify-between h-14 px-4">
        <view @click="goBack"><text class="text-xl text-foreground">←</text></view>
        <text class="text-base font-semibold text-foreground">店铺主页</text>
        <view><text class="text-lg text-muted-foreground"></text></view>
      </view>
    </view>

    <!-- 店铺头部 -->
    <view class="bg-gradient-to-br from-primary to-primary/80 text-white p-4 pb-6">
      <view class="flex items-start gap-4">
        <view class="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 shadow-lg">
          <text class="text-3xl">🏪</text>
        </view>
        <view class="flex-1 min-w-0">
          <view class="flex items-center gap-2">
            <text class="text-lg font-bold truncate">{{ shopData.name }}</text>
            <view class="bg-amber-500/90 text-white text-[10px] px-2 py-0.5 rounded-full flex-shrink-0">{{ shopData.level }}</view>
          </view>
          <text class="text-sm text-white/80 mt-1 block line-clamp-2">{{ shopData.slogan }}</text>
          <view class="flex items-center gap-3 mt-2 text-sm">
            <view class="flex items-center gap-1">
              <text class="text-amber-400 text-sm"></text>
              <text class="font-medium">{{ shopData.rating }}</text>
            </view>
            <text class="text-white/60">|</text>
            <text>{{ shopData.followerCount }} 关注</text>
            <text class="text-white/60">|</text>
            <text>{{ shopData.productCount }} 商品</text>
          </view>
        </view>
      </view>

      <!-- 标签 -->
      <view class="flex flex-wrap gap-2 mt-4">
        <view v-for="badge in shopData.badges" :key="badge" class="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full">
          {{ badge }}
        </view>
      </view>
    </view>

    <!-- 店铺数据卡片 -->
    <view class="mx-4 -mt-3 relative z-10 bg-white rounded-xl p-4 shadow-lg">
      <view class="grid grid-cols-4 gap-2 text-center">
        <view>
          <text class="text-lg font-bold text-foreground block">{{ shopData.productCount }}</text>
          <text class="text-xs text-muted-foreground">全部商品</text>
        </view>
        <view>
          <text class="text-lg font-bold text-foreground block">{{ shopData.salesCount }}</text>
          <text class="text-xs text-muted-foreground">总销量</text>
        </view>
        <view>
          <text class="text-lg font-bold text-foreground block">{{ shopData.reviewCount }}</text>
          <text class="text-xs text-muted-foreground">评价数</text>
        </view>
        <view>
          <text class="text-lg font-bold text-foreground block">{{ shopData.followerCount }}</text>
          <text class="text-xs text-muted-foreground">粉丝数</text>
        </view>
      </view>

      <!-- 评分详情 -->
      <view class="flex items-center justify-between mt-4 pt-4 border-t border-border text-xs">
        <view class="flex items-center gap-1">
          <text class="text-muted-foreground">服务</text>
          <text class="font-medium text-green-600">{{ shopData.serviceScore }}</text>
        </view>
        <view class="flex items-center gap-1">
          <text class="text-muted-foreground">物流</text>
          <text class="font-medium text-green-600">{{ shopData.logisticsScore }}</text>
        </view>
        <view class="flex items-center gap-1">
          <text class="text-muted-foreground">质量</text>
          <text class="font-medium text-green-600">{{ shopData.qualityScore }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="flex gap-3 mt-4 pt-4 border-t border-border">
        <view
          @click="isFollowed = !isFollowed"
          :class="['flex-1 py-2.5 rounded-xl text-center text-sm font-medium', isFollowed ? 'bg-secondary text-muted-foreground' : 'border border-border text-foreground']"
        >
          <text>{{ isFollowed ? ' 已关注' : '🤍 关注店铺' }}</text>
        </view>
        <view class="flex-1 py-2.5 border border-border rounded-xl text-center text-sm text-foreground">
          <text> 联系客服</text>
        </view>
      </view>
    </view>

    <!-- 店铺信息 -->
    <view class="mx-4 mt-3 bg-white rounded-xl p-4">
      <text class="text-sm font-medium text-foreground block mb-3">店铺信息</text>
      <text class="text-sm text-muted-foreground block mb-3">{{ shopData.description }}</text>
      <view class="space-y-2 text-sm">
        <view class="flex items-center gap-2 text-muted-foreground">
          <text class="text-sm">📞</text>
          <text>{{ shopData.phone }}</text>
        </view>
        <view class="flex items-center gap-2 text-muted-foreground">
          <text class="text-sm">📍</text>
          <text>{{ shopData.address }}</text>
        </view>
        <view class="flex items-center gap-2 text-muted-foreground">
          <text class="text-sm">🕐</text>
          <text>营业时间: {{ shopData.businessHours }}</text>
        </view>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="mt-4">
      <!-- 搜索 -->
      <view class="px-4 pb-3">
        <view class="relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"></text>
          <input v-model="searchQuery" placeholder="搜索店内商品" class="w-full pl-9 pr-3 py-2.5 bg-white border border-border rounded-xl text-sm outline-none text-foreground" />
        </view>
      </view>

      <!-- Tab排序 -->
      <view class="px-4 sticky top-14 z-40 bg-secondary/30 py-2">
        <view class="flex bg-white rounded-lg p-0.5 border border-border">
          <view
            v-for="tab in sortTabs"
            :key="tab.key"
            @click="sortBy = tab.key"
            :class="['flex-1 py-2 text-xs text-center rounded-md', sortBy === tab.key ? 'bg-primary text-white' : 'text-muted-foreground']"
          >
            <text>{{ tab.label }}</text>
          </view>
        </view>
      </view>

      <!-- 商品网格 -->
      <view class="px-4 mt-3">
        <view class="grid grid-cols-2 gap-3">
          <view
            v-for="product in filteredProducts"
            :key="product.id"
            @click="goProduct(product.id)"
            class="bg-white rounded-xl overflow-hidden"
          >
            <view class="aspect-square bg-secondary flex items-center justify-center relative">
              <text class="text-4xl">📦</text>
              <view v-if="product.isHot" class="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded">热销</view>
              <view v-else-if="product.isNew" class="absolute top-2 left-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded">新品</view>
            </view>
            <view class="p-3">
              <text class="text-sm font-medium text-foreground line-clamp-2 block min-h-[40px]">{{ product.title }}</text>
              <view class="flex items-baseline gap-1 mt-2">
                <text class="text-base font-bold text-primary">¥{{ product.price }}</text>
                <text v-if="product.originalPrice" class="text-xs text-muted-foreground line-through">¥{{ product.originalPrice }}</text>
              </view>
              <text class="text-xs text-muted-foreground mt-1 block">已售 {{ product.sales }}</text>
            </view>
          </view>
        </view>

        <view v-if="filteredProducts.length === 0" class="py-20 text-center">
          <text class="text-muted-foreground text-sm">未找到相关商品</text>
        </view>
      </view>
    </view>

    <!-- 底部购物车入口 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-3" :style="{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }">
      <view class="flex items-center gap-3">
        <view @click="goCart" class="relative p-2 border border-border rounded-xl">
          <text class="text-xl"></text>
          <view class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">2</view>
        </view>
        <view @click="goCart" class="flex-1 py-3 bg-primary text-white rounded-xl text-center text-sm font-medium">去购物车结算</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const shopData = {
  id: '1',
  name: '墨香阁文化',
  slogan: '传承国学经典，弘扬传统文化',
  description: '墨香阁专注于国学文化传播，提供命理、风水、书法等传统文化产品和服务。',
  rating: 4.9,
  reviewCount: 328,
  followerCount: 1256,
  productCount: 45,
  salesCount: 2680,
  isFollowed: false,
  phone: '400-888-8888',
  address: '北京市朝阳区建国路88号',
  businessHours: '09:00-21:00',
  level: '金牌商家',
  badges: ['品质保障', '极速发货', '7天无理由'],
  serviceScore: 4.9,
  logisticsScore: 4.8,
  qualityScore: 4.9,
}

interface Product {
  id: string
  title: string
  price: number
  originalPrice: number | null
  sales: number
  isHot?: boolean
  isNew?: boolean
}

const products = ref<Product[]>([
  { id: '1', title: '滴天髓精解 - 命理学经典著作精装版', price: 68, originalPrice: 98, sales: 328, isHot: true },
  { id: '2', title: '子平真诠评注 - 八字入门必读', price: 88, originalPrice: 128, sales: 215, isNew: true },
  { id: '3', title: '文房四宝套装 - 宣纸毛笔墨汁砚台', price: 268, originalPrice: 368, sales: 56 },
  { id: '4', title: '紫砂茶壶礼盒 - 宜兴原矿紫砂', price: 588, originalPrice: null, sales: 12 },
  { id: '5', title: '八字命理基础课 - 零基础入门', price: 199, originalPrice: 299, sales: 456, isHot: true },
  { id: '6', title: '毛笔书法入门套装 - 初学者专用', price: 128, originalPrice: 168, sales: 89, isNew: true },
  { id: '7', title: '易经全解 - 图文详注版', price: 78, originalPrice: 108, sales: 167 },
  { id: '8', title: '风水入门指南 - 居家布局必备', price: 58, originalPrice: 88, sales: 234 },
])

const sortTabs = [
  { key: 'default', label: '全部' },
  { key: 'sales', label: '热销' },
  { key: 'new', label: '新品' },
  { key: 'price-asc', label: '价格' },
]

const isFollowed = ref(false)
const searchQuery = ref('')
const sortBy = ref('default')

const sortedProducts = computed(() => {
  const list = [...products.value]
  if (sortBy.value === 'price-asc') list.sort((a, b) => a.price - b.price)
  else if (sortBy.value === 'price-desc') list.sort((a, b) => b.price - a.price)
  else if (sortBy.value === 'sales') list.sort((a, b) => b.sales - a.sales)
  return list
})

const filteredProducts = computed(() => {
  let list = sortedProducts.value
  if (sortBy.value === 'new') list = list.filter(p => p.isNew)
  else if (sortBy.value === 'sales') list = list.filter(p => p.isHot || p.sales > 200)
  if (searchQuery.value) {
    const kw = searchQuery.value.toLowerCase()
    list = list.filter(p => p.title.toLowerCase().includes(kw))
  }
  return list
})

function goProduct(id: string) {
  uni.navigateTo({ url: `/pages/shop/product/index?id=${id}` })
}

function goCart() {
  uni.navigateTo({ url: '/pages/shop/cart/index' })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
