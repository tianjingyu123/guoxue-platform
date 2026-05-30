<template>
  <view class="page">
    <view class="notice-card">
      <text class="icon">🎊</text>
      <text class="title">晋级通知</text>
      <text class="desc">恭喜您在"{{ compName }}"中表现优异，成功晋级{{ nextRound }}！</text>
      <view class="info-row"><text class="info-label">当前排名</text><text class="info-val">第{{ rank }}名</text></view>
      <view class="info-row"><text class="info-label">获得积分</text><text class="info-val">+{{ points }}</text></view>
      <view class="info-row"><text class="info-label">下一轮时间</text><text class="info-val">{{ nextTime }}</text></view>
    </view>
    <button class="btn-go" @click="goNext">进入下一轮</button>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
const compName = ref('国学知识竞赛'); const nextRound = ref('决赛')
const rank = ref(3); const points = ref(100); const nextTime = ref('2026-06-01')
onMounted(() => {
  const pages = getCurrentPages(); const opts = (pages[pages.length - 1] as any)?.options || {}
  if (opts.rank) rank.value = Number(opts.rank)
})
function goNext() { uni.navigateBack() }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.notice-card { background: #fff; border-radius: 16px; padding: 30px 20px; text-align: center; width: 100%; }
.icon { font-size: 48px; display: block; margin-bottom: 12px; }
.title { font-size: 20px; font-weight: 600; display: block; margin-bottom: 8px; }
.desc { font-size: 14px; color: #666; line-height: 1.6; display: block; margin-bottom: 20px; }
.info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f8f8f8; }
.info-label { font-size: 13px; color: #999; }
.info-val { font-size: 14px; color: #C41E3A; font-weight: 500; }
.btn-go { width: 100%; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 14px; font-size: 15px; margin-top: 20px; }
</style>
