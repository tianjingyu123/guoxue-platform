<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- ==================== 顶部导航 ==================== -->
    <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between px-4 h-12">
        <view @click="goBack" class="p-1"><text class="text-xl text-foreground">←</text></view>
        <text class="font-semibold text-base text-foreground">付费咨询</text>
        <view @click="goOrders" class="relative p-2 -mr-2">
          <text class="text-lg text-muted-foreground">❓</text>
          <view
            v-if="pendingTotal > 0"
            class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center"
          >
            {{ pendingTotal }}
          </view>
        </view>
      </view>
    </view>

    <!-- ==================== 圈主Banner咨询区 ==================== -->
    <view class="p-4">
      <view class="overflow-hidden rounded-xl"
        :style="{ background: 'linear-gradient(135deg, rgba(201,169,110,0.2), rgba(196,30,58,0.1), rgba(201,169,110,0.05))' }"
        style="border: 1px solid rgba(201,169,110,0.3);"
      >
        <view class="p-4">
          <!-- 圈主头像+信息 -->
          <view class="flex items-start gap-4">
            <view class="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center"
              :style="{ border: '2px solid rgba(201,169,110,0.5)' }"
              style="background: rgba(201,169,110,0.2);"
            >
              <text class="text-lg font-bold text-accent">{{ mainExpert.name[0] }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2">
                <text class="font-bold text-base text-foreground">{{ mainExpert.name }}</text>
                <view class="bg-accent text-white text-[10px] px-1.5 py-0 rounded">V</view>
              </view>
              <text class="text-xs text-muted-foreground mt-0.5 block">{{ mainExpert.title }}</text>
              <text class="text-xs text-muted-foreground/80 mt-1 line-clamp-2 block">{{ mainExpert.intro }}</text>
              <!-- 数据统计 -->
              <view class="flex items-center gap-4 mt-2">
                <view class="flex items-center gap-1">
                  <text class="text-yellow-500 text-sm">★</text>
                  <text class="text-xs text-foreground font-medium">{{ mainExpert.rating }}</text>
                </view>
                <text class="text-xs text-muted-foreground">{{ mainExpert.consultCount }}次咨询</text>
                <text class="text-xs text-muted-foreground">{{ mainExpert.responseRate }}%回复率</text>
              </view>
            </view>
          </view>
          <!-- 操作按钮 -->
          <view class="flex items-center gap-3 mt-4">
            <view
              @click="goAskExpert(mainExpert.id)"
              class="flex-1 flex items-center justify-center gap-2 py-2.5 bg-accent text-white text-sm font-medium rounded-xl"
            >
              <text class="text-base"></text>
              <text>提问 {{ mainExpert.askPrice }}币</text>
            </view>
            <view
              @click="goCallExpert(mainExpert.id)"
              class="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white text-sm font-medium rounded-xl"
            >
              <text class="text-base">📹</text>
              <text>连麦 {{ mainExpert.callPrice }}币/分钟</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ==================== 达人推荐区 ==================== -->
    <view class="px-4 pb-4">
      <view class="flex items-center justify-between mb-3">
        <view class="flex items-center gap-2">
          <text class="text-base text-accent"></text>
          <text class="font-semibold text-sm text-foreground">专家团 · 为你解惑</text>
        </view>
        <view @click="goAllExperts" class="flex items-center gap-1 text-xs text-muted-foreground">
          全部<text class="text-sm text-muted-foreground">›</text>
        </view>
      </view>
      <scroll-view scroll-x class="flex gap-3 pb-2" style="white-space: nowrap; overflow-x: auto;">
        <view
          v-for="expert in experts"
          :key="expert.id"
          @click="goExpertDetail(expert.id)"
          class="inline-flex flex-shrink-0"
          style="width: 128px;"
        >
          <view class="bg-white rounded-xl p-3 w-full">
            <view class="flex flex-col items-center">
              <view class="relative">
                <view class="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <text class="text-sm font-medium text-foreground">{{ expert.name[0] }}</text>
                </view>
                <view
                  v-if="expert.isOnline"
                  class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full"
                  style="border: 2px solid #fff;"
                />
                <view class="absolute -top-1 -right-1 bg-accent text-white text-[8px] px-1 rounded">V</view>
              </view>
              <text class="text-sm font-medium text-foreground mt-2">{{ expert.name }}</text>
              <view class="bg-secondary text-muted-foreground text-[10px] px-1.5 py-0 mt-1 rounded inline-block">
                {{ expert.specialty }}
              </view>
              <view class="flex items-center gap-1 mt-1">
                <text class="text-yellow-500 text-xs">★</text>
                <text class="text-[10px] text-muted-foreground">{{ expert.rating }}</text>
              </view>
              <view class="flex mt-2 w-full">
                <view class="flex-1 py-1 bg-primary/10 text-primary text-[10px] font-medium rounded text-center">
                  连麦{{ expert.callPrice }}币
                </view>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- ==================== 精选问答区 ==================== -->
    <view class="px-4">
      <view class="flex items-center justify-between mb-3">
        <text class="font-semibold text-sm text-foreground">精选问答</text>
        <view class="flex items-center gap-1 bg-secondary rounded-lg" style="padding: 2px;">
          <view
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              activeTab === tab.key
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground'
            ]"
          >
            {{ tab.label }}
          </view>
        </view>
      </view>

      <view class="space-y-3 pb-4">
        <view
          v-for="qa in filteredQAs"
          :key="qa.id"
          class="bg-white rounded-xl p-4"
          @click="qa.isAnswered && handleViewAnswer(qa)"
        >
          <!-- 提问者信息 -->
          <view class="flex items-center justify-between mb-2">
            <view class="flex items-center gap-2">
              <view class="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                <text class="text-[10px] text-muted-foreground">匿</text>
              </view>
              <text class="text-xs text-muted-foreground">{{ qa.asker.name }}</text>
              <text class="text-xs text-muted-foreground/60">{{ qa.createdAt }}</text>
            </view>
            <view
              :class="[
                'text-[10px] px-1.5 py-0 rounded',
                qa.isAnswered ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
              ]"
            >
              {{ qa.isAnswered ? '已回答' : '待回答' }}
            </view>
          </view>
          <!-- 问题内容 -->
          <text class="text-sm text-foreground font-medium mb-2 block">{{ qa.question }}</text>
          <!-- 标签 -->
          <view class="flex items-center gap-1.5 mb-3 flex-wrap">
            <view
              v-for="tag in qa.tags"
              :key="tag"
              class="text-[10px] px-1.5 py-0 border border-border text-muted-foreground rounded"
            >
              {{ tag }}
            </view>
          </view>
          <!-- 回答预览 -->
          <view v-if="qa.isAnswered" class="bg-secondary/50 rounded-lg p-3 mb-3">
            <view class="flex items-center gap-2 mb-2">
              <view class="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                <text class="text-[10px] text-accent">{{ qa.expert.name[0] }}</text>
              </view>
              <text class="text-xs font-medium text-foreground">{{ qa.expert.name }}</text>
              <view class="bg-accent text-white text-[8px] px-1 py-0 rounded">V</view>
            </view>

            <view v-if="viewingAnswerId === qa.id">
              <text class="text-xs text-muted-foreground leading-relaxed">{{ qa.answerPreview }}</text>
            </view>
            <view v-else class="relative">
              <text class="text-xs text-muted-foreground leading-relaxed line-clamp-2 blur-sm block">{{ qa.answerPreview }}</text>
              <view class="absolute inset-0 flex items-center justify-center bg-secondary/30 rounded">
                <view
                  @click.stop="handleViewAnswer(qa)"
                  class="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-full"
                >
                  <text class="text-xs"></text>
                  <text>{{ qa.viewPrice }}币围观</text>
                </view>
              </view>
            </view>
          </view>
          <!-- 底部数据 -->
          <view v-if="qa.isAnswered" class="flex items-center justify-between">
            <view class="flex items-center gap-1 text-muted-foreground">
              <text class="text-xs"></text>
              <text class="text-xs">{{ qa.viewCount }}人围观</text>
            </view>
            <text class="text-xs text-primary">查看详情</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ==================== 底部固定操作栏 ==================== -->
    <view class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-border" style="padding-bottom: env(safe-area-inset-bottom, 0px);">
      <view class="flex items-center justify-around px-4 h-14">
        <view @click="goMyQuestions" class="flex flex-col items-center gap-0.5 relative">
          <text class="text-lg text-muted-foreground"></text>
          <text class="text-[10px] text-muted-foreground">我的提问</text>
          <view
            v-if="pendingQuestions > 0"
            class="absolute -top-1 right-0 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center"
          >
            {{ pendingQuestions }}
          </view>
        </view>
        <view @click="goMyCalls" class="flex flex-col items-center gap-0.5 relative">
          <text class="text-lg text-muted-foreground">📹</text>
          <text class="text-[10px] text-muted-foreground">连麦记录</text>
          <view
            v-if="pendingCalls > 0"
            class="absolute -top-1 right-0 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center"
          >
            {{ pendingCalls }}
          </view>
        </view>
        <view @click="goAskQuestion" class="flex items-center gap-2 px-6 py-2 bg-primary text-white text-sm font-medium rounded-full">
          <text class="text-base"></text>
          <text>发起提问</text>
        </view>
      </view>
    </view>

    <!-- ==================== 围观支付弹窗 ==================== -->
    <view v-if="showPayModal && selectedQA" class="fixed inset-0 z-50 flex items-end justify-center" style="background: rgba(0,0,0,0.6);">
      <view
        class="w-full max-w-lg bg-white rounded-t-2xl overflow-hidden"
        @click.stop
        style="animation: slide-up 0.3s ease-out;"
      >
        <view class="p-4 border-b border-border">
          <view class="flex items-center justify-between">
            <text class="font-semibold text-base text-foreground">围观答案</text>
            <view @click="showPayModal = false" class="p-1 rounded-full">
              <text class="text-lg text-muted-foreground">›</text>
            </view>
          </view>
        </view>
        <view class="p-4">
          <view class="bg-secondary/50 rounded-xl p-3 mb-4">
            <text class="text-sm text-foreground font-medium line-clamp-2 block">{{ selectedQA.question }}</text>
            <view class="flex items-center gap-2 mt-2">
              <view class="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                <text class="text-[10px] text-accent">{{ selectedQA.expert.name[0] }}</text>
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

          <view
            @click="confirmPay(selectedQA.id)"
            class="w-full py-3 bg-primary text-white text-sm font-medium rounded-xl text-center"
          >
            确认支付 {{ selectedQA.viewPrice }} 币
          </view>
          <text class="text-center text-[10px] text-muted-foreground mt-3 block">支付后可查看完整回答内容</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// ==================== 数据 ====================
