<script setup lang="ts">
/**
 * 用户主页（从原型 app/user/[id]/page.tsx 532 行高保真迁移）
 * 背景封面+头像认证 / 用户信息(昵称/认证/简介/等级/互关) / 数据看板(关注/粉丝/获赞)
 * / 关注·私信操作 / 4内容Tab(动态/帖子/文章/短视频) + 帖子·文章·视频三种卡片
 * query: id
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo, toastComingSoon } from '@/utils/router'
import {
  getUserProfile,
  getUserPosts,
  followUser,
  unfollowUser,
  formatCount,
  getContentUrl,
  type UserProfileResponse,
  type UserPostItem,
} from '@/lib/user-profile-data'

const userId = ref(1)
const profile = ref<UserProfileResponse | null>(null)
const posts = ref<UserPostItem[]>([])
const loading = ref(true)
const postsLoading = ref(false)
const activeTab = ref<'all' | 'posts' | 'articles' | 'videos'>('all')
const followLoading = ref(false)
const showMoreMenu = ref(false)

const contentTabs = [
  { id: 'all', label: '动态' },
  { id: 'posts', label: '帖子' },
  { id: 'articles', label: '文章' },
  { id: 'videos', label: '短视频' },
] as const

const filteredPosts = computed(() => {
  if (activeTab.value === 'all') return posts.value
  const map: Record<string, string> = { posts: 'post', articles: 'article', videos: 'video' }
  const target = map[activeTab.value]
  return posts.value.filter((p) => p.type === target)
})

onLoad((q) => {
  if (q?.id) userId.value = Number(q.id) || 1
  loadProfile()
})

async function loadProfile() {
  loading.value = true
  try {
    const res = await getUserProfile(userId.value)
    if (res.code === 200 && res.data) {
      profile.value = res.data
      loadPosts()
    }
  } finally {
    loading.value = false
  }
}

async function loadPosts() {
  postsLoading.value = true
  try {
    const res = await getUserPosts(userId.value, 'all')
    if (res.code === 200 && res.data) {
      posts.value = res.data.list
    }
  } finally {
    postsLoading.value = false
  }
}

// 关注/取关 — 乐观更新
async function handleFollow() {
  if (!profile.value || followLoading.value) return
  followLoading.value = true
  const wasFollowing = profile.value.isFollowing
  profile.value = {
    ...profile.value,
    isFollowing: !wasFollowing,
    stats: {
      ...profile.value.stats,
      followerCount: profile.value.stats.followerCount + (wasFollowing ? -1 : 1),
    },
  }
  try {
    const res = wasFollowing
      ? await unfollowUser(userId.value)
      : await followUser(userId.value)
    if (res.code === 200) {
      uni.showToast({ title: wasFollowing ? '已取消关注' : '关注成功', icon: 'none' })
      if (!wasFollowing && 'isMutualFollow' in res.data && res.data.isMutualFollow && profile.value) {
        profile.value = { ...profile.value, isMutualFollow: true }
      }
    } else if (profile.value) {
      profile.value = {
        ...profile.value,
        isFollowing: wasFollowing,
        stats: {
          ...profile.value.stats,
          followerCount: profile.value.stats.followerCount + (wasFollowing ? 1 : -1),
        },
      }
      uni.showToast({ title: '操作失败', icon: 'none' })
    }
  } finally {
    followLoading.value = false
  }
}

function handleShare() {
  uni.showToast({ title: '链接已复制', icon: 'none' })
}

function goChat() {
  navigateTo(`/pkg-im/im/chat/index?id=${userId.value}`)
}

function openContent(item: UserPostItem) {
  navigateTo(getContentUrl(item))
}

function toggleMore() {
  showMoreMenu.value = !showMoreMenu.value
}

function avatarInitial(name?: string): string {
  return name ? name[0] : ''
}
</script>

<template>
  <view class="up-page">
    <!-- 顶部背景区 -->
    <view class="up-hero">
      <view
        class="up-cover"
        :style="profile?.profile.coverImage ? { backgroundImage: `url(${profile.profile.coverImage})` } : {}"
      />
      <!-- 顶部导航 -->
      <view class="up-nav">
        <view class="up-nav-btn" @tap="goBack">
          <AppIcon name="arrow-left" :size="40" color="#ffffff" />
        </view>
        <view class="up-nav-right">
          <view class="up-nav-btn" @tap="handleShare">
            <AppIcon name="share-2" :size="38" color="#ffffff" />
          </view>
          <view class="up-nav-more">
            <view class="up-nav-btn" @tap="toggleMore">
              <AppIcon name="more-horizontal" :size="40" color="#ffffff" />
            </view>
            <template v-if="showMoreMenu">
              <view class="up-mask" @tap="showMoreMenu = false" />
              <view class="up-menu">
                <view class="up-menu-item" @tap="() => { showMoreMenu = false; toastComingSoon() }">
                  <text class="up-menu-txt">举报</text>
                </view>
                <view class="up-menu-item" @tap="() => { showMoreMenu = false; toastComingSoon() }">
                  <text class="up-menu-txt up-menu-txt--danger">拉黑</text>
                </view>
              </view>
            </template>
          </view>
        </view>
      </view>

      <!-- 头像 -->
      <view v-if="profile" class="up-avatar-wrap">
        <image
          v-if="profile.profile.avatar"
          class="up-avatar"
          :src="profile.profile.avatar"
          mode="aspectFill"
        />
        <view v-else class="up-avatar up-avatar--fallback">
          <text class="up-avatar-initial">{{ avatarInitial(profile.profile.nickname) }}</text>
        </view>
        <view v-if="profile.profile.verified" class="up-verify">
          <AppIcon name="badge-check" :size="26" color="#ffffff" />
        </view>
      </view>
    </view>

    <!-- 用户信息区 -->
    <view v-if="profile" class="up-info">
      <view class="up-name-row">
        <text class="up-name">{{ profile.profile.nickname }}</text>
        <view v-if="profile.profile.verified" class="up-verify-tag">
          <text class="up-verify-tag-txt">{{ profile.profile.verifiedTitle }}</text>
        </view>
      </view>
      <text v-if="profile.profile.bio" class="up-bio">{{ profile.profile.bio }}</text>
      <view class="up-badges">
        <view class="up-level">
          <text class="up-level-txt">Lv.{{ profile.profile.level }} {{ profile.profile.levelName }}</text>
        </view>
        <view v-if="profile.isMutualFollow" class="up-mutual">
          <text class="up-mutual-txt">互相关注</text>
        </view>
      </view>

      <!-- 数据看板 -->
      <view class="up-stats">
        <view class="up-stat" @tap="toastComingSoon">
          <text class="up-stat-num">{{ formatCount(profile.stats.followingCount) }}</text>
          <text class="up-stat-label">关注</text>
        </view>
        <view class="up-stat-divider" />
        <view class="up-stat" @tap="toastComingSoon">
          <text class="up-stat-num">{{ formatCount(profile.stats.followerCount) }}</text>
          <text class="up-stat-label">粉丝</text>
        </view>
        <view class="up-stat-divider" />
        <view class="up-stat">
          <text class="up-stat-num">{{ formatCount(profile.stats.likeCount) }}</text>
          <text class="up-stat-label">获赞</text>
        </view>
      </view>

      <!-- 操作按钮行 -->
      <view v-if="!profile.isSelf" class="up-actions">
        <view
          class="up-btn"
          :class="profile.isFollowing ? 'up-btn--following' : 'up-btn--follow'"
          @tap="handleFollow"
        >
          <text class="up-btn-txt" :class="profile.isFollowing ? 'up-btn-txt--following' : 'up-btn-txt--follow'">
            {{ profile.isFollowing ? '已关注' : '+ 关注' }}
          </text>
        </view>
        <view class="up-btn up-btn--msg" @tap="goChat">
          <text class="up-btn-txt up-btn-txt--msg">发私信</text>
        </view>
      </view>
    </view>

    <!-- 内容Tab栏 -->
    <view class="up-tabs">
      <view
        v-for="tab in contentTabs"
        :key="tab.id"
        class="up-tab"
        @tap="activeTab = tab.id"
      >
        <text class="up-tab-txt" :class="{ 'up-tab-txt--active': activeTab === tab.id }">{{ tab.label }}</text>
        <view v-if="activeTab === tab.id" class="up-tab-line" />
      </view>
    </view>

    <!-- 内容列表 -->
    <view class="up-content">
      <view v-if="postsLoading" class="up-empty">
        <text class="up-empty-txt">加载中…</text>
      </view>
      <view v-else-if="filteredPosts.length === 0" class="up-empty">
        <text class="up-empty-txt">暂无内容</text>
      </view>

      <!-- 短视频：双列网格 -->
      <view v-else-if="activeTab === 'videos'" class="up-video-grid">
        <view
          v-for="video in filteredPosts"
          :key="video.id"
          class="up-video-card"
          @tap="openContent(video)"
        >
          <view class="up-video-cover">
            <image v-if="video.cover" class="up-video-img" :src="video.cover" mode="aspectFill" />
            <view v-else class="up-video-placeholder">
              <AppIcon name="video" :size="56" color="rgba(0,0,0,0.2)" />
            </view>
            <view class="up-video-play">
              <AppIcon name="play" :size="32" color="#ffffff" />
            </view>
          </view>
          <view class="up-video-body">
            <text class="up-video-title">{{ video.title || video.content }}</text>
            <view class="up-video-meta">
              <AppIcon name="heart" :size="22" color="#999188" />
              <text class="up-video-likes">{{ video.likeCount }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 帖子 / 文章 / 动态：单列 -->
      <view v-else class="up-list">
        <template v-for="item in filteredPosts" :key="item.id">
          <!-- 文章卡片 -->
          <view v-if="item.type === 'article'" class="up-article" @tap="openContent(item)">
            <view class="up-article-cover">
              <image v-if="item.cover" class="up-article-img" :src="item.cover" mode="aspectFill" />
              <view v-else class="up-article-placeholder">
                <AppIcon name="file-text" :size="36" color="rgba(0,0,0,0.2)" />
              </view>
            </view>
            <view class="up-article-body">
              <text class="up-article-title">{{ item.title }}</text>
              <view class="up-article-meta">
                <view class="up-meta-item">
                  <AppIcon name="heart" :size="22" color="#999188" />
                  <text class="up-meta-txt">{{ item.likeCount }}</text>
                </view>
                <text class="up-meta-txt">{{ item.createdAt }}</text>
              </view>
            </view>
          </view>

          <!-- 视频卡片（动态混排时） -->
          <view v-else-if="item.type === 'video'" class="up-post" @tap="openContent(item)">
            <view class="up-post-video">
              <image v-if="item.cover" class="up-post-video-img" :src="item.cover" mode="aspectFill" />
              <view class="up-post-video-play">
                <AppIcon name="play" :size="36" color="#ffffff" />
              </view>
            </view>
            <text class="up-post-content">{{ item.title || item.content }}</text>
            <view class="up-post-foot">
              <text class="up-post-time">{{ item.createdAt }}</text>
              <view class="up-post-stats">
                <view class="up-meta-item">
                  <AppIcon name="heart" :size="26" :color="item.isLiked ? '#C41E3A' : '#999188'" />
                  <text class="up-meta-txt" :class="{ 'up-meta-txt--liked': item.isLiked }">{{ item.likeCount }}</text>
                </view>
                <view class="up-meta-item">
                  <AppIcon name="message-circle" :size="26" color="#999188" />
                  <text class="up-meta-txt">{{ item.commentCount }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 帖子卡片 -->
          <view v-else class="up-post" @tap="openContent(item)">
            <text class="up-post-content">{{ item.content }}</text>
            <view v-if="item.images && item.images.length" class="up-post-imgs" :class="item.images.length === 1 ? 'up-post-imgs--single' : 'up-post-imgs--multi'">
              <view
                v-for="(img, idx) in item.images.slice(0, 4)"
                :key="idx"
                class="up-post-img-wrap"
              >
                <image class="up-post-img" :src="img" mode="aspectFill" />
              </view>
            </view>
            <view class="up-post-foot">
              <text class="up-post-time">{{ item.createdAt }}</text>
              <view class="up-post-stats">
                <view class="up-meta-item">
                  <AppIcon name="heart" :size="26" :color="item.isLiked ? '#C41E3A' : '#999188'" />
                  <text class="up-meta-txt" :class="{ 'up-meta-txt--liked': item.isLiked }">{{ item.likeCount }}</text>
                </view>
                <view class="up-meta-item">
                  <AppIcon name="message-circle" :size="26" color="#999188" />
                  <text class="up-meta-txt">{{ item.commentCount }}</text>
                </view>
              </view>
            </view>
          </view>
        </template>
      </view>
    </view>
  </view>
</template>

<style scoped>
.up-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 48rpx;
}

/* 顶部背景区 */
.up-hero {
  position: relative;
}
.up-cover {
  height: 320rpx;
  background-color: #c9a96e;
  background-image: linear-gradient(135deg, rgba(196, 30, 58, 0.3), rgba(201, 169, 110, 0.25), #e8e0d5);
  background-size: cover;
  background-position: center;
}
.up-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  padding-top: calc(32rpx + var(--status-bar-height, 0px));
}
.up-nav-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.up-nav-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}
.up-nav-more {
  position: relative;
}
.up-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
}
.up-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 12rpx);
  width: 200rpx;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
  padding: 8rpx 0;
  z-index: 50;
}
.up-menu-item {
  padding: 20rpx 28rpx;
}
.up-menu-txt {
  font-size: 28rpx;
  color: #2c2c2c;
}
.up-menu-txt--danger {
  color: #dc2626;
}

