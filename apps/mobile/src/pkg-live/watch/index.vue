<template>
  <view class="page">
    <app-nav-bar title="直播" background="rgba(15,15,15,0.95)" color="#ffffff" :back-size="40" />

    <view v-if="loading" class="xx-skeleton">
      <view v-for="i in 3" :key="i" class="sk-card" />
    </view>
    <app-error v-else-if="error" :desc="error" @retry="loadData" />
    <template v-else>
    <!-- 全屏视频画面区 -->
    <view class="video-bg">
      <view class="video-placeholder">
        <view class="ph-circle">
          <text class="ph-emoji">📖</text>
        </view>
        <text class="ph-text">直播画面</text>
      </view>
    </view>

    <!-- 顶部信息栏 -->
    <view class="top-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="top-inner">
        <view class="top-row">
          <!-- 主播信息胶囊 -->
          <view class="host-card">
            <view class="host-avatar-wrap">
              <image class="host-avatar" :src="room.hostAvatar" mode="aspectFill" />
              <view class="host-live-dot" />
            </view>
            <view class="host-info">
              <text class="host-name">{{ room.hostName }}</text>
              <text class="host-fans">{{ formatCount(room.followers) }} 粉丝</text>
            </view>
            <view class="follow-btn" :class="{ followed: isFollowing }" @tap="isFollowing = !isFollowing">
              <text class="follow-txt">{{ isFollowing ? '已关注' : '关注' }}</text>
            </view>
          </view>
          <!-- 右侧：在线人数 + 关闭 -->
          <view class="top-right">
            <view class="online-box">
              <AppIcon name="users" :size="14" color="rgba(255,255,255,0.8)" />
              <text class="online-count">{{ formatCount(room.viewerCount) }}</text>
            </view>
          </view>
        </view>

        <!-- 直播间标题 -->
        <view class="title-row">
          <text class="title-text">{{ room.title }}</text>
        </view>

        <!-- 合规提示 -->
        <view class="disclaimer-row">
          <Disclaimer variant="entertainment" tone="inline" />
        </view>
      </view>
    </view>

    <!-- 右上角人气榜 -->
    <view class="rank-wrap">
      <view class="rank-btn" @tap="showRank = !showRank">
        <AppIcon name="crown" :size="14" color="#fff" />
        <text class="rank-txt">榜单</text>
        <AppIcon :name="showRank ? 'chevron-up' : 'chevron-down'" :size="12" color="#fff" />
      </view>
    </view>

    <!-- 左侧弹幕区 -->
    <view class="comments">
      <view v-for="c in comments" :key="c.id" class="comment-item">
        <view v-if="c.type === 'system'" class="comment-sys">
          <text class="comment-sys-txt">{{ c.content }}</text>
        </view>
        <view v-else class="comment-row">
          <view class="comment-user-tag">
            <text class="comment-user-txt">{{ c.userName }}</text>
          </view>
          <text class="comment-content">{{ c.content }}</text>
        </view>
      </view>
    </view>

    <!-- 底部互动栏 -->
    <view class="bottom-bar" :style="{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12rpx)' }">
      <view class="bottom-row">
        <!-- 输入框 -->
        <view class="input-box">
          <text class="input-ph">说点什么...</text>
          <view class="send-btn">
            <AppIcon name="send" :size="12" color="#fff" />
          </view>
        </view>
        <!-- 点赞 -->
        <view class="act-btn" @tap="onLike">
          <AppIcon name="heart" :size="20" color="#C41E3A" :fill="true" />
        </view>
        <!-- 礼物 -->
        <view class="act-btn gift-btn">
          <AppIcon name="gift" :size="20" color="#fbbf24" />
        </view>
        <!-- 连麦 -->
        <view class="act-btn mic-btn">
          <AppIcon name="phone" :size="20" color="#60a5fa" />
        </view>
        <!-- 分享 -->
        <view class="act-btn">
          <AppIcon name="share-2" :size="20" color="#fff" />
        </view>
        <!-- 举报 -->
        <view class="act-btn">
          <AppIcon name="flag" :size="20" color="#fff" />
        </view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppError from '@/components/common/app-error.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import { liveWatchRoom, liveWatchComments } from '@/lib/live-data'

