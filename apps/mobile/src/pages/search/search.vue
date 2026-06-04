<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">
          🔍
        </text>
        <input
          v-model="keyword"
          placeholder="搜索国学经典、文章、课程..."
          class="search-input"
          @confirm="doSearch"
          @input="onInput"
          @focus="onFocus"
          @blur="onBlur"
        >
        <text
          v-if="keyword"
          class="clear-btn"
          @click.stop="clearKeyword"
        >
          ✕
        </text>
      </view>
      <text
        class="search-btn"
        @click="doSearch"
      >
        搜索
      </text>
    </view>

    <!-- 搜索建议下拉 -->
    <view
      v-if="showSuggest && suggestions.length > 0"
      class="suggest-list"
    >
      <view
        v-for="(s, i) in suggestions"
        :key="i"
        class="suggest-item"
        @touchstart.stop="selectSuggest(s)"
        @mousedown.stop="selectSuggest(s)"
      >
        <text class="suggest-icon">
          🔍
        </text>
        <text class="suggest-text">
          {{ s }}
        </text>
        <text class="suggest-arrow">
          ↗
        </text>
      </view>
    </view>

    <!-- 初始状态：热搜 + 历史 -->
    <view v-if="!searched && !showSuggest">
      <!-- 搜索历史 -->
      <view
        v-if="historyWords.length > 0"
        class="section-card"
      >
        <view class="section-header">
          <text class="section-title">
            🕐 搜索历史
          </text>
          <text
            class="section-action"
            @click="clearAllHistory"
          >
            清除全部
          </text>
        </view>
        <view class="tag-list">
          <view
            v-for="(h, i) in historyWords"
            :key="i"
            class="tag-with-del"
          >
            <text
              class="hot-tag"
              @click="clickHistory(h)"
            >
              {{ h }}
            </text>
            <text
              class="tag-del"
              @click.stop="removeHistory(i)"
            >
              ✕
            </text>
          </view>
        </view>
      </view>

      <!-- 热门搜索 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">
            🔥 热门搜索
          </text>
        </view>
        <view
          v-if="loadingHot"
          class="tag-list"
        >
          <text
            v-for="i in 8"
            :key="i"
            class="hot-tag-skeleton"
          />
        </view>
        <view
          v-else-if="hotWords.length > 0"
          class="tag-list"
        >
          <text
            v-for="h in hotWords"
            :key="h.keyword || h"
            class="hot-tag"
            @click="clickHot(h.keyword || h)"
          >
            {{ h.keyword || h }}
            <text
              v-if="h.count"
              class="hot-count"
            >
              {{ formatCount(h.count) }}
            </text>
          </text>
        </view>
        <view
          v-else
          class="no-hot"
        >
          <text>暂无热门搜索</text>
        </view>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-if="searched">
      <!-- 结果统计 -->
      <view class="result-stats">
        <text>
          搜索 "<text class="stat-keyword">
            {{ searchKeyword }}
          </text>" 共找到 <text class="stat-num">
            {{ totalCount }}
          </text> 条结果
        </text>
      </view>

      <!-- Tab 切换 -->
      <view class="result-tabs">
        <scroll-view
          scroll-x
          class="tabs-scroll"
          show-scrollbar="false"
        >
          <text
            v-for="t in tabs"
            :key="t.key"
            :class="{ active: tab === t.key }"
            class="tab-item"
            @click="switchTab(t.key)"
          >
            {{ t.label }}
          </text>
        </scroll-view>
      </view>

      <!-- 加载中 -->
      <LoadingSkeleton
        v-if="loading && totalCount === 0"
        type="card"
      />

      <!-- 空状态 -->
      <EmptyState
        v-if="!loading && totalCount === 0"
        icon="🔍"
        text="未找到相关内容"
      >
        <view
          v-if="hotWords.length > 0"
          class="empty-hot"
        >
          <text class="empty-hot-title">
            热门搜索：
          </text>
          <view
            class="tag-list"
            style="justify-content: center;"
          >
            <text
              v-for="h in hotWords.slice(0, 6)"
              :key="h.keyword || h"
              class="hot-tag"
              @click="clickHot(h.keyword || h)"
            >
              {{ h.keyword || h }}
            </text>
          </view>
        </view>
      </EmptyState>

      <!-- 结果列表 -->
      <view v-if="!loading || results">
        <!-- 文章结果 -->
        <template v-if="displayArticles.length > 0">
          <view
            v-if="tab === 'all'"
            class="result-group-title"
          >
            📄 文章
          </view>
          <ContentCard
            v-for="a in displayArticles"
            :key="a.id"
            :article="a"
          />
        </template>

        <!-- 编辑内容结果 -->
        <template v-if="displayContents.length > 0">
          <view
            v-if="tab === 'all'"
            class="result-group-title"
          >
            📜 诗词经典
          </view>
          <ContentCard
            v-for="c in displayContents"
            :key="'content-' + c.id"
            :article="{ ...c, _type: 'editorial' }"
          />
        </template>

        <!-- 课程结果 -->
        <template v-if="displayCourses.length > 0">
          <view
            v-if="tab === 'all'"
            class="result-group-title"
          >
            📚 课程
          </view>
          <CourseCard
            v-for="c in displayCourses"
            :key="c.id"
            :course="c"
          />
        </template>

        <!-- 圈子结果 -->
        <template v-if="displayCircles.length > 0">
          <view
            v-if="tab === 'all'"
            class="result-group-title"
          >
            👥 圈子
          </view>
          <CircleCard
            v-for="c in displayCircles"
            :key="c.id"
            :circle="c"
          />
        </template>

        <!-- 古籍结果 -->
        <template v-if="displayClassics.length > 0">
          <view
            v-if="tab === 'all'"
            class="result-group-title"
          >
            📜 古籍
          </view>
          <view
            v-for="b in displayClassics"
            :key="'classic-' + b.id"
            class="book-card"
            @click="goReader(b)"
          >
            <view class="book-cover-wrap">
              <image
                v-if="b.cover"
                :src="b.cover"
                class="book-cover"
                mode="aspectFill"
              />
              <view
                v-else
                class="book-cover-placeholder"
              >
                <text class="plc-cat">
                  {{ b.category || '典' }}
                </text>
              </view>
            </view>
            <view class="book-body">
              <text class="book-title">
                {{ b.title }}
              </text>
              <view class="book-meta">
                <text class="book-author">
                  {{ b.author || '佚名' }}
                </text>
                <text
                  v-if="b.dynasty"
                  class="book-dynasty"
                >
                  {{ b.dynasty }}
                </text>
              </view>
              <text class="book-intro">
                {{ b.intro || '' }}
              </text>
            </view>
          </view>
        </template>

        <!-- 电子书结果 -->
        <template v-if="displayEbooks.length > 0">
          <view
            v-if="tab === 'all'"
            class="result-group-title"
          >
            📖 电子书
          </view>
          <view
            v-for="b in displayEbooks"
            :key="'ebook-' + b.id"
            class="book-card"
            @click="goEbookDetail(b)"
          >
            <view class="book-cover-wrap">
              <image
                v-if="b.cover"
                :src="b.cover"
                class="book-cover"
                mode="aspectFill"
              />
              <view
                v-else
                class="book-cover-placeholder"
              >
                <text class="plc-cat">
                  📖
                </text>
              </view>
            </view>
            <view class="book-body">
              <text class="book-title">
                {{ b.title }}
              </text>
              <view class="book-meta">
                <text class="book-author">
                  {{ b.author || '佚名' }}
                </text>
              </view>
              <text class="book-intro">
                {{ b.description || '' }}
              </text>
            </view>
          </view>
        </template>

        <!-- 加载更多 -->
        <view
          v-if="hasMore && !loading"
          class="load-more-wrap"
        >
          <text
            class="load-more-btn"
            @click="loadMore"
          >
            加载更多
          </text>
        </view>
        <view
          v-if="!hasMore && totalCount > 0"
          class="load-more-wrap"
        >
          <text class="no-more-text">
            — 已显示全部结果 —
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { onReachBottom, onPullDownRefresh } from "@dcloudio/uni-app";
import { searchApi } from "../../api";
import ContentCard from "../../components/ContentCard.vue";
import CourseCard from "../../components/CourseCard.vue";
import CircleCard from "../../components/CircleCard.vue";
import LoadingSkeleton from "../../components/LoadingSkeleton.vue";
import EmptyState from "../../components/EmptyState.vue";

