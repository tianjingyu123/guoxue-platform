<template>
  <view class="cl-page">
    <classics-header title="我的收藏" :show-search="false" />

    <view class="cl-main">
      <!-- Hero -->
      <view class="cl-hero">
        <text class="cl-kicker">珍藏一处</text>
        <text class="cl-title">我的收藏</text>
      </view>

      <!-- 搜索 -->
      <view class="cl-search-wrap">
        <view class="cl-search">
          <app-icon name="search" :size="36" color="#999999" />
          <input
            v-model="searchText"
            class="cl-search-input"
            placeholder="搜索收藏的内容"
            placeholder-class="cl-ph"
          />
        </view>
      </view>

      <!-- 类型筛选 -->
      <scroll-view scroll-x class="cl-filters" :show-scrollbar="false">
        <view class="cl-filters-row">
          <view
            v-for="f in filters"
            :key="f.id"
            class="cl-chip"
            :class="{ 'cl-chip--active': filter === f.id }"
            @tap="filter = f.id"
          >
            <text class="cl-chip-text" :class="{ 'cl-chip-text--active': filter === f.id }">{{ f.label }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 收藏列表 -->
      <view class="cl-list-wrap">
        <!-- 加载态 -->
        <view v-if="loading" class="cl-empty">
          <text class="cl-empty-title">加载中...</text>
        </view>
        <!-- 未登录态 -->
        <view v-else-if="isGuest" class="cl-empty">
          <view class="cl-empty-icon"><app-icon name="heart" :size="48" color="#999999" /></view>
          <text class="cl-empty-title">登录后查看收藏</text>
          <text class="cl-empty-sub">收藏会自动同步到你的账号</text>
          <view class="cl-empty-btn" @tap="goLogin">
            <text class="cl-empty-btn-text">去登录</text>
          </view>
        </view>
        <!-- 错误态 -->
        <view v-else-if="error" class="cl-empty">
          <text class="cl-empty-title" style="color:#c41e3a;">{{ error }}</text>
          <view class="cl-empty-btn" @tap="fetchData">
            <text class="cl-empty-btn-text">重试</text>
          </view>
        </view>
        <view v-else-if="filtered.length > 0" class="cl-list">
          <view v-for="item in filtered" :key="item.id" class="cl-card">
            <view class="cl-card-main" @tap="openItem(item)">
              <view class="cl-cover">
                <flat-cover :title="shortTitle(item.title)" :cover-color="coverColorForBook(item.title)" title-size="22rpx" />
              </view>
              <view class="cl-info">
                <text class="cl-name">{{ item.title }}</text>
                <view class="cl-meta">
                  <app-icon :name="typeMeta[item.type].icon" :size="28" color="#999999" />
                  <text class="cl-type-tag">{{ typeMeta[item.type].label }}</text>
                  <text class="cl-author">{{ item.author }}</text>
                </view>
                <text v-if="item.plays > 0" class="cl-plays">阅读 {{ item.plays }} 次</text>
              </view>
            </view>
            <view class="cl-del" @tap="removeItem(item.id)">
              <app-icon name="trash-2" :size="36" color="#bbbbbb" />
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-else class="cl-empty">
          <view class="cl-empty-icon">
            <app-icon name="heart" :size="48" color="#999999" />
          </view>
          <text class="cl-empty-title">还没有收藏任何内容</text>
          <text class="cl-empty-sub">浏览古籍，把喜欢的收进来</text>
          <view class="cl-empty-btn" @tap="goHome">
            <app-icon name="book-open" :size="32" color="#ffffff" />
            <text class="cl-empty-btn-text">去逛古籍馆</text>
            <app-icon name="chevron-right" :size="32" color="#ffffff" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ClassicsHeader from '@/components/classics/classics-header.vue'
import FlatCover from '@/components/classics/flat-cover.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { coverColorForBook } from '@/lib/classics-cover'
import { classicsApi, _mockCollectionTypeMeta, type CollectionItem } from '@/lib/classics-data'
import { getToken } from '@/utils/storage'

const searchText = ref('')
const filter = ref<string>('all')
const collections = ref<CollectionItem[]>([])
const typeMeta = _mockCollectionTypeMeta
// 收藏均为古籍，去掉多媒体类型筛选摆设，仅保留「全部」
const filters = [{ id: 'all', label: '全部' }] as const
const loading = ref(true)
const error = ref('')
const isGuest = ref(false)

async function fetchData() {
  if (!getToken()) { isGuest.value = true; loading.value = false; return }
  isGuest.value = false
  loading.value = true
  error.value = ''
  try {
    collections.value = await classicsApi.collections()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

const filtered = computed(() =>
  collections.value.filter(
    (item) =>
      (filter.value === 'all' || item.type === filter.value) &&
      (item.title.includes(searchText.value) || item.author.includes(searchText.value)),
  ),
)

function shortTitle(t: string): string {
  return t.replace(/[《》]/g, '').slice(0, 4)
}
async function removeItem(id: string) {
  try {
    await classicsApi.removeFavorite(id)
    collections.value = collections.value.filter((i) => i.id !== id)
    uni.showToast({ title: '已取消收藏', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  }
}
function openItem(item: CollectionItem) {
  switch (item.type) {
    case 'audiobook':
      uni.navigateTo({ url: `/pkg-classics/audiobooks/player?id=${item.id}` })
      break
    default:
      uni.navigateTo({ url: `/pkg-classics/detail/index?id=${item.id}` })
  }
}
function goHome() {
  uni.navigateTo({ url: '/pkg-classics/home/index' })
}
function goLogin() {
  uni.navigateTo({ url: '/pkg-auth/login/index' })
}
</script>

<style scoped lang="scss">
.cl-page {
  min-height: 100vh;
  background: #f4f2ee;
  padding-bottom: 160rpx;
}
.cl-main {
  width: 100%;
}
.cl-hero {
  display: flex;
  flex-direction: column;
  padding: 16rpx 40rpx 32rpx;
}
.cl-kicker {
  font-size: 26rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
  color: var(--brand);
  margin-bottom: 12rpx;
}
.cl-title {
  font-size: 68rpx;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -1rpx;
  color: var(--foreground);
}
.cl-search-wrap {
  padding: 0 40rpx 24rpx;
}
.cl-search {
  display: flex;
  align-items: center;
  gap: 20rpx;
  width: 100%;
  height: 88rpx;
  padding: 0 32rpx;
  border-radius: 32rpx;
  background: var(--card);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.cl-search-input {
  flex: 1;
  font-size: 30rpx;
  color: var(--foreground);
}
.cl-ph {
  color: #999999;
}
.cl-filters {
  width: 100%;
  white-space: nowrap;
  padding-bottom: 32rpx;
}
.cl-filters-row {
  display: inline-flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 40rpx;
}
.cl-chip {
  flex-shrink: 0;
  height: 64rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  background: var(--card);
  border: 1rpx solid rgba(0, 0, 0, 0.04);
}
.cl-chip--active {
  background: var(--foreground);
  border-color: var(--foreground);
}
.cl-chip-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #999999;
}
.cl-chip-text--active {
  color: var(--background);
}
.cl-list-wrap {
  padding: 0 40rpx;
}
.cl-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.cl-card {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 32rpx;
  background: var(--card);
  border-radius: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.cl-card-main {
  display: flex;
  align-items: center;
  gap: 32rpx;
  flex: 1;
  min-width: 0;
}
.cl-cover {
  width: 112rpx;
  flex-shrink: 0;
}
.cl-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.cl-name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cl-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 8rpx;
}
.cl-type-tag {
  flex-shrink: 0;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: var(--muted);
  font-size: 22rpx;
  color: #999999;
}
.cl-author {
  font-size: 24rpx;
  color: #999999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cl-plays {
  font-size: 22rpx;
  color: rgba(153, 153, 153, 0.7);
  margin-top: 8rpx;
}
.cl-del {
  flex-shrink: 0;
  padding: 16rpx;
}
.cl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 80rpx 40rpx;
  background: var(--card);
  border-radius: 48rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.cl-empty-icon {
  width: 112rpx;
  height: 112rpx;
  border-radius: 999rpx;
  background: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.cl-empty-title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--foreground);
}
.cl-empty-sub {
  font-size: 26rpx;
  color: #999999;
  margin-top: 8rpx;
}
.cl-empty-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 80rpx;
  padding: 0 40rpx;
  border-radius: 999rpx;
  background: var(--brand);
  margin-top: 40rpx;
}
.cl-empty-btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
}
</style>
