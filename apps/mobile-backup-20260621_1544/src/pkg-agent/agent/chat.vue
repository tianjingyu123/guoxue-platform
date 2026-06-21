<script setup lang="ts">
/**
 * 智能体对话核心页（原型 app/agent/[id]/page.tsx 迁移）
 * 文字流式对话 + 推荐卡片(课程/圈子/商品/排盘) + 语音通话模拟 + 断连重连 + 对话总结
 */
import { ref, computed, nextTick, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo, toastComingSoon } from '@/utils/router'
import ReconnectingOverlay from '@/components/agent/reconnecting-overlay.vue'
import {
  agentDetail, quickQuestions, chatWelcome, generateResponse, nowTime, formatDuration,
  recommendedCourses, recommendedCircles,
  type ChatMessage, type RecommendItem,
} from '@/lib/agent-data'

const messages = ref<ChatMessage[]>([
  { id: 0, role: 'assistant', content: chatWelcome, time: nowTime(), recommendations: [{ type: 'paipan', data: null }] },
])
const inputValue = ref('')
const isTyping = ref(false)
const freeRemaining = ref(agentDetail.freeQuota)
const showMenu = ref(false)
const isMuted = ref(false)
const isInCall = ref(false)
const callDuration = ref(0)
const isReconnecting = ref(false)
const isMicMuted = ref(false)
const showSummary = ref(false)
const scrollId = ref('')

let streamTimer: ReturnType<typeof setInterval> | null = null
let callTimer: ReturnType<typeof setInterval> | null = null

const showQuick = computed(() => messages.value.length <= 1)
const userCount = computed(() => messages.value.filter((m) => m.role === 'user').length)
const callCost = computed(() => ((callDuration.value / 60) * agentDetail.callPrice).toFixed(2))
const soundbars = Array.from({ length: 12 }, (_, i) => 20 + ((i * 7) % 30))

function scrollToBottom() {
  nextTick(() => { scrollId.value = 'anchor-' + Date.now() })
}

// 流式输出
function simulateStreaming(fullText: string, messageId: number, recommendations?: RecommendItem[]) {
  let idx = 0
  streamTimer = setInterval(() => {
    if (idx < fullText.length) {
      idx = Math.min(idx + 3, fullText.length)
      const target = messages.value.find((m) => m.id === messageId)
      if (target) { target.content = fullText.slice(0, idx); target.isStreaming = idx < fullText.length }
      scrollToBottom()
    } else {
      if (streamTimer) clearInterval(streamTimer)
      const target = messages.value.find((m) => m.id === messageId)
      if (target) { target.isStreaming = false; target.recommendations = recommendations }
      isTyping.value = false
      scrollToBottom()
    }
  }, 25)
}

function handleSend() {
  const text = inputValue.value.trim()
  if (!text || isTyping.value) return
  messages.value.push({ id: messages.value.length, role: 'user', content: text, time: nowTime() })
  inputValue.value = ''
  isTyping.value = true
  if (freeRemaining.value > 0) freeRemaining.value -= 1
  scrollToBottom()
  setTimeout(() => {
    const { text: reply, recommendations } = generateResponse(text)
    const id = messages.value.length + 1
    messages.value.push({ id, role: 'assistant', content: '', time: nowTime(), isStreaming: true })
    simulateStreaming(reply, id, recommendations)
  }, 600)
}

function handleQuick(q: string) {
  inputValue.value = q
}

function handleClearContext() {
  messages.value = [{ id: 0, role: 'assistant', content: `对话已重置。您好！我是${agentDetail.name}，有什么可以帮您的？`, time: nowTime() }]
  showMenu.value = false
  showSummary.value = false
}

function handleGenerateSummary() {
  showSummary.value = true
  showMenu.value = false
  scrollToBottom()
}

// 通话计时
function startCallTimer() {
  callTimer = setInterval(() => { callDuration.value += 1 }, 1000)
}
function stopCallTimer() {
  if (callTimer) { clearInterval(callTimer); callTimer = null }
}