const mainExpert = {
  id: 1,
  name: '周易大师',
  avatar: '',
  title: '圈主 · 资深命理师',
  intro: '从业20年，精通八字、紫微、风水，已为超过10000+用户提供专业命理咨询服务',
  rating: 4.9,
  consultCount: 3680,
  responseRate: 98,
  askPrice: 50,
  callPrice: 10,
}

const experts = [
  { id: 2, name: '张玄风', avatar: '', specialty: '紫微斗数', rating: 4.8, callPrice: 8, askPrice: 30, isOnline: true },
  { id: 3, name: '陈风水', avatar: '', specialty: '风水堪舆', rating: 4.7, callPrice: 6, askPrice: 20, isOnline: true },
  { id: 4, name: '李易安', avatar: '', specialty: '姓名学', rating: 4.9, callPrice: 10, askPrice: 50, isOnline: false },
  { id: 5, name: '王命理', avatar: '', specialty: '八字精批', rating: 4.6, callPrice: 5, askPrice: 15, isOnline: true },
  { id: 6, name: '赵国学', avatar: '', specialty: '六爻预测', rating: 4.8, callPrice: 8, askPrice: 35, isOnline: false },
]

const featuredQAs = [
  {
    id: 1,
    asker: { name: '匿名用户', avatar: '' },
    question: '看看我今年的运势如何？事业和感情方面有什么需要注意的吗',
    expert: { id: 1, name: '周易大师', avatar: '' },
    answerPreview: '从你的八字来看，今年是你的偏财年，事业上会有不少机遇，但要注意把握时机。上半年工作压力较大，但到了下半年会有明显转机...',
    isAnswered: true,
    viewCount: 1280,
    viewPrice: 1,
    createdAt: '2小时前',
    tags: ['八字', '年运'],
  },
  {
    id: 2,
    asker: { name: '匿名用户', avatar: '' },
    question: '我和对象的八字合不合？明年适合结婚吗',
    expert: { id: 2, name: '张玄风', avatar: '' },
    answerPreview: '根据你们双方的八字分析，整体来说相合度较高。从日干五行来看，你们属于相生关系，这是非常好的组合...',
    isAnswered: true,
    viewCount: 856,
    viewPrice: 2,
    createdAt: '5小时前',
    tags: ['合婚', '姻缘'],
  },
  {
    id: 3,
    asker: { name: '匿名用户', avatar: '' },
    question: '想请老师帮忙看看我家的风水布局，最近总感觉诸事不顺',
    expert: { id: 3, name: '陈风水', avatar: '' },
    answerPreview: '',
    isAnswered: false,
    viewCount: 0,
    viewPrice: 2,
    createdAt: '30分钟前',
    tags: ['风水', '布局'],
  },
  {
    id: 4,
    asker: { name: '匿名用户', avatar: '' },
    question: '帮我分析一下这个名字对孩子的运势影响',
    expert: { id: 4, name: '李易安', avatar: '' },
    answerPreview: '这个名字从五格数理来看，天格、人格、地格都比较理想。特别是人格数为15，属于福寿双全的吉数...',
    isAnswered: true,
    viewCount: 520,
    viewPrice: 1,
    createdAt: '1天前',
    tags: ['姓名', '起名'],
  },
]

