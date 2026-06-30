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
          <text class="bc-tips-text">悬赏发布后将冻结对应国学币，采纳满意答案后自动结算。若无满意回答，到期后退回钱包。</text>
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
          placeholder="详细描述你的问题，提供更多背景信息有助于获得更好的回答（20-500字）"
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

      <!-- Supplementary -->
      <view class="bc-card">
        <text class="bc-label">补充说明</text>
        <text class="bc-sublabel">可提供出生日期、地点等具体信息（选填）</text>
        <textarea
          v-model="content"
          class="bc-textarea"
          placeholder="补充具体信息..."
          :maxlength="500"
        />
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

      <!-- Expire -->
      <view class="bc-card">
        <view class="bc-label-row bc-label-icon">
          <app-icon name="clock" :size="32" color="#c9a96e" />
          <text class="bc-label">有效期</text>
        </view>
        <view class="bc-expire-grid">
          <view
            v-for="opt in expireOptions"
            :key="opt.value"
            class="bc-expire-item"
            :class="{ 'bc-expire-item-active': expireDays === opt.value }"
            @tap="expireDays = opt.value"
          >
            <text class="bc-expire-label" :class="{ 'bc-expire-label-active': expireDays === opt.value }">{{ opt.label }}</text>
            <text class="bc-expire-desc">{{ opt.desc }}</text>
          </view>
        </view>
      </view>

      <!-- Category & Tags -->
      <view class="bc-card">
        <view class="bc-label-row bc-label-icon">
          <app-icon name="tag" :size="32" color="#c9a96e" />
          <text class="bc-label">分类标签（选填）</text>
        </view>
        <view class="bc-cat-wrap">
          <view
            v-for="cat in categoryOptions"
            :key="cat"
            class="bc-cat"
            :class="{ 'bc-cat-active': category === cat }"
            @tap="toggleCategory(cat)"
          >
            <text class="bc-cat-text" :class="{ 'bc-cat-text-active': category === cat }">{{ cat }}</text>
          </view>
        </view>
        <view v-if="tags.length" class="bc-tag-wrap">
          <view v-for="tag in tags" :key="tag" class="bc-tag" @tap="removeTag(tag)">
            <text class="bc-tag-text">#{{ tag }} ×</text>
          </view>
        </view>
        <view class="bc-tag-input-row">
          <input
            v-model="tagInput"
            class="bc-tag-input"
            placeholder="添加标签（最多5个，回车确认）"
            :disabled="tags.length >= 5"
            @confirm="addTag"
          />
          <view class="bc-tag-add" :class="{ 'bc-tag-add-disabled': !tagInput.trim() || tags.length >= 5 }" @tap="addTag">
            <text class="bc-tag-add-text">添加</text>
          </view>
        </view>
      </view>

      <!-- Visibility -->
      <view class="bc-card">
        <view class="bc-vis-row">
          <view class="bc-vis-left">
            <view class="bc-vis-icon" :class="isPublic ? 'bc-vis-icon-public' : 'bc-vis-icon-private'">
              <app-icon :name="isPublic ? 'globe' : 'lock'" :size="36" :color="isPublic ? '#16a34a' : '#999999'" />
            </view>
            <view>
              <text class="bc-vis-title">{{ isPublic ? '公开悬赏' : '定向悬赏' }}</text>
              <text class="bc-vis-desc">{{ isPublic ? '所有人均可查看并回答' : '仅特定答主可查看' }}</text>
            </view>
          </view>
          <view class="bc-switch" :class="{ 'bc-switch-on': isPublic }" @tap="isPublic = !isPublic">
            <view class="bc-switch-knob" :class="{ 'bc-switch-knob-on': isPublic }" />
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
            <text class="bc-modal-line-label">有效期</text>
            <text class="bc-modal-line-value">{{ expireDays }}天</text>
          </view>
          <view class="bc-modal-line">
            <text class="bc-modal-line-label">可见范围</text>
            <text class="bc-modal-line-value">{{ isPublic ? '公开' : '定向' }}</text>
          </view>
          <view class="bc-modal-line bc-modal-line-total">
            <text class="bc-modal-total-label">悬赏金额</text>
            <text class="bc-modal-total-value">{{ finalAmount }} 国学币</text>
          </view>
        </view>
        <view class="bc-modal-pay" :class="{ 'bc-modal-pay-loading': loading }" @tap="confirmPay">
          <app-icon v-if="!loading" name="check-circle" :size="32" color="#ffffff" />
          <text class="bc-modal-pay-text">{{ loading ? '处理中...' : '确认支付 ' + finalAmount + ' 国学币' }}</text>
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

const amountPresets = [10, 20, 50, 100, 200, 500]
const expireOptions = [
  { value: 3, label: '3天', desc: '快速解答' },
  { value: 7, label: '7天', desc: '推荐' },
  { value: 14, label: '14天', desc: '复杂问题' },
  { value: 30, label: '30天', desc: '长期悬赏' },
]
const categoryOptions = [
  '易经周易', '风水堪舆', '八字命理', '梅花易数', '六爻预测',
  '紫微斗数', '面相手相', '奇门遁甲', '太乙神数', '其他',
]

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const balance = ref(200)

