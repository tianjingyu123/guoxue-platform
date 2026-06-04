<template>
  <view class="page">
    <view class="page-header">
      <text class="page-title">
        电子书
      </text>
      <text class="page-sub">
        国学经典 · 随时阅读
      </text>
    </view>

    <!-- 搜索 -->
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索书名/作者"
        confirm-type="search"
        @confirm="doSearch"
      >
      <text
        v-if="keyword"
        class="clear-btn"
        @click="clearSearch"
      >
        ✕
      </text>
    </view>

    <!-- 继续阅读 -->
    <view
      v-if="!keyword && continueList.length"
      class="section"
    >
      <view class="section-hdr">
        <text class="section-title">
          继续阅读
        </text>
      </view>
      <scroll-view
        scroll-x
        class="continue-scroll"
      >
        <view
          v-for="item in continueList"
          :key="item.ebookId"
          class="continue-card"
          @click="goReader(item.ebookId, item.chapterId)"
        >
          <image
            :src="item.ebook?.cover"
            class="continue-cover"
            mode="aspectFill"
          />
          <text class="continue-title">
            {{ item.ebook?.title }}
          </text>
          <view class="continue-progress">
            <view class="progress-bar">
              <view
                class="progress-fill"
                :style="{ width: (item.progress || 0) + '%' }"
              />
            </view>
            <text class="progress-text">
              {{ item.progress || 0 }}%
            </text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 分类标签 -->
    <scroll-view
      scroll-x
      class="tabs-scroll"
      show-scrollbar="false"
    >
      <text
        v-for="cat in categories"
        :key="cat.id"
        class="tab"
        :class="{ active: activeCategory === cat.id }"
        @click="switchCategory(cat.id)"
      >
        {{ cat.name }}
      </text>
    </scroll-view>

    <!-- 排序 -->
    <view class="sort-row">
      <text
        v-for="s in sorts"
        :key="s.value"
        class="sort-item"
        :class="{ active: sortBy === s.value }"
        @click="switchSort(s.value)"
      >
        {{ s.label }}
      </text>
    </view>

    <!-- 书籍列表 -->
    <view
      v-if="books.length"
      class="book-grid"
    >
      <view
        v-for="b in books"
        :key="b.id"
        class="book-card"
        @click="goDetail(b.id)"
      >
        <image
          :src="b.cover || '/static/default-book.png'"
          class="book-cover"
          mode="aspectFill"
        />
        <view class="book-info">
          <text class="book-title">
            {{ b.title }}
          </text>
          <text class="book-author">
            {{ b.author }}
          </text>
          <view class="book-bottom">
            <text
              v-if="Number(b.price) > 0"
              class="book-price"
            >
              ¥{{ b.price }}
            </text>
            <text
              v-else
              class="book-free"
            >
              免费
            </text>
            <text class="book-views">
              {{ formatCount(b.viewCount) }}人读过
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view
      v-if="!loading && books.length === 0"
      class="empty"
    >
      <text class="empty-icon">
        📚
      </text>
      <text class="empty-text">
        暂无电子书
      </text>
    </view>

    <!-- 加载状态 -->
    <view
      v-if="loading"
      class="loading-state"
    >
      加载中...
    </view>
    <view
      v-if="!loading && !hasMore && books.length > 0"
      class="no-more"
    >
      没有更多了
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { onPullDownRefresh, onReachBottom } from "@dcloudio/uni-app";
import { ebookApi } from "../../api";

const keyword = ref("");
const categories = ref<any[]>([{ id: "", name: "全部" }]);
const activeCategory = ref("");
const sortBy = ref("latest");
const books = ref<any[]>([]);
const continueList = ref<any[]>([]);
const loading = ref(false);
const page = ref(1);
const hasMore = ref(true);

const sorts = [
  { label: "最新", value: "latest" },
  { label: "最热", value: "hot" },
  { label: "价格↑", value: "price_asc" },
];

onMounted(() => {
  fetchCategories();
  fetchBooks();
  fetchContinueReading();
});

onPullDownRefresh(async () => {
  page.value = 1;
  hasMore.value = true;
  await fetchBooks();
  uni.stopPullDownRefresh();
});

onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    page.value++;
    fetchBooks(true);
  }
});

async function fetchCategories() {
  try {
    const res = await ebookApi.categories();
    const list = (res as any)?.data || res || [];
    categories.value = [{ id: "", name: "全部" }, ...list];
  } catch {}
}

