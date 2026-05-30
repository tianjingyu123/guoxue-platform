<template>
  <view class="page">
    <view class="scan-area">
      <text class="tip">对准二维码/条形码</text>
      <view class="scan-box">
        <view class="corner tl" /><view class="corner tr" /><view class="corner bl" /><view class="corner br" />
      </view>
      <text class="sub-tip">将二维码放入框内，即可自动扫描</text>
    </view>
    <view class="actions">
      <button class="btn-album" @click="fromAlbum">从相册选择</button>
      <button class="btn-manual" @click="manualInput">手动输入</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { onMounted } from 'vue'
onMounted(() => {
  uni.scanCode({ success: (res) => { uni.showToast({ title: '扫描结果: ' + res.result, icon: 'none' }); handleResult(res.result) }, fail: () => {} })
})
function fromAlbum() {
  uni.chooseImage({ count: 1, success: (res) => { uni.showToast({ title: '识别中...', icon: 'none' }) } })
}
function manualInput() { uni.showToast({ title: '手动输入', icon: 'none' }) }
function handleResult(result: string) {
  if (result.startsWith('http')) { uni.navigateTo({ url: `/pages/common/legal-doc?url=${encodeURIComponent(result)}` }) }
  else { uni.showToast({ title: result, icon: 'none' }) }
}
</script>
<style>
.page { background: #000; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.scan-area { text-align: center; }
.tip { font-size: 14px; color: #fff; opacity: 0.7; display: block; margin-bottom: 30px; }
.scan-box { width: 220px; height: 220px; position: relative; margin: 0 auto 24px; }
.corner { position: absolute; width: 20px; height: 20px; border-color: #C41E3A; border-style: solid; }
.tl { top: 0; left: 0; border-width: 3px 0 0 3px; }
.tr { top: 0; right: 0; border-width: 3px 3px 0 0; }
.bl { bottom: 0; left: 0; border-width: 0 0 3px 3px; }
.br { bottom: 0; right: 0; border-width: 0 3px 3px 0; }
.sub-tip { font-size: 12px; color: #fff; opacity: 0.5; display: block; }
.actions { display: flex; gap: 24px; margin-top: 40px; }
.btn-album, .btn-manual { background: rgba(255,255,255,0.15); color: #fff; border: none; border-radius: 20px; padding: 10px 20px; font-size: 13px; }
</style>