const myOrders = {
  pendingQuestions: 2,
  pendingCalls: 1,
}

// ==================== 状态 ====================
const activeTab = ref<'all' | 'answered' | 'pending'>('all')
const viewingAnswerId = ref<number | null>(null)
const showPayModal = ref(false)
const selectedQA = ref<(typeof featuredQAs)[0] | null>(null)

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'answered', label: '已回答' },
  { key: 'pending', label: '待回答' },
]

const pendingTotal = computed(() => myOrders.pendingQuestions + myOrders.pendingCalls)

const filteredQAs = computed(() => {
  if (activeTab.value === 'all') return featuredQAs
  if (activeTab.value === 'answered') return featuredQAs.filter(qa => qa.isAnswered)
  if (activeTab.value === 'pending') return featuredQAs.filter(qa => !qa.isAnswered)
  return featuredQAs
})

// ==================== 交互 ====================
function goBack() { uni.navigateBack() }
function goOrders() { uni.navigateTo({ url: '/pages/circles/id-detail/consult/orders/index' }) }
function goAskExpert(id: number) { uni.navigateTo({ url: `/pages/circles/id-detail/consult/ask/index?expert=${id}` }) }
function goCallExpert(id: number) { uni.navigateTo({ url: `/pages/circles/id-detail/consult/call/index?expert=${id}` }) }
function goAllExperts() { uni.navigateTo({ url: '/pages/circles/id-detail/consult/experts/index' }) }
function goExpertDetail(id: number) { uni.navigateTo({ url: `/pages/circles/id-detail/consult/expert/${id}/index` }) }
function goQaDetail(id: number) { uni.navigateTo({ url: `/pages/circles/id-detail/consult/qa/${id}/index` }) }
function goMyQuestions() { uni.navigateTo({ url: '/pages/circles/id-detail/consult/my-questions/index' }) }
function goMyCalls() { uni.navigateTo({ url: '/pages/circles/id-detail/consult/my-calls/index' }) }
function goAskQuestion() { uni.navigateTo({ url: '/pages/circles/id-detail/consult/ask/index' }) }

function handleViewAnswer(qa: (typeof featuredQAs)[0]) {
  if (qa.isAnswered) {
    selectedQA.value = qa
    showPayModal.value = true
  }
}

function confirmPay(id: number) {
  viewingAnswerId.value = id
  showPayModal.value = false
}
</script>

<style scoped>
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
