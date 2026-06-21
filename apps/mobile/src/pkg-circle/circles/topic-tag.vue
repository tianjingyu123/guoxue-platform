<template>
  <view class="topic-tag">
    <!-- 顶部导航 -->
    <view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="header-inner">
        <view class="nav-btn" @tap="onBack">
          <app-icon name="arrow-left" :size="36" color="#2C2C2C" />
        </view>
        <text class="header-title">话题</text>
        <view class="nav-btn" @tap="onShare">
          <app-icon name="share-2" :size="36" color="#2C2C2C" />
        </view>
      </view>
    </view>

    <!-- 话题信息区 -->
    <view class="topic-info">
      <view class="info-main">
        <view class="info-left">
          <view class="tag-head">
            <view class="hash-box">
              <app-icon name="hash" :size="34" color="#C41E3A" />
            </view>
            <text class="tag-name">#{{ topicData.tag }}#</text>
          </view>
          <text class="tag-desc">{{ topicData.description }}</text>
          <view class="tag-stats">
            <text class="stat-item"><text class="stat-num">{{ formatNum(topicData.contentCount) }}</text> 篇内容</text>
            <text class="stat-item"><text class="stat-num">{{ formatNum(topicData.followCount) }}</text> 人关注</text>
          </view>
        </view>
        <view class="follow-btn" :class="{ followed: isFollowed }" @tap="toggleFollow">
          <app-icon :name="isFollowed ? 'check' : 'plus'" :size="28" :color="isFollowed ? '#999999' : '#FFFFFF'" />
          <text class="follow-text">{{ isFollowed ? '已关注' : '关注' }}</text>
        </view>
      </view>
    </view>

    <!-- 排序切换 -->
    <view class="sort-bar">
      <view class="sort-select" @tap="showSortMenu = !showSortMenu">
        <text class="sort-label">{{ sortBy === 'latest' ? '最新发布' : '最受欢迎' }}</text>
        <app-icon name="chevron-down" :size="28" color="#2C2C2C" :class="{ 'rotate-180': showSortMenu }" />
        <view v-if="showSortMenu" class="sort-menu">
          <view class="sort-opt" :class="{ active: sortBy === 'latest' }" @tap.stop="selectSort('latest')">最新发布</view>
          <view class="sort-opt" :class="{ active: sortBy === 'hot' }" @tap.stop="selectSort('hot')">最受欢迎</view>
        </view>
      </view>
      <text class="refresh-btn" @tap="onRefresh">{{ isRefreshing ? '刷新中...' : '刷新' }}</text>
    </view>
    <view v-if="showSortMenu" class="sort-mask" @tap="showSortMenu = false" />

    <!-- 内容列表 -->
    <view class="content-list">
      <view v-for="item in sortedContent" :key="item.id" class="content-item" @tap="onItemTap(item)">
        <!-- 文章 -->
        <view v-if="item.type === 'article'" class="article-card">
          <view class="article-body">
            <view class="type-badge badge-article">
              <app-icon name="file-text" :size="22" color="#3b82f6" />
              <text class="badge-text" style="color:#3b82f6">文章</text>
            </view>
            <text class="article-title">{{ item.title }}</text>
            <text class="article-excerpt">{{ item.excerpt }}</text>
            <view class="item-foot">
              <view class="author-mini">
                <view class="avatar-mini" :style="{ background: avatarBg(item.author.name) }">
                  <text class="avatar-mini-text">{{ item.author.name.charAt(0) }}</text>
                </view>
                <text class="author-mini-name">{{ item.author.name }}</text>
                <text v-if="item.author.isVerified" class="v-badge">V</text>
              </view>
              <view class="meta-mini">
                <view class="meta-cell"><app-icon name="heart" :size="22" color="#999999" /><text class="meta-mini-text">{{ item.likes }}</text></view>
                <view class="meta-cell"><app-icon name="message-circle" :size="22" color="#999999" /><text class="meta-mini-text">{{ item.comments }}</text></view>
                <text class="meta-mini-text">{{ item.time }}</text>
              </view>
            </view>
          </view>
          <view class="article-cover">
            <app-icon name="file-text" :size="48" color="#CCCCCC" />
          </view>
        </view>

        <!-- 帖子 -->
        <view v-else-if="item.type === 'post'" class="post-card">
          <view class="post-head">
            <view class="avatar-sm" :style="{ background: avatarBg(item.author.name) }">
              <text class="avatar-sm-text">{{ item.author.name.charAt(0) }}</text>
            </view>
            <view class="post-author">
              <view class="post-author-row">
                <text class="post-author-name">{{ item.author.name }}</text>
                <text v-if="item.author.isVerified" class="v-badge">V</text>
              </view>
              <text class="post-time">{{ item.time }}</text>
            </view>
            <view class="type-badge badge-post">
              <app-icon name="message-square" :size="22" color="#22c55e" />
              <text class="badge-text" style="color:#22c55e">帖子</text>
            </view>
          </view>
          <text class="post-text">{{ item.content }}</text>
          <view v-if="item.images && item.images.length" class="post-imgs" :class="'cols-' + Math.min(item.images.length, 3)">
            <view v-for="(img, idx) in item.images.slice(0, 3)" :key="idx" class="post-img-cell">
              <app-icon name="message-square" :size="40" color="#CCCCCC" />
              <view v-if="idx === 2 && item.images.length > 3" class="img-more">
                <text class="img-more-text">+{{ item.images.length - 3 }}</text>
              </view>
            </view>
          </view>
          <view class="meta-mini">
            <view class="meta-cell"><app-icon name="heart" :size="26" color="#999999" /><text class="meta-mini-text">{{ item.likes }}</text></view>
            <view class="meta-cell"><app-icon name="message-circle" :size="26" color="#999999" /><text class="meta-mini-text">{{ item.comments }}</text></view>
          </view>
        </view>

        <!-- 视频 -->
        <view v-else-if="item.type === 'video'" class="video-card">
          <view class="video-cover">
            <app-icon name="video" :size="56" color="#CCCCCC" />
            <view class="play-btn">
              <app-icon name="play" :size="32" color="#FFFFFF" />
            </view>
            <text class="video-duration">{{ item.duration }}</text>
          </view>
          <view class="video-body">
            <view class="type-badge badge-video">
              <app-icon name="video" :size="22" color="#a855f7" />
              <text class="badge-text" style="color:#a855f7">视频</text>
            </view>
            <text class="video-title">{{ item.title }}</text>
            <view class="author-mini">
              <view class="avatar-mini" :style="{ background: avatarBg(item.author.name) }">
                <text class="avatar-mini-text">{{ item.author.name.charAt(0) }}</text>
              </view>
              <text class="author-mini-name">{{ item.author.name }}</text>
              <text v-if="item.author.isVerified" class="v-badge">V</text>
            </view>
            <view class="meta-mini">
              <view class="meta-cell"><app-icon name="heart" :size="22" color="#999999" /><text class="meta-mini-text">{{ item.likes }}</text></view>
              <view class="meta-cell"><app-icon name="eye" :size="22" color="#999999" /><text class="meta-mini-text">{{ formatNum(item.views) }}</text></view>
              <text class="meta-mini-text">{{ item.time }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载更多 -->
    <view class="load-more" @tap="onLoadMore">
      <view v-if="isLoadingMore" class="loading-row">
        <app-icon name="loader-2" :size="28" color="#999999" class="spin" />
        <text class="load-text">加载中...</text>
      </view>
      <text v-else class="load-text">点击加载更多</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { navigateBack, navigateTo } from '@/utils/router'

const statusBarHeight = ref(20)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 20
} catch (e) {}

