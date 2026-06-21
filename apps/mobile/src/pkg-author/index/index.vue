<template>
  <view class="author-page">
    <!-- 顶部导航 -->
    <view
      class="nav-bar"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="nav-inner">
        <view
          class="nav-back"
          @click="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="#1f1f1f"
          />
        </view>
        <text class="nav-title">
          作者列表
        </text>
      </view>
    </view>

    <view class="page-body">
      <!-- 搜索框 -->
      <view class="search-box">
        <app-icon
          name="search"
          :size="32"
          color="#9a9a9a"
        />
        <input
          v-model="search"
          class="search-input"
          placeholder="搜索作者或专长"
          placeholder-class="search-ph"
        >
      </view>

      <!-- 筛选 + 排序 -->
      <view class="filter-row">
        <view class="filter-tabs">
          <view
            v-for="f in filterOptions"
            :key="f.value"
            class="filter-tab"
            :class="{ 'filter-tab-active': filter === f.value }"
            @click="filter = f.value"
          >
            {{ f.label }}
          </view>
        </view>
        <picker
          mode="selector"
          :range="sortOptions"
          range-key="label"
          :value="sortIndex"
          @change="onSortChange"
        >
          <view class="sort-trigger">
            <text class="sort-text">
              {{ sortOptions[sortIndex].label }}
            </text>
            <app-icon
              name="chevron-down"
              :size="24"
              color="#9a9a9a"
            />
          </view>
        </picker>
      </view>

      <!-- 作者列表 -->
      <view class="author-list">
        <view
          v-for="author in filtered"
          :key="author.id"
          class="author-card"
          @click="goDetail(author.id)"
        >
          <image
            class="author-avatar"
            :src="author.avatar"
            mode="aspectFill"
          />
          <view class="author-main">
            <view class="author-name-row">
              <text class="author-name">
                {{ author.name }}
              </text>
              <app-icon
                v-if="author.verified"
                name="award"
                :size="26"
                color="#f59e0b"
              />
              <text class="author-specialty">
                {{ author.specialty }}
              </text>
            </view>
            <text class="author-bio">
              {{ author.bio }}
            </text>
            <view class="author-stats">
              <view class="stat-item">
                <app-icon
                  name="book-open"
                  :size="22"
                  color="#9a9a9a"
                />
                <text class="stat-text">
                  {{ author.articles }} 篇
                </text>
              </view>
              <view class="stat-item">
                <app-icon
                  name="users"
                  :size="22"
                  color="#9a9a9a"
                />
                <text class="stat-text">
                  {{ (author.followers / 1000).toFixed(1) }}k 粉丝
                </text>
              </view>
              <view class="stat-item">
                <app-icon
                  name="star"
                  :size="22"
                  color="#fbbf24"
                />
                <text class="stat-text">
                  {{ author.rating }}
                </text>
              </view>
            </view>
          </view>
          <app-icon
            name="chevron-right"
            :size="28"
            color="#9a9a9a"
          />
        </view>

        <!-- 空态 -->
        <view
          v-if="filtered.length === 0"
          class="empty-state"
        >
          <app-icon
            name="search"
            :size="80"
            color="#d4d4d4"
          />
          <text class="empty-text">
            未找到相关作者
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateBack, navigateTo } from '@/utils/router'

interface Author {
  id: string
  name: string
  avatar: string
  specialty: string
  tags: string[]
  articles: number
  followers: number
  rating: number
  verified: boolean
  bio: string
}

const statusBarHeight = ref(0)

