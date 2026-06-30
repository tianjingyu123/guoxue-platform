<template>
  <!-- 提交成功态 -->
  <view v-if="submitted" class="success-page">
    <view class="success-icon">
      <AppIcon name="star" :size="32" color="#C9A96E" :fill="true" />
    </view>
    <text class="success-title">感谢您的评价！</text>
    <text class="success-desc">您的反馈帮助我们持续改进直播质量</text>
    <view class="success-btn" @tap="goBack">
      <text class="success-btn-txt">返回回放</text>
    </view>
  </view>

  <!-- 评价表单 -->
  <view v-else class="page">
    <!-- 顶部 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @tap="goBack">
          <AppIcon name="arrow-left" :size="20" color="#2C2C2C" />
        </view>
        <text class="nav-title">评价回放</text>
      </view>
    </view>

    <view class="body">
      <!-- 直播信息 -->
      <view class="info-card">
        <text class="info-hint">您正在评价</text>
        <text class="info-title">八字命理精讲系列</text>
        <text class="info-sub">直播回放 #{{ id }}</text>
      </view>

      <!-- 整体评分 -->
      <view class="rating-section">
        <text class="section-label">整体评分</text>
        <view class="stars">
          <view v-for="s in 5" :key="s" class="star-btn" @tap="onRate(s)">
            <AppIcon name="star" :size="40" :color="s <= rating ? '#C9A96E' : '#999999'" :fill="s <= rating" />
          </view>
        </view>
        <text
          v-if="rating > 0"
          class="rating-label"
          :class="rating >= 4 ? 'label-good' : rating === 3 ? 'label-mid' : 'label-bad'"
        >{{ ratingLabels[rating] }}</text>
      </view>

      <!-- 维度评分 -->
      <view v-if="rating > 0" class="aspect-card">
        <text class="section-label">细项评分</text>
        <view v-for="a in aspects" :key="a.key" class="aspect-row">
          <text class="aspect-label">{{ a.label }}</text>
          <view class="aspect-stars">
            <view v-for="s in 5" :key="s" class="aspect-star-btn" @tap="setAspect(a.key, s)">
              <AppIcon name="star" :size="20" :color="s <= (aspectRatings[a.key] || 0) ? '#C9A96E' : '#999999'" :fill="s <= (aspectRatings[a.key] || 0)" />
            </view>
          </view>
        </view>
      </view>

      <!-- 标签选择 -->
      <view v-if="rating > 0 && currentTags.length > 0" class="tags-section">
        <text class="section-label">选择标签（可多选）</text>
        <view class="tags-list">
          <view
            v-for="tag in currentTags"
            :key="tag"
            class="tag-chip"
            :class="{ active: selectedTags.includes(tag) }"
            @tap="toggleTag(tag)"
          >
            <text class="tag-txt" :class="{ 'tag-txt-active': selectedTags.includes(tag) }">{{ tag }}</text>
          </view>
        </view>
      </view>

      <!-- 文字评价 -->
      <view class="text-section">
        <view class="text-head">
          <text class="section-label">文字评价（选填）</text>
          <text class="text-count">{{ content.length }}/300</text>
        </view>
        <textarea
          class="text-area"
          v-model="content"
          placeholder="分享您对这次直播的感受和建议..."
          :maxlength="300"
        />
      </view>
    </view>

    <!-- 固定提交 -->
    <view class="bottom-bar" :style="{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16rpx)' }">
      <view
        class="submit-btn"
        :class="{ disabled: rating === 0 }"
        @tap="onSubmit"
      >
        <AppIcon v-if="submitting" name="loader-2" :size="16" color="#fff" class="spin" />
        <text class="submit-txt" :class="{ 'submit-txt-disabled': rating === 0 }">{{ submitting ? '提交中...' : '提交评价' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { replayCommentAspects, replayCommentTagsByRating, replayCommentLabels } from '@/lib/live-data'

const statusBarHeight = ref(0)

// UI 临时状态
const id = ref('1')
const aspects = ref(replayCommentAspects)
const ratingLabels = replayCommentLabels
const rating = ref(0)
const aspectRatings = ref<Record<string, number>>({})
const selectedTags = ref<string[]>([])
const content = ref('')
const submitting = ref(false)
const submitted = ref(false)

const currentTags = computed(() => replayCommentTagsByRating[rating.value] ?? [])

function onRate(s: number) {
  rating.value = s
  selectedTags.value = []
}
function setAspect(key: string, s: number) {
  aspectRatings.value = { ...aspectRatings.value, [key]: s }
}
function toggleTag(tag: string) {
  if (selectedTags.value.includes(tag)) {
    selectedTags.value = selectedTags.value.filter((t) => t !== tag)
  } else {
    selectedTags.value = [...selectedTags.value, tag]
  }
}
function onSubmit() {
  if (rating.value === 0 || submitting.value) return
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    submitted.value = true
  }, 900)
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #FAF8F5;
}

