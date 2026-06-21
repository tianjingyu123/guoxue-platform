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
          name="chevron-left"
          :size="44"
          color="#2C2C2C"
        />
      </view>
      <text class="nav-title">
        售后详情
      </text>
      <view
        class="nav-service"
        @tap="navigateTo('/customer-service')"
      >
        <app-icon
          name="message-circle"
          :size="30"
          color="#C41E3A"
        />
        <text class="nav-service-text">
          联系客服
        </text>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
      :style="{ paddingTop: navHeight + 'px' }"
    >
      <!-- 状态卡 -->
      <view
        class="status-card"
        :style="{ background: sCfg.bg }"
      >
        <view class="status-icon">
          <app-icon
            :name="sCfg.icon"
            :size="44"
            :color="sCfg.color"
          />
        </view>
        <view class="status-mid">
          <text
            class="status-name"
            :style="{ color: sCfg.color }"
          >
            {{ sCfg.text }}
          </text>
          <text
            v-if="detail.status === 'approved' && detail.type === 'refund_with_return'"
            class="status-tip"
          >
            请在7天内寄回商品
          </text>
          <text
            v-else-if="detail.status === 'rejected' && detail.rejectReason"
            class="status-tip reject"
          >
            原因：{{ detail.rejectReason }}
          </text>
        </view>
        <view class="status-amount">
          <text class="amount-label">
            退款金额
          </text>
          <text class="amount-value">
            ¥{{ detail.amount }}
          </text>
        </view>
      </view>

      <!-- 商品 -->
      <view class="card">
        <view class="product-row">
          <image
            class="product-cover"
            :src="detail.product.cover"
            mode="aspectFill"
          />
          <view class="product-info">
            <text class="product-name">
              {{ detail.product.name }}
            </text>
            <text class="product-sku">
              {{ detail.product.skuName }}
            </text>
            <view class="product-foot">
              <text class="product-price">
                ¥{{ detail.product.price }}
              </text>
              <text class="product-qty">
                x{{ detail.product.quantity }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 售后信息 -->
      <view class="card">
        <text class="card-title">
          售后信息
        </text>
        <view class="info-row">
          <text class="info-label">
            售后类型
          </text><text class="info-val">
            {{ detail.type === 'refund_only' ? '仅退款' : '退货退款' }}
          </text>
        </view>
        <view class="info-row">
          <text class="info-label">
            退款原因
          </text><text class="info-val">
            {{ detail.reason }}
          </text>
        </view>
        <view class="info-row">
          <text class="info-label">
            售后单号
          </text>
          <view class="info-copy">
            <text class="info-val">
              {{ detail.id }}
            </text>
            <view @tap="copyId">
              <app-icon
                :name="copied ? 'check-circle' : 'copy'"
                :size="28"
                color="#C41E3A"
              />
            </view>
          </view>
        </view>
        <view class="info-row">
          <text class="info-label">
            申请时间
          </text><text class="info-val">
            {{ detail.createdAt }}
          </text>
        </view>
        <view
          v-if="detail.description"
          class="info-block"
        >
          <text class="info-label">
            问题描述
          </text>
          <text class="info-desc">
            {{ detail.description }}
          </text>
        </view>
        <view
          v-if="detail.images.length"
          class="info-block"
        >
          <text class="info-label">
            上传凭证
          </text>
          <view class="imgs">
            <image
              v-for="(img, i) in detail.images"
              :key="i"
              class="evidence-img"
              :src="img"
              mode="aspectFill"
              @tap="previewImage(detail.images, i)"
            />
          </view>
        </view>
      </view>

      <!-- 时间轴 -->
      <view class="card">
        <text class="card-title">
          处理进度
        </text>
        <view class="timeline">
          <view
            v-for="(node, idx) in detail.timeline"
            :key="idx"
            class="tl-node"
          >
            <view class="tl-col">
              <view
                class="tl-dot"
                :class="{ done: idx <= currentIdx && !node.isCurrent, current: node.isCurrent }"
              >
                <app-icon
                  v-if="idx < currentIdx && !node.isCurrent"
                  name="check"
                  :size="20"
                  color="#FFFFFF"
                />
                <view
                  v-else-if="node.isCurrent"
                  class="tl-inner"
                />
              </view>
              <view
                v-if="idx < detail.timeline.length - 1"
                class="tl-line"
                :class="{ done: idx < currentIdx }"
              />
            </view>
            <view class="tl-body">
              <text
                class="tl-title"
                :class="{ current: node.isCurrent, done: idx <= currentIdx }"
              >
                {{ node.title }}
              </text>
              <text
                v-if="node.description"
                class="tl-desc"
              >
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

      <!-- 退货地址 -->
      <view
        v-if="detail.type === 'refund_with_return' && detail.status === 'approved' && detail.logistics"
        class="card"
      >
        <view class="addr-head">
          <app-icon
            name="truck"
            :size="34"
            color="#C41E3A"
          />
          <text class="card-title">
            退货地址
          </text>
        </view>
        <view class="addr-box">
          <text class="addr-text">
            {{ detail.logistics.address }}
          </text>
          <text class="addr-tip">
            请在7天内将商品寄回以上地址
          </text>
        </view>
        <view
          class="addr-btn"
          @tap="fillLogistics"
        >
          <text class="addr-btn-text">
            填写物流单号
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
        @tap="navigateTo(`/orders/${detail.orderId}`)"
      >
        <text class="action-text">
          查看订单
        </text>
      </view>
      <view
        v-if="detail.canCancel"
        class="action-btn outline"
        @tap="showCancel = true"
      >
        <text class="action-text-outline">
          取消售后
        </text>
      </view>
    </view>

    <!-- 取消确认 -->
    <view
      v-if="showCancel"
      class="mask mask-fade-in"
      @tap="showCancel = false"
    >
      <view
        class="confirm-box dialog-pop-in"
        @tap.stop
      >
        <view class="confirm-top">
          <view class="confirm-icon">
            <app-icon
              name="alert-circle"
              :size="48"
              color="#E8820C"
            />
          </view>
          <text class="confirm-title">
            确认取消售后？
          </text>
          <text class="confirm-desc">
            取消后将无法恢复，需重新申请
          </text>
        </view>
        <view class="confirm-actions">
          <view
            class="confirm-btn"
            @tap="showCancel = false"
          >
            <text class="confirm-btn-text">
              再想想
            </text>
          </view>
          <view
            class="confirm-btn divider"
            @tap="doCancel"
          >
            <text class="confirm-btn-text-primary">
              确认取消
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack, navigateTo } from '@/utils/router'
import { afterSaleDetail } from '@/lib/account-data'

