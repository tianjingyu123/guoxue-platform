<template>
  <view class="qk-page">
    <!-- Header -->
    <view class="qk-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="qk-header-bar">
        <view class="qk-back" @tap="onBack"><app-icon name="chevron-left" :size="40" color="#2c2c2c" /></view>
        <text class="qk-header-title">发起提问</text>
        <view class="qk-placeholder" />
      </view>
    </view>

    <view class="qk-body">
      <!-- Answerer Card -->
      <view class="qk-card">
        <view class="qk-answerer">
          <view class="qk-avatar"><text class="qk-avatar-tx">{{ answerer.name[0] }}</text></view>
          <view class="qk-answerer-info">
            <view class="qk-answerer-row">
              <text class="qk-answerer-name">{{ answerer.name }}</text>
              <view class="qk-answerer-badge"><text class="qk-answerer-badge-tx">{{ answerer.title }}</text></view>
            </view>
            <text class="qk-answerer-desc">{{ answerer.description }}</text>
            <view class="qk-answerer-stats">
              <view class="qk-stat"><app-icon name="star" :size="28" color="#f59e0b" /><text class="qk-stat-tx">{{ answerer.rating }}</text></view>
              <view class="qk-stat"><app-icon name="message-circle" :size="28" color="#999999" /><text class="qk-stat-tx">{{ answerer.answerCount }}次回答</text></view>
              <view class="qk-stat"><app-icon name="clock" :size="28" color="#999999" /><text class="qk-stat-tx">{{ answerer.responseTime }}</text></view>
            </view>
          </view>
        </view>
        <view class="qk-expertise">
          <view v-for="tag in answerer.expertise" :key="tag" class="qk-exp-tag"><text class="qk-exp-tag-tx">{{ tag }}</text></view>
        </view>
        <view class="qk-price-row">
          <text class="qk-price-label">提问价格</text>
          <text class="qk-price">¥{{ answerer.price }}</text>
        </view>
      </view>

      <!-- Title -->
      <view class="qk-card">
        <view class="qk-field-head">
          <text class="qk-field-label">问题标题</text>
          <text class="qk-field-count">{{ title.length }}/50</text>
        </view>
        <input
          class="qk-input"
          :class="{ 'qk-input-error': errors.title }"
          v-model="title"
          placeholder="一句话描述你的问题"
          :maxlength="50"
        />
        <view v-if="errors.title" class="qk-err"><app-icon name="alert-circle" :size="24" color="#dc2626" /><text class="qk-err-tx">{{ errors.title }}</text></view>
      </view>

      <!-- Content -->
      <view class="qk-card">
        <view class="qk-field-head">
          <text class="qk-field-label">问题详情</text>
          <text class="qk-field-count">{{ content.length }}/500</text>
        </view>
        <textarea
          class="qk-textarea"
          :class="{ 'qk-input-error': errors.content }"
          v-model="content"
          placeholder="请详细描述你的问题，包括相关背景信息，以便答主更好地为你解答..."
          :maxlength="500"
        />
        <view v-if="errors.content" class="qk-err"><app-icon name="alert-circle" :size="24" color="#dc2626" /><text class="qk-err-tx">{{ errors.content }}</text></view>
        <text class="qk-tip">提示：提问越详细，答主回答越精准</text>
      </view>

      <!-- Public Toggle -->
      <view class="qk-card">
        <view class="qk-toggle-row">
          <view class="qk-toggle-info">
            <text class="qk-toggle-title">允许围观</text>
            <text class="qk-toggle-desc">开启后其他用户可付费查看回答</text>
          </view>
          <view class="qk-switch" :class="{ 'qk-switch-on': isPublic }" @tap="isPublic = !isPublic">
            <view class="qk-switch-knob" :class="{ 'qk-switch-knob-on': isPublic }" />
          </view>
        </view>
        <view v-if="isPublic" class="qk-public-body">
          <view class="qk-public-head">
            <text class="qk-public-label">围观价格</text>
            <text class="qk-public-hint">选择后可获得分成</text>
          </view>
          <view class="qk-options">
            <view
              v-for="price in viewPriceOptions"
              :key="price"
              class="qk-option"
              :class="{ 'qk-option-active': viewPrice === price }"
              @tap="viewPrice = price"
            >
              <text class="qk-option-tx" :class="{ 'qk-option-tx-active': viewPrice === price }">{{ price === 0 ? '免费' : '¥' + price }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Expire -->
      <view class="qk-card">
        <text class="qk-section-title">回答期限</text>
        <view class="qk-options">
          <view
            v-for="opt in expireOptions"
            :key="opt.value"
            class="qk-option"
            :class="{ 'qk-option-active': expireDays === opt.value }"
            @tap="expireDays = opt.value"
          >
            <text class="qk-option-tx" :class="{ 'qk-option-tx-active': expireDays === opt.value }">{{ opt.label }}</text>
          </view>
        </view>
        <text class="qk-tip">答主将在{{ expireDays }}天内回答，超时未回答将全额退款</text>
      </view>

      <!-- Tips -->
      <view class="qk-tips-card">
        <text class="qk-tips-title">温馨提示</text>
        <view class="qk-tips-list">
          <view v-for="(t, i) in tips" :key="i" class="qk-tips-item">
            <app-icon name="check-circle" :size="28" color="#b45309" />
            <text class="qk-tips-item-tx">{{ t }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Bottom Bar -->
    <view class="qk-bottom">
      <view class="qk-bottom-row">
        <text class="qk-bottom-label">需支付</text>
        <text class="qk-bottom-price">¥{{ answerer.price }}</text>
      </view>
      <view class="qk-submit" @tap="onSubmit">
        <app-icon name="users" :size="36" color="#ffffff" />
        <text class="qk-submit-tx">提交并支付</text>
      </view>
    </view>

  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { navigateBack } from '@/utils/router'

const statusBarHeight = ref(0)
const title = ref('')
const content = ref('')
const isPublic = ref(true)
const viewPrice = ref(0)
const expireDays = ref(3)
const errors = reactive<{ title?: string; content?: string }>({})

const answerer = {
  id: '1',
  name: '张道长',
  title: '易学研究会会长',
  expertise: ['八字命理', '风水堪舆', '六爻预测'],
  price: 99,
  responseTime: '24小时内',
  answerCount: 1234,
  rating: 4.9,
  description: '从事易学研究三十余年，精通八字、六爻、风水等传统术数',
}

const viewPriceOptions = [0, 1, 3, 5, 10]
const expireOptions = [
  { value: 1, label: '1天' },
  { value: 3, label: '3天' },
  { value: 7, label: '7天' },
]
const tips = [
  '提问后，答主将在约定时间内回复',
  '回答后您可对回答进行评分',
  '开启围观后，每次围观您可获得分成',
  '超时未回答将自动全额退款',
]

const onBack = () => navigateBack()

const onSubmit = () => {
  errors.title = undefined
  errors.content = undefined
  if (!title.value.trim()) errors.title = '请输入问题标题'
  else if (title.value.length < 5) errors.title = '标题至少5个字'
  if (!content.value.trim()) errors.content = '请输入问题详情'
  else if (content.value.length < 20) errors.content = '问题详情至少20个字'
  if (errors.title || errors.content) return
  uni.showToast({ title: '提交成功', icon: 'success' })
}

onMounted(() => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
})
</script>

<style scoped>
.qk-page {
  min-height: 100vh;
  background-color: #faf8f5;
  padding-bottom: 220rpx;
}
.qk-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: rgba(250, 248, 245, 0.95);
  border-bottom: 1rpx solid #e8e3db;
}
.qk-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
}
.qk-back { margin-left: -16rpx; padding: 16rpx; }
.qk-header-title { font-size: 30rpx; font-weight: 600; color: #2c2c2c; }
.qk-placeholder { width: 72rpx; }
.qk-body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.qk-card {
  background-color: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  border: 1rpx solid #e8e3db;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}
.qk-answerer { display: flex; gap: 32rpx; }
.qk-avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #c9a96e, #dfc296);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.qk-avatar-tx { font-size: 48rpx; font-weight: 600; color: #ffffff; }
.qk-answerer-info { flex: 1; min-width: 0; }
.qk-answerer-row { display: flex; align-items: center; gap: 16rpx; }
.qk-answerer-name { font-size: 36rpx; font-weight: 700; color: #2c2c2c; }
.qk-answerer-badge { padding: 2rpx 16rpx; background-color: #fef3c7; border-radius: 999rpx; }
.qk-answerer-badge-tx { font-size: 22rpx; color: #b45309; }
.qk-answerer-desc {
  font-size: 26rpx;
  color: #999999;
  margin-top: 8rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.qk-answerer-stats { display: flex; align-items: center; gap: 32rpx; margin-top: 16rpx; }
.qk-stat { display: flex; align-items: center; gap: 8rpx; }
.qk-stat-tx { font-size: 26rpx; color: #999999; }
.qk-expertise { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 24rpx; }
.qk-exp-tag { padding: 8rpx 24rpx; background-color: rgba(196, 30, 58, 0.1); border-radius: 999rpx; }
.qk-exp-tag-tx { font-size: 22rpx; color: #c41e3a; }
.qk-price-row {
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid #e8e3db;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.qk-price-label { font-size: 28rpx; color: #999999; }
.qk-price { font-size: 40rpx; font-weight: 700; color: #c41e3a; }
.qk-field-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.qk-field-label { font-size: 28rpx; font-weight: 500; color: #2c2c2c; }
.qk-field-count { font-size: 22rpx; color: #999999; }
.qk-input {
  width: 100%;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  border: 1rpx solid #e8e3db;
  background-color: #faf8f5;
  font-size: 28rpx;
  box-sizing: border-box;
}
.qk-textarea {
  width: 100%;
  height: 240rpx;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  border: 1rpx solid #e8e3db;
  background-color: #faf8f5;
  font-size: 28rpx;
  box-sizing: border-box;
}
.qk-input-error { border-color: #dc2626; }
.qk-err { display: flex; align-items: center; gap: 8rpx; margin-top: 8rpx; }
.qk-err-tx { font-size: 22rpx; color: #dc2626; }
.qk-tip { font-size: 22rpx; color: #999999; margin-top: 16rpx; display: block; }
.qk-toggle-row { display: flex; align-items: center; justify-content: space-between; }
.qk-toggle-info { flex: 1; }
.qk-toggle-title { font-size: 28rpx; font-weight: 500; color: #2c2c2c; display: block; }
.qk-toggle-desc { font-size: 22rpx; color: #999999; margin-top: 4rpx; display: block; }
.qk-switch {
  width: 96rpx;
  height: 56rpx;
  border-radius: 999rpx;
  background-color: #e5e7eb;
  position: relative;
  flex-shrink: 0;
  transition: background-color 0.2s;
}
.qk-switch-on { background-color: #c41e3a; }
.qk-switch-knob {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  width: 40rpx;
  height: 40rpx;
  background-color: #ffffff;
  border-radius: 999rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}
.qk-switch-knob-on { transform: translateX(40rpx); }
.qk-public-body { margin-top: 32rpx; padding-top: 32rpx; border-top: 1rpx solid #e8e3db; }
.qk-public-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.qk-public-label { font-size: 26rpx; color: #2c2c2c; }
.qk-public-hint { font-size: 26rpx; color: #999999; }
.qk-options { display: flex; gap: 16rpx; }
.qk-option {
  flex: 1;
  padding: 16rpx 0;
  border-radius: 16rpx;
  background-color: #f5f5f5;
  text-align: center;
}
.qk-option-active { background-color: #c41e3a; }
.qk-option-tx { font-size: 26rpx; font-weight: 500; color: #2c2c2c; }
.qk-option-tx-active { color: #ffffff; }
.qk-section-title { font-size: 28rpx; font-weight: 500; color: #2c2c2c; margin-bottom: 24rpx; display: block; }
.qk-tips-card { background-color: #fffbeb; border-radius: 32rpx; padding: 32rpx; }
.qk-tips-title { font-size: 28rpx; font-weight: 500; color: #92400e; margin-bottom: 16rpx; display: block; }
.qk-tips-list { display: flex; flex-direction: column; gap: 8rpx; }
.qk-tips-item { display: flex; align-items: flex-start; gap: 16rpx; }
.qk-tips-item-tx { font-size: 22rpx; color: #b45309; line-height: 1.5; flex: 1; }
.qk-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  border-top: 1rpx solid #e8e3db;
  padding: 32rpx;
}
.qk-bottom-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.qk-bottom-label { font-size: 28rpx; color: #999999; }
.qk-bottom-price { font-size: 44rpx; font-weight: 700; color: #c41e3a; }
.qk-submit {
  width: 100%;
  padding: 24rpx 0;
  background-color: #c41e3a;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.qk-submit-tx { font-size: 30rpx; font-weight: 500; color: #ffffff; }
</style>
