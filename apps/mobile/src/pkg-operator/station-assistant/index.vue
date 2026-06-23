<template>
  <view class="asst-page">
    <!-- 顶部导航 -->
    <view class="asst-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="asst-hd-row">
        <view class="asst-hd-left">
          <view class="asst-icon-btn" @tap="goBack">
            <app-icon name="arrow-left" :size="40" color="#ffffff" />
          </view>
          <view class="asst-avatar">
            <app-icon name="sparkles" :size="36" color="#ffffff" />
          </view>
          <view>
            <text class="asst-name">{{ config.name }}</text>
            <text class="asst-sub">AI 运营助手</text>
          </view>
        </view>
        <view class="asst-icon-btn" @tap="showClear = true">
          <app-icon name="trash-2" :size="38" color="#ffffff" />
        </view>
      </view>
    </view>

    <!-- 对话区域 -->
    <scroll-view class="asst-body" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
      <!-- 三态：加载中 -->
      <view v-if="loading" class="state-loading"><text class="state-loading-text">加载中...</text></view>
      <!-- 三态：错误 -->
      <view v-else-if="error" class="state-error">
        <text class="state-error-text">{{ error }}</text>
        <view class="state-retry-btn" @tap="retry"><text>重试</text></view>
      </view>
      <!-- 三态：空数据 -->
      <view v-else-if="isEmpty" class="state-empty">
        <text class="state-empty-text">暂无数据</text>
      </view>
      <template v-else>
      <!-- 欢迎区 -->
      <view v-if="messages.length === 0 && !sending" class="asst-welcome">
        <view class="asst-msg-row">
          <view class="asst-msg-avatar">
            <app-icon name="sparkles" :size="32" color="#C41E3A" />
          </view>
          <view class="asst-bubble asst-bubble-ai">
            <text class="asst-bubble-text">{{ config.welcomeMessage }}</text>
          </view>
        </view>
        <view class="asst-caps">
          <text v-for="(cap, i) in config.capabilities" :key="i" class="asst-cap">{{ cap }}</text>
        </view>
        <view class="asst-suggest-wrap">
          <text class="asst-suggest-hint">您可以试着问我：</text>
          <view class="asst-suggest-list">
            <view v-for="s in config.suggestions" :key="s.id" class="asst-suggest-btn" @tap="send(s.text)">
              <text class="asst-suggest-txt">{{ s.text }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 消息列表 -->
      <view
        v-for="m in messages"
        :key="m.id"
        class="asst-msg-row"
        :class="{ 'asst-msg-row-user': m.role === 'user' }"
      >
        <view v-if="m.role === 'assistant'" class="asst-msg-avatar">
          <app-icon name="sparkles" :size="32" color="#C41E3A" />
        </view>
        <view
          class="asst-bubble"
          :class="m.role === 'user' ? 'asst-bubble-user' : 'asst-bubble-ai'"
        >
          <!-- 用户纯文本 -->
          <text v-if="m.role === 'user'" class="asst-bubble-text asst-bubble-text-user">{{ m.content }}</text>
          <!-- AI 富文本 -->
          <view v-else>
            <view v-for="(blk, bi) in parseMarkdown(m.content)" :key="bi">
              <text v-if="blk.tag === 'h2'" class="asst-h2">{{ blk.text }}</text>
              <text v-else-if="blk.tag === 'h3'" class="asst-h3">{{ blk.text }}</text>
              <view v-else-if="blk.tag === 'quote'" class="asst-quote"><text class="asst-quote-txt">{{ blk.text }}</text></view>
              <view v-else-if="blk.tag === 'li'" class="asst-li">
                <text class="asst-li-dot">{{ blk.ordered ? blk.index + '.' : '•' }}</text>
                <rich-text class="asst-li-txt" :nodes="renderInline(blk.text)" />
              </view>
              <rich-text v-else class="asst-p" :nodes="renderInline(blk.text)" />
            </view>
            <!-- 图表 -->
            <view v-if="m.chart" class="asst-chart">
              <text class="asst-chart-title">{{ m.chart.title }}</text>
              <!-- 柱状 -->
              <view v-if="m.chart.type === 'line'" class="asst-bars">
                <view v-for="(d, di) in m.chart.data" :key="di" class="asst-bar-col">
                  <view class="asst-bar" :style="{ height: barHeight(m.chart, d.value) }" />
                  <text class="asst-bar-label">{{ d.label }}</text>
                </view>
              </view>
              <!-- 饼图（列表式） -->
              <view v-else class="asst-pie-list">
                <view v-for="(d, di) in m.chart.data" :key="di" class="asst-pie-row">
                  <view class="asst-pie-dot" :style="{ background: d.color || '#C41E3A' }" />
                  <text class="asst-pie-label">{{ d.label }}</text>
                  <text class="asst-pie-val">{{ d.value }}人</text>
                  <text class="asst-pie-pct">({{ piePct(m.chart, d.value) }}%)</text>
                </view>
              </view>
            </view>
            <!-- 表格 -->
            <view v-if="m.table" class="asst-table">
              <text class="asst-chart-title">{{ m.table.title }}</text>
              <view class="asst-tr asst-tr-head">
                <text v-for="(h, hi) in m.table.headers" :key="hi" class="asst-th">{{ h }}</text>
              </view>
              <view v-for="(row, ri) in m.table.rows" :key="ri" class="asst-tr">
                <text v-for="(cell, ci) in row" :key="ci" class="asst-td">{{ cell }}</text>
              </view>
            </view>
            <!-- 操作建议 -->
            <view v-if="m.actions && m.actions.length" class="asst-actions">
              <view
                v-for="(a, ai) in m.actions"
                :key="ai"
                class="asst-action-btn"
                :class="'asst-action-' + a.priority"
                @tap="onAction(a)"
              >
                <text class="asst-action-txt" :class="'asst-action-txt-' + a.priority">{{ a.title }}</text>
                <app-icon v-if="a.link" name="external-link" :size="22" :color="actionColor(a.priority)" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 流式占位（打字动效） -->
      <view v-if="sending" class="asst-msg-row">
        <view class="asst-msg-avatar">
          <app-icon name="sparkles" :size="32" color="#C41E3A" />
        </view>
        <view class="asst-bubble asst-bubble-ai">
          <view class="asst-typing">
            <view class="asst-dot asst-dot1" />
            <view class="asst-dot asst-dot2" />
            <view class="asst-dot asst-dot3" />
          </view>
        </view>
      </view>

      </template>
      <view style="height: 24rpx" />
    </scroll-view>

    <!-- 底部输入区 -->
    <view class="asst-input-bar">
      <view class="asst-voice-btn" :class="{ 'asst-voice-on': recording }" @tap="recording = !recording">
        <app-icon :name="recording ? 'mic-off' : 'mic'" :size="40" :color="recording ? '#ef4444' : '#6b7280'" />
      </view>
      <input
        v-model="inputText"
        class="asst-input"
        placeholder="输入您的问题..."
        :disabled="submitting || sending"
        confirm-type="send"
        @confirm="send()"
      />
      <view class="asst-send-btn" :class="{ 'asst-send-off': !inputText.trim() || submitting || sending }" @tap="send()">
        <app-icon name="send" :size="38" color="#ffffff" />
      </view>
    </view>
    <view v-if="recording" class="asst-recording">
      <view class="asst-rec-dot" />
      <text class="asst-rec-txt">正在录音...</text>
    </view>

    <!-- 清除对话确认 -->
    <view v-if="showClear" class="asst-modal-mask" @tap="showClear = false">
      <view class="asst-modal" @tap.stop>
        <text class="asst-modal-title">清除对话</text>
        <text class="asst-modal-desc">确定要清除所有对话记录吗？此操作不可恢复。</text>
        <view class="asst-modal-foot">
          <view class="asst-modal-cancel" @tap="showClear = false"><text class="asst-modal-cancel-txt">取消</text></view>
          <view class="asst-modal-ok" @tap="clearSession"><text class="asst-modal-ok-txt">确定清除</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { stationAssistantApi, type AssistantMessage, type ActionSuggestion, type ChartData } from '@/lib/station-assistant-data'

const statusBarHeight = ref(20)
const loading = ref(true)
const error = ref('')
const isEmpty = ref(false)
const config = ref<any>({})
const messages = ref<AssistantMessage[]>([])
const inputText = ref('')
const sending = ref(false)
const submitting = ref(false)
const recording = ref(false)
const showClear = ref(false)
const scrollTop = ref(0)

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
  } catch (e) {}
})

