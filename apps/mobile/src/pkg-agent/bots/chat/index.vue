<template>
  <view class="chat-page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view
        class="nav-btn"
        @tap="goBack"
      >
        <app-icon
          name="arrow-left"
          :size="40"
          color="#fff"
        />
      </view>
      <view class="nav-bot">
        <image
          v-if="botDetail.avatar"
          class="nav-avatar"
          :src="botDetail.avatar"
          mode="aspectFill"
        />
        <view
          v-else
          class="nav-avatar nav-avatar-fb"
        >
          {{ botDetail.name.slice(0, 1) }}
        </view>
        <view class="nav-info">
          <text class="nav-name">
            {{ botDetail.name }}
          </text>
          <text class="nav-status">
            {{ botDetail.isOfficial ? '官方认证' : '在线' }}
          </text>
        </view>
      </view>
      <view class="nav-actions">
        <view
          v-if="botDetail.voiceEnabled"
          class="nav-btn"
          @tap="handleVoiceCall"
        >
          <app-icon
            name="phone"
            :size="38"
            color="#fff"
          />
        </view>
        <view
          class="nav-btn"
          @tap="toggleMenu"
        >
          <app-icon
            name="more-vertical"
            :size="38"
            color="#fff"
          />
        </view>
      </view>
    </view>

    <!-- 下拉菜单 -->
    <view
      v-if="menuOpen"
      class="menu-mask"
      @tap="menuOpen = false"
    >
      <view
        class="menu-pop"
        @tap.stop
      >
        <view
          class="menu-item"
          @tap="onMenu('history')"
        >
          <app-icon
            name="history"
            :size="32"
            color="#444"
          />
          <text class="menu-text">
            历史记录
          </text>
        </view>
        <view
          class="menu-item"
          @tap="onMenu('share')"
        >
          <app-icon
            name="share-2"
            :size="32"
            color="#444"
          />
          <text class="menu-text">
            分享
          </text>
        </view>
        <view
          class="menu-item"
          @tap="onMenu('settings')"
        >
          <app-icon
            name="settings"
            :size="32"
            color="#444"
          />
          <text class="menu-text">
            设置
          </text>
        </view>
        <view class="menu-divider" />
        <view
          class="menu-item"
          @tap="onMenu('clear')"
        >
          <app-icon
            name="trash-2"
            :size="32"
            color="#C41E3A"
          />
          <text class="menu-text menu-text-danger">
            清空对话
          </text>
        </view>
      </view>
    </view>

    <!-- 对话区域 -->
    <scroll-view
      class="chat-scroll"
      scroll-y
      :scroll-top="scrollTop"
      :scroll-with-animation="true"
    >
      <view class="chat-content">
        <!-- 欢迎消息 -->
        <view
          v-if="messages.length === 0"
          class="welcome-block"
        >
          <view class="msg-row">
            <image
              v-if="botDetail.avatar"
              class="msg-avatar"
              :src="botDetail.avatar"
              mode="aspectFill"
            />
            <view
              v-else
              class="msg-avatar msg-avatar-bot"
            >
              {{ botDetail.name.slice(0, 1) }}
            </view>
            <view class="bubble bubble-bot">
              <text class="bubble-text">
                {{ botDetail.welcomeMessage }}
              </text>
            </view>
          </view>

          <!-- 推荐问题 -->
          <view
            v-if="botDetail.suggestions.length"
            class="sugg-block"
          >
            <text class="sugg-tip">
              您可以这样问我：
            </text>
            <view class="sugg-list">
              <view
                v-for="(s, i) in botDetail.suggestions"
                :key="i"
                class="sugg-chip"
                @tap="onSuggestion(s)"
              >
                {{ s }}
              </view>
            </view>
          </view>

          <!-- 能力说明 -->
          <view
            v-if="botDetail.capabilities.length"
            class="cap-block"
          >
            <text class="cap-tip">
              我的能力：
            </text>
            <view class="cap-list">
              <text
                v-for="(c, i) in botDetail.capabilities"
                :key="i"
                class="cap-tag"
              >
                {{ c }}
              </text>
            </view>
          </view>
        </view>

        <!-- 对话消息 -->
        <view
          v-for="msg in messages"
          :key="msg.id"
          class="msg-row"
          :class="{ 'msg-row-user': msg.role === 'user' }"
        >
          <!-- 头像 -->
          <view
            v-if="msg.role === 'user'"
            class="msg-avatar msg-avatar-user"
          >
            我
          </view>
          <template v-else>
            <image
              v-if="botDetail.avatar"
              class="msg-avatar"
              :src="botDetail.avatar"
              mode="aspectFill"
            />
            <view
              v-else
              class="msg-avatar msg-avatar-bot"
            >
              {{ botDetail.name.slice(0, 1) }}
            </view>
          </template>

          <!-- 内容 -->
          <view
            class="msg-body"
            :class="{ 'msg-body-user': msg.role === 'user' }"
          >
            <!-- 文本 -->
            <view
              v-if="msg.type === 'text'"
              class="bubble"
              :class="msg.role === 'user' ? 'bubble-user' : 'bubble-bot'"
            >
              <rich-text
                class="bubble-rich"
                :nodes="renderMarkdown(msg.isStreaming ? streamingText : msg.content)"
              />
              <text
                v-if="msg.isStreaming"
                class="cursor"
              >
                |
              </text>
            </view>

            <!-- 图片 -->
            <image
              v-else-if="msg.type === 'image' && msg.attachment"
              class="msg-image"
              :src="msg.attachment.url"
              mode="widthFix"
            />

            <!-- 文件 -->
            <view
              v-else-if="msg.type === 'file' && msg.attachment"
              class="bubble file-bubble"
              :class="msg.role === 'user' ? 'bubble-user' : 'bubble-bot'"
            >
              <app-icon
                name="paperclip"
                :size="28"
                :color="msg.role === 'user' ? '#fff' : '#666'"
              />
              <text class="file-name">
                {{ msg.attachment.name }}
              </text>
            </view>

            <text class="msg-time">
              {{ formatTime(msg.createdAt) }}
            </text>
          </view>
        </view>

        <view style="height: 20rpx" />
      </view>
    </scroll-view>

    <!-- 使用限制提示 -->
    <view
      v-if="botDetail.limits && !botDetail.isFree"
      class="limit-bar"
    >
      <text class="limit-text">
        今日免费次数：{{ botDetail.limits.usedCount }}/{{ botDetail.limits.dailyFreeCount }}
      </text>
      <text
        v-if="botDetail.limits.usedCount >= botDetail.limits.dailyFreeCount"
        class="limit-upgrade"
        @tap="onUpgrade"
      >
        升级会员
      </text>
    </view>

    <!-- 底部输入区 -->
    <view class="input-bar">
      <view
        v-if="botDetail.voiceEnabled"
        class="input-icon-btn"
        :class="{ 'recording': isRecording }"
        @tap="toggleVoice"
      >
        <app-icon
          :name="isRecording ? 'mic-off' : 'mic'"
          :size="38"
          :color="isRecording ? '#C41E3A' : '#666'"
        />
      </view>

      <view class="input-wrap">
        <input
          v-model="inputValue"
          class="chat-input"
          :placeholder="isRecording ? '正在录音...' : '输入您的问题...'"
          :disabled="isRecording || isSending"
          confirm-type="send"
          @confirm="handleSend"
        >
        <view
          v-if="botDetail.fileEnabled"
          class="input-file-btn"
          @tap="handleFileUpload"
        >
          <app-icon
            name="image-plus"
            :size="32"
            color="#999"
          />
        </view>
      </view>

      <view
        class="send-btn"
        :class="{ 'send-btn-disabled': !inputValue.trim() || isSending }"
        @tap="handleSend"
      >
        <app-icon
          :name="isSending ? 'loader-2' : 'send'"
          :size="36"
          color="#fff"
          :class="{ spin: isSending }"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack } from '@/utils/router'

