<template>
  <view class="ed-page">
    <!-- 顶部背景和返回 -->
    <view class="ed-hero">
      <view class="ed-hero-bg" />
      <view class="ed-hero-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="ed-nav-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="36" color="#FFFFFF" />
        </view>
        <view class="ed-nav-btn" @tap="onShare">
          <app-icon name="share-2" :size="34" color="#FFFFFF" />
        </view>
      </view>

      <!-- 达人信息卡片 -->
      <view class="ed-profile-card">
        <view class="ed-profile-top">
          <view class="ed-avatar-wrap">
            <view class="ed-avatar">{{ expert.name[0] }}</view>
            <view v-if="expert.isOnline" class="ed-online-dot" />
          </view>
          <view class="ed-profile-info">
            <view class="ed-name-row">
              <text class="ed-name">{{ expert.name }}</text>
              <view v-if="expert.verified" class="ed-verified">
                <app-icon name="check-circle" :size="22" color="#C9A96E" />
                <text>认证</text>
              </view>
            </view>
            <text class="ed-title">{{ expert.title }}</text>
            <view class="ed-certs">
              <view v-for="cert in expert.certifications" :key="cert" class="ed-cert">{{ cert }}</view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 主内容 -->
    <view class="ed-body">
      <!-- 数据统计 -->
      <view class="ed-card">
        <view class="ed-stats">
          <view class="ed-stat">
            <text class="ed-stat-num">{{ expert.daysJoined }}</text>
            <text class="ed-stat-label">入驻天数</text>
          </view>
          <view class="ed-stat">
            <text class="ed-stat-num ed-num-primary">{{ expert.answeredCount }}</text>
            <text class="ed-stat-label">已解答</text>
          </view>
          <view class="ed-stat">
            <text class="ed-stat-num ed-num-accent">{{ expert.goodRate }}%</text>
            <text class="ed-stat-label">好评率</text>
          </view>
        </view>
        <view class="ed-response">
          <app-icon name="clock" :size="26" color="#999999" />
          <text class="ed-response-text">{{ expert.responseTime }}</text>
        </view>
      </view>

      <!-- 个人简介 -->
      <view class="ed-card">
        <text class="ed-section-title">个人简介</text>
        <text class="ed-intro">{{ expert.intro }}</text>
        <view class="ed-tags">
          <view v-for="tag in expert.tags" :key="tag" class="ed-tag">{{ tag }}</view>
        </view>
      </view>

      <!-- 咨询服务 -->
      <view class="ed-card">
        <text class="ed-section-title">咨询服务</text>
        <view class="ed-services">
          <view class="ed-service" @tap="openQuestion">
            <view class="ed-service-left">
              <view class="ed-service-icon ed-icon-primary">
                <app-icon name="message-circle" :size="36" color="#C41E3A" />
              </view>
              <view>
                <text class="ed-service-name">图文提问</text>
                <text class="ed-service-desc">{{ expert.services.textQuestion.description }}</text>
              </view>
            </view>
            <view class="ed-service-price">
              <text class="ed-price-primary">{{ expert.services.textQuestion.price }}币</text>
              <text class="ed-price-unit">/{{ expert.services.textQuestion.unit }}</text>
            </view>
          </view>

          <view class="ed-service" @tap="openCall('voice')">
            <view class="ed-service-left">
              <view class="ed-service-icon ed-icon-accent">
                <app-icon name="phone" :size="36" color="#C9A96E" />
              </view>
              <view>
                <text class="ed-service-name">音频连麦</text>
                <text class="ed-service-desc">{{ expert.services.voiceCall.description }}</text>
              </view>
            </view>
            <view class="ed-service-price">
              <text class="ed-price-accent">{{ expert.services.voiceCall.priceRange[0] }}-{{ expert.services.voiceCall.priceRange[1] }}币</text>
              <text class="ed-price-unit">/{{ expert.services.voiceCall.unit }}</text>
            </view>
          </view>

          <view class="ed-service" @tap="openCall('video')">
            <view class="ed-service-left">
              <view class="ed-service-icon ed-icon-green">
                <app-icon name="sparkles" :size="36" color="#22C55E" />
              </view>
              <view>
                <text class="ed-service-name">视频连麦</text>
                <text class="ed-service-desc">{{ expert.services.videoCall.description }}</text>
              </view>
            </view>
            <view class="ed-service-price">
              <text class="ed-price-green">{{ expert.services.videoCall.priceRange[0] }}-{{ expert.services.videoCall.priceRange[1] }}币</text>
              <text class="ed-price-unit">/{{ expert.services.videoCall.unit }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 精选问答 -->
      <view v-if="expert.historyQA.length > 0" class="ed-card">
        <view class="ed-section-head">
          <text class="ed-section-title ed-no-mb">精选问答</text>
          <view class="ed-view-all" @tap="onViewAllQA">
            <text>查看全部</text>
            <app-icon name="chevron-right" :size="24" color="#C41E3A" />
          </view>
        </view>
        <view class="ed-qa-list">
          <view v-for="qa in expert.historyQA" :key="qa.id" class="ed-qa">
            <text class="ed-qa-q">{{ qa.question }}</text>
            <text class="ed-qa-a">{{ qa.previewAnswer }}</text>
            <view class="ed-qa-foot">
              <text class="ed-qa-views">{{ qa.viewCount }}人围观</text>
              <view class="ed-qa-btn">{{ qa.price }}币围观</view>
            </view>
          </view>
        </view>
      </view>

      <!-- 用户评价 -->
      <view class="ed-card">
        <view class="ed-section-head">
          <text class="ed-section-title ed-no-mb">用户评价</text>
          <view class="ed-rating-sum">
            <app-icon name="star" :size="28" color="#C9A96E" />
            <text class="ed-rating-num">4.9</text>
            <text class="ed-rating-cnt">({{ expert.reviews.length }}条)</text>
          </view>
        </view>
        <view class="ed-reviews">
          <view v-for="review in expert.reviews" :key="review.id" class="ed-review">
            <view class="ed-review-head">
              <view class="ed-review-user">
                <view class="ed-review-avatar">{{ review.user[0] }}</view>
                <text class="ed-review-name">{{ review.user }}</text>
              </view>
              <view class="ed-review-stars">
                <app-icon
                  v-for="i in 5"
                  :key="i"
                  name="star"
                  :size="24"
                  :color="i <= review.rating ? '#C9A96E' : '#DDDDDD'"
                />
              </view>
            </view>
            <text class="ed-review-content">{{ review.content }}</text>
            <view class="ed-review-foot">
              <text class="ed-review-time">{{ review.time }}</text>
              <view class="ed-review-helpful">
                <app-icon name="thumbs-up" :size="24" color="#999999" />
                <text>有帮助({{ review.helpful }})</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部固定操作栏 -->
    <view class="ed-footer">
      <view class="ed-foot-ask" @tap="openQuestion">
        <app-icon name="message-circle" :size="32" color="#2C2C2C" />
        <text>向TA提问</text>
      </view>
      <view class="ed-foot-call" @tap="openCall('voice')">
        <app-icon name="phone" :size="32" color="#FFFFFF" />
        <text>立即连麦</text>
      </view>
    </view>

    <!-- 提问弹窗 -->
    <view v-if="showQuestionModal" class="ed-modal-mask">
      <view class="ed-sheet">
        <view class="ed-sheet-head">
          <text class="ed-sheet-cancel" @tap="showQuestionModal = false">取消</text>
          <text class="ed-sheet-title">向{{ expert.name }}提问</text>
          <view class="ed-sheet-spacer" />
        </view>
        <view class="ed-sheet-body">
          <view class="ed-field">
            <text class="ed-field-label">问题标题 *</text>
            <input
              v-model="questionTitle"
              class="ed-input"
              type="text"
              placeholder="简要描述你的问题"
              placeholder-class="ed-ph"
              :maxlength="50"
            />
            <text class="ed-count">{{ questionTitle.length }}/50</text>
          </view>
          <view class="ed-field">
            <text class="ed-field-label">详细描述</text>
            <textarea
              v-model="questionContent"
              class="ed-textarea"
              placeholder="补充出生信息、具体问题等，越详细回答越精准..."
              placeholder-class="ed-ph"
              :maxlength="500"
            />
            <text class="ed-count">{{ questionContent.length }}/500</text>
          </view>
          <view class="ed-field">
            <text class="ed-field-label">上传图片（选填）</text>
            <view class="ed-upload">
              <app-icon name="image" :size="40" color="#999999" />
              <text class="ed-upload-text">添加图片</text>
            </view>
          </view>
          <view class="ed-fee-card">
            <view class="ed-fee-row">
              <text class="ed-fee-label">提问费用</text>
              <text class="ed-fee-val">{{ expert.services.textQuestion.price }} 国学币</text>
            </view>
            <text class="ed-fee-note">支付后问题将发送给{{ expert.name }}，通常24小时内回复</text>
          </view>
        </view>
        <view class="ed-sheet-foot">
          <view
            class="ed-submit"
            :class="{ 'ed-submit--disabled': !questionTitle.trim() || isSubmitting }"
            @tap="handleSubmitQuestion"
          >
            <template v-if="isSubmitting">
              <text>支付中...</text>
            </template>
            <template v-else>
              <app-icon name="send" :size="30" :color="questionTitle.trim() ? '#FFFFFF' : '#999999'" />
              <text>确认支付并提问</text>
            </template>
          </view>
        </view>
      </view>
    </view>

    <!-- 连麦弹窗 -->
    <view v-if="showCallModal" class="ed-modal-mask">
      <view class="ed-sheet">
        <view class="ed-sheet-head">
          <text class="ed-sheet-cancel" @tap="showCallModal = false">取消</text>
          <text class="ed-sheet-title">{{ callType === 'voice' ? '音频' : '视频' }}连麦</text>
          <view class="ed-sheet-spacer" />
        </view>
        <view class="ed-sheet-body">
          <!-- 连麦类型切换 -->
          <view class="ed-call-types">
            <view
              class="ed-call-type"
              :class="callType === 'voice' ? 'ed-call-type--voice' : ''"
              @tap="callType = 'voice'"
            >
              音频连麦
            </view>
            <view
              class="ed-call-type"
              :class="callType === 'video' ? 'ed-call-type--video' : ''"
              @tap="callType = 'video'"
            >
              视频连麦
            </view>
          </view>
          <!-- 时长选择 -->
          <view class="ed-field">
            <text class="ed-field-label">选择通话时长</text>
            <view class="ed-durations">
              <view
                v-for="d in expert.callDurations"
                :key="d"
                class="ed-duration"
                :class="selectedDuration === d ? (callType === 'voice' ? 'ed-dur--voice' : 'ed-dur--video') : ''"
                @tap="selectedDuration = d"
              >
                {{ d }}分钟
              </view>
            </view>
          </view>
          <!-- 价格说明 -->
          <view class="ed-call-fee">
            <view class="ed-fee-line">
              <text class="ed-fee-line-label">单价</text>
              <text class="ed-fee-line-val">{{ callPrice.perMinute[0] }}-{{ callPrice.perMinute[1] }} 币/分钟</text>
            </view>
            <view class="ed-fee-line">
              <text class="ed-fee-line-label">时长</text>
              <text class="ed-fee-line-val">{{ selectedDuration }} 分钟</text>
            </view>
            <view class="ed-fee-total">
              <text class="ed-fee-total-label">预计费用</text>
              <text class="ed-fee-total-val" :class="callType === 'voice' ? 'ed-total-accent' : 'ed-total-green'">
                {{ callPrice.min }}-{{ callPrice.max }} 币
              </text>
            </view>
          </view>
          <text class="ed-call-note">实际费用按通话时长计算，超时部分按分钟收费</text>
        </view>
        <view class="ed-sheet-foot">
          <view class="ed-call-submit" :class="callType === 'voice' ? 'ed-call-submit--voice' : 'ed-call-submit--video'">
            <app-icon name="phone" :size="30" color="#FFFFFF" />
            <text>{{ expert.isOnline ? '立即发起连麦' : '预约连麦时间' }}</text>
          </view>
        </view>
      </view>
    </view>

  </view>
  </view>
  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateBack } from '@/utils/router'

