<template>
  <view class="qd-page">
    <!-- 头部 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">问答详情</text>
        <text class="header-share" @click="handleShare">📤</text>
      </view>
    </view>

    <template v-if="loading">
      <view class="skeleton">
        <view class="sk-card"><view class="sk-line" /><view class="sk-line short" /></view>
        <view class="sk-card tall"><view class="sk-line" /><view class="sk-line short" /></view>
      </view>
    </template>

    <template v-else-if="!question">
      <view class="empty">
        <text class="empty-icon">❓</text>
        <text class="empty-text">问答不存在</text>
      </view>
    </template>

    <template v-else>
      <!-- 问题卡片 -->
      <view class="card">
        <view class="status-badge" :class="statusConfig.cls">{{ statusConfig.label }}</view>

        <view class="asker-row">
          <view class="asker-avatar">{{ question.asker.name[0] }}</view>
          <view class="asker-info">
            <text class="asker-name">{{ question.asker.name }}</text>
            <text class="asker-time">{{ formatDate(question.createdAt) }}</text>
          </view>
          <view class="asker-price">
            <text class="ap-num">¥{{ question.price }}</text>
            <text class="ap-label">提问费</text>
          </view>
        </view>

        <text class="q-title">{{ question.title }}</text>
        <text class="q-content">{{ question.content }}</text>

        <view v-if="question.tags?.length" class="q-tags">
          <text v-for="tag in question.tags" :key="tag" class="q-tag">#{{ tag }}</text>
        </view>

        <view class="q-stats">
          <text>👁️ {{ question.viewCount }}</text>
          <text>❤️ {{ question.likeCount }}</text>
          <text v-if="question.circleName">👥 {{ question.circleName }}</text>
        </view>
      </view>

      <!-- 回答区域 -->
      <view class="card">
        <!-- 答主信息 -->
        <view v-if="question.answerer" class="answerer-row">
          <view class="ar-avatar">{{ question.answerer.name[0] }}</view>
          <view class="ar-info">
            <view class="ar-name-row">
              <text class="ar-name">{{ question.answerer.name }}</text>
              <text v-if="question.answerer.title" class="ar-title">{{ question.answerer.title }}</text>
            </view>
            <text class="ar-status">{{ question.status === 'answered' ? '已回答' : '待回答' }}</text>
          </view>
        </view>

        <!-- 回答内容 -->
        <view class="answer-content">
          <!-- 已回答 + 有权限查看 -->
          <template v-if="question.status === 'answered' && question.answer">
            <template v-if="isAsker || isAnswerer || hasPeeked">
              <text class="answer-text">{{ question.answer }}</text>
              <text v-if="question.answeredAt" class="answer-time">回答于 {{ formatDate(question.answeredAt) }}</text>

              <!-- 评价 -->
              <template v-if="question.rating">
                <view class="rating-display">
                  <text class="rd-stars">{{ '⭐'.repeat(question.rating) }}</text>
                  <text class="rd-label">提问者评价</text>
                </view>
                <text v-if="question.ratingComment" class="rd-comment">{{ question.ratingComment }}</text>
              </template>
              <view v-else-if="isAsker" class="rate-btn" @click="showRateModal = true">
                <text>评价此回答</text>
              </view>
            </template>

            <!-- 未围观 - 付费查看 -->
            <template v-else>
              <view class="peek-block">
                <view class="peek-icon">🔒</view>
                <text class="peek-title">付费围观查看答案</text>
                <text class="peek-desc">支付 ¥1 即可查看完整回答</text>
                <view class="peek-btn" @click="showPeekModal = true"><text>立即围观</text></view>
              </view>
            </template>
          </template>

          <!-- 待回答 -->
          <template v-else-if="question.status === 'pending'">
            <view class="status-block pending">
              <text class="sb-icon">⏳</text>
              <text class="sb-title">等待回答中</text>
              <text class="sb-desc">剩余 {{ expireDays }} 天过期</text>
            </view>
          </template>

          <!-- 已过期 -->
          <template v-else-if="question.status === 'expired'">
            <view class="status-block expired">
              <text class="sb-icon">⏰</text>
              <text class="sb-title">问题已过期</text>
              <text class="sb-desc">答主未在规定时间内回答</text>
            </view>
          </template>

          <!-- 已退款 -->
          <template v-else>
            <view class="status-block refunded">
              <text class="sb-icon">↩️</text>
              <text class="sb-title">已退款</text>
              <text class="sb-desc">答主拒绝了此问题</text>
            </view>
          </template>
        </view>
      </view>

      <!-- 围观用户 -->
      <view v-if="peekUsers.length > 0 && question.status === 'answered'" class="card">
        <view class="peek-users-header">
          <text class="puh-title">👁️ 围观用户</text>
          <text class="puh-count">{{ peekUsers.length }}人</text>
        </view>
        <view class="peek-avatars">
          <view v-for="u in peekUsers.slice(0, 10)" :key="u.id" class="pa-item">{{ u.name[0] }}</view>
          <view v-if="peekUsers.length > 10" class="pa-more">+{{ peekUsers.length - 10 }}</view>
        </view>
      </view>
    </template>

    <!-- 底部操作（答主可见） -->
    <view v-if="isAnswerer && question?.status === 'pending'" class="bottom-bar">
      <view class="bb-reject" @click="showRejectModal = true"><text>拒绝回答</text></view>
      <view class="bb-answer" @click="showAnswerModal = true"><text>开始回答</text></view>
    </view>

    <!-- 围观弹窗 -->
    <view v-if="showPeekModal" class="modal-mask" @click="showPeekModal = false">
      <view class="modal" @click.stop>
        <text class="modal-title">确认围观</text>
        <view class="peek-price">
          <text class="pp-num">¥1</text>
          <text class="pp-desc">支付后即可查看完整回答</text>
        </view>
        <view class="modal-btns">
          <view class="mb-cancel" @click="showPeekModal = false"><text>取消</text></view>
          <view class="mb-confirm" @click="handlePeek"><text>{{ submitting ? '支付中...' : '确认支付' }}</text></view>
        </view>
      </view>
    </view>

    <!-- 回答弹窗 -->
    <view v-if="showAnswerModal" class="modal-mask" @click="showAnswerModal = false">
      <view class="modal" @click.stop>
        <text class="modal-title">回答问题</text>
        <textarea v-model="answerContent" class="modal-textarea" placeholder="请输入您的回答..." />
        <text class="modal-count">{{ answerContent.length }}/2000</text>
        <view class="modal-btns">
          <view class="mb-cancel" @click="showAnswerModal = false"><text>取消</text></view>
          <view class="mb-confirm" @click="handleAnswer"><text>{{ submitting ? '提交中...' : '提交回答' }}</text></view>
        </view>
      </view>
    </view>

    <!-- 拒绝弹窗 -->
    <view v-if="showRejectModal" class="modal-mask" @click="showRejectModal = false">
      <view class="modal" @click.stop>
        <text class="modal-title">拒绝原因</text>
        <textarea v-model="rejectReason" class="modal-textarea short" placeholder="请说明拒绝回答的原因..." />
        <text class="modal-hint">拒绝后，提问者将收到全额退款</text>
        <view class="modal-btns">
          <view class="mb-cancel" @click="showRejectModal = false"><text>取消</text></view>
          <view class="mb-confirm reject" @click="handleReject"><text>{{ submitting ? '提交中...' : '确认拒绝' }}</text></view>
        </view>
      </view>
    </view>

    <!-- 评价弹窗 -->
    <view v-if="showRateModal" class="modal-mask" @click="showRateModal = false">
      <view class="modal" @click.stop>
        <text class="modal-title">评价回答</text>
        <view class="rate-stars">
          <text v-for="s in 5" :key="s" class="rs-star" :class="{ active: s <= rating }" @click="rating = s">{{ s <= rating ? '⭐' : '☆' }}</text>
        </view>
        <textarea v-model="ratingComment" class="modal-textarea short" placeholder="写下您的评价（选填）" />
        <view class="modal-btns">
          <view class="mb-cancel" @click="showRateModal = false"><text>取消</text></view>
          <view class="mb-confirm" @click="handleRate"><text>{{ submitting ? '提交中...' : '提交评价' }}</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const loading = ref(false)
