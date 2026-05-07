<template>
  <view class="page">
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else>
      <view v-for="item in list" :key="item.id" class="card" @click="goDetail(item)">
        <image v-if="item.target?.cover" :src="item.target.cover" class="card-cover" mode="aspectFill" />
        <view class="card-body">
          <text class="card-title">{{ item.target?.title || item.target?.name }}</text>
          <text class="card-type">{{ typeLabel(item.targetType) }}</text>
        </view>
      </view>
    </view>
    <view v-if="!loading && list.length === 0" class="empty">暂无收藏</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { interactApi } from "../../api";

const list = ref<any[]>([]);
const loading = ref(false);

onMounted(() => fetchCollects());

async function fetchCollects() {
  loading.value = true;
  try {
    const data = await interactApi.myCollects();
    list.value = data.collects || data || [];
  } finally {
    loading.value = false;
  }
}

function typeLabel(type: string) {
  const map: Record<string, string> = { ARTICLE: "文章", COURSE: "课程", CIRCLE: "圈子", PRODUCT: "商品" };
  return map[type] || type;
}

function goDetail(item: any) {
  const id = item.target?.id || item.targetId;
  const type = item.targetType;
  if (id && type) {
    uni.navigateTo({ url: `/pages/detail/detail?id=${id}&type=${type}` });
  }
}
</script>

<style>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; }
.card { display: flex; gap: 10px; background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.card-cover { width: 64px; height: 64px; border-radius: 6px; flex-shrink: 0; }
.card-body { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
.card-title { font-size: 15px; font-weight: bold; color: #333; }
.card-type { font-size: 12px; color: #8b4513; }
.empty { text-align: center; color: #999; padding: 60px 0; font-size: 14px; }
</style>
