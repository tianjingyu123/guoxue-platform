<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <input
          v-model="keyword"
          placeholder="搜索国学经典、文章、课程..."
          class="search-input"
          @confirm="doSearch"
          @input="onInput"
          @focus="onFocus"
          @blur="onBlur"
        />
        <text v-if="keyword" class="clear-btn" @click.stop="clearKeyword">✕</text>
      </view>
      <button size="mini" @click="doSearch" :disabled="loading">搜索</button>
    </view>

    <!-- 搜索建议 -->
    <view v-if="showSuggest && suggestions.length > 0" class="suggest-list">
      <view
        v-for="(s, i) in suggestions"
        :key="i"
        class="suggest-item"
        @touchstart.stop="selectSuggest(s)"
        @mousedown.stop="selectSuggest(s)"
      >
        <text class="suggest-icon">🔍</text>
        <text class="suggest-text">{{ s }}</text>
      </view>
    </view>

    <!-- 初始状态：热搜 + 历史 -->
    <view v-if="!searched && !showSuggest">
      <!-- 搜索历史 -->
      <view v-if="historyWords.length > 0" class="section-card">
        <view class="section-header">
          <text class="section-title">搜索历史</text>
          <text class="section-action" @click="clearAllHistory">清除全部</text>
        </view>
        <view class="tag-list">
          <view v-for="(h, i) in historyWords" :key="i" class="tag-with-del">
            <text class="hot-tag" @click="clickHistory(h)">{{ h }}</text>
            <text class="tag-del" @click.stop="removeHistory(i)">✕</text>
          </view>
        </view>
      </view>

      <!-- 热门搜索 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">热门搜索</text>
        </view>
        <view v-if="loadingHot" class="tag-list">
          <text v-for="i in 8" :key="i" class="hot-tag-skeleton">&nbsp;</text>
        </view>
        <view v-else class="tag-list">
          <text
            v-for="h in hotWords"
            :key="h.keyword || h"
            class="hot-tag"
            @click="clickHot(h.keyword || h)"
          >{{ h.keyword || h }}</text>
        </view>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-if="searched">
      <!-- 结果统计 -->
      <view class="result-stats">
        <text>共找到 <text class="stat-num">{{ totalCount }}</text> 条结果</text>
      </view>

      <!-- Tab 切换 -->
      <view class="result-tabs">
        <text
          v-for="t in tabs"
          :key="t.key"
          :class="{ active: tab === t.key }"
          @click="switchTab(t.key)"
        >{{ t.label }}</text>
      </view>

      <!-- 加载骨架 -->
      <LoadingSkeleton v-if="loading && !results" type="card" />

      <!-- 空状态 -->
      <EmptyState
        v-if="!loading && totalCount === 0"
        icon="📖"
        text="未找到相关内容"
      >
        <view v-if="hotWords.length > 0" class="empty-hot">
          <text class="empty-hot-title">不妨试试：</text>
          <view class="tag-list" style="justify-content: center;">
            <text
              v-for="h in hotWords"
              :key="h.keyword || h"
              class="hot-tag"
              @click="clickHot(h.keyword || h)"
            >{{ h.keyword || h }}</text>
          </view>
        </view>
      </EmptyState>

      <!-- 结果列表 -->
      <view v-if="!loading || results">
        <!-- 文章结果 -->
        <template v-if="displayArticles.length > 0">
          <view v-if="tab === 'all'" class="result-group-title">文章</view>
          <ContentCard
            v-for="a in displayArticles"
            :key="a.id"
            :article="a"
          />
        </template>

        <!-- 编辑内容（诗词/经典）结果 -->
        <template v-if="displayContents.length > 0">
          <view v-if="tab === 'all'" class="result-group-title">诗词经典</view>
          <ContentCard
            v-for="c in displayContents"
            :key="'content-' + c.id"
            :article="{ ...c, _type: 'editorial' }"
          />
        </template>

        <!-- 课程结果 -->
        <template v-if="displayCourses.length > 0">
          <view v-if="tab === 'all'" class="result-group-title">课程</view>
          <CourseCard
            v-for="c in displayCourses"
            :key="c.id"
            :course="c"
          />
        </template>

        <!-- 圈子结果 -->
        <template v-if="displayCircles.length > 0">
          <view v-if="tab === 'all'" class="result-group-title">圈子</view>
          <CircleCard
            v-for="c in displayCircles"
            :key="c.id"
            :circle="c"
          />
        </template>

        <!-- 触底加载 -->
        <view v-if="hasMore && !loading" class="load-more-wrap">
          <text class="load-more-btn" @click="loadMore">加载更多</text>
        </view>
        <view v-if="!hasMore && totalCount > 0" class="load-more-wrap">
          <text class="no-more-text">— 已显示全部结果 —</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { searchApi } from "../../api";
