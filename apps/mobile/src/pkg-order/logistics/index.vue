<template>
  <view class="page">
    <app-nav-bar title="物流详情" :back-size="40" :title-size="36" :bar-height="106" title-align="left" />

    <scroll-view scroll-y class="scroll-area">
      <view v-if="loading" class="loading"><text>加载中...</text></view>
      <view v-else-if="error" class="error-state"><text>{{ error }}</text><view class="retry-btn" @tap="retry">重试</view></view>
      <!-- 物流状态卡 -->
      <block v-else>
      <view class="status-card">
        <view class="status-head">
          <view class="status-icon">
            <app-icon name="truck" :size="48" color="#FFFFFF" />
          </view>
          <view class="status-info">
            <text class="status-name" :style="{ color: statusMeta.color }">{{ statusMeta.label }}</text>
            <text class="status-est">预计 {{ data.estimatedDelivery }} 送达</text>
          </view>
        </view>
        <view class="company-row">
          <view class="company-item">
            <text class="company-label">承运</text>
            <text class="company-value">{{ data.company }}</text>
          </view>
          <view class="company-item">
            <text class="company-label">单号</text>
            <text class="company-value">{{ data.trackingNo }}</text>
          </view>
          <view class="copy-btn" @tap="copyNo">
            <app-icon name="copy" :size="28" color="#C41E3A" />
            <text class="copy-text">复制</text>
          </view>
        </view>
        <view class="action-row">
          <view class="action-btn" @tap="callCompany">
            <app-icon name="phone" :size="28" color="#666666" />
            <text class="action-text">联系快递公司</text>
          </view>
          <view v-if="data.courierPhone" class="action-btn" @tap="callCourier">
            <app-icon name="user" :size="28" color="#666666" />
            <text class="action-text">联系快递员 {{ data.courierName }}</text>
          </view>
        </view>
      </view>

      <!-- 收货信息 -->
      <view class="receiver-card">
        <app-icon name="map-pin" :size="36" color="#C41E3A" />
        <view class="receiver-info">
          <view class="receiver-head">
            <text class="receiver-name">{{ data.receiver.name }}</text>
            <text class="receiver-phone">{{ data.receiver.phone }}</text>
          </view>
          <text class="receiver-addr">{{ data.receiver.address }}</text>
        </view>
      </view>

      <!-- 物流轨迹时间轴 -->
      <view class="track-card">
        <text class="track-title">物流轨迹</text>
        <view class="timeline">
          <view
            v-for="(t, idx) in data.tracks"
            :key="idx"
            class="track-node"
          >
            <view class="track-line-col">
              <view class="track-dot" :class="{ current: t.isCurrent }">
                <app-icon v-if="t.isCurrent" name="truck" :size="24" color="#FFFFFF" />
              </view>
              <view v-if="idx < data.tracks.length - 1" class="track-line" />
            </view>
            <view class="track-body">
              <text class="track-desc" :class="{ current: t.isCurrent }">{{ t.description }}</text>
              <view class="track-meta">
                <text class="track-loc">{{ t.location }}</text>
                <text class="track-time">{{ t.time }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-gap" />
      </block>
    </scroll-view>
  </view>

  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { orderApi, logisticsStatusMap } from '@/lib/order-data'

const loading = ref(true)
const error = ref('')
const data = ref<any>(null)
const orderId = ref('')

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    data.value = await orderApi.logistics(orderId.value)
  } catch (e: any) {
    error.value = e?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}
function retry() { loadData() }

const statusMeta = computed(
  () => logisticsStatusMap[data.value?.status] || { label: '运输中', color: '#C41E3A' },
)

onLoad((q: any) => {
  if (q?.id) orderId.value = q.id
})
onMounted(() => { loadData() })

function copyNo() {
  if (!data.value?.trackingNo) return
  uni.setClipboardData({
    data: data.value.trackingNo,
    success: () => uni.showToast({ title: '已复制单号', icon: 'none' }),
  })
}

function callCompany() {
  if (data.value?.companyPhone) uni.makePhoneCall({ phoneNumber: data.value.companyPhone })
}

function callCourier() {
  if (data.value?.courierPhone) uni.makePhoneCall({ phoneNumber: data.value.courierPhone })
}
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #F5F5F5;
}

.scroll-area {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}

.status-card {
  margin: 20rpx 24rpx 0;
  padding: 32rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
}
.status-head {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.status-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
}
.status-info {
  flex: 1;
}
.status-name {
  font-size: 34rpx;
  font-weight: 700;
}
.status-est {
  display: block;
  margin-top: 6rpx;
  font-size: 26rpx;
  color: #666666;
}
.company-row {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-top: 28rpx;
  padding-top: 28rpx;
  border-top: 1rpx solid #F0F0F0;
}
.company-item {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.company-label {
  font-size: 24rpx;
  color: #999999;
}
.company-value {
  font-size: 28rpx;
  color: #1A1A1A;
}
.copy-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 20rpx;
  border: 1rpx solid #C41E3A;
  border-radius: 999rpx;
}
.copy-text {
  font-size: 24rpx;
  color: #C41E3A;
}
.action-row {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}
.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 72rpx;
  background: #F8F8F8;
  border-radius: 12rpx;
}
.action-text {
  font-size: 24rpx;
  color: #666666;
}

.receiver-card {
  display: flex;
  gap: 16rpx;
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
}
.receiver-info {
  flex: 1;
}
.receiver-head {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.receiver-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.receiver-phone {
  font-size: 26rpx;
  color: #666666;
}
.receiver-addr {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #666666;
  line-height: 1.5;
}

.track-card {
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
}
.track-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.timeline {
  margin-top: 24rpx;
}
.track-node {
  display: flex;
  gap: 20rpx;
}
.track-line-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.track-dot {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #DDDDDD;
  flex-shrink: 0;
  margin-top: 6rpx;
}
.track-dot.current {
  width: 48rpx;
  height: 48rpx;
  background: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0;
}
.track-line {
  flex: 1;
  width: 2rpx;
  background: #EEEEEE;
  margin: 6rpx 0;
}
.track-body {
  flex: 1;
  padding-bottom: 36rpx;
}
.track-desc {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.5;
}
.track-desc.current {
  color: #1A1A1A;
  font-weight: 600;
}
.track-meta {
  display: flex;
  gap: 20rpx;
  margin-top: 8rpx;
}
.track-loc,
.track-time {
  font-size: 24rpx;
  color: #999999;
}

.bottom-gap {
  height: 40rpx;
}
.loading { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: #999999; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: #999999; }
.retry-btn { padding: 16rpx 48rpx; background: #C41E3A; color: #fff; border-radius: 12rpx; font-size: 26rpx; }
</style>
