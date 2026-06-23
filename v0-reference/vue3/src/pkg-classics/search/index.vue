<template>
  <view class="cs-page">
    <!-- 搜索头部 - 毛玻璃 -->
    <view class="cs-header">
      <view class="cs-bar">
        <view class="cs-back" @tap="goBack">
          <app-icon name="arrow-left" :size="44" color="#2c2c2c" />
        </view>
        <view class="cs-input-wrap">
          <app-icon class="cs-input-search" name="search" :size="36" color="#999999" />
          <input
            class="cs-input"
            v-model="searchValue"
            :focus="autoFocus"
            placeholder="搜书名、作者、朝代或门类"
            placeholder-class="cs-input-ph"
            confirm-type="search"
            @input="onInput"
            @confirm="() => handleSearch()"
          />
          <view v-if="searchValue" class="cs-clear" @tap="handleClear">
            <app-icon name="x" :size="32" color="#999999" />
          </view>
        </view>
        <view class="cs-ai" @tap="goAi">
          <app-icon name="sparkles" :size="32" color="#ffffff" />
        </view>
      </view>
    </view>

    <view class="cs-main">
      <!-- 初始态 -->
      <view v-if="searchState === 'initial'" class="cs-initial">
        <!-- 搜索历史 -->
        <view v-if="searchHistory.length > 0" class="cs-section">
          <view class="cs-sec-head">
            <view class="cs-sec-title-wrap">
              <app-icon name="clock" :size="32" color="#999999" />
              <text class="cs-sec-title">搜索历史</text>
            </view>
            <text class="cs-sec-action" @tap="searchHistory = []">清空</text>
          </view>
          <view class="cs-tags">
            <view
              v-for="(kw, i) in searchHistory"
              :key="'h' + i"
              class="cs-tag"
              @tap="handleSearch(kw)"
            >{{ kw }}</view>
          </view>
        </view>

        <!-- 热门搜索 -->
        <view class="cs-section">
          <view class="cs-sec-title-wrap cs-mb">
            <app-icon name="trending-up" :size="32" color="#c41e3a" />
            <text class="cs-sec-title">热门搜索</text>
          </view>
          <view class="cs-tags">
            <view
              v-for="(item, i) in hotSearchData"
              :key="'hot' + i"
              :class="['cs-tag', item.isHot ? 'cs-tag-hot' : '']"
              @tap="handleSearch(item.keyword)"
            >
              {{ item.keyword }}
              <text v-if="item.isHot" class="cs-hot-badge">HOT</text>
            </view>
          </view>
        </view>

        <!-- 为你推荐 -->
        <view class="cs-section">
          <view class="cs-sec-head">
            <text class="cs-sec-title">为你推荐</text>
            <view class="cs-more" @tap="goHome">
              <text class="cs-sec-action">更多</text>
              <app-icon name="chevron-right" :size="32" color="#999999" />
            </view>
          </view>
          <view class="cs-result-list">
            <view v-for="book in recommendBooks" :key="book.id" class="cs-result-row" @tap="goDetail(book.id)">
              <flat-cover :title="book.title.slice(0, 4)" :label="book.dynasty" :cover-color="book.color" title-size="22rpx" class="cs-row-cover" />
              <view class="cs-row-info">
                <view class="cs-row-top">
                  <view class="cs-row-title-line">
                    <text class="cs-row-title">{{ book.title }}</text>
                    <text v-if="book.isFree" class="cs-free">免费</text>
                  </view>
                  <text class="cs-row-desc">{{ book.description }}</text>
                </view>
                <view class="cs-row-meta">
                  <text>{{ book.author }} · {{ book.dynasty }}</text>
                  <view class="cs-row-rating">
                    <app-icon name="star" :size="22" color="#fbbf24" fill="#fbbf24" />
                    <text>{{ book.rating }}</text>
                  </view>
                  <text>{{ fmtReads(book.reads) }}人读</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 搜索建议 -->
      <view v-else-if="searchState === 'suggesting' && suggestions.length > 0" class="cs-suggest">
        <view
          v-for="(s, i) in suggestions"
          :key="'s' + i"
          :class="['cs-suggest-item', i > 0 ? 'cs-suggest-border' : '']"
          @tap="handleSearch(s.text)"
        >
          <app-icon name="search" :size="36" color="#999999" />
          <view class="cs-suggest-text">
            <template v-for="(part, pi) in s.text.split(searchValue)" :key="pi">
              <text>{{ part }}</text>
              <text v-if="pi < s.text.split(searchValue).length - 1" class="cs-hl">{{ searchValue }}</text>
            </template>
          </view>
          <app-icon name="chevron-right" :size="32" color="#cccccc" />
        </view>
      </view>

      <!-- 搜索中 -->
      <view v-else-if="isSearching" class="cs-loading">
        <view class="cs-spinner" />
      </view>

      <!-- 结果 -->
      <view v-else-if="searchState === 'results'" class="cs-results">
        <text class="cs-result-count">共找到 <text class="cs-count-num">{{ results.length }}</text> 部古籍</text>
        <view class="cs-result-list">
          <view v-for="book in results" :key="book.id" class="cs-result-row" @tap="goDetail(book.id)">
            <flat-cover :title="book.title.slice(0, 4)" :label="book.dynasty" :cover-color="book.color" title-size="22rpx" class="cs-row-cover" />
            <view class="cs-row-info">
              <view class="cs-row-top">
                <view class="cs-row-title-line">
                  <text class="cs-row-title">{{ book.title }}</text>
                  <text v-if="book.isFree" class="cs-free">免费</text>
                </view>
                <text class="cs-row-desc">{{ book.description }}</text>
              </view>
              <view class="cs-row-meta">
                <text>{{ book.author }} · {{ book.dynasty }}</text>
                <view class="cs-row-rating">
                  <app-icon name="star" :size="22" color="#fbbf24" fill="#fbbf24" />
                  <text>{{ book.rating }}</text>
                </view>
                <text>{{ fmtReads(book.reads) }}人读</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空态 -->
      <view v-else-if="searchState === 'empty'" class="cs-empty">
        <view class="cs-empty-icon">
          <app-icon name="search" :size="56" color="#999999" />
        </view>
        <text class="cs-empty-title">未找到相关古籍</text>
        <text class="cs-empty-desc">换个关键词试试，或让 AI 助手帮你找</text>
        <view class="cs-empty-btn" @tap="goAi">
          <app-icon name="sparkles" :size="32" color="#ffffff" />
          <text>询问 AI 助手</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FlatCover from '@/components/classics/flat-cover.vue'