function toggleCall() {
  if (isInCall.value) {
    isInCall.value = false
    stopCallTimer()
    const dur = callDuration.value
    messages.value.push({
      id: messages.value.length,
      role: 'assistant',
      time: nowTime(),
      content: `通话已结束，本次通话时长 ${formatDuration(dur)}，消费 ¥${((dur / 60) * agentDetail.callPrice).toFixed(2)}。\n\n感谢您的咨询！如果您还有疑问，可以继续文字沟通，或者查看以下学习资源：`,
      recommendations: [
        { type: 'course', data: recommendedCourses[dur % recommendedCourses.length] },
        { type: 'circle', data: recommendedCircles[0] },
      ],
    })
    callDuration.value = 0
    scrollToBottom()
  } else {
    isInCall.value = true
    callDuration.value = 0
    startCallTimer()
  }
}

// 重连：暂停/恢复计时
function onReconnecting() {
  isReconnecting.value = true
  stopCallTimer()
}
function onReconnected() {
  isReconnecting.value = false
  if (isInCall.value) startCallTimer()
}
function onEndCallFromOverlay() {
  isReconnecting.value = false
  toggleCall()
}

// 推荐卡片点击
function openRecommend(item: RecommendItem) {
  if (item.type === 'paipan') navigateTo('/paipan')
  else if (item.type === 'course') toastComingSoon()
  else if (item.type === 'circle') navigateTo(`/pkg-circle/circles/detail?id=${item.data.id}`)
  else toastComingSoon()
}

