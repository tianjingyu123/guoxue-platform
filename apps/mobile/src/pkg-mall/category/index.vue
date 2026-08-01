<script setup lang="ts">
/** 商品分类页 - 分类/搜索/价格/排序全下沉后端，useList 管理列表分页 */
import { computed, nextTick, ref } from 'vue'
import { onLoad, onReachBottom } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import AppLoadMore from '@/components/common/app-load-more.vue'
import ProductCard from '@/components/cards/product-card.vue'
import { goBack } from '@/utils/router'
import { shopApi } from '@/lib/shop-data'
import type { CategoryTab, CategorySortOption, CategoryProduct } from '@/lib/shop-data'
import type { ProductCardData } from '@/lib/card-utils'
import { useList } from '@/composables/useList'
import { useOverlayScrollLock } from '@/composables/use-overlay-scroll-lock'

const categoryTabs = ref<CategoryTab[]>([])
const categorySortOptions = ref<CategorySortOption[]>([])

const activeCategory = ref('all')
const sortBy = ref('default')
const showSortMenu = ref(false)
const showFilter = ref(false)
const searchQuery = ref('')
const priceMin = ref(0)
const priceMax = ref(1000)

useOverlayScrollLock(
  () => showSortMenu.value,
  {
    onEscape: () => { showSortMenu.value = false },
    focusContainerSelector: '.sort-menu',
    initialFocusSelector: '.sort-menu [aria-checked="true"]',
  },
)
useOverlayScrollLock(
  () => showFilter.value,
  {
    onEscape: () => { showFilter.value = false },
    focusContainerSelector: '.filter-panel',
    initialFocusSelector: '.filter-panel [aria-label="关闭商品筛选"]',
  },
)

const quickPrices: Array<[number, number]> = [[0, 50], [50, 100], [100, 300], [300, 500], [500, 1000]]
const CATEGORY_LABEL_MAX_LENGTH = 5

function categoryDisplayName(name: string) {
  return name.length > CATEGORY_LABEL_MAX_LENGTH
    ? `${name.slice(0, CATEGORY_LABEL_MAX_LENGTH - 1)}…`
    : name
}

const sortName = computed(() => categorySortOptions.value.find((s) => s.id === sortBy.value)?.name)
const hasFilter = computed(() => priceMin.value > 0 || priceMax.value < 1000)

// 分类/搜索/价格/排序全部作为查询参数下沉后端；切任一条件即重载第一页
const { list: categoryProducts, loading, error, isEmpty, loadStatus, refresh, loadMore } = useList<CategoryProduct>({
  fetcher: ({ page, pageSize }) => shopApi.getMallProducts({
    page,
    pageSize,
    category: activeCategory.value,
    keyword: searchQuery.value || undefined,
    priceMin: priceMin.value > 0 ? priceMin.value : undefined,
    priceMax: priceMax.value < 1000 ? priceMax.value : undefined,
    sort: sortBy.value,
  }),
})

async function loadTabs() {
  try {
    const data = await shopApi.getMallCategoryTabs()
    categoryTabs.value = data.tabs || []
    categorySortOptions.value = data.sortOptions || []
  } catch { /* 分类 tab 拉取失败不阻塞商品列表 */ }
}

onLoad(() => { loadTabs(); refresh() })
onReachBottom(() => loadMore())

function selectCategory(id: string) { if (activeCategory.value === id) return; activeCategory.value = id; refresh() }
function onSearch() { refresh() }
function toProductCard(p: CategoryProduct): ProductCardData {
  return {
    id: p.id,
    title: p.name,
    subtitle: p.intro,
    cover: p.cover,
    coverRatio: '1:1',
    price: p.price,
    originalPrice: p.originalPrice,
    sales: p.sales,
    stock: p.stock,
    tags: p.tags,
    reason: '严选好物',
  }
}
function pickSort(id: string) { sortBy.value = id; showSortMenu.value = false; refresh() }
function pickQuickPrice(min: number, max: number) { priceMin.value = min; priceMax.value = max }
function applyFilter() { showFilter.value = false; refresh() }
function resetFilter() { priceMin.value = 0; priceMax.value = 1000 }
function resetAll() { activeCategory.value = 'all'; searchQuery.value = ''; resetFilter(); refresh() }
function activateOnKeyboard(event: KeyboardEvent, action: () => unknown) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  void action()
}
function onCategoryKeydown(event: KeyboardEvent, currentId: string) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selectCategory(currentId)
    return
  }
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
  event.preventDefault()
  const currentIndex = Math.max(0, categoryTabs.value.findIndex((item) => item.id === currentId))
  const direction = event.key === 'ArrowDown' ? 1 : -1
  const nextCategory = categoryTabs.value[
    (currentIndex + direction + categoryTabs.value.length) % categoryTabs.value.length
  ]
  if (!nextCategory) return
  selectCategory(nextCategory.id)
  void nextTick(() => {
    document.querySelector<HTMLElement>('.cat-item[aria-selected="true"]')?.focus()
  })
}
</script>

