<template>
  <view class="page">
    <view class="nav">
      <view class="nav-back" @tap="goBack">
        <app-icon name="arrow-left" :size="20" color="#1f2937" />
      </view>
      <text class="nav-title">成为合作伙伴</text>
    </view>

    <!-- intro -->
    <scroll-view v-if="step === 'intro'" scroll-y class="scroll">
      <view class="hero">
        <text class="hero-title">携手热卜，共创未来</text>
        <text class="hero-desc">加入国学文化传播平台，将您的专业知识变现，影响更多国学爱好者。</text>
      </view>

      <view class="section">
        <text class="section-title">合作权益</text>
        <view v-for="b in benefits" :key="b.title" class="benefit">
          <view class="benefit-icon">
            <app-icon :name="b.icon" :size="20" color="#c8102e" />
          </view>
          <view class="benefit-body">
            <text class="benefit-title">{{ b.title }}</text>
            <text class="benefit-desc">{{ b.desc }}</text>
          </view>
        </view>
      </view>

      <view class="stats">
        <view v-for="s in stats" :key="s.label" class="stat">
          <text class="stat-value">{{ s.value }}</text>
          <text class="stat-label">{{ s.label }}</text>
        </view>
      </view>

      <view style="height: 40rpx" />
    </scroll-view>

    <view v-if="step === 'intro'" class="footer">
      <view class="btn-primary" @tap="step = 'apply'">
        <text class="btn-text">立即申请</text>
        <app-icon name="chevron-right" :size="16" color="#ffffff" />
      </view>
    </view>

    <!-- apply -->
    <scroll-view v-if="step === 'apply'" scroll-y class="scroll">
      <view class="form">
        <text class="form-title">填写申请信息</text>
        <text class="form-sub">我们将在 3 个工作日内与您联系。</text>

        <view class="field">
          <text class="field-label">姓名</text>
          <input v-model="form.name" class="field-input" placeholder="请输入真实姓名" placeholder-class="ph" />
        </view>
        <view class="field">
          <text class="field-label">联系电话</text>
          <input v-model="form.phone" type="text" class="field-input" placeholder="请输入手机号码" placeholder-class="ph" />
        </view>
        <view class="field">
          <text class="field-label">专业方向</text>
          <input v-model="form.specialty" class="field-input" placeholder="如：八字命理、风水堪舆" placeholder-class="ph" />
        </view>
        <view class="field">
          <text class="field-label">个人简介（选填）</text>
          <textarea v-model="form.intro" class="field-textarea" placeholder="请简单介绍您的专业背景和教学经验" placeholder-class="ph" />
        </view>
      </view>
      <view style="height: 40rpx" />
    </scroll-view>

    <view v-if="step === 'apply'" class="footer">
      <view class="btn-primary" :class="{ 'btn-disabled': !canSubmit || loading }" @tap="handleSubmit">
        <app-icon v-if="loading" name="loader-2" :size="16" color="#ffffff" class="spin" />
        <text class="btn-text">{{ loading ? '提交中…' : '提交申请' }}</text>
      </view>
    </view>

    <!-- success -->
    <view v-if="step === 'success'" class="success">
      <view class="success-icon">
        <app-icon name="check-circle-2" :size="40" color="#16a34a" />
      </view>
      <text class="success-title">申请已提交</text>
      <text class="success-desc">感谢您的申请！我们的运营团队将在 3 个工作日内通过电话与您联系。</text>
      <view class="btn-primary success-btn" @tap="goHome">
        <text class="btn-text">返回首页</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateBack, reLaunch } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'

const step = ref<'intro' | 'apply' | 'success'>('intro')
const loading = ref(false)
const form = ref({ name: '', phone: '', specialty: '', intro: '' })

const benefits = [
  { icon: 'trending-up', title: '高额分成', desc: '最高 70% 课程销售分成，收益实时到账' },
  { icon: 'users', title: '流量支持', desc: '官方推荐位、首页曝光，快速积累用户' },
  { icon: 'award', title: '品牌背书', desc: '获得平台认证标志，提升个人品牌影响力' },
  { icon: 'check-circle-2', title: '运营支持', desc: '专属运营团队协助策划课程和内容' },
]

const stats = [
  { value: '2,000+', label: '合作讲师' },
  { value: '50万+', label: '平台用户' },
  { value: '98%', label: '讲师满意度' },
]

const canSubmit = computed(() => !!form.value.name && !!form.value.phone && !!form.value.specialty)

function handleSubmit() {
  if (!canSubmit.value || loading.value) return
  loading.value = true
  setTimeout(() => {
    loading.value = false
    step.value = 'success'
  }, 1500)
}

function goBack() {
  navigateBack()
}

function goHome() {
  reLaunch('/pages/index/index')
}
</script>

<style scoped>
.page {
  /* iOS Safari flex bug：用固定 height 才能让 flex:1 滚动子项正确填充(min-height:100vh 会算出高度0致内容空白) */
  height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 88rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #ebebeb;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  gap: 24rpx;
}
.nav-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
}
.scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}

/* hero */
.hero {
  background: linear-gradient(135deg, #c8102e, #e04356);
  padding: 64rpx 32rpx;
}
.hero-title {
  display: block;
  font-size: 48rpx;
  font-weight: 900;
  color: #ffffff;
  margin-bottom: 16rpx;
}
.hero-desc {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

/* benefits */
.section {
  padding: 40rpx 32rpx 0;
}
.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 24rpx;
}
.benefit {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding: 32rpx;
  background: #ffffff;
  border: 1rpx solid #ebebeb;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
}
.benefit-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  background: rgba(200, 16, 46, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.benefit-body {
  flex: 1;
}
.benefit-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
}
.benefit-desc {
  display: block;
  font-size: 24rpx;
  color: #9ca3af;
  margin-top: 4rpx;
  line-height: 1.5;
}

/* stats */
.stats {
  margin: 0 32rpx 40rpx;
  display: flex;
  gap: 24rpx;
}
.stat {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 24rpx;
}
.stat-value {
  display: block;
  font-size: 36rpx;
  font-weight: 900;
  color: #c8102e;
}
.stat-label {
  display: block;
  font-size: 24rpx;
  color: #9ca3af;
  margin-top: 4rpx;
}

/* form */
.form {
  padding: 40rpx 32rpx 0;
}
.form-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8rpx;
}
.form-sub {
  display: block;
  font-size: 24rpx;
  color: #9ca3af;
  margin-bottom: 32rpx;
}
.field {
  margin-bottom: 32rpx;
}
.field-label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 12rpx;
}
.field-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #1f2937;
  background: #ffffff;
  border: 1rpx solid #ebebeb;
  border-radius: 16rpx;
  box-sizing: border-box;
}
.field-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #1f2937;
  background: #ffffff;
  border: 1rpx solid #ebebeb;
  border-radius: 16rpx;
  box-sizing: border-box;
}
.ph {
  color: #c4c4c4;
}

/* footer */
.footer {
  background: #ffffff;
  border-top: 1rpx solid #ebebeb;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.btn-primary {
  height: 88rpx;
  background: #c8102e;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.btn-disabled {
  opacity: 0.5;
}
.btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
}

/* success */
.success {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 64rpx;
  text-align: center;
}
.success-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #dcfce7;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
}
.success-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 16rpx;
}
.success-desc {
  font-size: 28rpx;
  color: #9ca3af;
  line-height: 1.6;
  margin-bottom: 64rpx;
}
.success-btn {
  width: 100%;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
