<template>
  <view class="circle-home-page">
    <!-- 顶部导航 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="goBack()">‹</text>
        <text class="header-title">圈子</text>
        <view class="header-actions">
          <text class="ha-btn" @click="noop()">🔔</text>
          <text class="ha-btn" @click="noop()">📤</text>
          <text class="ha-btn" @click="noop()">⋯</text>
        </view>
      </view>
    </view>

    <!-- 圈子头部信息 -->
    <view class="hero-section">
      <view class="hero-cover" />
      <view class="circle-info-card">
        <view class="cic-row">
          <view class="cic-avatar">✨</view>
          <view class="cic-info">
            <text class="cic-name">{{ circleData.name }}</text>
            <view class="cic-meta">
              <text class="cic-members">{{ circleData.memberCount }} 成员</text>
              <text class="cic-member-no">{{ circleData.myMemberNo }}</text>
            </view>
          </view>
          <view class="cic-sign-btn" :class="{ signed: hasSigned }" @click="handleSign">
            <text v-if="hasSigned">✓ 已签到</text>
            <text v-else>📅 签到</text>
          </view>
        </view>
        <view v-if="hasSigned" class="sign-streak">
          <text>连续签到 <text class="ss-count">{{ circleData.signStreak + 1 }}</text> 天</text>
        </view>
      </view>
    </view>

    <!-- 内容Tab栏 -->
    <view class="tab-bar">
      <view v-for="tab in contentTabs" :key="tab.id" class="tab-item" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- Tab内容 -->
    <view class="tab-content">
      <!-- 全部/精华 -->
      <template v-if="activeTab === 'all' || activeTab === 'essence'">
        <view v-if="activeTab === 'all'" class="sort-row">
          <text class="sort-item" :class="{ active: sortBy === 'latest' }" @click="sortBy = 'latest'">最新发布</text>
          <text class="sort-divider">|</text>
          <text class="sort-item" :class="{ active: sortBy === 'reply' }" @click="sortBy = 'reply'">最新回复</text>
        </view>
        <view v-for="post in filteredPosts" :key="post.id" class="post-card" @click="goPage('/pages/post/id-detail/index?id=' + post.id)">
          <view class="post-badges">
            <text v-if="post.isPinned" class="post-badge pinned">📌 置顶</text>
            <text v-if="post.isEssence" class="post-badge essence">⭐ 精华</text>
          </view>
          <view class="post-author">
            <view class="pa-avatar">{{ post.author.name[0] }}</view>
            <view class="pa-info">
              <view class="pa-name-row">
                <text class="pa-name">{{ post.author.name }}</text>
                <text v-if="post.author.isOwner" class="pa-owner">圈主</text>
              </view>
              <text class="pa-time">{{ post.time }}</text>
            </view>
          </view>
          <text class="post-content">{{ post.content }}</text>
          <view v-if="post.images.length" class="post-images" :class="'grid-' + Math.min(post.images.length, 3)">
            <view v-for="(_, idx) in post.images.slice(0, 3)" :key="idx" class="post-img">
              <text>🖼️</text>
            </view>
          </view>
          <view class="post-stats">
            <text>❤️ {{ post.likes }}</text>
            <text>💬 {{ post.comments }}</text>
          </view>
        </view>
      </template>

      <!-- 课程 -->
      <template v-if="activeTab === 'course'">
        <view v-if="courses.length" class="list-section">
          <view v-for="course in courses" :key="course.id" class="course-card" @click="goPage('/pages/course/id-detail/index?id=' + course.id)">
            <view class="cc-cover">📚</view>
            <view class="cc-info">
              <text class="cc-title">{{ course.title }}</text>
              <text class="cc-instructor">{{ course.instructor }}</text>
              <view class="cc-bottom">
                <text class="cc-price">¥{{ course.price }}</text>
                <text class="cc-students">{{ course.students }}人学习</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text class="empty-icon">📚</text>
          <text class="empty-text">暂无课程</text>
        </view>
      </template>

      <!-- 文章 -->
      <template v-if="activeTab === 'article'">
        <view v-if="articles.length" class="list-section">
          <view v-for="article in articles" :key="article.id" class="article-card" @click="goPage('/pages/article/id-detail/index?id=' + article.id)">
            <text class="ac-title">{{ article.title }}</text>
            <view class="ac-meta">
              <text>{{ article.author }}</text>
              <text>{{ article.views }} 阅读</text>
              <text>{{ article.time }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text class="empty-icon">📄</text>
          <text class="empty-text">暂无文章</text>
        </view>
      </template>

      <!-- 短视频 -->
      <template v-if="activeTab === 'video'">
        <view v-if="videos.length" class="video-grid">
          <view v-for="video in videos" :key="video.id" class="video-card" @click="goPage('/pages/video/id-detail/index?id=' + video.id)">
            <view class="vc-cover">
              <text class="vc-play">▶️</text>
              <text class="vc-duration">{{ video.duration }}</text>
              <text class="vc-plays">▶ {{ (video.plays / 1000).toFixed(1) }}k</text>
            </view>
            <text class="vc-title">{{ video.title }}</text>
          </view>
        </view>
        <view v-else class="empty-state">
          <text class="empty-icon">🎬</text>
          <text class="empty-text">暂无短视频</text>
        </view>
      </template>

      <!-- 直播 -->
      <template v-if="activeTab === 'live'">
        <view v-if="lives.length" class="list-section">
          <view v-for="live in lives" :key="live.id" class="live-card" @click="goPage('/pages/live/id-detail/index?id=' + live.id)">
            <view class="lc-cover">
              <text class="lc-icon">📡</text>
              <text v-if="live.status === 'upcoming'" class="lc-badge upcoming">预约</text>
              <text v-if="live.hasReplay" class="lc-badge replay">回放</text>
            </view>
            <view class="lc-info">
              <text class="lc-title">{{ live.title }}</text>
              <text class="lc-time">{{ live.time }}</text>
              <text v-if="live.viewers > 0" class="lc-viewers">{{ live.viewers }} 人观看</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text class="empty-icon">📡</text>
          <text class="empty-text">暂无直播</text>
        </view>
      </template>

      <!-- 商品 -->
      <template v-if="activeTab === 'product'">
        <view v-if="products.length" class="product-grid">
          <view v-for="product in products" :key="product.id" class="product-card" @click="goPage('/pages/mall/product/id-detail/index?id=' + product.id)">
            <view class="pc-cover">🛍️</view>
            <view class="pc-info">
              <text class="pc-name">{{ product.name }}</text>
              <view class="pc-bottom">
                <text class="pc-price">¥{{ product.price }}</text>
                <text class="pc-sales">{{ product.sales }}人购买</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text class="empty-icon">🛍️</text>
          <text class="empty-text">暂无商品</text>
        </view>
      </template>
    </view>

    <!-- 悬浮按钮组 -->
    <view class="fab-group">
      <view v-if="circleData.hasAIAssistant" class="fab-ai" @click="showAIAssistant = true">
        <text>🤖</text>
      </view>
      <view class="fab-publish-wrap">
        <view class="fab-publish" @click="showPublishMenu = !showPublishMenu">
          <text>✏️</text>
        </view>
        <view v-if="showPublishMenu" class="publish-menu">
          <view class="pm-overlay" @click="showPublishMenu = false" />
          <view class="pm-list">
            <text class="pm-item" @click="goPage('/pages/editor/index?type=post')">✏️ 发帖子</text>
            <text class="pm-item" @click="goPage('/pages/editor/index?type=video')">🎬 发短视频</text>
            <text class="pm-item" @click="goPage('/pages/manage/live/create/index')">📡 发起直播</text>
          </view>
        </view>
      </view>
    </view>

    <!-- AI助理半屏弹窗 -->
    <view v-if="showAIAssistant" class="ai-modal">
      <view class="ai-overlay" @click="showAIAssistant = false" />
      <view class="ai-panel">
        <view class="ai-header">
          <view class="ai-header-info">
            <view class="ai-avatar">🤖</view>
            <view>
              <text class="ai-name">圈主助理</text>
              <text class="ai-desc">AI智能问答</text>
            </view>
          </view>
          <text class="ai-close" @click="showAIAssistant = false">⌄</text>
        </view>
        <view class="ai-chat">
          <view class="ai-msg-row">
            <view class="ai-msg-avatar">🤖</view>
            <view class="ai-msg-bubble">
              <text>你好！我是本圈的AI助理，可以回答你关于八字命理的问题，也可以帮你了解圈子内容。有什么可以帮你的吗？</text>
            </view>
          </view>
        </view>
        <view class="ai-input-row">
          <input class="ai-input" placeholder="输入你的问题..." />
          <text class="ai-send">✨</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const circleData = ref({
  id: 1,
  name: '八字命理研习社',
  memberCount: 1280,
  myMemberNo: 'No.0086',
  hasSignedToday: false,
  signStreak: 7,
  hasAIAssistant: true,
})

const activeTab = ref('all')
const sortBy = ref<'latest' | 'reply'>('latest')
const hasSigned = ref(false)
const showPublishMenu = ref(false)
const showAIAssistant = ref(false)

const contentTabs = [
  { id: 'all', label: '全部' },
  { id: 'essence', label: '精华' },
  { id: 'course', label: '课程' },
  { id: 'article', label: '文章' },
  { id: 'video', label: '短视频' },
  { id: 'live', label: '直播' },
  { id: 'product', label: '商品' },
]

const posts = ref([
  { id: 1, author: { name: '周易大师', isOwner: true }, content: '【置顶】欢迎各位新成员加入八字命理研习社！本圈子专注于八字命理学习与实践，每周二晚8点直播答疑，每月发布深度文章，请大家积极参与讨论。', images: ['', '', ''], likes: 328, comments: 56, time: '3天前', isPinned: true, isEssence: false },
  { id: 2, author: { name: '张玄风', isOwner: false }, content: '分享一个八字看财运的心得：日主身旺财星有根，大运流年再遇财星，必有进财之喜。但若身弱财旺，反而容易因财惹祸，需谨慎理财。', images: ['', '', ''], likes: 156, comments: 42, time: '5小时前', isPinned: false, isEssence: true },
  { id: 3, author: { name: '命理小白', isOwner: false }, content: '请教各位老师，八字中的食神和伤官有什么区别？什么情况下食神生财比较好？', images: [''], likes: 28, comments: 15, time: '2小时前', isPinned: false, isEssence: false },
  { id: 4, author: { name: '易学爱好者', isOwner: false }, content: '今天学习了十神配置，终于理解了为什么说官印相生是好格局。笔记分享给大家，欢迎指正！', images: ['', ''], likes: 89, comments: 23, time: '昨天', isPinned: false, isEssence: true },
])

const courses = ref([
  { id: 1, title: '八字入门精讲', instructor: '周易大师', price: 199, students: 856 },
  { id: 2, title: '十神深度解析', instructor: '周易大师', price: 299, students: 428 },
  { id: 3, title: '大运流年实战', instructor: '周易大师', price: 399, students: 312 },
])

const articles = ref([
  { id: 1, title: '八字命理学入门指南：从零开始理解命盘', author: '周易大师', views: 2560, time: '3天前' },
  { id: 2, title: '十神配置与人生格局的关系探讨', author: '周易大师', views: 1890, time: '1周前' },
  { id: 3, title: '如何通过八字看婚姻感情？', author: '周易大师', views: 3240, time: '2周前' },
])

const videos = ref([
  { id: 1, title: '一分钟看懂八字排盘', plays: 12800, duration: '00:58' },
  { id: 2, title: '什么是日主？', plays: 8560, duration: '01:23' },
  { id: 3, title: '食神生财的秘密', plays: 6280, duration: '02:15' },
  { id: 4, title: '官印相生格局解析', plays: 5120, duration: '01:45' },
])

const lives = ref([
  { id: 1, title: '本周二直播：八字看财运', status: 'upcoming', time: '周二 20:00', viewers: 0 },
  { id: 2, title: '十神配置答疑', status: 'ended', time: '上周二', viewers: 856, hasReplay: true },
  { id: 3, title: '八字入门第一讲回放', status: 'ended', time: '2周前', viewers: 1280, hasReplay: true },
])

const products = ref([
  { id: 1, name: '《渊海子平》正版精装', price: 68, sales: 256 },
  { id: 2, name: '专业排盘罗盘', price: 128, sales: 89 },
  { id: 3, name: '八字学习笔记本套装', price: 38, sales: 412 },
])

const filteredPosts = computed(() => {
  if (activeTab.value === 'essence') return posts.value.filter(p => p.isEssence)
  return posts.value
})

function handleSign() {
  if (!hasSigned.value) hasSigned.value = true
}

function goPage(url: string) {
  uni.navigateTo({ url })
}

function goBack() {
  uni.navigateBack()
}

function noop() {}
</script>

<style scoped>
.circle-home-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 160rpx; }

