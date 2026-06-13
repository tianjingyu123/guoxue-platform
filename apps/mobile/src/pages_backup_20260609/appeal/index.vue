<template>
  <view class="ap-page">
    <template v-if="isSubmitted">
      <view class="header-sticky">
        <view class="header-row">
          <text class="header-back" @click="uni.navigateBack()">‹</text>
          <text class="header-title">申诉详情</text>
          <view class="header-spacer" />
        </view>
      </view>
      <view class="ap-body">
        <view class="success-card">
          <text class="success-icon">✅</text>
          <text class="success-title">申诉已提交</text>
          <text class="success-id">申诉编号：{{ appealId }}</text>
        </view>
        <view class="card">
          <text class="card-title">处理进度</text>
          <view class="timeline">
            <view v-for="(item, i) in appealTimeline" :key="item.status" class="tl-item">
              <view class="tl-left">
                <view class="tl-dot" :class="{ done: item.completed, current: item.current }">
                  <text v-if="item.completed && !item.current">✓</text>
                  <text v-else-if="item.current">⏳</text>
                  <text v-else>○</text>
                </view>
                <view v-if="i < appealTimeline.length - 1" class="tl-line" :class="{ done: item.completed }" />
              </view>
              <view class="tl-right">
                <text class="tl-label" :class="{ dim: !item.completed }">{{ item.label }}</text>
                <text v-if="item.time" class="tl-time">{{ item.time }}</text>
              </view>
            </view>
          </view>
        </view>
        <view class="card">
          <text class="card-title">申诉内容</text>
          <view class="summary-item">
            <view class="sum-icon">📄</view>
            <view class="sum-info">
              <text class="sum-title">{{ selectedOrderData?.title }}</text>
              <text class="sum-sub">订单号：{{ selectedOrder }}</text>
            </view>
          </view>
          <view class="sum-row"><text class="sum-label">申诉类型</text><text>{{ selectedTypeData?.label }}</text></view>
          <view class="sum-divider" />
          <text class="sum-label">申诉理由</text>
          <text class="sum-reason">{{ reason }}</text>
          <view v-if="images.length > 0" class="sum-divider" />
          <view v-if="images.length > 0">
            <text class="sum-label">上传凭证</text>
            <view class="sum-images">
              <view v-for="(_, i) in images" :key="i" class="sum-img">🖼️</view>
            </view>
          </view>
        </view>
        <view class="tips-card">
          <text class="tips-icon">ℹ️</text>
          <view class="tips-text">
            <text>1. 平台将在1-3个工作日内完成审核</text>
            <text>2. 处理结果将通过消息通知推送给您</text>
            <text>3. 如有疑问，可联系在线客服</text>
          </view>
        </view>
      </view>
    </template>

    <template v-else>
      <view class="header-sticky">
        <view class="header-row">
          <text class="header-back" @click="uni.navigateBack()">‹</text>
          <text class="header-title">交易申诉</text>
          <view class="header-spacer" />
        </view>
      </view>

      <view class="ap-body">
        <view class="steps-bar">
          <view class="steps">
            <view v-for="s in 3" :key="s" class="step-dot" :class="{ active: step >= s, done: step > s }">
              <text v-if="step > s">✓</text><text v-else>{{ s }}</text>
            </view>
            <view v-for="s in 2" :key="'l'+s" class="step-line" :class="{ active: step > s }" />
          </view>
          <view class="step-labels">
            <text>选择订单</text><text>申诉类型</text><text>填写详情</text>
          </view>
        </view>

        <view v-if="step === 1" class="step-content">
          <text class="step-hint">请选择需要申诉的订单</text>
          <view v-for="order in appealableOrders" :key="order.id" class="order-card" :class="{ selected: selectedOrder === order.id }" @click="selectedOrder = order.id">
            <view class="oc-img">📄</view>
            <view class="oc-info">
              <text class="oc-title">{{ order.title }}</text>
              <text class="oc-no">订单号：{{ order.id }}</text>
              <view class="oc-bottom">
                <text class="oc-price">¥{{ order.price }}</text>
                <text class="oc-status">{{ order.status }}</text>
              </view>
            </view>
            <view class="oc-check" :class="{ on: selectedOrder === order.id }"><text v-if="selectedOrder === order.id">✓</text></view>
          </view>
        </view>

        <view v-if="step === 2" class="step-content">
          <text class="step-hint">请选择申诉类型</text>
          <view v-for="type in appealTypes" :key="type.id" class="type-card" :class="{ selected: selectedType === type.id }" @click="selectedType = type.id">
            <view class="tc-info">
              <text class="tc-label">{{ type.label }}</text>
              <text class="tc-desc">{{ type.desc }}</text>
            </view>
            <view class="oc-check" :class="{ on: selectedType === type.id }"><text v-if="selectedType === type.id">✓</text></view>
          </view>
        </view>

        <view v-if="step === 3" class="step-content">
          <view class="field">
            <text class="field-label">申诉理由 <text class="required">*</text></text>
            <textarea v-model="reason" class="field-textarea" placeholder="请详细描述问题，至少10个字..." maxlength="500" />
            <text class="field-count">{{ reason.length }}/500</text>
          </view>
          <view class="field">
            <text class="field-label">上传凭证（选填，最多5张）</text>
            <view class="upload-row">
              <view v-for="(_, i) in images" :key="i" class="upload-item" @click="removeImage(i)">
                <text>🖼️</text>
                <view class="upload-del">✕</view>
              </view>
              <view v-if="images.length < 5" class="upload-add" @click="addImage">
                <text>📷</text>
                <text class="upload-text">上传</text>
              </view>
            </view>
          </view>
          <view class="tips-card">
            <text class="tips-icon">ℹ️</text>
            <text class="tips-msg">请上传与申诉相关的凭证图片，如聊天记录、商品照片等，有助于加快处理速度。</text>
          </view>
        </view>
      </view>

      <view class="bottom-bar">
        <view class="bb-btns">
          <view v-if="step > 1" class="bb-btn secondary" @click="step--"><text>上一步</text></view>
          <view v-if="step < 3" class="bb-btn primary" :class="{ disabled: !canNext }" @click="canNext && step++"><text>下一步</text></view>
          <view v-else class="bb-btn primary" :class="{ disabled: !canSubmit || isSubmitting }" @click="handleSubmit">
            <text v-if="isSubmitting">提交中...</text><text v-else>提交申诉</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const step = ref(1)
