<template>
  <div
    class="chat-ui"
    :style="{ maxHeight: config.maxHeight ? toPx(config.maxHeight) : undefined }"
  >
    <!-- 欢迎消息 -->
    <div
      v-if="messages.length === 0 && config.welcomeMessage"
      class="welcome-card"
    >
      <div class="welcome-icon">
        <el-icon :size="36">
          <ChatDotRound />
        </el-icon>
      </div>
      <p>{{ config.welcomeMessage }}</p>
    </div>

    <!-- 消息列表 -->
    <div
      ref="msgListRef"
      class="msg-list"
    >
      <div
        v-if="messages.length === 0 && !config.welcomeMessage"
        class="empty-hint"
      >
        <el-empty
          description="开始对话吧"
          :image-size="60"
        />
      </div>

      <template
        v-for="(msg, idx) in messages"
        :key="msg.id"
      >
        <ChatBubble
          :message="msg"
          :show-sources="config.showSources ?? true"
          :show-feedback="config.showFeedback ?? true"
          :show-retry="config.showRetry ?? true"
          @feedback="(type) => onFeedback(idx, type)"
          @retry="retry(idx)"
          @source-click="onSourceClick"
        />
      </template>
    </div>

    <!-- 错误提示 -->
    <el-alert
      v-if="errorMsg"
      :title="errorMsg"
      type="error"
      closable
      style="margin:8px 0"
      @close="errorMsg = ''"
    />

    <!-- 输入区 -->
    <ChatInput
      ref="inputRef"
      :placeholder="config.placeholder"
      :disabled="false"
      :loading="streaming"
      @send="send"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { ChatDotRound } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ChatBubble from './ChatBubble.vue'
import ChatInput from './ChatInput.vue'
import { chatStream, chatNonStream, createAssistantMsg, createUserMsg } from './sse'
import type { ChatMessage, ChatSource, ChatUIConfig } from './types'

const props = withDefaults(defineProps<{
  config: ChatUIConfig
  initialMessages?: ChatMessage[]
}>(), {
  initialMessages: () => [],
})

const emit = defineEmits<{
  messageSent: [msg: ChatMessage]
  messageReceived: [msg: ChatMessage]
  feedbackGiven: [msgId: string, type: 'like' | 'dislike']
}>()

const messages = ref<ChatMessage[]>([...props.initialMessages])
const streaming = ref(false)
const errorMsg = ref('')
const msgListRef = ref<HTMLElement>()

function toPx(v: string | number): string {
  return typeof v === 'number' ? `${v}px` : v
}

function scrollToBottom() {
  nextTick(() => {
    if (msgListRef.value) {
      msgListRef.value.scrollTop = msgListRef.value.scrollHeight
    }
  })
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value || '未知错误'))
}

/** 暴露：供外部添加消息 */
function addMessage(msg: ChatMessage) {
  messages.value.push(msg)
  scrollToBottom()
}

/** 暴露：清除所有消息 */
function clearMessages() {
  messages.value = []
  errorMsg.value = ''
}

/** 发送消息 */
async function send(text: string) {
  errorMsg.value = ''

  // 用户消息
  const userMsg = createUserMsg(text)
  messages.value.push(userMsg)
  emit('messageSent', userMsg)
  scrollToBottom()

  // 助手占位
  const assistantMsg = createAssistantMsg()
  messages.value.push(assistantMsg)
  streaming.value = true
  scrollToBottom()

  const body = {
    messages: messages.value
      .filter(m => !m.isStreaming)
      .map(m => ({ role: m.role, content: m.content })),
    ...props.config.extraBody,
  }

  // 如果有 system context，加入
  if (props.config.systemContext) {
    body.messages = [
      { role: 'system', content: props.config.systemContext },
      ...body.messages,
    ]
  }

  try {
    await chatStream(
      props.config.apiEndpoint,
      body,
      {
        onChunk(content) {
          assistantMsg.content += content
          scrollToBottom()
        },
        onSource(source) {
          if (!assistantMsg.sources) assistantMsg.sources = []
          assistantMsg.sources.push(source)
        },
        onDone(usage) {
          assistantMsg.isStreaming = false
          assistantMsg.usage = usage
          streaming.value = false
          emit('messageReceived', { ...assistantMsg })
          scrollToBottom()
        },
        onError(message) {
          throw new Error(message)
        },
      },
    )
  } catch (e: unknown) {
    const streamError = toError(e)
    assistantMsg.isStreaming = false
    streaming.value = false

    // SSE 失败 → 尝试非流式 fallback
    if (props.config.fallbackEndpoint) {
      errorMsg.value = '流式连接失败，已切换至普通模式'
      try {
        const result = await chatNonStream(props.config.fallbackEndpoint, body)
        assistantMsg.content = result.content
        if (result.sources) assistantMsg.sources = result.sources
        if (result.usage) assistantMsg.usage = result.usage
        emit('messageReceived', { ...assistantMsg })
      } catch (fallbackErr: unknown) {
        assistantMsg.content = `回答失败：${toError(fallbackErr).message}`
      }
    } else {
      assistantMsg.content = streamError.name === 'AbortError'
        ? '请求已取消'
        : `流式连接异常：${streamError.message || '请检查网络'}`

      if (assistantMsg.content === '流式连接异常：不支持流式响应') {
        // 无 fallback，提示
      }
    }
  }
}

/** 重试 */
function retry(idx: number) {
  const msg = messages.value[idx]
  if (!msg || msg.role !== 'assistant') return
  // 删除这条及之后的消息，重新发送上一条用户消息
  const prevIdx = idx - 1
  if (prevIdx >= 0 && messages.value[prevIdx].role === 'user') {
    const userText = messages.value[prevIdx].content
    messages.value.splice(prevIdx)
    send(userText)
  }
}

/** 反馈 */
function onFeedback(idx: number, type: 'like' | 'dislike') {
  const msg = messages.value[idx]
  if (!msg) return
  msg.feedback = msg.feedback === type ? null : type
  emit('feedbackGiven', msg.id, type)
  if (type === 'dislike') {
    ElMessage.info('已记录反馈，感谢你的帮助')
  }
}

/** 来源引用点击 */
function onSourceClick(source: ChatSource) {
  ElMessage.info(`来源：${source.title}`)
}

defineExpose({ addMessage, clearMessages, messages })
</script>

<style scoped>
.chat-ui { display:flex; flex-direction:column; height:100%; min-height:400px }
.msg-list { flex:1; overflow-y:auto; padding:8px 4px; display:flex; flex-direction:column; gap:12px }
.msg-list::-webkit-scrollbar { width:4px }
.msg-list::-webkit-scrollbar-thumb { background:#dcdfe6; border-radius:2px }
.empty-hint { display:flex; align-items:center; justify-content:center; flex:1 }
.welcome-card { text-align:center; padding:32px 16px; color:#909399 }
.welcome-icon { margin-bottom:12px; color:#c0c4cc }
</style>
