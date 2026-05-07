<template>
  <view class="page">
    <!-- 视频播放 -->
    <video
      v-if="video?.videoUrl"
      :src="video.videoUrl"
      class="player"
      :autoplay="true"
      :loop="true"
      :muted="false"
      object-fit="contain"
      :show-center-play-btn="false"
      :enable-progress-gesture="false"
      @error="onError"
      @click="togglePlay"
    />

    <!-- 暂停遮罩 -->
    <view v-if="paused && video?.videoUrl" class="pause-overlay" @click="togglePlay">
      <text class="play-icon">▶</text>
    </view>

    <!-- 无视频时显示封面 -->
    <image
      v-else-if="video"
      :src="video.coverUrl || video.cover"
      class="cover-img"
      mode="aspectFill"
    />

    <!-- 右侧操作栏 -->
    <view class="right-bar">
      <view class="r-action" @click="toggleLike">
        <text class="r-icon" :class="{ liked: isLiked }">{{ isLiked ? '❤️' : '🤍' }}</text>
        <text class="r-count">{{ formatCount(displayLikeCount) }}</text>
      </view>
      <view class="r-action" @click="showComments = true">
        <text class="r-icon">💬</text>
        <text class="r-count">{{ formatCount(video?.commentCount || 0) }}</text>
      </view>
      <view class="r-action" @click="collectVideo">
        <text class="r-icon">{{ isCollected ? '⭐' : '☆' }}</text>
        <text class="r-count">收藏</text>
      </view>
      <view class="r-action" @click="shareVideo">
        <text class="r-icon">↗</text>
        <text class="r-count">分享</text>
      </view>
      <!-- 作者头像+关注 -->
      <view class="r-action" @click="followAuthor">
        <image
          v-if="video?.author?.avatar"
          :src="video.author.avatar"
          class="r-avatar"
          :class="{ following: isFollowing }"
          mode="aspectFill"
        />
        <view v-else class="r-avatar-placeholder" />
        <view class="follow-badge" v-if="!isFollowing">+</view>
      </view>

      <!-- 音乐碟片 -->
      <view class="music-disc" v-if="video?.title">
        <image
          v-if="video.author?.avatar"
          :src="video.author.avatar"
          class="disc-img spinning"
          mode="aspectFill"
        />
        <view class="disc-center" />
      </view>
    </view>

    <!-- 底部信息区 -->
    <view class="bottom-info">
      <view class="author-row">
        <text class="author-name">@{{ video?.author?.nickname || '国学创作者' }}</text>
        <text class="follow-text" v-if="!isFollowing" @click="followAuthor">关注</text>
      </view>
      <text class="desc-text">{{ video?.title }}</text>
      <text v-if="video?.description" class="desc-sub">{{ video.description }}</text>

      <!-- 关联商品 -->
      <view v-if="video?.products?.length" class="product-entry" @click="showProducts = true">
        <text class="pe-text">🛒 相关好物 · 点击查看</text>
      </view>
    </view>

    <!-- 进度条 -->
    <view class="progress-bar" v-if="video?.videoUrl">
      <view class="progress-fill" :style="{ width: progress + '%' }" />
    </view>

    <!-- 评论面板 -->
    <view v-if="showComments" class="comment-mask" @click="showComments = false">
      <view class="comment-panel" @click.stop="">
        <view class="cp-header">
          <text class="cp-title">评论 ({{ mockComments.length }})</text>
          <text class="cp-close" @click="showComments = false">✕</text>
        </view>
        <scroll-view scroll-y class="cp-list">
          <view v-for="(c, i) in mockComments" :key="i" class="cp-item">
            <text class="cp-user">{{ c.user }}：</text>
            <text class="cp-text">{{ c.text }}</text>
            <text class="cp-time">{{ c.time }}</text>
          </view>
        </scroll-view>
        <view class="cp-input-row">
          <input
            v-model="commentText"
            class="cp-input"
            placeholder="发条评论..."
            @confirm="submitComment"
          />
          <text class="cp-send" @click="submitComment">发送</text>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="!video" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { videoApi } from '../../api'

const video = ref<any>(null)
const showComments = ref(false)
const showProducts = ref(false)
const paused = ref(false)
const isLiked = ref(false)
const isCollected = ref(false)
const isFollowing = ref(false)
const displayLikeCount = ref(0)
const progress = ref(0)
const commentText = ref('')
const mockComments = ref<{ user: string; text: string; time: string }[]>([])

let progressTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  const pages = getCurrentPages()
  const id = (pages[pages.length - 1] as any)?.options?.id
  if (id) {
    try {
      video.value = await videoApi.detail(id)
      displayLikeCount.value = video.value?.likeCount || 0
      // mock 评论
      if (video.value?.comments?.length) {
        mockComments.value = video.value.comments
      } else {
        mockComments.value = [
          { user: '国学爱好者', text: '讲得真好，受教了！', time: '2分钟前' },
          { user: '清风明月', text: '传统文化永不过时', time: '15分钟前' },
          { user: '书生意气', text: '能再多讲讲这个主题吗？', time: '1小时前' },
        ]
      }
      // 启动假进度条
      if (video.value?.videoUrl) {
        startProgress()
      }
    } catch {
      video.value = null
    }
  }
})

