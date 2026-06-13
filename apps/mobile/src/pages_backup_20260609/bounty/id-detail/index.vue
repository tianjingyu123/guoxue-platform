<template>
  <view class="bd-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">悬赏详情</text>
        <text class="header-share">📤</text>
      </view>
    </view>

    <template v-if="loading">
      <view class="bd-body">
        <view class="skeleton">
          <view class="sk-line w-70" />
          <view class="sk-line w-40" />
          <view class="sk-block" />
        </view>
      </view>
    </template>

    <template v-else-if="bounty">
      <view class="bd-body">
        <view class="amount-card">
          <view class="ac-top">
            <view class="ac-price">
              <text class="ac-icon">🎁</text>
              <text class="ac-num">¥{{ bounty.amount }}</text>
            </view>
            <text class="ac-status" :style="{ background: statusConfig[bounty.status]?.bg, color: statusConfig[bounty.status]?.color }">{{ statusConfig[bounty.status]?.label }}</text>
          </view>
          <view v-if="bounty.status === 'open'" class="ac-time">
            <text>⏰ {{ getRemainingTime(bounty.expireAt) }}</text>
          </view>
        </view>

        <view class="poster-row">
          <view class="poster-avatar">{{ bounty.poster.name[0] }}</view>
          <view class="poster-info">
            <text class="poster-name">{{ bounty.poster.name }}</text>
            <text class="poster-date">{{ new Date(bounty.createdAt).toLocaleDateString('zh-CN') }} 发布</text>
          </view>
        </view>

        <text class="bd-title">{{ bounty.title }}</text>
        <text class="bd-content">{{ bounty.content }}</text>

        <view v-if="bounty.tags" class="bd-tags">
          <text v-for="t in bounty.tags" :key="t" class="bd-tag">#{{ t }}</text>
        </view>

        <view class="bd-stats">
          <text>👁 {{ bounty.viewCount }} 浏览</text>
          <text>💬 {{ bounty.answerCount }} 回答</text>
        </view>

        <!-- 回答列表 -->
        <view class="answers-section">
          <text class="answers-title">全部回答 ({{ bounty.answers.length }})</text>
          <view v-if="bounty.answers.length === 0" class="answers-empty">
            <text class="ae-icon">💬</text>
            <text>暂无回答，快来抢答吧</text>
          </view>
          <view v-for="answer in bounty.answers" :key="answer.id" class="answer-card">
            <view class="aw-header">
              <view class="aw-avatar">{{ answer.author.name[0] }}</view>
              <view class="aw-user">
                <view class="aw-name-row">
                  <text class="aw-name">{{ answer.author.name }}</text>
                  <text v-if="answer.author.title" class="aw-title-tag">{{ answer.author.title }}</text>
                  <text v-if="answer.isAccepted" class="aw-accepted">✅ 已采纳</text>
                </view>
                <text class="aw-time">{{ new Date(answer.createdAt).toLocaleString('zh-CN') }}</text>
              </view>
            </view>
            <text class="aw-content">{{ answer.content }}</text>
            <view class="aw-actions">
              <view class="aw-like" :class="{ liked: answer.isLiked }" @click="handleLike(answer.id)">
                <text>👍 {{ answer.likes }}</text>
              </view>
              <view v-if="isPoster && bounty.status === 'open' && !answer.isAccepted" class="aw-accept" @click="handleAccept(answer.id)">
                <text>🏆 采纳答案</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-bar">
        <template v-if="isPoster">
          <view v-if="bounty.status === 'open' && bounty.answers.length > 0" class="bb-btn primary" @click="handleSettle"><text>结算悬赏</text></view>
          <view v-else-if="bounty.status === 'expired' && bounty.answers.length === 0" class="bb-btn warning" @click="handleRefund"><text>申请退款</text></view>
          <view v-else class="bb-btn secondary"><text>等待中...</text></view>
        </template>
        <template v-else>
          <view v-if="bounty.status === 'open' && !hasAnswered" class="bb-btn primary" @click="showAnswerForm = true"><text>✈️ 我要回答</text></view>
          <view v-else class="bb-btn secondary"><text>已提交回答</text></view>
        </template>
      </view>
    </template>

    <!-- 回答弹层 -->
    <view v-if="showAnswerForm" class="modal-mask" @click="showAnswerForm = false">
      <view class="modal-card" @click.stop>
        <view class="modal-header">
          <text class="modal-cancel" @click="showAnswerForm = false">取消</text>
          <text class="modal-title-text">写回答</text>
          <text class="modal-submit" :class="{ disabled: submitting || answerContent.length < 20 }" @click="handleSubmitAnswer">{{ submitting ? '提交中...' : '提交' }}</text>
        </view>
        <textarea v-model="answerContent" class="modal-textarea" placeholder="请输入您的回答，至少20字..." maxlength="2000" />
        <text class="modal-count">{{ answerContent.length }}/2000</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const loading = ref(true)
