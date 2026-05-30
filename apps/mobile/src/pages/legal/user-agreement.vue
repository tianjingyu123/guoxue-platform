<template>
  <view class="page">
    <rich-text :nodes="content" class="doc-content" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
const content = ref('<h2>用户协议</h2><p>用户协议全文将在此展示。</p>')
onMounted(() => uni.setNavigationBarTitle({ title: '用户协议' }))
</script>

<style>
.page { background: #fff; min-height: 100vh; padding: 20px 16px; }
.doc-content { font-size: 14px; line-height: 1.8; }
</style>
