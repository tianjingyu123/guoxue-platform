<template>
  <view class="min-h-screen bg-background pb-28">
    <!-- 骨架屏 -->
    <view v-if="isLoading" class="min-h-screen bg-background">
      <view class="h-64 bg-[#E8E0D5] animate-pulse" />
      <view class="px-4 -mt-16 space-y-4">
        <view class="h-32 bg-white rounded-2xl animate-pulse" />
        <view class="h-48 bg-white rounded-xl animate-pulse" />
        <view class="h-48 bg-white rounded-xl animate-pulse" />
      </view>
    </view>

    <template v-else-if="data">
      <!-- 封面大图 + 渐变遮罩 -->
      <view class="relative h-72">
        <image :src="data.circle.cover" mode="aspectFill" class="w-full h-full object-cover" />
        <view class="absolute inset-0" style="background:linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 50%, rgba(0,0,0,0.7) 100%)" />

        <!-- 顶部导航 -->
        <view class="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <view @click="goBack" class="w-9 h-9 rounded-full flex items-center justify-center" style="background:rgba(0,0,0,0.3)">
            <text class="text-white text-lg">←</text>
          </view>
          <view @click="handleShare" class="w-9 h-9 rounded-full flex items-center justify-center" style="background:rgba(0,0,0,0.3)">
            <text class="text-white text-lg"></text>
          </view>
        </view>

        <!-- 限时优惠标签 -->
        <view v-if="data.joinStatus.discount" class="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full flex items-center gap-1 shadow-lg" style="background:linear-gradient(135deg,#C41E3A,#FF6B35)">
          <text class="text-yellow-300 text-xs"></text>
          <text class="text-sm font-bold text-white">{{ data.joinStatus.discount }}</text>
        </view>
      </view>

      <!-- 圈子信息卡片 -->
      <view class="px-4 -mt-20 relative z-10">
        <view class="p-5 rounded-2xl bg-white" style="box-shadow:0 4px 24px rgba(0,0,0,0.1)">
          <view class="flex gap-4">
            <!-- 圈子头像 -->
            <view class="relative">
              <image :src="data.circle.owner.avatar" mode="aspectFill" class="w-16 h-16 rounded-xl object-cover border-2 border-white" style="box-shadow:0 2px 8px rgba(0,0,0,0.15)" />
              <view class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style="background:linear-gradient(135deg,#C9A96E,#A67C52)">
                <text class="text-white text-xs">👑</text>
              </view>
            </view>

            <!-- 圈子信息 -->
            <view class="flex-1 min-w-0">
              <text class="text-lg font-bold text-foreground block mb-1">{{ data.circle.name }}</text>
              <text class="text-sm text-ink-soft line-clamp-2 block mb-2">{{ data.circle.description }}</text>

              <!-- 统计数据 -->
              <view class="flex items-center gap-4 text-xs text-muted-foreground">
                <text class="flex items-center gap-1"> {{ formatNumber(data.circle.members) }} 成员</text>
                <text class="flex items-center gap-1"> {{ formatNumber(data.circle.posts) }} 帖子</text>
                <text class="flex items-center gap-1 text-primary">
                  <text class="w-1.5 h-1.5 rounded-full bg-primary inline-block" style="animation:pulse 2s infinite" />
                  今日活跃 {{ data.circle.todayActive }}
                </text>
              </view>
            </view>
          </view>

          <!-- 标签 -->
          <view v-if="data.circle.tags" class="flex flex-wrap gap-2 mt-4">
            <text v-for="tag in data.circle.tags" :key="tag" class="px-2.5 py-1 text-xs bg-[#F5F0E8] text-ink-soft rounded-full">#{{ tag }}</text>
          </view>
        </view>
      </view>

      <!-- 精华内容预览 -->
      <view class="px-4 mt-6">
        <view class="flex items-center gap-2 mb-4">
          <text class="text-accent text-lg"></text>
          <text class="text-base font-bold text-foreground">精华内容预览</text>
          <text class="text-xs text-muted-foreground">加入后解锁全部</text>
        </view>

        <view class="space-y-3">
          <view v-for="(post, index) in data.featuredPosts" :key="post.id" @click="handlePostClick(post.id)"
            class="p-4 rounded-xl bg-white relative overflow-hidden active:scale-[0.98]" style="box-shadow:0 2px 12px rgba(0,0,0,0.06)">

            <!-- 锁定提示 -->
            <view v-if="showLockTip === post.id" class="absolute inset-0 z-10 flex items-center justify-center" style="background:rgba(0,0,0,0.6)">
              <view class="flex flex-col items-center gap-2 text-white">
                <text class="text-2xl"></text>
                <text class="text-sm font-medium">加入圈子后查看详情</text>
              </view>
            </view>

            <!-- 排名角标 -->
            <view class="absolute top-0 right-0 w-8 h-8 flex items-center justify-center text-xs font-bold text-white"
              :style="rankBadgeStyle(index)" style="clipPath:polygon(0 0, 100% 0, 100% 100%)">
              <text class="translate-x-1 -translate-y-0.5">{{ index + 1 }}</text>
            </view>

            <!-- 作者信息 -->
            <view class="flex items-center gap-2 mb-2">
              <image :src="post.author.avatar" mode="aspectFill" class="w-8 h-8 rounded-full" />
              <text class="text-sm font-medium text-foreground">{{ post.author.name }}</text>
            </view>

            <!-- 内容预览 -->
            <view class="relative">
              <text class="text-sm text-ink-soft line-clamp-2 block">{{ post.preview }}</text>
              <view class="absolute bottom-0 left-0 right-0 h-6" style="background:linear-gradient(to top, white, transparent)" />
            </view>

            <!-- 互动数据 -->
            <view class="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <text class="flex items-center gap-1"> {{ post.likes }}</text>
              <text class="flex items-center gap-1"> {{ post.comments }}</text>
            </view>

            <!-- 锁定遮罩 -->
            <view class="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none" style="background:linear-gradient(to top, rgba(255,255,255,0.9), transparent)" />
          </view>
        </view>

        <!-- 更多内容提示 -->
        <view class="mt-4 p-4 bg-[#F5F0E8] rounded-xl text-center">
          <text class="text-2xl text-accent block mb-2"></text>
          <text class="text-sm text-ink-soft block">
            还有 <text class="font-bold text-primary">{{ data.circle.posts - data.featuredPosts.length }}</text> 篇精彩内容
          </text>
          <text class="text-xs text-muted-foreground mt-1 block">加入圈子立即解锁</text>
        </view>
      </view>

      <!-- 圈子权益 -->
      <view class="px-4 mt-6">
        <text class="text-base font-bold text-foreground block mb-3">加入后享有</text>
        <view class="grid grid-cols-2 gap-3">
          <view v-for="(item, i) in benefitsList" :key="i" class="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm">
            <view class="w-8 h-8 rounded-full flex items-center justify-center" style="background:rgba(196,30,58,0.08)">
              <text class="text-sm">{{ item.icon }}</text>
            </view>
            <text class="text-sm text-foreground">{{ item.text }}</text>
          </view>
        </view>
      </view>

      <!-- 底部固定加入栏 -->
      <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4" style="padding-bottom:calc(16px + env(safe-area-inset-bottom))">
        <view class="flex items-center gap-4">
          <!-- 价格信息 -->
          <view class="flex-1">
            <view v-if="data.joinStatus.isPaid" class="flex items-baseline gap-2">
              <text class="text-2xl font-black text-primary">¥{{ data.joinStatus.price }}</text>
              <text v-if="data.joinStatus.originalPrice" class="text-sm text-muted-foreground line-through">¥{{ data.joinStatus.originalPrice }}</text>
              <text v-if="data.joinStatus.membershipDays" class="text-xs text-ink-soft">/ {{ data.joinStatus.membershipDays }}天</text>
            </view>
            <text v-else class="text-lg font-bold text-foreground">免费加入</text>
          </view>

          <!-- 加入按钮 -->
          <view @click="handleJoin"
            class="px-8 py-3 text-white font-bold rounded-full text-center" style="background:linear-gradient(135deg,#C41E3A,#E74C3C);box-shadow:0 4px 12px rgba(196,30,58,0.3)">
            <text>{{ data.joinStatus.isPaid ? '立即加入' : '免费加入' }}</text>
          </view>
        </view>
      </view>

      <!-- 付费加入弹窗 -->
      <view v-if="showJoinModal" class="fixed inset-0 bg-black/50 z-50 flex items-end" @click="showJoinModal = false">
        <view class="w-full bg-white rounded-t-3xl p-6 pb-10" @click.stop>
          <view class="w-12 h-1 bg-[#E8E0D5] rounded-full mx-auto mb-6" />

          <text class="text-lg font-bold text-center text-foreground block mb-2">加入{{ data.circle.name }}</text>
          <text class="text-sm text-ink-soft text-center block mb-6">开启您的学习之旅</text>

          <!-- 价格卡片 -->
          <view class="p-4 rounded-2xl mb-6" style="background:linear-gradient(135deg,#FFF5F0,#FFEBE5);border:1px solid rgba(196,30,58,0.2)">
            <view class="flex items-center justify-between mb-3">
              <text class="text-sm text-ink-soft">会员时长</text>
              <text class="text-sm font-medium text-foreground">{{ data.joinStatus.membershipDays }} 天</text>
            </view>
            <view class="flex items-center justify-between">
              <text class="text-sm text-ink-soft">支付金额</text>
              <view class="flex items-baseline gap-2">
                <text class="text-2xl font-black text-primary">¥{{ data.joinStatus.price }}</text>
                <text v-if="data.joinStatus.originalPrice" class="text-sm text-muted-foreground line-through">¥{{ data.joinStatus.originalPrice }}</text>
              </view>
            </view>
          </view>

          <!-- 支付按钮 -->
          <view @click="goToPayment"
            class="w-full py-4 text-white font-bold rounded-xl text-base text-center" style="background:linear-gradient(135deg,#C41E3A,#E74C3C)">
            <text>确认支付</text>
          </view>

          <!-- 协议 -->
          <text class="text-xs text-muted-foreground text-center block mt-4">
            点击确认即表示同意
            <text class="text-primary" @click="goTo('/pages/policy/user/index')">《用户协议》</text>
          </text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api'

