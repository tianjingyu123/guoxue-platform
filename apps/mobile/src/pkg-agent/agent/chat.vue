<script setup lang="ts">
/**
 * 智能体对话核心页（原型 app/agent/[id]/page.tsx 迁移）
 * 文字对话（真连 /bots/:id/chat）+ 推荐卡片(课程/圈子/商品/排盘·软性导流预留) + 续聊回填。
 * 语音通话(Coze RTC)真机联调下一轮，本期入口诚实提示「即将上线」，不做假壳。
 */
import { ref, computed, nextTick, onUnmounted, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo, toastComingSoon } from '@/utils/router'
import {
  agentApi, chatWelcome, nowTime,
  type ChatMessage, type RecommendItem, type Recommendation,
} from '@/lib/agent-data'

const loading = ref(true)
const error = ref('')
const agentId = ref('')
// 模板中多处裸访问 agentDetail 字段，收敛为具体类型会触发大量报错，保留 any
const agentDetail = ref<any>({ name: '', freeQuota: 0, pricePerChat: 0, callPrice: 0 })
const quickQuestions = ref<string[]>([])
// 推荐课程/圈子来自后端动态结构（未在模板渲染，仅暂存），结构未固定，保留 any
const recommendedCourses = ref<any[]>([])
const recommendedCircles = ref<any[]>([])

const messages = ref<ChatMessage[]>([
  { id: 0, role: 'assistant', content: chatWelcome, time: nowTime() },
])
const inputValue = ref('')
const isTyping = ref(false)
const freeRemaining = ref(0)
const showMenu = ref(false)
const scrollId = ref('')

let streamTimer: ReturnType<typeof setInterval> | null = null

const showQuick = computed(() => messages.value.length <= 1)

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const pages = getCurrentPages()
    // 宿主页面实例对象，uni 类型未暴露 options/$page 字段，保留 as any
    const currentPage = pages[pages.length - 1] as any
    const opts = currentPage?.options || currentPage?.$page?.options || {}
    const id = opts.id || '1'
    agentId.value = id
    const conversationId = opts.conversationId || ''

    const [detail, questions, recs] = await Promise.all([
      agentApi.getDetail(id),
      agentApi.getQuickQuestions(),
      agentApi.getRecommendations(),
    ])
    agentDetail.value = detail || { name: '', freeQuota: 0, pricePerChat: 0, callPrice: 0 }
    quickQuestions.value = questions || []
    recommendedCourses.value = recs?.courses || []
    recommendedCircles.value = recs?.circles || []
    freeRemaining.value = detail?.freeQuota || 0

    // 从历史进入：续聊同一会话并回填真实历史消息（拉取失败则保留欢迎语，不伪造历史）
    if (conversationId) {
      agentApi.setConversation(id, conversationId)
      try {
        const hist = await agentApi.getChatHistory(id, conversationId)
        if (hist.length) messages.value = hist
      } catch (_e) { /* 历史拉取失败：保持欢迎语，不造假 */ }
    }

    // 携带预填问题（广场「大家都在问」入口 ?q= 透传）
    if (opts.q) inputValue.value = decodeURIComponent(opts.q)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })

function scrollToBottom() {
  nextTick(() => { scrollId.value = 'anchor-' + Date.now() })
}

// 逐字展示：uni-app 小程序端不支持 EventSource，故对真实 sendMessage 返回的完整内容做客户端逐字动画（内容真实，仅动画）
function simulateStreaming(fullText: string, messageId: number, recommendation?: Recommendation) {
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
      if (target) { target.isStreaming = false; target.recommendation = recommendation }
      isTyping.value = false
      scrollToBottom()
    }
  }, 25)
}

async function handleSend() {
  const text = inputValue.value.trim()
  if (!text || isTyping.value) return
  messages.value.push({ id: messages.value.length, role: 'user', content: text, time: nowTime() })
  inputValue.value = ''
  isTyping.value = true
  if (freeRemaining.value > 0) freeRemaining.value -= 1
  scrollToBottom()
  setTimeout(async () => {
    try {
      const { text: reply, disclaimer, recommendation } = await agentApi.sendMessage(agentId.value, text)
      const id = messages.value.length + 1
      // disclaimer 为后端下发的 AI 风险免责声明（合规要求），随该条 assistant 消息保存并展示
      messages.value.push({ id, role: 'assistant', content: '', time: nowTime(), isStreaming: true, disclaimer })
      simulateStreaming(reply, id, recommendation)
    } catch (_e) {
      isTyping.value = false
    }
  }, 600)
}

function handleQuick(q: string) {
  inputValue.value = q
}