const authors: Author[] = [
  { id: '1', name: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', specialty: '八字命理', tags: ['八字', '流年', '大运'], articles: 286, followers: 15800, rating: 4.9, verified: true, bio: '从事命理研究二十余年，擅长四柱八字精析' },
  { id: '2', name: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', specialty: '紫微斗数', tags: ['紫微', '四化', '斗数'], articles: 194, followers: 12300, rating: 4.8, verified: true, bio: '台湾正宗紫微斗数传承，出版多部斗数专著' },
  { id: '3', name: '李玄机', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', specialty: '易经', tags: ['易经', '卦象', '占卜'], articles: 152, followers: 9600, rating: 4.7, verified: true, bio: '易学研究者，致力于将易经智慧应用于现代生活' },
  { id: '4', name: '王德华', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', specialty: '风水堪舆', tags: ['风水', '阳宅', '阴宅'], articles: 128, followers: 7800, rating: 4.8, verified: true, bio: '职业风水师，足迹遍及两岸三地，实操经验丰富' },
  { id: '5', name: '林奇门', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', specialty: '奇门遁甲', tags: ['奇门', '遁甲', '预测'], articles: 98, followers: 6200, rating: 4.6, verified: false, bio: '专注奇门遁甲研究，擅长事业与决策预测' },
  { id: '6', name: '陈梅花', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80', specialty: '梅花易数', tags: ['梅花', '易数', '起卦'], articles: 74, followers: 4500, rating: 4.5, verified: false, bio: '梅花易数爱好者，致力于普及传统起卦方法' },
]

type FilterValue = 'all' | 'verified'

const search = ref('')
const filter = ref<FilterValue>('all')
const sortIndex = ref(0)

const filterOptions: { value: FilterValue; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'verified', label: '已认证' },
]

const sortOptions: { value: 'followers' | 'articles' | 'rating'; label: string }[] = [
  { value: 'followers', label: '按粉丝数' },
  { value: 'articles', label: '按文章数' },
  { value: 'rating', label: '按评分' },
]

const filtered = computed(() => {
  const sortKey = sortOptions[sortIndex.value].value
  const kw = search.value.trim()
  return authors
    .filter(a => {
      const matchVerified = filter.value === 'all' || a.verified
      const matchSearch = !kw || a.name.includes(kw) || a.specialty.includes(kw) || a.bio.includes(kw)
      return matchVerified && matchSearch
    })
    .sort((a, b) => b[sortKey] - a[sortKey])
})

function onSortChange(e: { detail: { value: number } }) {
  sortIndex.value = Number(e.detail.value)
}

function goBack() {
  navigateBack()
}

function goDetail(id: string) {
  navigateTo(`/authors/${id}`)
}

defineExpose({})

// 状态栏高度
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {
  statusBarHeight.value = 0
}
</script>

<style scoped>
.author-page {
  min-height: 100vh;
  background: #faf8f5;
}

.nav-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #faf8f5;
  border-bottom: 1rpx solid #ececec;
}

.nav-inner {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 0 32rpx;
  height: 88rpx;
}

.nav-back {
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f1f1f;
}

.page-body {
  padding: 32rpx 32rpx 160rpx;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 76rpx;
  padding: 0 24rpx;
  background: #ffffff;
  border: 1rpx solid #ececec;
  border-radius: 16rpx;
  margin-bottom: 32rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #1f1f1f;
}

.search-ph {
  color: #9a9a9a;
}

.filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}

.filter-tabs {
  display: flex;
  gap: 16rpx;
}

.filter-tab {
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 500;
  background: #f0ece6;
  color: #1f1f1f;
  transition: all 0.2s;
}

.filter-tab-active {
  background: #c41e3a;
  color: #ffffff;
}

.sort-trigger {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.sort-text {
  font-size: 24rpx;
  color: #9a9a9a;
}

.author-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.author-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  background: #ffffff;
  border: 1rpx solid #ececec;
  border-radius: 24rpx;
}

.author-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #f0ece6;
}

.author-main {
  flex: 1;
  min-width: 0;
}

.author-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.author-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f1f1f;
}

.author-specialty {
  font-size: 22rpx;
  color: #c41e3a;
  background: rgba(196, 30, 58, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
}

.author-bio {
  display: block;
  font-size: 24rpx;
  color: #9a9a9a;
  margin-bottom: 16rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-stats {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.stat-text {
  font-size: 22rpx;
  color: #9a9a9a;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  gap: 24rpx;
}

.empty-text {
  font-size: 26rpx;
  color: #9a9a9a;
}
</style>