import type { CoverColor } from '@/lib/classics-cover'

interface SearchResult {
  id: string
  title: string
  author: string
  dynasty: string
  description: string
  reads: number
  rating: number
  isFree: boolean
  color: CoverColor
}

const hotSearchData = [
  { keyword: '周易', isHot: true },
  { keyword: '道德经', isHot: true },
  { keyword: '滴天髓', isHot: false },
  { keyword: '子平真诠', isHot: false },
  { keyword: '黄帝内经', isHot: true },
  { keyword: '伤寒论', isHot: false },
  { keyword: '论语', isHot: true },
  { keyword: '庄子', isHot: false },
]

const searchResultsData: SearchResult[] = [
  { id: '1', title: '周易', author: '伏羲', dynasty: '周', description: '群经之首，大道之源', reads: 128600, rating: 4.9, isFree: true, color: 'cream' },
  { id: '2', title: '周易正义', author: '孔颖达', dynasty: '唐', description: '疏解周易，阐明义理', reads: 45600, rating: 4.8, isFree: false, color: 'brown' },
  { id: '3', title: '周易集解', author: '李鼎祚', dynasty: '唐', description: '汇集汉魏诸家易说', reads: 32100, rating: 4.7, isFree: false, color: 'blue' },
  { id: '4', title: '周易本义', author: '朱熹', dynasty: '宋', description: '理学大师注解周易', reads: 58900, rating: 4.9, isFree: true, color: 'green' },
  { id: '5', title: '周易参同契', author: '魏伯阳', dynasty: '汉', description: '丹道修炼之祖书', reads: 28700, rating: 4.6, isFree: false, color: 'red' },
]

const searchSuggestionsData = [
  { text: '周易' }, { text: '周易正义' }, { text: '周易本义' }, { text: '周易集解' }, { text: '周易参同契' },
]

type SearchState = 'initial' | 'suggesting' | 'results' | 'empty'

const searchValue = ref('')
const searchState = ref<SearchState>('initial')
const searchHistory = ref<string[]>(['周易', '道德经', '黄帝内经', '论语', '孙子兵法'])
const suggestions = ref<typeof searchSuggestionsData>([])
const results = ref<SearchResult[]>([])
const isSearching = ref(false)
const autoFocus = ref(true)

const recommendBooks = searchResultsData.slice(0, 3)

function fmtReads(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : `${n}`
}

function onInput(e: any) {
  const value = e.detail.value
  searchValue.value = value
  if (value.trim()) {
    suggestions.value = searchSuggestionsData.filter((s) => s.text.includes(value))
    searchState.value = 'suggesting'
  } else {
    suggestions.value = []
    searchState.value = 'initial'
  }
}

function handleSearch(keyword?: string) {
  const kw = (keyword || searchValue.value).trim()
  if (!kw) return
  isSearching.value = true
  searchValue.value = kw
  searchHistory.value = [kw, ...searchHistory.value.filter((h) => h !== kw)].slice(0, 10)
  setTimeout(() => {
    const filtered = searchResultsData.filter(
      (r) => r.title.includes(kw) || r.author.includes(kw) || r.description.includes(kw),
    )
    results.value = filtered
    searchState.value = filtered.length > 0 ? 'results' : 'empty'
    isSearching.value = false
  }, 400)
}

