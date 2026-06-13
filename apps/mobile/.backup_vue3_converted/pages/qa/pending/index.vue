<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center h-14 px-4">
        <view class="p-2 -ml-2" @click="goBack">
          <text class="text-xl">←</text>
        </view>
        <text class="flex-1 text-center font-semibold">待回答问题</text>
        <view class="w-9" />
      </view>
    </view>

    <!-- 统计数据 -->
    <view class="p-4">
      <view class="rounded-2xl p-4" style="background: linear-gradient(to right, rgba(196,30,58,0.1), rgba(196,30,58,0.05))">
        <view class="flex items-center gap-6">
          <view class="text-center">
            <text class="text-2xl font-bold text-primary block">{{ pendingQuestions.length }}</text>
            <text class="text-xs text-muted-foreground mt-1 block">待回答</text>
          </view>
          <view class="w-px h-10 bg-[#E8E0D5]" />
          <view class="text-center">
            <text class="text-2xl font-bold text-amber-500 block">{{ urgentCount }}</text>
            <text class="text-xs text-muted-foreground mt-1 block">即将过期</text>
          </view>
          <view class="w-px h-10 bg-[#E8E0D5]" />
          <view class="text-center">
            <text class="text-2xl font-bold text-green-600 block">¥{{ totalEarning }}</text>
            <text class="text-xs text-muted-foreground mt-1 block">待赚取</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Loading骨架 -->
    <view v-if="loading" class="p-4 space-y-4">
      <view v-for="i in 3" :key="i" class="bg-card rounded-2xl p-4" style="animation: pulse 2s infinite">
        <view class="flex items-center gap-3 mb-3">
          <view class="w-10 h-10 bg-muted rounded-full" />
          <view class="flex-1">
            <view class="h-4 bg-muted rounded w-24 mb-2" />
            <view class="h-3 bg-muted rounded w-32" />
          </view>
        </view>
        <view class="h-5 bg-muted rounded w-full mb-2" />
        <view class="h-4 bg-muted rounded w-3/4" />
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="questions.length === 0" class="flex flex-col items-center justify-center py-20">
      <view class="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
        <text class="text-3xl"></text>
      </view>
      <text class="text-muted-foreground mb-2">暂无待回答问题</text>
      <text class="text-sm text-muted-foreground">设置更合理的价格可获得更多提问</text>
    </view>

    <!-- 问题列表 -->
    <view v-else class="p-4 space-y-6">
      <!-- 待回答部分 -->
      <view v-if="pendingQuestions.length > 0">
        <text class="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <text>🕐</text>
          待回答 ({{ pendingQuestions.length }})
        </text>
        <view class="space-y-3">
          <view v-for="question in pendingQuestions" :key="question.id" class="bg-card rounded-2xl p-4 transition-all" :class="getTimeRemaining(question.expireAt).isUrgent ? 'border border-red-200 bg-red-50/50' : ''" @click="goToDetail(question.id)">
            <!-- 头部 -->
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-3">
                <image :src="question.asker.avatar" mode="aspectFill" class="w-10 h-10 rounded-full" />
                <view>
                  <text class="font-medium text-sm block">{{ question.asker.name }}</text>
                  <text class="text-xs text-muted-foreground">{{ formatSimpleDate(question.createdAt) }}</text>
                </view>
              </view>
              <view class="flex items-center gap-2">
                <view class="flex items-center gap-1 text-xs px-2 py-1 rounded-full" :class="getTimeRemaining(question.expireAt).isUrgent ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'">
                  <text class="text-xs">🕐</text>
                  <text>剩余 {{ getTimeRemaining(question.expireAt).text }}</text>
                </view>
              </view>
            </view>
            <!-- 问题 -->
            <text class="font-medium block mb-2" style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical">{{ question.title }}</text>
            <text class="text-sm text-muted-foreground block mb-3" style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical">{{ question.content }}</text>
            <!-- 底部 -->
            <view class="flex items-center justify-between">
              <view class="flex items-center gap-3">
                <view class="flex items-center gap-1 text-primary font-semibold">
                  <text class="text-xs"></text>
                  <text>¥{{ question.price }}</text>
                </view>
                <text v-if="question.isPublic" class="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">公开</text>
                <text v-else class="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">私密</text>
              </view>
              <view class="flex items-center gap-1 text-primary text-sm">
                <text>去回答</text>
                <text>›</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 已过期部分 -->
      <view v-if="expiredQuestions.length > 0">
        <text class="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <text class="text-red-500">⚠</text>
          已过期 ({{ expiredQuestions.length }})
        </text>
        <view class="space-y-3">
          <view v-for="question in expiredQuestions" :key="question.id" class="bg-card rounded-2xl p-4 border border-transparent" style="opacity: 0.6">
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-3">
                <image :src="question.asker.avatar" mode="aspectFill" class="w-10 h-10 rounded-full" style="filter: grayscale(1)" />
                <view>
                  <text class="font-medium text-sm block">{{ question.asker.name }}</text>
                  <text class="text-xs text-muted-foreground">{{ formatSimpleDate(question.createdAt) }}</text>
                </view>
              </view>
              <text class="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">已过期</text>
            </view>
            <text class="font-medium block mb-2" style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical">{{ question.title }}</text>
            <view class="flex items-center gap-2 text-sm text-muted-foreground">
              <text style="text-decoration: line-through">¥{{ question.price }}</text>
              <text>·</text>
              <text>已退款给提问者</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 温馨提示 -->
    <view class="p-4 pb-20">
      <view class="bg-amber-50 rounded-xl p-4">
        <text class="font-medium text-amber-800 mb-2 flex items-center gap-2">
          <text>⚠</text>
          温馨提示
        </text>
        <view class="text-sm text-amber-700 space-y-1">
          <text class="block">· 请在有效期内回答问题，过期将自动退款</text>
          <text class="block">· 认真回答可获得好评，提升您的曝光度</text>
          <text class="block">· 私密问答仅提问者可见，请放心回答</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Question {
  id: string
  title: string
  content: string
  price: number
  status: string
  expireAt: string
  createdAt: string
  isPublic: boolean
  asker: { id: string; name: string; avatar: string }
  answerer?: { id: string; name: string; avatar: string }
}

