<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @tap="goBack">
        <app-icon name="chevron-left" :size="44" color="#2C2C2C" />
      </view>
      <text class="nav-title">申请售后</text>
      <view class="nav-placeholder" />
    </view>

    <scroll-view scroll-y class="scroll-area" :style="{ paddingTop: navHeight + 'px' }">
      <view v-if="loading" class="loading-state">加载中...</view>
      <view v-else-if="error" class="error-state">
        <text>{{ error }}</text>
        <view @tap="fetchData">重试</view>
      </view>
      <template v-else>
      <!-- 售后类型 -->
      <view class="card">
        <text class="card-title">售后类型</text>
        <view class="type-row">
          <view
            class="type-btn"
            :class="{ active: type === 'refund_only' }"
            @tap="type = 'refund_only'"
          >
            <text class="type-name" :class="{ active: type === 'refund_only' }">仅退款</text>
            <text class="type-desc">无需退货</text>
          </view>
          <view
            class="type-btn"
            :class="{ active: type === 'refund_with_return' }"
            @tap="type = 'refund_with_return'"
          >
            <text class="type-name" :class="{ active: type === 'refund_with_return' }">退货退款</text>
            <text class="type-desc">需寄回商品</text>
          </view>
        </view>
      </view>

      <!-- 退款原因 -->
      <view class="card">
        <text class="card-title">退款原因 <text class="req">*</text></text>
        <view class="select-row" :class="{ error: errors.reason }" @tap="showReasonPicker = true">
          <text class="select-text" :class="{ placeholder: !reason }">{{ reason || '请选择退款原因' }}</text>
          <app-icon name="chevron-down" :size="36" color="#999999" />
        </view>
        <view v-if="errors.reason" class="err-tip">
          <app-icon name="alert-circle" :size="24" color="#E74C3C" />
          <text class="err-text">{{ errors.reason }}</text>
        </view>
      </view>

      <!-- 退款金额 -->
      <view class="card">
        <text class="card-title">退款金额 <text class="req">*</text><text class="sub">最多可退 ¥{{ maxAmount.toFixed(2) }}</text></text>
        <view class="amount-row" :class="{ error: errors.amount }">
          <text class="amount-symbol">¥</text>
          <input class="amount-input" type="digit" v-model="amount" placeholder="0.00" />
          <view class="full-btn" @tap="amount = String(maxAmount)">
            <text class="full-text">全额退款</text>
          </view>
        </view>
        <view v-if="errors.amount" class="err-tip">
          <app-icon name="alert-circle" :size="24" color="#E74C3C" />
          <text class="err-text">{{ errors.amount }}</text>
        </view>
      </view>

      <!-- 问题描述 -->
      <view class="card">
        <text class="card-title">问题描述</text>
        <textarea
          class="desc-input"
          v-model="description"
          placeholder="请详细描述您遇到的问题，以便我们更好地处理..."
          :maxlength="500"
          placeholder-class="ph"
        />
        <text class="word-count">{{ description.length }}/500</text>
      </view>

      <!-- 上传凭证 -->
      <view class="card">
        <text class="card-title">上传凭证 <text class="sub">（最多5张）</text></text>
        <view class="upload-wrap">
          <view v-for="(img, i) in images" :key="i" class="upload-item">
            <image lazy-load class="upload-img" :src="img" mode="aspectFill" />
            <view class="upload-del" @tap="removeImage(i)">
              <app-icon name="x" :size="24" color="#FFFFFF" />
            </view>
          </view>
          <!-- 上传中占位 -->
          <view v-for="n in uploadingCount" :key="'up' + n" class="upload-item upload-loading">
            <view class="upload-spinner" />
            <text class="upload-loading-text">上传中</text>
          </view>
          <view v-if="images.length + uploadingCount < 5" class="upload-add" @tap="addImage">
            <app-icon name="camera" :size="48" color="#999999" />
            <text class="upload-hint">上传</text>
          </view>
        </view>
      </view>

      <!-- 退货说明 -->
      <view v-if="type === 'refund_with_return'" class="tips-card">
        <text class="tips-title">退货说明</text>
        <text class="tips-line">1. 请在收到退货地址后7天内寄回商品</text>
        <text class="tips-line">2. 请保持商品原状，附带所有包装和配件</text>
        <text class="tips-line">3. 建议使用有物流追踪的快递方式</text>
        <text class="tips-line">4. 退款将在收到商品后1-3个工作日内处理</text>
      </view>

      <view class="bottom-gap" />
      </template>
    </scroll-view>

    <!-- 底部提交 -->
    <view class="submit-bar" :style="{ paddingBottom: safeBottom + 'px' }">
      <view class="submit-btn" :class="{ disabled: submitting }" @tap="submit">
        <text class="submit-text">{{ submitting ? '提交中...' : '提交申请' }}</text>
      </view>
    </view>

    <!-- 原因选择弹窗 -->
    <view v-if="showReasonPicker" class="mask mask-fade-in" @tap="showReasonPicker = false">
      <view class="reason-sheet sheet-slide-up" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">选择退款原因</text>
          <view @tap="showReasonPicker = false">
            <app-icon name="x" :size="36" color="#999999" />
          </view>
        </view>
        <scroll-view scroll-y class="reason-list">
          <view
            v-for="r in reasons"
            :key="r"
            class="reason-item"
            :class="{ active: reason === r }"
            @tap="selectReason(r)"
          >
            <text class="reason-text" :class="{ active: reason === r }">{{ r }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack, redirectTo } from '@/utils/router'
