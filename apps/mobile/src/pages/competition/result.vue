<template>
  <view class="page">
    <view class="result-card">
      <text class="icon">{{ score >= 60 ? '🎉' : '💪' }}</text>
      <text class="score">{{ score }}分</text>
      <text class="label">{{ score >= 60 ? '恭喜通过！' : '继续加油！' }}</text>
      <text class="detail">正确 {{ correct }}/{{ total }} 题</text>
    </view>
    <view class="actions">
      <button class="btn-detail" @click="goDetail">查看详情</button>
      <button class="btn-back" @click="goBack">返回首页</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
const score = ref(85); const correct = ref(17); const total = ref(20)
onMounted(() => {
  const pages = getCurrentPages(); const opts = (pages[pages.length - 1] as any)?.options || {}
  score.value = Number(opts.score) || 85
  correct.value = Number(opts.correct) || 17
  total.value = Number(opts.total) || 20
})
function goDetail() { uni.navigateTo({ url: '/pages/competition/score-detail' }) }
function goBack() { uni.switchTab({ url: '/pages/index/index' }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.result-card { background: #fff; border-radius: 16px; padding: 40px 30px; text-align: center; width: 100%; }
.icon { font-size: 48px; display: block; margin-bottom: 12px; }
.score { font-size: 48px; font-weight: bold; color: #C41E3A; display: block; }
.label { font-size: 16px; color: #333; display: block; margin-top: 8px; }
.detail { font-size: 13px; color: #999; display: block; margin-top: 8px; }
.actions { display: flex; gap: 12px; margin-top: 24px; width: 100%; }
.btn-detail { flex: 1; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 14px; }
.btn-back { flex: 1; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 12px; font-size: 14px; }
</style>
