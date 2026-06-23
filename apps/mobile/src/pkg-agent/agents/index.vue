<template>
  <view v-if="loading" class="load-state"><text class="load-state-text">加载中...</text></view>
  <view v-else-if="error" class="load-state">
    <text class="load-state-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <view v-else class="square">
    <!-- 顶部搜索区（红色，sticky） -->
    <view class="topbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="topbar-inner">
        <view class="tb-row">
          <view class="tb-left">
            <view class="tb-back" @tap="goBack">
              <app-icon name="arrow-left" :size="40" color="#ffffff" />
            </view>
            <text class="tb-title">智能体广场</text>
            <view class="tb-badge">
              <app-icon name="zap" :size="22" color="rgba(255,255,255,0.9)" />
              <text class="tb-badge-txt">{{ hotBots.length }}个在线</text>
            </view>
          </view>
          <view class="tb-history" @tap="navigateTo('/agents/history')">
            <app-icon name="clock" :size="28" color="rgba(255,255,255,0.8)" />
            <text class="tb-history-txt">对话记录</text>
          </view>
        </view>

        <!-- 搜索框 -->
        <view class="search-box">
          <app-icon name="search" :size="36" color="#999999" />
          <input
            v-model="searchQuery"
            class="search-input"
            type="text"
            placeholder="搜索智能体或直接提问..."
            placeholder-class="search-ph"
            :disabled="isListening"
          />
          <view v-if="searchQuery" class="search-clear" @tap="searchQuery = ''">
            <app-icon name="x" :size="28" color="#999999" />
          </view>
          <view class="search-divider" />
          <view class="voice-btn" :class="{ listening: isListening }" @tap="handleVoiceSearch">
            <app-icon name="mic" :size="30" :color="isListening ? '#ffffff' : '#666666'" />
          </view>
          <!-- 聆听遮罩 -->
          <view v-if="isListening" class="listening-mask">
            <view class="dot" />
            <view class="dot dot-2" />
            <view class="dot dot-3" />
            <text class="listening-txt">正在聆听...</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 主智能客服入口 -->
    <view class="section-px main-entry-wrap">
      <view class="main-entry" @tap="navigateTo('/agent/main')">
        <view class="me-icon">
          <app-icon name="bot" :size="56" color="#ffffff" />
        </view>
        <view class="me-info">
          <view class="me-title-row">
            <text class="me-title">热卜智能助手</text>
            <text class="me-online">在线</text>
          </view>
          <text class="me-desc">有任何问题都可以问我，我来帮您解答</text>
        </view>
        <view class="me-arrow">
          <app-icon name="message-circle" :size="36" color="#ffffff" />
        </view>
      </view>
    </view>

    <!-- 热门问答 -->
    <view class="section-px section-mt">
      <view class="sec-head">
        <view class="sec-head-left">
          <app-icon name="flame" :size="36" color="#ff6b35" />
          <text class="sec-title">大家都在问</text>
        </view>
        <view class="sec-link" @tap="navigateTo('/agents/questions')">
          <text class="sec-link-txt">更多</text>
          <app-icon name="chevron-right" :size="28" color="#999999" />
        </view>
      </view>
      <view class="q-list">
        <view
          v-for="(q, index) in hotQuestions.slice(0, 3)"
          :key="q.id"
          class="q-item"
          @tap="goAsk(q)"
        >
          <view class="q-rank" :class="'q-rank-' + index">{{ index + 1 }}</view>
          <view class="q-body">
            <text class="q-text">{{ q.question }}</text>
            <view class="q-meta">
              <image class="q-bot-avatar" :src="q.botAvatar" mode="aspectFill" />
              <text class="q-bot-name">{{ q.botName }}</text>
              <text class="q-dot">·</text>
              <text class="q-views">{{ formatCount(q.views) }}浏览</text>
            </view>
          </view>
          <app-icon name="chevron-right" :size="28" color="#cccccc" />
        </view>
      </view>
    </view>

    <!-- 智能体列表 -->
    <view class="section-px section-mt">
      <view class="sec-head">
        <view class="sec-head-left">
          <app-icon name="trending-up" :size="36" color="#c41e3a" />
          <text class="sec-title">智能体</text>
        </view>
        <view class="sec-link rank-link" @tap="navigateTo('/agents/ranking')">
          <app-icon name="crown" :size="26" color="#c9a96e" />
          <text class="rank-txt">热度榜</text>
        </view>
      </view>

      <view class="bot-list">
        <view
          v-for="(bot, index) in displayBots"
          :key="bot.id"
          class="bot-card"
          @tap="navigateTo('/agent/' + bot.id)"
        >
          <view class="bot-avatar-wrap">
            <view class="bot-avatar" :style="{ background: bot.bgColor }">
              <image class="bot-avatar-img" :src="bot.avatar" mode="aspectFit" />
            </view>
            <view v-if="index < 3" class="bot-rank" :class="'bot-rank-' + index">{{ index + 1 }}</view>
          </view>

          <view class="bot-info">
            <view class="bot-name-row">
              <text class="bot-name">{{ bot.name }}</text>
              <app-icon v-if="bot.isOfficial" name="crown" :size="28" color="#c9a96e" />
              <text v-if="bot.isNew" class="bot-new">NEW</text>
            </view>
            <text class="bot-desc">{{ bot.description }}</text>

            <view v-if="bot.capabilities.length" class="bot-caps">
              <text v-for="(cap, i) in bot.capabilities.slice(0, 3)" :key="i" class="bot-cap">{{ cap }}</text>
            </view>

            <view class="bot-stats">
              <view class="bot-stat">
                <app-icon name="star" :size="26" color="#ffb800" />
                <text class="bot-stat-txt">{{ bot.rating }}</text>
              </view>
              <text class="bot-stat-txt muted">{{ formatCount(bot.useCount) }}次对话</text>
              <view v-if="bot.capabilities.includes('语音对话')" class="bot-voice">
                <app-icon name="volume-2" :size="26" color="#7c3aed" />
                <text class="bot-voice-txt">语音</text>
              </view>
            </view>
          </view>

          <view class="bot-chat-btn" @tap.stop="navigateTo('/agent/' + bot.id)">
            <text class="bot-chat-txt">对话</text>
          </view>
        </view>
      </view>

      <view v-if="hotBots.length > 4" class="expand-btn" @tap="showAllBots = !showAllBots">
        <text class="expand-txt">{{ showAllBots ? '收起' : `查看全部${hotBots.length}个智能体` }}</text>
        <app-icon :name="showAllBots ? 'chevron-up' : 'chevron-down'" :size="30" color="#666666" />
      </view>
    </view>

    <view class="bottom-gap" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  agentsSquareApi,
  formatCount,
  type SquareQuestion,
} from '@/lib/agents-square-data'