onUnmounted(() => {
  if (streamTimer) clearInterval(streamTimer)
  stopCallTimer()
})
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header safe-pt">
      <view class="head-bar">
        <view
          class="back"
          @tap="goBack()"
        >
          <AppIcon
            name="arrow-left"
            :size="40"
            color="#1a1a1a"
          />
        </view>
        <view class="head-center">
          <view class="head-avatar agent-gradient-cool">
            <AppIcon
              name="bot"
              :size="28"
              color="#ffffff"
            />
            <view class="online-dot" />
          </view>
          <view class="head-text">
            <text class="head-name">
              {{ agentDetail.name }}
            </text>
            <view class="head-status">
              <view class="status-dot" /><text class="status-txt">
                在线
              </text>
            </view>
          </view>
        </view>
        <view class="head-actions">
          <view
            class="act"
            @tap="isMuted = !isMuted"
          >
            <AppIcon
              :name="isMuted ? 'volume-x' : 'volume-2'"
              :size="34"
              :color="isMuted ? '#999' : '#c9a96e'"
            />
          </view>
          <view
            class="act"
            @tap="toggleCall()"
          >
            <AppIcon
              name="phone"
              :size="34"
              color="#c41e3a"
            />
          </view>
          <view class="menu-wrap">
            <view
              class="act"
              @tap="showMenu = !showMenu"
            >
              <AppIcon
                name="more-horizontal"
                :size="34"
                color="#999"
              />
            </view>
            <view
              v-if="showMenu"
              class="menu-mask"
              @tap="showMenu = false"
            />
            <view
              v-if="showMenu"
              class="menu"
            >
              <view
                class="menu-item"
                @tap="handleGenerateSummary"
              >
                <AppIcon
                  name="lightbulb"
                  :size="28"
                  color="#1a1a1a"
                /><text class="menu-txt">
                  生成对话总结
                </text>
              </view>
              <view
                class="menu-item bordered"
                @tap="handleClearContext"
              >
                <AppIcon
                  name="trash-2"
                  :size="28"
                  color="#1a1a1a"
                /><text class="menu-txt">
                  清除上下文
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>
      <!-- 消耗提示 -->
      <view class="usage-bar">
        <view class="usage-left">
          <AppIcon
            name="zap"
            :size="26"
            color="#c9a96e"
          /><text class="usage-txt">
            剩余免费次数：<text class="usage-num">
              {{ freeRemaining }}
            </text> 次
          </text>
        </view>
        <view class="usage-right">
          <text class="usage-price">
            <AppIcon
              name="message-square"
              :size="22"
              color="#999"
            />{{ agentDetail.pricePerChat }}元/次
          </text>
          <text class="usage-price">
            <AppIcon
              name="phone"
              :size="22"
              color="#999"
            />{{ agentDetail.callPrice }}元/分钟
          </text>
        </view>
      </view>
    </view>

    <!-- 对话区 -->
    <scroll-view
      scroll-y
      class="msg-area"
      :scroll-into-view="scrollId"
      :scroll-with-animation="true"
    >
      <view class="msg-list">
        <view
          v-for="msg in messages"
          :key="msg.id"
          class="msg-row"
          :class="{ 'msg-row-user': msg.role === 'user' }"
        >
          <view
            v-if="msg.role === 'assistant'"
            class="msg-avatar agent-gradient-cool"
          >
            <AppIcon
              name="bot"
              :size="24"
              color="#ffffff"
            />
          </view>
          <view
            class="msg-content"
            :class="{ 'content-user': msg.role === 'user' }"
          >
            <view
              class="bubble"
              :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'"
            >
              <text
                class="bubble-text"
                :class="{ 'streaming-cursor': msg.isStreaming }"
              >
                {{ msg.content }}
              </text>
            </view>
            <!-- 推荐卡片 -->
            <view
              v-if="msg.role === 'assistant' && msg.recommendations && !msg.isStreaming"
              class="recommend-block"
            >
              <view class="recommend-head">
                <AppIcon
                  name="sparkles"
                  :size="24"
                  color="#c9a96e"
                /><text class="recommend-label">
                  为您推荐
                </text>
              </view>
              <view
                v-for="(rec, i) in msg.recommendations"
                :key="i"
                class="rec-card"
                :class="`rec-${rec.type}`"
                @tap="openRecommend(rec)"
              >
                <!-- 课程 -->
                <template v-if="rec.type === 'course'">
                  <view class="rec-icon rec-icon-course">
                    <AppIcon
                      name="play"
                      :size="28"
                      color="#c41e3a"
                    />
                  </view>
                  <view class="rec-info">
                    <view class="rec-top">
                      <text class="rec-title">
                        {{ rec.data.title }}
                      </text><text class="rec-badge">
                        推荐
                      </text>
                    </view>
                    <text class="rec-sub">
                      {{ rec.data.instructor }} · {{ rec.data.students }}人已学
                    </text>
                    <view class="rec-price-row">
                      <text class="rec-price">
                        ¥{{ rec.data.price }}
                      </text>
                      <text class="rec-origin">
                        ¥{{ rec.data.originalPrice }}
                      </text>
                      <view class="rec-rating">
                        <AppIcon
                          name="star"
                          :size="22"
                          color="#f59e0b"
                          :fill="true"
                        /><text class="rating-txt">
                          {{ rec.data.rating }}
                        </text>
                      </view>
                    </view>
                  </view>
                </template>
                <!-- 圈子 -->
                <template v-else-if="rec.type === 'circle'">
                  <view class="rec-icon rec-icon-circle">
                    <AppIcon
                      name="users"
                      :size="26"
                      color="#059669"
                    />
                  </view>
                  <view class="rec-info">
                    <view class="rec-top">
                      <text class="rec-title">
                        {{ rec.data.name }}
                      </text><text
                        v-if="rec.data.price === 0"
                        class="rec-free"
                      >
                        免费
                      </text>
                    </view>
                    <text class="rec-sub">
                      {{ rec.data.description }}
                    </text>
                    <view class="rec-price-row">
                      <text class="rec-members">
                        {{ rec.data.members }}成员
                      </text><text
                        v-if="rec.data.price > 0"
                        class="rec-price"
                      >
                        ¥{{ rec.data.price }}
                      </text>
                    </view>
                  </view>
                  <AppIcon
                    name="chevron-right"
                    :size="28"
                    color="#999"
                  />
                </template>
                <!-- 商品 -->
                <template v-else-if="rec.type === 'product'">
                  <view class="rec-icon rec-icon-product">
                    <AppIcon
                      name="shopping-bag"
                      :size="26"
                      color="#d97706"
                    />
                  </view>
                  <view class="rec-info">
                    <text class="rec-title">
                      {{ rec.data.name }}
                    </text>
                    <text class="rec-sub">
                      {{ rec.data.type }} · 已售{{ rec.data.sales }}
                    </text>
                    <view class="rec-price-row">
                      <text class="rec-price">
                        ¥{{ rec.data.price }}
                      </text><text class="rec-origin">
                        ¥{{ rec.data.originalPrice }}
                      </text>
                    </view>
                  </view>
                </template>
                <!-- 排盘工具 -->
                <template v-else>
                  <view class="rec-icon rec-icon-paipan">
                    <AppIcon
                      name="compass"
                      :size="26"
                      color="#ffffff"
                    />
                  </view>
                  <view class="rec-info">
                    <text class="rec-title">
                      立即排盘
                    </text><text class="rec-sub">
                      使用八字排盘工具生成命盘
                    </text>
                  </view>
                  <AppIcon
                    name="chevron-right"
                    :size="28"
                    color="#999"
                  />
                </template>
              </view>
            </view>
          </view>
        </view>

        <!-- 正在输入 -->
        <view
          v-if="isTyping && messages[messages.length - 1]?.role === 'user'"
          class="msg-row"
        >
          <view class="msg-avatar agent-gradient-cool">
            <AppIcon
              name="bot"
              :size="24"
              color="#ffffff"
            />
          </view>
          <view class="bubble bubble-ai typing">
            <view class="dots">
              <view
                class="dot typing-dot"
                style="animation-delay:0s"
              /><view
                class="dot typing-dot"
                style="animation-delay:0.15s"
              /><view
                class="dot typing-dot"
                style="animation-delay:0.3s"
              />
            </view>
          </view>
        </view>

        <!-- 对话总结 -->
        <view
          v-if="showSummary && messages.length > 3"
          class="summary-card"
        >
          <view class="summary-head">
            <AppIcon
              name="lightbulb"
              :size="28"
              color="#c9a96e"
            /><text class="summary-title">
              对话总结
            </text>
          </view>
          <text class="summary-text">
            本次对话共{{ userCount }}个问题，涉及：
          </text>
          <view class="summary-tags">
            <text class="summary-tag">
              运势分析
            </text><text class="summary-tag">
              事业规划
            </text>
          </view>
          <view class="summary-divider" />
          <text class="summary-sub">
            相关推荐
          </text>
          <scroll-view
            scroll-x
            class="summary-rec"
          >
            <view class="summary-rec-row">
              <view
                v-for="c in recommendedCourses.slice(0, 2)"
                :key="c.id"
                class="summary-rec-item"
                @tap="toastComingSoon()"
              >
                <text class="summary-rec-title">
                  {{ c.title }}
                </text>
                <text class="summary-rec-price">
                  ¥{{ c.price }}
                </text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view
          :id="scrollId"
          class="anchor"
        />
      </view>
    </scroll-view>

    <!-- 快捷提问 -->
    <view
      v-if="showQuick"
      class="quick-zone"
    >
      <view class="quick-head">
        <AppIcon
          name="sparkles"
          :size="24"
          color="#c9a96e"
        /><text class="quick-label">
          快捷提问
        </text>
      </view>
      <view class="quick-list">
        <view
          v-for="(q, i) in quickQuestions"
          :key="i"
          class="quick-chip"
          @tap="handleQuick(q)"
        >
          {{ q }}
        </view>
      </view>
    </view>

    <!-- 底部输入 -->
    <view class="input-bar safe-pb">
      <textarea
        v-model="inputValue"
        class="input"
        placeholder="输入您的问题..."
        :maxlength="-1"
        auto-height
        :show-confirm-bar="false"
      />
      <view
        class="send-btn"
        :class="{ disabled: !inputValue.trim() || isTyping }"
        @tap="handleSend()"
      >
        <AppIcon
          name="send"
          :size="34"
          color="#ffffff"
        />
      </view>
    </view>
    <view class="disclaimer safe-pb">
      此内容由AI生成，仅供参考，不构成专业建议
    </view>

    <!-- 语音通话浮层 -->
    <view
      v-if="isInCall"
      class="call-overlay"
    >
      <view class="call-bg">
        <view class="bg-blob blob-1" /><view class="bg-blob blob-2" />
      </view>
      <view class="call-main">
        <view class="call-avatar-wrap">
          <view class="call-ring ring-spin-slow" />
          <view class="call-avatar agent-gradient-cool">
            <AppIcon
              name="bot"
              :size="56"
              color="#ffffff"
            />
          </view>
          <view class="call-online" />
        </view>
        <text class="call-name">
          {{ agentDetail.name }}
        </text>
        <view class="call-status">
          <view class="call-status-dot" /><text class="call-status-txt">
            通话中
          </text>
        </view>
        <view class="call-timer">
          <text class="timer-num">
            {{ formatDuration(callDuration) }}
          </text>
          <text class="timer-cost">
            ¥{{ agentDetail.callPrice }}/分钟 · 已消费 ¥{{ callCost }}
          </text>
        </view>
        <view class="soundwave">
          <view
            v-for="(h, i) in soundbars"
            :key="i"
            class="wave-bar animate-soundwave"
            :style="{ height: h + 'rpx', animationDelay: (i * 0.05) + 's' }"
          />
        </view>
      </view>
      <view class="call-controls safe-pb">
        <view class="call-ctrl-row">
          <view
            class="ctrl-btn"
            :class="{ active: isMicMuted }"
            @tap="isMicMuted = !isMicMuted"
          >
            <AppIcon
              :name="isMicMuted ? 'mic-off' : 'mic'"
              :size="40"
              color="#ffffff"
            />
          </view>
          <view
            class="ctrl-btn hangup"
            @tap="toggleCall()"
          >
            <AppIcon
              name="phone-off"
              :size="44"
              color="#ffffff"
            />
          </view>
          <view
            class="ctrl-btn"
            :class="{ active: isMuted }"
            @tap="isMuted = !isMuted"
          >
            <AppIcon
              :name="isMuted ? 'volume-x' : 'volume-2'"
              :size="40"
              color="#ffffff"
            />
          </view>
        </view>
        <view
          class="net-status"
          @tap="onReconnecting()"
        >
          <AppIcon
            name="phone"
            :size="26"
            color="rgba(255,255,255,0.4)"
          /><text class="net-txt">
            网络正常 · 点此模拟断连
          </text>
        </view>
      </view>
      <ReconnectingOverlay
        :open="isReconnecting"
        @reconnected="onReconnected"
        @end-call="onEndCallFromOverlay"
      />
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { display: flex; flex-direction: column; height: 100vh; background: #f7f5f0; }
.safe-pt { padding-top: var(--status-bar-height, 0); }
.safe-pb { padding-bottom: constant(safe-area-inset-bottom); padding-bottom: env(safe-area-inset-bottom); }

/* 顶部 */
.header { flex-shrink: 0; background: #fff; border-bottom: 1rpx solid #ececec; }
.head-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; height: 100rpx; }
.head-center { display: flex; align-items: center; gap: 16rpx; }
.head-avatar { position: relative; width: 64rpx; height: 64rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.online-dot { position: absolute; bottom: -2rpx; right: -2rpx; width: 20rpx; height: 20rpx; background: #22c55e; border-radius: 50%; border: 3rpx solid #fff; }
.head-name { font-size: 30rpx; font-weight: 600; color: #1a1a1a; }
.head-status { display: flex; align-items: center; gap: 6rpx; }
.status-dot { width: 12rpx; height: 12rpx; background: #22c55e; border-radius: 50%; }
.status-txt { font-size: 20rpx; color: #22c55e; }
.head-actions { display: flex; align-items: center; gap: 8rpx; }
.act { padding: 10rpx; }
.menu-wrap { position: relative; }
.menu-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 40; }
.menu { position: absolute; right: 0; top: 100%; margin-top: 12rpx; width: 280rpx; background: #fff; border: 1rpx solid #ececec; border-radius: 16rpx; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.12); overflow: hidden; z-index: 50; }
.menu-item { display: flex; align-items: center; gap: 12rpx; padding: 24rpx 28rpx; }
.menu-item.bordered { border-top: 1rpx solid #f0f0f0; }
.menu-txt { font-size: 28rpx; color: #1a1a1a; }

.usage-bar { display: flex; align-items: center; justify-content: space-between; padding: 12rpx 24rpx; background: rgba(201,169,110,0.06); border-top: 1rpx solid #f5f5f5; }
.usage-left { display: flex; align-items: center; gap: 8rpx; }
.usage-txt { font-size: 22rpx; color: #999; }
.usage-num { color: #c9a96e; font-weight: 700; }
.usage-right { display: flex; gap: 24rpx; }
.usage-price { display: flex; align-items: center; gap: 4rpx; font-size: 22rpx; color: #999; }

/* 消息 */
.msg-area { flex: 1; overflow: hidden; }
.msg-list { padding: 32rpx 24rpx; display: flex; flex-direction: column; gap: 32rpx; }
.msg-row { display: flex; gap: 20rpx; }
.msg-row-user { flex-direction: row-reverse; }
.msg-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.msg-content { max-width: 85%; }
.content-user { display: flex; flex-direction: column; align-items: flex-end; }
.bubble { border-radius: 24rpx; padding: 22rpx 28rpx; }
.bubble-ai { background: #fff; border: 1rpx solid #ececec; border-bottom-left-radius: 6rpx; }
.bubble-user { background: #c41e3a; border-bottom-right-radius: 6rpx; }
.bubble-text { font-size: 28rpx; line-height: 1.6; white-space: pre-wrap; color: #1a1a1a; }
.bubble-user .bubble-text { color: #fff; }
.typing { padding: 24rpx 28rpx; }
.dots { display: flex; gap: 10rpx; }
.dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #c41e3a; }
.anchor { height: 1rpx; }

/* 推荐卡片 */
.recommend-block { margin-top: 16rpx; display: flex; flex-direction: column; gap: 12rpx; }
.recommend-head { display: flex; align-items: center; gap: 6rpx; }
.recommend-label { font-size: 22rpx; color: #999; }
.rec-card { display: flex; align-items: center; gap: 20rpx; padding: 20rpx; border-radius: 20rpx; border: 1rpx solid; }
.rec-course { background: rgba(196,30,58,0.04); border-color: rgba(196,30,58,0.1); }
.rec-circle { background: rgba(5,150,105,0.04); border-color: rgba(5,150,105,0.1); }
.rec-product { background: rgba(217,119,6,0.05); border-color: rgba(217,119,6,0.12); }
.rec-paipan { background: rgba(196,30,58,0.05); border-color: rgba(196,30,58,0.2); }
.rec-icon { width: 80rpx; height: 80rpx; border-radius: 18rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.rec-icon-course { background: rgba(196,30,58,0.12); }
.rec-icon-circle { width: 72rpx; height: 72rpx; background: rgba(5,150,105,0.15); }
.rec-icon-product { width: 72rpx; height: 72rpx; background: rgba(217,119,6,0.15); }
.rec-icon-paipan { width: 72rpx; height: 72rpx; background: #c41e3a; }
.rec-info { flex: 1; min-width: 0; }
.rec-top { display: flex; align-items: center; gap: 12rpx; }
.rec-title { font-size: 26rpx; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rec-badge { font-size: 18rpx; color: #c41e3a; background: rgba(196,30,58,0.1); padding: 2rpx 10rpx; border-radius: 8rpx; flex-shrink: 0; }
.rec-free { font-size: 18rpx; color: #16a34a; background: rgba(34,197,94,0.12); padding: 2rpx 10rpx; border-radius: 8rpx; flex-shrink: 0; }
.rec-sub { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.rec-price-row { display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx; }
.rec-price { font-size: 28rpx; font-weight: 700; color: #c41e3a; }
.rec-origin { font-size: 22rpx; color: #bbb; text-decoration: line-through; }
.rec-members { font-size: 22rpx; color: #999; }
.rec-rating { display: flex; align-items: center; gap: 4rpx; margin-left: auto; }
.rating-txt { font-size: 22rpx; color: #999; }

/* 对话总结 */
.summary-card { padding: 28rpx; border-radius: 24rpx; background: rgba(201,169,110,0.06); border: 1rpx solid rgba(201,169,110,0.2); }
.summary-head { display: flex; align-items: center; gap: 10rpx; margin-bottom: 20rpx; }
.summary-title { font-size: 28rpx; font-weight: 500; color: #1a1a1a; }
.summary-text { font-size: 26rpx; color: #999; }
.summary-tags { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 12rpx; }
.summary-tag { font-size: 22rpx; color: #c41e3a; background: rgba(196,30,58,0.1); padding: 4rpx 16rpx; border-radius: 8rpx; }
.summary-divider { height: 1rpx; background: #ececec; margin: 24rpx 0; }
.summary-sub { font-size: 22rpx; color: #999; }
.summary-rec { margin-top: 16rpx; white-space: nowrap; }
.summary-rec-row { display: inline-flex; gap: 16rpx; }
.summary-rec-item { width: 240rpx; padding: 16rpx; background: #fff; border-radius: 14rpx; border: 1rpx solid #ececec; }
.summary-rec-title { display: block; font-size: 22rpx; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.summary-rec-price { display: block; font-size: 20rpx; color: #999; margin-top: 4rpx; }

/* 快捷提问 */
.quick-zone { flex-shrink: 0; padding: 0 24rpx 16rpx; }
.quick-head { display: flex; align-items: center; gap: 6rpx; margin-bottom: 12rpx; }
.quick-label { font-size: 22rpx; color: #999; }
.quick-list { display: flex; flex-wrap: wrap; gap: 16rpx; }
.quick-chip { font-size: 24rpx; color: #1a1a1a; padding: 12rpx 24rpx; border-radius: 999rpx; background: rgba(0,0,0,0.04); }

/* 输入栏 */
.input-bar { flex-shrink: 0; display: flex; align-items: flex-end; gap: 16rpx; padding: 16rpx 24rpx 8rpx; border-top: 1rpx solid #ececec; background: #fff; }
.input { flex: 1; min-height: 72rpx; max-height: 240rpx; border-radius: 24rpx; background: rgba(0,0,0,0.03); padding: 18rpx 28rpx; font-size: 28rpx; color: #1a1a1a; }
.send-btn { width: 84rpx; height: 84rpx; border-radius: 50%; flex-shrink: 0; background: #c41e3a; display: flex; align-items: center; justify-content: center; }
.send-btn.disabled { opacity: 0.5; }
.disclaimer { font-size: 20rpx; color: #bbb; text-align: center; padding: 8rpx 24rpx 16rpx; background: #fff; }

/* 通话浮层 */
.call-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 50; background: linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); display: flex; flex-direction: column; }
.call-bg { position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; }
.bg-blob { position: absolute; border-radius: 50%; filter: blur(80rpx); }
.blob-1 { top: 25%; left: 20%; width: 320rpx; height: 320rpx; background: rgba(196,30,58,0.2); }
.blob-2 { bottom: 25%; right: 20%; width: 240rpx; height: 240rpx; background: rgba(201,169,110,0.2); }
.call-main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 64rpx; position: relative; z-index: 10; }
.call-avatar-wrap { position: relative; margin-bottom: 48rpx; width: 200rpx; height: 200rpx; display: flex; align-items: center; justify-content: center; }
.call-ring { position: absolute; top: -12rpx; left: -12rpx; width: 224rpx; height: 224rpx; border-radius: 50%; background: conic-gradient(from 0deg, #c41e3a, #c9a96e, #c41e3a); opacity: 0.5; filter: blur(12rpx); }
.call-avatar { width: 200rpx; height: 200rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative; border: 6rpx solid rgba(255,255,255,0.2); }
.call-online { position: absolute; bottom: 12rpx; right: 12rpx; width: 32rpx; height: 32rpx; background: #22c55e; border-radius: 50%; border: 4rpx solid #0f172a; }
.call-name { font-size: 40rpx; font-weight: 600; color: #fff; margin-bottom: 8rpx; }
.call-status { display: flex; align-items: center; gap: 8rpx; margin-bottom: 32rpx; }
.call-status-dot { width: 14rpx; height: 14rpx; background: #4ade80; border-radius: 50%; }
.call-status-txt { font-size: 26rpx; color: rgba(255,255,255,0.6); }
.call-timer { background: rgba(255,255,255,0.1); border-radius: 24rpx; padding: 24rpx 48rpx; margin-bottom: 56rpx; }
.timer-num { display: block; font-size: 56rpx; color: #fff; text-align: center; font-family: monospace; }
.timer-cost { display: block; font-size: 22rpx; color: rgba(255,255,255,0.6); text-align: center; margin-top: 8rpx; }
.soundwave { display: flex; align-items: center; gap: 8rpx; height: 100rpx; }
.wave-bar { width: 8rpx; border-radius: 999rpx; background: linear-gradient(to top, #c41e3a, #c9a96e); }
.call-controls { padding: 0 64rpx 80rpx; position: relative; z-index: 10; }
.call-ctrl-row { display: flex; align-items: center; justify-content: center; gap: 64rpx; }
.ctrl-btn { width: 112rpx; height: 112rpx; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; }
.ctrl-btn.active { background: rgba(255,255,255,0.25); }
.ctrl-btn.hangup { width: 128rpx; height: 128rpx; background: #ef4444; }
.net-status { display: flex; align-items: center; justify-content: center; gap: 10rpx; margin-top: 32rpx; }
.net-txt { font-size: 22rpx; color: rgba(255,255,255,0.4); }
</style>
