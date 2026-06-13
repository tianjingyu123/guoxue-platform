<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 骨架屏 -->
    <template v-if="loading">
      <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border flex-shrink-0">
        <view class="w-7 h-7 bg-gray-200 rounded" />
        <view class="w-20 h-4 bg-gray-200 rounded" />
        <view class="w-14 h-6 bg-gray-200 rounded" />
      </view>
      <view class="flex bg-white border-b border-border">
        <view v-for="i in 3" :key="i" class="flex-1 h-10 bg-gray-200 mx-1" />
      </view>
      <view class="flex-1 p-4 space-y-3">
        <view v-for="i in 3" :key="i" class="h-44 bg-gray-200 rounded-xl" />
      </view>
    </template>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border flex-shrink-0">
        <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
        <text class="text-base font-semibold text-foreground">圈子帖子</text>
        <view class="px-3 py-1.5 bg-primary rounded-lg" @click="goPublish">
          <text class="text-white text-xs font-medium">+ 发帖</text>
        </view>
      </view>

      <!-- 排序Tab -->
      <view class="flex bg-white border-b border-border">
        <view v-for="t in tabs" :key="t.id"
          class="flex-1 py-2.5 text-center text-sm font-medium transition-colors"
          :class="activeTab === t.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'"
          @click="switchTab(t.id)">
          <text>{{ t.label }}</text>
        </view>
      </view>

      <!-- 圈子简介横幅 -->
      <view class="px-4 py-3 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border">
        <view class="flex items-center gap-2">
          <text class="text-lg">🏛️</text>
          <view class="flex-1">
            <text class="text-sm font-semibold text-foreground block">国学堂交流圈</text>
            <text class="text-[11px] text-muted-foreground">共 {{ posts.length }} 篇帖子 · {{ totalLikes }} 个赞</text>
          </view>
          <text class="text-xs text-primary font-medium px-2.5 py-1 bg-white rounded-full border border-primary/20">
            {{ activeTab === 'latest' ? '最新' : activeTab === 'essence' ? '精华' : '热门' }}排序
          </text>
        </view>
      </view>

      <scroll-view scroll-y class="flex-1 overflow-y-auto" @scrolltolower="loadMore">
        <!-- 帖子列表 -->
        <view class="p-4">
          <view v-for="p in posts" :key="p.id" class="bg-white rounded-xl p-4 mb-3 shadow-sm border border-border"
            @click="goPostDetail(p.id)">
            <!-- 作者信息 -->
            <view class="flex items-center gap-2.5 mb-2.5">
              <view class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                <text>{{ p.author[0] }}</text>
              </view>
              <view class="flex-1">
                <view class="flex items-center gap-1.5">
                  <text class="text-[13px] font-medium text-foreground">{{ p.author }}</text>
                  <text v-if="p.authorBadge"
                    class="text-[9px] px-1 py-0.25 bg-accent/20 text-accent rounded-full">{{ p.authorBadge }}</text>
                </view>
                <text class="text-[11px] text-muted-foreground block">{{ p.time }}</text>
              </view>
              <view class="flex gap-1">
                <text v-if="p.isPinned"
                  class="text-[10px] px-1.5 py-0.5 bg-[#FFF0F0] text-primary rounded font-medium">置顶</text>
                <text v-if="p.isEssence"
                  class="text-[10px] px-1.5 py-0.5 bg-[#FFF8E1] text-accent rounded font-medium">精华</text>
              </view>
            </view>

            <!-- 帖子标题 -->
            <text v-if="p.title"
              class="text-sm font-semibold text-foreground block mb-1 leading-relaxed">{{ p.title }}</text>

            <!-- 帖子内容 -->
            <text class="text-[13px] text-foreground leading-relaxed block"
              :class="p.expanded ? '' : 'line-clamp-3'">{{ p.content }}</text>
            <view v-if="p.content.length > 80" @click.stop="toggleExpand(p.id)"
              class="text-xs text-primary mt-1">
              <text>{{ p.expanded ? '收起' : '展开全文' }}</text>
            </view>

            <!-- 图片 -->
            <view v-if="p.images && p.images.length > 0"
              class="mt-2 flex gap-2"
              :class="p.images.length === 1 ? 'flex-row' : 'flex-wrap'">
              <image v-for="(img, i) in p.images.slice(0, 3)" :key="i"
                :src="img" mode="aspectFill"
                class="rounded-lg"
                :class="p.images.length === 1 ? 'w-full h-48' : 'w-[calc(33.33%-5px)] h-24'" />
              <view v-if="p.images.length > 3"
                class="w-[calc(33.33%-5px)] h-24 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-muted-foreground">
                +{{ p.images.length - 3 }}
              </view>
            </view>

            <!-- 标签 -->
            <view v-if="p.tags && p.tags.length > 0" class="flex gap-1.5 mt-2 flex-wrap">
              <text v-for="tag in p.tags" :key="tag"
                class="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground rounded-full">#{{ tag }}</text>
            </view>

            <!-- 互动栏 -->
            <view class="flex items-center gap-5 mt-3 pt-3 border-t border-[#F5F0E8] text-[11px] text-muted-foreground">
              <view @click.stop="toggleLike(p.id)" class="flex items-center gap-1">
                <text :class="p.isLiked ? 'text-red-500' : ''">{{ p.isLiked ? '' : '🤍' }}</text>
                <text :class="p.isLiked ? 'text-red-500' : ''">{{ p.likes }}</text>
              </view>
              <view class="flex items-center gap-1">
                <text></text>
                <text>{{ p.comments }}</text>
              </view>
              <view class="flex items-center gap-1">
                <text></text>
                <text>{{ p.views }}</text>
              </view>
              <view @click.stop="goShare" class="ml-auto flex items-center gap-1">
                <text></text>
                <text>分享</text>
              </view>
            </view>
          </view>

          <!-- 加载更多 -->
          <view v-if="hasMore" class="text-center py-3">
            <text class="text-xs text-primary">加载更多...</text>
          </view>
          <view v-else class="text-center py-4 text-xs text-muted-foreground">
            <text>— 已经到底了 —</text>
          </view>
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)
const activeTab = ref('latest')
const hasMore = ref(true)

