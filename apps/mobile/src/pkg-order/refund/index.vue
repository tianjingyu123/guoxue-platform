<template>
  <view v-if="isLoading" class="page">
    <view style="padding: 24rpx;">
      <AppSkeleton width="100%" height="88rpx" radius="0" mb="24rpx" />
      <AppSkeleton width="100%" height="160rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" mb="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="isEmpty" title="暂无退款信息" desc="未找到相关退款记录" actionText="查看订单" @action="goOrders" />
  <view v-else class="page">
    <app-nav-bar
      title="退款进度"
      :back-size="40"
      :title-size="36"
      :bar-height="106"
      serif-title
      title-align="left"
    />

    <scroll-view
      scroll-y
      class="scroll-area"
    >
      <!-- 退款金额卡片 -->
      <view class="amount-card">
        <view class="amount-head">
          <app-icon
            name="wallet"
            :size="40"
            color="#FFFFFF"
          />
          <text class="amount-label">
            退款金额
          </text>
        </view>
        <text class="amount-value">
          ¥{{ data.amount.toFixed(2) }}
        </text>
        <text class="amount-method">
          退款方式：原路退回至{{ refundMethod }}
        </text>
        <view
          v-if="data.status === 'refunding'"
          class="amount-pill"
        >
          <app-icon
            name="clock"
            :size="28"
            color="#FFFFFF"
          />
          <text class="amount-pill-text">
            预计 {{ estimatedDate }} 前到账
          </text>
        </view>
        <view
          v-else-if="data.status === 'completed'"
          class="amount-pill"
        >
          <app-icon
            name="check"
            :size="28"
            color="#FFFFFF"
          />
          <text class="amount-pill-text">
            退款已到账
          </text>
        </view>
      </view>

      <!-- 退款进度时间轴 -->
      <view class="card">
        <text class="card-title">
          退款进度
        </text>
        <view class="timeline">
          <view
            v-for="(node, idx) in data.timeline"
            :key="idx"
            class="tl-node"
          >
            <view class="tl-col">
              <view
                class="tl-dot"
                :class="{ done: nodeStatus(idx) === 'completed', current: nodeStatus(idx) === 'refunding' }"
              >
                <app-icon
                  v-if="nodeStatus(idx) === 'completed'"
                  name="check"
                  :size="24"
                  color="#FFFFFF"
                />
                <app-icon
                  v-else-if="nodeStatus(idx) === 'refunding'"
                  name="clock"
                  :size="24"
                  color="#FFFFFF"
                />
                <view
                  v-else
                  class="tl-dot-pending"
                />
              </view>
              <view
                v-if="idx < data.timeline.length - 1"
                class="tl-line"
                :class="{ done: nodeStatus(idx) === 'completed' }"
              />
            </view>
            <view class="tl-body">
              <view class="tl-row">
                <text
                  class="tl-title"
                  :class="{ active: nodeStatus(idx) !== 'pending' }"
                >
                  {{ node.title }}
                </text>
                <text
                  v-if="node.time"
                  class="tl-time"
                >
                  {{ node.time }}
                </text>
              </view>
              <text
                class="tl-desc"
                :class="{ active: nodeStatus(idx) !== 'pending' }"
              >
                {{ node.description }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 退款信息 -->
      <view class="card">
        <text class="card-title">
          退款信息
        </text>
        <view class="info-row">
          <text class="info-label">
            退款单号
          </text>
          <view class="info-copy">
            <text class="info-val">
              {{ data.id }}
            </text>
            <view
              class="copy-btn"
              @tap="copyId"
            >
              <app-icon
                name="copy"
                :size="24"
                color="#C41E3A"
              />
            </view>
          </view>
        </view>
        <view class="info-row">
          <text class="info-label">
            关联订单
          </text>
          <view
            class="info-link"
            @tap="viewOrder"
          >
            <text class="info-link-text">
              {{ data.orderNo }}
            </text>
            <app-icon
              name="arrow-right"
              :size="20"
              color="#C41E3A"
            />
          </view>
        </view>
        <view class="info-row">
          <text class="info-label">
            退款类型
          </text>
          <text class="info-val">
            {{ data.type === 'refund_only' ? '仅退款' : '退货退款' }}
          </text>
        </view>
        <view class="info-row">
          <text class="info-label">
            退款原因
          </text>
          <text class="info-val">
            {{ data.reason }}
          </text>
        </view>
        <view class="info-row">
          <text class="info-label">
            申请时间
          </text>
          <text class="info-val">
            {{ data.createdAt }}
          </text>
        </view>
      </view>

      <!-- 退款商品 -->
      <view class="card">
        <text class="card-title">
          退款商品
        </text>
        <view class="product-row">
          <image
            class="product-cover"
            :src="data.product.cover"
            mode="aspectFill"
          />
          <view class="product-info">
            <text class="product-name">
              {{ data.product.name }}
            </text>
            <text class="product-sku">
              {{ data.product.skuName }}
            </text>
            <view class="product-foot">
              <text class="product-price">
                ¥{{ data.product.price }}
              </text>
              <text class="product-qty">
                ×{{ data.product.quantity }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 温馨提示 -->
      <view class="tips-card">
        <app-icon
          name="alert-circle"
          :size="40"
          color="#f97316"
          class="tips-icon"
        />
        <view class="tips-body">
          <text class="tips-title">
            温馨提示
          </text>
          <view class="tips-li">
            <text class="tips-dot">
              ·
            </text><text class="tips-text">
              退款将在1-3个工作日内原路退回
            </text>
          </view>
          <view class="tips-li">
            <text class="tips-dot">
              ·
            </text><text class="tips-text">
              银行卡退款可能延迟，具体以银行到账时间为准
            </text>
          </view>
          <view class="tips-li">
            <text class="tips-dot">
              ·
            </text><text class="tips-text">
              如有疑问，请联系在线客服
            </text>
          </view>
        </view>
      </view>

      <view class="bottom-gap" />
    </scroll-view>

    <!-- 底部操作 -->
    <view
      class="action-bar"
      :style="{ paddingBottom: safeBottom + 'px' }"
    >
      <view
        class="action-btn ghost"
        @tap="contactService"
      >
        <app-icon
          name="message-circle"
          :size="32"
          color="#2C2C2C"
        />
        <text class="action-text">
          联系客服
        </text>
      </view>
      <view
        class="action-btn ghost"
        @tap="goDispute"
      >
        <app-icon
          name="shield"
          :size="32"
          color="#2C2C2C"
        />
        <text class="action-text">
          我要申诉
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import { navigateTo } from '@/utils/router'
import { useAsyncData } from '@/composables/useAsyncData'
import { mockRefund as _mockRefund, type RefundDetail } from '@/lib/order-data'

const { data: pageData, isLoading, loadError, reload } = useAsyncData(async () => {
  return { refund: _mockRefund }
})

const isEmpty = computed(() => !pageData.value?.refund?.id)

const safeBottom = ref(0)
const emptyRefund: RefundDetail = {
  id: '', orderId: '', orderNo: '', type: 'refund_only', status: 'submitted',
  reason: '', amount: 0, description: '',
  product: { id: '', name: '', cover: '', skuName: '', price: 0, quantity: 0 },
  timeline: [], createdAt: '', canCancel: false,
}
const data = computed<RefundDetail>(() => pageData.value?.refund ?? emptyRefund)

const refundMethod = '微信支付'
const estimatedDate = '2024年1月18日'

const currentIndex = computed(() => data.value.timeline.findIndex((n) => n.isCurrent))

function nodeStatus(idx: number): 'completed' | 'refunding' | 'pending' {
  if (currentIndex.value === -1) return data.value.status === 'completed' ? 'completed' : 'pending'
  if (idx < currentIndex.value) return 'completed'
  if (idx === currentIndex.value) return 'refunding'
  return 'pending'
}

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    safeBottom.value = info.safeAreaInsets?.bottom || 0
  } catch (e) {
    safeBottom.value = 0
  }
})

