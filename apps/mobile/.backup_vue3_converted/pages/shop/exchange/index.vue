<template>
  <!-- 骨架屏 -->
  <view v-if="loading" class="min-h-screen bg-background">
    <view class="sticky top-0 z-10 bg-white px-4 py-3" style="border-bottom: 1px solid #E8E0D5;">
      <view class="w-24 h-5 bg-gray-200 rounded animate-pulse mx-auto" />
    </view>
    <view class="p-4 space-y-4">
      <view v-for="i in 3" :key="i" class="bg-white rounded-2xl p-4 animate-pulse">
        <view class="h-20 bg-gray-200 rounded" />
      </view>
    </view>
  </view>

  <!-- 主内容 -->
  <view v-else class="min-h-screen bg-background pb-24">
    <!-- Header -->
    <view class="sticky top-0 z-10 bg-white px-4 py-3 flex items-center gap-3" style="border-bottom: 1px solid #E8E0D5;">
      <view @click="goBack" class="p-1 -ml-1">
        <text class="text-lg text-foreground">←</text>
      </view>
      <text class="flex-1 text-center font-semibold text-foreground">申请换货</text>
      <view class="w-6" />
    </view>

    <view class="p-4 space-y-4">
      <!-- 选择换货商品 -->
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-lg text-primary">📦</text>
          <text class="font-medium text-foreground">选择换货商品</text>
          <text v-if="errors.product" class="text-xs text-red-500 ml-auto">{{ errors.product }}</text>
        </view>
        <view class="space-y-3">
          <view
            v-for="product in products"
            :key="product.id"
            @click="selectedProduct = product; newSkuId = ''"
            :class="['flex gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all', selectedProduct?.id === product.id ? 'border-primary bg-red-50' : 'border-border']"
          >
            <view class="relative">
              <image :src="product.cover" :alt="product.name" class="w-16 h-16 rounded-lg" mode="aspectFill" />
              <view v-if="selectedProduct?.id === product.id" class="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <text class="text-white text-xs">✓</text>
              </view>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground line-clamp-1 block">{{ product.name }}</text>
              <text class="text-xs text-muted-foreground mt-1 block">{{ product.skuName }}</text>
              <view class="flex items-center justify-between mt-1">
                <text class="text-primary font-semibold">¥{{ product.price }}</text>
                <text class="text-xs text-muted-foreground">x{{ product.quantity }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 换货原因 -->
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <view class="flex items-center justify-between" @click="showReasonPicker = true">
          <view class="flex items-center gap-2">
            <text class="text-foreground">换货原因</text>
            <text v-if="errors.reason" class="text-xs text-red-500">{{ errors.reason }}</text>
          </view>
          <view class="flex items-center gap-2">
            <text :class="[reason ? 'text-foreground' : 'text-muted-foreground']">{{ reason ? exchangeReasons.find(r => r.value === reason)?.label : '请选择' }}</text>
            <text class="text-sm text-[#CCCCCC]">›</text>
          </view>
        </view>
      </view>

      <!-- 换货类型 -->
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-lg text-primary"></text>
          <text class="font-medium text-foreground">换货类型</text>
        </view>
        <view class="grid grid-cols-2 gap-3">
          <view
            v-for="type in exchangeTypes"
            :key="type.value"
            @click="exchangeType = type.value; newSkuId = ''"
            :class="['p-3 rounded-xl border-2 cursor-pointer transition-all', exchangeType === type.value ? 'border-primary bg-red-50' : 'border-border']"
          >
            <view class="flex items-center gap-2">
              <view :class="['w-4 h-4 rounded-full border-2 flex items-center justify-center', exchangeType === type.value ? 'border-primary' : 'border-[#CCCCCC]']">
                <view v-if="exchangeType === type.value" class="w-2 h-2 rounded-full bg-primary" />
              </view>
              <text class="text-sm font-medium text-foreground">{{ type.label }}</text>
            </view>
            <text class="text-xs text-muted-foreground mt-1 ml-6 block">{{ type.desc }}</text>
          </view>
        </view>

        <!-- 新规格选择 -->
        <view v-if="exchangeType === 'different' && selectedProduct" class="mt-4 pt-4" style="border-top: 1px solid #E8E0D5;">
          <view class="flex items-center justify-between mb-3">
            <text class="text-sm text-ink-soft">选择新规格</text>
            <text v-if="errors.sku" class="text-xs text-red-500">{{ errors.sku }}</text>
          </view>
          <view v-if="availableSkus.length > 0" class="flex flex-wrap gap-2">
            <view
              v-for="sku in availableSkus"
              :key="sku.id"
              @click="newSkuId = sku.id"
              :class="['px-3 py-2 rounded-lg text-sm border-2 transition-all', newSkuId === sku.id ? 'border-primary bg-red-50 text-primary' : 'border-border text-ink-soft']"
            >
              <text>{{ sku.name }} ¥{{ sku.price }}</text>
            </view>
          </view>
          <view v-else class="text-sm text-muted-foreground">该商品暂无其他可换规格</view>
        </view>
      </view>

      <!-- 问题描述 -->
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <text class="font-medium text-foreground mb-3 block">问题描述（选填）</text>
        <textarea
          v-model="description"
          placeholder="请详细描述换货原因，以便我们更好处理..."
          class="w-full h-24 p-3 bg-background rounded-xl text-sm text-foreground placeholder:text-muted-foreground resize-none"
          maxlength="200"
          style="border: none;"
        />
        <view class="text-right text-xs text-muted-foreground mt-1">{{ description.length }}/200</view>
      </view>

      <!-- 上传凭证 -->
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <text class="font-medium text-foreground mb-3 block">上传凭证（选填，最多5张）</text>
        <view class="flex flex-wrap gap-3">
          <view v-for="(img, index) in images" :key="index" class="relative w-20 h-20">
            <image :src="img" class="w-full h-full rounded-lg" mode="aspectFill" />
            <view @click="removeImage(index)" class="absolute -top-2 -right-2 w-5 h-5 bg-foreground rounded-full flex items-center justify-center">
              <text class="text-white text-xs">✕</text>
            </view>
          </view>
          <view v-if="images.length < 5" @click="handleImageUpload" class="w-20 h-20 bg-background rounded-lg flex flex-col items-center justify-center gap-1" style="border: 2px dashed #E8E0D5;">
            <text class="text-base text-muted-foreground"></text>
            <text class="text-xs text-muted-foreground">{{ images.length }}/5</text>
          </view>
        </view>
      </view>

      <!-- 取件地址 -->
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-lg text-primary">📍</text>
          <text class="font-medium text-foreground">取件地址</text>
          <text v-if="errors.address" class="text-xs text-red-500 ml-auto">{{ errors.address }}</text>
        </view>
        <view v-if="selectedAddress" @click="showAddressPicker = true" class="flex items-center gap-3 p-3 bg-background rounded-xl cursor-pointer">
          <view class="flex-1">
            <view class="flex items-center gap-2">
              <text class="font-medium text-foreground">{{ selectedAddress.name }}</text>
              <text class="text-ink-soft">{{ selectedAddress.phone }}</text>
            </view>
            <text class="text-sm text-ink-soft mt-1 block">{{ selectedAddress.province }}{{ selectedAddress.city }}{{ selectedAddress.district }}{{ selectedAddress.address }}</text>
          </view>
          <text class="text-sm text-[#CCCCCC]">›</text>
        </view>
        <view v-else @click="showAddressPicker = true" class="w-full py-3 bg-background rounded-xl text-muted-foreground text-sm text-center">
          请选择取件地址
        </view>
      </view>

      <!-- 换货须知 -->
      <view class="bg-blue-50 rounded-2xl p-4">
        <text class="text-sm font-medium text-blue-700 mb-2 block">换货须知</text>
        <view class="text-xs text-blue-600 space-y-1">
          <text class="block">• 审核通过后，快递员将上门取件</text>
          <text class="block">• 请保持商品完好，配件齐全</text>
          <text class="block">• 新商品将在收到退回商品后3个工作日内发出</text>
        </view>
      </view>
    </view>

    <!-- 提交按钮 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white px-4 py-4" style="border-top: 1px solid #E8E0D5; padding-bottom: calc(16px + env(safe-area-inset-bottom));">
      <view
        @click="handleSubmit"
        :class="['w-full py-3 text-white font-medium rounded-xl text-center', submitting ? 'opacity-50' : '']"
        style="background: linear-gradient(90deg, #C41E3A, #E85D04);"
      >
        <text>{{ submitting ? '提交中...' : '提交换货申请' }}</text>
      </view>
    </view>

    <!-- 原因选择面板 -->
    <view v-if="showReasonPicker" class="fixed inset-0 z-50 bg-black/50" @click="showReasonPicker = false">
      <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl" @click.stop>
        <view class="flex items-center justify-between p-4" style="border-bottom: 1px solid #E8E0D5;">
          <text class="font-medium text-foreground">选择换货原因</text>
          <view @click="showReasonPicker = false" class="text-muted-foreground">关闭</view>
        </view>
        <view class="p-4 pb-8">
          <view
            v-for="r in exchangeReasons"
            :key="r.value"
            @click="reason = r.value; showReasonPicker = false"
            :class="['w-full py-3 flex items-center justify-between', reason === r.value ? 'text-primary' : 'text-foreground']"
          >
            <text>{{ r.label }}</text>
            <text v-if="reason === r.value" class="text-primary">✓</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 地址选择面板 -->
    <view v-if="showAddressPicker" class="fixed inset-0 z-50 bg-black/50" @click="showAddressPicker = false">
      <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[70vh] overflow-y-auto" @click.stop>
        <view class="sticky top-0 bg-white flex items-center justify-between p-4" style="border-bottom: 1px solid #E8E0D5;">
          <text class="font-medium text-foreground">选择取件地址</text>
          <view @click="showAddressPicker = false" class="text-muted-foreground">关闭</view>
        </view>
        <view class="p-4 pb-8 space-y-3">
          <view
            v-for="addr in addresses"
            :key="addr.id"
            @click="selectedAddress = addr; showAddressPicker = false"
            :class="['p-3 rounded-xl border-2 cursor-pointer', selectedAddress?.id === addr.id ? 'border-primary bg-red-50' : 'border-border']"
          >
            <view class="flex items-center gap-2">
              <text class="font-medium text-foreground">{{ addr.name }}</text>
              <text class="text-ink-soft">{{ addr.phone }}</text>
              <text v-if="addr.isDefault" class="text-xs px-1.5 py-0.5 bg-primary text-white rounded">默认</text>
            </view>
            <text class="text-sm text-ink-soft mt-1 block">{{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.address }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface ProductSku { id: string; name: string; attrs: { name: string; value: string }[]; price: number; originalPrice: number; stock: number }
interface OrderProduct { id: string; productId: string; name: string; cover: string; skuId: string; skuName: string; price: number; quantity: number; skus: ProductSku[] }
interface ShippingAddress { id: string; name: string; phone: string; province: string; city: string; district: string; address: string; isDefault: boolean }

const exchangeReasons = [
  { value: 'quality', label: '质量问题' },
  { value: 'size', label: '尺寸不符' },
  { value: 'wrong', label: '发错货' },
  { value: 'dislike', label: '不喜欢/不想要' },
  { value: 'other', label: '其他原因' },
]

const exchangeTypes = [
  { value: 'same', label: '同款换同款', desc: '更换相同规格商品' },
  { value: 'different', label: '换其他规格', desc: '更换其他规格' },
]

const mockProducts: OrderProduct[] = [
  { id: '1', productId: 'p1', name: '周易六十四卦详解（精装典藏版）', cover: '/placeholder.svg', skuId: 's1', skuName: '精装版', price: 168, quantity: 1, skus: [
    { id: 's1', name: '精装版', attrs: [{ name: '版本', value: '精装' }], price: 168, originalPrice: 298, stock: 50 },
    { id: 's2', name: '平装版', attrs: [{ name: '版本', value: '平装' }], price: 98, originalPrice: 158, stock: 100 },
  ]},
  { id: '2', productId: 'p2', name: '紫微斗数入门教程', cover: '/placeholder.svg', skuId: 's3', skuName: '标准版', price: 88, quantity: 2, skus: [
    { id: 's3', name: '标准版', attrs: [{ name: '版本', value: '标准' }], price: 88, originalPrice: 128, stock: 80 },
  ]},
]

const mockAddresses: ShippingAddress[] = [
  { id: '1', name: '张三', phone: '138****8888', province: '北京市', city: '北京市', district: '朝阳区', address: '建国路88号SOHO现代城A座1201', isDefault: true },
]

const loading = ref(true)
const products = ref<OrderProduct[]>([])
const addresses = ref<ShippingAddress[]>([])
const selectedProduct = ref<OrderProduct | null>(null)
const reason = ref('')
const exchangeType = ref<'same' | 'different'>('same')
const newSkuId = ref('')
const description = ref('')
const images = ref<string[]>([])
const selectedAddress = ref<ShippingAddress | null>(null)
const showReasonPicker = ref(false)
const showAddressPicker = ref(false)
const submitting = ref(false)
const errors = ref<Record<string, string>>({})

const availableSkus = computed(() =>
  (selectedProduct.value?.skus || []).filter(s => s.id !== selectedProduct.value?.skuId)
)

onMounted(() => {
  setTimeout(() => {
    products.value = mockProducts
    addresses.value = mockAddresses
    selectedAddress.value = mockAddresses[0] || null
    loading.value = false
  }, 500)
})

function handleImageUpload() {
  if (images.value.length >= 5) return
  images.value = [...images.value, '/placeholder.svg?t=' + Date.now()]
}

function removeImage(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}

function validate(): boolean {
  const e: Record<string, string> = {}
  if (!selectedProduct.value) e.product = '请选择要换货的商品'
  if (!reason.value) e.reason = '请选择换货原因'
  if (exchangeType.value === 'different' && !newSkuId.value) e.sku = '请选择新规格'
  if (!selectedAddress.value) e.address = '请选择取件地址'
  errors.value = e
  return Object.keys(e).length === 0
}

function handleSubmit() {
  if (!validate() || !selectedProduct.value || !selectedAddress.value) return
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    uni.showToast({ title: '申请已提交', icon: 'success' })
    setTimeout(() => goBack(), 800)
  }, 1500)
}

function goTo(url: string) { uni.navigateTo({ url }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