const isFollowed = ref(false)
const sortBy = ref('latest')
const showSortMenu = ref(false)
const isRefreshing = ref(false)
const isLoadingMore = ref(false)

const topicData = ref({
  tag: '八字案例',
  contentCount: 1286,
  followCount: 3560,
  description: '分享八字命理实战案例，探讨命盘分析技法',
})

const contentList = ref([
  { id: 1, type: 'article', title: '从一个八字看事业转机：从低谷到高峰的命理分析', excerpt: '今天分享一个真实案例，命主在2023年经历了事业的重大转折...', author: { name: '周易大师', isVerified: true }, likes: 328, comments: 56, time: '2小时前' },
  { id: 2, type: 'post', content: '刚看完一个财运很旺的八字，年柱甲子、月柱庚申、日柱壬寅、时柱癸卯。大家觉得这个八字有什么特点？#八字案例# #命理分析#', images: ['', '', ''], author: { name: '命理小白', isVerified: false }, likes: 89, comments: 23, time: '3小时前' },
  { id: 3, type: 'video', title: '实战讲解：如何从八字看婚姻缘分', duration: '05:32', author: { name: '玄学研究员', isVerified: true }, likes: 1256, views: 8900, time: '昨天' },
  { id: 4, type: 'article', title: '八字中的食伤生财格局详解', excerpt: '食伤生财是八字中常见的富贵格局之一，今天我们通过几个实际案例来分析...', author: { name: '易学传承', isVerified: true }, likes: 456, comments: 78, time: '昨天' },
  { id: 5, type: 'post', content: '请教各位大师，这个八字的用神应该怎么取？感觉木火土金水都有点道理...', images: [''], author: { name: '初学者小王', isVerified: false }, likes: 45, comments: 67, time: '2天前' },
  { id: 6, type: 'video', title: '一分钟看懂八字十神关系', duration: '01:28', author: { name: '周易大师', isVerified: true }, likes: 2345, views: 15600, time: '3天前' },
])

