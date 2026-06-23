<template>
  <view class="qd-page">
    <!-- Header -->
    <view class="qd-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="qd-header-bar">
        <view class="qd-back" @tap="onBack"><app-icon name="chevron-left" :size="48" color="#2c2c2c" /></view>
        <text class="qd-header-title">问答详情</text>
        <view class="qd-share"><app-icon name="share-2" :size="40" color="#2c2c2c" /></view>
      </view>
    </view>

    <!-- Question Section -->
    <view class="qd-section">
      <view class="qd-card">
        <view class="qd-status-badge" :class="'qd-badge-' + question.status">
          <app-icon :name="statusIcon" :size="24" :color="statusColor" />
          <text class="qd-status-label" :style="{ color: statusColor }">{{ statusText }}</text>
        </view>

        <view class="qd-asker">
          <view class="qd-avatar qd-avatar-red"><text class="qd-avatar-tx">{{ question.asker.name[0] }}</text></view>
          <view class="qd-asker-info">
            <text class="qd-asker-name">{{ question.asker.name }}</text>
            <text class="qd-asker-time">{{ formatDate(question.createdAt) }}</text>
          </view>
          <view class="qd-price-col">
            <text class="qd-price">¥{{ question.price }}</text>
            <text class="qd-price-label">提问费</text>
          </view>
        </view>

        <text class="qd-q-title">{{ question.title }}</text>
        <text class="qd-q-content">{{ question.content }}</text>

        <view v-if="question.tags && question.tags.length" class="qd-tags">
          <view v-for="(tag, i) in question.tags" :key="i" class="qd-tag"><text class="qd-tag-tx">#{{ tag }}</text></view>
        </view>

        <view class="qd-q-stats">
          <view class="qd-stat"><app-icon name="eye" :size="32" color="#999999" /><text class="qd-stat-tx">{{ question.viewCount }}</text></view>
          <view class="qd-stat"><app-icon name="heart" :size="32" color="#999999" /><text class="qd-stat-tx">{{ question.likeCount }}</text></view>
          <view v-if="question.circleName" class="qd-stat"><app-icon name="users" :size="32" color="#999999" /><text class="qd-stat-tx">{{ question.circleName }}</text></view>
        </view>
      </view>
    </view>

    <!-- Answer Section -->
    <view class="qd-section-x">
      <view class="qd-card-x">
        <view v-if="question.answerer" class="qd-answerer">
          <view class="qd-avatar-lg qd-avatar-gold"><text class="qd-avatar-tx">{{ question.answerer.name[0] }}</text></view>
          <view class="qd-answerer-info">
            <view class="qd-answerer-row">
              <text class="qd-answerer-name">{{ question.answerer.name }}</text>
              <view v-if="question.answerer.title" class="qd-answerer-badge"><text class="qd-answerer-badge-tx">{{ question.answerer.title }}</text></view>
            </view>
            <text class="qd-answerer-status">{{ question.status === 'answered' ? '已回答' : '待回答' }}</text>
          </view>
        </view>

        <view class="qd-answer-body">
          <!-- answered + visible -->
          <view v-if="question.status === 'answered' && question.answer">
            <view v-if="canViewAnswer">
              <text class="qd-answer-text">{{ question.answer }}</text>
              <text v-if="question.answeredAt" class="qd-answered-at">回答于 {{ formatDate(question.answeredAt) }}</text>
              <view v-if="question.rating" class="qd-rating">
                <view class="qd-rating-row">
                  <view class="qd-stars">
                    <app-icon
                      v-for="s in 5" :key="s"
                      name="star" :size="32"
                      :color="s <= question.rating ? '#fbbf24' : '#e5e7eb'"
                    />
                  </view>
                  <text class="qd-rating-label">提问者评价</text>
                </view>
                <text v-if="question.ratingComment" class="qd-rating-comment">{{ question.ratingComment }}</text>
              </view>
              <view v-else-if="isAsker" class="qd-rate-btn" @tap="showRateModal = true"><text class="qd-rate-btn-tx">评价此回答</text></view>
            </view>
            <!-- peek -->
            <view v-else class="qd-peek">
              <view class="qd-peek-icon"><app-icon name="lock" :size="64" color="#c41e3a" /></view>
              <text class="qd-peek-title">付费围观查看答案</text>
              <text class="qd-peek-desc">支付 ¥1 即可查看完整回答</text>
              <view class="qd-peek-btn" @tap="showPeekModal = true"><text class="qd-peek-btn-tx">立即围观</text></view>
            </view>
          </view>
          <!-- pending -->
          <view v-else-if="question.status === 'pending'" class="qd-state">
            <view class="qd-state-icon qd-state-amber"><app-icon name="clock" :size="64" color="#f59e0b" /></view>
            <text class="qd-state-title">等待回答中</text>
            <text class="qd-state-desc">剩余 {{ daysRemaining }} 天过期</text>
          </view>
          <!-- expired -->
          <view v-else-if="question.status === 'expired'" class="qd-state">
            <view class="qd-state-icon qd-state-gray"><app-icon name="clock" :size="64" color="#9ca3af" /></view>
            <text class="qd-state-title">问题已过期</text>
            <text class="qd-state-desc">答主未在规定时间内回答</text>
          </view>
          <!-- refunded -->
          <view v-else class="qd-state">
            <view class="qd-state-icon qd-state-orange"><app-icon name="x-circle" :size="64" color="#f97316" /></view>
            <text class="qd-state-title">已退款</text>
            <text class="qd-state-desc">答主拒绝了此问题</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Peek Users -->
    <view v-if="peekUsers.length && question.status === 'answered'" class="qd-section-x qd-mt">
      <view class="qd-card">
        <view class="qd-peek-users-head">
          <view class="qd-peek-users-title"><app-icon name="eye" :size="32" color="#c41e3a" /><text class="qd-peek-users-title-tx">围观用户</text></view>
          <text class="qd-peek-users-count">{{ peekUsers.length }}人</text>
        </view>
        <view class="qd-peek-avatars">
          <view v-for="u in peekUsers.slice(0, 10)" :key="u.id" class="qd-peek-avatar"><text class="qd-peek-avatar-tx">{{ u.name[0] }}</text></view>
          <view v-if="peekUsers.length > 10" class="qd-peek-more"><text class="qd-peek-more-tx">+{{ peekUsers.length - 10 }}</text></view>
        </view>
      </view>
    </view>

    <!-- Bottom Actions (answerer pending) -->
    <view v-if="isAnswerer && question.status === 'pending'" class="qd-bottom">
      <view class="qd-bottom-reject" @tap="showRejectModal = true"><text class="qd-bottom-reject-tx">拒绝回答</text></view>
      <view class="qd-bottom-answer" @tap="showAnswerModal = true"><text class="qd-bottom-answer-tx">开始回答</text></view>
    </view>

    <!-- Peek Modal -->
    <view v-if="showPeekModal" class="qd-modal-mask" @tap="showPeekModal = false">
      <view class="qd-modal" @tap.stop>
        <text class="qd-modal-title qd-center">确认围观</text>
        <view class="qd-peek-modal-body">
          <text class="qd-peek-modal-price">¥1</text>
          <text class="qd-peek-modal-desc">支付后即可查看完整回答</text>
        </view>
        <view class="qd-modal-actions">
          <view class="qd-modal-cancel" @tap="showPeekModal = false"><text class="qd-modal-cancel-tx">取消</text></view>
          <view class="qd-modal-confirm" @tap="showPeekModal = false"><text class="qd-modal-confirm-tx">确认支付</text></view>
        </view>
      </view>
    </view>

    <!-- Answer Modal -->
    <view v-if="showAnswerModal" class="qd-modal-mask" @tap="showAnswerModal = false">
      <view class="qd-modal" @tap.stop>
        <text class="qd-modal-title">回答问题</text>
        <textarea v-model="answerContent" class="qd-modal-textarea" placeholder="请输入您的回答..." :maxlength="2000" />
        <text class="qd-modal-count">{{ answerContent.length }}/2000</text>
        <view class="qd-modal-actions">
          <view class="qd-modal-cancel" @tap="showAnswerModal = false"><text class="qd-modal-cancel-tx">取消</text></view>
          <view class="qd-modal-confirm" @tap="showAnswerModal = false"><text class="qd-modal-confirm-tx">提交回答</text></view>
        </view>
      </view>
    </view>

    <!-- Reject Modal -->
    <view v-if="showRejectModal" class="qd-modal-mask" @tap="showRejectModal = false">
      <view class="qd-modal" @tap.stop>
        <text class="qd-modal-title">拒绝原因</text>
        <textarea v-model="rejectReason" class="qd-modal-textarea qd-textarea-sm" placeholder="请说明拒绝回答的原因..." />
        <text class="qd-modal-hint">拒绝后，提问者将收到全额退款</text>
        <view class="qd-modal-actions">
          <view class="qd-modal-cancel" @tap="showRejectModal = false"><text class="qd-modal-cancel-tx">取消</text></view>
          <view class="qd-modal-reject" @tap="showRejectModal = false"><text class="qd-modal-confirm-tx">确认拒绝</text></view>
        </view>
      </view>
    </view>

    <!-- Rate Modal -->
    <view v-if="showRateModal" class="qd-modal-mask" @tap="showRateModal = false">
      <view class="qd-modal" @tap.stop>
        <text class="qd-modal-title qd-center">评价回答</text>
        <view class="qd-rate-stars">
          <view v-for="s in 5" :key="s" @tap="rating = s">
            <app-icon name="star" :size="64" :color="s <= rating ? '#fbbf24' : '#e5e7eb'" />
          </view>
        </view>
        <textarea v-model="ratingComment" class="qd-modal-textarea qd-textarea-sm" placeholder="写下您的评价（选填）" />
        <view class="qd-modal-actions">
          <view class="qd-modal-cancel" @tap="showRateModal = false"><text class="qd-modal-cancel-tx">取消</text></view>
          <view class="qd-modal-confirm" @tap="showRateModal = false"><text class="qd-modal-confirm-tx">提交评价</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateBack } from '@/utils/router'

