<template>
  <view class="page">
    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-tabs">
        <text v-for="d in dynasties" :key="d" class="tab" :class="{ active: dynasty === d }" @click="dynasty = d; fetchPoems()">{{ d === '全部' ? '全部朝代' : d }}</text>
      </view>
    </view>

    <view v-if="loading" class="empty">加载中...</view>
    <view v-else>
      <view v-for="item in poems" :key="item.id" class="poem-card" @click="goDetail(item.id)">
        <image v-if="item.cover" :src="item.cover" class="poem-cover" mode="aspectFill" />
        <view class="poem-body">
          <text class="poem-title">{{ item.title }}</text>
          <view class="poem-meta">
            <text class="poem-tag" v-for="t in item.tags" :key="t">{{ t }}</text>
          </view>
          <text class="poem-excerpt">{{ item.excerpt }}</text>
          <view class="poem-stats">
            <text>{{ item.viewCount }} 浏览</text>
            <text>{{ item.likeCount }} 赞</text>
          </view>
        </view>
      </view>
    </view>
    <view v-if="!loading && poems.length === 0" class="empty">暂无诗词</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { contentApi } from "../../api";

const poems = ref<any[]>([]);
const loading = ref(false);
const dynasty = ref("全部");
const dynasties = ["全部", "唐", "宋", "先秦", "汉", "魏晋", "南北朝", "元", "明", "清"];

onMounted(() => fetchPoems());

const poetryTags = ["唐诗", "宋词", "诗词", "诗经", "楚辞", "元曲"];

async function fetchPoems() {
  loading.value = true;
  try {
    // 朝代映射到具体标签
    const tagMap: Record<string, string> = { "唐": "唐诗", "宋": "宋词", "元": "元曲", "先秦": "诗经" };
    const tag = dynasty.value === "全部" ? undefined : (tagMap[dynasty.value] || dynasty.value);
    const params: any = { pageSize: 50 };
    if (tag) params.tag = tag;

    const data = await contentApi.list(params);
    const all = data.articles || data || [];
    // 客户端二次筛选，确保只显示诗词类
    poems.value = tag
      ? all
      : all.filter((a: any) => a.tags?.some((t: string) => poetryTags.includes(t)));
  } finally { loading.value = false; }
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}&type=ARTICLE` });
}
</script>

<style>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; }
.filter-bar { margin-bottom: 12px; }
.filter-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.tab { font-size: 13px; padding: 6px 12px; background: #fff; border-radius: 14px; color: #666; }
.tab.active { background: #8b4513; color: #fff; }

.poem-card { background: #fff; border-radius: 8px; margin-bottom: 10px; overflow: hidden; display: flex; }
.poem-cover { width: 90px; height: 110px; flex-shrink: 0; }
.poem-body { flex: 1; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
.poem-title { font-size: 16px; font-weight: bold; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.poem-meta { display: flex; gap: 6px; }
.poem-tag { font-size: 11px; color: #8b4513; background: #f5ead6; padding: 1px 8px; border-radius: 8px; }
.poem-excerpt { font-size: 13px; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.poem-stats { font-size: 12px; color: #999; display: flex; gap: 12px; }

.empty { text-align: center; color: #999; padding: 60px 0; font-size: 14px; }
</style>
