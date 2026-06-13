<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 h-12">
        <view class="flex items-center gap-2">
          <view @click="goBack" class="p-1">
            <text class="text-xl text-foreground">←</text>
          </view>
          <text class="text-base font-semibold text-foreground">带货商品</text>
        </view>
        <view class="flex items-center gap-1 text-xs text-primary font-medium">
          <text>➕</text>
          <text>添加商品</text>
        </view>
      </view>
    </view>

    <view class="p-4 space-y-3">
      <!-- 搜索栏 -->
      <view class="relative">
        <text class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"></text>
        <input
          v-model="search"
          placeholder="搜索商品名称..."
          class="w-full pl-9 pr-3 py-2 text-sm bg-secondary border-0 rounded-lg"
          placeholder-style="color:#999"
        />
      </view>

      <!-- 状态筛选 -->
      <view class="flex gap-2">
        <view
          v-for="f in filters" :key="f.key"
          @click="filter = f.key"
          :class="['px-3 py-1.5 rounded-full text-xs font-medium', filter === f.key ? 'bg-primary text-white' : 'bg-secondary text-foreground']"
        >
          {{ f.label }}
        </view>
      </view>

      <!-- 统计 -->
      <text class="text-xs text-muted-foreground">共 {{ filtered.length }} 件商品</text>

      <!-- 空状态 -->
      <view v-if="filtered.length === 0" class="flex flex-col items-center justify-center py-16">
        <text class="text-5xl mb-3 opacity-30">📦</text>
        <text class="text-sm text-muted-foreground">暂无商品</text>
        <view class="mt-3 px-4 py-2 text-xs text-white bg-primary rounded-full">添加第一件商品</view>
      </view>

      <!-- 商品列表 -->
      <view v-else class="space-y-3">
        <view v-for="product in filtered" :key="product.id" class="bg-white rounded-xl p-3.5 border border-border">
          <view class="flex gap-3">
            <!-- 封面 -->
            <image :src="product.cover" mode="aspectFill" class="w-16 h-16 rounded-lg bg-secondary flex-shrink-0" />

            <!-- 信息 -->
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium text-foreground truncate block mb-1">{{ product.name }}</text>
              <text class="text-base font-bold text-primary">¥{{ product.price }}</text>
              <view class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <text>库存 {{ product.stock }}</text>
                <text>已售 {{ product.sold }}</text>
              </view>
            </view>

            <!-- 上架开关 -->
            <view class="flex flex-col items-end gap-2 flex-shrink-0">
              <view
                @click="toggleStatus(product.id)"
                :class="['relative w-10 h-5 rounded-full transition-colors', product.status === 'on' ? 'bg-green-500' : 'bg-[#E8E0D5]']"
              >
                <view :class="['absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', product.status === 'on' ? 'right-0.5' : 'left-0.5']" />
              </view>
              <text :class="['text-[10px] font-medium', product.status === 'on' ? 'text-green-500' : 'text-muted-foreground']">
                {{ product.status === 'on' ? '已上架' : '已下架' }}
              </text>
            </view>
          </view>

          <!-- 操作行 -->
          <view class="flex items-center gap-4 mt-3 pt-3 border-t border-border">
            <view class="flex items-center gap-1 text-xs text-muted-foreground">
              <text>›</text>
              <text>编辑</text>
            </view>
            <view @click="remove(product.id)" class="flex items-center gap-1 text-xs text-primary">
              <text>🗑️</text>
              <text>删除</text>
            </view>
            <text v-if="product.stock === 0" class="ml-auto text-xs text-primary font-medium">库存不足</text>
          </view>
        </view>
      </view>
    </view>

    <view class="h-8" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type Status = 'all' | 'on' | 'off'

const filter = ref<Status>('all')
const search = ref('')

const filters: { key: Status; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'on', label: '已上架' },
  { key: 'off', label: '已下架' },
]

interface Product {
  id: string; name: string; price: number; stock: number; sold: number; cover: string; status: 'on' | 'off'
}

const products = ref<Product[]>([
  { id: '1', name: '《渊海子平》精装典藏版', price: 168, stock: 200, sold: 86, cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&q=80', status: 'on' },
  { id: '2', name: '紫微斗数入门教程（平装）', price: 88, stock: 150, sold: 142, cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&q=80', status: 'on' },
  { id: '3', name: '八字命盘分析工具书', price: 128, stock: 0, sold: 320, cover: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=200&q=80', status: 'off' },
  { id: '4', name: '纯铜罗盘（专业款）', price: 480, stock: 15, sold: 28, cover: 'https://images.unsplash.com/photo-1518756131217-31eb79b20e8f?w=200&q=80', status: 'on' },
  { id: '5', name: '手抄本《周易参同契》', price: 240, stock: 8, sold: 45, cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&q=80', status: 'off' },
])

const filtered = computed(() => products.value.filter(p => {
  const matchFilter = filter.value === 'all' || p.status === filter.value
  const matchSearch = !search.value || p.name.includes(search.value)
  return matchFilter && matchSearch
}))

function toggleStatus(id: string) {
  products.value = products.value.map(p => p.id === id ? { ...p, status: p.status === 'on' ? 'off' as const : 'on' as const } : p)
}

function remove(id: string) {
  products.value = products.value.filter(p => p.id !== id)
}

function goBack() { uni.navigateBack() }
</script>
