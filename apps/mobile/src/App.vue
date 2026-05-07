<template>
  <view class="app">
    <view class="header" :style="{ background: themeColor }">国学平台</view>
    <view class="content">
      <view v-for="item in list" :key="item.id" class="card" @click="goDetail(item.id)">
        <view class="card-title">{{ item.title }}</view>
        <view class="card-meta">{{ item.author }} · {{ item.dynasty }}</view>
        <view class="card-excerpt">{{ item.excerpt }}</view>
      </view>
    </view>
    <view class="tabbar">
      <view class="tab active">首页</view>
      <view class="tab">收藏</view>
      <view class="tab">我的</view>
    </view>
  </view>
</template>

<script>
export default {
  onLaunch() {
    // 检查启动参数中的分站推广码
    const options = uni.getLaunchOptionsSync();
    const stationCode = options?.query?.station_code;
    if (stationCode) {
      // 动态导入 store 并调用品牌 API（避免循环依赖）
      import('@/store/stationStore').then(({ useStationStore }) => {
        const store = useStationStore();
        store.fetchBrand(stationCode).catch(() => {
          // 品牌加载失败不影响主流程
        });
      });
    }
  },
};
</script>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useStationStore } from "@/store/stationStore";

const stationStore = useStationStore();

// 当有分站品牌时，使用品牌主题色
const themeColor = computed(() => stationStore.stationThemeColor || '#409eff');

interface ContentItem {
  id: string;
  title: string;
  author?: string;
  dynasty?: string;
  excerpt?: string;
}

const list = ref<ContentItem[]>([]);

onMounted(async () => {
  // 后续接入 API
  list.value = [];
});

function goDetail(id: string) {
  // 后续实现
}

// 监听品牌变更（可选：当品牌信息变化时可执行全局更新）
</script>

<style>
.app { min-height: 100vh; background: #f5f5f5; }
.header { background: #409eff; color: #fff; text-align: center; padding: 12px; font-size: 18px; font-weight: bold; }
.content { padding: 12px; padding-bottom: 60px; }
.card { background: #fff; border-radius: 8px; padding: 14px; margin-bottom: 10px; }
.card-title { font-size: 16px; font-weight: bold; color: #333; }
.card-meta { font-size: 12px; color: #999; margin: 4px 0; }
.card-excerpt { font-size: 14px; color: #666; }
.tabbar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: #fff; border-top: 1px solid #eee; }
.tab { flex: 1; text-align: center; padding: 10px; font-size: 14px; color: #999; }
.tab.active { color: #409eff; }
</style>