.header-sticky { position: sticky; top: 0; z-index: 40; background: rgba(250,248,245,0.95); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.header-actions { display: flex; gap: 16rpx; }
.ha-btn { font-size: 36rpx; }

.hero-section { position: relative; }
.hero-cover { height: 180rpx; background: linear-gradient(135deg, rgba(196,30,58,0.3), rgba(201,169,110,0.2), rgba(245,241,235,1)); }
.circle-info-card { margin: -50rpx 24rpx 0; background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 24rpx rgba(0,0,0,0.06); position: relative; z-index: 10; }
.cic-row { display: flex; align-items: flex-start; gap: 16rpx; }
.cic-avatar { width: 96rpx; height: 96rpx; border-radius: 20rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; font-size: 48rpx; }
.cic-info { flex: 1; min-width: 0; }
.cic-name { font-size: 32rpx; font-weight: 700; color: #2C2C2C; display: block; }
.cic-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 6rpx; }
.cic-members { font-size: 22rpx; color: #999; }
.cic-member-no { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 4rpx; border: 1rpx solid #C9A96E; color: #C9A96E; }
.cic-sign-btn { padding: 8rpx 20rpx; border-radius: 12rpx; background: #C41E3A; display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.cic-sign-btn text { font-size: 20rpx; color: #fff; }
.cic-sign-btn.signed { background: #F5F1EB; }
.cic-sign-btn.signed text { color: #999; }
.sign-streak { margin-top: 16rpx; padding-top: 16rpx; border-top: 1px solid #E8E0D5; text-align: center; }
.sign-streak text { font-size: 22rpx; color: #999; }
.ss-count { color: #C9A96E; font-weight: 600; }

.tab-bar { position: sticky; top: 80rpx; z-index: 30; display: flex; background: #FAF8F5; border-bottom: 1px solid #E8E0D5; overflow-x: auto; padding: 0 16rpx; }
.tab-bar::-webkit-scrollbar { display: none; }
.tab-item { flex-shrink: 0; padding: 20rpx 24rpx; position: relative; }
.tab-item text { font-size: 26rpx; color: #999; }
.tab-item.active text { color: #2C2C2C; font-weight: 500; }
.tab-item.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 36rpx; height: 4rpx; background: #C41E3A; border-radius: 4rpx; }

.tab-content { padding: 16rpx 24rpx; }

.sort-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.sort-item { font-size: 26rpx; color: #999; }
.sort-item.active { color: #2C2C2C; font-weight: 500; }
.sort-divider { color: #E8E0D5; }

.post-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.post-badges { display: flex; gap: 10rpx; margin-bottom: 12rpx; }
.post-badge { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 4rpx; }
.post-badge.pinned { background: #C41E3A; color: #fff; }
.post-badge.essence { background: #C9A96E; color: #fff; }
.post-author { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.pa-avatar { width: 60rpx; height: 60rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #333; }
.pa-info { flex: 1; }
.pa-name-row { display: flex; align-items: center; gap: 8rpx; }
.pa-name { font-size: 26rpx; font-weight: 500; color: #333; }
.pa-owner { font-size: 18rpx; padding: 2rpx 8rpx; border: 1rpx solid #C41E3A; color: #C41E3A; border-radius: 4rpx; }
.pa-time { font-size: 20rpx; color: #999; }
.post-content { font-size: 26rpx; color: #333; line-height: 1.6; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; margin-bottom: 12rpx; }
.post-images { display: grid; gap: 8rpx; margin-bottom: 12rpx; }
.post-images.grid-1 { grid-template-columns: 1fr; }
.post-images.grid-2 { grid-template-columns: 1fr 1fr; }
.post-images.grid-3 { grid-template-columns: 1fr 1fr 1fr; }
.post-img { aspect-ratio: 1; background: #F5F1EB; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 36rpx; }
.post-stats { display: flex; gap: 32rpx; }
.post-stats text { font-size: 22rpx; color: #999; }

.list-section { display: flex; flex-direction: column; gap: 16rpx; }

.course-card { background: #fff; border-radius: 16rpx; padding: 16rpx; display: flex; gap: 16rpx; }
.cc-cover { width: 180rpx; aspect-ratio: 4/3; background: #F5F1EB; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 48rpx; flex-shrink: 0; }
.cc-info { flex: 1; min-width: 0; }
.cc-title { font-size: 26rpx; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; display: block; }
.cc-instructor { font-size: 22rpx; color: #999; margin-top: 6rpx; display: block; }
.cc-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.cc-price { font-size: 28rpx; color: #C41E3A; font-weight: 500; }
.cc-students { font-size: 22rpx; color: #999; }

.article-card { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.ac-title { font-size: 26rpx; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; display: block; }
.ac-meta { display: flex; justify-content: space-between; margin-top: 12rpx; }
.ac-meta text { font-size: 20rpx; color: #999; }

.video-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.video-card { background: #fff; border-radius: 16rpx; overflow: hidden; }
.vc-cover { aspect-ratio: 3/4; background: #F5F1EB; display: flex; align-items: center; justify-content: center; position: relative; }
.vc-play { font-size: 48rpx; }
.vc-duration { position: absolute; bottom: 10rpx; right: 10rpx; font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: rgba(0,0,0,0.6); color: #fff; }
.vc-plays { position: absolute; bottom: 10rpx; left: 10rpx; font-size: 18rpx; color: #fff; }
.vc-title { font-size: 22rpx; color: #333; padding: 12rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; display: block; }

.live-card { background: #fff; border-radius: 16rpx; padding: 16rpx; display: flex; gap: 16rpx; }
.lc-cover { width: 160rpx; aspect-ratio: 16/9; background: #F5F1EB; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; }
.lc-icon { font-size: 36rpx; }
.lc-badge { position: absolute; top: 6rpx; right: 6rpx; font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 4rpx; color: #fff; }
.lc-badge.upcoming { background: #3B82F6; }
.lc-badge.replay { background: #C9A96E; }
.lc-info { flex: 1; min-width: 0; }
.lc-title { font-size: 26rpx; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.lc-time { font-size: 22rpx; color: #999; margin-top: 6rpx; display: block; }
.lc-viewers { font-size: 20rpx; color: #999; display: block; }

.product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.product-card { background: #fff; border-radius: 16rpx; overflow: hidden; }
.pc-cover { aspect-ratio: 1; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 64rpx; }
.pc-info { padding: 12rpx; }
.pc-name { font-size: 22rpx; color: #333; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; display: block; }
.pc-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 8rpx; }
.pc-price { font-size: 26rpx; color: #C41E3A; font-weight: 500; }
.pc-sales { font-size: 18rpx; color: #999; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 64rpx; }
.empty-text { font-size: 26rpx; color: #999; margin-top: 12rpx; }

.fab-group { position: fixed; bottom: 140rpx; right: 24rpx; z-index: 40; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.fab-ai { width: 80rpx; height: 80rpx; border-radius: 50%; background: #C9A96E; display: flex; align-items: center; justify-content: center; font-size: 40rpx; box-shadow: 0 4rpx 16rpx rgba(201,169,110,0.3); }
.fab-publish-wrap { position: relative; }
.fab-publish { width: 96rpx; height: 96rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 44rpx; box-shadow: 0 4rpx 20rpx rgba(196,30,58,0.3); }
.pm-overlay { position: fixed; inset: 0; z-index: 40; }
.pm-list { position: absolute; bottom: 110rpx; right: 0; width: 260rpx; background: #fff; border-radius: 20rpx; box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.1); overflow: hidden; z-index: 50; }
.pm-item { display: block; padding: 22rpx 28rpx; font-size: 26rpx; color: #333; border-bottom: 1px solid #E8E0D5; }
.pm-item:last-child { border-bottom: none; }

.ai-modal { position: fixed; inset: 0; z-index: 50; }
.ai-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
.ai-panel { position: absolute; bottom: 0; left: 0; right: 0; height: 60vh; background: #fff; border-radius: 32rpx 32rpx 0 0; display: flex; flex-direction: column; }
.ai-header { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 24rpx; border-bottom: 1px solid #E8E0D5; }
.ai-header-info { display: flex; align-items: center; gap: 16rpx; }
.ai-avatar { width: 60rpx; height: 60rpx; border-radius: 50%; background: rgba(201,169,110,0.2); display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.ai-name { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.ai-desc { font-size: 18rpx; color: #999; }
.ai-close { font-size: 36rpx; color: #999; }
.ai-chat { flex: 1; padding: 24rpx; overflow-y: auto; }
.ai-msg-row { display: flex; gap: 16rpx; }
.ai-msg-avatar { width: 60rpx; height: 60rpx; border-radius: 50%; background: rgba(201,169,110,0.2); display: flex; align-items: center; justify-content: center; font-size: 28rpx; flex-shrink: 0; }
.ai-msg-bubble { background: #F5F1EB; border-radius: 16rpx; padding: 16rpx; flex: 1; }
.ai-msg-bubble text { font-size: 26rpx; color: #333; }
.ai-input-row { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; border-top: 1px solid #E8E0D5; }
.ai-input { flex: 1; height: 72rpx; padding: 0 24rpx; border-radius: 36rpx; background: #F5F1EB; font-size: 26rpx; }
.ai-send { width: 72rpx; height: 72rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
</style>
