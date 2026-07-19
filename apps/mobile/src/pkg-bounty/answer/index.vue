<template>
  <view class="ba-page">
    <!-- Header -->
    <view class="ba-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ba-header-row">
        <view class="ba-header-left">
          <view class="ba-icon-btn" @tap="goBack">
            <app-icon name="chevron-left" :size="40" color="#2c2c2c" />
          </view>
          <text class="ba-header-title">回答悬赏</text>
        </view>
        <text class="ba-header-count">{{ content.length }}/2000</text>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="ba-loading">
      <view class="ba-sk-block ba-sk-h120" />
      <view class="ba-sk-block ba-sk-h240" />
    </view>

    <!-- Error -->
    <app-error v-else-if="error" title="悬赏加载失败" desc="网络异常，请稍后重试" @retry="loadBounty" />

    <view v-else-if="!bounty" class="ba-notfound">
      <text class="ba-notfound-text">悬赏不存在</text>
    </view>

    <template v-else>
      <view class="ba-body">
        <!-- Bounty Reference Card -->
        <view class="ba-ref">
          <view class="ba-ref-head">
            <view class="ba-ref-amount">
              <view class="ba-ref-gift">
                <app-icon name="gift" :size="32" color="#ffffff" />
              </view>
              <text class="ba-ref-amount-text">{{ bounty.bountyCoin > 0 ? bounty.bountyCoin + ' 币' : '赏金待定' }}</text>
            </view>
            <view v-if="bounty.status === 'CLAIMED' && bounty.lockExpireAt" class="ba-ref-remain">
              <app-icon name="clock" :size="24" color="#d97706" />
              <text class="ba-ref-remain-text">{{ remainingLockTime(bounty.lockExpireAt) }}</text>
            </view>
          </view>
          <text class="ba-ref-title">{{ bounty.title }}</text>
          <text class="ba-ref-desc">{{ bounty.description }}</text>
          <view class="ba-ref-foot">
            <text v-if="categoryLabel" class="ba-ref-cat">{{ categoryLabel }}</text>
          </view>
        </view>

        <!-- 不可回答提示（他人已抢 / 已结束 / 提问者本人） -->
        <view v-if="!canAnswer" class="ba-blocked">
          <app-icon name="alert-circle" :size="40" color="#ea580c" />
          <text class="ba-blocked-text">{{ blockedReason }}</text>
        </view>

        <template v-else>
          <!-- Answer Input -->
          <view class="ba-input-card">
            <view class="ba-input-head">
              <app-icon name="send" :size="32" color="#c41e3a" />
              <text class="ba-input-title">我的回答</text>
            </view>
            <textarea
              v-model="content"
              class="ba-textarea"
              placeholder="请输入您的回答，至少20字...&#10;&#10;提示：详细、专业的回答更容易被采纳获得赏金"
              :maxlength="2000"
              @input="error2 = ''"
            />
            <!-- Image Upload -->
            <view class="ba-upload">
              <view class="ba-upload-label">
                <app-icon name="image" :size="28" color="#999999" />
                <text class="ba-upload-label-text">添加配图（选填，最多9张）</text>
              </view>
              <view class="ba-upload-grid">
                <view v-for="(img, index) in images" :key="index" class="ba-upload-item">
                  <image :src="img" class="ba-upload-img" mode="aspectFill" />
                  <view class="ba-upload-remove" @tap="removeImage(index)">
                    <app-icon name="x" :size="20" color="#ffffff" />
                  </view>
                </view>
                <view v-if="images.length < 9" class="ba-upload-add" @tap="addImage">
                  <app-icon v-if="!uploading" name="image" :size="36" color="#999999" />
                  <text class="ba-upload-add-text">{{ uploading ? '上传中' : images.length + '/9' }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- Tips -->
          <view class="ba-tips">
            <text class="ba-tips-title">回答提示</text>
            <view class="ba-tips-list">
              <text class="ba-tips-item">• 提交回答即视为抢答该悬赏，一条悬赏仅一位答主</text>
              <text class="ba-tips-item">• 回答被提问者采纳后，赏金将全额结算给你</text>
              <text class="ba-tips-item">• 请认真作答，详细、专业的回答更容易被采纳</text>
              <text class="ba-tips-item">• 禁止发布违规内容，违者将被封禁</text>
            </view>
          </view>

          <!-- Error -->
          <view v-if="error2" class="ba-error">
            <app-icon name="alert-circle" :size="28" color="#ef4444" />
            <text class="ba-error-text">{{ error2 }}</text>
          </view>
        </template>
      </view>

      <!-- Bottom -->
      <view v-if="canAnswer" class="ba-bottom">
        <view class="ba-bottom-info">
          <text class="ba-bottom-words">回答字数：<text :class="content.length < 20 ? 'ba-words-red' : 'ba-words-green'">{{ content.length }}</text>/2000</text>
          <text class="ba-bottom-reward">可获赏金：<text class="ba-reward-num">{{ bounty.bountyCoin > 0 ? bounty.bountyCoin + ' 币' : '待定' }}</text></text>
        </view>
        <view
          class="ba-submit"
          :class="{ 'ba-submit-disabled': submitting || content.length < 20 }"
          @tap="submit"
        >
          <app-icon name="send" :size="36" color="#ffffff" />
          <text class="ba-submit-text">{{ submitting ? '提交中...' : '提交回答' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { chooseAndUploadImage } from '@/utils/request'
import {
  bountyApi,
  getMyUserId,
  remainingLockTime,
  BOUNTY_CATEGORY_LABEL,
  type BountyQuestion,
} from '@/pkg-bounty/lib/bounty-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const bountyId = ref('')
const myId = getMyUserId()
const bounty = ref<BountyQuestion | null>(null)
const content = ref('')
const images = ref<string[]>([])
const uploading = ref(false)
const loading = ref(true)
const submitting = ref(false)
const error = ref(false)   // 加载错误态
const error2 = ref('')     // 表单/提交错误提示

const categoryLabel = computed(() =>
  bounty.value ? BOUNTY_CATEGORY_LABEL[bounty.value.category as keyof typeof BOUNTY_CATEGORY_LABEL] || '' : '',
)

// 可回答：OPEN（可抢答）或 CLAIMED 且我是答主（已抢答·继续作答）
const canAnswer = computed(() => {
  const b = bounty.value
  if (!b) return false
  if (b.askerId === myId) return false
  if (b.status === 'OPEN') return true
  if (b.status === 'CLAIMED' && b.answererId === myId) return true
  return false
})
const blockedReason = computed(() => {
  const b = bounty.value
  if (!b) return ''
  if (b.askerId === myId) return '不能回答自己发布的悬赏'
  if (b.status === 'CLAIMED') return '该悬赏已被其他答主抢答'
  if (b.status === 'ANSWERED') return '该悬赏已有回答，等待提问者采纳'
  return '该悬赏已结束，无法回答'
})

async function loadBounty() {
  loading.value = true
  error.value = false
  try {
    bounty.value = await bountyApi.detail(bountyId.value)
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

async function addImage() {
  if (images.value.length >= 9 || uploading.value) return
  uploading.value = true
  try {
    const url = await chooseAndUploadImage()
    images.value = [...images.value, url].slice(0, 9)
    error2.value = ''
  } catch (e: any) {
    if (e?.message && e.message !== '已取消') uni.showToast({ title: e.message, icon: 'none' })
  } finally {
    uploading.value = false
  }
}
function removeImage(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}

async function submit() {
  if (submitting.value) return
  if (content.value.trim().length < 20) {
    error2.value = '回答内容至少20字'
    return
  }
  submitting.value = true
  error2.value = ''
  try {
    // OPEN 需先抢答锁定答主身份，再提交回答；CLAIMED（我已抢）直接提交
    if (bounty.value?.status === 'OPEN') {
      await bountyApi.claim(bountyId.value)
    }
    await bountyApi.answer(bountyId.value, {
      answer: content.value.trim(),
      images: images.value,
    })
    uni.showToast({ title: '提交成功', icon: 'success' })
    setTimeout(() => navigateTo(`/bounty/${bountyId.value}`), 800)
  } catch (e: any) {
    error2.value = e?.message || '提交失败，请重试'
  } finally {
    submitting.value = false
  }
}

function goBack() {
  navigateBack()
}

try {
  const pages = getCurrentPages()
  const cur = pages[pages.length - 1] as unknown as { options?: Record<string, string>; $page?: { options?: Record<string, string> } }
  const opts = cur?.options || cur?.$page?.options || {}
  bountyId.value = opts.id || ''
} catch (e) {
  bountyId.value = ''
}

loadBounty()
</script>

<style scoped>
.ba-page {
  min-height: 100vh;
  background: #ffffff;
  padding-bottom: 220rpx;
}

/* Header */
.ba-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #ffffff;
  border-bottom: 2rpx solid #e8e3db;
}
.ba-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 96rpx;
  padding: 0 24rpx;
}
.ba-header-left {
  display: flex;
  align-items: center;
}
.ba-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
}
.ba-header-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-left: 8rpx;
}
.ba-header-count {
  font-size: 22rpx;
  color: #999999;
}

/* Loading */
.ba-loading {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.ba-sk-block {
  border-radius: 32rpx;
  background: #ececec;
}
.ba-sk-h120 { height: 240rpx; }
.ba-sk-h240 { height: 480rpx; }
.ba-notfound {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}
.ba-notfound-text {
  font-size: 28rpx;
  color: #999999;
}

/* Body */
.ba-body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

/* Reference Card */
.ba-ref {
  background: linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%);
  border-radius: 32rpx;
  padding: 32rpx;
  border: 2rpx solid #fef3c7;
}
.ba-ref-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.ba-ref-amount {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.ba-ref-gift {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #fbbf24, #f97316);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ba-ref-amount-text {
  font-size: 36rpx;
  font-weight: 700;
  color: #d97706;
}
.ba-ref-remain {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.ba-ref-remain-text {
  font-size: 22rpx;
  color: #d97706;
}
.ba-ref-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 16rpx;
  line-height: 1.4;
}
.ba-ref-desc {
  display: block;
  font-size: 26rpx;
  color: #999999;
  line-height: 1.5;
  margin-bottom: 24rpx;
}
.ba-ref-foot {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.ba-ref-cat {
  font-size: 22rpx;
  color: #d97706;
  background: rgba(217, 119, 6, 0.1);
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

/* Blocked */
.ba-blocked {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 40rpx 32rpx;
  background: #fff7ed;
  border-radius: 24rpx;
}
.ba-blocked-text {
  font-size: 28rpx;
  color: #ea580c;
}

/* Input Card */
.ba-input-card {
  background: #ffffff;
  border-radius: 32rpx;
  border: 2rpx solid #e8e3db;
  overflow: hidden;
}
.ba-input-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 32rpx 32rpx 0;
}
.ba-input-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.ba-textarea {
  width: 100%;
  height: 320rpx;
  margin: 24rpx 0;
  padding: 24rpx 32rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  box-sizing: border-box;
}
.ba-upload {
  padding: 0 32rpx 32rpx;
}
.ba-upload-label {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}
.ba-upload-label-text {
  font-size: 26rpx;
  color: #999999;
}
.ba-upload-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.ba-upload-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
}
.ba-upload-img {
  width: 100%;
  height: 100%;
  border-radius: 16rpx;
}
.ba-upload-remove {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ba-upload-add {
  width: 160rpx;
  height: 160rpx;
  border: 2rpx dashed #e8e3db;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.ba-upload-add-text {
  font-size: 22rpx;
  color: #999999;
}

/* Tips */
.ba-tips {
  background: #eff6ff;
  border-radius: 24rpx;
  padding: 32rpx;
}
.ba-tips-title {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #1e40af;
  margin-bottom: 16rpx;
}
.ba-tips-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.ba-tips-item {
  font-size: 22rpx;
  color: #1d4ed8;
  line-height: 1.6;
}

/* Error */
.ba-error {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx;
  background: #fef2f2;
  border-radius: 24rpx;
}
.ba-error-text {
  font-size: 26rpx;
  color: #ef4444;
}

/* Bottom */
.ba-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 2rpx solid #e8e3db;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
}
.ba-bottom-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.ba-bottom-words {
  font-size: 26rpx;
  color: #999999;
}
.ba-words-red { color: #ef4444; }
.ba-words-green { color: #22c55e; }
.ba-bottom-reward {
  font-size: 26rpx;
  color: #2c2c2c;
}
.ba-reward-num {
  color: #d97706;
  font-weight: 700;
}
.ba-submit {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  background: linear-gradient(90deg, #f59e0b, #f97316);
  border-radius: 24rpx;
}
.ba-submit-disabled {
  opacity: 0.5;
}
.ba-submit-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
}
</style>
