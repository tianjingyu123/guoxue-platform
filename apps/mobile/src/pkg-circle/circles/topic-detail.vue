<template>
  <view class="topic-detail">
    <!-- 顶部红色渐变头图 -->
    <view class="hero" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="hero-nav">
        <view class="nav-btn" @tap="onBack">
          <app-icon name="arrow-left" :size="40" color="#FFFFFF" />
        </view>
        <view class="nav-btn" @tap="onShare">
          <app-icon name="share-2" :size="40" color="#FFFFFF" />
        </view>
      </view>
      <!-- 装饰圆 -->
      <view class="deco deco-1" />
      <view class="deco deco-2" />
    </view>

    <!-- 话题信息卡 -->
    <view class="card-wrap">
      <view class="topic-card">
        <view class="topic-head">
          <view class="hash-box">
            <app-icon name="hash" :size="38" color="#FFFFFF" />
          </view>
          <text class="topic-name">{{ topic.name }}</text>
        </view>
        <text class="topic-desc">{{ topic.description }}</text>
        <view class="topic-stats">
          <view class="stat">
            <app-icon name="file-text" :size="30" color="#999999" />
            <text class="stat-text"><text class="stat-num">{{ formatNum(topic.posts) }}</text> 篇内容</text>
          </view>
          <view class="stat">
            <app-icon name="users" :size="30" color="#999999" />
            <text class="stat-text"><text class="stat-num">{{ formatNum(topic.followers) }}</text> 人关注</text>
          </view>
        </view>
        <view class="follow-btn" :class="{ followed: isFollowed }" @tap="toggleFollow">
          <text class="follow-text">{{ isFollowed ? '已关注' : '+ 关注话题' }}</text>
        </view>
      </view>
    </view>

    <!-- 排序Tab -->
    <view class="sort-wrap">
      <view class="sort-tabs">
        <view class="sort-tab" :class="{ active: sortBy === 'latest' }" @tap="sortBy = 'latest'">
          <app-icon name="clock" :size="28" :color="sortBy === 'latest' ? '#FFFFFF' : '#666666'" />
          <text class="sort-text">最新</text>
        </view>
        <view class="sort-tab" :class="{ active: sortBy === 'hot' }" @tap="sortBy = 'hot'">
          <app-icon name="flame" :size="28" :color="sortBy === 'hot' ? '#FFFFFF' : '#666666'" />
          <text class="sort-text">最热</text>
        </view>
      </view>
    </view>

    <!-- 帖子列表 -->
    <view class="post-list">
      <view v-for="post in posts" :key="post.id" class="post-card" @tap="onPostTap(post)">
        <!-- 来源标签 -->
        <view v-if="post.source" class="source-row">
          <text class="source-tag" :class="post.source.type === 'article' ? 'tag-article' : 'tag-circle'">
            {{ post.source.type === 'article' ? '文章' : '圈子' }}
          </text>
          <text class="source-name">{{ post.source.name }}</text>
        </view>
        <!-- 作者 -->
        <view class="author-row">
          <view class="avatar" :style="{ background: avatarBg(post.author.name) }">
            <text class="avatar-text">{{ post.author.name.charAt(0) }}</text>
          </view>
          <view class="author-info">
            <text class="author-name">{{ post.author.name }}</text>
            <text class="post-time">{{ formatTime(post.createdAt) }}</text>
          </view>
        </view>
        <!-- 内容 -->
        <text class="post-content">{{ post.content }}</text>
        <!-- 图片 -->
        <view v-if="post.images && post.images.length" class="img-row">
          <view v-for="(img, i) in post.images.slice(0, 3)" :key="i" class="post-img" :style="{ background: imgBg(i) }" />
        </view>
        <!-- 互动 -->
        <view class="meta-row">
          <text class="meta" :class="{ liked: post.isLiked }">{{ post.likes }} 赞</text>
          <text class="meta">{{ post.comments }} 评论</text>
        </view>
      </view>
    </view>

    <!-- 发帖FAB -->
    <view class="fab" :style="{ bottom: '120rpx' }" @tap="onPost">
      <app-icon name="plus" :size="48" color="#FFFFFF" />
    </view>

  </view>
  </view>
  </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { navigateBack, navigateTo } from '@/utils/router'

const statusBarHeight = ref(20)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 20
} catch (e) {}

let topicId = '1'
try {
  const pages = getCurrentPages()
  const cur = pages[pages.length - 1]
  topicId = (cur && cur.options && cur.options.id) || '1'
} catch (e) {}

const sortBy = ref('latest')
const isFollowed = ref(false)

const topic = ref({
  id: topicId,
  name: '八字入门',
  description: '探讨八字命理基础知识，分享学习心得，解答入门疑惑。适合初学者交流学习。',
  posts: 1280,
  followers: 5680,
})

