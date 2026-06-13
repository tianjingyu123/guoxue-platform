<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center justify-between h-14 px-4">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1">
            <text class="text-xl text-foreground">←</text>
          </view>
          <text class="text-lg font-semibold">商品管理</text>
        </view>
        <view @click="goEdit()" class="px-3 py-1.5 bg-primary text-white rounded-lg text-sm flex items-center gap-1">
          <text>+</text>
          <text>发布商品</text>
        </view>
      </view>
    </view>

    <!-- 搜索和筛选 -->
    <view class="p-4 space-y-3">
      <view class="flex gap-2">
        <view class="relative flex-1">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
          <input v-model="searchQuery" placeholder="搜索商品名称" class="w-full pl-9 pr-3 py-2.5 bg-white rounded-xl text-sm border border-border" />
        </view>
        <view class="w-10 h-10 border border-border rounded-xl flex items-center justify-center" @click="showSortSheet = true">
          <text>🔽</text>
        </view>
      </view>

      <!-- 状态标签 -->
      <view class="flex gap-2">
        <view v-for="tab in statusTabs" :key="tab.key" @click="activeTab = tab.key" :class="['flex-1 py-2 rounded-full text-xs text-center font-medium', activeTab === tab.key ? 'bg-primary text-white' : 'bg-background text-ink-soft']">
          <text>{{ tab.label }}({{ tab.count }})</text>
        </view>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="px-4 space-y-3">
      <view v-for="product in filteredProducts" :key="product.id" class="bg-white rounded-2xl p-3">
        <view class="flex gap-3">
          <!-- 多选复选框 -->
          <view class="flex items-center shrink-0">
            <view @click="toggleSelect(product.id)" :class="['w-5 h-5 rounded border-2 flex items-center justify-center', selectedProducts.includes(product.id) ? 'bg-primary border-primary' : 'border-border']">
              <text v-if="selectedProducts.includes(product.id)" class="text-white text-xs">✓</text>
            </view>
          </view>
          <!-- 商品图片 -->
          <view class="w-20 h-20 rounded-xl bg-background flex items-center justify-center shrink-0 relative">
            <text class="text-2xl">📦</text>
          </view>

          <!-- 商品信息 -->
          <view class="flex-1 min-w-0">
            <view class="flex items-start justify-between gap-2">
              <text class="text-sm font-medium text-foreground line-clamp-2">{{ product.title }}</text>
              <view @click="toggleMenu(product.id)" class="relative w-7 h-7 flex items-center justify-center shrink-0">
                <text>⋯</text>
                <!-- 下拉菜单 -->
                <view v-if="openMenuId === product.id" class="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-border py-1 z-10 min-w-[120px]">
                  <view @click="goEdit(product.id)" class="flex items-center gap-2 px-3 py-2 text-sm">️ 查看详情</view>
                  <view @click="goEdit(product.id)" class="flex items-center gap-2 px-3 py-2 text-sm">✏️ 编辑商品</view>
                  <view class="flex items-center gap-2 px-3 py-2 text-sm">{{ product.status === 'online' ? '⬇️ 下架商品' : '⬆️ 上架商品' }}</view>
                  <view @click="handleDeleteClick(product)" class="flex items-center gap-2 px-3 py-2 text-sm text-red-500">🗑️ 删除商品</view>
                </view>
              </view>
            </view>

            <view class="flex items-center gap-2 mt-1">
              <text class="px-1.5 py-0.5 rounded text-[10px] bg-background">{{ product.category }}</text>
              <text :class="['px-1.5 py-0.5 rounded text-[10px]', statusConfig[product.status]?.color || '']">
                {{ statusConfig[product.status]?.label || '' }}
              </text>
            </view>

            <view class="flex items-center justify-between mt-2">
              <!-- 快捷编辑价格 -->
              <view v-if="editingProduct === product.id && editingField === 'price'" class="flex items-center gap-1">
                <text class="text-sm">¥</text>
                <input v-model="editValue" type="digit" class="w-20 h-7 text-sm bg-background rounded px-1" />
                <view @click="saveQuickEdit" class="w-5 h-5 flex items-center justify-center">
                  <text class="text-xs text-green-600">✓</text>
                </view>
                <view @click="cancelQuickEdit" class="w-5 h-5 flex items-center justify-center">
                  <text class="text-xs text-red-500">✕</text>
                </view>
              </view>
              <view v-else @click="startQuickEdit(product.id, 'price', product.price)" class="flex items-baseline gap-1">
                <text class="text-base font-bold text-primary">¥{{ product.price }}</text>
                <text v-if="product.originalPrice" class="text-xs text-muted-foreground line-through">¥{{ product.originalPrice }}</text>
              </view>
            </view>

            <view class="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
              <!-- 快捷编辑库存 -->
              <view v-if="editingProduct === product.id && editingField === 'stock'" class="flex items-center gap-1">
                <text>库存:</text>
                <input v-model="editValue" type="number" class="w-16 h-6 text-xs bg-background rounded px-1" />
                <view @click="saveQuickEdit" class="w-5 h-5 flex items-center justify-center">
                  <text class="text-xs text-green-600">✓</text>
                </view>
                <view @click="cancelQuickEdit" class="w-5 h-5 flex items-center justify-center">
                  <text class="text-xs text-red-500">✕</text>
                </view>
              </view>
              <view v-else @click="startQuickEdit(product.id, 'stock', product.stock)">
                库存: <text :class="product.stock === 0 ? 'text-red-500' : ''">{{ product.stock }}</text>
              </view>
              <text>销量: {{ product.sales }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="filteredProducts.length === 0" class="py-20 text-center">
        <text class="text-muted-foreground">暂无商品</text>
        <view @click="goEdit()" class="mt-4 px-6 py-2 bg-primary text-white rounded-full text-sm inline-block">发布第一个商品</view>
      </view>
    </view>

    <!-- 批量操作栏 -->
    <view v-if="selectedProducts.length > 0" class="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-border">
      <view class="flex items-center justify-between">
        <text class="text-sm text-muted-foreground">已选择 {{ selectedProducts.length }} 件商品</text>
        <view class="flex gap-2">
          <view class="px-3 py-1.5 border border-border rounded-lg text-xs">批量下架</view>
          <view class="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs">批量删除</view>
        </view>
      </view>
    </view>

    <!-- 删除确认弹窗 -->
    <view v-if="deleteDialogOpen" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <view class="bg-white rounded-2xl w-[320px] p-6">
        <text class="text-lg font-semibold block mb-2">确认删除商品？</text>
        <text class="text-sm text-muted-foreground block mb-4">您即将删除商品「{{ deleteTarget?.title }}」，删除后将无法恢复。确定要继续吗？</text>
        <view class="flex gap-3">
          <view @click="deleteDialogOpen = false" :class="['flex-1 py-3 rounded-xl text-center text-sm font-medium border border-border', isDeleting ? 'opacity-50' : '']">取消</view>
          <view @click="handleDeleteConfirm" :class="['flex-1 py-3 rounded-xl text-center text-sm font-medium bg-red-500 text-white', isDeleting ? 'opacity-50' : '']">
            <text>{{ isDeleting ? '删除中...' : '确认删除' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 排序底部弹窗 -->
    <view v-if="showSortSheet" class="fixed inset-0 z-50 bg-black/50" @click="showSortSheet = false">
      <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl" @click.stop>
        <view class="px-4 py-3 border-b border-border">
          <text class="font-semibold text-center block">排序方式</text>
        </view>
        <view class="p-4 space-y-2">
          <view v-for="opt in sortOptions" :key="opt.key"
            class="w-full flex items-center justify-between p-3 rounded-xl"
            :class="sortBy === opt.key ? 'bg-primary/10' : 'bg-secondary'"
            @click="sortBy = opt.key; showSortSheet = false">
            <text class="text-sm" :class="sortBy === opt.key ? 'text-primary font-medium' : 'text-foreground'">{{ opt.label }}</text>
            <text v-if="sortBy === opt.key" class="text-primary">✓</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Product {
  id: string
  title: string
  image: string
  price: number
  originalPrice: number | null
  stock: number
  sales: number
  status: string
  category: string
  createdAt: string
}

const products: Product[] = [
  { id: '1', title: '滴天髓精解', image: '', price: 68, originalPrice: 98, stock: 156, sales: 328, status: 'online', category: '命理书籍', createdAt: '2024-01-15' },
  { id: '2', title: '子平真诠评注', image: '', price: 88, originalPrice: 128, stock: 89, sales: 215, status: 'online', category: '命理书籍', createdAt: '2024-01-10' },
  { id: '3', title: '文房四宝套装', image: '', price: 268, originalPrice: 368, stock: 0, sales: 56, status: 'soldout', category: '文房用品', createdAt: '2024-01-08' },
  { id: '4', title: '紫砂茶壶礼盒', image: '', price: 588, originalPrice: null, stock: 23, sales: 12, status: 'offline', category: '茶道用品', createdAt: '2024-01-05' },
  { id: '5', title: '八字命理基础课', image: '', price: 199, originalPrice: 299, stock: 999, sales: 456, status: 'online', category: '在线课程', createdAt: '2024-01-01' },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  online: { label: '已上架', color: 'bg-green-100 text-green-700' },
  offline: { label: '已下架', color: 'bg-gray-100 text-gray-700' },
  soldout: { label: '已售罄', color: 'bg-red-100 text-red-700' },
  pending: { label: '审核中', color: 'bg-amber-100 text-amber-700' },
}

const activeTab = ref('all')
const searchQuery = ref('')
const selectedProducts = ref<string[]>([])
const openMenuId = ref<string | null>(null)
const showSortSheet = ref(false)
const sortBy = ref('default')
const sortOptions = [
  { key: 'default', label: '默认排序' },
  { key: 'price_asc', label: '价格从低到高' },
  { key: 'price_desc', label: '价格从高到低' },
  { key: 'sales', label: '按销量排序' },
]

// 删除弹窗
const deleteDialogOpen = ref(false)
const deleteTarget = ref<{ id: string; title: string } | null>(null)
const isDeleting = ref(false)

// 快捷编辑
const editingProduct = ref<string | null>(null)
const editingField = ref<'price' | 'stock' | null>(null)
const editValue = ref('')
const isSaving = ref(false)

const statusTabs = computed(() => {
  const stats = {
    all: products.length,
    online: products.filter(p => p.status === 'online').length,
    offline: products.filter(p => p.status === 'offline').length,
    soldout: products.filter(p => p.status === 'soldout').length,
  }
  return [
    { key: 'all', label: '全部', count: stats.all },
    { key: 'online', label: '已上架', count: stats.online },
    { key: 'offline', label: '已下架', count: stats.offline },
    { key: 'soldout', label: '已售罄', count: stats.soldout },
  ]
})

const filteredProducts = computed(() => {
  let list = products.filter(p => {
    if (activeTab.value !== 'all' && p.status !== activeTab.value) return false
    if (searchQuery.value && !p.title.includes(searchQuery.value)) return false
    return true
  })
  if (sortBy.value === 'price_asc') list = [...list].sort((a, b) => a.price - b.price)
  else if (sortBy.value === 'price_desc') list = [...list].sort((a, b) => b.price - a.price)
  else if (sortBy.value === 'sales') list = [...list].sort((a, b) => b.sales - a.sales)
  return list
})

function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id
}

function toggleSelect(id: string) {
  selectedProducts.value = selectedProducts.value.includes(id)
    ? selectedProducts.value.filter(p => p !== id)
    : [...selectedProducts.value, id]
}

function handleDeleteClick(product: Product) {
  openMenuId.value = null
  deleteTarget.value = { id: product.id, title: product.title }
  deleteDialogOpen.value = true
}

async function handleDeleteConfirm() {
  if (!deleteTarget.value) return
  isDeleting.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))
  isDeleting.value = false
  deleteDialogOpen.value = false
  deleteTarget.value = null
}

function startQuickEdit(productId: string, field: 'price' | 'stock', currentValue: number) {
  editingProduct.value = productId
  editingField.value = field
  editValue.value = String(currentValue)
  openMenuId.value = null
}

function cancelQuickEdit() {
  editingProduct.value = null
  editingField.value = null
  editValue.value = ''
}

async function saveQuickEdit() {
  if (!editingProduct.value || !editingField.value) return
  isSaving.value = true
  await new Promise(resolve => setTimeout(resolve, 800))
  isSaving.value = false
  cancelQuickEdit()
  uni.showToast({ title: '修改成功', icon: 'success' })
}

function goEdit(id?: string) {
  const url = id ? `/pages/merchant/product-edit/index?id=${id}` : '/pages/merchant/product-edit/index'
  uni.navigateTo({ url })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
