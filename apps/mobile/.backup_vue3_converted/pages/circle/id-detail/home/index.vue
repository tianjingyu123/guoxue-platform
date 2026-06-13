<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- Top nav -->
    <view class="sticky top-0 z-40 bg-background/95 border-b border-border" style="padding-top:44px">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
        <view class="flex items-center gap-2">
          <view class="p-2 rounded-full" @click="goNotifications"><text class="text-lg"></text></view>
          <view class="p-2 rounded-full" @click="onShare"><text class="text-lg">↗️</text></view>
          <view class="p-2 rounded-full" @click="showMoreMenu = !showMoreMenu"><text class="text-lg">⋯</text></view>
        </view>
      </view>
    </view>

    <!-- Circle header -->
    <view class="relative">
      <view class="h-28 bg-gradient-to-br from-primary/30 via-[#C9A96E]/20 to-primary/70" />
      <view class="px-4 -mt-8 relative z-10">
        <view class="p-4 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] rounded-2xl">
          <view class="flex items-start gap-3">
            <view class="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center border-2 border-white shadow-lg flex-shrink-0">
              <text class="text-3xl text-primary"></text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="font-bold text-lg text-foreground block">{{ circleData.name }}</text>
              <view class="flex items-center gap-2 mt-1">
                <text class="text-xs text-muted-foreground">{{ circleData.memberCount }} 成员</text>
                <text v-if="circleData.myMemberNo" class="text-[10px] px-1.5 py-0 border border-accent text-accent rounded">{{ circleData.myMemberNo }}</text>
              </view>
            </view>
            <!-- Sign-in -->
            <view class="flex flex-col items-center px-3 py-1.5 rounded-lg" :class="hasSigned ? 'bg-[#F0EDE8] text-muted-foreground' : 'bg-primary text-white'" @click="handleSign">
              <text class="text-sm">{{ hasSigned ? '' : '' }}</text>
              <text class="text-[10px] mt-0.5">{{ hasSigned ? '已签到' : '签到' }}</text>
            </view>
          </view>
          <view v-if="hasSigned" class="mt-3 pt-3 border-t border-border">
            <text class="text-xs text-muted-foreground text-center block">连续签到 <text class="text-accent font-medium">{{ circleData.signStreak + 1 }}</text> 天</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Content tabs -->
    <view class="sticky top-[116px] z-30 bg-background border-b border-border mt-4">
      <view class="flex items-center px-4 overflow-x-auto" style="scrollbar-width:none">
        <view v-for="tab in contentTabs" :key="tab.id" class="px-4 py-3 text-sm font-medium whitespace-nowrap relative" :class="activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground'" @click="activeTab = tab.id">
          <text>{{ tab.label }}</text>
          <view v-if="activeTab === tab.id" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full" />
        </view>
      </view>
    </view>

    <!-- All tab content -->
    <view v-if="activeTab === 'all'" class="p-4 pb-24">
      <view class="flex items-center gap-3 mb-3">
        <view class="text-sm" :class="sortBy === 'latest' ? 'text-foreground font-medium' : 'text-muted-foreground'" @click="sortBy = 'latest'">最新发布</view>
        <text class="text-[#E8E0D5]">|</text>
        <view class="text-sm" :class="sortBy === 'reply' ? 'text-foreground font-medium' : 'text-muted-foreground'" @click="sortBy = 'reply'">最新回复</view>
      </view>
      <view v-for="post in posts" :key="post.id" class="bg-white rounded-xl p-4 mb-3 shadow-sm" @click="goPost(post.id)">
        <view class="flex items-center gap-2 mb-2">
          <text v-if="post.isPinned" class="text-[10px] px-1.5 py-0.5 bg-primary text-white rounded flex items-center gap-0.5">📌 置顶</text>
          <text v-if="post.isEssence" class="text-[10px] px-1.5 py-0.5 bg-accent text-white rounded flex items-center gap-0.5"> 精华</text>
        </view>
        <view class="flex items-center gap-2 mb-2">
          <view class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center text-white text-xs font-bold" />
          <view class="flex-1">
            <view class="flex items-center gap-1.5">
              <text class="text-sm font-medium text-foreground">{{ post.author.name }}</text>
              <text v-if="post.author.isOwner" class="text-[10px] px-1 py-0 border border-primary text-primary rounded">圈主</text>
            </view>
            <text class="text-xs text-muted-foreground block">{{ post.time }}</text>
          </view>
        </view>
        <text class="text-sm text-foreground block leading-relaxed line-clamp-3 mb-2">{{ post.content }}</text>
        <view v-if="post.images.length > 0" class="grid gap-1.5 mb-3" :class="post.images.length === 1 ? 'grid-cols-1' : post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'">
          <view v-for="(_, index) in post.images.slice(0, 3)" :key="index" class="bg-[#F0EDE8] rounded-lg flex items-center justify-center" :class="post.images.length === 1 ? 'aspect-[16/9]' : 'aspect-square'">
            <text class="text-2xl text-muted-foreground/40"></text>
          </view>
        </view>
        <view class="flex items-center gap-4 text-muted-foreground">
          <text class="flex items-center gap-1 text-xs"> {{ post.likes }}</text>
          <text class="flex items-center gap-1 text-xs"> {{ post.comments }}</text>
        </view>
      </view>
    </view>

    <!-- Essence tab -->
    <view v-if="activeTab === 'essence'" class="p-4 pb-24">
      <template v-if="essencePosts.length > 0">
        <view v-for="post in essencePosts" :key="post.id" class="bg-white rounded-xl p-4 mb-3 shadow-sm" @click="goPost(post.id)">
          <view class="flex items-center gap-2 mb-2">
            <text v-if="post.isPinned" class="text-[10px] px-1.5 py-0.5 bg-primary text-white rounded">📌 置顶</text>
            <text v-if="post.isEssence" class="text-[10px] px-1.5 py-0.5 bg-accent text-white rounded"> 精华</text>
          </view>
          <view class="flex items-center gap-2 mb-2">
            <view class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center text-white text-xs font-bold" />
            <view class="flex-1">
              <view class="flex items-center gap-1.5">
                <text class="text-sm font-medium text-foreground">{{ post.author.name }}</text>
                <text v-if="post.author.isOwner" class="text-[10px] px-1 py-0 border border-primary text-primary rounded">圈主</text>
              </view>
              <text class="text-xs text-muted-foreground block">{{ post.time }}</text>
            </view>
          </view>
          <text class="text-sm text-foreground block leading-relaxed line-clamp-3 mb-2">{{ post.content }}</text>
          <view class="flex items-center gap-4 text-muted-foreground">
            <text class="flex items-center gap-1 text-xs"> {{ post.likes }}</text>
            <text class="flex items-center gap-1 text-xs"> {{ post.comments }}</text>
          </view>
        </view>
      </template>
      <template v-else>
        <view class="flex flex-col items-center justify-center py-16">
          <text class="text-4xl text-muted-foreground/30 mb-3"></text>
          <text class="text-sm text-muted-foreground">暂无精华帖</text>
        </view>
      </template>
    </view>

    <!-- Course tab -->
    <view v-if="activeTab === 'course'" class="p-4 space-y-3 pb-24">
      <template v-if="courses.length > 0">
        <view v-for="course in courses" :key="course.id" class="flex gap-3 bg-white rounded-xl p-3 shadow-sm" @click="goCourse(course.id)">
          <view class="w-28 aspect-[4/3] rounded-lg bg-[#F0EDE8] flex items-center justify-center flex-shrink-0">
            <text class="text-3xl text-accent/60"></text>
          </view>
          <view class="flex-1 min-w-0">
            <text class="font-medium text-sm text-foreground block line-clamp-2">{{ course.title }}</text>
            <text class="text-xs text-muted-foreground block mt-1">{{ course.instructor }}</text>
            <view class="flex items-center justify-between mt-2">
              <text class="text-sm text-primary font-medium">¥{{ course.price }}</text>
              <text class="text-xs text-muted-foreground">{{ course.students }}人学习</text>
            </view>
          </view>
        </view>
      </template>
      <template v-else>
        <view class="flex flex-col items-center justify-center py-16">
          <text class="text-4xl text-muted-foreground/30 mb-3"></text>
          <text class="text-sm text-muted-foreground">暂无课程</text>
        </view>
      </template>
    </view>

    <!-- Article tab -->
    <view v-if="activeTab === 'article'" class="p-4 space-y-3 pb-24">
      <template v-if="articles.length > 0">
        <view v-for="article in articles" :key="article.id" class="bg-white rounded-xl p-4 shadow-sm" @click="goArticle(article.id)">
          <text class="font-medium text-sm text-foreground block line-clamp-2">{{ article.title }}</text>
          <view class="flex items-center justify-between mt-2">
            <text class="text-xs text-muted-foreground">{{ article.author }}</text>
            <view class="flex items-center gap-3 text-xs text-muted-foreground">
              <text>{{ article.views }} 阅读</text>
              <text>{{ article.time }}</text>
            </view>
          </view>
        </view>
      </template>
      <template v-else>
        <view class="flex flex-col items-center justify-center py-16">
          <text class="text-4xl text-muted-foreground/30 mb-3"></text>
          <text class="text-sm text-muted-foreground">暂无文章</text>
        </view>
      </template>
    </view>

    <!-- Video tab -->
    <view v-if="activeTab === 'video'" class="p-4 pb-24">
      <template v-if="videos.length > 0">
        <view class="grid grid-cols-2 gap-3">
          <view v-for="video in videos" :key="video.id" class="bg-white rounded-xl overflow-hidden shadow-sm" @click="goVideo(video.id)">
            <view class="aspect-[3/4] bg-gradient-to-br from-[#2C2C2C] to-[#555] flex items-center justify-center relative">
              <text class="text-4xl text-white/60">▶️</text>
              <view class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">{{ video.duration }}</view>
              <view class="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px]">
                <text>▶️</text> {{ (video.plays / 1000).toFixed(1) }}k
              </view>
            </view>
            <view class="p-2">
              <text class="text-xs font-medium text-foreground block line-clamp-2">{{ video.title }}</text>
            </view>
          </view>
        </view>
      </template>
      <template v-else>
        <view class="flex flex-col items-center justify-center py-16">
          <text class="text-4xl text-muted-foreground/30 mb-3"></text>
          <text class="text-sm text-muted-foreground">暂无短视频</text>
        </view>
      </template>
    </view>

    <!-- Live tab -->
    <view v-if="activeTab === 'live'" class="p-4 space-y-3 pb-24">
      <template v-if="lives.length > 0">
        <view v-for="live in lives" :key="live.id" class="flex gap-3 bg-white rounded-xl p-3 shadow-sm" @click="goLive(live.id)">
          <view class="w-24 aspect-video rounded-lg bg-[#F0EDE8] flex items-center justify-center flex-shrink-0 relative">
            <text class="text-2xl text-primary/60">📡</text>
            <view v-if="live.status === 'upcoming'" class="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-blue-500 text-white text-[10px]">预约</view>
            <view v-if="live.hasReplay" class="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-accent text-white text-[10px]">回放</view>
          </view>
          <view class="flex-1 min-w-0">
            <text class="font-medium text-sm text-foreground block line-clamp-1">{{ live.title }}</text>
            <text class="text-xs text-muted-foreground block mt-1">{{ live.time }}</text>
            <text v-if="live.viewers > 0" class="text-xs text-muted-foreground block mt-0.5">{{ live.viewers }} 人观看</text>
          </view>
        </view>
      </template>
      <template v-else>
        <view class="flex flex-col items-center justify-center py-16">
          <text class="text-4xl text-muted-foreground/30 mb-3">📡</text>
          <text class="text-sm text-muted-foreground">暂无直播</text>
        </view>
      </template>
    </view>

    <!-- Product tab -->
    <view v-if="activeTab === 'product'" class="p-4 pb-24">
      <template v-if="products.length > 0">
        <view class="grid grid-cols-2 gap-3">
          <view v-for="product in products" :key="product.id" class="bg-white rounded-xl overflow-hidden shadow-sm" @click="goProduct(product.id)">
            <view class="aspect-square bg-[#F0EDE8] flex items-center justify-center">
              <text class="text-4xl text-muted-foreground/40"></text>
            </view>
            <view class="p-2">
              <text class="text-xs font-medium text-foreground block line-clamp-2">{{ product.name }}</text>
              <view class="flex items-center justify-between mt-1">
                <text class="text-sm text-primary font-medium">¥{{ product.price }}</text>
                <text class="text-[10px] text-muted-foreground">{{ product.sales }}人购买</text>
              </view>
            </view>
          </view>
        </view>
      </template>
      <template v-else>
        <view class="flex flex-col items-center justify-center py-16">
          <text class="text-4xl text-muted-foreground/30 mb-3"></text>
          <text class="text-sm text-muted-foreground">暂无商品</text>
        </view>
      </template>
    </view>

    <!-- Floating action buttons -->
    <view class="fixed bottom-24 right-4 flex flex-col gap-3 z-40">
      <view v-if="circleData.hasAIAssistant" class="w-12 h-12 rounded-full bg-accent shadow-lg flex items-center justify-center" @click="showAIAssistant = true">
        <text class="text-white text-xl">🤖</text>
      </view>
      <view class="relative">
        <view class="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-[#E74C3C] shadow-lg flex items-center justify-center" @click="showPublishMenu = !showPublishMenu">
          <text class="text-white text-2xl">✏️</text>
        </view>
        <view v-if="showPublishMenu">
          <view class="fixed inset-0 z-40" @click="showPublishMenu = false" />
          <view class="absolute bottom-16 right-0 w-36 bg-white rounded-xl shadow-xl border border-border overflow-hidden z-50">
            <view class="flex items-center gap-2 px-4 py-3 text-sm text-foreground border-b border-border" @click="goPublish('post')">
              <text class="text-primary">✏️</text>
              <text>发帖子</text>
            </view>
            <view class="flex items-center gap-2 px-4 py-3 text-sm text-foreground border-b border-border" @click="goPublish('video')">
              <text class="text-accent"></text>
              <text>发短视频</text>
            </view>
            <view class="flex items-center gap-2 px-4 py-3 text-sm text-foreground" @click="goPublish('live')">
              <text class="text-red-500">📡</text>
              <text>发起直播</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- AI assistant modal -->
    <view v-if="showAIAssistant">
      <view class="fixed inset-0 bg-black/50 z-50" @click="showAIAssistant = false" />
      <view class="fixed bottom-0 left-0 right-0 h-[60vh] bg-white rounded-t-2xl z-50 flex flex-col">
        <view class="flex items-center justify-between px-4 py-3 border-b border-border">
          <view class="flex items-center gap-2">
            <view class="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <text class="text-accent text-sm">🤖</text>
            </view>
            <view>
              <text class="font-medium text-sm text-foreground block">圈主助理</text>
              <text class="text-[10px] text-muted-foreground block">AI智能问答</text>
            </view>
          </view>
          <view class="p-2 rounded-full" @click="showAIAssistant = false">
            <text class="text-muted-foreground text-lg">↓</text>
          </view>
        </view>
        <view class="flex-1 p-4 overflow-y-auto">
          <view class="flex gap-3 mb-4">
            <view class="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <text class="text-accent text-sm">🤖</text>
            </view>
            <view class="flex-1">
              <view class="p-3 bg-background rounded-xl">
                <text class="text-sm text-foreground block">你好！我是本圈的AI助理，可以回答你关于八字命理的问题，也可以帮你了解圈子内容。有什么可以帮你的吗？</text>
              </view>
            </view>
          </view>
        </view>
        <view class="p-4 border-t border-border" style="padding-bottom:34px">
          <view class="flex items-center gap-2">
            <input type="text" placeholder="输入你的问题..." class="flex-1 px-4 py-2.5 rounded-full bg-background text-sm text-foreground" />
            <view class="p-2.5 rounded-full bg-primary text-white">
              <text class="text-sm"></text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- More menu -->
    <view v-if="showMoreMenu">
      <view class="fixed inset-0 z-40" @click="showMoreMenu = false" />
      <view class="absolute top-14 right-4 w-32 bg-white rounded-xl shadow-xl border border-border overflow-hidden z-50">
        <view class="px-4 py-3 text-sm text-foreground border-b border-border" @click="goSettings">⚙️ 圈子设置</view>
        <view class="px-4 py-3 text-sm text-foreground" @click="goManage"> 管理后台</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const circleData = {
  id: 1,
  name: '八字命理研习社',
  cover: '',
  memberCount: 1280,
  myMemberNo: 'No.0086',
  hasSignedToday: false,
  signStreak: 7,
  hasAIAssistant: true,
}