const statusBarHeight = ref(20)
const systemInfo = uni.getSystemInfoSync()
statusBarHeight.value = systemInfo.statusBarHeight || 20

const showQuestionModal = ref(false)
const showCallModal = ref(false)
const questionTitle = ref('')
const questionContent = ref('')
const selectedDuration = ref(30)
const callType = ref<'voice' | 'video'>('voice')
const isSubmitting = ref(false)

const expert = {
  id: 1,
  name: '周易大师',
  title: '资深命理师',
  verified: true,
  certifications: ['平台认证讲师', '八字命理专家'],
  intro: '从事命理研究20余年，师承多位名家，擅长八字精批、流年运势、婚姻感情、事业财运分析。已为超过5000位缘主提供咨询服务，好评如潮。',
  daysJoined: 365,
  answeredCount: 1280,
  goodRate: 98,
  responseTime: '通常1小时内回复',
  tags: ['八字精批', '流年运势', '婚姻感情', '事业财运', '起名改名'],
  services: {
    textQuestion: { price: 30, unit: '次', description: '文字/图文提问，24小时内回复' },
    voiceCall: { priceRange: [10, 40], unit: '分钟', description: '实时音频连麦，即问即答' },
    videoCall: { priceRange: [20, 60], unit: '分钟', description: '视频连麦，面对面交流' },
  },
  callDurations: [15, 30, 45, 60],
  reviews: [
    { id: 1, user: '匿***', rating: 5, content: '大师分析得很准确，对我今年的运势讲解很详细，还给了很多建议，非常感谢！', time: '3天前', helpful: 28 },
    { id: 2, user: '缘***', rating: 5, content: '连麦咨询体验很好，大师很有耐心，解答了我很多疑惑，物超所值。', time: '1周前', helpful: 45 },
    { id: 3, user: '易***', rating: 5, content: '八字分析专业，指出了我命中的一些问题，还给了化解方法，非常实用。', time: '2周前', helpful: 32 },
    { id: 4, user: '道***', rating: 4, content: '回复很快，分析也很到位，就是希望能更详细一些。', time: '3周前', helpful: 15 },
  ],
  historyQA: [
    { id: 1, question: '1995年农历五月初五出生，今年事业运势如何？', previewAnswer: '从你的八字来看，今年事业方面会有不错的机遇...', viewCount: 156, price: 1 },
    { id: 2, question: '最近感情不顺，想问问什么时候能遇到正缘？', previewAnswer: '根据你的命盘，感情宫位显示...', viewCount: 203, price: 1 },
  ],
  isOnline: true,
}