const bounty = ref<any>(null)
const showAnswerForm = ref(false)
const answerContent = ref('')
const submitting = ref(false)
const currentUserId = ref('user-123')

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: '进行中', color: '#52C41A', bg: 'rgba(82,196,26,0.08)' },
  answered: { label: '已回答', color: '#1677FF', bg: 'rgba(22,119,255,0.08)' },
  resolved: { label: '已解决', color: '#C41E3A', bg: 'rgba(196,30,58,0.08)' },
  expired: { label: '已过期', color: '#999', bg: '#F5F1EB' },
  cancelled: { label: '已取消', color: '#999', bg: '#F5F1EB' },
}

const isPoster = computed(() => bounty.value?.poster.id === currentUserId.value)
const hasAnswered = computed(() => bounty.value?.answers?.some((a: any) => a.author.id === currentUserId.value))

// load mock data
setTimeout(() => {
  bounty.value = {
    id: '1', title: '如何理解《易经》中的"元亨利贞"？',
    description: '想深入了解《易经》乾卦中"元亨利贞"四德的含义',
    content: '我最近在学习《易经》，对于乾卦的"元亨利贞"这四个字理解不深。\n\n1. 这四个字分别代表什么意思？\n2. 它们之间有什么内在联系？\n3. 在实际生活中如何运用这四德？\n\n希望能得到详细的解答，最好能结合具体案例说明。',
    amount: 50, status: 'open',
    poster: { id: 'user-456', name: '国学爱好者', avatar: '' },
    answerCount: 3, viewCount: 128, category: '易经研究',
    tags: ['易经', '乾卦', '四德'],
    createdAt: '2024-01-15T10:00:00Z', expireAt: '2024-01-22T10:00:00Z',
    answers: [
      {
        id: 'a1', content: '"元亨利贞"是《易经》乾卦的卦辞，被称为"四德"。\n\n元：开始、首创、生长之德。代表万物之始，是创造的源动力。\n\n亨：通达、顺利、亨通之德。代表事物发展顺畅，如日中天。\n\n利：有利、适宜、收获之德。代表成熟收获，获得利益。\n\n贞：正固、坚守、纯正之德。代表守正不阿，坚持正道。\n\n这四德代表了事物发展的四个阶段，也是为人处世的四种品德。',
        author: { id: 'user-789', name: '周易大师', avatar: '', title: '易学讲师' },
        likes: 24, isLiked: false, isAccepted: false,
        createdAt: '2024-01-15T14:30:00Z',
      },
      {
        id: 'a2', content: '简单来说，元是创始，亨是通达，利是和谐，贞是正固。这四个字概括了天道运行和人生处世的基本原则。',
        author: { id: 'user-101', name: '传统文化研究者', avatar: '' },
        likes: 8, isLiked: true, isAccepted: false,
        createdAt: '2024-01-16T09:00:00Z',
      },
    ],
  }
  loading.value = false
}, 300)

function getRemainingTime(exp: string) {
  const diff = new Date(exp).getTime() - Date.now()
  if (diff <= 0) return '已过期'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `剩余 ${days} 天 ${hours} 小时`
  return `剩余 ${hours} 小时`
}

function handleLike(answerId: string) {
  if (!bounty.value) return
  const a = bounty.value.answers.find((x: any) => x.id === answerId)
  if (a) { a.isLiked = !a.isLiked; a.likes += a.isLiked ? 1 : -1 }
}

function handleAccept(answerId: string) {
  if (!bounty.value) return
  bounty.value.answers.forEach((a: any) => { a.isAccepted = a.id === answerId })
  uni.showToast({ title: '已采纳该答案', icon: 'success' })
}

function handleSubmitAnswer() {
  if (answerContent.value.length < 20) return
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    showAnswerForm.value = false
    answerContent.value = ''
    if (bounty.value) {
      bounty.value.answers.push({
        id: `a${Date.now()}`,
        content: answerContent.value,
        author: { id: 'user-123', name: '我', avatar: '', title: '' },
        likes: 0, isLiked: false, isAccepted: false,
        createdAt: new Date().toISOString(),
      })
      bounty.value.answerCount++
    }
    uni.showToast({ title: '回答提交成功', icon: 'success' })
  }, 800)
}

function handleSettle() { uni.showToast({ title: '结算成功', icon: 'success' }) }
function handleRefund() { uni.showToast({ title: '退款申请已提交', icon: 'success' }) }
</script>

