<template>
  <view class="cat-page">
    <classics-header
      :title="config.name"
      right-type="search"
      @back="goBack"
    />

    <view class="cat-main">
      <!-- 分类 Hero -->
      <view class="cat-hero-wrap">
        <view
          class="cat-hero"
          :style="{ background: `linear-gradient(150deg, ${config.from}, ${config.to})` }"
        >
          <view class="cat-hero-top">
            <view class="cat-hero-info">
              <text class="cat-hero-cat">
                四库 · {{ config.desc }}
              </text>
              <text class="cat-hero-name">
                {{ config.name }}
              </text>
              <text class="cat-hero-intro">
                {{ config.intro }}
              </text>
            </view>
            <view class="cat-hero-icon">
              <app-icon
                :name="config.icon"
                :size="48"
                color="#ffffff"
              />
            </view>
          </view>
          <view class="cat-hero-count">
            <text class="cat-hero-num">
              {{ config.count }}
            </text>
            <text class="cat-hero-unit">
              部典籍
            </text>
          </view>
        </view>
      </view>

      <!-- 子门类筛选 -->
      <scroll-view
        class="cat-subs"
        scroll-x
        :show-scrollbar="false"
      >
        <view class="cat-subs-row">
          <view
            v-for="sub in config.subCats"
            :key="sub"
            class="cat-sub-chip"
            :class="{ 'cat-sub-active': activeSub === sub }"
            @tap="activeSub = sub"
          >
            <text class="cat-sub-text">
              {{ sub }}
            </text>
          </view>
        </view>
      </scroll-view>

      <!-- 排序 -->
      <view class="cat-sort">
        <text class="cat-sort-count">
          共 <text class="cat-sort-num">
            {{ books.length }}
          </text> 部
        </text>
        <view class="cat-sort-toggle">
          <view
            v-for="s in sortOptions"
            :key="s.key"
            class="cat-sort-btn"
            :class="{ 'cat-sort-btn-active': sort === s.key }"
            @tap="sort = s.key"
          >
            <text class="cat-sort-btn-text">
              {{ s.label }}
            </text>
          </view>
        </view>
      </view>

      <!-- 书籍列表 -->
      <view class="cat-list">
        <view
          v-for="book in books"
          :key="book.id"
          class="cat-card"
          @tap="goDetail(book.id)"
        >
          <flat-cover
            :title="book.title"
            :label="book.dynasty"
            :cover-color="config.cover"
            title-size="28rpx"
            class="cat-card-cover"
          />
          <view class="cat-card-body">
            <view class="cat-card-top">
              <view class="cat-card-title-row">
                <text class="cat-card-title">
                  {{ book.title }}
                </text>
                <view
                  v-if="book.isFree"
                  class="cat-card-free"
                >
                  <text class="cat-card-free-text">
                    免费
                  </text>
                </view>
              </view>
              <text class="cat-card-desc">
                {{ book.desc }}
              </text>
            </view>
            <text class="cat-card-meta">
              {{ book.author }} · {{ book.dynasty }} · {{ fmtReads(book.reads) }}人读
            </text>
          </view>
          <view class="cat-card-arrow">
            <app-icon
              name="chevron-right"
              :size="40"
              color="rgba(0,0,0,0.25)"
            />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ClassicsHeader from '@/components/classics/classics-header.vue'
import FlatCover from '@/components/classics/flat-cover.vue'
import { CAT_CONFIG, CAT_BOOKS, fmtReads, type CatId } from '@/lib/classics-data'

const catId = ref<CatId>('jing')
const activeSub = ref('全部')
const sort = ref<'hot' | 'new'>('hot')
const sortOptions = [
  { key: 'hot' as const, label: '最热' },
  { key: 'new' as const, label: '最新' },
]

const config = computed(() => CAT_CONFIG[catId.value])
const books = computed(() => CAT_BOOKS[catId.value])

onLoad((query) => {
  const cat = query?.cat
  if (cat && ['jing', 'shi', 'zi', 'ji'].includes(cat)) {
    catId.value = cat as CatId
  }
})

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index', fail: () => {} }) })
}
function goDetail(id: string) {
  uni.navigateTo({ url: `/pkg-classics/detail/index?id=${id}` })
}
</script>

<style scoped lang="scss">
.cat-page {
  min-height: 100vh;
  background: var(--classics-bg);
  padding-bottom: 160rpx;
}
.cat-main {
  max-width: 100%;
}

/* Hero */
.cat-hero-wrap {
  padding: 8rpx 40rpx 40rpx;
}
.cat-hero {
  position: relative;
  border-radius: 56rpx;
  overflow: hidden;
  padding: 48rpx;
  box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.12);
}
.cat-hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.cat-hero-info {
  flex: 1;
}
.cat-hero-cat {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  letter-spacing: 4rpx;
  color: rgba(255, 255, 255, 0.7);
}
.cat-hero-name {
  display: block;
  margin-top: 16rpx;
  font-size: 64rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.1;
}
.cat-hero-intro {
  display: block;
  margin-top: 24rpx;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  max-width: 460rpx;
}
.cat-hero-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cat-hero-count {
  margin-top: 40rpx;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
.cat-hero-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffffff;
}
.cat-hero-unit {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 子门类 */
.cat-subs {
  width: 100%;
  white-space: nowrap;
  padding-bottom: 24rpx;
}
.cat-subs-row {
  display: inline-flex;
  gap: 16rpx;
  padding: 0 40rpx;
}
.cat-sub-chip {
  flex-shrink: 0;
  height: 64rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: var(--card);
  display: flex;
  align-items: center;
  box-shadow: 0 0 0 1rpx rgba(0, 0, 0, 0.04);
}
.cat-sub-active {
  background: var(--foreground);
}
.cat-sub-text {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--muted-foreground);
}
.cat-sub-active .cat-sub-text {
  color: var(--card);
}

/* 排序 */
.cat-sort {
  padding: 0 40rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cat-sort-count {
  font-size: 26rpx;
  color: var(--muted-foreground);
}
.cat-sort-num {
  font-weight: 600;
  color: var(--foreground);
}
.cat-sort-toggle {
  display: flex;
  align-items: center;
  gap: 4rpx;
  background: var(--card);
  border-radius: 999rpx;
  padding: 4rpx;
  box-shadow: 0 0 0 1rpx rgba(0, 0, 0, 0.04);
}
.cat-sort-btn {
  height: 56rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
}
.cat-sort-btn-active {
  background: var(--gugong-red);
}
.cat-sort-btn-text {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--muted-foreground);
}
.cat-sort-btn-active .cat-sort-btn-text {
  color: #ffffff;
}

/* 列表 */
.cat-list {
  padding: 0 40rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.cat-card {
  display: flex;
  gap: 32rpx;
  padding: 32rpx;
  background: var(--card);
  border-radius: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.cat-card-cover {
  width: 128rpx;
  flex-shrink: 0;
}
.cat-card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4rpx 0;
}
.cat-card-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.cat-card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--foreground);
}
.cat-card-free {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: rgba(16, 185, 129, 0.12);
}
.cat-card-free-text {
  font-size: 20rpx;
  font-weight: 500;
  color: #047857;
}
.cat-card-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--muted-foreground);
  line-height: 1.6;
}
.cat-card-meta {
  font-size: 22rpx;
  color: rgba(0, 0, 0, 0.35);
  margin-top: 8rpx;
}
.cat-card-arrow {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
</style>
