<template>
  <view class="bc-page">
    <!-- Header -->
    <view class="bc-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="bc-header-row">
        <view class="bc-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="48" color="#2c2c2c" />
        </view>
        <text class="bc-header-title">发布悬赏</text>
        <view class="bc-header-spacer" />
      </view>
    </view>

    <view class="bc-body">
      <!-- Tips -->
      <view class="bc-tips">
        <app-icon name="flame" :size="40" color="#f59e0b" />
        <view class="bc-tips-body">
          <text class="bc-tips-title">发布须知</text>
          <text class="bc-tips-text">悬赏发布后将冻结对应国学币，采纳满意答案后自动结算给答主。若撤销或长期无人回答，赏金将退回钱包。</text>
        </view>
      </view>

      <!-- Title -->
      <view class="bc-card">
        <view class="bc-label-row">
          <text class="bc-label">悬赏标题 <text class="bc-required">*</text></text>
        </view>
        <input
          v-model="title"
          class="bc-input"
          :class="{ 'bc-input-error': errors.title }"
          placeholder="请用一句话概括你的问题（10-50字）"
          :maxlength="50"
          @input="errors.title = ''"
        />
        <view class="bc-input-foot">
          <view v-if="errors.title" class="bc-err">
            <app-icon name="alert-circle" :size="24" color="#ef4444" />
            <text class="bc-err-text">{{ errors.title }}</text>
          </view>
          <view v-else />
          <text class="bc-count">{{ title.length }}/50</text>
        </view>
      </view>

      <!-- Description -->
      <view class="bc-card">
        <view class="bc-label-row">
          <text class="bc-label">问题描述 <text class="bc-required">*</text></text>
        </view>
        <textarea
          v-model="description"
          class="bc-textarea"
          :class="{ 'bc-input-error': errors.description }"
          placeholder="详细描述你的问题，可提供出生日期、地点等背景信息，有助于获得更好的回答（20-500字）"
          :maxlength="500"
          @input="errors.description = ''"
        />
        <view class="bc-input-foot">
          <view v-if="errors.description" class="bc-err">
            <app-icon name="alert-circle" :size="24" color="#ef4444" />
            <text class="bc-err-text">{{ errors.description }}</text>
          </view>
          <view v-else />
          <text class="bc-count">{{ description.length }}/500</text>
        </view>
      </view>

      <!-- Images -->
      <view class="bc-card">
        <text class="bc-label">配图（选填，最多9张）</text>
        <view class="bc-upload-grid">
          <view v-for="(img, index) in images" :key="index" class="bc-upload-item">
            <image :src="img" class="bc-upload-img" mode="aspectFill" />
            <view class="bc-upload-remove" @tap="removeImage(index)">
              <app-icon name="x" :size="20" color="#ffffff" />
            </view>
          </view>
          <view v-if="images.length < 9" class="bc-upload-add" @tap="addImage">
            <app-icon v-if="!uploading" name="image" :size="36" color="#999999" />
            <text v-else class="bc-upload-add-text">上传中</text>
            <text v-if="!uploading" class="bc-upload-add-text">{{ images.length }}/9</text>
          </view>
        </view>
      </view>

      <!-- Amount -->
      <view class="bc-card">
        <view class="bc-label-row">
          <text class="bc-label">悬赏金额 <text class="bc-required">*</text></text>
        </view>
        <view class="bc-amount-grid">
          <view
            v-for="amount in amountPresets"
            :key="amount"
            class="bc-amount-item"
            :class="{ 'bc-amount-item-active': !isCustom && selectedAmount === amount }"
            @tap="selectAmount(amount)"
          >
            <text class="bc-amount-item-text" :class="{ 'bc-amount-item-text-active': !isCustom && selectedAmount === amount }">{{ amount }} 币</text>
          </view>
        </view>
        <view
          class="bc-custom-btn"
          :class="{ 'bc-custom-btn-active': isCustom }"
          @tap="enableCustom"
        >
          <text class="bc-custom-btn-text" :class="{ 'bc-custom-btn-text-active': isCustom }">自定义金额</text>
        </view>
        <view v-if="isCustom" class="bc-custom-input" :class="{ 'bc-input-error': errors.amount }">
          <input
            v-model="customAmount"
            type="number"
            class="bc-custom-input-field"
            placeholder="请输入国学币数量（10-10000）"
          />
          <text class="bc-custom-input-unit">国学币</text>
        </view>
        <view v-if="errors.amount" class="bc-err bc-err-mt">
          <app-icon name="alert-circle" :size="24" color="#ef4444" />
          <text class="bc-err-text">{{ errors.amount }}</text>
        </view>
      </view>

      <!-- Category -->
      <view class="bc-card">
        <view class="bc-label-row bc-label-icon">
          <app-icon name="tag" :size="32" color="#c9a96e" />
          <text class="bc-label">分类</text>
        </view>
        <view class="bc-cat-wrap">
          <view
            v-for="cat in categoryOptions"
            :key="cat.key"
            class="bc-cat"
            :class="{ 'bc-cat-active': category === cat.key }"
            @tap="category = cat.key"
          >
            <text class="bc-cat-text" :class="{ 'bc-cat-text-active': category === cat.key }">{{ cat.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Bottom Bar -->
    <view class="bc-bottom">
      <view class="bc-bottom-summary">
        <text class="bc-bottom-tip">悬赏金额将被冻结，采纳后结算</text>
        <view class="bc-bottom-amount">
          <app-icon name="coins" :size="32" color="#c9a96e" />
          <text class="bc-bottom-amount-text">{{ finalAmount }} 国学币</text>
        </view>
      </view>
      <view class="bc-submit" @tap="handleSubmit">
        <text class="bc-submit-text">发布悬赏</text>
      </view>
    </view>

    <!-- Pay Confirm Modal -->
    <view v-if="showPayConfirm" class="bc-modal-mask" @tap="showPayConfirm = false">
      <view class="bc-modal" @tap.stop>
        <view class="bc-modal-handle" />
        <text class="bc-modal-title">确认支付</text>
        <text class="bc-modal-sub">支付成功后将发布悬赏，悬赏金额将被冻结</text>
        <view class="bc-modal-summary">
          <view class="bc-modal-line">
            <text class="bc-modal-line-label">悬赏标题</text>
            <text class="bc-modal-line-value">{{ title }}</text>
          </view>
          <view class="bc-modal-line">
            <text class="bc-modal-line-label">分类</text>
            <text class="bc-modal-line-value">{{ categoryLabel }}</text>
          </view>
          <view class="bc-modal-line bc-modal-line-total">
            <text class="bc-modal-total-label">悬赏金额</text>
            <text class="bc-modal-total-value">{{ finalAmount }} 国学币</text>
          </view>
        </view>
        <view class="bc-modal-pay" :class="{ 'bc-modal-pay-loading': submitting }" @tap="confirmPay">
          <app-icon v-if="!submitting" name="check-circle" :size="32" color="#ffffff" />
          <text class="bc-modal-pay-text">{{ submitting ? '处理中...' : '确认支付 ' + finalAmount + ' 国学币' }}</text>
        </view>
        <view class="bc-modal-cancel" @tap="showPayConfirm = false">
          <text class="bc-modal-cancel-text">取消</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { chooseAndUploadImage } from '@/utils/request'
import {
  bountyApi,
  BOUNTY_CATEGORY_OPTIONS,
  BOUNTY_CATEGORY_LABEL,
  type BountyCategory,
} from '@/lib/bounty-data'

const amountPresets = [10, 20, 50, 100, 200, 500]
const categoryOptions = BOUNTY_CATEGORY_OPTIONS

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const title = ref('')
const description = ref('')
const images = ref<string[]>([])
const uploading = ref(false)
const selectedAmount = ref(50)
const customAmount = ref('')
const isCustom = ref(false)
const category = ref<BountyCategory>('BAZI')
const showPayConfirm = ref(false)
const submitting = ref(false)
const errors = ref<Record<string, string>>({})

const finalAmount = computed(() => (isCustom.value ? parseInt(customAmount.value) || 0 : selectedAmount.value))
const categoryLabel = computed(() => BOUNTY_CATEGORY_LABEL[category.value])

function selectAmount(amount: number) {
  selectedAmount.value = amount
  isCustom.value = false
  errors.value.amount = ''
}
function enableCustom() {
  isCustom.value = true
  errors.value.amount = ''
}

async function addImage() {
  if (images.value.length >= 9 || uploading.value) return
  uploading.value = true
  try {
    const url = await chooseAndUploadImage()
    images.value = [...images.value, url].slice(0, 9)
  } catch (e: any) {
    if (e?.message && e.message !== '已取消') uni.showToast({ title: e.message, icon: 'none' })
  } finally {
    uploading.value = false
  }
}
function removeImage(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}

function validate() {
  const e: Record<string, string> = {}
  if (!title.value.trim()) e.title = '请填写悬赏标题'
  else if (title.value.trim().length < 10) e.title = '标题至少10个字'
  if (!description.value.trim()) e.description = '请填写问题描述'
  else if (description.value.trim().length < 20) e.description = '描述至少20个字'
  if (finalAmount.value < 10) e.amount = '最低悬赏金额为10国学币'
  else if (finalAmount.value > 10000) e.amount = '最高悬赏金额为10000国学币'
  errors.value = e
  return Object.keys(e).length === 0
}

function handleSubmit() {
  if (!validate()) return
  showPayConfirm.value = true
}

async function confirmPay() {
  if (submitting.value) return
  submitting.value = true
  try {
    await bountyApi.create({
      title: title.value.trim(),
      description: description.value.trim(),
      bountyCoin: finalAmount.value,
      category: category.value,
      images: images.value,
    })
    showPayConfirm.value = false
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => navigateTo('/bounty'), 800)
  } catch (e: any) {
    showPayConfirm.value = false
    const msg = e?.message || '发布失败'
    // 余额不足给充值引导，其余异常直接 toast 后端 message
    if (msg.includes('余额') || msg.includes('不足')) {
      uni.showModal({
        title: '国学币余额不足',
        content: `本次需 ${finalAmount.value} 国学币，余额不足，是否前往充值？`,
        confirmText: '去充值',
        success: (res) => { if (res.confirm) navigateTo('/wallet/recharge') },
      })
    } else {
      uni.showToast({ title: msg, icon: 'none' })
    }
  } finally {
    submitting.value = false
  }
}

function goBack() {
  navigateBack()
}
</script>

<style scoped>
.bc-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 220rpx;
}

