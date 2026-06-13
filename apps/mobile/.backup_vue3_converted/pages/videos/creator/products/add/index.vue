<template>
  <view class="min-h-screen bg-background">
    <!-- 成功状态 -->
    <view v-if="success" class="min-h-screen flex flex-col items-center justify-center px-8 text-center">
      <text class="text-5xl text-green-500 mb-4">✓</text>
      <text class="text-xl font-bold text-foreground mb-2">商品已添加</text>
      <text class="text-sm text-muted-foreground mb-8">您的商品已成功发布，用户可以在您的主页中看到。</text>
      <view @click="goBack" class="w-full py-3 bg-primary text-white rounded-xl font-medium text-center">返回商品列表</view>
    </view>

    <!-- 表单 -->
    <view v-else class="min-h-screen bg-background">
      <view class="sticky top-0 z-10 bg-white border-b border-border flex items-center px-4 h-12 gap-3">
        <view @click="goBack" class="p-1"><text class="text-xl text-foreground">←</text></view>
        <text class="text-base font-semibold text-foreground">添加商品</text>
      </view>

      <view class="px-4 pt-5 pb-24 space-y-5">
        <!-- 商品类型 -->
        <view>
          <text class="text-sm font-medium text-foreground block mb-2">商品类型</text>
          <view class="grid grid-cols-2 gap-2">
            <view v-for="t in productTypes" :key="t.key" @click="type = t.key" :class="['p-3 rounded-xl border', type === t.key ? 'border-primary bg-primary/5' : 'border-border bg-white']">
              <text :class="['text-sm font-semibold block', type === t.key ? 'text-primary' : 'text-foreground']">{{ t.label }}</text>
              <text class="text-xs text-muted-foreground block mt-0.5">{{ t.desc }}</text>
            </view>
          </view>
        </view>

        <!-- 封面 -->
        <view>
          <text class="text-sm font-medium text-foreground block mb-2">封面图片</text>
          <view class="h-32 bg-[#F5F5F5] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <text class="text-2xl"></text>
            <text class="text-xs">点击上传封面图</text>
          </view>
        </view>

        <!-- 标题 -->
        <view>
          <text class="text-sm font-medium text-foreground block mb-1.5">商品标题 <text class="text-red-500">*</text></text>
          <input v-model="form.title" placeholder="请输入商品名称" class="w-full h-10 px-3 text-sm bg-white border border-border rounded-lg outline-none focus:border-primary" />
        </view>

        <!-- 描述 -->
        <view>
          <text class="text-sm font-medium text-foreground block mb-1.5">商品描述</text>
          <textarea v-model="form.desc" placeholder="详细描述商品内容、适合人群、学习收获等" class="w-full min-h-[90px] px-3 py-2 text-sm bg-white border border-border rounded-lg resize-none outline-none" />
        </view>

        <!-- 价格 -->
        <view class="grid grid-cols-2 gap-3">
          <view>
            <text class="text-sm font-medium text-foreground block mb-1.5">售价（元）<text class="text-red-500">*</text></text>
            <input v-model="form.price" type="number" placeholder="0.00" class="w-full h-10 px-3 text-sm bg-white border border-border rounded-lg outline-none" />
          </view>
          <view>
            <text class="text-sm font-medium text-foreground block mb-1.5">原价（元）</text>
            <input v-model="form.originalPrice" type="number" placeholder="0.00（可选）" class="w-full h-10 px-3 text-sm bg-white border border-border rounded-lg outline-none" />
          </view>
        </view>

        <!-- 库存（咨询服务） -->
        <view v-if="type === 'consult'">
          <text class="text-sm font-medium text-foreground block mb-1.5">库存数量</text>
          <view class="flex items-center gap-3">
            <view @click="form.stock = String(Math.max(0, Number(form.stock) - 1))" class="w-9 h-9 border border-border rounded-lg flex items-center justify-center"><text class="text-lg">−</text></view>
            <input v-model="form.stock" type="number" placeholder="不限" class="flex-1 h-10 px-3 text-sm bg-white border border-border rounded-lg outline-none text-center" />
            <view @click="form.stock = String(Number(form.stock || 0) + 1)" class="w-9 h-9 border border-border rounded-lg flex items-center justify-center"><text class="text-lg">+</text></view>
          </view>
        </view>

        <!-- 标签 -->
        <view>
          <text class="text-sm font-medium text-foreground block mb-1.5">商品标签</text>
          <view class="flex gap-2 mb-2">
            <input v-model="tagInput" placeholder="输入标签后回车添加" class="flex-1 h-10 px-3 text-sm bg-white border border-border rounded-lg outline-none" @confirm="addTag" />
            <view @click="addTag" class="px-3 py-2 bg-primary text-white rounded-lg text-sm flex-shrink-0">添加</view>
          </view>
          <view v-if="tags.length > 0" class="flex flex-wrap gap-1.5">
            <text v-for="tag in tags" :key="tag" class="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              {{ tag }}
              <text @click="tags = tags.filter(t => t !== tag)" class="text-xs">✕</text>
            </text>
          </view>
        </view>
      </view>

      <!-- 底部发布按钮 -->
      <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-4">
        <view @click="handleSubmit" :class="['w-full py-3 rounded-xl text-center text-sm font-semibold text-white', (valid && !loading) ? 'bg-primary' : 'bg-primary/50']">
          <text v-if="loading"> 发布中…</text><text v-else>发布商品</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type ProductType = 'video' | 'course' | 'consult' | 'material'

const productTypes = [
  { key: 'video' as ProductType, label: '付费视频', desc: '单个或系列付费视频' },
  { key: 'course' as ProductType, label: '课程套餐', desc: '多视频组合成课程' },
  { key: 'consult' as ProductType, label: '咨询服务', desc: '一对一在线咨询' },
  { key: 'material' as ProductType, label: '资料包', desc: '文档/图片等学习资料' },
]

const type = ref<ProductType>('video')
const form = ref({ title: '', desc: '', price: '', originalPrice: '', stock: '', cover: '' })
const tags = ref<string[]>([])
const tagInput = ref('')
const loading = ref(false)
const success = ref(false)

const valid = computed(() => form.value.title && form.value.price)

function addTag() {
  const t = tagInput.value.trim()
  if (t && !tags.value.includes(t)) tags.value.push(t)
  tagInput.value = ''
}

async function handleSubmit() {
  if (!valid.value) return
  loading.value = true
  await new Promise(r => setTimeout(r, 1200))
  loading.value = false
  success.value = true
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
