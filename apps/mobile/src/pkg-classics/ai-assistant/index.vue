<template>
  <view class="ai-page">
    <!-- 顶部导航 -->
    <view class="ai-header">
      <view
        class="ai-hd-btn"
        @tap="goBack"
      >
        <app-icon
          name="arrow-left"
          :size="40"
          color="#1a1a1a"
        />
      </view>
      <view class="ai-hd-center">
        <text class="ai-hd-title">
          古籍AI助手
        </text>
        <text class="ai-hd-sub">
          内容由AI生成
        </text>
      </view>
      <view class="ai-hd-btn">
        <app-icon
          name="history"
          :size="40"
          color="#1a1a1a"
        />
      </view>
    </view>

    <!-- 消息区域 -->
    <scroll-view
      class="ai-body"
      scroll-y
      :scroll-into-view="scrollAnchor"
    >
      <!-- 空状态 -->
      <view
        v-if="messages.length === 0"
        class="ai-empty"
      >
        <!-- 最近一次AI回复（模拟） -->
        <view class="ai-card">
          <text class="ai-card-text">
            刃"的高超创作技艺——全书虽完全以虚构笔法展开，却做到了数万字内容境界不重复、主旨不偏离，兼具可读性与思想启发性，进一步印证了本篇对《西游记》艺术价值的评价。
          </text>
          <view class="ai-card-ops">
            <view class="ai-op">
              <app-icon
                name="rotate-ccw"
                :size="28"
                color="#999999"
              />
            </view>
            <view class="ai-op">
              <app-icon
                name="thumbs-up"
                :size="28"
                color="#999999"
              />
            </view>
            <view class="ai-op">
              <app-icon
                name="thumbs-down"
                :size="28"
                color="#999999"
              />
            </view>
            <view class="ai-op">
              <app-icon
                name="copy"
                :size="28"
                color="#999999"
              />
            </view>
          </view>
        </view>

        <!-- 相关问题 -->
        <view class="ai-qlist">
          <view
            v-for="(q, i) in relatedQuestions"
            :key="'r' + i"
            class="ai-related-q"
            @tap="pickQuestion(q)"
          >
            <text class="ai-related-q-text">
              {{ q }}
            </text>
          </view>
        </view>

        <!-- 分隔线 -->
        <view class="ai-divider">
          <view class="ai-divider-line" />
          <text class="ai-divider-text">
            聊聊新话题
          </text>
          <view class="ai-divider-line" />
        </view>

        <!-- AI介绍卡片 -->
        <view class="ai-intro">
          <view class="ai-intro-head">
            <view class="ai-avatar ai-avatar--lg">
              <app-icon
                name="sparkles"
                :size="40"
                color="#ffffff"
              />
            </view>
            <view>
              <text class="ai-intro-title">
                Hi~我是古籍AI助手
              </text>
              <text class="ai-intro-desc">
                熟悉古籍内容，善于解释概念
              </text>
            </view>
          </view>
          <text class="ai-intro-tip">
            有什么问题都可以问我哦！
          </text>
        </view>

        <!-- 快捷问题 -->
        <view class="ai-qlist">
          <view
            v-for="(q, i) in suggestedQuestions"
            :key="'s' + i"
            class="ai-suggested-q"
            @tap="pickQuestion(q)"
          >
            <text class="ai-suggested-q-text">
              {{ q }}
            </text>
          </view>
        </view>
      </view>

      <!-- 对话消息列表 -->
      <view
        v-else
        class="ai-msgs"
      >
        <view
          v-for="m in messages"
          :key="m.id"
          class="ai-msg-row"
          :class="m.role === 'user' ? 'ai-msg-row--user' : ''"
        >
          <view
            v-if="m.role === 'assistant'"
            class="ai-avatar"
          >
            <app-icon
              name="sparkles"
              :size="32"
              color="#ffffff"
            />
          </view>

          <view
            v-if="m.role === 'user'"
            class="ai-bubble-user"
          >
            <text class="ai-bubble-user-text">
              {{ m.content }}
            </text>
          </view>
          <view
            v-else
            class="ai-assist-wrap"
          >
            <view class="ai-card ai-card--assist">
              <text class="ai-card-text">
                {{ m.content }}
              </text>
            </view>
            <view class="ai-card-ops ai-card-ops--bare">
              <view class="ai-op">
                <app-icon
                  name="rotate-ccw"
                  :size="28"
                  color="#999999"
                />
              </view>
              <view class="ai-op">
                <app-icon
                  name="thumbs-up"
                  :size="28"
                  :color="liked[m.id] === true ? '#22c55e' : '#999999'"
                />
              </view>
              <view class="ai-op">
                <app-icon
                  name="thumbs-down"
                  :size="28"
                  :color="liked[m.id] === false ? '#ef4444' : '#999999'"
                />
              </view>
              <view class="ai-op">
                <app-icon
                  name="copy"
                  :size="28"
                  color="#999999"
                />
              </view>
            </view>
          </view>
        </view>

        <!-- 加载状态 -->
        <view
          v-if="isLoading"
          class="ai-msg-row"
        >
          <view class="ai-avatar">
            <app-icon
              name="sparkles"
              :size="32"
              color="#ffffff"
            />
          </view>
          <view class="ai-card ai-card--assist">
            <view class="ai-loading">
              <view class="ai-dots">
                <view class="ai-dot" />
                <view class="ai-dot" />
                <view class="ai-dot" />
              </view>
              <text class="ai-loading-text">
                正在思考...
              </text>
            </view>
          </view>
        </view>

        <view
          id="ai-bottom"
          class="ai-bottom-anchor"
        />
      </view>
    </scroll-view>

    <!-- 底部输入框 -->
    <view class="ai-input-bar">
      <view class="ai-input-wrap">
        <textarea
          v-model="inputValue"
          class="ai-textarea"
          placeholder="输入和古籍相关的问题"
          placeholder-class="ai-textarea-ph"
          :disabled="isLoading"
          :auto-height="true"
          :show-confirm-bar="false"
        />
        <view class="ai-mic">
          <app-icon
            name="mic"
            :size="32"
            color="#999999"
          />
        </view>
      </view>
      <view
        class="ai-send"
        :class="(!inputValue.trim() || isLoading) ? 'ai-send--disabled' : ''"
        @tap="handleSend"
      >
        <app-icon
          name="send"
          :size="32"
          color="#ffffff"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const suggestedQuestions = [
  '请总结本文的主要内容？',
  '针对本文可以提出哪些研究问题？',
  '古籍中有哪些和本文相关的论述？',
]

