<template>
  <view class="page">
    <view
      class="nav-bar"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view
        class="nav-back"
        @tap="goBack"
      >
        <app-icon
          name="arrow-left"
          :size="40"
          color="#1A1A1A"
        />
      </view>
      <text class="nav-title">
        退款进度
      </text>
      <view class="nav-placeholder" />
    </view>

    <!-- Loading -->
    <view
      v-if="loading"
      class="load-state"
      :style="{ paddingTop: navHeight + 'px' }"
    >
      <view class="load-spinner" />
      <text class="load-text">
        加载中...
      </text>
    </view>

    <!-- Error -->
    <view
      v-else-if="error"
      class="err-state"
      :style="{ paddingTop: navHeight + 'px' }"
    >
      <app-icon
        name="alert-circle"
        :size="80"
        color="#CCCCCC"
      />
      <text class="err-text">
        加载失败
      </text>
      <view
        class="err-btn"
        @tap="loadData"
      >
        重新加载
      </view>
    </view>

    <!-- Content -->
    <template v-else>
      <scroll-view
        scroll-y
        class="scroll-area"
        :style="{ paddingTop: navHeight + 'px' }"
      >
        <!-- 退款状态横幅 -->
        <view class="status-banner">
          <view class="status-icon">
            <app-icon
              name="refresh-cw"
              :size="56"
              color="#FFFFFF"
            />
          </view>
          <text class="status-title">
            退款处理中
          </text>
          <text class="status-sub">
            预计 {{ data.estimatedDate }} 前到账
          </text>
        </view>

        <!-- 退款时间轴 -->
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
                  :class="{ done: isDone(idx), current: node.isCurrent }"
                >
                  <app-icon
                    v-if="isDone(idx) && !node.isCurrent"
                    name="check"
                    :size="24"
                    color="#FFFFFF"
                  />
                </view>
                <view
                  v-if="idx < data.timeline.length - 1"
                  class="tl-line"
                  :class="{ done: isDone(idx + 1) }"
                />
              </view>
              <view class="tl-body">
                <text
                  class="tl-title"
                  :class="{ active: node.isCurrent || isDone(idx) }"
                >
                  {{ node.title }}
                </text>
                <text class="tl-desc">
                  {{ node.description }}
                </text>
                <text
                  v-if="node.time"
                  class="tl-time"
                >
                  {{ node.time }}
                </text>
              </view>
            </view>
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
                  x{{ data.product.quantity }}
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
              退款编号
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
                  color="#9A2D2D"
                />
              </view>
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
              退款金额
            </text>
            <text class="info-val amount">
              ¥{{ data.amount }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">
              退款方式
            </text>
            <text class="info-val">
              原路退回（{{ data.refundMethod }}）
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
          <text class="action-text">
            联系客服
          </text>
        </view>
        <view
          class="action-btn primary"
          @tap="viewOrder"
        >
          <text class="action-text-primary">
            查看订单
          </text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack, navigateTo } from '@/utils/router'
import { orderApi } from '@/lib/order-data'

const statusBarHeight = ref(20)
const navHeight = ref(64)
const safeBottom = ref(0)
const loading = ref(true)
const error = ref(false)

const data = ref<any>(null)

const currentIndex = computed(() => {
  if (!data.value?.timeline) return -1
  return data.value.timeline.findIndex((n: any) => n.isCurrent)
})

function isDone(idx: number) {
  return idx <= currentIndex.value
}

onLoad(async () => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
    navHeight.value = statusBarHeight.value + 44
    safeBottom.value = info.safeAreaInsets?.bottom || 0
  } catch (e) {
    statusBarHeight.value = 20
    navHeight.value = 64
  }
  await loadData()
})

async function loadData() {
  loading.value = true
  error.value = false
  try {
    const res = await orderApi.getRefundDetail('current')
    data.value = res
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function copyId() {
  if (!data.value) return
  uni.setClipboardData({
    data: data.value.id,
    success: () => uni.showToast({ title: '已复制', icon: 'none' }),
  })
}
function contactService() {
  uni.showToast({ title: '正在接入客服', icon: 'none' })
}
function viewOrder() {
  if (!data.value) return
  navigateTo(`/orders/${data.value.orderId}`)
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #F5F5F5;
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
  border-bottom: 1rpx solid #EEEEEE;
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
  color: #1A1A1A;
}
.nav-placeholder {
  width: 60rpx;
}

.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

.status-banner {
  margin: 20rpx 24rpx 0;
  padding: 48rpx;
  background: linear-gradient(135deg, #B8860B 0%, #D4A017 100%);
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.status-icon {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.status-title {
  margin-top: 24rpx;
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
}
.status-sub {
  margin-top: 10rpx;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
}

.card {
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
}
.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.timeline {
  margin-top: 24rpx;
}
.tl-node {
  display: flex;
  gap: 20rpx;
}
.tl-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.tl-dot {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #DDDDDD;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tl-dot.done {
  background: #B8860B;
}
.tl-dot.current {
  background: #B8860B;
  box-shadow: 0 0 0 6rpx rgba(184, 134, 11, 0.2);
}
.tl-line {
  flex: 1;
  width: 2rpx;
  background: #EEEEEE;
  margin: 4rpx 0;
}
.tl-line.done {
  background: #B8860B;
}
.tl-body {
  flex: 1;
  padding-bottom: 36rpx;
}
.tl-title {
  font-size: 28rpx;
  color: #999999;
  font-weight: 600;
}
.tl-title.active {
  color: #1A1A1A;
}
.tl-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 26rpx;
  color: #666666;
}
.tl-time {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #999999;
}

.product-row {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}
.product-cover {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background: #F5F5F5;
}
.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.product-name {
  font-size: 28rpx;
  color: #1A1A1A;
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
  margin-top: auto;
}
.product-price {
  font-size: 30rpx;
  font-weight: 600;
  color: #9A2D2D;
}
.product-qty {
  font-size: 26rpx;
  color: #999999;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20rpx;
}
.info-label {
  font-size: 26rpx;
  color: #999999;
}
.info-val {
  font-size: 26rpx;
  color: #1A1A1A;
}
.info-val.amount {
  font-size: 30rpx;
  font-weight: 600;
  color: #9A2D2D;
}
.info-copy {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.copy-btn {
  padding: 4rpx;
}

.load-state, .err-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 20rpx;
}
.load-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 4rpx solid #F0F0F0;
  border-top-color: #9A2D2D;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.load-text { font-size: 28rpx; color: #999; }
.err-text { font-size: 28rpx; color: #999; margin-top: 16rpx; }
.err-btn {
  margin-top: 24rpx;
  padding: 16rpx 48rpx;
  border: 1rpx solid #DDD;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #666;
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
  gap: 20rpx;
  padding: 16rpx 24rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #EEEEEE;
}
.action-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-btn.ghost {
  border: 1rpx solid #DDDDDD;
}
.action-btn.primary {
  background: #9A2D2D;
}
.action-text {
  font-size: 28rpx;
  color: #666666;
}
.action-text-primary {
  font-size: 28rpx;
  font-weight: 600;
  color: #FFFFFF;
}
</style>
