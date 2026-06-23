<template>
  <view class="appeal-page">
    <!-- 已提交状态 -->
    <template v-if="isSubmitted">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <AppIcon name="arrow-left" :size="22" color="#1F1B16" />
        </view>
        <text class="nav-title">申诉详情</text>
        <view class="nav-placeholder" />
      </view>

      <scroll-view scroll-y class="content">
        <!-- 申诉成功卡 -->
        <view class="success-card">
          <view class="success-icon">
            <AppIcon name="check-circle-2" :size="32" color="#16A34A" />
          </view>
          <text class="success-title">申诉已提交</text>
          <text class="success-id">申诉编号：{{ appealId }}</text>
        </view>

        <!-- 处理进度 -->
        <view class="card">
          <text class="card-title">处理进度</text>
          <view class="timeline">
            <view v-for="(item, index) in appealTimeline" :key="item.status" class="tl-row">
              <view class="tl-left">
                <view
                  class="tl-dot"
                  :class="item.completed ? (item.current ? 'tl-dot-current' : 'tl-dot-done') : 'tl-dot-todo'"
                >
                  <AppIcon v-if="item.completed && item.current" name="clock" :size="12" color="#FFFFFF" />
                  <AppIcon v-else-if="item.completed" name="check" :size="12" color="#FFFFFF" />
                  <view v-else class="tl-dot-empty" />
                </view>
                <view
                  v-if="index < appealTimeline.length - 1"
                  class="tl-line"
                  :class="item.completed ? 'tl-line-done' : ''"
                />
              </view>
              <view class="tl-body">
                <text class="tl-label" :class="item.completed ? '' : 'tl-label-todo'">{{ item.label }}</text>
                <text v-if="item.time" class="tl-time">{{ item.time }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 申诉内容摘要 -->
        <view class="card">
          <text class="card-title">申诉内容</text>
          <view class="summary-order">
            <view class="summary-thumb">
              <AppIcon name="file-text" :size="20" color="#9C8C7A" />
            </view>
            <view class="summary-order-info">
              <text class="summary-order-title">{{ selectedOrderData?.title }}</text>
              <text class="summary-order-id">订单号：{{ selectedOrder }}</text>
            </view>
          </view>
          <view class="summary-row">
            <text class="summary-key">申诉类型</text>
            <text class="summary-val">{{ selectedTypeData?.label }}</text>
          </view>
          <view class="summary-reason">
            <text class="summary-key">申诉理由</text>
            <text class="summary-reason-text">{{ reason }}</text>
          </view>
          <view v-if="images.length > 0" class="summary-imgs">
            <text class="summary-key">上传凭证</text>
            <view class="summary-img-grid">
              <view v-for="(img, index) in images" :key="index" class="summary-img">
                <AppIcon name="image" :size="24" color="#C9BCAC" />
              </view>
            </view>
          </view>
        </view>

        <!-- 温馨提示 -->
        <view class="tips-card">
          <AppIcon name="alert-circle" :size="20" color="#C9A961" />
          <view class="tips-text">
            <text class="tips-line">1. 平台将在1-3个工作日内完成审核</text>
            <text class="tips-line">2. 处理结果将通过消息通知推送给您</text>
            <text class="tips-line">3. 如有疑问，可联系在线客服</text>
          </view>
        </view>
      </scroll-view>
    </template>

    <!-- 表单状态 -->
    <template v-else>
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <AppIcon name="arrow-left" :size="22" color="#1F1B16" />
        </view>
        <text class="nav-title">交易申诉</text>
        <view class="nav-placeholder" />
      </view>

      <!-- 步骤指示器 -->
      <view class="stepper">
        <view class="stepper-row">
          <template v-for="s in 3" :key="s">
            <view class="step-dot" :class="step >= s ? 'step-dot-active' : ''">
              <AppIcon v-if="step > s" name="check" :size="16" color="#FFFFFF" />
              <text v-else class="step-num" :class="step >= s ? 'step-num-active' : ''">{{ s }}</text>
            </view>
            <view v-if="s < 3" class="step-line" :class="step > s ? 'step-line-active' : ''" />
          </template>
        </view>
        <view class="stepper-labels">
          <text class="stepper-label">选择订单</text>
          <text class="stepper-label">申诉类型</text>
          <text class="stepper-label">填写详情</text>
        </view>
      </view>

      <scroll-view scroll-y class="content content-form">
        <!-- 步骤1：选择订单 -->
        <view v-if="step === 1" class="step-section">
          <text class="step-hint">请选择需要申诉的订单</text>
          <view
            v-for="order in appealableOrders"
            :key="order.id"
            class="order-card"
            :class="selectedOrder === order.id ? 'order-card-selected' : ''"
            @tap="selectedOrder = order.id"
          >
            <view class="order-thumb">
              <AppIcon name="file-text" :size="24" color="#9C8C7A" />
            </view>
            <view class="order-info">
              <text class="order-title">{{ order.title }}</text>
              <text class="order-id">订单号：{{ order.id }}</text>
              <view class="order-meta">
                <text class="order-price">¥{{ order.price }}</text>
                <text class="order-status">{{ order.status }}</text>
              </view>
            </view>
            <view class="radio" :class="selectedOrder === order.id ? 'radio-on' : ''">
              <AppIcon v-if="selectedOrder === order.id" name="check" :size="12" color="#FFFFFF" />
            </view>
          </view>
        </view>

        <!-- 步骤2：选择申诉类型 -->
        <view v-if="step === 2" class="step-section">
          <text class="step-hint">请选择申诉类型</text>
          <view
            v-for="type in appealTypes"
            :key="type.id"
            class="type-card"
            :class="selectedType === type.id ? 'type-card-selected' : ''"
            @tap="selectedType = type.id"
          >
            <view class="type-info">
              <text class="type-label">{{ type.label }}</text>
              <text class="type-desc">{{ type.desc }}</text>
            </view>
            <view class="radio" :class="selectedType === type.id ? 'radio-on' : ''">
              <AppIcon v-if="selectedType === type.id" name="check" :size="12" color="#FFFFFF" />
            </view>
          </view>
        </view>

        <!-- 步骤3：填写详情 -->
        <view v-if="step === 3" class="step-section">
          <view class="field">
            <text class="field-label">申诉理由 <text class="req">*</text></text>
            <textarea
              v-model="reason"
              class="field-textarea"
              placeholder="请详细描述问题，至少10个字..."
              :maxlength="500"
              placeholder-class="ph"
            />
            <text class="field-count">{{ reason.length }}/500</text>
          </view>

          <view class="field">
            <text class="field-label">上传凭证（选填，最多5张）</text>
            <view class="upload-grid">
              <view v-for="(img, index) in images" :key="index" class="upload-item">
                <AppIcon name="image" :size="32" color="#C9BCAC" />
                <view class="upload-remove" @tap="removeImage(index)">
                  <AppIcon name="x" :size="12" color="#FFFFFF" />
                </view>
              </view>
              <view v-if="images.length < 5" class="upload-add" @tap="addImage">
                <AppIcon name="upload" :size="20" color="#9C8C7A" />
                <text class="upload-add-text">上传</text>
              </view>
            </view>
          </view>

          <view class="tips-card">
            <AppIcon name="alert-circle" :size="16" color="#C9A961" />
            <text class="tips-inline">请上传与申诉相关的凭证图片，如聊天记录、商品照片等，有助于加快处理速度。</text>
          </view>
        </view>
      </scroll-view>

      <!-- 底部操作栏 -->
      <view class="bottom-bar">
        <view v-if="step > 1" class="btn-prev" @tap="step = step - 1">
          <text class="btn-prev-text">上一步</text>
        </view>
        <view
          v-if="step < 3"
          class="btn-next"
          :class="canProceed ? '' : 'btn-disabled'"
          @tap="goNext"
        >
          <text class="btn-next-text" :class="canProceed ? '' : 'btn-disabled-text'">下一步</text>
        </view>
        <view
          v-else
          class="btn-next"
          :class="canSubmit && !isSubmitting ? '' : 'btn-disabled'"
          @tap="handleSubmit"
        >
          <AppIcon v-if="isSubmitting" name="loader-2" :size="16" color="#9C8C7A" class="spin" />
          <text class="btn-next-text" :class="canSubmit && !isSubmitting ? '' : 'btn-disabled-text'">
            {{ isSubmitting ? '提交中...' : '提交申诉' }}
          </text>
        </view>
      </view>
    </template>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack } from '@/utils/router'