function handleClear() {
  searchValue.value = ''
  suggestions.value = []
  results.value = []
  searchState.value = 'initial'
}

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/index/index' }) })
}
function goAi() {
  uni.showToast({ title: 'AI 助手开发中', icon: 'none' })
}
function goHome() {
  uni.navigateTo({ url: '/pkg-classics/home/index' })
}
function goDetail(id: string) {
  uni.navigateTo({ url: `/pkg-classics/detail/index?id=${id}` })
}
</script>

<style scoped>
.cs-page {
  min-height: 100vh;
  background: var(--classics-bg);
}

/* 头部 */
.cs-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--classics-bg) 80%, transparent);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
}
.cs-bar {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 0 24rpx;
  height: 112rpx;
}
.cs-back {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cs-input-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.cs-input-search {
  position: absolute;
  left: 28rpx;
  z-index: 1;
}
.cs-input {
  width: 100%;
  height: 80rpx;
  padding: 0 80rpx;
  border-radius: 999rpx;
  background: var(--card);
  font-size: 30rpx;
  color: var(--foreground);
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.04);
}
.cs-input-ph {
  color: var(--muted-foreground);
}
.cs-clear {
  position: absolute;
  right: 16rpx;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cs-ai {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(150deg, #c8324c, #9e1b30);
  box-shadow: 0 2rpx 8rpx rgba(158, 27, 48, 0.3);
}

/* 主体 */
.cs-main {
  padding: 32rpx 40rpx;
}
.cs-initial {
  display: flex;
  flex-direction: column;
  gap: 56rpx;
}
.cs-section {
  display: flex;
  flex-direction: column;
}
.cs-sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.cs-sec-title-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.cs-mb {
  margin-bottom: 24rpx;
}
.cs-sec-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--foreground);
}
.cs-sec-action {
  font-size: 26rpx;
  color: var(--muted-foreground);
}
.cs-more {
  display: flex;
  align-items: center;
}
.cs-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.cs-tag {
  height: 64rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: var(--card);
  font-size: 26rpx;
  color: var(--foreground);
  display: flex;
  align-items: center;
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.04);
}
.cs-tag-hot {
  background: rgba(196, 30, 58, 0.1);
  color: #c41e3a;
  font-weight: 500;
  box-shadow: none;
}
.cs-hot-badge {
  margin-left: 8rpx;
  font-size: 20rpx;
  font-weight: 700;
}

/* 结果行 */
.cs-result-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.cs-result-row {
  display: flex;
  gap: 32rpx;
  padding: 32rpx;
  background: var(--card);
  border-radius: 32rpx;
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.04);
}
.cs-row-cover {
  width: 112rpx;
  flex-shrink: 0;
}
.cs-row-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4rpx 0;
}
.cs-row-title-line {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.cs-row-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--foreground);
}
.cs-free {
  font-size: 20rpx;
  font-weight: 500;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: #d1fae5;
  color: #047857;
}
.cs-row-desc {
  font-size: 24rpx;
  color: var(--muted-foreground);
  margin-top: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-row-meta {
  display: flex;
  align-items: center;
  gap: 20rpx;
  font-size: 22rpx;
  color: var(--muted-foreground);
  margin-top: 8rpx;
}
.cs-row-rating {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

/* 建议 */
.cs-suggest {
  border-radius: 32rpx;
  background: var(--card);
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
.cs-suggest-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 32rpx;
}
.cs-suggest-border {
  border-top: 1rpx solid var(--border);
}
.cs-suggest-text {
  flex: 1;
  font-size: 30rpx;
  color: var(--foreground);
}
.cs-hl {
  color: #c41e3a;
  font-weight: 500;
}

/* 加载 */
.cs-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
}
.cs-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 4rpx solid #c41e3a;
  border-top-color: transparent;
  border-radius: 50%;
  animation: cs-spin 0.8s linear infinite;
}
@keyframes cs-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 结果计数 */
.cs-results {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.cs-result-count {
  font-size: 26rpx;
  color: var(--muted-foreground);
}
.cs-count-num {
  color: var(--foreground);
  font-weight: 600;
}

/* 空态 */
.cs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 128rpx 0;
  text-align: center;
}
.cs-empty-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: var(--card);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.04);
}
.cs-empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--foreground);
  margin-bottom: 8rpx;
}
.cs-empty-desc {
  font-size: 26rpx;
  color: var(--muted-foreground);
  margin-bottom: 40rpx;
}
.cs-empty-btn {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  height: 80rpx;
  padding: 0 40rpx;
  border-radius: 999rpx;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  background: linear-gradient(150deg, #c8324c, #9e1b30);
  box-shadow: 0 2rpx 8rpx rgba(158, 27, 48, 0.3);
}
</style>
