<script setup lang="ts">
/** 商品分类页 - 从原型 app/mall/category/page.tsx 1:1 迁移 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { shopApi, categoryTabs, categorySortOptions } from '@/lib/shop-data'

const activeCategory = ref('all')
const sortBy = ref('default')
const showSortMenu = ref(false)
const showFilter = ref(false)
const searchQuery = ref('')
const priceMin = ref(0)
const priceMax = ref(1000)
const onlyMemberFree = ref(false)

const quickPrices: Array<[number, number]> = [[0, 50], [50, 100], [100, 300], [300, 500], [500, 1000]]
const categoryProducts = ref<any[]>([])

onMounted(async () => {
  try {
    const res = await shopApi.getProducts({ page: 1, pageSize: 100 })
    categoryProducts.value = res.items || []
  } catch { /* keep empty */ }
})

const sortName = computed(() => categorySortOptions.find((s) => s.id === sortBy.value)?.name)
const hasFilter = computed(() => priceMin.value > 0 || priceMax.value < 1000 || onlyMemberFree.value)

const sortedProducts = computed(() => {
  const list = categoryProducts.value.filter((p) => {
    if (activeCategory.value !== 'all' && p.category !== activeCategory.value) return false
    if (searchQuery.value && !p.name.includes(searchQuery.value)) return false
    if (p.price < priceMin.value || p.price > priceMax.value) return false
    if (onlyMemberFree.value && !p.isMemberFree) return false
    return true
  })
  return [...list].sort((a, b) => {
    switch (sortBy.value) {
      case 'sales': return b.sales - a.sales
      case 'price_asc': return a.price - b.price
      case 'price_desc': return b.price - a.price
      case 'newest': return b.id - a.id
      default: return 0
    }
  })
})

function formatSales(n: number) { return n > 1000 ? (n / 1000).toFixed(1) + 'k' : String(n) }
function pickSort(id: string) { sortBy.value = id; showSortMenu.value = false }
function pickQuickPrice(min: number, max: number) { priceMin.value = min; priceMax.value = max }
function resetFilter() { priceMin.value = 0; priceMax.value = 1000; onlyMemberFree.value = false }
function resetAll() { activeCategory.value = 'all'; searchQuery.value = ''; resetFilter() }
function openProduct(id: number) { navigateTo(`/mall/product/${id}`) }
</script>

