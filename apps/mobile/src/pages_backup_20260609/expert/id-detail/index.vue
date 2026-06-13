<template>
  <view class="ex-page">
    <!-- 渐变头部 -->
    <view class="hero-bg">
      <view class="hero-nav">
        <text class="hero-back" @click="uni.navigateBack()">‹</text>
        <text class="hero-share" @click="handleShare">📤</text>
      </view>
    </view>

    <!-- 达人信息卡片 -->
    <view class="profile-card">
      <view class="pc-row">
        <view class="pc-avatar-wrap">
          <view class="pc-avatar">{{ expert.name[0] }}</view>
          <view v-if="expert.isOnline" class="pc-dot" />
        </view>
        <view class="pc-info">
          <view class="pc-name-row">
            <text class="pc-name">{{ expert.name }}</text>
            <text v-if="expert.verified" class="pc-verify">V 认证</text>
          </view>
          <text class="pc-title">{{ expert.title }}</text>
          <view class="pc-certs">
            <text v-for="cert in expert.certifications" :key="cert" class="pc-cert">{{ cert }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="body">
      <!-- 数据统计 -->
      <view class="card stats-card">
        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-num">{{ expert.daysJoined }}</text>
            <text class="stat-label">入驻天数</text>
          </view>
          <view class="stat-item">
            <text class="stat-num primary">{{ expert.answeredCount }}</text>
            <text class="stat-label">已解答</text>
          </view>
          <view class="stat-item">
            <text class="stat-num gold">{{ expert.goodRate }}%</text>
            <text class="stat-label">好评率</text>
          </view>
        </view>
        <view class="response-row">
          <text>⏱️ {{ expert.responseTime }}</text>
        </view>
      </view>

      <!-- 个人简介 -->
      <view class="card">
        <text class="section-title">个人简介</text>
        <text class="intro-text">{{ expert.intro }}</text>
        <view class="tag-row">
          <text v-for="tag in expert.tags" :key="tag" class="tag-item">{{ tag }}</text>
        </view>
      </view>

      <!-- 咨询服务 -->
      <view class="card">
        <text class="section-title">咨询服务</text>
        <view class="service-list">
          <view class="sv-item" @click="showQuestionModal = true">
            <view class="sv-icon">💬</view>
            <view class="sv-info">
              <text class="sv-name">图文提问</text>
              <text class="sv-desc">{{ expert.services.textQuestion.description }}</text>
            </view>
            <view class="sv-price">
              <text class="sv-price-num">{{ expert.services.textQuestion.price }}币</text>
              <text class="sv-price-unit">/次</text>
            </view>
          </view>

          <view class="sv-item" @click="openCallModal('voice')">
            <view class="sv-icon gold">📞</view>
            <view class="sv-info">
              <text class="sv-name">音频连麦</text>
              <text class="sv-desc">{{ expert.services.voiceCall.description }}</text>
            </view>
            <view class="sv-price">
              <text class="sv-price-num gold">{{ expert.services.voiceCall.priceRange[0] }}-{{ expert.services.voiceCall.priceRange[1] }}币</text>
              <text class="sv-price-unit">/分钟</text>
            </view>
          </view>

          <view class="sv-item" @click="openCallModal('video')">
            <view class="sv-icon green">📹</view>
            <view class="sv-info">
              <text class="sv-name">视频连麦</text>
              <text class="sv-desc">{{ expert.services.videoCall.description }}</text>
            </view>
            <view class="sv-price">
              <text class="sv-price-num green">{{ expert.services.videoCall.priceRange[0] }}-{{ expert.services.videoCall.priceRange[1] }}币</text>
              <text class="sv-price-unit">/分钟</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 精选问答 -->
      <view v-if="expert.historyQA.length" class="card">
        <view class="section-header">
          <text class="section-title">精选问答</text>
          <text class="section-more">查看全部 ›</text>
        </view>
        <view v-for="qa in expert.historyQA" :key="qa.id" class="qa-item">
          <text class="qa-question">{{ qa.question }}</text>
          <text class="qa-preview">{{ qa.previewAnswer }}</text>
          <view class="qa-bottom">
            <text class="qa-views">{{ qa.viewCount }}人围观</text>
            <text class="qa-peek">{{ qa.price }}币围观</text>
          </view>
        </view>
      </view>

      <!-- 用户评价 -->
      <view class="card">
        <view class="section-header">
          <text class="section-title">用户评价</text>
          <view class="rating-summary">
            <text class="rs-star">⭐ 4.9</text>
            <text class="rs-count">({{ expert.reviews.length }}条)</text>
          </view>
        </view>
        <view v-for="rv in expert.reviews" :key="rv.id" class="review-item">
          <view class="rv-top">
            <view class="rv-user">
              <text class="rv-avatar">{{ rv.user[0] }}</text>
              <text class="rv-name">{{ rv.user }}</text>
            </view>
            <text class="rv-stars">{{ '⭐'.repeat(rv.rating) }}</text>
          </view>
          <text class="rv-content">{{ rv.content }}</text>
          <view class="rv-bottom">
            <text class="rv-time">{{ rv.time }}</text>
            <text class="rv-helpful">👍 有帮助({{ rv.helpful }})</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部占位 -->
    <view style="height: 140rpx" />

    <!-- 底部固定操作栏 -->
    <view class="bottom-bar">
      <view class="bb-question" @click="showQuestionModal = true">
        <text>💬 向TA提问</text>
      </view>
      <view class="bb-call" @click="openCallModal('voice')">
        <text>📞 立即连麦</text>
      </view>
    </view>

    <!-- 提问弹窗 -->
    <view v-if="showQuestionModal" class="modal-mask" @click="showQuestionModal = false">
      <view class="modal" @click.stop>
        <view class="modal-header">
          <text class="mh-cancel" @click="showQuestionModal = false">取消</text>
          <text class="mh-title">向{{ expert.name }}提问</text>
          <view class="mh-spacer" />
        </view>
        <view class="modal-body">
          <view class="mb-field">
            <text class="mb-label">问题标题 *</text>
            <input v-model="questionTitle" class="mb-input" placeholder="简要描述你的问题" maxlength="50" />
            <text class="mb-count">{{ questionTitle.length }}/50</text>
          </view>
          <view class="mb-field">
            <text class="mb-label">详细描述</text>
            <textarea v-model="questionContent" class="mb-textarea" placeholder="补充出生信息、具体问题等，越详细回答越精准..." maxlength="500" />
            <text class="mb-count">{{ questionContent.length }}/500</text>
          </view>
          <view class="mb-field">
            <text class="mb-label">上传图片（选填）</text>
            <view class="mb-upload">
              <text>🖼️ 添加图片</text>
            </view>
          </view>
          <view class="mb-price-card">
            <view class="mb-price-row">
              <text class="mb-price-label">提问费用</text>
              <text class="mb-price-num">{{ expert.services.textQuestion.price }} 国学币</text>
            </view>
            <text class="mb-price-desc">支付后问题将发送给{{ expert.name }}，通常24小时内回复</text>
          </view>
        </view>
        <view class="modal-footer">
          <view class="mf-submit" :class="{ disabled: !questionTitle.trim() || isSubmitting }" @click="handleSubmitQuestion">
            <text>{{ isSubmitting ? '支付中...' : '确认支付并提问' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 连麦弹窗 -->
    <view v-if="showCallModal" class="modal-mask" @click="showCallModal = false">
      <view class="modal" @click.stop>
        <view class="modal-header">
          <text class="mh-cancel" @click="showCallModal = false">取消</text>
          <text class="mh-title">{{ callType === 'voice' ? '音频' : '视频' }}连麦</text>
          <view class="mh-spacer" />
        </view>
        <view class="modal-body">
          <view class="call-type-row">
            <view class="ct-item" :class="{ active: callType === 'voice' }" @click="callType = 'voice'">
              <text>音频连麦</text>
            </view>
            <view class="ct-item" :class="{ active: callType === 'video' }" @click="callType = 'video'">
              <text>视频连麦</text>
            </view>
          </view>
          <view class="mb-field">
            <text class="mb-label">选择通话时长</text>
            <view class="duration-grid">
              <view v-for="d in expert.callDurations" :key="d" class="dur-item" :class="{ active: selectedDuration === d }" @click="selectedDuration = d">
                <text>{{ d }}分钟</text>
              </view>
            </view>
          </view>
          <view class="call-price-card">
            <view class="cpc-row">
              <text class="cpc-label">单价</text>
              <text class="cpc-value">{{ callPriceRange[0] }}-{{ callPriceRange[1] }} 币/分钟</text>
            </view>
            <view class="cpc-row">
              <text class="cpc-label">时长</text>
              <text class="cpc-value">{{ selectedDuration }} 分钟</text>
            </view>
            <view class="cpc-row total">
              <text class="cpc-label">预计费用</text>
              <text class="cpc-price">{{ callPriceMin }}-{{ callPriceMax }} 币</text>
            </view>
          </view>
          <text class="call-notice">实际费用按通话时长计算，超时部分按分钟收费</text>
        </view>
        <view class="modal-footer">
          <view class="mf-submit call" :class="{ voice: callType === 'voice', video: callType === 'video' }">
            <text>{{ expert.isOnline ? '立即发起连麦' : '预约连麦时间' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const expert = {
  id: 1, name: '周易大师', avatar: '', title: '资深命理师', verified: true,
  certifications: ['平台认证讲师', '八字命理专家'],
  intro: '从事命理研究20余年，师承多位名家，擅长八字精批、流年运势、婚姻感情、事业财运分析。已为超过5000位缘主提供咨询服务，好评如潮。',
  daysJoined: 365, answeredCount: 1280, goodRate: 98,
  responseTime: '通常1小时内回复',
  tags: ['八字精批', '流年运势', '婚姻感情', '事业财运', '起名改名'],
  services: {
    textQuestion: { price: 30, unit: '次', description: '文字/图文提问，24小时内回复' },
    voiceCall: { priceRange: [10, 40], unit: '分钟', description: '实时音频连麦，即问即答' },
    videoCall: { priceRange: [20, 60], unit: '分钟', description: '视频连麦，面对面交流' },
  },
  callDurations: [15, 30, 45, 60],
  reviews: [
    { id: 1, user: '匿***', avatar: '', rating: 5, content: '大师分析得很准确，对我今年的运势讲解很详细，还给了很多建议，非常感谢！', time: '3天前', helpful: 28 },
    { id: 2, user: '缘***', avatar: '', rating: 5, content: '连麦咨询体验很好，大师很有耐心，解答了我很多疑惑，物超所值。', time: '1周前', helpful: 45 },
    { id: 3, user: '易***', avatar: '', rating: 5, content: '八字分析专业，指出了我命中的一些问题，还给了化解方法，非常实用。', time: '2周前', helpful: 32 },
    { id: 4, user: '道***', avatar: '', rating: 4, content: '回复很快，分析也很到位，就是希望能更详细一些。', time: '3周前', helpful: 15 },
  ],
  historyQA: [
    { id: 1, question: '1995年农历五月初五出生，今年事业运势如何？', previewAnswer: '从你的八字来看，今年事业方面会有不错的机遇...', viewCount: 156, price: 1 },
    { id: 2, question: '最近感情不顺，想问问什么时候能遇到正缘？', previewAnswer: '根据你的命盘，感情宫位显示...', viewCount: 203, price: 1 },
  ],
  isOnline: true,
}

const showQuestionModal = ref(false)
const showCallModal = ref(false)
const callType = ref<'voice' | 'video'>('voice')
const questionTitle = ref('')
const questionContent = ref('')
const selectedDuration = ref(30)
const isSubmitting = ref(false)

const callPriceRange = computed(() => {
  const svc = callType.value === 'voice' ? expert.services.voiceCall : expert.services.videoCall
  return svc.priceRange
})

const callPriceMin = computed(() => callPriceRange.value[0] * selectedDuration.value)
const callPriceMax = computed(() => callPriceRange.value[1] * selectedDuration.value)

function openCallModal(type: 'voice' | 'video') {
  callType.value = type
  showCallModal.value = true
}

function handleSubmitQuestion() {
  if (!questionTitle.value.trim()) return
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    showQuestionModal.value = false
    questionTitle.value = ''
    questionContent.value = ''
    uni.showToast({ title: '提问成功', icon: 'success' })
  }, 1500)
}

function handleShare() { uni.showToast({ title: '分享功能', icon: 'none' }) }
</script>

<style scoped>
.ex-page { min-height: 100vh; background: #FAF8F5; }

.hero-bg { height: 250rpx; background: linear-gradient(135deg, #C41E3A, #E8544E, #F0A030); position: relative; }
.hero-nav { display: flex; justify-content: space-between; padding: 10rpx 24rpx; height: 80rpx; align-items: center; }
.hero-back { font-size: 48rpx; color: #fff; width: 56rpx; }
.hero-share { font-size: 32rpx; color: #fff; width: 56rpx; text-align: center; }

.profile-card { margin: -60rpx 24rpx 0; background: #fff; border-radius: 16rpx; padding: 24rpx; position: relative; z-index: 2; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); }
.pc-row { display: flex; gap: 16rpx; }
.pc-avatar-wrap { position: relative; flex-shrink: 0; }
.pc-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 40rpx; color: #C41E3A; }
.pc-dot { position: absolute; bottom: 4rpx; right: 4rpx; width: 22rpx; height: 22rpx; border-radius: 50%; background: #52C41A; border: 3rpx solid #fff; }
.pc-info { flex: 1; }
.pc-name-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 4rpx; }
.pc-name { font-size: 30rpx; font-weight: 700; color: #333; }
.pc-verify { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: rgba(240,160,48,0.15); color: #F0A030; }
.pc-title { font-size: 22rpx; color: #999; display: block; }
.pc-certs { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 10rpx; }
.pc-cert { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 4rpx; border: 1px solid rgba(196,30,58,0.2); color: #C41E3A; }

.body { padding: 20rpx 24rpx; display: flex; flex-direction: column; gap: 16rpx; }

.card { background: #fff; border-radius: 16rpx; padding: 24rpx; }

.stats-card { text-align: center; }
.stats-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16rpx; }
.stat-num { font-size: 36rpx; font-weight: 700; color: #333; display: block; }
.stat-num.primary { color: #C41E3A; }
.stat-num.gold { color: #C9A96E; }
.stat-label { font-size: 20rpx; color: #999; }
.response-row { margin-top: 16rpx; padding-top: 16rpx; border-top: 1px solid #F5F1EB; }
.response-row text { font-size: 22rpx; color: #999; }

.section-title { font-size: 26rpx; font-weight: 600; color: #333; display: block; margin-bottom: 14rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.section-more { font-size: 22rpx; color: #BBB; }

.intro-text { font-size: 24rpx; color: #666; line-height: 1.7; display: block; }
.tag-row { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 16rpx; }
.tag-item { font-size: 20rpx; padding: 6rpx 14rpx; border-radius: 8rpx; background: #F5F1EB; color: #555; }

.service-list { display: flex; flex-direction: column; gap: 14rpx; }
.sv-item { display: flex; align-items: center; gap: 14rpx; padding: 16rpx; border-radius: 14rpx; background: #FAF8F5; }
.sv-icon { width: 60rpx; height: 60rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 28rpx; flex-shrink: 0; }
.sv-icon.gold { background: rgba(201,169,110,0.1); }
.sv-icon.green { background: rgba(82,196,26,0.1); }
.sv-info { flex: 1; min-width: 0; }
.sv-name { font-size: 24rpx; font-weight: 500; color: #333; display: block; }
.sv-desc { font-size: 20rpx; color: #999; }
.sv-price { text-align: right; flex-shrink: 0; }
.sv-price-num { font-size: 28rpx; font-weight: 700; color: #C41E3A; display: block; }
.sv-price-num.gold { color: #C9A96E; }
.sv-price-num.green { color: #52C41A; }
.sv-price-unit { font-size: 18rpx; color: #BBB; }

.qa-item { padding: 16rpx; border-radius: 12rpx; background: #FAF8F5; margin-bottom: 12rpx; }
.qa-item:last-child { margin-bottom: 0; }
.qa-question { font-size: 24rpx; font-weight: 500; color: #333; display: block; margin-bottom: 8rpx; }
.qa-preview { font-size: 22rpx; color: #999; display: block; margin-bottom: 10rpx; filter: blur(1px); }
.qa-bottom { display: flex; justify-content: space-between; }
.qa-views { font-size: 18rpx; color: #BBB; }
.qa-peek { font-size: 20rpx; color: #C9A96E; }

.rating-summary { display: flex; align-items: center; gap: 6rpx; }
.rs-star { font-size: 24rpx; color: #333; font-weight: 500; }
.rs-count { font-size: 22rpx; color: #BBB; }

.review-item { padding: 16rpx 0; border-bottom: 1px solid #F5F1EB; }
.review-item:last-child { border-bottom: none; }
.rv-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; }
.rv-user { display: flex; align-items: center; gap: 10rpx; }
.rv-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 18rpx; color: #666; }
.rv-name { font-size: 24rpx; color: #333; }
.rv-stars { font-size: 20rpx; }
.rv-content { font-size: 24rpx; color: #666; line-height: 1.6; display: block; margin-bottom: 8rpx; }
.rv-bottom { display: flex; justify-content: space-between; }
.rv-time { font-size: 18rpx; color: #CCC; }
.rv-helpful { font-size: 18rpx; color: #BBB; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #E8E0D5; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); display: flex; gap: 16rpx; z-index: 30; }
.bb-question { flex: 1; padding: 22rpx; border-radius: 14rpx; background: #F5F1EB; text-align: center; }
.bb-question text { font-size: 26rpx; color: #333; }
.bb-call { flex: 1; padding: 22rpx; border-radius: 14rpx; background: #C41E3A; text-align: center; }
.bb-call text { font-size: 26rpx; color: #fff; font-weight: 500; }

.modal-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; }
.modal { background: #fff; border-radius: 28rpx 28rpx 0 0; width: 100%; max-width: 600rpx; max-height: 85vh; display: flex; flex-direction: column; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; border-bottom: 1px solid #E8E0D5; flex-shrink: 0; }
.mh-cancel { font-size: 26rpx; color: #999; }
.mh-title { font-size: 28rpx; font-weight: 600; color: #333; }
.mh-spacer { width: 60rpx; }
.modal-body { flex: 1; overflow-y: auto; padding: 20rpx 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.modal-footer { padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); border-top: 1px solid #E8E0D5; flex-shrink: 0; }

.mb-field { }
.mb-label { font-size: 24rpx; color: #666; display: block; margin-bottom: 10rpx; }
.mb-input { width: 100%; height: 72rpx; padding: 0 16rpx; border-radius: 12rpx; background: #F5F1EB; font-size: 24rpx; color: #333; box-sizing: border-box; }
.mb-textarea { width: 100%; height: 150rpx; padding: 16rpx; border-radius: 12rpx; background: #F5F1EB; font-size: 24rpx; color: #333; box-sizing: border-box; }
.mb-count { font-size: 18rpx; color: #BBB; text-align: right; display: block; margin-top: 6rpx; }
.mb-upload { width: 120rpx; height: 120rpx; border-radius: 14rpx; border: 2rpx dashed #E8E0D5; display: flex; align-items: center; justify-content: center; }
.mb-upload text { font-size: 22rpx; color: #999; }

.mb-price-card { background: rgba(201,169,110,0.06); border-radius: 14rpx; padding: 16rpx; }
.mb-price-row { display: flex; justify-content: space-between; align-items: center; }
.mb-price-label { font-size: 24rpx; color: #333; }
.mb-price-num { font-size: 28rpx; font-weight: 700; color: #C9A96E; }
.mb-price-desc { font-size: 18rpx; color: #BBB; display: block; margin-top: 6rpx; }

.mf-submit { padding: 24rpx; border-radius: 16rpx; background: #C41E3A; text-align: center; }
.mf-submit.disabled { background: #F5F1EB; }
.mf-submit text { font-size: 28rpx; font-weight: 600; color: #fff; }
.mf-submit.disabled text { color: #BBB; }
.mf-submit.call.voice { background: #C9A96E; }

.call-type-row { display: flex; gap: 12rpx; }
.ct-item { flex: 1; padding: 20rpx; border-radius: 14rpx; background: #F5F1EB; text-align: center; }
.ct-item text { font-size: 26rpx; color: #666; font-weight: 500; }
.ct-item.active { background: #C9A96E; }
.ct-item.active text { color: #fff; }

.duration-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; }
.dur-item { padding: 16rpx; border-radius: 12rpx; background: #F5F1EB; text-align: center; }
.dur-item text { font-size: 24rpx; color: #333; }
.dur-item.active { background: #C9A96E; }
.dur-item.active text { color: #fff; }

.call-price-card { background: #FAF8F5; border-radius: 14rpx; padding: 20rpx; }
.cpc-row { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.cpc-row.total { margin-bottom: 0; padding-top: 12rpx; border-top: 1px solid #E8E0D5; }
.cpc-label { font-size: 24rpx; color: #999; }
.cpc-value { font-size: 24rpx; color: #333; }
.cpc-price { font-size: 32rpx; font-weight: 700; color: #C9A96E; }

.call-notice { font-size: 18rpx; color: #BBB; text-align: center; }
</style>