const loading = ref(true)
const error = ref('')
const statusBarHeight = ref(0)
const searchQuery = ref('')
const isListening = ref(false)
const showAllBots = ref(false)
const hotBots = ref<any[]>([])
const hotQuestions = ref<any[]>([])

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [bots, questions] = await Promise.all([
      agentsSquareApi.getHotBots(),
      agentsSquareApi.getHotQuestions(),
    ])
    hotBots.value = bots || []
    hotQuestions.value = questions || []
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })

uni.getSystemInfo({
  success: (res) => {
    statusBarHeight.value = res.statusBarHeight || 0
  },
})

const displayBots = computed(() => (showAllBots.value ? hotBots.value : hotBots.value.slice(0, 4)))

function handleVoiceSearch() {
  if (isListening.value) return
  isListening.value = true
  setTimeout(() => {
    isListening.value = false
    searchQuery.value = '八字分析'
  }, 2000)
}

function goAsk(q: SquareQuestion) {
  navigateTo(`/agent/${q.botId}?q=${encodeURIComponent(q.question)}`)
}

function goBack() {
  // #ifdef H5
  if (window.history.length > 1) {
    uni.navigateBack()
    return
  }
  // #endif
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/paipan/index' })
}
</script>

<style scoped>
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: #c41e3a; border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }

.square {
  min-height: 100vh;
  background: var(--bg-paper, #faf8f5);
  padding-bottom: 48rpx;
}

/* 顶部搜索区 */
.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: linear-gradient(180deg, #c41e3a 0%, #a01530 100%);
}
.topbar-inner {
  padding: 16rpx 32rpx 28rpx;
}
.tb-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.tb-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.tb-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -12rpx;
}
.tb-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffffff;
}
.tb-badge {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 2rpx 16rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999rpx;
}
.tb-badge-txt {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.9);
}
.tb-history {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.tb-history-txt {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 搜索框 */
.search-box {
  position: relative;
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 18rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
}
.search-input {
  flex: 1;
  margin-left: 16rpx;
  font-size: 28rpx;
  color: #333333;
}
.search-ph {
  color: #999999;
}
.search-clear {
  padding: 8rpx;
}
.search-divider {
  width: 2rpx;
  height: 40rpx;
  background: #e5e5e5;
  margin: 0 16rpx;
}
.voice-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 999rpx;
  background: #f5f0e8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.voice-btn.listening {
  background: #c41e3a;
}
.listening-mask {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: #ffffff;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 999rpx;
  background: #c41e3a;
  animation: bounce 1s infinite;
}
.dot-2 {
  animation-delay: 0.15s;
}
.dot-3 {
  animation-delay: 0.3s;
}
.listening-txt {
  margin-left: 12rpx;
  font-size: 28rpx;
  color: #666666;
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12rpx); }
}