const callPrice = computed(() => {
  const service = callType.value === 'voice' ? expert.services.voiceCall : expert.services.videoCall
  return {
    min: service.priceRange[0] * selectedDuration.value,
    max: service.priceRange[1] * selectedDuration.value,
    perMinute: service.priceRange,
  }
})

function openQuestion() {
  showQuestionModal.value = true
}

function openCall(type: 'voice' | 'video') {
  callType.value = type
  showCallModal.value = true
}

function handleSubmitQuestion() {
  if (!questionTitle.value.trim() || isSubmitting.value) return
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    showQuestionModal.value = false
    questionTitle.value = ''
    questionContent.value = ''
    uni.showToast({ title: '提问已提交', icon: 'success' })
  }, 1500)
}

function onViewAllQA() {
  uni.showToast({ title: '全部问答', icon: 'none' })
}

function onShare() {
  uni.showToast({ title: '分享', icon: 'none' })
}

function goBack() {
  navigateBack()
}
</script>

<style lang="scss" scoped>
.ed-page {
  min-height: 100vh;
  background: #f7f7f7;
  padding-bottom: 160rpx;
}

/* 头图 */
.ed-hero {
  position: relative;
}
.ed-hero-bg {
  height: 384rpx;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.3), rgba(201, 169, 110, 0.2) 50%, #f0f0f0);
}
.ed-hero-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 96rpx;
}
.ed-nav-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 信息卡 */
.ed-profile-card {
  position: absolute;
  left: 32rpx;
  right: 32rpx;
  bottom: -160rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.08);
}
.ed-profile-top {
  display: flex;
  gap: 32rpx;
}
.ed-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.ed-avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.1);
  color: #c41e3a;
  font-size: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 8rpx solid #ffffff;
}
.ed-online-dot {
  position: absolute;
  bottom: 8rpx;
  right: 8rpx;
  width: 28rpx;
  height: 28rpx;
  background: #22c55e;
  border-radius: 999rpx;
  border: 4rpx solid #ffffff;
}
.ed-profile-info {
  flex: 1;
}
.ed-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}
.ed-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.ed-verified {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 12rpx;
  background: rgba(201, 169, 110, 0.2);
  color: #c9a96e;
  border-radius: 6rpx;
  font-size: 18rpx;
}
.ed-title {
  display: block;
  font-size: 26rpx;
  color: #999999;
  margin-top: 4rpx;
}
.ed-certs {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 16rpx;
}
.ed-cert {
  font-size: 18rpx;
  padding: 2rpx 12rpx;
  border: 1rpx solid rgba(196, 30, 58, 0.3);
  color: #c41e3a;
  border-radius: 6rpx;
}

