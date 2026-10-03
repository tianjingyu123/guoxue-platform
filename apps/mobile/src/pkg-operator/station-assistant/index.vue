<template>
  <view class="asst-page">
    <view
      class="asst-header"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="asst-hd-row">
        <view class="asst-hd-left">
          <view
            class="asst-icon-btn"
            role="button"
            aria-label="返回"
            @tap="goBack"
          >
            <app-icon
              name="arrow-left"
              :size="40"
              color="#ffffff"
            />
          </view>
          <view class="asst-avatar">
            <app-icon
              name="sparkles"
              :size="36"
              color="#ffffff"
            />
          </view>
          <view>
            <text class="asst-name">
              {{ config.name }}
            </text>
            <text class="asst-sub">
              AI 运营助理
            </text>
          </view>
        </view>
        <view
          class="asst-icon-btn"
          :class="{ 'asst-icon-btn-disabled': sending || clearing || !conversationId }"
          role="button"
          aria-label="清空对话"
          @tap="requestClear"
        >
          <app-icon
            name="trash-2"
            :size="38"
            color="#ffffff"
          />
        </view>
      </view>
    </view>

    <scroll-view
      class="asst-body"
      scroll-y
      :scroll-top="scrollTop"
      :scroll-with-animation="true"
    >
      <view
        v-if="loading"
        class="state-loading"
      >
        <view
          class="asst-typing"
          aria-label="正在恢复对话"
        >
          <view class="asst-dot asst-dot1" />
          <view class="asst-dot asst-dot2" />
          <view class="asst-dot asst-dot3" />
        </view>
        <text class="state-loading-text">
          正在恢复对话…
        </text>
      </view>

      <view
        v-else-if="error"
        class="state-error"
      >
        <text class="state-error-title">
          对话恢复失败
        </text>
        <text class="state-error-text">
          {{ error }}
        </text>
        <view
          class="state-retry-btn"
          role="button"
          aria-label="重新加载对话"
          @tap="retry"
        >
          <text>重新加载</text>
        </view>
      </view>

      <template v-else>
        <view
          v-if="messages.length === 0 && !sending"
          class="asst-welcome"
        >
          <view class="asst-msg-row">
            <view class="asst-msg-avatar">
              <app-icon
                name="sparkles"
                :size="32"
                color="#C41E3A"
              />
            </view>
            <view class="asst-bubble asst-bubble-ai">
              <text class="asst-bubble-text">
                {{ config.welcomeMessage }}
              </text>
            </view>
          </view>

          <view class="asst-caps">
            <text
              v-for="(cap, i) in config.capabilities"
              :key="i"
              class="asst-cap"
            >
              {{ cap }}
            </text>
          </view>

          <view class="asst-suggest-wrap">
            <text class="asst-suggest-hint">
              可以从这些问题开始：
            </text>
            <view class="asst-suggest-list">
              <view
                v-for="suggestion in config.suggestions"
                :key="suggestion.id"
                class="asst-suggest-btn"
                role="button"
                @tap="send(suggestion.text)"
              >
                <text class="asst-suggest-txt">
                  {{ suggestion.text }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <view
          v-for="message in messages"
          :key="message.id"
          class="asst-msg-row"
          :class="{ 'asst-msg-row-user': message.role === 'user' }"
        >
          <view
            v-if="message.role === 'assistant'"
            class="asst-msg-avatar"
          >
            <app-icon
              name="sparkles"
              :size="32"
              color="#C41E3A"
            />
          </view>

          <view
            class="asst-bubble"
            :class="[
              message.role === 'user' ? 'asst-bubble-user' : 'asst-bubble-ai',
              { 'asst-bubble-error': message.isError },
            ]"
          >
            <text
              v-if="message.role === 'user'"
              class="asst-bubble-text asst-bubble-text-user"
            >
              {{ message.content }}
            </text>

            <view v-else>
              <view
                v-if="message.isStreaming && !message.content"
                class="asst-typing"
                aria-label="正在生成回复"
              >
                <view class="asst-dot asst-dot1" />
                <view class="asst-dot asst-dot2" />
                <view class="asst-dot asst-dot3" />
              </view>

              <template v-else>
                <view
                  v-for="(block, blockIndex) in parseMarkdown(message.content)"
                  :key="blockIndex"
                >
                  <text
                    v-if="block.tag === 'h2'"
                    class="asst-h2"
                  >
                    {{ block.text }}
                  </text>
                  <text
                    v-else-if="block.tag === 'h3'"
                    class="asst-h3"
                  >
                    {{ block.text }}
                  </text>
                  <view
                    v-else-if="block.tag === 'quote'"
                    class="asst-quote"
                  >
                    <text class="asst-quote-txt">
                      {{ block.text }}
                    </text>
                  </view>
                  <view
                    v-else-if="block.tag === 'li'"
                    class="asst-li"
                  >
                    <text class="asst-li-dot">
                      {{ block.ordered ? block.index + "." : "•" }}
                    </text>
                    <rich-text
                      class="asst-li-txt"
                      :nodes="renderInline(block.text)"
                    />
                  </view>
                  <rich-text
                    v-else
                    class="asst-p"
                    :nodes="renderInline(block.text)"
                  />
                </view>
                <text
                  v-if="message.isStreaming"
                  class="asst-stream-cursor"
                >
                  ▋
                </text>
              </template>

              <view
                v-if="message.isError"
                class="asst-message-error"
              >
                <text class="asst-message-error-text">
                  {{ message.errorMessage || "回复未完成，请重试。" }}
                </text>
                <view
                  v-if="message.failedQuery"
                  class="asst-message-retry"
                  role="button"
                  aria-label="重新发送这条问题"
                  @tap="retryMessage(message)"
                >
                  <app-icon
                    name="refresh-cw"
                    :size="24"
                    color="#C41E3A"
                  />
                  <text>重新回答</text>
                </view>
              </view>

              <text
                v-if="message.disclaimer && !message.isStreaming"
                class="asst-disclaimer"
              >
                {{ message.disclaimer }}
              </text>

              <view
                v-if="message.actions && message.actions.length"
                class="asst-actions"
              >
                <view
                  v-for="(action, actionIndex) in message.actions"
                  :key="actionIndex"
                  class="asst-action-btn"
                  :class="'asst-action-' + action.priority"
                  role="button"
                  @tap="onAction(action)"
                >
                  <text
                    class="asst-action-txt"
                    :class="'asst-action-txt-' + action.priority"
                  >
                    {{ action.title }}
                  </text>
                  <app-icon
                    v-if="action.link"
                    name="external-link"
                    :size="22"
                    :color="actionColor(action.priority)"
                  />
                </view>
              </view>
            </view>
          </view>
        </view>
      </template>

      <view style="height: 24rpx" />
    </scroll-view>

    <view class="asst-input-bar">
      <input
        v-model="inputText"
        class="asst-input"
        :placeholder="sending ? '正在生成回复…' : '输入经营问题…'"
        :disabled="loading || !!error || sending"
        aria-label="输入要咨询的经营问题"
        confirm-type="send"
        @confirm="send()"
      >
      <view
        class="asst-send-btn"
        :class="{ 'asst-send-off': sendDisabled }"
        role="button"
        aria-label="发送消息"
        @tap="send()"
      >
        <app-icon
          name="send"
          :size="38"
          color="#ffffff"
        />
      </view>
    </view>

    <view
      v-if="showClear"
      class="asst-modal-mask"
      @tap="closeClearModal"
    >
      <view
        class="asst-modal"
        @tap.stop
      >
        <text class="asst-modal-title">
          清空对话
        </text>
        <text class="asst-modal-desc">
          确定清空这次对话及服务端记录吗？清空后无法恢复。
        </text>
        <view class="asst-modal-foot">
          <view
            class="asst-modal-cancel"
            role="button"
            @tap="closeClearModal"
          >
            <text class="asst-modal-cancel-txt">
              取消
            </text>
          </view>
          <view
            class="asst-modal-ok"
            :class="{ 'asst-modal-ok-disabled': clearing }"
            role="button"
            @tap="clearSession"
          >
            <text class="asst-modal-ok-txt">
              {{ clearing ? "清空中…" : "确定清空" }}
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import {
  assistantConfig,
  STATION_ASSISTANT_CONVERSATION_KEY,
  stationAssistantApi,
  type ActionSuggestion,
  type AssistantMessage,
  type AssistantSessionMessage,
  type StationAssistantConfig,
} from "@/lib/station-assistant-data";
import { streamChat, streamChatSupported } from "@/utils/stream-chat";
import { navigateTo } from "@/utils/router";

