<template>
  <view class="global-chat">
    <!-- 悬浮按钮 -->
    <view
      class="chat-fab"
      @click="togglePanel"
    >
      <text class="fab-icon">
        💬
      </text>
    </view>

    <!-- 遮罩 -->
    <view
      v-if="visible"
      class="chat-overlay"
      @click="closePanel"
    />

    <!-- 半屏对话窗口 -->
    <view
      v-if="visible"
      class="chat-panel"
      :class="{ 'slide-in': visible }"
    >
      <!-- 顶部标题栏 -->
      <view class="chat-header">
        <view class="header-left" />
        <text class="header-title">
          智能客服
        </text>
        <view
          class="header-right"
          @click="closePanel"
        >
          <text class="close-btn">
            ✕
          </text>
        </view>
      </view>

      <!-- 对话区域 -->
      <scroll-view
        class="chat-messages"
        scroll-y
        :scroll-into-view="scrollToId"
        scroll-with-animation
      >
        <view
          v-for="(msg, idx) in messages"
          :id="'msg-' + idx"
          :key="idx"
          class="message-row"
          :class="msg.role === 'user' ? 'row-user' : 'row-bot'"
        >
          <view
            class="bubble"
            :class="msg.role === 'user' ? 'bubble-user' : 'bubble-bot'"
          >
            <text class="bubble-text">
              {{ msg.content }}
            </text>
          </view>
        </view>

        <!-- 推荐问题快捷入口（仅在最底部未发送消息时显示） -->
        <view
          v-if="showQuickReplies"
          class="quick-replies"
        >
          <view
            v-for="(q, qi) in quickQuestions"
            :key="qi"
            class="quick-tag"
            @click="sendQuickMessage(q)"
          >
            <text class="quick-tag-text">
              {{ q }}
            </text>
          </view>
        </view>

        <!-- 用于滚动的锚点 -->
        <view
          id="scroll-anchor"
          style="height: 1px"
        />
      </scroll-view>

      <!-- 底部输入区 -->
      <view class="chat-input-area">
        <input
          v-model="inputText"
          class="chat-input"
          type="text"
          placeholder="输入您的问题..."
          :disabled="sending"
          @confirm="sendMessage"
        >
        <view
          class="send-btn"
          :class="{ 'send-active': inputText.trim() }"
          @click="sendMessage"
        >
          <text class="send-btn-text">
            发送
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'

interface ChatMessage {
  role: 'user' | 'bot'
  content: string
}

const visible = ref(false)
const inputText = ref('')
const sending = ref(false)
const messages = ref<ChatMessage[]>([])
const scrollToId = ref('')

// 推荐问题
const quickQuestions = [
  '如何加入圈子？',
  '推荐热门课程',
  '如何使用排盘工具',
]

// 是否显示推荐问题（仅当没有任何用户消息时）
const showQuickReplies = computed(() => {
  return messages.value.filter((m) => m.role === 'user').length === 0
})

// 关键词-回复映射
const keywordReplies: [RegExp, string][] = [
  [/圈子/, '加入圈子很简单：进入首页点击"圈子"入口，浏览感兴趣的圈子后点击"加入"按钮即可。部分圈子需要创建者审核，请耐心等待。'],
  [/课程/, '我们提供丰富的国学课程：经典导读、诗词鉴赏、八字命理、古籍阅读等。您可以在首页点击"课程"入口浏览全部课程，也可以使用搜索功能查找感兴趣的课程。'],
  [/排盘/, '使用排盘工具：进入"八字排盘"功能，输入出生日期、时间和地点，系统会自动生成八字排盘结果，包括四柱、十神、大运等信息。'],
  [/你好|您好|嗨|hi|hello/i, '您好！很高兴为您服务。请问有什么可以帮助您的？您可以点击下方的推荐问题快速了解平台功能。'],
  [/谢谢|感谢/, '不客气！如果还有其他问题，随时可以问我。祝您在国学平台学习愉快！'],
  [/功能/, '国学平台目前提供以下功能：八字排盘、古籍阅读、诗词赏析、课程学习、圈子社交、搜索等。您可以在首页看到所有功能入口。'],
  [/推荐/, '为您推荐热门课程：\n1. 《周易》入门精讲\n2. 唐诗三百首赏析\n3. 八字命理基础\n4. 《论语》导读\n\n您可以在"课程"页面查看详情。'],
]

