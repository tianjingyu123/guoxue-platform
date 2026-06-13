<template>
  <view class="min-h-screen bg-background">
    <!-- 加载骨架屏 -->
    <template v-if="loading">
      <view class="sticky top-0 z-10 bg-background border-b border-border">
        <view class="flex items-center h-14 px-4">
          <view class="w-5 h-5 bg-muted rounded animate-pulse" />
          <text class="ml-4 font-medium text-foreground">回答悬赏</text>
        </view>
      </view>
      <view class="p-4 space-y-4 animate-pulse">
        <view class="h-24 bg-muted rounded-2xl" />
        <view class="h-48 bg-muted rounded-2xl" />
      </view>
    </template>

    <!-- 悬赏不存在 -->
    <template v-else-if="!bounty">
      <view class="min-h-screen flex items-center justify-center">
        <text class="text-muted-foreground">悬赏不存在</text>
      </view>
    </template>

    <!-- 内容 -->
    <template v-else>
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-10 bg-background border-b border-border">
        <view class="flex items-center justify-between h-14 px-4">
          <view class="flex items-center">
            <view @click="goBack" class="p-2 -ml-2">
              <text class="text-lg text-foreground">&#8249;</text>
            </view>
            <text class="ml-2 font-medium text-foreground">回答悬赏</text>
          </view>
          <text class="text-xs text-muted-foreground">{{ content.length }}/2000</text>
        </view>
      </view>

      <view class="p-4 space-y-4" style="padding-bottom: 180px;">
        <!-- 悬赏信息卡片 -->
        <view class="rounded-2xl p-4 border border-amber-100" style="background:linear-gradient(135deg,#fffbeb,#fff7ed)">
          <view class="flex items-start justify-between mb-3">
            <view class="flex items-center gap-2">
              <view class="w-8 h-8 rounded-full flex items-center justify-center" style="background:linear-gradient(135deg,#fbbf24,#f97316)">
                <text class="text-white text-sm">&#127873;</text>
              </view>
              <text class="text-lg font-bold" style="color:#d97706">¥{{ bounty.amount }}</text>
            </view>
            <view class="flex items-center gap-1 text-xs" style="color:#d97706">
              <text>&#128339;</text>
              <text>剩余 {{ getRemainingTime() }}</text>
            </view>
          </view>

          <text class="font-medium text-foreground mb-2 line-clamp-2 block">{{ bounty.title }}</text>
          <text class="text-sm text-muted-foreground line-clamp-3 block">{{ bounty.description }}</text>

          <view class="flex items-center gap-2 mt-3">
            <view class="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
              <text class="text-[10px] text-foreground">{{ bounty.poster.name[0] }}</text>
            </view>
            <text class="text-xs text-muted-foreground">{{ bounty.poster.name }} 发布</text>
            <text class="text-xs text-muted-foreground">·</text>
            <text class="text-xs text-muted-foreground">{{ bounty.answerCount }} 人已回答</text>
          </view>
        </view>

        <!-- 回答输入 -->
        <view class="bg-white rounded-2xl border border-border overflow-hidden">
          <view class="p-4">
            <view class="font-medium text-foreground mb-3 flex items-center gap-2">
              <text class="text-primary">&#128140;</text>
              <text>我的回答</text>
            </view>
            <textarea
              v-model="content"
              placeholder="请输入您的回答，至少20字..."
              class="w-full h-48 bg-secondary/30 rounded-xl p-3 text-sm text-foreground resize-none"
              :maxlength="2000"
              @input="error = ''"
            />
          </view>

          <!-- 图片上传 -->
          <view class="px-4 pb-4">
            <view class="flex items-center gap-2 mb-3">
              <text class="text-muted-foreground">&#128247;</text>
              <text class="text-sm text-muted-foreground">添加配图（选填，最多9张）</text>
            </view>

            <view class="flex flex-wrap gap-2">
              <view v-for="(img, index) in images" :key="index" class="relative w-20 h-20">
                <image :src="img" mode="aspectFill" class="w-full h-full rounded-lg" />
                <view @click="removeImage(index)" class="absolute -top-1 -right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                  <text class="text-white text-xs">&#10005;</text>
                </view>
              </view>

              <view v-if="images.length < 9" @click="addImage" class="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center">
                <text class="text-lg text-muted-foreground">&#128247;</text>
                <text class="text-xs text-muted-foreground">{{ images.length }}/9</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 回答提示 -->
        <view class="bg-blue-50 rounded-xl p-4">
          <text class="font-medium text-blue-800 mb-2 text-sm block">回答提示</text>
          <view class="text-xs text-blue-700 space-y-1">
            <text class="block">&#8226; 请认真回答问题，详细、专业的回答更容易被采纳</text>
            <text class="block">&#8226; 回答被采纳后，您将获得全部悬赏金额</text>
            <text class="block">&#8226; 如有多人回答，发布者将选择最佳答案采纳</text>
            <text class="block">&#8226; 禁止发布违规内容，违者将被封禁</text>
          </view>
        </view>

        <!-- 错误信息 -->
        <view v-if="error" class="flex items-center gap-2 text-red-500 text-sm bg-red-50 rounded-xl p-3">
          <text class="flex-shrink-0">&#9888;&#65039;</text>
          <text>{{ error }}</text>
        </view>
      </view>

      <!-- 固定底部 -->
      <view class="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4" style="padding-bottom: calc(16px + env(safe-area-inset-bottom));">
        <view class="flex items-center justify-between mb-3">
          <text class="text-sm text-muted-foreground">
            回答字数：<text :class="content.length < 20 ? 'text-red-500' : 'text-green-500'">{{ content.length }}</text>/2000
          </text>
          <text class="text-sm">
            可获悬赏：<text class="font-bold" style="color:#d97706">¥{{ bounty.amount }}</text>
          </text>
        </view>

        <view
          @click="handleSubmit"
          :class="['w-full h-12 rounded-xl font-medium flex items-center justify-center gap-2', (submitting || content.trim().length < 20) ? 'opacity-50' : '']"
          style="background:linear-gradient(to right,#f59e0b,#f97316);color:white"
        >
          <view v-if="submitting" class="flex items-center gap-2">
            <view class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></view>
            <text>提交中...</text>
          </view>
          <view v-else class="flex items-center gap-2">
            <text>&#128140;</text>
            <text>提交回答</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

