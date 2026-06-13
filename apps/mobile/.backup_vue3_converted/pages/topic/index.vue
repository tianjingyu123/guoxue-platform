<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 导航栏 -->
    <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border shrink-0">
      <view class="p-1" @click="goBack">
        <text class="text-xl text-foreground">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">话题</text>
      <view class="w-7 flex items-center justify-center" @click="onShare">
        <text class="text-lg"></text>
      </view>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="flex-1 p-4">
      <view class="bg-white rounded-2xl p-6 mb-4 skeleton-pulse">
        <view class="w-14 h-14 rounded-full bg-muted mx-auto mb-3 skeleton-pulse" />
        <view class="h-5 w-28 bg-muted mx-auto rounded mb-2 skeleton-pulse" />
        <view class="h-3 w-40 bg-muted mx-auto rounded mb-3 skeleton-pulse" />
        <view class="h-3 w-48 bg-muted mx-auto rounded skeleton-pulse" />
      </view>
      <view class="flex gap-2 mb-4">
        <view v-for="i in 3" :key="i" class="h-8 flex-1 bg-muted rounded-lg skeleton-pulse" />
      </view>
      <view v-for="i in 4" :key="i" class="bg-white rounded-xl p-3.5 mb-2.5 skeleton-pulse">
        <view class="space-y-2">
          <view class="h-4 w-3/4 bg-muted rounded skeleton-pulse" />
          <view class="h-3 w-full bg-muted rounded skeleton-pulse" />
          <view class="h-3 w-1/2 bg-muted rounded skeleton-pulse" />
        </view>
      </view>
    </view>

    <!-- 主内容 -->
    <scroll-view v-else scroll-y class="flex-1 overflow-y-auto">
      <!-- 话题头部 -->
      <view class="bg-white mx-4 mt-4 rounded-2xl p-6 text-center shadow-sm">
        <view class="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-[#D4B87A] flex items-center justify-center text-3xl mx-auto mb-3">
          <text>{{ topic.icon }}</text>
        </view>
        <text class="text-xl font-semibold text-foreground block">{{ topic.name }}</text>
        <text class="text-[13px] text-ink-soft block mt-1.5 leading-relaxed">{{ topic.desc }}</text>
        <view class="flex items-center justify-center gap-4 mt-3">
          <view class="text-center">
            <text class="text-lg font-bold text-primary block">{{ topic.discussions }}</text>
            <text class="text-[11px] text-muted-foreground">讨论</text>
          </view>
          <view class="w-px h-8 bg-[#E8E0D5]" />
          <view class="text-center">
            <text class="text-lg font-bold text-primary block">{{ topic.followers }}</text>
            <text class="text-[11px] text-muted-foreground">关注</text>
          </view>
          <view class="w-px h-8 bg-[#E8E0D5]" />
          <view class="text-center">
            <text class="text-lg font-bold text-primary block">{{ topic.views }}</text>
            <text class="text-[11px] text-muted-foreground">浏览</text>
          </view>
        </view>
        <!-- 关注/发帖按钮 -->
        <view class="flex gap-3 mt-4">
          <view class="flex-1 py-2.5 rounded-xl text-sm font-medium text-center"
            :class="isFollowed ? 'bg-secondary text-foreground' : 'bg-primary text-white'"
            @click="toggleFollow">
            <text>{{ isFollowed ? '已关注' : '+ 关注话题' }}</text>
          </view>
          <view class="flex-1 py-2.5 bg-accent text-white rounded-xl text-sm font-medium text-center" @click="onPost">
            <text> 发帖</text>
          </view>
        </view>
      </view>

      <!-- 排序 -->
      <view class="flex items-center gap-4 px-4 mt-3 mb-2">
        <text class="text-sm font-medium"
          :class="sortBy === 'new' ? 'text-primary' : 'text-muted-foreground'"
          @click="sortBy = 'new'">最新</text>
        <text class="text-sm font-medium"
          :class="sortBy === 'hot' ? 'text-primary' : 'text-muted-foreground'"
          @click="sortBy = 'hot'"> 最热</text>
        <text class="text-sm font-medium"
          :class="sortBy === 'essence' ? 'text-primary' : 'text-muted-foreground'"
          @click="sortBy = 'essence'"> 精华</text>
        <text class="text-xs text-muted-foreground ml-auto">{{ sortedPosts.length }}条帖子</text>
      </view>

      <!-- 帖子列表 -->
      <view class="px-4 pb-6">
        <view v-for="p in sortedPosts" :key="p.id" class="bg-white rounded-xl p-3.5 mb-2.5 shadow-sm active:opacity-80" @click="goPost(p.id)">
          <view class="flex items-start gap-3">
            <view class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[#E57373] text-white flex items-center justify-center text-xs shrink-0">
              {{ p.author[0] }}
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-1.5">
                <text class="text-sm font-medium text-foreground">{{ p.author }}</text>
                <text v-if="p.isElite" class="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">精华</text>
              </view>
              <text class="text-sm text-foreground block mt-0.5 leading-relaxed line-clamp-2">{{ p.content }}</text>
              <view class="flex items-center gap-3 mt-1.5">
                <text class="text-[11px] text-muted-foreground">{{ p.time }}</text>
                <text class="text-[11px] text-muted-foreground"> {{ p.likes }}</text>
                <text class="text-[11px] text-muted-foreground"> {{ p.replies }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view class="flex items-center justify-center py-4">
          <text class="text-xs text-[#bbb]">— 下拉加载更多 —</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const loading = ref(true)
const isFollowed = ref(false)
const sortBy = ref<'new' | 'hot' | 'essence'>('new')

interface Topic {
  name: string
  icon: string
  desc: string
  discussions: number
  followers: number
  views: number
}

const topic = ref<Topic>({
  name: '#国学入门',
  icon: '',
  desc: '分享国学经典、传统文化知识，一起走进中华五千年文明的智慧殿堂。欢迎所有对国学感兴趣的朋友！',
  discussions: 1286,
  followers: 3580,
  views: 25600,
})

interface Post {
  id: string
  author: string
  content: string
  time: string
  likes: number
  replies: number
  isElite: boolean
  isNew: boolean
}

const posts = ref<Post[]>([
  { id: '1', author: '易学探索者', content: '易经入门第一步：先搞清楚八卦的基本含义。乾为天、坤为地、震为雷、巽为风、坎为水、离为火、艮为山、兑为泽。', time: '30分钟前', likes: 45, replies: 12, isElite: false, isNew: true },
  { id: '2', author: '国学讲师', content: '《论语》为政篇："学而不思则罔，思而不学则殆。" 这句话强调了学与思的辩证关系，对我们今天的学习仍有重要指导意义。', time: '2小时前', likes: 89, replies: 23, isElite: true, isNew: false },
  { id: '3', author: '传统文化爱好者', content: '推荐几本国学入门必读书目：《论语》《道德经》《周易》《诗经》《史记》。建议先从《论语》开始，语言相对通俗。', time: '昨天', likes: 156, replies: 34, isElite: true, isNew: false },
  { id: '4', author: '书法研习者', content: '练字也是修行。颜真卿的楷书最适合入门，结构端庄、笔画有力。每天坚持半小时，三个月必见成效。', time: '昨天', likes: 78, replies: 15, isElite: false, isNew: false },
  { id: '5', author: '中医爱好者', content: '《黄帝内经》中的"治未病"理念：上医治未病，中医治欲病，下医治已病。预防胜于治疗。', time: '3天前', likes: 112, replies: 28, isElite: true, isNew: false },
  { id: '6', author: '国学新人', content: '刚刚读完《道德经》，最喜欢"上善若水"这一章。水善利万物而不争，处众人之所恶，故几于道。太有哲理了！', time: '4天前', likes: 34, replies: 9, isElite: false, isNew: false },
])

const sortedPosts = computed(() => {
  if (sortBy.value === 'new') {
    return [...posts.value]
  } else if (sortBy.value === 'hot') {
    return [...posts.value].sort((a, b) => b.likes - a.likes)
  } else {
    return [...posts.value].filter(p => p.isElite)
  }
})

function toggleFollow() {
  isFollowed.value = !isFollowed.value
  if (isFollowed.value) {
    topic.value.followers++
    uni.showToast({ title: '已关注话题', icon: 'success' })
  } else {
    topic.value.followers--
  }
}

function onPost() {
  uni.showToast({ title: '发帖功能即将开放', icon: 'none' })
}

function onShare() {
  uni.showToast({ title: '分享功能即将开放', icon: 'none' })
}

function goPost(id: string) {
  uni.navigateTo({ url: `/pages/post/index?id=${id}` })
}

function goBack() { uni.navigateBack() }

setTimeout(() => { loading.value = false }, 1000)
</script>

<style scoped>
.skeleton-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
/* 样式由 Tailwind 处理 */
</style>
