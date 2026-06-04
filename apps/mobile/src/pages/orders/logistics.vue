<template>
  <view class="page">
    <view class="header">
      <view class="header-inner">
        <text class="back-btn" @click="goBack">‹</text>
        <text class="header-title">物流详情</text>
        <view style="width:60rpx" />
      </view>
    </view>

    <view v-if="loading" class="loading-skeleton">
      <view v-for="i in 3" :key="i" class="s-card" />
    </view>

    <view v-else-if="!logistics" class="empty-state">
      <text class="empty-icon">📦</text>
      <text class="empty-text">暂无物流信息</text>
    </view>

    <template v-else>
      <!-- 物流状态卡片 -->
      <view class="status-card">
        <view class="sc-top">
          <view class="sc-icon"><text>🚚</text></view>
          <view class="sc-info">
            <view class="sc-name-row">
              <text class="sc-company">{{ logistics.company }}</text>
              <text class="sc-status-tag">{{ statusLabel(logistics.status) }}</text>
            </view>
            <text class="sc-track-no">运单号：{{ logistics.trackingNo || logistics.trackNo }}</text>
          </view>
          <text class="sc-copy" @click="copyNo">复制</text>
        </view>
        <view v-if="logistics.estimatedDelivery" class="sc-delivery">
          <text>🕐</text>
          <text>预计送达：{{ logistics.estimatedDelivery }}</text>
        </view>
      </view>

      <!-- 快递员信息 -->
      <view v-if="logistics.courierName" class="courier-card">
        <view class="cc-left">
          <view class="cc-avatar"><text>📦</text></view>
          <view><text class="cc-name">快递员：{{ logistics.courierName }}</text><text class="cc-status">正在为您派送</text></view>
        </view>
        <view v-if="logistics.courierPhone" class="cc-call" @click="callPhone(logistics.courierPhone)"><text>📞</text><text>联系</text></view>
      </view>

      <!-- 收货信息 -->
      <view v-if="logistics.receiver" class="receiver-card">
        <view class="rc-icon"><text>📍</text></view>
        <view class="rc-info">
          <view class="rc-name-row"><text class="rc-name">{{ logistics.receiver.name }}</text><text class="rc-phone">{{ logistics.receiver.phone }}</text></view>
          <text class="rc-address">{{ logistics.receiver.address }}</text>
        </view>
      </view>

      <!-- 物流轨迹 -->
      <view class="timeline-card">
        <text class="tl-title">物流轨迹</text>
        <view class="timeline">
          <view v-for="(t, idx) in (logistics.tracks || [])" :key="idx" class="tl-item" :class="{ latest: idx === 0 }">
            <view class="tl-dot-row">
              <view class="tl-dot" :class="{ latest: idx === 0 }" />
            </view>
            <view class="tl-content">
              <text class="tl-desc" :class="{ latest: idx === 0 }">{{ t.description }}</text>
              <view class="tl-meta">
                <text>{{ t.time }}</text>
                <text v-if="t.location">{{ t.location }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部操作 -->
      <view class="bottom-bar">
        <view class="bottom-inner">
          <view v-if="logistics.companyPhone" class="bb-btn" @click="callPhone(logistics.companyPhone)">📞 联系物流公司</view>
          <view class="bb-btn primary">查看订单</view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { shopApi } from '../../api'

interface TrackItem { description: string; time: string; location?: string }
interface LogisticsData { company: string; trackNo?: string; trackingNo?: string; status: string; estimatedDelivery?: string; courierName?: string; courierPhone?: string; receiver?: { name: string; phone: string; address: string }; tracks?: TrackItem[]; companyPhone?: string }

const loading = ref(true); const logistics = ref<LogisticsData | null>(null)

onMounted(async () => {
  const opts = (getCurrentPages().pop()?.options || {})
  const orderId = opts.orderId || ''
  try { logistics.value = await shopApi.getLogistics(orderId) as any } catch {} finally { loading.value = false }
})

function statusLabel(s: string): string {
  const m: Record<string, string> = { pending: '待揽收', picked: '已揽收', in_transit: '运输中', delivering: '派送中', delivered: '已送达', signed: '已签收' }
  return m[s] || s
}

function copyNo() {
  const no = logistics.value?.trackingNo || logistics.value?.trackNo || ''
  uni.setClipboardData({ data: no, success: () => uni.showToast({ title: '已复制' }) })
}

function callPhone(phone: string) { uni.makePhoneCall({ phoneNumber: phone }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 120rpx; }
.header { background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.loading-skeleton { padding: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.s-card { height: 160rpx; background: #e8e3db; border-radius: 16rpx; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }
.status-card { margin: 16rpx 24rpx; background: linear-gradient(135deg, #C41E3A, #e8546a); border-radius: 20rpx; padding: 24rpx; color: #fff; }
.sc-top { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.sc-icon { width: 80rpx; height: 80rpx; background: rgba(255,255,255,0.2); border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 36rpx; }
.sc-info { flex: 1; min-width: 0; }
.sc-name-row { display: flex; align-items: center; gap: 8rpx; }
.sc-company { font-size: 28rpx; font-weight: 600; }
.sc-status-tag { font-size: 20rpx; padding: 2rpx 12rpx; background: rgba(255,255,255,0.2); border-radius: 16rpx; }
.sc-track-no { font-size: 22rpx; opacity: 0.8; margin-top: 6rpx; display: block; }
.sc-copy { padding: 8rpx 16rpx; background: rgba(255,255,255,0.2); border-radius: 12rpx; font-size: 24rpx; }
.sc-delivery { display: flex; align-items: center; gap: 8rpx; background: rgba(255,255,255,0.1); border-radius: 12rpx; padding: 12rpx; font-size: 22rpx; }
.courier-card { margin: 0 24rpx 16rpx; background: #fff; border-radius: 16rpx; padding: 20rpx; display: flex; align-items: center; justify-content: space-between; }
.cc-left { display: flex; align-items: center; gap: 12rpx; }
.cc-avatar { width: 64rpx; height: 64rpx; background: #f5f0e8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32rpx; }
.cc-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.cc-status { font-size: 22rpx; color: #999; }
.cc-call { display: flex; align-items: center; gap: 4rpx; padding: 12rpx 24rpx; background: #C41E3A; color: #fff; border-radius: 28rpx; font-size: 24rpx; }
.receiver-card { margin: 0 24rpx 16rpx; background: #fff; border-radius: 16rpx; padding: 20rpx; display: flex; gap: 12rpx; }
.rc-icon { font-size: 36rpx; width: 64rpx; height: 64rpx; background: #f5f0e8; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rc-info { flex: 1; }
.rc-name-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.rc-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.rc-phone { font-size: 24rpx; color: #666; }
.rc-address { font-size: 24rpx; color: #999; line-height: 1.5; }
.timeline-card { margin: 0 24rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.tl-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 20rpx; }
.timeline { position: relative; }
.tl-item { display: flex; gap: 16rpx; padding-bottom: 28rpx; position: relative; }
.tl-item:last-child { padding-bottom: 0; }
.tl-dot-row { display: flex; flex-direction: column; align-items: center; width: 24rpx; }
.tl-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #E5E1DB; margin-top: 6rpx; }
.tl-dot.latest { background: #C41E3A; box-shadow: 0 0 0 6rpx rgba(196,30,58,0.15); }
.tl-item:not(:last-child) .tl-dot-row::after { content: ''; width: 2rpx; flex: 1; background: #E5E1DB; margin-top: 6rpx; }
.tl-item.latest:not(:last-child) .tl-dot-row::after { background: #C41E3A; }
.tl-content { flex: 1; }
.tl-desc { font-size: 26rpx; color: #666; display: block; }
.tl-desc.latest { color: #2C2C2C; font-weight: 500; }
.tl-meta { display: flex; gap: 12rpx; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E5E1DB; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); }
.bottom-inner { display: flex; gap: 16rpx; }
.bb-btn { flex: 1; text-align: center; padding: 18rpx; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 26rpx; color: #666; }
.bb-btn.primary { background: #C41E3A; color: #fff; border-color: #C41E3A; }
</style>