<template>
  <view class="page" @keydown.esc="showSortMenu = false; showFilter = false">
    <!-- 顶部搜索栏 -->
    <view class="header">
      <view class="header-inner">
        <view
          class="back-btn"
          role="button"
          aria-label="返回上一页"
          tabindex="0"
          @tap="goBack"
          @keydown="activateOnKeyboard($event, goBack)"
        >
          <AppIcon name="arrow-left" :size="44" color="#1A1A1A" />
        </view>
        <view class="search-box">
          <view class="search-icon"><AppIcon name="search" :size="32" color="var(--text-soft)" /></view>
          <input
            v-model="searchQuery"
            class="search-input"
            aria-label="搜索商品名称或内容"
            type="text"
            confirm-type="search"
            placeholder="搜索商品后回车"
            placeholder-class="search-ph"
            @confirm="onSearch"
          />
        </view>
      </view>
    </view>

    <view class="body">
      <!-- 加载中 -->
      <view v-if="loading" class="state-wrap" role="status" aria-live="polite" aria-label="商品加载中">
        <AppLoading />
      </view>
      <!-- 加载失败 -->
      <view v-else-if="error" class="state-wrap" role="alert" aria-live="assertive">
        <view class="state-icon"><AppIcon name="alert-circle" :size="56" color="#c41e3a" /></view>
        <text class="state-text">加载失败，请重试</text>
        <view
          class="state-retry"
          role="button"
          aria-label="重新加载商品"
          tabindex="0"
          @tap="refresh"
          @keydown="activateOnKeyboard($event, refresh)"
        >
          <text class="state-retry-text">点击重试</text>
        </view>
      </view>
      <!-- 内容 -->
      <template v-else>
      <!-- 左侧分类栏 -->
      <scroll-view
        class="aside"
        scroll-y
        role="tablist"
        aria-label="商品分类"
        aria-orientation="vertical"
      >
        <view class="aside-head">
          <text class="aside-head-text">商品分类</text>
        </view>
        <view
          v-for="cat in categoryTabs"
          :key="cat.id"
          class="cat-item"
          :class="{ 'cat-item-on': activeCategory === cat.id }"
          role="tab"
          :aria-label="`${cat.name}，${cat.count} 件商品`"
          :aria-selected="activeCategory === cat.id ? 'true' : 'false'"
          :tabindex="activeCategory === cat.id ? 0 : -1"
          @tap="selectCategory(cat.id)"
          @keydown="onCategoryKeydown($event, cat.id)"
        >
          <view v-if="activeCategory === cat.id" class="cat-bar" />
          <text class="cat-name" :aria-label="cat.name">{{ categoryDisplayName(cat.name) }}</text>
          <text class="cat-count">{{ cat.count }}件</text>
        </view>
      </scroll-view>

      <!-- 右侧商品区 -->
      <view class="main">
        <!-- 排序栏 -->
        <view class="sort-bar">
          <view class="sort-dropdown">
            <view
              class="sort-trigger"
              role="button"
              aria-label="选择商品排序"
              aria-haspopup="true"
              :aria-expanded="showSortMenu ? 'true' : 'false'"
              tabindex="0"
              @tap="showSortMenu = !showSortMenu"
              @keydown="activateOnKeyboard($event, () => { showSortMenu = !showSortMenu })"
            >
              <text class="sort-text">{{ sortName }}</text>
              <view class="sort-arrow" :class="{ 'sort-arrow-up': showSortMenu }"><AppIcon name="chevron-down" :size="28" color="var(--text-strong)" /></view>
            </view>
            <view v-if="showSortMenu" class="sort-mask" aria-hidden="true" @tap="showSortMenu = false" />
            <view v-if="showSortMenu" class="sort-menu" role="radiogroup" aria-label="商品排序方式">
              <view
                v-for="opt in categorySortOptions"
                :key="opt.id"
                class="sort-opt"
                :class="{ 'sort-opt-on': sortBy === opt.id }"
                role="radio"
                :aria-checked="sortBy === opt.id ? 'true' : 'false'"
                :tabindex="sortBy === opt.id ? 0 : -1"
                @tap="pickSort(opt.id)"
                @keydown="activateOnKeyboard($event, () => pickSort(opt.id))"
              >
                <text class="sort-opt-text" :class="{ 'sort-opt-text-on': sortBy === opt.id }">{{ opt.name }}</text>
              </view>
            </view>
          </view>
          <view
            class="filter-btn"
            :class="{ 'filter-btn-on': hasFilter }"
            role="button"
            :aria-label="hasFilter ? '调整商品筛选，当前已启用价格条件' : '打开商品筛选'"
            aria-haspopup="dialog"
            :aria-expanded="showFilter ? 'true' : 'false'"
            tabindex="0"
            @tap="showFilter = true"
            @keydown="activateOnKeyboard($event, () => { showFilter = true })"
          >
            <AppIcon name="filter" :size="28" :color="hasFilter ? 'var(--brand)' : 'var(--text-soft)'" />
            <text class="filter-text" :class="{ 'filter-text-on': hasFilter }">筛选</text>
          </view>
        </view>

        <!-- 商品网格 -->
        <view v-if="categoryProducts.length" class="grid">
          <ProductCard v-for="p in categoryProducts" :key="p.id" :data="toProductCard(p)" />
        </view>
        <view v-else class="empty" role="status" aria-live="polite">
          <view class="empty-icon"><AppIcon name="search" :size="56" color="var(--text-soft)" /></view>
          <text class="empty-text">暂无相关商品</text>
          <text
            class="empty-reset"
            role="button"
            aria-label="重置商品分类、搜索和价格筛选"
            tabindex="0"
            @tap="resetAll"
            @keydown="activateOnKeyboard($event, resetAll)"
          >重置筛选条件</text>
        </view>

        <app-load-more v-if="categoryProducts.length" :status="loadStatus" />
      </view>
      </template>
    </view>

    <!-- 筛选面板 -->
    <view v-if="showFilter" class="mask mask-fade-in" aria-hidden="true" @tap="showFilter = false" />
    <view
      v-if="showFilter"
      class="filter-panel"
      role="dialog"
      aria-modal="true"
      aria-label="商品筛选"
    >
      <view class="fp-head">
        <text class="fp-title">筛选</text>
        <view
          role="button"
          aria-label="关闭商品筛选"
          tabindex="0"
          @tap="showFilter = false"
          @keydown="activateOnKeyboard($event, () => { showFilter = false })"
        >
          <AppIcon name="x" :size="36" color="var(--text-soft)" />
        </view>
      </view>
      <view class="fp-body">
        <view class="fp-group">
          <text class="fp-label">价格区间</text>
          <view class="fp-price-row">
            <input v-model.number="priceMin" class="fp-input" aria-label="最低价格" type="number" placeholder="最低价" placeholder-class="search-ph" />
            <text class="fp-dash">-</text>
            <input v-model.number="priceMax" class="fp-input" aria-label="最高价格" type="number" placeholder="最高价" placeholder-class="search-ph" />
          </view>
          <view class="fp-quick" role="radiogroup" aria-label="快捷价格区间">
            <view
              v-for="([min, max]) in quickPrices"
              :key="`${min}-${max}`"
              class="fp-quick-tag"
              :class="{ 'fp-quick-tag-on': priceMin === min && priceMax === max }"
              role="radio"
              :aria-label="`${min} 元至 ${max} 元`"
              :aria-checked="priceMin === min && priceMax === max ? 'true' : 'false'"
              tabindex="0"
              @tap="pickQuickPrice(min, max)"
              @keydown="activateOnKeyboard($event, () => pickQuickPrice(min, max))"
            >
              <text class="fp-quick-text" :class="{ 'fp-quick-text-on': priceMin === min && priceMax === max }">¥{{ min }}-{{ max }}</text>
            </view>
          </view>
        </view>
      </view>
      <view class="fp-actions">
        <view
          class="fp-btn-reset"
          role="button"
          aria-label="重置价格筛选"
          tabindex="0"
          hover-class="g-card-press"
          @tap="resetFilter"
          @keydown="activateOnKeyboard($event, resetFilter)"
        ><text class="fp-btn-reset-text">重置</text></view>
        <view
          class="fp-btn-ok"
          role="button"
          aria-label="应用商品筛选"
          tabindex="0"
          hover-class="g-card-press"
          @tap="applyFilter"
          @keydown="activateOnKeyboard($event, applyFilter)"
        ><text class="fp-btn-ok-text">确定</text></view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg, #f5f5f5); }
