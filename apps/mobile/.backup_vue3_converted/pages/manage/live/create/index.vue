<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view class="p-1" @click="goBack">
            <text class="text-foreground text-lg">←</text>
          </view>
          <text class="text-lg font-semibold text-foreground">创建直播</text>
        </view>
      </view>
    </view>

    <view class="p-4">
      <!-- 直播类型选择 -->
      <view class="mb-6">
        <text class="text-sm font-medium text-foreground block mb-3">直播类型</text>
        <view class="grid grid-cols-2 gap-3">
          <view
            class="p-4 rounded-xl transition-all"
            :class="liveType === 'knowledge' ? 'border-2' : 'border-2 border-border'"
            :style="liveType === 'knowledge' ? 'border-color:#C41E3A;background-color:rgba(196,30,58,0.05)' : ''"
            @click="liveType = 'knowledge'"
          >
            <view class="flex items-center gap-3">
              <view
                class="w-10 h-10 rounded-lg flex items-center justify-center"
                :class="liveType === 'knowledge' ? '' : ''"
                :style="{ backgroundColor: liveType === 'knowledge' ? '#C41E3A' : '#F1EDE8' }"
              >
                <text :class="liveType === 'knowledge' ? 'text-white' : 'text-muted-foreground'">🎓</text>
              </view>
              <view>
                <text
                  class="font-medium text-sm block"
                  :style="{ color: liveType === 'knowledge' ? '#C41E3A' : '#2C2C2C' }"
                >知识授课</text>
                <text class="text-xs text-muted-foreground">横屏OBS直播</text>
              </view>
            </view>
          </view>

          <view
            class="p-4 rounded-xl transition-all"
            :class="liveType === 'ecommerce' ? 'border-2' : 'border-2 border-border'"
            :style="liveType === 'ecommerce' ? 'border-color:#C9A96E;background-color:rgba(201,169,110,0.05)' : ''"
            @click="liveType = 'ecommerce'"
          >
            <view class="flex items-center gap-3">
              <view
                class="w-10 h-10 rounded-lg flex items-center justify-center"
                :style="{ backgroundColor: liveType === 'ecommerce' ? '#C9A96E' : '#F1EDE8' }"
              >
                <text :class="liveType === 'ecommerce' ? 'text-white' : 'text-muted-foreground'">️</text>
              </view>
              <view>
                <text
                  class="font-medium text-sm block"
                  :style="{ color: liveType === 'ecommerce' ? '#C9A96E' : '#2C2C2C' }"
                >电商带货</text>
                <text class="text-xs text-muted-foreground">竖屏手机直播</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="bg-white rounded-xl p-4 mb-4">
        <text class="font-medium text-sm text-foreground block mb-4">基本信息</text>

        <!-- 直播标题 -->
        <view class="mb-4">
          <text class="text-xs text-muted-foreground block mb-2">直播标题</text>
          <input
            class="w-full px-4 py-3 rounded-lg text-sm text-foreground bg-[#F1EDE8]"
            placeholder="输入直播标题，吸引更多观众"
            :value="title"
            @input="title = $event.detail.value"
            maxlength="50"
          />
          <text class="text-xs text-muted-foreground text-right block mt-1">{{ title.length }}/50</text>
        </view>

        <!-- 封面图 -->
        <view class="mb-4">
          <text class="text-xs text-muted-foreground block mb-2">封面图</text>
          <view class="flex gap-3">
            <view
              class="w-28 h-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1"
              @click="handleUploadCover"
            >
              <text class="text-lg text-muted-foreground"></text>
              <text class="text-[10px] text-muted-foreground">上传封面</text>
            </view>
            <view class="flex-1">
              <text class="text-xs text-muted-foreground block">建议尺寸: 16:9</text>
              <text class="text-xs text-muted-foreground block mt-1">支持 JPG、PNG 格式</text>
            </view>
          </view>
        </view>

        <!-- 开播时间 -->
        <view>
          <text class="text-xs text-muted-foreground block mb-2">计划开播时间</text>
          <view class="grid grid-cols-2 gap-3">
            <view class="relative">
              <input
                type="date"
                class="w-full pl-3 pr-4 py-3 rounded-lg text-sm text-foreground bg-[#F1EDE8]"
                :value="scheduleDate"
                @input="scheduleDate = $event.detail.value"
              />
              <text class="absolute left-3 top-1/2 text-sm text-muted-foreground" style="transform:translateY(-50%)"></text>
            </view>
            <view class="relative">
              <input
                type="time"
                class="w-full pl-3 pr-4 py-3 rounded-lg text-sm text-foreground bg-[#F1EDE8]"
                :value="scheduleTime"
                @input="scheduleTime = $event.detail.value"
              />
              <text class="absolute left-3 top-1/2 text-sm text-muted-foreground" style="transform:translateY(-50%)">🕐</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 商品设置（电商带货可见） -->
      <view v-if="liveType === 'ecommerce'" class="bg-white rounded-xl p-4 mb-4">
        <view class="flex items-center justify-between mb-4">
          <text class="font-medium text-sm text-foreground">关联商品</text>
          <view class="flex items-center gap-1 text-sm" style="color:#C41E3A" @click="showProductPicker = true">
            <text>➕</text>
            <text>添加商品</text>
          </view>
        </view>

        <view v-if="selectedProducts.length > 0" class="space-y-2">
          <view
            v-for="id in selectedProducts"
            :key="id"
            class="flex items-center gap-3 p-2 rounded-lg bg-[#F1EDE8]"
          >
            <view class="w-12 h-12 rounded flex items-center justify-center bg-[#F1EDE8]">
              <text class="text-lg text-muted-foreground"></text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground line-clamp-1 block">{{ getProductById(id)?.name }}</text>
              <text class="text-xs" style="color:#C41E3A">¥{{ getProductById(id)?.price }}</text>
            </view>
            <view class="p-1.5" @click="toggleProduct(id)">
              <text class="text-sm text-muted-foreground">✕</text>
            </view>
          </view>
        </view>

        <view v-else class="py-6 text-center">
          <text class="text-3xl text-muted-foreground/30 block mb-2">️</text>
          <text class="text-sm text-muted-foreground block">还未添加商品</text>
          <text class="text-xs text-muted-foreground block">点击上方按钮从商品库中选择</text>
        </view>
      </view>

      <!-- 分享设置 -->
      <view class="bg-white rounded-xl p-4">
        <text class="font-medium text-sm text-foreground block mb-4">直播间分享</text>
        <view class="grid grid-cols-2 gap-3">
          <view class="flex items-center gap-3 p-3 rounded-lg bg-[#F1EDE8]" @click="handleGeneratePoster">
            <view class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color:rgba(196,30,58,0.1)">
              <text class="text-lg" style="color:#C41E3A"></text>
            </view>
            <view>
              <text class="text-sm font-medium text-foreground block">生成海报</text>
              <text class="text-xs text-muted-foreground block">预告海报分享</text>
            </view>
          </view>
          <view class="flex items-center gap-3 p-3 rounded-lg bg-[#F1EDE8]" @click="handleCopyLink">
            <view class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color:rgba(201,169,110,0.1)">
              <text class="text-lg" style="color:#C9A96E"></text>
            </view>
            <view>
              <text class="text-sm font-medium text-foreground block">复制链接</text>
              <text class="text-xs text-muted-foreground block">分享直播间</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-border">
      <view class="flex gap-3">
        <view
          class="flex-1 py-3 rounded-xl text-sm text-center text-foreground font-medium bg-[#F1EDE8]"
          @click="handleSaveDraft"
        >
          <text>保存为草稿</text>
        </view>
        <view
          class="flex-1 py-3 rounded-xl text-sm text-center text-white font-medium"
          style="background-color:#C41E3A"
          @click="handleCreate"
        >
          <text>创建直播</text>
        </view>
      </view>
    </view>

    <!-- 商品选择弹窗 -->
    <view v-if="showProductPicker" class="fixed inset-0 z-50">
      <view class="absolute inset-0 bg-black/60" @click="showProductPicker = false" />
      <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl" style="max-height:70vh;overflow:hidden">
        <view class="px-4 py-4 border-b border-border flex items-center justify-between">
          <text class="font-semibold text-foreground">选择商品</text>
          <view class="p-2" @click="showProductPicker = false">
            <text class="text-lg text-muted-foreground">✕</text>
          </view>
        </view>
        <view class="px-4 py-4 overflow-y-auto" style="max-height:50vh">
          <view
            v-for="product in productList"
            :key="product.id"
            class="flex items-center gap-3 w-full p-3 rounded-lg"
            @click="toggleProduct(product.id)"
          >
            <view class="w-14 h-14 rounded-lg bg-[#F1EDE8] flex items-center justify-center">
              <text class="text-lg text-muted-foreground"></text>
            </view>
            <view class="flex-1">
              <text class="text-sm text-foreground block">{{ product.name }}</text>
              <text class="text-sm block" style="color:#C41E3A">¥{{ product.price }}</text>
            </view>
            <view
              class="w-6 h-6 rounded-full border-2 flex items-center justify-center"
              :class="selectedProducts.includes(product.id) ? '' : ''"
              :style="{
                borderColor: selectedProducts.includes(product.id) ? '#C41E3A' : '#E8E0D5',
                backgroundColor: selectedProducts.includes(product.id) ? '#C41E3A' : 'transparent',
              }"
            >
              <text v-if="selectedProducts.includes(product.id)" class="text-white text-[10px]"></text>
            </view>
          </view>
        </view>
        <view class="px-4 py-4 border-t border-border">
          <view
            class="w-full py-3 rounded-xl text-sm text-center text-white font-medium"
            style="background-color:#C41E3A"
            @click="showProductPicker = false"
          >
            <text>确定 ({{ selectedProducts.length }})</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const liveType = ref<'knowledge' | 'ecommerce'>('knowledge')
