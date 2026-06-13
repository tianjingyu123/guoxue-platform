<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view @click="goBack" class="p-1 -ml-1"><text class="text-foreground text-lg">←</text></view>
        <text class="font-semibold text-foreground">我的点赞</text>
        <view class="w-6" />
      </view>

      <!-- 筛选栏 -->
      <view class="px-4 pb-3 overflow-x-auto" style="scrollbar-width: none;">
        <view class="flex gap-2">
          <view
            v-for="opt in filterOptions"
            :key="opt.value"
            @click="filter = opt.value"
            :class="['px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors', filter === opt.value ? 'bg-primary text-white' : 'bg-muted text-muted-foreground']"
          >
            <text>{{ opt.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="p-4 space-y-3">
      <view v-for="i in 5" :key="i" class="bg-white rounded-lg p-4">
        <view class="flex items-start gap-3">
          <view class="w-10 h-10 bg-muted rounded-lg shrink-0 animate-pulse" />
          <view class="flex-1 min-w-0">
            <view class="h-4 bg-muted rounded w-3/4 mb-2 animate-pulse" />
            <view class="flex items-center gap-2">
              <view class="w-5 h-5 bg-muted rounded-full animate-pulse" />
              <view class="h-3 bg-muted rounded w-16 animate-pulse" />
              <view class="h-3 bg-muted rounded w-24 ml-auto animate-pulse" />
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="filteredLikes.length === 0" class="flex flex-col items-center py-20">
      <view class="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
        <text class="text-muted-foreground text-3xl"></text>
      </view>
      <text class="text-muted-foreground mb-2">暂无点赞记录</text>
      <text class="text-xs text-muted-foreground mb-4">去发现更多精彩内容吧</text>
      <view @click="goExplore" class="px-6 py-2 bg-primary text-white rounded-full text-sm">去逛逛</view>
    </view>

    <!-- 点赞列表 -->
    <view v-else class="pb-20">
      <!-- 统计 -->
      <view class="px-4 py-2">
        <text class="text-xs text-muted-foreground">共 {{ filteredLikes.length }} 条点赞记录</text>
      </view>

      <view class="px-4 space-y-2">
        <view
          v-for="item in filteredLikes"
          :key="item.id"
          class="bg-white rounded-lg p-4 border border-border active:opacity-80 transition-opacity"
          @click="goDetail(item)"
        >
          <view class="flex items-start gap-3">
            <!-- 类型图标 -->
            <view :class="['w-10 h-10 rounded-lg flex items-center justify-center shrink-0', typeColor(item.type)]">
              <text class="text-base">{{ typeIcon(item.type) }}</text>
            </view>

            <!-- 内容 -->
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium text-foreground line-clamp-2 block mb-2">{{ item.title }}</text>
              <view class="flex items-center justify-between">
                <view class="flex items-center gap-2">
                  <!-- 作者 -->
                  <template v-if="item.author">
                    <image :src="item.author.avatar" mode="aspectFill" class="w-5 h-5 rounded-full" />
                    <text class="text-xs text-muted-foreground">{{ item.author.name }}</text>
                  </template>
                  <!-- 类型标签 -->
                  <text class="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">{{ typeLabel(item.type) }}</text>
                </view>
                <view class="flex items-center gap-2">
                  <text class="text-xs text-muted-foreground">{{ item.time }}</text>
                  <!-- 取消点赞按钮 -->
                  <view
                    @click.stop="handleUnlike(item)"
                    class="p-1 text-primary transition-colors"
                  >
                    <text class="text-base">{{ item.liked ? '' : '🤍' }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface LikeAuthor {
  name: string
  avatar: string
}

interface LikeItem {
  id: number
  title: string
  type: string
  author?: LikeAuthor
  time: string
  liked: boolean
  target?: { id: number; type: string }
}

const loading = ref(true)
const filter = ref<string>('all')

const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '文章', value: 'article' },
  { label: '课程', value: 'course' },
  { label: '视频', value: 'video' },
  { label: '帖子', value: 'circle_post' },
  { label: '问答', value: 'question' },
  { label: '商品', value: 'product' },
]

const typeConfig: Record<string, { icon: string; label: string; color: string }> = {
  article: { icon: '', label: '文章', color: 'bg-blue-100 text-blue-600' },
  course: { icon: '', label: '课程', color: 'bg-amber-100 text-amber-600' },
  video: { icon: '', label: '视频', color: 'bg-red-100 text-red-600' },
  product: { icon: '️', label: '商品', color: 'bg-green-100 text-green-600' },
  circle_post: { icon: '', label: '帖子', color: 'bg-purple-100 text-purple-600' },
  question: { icon: '❓', label: '问答', color: 'bg-orange-100 text-orange-600' },
  answer: { icon: '', label: '回答', color: 'bg-teal-100 text-teal-600' },
  comment: { icon: '', label: '评论', color: 'bg-gray-100 text-gray-600' },
}

const likes = ref<LikeItem[]>([])

const filteredLikes = computed(() => {
  if (filter.value === 'all') return likes.value
  return likes.value.filter(item => item.type === filter.value)
})

function typeIcon(type: string): string { return typeConfig[type]?.icon || '' }
function typeLabel(type: string): string { return typeConfig[type]?.label || type }
function typeColor(type: string): string { return typeConfig[type]?.color || 'bg-muted text-muted-foreground' }

function handleUnlike(item: LikeItem) {
  item.liked = !item.liked
  uni.showToast({ title: item.liked ? '已点赞' : '已取消点赞', icon: 'success' })
}

function goBack() { uni.navigateBack() }
function goDetail(item: LikeItem) {
  // 导航到对应内容详情页
  uni.showToast({ title: '跳转至 ' + item.title, icon: 'none' })
}
function goExplore() { uni.reLaunch({ url: '/pages/index/index' }) }

// 模拟数据加载
setTimeout(() => {
  likes.value = [
    {
      id: 1, title: '如何理解《易经》中的元亨利贞', type: 'question',
      author: { name: '易学小白', avatar: 'https://i.pravatar.cc/40?img=1' },
      time: '今天', liked: true,
    },
    {
      id: 2, title: '八字命理入门到精通', type: 'course',
      author: { name: '张老师', avatar: 'https://i.pravatar.cc/40?img=2' },
      time: '昨天', liked: true,
    },
    {
      id: 3, title: '梅花易数起卦入门', type: 'article',
      author: { name: '国学研究院', avatar: '' },
      time: '01月12日', liked: true,
    },
    {
      id: 4, title: '风水布局视频讲解', type: 'video',
      author: { name: '王大师', avatar: 'https://i.pravatar.cc/40?img=3' },
      time: '01月10日', liked: false,
    },
    {
      id: 5, title: '开光铜葫芦摆件', type: 'product',
      time: '01月08日', liked: true,
    },
  ]
  loading.value = false
}, 400)
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