interface CircleOwner {
  id: string; name: string; avatar: string
}

interface CircleInfo {
  id: string; name: string; cover: string; description: string
  category: string; members: number; posts: number; isJoined: boolean
  todayActive: number; createdAt: string; owner: CircleOwner
  rules: string[]; tags: string[]
}

interface FeaturedPost {
  id: string; content: string; author: { name: string; avatar: string }
  likes: number; comments: number; preview: string
}

interface JoinStatus {
  isJoined: boolean; isPaid: boolean; price: number
  originalPrice?: number; membershipDays?: number; discount?: string
}

interface CirclePreview {
  circle: CircleInfo; featuredPosts: FeaturedPost[]; joinStatus: JoinStatus
}

const isLoading = ref(true)
const data = ref<CirclePreview | null>(null)
const showJoinModal = ref(false)
const showLockTip = ref<string | null>(null)

const benefitsList = [
  { icon: '', text: '查看全部精华帖' },
  { icon: '', text: '参与圈子讨论' },
  { icon: '', text: '结识同好圈友' },
  { icon: '', text: '专属会员活动' },
]

const mockPreview: CirclePreview = {
  circle: {
    id: '1',
    name: '八字命理研习社',
    cover: '/images/circles/circle-1.jpg',
    description: '专注八字命理学习与交流，汇聚资深命理师与爱好者。从入门到精通，共同探索命理奥秘。',
    category: '命理',
    members: 12860,
    posts: 3280,
    isJoined: false,
    todayActive: 128,
    createdAt: '2023-01-01',
    owner: { id: '1', name: '周易大师', avatar: '/images/experts/expert-1.jpg' },
    rules: ['禁止发布广告', '尊重他人观点', '保持友善交流'],
    tags: ['八字', '命理', '易学', '传统文化'],
  },
  featuredPosts: [
    {
      id: '1', content: '今天给大家分享一个八字看婚姻的技巧，日支为配偶宫，看日支与其他地支的关系可以判断...',
      author: { name: '命理研究者', avatar: '/images/experts/expert-2.jpg' },
      likes: 328, comments: 56,
      preview: '日支为配偶宫，看日支与其他地支的关系...',
    },
    {
      id: '2', content: '关于食神制杀格局的详细分析，食神制杀是八字中非常重要的格局之一...',
      author: { name: '易学传承', avatar: '/images/experts/expert-3.jpg' },
      likes: 256, comments: 42,
      preview: '食神制杀是八字中非常重要的格局之一...',
    },
    {
      id: '3', content: '八字十神详解系列（一）：比肩劫财的特性与应用，比肩代表同类相助...',
      author: { name: '周易学堂', avatar: '/images/experts/expert-4.jpg' },
      likes: 412, comments: 89,
      preview: '比肩代表同类相助，劫财则有争夺之意...',
    },
    {
      id: '4', content: '从八字看职业方向，官杀旺者适合从政或管理岗位，食伤生财者适合创业...',
      author: { name: '命理导师', avatar: '/images/experts/expert-5.jpg' },
      likes: 198, comments: 34,
      preview: '官杀旺者适合从政或管理岗位...',
    },
  ],
  joinStatus: {
    isJoined: false,
    isPaid: true,
    price: 99,
    originalPrice: 199,
    membershipDays: 365,
    discount: '限时5折',
  },
}

