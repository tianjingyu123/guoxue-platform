<template>
  <view class="page">
    <!-- 封面区域 -->
    <view class="cover">
      <image class="cover-img" :src="room.cover" mode="aspectFill" />
      <view class="cover-mask" />

      <!-- 顶部导航 -->
      <view class="cover-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="nav-back" @tap="goBack">
          <AppIcon name="chevron-left" :size="40" color="#fff" />
        </view>
      </view>

      <!-- 直播已结束标识 -->
      <view class="end-badge">
        <view class="end-badge-inner">
          <view class="end-icon">
            <AppIcon name="radio" :size="48" color="#fff" />
          </view>
          <text class="end-title">直播已结束</text>
          <text class="end-duration">时长 {{ formatDuration(room.stats.duration) }}</text>
        </view>
      </view>

      <!-- 底部信息 -->
      <view class="cover-info">
        <text class="cover-title">{{ room.title }}</text>
        <view class="cover-tags">
          <text v-for="tag in room.tags" :key="tag" class="cover-tag">{{ tag }}</text>
        </view>
      </view>
    </view>

    <!-- 主播信息 -->
    <view class="host-card">
      <view class="host-left">
        <image class="host-avatar" :src="room.hostAvatar" mode="aspectFill" />
        <view class="host-meta">
          <text class="host-name">{{ room.hostName }}</text>
          <text class="host-fans">{{ formatNumber(room.hostFollowers) }} 粉丝</text>
        </view>
      </view>
      <view class="follow-btn" :class="{ followed: isFollowing }" @tap="isFollowing = !isFollowing">
        <AppIcon :name="isFollowing ? 'check' : 'user-plus'" :size="32" :color="isFollowing ? '#999999' : '#fff'" />
        <text class="follow-txt">{{ isFollowing ? '已关注' : '关注' }}</text>
      </view>
    </view>

    <!-- 直播数据统计 -->
    <view class="card">
      <text class="card-title">直播数据</text>
      <view class="stats-grid">
        <view class="stat-item">
          <AppIcon name="eye" :size="40" color="#C41E3A" />
          <text class="stat-num">{{ formatNumber(room.stats.totalViewers) }}</text>
          <text class="stat-label">总观看</text>
        </view>
        <view class="stat-item">
          <AppIcon name="users" :size="40" color="#C9A96E" />
          <text class="stat-num">{{ formatNumber(room.stats.peakViewers) }}</text>
          <text class="stat-label">峰值在线</text>
        </view>
        <view class="stat-item">
          <AppIcon name="heart" :size="40" color="#ec4899" />
          <text class="stat-num">{{ formatNumber(room.stats.totalLikes) }}</text>
          <text class="stat-label">总点赞</text>
        </view>
        <view class="stat-item">
          <AppIcon name="gift" :size="40" color="#f97316" />
          <text class="stat-num">{{ formatNumber(room.stats.totalGifts) }}</text>
          <text class="stat-label">礼物收入</text>
        </view>
      </view>
    </view>

    <!-- 讲师其他直播 -->
    <view class="card">
      <view class="card-head">
        <text class="card-title">讲师其他直播</text>
        <view class="card-more">
          <text class="more-txt">查看全部</text>
          <AppIcon name="chevron-right" :size="32" color="#999999" />
        </view>
      </view>
      <view class="live-list">
        <view v-for="live in recommendLives" :key="live.id" class="live-item">
          <view class="live-cover">
            <image class="live-cover-img" :src="live.cover" mode="aspectFill" />
            <view v-if="live.status === 'live'" class="live-tag live-tag-live">
              <view class="live-dot" />
              <text class="live-tag-txt">直播中</text>
            </view>
            <view v-else class="live-tag live-tag-preview">
              <text class="live-tag-txt">预告</text>
            </view>
          </view>
          <view class="live-meta">
            <text class="live-title">{{ live.title }}</text>
            <text class="live-stat">{{ live.status === 'live' ? formatNumber(live.viewers) + ' 观看' : live.bookedCount + ' 人预约' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 相关课程推荐 -->
    <view class="card">
      <view class="card-head">
        <text class="card-title">相关课程推荐</text>
        <view class="card-more">
          <text class="more-txt">查看更多</text>
          <AppIcon name="chevron-right" :size="32" color="#999999" />
        </view>
      </view>
      <view class="course-grid">
        <view v-for="course in recommendCourses" :key="course.id" class="course-item">
          <image class="course-cover" :src="course.cover" mode="aspectFill" />
          <view class="course-meta">
            <text class="course-title">{{ course.title }}</text>
            <view class="course-foot">
              <text class="course-price">¥{{ course.price }}</text>
              <text class="course-lessons">{{ course.lessons }}课时</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部固定按钮 -->
    <view class="bottom-bar" :style="{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16rpx)' }">
      <view class="bottom-btn bottom-btn-outline">
        <text class="bottom-btn-txt-outline">进入讲师圈子</text>
      </view>
      <view v-if="room.hasReplay" class="bottom-btn bottom-btn-primary">
        <AppIcon name="play" :size="32" color="#fff" />
        <text class="bottom-btn-txt-primary">查看回放</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { liveEndRoom, liveEndRecommendLives, liveEndRecommendCourses } from '@/lib/live-data'

const statusBarHeight = ref(0)

// UI 临时状态
const room = ref(liveEndRoom)
const recommendLives = ref(liveEndRecommendLives)
const recommendCourses = ref(liveEndRecommendCourses)
const isFollowing = ref(false)

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}小时${mins}分钟`
  return `${mins}分钟`
}
function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return String(num)
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 192rpx;
}

/* 封面区域 */
.cover {
  position: relative;
  height: 512rpx;
}
.cover-img {
  width: 100%;
  height: 100%;
}
.cover-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent, rgba(0, 0, 0, 0.7));
}
.cover-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 32rpx;
}
.nav-back {
  width: 64rpx;
  height: 64rpx;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.end-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.end-badge-inner {
  background: rgba(0, 0, 0, 0.6);
  border-radius: 32rpx;
  padding: 32rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.end-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}
.end-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}
.end-duration {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 8rpx;
}
.cover-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32rpx;
}
.cover-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cover-tags {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}
.cover-tag {
  padding: 4rpx 16rpx;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 22rpx;
  border-radius: 999rpx;
}

/* 主播信息 */
.host-card {
  margin: -48rpx 32rpx 0;
  position: relative;
  z-index: 10;
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.host-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
  flex: 1;
}
.host-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #eee;
  flex-shrink: 0;
}
.host-meta {
  display: flex;
  flex-direction: column;
}
.host-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.host-fans {
  font-size: 26rpx;
  color: #999999;
  margin-top: 4rpx;
}
.follow-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 32rpx;
  background: #C41E3A;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.follow-btn.followed {
  background: #FAF8F5;
}
.follow-txt {
  font-size: 26rpx;
  font-weight: 500;
  color: #fff;
}
.follow-btn.followed .follow-txt {
  color: #999999;
}

/* 卡片通用 */
.card {
  margin: 32rpx 32rpx 0;
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.card-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.card-more {
  display: flex;
  align-items: center;
}
.more-txt {
  font-size: 26rpx;
  color: #999999;
}

/* 统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  margin-top: 32rpx;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 8rpx;
  background: #FAF8F5;
  border-radius: 24rpx;
}
.stat-num {
  font-size: 34rpx;
  font-weight: 700;
  color: #2C2C2C;
  margin-top: 8rpx;
}
.stat-label {
  font-size: 22rpx;
  color: #999999;
  margin-top: 4rpx;
}

/* 讲师其他直播 */
.live-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.live-item {
  display: flex;
  gap: 24rpx;
}
.live-cover {
  position: relative;
  width: 192rpx;
  height: 128rpx;
  flex-shrink: 0;
}
.live-cover-img {
  width: 100%;
  height: 100%;
  border-radius: 16rpx;
  background: #eee;
}
.live-tag {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.live-tag-live {
  background: #C41E3A;
}
.live-tag-preview {
  background: #C9A96E;
}
.live-dot {
  width: 12rpx;
  height: 12rpx;
  background: #fff;
  border-radius: 50%;
}
.live-tag-txt {
  font-size: 20rpx;
  color: #fff;
}
.live-meta {
  flex: 1;
  min-width: 0;
}
.live-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #2C2C2C;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.live-stat {
  font-size: 22rpx;
  color: #999999;
  margin-top: 8rpx;
}

/* 课程推荐 */
.course-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}
.course-item {
  background: #FAF8F5;
  border-radius: 24rpx;
  overflow: hidden;
}
.course-cover {
  width: 100%;
  height: 180rpx;
  background: #eee;
}
.course-meta {
  padding: 24rpx;
}
.course-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #2C2C2C;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.course-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.course-price {
  font-size: 28rpx;
  font-weight: 700;
  color: #C41E3A;
}
.course-lessons {
  font-size: 22rpx;
  color: #999999;
}

/* 底部固定按钮 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1rpx solid #E8E3DB;
  padding: 16rpx 32rpx;
  display: flex;
  gap: 24rpx;
}
.bottom-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.bottom-btn-outline {
  border: 1rpx solid #E8E3DB;
}
.bottom-btn-txt-outline {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.bottom-btn-primary {
  background: #C41E3A;
}
.bottom-btn-txt-primary {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}
</style>
