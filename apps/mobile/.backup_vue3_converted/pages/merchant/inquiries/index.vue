<template>
  <view class="min-h-screen bg-background">
    <!-- 列表视图 -->
    <template v-if="!selectedInquiry">
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-10 bg-white border-b border-border">
        <view class="flex items-center justify-between px-4 py-3">
          <view @click="goBack" class="p-1">
            <text class="text-2xl text-foreground">&#8592;</text>
          </view>
          <text class="text-lg font-semibold text-foreground">咨询管理</text>
          <view class="w-8" />
        </view>
      </view>

      <view class="pb-20">
        <!-- 统计 -->
        <view class="mx-4 mt-4 grid grid-cols-3 gap-3">
          <view class="bg-white rounded-xl p-3 text-center shadow-sm">
            <text class="text-2xl font-bold text-foreground block">{{ inquiries.length }}</text>
            <text class="text-xs text-muted-foreground mt-1 block">总咨询</text>
          </view>
          <view class="bg-white rounded-xl p-3 text-center shadow-sm border border-orange-200 bg-orange-50">
            <text class="text-2xl font-bold text-orange-600 block">{{ unansweredCount }}</text>
            <text class="text-xs text-orange-700 mt-1 block">待回答</text>
          </view>
          <view class="bg-white rounded-xl p-3 text-center shadow-sm border border-green-200 bg-green-50">
            <text class="text-2xl font-bold text-green-600 block">{{ inquiries.filter(i => i.status === 'answered').length }}</text>
            <text class="text-xs text-green-700 mt-1 block">已回答</text>
          </view>
        </view>

        <!-- 筛选 -->
        <view class="mx-4 mt-4 flex gap-2">
          <view v-for="f in filters" :key="f.key" @click="filter = f.key" :class="['px-3 py-1.5 rounded-full text-sm font-medium transition-colors', filter === f.key ? 'bg-primary text-white' : 'bg-muted text-ink-soft']">
            <text>{{ f.label }}</text>
          </view>
        </view>

        <!-- 咨询列表 -->
        <view class="mx-4 mt-4 space-y-2">
          <view v-for="inquiry in filteredInquiries" :key="inquiry.id" @click="selectedInquiry = inquiry" class="w-full p-4 rounded-xl border border-border bg-white transition-all">
            <view class="flex items-start justify-between mb-2">
              <view class="flex-1">
                <text class="font-semibold text-foreground line-clamp-1 block">{{ inquiry.productName }}</text>
                <view class="flex items-center gap-2 mt-1">
                  <text class="text-xs text-muted-foreground flex items-center gap-1">&#128100; {{ inquiry.customer }}</text>
                  <text class="text-xs text-muted-foreground flex items-center gap-1">&#128339; {{ inquiry.time }}</text>
                </view>
              </view>
              <text :class="['px-2 py-0.5 rounded text-xs', inquiry.status === 'answered' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800']">
                {{ inquiry.status === 'answered' ? '已回答' : '待回答' }}
              </text>
            </view>
            <text class="text-sm text-ink-soft line-clamp-2 block">{{ inquiry.question }}</text>
            <text v-if="inquiry.status === 'unanswered'" class="mt-2 flex items-center gap-1 text-xs text-orange-600">&#9888;&#65039; 待您回复</text>
          </view>

          <!-- 空状态 -->
          <view v-if="filteredInquiries.length === 0" class="bg-white rounded-2xl p-8 text-center">
            <view class="flex items-center justify-center gap-2 mb-2">
              <text class="text-muted-foreground text-2xl">&#128172;</text>
            </view>
            <text class="text-muted-foreground">暂无咨询</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 详情视图 -->
    <template v-else>
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-10 bg-white border-b border-border">
        <view class="flex items-center justify-between px-4 py-3">
          <view @click="selectedInquiry = null" class="p-1">
            <text class="text-2xl text-foreground">&#8592;</text>
          </view>
          <text class="text-lg font-semibold text-foreground">咨询详情</text>
          <view class="w-8" />
        </view>
      </view>

      <view class="pb-24">
        <!-- 商品信息 -->
        <view class="mx-4 mt-4 p-4 bg-muted/50 rounded-xl">
          <text class="text-sm text-muted-foreground mb-1 block">商品</text>
          <text class="font-semibold">{{ selectedInquiry.productName }}</text>
        </view>

        <!-- 客户信息 -->
        <view class="mx-4 mt-3 p-4 bg-white rounded-xl border border-border flex items-center gap-3 shadow-sm">
          <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <text class="text-xl text-primary">&#128100;</text>
          </view>
          <view class="flex-1">
            <text class="font-semibold block">{{ selectedInquiry.customer }}</text>
            <text class="text-xs text-muted-foreground flex items-center gap-1 mt-1">&#128339; {{ selectedInquiry.time }}</text>
          </view>
          <text :class="['px-2 py-0.5 rounded text-xs', selectedInquiry.status === 'answered' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800']">
            {{ selectedInquiry.status === 'answered' ? '已回答' : '待回答' }}
          </text>
        </view>

        <!-- 客户问题 -->
        <view class="mx-4 mt-4">
          <text class="text-sm font-semibold text-foreground mb-3 block">客户问题</text>
          <view class="bg-white rounded-xl p-4 shadow-sm">
            <text class="text-foreground leading-relaxed">{{ selectedInquiry.question }}</text>
          </view>
        </view>

        <!-- 已有回复 -->
        <view v-if="selectedInquiry.answer" class="mx-4 mt-4">
          <text class="text-sm font-semibold text-foreground mb-3 block">您的回复</text>
          <view class="bg-white rounded-xl p-4 shadow-sm border border-primary/20 bg-primary/5">
            <view class="flex items-center gap-2 mb-2">
              <text class="text-green-600">&#10004;&#65039;</text>
              <text class="text-xs text-green-600 font-medium">已回复</text>
            </view>
            <text class="text-foreground leading-relaxed">{{ selectedInquiry.answer }}</text>
          </view>
        </view>

        <!-- 回复表单 -->
        <view v-if="selectedInquiry.status === 'unanswered'" class="mx-4 mt-6">
          <text class="text-sm font-semibold text-foreground mb-3 block">写回复</text>
          <view class="space-y-3">
            <textarea v-model="replyText" placeholder="请输入您的回复内容..." rows="4" class="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm" />
            <view @click="handleReply" :class="['w-full py-3 rounded-xl text-center text-sm font-medium', !replyText.trim() || isReplying ? 'opacity-50' : '', replyText.trim() && !isReplying ? 'bg-primary text-white' : 'bg-primary text-white']">{{ isReplying ? '提交中...' : '提交回复' }}</view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Inquiry {
  id: string
  productName: string
  customer: string
  status: string
  question: string
  answer?: string
  time: string
  replies: number
}