/* 头像 */
.up-avatar-wrap {
  position: absolute;
  left: 32rpx;
  bottom: -96rpx;
}
.up-avatar {
  width: 176rpx;
  height: 176rpx;
  border-radius: 50%;
  border: 8rpx solid #faf8f5;
  background: #f2ece1;
}
.up-avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}
.up-avatar-initial {
  font-size: 56rpx;
  color: #c41e3a;
  font-weight: 600;
}
.up-verify {
  position: absolute;
  right: 4rpx;
  bottom: 4rpx;
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: #c9a96e;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #faf8f5;
}

/* 用户信息区 */
.up-info {
  padding: 0 32rpx;
  padding-top: 116rpx;
}
.up-name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.up-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.up-verify-tag {
  background: rgba(196, 30, 58, 0.1);
  border-radius: 8rpx;
  padding: 2rpx 12rpx;
}
.up-verify-tag-txt {
  font-size: 20rpx;
  color: #c41e3a;
}
.up-bio {
  display: block;
  font-size: 28rpx;
  color: #8a8178;
  line-height: 1.6;
  margin-top: 16rpx;
}
.up-badges {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 16rpx;
}
.up-level {
  background: rgba(201, 169, 110, 0.1);
  border: 2rpx solid rgba(201, 169, 110, 0.3);
  border-radius: 8rpx;
  padding: 4rpx 16rpx;
}
.up-level-txt {
  font-size: 22rpx;
  color: #c9a96e;
}
.up-mutual {
  background: #fdf2f8;
  border: 2rpx solid #fbcfe8;
  border-radius: 8rpx;
  padding: 4rpx 16rpx;
}
.up-mutual-txt {
  font-size: 22rpx;
  color: #db2777;
}

