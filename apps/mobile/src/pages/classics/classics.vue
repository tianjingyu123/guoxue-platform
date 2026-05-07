<template>
  <view class="page">
    <view class="title-row">古籍阅读</view>

    <!-- 分类切换 -->
    <view class="category-tabs">
      <text v-for="cat in categories" :key="cat" :class="{ active: curCategory === cat }" @click="curCategory = cat; fetchBooks()">{{ cat }}</text>
    </view>

    <view v-if="loading" class="empty">加载中...</view>
    <view v-else>
      <view v-for="book in books" :key="book.id" class="book-card" @click="goReader(book.id)">
        <text class="book-title">{{ book.title }}</text>
        <text class="book-author">{{ book.dynasty }} · {{ book.author }}</text>
        <text class="book-intro">{{ book.intro }}</text>
        <view class="book-meta">
          <text class="book-cat">{{ categoryLabel(book.category) }}</text>
          <text>{{ book.chapterCount }} 章</text>
          <text>{{ book.viewCount }} 阅读</text>
        </view>
      </view>
    </view>
    <view v-if="!loading && books.length === 0" class="empty">暂无古籍</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { classicApi } from "../../api";

const categories = ["全部", "经", "史", "子", "集"];
const curCategory = ref("全部");
const books = ref<any[]>([]);
const loading = ref(false);

onMounted(() => fetchBooks());

async function fetchBooks() {
  loading.value = true;
  try {
    const cat = curCategory.value === "全部" ? undefined : curCategory.value;
    const data = await classicApi.books(cat ? { category: cat } : {});
    books.value = data.books || data || [];
  } finally {
    loading.value = false;
  }
}

function categoryLabel(c: string) {
  const map: Record<string, string> = { "经": "经部", "史": "史部", "子": "子部", "集": "集部" };
  return map[c] || c;
}

function goReader(id: string) {
  uni.navigateTo({ url: `/pages/reader/reader?id=${id}` });
}
</script>

<style>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; }
.title-row { font-size: 18px; font-weight: bold; color: #8b4513; margin-bottom: 12px; }

.category-tabs { display: flex; gap: 12px; margin-bottom: 12px; }
.category-tabs text { font-size: 14px; color: #666; padding: 4px 12px; }
.category-tabs text.active { color: #8b4513; font-weight: bold; border-bottom: 2px solid #8b4513; }

.book-card { background: #fff; border-radius: 8px; padding: 14px; margin-bottom: 10px; }
.book-title { font-size: 17px; font-weight: bold; color: #333; }
.book-author { font-size: 12px; color: #999; margin-top: 2px; display: block; }
.book-intro { font-size: 13px; color: #666; margin-top: 6px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.book-meta { display: flex; gap: 12px; margin-top: 8px; font-size: 12px; color: #8b4513; }
.book-cat { background: #f5f0e6; padding: 1px 8px; border-radius: 10px; }

.empty { text-align: center; color: #999; padding: 60px 0; }
</style>
