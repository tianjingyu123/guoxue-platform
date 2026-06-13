<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-header">
      <view class="nav-left" @click="goBack">
        <text class="nav-back-icon">←</text>
        <text class="nav-title">付费咨询</text>
      </view>
      <view class="nav-right" @click="goPage('/pages/circle/id-detail/consult/orders/index')">
        <text class="nav-icon">📋</text>
        <view v-if="myOrders.pendingQuestions + myOrders.pendingCalls > 0" class="nav-badge">
          <text>{{ myOrders.pendingQuestions + myOrders.pendingCalls }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="content" :style="{ height: 'calc(100vh - 56px - 100rpx)' }">
      <!-- 圈主Banner咨询区 -->
      <view class="expert-banner">
        <view class="expert-row">
          <view class="expert-avatar-lg">{{ mainExpert.name[0] }}</view>
          <view class="expert-info">
            <view class="expert-name-row">
              <text class="expert-name">{{ mainExpert.name }}</text>
              <text class="expert-verified">V</text>
            </view>
            <text class="expert-title">{{ mainExpert.title }}</text>
            <text class="expert-intro">{{ mainExpert.intro }}</text>
            <view class="expert-stats">
              <text class="exp-stat">⭐ {{ mainExpert.rating }}</text>
              <text class="exp-stat">{{ mainExpert.consultCount }}次咨询</text>
              <text class="exp-stat">{{ mainExpert.responseRate }}%回复率</text>
            </view>
          </view>
        </view>
        <view class="expert-actions">
          <view class="action-btn action-ask" @click="goPage('/pages/circle/id-detail/consult/ask/index')">
            <text>💬 提问 {{ mainExpert.askPrice }}币</text>
          </view>
          <view class="action-btn action-call" @click="goPage('/pages/circle/id-detail/consult/call/index')">
            <text>📹 连麦 {{ mainExpert.callPrice }}币/分钟</text>
          </view>
        </view>
      </view>

      <!-- 专家团 -->
      <view class="section">
        <view class="section-header">
          <view class="section-label">
            <text class="section-icon">✨</text>
            <text class="section-title">专家团 · 为你解惑</text>
          </view>
          <text class="section-more" @click="goPage('/pages/circle/id-detail/consult/experts/index')">全部 ›</text>
        </view>
        <scroll-view scroll-x class="expert-scroll">
          <view v-for="expert in experts" :key="expert.id" class="expert-card" @click="goPage('/pages/circle/id-detail/consult/expert-detail/index')">
            <view class="expert-card-avatar">
              <text class="expert-card-avatar-text">{{ expert.name[0] }}</text>
              <view v-if="expert.isOnline" class="online-dot" />
            </view>
            <text class="expert-card-name">{{ expert.name }}</text>
            <text class="expert-card-specialty">{{ expert.specialty }}</text>
            <text class="expert-card-rating">⭐ {{ expert.rating }}</text>
            <view class="expert-card-price">
              <text class="price-small">连麦{{ expert.callPrice }}币</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 精选问答 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">精选问答</text>
          <view class="tab-row">
            <view
              v-for="tab in qaTabs" :key="tab.key"
              class="tab-item" :class="{ active: activeQATab === tab.key }"
              @click="activeQATab = tab.key"
            >
              <text>{{ tab.label }}</text>
            </view>
          </view>
        </view>
        <view v-for="qa in filteredQAs" :key="qa.id" class="qa-card">
          <view class="qa-header">
            <text class="qa-asker">匿名用户</text>
            <text class="qa-time">{{ qa.createdAt }}</text>
            <view class="qa-status" :class="qa.isAnswered ? 'status-answered' : 'status-pending'">
              <text>{{ qa.isAnswered ? '已回答' : '待回答' }}</text>
            </view>
          </view>
          <text class="qa-question">{{ qa.question }}</text>
          <view class="qa-tags">
            <text v-for="tag in qa.tags" :key="tag" class="qa-tag">{{ tag }}</text>
          </view>
          <!-- 已回答：展示回答区 -->
          <view v-if="qa.isAnswered" class="qa-answer-area">
            <view class="answerer-row">
              <text class="answerer-avatar">{{ qa.expert.name[0] }}</text>
              <text class="answerer-name">{{ qa.expert.name }}</text>
              <text class="answerer-v">V</text>
            </view>
            <view v-if="viewingAnswerId === qa.id" class="answer-full">
              <text class="answer-text">{{ qa.answerPreview }}</text>
            </view>
            <view v-else class="answer-blurred">
              <text class="answer-blur-text">{{ qa.answerPreview }}</text>
              <view class="answer-pay-overlay" @click="handleViewAnswer(qa)">
                <text class="pay-btn">🔒 {{ qa.viewPrice }}币围观</text>
              </view>
            </view>
          </view>
          <view v-if="qa.isAnswered" class="qa-footer">
            <text class="qa-views">👁️ {{ qa.viewCount }}人围观</text>
            <text class="qa-detail-link">查看详情 ›</text>
          </view>
        </view>
      </view>

      <view style="height: 160rpx;" />
    </scroll-view>

    <!-- 底部固定操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-item" @click="goPage('/pages/circle/id-detail/consult/my-questions/index')">
        <text class="bottom-icon">💬</text>
        <text class="bottom-label">我的提问</text>
        <view v-if="myOrders.pendingQuestions > 0" class="bottom-badge">{{ myOrders.pendingQuestions }}</view>
      </view>
      <view class="bottom-item" @click="goPage('/pages/circle/id-detail/consult/my-calls/index')">
        <text class="bottom-icon">📹</text>
        <text class="bottom-label">连麦记录</text>
        <view v-if="myOrders.pendingCalls > 0" class="bottom-badge">{{ myOrders.pendingCalls }}</view>
      </view>
      <view class="bottom-cta" @click="goPage('/pages/circle/id-detail/consult/ask/index')">
        <text>💬 发起提问</text>
      </view>
    </view>

    <!-- 围观支付弹窗 -->
    <view v-if="showPayModal && selectedQA" class="modal-mask" @click="showPayModal = false" />
    <view v-if="showPayModal && selectedQA" class="modal-sheet">
      <view class="modal-handle" />
      <view class="modal-header">
        <text class="modal-title">围观答案</text>
        <text class="modal-close" @click="showPayModal = false">✕</text>
      </view>
      <view class="modal-body">
        <view class="pay-qa-preview">
          <text class="pay-qa-question">{{ selectedQA.question }}</text>
          <text class="pay-qa-answerer">{{ selectedQA.expert.name }} 已回答</text>
        </view>
        <view class="pay-price-row">
          <text class="pay-price-label">围观价格</text>
          <view class="pay-price-value">
            <text class="pay-amount">{{ selectedQA.viewPrice }}</text>
            <text class="pay-unit">国学币</text>
          </view>
        </view>
        <text class="pay-viewer-count">👥 已有 {{ selectedQA.viewCount }} 人围观</text>
        <view class="pay-confirm-btn" @click="confirmPayView">
          <text>确认支付 {{ selectedQA.viewPrice }} 币</text>
        </view>
        <text class="pay-hint">支付后可查看完整回答内容</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const activeQATab = ref('all')
const viewingAnswerId = ref<number | null>(null)
const showPayModal = ref(false)
const selectedQA = ref<any>(null)

const qaTabs = [
  { key: 'all', label: '全部' },
  { key: 'answered', label: '已回答' },
  { key: 'pending', label: '待回答' },
]

const mainExpert = {
  name: '周易大师', title: '圈主 · 资深命理师',
  intro: '从业20年，精通八字、紫微、风水，已为超过10000+用户提供专业命理咨询服务',
  rating: 4.9, consultCount: 3680, responseRate: 98, askPrice: 50, callPrice: 10,
}

const experts = [
  { id: 2, name: '张玄风', specialty: '紫微斗数', rating: 4.8, callPrice: 8, askPrice: 30, isOnline: true },
  { id: 3, name: '陈风水', specialty: '风水堪舆', rating: 4.7, callPrice: 6, askPrice: 20, isOnline: true },
  { id: 4, name: '李易安', specialty: '姓名学', rating: 4.9, callPrice: 10, askPrice: 50, isOnline: false },
  { id: 5, name: '王命理', specialty: '八字精批', rating: 4.6, callPrice: 5, askPrice: 15, isOnline: true },
  { id: 6, name: '赵国学', specialty: '六爻预测', rating: 4.8, callPrice: 8, askPrice: 35, isOnline: false },
]

const featuredQAs = [
  {
    id: 1, question: '看看我今年的运势如何？事业和感情方面有什么需要注意的吗',
    expert: { name: '周易大师' },
    answerPreview: '从你的八字来看，今年是你的偏财年，事业上会有不少机遇，但要注意把握时机...',
    isAnswered: true, viewCount: 1280, viewPrice: 1, createdAt: '2小时前', tags: ['八字', '年运'],
  },
  {
    id: 2, question: '我和对象的八字合不合？明年适合结婚吗',
    expert: { name: '张玄风' },
    answerPreview: '根据你们双方的八字分析，整体来说相合度较高。从日干五行来看，你们属于相生关系...',
    isAnswered: true, viewCount: 856, viewPrice: 2, createdAt: '5小时前', tags: ['合婚', '姻缘'],
  },
  {
    id: 3, question: '想请老师帮忙看看我家的风水布局，最近总感觉诸事不顺',
    expert: { name: '陈风水' },
    answerPreview: '', isAnswered: false, viewCount: 0, viewPrice: 2, createdAt: '30分钟前', tags: ['风水', '布局'],
  },
  {
    id: 4, question: '帮我分析一下这个名字对孩子的运势影响',
    expert: { name: '李易安' },
    answerPreview: '这个名字从五格数理来看，天格、人格、地格都比较理想...',
    isAnswered: true, viewCount: 520, viewPrice: 1, createdAt: '1天前', tags: ['姓名', '起名'],
  },
]

const myOrders = { pendingQuestions: 2, pendingCalls: 1 }

const filteredQAs = computed(() => {
  if (activeQATab.value === 'all') return featuredQAs
  if (activeQATab.value === 'answered') return featuredQAs.filter(q => q.isAnswered)
  return featuredQAs.filter(q => !q.isAnswered)
})

function handleViewAnswer(qa: any) {
  selectedQA.value = qa
  showPayModal.value = true
}

function confirmPayView() {
  if (selectedQA.value) {
    viewingAnswerId.value = selectedQA.value.id
    showPayModal.value = false
  }
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
.nav-right { position: relative; padding: 12rpx; }
.nav-icon { font-size: 36rpx; }
.nav-badge { position: absolute; top: 2rpx; right: 2rpx; width: 32rpx; height: 32rpx; background: #C41E3A; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18rpx; color: #FFFFFF; }
.content { background: #FAF8F5; }

.expert-banner {
  margin: 24rpx; padding: 28rpx; border-radius: 20rpx;
  background: linear-gradient(135deg, rgba(201,169,110,0.2), rgba(196,30,58,0.1), rgba(201,169,110,0.05));
  border: 1px solid rgba(201,169,110,0.3);
}
.expert-row { display: flex; gap: 20rpx; }
.expert-avatar-lg { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(201,169,110,0.2); color: #C9A96E; display: flex; align-items: center; justify-content: center; font-size: 40rpx; font-weight: 700; flex-shrink: 0; }
.expert-info { flex: 1; min-width: 0; }
.expert-name-row { display: flex; align-items: center; gap: 8rpx; }
.expert-name { font-size: 30rpx; font-weight: 700; color: #2C2C2C; }
.expert-verified { font-size: 18rpx; background: #C9A96E; color: #fff; padding: 2rpx 8rpx; border-radius: 6rpx; }
.expert-title { font-size: 22rpx; color: #999; margin-top: 2rpx; display: block; }
.expert-intro { font-size: 22rpx; color: #999; margin-top: 4rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.expert-stats { display: flex; gap: 24rpx; margin-top: 10rpx; }
.exp-stat { font-size: 22rpx; color: #666; }
.expert-actions { display: flex; gap: 16rpx; margin-top: 20rpx; }
.action-btn { flex: 1; padding: 20rpx; border-radius: 24rpx; text-align: center; font-size: 26rpx; font-weight: 500; }
.action-ask { background: #C9A96E; color: #FFFFFF; }
.action-call { background: #C41E3A; color: #FFFFFF; }

.section { padding: 0 24rpx 24rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-label { display: flex; align-items: center; gap: 8rpx; }
.section-icon { font-size: 28rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.section-more { font-size: 24rpx; color: #999; }

.expert-scroll { white-space: nowrap; padding-bottom: 8rpx; }
.expert-card {
  display: inline-flex; flex-direction: column; align-items: center;
  width: 200rpx; background: #FFFFFF; border-radius: 16rpx; padding: 24rpx 16rpx;
  margin-right: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}
.expert-card-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 30rpx; color: #2C2C2C; position: relative; }
.online-dot { position: absolute; bottom: 0; right: 0; width: 16rpx; height: 16rpx; background: #22c55e; border-radius: 50%; border: 2rpx solid #FFFFFF; }
.expert-card-name { font-size: 26rpx; color: #2C2C2C; font-weight: 500; margin-top: 12rpx; }
.expert-card-specialty { font-size: 20rpx; color: #999; background: #F5F1EB; padding: 4rpx 12rpx; border-radius: 8rpx; margin-top: 6rpx; }
.expert-card-rating { font-size: 20rpx; color: #999; margin-top: 4rpx; }
.expert-card-price { margin-top: 10rpx; }
.price-small { font-size: 20rpx; color: #C41E3A; background: rgba(196,30,58,0.08); padding: 6rpx 12rpx; border-radius: 8rpx; }

.tab-row { display: flex; background: #F5F1EB; border-radius: 16rpx; padding: 4rpx; }
.tab-item { padding: 10rpx 24rpx; border-radius: 14rpx; font-size: 24rpx; color: #999; }
.tab-item.active { background: #FFFFFF; color: #2C2C2C; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }

.qa-card { background: #FFFFFF; border-radius: 20rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.qa-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.qa-asker { font-size: 22rpx; color: #999; }
.qa-time { font-size: 20rpx; color: #ccc; }
.qa-status { font-size: 18rpx; padding: 4rpx 12rpx; border-radius: 8rpx; margin-left: auto; }
.status-answered { background: rgba(34,197,94,0.1); color: #22c55e; }
.status-pending { background: rgba(249,115,22,0.1); color: #f97316; }
.qa-question { font-size: 28rpx; color: #2C2C2C; font-weight: 500; line-height: 1.5; display: block; margin-bottom: 12rpx; }
.qa-tags { display: flex; gap: 8rpx; margin-bottom: 16rpx; }
.qa-tag { font-size: 18rpx; color: #999; border: 1px solid #E8E0D5; padding: 4rpx 12rpx; border-radius: 8rpx; }

.qa-answer-area { background: #FAF8F5; border-radius: 16rpx; padding: 20rpx; margin-bottom: 12rpx; }
.answerer-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 12rpx; }
.answerer-avatar { width: 40rpx; height: 40rpx; border-radius: 50%; background: rgba(201,169,110,0.2); color: #C9A96E; display: flex; align-items: center; justify-content: center; font-size: 18rpx; }
.answerer-name { font-size: 24rpx; color: #2C2C2C; font-weight: 500; }
.answerer-v { font-size: 16rpx; background: #C9A96E; color: #fff; padding: 2rpx 6rpx; border-radius: 4rpx; }
.answer-full { }
.answer-text { font-size: 24rpx; color: #666; line-height: 1.6; }
.answer-blurred { position: relative; }
.answer-blur-text { font-size: 24rpx; color: #666; filter: blur(3px); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.answer-pay-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(250,248,245,0.5); border-radius: 12rpx; }
.pay-btn { background: #C41E3A; color: #FFFFFF; padding: 12rpx 32rpx; border-radius: 40rpx; font-size: 24rpx; }

.qa-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12rpx; border-top: 1px solid #E8E0D5; }
.qa-views { font-size: 22rpx; color: #999; }
.qa-detail-link { font-size: 22rpx; color: #C41E3A; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-top: 1px solid #E8E0D5; display: flex; align-items: center; padding: 12rpx 24rpx; gap: 24rpx; z-index: 50; }
.bottom-item { display: flex; flex-direction: column; align-items: center; position: relative; }
.bottom-icon { font-size: 36rpx; }
.bottom-label { font-size: 18rpx; color: #999; }
.bottom-badge { position: absolute; top: -4rpx; right: 8rpx; width: 30rpx; height: 30rpx; background: #C41E3A; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16rpx; color: #fff; }
.bottom-cta { flex: 1; background: #C41E3A; color: #FFFFFF; text-align: center; padding: 22rpx; border-radius: 48rpx; font-size: 28rpx; font-weight: 500; }

.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; }
.modal-sheet { position: fixed; bottom: 0; left: 0; right: 0; background: #FFFFFF; border-radius: 32rpx 32rpx 0 0; z-index: 101; padding: 24rpx; }
.modal-handle { width: 64rpx; height: 8rpx; background: #E8E0D5; border-radius: 4rpx; margin: 0 auto 24rpx; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.modal-close { font-size: 32rpx; color: #999; padding: 8rpx; }
.modal-body { }
.pay-qa-preview { background: #FAF8F5; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.pay-qa-question { font-size: 28rpx; color: #2C2C2C; font-weight: 500; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pay-qa-answerer { font-size: 22rpx; color: #999; margin-top: 8rpx; display: block; }
.pay-price-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.pay-price-label { font-size: 28rpx; color: #666; }
.pay-price-value { display: flex; align-items: baseline; gap: 4rpx; }
.pay-amount { font-size: 48rpx; font-weight: 700; color: #C41E3A; }
.pay-unit { font-size: 24rpx; color: #999; }
.pay-viewer-count { font-size: 24rpx; color: #999; display: block; margin-bottom: 24rpx; }
.pay-confirm-btn { background: #C41E3A; color: #FFFFFF; text-align: center; padding: 24rpx; border-radius: 24rpx; font-size: 28rpx; font-weight: 500; margin-bottom: 12rpx; }
.pay-hint { font-size: 20rpx; color: #999; text-align: center; display: block; }
</style>