const statusBarHeight = ref(20);
const loading = ref(true);
const error = ref("");
const config = ref<StationAssistantConfig>(assistantConfig);
const messages = ref<AssistantMessage[]>([]);
const conversationId = ref("");
const inputText = ref("");
const sending = ref(false);
const clearing = ref(false);
const showClear = ref(false);
const scrollTop = ref(0);
let messageSequence = 0;

const sendDisabled = computed(
  () => loading.value || Boolean(error.value) || sending.value || !inputText.value.trim(),
);

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync();
    statusBarHeight.value = info.statusBarHeight || 20;
  } catch {
    statusBarHeight.value = 20;
  }
});

onMounted(loadPage);

function nextMessageId(prefix: "user" | "assistant" | "history"): string {
  messageSequence += 1;
  return `${prefix}_${Date.now()}_${messageSequence}`;
}

function readStoredConversationId(): string {
  try {
    const stored = uni.getStorageSync(STATION_ASSISTANT_CONVERSATION_KEY);
    return typeof stored === "string" ? stored.trim() : "";
  } catch {
    return "";
  }
}

function persistConversationId(id: string) {
  conversationId.value = id;
  try {
    uni.setStorageSync(STATION_ASSISTANT_CONVERSATION_KEY, id);
  } catch {
    // 当前会话仍可继续；受限浏览器可能禁止持久化。
  }
}