const posts = ref([
  {
    id: '1',
    type: 'post',
    content: '今天学习了八字中的十神关系，感觉对理解命局有很大帮助。分享一下我的笔记：正官代表约束、规矩，七杀代表压力、挑战...',
    images: ['a'],
    author: { id: '1', name: '命理新手' },
    createdAt: '2024-01-15T10:30:00Z',
    likes: 128,
    comments: 32,
    isLiked: false,
    source: { type: 'circle', id: '1', name: '八字研习社' },
  },
  {
    id: '2',
    type: 'article',
    content: '八字入门必知：天干地支的基本概念与记忆方法。很多初学者对天干地支感到困惑，本文将用最简单的方式帮你理解...',
    author: { id: '2', name: '周易大师' },
    createdAt: '2024-01-14T15:20:00Z',
    likes: 356,
    comments: 89,
    isLiked: true,
    source: { type: 'article', id: '1', name: '专栏文章' },
  },
  {
    id: '3',
    type: 'post',
    content: '请教各位大神，八字中的日主弱是不是一定不好？我看了一些资料说身弱需要帮扶，但又有说法是身弱也有好命...',
    author: { id: '3', name: '求学者' },
    createdAt: '2024-01-13T09:15:00Z',
    likes: 45,
    comments: 67,
    isLiked: false,
  },
])

function formatNum(n) {
  return (n || 0).toLocaleString()
}

function formatTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

const avatarColors = ['#C41E3A', '#C9A96E', '#2563eb', '#059669', '#d97706']
function avatarBg(name) {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return avatarColors[sum % avatarColors.length]
}
function imgBg(i) {
  return ['#F5F0E8', '#EFE9E0', '#F2EDE4'][i % 3]
}

function onBack() { navigateBack() }
function onShare() { uni.showToast({ title: '分享', icon: 'none' }) }
function toggleFollow() {
  isFollowed.value = !isFollowed.value
  topic.value.followers += isFollowed.value ? 1 : -1
}
function onPostTap(post) {
  if (post.source && post.source.type === 'article') {
    navigateTo(`/articles/${post.source.id}`)
  } else if (post.source) {
    navigateTo(`/circles/${post.source.id}/posts/${post.id}`)
  }
}
function onPost() {
  navigateTo(`/circles/create-post?topic=${topicId}`)
}
</script>

<style scoped>
.topic-detail {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 160rpx;
}
.hero {
  height: 384rpx;
  background: linear-gradient(135deg, #C41E3A, #8B1528);
  position: relative;
}
.hero-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx 0;
}
.nav-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.deco {
  position: absolute;
  border: 8rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}
.deco-1 {
  top: 64rpx;
  right: 64rpx;
  width: 256rpx;
  height: 256rpx;
}
.deco-2 {
  bottom: 32rpx;
  left: 32rpx;
  width: 128rpx;
  height: 128rpx;
  border-width: 4rpx;
}
.card-wrap {
  padding: 0 32rpx;
  margin-top: -128rpx;
  position: relative;
  z-index: 10;
}
.topic-card {
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.08);
}
.topic-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.hash-box {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #C41E3A, #E84C3D);
  display: flex;
  align-items: center;
  justify-content: center;
}
.topic-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #2C2C2C;
}
.topic-desc {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
  margin-bottom: 32rpx;
  display: block;
}
.topic-stats {
  display: flex;
  align-items: center;
  gap: 48rpx;
  margin-bottom: 32rpx;
}
.stat {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.stat-text {
  font-size: 28rpx;
  color: #666666;
}
.stat-num {
  font-weight: 600;
  color: #2C2C2C;
}
.follow-btn {
  width: 100%;
  padding: 20rpx 0;
  border-radius: 24rpx;
  background: linear-gradient(90deg, #C41E3A, #E84C3D);
  display: flex;
  align-items: center;
  justify-content: center;
}
.follow-btn.followed {
  background: #F5F0E8;
}
.follow-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #FFFFFF;
}
.follow-btn.followed .follow-text {
  color: #666666;
}
.sort-wrap {
  padding: 0 32rpx;
  margin-top: 32rpx;
}
.sort-tabs {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 8rpx;
}
.sort-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 20rpx 0;
  border-radius: 16rpx;
}
.sort-tab.active {
  background: linear-gradient(90deg, #C41E3A, #E84C3D);
}
.sort-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #666666;
}
.sort-tab.active .sort-text {
  color: #FFFFFF;
}
.post-list {
  padding: 0 32rpx;
  margin-top: 32rpx;
}
.post-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
}
.source-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}
.source-tag {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}
.tag-article {
  background: rgba(201, 169, 110, 0.1);
  color: #C9A96E;
}
.tag-circle {
  background: rgba(196, 30, 58, 0.1);
  color: #C41E3A;
}
.source-name {
  font-size: 22rpx;
  color: #999999;
}
.author-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 24rpx;
}
.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}
.author-info {
  flex: 1;
}
.author-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  display: block;
}
.post-time {
  font-size: 22rpx;
  color: #999999;
}
.post-content {
  font-size: 28rpx;
  color: #2C2C2C;
  line-height: 1.6;
  margin-bottom: 24rpx;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.img-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.post-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.meta {
  font-size: 22rpx;
  color: #999999;
}
.meta.liked {
  color: #C41E3A;
}
.fab {
  position: fixed;
  right: 32rpx;
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: linear-gradient(90deg, #C41E3A, #E84C3D);
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
</style>
