<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center px-4 h-12">
        <view @click="goBack" class="p-1">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="text-base font-semibold ml-3 text-foreground">直播评价</text>
      </view>
    </view>

    <view class="p-4 space-y-4">
      <!-- 统计卡片 -->
      <view class="bg-white rounded-xl p-4 border border-border">
        <view class="flex gap-4">
          <view class="text-center flex-shrink-0">
            <text class="text-4xl font-black text-accent">{{ avgRating }}</text>
            <star-row :rating="Math.round(Number(avgRating))" />
            <text class="text-xs text-muted-foreground block mt-1">{{ totalCount }} 条评价</text>
          </view>
          <view class="flex-1 space-y-1">
            <view v-for="d in dist" :key="d.star" class="flex items-center gap-2 text-xs text-muted-foreground">
              <text class="text-accent flex-shrink-0">★</text>
              <text>{{ d.star }}</text>
              <view class="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <view class="h-full bg-accent rounded-full" :style="{ width: d.pct + '%' }" />
              </view>
              <text class="w-6 text-right">{{ d.pct }}%</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 筛选胶囊 -->
      <view class="flex gap-2 overflow-x-auto" style="scrollbar-width:none">
        <view
          v-for="f in filters" :key="f.key"
          @click="filter = f.key"
          :class="['px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0', filter === f.key ? 'bg-primary text-white' : 'bg-secondary text-foreground']"
        >
          {{ f.label }}
        </view>
      </view>

      <!-- 评价列表 -->
      <view v-if="filtered.length === 0" class="flex flex-col items-center justify-center py-16">
        <text class="text-5xl mb-3 opacity-30"></text>
        <text class="text-sm text-muted-foreground">暂无符合条件的评价</text>
      </view>

      <view v-else class="space-y-3">
        <view v-for="review in filtered" :key="review.id" :class="['bg-white rounded-xl p-4 border', review.flagged ? 'border-accent/60' : 'border-border']">
          <!-- 用户信息 -->
          <view class="flex items-start justify-between gap-2 mb-2">
            <view class="flex items-center gap-2">
              <view class="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground flex-shrink-0">
                <text>{{ review.user[0] }}</text>
              </view>
              <view>
                <text class="text-sm font-medium text-foreground block">{{ review.user }}</text>
                <star-row :rating="review.rating" />
              </view>
            </view>
            <text class="text-xs text-muted-foreground">{{ review.time }}</text>
          </view>

          <text class="text-sm text-foreground block mb-1.5">{{ review.content }}</text>
          <text class="text-xs text-muted-foreground block mb-3">场次：{{ review.live }}</text>

          <!-- 已有回复 -->
          <view v-if="replies[review.id]" class="bg-secondary rounded-lg p-2.5 mb-2">
            <text class="text-xs text-muted-foreground block mb-0.5">我的回复：</text>
            <text class="text-xs text-foreground">{{ replies[review.id] }}</text>
          </view>

          <!-- 回复输入框 -->
          <view v-if="replyId === review.id" class="mt-2 space-y-2">
            <textarea
              v-model="replyText"
              placeholder="输入回复内容..."
              class="w-full min-h-[72px] px-3 py-2 text-xs bg-white border border-border rounded-lg resize-none"
              placeholder-style="color:#999"
            />
            <view class="flex gap-2">
              <view @click="cancelReply" class="flex-1 py-1.5 text-xs text-muted-foreground bg-secondary rounded-lg text-center">取消</view>
              <view @click="submitReply(review.id)" class="flex-1 py-1.5 text-xs text-white bg-primary rounded-lg text-center">发布回复</view>
            </view>
          </view>

          <!-- 操作区 -->
          <view v-if="replyId !== review.id" class="flex items-center gap-4 pt-1">
            <view @click="startReply(review.id)" class="flex items-center gap-1 text-xs text-muted-foreground">
              <text></text>
              <text>{{ replies[review.id] ? '修改回复' : '回复' }}</text>
            </view>
            <view :class="['flex items-center gap-1 text-xs', review.flagged ? 'text-accent' : 'text-muted-foreground']">
              <text>🚩</text>
              <text>标记</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="h-8" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type Filter = 'all' | '5' | '4' | '3' | 'replied' | 'pending'

const filter = ref<Filter>('all')
const replyId = ref<string | null>(null)
const replyText = ref('')

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: '5', label: '5星' },
  { key: '4', label: '4星' },
  { key: '3', label: '3星及以下' },
  { key: 'pending', label: '待回复' },
  { key: 'replied', label: '已回复' },
]

const dist = [
  { star: 5, pct: 72, count: 184 },
  { star: 4, pct: 18, count: 46 },
  { star: 3, pct: 6, count: 15 },
  { star: 2, pct: 2, count: 6 },
  { star: 1, pct: 2, count: 4 },
]

interface Review { id: string; user: string; rating: number; content: string; live: string; time: string; flagged: boolean }

const reviews: Review[] = [
  { id: '1', user: '山河客', rating: 5, content: '讲得非常细致，八字命盘分析深入浅出，对我帮助很大！', live: '八字命理精讲第12课', time: '2天前', flagged: false },
  { id: '2', user: '星空旅人', rating: 5, content: '老师解盘思路清晰，案例丰富，值得反复观看。', live: '紫微斗数专题', time: '3天前', flagged: false },
  { id: '3', user: '云上墨', rating: 4, content: '内容很好，就是有些地方讲得稍快，建议放慢一点。', live: '紫微斗数专题', time: '4天前', flagged: false },
  { id: '4', user: '问道者', rating: 3, content: '普通，没太多新意，期望更深入的内容。', live: '奇门遁甲入门', time: '5天前', flagged: false },
  { id: '5', user: '墨言先生', rating: 5, content: '这是我看过的最好的命理直播，强烈推荐！', live: '风水堂第8课', time: '1周前', flagged: false },
]

const replies = ref<Record<string, string>>({
  '1': '感谢支持！希望对你有所帮助。',
  '3': '感谢建议，后续会注意节奏。',
})

const totalCount = computed(() => dist.reduce((s, d) => s + d.count, 0))
const avgRating = computed(() => (dist.reduce((s, d) => s + d.star * d.count, 0) / totalCount.value).toFixed(1))

const filtered = computed(() => reviews.filter(r => {
  if (filter.value === 'all') return true
  if (filter.value === 'pending') return !replies.value[r.id]
  if (filter.value === 'replied') return !!replies.value[r.id]
  return String(r.rating) === filter.value
}))

function startReply(id: string) {
  replyId.value = id
  replyText.value = ''
}

function cancelReply() {
  replyId.value = null
  replyText.value = ''
}

function submitReply(id: string) {
  if (!replyText.value.trim()) return
  replies.value = { ...replies.value, [id]: replyText.value }
  replyId.value = null
  replyText.value = ''
}

function goBack() { uni.navigateBack() }
</script>
