<template>
  <view class="gf-page">
    <!-- 头部 -->
    <view class="header">
      <view class="nav">
        <view
          class="nav-back"
          hover-class="nav-hover"
          @tap="goBack"
        >
          <app-icon
            name="chevron-left"
            :size="40"
            color="#fff"
          />
        </view>
        <text class="nav-title">
          拼团结果
        </text>
      </view>
      <view class="hero">
        <view class="fail-icon">
          <app-icon
            name="alert-circle"
            :size="64"
            color="#fff"
          />
        </view>
        <text class="hero-title">
          拼团未成功
        </text>
        <text class="hero-sub">
          {{ reasonText }}
        </text>
      </view>
    </view>

    <!-- Loading -->
    <view
      v-if="loading"
      class="load-state"
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
      <view class="content">
        <!-- 商品卡 -->
        <view class="card">
          <view class="prod">
            <image
              class="prod-cover"
              :src="info.productCover"
              mode="aspectFill"
            />
            <view class="prod-info">
              <text class="prod-name">
                {{ info.productName }}
              </text>
              <text class="price-now">
                ¥{{ info.price }}
              </text>
            </view>
          </view>
          <view class="card-divider" />
          <view class="row">
            <text class="row-label">
              参团人数
            </text>
            <view class="members">
              <image
                v-for="(m, i) in info.members"
                :key="i"
                class="member-avatar"
                :src="m.avatar"
                mode="aspectFill"
              />
              <view
                v-for="n in (info.minMembers - info.currentMembers)"
                :key="'e' + n"
                class="member-empty"
              >
                <text class="member-q">
                  ?
                </text>
              </view>
              <text class="member-text">
                {{ info.currentMembers }}/{{ info.minMembers }}人
              </text>
            </view>
          </view>
          <view class="row">
            <text class="row-label">
              失败时间
            </text>
            <text class="row-value">
              {{ info.failedAt }}
            </text>
          </view>
        </view>

        <!-- 退款信息 -->
        <view class="card">
          <view class="refund-head">
            <app-icon
              name="wallet"
              :size="36"
              color="#c41e3a"
            />
            <text class="refund-title">
              退款信息
            </text>
          </view>
          <view class="refund-box">
            <view class="refund-row">
              <text class="refund-label">
                退款金额
              </text>
              <text class="refund-amount">
                ¥{{ info.refundAmount.toFixed(2) }}
              </text>
            </view>
            <view class="refund-row">
              <text class="refund-sub">
                预计到账
              </text>
              <text class="refund-sub">
                {{ info.estimatedRefundTime }}（1-3个工作日）
              </text>
            </view>
          </view>
          <!-- 退款进度 -->
          <view class="steps">
            <view class="steps-labels">
              <text class="step-label">
                申请退款
              </text>
              <text class="step-label">
                处理中
              </text>
              <text class="step-label">
                退款完成
              </text>
            </view>
            <view class="steps-bar">
              <view
                class="steps-fill"
                :style="{ width: refundProgress + '%' }"
              />
            </view>
            <view class="steps-dots">
              <view
                class="dot"
                :class="{ 'dot--on': info.refundStatus !== 'pending' }"
              >
                <app-icon
                  v-if="info.refundStatus !== 'pending'"
                  name="check"
                  :size="18"
                  color="#fff"
                />
              </view>
              <view
                class="dot"
                :class="{ 'dot--on': info.refundStatus === 'processing' || info.refundStatus === 'completed' }"
              >
                <app-icon
                  v-if="info.refundStatus === 'completed'"
                  name="check"
                  :size="18"
                  color="#fff"
                />
              </view>
              <view
                class="dot"
                :class="{ 'dot--on': info.refundStatus === 'completed' }"
              >
                <app-icon
                  v-if="info.refundStatus === 'completed'"
                  name="check"
                  :size="18"
                  color="#fff"
                />
              </view>
            </view>
          </view>
          <view class="refund-note">
            <app-icon
              name="clock"
              :size="26"
              color="#999"
            />
            <text class="refund-note-text">
              退款将原路返回至您的支付账户，请留意账户变动
            </text>
          </view>
        </view>

        <!-- 订单编号 -->
        <view class="card card--row">
          <text class="row-label">
            订单编号
          </text>
          <view class="order-id">
            <text class="order-mono">
              {{ info.orderId }}
            </text>
            <view
              class="copy-btn"
              @tap="copy(info.orderId)"
            >
              <app-icon
                :name="copied ? 'check' : 'copy'"
                :size="28"
                :color="copied ? '#2e8b57' : '#999'"
              />
            </view>
          </view>
        </view>

        <!-- 提示 -->
        <view class="tips">
          <text class="tips-text">
            温馨提示：拼团失败不影响您再次参与，我们为您推荐了更多热门拼团商品，快去看看吧！
          </text>
        </view>
      </view>

      <!-- 底部操作 -->
      <view class="footer">
        <view class="footer-row">
          <view
            class="btn-ghost"
            hover-class="btn-hover"
            @tap="viewRefund"
          >
            <text class="btn-ghost-text">
              查看退款
            </text>
          </view>
          <view
            class="btn-primary"
            hover-class="btn-hover"
            @tap="recreate"
          >
            <app-icon
              name="refresh-cw"
              :size="26"
              color="#fff"
            />
            <text class="btn-primary-text">
              重新开团
            </text>
          </view>
        </view>
        <view
          class="btn-browse"
          hover-class="btn-hover"
          @tap="browse"
        >
          <app-icon
            name="shopping-bag"
            :size="26"
            color="#c41e3a"
          />
          <text class="btn-browse-text">
            浏览其他拼团
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
import { shopApi } from '@/lib/shop-data'

