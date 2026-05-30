<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-info">
        <view class="header-avatar" :style="{ background: bot.color || '#C41E3A' }">
          <text class="header-avatar-text">{{ bot.name?.charAt(0) || '智' }}</text>
        </view>
        <view class="header-text">
          <text class="header-name">{{ bot.name || '智能体' }}</text>
          <text class="header-status">{{ streaming ? '回复中...' : '在线' }}</text>
        </view>
      </view>
      <view class="header-right">
        <text v-if="messages.length > 0" class="header-action" @click="clearChat">清空</text>
      </view>
    </view>

    <!-- 对话区域 -->
    <scroll-view
      class="messages"
      scroll-y
      :scroll-into-view="scrollTo"
      scroll-with-animation
      :show-scrollbar="false"
    >
      <!-- ====== 欢迎页 ====== -->
      <view v-if="messages.length === 0" class="welcome">
        <view class="welcome-avatar" :style="{ background: bot.color || '#C41E3A' }">
          <text class="welcome-avatar-text">{{ bot.name?.charAt(0) || '智' }}</text>
        </view>
        <text class="welcome-name">{{ bot.name }}</text>
        <text v-if="bot.tag" class="welcome-tag">{{ bot.tag }}</text>
        <text class="welcome-intro">{{ bot.intro || '您好！有什么可以帮助您的？' }}</text>

        <view class="welcome-stats" v-if="bot.usageCount">
          <text class="welcome-stat">已服务 {{ formatNum(bot.usageCount) }} 次</text>
        </view>

        <view class="suggestion-list">
          <text class="suggestion-title">试试这些问题</text>
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

      <!-- ====== 消息列表 ====== -->
      <view v-for="(msg, idx) in messages" :key="idx" :id="'msg-' + idx" class="msg-block">
        <!-- 时间提示（间隔>2分钟时显示） -->
        <view v-if="showTimeGap(idx)" class="time-gap">
          <text class="time-gap-text">{{ formatTime(msg.createdAt) }}</text>
        </view>

        <!-- 用户消息 -->
        <view v-if="msg.role === 'user'" class="msg-row user-row">
          <view class="msg-bubble user-bubble">
            <text class="msg-text">{{ msg.content }}</text>
          </view>
          <view class="msg-time-right">{{ formatShortTime(msg.createdAt) }}</view>
        </view>

        <!-- 智能体消息 -->
        <view v-else class="msg-row bot-row">
          <view class="bot-avatar-col">
            <view class="bot-bubble-avatar" :style="{ background: bot.color || '#C41E3A' }">
              <text class="mini-avatar-text">{{ bot.name?.charAt(0) || '智' }}</text>
            </view>
          </view>
          <view class="bot-content-col">
            <view class="msg-bubble bot-bubble" @longpress="copyMsg(msg)">
              <text class="msg-text" :class="{ 'msg-typing': msg.typing }">{{ msg.content }}</text>
              <text v-if="msg.typing" class="typing-cursor">|</text>
            </view>
            <view class="msg-time-left">{{ formatShortTime(msg.createdAt) }}</view>

            <!-- 操作按钮（仅已完成的bot消息） -->
            <view v-if="!msg.typing" class="bot-actions">
              <text class="bot-action-btn" @click="copyMsg(msg)">📋 复制</text>
              <text class="bot-action-btn" @click="regenerate(idx)">🔄 重新生成</text>
              <text class="bot-action-btn" :class="{ liked: msg.liked }" @click="toggleLike(idx)">
                {{ msg.liked ? '❤️' : '🤍' }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 触底占位 -->
      <view class="msg-bottom-pad" id="msg-bottom" />
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
        :maxlength="2000"
      />
      <button
        class="send-btn"
        :disabled="!inputText.trim() || streaming"
        @click="sendMessage"
      >
        {{ streaming ? '...' : '发送' }}
      </button>
    </view>

    <!-- Toast 提示（模拟） -->
    <view v-if="toastMsg" class="toast-overlay">
      <text class="toast-text">{{ toastMsg }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { botApi } from "../../api";

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
  liked?: boolean;
  createdAt: number;
}

const bot = ref<Bot>({
  id: "",
  name: "智能体",
  desc: "",
  category: "",
  tag: "",
  usageCount: 0,
  color: "#C41E3A",
  intro: "您好！有什么可以帮助您的？",
  suggestions: [],
});

const messages = ref<Message[]>([]);
const inputText = ref("");
const streaming = ref(false);
const scrollTo = ref("");
const toastMsg = ref("");
let toastTimer: ReturnType<typeof setTimeout> | null = null;

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

/** 显示轻提示 */
function showToast(text: string) {
  toastMsg.value = text;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMsg.value = "";
  }, 1500);
}