const statusBarHeight = ref(0)
const showPeekModal = ref(false)
const showAnswerModal = ref(false)
const showRejectModal = ref(false)
const showRateModal = ref(false)
const answerContent = ref('')
const rejectReason = ref('')
const rating = ref(5)
const ratingComment = ref('')

// 演示态：已回答 + 已围观（展示完整答案+评价+围观用户）
const isAsker = ref(false)
const isAnswerer = ref(false)
const hasPeeked = ref(true)

const question = ref({
  id: '1',
  title: '八字中的正官与七杀有什么区别？',
  content: '我在学习八字命理时，对正官和七杀的区别不太理解，请问它们在命局中分别代表什么？希望老师能详细讲解一下。',
  price: 50,
  status: 'answered' as 'pending' | 'answered' | 'expired' | 'refunded',
  asker: { id: 'u1', name: '易学新手', avatar: '' },
  answerer: { id: 'a1', name: '张大师', avatar: '', title: '八字命理专家' },
  answer:
    '正官与七杀都是克我者，但性质截然不同。\n\n正官是异性相克，代表正当的约束、规范与责任，主贵气、名誉、地位，是良性的管束力量。\n\n七杀是同性相克，力量更猛烈，代表压力、挑战、竞争与魄力。身强者七杀为用，能成就大事业；身弱者七杀为忌，则需印化或食制。\n\n二者在命局中需结合日主强弱、十神配置综合判断。',
  answeredAt: '2024-01-15T14:30:00Z',
  isPublic: true,
  isPaid: true,
  viewCount: 1280,
  likeCount: 89,
  circleName: '八字命理研究',
  createdAt: '2024-01-15T10:00:00Z',
  expireAt: '2024-01-22T10:00:00Z',
  tags: ['八字', '十神', '正官七杀'],
  rating: 5,
  ratingComment: '讲解非常透彻，受益匪浅，感谢张大师！',
})

