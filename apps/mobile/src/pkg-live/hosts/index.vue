<script setup lang="ts">
/** 主播列表 - 从原型 app/live/hosts/page.tsx 迁移 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import { goBack, navigateTo } from '@/utils/router'
import { liveApi } from '@/lib/live-data'
import type { LiveHost } from '@/lib/live-data'
import { onMounted } from 'vue'

const hosts = ref<LiveHost[]>([])

type FilterKey = 'all' | 'live' | 'followed'
const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'live', label: '直播中' },
  { key: 'followed', label: '已关注' },
]

const isLoading = ref(false)
const loadError = ref<string | null>(null)
const isEmpty = computed(() => filtered.value.length === 0)
function reload() {
  loadError.value = null
}

const search = ref('')
const filter = ref<FilterKey>('all')

const filtered = computed<LiveHost[]>(() =>
  hosts.value.filter((h: LiveHost) => {
    const matchFilter = filter.value === 'all' ? true : filter.value === 'live' ? h.isLive : false
    const kw = search.value.trim()
    const matchSearch = !kw || h.name.includes(kw) || h.specialty.includes(kw) || h.tags.some((t) => t.includes(kw))
    return matchFilter && matchSearch
  }),
)

onMounted(async () => {
  try { hosts.value = await liveApi.hosts() } catch { /* */ }
})

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
  <view v-if="isLoading" class="page">
    <view style="padding: 24rpx;">
      <AppSkeleton width="100%" height="80rpx" radius="16rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="60rpx" radius="16rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="isEmpty" title="暂无主播" />
  <view v-else class="page">
    <!-- 头部 -->
    <view class="header">
      <view
        class="nav-back"
        @tap="goBack"
      >
        <AppIcon
          name="arrow-left"
          :size="40"
          color="#2c2c2c"
        />
      </view>
      <text class="nav-title">
        主播列表
      </text>
    </view>

    <view class="body">
      <!-- 搜索框 -->
      <view class="search-box">
        <AppIcon
          name="search"
          :size="32"
          color="#999999"
        />
        <input
          v-model="search"
          class="search-input"
          placeholder="搜索主播"
          placeholder-class="search-ph"
        >
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
          <text class="chip-txt">
            {{ f.label }}
          </text>
        </view>
      </view>

      <!-- 主播卡片列表 -->
      <view class="list">
        <view
          v-for="host in filtered"
          :key="host.id"
          class="host-card"
          @tap="open(host.id)"
        >
          <view class="cover">
            <image
              class="cover-img"
              :src="host.cover"
              mode="aspectFill"
            />
            <view
              v-if="host.isLive"
              class="cover-mask"
            >
              <view class="live-tag">
                <AppIcon
                  name="radio"
                  :size="20"
                  color="#ffffff"
                /><text class="tag-txt">
                  直播中
                </text>
              </view>
              <view class="watch-tag">
                <AppIcon
                  name="users"
                  :size="20"
                  color="#ffffff"
                /><text class="tag-txt">
                  {{ (host.viewerCount! / 1000).toFixed(1) }}k 在看
                </text>
              </view>
            </view>
          </view>
          <view class="host-info">
            <view class="avatar">
              <image
                class="avatar-img"
                :src="host.avatar"
                mode="aspectFill"
              />
            </view>
            <view class="meta">
              <view class="name-row">
                <text class="name">
                  {{ host.name }}
                </text>
                <text
                  v-if="host.verified"
                  class="verified"
                >
                  认证
                </text>
              </view>
              <text class="specialty">
                {{ host.specialty }}
              </text>
              <view class="stats">
                <view class="stat">
                  <AppIcon
                    name="users"
                    :size="24"
                    color="#999999"
                  /><text class="stat-txt">
                    {{ fmtFollowers(host.followers) }} 粉丝
                  </text>
                </view>
                <view class="stat">
                  <AppIcon
                    name="heart"
                    :size="24"
                    color="#999999"
                  /><text class="stat-txt">
                    {{ fmtLikes(host.likes) }} 获赞
                  </text>
                </view>
                <view class="stat">
                  <AppIcon
                    name="star"
                    :size="24"
                    color="#fbbf24"
                  /><text class="stat-txt">
                    {{ host.rating }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
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
</style>
