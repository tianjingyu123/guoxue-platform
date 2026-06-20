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
        物流详情
      </text>
      <view class="nav-placeholder" />
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
      :style="{ paddingTop: navHeight + 'px' }"
    >
      <!-- 加载骨架 -->
      <view
        v-if="loading"
        class="sk-wrap"
      >
        <view class="sk-card">
          <view class="sk-line w6" /><view class="sk-line w4" /><view class="sk-line w5" />
        </view>
        <view class="sk-card">
          <view class="sk-line w4" /><view class="sk-line w7" />
        </view>
        <view class="sk-card">
          <view class="sk-line w3" />
          <view
            v-for="i in 4"
            :key="i"
            class="sk-track"
          >
            <view class="sk-dot" /><view class="sk-info">
              <view class="sk-line" /><view class="sk-line w5" />
            </view>
          </view>
        </view>
      </view>

      <error-state
        v-else-if="error"
        :message="error"
        @retry="loadLogistics"
      />

      <view v-else>
        <!-- 物流状态卡 -->
        <view class="status-card">
          <view class="status-head">
            <view class="status-icon">
              <app-icon
                name="truck"
                :size="48"
                color="#FFFFFF"
              />
            </view>
            <view class="status-info">
              <text
                class="status-name"
                :style="{ color: statusMeta.color }"
              >
                {{ statusMeta.label }}
              </text>
              <text class="status-est">
                预计 {{ data.estimatedDelivery }} 送达
              </text>
            </view>
          </view>
          <view class="company-row">
            <view class="company-item">
              <text class="company-label">
                承运
              </text>
              <text class="company-value">
                {{ data.company }}
              </text>
            </view>
            <view class="company-item">
              <text class="company-label">
                单号
              </text>
              <text class="company-value">
                {{ data.trackingNo }}
              </text>
            </view>
            <view
              class="copy-btn"
              @tap="copyNo"
            >
              <app-icon
                name="copy"
                :size="28"
                color="#9A2D2D"
              />
              <text class="copy-text">
                复制
              </text>
            </view>
          </view>
          <view class="action-row">
            <view
              class="action-btn"
              @tap="callCompany"
            >
              <app-icon
                name="phone"
                :size="28"
                color="#666666"
              />
              <text class="action-text">
                联系快递公司
              </text>
            </view>
            <view
              v-if="data.courierPhone"
              class="action-btn"
              @tap="callCourier"
            >
              <app-icon
                name="user"
                :size="28"
                color="#666666"
              />
              <text class="action-text">
                联系快递员 {{ data.courierName }}
              </text>
            </view>
          </view>
        </view>

        <!-- 收货信息 -->
        <view class="receiver-card">
          <app-icon
            name="map-pin"
            :size="36"
            color="#9A2D2D"
          />
          <view class="receiver-info">
            <view class="receiver-head">
              <text class="receiver-name">
                {{ data.receiver.name }}
              </text>
              <text class="receiver-phone">
                {{ data.receiver.phone }}
              </text>
            </view>
            <text class="receiver-addr">
              {{ data.receiver.address }}
            </text>
          </view>
        </view>

        <!-- 物流轨迹时间轴 -->
        <view class="track-card">
          <text class="track-title">
            物流轨迹
          </text>
          <view class="timeline">
            <view
              v-for="(t, idx) in data.tracks"
              :key="idx"
              class="track-node"
            >
              <view class="track-line-col">
                <view
                  class="track-dot"
                  :class="{ current: t.isCurrent }"
                >
                  <app-icon
                    v-if="t.isCurrent"
                    name="truck"
                    :size="24"
                    color="#FFFFFF"
                  />
                </view>
                <view
                  v-if="idx < data.tracks.length - 1"
                  class="track-line"
                />
              </view>
              <view class="track-body">
                <text
                  class="track-desc"
                  :class="{ current: t.isCurrent }"
                >
                  {{ t.description }}
                </text>
                <view class="track-meta">
                  <text class="track-loc">
                    {{ t.location }}
                  </text>
                  <text class="track-time">
                    {{ t.time }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="bottom-gap" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'
import ErrorState from '@/components/common/error-state.vue'
import { orderApi, logisticsStatusMap } from '@/lib/order-data'

const statusBarHeight = ref(20)
const navHeight = ref(64)
const loading = ref(true)
const error = ref('')
const orderId = ref('')

const data = ref<any>({})
const statusMeta = computed(
  () => logisticsStatusMap[data.value.status] || { label: '运输中', color: '#9A2D2D' },
)

async function loadLogistics() {
  loading.value = true
  error.value = ''
  try {
    data.value = await orderApi.getLogistics(orderId.value)
  } catch (e: any) { error.value = e?.message || '加载失败' } finally { loading.value = false }
}

onLoad(async (q: any) => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
    navHeight.value = statusBarHeight.value + 44
  } catch (e) {
    statusBarHeight.value = 20
    navHeight.value = 64
  }
  if (q?.orderId) {
    orderId.value = q.orderId
    await loadLogistics()
  } else {
    loading.value = false
  }
})

function copyNo() {
  uni.setClipboardData({
    data: data.value.trackingNo,
    success: () => uni.showToast({ title: '已复制单号', icon: 'none' }),
  })
}

function callCompany() {
  uni.makePhoneCall({ phoneNumber: data.value.companyPhone })
}

function callCourier() {
  if (data.value.courierPhone) uni.makePhoneCall({ phoneNumber: data.value.courierPhone })
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
  background: #9A2D2D;
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
  border: 1rpx solid #9A2D2D;
  border-radius: 999rpx;
}
.copy-text {
  font-size: 24rpx;
  color: #9A2D2D;
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
  background: #9A2D2D;
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

.sk-wrap { margin: 20rpx 24rpx 0; display: flex; flex-direction: column; gap: 20rpx; }
.sk-card { background: #FFFFFF; border-radius: 20rpx; padding: 28rpx; display: flex; flex-direction: column; gap: 16rpx; }
.sk-track { display: flex; gap: 20rpx; align-items: flex-start; }
.sk-dot { width: 32rpx; height: 32rpx; border-radius: 50%; background: #f0ece4; flex-shrink: 0; }
.sk-info { flex: 1; display: flex; flex-direction: column; gap: 12rpx; }
.sk-line { height: 24rpx; background: #f0ece4; border-radius: 8rpx; }
.sk-line.w3 { width: 30%; }
.sk-line.w4 { width: 40%; }
.sk-line.w5 { width: 50%; }
.sk-line.w6 { width: 60%; }
.sk-line.w7 { width: 70%; }
</style>
