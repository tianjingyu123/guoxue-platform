<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view
      class="header"
      :style="{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)` }"
    >
      <view class="header-left">
        <text
          class="back-btn"
          @click="uni.navigateBack"
        >
          ‹
        </text>
        <image
          v-if="config?.avatar"
          :src="config.avatar"
          class="header-avatar"
          mode="aspectFill"
        />
        <view class="header-info">
          <text class="header-name">
            {{ config?.name || '站长助理' }}
          </text>
          <text class="header-desc">
            AI 运营助手
          </text>
        </view>
      </view>
      <view class="header-right">
        <text
          class="header-action"
          @click="showClearDialog = true"
        >
          🗑️
        </text>
      </view>
    </view>

    <!-- 对话区域 -->
    <scroll-view
      class="chat-area"
      scroll-y
      :scroll-into-view="scrollToId"
      scroll-with-animation
      @click="hideKeyboard"
    >
      <!-- 欢迎消息 -->
      <view
        v-if="messages.length === 0 && !isSending"
        class="welcome"
      >
        <view class="ai-msg">
          <image
            v-if="config?.avatar"
            :src="config.avatar"
            class="ai-avatar"
            mode="aspectFill"
          />
          <view class="ai-bubble">
            <text class="ai-text">
              {{ config?.welcomeMessage || '您好，我是分站智能助手，有什么可以帮您？' }}
            </text>
          </view>
        </view>
        <!-- 能力标签 -->
        <view
          v-if="config?.capabilities?.length"
          class="capabilities"
        >
          <view
            v-for="(cap, idx) in config.capabilities"
            :key="idx"
            class="cap-tag"
          >
            <text>{{ cap }}</text>
          </view>
        </view>
        <!-- 推荐问题 -->
        <view
          v-if="config?.suggestions?.length"
          class="suggestions"
        >
          <text class="suggest-title">
            您可以试着问我：
          </text>
          <view class="suggest-list">
            <text
              v-for="s in config.suggestions"
              :key="s.id || s.text"
              class="suggest-item"
              @click="handleSend(s.text)"
            >
              {{ s.text }}
            </text>
          </view>
        </view>
      </view>

      <!-- 消息列表 -->
      <view
        v-for="msg in messages"
        :key="msg.id"
        class="msg-row"
        :class="{ 'msg-mine': msg.role === 'user' }"
      >
        <image
          v-if="msg.role === 'assistant' && config?.avatar"
          :src="config.avatar"
          class="ai-avatar"
          mode="aspectFill"
        />
        <view
          class="msg-bubble"
          :class="{ 'msg-bubble-mine': msg.role === 'user' }"
        >
          <view
            v-if="msg.role === 'assistant'"
            class="msg-content"
          >
            <view
              v-for="(block, bi) in parseContent(msg.content)"
              :key="bi"
            >
              <!-- 标题 -->
              <text
                v-if="block.type === 'h2'"
                class="md-h2"
              >
                {{ block.text }}
              </text>
              <text
                v-else-if="block.type === 'h3'"
                class="md-h3"
              >
                {{ block.text }}
              </text>
              <!-- 引用 -->
              <view
                v-else-if="block.type === 'quote'"
                class="md-quote"
              >
                <text>{{ block.text }}</text>
              </view>
              <!-- 列表 -->
              <text
                v-else-if="block.type === 'li'"
                class="md-li"
              >
                • {{ block.text }}
              </text>
              <!-- 段落 -->
              <text
                v-else-if="block.type === 'p'"
                class="md-p"
              >
                {{ block.text }}
              </text>
              <!-- 空行 -->
              <view
                v-else-if="block.type === 'br'"
                class="md-br"
              />
            </view>
            <!-- 图表 -->
            <view
              v-if="msg.chart"
              class="chart-block"
            >
              <text class="chart-title">
                {{ msg.chart.title }}
              </text>
              <!-- 柱状图 -->
              <view
                v-if="msg.chart.type === 'bar'"
                class="bar-chart"
              >
                <view
                  v-for="(d, di) in msg.chart.data"
                  :key="di"
                  class="bar-item"
                >
                  <view
                    class="bar-fill"
                    :style="{ height: (d.value / maxChartValue(msg.chart.data)) * 100 + '%' }"
                  />
                  <text class="bar-label">
                    {{ d.label }}
                  </text>
                </view>
              </view>
              <!-- 饼图 -->
              <view
                v-if="msg.chart.type === 'pie'"
                class="pie-chart"
              >
                <view
                  v-for="(d, di) in msg.chart.data"
                  :key="di"
                  class="pie-row"
                >
                  <view
                    class="pie-dot"
                    :style="{ background: d.color || '#C41E3A' }"
                  />
                  <text class="pie-label">
                    {{ d.label }}
                  </text>
                  <text class="pie-value">
                    {{ d.value }}
                  </text>
                </view>
              </view>
            </view>
            <!-- 表格 -->
            <view
              v-if="msg.table"
              class="table-block"
            >
              <text class="table-title">
                {{ msg.table.title }}
              </text>
              <view class="table-wrap">
                <view class="table-row table-header">
                  <text
                    v-for="(h, hi) in msg.table.headers"
                    :key="hi"
                    class="table-cell"
                  >
                    {{ h }}
                  </text>
                </view>
                <view
                  v-for="(row, ri) in msg.table.rows"
                  :key="ri"
                  class="table-row"
                >
                  <text
                    v-for="(cell, ci) in row"
                    :key="ci"
                    class="table-cell"
                  >
                    {{ cell }}
                  </text>
                </view>
              </view>
            </view>
            <!-- 操作建议 -->
            <view
              v-if="msg.actions?.length"
              class="actions-block"
            >
              <text
                v-for="(act, ai) in msg.actions"
                :key="ai"
                class="action-btn"
                :class="{ 'action-high': act.priority === 'high', 'action-med': act.priority === 'medium' }"
                @click="goAction(act)"
              >
                {{ act.title }} →
              </text>
            </view>
          </view>
          <text
            v-else
            class="msg-text"
          >
            {{ msg.content }}
          </text>
        </view>
      </view>

      <!-- 流式输出 -->
      <view
        v-if="isSending"
        class="msg-row"
      >
        <image
          v-if="config?.avatar"
          :src="config.avatar"
          class="ai-avatar"
          mode="aspectFill"
        />
        <view class="msg-bubble">
          <view
            v-if="streamingContent"
            class="msg-content"
          >
            <view
              v-for="(block, bi) in parseContent(streamingContent)"
              :key="bi"
            >
              <text
                v-if="block.type === 'h2'"
                class="md-h2"
              >
                {{ block.text }}
              </text>
              <text
                v-else-if="block.type === 'h3'"
                class="md-h3"
              >
                {{ block.text }}
              </text>
              <view
                v-else-if="block.type === 'quote'"
                class="md-quote"
              >
                <text>{{ block.text }}</text>
              </view>
              <text
                v-else-if="block.type === 'li'"
                class="md-li"
              >
                • {{ block.text }}
              </text>
              <text
                v-else-if="block.type === 'p'"
                class="md-p"
              >
                {{ block.text }}
              </text>
              <view
                v-else-if="block.type === 'br'"
                class="md-br"
              />
            </view>
            <view
              v-if="streamingChart"
              class="chart-block"
            >
              <text class="chart-title">
                {{ streamingChart.title }}
              </text>
              <view
                v-if="streamingChart.type === 'bar'"
                class="bar-chart"
              >
                <view
                  v-for="(d, di) in streamingChart.data"
                  :key="di"
                  class="bar-item"
                >
                  <view
                    class="bar-fill"
                    :style="{ height: (d.value / maxChartValue(streamingChart.data)) * 100 + '%' }"
                  />
                  <text class="bar-label">
                    {{ d.label }}
                  </text>
                </view>
              </view>
              <view
                v-if="streamingChart.type === 'pie'"
                class="pie-chart"
              >
                <view
                  v-for="(d, di) in streamingChart.data"
                  :key="di"
                  class="pie-row"
                >
                  <view
                    class="pie-dot"
                    :style="{ background: d.color || '#C41E3A' }"
                  />
                  <text class="pie-label">
                    {{ d.label }}
                  </text>
                  <text class="pie-value">
                    {{ d.value }}
                  </text>
                </view>
              </view>
            </view>
            <view
              v-if="streamingTable"
              class="table-block"
            >
              <text class="table-title">
                {{ streamingTable.title }}
              </text>
              <view class="table-wrap">
                <view class="table-row table-header">
                  <text
                    v-for="(h, hi) in streamingTable.headers"
                    :key="hi"
                    class="table-cell"
                  >
                    {{ h }}
                  </text>
                </view>
                <view
                  v-for="(row, ri) in streamingTable.rows"
                  :key="ri"
                  class="table-row"
                >
                  <text
                    v-for="(cell, ci) in row"
                    :key="ci"
                    class="table-cell"
                  >
                    {{ cell }}
                  </text>
                </view>
              </view>
            </view>
          </view>
          <view
            v-else
            class="typing"
          >
            <view class="typing-dot" />
            <view class="typing-dot" />
            <view class="typing-dot" />
          </view>
        </view>
      </view>

      <view id="chat-bottom" />
    </scroll-view>

    <!-- 底部输入区 -->
    <view class="input-bar">
      <input
        v-model="inputText"
        class="input-field"
        placeholder="输入您的问题..."
        :disabled="isSending"
        confirm-type="send"
        @confirm="handleSend()"
      >
      <button
        class="btn-send"
        :disabled="!inputText.trim() || isSending"
        @click="handleSend()"
      >
        <text>发送</text>
      </button>
    </view>

    <!-- 清除确认弹窗 -->
    <view
      v-if="showClearDialog"
      class="dialog-overlay"
      @click="showClearDialog = false"
    >
      <view
        class="dialog-content"
        @click.stop
      >
        <text class="dialog-title">
          清除对话
        </text>
        <text class="dialog-desc">
          确定要清除所有对话记录吗？此操作不可恢复。
        </text>
        <view class="dialog-actions">
          <text
            class="dialog-btn dialog-btn-cancel"
            @click="showClearDialog = false"
          >
            取消
          </text>
          <text
            class="dialog-btn dialog-btn-confirm"
            @click="handleClearSession"
          >
            确定清除
          </text>
        </view>
      </view>
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="false"
      skeleton-type="list"
      @retry="fetchData"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import DataState from '../../components/DataState.vue'

