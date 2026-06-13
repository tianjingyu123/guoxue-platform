<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-header">
      <view class="nav-left" @click="goBack">
        <text class="nav-back-icon">←</text>
        <text class="nav-title">付费问答</text>
      </view>
      <view class="nav-ask-btn" @click="showAskModal = true">
        <text>我要提问</text>
      </view>
    </view>

    <!-- Tab筛选 -->
    <view class="tab-bar">
      <view v-for="tab in tabs" :key="tab.id"
        class="tab-item" :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <text>{{ tab.label }} ({{ tab.count }})</text>
        <view v-if="activeTab === tab.id" class="tab-indicator" />
      </view>
    </view>

    <scroll-view scroll-y class="content" :style="{ height: 'calc(100vh - 56px - 56px)' }">
      <view v-if="filteredQA.length > 0" class="qa-list">
        <view v-for="qa in filteredQA" :key="qa.id" class="qa-card" @click="goPage('/pages/circle/id-detail/qa/detail/index')">
          <!-- 提问者信息 -->
          <view class="qa-header">
            <view class="qa-asker-row">
              <text class="qa-asker-avatar">匿</text>
              <text class="qa-asker-name">匿名用户</text>
              <text class="qa-time">{{ qa.askTime }}</text>
            </view>
            <text class="qa-status" :class="qa.status === 'answered' ? 'st-answered' : 'st-pending'">
              {{ qa.status === 'answered' ? '已回答' : '待回答' }}
            </text>
          </view>

          <!-- 问题 -->
          <view class="qa-question-row">
            <text class="qa-q-icon">❓</text>
            <text class="qa-question">{{ qa.question }}</text>
          </view>

          <!-- 回答 -->
          <view v-if="qa.status === 'answered' && qa.answer" class="qa-answer-area">
            <view class="qa-answerer-row">
              <text class="qa-ans-avatar">{{ qa.answerer.name[0] }}</text>
              <text class="qa-ans-name">{{ qa.answerer.name }}</text>
              <text class="qa-ans-role">{{ qa.answerer.role }}</text>
            </view>
            <text class="qa-answer-text">{{ qa.answer }}</text>
          </view>

          <!-- 底部 -->
          <view class="qa-footer">
            <text class="qa-views">👁️ {{ qa.viewCount }}人围观</text>
            <text v-if="qa.status === 'answered'" class="qa-price">🪙 {{ qa.viewPrice }}币围观</text>
            <text class="qa-arrow">›</text>
          </view>
        </view>
      </view>

      <view v-else class="empty-state">
        <text class="empty-icon">💬</text>
        <text class="empty-text">还没有人提问</text>
        <text class="empty-sub">成为第一个提问者吧</text>
        <view class="empty-cta" @click="showAskModal = true">
          <text>我要提问</text>
        </view>
      </view>

      <view style="height: 32rpx;" />
    </scroll-view>

    <!-- 提问弹窗 -->
    <view v-if="showAskModal" class="modal-mask" @click="showAskModal = false" />
    <view v-if="showAskModal" class="ask-sheet">
      <view class="ask-header">
        <text class="ask-cancel" @click="showAskModal = false">取消</text>
        <text class="ask-sheet-title">发起提问</text>
        <view style="width: 80rpx;" />
      </view>

      <scroll-view scroll-y class="ask-body">
        <!-- 选择提问对象 -->
        <view class="ask-section">
          <text class="ask-label">选择提问对象 <text class="required">*</text></text>
          <view v-for="person in answerers" :key="person.id" class="answerer-card"
            :class="{ selected: selectedAnswerer?.id === person.id }"
            @click="selectedAnswerer = person"
          >
            <text class="ans-card-avatar">{{ person.name[0] }}</text>
            <view class="ans-card-info">
              <view class="ans-card-name-row">
                <text class="ans-card-name">{{ person.name }}</text>
                <text class="ans-card-role-tag">{{ person.role }}</text>
              </view>
              <text class="ans-card-meta">回复率 {{ person.responseRate }}% · 平均 {{ person.avgTime }}</text>
            </view>
            <view class="ans-card-price">
              <text class="ans-price-num">{{ person.price }}币</text>
              <text class="ans-price-label">提问价格</text>
            </view>
            <text v-if="selectedAnswerer?.id === person.id" class="ans-card-check">✓</text>
          </view>
        </view>

        <!-- 问题标题 -->
        <view class="ask-section">
          <text class="ask-label">问题标题 <text class="required">*</text></text>
          <input class="ask-input" v-model="questionTitle" placeholder="请简要描述你的问题" maxlength="50" />
          <text class="ask-count">{{ questionTitle.length }}/50</text>
        </view>

        <!-- 详细描述 -->
        <view class="ask-section">
          <text class="ask-label">详细描述 <text class="optional">(选填)</text></text>
          <textarea class="ask-textarea" v-model="questionDetail" placeholder="请详细描述你的问题，提供更多背景信息有助于获得更精准的回答" maxlength="500" :rows="4" />
          <text class="ask-count">{{ questionDetail.length }}/500</text>
        </view>

        <!-- 匿名开关 -->
        <view class="ask-section">
          <view class="anon-row">
            <view>
              <text class="anon-title">匿名提问</text>
              <text class="anon-desc">其他用户将无法看到你的身份</text>
            </view>
            <view class="anon-switch" :class="{ on: isAnonymous }" @click="isAnonymous = !isAnonymous">
              <view class="anon-switch-dot" />
            </view>
          </view>
        </view>

        <!-- 费用说明 -->
        <view v-if="selectedAnswerer" class="fee-card">
          <view class="fee-row">
            <text class="fee-label">提问费用</text>
            <text class="fee-amount">{{ selectedAnswerer.price }} 国学币</text>
          </view>
          <text class="fee-hint">提问后若7天内未获回答，费用将自动退还</text>
        </view>
      </scroll-view>

      <!-- 底部提交 -->
      <view class="ask-bottom">
        <view class="ask-submit-btn" :class="{ disabled: !selectedAnswerer || !questionTitle.trim() || isSubmitting }"
          @click="handleSubmitQuestion"
        >
          <text v-if="isSubmitting">⏳ 提交中...</text>
          <text v-else>确认支付并提问 <text v-if="selectedAnswerer">({{ selectedAnswerer.price }}币)</text></text>
        </view>
      </view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="showSuccessModal" class="modal-mask" @click="showSuccessModal = false" />
    <view v-if="showSuccessModal" class="success-modal">
      <text class="succ-icon">✅</text>
      <text class="succ-title">提问成功</text>
      <text class="succ-desc">你的问题已提交，请耐心等待回答。回答后会通过消息通知你。</text>
      <view class="succ-btn" @click="showSuccessModal = false"><text>知道了</text></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const activeTab = ref('all')