onMounted(async () => {
  await loadConfig()
})

async function loadConfig() {
  loading.value = true
  error.value = ''
  try {
    const res = await stationAssistantApi.getConfig()
    config.value = res || {}
    isEmpty.value = !res || Object.keys(res).length === 0
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function retry() { await loadConfig() }

function goBack() {
  uni.navigateBack({ delta: 1 })
}

function scrollToBottom() {
  nextTick(() => {
    scrollTop.value = 100000 + Math.random()
  })
}

async function send(text?: string) {
  const content = (text || inputText.value).trim()
  if (!content || sending.value || submitting.value) return
  messages.value.push({ id: 'user_' + Date.now(), role: 'user', content })
  inputText.value = ''
  sending.value = true
  submitting.value = true
  scrollToBottom()
  try {
    const reply = await stationAssistantApi.sendMessage(content)
    messages.value.push({
      id: 'ai_' + Date.now(),
      role: 'assistant',
      content: reply.text,
      chart: reply.chart,
      table: reply.table,
      actions: reply.actions,
    })
  } catch (e: any) {
    messages.value.push({
      id: 'ai_' + Date.now(),
      role: 'assistant',
      content: '抱歉，我暂时无法回复，请稍后再试。',
    })
  } finally {
    sending.value = false
    submitting.value = false
    scrollToBottom()
  }
}

function clearSession() {
  messages.value = []
  showClear.value = false
}

function onAction(a: ActionSuggestion) {
  uni.showToast({ title: a.link ? '前往：' + a.title : a.title, icon: 'none' })
}

function actionColor(priority: string) {
  if (priority === 'high') return '#C41E3A'
  if (priority === 'medium') return '#d97706'
  return '#6b7280'
}

// ---- 简易 markdown 解析 ----
interface Block { tag: string; text: string; ordered?: boolean; index?: number }
function parseMarkdown(content: string): Block[] {
  const blocks: Block[] = []
  content.split('\n').forEach((line) => {
    if (!line.trim()) return
    if (line.startsWith('## ')) blocks.push({ tag: 'h2', text: line.slice(3) })
    else if (line.startsWith('### ')) blocks.push({ tag: 'h3', text: line.slice(4) })
    else if (line.startsWith('> ')) blocks.push({ tag: 'quote', text: line.slice(2) })
    else if (/^\d+\.\s/.test(line)) blocks.push({ tag: 'li', text: line.replace(/^\d+\.\s/, ''), ordered: true, index: parseInt(line) })
    else if (line.startsWith('- ')) blocks.push({ tag: 'li', text: line.slice(2), ordered: false })
    else blocks.push({ tag: 'p', text: line })
  })
  return blocks
}

// 行内加粗 -> rich-text nodes
function renderInline(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight:600;color:#1f2937">$1</strong>')
}

function barHeight(chart: ChartData, value: number) {
  const max = Math.max(...chart.data.map((d) => d.value))
  return ((value / max) * 100).toFixed(0) + '%'
}
function piePct(chart: ChartData, value: number) {
  const total = chart.data.reduce((s, d) => s + d.value, 0)
  return ((value / total) * 100).toFixed(1)
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
  background: linear-gradient(90deg, #C41E3A, #d8344f);
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
  background: #C41E3A;
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

/* 图表 */
.asst-chart,
.asst-table {
  background: rgba(0, 0, 0, 0.03);
  border-radius: 16rpx;
  padding: 24rpx;
  margin: 18rpx 0;
}
.asst-chart-title {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 18rpx;
}
.asst-bars {
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
  height: 240rpx;
}
.asst-bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  height: 100%;
  justify-content: flex-end;
}
.asst-bar {
  width: 100%;
  background: rgba(196, 30, 58, 0.8);
  border-radius: 8rpx 8rpx 0 0;
  min-height: 8rpx;
}
.asst-bar-label {
  font-size: 20rpx;
  color: #9ca3af;
}
.asst-pie-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.asst-pie-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.asst-pie-dot {
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.asst-pie-label {
  font-size: 26rpx;
  color: #374151;
  flex: 1;
}
.asst-pie-val {
  font-size: 26rpx;
  font-weight: 500;
  color: #1f2937;
}
.asst-pie-pct {
  font-size: 22rpx;
  color: #9ca3af;
}

/* 表格 */
.asst-tr {
  display: flex;
  border-bottom: 2rpx solid rgba(0, 0, 0, 0.06);
}
.asst-tr-head {
  border-bottom-color: rgba(0, 0, 0, 0.12);
}
.asst-th {
  flex: 1;
  font-size: 22rpx;
  font-weight: 500;
  color: #6b7280;
  padding: 14rpx 8rpx;
}
.asst-td {
  flex: 1;
  font-size: 24rpx;
  color: #374151;
  padding: 14rpx 8rpx;
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
  border-color: #C41E3A;
}
.asst-action-medium {
  border-color: #f59e0b;
}
.asst-action-txt {
  font-size: 22rpx;
  color: #374151;
}
.asst-action-txt-high {
  color: #C41E3A;
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
  0%, 60%, 100% {
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
.asst-voice-btn {
  width: 68rpx;
  height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.asst-voice-on {
  background: rgba(239, 68, 68, 0.1);
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
  background: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
}
.asst-send-off {
  opacity: 0.4;
}
.asst-recording {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 12rpx;
  background: #ffffff;
}
.asst-rec-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #ef4444;
  animation: asstPulse 1s infinite;
}
@keyframes asstPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
.asst-rec-txt {
  font-size: 26rpx;
  color: #ef4444;
}

/* 清除弹窗 */
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
  background: #C41E3A;
}
.asst-modal-ok-txt {
  font-size: 28rpx;
  color: #ffffff;
}

/* 三态 */
.state-loading, .state-error, .state-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 32rpx; }
.state-loading-text { font-size: 28rpx; color: #999; }
.state-error-text { font-size: 28rpx; color: #ef4444; text-align: center; margin-bottom: 24rpx; }
.state-empty-text { font-size: 28rpx; color: #999; }
.state-retry-btn { padding: 16rpx 48rpx; background: #7c3aed; border-radius: 12rpx; }
.state-retry-btn text { font-size: 26rpx; color: #fff; }
</style>
