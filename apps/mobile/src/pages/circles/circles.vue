<template>
  <view class="page">
    <!-- 顶部标题 -->
    <view class="title-row">
      <text class="title-text">圈子</text>
      <text class="title-sub">以文会友，以友辅仁</text>
    </view>

    <!-- 类型筛选 -->
    <view class="filter-bar">
      <view
        v-for="tab in typeTabs"
        :key="tab.key"
        class="filter-item"
        :class="{ active: currentTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- 下拉刷新提示 -->
    <view v-if="refreshing" class="refresh-tip">刷新中...</view>

    <!-- 骨架屏 -->
    <LoadingSkeleton v-if="loading && circles.length === 0" type="card" />

    <!-- 圈子列表 -->
    <view v-else-if="circles.length > 0" class="circle-list">
      <CircleCard v-for="c in circles" :key="c.id" :circle="c" />
    </view>

    <!-- 空状态 -->
    <EmptyState v-else-if="!loading && circles.length === 0" icon="👥" text="暂无圈子" />

    <!-- 加载更多 -->
    <view v-if="loadingMore" class="load-more">加载更多...</view>
    <view v-if="!hasMore && circles.length > 0" class="no-more">— 已全部加载 —</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import CircleCard from '../../components/CircleCard.vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { circleApi } from '../../api'

/** 类型筛选选项卡 */
const typeTabs = [
  { key: '', label: '全部' },
  { key: 'free', label: '免费' },
  { key: 'paid', label: '付费' },
]

const currentTab = ref('')
const circles = ref<any[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const refreshing = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 10

onMounted(() => {
  fetchCircles(true)
})

// 切换筛选
function switchTab(key: string) {
  if (currentTab.value === key) return
  currentTab.value = key
  page.value = 1
  hasMore.value = true
  fetchCircles(true)
}

// 下拉刷新
onPullDownRefresh(() => {
  refreshing.value = true
  page.value = 1
  hasMore.value = true
  fetchCircles(true).finally(() => {
    refreshing.value = false
    uni.stopPullDownRefresh()
  })
})

// 上拉加载更多
onReachBottom(() => {
  if (!hasMore.value || loadingMore.value) return
  loadingMore.value = true
  page.value++
  fetchCircles(false).finally(() => {
    loadingMore.value = false
  })
})

async function fetchCircles(reset: boolean) {
  if (reset) loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize }
    if (currentTab.value) {
      params.type = currentTab.value
    }
    const data = await circleApi.list(params)
    const items: any[] = data.list || data.items || data.data || data || []
    const mapped = items
      .filter((c: any) => c && c.id)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        cover: c.cover,
        intro: c.intro || c.description,
        memberCount: c.memberCount ?? 0,
        postCount: c.postCount ?? 0,
        type: c.type,
        tags: c.tags,
        isJoined: c.isJoined ?? c.joined ?? false,
      }))
    if (reset) {
      circles.value = mapped
    } else {
      const existIds = new Set(circles.value.map((x) => x.id))
      const news = mapped.filter((x) => !existIds.has(x.id))
      circles.value.push(...news)
    }
    hasMore.value = mapped.length >= pageSize
  } catch {
    if (reset) circles.value = []
    hasMore.value = false
  } finally {
    if (reset) loading.value = false
  }
}
</script>

<style>
.page {
  padding: 12px;
  background: #F5F0E8;
  min-height: 100vh;
}

/* 标题 */
.title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e0d5c1;
}
.title-text {
  font-size: 20px;
  font-weight: bold;
  color: #C41E3A;
}
.title-sub {
  font-size: 12px;
  color: #C9A96E;
  font-style: italic;
}

/* ===== 类型筛选 ===== */
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.filter-item {
  padding: 6px 18px;
  border-radius: 16px;
  font-size: 13px;
  color: #666;
  background: #fff;
  border: 1px solid #e0d5c1;
}
.filter-item.active {
  color: #fff;
  background: #C41E3A;
  border-color: #C41E3A;
}

/* 下拉刷新 */
.refresh-tip {
  text-align: center;
  font-size: 12px;
  color: #C9A96E;
  padding: 6px 0;
}

/* 圈子列表 */
.circle-list {
  padding-bottom: 4px;
}

/* 加载更多 */
.load-more {
  text-align: center;
  color: #C9A96E;
  padding: 16px 0;
  font-size: 13px;
}
.no-more {
  text-align: center;
  color: #ccc;
  padding: 16px 0;
  font-size: 12px;
}
</style>