const questions = ref<Question[]>([])
const loading = ref(true)
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  loadQuestions()
  timer = setInterval(() => { now.value = Date.now() }, 60000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const loadQuestions = async () => {
  loading.value = true
  try {
    // TODO: 调用 questionApi.list({ status: 'pending' })
    await new Promise(r => setTimeout(r, 500))
    questions.value = [
      {
        id: '1', title: '八字中比肩和劫财的区别是什么？', content: '不太清楚这两者的区别，希望有大师解答。', price: 68,
        status: 'pending', expireAt: new Date(Date.now() + 3600000 * 5).toISOString(), createdAt: new Date(Date.now() - 7200000).toISOString(),
        isPublic: true, asker: { id: 'u1', name: '国学爱好者', avatar: '/static/default-avatar.png' }
      },
      {
        id: '2', title: '这个八字是身强还是身弱？请大师指点', content: '甲子 丙寅 壬午 庚戌，请大师帮忙看看这个八字的身强弱。', price: 88,
        status: 'pending', expireAt: new Date(Date.now() + 86400000 * 2).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString(),
        isPublic: false, asker: { id: 'u2', name: '命理新手', avatar: '/static/default-avatar.png' }
      },
      {
        id: '3', title: '请问从格怎么判断？有哪些条件？', content: '最近在学习从格，想了解一下从格的具体判断条件和分类。', price: 50,
        status: 'pending', expireAt: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        isPublic: true, asker: { id: 'u3', name: '求学问道', avatar: '/static/default-avatar.png' }
      },
    ]
  } catch (error) {
    console.error('Failed to load questions:', error)
  } finally {
    loading.value = false
  }
}

function getTimeRemaining(expireAt: string): { text: string; isUrgent: boolean; isExpired: boolean } {
  const diff = new Date(expireAt).getTime() - now.value
  if (diff <= 0) return { text: '已过期', isUrgent: true, isExpired: true }
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours < 1) return { text: `${minutes}分钟`, isUrgent: true, isExpired: false }
  if (hours < 24) return { text: `${hours}小时${minutes}分钟`, isUrgent: true, isExpired: false }
  const days = Math.floor(hours / 24)
  return { text: `${days}天${hours % 24}小时`, isUrgent: false, isExpired: false }
}

const pendingQuestions = computed(() => questions.value.filter(q => new Date(q.expireAt).getTime() - now.value > 0))
const expiredQuestions = computed(() => questions.value.filter(q => new Date(q.expireAt).getTime() - now.value <= 0))
const urgentCount = computed(() => pendingQuestions.value.filter(q => getTimeRemaining(q.expireAt).isUrgent).length)
const totalEarning = computed(() => pendingQuestions.value.reduce((sum, q) => sum + q.price, 0))

function goBack() { uni.navigateBack() }

function formatSimpleDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function goToDetail(id: string) {
  uni.navigateTo({ url: `/pages/qa/id-detail/index?id=${id}` })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
