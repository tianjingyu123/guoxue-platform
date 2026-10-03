<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="44" color="#FFFFFF" />
        </view>
        <text class="nav-title">售后结果</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll-area" :style="{ paddingTop: navHeight + 'px' }">
      <view v-if="loading" class="page-state">
        <app-icon name="loader-2" :size="40" color="#C41E3A" class="state-spin" />
        <text class="page-state-text">加载中...</text>
      </view>
      <view v-else-if="error" class="page-state">
        <view class="page-state-icon"><app-icon name="alert-circle" :size="48" color="#C41E3A" /></view>
        <text class="page-state-text">{{ error }}</text>
        <view class="page-state-btn" @tap="fetchData"><text class="page-state-btn-text">重试</text></view>
      </view>
      <template v-else>
      <!-- 结果横幅 -->
      <view class="result-banner">
        <view class="result-icon">
          <app-icon name="x-circle" :size="64" color="#FFFFFF" />
        </view>
        <text class="result-title">售后申请已驳回</text>
        <text class="result-sub">您的售后申请未通过审核</text>
      </view>

      <!-- 驳回原因 -->
      <view class="reason-card">
        <view class="reason-head">
          <app-icon name="alert-triangle" :size="36" color="#C41E3A" />
          <text class="reason-head-text">驳回原因</text>
        </view>
        <text class="reason-body">{{ detail.rejectReason }}</text>
        <view class="reason-foot">
          <text class="reason-foot-label">处理时间</text>
          <text class="reason-foot-value">{{ rejectedTime }}</text>
        </view>
      </view>

      <!-- 售后信息 -->
      <view class="card">
        <view class="card-title-row">
          <app-icon name="file-text" :size="34" color="#C9A96E" />
          <text class="card-title">售后信息</text>
        </view>

        <view class="product-row">
          <image lazy-load class="product-cover" :src="detail.product.cover" mode="aspectFill" />
          <view class="product-info">
            <text class="product-name">{{ detail.product.name }}</text>
            <text class="product-sku">{{ detail.product.skuName }}</text>
            <view class="product-foot">
              <text class="product-price">¥{{ formatPrice(detail.product.price) }}</text>
              <text class="product-qty">x{{ detail.product.quantity }}</text>
            </view>
          </view>
        </view>

        <view class="info-list">
          <view class="info-item">
            <text class="info-label">售后类型</text>
            <text class="info-value">{{ afterSaleTypeLabel(detail.type) }}</text>
          </view>
          <view v-if="isRefundAfterSaleType(detail.type)" class="info-item">
            <text class="info-label">退款金额</text>
            <text class="info-value price">¥{{ formatPrice(detail.amount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">申请原因</text>
            <text class="info-value">{{ detail.reason }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">售后单号</text>
            <view class="info-copy">
              <text class="info-value">{{ detail.id }}</text>
              <view class="copy-btn" @tap="copyId">
                <app-icon :name="copied ? 'check-circle' : 'copy'" :size="28" color="#C9A96E" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 问题描述 -->
      <view v-if="detail.description" class="card">
        <text class="card-title">问题描述</text>
        <text class="desc-text">{{ detail.description }}</text>
      </view>

      <!-- 凭证图片 -->
      <view v-if="detail.images && detail.images.length" class="card">
        <text class="card-title">凭证图片</text>
        <view class="img-grid">
          <image lazy-load
            v-for="(img, idx) in detail.images"
            :key="idx"
            class="evidence-img"
            :src="img"
            mode="aspectFill"
            @tap="previewImage(idx)"
          />
        </view>
      </view>

      <!-- 申诉提示 -->
      <view class="appeal-card">
        <view class="appeal-icon">
          <app-icon name="message-circle" :size="36" color="#E8820C" />
        </view>
        <view class="appeal-text">
          <text class="appeal-title">对结果有异议？</text>
          <text class="appeal-desc">如果您对驳回结果有疑问，可以发起申诉，我们会安排专人重新审核您的售后申请。</text>
        </view>
      </view>

      <!-- 联系客服 -->
      <view class="service-card" @tap="contactService">
        <view class="service-left">
          <view class="service-icon">
            <app-icon name="message-circle" :size="34" color="#C9A96E" />
          </view>
          <view class="service-text">
            <text class="service-title">联系客服</text>
            <text class="service-desc">在线客服为您解答</text>
          </view>
        </view>
        <app-icon name="chevron-right" :size="30" color="#CCCCCC" />
      </view>

      <view class="bottom-gap" />
      </template>
    </scroll-view>

    <!-- 底部按钮（加载/错误态隐藏，避免空页浮出操作栏） -->
    <view v-if="!loading && !error" class="footer" :style="{ paddingBottom: safeBottom + 'px' }">
      <view class="footer-row">
        <view class="footer-btn ghost" @tap="reApply">
          <app-icon name="refresh-cw" :size="30" color="#C41E3A" />
          <text class="footer-btn-text-ghost">重新申请</text>
        </view>
        <view class="footer-btn primary" @tap="appeal">
          <app-icon name="alert-triangle" :size="30" color="#FFFFFF" />
          <text class="footer-btn-text-primary">我要申诉</text>
        </view>
      </view>
      <view class="footer-link" @tap="viewOrder">
        <text class="footer-link-text">查看订单详情</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack, navigateTo } from '@/utils/router'
import { accountApi, afterSaleTypeLabel, isRefundAfterSaleType } from '@/pkg-account/lib/account-data'
import { formatPrice } from '@/utils/format'

const statusBarHeight = ref(20)
const navHeight = ref(64)
const safeBottom = ref(0)
const copied = ref(false)
const loading = ref(false)
const error = ref('')

// 售后详情对象，字段由后端动态返回，保留 any 以免触发模板空值连锁报错
const detail = ref<any>({})

const rejectedTime = computed(() => {
  const node = detail.value.timeline?.find((t: { status?: string; time?: string }) => t.status === 'rejected')
  return node?.time || detail.value.createdAt || ''
})

let currentId = ''

async function fetchData() {
  if (!currentId) {
    error.value = '缺少售后ID参数'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const data = await accountApi.afterSaleRejected(currentId)
    detail.value = data || {}
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
  if (q && q.id) {
    currentId = q.id
  }
  fetchData()
})

function copyId() {
  uni.setClipboardData({
    data: detail.value.id,
    success: () => {
      copied.value = true
      setTimeout(() => (copied.value = false), 2000)
    },
  })
}

function previewImage(idx: number) {
  uni.previewImage({ urls: detail.value.images, current: idx })
}

function contactService() {
  navigateTo('/customer-service')
}

function reApply() {
  if (detail.value.type === 'exchange') {
    navigateTo('/shop/exchange?orderId=' + detail.value.orderId)
    return
  }
  if (detail.value.type === 'dispute' || detail.value.type === 'other') {
    navigateTo('/orders/dispute?orderId=' + detail.value.orderId)
    return
  }
  navigateTo('/shop/after-sale?orderId=' + detail.value.orderId + '&prefill=true')
}

function appeal() {
  navigateTo('/orders/dispute?orderId=' + detail.value.orderId)
}

function viewOrder() {
  navigateTo(`/orders/${detail.value.orderId}`)
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #FAF8F5;
}
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(90deg, var(--brand) 0%, #B83A3A 100%);
}
.nav-bar {
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 12rpx;
}
.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 600;
  color: #FFFFFF;
}
.nav-placeholder {
  width: 64rpx;
}
.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

/* 统一居中卡片式加载/错误态 */
.page-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 200rpx 48rpx;
}
.page-state-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}
.page-state-text {
  font-size: 28rpx;
  color: #999999;
  text-align: center;
}
.page-state-btn {
  margin-top: 8rpx;
  padding: 16rpx 56rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.page-state-btn-text {
  font-size: 28rpx;
  color: #FFFFFF;
}
.state-spin {
  animation: state-spin 1s linear infinite;
}
@keyframes state-spin {
  to { transform: rotate(360deg); }
}

.result-banner {
  background: linear-gradient(135deg, var(--brand) 0%, #B83A3A 100%);
  padding: 48rpx 24rpx 96rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.result-icon {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28rpx;
}
.result-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 12rpx;
}
.result-sub {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

.reason-card {
  margin: -56rpx 24rpx 0;
  background: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
}
.reason-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 28rpx 28rpx 0;
}
.reason-head-text {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--brand);
}
.reason-body {
  display: block;
  padding: 20rpx 28rpx 28rpx;
  font-size: 26rpx;
  color: #666666;
  line-height: 1.7;
}
.reason-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  background: #FAF8F5;
}
.reason-foot-label {
  font-size: 26rpx;
  color: #999999;
}
.reason-foot-value {
  font-size: 26rpx;
  color: #2C2C2C;
}

