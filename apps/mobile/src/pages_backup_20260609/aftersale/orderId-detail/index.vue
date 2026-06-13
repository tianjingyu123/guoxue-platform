<template>
  <view class="as-page">
    <!-- 步骤1: 申请表单 -->
    <template v-if="step === 'form'">
      <view class="header-sticky">
        <view class="header-row">
          <text class="header-back" @click="uni.navigateBack()">‹</text>
          <text class="header-title">申请售后</text>
          <view class="header-spacer" />
        </view>
      </view>

      <view class="as-body">
        <!-- 商品信息 -->
        <view class="card">
          <view class="prod-row">
            <view class="prod-cover">
              <text>📦</text>
            </view>
            <view class="prod-info">
              <text class="prod-name">{{ orderProduct.name }}</text>
              <text class="prod-spec">{{ orderProduct.spec }}</text>
              <view class="prod-price-row">
                <text class="prod-price">¥{{ orderProduct.price }}</text>
                <text class="prod-qty">x{{ orderProduct.quantity }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 售后类型 -->
        <view class="card">
          <text class="card-title">选择售后类型</text>
          <view v-for="t in aftersaleTypes" :key="t.id" class="type-item" :class="{ active: selectedType === t.id }" @click="selectedType = t.id">
            <view class="ti-icon" :class="{ active: selectedType === t.id }">
              <text>{{ t.emoji }}</text>
            </view>
            <view class="ti-info">
              <text class="ti-label">{{ t.label }}</text>
              <text class="ti-desc">{{ t.desc }}</text>
            </view>
            <view v-if="selectedType === t.id" class="ti-check">
              <text>✓</text>
            </view>
          </view>
        </view>

        <!-- 售后原因 -->
        <view class="card">
          <text class="card-title">选择原因</text>
          <view class="reason-chips">
            <text v-for="r in aftersaleReasons" :key="r.id" class="reason-chip" :class="{ active: selectedReason === r.id }" @click="selectedReason = r.id">{{ r.label }}</text>
          </view>
        </view>

        <!-- 退款金额 -->
        <view v-if="selectedType === 'refund_only' || selectedType === 'return_refund'" class="card">
          <view class="refund-row">
            <text class="refund-label">可退金额</text>
            <text class="refund-amount">¥{{ orderProduct.maxRefund.toFixed(2) }}</text>
          </view>
          <text class="refund-hint">系统已自动计算可退金额（含商品金额，不含运费）</text>
        </view>

        <!-- 问题描述 -->
        <view class="card">
          <text class="card-title">问题描述</text>
          <textarea v-model="description" class="desc-input" placeholder="请详细描述您遇到的问题，有助于我们更快处理" :maxlength="200" />
          <text class="desc-count">{{ description.length }}/200</text>
        </view>

        <!-- 上传凭证 -->
        <view class="card">
          <text class="card-title">上传凭证（最多3张）</text>
          <view class="img-row">
            <view v-for="(img, i) in images" :key="i" class="img-item">
              <text class="img-icon">📷</text>
              <view class="img-del" @click="images.splice(i, 1)"><text>✕</text></view>
            </view>
            <view v-if="images.length < 3" class="img-add" @click="images.push('img_' + (images.length + 1))">
              <text class="img-add-icon">📷</text>
              <text class="img-add-text">上传</text>
            </view>
          </view>
        </view>

        <!-- 提示 -->
        <view class="hint-row">
          <text class="hint-icon">ℹ️</text>
          <text class="hint-text">提交申请后，商家将在24小时内审核。如审核通过，请按指引操作。</text>
        </view>
      </view>

      <view class="bottom-bar">
        <view class="submit-btn" :class="{ disabled: !selectedType || !selectedReason || isSubmitting }" @click="handleSubmit">
          <text>{{ isSubmitting ? '提交中...' : '提交申请' }}</text>
        </view>
      </view>
    </template>

    <!-- 步骤2: 提交成功 -->
    <template v-if="step === 'success'">
      <view class="success-page">
        <view class="success-circle">
          <text>✓</text>
        </view>
        <text class="success-title">申请已提交</text>
        <text class="success-desc">商家将在24小时内处理您的申请\n请留意消息通知</text>
        <view class="success-btns">
          <view class="succ-btn primary" @click="step = 'tracking'">
            <text>查看进度</text>
          </view>
          <view class="succ-btn outline" @click="goPage('/pages/orders/index')">
            <text>返回订单</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 步骤3: 售后进度跟踪 -->
    <template v-if="step === 'tracking'">
      <view class="header-sticky">
        <view class="header-row">
          <text class="header-back" @click="uni.navigateBack()">‹</text>
          <text class="header-title">售后进度</text>
          <view class="header-spacer" />
        </view>
      </view>

      <view class="as-body">
        <!-- 当前状态 -->
        <view class="status-card">
          <view class="sc-row">
            <view class="sc-icon-wrap">
              <text class="sc-icon">⏰</text>
            </view>
            <view class="sc-info">
              <text class="sc-title">商家审核中</text>
              <text class="sc-sub">预计24小时内处理完毕</text>
            </view>
          </view>
        </view>

        <!-- 进度时间轴 -->
        <view class="card">
          <text class="card-title">处理进度</text>
          <view class="progress-list">
            <view v-for="(s, i) in aftersaleSteps" :key="s.id" class="prog-item">
              <view class="prog-line-col">
                <view class="prog-dot" :class="'dot-' + s.status">
                  <text v-if="s.status === 'completed'">✓</text>
                  <text v-else-if="s.status === 'current'">⏰</text>
                  <view v-else class="prog-empty-dot" />
                </view>
                <view v-if="i < aftersaleSteps.length - 1" class="prog-line" :class="'line-' + s.status" />
              </view>
              <view class="prog-content">
                <text class="prog-label" :class="'text-' + s.status">{{ s.label }}</text>
                <text v-if="s.time" class="prog-time">{{ s.time }}</text>
                <text v-if="s.status === 'current'" class="prog-pending">处理中...</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 退货地址（待审核） -->
        <view class="card dimmed">
          <view class="addr-head">
            <text class="addr-title">退货地址</text>
            <text class="addr-badge">待审核通过</text>
          </view>
          <text class="addr-placeholder">商家审核通过后，将显示退货地址信息</text>
        </view>

        <!-- 申请信息 -->
        <view class="card">
          <text class="card-title">申请信息</text>
          <view class="info-list">
            <view class="info-row">
              <text class="info-label">售后类型</text>
              <text class="info-val">退货退款</text>
            </view>
            <view class="info-row">
              <text class="info-label">申请原因</text>
              <text class="info-val">质量问题</text>
            </view>
            <view class="info-row">
              <text class="info-label">退款金额</text>
              <text class="info-val price">¥{{ orderProduct.maxRefund.toFixed(2) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">申请时间</text>
              <text class="info-val">2026-05-09 14:30</text>
            </view>
            <view class="info-row">
              <text class="info-label">售后单号</text>
              <view class="info-val-row">
                <text class="info-val">AS202605091430001</text>
                <text class="info-copy" @click="copyAsNum">📋</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 商品信息 -->
        <view class="card">
          <view class="prod-row">
            <view class="prod-cover small">
              <text>📦</text>
            </view>
            <view class="prod-info">
              <text class="prod-name">{{ orderProduct.name }}</text>
              <text class="prod-spec">{{ orderProduct.spec }}</text>
              <text class="prod-qty-text">x{{ orderProduct.quantity }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-bar">
        <view class="bb-row">
          <view class="bb-btn outline" @click="uni.navigateBack()">
            <text>撤销申请</text>
          </view>
          <view class="bb-btn primary" @click="goPage('/pages/help/index')">
            <text>联系客服</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const step = ref<'form' | 'success' | 'tracking'>('form')
const selectedType = ref('')
const selectedReason = ref('')
const description = ref('')
const images = ref<string[]>([])
const isSubmitting = ref(false)

const orderProduct = {
  id: 1,
  name: '《渊海子平》精装典藏版',
  spec: '精装版·红色',
  price: 168,
  quantity: 1,
  maxRefund: 168,
}

const aftersaleTypes = [
  { id: 'refund_only', label: '仅退款', desc: '无需退货，直接退款', emoji: '💳' },
  { id: 'return_refund', label: '退货退款', desc: '需寄回商品，收到后退款', emoji: '📦' },
  { id: 'exchange', label: '换货', desc: '商品有问题，申请换货', emoji: '🚚' },
]

const aftersaleReasons = [
  { id: 'quality', label: '质量问题' },
  { id: 'mismatch', label: '与描述不符' },
  { id: 'wrong', label: '发错货' },
  { id: 'unwanted', label: '不想要了' },
  { id: 'damage', label: '商品破损' },
  { id: 'other', label: '其他原因' },
]

const aftersaleSteps = [
  { id: 1, label: '提交申请', status: 'completed', time: '2026-05-09 14:30' },
  { id: 2, label: '商家审核', status: 'current', time: '' },
  { id: 3, label: '退货地址', status: 'pending', time: '' },
  { id: 4, label: '用户寄回', status: 'pending', time: '' },
  { id: 5, label: '商家收货', status: 'pending', time: '' },
  { id: 6, label: '退款到账', status: 'pending', time: '' },
]

async function handleSubmit() {
  if (!selectedType.value || !selectedReason.value) return
  isSubmitting.value = true
  await new Promise(r => setTimeout(r, 1500))
  isSubmitting.value = false
  step.value = 'success'
}

function copyAsNum() {
  uni.setClipboardData({ data: 'AS202605091430001' })
  uni.showToast({ title: '已复制', icon: 'success' })
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.as-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 160rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.header-spacer { width: 56rpx; }

.as-body { padding: 14rpx 24rpx; display: flex; flex-direction: column; gap: 14rpx; }
.card { background: #fff; border-radius: 14rpx; padding: 18rpx 20rpx; border: 1px solid #E8E0D5; }
.card-title { font-size: 26rpx; font-weight: 500; color: #333; display: block; margin-bottom: 12rpx; }

.prod-row { display: flex; gap: 14rpx; }
.prod-cover { width: 108rpx; height: 108rpx; border-radius: 12rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 40rpx; flex-shrink: 0; }
.prod-cover.small { width: 88rpx; height: 88rpx; font-size: 32rpx; }
.prod-info { flex: 1; min-width: 0; }
.prod-name { font-size: 26rpx; color: #333; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.prod-spec { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }
.prod-price-row { display: flex; align-items: center; justify-content: space-between; margin-top: 8rpx; }
.prod-price { font-size: 26rpx; font-weight: 500; color: #C41E3A; }
.prod-qty { font-size: 20rpx; color: #999; }
.prod-qty-text { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }

.type-item { display: flex; align-items: center; gap: 14rpx; padding: 16rpx; border-radius: 14rpx; border: 1px solid #E8E0D5; margin-bottom: 10rpx; }
.type-item:last-child { margin-bottom: 0; }
.type-item.active { border-color: #C41E3A; background: rgba(196,30,58,0.04); }
.ti-icon { width: 64rpx; height: 64rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.ti-icon.active { background: rgba(196,30,58,0.08); }
.ti-info { flex: 1; }
.ti-label { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.ti-item.active .ti-label { color: #C41E3A; }
.ti-desc { font-size: 20rpx; color: #999; }
.ti-check { width: 40rpx; height: 40rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; }
.ti-check text { font-size: 20rpx; color: #fff; }

.reason-chips { display: flex; flex-wrap: wrap; gap: 10rpx; }
.reason-chip { font-size: 24rpx; padding: 12rpx 24rpx; border-radius: 12rpx; background: #F5F1EB; color: #666; }
.reason-chip.active { background: #C41E3A; color: #fff; }

.refund-row { display: flex; justify-content: space-between; align-items: center; }
.refund-label { font-size: 24rpx; color: #999; }
.refund-amount { font-size: 40rpx; font-weight: 700; color: #C41E3A; }
.refund-hint { font-size: 20rpx; color: #BBB; display: block; margin-top: 8rpx; }

.desc-input { width: 100%; height: 160rpx; padding: 14rpx; background: #F5F1EB; border-radius: 12rpx; font-size: 24rpx; color: #333; box-sizing: border-box; }
.desc-count { font-size: 18rpx; color: #BBB; text-align: right; display: block; margin-top: 6rpx; }

.img-row { display: flex; gap: 12rpx; }
.img-item { width: 140rpx; height: 140rpx; border-radius: 12rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; position: relative; }
.img-icon { font-size: 36rpx; opacity: 0.3; }
.img-del { position: absolute; top: -8rpx; right: -8rpx; width: 36rpx; height: 36rpx; border-radius: 50%; background: #FF4D4F; display: flex; align-items: center; justify-content: center; }
.img-del text { font-size: 16rpx; color: #fff; }
.img-add { width: 140rpx; height: 140rpx; border-radius: 12rpx; border: 2rpx dashed #E8E0D5; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4rpx; }
.img-add-icon { font-size: 28rpx; opacity: 0.3; }
.img-add-text { font-size: 18rpx; color: #BBB; }

.hint-row { display: flex; align-items: flex-start; gap: 6rpx; }
.hint-icon { font-size: 24rpx; color: #BBB; flex-shrink: 0; }
.hint-text { font-size: 20rpx; color: #BBB; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(12rpx); border-top: 1px solid #E8E0D5; padding: 14rpx 24rpx; padding-bottom: calc(14rpx + env(safe-area-inset-bottom)); z-index: 20; }
.submit-btn { padding: 16rpx; text-align: center; background: #C41E3A; border-radius: 14rpx; }
.submit-btn text { font-size: 28rpx; color: #fff; }
.submit-btn.disabled { background: #F5F1EB; }
.submit-btn.disabled text { color: #BBB; }
.bb-row { display: flex; gap: 14rpx; }
.bb-btn { flex: 1; padding: 16rpx; text-align: center; border-radius: 14rpx; }
.bb-btn.outline { background: #F5F1EB; }
.bb-btn.primary { background: #C41E3A; }
.bb-btn text { font-size: 26rpx; }
.bb-btn.outline text { color: #666; }
.bb-btn.primary text { color: #fff; }

.success-page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 48rpx; }
.success-circle { width: 120rpx; height: 120rpx; border-radius: 50%; background: rgba(82,196,26,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.success-circle text { font-size: 48rpx; color: #52C41A; }
.success-title { font-size: 36rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 12rpx; }
.success-desc { font-size: 24rpx; color: #999; text-align: center; white-space: pre-line; margin-bottom: 36rpx; }
.success-btns { display: flex; gap: 16rpx; width: 100%; max-width: 500rpx; }
.succ-btn { flex: 1; padding: 18rpx; text-align: center; border-radius: 14rpx; }
.succ-btn.primary { background: #C41E3A; }
.succ-btn.outline { background: #F5F1EB; }
.succ-btn text { font-size: 26rpx; }
.succ-btn.primary text { color: #fff; }
.succ-btn.outline text { color: #666; }

.status-card { background: linear-gradient(135deg, rgba(250,140,22,0.06), rgba(250,140,22,0.02)); border: 1px solid rgba(250,140,22,0.15); border-radius: 14rpx; padding: 18rpx 20rpx; }
.sc-row { display: flex; align-items: center; gap: 14rpx; }
.sc-icon-wrap { width: 76rpx; height: 76rpx; border-radius: 50%; background: rgba(250,140,22,0.08); display: flex; align-items: center; justify-content: center; }
.sc-icon { font-size: 32rpx; }
.sc-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; }
.sc-sub { font-size: 20rpx; color: #999; }

.progress-list {  }
.prog-item { display: flex; gap: 0; }
.prog-line-col { display: flex; flex-direction: column; align-items: center; width: 44rpx; flex-shrink: 0; }
.prog-dot { width: 36rpx; height: 36rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16rpx; flex-shrink: 0; }
.prog-dot.dot-completed { background: #52C41A; }
.prog-dot.dot-completed text { color: #fff; font-size: 18rpx; }
.prog-dot.dot-current { background: #FA8C16; }
.prog-dot.dot-current text { color: #fff; font-size: 18rpx; }
.prog-dot.dot-pending { background: #F5F1EB; }
.prog-empty-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #DDD; }
.prog-line { width: 2rpx; flex: 1; background: #E8E0D5; min-height: 36rpx; margin: 4rpx 0; }
.prog-line.line-completed { background: #52C41A; }
.prog-content { flex: 1; padding-bottom: 20rpx; margin-left: 14rpx; }
.prog-label { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.prog-label.text-completed { color: #52C41A; }
.prog-label.text-current { color: #FA8C16; }
.prog-label.text-pending { color: #BBB; }
.prog-time { font-size: 18rpx; color: #BBB; }
.prog-pending { font-size: 18rpx; color: #FA8C16; }

.card.dimmed { opacity: 0.5; }
.addr-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.addr-title { font-size: 26rpx; font-weight: 500; color: #333; }
.addr-badge { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: #F5F1EB; color: #999; }
.addr-placeholder { font-size: 20rpx; color: #BBB; }

.info-list { }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 10rpx 0; border-bottom: 1px solid #F8F5F0; }
.info-row:last-child { border-bottom: 0; }
.info-label { font-size: 24rpx; color: #999; }
.info-val { font-size: 24rpx; color: #333; }
.info-val.price { color: #C41E3A; font-weight: 500; }
.info-val-row { display: flex; align-items: center; gap: 8rpx; }
.info-copy { font-size: 24rpx; }
</style>