/* 通用区块 */
.section-px {
  padding-left: 32rpx;
  padding-right: 32rpx;
}
.section-mt {
  margin-top: 40rpx;
}
.main-entry-wrap {
  margin-top: 32rpx;
}
.sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.sec-head-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.sec-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.sec-link {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.sec-link-txt {
  font-size: 24rpx;
  color: #999999;
}
.rank-link {
  gap: 6rpx;
}
.rank-txt {
  font-size: 24rpx;
  color: #c9a96e;
}

/* 主智能客服入口 */
.main-entry {
  position: relative;
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: linear-gradient(90deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 28rpx;
  padding: 28rpx 24rpx;
  overflow: hidden;
}
.me-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #c41e3a 0%, #7c3aed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 8rpx 20rpx rgba(196, 30, 58, 0.3);
}
.me-info {
  flex: 1;
  min-width: 0;
}
.me-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.me-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;
}
.me-online {
  padding: 2rpx 12rpx;
  background: #52c41a;
  color: #ffffff;
  font-size: 20rpx;
  border-radius: 6rpx;
}
.me-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 8rpx;
}
.me-arrow {
  width: 72rpx;
  height: 72rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 热门问答 */
.q-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.q-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.q-rank {
  width: 44rpx;
  height: 44rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
  flex-shrink: 0;
  background: #e8e3db;
  color: #666666;
}
.q-rank-0 {
  background: #ff6b35;
  color: #ffffff;
}
.q-rank-1 {
  background: #ffb800;
  color: #ffffff;
}
.q-body {
  flex: 1;
  min-width: 0;
}
.q-text {
  font-size: 26rpx;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.q-meta {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 8rpx;
}
.q-bot-avatar {
  width: 28rpx;
  height: 28rpx;
  border-radius: 6rpx;
}
.q-bot-name {
  font-size: 22rpx;
  color: #999999;
}
.q-dot {
  font-size: 22rpx;
  color: #bbbbbb;
}
.q-views {
  font-size: 22rpx;
  color: #999999;
}

/* 智能体卡片 */
.bot-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.bot-card {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  background: #ffffff;
  border-radius: 28rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.bot-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.bot-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bot-avatar-img {
  width: 68rpx;
  height: 68rpx;
}
.bot-rank {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 700;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
}
.bot-rank-0 {
  background: #ffd700;
  color: #333333;
}
.bot-rank-1 {
  background: #c0c0c0;
  color: #ffffff;
}
.bot-rank-2 {
  background: #cd7f32;
  color: #ffffff;
}
.bot-info {
  flex: 1;
  min-width: 0;
}
.bot-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.bot-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bot-new {
  padding: 2rpx 10rpx;
  background: #52c41a;
  color: #ffffff;
  font-size: 18rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
}
.bot-desc {
  display: block;
  font-size: 24rpx;
  color: #666666;
  margin-top: 8rpx;
  line-height: 1.5;
}
.bot-caps {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}
.bot-cap {
  padding: 4rpx 16rpx;
  background: #f5f0e8;
  color: #8b7355;
  font-size: 20rpx;
  border-radius: 999rpx;
}
.bot-stats {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 16rpx;
}
.bot-stat {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.bot-stat-txt {
  font-size: 24rpx;
  color: #666666;
}
.bot-stat-txt.muted {
  color: #999999;
}
.bot-voice {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.bot-voice-txt {
  font-size: 22rpx;
  color: #7c3aed;
}
.bot-chat-btn {
  flex-shrink: 0;
  align-self: center;
  padding: 14rpx 32rpx;
  background: #c41e3a;
  border-radius: 999rpx;
}
.bot-chat-txt {
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
}

/* 展开 */
.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  margin-top: 24rpx;
  padding: 20rpx;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.expand-txt {
  font-size: 26rpx;
  color: #666666;
}
.bottom-gap {
  height: 32rpx;
}
</style>