const appealableOrders = [
  { id: '20240115001', title: '《渊海子平》精装典藏版', price: 168, time: '2024-01-15 14:30', status: '已完成' },
  { id: '20240112003', title: '八字命理入门课程', price: 299, time: '2024-01-12 09:15', status: '已完成' },
  { id: '20240108002', title: '开运水晶手串', price: 388, time: '2024-01-08 16:45', status: '已完成' },
]

const appealTypes = [
  { id: 'not_received', label: '未收到货', desc: '付款后长时间未收到商品' },
  { id: 'wrong_item', label: '货不对版', desc: '收到的商品与描述不符' },
  { id: 'quality_issue', label: '质量问题', desc: '商品存在质量缺陷' },
  { id: 'false_ad', label: '虚假宣传', desc: '商品宣传与实际不符' },
  { id: 'other', label: '其他问题', desc: '其他交易相关问题' },
]

const appealTimeline = [
  { status: 'submitted', label: '申诉已提交', time: '2024-01-20 10:30', completed: true, current: false },
  { status: 'reviewing', label: '平台审核中', time: '预计1-3个工作日', completed: true, current: true },
  { status: 'processing', label: '平台介入处理', time: '', completed: false, current: false },
  { status: 'completed', label: '处理完成', time: '', completed: false, current: false },
]

