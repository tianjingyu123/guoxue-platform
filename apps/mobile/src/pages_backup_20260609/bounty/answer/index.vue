<template>
  <view class="ba-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">回答悬赏</text>
        <text class="header-count">{{ content.length }}/2000</text>
      </view>
    </view>

    <view class="ba-body">
      <view class="bounty-ref-card">
        <view class="brc-top">
          <view class="brc-amount">
            <text class="brc-icon">🎁</text>
            <text class="brc-price">¥{{ bounty.amount }}</text>
          </view>
          <view class="brc-time">
            <text>⏰ 剩余 {{ remainingTime }}</text>
          </view>
        </view>
        <text class="brc-title">{{ bounty.title }}</text>
        <text class="brc-desc">{{ bounty.description }}</text>
        <view class="brc-footer">
          <view class="brc-avatar">{{ bounty.poster.name[0] }}</view>
          <text class="brc-poster">{{ bounty.poster.name }} 发布</text>
          <text class="brc-dot">·</text>
          <text class="brc-count">{{ bounty.answerCount }} 人已回答</text>
        </view>
      </view>

      <view class="answer-card">
        <view class="ac-title">✏️ 我的回答</view>
        <textarea v-model="content" class="ac-textarea" placeholder="请输入您的回答，至少20字...

提示：详细、专业的回答更容易被采纳获得悬赏" maxlength="2000" />
        <view class="ac-images">
          <view class="ac-img-label">🖼️ 添加配图（选填，最多9张）</view>
          <view class="ac-img-row">
            <view v-for="(_, i) in images" :key="i" class="ac-img-item">
              <text>🖼️</text>
              <view class="ac-img-del" @click="removeImage(i)">✕</view>
            </view>
            <view v-if="images.length < 9" class="ac-img-add" @click="addImage">
              <text>📷</text>
              <text class="ac-img-count">{{ images.length }}/9</text>
            </view>
          </view>
        </view>
      </view>

      <view class="tips-card">
        <text class="tips-title">回答提示</text>
        <text class="tips-item">• 请认真回答问题，详细、专业的回答更容易被采纳</text>
        <text class="tips-item">• 回答被采纳后，您将获得全部悬赏金额</text>
        <text class="tips-item">• 如有多人回答，发布者将选择最佳答案采纳</text>
        <text class="tips-item">• 禁止发布违规内容，违者将被封禁</text>
      </view>

      <view v-if="error" class="error-card">
        <text>⚠️ {{ error }}</text>
      </view>
    </view>

    <view class="bottom-bar">
      <view class="bb-info">
        <text class="bb-word-count">回答字数：<text :class="content.length < 20 ? 'red' : 'green'">{{ content.length }}</text>/2000</text>
        <text class="bb-reward">可获悬赏：<text class="gold">¥{{ bounty.amount }}</text></text>
      </view>
      <view class="bb-submit" :class="{ disabled: submitting || content.length < 20 }" @click="handleSubmit">
        <text v-if="submitting">提交中...</text>
        <text v-else>✈️ 提交回答</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const bounty = ref({
  id: '1', title: '如何理解《易经》中的乾卦与坤卦的关系？',
  description: '最近在学习易经，对于乾卦和坤卦的关系有些困惑，希望有大师能够详细解答一下这两卦之间的联系和区别。',
  amount: 100, status: 'open',
  poster: { id: '1', name: '学易新手', avatar: '' },
  answerCount: 3, expireAt: '2024-01-22T10:00:00Z',
})
const content = ref('')
const images = ref<string[]>([])
const submitting = ref(false)
const error = ref('')

