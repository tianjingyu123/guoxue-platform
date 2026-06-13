<template>
  <view class="min-h-screen bg-background">
    <!-- 自定义导航栏 -->
    <view class="sticky top-0 z-50 flex items-center justify-between px-4 h-12" style="background-color:#C41E3A;color:#fff">
      <view class="p-2 -ml-2" @click="goBack">
        <text class="text-white text-lg">←</text>
      </view>
      <view class="flex items-center gap-2">
        <view class="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white" style="background-color:rgba(255,255,255,0.2)">
          <text>国</text>
        </view>
        <text class="font-medium text-white">{{ brand.name }}</text>
      </view>
      <view class="p-2 -mr-2" @click="handleShare">
        <text class="text-white text-lg"></text>
      </view>
    </view>

    <!-- Banner轮播 -->
    <view class="relative h-44 overflow-hidden">
      <view class="flex transition-transform duration-500" :style="{ transform: 'translateX(-' + currentBanner * 100 + '%)' }">
        <view
          v-for="banner in banners"
          :key="banner.id"
          class="w-full flex-shrink-0"
          @click="goTo(banner.link)"
        >
          <view class="w-full h-44" :style="{ background: 'linear-gradient(135deg, ' + brand.theme.primaryColor + ', ' + brand.theme.primaryColor + '80)' }">
            <view class="w-full h-full flex items-center justify-center">
              <text class="text-5xl text-white/30"></text>
            </view>
          </view>
        </view>
      </view>
      <!-- 指示器 -->
      <view class="absolute bottom-2 left-1/2 flex gap-1.5" style="transform:translateX(-50%)">
        <view
          v-for="(_, idx) in banners"
          :key="idx"
          class="rounded-full transition-all"
          :class="idx === currentBanner ? 'w-4 bg-white' : 'w-1.5 bg-white/50'"
          :style="{ height: '6rpx' }"
        />
      </view>
    </view>

    <!-- 特色入口 -->
    <view class="px-4 py-4">
      <view class="grid grid-cols-5 gap-2">
        <view
          v-for="feature in features"
          :key="feature.id"
          class="flex flex-col items-center gap-1.5"
          @click="goTo(feature.link)"
        >
          <view class="relative w-12 h-12 rounded-full flex items-center justify-center" :style="{ backgroundColor: feature.color + '15' }">
            <text :class="['text-xl']" :style="{ color: feature.color }">{{ feature.icon }}</text>
            <view v-if="feature.badge" class="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] text-white rounded-full" style="background-color:#C41E3A">
              <text>{{ feature.badge }}</text>
            </view>
          </view>
          <text class="text-xs text-foreground">{{ feature.name }}</text>
        </view>
      </view>
    </view>

    <!-- 站长推荐 -->
    <view class="px-4 pb-4">
      <view class="flex items-center justify-between mb-3">
        <view class="flex items-center gap-2">
          <view class="w-6 h-6 rounded-full flex items-center justify-center bg-[#F1EDE8] text-[10px]">
            <text></text>
          </view>
          <text class="font-medium text-sm text-foreground">站长推荐</text>
        </view>
        <view class="text-xs text-muted-foreground flex items-center" @click="goTo('/courses')">
          <text>更多</text>
          <text class="text-sm ml-1">›</text>
        </view>
      </view>
      <scroll-view scroll-x class="flex gap-3 pb-2" style="white-space:nowrap">
        <view
          v-for="item in recommends"
          :key="item.id"
          class="inline-block w-36 flex-shrink-0 mr-3"
          @click="goTo('/' + item.type + 's/' + item.id)"
        >
          <view class="relative">
            <view class="w-full h-20 rounded-lg flex items-center justify-center" style="background:linear-gradient(135deg,rgba(196,30,58,0.2),rgba(201,169,110,0.1))">
              <text class="text-2xl"></text>
            </view>
            <view v-if="item.tag" class="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] text-white rounded" style="background-color:#C41E3A">
              <text>{{ item.tag }}</text>
            </view>
          </view>
          <text class="mt-2 text-xs font-medium block line-clamp-2 text-foreground">{{ item.title }}</text>
          <view class="mt-1 flex items-center gap-2">
            <text v-if="item.price !== undefined" class="text-xs font-semibold" style="color:#C41E3A">
              {{ item.price > 0 ? '¥' + item.price : '免费' }}
            </text>
            <text v-if="item.originalPrice && item.originalPrice > (item.price || 0)" class="text-[10px] text-muted-foreground line-through">
              ¥{{ item.originalPrice }}
            </text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 内容Feed流 -->
    <view class="px-4 pb-20">
      <text class="font-medium text-foreground block mb-3">精选内容</text>
      <view class="space-y-3">
        <view
          v-for="item in feedList"
          :key="item.id"
          class="flex gap-3 p-3 bg-white rounded-lg"
          @click="goTo('/' + item.type + 's/' + item.id)"
        >
          <view class="relative flex-shrink-0">
            <view class="w-28 h-20 rounded flex items-center justify-center bg-[#F1EDE8]">
              <text class="text-2xl">{{ feedTypeIcons[item.type] || '' }}</text>
            </view>
            <view v-if="item.isLive" class="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] text-white rounded flex items-center gap-1" style="background-color:#EF4444">
              <view class="w-1.5 h-1.5 bg-white rounded-full" />
              <text>直播中</text>
            </view>
            <view v-if="item.type === 'video' && !item.isLive" class="absolute inset-0 flex items-center justify-center">
              <text class="text-3xl text-white" style="text-shadow:0 2px 8px rgba(0,0,0,0.3)">▶</text>
            </view>
          </view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-1 mb-1">
              <text class="text-xs text-muted-foreground">{{ feedTypeLabels[item.type] || '内容' }}</text>
            </view>
            <text class="text-sm font-medium block line-clamp-2 text-foreground">{{ item.title }}</text>
            <view class="mt-2 flex items-center justify-between">
              <view class="flex items-center gap-1">
                <view class="w-4 h-4 rounded-full flex items-center justify-center bg-[#F1EDE8] text-[8px]">
                  <text>{{ item.author.nickname.charAt(0) }}</text>
                </view>
                <text class="text-xs text-muted-foreground">{{ item.author.nickname }}</text>
              </view>
              <view class="flex items-center gap-2 text-xs text-muted-foreground">
                <text class="flex items-center gap-0.5"> {{ item.stats.views }}</text>
                <text class="flex items-center gap-0.5">♥ {{ item.stats.likes }}</text>
              </view>
            </view>
            <text v-if="item.price && item.price > 0" class="mt-1 inline-block text-xs font-semibold" style="color:#C41E3A">
              ¥{{ item.price }}
            </text>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMoreFeed" class="mt-4 flex justify-center">
        <view class="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground" @click="loadMoreFeed">
          <text>{{ feedLoading ? '加载中...' : '加载更多' }}</text>
        </view>
      </view>

      <view v-if="!hasMoreFeed && feedList.length > 0" class="mt-4 text-center">
        <text class="text-xs text-muted-foreground">已经到底啦</text>
      </view>
    </view>

    <!-- 分享海报弹层 -->
    <view v-if="showPoster" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="showPoster = false">
      <view class="w-full max-w-lg bg-white rounded-t-2xl h-[80vh]" @click.stop>
        <view class="flex items-center justify-between p-4 border-b border-border">
          <text class="font-semibold text-foreground">分享推广</text>
          <view @click="showPoster = false" class="p-1">
            <text class="text-lg">✕</text>
          </view>
        </view>
        <view class="flex flex-col items-center justify-center h-full pb-8 px-4">
          <template v-if="posterLoading">
            <view class="flex flex-col items-center gap-4">
              <view class="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <text class="text-sm text-muted-foreground">正在生成海报...</text>
            </view>
          </template>
          <template v-else-if="posterUrl">
            <view class="w-48 h-64 rounded-lg flex items-center justify-center" style="background:linear-gradient(135deg,#C41E3A,#C41E3acc)">
              <text class="text-6xl text-white/30">{{ posterUrl }}</text>
            </view>
            <view class="mt-6 flex gap-4">
              <view class="px-6 py-2.5 rounded-xl border border-border text-sm text-foreground">
                <text>保存图片</text>
              </view>
              <view class="px-6 py-2.5 rounded-xl text-sm text-white" style="background-color:#C41E3A">
                <text>分享给好友</text>
              </view>
            </view>
            <text class="mt-4 text-xs text-muted-foreground">长按图片保存或分享给好友</text>
          </template>
          <template v-else>
            <text class="text-sm text-muted-foreground">海报生成失败，请重试</text>
          </template>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const currentBanner = ref(0)
