<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-header">
      <view class="nav-left" @click="goBack">
        <text class="nav-back-icon">←</text>
      </view>
      <view class="nav-actions">
        <text class="nav-act-btn" @click="onNotify">🔔</text>
        <text class="nav-act-btn" @click="onShare">📤</text>
        <text class="nav-act-btn" @click="onMore">⋯</text>
      </view>
    </view>

    <!-- 圈子封面 -->
    <view class="cover-gradient" />
    <!-- 圈子信息卡片 -->
    <view class="circle-card">
      <view class="circle-row">
        <view class="circle-avatar">✨</view>
        <view class="circle-info">
          <text class="circle-name">{{ circleData.name }}</text>
          <view class="circle-meta">
            <text class="circle-members">{{ circleData.memberCount }} 成员</text>
            <text class="circle-my-no">{{ circleData.myMemberNo }}</text>
          </view>
        </view>
        <view class="sign-btn" :class="{ signed: hasSigned }" @click="handleSign">
          <text>{{ hasSigned ? '✓ 已签到' : '📅 签到' }}</text>
        </view>
      </view>
      <view v-if="hasSigned" class="sign-streak">
        <text>连续签到 <text class="streak-num">{{ circleData.signStreak + 1 }}</text> 天</text>
      </view>
    </view>

    <!-- 内容Tab -->
    <view class="tab-bar">
      <scroll-view scroll-x class="tab-scroll">
        <view v-for="tab in contentTabs" :key="tab.id"
          class="tab-item" :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <text>{{ tab.label }}</text>
          <view v-if="activeTab === tab.id" class="tab-indicator" />
        </view>
      </scroll-view>
    </view>

    <scroll-view scroll-y class="content" :style="{ height: 'calc(100vh - 56px - 100rpx)' }">
      <!-- 全部Tab: 排序+帖子 -->
      <view v-if="activeTab === 'all'" class="feed-section">
        <view class="sort-row">
          <text class="sort-option" :class="{ active: sortBy === 'latest' }" @click="sortBy = 'latest'">最新发布</text>
          <text class="sort-sep">|</text>
          <text class="sort-option" :class="{ active: sortBy === 'reply' }" @click="sortBy = 'reply'">最新回复</text>
        </view>
        <view v-for="post in posts" :key="post.id" class="post-card">
          <view class="post-tags">
            <text v-if="post.isPinned" class="post-tag tag-pin">📌 置顶</text>
            <text v-if="post.isEssence" class="post-tag tag-essence">⭐ 精华</text>
          </view>
          <view class="post-author-row">
            <text class="post-avatar">{{ post.author.name[0] }}</text>
            <view class="post-author-info">
              <view class="post-author-namerow">
                <text class="post-author-name">{{ post.author.name }}</text>
                <text v-if="post.author.isOwner" class="post-owner-badge">圈主</text>
              </view>
              <text class="post-time">{{ post.time }}</text>
            </view>
          </view>
          <text class="post-content">{{ post.content }}</text>
          <view v-if="post.images.length > 0" class="post-images" :class="'img-count-' + Math.min(post.images.length, 3)">
            <view v-for="(_, i) in post.images.slice(0, 3)" :key="i" class="post-img-placeholder">
              <text class="post-img-icon">🖼️</text>
            </view>
          </view>
          <view class="post-stats">
            <text class="post-stat">❤️ {{ post.likes }}</text>
            <text class="post-stat">💬 {{ post.comments }}</text>
          </view>
        </view>
      </view>

      <!-- 精华Tab -->
      <view v-else-if="activeTab === 'essence'" class="feed-section">
        <view v-for="post in essencePosts" :key="post.id" class="post-card">
          <view class="post-tags">
            <text class="post-tag tag-essence">⭐ 精华</text>
          </view>
          <view class="post-author-row">
            <text class="post-avatar">{{ post.author.name[0] }}</text>
            <view class="post-author-info">
              <text class="post-author-name">{{ post.author.name }}</text>
              <text class="post-time">{{ post.time }}</text>
            </view>
          </view>
          <text class="post-content">{{ post.content }}</text>
          <view class="post-stats">
            <text class="post-stat">❤️ {{ post.likes }}</text>
            <text class="post-stat">💬 {{ post.comments }}</text>
          </view>
        </view>
        <view v-if="essencePosts.length === 0" class="empty-state">
          <text class="empty-icon">⭐</text>
          <text class="empty-text">暂无精华帖</text>
        </view>
      </view>

      <!-- 课程Tab -->
      <view v-else-if="activeTab === 'course'" class="list-section">
        <view v-if="courses.length > 0">
          <view v-for="course in courses" :key="course.id" class="course-card" @click="goPage('/pages/courses/course-detail/index')">
            <view class="course-thumb">📚</view>
            <view class="course-info">
              <text class="course-title">{{ course.title }}</text>
              <text class="course-instructor">{{ course.instructor }}</text>
              <view class="course-bottom">
                <text class="course-price">¥{{ course.price }}</text>
                <text class="course-students">{{ course.students }}人学习</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text class="empty-icon">📚</text>
          <text class="empty-text">暂无课程</text>
        </view>
      </view>

      <!-- 文章Tab -->
      <view v-else-if="activeTab === 'article'" class="list-section">
        <view v-if="articles.length > 0">
          <view v-for="article in articles" :key="article.id" class="article-card">
            <text class="article-title">{{ article.title }}</text>
            <view class="article-meta">
              <text class="article-author">{{ article.author }}</text>
              <text class="article-views">{{ article.views }} 阅读</text>
              <text class="article-time">{{ article.time }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text class="empty-icon">📄</text>
          <text class="empty-text">暂无文章</text>
        </view>
      </view>

      <!-- 短视频Tab -->
      <view v-else-if="activeTab === 'video'" class="grid-section">
        <view v-if="videos.length > 0" class="video-grid">
          <view v-for="video in videos" :key="video.id" class="video-card">
            <view class="video-cover">
              <text class="video-play">▶️</text>
              <text class="video-dur">{{ video.duration }}</text>
              <text class="video-plays">{{ (video.plays / 1000).toFixed(1) }}k</text>
            </view>
            <text class="video-title">{{ video.title }}</text>
          </view>
        </view>
        <view v-else class="empty-state">
          <text class="empty-icon">📹</text>
          <text class="empty-text">暂无短视频</text>
        </view>
      </view>

      <!-- 直播Tab -->
      <view v-else-if="activeTab === 'live'" class="list-section">
        <view v-if="lives.length > 0">
          <view v-for="live in lives" :key="live.id" class="live-card">
            <view class="live-cover">
              <text class="live-icon">📻</text>
              <text v-if="live.status === 'upcoming'" class="live-badge badge-upcoming">预约</text>
              <text v-if="live.hasReplay" class="live-badge badge-replay">回放</text>
            </view>
            <view class="live-info">
              <text class="live-title">{{ live.title }}</text>
              <text class="live-time">{{ live.time }}</text>
              <text v-if="live.viewers > 0" class="live-viewers">{{ live.viewers }} 人观看</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text class="empty-icon">📻</text>
          <text class="empty-text">暂无直播</text>
        </view>
      </view>

      <!-- 商品Tab -->
      <view v-else-if="activeTab === 'product'" class="grid-section">
        <view v-if="products.length > 0" class="product-grid">
          <view v-for="product in products" :key="product.id" class="product-card">
            <view class="product-cover">
              <text class="product-img-icon">🛍️</text>
            </view>
            <text class="product-name">{{ product.name }}</text>
            <view class="product-bottom">
              <text class="product-price">¥{{ product.price }}</text>
              <text class="product-sales">{{ product.sales }}人购买</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text class="empty-icon">🛍️</text>
          <text class="empty-text">暂无商品</text>
        </view>
      </view>

      <view style="height: 240rpx;" />
    </scroll-view>

    <!-- 悬浮按钮 -->
    <view class="float-btns">
      <view v-if="circleData.hasAIAssistant" class="float-ai" @click="showAIAssistant = true">
        <text>🤖</text>
      </view>
      <view class="float-publish" @click="showPublishMenu = !showPublishMenu">
        <text>✏️</text>
      </view>
    </view>

    <!-- 发布菜单 -->
    <view v-if="showPublishMenu" class="menu-mask" @click="showPublishMenu = false" />
    <view v-if="showPublishMenu" class="publish-menu">
      <view class="menu-item" @click="goPage('/pages/articles/editor/index')">
        <text class="mi-icon">✏️</text><text>发帖子</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/videos/publish/index')">
        <text class="mi-icon">📹</text><text>发短视频</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/live/create/index')">
        <text class="mi-icon">📻</text><text>发起直播</text>
      </view>
    </view>

    <!-- AI助理弹窗 -->
    <view v-if="showAIAssistant" class="ai-mask" @click="showAIAssistant = false" />
    <view v-if="showAIAssistant" class="ai-sheet">
      <view class="ai-header">
        <view class="ai-title-row">
          <text class="ai-bot-icon">🤖</text>
          <view>
            <text class="ai-title">圈主助理</text>
            <text class="ai-subtitle">AI智能问答</text>
          </view>
        </view>
        <text class="ai-close" @click="showAIAssistant = false">▼</text>
      </view>
      <view class="ai-chat-area">
        <view class="ai-msg">
          <text class="ai-bot-avatar">🤖</text>
          <view class="ai-bubble">
            <text>你好！我是本圈的AI助理，可以回答你关于八字命理的问题，也可以帮你了解圈子内容。有什么可以帮你的吗？</text>
          </view>
        </view>
      </view>
      <view class="ai-input-bar">
        <input class="ai-input" type="text" placeholder="输入你的问题..." />
        <view class="ai-send-btn"><text>✨</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const activeTab = ref('all')
const sortBy = ref<'latest' | 'reply'>('latest')
const hasSigned = ref(false)
const showPublishMenu = ref(false)
const showAIAssistant = ref(false)

const circleData = {
  name: '八字命理研习社', memberCount: 1280, myMemberNo: 'No.0086',
  hasSignedToday: false, signStreak: 7, hasAIAssistant: true,
}

const contentTabs = [
  { id: 'all', label: '全部' }, { id: 'essence', label: '精华' },
  { id: 'course', label: '课程' }, { id: 'article', label: '文章' },
  { id: 'video', label: '短视频' }, { id: 'live', label: '直播' },
  { id: 'product', label: '商品' },
]

const posts = [
  { id: 1, author: { name: '周易大师', isOwner: true }, content: '【置顶】欢迎各位新成员加入八字命理研习社！本圈子专注于八字命理学习与实践...', images: ['', '', ''], likes: 328, comments: 56, time: '3天前', isPinned: true, isEssence: false },
  { id: 2, author: { name: '张玄风', isOwner: false }, content: '分享一个八字看财运的心得：日主身旺财星有根，大运流年再遇财星，必有进财之喜...', images: ['', '', ''], likes: 156, comments: 42, time: '5小时前', isPinned: false, isEssence: true },
  { id: 3, author: { name: '命理小白', isOwner: false }, content: '请教各位老师，八字中的食神和伤官有什么区别？什么情况下食神生财比较好？', images: [''], likes: 28, comments: 15, time: '2小时前', isPinned: false, isEssence: false },
  { id: 4, author: { name: '易学爱好者', isOwner: false }, content: '今天学习了十神配置，终于理解了为什么说官印相生是好格局。笔记分享给大家，欢迎指正！', images: ['', ''], likes: 89, comments: 23, time: '昨天', isPinned: false, isEssence: true },
]

const essencePosts = computed(() => posts.filter(p => p.isEssence))

const courses = [
  { id: 1, title: '八字入门精讲', instructor: '周易大师', price: 199, students: 856 },
  { id: 2, title: '十神深度解析', instructor: '周易大师', price: 299, students: 428 },
  { id: 3, title: '大运流年实战', instructor: '周易大师', price: 399, students: 312 },
]

const articles = [
  { id: 1, title: '八字命理学入门指南：从零开始理解命盘', author: '周易大师', views: 2560, time: '3天前' },
  { id: 2, title: '十神配置与人生格局的关系探讨', author: '周易大师', views: 1890, time: '1周前' },
  { id: 3, title: '如何通过八字看婚姻感情？', author: '周易大师', views: 3240, time: '2周前' },
]

const videos = [
  { id: 1, title: '一分钟看懂八字排盘', plays: 12800, duration: '00:58' },
  { id: 2, title: '什么是日主？', plays: 8560, duration: '01:23' },
  { id: 3, title: '食神生财的秘密', plays: 6280, duration: '02:15' },
  { id: 4, title: '官印相生格局解析', plays: 5120, duration: '01:45' },
]

const lives = [
  { id: 1, title: '本周二直播：八字看财运', status: 'upcoming', time: '周二 20:00', viewers: 0 },
  { id: 2, title: '十神配置答疑', status: 'ended', time: '上周二', viewers: 856, hasReplay: true },
  { id: 3, title: '八字入门第一讲回放', status: 'ended', time: '2周前', viewers: 1280, hasReplay: true },
]

const products = [
  { id: 1, name: '《渊海子平》正版精装', price: 68, sales: 256 },
  { id: 2, name: '专业排盘罗盘', price: 128, sales: 89 },
  { id: 3, name: '八字学习笔记本套装', price: 38, sales: 412 },
]

function handleSign() { if (!hasSigned.value) hasSigned.value = true }
function onNotify() {}
function onShare() {}
function onMore() {}
function goBack() { uni.navigateBack() }
function goPage(url: string) { uni.navigateTo({ url }) }

onPullDownRefresh(() => { setTimeout(() => uni.stopPullDownRefresh(), 500) })
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; }
.nav-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24rpx; height: 56px; background: rgba(250,248,245,0.95);
  backdrop-filter: blur(10px); border-bottom: 1px solid #E8E0D5;
  position: sticky; top: 0; z-index: 40;
}
.nav-left { }
.nav-back-icon { font-size: 36rpx; color: #2C2C2C; }
.nav-actions { display: flex; gap: 16rpx; }
.nav-act-btn { font-size: 36rpx; }

.cover-gradient { height: 140rpx; background: linear-gradient(135deg, rgba(196,30,58,0.2), rgba(201,169,110,0.15)); }

.circle-card { margin: -40rpx 24rpx 0; background: #FFFFFF; border-radius: 20rpx; padding: 28rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.06); position: relative; z-index: 10; }
.circle-row { display: flex; align-items: flex-start; gap: 16rpx; }
.circle-avatar { width: 80rpx; height: 80rpx; border-radius: 20rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; font-size: 36rpx; flex-shrink: 0; }
.circle-info { flex: 1; min-width: 0; }
.circle-name { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.circle-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 6rpx; }
.circle-members { font-size: 22rpx; color: #999; }
.circle-my-no { font-size: 20rpx; color: #C9A96E; border: 1px solid #C9A96E; padding: 2rpx 10rpx; border-radius: 6rpx; }
.sign-btn { padding: 12rpx 20rpx; border-radius: 16rpx; background: #C41E3A; font-size: 24rpx; color: #FFFFFF; flex-shrink: 0; }
.sign-btn.signed { background: #F5F1EB; color: #999; }

.sign-streak { margin-top: 16rpx; padding-top: 16rpx; border-top: 1px solid #E8E0D5; text-align: center; font-size: 22rpx; color: #999; }
.streak-num { color: #C9A96E; font-weight: 600; }

.tab-bar { position: sticky; top: 56px; z-index: 30; background: #FAF8F5; border-bottom: 1px solid #E8E0D5; }
.tab-scroll { white-space: nowrap; padding: 0 24rpx; }
.tab-item { display: inline-block; padding: 20rpx 28rpx; font-size: 26rpx; color: #999; position: relative; }
.tab-item.active { color: #2C2C2C; font-weight: 500; }
.tab-indicator { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40rpx; height: 4rpx; background: #C41E3A; border-radius: 2rpx; }

.content { }

.feed-section { padding: 24rpx; }
.sort-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.sort-option { font-size: 26rpx; color: #999; }
.sort-option.active { color: #2C2C2C; font-weight: 500; }
.sort-sep { color: #E8E0D5; }

.post-card { background: #FFFFFF; border-radius: 20rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.post-tags { display: flex; gap: 8rpx; margin-bottom: 12rpx; }
.post-tag { font-size: 18rpx; padding: 4rpx 12rpx; border-radius: 8rpx; }
.tag-pin { background: rgba(196,30,58,0.1); color: #C41E3A; }
.tag-essence { background: #C9A96E; color: #FFFFFF; }
.post-author-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.post-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #2C2C2C; flex-shrink: 0; }
.post-author-info { flex: 1; }
.post-author-namerow { display: flex; align-items: center; gap: 8rpx; }
.post-author-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.post-owner-badge { font-size: 18rpx; padding: 2rpx 8rpx; border: 1px solid #C41E3A; color: #C41E3A; border-radius: 4rpx; }
.post-time { font-size: 22rpx; color: #999; }
.post-content { font-size: 26rpx; color: #2C2C2C; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 12rpx; }
.post-images { display: grid; gap: 8rpx; margin-bottom: 12rpx; }
.img-count-1 { grid-template-columns: 1fr; }
.img-count-2 { grid-template-columns: 1fr 1fr; }
.img-count-3 { grid-template-columns: 1fr 1fr 1fr; }
.post-img-placeholder { aspect-ratio: 1; background: #F5F1EB; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; }
.post-img-icon { font-size: 40rpx; opacity: 0.3; }
.post-stats { display: flex; gap: 32rpx; }
.post-stat { font-size: 22rpx; color: #999; }

.list-section { padding: 24rpx; }
.grid-section { padding: 24rpx; }

.course-card { display: flex; gap: 16rpx; background: #FFFFFF; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.course-thumb { width: 160rpx; aspect-ratio: 4/3; background: #F5F1EB; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 48rpx; }
.course-info { flex: 1; min-width: 0; }
.course-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.course-instructor { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.course-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.course-price { font-size: 28rpx; color: #C41E3A; font-weight: 500; }
.course-students { font-size: 22rpx; color: #999; }

.article-card { background: #FFFFFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.article-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.article-meta { display: flex; justify-content: space-between; margin-top: 12rpx; }
.article-author, .article-views, .article-time { font-size: 22rpx; color: #999; }

.video-grid, .product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.video-card { background: #FFFFFF; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.video-cover { aspect-ratio: 3/4; background: #F5F1EB; display: flex; align-items: center; justify-content: center; position: relative; }
.video-play { font-size: 48rpx; opacity: 0.5; }
.video-dur { position: absolute; bottom: 8rpx; right: 8rpx; background: rgba(0,0,0,0.6); color: #fff; font-size: 18rpx; padding: 4rpx 8rpx; border-radius: 6rpx; }
.video-plays { position: absolute; bottom: 8rpx; left: 8rpx; color: #fff; font-size: 18rpx; }
.video-title { font-size: 24rpx; color: #2C2C2C; padding: 16rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.live-card { display: flex; gap: 16rpx; background: #FFFFFF; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.live-cover { width: 140rpx; aspect-ratio: 16/9; background: #F5F1EB; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; position: relative; }
.live-icon { font-size: 36rpx; opacity: 0.4; }
.live-badge { position: absolute; top: 6rpx; right: 6rpx; font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 6rpx; color: #fff; }
.badge-upcoming { background: #3b82f6; }
.badge-replay { background: #C9A96E; }
.live-info { flex: 1; min-width: 0; }
.live-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.live-time { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.live-viewers { font-size: 22rpx; color: #999; margin-top: 2rpx; }

.product-card { background: #FFFFFF; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.product-cover { aspect-ratio: 1; background: #F5F1EB; display: flex; align-items: center; justify-content: center; }
.product-img-icon { font-size: 56rpx; opacity: 0.3; }
.product-name { font-size: 24rpx; color: #2C2C2C; padding: 16rpx 16rpx 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.product-bottom { display: flex; justify-content: space-between; align-items: center; padding: 8rpx 16rpx 16rpx; }
.product-price { font-size: 28rpx; color: #C41E3A; font-weight: 500; }
.product-sales { font-size: 20rpx; color: #999; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 72rpx; opacity: 0.3; margin-bottom: 16rpx; }
.empty-text { font-size: 26rpx; color: #999; }

.float-btns { position: fixed; bottom: 200rpx; right: 32rpx; display: flex; flex-direction: column; gap: 20rpx; z-index: 45; }
.float-ai { width: 80rpx; height: 80rpx; border-radius: 50%; background: #C9A96E; display: flex; align-items: center; justify-content: center; font-size: 36rpx; box-shadow: 0 4rpx 20rpx rgba(201,169,110,0.3); }
.float-publish { width: 92rpx; height: 92rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 40rpx; box-shadow: 0 4rpx 24rpx rgba(196,30,58,0.3); }

.menu-mask { position: fixed; inset: 0; z-index: 46; }
.publish-menu { position: fixed; bottom: 320rpx; right: 32rpx; background: #FFFFFF; border-radius: 20rpx; box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.12); padding: 12rpx 0; z-index: 47; min-width: 240rpx; }
.menu-item { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 28rpx; font-size: 26rpx; color: #2C2C2C; }
.menu-item:not(:last-child) { border-bottom: 1px solid #F5F1EB; }
.mi-icon { font-size: 28rpx; }

.ai-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 80; }
.ai-sheet { position: fixed; bottom: 0; left: 0; right: 0; height: 60vh; background: #FFFFFF; border-radius: 32rpx 32rpx 0 0; z-index: 81; display: flex; flex-direction: column; }
.ai-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; border-bottom: 1px solid #E8E0D5; }
.ai-title-row { display: flex; align-items: center; gap: 16rpx; }
.ai-bot-icon { font-size: 40rpx; }
.ai-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.ai-subtitle { font-size: 20rpx; color: #999; }
.ai-close { font-size: 28rpx; color: #999; padding: 12rpx; }
.ai-chat-area { flex: 1; padding: 24rpx; overflow-y: auto; }
.ai-msg { display: flex; gap: 16rpx; }
.ai-bot-avatar { font-size: 36rpx; flex-shrink: 0; }
.ai-bubble { background: #F5F1EB; border-radius: 20rpx; padding: 20rpx; font-size: 26rpx; color: #2C2C2C; line-height: 1.5; }
.ai-input-bar { display: flex; align-items: center; gap: 12rpx; padding: 20rpx 24rpx; border-top: 1px solid #E8E0D5; }
.ai-input { flex: 1; height: 72rpx; background: #F5F1EB; border-radius: 40rpx; padding: 0 28rpx; font-size: 26rpx; color: #2C2C2C; }
.ai-send-btn { width: 72rpx; height: 72rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 32rpx; }
</style>
