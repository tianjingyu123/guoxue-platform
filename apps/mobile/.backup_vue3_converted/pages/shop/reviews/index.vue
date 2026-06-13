<template>
  <view class="min-h-screen" style="background-color: #FAF8F5;">
    <!-- Header -->
    <view class="sticky top-0 z-20" style="background-color: #FFFFFF; border-bottom: 1px solid #E8E0D5;">
      <view class="flex items-center gap-3 px-4 py-3">
        <view @click="goBack" class="p-1 -ml-1" hover-class="opacity-60">
          <text style="font-size: 24px; color: #2C2C2C; line-height: 1;">←</text>
        </view>
        <text class="text-lg font-semibold" style="color: #2C2C2C;">商品评价</text>
      </view>
    </view>

    <!-- Stats Overview -->
    <view class="mx-4 mt-4 rounded-2xl p-4" style="background-color: #FFFFFF; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
      <view class="flex items-start gap-6">
        <!-- Average Score -->
        <view class="text-center">
          <text class="text-4xl font-bold block" style="color: #C41E3A;">{{ mockStats.average }}</text>
          <view class="flex items-center justify-center gap-0.5 mt-1">
            <text v-for="i in 5" :key="i" class="text-sm" :style="{ color: i <= Math.round(mockStats.average) ? '#C9A96E' : '#D1D5DB' }">★</text>
          </view>
          <text class="text-xs mt-1 block" style="color: #999999;">{{ mockStats.total }}条评价</text>
        </view>
        <!-- Distribution -->
        <view class="flex-1 space-y-1.5">
          <view v-for="d in mockStats.distribution" :key="d.stars" class="flex items-center gap-2 text-xs">
            <text style="color: #666666; width: 24px;">{{ d.stars }}星</text>
            <view class="flex-1 h-2 rounded-full overflow-hidden" style="background-color: #F0EBE5;">
              <view class="h-full rounded-full" :style="{ width: d.percent + '%', background: 'linear-gradient(90deg, #C9A96E, #E8D5B0)' }" />
            </view>
            <text style="color: #999999; width: 32px; text-align: right;">{{ d.percent }}%</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Filter Tabs -->
    <view class="px-4 mb-3 mt-4">
      <view class="flex gap-2 overflow-x-auto pb-1" style="white-space: nowrap;">
        <view
          v-for="tab in filterTabs"
          :key="tab.key"
          @click="onFilterChange(tab.key)"
          class="px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex items-center gap-1"
          :style="{
            backgroundColor: filter === tab.key ? '#C41E3A' : '#FFFFFF',
            color: filter === tab.key ? '#FFFFFF' : '#666666',
            border: filter === tab.key ? '1px solid #C41E3A' : '1px solid #E8E0D5',
            cursor: 'pointer',
          }"
        >
          <text>{{ tab.label }}</text>
          <text :style="{ color: filter === tab.key ? 'rgba(255,255,255,0.8)' : '#999999' }">({{ tab.count }})</text>
        </view>
      </view>
    </view>

    <!-- Reviews List -->
    <view class="px-4 pb-20 space-y-3">
      <!-- Loading Skeleton -->
      <view v-if="loading">
        <view v-for="i in 3" :key="i" class="rounded-2xl p-4 mb-3" style="background-color: #FFFFFF;">
          <view class="flex items-center gap-3 mb-3">
            <view class="w-10 h-10 rounded-full skeleton-pulse" style="background-color: #F0EBE5;" />
            <view class="flex-1">
              <view class="w-20 h-4 rounded mb-1 skeleton-pulse" style="background-color: #F0EBE5;" />
              <view class="w-16 h-3 rounded skeleton-pulse" style="background-color: #F0EBE5;" />
            </view>
          </view>
          <view class="space-y-2">
            <view class="w-full h-4 rounded skeleton-pulse" style="background-color: #F0EBE5;" />
            <view class="w-3/4 h-4 rounded skeleton-pulse" style="background-color: #F0EBE5;" />
          </view>
        </view>
      </view>

      <!-- Empty State -->
      <view v-else-if="filteredReviews.length === 0" class="text-center py-16">
        <text class="block mb-4" style="font-size: 64px; color: #D1D5DB;"></text>
        <text style="color: #999999;">暂无相关评价</text>
      </view>

      <!-- Review Items -->
      <view v-for="review in filteredReviews" :key="review.id" class="rounded-2xl p-4" style="background-color: #FFFFFF; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <!-- User Info -->
        <view class="flex items-center gap-3 mb-3">
          <view class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style="background-color: #F0EBE5;">
            <image
              :src="review.user.avatar"
              mode="aspectFill"
              class="w-full h-full"
              @error="onAvatarError($event, review.user.id)"
            />
          </view>
          <view class="flex-1 min-w-0">
            <text class="font-medium block" style="color: #2C2C2C;">{{ review.user.name }}</text>
            <view class="flex items-center gap-1 mt-0.5">
              <text v-for="i in 5" :key="i" class="text-xs" :style="{ color: i <= review.rating ? '#C9A96E' : '#D1D5DB' }">★</text>
              <text v-if="review.skuName" class="text-xs ml-2" style="color: #999999;">{{ review.skuName }}</text>
            </view>
          </view>
          <text class="text-xs flex-shrink-0" style="color: #999999;">{{ review.createdAt }}</text>
        </view>

        <!-- Review Content -->
        <text class="text-sm block mb-3" style="color: #666666; line-height: 1.625;">{{ review.content }}</text>

        <!-- Review Images -->
        <view v-if="review.images && review.images.length > 0" class="flex gap-2 overflow-x-auto pb-2 mb-3">
          <image
            v-for="(img, idx) in review.images"
            :key="idx"
            :src="img"
            mode="aspectFill"
            @click="openImagePreview(review.images!, idx)"
            class="w-20 h-20 rounded-lg flex-shrink-0"
            style="border-radius: 8px; cursor: pointer;"
          />
        </view>

        <!-- Bottom Actions -->
        <view class="flex items-center justify-between pt-2" style="border-top: 1px solid #E8E0D5;">
          <view class="flex items-center gap-1 text-xs" style="color: #999999; cursor: pointer;">
            <text style="font-size: 14px;"></text>
            <text>有用 ({{ review.likes }})</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Image Preview Overlay -->
    <view v-if="previewImage" class="fixed inset-0 z-50 flex items-center justify-center" style="background-color: rgba(0,0,0,0.9);" @click="closePreview">
      <view class="absolute top-4 right-4 p-2" style="z-index: 10; cursor: pointer;" @click.stop="closePreview">
        <text style="font-size: 24px; color: #FFFFFF; line-height: 1;">✕</text>
      </view>
      <image
        :src="previewImage"
        mode="aspectFit"
        style="max-width: 100%; max-height: 100%;"
        @click.stop
      />
      <view v-if="previewImages.length > 1" class="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
        <view
          v-for="(img, idx) in previewImages"
          :key="idx"
          @click.stop="previewImage = img; previewIndex = idx"
          :class="['w-2 h-2 rounded-full transition-all', idx === previewIndex ? 'bg-white' : 'bg-white/50']"
          :style="{
            width: idx === previewIndex ? '16px' : '8px',
            height: '8px',
            backgroundColor: idx === previewIndex ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
          }"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// --- Types ---