/* Header */
.bc-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #ffffff;
  border-bottom: 2rpx solid #e8e3db;
}
.bc-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 96rpx;
  padding: 0 24rpx;
}
.bc-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52rpx;
  height: 52rpx;
}
.bc-header-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
  font-family: var(--font-serif, serif);
}
.bc-header-spacer {
  width: 52rpx;
}

/* Body */
.bc-body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

/* Tips */
.bc-tips {
  display: flex;
  gap: 24rpx;
  padding: 32rpx;
  background: #fffbeb;
  border: 2rpx solid #fde68a;
  border-radius: 32rpx;
}
.bc-tips-body {
  flex: 1;
}
.bc-tips-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #92400e;
}
.bc-tips-text {
  display: block;
  font-size: 22rpx;
  color: #b45309;
  line-height: 1.6;
  margin-top: 8rpx;
}

/* Card */
.bc-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.06);
}
.bc-label-row {
  margin-bottom: 24rpx;
}
.bc-label-icon {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.bc-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.bc-required {
  color: var(--brand);
}
.bc-input {
  width: 100%;
  font-size: 28rpx;
  background: #faf8f5;
  border-radius: 24rpx;
  padding: 24rpx;
  border: 2rpx solid transparent;
  box-sizing: border-box;
}
.bc-textarea {
  width: 100%;
  height: 200rpx;
  font-size: 28rpx;
  background: #faf8f5;
  border-radius: 24rpx;
  padding: 24rpx;
  border: 2rpx solid transparent;
  box-sizing: border-box;
}
.bc-input-error {
  border-color: #f87171;
}
.bc-input-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.bc-err {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.bc-err-mt {
  margin-top: 8rpx;
}
.bc-err-text {
  font-size: 22rpx;
  color: #ef4444;
}
.bc-count {
  font-size: 22rpx;
  color: #999999;
}

/* Upload */
.bc-upload-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 24rpx;
}
.bc-upload-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
}
.bc-upload-img {
  width: 100%;
  height: 100%;
  border-radius: 16rpx;
}
.bc-upload-remove {
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
.bc-upload-add {
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
.bc-upload-add-text {
  font-size: 22rpx;
  color: #999999;
}

/* Amount */
.bc-amount-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.bc-amount-item {
  padding: 24rpx 0;
  text-align: center;
  border-radius: 24rpx;
  background: #faf8f5;
  border: 2rpx solid #e8e3db;
}
.bc-amount-item-active {
  background: var(--brand);
  border-color: var(--brand);
}
.bc-amount-item-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.bc-amount-item-text-active {
  color: #ffffff;
}
.bc-custom-btn {
  padding: 24rpx 0;
  text-align: center;
  border-radius: 24rpx;
  background: #faf8f5;
  border: 2rpx solid #e8e3db;
}
.bc-custom-btn-active {
  background: rgba(196, 30, 58, 0.05);
  border-color: var(--brand);
}
.bc-custom-btn-text {
  font-size: 28rpx;
  color: #666666;
}
.bc-custom-btn-text-active {
  color: var(--brand);
}
.bc-custom-input {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  background: #faf8f5;
  border-radius: 24rpx;
  padding: 24rpx;
  border: 2rpx solid transparent;
}
.bc-custom-input-field {
  flex: 1;
  font-size: 28rpx;
}
.bc-custom-input-unit {
  font-size: 28rpx;
  color: #999999;
  margin-left: 16rpx;
}

/* Category */
.bc-cat-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.bc-cat {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: #faf8f5;
  border: 2rpx solid #e8e3db;
}
.bc-cat-active {
  background: var(--brand);
  border-color: var(--brand);
}
.bc-cat-text {
  font-size: 24rpx;
  color: #666666;
}
.bc-cat-text-active {
  color: #ffffff;
}

/* Bottom */
.bc-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 2rpx solid #e8e3db;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
}
.bc-bottom-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
  padding: 0 8rpx;
}
.bc-bottom-tip {
  font-size: 22rpx;
  color: #999999;
}
.bc-bottom-amount {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.bc-bottom-amount-text {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--brand);
}
.bc-submit {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--brand);
  border-radius: 32rpx;
}
.bc-submit-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}

