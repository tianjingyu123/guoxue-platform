<template>
  <view class="page">
    <view class="result-card">
      <text class="icon">✅</text>
      <text class="title">举报提交成功</text>
      <text class="desc">我们将在24小时内审核您的举报内容，感谢您为维护平台环境做出的贡献。</text>
    </view>
    <button class="btn-back" @click="goBack">返回</button>
  </view>
</template>
<script setup lang="ts">
function goBack() { uni.navigateBack() }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
.result-card { background: #fff; border-radius: 16px; padding: 30px 20px; text-align: center; width: 100%; }
.icon { font-size: 48px; display: block; margin-bottom: 12px; }
.title { font-size: 18px; font-weight: 600; display: block; }
.desc { font-size: 13px; color: #666; line-height: 1.6; display: block; margin-top: 10px; }
.btn-back { width: 100%; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 14px; font-size: 15px; margin-top: 20px; }
</style>
