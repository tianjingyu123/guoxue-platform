<template>
  <view class="min-h-screen bg-background pb-4">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-white/95 border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="p-2 -ml-2">
          <text class="text-lg text-foreground">←</text>
        </view>
        <text class="font-semibold text-base text-foreground">付费问答</text>
        <view
          @click="showAskModal = true"
          class="px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-full"
        >
          我要提问
        </view>
      </view>

      <!-- 筛选Tab -->
      <view class="flex items-center gap-4 px-4 h-10">
        <view
          v-for="tab in tabs" :key="tab.id"
          @click="activeTab = tab.id"
          :class="['relative pb-2.5 text-sm font-medium transition-colors', activeTab === tab.id ? 'text-primary' : 'text-muted-foreground']"
        >
          {{ tab.label }}
          <text class="ml-1 text-xs">({{ tab.count }})</text>
          <view v-if="activeTab === tab.id" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
        </view>
      </view>
    </view>

    <!-- 问答列表 -->
    <view class="px-4 py-4 space-y-3">
      <template v-if="filteredQA.length > 0">
        <view v-for="qa in filteredQA" :key="qa.id" class="bg-white rounded-xl p-4" @click="goDetail(qa.id)">
          <!-- 提问者信息 -->
          <view class="flex items-center justify-between mb-3">
            <view class="flex items-center gap-2">
              <view class="w-6 h-6 rounded-full bg-background flex items-center justify-center">
                <text class="text-[10px] text-muted-foreground">匿</text>
              </view>
              <text class="text-xs text-muted-foreground">{{ qa.asker.name }}</text>
              <text class="text-xs text-[#BBB]">{{ qa.askTime }}</text>
            </view>
            <text :class="['text-[10px] px-1.5 py-0 rounded', qa.status === 'answered' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500']">
              {{ qa.status === 'answered' ? '已回答' : '待回答' }}
            </text>
          </view>

          <!-- 问题内容 -->
          <view class="mb-3">
            <view class="flex items-start gap-2">
              <text class="text-primary mt-0.5 flex-shrink-0">❓</text>
              <text class="text-sm text-foreground leading-relaxed">{{ qa.question }}</text>
            </view>
          </view>

          <!-- 回答内容 -->
          <view v-if="qa.status === 'answered' && qa.answer" class="pl-6 mb-3">
            <view class="flex items-center gap-2 mb-2">
              <view class="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                <text class="text-[10px] text-accent">{{ qa.answerer.name[0] }}</text>
              </view>
              <text class="text-xs font-medium text-foreground">{{ qa.answerer.name }}</text>
              <text class="text-[10px] px-1 py-0 bg-accent/10 text-accent rounded">{{ qa.answerer.role }}</text>
            </view>
            <text class="text-sm text-muted-foreground line-clamp-2">{{ qa.answer }}</text>
          </view>

          <!-- 底部数据 -->
          <view class="flex items-center justify-between pt-2 border-t border-border/50">
            <view class="flex items-center gap-3 text-xs text-muted-foreground">
              <text class="flex items-center gap-1"> {{ qa.viewCount }}人围观</text>
              <text v-if="qa.status === 'answered'" class="flex items-center gap-1"> {{ qa.viewPrice }}币围观</text>
            </view>
            <text class="text-muted-foreground">›</text>
          </view>
        </view>
      </template>

      <!-- 空状态 -->
      <view v-else class="flex flex-col items-center justify-center py-20">
        <view class="w-20 h-20 rounded-full bg-background flex items-center justify-center mb-4">
          <text class="text-3xl text-muted-foreground"></text>
        </view>
        <text class="text-muted-foreground text-sm">还没有人提问</text>
        <text class="text-muted-foreground/70 text-xs mt-1">成为第一个提问者吧</text>
        <view
          @click="showAskModal = true"
          class="mt-4 px-6 py-2 bg-primary text-white text-sm font-medium rounded-full"
        >
          我要提问
        </view>
      </view>
    </view>

    <!-- 提问弹窗（单屏：回答者选择+问题表单+费用确认） -->
    <view v-if="showAskModal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <view class="w-full max-w-lg bg-white rounded-t-2xl max-h-[90vh] overflow-hidden" @click.stop>
        <!-- 弹窗头部 -->
        <view class="flex items-center justify-between px-4 h-14 border-b border-border">
          <view @click="showAskModal = false" class="text-sm text-muted-foreground">取消</view>
          <text class="font-semibold text-base text-foreground">发起提问</text>
          <view class="w-10" />
        </view>

        <scroll-view scroll-y class="max-h-[calc(90vh-56px-80px)] p-4" style="max-height: calc(90vh - 56px - 80px);">
          <view class="space-y-4">
            <!-- 选择提问对象 -->
            <view>
              <text class="text-sm font-medium text-foreground mb-2 block">
                选择提问对象 <text class="text-primary">*</text>
              </text>
              <view class="space-y-2">
                <view
                  v-for="person in answerers" :key="person.id"
                  @click="selectedAnswerer = person"
                  :class="['p-3 rounded-xl transition-all', selectedAnswerer?.id === person.id ? 'border border-primary bg-primary/5' : 'bg-background']"
                >
                  <view class="flex items-center gap-3">
                    <view class="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-medium">
                      {{ person.name[0] }}
                    </view>
                    <view class="flex-1">
                      <view class="flex items-center gap-2">
                        <text class="font-medium text-sm text-foreground">{{ person.name }}</text>
                        <text class="text-[10px] px-1 py-0 bg-accent/10 text-accent rounded">{{ person.role }}</text>
                      </view>
                      <view class="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <text>回复率 {{ person.responseRate }}%</text>
                        <text>平均 {{ person.avgTime }}</text>
                      </view>
                    </view>
                    <view class="text-right">
                      <text class="text-primary font-semibold text-sm">{{ person.price }}币</text>
                      <text class="text-[10px] text-muted-foreground block">提问价格</text>
                    </view>
                    <view v-if="selectedAnswerer?.id === person.id" class="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <text class="text-white text-xs">✓</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <!-- 问题标题 -->
            <view>
              <text class="text-sm font-medium text-foreground mb-2 block">
                问题标题 <text class="text-primary">*</text>
              </text>
              <input
                v-model="questionTitle"
                placeholder="请简要描述你的问题"
                maxlength="50"
                class="w-full px-3 py-2.5 bg-background rounded-lg text-sm text-foreground"
              />
              <text class="text-xs text-muted-foreground mt-1 text-right block">{{ questionTitle.length }}/50</text>
            </view>

            <!-- 详细描述 -->
            <view>
              <text class="text-sm font-medium text-foreground mb-2 block">
                详细描述 <text class="text-muted-foreground text-xs">(选填)</text>
              </text>
              <textarea
                v-model="questionDetail"
                placeholder="请详细描述你的问题，提供更多背景信息有助于获得更精准的回答"
                maxlength="500"
                rows="4"
                class="w-full px-3 py-2.5 bg-background rounded-lg text-sm text-foreground resize-none"
              />
              <text class="text-xs text-muted-foreground mt-1 text-right block">{{ questionDetail.length }}/500</text>
            </view>

            <!-- 匿名设置 -->
            <view class="flex items-center justify-between py-2">
              <view>
                <text class="text-sm font-medium text-foreground block">匿名提问</text>
                <text class="text-xs text-muted-foreground">其他用户将无法看到你的身份</text>
              </view>
              <view
                @click="isAnonymous = !isAnonymous"
                :class="['relative w-12 h-7 rounded-full transition-colors', isAnonymous ? 'bg-primary' : 'bg-[#E8E0D5]']"
              >
                <view :class="['absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform', isAnonymous ? 'right-1' : 'left-1']" />
              </view>
            </view>

            <!-- 费用说明 -->
            <view v-if="selectedAnswerer" class="p-3 bg-accent/5 border border-accent/20 rounded-xl">
              <view class="flex items-center justify-between">
                <text class="text-sm text-muted-foreground">提问费用</text>
                <text class="text-lg font-bold text-primary">{{ selectedAnswerer.price }} 国学币</text>
              </view>
              <text class="text-xs text-muted-foreground mt-1 block">
                提问后若7天内未获回答，费用将自动退还
              </text>
            </view>
          </view>
        </scroll-view>

        <!-- 底部操作 -->
        <view class="px-4 py-4 border-t border-border bg-white">
          <view
            @click="handleSubmitQuestion"
            :class="['w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2', selectedAnswerer && questionTitle.trim() && !isSubmitting ? 'bg-primary text-white' : 'bg-background text-[#CCC]']"
          >
            <template v-if="isSubmitting">
              <text></text>
              <text>提交中...</text>
            </template>
            <template v-else>
              <text>确认支付并提问</text>
              <text v-if="selectedAnswerer">({{ selectedAnswerer.price }}币)</text>
            </template>
          </view>
        </view>
      </view>
    </view>

    <!-- 提问成功弹窗 -->
    <view v-if="showSuccessModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <view class="w-[85%] max-w-sm bg-white rounded-2xl p-6 text-center">
        <view class="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
          <text class="text-3xl"></text>
        </view>
        <text class="text-lg font-semibold text-foreground block mb-2">提问成功</text>
        <text class="text-sm text-muted-foreground block mb-6">
          你的问题已提交，请耐心等待回答。回答后会通过消息通知你。
        </text>
        <view
          @click="showSuccessModal = false"
          class="w-full py-3 bg-primary text-white text-sm font-medium rounded-xl"
        >
          知道了
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Answerer {
  id: number; name: string; avatar: string; role: string; price: number; responseRate: number; avgTime: string
}