onMounted(async () => {
  try {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1] as any
    const circleId = currentPage?.$page?.options?.id || ''

    const res = await api.get(`/circles/${circleId}/preview`)
    if (res && typeof res === 'object' && 'circle' in res) {
      data.value = res as unknown as CirclePreview
    } else {
      throw new Error('preview data missing')
    }
  } catch {
    // 降级使用 mock 数据
    await new Promise(resolve => setTimeout(resolve, 300))
    data.value = mockPreview
  } finally {
    isLoading.value = false
  }
})

function handlePostClick(postId: string) {
  showLockTip.value = postId
  setTimeout(() => { showLockTip.value = null }, 2000)
}

function handleShare() {
  uni.showToast({ title: '分享链接已复制', icon: 'success' })
}

function handleJoin() {
  if (data.value?.joinStatus.isPaid) {
    showJoinModal.value = true
  } else {
    uni.showToast({ title: '加入成功', icon: 'success' })
  }
}

function goToPayment() {
  uni.navigateTo({ url: '/pages/payment/index?type=circle&id=' + data.value?.circle.id })
}

function rankBadgeStyle(index: number) {
  if (index === 0) return 'background:linear-gradient(135deg,#FFD700,#FFA500)'
  if (index === 1) return 'background:linear-gradient(135deg,#C0C0C0,#A0A0A0)'
  if (index === 2) return 'background:linear-gradient(135deg,#CD7F32,#A0522D)'
  return 'background:#999999'
}

function formatNumber(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
@keyframes pulse {
  0%, 100% { opacity: 1 }
  50% { opacity: 0.4 }
}
</style>
