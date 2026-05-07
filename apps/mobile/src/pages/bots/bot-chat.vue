<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-info">
        <view class="header-avatar" :style="{ background: bot.color || '#8b4513' }">
          <text class="avatar-text">{{ bot.name?.charAt(0) || '智' }}</text>
        </view>
        <view class="header-text">
          <text class="header-name">{{ bot.name || '智能体' }}</text>
          <text class="header-status">在线</text>
        </view>
      </view>
    </view>

    <!-- 对话区域 -->
    <scroll-view class="messages" scroll-y :scroll-into-view="scrollTo" scroll-with-animation>
      <!-- 首次进入：智能体介绍 -->
      <view v-if="messages.length === 0" class="welcome">
        <view class="welcome-avatar" :style="{ background: bot.color || '#8b4513' }">
          <text class="welcome-avatar-text">{{ bot.name?.charAt(0) || '智' }}</text>
        </view>
        <text class="welcome-name">{{ bot.name }}</text>
        <text class="welcome-intro">{{ bot.intro || '您好！有什么可以帮助您的？' }}</text>
        <view class="suggestion-list">
          <view
            v-for="(s, idx) in bot.suggestions || []"
            :key="idx"
            class="suggestion-chip"
            @click="sendSuggestion(s)"
          >
            <text class="suggestion-text">{{ s }}</text>
          </view>
        </view>
      </view>

      <!-- 消息列表 -->
      <view v-for="(msg, idx) in messages" :key="idx" :id="'msg-' + idx">
        <!-- 用户消息 -->
        <view v-if="msg.role === 'user'" class="msg-row user-row">
          <view class="msg-bubble user-bubble">
            <text class="msg-text">{{ msg.content }}</text>
          </view>
        </view>
        <!-- 智能体消息 -->
        <view v-else class="msg-row bot-row">
          <view class="bot-bubble-avatar" :style="{ background: bot.color || '#8b4513' }">
            <text class="mini-avatar-text">{{ bot.name?.charAt(0) || '智' }}</text>
          </view>
          <view class="msg-bubble bot-bubble">
            <text class="msg-text">{{ msg.content }}</text>
            <text v-if="msg.typing" class="typing-cursor">|</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="messages.length > 0 && !streaming" class="empty-hint">向智能体提问吧</view>
    </scroll-view>

    <!-- 底部输入框 -->
    <view class="input-area">
      <input
        v-model="inputText"
        class="input-box"
        placeholder="输入你的问题..."
        :disabled="streaming"
        @confirm="sendMessage"
        confirm-type="send"
      />
      <button
        class="send-btn"
        :disabled="!inputText.trim() || streaming"
        @click="sendMessage"
      >
        发送
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";

interface Bot {
  id: string;
  name: string;
  desc: string;
  category: string;
  tag: string;
  usageCount: number;
  color: string;
  intro: string;
  suggestions: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  typing?: boolean;
}

const bot = ref<Bot>({
  id: "",
  name: "智能体",
  desc: "",
  category: "",
  tag: "",
  usageCount: 0,
  color: "#8b4513",
  intro: "您好！有什么可以帮助您的？",
  suggestions: [],
});

const messages = ref<Message[]>([]);
const inputText = ref("");
const streaming = ref(false);
const scrollTo = ref("");

onMounted(() => {
  parseBotData();
});

function parseBotData() {
  try {
    const pages = getCurrentPages();
    const page = pages[pages.length - 1] as any;
    const opts = page?.$page?.options || page?.options || {};
    const raw = opts.bot || "";
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw));
      bot.value = { ...bot.value, ...parsed };
    }
  } catch {
    // 解析失败使用默认值
  }
}

async function sendSuggestion(text: string) {
  inputText.value = text;
  await sendMessage();
}

async function sendMessage() {
  const content = inputText.value.trim();
  if (!content || streaming.value) return;

  // 添加用户消息
  messages.value.push({ role: "user", content });
  inputText.value = "";
  scrollToBottom();

  // 开始模拟流式回复
  streaming.value = true;
  const assistantMsg: Message = { role: "assistant", content: "", typing: true };
  messages.value.push(assistantMsg);
  scrollToBottom();

  try {
    // 尝试从后端获取回复
    const reply = await fetchBotReply(content);
    // 逐字显示
    await typeWriter(reply);
  } catch {
    // 本地模拟回复
    const fallback = getLocalReply(content);
    await typeWriter(fallback);
  }

  // 完成
  const last = messages.value[messages.value.length - 1];
  if (last) last.typing = false;
  streaming.value = false;
  scrollToBottom();
}

