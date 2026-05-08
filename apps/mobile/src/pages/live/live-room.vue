<template>
  <view class="page">
    <!-- 加载 -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">直播间加载中...</text>
    </view>

    <!-- 房间内容 -->
    <template v-else-if="room">
      <!-- 播放器区域 -->
      <view class="player-area" @click="toggleControls">
        <image v-if="room.cover" :src="room.cover" class="player-bg" mode="aspectFill" />
        <view v-else class="player-placeholder" />

        <view class="player-overlay" :class="{ hidden: !showControls }">
          <!-- 顶部栏 -->
          <view class="top-bar">
            <text class="back-btn" @click.stop="goBack">←</text>
            <view class="host-info">
              <image v-if="room.hostAvatar" :src="room.hostAvatar" class="host-avatar" mode="aspectFill" />
              <view class="host-text">
                <text class="host-name">{{ room.hostName || '主播' }}</text>
                <text class="host-fans">{{ viewCountText }} 观看</text>
              </view>
            </view>
            <view class="top-actions">
              <text class="action-btn" @click.stop="shareRoom">↗</text>
              <text class="action-btn" @click.stop="goBack">✕</text>
            </view>
          </view>

          <!-- 状态标签 -->
          <view class="status-badge" :class="room.status">
            <text v-if="room.status === 'LIVING'" class="status-dot living" />
            <text>{{ statusText }}</text>
          </view>

          <!-- 离开提示 -->
          <view v-if="showLeaveTip" class="leave-tip" @click.stop="showLeaveTip = false">
            <text class="leave-text">再逛逛？正在直播中</text>
            <text class="leave-action" @click.stop="goBack">离开</text>
            <text class="leave-stay" @click.stop="showLeaveTip = false">继续观看</text>
          </view>
        </view>
      </view>

      <!-- 聊天消息区 -->
      <view class="chat-area" v-if="messages.length > 0">
        <scroll-view scroll-y class="chat-scroll" :scroll-into-view="`msg-${messages.length - 1}`">
          <view
            v-for="(msg, i) in messages"
            :key="i"
            :id="`msg-${i}`"
            class="chat-msg"
          >
            <text class="msg-user" :style="{ color: msg.color || '#C9A96E' }">{{ msg.user }}：</text>
            <text class="msg-text">{{ msg.text }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 底部操作栏 -->
      <view class="bottom-bar">
        <input
          v-model="inputText"
          class="chat-input"
          placeholder="说点什么..."
          placeholder-style="color: rgba(255,255,255,0.4)"
          @confirm="sendMessage"
        />
        <view class="bottom-actions">
          <text class="ba-item" @click="sendGift">🎁</text>
          <text class="ba-item" @click="toggleLike">❤️</text>
          <text class="ba-item" @click="shareRoom">↗</text>
        </view>
      </view>
    </template>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <text class="empty-icon">📡</text>
      <text class="empty-text">房间不存在或已结束</text>
      <text class="empty-back" @click="goBack">返回</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { liveApi } from '../../api'

interface ChatMsg {
  user: string
  text: string
  color?: string
}

const id = ref('')
const room = ref<any>(null)
const loading = ref(true)
const showControls = ref(true)
const showLeaveTip = ref(false)
const inputText = ref('')
const messages = ref<ChatMsg[]>([])
const likeCount = ref(0)
let controlTimer: ReturnType<typeof setTimeout> | null = null
let mockChatTimer: ReturnType<typeof setTimeout> | null = null

const viewCountText = computed(() => {
  const v = (room.value?.viewCount || 0) + likeCount.value
  if (v >= 10000) return (v / 10000).toFixed(1) + '万'
  return String(v)
})

const statusText = computed(() => {
  const map: Record<string, string> = {
    LIVING: '● 直播中',
    UPCOMING: '◉ 即将开始',
    REPLAY: '▶ 回放中',
  }
  return map[room.value?.status] || room.value?.status || '未知'
})

// mock 用户和消息
const mockUsers = [
  { name: '国学爱好者', color: '#C9A96E' },
  { name: '书生意气', color: '#67c23a' },
  { name: '清风明月', color: '#409eff' },
  { name: '南山采菊', color: '#e6a23c' },
  { name: '知行合一', color: '#f56c6c' },
  { name: '竹林七贤', color: '#909399' },
]
const mockMessages = [
  '老师讲得太好了！', '受教了', '这个观点很有启发', '能再讲讲吗？',
  '每次听都有新感悟', '打卡', '期待下一讲', '顶礼膜拜',
  '请问如何入门？', '经典永不过时', '感恩分享', '已关注',
  '传统文化博大精深', '老师好', '学习了', '太精彩了',
]

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  id.value = opts.id || ''
  if (id.value) fetchRoom()
  else loading.value = false
})

onUnmounted(() => {
  if (controlTimer) clearTimeout(controlTimer)
  if (mockChatTimer) clearInterval(mockChatTimer as any)
})