const selectedOrder = ref<string | null>(null)
const selectedType = ref<string | null>(null)
const reason = ref('')
const images = ref<string[]>([])
const isSubmitting = ref(false)
const isSubmitted = ref(false)
const appealId = ref('')

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
  { status: 'submitted', label: '申诉已提交', time: '', completed: true, current: false },
  { status: 'reviewing', label: '平台审核中', time: '预计1-3个工作日', completed: true, current: true },
  { status: 'processing', label: '平台介入处理', time: '', completed: false, current: false },
  { status: 'completed', label: '处理完成', time: '', completed: false, current: false },
]

const canNext = computed(() => step.value === 1 ? !!selectedOrder.value : !!selectedType.value)
const canSubmit = computed(() => reason.value.trim().length >= 10)
const selectedOrderData = computed(() => appealableOrders.find(o => o.id === selectedOrder.value))
const selectedTypeData = computed(() => appealTypes.find(t => t.id === selectedType.value))

function addImage() { if (images.value.length < 5) images.value.push(`img_${Date.now()}`) }
function removeImage(i: number) { images.value.splice(i, 1) }

function handleSubmit() {
  if (!canSubmit.value) return
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    appealId.value = `AP${Date.now().toString().slice(-10)}`
    appealTimeline[0].time = new Date().toLocaleString('zh-CN')
    isSubmitted.value = true
  }, 1500)
}
</script>

<style scoped>
.ap-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 120rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-spacer { width: 56rpx; }

.ap-body { padding: 24rpx; }