const loading = ref(true)
const loadError = ref<string | null>(null)
const config = ref<any>(null)
const messages = ref<any[]>([])
const inputText = ref('')
const isSending = ref(false)
const showClearDialog = ref(false)
const streamingContent = ref('')
const streamingChart = ref<any>(null)
const streamingTable = ref<any>(null)
const streamingActions = ref<any[]>([])
const scrollToId = ref('chat-bottom')
const themeColor = ref('#C41E3A')

function getStationCode(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  return page?.options?.code || page?.options?.stationCode || ''
}

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true; loadError.value = null
  try {
    const api = require('../../api')
    const [configRes, sessionRes]: any[] = await Promise.all([
      api.stationApi.getStationAssistantConfig?.().catch(() => ({})),
      api.stationApi.getAssistantSession?.().catch(() => ({})),
    ])
    const cfg = configRes?.data || configRes || {}
    config.value = cfg
    if (cfg.theme?.primaryColor) themeColor.value = cfg.theme.primaryColor
    const sessionMsgs = sessionRes?.data?.messages || sessionRes?.messages || []
    if (sessionMsgs.length > 0) {
      messages.value = sessionMsgs
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || null
  } finally {
    loading.value = false
  }
}

function parseContent(content: string): { type: string; text: string }[] {
  if (!content) return []
  const lines = content.split('\n')
  const blocks: { type: string; text: string }[] = []
  for (const line of lines) {
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3) })
    } else if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4) })
    } else if (line.startsWith('> ')) {
      blocks.push({ type: 'quote', text: line.slice(2) })
    } else if (line.startsWith('- ')) {
      blocks.push({ type: 'li', text: line.slice(2) })
    } else if (line.match(/^\d+\.\s/)) {
      blocks.push({ type: 'li', text: line.replace(/^\d+\.\s/, '') })
    } else if (!line.trim()) {
      blocks.push({ type: 'br', text: '' })
    } else {
      blocks.push({ type: 'p', text: line })
    }
  }
  return blocks
}