const statusBarHeight = ref(20)
const navHeight = ref(64)
const safeBottom = ref(0)

const detail = ref({ ...afterSaleDetail })
const copied = ref(false)
const showCancel = ref(false)

const statusTextMap: Record<string, { icon: string; color: string; bg: string; text: string }> = {
  pending: { icon: 'clock', color: '#E8820C', bg: 'rgba(232,130,12,0.08)', text: '审核中' },
  approved: { icon: 'check-circle', color: '#2E7D32', bg: 'rgba(46,125,50,0.08)', text: '审核通过' },
  rejected: { icon: 'x-circle', color: '#E74C3C', bg: 'rgba(231,76,60,0.08)', text: '已拒绝' },
  refunding: { icon: 'package', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', text: '退款中' },
  completed: { icon: 'check-circle', color: '#2E7D32', bg: 'rgba(46,125,50,0.08)', text: '已完成' },
  cancelled: { icon: 'x-circle', color: '#999999', bg: 'rgba(153,153,153,0.08)', text: '已取消' },
}
const sCfg = computed(() => statusTextMap[detail.value.status] || statusTextMap.pending)
const currentIdx = computed(() => detail.value.timeline.findIndex((n) => n.isCurrent))

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
    navHeight.value = statusBarHeight.value + 44
    safeBottom.value = info.safeAreaInsets?.bottom || 0
  } catch (e) {
    statusBarHeight.value = 20
    navHeight.value = 64
  }
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
function previewImage(urls: string[], current: number) {
  uni.previewImage({ urls, current })
}
function fillLogistics() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}
function doCancel() {
  detail.value.status = 'cancelled'
  detail.value.canCancel = false
  showCancel.value = false
  uni.showToast({ title: '已取消', icon: 'none' })
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
.nav-service {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.nav-service-text {
  font-size: 24rpx;
  color: #C41E3A;
}

.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: 24rpx 24rpx 0;
  padding: 28rpx;
  border-radius: 24rpx;
}
.status-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
}
.status-mid {
  flex: 1;
}
.status-name {
  font-size: 34rpx;
  font-weight: 600;
}
.status-tip {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #666666;
}
.status-tip.reject {
  color: #E74C3C;
}
.status-amount {
  text-align: right;
}
.amount-label {
  display: block;
  font-size: 22rpx;
  color: #999999;
}
.amount-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #C41E3A;
}

