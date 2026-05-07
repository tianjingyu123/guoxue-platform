<template>
  <view class="page">
    <view v-for="item in list" :key="item.id" class="card">
      <view class="card-title">{{ item.content?.title }}</view>
      <view class="card-meta">{{ item.content?.author }}</view>
    </view>
    <view v-if="list.length === 0" class="empty">暂无收藏</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

const list = ref<any[]>([]);

onMounted(() => {
  // TODO: 获取收藏列表
});
</script>

<style>
.page { padding: 12px; }
.card { background: #fff; border-radius: 8px; padding: 14px; margin-bottom: 10px; }
.card-title { font-size: 16px; font-weight: bold; }
.card-meta { font-size: 12px; color: #999; margin-top: 4px; }
.empty { text-align: center; color: #999; padding: 40px; }
</style>