function copyId() {
  uni.setClipboardData({
    data: data.value.id,
    success: () => uni.showToast({ title: '已复制', icon: 'none' }),
  })
}
function contactService() {
  uni.showToast({ title: '正在接入客服', icon: 'none' })
}
function viewOrder() {
  navigateTo(`/orders/${data.value.orderId}`)
}
function goDispute() {
  navigateTo(`/orders/dispute?orderId=${data.value.orderId}`)
}
function goOrders() { navigateTo('/orders') }
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #FAF8F5;
}

.scroll-area {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}

/* 退款金额卡片 */
.amount-card {
  margin: 32rpx;
  padding: 48rpx;
  background: linear-gradient(to bottom right, #22c55e, #16a34a);
  border-radius: 32rpx;
}
.amount-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.amount-label {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
}
.amount-value {
  display: block;
  font-size: 72rpx;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 24rpx;
}
.amount-method {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
}
.amount-pill {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 24rpx;
  padding: 16rpx 24rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16rpx;
}
.amount-pill-text {
  font-size: 28rpx;
  color: #FFFFFF;
}

.card {
  margin: 0 32rpx 32rpx;
  padding: 32rpx;
  background: #FFFFFF;
  border-radius: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
}

/* 时间轴 */
.timeline {
  margin-top: 32rpx;
}
.tl-node {
  display: flex;
  gap: 24rpx;
}
.tl-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.tl-dot {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #e5e7eb;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tl-dot.done {
  background: #22c55e;
}
.tl-dot.current {
  background: #f97316;
}
.tl-dot-pending {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #9ca3af;
}
.tl-line {
  flex: 1;
  width: 4rpx;
  background: #e5e7eb;
  margin: 4rpx 0;
}
.tl-line.done {
  background: #22c55e;
}
.tl-body {
  flex: 1;
  padding-bottom: 48rpx;
}
.tl-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tl-title {
  font-size: 28rpx;
  color: #9ca3af;
  font-weight: 500;
}
.tl-title.active {
  color: #2C2C2C;
}
.tl-time {
  font-size: 24rpx;
  color: #999999;
}
.tl-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  color: #9ca3af;
}
.tl-desc.active {
  color: #666666;
}