const relatedQuestions = [
  '《李卓吾先生批评西游记》甲本卷首题辞中提到的"魔非他，即我也"这一观点，在明代其他《西游记》评点本中是否有类似表述？',
  '《李卓吾先生批评西游记》另一刊本卷首题辞补充的对后世模拟创作的批评，具体涉及哪些明代文人的作品？',
  '《李卓吾先生批评西游记》乙本题辞中的文字异文（如"引而伸之"写为"多而伸之"），在其他明代通俗文学刊本中是否常见？',
]

const messages = ref<ChatMessage[]>([])
const inputValue = ref('')
const isLoading = ref(false)
const liked = ref<Record<string, boolean | null>>({})
const scrollAnchor = ref('')

function goBack() {
  uni.navigateBack()
}

function pickQuestion(q: string) {
  inputValue.value = q
}

function scrollToBottom() {
  nextTick(() => {
    scrollAnchor.value = ''
    nextTick(() => {
      scrollAnchor.value = 'ai-bottom'
    })
  })
}

function generateAIResponse(question: string): string {
  if (question.includes('主要内容') || question.includes('总结')) {
    return '《周易》是中国古代哲学的重要经典，主要包含以下核心内容：\n\n1. 卦象系统：由八卦（乾、坤、震、巽、坎、离、艮、兑）演化为六十四卦，每卦由六个爻组成。\n\n2. 阴阳哲学：以阴阳二元对立统一的思想解释宇宙万物的变化规律。\n\n3. 占卜方法：通过蓍草或铜钱等工具，按特定程序得出卦象，用于预测吉凶。\n\n4. 人生智慧：蕴含修身、齐家、治国的哲理，如"天行健，君子以自强不息"等名言。'
  }
  if (question.includes('研究问题')) {
    return '针对《周易》可以提出以下研究问题：\n\n1. 《周易》的成书年代和作者问题，伏羲画卦、文王演易、孔子作传的传说是否有历史依据？\n\n2. 《周易》与西方占星术、塔罗牌等预测体系在方法论上的异同比较。\n\n3. 《周易》的数学结构——64卦与二进制的关系是否体现了古人对数学的深刻理解？\n\n4. 《周易》在中医、风水、命理等领域的应用发展史研究。'
  }
  return '感谢您的提问。根据古籍记载和学术研究，这是一个非常值得深入探讨的话题。《周易》作为群经之首，其思想内涵极为丰富，涵盖了宇宙观、人生观、方法论等多个层面。\n\n如需了解更具体的内容，您可以进一步询问特定的卦象解读、历史背景或哲学意义等方面。'
}

function handleSend() {
  const text = inputValue.value.trim()
  if (!text || isLoading.value) return

  const userMsg: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: text,
  }
  messages.value.push(userMsg)
  inputValue.value = ''
  isLoading.value = true
  scrollToBottom()

  setTimeout(() => {
    messages.value.push({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: generateAIResponse(userMsg.content),
    })
    isLoading.value = false
    scrollToBottom()
  }, 1500)
}
</script>

