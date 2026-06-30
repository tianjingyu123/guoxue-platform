<template>
  <view class="bd-page">
    <customer-service-fab />
    <!-- Header -->
    <view class="bd-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="bd-header-row">
        <view class="bd-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="40" color="#2c2c2c" />
        </view>
        <text class="bd-header-title">悬赏详情</text>
        <view class="bd-icon-btn">
          <app-icon name="share-2" :size="40" color="#2c2c2c" />
        </view>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="bd-loading">
      <view class="bd-sk-line bd-sk-w75" />
      <view class="bd-sk-line bd-sk-w50" />
      <view class="bd-sk-block" />
    </view>

    <!-- Error -->
    <app-error v-else-if="error" title="悬赏加载失败" desc="网络异常，请稍后重试" @retry="loadBounty" />

    <!-- Not found -->
    <view v-else-if="!bounty" class="bd-notfound">
      <app-icon name="alert-circle" :size="96" color="#999999" />
      <text class="bd-notfound-text">悬赏不存在或已删除</text>
    </view>

    <template v-else>
      <!-- Bounty Info -->
      <view class="bd-info">
        <!-- Amount & Status -->
        <view class="bd-amount-card">
          <view class="bd-amount-row">
            <view class="bd-amount-left">
              <app-icon name="gift" :size="40" color="#d97706" />
              <text class="bd-amount-num">¥{{ bounty.amount }}</text>
            </view>
            <view class="bd-status" :class="'bd-status-' + bounty.status">
              <text class="bd-status-text" :class="'bd-status-text-' + bounty.status">{{ statusConfig[bounty.status].label }}</text>
            </view>
          </view>
          <view v-if="bounty.status === 'open'" class="bd-remain">
            <app-icon name="clock" :size="28" color="#b45309" />
            <text class="bd-remain-text">{{ getRemainingTime(bounty.expireAt) }}</text>
          </view>
        </view>

        <!-- Poster -->
        <view class="bd-poster">
          <view class="bd-poster-avatar">
            <image lazy-load v-if="bounty.poster.avatar" :src="bounty.poster.avatar" class="bd-poster-img" mode="aspectFill" />
            <app-icon v-else name="user" :size="40" color="#c41e3a" />
          </view>
          <view class="bd-poster-body">
            <text class="bd-poster-name">{{ bounty.poster.name }}</text>
            <text class="bd-poster-time">{{ formatDate(bounty.createdAt) }} 发布</text>
          </view>
        </view>

        <!-- Title & Content -->
        <view class="bd-content-block">
          <text class="bd-content-title">{{ bounty.title }}</text>
          <text class="bd-content-text">{{ bounty.content }}</text>
        </view>

        <!-- Tags -->
        <view v-if="bounty.tags && bounty.tags.length" class="bd-tags">
          <text v-for="(tag, i) in bounty.tags" :key="i" class="bd-tag">#{{ tag }}</text>
        </view>

        <!-- Stats -->
        <view class="bd-stats">
          <view class="bd-stat">
            <app-icon name="eye" :size="30" color="#999999" />
            <text class="bd-stat-text">{{ bounty.viewCount }} 浏览</text>
          </view>
          <view class="bd-stat">
            <app-icon name="message-circle" :size="30" color="#999999" />
            <text class="bd-stat-text">{{ bounty.answerCount }} 回答</text>
          </view>
        </view>
      </view>

      <!-- Answers -->
      <view class="bd-answers">
        <view class="bd-answers-head">
          <text class="bd-answers-title">全部回答 <text class="bd-answers-count">({{ bounty.answers.length }})</text></text>
        </view>

        <view v-if="bounty.answers.length === 0" class="bd-answers-empty">
          <app-icon name="message-circle" :size="80" color="#cccccc" />
          <text class="bd-answers-empty-text">暂无回答，快来抢答吧</text>
        </view>

        <view v-else class="bd-answer-list">
          <view v-for="answer in bounty.answers" :key="answer.id" class="bd-answer">
            <!-- Answer Header -->
            <view class="bd-answer-head">
              <view class="bd-answer-avatar">
                <image lazy-load v-if="answer.author.avatar" :src="answer.author.avatar" class="bd-answer-img" mode="aspectFill" />
                <app-icon v-else name="user" :size="40" color="#2563eb" />
              </view>
              <view class="bd-answer-meta">
                <view class="bd-answer-meta-top">
                  <text class="bd-answer-name">{{ answer.author.name }}</text>
                  <view v-if="answer.author.title" class="bd-answer-badge">
                    <text class="bd-answer-badge-text">{{ answer.author.title }}</text>
                  </view>
                  <view v-if="answer.isAccepted" class="bd-accepted">
                    <app-icon name="check-circle" :size="24" color="#16a34a" />
                    <text class="bd-accepted-text">已采纳</text>
                  </view>
                </view>
                <text class="bd-answer-time">{{ formatDateTime(answer.createdAt) }}</text>
              </view>
            </view>

            <!-- Answer Content -->
            <text class="bd-answer-content">{{ answer.content }}</text>

            <!-- Answer Actions -->
            <view class="bd-answer-actions">
              <view
                class="bd-like"
                :class="{ 'bd-like-active': answer.isLiked }"
                @tap="likeAnswer(answer.id)"
              >
                <app-icon name="thumbs-up" :size="28" :color="answer.isLiked ? '#c41e3a' : '#999999'" />
                <text class="bd-like-text" :class="{ 'bd-like-text-active': answer.isLiked }">{{ answer.likes }}</text>
              </view>
              <view
                v-if="isPoster && bounty.status === 'open' && !answer.isAccepted && !bounty.acceptedAnswerId"
                class="bd-accept-btn"
                @tap="acceptAnswer(answer.id)"
              >
                <app-icon name="award" :size="28" color="#ffffff" />
                <text class="bd-accept-btn-text">采纳答案</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- Answer Form Modal -->
    <view v-if="showAnswerForm" class="bd-modal-mask">
      <view class="bd-modal">
        <view class="bd-modal-head">
          <text class="bd-modal-cancel" @tap="showAnswerForm = false">取消</text>
          <text class="bd-modal-title">写回答</text>
          <text
            class="bd-modal-submit"
            :class="{ 'bd-modal-submit-disabled': submitting || answerContent.length < 20 }"
            @tap="submitAnswer"
          >{{ submitting ? '提交中...' : '提交' }}</text>
        </view>
        <view class="bd-modal-body">
          <textarea
            v-model="answerContent"
            class="bd-modal-textarea"
            placeholder="请输入您的回答，至少20字..."
            :maxlength="2000"
          />
          <text class="bd-modal-counter">{{ answerContent.length }}/2000</text>
        </view>
      </view>
    </view>

    <!-- Bottom Actions -->
    <view v-if="bounty" class="bd-bottom">
      <view v-if="isPoster" class="bd-bottom-row">
        <view v-if="bounty.status === 'open' && bounty.acceptedAnswerId" class="bd-btn-primary" @tap="settle">
          <text class="bd-btn-primary-text">结算悬赏</text>
        </view>
        <view v-if="bounty.status === 'expired' && bounty.answers.length === 0" class="bd-btn-warn" @tap="refund">
          <text class="bd-btn-warn-text">申请退款</text>
        </view>
        <view v-if="bounty.status === 'open' && !bounty.acceptedAnswerId" class="bd-btn-muted" @tap="toQa">
          <text class="bd-btn-muted-text">查看更多回答</text>
        </view>
      </view>
      <view v-else class="bd-bottom-row">
        <view v-if="bounty.status === 'open' && !hasAnswered" class="bd-btn-primary" @tap="showAnswerForm = true">
          <app-icon name="send" :size="32" color="#ffffff" />
          <text class="bd-btn-primary-text">我要回答</text>
        </view>
        <view v-if="hasAnswered" class="bd-btn-done">
          <text class="bd-btn-done-text">已提交回答</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateTo, navigateBack } from '@/utils/router'