<template>
  <view class="page">
    <!-- 顶部搜索栏 -->
    <view class="header">
      <view class="header-inner">
        <view
          class="back-btn"
          @tap="goBack"
        >
          <AppIcon
            name="arrow-left"
            :size="40"
            color="var(--text-strong)"
          />
        </view>
        <view class="search-box">
          <view class="search-icon">
            <AppIcon
              name="search"
              :size="32"
              color="var(--text-soft)"
            />
          </view>
          <input
            v-model="searchQuery"
            class="search-input"
            type="text"
            placeholder="搜索商品"
            placeholder-class="search-ph"
          >
        </view>
      </view>
    </view>

    <view class="body">
      <!-- 左侧分类栏 -->
      <scroll-view
        class="aside"
        scroll-y
      >
        <view
          v-for="cat in categoryTabs"
          :key="cat.id"
          class="cat-item"
          :class="{ 'cat-item-on': activeCategory === cat.id }"
          @tap="activeCategory = cat.id"
        >
          <view
            v-if="activeCategory === cat.id"
            class="cat-bar"
          />
          <text class="cat-name">
            {{ cat.name }}
          </text>
          <text class="cat-count">
            {{ cat.count }}
          </text>
        </view>
      </scroll-view>

      <!-- 右侧商品区 -->
      <view class="main">
        <!-- 排序栏 -->
        <view class="sort-bar">
          <view class="sort-dropdown">
            <view
              class="sort-trigger"
              @tap="showSortMenu = !showSortMenu"
            >
              <text class="sort-text">
                {{ sortName }}
              </text>
              <view
                class="sort-arrow"
                :class="{ 'sort-arrow-up': showSortMenu }"
              >
                <AppIcon
                  name="chevron-down"
                  :size="28"
                  color="var(--text-strong)"
                />
              </view>
            </view>
            <view
              v-if="showSortMenu"
              class="sort-mask"
              @tap="showSortMenu = false"
            />
            <view
              v-if="showSortMenu"
              class="sort-menu"
            >
              <view
                v-for="opt in categorySortOptions"
                :key="opt.id"
                class="sort-opt"
                :class="{ 'sort-opt-on': sortBy === opt.id }"
                @tap="pickSort(opt.id)"
              >
                <text
                  class="sort-opt-text"
                  :class="{ 'sort-opt-text-on': sortBy === opt.id }"
                >
                  {{ opt.name }}
                </text>
              </view>
            </view>
          </view>
          <view
            class="filter-btn"
            :class="{ 'filter-btn-on': hasFilter }"
            @tap="showFilter = true"
          >
            <AppIcon
              name="filter"
              :size="28"
              :color="hasFilter ? 'var(--brand)' : 'var(--text-soft)'"
            />
            <text
              class="filter-text"
              :class="{ 'filter-text-on': hasFilter }"
            >
              筛选
            </text>
          </view>
        </view>

        <!-- 商品网格 -->
        <view
          v-if="sortedProducts.length"
          class="grid"
        >
          <view
            v-for="p in sortedProducts"
            :key="p.id"
            class="g-card"
            hover-class="g-card-press"
            @tap="openProduct(p.id)"
          >
            <view class="g-cover">
              <image
                class="g-img"
                :src="p.cover"
                mode="aspectFill"
              />
              <text
                v-if="p.isMemberFree"
                class="g-badge"
              >
                会员免费
              </text>
            </view>
            <view class="g-body">
              <text class="g-name">
                {{ p.name }}
              </text>
              <view class="g-price-row">
                <text class="g-price">
                  ¥{{ p.price }}
                </text>
                <text class="g-orig">
                  ¥{{ p.originalPrice }}
                </text>
              </view>
              <text class="g-sales">
                已售{{ formatSales(p.sales) }}
              </text>
            </view>
          </view>
        </view>
        <view
          v-else
          class="empty"
        >
          <view class="empty-icon">
            <AppIcon
              name="search"
              :size="56"
              color="var(--text-soft)"
            />
          </view>
          <text class="empty-text">
            暂无相关商品
          </text>
          <text
            class="empty-reset"
            @tap="resetAll"
          >
            重置筛选条件
          </text>
        </view>
      </view>
    </view>

    <!-- 筛选面板 -->
    <view
      v-if="showFilter"
      class="mask mask-fade-in"
      @tap="showFilter = false"
    />
    <view
      v-if="showFilter"
      class="filter-panel"
    >
      <view class="fp-head">
        <text class="fp-title">
          筛选
        </text>
        <view @tap="showFilter = false">
          <AppIcon
            name="x"
            :size="36"
            color="var(--text-soft)"
          />
        </view>
      </view>
      <view class="fp-body">
        <view class="fp-group">
          <text class="fp-label">
            价格区间
          </text>
          <view class="fp-price-row">
            <input
              v-model.number="priceMin"
              class="fp-input"
              type="number"
              placeholder="最低价"
              placeholder-class="search-ph"
            >
            <text class="fp-dash">
              -
            </text>
            <input
              v-model.number="priceMax"
              class="fp-input"
              type="number"
              placeholder="最高价"
              placeholder-class="search-ph"
            >
          </view>
          <view class="fp-quick">
            <view
              v-for="([min, max]) in quickPrices"
              :key="`${min}-${max}`"
              class="fp-quick-tag"
              :class="{ 'fp-quick-tag-on': priceMin === min && priceMax === max }"
              @tap="pickQuickPrice(min, max)"
            >
              <text
                class="fp-quick-text"
                :class="{ 'fp-quick-text-on': priceMin === min && priceMax === max }"
              >
                ¥{{ min }}-{{ max }}
              </text>
            </view>
          </view>
        </view>
        <view class="fp-group">
          <text class="fp-label">
            其他
          </text>
          <view
            class="fp-check-row"
            @tap="onlyMemberFree = !onlyMemberFree"
          >
            <view
              class="fp-check"
              :class="{ 'fp-check-on': onlyMemberFree }"
            >
              <AppIcon
                v-if="onlyMemberFree"
                name="check"
                :size="22"
                color="#fff"
              />
            </view>
            <text class="fp-check-label">
              仅看会员免费
            </text>
          </view>
        </view>
      </view>
      <view class="fp-actions">
        <view
          class="fp-btn-reset"
          hover-class="g-card-press"
          @tap="resetFilter"
        >
          <text class="fp-btn-reset-text">
            重置
          </text>
        </view>
        <view
          class="fp-btn-ok"
          hover-class="g-card-press"
          @tap="showFilter = false"
        >
          <text class="fp-btn-ok-text">
            确定
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg, #f5f5f5); }
/* 顶部 */
.header { position: sticky; top: 0; z-index: 40; background: var(--surface); border-bottom: 1rpx solid var(--border, #eee); padding-top: var(--status-bar-height, 0px); }
.header-inner { display: flex; align-items: center; gap: 20rpx; padding: 0 28rpx; height: 100rpx; }
.back-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.search-box { flex: 1; position: relative; display: flex; align-items: center; height: 68rpx; background: var(--surface-sunken); border-radius: 999rpx; padding: 0 28rpx 0 64rpx; }
.search-icon { position: absolute; left: 20rpx; top: 50%; transform: translateY(-50%); }
.search-input { flex: 1; font-size: 26rpx; color: var(--text-strong); }
.search-ph { color: var(--text-soft); }
/* 主体 */
.body { display: flex; }
.aside { width: 150rpx; flex-shrink: 0; background: rgba(0,0,0,0.02); border-right: 1rpx solid var(--border, #eee); height: calc(100vh - 100rpx - var(--status-bar-height, 0px)); position: sticky; top: calc(100rpx + var(--status-bar-height, 0px)); }
.cat-item { position: relative; padding: 28rpx 12rpx; text-align: center; }
.cat-item-on { background: var(--surface); }
.cat-bar { position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 6rpx; height: 44rpx; background: var(--brand); border-radius: 0 6rpx 6rpx 0; }
.cat-name { display: block; font-size: 24rpx; color: var(--text-soft); }
.cat-item-on .cat-name { color: var(--brand); font-weight: 500; }
.cat-count { display: block; font-size: 20rpx; color: var(--text-soft); margin-top: 4rpx; opacity: 0.7; }
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
.g-card { background: var(--surface); border-radius: 16rpx; overflow: hidden; }
.g-card-press { opacity: 0.85; }
.g-cover { position: relative; width: 100%; padding-bottom: 100%; background: var(--surface-sunken); }
.g-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.g-badge { position: absolute; top: 12rpx; left: 12rpx; font-size: 18rpx; padding: 2rpx 12rpx; border-radius: 8rpx; background: var(--gold, #c9a96e); color: #fff; }
.g-body { padding: 16rpx; }
.g-name { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 24rpx; font-weight: 500; color: var(--text-strong); line-height: 1.4; min-height: 68rpx; }
.g-price-row { display: flex; align-items: baseline; gap: 8rpx; margin-top: 8rpx; }
.g-price { font-size: 30rpx; font-weight: 600; color: var(--brand); }
.g-orig { font-size: 20rpx; color: var(--text-soft); text-decoration: line-through; }
.g-sales { display: block; font-size: 20rpx; color: var(--text-soft); margin-top: 4rpx; }
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
</style>