import ContentCard from "../../components/ContentCard.vue";
import CourseCard from "../../components/CourseCard.vue";
import CircleCard from "../../components/CircleCard.vue";
import LoadingSkeleton from "../../components/LoadingSkeleton.vue";
import EmptyState from "../../components/EmptyState.vue";

const STORAGE_KEY = "search_history";
const MAX_HISTORY = 10;

const keyword = ref("");
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

const tabs = [
  { key: "all", label: "全部" },
  { key: "article", label: "文章" },
  { key: "content", label: "诗词" },
  { key: "course", label: "课程" },
  { key: "circle", label: "圈子" },
];

let suggestTimer: ReturnType<typeof setTimeout> | null = null;
let blurTimer: ReturnType<typeof setTimeout> | null = null;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const displayArticles = computed(() => results.value?.articles || []);
const displayContents = computed(() => results.value?.contents || []);
const displayCourses = computed(() => results.value?.courses || []);
const displayCircles = computed(() => results.value?.circles || []);

const totalCount = computed(() => {
  if (!results.value) return 0;
  return (
    (results.value.articles?.length || 0) +
    (results.value.contents?.length || 0) +
    (results.value.courses?.length || 0) +
    (results.value.circles?.length || 0)
  );
});

onMounted(async () => {
  loadHistory();
  try {
    loadingHot.value = true;
    hotWords.value = await searchApi.hot();
  } catch {
    // 忽略热门搜索失败
  } finally {
    loadingHot.value = false;
  }
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
  // 同时调用服务端保存历史
  try {
    searchApi.saveHistory(word);
  } catch {
    // 静默处理
  }
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

/* ==================== 搜索建议（防抖 300ms） ==================== */

function onInput() {
  if (suggestTimer) clearTimeout(suggestTimer);
  if (blurTimer) clearTimeout(blurTimer);

  const val = keyword.value.trim();
  if (!val) {
    suggestions.value = [];
    showSuggest = false;
    // 用户清空输入时回到初始状态
    if (searched.value) {
      searched.value = false;
      results.value = null;
    }
    return;
  }

  // 自动搜索防抖
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (keyword.value.trim()) {
      doSearch();
    }
  }, 300);

  // 搜索建议
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
      showSuggest = suggestions.value.length > 0;
    } catch {
      suggestions.value = [];
      showSuggest = false;
    }
  }, 300);
}

function onFocus() {
  if (suggestions.value.length > 0) {
    showSuggest = true;
  }
}

function onBlur() {
  if (blurTimer) clearTimeout(blurTimer);
  blurTimer = setTimeout(() => {
    showSuggest = false;
  }, 200);
}

function selectSuggest(word: string) {
  keyword.value = word;
  showSuggest = false;
  doSearch();
}