interface ProductReview {
  id: string
  user: { id: string; name: string; avatar: string }
  rating: number
  content: string
  images?: string[]
  skuName: string
  createdAt: string
  likes: number
}

type FilterType = 'all' | 'good' | 'medium' | 'bad' | 'images'

// --- Mock Data ---
const mockReviews: ProductReview[] = [
  { id: '1', user: { id: 'u1', name: '张**', avatar: '/placeholder.svg' }, rating: 5, content: '这本书讲解非常详细，从基础到进阶都有涉及，特别适合入门学习。印刷质量很好，纸张手感不错，物流也很快，非常满意的一次购物体验！', images: ['/placeholder.svg', '/placeholder.svg', '/placeholder.svg'], skuName: '精装典藏版', createdAt: '2024-01-15', likes: 128 },
  { id: '2', user: { id: 'u2', name: '李**', avatar: '/placeholder.svg' }, rating: 5, content: '内容很好，讲解清晰易懂，推荐购买！', skuName: '平装版', createdAt: '2024-01-14', likes: 56 },
  { id: '3', user: { id: 'u3', name: '王**', avatar: '/placeholder.svg' }, rating: 4, content: '整体还不错，就是有些章节感觉可以再详细一点。', images: ['/placeholder.svg'], skuName: '精装典藏版', createdAt: '2024-01-13', likes: 23 },
  { id: '4', user: { id: 'u4', name: '赵**', avatar: '/placeholder.svg' }, rating: 3, content: '内容一般，和预期有差距。', skuName: '平装版', createdAt: '2024-01-12', likes: 5 },
]

const mockStats = {
  average: 4.8,
  total: 1256,
  distribution: [
    { stars: 5, count: 980, percent: 78 },
    { stars: 4, count: 188, percent: 15 },
    { stars: 3, count: 50, percent: 4 },
    { stars: 2, count: 25, percent: 2 },
    { stars: 1, count: 13, percent: 1 },
  ],
  withImages: 368,
}

// --- Filter Tab Config ---
const filterTabs: { key: FilterType; label: string; count: number }[] = [
  { key: 'all', label: '全部', count: mockStats.total },
  { key: 'good', label: '好评', count: mockStats.distribution[0].count + mockStats.distribution[1].count },
  { key: 'medium', label: '中评', count: mockStats.distribution[2].count },
  { key: 'bad', label: '差评', count: mockStats.distribution[3].count + mockStats.distribution[4].count },
  { key: 'images', label: '有图', count: mockStats.withImages },
]

// --- State ---
const loading = ref(true)
const reviews = ref<ProductReview[]>(mockReviews)
const filter = ref<FilterType>('all')
const previewImage = ref<string | null>(null)
const previewImages = ref<string[]>([])
const previewIndex = ref(0)
const avatarErrors = ref<Set<string>>(new Set())

// --- Computed ---
const filteredReviews = computed(() => {
  return reviews.value.filter(r => {
    if (filter.value === 'good') return r.rating >= 4
    if (filter.value === 'medium') return r.rating === 3
    if (filter.value === 'bad') return r.rating <= 2
    if (filter.value === 'images') return r.images && r.images.length > 0
    return true
  })
})

// --- Lifecycle ---
onMounted(() => {
  setTimeout(() => { loading.value = false }, 800)
})

// --- Filter Change ---
function onFilterChange(key: FilterType) {
  filter.value = key
}

// --- Image Preview ---
function openImagePreview(images: string[], index: number) {
  previewImages.value = images
  previewIndex.value = index
  previewImage.value = images[index]
}

function closePreview() {
  previewImage.value = null
}

// --- Avatar Error Fallback ---
function onAvatarError(event: any, userId: string) {
  avatarErrors.value.add(userId)
}

// --- Navigation ---
function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
@keyframes skeletonPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.skeleton-pulse {
  animation: skeletonPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