interface Attachment { url: string; name: string }
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  type: 'text' | 'image' | 'file'
  content: string
  attachment?: Attachment
  createdAt: string
  isStreaming?: boolean
}

const botId = ref('1')
const inputValue = ref('')
const isSending = ref(false)
const isRecording = ref(false)
const streamingText = ref('')
const messages = ref<ChatMessage[]>([])
const menuOpen = ref(false)
const scrollTop = ref(0)

// mock Bot 详情
const botDetail = ref({
  name: '紫微大师',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ziwei',
  isOfficial: true,
  isFree: false,
  voiceEnabled: true,
  fileEnabled: true,
  welcomeMessage: '你好！我是紫微大师，精通紫微斗数、八字命理。无论是事业、感情还是健康，我都可以为你提供专业的命理分析。请问有什么可以帮你的吗？',
  suggestions: ['帮我看看今年运势', '我适合什么职业？', '分析一下我的感情运', '近期财运如何？'],
  capabilities: ['紫微斗数', '八字命理', '运势分析', '事业指导', '情感咨询'],
  limits: { dailyFreeCount: 5, usedCount: 2 },
})

// mock AI 回复库
const MOCK_REPLIES = [
  '根据你的描述，我为你做以下分析：\n\n**整体运势**\n今年你的事业宫有吉星照拂，适合主动出击、把握机会。\n\n**需要注意**\n1. 上半年财运平稳，不宜大额投资\n2. 下半年贵人运旺，可拓展人脉\n3. 感情方面宜以诚相待\n\n建议你保持积极心态，顺势而为。',
  '这是一个很好的问题。从命理角度看：\n\n- 你的性格偏向理性务实\n- 适合从事需要专业积累的领域\n- 中年后运势渐入佳境\n\n保持耐心，机会自然会来。',
]
let replyIndex = 0