function handleClearContext() {
  // 真正清除上下文：丢弃当前 Coze 会话 id，下一条消息开启全新会话（非仅清屏）
  agentApi.clearConversation(agentId.value)
  messages.value = [{ id: 0, role: 'assistant', content: `对话已重置。您好！我是${agentDetail.value.name}，有什么可以帮您的？`, time: nowTime() }]
  showMenu.value = false
}

// 语音通话（Coze RTC）真机联调下一轮上线，本期诚实提示，不做假壳
function handleVoiceCall() {
  uni.showToast({ title: '语音通话即将上线', icon: 'none' })
}

// 软性导流：同意/拒绝查看推荐
function consentReco(msg: ChatMessage) {
  msg.recoConsented = true
  scrollToBottom()
}
function declineReco(msg: ChatMessage) {
  msg.recommendation = undefined
}

// 推荐卡片点击 → 跳转对应板块
function openRecommend(item: RecommendItem) {
  if (item.type === 'course') navigateTo(`/courses/${item.data.id}`)
  else if (item.type === 'circle') navigateTo(`/circles/${item.data.id}`)
  else if (item.type === 'paipan') navigateTo('/paipan')
  else toastComingSoon()
}

onUnmounted(() => {
  if (streamTimer) clearInterval(streamTimer)
})
</script>