const tabs = [
  { id: 'latest', label: '最新' },
  { id: 'essence', label: '精华' },
  { id: 'hot', label: '热门' },
]

interface Post {
  id: string
  author: string
  authorBadge: string
  title: string
  content: string
  time: string
  likes: number
  comments: number
  views: number
  isPinned: boolean
  isEssence: boolean
  isLiked: boolean
  expanded: boolean
  images: string[]
  tags: string[]
}

const posts = ref<Post[]>([
  {
    id: '1', author: '周易大师', authorBadge: '圈主',
    title: '易经乾卦解读：从潜龙到飞龙的智慧',
    content: '乾卦初九"潜龙勿用"的意思是事物发展初期应当积蓄力量，不宜急于行动。九二"见龙在田"开始崭露头角...九三"君子终日乾乾"时刻保持勤奋谨慎。九四"或跃在渊"可进可退的抉择。九五"飞龙在天"达到巅峰状态。上九"亢龙有悔"盛极而衰的警示。',
    time: '2小时前', likes: 56, comments: 12, views: 1280,
    isPinned: true, isEssence: true, isLiked: false, expanded: false,
    images: ['https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400'],
    tags: ['易经', '乾卦', '国学']
  },
  {
    id: '2', author: '国学爱好者', authorBadge: '',
    title: '推荐一本好书《国学概论》',
    content: '这本书由国学大师章太炎先生讲述，系统地介绍了国学的各个领域，包括经学、史学、子学、集学等。非常适合想要入门国学的朋友。全书分为五章，对经典文献进行了精要的分类介绍和梳理，是了解国学全貌的必读之作。',
    time: '5小时前', likes: 23, comments: 5, views: 890,
    isPinned: false, isEssence: false, isLiked: true, expanded: false,
    images: [],
    tags: ['推荐', '国学', '书单']
  },
  {
    id: '3', author: '易学入门', authorBadge: '新学员',
    title: '请教：八字缺金应该怎么补？',
    content: '请教各位大师，八字中的五行相生相克具体如何应用？比如我八字缺金，应该佩戴什么饰品来补充？是不是白色、金色的饰品都可以？还有哪些方法可以补金运？',
    time: '昨天', likes: 18, comments: 8, views: 256,
    isPinned: false, isEssence: false, isLiked: false, expanded: false,
    images: [],
    tags: ['八字', '五行', '求助']
  },
  {
    id: '4', author: '文化传承', authorBadge: '资深会员',
    title: '【经典诵读】大学之道',
    content: '大学之道，在明明德，在亲民，在止于至善。知止而后有定，定而后能静，静而后能安，安而后能虑，虑而后能得。物有本末，事有终始，知所先后，则近道矣。古之欲明明德于天下者，先治其国。',
    time: '昨天', likes: 35, comments: 6, views: 1680,
    isPinned: false, isEssence: true, isLiked: true, expanded: false,
    images: [],
    tags: ['经典诵读', '大学', '儒家']
  },
  {
    id: '5', author: '风水行家', authorBadge: '认证风水师',
    title: '居家风水布局的几个基本原则',
    content: '今天和大家分享居家风水的几个核心要点：1.大门是气口，要保持干净明亮，不宜正对卫生间。2.客厅宜宽敞明亮，沙发背后要有靠。3.卧室床头要有实墙，镜不对床。4.厨房灶台不宜正对水槽（水火相冲）。5.书房宜安静，书桌背后有靠山。',
    time: '2天前', likes: 89, comments: 23, views: 3450,
    isPinned: false, isEssence: true, isLiked: false, expanded: false,
    images: [
      'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=400',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    ],
    tags: ['风水', '居家', '布局']
  },
  {
    id: '6', author: '紫微传承人', authorBadge: '',
    title: '紫微斗数十二宫核心要义',
    content: '紫微斗数排盘完成后，首先要看命宫主星定位，然后依次分析兄弟、夫妻、子女、财帛、疾厄、迁移、交友、官禄、田宅、福德、父母十二宫。每个宫位都有其特定含义，配合四化（化禄、化权、化科、化忌）的飞星变化，可以全面分析一个人的命运走向。',
    time: '3天前', likes: 42, comments: 15, views: 2100,
    isPinned: false, isEssence: false, isLiked: false, expanded: false,
    images: [],
    tags: ['紫微斗数', '十二宫', '命理']
  },
])