function removeStoredConversationId() {
  try {
    uni.removeStorageSync(STATION_ASSISTANT_CONVERSATION_KEY);
  } catch {
    // 服务端已清空时不因本地存储异常伪报失败。
  }
}

function normalizeHistory(
  items: AssistantSessionMessage[],
  disclaimer?: string,
): AssistantMessage[] {
  if (!Array.isArray(items)) return [];
  const validItems = items.filter(
    (item): item is AssistantSessionMessage =>
      Boolean(item) &&
      (item.role === "user" || item.role === "assistant") &&
      typeof item.content === "string" &&
      Boolean(item.content.trim()),
  );
  return validItems.map((item, index) => {
    const incomplete = item.role === "assistant" && item.incomplete === true;
    const previous = validItems[index - 1];
    return {
      id: nextMessageId("history"),
      role: item.role,
      content: item.content,
      createdAt: item.createdAt,
      disclaimer: item.role === "assistant" ? disclaimer : undefined,
      isError: incomplete,
      errorMessage: incomplete ? "上次回复在生成过程中中断，可重新回答。" : undefined,
      failedQuery: incomplete && previous?.role === "user" ? previous.content : undefined,
    };
  });
}

async function loadPage() {
  loading.value = true;
  error.value = "";
  try {
    config.value = await stationAssistantApi.getConfig();
    const storedId = readStoredConversationId();
    if (!storedId) {
      conversationId.value = "";
      messages.value = [];
      return;
    }

    conversationId.value = storedId;
    const session = await stationAssistantApi.getSession(storedId);
    const resolvedId =
      typeof session.conversationId === "string" && session.conversationId.trim()
        ? session.conversationId.trim()
        : storedId;
    persistConversationId(resolvedId);
    messages.value = normalizeHistory(session.messages, session.disclaimer);
  } catch (cause) {
    error.value = getErrorMessage(cause, "无法恢复上次对话，请检查网络后重试。");
  } finally {
    loading.value = false;
    scrollToBottom();
  }
}