const title = ref('')
const description = ref('')
const content = ref('')
const selectedAmount = ref(50)
const customAmount = ref('')
const isCustom = ref(false)
const expireDays = ref(7)
const category = ref('')
const tags = ref<string[]>([])
const tagInput = ref('')
const isPublic = ref(true)
const showPayConfirm = ref(false)
const loading = ref(false)
const errors = ref<Record<string, string>>({})

const finalAmount = computed(() => (isCustom.value ? parseInt(customAmount.value) || 0 : selectedAmount.value))

function selectAmount(amount: number) {
  selectedAmount.value = amount
  isCustom.value = false
  errors.value.amount = ''
}
function enableCustom() {
  isCustom.value = true
  errors.value.amount = ''
}
function toggleCategory(cat: string) {
  category.value = category.value === cat ? '' : cat
}
function addTag() {
  const tag = tagInput.value.trim().replace(/^#/, '')
  if (tag && !tags.value.includes(tag) && tags.value.length < 5) {
    tags.value.push(tag)
    tagInput.value = ''
  }
}
function removeTag(tag: string) {
  tags.value = tags.value.filter(t => t !== tag)
}

function validate() {
  const e: Record<string, string> = {}
  if (!title.value.trim()) e.title = '请填写悬赏标题'
  else if (title.value.length < 10) e.title = '标题至少10个字'
  if (!description.value.trim()) e.description = '请填写问题描述'
  else if (description.value.length < 20) e.description = '描述至少20个字'
  if (finalAmount.value < 10) e.amount = '最低悬赏金额为10国学币'
  if (finalAmount.value > 10000) e.amount = '最高悬赏金额为10000国学币'
  errors.value = e
  return Object.keys(e).length === 0
}

function handleSubmit() {
  if (!validate()) return
  showPayConfirm.value = true
}

function confirmPay() {
  if (finalAmount.value > balance.value) {
    showPayConfirm.value = false
    uni.showModal({
      title: '国学币余额不足',
      content: `本次需 ${finalAmount.value} 国学币，当前余额 ${balance.value}，是否前往充值？`,
      confirmText: '去充值',
      success: (res) => {
        if (res.confirm) navigateTo('/wallet/recharge')
      },
    })
    return
  }
  loading.value = true
  setTimeout(() => {
    loading.value = false
    showPayConfirm.value = false
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => navigateTo('/bounty'), 800)
  }, 800)
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
.bc-sublabel {
  display: block;
  font-size: 22rpx;
  color: #999999;
  margin: 8rpx 0 24rpx;
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

/* Expire */
.bc-expire-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.bc-expire-item {
  padding: 24rpx 0;
  text-align: center;
  border-radius: 24rpx;
  background: #faf8f5;
  border: 2rpx solid #e8e3db;
}
.bc-expire-item-active {
  background: rgba(196, 30, 58, 0.05);
  border-color: var(--brand);
}
.bc-expire-label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.bc-expire-label-active {
  color: var(--brand);
}
.bc-expire-desc {
  display: block;
  font-size: 20rpx;
  color: #999999;
  margin-top: 4rpx;
}

/* Category & Tags */
.bc-cat-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 24rpx;
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
  font-size: 22rpx;
  color: #666666;
}
.bc-cat-text-active {
  color: #ffffff;
}
.bc-tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.bc-tag {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: rgba(201, 169, 110, 0.1);
  border: 2rpx solid rgba(201, 169, 110, 0.3);
}
.bc-tag-text {
  font-size: 22rpx;
  color: #c9a96e;
}
.bc-tag-input-row {
  display: flex;
  gap: 16rpx;
}
.bc-tag-input {
  flex: 1;
  font-size: 28rpx;
  background: #faf8f5;
  border-radius: 24rpx;
  padding: 20rpx 24rpx;
  border: 2rpx solid transparent;
  box-sizing: border-box;
}
.bc-tag-add {
  padding: 20rpx 32rpx;
  background: #faf8f5;
  border: 2rpx solid #e8e3db;
  border-radius: 24rpx;
}
.bc-tag-add-disabled {
  opacity: 0.4;
}
.bc-tag-add-text {
  font-size: 28rpx;
  color: #666666;
}

/* Visibility */
.bc-vis-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bc-vis-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.bc-vis-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bc-vis-icon-public {
  background: #f0fdf4;
}
.bc-vis-icon-private {
  background: #faf8f5;
}
.bc-vis-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.bc-vis-desc {
  display: block;
  font-size: 22rpx;
  color: #999999;
  margin-top: 4rpx;
}
.bc-switch {
  width: 88rpx;
  height: 48rpx;
  border-radius: 999rpx;
  background: #e8e3db;
  position: relative;
  transition: background 0.2s;
}
.bc-switch-on {
  background: var(--brand);
}
.bc-switch-knob {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
}
.bc-switch-knob-on {
  transform: translateX(40rpx);
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