/* 顶部 */
.header { position: sticky; top: 0; z-index: 40; background: var(--surface); border-bottom: 1rpx solid var(--border, #eee); padding-top: var(--status-bar-height, 0px); }
.header-inner { display: flex; align-items: center; gap: 20rpx; padding: 0 28rpx; height: 100rpx; }
.back-btn { width: 88rpx; height: 88rpx; margin: 0 -16rpx; display: flex; align-items: center; justify-content: center; } /* 触控热区≥88rpx：容器扩大+负margin保持视觉位置 */
.search-box { flex: 1; position: relative; display: flex; align-items: center; height: 68rpx; background: var(--surface-sunken); border-radius: 999rpx; padding: 0 28rpx 0 64rpx; }
.search-icon { position: absolute; left: 20rpx; top: 50%; transform: translateY(-50%); }
.search-input { flex: 1; font-size: 26rpx; color: var(--text-strong); }
.search-ph { color: var(--text-soft); }
/* 主体 */
.body { display: flex; }
.aside {
  width: 164rpx;
  flex-shrink: 0;
  height: calc(100vh - 100rpx - var(--status-bar-height, 0px));
  position: sticky;
  top: calc(100rpx + var(--status-bar-height, 0px));
  box-sizing: border-box;
  padding: 0 10rpx 12rpx;
  background: linear-gradient(180deg, #F8F5EF 0%, #F4F1EB 100%);
  border-right: 1rpx solid rgba(201, 169, 110, 0.18);
}
.aside-head {
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1rpx solid rgba(201, 169, 110, 0.14);
}
.aside-head-text {
  color: #9A9184;
  font-size: 19rpx;
  font-weight: 500;
  letter-spacing: 2rpx;
}
.cat-item {
  position: relative;
  min-height: 96rpx;
  margin-top: 8rpx;
  margin-bottom: 8rpx;
  padding: 14rpx 10rpx;
  border: 1rpx solid transparent;
  border-radius: 18rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  text-align: center;
}
.cat-item-on {
  background: linear-gradient(145deg, #FFFFFF 0%, #FFF9F2 100%);
  border-color: rgba(196, 30, 58, 0.14);
  box-shadow: 0 4rpx 14rpx rgba(83, 56, 28, 0.07);
}
.cat-bar {
  position: absolute;
  left: -1rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 6rpx;
  height: 38rpx;
  background: var(--brand);
  border-radius: 0 6rpx 6rpx 0;
  box-shadow: 0 2rpx 6rpx rgba(196, 30, 58, 0.18);
}
.cat-name {
  display: block;
  max-width: 100%;
  overflow: hidden;
  color: #625C52;
  font-size: 23rpx;
  font-weight: 500;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cat-item-on .cat-name {
  color: var(--brand);
  font-weight: 600;
}
.cat-count {
  display: block;
  min-width: 44rpx;
  padding: 1rpx 8rpx;
  border-radius: 999rpx;
  background: rgba(120, 100, 72, 0.07);
  color: #9A9184;
  font-size: 18rpx;
  line-height: 1.4;
}
.cat-item-on .cat-count {
  background: rgba(196, 30, 58, 0.08);
  color: rgba(196, 30, 58, 0.72);
}
.main { flex: 1; min-width: 0; }
/* 排序栏 */
.sort-bar { position: sticky; top: calc(100rpx + var(--status-bar-height, 0px)); z-index: 30; display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; height: 76rpx; background: var(--surface); border-bottom: 1rpx solid var(--border, #eee); }
.sort-dropdown { position: relative; }
.sort-trigger { display: flex; align-items: center; gap: 6rpx; }
.sort-text { font-size: 26rpx; color: var(--text-strong); }
.sort-arrow { transition: transform 0.2s; }
.sort-arrow-up { transform: rotate(180deg); }
.sort-mask { position: fixed; inset: 0; z-index: 40; }
.sort-menu { position: absolute; top: 100%; left: 0; margin-top: 8rpx; width: 200rpx; background: var(--surface); border: 1rpx solid var(--border, #eee); border-radius: 12rpx; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.1); z-index: 50; padding: 8rpx 0; }
.sort-opt { padding: 16rpx 24rpx; }
.sort-opt-on { background: rgba(196,30,58,0.05); }
.sort-opt-text { font-size: 26rpx; color: var(--text-strong); }
.sort-opt-text-on { color: var(--brand); }
.filter-btn { display: flex; align-items: center; gap: 6rpx; }
.filter-text { font-size: 26rpx; color: var(--text-soft); }
.filter-text-on { color: var(--brand); }
/* 网格 */
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; padding: 16rpx; }
.g-card-press { opacity: 0.85; }
/* 空态 */
.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { width: 140rpx; height: 140rpx; border-radius: 50%; background: var(--surface-sunken); display: flex; align-items: center; justify-content: center; margin-bottom: 28rpx; }
.empty-text { font-size: 26rpx; color: var(--text-soft); }
.empty-reset { font-size: 26rpx; color: var(--brand); margin-top: 20rpx; }
/* 筛选面板 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 50; }
.filter-panel { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; background: var(--surface); border-radius: 32rpx 32rpx 0 0; padding-bottom: env(safe-area-inset-bottom); }
.fp-head { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 28rpx; border-bottom: 1rpx solid var(--border, #eee); }
.fp-title { font-size: 30rpx; font-weight: 600; color: var(--text-strong); }
.fp-body { padding: 28rpx; }
.fp-group { margin-bottom: 40rpx; }
.fp-label { display: block; font-size: 26rpx; font-weight: 500; color: var(--text-strong); margin-bottom: 20rpx; }
.fp-price-row { display: flex; align-items: center; gap: 20rpx; }
.fp-input { flex: 1; height: 72rpx; padding: 0 24rpx; border-radius: 12rpx; background: var(--surface-sunken); font-size: 26rpx; color: var(--text-strong); }
.fp-dash { color: var(--text-soft); }
.fp-quick { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 20rpx; }
.fp-quick-tag { padding: 12rpx 24rpx; border-radius: 999rpx; background: var(--surface-sunken); }
.fp-quick-tag-on { background: var(--brand); }
.fp-quick-text { font-size: 22rpx; color: var(--text-strong); }
.fp-quick-text-on { color: #fff; }
.fp-check-row { display: flex; align-items: center; gap: 20rpx; }
.fp-check { width: 40rpx; height: 40rpx; border-radius: 8rpx; border: 3rpx solid rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; }
.fp-check-on { background: var(--brand); border-color: var(--brand); }
.fp-check-label { font-size: 26rpx; color: var(--text-strong); }
.fp-actions { display: flex; gap: 20rpx; padding: 28rpx; border-top: 1rpx solid var(--border, #eee); }
.fp-btn-reset { flex: 1; height: 84rpx; border-radius: 16rpx; background: var(--surface-sunken); display: flex; align-items: center; justify-content: center; }
.fp-btn-reset-text { font-size: 26rpx; font-weight: 500; color: var(--text-strong); }
.fp-btn-ok { flex: 1; height: 84rpx; border-radius: 16rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; }
.fp-btn-ok-text { font-size: 26rpx; font-weight: 500; color: #fff; }

/* 三态：加载/错误 */
.state-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 0; }
.state-icon { width: 120rpx; height: 120rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.state-text { font-size: 26rpx; color: var(--text-soft); margin-top: 20rpx; }
.state-retry { margin-top: 32rpx; padding: 16rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.state-retry-text { font-size: 26rpx; color: #fff; font-weight: 500; }
</style>