/** 数字格式化 */
function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "万";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

/** 短时间格式 */
function formatShortTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** 完整时间格式 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${month}月${day}日 ${formatShortTime(ts)}`;
}

/** 是否显示时间间隔提示 */
function showTimeGap(idx: number): boolean {
  if (idx === 0) return true;
  const cur = messages.value[idx]?.createdAt;
  const prev = messages.value[idx - 1]?.createdAt;
  if (!cur || !prev) return false;
  return cur - prev > 120000; // 超过2分钟
}

async function sendSuggestion(text: string) {
  inputText.value = text;
  await sendMessage();
}

async function sendMessage() {
  const content = inputText.value.trim();
  if (!content || streaming.value) return;

  messages.value.push({ role: "user", content, createdAt: Date.now() });
  inputText.value = "";
  scrollToBottom();

  streaming.value = true;
  const assistantMsg: Message = { role: "assistant", content: "", typing: true, createdAt: Date.now() };
  messages.value.push(assistantMsg);
  scrollToBottom();

  try {
    const reply = await fetchBotReply(content);
    await typeWriter(reply);
  } catch {
    const fallback = getLocalReply(content);
    await typeWriter(fallback);
  }

  const last = messages.value[messages.value.length - 1];
  if (last) last.typing = false;
  streaming.value = false;
  scrollToBottom();
}

function getLocalReply(msg: string): string {
  const replies = [
    "感谢您的提问！这是一个很好的问题。在国学传统文化中，这个问题有着丰富的内涵和深刻的智慧。让我为您详细解答。\n\n首先，从经典典籍来看，《易经》中有言：天尊地卑，乾坤定矣，这体现了天地秩序的重要性。其次，在实践层面，我们应当注重知行合一，将古人的智慧与现代生活相结合。\n\n希望以上解答对您有所帮助！如有更多问题，欢迎继续交流。",
    "您好！关于这个问题，我建议从以下几个角度来理解：\n\n一、历史渊源\n追溯其历史发展脉络，可以更好地把握核心要义。\n\n二、核心思想\n把握仁义礼智信五常的核心思想。\n\n三、实际应用\n将理论知识与日常生活实践相结合，方能真正领悟其中深意。\n\n还有什么需要我进一步解释的吗？",
    "这是一个很有价值的问题！根据经典典籍的记载，核心在于天人合一的思想。\n\n古人云：道生一，一生二，二生三，三生万物。万事万物都有其内在规律。理解这些规律，有助于我们更好地把握人生方向。\n\n希望这些内容能对您有所启发。",
    "很高兴为您解答！这个问题涉及面较广，我为您梳理了几个关键要点：\n\n1. **基础概念**：理解基本定义是第一步\n2. **核心原理**：把握其中的哲学思想\n3. **实践方法**：将理论付诸行动\n4. **注意事项**：避免常见误区\n\n如果您想深入了解某一点，请随时告诉我。",
    "您提到的这个方面很有意思。在国学体系中，这体现了阴阳调和、五行相生的哲学理念。\n\n根据《黄帝内经》的论述，阴阳平衡是健康与和谐的基础。将这一思想运用到日常生活中，可以帮助我们更好地处理各种关系。\n\n期待您的进一步探讨！",
  ];
  const idx = Math.floor(Math.random() * replies.length);
  return replies[idx];
}

async function fetchBotReply(msg: string): Promise<string> {
  const res = await botApi.chat(bot.value.id, { query: msg });
  if (res?.reply) return res.reply;
  if (res?.data?.reply) return res.data.reply;
  throw new Error("no reply");
}

/** 打字机效果 */
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
    }, 25);
  });
}

/** 复制消息 */
function copyMsg(msg: Message) {
  if (!msg.content) return;
  uni.setClipboardData({
    data: msg.content,
    success: () => showToast("已复制到剪贴板"),
  });
}

/** 重新生成 */
async function regenerate(idx: number) {
  if (streaming.value) return;
  // 找到对应的用户消息
  let userMsg = "";
  for (let i = idx - 1; i >= 0; i--) {
    if (messages.value[i]?.role === "user") {
      userMsg = messages.value[i].content;
      break;
    }
  }
  if (!userMsg) return;

  // 删除当前回复及之后的消息
  messages.value.splice(idx);

  // 重新生成
  streaming.value = true;
  const assistantMsg: Message = { role: "assistant", content: "", typing: true, createdAt: Date.now() };
  messages.value.push(assistantMsg);
  scrollToBottom();

  try {
    const reply = await fetchBotReply(userMsg);
    await typeWriter(reply);
  } catch {
    const fallback = getLocalReply(userMsg);
    await typeWriter(fallback);
  }

  const last = messages.value[messages.value.length - 1];
  if (last) last.typing = false;
  streaming.value = false;
  scrollToBottom();
}

/** 点赞/取消 */
function toggleLike(idx: number) {
  const msg = messages.value[idx];
  if (!msg) return;
  msg.liked = !msg.liked;
  showToast(msg.liked ? "感谢反馈" : "已取消");
}

/** 清空对话 */
function clearChat() {
  uni.showModal({
    title: "清空对话",
    content: "确定清空当前所有对话记录吗？",
    success: (res: any) => {
      if (res.confirm) {
        messages.value = [];
        showToast("对话已清空");
      }
    },
  });
}

function scrollToBottom() {
  nextTick(() => {
    scrollTo.value = "msg-bottom";
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
  background: #F5F0E8;
}

/* ===== 顶部导航 ===== */
.header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  padding-top: calc(10px + env(safe-area-inset-top));
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  color: #fff;
  flex-shrink: 0;
  gap: 10px;
}
.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.back-icon {
  font-size: 32px;
  line-height: 1;
  color: #fff;
}
.header-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}
.header-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.header-avatar-text {
  font-size: 16px;
  color: #fff;
  font-weight: bold;
}
.header-text {
  display: flex;
  flex-direction: column;
}
.header-name {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
}
.header-status {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
}
.header-right {
  flex-shrink: 0;
}
.header-action {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  padding: 6px 10px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.header-action:active {
  background: rgba(255, 255, 255, 0.15);
}

/* ===== 对话区域 ===== */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
}

/* ===== 欢迎页 ===== */
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px 20px;
}
.welcome-avatar {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  box-shadow: 0 4px 16px rgba(196, 30, 58, 0.25);
}
.welcome-avatar-text {
  font-size: 32px;
  color: #fff;
  font-weight: bold;
}
.welcome-name {
  font-size: 20px;
  font-weight: bold;
  color: #2C2C2C;
  margin-bottom: 4px;
}
.welcome-tag {
  font-size: 11px;
  color: #C41E3A;
  background: rgba(196, 30, 58, 0.08);
  padding: 2px 10px;
  border-radius: 10px;
  margin-bottom: 12px;
}
.welcome-intro {
  font-size: 14px;
  color: #888;
  text-align: center;
  line-height: 1.7;
  margin-bottom: 16px;
  max-width: 280px;
}
.welcome-stats {
  margin-bottom: 20px;
}
.welcome-stat {
  font-size: 12px;
  color: #C9A96E;
  background: rgba(201, 169, 110, 0.1);
  padding: 4px 12px;
  border-radius: 10px;
}
.suggestion-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.suggestion-title {
  font-size: 12px;
  color: #bbb;
  margin-bottom: 4px;
}
.suggestion-chip {
  background: #fff;
  border: 1px solid #E8E0D5;
  border-radius: 20px;
  padding: 10px 20px;
  width: fit-content;
  max-width: 85%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.suggestion-chip:active {
  background: #F5F0E8;
  border-color: #C41E3A;
}
.suggestion-text {
  font-size: 13px;
  color: #C41E3A;
}

/* ===== 时间间隔提示 ===== */
.time-gap {
  text-align: center;
  margin: 8px 0 6px;
}
.time-gap-text {
  font-size: 11px;
  color: #bbb;
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 12px;
  border-radius: 10px;
}

/* ===== 消息行 ===== */
.msg-block {
  margin-bottom: 4px;
}
.msg-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 2px;
}
.user-row {
  justify-content: flex-end;
}
.bot-row {
  justify-content: flex-start;
  gap: 0;
}
.bot-avatar-col {
  width: 36px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding-top: 2px;
}
.bot-bubble-avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mini-avatar-text {
  font-size: 13px;
  color: #fff;
  font-weight: bold;
}
.bot-content-col {
  flex: 1;
  min-width: 0;
  margin-left: 6px;
}

/* ===== 消息气泡 ===== */
.msg-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 14px;
  word-wrap: break-word;
}
.user-bubble {
  background: linear-gradient(135deg, #C41E3A, #d43550);
  color: #fff;
  border-bottom-right-radius: 4px;
  margin-left: auto;
}
.bot-bubble {
  background: #fff;
  color: #333;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.msg-text {
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
}
.msg-typing {
  /* 打字中的文字 */
}
.typing-cursor {
  font-size: 16px;
  color: #C41E3A;
  animation: blink 0.7s infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ===== 消息时间 ===== */
.msg-time-right {
  text-align: right;
  font-size: 10px;
  color: #bbb;
  margin-top: 2px;
  padding-right: 4px;
}
.msg-time-left {
  font-size: 10px;
  color: #bbb;
  margin-top: 2px;
  padding-left: 4px;
}

/* ===== Bot 操作按钮 ===== */
.bot-actions {
  display: flex;
  gap: 14px;
  margin-top: 4px;
  padding-left: 4px;
}
.bot-action-btn {
  font-size: 11px;
  color: #bbb;
  padding: 2px 0;
}
.bot-action-btn:active {
  color: #C41E3A;
}
.bot-action-btn.liked {
  color: #C41E3A;
}

/* ===== 底部占位 ===== */
.msg-bottom-pad {
  height: 10px;
}

/* ===== 输入区域 ===== */
.input-area {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #E8E0D5;
  flex-shrink: 0;
  gap: 8px;
  box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.04);
}
.input-box {
  flex: 1;
  height: 40px;
  background: #F5F0E8;
  border-radius: 20px;
  padding: 0 16px;
  font-size: 14px;
  border: 1px solid #E8E0D5;
}
.send-btn {
  flex-shrink: 0;
  height: 40px;
  padding: 0 20px;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  color: #fff;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: 0 2px 8px rgba(196, 30, 58, 0.2);
}
.send-btn[disabled] {
  background: #ddd;
  color: #aaa;
  box-shadow: none;
}

/* ===== Toast ===== */
.toast-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  background: rgba(0, 0, 0, 0.75);
  border-radius: 10px;
  padding: 10px 24px;
  pointer-events: none;
}
.toast-text {
  color: #fff;
  font-size: 14px;
}
</style>