const contentTabs = [
  { id: 'all', label: '全部' },
  { id: 'essence', label: '精华' },
  { id: 'course', label: '课程' },
  { id: 'article', label: '文章' },
  { id: 'video', label: '短视频' },
  { id: 'live', label: '直播' },
  { id: 'product', label: '商品' },
]

const posts = [
  { id: 1, author: { name: '周易大师', avatar: '', isOwner: true }, content: '【置顶】欢迎各位新成员加入八字命理研习社！本圈子专注于八字命理学习与实践，每周二晚8点直播答疑，每月发布深度文章，请大家积极参与讨论。', images: [], likes: 328, comments: 56, time: '3天前', isPinned: true, isEssence: false },
  { id: 2, author: { name: '张玄风', avatar: '', isOwner: false }, content: '分享一个八字看财运的心得：日主身旺财星有根，大运流年再遇财星，必有进财之喜。但若身弱财旺，反而容易因财惹祸，需谨慎理财。大家有什么看法？', images: ['', '', ''], likes: 156, comments: 42, time: '5小时前', isPinned: false, isEssence: true },
  { id: 3, author: { name: '命理小白', avatar: '', isOwner: false }, content: '请教各位老师，八字中的食神和伤官有什么区别？什么情况下食神生财比较好？', images: [''], likes: 28, comments: 15, time: '2小时前', isPinned: false, isEssence: false },
  { id: 4, author: { name: '易学爱好者', avatar: '', isOwner: false }, content: '今天学习了十神配置，终于理解了为什么说官印相生是好格局。笔记分享给大家，欢迎指正！', images: ['', ''], likes: 89, comments: 23, time: '昨天', isPinned: false, isEssence: true },
]