const sortedContent = computed(() => {
  const arr = [...contentList.value]
  if (sortBy.value === 'hot') arr.sort((a, b) => b.likes - a.likes)
  return arr
})

function formatNum(n) {
  return (n || 0).toLocaleString()
}

const avatarColors = ['#C41E3A', '#C9A96E', '#2563eb', '#059669', '#d97706']
function avatarBg(name) {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return avatarColors[sum % avatarColors.length]
}

function onBack() { navigateBack() }
function onShare() { uni.showToast({ title: '分享', icon: 'none' }) }
function toggleFollow() { isFollowed.value = !isFollowed.value }
function selectSort(v) { sortBy.value = v; showSortMenu.value = false }
function onRefresh() {
  if (isRefreshing.value) return
  isRefreshing.value = true
  setTimeout(() => { isRefreshing.value = false }, 1000)
}
function onLoadMore() {
  if (isLoadingMore.value) return
  isLoadingMore.value = true
  setTimeout(() => { isLoadingMore.value = false }, 1000)
}
function onItemTap(item) {
  if (item.type === 'article') navigateTo(`/articles/${item.id}`)
  else if (item.type === 'video') navigateTo(`/video/${item.id}`)
  else navigateTo(`/post/${item.id}`)
}
</script>

<style scoped>
.topic-tag {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 48rpx;
}
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(250, 248, 245, 0.95);
  border-bottom: 1rpx solid #EFEAE3;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.header-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.topic-info {
  padding: 40rpx 32rpx;
  border-bottom: 1rpx solid #EFEAE3;
}
.info-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 32rpx;
}
.info-left {
  flex: 1;
}
.tag-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.hash-box {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.tag-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #2C2C2C;
}
.tag-desc {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 24rpx;
  display: block;
}
.tag-stats {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.stat-item {
  font-size: 28rpx;
  color: #999999;
}
.stat-num {
  font-weight: 600;
  color: #2C2C2C;
}
.follow-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 32rpx;
  border-radius: 999rpx;
  background: #C41E3A;
}
.follow-btn.followed {
  background: #F2EFEA;
}
.follow-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #FFFFFF;
}
.follow-btn.followed .follow-text {
  color: #999999;
}
.sort-bar {
  padding: 24rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid #EFEAE3;
  position: relative;
}
.sort-select {
  display: flex;
  align-items: center;
  gap: 8rpx;
  position: relative;
}
.sort-label {
  font-size: 28rpx;
  color: #2C2C2C;
}
.rotate-180 {
  transform: rotate(180deg);
}
.sort-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8rpx;
  width: 224rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
  border: 1rpx solid #EFEAE3;
  overflow: hidden;
  z-index: 50;
}
.sort-opt {
  padding: 20rpx 32rpx;
  font-size: 28rpx;
  color: #2C2C2C;
}
.sort-opt.active {
  color: #C41E3A;
  background: rgba(196, 30, 58, 0.05);
}
.sort-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
}
.refresh-btn {
  font-size: 28rpx;
  color: #C41E3A;
}
.content-list {
  background: #FFFFFF;
}
.content-item {
  border-bottom: 1rpx solid #EFEAE3;
}
.article-card {
  padding: 32rpx;
  display: flex;
  gap: 24rpx;
}
.article-body {
  flex: 1;
  min-width: 0;
}
.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  margin-bottom: 12rpx;
}
.badge-article { background: rgba(59, 130, 246, 0.1); }
.badge-post { background: rgba(34, 197, 94, 0.1); }
.badge-video { background: rgba(168, 85, 247, 0.1); }
.badge-text {
  font-size: 20rpx;
}
.article-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  line-height: 1.4;
  margin-bottom: 12rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-excerpt {
  font-size: 24rpx;
  color: #999999;
  line-height: 1.5;
  margin-bottom: 16rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-cover {
  width: 192rpx;
  height: 128rpx;
  border-radius: 16rpx;
  background: #F2EFEA;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.item-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.author-mini {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.avatar-mini {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-mini-text {
  font-size: 20rpx;
  color: #FFFFFF;
}
.author-mini-name {
  font-size: 24rpx;
  color: #999999;
}
.v-badge {
  font-size: 16rpx;
  padding: 0 6rpx;
  border-radius: 6rpx;
  background: rgba(201, 169, 110, 0.2);
  color: #C9A96E;
}
.meta-mini {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.meta-cell {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.meta-mini-text {
  font-size: 24rpx;
  color: #999999;
}
.post-card {
  padding: 32rpx;
}
.post-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.avatar-sm {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-sm-text {
  font-size: 26rpx;
  color: #FFFFFF;
}
.post-author {
  flex: 1;
}
.post-author-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.post-author-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.post-time {
  font-size: 20rpx;
  color: #999999;
}
.post-text {
  font-size: 28rpx;
  color: #2C2C2C;
  line-height: 1.5;
  margin-bottom: 24rpx;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.post-imgs {
  display: grid;
  gap: 8rpx;
  margin-bottom: 24rpx;
}
.cols-1 { grid-template-columns: 1fr; }
.cols-2 { grid-template-columns: 1fr 1fr; }
.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
.post-img-cell {
  aspect-ratio: 1;
  border-radius: 16rpx;
  background: #F2EFEA;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.img-more {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.img-more-text {
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
}
.video-card {
  padding: 32rpx;
  display: flex;
  gap: 24rpx;
}
.video-cover {
  width: 256rpx;
  aspect-ratio: 9 / 16;
  border-radius: 16rpx;
  background: #F2EFEA;
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.play-btn {
  position: absolute;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.video-duration {
  position: absolute;
  bottom: 12rpx;
  right: 12rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: rgba(0, 0, 0, 0.6);
  color: #FFFFFF;
  font-size: 20rpx;
}
.video-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.video-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  line-height: 1.4;
  margin-bottom: auto;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx 0;
}
.loading-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.load-text {
  font-size: 28rpx;
  color: #999999;
}
</style>