const showAskModal = ref(false)
const showSuccessModal = ref(false)
const selectedAnswerer = ref<any>(null)
const questionTitle = ref('')
const questionDetail = ref('')
const isAnonymous = ref(true)
const isSubmitting = ref(false)

const tabs = [
  { id: 'all', label: '全部', count: 4 },
  { id: 'answered', label: '已回答', count: 3 },
  { id: 'pending', label: '待回答', count: 1 },
]

const qaList = [
  {
    id: 1, question: '八字中日主偏弱，是否一定要补强？有没有弱而不补反而更好的情况？',
    askTime: '2小时前', answerer: { name: '周易大师', role: '圈主' },
    answer: '这是一个很好的问题。八字论命，并非简单的强弱补泄。有些格局如「从格」，日主极弱反而要顺其势，补强反为不美...',
    answerTime: '1小时前', status: 'answered', viewCount: 128, viewPrice: 1, questionPrice: 10,
  },
  {
    id: 2, question: '请问紫微斗数中的「四化」如何理解？特别是化忌在不同宫位的含义有什么区别？',
    askTime: '5小时前', answerer: { name: '张玄风', role: '嘉宾' },
    answer: '四化是紫微斗数的精髓，化禄主福、化权主权、化科主名、化忌主烦...',
    answerTime: '3小时前', status: 'answered', viewCount: 256, viewPrice: 2, questionPrice: 20,
  },
  {
    id: 3, question: '风水布局中，客厅沙发背后是窗户怎么化解？',
    askTime: '1天前', answerer: { name: '周易大师', role: '圈主' },
    answer: null, status: 'pending', viewCount: 0, viewPrice: 1, questionPrice: 10,
  },
  {
    id: 4, question: '八字中的「桃花」和「红鸾」有什么区别？对感情的影响一样吗？',
    askTime: '2天前', answerer: { name: '周易大师', role: '圈主' },
    answer: '桃花与红鸾虽都主感情桃花，但性质不同。桃花多指异性缘、人缘，有正桃花和烂桃花之分...',
    status: 'answered', viewCount: 512, viewPrice: 1, questionPrice: 10,
  },
]