const STORAGE_KEY = "search_history";
const MAX_HISTORY = 10;

const keyword = ref("");
const searchKeyword = ref("");
const tab = ref("all");
const searched = ref(false);
const results = ref<any>(null);
const hotWords = ref<any[]>([]);
const loading = ref(false);
const loadingHot = ref(false);
const page = ref(1);
const pageSize = ref(10);
const hasMore = ref(false);
const historyWords = ref<string[]>([]);
const suggestions = ref<string[]>([]);
const showSuggest = ref(false);
const errorMsg = ref("");

const tabs = [
  { key: "all", label: "全部" },
  { key: "article", label: "文章" },
  { key: "content", label: "诗词" },
  { key: "course", label: "课程" },
  { key: "circle", label: "圈子" },
  { key: "classic", label: "古籍" },
  { key: "ebook", label: "电子书" },
];

let suggestTimer: ReturnType<typeof setTimeout> | null = null;
let blurTimer: ReturnType<typeof setTimeout> | null = null;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const displayArticles = computed(() => results.value?.articles || []);
const displayContents = computed(() => results.value?.contents || []);
const displayCourses = computed(() => results.value?.courses || []);
const displayCircles = computed(() => results.value?.circles || []);
const displayClassics = computed(() => results.value?.classics || []);
const displayEbooks = computed(() => results.value?.ebooks || []);