/* 数据看板 */
.up-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgba(232, 224, 213, 0.4);
  border-radius: 20rpx;
  padding: 28rpx 0;
  margin-top: 32rpx;
}
.up-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}
.up-stat-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.up-stat-label {
  font-size: 24rpx;
  color: #8a8178;
  margin-top: 4rpx;
}
.up-stat-divider {
  width: 2rpx;
  height: 56rpx;
  background: #e8e0d5;
}

/* 操作按钮行 */
.up-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 32rpx;
}
.up-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.up-btn--follow {
  background: #c41e3a;
}
.up-btn--following {
  background: #f2ece1;
}
.up-btn--msg {
  border: 2rpx solid #e8e0d5;
}
.up-btn-txt {
  font-size: 28rpx;
  font-weight: 500;
}
.up-btn-txt--follow {
  color: #ffffff;
}
.up-btn-txt--following {
  color: #8a8178;
}
.up-btn-txt--msg {
  color: #2c2c2c;
}

/* 内容Tab栏 */
.up-tabs {
  display: flex;
  align-items: center;
  padding: 0 32rpx;
  margin-top: 32rpx;
  border-bottom: 2rpx solid #e8e0d5;
  background: #faf8f5;
}
.up-tab {
  position: relative;
  padding: 24rpx 32rpx;
}
.up-tab-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #8a8178;
}
.up-tab-txt--active {
  color: #c41e3a;
}
.up-tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  background: #c41e3a;
  border-radius: 999rpx;
}

