<template>
  <view class="gs-page">
    <!-- 成功头部 -->
    <view class="header">
      <view class="success-icon">
        <app-icon name="check-circle" :size="96" color="#22c55e" />
      </view>
      <text class="header-title">拼团成功</text>
      <text class="header-sub">恭喜您，已成功拼团！</text>
    </view>

    <view class="content">
      <!-- 商品卡片 -->
      <view class="card">
        <view class="prod">
          <image class="prod-cover" :src="data.productCover" mode="aspectFill" />
          <view class="prod-info">
            <text class="prod-name">{{ data.productName }}</text>
            <view class="prod-price">
              <text class="price-now">¥{{ data.price }}</text>
              <text class="price-old">¥{{ data.originalPrice }}</text>
              <text class="save-tag">省¥{{ data.originalPrice - data.price }}</text>
            </view>
          </view>
        </view>
        <view class="row">
          <text class="row-label">成团成员</text>
          <view class="members">
            <image
              v-for="(m, i) in data.members"
              :key="i"
              class="member-avatar"
              :src="m.avatar"
              mode="aspectFill"
            />
            <text class="member-count">共{{ data.members.length }}人</text>
          </view>
        </view>
        <view class="row row--sub">
          <text class="row-label">成团时间</text>
          <text class="row-value">{{ data.completedAt }}</text>
        </view>
        <view class="row row--sub">
          <text class="row-label">订单编号</text>
          <view class="order-id">
            <text class="row-value">{{ data.orderId }}</text>
            <view class="copy-btn" @tap="copy(data.orderId)">
              <app-icon :name="copied ? 'check' : 'copy'" :size="28" color="#c41e3a" />
            </view>
          </view>
        </view>
      </view>

      <!-- 发货信息 -->
      <view class="ship-card">
        <view class="ship-icon">
          <app-icon name="package" :size="36" color="#4a90d9" />
        </view>
        <view class="ship-info">
          <text class="ship-title">预计发货时间</text>
          <text class="ship-sub">{{ data.estimatedShipDate }}（工作日）</text>
        </view>
      </view>

      <!-- 分享得券 -->
      <view class="share-card">
        <view class="share-left">
          <view class="share-icon">
            <app-icon name="gift" :size="36" color="#fff" />
          </view>
          <view>
            <text class="share-title">分享得优惠券</text>
            <text class="share-sub">邀请好友拼团，获10元优惠券</text>
          </view>
        </view>
        <view class="share-btn" @tap="share">
          <app-icon name="share-2" :size="28" color="#ff6b35" />
          <text class="share-btn-text">分享</text>
        </view>
      </view>

      <!-- 操作 -->
      <view class="actions">
        <view class="btn-primary" hover-class="btn-hover" @tap="viewOrder">
          <text class="btn-primary-text">查看订单</text>
          <app-icon name="chevron-right" :size="28" color="#fff" />
        </view>
        <view class="btn-ghost" hover-class="btn-hover" @tap="goShop">
          <text class="btn-ghost-text">继续逛逛</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'

interface GroupBuyMember {
  name: string
  avatar: string
}

interface GroupBuySuccessInfo {
  orderId: string
  groupId: string
  memberCount: number
  discount: number
  productCover: string
  productName: string
  price: number
  originalPrice: number
  members: GroupBuyMember[]
  completedAt: string
  estimatedShipDate: string
}

const data: GroupBuySuccessInfo = {
  orderId: '',
  groupId: '',
  memberCount: 0,
  discount: 0,
  productCover: '',
  productName: '',
  price: 0,
  originalPrice: 0,
  members: [],
  completedAt: '',
  estimatedShipDate: '',
}

const copied = ref(false)

function copy(text: string) {
  uni.setClipboardData({
    data: text,
    success: () => {
      copied.value = true
      setTimeout(() => (copied.value = false), 2000)
    },
  })
}
function share() {
  uni.showToast({ title: '已唤起分享', icon: 'none' })
}
function viewOrder() {
  navigateTo(`/orders/${data.orderId}`)
}
function goShop() {
  navigateTo('/shop')
}
</script>

<style lang="scss" scoped>
.gs-page {
  min-height: 100vh;
  background: #faf8f5;
}
.header {
  background: linear-gradient(to bottom right, #22c55e, #16a34a);
  padding: 96rpx 32rpx 192rpx;
  text-align: center;
}
.success-icon {
  width: 160rpx;
  height: 160rpx;
  margin: 0 auto 32rpx;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.15);
}
.header-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #fff;
  display: block;
  margin-bottom: 16rpx;
}
.header-sub {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}
.content {
  padding: 0 32rpx 64rpx;
  margin-top: -128rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.card {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.prod {
  display: flex;
  gap: 20rpx;
  padding: 24rpx;
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
.prod-price {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
.price-now {
  font-size: 36rpx;
  font-weight: 700;
  color: #c41e3a;
}
.price-old {
  font-size: 24rpx;
  color: #999;
  text-decoration: line-through;
}
.save-tag {
  padding: 2rpx 10rpx;
  background: #fff3e0;
  color: #e8830c;
  font-size: 20rpx;
  border-radius: 6rpx;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-top: 1rpx solid #efe8da;
}
.row--sub {
  padding: 16rpx 24rpx;
  background: rgba(250, 248, 245, 0.5);
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
.member-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  margin-left: -12rpx;
  background: #f0ece2;
}
.member-avatar:first-child {
  margin-left: 0;
}
.member-count {
  font-size: 26rpx;
  color: #666;
  margin-left: 16rpx;
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
.ship-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
}
.ship-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #eaf2fb;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ship-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  display: block;
}
.ship-sub {
  font-size: 24rpx;
  color: #666;
  margin-top: 4rpx;
  display: block;
}
.share-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(90deg, #ff8c42, #e85050);
  border-radius: 24rpx;
  padding: 24rpx;
}
.share-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.share-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.share-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
  display: block;
}
.share-sub {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4rpx;
  display: block;
}
.share-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 14rpx 28rpx;
  background: #fff;
  border-radius: 999rpx;
}
.share-btn-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #ff6b35;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 28rpx 0;
  background: #c41e3a;
  border-radius: 20rpx;
}
.btn-primary-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}
.btn-ghost {
  padding: 28rpx 0;
  background: #fff;
  border: 1rpx solid #e8e3db;
  border-radius: 20rpx;
  text-align: center;
}
.btn-ghost-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #666;
}
.btn-hover {
  opacity: 0.85;
}
</style>
