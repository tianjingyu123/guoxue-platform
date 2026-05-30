<template>
  <view class="page">
    <rich-text :nodes="content" class="doc-content" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
const content = ref('<p>内容加载中...</p>')
onMounted(() => {
  const title = (getCurrentPages().pop()?.options || {}).title || '协议与政策'
  uni.setNavigationBarTitle({ title })
})
</script>

<style>
.page { background: #fff; min-height: 100vh; padding: 20px 16px; }
.doc-content { font-size: 14px; line-height: 1.8; }
</style>