.card {
  margin: 24rpx 24rpx 0;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
}
.card-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}
.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C2C2C;
}

.product-row {
  display: flex;
  gap: 20rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #F0EAE2;
}
.product-cover {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #FAF8F5;
}
.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.product-name {
  font-size: 26rpx;
  color: #2C2C2C;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.product-sku {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #999999;
}
.product-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}
.product-price {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--brand);
}
.product-qty {
  font-size: 22rpx;
  color: #999999;
}

.info-list {
  padding-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.info-label {
  font-size: 26rpx;
  color: #999999;
}
.info-value {
  font-size: 26rpx;
  color: #2C2C2C;
}
.info-value.price {
  color: var(--brand);
  font-weight: 600;
}
.info-copy {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.copy-btn {
  display: flex;
  align-items: center;
}

.desc-text {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #666666;
  line-height: 1.7;
}

.img-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 16rpx;
}
.evidence-img {
  width: 150rpx;
  height: 150rpx;
  border-radius: 12rpx;
  background: #FAF8F5;
}

.appeal-card {
  margin: 24rpx 24rpx 0;
  padding: 28rpx;
  background: linear-gradient(90deg, #FFF7ED 0%, #FFFBF5 100%);
  border: 1rpx solid rgba(232, 130, 12, 0.2);
  border-radius: 24rpx;
  display: flex;
  gap: 20rpx;
}
.appeal-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(232, 130, 12, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.appeal-text {
  flex: 1;
}
.appeal-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #2C2C2C;
  margin-bottom: 8rpx;
}
.appeal-desc {
  font-size: 24rpx;
  color: #666666;
  line-height: 1.6;
}

.service-card {
  margin: 24rpx 24rpx 0;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.service-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.service-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(201, 169, 110, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.service-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.service-desc {
  font-size: 22rpx;
  color: #999999;
}

.bottom-gap {
  height: 220rpx;
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  border-top: 1rpx solid #F0EAE2;
  padding: 20rpx 24rpx;
}
.footer-row {
  display: flex;
  gap: 20rpx;
}
.footer-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}
.footer-btn.ghost {
  border: 1rpx solid var(--brand);
}
.footer-btn.primary {
  background: linear-gradient(90deg, var(--brand) 0%, #B83A3A 100%);
}
.footer-btn-text-ghost {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--brand);
}
.footer-btn-text-primary {
  font-size: 28rpx;
  font-weight: 600;
  color: #FFFFFF;
}
.footer-link {
  margin-top: 16rpx;
  height: 72rpx;
  background: #FAF8F5;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.footer-link-text {
  font-size: 26rpx;
  color: #666666;
}
</style>
