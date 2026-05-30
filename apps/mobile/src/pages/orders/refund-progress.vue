<template>
  <view class="page">
    <view class="amount-card"><text class="label">退款金额</text><text class="amount">¥{{ amount }}</text></view>
    <view class="timeline">
      <view v-for="(s, i) in steps" :key="i" class="step" :class="{ done: i <= currentStep }">
        <view class="dot" :class="{ done: i <= currentStep }"><text v-if="i <= currentStep">✓</text></view>
        <view class="info"><text class="s-title">{{ s.title }}</text><text class="s-desc">{{ s.desc }}</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const amount = ref('0')
const currentStep = ref(1)
const steps = [
  { title: '发起退款', desc: '您的退款申请已提交' },
  { title: '商家处理', desc: '商家正在处理您的退款' },
  { title: '退款中', desc: '预计1-3个工作日到账' },
  { title: '退款到账', desc: '退款已退回原支付账户' },
]
onMounted(() => { amount.value = (getCurrentPages().pop()?.options || {}).amount || '0' })
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.amount-card { background: #fff; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 12px; }
.label { font-size: 13px; color: #999; }
.amount { font-size: 36px; font-weight: bold; color: #C41E3A; display: block; margin-top: 4px; }
.timeline { background: #fff; border-radius: 12px; padding: 16px; }
.step { display: flex; gap: 10px; padding-bottom: 16px; position: relative; }
.step:not(:last-child)::after { content: ''; position: absolute; left: 10px; top: 24px; bottom: 0; width: 2px; background: #eee; }
.step.done:not(:last-child)::after { background: #4CAF50; }
.dot { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #ddd; text-align: center; line-height: 20px; font-size: 11px; flex-shrink: 0; }
.dot.done { background: #4CAF50; border-color: #4CAF50; color: #fff; }
.s-title { font-size: 14px; font-weight: 500; display: block; }
.s-desc { font-size: 12px; color: #999; display: block; margin-top: 2px; }
</style>