const showPoster = ref(false)
const posterLoading = ref(false)
const posterUrl = ref('')
const feedPage = ref(1)
const hasMoreFeed = ref(true)
const feedLoading = ref(false)

const brand = {
  name: '国学推广联盟',
  logo: '',
  theme: { primaryColor: '#C41E3A', secondaryColor: '#C9A96E', headerStyle: 'dark' },
}

const banners = [
  { id: 1, image: '', title: '春季课程优惠', link: '/promo/1' },
  { id: 2, image: '', title: '名师讲座报名中', link: '/promo/2' },
  { id: 3, image: '', title: '新用户专享礼包', link: '/promo/3' },
]

const features = [
  { id: 1, icon: '', name: '课程', link: '/courses', color: '#C41E3A' },
  { id: 2, icon: '', name: '圈子', link: '/community', color: '#3B82F6' },
  { id: 3, icon: '', name: '视频', link: '/videos', color: '#22C55E' },
  { id: 4, icon: '', name: '商城', link: '/mall', color: '#C9A96E' },
  { id: 5, icon: '🧭', name: '发现', link: '/discover', color: '#8B5CF6' },
]

const recommends = [
  { id: 1, type: 'course', title: '八字命理入门实战班', cover: '', tag: '热门', price: 299, originalPrice: 599 },
  { id: 2, type: 'course', title: '紫微斗数精讲', cover: '', tag: '推荐', price: 599, originalPrice: 899 },
  { id: 3, type: 'course', title: '风水堪舆实战', cover: '', tag: '新课', price: 899, originalPrice: 1299 },
]

