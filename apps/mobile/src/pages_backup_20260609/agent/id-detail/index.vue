<template>
  <view class="ad-page">
    <!-- 语音通话界面 -->
    <view v-if="isInCall" class="call-overlay">
      <view class="call-glow1" />
      <view class="call-glow2" />
      <view class="call-content">
        <view class="call-avatar-ring">
          <view class="call-avatar">
            <text>🤖</text>
          </view>
          <view class="call-dot" />
        </view>
        <text class="call-name">{{ agent.name }}</text>
        <text class="call-status">通话中</text>
        <view class="call-duration">
          <text class="call-timer">{{ formatDuration(callDuration) }}</text>
          <text class="call-cost">¥{{ agent.callPrice }}/分钟 · 已消费 ¥{{ (callDuration / 60 * agent.callPrice).toFixed(2) }}</text>
        </view>
        <view class="call-wave">
          <view v-for="i in 12" :key="i" class="call-wave-bar" :style="{ animationDelay: (i * 0.05) + 's', height: (20 + Math.random() * 28) + 'px' }" />
        </view>
      </view>
      <view class="call-controls">
        <view class="call-ctrl" :class="{ active: isMicMuted }" @click="isMicMuted = !isMicMuted">
          <text>{{ isMicMuted ? '🔇' : '🎤' }}</text>
        </view>
        <view class="call-end" @click="toggleCall">
          <text>📞</text>
        </view>
        <view class="call-ctrl" :class="{ active: isMuted }" @click="isMuted = !isMuted">
          <text>{{ isMuted ? '🔇' : '🔊' }}</text>
        </view>
      </view>
    </view>

    <!-- 正常聊天界面 -->
    <template v-if="!isInCall">
      <view class="header-sticky">
        <view class="header-row">
          <text class="header-back" @click="uni.navigateBack()">‹</text>
          <view class="header-agent">
            <view class="ha-avatar-wrap">
              <view class="ha-avatar"><text>🤖</text></view>
              <view class="ha-dot" />
            </view>
            <view class="ha-info">
              <text class="ha-name">{{ agent.name }}</text>
              <text class="ha-online">在线</text>
            </view>
          </view>
          <view class="header-actions">
            <view class="ha-act" @click="isMuted = !isMuted">
              <text>{{ isMuted ? '🔇' : '🔊' }}</text>
            </view>
            <view class="ha-act" @click="toggleCall">
              <text>📞</text>
            </view>
            <view class="ha-act" @click="showMenu = !showMenu">
              <text>⋯</text>
            </view>
          </view>
        </view>

        <!-- 菜单 -->
        <view v-if="showMenu" class="menu-pop">
          <view class="menu-mask" @click="showMenu = false" />
          <view class="menu-list">
            <view class="menu-item" @click="handleSummary"><text>💡 生成对话总结</text></view>
            <view class="menu-item" @click="handleClear"><text>🗑️ 清除上下文</text></view>
          </view>
        </view>
      </view>

      <!-- 消耗提示 -->
      <view class="quota-bar">
        <view class="quota-left">
          <text class="quota-icon">⚡</text>
          <text class="quota-text">剩余免费次数：<text class="quota-val">{{ freeRemaining }}</text> 次</text>
        </view>
        <view class="quota-right">
          <text>💬 {{ agent.pricePerChat }}元/次</text>
          <text>📞 {{ agent.callPrice }}元/分钟</text>
        </view>
      </view>

      <!-- 消息列表 -->
      <scroll-view scroll-y class="msg-area" :scroll-top="scrollTop" @scrolltoupper="onScroll">
        <view v-for="msg in messages" :key="msg.id" class="msg-item" :class="{ 'msg-user': msg.role === 'user' }">
          <view v-if="msg.role === 'assistant'" class="msg-avatar">
            <text>🤖</text>
          </view>
          <view class="msg-content-wrap">
            <view class="msg-bubble" :class="{ 'bubble-user': msg.role === 'user', 'bubble-streaming': msg.isStreaming }">
              <text class="msg-text">{{ msg.content }}</text>
            </view>

            <!-- 推荐卡片 -->
            <view v-if="msg.role === 'assistant' && msg.recommendations && !msg.isStreaming" class="rec-block">
              <text class="rec-label">✨ 为您推荐</text>
              <view v-for="(rec, ri) in msg.recommendations" :key="ri">
                <!-- 课程推荐 -->
                <view v-if="rec.type === 'course'" class="rec-card course" @click="goPage('/pages/courses/detail/index?id=' + rec.data.id)">
                  <view class="rc-left">
                    <view class="rc-icon course"><text>📖</text></view>
                    <view class="rc-info">
                      <text class="rc-name">{{ rec.data.title }}</text>
                      <text class="rc-meta">{{ rec.data.instructor }} · {{ rec.data.students }}人已学</text>
                      <view class="rc-price-row">
                        <text class="rc-price">¥{{ rec.data.price }}</text>
                        <text class="rc-orig">¥{{ rec.data.originalPrice }}</text>
                        <text class="rc-rating">⭐{{ rec.data.rating }}</text>
                      </view>
                    </view>
                  </view>
                </view>

                <!-- 圈子推荐 -->
                <view v-if="rec.type === 'circle'" class="rec-card circle" @click="goPage('/pages/circles/detail/index?id=' + rec.data.id)">
                  <view class="rc-left">
                    <view class="rc-icon circle"><text>👥</text></view>
                    <view class="rc-info">
                      <text class="rc-name">{{ rec.data.name }}</text>
                      <text class="rc-meta">{{ rec.data.description }}</text>
                      <text class="rc-meta">{{ rec.data.members }}成员</text>
                    </view>
                  </view>
                </view>

                <!-- 商品推荐 -->
                <view v-if="rec.type === 'product'" class="rec-card product" @click="goPage('/pages/mall/product/index?id=' + rec.data.id)">
                  <view class="rc-left">
                    <view class="rc-icon product"><text>🛍️</text></view>
                    <view class="rc-info">
                      <text class="rc-name">{{ rec.data.name }}</text>
                      <text class="rc-meta">{{ rec.data.type }} · 已售{{ rec.data.sales }}</text>
                      <view class="rc-price-row">
                        <text class="rc-price">¥{{ rec.data.price }}</text>
                        <text class="rc-orig">¥{{ rec.data.originalPrice }}</text>
                      </view>
                    </view>
                  </view>
                </view>

                <!-- 排盘工具 -->
                <view v-if="rec.type === 'paipan'" class="rec-card paipan" @click="goPage('/pages/paipan/index')">
                  <view class="rc-left">
                    <view class="rc-icon paipan"><text>🧭</text></view>
                    <view class="rc-info">
                      <text class="rc-name">立即排盘</text>
                      <text class="rc-meta">使用八字排盘工具生成命盘</text>
                    </view>
                  </view>
                  <text class="rc-arrow">›</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 输入中动画 -->
        <view v-if="isTyping && messages[messages.length - 1]?.role === 'user'" class="msg-item">
          <view class="msg-avatar"><text>🤖</text></view>
          <view class="typing-bubble">
            <view class="typing-dot" style="animation-delay: 0ms" />
            <view class="typing-dot" style="animation-delay: 150ms" />
            <view class="typing-dot" style="animation-delay: 300ms" />
          </view>
        </view>

        <!-- 对话总结 -->
        <view v-if="showSummary && messages.length > 3" class="summary-card">
          <view class="sum-head">
            <text>💡 对话总结</text>
          </view>
          <text class="sum-text">本次对话共{{ userMsgCount }}个问题，涉及：</text>
          <view class="sum-tags">
            <text class="sum-tag">运势分析</text>
            <text class="sum-tag">事业规划</text>
          </view>
          <view class="sum-related">
            <text class="sum-rel-label">相关推荐</text>
            <scroll-view scroll-x class="sum-scroll">
              <view v-for="c in recommendedCourses.slice(0, 2)" :key="c.id" class="sum-item" @click="goPage('/pages/courses/detail/index?id=' + c.id)">
                <text class="sum-item-name">{{ c.title }}</text>
                <text class="sum-item-price">¥{{ c.price }}</text>
              </view>
            </scroll-view>
          </view>
        </view>
      </scroll-view>

      <!-- 快捷提问 -->
      <view v-if="messages.length <= 1" class="quick-area">
        <text class="quick-label">✨ 快捷提问</text>
        <view class="quick-chips">
          <text v-for="q in quickQuestions" :key="q" class="quick-chip" @click="sendMessage(q)">{{ q }}</text>
        </view>
      </view>

      <!-- 底部输入 -->
      <view class="input-bar">
        <view class="input-wrap">
          <textarea v-model="inputValue" class="msg-input" placeholder="输入您的问题..." :maxlength="500" @confirm="sendMessage(inputValue)" />
        </view>
        <view class="send-btn" :class="{ disabled: !inputValue.trim() || isTyping }" @click="sendMessage(inputValue)">
          <text>发送</text>
        </view>
      </view>
      <text class="input-disclaimer">此内容由AI生成，仅供参考，不构成专业建议</text>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface RecommendItem { type: string; data: any }