const remainingTime = computed(() => {
  const diff = new Date(bounty.value.expireAt).getTime() - Date.now()
  if (diff <= 0) return '已截止'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days}天${hours}小时`
  return `${hours}小时`
})

function addImage() {
  if (images.value.length < 9) images.value.push(`img_${Date.now()}`)
}
function removeImage(i: number) { images.value.splice(i, 1) }

function handleSubmit() {
  if (!content.value.trim()) { error.value = '请输入回答内容'; return }
  if (content.value.length < 20) { error.value = '回答内容至少20字'; return }
  submitting.value = true
  error.value = ''
  setTimeout(() => {
    submitting.value = false
    uni.showToast({ title: '提交成功', icon: 'success' })
    uni.navigateBack()
  }, 1000)
}
</script>

<style scoped>
.ba-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 160rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.header-count { font-size: 22rpx; color: #999; }

.ba-body { padding: 24rpx; }

.bounty-ref-card { background: linear-gradient(135deg, #FFFBF0, #FFF5E6); border-radius: 16rpx; padding: 20rpx; border: 1px solid #F5E6C8; margin-bottom: 20rpx; }
.brc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.brc-amount { display: flex; align-items: center; gap: 8rpx; }
.brc-icon { font-size: 28rpx; }
.brc-price { font-size: 36rpx; font-weight: 700; color: #C9A96E; }
.brc-time { font-size: 22rpx; color: #C9A96E; }
.brc-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-bottom: 8rpx; }
.brc-desc { font-size: 24rpx; color: #666; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; margin-bottom: 14rpx; }
.brc-footer { display: flex; align-items: center; gap: 8rpx; }
.brc-avatar { width: 36rpx; height: 36rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 18rpx; color: #C41E3A; }
.brc-poster, .brc-count { font-size: 20rpx; color: #999; }
.brc-dot { color: #E8E0D5; }

.answer-card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 20rpx; }
.ac-title { font-size: 26rpx; font-weight: 600; color: #333; margin-bottom: 14rpx; }
.ac-textarea { width: 100%; height: 280rpx; background: #FAF8F5; border-radius: 14rpx; padding: 16rpx 18rpx; font-size: 24rpx; color: #333; box-sizing: border-box; }
.ac-images { margin-top: 16rpx; }
.ac-img-label { font-size: 22rpx; color: #999; margin-bottom: 10rpx; }
.ac-img-row { display: flex; flex-wrap: wrap; gap: 10rpx; }
.ac-img-item { width: 110rpx; height: 110rpx; border-radius: 10rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 36rpx; position: relative; }
.ac-img-del { position: absolute; top: -6rpx; right: -6rpx; width: 28rpx; height: 28rpx; border-radius: 50%; background: #333; color: #fff; font-size: 16rpx; display: flex; align-items: center; justify-content: center; }
.ac-img-add { width: 110rpx; height: 110rpx; border-radius: 10rpx; border: 2px dashed #E8E0D5; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 32rpx; }
.ac-img-count { font-size: 18rpx; color: #999; }

.tips-card { background: #F0F7FF; border-radius: 14rpx; padding: 16rpx 20rpx; margin-bottom: 20rpx; }
.tips-title { font-size: 24rpx; font-weight: 600; color: #2E6DB4; display: block; margin-bottom: 8rpx; }
.tips-item { font-size: 20rpx; color: #2E6DB4; opacity: 0.85; display: block; line-height: 1.6; }

.error-card { background: #FFF1F0; border-radius: 14rpx; padding: 14rpx 18rpx; }
.error-card text { font-size: 22rpx; color: #FF4D4F; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #E8E0D5; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); }
.bb-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.bb-word-count { font-size: 22rpx; color: #999; }
.red { color: #FF4D4F !important; }
.green { color: #52C41A !important; }
.bb-reward { font-size: 24rpx; color: #333; }
.gold { color: #C9A96E; font-weight: 700; }
.bb-submit { background: linear-gradient(90deg, #F0A030, #E89020); border-radius: 16rpx; padding: 22rpx; text-align: center; }
.bb-submit text { font-size: 30rpx; font-weight: 600; color: #fff; }
.bb-submit.disabled { opacity: 0.5; }
</style>