<template>
  <view v-if="loading" class="load-state"><text class="load-state-text">加载中...</text></view>
  <view v-else-if="error" class="load-state">
    <text class="load-state-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <view v-else class="page">
    <!-- 顶部导航 -->
    <view class="header safe-pt">
      <view class="head-bar">
        <view class="back" @tap="goBack()"><AppIcon name="arrow-left" :size="40" color="#1a1a1a" /></view>
        <view class="head-center">
          <view class="head-avatar agent-gradient-cool">
            <AppIcon name="bot" :size="28" color="#ffffff" />
            <view class="online-dot" />
          </view>
          <view class="head-text">
            <text class="head-name">{{ agentDetail.name }}</text>
            <view class="head-status"><view class="status-dot" /><text class="status-txt">在线</text></view>
          </view>
        </view>
        <view class="head-actions">
          <view class="act" @tap="handleVoiceCall"><AppIcon name="phone" :size="34" color="#c41e3a" /></view>
          <view class="menu-wrap">
            <view class="act" @tap="showMenu = !showMenu"><AppIcon name="more-horizontal" :size="34" color="#999" /></view>
            <view v-if="showMenu" class="menu-mask" @tap="showMenu = false" />
            <view v-if="showMenu" class="menu">
              <view class="menu-item" @tap="handleClearContext"><AppIcon name="trash-2" :size="28" color="#1a1a1a" /><text class="menu-txt">清除上下文</text></view>
            </view>
          </view>
        </view>
      </view>
      <!-- 消耗提示 -->
      <view class="usage-bar">
        <view class="usage-left"><AppIcon name="zap" :size="26" color="#c9a96e" /><text class="usage-txt">剩余免费次数：<text class="usage-num">{{ freeRemaining }}</text> 次</text></view>
        <view class="usage-right">
          <text class="usage-price"><AppIcon name="message-square" :size="22" color="#999" />{{ agentDetail.pricePerChat }}元/次</text>
          <!-- 通话单价后端无此字段且语音通话未上线 → 诚实隐藏 -->
          <text v-if="agentDetail.callPrice > 0" class="usage-price"><AppIcon name="phone" :size="22" color="#999" />{{ agentDetail.callPrice }}元/分钟</text>
        </view>
      </view>
    </view>

    <!-- 对话区 -->
    <scroll-view scroll-y class="msg-area" :scroll-into-view="scrollId" :scroll-with-animation="true">
      <view class="msg-list">
        <view v-for="msg in messages" :key="msg.id" class="msg-row" :class="{ 'msg-row-user': msg.role === 'user' }">
          <view v-if="msg.role === 'assistant'" class="msg-avatar agent-gradient-cool"><AppIcon name="bot" :size="24" color="#ffffff" /></view>
          <view class="msg-content" :class="{ 'content-user': msg.role === 'user' }">
            <view class="bubble" :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'">
              <text class="bubble-text" :class="{ 'streaming-cursor': msg.isStreaming }">{{ msg.content }}</text>
            </view>
            <!-- AI 风险免责声明（后端下发，仅 assistant 消息且非流式时展示） -->
            <text v-if="msg.role === 'assistant' && msg.disclaimer && !msg.isStreaming" class="ai-disclaimer">{{ msg.disclaimer }}</text>
            <!-- 软性导流推荐（先征求同意，同意才展开真实卡片） -->
            <view v-if="msg.role === 'assistant' && msg.recommendation && !msg.isStreaming" class="recommend-block">
              <!-- 征求同意 -->
              <view v-if="!msg.recoConsented" class="reco-consent">
                <text class="reco-consent-text">{{ msg.recommendation.consentPrompt }}</text>
                <view class="reco-consent-btns">
                  <view class="reco-btn reco-btn-yes" @tap="consentReco(msg)"><text class="reco-btn-yes-text">好的，看看</text></view>
                  <view class="reco-btn reco-btn-no" @tap="declineReco(msg)"><text class="reco-btn-no-text">不用了</text></view>
                </view>
              </view>
              <!-- 同意后展开真实卡片 -->
              <template v-else>
                <view class="recommend-head"><AppIcon name="sparkles" :size="24" color="#c9a96e" /><text class="recommend-label">为您推荐</text></view>
                <view v-for="(rec, i) in msg.recommendation.items" :key="i" class="rec-card" :class="`rec-${rec.type}`" @tap="openRecommend(rec)">
                  <!-- 课程 -->
                  <template v-if="rec.type === 'course'">
                    <view class="rec-icon rec-icon-course"><AppIcon name="play" :size="28" color="#c41e3a" /></view>
                    <view class="rec-info">
                      <view class="rec-top"><text class="rec-title">{{ rec.data.title }}</text><text class="rec-badge">推荐</text></view>
                      <text v-if="rec.data.reason" class="rec-sub">{{ rec.data.reason }}</text>
                      <view class="rec-price-row">
                        <text class="rec-price">{{ rec.data.price > 0 ? '¥' + rec.data.price : '免费' }}</text>
                        <text class="rec-members">{{ rec.data.studentCount }}人已学</text>
                      </view>
                    </view>
                    <AppIcon name="chevron-right" :size="28" color="#999" />
                  </template>
                  <!-- 圈子 -->
                  <template v-else-if="rec.type === 'circle'">
                    <view class="rec-icon rec-icon-circle"><AppIcon name="users" :size="26" color="#059669" /></view>
                    <view class="rec-info">
                      <view class="rec-top"><text class="rec-title">{{ rec.data.name }}</text></view>
                      <text class="rec-sub">{{ rec.data.reason || rec.data.intro }}</text>
                      <view class="rec-price-row"><text class="rec-members">{{ rec.data.memberCount }}成员</text></view>
                    </view>
                    <AppIcon name="chevron-right" :size="28" color="#999" />
                  </template>
                </view>
              </template>
            </view>
          </view>
        </view>

        <!-- 正在输入 -->
        <view v-if="isTyping && messages[messages.length - 1]?.role === 'user'" class="msg-row">
          <view class="msg-avatar agent-gradient-cool"><AppIcon name="bot" :size="24" color="#ffffff" /></view>
          <view class="bubble bubble-ai typing">
            <view class="dots"><view class="dot typing-dot" style="animation-delay:0s" /><view class="dot typing-dot" style="animation-delay:0.15s" /><view class="dot typing-dot" style="animation-delay:0.3s" /></view>
          </view>
        </view>

        <view :id="scrollId" class="anchor" />
      </view>
    </scroll-view>

    <!-- 快捷提问 -->
    <view v-if="showQuick" class="quick-zone">
      <view class="quick-head"><AppIcon name="sparkles" :size="24" color="#c9a96e" /><text class="quick-label">快捷提问</text></view>
      <view class="quick-list">
        <view v-for="(q, i) in quickQuestions" :key="i" class="quick-chip" @tap="handleQuick(q)">{{ q }}</view>
      </view>
    </view>

    <!-- 底部输入 -->
    <view class="input-bar safe-pb">
      <textarea class="input" v-model="inputValue" placeholder="输入您的问题..." :maxlength="-1" auto-height :show-confirm-bar="false" />
      <view class="send-btn" :class="{ disabled: !inputValue.trim() || isTyping }" @tap="handleSend()"><AppIcon name="send" :size="34" color="#ffffff" /></view>
    </view>
    <view class="disclaimer safe-pb">此内容由AI生成，仅供参考，不构成专业建议</view>
  </view>
</template>