interface Message {
  id: number; role: string; content: string; timestamp: Date
  isStreaming?: boolean; recommendations?: RecommendItem[]
}

const inputValue = ref('')
const isTyping = ref(false)
const isMuted = ref(false)
const isInCall = ref(false)
const isMicMuted = ref(false)
const showMenu = ref(false)
const showSummary = ref(false)
const freeRemaining = ref(3)
const callDuration = ref(0)
const scrollTop = ref(0)

const agent = {
  id: 1, name: '八字命理大师', description: '精通八字命理，可为您解读命盘、分析运势',
  tags: ['八字排盘', '运势分析', '婚姻事业'], pricePerChat: 0.5, freeQuota: 3, callPrice: 2,
}

const quickQuestions = ['帮我看看今年的运势如何？', '我的八字五行缺什么？', '分析一下我的事业运', '看看我的婚姻宫情况', '帮我解读一下命盘']

const recommendedCourses = [
  { id: 1, title: '八字入门实战课', instructor: '周易大师', price: 199, originalPrice: 299, students: 2680, rating: 4.9 },
  { id: 2, title: '八字看婚姻专题', instructor: '玄学居士', price: 99, originalPrice: 149, students: 1520, rating: 4.8 },
  { id: 3, title: '流年运势精解', instructor: '周易大师', price: 149, originalPrice: 199, students: 1890, rating: 4.9 },
]

