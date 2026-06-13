<template>
  <view class="min-h-screen bg-background">
    <!-- 加载骨架屏 -->
    <view v-if="loading" class="p-4 space-y-4">
      <view class="h-12 bg-muted rounded-lg" />
      <view class="h-24 bg-muted rounded-xl" />
      <view v-for="i in 3" :key="i" class="h-28 bg-muted rounded-xl" />
    </view>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-10 bg-white border-b border-border">
        <view class="flex items-center justify-between px-4 h-12">
          <view @click="goBack" class="p-1"><text class="text-xl text-foreground">←</text></view>
          <text class="text-lg font-semibold text-foreground">商品橱窗</text>
          <view @click="addProduct" class="p-1"><text class="text-xl text-primary"></text></view>
        </view>
      </view>

      <!-- 统计卡片 -->
      <view class="mx-4 mt-4">
        <view class="bg-gradient-to-r from-primary to-[#A01530] rounded-2xl p-5 text-white">
          <view class="flex items-center justify-between mb-3">
            <text class="text-sm opacity-80">我的商品概览</text>
            <text class="text-xs opacity-60">本月数据</text>
          </view>
          <view class="grid grid-cols-3 gap-3">
            <view class="text-center">
              <text class="text-xl font-bold block">{{ productList.length }}</text>
              <text class="text-[11px] text-white/70">在售商品</text>
            </view>
            <view class="text-center">
              <text class="text-xl font-bold block">{{ totalSales }}</text>
              <text class="text-[11px] text-white/70">总销量</text>
            </view>
            <view class="text-center">
              <text class="text-xl font-bold block">¥{{ totalRevenue }}</text>
              <text class="text-[11px] text-white/70">总收益</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 商品列表 -->
      <view class="px-4 mt-4 pb-24 space-y-3">
        <view class="flex items-center justify-between mb-2">
          <text class="text-sm font-semibold text-foreground">商品管理</text>
          <view class="flex gap-2">
            <text
              @click="showOnlineOnly = !showOnlineOnly"
              :class="['px-2.5 py-1 rounded text-xs', showOnlineOnly ? 'bg-primary/10 text-primary' : 'text-muted-foreground']"
            >
              仅展示在售
            </text>
          </view>
        </view>

        <view v-for="product in displayList" :key="product.id" class="bg-white rounded-xl p-3.5 border border-border">
          <view class="flex gap-3">
            <view class="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0 text-3xl">
              {{ product.emoji }}
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-start justify-between gap-1">
                <text class="font-medium text-sm text-foreground line-clamp-1 flex-1">{{ product.name }}</text>
                <text
                  :class="['text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0', product.status === 'on' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500']"
                >
                  {{ product.status === 'on' ? '在售' : '已下架' }}
                </text>
              </view>
              <view class="flex items-center gap-2 mt-1.5">
                <text class="text-primary font-bold text-base">¥{{ product.price }}</text>
                <text class="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{{ product.commission }}%佣金</text>
              </view>
              <view class="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                <text>销量 {{ product.sales }}</text>
                <text>库存 {{ product.stock }}</text>
              </view>
            </view>
          </view>
          <!-- 操作按钮 -->
          <view class="flex gap-2 mt-3 pt-3 border-t border-[#F0EBE5]">
            <view @click="toggleStatus(product)" class="flex-1 py-1.5 rounded-lg text-xs text-center font-medium" :class="product.status === 'on' ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-600'">
              {{ product.status === 'on' ? '下架' : '上架' }}
            </view>
            <view @click="editProduct(product)" class="flex-1 py-1.5 rounded-lg bg-primary/10 text-primary text-xs text-center font-medium">
              编辑
            </view>
            <view @click="deleteProduct(product)" class="flex-1 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs text-center font-medium">
              删除
            </view>
          </view>
        </view>

        <!-- 添加商品入口 -->
        <view @click="addProduct" class="bg-white rounded-xl p-4 border border-dashed border-border flex items-center justify-center gap-2">
          <text class="text-2xl text-primary">+</text>
          <text class="text-sm text-primary font-medium">添加新商品</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)

onMounted(() => {
  setTimeout(() => { loading.value = false }, 500)
})

interface Product {
  id: string
  name: string
  price: number
  sales: number
  commission: number
  stock: number
  status: 'on' | 'off'
  emoji: string
}

const productList = ref<Product[]>([
  { id: 'p1', name: '八字命理学入门书籍', price: 68, sales: 128, commission: 10, stock: 500, status: 'on', emoji: '' },
  { id: 'p2', name: '招财貔貅摆件', price: 298, sales: 256, commission: 15, stock: 200, status: 'on', emoji: '🦁' },
  { id: 'p3', name: '五帝钱挂件', price: 128, sales: 89, commission: 12, stock: 350, status: 'on', emoji: '' },
  { id: 'p4', name: '姓名学全解', price: 88, sales: 184, commission: 10, stock: 800, status: 'on', emoji: '' },
  { id: 'p5', name: '罗盘风水指南针', price: 368, sales: 67, commission: 20, stock: 120, status: 'off', emoji: '🧭' },
  { id: 'p6', name: '国学经典诵读全集', price: 168, sales: 312, commission: 10, stock: 600, status: 'on', emoji: '📜' },
])

const showOnlineOnly = ref(false)

const displayList = computed(() =>
  showOnlineOnly.value ? productList.value.filter(p => p.status === 'on') : productList.value
)

const totalSales = computed(() => productList.value.reduce((sum, p) => sum + p.sales, 0))
const totalRevenue = computed(() =>
  productList.value.reduce((sum, p) => sum + p.sales * p.price * p.commission / 100, 0).toFixed(0)
)

function goBack() { uni.navigateBack() }

function addProduct() {
  uni.showToast({ title: '添加商品（Mock）', icon: 'none' })
}

function editProduct(product: Product) {
  uni.showToast({ title: '编辑: ' + product.name, icon: 'none' })
}

function deleteProduct(product: Product) {
  uni.showModal({
    title: '删除商品',
    content: '确定要删除「' + product.name + '」吗？',
    success: (res) => {
      if (res.confirm) {
        const idx = productList.value.indexOf(product)
        if (idx > -1) productList.value.splice(idx, 1)
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    }
  })
}

function toggleStatus(product: Product) {
  product.status = product.status === 'on' ? 'off' : 'on'
  uni.showToast({ title: product.status === 'on' ? '已上架' : '已下架', icon: 'success' })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
