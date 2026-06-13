<template>
  <view class="min-h-screen bg-background">
    <!-- Header -->
    <view class="sticky top-0 z-10 bg-background/95 border-b border-border flex items-center px-4 h-12 gap-3" style="backdrop-filter:blur(12px)">
      <view @click="goBack">
        <text class="text-xl text-foreground">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">课程评价管理</text>
    </view>

    <!-- Stats -->
    <view class="mx-4 mt-4 grid grid-cols-3 gap-3">
      <view v-for="s in stats" :key="s.label" class="text-center p-3 bg-white border border-border rounded-xl">
        <text class="text-xl font-black text-foreground block">{{ s.value }}</text>
        <text class="text-[10px] text-muted-foreground block mt-0.5">{{ s.label }}</text>
      </view>
    </view>

    <!-- Filter -->
    <view class="flex gap-2 px-4 py-3">
      <view v-for="f in filterOptions" :key="f.key" @click="filter=f.key"
        :class="'px-3 py-1.5 rounded-full text-xs font-medium transition-colors ' + (filter===f.key ? 'bg-primary text-white' : 'bg-[#F0EDE8] text-foreground')">
        <text>{{ f.label }}</text>
      </view>
    </view>

    <!-- Review List -->
    <view class="px-4 pb-20 space-y-3">
      <view v-for="review in filtered" :key="review.id"
        :class="'p-4 bg-white border rounded-xl ' + (review.flagged ? 'border-accent/60' : 'border-border')">
        <view class="flex items-start gap-3 mb-2">
          <!-- Avatar with image and fallback -->
          <image v-if="!review.avatarError" class="w-8 h-8 rounded-full flex-shrink-0" :src="review.avatar" mode="aspectFill" @error="review.avatarError = true" />
          <view v-else class="w-8 h-8 rounded-full bg-[#F0EDE8] flex items-center justify-center text-xs text-foreground flex-shrink-0">
            <text>{{ review.user[0] }}</text>
          </view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center justify-between">
              <text class="text-sm font-medium text-foreground">{{ review.user }}</text>
              <text class="text-[10px] text-muted-foreground">{{ review.date }}</text>
            </view>
            <!-- Star Rating -->
            <view class="flex gap-0.5">
              <text v-for="s in 5" :key="s" :class="s <= review.rating ? 'text-accent' : 'text-[#E8E0D5]'">&#9733;</text>
            </view>
          </view>
        </view>

        <text class="text-sm text-foreground leading-relaxed block mb-3">{{ review.content }}</text>

        <!-- Teacher Reply -->
        <view v-if="review.replied && review.reply" class="bg-[#F0EDE8]/40 rounded-lg p-3 mb-3">
          <text class="text-xs font-medium text-primary block mb-1">讲师回复</text>
          <text class="text-xs text-foreground leading-relaxed block">{{ review.reply }}</text>
        </view>

        <!-- Reply Textarea -->
        <view v-if="replyingId === review.id" class="mb-3">
          <textarea v-model="replyText" placeholder="输入回复内容..."
            class="w-full min-h-[80px] px-3 py-2 text-xs bg-background border border-border rounded-lg resize-none box-border"
            style="outline:none" />
          <view class="flex gap-2 mt-2">
            <view @click="replyingId=null;replyText=''" class="flex-1 py-1.5 text-xs text-muted-foreground border border-border rounded-lg text-center">取消</view>
            <view @click="submitReply(review.id)" class="flex-1 py-1.5 text-xs text-white bg-primary rounded-lg text-center">发送回复</view>
          </view>
        </view>

        <!-- Actions -->
        <view class="flex gap-3">
          <text v-if="!review.replied && replyingId!==review.id" @click="replyingId=review.id;replyText=''" class="flex items-center gap-1 text-xs text-primary">
            <text></text>回复
          </text>
          <text @click="toggleFlag(review.id)" :class="'flex items-center gap-1 text-xs ' + (review.flagged ? 'text-accent' : 'text-muted-foreground')">
            <text>🚩</text>
            {{ review.flagged ? '已标记' : '标记' }}
          </text>
          <text class="ml-auto text-xs text-muted-foreground flex items-center gap-1">📈{{ review.likes }} 有帮助</text>
        </view>
      </view>

      <!-- Empty State -->
      <text v-if="filtered.length===0" class="text-center text-sm text-muted-foreground block py-12">暂无相关评价</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Review {
  id: string
  user: string
  avatar: string
  rating: number
  content: string
  date: string
  likes: number
  replied: boolean
  reply?: string
  flagged: boolean
  avatarError?: boolean
}

const reviews = ref<Review[]>([
  { id: '1', user: '张三', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60', rating: 5, content: '非常棒的课程，内容详尽，讲师专业，强烈推荐！', date: '2024-01-20', likes: 24, replied: true, reply: '感谢您的好评！您的支持是我持续创作的动力。', flagged: false, avatarError: false },
  { id: '2', user: '李四', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60', rating: 4, content: '课程内容很好，如果能多些互动环节就更完美了。', date: '2024-01-18', likes: 12, replied: false, flagged: false, avatarError: false },
  { id: '3', user: '王五', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60', rating: 3, content: '内容一般，和描述有些出入，期望能够更新优化。', date: '2024-01-15', likes: 5, replied: false, flagged: false, avatarError: false },
  { id: '4', user: '赵六', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60', rating: 5, content: '物超所值！每一节课都有实质性收获，值得反复观看。', date: '2024-01-12', likes: 31, replied: true, reply: '谢谢您的认可，后续还会更新更多精彩内容！', flagged: false, avatarError: false },
  { id: '5', user: '钱七', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60', rating: 2, content: '讲师语速太快，很难跟上。希望能有字幕辅助。', date: '2024-01-10', likes: 8, replied: false, flagged: false, avatarError: false },
])

const filter = ref<'all' | 'unreplied' | 'flagged'>('all')
const replyingId = ref<string | null>(null)
const replyText = ref('')

const filterOptions = [
  { key: 'all', label: '全部评价' },
  { key: 'unreplied', label: '待回复' },
  { key: 'flagged', label: '已标记' },
]

const filtered = computed(() => {
  if (filter.value === 'unreplied') return reviews.value.filter(r => !r.replied)
  if (filter.value === 'flagged') return reviews.value.filter(r => r.flagged)
  return reviews.value
})

const avgRating = computed(() => (reviews.value.reduce((s, r) => s + r.rating, 0) / reviews.value.length).toFixed(1))

const stats = computed(() => [
  { label: '综合评分', value: avgRating.value, sub: '满分 5.0' },
  { label: '评价总数', value: reviews.value.length, sub: '条' },
  { label: '待回复', value: reviews.value.filter(r => !r.replied).length, sub: '条' },
])

function submitReply(id: string) {
  if (!replyText.value.trim()) return
  const idx = reviews.value.findIndex(r => r.id === id)
  if (idx >= 0) {
    reviews.value[idx] = { ...reviews.value[idx], replied: true, reply: replyText.value }
  }
  replyingId.value = null
  replyText.value = ''
}

function toggleFlag(id: string) {
  const idx = reviews.value.findIndex(r => r.id === id)
  if (idx >= 0) {
    reviews.value[idx] = { ...reviews.value[idx], flagged: !reviews.value[idx].flagged }
  }
}

function goBack() { uni.navigateBack() }
</script>