const totalCount = computed(() => {
  if (!results.value) return 0;
  return (
    (results.value.articles?.length || 0) +
    (results.value.contents?.length || 0) +
    (results.value.courses?.length || 0) +
    (results.value.circles?.length || 0) +
    (results.value.classics?.length || 0) +
    (results.value.ebooks?.length || 0)
  );
});

onMounted(async () => {
  loadHistory();
  try {
    loadingHot.value = true;
    hotWords.value = await searchApi.hot();
  } catch { /* skip */ }
  finally {
    loadingHot.value = false;
  }
});

onReachBottom(() => {
  if (!loading.value && hasMore.value && searched.value) {
    loadMore();
  }
});

onPullDownRefresh(async () => {
  if (searched.value) {
    page.value = 1;
    errorMsg.value = "";
    await doSearch();
  }
  uni.stopPullDownRefresh();
});

/* ==================== 搜索历史 ==================== */

function loadHistory() {
  try {
    const stored = uni.getStorageSync(STORAGE_KEY);
    historyWords.value = stored ? JSON.parse(stored) : [];
  } catch {
    historyWords.value = [];
  }
}

function saveHistory() {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(historyWords.value));
}

function addToHistory(word: string) {
  if (!word.trim()) return;
  historyWords.value = historyWords.value.filter((w) => w !== word);
  historyWords.value.unshift(word);
  if (historyWords.value.length > MAX_HISTORY) {
    historyWords.value = historyWords.value.slice(0, MAX_HISTORY);
  }
  saveHistory();
  try { searchApi.saveHistory(word); } catch { /* */ }
}

function removeHistory(index: number) {
  historyWords.value.splice(index, 1);
  saveHistory();
}

function clearAllHistory() {
  historyWords.value = [];
  saveHistory();
}

function clickHistory(word: string) {
  keyword.value = word;
  doSearch();
}

function clickHot(word: string) {
  keyword.value = word;
  doSearch();
}

/* ==================== 搜索建议 ==================== */

function onInput() {
  if (suggestTimer) clearTimeout(suggestTimer);
  if (blurTimer) clearTimeout(blurTimer);

  const val = keyword.value.trim();
  if (!val) {
    suggestions.value = [];
    showSuggest.value =false;
    if (searched.value) {
      searched.value = false;
      results.value = null;
    }
    return;
  }

  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (keyword.value.trim()) doSearch();
  }, 300);

  suggestTimer = setTimeout(async () => {
    try {
      const res = await searchApi.suggest(val);
      const list = Array.isArray(res) ? res : [];
      if (list.length > 0) {
        suggestions.value =
          typeof list[0] === "string" ? list : list.map((s: any) => s.keyword || s.name || "");
      } else {
        suggestions.value = [];
      }
      showSuggest.value =suggestions.value.length > 0;
    } catch {
      suggestions.value = [];
      showSuggest.value =false;
    }
  }, 300);
}