const recommendedCircles = [
  { id: 1, name: '八字命理研习社', members: 3280, price: 99, description: '系统学习八字命理' },
  { id: 2, name: '周易大师交流圈', members: 5620, price: 0, description: '与高手一起探讨' },
]

const recommendedProducts = [
  { id: 1, name: '八字命理入门', type: '电子书', price: 29, originalPrice: 49, sales: 856 },
  { id: 2, name: '开运水晶手链', type: '饰品', price: 168, originalPrice: 268, sales: 326 },
]

const messages = ref<Message[]>([])

const userMsgCount = computed(() => messages.value.filter(m => m.role === 'user').length)

let callTimer: any = null

onMounted(() => {
  messages.value = [{
    id: 0, role: 'assistant',
    content: `您好！我是${agent.name}，精通八字命理学，拥有多年实战经验。\n\n我可以为您提供以下服务：\n- 八字命盘排盘与解读\n- 流年运势分析\n- 婚姻事业预测\n- 五行调理建议\n\n请告诉我您的出生年月日时（公历或农历均可），我来为您详细分析。`,
    timestamp: new Date(),
    recommendations: [{ type: 'paipan', data: null }],
  }]
})

function toggleCall() {
  if (isInCall.value) {
    isInCall.value = false
    if (callTimer) clearInterval(callTimer)
    const dur = callDuration.value
    messages.value.push({
      id: messages.value.length, role: 'assistant',
      content: `通话已结束，本次通话时长 ${formatDuration(dur)}，消费 ¥${(dur / 60 * agent.callPrice).toFixed(2)}。\n\n感谢您的咨询！如果您还有疑问，可以继续文字沟通。`,
      timestamp: new Date(),
      recommendations: [{ type: 'course', data: recommendedCourses[0] }, { type: 'circle', data: recommendedCircles[0] }],
    })
    callDuration.value = 0
  } else {
    isInCall.value = true
    callTimer = setInterval(() => { callDuration.value++ }, 1000)
  }
}

