<template>
  <view class="page">
    <view class="article" v-if="content">
      <view class="title">{{ content.title }}</view>
      <view class="meta">{{ content.author }} · {{ content.dynasty }}</view>
      <view class="body">{{ content.body }}</view>
    </view>
    <view v-else class="empty">加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

const content = ref<any>(null);

onMounted(() => {
  // TODO: 通过 id 获取内容详情
});
</script>

<style>
.page { padding: 16px; }
.title { font-size: 22px; font-weight: bold; color: #333; margin-bottom: 8px; }
.meta { font-size: 13px; color: #999; margin-bottom: 16px; }
.body { font-size: 16px; line-height: 1.8; color: #444; }
.empty { text-align: center; color: #999; padding: 40px; }
</style>