.steps-bar { margin-bottom: 24rpx; }
.steps { display: flex; align-items: center; justify-content: center; }
.step-dot { width: 48rpx; height: 48rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx; background: #F5F1EB; color: #999; flex-shrink: 0; }
.step-dot.active { background: #C41E3A; color: #fff; }
.step-dot.done { background: #C41E3A; color: #fff; }
.step-line { flex: 1; height: 4rpx; background: #F5F1EB; max-width: 120rpx; }
.step-line.active { background: #C41E3A; }
.step-labels { display: flex; justify-content: center; gap: 80rpx; margin-top: 8rpx; }
.step-labels text { font-size: 20rpx; color: #999; }

.step-content { margin-top: 8rpx; }
.step-hint { font-size: 24rpx; color: #999; margin-bottom: 14rpx; display: block; }

.order-card { display: flex; align-items: center; gap: 14rpx; padding: 18rpx; background: #fff; border-radius: 14rpx; margin-bottom: 10rpx; border: 2px solid transparent; }
.order-card.selected { border-color: #C41E3A; background: #FFF5F5; }
.oc-img { width: 80rpx; height: 80rpx; border-radius: 12rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 36rpx; flex-shrink: 0; }
.oc-info { flex: 1; min-width: 0; }
.oc-title { font-size: 26rpx; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.oc-no { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }
.oc-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 6rpx; }
.oc-price { font-size: 28rpx; font-weight: 600; color: #C41E3A; }
.oc-status { font-size: 18rpx; color: #999; background: #F5F1EB; padding: 2rpx 10rpx; border-radius: 4rpx; }
.oc-check { width: 36rpx; height: 36rpx; border-radius: 50%; border: 2px solid #E8E0D5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.oc-check.on { border-color: #C41E3A; background: #C41E3A; }
.oc-check.on text { font-size: 20rpx; color: #fff; }

.type-card { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 18rpx; background: #fff; border-radius: 14rpx; margin-bottom: 10rpx; border: 2px solid transparent; }
.type-card.selected { border-color: #C41E3A; background: #FFF5F5; }
.tc-label { font-size: 28rpx; font-weight: 500; color: #333; display: block; }
.tc-desc { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }

.field { margin-bottom: 24rpx; }
.field-label { font-size: 26rpx; font-weight: 500; color: #333; display: block; margin-bottom: 10rpx; }
.required { color: #C41E3A; }
.field-textarea { width: 100%; background: #fff; border-radius: 14rpx; padding: 16rpx 18rpx; font-size: 24rpx; color: #333; box-sizing: border-box; height: 200rpx; }
.field-count { font-size: 20rpx; color: #999; text-align: right; display: block; margin-top: 4rpx; }
.upload-row { display: flex; flex-wrap: wrap; gap: 12rpx; }
.upload-item { width: 120rpx; height: 120rpx; border-radius: 12rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 40rpx; position: relative; }
.upload-del { position: absolute; top: -6rpx; right: -6rpx; width: 32rpx; height: 32rpx; border-radius: 50%; background: #C41E3A; color: #fff; font-size: 18rpx; display: flex; align-items: center; justify-content: center; }
.upload-add { width: 120rpx; height: 120rpx; border-radius: 12rpx; border: 2px dashed #E8E0D5; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 32rpx; }
.upload-text { font-size: 18rpx; color: #999; }

.tips-card { background: rgba(201,169,110,0.08); border-radius: 14rpx; padding: 16rpx; display: flex; gap: 10rpx; }
.tips-icon { font-size: 28rpx; flex-shrink: 0; }
.tips-msg { font-size: 20rpx; color: #999; line-height: 1.6; }
.tips-text { display: flex; flex-direction: column; gap: 2rpx; }
.tips-text text { font-size: 20rpx; color: #999; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #E8E0D5; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); }
.bb-btns { display: flex; gap: 14rpx; }
.bb-btn { flex: 1; padding: 20rpx; border-radius: 16rpx; text-align: center; }
.bb-btn.secondary { background: #F5F1EB; }
.bb-btn.secondary text { font-size: 28rpx; color: #666; }
.bb-btn.primary { background: #C41E3A; }
.bb-btn.primary text { font-size: 28rpx; color: #fff; }
.bb-btn.disabled { background: #E8E0D5; }
.bb-btn.disabled text { color: #999; }

.success-card { background: linear-gradient(135deg, #FFF5F5, #FFFBF0); border-radius: 16rpx; padding: 32rpx; text-align: center; margin-bottom: 20rpx; }
.success-icon { font-size: 80rpx; display: block; margin-bottom: 12rpx; }
.success-title { font-size: 32rpx; font-weight: 700; color: #333; display: block; }
.success-id { font-size: 24rpx; color: #999; display: block; margin-top: 6rpx; }

.card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; }
.card-title { font-size: 26rpx; font-weight: 600; color: #333; display: block; margin-bottom: 16rpx; }

.tl-item { display: flex; gap: 14rpx; }
.tl-left { display: flex; flex-direction: column; align-items: center; min-height: 80rpx; }
.tl-dot { width: 40rpx; height: 40rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20rpx; background: #F5F1EB; color: #BBB; flex-shrink: 0; }
.tl-dot.done { background: #52C41A; color: #fff; }
.tl-dot.current { background: #C41E3A; color: #fff; }
.tl-line { width: 2px; flex: 1; background: #E8E0D5; margin: 4rpx 0; }
.tl-line.done { background: #52C41A; }
.tl-right { padding-bottom: 32rpx; }
.tl-label { font-size: 24rpx; color: #333; font-weight: 500; display: block; }
.tl-label.dim { color: #BBB; }
.tl-time { font-size: 20rpx; color: #999; display: block; margin-top: 2rpx; }

.summary-item { display: flex; align-items: center; gap: 12rpx; padding: 14rpx; background: #FAF8F5; border-radius: 12rpx; margin-bottom: 14rpx; }
.sum-icon { font-size: 36rpx; flex-shrink: 0; }
.sum-title { font-size: 24rpx; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.sum-sub { font-size: 20rpx; color: #999; display: block; }
.sum-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; font-size: 24rpx; color: #333; }
.sum-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 6rpx; }
.sum-reason { font-size: 24rpx; color: #333; line-height: 1.6; }
.sum-divider { height: 1px; background: #E8E0D5; margin: 14rpx 0; }
.sum-images { display: flex; gap: 8rpx; margin-top: 6rpx; }
.sum-img { width: 88rpx; height: 88rpx; border-radius: 10rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 32rpx; }
</style>