const courses = [
  { id: 1, title: '八字入门精讲', instructor: '周易大师', price: 199, students: 856, cover: '' },
  { id: 2, title: '十神深度解析', instructor: '周易大师', price: 299, students: 428, cover: '' },
  { id: 3, title: '大运流年实战', instructor: '周易大师', price: 399, students: 312, cover: '' },
]

const articles = [
  { id: 1, title: '八字命理学入门指南：从零开始理解命盘', author: '周易大师', views: 2560, time: '3天前' },
  { id: 2, title: '十神配置与人生格局的关系探讨', author: '周易大师', views: 1890, time: '1周前' },
  { id: 3, title: '如何通过八字看婚姻感情？', author: '周易大师', views: 3240, time: '2周前' },
]

const videos = [
  { id: 1, title: '一分钟看懂八字排盘', cover: '', plays: 12800, duration: '00:58' },
  { id: 2, title: '什么是日主？', cover: '', plays: 8560, duration: '01:23' },
  { id: 3, title: '食神生财的秘密', cover: '', plays: 6280, duration: '02:15' },
  { id: 4, title: '官印相生格局解析', cover: '', plays: 5120, duration: '01:45' },
]

const lives = [
  { id: 1, title: '本周二直播：八字看财运', status: 'upcoming', time: '周二 20:00', viewers: 0 },
  { id: 2, title: '十神配置答疑', status: 'ended', time: '上周二', viewers: 856, hasReplay: true },
  { id: 3, title: '八字入门第一讲回放', status: 'ended', time: '2周前', viewers: 1280, hasReplay: true },
]