const mockInquiries: Inquiry[] = [
  { id: '1', productName: '《渊海子平》古籍影印本', customer: '张女士', status: 'unanswered', question: '请问这本书有电子版吗？能否快递到偏远地区？', time: '2024-01-20 14:30', replies: 0 },
  { id: '2', productName: '紫砂茶具套装', customer: '李先生', status: 'answered', question: '这套茶具是纯手工制作吗？有发票吗？', answer: '是的，全部由我们的手工艺人制作，购买时可提供发票。', time: '2024-01-20 10:15', replies: 1 },
  { id: '3', productName: '八字算命初学者套装', customer: '王女士', status: 'unanswered', question: '是否有退货政策？如果不满意可以退吗？', time: '2024-01-19 16:45', replies: 0 },
  { id: '4', productName: '国学经典诵读课程', customer: '陈先生', status: 'answered', question: '课程有效期是多久？可以重复学习吗？', answer: '课程一次购买终身有效，您可以随时重复学习。', time: '2024-01-19 09:20', replies: 2 },
  { id: '5', productName: '香道入门套装', customer: '赵女士', status: 'answered', question: '香道入门需要什么基础吗？', answer: '无需任何基础，我们的课程从零开始教学，包含详细的视频讲解。', time: '2024-01-18 14:10', replies: 1 },
]

const filters = [
  { key: 'all', label: '全部' },
  { key: 'unanswered', label: '待回答' },
  { key: 'answered', label: '已回答' },
]

const inquiries = ref(mockInquiries)
const filter = ref('all')
const selectedInquiry = ref<Inquiry | null>(null)
const replyText = ref('')
const isReplying = ref(false)

const unansweredCount = computed(() => inquiries.value.filter(i => i.status === 'unanswered').length)

const filteredInquiries = computed(() => {
  if (filter.value === 'all') return inquiries.value
  return inquiries.value.filter(i => i.status === filter.value)
})

async function handleReply() {
  if (!replyText.value.trim() || !selectedInquiry.value) return
  isReplying.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))
  const idx = inquiries.value.findIndex(i => i.id === selectedInquiry.value!.id)
  if (idx >= 0) {
    inquiries.value[idx] = { ...inquiries.value[idx], status: 'answered', answer: replyText.value, replies: inquiries.value[idx].replies + 1 }
  }
  selectedInquiry.value = null
  replyText.value = ''
  isReplying.value = false
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
