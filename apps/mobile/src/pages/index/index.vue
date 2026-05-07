<template>
  <view class="page">
    <view class="search-bar">
      <input v-model="keyword" placeholder="搜索经典、诗词..." class="search-input" />
    </view>
    <view class="content-list">
      <view v-for="item in list" :key="item.id" class="card" @click="goDetail(item.id)">
        <view class="card-title">{{ item.title }}</view>
        <view class="card-meta">{{ item.author }} · {{ item.dynasty }}</view>
        <view class="card-excerpt">{{ item.excerpt }}</view>
      </view>
    </view>
    <view v-if="list.length === 0 && !loading" class="empty">暂无内容</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

const keyword = ref("");
const list = ref<any[]>([]);
const loading = ref(false);

onMounted(() => {
  // TODO: 接入 API
});

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}` });
}
</script>

<style>
.page { padding: 12px; }
.search-bar { margin-bottom: 12px; }
.search-input {
  background: #fff; border-radius: 20px; padding: 8px 16px;
  font-size: 14px; border: 1px solid #e0e0e0;
}
.card { background: #fff; border-radius: 8px; padding: 14px; margin-bottom: 10px; }
.card-title { font-size: 16px; font-weight: bold; color: #333; }
.card-meta { font-size: 12px; color: #999; margin: 4px 0; }
.card-excerpt { font-size: 14px; color: #666; }
.empty { text-align: center; color: #999; padding: 40px; font-size: 14px; }
</style>