onLoad((opts: any) => {
  if (opts?.id) botId.value = String(opts.id)
})

onMounted(() => {
  // 保持欢迎态（messages 为空展示欢迎语+推荐问题+能力）
})

function scrollToBottom() {
  scrollTop.value = 0
  setTimeout(() => { scrollTop.value = 999999 }, 50)
}

function handleSend() {
  const text = inputValue.value.trim()
  if (!text || isSending.value) return

  messages.value.push({
    id: 'user_' + Date.now(),
    role: 'user',
    type: 'text',
    content: text,
    createdAt: new Date().toISOString(),
  })
  inputValue.value = ''
  isSending.value = true
  streamingText.value = ''
  scrollToBottom()

  const aiId = 'ai_' + Date.now()
  messages.value.push({
    id: aiId,
    role: 'assistant',
    type: 'text',
    content: '',
    createdAt: new Date().toISOString(),
    isStreaming: true,
  })

  // 模拟流式逐字回复
  const fullText = MOCK_REPLIES[replyIndex % MOCK_REPLIES.length]
  replyIndex++
  let i = 0
  const timer = setInterval(() => {
    if (i < fullText.length) {
      streamingText.value += fullText[i]
      i++
      scrollToBottom()
    } else {
      clearInterval(timer)
      const target = messages.value.find((m) => m.id === aiId)
      if (target) {
        target.content = fullText
        target.isStreaming = false
      }
      streamingText.value = ''
      isSending.value = false
      if (botDetail.value.limits) botDetail.value.limits.usedCount++
      scrollToBottom()
    }
  }, 30)
}

function onSuggestion(s: string) {
  inputValue.value = s
}

function handleFileUpload() {
  uni.chooseImage({
    count: 1,
    success: (res: any) => {
      const path = res.tempFilePaths?.[0]
      if (!path) return
      messages.value.push({
        id: 'file_' + Date.now(),
        role: 'user',
        type: 'image',
        content: '[上传了图片]',
        attachment: { url: path, name: '图片' },
        createdAt: new Date().toISOString(),
      })
      scrollToBottom()
    },
  })
}

function toggleVoice() {
  isRecording.value = !isRecording.value
}