function onFocus() {
  if (suggestions.value.length > 0) showSuggest.value =true;
}

function onBlur() {
  if (blurTimer) clearTimeout(blurTimer);
  blurTimer = setTimeout(() => { showSuggest.value =false; }, 200);
}

function selectSuggest(word: string) {
  keyword.value = word;
  showSuggest.value =false;
  doSearch();
}

function clearKeyword() {
  keyword.value = "";
  suggestions.value = [];
  showSuggest.value =false;
  searched.value = false;
  results.value = null;
}

/* ==================== 搜索 & 分页 ==================== */

function switchTab(t: string) {
  if (tab.value === t) return;
  tab.value = t;
  page.value = 1;
  doSearch();
}

async function doSearch() {
  if (!keyword.value.trim()) return;
  if (searchTimer) clearTimeout(searchTimer);
  searched.value = true;
  loading.value = true;
  showSuggest.value =false;
  searchKeyword.value = keyword.value.trim();

  addToHistory(keyword.value.trim());

  try {
    page.value = 1;
    errorMsg.value = "";
    const res = await searchApi.search(
      keyword.value,
      tab.value === "all" ? undefined : tab.value,
      { page: page.value, pageSize: pageSize.value },
    );
    results.value = res;
    hasMore.value = checkHasMore(res);
  } catch {
    errorMsg.value = "搜索失败，请下拉刷新重试";
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (loading.value || !hasMore.value) return;
  loading.value = true;
  try {
    page.value++;
    const res = await searchApi.search(
      keyword.value,
      tab.value === "all" ? undefined : tab.value,
      { page: page.value, pageSize: pageSize.value },
    );
    if (results.value) {
      if (res.articles) results.value.articles = [...(results.value.articles || []), ...res.articles];
      if (res.contents) results.value.contents = [...(results.value.contents || []), ...res.contents];
      if (res.courses) results.value.courses = [...(results.value.courses || []), ...res.courses];
      if (res.circles) results.value.circles = [...(results.value.circles || []), ...res.circles];
      if (res.classics) results.value.classics = [...(results.value.classics || []), ...res.classics];
      if (res.ebooks) results.value.ebooks = [...(results.value.ebooks || []), ...res.ebooks];
    }
    hasMore.value = checkHasMore(res);
  } catch {
    page.value--;
    errorMsg.value = "加载失败，请重试";
  } finally {
    loading.value = false;
  }
}

function checkHasMore(data: any): boolean {
  if (!data) return false;
  return (
    (data.articles?.length || 0) >= pageSize.value ||
    (data.contents?.length || 0) >= pageSize.value ||
    (data.courses?.length || 0) >= pageSize.value ||
    (data.circles?.length || 0) >= pageSize.value ||
    (data.classics?.length || 0) >= pageSize.value ||
    (data.ebooks?.length || 0) >= pageSize.value
  );
}

function goReader(book: any) {
  uni.navigateTo({ url: `/pages/reader/reader?bookId=${book.id}` });
}

function goEbookDetail(book: any) {
  uni.navigateTo({ url: `/pages/ebook/ebook-detail?id=${book.id}` });
}

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "w";
  return String(n);
}
</script>

<style>
.page {
  padding: 12px;
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 40px;
}

/* ===== 搜索栏 ===== */
.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  align-items: center;
}
.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 22px;
  border: 1px solid #E8E0D5;
  padding: 0 14px;
  height: 42px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.search-icon {
  font-size: 15px;
  margin-right: 8px;
  opacity: 0.5;
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  height: 36px;
  font-size: 14px;
  border: none;
  background: transparent;
  outline: none;
  color: #2C2C2C;
}
.clear-btn {
  padding: 4px 6px;
  font-size: 14px;
  color: #bbb;
  flex-shrink: 0;
}
.search-btn {
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  color: #fff;
  padding: 10px 20px;
  border-radius: 22px;
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(196, 30, 58, 0.2);
}

