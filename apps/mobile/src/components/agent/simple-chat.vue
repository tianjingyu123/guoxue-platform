<script setup lang="ts">
/**
 * 通用简易聊天界面（智玄助手 main / 智能客服 customer-service 复用）
 * 头部图标/主题色 + 欢迎语 + 快捷词 + 文字气泡 + 打字指示 + 输入栏
 */
import { ref, nextTick } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { nowTime, type ChatMessage } from '@/lib/agent-data'

const props = defineProps<{
  title: string
  iconName: string
  iconColor: string
  iconBg: string
  welcome: string
  quickPrompts: string[]
  /** 自定义回复解析；返回字符串 */
  resolveReply: (text: string) => string
  /** 回复延迟毫秒 */
  delay?: number
}>()

const messages = ref<ChatMessage[]>([{ id: 0, role: 'assistant', content: props.welcome, time: nowTime() }])
const input = ref('')
const loading = ref(false)
const scrollTop = ref(0)
const scrollId = ref('')

function scrollToBottom() {
  nextTick(() => { scrollId.value = 'msg-bottom-' + Date.now() })
}

async function send(text: string) {
  const t = text.trim()
  if (!t || loading.value) return
  messages.value.push({ id: Date.now(), role: 'user', content: t, time: nowTime() })
  input.value = ''
  loading.value = true
  scrollToBottom()
  await new Promise((r) => setTimeout(r, props.delay ?? 1000))
  messages.value.push({ id: Date.now() + 1, role: 'assistant', content: props.resolveReply(t), time: nowTime() })
  loading.value = false
  scrollToBottom()
}

function reset() {
  messages.value = [{ id: 0, role: 'assistant', content: props.welcome, time: nowTime() }]
}
</script>

<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header safe-pt">
      <view class="back" @tap="goBack()"><AppIcon name="arrow-left" :size="40" color="#1a1a1a" /></view>
      <view class="head-info">
        <view class="head-avatar" :style="{ background: iconBg }"><AppIcon :name="iconName" :size="28" :color="iconColor" /></view>
        <text class="head-title">{{ title }}</text>
        <text class="head-online">在线</text>
      </view>
      <view class="refresh" @tap="reset"><AppIcon name="refresh-cw" :size="32" color="#999" /></view>
    </view>

    <!-- 消息区 -->
    <scroll-view class="msg-area" scroll-y :scroll-into-view="scrollId" :scroll-with-animation="true">
      <view class="msg-list">
        <view v-for="msg in messages" :key="msg.id" class="msg-row" :class="{ 'msg-row-user': msg.role === 'user' }">
          <view v-if="msg.role === 'assistant'" class="msg-avatar" :style="{ background: iconBg }">
            <AppIcon :name="iconName" :size="24" :color="iconColor" />
          </view>
          <view class="bubble" :class="msg.role === 'assistant' ? 'bubble-ai' : 'bubble-user'">
            <text class="bubble-text">{{ msg.content }}</text>
            <text class="bubble-time" :class="{ 'time-user': msg.role === 'user' }">{{ msg.time }}</text>
          </view>
        </view>
        <!-- 打字中 -->
        <view v-if="loading" class="msg-row">
          <view class="msg-avatar" :style="{ background: iconBg }"><AppIcon :name="iconName" :size="24" :color="iconColor" /></view>
          <view class="bubble bubble-ai typing">
            <view class="dots">
              <view class="dot typing-dot" style="animation-delay:0s" />
              <view class="dot typing-dot" style="animation-delay:0.15s" />
              <view class="dot typing-dot" style="animation-delay:0.3s" />
            </view>
          </view>
        </view>
        <view :id="scrollId" class="anchor" />
      </view>
    </scroll-view>

    <!-- 快捷词 -->
    <scroll-view class="quick-bar" scroll-x>
      <view class="quick-row">
        <view v-for="q in quickPrompts" :key="q" class="quick-chip" @tap="send(q)">{{ q }}</view>
      </view>
    </scroll-view>

    <!-- 输入栏 -->
    <view class="input-bar safe-pb">
      <textarea
        class="input"
        v-model="input"
        :placeholder="'输入您的问题…'"
        :maxlength="-1"
        auto-height
        :show-confirm-bar="false"
      />
      <view class="send-btn" :class="{ disabled: !input.trim() || loading }" @tap="send(input)">
        <AppIcon name="send" :size="32" color="#ffffff" />
      </view>
    </view>
    <view class="tip safe-pb">内容由 AI 生成，仅供参考，不构成专业建议，请理性看待。</view>
  </view>
