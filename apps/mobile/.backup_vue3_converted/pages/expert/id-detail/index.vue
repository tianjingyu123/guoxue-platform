<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 顶部背景和返回 -->
    <view class="relative">
      <!-- 背景图 -->
      <view class="h-48 bg-gradient-to-br from-primary/30 via-[#C9A96E]/20 to-[#F2EFEA]" />

      <!-- 顶部导航 -->
      <view class="absolute top-0 left-0 right-0 z-10 pt-safe">
        <view class="flex items-center justify-between px-4 h-14">
          <view class="p-2 -ml-2 rounded-full" @click="goBack">
            <text class="text-lg text-foreground">←</text>
          </view>
          <view class="p-2 rounded-full bg-black/20 backdrop-blur-sm">
            <text class="text-white"></text>
          </view>
        </view>
      </view>

      <!-- 达人信息卡片 -->
      <view class="absolute -bottom-20 left-4 right-4">
        <view class="p-4 bg-white rounded-xl shadow-sm">
          <view class="flex gap-4">
            <view class="relative">
              <view class="w-20 h-20 rounded-full bg-[#F2EFEA] flex items-center justify-center ring-4 ring-[#FAF8F5]">
                <text class="bg-primary/10 text-primary text-xl w-full h-full rounded-full flex items-center justify-center">{{ expertData.name[0] }}</text>
              </view>
              <view v-if="expertData.isOnline" class="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#FAF8F5]" />
            </view>
            <view class="flex-1">
              <view class="flex items-center gap-2 flex-wrap">
                <text class="font-bold text-lg text-foreground">{{ expertData.name }}</text>
                <view v-if="expertData.verified" class="bg-accent/20 text-accent text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <text>✓</text><text>认证</text>
                </view>
              </view>
              <text class="text-sm text-muted-foreground">{{ expertData.title }}</text>
              <view class="flex flex-wrap gap-1 mt-2">
                <view v-for="(cert, index) in expertData.certifications" :key="index" class="text-[10px] px-1.5 py-0 border border-primary/30 text-primary rounded">{{ cert }}</view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 主内容区 -->
    <view class="pt-24 px-4 space-y-4">
      <!-- 数据统计 -->
      <view class="p-4 bg-white rounded-xl">
        <view class="grid grid-cols-3 gap-4 text-center">
          <view>
            <text class="text-xl font-bold text-foreground block">{{ expertData.daysJoined }}</text>
            <text class="text-xs text-muted-foreground">入驻天数</text>
          </view>
          <view>
            <text class="text-xl font-bold text-primary block">{{ expertData.answeredCount }}</text>
            <text class="text-xs text-muted-foreground">已解答</text>
          </view>
          <view>
            <text class="text-xl font-bold text-accent block">{{ expertData.goodRate }}%</text>
            <text class="text-xs text-muted-foreground">好评率</text>
          </view>
        </view>
        <view class="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-border">
          <text>🕐</text>
          <text class="text-xs text-muted-foreground">{{ expertData.responseTime }}</text>
        </view>
      </view>

      <!-- 个人简介 -->
      <view class="p-4 bg-white rounded-xl">
        <text class="font-semibold text-sm text-foreground mb-2 block">个人简介</text>
        <text class="text-sm text-muted-foreground leading-relaxed block">{{ expertData.intro }}</text>
        <view class="flex flex-wrap gap-1.5 mt-3">
          <view v-for="(tag, index) in expertData.tags" :key="index" class="text-xs px-2 py-0.5 bg-[#F2EFEA] text-foreground rounded">{{ tag }}</view>
        </view>
      </view>

      <!-- 服务类型与价格 -->
      <view class="p-4 bg-white rounded-xl">
        <text class="font-semibold text-sm text-foreground mb-3 block">咨询服务</text>
        <view class="space-y-3">
          <!-- 图文提问 -->
          <view class="flex items-center justify-between p-3 rounded-xl bg-[#F2EFEA]/50" @click="showQuestionModal = true">
            <view class="flex items-center gap-3">
              <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <text></text>
              </view>
              <view>
                <text class="font-medium text-sm text-foreground block">图文提问</text>
                <text class="text-xs text-muted-foreground">{{ expertData.services.textQuestion.description }}</text>
              </view>
            </view>
            <view class="text-right">
              <text class="font-bold text-primary block">{{ expertData.services.textQuestion.price }}币</text>
              <text class="text-[10px] text-muted-foreground">/{{ expertData.services.textQuestion.unit }}</text>
            </view>
          </view>

          <!-- 音频连麦 -->
          <view class="flex items-center justify-between p-3 rounded-xl bg-[#F2EFEA]/50" @click="openCallModal('voice')">
            <view class="flex items-center gap-3">
              <view class="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <text>📞</text>
              </view>
              <view>
                <text class="font-medium text-sm text-foreground block">音频连麦</text>
                <text class="text-xs text-muted-foreground">{{ expertData.services.voiceCall.description }}</text>
              </view>
            </view>
            <view class="text-right">
              <text class="font-bold text-accent block">{{ expertData.services.voiceCall.priceRange[0] }}-{{ expertData.services.voiceCall.priceRange[1] }}币</text>
              <text class="text-[10px] text-muted-foreground">/{{ expertData.services.voiceCall.unit }}</text>
            </view>
          </view>

          <!-- 视频连麦 -->
          <view class="flex items-center justify-between p-3 rounded-xl bg-[#F2EFEA]/50" @click="openCallModal('video')">
            <view class="flex items-center gap-3">
              <view class="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <text></text>
              </view>
              <view>
                <text class="font-medium text-sm text-foreground block">视频连麦</text>
                <text class="text-xs text-muted-foreground">{{ expertData.services.videoCall.description }}</text>
              </view>
            </view>
            <view class="text-right">
              <text class="font-bold text-green-500 block">{{ expertData.services.videoCall.priceRange[0] }}-{{ expertData.services.videoCall.priceRange[1] }}币</text>
              <text class="text-[10px] text-muted-foreground">/{{ expertData.services.videoCall.unit }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 历史问答 -->
      <view v-if="expertData.historyQA.length > 0" class="p-4 bg-white rounded-xl">
        <view class="flex items-center justify-between mb-3">
          <text class="font-semibold text-sm text-foreground">精选问答</text>
          <text class="text-xs text-primary flex items-center gap-0.5">查看全部 ›</text>
        </view>
        <view class="space-y-3">
          <view v-for="qa in expertData.historyQA" :key="qa.id" class="p-3 rounded-xl bg-[#F2EFEA]/30">
            <text class="text-sm text-foreground font-medium line-clamp-2 block">{{ qa.question }}</text>
            <text class="text-xs text-muted-foreground mt-2 line-clamp-2 block" style="filter: blur(2px)">{{ qa.previewAnswer }}</text>
            <view class="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
              <text class="text-[10px] text-muted-foreground">{{ qa.viewCount }}人围观</text>
              <view class="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full">{{ qa.price }}币围观</view>
            </view>
          </view>
        </view>
      </view>

      <!-- 用户评价 -->
      <view class="p-4 bg-white rounded-xl">
        <view class="flex items-center justify-between mb-3">
          <text class="font-semibold text-sm text-foreground">用户评价</text>
          <view class="flex items-center gap-1">
            <text class="text-accent"></text>
            <text class="text-sm font-medium text-foreground">4.9</text>
            <text class="text-xs text-muted-foreground">({{ expertData.reviews.length }}条)</text>
          </view>
        </view>
        <view class="space-y-4">
          <view v-for="review in expertData.reviews" :key="review.id" class="pb-4 border-b border-border last:border-0 last:pb-0">
            <view class="flex items-center justify-between">
              <view class="flex items-center gap-2">
                <view class="w-8 h-8 rounded-full bg-[#F2EFEA] flex items-center justify-center">
                  <text class="text-xs">{{ review.user[0] }}</text>
                </view>
                <text class="text-sm text-foreground">{{ review.user }}</text>
              </view>
              <view class="flex items-center gap-0.5">
                <text v-for="i in 5" :key="i" class="text-xs" :class="i <= review.rating ? 'text-accent' : 'text-muted-foreground'"></text>
              </view>
            </view>
            <text class="text-sm text-muted-foreground mt-2 leading-relaxed block">{{ review.content }}</text>
            <view class="flex items-center justify-between mt-2">
              <text class="text-[10px] text-muted-foreground">{{ review.time }}</text>
              <view class="flex items-center gap-1 text-[10px] text-muted-foreground">
                <text></text>
                有帮助({{ review.helpful }})
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部固定操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-border safe-area-pb">
      <view class="flex items-center gap-3 px-4 h-16">
        <view class="flex-1 py-3 bg-[#F2EFEA] text-foreground font-medium rounded-xl flex items-center justify-center gap-2" @click="showQuestionModal = true">
          <text></text>
          <text>向TA提问</text>
        </view>
        <view class="flex-1 py-3 bg-primary text-white font-medium rounded-xl flex items-center justify-center gap-2" @click="openCallModal('voice')">
          <text>📞</text>
          <text>立即连麦</text>
        </view>
      </view>
    </view>

    <!-- 提问弹窗 -->
    <view v-if="showQuestionModal">
      <view class="fixed inset-0 z-50 bg-black/60" @click="showQuestionModal = false" />
      <view class="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl overflow-hidden" style="max-height: 85vh">
        <view class="flex items-center justify-between px-4 h-14 border-b border-border">
          <text class="text-muted-foreground" @click="showQuestionModal = false">取消</text>
          <text class="font-semibold text-foreground">向{{ expertData.name }}提问</text>
          <view class="w-10" />
        </view>

        <view class="p-4 space-y-4 overflow-y-auto" style="max-height: calc(85vh - 120px)">
          <view>
            <text class="text-sm text-muted-foreground mb-2 block">问题标题 *</text>
            <input
              v-model="questionTitle"
              type="text"
              placeholder="简要描述你的问题"
              class="w-full px-4 py-3 bg-[#F2EFEA] rounded-xl text-foreground"
              maxlength="50"
            />
            <text class="text-[10px] text-muted-foreground mt-1 text-right block">{{ questionTitle.length }}/50</text>
          </view>

          <view>
            <text class="text-sm text-muted-foreground mb-2 block">详细描述</text>
            <textarea
              v-model="questionContent"
              placeholder="补充出生信息、具体问题等，越详细回答越精准..."
              class="w-full px-4 py-3 bg-[#F2EFEA] rounded-xl text-foreground h-32"
              maxlength="500"
            />
            <text class="text-[10px] text-muted-foreground mt-1 text-right block">{{ questionContent.length }}/500</text>
          </view>

          <view>
            <text class="text-sm text-muted-foreground mb-2 block">上传图片（选填）</text>
            <view class="flex gap-2">
              <view class="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1">
                <text></text>
                <text class="text-[10px] text-muted-foreground">添加图片</text>
              </view>
            </view>
          </view>

          <view class="p-3 bg-accent/5 border border-accent/20 rounded-xl">
            <view class="flex items-center justify-between">
              <text class="text-sm text-foreground">提问费用</text>
              <text class="font-bold text-accent">{{ expertData.services.textQuestion.price }} 国学币</text>
            </view>
            <text class="text-[10px] text-muted-foreground mt-1 block">支付后问题将发送给{{ expertData.name }}，通常24小时内回复</text>
          </view>
        </view>

        <view class="px-4 py-4 border-t border-border">
          <view
            class="w-full py-3 font-medium rounded-xl flex items-center justify-center gap-2"
            :class="questionTitle.trim() && !isSubmitting ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-muted-foreground'"
            @click="handleSubmitQuestion"
          >
            <template v-if="isSubmitting">
              <view class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <text>支付中...</text>
            </template>
            <template v-else>
              <text></text>
              <text>确认支付并提问</text>
            </template>
          </view>
        </view>
      </view>
    </view>

    <!-- 连麦弹窗 -->
    <view v-if="showCallModal">
      <view class="fixed inset-0 z-50 bg-black/60" @click="showCallModal = false" />
      <view class="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl overflow-hidden" style="max-height: 80vh">
        <view class="flex items-center justify-between px-4 h-14 border-b border-border">
          <text class="text-muted-foreground" @click="showCallModal = false">取消</text>
          <text class="font-semibold text-foreground">{{ callType === 'voice' ? '音频' : '视频' }}连麦</text>
          <view class="w-10" />
        </view>

        <view class="p-4 space-y-4">
          <!-- 连麦类型切换 -->
          <view class="flex gap-2">
            <view
              class="flex-1 py-3 rounded-xl font-medium text-center"
              :class="callType === 'voice' ? 'bg-accent text-white' : 'bg-[#F2EFEA] text-muted-foreground'"
              @click="callType = 'voice'"
            >
              <text>音频连麦</text>
            </view>
            <view
              class="flex-1 py-3 rounded-xl font-medium text-center"
              :class="callType === 'video' ? 'bg-green-500 text-white' : 'bg-[#F2EFEA] text-muted-foreground'"
              @click="callType = 'video'"
            >
              <text>视频连麦</text>
            </view>
          </view>

          <!-- 时长选择 -->
          <view>
            <text class="text-sm text-muted-foreground mb-3 block">选择通话时长</text>
            <view class="grid grid-cols-4 gap-2">
              <view
                v-for="duration in expertData.callDurations"
                :key="duration"
                class="py-3 rounded-xl text-sm font-medium text-center"
                :class="selectedDuration === duration
                  ? (callType === 'voice' ? 'bg-accent text-white' : 'bg-green-500 text-white')
                  : 'bg-[#F2EFEA] text-foreground'"
                @click="selectedDuration = duration"
              >
                <text>{{ duration }}分钟</text>
              </view>
            </view>
          </view>

          <!-- 价格说明 -->
          <view class="p-4 bg-[#F2EFEA]/50 rounded-xl">
            <view class="flex items-center justify-between mb-2">
              <text class="text-sm text-muted-foreground">单价</text>
              <text class="text-sm text-foreground">{{ callPrice.perMinute[0] }}-{{ callPrice.perMinute[1] }} 币/分钟</text>
            </view>
            <view class="flex items-center justify-between mb-2">
              <text class="text-sm text-muted-foreground">时长</text>
              <text class="text-sm text-foreground">{{ selectedDuration }} 分钟</text>
            </view>
            <view class="flex items-center justify-between pt-2 border-t border-border">
              <text class="text-sm font-medium text-foreground">预计费用</text>
              <text class="font-bold text-lg" :class="callType === 'voice' ? 'text-accent' : 'text-green-500'">
                {{ callPrice.min }}-{{ callPrice.max }} 币
              </text>
            </view>
          </view>

          <text class="text-[10px] text-muted-foreground text-center block">实际费用按通话时长计算，超时部分按分钟收费</text>
        </view>

        <view class="px-4 py-4 border-t border-border">
          <view
            class="w-full py-3 font-medium rounded-xl flex items-center justify-center gap-2"
            :class="callType === 'voice' ? 'bg-accent text-white' : 'bg-green-500 text-white'"
          >
            <text>📞</text>
            <text>{{ expertData.isOnline ? '立即发起连麦' : '预约连麦时间' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

const expertData = {
  id: 1,
  name: "周易大师",
  avatar: "",
  title: "资深命理师",
  verified: true,
  certifications: ["平台认证讲师", "八字命理专家"],
  background: "",
  intro: "从事命理研究20余年，师承多位名家，擅长八字精批、流年运势、婚姻感情、事业财运分析。已为超过5000位缘主提供咨询服务，好评如潮。",
  daysJoined: 365,
  answeredCount: 1280,
  goodRate: 98,
  responseTime: "通常1小时内回复",
  tags: ["八字精批", "流年运势", "婚姻感情", "事业财运", "起名改名"],
  services: {
    textQuestion: { price: 30, unit: "次", description: "文字/图文提问，24小时内回复" },
    voiceCall: { priceRange: [10, 40], unit: "分钟", description: "实时音频连麦，即问即答" },
    videoCall: { priceRange: [20, 60], unit: "分钟", description: "视频连麦，面对面交流" },
  },
  callDurations: [15, 30, 45, 60],
  reviews: [
    { id: 1, user: "匿***", avatar: "", rating: 5, content: "大师分析得很准确，对我今年的运势讲解很详细，还给了很多建议，非常感谢！", time: "3天前", helpful: 28 },
    { id: 2, user: "缘***", avatar: "", rating: 5, content: "连麦咨询体验很好，大师很有耐心，解答了我很多疑惑，物超所值。", time: "1周前", helpful: 45 },
    { id: 3, user: "易***", avatar: "", rating: 5, content: "八字分析专业，指出了我命中的一些问题，还给了化解方法，非常实用。", time: "2周前", helpful: 32 },
    { id: 4, user: "道***", avatar: "", rating: 4, content: "回复很快，分析也很到位，就是希望能更详细一些。", time: "3周前", helpful: 15 },
  ],
  historyQA: [
    { id: 1, question: "1995年农历五月初五出生，今年事业运势如何？", previewAnswer: "从你的八字来看，今年事业方面会有不错的机遇...", viewCount: 156, price: 1 },
    { id: 2, question: "最近感情不顺，想问问什么时候能遇到正缘？", previewAnswer: "根据你的命盘，感情宫位显示...", viewCount: 203, price: 1 },
  ],
  isOnline: true,
}

const showQuestionModal = ref(false)
const showCallModal = ref(false)
const questionTitle = ref("")
const questionContent = ref("")
const selectedDuration = ref(30)
const callType = ref<"voice" | "video">("voice")
const isSubmitting = ref(false)

function openCallModal(type: "voice" | "video") {
  callType.value = type
  showCallModal.value = true
}

const callPrice = computed(() => {
  const service = callType.value === "voice" ? expertData.services.voiceCall : expertData.services.videoCall
  const minPrice = service.priceRange[0] * selectedDuration.value
  const maxPrice = service.priceRange[1] * selectedDuration.value
  return { min: minPrice, max: maxPrice, perMinute: service.priceRange }
})

function handleSubmitQuestion() {
  if (!questionTitle.value.trim()) return
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    showQuestionModal.value = false
    questionTitle.value = ""
    questionContent.value = ""
    uni.showToast({ title: '提问已发送', icon: 'success' })
  }, 1500)
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
