<template>
  <view class="circles-page">
    <!-- 顶部固定 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-title">圈子</text>
        <view class="header-actions">
          <text class="header-btn" @click="goPage('/pages/circles/search/index')">🔍</text>
          <text class="header-btn" @click="goPage('/pages/circles/calendar/index')">📅</text>
        </view>
      </view>
      <!-- 主Tab -->
      <view class="main-tabs">
        <view
          v-for="tab in mainTabs"
          :key="tab.id"
          class="main-tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </view>
      </view>
    </view>

    <!-- 发现Tab -->
    <view v-if="activeTab === 'discover'">
      <!-- 直播预告 -->
      <view v-if="upcomingLives.length" class="live-banner" @click="goPage(`/pages/live/id/index?id=${upcomingLives[0].id}`)">
        <view class="live-banner-tag">直播预告</view>
        <view class="live-banner-body">
          <image v-if="upcomingLives[0].avatar" :src="upcomingLives[0].avatar" class="lb-avatar" mode="aspectFill" />
          <view v-else class="lb-avatar-plain">{{ upcomingLives[0].host?.charAt(0) }}</view>
          <view class="lb-info">
            <text class="lb-title">{{ upcomingLives[0].title }}</text>
            <text class="lb-sub">{{ upcomingLives[0].host }} · {{ upcomingLives[0].circleName }}</text>
            <text class="lb-time">⏰ {{ upcomingLives[0].startTime }}</text>
          </view>
          <text class="lb-book">预约</text>
        </view>
      </view>

      <!-- 今日活动 -->
      <view v-if="todayActivities.length" class="section">
        <view class="section-header">
          <text class="section-title">⚡ 今日活动</text>
          <text class="section-more" @click="goPage('/pages/circles/activities/index')">全部 ›</text>
        </view>
        <scroll-view scroll-x class="act-scroll" :show-scrollbar="false">
          <view class="act-row">
            <view
              v-for="act in todayActivities"
              :key="act.id"
              class="act-card"
              @click="goPage(`/pages/circles/id-checkin/index?circleId=${act.circleId}&activityId=${act.id}`)"
            >
              <view class="act-type-row">
                <text class="act-type-icon">{{ act.type === 'checkin' ? '📖' : act.type === 'homework' ? '🏆' : '💬' }}</text>
                <view class="act-type-badge" :class="act.type">{{ typeLabel(act.type) }}</view>
              </view>
              <text class="act-title">{{ act.title }}</text>
              <view class="act-footer">
                <text class="act-participants">{{ act.participants }}人参与</text>
                <text class="act-reward">{{ act.reward }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 分类 -->
      <scroll-view scroll-x class="cat-scroll" :show-scrollbar="false">
        <view class="cat-row">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="cat-chip"
            :class="{ active: activeCat === cat.id }"
            @click="activeCat = cat.id; fetchCircles()"
          >
            {{ cat.name }}
          </view>
        </view>
      </scroll-view>

      <!-- 排行入口 -->
      <view v-if="ranking.length" class="rank-entry" @click="goPage('/pages/circles/ranking/index')">
        <view class="rank-title-row">
          <text class="rank-icon">👑</text>
          <text class="rank-title">热门圈子排行</text>
          <text class="rank-arrow">›</text>
        </view>
        <scroll-view scroll-x class="rank-scroll" :show-scrollbar="false">
          <view class="rank-row">
            <view v-for="(c, i) in ranking.slice(0, 5)" :key="c.id" class="rank-chip">
              <text class="rank-num">{{ i + 1 }}</text>
              <text class="rank-name">{{ c.name }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- Loading -->
      <view v-if="loading" class="load-area">
        <LoadingSkeleton v-for="i in 4" :key="i" type="card" />
      </view>

      <!-- 圈子网格 -->
      <view v-else class="circle-grid">
        <view
          v-for="c in circles"
          :key="c.id"
          class="circle-card"
          @click="goPage(`/pages/circles/id-home/index?id=${c.id}`)"
        >
          <view class="cc-cover">
            <image v-if="c.cover" :src="c.cover" class="cc-cover-img" mode="aspectFill" />
            <view v-else class="cc-cover-plain">🏠</view>
            <view v-if="c.rank && c.rank <= 3" class="cc-rank">{{ c.rank }}</view>
            <view v-if="c.todayActive" class="cc-active">🔥 {{ c.todayActive }}</view>
          </view>
          <text class="cc-name">{{ c.name }}</text>
          <text class="cc-desc">{{ c.description }}</text>
          <view class="cc-meta">
            <text>{{ fmtN(c.members || 0) }} 成员</text>
            <text>{{ c.posts || 0 }} 帖</text>
          </view>
          <view v-if="c.isJoined" class="cc-joined">已加入</view>
          <view v-else class="cc-join" @click.stop="joinCircle(c.id)">加入</view>
        </view>
      </view>
    </view>

    <!-- 动态Tab -->
    <view v-else-if="activeTab === 'feed'">
      <view v-if="myCircles.length === 0" class="feed-empty">
        <text class="feed-empty-icon">👥</text>
        <text class="feed-empty-text">还没有加入任何圈子</text>
        <text class="feed-empty-sub">加入圈子后，这里会显示最新动态</text>
        <text class="feed-empty-btn" @click="activeTab = 'discover'">去发现圈子</text>
      </view>
      <view v-else class="feed-list">
        <view v-for="post in feedPosts" :key="post.id" class="post-card" @click="goPage(`/pages/circles/id-posts/index?circleId=${post.circleId}&postId=${post.id}`)">
          <view class="post-header">
            <text class="post-circle">#{{ post.circleName }}</text>
            <text v-if="post.isPinned" class="post-pinned">置顶</text>
            <text class="post-time">{{ post.time }}</text>
          </view>
          <view class="post-author-row">
            <image v-if="post.authorAvatar" :src="post.authorAvatar" class="post-avatar" mode="aspectFill" />
            <view v-else class="post-avatar-plain">{{ post.author?.charAt(0) }}</view>
            <text class="post-author">{{ post.author }}</text>
            <text v-if="post.authorTitle" class="post-author-tag">{{ post.authorTitle }}</text>
          </view>
          <text class="post-content">{{ post.content }}</text>
          <view v-if="post.images?.length" class="post-images" :class="post.images.length === 1 ? 'single' : 'grid'">
            <image v-for="(img, idx) in post.images.slice(0, 4)" :key="idx" :src="img" class="post-img" mode="aspectFill" />
          </view>
          <view class="post-actions">
            <text class="post-action">💬 {{ post.comments || 0 }}</text>
            <text class="post-action">❤ {{ post.likes || 0 }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 我的Tab -->
    <view v-else class="mine-tab">
      <view class="mine-stats">
        <view class="mine-stat">
          <text class="mine-stat-num">{{ myCircles.length }}</text>
          <text class="mine-stat-label">已加入</text>
        </view>
        <view class="mine-stat">
          <text class="mine-stat-num">{{ myPostCount }}</text>
          <text class="mine-stat-label">发帖数</text>
        </view>
        <view class="mine-stat">
          <text class="mine-stat-num">{{ myLikeCount }}</text>
          <text class="mine-stat-label">获赞数</text>
        </view>
        <view class="mine-stat">
          <text class="mine-stat-num">Lv.{{ myLevel }}</text>
          <text class="mine-stat-label">等级</text>
        </view>
      </view>

      <view class="section-header">
        <text class="section-title">我加入的圈子</text>
        <text class="section-count">{{ myCircles.length }}个</text>
      </view>

      <view v-if="myCircles.length === 0" class="mine-empty">
        <text class="mine-empty-icon">👥</text>
        <text class="mine-empty-text">还没有加入任何圈子</text>
        <text class="mine-empty-btn" @click="activeTab = 'discover'">去发现圈子</text>
      </view>
      <view v-else class="mine-list">
        <view v-for="c in myCircles" :key="c.id" class="mine-item" @click="goPage(`/pages/circles/id-home/index?id=${c.id}`)">
          <image v-if="c.cover" :src="c.cover" class="mine-cover" mode="aspectFill" />
          <view v-else class="mine-cover-plain">🏠</view>
          <view class="mine-info">
            <text class="mine-name">{{ c.name }}</text>
            <text class="mine-sub">{{ c.members }}成员 · {{ c.posts }}帖子</text>
            <text v-if="c.todayActive" class="mine-active">🔥 今日{{ c.todayActive }}条新动态</text>
          </view>
          <text class="mine-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="activeTab === 'discover' && !loading && circles.length === 0" class="empty">
      <text class="empty-icon">👥</text>
      <text class="empty-text">暂无相关圈子</text>
    </view>

    <!-- 创建圈子浮按钮 -->
    <view class="create-fab" @click="goPage('/pages/circles/create/index')">
      <text class="fab-icon">＋</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { circleApi } from '../../api'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

const mainTabs = [
  { id: 'discover', label: '发现' },
  { id: 'feed', label: '动态' },
  { id: 'mine', label: '我的' },
]

const categories = [
  { id: '', name: '推荐' },
  { id: 'bazi', name: '八字命理' },
  { id: 'ziwei', name: '紫微斗数' },
  { id: 'fengshui', name: '风水堪舆' },
  { id: 'yijing', name: '易经' },
  { id: 'liuyao', name: '六爻' },
  { id: 'qimen', name: '奇门遁甲' },
  { id: 'yangsheng', name: '养生' },
]

interface CircleItem {
  id: string; name: string; cover?: string; description?: string
  members: number; posts: number; isJoined?: boolean
  todayActive?: number; rank?: number; category?: string
}

interface ActivityItem {
  id: string; type: string; title: string; participants: number
  deadline: string; reward: string; circleId: string
}

interface FeedPost {
  id: string; circleId: string; circleName: string; author: string
  authorAvatar?: string; authorTitle?: string
  content: string; images: string[]; likes: number; comments: number
  time: string; isPinned?: boolean
}

const activeTab = ref<'discover' | 'feed' | 'mine'>('discover')
const activeCat = ref('')
const loading = ref(true)
const circles = ref<CircleItem[]>([])
const myCircles = ref<CircleItem[]>([])
const ranking = ref<CircleItem[]>([])
const upcomingLives = ref<any[]>([])
const todayActivities = ref<ActivityItem[]>([])
const feedPosts = ref<FeedPost[]>([])
const myPostCount = ref(0)
const myLikeCount = ref(0)
const myLevel = ref(1)

function fmtN(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function typeLabel(type: string) {
  const map: Record<string, string> = { checkin: '打卡', homework: '作业', qa: '问答' }
  return map[type] || type
}

async function fetchCircles() {
  loading.value = true
  try {
    const params: Record<string, any> = {}
    if (activeCat.value) params.category = activeCat.value
    const data = await circleApi.list(params) as any
    const list = Array.isArray(data) ? data : (data?.circles || data?.data || [])
    circles.value = list.map((c: any) => ({
      id: c.id, name: c.name, cover: c.cover,
      description: c.description || c.intro,
      members: c.members || c.memberCount || 0,
      posts: c.posts || c.postCount || 0,
      isJoined: c.isJoined,
      todayActive: c.todayActive,
      rank: c.rank,
    }))
  } catch { /* keep empty */ }
  finally { loading.value = false }
}

async function fetchMy() {
  try {
    const data = await circleApi.my() as any
    const list = Array.isArray(data) ? data : (data?.circles || data?.data || [])
    myCircles.value = list.map((c: any) => ({
      id: c.id, name: c.name, cover: c.cover,
      description: c.description,
      members: c.members || c.memberCount || 0,
      posts: c.posts || c.postCount || 0,
      isJoined: true,
      todayActive: c.todayActive,
    }))
    myPostCount.value = data?.postCount || data?.myPostCount || 0
    myLikeCount.value = data?.likeCount || data?.myLikeCount || 0
    myLevel.value = data?.level || 1
  } catch { /* keep empty */ }
}

async function fetchRanking() {
  try {
    const data = await circleApi.getRanking() as any
    const list = Array.isArray(data) ? data : (data?.ranking || data?.data || [])
    ranking.value = list.slice(0, 5).map((c: any, i: number) => ({
      id: c.id, name: c.name, rank: i + 1,
    }))
  } catch { /* keep empty */ }
}

async function joinCircle(id: string) {
  try {
    await circleApi.join(id) as any
    circles.value = circles.value.map(c => c.id === id ? { ...c, isJoined: true, members: c.members + 1 } : c)
    fetchMy()
  } catch { /* skip */ }
}

function goPage(url: string) { uni.navigateTo({ url }) }

onMounted(() => {
  fetchCircles()
  fetchMy()
  fetchRanking()
})

onPullDownRefresh(() => {
  Promise.all([fetchCircles(), fetchMy(), fetchRanking()])
    .finally(() => setTimeout(() => uni.stopPullDownRefresh(), 500))
})
</script>

<style scoped>
.circles-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 160rpx; }

.header-sticky {
  position: sticky; top: 0; z-index: 40;
  background: rgba(255,255,255,0.95); backdrop-filter: blur(12rpx);
  box-shadow: 0 1px 0 rgba(0,0,0,0.05);
}
.header-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 24rpx; height: 88rpx;
}
.header-title { font-size: 38rpx; font-weight: 700; color: #2C2C2C; }
.header-actions { display: flex; gap: 8rpx; }
.header-btn {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  background: #F5F0E8; display: flex; align-items: center; justify-content: center;
  font-size: 32rpx;
}
.main-tabs { display: flex; border-bottom: 1px solid #E8E3DB; }
.main-tab {
  flex: 1; text-align: center; padding: 20rpx 0; font-size: 26rpx;
  color: #999; position: relative;
}
.main-tab.active { color: #C41E3A; font-weight: 600; }
.main-tab.active::after {
  content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 48rpx; height: 4rpx; background: #C41E3A; border-radius: 2rpx;
}

/* 直播预告 */
.live-banner {
  margin: 24rpx; padding: 24rpx; border-radius: 20rpx;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  position: relative; overflow: hidden;
}
.live-banner-tag {
  position: absolute; top: 16rpx; right: 16rpx;
  padding: 4rpx 16rpx; border-radius: 16rpx;
  background: #C41E3A; color: #fff; font-size: 20rpx;
}
.live-banner-body { display: flex; align-items: center; gap: 16rpx; }
.lb-avatar, .lb-avatar-plain {
  width: 96rpx; height: 96rpx; border-radius: 50%; border: 3rpx solid rgba(255,255,255,0.2);
}
.lb-avatar-plain { background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 40rpx; color: #fff; }
.lb-info { flex: 1; min-width: 0; }
.lb-title { font-size: 28rpx; font-weight: 500; color: #fff; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lb-sub { font-size: 22rpx; color: rgba(255,255,255,0.6); display: block; margin-top: 4rpx; }
.lb-time { font-size: 22rpx; color: #FFD700; display: block; margin-top: 4rpx; }
.lb-book { padding: 12rpx 28rpx; border-radius: 40rpx; background: #C41E3A; color: #fff; font-size: 22rpx; }

/* 区块 */
.section { padding: 24rpx; }
.section-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16rpx;
}
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.section-more { font-size: 22rpx; color: #C9A96E; }
.section-count { font-size: 22rpx; color: #999; }

/* 今日活动 */
.act-scroll { white-space: nowrap; }
.act-row { display: flex; gap: 16rpx; padding: 0 24rpx; }
.act-card {
  flex-shrink: 0; width: 360rpx; padding: 20rpx;
  background: #fff; border-radius: 16rpx; border: 1px solid #F5F0E8;
}
.act-type-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 12rpx; }
.act-type-icon { font-size: 28rpx; }
.act-type-badge { font-size: 18rpx; padding: 2rpx 12rpx; border-radius: 8rpx; }
.act-type-badge.checkin { background: rgba(82,196,26,0.1); color: #52C41A; }
.act-type-badge.homework { background: rgba(196,30,58,0.1); color: #C41E3A; }
.act-type-badge.qa { background: rgba(24,144,255,0.1); color: #1890FF; }
.act-title { font-size: 26rpx; font-weight: 500; color: #333; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; }
.act-footer { display: flex; justify-content: space-between; margin-top: 16rpx; padding-top: 16rpx; border-top: 1px solid #F5F0E8; }
.act-participants { font-size: 20rpx; color: #999; }
.act-reward { font-size: 20rpx; color: #FF6B35; }

/* 分类 */
.cat-scroll { padding: 12rpx 0; white-space: nowrap; }
.cat-row { display: flex; gap: 12rpx; padding: 0 24rpx; }
.cat-chip {
  flex-shrink: 0; padding: 8rpx 22rpx; border-radius: 32rpx;
  font-size: 24rpx; color: #666; background: #fff; border: 1px solid #E8E3DB;
}
.cat-chip.active { background: #C41E3A; color: #fff; border-color: #C41E3A; }

/* 排行 */
.rank-entry {
  margin: 20rpx 24rpx; padding: 24rpx;
  background: linear-gradient(135deg, #FFF9E6, #FFF5F5);
  border-radius: 20rpx; border: 1px solid #F5E6D3;
}
.rank-title-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 16rpx; }
.rank-icon { font-size: 32rpx; }
.rank-title { flex: 1; font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.rank-arrow { font-size: 32rpx; color: #999; }
.rank-scroll { white-space: nowrap; }
.rank-row { display: flex; gap: 10rpx; }
.rank-chip {
  display: flex; align-items: center; gap: 6rpx;
  padding: 6rpx 20rpx 6rpx 8rpx; background: #fff; border-radius: 40rpx;
}
.rank-num {
  width: 36rpx; height: 36rpx; border-radius: 50%;
  background: #999; color: #fff; font-size: 20rpx; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.rank-name { font-size: 22rpx; color: #2C2C2C; }

/* 圈子网格 */
.circle-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; padding: 16rpx 24rpx; }
.circle-card {
  background: #fff; border-radius: 16rpx; overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); position: relative;
}
.cc-cover { position: relative; aspect-ratio: 4/3; }
.cc-cover-img { width: 100%; height: 100%; display: block; }
.cc-cover-plain {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #F5F0E8, #EDE5D5); font-size: 48rpx;
}
.cc-rank {
  position: absolute; top: 8rpx; left: 8rpx;
  width: 40rpx; height: 40rpx; border-radius: 50%;
  background: linear-gradient(135deg, #FFD700, #FF9500); color: #fff;
  font-size: 20rpx; font-weight: 700; display: flex; align-items: center; justify-content: center;
}
.cc-active {
  position: absolute; top: 8rpx; right: 8rpx;
  padding: 2rpx 12rpx; border-radius: 12rpx;
  background: rgba(196,30,58,0.9); color: #fff; font-size: 18rpx;
}
.cc-name { font-size: 26rpx; font-weight: 600; color: #333; padding: 12rpx 12rpx 0; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc-desc { font-size: 20rpx; color: #999; padding: 4rpx 12rpx; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc-meta { display: flex; gap: 16rpx; padding: 8rpx 12rpx; font-size: 20rpx; color: #666; }
.cc-joined {
  text-align: center; padding: 8rpx 0; font-size: 20rpx; color: #999;
  background: #F5F0E8;
}
.cc-join {
  text-align: center; padding: 8rpx 0; font-size: 20rpx; color: #fff;
  background: #C41E3A;
}

/* 动态 */
.feed-empty, .mine-empty {
  display: flex; flex-direction: column; align-items: center; padding: 120rpx 24rpx;
}
.feed-empty-icon, .mine-empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.feed-empty-text, .mine-empty-text { font-size: 28rpx; color: #999; margin-bottom: 8rpx; }
.feed-empty-sub { font-size: 22rpx; color: #BBB; margin-bottom: 24rpx; }
.feed-empty-btn, .mine-empty-btn {
  padding: 16rpx 40rpx; border-radius: 40rpx;
  background: #C41E3A; color: #fff; font-size: 26rpx;
}

.feed-list { padding: 24rpx; }
.post-card {
  background: #fff; border-radius: 20rpx; overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05); margin-bottom: 24rpx;
}
.post-header {
  display: flex; align-items: center; gap: 12rpx;
  padding: 20rpx 24rpx 0; border-bottom: 1px solid #F5F0E8; padding-bottom: 16rpx;
}
.post-circle { font-size: 22rpx; color: #C41E3A; font-weight: 500; }
.post-pinned { font-size: 18rpx; color: #C41E3A; background: #FFF0F0; padding: 2rpx 8rpx; border-radius: 4rpx; }
.post-time { font-size: 20rpx; color: #BBB; margin-left: auto; }

.post-author-row { display: flex; align-items: center; gap: 10rpx; padding: 16rpx 24rpx; }
.post-avatar, .post-avatar-plain { width: 64rpx; height: 64rpx; border-radius: 50%; }
.post-avatar-plain { background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #666; }
.post-author { font-size: 26rpx; font-weight: 500; color: #333; }
.post-author-tag { font-size: 18rpx; color: #C9A96E; background: rgba(201,169,110,0.1); padding: 2rpx 10rpx; border-radius: 6rpx; }

.post-content {
  font-size: 26rpx; color: #333; line-height: 1.6; padding: 0 24rpx;
  display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;
}
.post-images { padding: 12rpx 24rpx; gap: 8rpx; }
.post-images.single { }
.post-images.grid { display: grid; grid-template-columns: repeat(2, 1fr); }
.post-img { width: 100%; border-radius: 12rpx; }
.post-images.single .post-img { max-height: 360rpx; }

.post-actions { display: flex; gap: 40rpx; padding: 16rpx 24rpx; border-top: 1px solid #F5F0E8; }
.post-action { font-size: 22rpx; color: #666; }

/* 我的 */
.mine-tab { padding: 24rpx; }
.mine-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx;
  padding: 28rpx; margin-bottom: 24rpx;
  background: linear-gradient(135deg, #C41E3A, #A01530);
  border-radius: 20rpx;
}
.mine-stat { text-align: center; }
.mine-stat-num { font-size: 36rpx; font-weight: 700; color: #fff; display: block; }
.mine-stat-label { font-size: 20rpx; color: rgba(255,255,255,0.7); display: block; margin-top: 4rpx; }

.mine-list { }
.mine-item {
  display: flex; align-items: center; gap: 16rpx;
  padding: 20rpx; background: #fff; border-radius: 16rpx;
  margin-bottom: 12rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.mine-cover, .mine-cover-plain {
  width: 100rpx; height: 100rpx; border-radius: 16rpx; flex-shrink: 0;
}
.mine-cover-plain {
  background: linear-gradient(135deg, #F5F0E8, #EDE5D5);
  display: flex; align-items: center; justify-content: center; font-size: 44rpx;
}
.mine-info { flex: 1; min-width: 0; }
.mine-name { font-size: 26rpx; font-weight: 500; color: #333; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mine-sub { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.mine-active { font-size: 20rpx; color: #FF6B35; display: block; margin-top: 4rpx; }
.mine-arrow { font-size: 36rpx; color: #CCC; }

/* 浮动创建 */
.create-fab {
  position: fixed; right: 32rpx; bottom: 160rpx;
  width: 96rpx; height: 96rpx; border-radius: 50%;
  background: linear-gradient(135deg, #C41E3A, #A01530);
  box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 50;
}
.fab-icon { font-size: 48rpx; color: #fff; font-weight: 300; line-height: 1; }

.load-area { padding: 24rpx; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 24rpx; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
