<template>
  <view class="page">
    <!-- 顶部导航 -->
    <app-nav-bar title="意见反馈" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="500" :bar-height="96" title-align="left" />

    <!-- Tab切换 -->
    <view class="tabs">
      <view class="tab" @tap="activeTab = 'submit'">
        <text class="tab-text" :class="{ 'tab-active': activeTab === 'submit' }">提交反馈</text>
        <view v-if="activeTab === 'submit'" class="tab-line" />
      </view>
      <view class="tab" @tap="activeTab = 'history'">
        <text class="tab-text" :class="{ 'tab-active': activeTab === 'history' }">我的反馈</text>
        <view v-if="activeTab === 'history'" class="tab-line" />
      </view>
    </view>

    <!-- 提交反馈 -->
    <view v-if="activeTab === 'submit'" class="tab-pane">
      <!-- 提交成功态 -->
      <view v-if="submitted" class="success-box">
        <view class="success-icon">
          <AppIcon name="check" :size="32" color="#22c55e" />
        </view>
        <text class="success-title">提交成功</text>
        <text class="success-desc">感谢您的反馈，我们会尽快处理</text>
        <view class="success-btn" @tap="resetForm">
          <text class="success-btn-text">继续反馈</text>
        </view>
      </view>

      <!-- 表单 -->
      <view v-else class="form">
        <!-- 反馈类型 -->
        <view class="field">
          <text class="field-label">反馈类型</text>
          <view class="type-grid">
            <view
              v-for="type in feedbackTypes"
              :key="type.id"
              class="type-cell"
              :class="{ 'type-active': selectedType === type.id }"
              @tap="selectedType = type.id"
            >
              <view class="type-icon" :style="{ background: type.bgColor }">
                <AppIcon :name="type.icon" :size="16" :color="type.color" />
              </view>
              <text class="type-label">{{ type.label }}</text>
            </view>
          </view>
        </view>

        <!-- 详细描述 -->
        <view class="field">
          <text class="field-label">详细描述 <text class="required">*</text></text>
          <textarea
            class="textarea"
            :value="content"
            placeholder="请详细描述您遇到的问题或建议，我们会认真处理每一条反馈..."
            placeholder-class="ph"
            :maxlength="500"
            @input="onContentInput"
          />
          <text class="char-count">{{ content.length }}/500</text>
        </view>

        <!-- 上传截图 -->
        <view class="field">
          <text class="field-label">上传截图（选填）</text>
          <view class="img-row">
            <view v-for="(img, i) in images" :key="i" class="img-cell">
              <image class="img-thumb" :src="img" mode="aspectFill" />
              <view class="img-del" @tap="removeImage(i)">
                <AppIcon name="x" :size="12" color="#ffffff" />
              </view>
            </view>
            <view v-if="images.length < 4" class="img-add" @tap="addImage">
              <AppIcon name="camera" :size="20" color="#999999" />
              <text class="img-add-text">添加图片</text>
            </view>
          </view>
          <text class="field-hint">最多上传4张图片</text>
        </view>

        <!-- 联系方式 -->
        <view class="field">
          <text class="field-label">联系方式（选填）</text>
          <input
            class="input"
            :value="contact"
            placeholder="手机号或邮箱，方便我们与您联系"
            placeholder-class="ph"
            @input="onContactInput"
          />
        </view>

        <!-- 提交按钮 -->
        <view
          class="submit-btn"
          :class="{ 'submit-disabled': !canSubmit || isSubmitting }"
          @tap="handleSubmit"
        >
          <text class="submit-text">{{ isSubmitting ? '提交中...' : '提交反馈' }}</text>
        </view>
      </view>
    </view>

    <!-- 历史反馈 -->
    <view v-else class="tab-pane">
      <view v-if="historyFeedbacks.length === 0" class="empty-box">
        <AppIcon name="message-circle" :size="48" color="#cccccc" />
        <text class="empty-text">暂无反馈记录</text>
      </view>
      <view v-else class="history-list">
        <view v-for="item in historyFeedbacks" :key="item.id" class="history-card">
          <view class="history-head">
            <view class="history-icon" :style="{ background: typeOf(item.type)?.bgColor }">
              <AppIcon :name="typeOf(item.type)?.icon || 'help-circle'" :size="20" :color="typeOf(item.type)?.color" />
            </view>
            <view class="history-body">
              <view class="history-title-row">
                <text class="history-title">{{ item.title }}</text>
                <view class="status-badge" :style="{ background: statusOf(item.status).bg }">
                  <text class="status-text" :style="{ color: statusOf(item.status).color }">{{ statusOf(item.status).label }}</text>
                </view>
              </view>
              <text class="history-content">{{ item.content }}</text>
              <text class="history-time">{{ item.time }}</text>

              <!-- 官方回复 -->
              <view v-if="item.reply" class="reply-box">
                <text class="reply-label">官方回复</text>
                <text class="reply-content">{{ item.reply }}</text>
              </view>

              <!-- 处理中提示 -->
              <view v-if="item.status === 'processing'" class="processing-row">
                <AppIcon name="clock" :size="12" color="#2563eb" />
                <text class="processing-text">工作人员正在处理中，请耐心等待</text>
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
import AppIcon from '@/components/common/app-icon.vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import { feedbackTypes, feedbackStatusConfig, historyFeedbacks } from '@/lib/mine-data'

