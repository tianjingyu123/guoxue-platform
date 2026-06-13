<template>
  <view class="min-h-screen bg-background pb-4">
    <!-- Top nav -->
    <view class="sticky top-0 z-40 bg-background/95 border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="p-1 -ml-1"><text class="text-2xl text-foreground leading-none">←</text></view>
        <text class="font-semibold text-base text-foreground">付费问答</text>
        <view @click="showAskModal = true" class="px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-full">
          <text>我要提问</text>
        </view>
      </view>
      <!-- Filter tabs -->
      <view class="flex items-center gap-4 px-4 h-10 border-b border-border">
        <view v-for="tab in tabs" :key="tab.id" class="relative pb-2.5 text-sm font-medium" :class="activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'" @click="activeTab = tab.id">
          <text>{{ tab.label }}<text class="ml-1 text-xs">({{ tab.count }})</text></text>
          <view v-if="activeTab === tab.id" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
        </view>
      </view>
    </view>

    <!-- QA list -->
    <view class="px-4 py-4 space-y-3">
      <template v-if="filteredQA.length > 0">
        <view v-for="qa in filteredQA" :key="qa.id" class="bg-white rounded-xl p-4 shadow-sm" @click="goQADetail(qa.id)">
          <view class="flex items-center justify-between mb-3">
            <view class="flex items-center gap-2">
              <view class="w-6 h-6 rounded-full bg-[#F0EDE8] flex items-center justify-center text-muted-foreground text-[10px]">
                <text>匿</text>
              </view>
              <text class="text-xs text-muted-foreground">{{ qa.asker.name }}</text>
              <text class="text-xs text-muted-foreground/60">{{ qa.askTime }}</text>
            </view>
            <text class="text-[10px] px-1.5 py-0.5 rounded" :class="qa.status === 'answered' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'">
              {{ qa.status === 'answered' ? '已回答' : '待回答' }}
            </text>
          </view>
          <view class="mb-3">
            <view class="flex items-start gap-2">
              <text class="text-primary text-sm mt-0.5 flex-shrink-0">❓</text>
              <text class="text-sm text-foreground leading-relaxed">{{ qa.question }}</text>
            </view>
          </view>
          <view v-if="qa.status === 'answered' && qa.answer" class="pl-6 mb-3">
            <view class="flex items-center gap-2 mb-2">
              <view class="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px]">
                <text>{{ qa.answerer.name[0] }}</text>
              </view>
              <text class="text-xs font-medium text-foreground">{{ qa.answerer.name }}</text>
              <text class="text-[10px] px-1 py-0 bg-accent/10 text-accent rounded">{{ qa.answerer.role }}</text>
            </view>
            <text class="text-sm text-ink-soft line-clamp-2">{{ qa.answer }}</text>
          </view>
          <view class="flex items-center justify-between pt-2" style="border-top:1px solid rgba(232,227,219,0.5)">
            <view class="flex items-center gap-3 text-xs text-muted-foreground">
              <text class="flex items-center gap-1"> {{ qa.viewCount }}人围观</text>
              <text v-if="qa.status === 'answered'" class="flex items-center gap-1"> {{ qa.viewPrice }}币围观</text>
            </view>
            <text class="text-muted-foreground text-lg leading-none">›</text>
          </view>
        </view>
      </template>
      <template v-else>
        <view class="flex flex-col items-center justify-center py-20">
          <view class="w-20 h-20 rounded-full bg-[#F0EDE8] flex items-center justify-center mb-4">
            <text class="text-3xl text-muted-foreground"></text>
          </view>
          <text class="text-muted-foreground text-sm">还没有人提问</text>
          <text class="text-muted-foreground/70 text-xs mt-1">成为第一个提问者吧</text>
          <view @click="showAskModal = true" class="mt-4 px-6 py-2 bg-primary text-white text-sm font-medium rounded-full">
            <text>我要提问</text>
          </view>
        </view>
      </template>
    </view>

    <!-- Ask modal -->
    <view v-if="showAskModal">
      <view class="fixed inset-0 z-50 bg-black/60" @click="showAskModal = false" />
      <view class="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[90vh] overflow-hidden" style="padding-bottom:calc(16px + env(safe-area-inset-bottom));">
        <view class="flex items-center justify-between px-4 h-14" style="border-bottom:1px solid #E8E0D5;">
          <view @click="showAskModal = false"><text class="text-sm text-muted-foreground">取消</text></view>
          <text class="font-semibold text-base text-foreground">发起提问</text>
          <view class="w-10" />
        </view>
        <view class="overflow-y-auto px-4 py-4 space-y-4" style="max-height:calc(90vh - 56px - 80px);">
          <!-- Select answerer -->
          <view>
            <text class="text-sm font-medium text-foreground block mb-2">选择提问对象 <text class="text-primary">*</text></text>
            <view class="space-y-2">
              <view v-for="person in answerers" :key="person.id" @click="selectedAnswerer = person"
                :class="['p-3 rounded-xl border transition-all', selectedAnswerer?.id === person.id ? 'border-primary bg-primary/5' : 'border-border']">
                <view class="flex items-center gap-3">
                  <view class="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                    <text>{{ person.name[0] }}</text>
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
                  <view v-if="selectedAnswerer?.id === person.id" class="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <text class="text-white text-xs">✓</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
          <!-- Question title -->
          <view>
            <text class="text-sm font-medium text-foreground block mb-2">问题标题 <text class="text-primary">*</text></text>
            <input type="text" v-model="questionTitle" placeholder="请简要描述你的问题" maxlength="50" class="w-full px-3 py-2.5 bg-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground" />
            <text class="text-xs text-muted-foreground block mt-1 text-right">{{ questionTitle.length }}/50</text>
          </view>
          <!-- Question detail -->
          <view>
            <text class="text-sm font-medium text-foreground block mb-2">详细描述 <text class="text-xs text-muted-foreground">(选填)</text></text>
            <textarea v-model="questionDetail" placeholder="请详细描述你的问题，提供更多背景信息有助于获得更精准的回答" maxlength="500" rows="4" class="w-full px-3 py-2.5 bg-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground resize-none" />
            <text class="text-xs text-muted-foreground block mt-1 text-right">{{ questionDetail.length }}/500</text>
          </view>
          <!-- Anonymous toggle -->
          <view class="flex items-center justify-between py-2">
            <view>
              <text class="text-sm font-medium text-foreground block">匿名提问</text>
              <text class="text-xs text-muted-foreground block">其他用户将无法看到你的身份</text>
            </view>
            <view class="w-12 h-7 rounded-full relative transition-colors" :class="isAnonymous ? 'bg-primary' : 'bg-[#F0EDE8]'" @click="isAnonymous = !isAnonymous">
              <view class="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform" :class="isAnonymous ? 'right-1' : 'left-1'" />
            </view>
          </view>
          <!-- Fee info -->
          <view v-if="selectedAnswerer" class="p-3 rounded-xl" style="background:rgba(201,169,110,0.05);border:1px solid rgba(201,169,110,0.2);">
            <view class="flex items-center justify-between">
              <text class="text-sm text-muted-foreground">提问费用</text>
              <text class="text-lg font-bold text-primary">{{ selectedAnswerer.price }} 国学币</text>
            </view>
            <text class="text-xs text-muted-foreground block mt-1">提问后若7天内未获回答，费用将自动退还</text>
          </view>
        </view>
        <view class="px-4 py-4 border-t border-border bg-white">
          <view @click="handleSubmitQuestion"
            :class="['w-full py-3 rounded-xl text-sm font-medium text-center flex items-center justify-center gap-2', canSubmit && !isSubmitting ? 'bg-primary text-white' : 'bg-[#F0EDE8] text-muted-foreground']">
            <text v-if="isSubmitting" class="inline-flex items-center gap-2">
              <text class="inline-block animate-spin"></text>
              提交中...
            </text>
            <text v-else>确认支付并提问{{ selectedAnswerer ? '(' + selectedAnswerer.price + '币)' : '' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Success modal -->
    <view v-if="showSuccessModal">
      <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click="showSuccessModal = false" />
      <view class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <view class="w-[85%] max-w-sm bg-white rounded-2xl p-6 text-center pointer-events-auto">
          <view class="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <text class="text-3xl text-green-500"></text>
          </view>
          <text class="text-lg font-semibold text-foreground block mb-2">提问成功</text>
          <text class="text-sm text-muted-foreground block mb-6">你的问题已提交，请耐心等待回答。回答后会通过消息通知你。</text>
          <view @click="showSuccessModal = false" class="w-full py-3 bg-primary text-white text-sm font-medium rounded-xl text-center">
            <text>知道了</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const qaList = [
  {
    id: 1, asker: { name: '匿名用户', avatar: '' },
    question: '八字中日主偏弱，是否一定要补强？有没有弱而不补反而更好的情况？',
    images: [], askTime: '2小时前',
    answerer: { name: '周易大师', avatar: '', role: '圈主' },
    answer: '这是一个很好的问题。八字论命，并非简单的强弱补泄。有些格局如「从格」，日主极弱反而要顺其势，补强反为不美...',
    answerTime: '1小时前', status: 'answered', viewCount: 128, viewPrice: 1, questionPrice: 10,
  },
  {
    id: 2, asker: { name: '匿名用户', avatar: '' },
    question: '请问紫微斗数中的「四化」如何理解？特别是化忌在不同宫位的含义有什么区别？',
    images: [], askTime: '5小时前',
    answerer: { name: '张玄风', avatar: '', role: '嘉宾' },
    answer: '四化是紫微斗数的精髓，化禄主福、化权主权、化科主名、化忌主烦。化忌在不同宫位的影响...',
    answerTime: '3小时前', status: 'answered', viewCount: 256, viewPrice: 2, questionPrice: 20,
  },
  {
    id: 3, asker: { name: '匿名用户', avatar: '' },
    question: '风水布局中，客厅沙发背后是窗户怎么化解？',
    images: [], askTime: '1天前',
    answerer: { name: '周易大师', avatar: '', role: '圈主' },
    answer: null, answerTime: null, status: 'pending', viewCount: 0, viewPrice: 1, questionPrice: 10,
  },
  {
    id: 4, asker: { name: '匿名用户', avatar: '' },
    question: '八字中的「桃花」和「红鸾」有什么区别？对感情的影响一样吗？',
    images: [], askTime: '2天前',
    answerer: { name: '周易大师', avatar: '', role: '圈主' },
    answer: '桃花与红鸾虽都主感情桃花，但性质不同。桃花多指异性缘、人缘，有正桃花和烂桃花之分...',
    answerTime: '1天前', status: 'answered', viewCount: 512, viewPrice: 1, questionPrice: 10,
  },
]

const answerers = [
  { id: 1, name: '周易大师', avatar: '', role: '圈主', price: 10, responseRate: 98, avgTime: '2小时内' },
  { id: 2, name: '张玄风', avatar: '', role: '嘉宾', price: 20, responseRate: 95, avgTime: '4小时内' },
  { id: 3, name: '李易安', avatar: '', role: '嘉宾', price: 15, responseRate: 90, avgTime: '6小时内' },
]

const activeTab = ref<'all' | 'answered' | 'pending'>('all')
const showAskModal = ref(false)
const selectedAnswerer = ref<any>(null)
const questionTitle = ref('')
const questionDetail = ref('')
const isAnonymous = ref(true)
const isSubmitting = ref(false)
const showSuccessModal = ref(false)

const tabs = computed(() => [
  { id: 'all', label: '全部', count: qaList.length },
  { id: 'answered', label: '已回答', count: qaList.filter(q => q.status === 'answered').length },
  { id: 'pending', label: '待回答', count: qaList.filter(q => q.status === 'pending').length },
])

const filteredQA = computed(() => {
  if (activeTab.value === 'all') return qaList
  return qaList.filter(q => q.status === activeTab.value)
})

const canSubmit = computed(() => !!selectedAnswerer.value && !!questionTitle.value.trim())

function goBack() { uni.navigateBack() }
function goQADetail(id: number) {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const circleId = (currentPage?.$page?.options?.id) || ''
  uni.navigateTo({ url: `/pages/circle/id-detail/qa/${id}/index?circleId=${circleId}` })
}

function handleSubmitQuestion() {
  if (!selectedAnswerer.value || !questionTitle.value.trim()) {
    uni.showToast({ title: '请选择提问对象并填写标题', icon: 'none' })
    return
  }
  isSubmitting.value = true
  // 模拟提交 - 匹配 V0 setTimeout(resolve, 1500)
  setTimeout(() => {
    isSubmitting.value = false
    showAskModal.value = false
    showSuccessModal.value = true
    selectedAnswerer.value = null
    questionTitle.value = ''
    questionDetail.value = ''
  }, 1500)
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
