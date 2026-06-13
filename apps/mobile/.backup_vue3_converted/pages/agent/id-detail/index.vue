<template>
  <view class="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
    <!-- 语音通话界面 -->
    <view v-if="isInCall" class="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <!-- 动态背景 -->
      <view class="absolute inset-0 overflow-hidden">
        <view class="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <view class="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s" />
      </view>

      <!-- 通话信息 -->
      <view class="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        <!-- 头像 - 带动态光环 -->
        <view class="relative mb-6">
          <view class="absolute -inset-2 bg-gradient-to-r from-primary via-[#C9A96E] to-primary rounded-full blur-md opacity-50 animate-[spin-slow_8s_linear_infinite]" />
          <view class="w-28 h-28 rounded-full ring-4 ring-white/20 relative flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600 text-white">
            <text class="text-5xl">🤖</text>
            <!-- 在线指示器 -->
            <text class="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse" />
          </view>
        </view>

        <text class="text-xl font-semibold text-white mb-1">{{ agentData.name }}</text>
        <view class="text-white/60 text-sm mb-4 flex items-center gap-1">
          <text class="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block mr-1" />
          <text>通话中</text>
        </view>

        <!-- 通话时长和费用 -->
        <view class="bg-white/10 backdrop-blur-lg rounded-2xl px-6 py-3 mb-8">
          <text class="text-3xl font-mono text-white text-center block">{{ formatDuration(callDuration) }}</text>
          <text class="text-white/60 text-xs text-center mt-1 block">
            ¥{{ agentData.callPrice }}/分钟 · 已消费 ¥{{ (callDuration / 60 * agentData.callPrice).toFixed(2) }}
          </text>
        </view>

        <!-- 语音波形动画 -->
        <view class="flex items-center gap-1 mb-8">
          <view
            v-for="(bar, i) in soundBarStyles"
            :key="i"
            class="w-1 bg-gradient-to-t from-primary to-accent rounded-full animate-[soundwave_0.5s_ease-in-out_infinite_alternate]"
            :style="{ height: bar.height, animationDelay: bar.animationDelay }"
          />
        </view>

        <!-- 通话中推荐卡片 -->
        <view v-if="callRecommendation" class="absolute bottom-40 left-4 right-4 animate-in slide-in-from-bottom-4 duration-300">
          <view class="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-3">
            <text class="text-white/80 text-xs mb-2 flex items-center gap-1">
              <text class="animate-pulse"></text> 为您推荐
            </text>
            <view @click="goTo('/pages/course/' + callRecommendation.data.id + '/index')" class="flex items-center gap-3">
              <view class="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                <text class="text-white/80 text-xl"></text>
              </view>
              <view class="flex-1">
                <text class="text-white text-sm font-medium block">{{ callRecommendation.data.title }}</text>
                <text class="text-white/60 text-xs block">¥{{ callRecommendation.data.price }}</text>
              </view>
              <text class="text-white/40 text-sm">→</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 通话控制按钮 -->
      <view class="pb-12 px-8 relative z-10" style="padding-bottom: env(safe-area-inset-bottom);">
        <view class="flex items-center justify-center gap-8">
          <view
            @click="isMicMuted = !isMicMuted"
            :class="['w-14 h-14 rounded-full flex items-center justify-center transition-colors', isMicMuted ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80']"
          >
            <text class="text-2xl">{{ isMicMuted ? '' : '' }}</text>
          </view>
          <view
            @click="toggleCall"
            class="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center transition-colors shadow-lg"
            style="box-shadow: 0 10px 25px -5px rgba(239, 68, 68, 0.3);"
          >
            <text class="text-3xl text-white">📵</text>
          </view>
          <view
            @click="isMuted = !isMuted"
            :class="['w-14 h-14 rounded-full flex items-center justify-center transition-colors', isMuted ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80']"
          >
            <text class="text-2xl">{{ isMuted ? '' : '' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 顶部导航栏 -->
    <view class="sticky top-0 z-40 bg-gradient-to-b from-[#FAF8F5] via-[#FAF8F5] to-[#FAF8F5]/80 backdrop-blur-xl border-b border-border/50" style="padding-top: var(--status-bar-height);">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="p-2 -ml-2 rounded-full">
          <text class="text-foreground text-lg">←</text>
        </view>

        <view class="flex items-center gap-3">
          <!-- 头像 - 带动态边框 -->
          <view class="relative">
            <view class="absolute -inset-0.5 bg-gradient-to-r from-primary via-[#C9A96E] to-primary rounded-full opacity-75 blur-sm animate-pulse" />
            <view class="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600 text-white text-xs flex items-center justify-center relative ring-2 ring-[#FAF8F5]">
              <text>🤖</text>
            </view>
            <text class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#FAF8F5]" />
          </view>
          <view>
            <text class="font-semibold text-sm text-foreground block">{{ agentData.name }}</text>
            <view class="text-[10px] text-green-500 flex items-center gap-1">
              <text class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
              <text>在线</text>
            </view>
          </view>
        </view>

        <view class="flex items-center gap-1">
          <view
            @click="isMuted = !isMuted"
            :class="['p-2 rounded-full transition-colors', isMuted ? 'text-muted-foreground' : 'text-accent']"
          >
            <text class="text-lg">{{ isMuted ? '' : '' }}</text>
          </view>

          <view
            v-if="!isInCall"
            @click="toggleCall"
            class="p-2 rounded-full text-primary transition-colors"
          >
            <text class="text-lg">📞</text>
          </view>

          <view class="relative">
            <view
              @click="showMenu = !showMenu"
              class="p-2 rounded-full transition-colors"
            >
              <text class="text-muted-foreground text-lg">⋯</text>
            </view>

            <view v-if="showMenu" class="absolute right-0 top-full mt-2 w-44 bg-white border border-border rounded-xl shadow-lg overflow-hidden z-50">
              <view
                @click="handleGenerateSummary"
                class="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground transition-colors"
                hover-class="bg-secondary"
              >
                <text></text>
                <text>生成对话总结</text>
              </view>
              <view
                @click="handleClearContext"
                class="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground transition-colors border-t border-border"
                hover-class="bg-secondary"
              >
                <text>🗑️</text>
                <text>清除上下文</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 消耗提示 - 渐变背景 -->
    <view class="px-4 py-2 bg-gradient-to-r from-primary/5 via-[#C9A96E]/5 to-primary/5 border-b border-border/50">
      <view class="flex items-center justify-between text-xs">
        <view class="flex items-center gap-1.5 text-muted-foreground">
          <text class="text-accent animate-pulse">⚡</text>
          <text>剩余免费次数：<text class="text-accent font-bold">{{ freeRemaining }}</text> 次</text>
        </view>
        <view class="flex items-center gap-3 text-muted-foreground">
          <text class="flex items-center gap-1">
            <text></text>{{ agentData.pricePerChat }}元/次
          </text>
          <text class="flex items-center gap-1">
            <text>📞</text>{{ agentData.callPrice }}元/分钟
          </text>
        </view>
      </view>
    </view>

    <!-- 对话区域 -->
    <scroll-view
      class="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      scroll-y
      :scroll-into-view="scrollToId"
      scroll-with-animation
      @touchmove="showMenu = false"
    >
      <view
        v-for="msg in messages"
        :key="msg.id"
        :id="'msg-' + msg.id"
        :class="['flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row']"
      >
        <!-- 助手头像 -->
        <view v-if="msg.role === 'assistant'" class="relative flex-shrink-0">
          <view class="w-8 h-8 rounded-full ring-2 ring-primary/20 bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600 text-white text-xs flex items-center justify-center">
            <text>🤖</text>
          </view>
        </view>

        <view :class="['max-w-[85%]', msg.role === 'user' ? 'flex flex-col items-end' : '']">
          <view
            :class="['rounded-2xl px-4 py-3 text-sm leading-relaxed', msg.role === 'user' ? 'bg-gradient-to-br from-primary to-primary/90 text-white rounded-br-md shadow-lg' : 'bg-white text-foreground rounded-bl-md border border-border']"
            :style="msg.role === 'user' ? 'box-shadow: 0 10px 15px -3px rgba(196, 30, 58, 0.2);' : ''"
          >
            <text
              :class="['whitespace-pre-wrap text-sm', msg.isStreaming ? 'after:content-[&quot;|&quot;] after:animate-[blink_0.7s_infinite]' : '']"
            >{{ msg.content }}</text>
          </view>

          <!-- 推荐卡片区域 -->
          <view v-if="msg.role === 'assistant' && msg.recommendations && msg.recommendations.length && !msg.isStreaming" class="mt-3 space-y-2">
            <text class="text-xs text-muted-foreground flex items-center gap-1">
              <text class="text-accent animate-pulse"></text> 为您推荐
            </text>
            <view v-for="(rec, idx) in msg.recommendations" :key="idx">
              <!-- 课程推荐 -->
              <view v-if="rec.type === 'course'" @click="goTo('/pages/course/' + rec.data.id + '/index')" class="flex gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10" hover-class="opacity-80">
                <view class="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                  <text class="text-primary text-xl">▶️</text>
                </view>
                <view class="flex-1 min-w-0">
                  <view class="flex items-start justify-between gap-2">
                    <text class="text-sm font-medium text-foreground line-clamp-1 block">{{ rec.data.title }}</text>
                    <view class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded flex-shrink-0"><text>推荐</text></view>
                  </view>
                  <text class="text-xs text-muted-foreground mt-0.5 block">{{ rec.data.instructor }} · {{ rec.data.students }}人已学</text>
                  <view class="flex items-center gap-2 mt-1.5">
                    <text class="text-sm font-bold text-primary">¥{{ rec.data.price }}</text>
                    <text class="text-xs text-muted-foreground line-through">¥{{ rec.data.originalPrice }}</text>
                    <view class="flex items-center gap-0.5 ml-auto">
                      <text class="text-accent"></text>
                      <text class="text-xs text-muted-foreground">{{ rec.data.rating }}</text>
                    </view>
                  </view>
                </view>
              </view>
              <!-- 圈子推荐 -->
              <view v-if="rec.type === 'circle'" @click="goTo('/pages/circles/' + rec.data.id + '/index')" class="flex gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/10" hover-class="opacity-80">
                <view class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0">
                  <text class="text-emerald-600 text-xl"></text>
                </view>
                <view class="flex-1 min-w-0">
                  <view class="flex items-center gap-2">
                    <text class="text-sm font-medium text-foreground line-clamp-1 block">{{ rec.data.name }}</text>
                    <view v-if="rec.data.price === 0" class="text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded"><text>免费</text></view>
                  </view>
                  <text class="text-xs text-muted-foreground mt-0.5 block">{{ rec.data.description }}</text>
                  <view class="flex items-center gap-2 mt-1">
                    <text class="text-xs text-muted-foreground">{{ rec.data.members }}成员</text>
                    <text v-if="rec.data.price > 0" class="text-sm font-bold text-primary">¥{{ rec.data.price }}</text>
                  </view>
                </view>
                <text class="text-muted-foreground text-sm self-center">→</text>
              </view>
              <!-- 商品推荐 -->
              <view v-if="rec.type === 'product'" @click="goTo('/pages/mall/product/' + rec.data.id + '/index')" class="flex gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/10" hover-class="opacity-80">
                <view class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <text class="text-amber-600 text-xl">️</text>
                </view>
                <view class="flex-1 min-w-0">
                  <text class="text-sm font-medium text-foreground line-clamp-1 block">{{ rec.data.name }}</text>
                  <text class="text-xs text-muted-foreground mt-0.5 block">{{ rec.data.type }} · 已售{{ rec.data.sales }}</text>
                  <view class="flex items-center gap-2 mt-1">
                    <text class="text-sm font-bold text-primary">¥{{ rec.data.price }}</text>
                    <text class="text-xs text-muted-foreground line-through">¥{{ rec.data.originalPrice }}</text>
                  </view>
                </view>
              </view>
              <!-- 排盘工具入口 -->
              <view v-if="rec.type === 'paipan'" @click="goTo('/pages/paipan/index')" class="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20" hover-class="opacity-80">
                <view class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <text class="text-white text-lg">🧭</text>
                </view>
                <view class="flex-1">
                  <text class="text-sm font-medium block">立即排盘</text>
                  <text class="text-xs text-muted-foreground block">使用八字排盘工具生成命盘</text>
                </view>
                <text class="text-muted-foreground text-sm">→</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 正在输入提示 - 三个跳动圆点 -->
      <view v-if="isTyping && messages.length > 0 && messages[messages.length - 1].role === 'user'" class="flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2">
        <view class="w-8 h-8 rounded-full ring-2 ring-primary/20 bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600 text-white text-xs flex items-center justify-center flex-shrink-0">
          <text>🤖</text>
        </view>
        <view class="bg-white text-foreground rounded-2xl rounded-bl-md border border-border px-4 py-3">
          <view class="flex gap-1.5">
            <text class="w-2 h-2 bg-primary rounded-full animate-bounce inline-block" style="animation-delay: 0ms" />
            <text class="w-2 h-2 bg-primary rounded-full animate-bounce inline-block" style="animation-delay: 150ms" />
            <text class="w-2 h-2 bg-primary rounded-full animate-bounce inline-block" style="animation-delay: 300ms" />
          </view>
        </view>
      </view>

      <!-- 对话总结卡片 -->
      <view v-if="showSummary && messages.length > 3" class="mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <view class="p-4 rounded-xl bg-gradient-to-br from-primary/5 via-[#C9A96E]/5 to-primary/5 border border-primary/20">
          <view class="flex items-center gap-2 mb-3">
            <text class="text-accent"></text>
            <text class="font-medium text-sm">对话总结</text>
          </view>
          <view class="text-sm text-muted-foreground space-y-2">
            <text class="block">本次对话共{{ userMessageCount }}个问题，涉及：</text>
            <view class="flex flex-wrap gap-1.5 mt-2">
              <view class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"><text>运势分析</text></view>
              <view class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"><text>事业规划</text></view>
            </view>
          </view>
          <view class="mt-3 pt-3 border-t border-border">
            <text class="text-xs text-muted-foreground mb-2 block">相关推荐</text>
            <scroll-view scroll-x class="flex-row" show-scrollbar="false">
              <view class="flex gap-2">
                <view v-for="course in recommendedCourses.slice(0, 2)" :key="course.id" @click="goTo('/pages/course/' + course.id + '/index')" class="flex-shrink-0">
                  <view class="w-32 p-2 bg-white rounded-lg border border-border">
                    <text class="text-xs font-medium text-foreground line-clamp-1 block">{{ course.title }}</text>
                    <text class="text-[10px] text-muted-foreground mt-0.5 block">¥{{ course.price }}</text>
                  </view>
                </view>
              </view>
            </scroll-view>
          </view>
        </view>
      </view>

      <view id="scroll-end" />
    </scroll-view>

    <!-- 快捷提问标签 -->
    <view v-if="messages.length <= 1" class="px-4 pb-3">
      <text class="text-xs text-muted-foreground mb-2 flex items-center gap-1">
        <text class="text-accent"></text> 快捷提问
      </text>
      <view class="flex flex-wrap gap-2">
        <view
          v-for="(q, idx) in quickQuestions"
          :key="idx"
          @click="handleQuickQuestion(q)"
          class="px-3 py-1.5 bg-gradient-to-r from-[#F5F1EB] to-[#F5F1EB]/80 text-foreground text-xs rounded-full border border-transparent"
          hover-class="from-primary/10 to-accent/10 border-primary/20"
        >
          <text>{{ q }}</text>
        </view>
      </view>
    </view>

    <!-- 底部输入区 - 科技感边框 -->
    <view class="sticky bottom-0 bg-background/95 backdrop-blur-xl border-t border-border/50 px-4 py-3" style="padding-bottom: env(safe-area-inset-bottom);">
      <view class="flex items-end gap-3">
        <view class="flex-1 relative">
          <textarea
            v-model="inputValue"
            placeholder="输入您的问题..."
            class="relative w-full px-4 py-3 bg-secondary/80 text-foreground text-sm rounded-2xl resize-none placeholder:text-muted-foreground"
            :disabled="isInCall"
            @confirm="handleSend"
            :auto-height="true"
            :maxlength="-1"
          />
        </view>
        <view
          @click="handleSend"
          :class="['w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg', inputValue.trim() && !isTyping ? 'bg-gradient-to-br from-primary to-primary/90' : 'bg-secondary opacity-50']"
          :style="inputValue.trim() && !isTyping ? 'box-shadow: 0 4px 6px -1px rgba(196, 30, 58, 0.25);' : ''"
        >
          <text :class="inputValue.trim() && !isTyping ? 'text-white' : 'text-muted-foreground'">↑</text>
        </view>
      </view>
      <text class="text-[10px] text-muted-foreground/60 text-center mt-2 block">
        此内容由AI生成，仅供参考，不构成专业建议
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { onMounted, onUnmounted } from 'vue'

// 导航辅助
function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

// 智能体数据
const agentData = {
  id: 1,
  name: "八字命理大师",
  avatar: "/placeholder.svg",
  description: "精通八字命理，可为您解读命盘、分析运势",
  tags: ["八字排盘", "运势分析", "婚姻事业"],
  pricePerChat: 0.5,
  freeQuota: 3,
  callPrice: 2,
  gradient: "from-violet-600 via-purple-500 to-indigo-600",
}

// 快捷提问
const quickQuestions = [
  "帮我看看今年的运势如何？",
  "我的八字五行缺什么？",
  "分析一下我的事业运",
  "看看我的婚姻宫情况",
  "帮我解读一下命盘",
]

// 推荐内容数据
const recommendedCourses = [
  { id: 1, title: "八字入门实战课", instructor: "周易大师", price: 199, originalPrice: 299, students: 2680, rating: 4.9 },
  { id: 2, title: "八字看婚姻专题", instructor: "玄学居士", price: 99, originalPrice: 149, students: 1520, rating: 4.8 },
  { id: 3, title: "流年运势精解", instructor: "周易大师", price: 149, originalPrice: 199, students: 1890, rating: 4.9 },
]

const recommendedCircles = [
  { id: 1, name: "八字命理研习社", members: 3280, price: 99, description: "系统学习八字命理" },
  { id: 2, name: "周易大师交流圈", members: 5620, price: 0, description: "与高手一起探讨" },
]

const recommendedProducts = [
  { id: 1, name: "八字命理入门", type: "电子书", price: 29, originalPrice: 49, sales: 856 },
  { id: 2, name: "开运水晶手链", type: "饰品", price: 168, originalPrice: 268, sales: 326 },
]

// 类型定义
interface RecommendItem {
  type: "course" | "circle" | "product" | "paipan"
  data: any
}

interface Message {
  id: number
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isStreaming?: boolean
  recommendations?: RecommendItem[]
  isSummary?: boolean
}

// 组件状态
const messages = ref<Message[]>([])
const inputValue = ref("")
const isTyping = ref(false)
const freeRemaining = ref(agentData.freeQuota)
const showMenu = ref(false)
const isMuted = ref(false)
const isInCall = ref(false)
const callDuration = ref(0)
const isMicMuted = ref(false)
const callRecommendation = ref<RecommendItem | null>(null)
const showSummary = ref(false)
const scrollToId = ref("")
const soundBarStyles = ref<Array<{ height: string; animationDelay: string }>>([])

let callTimer: ReturnType<typeof setInterval> | null = null

// 计算用户消息数
const userMessageCount = computed(() => messages.value.filter(m => m.role === 'user').length)

// 欢迎消息
onMounted(() => {
  const welcomeMessage: Message = {
    id: 0,
    role: "assistant",
    content: `您好！我是${agentData.name}，精通八字命理学，拥有多年实战经验。

我可以为您提供以下服务：
- 八字命盘排盘与解读
- 流年运势分析
- 婚姻事业预测
- 五行调理建议

请告诉我您的出生年月日时（公历或农历均可），我来为您详细分析。`,
    timestamp: new Date(),
    recommendations: [{ type: "paipan", data: null }],
  }
  messages.value = [welcomeMessage]
})

// 滚动到底部
watch(messages, () => {
  nextTick(() => {
    scrollToId.value = "scroll-end"
  })
}, { deep: true })

// 通话计时 - 监听 isInCall 变化
watch(isInCall, (val) => {
  if (val) {
    // 生成语音波形样式
    soundBarStyles.value = Array.from({ length: 12 }, (_, i) => ({
      height: `${20 + Math.random() * 30}px`,
      animationDelay: `${i * 0.05}s`
    }))

    callTimer = setInterval(() => {
      callDuration.value++
      if (callDuration.value % 30 === 0 && callDuration.value > 0) {
        const randomCourse = recommendedCourses[Math.floor(Math.random() * recommendedCourses.length)]
        callRecommendation.value = { type: "course", data: randomCourse }
        setTimeout(() => { callRecommendation.value = null }, 8000)
      }
    }, 1000)
  } else {
    if (callTimer) {
      clearInterval(callTimer)
      callTimer = null
    }
    callDuration.value = 0
    callRecommendation.value = null
  }
})

onUnmounted(() => {
  if (callTimer) {
    clearInterval(callTimer)
    callTimer = null
  }
})

// 格式化通话时长
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 模拟流式输出
const simulateStreaming = (fullText: string, messageId: number, recommendations?: RecommendItem[]) => {
  let currentIndex = 0
  const interval = setInterval(() => {
    if (currentIndex < fullText.length) {
      const charsToAdd = Math.min(3, fullText.length - currentIndex)
      currentIndex += charsToAdd
      messages.value = messages.value.map(msg =>
        msg.id === messageId
          ? { ...msg, content: fullText.slice(0, currentIndex), isStreaming: currentIndex < fullText.length }
          : msg
      )
    } else {
      clearInterval(interval)
      messages.value = messages.value.map(msg =>
        msg.id === messageId ? { ...msg, isStreaming: false, recommendations } : msg
      )
      isTyping.value = false
    }
  }, 25)
}

// 发送消息
const handleSend = () => {
  if (!inputValue.value.trim() || isTyping.value || isInCall.value) return

  const userMessage: Message = {
    id: messages.value.length,
    role: "user",
    content: inputValue.value.trim(),
    timestamp: new Date(),
  }

  messages.value = [...messages.value, userMessage]
  const q = inputValue.value.trim()
  inputValue.value = ""
  isTyping.value = true

  if (freeRemaining.value > 0) {
    freeRemaining.value--
  }

  setTimeout(() => {
    const { text, recommendations } = generateResponse(q)
    const assistantMessage: Message = {
      id: messages.value.length + 1,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    }
    messages.value = [...messages.value, assistantMessage]
    simulateStreaming(text, messages.value.length + 1, recommendations)
  }, 600)
}

// 生成回复（模拟）
const generateResponse = (question: string): { text: string; recommendations?: RecommendItem[] } => {
  if (question.includes("运势") || question.includes("今年")) {
    return {
      text: `根据您提供的信息，让我来分析一下您的运势：

【2024年整体运势】
今年流年甲辰，天干甲木生助，地支辰土为财库，整体运势呈上升趋势。

【事业运】
上半年贵人运旺，适合拓展人脉、寻求合作机会。下半年需稳中求进，不宜冒进。

【财运】
正财稳定，偏财有小进。建议以稳健投资为主，避免高风险操作。

如果您想更深入地了解流年运势的变化规律，我推荐您学习以下课程：`,
      recommendations: [
        { type: "course", data: recommendedCourses[2] },
        { type: "circle", data: recommendedCircles[0] },
      ]
    }
  } else if (question.includes("五行") || question.includes("缺")) {
    return {
      text: `关于五行分析，我需要您提供准确的出生信息：

【所需信息】
1. 出生年份（公历）
2. 出生月份
3. 出生日期
4. 出生时辰（如知道的话）

有了这些信息，我可以为您排出完整八字命盘，分析五行旺衰，判断喜用神。

您可以使用排盘工具快速生成命盘：`,
      recommendations: [
        { type: "paipan", data: null },
        { type: "course", data: recommendedCourses[0] },
      ]
    }
  } else if (question.includes("事业")) {
    return {
      text: `关于事业运的分析：

【事业宫位】
八字中以月柱为事业宫，结合日主强弱、官杀星的配置来综合判断。

【一般建议】
1. 身强者适合独立创业或担任领导职位
2. 身弱者适合稳定工作或与人合作
3. 食伤生财格局利于技术、创意类工作
4. 官杀旺者适合体制内或管理岗位

如需针对性分析，请提供您的八字信息。同时，如果您对事业规划有更多疑问，也欢迎加入我们的交流圈：`,
      recommendations: [
        { type: "circle", data: recommendedCircles[1] },
      ]
    }
  } else if (question.includes("婚姻") || question.includes("感情")) {
    return {
      text: `关于婚姻宫的分析：

【婚姻宫位】
八字中以日支为婚姻宫，代表配偶和婚姻状态。

【影响因素】
1. 日支所坐十神（正财、正官等）
2. 日支与其他地支的刑冲合害
3. 大运流年对婚姻宫的影响

请提供您的出生信息，我可以为您详细分析婚姻运势：`,
      recommendations: [
        { type: "course", data: recommendedCourses[1] },
        { type: "paipan", data: null },
      ]
    }
  } else if (question.includes("化解") || question.includes("调理")) {
    return {
      text: `关于命理调理和化解：

【调理原则】
1. 五行补缺：通过颜色、方位、饰品等补充所缺五行
2. 流年趋避：了解不利时段，提前规避风险
3. 风水调整：居家办公环境的布局优化
4. 心态调整：顺应天时，积极面对

具体的调理方案需要根据您的八字来定制。另外，一些开运饰品也可以起到辅助作用：`,
      recommendations: [
        { type: "product", data: recommendedProducts[1] },
        { type: "course", data: recommendedCourses[2] },
      ]
    }
  }

  return {
    text: `感谢您的提问！

为了给您更准确的命理分析，我需要了解以下信息：

1. **出生日期**：公历年月日
2. **出生时辰**：如早上7点、下午3点等
3. **出生地点**：用于校正真太阳时

有了这些信息，我可以为您排出精准的八字命盘。您也可以先使用排盘工具：`,
    recommendations: [
      { type: "paipan", data: null },
      { type: "course", data: recommendedCourses[0] },
    ]
  }
}

// 快捷提问
const handleQuickQuestion = (question: string) => {
  inputValue.value = question
}

// 清除上下文
const handleClearContext = () => {
  messages.value = [{
    id: 0,
    role: "assistant",
    content: `对话已重置。您好！我是${agentData.name}，有什么可以帮您的？`,
    timestamp: new Date(),
  }]
  showMenu.value = false
  showSummary.value = false
}

// 开始/结束通话
const toggleCall = () => {
  if (isInCall.value) {
    isInCall.value = false
    const endCallMessage: Message = {
      id: messages.value.length,
      role: "assistant",
      content: `通话已结束，本次通话时长 ${formatDuration(callDuration.value)}，消费 ¥${(callDuration.value / 60 * agentData.callPrice).toFixed(2)}。

感谢您的咨询！如果您还有疑问，可以继续文字沟通，或者查看以下学习资源：`,
      timestamp: new Date(),
      recommendations: [
        { type: "course", data: recommendedCourses[Math.floor(Math.random() * recommendedCourses.length)] },
        { type: "circle", data: recommendedCircles[0] },
      ]
    }
    messages.value = [...messages.value, endCallMessage]
  } else {
    isInCall.value = true
  }
}

// 生成对话总结
const handleGenerateSummary = () => {
  showSummary.value = true
  showMenu.value = false
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
@keyframes soundwave {
  0%, 100% { height: 8px; }
  50% { height: 40px; }
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>