import { accountApi, afterSaleReasons } from '@/lib/account-data'
import { uploadImage } from '@/utils/request'

const statusBarHeight = ref(20)
const navHeight = ref(64)
const safeBottom = ref(0)

const reasons = afterSaleReasons
const maxAmount = ref(0)
const orderId = ref('')

const type = ref<'refund_only' | 'refund_with_return'>('refund_only')
const reason = ref('')
const showReasonPicker = ref(false)
const amount = ref('0')
const description = ref('')
const images = ref<string[]>([])
const uploadingCount = ref(0)
const submitting = ref(false)
const loading = ref(false)
const error = ref('')
const errors = reactive<{ reason?: string; amount?: string }>({})

async function fetchData() {
  if (!orderId.value) return
  loading.value = true
  error.value = ''
  try {
    const ctx = await accountApi.afterSaleApplyContext(orderId.value)
    maxAmount.value = ctx.maxAmount
    amount.value = String(ctx.maxAmount)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onLoad((q) => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
    navHeight.value = statusBarHeight.value + 44
    safeBottom.value = info.safeAreaInsets?.bottom || 0
  } catch (e) {
    statusBarHeight.value = 20
    navHeight.value = 64
  }
  if (q && q.orderId) orderId.value = q.orderId
  if (q && q.maxAmount) {
    maxAmount.value = parseFloat(q.maxAmount)
    amount.value = q.maxAmount
  } else {
    fetchData()
  }
})

function selectReason(r: string) {
  reason.value = r
  errors.reason = ''
  showReasonPicker.value = false
}

function addImage() {
  uni.chooseImage({
    count: 5 - images.value.length,
    success: (res) => {
      const paths = res.tempFilePaths as string[]
      // 真实上传 COS：逐张占位 → uploadImage 返回可访问 URL 落列表；失败提示并撤占位
      paths.forEach(async (p) => {
        uploadingCount.value++
        try {
          const url = await uploadImage(p)
          images.value.push(url)
        } catch (e) {
          uni.showToast({ title: (e as Error)?.message || '图片上传失败', icon: 'none' })
        } finally {
          uploadingCount.value--
        }
      })
    },
  })
}
function removeImage(i: number) {
  images.value.splice(i, 1)
}

function validate() {
  errors.reason = ''
  errors.amount = ''
  let ok = true
  if (!reason.value) {
    errors.reason = '请选择退款原因'
    ok = false
  }
  const amt = parseFloat(amount.value)
  if (!amount.value || amt <= 0) {
    errors.amount = '请输入退款金额'
    ok = false
  } else if (amt > maxAmount.value) {
    errors.amount = `退款金额不能超过${maxAmount.value}元`
    ok = false
  }
  return ok
}