/* 主内容 */
.ed-body {
  padding: 192rpx 32rpx 0;
}
.ed-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
}

/* 数据统计 */
.ed-stats {
  display: flex;
}
.ed-stat {
  flex: 1;
  text-align: center;
}
.ed-stat-num {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.ed-num-primary {
  color: #c41e3a;
}
.ed-num-accent {
  color: #c9a96e;
}
.ed-stat-label {
  font-size: 22rpx;
  color: #999999;
}
.ed-response {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #ededed;
}
.ed-response-text {
  font-size: 22rpx;
  color: #999999;
}

/* section */
.ed-section-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 16rpx;
}
.ed-no-mb {
  margin-bottom: 0;
}
.ed-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.ed-view-all {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: #c41e3a;
}
.ed-intro {
  display: block;
  font-size: 26rpx;
  color: #666666;
  line-height: 1.6;
}
.ed-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 24rpx;
}
.ed-tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  background: #f0f0f0;
  color: #2c2c2c;
  border-radius: 8rpx;
}

/* 服务 */
.ed-services {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.ed-service {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-radius: 20rpx;
  background: rgba(240, 240, 240, 0.5);
}
.ed-service-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.ed-service-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ed-icon-primary {
  background: rgba(196, 30, 58, 0.1);
}
.ed-icon-accent {
  background: rgba(201, 169, 110, 0.1);
}
.ed-icon-green {
  background: rgba(34, 197, 94, 0.1);
}
.ed-service-name {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.ed-service-desc {
  font-size: 22rpx;
  color: #999999;
}
.ed-service-price {
  text-align: right;
}
.ed-price-primary {
  font-size: 28rpx;
  font-weight: 700;
  color: #c41e3a;
}
.ed-price-accent {
  font-size: 28rpx;
  font-weight: 700;
  color: #c9a96e;
}
.ed-price-green {
  font-size: 28rpx;
  font-weight: 700;
  color: #22c55e;
}
.ed-price-unit {
  display: block;
  font-size: 18rpx;
  color: #999999;
}

/* 精选问答 */
.ed-qa-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.ed-qa {
  padding: 24rpx;
  border-radius: 20rpx;
  background: rgba(240, 240, 240, 0.3);
}
.ed-qa-q {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.5;
}
.ed-qa-a {
  display: block;
  font-size: 22rpx;
  color: #999999;
  margin-top: 12rpx;
  /* 模糊围观效果 */
  filter: blur(3rpx);
}
.ed-qa-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(237, 237, 237, 0.5);
}
.ed-qa-views {
  font-size: 18rpx;
  color: #999999;
}
.ed-qa-btn {
  padding: 6rpx 16rpx;
  background: rgba(201, 169, 110, 0.1);
  color: #c9a96e;
  font-size: 22rpx;
  border-radius: 999rpx;
}

/* 评价 */
.ed-rating-sum {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.ed-rating-num {
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.ed-rating-cnt {
  font-size: 22rpx;
  color: #999999;
}
.ed-reviews {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.ed-review {
  padding-bottom: 32rpx;
  border-bottom: 1rpx solid #ededed;
}
.ed-review:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.ed-review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ed-review-user {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.ed-review-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 999rpx;
  background: #f0f0f0;
  color: #666666;
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ed-review-name {
  font-size: 26rpx;
  color: #2c2c2c;
}
.ed-review-stars {
  display: flex;
  gap: 2rpx;
}
.ed-review-content {
  display: block;
  font-size: 26rpx;
  color: #666666;
  margin-top: 16rpx;
  line-height: 1.6;
}
.ed-review-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.ed-review-time {
  font-size: 18rpx;
  color: #999999;
}
.ed-review-helpful {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 18rpx;
  color: #999999;
}

/* 底部栏 */
.ed-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.97);
  border-top: 1rpx solid #ededed;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}
.ed-foot-ask {
  flex: 1;
  height: 88rpx;
  background: #f0f0f0;
  color: #2c2c2c;
  font-size: 28rpx;
  font-weight: 500;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.ed-foot-call {
  flex: 1;
  height: 88rpx;
  background: #c41e3a;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 500;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

/* 弹窗 */
.ed-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
}
.ed-sheet {
  width: 100%;
  max-height: 85vh;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.ed-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 96rpx;
  border-bottom: 1rpx solid #ededed;
}
.ed-sheet-cancel {
  font-size: 28rpx;
  color: #999999;
}
.ed-sheet-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.ed-sheet-spacer {
  width: 60rpx;
}
.ed-sheet-body {
  padding: 32rpx;
  overflow-y: auto;
}
.ed-field {
  margin-bottom: 32rpx;
}
.ed-field-label {
  display: block;
  font-size: 26rpx;
  color: #999999;
  margin-bottom: 16rpx;
}
.ed-input {
  width: 100%;
  padding: 24rpx 32rpx;
  background: #f0f0f0;
  border-radius: 20rpx;
  font-size: 28rpx;
  color: #2c2c2c;
}
.ed-textarea {
  width: 100%;
  height: 200rpx;
  padding: 24rpx 32rpx;
  background: #f0f0f0;
  border-radius: 20rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  box-sizing: border-box;
}
.ed-ph {
  color: #999999;
}
.ed-count {
  display: block;
  font-size: 18rpx;
  color: #999999;
  margin-top: 8rpx;
  text-align: right;
}
.ed-upload {
  width: 160rpx;
  height: 160rpx;
  border-radius: 20rpx;
  border: 2rpx dashed #dddddd;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.ed-upload-text {
  font-size: 18rpx;
  color: #999999;
}
.ed-fee-card {
  padding: 24rpx;
  background: rgba(201, 169, 110, 0.05);
  border: 1rpx solid rgba(201, 169, 110, 0.2);
  border-radius: 20rpx;
}
.ed-fee-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ed-fee-label {
  font-size: 26rpx;
  color: #2c2c2c;
}
.ed-fee-val {
  font-size: 28rpx;
  font-weight: 700;
  color: #c9a96e;
}
.ed-fee-note {
  display: block;
  font-size: 18rpx;
  color: #999999;
  margin-top: 8rpx;
}
.ed-sheet-foot {
  padding: 32rpx;
  border-top: 1rpx solid #ededed;
}
.ed-submit {
  width: 100%;
  height: 88rpx;
  background: #c41e3a;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 500;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.ed-submit--disabled {
  background: #f0f0f0;
  color: #999999;
}

/* 连麦弹窗 */
.ed-call-types {
  display: flex;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.ed-call-type {
  flex: 1;
  padding: 24rpx 0;
  text-align: center;
  border-radius: 20rpx;
  font-size: 28rpx;
  font-weight: 500;
  background: #f0f0f0;
  color: #999999;
}
.ed-call-type--voice {
  background: #c9a96e;
  color: #ffffff;
}
.ed-call-type--video {
  background: #22c55e;
  color: #ffffff;
}
.ed-durations {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.ed-duration {
  padding: 24rpx 0;
  text-align: center;
  border-radius: 20rpx;
  font-size: 26rpx;
  font-weight: 500;
  background: #f0f0f0;
  color: #2c2c2c;
}
.ed-dur--voice {
  background: #c9a96e;
  color: #ffffff;
}
.ed-dur--video {
  background: #22c55e;
  color: #ffffff;
}
.ed-call-fee {
  padding: 32rpx;
  background: rgba(240, 240, 240, 0.5);
  border-radius: 20rpx;
}
.ed-fee-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.ed-fee-line-label {
  font-size: 26rpx;
  color: #999999;
}
.ed-fee-line-val {
  font-size: 26rpx;
  color: #2c2c2c;
}
.ed-fee-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid #ededed;
}
.ed-fee-total-label {
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.ed-fee-total-val {
  font-size: 36rpx;
  font-weight: 700;
}
.ed-total-accent {
  color: #c9a96e;
}
.ed-total-green {
  color: #22c55e;
}
.ed-call-note {
  display: block;
  font-size: 18rpx;
  color: #999999;
  text-align: center;
  margin-top: 24rpx;
}
.ed-call-submit {
  width: 100%;
  height: 88rpx;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 500;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.ed-call-submit--voice {
  background: #c9a96e;
}
.ed-call-submit--video {
  background: #22c55e;
}
</style>