async function retry() {
  await loadPage();
}

function goBack() {
  uni.navigateBack({ delta: 1 });
}

function scrollToBottom() {
  nextTick(() => {
    scrollTop.value = scrollTop.value === 100000 ? 99999 : 100000;
  });
}

async function send(suggestedText?: string) {
  const content = (suggestedText ?? inputText.value).trim();
  if (!content || loading.value || Boolean(error.value) || sending.value) return;

  messages.value.push({
    id: nextMessageId("user"),
    role: "user",
    content,
  });
  inputText.value = "";
  await sendCore(content);
}

async function sendCore(query: string) {
  if (sending.value) return;
  sending.value = true;

  const replyId = nextMessageId("assistant");
  messages.value.push({
    id: replyId,
    role: "assistant",
    content: "",
    isStreaming: true,
  });
  scrollToBottom();

  const liveMessage = () => messages.value.find((message) => message.id === replyId);

  try {
    if (streamChatSupported()) {
      await streamChat(
        "/station/assistant/chat/stream",
        {
          query,
          ...(conversationId.value ? { conversationId: conversationId.value } : {}),
        },
        {
          onChunk: (chunk) => {
            const message = liveMessage();
            if (message) message.content += chunk;
            scrollToBottom();
          },
          onMeta: (meta) => {
            const message = liveMessage();
            if (message && meta.disclaimer) message.disclaimer = meta.disclaimer;
            if (meta.conversationId) persistConversationId(meta.conversationId);
          },
        },
      );
    } else {
      const response = await stationAssistantApi.sendMessage(
        query,
        conversationId.value || undefined,
      );
      const message = liveMessage();
      if (message) {
        message.content = typeof response.content === "string" ? response.content : "";
        message.disclaimer = response.disclaimer;
      }
      if (response.conversationId) persistConversationId(response.conversationId);
    }

    const completed = liveMessage();
    if (!completed?.content.trim()) {
      throw new Error("AI 没有返回有效内容，请重新发送。");
    }
    completed.isStreaming = false;
  } catch (cause) {
    const message = liveMessage();
    const failureText = getErrorMessage(cause, "网络连接失败，请稍后重试。");

    if (message?.content.trim()) {
      message.isStreaming = false;
      message.isError = true;
      message.errorMessage = `回复中断：${failureText}`;
      message.failedQuery = query;
    } else {
      messages.value = messages.value.filter((item) => item.id !== replyId);
      messages.value.push({
        id: nextMessageId("assistant"),
        role: "assistant",
        content: "本次回复未能完成。",
        isError: true,
        errorMessage: failureText,
        failedQuery: query,
      });
    }
  } finally {
    sending.value = false;
    scrollToBottom();
  }
}

function retryMessage(message: AssistantMessage) {
  if (sending.value || !message.failedQuery) return;
  const query = message.failedQuery;
  messages.value = messages.value.filter((item) => item.id !== message.id);
  void sendCore(query);
}

function requestClear() {
  if (sending.value || clearing.value) return;
  if (!conversationId.value) {
    uni.showToast({ title: "暂无可清空的对话", icon: "none" });
    return;
  }
  showClear.value = true;
}

function closeClearModal() {
  if (!clearing.value) showClear.value = false;
}

async function clearSession() {
  const id = conversationId.value;
  if (!id || clearing.value) return;

  clearing.value = true;
  try {
    await stationAssistantApi.clearSession(id);
    messages.value = [];
    conversationId.value = "";
    removeStoredConversationId();
    showClear.value = false;
    uni.showToast({ title: "对话已清空", icon: "success" });
  } catch (cause) {
    uni.showToast({
      title: getErrorMessage(cause, "清空失败，请稍后重试。"),
      icon: "none",
    });
  } finally {
    clearing.value = false;
  }
}

function onAction(action: ActionSuggestion) {
  if (action.link) navigateTo(action.link);
}

function actionColor(priority: ActionSuggestion["priority"]) {
  if (priority === "high") return "#C41E3A";
  if (priority === "medium") return "#d97706";
  return "#6b7280";
}

