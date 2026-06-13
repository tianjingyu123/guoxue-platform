<template>
  <view class="min-h-screen bg-background pb-4">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-white/95 border-b border-border" style="backdrop-filter:blur(10px)">
      <view class="flex items-center justify-between px-4 h-12">
        <view class="w-8 h-8 flex items-center justify-center" hover-class="opacity-70" @click="goBack">
          <text class="text-xl" style="color:#2C2C2C">←</text>
        </view>
        <text class="font-semibold text-base" style="color:#2C2C2C">商品评价</text>
        <view class="w-9" />
      </view>
    </view>

    <!-- 评价总览 -->
    <view class="px-4 py-5" style="background:linear-gradient(135deg, rgba(201,169,110,0.1), #fff, rgba(196,30,58,0.05))">
      <view class="flex items-center gap-6">
        <view class="text-center">
          <text class="text-4xl font-bold" style="color:#C41E3A">{{ goodRatePercent }}%</text>
          <text class="text-xs mt-1 block" style="color:#999">好评率</text>
        </view>
        <view class="flex-1">
          <view class="flex items-center gap-1 mb-2">
            <text v-for="s in 5" :key="s" class="text-sm" style="color:#C9A96E">★</text>
            <text class="text-sm ml-1" style="color:#2C2C2C">4.9</text>
          </view>
          <text class="text-sm" style="color:#999">共 {{ totalReviews }} 条评价</text>
        </view>
      </view>
    </view>

    <!-- 评价标签筛选 -->
    <view class="px-4 py-3 border-b overflow-x-auto" style="border-color:#E8E0D5">
      <scroll-view scroll-x class="flex gap-2" enhanced show-scrollbar="false">
        <view
          v-for="tag in reviewTags"
          :key="tag.id"
          class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          :class="selectedTag === tag.id ? '' : ''"
          :style="selectedTag === tag.id ? 'background-color:#C41E3A;color:#fff' : 'background-color:#F5F1EB;color:#2C2C2C'"
          hover-class="opacity-80"
          @click="selectedTag = tag.id"
        >
          <text>{{ tag.label }}({{ tag.count }})</text>
        </view>
      </scroll-view>
    </view>

    <!-- 排序栏 -->
    <view class="px-4 py-2 flex items-center justify-between border-b" style="border-color:#E8E0D5">
      <text class="text-sm" style="color:#999">共 {{ sortedReviews.length }} 条评价</text>
      <view class="relative">
        <view class="flex items-center gap-1 text-sm" style="color:#2C2C2C" @click="showSortMenu = !showSortMenu">
          <text>{{ sortOptions.find(o => o.id === sortBy)?.label }}</text>
          <text class="text-xs transition-transform" :class="showSortMenu ? 'rotate-180' : ''">▾</text>
        </view>
        <!-- 排序下拉 -->
        <view v-if="showSortMenu" class="fixed inset-0 z-10" @click="showSortMenu = false" />
        <view
          v-if="showSortMenu"
          class="absolute right-0 top-8 z-20 w-28 rounded-lg shadow-lg overflow-hidden"
          style="background-color:#fff;border:1px solid #E8E0D5"
        >
          <view
            v-for="option in sortOptions"
            :key="option.id"
            class="w-full px-3 py-2 text-sm"
            :style="sortBy === option.id ? 'color:#C41E3A;background-color:rgba(196,30,58,0.05)' : 'color:#2C2C2C'"
            hover-class="bg-secondary"
            @click="sortBy = option.id; showSortMenu = false"
          >
            <text>{{ option.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 评价列表 -->
    <view class="divide-y" style="border-color:#E8E0D5">
      <view v-for="review in sortedReviews" :key="review.id" class="px-4 py-4">
        <!-- 用户信息 -->
        <view class="flex items-center gap-3 mb-3">
          <view class="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden" style="background:linear-gradient(135deg, rgba(196,30,58,0.2), rgba(201,169,110,0.2))">
            <image v-if="review.user.avatar" :src="review.user.avatar" mode="aspectFill" class="w-full h-full" />
            <text v-else class="text-xs font-medium" style="color:#C41E3A">{{ review.user.name.charAt(0) }}</text>
          </view>
          <view class="flex-1">
            <view class="flex items-center gap-2">
              <text class="font-medium text-sm" style="color:#2C2C2C">{{ review.user.name }}</text>
              <text v-if="review.user.level" class="text-[10px] px-1.5 py-0.5 rounded" style="background-color:rgba(201,169,110,0.2);color:#C9A96E">{{ review.user.level }}</text>
            </view>
            <view class="flex items-center gap-2 mt-0.5">
              <view class="flex items-center gap-0.5">
                <text v-for="s in 5" :key="s" class="text-xs" :style="s <= review.rating ? 'color:#C9A96E' : 'color:#E8E0D5'">★</text>
              </view>
              <text class="text-xs" style="color:#999">{{ review.time }}</text>
            </view>
          </view>
        </view>

        <!-- 评价内容 -->
        <text class="text-sm leading-relaxed mb-3 block" style="color:#2C2C2C">{{ review.content }}</text>

        <!-- 晒图 -->
        <view v-if="review.images.length > 0" class="flex gap-2 mb-3 overflow-x-auto">
          <view
            v-for="(img, index) in review.images"
            :key="index"
            class="flex-shrink-0 w-20 h-20 rounded-lg flex items-center justify-center"
            style="background-color:#F5F1EB"
            hover-class="opacity-80"
            @click="previewImage = { reviewId: review.id, index }"
          >
            <text class="text-base" style="color:rgba(153,153,153,0.4)">️</text>
          </view>
        </view>

        <!-- 购买规格 -->
        <text class="text-xs mb-3 block" style="color:#999">购买规格：{{ review.spec }}</text>

        <!-- 商家回复 -->
        <view v-if="review.reply" class="rounded-lg p-3 mb-3" style="background-color:rgba(245,241,235,0.5)">
          <view class="flex items-center gap-2 mb-1">
            <text class="text-[10px] px-1.5 py-0.5 rounded border" style="border-color:rgba(196,30,58,0.3);color:#C41E3A">商家回复</text>
            <text class="text-[10px]" style="color:#999">{{ review.reply.time }}</text>
          </view>
          <text class="text-xs" style="color:#999">{{ review.reply.content }}</text>
        </view>

        <!-- 点赞 -->
        <view class="flex items-center justify-end">
          <view
            class="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-colors"
            :style="likedReviews.includes(review.id) ? 'background-color:rgba(196,30,58,0.1);color:#C41E3A' : 'background-color:#F5F1EB;color:#999'"
            hover-class="opacity-80"
            @click="handleLike(review.id)"
          >
            <text></text>
            <text>{{ review.likes + (likedReviews.includes(review.id) ? 1 : 0) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="sortedReviews.length === 0" class="flex flex-col items-center justify-center py-16">
      <view class="w-20 h-20 rounded-full flex items-center justify-center mb-4" style="background-color:#F5F1EB">
        <text class="text-2xl" style="color:#999"></text>
      </view>
      <text class="text-sm" style="color:#999">暂无相关评价</text>
    </view>

    <!-- 图片预览弹窗 -->
    <view v-if="previewImage" class="fixed inset-0 z-50 flex items-center justify-center" style="background-color:rgba(0,0,0,0.9)">
      <!-- 关闭按钮 -->
      <view
        class="absolute top-4 right-4 p-2 rounded-full z-10"
        style="background-color:rgba(255,255,255,0.1)"
        hover-class="bg-white/20"
        @click="previewImage = null"
      >
        <text class="text-white text-xl">✕</text>
      </view>

      <!-- 图片容器 -->
      <view class="w-full h-full flex items-center justify-center p-4" @click="previewImage = null">
        <view class="max-w-lg w-full aspect-square rounded-xl flex items-center justify-center" style="background-color:rgba(255,255,255,0.1)">
          <text class="text-4xl" style="color:rgba(255,255,255,0.4)">️</text>
        </view>
      </view>

      <!-- 图片切换指示器 -->
      <view v-if="previewImageReview && previewImageReview.images.length > 1" class="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2">
        <view
          v-for="(_, index) in previewImageReview.images"
          :key="index"
          class="w-2 h-2 rounded-full transition-colors"
          :style="previewImage.index === index ? 'background-color:#fff' : 'background-color:rgba(255,255,255,0.3)'"
          @click="previewImage = { reviewId: previewImage.reviewId, index }"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// 类型定义
interface ReviewUser {
  name: string
  avatar?: string
  level?: string
}

interface ReviewReply {
  content: string
  time: string
}

interface Review {
  id: number
  user: ReviewUser
  rating: number
  content: string
  images: string[]
  spec: string
  time: string
  likes: number
  tags: string[]
  reply: ReviewReply | null
}

interface TagItem {
  id: string
  label: string
  count: number
}

interface SortOption {
  id: string
  label: string
}

// 评价标签
const reviewTags: TagItem[] = [
  { id: 'all', label: '全部', count: 328 },
  { id: 'quality', label: '质量好', count: 128 },
  { id: 'texture', label: '有质感', count: 86 },
  { id: 'value', label: '性价比高', count: 72 },
  { id: 'packaging', label: '包装精美', count: 56 },
  { id: 'delivery', label: '物流快', count: 42 },
  { id: 'authentic', label: '正品保证', count: 38 },
]

// 排序选项
const sortOptions: SortOption[] = [
  { id: 'default', label: '默认排序' },
  { id: 'newest', label: '最新评价' },
  { id: 'withImages', label: '有图优先' },
  { id: 'mostLikes', label: '最多点赞' },
]

// 评价数据
const reviews: Review[] = [
  { id: 1, user: { name: '易学爱好者', level: 'VIP会员' }, rating: 5, content: '这本书内容非常详实，从基础到进阶都有涉及，适合各个阶段的学习者。印刷质量很好，纸张厚实，字迹清晰。配合排盘工具学习效果更佳！', images: ['', '', ''], spec: '精装版', time: '2024-01-15', likes: 56, tags: ['quality', 'texture', 'value'], reply: { content: '感谢您的认可！我们精选优质纸张，确保阅读体验。祝您学习愉快！', time: '2024-01-16' } },
  { id: 2, user: { name: '命理研究者', level: '圈主' }, rating: 5, content: '作为从业多年的命理师，这本书的内容让我眼前一亮。理论扎实，案例丰富，是难得的好书。已经推荐给圈子里的学员了。', images: [''], spec: '典藏版', time: '2024-01-12', likes: 42, tags: ['quality', 'authentic'], reply: null },
  { id: 3, user: { name: '国学新手', level: '' }, rating: 4, content: '书的内容很好，就是对于完全零基础的人来说有点难度，需要配合入门课程一起学习。物流很快，包装完好。', images: [], spec: '平装版', time: '2024-01-10', likes: 18, tags: ['delivery', 'packaging'], reply: { content: '感谢您的反馈！建议搭配我们的《八字入门课》一起学习，效果更佳哦~', time: '2024-01-11' } },
  { id: 4, user: { name: '传统文化爱好者', level: 'VIP会员' }, rating: 5, content: '包装很精美，书籍质量上乘，内容深入浅出，值得收藏！', images: ['', ''], spec: '精装版', time: '2024-01-08', likes: 35, tags: ['packaging', 'quality', 'texture'], reply: null },
  { id: 5, user: { name: '风水师小李', level: '讲师' }, rating: 5, content: '专业书籍，内容考究，引经据典，是学习八字的必备参考书。强烈推荐！', images: [], spec: '典藏版', time: '2024-01-05', likes: 28, tags: ['quality', 'authentic'], reply: null },
]

const goodRatePercent = 98
const totalReviews = 328

// 状态
const selectedTag = ref<string>('all')
const sortBy = ref<string>('default')
const showSortMenu = ref(false)
const likedReviews = ref<number[]>([])
const previewImage = ref<{ reviewId: number; index: number } | null>(null)

// 计算当前预览的评价
const previewImageReview = computed(() => {
  if (!previewImage.value) return null
  return reviews.find(r => r.id === previewImage.value!.reviewId) || null
})

// 筛选评价
const filteredReviews = computed(() => {
  if (selectedTag.value === 'all') return reviews
  return reviews.filter(r => r.tags.includes(selectedTag.value))
})

// 排序评价
const sortedReviews = computed(() => {
  return [...filteredReviews.value].sort((a, b) => {
    switch (sortBy.value) {
      case 'newest': return new Date(b.time).getTime() - new Date(a.time).getTime()
      case 'withImages': return b.images.length - a.images.length
      case 'mostLikes': return b.likes - a.likes
      default: return 0
    }
  })
})

// 点赞处理
function handleLike(reviewId: number) {
  if (likedReviews.value.includes(reviewId)) {
    likedReviews.value = likedReviews.value.filter(id => id !== reviewId)
  } else {
    likedReviews.value.push(reviewId)
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
