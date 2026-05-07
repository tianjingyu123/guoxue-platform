<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar" @click="goSearch">
      <input v-model="keyword" placeholder="搜索经典、诗词、课程..." class="search-input" disabled />
    </view>

    <!-- 功能入口 -->
    <view class="entrance-grid">
      <view class="entrance-item" @click="goPage('/pages/bazi/bazi')">
        <text class="entrance-icon">☰</text>
        <text class="entrance-label">八字排盘</text>
      </view>
      <view class="entrance-item" @click="goPage('/pages/classics/classics')">
        <text class="entrance-icon">📖</text>
        <text class="entrance-label">古籍阅读</text>
      </view>
      <view class="entrance-item" @click="goPage('/pages/poetry/poetry')">
        <text class="entrance-icon">🌸</text>
        <text class="entrance-label">诗词赏析</text>
      </view>
      <view class="entrance-item" @click="goPage('/pages/courses/courses')">
        <text class="entrance-icon">📚</text>
        <text class="entrance-label">课程</text>
      </view>
      <view class="entrance-item" @click="goPage('/pages/circles/circles')">
        <text class="entrance-icon">👥</text>
        <text class="entrance-label">圈子</text>
      </view>
      <view class="entrance-item" @click="goPage('/pages/search/search')">
        <text class="entrance-icon">🔍</text>
        <text class="entrance-label">搜索</text>
      </view>
    </view>

    <!-- 信息流 -->
    <view class="section-title">推荐内容</view>
    <view v-if="loading" class="loading">加载中...</view>
    <view v-else>
      <view v-for="item in list" :key="item.id" class="card" @click="goDetail(item.id)">
        <image v-if="item.cover" :src="item.cover" class="card-cover" mode="aspectFill" />
        <view class="card-body">
          <view class="card-title">{{ item.title }}</view>
          <view class="card-meta">
            <text class="circle-name" v-if="item.circle">{{ item.circle.name }}</text>
            <text>{{ item.user?.nickname }}</text>
          </view>
          <view class="card-excerpt" v-if="item.excerpt">{{ item.excerpt }}</view>
          <view class="card-stats">
            <text>{{ item.viewCount }} 浏览</text>
            <text>{{ item.likeCount }} 赞</text>
          </view>
        </view>
      </view>
    </view>
    <view v-if="!loading && list.length === 0" class="empty">暂无内容</view>

    <!-- 加载更多 -->
    <view v-if="hasMore" class="load-more" @click="loadMore">加载更多</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { contentApi } from "../../api";

const keyword = ref("");
const list = ref<any[]>([]);
const loading = ref(false);
const page = ref(1);
const hasMore = ref(true);

onMounted(() => fetchFeed());

async function fetchFeed() {
  loading.value = true;
  try {
    const data = await contentApi.feed({ page: page.value, pageSize: 10 });
    list.value = data.articles;
    hasMore.value = data.articles.length >= 10;
  } finally { loading.value = false; }
}

async function loadMore() {
  page.value++;
  try {
    const data = await contentApi.feed({ page: page.value, pageSize: 10 });
    if (data.articles.length === 0) { hasMore.value = false; return; }
    list.value.push(...data.articles);
    hasMore.value = data.articles.length >= 10;
  } catch { page.value--; }
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}&type=ARTICLE` });
}
function goSearch() {
  uni.navigateTo({ url: "/pages/search/search" });
}
function goPage(url: string) {
  uni.navigateTo({ url });
}
</script>

<style>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; }
.search-bar { margin-bottom: 12px; }
.search-input {
  background: #fff; border-radius: 20px; padding: 10px 16px;
  font-size: 14px; border: 1px solid #e0d5c1;
}
.entrance-grid {
  display: flex; justify-content: space-around; background: #fff;
  border-radius: 8px; padding: 12px 0; margin-bottom: 12px;
}
.entrance-item {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.entrance-icon { font-size: 28px; }
.entrance-label { font-size: 12px; color: #666; }

.section-title { font-size: 16px; font-weight: bold; color: #8b4513; margin-bottom: 8px; }

.card {
  background: #fff; border-radius: 8px; margin-bottom: 10px; overflow: hidden;
}
.card-cover { width: 100%; height: 160px; }
.card-body { padding: 12px; }
.card-title { font-size: 16px; font-weight: bold; color: #333; }
.card-meta { font-size: 12px; color: #999; margin: 4px 0; display: flex; gap: 8px; }
.circle-name { color: #8b4513; }
.card-excerpt { font-size: 14px; color: #666; margin: 4px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-stats { font-size: 12px; color: #999; margin-top: 6px; display: flex; gap: 12px; }

.loading, .empty { text-align: center; color: #999; padding: 40px; font-size: 14px; }
.load-more { text-align: center; color: #8b4513; padding: 12px; font-size: 14px; }
</style>
