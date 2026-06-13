<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- Top nav -->
    <view class="sticky top-0 z-40 bg-background/95 border-b border-border" style="padding-top:44px">
      <view class="flex items-center justify-between px-4 h-12">
        <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
        <text class="font-semibold text-base text-foreground">付费咨询</text>
        <view class="relative p-2" @click="goMyOrders">
          <text class="text-lg text-muted-foreground">❓</text>
          <view v-if="myOrders.pendingQuestions + myOrders.pendingCalls > 0" class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center">
            <text>{{ myOrders.pendingQuestions + myOrders.pendingCalls }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Expert banner -->
    <view class="p-4">
      <view class="bg-gradient-to-br from-accent/20 via-[#C41E3A]/10 to-accent/5 rounded-xl border border-accent/30 overflow-hidden">
        <view class="p-4">
          <view class="flex items-start gap-4">
            <view class="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white text-lg font-bold ring-2 ring-[#C9A96E]/50 flex-shrink-0">
              <text>{{ mainExpert.name[0] }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2">
                <text class="font-bold text-base text-foreground">{{ mainExpert.name }}</text>
                <text class="text-[10px] px-1.5 py-0 bg-accent text-white rounded">V</text>
              </view>
              <text class="text-xs text-muted-foreground block mt-0.5">{{ mainExpert.title }}</text>
              <text class="text-xs text-muted-foreground/80 block mt-1 line-clamp-2">{{ mainExpert.intro }}</text>
              <view class="flex items-center gap-4 mt-2">
                <view class="flex items-center gap-1">
                  <text class="text-xs text-accent"></text>
                  <text class="text-xs text-foreground font-medium">{{ mainExpert.rating }}</text>
                </view>
                <text class="text-xs text-muted-foreground">{{ mainExpert.consultCount }}次咨询</text>
                <text class="text-xs text-muted-foreground">{{ mainExpert.responseRate }}%回复率</text>
              </view>
            </view>
          </view>
          <view class="flex items-center gap-3 mt-4">
            <view class="flex-1 flex items-center justify-center gap-2 py-2.5 bg-accent text-white text-sm font-medium rounded-xl" @click="goAsk(mainExpert.id)">
              <text></text>
              <text>提问 {{ mainExpert.askPrice }}币</text>
            </view>
            <view class="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-primary to-[#E74C3C] text-white text-sm font-medium rounded-xl" @click="goCall(mainExpert.id)">
              <text>📹</text>
              <text>连麦 {{ mainExpert.callPrice }}币/分钟</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Expert team -->
    <view class="px-4 pb-4">
      <view class="flex items-center justify-between mb-3">
        <view class="flex items-center gap-2">
          <text class="text-accent text-base"></text>
          <text class="font-semibold text-sm text-foreground">专家团 · 为你解惑</text>
        </view>
        <view class="flex items-center gap-1 text-xs text-muted-foreground" @click="goAllExperts">
          <text>全部</text>
          <text class="text-sm">›</text>
        </view>
      </view>
      <view class="flex gap-3 overflow-x-auto pb-2" style="scrollbar-width:none">
        <view v-for="expert in experts" :key="expert.id" class="flex-shrink-0 w-32" @click="goExpert(expert.id)">
          <view class="bg-white rounded-xl p-3 shadow-sm">
            <view class="flex flex-col items-center">
              <view class="relative">
                <view class="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center text-white font-bold">
                  <text>{{ expert.name[0] }}</text>
                </view>
                <view v-if="expert.isOnline" class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                <text class="absolute -top-1 -right-1 text-accent text-xs bg-accent text-white w-4 h-4 rounded-full flex items-center justify-center">V</text>
              </view>
              <text class="text-sm font-medium text-foreground block mt-2">{{ expert.name }}</text>
              <text class="text-[10px] px-1.5 py-0 mt-1 bg-[#F0EDE8] text-muted-foreground rounded">{{ expert.specialty }}</text>
              <view class="flex items-center gap-1 mt-1">
                <text class="text-accent text-xs"></text>
                <text class="text-[10px] text-muted-foreground">{{ expert.rating }}</text>
              </view>
              <view class="flex items-center gap-2 mt-2 w-full">
                <view class="flex-1 py-1 bg-primary/10 text-primary text-[10px] font-medium rounded text-center" @click.stop="goCall(expert.id)">
                  <text>连麦{{ expert.callPrice }}币</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Featured QA -->
    <view class="px-4">
      <view class="flex items-center justify-between mb-3">
        <text class="font-semibold text-sm text-foreground">精选问答</text>
        <view class="flex items-center gap-1 bg-[#F0EDE8] rounded-lg p-0.5">
          <view v-for="tab in qaTabs" :key="tab.key" class="px-3 py-1 text-xs font-medium rounded-md" :class="activeTab === tab.key ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'" @click="activeTab = tab.key">
            <text>{{ tab.label }}</text>
          </view>
        </view>
      </view>
      <view class="space-y-3 pb-4">
        <view v-for="qa in filteredQAs" :key="qa.id" class="bg-white rounded-xl p-4 shadow-sm">
          <view class="flex items-center justify-between mb-2">
            <view class="flex items-center gap-2">
              <view class="w-6 h-6 rounded-full bg-[#F0EDE8] flex items-center justify-center text-muted-foreground text-xs">
                <text>匿</text>
              </view>
              <text class="text-xs text-muted-foreground">{{ qa.asker.name }}</text>
              <text class="text-xs text-muted-foreground/60">{{ qa.createdAt }}</text>
            </view>
            <text class="text-[10px] px-1.5 py-0 rounded" :class="qa.isAnswered ? 'bg-green-500/10 text-green-600' : 'bg-orange-500/10 text-orange-600'">
              {{ qa.isAnswered ? '已回答' : '待回答' }}
            </text>
          </view>
          <text class="text-sm text-foreground font-medium block mb-2">{{ qa.question }}</text>
          <view class="flex items-center gap-1.5 mb-3">
            <text v-for="tag in qa.tags" :key="tag" class="text-[10px] px-1.5 py-0 border border-border text-muted-foreground rounded">{{ tag }}</text>
          </view>
          <!-- Answer preview -->
          <view v-if="qa.isAnswered" class="bg-background rounded-lg p-3 mb-3">
            <view class="flex items-center gap-2 mb-2">
              <view class="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px]">
                <text>{{ qa.expert.name[0] }}</text>
              </view>
              <text class="text-xs font-medium text-foreground">{{ qa.expert.name }}</text>
              <text class="text-[8px] px-1 py-0 bg-accent text-white rounded">V</text>
            </view>
            <view v-if="viewingAnswerId === qa.id">
              <text class="text-xs text-ink-soft block leading-relaxed">{{ qa.answerPreview }}</text>
            </view>
            <view v-else class="relative">
              <text class="text-xs text-ink-soft block leading-relaxed line-clamp-2" style="filter:blur(2px)">{{ qa.answerPreview }}</text>
              <view class="absolute inset-0 flex items-center justify-center bg-background/60 rounded">
                <view class="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-full" @click="handleViewAnswer(qa)">
                  <text></text>
                  <text>{{ qa.viewPrice }}币围观</text>
                </view>
              </view>
            </view>
          </view>
          <!-- Footer -->
          <view v-if="qa.isAnswered" class="flex items-center justify-between">
            <view class="flex items-center gap-1 text-muted-foreground">
              <text class="text-xs"></text>
              <text class="text-xs">{{ qa.viewCount }}人围观</text>
            </view>
            <view class="text-xs text-primary" @click="goQADetail(qa.id)">
              <text>查看详情</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Bottom bar -->
    <view class="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-border" style="padding-bottom:34px">
      <view class="flex items-center justify-around px-4 h-14">
        <view class="flex flex-col items-center gap-0.5 relative" @click="goMyQuestions">
          <text class="text-lg text-muted-foreground"></text>
          <text class="text-[10px] text-muted-foreground">我的提问</text>
          <view v-if="myOrders.pendingQuestions > 0" class="absolute -top-1 right-0 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center">
            <text>{{ myOrders.pendingQuestions }}</text>
          </view>
        </view>
        <view class="flex flex-col items-center gap-0.5 relative" @click="goMyCalls">
          <text class="text-lg text-muted-foreground">📹</text>
          <text class="text-[10px] text-muted-foreground">连麦记录</text>
          <view v-if="myOrders.pendingCalls > 0" class="absolute -top-1 right-0 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center">
            <text>{{ myOrders.pendingCalls }}</text>
          </view>
        </view>
        <view class="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-primary to-[#E74C3C] text-white text-sm font-medium rounded-full" @click="openAsk">
          <text></text>
          <text>发起提问</text>
        </view>
      </view>
    </view>

    <!-- View answer pay modal -->
    <view v-if="showPayModal && selectedQA">
      <view class="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
        <view class="w-full max-w-lg bg-white rounded-t-2xl" style="padding-bottom:34px">
          <view class="p-4 border-b border-border">
            <view class="flex items-center justify-between">
              <text class="font-semibold text-base text-foreground">围观答案</text>
              <view class="p-1 rounded-full" @click="showPayModal = false">
                <text class="text-muted-foreground text-lg">›</text>
              </view>
            </view>
          </view>
          <view class="p-4">
            <view class="bg-background rounded-xl p-3 mb-4">
              <text class="text-sm text-foreground font-medium block line-clamp-2">{{ selectedQA.question }}</text>
              <view class="flex items-center gap-2 mt-2">
                <view class="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px]">
                  <text>{{ selectedQA.expert.name[0] }}</text>
                </view>
                <text class="text-xs text-muted-foreground">{{ selectedQA.expert.name }} 已回答</text>
              </view>
            </view>
            <view class="flex items-center justify-between mb-4">
              <text class="text-sm text-muted-foreground">围观价格</text>
              <view class="flex items-baseline gap-1">
                <text class="text-2xl font-bold text-primary">{{ selectedQA.viewPrice }}</text>
                <text class="text-sm text-muted-foreground">国学币</text>
              </view>
            </view>
            <view class="flex items-center gap-1 text-xs text-muted-foreground mb-4">
              <text class="text-sm"></text>
              <text>已有 {{ selectedQA.viewCount }} 人围观</text>
            </view>
            <view class="w-full py-3 bg-primary text-white text-sm font-medium rounded-xl text-center" @click="confirmPayView(selectedQA.id)">
              <text>确认支付 {{ selectedQA.viewPrice }} 币</text>
            </view>
            <text class="text-center text-[10px] text-muted-foreground block mt-3">支付后可查看完整回答内容</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const mainExpert = {
  id: 1, name: '周易大师', avatar: '', title: '圈主 · 资深命理师',
  intro: '从业20年，精通八字、紫微、风水，已为超过10000+用户提供专业命理咨询服务',
  rating: 4.9, consultCount: 3680, responseRate: 98, askPrice: 50, callPrice: 10,
}

const experts = [
  { id: 2, name: '张玄风', avatar: '', specialty: '紫微斗数', rating: 4.8, callPrice: 8, askPrice: 30, isOnline: true },
  { id: 3, name: '陈风水', avatar: '', specialty: '风水堪舆', rating: 4.7, callPrice: 6, askPrice: 20, isOnline: true },
  { id: 4, name: '李易安', avatar: '', specialty: '姓名学', rating: 4.9, callPrice: 10, askPrice: 50, isOnline: false },
  { id: 5, name: '王命理', avatar: '', specialty: '八字精批', rating: 4.6, callPrice: 5, askPrice: 15, isOnline: true },
  { id: 6, name: '赵国学', avatar: '', specialty: '六爻预测', rating: 4.8, callPrice: 8, askPrice: 35, isOnline: false },
]

const featuredQAs = [
  { id: 1, asker: { name: '匿名用户', avatar: '' }, question: '看看我今年的运势如何？事业和感情方面有什么需要注意的吗', expert: { id: 1, name: '周易大师', avatar: '' }, answerPreview: '从你的八字来看，今年是你的偏财年，事业上会有不少机遇，但要注意把握时机。上半年工作压力较大，但到了下半年会有明显转机...', isAnswered: true, viewCount: 1280, viewPrice: 1, createdAt: '2小时前', tags: ['八字', '年运'] },
  { id: 2, asker: { name: '匿名用户', avatar: '' }, question: '我和对象的八字合不合？明年适合结婚吗', expert: { id: 2, name: '张玄风', avatar: '' }, answerPreview: '根据你们双方的八字分析，整体来说相合度较高。从日干五行来看，你们属于相生关系，这是非常好的组合...', isAnswered: true, viewCount: 856, viewPrice: 2, createdAt: '5小时前', tags: ['合婚', '姻缘'] },
  { id: 3, asker: { name: '匿名用户', avatar: '' }, question: '想请老师帮忙看看我家的风水布局，最近总感觉诸事不顺', expert: { id: 3, name: '陈风水', avatar: '' }, answerPreview: '', isAnswered: false, viewCount: 0, viewPrice: 2, createdAt: '30分钟前', tags: ['风水', '布局'] },
  { id: 4, asker: { name: '匿名用户', avatar: '' }, question: '帮我分析一下这个名字对孩子的运势影响', expert: { id: 4, name: '李易安', avatar: '' }, answerPreview: '这个名字从五格数理来看，天格、人格、地格都比较理想。特别是人格数为15，属于福寿双全的吉数...', isAnswered: true, viewCount: 520, viewPrice: 1, createdAt: '1天前', tags: ['姓名', '起名'] },
]

const myOrders = { pendingQuestions: 2, pendingCalls: 1 }

const qaTabs = [
  { key: 'all', label: '全部' },
  { key: 'answered', label: '已回答' },
  { key: 'pending', label: '待回答' },
]

const activeTab = ref<'all' | 'answered' | 'pending'>('all')
const viewingAnswerId = ref<number | null>(null)
const showPayModal = ref(false)
const selectedQA = ref<any>(null)

const filteredQAs = computed(() => {
  if (activeTab.value === 'all') return featuredQAs
  return featuredQAs.filter(qa => activeTab.value === 'answered' ? qa.isAnswered : !qa.isAnswered)
})

function handleViewAnswer(qa: any) {
  if (qa.isAnswered) {
    selectedQA.value = qa
    showPayModal.value = true
  }
}

function confirmPayView(id: number) {
  viewingAnswerId.value = id
  showPayModal.value = false
  uni.showToast({ title: '支付成功，已解锁答案', icon: 'success' })
}

function goBack() { uni.navigateBack() }
function goAsk(id: number) { uni.navigateTo({ url: `/pages/circle/id-detail/consult/ask/index?expertId=${id}` }) }
function goCall(id: number) { uni.showToast({ title: '连麦功能开发中', icon: 'none' }) }
function goAllExperts() { uni.navigateTo({ url: '/pages/circle/id-detail/consult/experts/index' }) }
function goExpert(id: number) { uni.navigateTo({ url: `/pages/user/profile/index?id=${id}` }) }
function goQADetail(id: number) { uni.navigateTo({ url: `/pages/circle/id-detail/qa/detail/index?id=${id}` }) }
function goMyOrders() { uni.navigateTo({ url: '/pages/orders/index' }) }
function goMyQuestions() { uni.navigateTo({ url: '/pages/circle/id-detail/consult/my-questions/index' }) }
function goMyCalls() { uni.navigateTo({ url: '/pages/circle/id-detail/consult/calls/index' }) }
function openAsk() { uni.navigateTo({ url: '/pages/circle/id-detail/consult/ask/index' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