/* 退款信息 */
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
}
.info-label {
  font-size: 28rpx;
  color: #999999;
}
.info-val {
  font-size: 28rpx;
  color: #2C2C2C;
}
.info-copy {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.copy-btn {
  padding: 4rpx;
}
.info-link {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.info-link-text {
  font-size: 28rpx;
  color: #C41E3A;
}

/* 退款商品 */
.product-row {
  display: flex;
  gap: 24rpx;
  margin-top: 24rpx;
}
.product-cover {
  width: 128rpx;
  height: 128rpx;
  border-radius: 16rpx;
  background: #F5F5F5;
}
.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.product-name {
  font-size: 28rpx;
  color: #2C2C2C;
  line-height: 1.4;
}
.product-sku {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999999;
}
.product-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.product-price {
  font-size: 28rpx;
  font-weight: 500;
  color: #C41E3A;
}
.product-qty {
  font-size: 24rpx;
  color: #999999;
}

/* 温馨提示 */
.tips-card {
  display: flex;
  gap: 16rpx;
  margin: 0 32rpx 32rpx;
  padding: 32rpx;
  background: #fff7ed;
  border: 1rpx solid #fed7aa;
  border-radius: 24rpx;
}
.tips-icon {
  flex-shrink: 0;
  margin-top: 4rpx;
}
.tips-body {
  flex: 1;
}
.tips-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #c2410c;
  margin-bottom: 8rpx;
}
.tips-li {
  display: flex;
  gap: 8rpx;
}
.tips-dot {
  font-size: 28rpx;
  color: #ea580c;
}
.tips-text {
  flex: 1;
  font-size: 28rpx;
  color: #ea580c;
  line-height: 1.6;
}

.bottom-gap {
  height: 160rpx;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #E8E3DB;
}
.action-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.action-btn.ghost {
  border: 1rpx solid #E8E3DB;
}
.action-text {
  font-size: 28rpx;
  color: #2C2C2C;
}
</style>
