<template>
  <view class="page">
    <rich-text :nodes="content" class="doc-content" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
const content = ref('<h2>未成年人/儿童隐私保护声明</h2><p>声明全文将在此展示。</p>')
onMounted(() => uni.setNavigationBarTitle({ title: '儿童隐私保护' }))
</script>

<style>
.page { background: #fff; min-height: 100vh; padding: 20px 16px; }
.doc-content { font-size: 14px; line-height: 1.8; }
</style>