const totalLikes = computed(() =>
  posts.value.reduce((sum, p) => sum + p.likes, 0)
)

onMounted(() => {
  setTimeout(() => { loading.value = false }, 400)
})

function switchTab(tabId: string) {
  activeTab.value = tabId
  if (tabId === 'essence') {
    posts.value.sort((a, b) => (b.isEssence ? 1 : 0) - (a.isEssence ? 1 : 0))
  } else if (tabId === 'hot') {
    posts.value.sort((a, b) => b.likes - a.likes)
  } else {
    posts.value.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return 0
    })
  }
}

function goBack() { uni.navigateBack() }
function goPublish() { uni.navigateTo({ url: '/pages/circles/id-detail/publish/index' }) }
function goPostDetail(id: string) { uni.navigateTo({ url: `/pages/circles/id-detail/posts/postId-detail/index?id=${id}` }) }
function goShare() { uni.showToast({ title: '已复制分享链接', icon: 'success' }) }

function toggleLike(id: string) {
  const p = posts.value.find(p => p.id === id)
  if (p) {
    p.isLiked = !p.isLiked
    p.likes += p.isLiked ? 1 : -1
  }
}

function toggleExpand(id: string) {
  const p = posts.value.find(p => p.id === id)
  if (p) p.expanded = !p.expanded
}

function loadMore() {
  if (!hasMore.value) return
  hasMore.value = false
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