/* 内容列表 */
.up-content {
  padding: 32rpx;
}
.up-empty {
  padding: 96rpx 0;
  text-align: center;
}
.up-empty-txt {
  font-size: 28rpx;
  color: #8a8178;
}
.up-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 帖子卡片 */
.up-post {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
}
.up-post-content {
  display: block;
  font-size: 28rpx;
  color: #2c2c2c;
  line-height: 1.6;
}
.up-post-imgs {
  display: grid;
  gap: 8rpx;
  margin-top: 16rpx;
}
.up-post-imgs--single {
  grid-template-columns: 1fr;
}
.up-post-imgs--multi {
  grid-template-columns: 1fr 1fr;
}
.up-post-img-wrap {
  aspect-ratio: 1;
  border-radius: 12rpx;
  overflow: hidden;
  background: #f2ece1;
}
.up-post-img {
  width: 100%;
  height: 100%;
}
.up-post-video {
  position: relative;
  width: 100%;
  height: 320rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background: #f2ece1;
  margin-bottom: 16rpx;
}
.up-post-video-img {
  width: 100%;
  height: 100%;
}
.up-post-video-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}
.up-post-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
}
.up-post-time {
  font-size: 24rpx;
  color: #999188;
}
.up-post-stats {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.up-meta-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.up-meta-txt {
  font-size: 24rpx;
  color: #999188;
}
.up-meta-txt--liked {
  color: #c41e3a;
}

/* 文章卡片 */
.up-article {
  display: flex;
  gap: 24rpx;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
}
.up-article-cover {
  width: 192rpx;
  height: 128rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background: #f2ece1;
  flex-shrink: 0;
}
.up-article-img {
  width: 100%;
  height: 100%;
}
.up-article-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.up-article-body {
  flex: 1;
  min-width: 0;
}
.up-article-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.5;
}
.up-article-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 12rpx;
}

/* 视频网格 */
.up-video-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.up-video-card {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
}
.up-video-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 9 / 16;
  background: #f2ece1;
}
.up-video-img {
  width: 100%;
  height: 100%;
}
.up-video-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.up-video-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}
.up-video-body {
  padding: 16rpx;
}
.up-video-title {
  display: block;
  font-size: 24rpx;
  color: #2c2c2c;
  line-height: 1.5;
}
.up-video-meta {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 8rpx;
}
.up-video-likes {
  font-size: 20rpx;
  color: #999188;
}
</style>
