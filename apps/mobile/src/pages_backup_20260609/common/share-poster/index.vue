<template>
  <view class="page">
    <view class="nav-header"><text class="nav-close" @click="goBack">✕</text><text class="nav-title">分享海报</text><view style="width:48rpx"/></view>

    <view v-if="isLoading" class="loading"><text class="spinner">⏳</text><text class="load-text">加载中...</text></view>
    <view v-else class="body">
      <view class="poster-preview"><view class="poster-canvas"><text class="pc-title">热卜国学</text><text class="pc-type">--- 邀请海报 ---</text><view class="pc-qr">📱</view><text class="pc-hint">扫码加入</text></view></view>

      <view class="actions"><view class="act-btn" @click="handleSave">💾 保存</view><view class="act-btn primary" @click="handleShare">📤 分享</view></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
const isLoading=ref(true)
function handleSave(){uni.showToast({title:'海报已保存',icon:'success'})}
function handleShare(){uni.showToast({title:'请长按海报保存',icon:'none'})}
function goBack(){uni.navigateBack()}
onMounted(async()=>{await new Promise(r=>setTimeout(r,800));isLoading.value=false})
</script>
<style scoped>
.page{background:#000;min-height:100vh;display:flex;flex-direction:column}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:rgba(0,0,0,.8)}
.nav-close{font-size:32rpx;color:#fff}
.nav-title{font-size:32rpx;font-weight:500;color:#fff}
.loading{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center}
.spinner{font-size:64rpx;animation:spin 1s linear infinite;margin-bottom:16rpx}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.load-text{font-size:26rpx;color:rgba(255,255,255,.7)}
.body{flex:1;display:flex;flex-direction:column;padding:24rpx}
.poster-preview{flex:1;display:flex;align-items:center;justify-content:center}
.poster-canvas{width:500rpx;height:800rpx;background:linear-gradient(180deg,#FAF8F5,#F5F1EB);border-radius:24rpx;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24rpx;box-shadow:0 4rpx 32rpx rgba(0,0,0,.3)}
.pc-title{font-size:48rpx;font-weight:700;color:#C41E3A}
.pc-type{font-size:24rpx;color:#999}
.pc-qr{font-size:120rpx}
.pc-hint{font-size:22rpx;color:#999}
.actions{display:flex;gap:24rpx;padding:24rpx 0}
.act-btn{flex:1;padding:24rpx;text-align:center;border-radius:24rpx;font-size:28rpx;font-weight:500;border:1px solid rgba(255,255,255,.2);color:#fff}
.act-btn.primary{background:#C41E3A;border-color:#C41E3A}
</style>