function generateResponse(q: string): { text: string; recommendations?: RecommendItem[] } {
  if (q.includes('运势') || q.includes('今年')) {
    return {
      text: `根据您提供的信息，分析如下：\n\n【整体运势】\n今年流年甲辰，天干甲木生助，地支辰土为财库，运势呈上升趋势。\n\n【事业运】\n上半年贵人运旺，适合拓展人脉、寻求合作。下半年需稳中求进。\n\n【财运】\n正财稳定，偏财有小进。建议以稳健投资为主。\n\n推荐您学习以下课程：`,
      recommendations: [{ type: 'course', data: recommendedCourses[2] }, { type: 'circle', data: recommendedCircles[0] }],
    }
  } else if (q.includes('五行') || q.includes('缺')) {
    return {
      text: `关于五行分析，需要您提供准确的出生信息：\n1. 出生年份（公历）\n2. 出生月份\n3. 出生日期\n4. 出生时辰\n\n有了这些信息，我可以为您排出完整八字命盘。您可以使用排盘工具快速生成命盘：`,
      recommendations: [{ type: 'paipan', data: null }, { type: 'course', data: recommendedCourses[0] }],
    }
  } else if (q.includes('事业')) {
    return {
      text: `关于事业运的分析：\n\n八字中以月柱为事业宫，结合日主强弱、官杀星的配置来综合判断。\n\n【一般建议】\n1. 身强者适合独立创业或管理职位\n2. 身弱者适合稳定工作或与人合作\n3. 食伤生财格局利于技术、创意类工作\n\n如需针对性分析，请提供您的八字信息：`,
      recommendations: [{ type: 'circle', data: recommendedCircles[1] }],
    }
  } else if (q.includes('婚姻') || q.includes('感情')) {
    return {
      text: `关于婚姻宫的分析：\n\n八字中以日支为婚姻宫，代表配偶和婚姻状态。\n\n【影响因素】\n1. 日支所坐十神（正财、正官等）\n2. 日支与其他地支的刑冲合害\n3. 大运流年对婚姻宫的影响\n\n请提供出生信息详细分析：`,
      recommendations: [{ type: 'course', data: recommendedCourses[1] }, { type: 'paipan', data: null }],
    }
  } else if (q.includes('化解') || q.includes('调理')) {
    return {
      text: `关于命理调理：\n\n1. 五行补缺：通过颜色、方位、饰品补充所缺五行\n2. 流年趋避：了解不利时段提前规避\n3. 风水调整：居家办公环境布局优化\n4. 心态调整：顺应天时积极面对\n\n具体的调理方案需要根据您的八字定制：`,
      recommendations: [{ type: 'product', data: recommendedProducts[1] }, { type: 'course', data: recommendedCourses[2] }],
    }
  }
  return {
    text: `感谢您的提问！\n\n为了给您更准确的命理分析，我需要了解：\n\n1. 出生日期：公历年月日\n2. 出生时辰：如早上7点、下午3点等\n3. 出生地点：用于校正真太阳时\n\n您也可以先使用排盘工具：`,
    recommendations: [{ type: 'paipan', data: null }, { type: 'course', data: recommendedCourses[0] }],
  }
}