function goBack() { uni.navigateBack() }

interface Bounty {
  id: string
  title: string
  description: string
  amount: number
  status: string
  poster: { id: string; name: string; avatar: string }
  answerCount: number
  viewCount: number
  category: string
  tags: string[]
  createdAt: string
  expireAt: string
}

const bountyId = ref<string | null>(null)
const bounty = ref<Bounty | null>(null)
const content = ref('')
const images = ref<string[]>([])
const loading = ref(true)
const submitting = ref(false)
const error = ref('')

const getRemainingTime = () => {
  if (!bounty.value) return ''
  const now = new Date()
  const expire = new Date(bounty.value.expireAt)
  const diff = expire.getTime() - now.getTime()
  if (diff <= 0) return '已截止'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days}天${hours}小时`
  return `${hours}小时`
}

const loadBounty = async () => {
  try {
    loading.value = true
    // Mock data
    bounty.value = {
      id: bountyId.value || '1',
      title: '如何理解《易经》中的乾卦与坤卦的关系？',
      description: '最近在学习易经，对于乾卦和坤卦的关系有些困惑，希望有大师能够详细解答一下这两卦之间的联系和区别，以及在实际应用中如何把握。',
      amount: 100,
      status: 'open',
      poster: { id: '1', name: '学易新手', avatar: '' },
      answerCount: 3,
      viewCount: 156,
      category: '易经',
      tags: ['乾卦', '坤卦', '入门'],
      createdAt: '2024-01-15T10:00:00Z',
      expireAt: '2026-06-20T10:00:00Z',
    }
  } finally {
    loading.value = false
  }
}

// 图片上传
const addImage = () => {
  const remaining = 9 - images.value.length
  if (remaining <= 0) {
    error.value = '最多上传9张图片'
    return
  }
  uni.chooseImage({
    count: remaining,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      images.value = [...images.value, ...res.tempFilePaths]
      error.value = ''
    },
  })
}

const removeImage = (index: number) => {
  images.value.splice(index, 1)
}

const handleSubmit = async () => {
  if (!content.value.trim()) {
    error.value = '请输入回答内容'
    return
  }
  if (content.value.trim().length < 20) {
    error.value = '回答内容至少20字'
    return
  }

  try {
    submitting.value = true
    error.value = ''
    // Mock API call
    await new Promise((r) => setTimeout(r, 1000))
    uni.showToast({ title: '提交成功！', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  } catch {
    error.value = '提交失败，请重试'
  } finally {
    submitting.value = false
  }
}

onLoad((options) => {
  bountyId.value = options?.id || null
  loadBounty()
})
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
