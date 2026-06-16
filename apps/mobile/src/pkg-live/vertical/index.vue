<template>
  <view class="page" @dblclick="onDoubleTap">
    <app-nav-bar title="直播间" background="rgba(15,15,15,0.95)" color="#ffffff" :back-size="40" />

    <view v-if="loading" class="xx-skeleton">
      <view v-for="i in 3" :key="i" class="sk-card" />
    </view>
    <app-error v-else-if="error" :desc="error" @retry="loadData" />
    <template v-else>
    <!-- 视频背景 -->
    <view class="video-bg">
      <image class="video-img" :src="room.hostAvatar" mode="aspectFill" />
      <view class="video-mask" />
    </view>

    <!-- 顶部信息栏 -->
    <view class="top-bar">
      <view class="top-row">
        <!-- 主播信息 -->
        <view class="host-pill">
          <view class="host-avatar-wrap">
            <image class="host-avatar" :src="room.hostAvatar" mode="aspectFill" />
            <view class="live-tag">LIVE</view>
          </view>
          <view class="host-text">
            <view class="host-name-row">
              <text class="host-name">{{ room.hostName }}</text>
              <view class="host-level">
                <AppIcon name="crown" :size="10" color="#fff" />
                <text class="host-level-txt">Lv.{{ room.hostLevel }}</text>
              </view>
            </view>
            <text class="host-fans">{{ formatCount(room.followers) }} 粉丝</text>
          </view>
          <view class="follow-btn">关注</view>
        </view>

        <!-- 右侧 -->
        <view class="top-right">
          <view class="viewer-pill">
            <AppIcon name="users" :size="14" color="rgba(255,255,255,0.7)" />
            <text class="viewer-num">{{ formatCount(room.viewerCount) }}</text>
          </view>
        </view>
      </view>

      <!-- 在线观众头像 -->
      <view class="online-row">
        <view v-for="(avatar, i) in room.onlineAvatars" :key="i" class="online-avatar" :class="{ 'online-avatar-first': i === 0 }">
          <image class="online-img" :src="avatar" mode="aspectFill" />
        </view>
        <text class="online-more">+{{ formatCount(room.viewerCount - 3) }}</text>
      </view>
    </view>

    <!-- 弹幕区域 -->
    <view class="danmaku">
      <view v-for="c in comments" :key="c.id" class="dm-item">
        <view v-if="c.type === 'system'" class="dm-system">
          <text class="dm-system-txt">{{ c.content }}</text>
        </view>
        <view v-else class="dm-text">
          <text class="dm-name">{{ c.userName }}:</text>
          <text class="dm-content">{{ c.content }}</text>
        </view>
      </view>
    </view>

    <!-- 商品浮窗 -->
    <view v-if="currentProduct" class="product-float">
      <view class="pf-card">
        <view class="pf-img-wrap">
          <image class="pf-img" :src="currentProduct.cover" mode="aspectFill" />
          <view class="pf-badge">讲解中</view>
        </view>
        <view class="pf-info">
          <text class="pf-name">{{ currentProduct.name }}</text>
          <view class="pf-price-row">
            <text class="pf-price">¥{{ currentProduct.price }}</text>
            <text class="pf-origin">¥{{ currentProduct.originalPrice }}</text>
          </view>
        </view>
        <view class="pf-buy">立即购买</view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-inner">
        <view class="dm-input">说点什么...</view>
        <view class="action-btn action-cart">
          <AppIcon name="shopping-cart" :size="20" color="#fff" />
          <view class="cart-badge">{{ products.length }}</view>
        </view>
        <view class="action-btn action-gift">
          <AppIcon name="gift" :size="20" color="#fff" />
        </view>
        <view class="action-btn action-glass">
          <AppIcon name="heart" :size="20" color="#C41E3A" :fill="true" />
        </view>
        <view class="action-btn action-glass">
          <AppIcon name="share-2" :size="20" color="#fff" />
        </view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppError from '@/components/common/app-error.vue'
import { verticalLiveRoom, verticalLiveComments, verticalLiveProducts } from '@/lib/live-data'

const loading = ref(true)
const error = ref('')

const room = ref(verticalLiveRoom)
const comments = ref(verticalLiveComments)
const products = ref(verticalLiveProducts)

const currentProduct = computed(() => products.value.find((p) => p.isExplaining) || products.value[0])