function sendMessage(text: string) {
  if (!text.trim() || isTyping.value) return
  const trimmed = text.trim()
  messages.value.push({ id: messages.value.length, role: 'user', content: trimmed, timestamp: new Date() })
  inputValue.value = ''
  isTyping.value = true
  if (freeRemaining.value > 0) freeRemaining.value--

  setTimeout(() => {
    const { text: respText, recommendations } = generateResponse(trimmed)
    const msgId = messages.value.length
    messages.value.push({ id: msgId, role: 'assistant', content: '', timestamp: new Date(), isStreaming: true })

    let idx = 0
    const interval = setInterval(() => {
      if (idx < respText.length) {
        const chunk = respText.slice(0, idx + 2)
        idx = chunk.length
        const msg = messages.value.find(m => m.id === msgId)
        if (msg) { msg.content = chunk; msg.isStreaming = idx < respText.length }
      } else {
        clearInterval(interval)
        const msg = messages.value.find(m => m.id === msgId)
        if (msg) { msg.isStreaming = false; msg.recommendations = recommendations }
        isTyping.value = false
      }
    }, 20)
  }, 600)

  scrollBottom()
}

function handleSummary() {
  showSummary.value = true
  showMenu.value = false
}

function handleClear() {
  messages.value = [{
    id: 0, role: 'assistant',
    content: `对话已重置。您好！我是${agent.name}，有什么可以帮您的？`,
    timestamp: new Date(),
  }]
  showMenu.value = false
  showSummary.value = false
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0')
}

function scrollBottom() { scrollTop.value = 99999 }

function goPage(url: string) { uni.navigateTo({ url }) }
function onScroll() {}
</script>

<style scoped>
.ad-page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