onUnmounted(() => {
  if (progressTimer) clearInterval(progressTimer)
})

function startProgress() {
  progressTimer = setInterval(() => {
    if (!paused.value && progress.value < 95) {
      progress.value += 1
    }
  }, 600) as any
}

function togglePlay() {
  paused.value = !paused.value
}

function toggleLike() {
  isLiked.value = !isLiked.value
  displayLikeCount.value += isLiked.value ? 1 : -1
  if (isLiked.value) {
    videoApi.like(video.value.id).catch(() => {})
  }
}

function collectVideo() {
  isCollected.value = !isCollected.value
  uni.showToast({ title: isCollected.value ? '已收藏' : '已取消收藏', icon: 'none' })
}

function shareVideo() {
  uni.showToast({ title: '已复制分享链接', icon: 'success' })
}

function followAuthor() {
  isFollowing.value = !isFollowing.value
  uni.showToast({ title: isFollowing.value ? '已关注' : '已取消关注', icon: 'none' })
}

function submitComment() {
  const text = commentText.value.trim()
  if (!text) return
  mockComments.value.unshift({ user: '我', text, time: '刚刚' })
  commentText.value = ''
}

function onError(e: any) {
  console.error('视频播放错误:', e)
  uni.showToast({ title: '播放失败', icon: 'none' })
}

function formatCount(n: number | undefined): string {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}
</script>

<style>
.page {
  background: #000;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

/* ===== 播放器 ===== */
.player {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}
.cover-img {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}

/* 暂停遮罩 */
.pause-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}
.play-icon {
  font-size: 52px;
  color: rgba(255,255,255,0.7);
}

/* ===== 右侧操作栏 ===== */
.right-bar {
  position: absolute;
  right: 10px;
  bottom: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  z-index: 10;
}
.r-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.r-icon {
  font-size: 30px;
  color: #fff;
  text-shadow: 0 0 4px rgba(0,0,0,0.5);
  transition: transform 0.15s;
}
.r-icon.liked {
  animation: likeBounce 0.3s ease;
}
@keyframes likeBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
.r-count {
  font-size: 11px;
  color: #fff;
  text-shadow: 0 0 2px rgba(0,0,0,0.5);
}
.r-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid #fff;
}
.r-avatar.following {
  border-color: #c4943a;
}
.r-avatar-placeholder {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  border: 2px solid #fff;
}
.follow-badge {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 20px;
  background: #e74c3c;
  color: #fff;
  border-radius: 50%;
  text-align: center;
  line-height: 18px;
  font-size: 14px;
  font-weight: bold;
}

/* 音乐碟片 */
.music-disc {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
}
.disc-img {
  width: 100%;
  height: 100%;
}
.disc-img.spinning {
  animation: spin 3s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.disc-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #000;
  border: 2px solid #333;
}

/* ===== 底部信息 ===== */
.bottom-info {
  position: absolute;
  left: 12px;
  right: 70px;
  bottom: 60px;
  z-index: 10;
}
.author-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.author-name {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 4px rgba(0,0,0,0.8);
}
.follow-text {
  font-size: 12px;
  color: #c4943a;
  border: 1px solid #c4943a;
  border-radius: 10px;
  padding: 2px 10px;
}
.desc-text {
  font-size: 14px;
  color: #eee;
  display: block;
  text-shadow: 0 0 3px rgba(0,0,0,0.7);
  line-height: 1.5;
}
.desc-sub {
  font-size: 12px;
  color: #ccc;
  display: block;
  margin-top: 2px;
  opacity: 0.8;
}
.product-entry {
  margin-top: 8px;
  background: linear-gradient(90deg, #8b4513, #c4943a);
  padding: 6px 14px;
  border-radius: 14px;
  align-self: flex-start;
  display: inline-block;
}
.pe-text {
  font-size: 12px;
  color: #fff;
  font-weight: bold;
}

/* 进度条 */
.progress-bar {
  position: absolute;
  bottom: 48px;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255,255,255,0.2);
  z-index: 10;
}
.progress-fill {
  height: 100%;
  background: #fff;
  transition: width 0.3s linear;
}

/* ===== 评论面板 ===== */
.comment-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.comment-panel {
  width: 100%;
  max-height: 55vh;
  background: #1a1a2e;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
}
.cp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.cp-title {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
}
.cp-close {
  font-size: 18px;
  color: rgba(255,255,255,0.5);
  padding: 4px;
}
.cp-list {
  flex: 1;
  padding: 12px 16px;
  max-height: 35vh;
}
.cp-item {
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.cp-user {
  font-size: 13px;
  color: #c4943a;
  font-weight: bold;
}
.cp-text {
  font-size: 13px;
  color: #ddd;
}
.cp-time {
  font-size: 11px;
  color: rgba(255,255,255,0.3);
  display: block;
  margin-top: 2px;
}
.cp-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(255,255,255,0.1);
}
.cp-input {
  flex: 1;
  background: rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 8px 14px;
  font-size: 13px;
  color: #fff;
}
.cp-send {
  font-size: 14px;
  color: #c4943a;
  font-weight: bold;
}

/* 加载 */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
.loading-text {
  color: rgba(255,255,255,0.5);
  font-size: 15px;
}
</style>