const statusBarHeight = ref(0)
const loading = ref(true)
const error = ref('')

// UI 临时状态
const room = ref(liveWatchRoom)
const comments = ref(liveWatchComments)
const isFollowing = ref(liveWatchRoom.isFollowing)
const showRank = ref(false)

function onLike() {}
function formatCount(num: number): string {
  return num >= 10000 ? (num / 10000).toFixed(1) + '万' : String(num)
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    await new Promise(r => setTimeout(r, 300))
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(() => loadData())
</script>

<style scoped>
.page {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #000;
}

/* 视频画面占位 */
.video-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, #111827, #1f2937, #111827);
}
.video-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0.3;
}
.ph-circle {
  width: 192rpx;
  height: 192rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.ph-emoji {
  font-size: 72rpx;
}
.ph-text {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.5);
}

/* 顶部信息栏 */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.4), transparent);
}
.top-inner {
  padding: 24rpx 32rpx;
}
.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.host-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 24rpx 12rpx 12rpx;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 999rpx;
}
.host-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.host-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  border: 4rpx solid #ef4444;
  background: #444;
}
.host-live-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 24rpx;
  height: 24rpx;
  background: #ef4444;
  border-radius: 50%;
  border: 4rpx solid #000;
}
.host-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.host-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
  max-width: 160rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.host-fans {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.6);
}
.follow-btn {
  height: 56rpx;
  padding: 0 24rpx;
  margin-left: 8rpx;
  background: #ef4444;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.follow-btn.followed {
  background: rgba(255, 255, 255, 0.2);
}
.follow-txt {
  font-size: 24rpx;
  color: #fff;
}
.top-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.online-box {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 999rpx;
}
.online-count {
  font-size: 24rpx;
  color: #fff;
}
.close-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 标题 */
.title-row {
  margin-top: 16rpx;
  overflow: hidden;
}
.title-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 合规提示 */
.disclaimer-row {
  margin-top: 16rpx;
}

/* 右上角榜单 */
.rank-wrap {
  position: absolute;
  top: 192rpx;
  right: 24rpx;
  z-index: 20;
}
.rank-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background: linear-gradient(to right, rgba(245, 158, 11, 0.8), rgba(249, 115, 22, 0.8));
  border-radius: 999rpx;
}
.rank-txt {
  font-size: 20rpx;
  font-weight: 500;
  color: #fff;
}

/* 弹幕区 */
.comments {
  position: absolute;
  left: 24rpx;
  right: 192rpx;
  bottom: 176rpx;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.comment-item {
  max-width: 100%;
}
.comment-sys {
  display: inline-flex;
  padding: 12rpx 24rpx;
  background: rgba(239, 68, 68, 0.3);
  border-radius: 999rpx;
  width: fit-content;
  max-width: 100%;
}
.comment-sys-txt {
  font-size: 24rpx;
  color: #fbcfe8;
}
.comment-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}
.comment-user-tag {
  flex-shrink: 0;
  padding: 8rpx 16rpx;
  background: rgba(196, 30, 58, 0.2);
  border-radius: 999rpx;
}
.comment-user-txt {
  font-size: 20rpx;
  font-weight: 500;
  color: #ff5a78;
}
.comment-content {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
}

/* 底部互动栏 */
.bottom-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  padding-top: 32rpx;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.6), transparent);
}
.bottom-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 0 24rpx 24rpx;
}
.input-box {
  width: 288rpx;
  height: 80rpx;
  padding: 0 32rpx;
  background: rgba(255, 255, 255, 0.1);
  border: 2rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.input-ph {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.5);
}
.send-btn {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.act-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.gift-btn {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(249, 115, 22, 0.3));
}
.mic-btn {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(6, 182, 212, 0.3));
}

.xx-skeleton { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; padding-top: 120rpx; }
.sk-card { height: 200rpx; border-radius: 20rpx; background: rgba(255,255,255,0.05); animation: sk-pulse 1.5s infinite; }
@keyframes sk-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
</style>