/* 语音通话 */
.call-overlay { position: fixed; inset: 0; z-index: 100; background: linear-gradient(180deg, #1a1a2e, #16213e); display: flex; flex-direction: column; }
.call-glow1 { position: absolute; top: 20%; left: 20%; width: 200rpx; height: 200rpx; border-radius: 50%; background: radial-gradient(circle, rgba(196,30,58,0.3), transparent); }
.call-glow2 { position: absolute; bottom: 25%; right: 20%; width: 160rpx; height: 160rpx; border-radius: 50%; background: radial-gradient(circle, rgba(124,58,237,0.2), transparent); }
.call-content { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; z-index: 1; }
.call-avatar-ring { position: relative; margin-bottom: 24rpx; }
.call-avatar { width: 180rpx; height: 180rpx; border-radius: 50%; background: linear-gradient(135deg, #C41E3A, #7C3AED); display: flex; align-items: center; justify-content: center; font-size: 72rpx; border: 6rpx solid rgba(255,255,255,0.3); }
.call-dot { position: absolute; bottom: 12rpx; right: 12rpx; width: 28rpx; height: 28rpx; border-radius: 50%; background: #52C41A; border: 4rpx solid #1a1a2e; }
.call-name { font-size: 36rpx; font-weight: 700; color: #fff; }
.call-status { font-size: 24rpx; color: rgba(255,255,255,0.5); margin-top: 6rpx; }
.call-duration { background: rgba(255,255,255,0.1); border-radius: 16rpx; padding: 16rpx 32rpx; margin-top: 28rpx; text-align: center; }
.call-timer { font-size: 48rpx; font-weight: 700; color: #fff; display: block; }
.call-cost { font-size: 20rpx; color: rgba(255,255,255,0.5); display: block; margin-top: 4rpx; }
.call-wave { display: flex; align-items: center; gap: 4rpx; margin-top: 40rpx; }
.call-wave-bar { width: 4rpx; background: linear-gradient(to top, #C41E3A, #E85A70); border-radius: 2rpx; animation: wave 0.5s ease-in-out infinite alternate; }
@keyframes wave { 0% { height: 8px; } 100% { height: 60px; } }
.call-controls { display: flex; justify-content: center; align-items: center; gap: 60rpx; padding: 40rpx 0 60rpx; position: relative; z-index: 1; }
.call-ctrl { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 32rpx; }
.call-ctrl.active { background: rgba(255,255,255,0.25); }
.call-end { width: 96rpx; height: 96rpx; border-radius: 50%; background: #FF4D4F; display: flex; align-items: center; justify-content: center; font-size: 36rpx; transform: rotate(135deg); }

/* 头部 */
.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 8rpx 16rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 52rpx; }
.header-agent { display: flex; align-items: center; gap: 10rpx; flex: 1; }
.ha-avatar-wrap { position: relative; }
.ha-avatar { width: 60rpx; height: 60rpx; border-radius: 50%; background: linear-gradient(135deg, #C41E3A, #7C3AED); display: flex; align-items: center; justify-content: center; font-size: 24rpx; }
.ha-dot { position: absolute; bottom: -2rpx; right: -2rpx; width: 18rpx; height: 18rpx; border-radius: 50%; background: #52C41A; border: 3rpx solid #fff; }
.ha-name { font-size: 26rpx; font-weight: 600; color: #333; display: block; }
.ha-online { font-size: 18rpx; color: #52C41A; }
.header-actions { display: flex; gap: 6rpx; }
.ha-act { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }

.menu-pop { position: absolute; top: 80rpx; right: 12rpx; z-index: 50; }
.menu-mask { position: fixed; inset: 0; }
.menu-list { position: relative; background: #fff; border-radius: 14rpx; box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.12); overflow: hidden; min-width: 260rpx; }
.menu-item { padding: 18rpx 24rpx; font-size: 26rpx; color: #333; border-bottom: 1px solid #F5F1EB; }
.menu-item:last-child { border-bottom: 0; }

.quota-bar { display: flex; justify-content: space-between; align-items: center; padding: 10rpx 24rpx; background: linear-gradient(90deg, rgba(196,30,58,0.04), rgba(201,169,110,0.03)); border-bottom: 1px solid #F5F1EB; }
.quota-left { display: flex; align-items: center; gap: 4rpx; }
.quota-icon { font-size: 20rpx; }
.quota-text { font-size: 20rpx; color: #666; }
.quota-val { color: #C9A96E; font-weight: 700; }
.quota-right { display: flex; gap: 12rpx; }
.quota-right text { font-size: 18rpx; color: #BBB; }

.msg-area { flex: 1; padding: 16rpx 20rpx; }
.msg-item { display: flex; gap: 10rpx; margin-bottom: 20rpx; }
.msg-item.msg-user { flex-direction: row-reverse; }
.msg-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; background: linear-gradient(135deg, #C41E3A, #7C3AED); display: flex; align-items: center; justify-content: center; font-size: 24rpx; flex-shrink: 0; }
.msg-content-wrap { max-width: 85%; }
.msg-bubble { padding: 14rpx 18rpx; border-radius: 16rpx; font-size: 26rpx; line-height: 1.6; }
.msg-item:not(.msg-user) .msg-bubble { background: #fff; border: 1px solid #E8E0D5; border-bottom-left-radius: 4rpx; margin-left: 0; }
.msg-item.msg-user .msg-bubble { background: linear-gradient(135deg, #C41E3A, #D44A5A); border-bottom-right-radius: 4rpx; }
.msg-text { white-space: pre-wrap; word-break: break-word; }
.msg-user .msg-text { color: #fff; }
.bubble-streaming .msg-text::after { content: '|'; animation: blink 0.7s infinite; }
@keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }

.typing-bubble { background: #fff; border: 1px solid #E8E0D5; border-radius: 16rpx; border-bottom-left-radius: 4rpx; padding: 14rpx 18rpx; display: flex; gap: 6rpx; }
.typing-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #C41E3A; animation: bounce 0.6s infinite; }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8rpx); } }

.rec-block { margin-top: 10rpx; }
.rec-label { font-size: 20rpx; color: #C9A96E; display: block; margin-bottom: 8rpx; }
.rec-card { background: #fff; border-radius: 14rpx; padding: 14rpx; margin-bottom: 8rpx; border: 1px solid #E8E0D5; }
.rec-card.course { border-left: 4rpx solid #C41E3A; }
.rec-card.circle { border-left: 4rpx solid #059669; }
.rec-card.product { border-left: 4rpx solid #EA580C; }
.rec-card.paipan { border-left: 4rpx solid #7C3AED; display: flex; align-items: center; justify-content: space-between; }
.rc-left { display: flex; gap: 12rpx; }
.rc-icon { width: 64rpx; height: 64rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; flex-shrink: 0; }
.rc-icon.course { background: rgba(196,30,58,0.08); }
.rc-icon.circle { background: rgba(5,150,105,0.08); }
.rc-icon.product { background: rgba(234,88,12,0.08); }
.rc-icon.paipan { background: rgba(124,58,237,0.08); }
.rc-info { flex: 1; min-width: 0; }
.rc-name { font-size: 24rpx; font-weight: 500; color: #333; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-meta { font-size: 18rpx; color: #999; display: block; margin-top: 2rpx; }
.rc-price-row { display: flex; align-items: center; gap: 8rpx; margin-top: 4rpx; }
.rc-price { font-size: 24rpx; font-weight: 700; color: #C41E3A; }
.rc-orig { font-size: 18rpx; color: #BBB; text-decoration: line-through; }
.rc-rating { font-size: 18rpx; color: #999; margin-left: auto; }
.rc-arrow { font-size: 28rpx; color: #BBB; }

.summary-card { margin: 16rpx 0; background: linear-gradient(135deg, rgba(196,30,58,0.04), rgba(201,169,110,0.03)); border-radius: 16rpx; padding: 20rpx; border: 1px solid rgba(201,169,110,0.2); }
.sum-head { margin-bottom: 10rpx; }
.sum-head text { font-size: 26rpx; font-weight: 600; color: #333; }
.sum-text { font-size: 22rpx; color: #999; display: block; margin-bottom: 8rpx; }
.sum-tags { display: flex; gap: 8rpx; margin-bottom: 14rpx; }
.sum-tag { font-size: 20rpx; padding: 4rpx 14rpx; border-radius: 16rpx; background: rgba(196,30,58,0.06); color: #C41E3A; }
.sum-related { border-top: 1px solid #E8E0D5; padding-top: 12rpx; }
.sum-rel-label { font-size: 20rpx; color: #999; display: block; margin-bottom: 8rpx; }
.sum-scroll { display: flex; white-space: nowrap; }
.sum-item { display: inline-block; width: 200rpx; padding: 12rpx; background: #fff; border-radius: 10rpx; border: 1px solid #E8E0D5; margin-right: 10rpx; flex-shrink: 0; }
.sum-item-name { font-size: 20rpx; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.sum-item-price { font-size: 18rpx; color: #C41E3A; }

.quick-area { padding: 8rpx 20rpx 16rpx; }
.quick-label { font-size: 20rpx; color: #C9A96E; display: block; margin-bottom: 10rpx; }
.quick-chips { display: flex; flex-wrap: wrap; gap: 10rpx; }
.quick-chip { font-size: 22rpx; padding: 10rpx 18rpx; background: #F5F1EB; border-radius: 20rpx; color: #666; }

.input-bar { display: flex; align-items: flex-end; gap: 12rpx; padding: 10rpx 20rpx; background: rgba(250,248,245,0.95); border-top: 1px solid #E8E0D5; }
.input-wrap { flex: 1; background: #F5F1EB; border-radius: 24rpx; padding: 0 18rpx; }
.msg-input { width: 100%; min-height: 72rpx; max-height: 160rpx; padding: 14rpx 0; font-size: 26rpx; color: #333; }
.send-btn { height: 72rpx; padding: 0 28rpx; border-radius: 24rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; }
.send-btn text { font-size: 24rpx; color: #fff; font-weight: 500; }
.send-btn.disabled { background: #E8E0D5; }
.input-disclaimer { font-size: 18rpx; color: #BBB; text-align: center; padding: 6rpx 0 12rpx; }
</style>