function maxChartValue(data: any[]): number {
  return Math.max(...data.map((d: any) => d.value), 1)
}

async function handleSend(text?: string) {
  const content = text || inputText.value.trim()
  if (!content || isSending.value) return

  const userMsg: any = {
    id: 'user_' + Date.now(),
    role: 'user',
    type: 'text',
    content,
    createdAt: new Date().toISOString(),
  }
  messages.value.push(userMsg)
  inputText.value = ''
  isSending.value = true
  streamingContent.value = ''
  streamingChart.value = null
  streamingTable.value = null
  streamingActions.value = []

  try {
    const api = require('../../api')
    await api.stationApi.sendAssistantMessage(content, {
      onToken: (token: string) => {
        streamingContent.value += token
        scrollToBottom()
      },
      onChart: (chart: any) => {
        streamingChart.value = chart
      },
      onTable: (table: any) => {
        streamingTable.value = table
      },
      onActions: (actions: any[]) => {
        streamingActions.value = actions
      },
      onComplete: (msg: any) => {
        messages.value.push({
          ...msg,
          chart: streamingChart.value,
          table: streamingTable.value,
          actions: streamingActions.value,
        })
        streamingContent.value = ''
        streamingChart.value = null
        streamingTable.value = null
        streamingActions.value = []
        isSending.value = false
        scrollToBottom()
      },
      onError: () => {
        isSending.value = false
        uni.showToast({ title: '回复失败，请重试', icon: 'none' })
      },
    })
  } catch {
    isSending.value = false
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

async function handleClearSession() {
  try {
    const api = require('../../api')
    await api.stationApi.clearAssistantSession?.()
    messages.value = []
    showClearDialog.value = false
    uni.showToast({ title: '对话已清除' })
  } catch {
    uni.showToast({ title: '清除失败', icon: 'none' })
  }
}

function scrollToBottom() {
  nextTick(() => {
    scrollToId.value = 'chat-bottom'
  })
}

function goAction(action: any) {
  if (action.link) {
    uni.navigateTo({ url: action.link })
  }
}

function hideKeyboard() {
  uni.hideKeyboard()
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; background: #F5F0E8; }

.header { padding: 60rpx 24rpx 20rpx; display: flex; align-items: center; justify-content: space-between; }
.header-left { display: flex; align-items: center; gap: 16rpx; }
.back-btn { font-size: 44rpx; color: #fff; line-height: 1; }
.header-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; border: 2rpx solid rgba(255,255,255,0.3); }
.header-info { }
.header-name { font-size: 30rpx; font-weight: 600; color: #fff; display: block; }
.header-desc { font-size: 22rpx; color: rgba(255,255,255,0.7); }
.header-action { font-size: 36rpx; }

.chat-area { flex: 1; padding: 24rpx; overflow-y: auto; }

.welcome { margin-bottom: 24rpx; }
.ai-msg { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.ai-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; flex-shrink: 0; }
.ai-bubble { background: #fff; border-radius: 24rpx 24rpx 24rpx 8rpx; padding: 24rpx; max-width: 80%; }
.ai-text { font-size: 26rpx; color: #2C2C2C; line-height: 1.6; }

.capabilities { display: flex; flex-wrap: wrap; gap: 12rpx; margin-left: 80rpx; margin-bottom: 20rpx; }
.cap-tag { padding: 8rpx 20rpx; background: #fff; border-radius: 20rpx; font-size: 22rpx; color: #C41E3A; border: 1rpx solid rgba(196,30,58,0.15); }

.suggestions { margin-left: 80rpx; }
.suggest-title { font-size: 22rpx; color: #999; display: block; margin-bottom: 12rpx; }
.suggest-list { display: flex; flex-wrap: wrap; gap: 12rpx; }
.suggest-item { padding: 12rpx 24rpx; background: #fff; border-radius: 20rpx; font-size: 24rpx; color: #666; border: 1rpx solid #E8E0D5; }

.msg-row { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.msg-mine { justify-content: flex-end; }
.msg-bubble { max-width: 75%; padding: 20rpx 24rpx; border-radius: 24rpx; background: #fff; }
.msg-bubble-mine { background: #C41E3A; border-radius: 24rpx 24rpx 8rpx 24rpx; }
.msg-text { font-size: 26rpx; color: #fff; line-height: 1.6; }
.msg-content { font-size: 26rpx; color: #2C2C2C; line-height: 1.6; }

.md-h2 { font-size: 32rpx; font-weight: bold; color: #2C2C2C; display: block; margin: 20rpx 0 12rpx; }
.md-h3 { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; margin: 16rpx 0 8rpx; }
.md-quote { border-left: 4rpx solid #C41E3A; padding: 12rpx 16rpx; margin: 12rpx 0; background: rgba(196,30,58,0.04); border-radius: 4rpx; color: #666; font-style: italic; }
.md-li { display: block; padding: 4rpx 0; color: #2C2C2C; }
.md-p { display: block; margin: 8rpx 0; color: #2C2C2C; }
.md-br { height: 12rpx; }

.chart-block { background: #F9F8F6; border-radius: 12rpx; padding: 20rpx; margin: 16rpx 0; }
.chart-title { font-size: 24rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 16rpx; }
.bar-chart { display: flex; align-items: flex-end; gap: 16rpx; height: 200rpx; }
.bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.bar-fill { width: 100%; background: linear-gradient(180deg, #C41E3A, rgba(196,30,58,0.4)); border-radius: 8rpx 8rpx 0 0; min-height: 8rpx; }
.bar-label { font-size: 20rpx; color: #999; margin-top: 8rpx; }
.pie-chart { display: flex; flex-direction: column; gap: 12rpx; }
.pie-row { display: flex; align-items: center; gap: 12rpx; }
.pie-dot { width: 20rpx; height: 20rpx; border-radius: 50%; }
.pie-label { flex: 1; font-size: 24rpx; color: #666; }
.pie-value { font-size: 24rpx; color: #2C2C2C; font-weight: 500; }

.table-block { background: #F9F8F6; border-radius: 12rpx; padding: 20rpx; margin: 16rpx 0; overflow-x: auto; }
.table-title { font-size: 24rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 12rpx; }
.table-wrap { }
.table-row { display: flex; border-bottom: 1rpx solid #E8E0D5; }
.table-header .table-cell { font-weight: 600; color: #2C2C2C; background: #F0EDE5; }
.table-cell { flex: 1; padding: 12rpx 8rpx; font-size: 22rpx; color: #666; min-width: 0; }

.actions-block { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 20rpx; font-size: 22rpx; border: 1rpx solid #E8E0D5; color: #666; }
.action-high { border-color: #C41E3A; color: #C41E3A; }
.action-med { border-color: #F59E0B; color: #D97706; }

.typing { display: flex; gap: 8rpx; padding: 8rpx 0; }
.typing-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #ccc; animation: typing 1.4s infinite; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
  30% { opacity: 1; transform: scale(1.2); }
}

.input-bar { display: flex; gap: 16rpx; padding: 16rpx 24rpx; background: #fff; border-top: 1rpx solid #E8E0D5; align-items: center; }
.input-field { flex: 1; height: 72rpx; border: 1rpx solid #E8E0D5; border-radius: 36rpx; padding: 0 28rpx; font-size: 26rpx; background: #F9F8F6; }
.btn-send { height: 72rpx; padding: 0 36rpx; background: #C41E3A; color: #fff; border: none; border-radius: 36rpx; font-size: 28rpx; font-weight: 500; display: flex; align-items: center; justify-content: center; }
.btn-send[disabled] { opacity: 0.4; }

.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; }
.dialog-content { background: #fff; border-radius: 24rpx; padding: 40rpx; width: 560rpx; }
.dialog-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 16rpx; }
.dialog-desc { font-size: 26rpx; color: #666; line-height: 1.5; display: block; margin-bottom: 32rpx; }
.dialog-actions { display: flex; gap: 16rpx; }
.dialog-btn { flex: 1; height: 80rpx; border-radius: 16rpx; font-size: 28rpx; display: flex; align-items: center; justify-content: center; }
.dialog-btn-cancel { background: #F5F0E8; color: #666; }
.dialog-btn-confirm { background: #C41E3A; color: #fff; }
</style>
