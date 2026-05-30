<template>
  <view class="page">
    <view v-if="imageUrl">
      <image :src="imageUrl" class="preview-img" mode="aspectFit" />
    </view>
    <view v-else class="empty">
      <text>暂无图片</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const imageUrl = ref('')

onMounted(() => {
  const q = getCurrentPages().pop()?.options || {}
  imageUrl.value = q.url || q.src || ''
  if (imageUrl.value) uni.setNavigationBarTitle({ title: '图片浏览' })
})
</script>

<style>
.page { background: #000; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.preview-img { width: 100%; height: 100vh; }
.empty { color: #fff; text-align: center; }
</style>