.card {
  margin: 24rpx 24rpx 0;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
}
.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2C2C2C;
}

.product-row {
  display: flex;
  gap: 20rpx;
}
.product-cover {
  width: 140rpx;
  height: 140rpx;
  border-radius: 16rpx;
  background: #FAF8F5;
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
  margin-top: auto;
}
.product-price {
  font-size: 30rpx;
  font-weight: 600;
  color: #C41E3A;
}
.product-qty {
  font-size: 24rpx;
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
  color: #2C2C2C;
}
.info-copy {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.info-block {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #E8E3DB;
}
.info-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #2C2C2C;
  line-height: 1.5;
}
.imgs {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 12rpx;
}
.evidence-img {
  width: 130rpx;
  height: 130rpx;
  border-radius: 12rpx;
  background: #F5F5F5;
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
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #DDDDDD;
  flex-shrink: 0;
  margin-top: 4rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tl-dot.done {
  background: #2E7D32;
}
.tl-dot.current {
  background: #C41E3A;
}
.tl-inner {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #FFFFFF;
}
.tl-line {
  flex: 1;
  width: 2rpx;
  background: #E8E3DB;
  margin: 4rpx 0;
}
.tl-line.done {
  background: #2E7D32;
}
.tl-body {
  flex: 1;
  padding-bottom: 36rpx;
}
.tl-title {
  font-size: 28rpx;
  color: #999999;
  font-weight: 500;
}
.tl-title.done {
  color: #2C2C2C;
}
.tl-title.current {
  color: #C41E3A;
}
.tl-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #999999;
}
.tl-time {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999999;
}

.addr-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 16rpx;
}
.addr-box {
  padding: 24rpx;
  background: #FAF8F5;
  border-radius: 16rpx;
}
.addr-text {
  font-size: 26rpx;
  color: #2C2C2C;
  line-height: 1.5;
}
.addr-tip {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #999999;
}
.addr-btn {
  height: 80rpx;
  margin-top: 24rpx;
  border-radius: 16rpx;
  background: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
}
.addr-btn-text {
  font-size: 28rpx;
  color: #FFFFFF;
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
  border-top: 1rpx solid #E8E3DB;
}
.action-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-btn.ghost {
  border: 1rpx solid #E8E3DB;
}
.action-btn.outline {
  border: 1rpx solid #C41E3A;
}
.action-text {
  font-size: 28rpx;
  color: #2C2C2C;
}
.action-text-outline {
  font-size: 28rpx;
  color: #C41E3A;
}

.mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-box {
  width: 620rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
}
.confirm-top {
  padding: 48rpx 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.confirm-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: rgba(232, 130, 12, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.confirm-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
  margin-bottom: 12rpx;
}
.confirm-desc {
  font-size: 26rpx;
  color: #666666;
}
.confirm-actions {
  display: flex;
  border-top: 1rpx solid #E8E3DB;
}
.confirm-btn {
  flex: 1;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-btn.divider {
  border-left: 1rpx solid #E8E3DB;
}
.confirm-btn-text {
  font-size: 28rpx;
  color: #666666;
}
.confirm-btn-text-primary {
  font-size: 28rpx;
  font-weight: 500;
  color: #C41E3A;
}
</style>