const loading = ref(true)
const error = ref(false)
const copied = ref(false)
const info = ref<any>(null)

const reasonText = computed(() => {
  if (!info.value) return ''
  if (info.value.reason === 'timeout') return '拼团超时，未能在规定时间内凑齐人数'
  if (info.value.reason === 'stock') return '商品库存不足，无法完成拼团'
  return '拼团未能成功，我们正在处理退款'
})
const refundProgress = computed(() => {
  if (!info.value) return 0
  if (info.value.refundStatus === 'pending') return 33
  if (info.value.refundStatus === 'processing') return 66
  return 100
})

onLoad(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  error.value = false
  try {
    const res = await shopApi.getGroupBuyFailDetail('current')
    info.value = res
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function copy(text: string) {
  uni.setClipboardData({
    data: text,
    success: () => {
      copied.value = true
      setTimeout(() => (copied.value = false), 2000)
    },
  })
}
function viewRefund() {
  if (!info.value) return
  navigateTo(`/mine/refunds?orderId=${info.value.orderId}`)
}
function recreate() {
  if (!info.value) return
  navigateTo(`/shop/group-buy/${info.value.groupId}?action=create`)
}
function browse() {
  navigateTo('/shop/group-buy')
}
</script>

<style lang="scss" scoped>
.gf-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 220rpx;
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
  border: 4rpx solid #E8E3DB;
  border-top-color: #c41e3a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.load-text { font-size: 28rpx; color: #999; }
.err-text { font-size: 28rpx; color: #999; margin-top: 16rpx; }
.err-btn {
  margin-top: 24rpx;
  padding: 16rpx 48rpx;
  border: 1rpx solid #E8E3DB;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #666;
}
.header {
  background: linear-gradient(135deg, #8a8a8a, #6b6b6b);
  color: #fff;
}
.nav {
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 88rpx;
  padding: 0 24rpx;
  padding-top: var(--status-bar-height, 0px);
}
.nav-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-hover {
  opacity: 0.6;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 500;
}
.hero {
  padding: 0 32rpx 64rpx;
  text-align: center;
}
.fail-icon {
  width: 144rpx;
  height: 144rpx;
  margin: 0 auto 24rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-title {
  font-size: 44rpx;
  font-weight: 700;
  display: block;
  margin-bottom: 12rpx;
}
.hero-sub {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}
.content {
  padding: 0 24rpx;
  margin-top: -32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.card--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.prod {
  display: flex;
  gap: 20rpx;
}
.prod-cover {
  width: 144rpx;
  height: 144rpx;
  border-radius: 16rpx;
  background: #f0ece2;
}
.prod-info {
  flex: 1;
  min-width: 0;
}
.prod-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.4;
  margin-bottom: 16rpx;
  display: block;
}
.price-now {
  font-size: 32rpx;
  font-weight: 700;
  color: #c41e3a;
}
.card-divider {
  height: 1rpx;
  background: #efe8da;
  margin: 24rpx 0;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.row + .row {
  margin-top: 16rpx;
}
.row-label {
  font-size: 26rpx;
  color: #999;
}
.row-value {
  font-size: 26rpx;
  color: #666;
}
.members {
  display: flex;
  align-items: center;
}
.member-avatar,
.member-empty {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  margin-left: -8rpx;
}
.member-avatar {
  background: #f0ece2;
}
.member-empty {
  background: #eee5d8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.member-q {
  font-size: 22rpx;
  color: #b8ab94;
}
.member-text {
  font-size: 26rpx;
  color: #666;
  margin-left: 12rpx;
}
.refund-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 24rpx;
}
.refund-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.refund-box {
  background: #faf8f5;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.refund-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.refund-row + .refund-row {
  margin-top: 16rpx;
}
.refund-label {
  font-size: 26rpx;
  color: #666;
}
.refund-amount {
  font-size: 36rpx;
  font-weight: 700;
  color: #c41e3a;
}
.refund-sub {
  font-size: 24rpx;
  color: #999;
}
.steps {
  margin-bottom: 24rpx;
}
.steps-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.step-label {
  font-size: 22rpx;
  color: #999;
}
.steps-bar {
  height: 8rpx;
  background: #eee;
  border-radius: 999rpx;
  overflow: hidden;
}
.steps-fill {
  height: 100%;
  background: linear-gradient(90deg, #c41e3a, #e85a6b);
  border-radius: 999rpx;
  transition: width 0.5s;
}
.steps-dots {
  display: flex;
  justify-content: space-between;
  margin-top: 12rpx;
}
.dot {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #d4d4d4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dot--on {
  background: #c41e3a;
}
.refund-note {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
}
.refund-note-text {
  font-size: 22rpx;
  color: #999;
  line-height: 1.4;
  flex: 1;
}
.order-mono {
  font-size: 26rpx;
  color: #2c2c2c;
  font-family: monospace;
}
.order-id {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.copy-btn {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tips {
  background: #eaf2fb;
  border-radius: 16rpx;
  padding: 24rpx;
}
.tips-text {
  font-size: 24rpx;
  color: #4a90d9;
  line-height: 1.5;
}
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #efe8da;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.footer-row {
  display: flex;
  gap: 20rpx;
}
.btn-ghost {
  flex: 1;
  padding: 22rpx 0;
  border: 1rpx solid #e8e3db;
  border-radius: 20rpx;
  text-align: center;
}
.btn-ghost-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #666;
}
.btn-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 22rpx 0;
  background: linear-gradient(90deg, #c41e3a, #e85a6b);
  border-radius: 20rpx;
}
.btn-primary-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}
.btn-browse {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 22rpx 0;
  background: #faf8f5;
  border-radius: 20rpx;
}
.btn-browse-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #c41e3a;
}
.btn-hover {
  opacity: 0.85;
}
</style>