const isAnswerer = ref(false)
const isAsker = ref(true)
const hasPeeked = ref(false)

const question = ref<any>({
  id: '1', title: '请帮我分析一下我的八字格局', content: '我出生于1990年农历五月初五午时，男，想请老师帮忙分析一下八字格局和运势走向。',
  price: 99, status: 'answered', viewCount: 256, likeCount: 48, circleName: '八字研习社',
  tags: ['八字', '命理分析'], createdAt: '2024-01-15T10:30:00', answeredAt: '2024-01-15T14:20:00',
  asker: { id: 'u1', name: '易学爱好者', avatar: '' },
  answerer: { id: 'a1', name: '张道长', avatar: '', title: '易学研究会会长' },
  answer: '从您的八字来看，日主庚金生于午月，火旺金衰。但您的地支中有申酉戌三会金局，大大增强了日主的力量。\n\n综合来看，您的八字属于身旺格局，喜用神为木火。大运走东南木火之地较为有利。\n\n具体分析：\n1. 婚姻宫坐午火，为正官，代表配偶条件不错\n2. 财星透于时柱，中晚年财运较旺\n3. 需要注意肝胆方面的健康问题',
  rating: 5, ratingComment: '分析很详细，非常感谢！',
})

const peekUsers = ref([
  { id: 'p1', name: '用户A', avatar: '' }, { id: 'p2', name: '用户B', avatar: '' },
  { id: 'p3', name: '用户C', avatar: '' }, { id: 'p4', name: '用户D', avatar: '' },
])