/** 模拟智能回复 */
function getBotReply(userMsg: string): string {
  for (const [pattern, reply] of keywordReplies) {
    if (pattern.test(userMsg)) {
      return reply
    }
  }
  return '感谢您的提问！我正在努力学习更多国学知识。建议您点击上方的推荐问题，或前往首页浏览相关功能。如果问题仍未解决，请联系人工客服。'
}

/** 打开/关闭面板 */
function togglePanel() {
  if (visible.value) {
    closePanel()
  } else {
    openPanel()
  }
}

function openPanel() {
  visible.value = true
  // 如果是首次打开，添加欢迎消息
  if (messages.value.length === 0) {
    messages.value.push({
      role: 'bot',
      content: '您好！我是国学智能客服，可以帮您解答平台使用问题、推荐课程和圈子。',
    })
  }
  nextTick(() => scrollToBottom())
}

function closePanel() {
  visible.value = false
}

/** 发送消息 */
async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || sending.value) return

  // 隐藏快捷回复
  inputText.value = ''
  sending.value = true

  // 添加用户消息
  messages.value.push({ role: 'user', content: text })
  nextTick(() => scrollToBottom())

  // 模拟延迟后回复
  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 600))

  const reply = getBotReply(text)
  messages.value.push({ role: 'bot', content: reply })
  sending.value = false
  nextTick(() => scrollToBottom())
}

/** 快捷问题发送 */
function sendQuickMessage(text: string) {
  inputText.value = text
  sendMessage()
}

/** 滚动到底部 */
function scrollToBottom() {
  scrollToId.value = 'scroll-anchor'
}
</script>

<style scoped>
/* ===== 悬浮按钮 ===== */
.chat-fab {
  position: fixed;
  right: 16px;
  bottom: 100px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c4943a, #a67c2e);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(196, 148, 58, 0.4), 0 2px 6px rgba(0, 0, 0, 0.15);
  z-index: 9998;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.chat-fab:active {
  transform: scale(0.92);
  box-shadow: 0 2px 6px rgba(196, 148, 58, 0.3);
}
.fab-icon {
  font-size: 22px;
  line-height: 1;
}

/* ===== 遮罩 ===== */
.chat-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 9999;
  transition: opacity 0.3s;
}

/* ===== 对话面板 ===== */
.chat-panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 60%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.12);
  animation: slideUp 0.3s ease-out;
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* ===== 顶部标题栏 ===== */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f0e8d8;
  background: #faf6ee;
  border-radius: 16px 16px 0 0;
}
.header-left,
.header-right {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.header-title {
  font-size: 16px;
  font-weight: bold;
  color: #8b4513;
}
.close-btn {
  font-size: 18px;
  color: #999;
  padding: 4px;
}
.close-btn:active {
  color: #666;
}

/* ===== 对话区域 ===== */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.message-row {
  display: flex;
  margin-bottom: 4px;
}
.row-user {
  justify-content: flex-end;
}
.row-bot {
  justify-content: flex-start;
}

.bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 12px;
  word-break: break-word;
}
.bubble-user {
  background: linear-gradient(135deg, #c4943a, #a67c2e);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.bubble-bot {
  background: #f5f0e6;
  color: #333;
  border-bottom-left-radius: 4px;
}
.bubble-text {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* ===== 推荐问题快捷入口 ===== */
.quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding: 0 4px;
}
.quick-tag {
  background: #fff;
  border: 1px solid #c4943a;
  border-radius: 16px;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.quick-tag:active {
  background: #f5f0e6;
}
.quick-tag-text {
  font-size: 13px;
  color: #c4943a;
}

/* ===== 底部输入区 ===== */
.chat-input-area {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #f0e8d8;
  background: #fafaf8;
}
.chat-input {
  flex: 1;
  height: 40px;
  background: #f5f0e6;
  border-radius: 20px;
  padding: 0 14px;
  font-size: 14px;
  color: #333;
  border: 1px solid #E8E0D5;
}
.send-btn {
  min-width: 56px;
  height: 36px;
  border-radius: 18px;
  background: #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}
.send-btn.send-active {
  background: linear-gradient(135deg, #c4943a, #a67c2e);
}
.send-btn:active {
  opacity: 0.85;
}
.send-btn-text {
  font-size: 14px;
  color: #fff;
  font-weight: bold;
}
</style>
