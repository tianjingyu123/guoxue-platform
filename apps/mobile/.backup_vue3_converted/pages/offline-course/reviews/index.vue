<template>
  <view class="min-h-screen bg-background">
    <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack">
        <text class="text-foreground text-lg">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">课程评价</text>
      <text class="ml-auto text-xs text-muted-foreground">{{ reviews.length }} 条评价</text>
    </view>

    <!-- Rating summary -->
    <view class="mx-4 mt-4 p-4 bg-white border border-border rounded-xl flex gap-6">
      <view class="text-center flex-shrink-0">
        <text class="text-4xl font-black text-accent">{{ avgRating }}</text>
        <view class="flex gap-0.5 justify-center mt-1">
          <text v-for="s in 5" :key="s" :class="s <= Math.round(Number(avgRating)) ? 'text-accent' : 'text-muted-foreground'" class="text-xs">★</text>
        </view>
        <text class="text-xs text-muted-foreground mt-1 block">综合评分</text>
      </view>
      <view class="flex-1 space-y-1.5">
        <view v-for="d in ratingDist" :key="d.stars" class="flex items-center gap-2">
          <text class="text-xs text-muted-foreground w-4">{{ d.stars }}</text>
          <text class="text-accent text-xs">★</text>
          <view class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <view class="h-full bg-accent rounded-full" :style="{ width: d.pct + '%' }" />
          </view>
          <text class="text-xs text-muted-foreground w-5 text-right">{{ d.count }}</text>
        </view>
      </view>
    </view>

    <!-- Filter tabs -->
    <view class="flex gap-2 px-4 py-3 overflow-x-auto">
      <view v-for="f in filterTabs" :key="f.key" @click="filter = f.key" :class="['px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0', filter === f.key ? 'bg-primary text-white' : 'bg-muted text-foreground']">
        {{ f.label }}
      </view>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="px-4 space-y-4">
      <view v-for="i in 3" :key="i" class="p-4 bg-white border border-border rounded-xl">
        <view class="flex items-start gap-3 mb-3">
          <view class="w-9 h-9 rounded-full bg-muted" />
          <view class="flex-1">
            <view class="h-4 w-32 bg-muted rounded mb-2" />
            <view class="h-3 w-20 bg-muted rounded" />
          </view>
        </view>
        <view class="h-4 w-full bg-muted rounded mb-2" />
        <view class="h-4 w-3/4 bg-muted rounded mb-2" />
        <view class="h-4 w-1/2 bg-muted rounded" />
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="reviews.length === 0" class="flex flex-col items-center justify-center py-20">
      <text class="text-5xl mb-4"></text>
      <text class="text-base font-medium text-foreground mb-1">暂无评价</text>
      <text class="text-sm text-muted-foreground">快来成为第一个评价的人吧</text>
    </view>

    <!-- Review list -->
    <view v-else class="px-4 space-y-4" style="padding-bottom: calc(5rem + env(safe-area-inset-bottom, 12px))">
      <view v-for="review in filtered" :key="review.id" class="p-4 bg-white border border-border rounded-xl">
        <view class="flex items-start gap-3 mb-3">
          <view class="w-9 h-9 rounded-full flex-shrink-0 relative">
            <image v-if="!(review as any)._avatarError" :src="review.avatar" mode="aspectFill" class="w-9 h-9 rounded-full" @error="(review as any)._avatarError = true" />
            <view v-if="(review as any)._avatarError" class="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm">{{ review.user[0] }}</view>
          </view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center justify-between gap-2">
              <text class="text-sm font-medium text-foreground truncate">{{ review.user }}</text>
              <text class="text-[10px] text-muted-foreground flex-shrink-0">{{ review.date }}</text>
            </view>
            <view class="flex gap-0.5 mt-0.5">
              <text v-for="s in 5" :key="s" :class="s <= review.rating ? 'text-accent' : 'text-muted-foreground'" class="text-xs">★</text>
            </view>
          </view>
        </view>
        <text class="text-sm text-foreground leading-relaxed block mb-3">{{ review.content }}</text>
        <view class="flex flex-wrap gap-1 mb-3">
          <text v-for="tag in review.tags" :key="tag" class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{{ tag }}</text>
        </view>
        <view @click="toggleLike(review.id)" class="flex items-center gap-1 text-xs text-muted-foreground">
          <text :class="review.liked ? 'text-primary' : ''"></text>
          <text>有帮助 ({{ review.likes }})</text>
        </view>
      </view>
      <text v-if="filtered.length === 0" class="text-center text-sm text-muted-foreground py-12 block">暂无该评分的评价</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)

