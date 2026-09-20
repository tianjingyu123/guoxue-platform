<template>
  <view class="share-page">
    <view class="share-head">
      <text class="share-brand">热卜国学</text>
      <text class="share-tip">排盘结果</text>
    </view>
    <web-view v-if="target" :src="target" />
    <view v-else class="share-error">
      <text class="share-error__title">分享链接无效</text>
      <text class="share-error__text">请让分享者重新打开排盘结果后再分享</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { publicLegacyResultUrl } from '@/lib/legacy-paipan-share'

const target = ref('')
onLoad((query) => {
  const raw = typeof query?.target === 'string' ? query.target : ''
  try { target.value = publicLegacyResultUrl(decodeURIComponent(raw)) } catch { target.value = '' }
})
</script>

<style scoped>
.share-page { min-height: 100vh; background: #faf8f5; }
.share-head { height: 88rpx; padding: 0 28rpx; display: flex; align-items: center; justify-content: space-between; background: #fff; border-bottom: 1rpx solid #eee7de; }
.share-brand { font-size: 30rpx; font-weight: 700; color: #8f1d22; }
.share-tip { font-size: 24rpx; color: #76695f; }
.share-error { padding: 180rpx 48rpx; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.share-error__title { font-size: 34rpx; font-weight: 600; color: #2c2c2c; }
.share-error__text { font-size: 26rpx; line-height: 1.7; text-align: center; color: #76695f; }
</style>
