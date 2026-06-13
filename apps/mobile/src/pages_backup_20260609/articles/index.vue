<template>
  <view class="articles-page">
    <!-- 顶部固定 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">文章</text>
      </view>

      <!-- 搜索 -->
      <view class="search-wrap">
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="搜索文章标题或内容"
            confirm-type="search"
            @confirm="fetchArticles"
          />
          <text v-if="searchQuery" class="search-clear" @click="searchQuery = ''; fetchArticles()">✕</text>
        </view>
      </view>

      <!-- 分类Tab -->
      <scroll-view scroll-x class="cat-scroll" :show-scrollbar="false">
        <view class="cat-row">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="cat-chip"
            :class="{ active: activeCat === cat.id }"
            @click="activeCat = cat.id; fetchArticles()"
          >
            {{ cat.name }}
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 排序栏 -->
    <view class="sort-bar">
      <text class="sort-count">共 {{ totalCount }} 篇文章</text>
      <text class="sort-item" :class="{ active: sortBy === 'latest' }" @click="sortBy = 'latest'; sortArticles()">最新</text>
      <text class="sort-item" :class="{ active: sortBy === 'popular' }" @click="sortBy = 'popular'; sortArticles()">最热</text>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="load-area">
      <LoadingSkeleton v-for="i in 4" :key="i" type="card" />
    </view>

    <!-- Error -->
    <view v-else-if="err" class="err-area">
      <EmptyState icon="📡" title="加载失败" :description="err" action-text="重试" @action="fetchArticles" />
    </view>

    <!-- 文章列表 -->
    <view v-else-if="articles.length" class="article-list">
      <view v-for="a in articles" :key="a.id" class="article-card" @click="goDetail(a.id)">
        <image v-if="a.cover" :src="a.cover" class="article-cover" mode="aspectFill" />
        <view v-else class="article-cover-plain">📄</view>
        <view class="article-info">
          <view class="article-title-row">
            <view v-if="a.isTop" class="top-badge">置顶</view>
            <text class="article-title">{{ a.title }}</text>
          </view>
          <text class="article-excerpt">{{ a.excerpt || a.description }}</text>
          <view class="article-meta">
            <view class="meta-author">
              <image v-if="a.authorAvatar" :src="a.authorAvatar" class="author-avatar" mode="aspectFill" />
              <view v-else class="author-avatar-plain">{{ a.author?.charAt(0) || '匿' }}</view>
              <text class="author-name">{{ a.author }}</text>
              <text v-if="a.authorVerified" class="verified-v">V</text>
            </view>
            <view class="meta-stats">
              <text class="stat-item">❤ {{ a.likes || 0 }}</text>
              <text class="stat-item">💬 {{ a.comments || 0 }}</text>
              <text class="stat-item">{{ fmtDate(a.createdAt) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="more" class="more-btn" @click="loadMore">
        <text>加载更多</text>
      </view>
    </view>

    <!-- 空 -->
    <view v-else class="empty">
      <text class="empty-icon">📄</text>
      <text class="empty-text">暂无相关文章</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { contentApi } from '../../api'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

const categories = [
  { id: 'all', name: '全部' },
  { id: 'mingli', name: '命理研究' },
  { id: 'fengshui', name: '风水案例' },
  { id: 'guoxue', name: '国学经典' },
  { id: 'yangsheng', name: '养生文化' },
]

interface ArticleItem {
  id: string; title: string; author: string; authorAvatar?: string
  authorVerified?: boolean; cover?: string; excerpt?: string
  likes: number; comments: number; createdAt: string
  isTop?: boolean; description?: string
}

const searchQuery = ref('')
const activeCat = ref('all')
const sortBy = ref<'latest' | 'popular'>('latest')
const loading = ref(true)
const err = ref<string | null>(null)
const articles = ref<ArticleItem[]>([])
const totalCount = ref(0)
const page = ref(1)
const more = ref(false)

function fmtDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff < 7) return `${diff}天前`
  return `${d.getMonth() + 1}-${d.getDate()}`
}

async function fetchArticles() {
  loading.value = true; err.value = null
  try {
    const params: Record<string, any> = { page: 1, pageSize: 20 }
    if (activeCat.value !== 'all') params.category = activeCat.value
    if (searchQuery.value) params.q = searchQuery.value
    const data = await contentApi.articles(params) as any
    const list = Array.isArray(data) ? data : (data?.articles || data?.data || [])
    articles.value = list.map((a: any) => ({
      id: a.id, title: a.title,
      author: a.author?.name || a.author,
      authorAvatar: a.author?.avatar || a.authorAvatar,
      authorVerified: a.author?.isVerified || a.authorVerified,
      cover: a.cover || a.image,
      excerpt: a.excerpt || a.description || a.intro,
      likes: a.likes || 0, comments: a.comments || 0,
      createdAt: a.createdAt || a.created_at,
      isTop: a.isTop,
    }))
    totalCount.value = data?.total || articles.value.length
    page.value = 1
    more.value = articles.value.length >= 20
    sortArticles()
  } catch (e: any) { err.value = e.errMsg || '加载失败' }
  finally { loading.value = false }
}