interface BountyAnswer {
  id: string
  content: string
  author: { id: string; name: string; avatar: string; title?: string }
  likes: number
  isLiked: boolean
  isAccepted: boolean
  createdAt: string
}
interface BountyDetail {
  id: string
  title: string
  description: string
  content: string
  amount: number
  status: 'open' | 'answered' | 'resolved' | 'expired' | 'cancelled'
  poster: { id: string; name: string; avatar: string }
  answerCount: number
  viewCount: number
  category: string
  tags: string[]
  createdAt: string
  expireAt: string
  acceptedAnswerId?: string
  answers: BountyAnswer[]
}

const statusConfig: Record<string, { label: string }> = {
  open: { label: '进行中' },
  answered: { label: '已回答' },
  resolved: { label: '已解决' },
  expired: { label: '已过期' },
  cancelled: { label: '已取消' },
}

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const bountyId = ref('')
const currentUserId = 'user-123'
const bounty = ref<BountyDetail | null>(null)
const loading = ref(true)
const error = ref(false)
const showAnswerForm = ref(false)
const answerContent = ref('')
const submitting = ref(false)

function loadBounty() {
  loading.value = true
  error.value = false
  setTimeout(() => {
    bounty.value = {
      id: bountyId.value || '1',
      title: '如何理解《易经》中的"元亨利贞"？',
      description: '想深入了解《易经》乾卦中"元亨利贞"四德的含义',
      content: '我最近在学习《易经》，对于乾卦的"元亨利贞"这四个字理解不深。\n\n1. 这四个字分别代表什么意思？\n2. 它们之间有什么内在联系？\n3. 在实际生活中如何运用这四德？\n\n希望能得到详细的解答，最好能结合具体案例说明。',
      amount: 50,
      status: 'open',
      poster: { id: 'user-456', name: '国学爱好者', avatar: '' },
      answerCount: 3,
      viewCount: 128,
      category: '易经研究',
      tags: ['易经', '乾卦', '四德'],
      createdAt: '2024-01-15T10:00:00Z',
      expireAt: '2024-01-22T10:00:00Z',
      answers: [
        {
          id: 'answer-1',
          content: '"元亨利贞"是《易经》乾卦的卦辞，被称为"四德"。\n\n元：开始、首创、生长之德。代表万物之始，是创造的源动力。\n\n亨：通达、顺利、亨通之德。代表事物发展顺畅，如日中天。\n\n利：有利、适宜、收获之德。代表成熟收获，获得利益。\n\n贞：正固、坚守、纯正之德。代表守正不阿，坚持正道。\n\n这四德代表了事物发展的四个阶段，也是为人处世的四种品德。',
          author: { id: 'user-789', name: '周易大师', avatar: '', title: '易学讲师' },
          likes: 24,
          isLiked: false,
          isAccepted: false,
          createdAt: '2024-01-15T14:30:00Z',
        },
        {
          id: 'answer-2',
          content: '简单来说，元是创始，亨是通达，利是和谐，贞是正固。这四个字概括了天道运行和人生处世的基本原则。',
          author: { id: 'user-101', name: '传统文化研究者', avatar: '' },
          likes: 8,
          isLiked: true,
          isAccepted: false,
          createdAt: '2024-01-16T09:00:00Z',
        },
      ],
    }
    loading.value = false
  }, 400)
}