<style scoped lang="scss">
.ai-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #faf8f5;
}

/* 顶部导航 */
.ai-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 32rpx;
  background: #ffffff;
  border-bottom: 2rpx solid #ebe6df;
}
.ai-hd-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 9999rpx;
  background: rgba(240, 236, 229, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-hd-center {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ai-hd-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #1a1a1a;
}
.ai-hd-sub {
  font-size: 20rpx;
  color: #999999;
  margin-top: 2rpx;
}

/* 消息区域 */
.ai-body {
  flex: 1;
  overflow: hidden;
}
.ai-empty,
.ai-msgs {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

/* AI回复卡 */
.ai-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  border: 2rpx solid rgba(235, 230, 223, 0.6);
}
.ai-card--assist {
  border-top-left-radius: 8rpx;
}
.ai-card-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #1a1a1a;
  white-space: pre-wrap;
}
.ai-card-ops {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid rgba(235, 230, 223, 0.5);
}
.ai-card-ops--bare {
  margin-top: 16rpx;
  margin-left: 8rpx;
  padding-top: 0;
  border-top: none;
}
.ai-op {
  width: 48rpx;
  height: 48rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 相关问题 */
.ai-qlist {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.ai-related-q {
  padding: 24rpx 32rpx;
  border-radius: 24rpx;
  background: #ffffff;
  border: 2rpx solid rgba(235, 230, 223, 0.6);
}
.ai-related-q-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #1a1a1a;
}

/* 分隔线 */
.ai-divider {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 16rpx 0;
}
.ai-divider-line {
  flex: 1;
  height: 2rpx;
  background: rgba(235, 230, 223, 0.5);
}
.ai-divider-text {
  font-size: 24rpx;
  color: #999999;
}

/* AI介绍卡 */
.ai-intro {
  background: rgba(107, 91, 122, 0.05);
  border-radius: 24rpx;
  padding: 32rpx;
  border: 2rpx solid rgba(107, 91, 122, 0.2);
}
.ai-intro-head {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 24rpx;
}
.ai-intro-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1a1a;
  display: block;
}
.ai-intro-desc {
  font-size: 22rpx;
  color: #999999;
  margin-top: 4rpx;
  display: block;
}
.ai-intro-tip {
  font-size: 28rpx;
  color: #999999;
}

/* 快捷问题 */
.ai-suggested-q {
  padding: 24rpx 32rpx;
  border-radius: 24rpx;
  background: rgba(240, 236, 229, 0.5);
}
.ai-suggested-q-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #999999;
}

/* AI头像（紫檀渐变） */
.ai-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #6b5b7a 0%, #8a7a99 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-avatar--lg {
  width: 80rpx;
  height: 80rpx;
}

/* 对话气泡 */
.ai-msg-row {
  display: flex;
  gap: 24rpx;
}
.ai-msg-row--user {
  justify-content: flex-end;
}
.ai-bubble-user {
  max-width: 85%;
  background: #c41e3a;
  border-radius: 32rpx;
  border-top-right-radius: 8rpx;
  padding: 24rpx 32rpx;
}
.ai-bubble-user-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #ffffff;
}
.ai-assist-wrap {
  flex: 1;
  min-width: 0;
}

/* 加载动画 */
.ai-loading {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.ai-dots {
  display: flex;
  gap: 8rpx;
}
.ai-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 9999rpx;
  background: #8a7a99;
  animation: ai-bounce 1.2s infinite ease-in-out;
}
.ai-dot:nth-child(2) {
  animation-delay: 0.15s;
}
.ai-dot:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes ai-bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-12rpx); }
}
.ai-loading-text {
  font-size: 28rpx;
  color: #999999;
}
.ai-bottom-anchor {
  height: 2rpx;
}

/* 底部输入栏 */
.ai-input-bar {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  padding: 24rpx;
  padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 2rpx solid #ebe6df;
}
.ai-input-wrap {
  flex: 1;
  position: relative;
}
.ai-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 84rpx;
  max-height: 256rpx;
  border-radius: 32rpx;
  background: rgba(240, 236, 229, 0.5);
  border: 2rpx solid rgba(235, 230, 223, 0.6);
  padding: 20rpx 72rpx 20rpx 32rpx;
  font-size: 28rpx;
  color: #1a1a1a;
}
.ai-textarea-ph {
  color: #999999;
}
.ai-mic {
  position: absolute;
  right: 24rpx;
  bottom: 20rpx;
  padding: 8rpx;
}
.ai-send {
  width: 80rpx;
  height: 80rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #6b5b7a 0%, #8a7a99 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-send--disabled {
  opacity: 0.5;
}
</style>