function sortArticles() {
  const arr = [...articles.value]
  if (sortBy.value === 'popular') {
    arr.sort((a, b) => (b.likes || 0) - (a.likes || 0))
  } else {
    arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  articles.value = arr
}

async function loadMore() {
  if (!more.value) return
  const np = page.value + 1
  try {
    const params: Record<string, any> = { page: np, pageSize: 20 }
    if (activeCat.value !== 'all') params.category = activeCat.value
    if (searchQuery.value) params.q = searchQuery.value
    const data = await contentApi.articles(params) as any
    const nb = Array.isArray(data) ? data : (data?.articles || data?.data || [])
    articles.value.push(...nb.map((a: any) => ({
      id: a.id, title: a.title,
      author: a.author?.name || a.author,
      authorAvatar: a.author?.avatar || a.authorAvatar,
      authorVerified: a.author?.isVerified || a.authorVerified,
      cover: a.cover || a.image,
      excerpt: a.excerpt || a.description,
      likes: a.likes || 0, comments: a.comments || 0,
      createdAt: a.createdAt || a.created_at,
      isTop: a.isTop,
    })))
    page.value = np
    more.value = nb.length >= 20
    sortArticles()
  } catch { /* skip */ }
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/article/detail/index?id=${id}` })
}

onMounted(() => { fetchArticles() })
onPullDownRefresh(() => {
  fetchArticles().finally(() => setTimeout(() => uni.stopPullDownRefresh(), 500))
})
</script>

<style scoped>
.articles-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 100rpx; }

.header-sticky {
  position: sticky; top: 0; z-index: 30;
  background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx);
  border-bottom: 1px solid #E8E0D5;
}
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { flex: 1; font-size: 34rpx; font-weight: 700; color: #2C2C2C; }

.search-wrap { padding: 0 24rpx 12rpx; }
.search-box {
  display: flex; align-items: center; height: 64rpx;
  background: #F5F1EB; border-radius: 40rpx; padding: 0 20rpx;
}
.search-icon { font-size: 28rpx; margin-right: 12rpx; color: #999; }
.search-input { flex: 1; font-size: 26rpx; color: #2C2C2C; }
.search-input::placeholder { color: #999; }
.search-clear { font-size: 28rpx; color: #999; padding: 4rpx; }

.cat-scroll { padding-bottom: 12rpx; white-space: nowrap; }
.cat-row { display: flex; gap: 10rpx; padding: 0 24rpx; }
.cat-chip {
  flex-shrink: 0; padding: 8rpx 24rpx; border-radius: 32rpx;
  font-size: 24rpx; color: #666; background: #F5F1EB;
}
.cat-chip.active { background: #C41E3A; color: #fff; }

.sort-bar {
  display: flex; align-items: center; justify-content: flex-end; gap: 24rpx;
  padding: 12rpx 24rpx; border-bottom: 1px solid #F0EDE5;
}
.sort-count { font-size: 22rpx; color: #999; flex: 1; }
.sort-item { font-size: 24rpx; color: #999; }
.sort-item.active { color: #C41E3A; font-weight: 600; }

.load-area { padding: 24rpx; }
.err-area { padding: 80rpx 24rpx; }

.article-list { padding: 16rpx 24rpx; }
.article-card {
  display: flex; gap: 16rpx; padding: 20rpx;
  background: #fff; border-radius: 16rpx; margin-bottom: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}
.article-cover {
  width: 200rpx; height: 150rpx; border-radius: 12rpx; flex-shrink: 0;
}
.article-cover-plain {
  width: 200rpx; height: 150rpx; border-radius: 12rpx; flex-shrink: 0;
  background: linear-gradient(135deg, #F5F0E8, #EDE5D5);
  display: flex; align-items: center; justify-content: center;
  font-size: 48rpx;
}
.article-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.article-title-row { display: flex; align-items: flex-start; gap: 8rpx; }
.top-badge {
  font-size: 18rpx; color: #C41E3A; background: rgba(196,30,58,0.08);
  padding: 2rpx 8rpx; border-radius: 6rpx; flex-shrink: 0;
}
.article-title {
  font-size: 28rpx; font-weight: 500; color: #333; flex: 1;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; line-height: 1.4;
}
.article-excerpt {
  font-size: 22rpx; color: #888; margin-top: 6rpx;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;
  overflow: hidden; flex: 1;
}
.article-meta {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: auto; padding-top: 12rpx;
}
.meta-author { display: flex; align-items: center; gap: 8rpx; }
.author-avatar, .author-avatar-plain {
  width: 36rpx; height: 36rpx; border-radius: 50%;
}
.author-avatar-plain {
  background: #F5F1EB; display: flex; align-items: center; justify-content: center;
  font-size: 20rpx; color: #666;
}
.author-name { font-size: 22rpx; color: #666; }
.verified-v {
  font-size: 16rpx; color: #C9A96E; background: rgba(201,169,110,0.2);
  padding: 1rpx 6rpx; border-radius: 4rpx;
}
.meta-stats { display: flex; gap: 16rpx; }
.stat-item { font-size: 20rpx; color: #999; }

.more-btn { text-align: center; padding: 24rpx; font-size: 24rpx; color: #C9A96E; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 24rpx; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
