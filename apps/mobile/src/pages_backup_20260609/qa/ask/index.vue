<template>
  <view class="qa-page">
    <!-- 头部 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">发起提问</text>
        <view class="header-spacer" />
      </view>
    </view>

    <template v-if="!answerer">
      <view class="skeleton">
        <view class="sk-card"><view class="sk-line" /><view class="sk-line short" /></view>
      </view>
    </template>

    <template v-else>
      <view class="body">
        <!-- 答主信息 -->
        <view class="card">
          <view class="answerer-row">
            <view class="ar-avatar">{{ answerer.name[0] }}</view>
            <view class="ar-info">
              <view class="ar-name-row">
                <text class="ar-name">{{ answerer.name }}</text>
                <text class="ar-title">{{ answerer.title }}</text>
              </view>
              <text class="ar-desc">{{ answerer.description }}</text>
              <view class="ar-meta">
                <text>⭐ {{ answerer.rating }}</text>
                <text>💬 {{ answerer.answerCount }}次回答</text>
                <text>⏱️ {{ answerer.responseTime }}</text>
              </view>
            </view>
          </view>
          <view class="ar-tags">
            <text v-for="tag in answerer.expertise" :key="tag" class="ar-tag">{{ tag }}</text>
          </view>
          <view class="ar-price-row">
            <text class="ar-price-label">提问价格</text>
            <text class="ar-price-num">¥{{ answerer.price }}</text>
          </view>
        </view>

        <!-- 问题标题 -->
        <view class="card">
          <view class="field-header">
            <text class="field-label">问题标题</text>
            <text class="field-count">{{ title.length }}/50</text>
          </view>
          <input v-model="title" class="field-input" placeholder="一句话描述你的问题" maxlength="50" />
          <text v-if="errors.title" class="field-error">{{ errors.title }}</text>
        </view>

        <!-- 问题详情 -->
        <view class="card">
          <view class="field-header">
            <text class="field-label">问题详情</text>
            <text class="field-count">{{ content.length }}/500</text>
          </view>
          <textarea v-model="content" class="field-textarea" placeholder="请详细描述你的问题，包括相关背景信息，以便答主更好地为你解答..." maxlength="500" />
          <text v-if="errors.content" class="field-error">{{ errors.content }}</text>
          <text class="field-hint">提示：提问越详细，答主回答越精准</text>
        </view>

        <!-- 围观设置 -->
        <view class="card">
          <view class="toggle-row">
            <view class="toggle-info">
              <text class="toggle-label">允许围观</text>
              <text class="toggle-desc">开启后其他用户可付费查看回答</text>
            </view>
            <view class="toggle-switch" :class="{ active: isPublic }" @click="isPublic = !isPublic">
              <view class="ts-knob" />
            </view>
          </view>
          <view v-if="isPublic" class="view-price-section">
            <view class="vps-header">
              <text class="vps-label">围观价格</text>
              <text class="vps-hint">选择后可获得分成</text>
            </view>
            <view class="vps-options">
              <view v-for="p in viewPriceOptions" :key="p" class="vps-item" :class="{ active: viewPrice === p }" @click="viewPrice = p">
                <text>{{ p === 0 ? '免费' : '¥' + p }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 回答期限 -->
        <view class="card">
          <text class="field-label">回答期限</text>
          <view class="expire-options">
            <view v-for="opt in expireOptions" :key="opt.value" class="exp-item" :class="{ active: expireDays === opt.value }" @click="expireDays = opt.value">
              <text>{{ opt.label }}</text>
            </view>
          </view>
          <text class="field-hint">答主将在{{ expireDays }}天内回答，超时未回答将全额退款</text>
        </view>

        <!-- 温馨提示 -->
        <view class="tips-card">
          <text class="tips-title">温馨提示</text>
          <view class="tips-list">
            <view class="tips-item"><text>✓ 提问后，答主将在约定时间内回复</text></view>
            <view class="tips-item"><text>✓ 回答后您可对回答进行评分</text></view>
            <view class="tips-item"><text>✓ 开启围观后，每次围观您可获得分成</text></view>
            <view class="tips-item"><text>✓ 超时未回答将自动全额退款</text></view>
          </view>
        </view>
      </view>
    </template>

    <!-- 底部操作栏 -->
    <view v-if="answerer" class="bottom-bar">
      <view class="bb-info">
        <text class="bb-label">需支付</text>
        <text class="bb-price">¥{{ totalPrice }}</text>
      </view>
      <view class="bb-submit" :class="{ disabled: isSubmitting }" @click="handleSubmit">
        <text>{{ isSubmitting ? '提交中...' : '提交并支付' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const answerer = ref<any>({
  id: '1', name: '张道长', avatar: '', title: '易学研究会会长',
  expertise: ['八字命理', '风水堪舆', '六爻预测'], price: 99,
  responseTime: '24小时内', answerCount: 1234, rating: 4.9,
  description: '从事易学研究三十余年，精通八字、六爻、风水等传统术数',
})

const title = ref('')
const content = ref('')
const isPublic = ref(true)
const viewPrice = ref(0)
const expireDays = ref(3)
const isSubmitting = ref(false)
const errors = ref<{ title?: string; content?: string }>({})

const viewPriceOptions = [0, 1, 3, 5, 10]
const expireOptions = [
  { value: 1, label: '1天' },
  { value: 3, label: '3天' },
  { value: 7, label: '7天' },
]

const totalPrice = answerer.value ? answerer.value.price : 0

function validate() {
  const e: { title?: string; content?: string } = {}
  if (!title.value.trim()) e.title = '请输入问题标题'
  else if (title.value.length < 5) e.title = '标题至少5个字'
  if (!content.value.trim()) e.content = '请输入问题详情'
  else if (content.value.length < 20) e.content = '问题详情至少20个字'
  errors.value = e
  return Object.keys(e).length === 0
}

function handleSubmit() {
  if (!validate()) return
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    uni.showToast({ title: '提问成功', icon: 'success' })
  }, 1500)
}
</script>

<style scoped>
.qa-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 160rpx; }