const peekUsers = ref([
  { id: 'p1', name: '李四', avatar: '' },
  { id: 'p2', name: '王五', avatar: '' },
  { id: 'p3', name: '赵六', avatar: '' },
  { id: 'p4', name: '钱七', avatar: '' },
  { id: 'p5', name: '孙八', avatar: '' },
])

const canViewAnswer = computed(() => isAsker.value || isAnswerer.value || hasPeeked.value)

const statusMap = {
  answered: { icon: 'check-circle', color: '#22c55e', text: '已回答' },
  expired: { icon: 'clock', color: '#6b7280', text: '已过期' },
  refunded: { icon: 'x-circle', color: '#f97316', text: '已退款' },
  pending: { icon: 'alert-circle', color: '#f59e0b', text: '待回答' },
}
const statusIcon = computed(() => statusMap[question.value.status].icon)
const statusColor = computed(() => statusMap[question.value.status].color)
const statusText = computed(() => statusMap[question.value.status].text)

const daysRemaining = computed(() =>
  Math.ceil((new Date(question.value.expireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
)

const formatDate = (s: string) => {
  const d = new Date(s)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const onBack = () => navigateBack()

onMounted(() => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
})
</script>

<style scoped>
.qd-page {
  min-height: 100vh;
  background-color: #faf8f5;
  padding-bottom: 192rpx;
}
.qd-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: rgba(250, 248, 245, 0.95);
  border-bottom: 1rpx solid #e8e3db;
}
.qd-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
}
.qd-back { margin-left: -8rpx; padding: 8rpx; }
.qd-share { padding: 8rpx; margin-right: -8rpx; }
.qd-header-title { font-size: 30rpx; font-weight: 500; color: #2c2c2c; }
.qd-section { padding: 32rpx; }
.qd-section-x { padding: 0 32rpx; }
.qd-mt { margin-top: 32rpx; }
.qd-card {
  background-color: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.qd-card-x {
  background-color: #ffffff;
  border-radius: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
.qd-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  margin-bottom: 24rpx;
}
.qd-badge-answered { background-color: #f0fdf4; }
.qd-badge-pending { background-color: #fffbeb; }
.qd-badge-expired { background-color: #f9fafb; }
.qd-badge-refunded { background-color: #fff7ed; }
.qd-status-label { font-size: 22rpx; }
.qd-asker {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 32rpx;
}
.qd-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qd-avatar-lg {
  width: 96rpx;
  height: 96rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qd-avatar-red { background: linear-gradient(135deg, #c41e3a, #e85a6b); }
.qd-avatar-gold { background: linear-gradient(135deg, #c9a96e, #dfc296); }
.qd-avatar-tx { font-size: 32rpx; font-weight: 600; color: #ffffff; }
.qd-asker-info { flex: 1; }
.qd-asker-name { font-size: 28rpx; font-weight: 500; color: #2c2c2c; display: block; }
.qd-asker-time { font-size: 22rpx; color: #999999; }
.qd-price-col { text-align: right; }
.qd-price { font-size: 36rpx; font-weight: 700; color: #c41e3a; display: block; }
.qd-price-label { font-size: 22rpx; color: #999999; }
.qd-q-title { font-size: 36rpx; font-weight: 700; color: #2c2c2c; margin-bottom: 16rpx; display: block; }
.qd-q-content { font-size: 28rpx; color: #666666; line-height: 1.6; display: block; }
.qd-tags { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 32rpx; }
.qd-tag { padding: 8rpx 16rpx; background-color: #f5f5f5; border-radius: 999rpx; }
.qd-tag-tx { font-size: 22rpx; color: #666666; }
.qd-q-stats {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid #e8e3db;
}
.qd-stat { display: flex; align-items: center; gap: 8rpx; }
.qd-stat-tx { font-size: 26rpx; color: #999999; }
.qd-answerer {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  border-bottom: 1rpx solid #e8e3db;
  background: linear-gradient(90deg, rgba(196, 30, 58, 0.05), transparent);
}
.qd-answerer-info { flex: 1; }
.qd-answerer-row { display: flex; align-items: center; gap: 16rpx; }
.qd-answerer-name { font-size: 30rpx; font-weight: 700; color: #2c2c2c; }
.qd-answerer-badge { padding: 2rpx 16rpx; background-color: rgba(196, 30, 58, 0.1); border-radius: 999rpx; }
.qd-answerer-badge-tx { font-size: 22rpx; color: #c41e3a; }
.qd-answerer-status { font-size: 22rpx; color: #999999; margin-top: 4rpx; display: block; }
.qd-answer-body { padding: 32rpx; }
.qd-answer-text { font-size: 28rpx; color: #2c2c2c; line-height: 1.7; white-space: pre-wrap; display: block; }
.qd-answered-at { font-size: 22rpx; color: #999999; margin-top: 32rpx; display: block; }
.qd-rating { margin-top: 32rpx; padding-top: 32rpx; border-top: 1rpx solid #e8e3db; }
.qd-rating-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.qd-stars { display: flex; }
.qd-rating-label { font-size: 26rpx; color: #999999; }
.qd-rating-comment { font-size: 26rpx; color: #666666; }
.qd-rate-btn {
  margin-top: 32rpx;
  padding: 16rpx 0;
  border: 1rpx solid #c41e3a;
  border-radius: 24rpx;
  text-align: center;
}
.qd-rate-btn-tx { font-size: 26rpx; font-weight: 500; color: #c41e3a; }
.qd-peek { text-align: center; padding: 64rpx 0; }
.qd-peek-icon {
  width: 128rpx;
  height: 128rpx;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.2), rgba(196, 30, 58, 0.05));
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 32rpx;
}
.qd-peek-title { font-size: 30rpx; font-weight: 500; color: #2c2c2c; margin-bottom: 16rpx; display: block; }
.qd-peek-desc { font-size: 26rpx; color: #999999; margin-bottom: 32rpx; display: block; }
.qd-peek-btn {
  display: inline-block;
  padding: 16rpx 64rpx;
  background: linear-gradient(90deg, #c41e3a, #d94a5f);
  border-radius: 999rpx;
}
.qd-peek-btn-tx { font-size: 26rpx; font-weight: 500; color: #ffffff; }
.qd-state { text-align: center; padding: 64rpx 0; }
.qd-state-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 32rpx;
}
.qd-state-amber { background-color: #fffbeb; }
.qd-state-gray { background-color: #f3f4f6; }
.qd-state-orange { background-color: #fff7ed; }
.qd-state-title { font-size: 30rpx; font-weight: 500; color: #2c2c2c; margin-bottom: 16rpx; display: block; }
.qd-state-desc { font-size: 26rpx; color: #999999; display: block; }
.qd-peek-users-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.qd-peek-users-title { display: flex; align-items: center; gap: 16rpx; }
.qd-peek-users-title-tx { font-size: 28rpx; font-weight: 500; color: #2c2c2c; }
.qd-peek-users-count { font-size: 26rpx; color: #999999; }
.qd-peek-avatars { display: flex; flex-wrap: wrap; gap: 16rpx; }
.qd-peek-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #c9a96e, #dfc296);
  display: flex;
  align-items: center;
  justify-content: center;
}
.qd-peek-avatar-tx { font-size: 24rpx; color: #ffffff; }
.qd-peek-more {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qd-peek-more-tx { font-size: 22rpx; color: #999999; }
.qd-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  border-top: 1rpx solid #e8e3db;
  padding: 24rpx 32rpx;
  display: flex;
  gap: 24rpx;
}
.qd-bottom-reject {
  flex: 1;
  padding: 24rpx 0;
  border: 1rpx solid #e5e7eb;
  border-radius: 24rpx;
  text-align: center;
}
.qd-bottom-reject-tx { font-size: 28rpx; font-weight: 500; color: #2c2c2c; }
.qd-bottom-answer {
  flex: 1;
  padding: 24rpx 0;
  background: linear-gradient(90deg, #c41e3a, #d94a5f);
  border-radius: 24rpx;
  text-align: center;
}
.qd-bottom-answer-tx { font-size: 28rpx; font-weight: 500; color: #ffffff; }
.qd-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.qd-modal {
  position: relative;
  background-color: #ffffff;
  border-radius: 48rpx 48rpx 0 0;
  width: 100%;
  padding: 48rpx;
}
.qd-modal-title { font-size: 30rpx; font-weight: 700; color: #2c2c2c; margin-bottom: 32rpx; display: block; }
.qd-center { text-align: center; }
.qd-peek-modal-body { text-align: center; padding: 32rpx 0; }
.qd-peek-modal-price { font-size: 56rpx; font-weight: 700; color: #c41e3a; margin-bottom: 16rpx; display: block; }
.qd-peek-modal-desc { font-size: 26rpx; color: #999999; }
.qd-modal-textarea {
  width: 100%;
  height: 320rpx;
  padding: 32rpx;
  border: 1rpx solid #e5e7eb;
  border-radius: 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.qd-textarea-sm { height: 192rpx; }
.qd-modal-count { font-size: 22rpx; color: #999999; margin-top: 16rpx; text-align: right; display: block; }
.qd-modal-hint { font-size: 22rpx; color: #999999; margin-top: 16rpx; display: block; }
.qd-modal-actions { display: flex; gap: 24rpx; margin-top: 32rpx; }
.qd-modal-cancel {
  flex: 1;
  padding: 24rpx 0;
  border: 1rpx solid #e5e7eb;
  border-radius: 24rpx;
  text-align: center;
}
.qd-modal-cancel-tx { font-size: 28rpx; font-weight: 500; color: #2c2c2c; }
.qd-modal-confirm {
  flex: 1;
  padding: 24rpx 0;
  background-color: #c41e3a;
  border-radius: 24rpx;
  text-align: center;
}
.qd-modal-reject {
  flex: 1;
  padding: 24rpx 0;
  background-color: #f97316;
  border-radius: 24rpx;
  text-align: center;
}
.qd-modal-confirm-tx { font-size: 28rpx; font-weight: 500; color: #ffffff; }
.qd-rate-stars { display: flex; justify-content: center; gap: 16rpx; margin-bottom: 32rpx; }
</style>
