<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ClassicsHeader from '@/components/classics/classics-header.vue'
import FlatCover from '@/components/classics/flat-cover.vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import { coverColorForBook } from '@/lib/classics-cover'
import { rankTabs, classicsApi } from '@/lib/classics-data'
import type { RankBook } from '@/lib/classics-data'

const isLoading = ref(true)
const loadError = ref<string | null>(null)
const rankingBooks = ref<RankBook[]>([])

const isEmpty = computed(() => !rankingBooks.value || rankingBooks.value.length === 0)

onMounted(async () => {
  isLoading.value = true
  try {
    const data = await classicsApi.getRankingBooks()
    if (data && data.length > 0) {
      rankingBooks.value = data
    }
  } catch {
    loadError.value = '加载失败'
  } finally {
    isLoading.value = false
  }
})

function reload() {
  loadError.value = null
  isLoading.value = true
  classicsApi.getRankingBooks().then((data) => {
    if (data && data.length > 0) rankingBooks.value = data
  }).catch(() => {
    loadError.value = '加载失败'
  }).finally(() => {
    isLoading.value = false
  })
}

const rankType = ref<'hot' | 'new' | 'rating'>('hot')
const top3 = computed(() => rankingBooks.value.slice(0, 3))
const rest = computed(() => rankingBooks.value.slice(3))

function rankBg(rank: number): string {
  if (rank === 1) return '#c41e3a'
  if (rank === 2) return '#c9a96e'
  return '#a06a38'
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pkg-classics/detail/index?id=${id}` })
}
</script>

<template>
  <view v-if="isLoading" class="ranking-page">
    <view style="padding: 24rpx;">
      <AppSkeleton width="40%" height="40rpx" radius="12rpx" mb="24rpx" />
      <AppSkeleton width="60%" height="60rpx" radius="16rpx" mb="48rpx" />
      <AppSkeleton width="100%" height="200rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="160rpx" radius="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="isEmpty" title="暂无榜单数据" />
  <view v-else class="ranking-page">
    <ClassicsHeader title="推荐榜" />

    <view class="rk-main">
      <!-- Hero -->
      <view class="rk-hero">
        <text class="rk-kicker">
          读者公认
        </text>
        <text class="rk-title">
          传世经典榜
        </text>
      </view>

      <!-- 切换 -->
      <view class="rk-tabs-wrap">
        <view class="rk-tabs">
          <view
            v-for="t in rankTabs"
            :key="t.key"
            class="rk-tab"
            :class="{ 'rk-tab--active': rankType === t.key }"
            @tap="rankType = t.key"
          >
            {{ t.label }}
          </view>
        </view>
      </view>

      <!-- 三甲 -->
      <view class="rk-top3">
        <view
          v-for="book in top3"
          :key="book.id"
          class="rk-top3-item"
          @tap="goDetail(book.id)"
        >
          <view class="rk-top3-cover">
            <FlatCover
              :title="book.title"
              :cover-color="coverColorForBook(book.title, book.category)"
              title-size="36rpx"
            />
            <view
              class="rk-badge"
              :style="{ background: rankBg(book.rank) }"
            >
              {{ book.rank }}
            </view>
          </view>
          <text class="rk-top3-title">
            {{ book.title }}
          </text>
          <view class="rk-top3-views">
            <AppIcon
              name="eye"
              :size="24"
              color="#b3b3b3"
            />
            <text>{{ book.views }}</text>
          </view>
        </view>
      </view>

      <!-- 其余榜单 -->
      <view class="rk-list-wrap">
        <view class="rk-list">
          <view
            v-for="(book, i) in rest"
            :key="book.id"
            class="rk-row"
            :class="{ 'rk-row--bordered': i > 0 }"
            @tap="goDetail(book.id)"
          >
            <text class="rk-row-rank">
              {{ book.rank }}
            </text>
            <view class="rk-row-cover">
              <FlatCover
                :title="book.title"
                :cover-color="coverColorForBook(book.title, book.category)"
                title-size="24rpx"
              />
            </view>
            <view class="rk-row-info">
              <text class="rk-row-title">
                {{ book.title }}
              </text>
              <text class="rk-row-author">
                {{ book.author }} · {{ book.dynasty }}
              </text>
              <view class="rk-row-meta">
                <text class="rk-row-cat">
                  {{ book.category }}
                </text>
                <view class="rk-row-stat">
                  <AppIcon
                    name="eye"
                    :size="24"
                    color="#b3b3b3"
                  />
                  <text>{{ book.views }}</text>
                </view>
                <view class="rk-row-stat">
                  <AppIcon
                    name="star"
                    :size="24"
                    color="#fbbf24"
                    :fill="true"
                  />
                  <text>{{ book.rating }}</text>
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
.ranking-page {
  min-height: 100vh;
  background: #f4f2ee;
  padding-bottom: 160rpx;
}
.rk-main {
  max-width: 100%;
}

/* Hero */
.rk-hero {
  padding: 16rpx 40rpx 32rpx;
  display: flex;
  flex-direction: column;
}
.rk-kicker {
  font-size: 26rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
  color: #c41e3a;
  margin-bottom: 12rpx;
}
.rk-title {
  font-size: 68rpx;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -1rpx;
  color: var(--foreground);
}

/* Tabs */
.rk-tabs-wrap {
  padding: 0 40rpx 32rpx;
}
.rk-tabs {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  background: var(--card);
  border-radius: 999rpx;
  padding: 4rpx;
  box-shadow: inset 0 0 0 1rpx rgba(0, 0, 0, 0.04);
}
.rk-tab {
  height: 64rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: var(--muted-foreground);
}
.rk-tab--active {
  background: #c41e3a;
  color: #ffffff;
}

/* 三甲 */
.rk-top3 {
  padding: 0 40rpx 32rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
}
.rk-top3-item {
  display: flex;
  flex-direction: column;
}
.rk-top3-cover {
  position: relative;
}
.rk-badge {
  position: absolute;
  top: -16rpx;
  left: -16rpx;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 700;
  font-size: 30rpx;
  box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.15);
}
.rk-top3-title {
  margin-top: 16rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--foreground);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rk-top3-views {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: rgba(115, 115, 115, 0.7);
}

/* 清单 */
.rk-list-wrap {
  padding: 0 40rpx;
}
.rk-list {
  border-radius: 48rpx;
  background: var(--card);
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
.rk-row {
  display: flex;
  align-items: center;
  gap: 28rpx;
  padding: 24rpx;
}
.rk-row--bordered {
  border-top: 1rpx solid rgba(0, 0, 0, 0.08);
}
.rk-row-rank {
  width: 48rpx;
  text-align: center;
  font-weight: 700;
  font-size: 36rpx;
  color: var(--muted-foreground);
  flex-shrink: 0;
}
.rk-row-cover {
  width: 112rpx;
  flex-shrink: 0;
}
.rk-row-info {
  flex: 1;
  min-width: 0;
}
.rk-row-title {
  display: block;
  font-weight: 600;
  font-size: 30rpx;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rk-row-author {
  display: block;
  font-size: 24rpx;
  color: var(--muted-foreground);
  margin-top: 4rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rk-row-meta {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 20rpx;
  margin-top: 8rpx;
}
.rk-row-cat {
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 20rpx;
  background: var(--muted);
  color: var(--muted-foreground);
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.rk-row-stat {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: rgba(115, 115, 115, 0.7);
  white-space: nowrap;
}
</style>