const products = [
  { id: 1, name: '《渊海子平》正版精装', price: 68, sales: 256, cover: '' },
  { id: 2, name: '专业排盘罗盘', price: 128, sales: 89, cover: '' },
  { id: 3, name: '八字学习笔记本套装', price: 38, sales: 412, cover: '' },
]

const activeTab = ref('all')
const sortBy = ref<'latest' | 'reply'>('latest')
const hasSigned = ref(circleData.hasSignedToday)
const showPublishMenu = ref(false)
const showAIAssistant = ref(false)
const showMoreMenu = ref(false)

const essencePosts = computed(() => posts.filter(p => p.isEssence))

function goBack() { uni.navigateBack() }
function goNotifications() { uni.navigateTo({ url: '/pages/notifications/index' }) }
function onShare() { uni.showShareMenu() }
function goSettings() { uni.navigateTo({ url: '/pages/circle/id-detail/settings/index' }) }
function goManage() { uni.navigateTo({ url: '/pages/circle/id-detail/manage/index' }) }
function goPost(id: number) { uni.navigateTo({ url: `/pages/circle/id-detail/posts/detail/index?id=${id}` }) }
function goCourse(id: number) { uni.navigateTo({ url: `/pages/course/id-detail/index?id=${id}` }) }
function goArticle(id: number) { uni.navigateTo({ url: `/pages/articles/id-detail/index?id=${id}` }) }
function goVideo(id: number) { uni.navigateTo({ url: `/pages/video/id-detail/index?id=${id}` }) }
function goLive(id: number) { uni.navigateTo({ url: `/pages/live/id-detail/index?id=${id}` }) }
function goProduct(id: number) { uni.navigateTo({ url: `/pages/shop/id-detail/index?id=${id}` }) }
function goPublish(type: string) { uni.navigateTo({ url: `/pages/circle/id-detail/publish/index?type=${type}` }) }

function handleSign() {
  if (!hasSigned.value) {
    hasSigned.value = true
    uni.showToast({ title: '签到成功', icon: 'success' })
  }
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