/* 顶部 */
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #FAF8F5;
  border-bottom: 1rpx solid #E8E3DB;
}
.nav-inner {
  display: flex;
  align-items: center;
  height: 96rpx;
  padding: 0 32rpx;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
  margin-left: 24rpx;
}

.body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 48rpx;
}

/* 直播信息 */
.info-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  border: 1rpx solid #E8E3DB;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.info-hint {
  font-size: 22rpx;
  color: #999999;
  margin-bottom: 8rpx;
}
.info-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.info-sub {
  font-size: 22rpx;
  color: #999999;
  margin-top: 4rpx;
}

/* 整体评分 */
.rating-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.section-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.stars {
  display: flex;
  gap: 24rpx;
  margin-top: 24rpx;
  margin-bottom: 16rpx;
}
.star-btn {
  display: flex;
}
.rating-label {
  font-size: 28rpx;
  font-weight: 600;
}
.label-good {
  color: #52c41a;
}
.label-mid {
  color: #999999;
}
.label-bad {
  color: #ff4d4f;
}

/* 维度评分 */
.aspect-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  border: 1rpx solid #E8E3DB;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.aspect-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.aspect-label {
  font-size: 28rpx;
  color: #999999;
}
.aspect-stars {
  display: flex;
  gap: 12rpx;
}
.aspect-star-btn {
  display: flex;
}

/* 标签 */
.tags-section {
  display: flex;
  flex-direction: column;
}
.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 20rpx;
}
.tag-chip {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  border: 1rpx solid #E8E3DB;
  background: #fff;
}
.tag-chip.active {
  background: var(--brand);
  border-color: var(--brand);
}
.tag-txt {
  font-size: 22rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.tag-txt-active {
  color: #fff;
}

/* 文字评价 */
.text-section {
  display: flex;
  flex-direction: column;
}
.text-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.text-count {
  font-size: 22rpx;
  color: #999999;
}
.text-area {
  width: 100%;
  min-height: 200rpx;
  padding: 24rpx;
  font-size: 28rpx;
  color: #2C2C2C;
  background: #fff;
  border: 1rpx solid #E8E3DB;
  border-radius: 16rpx;
  box-sizing: border-box;
}

/* 固定提交 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  border-top: 1rpx solid #E8E3DB;
  padding: 32rpx;
}
.submit-btn {
  width: 100%;
  height: 88rpx;
  background: var(--brand);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.submit-btn.disabled {
  background: #3d3a37;
  opacity: 0.3;
}
.submit-txt {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}
.submit-txt-disabled {
  color: #999999;
}

/* 成功态 */
.success-page {
  min-height: 100vh;
  background: #FAF8F5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 48rpx;
  gap: 32rpx;
}
.success-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: rgba(201, 169, 110, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}
.success-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #2C2C2C;
}
.success-desc {
  font-size: 28rpx;
  color: #999999;
}
.success-btn {
  margin-top: 32rpx;
  width: 100%;
  height: 88rpx;
  background: var(--brand);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.success-btn-txt {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}

.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
