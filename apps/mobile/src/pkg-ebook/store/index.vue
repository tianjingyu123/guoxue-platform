<template>
  <view class="es-page">
    <!-- 顶部导航 毛玻璃 -->
    <view class="es-header">
      <view class="es-bar">
        <view class="es-iconbtn es-iconbtn-l" @tap="goHome">
          <app-icon name="arrow-left" :size="40" color="#1e293b" />
        </view>
        <view class="es-search">
          <app-icon class="es-search-icon" name="search" :size="32" color="#64748b" />
          <input
            v-model="searchQuery"
            class="es-search-input"
            placeholder="搜索电子书、作者…"
            placeholder-class="es-search-ph"
            confirm-type="search"
          />
        </view>
        <view class="es-iconbtn es-iconbtn-r" @tap="goShelf">
          <app-icon name="bookmark" :size="40" color="#1e293b" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="es-main">
      <!-- 加载态 -->
      <view v-if="loading" class="es-empty">
        <text class="es-empty-txt">加载中...</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="error" class="es-empty">
        <text class="es-empty-txt">{{ error }}</text>
        <view class="es-feat-cta" @tap="fetchData()">
          <text class="es-feat-cta-txt">重试</text>
        </view>
      </view>
      <!-- 正常内容 -->
      <view v-else>
      <!-- 大标题 -->
      <view class="es-hero">
        <text class="es-hero-title">电子书馆</text>
        <text class="es-hero-sub">精品好书，随身畅读</text>
      </view>

      <!-- 会员主打大卡 -->
      <view class="es-vip" @tap="goVip">
        <view class="es-vip-inner">
          <view class="es-vip-left">
            <view class="es-vip-badge">
              <app-icon name="crown" :size="28" color="#fcd34d" />
              <text class="es-vip-badge-txt">VIP 会员</text>
            </view>
            <text class="es-vip-title">开通会员 畅读全场</text>
            <text class="es-vip-desc">数百本精品电子书 免费畅读</text>
          </view>
          <view class="es-vip-btn">
            <text class="es-vip-btn-txt">立即开通</text>
          </view>
        </view>
      </view>

      <!-- 编辑精选 -->
      <view class="es-section">
        <view class="es-sec-head">
          <app-icon name="sparkles" :size="32" color="#2563eb" />
          <text class="es-sec-title">编辑精选</text>
        </view>
        <view class="es-feat" @tap="goDetail(featured.id)">
          <flat-book-cover
            class="es-feat-cover"
            :color="coverFrom(featured.color)"
            :gradient-to="coverTo(featured.color)"
            :title="featured.title"
            :author="featured.author"
            title-size="30rpx"
          />
          <view class="es-feat-body">
            <text class="es-feat-tag">限时免费</text>
            <text class="es-feat-title">{{ featured.title }}</text>
            <text class="es-feat-author">{{ featured.author }}</text>
            <view class="es-feat-rate">
              <app-icon name="star" :size="28" color="#fbbf24" :fill="true" />
              <text class="es-feat-rating">{{ featured.rating }}</text>
              <text class="es-feat-readers">· {{ Math.round(featured.salesCount / 1000) }}k人在读</text>
            </view>
            <view class="es-feat-cta">
              <text class="es-feat-cta-txt">立即阅读</text>
              <app-icon name="chevron-right" :size="28" color="#2563eb" />
            </view>
          </view>
        </view>
      </view>

      <!-- 分类筛选 -->
      <scroll-view scroll-x class="es-cats" :show-scrollbar="false">
        <view class="es-cats-row">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="es-cat"
            :class="{ 'es-cat-on': activeCategory === cat.id }"
            @tap="activeCategory = cat.id"
          >
            <text class="es-cat-txt" :class="{ 'es-cat-txt-on': activeCategory === cat.id }">{{ cat.name }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 排序 -->
      <view class="es-sorts">
        <view
          v-for="opt in sorts"
          :key="opt.id"
          class="es-sort"
          :class="{ 'es-sort-on': activeSort === opt.id }"
          @tap="activeSort = opt.id"
        >
          <app-icon :name="opt.icon" :size="28" :color="activeSort === opt.id ? '#2563eb' : '#64748b'" />
          <text class="es-sort-txt" :class="{ 'es-sort-txt-on': activeSort === opt.id }">{{ opt.name }}</text>
        </view>
      </view>

      <!-- 全部好书 -->
      <view class="es-section">
        <text class="es-all-title">全部好书</text>
        <view v-if="filteredBooks.length === 0" class="es-empty">
          <app-icon name="book-open" :size="96" color="#cbd5e1" />
          <text class="es-empty-txt">没有找到相关电子书</text>
        </view>
        <view v-else class="es-grid">
          <view v-for="book in filteredBooks" :key="book.id" class="es-grid-item" @tap="goDetail(book.id)">
            <view class="es-grid-cover-wrap">
              <flat-book-cover
                class="es-grid-cover"
                :color="coverFrom(book.color)"
                :gradient-to="coverTo(book.color)"
                :title="book.title"
                :author="book.author"
                title-size="26rpx"
              />
              <text v-if="book.isMemberFree" class="es-badge es-badge-member">会员</text>
              <text v-else-if="book.isFree" class="es-badge es-badge-free">免费</text>
            </view>
            <text class="es-grid-name">{{ book.title }}</text>
            <view class="es-grid-price">
              <text v-if="book.isFree" class="es-price-free">免费</text>
              <text v-else-if="book.isMemberFree" class="es-price-member">会员免费</text>
              <text v-else class="es-price-num">¥{{ book.price }}</text>
            </view>
          </view>
        </view>
      </view>
      </view><!-- v-else end -->
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import FlatBookCover from '@/components/ebook/flat-book-cover.vue'
import {
  ebookApi,
  ebookStoreCategories,
  ebookStoreSorts,
  EBOOK_COVER,
  type EbookCoverColor,
  type EbookStoreBook,
} from '@/lib/ebook-data'

const searchQuery = ref('')
const activeCategory = ref('all')
const activeSort = ref('hot')
const loading = ref(true)
const error = ref('')
const storeBooks = ref<EbookStoreBook[]>([])

const categories = ebookStoreCategories
const sorts = ebookStoreSorts
const featured = computed(() => storeBooks.value.find(b => b.isHot && b.isFree) || storeBooks.value[1] || storeBooks.value[0])

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    storeBooks.value = await ebookApi.store()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad(() => { fetchData() })

function coverFrom(c: EbookCoverColor) {
  return EBOOK_COVER[c].from
}
function coverTo(c: EbookCoverColor) {
  return EBOOK_COVER[c].to
}

const filteredBooks = computed(() =>
  storeBooks.value.filter((b) => {
    const matchCat =
      activeCategory.value === 'all' ||
      (activeCategory.value === 'mingli' && b.category === '命理') ||
      (activeCategory.value === 'classic' && b.category === '经典') ||
      (activeCategory.value === 'fengshui' && b.category === '风水') ||
      (activeCategory.value === 'shushu' && b.category === '术数')
    const q = searchQuery.value.trim()
    const matchSearch = !q || b.title.includes(q) || b.author.includes(q)
    return matchCat && matchSearch
  }),
)

function goDetail(id: string) {
  uni.navigateTo({ url: `/pkg-ebook/detail/index?id=${id}` })
}
function goShelf() {
  uni.navigateTo({ url: '/pkg-ebook/bookshelf/index' })
}
function goVip() {
  uni.showToast({ title: '会员中心即将上线', icon: 'none' })
}
function goHome() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index', fail: () => {} }) })
}
</script>

