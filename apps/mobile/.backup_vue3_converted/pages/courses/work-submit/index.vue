<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 骨架屏 -->
    <template v-if="isLoading">
      <view class="min-h-screen bg-background">
        <view class="h-12 bg-white border-b border-border" />
        <view class="p-4 space-y-4">
          <view class="animate-pulse space-y-3">
            <view class="h-6 bg-[#E8E0D5] rounded w-1/2" />
            <view class="h-4 bg-[#E8E0D5] rounded w-full" />
            <view class="h-4 bg-[#E8E0D5] rounded w-3/4" />
          </view>
          <view class="animate-pulse h-40 bg-[#E8E0D5] rounded-xl" />
          <view class="animate-pulse h-24 bg-[#E8E0D5] rounded-xl" />
        </view>
      </view>
    </template>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-50 bg-white border-b border-border">
        <view class="flex items-center justify-between h-12 px-4">
          <view class="p-1 -ml-1" @click="goBack">
            <text class="text-xl text-foreground">←</text>
          </view>
          <text class="text-base font-semibold text-foreground">提交作业</text>
          <view class="w-6" />
        </view>
      </view>

      <view class="p-4 space-y-4">
        <!-- 作业信息卡片 -->
        <view class="bg-white rounded-xl p-4 shadow-sm border border-border">
          <view class="flex items-start gap-3">
            <view class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <text class="text-primary"></text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-[15px] font-semibold text-foreground mb-1 block">{{ requirement?.title }}</text>
              <text class="text-[12px] text-muted-foreground mb-2 block">{{ requirement?.courseTitle }} · {{ requirement?.chapterTitle }}</text>
              <view v-if="requirement?.deadline" class="flex items-center gap-1 text-[12px] text-[#FF6B35]">
                <text>🕐</text>
                <text>截止时间：{{ requirement.deadline }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 作业要求 -->
        <view class="bg-white rounded-xl p-4 shadow-sm border border-border">
          <view class="flex items-center gap-1.5 mb-2">
            <text class="text-accent"></text>
            <text class="text-[14px] font-semibold text-foreground">作业要求</text>
          </view>
          <text class="text-[13px] text-ink-soft leading-relaxed whitespace-pre-line block">{{ requirement?.description }}</text>
        </view>

        <!-- 文字输入区 -->
        <view class="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <textarea
            v-model="content"
            placeholder="请在此输入你的作业内容..."
            class="w-full h-48 p-4 text-[14px] text-foreground placeholder:text-[#CCC] resize-none bg-transparent outline-none"
          />
          <view class="px-4 py-2 border-t border-border flex items-center justify-between">
            <text :class="['text-[12px]', wordCount < (requirement?.minWords || 100) ? 'text-[#FF6B35]' : 'text-muted-foreground']">
              {{ wordCount }}/{{ requirement?.minWords || 100 }}字（最少）
            </text>
          </view>
        </view>

        <!-- 图片上传区 -->
        <view class="bg-white rounded-xl p-4 shadow-sm border border-border">
          <view class="flex items-center gap-1.5 mb-3">
            <text class="text-accent">️</text>
            <text class="text-[14px] font-semibold text-foreground">添加图片</text>
            <text class="text-[12px] font-normal text-muted-foreground">（{{ images.length }}/{{ requirement?.maxImages || 9 }}）</text>
          </view>
          <view class="grid grid-cols-3 gap-2">
            <!-- 已上传图片 -->
            <view v-for="(url, index) in images" :key="index" class="relative aspect-square rounded-lg overflow-hidden bg-[#F5F0E8]">
              <image :src="url" mode="aspectFill" class="w-full h-full" />
              <view @click="removeImage(index)" class="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                <text class="text-white text-xs">✕</text>
              </view>
            </view>
            <!-- 添加图片按钮 -->
            <view v-if="images.length < (requirement?.maxImages || 9)" @click="handleAddImage"
              :class="['aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 transition-colors', uploading ? 'opacity-50' : '']"
            >
              <text v-if="uploading" class="animate-spin text-primary"></text>
              <template v-else>
                <text class="text-2xl text-muted-foreground">+</text>
                <text class="text-[10px] text-muted-foreground">添加图片</text>
              </template>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部提交按钮 -->
      <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4" style="padding-bottom:calc(16px + env(safe-area-inset-bottom))">
        <view @click="handleSubmit"
          :class="['w-full h-12 rounded-full flex items-center justify-center gap-2 text-[15px] font-semibold transition-all', canSubmit ? 'bg-gradient-to-r from-primary to-[#E74C3C] text-white shadow-lg' : 'bg-[#E8E0D5] text-muted-foreground']"
        >
          <text v-if="submitting" class="animate-spin"></text>
          <template v-else>
            <text></text>
            <text>提交作业</text>
          </template>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface WorkRequirement {
  id: string; title: string; description: string
  chapterTitle: string; courseTitle: string
  deadline: string; maxImages: number; minWords: number
}

const requirement = ref<WorkRequirement | null>(null)
const content = ref('')
const images = ref<string[]>([])
const uploading = ref(false)
const submitting = ref(false)
const isLoading = ref(true)

const mockRequirement: WorkRequirement = {
  id: '1', title: '八字命理基础练习',
  description: '请根据本章节所学内容，分析以下八字命盘的五行分布，并写出你的解读思路。要求：\n1. 分析命盘五行强弱\n2. 找出命主的喜用神\n3. 简要分析命主性格特点\n\n提示：可以参考课程中的案例分析方法，结合自己的理解进行作答。',
  chapterTitle: '第三章：五行生克与喜用神', courseTitle: '八字命理入门精讲',
  deadline: '2024-12-31 23:59', maxImages: 9, minWords: 100,
}

onMounted(async () => {
  await new Promise(r => setTimeout(r, 500))
  requirement.value = mockRequirement
  isLoading.value = false
})

const wordCount = computed(() => content.value.length)
const canSubmit = computed(() => requirement.value && wordCount.value >= requirement.value!.minWords && !submitting.value)

function goBack() { uni.navigateBack() }

function handleAddImage() {
  const maxImages = requirement.value?.maxImages || 9
  const remaining = maxImages - images.value.length
  if (remaining <= 0) {
    uni.showToast({ title: `最多上传${maxImages}张图片`, icon: 'none' })
    return
  }
  uploading.value = true
  uni.chooseImage({
    count: remaining,
    success: (res) => {
      images.value = [...images.value, ...res.tempFilePaths]
      uploading.value = false
    },
    fail: () => {
      uploading.value = false
    }
  })
}

function removeImage(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}

function handleSubmit() {
  if (!canSubmit.value) return
  if (!requirement.value) return
  if (content.value.length < requirement.value.minWords) {
    uni.showToast({ title: `至少需要${requirement.value.minWords}字`, icon: 'none' })
    return
  }
  submitting.value = true
  setTimeout(() => {
    uni.showToast({ title: '提交成功', icon: 'success' })
    submitting.value = false
    uni.navigateBack()
  }, 1000)
}
</script>

<style scoped>
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>
