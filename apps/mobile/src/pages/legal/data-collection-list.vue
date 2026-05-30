<template>
  <view class="page">
    <rich-text :nodes="content" class="doc-content" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
const content = ref('<h2>个人信息收集清单</h2><p>我们收集的个人信息清单将在此展示。</p>')
onMounted(() => uni.setNavigationBarTitle({ title: '个人信息收集清单' }))
</script>

<style>
.page { background: #fff; min-height: 100vh; padding: 20px 16px; }
.doc-content { font-size: 14px; line-height: 1.8; }
</style>