<style scoped>
.bd-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 120rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(255,255,255,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.header-share { font-size: 28rpx; width: 56rpx; text-align: right; }

.bd-body { padding: 24rpx; }

.skeleton { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.sk-line { height: 18rpx; background: #f0f0f0; border-radius: 4rpx; margin-bottom: 12rpx; }
.sk-line.w-70 { width: 70%; }
.sk-line.w-40 { width: 40%; }
.sk-block { height: 160rpx; background: #f0f0f0; border-radius: 12rpx; }

.amount-card { background: linear-gradient(135deg, #FFFBF0, #FFF5E6); border-radius: 16rpx; padding: 20rpx; margin-bottom: 20rpx; }
.ac-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; }
.ac-price { display: flex; align-items: center; gap: 8rpx; }
.ac-icon { font-size: 28rpx; }
.ac-num { font-size: 40rpx; font-weight: 700; color: #C9A96E; }
.ac-status { font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 20rpx; }
.ac-time { font-size: 24rpx; color: #C9A96E; }

.poster-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; }
.poster-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #C41E3A; }
.poster-name { font-size: 24rpx; font-weight: 500; color: #333; display: block; }
.poster-date { font-size: 20rpx; color: #BBB; display: block; }

.bd-title { font-size: 32rpx; font-weight: 600; color: #333; display: block; margin-bottom: 16rpx; }
.bd-content { font-size: 26rpx; color: #555; line-height: 1.7; white-space: pre-wrap; display: block; margin-bottom: 18rpx; }
.bd-tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-bottom: 18rpx; }
.bd-tag { font-size: 20rpx; color: #8B7355; background: #F5F0E8; padding: 4rpx 12rpx; border-radius: 8rpx; }
.bd-stats { display: flex; gap: 24rpx; padding: 16rpx 0; border-top: 1px solid #F5F1EB; margin-bottom: 8rpx; }
.bd-stats text { font-size: 22rpx; color: #BBB; }

.answers-section { margin-top: 8rpx; }
.answers-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-bottom: 16rpx; }
.answers-empty { text-align: center; padding: 60rpx 0; }
.ae-icon { font-size: 60rpx; opacity: 0.3; display: block; margin-bottom: 12rpx; }
.answers-empty text { font-size: 24rpx; color: #BBB; }

.answer-card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 14rpx; }
.aw-header { display: flex; align-items: flex-start; gap: 12rpx; margin-bottom: 14rpx; }
.aw-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; background: linear-gradient(135deg, #E8F4FF, #D0E8FF); display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #1677FF; flex-shrink: 0; }
.aw-user { flex: 1; }
.aw-name-row { display: flex; align-items: center; gap: 8rpx; flex-wrap: wrap; }
.aw-name { font-size: 24rpx; font-weight: 500; color: #333; }
.aw-title-tag { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: rgba(196,30,58,0.08); color: #C41E3A; }
.aw-accepted { font-size: 18rpx; color: #52C41A; }
.aw-time { font-size: 20rpx; color: #BBB; display: block; margin-top: 2rpx; }
.aw-content { font-size: 26rpx; color: #555; line-height: 1.7; white-space: pre-wrap; display: block; margin-bottom: 16rpx; }
.aw-actions { display: flex; justify-content: space-between; align-items: center; }
.aw-like { padding: 8rpx 18rpx; border-radius: 20rpx; background: #F5F1EB; }
.aw-like text { font-size: 22rpx; color: #666; }
.aw-like.liked { background: rgba(196,30,58,0.08); }
.aw-like.liked text { color: #C41E3A; }
.aw-accept { padding: 8rpx 18rpx; border-radius: 20rpx; background: #C41E3A; }
.aw-accept text { font-size: 22rpx; color: #fff; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #E8E0D5; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); }
.bb-btn { padding: 22rpx; border-radius: 16rpx; text-align: center; }
.bb-btn.primary { background: #C41E3A; }
.bb-btn.primary text { font-size: 28rpx; font-weight: 600; color: #fff; }
.bb-btn.warning { background: #F0A030; }
.bb-btn.warning text { font-size: 28rpx; font-weight: 600; color: #fff; }
.bb-btn.secondary { background: #F5F1EB; }
.bb-btn.secondary text { font-size: 28rpx; color: #999; }

.modal-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.modal-card { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; max-height: 80vh; display: flex; flex-direction: column; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; border-bottom: 1px solid #E8E0D5; }
.modal-cancel { font-size: 26rpx; color: #999; }
.modal-title-text { font-size: 28rpx; font-weight: 600; color: #333; }
.modal-submit { font-size: 26rpx; color: #C41E3A; font-weight: 500; }
.modal-submit.disabled { opacity: 0.5; }
.modal-textarea { flex: 1; padding: 20rpx 24rpx; font-size: 26rpx; color: #333; height: 300rpx; }
.modal-count { font-size: 20rpx; color: #999; text-align: right; padding: 10rpx 24rpx 20rpx; }
</style>