async function fetchRoom() {
  try {
    room.value = await liveApi.roomDetail(id.value)
    if (room.value?.status === 'LIVING') {
      startMockChat()
    }
    // 预置几条欢迎消息
    messages.value = [
      { user: '系统', text: '欢迎进入直播间，请文明发言', color: '#f56c6c' },
    ]
  } catch {
    room.value = null
  } finally {
    loading.value = false
  }
}

function startMockChat() {
  mockChatTimer = setInterval(() => {
    const u = mockUsers[Math.floor(Math.random() * mockUsers.length)]
    const t = mockMessages[Math.floor(Math.random() * mockMessages.length)]
    messages.value.push({ user: u.name, text: t, color: u.color })
    if (messages.value.length > 50) {
      messages.value = messages.value.slice(-30)
    }
  }, 3000) as any
}

function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return
  messages.value.push({ user: '我', text, color: '#fff' })
  inputText.value = ''
}

function sendGift() {
  const gifts = ['🌹', '🎁', '⭐', '🍵', '📿', '🏆']
  const g = gifts[Math.floor(Math.random() * gifts.length)]
  messages.value.push({ user: '我', text: `送出 ${g}`, color: '#C9A96E' })
  uni.showToast({ title: `送出 ${g}`, icon: 'none' })
}

function toggleLike() {
  likeCount.value++
  uni.showToast({ title: '❤️', icon: 'none', duration: 800 })
}

function shareRoom() {
  uni.showToast({ title: '已复制分享链接', icon: 'success' })
}

function toggleControls() {
  showControls.value = !showControls.value
  if (showControls.value) {
    if (controlTimer) clearTimeout(controlTimer)
    controlTimer = setTimeout(() => {
      showControls.value = false
    }, 5000)
  }
}

function goBack() {
  if (mockChatTimer) clearInterval(mockChatTimer as any)
  uni.navigateBack()
}
</script>

<style>
.page {
  background: #0a0a1a;
  min-height: 100vh;
  position: relative;
}
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
.loading-text { color: rgba(255,255,255,0.5); font-size: 15px; }

/* ===== 播放器 ===== */
.player-area {
  position: absolute;
  inset: 0;
  z-index: 1;
}
.player-bg {
  width: 100%;
  height: 100%;
  filter: brightness(0.6);
}
.player-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #1a1a3e, #0a0a1a);
}

.player-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  transition: opacity 0.3s;
}
.player-overlay.hidden { opacity: 0; pointer-events: none; }

/* 顶部栏 */
.top-bar {
  display: flex;
  align-items: center;
  padding: 14px 12px;
  padding-top: calc(14px + env(safe-area-inset-top, 0px));
  gap: 10px;
}
.back-btn {
  font-size: 22px;
  color: #fff;
  padding: 0 4px;
}
.host-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.host-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #C9A96E;
}
.host-text {
  display: flex;
  flex-direction: column;
}
.host-name {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
}
.host-fans {
  font-size: 11px;
  color: rgba(255,255,255,0.6);
}
.top-actions {
  display: flex;
  gap: 16px;
}
.action-btn {
  font-size: 20px;
  color: #fff;
}

/* 状态标签 */
.status-badge {
  position: absolute;
  top: 100px;
  left: 16px;
  background: rgba(0,0,0,0.5);
  padding: 4px 12px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.status-badge text {
  font-size: 12px;
  color: #fff;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.status-dot.living {
  background: #e74c3c;
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.status-badge.UPCOMING { background: rgba(64,158,255,0.5); }
.status-badge.REPLAY { background: rgba(144,147,153,0.5); }

/* 离开提示 */
.leave-tip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.85);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 200px;
}
.leave-text {
  font-size: 14px;
  color: rgba(255,255,255,0.8);
}
.leave-action {
  font-size: 14px;
  color: #e74c3c;
  padding: 8px;
}
.leave-stay {
  font-size: 14px;
  color: #C9A96E;
  padding: 8px;
  font-weight: bold;
}

/* ===== 聊天区 ===== */
.chat-area {
  position: absolute;
  bottom: 60px;
  left: 12px;
  right: 12px;
  z-index: 5;
  max-height: 200px;
}
.chat-scroll {
  max-height: 200px;
}
.chat-msg {
  padding: 2px 0;
  display: flex;
  flex-wrap: wrap;
}
.msg-user {
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
  margin-right: 4px;
}
.msg-text {
  font-size: 12px;
  color: #fff;
}

/* ===== 底部操作栏 ===== */
.bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(transparent, rgba(0,0,0,0.6));
  z-index: 10;
}
.chat-input {
  flex: 1;
  background: rgba(255,255,255,0.15);
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 13px;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
}
.bottom-actions {
  display: flex;
  gap: 12px;
}
.ba-item {
  font-size: 24px;
  color: #fff;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 12px;
}
.empty-icon { font-size: 48px; }
.empty-text { color: rgba(255,255,255,0.5); font-size: 15px; }
.empty-back { color: #C9A96E; font-size: 14px; padding: 8px 24px; border: 1px solid #C9A96E; border-radius: 20px; }
</style>