const isPoster = computed(() => bounty.value?.poster.id === currentUserId)
const hasAnswered = computed(() => bounty.value?.answers.some(a => a.author.id === currentUserId))

function submitAnswer() {
  if (answerContent.value.trim().length < 20 || submitting.value) return
  submitting.value = true
  setTimeout(() => {
    answerContent.value = ''
    showAnswerForm.value = false
    submitting.value = false
    uni.showToast({ title: '回答已提交', icon: 'success' })
    loadBounty()
  }, 600)
}

function acceptAnswer(answerId: string) {
  if (!bounty.value) return
  bounty.value.acceptedAnswerId = answerId
  bounty.value.answers = bounty.value.answers.map(a =>
    a.id === answerId ? { ...a, isAccepted: true } : a,
  )
  uni.showToast({ title: '已采纳', icon: 'success' })
}

function likeAnswer(answerId: string) {
  if (!bounty.value) return
  bounty.value.answers = bounty.value.answers.map(a =>
    a.id === answerId
      ? { ...a, isLiked: !a.isLiked, likes: a.isLiked ? a.likes - 1 : a.likes + 1 }
      : a,
  )
}

function settle() {
  uni.showToast({ title: '结算成功', icon: 'success' })
}
function refund() {
  uni.showToast({ title: '已申请退款', icon: 'success' })
}
function toQa() {
  navigateTo('/qa')
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}
function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function getRemainingTime(expireAt: string) {
  const diff = new Date(expireAt).getTime() - Date.now()
  if (diff <= 0) return '已过期'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `剩余 ${days} 天 ${hours} 小时`
  return `剩余 ${hours} 小时`
}