const step = ref(1)
const selectedOrder = ref<string | null>(null)
const selectedType = ref<string | null>(null)
const reason = ref('')
const images = ref<string[]>([])
const isSubmitting = ref(false)
const isSubmitted = ref(false)
const appealId = ref('')

const selectedOrderData = computed(() => appealableOrders.find((o) => o.id === selectedOrder.value))
const selectedTypeData = computed(() => appealTypes.find((t) => t.id === selectedType.value))

const canProceed = computed(() => (step.value === 1 ? selectedOrder.value !== null : selectedType.value !== null))
const canSubmit = computed(() => reason.value.trim().length >= 10)

function addImage() {
  if (images.value.length < 5) images.value.push(`img_${Date.now()}`)
}
function removeImage(index: number) {
  images.value.splice(index, 1)
}
function goNext() {
  if (!canProceed.value) return
  step.value += 1
}
function handleSubmit() {
  if (!canSubmit.value || isSubmitting.value) return
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    appealId.value = `AP${Date.now().toString().slice(-10)}`
    isSubmitted.value = true
  }, 1500)
}
function goBack() {
  navigateBack()
}
</script>

<style lang="scss" scoped>
.appeal-page {
  min-height: 100vh;
  background: #FAF8F5;
  display: flex;
  flex-direction: column;
}

.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: rgba(250, 248, 245, 0.95);
  border-bottom: 2rpx solid #ECE5DB;
}
.nav-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1F1B16;
}
.nav-placeholder {
  width: 56rpx;
}

.content {
  flex: 1;
  padding: 24rpx;
  box-sizing: border-box;
}
.content-form {
  padding-bottom: 180rpx;
}

/* 步骤指示器 */
.stepper {
  padding: 28rpx 24rpx;
}
.stepper-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.step-dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #ECE5DB;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step-dot-active {
  background: #C41E3A;
}
.step-num {
  font-size: 26rpx;
  font-weight: 500;
  color: #9C8C7A;
}
.step-num-active {
  color: #FFFFFF;
}
.step-line {
  flex: 1;
  height: 6rpx;
  margin: 0 16rpx;
  background: #ECE5DB;
}
.step-line-active {
  background: #C41E3A;
}
.stepper-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 12rpx;
}
.stepper-label {
  font-size: 22rpx;
  color: #9C8C7A;
}

.step-section {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.step-hint {
  font-size: 26rpx;
  color: #9C8C7A;
}

/* 订单卡 */
.order-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  border: 2rpx solid transparent;
}
.order-card-selected {
  border-color: #C41E3A;
  background: rgba(196, 30, 58, 0.04);
}
.order-thumb {
  width: 96rpx;
  height: 96rpx;
  border-radius: 16rpx;
  background: #F2ECE3;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.order-info {
  flex: 1;
  min-width: 0;
}
.order-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1F1B16;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.order-id {
  font-size: 22rpx;
  color: #9C8C7A;
  margin-top: 4rpx;
  display: block;
}
.order-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8rpx;
}
.order-price {
  font-size: 28rpx;
  font-weight: 500;
  color: #C41E3A;
}
.order-status {
  font-size: 20rpx;
  color: #9C8C7A;
  background: #F2ECE3;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.radio {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 4rpx solid #D8CDBE;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.radio-on {
  border-color: #C41E3A;
  background: #C41E3A;
}

/* 类型卡 */
.type-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  border: 2rpx solid transparent;
}
.type-card-selected {
  border-color: #C41E3A;
  background: rgba(196, 30, 58, 0.04);
}
.type-info {
  flex: 1;
}
.type-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #1F1B16;
  display: block;
}
.type-desc {
  font-size: 22rpx;
  color: #9C8C7A;
  margin-top: 4rpx;
  display: block;
}

