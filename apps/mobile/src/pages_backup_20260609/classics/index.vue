<template>
  <view class="classics-page">
    <!-- 顶部古典书卷风格 -->
    <view class="header-classic">
      <view class="header-top">
        <view class="header-title-row">
          <text class="header-emoji">📜</text>
          <text class="header-title">古籍典藏</text>
        </view>
        <text class="header-count" v-if="totalCount">共 {{ totalCount }} 部</text>
      </view>
      <view class="search-wrap">
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input
            v-model="q"
            class="search-input"
            placeholder="搜索古籍、作者..."
            confirm-type="search"
            @confirm="doSearch"
          />
          <text v-if="q" class="search-clear" @click="q = ''; fetchBooks()">✕</text>
        </view>
      </view>
    </view>

    <!-- 四库分类 -->
    <view class="cat-section">
      <view class="cat-grid">
        <view
          v-for="cat in mainCats"
          :key="cat.id"
          class="cat-btn"
          :class="{ active: activeCat === cat.id }"
          :style="activeCat === cat.id ? { background: cat.color } : {}"
          @click="toggleCat(cat.id)"
        >
          <text class="cat-emoji">{{ cat.icon }}</text>
          <text class="cat-name" :style="activeCat === cat.id ? { color: '#fff' } : {}">{{ cat.name }}</text>
          <text class="cat-desc" :style="activeCat === cat.id ? { color: 'rgba(255,255,255,0.7)' } : {}">{{ cat.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 子分类 -->
    <scroll-view scroll-x class="sub-scroll" :show-scrollbar="false">
      <view class="sub-row">
        <view
          v-for="c in subCats"
          :key="c.id"
          class="sub-chip"
          :class="{ active: activeSub === c.id }"
          @click="activeSub = c.id; fetchBooks()"
        >
          {{ c.name }}
        </view>
      </view>
    </scroll-view>

    <!-- 视图切换 -->
    <view class="toolbar">
      <view class="view-tog">
        <view class="tog-btn" :class="{ active: view === 'grid' }" @click="view = 'grid'">▦</view>
        <view class="tog-btn" :class="{ active: view === 'list' }" @click="view = 'list'">☰</view>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="load-area">
      <LoadingSkeleton v-for="i in 6" :key="i" type="card" />
    </view>

    <!-- Error -->
    <view v-else-if="err" class="err-area">
      <EmptyState icon="📡" title="加载失败" :description="err" action-text="重试" @action="fetchBooks" />
    </view>

    <!-- 空 -->
    <view v-else-if="books.length === 0" class="empty">
      <text class="empty-icon">📖</text>
      <text class="empty-text">暂无相关古籍</text>
    </view>

    <!-- Grid -->
    <view v-else-if="view === 'grid'" class="grid-books">
      <view v-for="b in books" :key="b.id" class="g-card" @click="goReader(b.id)">
        <view class="g-cover">
          <view class="g-spine" />
          <text v-if="b.category" class="g-badge">{{ b.category }}</text>
          <view class="g-title-wrap">
            <text class="g-title">{{ b.title }}</text>
          </view>
          <text class="g-author">{{ b.author || '佚名' }}</text>
        </view>
        <view class="g-info">
          <text class="g-name">{{ b.title }}</text>
          <text class="g-meta">{{ b.chapterCount || 0 }}篇 · {{ fmtN(b.viewCount || 0) }}读</text>
        </view>
      </view>
    </view>

    <!-- List -->
    <view v-else class="list-books">
      <view v-for="b in books" :key="b.id" class="l-card" @click="goReader(b.id)">
        <view class="l-cover">
          <view class="l-spine" />
          <text class="l-ctitle">{{ b.title }}</text>
        </view>
        <view class="l-info">
          <view class="l-row">
            <text class="l-title">{{ b.title }}</text>
            <text v-if="b.category" class="l-cat">{{ b.category }}</text>
          </view>
          <text class="l-author">{{ b.author || '佚名' }} · {{ b.chapterCount || 0 }}篇</text>
          <text v-if="b.intro" class="l-intro">{{ b.intro }}</text>
          <text class="l-meta">👁 {{ fmtN(b.viewCount || 0) }}</text>
        </view>
      </view>
    </view>

    <view v-if="more && !loading" class="more-btn" @click="loadMore">
      <text>加载更多</text>
    </view>
    <view v-if="loadingMore" class="more-btn"><text>加载中...</text></view>
    <view class="end-line"><text>— 共 {{ totalCount }} 部古籍 —</text></view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { classicApi } from '../../api'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

const mainCats = [
  { id: '经', name: '经部', icon: '📜', desc: '儒家经典', color: 'linear-gradient(135deg, #b45309, #d97706)' },
  { id: '史', name: '史部', icon: '📚', desc: '历史典籍', color: 'linear-gradient(135deg, #2563eb, #4f46e5)' },
  { id: '子', name: '子部', icon: '🔮', desc: '诸子百家', color: 'linear-gradient(135deg, #7c3aed, #8b5cf6)' },
  { id: '集', name: '集部', icon: '✒', desc: '文学作品', color: 'linear-gradient(135deg, #059669, #14b8a6)' },
]

const subCats = [
  { id: 'all', name: '全部' },
  { id: '经', name: '经部' },
  { id: '史', name: '史部' },
  { id: '子', name: '子部' },
  { id: '集', name: '集部' },
  { id: '释', name: '佛学' },
  { id: '道', name: '道家' },
]

interface Book {
  id: string; title: string; author?: string; dynasty?: string
  category?: string; cover?: string; intro?: string
  chapterCount?: number; viewCount?: number
}

const q = ref('')
const activeCat = ref<string | null>(null)
const activeSub = ref('all')
const view = ref<'grid' | 'list'>('grid')

const loading = ref(true)
const loadingMore = ref(false)
const err = ref<string | null>(null)
const books = ref<Book[]>([])
const totalCount = ref(0)
const page = ref(1)
const more = ref(false)

function fmtN(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function toggleCat(id: string) {
  activeCat.value = activeCat.value === id ? null : id
  activeSub.value = 'all'
  fetchBooks()
}

function doSearch() { page.value = 1; fetchBooks() }

async function fetchBooks() {
  loading.value = true; err.value = null
  try {
    const params: Record<string, any> = { page: 1, pageSize: 21 }
    if (activeCat.value) params.category = activeCat.value
    if (activeSub.value !== 'all') params.category = activeSub.value
    if (q.value) params.keyword = q.value
    const data = await classicApi.books(params) as any
    if (Array.isArray(data)) {
      books.value = data; totalCount.value = data.length
    } else if (data?.books) {
      books.value = data.books; totalCount.value = data.total || data.books.length
    } else {
      books.value = data?.data || []
      totalCount.value = data?.total || 0
    }
    page.value = 1
    more.value = books.value.length >= 21
  } catch (e: any) { err.value = e.errMsg || '加载失败' }
  finally { loading.value = false }
}

async function loadMore() {
  if (loadingMore.value || !more.value) return
  loadingMore.value = true
  try {
    const np = page.value + 1
    const params: Record<string, any> = { page: np, pageSize: 21 }
    if (activeCat.value) params.category = activeCat.value
    if (activeSub.value !== 'all') params.category = activeSub.value
    if (q.value) params.keyword = q.value
    const data = await classicApi.books(params) as any
    const nb = Array.isArray(data) ? data : (data?.books || data?.data || [])
    books.value.push(...nb)
    page.value = np
    more.value = nb.length >= 21
  } catch { /* skip */ }
  finally { loadingMore.value = false }
}

function goReader(id: string) {
  uni.navigateTo({ url: `/pages/classics/id-detail/index?id=${id}` })
}

onMounted(() => { fetchBooks() })
onPullDownRefresh(() => {
  fetchBooks().finally(() => setTimeout(() => uni.stopPullDownRefresh(), 500))
})
</script>

<style scoped>
.classics-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF8F0, #FAF8F5);
  padding-bottom: 120rpx;
}
.header-classic {
  background: linear-gradient(135deg, #92400e, #b45309, #92400e);
  padding-top: 24rpx;
}
.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 88rpx;
}
.header-title-row { display: flex; align-items: center; gap: 12rpx; }
.header-emoji { font-size: 36rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #fff; letter-spacing: 4rpx; }
.header-count { font-size: 22rpx; color: rgba(255,255,255,0.7); }
.search-wrap { padding: 12rpx 24rpx 20rpx; }
.search-box {
  display: flex; align-items: center;
  background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15);
  border-radius: 16rpx; padding: 0 16rpx; height: 64rpx;
}
.search-icon { font-size: 28rpx; margin-right: 12rpx; }
.search-input { flex: 1; font-size: 26rpx; color: #fff; }
.search-input::placeholder { color: rgba(255,255,255,0.4); }
.search-clear { font-size: 28rpx; color: rgba(255,255,255,0.5); padding: 8rpx; }

.cat-section { padding: 20rpx 24rpx 16rpx; }
.cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.cat-btn {
  display: flex; flex-direction: column; align-items: center;
  padding: 20rpx 8rpx; border-radius: 20rpx; background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.cat-emoji { font-size: 40rpx; margin-bottom: 6rpx; }
.cat-name { font-size: 26rpx; font-weight: 600; color: #333; }
.cat-desc { font-size: 20rpx; color: #999; margin-top: 2rpx; }

.sub-scroll { padding: 8rpx 0; white-space: nowrap; }
.sub-row { display: flex; gap: 12rpx; padding: 0 24rpx; }
.sub-chip {
  flex-shrink: 0; padding: 8rpx 24rpx; border-radius: 32rpx;
  font-size: 24rpx; color: #666; background: #fff; border: 1px solid #E8E0D5;
}
.sub-chip.active { background: #92400e; color: #fff; border-color: #92400e; }

.toolbar {
  display: flex; justify-content: flex-end; align-items: center;
  padding: 12rpx 24rpx; border-bottom: 1px solid #F0EDE5;
}
.view-tog { display: flex; gap: 4rpx; }
.tog-btn { padding: 10rpx 16rpx; border-radius: 12rpx; font-size: 32rpx; color: #999; }
.tog-btn.active { background: #f0ece4; color: #333; }

.load-area { padding: 24rpx; }
.err-area { padding: 80rpx 24rpx; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 24rpx; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }

/* Grid */
.grid-books { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20rpx; padding: 20rpx 24rpx; }
.g-card { display: flex; flex-direction: column; align-items: center; }
.g-cover {
  width: 100%; aspect-ratio: 3/4; border-radius: 12rpx; overflow: hidden;
  position: relative;
  background: linear-gradient(180deg, #fef3c7, #fde68a, #fef3c7);
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.08);
}
.g-spine {
  position: absolute; left: 0; top: 0; bottom: 0; width: 8rpx;
  background: linear-gradient(90deg, rgba(180,83,9,0.4), transparent);
}
.g-badge {
  position: absolute; top: 8rpx; left: 16rpx;
  font-size: 16rpx; color: #fff; background: rgba(180,83,9,0.7);
  padding: 2rpx 8rpx; border-radius: 6rpx;
}
.g-title-wrap {
  position: absolute; inset: 0; display: flex;
  align-items: center; justify-content: center; padding: 28rpx 16rpx;
}
.g-title {
  font-size: 32rpx; font-weight: 700; color: #78350f; text-align: center;
  writing-mode: vertical-rl; letter-spacing: 6rpx; line-height: 1.8;
}
.g-author {
  position: absolute; bottom: 12rpx; left: 16rpx; right: 8rpx;
  text-align: center; font-size: 18rpx; color: rgba(120,53,15,0.6);
}
.g-info { text-align: center; margin-top: 10rpx; }
.g-name { font-size: 24rpx; font-weight: 500; color: #333; }
.g-meta { font-size: 20rpx; color: #999; margin-top: 2rpx; }

/* List */
.list-books { padding: 16rpx 24rpx; }
.l-card {
  display: flex; gap: 16rpx; background: #fff; border-radius: 16rpx;
  padding: 20rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.l-cover {
  width: 100rpx; height: 140rpx; border-radius: 8rpx; flex-shrink: 0;
  background: linear-gradient(180deg, #fef3c7, #fde68a);
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.l-spine {
  position: absolute; left: 0; top: 0; bottom: 0; width: 4rpx;
  background: rgba(180,83,9,0.4);
}
.l-ctitle {
  font-size: 26rpx; font-weight: 700; color: #78350f;
  writing-mode: vertical-rl; letter-spacing: 4rpx;
}
.l-info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.l-row { display: flex; align-items: center; gap: 10rpx; margin-bottom: 6rpx; }
.l-title { font-size: 28rpx; font-weight: 600; color: #333; }
.l-cat {
  font-size: 20rpx; color: #fff; background: #92400e;
  padding: 2rpx 10rpx; border-radius: 6rpx;
}
.l-author { font-size: 22rpx; color: #888; margin-bottom: 4rpx; }
.l-intro { font-size: 22rpx; color: #aaa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.l-meta { margin-top: 8rpx; font-size: 20rpx; color: #999; }

.more-btn { text-align: center; padding: 24rpx; font-size: 24rpx; color: #C9A96E; }
.end-line { text-align: center; padding: 32rpx; font-size: 22rpx; color: #CCC; }
</style>
