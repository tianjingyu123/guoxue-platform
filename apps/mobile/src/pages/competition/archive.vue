<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <text class="back-btn" @click="uni.navigateBack">‹</text>
      <text class="header-title">历史竞赛</text>
      <view class="header-filter" @click="showFilter = !showFilter">
        <text class="filter-text">{{ currentFilterLabel }}</text>
        <text class="filter-arrow">▼</text>
      </view>
    </view>

    <!-- 下拉筛选项 -->
    <view v-if="showFilter" class="filter-dropdown">
      <text
        v-for="f in filters"
        :key="f.value"
        class="filter-option"
        :class="{ active: currentFilter === f.value }"
        @click="selectFilter(f.value)"
      >{{ f.label }}</text>
    </view>

    <!-- 内容列表 -->
    <scroll-view scroll-y class="scroll-area" refresher-enabled @refresherrefresh="onRefresh">
      <DataState
        :is-loading="loading"
        :error="loadError"
        :is-empty="!loading && filteredList.length === 0"
        empty-icon="🏆"
        empty-title="暂无历史竞赛"
        empty-description="还没有参与过竞赛，快去报名吧"
        skeleton-type="list"
        @retry="fetchData"
      >
        <view v-for="c in filteredList" :key="c.id" class="comp-card" @click="goDetail(c)">
          <view class="comp-top">
            <view class="comp-icon-wrap">
              <text class="comp-icon">🏆</text>
            </view>
            <view class="comp-info">
              <text class="comp-name">{{ c.name || c.title }}</text>
              <text class="comp-date">{{ formatDate(c.startDate) }} - {{ formatDate(c.endDate) }}</text>
            </view>
            <text class="comp-status" :class="c.status">{{ statusLabel(c.status) }}</text>
          </view>
          <view class="comp-bottom">
            <text class="comp-stat">👥 {{ c.enrolledCount || c.participants || 0 }}人参赛</text>
            <text class="comp-stat">🏅 {{ c.ranking || '--' }}</text>
            <text class="comp-score" v-if="c.myScore">得分 {{ c.myScore }}</text>
          </view>
          <view class="comp-tags" v-if="c.tags?.length">
            <text v-for="tag in c.tags.slice(0, 3)" :key="tag" class="comp-tag">{{ tag }}</text>
          </view>
        </view>
      </DataState>

      <view v-if="!loading && hasMore" class="load-more" @click="loadMore">
        <text>加载更多</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { competitionApi } from '../../api'
import DataState from '../../components/DataState.vue'

const loading = ref(true)
const loadError = ref<string | null>(null)
const list = ref<any[]>([])
const page = ref(1)
const hasMore = ref(true)
const showFilter = ref(false)
const currentFilter = ref('all')
const pageSize = 20

const filters = [
  { label: '全部竞赛', value: 'all' },
  { label: '进行中', value: 'ongoing' },
  { label: '已结束', value: 'ended' },
  { label: '我参与的', value: 'mine' },
]

const currentFilterLabel = computed(() => {
  return filters.find(f => f.value === currentFilter.value)?.label || '全部'
})

const filteredList = computed(() => {
  if (currentFilter.value === 'all') return list.value
  if (currentFilter.value === 'mine') return list.value.filter(c => c.joined || c.myScore !== undefined)
  return list.value.filter(c => c.status === currentFilter.value)
})

onMounted(() => { fetchData() })

async function fetchData(reset = true) {
  if (reset) { loading.value = true; page.value = 1; hasMore.value = true }
  loadError.value = null
  try {
    const params: any = { page: page.value, pageSize }
    if (currentFilter.value !== 'all' && currentFilter.value !== 'mine') {
      params.status = currentFilter.value
    }
    const res: any = currentFilter.value === 'mine'
      ? await competitionApi.list({ ...params, joined: true })
      : await competitionApi.list(params)

    const items = Array.isArray(res) ? res : res?.list || res?.data || []
    if (reset) {
      list.value = items
    } else {
      const ids = new Set(list.value.map((r: any) => r.id))
      list.value.push(...items.filter((r: any) => !ids.has(r.id)))
    }
    hasMore.value = items.length >= pageSize
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
    if (reset) list.value = []
  } finally {
    loading.value = false
  }
}

function onRefresh() {
  fetchData(true)
}

function loadMore() {
  if (!hasMore.value) return
  page.value++
  fetchData(false)
}

function selectFilter(value: string) {
  currentFilter.value = value
  showFilter.value = false
  fetchData(true)
}

function statusLabel(status?: string): string {
  const map: Record<string, string> = {
    ongoing: '进行中', active: '进行中',
    upcoming: '即将开始', pending: '即将开始',
    ended: '已结束', finished: '已结束',
    draft: '筹备中',
  }
  return map[status || ''] || status || '未知'
}

function formatDate(d?: string): string {
  if (!d) return '--'
  return d.slice(0, 10)
}

function goDetail(c: any) {
  uni.navigateTo({ url: `/pages/competition/dashboard?id=${c.id}` })
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { background: #fff; padding: 20rpx 24rpx; display: flex; align-items: center; gap: 16rpx; position: sticky; top: 0; z-index: 10; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { font-size: 44rpx; color: #2C2C2C; line-height: 1; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; flex: 1; }
.header-filter { display: flex; align-items: center; gap: 8rpx; padding: 8rpx 16rpx; background: #F5F0E8; border-radius: 24rpx; }
.filter-text { font-size: 24rpx; color: #666; }
.filter-arrow { font-size: 20rpx; color: #999; }

.filter-dropdown { position: absolute; top: 100rpx; right: 24rpx; background: #fff; border-radius: 12rpx; box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.1); z-index: 20; overflow: hidden; }
.filter-option { display: block; padding: 20rpx 40rpx; font-size: 26rpx; color: #666; }
.filter-option.active { color: #C41E3A; font-weight: 500; background: rgba(196,30,58,0.05); }

.scroll-area { padding: 24rpx; }
.comp-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); }
.comp-top { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.comp-icon-wrap { width: 72rpx; height: 72rpx; border-radius: 16rpx; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; }
.comp-icon { font-size: 36rpx; }
.comp-info { flex: 1; }
.comp-name { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; }
.comp-date { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.comp-status { padding: 4rpx 16rpx; border-radius: 16rpx; font-size: 22rpx; }
.comp-status.ongoing, .comp-status.active { background: rgba(82,196,26,0.1); color: #52C41A; }
.comp-status.ended, .comp-status.finished { background: #F5F0E8; color: #999; }
.comp-status.upcoming, .comp-status.pending { background: rgba(201,169,110,0.15); color: #C9A96E; }

.comp-bottom { display: flex; gap: 24rpx; margin-bottom: 12rpx; }
.comp-stat { font-size: 22rpx; color: #999; }
.comp-score { font-size: 24rpx; color: #C41E3A; font-weight: 500; }
.comp-tags { display: flex; gap: 8rpx; }
.comp-tag { font-size: 20rpx; color: #C9A96E; background: rgba(201,169,110,0.1); padding: 4rpx 16rpx; border-radius: 12rpx; }

.load-more { text-align: center; padding: 24rpx 0; font-size: 26rpx; color: #C9A96E; }
</style>
