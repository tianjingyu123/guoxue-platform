<template>
  <view class="page">
    <rich-text :nodes="content" class="doc-content" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
const content = ref('<h2>青少年模式说明</h2><p>青少年模式使用说明将在此展示。</p>')
onMounted(() => uni.setNavigationBarTitle({ title: '青少年模式说明' }))
</script>

<style>
.page { background: #fff; min-height: 100vh; padding: 20px 16px; }
.doc-content { font-size: 14px; line-height: 1.8; }
</style>