function handleVoiceCall() {
  uni.showToast({ title: '语音通话功能开发中', icon: 'none' })
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function onMenu(action: string) {
  menuOpen.value = false
  if (action === 'clear') {
    uni.showModal({
      title: '清空对话',
      content: '确定要清空当前对话记录吗？',
      confirmColor: '#C41E3A',
      success: (r) => { if (r.confirm) { messages.value = []; streamingText.value = '' } },
    })
  } else {
    uni.showToast({ title: '功能开发中', icon: 'none' })
  }
}

function onUpgrade() {
  uni.showToast({ title: '会员升级开发中', icon: 'none' })
}

// 简化 Markdown → rich-text nodes（粗体/标题/列表）
function renderMarkdown(content: string): string {
  if (!content) return ''
  return content
    .split('\n')
    .map((line) => {
      const l = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      if (l.startsWith('# ')) return `<div style="font-size:30rpx;font-weight:bold;margin:8rpx 0;">${l.slice(2)}</div>`
      if (l.startsWith('## ')) return `<div style="font-size:28rpx;font-weight:bold;margin:8rpx 0;">${l.slice(3)}</div>`
      if (/^\d+\.\s/.test(l)) return `<div style="margin-left:24rpx;">${l}</div>`
      if (l.startsWith('- ')) return `<div style="margin-left:24rpx;">• ${l.slice(2)}</div>`
      if (!l.trim()) return '<div style="height:16rpx;"></div>'
      return `<div>${l}</div>`
    })
    .join('')
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function goBack() {
  navigateBack(1)
}
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #faf8f5;
}

/* 顶栏 */
.nav-bar {
  height: 96rpx;
  background: linear-gradient(90deg, #c41e3a, #e8544e);
  display: flex;
  align-items: center;
  padding: 0 16rpx;
  flex-shrink: 0;
}
.nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-bot {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
  margin-left: 8rpx;
}
.nav-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(255, 255, 255, 0.3);
}
.nav-avatar-fb {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 26rpx;
}
.nav-info {
  margin-left: 16rpx;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.nav-name {
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nav-status {
  color: rgba(255, 255, 255, 0.7);
  font-size: 22rpx;
}
.nav-actions {
  display: flex;
  align-items: center;
}

/* 菜单 */
.menu-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
}
.menu-pop {
  position: absolute;
  top: 96rpx;
  right: 16rpx;
  width: 280rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
  padding: 8rpx 0;
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  gap: 16rpx;
}
.menu-text {
  font-size: 28rpx;
  color: #444;
}
.menu-text-danger {
  color: #c41e3a;
}
.menu-divider {
  height: 1rpx;
  background: #eee;
  margin: 4rpx 0;
}

/* 对话区 */
.chat-scroll {
  flex: 1;
  overflow: hidden;
}
.chat-content {
  padding: 24rpx;
}
.welcome-block {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.msg-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.msg-row-user {
  flex-direction: row-reverse;
}
.msg-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.msg-avatar-bot {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #c41e3a;
  color: #fff;
  font-size: 26rpx;
}
.msg-avatar-user {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #c9a96e;
  color: #fff;
  font-size: 26rpx;
}
.msg-body {
  max-width: 80%;
}
.msg-body-user {
  text-align: right;
}
.bubble {
  padding: 20rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  display: inline-block;
  text-align: left;
}
.bubble-bot {
  background: #fff;
  color: #444;
  border-radius: 24rpx;
  border-top-left-radius: 4rpx;
}
.bubble-user {
  background: #c41e3a;
  color: #fff;
  border-radius: 24rpx;
  border-top-right-radius: 4rpx;
}
.bubble-text {
  font-size: 28rpx;
  line-height: 1.6;
}
.bubble-rich {
  font-size: 28rpx;
  line-height: 1.6;
}
.cursor {
  display: inline-block;
  font-size: 28rpx;
  animation: blink 1s infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.msg-image {
  max-width: 360rpx;
  border-radius: 16rpx;
}
.file-bubble {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.file-name {
  font-size: 26rpx;
}
.msg-time {
  display: block;
  font-size: 22rpx;
  color: #bbb;
  margin-top: 8rpx;
}

/* 推荐问题 */
.sugg-block {
  padding-left: 88rpx;
}
.sugg-tip {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 16rpx;
  display: block;
}
.sugg-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.sugg-chip {
  padding: 12rpx 24rpx;
  background: #fff;
  border: 1rpx solid rgba(196, 30, 58, 0.2);
  color: #c41e3a;
  font-size: 24rpx;
  border-radius: 999rpx;
}

/* 能力说明 */
.cap-block {
  padding-left: 88rpx;
}
.cap-tip {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 12rpx;
  display: block;
}
.cap-list {
  background: rgba(196, 30, 58, 0.05);
  border-radius: 12rpx;
  padding: 20rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.cap-tag {
  padding: 4rpx 16rpx;
  background: #fff;
  font-size: 22rpx;
  color: #666;
  border-radius: 8rpx;
}

/* 限制提示 */
.limit-bar {
  padding: 16rpx 24rpx;
  background: rgba(201, 169, 110, 0.1);
  border-top: 1rpx solid rgba(201, 169, 110, 0.2);
  text-align: center;
  flex-shrink: 0;
}
.limit-text {
  font-size: 22rpx;
  color: #c9a96e;
}
.limit-upgrade {
  font-size: 22rpx;
  color: #c9a96e;
  text-decoration: underline;
  margin-left: 12rpx;
}

/* 输入栏 */
.input-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  flex-shrink: 0;
}
.input-icon-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}
.input-icon-btn.recording {
  background: rgba(196, 30, 58, 0.1);
}
.input-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.chat-input {
  flex: 1;
  height: 72rpx;
  background: #f7f7f7;
  border: 1rpx solid #e5e5e5;
  border-radius: 16rpx;
  padding: 0 72rpx 0 24rpx;
  font-size: 28rpx;
}
.input-file-btn {
  position: absolute;
  right: 12rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.send-btn {
  width: 72rpx;
  height: 72rpx;
  background: #c41e3a;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.send-btn-disabled {
  opacity: 0.4;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