onMounted(() => {
  setTimeout(() => { loading.value = false }, 500)
})

type StarFilter = 'all' | '5' | '4' | '3' | '2' | '1'

interface Review {
  id: string; user: string; avatar: string; rating: number
  content: string; date: string; likes: number; liked: boolean; tags: string[]
}

const initialReviews: Review[] = [
  { id: '1', user: '命理爱好者张三', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60', rating: 5, content: '课程内容非常系统，从基础到进阶循序渐进。讲师经验丰富，结合大量实际案例讲解，让我对八字命理有了全新的理解。强烈推荐！', date: '2024-01-20', likes: 48, liked: true, tags: ['内容丰富', '讲师专业', '物超所值'] },
  { id: '2', user: '学员李四', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60', rating: 5, content: '参加了两天的线下课程，收获满满。讲师不仅理论扎实，实战案例分析也非常精彩，现场互动环节解答了很多困惑已久的问题。', date: '2024-01-18', likes: 36, liked: false, tags: ['互动性强', '案例丰富'] },
  { id: '3', user: '王五', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60', rating: 4, content: '整体课程质量不错，讲师讲解清晰。唯一的建议是课程节奏可以稍慢一点，有些知识点希望能多加练习。期待下一次课程！', date: '2024-01-15', likes: 22, liked: false, tags: ['讲解清晰'] },
  { id: '4', user: '赵六', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60', rating: 5, content: '这门线下课程彻底改变了我对命理学的看法。在讲师的系统讲解下发现其中确实蕴含着深刻的哲学思想。', date: '2024-01-12', likes: 61, liked: true, tags: ['改变认知', '深度好课'] },
  { id: '5', user: '钱七', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60', rating: 4, content: '课程安排合理，教学材料很用心，配套的学习手册做得很精良。场地设施也很好，整体体验非常满意。', date: '2024-01-10', likes: 15, liked: false, tags: ['配套完善', '场地好'] },
  { id: '6', user: '孙八', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60', rating: 3, content: '内容本身不错，但感觉时间有点赶，两天课程塞了太多内容，初学者可能难以消化。希望后续能提供复习资料和在线答疑。', date: '2024-01-08', likes: 9, liked: false, tags: ['节奏偏快'] },
]

const ratingDist = [
  { stars: 5, count: 42, pct: 70 },
  { stars: 4, count: 14, pct: 23 },
  { stars: 3, count: 3, pct: 5 },
  { stars: 2, count: 1, pct: 2 },
  { stars: 1, count: 0, pct: 0 },
]

const filterTabs = [
  { key: 'all' as StarFilter, label: '全部' },
  { key: '5' as StarFilter, label: '5星' },
  { key: '4' as StarFilter, label: '4星' },
  { key: '3' as StarFilter, label: '3星' },
]

const reviews = ref<Review[]>(initialReviews)
const filter = ref<StarFilter>('all')

const avgRating = (initialReviews.reduce((s, r) => s + r.rating, 0) / initialReviews.length).toFixed(1)

const filtered = computed(() =>
  filter.value === 'all' ? reviews.value : reviews.value.filter(r => r.rating === Number(filter.value))
)

function toggleLike(id: string) {
  const r = reviews.value.find(r => r.id === id)
  if (r) {
    r.liked = !r.liked
    r.likes = r.liked ? r.likes + 1 : r.likes - 1
  }
}

function goBack() { uni.navigateBack() }
</script>