<style scoped lang="scss">
/* 加载/错误状态 */
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }

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
.bubble-user { background: var(--brand); border-bottom-right-radius: 6rpx; }
.bubble-text { font-size: 28rpx; line-height: 1.6; white-space: pre-wrap; color: #1a1a1a; }
.bubble-user .bubble-text { color: #fff; }
.typing { padding: 24rpx 28rpx; }
.dots { display: flex; gap: 10rpx; }
.dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: var(--brand); }
.anchor { height: 1rpx; }

/* 推荐卡片 */
.recommend-block { margin-top: 16rpx; display: flex; flex-direction: column; gap: 12rpx; }
.recommend-head { display: flex; align-items: center; gap: 6rpx; }
.recommend-label { font-size: 22rpx; color: #999; }
.reco-consent { background: rgba(201, 169, 110, 0.08); border: 2rpx solid rgba(201, 169, 110, 0.3); border-radius: 20rpx; padding: 24rpx; }
.reco-consent-text { font-size: 26rpx; color: #1a1a1a; line-height: 1.5; }
.reco-consent-btns { display: flex; gap: 16rpx; margin-top: 20rpx; }
.reco-btn { padding: 12rpx 32rpx; border-radius: 999rpx; }
.reco-btn-yes { background: #c9a96e; }
.reco-btn-yes-text { font-size: 26rpx; color: #fff; }
.reco-btn-no { background: rgba(0, 0, 0, 0.05); }
.reco-btn-no-text { font-size: 26rpx; color: #999; }
.rec-card { display: flex; align-items: center; gap: 20rpx; padding: 20rpx; border-radius: 20rpx; border: 1rpx solid; }
.rec-course { background: rgba(196,30,58,0.04); border-color: rgba(196,30,58,0.1); }
.rec-circle { background: rgba(5,150,105,0.04); border-color: rgba(5,150,105,0.1); }
.rec-product { background: rgba(217,119,6,0.05); border-color: rgba(217,119,6,0.12); }
.rec-paipan { background: rgba(196,30,58,0.05); border-color: rgba(196,30,58,0.2); }
.rec-icon { width: 80rpx; height: 80rpx; border-radius: 18rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.rec-icon-course { background: rgba(196,30,58,0.12); }
.rec-icon-circle { width: 72rpx; height: 72rpx; background: rgba(5,150,105,0.15); }
.rec-icon-product { width: 72rpx; height: 72rpx; background: rgba(217,119,6,0.15); }
.rec-icon-paipan { width: 72rpx; height: 72rpx; background: var(--brand); }
.rec-info { flex: 1; min-width: 0; }
.rec-top { display: flex; align-items: center; gap: 12rpx; }
.rec-title { font-size: 26rpx; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rec-badge { font-size: 18rpx; color: var(--brand); background: rgba(196,30,58,0.1); padding: 2rpx 10rpx; border-radius: 8rpx; flex-shrink: 0; }
.rec-free { font-size: 18rpx; color: #16a34a; background: rgba(34,197,94,0.12); padding: 2rpx 10rpx; border-radius: 8rpx; flex-shrink: 0; }
.rec-sub { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.rec-price-row { display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx; }
.rec-price { font-size: 28rpx; font-weight: 700; color: var(--brand); }
.rec-origin { font-size: 22rpx; color: #bbb; text-decoration: line-through; }
.rec-members { font-size: 22rpx; color: #999; }
.rec-rating { display: flex; align-items: center; gap: 4rpx; margin-left: auto; }
.rating-txt { font-size: 22rpx; color: #999; }

/* AI 风险免责声明（每条 AI 回复下方小字） */
.ai-disclaimer { display: block; margin-top: 10rpx; font-size: 20rpx; line-height: 1.4; color: #bbb; }

/* 快捷提问 */
.quick-zone { flex-shrink: 0; padding: 0 24rpx 16rpx; }
.quick-head { display: flex; align-items: center; gap: 6rpx; margin-bottom: 12rpx; }
.quick-label { font-size: 22rpx; color: #999; }
.quick-list { display: flex; flex-wrap: wrap; gap: 16rpx; }
.quick-chip { font-size: 24rpx; color: #1a1a1a; padding: 12rpx 24rpx; border-radius: 999rpx; background: rgba(0,0,0,0.04); }

/* 输入栏 */
.input-bar { flex-shrink: 0; display: flex; align-items: flex-end; gap: 16rpx; padding: 16rpx 24rpx 8rpx; border-top: 1rpx solid #ececec; background: #fff; }
.input { flex: 1; min-height: 72rpx; max-height: 240rpx; border-radius: 24rpx; background: rgba(0,0,0,0.03); padding: 18rpx 28rpx; font-size: 28rpx; color: #1a1a1a; }
.send-btn { width: 84rpx; height: 84rpx; border-radius: 50%; flex-shrink: 0; background: var(--brand); display: flex; align-items: center; justify-content: center; }
.send-btn.disabled { opacity: 0.5; }
.disclaimer { font-size: 20rpx; color: #bbb; text-align: center; padding: 8rpx 24rpx 16rpx; background: #fff; }
</style>
