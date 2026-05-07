<template>
  <view class="page">
    <view class="search-bar">
      <input v-model="keyword" placeholder="搜索..." class="search-input" @confirm="doSearch" />
      <button size="mini" @click="doSearch">搜索</button>
    </view>

    <!-- 热门搜索 -->
    <view v-if="!searched" class="hot">
      <text class="hot-title">热门搜索</text>
      <view class="hot-tags">
        <text v-for="h in hotWords" :key="h.keyword" class="hot-tag" @click="keyword=h.keyword;doSearch()">{{ h.keyword }}</text>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-if="searched">
      <view class="result-tabs">
        <text :class="{active: tab==='all'}" @click="tab='all'">全部</text>
        <text :class="{active: tab==='article'}" @click="tab='article'">文章</text>
        <text :class="{active: tab==='course'}" @click="tab='course'">课程</text>
        <text :class="{active: tab==='circle'}" @click="tab='circle'">圈子</text>
      </view>

      <view v-if="results">
        <view v-for="a in results.articles" :key="a.id" class="result-item" @click="goDetail(a.id,'ARTICLE')">
          <text class="r-title">{{ a.title }}</text>
          <text class="r-type">文章</text>
        </view>
        <view v-for="c in results.courses" :key="c.id" class="result-item" @click="goDetail(c.id,'COURSE')">
          <text class="r-title">{{ c.title }}</text>
          <text class="r-type">课程 · ¥{{ c.price }}</text>
        </view>
        <view v-for="c in results.circles" :key="c.id" class="result-item" @click="goDetail(c.id,'CIRCLE')">
          <text class="r-title">{{ c.name }}</text>
          <text class="r-type">圈子 · {{ c.memberCount }}人</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { searchApi } from "../../api";

const keyword = ref("");
const tab = ref("all");
const searched = ref(false);
const results = ref<any>(null);
const hotWords = ref<any[]>([]);

onMounted(async () => {
  hotWords.value = await searchApi.hot();
});

async function doSearch() {
  if (!keyword.value.trim()) return;
  searched.value = true;
  results.value = await searchApi.search(keyword.value, tab.value === "all" ? undefined : tab.value);
}

function goDetail(id: string, type: string) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}&type=${type}` });
}
</script>

<style>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; }
.search-bar { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }
.search-input { flex: 1; background: #fff; border-radius: 20px; padding: 8px 16px; font-size: 14px; border: 1px solid #e0d5c1; }

.hot { background: #fff; border-radius: 8px; padding: 12px; }
.hot-title { font-size: 14px; color: #666; }
.hot-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.hot-tag {
  background: #f5f0e6; color: #8b4513; padding: 4px 12px; border-radius: 14px; font-size: 13px;
}

.result-tabs { display: flex; gap: 16px; margin-bottom: 12px; font-size: 14px; }
.result-tabs text { padding: 4px 0; color: #666; }
.result-tabs text.active { color: #8b4513; font-weight: bold; border-bottom: 2px solid #8b4513; }

.result-item { background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
.r-title { font-size: 15px; color: #333; }
.r-type { font-size: 12px; color: #999; }
</style>
