<template>
  <view class="ebook-page">
    <!-- 顶部导航 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input v-model="searchQuery" class="search-input" placeholder="搜索电子书..." />
        </view>
        <text class="header-filter">⚙️</text>
      </view>

      <!-- 分类标签 -->
      <scroll-view scroll-x class="cat-scroll">
        <view class="cat-row">
          <text
            v-for="cat in categories"
            :key="cat.id"
            class="cat-chip"
            :class="{ active: activeCategory === cat.id }"
            @click="activeCategory = cat.id"
          >
            {{ cat.name }} {{ cat.count }}
          </text>
        </view>
      </scroll-view>

      <!-- 排序 + 视图 -->
      <view class="toolbar">
        <view class="sort-row">
          <text
            v-for="opt in sortOptions"
            :key="opt.id"
            class="sort-btn"
            :class="{ active: activeSort === opt.id }"
            @click="activeSort = opt.id"
          >
            {{ opt.icon }} {{ opt.name }}
          </text>
        </view>
        <view class="view-toggle">
          <text class="vt-btn" :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'">▦</text>
          <text class="vt-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">☰</text>
        </view>
      </view>
    </view>

    <!-- 网格视图 -->
    <view v-if="viewMode === 'grid'" class="ebook-grid">
      <view v-for="book in ebooks" :key="book.id" class="ebook-card" @click="goPage('/pages/ebook/' + book.id)">
        <view class="ec-cover">
          <view class="ec-spine" />
          <text class="ec-title">{{ book.title.slice(0, 6) }}</text>
          <text class="ec-author">{{ book.author }}</text>
          <view class="ec-tags">
            <text v-if="book.isHot" class="ect-hot">热门</text>
            <text v-if="book.isNew" class="ect-new">新书</text>
            <text v-if="book.isFree" class="ect-free">免费</text>
          </view>
        </view>
        <view class="ec-info">
          <text class="ec-name">{{ book.title }}</text>
          <text class="ec-author-sm">{{ book.author }}</text>
          <view class="ec-rating">
            <text>⭐ {{ book.rating }}</text>
            <text class="ec-review-count">({{ book.reviewCount }})</text>
          </view>
          <view class="ec-price-row">
            <view v-if="book.isFree" class="ec-free-val">免费</view>
            <view v-else class="ec-price">
              <text class="ec-pnow">¥{{ book.price }}</text>
              <text v-if="book.originalPrice > book.price" class="ec-porig">¥{{ book.originalPrice }}</text>
            </view>
            <text class="ec-sales">{{ (book.salesCount / 1000).toFixed(1) }}k人购</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 列表视图 -->
    <view v-else class="ebook-list">
      <view v-for="book in ebooks" :key="book.id" class="el-card" @click="goPage('/pages/ebook/' + book.id)">
        <view class="el-cover">
          <view class="el-spine" />
          <text class="el-ctitle">{{ book.title.slice(0, 4) }}</text>
          <text v-if="book.isFree" class="el-free-tag">免费</text>
        </view>
        <view class="el-info">
          <view class="el-top-row">
            <text class="el-name">{{ book.title }}</text>
            <text v-if="book.isHot" class="el-hot">🔥 热门</text>
          </view>
          <text class="el-meta">{{ book.author }} · {{ book.category }}</text>
          <text class="el-desc">{{ book.tags.join(' · ') }} · {{ (book.salesCount / 1000).toFixed(1) }}k人已购</text>
          <view class="el-bottom">
            <view class="el-rating-row">
              <text>⭐ {{ book.rating }}</text>
              <text v-if="book.isFree" class="el-free-text">免费</text>
              <view v-else class="el-price-row">
                <text class="el-pnow">¥{{ book.price }}</text>
                <text v-if="book.originalPrice > book.price" class="el-porig">¥{{ book.originalPrice }}</text>
              </view>
            </view>
            <view class="el-btn" :class="{ free: book.isFree }">
              {{ book.isFree ? '免费阅读' : '立即购买' }}
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const searchQuery = ref('')
const activeCategory = ref('all')
const activeSort = ref('hot')
const viewMode = ref<'grid' | 'list'>('grid')