</template>

<style scoped lang="scss">
.page { display: flex; flex-direction: column; height: 100vh; background: #f7f5f0; }
.safe-pt { padding-top: var(--status-bar-height, 0); }
.safe-pb { padding-bottom: constant(safe-area-inset-bottom); padding-bottom: env(safe-area-inset-bottom); }

.header {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 16rpx;
  padding: 0 24rpx; height: 88rpx;
  background: #fff;
  border-bottom: 1rpx solid #ececec;
}
.head-info { display: flex; align-items: center; gap: 12rpx; flex: 1; }
.head-avatar { width: 52rpx; height: 52rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.head-title { font-size: 32rpx; font-weight: 600; color: #1a1a1a; }
.head-online { font-size: 20rpx; color: #16a34a; background: #f0fdf4; padding: 2rpx 12rpx; border-radius: 999rpx; }

.msg-area { flex: 1; overflow: hidden; }
.msg-list { padding: 32rpx 24rpx; display: flex; flex-direction: column; gap: 32rpx; }
.msg-row { display: flex; gap: 20rpx; }
.msg-row-user { flex-direction: row-reverse; }
.msg-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 6rpx; }
.bubble { max-width: 80%; border-radius: 24rpx; padding: 20rpx 28rpx; }
.bubble-ai { background: #fff; border: 1rpx solid #ececec; border-top-left-radius: 6rpx; }
.bubble-user { background: #c41e3a; border-top-right-radius: 6rpx; }
.bubble-text { font-size: 28rpx; line-height: 1.6; white-space: pre-wrap; color: inherit; }
.bubble-ai .bubble-text { color: #1a1a1a; }
.bubble-user .bubble-text { color: #fff; }
.bubble-time { display: block; font-size: 20rpx; margin-top: 8rpx; color: #999; }
.time-user { color: rgba(255, 255, 255, 0.7); }
.typing { padding: 24rpx 28rpx; }
.dots { display: flex; gap: 10rpx; }
.dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: rgba(196, 30, 58, 0.6); }
.anchor { height: 1rpx; }

.quick-bar { flex-shrink: 0; white-space: nowrap; padding: 12rpx 0; }
.quick-row { display: inline-flex; gap: 16rpx; padding: 0 24rpx; }
.quick-chip {
  flex-shrink: 0; font-size: 24rpx; color: #1a1a1a;
  padding: 12rpx 24rpx; border-radius: 999rpx;
  border: 1rpx solid #ececec; background: rgba(0, 0, 0, 0.02);
}

.input-bar {
  flex-shrink: 0;
  display: flex; align-items: flex-end; gap: 16rpx;
  padding: 16rpx 24rpx 8rpx;
  border-top: 1rpx solid #ececec;
  background: #fff;
}
.input {
  flex: 1; min-height: 72rpx; max-height: 240rpx;
  border-radius: 24rpx; background: rgba(0, 0, 0, 0.03);
  padding: 18rpx 28rpx; font-size: 28rpx; color: #1a1a1a;
}
.send-btn {
  width: 80rpx; height: 80rpx; border-radius: 50%; flex-shrink: 0;
  background: #c41e3a; display: flex; align-items: center; justify-content: center;
}
.send-btn.disabled { opacity: 0.5; }
.tip { font-size: 22rpx; color: #aaa; text-align: center; padding: 8rpx 24rpx 16rpx; background: #fff; }
</style>
