<template>
  <view class="pc-page">
    <!-- 头部 -->
    <view class="pc-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="pc-back" @tap="back">
        <AppIcon name="chevron-left" :size="22" color="#2c2c2c" />
      </view>
      <text class="pc-title">发布课程</text>
      <view class="pc-back" />
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="pc-status">
      <AppIcon name="loader" :size="44" color="#c41e3a" />
      <text class="pc-status-text">加载中…</text>
    </view>

    <!-- 资格门控：非认证讲师 -->
    <view v-else-if="!isTeacher" class="pc-status">
      <AppIcon name="award" :size="56" color="#c41e3a" />
      <text class="pc-status-title">
        {{ certStatus === 'pending' ? '认证审核中' : '需先成为认证讲师' }}
      </text>
      <text class="pc-status-desc">
        {{ certStatus === 'pending'
          ? '您的讲师认证正在审核，通过后即可发布课程。'
          : '只有通过讲师认证的用户才能发布线上课程。' }}
      </text>
      <button class="pc-btn pc-btn-full" @tap="goCertify">
        {{ certStatus === 'pending' ? '查看进度' : '去认证' }}
      </button>
    </view>

    <!-- 发课表单 -->
    <view v-else class="pc-form">
      <view class="pc-field">
        <text class="pc-label">课程封面</text>
        <view class="pc-cover" @tap="chooseCover">
          <image lazy-load v-if="form.cover" class="pc-cover-img" :src="form.cover" mode="aspectFill" />
          <view v-else class="pc-cover-empty">
            <AppIcon :name="uploadingCover ? 'loader' : 'image'" :size="32" :color="uploadingCover ? '#c41e3a' : '#bbb'" />
            <text class="pc-cover-text">{{ uploadingCover ? '上传中…' : '点击上传封面' }}</text>
          </view>
        </view>
      </view>

      <view class="pc-field">
        <text class="pc-label">课程标题 <text class="pc-req">*</text></text>
        <input
          class="pc-input"
          placeholder="请输入课程标题"
          placeholder-class="pc-ph"
          :value="form.title"
          @input="(e: any) => form.title = e.detail.value"
          :maxlength="50"
        />
      </view>

      <view class="pc-field">
        <text class="pc-label">课程类型</text>
        <picker mode="selector" :range="typeLabels" :value="typeIndex" @change="onTypeChange">
          <view class="pc-picker">
            <text class="pc-picker-text">{{ typeLabels[typeIndex] }}</text>
            <AppIcon name="chevron-down" :size="18" color="#bbb" />
          </view>
        </picker>
      </view>

      <view class="pc-field">
        <text class="pc-label">课程分类</text>
        <picker mode="selector" :range="categoryLabels" :value="categoryIndex" @change="onCategoryChange">
          <view class="pc-picker">
            <text class="pc-picker-text">{{ categoryLabels[categoryIndex] }}</text>
            <AppIcon name="chevron-down" :size="18" color="#bbb" />
          </view>
        </picker>
      </view>

      <view class="pc-field">
        <text class="pc-label">售价（元）</text>
        <input
          class="pc-input"
          type="digit"
          placeholder="0 表示免费"
          placeholder-class="pc-ph"
          :value="form.price"
          @input="(e: any) => form.price = e.detail.value"
        />
        <!-- T3 定价参考卡（供给侧·仅类目维度·平台不干预定价） -->
        <PricingReferenceCard
          bizType="COURSE"
          :categoryLevel1="form.categoryLevel1"
          :currentPrice="Number(form.price) || undefined"
          @adopt="onAdoptPrice"
        />
      </view>

      <view class="pc-field">
        <text class="pc-label">有效期（天）</text>
        <input
          class="pc-input"
          type="number"
          placeholder="0 表示永久有效"
          placeholder-class="pc-ph"
          :value="form.validityDays"
          @input="(e: any) => form.validityDays = e.detail.value"
        />
      </view>

      <view class="pc-field">
        <text class="pc-label">课程简介</text>
        <textarea
          class="pc-textarea"
          placeholder="介绍课程内容、亮点与适合人群"
          placeholder-class="pc-ph"
          :value="form.intro"
          @input="(e: any) => form.intro = e.detail.value"
          :maxlength="500"
        />
      </view>

      <text class="pc-hint">提交后课程进入平台审核，审核通过即可在课程管理台上架并添加章节。</text>

      <view class="pc-footer">
        <button
          class="pc-btn pc-btn-full"
          :class="{ 'pc-btn-disabled': submitting || !form.title.trim() }"
          :disabled="submitting || !form.title.trim()"
          @tap="onSubmit"
        >
          {{ submitting ? '提交中…' : '提交审核' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import PricingReferenceCard from '@/components/pricing-reference-card.vue'
import { goBack, navigateTo } from '@/utils/router'
import { chooseAndUploadImage } from '@/utils/request'
import { teacherApi, type CertStatus } from '@/lib/teacher-data'
import { courseApi } from '@/lib/course-data'

const statusBarHeight = ref(0)
const loading = ref(true)
const submitting = ref(false)

const certStatus = ref<CertStatus>('none')
const isTeacher = computed(() => certStatus.value === 'approved')

const typeValues = ['VIDEO', 'AUDIO', 'TEXT', 'EBOOK', 'COMBO']
const typeLabels = ['视频课程', '音频课程', '图文课程', '电子书', '组合课程']
const typeIndex = ref(0)

// 课程分类（一级品类 categoryLevel1）：首项为空占位，选空则不触发定价参考。
// 为纯 UI 配置常量（同 productCategories），非 mock 业务数据。
const categoryValues = ['', '国学经典', '诗词歌赋', '易经命理', '书法国画', '茶道香道', '中医养生', '传统礼仪', '历史哲学']
const categoryLabels = ['请选择分类', '国学经典', '诗词歌赋', '易经命理', '书法国画', '茶道香道', '中医养生', '传统礼仪', '历史哲学']
const categoryIndex = ref(0)

const form = reactive({
  title: '',
  cover: '',
  price: '',
  validityDays: '',
  intro: '',
  categoryLevel1: '',
})

const uploadingCover = ref(false)

function onTypeChange(e: { detail: { value: string } }) {
  typeIndex.value = Number(e.detail.value)
}

function onCategoryChange(e: { detail: { value: string } }) {
  categoryIndex.value = Number(e.detail.value)
  form.categoryLevel1 = categoryValues[categoryIndex.value]
}

// 采纳定价参考的中位价（仅填入售价，不自动提交，定价权仍在用户）
function onAdoptPrice(median: number) {
  form.price = String(median)
  uni.showToast({ title: `已填入 ¥${median}`, icon: 'none' })
}

async function chooseCover() {
  if (uploadingCover.value) return
  uploadingCover.value = true
  try {
    form.cover = await chooseAndUploadImage()
  } catch (e) {
    if ((e as Error)?.message && (e as Error).message !== '已取消') uni.showToast({ title: (e as Error).message, icon: 'none' })
  } finally {
    uploadingCover.value = false
  }
}

async function loadCert() {
  loading.value = true
  try {
    const cert = await teacherApi.getMyCertification()
    certStatus.value = cert
      ? (cert.status === 'APPROVED' ? 'approved' : cert.status === 'PENDING' ? 'pending' : cert.status === 'REJECTED' ? 'rejected' : 'none')
      : 'none'
  } catch (e) {
    certStatus.value = 'none'
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  if (submitting.value || !form.title.trim()) return
  submitting.value = true
  try {
    await courseApi.create({
      title: form.title.trim(),
      type: typeValues[typeIndex.value],
      price: form.price ? Number(form.price) : 0,
      intro: form.intro.trim() || undefined,
      cover: form.cover || undefined,
      categoryLevel1: form.categoryLevel1 || undefined,
    })
    uni.showToast({ title: '已提交审核', icon: 'success' })
    setTimeout(() => goBack(), 800)
  } catch (e) {
    const err = e as { message?: string; errMsg?: string }
    const msg = err?.message || err?.errMsg || ''
    if (msg.includes('讲师认证')) {
      uni.showModal({
        title: '需讲师认证',
        content: '请先通过讲师认证后再发布课程。',
        confirmText: '去认证',
        success: (r) => { if (r.confirm) goCertify() },
      })
    } else {
      uni.showToast({ title: msg || '发布失败，请重试', icon: 'none' })
    }
  } finally {
    submitting.value = false
  }
}

function goCertify() {
  navigateTo('/pkg-creator/teacher-certification/index')
}

function back() {
  goBack()
}

onLoad(() => {
  try {
    const info = uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
  } catch (e) {
    statusBarHeight.value = 0
  }
  loadCert()
})
</script>

<style scoped>
.pc-page {
  min-height: 100vh;
  background: #f7f7f7;
}
.pc-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 2rpx solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
}
.pc-back {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pc-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}

/* 状态 / 门控 */
.pc-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 130rpx 48rpx;
  gap: 18rpx;
}
.pc-status-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.pc-status-text {
  font-size: 28rpx;
  color: #999;
}
.pc-status-desc {
  font-size: 26rpx;
  color: #999;
  text-align: center;
  line-height: 1.6;
}

/* 表单 */
.pc-form {
  padding: 28rpx 28rpx 60rpx;
}
.pc-field {
  margin-bottom: 32rpx;
}
.pc-label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 14rpx;
}
.pc-req {
  color: var(--brand);
}
.pc-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background: #fff;
  border-radius: 14rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  box-sizing: border-box;
}
.pc-picker {
  height: 88rpx;
  padding: 0 24rpx;
  background: #fff;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pc-picker-text {
  font-size: 28rpx;
  color: #2c2c2c;
}
.pc-cover {
  width: 100%;
  height: 280rpx;
  background: #fff;
  border-radius: 14rpx;
  overflow: hidden;
}
.pc-cover-img {
  width: 100%;
  height: 100%;
}
.pc-cover-empty {
  width: 100%;
  height: 100%;
  border: 4rpx dashed #e5e5e5;
  border-radius: 14rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  box-sizing: border-box;
}
.pc-cover-text {
  font-size: 26rpx;
  color: #999;
}
.pc-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 14rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  box-sizing: border-box;
}
.pc-ph {
  color: #bbb;
}
.pc-hint {
  display: block;
  font-size: 24rpx;
  color: #999;
  line-height: 1.6;
  margin-bottom: 32rpx;
}
.pc-footer {
  margin-top: 8rpx;
}
.pc-btn {
  height: 88rpx;
  line-height: 88rpx;
  background: var(--brand);
  color: #fff;
  font-size: 30rpx;
  border-radius: 999rpx;
}
.pc-btn-full {
  width: 100%;
}
.pc-btn-disabled {
  opacity: 0.5;
}
</style>