const categories = [
  { id: 'all', name: '全部', count: 128 },
  { id: 'classic', name: '经典', count: 45 },
  { id: 'mingli', name: '命理', count: 32 },
  { id: 'fengshui', name: '风水', count: 28 },
  { id: 'shushu', name: '术数', count: 23 },
]

const sortOptions = [
  { id: 'hot', name: '热门', icon: '🔥' },
  { id: 'new', name: '最新', icon: '🕐' },
  { id: 'price', name: '价格', icon: '👑' },
]

const ebooks = [
  { id: '1', title: '八字命理精解', author: '李明华', price: 68, originalPrice: 128, rating: 4.8, reviewCount: 2340, salesCount: 12800, category: '命理', tags: ['畅销', '精品'], isHot: true, isNew: false, isFree: false },
  { id: '2', title: '易经入门与实践', author: '王道玄', price: 0, originalPrice: 0, rating: 4.9, reviewCount: 5680, salesCount: 45000, category: '经典', tags: ['免费', '入门'], isHot: true, isNew: false, isFree: true },
  { id: '3', title: '风水学基础教程', author: '张天师', price: 88, originalPrice: 168, rating: 4.7, reviewCount: 1890, salesCount: 8900, category: '风水', tags: ['新书', '图文'], isHot: false, isNew: true, isFree: false },
  { id: '4', title: '六爻预测学', author: '陈易卦', price: 58, originalPrice: 98, rating: 4.6, reviewCount: 1230, salesCount: 5600, category: '术数', tags: ['实战'], isHot: false, isNew: false, isFree: false },
  { id: '5', title: '紫微斗数全书', author: '紫微居士', price: 128, originalPrice: 258, rating: 4.9, reviewCount: 3450, salesCount: 18900, category: '命理', tags: ['经典', '完整版'], isHot: true, isNew: false, isFree: false },
  { id: '6', title: '道德经白话详解', author: '老庄书院', price: 0, originalPrice: 0, rating: 4.8, reviewCount: 8900, salesCount: 68000, category: '经典', tags: ['免费', '白话'], isHot: true, isNew: false, isFree: true },
]

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.ebook-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 40rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; gap: 12rpx; }
.header-back { font-size: 48rpx; color: #333; width: 48rpx; }
.search-box { flex: 1; display: flex; align-items: center; height: 64rpx; background: #F0EDE5; border-radius: 32rpx; padding: 0 20rpx; }
.search-icon { font-size: 24rpx; margin-right: 8rpx; }
.search-input { flex: 1; font-size: 24rpx; color: #2C2C2C; }
.header-filter { font-size: 32rpx; color: #666; padding: 8rpx; }

.cat-scroll { white-space: nowrap; }
.cat-row { display: flex; gap: 10rpx; padding: 14rpx 24rpx; }
.cat-chip { font-size: 24rpx; color: #999; background: #F0EDE5; padding: 8rpx 20rpx; border-radius: 32rpx; display: inline-block; }
.cat-chip.active { background: #C41E3A; color: #fff; }

.toolbar { display: flex; justify-content: space-between; align-items: center; padding: 0 24rpx 10rpx; border-top: 1px solid rgba(232,224,213,0.5); }
.sort-row { display: flex; gap: 8rpx; }
.sort-btn { font-size: 22rpx; color: #999; padding: 6rpx 14rpx; border-radius: 8rpx; }
.sort-btn.active { color: #C41E3A; background: rgba(196,30,58,0.06); }

.view-toggle { display: flex; gap: 4rpx; background: #F0EDE5; border-radius: 10rpx; padding: 4rpx; }
.vt-btn { font-size: 28rpx; padding: 6rpx 14rpx; border-radius: 8rpx; color: #999; }
.vt-btn.active { background: #fff; color: #333; box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.08); }

.ebook-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; padding: 16rpx 24rpx; }
.ebook-card { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }

.ec-cover { aspect-ratio: 3/4; background: linear-gradient(180deg, #FBF8F2, #EDE5D8); position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24rpx; }
.ec-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 8rpx; background: rgba(201,169,110,0.2); }
.ec-title { font-size: 28rpx; font-weight: 700; color: #3D3225; text-align: center; line-height: 1.4; }
.ec-author { font-size: 18rpx; color: #7A6B5B; margin-top: 12rpx; }
.ec-tags { position: absolute; top: 8rpx; right: 8rpx; display: flex; flex-direction: column; gap: 4rpx; }
.ect-hot { font-size: 16rpx; color: #fff; background: #FF4D4F; padding: 2rpx 8rpx; border-radius: 4rpx; }
.ect-new { font-size: 16rpx; color: #fff; background: #52C41A; padding: 2rpx 8rpx; border-radius: 4rpx; }
.ect-free { font-size: 16rpx; color: #fff; background: #C9A96E; padding: 2rpx 8rpx; border-radius: 4rpx; }

.ec-info { padding: 14rpx 16rpx; }
.ec-name { font-size: 24rpx; font-weight: 500; color: #333; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ec-author-sm { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }
.ec-rating { display: flex; align-items: center; gap: 4rpx; margin-top: 8rpx; font-size: 22rpx; color: #333; }
.ec-review-count { font-size: 18rpx; color: #BBB; }
.ec-price-row { display: flex; justify-content: space-between; align-items: center; margin-top: 10rpx; }
.ec-free-val { font-size: 28rpx; font-weight: 700; color: #52C41A; }
.ec-price { display: flex; align-items: baseline; gap: 6rpx; }
.ec-pnow { font-size: 28rpx; font-weight: 700; color: #C41E3A; }
.ec-porig { font-size: 20rpx; color: #BBB; text-decoration: line-through; }
.ec-sales { font-size: 18rpx; color: #BBB; }

.ebook-list { padding: 8rpx 24rpx; }
.el-card { display: flex; gap: 16rpx; background: #fff; border-radius: 16rpx; padding: 16rpx; margin-bottom: 14rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.el-cover { width: 140rpx; height: 180rpx; background: linear-gradient(180deg, #FBF8F2, #EDE5D8); border-radius: 12rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; flex-shrink: 0; overflow: hidden; }
.el-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 5rpx; background: rgba(201,169,110,0.2); }
.el-ctitle { font-size: 24rpx; font-weight: 700; color: #3D3225; }
.el-free-tag { position: absolute; top: 4rpx; right: 4rpx; font-size: 16rpx; color: #fff; background: #52C41A; padding: 1rpx 6rpx; border-radius: 4rpx; }

.el-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; }
.el-top-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8rpx; }
.el-name { font-size: 26rpx; font-weight: 500; color: #333; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.el-hot { font-size: 18rpx; color: #E65100; background: #FFF3E0; padding: 2rpx 8rpx; border-radius: 6rpx; flex-shrink: 0; }
.el-meta { font-size: 20rpx; color: #999; margin-top: 4rpx; }
.el-desc { font-size: 20rpx; color: #BBB; margin-top: 4rpx; }
.el-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 8rpx; }
.el-rating-row { display: flex; align-items: center; gap: 12rpx; font-size: 22rpx; color: #333; }
.el-free-text { font-size: 26rpx; font-weight: 700; color: #52C41A; }
.el-price-row { display: flex; align-items: baseline; gap: 6rpx; }
.el-pnow { font-size: 26rpx; font-weight: 700; color: #C41E3A; }
.el-porig { font-size: 20rpx; color: #BBB; text-decoration: line-through; }
.el-btn { padding: 8rpx 20rpx; border-radius: 24rpx; background: #C41E3A; color: #fff; font-size: 22rpx; }
.el-btn.free { background: #52C41A; }
</style>
