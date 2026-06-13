<template>
  <view class="min-h-screen bg-background pb-32">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center h-14 px-4">
        <view @click="goBack" class="mr-3 p-1">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="text-lg font-semibold">{{ isEdit ? '编辑商品' : '发布商品' }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="flex-1 p-4 space-y-4">
      <!-- 商品图片 -->
      <view class="bg-white rounded-2xl p-4">
        <view class="flex items-center justify-between mb-3">
          <text class="font-medium">商品图片</text>
          <text class="text-xs text-muted-foreground">最多9张，首图为封面</text>
        </view>
        <view class="grid grid-cols-3 gap-3">
          <view v-for="(_, index) in formData.images" :key="index" class="aspect-square rounded-xl bg-background relative overflow-hidden border-2 border-dashed border-border">
            <view class="absolute inset-0 flex items-center justify-center">
              <text class="text-3xl"></text>
            </view>
            <view @click="removeImage(index)" class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
              <text class="text-xs text-white">✕</text>
            </view>
            <text v-if="index === 0" class="absolute bottom-1 left-1 px-1 py-0.5 rounded text-[10px] bg-primary text-white">封面</text>
          </view>
          <view v-if="formData.images.length < 9" @click="addImage" class="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center">
            <text class="text-3xl text-muted-foreground">+</text>
            <text class="text-xs text-muted-foreground mt-1">添加图片</text>
          </view>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="bg-white rounded-2xl p-4 space-y-4">
        <text class="font-medium">基本信息</text>

        <view class="space-y-2">
          <text class="text-sm font-medium">商品名称 <text class="text-primary">*</text></text>
          <input v-model="formData.title" placeholder="请输入商品名称（最多60字）" maxlength="60" class="w-full px-3 py-2.5 bg-background rounded-xl text-sm" />
          <text class="text-xs text-muted-foreground text-right block">{{ formData.title.length }}/60</text>
        </view>

        <view class="space-y-2">
          <text class="text-sm font-medium">商品卖点</text>
          <input v-model="formData.subtitle" placeholder="简要描述商品特点（最多30字）" maxlength="30" class="w-full px-3 py-2.5 bg-background rounded-xl text-sm" />
        </view>

        <view class="space-y-2">
          <text class="text-sm font-medium">商品详情</text>
          <textarea v-model="formData.description" placeholder="详细描述商品信息、规格、使用方法等" rows="5" class="w-full px-3 py-2.5 bg-background rounded-xl text-sm" />
        </view>
      </view>

      <!-- 价格库存 -->
      <view class="bg-white rounded-2xl p-4 space-y-4">
        <text class="font-medium">价格库存</text>

        <view class="grid grid-cols-2 gap-4">
          <view class="space-y-2">
            <text class="text-sm font-medium">售价 <text class="text-primary">*</text></text>
            <view class="relative">
              <text class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</text>
              <input v-model="formData.price" type="digit" placeholder="0.00" class="w-full pl-8 pr-3 py-2.5 bg-background rounded-xl text-sm" />
            </view>
          </view>
          <view class="space-y-2">
            <text class="text-sm font-medium">原价（划线价）</text>
            <view class="relative">
              <text class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</text>
              <input v-model="formData.originalPrice" type="digit" placeholder="0.00" class="w-full pl-8 pr-3 py-2.5 bg-background rounded-xl text-sm" />
            </view>
          </view>
        </view>

        <view class="grid grid-cols-2 gap-4">
          <view class="space-y-2">
            <text class="text-sm font-medium">库存 <text class="text-primary">*</text></text>
            <input v-model="formData.stock" type="number" placeholder="请输入库存数量" class="w-full px-3 py-2.5 bg-background rounded-xl text-sm" />
          </view>
          <view class="space-y-2">
            <text class="text-sm font-medium">限购数量</text>
            <input v-model="formData.limitPerPerson" type="number" placeholder="不限制" class="w-full px-3 py-2.5 bg-background rounded-xl text-sm" />
          </view>
        </view>
      </view>

      <!-- 分类与标签 -->
      <view class="bg-white rounded-2xl p-4 space-y-4">
        <text class="font-medium">分类与标签</text>

        <view class="space-y-2">
          <text class="text-sm font-medium">商品分类 <text class="text-primary">*</text></text>
          <picker :range="categories" range-key="name" @change="onCategoryChange">
            <view :class="['w-full px-3 py-2.5 rounded-xl text-sm border', formData.category ? 'bg-background border-border' : 'bg-background border-border']">
              <text :class="formData.category ? 'text-foreground' : 'text-muted-foreground'">{{ selectedCategoryName || '请选择商品分类' }}</text>
            </view>
          </picker>
          <text v-if="selectedCategory" class="text-xs text-muted-foreground flex items-center gap-1">
            ℹ️ 该分类平台收取 {{ selectedCategory.fee }} 技术服务费
          </text>
        </view>

        <view class="space-y-2">
          <text class="text-sm font-medium">商品标签（最多5个）</text>
          <view class="flex flex-wrap gap-2 mb-2">
            <view v-for="tag in formData.tags" :key="tag" class="px-2 py-1 rounded-lg bg-background text-xs flex items-center gap-1">
              <text>{{ tag }}</text>
              <text @click="removeTag(tag)" class="text-muted-foreground">✕</text>
            </view>
          </view>
          <view class="flex gap-2">
            <input v-model="newTag" placeholder="输入标签后点击添加" maxlength="10" class="flex-1 px-3 py-2 bg-background rounded-xl text-sm" @confirm="addTag" />
            <view @click="addTag" :class="['px-3 py-2 rounded-xl text-sm border border-border', formData.tags.length >= 5 ? 'opacity-50' : '']">
              <text>+</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 其他设置 -->
      <view class="bg-white rounded-2xl p-4 space-y-4">
        <text class="font-medium">其他设置</text>

        <view class="flex items-center justify-between">
          <view>
            <text class="text-sm font-medium block">虚拟商品</text>
            <text class="text-xs text-muted-foreground mt-0.5">虚拟商品无需发货</text>
          </view>
          <switch :checked="formData.isVirtual" @change="formData.isVirtual = !formData.isVirtual" color="#C41E3A" />
        </view>

        <view class="flex items-center justify-between">
          <view>
            <text class="text-sm font-medium block">支持退款</text>
            <text class="text-xs text-muted-foreground mt-0.5">买家可申请退款退货</text>
          </view>
          <switch :checked="formData.allowRefund" @change="formData.allowRefund = !formData.allowRefund" color="#C41E3A" />
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-border">
      <view class="flex gap-3">
        <view @click="handleSaveDraft" :class="['flex-1 py-3 rounded-xl text-center text-sm font-medium border border-border', isSaving ? 'opacity-50' : '']">
          <text>{{ isSaving ? ' 保存中...' : '💾 保存草稿' }}</text>
        </view>
        <view @click="handlePublish" :class="['flex-1 py-3 rounded-xl text-center text-sm font-medium', isSubmitting ? 'opacity-50 bg-primary text-white' : 'bg-primary text-white']">
          <text>{{ isSubmitting ? ' 提交中...' : isEdit ? ' 保存修改' : '🚀 立即发布' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const categories = [
  { id: 'guoxue', name: '国学课程', fee: '5%' },
  { id: 'guji', name: '古籍图书', fee: '3%' },
  { id: 'wenchuang', name: '文创用品', fee: '5%' },
  { id: 'wenfang', name: '文房四宝', fee: '5%' },
  { id: 'chadao', name: '茶道用品', fee: '5%' },
  { id: 'mingli', name: '命理咨询', fee: '10%' },
  { id: 'fengshui', name: '风水服务', fee: '10%' },
  { id: 'shufa', name: '书法字画', fee: '8%' },
]

interface FormData {
  images: string[]
  title: string
  subtitle: string
  description: string
  price: string
  originalPrice: string
  stock: string
  category: string
  tags: string[]
  isVirtual: boolean
  allowRefund: boolean
  limitPerPerson: string
}

const isEdit = ref(false)
const isSubmitting = ref(false)
const isSaving = ref(false)
const newTag = ref('')

const formData = ref<FormData>({
  images: [],
  title: '',
  subtitle: '',
  description: '',
  price: '',
  originalPrice: '',
  stock: '',
  category: '',
  tags: [],
  isVirtual: false,
  allowRefund: true,
  limitPerPerson: '',
})

const selectedCategory = ref<{ id: string; name: string; fee: string } | null>(null)

const selectedCategoryName = ref('')

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const productId = currentPage?.options?.id
  if (productId) {
    isEdit.value = true
    formData.value = {
      images: ['1', '2'],
      title: '滴天髓精解',
      subtitle: '命理学经典著作精装版',
      description: '详细描述内容...',
      price: '68',
      originalPrice: '98',
      stock: '156',
      category: 'guji',
      tags: ['命理', '八字', '经典'],
      isVirtual: false,
      allowRefund: true,
      limitPerPerson: '',
    }
    const cat = categories.find(c => c.id === 'guji')
    if (cat) {
      selectedCategory.value = cat
      selectedCategoryName.value = cat.name
    }
  }
})

function onCategoryChange(e: any) {
  const idx = e.detail.value
  const cat = categories[idx]
  if (cat) {
    formData.value.category = cat.id
    selectedCategory.value = cat
    selectedCategoryName.value = cat.name
  }
}

function addImage() {
  formData.value.images.push(String(formData.value.images.length + 1))
}

function removeImage(index: number) {
  formData.value.images = formData.value.images.filter((_, i) => i !== index)
}

function addTag() {
  if (newTag.value && !formData.value.tags.includes(newTag.value) && formData.value.tags.length < 5) {
    formData.value.tags.push(newTag.value)
    newTag.value = ''
  }
}

function removeTag(tag: string) {
  formData.value.tags = formData.value.tags.filter(t => t !== tag)
}

async function handleSaveDraft() {
  isSaving.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))
  isSaving.value = false
  uni.showToast({ title: '草稿已保存', icon: 'success' })
}

async function handlePublish() {
  if (!formData.value.title || !formData.value.price || !formData.value.stock || !formData.value.category) {
    uni.showToast({ title: '请填写必填项', icon: 'none' })
    return
  }
  isSubmitting.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  isSubmitting.value = false
  uni.showToast({ title: '发布成功', icon: 'success' })
  setTimeout(() => { uni.navigateBack() }, 800)
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