function formatCount(count: number) {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`
  return count.toString()
}
function onDoubleTap() {}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    await new Promise(r => setTimeout(r, 300))
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(() => loadData())
</script>

<style scoped>
.page {
  position: fixed;
  inset: 0;
  background: #000;
}

/* 视频背景 */
.video-bg {
  position: absolute;
  inset: 0;
}
.video-img {
  width: 100%;
  height: 100%;
}
.video-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent 50%, rgba(0, 0, 0, 0.8));
}

/* 顶部信息栏 */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  padding: 96rpx 32rpx 0;
}
.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.host-pill {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 999rpx;
  padding: 8rpx 24rpx 8rpx 8rpx;
}
.host-avatar-wrap {
  position: relative;
}
.host-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  border: 4rpx solid #C41E3A;
}
.live-tag {
  position: absolute;
  bottom: -4rpx;
  left: 50%;
  transform: translateX(-50%);
  background: #C41E3A;
  color: #fff;
  font-size: 16rpx;
  padding: 0 12rpx;
  border-radius: 4rpx;
  font-weight: 500;
}
.host-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.host-name {
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
}
.host-level {
  display: flex;
  align-items: center;
  gap: 4rpx;
  background: linear-gradient(to right, #f59e0b, #f97316);
  border-radius: 999rpx;
  padding: 2rpx 12rpx;
}
.host-level-txt {
  font-size: 20rpx;
  color: #fff;
  font-weight: 500;
}
.host-fans {
  color: rgba(255, 255, 255, 0.7);
  font-size: 22rpx;
}
.follow-btn {
  margin-left: 8rpx;
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 500;
  background: #C41E3A;
  color: #fff;
}
.top-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.viewer-pill {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 999rpx;
  padding: 12rpx 24rpx;
}
.viewer-num {
  color: #fff;
  font-size: 22rpx;
}
.close-btn {
  width: 64rpx;
  height: 64rpx;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.online-row {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
}
.online-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 2rpx solid rgba(255, 255, 255, 0.4);
  margin-left: -8rpx;
}
.online-avatar-first {
  margin-left: 0;
}
.online-img {
  width: 100%;
  height: 100%;
}
.online-more {
  color: rgba(255, 255, 255, 0.6);
  font-size: 22rpx;
  margin-left: 8rpx;
}

/* 弹幕 */
.danmaku {
  position: absolute;
  left: 32rpx;
  bottom: 352rpx;
  width: 576rpx;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.dm-item {
  display: flex;
}
.dm-system {
  display: inline-block;
  background: rgba(201, 169, 110, 0.8);
  border-radius: 16rpx;
  padding: 8rpx 20rpx;
}
.dm-system-txt {
  color: #fff;
  font-size: 22rpx;
}
.dm-text {
  display: inline-block;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16rpx;
  padding: 8rpx 20rpx;
}
.dm-name {
  color: #C9A96E;
  font-size: 22rpx;
}
.dm-content {
  color: #fff;
  font-size: 22rpx;
  margin-left: 8rpx;
}

/* 商品浮窗 */
.product-float {
  position: absolute;
  left: 32rpx;
  right: 32rpx;
  bottom: 240rpx;
  z-index: 10;
}
.pf-card {
  background: rgba(0, 0, 0, 0.5);
  border-radius: 24rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.pf-img-wrap {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  border-radius: 16rpx;
  overflow: hidden;
  flex-shrink: 0;
}
.pf-img {
  width: 100%;
  height: 100%;
}
.pf-badge {
  position: absolute;
  top: 0;
  left: 0;
  background: #C41E3A;
  color: #fff;
  font-size: 16rpx;
  padding: 2rpx 8rpx;
  border-radius: 0 0 8rpx 0;
}
.pf-info {
  flex: 1;
  min-width: 0;
}
.pf-name {
  color: #fff;
  font-size: 28rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.pf-price-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 4rpx;
}
.pf-price {
  color: #C41E3A;
  font-weight: 700;
  font-size: 28rpx;
}
.pf-origin {
  color: rgba(255, 255, 255, 0.4);
  font-size: 22rpx;
  text-decoration: line-through;
}
.pf-buy {
  background: #C41E3A;
  color: #fff;
  font-size: 22rpx;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-weight: 500;
  flex-shrink: 0;
}

/* 底部操作栏 */
.bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  padding-bottom: env(safe-area-inset-bottom);
}
.bottom-inner {
  padding: 16rpx 32rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.dm-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999rpx;
  padding: 20rpx 32rpx;
  color: rgba(255, 255, 255, 0.5);
  font-size: 28rpx;
}
.action-btn {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.action-cart {
  background: #C41E3A;
}
.cart-badge {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  min-width: 32rpx;
  height: 32rpx;
  background: #C9A96E;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
}
.action-gift {
  background: linear-gradient(to bottom right, #f59e0b, #f97316);
}
.action-glass {
  background: rgba(255, 255, 255, 0.1);
}

.xx-skeleton { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; padding-top: 120rpx; }
.sk-card { height: 200rpx; border-radius: 20rpx; background: rgba(255,255,255,0.05); animation: sk-pulse 1.5s infinite; }
@keyframes sk-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
</style>
