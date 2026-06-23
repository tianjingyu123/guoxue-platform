<template>
  <view class="ag-page">
    <app-nav-bar title="站长协议" :border="true" />
    <!-- 加载中 -->
    <view v-if="loading" class="state-loading">
      <text class="state-loading-text">加载中...</text>
    </view>
    <!-- 错误 -->
    <view v-else-if="error" class="state-error">
      <text class="state-error-text">{{ error }}</text>
      <view class="state-retry-btn" @tap="retry"><text>重试</text></view>
    </view>
    <!-- 正常内容 -->
    <scroll-view v-else scroll-y class="ag-scroll">
      <!-- 重要提示 -->
      <view class="ag-tip">
        <text class="ag-tip-title">重要提示</text>
        <text class="ag-tip-text">{{ stationAgreementTip }}</text>
      </view>

      <!-- 协议内容 -->
      <view class="ag-list">
        <view v-for="(s, i) in stationAgreementSections" :key="i" class="ag-card">
          <text class="ag-card-title">{{ s.title }}</text>
          <text class="ag-card-content">{{ s.content }}</text>
        </view>
      </view>

      <!-- 更新时间 -->
      <view class="ag-footer">
        <text class="ag-footer-text">最后更新时间：2024年1月1日</text>
        <text class="ag-footer-text">版本号：v1.0</text>
      </view>
      <view class="ag-bottom-pad" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import { operatorApi, type AgreementSection } from '@/lib/operator-data'

const loading = ref(true)
const error = ref('')
const stationAgreementSections = ref<AgreementSection[]>([])
const stationAgreementTip = ref('')

async function fetchData() {
  try {
    const res = await operatorApi.getStationAgreement()
    stationAgreementSections.value = res.sections
    stationAgreementTip.value = res.tip
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function retry() {
  loading.value = true
  error.value = ''
  await fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.ag-page { display: flex; flex-direction: column; height: 100vh; background: #f5f2ec; }
.ag-scroll { flex: 1; }
.ag-tip { margin: 32rpx; padding: 32rpx; background: #eff6ff; border: 1rpx solid #bfdbfe; border-radius: 16rpx; }
.ag-tip-title { display: block; font-size: 28rpx; font-weight: 600; color: #1e3a8a; margin-bottom: 16rpx; }
.ag-tip-text { font-size: 26rpx; color: #1e40af; line-height: 1.5; }
.ag-list { padding: 0 32rpx; display: flex; flex-direction: column; gap: 24rpx; }
.ag-card { background: #fff; border-radius: 16rpx; padding: 32rpx; }
.ag-card-title { display: block; font-size: 28rpx; font-weight: 600; color: #2a2a2a; margin-bottom: 16rpx; }
.ag-card-content { font-size: 26rpx; color: #8a8178; line-height: 1.6; }
.ag-footer { margin: 48rpx 32rpx 0; padding: 32rpx; background: rgba(138,129,120,0.1); border-radius: 16rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.ag-footer-text { font-size: 22rpx; color: #8a8178; }
.ag-bottom-pad { height: 48rpx; }

/* 三态 */
.state-loading { flex: 1; display: flex; align-items: center; justify-content: center; }
.state-loading-text { font-size: 28rpx; color: #8a8178; }
.state-error { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 48rpx; }
.state-error-text { font-size: 28rpx; color: #ef4444; text-align: center; }
.state-retry-btn { padding: 16rpx 48rpx; background: #16a34a; border-radius: 16rpx; }
.state-retry-btn text { font-size: 28rpx; color: #fff; }
</style>
