<template>
  <view class="page">
    <!-- 类型筛选 -->
    <view class="filter-tabs">
      <text
        v-for="f in filters"
        :key="f.key"
        :class="{ active: currentFilter === f.key }"
        @click="switchFilter(f.key)"
      >{{ f.label }}</text>
    </view>

    <!-- 下拉刷新提示 -->
    <view v-if="refreshing" class="refresh-hint">刷新中...</view>

    <!-- 加载骨架 -->
    <LoadingSkeleton v-if="loading && list.length === 0" type="card" />

    <!-- 收藏列表 -->
    <view v-if="!loading || list.length > 0">
      <!-- 文章收藏 -->
      <template v-if="currentFilter === 'all' || currentFilter === 'ARTICLE'">
        <ContentCard
          v-for="item in filteredArticles"
          :key="item.id || item.targetId"
          :article="formatArticle(item)"
        />
      </template>

      <!-- 课程收藏 -->
      <template v-if="currentFilter === 'all' || currentFilter === 'COURSE'">
        <CourseCard
          v-for="item in filteredCourses"
          :key="item.id || item.targetId"
          :course="formatCourse(item)"
        />
      </template>

      <!-- 未知类型兜底 -->
      <template v-if="currentFilter === 'all'">
        <view
          v-for="item in filteredOthers"
          :key="item.id || item.targetId"
          class="simple-card"
          @click="goDetail(item)"
        >
          <image
            v-if="item.target?.cover"
            :src="item.target.cover"
            class="simple-cover"
            mode="aspectFill"
          />
          <view class="simple-body">
            <text class="simple-title">{{ item.target?.title || item.target?.name || '未知' }}</text>
            <text class="simple-type">{{ typeLabel(item.targetType) }}</text>
          </view>
        </view>
      </template>
    </view>

    <!-- 空状态 -->
    <EmptyState
      v-if="!loading && list.length === 0"
      icon="⭐"
      text="暂无收藏，去发现更多国学内容吧"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onShow } from "vue";
import { interactApi } from "../../api";
import ContentCard from "../../components/ContentCard.vue";
import CourseCard from "../../components/CourseCard.vue";
import LoadingSkeleton from "../../components/LoadingSkeleton.vue";
import EmptyState from "../../components/EmptyState.vue";

interface CollectItem {
  id?: string
  targetId?: string
  targetType: string
  target?: any
  createdAt?: string
}

const list = ref<CollectItem[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const currentFilter = ref("all");

const filters = [
  { key: "all", label: "全部" },
  { key: "ARTICLE", label: "文章" },
  { key: "COURSE", label: "课程" },
  { key: "VIDEO", label: "视频" },
];

const filteredArticles = computed(() => {
  return list.value.filter(
    (item) => item.targetType === "ARTICLE" && item.target
  );
});

const filteredCourses = computed(() => {
  return list.value.filter(
    (item) => item.targetType === "COURSE" && item.target
  );
});

const filteredOthers = computed(() => {
  return list.value.filter(
    (item) =>
      item.targetType !== "ARTICLE" &&
      item.targetType !== "COURSE" &&
      item.target
  );
});

onMounted(() => fetchCollects());

// onShow 每次页面显示时刷新
onShow(() => {
  fetchCollects();
});

async function fetchCollects() {
  loading.value = true;
  try {
    const data: any = await interactApi.myCollects();
    // 兼容不同返回格式
    list.value = data.collects || data.list || data || [];
  } catch {
    uni.showToast({ title: "获取收藏失败", icon: "none" });
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

function switchFilter(key: string) {
  currentFilter.value = key;
}

/** 下拉刷新 */
function onPullDownRefresh() {
  refreshing.value = true;
  fetchCollects().finally(() => {
    uni.stopPullDownRefresh();
  });
}

/** 将收藏条目格式化为 ContentCard 需要的文章结构 */
function formatArticle(item: CollectItem): any {
  const t = item.target || {};
  return {
    id: t.id || item.targetId,
    title: t.title || "",
    cover: t.cover || "",
    excerpt: t.excerpt || t.summary || "",
    author: t.author || "",
    dynasty: t.dynasty || "",
    tags: t.tags || [],
    viewCount: t.viewCount || 0,
    likeCount: t.likeCount || 0,
    collectCount: t.collectCount || 0,
    createdAt: t.createdAt || item.createdAt,
  };
}

/** 将收藏条目格式化为 CourseCard 需要的课程结构 */
function formatCourse(item: CollectItem): any {
  const t = item.target || {};
  return {
    id: t.id || item.targetId,
    title: t.title || "",
    cover: t.cover || "",
    intro: t.intro || t.summary || "",
    type: t.type || "",
    price: t.price || 0,
    originalPrice: t.originalPrice || 0,
    studentCount: t.studentCount || 0,
  };
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    ARTICLE: "文章",
    COURSE: "课程",
    VIDEO: "视频",
    CIRCLE: "圈子",
    PRODUCT: "商品",
  };
  return map[type] || type;
}

function goDetail(item: CollectItem) {
  const id = item.target?.id || item.targetId;
  const type = item.targetType;
  if (id && type) {
    uni.navigateTo({ url: `/pages/detail/detail?id=${id}&type=${type}` });
  }
}
</script>

<style>
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; }

/* ========== 筛选标签 ========== */
.filter-tabs {
  display: flex; gap: 12px; margin-bottom: 12px; font-size: 14px;
  background: #fff; border-radius: 8px; padding: 8px 12px;
}
.filter-tabs text {
  padding: 4px 12px; color: #666; cursor: pointer; border-radius: 14px;
}
.filter-tabs text.active {
  color: #fff; background: #C41E3A; font-weight: 500;
}

/* ========== 下拉刷新 ========== */
.refresh-hint {
  text-align: center; font-size: 12px; color: #C9A96E; padding: 8px 0;
}

/* ========== 兜底卡片 ========== */
.simple-card {
  display: flex; gap: 10px; background: #fff; border-radius: 8px;
  padding: 12px; margin-bottom: 10px; cursor: pointer;
}
.simple-cover { width: 64px; height: 64px; border-radius: 6px; flex-shrink: 0; }
.simple-body { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
.simple-title { font-size: 15px; font-weight: bold; color: #333; }
.simple-type { font-size: 12px; color: #C41E3A; }
</style>
