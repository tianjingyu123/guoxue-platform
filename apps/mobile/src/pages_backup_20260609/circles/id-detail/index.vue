<template>
  <view class="circle-home">
    <!-- 顶部导航 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <view class="header-actions">
          <text class="ha-btn">🔔</text>
          <text class="ha-btn">↗</text>
        </view>
      </view>
    </view>

    <!-- 圈子头部 -->
    <view class="circle-header">
      <view class="ch-cover" />
      <view class="ch-info-card">
        <view class="chi-row">
          <view class="chi-avatar">✨</view>
          <view class="chi-main">
            <text class="chi-name">{{ circle.name }}</text>
            <view class="chi-meta">
              <text class="chi-members">{{ circle.memberCount }} 成员</text>
              <text class="chi-no">No.0086</text>
            </view>
          </view>
          <view class="sign-btn" :class="{ done: hasSigned }" @click="handleSign">
            <text>{{ hasSigned ? '✓' : '📅' }}</text>
            <text class="sign-text">{{ hasSigned ? '已签到' : '签到' }}</text>
          </view>
        </view>
        <view v-if="hasSigned" class="sign-streak">
          <text>连续签到 <text class="streak-num">{{ signStreak + 1 }}</text> 天</text>
        </view>
      </view>
    </view>

    <!-- 内容Tab栏 -->
    <view class="tab-bar">
      <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false">
        <text
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-item"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >{{ tab.label }}</text>
      </scroll-view>
    </view>

    <!-- Tab内容 -->
    <view class="tab-content">
      <!-- 全部/精华 -->
      <template v-if="activeTab === 'all' || activeTab === 'essence'">
        <view v-if="activeTab === 'all'" class="sort-row">
          <text class="sort-item" :class="{ on: sortBy === 'latest' }" @click="sortBy = 'latest'">最新发布</text>
          <text class="sort-div">|</text>
          <text class="sort-item" :class="{ on: sortBy === 'reply' }" @click="sortBy = 'reply'">最新回复</text>
        </view>
        <view v-for="post in filteredPosts" :key="post.id" class="post-card">
          <view class="post-badges">
            <text v-if="post.isPinned" class="badge pin">📌 置顶</text>
            <text v-if="post.isEssence" class="badge essence">⭐ 精华</text>
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
          <text class="post-text">{{ post.content }}</text>
          <view v-if="post.images?.length" class="post-imgs" :class="'cols-' + Math.min(post.images.length, 3)">
            <view v-for="(_, j) in post.images.slice(0, 3)" :key="j" class="post-img">🖼</view>
          </view>
          <view class="post-actions">
            <text class="pa-stat">❤ {{ post.likes }}</text>
            <text class="pa-stat">💬 {{ post.comments }}</text>
          </view>
        </view>
        <view v-if="filteredPosts.length === 0" class="empty-tab">
          <text class="empty-icon">{{ activeTab === 'essence' ? '⭐' : '📝' }}</text>
          <text class="empty-text">暂无{{ activeTab === 'essence' ? '精华帖' : '内容' }}</text>
        </view>
      </template>

      <!-- 课程 -->
      <template v-if="activeTab === 'course'">
        <view v-if="courses.length" class="course-list">
          <view v-for="c in courses" :key="c.id" class="course-card">
            <view class="cc-cover">📖</view>
            <view class="cc-info">
              <text class="cc-title">{{ c.title }}</text>
              <text class="cc-teacher">{{ c.instructor }}</text>
              <view class="cc-bottom">
                <text class="cc-price">¥{{ c.price }}</text>
                <text class="cc-students">{{ c.students }}人学习</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="empty-tab">
          <text class="empty-icon">📖</text>
          <text class="empty-text">暂无课程</text>
        </view>
      </template>

      <!-- 文章 -->
      <template v-if="activeTab === 'article'">
        <view v-if="articles.length" class="simple-list">
          <view v-for="a in articles" :key="a.id" class="simple-item">
            <text class="si-title">{{ a.title }}</text>
            <view class="si-meta">
              <text>{{ a.author }}</text>
              <text>{{ a.views }} 阅读 · {{ a.time }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-tab">
          <text class="empty-icon">📄</text>
          <text class="empty-text">暂无文章</text>
        </view>
      </template>

      <!-- 短视频 -->
      <template v-if="activeTab === 'video'">
        <view v-if="videos.length" class="video-grid">
          <view v-for="v in videos" :key="v.id" class="video-cell">
            <view class="vc-cover">
              <text class="vc-play">▶</text>
              <text class="vc-duration">{{ v.duration }}</text>
              <text class="vc-plays">{{ (v.plays / 1000).toFixed(1) }}k次</text>
            </view>
            <text class="vc-title">{{ v.title }}</text>
          </view>
        </view>
        <view v-else class="empty-tab">
          <text class="empty-icon">🎬</text>
          <text class="empty-text">暂无短视频</text>
        </view>
      </template>

      <!-- 直播 -->
      <template v-if="activeTab === 'live'">
        <view v-if="lives.length" class="simple-list">
          <view v-for="l in lives" :key="l.id" class="live-card">
            <view class="lc-cover">
              <text>📡</text>
              <text class="lc-badge" :class="l.status">{{ l.status === 'upcoming' ? '预约' : l.hasReplay ? '回放' : '已结束' }}</text>
            </view>
            <view class="lc-info">
              <text class="lc-title">{{ l.title }}</text>
              <text class="lc-time">{{ l.time }}</text>
              <text v-if="l.viewers" class="lc-viewers">{{ l.viewers }} 人观看</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-tab">
          <text class="empty-icon">📡</text>
          <text class="empty-text">暂无直播</text>
        </view>
      </template>

      <!-- 商品 -->
      <template v-if="activeTab === 'product'">
        <view v-if="products.length" class="product-grid">
          <view v-for="p in products" :key="p.id" class="product-cell">
            <view class="pc-img">🛍</view>
            <text class="pc-name">{{ p.name }}</text>
            <view class="pc-bottom">
              <text class="pc-price">¥{{ p.price }}</text>
              <text class="pc-sales">{{ p.sales }}人购买</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-tab">
          <text class="empty-icon">🛍</text>
          <text class="empty-text">暂无商品</text>
        </view>
      </template>
    </view>

    <!-- 悬浮按钮 -->
    <view class="float-btns">
      <view class="fb-ai" @click="showAI = true">
        <text>🤖</text>
      </view>
      <view class="fb-publish" @click="showPublish = !showPublish">
        <text>✎</text>
      </view>
      <view v-if="showPublish" class="publish-menu">
        <view class="pm-item" @click="showPublish = false"><text>📝 发帖子</text></view>
        <view class="pm-item" @click="showPublish = false"><text>🎬 发短视频</text></view>
        <view class="pm-item" @click="showPublish = false"><text>📡 发起直播</text></view>
      </view>
    </view>

    <!-- AI助理弹窗 -->
    <view v-if="showAI" class="ai-mask" @click="showAI = false">
      <view class="ai-sheet" @click.stop>
        <view class="ai-head">
          <view class="ai-head-left">
            <view class="ai-icon">🤖</view>
            <view class="ai-title-row">
              <text class="ai-title">圈主助理</text>
              <text class="ai-sub">AI智能问答</text>
            </view>
          </view>
          <text class="ai-down" @click="showAI = false">⌄</text>
        </view>
        <view class="ai-chat">
          <view class="ai-msg">
            <view class="ai-avatar">🤖</view>
            <view class="ai-bubble">
              <text>你好！我是本圈的AI助理，可以回答你关于八字命理的问题，也可以帮你了解圈子内容。有什么可以帮你的吗？</text>
            </view>
          </view>
        </view>
        <view class="ai-input-row">
          <input class="ai-input" placeholder="输入你的问题..." />
          <view class="ai-send"><text>✨</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const circle = { id: 1, name: '八字命理研习社', memberCount: 1280 }
const tabs = [
  { id: 'all', label: '全部' }, { id: 'essence', label: '精华' },
  { id: 'course', label: '课程' }, { id: 'article', label: '文章' },
  { id: 'video', label: '短视频' }, { id: 'live', label: '直播' },
  { id: 'product', label: '商品' },
]

const posts = [
  { id: 1, author: { name: '周易大师', isOwner: true }, content: '【置顶】欢迎各位新成员加入八字命理研习社！本圈子专注于八字命理学习与实践，每周二晚8点直播答疑。', images: [], likes: 328, comments: 56, time: '3天前', isPinned: true, isEssence: false },
  { id: 2, author: { name: '张玄风', isOwner: false }, content: '分享一个八字看财运的心得：日主身旺财星有根，大运流年再遇财星，必有进财之喜。但若身弱财旺，反而容易因财惹祸。', images: ['', '', ''], likes: 156, comments: 42, time: '5小时前', isPinned: false, isEssence: true },
  { id: 3, author: { name: '命理小白', isOwner: false }, content: '请教各位老师，八字中的食神和伤官有什么区别？什么情况下食神生财比较好？', images: [''], likes: 28, comments: 15, time: '2小时前', isPinned: false, isEssence: false },
  { id: 4, author: { name: '易学爱好者', isOwner: false }, content: '今天学习了十神配置，终于理解了为什么说官印相生是好格局。笔记分享给大家，欢迎指正！', images: ['', ''], likes: 89, comments: 23, time: '昨天', isPinned: false, isEssence: true },
]

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

const activeTab = ref('all')
const sortBy = ref<'latest' | 'reply'>('latest')
const hasSigned = ref(false)
const signStreak = ref(7)
const showAI = ref(false)
const showPublish = ref(false)

const filteredPosts = computed(() => {
  let p = posts
  if (activeTab.value === 'essence') p = p.filter(x => x.isEssence)
  return p
})

function handleSign() { if (!hasSigned.value) hasSigned.value = true }
</script>

<style scoped>
.circle-home { min-height: 100vh; background: #FAF8F5; padding-bottom: 120rpx; }

.header-sticky { position: sticky; top: 0; z-index: 40; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); }
.header-row { display: flex; justify-content: space-between; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-actions { display: flex; gap: 8rpx; }
.ha-btn { font-size: 36rpx; padding: 8rpx; }

.circle-header { }
.ch-cover { height: 160rpx; background: linear-gradient(135deg, rgba(196,30,58,0.3), rgba(201,169,110,0.2)); }
.ch-info-card { margin: -56rpx 24rpx 0; padding: 24rpx; background: #fff; border-radius: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.chi-row { display: flex; align-items: flex-start; gap: 16rpx; }
.chi-avatar { width: 96rpx; height: 96rpx; border-radius: 24rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; font-size: 48rpx; border: 3rpx solid #fff; }
.chi-main { flex: 1; }
.chi-name { font-size: 34rpx; font-weight: 700; color: #2C2C2C; display: block; }
.chi-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 4rpx; }
.chi-members { font-size: 22rpx; color: #999; }
.chi-no { font-size: 20rpx; color: #C9A96E; border: 1px solid #C9A96E; padding: 1rpx 10rpx; border-radius: 6rpx; }

.sign-btn { display: flex; flex-direction: column; align-items: center; padding: 10rpx 20rpx; border-radius: 16rpx; background: #C41E3A; color: #fff; }
.sign-btn.done { background: #F5F1EB; color: #999; }
.sign-btn text { font-size: 32rpx; }
.sign-text { font-size: 20rpx !important; margin-top: 2rpx; }
.sign-streak { margin-top: 16rpx; padding-top: 16rpx; border-top: 1px solid #F0EDE5; text-align: center; font-size: 22rpx; color: #999; }
.streak-num { color: #C9A96E; font-weight: 600; }

.tab-bar { position: sticky; top: 88rpx; z-index: 30; background: #FAF8F5; border-bottom: 1px solid #E8E0D5; }
.tab-scroll { white-space: nowrap; }
.tab-item { display: inline-block; padding: 20rpx 28rpx; font-size: 26rpx; color: #999; position: relative; }
.tab-item.active { color: #2C2C2C; font-weight: 600; }
.tab-item.active::after { content: ''; position: absolute; bottom: 0; left: 50%; margin-left: -16rpx; width: 32rpx; height: 4rpx; background: #C41E3A; border-radius: 2rpx; }

.tab-content { padding: 16rpx 24rpx; }
.sort-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.sort-item { font-size: 26rpx; color: #999; }
.sort-item.on { color: #2C2C2C; font-weight: 500; }
.sort-div { color: #E0E0E0; }

.post-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 12rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.post-badges { display: flex; gap: 8rpx; margin-bottom: 12rpx; }
.badge { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 6rpx; }
.badge.pin { background: rgba(196,30,58,0.08); color: #C41E3A; }
.badge.essence { background: rgba(201,169,110,0.15); color: #C9A96E; }
.post-author { display: flex; gap: 12rpx; margin-bottom: 12rpx; }
.pa-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; background: #F5F1EB; color: #666; display: flex; align-items: center; justify-content: center; font-size: 24rpx; }
.pa-info { }
.pa-name-row { display: flex; align-items: center; gap: 8rpx; }
.pa-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.pa-owner { font-size: 18rpx; color: #C41E3A; border: 1px solid #C41E3A; padding: 0 8rpx; border-radius: 4rpx; }
.pa-time { font-size: 22rpx; color: #999; }
.post-text { font-size: 28rpx; color: #333; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 12rpx; }

.post-imgs { display: grid; gap: 8rpx; margin-bottom: 12rpx; }
.post-imgs.cols-1 { grid-template-columns: 1fr; }
.post-imgs.cols-2 { grid-template-columns: repeat(2, 1fr); }
.post-imgs.cols-3 { grid-template-columns: repeat(3, 1fr); }
.post-img { aspect-ratio: 1; background: rgba(196,30,58,0.06); border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.post-actions { display: flex; gap: 32rpx; }
.pa-stat { font-size: 22rpx; color: #999; }

.empty-tab { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 26rpx; color: #999; }

.course-list { }
.course-card { display: flex; gap: 16rpx; background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 12rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.cc-cover { width: 180rpx; aspect-ratio: 4/3; border-radius: 12rpx; background: rgba(201,169,110,0.1); display: flex; align-items: center; justify-content: center; font-size: 56rpx; flex-shrink: 0; }
.cc-info { flex: 1; display: flex; flex-direction: column; }
.cc-title { font-size: 26rpx; font-weight: 500; color: #333; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cc-teacher { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.cc-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
.cc-price { font-size: 28rpx; font-weight: 500; color: #C41E3A; }
.cc-students { font-size: 22rpx; color: #999; }

.simple-list { }
.simple-item { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 12rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.si-title { font-size: 26rpx; font-weight: 500; color: #333; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.si-meta { display: flex; justify-content: space-between; margin-top: 12rpx; font-size: 22rpx; color: #999; }

.video-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }
.video-cell { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.vc-cover { aspect-ratio: 3/4; background: linear-gradient(135deg, #333, #555); display: flex; align-items: center; justify-content: center; position: relative; }
.vc-play { font-size: 48rpx; color: rgba(255,255,255,0.6); }
.vc-duration { position: absolute; bottom: 8rpx; right: 8rpx; font-size: 20rpx; color: #fff; background: rgba(0,0,0,0.6); padding: 2rpx 10rpx; border-radius: 6rpx; }
.vc-plays { position: absolute; bottom: 8rpx; left: 8rpx; font-size: 20rpx; color: #fff; }
.vc-title { font-size: 24rpx; color: #333; padding: 10rpx 12rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.live-card { display: flex; gap: 16rpx; background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 12rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.lc-cover { width: 200rpx; aspect-ratio: 16/9; border-radius: 12rpx; background: rgba(196,30,58,0.06); display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; font-size: 40rpx; }
.lc-badge { position: absolute; top: 8rpx; right: 8rpx; font-size: 20rpx !important; color: #fff; background: #4A90D9; padding: 2rpx 12rpx; border-radius: 6rpx; }
.lc-badge.ended { background: #999; }
.lc-info { flex: 1; }
.lc-title { font-size: 26rpx; font-weight: 500; color: #333; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.lc-time { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.lc-viewers { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }

.product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }
.product-cell { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.pc-img { aspect-ratio: 1; background: rgba(196,30,58,0.04); display: flex; align-items: center; justify-content: center; font-size: 64rpx; }
.pc-name { font-size: 24rpx; color: #333; padding: 8rpx 12rpx 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pc-bottom { display: flex; justify-content: space-between; align-items: center; padding: 8rpx 12rpx 12rpx; }
.pc-price { font-size: 28rpx; font-weight: 500; color: #C41E3A; }
.pc-sales { font-size: 20rpx; color: #999; }

.float-btns { position: fixed; bottom: 140rpx; right: 32rpx; z-index: 30; display: flex; flex-direction: column; gap: 16rpx; align-items: flex-end; }
.fb-ai { width: 88rpx; height: 88rpx; border-radius: 50%; background: #C9A96E; box-shadow: 0 6rpx 20rpx rgba(201,169,110,0.4); display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.fb-publish { width: 104rpx; height: 104rpx; border-radius: 50%; background: #C41E3A; box-shadow: 0 6rpx 24rpx rgba(196,30,58,0.4); display: flex; align-items: center; justify-content: center; font-size: 48rpx; color: #fff; }
.publish-menu { position: absolute; right: 0; bottom: 120rpx; background: #fff; border-radius: 20rpx; box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.12); overflow: hidden; }
.pm-item { padding: 20rpx 40rpx; font-size: 26rpx; color: #333; white-space: nowrap; border-bottom: 1px solid #F0EDE5; }
.pm-item:last-child { border-bottom: none; }

.ai-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.ai-sheet { width: 100%; height: 60vh; background: #fff; border-radius: 32rpx 32rpx 0 0; display: flex; flex-direction: column; }
.ai-head { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 32rpx; border-bottom: 1px solid #F0EDE5; }
.ai-head-left { display: flex; align-items: center; gap: 12rpx; }
.ai-icon { font-size: 40rpx; }
.ai-title-row { display: flex; flex-direction: column; }
.ai-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.ai-sub { font-size: 20rpx; color: #999; }
.ai-down { font-size: 40rpx; color: #999; padding: 8rpx; }
.ai-chat { flex: 1; padding: 24rpx; overflow-y: auto; }
.ai-msg { display: flex; gap: 12rpx; }
.ai-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; background: rgba(201,169,110,0.2); display: flex; align-items: center; justify-content: center; font-size: 28rpx; flex-shrink: 0; }
.ai-bubble { background: #F5F1EB; border-radius: 16rpx; padding: 16rpx 20rpx; }
.ai-bubble text { font-size: 26rpx; color: #333; line-height: 1.5; }
.ai-input-row { display: flex; align-items: center; gap: 12rpx; padding: 20rpx 24rpx; border-top: 1px solid #F0EDE5; }
.ai-input { flex: 1; height: 72rpx; background: #F5F1EB; border-radius: 36rpx; padding: 0 24rpx; font-size: 26rpx; }
.ai-send { width: 72rpx; height: 72rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 32rpx; }
</style>
