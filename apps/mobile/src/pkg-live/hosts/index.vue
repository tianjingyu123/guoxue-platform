<script setup lang="ts">
/** 主播列表 - 从原型 app/live/hosts/page.tsx 迁移 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { goBack, navigateTo } from '@/utils/router'
import { liveApi, type LiveHost } from '@/lib/live-data'

type FilterKey = 'all' | 'live' | 'followed'
const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'live', label: '直播中' },
  { key: 'followed', label: '已关注' },
]

const search = ref('')
const filter = ref<FilterKey>('all')
const loading = ref(true)
const error = ref('')
const list = ref<LiveHost[]>([])

const filtered = computed<LiveHost[]>(() =>
  list.value.filter((h) => {
    const matchFilter = filter.value === 'all' ? true : filter.value === 'live' ? h.isLive : false
    const kw = search.value.trim()
    const matchSearch = !kw || h.name.includes(kw) || h.specialty.includes(kw) || h.tags.some((t) => t.includes(kw))
    return matchFilter && matchSearch
  }),
)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    list.value = await liveApi.getHosts(filter.value)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchData() })

function open(id: string) {
  navigateTo(`/live/${id}`)
}
function fmtFollowers(n: number) {
  return (n / 1000).toFixed(0) + 'k'
}
function fmtLikes(n: number) {
  return (n / 10000).toFixed(0) + 'w'
}
</script>

<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <view class="nav-back" @tap="goBack"><AppIcon name="arrow-left" :size="40" color="#2c2c2c" /></view>
      <text class="nav-title">主播列表</text>
    </view>

    <view class="body">
      <!-- 加载骨架 -->
      <view v-if="loading" class="skeleton">
        <view v-for="i in 3" :key="i" class="sk-host">
          <view class="sk-cover" />
          <view class="sk-info">
            <view class="sk-avatar" />
            <view class="sk-lines">
              <view class="sk-line sk-line--short" />
              <view class="sk-line sk-line--long" />
            </view>
          </view>
        </view>
      </view>

      <!-- 错误状态 -->
      <view v-else-if="error" class="error-state">
        <text class="error-txt">{{ error }}</text>
        <view class="retry-btn" @tap="fetchData"><text class="retry-btn-txt">重新加载</text></view>
      </view>

      <!-- 正常内容 -->
      <template v-else>
      <!-- 搜索框 -->
      <view class="search-box">
        <AppIcon name="search" :size="32" color="#999999" />
        <input v-model="search" class="search-input" placeholder="搜索主播" placeholder-class="search-ph" />
      </view>

      <!-- 筛选胶囊 -->
      <view class="filters">
        <view
          v-for="f in filters"
          :key="f.key"
          class="chip"
          :class="filter === f.key ? 'chip-on' : 'chip-off'"
          @tap="filter = f.key"
        >
          <text class="chip-txt">{{ f.label }}</text>
        </view>
      </view>

      <!-- 主播卡片列表 -->
      <view class="list">
        <view v-for="host in filtered" :key="host.id" class="host-card" @tap="open(host.id)">
          <view class="cover">
            <smart-cover class="cover-img" :src="host.cover" :title="host.name" type="live" />
            <view v-if="host.isLive" class="cover-mask">
              <view class="live-tag">
                <AppIcon name="radio" :size="20" color="#ffffff" /><text class="tag-txt">直播中</text>
              </view>
              <view class="watch-tag">
                <AppIcon name="users" :size="20" color="#ffffff" /><text class="tag-txt">{{ (host.viewerCount! / 1000).toFixed(1) }}k 在看</text>
              </view>
            </view>
          </view>
          <view class="host-info">
            <view class="avatar">
              <smart-avatar :src="host.avatar" :name="host.name" class="avatar-img" />
            </view>
            <view class="meta">
              <view class="name-row">
                <text class="name">{{ host.name }}</text>
                <text v-if="host.verified" class="verified">认证</text>
              </view>
              <text class="specialty">{{ host.specialty }}</text>
              <view class="stats">
                <view class="stat"><AppIcon name="users" :size="24" color="#999999" /><text class="stat-txt">{{ fmtFollowers(host.followers) }} 粉丝</text></view>
                <view class="stat"><AppIcon name="heart" :size="24" color="#999999" /><text class="stat-txt">{{ fmtLikes(host.likes) }} 获赞</text></view>
                <view class="stat"><AppIcon name="star" :size="24" color="#fbbf24" /><text class="stat-txt">{{ host.rating }}</text></view>
              </view>
            </view>
          </view>
        </view>
      </view>
      </template>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--surface-sunken); }
.header { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 24rpx; height: 96rpx; padding: 0 32rpx; background: var(--surface); border-bottom: 2rpx solid var(--border, #ebe6de); }
.nav-back { display: flex; align-items: center; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2c2c2c; }

.body { padding: 32rpx 32rpx 160rpx; }

/* 搜索框 */
.search-box { display: flex; align-items: center; gap: 16rpx; height: 72rpx; padding: 0 24rpx; background: var(--surface); border: 2rpx solid var(--border, #ebe6de); border-radius: 16rpx; margin-bottom: 32rpx; }
.search-input { flex: 1; font-size: 28rpx; color: #2c2c2c; }
.search-ph { color: #999999; }

/* 筛选 */
.filters { display: flex; gap: 16rpx; margin-bottom: 32rpx; }
.chip { flex-shrink: 0; padding: 12rpx 24rpx; border-radius: 999rpx; }
.chip-off { background: var(--muted, #f0ece5); }
.chip-on { background: var(--brand); }
.chip-txt { font-size: 28rpx; font-weight: 500; white-space: nowrap; }
.chip-off .chip-txt { color: #2c2c2c; }
.chip-on .chip-txt { color: #ffffff; }

/* 列表 */
.list { display: flex; flex-direction: column; gap: 24rpx; }
.host-card { overflow: hidden; border: 2rpx solid var(--border, #ebe6de); border-radius: 24rpx; background: var(--surface); }
.cover { position: relative; width: 100%; height: 256rpx; background: var(--surface-sunken); }
.cover-img { width: 100%; height: 100%; }
.cover-mask { position: absolute; inset: 0; display: flex; align-items: flex-start; justify-content: space-between; padding: 16rpx; background: rgba(0, 0, 0, 0.3); }
.live-tag { display: flex; align-items: center; gap: 6rpx; padding: 2rpx 16rpx; background: #ef4444; border-radius: 999rpx; }
.watch-tag { display: flex; align-items: center; gap: 6rpx; padding: 2rpx 16rpx; background: rgba(0, 0, 0, 0.5); border-radius: 999rpx; }
.tag-txt { font-size: 20rpx; color: #ffffff; white-space: nowrap; }

.host-info { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; }
.avatar { width: 96rpx; height: 96rpx; border-radius: 999rpx; overflow: hidden; border: 4rpx solid var(--surface); margin-top: -48rpx; flex-shrink: 0; background: var(--surface-sunken); }
.avatar-img { width: 100%; height: 100%; }
.meta { flex: 1; min-width: 0; }
.name-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 4rpx; }
.name { font-size: 28rpx; font-weight: 600; color: #2c2c2c; }
.verified { flex-shrink: 0; font-size: 20rpx; color: var(--brand); padding: 2rpx 12rpx; border-radius: 999rpx; background: rgba(196, 30, 58, 0.1); }
.specialty { display: block; font-size: 24rpx; color: #999999; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-bottom: 8rpx; }
.stats { display: flex; flex-wrap: wrap; gap: 16rpx; }
.stat { display: flex; align-items: center; gap: 4rpx; }
.stat-txt { font-size: 24rpx; color: #999999; white-space: nowrap; }

/* 骨架屏 */
.skeleton { display: flex; flex-direction: column; gap: 24rpx; }
.sk-host { background: var(--surface); border-radius: 24rpx; overflow: hidden; }
.sk-cover { height: 256rpx; background: linear-gradient(90deg, #e8e4dc 25%, #f0ece5 50%, #e8e4dc 75%); animation: shimmer 1.5s infinite; background-size: 200% 100%; }
.sk-info { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; }
.sk-avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: linear-gradient(90deg, #e8e4dc 25%, #f0ece5 50%, #e8e4dc 75%); animation: shimmer 1.5s infinite; background-size: 200% 100%; }
.sk-lines { flex: 1; display: flex; flex-direction: column; gap: 16rpx; }
.sk-line { height: 24rpx; border-radius: 8rpx; background: linear-gradient(90deg, #e8e4dc 25%, #f0ece5 50%, #e8e4dc 75%); animation: shimmer 1.5s infinite; background-size: 200% 100%; }
.sk-line--short { width: 50%; }
.sk-line--long { width: 80%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* 错误状态 */
.error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 0; }
.error-txt { font-size: 28rpx; color: #999999; margin-bottom: 32rpx; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-btn-txt { font-size: 28rpx; color: #ffffff; font-weight: 500; }
</style>
