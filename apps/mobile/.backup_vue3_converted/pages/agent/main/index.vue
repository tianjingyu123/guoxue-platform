<template>
  <view class="flex flex-col h-screen bg-background">
    <!-- 顶部栏 -->
    <view class="flex-shrink-0 sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack"><text class="text-lg">←</text></view>
      <view class="flex items-center gap-2 flex-1">
        <view class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
          <text class="text-sm">🤖</text>
        </view>
        <text class="text-base font-semibold">智玄 AI 助手</text>
        <text class="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">在线</text>
      </view>
      <view class="p-1" @click="resetChat">
        <text></text>
      </view>
    </view>

    <!-- 消息列表 -->
    <scroll-view scroll-y class="flex-1 px-4 py-4" :scroll-into-view="scrollToId">
      <view v-for="msg in messages" :key="msg.id" class="flex gap-3 mb-4" :class="msg.role === 'user' ? 'flex-row-reverse' : ''">
        <view v-if="msg.role === 'assistant'" class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
          <text class="text-sm">🤖</text>
        </view>
        <view
          class="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
          :class="msg.role === 'assistant' ? 'bg-white border border-border rounded-tl-sm' : 'bg-primary text-white rounded-tr-sm'"
        >
          <text class="whitespace-pre-wrap">{{ msg.content }}</text>
          <text class="text-[10px] mt-1 block" :class="msg.role === 'assistant' ? 'text-muted-foreground' : 'text-white/70'">{{ msg.time }}</text>
        </view>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="flex gap-3 mb-4">
        <view class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
          <text class="text-sm">🤖</text>
        </view>
        <view class="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3">
          <view class="flex gap-1">
            <view class="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" />
            <view class="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style="animation-delay:0.15s" />
            <view class="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style="animation-delay:0.3s" />
          </view>
        </view>
      </view>

      <view id="msg-bottom" />
    </scroll-view>

    <!-- 快捷问题 -->
    <view class="shrink-0 px-4 py-2 flex gap-2 overflow-x-auto">
      <view
        v-for="q in quickQuestions"
        :key="q"
        class="shrink-0 text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50"
        @click="send(q)"
      >
        <text>{{ q }}</text>
      </view>
    </view>

    <!-- 输入框 -->
    <view class="shrink-0 px-4 pb-6 pt-2 border-t border-border flex items-end gap-2">
      <textarea
        v-model="inputText"
        class="flex-1 resize-none rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm max-h-32"
        :rows="1"
        placeholder="聊聊国学命理..."
        @confirm="send(inputText)"
      />
      <view
        class="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0"
        :class="!inputText.trim() || loading ? 'opacity-50' : ''"
        @click="send(inputText)"
      >
        <text class="text-white text-sm"></text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

function goBack() { uni.navigateBack() }

const quickQuestions = ['帮我分析今年运势', '我的八字五行缺什么', '解读事业宫位走势', '分析近期财运方向']

const mockReplies: Record<string, string> = {}

interface Message {
  id: string
  role: 'assistant' | 'user'
  content: string
  time: string
}

function nowTime() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const welcomeMsg = '您好！我是智玄 AI 助手，精通八字命理、奇门遁甲、紫微斗数等传统命理学。\n\n您可以向我提问：\n- 八字分析与五行解读\n- 流年运势与注意事项\n- 婚姻、事业、财运预测\n- 风水布局与趋吉避凶\n\n请告诉我您的需求，我将竭诚为您服务。'

const messages = ref<Message[]>([{ id: '0', role: 'assistant', content: welcomeMsg, time: nowTime() }])
const inputText = ref('')
const loading = ref(false)
const scrollToId = ref('')

function resetChat() {
  messages.value = [{ id: '0', role: 'assistant', content: welcomeMsg, time: nowTime() }]
}

async function send(text: string) {
  if (!text.trim() || loading.value) return
  messages.value.push({ id: Date.now().toString(), role: 'user', content: text, time: nowTime() })
  inputText.value = ''
  loading.value = true

  await new Promise((r) => setTimeout(r, 1200))

  const reply = mockReplies[text] || '感谢您的提问。根据您提供的信息，我来为您做详细分析……\n\n（此为演示模式，实际对话将接入 AI 模型进行精准推算。）'
  messages.value.push({ id: (Date.now() + 1).toString(), role: 'assistant', content: reply, time: nowTime() })
  loading.value = false

  await nextTick()
  scrollToId.value = 'msg-bottom'
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