interface QAItem {
  id: number
  asker: { name: string; avatar: string }
  question: string
  images: string[]
  askTime: string
  answerer: { name: string; avatar: string; role: string }
  answer: string | null
  answerTime: string | null
  status: 'answered' | 'pending'
  viewCount: number
  viewPrice: number
  questionPrice: number
}

const activeTab = ref<'all' | 'answered' | 'pending'>('all')
const showAskModal = ref(false)
const selectedAnswerer = ref<Answerer | null>(null)
const questionTitle = ref('')
const questionDetail = ref('')
const isAnonymous = ref(true)
const isSubmitting = ref(false)
const showSuccessModal = ref(false)

const answerers: Answerer[] = [
  { id: 1, name: '周易大师', avatar: '', role: '圈主', price: 10, responseRate: 98, avgTime: '2小时内' },
  { id: 2, name: '张玄风', avatar: '', role: '嘉宾', price: 20, responseRate: 95, avgTime: '4小时内' },
  { id: 3, name: '李易安', avatar: '', role: '嘉宾', price: 15, responseRate: 90, avgTime: '6小时内' },
]

const qaList: QAItem[] = [
  {
    id: 1,
    asker: { name: '匿名用户', avatar: '' },
    question: '八字中日主偏弱，是否一定要补强？有没有弱而不补反而更好的情况？',
    images: [],
    askTime: '2小时前',
    answerer: { name: '周易大师', avatar: '', role: '圈主' },
    answer: '这是一个很好的问题。八字论命，并非简单的强弱补泄。有些格局如「从格」，日主极弱反而要顺其势，补强反为不美...',
    answerTime: '1小时前',
    status: 'answered',
    viewCount: 128,
    viewPrice: 1,
    questionPrice: 10,
  },
  {
    id: 2,
    asker: { name: '匿名用户', avatar: '' },
    question: '请问紫微斗数中的「四化」如何理解？特别是化忌在不同宫位的含义有什么区别？',
    images: [],
    askTime: '5小时前',
    answerer: { name: '张玄风', avatar: '', role: '嘉宾' },
    answer: '四化是紫微斗数的精髓，化禄主福、化权主权、化科主名、化忌主烦。化忌在不同宫位的影响...',
    answerTime: '3小时前',
    status: 'answered',
    viewCount: 256,
    viewPrice: 2,
    questionPrice: 20,
  },
  {
    id: 3,
    asker: { name: '匿名用户', avatar: '' },
    question: '风水布局中，客厅沙发背后是窗户怎么化解？',
    images: [],
    askTime: '1天前',
    answerer: { name: '周易大师', avatar: '', role: '圈主' },
    answer: null,
    answerTime: null,
    status: 'pending',
    viewCount: 0,
    viewPrice: 1,
    questionPrice: 10,
  },
  {
    id: 4,
    asker: { name: '匿名用户', avatar: '' },
    question: '八字中的「桃花」和「红鸾」有什么区别？对感情的影响一样吗？',
    images: [],
    askTime: '2天前',
    answerer: { name: '周易大师', avatar: '', role: '圈主' },
    answer: '桃花与红鸾虽都主感情桃花，但性质不同。桃花多指异性缘、人缘，有正桃花和烂桃花之分...',
    answerTime: '1天前',
    status: 'answered',
    viewCount: 512,
    viewPrice: 1,
    questionPrice: 10,
  },
]

const tabs = computed(() => [
  { id: 'all' as const, label: '全部', count: qaList.length },
  { id: 'answered' as const, label: '已回答', count: qaList.filter(q => q.status === 'answered').length },
  { id: 'pending' as const, label: '待回答', count: qaList.filter(q => q.status === 'pending').length },
])

const filteredQA = computed(() => {
  if (activeTab.value === 'all') return qaList
  return qaList.filter(qa => qa.status === activeTab.value)
})

async function handleSubmitQuestion() {
  if (!selectedAnswerer.value || !questionTitle.value.trim()) return
  isSubmitting.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  isSubmitting.value = false
  showAskModal.value = false
  showSuccessModal.value = true
  selectedAnswerer.value = null
  questionTitle.value = ''
  questionDetail.value = ''
}

function goBack() { uni.navigateBack() }
function goDetail(id: number) { uni.navigateTo({ url: `/pages/circles/id-detail/qa/detail/index?id=${id}` }) }
</script>