const showPeekModal = ref(false)
const showAnswerModal = ref(false)
const showRejectModal = ref(false)
const showRateModal = ref(false)
const answerContent = ref('')
const rejectReason = ref('')
const rating = ref(5)
const ratingComment = ref('')
const submitting = ref(false)

const statusConfig = computed(() => {
  switch (question.value?.status) {
    case 'answered': return { cls: 'green', label: '已回答' }
    case 'expired': return { cls: 'gray', label: '已过期' }
    case 'refunded': return { cls: 'orange', label: '已退款' }
    default: return { cls: 'amber', label: '待回答' }
  }
})

const expireDays = computed(() => {
  if (!question.value?.expireAt) return 0
  return Math.ceil((new Date(question.value.expireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
})

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function handleShare() { uni.showToast({ title: '分享功能', icon: 'none' }) }

function handlePeek() {
  submitting.value = true
  setTimeout(() => { submitting.value = false; showPeekModal.value = false; hasPeeked.value = true }, 1000)
}

function handleAnswer() {
  if (!answerContent.value.trim()) return
  submitting.value = true
  setTimeout(() => { submitting.value = false; showAnswerModal.value = false; answerContent.value = '' }, 1000)
}

function handleReject() {
  if (!rejectReason.value.trim()) return
  submitting.value = true
  setTimeout(() => { submitting.value = false; showRejectModal.value = false }, 1000)
}

function handleRate() {
  submitting.value = true
  setTimeout(() => { submitting.value = false; showRateModal.value = false }, 1000)
}
</script>

<style scoped>
.qd-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 140rpx; }

.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-share { font-size: 32rpx; width: 56rpx; text-align: center; }

.skeleton { padding: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.sk-card { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.sk-line { height: 24rpx; background: #F0F0F0; border-radius: 6rpx; margin-bottom: 14rpx; }
.sk-line.short { width: 60%; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 200rpx 48rpx; }
.empty-icon { font-size: 80rpx; opacity: 0.2; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }

.card { background: #fff; margin: 16rpx 24rpx; border-radius: 16rpx; padding: 24rpx; }

.status-badge { display: inline-flex; padding: 4rpx 14rpx; border-radius: 20rpx; font-size: 20rpx; margin-bottom: 16rpx; }
.status-badge.green { background: rgba(82,196,26,0.1); color: #52C41A; }
.status-badge.gray { background: rgba(0,0,0,0.05); color: #999; }
.status-badge.orange { background: rgba(240,160,48,0.1); color: #F0A030; }
.status-badge.amber { background: rgba(240,160,48,0.1); color: #F0A030; }

.asker-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.asker-avatar { width: 60rpx; height: 60rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #C41E3A; flex-shrink: 0; }
.asker-info { flex: 1; }
.asker-name { font-size: 24rpx; font-weight: 500; color: #333; display: block; }
.asker-time { font-size: 18rpx; color: #BBB; }
.asker-price { text-align: right; }
.ap-num { font-size: 32rpx; font-weight: 700; color: #C41E3A; display: block; }
.ap-label { font-size: 18rpx; color: #BBB; }

.q-title { font-size: 28rpx; font-weight: 700; color: #333; display: block; margin-bottom: 10rpx; }
.q-content { font-size: 24rpx; color: #666; line-height: 1.7; display: block; }
.q-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 16rpx; }
.q-tag { font-size: 20rpx; padding: 4rpx 14rpx; border-radius: 20rpx; background: #F5F1EB; color: #999; }
.q-stats { display: flex; gap: 24rpx; margin-top: 16rpx; padding-top: 16rpx; border-top: 1px solid #F5F1EB; }
.q-stats text { font-size: 20rpx; color: #BBB; }

.answerer-row { display: flex; align-items: center; gap: 12rpx; padding-bottom: 16rpx; border-bottom: 1px solid #F5F1EB; margin-bottom: 16rpx; }
.ar-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: linear-gradient(135deg, rgba(196,30,58,0.1), rgba(196,30,58,0.05)); display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: #C41E3A; flex-shrink: 0; }
.ar-name-row { display: flex; align-items: center; gap: 8rpx; }
.ar-name { font-size: 26rpx; font-weight: 600; color: #333; }
.ar-title { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: rgba(196,30,58,0.08); color: #C41E3A; }
.ar-status { font-size: 18rpx; color: #BBB; display: block; }

.answer-text { font-size: 24rpx; color: #555; line-height: 1.8; white-space: pre-wrap; display: block; }
.answer-time { font-size: 18rpx; color: #CCC; display: block; margin-top: 12rpx; }

.rating-display { display: flex; align-items: center; gap: 8rpx; margin-top: 16rpx; padding-top: 16rpx; border-top: 1px solid #F5F1EB; }
.rd-stars { font-size: 22rpx; }
.rd-label { font-size: 20rpx; color: #999; }
.rd-comment { font-size: 22rpx; color: #666; display: block; margin-top: 6rpx; }
.rate-btn { margin-top: 16rpx; padding: 16rpx; border-radius: 14rpx; border: 2rpx solid #C41E3A; text-align: center; }
.rate-btn text { font-size: 24rpx; color: #C41E3A; }

.peek-block { text-align: center; padding: 40rpx 0; }
.peek-icon { font-size: 60rpx; margin-bottom: 16rpx; }
.peek-title { font-size: 26rpx; font-weight: 500; color: #333; display: block; margin-bottom: 8rpx; }
.peek-desc { font-size: 22rpx; color: #999; display: block; margin-bottom: 24rpx; }
.peek-btn { display: inline-flex; padding: 14rpx 48rpx; border-radius: 28rpx; background: linear-gradient(90deg, #C41E3A, #E8544E); }
.peek-btn text { font-size: 24rpx; color: #fff; }

.status-block { text-align: center; padding: 40rpx 0; }
.sb-icon { font-size: 60rpx; display: block; margin-bottom: 16rpx; }
.sb-title { font-size: 26rpx; font-weight: 500; color: #333; display: block; margin-bottom: 6rpx; }
.sb-desc { font-size: 22rpx; color: #999; display: block; }

.peek-users-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.puh-title { font-size: 24rpx; font-weight: 500; color: #333; }
.puh-count { font-size: 22rpx; color: #999; }
.peek-avatars { display: flex; flex-wrap: wrap; gap: 10rpx; }
.pa-item { width: 56rpx; height: 56rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #666; }
.pa-more { width: 56rpx; height: 56rpx; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #999; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #E8E0D5; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); display: flex; gap: 16rpx; z-index: 20; }
.bb-reject { flex: 1; padding: 22rpx; border-radius: 14rpx; border: 2rpx solid #E8E0D5; text-align: center; }
.bb-reject text { font-size: 26rpx; color: #666; }
.bb-answer { flex: 1; padding: 22rpx; border-radius: 14rpx; background: linear-gradient(90deg, #C41E3A, #E8544E); text-align: center; }
.bb-answer text { font-size: 26rpx; color: #fff; font-weight: 500; }

.modal-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; }
.modal { background: #fff; border-radius: 28rpx 28rpx 0 0; width: 100%; max-width: 600rpx; padding: 32rpx 28rpx; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); }
.modal-title { font-size: 30rpx; font-weight: 700; color: #333; display: block; text-align: center; margin-bottom: 24rpx; }
.modal-textarea { width: 100%; height: 200rpx; padding: 16rpx; border-radius: 14rpx; background: #F5F1EB; font-size: 24rpx; color: #333; box-sizing: border-box; }
.modal-textarea.short { height: 140rpx; }
.modal-count { font-size: 20rpx; color: #BBB; text-align: right; display: block; margin-top: 8rpx; }
.modal-hint { font-size: 20rpx; color: #F0A030; display: block; margin-top: 8rpx; }
.modal-btns { display: flex; gap: 16rpx; margin-top: 24rpx; }
.mb-cancel { flex: 1; padding: 22rpx; border-radius: 14rpx; border: 2rpx solid #E8E0D5; text-align: center; }
.mb-cancel text { font-size: 26rpx; color: #666; }
.mb-confirm { flex: 1; padding: 22rpx; border-radius: 14rpx; background: #C41E3A; text-align: center; }
.mb-confirm text { font-size: 26rpx; color: #fff; font-weight: 500; }
.mb-confirm.reject { background: #F0A030; }

.peek-price { text-align: center; padding: 24rpx 0; }
.pp-num { font-size: 52rpx; font-weight: 700; color: #C41E3A; display: block; }
.pp-desc { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }

.rate-stars { display: flex; justify-content: center; gap: 12rpx; margin-bottom: 24rpx; }
.rs-star { font-size: 44rpx; }
</style>