function getLocalReply(msg: string): string {
  const replies = [
    "感谢您的提问！这是一个很好的问题。在国学传统文化中，这个问题有着丰富的内涵和深刻的智慧。让我为您详细解答...",
    "您好！关于这个问题，我建议从以下几个角度来理解：首先，要了解其历史背景；其次，要把握核心思想；最后，要结合实际应用。",
    "这是一个很有价值的问题！根据经典典籍的记载，我们可以从多个层面来解读。简单来说，核心在于'天人合一'的思想。",
    "很高兴为您解答！这个问题涉及面较广，我为您梳理了几个关键要点，希望能帮助您更好地理解。",
    "您提到的这个方面很有意思。在国学体系中，这体现了阴阳调和、五行相生的哲学理念。让我为您具体分析...",
  ];
  const idx = Math.floor(Math.random() * replies.length);
  return replies[idx];
}

async function fetchBotReply(msg: string): Promise<string> {
  // 尝试调用后端 SSE 接口
  return new Promise((resolve, reject) => {
    uni.request({
      url: `http://localhost:3000/api/v1/bots/${bot.value.id}/chat`,
      method: "POST",
      data: { message: msg },
      header: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${uni.getStorageSync("token") || ""}`,
      },
      success: (res) => {
        const data = res.data as any;
        if (data?.data?.reply) {
          resolve(data.data.reply);
        } else if (data?.reply) {
          resolve(data.reply);
        } else {
          reject(new Error("no reply"));
        }
      },
      fail: () => reject(new Error("network error")),
    });
  });
}

async function typeWriter(text: string) {
  const chars = text.split("");
  let index = 0;

  return new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      if (index >= chars.length) {
        clearInterval(timer);
        resolve();
        return;
      }
      const last = messages.value[messages.value.length - 1];
      if (last) {
        last.content += chars[index];
        scrollToBottom();
      }
      index++;
    }, 30);
  });
}

function scrollToBottom() {
  nextTick(() => {
    const len = messages.value.length;
    if (len > 0) {
      scrollTo.value = "msg-" + (len - 1);
    }
  });
}

function goBack() {
  uni.navigateBack();
}
</script>

<style>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f0e6;
}

/* 顶部导航 */
.header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #8b4513;
  color: #fff;
  flex-shrink: 0;
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
}

.back-icon {
  font-size: 30px;
  line-height: 1;
  color: #fff;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 16px;
  color: #fff;
  font-weight: bold;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.header-name {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

.header-status {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}

/* 对话区域 */
.messages {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

/* 欢迎区域 */
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 16px 20px;
}

.welcome-avatar {
  width: 60px;
  height: 60px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.welcome-avatar-text {
  font-size: 28px;
  color: #fff;
  font-weight: bold;
}

.welcome-name {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.welcome-intro {
  font-size: 14px;
  color: #888;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 20px;
}

.suggestion-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  width: 100%;
}

.suggestion-chip {
  background: #fff;
  border: 1px solid #e0d5c1;
  border-radius: 18px;
  padding: 8px 18px;
  cursor: pointer;
}

.suggestion-text {
  font-size: 13px;
  color: #8b4513;
}

/* 消息气泡 */
.msg-row {
  margin-bottom: 14px;
  display: flex;
  align-items: flex-start;
}

.user-row {
  justify-content: flex-end;
}

.bot-row {
  justify-content: flex-start;
  gap: 8px;
}

.bot-bubble-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.mini-avatar-text {
  font-size: 14px;
  color: #fff;
  font-weight: bold;
}

.msg-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 12px;
  word-wrap: break-word;
}

.user-bubble {
  background: #8b4513;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.bot-bubble {
  background: #fff;
  color: #333;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.msg-text {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.typing-cursor {
  font-size: 14px;
  color: #8b4513;
  animation: blink 0.8s infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.empty-hint {
  text-align: center;
  font-size: 12px;
  color: #ccc;
  padding: 10px 0;
}

/* 输入区域 */
.input-area {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: #fff;
  border-top: 1px solid #e0d5c1;
  flex-shrink: 0;
  gap: 8px;
}

.input-box {
  flex: 1;
  height: 40px;
  background: #f5f0e6;
  border-radius: 20px;
  padding: 0 16px;
  font-size: 14px;
  border: 1px solid #e0d5c1;
}

.send-btn {
  flex-shrink: 0;
  height: 40px;
  padding: 0 20px;
  background: #8b4513;
  color: #fff;
  border-radius: 20px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.send-btn[disabled] {
  background: #ccc;
  color: #999;
}
</style>