type MarkdownBlock =
  | { tag: "h2" | "h3" | "quote" | "p"; text: string }
  | { tag: "li"; text: string; ordered: boolean; index: number };

function parseMarkdown(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  content.split("\n").forEach((line) => {
    if (!line.trim()) return;
    if (line.startsWith("## ")) blocks.push({ tag: "h2", text: line.slice(3) });
    else if (line.startsWith("### ")) blocks.push({ tag: "h3", text: line.slice(4) });
    else if (line.startsWith("> ")) blocks.push({ tag: "quote", text: line.slice(2) });
    else if (/^\d+\.\s/.test(line)) {
      const index = Number.parseInt(line, 10);
      blocks.push({
        tag: "li",
        text: line.replace(/^\d+\.\s/, ""),
        ordered: true,
        index: Number.isFinite(index) ? index : 1,
      });
    } else if (line.startsWith("- ")) {
      blocks.push({ tag: "li", text: line.slice(2), ordered: false, index: 0 });
    } else {
      blocks.push({ tag: "p", text: line });
    }
  });
  return blocks;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  return escapeHtml(text).replace(
    /\*\*([^*]+)\*\*/g,
    '<strong style="font-weight:600;color:#1f2937">$1</strong>',
  );
}

function getErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof Error && cause.message.trim()) return cause.message.trim();
  return fallback;
}
</script>

<style lang="scss" scoped>
.asst-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f7f7f8;
}

/* 顶部导航 */
.asst-header {
  background: linear-gradient(90deg, var(--brand), #d8344f);
  flex-shrink: 0;
}
.asst-hd-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
}
.asst-hd-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.asst-icon-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.asst-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 2rpx solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.asst-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}
.asst-sub {
  display: block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}

/* 对话区 */
.asst-body {
  flex: 1;
  padding: 24rpx;
  box-sizing: border-box;
}
.asst-welcome {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.asst-msg-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
  align-items: flex-start;
}
.asst-msg-row-user {
  flex-direction: row-reverse;
}
.asst-msg-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.asst-bubble {
  max-width: 76%;
  padding: 20rpx 24rpx;
  border-radius: 24rpx;
}
.asst-bubble-ai {
  background: #ffffff;
  border-top-left-radius: 6rpx;
}
.asst-bubble-user {
  background: var(--brand);
  border-top-right-radius: 6rpx;
}
.asst-bubble-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #1f2937;
}
.asst-bubble-text-user {
  color: #ffffff;
}

/* 能力标签 */
.asst-caps {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-left: 72rpx;
}
.asst-cap {
  font-size: 22rpx;
  color: #6b7280;
  background: #ececed;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
}
.asst-suggest-wrap {
  margin-left: 72rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.asst-suggest-hint {
  font-size: 22rpx;
  color: #9ca3af;
}
.asst-suggest-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.asst-suggest-btn {
  border: 2rpx solid #e5e7eb;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 14rpx 20rpx;
}
.asst-suggest-txt {
  font-size: 24rpx;
  color: #374151;
}

/* 富文本块 */
.asst-h2 {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
  margin: 16rpx 0 10rpx;
}
.asst-h3 {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
  margin: 14rpx 0 6rpx;
}
.asst-quote {
  border-left: 6rpx solid rgba(196, 30, 58, 0.5);
  padding-left: 18rpx;
  margin: 12rpx 0;
}
.asst-quote-txt {
  font-size: 26rpx;
  color: #6b7280;
  font-style: italic;
}
.asst-li {
  display: flex;
  gap: 10rpx;
  margin: 6rpx 0 6rpx 16rpx;
}
.asst-li-dot {
  font-size: 26rpx;
  color: #6b7280;
}
.asst-li-txt {
  font-size: 26rpx;
  line-height: 1.6;
  color: #374151;
  flex: 1;
}
.asst-p {
  display: block;
  font-size: 27rpx;
  line-height: 1.6;
  color: #374151;
  margin: 6rpx 0;
}

/* 操作建议 */
.asst-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 18rpx;
}
.asst-action-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  padding: 10rpx 18rpx;
  background: #ffffff;
}
.asst-action-high {
  border-color: var(--brand);
}
.asst-action-medium {
  border-color: #f59e0b;
}
.asst-action-txt {
  font-size: 22rpx;
  color: #374151;
}
.asst-action-txt-high {
  color: var(--brand);
}
.asst-action-txt-medium {
  color: #d97706;
}

