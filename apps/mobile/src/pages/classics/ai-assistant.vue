<template>
  <view class="page">
    <!-- 顶部 - 古典书卷风格 -->
    <view class="classic-header">
      <view class="header-row">
        <text
          class="nav-back"
          @click="goBack"
        >
          ←
        </text>
        <view class="header-brand">
          <text class="header-icon">
            📚
          </text>
          <text class="header-brand-text">
            古籍典藏
          </text>
        </view>
        <text
          class="header-search-icon"
          @click="goSearch"
        >
          🔍
        </text>
      </view>
      <!-- 搜索框 -->
      <view class="header-search-bar">
        <input
          v-model="searchQuery"
          class="header-search-input"
          placeholder="搜索古籍、作者"
          @confirm="handleSearch"
        >
      </view>
    </view>

    <!-- 四库分类 -->
    <view class="section-padding">
      <view class="category-grid">
        <view
          v-for="cat in mainCategories"
          :key="cat.id"
          class="category-item"
          :class="{ 'category-active': activeMainCat === cat.id }"
          :style="activeMainCat === cat.id ? { background: cat.gradient } : {}"
          @click="toggleMainCat(cat.id)"
        >
          <text class="category-emoji">
            {{ cat.icon }}
          </text>
          <text class="category-name">
            {{ cat.name }}
          </text>
        </view>
      </view>
    </view>

    <!-- 精选书单 -->
    <view class="section-padding">
      <view class="section-header">
        <view class="section-header-left">
          <text class="section-icon">
            📑
          </text>
          <text class="section-title">
            精选书单
          </text>
        </view>
        <text
          class="section-more"
          @click="goBookLists"
        >
          更多 ›
        </text>
      </view>
      <scroll-view
        scroll-x
        class="booklist-scroll"
        show-scrollbar="false"
      >
        <view class="booklist-inner">
          <view
            v-for="list in bookLists"
            :key="list.id"
            class="booklist-card"
            @click="goBookList(list.id)"
          >
            <text class="booklist-icon">
              {{ list.icon }}
            </text>
            <view>
              <text class="booklist-title">
                {{ list.title }}
              </text>
              <text class="booklist-count">
                {{ list.count }}本
              </text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 子分类 + 筛选 -->
    <view class="sticky-bar">
      <scroll-view
        scroll-x
        class="subcat-scroll"
        show-scrollbar="false"
      >
        <view class="subcat-inner">
          <text
            v-for="cat in subCategories"
            :key="cat.id"
            class="subcat-tab"
            :class="{ 'subcat-active': activeSubCat === cat.id }"
            @click="activeSubCat = cat.id"
          >
            {{ cat.name }}
          </text>
        </view>
      </scroll-view>
      <view class="filter-row">
        <view class="filter-left">
          <text
            class="filter-btn"
            :class="{ 'filter-on': onlyFree }"
            @click="onlyFree = !onlyFree"
          >
            免费
          </text>
          <text
            class="filter-btn"
            :class="{ 'filter-on': onlyAI }"
            @click="onlyAI = !onlyAI"
          >
            ✨ AI智读
          </text>
        </view>
        <view class="filter-right">
          <text
            class="view-btn"
            :class="{ 'view-active': viewMode === 'grid' }"
            @click="viewMode = 'grid'"
          >
            ▦
          </text>
          <text
            class="view-btn"
            :class="{ 'view-active': viewMode === 'list' }"
            @click="viewMode = 'list'"
          >
            ☰
          </text>
        </view>
      </view>
    </view>

    <!-- 古籍列表 -->
    <view class="classics-section">
      <!-- 加载中 -->
      <view
        v-if="loading"
        class="loading-state"
      >
        <view class="loading-spinner" />
        <text class="loading-text">
          加载中...
        </text>
      </view>
      <!-- 书架网格 -->
      <template v-else-if="viewMode === 'grid'">
        <view
          v-if="filteredClassics.length === 0"
          class="empty-state"
        >
          <text class="empty-icon">
            📖
          </text>
          <text class="empty-text">
            暂无相关古籍
          </text>
        </view>
        <view
          v-else
          class="grid-view"
        >
          <view
            v-for="book in filteredClassics"
            :key="book.id"
            class="book-card"
            @click="goReader(book.id)"
          >
            <view
              class="book-cover"
              :class="book.cover === 'ancient' ? 'cover-ancient' : 'cover-classic'"
            >
              <view class="book-spine" />
              <view class="book-tags">
                <text
                  v-if="book.hasAI"
                  class="tag-ai"
                >
                  ✨ AI
                </text>
                <text
                  v-if="book.isFree"
                  class="tag-free"
                >
                  免费
                </text>
              </view>
              <text class="book-dynasty-tag">
                {{ book.dynasty }}
              </text>
              <text class="book-title-vertical">
                {{ book.title }}
              </text>
              <text class="book-author-bottom">
                {{ book.author }}
              </text>
            </view>
            <view class="book-meta">
              <text class="book-name">
                {{ book.title }}
              </text>
              <text class="book-reads">
                {{ (book.reads / 10000).toFixed(1) }}万人读
              </text>
            </view>
          </view>
        </view>
      </template>

      <!-- 列表视图 -->
      <template v-else-if="!loading">
        <view
          v-if="filteredClassics.length === 0"
          class="empty-state"
        >
          <text class="empty-icon">
            📖
          </text>
          <text class="empty-text">
            暂无相关古籍
          </text>
        </view>
        <view
          v-else
          class="list-view"
        >
          <view
            v-for="book in filteredClassics"
            :key="book.id"
            class="book-list-item"
            @click="goReader(book.id)"
          >
            <view
              class="list-cover"
              :class="book.cover === 'ancient' ? 'cover-ancient' : 'cover-classic'"
            >
              <view class="list-spine" />
              <text class="list-title-vertical">
                {{ book.title }}
              </text>
              <text
                v-if="book.hasAI"
                class="list-ai-tag"
              >
                ✨
              </text>
            </view>
            <view class="list-info">
              <view class="list-title-row">
                <text class="list-title">
                  {{ book.title }}
                </text>
                <text class="list-dynasty">
                  {{ book.dynasty }}
                </text>
                <text
                  v-if="book.isFree"
                  class="tag-free-sm"
                >
                  免费
                </text>
              </view>
              <text class="list-author">
                {{ book.author }} · {{ book.chapters }}篇
              </text>
              <text class="list-desc">
                {{ book.description }}
              </text>
              <view class="list-stats">
                <text>⭐ {{ book.rating }}</text>
                <text>👁 {{ (book.reads / 10000).toFixed(1) }}万</text>
              </view>
            </view>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { classicApi } from '../../api'

