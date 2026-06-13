<template>
<view class="min-h-screen bg-background max-w-lg mx-auto">
  <!-- 加载态 -->
  <view v-if="isLoading">
    <view class="sticky top-0 z-50 bg-background/95 border-b border-border">
      <view class="flex items-center justify-between h-12 px-4">
        <view @click="goBack" class="p-2 -ml-2">
          <text class="text-xl text-foreground">‹</text>
        </view>
        <text class="font-semibold text-base text-foreground">购物车</text>
        <view class="w-9" />
      </view>
    </view>
    <view class="space-y-4 p-4">
      <view v-for="g in 2" :key="g" class="bg-white rounded-xl p-4 animate-pulse">
        <view class="flex items-center gap-3 mb-4">
          <view class="w-6 h-6 rounded-full bg-secondary" />
          <view class="h-4 w-24 bg-secondary rounded" />
        </view>
        <view v-for="j in 2" :key="j" class="flex gap-3 py-3 border-t border-border/50">
          <view class="w-5 h-5 rounded bg-secondary" />
          <view class="w-20 h-20 rounded-lg bg-secondary" />
          <view class="flex-1 space-y-2">
            <view class="h-4 w-3/4 bg-secondary rounded" />
            <view class="h-3 w-1/2 bg-secondary rounded" />
            <view class="h-4 w-16 bg-secondary rounded" />
          </view>
        </view>
      </view>
    </view>
  </view>

  <!-- 空状态 -->
  <view v-else-if="isEmpty || groups.length === 0">
    <view class="sticky top-0 z-50 bg-background/95 border-b border-border">
      <view class="flex items-center justify-between h-12 px-4">
        <view @click="goBack" class="p-2 -ml-2">
          <text class="text-xl text-foreground">‹</text>
        </view>
        <text class="font-semibold text-base text-foreground">购物车</text>
        <view class="w-9" />
      </view>
    </view>
    <view class="flex flex-col items-center justify-center py-20 px-4">
      <view class="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
        <text class="text-5xl text-muted-foreground/50"></text>
      </view>
      <text class="text-lg font-medium text-foreground mb-1">购物车是空的</text>
      <text class="text-sm text-muted-foreground mb-6">快去挑选心仪的商品吧</text>
      <view @click="goTo('/pages/discover/index')" class="px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-full">
        去逛逛
      </view>

      <!-- 热门推荐 -->
      <view class="w-full mt-10">
        <view class="flex items-center justify-between mb-3">
          <text class="text-sm font-medium text-foreground">热门推荐</text>
          <text @click="goTo('/pages/mall/index')" class="text-xs text-primary">更多</text>
        </view>
        <view class="grid grid-cols-2 gap-3">
          <view v-for="product in recommendProducts.slice(0, 4)" :key="product.id" @click="goTo('/pages/mall/product/id-detail/index?id=' + product.id)" class="bg-white rounded-xl p-3 shadow-sm">
            <view class="aspect-square rounded-lg bg-secondary mb-2 flex items-center justify-center">
              <text class="text-3xl text-muted-foreground/30"></text>
            </view>
            <text class="text-sm text-foreground line-clamp-1">{{ product.name }}</text>
            <text class="text-sm text-primary font-medium mt-1">¥{{ product.price }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>

  <!-- 购物车内容 -->
  <view v-else>
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-background/95 border-b border-border">
      <view class="flex items-center justify-between h-12 px-4">
        <view @click="goBack" class="p-2 -ml-2">
          <text class="text-xl text-foreground">‹</text>
        </view>
        <text class="font-semibold text-base text-foreground">购物车({{ count }})</text>
        <view @tap="isEditing = !isEditing" class="text-sm text-primary font-medium">{{ isEditing ? '完成' : '编辑' }}</view>
      </view>
    </view>

    <!-- 优惠提示 -->
    <view v-if="saved > 0 && !isEditing" class="mx-4 mt-3 px-3 py-2 bg-primary/10 rounded-lg flex items-center justify-between">
      <text class="text-xs text-primary">已为您节省 ¥{{ saved.toFixed(2) }}</text>
      <text @click="goTo('/pages/coupons/index')" class="text-xs text-primary flex items-center">领更多优惠券 ›</text>
    </view>

    <!-- 商品列表 -->
    <view class="p-4 space-y-4" style="padding-bottom: 120px;">
      <view v-for="group in groups" :key="group.id" class="bg-white rounded-xl p-4 shadow-sm">
        <!-- 店铺信息 -->
        <view class="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
          <view class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <text class="text-[10px] text-primary">{{ group.sellerName[0] }}</text>
          </view>
          <text class="text-sm font-medium text-foreground">{{ group.sellerName }}</text>
          <text class="text-[10px] px-1.5 py-0 border border-border text-muted-foreground rounded">
            {{ group.sellerType === 'circle' ? '圈子' : '驿站' }}
          </text>
          <text class="text-muted-foreground ml-auto">›</text>
        </view>

        <!-- 商品列表 -->
        <view class="space-y-3">
          <view v-for="item in group.items" :key="item.id" class="flex gap-3">
            <!-- 选择框/删除按钮 -->
            <view v-if="isEditing" @tap="removeItem(group.id, item.id)" class="flex-shrink-0 w-5 h-5 mt-7">
              <text class="text-danger text-lg">🗑</text>
            </view>
            <view v-else @tap="toggleItem(item.id)" :class="['flex-shrink-0 w-5 h-5 mt-7 rounded-full border-2 flex items-center justify-center', selectedItems.has(item.id) ? 'bg-primary border-primary' : 'border-[#999]/30']">
              <text v-if="selectedItems.has(item.id)" class="text-xs text-white">✓</text>
            </view>

            <!-- 商品图片 -->
            <view class="w-20 h-20 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
              <image :src="item.image" mode="aspectFill" class="w-full h-full"></image>
            </view>

            <!-- 商品信息 -->
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium text-foreground line-clamp-1">{{ item.name }}</text>
              <text class="text-xs text-muted-foreground mt-0.5 block">{{ item.spec }}</text>
              <view class="flex items-center justify-between mt-2">
                <view class="flex items-baseline gap-1.5">
                  <text class="text-base font-semibold text-primary">¥{{ item.price }}</text>
                  <text v-if="item.originalPrice > item.price" class="text-xs text-muted-foreground line-through">¥{{ item.originalPrice }}</text>
                </view>
                <!-- 数量控制 -->
                <view v-if="item.type === 'product'" class="flex items-center gap-2 bg-secondary rounded-full">
                  <view @tap="updateQuantity(group.id, item.id, -1)" :class="['w-7 h-7 flex items-center justify-center', item.quantity <= 1 ? 'text-[#ccc]' : 'text-muted-foreground']">-</view>
                  <text class="text-sm font-medium text-foreground w-5 text-center">{{ item.quantity }}</text>
                  <view @tap="updateQuantity(group.id, item.id, 1)" class="w-7 h-7 flex items-center justify-center text-muted-foreground">+</view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 凑单提示 -->
        <view v-if="getGroupDiff(group) > 0 && getGroupTotal(group) > 0" class="mt-3 px-3 py-2 bg-accent/10 rounded-lg flex items-center justify-between">
          <text class="text-xs text-accent">再买 <text class="font-medium">¥{{ getGroupDiff(group) }}</text> 即可享受包邮</text>
          <text @click="goTo('/pages/mall/index')" class="text-xs text-accent font-medium">去凑单 ›</text>
        </view>

        <!-- 店铺小计 -->
        <view class="mt-3 pt-3 border-t border-border/50 flex justify-end">
          <text class="text-xs text-muted-foreground">
            小计：<text class="text-sm font-semibold text-foreground ml-1">¥{{ getGroupTotal(group).toFixed(2) }}</text>
          </text>
        </view>
      </view>

      <!-- 失效商品 -->
      <view v-if="invalidItems.length > 0" class="bg-white/60 rounded-xl p-4 border border-dashed border-border">
        <view class="flex items-center justify-between mb-3">
          <text class="text-sm text-muted-foreground">失效商品({{ invalidItems.length }})</text>
          <text class="text-xs text-danger">清空</text>
        </view>
        <view class="space-y-3 opacity-60">
          <view v-for="item in invalidItems" :key="item.id" class="flex gap-3">
            <view class="w-16 h-16 rounded-lg bg-secondary flex-shrink-0 overflow-hidden relative">
              <image :src="item.image" mode="aspectFill" class="w-full h-full grayscale"></image>
              <view class="absolute inset-0 bg-black/30 flex items-center justify-center">
                <text class="text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded">失效</text>
              </view>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-muted-foreground line-clamp-1">{{ item.name }}</text>
              <text class="text-xs text-danger mt-0.5 block">{{ item.reason }}</text>
              <text class="text-xs text-muted-foreground line-through mt-1 block">¥{{ item.price }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 猜你喜欢 -->
      <view class="mt-2">
        <text class="text-sm font-medium text-foreground block mb-3">为你推荐</text>
        <scroll-view scroll-x class="flex gap-3 pb-2">
          <view v-for="product in recommendProducts" :key="product.id" @click="goTo('/pages/mall/product/id-detail/index?id=' + product.id)" class="flex-shrink-0 w-28">
            <view class="bg-white rounded-xl p-2 shadow-sm">
              <view class="aspect-square rounded-lg bg-secondary mb-2 overflow-hidden flex items-center justify-center">
                <text class="text-2xl text-muted-foreground/30">📦</text>
              </view>
              <text class="text-xs text-foreground line-clamp-1 block">{{ product.name }}</text>
              <text class="text-xs text-primary font-medium mt-0.5 block">¥{{ product.price }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 底部结算栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-border z-40" style="padding-bottom: env(safe-area-inset-bottom, 0);">
      <view class="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <view class="flex items-center gap-2">
          <!-- 全选 -->
          <view @click="handleSelectAll" class="flex items-center gap-2">
            <view :class="['w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors', isAllSelected() ? 'bg-primary border-primary' : 'border-[#999]/30']">
              <text v-if="isAllSelected()" class="text-xs text-white">✓</text>
            </view>
            <text class="text-sm text-foreground">全选</text>
          </view>
        </view>

        <view v-if="isEditing">
          <view @click="removeSelected" :class="['px-6 py-2 rounded-full text-sm font-medium transition-colors', selectedItems.size > 0 ? 'bg-danger text-white' : 'bg-secondary text-muted-foreground']">
            删除({{ selectedItems.size }})
          </view>
        </view>

        <view v-else class="flex items-center gap-4">
          <view class="text-right">
            <view class="flex items-baseline gap-1">
              <text class="text-xs text-muted-foreground">合计:</text>
              <text class="text-lg font-bold text-primary">¥{{ total.toFixed(2) }}</text>
            </view>
            <text v-if="saved > 0" class="text-[10px] text-muted-foreground line-through block text-right">¥{{ originalTotal.toFixed(2) }}</text>
          </view>
          <view @click="handleCheckout" :class="['px-6 py-2 rounded-full text-sm font-medium transition-colors', selectedItems.size > 0 ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground']">
            结算({{ count }})
          </view>
        </view>
      </view>
    </view>
  </view>
</view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 导航辅助
function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

// 模拟购物车数据
const cartGroups = [
  {
    id: 1,
    sellerName: '易道书院',
    sellerAvatar: '',
    sellerType: 'circle',
    freeShippingThreshold: 199,
    items: [
      { id: 1, name: '《渊海子平》精装典藏版', spec: '精装版 / 全三册', price: 168, originalPrice: 298, quantity: 1, image: '', type: 'product' },
      { id: 2, name: '八字命理入门到精通', spec: '视频课程 / 共36节', price: 299, originalPrice: 599, quantity: 1, image: '', type: 'course' },
    ]
  },
  {
    id: 2,
    sellerName: '玄学文创旗舰店',
    sellerAvatar: '',
    sellerType: 'store',
    freeShippingThreshold: 99,
    items: [
      { id: 3, name: '天然黑曜石貔貅手链', spec: '14mm / 男款', price: 128, originalPrice: 199, quantity: 2, image: '', type: 'product' },
    ]
  }
]

const invalidItems = [
  { id: 101, name: '限量版紫水晶摆件', spec: '已下架', price: 388, image: '', reason: '商品已下架' }
]

const recommendProducts = [
  { id: 1, name: '紫微斗数全书', price: 88, image: '' },
  { id: 2, name: '开光铜钱挂件', price: 68, image: '' },
  { id: 3, name: '风水罗盘专业版', price: 268, image: '' },
  { id: 4, name: '命理学基础课', price: 199, image: '' },
]

const isLoading = ref(true)
const isEditing = ref(false)
const groups = ref(cartGroups)
const selectedItems = ref<Set<number>>(new Set())
const isEmpty = ref(false)

onMounted(() => {
  const timer = setTimeout(() => {
    isLoading.value = false
    const allIds = new Set<number>()
    groups.value.forEach(g => g.items.forEach(item => allIds.add(item.id)))
    selectedItems.value = allIds
  }, 1000)
})

// 计算总价（computed 确保响应式）
const totalData = computed(() => {
  let total = 0
  let originalTotal = 0
  let count = 0
  const selSet = selectedItems.value
  groups.value.forEach(group => {
    group.items.forEach(item => {
      if (selSet.has(item.id)) {
        total += item.price * item.quantity
        originalTotal += item.originalPrice * item.quantity
        count += item.quantity
      }
    })
  })
  return { total, originalTotal, count, saved: originalTotal - total }
})

const total = computed(() => totalData.value.total)
const originalTotal = computed(() => totalData.value.originalTotal)
const count = computed(() => totalData.value.count)
const saved = computed(() => totalData.value.saved)

// 全选/取消全选
function handleSelectAll() {
  if (isAllSelected()) {
    selectedItems.value = new Set()
  } else {
    const allIds = new Set<number>()
    groups.value.forEach(g => g.items.forEach(item => allIds.add(item.id)))
    selectedItems.value = allIds
  }
}

function isAllSelected() {
  let totalItems = 0
  groups.value.forEach(g => totalItems += g.items.length)
  return selectedItems.value.size === totalItems && totalItems > 0
}

// 切换选中状态
function toggleItem(id: number) {
  const newSelected = new Set(selectedItems.value)
  if (newSelected.has(id)) {
    newSelected.delete(id)
  } else {
    newSelected.add(id)
  }
  selectedItems.value = newSelected
}

// 修改数量
function updateQuantity(groupId: number, itemId: number, delta: number) {
  groups.value = groups.value.map(group => {
    if (group.id === groupId) {
      return {
        ...group,
        items: group.items.map(item => {
          if (item.id === itemId) {
            const newQty = Math.max(1, item.quantity + delta)
            return { ...item, quantity: newQty }
          }
          return item
        })
      }
    }
    return group
  })
}

// 删除商品
function removeItem(groupId: number, itemId: number) {
  groups.value = groups.value.map(group => {
    if (group.id === groupId) {
      return { ...group, items: group.items.filter(item => item.id !== itemId) }
    }
    return group
  }).filter(group => group.items.length > 0)

  const newSelected = new Set(selectedItems.value)
  newSelected.delete(itemId)
  selectedItems.value = newSelected

  if (groups.value.length === 0) {
    isEmpty.value = true
  }
}

// 批量删除
function removeSelected() {
  groups.value = groups.value.map(group => ({
    ...group,
    items: group.items.filter(item => !selectedItems.value.has(item.id))
  })).filter(group => group.items.length > 0)

  selectedItems.value = new Set()
  isEditing.value = false

  if (groups.value.length === 0) {
    isEmpty.value = true
  }
}

// 结算
function handleCheckout() {
  if (selectedItems.value.size === 0) return
  uni.navigateTo({ url: '/pages/checkout/index' })
}

// 店铺小计
function getGroupTotal(group: typeof cartGroups[0]) {
  return group.items.reduce((sum, item) =>
    selectedItems.value.has(item.id) ? sum + item.price * item.quantity : sum, 0
  )
}

// 凑单差额
function getGroupDiff(group: typeof cartGroups[0]) {
  const gt = getGroupTotal(group)
  const threshold = group.freeShippingThreshold || 0
  return threshold - gt
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
