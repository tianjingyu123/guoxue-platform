<template>
  <view class="page">
    <!-- 加载骨架 -->
    <view v-if="loading" class="state-skeleton">
      <view class="state-skeleton__player" />
      <view v-for="i in 3" :key="i" class="state-skeleton__row" />
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="state-error">
      <text class="state-error__txt">{{ error }}</text>
      <view class="state-error__retry" @tap="fetchData('1')"><text class="state-error__retry-txt">重试</text></view>
    </view>

    <template v-else>
    <!-- 播放器区域 -->
    <view class="player">
      <!-- 返回按钮 -->
      <view class="player-back" :style="{ top: statusBarHeight + 16 + 'px' }" @tap="goBack">
        <AppIcon name="arrow-left" :size="40" color="#fff" />
      </view>

      <!-- 中央播放按钮 -->
      <view class="player-center">
        <view class="play-circle" @tap="isPlaying = true">
          <AppIcon name="play" :size="64" color="#fff" :fill="true" />
        </view>
      </view>

      <!-- 回放标签 -->
      <view class="player-tag-tr" :style="{ top: statusBarHeight + 16 + 'px' }">
        <view class="tag-replay">
          <AppIcon name="clock" :size="24" color="#fff" />
          <text class="tag-replay-txt">回放</text>
        </view>
      </view>

      <!-- 当前章节 -->
      <view class="player-chapter" :style="{ top: statusBarHeight + 16 + 'px' }">
        <text class="player-chapter-txt">{{ currentChapter.title }}</text>
      </view>

      <!-- 控制栏 -->
      <view class="player-controls">
        <!-- 进度条 -->
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: '0%' }">
            <view class="progress-knob" />
          </view>
        </view>
        <!-- 控制按钮 -->
        <view class="controls-row">
          <view class="controls-left">
            <AppIcon name="play" :size="48" color="#fff" :fill="true" />
            <AppIcon name="skip-back" :size="40" color="#fff" />
            <AppIcon name="skip-forward" :size="40" color="#fff" />
            <text class="time-txt">00:00:00 / {{ replay.duration }}</text>
          </view>
          <view class="controls-right">
            <view class="ctrl-chip">
              <AppIcon name="list" :size="32" color="#fff" />
              <text class="ctrl-chip-txt">章节</text>
            </view>
            <view class="ctrl-chip">
              <text class="ctrl-chip-txt">{{ speed }}x</text>
              <AppIcon name="chevron-down" :size="24" color="#fff" />
            </view>
            <view class="ctrl-icon-btn">
              <AppIcon name="image" :size="32" color="#fff" />
            </view>
            <AppIcon name="volume-2" :size="40" color="#fff" />
            <AppIcon name="maximize" :size="40" color="#fff" />
          </view>
        </view>
      </view>
    </view>

    <!-- 回放信息 -->
    <view class="info">
      <text class="info-title">{{ replay.title }}</text>
      <view class="info-host">
        <image lazy-load class="host-avatar" :src="replay.hostAvatar" mode="aspectFill" />
        <view class="host-meta">
          <view class="host-name-row">
            <text class="host-name">{{ replay.hostName }}</text>
            <view v-if="replay.isVerified" class="host-v">
              <text class="host-v-txt">V</text>
            </view>
          </view>
          <text class="host-fans">{{ replay.hostFollowers.toLocaleString() }} 粉丝</text>
        </view>
        <view class="follow-btn">
          <text class="follow-txt">+ 关注</text>
        </view>
      </view>
      <view class="info-stats">
        <view class="stat">
          <AppIcon name="clock" :size="28" color="#999999" />
          <text class="stat-txt">{{ replay.startTime }}</text>
        </view>
        <view class="stat">
          <AppIcon name="eye" :size="28" color="#999999" />
          <text class="stat-txt">{{ replay.viewerCount.toLocaleString() }} 观看</text>
        </view>
        <view class="stat">
          <AppIcon name="heart" :size="28" color="#999999" />
          <text class="stat-txt">{{ replay.likeCount.toLocaleString() }} 点赞</text>
        </view>
      </view>
    </view>

    <!-- Tab -->
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        @tap="activeTab = tab.key"
      >
        <AppIcon :name="tab.icon" :size="32" :color="activeTab === tab.key ? '#C41E3A' : '#999999'" />
        <text class="tab-label" :class="{ 'tab-active': activeTab === tab.key }">{{ tab.label }}</text>
        <text class="tab-count" :class="{ 'tab-active': activeTab === tab.key }">({{ tab.count }})</text>
        <view v-if="activeTab === tab.key" class="tab-underline" />
      </view>
    </view>

    <!-- Tab内容 -->
    <view class="tab-content">
      <!-- 章节 -->
      <view v-if="activeTab === 'chapters'" class="chapter-list">
        <view
          v-for="ch in replay.chapters"
          :key="ch.id"
          class="chapter-item"
          :class="{ active: ch.id === currentChapter.id }"
        >
          <text class="chapter-time">{{ ch.timeDisplay }}</text>
          <view class="chapter-meta">
            <text class="chapter-title" :class="{ 'chapter-title-active': ch.id === currentChapter.id }">{{ ch.title }}</text>
            <text v-if="ch.description" class="chapter-desc">{{ ch.description }}</text>
          </view>
          <view v-if="ch.id === currentChapter.id" class="chapter-badge">
            <text class="chapter-badge-txt">当前</text>
          </view>
        </view>
      </view>

      <!-- 讨论 -->
      <view v-if="activeTab === 'discussion'" class="disc-list">
        <view v-for="d in replay.discussions" :key="d.id" class="disc-item">
          <view class="disc-time">
            <text class="disc-time-txt">{{ d.timeDisplay }}</text>
          </view>
          <view class="disc-avatar" :class="{ 'disc-avatar-host': d.isHost }">
            <text class="disc-avatar-txt" :class="{ 'disc-avatar-txt-host': d.isHost }">{{ d.userName.charAt(0) }}</text>
          </view>
          <view class="disc-body">
            <view class="disc-user-row">
              <text class="disc-user" :class="{ 'disc-user-host': d.isHost }">{{ d.userName }}</text>
              <view v-if="d.isHost" class="disc-host-badge">
                <text class="disc-host-badge-txt">主播</text>
              </view>
            </view>
            <text class="disc-content">{{ d.content }}</text>
          </view>
        </view>
      </view>

      <!-- 问答 -->
      <view v-if="activeTab === 'qa'" class="qa-list">
        <view v-for="q in replay.qaList" :key="q.id" class="qa-card">
          <view class="qa-time">
            <text class="qa-time-txt">{{ q.timeDisplay }}</text>
          </view>
          <view class="qa-body">
            <view class="qa-q-row">
              <AppIcon name="help-circle" :size="32" color="#C41E3A" />
              <text class="qa-q-hint">{{ q.questionerName }} 提问</text>
            </view>
            <text class="qa-question">{{ q.question }}</text>
            <view class="qa-answer">
              <view class="qa-a-row">
                <view class="qa-a-avatar">
                  <text class="qa-a-avatar-txt">{{ q.answererName.charAt(0) }}</text>
                </view>
                <text class="qa-a-hint">{{ q.answererName }} 回答</text>
              </view>
              <text class="qa-answer-txt">{{ q.answer }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 商品 -->
      <view v-if="activeTab === 'products'" class="prod-list">
        <view v-for="p in replay.products" :key="p.id" class="prod-card">
          <view class="prod-img">
            <AppIcon name="shopping-bag" :size="64" color="rgba(153,153,153,0.4)" />
          </view>
          <view class="prod-body">
            <text class="prod-name">{{ p.name }}</text>
            <text class="prod-jump">跳转到 {{ p.mentionTimeDisplay }}</text>
            <view class="prod-foot">
              <view class="prod-price-row">
                <text class="prod-price">{{ formatPrice(p.price) }}</text>
                <text class="prod-original">{{ formatPrice(p.originalPrice) }}</text>
              </view>
              <text class="prod-sales">{{ p.sales }}人购买</text>
            </view>
          </view>
          <view class="prod-buy">
            <text class="prod-buy-txt">购买</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar" :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }">
      <view class="bottom-act" @tap="isCollected = !isCollected">
        <AppIcon name="heart" :size="40" :color="isCollected ? '#C41E3A' : '#999999'" :fill="isCollected" />
        <text class="bottom-act-txt">收藏</text>
      </view>
      <view class="bottom-act">
        <AppIcon name="share-2" :size="40" color="#999999" />
        <text class="bottom-act-txt">分享</text>
      </view>
      <view class="bottom-main">
        <view class="bottom-cta">
          <text class="bottom-cta-txt">加入「{{ replay.circleName }}」</text>
        </view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { liveApi } from '@/lib/live-data'
import { formatPrice } from '@/utils/format'

const statusBarHeight = ref(0)

// 数据状态
const loading = ref(true)
const error = ref('')
// 模板裸访问大量回放字段，保留 any 避免收敛触发大量报错
const replay = ref<any>({})
const isPlaying = ref(false)
const speed = ref(1)
const activeTab = ref<'chapters' | 'discussion' | 'qa' | 'products'>('chapters')
const isCollected = ref(false)
// 当前章节，结构由后端返回，保留 any
const currentChapter = ref<any>({})

// 标签页配置列表，含动态 count，保留 any[]
const tabs = ref<any[]>([])

async function fetchData(replayId: string) {
  loading.value = true
  error.value = ''
  try {
    const data = await liveApi.getReplayDetail(replayId)
    replay.value = data
    currentChapter.value = data.chapters?.[0] || {}
    tabs.value = [
      { key: 'chapters' as const, label: '章节', icon: 'list', count: data.chapters?.length || 0 },
      { key: 'discussion' as const, label: '讨论', icon: 'message-circle', count: data.discussions?.length || 0 },
      { key: 'qa' as const, label: '问答', icon: 'help-circle', count: data.qaList?.length || 0 },
      { key: 'products' as const, label: '商品', icon: 'shopping-bag', count: data.products?.length || 0 },
    ]
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onLoad((opts) => {
  fetchData(opts?.id || '1')
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 128rpx;
}

/* 加载骨架 */
.state-skeleton { padding: 0; }
.state-skeleton__player { width: 100%; aspect-ratio: 16/9; background: linear-gradient(90deg, #e8e4dc 25%, #f0ece5 50%, #e8e4dc 75%); animation: shimmer 1.5s infinite; background-size: 200% 100%; }
.state-skeleton__row { height: 64rpx; margin: 16rpx 32rpx; border-radius: 12rpx; background: linear-gradient(90deg, #e8e4dc 25%, #f0ece5 50%, #e8e4dc 75%); animation: shimmer 1.5s infinite; background-size: 200% 100%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* 错误状态 */
.state-error { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 320rpx 0; }
.state-error__txt { font-size: 28rpx; color: #999; margin-bottom: 32rpx; }
.state-error__retry { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.state-error__retry-txt { font-size: 28rpx; color: #fff; font-weight: 500; }

/* 播放器 */
.player {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
}
.player-back {
  position: absolute;
  left: 32rpx;
  z-index: 20;
  width: 64rpx;
  height: 64rpx;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.player-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.play-circle {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.player-tag-tr {
  position: absolute;
  right: 32rpx;
  z-index: 10;
}
.tag-replay {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 12rpx;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 8rpx;
}
.tag-replay-txt {
  font-size: 20rpx;
  color: #fff;
}
.player-chapter {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  padding: 8rpx 24rpx;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 999rpx;
}
.player-chapter-txt {
  font-size: 20rpx;
  color: #fff;
}
.player-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
}
.progress-bar {
  height: 12rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 999rpx;
  margin-bottom: 24rpx;
  position: relative;
}
.progress-fill {
  height: 100%;
  background: var(--brand);
  border-radius: 999rpx;
  position: relative;
}
.progress-knob {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 20rpx;
  height: 20rpx;
  background: #fff;
  border-radius: 50%;
}
.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.controls-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.time-txt {
  font-size: 20rpx;
  color: #fff;
}
.controls-right {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.ctrl-chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 12rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8rpx;
}
.ctrl-chip-txt {
  font-size: 20rpx;
  color: #fff;
}
.ctrl-icon-btn {
  display: flex;
  align-items: center;
  padding: 6rpx 12rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8rpx;
}

/* 回放信息 */
.info {
  padding: 32rpx;
  border-bottom: 1rpx solid #E8E3DB;
}
.info-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #2C2C2C;
  line-height: 1.4;
}
.info-host {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 24rpx;
}
.host-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #eee;
  flex-shrink: 0;
}
.host-meta {
  flex: 1;
}
.host-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.host-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.host-v {
  padding: 0 8rpx;
  background: rgba(201, 169, 110, 0.2);
  border-radius: 6rpx;
}
.host-v-txt {
  font-size: 18rpx;
  color: #C9A96E;
}
.host-fans {
  font-size: 22rpx;
  color: #999999;
}
.follow-btn {
  padding: 12rpx 28rpx;
  border: 1rpx solid var(--brand);
  border-radius: 999rpx;
}
.follow-txt {
  font-size: 22rpx;
  font-weight: 500;
  color: var(--brand);
}
.info-stats {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-top: 24rpx;
}
.stat {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.stat-txt {
  font-size: 22rpx;
  color: #999999;
}

/* Tab */
.tabs {
  display: flex;
  border-bottom: 1rpx solid #E8E3DB;
}
.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 24rpx 0;
  position: relative;
}
.tab-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #999999;
}
.tab-count {
  font-size: 22rpx;
  color: #999999;
}
.tab-active {
  color: var(--brand);
}
.tab-underline {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  background: var(--brand);
  border-radius: 999rpx;
}

/* 章节列表 */
.chapter-list {
  display: flex;
  flex-direction: column;
}
.chapter-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  border-bottom: 1rpx solid #E8E3DB;
}
.chapter-item.active {
  background: rgba(240, 235, 229, 0.5);
}
.chapter-time {
  flex-shrink: 0;
  padding: 8rpx 16rpx;
  background: rgba(196, 30, 58, 0.1);
  color: var(--brand);
  font-size: 22rpx;
  border-radius: 8rpx;
}
.chapter-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.chapter-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.chapter-title-active {
  color: var(--brand);
}
.chapter-desc {
  font-size: 22rpx;
  color: #999999;
  margin-top: 4rpx;
}
.chapter-badge {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  background: rgba(196, 30, 58, 0.1);
  border-radius: 8rpx;
}
.chapter-badge-txt {
  font-size: 18rpx;
  color: var(--brand);
}

/* 讨论列表 */
.disc-list {
  display: flex;
  flex-direction: column;
}
.disc-item {
  display: flex;
  gap: 24rpx;
  padding: 32rpx;
  border-bottom: 1rpx solid #E8E3DB;
}
.disc-time {
  flex-shrink: 0;
  padding: 8rpx 16rpx;
  background: rgba(196, 30, 58, 0.1);
  border-radius: 8rpx;
  height: fit-content;
}
.disc-time-txt {
  font-size: 22rpx;
  color: var(--brand);
}
.disc-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #f0ebe5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.disc-avatar-host {
  background: rgba(201, 169, 110, 0.2);
}
.disc-avatar-txt {
  font-size: 24rpx;
  color: #2C2C2C;
}
.disc-avatar-txt-host {
  color: #C9A96E;
}
.disc-body {
  flex: 1;
  min-width: 0;
}
.disc-user-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.disc-user {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.disc-user-host {
  color: #C9A96E;
}
.disc-host-badge {
  padding: 2rpx 10rpx;
  background: rgba(201, 169, 110, 0.2);
  border-radius: 6rpx;
}
.disc-host-badge-txt {
  font-size: 18rpx;
  color: #C9A96E;
}
.disc-content {
  font-size: 28rpx;
  color: #999999;
  margin-top: 4rpx;
}

/* 问答列表 */
.qa-list {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.qa-card {
  display: flex;
  gap: 24rpx;
  padding: 32rpx;
  background: #fff;
  border: 1rpx solid #E8E3DB;
  border-radius: 24rpx;
}
.qa-time {
  flex-shrink: 0;
  padding: 8rpx 16rpx;
  background: rgba(196, 30, 58, 0.1);
  border-radius: 8rpx;
  height: fit-content;
}
.qa-time-txt {
  font-size: 22rpx;
  color: var(--brand);
}
.qa-body {
  flex: 1;
  min-width: 0;
}
.qa-q-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.qa-q-hint {
  font-size: 22rpx;
  color: #999999;
}
.qa-question {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.qa-answer {
  margin-top: 24rpx;
  padding: 24rpx;
  background: rgba(240, 235, 229, 0.5);
  border-radius: 16rpx;
}
.qa-a-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}
.qa-a-avatar {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(201, 169, 110, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.qa-a-avatar-txt {
  font-size: 18rpx;
  color: #C9A96E;
}
.qa-a-hint {
  font-size: 22rpx;
  font-weight: 500;
  color: #C9A96E;
}
.qa-answer-txt {
  font-size: 28rpx;
  color: #999999;
  line-height: 1.5;
}

/* 商品列表 */
.prod-list {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.prod-card {
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #E8E3DB;
  border-radius: 24rpx;
}
.prod-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  background: #f0ebe5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.prod-body {
  flex: 1;
  min-width: 0;
}
.prod-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.prod-jump {
  font-size: 22rpx;
  color: var(--brand);
  margin-top: 8rpx;
}
.prod-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.prod-price-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.prod-price {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--brand);
}
.prod-original {
  font-size: 22rpx;
  color: #999999;
  text-decoration: line-through;
}
.prod-sales {
  font-size: 22rpx;
  color: #999999;
}
.prod-buy {
  align-self: flex-end;
  padding: 12rpx 24rpx;
  background: var(--brand);
  border-radius: 999rpx;
  flex-shrink: 0;
}
.prod-buy-txt {
  font-size: 22rpx;
  font-weight: 500;
  color: #fff;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  border-top: 1rpx solid #E8E3DB;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 0 32rpx;
  height: 128rpx;
}
.bottom-act {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.bottom-act-txt {
  font-size: 18rpx;
  color: #999999;
}
.bottom-main {
  flex: 1;
  margin-left: 16rpx;
}
.bottom-cta {
  width: 100%;
  height: 80rpx;
  background: var(--brand);
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bottom-cta-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}
</style>