const feedTypeIcons: Record<string, string> = {
  article: '',
  video: '▶️',
  course: '',
  live: '📻',
  product: '',
}

const feedTypeLabels: Record<string, string> = {
  article: '文章',
  video: '视频',
  course: '课程',
  live: '直播',
  product: '商品',
}

const feedList = ref([
  { id: 1, type: 'article', title: '八字如何看财运？从十神组合分析财富格局', cover: '', author: { nickname: '易学大师' }, stats: { views: 1280, likes: 256 }, price: 0, isLive: false },
  { id: 2, type: 'course', title: '六爻占卜入门课程，30天从小白到入门', cover: '', author: { nickname: '王老师' }, stats: { views: 856, likes: 128 }, price: 299, isLive: false },
  { id: 3, type: 'video', title: '阳宅风水布局要点：客厅卧室厨房注意事项', cover: '', author: { nickname: '风水实战派' }, stats: { views: 3560, likes: 892 }, price: 0, isLive: false },
  { id: 4, type: 'live', title: '周末直播：八字命理在线答疑', cover: '', author: { nickname: '周易大师' }, stats: { views: 520, likes: 86 }, price: 0, isLive: true },
  { id: 5, type: 'product', title: '专业罗盘（台湾原装）', cover: '', author: { nickname: '驿站商城' }, stats: { views: 2350, likes: 412 }, price: 1280, isLive: false },
])

let bannerTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (banners.length > 1) {
    bannerTimer = setInterval(() => {
      currentBanner.value = (currentBanner.value + 1) % banners.length
    }, 4000)
  }
})

onUnmounted(() => {
  if (bannerTimer) clearInterval(bannerTimer)
})

function loadMoreFeed() {
  if (feedLoading.value || !hasMoreFeed.value) return
  feedLoading.value = true
  setTimeout(() => {
    feedPage.value++
    hasMoreFeed.value = false
    feedLoading.value = false
  }, 800)
}

function handleShare() {
  showPoster.value = true
  if (!posterUrl.value) {
    posterLoading.value = true
    setTimeout(() => {
      posterUrl.value = ''
      posterLoading.value = false
    }, 1200)
  }
}

function goBack() {
  uni.navigateBack()
}

function goTo(path: string) {
  uni.navigateTo({ url: path })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