/* 打字动效 */
.asst-typing {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 4rpx 0;
}
.asst-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.6);
  animation: asstBounce 1.2s infinite ease-in-out;
}
.asst-dot2 {
  animation-delay: 0.15s;
}
.asst-dot3 {
  animation-delay: 0.3s;
}
@keyframes asstBounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10rpx);
  }
}

/* 底部输入 */
.asst-input-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 2rpx solid #ececec;
  flex-shrink: 0;
}
.asst-input {
  flex: 1;
  height: 72rpx;
  background: #f3f4f6;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #1f2937;
}
.asst-send-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}
.asst-send-off {
  opacity: 0.4;
}
.asst-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.asst-modal {
  width: 600rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx;
}
.asst-modal-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16rpx;
}
.asst-modal-desc {
  display: block;
  font-size: 26rpx;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 32rpx;
}
.asst-modal-foot {
  display: flex;
  gap: 20rpx;
}
.asst-modal-cancel,
.asst-modal-ok {
  flex: 1;
  height: 76rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.asst-modal-cancel {
  background: #f3f4f6;
}
.asst-modal-cancel-txt {
  font-size: 28rpx;
  color: #374151;
}
.asst-modal-ok {
  background: var(--brand);
}
.asst-modal-ok-txt {
  font-size: 28rpx;
  color: #ffffff;
}

/* 三态 */
.state-loading,
.state-error,
.state-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 32rpx;
}
.state-loading-text {
  font-size: 28rpx;
  color: #999;
}
.state-error-text {
  font-size: 28rpx;
  color: #ef4444;
  text-align: center;
  margin-bottom: 24rpx;
}
.state-empty-text {
  font-size: 28rpx;
  color: #999;
}
.state-retry-btn {
  padding: 16rpx 48rpx;
  background: #7c3aed;
  border-radius: 12rpx;
}
.state-retry-btn text {
  font-size: 26rpx;
  color: #fff;
}

.asst-icon-btn-disabled {
  opacity: 0.45;
}

.asst-bubble-error {
  border: 2rpx solid rgba(196, 30, 58, 0.18);
}

.asst-stream-cursor {
  display: inline;
  margin-left: 4rpx;
  color: var(--brand);
  font-size: 24rpx;
  animation: asstCursorBlink 0.9s steps(1) infinite;
}

@keyframes asstCursorBlink {
  50% {
    opacity: 0.15;
  }
}

.asst-message-error {
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 2rpx solid rgba(196, 30, 58, 0.12);
}

.asst-message-error-text {
  display: block;
  font-size: 22rpx;
  line-height: 1.5;
  color: #b4233d;
}

.asst-message-retry {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
  padding: 10rpx 16rpx;
  border-radius: 12rpx;
  background: rgba(196, 30, 58, 0.08);
  color: var(--brand);
  font-size: 22rpx;
  font-weight: 500;
}

.asst-disclaimer {
  display: block;
  margin-top: 16rpx;
  padding-top: 14rpx;
  border-top: 2rpx solid #f0f1f2;
  font-size: 20rpx;
  line-height: 1.5;
  color: #9ca3af;
}

.asst-input {
  min-width: 0;
}

.asst-modal-ok-disabled {
  opacity: 0.55;
}

.state-loading {
  gap: 20rpx;
}

.state-error-title {
  margin-bottom: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}

.state-retry-btn {
  background: var(--brand);
}

@media (prefers-reduced-motion: reduce) {
  .asst-dot,
  .asst-stream-cursor {
    animation: none;
  }
}
</style>