const answerers = [
  { id: 1, name: '周易大师', role: '圈主', price: 10, responseRate: 98, avgTime: '2小时内' },
  { id: 2, name: '张玄风', role: '嘉宾', price: 20, responseRate: 95, avgTime: '4小时内' },
  { id: 3, name: '李易安', role: '嘉宾', price: 15, responseRate: 90, avgTime: '6小时内' },
]

const filteredQA = computed(() => {
  if (activeTab.value === 'all') return qaList
  return qaList.filter(q => q.status === activeTab.value)
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
function goPage(url: string) { uni.navigateTo({ url }) }

onPullDownRefresh(() => { setTimeout(() => uni.stopPullDownRefresh(), 500) })
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; }
.nav-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24rpx; height: 56px; background: rgba(250,248,245,0.95);
  backdrop-filter: blur(10px); border-bottom: 1px solid #E8E0D5;
  position: sticky; top: 0; z-index: 40;
}
.nav-left { display: flex; align-items: center; gap: 12rpx; }
.nav-back-icon { font-size: 36rpx; color: #2C2C2C; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.nav-ask-btn { background: #C41E3A; color: #FFFFFF; padding: 12rpx 28rpx; border-radius: 40rpx; font-size: 24rpx; }

.tab-bar { display: flex; gap: 32rpx; padding: 0 24rpx; height: 56px; border-bottom: 1px solid #E8E0D5; background: #FAF8F5; position: sticky; top: 56px; z-index: 30; }
.tab-item { position: relative; padding: 16rpx 0; font-size: 26rpx; color: #999; }
.tab-item.active { color: #C41E3A; font-weight: 500; }
.tab-indicator { position: absolute; bottom: 0; left: 0; right: 0; height: 4rpx; background: #C41E3A; border-radius: 2rpx; }

.content { background: #FAF8F5; }
.qa-list { padding: 24rpx; }

.qa-card { background: #FFFFFF; border-radius: 20rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.qa-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.qa-asker-row { display: flex; align-items: center; gap: 10rpx; }
.qa-asker-avatar { width: 44rpx; height: 44rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #999; }
.qa-asker-name { font-size: 22rpx; color: #999; }
.qa-time { font-size: 20rpx; color: #ccc; }
.qa-status { font-size: 18rpx; padding: 4rpx 12rpx; border-radius: 8rpx; }
.st-answered { background: rgba(34,197,94,0.1); color: #22c55e; }
.st-pending { background: rgba(249,115,22,0.1); color: #f97316; }

.qa-question-row { display: flex; gap: 10rpx; margin-bottom: 16rpx; }
.qa-q-icon { font-size: 28rpx; flex-shrink: 0; margin-top: 2rpx; }
.qa-question { font-size: 28rpx; color: #2C2C2C; line-height: 1.5; }

.qa-answer-area { padding-left: 38rpx; margin-bottom: 16rpx; }
.qa-answerer-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 10rpx; }
.qa-ans-avatar { width: 40rpx; height: 40rpx; border-radius: 50%; background: rgba(201,169,110,0.2); color: #C9A96E; display: flex; align-items: center; justify-content: center; font-size: 18rpx; }
.qa-ans-name { font-size: 24rpx; color: #2C2C2C; font-weight: 500; }
.qa-ans-role { font-size: 18rpx; background: rgba(201,169,110,0.1); color: #C9A96E; padding: 2rpx 8rpx; border-radius: 4rpx; }
.qa-answer-text { font-size: 24rpx; color: #666; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.qa-footer { display: flex; align-items: center; gap: 16rpx; padding-top: 14rpx; border-top: 1px solid #F5F1EB; }
.qa-views { font-size: 22rpx; color: #999; }
.qa-price { font-size: 22rpx; color: #C9A96E; }
.qa-arrow { font-size: 28rpx; color: #ccc; margin-left: auto; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.empty-icon { font-size: 88rpx; opacity: 0.3; margin-bottom: 16rpx; }
.empty-text { font-size: 26rpx; color: #999; }
.empty-sub { font-size: 22rpx; color: #ccc; margin-top: 8rpx; }
.empty-cta { margin-top: 32rpx; background: #C41E3A; color: #fff; padding: 20rpx 48rpx; border-radius: 40rpx; font-size: 28rpx; }

.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; }

.ask-sheet { position: fixed; bottom: 0; left: 0; right: 0; height: 90vh; background: #FFFFFF; border-radius: 32rpx 32rpx 0 0; z-index: 101; display: flex; flex-direction: column; }
.ask-header { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; border-bottom: 1px solid #E8E0D5; }
.ask-cancel { font-size: 26rpx; color: #999; }
.ask-sheet-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.ask-body { flex: 1; overflow-y: auto; padding: 24rpx; }
.ask-section { margin-bottom: 28rpx; }
.ask-label { font-size: 26rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 16rpx; display: block; }
.required { color: #C41E3A; }
.optional { font-size: 22rpx; color: #999; }

.answerer-card { display: flex; align-items: center; gap: 16rpx; background: #FFFFFF; border: 2rpx solid #F5F1EB; border-radius: 20rpx; padding: 20rpx; margin-bottom: 12rpx; }
.answerer-card.selected { border-color: #C41E3A; background: rgba(196,30,58,0.03); }
.ans-card-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: rgba(201,169,110,0.2); color: #C9A96E; display: flex; align-items: center; justify-content: center; font-size: 26rpx; flex-shrink: 0; }
.ans-card-info { flex: 1; min-width: 0; }
.ans-card-name-row { display: flex; align-items: center; gap: 8rpx; }
.ans-card-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.ans-card-role-tag { font-size: 18rpx; background: rgba(201,169,110,0.1); color: #C9A96E; padding: 2rpx 8rpx; border-radius: 4rpx; }
.ans-card-meta { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.ans-card-price { text-align: right; }
.ans-price-num { font-size: 28rpx; color: #C41E3A; font-weight: 600; display: block; }
.ans-price-label { font-size: 18rpx; color: #999; }
.ans-card-check { width: 40rpx; height: 40rpx; border-radius: 50%; background: #C41E3A; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }

.ask-input { width: 100%; height: 80rpx; background: #F5F1EB; border-radius: 16rpx; padding: 0 24rpx; font-size: 26rpx; color: #2C2C2C; box-sizing: border-box; }
.ask-textarea { width: 100%; background: #F5F1EB; border-radius: 16rpx; padding: 20rpx 24rpx; font-size: 26rpx; color: #2C2C2C; box-sizing: border-box; resize: none; }
.ask-count { font-size: 20rpx; color: #999; text-align: right; margin-top: 8rpx; display: block; }

.anon-row { display: flex; justify-content: space-between; align-items: center; background: #FAF8F5; border-radius: 16rpx; padding: 24rpx; }
.anon-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.anon-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.anon-switch { width: 88rpx; height: 48rpx; border-radius: 24rpx; background: #E8E0D5; position: relative; transition: background 0.2s; }
.anon-switch.on { background: #C41E3A; }
.anon-switch-dot { width: 40rpx; height: 40rpx; border-radius: 50%; background: #FFFFFF; position: absolute; top: 4rpx; left: 4rpx; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.1); transition: left 0.2s; }
.anon-switch.on .anon-switch-dot { left: 44rpx; }

.fee-card { background: rgba(201,169,110,0.08); border: 1px solid rgba(201,169,110,0.2); border-radius: 20rpx; padding: 24rpx; }
.fee-row { display: flex; justify-content: space-between; align-items: center; }
.fee-label { font-size: 26rpx; color: #999; }
.fee-amount { font-size: 36rpx; font-weight: 700; color: #C41E3A; }
.fee-hint { font-size: 20rpx; color: #999; margin-top: 8rpx; display: block; }

.ask-bottom { padding: 24rpx; border-top: 1px solid #E8E0D5; }
.ask-submit-btn { background: #C41E3A; color: #FFFFFF; text-align: center; padding: 24rpx; border-radius: 24rpx; font-size: 28rpx; font-weight: 500; }
.ask-submit-btn.disabled { background: #D9D9D9; color: #999; }

.success-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #FFFFFF; border-radius: 32rpx; padding: 48rpx; width: 560rpx; z-index: 102; text-align: center; }
.succ-icon { font-size: 72rpx; display: block; margin-bottom: 20rpx; }
.succ-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 12rpx; }
.succ-desc { font-size: 26rpx; color: #999; line-height: 1.5; margin-bottom: 32rpx; display: block; }
.succ-btn { background: #C41E3A; color: #FFFFFF; padding: 24rpx; border-radius: 24rpx; font-size: 28rpx; font-weight: 500; }
</style>