// UI 临时状态
const activeTab = ref<'submit' | 'history'>('submit')
const selectedType = ref<string | null>(null)
const content = ref('')
const contact = ref('')
const images = ref<string[]>([])
const isSubmitting = ref(false)
const submitted = ref(false)

const canSubmit = computed(() => !!selectedType.value && content.value.trim().length > 0)

function typeOf(id: string) {
  return feedbackTypes.find((t) => t.id === id)
}
function statusOf(status: string) {
  return feedbackStatusConfig[status] || feedbackStatusConfig.pending
}
function onContentInput(e: any) {
  content.value = e.detail.value
}
function onContactInput(e: any) {
  contact.value = e.detail.value
}
function removeImage(i: number) {
  images.value = images.value.filter((_, idx) => idx !== i)
}
function addImage() {
  // 选图交互交给 @/lib 层(uni.chooseImage)
}

// @data-needs: 提交意见反馈, 参数 {type, content, contact, images}, 返回 {code, message}
function handleSubmit() {
  if (!canSubmit.value || isSubmitting.value) return
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    submitted.value = true
  }, 1500)
}

function resetForm() {
  selectedType.value = null
  content.value = ''
  contact.value = ''
  images.value = []
  submitted.value = false
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 160rpx;
}

/* Tab */
.tabs {
  display: flex;
  border-bottom: 2rpx solid #e8e3db;
  background: #ffffff;
}
.tab {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
}
.tab-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #999999;
}
.tab-active {
  color: #c41e3a;
}
.tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 4rpx;
  background: #c41e3a;
}

.tab-pane {
  padding: 32rpx;
}

/* 表单 */
.form {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.field {
  display: flex;
  flex-direction: column;
}
.field-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 16rpx;
}
.required {
  color: #ff4d4f;
}

/* 类型网格 */
.type-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}
.type-cell {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  border: 4rpx solid #e8e3db;
  background: #ffffff;
}
.type-active {
  border-color: #c41e3a;
  background: rgba(196, 30, 58, 0.05);
}
.type-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.type-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}

/* 文本域 */
.textarea {
  width: 100%;
  min-height: 240rpx;
  padding: 24rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  background: #ffffff;
  border: 2rpx solid #e8e3db;
  border-radius: 16rpx;
  box-sizing: border-box;
}
.ph {
  color: #999999;
}
.char-count {
  align-self: flex-end;
  font-size: 22rpx;
  color: #999999;
  margin-top: 8rpx;
}

/* 图片上传 */
.img-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.img-cell {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #f0ece5;
}
.img-thumb {
  width: 100%;
  height: 100%;
}
.img-del {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.img-add {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  border: 4rpx dashed #e8e3db;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.img-add-text {
  font-size: 20rpx;
  color: #999999;
}
.field-hint {
  font-size: 22rpx;
  color: #999999;
  margin-top: 8rpx;
}

/* 输入框 */
.input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  background: #ffffff;
  border: 2rpx solid #e8e3db;
  border-radius: 16rpx;
  box-sizing: border-box;
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 16rpx;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8rpx;
}
.submit-disabled {
  opacity: 0.5;
}
.submit-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
}

/* 成功态 */
.success-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 96rpx 0;
}
.success-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.success-title {
  font-size: 36rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 16rpx;
}
.success-desc {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 48rpx;
}
.success-btn {
  padding: 0 48rpx;
  height: 80rpx;
  border-radius: 16rpx;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.success-btn-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #ffffff;
}

/* 历史列表 */
.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 96rpx 0;
  gap: 16rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #999999;
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.history-card {
  padding: 32rpx;
  background: #ffffff;
  border-radius: 24rpx;
  border: 2rpx solid #f0ece5;
}
.history-head {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}
.history-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.history-body {
  flex: 1;
  min-width: 0;
}
.history-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.history-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.status-badge {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.status-text {
  font-size: 22rpx;
}
.history-content {
  display: block;
  font-size: 24rpx;
  color: #999999;
  margin-top: 8rpx;
  line-height: 1.5;
}
.history-time {
  display: block;
  font-size: 20rpx;
  color: #bbbbbb;
  margin-top: 16rpx;
}
.reply-box {
  margin-top: 24rpx;
  padding: 24rpx;
  background: rgba(196, 30, 58, 0.05);
  border-radius: 16rpx;
}
.reply-label {
  display: block;
  font-size: 24rpx;
  font-weight: 500;
  color: #c41e3a;
  margin-bottom: 8rpx;
}
.reply-content {
  font-size: 24rpx;
  color: #999999;
  line-height: 1.5;
}
.processing-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 24rpx;
}
.processing-text {
  font-size: 24rpx;
  color: #2563eb;
}
</style>