const title = ref('')
const scheduleDate = ref('')
const scheduleTime = ref('')
const selectedProducts = ref<number[]>([])
const showProductPicker = ref(false)

interface Product {
  id: number
  name: string
  price: number
  image: string
}

const productList: Product[] = [
  { id: 1, name: '渊海子平全译本', price: 68, image: '' },
  { id: 2, name: '紫微斗数精装版', price: 128, image: '' },
  { id: 3, name: '开运转运手链', price: 299, image: '' },
  { id: 4, name: '檀香香炉套装', price: 168, image: '' },
  { id: 5, name: '风水罗盘专业版', price: 458, image: '' },
]

function toggleProduct(id: number) {
  const idx = selectedProducts.value.indexOf(id)
  if (idx >= 0) {
    selectedProducts.value.splice(idx, 1)
  } else {
    selectedProducts.value.push(id)
  }
}

function getProductById(id: number): Product | undefined {
  return productList.find(p => p.id === id)
}

function handleUploadCover() {
  uni.showToast({ title: '上传功能开发中', icon: 'none' })
}

function handleGeneratePoster() {
  uni.showToast({ title: '海报生成功能开发中', icon: 'none' })
}

function handleCopyLink() {
  uni.setClipboardData({ data: 'https://rebu.com/live/preview' })
  uni.showToast({ title: '链接已复制', icon: 'success' })
}

function handleSaveDraft() {
  uni.showToast({ title: '已保存为草稿', icon: 'success' })
}

function handleCreate() {
  uni.showToast({ title: '直播创建成功!', icon: 'success' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