function clearKeyword() {
  keyword.value = "";
  suggestions.value = [];
  showSuggest = false;
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
  showSuggest = false;

  addToHistory(keyword.value.trim());

  try {
    page.value = 1;
    const res = await searchApi.search(
      keyword.value,
      tab.value === "all" ? undefined : tab.value,
      { page: page.value, pageSize: pageSize.value },
    );
    results.value = res;
    hasMore.value = checkHasMore(res);
  } catch {
    uni.showToast({ title: "搜索失败，请重试", icon: "none" });
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
      if (res.articles) {
        results.value.articles = [...(results.value.articles || []), ...res.articles];
      }
      if (res.contents) {
        results.value.contents = [...(results.value.contents || []), ...res.contents];
      }
      if (res.courses) {
        results.value.courses = [...(results.value.courses || []), ...res.courses];
      }
      if (res.circles) {
        results.value.circles = [...(results.value.circles || []), ...res.circles];
      }
    }
    hasMore.value = checkHasMore(res);
  } catch {
    page.value--;
    uni.showToast({ title: "加载失败", icon: "none" });
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
    (data.circles?.length || 0) >= pageSize.value
  );
}

/** uni-app 页面触底时自动加载更多 */
function onReachBottom() {
  if (hasMore.value && !loading.value) {
    loadMore();
  }
}
</script>

<style>
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; }

/* ========== 搜索栏 ========== */
.search-bar { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }
.search-input-wrap {
  flex: 1; display: flex; align-items: center; background: #fff; border-radius: 20px;
  border: 1px solid #e0d5c1; padding: 0 12px;
}
.search-input {
  flex: 1; padding: 8px 0; font-size: 14px; border: none; background: transparent; outline: none;
}
.clear-btn {
  padding: 2px 6px; font-size: 14px; color: #b8a88a; line-height: 1; cursor: pointer;
}

/* ========== 搜索建议 ========== */
.suggest-list {
  background: #fff; border-radius: 8px; margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.suggest-item {
  display: flex; align-items: center; padding: 10px 12px; border-bottom: 1px solid #f0ebe0;
}
.suggest-item:last-child { border-bottom: none; }
.suggest-icon { font-size: 12px; margin-right: 8px; color: #b8a88a; }
.suggest-text { font-size: 14px; color: #333; }

/* ========== 通用卡片（历史/热门） ========== */
.section-card { background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
.section-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
}
.section-title { font-size: 14px; color: #666; font-weight: 500; }
.section-action { font-size: 12px; color: #b8a88a; cursor: pointer; }

/* ========== 标签 ========== */
.tag-list { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-with-del { position: relative; display: inline-flex; align-items: center; }
.tag-del {
  position: absolute; top: -6px; right: -6px; width: 16px; height: 16px;
  background: #ccc; color: #fff; border-radius: 50%; font-size: 10px;
  display: flex; align-items: center; justify-content: center; line-height: 1; cursor: pointer;
}
.hot-tag {
  background: #F5F0E8; color: #C41E3A; padding: 4px 12px; border-radius: 14px;
  font-size: 13px; display: inline-block; cursor: pointer;
}
.hot-tag-skeleton {
  background: #e8e2d8; padding: 4px 24px; border-radius: 14px;
  font-size: 13px; display: inline-block; animation: shimmer 1.5s infinite;
}

/* ========== 结果统计 ========== */
.result-stats { font-size: 13px; color: #999; margin-bottom: 8px; }
.stat-num { color: #C41E3A; font-weight: bold; }

/* ========== 结果 Tab ========== */
.result-tabs { display: flex; gap: 16px; margin-bottom: 12px; font-size: 14px; }
.result-tabs text { padding: 4px 0; color: #666; cursor: pointer; }
.result-tabs text.active { color: #C41E3A; font-weight: bold; border-bottom: 2px solid #C41E3A; }

/* ========== 空结果 ========== */
.empty-hot { margin-top: 16px; }
.empty-hot-title { font-size: 13px; color: #b8a88a; display: block; margin-bottom: 8px; text-align: center; }

/* ========== 结果分组标题 ========== */
.result-group-title {
  font-size: 13px; color: #999; padding: 8px 0 4px; font-weight: 500;
}

/* ========== 加载更多 ========== */
.load-more-wrap { text-align: center; padding: 16px 0; }
.load-more-btn {
  font-size: 14px; color: #C41E3A; padding: 6px 24px;
  border: 1px solid #C41E3A; border-radius: 16px; display: inline-block; cursor: pointer;
}
.no-more-text { font-size: 12px; color: #ccc; }

@keyframes shimmer {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}
</style>