<style scoped>
.es-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--ebook-bg);
}
.es-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(248, 250, 252, 0.85);
  backdrop-filter: blur(20rpx);
}
.es-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 32rpx;
  height: 112rpx;
}
.es-iconbtn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 9999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.es-iconbtn-l {
  margin-left: -12rpx;
}
.es-iconbtn-r {
  margin-right: -12rpx;
}
.es-search {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.es-search-icon {
  position: absolute;
  left: 28rpx;
  z-index: 1;
}
.es-search-input {
  width: 100%;
  height: 72rpx;
  padding: 0 32rpx 0 80rpx;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 9999rpx;
  font-size: 28rpx;
  color: var(--ebook-text);
}
.es-search-ph {
  color: var(--ebook-text-soft);
}
.es-main {
  flex: 1;
  padding: 0 40rpx 80rpx;
}
.es-hero {
  padding: 24rpx 0 40rpx;
  display: flex;
  flex-direction: column;
}
.es-hero-title {
  font-size: 64rpx;
  line-height: 1.1;
  font-weight: 700;
  font-family: var(--font-serif), serif;
  letter-spacing: -1rpx;
  color: var(--ebook-text);
}
.es-hero-sub {
  font-size: 30rpx;
  color: var(--ebook-text-soft);
  margin-top: 12rpx;
}
.es-vip {
  margin-bottom: 56rpx;
  border-radius: 48rpx;
  overflow: hidden;
  padding: 40rpx;
  background: linear-gradient(135deg, #2d3a8c, #1e2660);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
}
.es-vip-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32rpx;
}
.es-vip-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.es-vip-badge {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}
.es-vip-badge-txt {
  font-size: 22rpx;
  font-weight: 600;
  color: #fcd34d;
}
.es-vip-title {
  color: #ffffff;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.25;
}
.es-vip-desc {
  color: rgba(255, 255, 255, 0.7);
  font-size: 26rpx;
  margin-top: 8rpx;
}
.es-vip-btn {
  flex-shrink: 0;
  background: #ffffff;
  border-radius: 9999rpx;
  padding: 0 40rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.es-vip-btn-txt {
  color: #1e2660;
  font-weight: 700;
  font-size: 28rpx;
}
.es-section {
  margin-bottom: 56rpx;
}
.es-sec-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.es-sec-title {
  font-size: 38rpx;
  font-weight: 700;
  letter-spacing: -0.5rpx;
  color: var(--ebook-text);
}
.es-feat {
  border-radius: 32rpx;
  background: var(--ebook-card);
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
  border: 1rpx solid rgba(0, 0, 0, 0.04);
  display: flex;
  gap: 32rpx;
}
.es-feat-cover {
  width: 192rpx;
  height: 256rpx;
  flex-shrink: 0;
}
.es-feat-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.es-feat-tag {
  font-size: 22rpx;
  font-weight: 500;
  color: var(--ebook-free);
}
.es-feat-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--ebook-text);
  margin-top: 8rpx;
  line-height: 1.35;
}
.es-feat-author {
  font-size: 26rpx;
  color: var(--ebook-text-soft);
  margin-top: 8rpx;
}
.es-feat-rate {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 16rpx;
}
.es-feat-rating {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--ebook-text);
}
.es-feat-readers {
  font-size: 22rpx;
  color: var(--ebook-text-soft);
}
.es-feat-cta {
  margin-top: auto;
  padding-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.es-feat-cta-txt {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--ebook-primary);
}
.es-cats {
  margin: 0 -40rpx 32rpx;
  white-space: nowrap;
}
.es-cats-row {
  display: inline-flex;
  gap: 16rpx;
  padding: 0 40rpx;
}
.es-cat {
  flex-shrink: 0;
  padding: 12rpx 32rpx;
  border-radius: 9999rpx;
  background: rgba(0, 0, 0, 0.05);
}
.es-cat-on {
  background: var(--ebook-primary);
  box-shadow: 0 2rpx 8rpx rgba(37, 99, 235, 0.25);
}
.es-cat-txt {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--ebook-text-soft);
}
.es-cat-txt-on {
  color: #ffffff;
}
.es-sorts {
  display: flex;
  gap: 8rpx;
  margin-bottom: 32rpx;
}
.es-sort {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 24rpx;
  border-radius: 9999rpx;
}
.es-sort-on {
  background: var(--ebook-primary-soft);
}
.es-sort-txt {
  font-size: 24rpx;
  font-weight: 500;
  color: var(--ebook-text-soft);
}
.es-sort-txt-on {
  color: var(--ebook-primary);
}
.es-all-title {
  font-size: 38rpx;
  font-weight: 700;
  letter-spacing: -0.5rpx;
  color: var(--ebook-text);
  margin-bottom: 28rpx;
  display: block;
}
.es-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 32rpx;
  row-gap: 48rpx;
}
.es-grid-item {
  display: flex;
  flex-direction: column;
}
.es-grid-cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
}
.es-grid-cover {
  width: 100%;
  height: 100%;
}
.es-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  font-size: 18rpx;
  font-weight: 700;
  color: #ffffff;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  line-height: 1.1;
}
.es-badge-member {
  background: var(--ebook-member);
}
.es-badge-free {
  background: var(--ebook-free);
}
.es-grid-name {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--ebook-text);
  margin-top: 16rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.es-grid-price {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 4rpx;
}
.es-price-free {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ebook-free);
}
.es-price-member {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--ebook-member);
}
.es-price-num {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ebook-price);
}
.es-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 128rpx 0;
  gap: 24rpx;
}
.es-empty-txt {
  font-size: 28rpx;
  color: var(--ebook-text-soft);
}
</style>
