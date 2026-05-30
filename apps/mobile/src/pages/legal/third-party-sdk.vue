<template>
  <view class="page">
    <rich-text :nodes="content" class="doc-content" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
const content = ref('<h2>第三方SDK列表</h2><p>我们使用的第三方SDK清单将在此展示。</p>')
onMounted(() => uni.setNavigationBarTitle({ title: '第三方SDK列表' }))
</script>

<style>
.page { background: #fff; min-height: 100vh; padding: 20px 16px; }
.doc-content { font-size: 14px; line-height: 1.8; }
</style>