.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-spacer { width: 56rpx; }

.skeleton { padding: 24rpx; }
.sk-card { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.sk-line { height: 24rpx; background: #F0F0F0; border-radius: 6rpx; margin-bottom: 14rpx; }
.sk-line.short { width: 60%; }

.body { padding: 16rpx 24rpx; display: flex; flex-direction: column; gap: 16rpx; }

.card { background: #fff; border-radius: 16rpx; padding: 24rpx; }

.answerer-row { display: flex; gap: 16rpx; }
.ar-avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 36rpx; color: #C41E3A; flex-shrink: 0; }
.ar-info { flex: 1; min-width: 0; }
.ar-name-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 4rpx; }
.ar-name { font-size: 28rpx; font-weight: 700; color: #333; }
.ar-title { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: rgba(240,160,48,0.12); color: #F0A030; }
.ar-desc { font-size: 22rpx; color: #666; display: block; margin-bottom: 6rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.ar-meta { display: flex; gap: 16rpx; }
.ar-meta text { font-size: 20rpx; color: #999; }

.ar-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 16rpx; }
.ar-tag { font-size: 20rpx; padding: 6rpx 16rpx; border-radius: 20rpx; background: rgba(196,30,58,0.06); color: #C41E3A; }

.ar-price-row { display: flex; justify-content: space-between; align-items: center; margin-top: 16rpx; padding-top: 16rpx; border-top: 1px solid #F5F1EB; }
.ar-price-label { font-size: 24rpx; color: #999; }
.ar-price-num { font-size: 36rpx; font-weight: 700; color: #C41E3A; }

.field-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.field-label { font-size: 26rpx; font-weight: 500; color: #333; }
.field-count { font-size: 20rpx; color: #BBB; }
.field-input { width: 100%; height: 72rpx; padding: 0 16rpx; border-radius: 12rpx; border: 2rpx solid #E8E0D5; font-size: 24rpx; color: #333; box-sizing: border-box; background: #FAF8F5; }
.field-textarea { width: 100%; height: 200rpx; padding: 16rpx; border-radius: 12rpx; border: 2rpx solid #E8E0D5; font-size: 24rpx; color: #333; box-sizing: border-box; background: #FAF8F5; }
.field-error { font-size: 20rpx; color: #C41E3A; margin-top: 6rpx; display: block; }
.field-hint { font-size: 20rpx; color: #BBB; margin-top: 10rpx; display: block; }

.toggle-row { display: flex; justify-content: space-between; align-items: center; }
.toggle-label { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.toggle-desc { font-size: 20rpx; color: #BBB; }
.toggle-switch { width: 72rpx; height: 40rpx; border-radius: 20rpx; background: #E8E0D5; position: relative; transition: background 0.2s; }
.toggle-switch.active { background: #C41E3A; }
.ts-knob { width: 32rpx; height: 32rpx; border-radius: 50%; background: #fff; position: absolute; top: 4rpx; left: 4rpx; transition: transform 0.2s; }
.toggle-switch.active .ts-knob { transform: translateX(32rpx); }

.view-price-section { margin-top: 20rpx; padding-top: 20rpx; border-top: 1px solid #F5F1EB; }
.vps-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.vps-label { font-size: 24rpx; color: #333; }
.vps-hint { font-size: 20rpx; color: #BBB; }
.vps-options { display: flex; gap: 10rpx; }
.vps-item { flex: 1; padding: 14rpx; border-radius: 12rpx; background: #F5F1EB; text-align: center; }
.vps-item.active { background: #C41E3A; }
.vps-item text { font-size: 24rpx; color: #666; font-weight: 500; }
.vps-item.active text { color: #fff; }

.expire-options { display: flex; gap: 10rpx; margin: 14rpx 0 10rpx; }
.exp-item { flex: 1; padding: 14rpx; border-radius: 12rpx; background: #F5F1EB; text-align: center; }
.exp-item.active { background: #C41E3A; }
.exp-item text { font-size: 24rpx; color: #666; font-weight: 500; }
.exp-item.active text { color: #fff; }

.tips-card { background: rgba(240,160,48,0.05); border-radius: 16rpx; padding: 24rpx; }
.tips-title { font-size: 26rpx; font-weight: 600; color: #8B7355; display: block; margin-bottom: 12rpx; }
.tips-list { display: flex; flex-direction: column; gap: 8rpx; }
.tips-item text { font-size: 22rpx; color: #8B7355; line-height: 1.6; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #E8E0D5; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); z-index: 30; }
.bb-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.bb-label { font-size: 24rpx; color: #999; }
.bb-price { font-size: 40rpx; font-weight: 700; color: #C41E3A; }
.bb-submit { padding: 24rpx; border-radius: 16rpx; background: #C41E3A; text-align: center; }
.bb-submit.disabled { background: #F5F1EB; }
.bb-submit text { font-size: 28rpx; font-weight: 600; color: #fff; }
.bb-submit.disabled text { color: #BBB; }
</style>