/* 表单字段 */
.field {
  display: flex;
  flex-direction: column;
}
.field-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #1F1B16;
}
.req {
  color: #C41E3A;
}
.field-textarea {
  width: 100%;
  margin-top: 16rpx;
  padding: 24rpx;
  box-sizing: border-box;
  background: #FFFFFF;
  border: 2rpx solid #ECE5DB;
  border-radius: 20rpx;
  font-size: 28rpx;
  color: #1F1B16;
  height: 220rpx;
}
.ph {
  color: #9C8C7A;
}
.field-count {
  font-size: 22rpx;
  color: #9C8C7A;
  margin-top: 8rpx;
  text-align: right;
}
.upload-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 16rpx;
}
.upload-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  background: #F2ECE3;
  display: flex;
  align-items: center;
  justify-content: center;
}
.upload-remove {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
}
.upload-add {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  border: 4rpx dashed #D8CDBE;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.upload-add-text {
  font-size: 20rpx;
  color: #9C8C7A;
}

/* 提示卡 */
.tips-card {
  display: flex;
  gap: 16rpx;
  padding: 24rpx;
  background: rgba(201, 169, 97, 0.1);
  border-radius: 16rpx;
}
.tips-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.tips-line {
  font-size: 22rpx;
  color: #9C8C7A;
}
.tips-inline {
  flex: 1;
  font-size: 22rpx;
  color: #9C8C7A;
  line-height: 1.5;
}

/* 底部栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 20rpx;
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.95);
  border-top: 2rpx solid #ECE5DB;
}
.btn-prev {
  flex: 1;
  padding: 24rpx 0;
  background: #F2ECE3;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-prev-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #1F1B16;
}
.btn-next {
  flex: 1;
  padding: 24rpx 0;
  background: #C41E3A;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.btn-next-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #FFFFFF;
}
.btn-disabled {
  background: #F2ECE3;
}
.btn-disabled-text {
  color: #9C8C7A;
}

/* 已提交态 */
.success-card {
  padding: 48rpx 32rpx;
  text-align: center;
  background: rgba(201, 169, 97, 0.08);
  border-radius: 24rpx;
  margin-bottom: 24rpx;
}
.success-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: rgba(22, 163, 74, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20rpx;
}
.success-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1F1B16;
  display: block;
}
.success-id {
  font-size: 26rpx;
  color: #9C8C7A;
  margin-top: 8rpx;
  display: block;
}
.card {
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
}
.card-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1F1B16;
  margin-bottom: 24rpx;
  display: block;
}

/* 时间线 */
.timeline {
  display: flex;
  flex-direction: column;
}
.tl-row {
  display: flex;
  gap: 20rpx;
}
.tl-left {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.tl-dot {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tl-dot-current {
  background: #C41E3A;
}
.tl-dot-done {
  background: #16A34A;
}
.tl-dot-todo {
  background: #ECE5DB;
}
.tl-dot-empty {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #C9BCAC;
}
.tl-line {
  width: 4rpx;
  height: 96rpx;
  margin: 8rpx 0;
  background: #ECE5DB;
}
.tl-line-done {
  background: #16A34A;
}
.tl-body {
  padding-bottom: 48rpx;
}
.tl-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #1F1B16;
  display: block;
}
.tl-label-todo {
  color: #9C8C7A;
}
.tl-time {
  font-size: 22rpx;
  color: #9C8C7A;
  margin-top: 4rpx;
  display: block;
}

/* 摘要 */
.summary-order {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  background: #F7F2EB;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}
.summary-thumb {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  background: #F2ECE3;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.summary-order-info {
  flex: 1;
  min-width: 0;
}
.summary-order-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #1F1B16;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.summary-order-id {
  font-size: 22rpx;
  color: #9C8C7A;
  display: block;
}
.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 26rpx;
  padding-bottom: 16rpx;
}
.summary-key {
  color: #9C8C7A;
}
.summary-val {
  color: #1F1B16;
}
.summary-reason {
  padding-top: 16rpx;
  border-top: 2rpx solid #ECE5DB;
  font-size: 26rpx;
}
.summary-reason-text {
  color: #1F1B16;
  margin-top: 8rpx;
  display: block;
}
.summary-imgs {
  padding-top: 16rpx;
  border-top: 2rpx solid #ECE5DB;
  font-size: 26rpx;
  margin-top: 16rpx;
}
.summary-img-grid {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}
.summary-img {
  width: 128rpx;
  height: 128rpx;
  border-radius: 16rpx;
  background: #F2ECE3;
  display: flex;
  align-items: center;
  justify-content: center;
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