async function submit() {
  if (submitting.value) return
  if (!validate()) return
  submitting.value = true
  try {
    await accountApi.submitAfterSale({
      orderId: orderId.value,
      type: type.value,
      reason: reason.value,
      amount: parseFloat(amount.value),
      description: description.value,
      images: images.value,
    })
    uni.showToast({ title: '申请已提交', icon: 'success' })
    setTimeout(() => redirectTo('/shop/my-after-sales'), 1200)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #FAF8F5;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 12px;
  background: #FFFFFF;
  border-bottom: 1rpx solid #E8E3DB;
}
.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.nav-placeholder {
  width: 60rpx;
}

.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

.card {
  margin: 24rpx 24rpx 0;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
}
.card-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.req {
  color: var(--brand);
}
.sub {
  margin-left: 12rpx;
  font-size: 22rpx;
  font-weight: 400;
  color: #999999;
}

.type-row {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}
.type-btn {
  flex: 1;
  padding: 24rpx 0;
  border-radius: 16rpx;
  border: 2rpx solid #E8E3DB;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.type-btn.active {
  border-color: var(--brand);
  background: rgba(196, 30, 58, 0.05);
}
.type-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.type-name.active {
  color: var(--brand);
}
.type-desc {
  font-size: 22rpx;
  color: #999999;
}

.select-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
  padding: 24rpx;
  border: 1rpx solid #E8E3DB;
  border-radius: 16rpx;
}
.select-row.error {
  border-color: #E74C3C;
  background: rgba(231, 76, 60, 0.04);
}
.select-text {
  font-size: 28rpx;
  color: #2C2C2C;
}
.select-text.placeholder {
  color: #999999;
}
.err-tip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 12rpx;
}
.err-text {
  font-size: 22rpx;
  color: #E74C3C;
}

.amount-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 24rpx;
  padding: 20rpx 24rpx;
  border: 1rpx solid #E8E3DB;
  border-radius: 16rpx;
}
.amount-row.error {
  border-color: #E74C3C;
  background: rgba(231, 76, 60, 0.04);
}
.amount-symbol {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--brand);
}
.amount-input {
  flex: 1;
  font-size: 40rpx;
  font-weight: 700;
  color: #2C2C2C;
}
.full-btn {
  padding: 8rpx 16rpx;
  background: rgba(196, 30, 58, 0.08);
  border-radius: 8rpx;
}
.full-text {
  font-size: 22rpx;
  color: var(--brand);
}

.desc-input {
  width: 100%;
  height: 180rpx;
  margin-top: 20rpx;
  padding: 20rpx;
  background: #FAF8F5;
  border: 1rpx solid #E8E3DB;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #2C2C2C;
  box-sizing: border-box;
}
.ph {
  color: #999999;
}
.word-count {
  display: block;
  text-align: right;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #999999;
}

.upload-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 24rpx;
}
.upload-item {
  position: relative;
  width: 150rpx;
  height: 150rpx;
}
.upload-img {
  width: 150rpx;
  height: 150rpx;
  border-radius: 12rpx;
  background: #F5F5F5;
}
.upload-del {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #2C2C2C;
  display: flex;
  align-items: center;
  justify-content: center;
}
.upload-add {
  width: 150rpx;
  height: 150rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: #FFFFFF;
  border: 2rpx dashed #E8E3DB;
  border-radius: 12rpx;
}
.upload-hint {
  font-size: 22rpx;
  color: #999999;
}
.upload-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: #F5F5F5;
  border-radius: 12rpx;
}
.upload-spinner {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  border: 5rpx solid #E8E3DB;
  border-top-color: var(--brand);
  animation: spin 0.8s linear infinite;
}
.upload-loading-text {
  font-size: 22rpx;
  color: #999999;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.tips-card {
  margin: 24rpx 24rpx 0;
  padding: 28rpx;
  background: #FEF6E7;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.tips-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #B45309;
  margin-bottom: 8rpx;
}
.tips-line {
  font-size: 24rpx;
  color: #C2700A;
  line-height: 1.5;
}

.bottom-gap {
  height: 160rpx;
}

.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 24rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #E8E3DB;
}
.submit-btn {
  height: 88rpx;
  border-radius: 16rpx;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}
.submit-btn.disabled {
  opacity: 0.5;
}
.submit-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #FFFFFF;
}

.mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
}
.reason-sheet {
  width: 100%;
  max-height: 60vh;
  background: #FFFFFF;
  border-radius: 28rpx 28rpx 0 0;
  overflow: hidden;
}
.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  border-bottom: 1rpx solid #E8E3DB;
}
.sheet-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.reason-list {
  max-height: 50vh;
  padding: 20rpx 28rpx;
}
.reason-item {
  padding: 24rpx;
  margin-bottom: 16rpx;
  background: #FAF8F5;
  border-radius: 16rpx;
  border: 1rpx solid transparent;
}
.reason-item.active {
  background: rgba(196, 30, 58, 0.06);
  border-color: var(--brand);
}
.reason-text {
  font-size: 28rpx;
  color: #2C2C2C;
}
.reason-text.active {
  color: var(--brand);
}
</style>