// 四库分类
const mainCategories = [
  { id: 'jing', name: '经部', icon: '📜', gradient: 'linear-gradient(135deg, #f59e0b, #ea580c)' },
  { id: 'shi', name: '史部', icon: '📚', gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)' },
  { id: 'zi', name: '子部', icon: '🔮', gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)' },
  { id: 'ji', name: '集部', icon: '✒️', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
]

const subCategories = [
  { id: 'all', name: '全部' }, { id: 'yijing', name: '易学' }, { id: 'mingli', name: '命理' },
  { id: 'fengshui', name: '风水' }, { id: 'yixue', name: '医学' }, { id: 'rujia', name: '儒家' },
  { id: 'daojia', name: '道家' }, { id: 'foxue', name: '佛学' },
]

const bookLists = [
  { id: 1, title: '八字入门必读', count: 5, icon: '🌟' },
  { id: 2, title: '风水经典', count: 8, icon: '🏠' },
  { id: 3, title: '国学基础', count: 10, icon: '📖' },
]

interface ClassicBook {
  id: number; title: string; author: string; dynasty: string
  category: string; subCategory: string; chapters: number
  description: string; reads: number; rating: number
  hasAI: boolean; isFree: boolean; cover: string
}

const fallbackClassics: ClassicBook[] = [
  { id: 1, title: '周易', author: '伏羲/周文王', dynasty: '周', category: 'jing', subCategory: 'yijing', chapters: 64, description: '群经之首，大道之源', reads: 128600, rating: 4.9, hasAI: true, isFree: true, cover: 'ancient' },
  { id: 2, title: '道德经', author: '老子', dynasty: '春秋', category: 'zi', subCategory: 'daojia', chapters: 81, description: '道法自然，无为而治', reads: 145600, rating: 4.9, hasAI: true, isFree: true, cover: 'ancient' },
  { id: 3, title: '论语', author: '孔子门人', dynasty: '春秋', category: 'jing', subCategory: 'rujia', chapters: 20, description: '仁义礼智，修身齐家', reads: 156800, rating: 4.9, hasAI: true, isFree: true, cover: 'ancient' },
  { id: 4, title: '滴天髓', author: '刘基', dynasty: '明', category: 'zi', subCategory: 'mingli', chapters: 52, description: '八字命理经典，字字珠玑', reads: 86200, rating: 4.8, hasAI: true, isFree: false, cover: 'classic' },
  { id: 5, title: '子平真诠', author: '沈孝瞻', dynasty: '清', category: 'zi', subCategory: 'mingli', chapters: 40, description: '格局用神，系统阐述', reads: 68500, rating: 4.9, hasAI: true, isFree: false, cover: 'classic' },
  { id: 6, title: '紫微斗数全书', author: '陈希夷', dynasty: '宋', category: 'zi', subCategory: 'mingli', chapters: 36, description: '紫微斗数权威典籍', reads: 52800, rating: 4.8, hasAI: true, isFree: false, cover: 'classic' },
  { id: 7, title: '葬书', author: '郭璞', dynasty: '晋', category: 'zi', subCategory: 'fengshui', chapters: 3, description: '风水学开山之作', reads: 38600, rating: 4.7, hasAI: true, isFree: true, cover: 'ancient' },
  { id: 8, title: '黄帝内经', author: '佚名', dynasty: '战国', category: 'zi', subCategory: 'yixue', chapters: 162, description: '中医学奠基之作', reads: 98500, rating: 4.9, hasAI: true, isFree: true, cover: 'ancient' },
  { id: 9, title: '穷通宝鉴', author: '余春台', dynasty: '清', category: 'zi', subCategory: 'mingli', chapters: 12, description: '调候用神专著', reads: 42600, rating: 4.7, hasAI: true, isFree: false, cover: 'classic' },
  { id: 10, title: '三命通会', author: '万民英', dynasty: '明', category: 'zi', subCategory: 'mingli', chapters: 12, description: '命理学集大成', reads: 56800, rating: 4.8, hasAI: true, isFree: false, cover: 'classic' },
]

const classicsData = ref<ClassicBook[]>([])
const loading = ref(true)
const loadError = ref('')

onMounted(async () => {
  try {
    const res = await classicApi.books()
    classicsData.value = res?.list || res || []
  } catch (e: any) {
    loadError.value = e?.message || '加载失败'
    classicsData.value = fallbackClassics
  } finally {
    loading.value = false
  }
})

const searchQuery = ref('')
const activeMainCat = ref<string | null>(null)
const activeSubCat = ref('all')
const viewMode = ref<'grid' | 'list'>('grid')
const onlyFree = ref(false)
const onlyAI = ref(false)

const filteredClassics = computed(() => {
  return classicsData.value.filter(book => {
    const matchMainCat = !activeMainCat.value || book.category === activeMainCat.value
    const matchSubCat = activeSubCat.value === 'all' || book.subCategory === activeSubCat.value
    const matchSearch = !searchQuery.value || book.title.includes(searchQuery.value) || book.author.includes(searchQuery.value)
    const matchFree = !onlyFree.value || book.isFree
    const matchAI = !onlyAI.value || book.hasAI
    return matchMainCat && matchSubCat && matchSearch && matchFree && matchAI
  })
})

function toggleMainCat(id: string) {
  activeMainCat.value = activeMainCat.value === id ? null : id
}

function handleSearch() { /* 搜索已实时绑定 */ }
function goBack() { uni.navigateBack() }
function goSearch() { uni.navigateTo({ url: '/pages/classics/search' }) }
function goReader(id: number) { uni.navigateTo({ url: `/pages/reader/reader?id=${id}` }) }
function goBookLists() { uni.navigateTo({ url: '/pages/classics/classics' }) }
function goBookList(id: number) { uni.navigateTo({ url: `/pages/classics/classic-detail?id=${id}` }) }
</script>

<style scoped>
.page { background: linear-gradient(180deg, #fdf6e3 0%, #F5F0E8 100%); min-height: 100vh; padding-bottom: 30rpx; }

/* 顶部 */
.classic-header { background: linear-gradient(135deg, #92400e, #78350f); color: #fff; padding: 20rpx 24rpx 16rpx; }
.header-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.nav-back { font-size: 36rpx; color: #fcd34d; padding: 4rpx; }
.header-brand { display: flex; align-items: center; gap: 12rpx; flex: 1; }
.header-icon { font-size: 36rpx; color: #fcd34d; }
.header-brand-text { font-size: 34rpx; font-weight: 600; font-family: serif; }
.header-search-icon { font-size: 36rpx; color: #fcd34d; padding: 4rpx; }
.header-search-bar { }
.header-search-input { width: 100%; height: 64rpx; padding: 0 20rpx; background: rgba(120,53,15,0.5); border: 1rpx solid rgba(217,119,6,0.5); border-radius: 12rpx; font-size: 24rpx; color: #fef3c7; box-sizing: border-box; }
.header-search-input::placeholder { color: rgba(252,211,77,0.6); }

/* 通用 */
.section-padding { padding: 16rpx 24rpx; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.section-header-left { display: flex; align-items: center; gap: 12rpx; }
.section-icon { font-size: 28rpx; color: #b45309; }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.section-more { font-size: 24rpx; color: #666; }

/* 四库分类 */
.category-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.category-item { padding: 20rpx 12rpx; border-radius: 16rpx; text-align: center; background: #fff; transition: all 0.2s; }
.category-active { color: #fff; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.15); }
.category-emoji { font-size: 48rpx; display: block; margin-bottom: 8rpx; }
.category-name { font-size: 24rpx; font-weight: 500; }

/* 书单 */
.booklist-scroll { white-space: nowrap; margin: 0 -24rpx; padding: 0 24rpx; }
.booklist-inner { display: inline-flex; gap: 16rpx; }
.booklist-card { display: inline-flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; background: #fff; border-radius: 12rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
.booklist-icon { font-size: 48rpx; }
.booklist-title { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.booklist-count { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }

/* 粘性栏 */
.sticky-bar { position: sticky; top: 0; z-index: 20; background: rgba(245,240,232,0.95); border-bottom: 1rpx solid #E5E1DB; }
.subcat-scroll { white-space: nowrap; padding: 12rpx 24rpx; }
.subcat-inner { display: inline-flex; gap: 12rpx; }
.subcat-tab { display: inline-block; padding: 8rpx 24rpx; border-radius: 28rpx; font-size: 24rpx; background: #F5F0E8; color: #666; }
.subcat-active { background: #C41E3A; color: #fff; }
.filter-row { display: flex; align-items: center; justify-content: space-between; padding: 12rpx 24rpx; border-top: 1rpx solid #E5E1DB; }
.filter-left { display: flex; gap: 16rpx; }
.filter-btn { font-size: 24rpx; color: #999; }
.filter-on { color: #C41E3A; font-weight: 500; }
.filter-right { display: flex; gap: 8rpx; }
.view-btn { font-size: 28rpx; padding: 8rpx; border-radius: 8rpx; color: #999; }
.view-active { background: #F5F0E8; color: #C41E3A; }

/* 古籍列表区 */
.classics-section { padding: 24rpx; }

/* 加载状态 */
.loading-state { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.loading-spinner { width: 64rpx; height: 64rpx; border: 6rpx solid #E5E1DB; border-top-color: #C41E3A; border-radius: 50%; animation: lspin 0.8s linear infinite; margin-bottom: 24rpx; }
@keyframes lspin { to { transform: rotate(360deg); } }
.loading-text { font-size: 28rpx; color: #999; }

/* 空状态 */
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.empty-icon { font-size: 128rpx; color: rgba(0,0,0,0.1); margin-bottom: 24rpx; }
.empty-text { font-size: 28rpx; color: #999; }

/* 网格视图 */
.grid-view { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.book-card { }
.book-cover { aspect-ratio: 3/4; border-radius: 12rpx; overflow: hidden; position: relative; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.1); margin-bottom: 12rpx; }
.cover-ancient { background: linear-gradient(180deg, #fef3c7, #fde68a); }
.cover-classic { background: linear-gradient(180deg, #e7e5e4, #d6d3d1); }
.book-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 12rpx; background: linear-gradient(90deg, rgba(180,83,9,0.3), transparent); }
.book-tags { position: absolute; top: 12rpx; right: 12rpx; display: flex; flex-direction: column; gap: 8rpx; }
.tag-ai { font-size: 16rpx; padding: 4rpx 8rpx; background: rgba(168,85,247,0.9); color: #fff; border-radius: 4rpx; }
.tag-free { font-size: 16rpx; padding: 4rpx 8rpx; background: rgba(34,197,94,0.9); color: #fff; border-radius: 4rpx; }
.tag-free-sm { font-size: 18rpx; padding: 2rpx 8rpx; background: rgba(34,197,94,0.9); color: #fff; border-radius: 4rpx; }
.book-dynasty-tag { position: absolute; top: 12rpx; left: 12rpx; font-size: 16rpx; padding: 4rpx 10rpx; background: rgba(180,83,9,0.8); color: #fff; border-radius: 4rpx; }
.book-title-vertical { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 36rpx; font-weight: bold; color: #78350f; font-family: serif; writing-mode: vertical-rl; letter-spacing: 8rpx; }
.book-author-bottom { position: absolute; bottom: 12rpx; left: 0; right: 0; text-align: center; font-size: 20rpx; color: rgba(120,53,15,0.8); }
.book-meta { text-align: center; }
.book-name { display: block; font-size: 24rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.book-reads { display: block; font-size: 20rpx; color: #999; margin-top: 4rpx; }

/* 列表视图 */
.list-view { display: flex; flex-direction: column; gap: 16rpx; }
.book-list-item { display: flex; gap: 16rpx; padding: 20rpx; background: #fff; border-radius: 12rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
.list-cover { width: 120rpx; height: 168rpx; border-radius: 8rpx; flex-shrink: 0; position: relative; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1); }
.list-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 8rpx; background: linear-gradient(90deg, rgba(180,83,9,0.3), transparent); }
.list-title-vertical { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: bold; color: #78350f; font-family: serif; writing-mode: vertical-rl; letter-spacing: 6rpx; }
.list-ai-tag { position: absolute; top: 8rpx; right: 8rpx; font-size: 20rpx; }
.list-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; }
.list-title-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.list-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.list-dynasty { font-size: 20rpx; padding: 2rpx 10rpx; background: #F5F0E8; border-radius: 4rpx; color: #666; }
.list-author { display: block; font-size: 22rpx; color: #666; margin-bottom: 8rpx; }
.list-desc { display: block; font-size: 22rpx; color: #999; margin-bottom: 12rpx; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.list-stats { display: flex; gap: 20rpx; font-size: 22rpx; color: #999; }
</style>