/* Pay Modal */
.bc-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
}
.bc-modal {
  width: 100%;
  background: #ffffff;
  border-radius: 48rpx 48rpx 0 0;
  padding: 48rpx 48rpx calc(64rpx + env(safe-area-inset-bottom));
}
.bc-modal-handle {
  width: 80rpx;
  height: 8rpx;
  background: #e8e3db;
  border-radius: 999rpx;
  margin: 0 auto 48rpx;
}
.bc-modal-title {
  display: block;
  text-align: center;
  font-size: 36rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-bottom: 16rpx;
  font-family: var(--font-serif, serif);
}
.bc-modal-sub {
  display: block;
  text-align: center;
  font-size: 26rpx;
  color: #999999;
  margin-bottom: 48rpx;
}
.bc-modal-summary {
  background: #faf8f5;
  border-radius: 32rpx;
  padding: 32rpx;
  margin-bottom: 40rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.bc-modal-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bc-modal-line-label {
  font-size: 26rpx;
  color: #999999;
}
.bc-modal-line-value {
  font-size: 26rpx;
  color: #2c2c2c;
  font-weight: 500;
  max-width: 60%;
  text-align: right;
}
.bc-modal-line-total {
  border-top: 2rpx solid #e8e3db;
  padding-top: 24rpx;
}
.bc-modal-total-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.bc-modal-total-value {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--brand);
}
.bc-modal-pay {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  background: var(--brand);
  border-radius: 32rpx;
}
.bc-modal-pay-loading {
  opacity: 0.7;
}
.bc-modal-pay-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
}
.bc-modal-cancel {
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16rpx;
}
.bc-modal-cancel-text {
  font-size: 28rpx;
  color: #999999;
}
</style>