async function fetchBooks(append = false) {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize: 20 };
    if (activeCategory.value) params.categoryId = activeCategory.value;
    if (keyword.value) params.keyword = keyword.value;
    if (sortBy.value) params.sortBy = sortBy.value;
    const res = await ebookApi.books(params);
    const data = (res as any)?.data || res;
    const list = data?.books || [];
    if (append) {
      books.value = [...books.value, ...list];
    } else {
      books.value = list;
    }
    hasMore.value = list.length >= 20;
  } catch {
    hasMore.value = false;
  } finally {
    loading.value = false;
  }
}

async function fetchContinueReading() {
  try {
    const res = await ebookApi.purchases();
    const data = (res as any)?.data || res;
    continueList.value = (data?.purchases || []).slice(0, 6);
  } catch {}
}

function switchCategory(id: string) {
  activeCategory.value = id;
  page.value = 1;
  hasMore.value = true;
  fetchBooks();
}

function switchSort(val: string) {
  sortBy.value = val;
  page.value = 1;
  hasMore.value = true;
  fetchBooks();
}

function doSearch() {
  page.value = 1;
  hasMore.value = true;
  fetchBooks();
}

function clearSearch() {
  keyword.value = "";
  page.value = 1;
  hasMore.value = true;
  fetchBooks();
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/ebook/ebook-detail?id=${id}` });
}

function goReader(ebookId: string, chapterId?: string) {
  const url = chapterId
    ? `/pages/ebook/ebook-reader?id=${ebookId}&chapterId=${chapterId}`
    : `/pages/ebook/ebook-reader?id=${ebookId}`;
  uni.navigateTo({ url });
}

function formatCount(n: number) {
  if (!n) return "0";
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}
</script>

<style scoped>
.page { padding: 20rpx 30rpx; background: #f8f5f0; min-height: 100vh; }
.page-header { margin-bottom: 24rpx; }
.page-title { font-size: 44rpx; font-weight: bold; color: #2c1810; }
.page-sub { font-size: 24rpx; color: #8b6914; margin-left: 12rpx; }

.search-bar { display: flex; align-items: center; background: #fff; border-radius: 40rpx; padding: 16rpx 24rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.search-input { flex: 1; font-size: 28rpx; }
.clear-btn { font-size: 28rpx; color: #999; padding: 0 12rpx; }

.section { margin-bottom: 24rpx; }
.section-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; }
.continue-scroll { white-space: nowrap; }
.continue-card { display: inline-block; width: 200rpx; margin-right: 20rpx; vertical-align: top; }
.continue-cover { width: 200rpx; height: 270rpx; border-radius: 12rpx; }
.continue-title { font-size: 24rpx; color: #333; margin-top: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.continue-progress { margin-top: 8rpx; }
.progress-bar { height: 6rpx; background: #e8e8e8; border-radius: 3rpx; overflow: hidden; }
.progress-fill { height: 100%; background: #8b6914; border-radius: 3rpx; transition: width 0.3s; }
.progress-text { font-size: 20rpx; color: #999; }

.tabs-scroll { margin-bottom: 16rpx; white-space: nowrap; }
.tab { display: inline-block; padding: 12rpx 28rpx; font-size: 26rpx; color: #666; background: #fff; border-radius: 30rpx; margin-right: 16rpx; }
.tab.active { background: #8b6914; color: #fff; }

.sort-row { display: flex; gap: 24rpx; margin-bottom: 20rpx; }
.sort-item { font-size: 24rpx; color: #999; padding: 6rpx 0; border-bottom: 4rpx solid transparent; }
.sort-item.active { color: #8b6914; border-bottom-color: #8b6914; }

.book-grid { display: flex; flex-wrap: wrap; gap: 20rpx; }
.book-card { width: calc(50% - 10rpx); background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05); }
.book-cover { width: 100%; height: 380rpx; }
.book-info { padding: 16rpx; }
.book-title { font-size: 28rpx; font-weight: bold; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.book-author { font-size: 22rpx; color: #888; margin-top: 6rpx; }
.book-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.book-price { font-size: 28rpx; color: #e63946; font-weight: bold; }
.book-free { font-size: 24rpx; color: #4caf50; background: #e8f5e9; padding: 4rpx 12rpx; border-radius: 6rpx; }
.book-views { font-size: 20rpx; color: #999; }

.empty { text-align: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; display: block; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }
.loading-state { text-align: center; padding: 40rpx; font-size: 26rpx; color: #999; }
.no-more { text-align: center; padding: 30rpx; font-size: 24rpx; color: #ccc; }
</style>