/* ===== 搜索建议 ===== */
.suggest-list {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
.suggest-item {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid #F5F0E8;
}
.suggest-item:last-child {
  border-bottom: none;
}
.suggest-item:active {
  background: #F5F0E8;
}
.suggest-icon {
  font-size: 13px;
  margin-right: 10px;
  color: #C9A96E;
  opacity: 0.6;
}
.suggest-text {
  flex: 1;
  font-size: 14px;
  color: #2C2C2C;
}
.suggest-arrow {
  font-size: 12px;
  color: #ccc;
}

/* ===== 通用卡片 ===== */
.section-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.section-title {
  font-size: 14px;
  color: #2C2C2C;
  font-weight: 600;
}
.section-action {
  font-size: 12px;
  color: #C9A96E;
  padding: 2px 8px;
}

/* ===== 标签 ===== */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-with-del {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.tag-del {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 16px;
  height: 16px;
  background: #bbb;
  color: #fff;
  border-radius: 50%;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hot-tag {
  background: #F5F0E8;
  color: #C41E3A;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  display: inline-block;
  border: 1px solid #E8E0D5;
}
.hot-tag:active {
  background: #ede5d5;
}
.hot-count {
  font-size: 10px;
  color: #C9A96E;
  margin-left: 4px;
}
.hot-tag-skeleton {
  background: #E8E0D5;
  padding: 6px 32px;
  border-radius: 16px;
  font-size: 13px;
  display: inline-block;
  animation: shimmer 1.5s infinite;
}
.no-hot {
  text-align: center;
  color: #bbb;
  font-size: 13px;
  padding: 8px 0;
}

@keyframes shimmer {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}

/* ===== 结果统计 ===== */
.result-stats {
  font-size: 13px;
  color: #999;
  margin-bottom: 10px;
  padding: 0 4px;
}
.stat-keyword {
  color: #C41E3A;
  font-weight: 500;
}
.stat-num {
  color: #C41E3A;
  font-weight: bold;
}

/* ===== 结果 Tab ===== */
.result-tabs {
  margin-bottom: 12px;
}
.tabs-scroll {
  white-space: nowrap;
}
.tab-item {
  display: inline-block;
  padding: 6px 16px;
  margin-right: 8px;
  font-size: 13px;
  color: #888;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #E8E0D5;
}
.tab-item.active {
  color: #fff;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  border-color: #C41E3A;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(196, 30, 58, 0.2);
}

/* ===== 空结果 ===== */
.empty-hot {
  margin-top: 16px;
}
.empty-hot-title {
  font-size: 13px;
  color: #C9A96E;
  display: block;
  margin-bottom: 8px;
  text-align: center;
}

/* ===== 结果分组标题 ===== */
.result-group-title {
  font-size: 14px;
  color: #2C2C2C;
  font-weight: 600;
  padding: 10px 4px 6px;
}

/* ===== 加载更多 ===== */
.load-more-wrap {
  text-align: center;
  padding: 20px 0;
}
.load-more-btn {
  font-size: 14px;
  color: #C41E3A;
  padding: 8px 28px;
  border: 1px solid #C41E3A;
  border-radius: 20px;
  display: inline-block;
}
.no-more-text {
  font-size: 12px;
  color: #ccc;
}

/* ===== 古籍卡片 ===== */
.book-card {
  display: flex;
  gap: 12px;
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
.book-card:active {
  transform: scale(0.985);
}
.book-cover-wrap {
  width: 56px;
  height: 74px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
}
.book-cover {
  width: 100%;
  height: 100%;
}
.book-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #E8E0D5, #C9A96E);
}
.plc-cat {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: bold;
}
.book-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.book-title {
  font-size: 15px;
  font-weight: bold;
  color: #2C2C2C;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.book-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.book-author {
  font-size: 12px;
  color: #888;
}
.book-dynasty {
  font-size: 11px;
  color: #C41E3A;
  background: #F5F0E8;
  padding: 0 6px;
  border-radius: 3px;
}
.book-intro {
  font-size: 12px;
  color: #999;
  line-height: 1.4;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