function goBack() {
  navigateBack()
}

try {
  const pages = getCurrentPages()
  const cur = pages[pages.length - 1] as unknown as { options?: Record<string, string>; $page?: { options?: Record<string, string> } }
  const opts = cur?.options || cur?.$page?.options || {}
  bountyId.value = opts.id || '1'
} catch (e) {
  bountyId.value = '1'
}

loadBounty()
</script>

<style scoped>
.bd-page {
  min-height: 100vh;
  background: #ffffff;
  padding-bottom: 180rpx;
}

/* Header */
.bd-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12rpx);
  -webkit-backdrop-filter: blur(12rpx);
  border-bottom: 2rpx solid #e8e3db;
}
.bd-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 96rpx;
  padding: 0 24rpx;
}
.bd-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
}
.bd-header-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}

/* Loading / Notfound */
.bd-loading {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.bd-sk-line {
  height: 40rpx;
  border-radius: 8rpx;
  background: #ececec;
}
.bd-sk-w75 { width: 75%; }
.bd-sk-w50 { width: 50%; }
.bd-sk-block {
  height: 256rpx;
  border-radius: 24rpx;
  background: #ececec;
}
.bd-notfound {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  gap: 24rpx;
}
.bd-notfound-text {
  font-size: 28rpx;
  color: #999999;
}

/* Info */
.bd-info {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.bd-amount-card {
  background: linear-gradient(90deg, #fffbeb 0%, #fff7ed 100%);
  border-radius: 32rpx;
  padding: 32rpx;
}
.bd-amount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.bd-amount-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.bd-amount-num {
  font-size: 48rpx;
  font-weight: 700;
  color: #d97706;
}
.bd-status {
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
}
.bd-status-open { background: #f0fdf4; }
.bd-status-answered { background: #eff6ff; }
.bd-status-resolved { background: rgba(196, 30, 58, 0.1); }
.bd-status-expired { background: #f5f5f4; }
.bd-status-cancelled { background: #f5f5f4; }
.bd-status-text {
  font-size: 26rpx;
  font-weight: 500;
}
.bd-status-text-open { color: #16a34a; }
.bd-status-text-answered { color: #2563eb; }
.bd-status-text-resolved { color: var(--brand); }
.bd-status-text-expired { color: #999999; }
.bd-status-text-cancelled { color: #999999; }
.bd-remain {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.bd-remain-text {
  font-size: 26rpx;
  color: #b45309;
}

/* Poster */
.bd-poster {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.bd-poster-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.2), rgba(196, 30, 58, 0.05));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.bd-poster-img {
  width: 100%;
  height: 100%;
}
.bd-poster-body {
  flex: 1;
}
.bd-poster-name {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.bd-poster-time {
  display: block;
  font-size: 22rpx;
  color: #999999;
  margin-top: 4rpx;
}

/* Content */
.bd-content-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 24rpx;
  line-height: 1.4;
}
.bd-content-text {
  display: block;
  font-size: 28rpx;
  color: rgba(44, 44, 44, 0.8);
  line-height: 1.7;
  white-space: pre-wrap;
}
.bd-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.bd-tag {
  padding: 8rpx 16rpx;
  background: #f5f5f4;
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #999999;
}
.bd-stats {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid #f0f0ef;
}
.bd-stat {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.bd-stat-text {
  font-size: 26rpx;
  color: #999999;
}

/* Answers */
.bd-answers {
  margin-top: 16rpx;
}
.bd-answers-head {
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid #f0f0ef;
}
.bd-answers-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.bd-answers-count {
  color: #999999;
}
.bd-answers-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 96rpx 0;
  gap: 16rpx;
}
.bd-answers-empty-text {
  font-size: 26rpx;
  color: #999999;
}
.bd-answer-list {
  display: flex;
  flex-direction: column;
}
.bd-answer {
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0ef;
}
.bd-answer-head {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 24rpx;
}
.bd-answer-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #dbeafe, #eff6ff);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.bd-answer-img {
  width: 100%;
  height: 100%;
}
.bd-answer-meta {
  flex: 1;
  min-width: 0;
}
.bd-answer-meta-top {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-wrap: wrap;
}
.bd-answer-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.bd-answer-badge {
  padding: 2rpx 12rpx;
  background: rgba(196, 30, 58, 0.1);
  border-radius: 8rpx;
}
.bd-answer-badge-text {
  font-size: 20rpx;
  color: var(--brand);
}
.bd-accepted {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 12rpx;
  background: #f0fdf4;
  border-radius: 8rpx;
}
.bd-accepted-text {
  font-size: 20rpx;
  color: #16a34a;
}
.bd-answer-time {
  display: block;
  font-size: 22rpx;
  color: #999999;
  margin-top: 4rpx;
}
.bd-answer-content {
  display: block;
  font-size: 28rpx;
  color: rgba(44, 44, 44, 0.8);
  line-height: 1.7;
  white-space: pre-wrap;
  margin-bottom: 24rpx;
}
.bd-answer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bd-like {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 24rpx;
  background: #f5f5f4;
  border-radius: 999rpx;
}
.bd-like-active {
  background: rgba(196, 30, 58, 0.1);
}
.bd-like-text {
  font-size: 26rpx;
  color: #999999;
}
.bd-like-text-active {
  color: var(--brand);
}
.bd-accept-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 24rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.bd-accept-btn-text {
  font-size: 26rpx;
  color: #ffffff;
}

/* Modal */
.bd-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
}
.bd-modal {
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.bd-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid #f0f0ef;
}
.bd-modal-cancel {
  font-size: 28rpx;
  color: #999999;
}
.bd-modal-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.bd-modal-submit {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--brand);
}
.bd-modal-submit-disabled {
  opacity: 0.5;
}
.bd-modal-body {
  padding: 32rpx;
}
.bd-modal-textarea {
  width: 100%;
  height: 320rpx;
  padding: 24rpx;
  background: #f5f5f4;
  border-radius: 24rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  box-sizing: border-box;
}
.bd-modal-counter {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #999999;
  margin-top: 16rpx;
}

/* Bottom */
.bd-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 2rpx solid #e8e3db;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
}
.bd-bottom-row {
  display: flex;
  gap: 24rpx;
}
.bd-btn-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  height: 88rpx;
  background: var(--brand);
  border-radius: 24rpx;
}
.bd-btn-primary-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
}
.bd-btn-warn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background: #f59e0b;
  border-radius: 24rpx;
}
.bd-btn-warn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
}
.bd-btn-muted {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background: #f5f5f4;
  border-radius: 24rpx;
}
.bd-btn-muted-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.bd-btn-done {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background: #f5f5f4;
  border-radius: 24rpx;
}
.bd-btn-done-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #999999;
}
</style>
