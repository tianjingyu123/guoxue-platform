<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="detail">
      <view class="status-timeline">
        <view v-for="(step, i) in steps" :key="i" class="step" :class="{ done: i <= currentStep, active: i === currentStep }">
          <view class="step-dot" :class="{ done: i <= currentStep }"><text v-if="i <= currentStep">✓</text></view>
          <view class="step-info">
            <text class="step-title">{{ step.title }}</text>
            <text class="step-time">{{ step.time }}</text>
            <text v-if="step.desc" class="step-desc">{{ step.desc }}</text>
          </view>
        </view>
      </view>
      <view class="info-card">
        <text class="info-label">售后类型</text><text class="info-value">{{ detail.type || '退货退款' }}</text>
        <text class="info-label">申请金额</text><text class="info-value" style="color:#C41E3A">¥{{ detail.amount }}</text>
        <text class="info-label">申请原因</text><text class="info-value">{{ detail.reason }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import { shopApi } from '../../api'

const loading = ref(true)
const detail = ref<any>(null)
const currentStep = ref(1)
const steps = ref([
  { title: '提交申请', time: '' },
  { title: '商家审核', time: '' },
  { title: '退货/退款处理', time: '' },
  { title: '完成', time: '' },
])

onMounted(async () => {
  const id = (getCurrentPages().pop()?.options || {}).id || ''
  try {
    detail.value = await shopApi.afterSaleDetail(id)
    currentStep.value = (detail.value as any)?.status === 'COMPLETED' ? 3 : (detail.value as any)?.status === 'APPROVED' ? 2 : 1
  } catch {} finally { loading.value = false }
})
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.status-timeline { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.step { display: flex; gap: 10px; padding-bottom: 16px; position: relative; }
.step:not(:last-child)::after { content: ''; position: absolute; left: 10px; top: 24px; bottom: 0; width: 2px; background: #eee; }
.step.done:not(:last-child)::after { background: #4CAF50; }
.step-dot { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #ddd; text-align: center; line-height: 20px; font-size: 11px; flex-shrink: 0; margin-top: 2px; }
.step-dot.done { background: #4CAF50; border-color: #4CAF50; color: #fff; }
.step.active .step-dot { border-color: #C41E3A; }
.step-title { font-size: 14px; font-weight: 500; display: block; }
.step-time { font-size: 11px; color: #999; display: block; margin-top: 2px; }
.step-desc { font-size: 12px; color: #666; display: block; margin-top: 2px; }
.info-card { background: #fff; border-radius: 12px; padding: 16px; }
.info-label { font-size: 12px; color: #999; display: block; margin-top: 8px; }
.info-value { font-size: 15px; font-weight: 500; display: block; }
</style>
