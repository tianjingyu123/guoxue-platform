<template>
  <view class="ep-page">
    <!-- 顶部导航 -->
    <view class="ep-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ep-topbar">
        <view class="ep-back" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#2C2C2C" />
        </view>
        <view class="ep-search">
          <app-icon name="search" :size="32" color="#999999" class="ep-search-icon" />
          <input
            v-model="searchQuery"
            class="ep-search-input"
            type="text"
            placeholder="搜索讲师/达人"
            placeholder-class="ep-ph"
            confirm-type="search"
          />
          <view v-if="searchQuery" class="ep-search-clear" @tap="searchQuery = ''">
            <app-icon name="x" :size="32" color="#999999" />
          </view>
        </view>
        <view class="ep-ai-btn" @tap="onAiSearch">
          <app-icon name="sparkles" :size="34" color="#C9A96E" />
        </view>
      </view>

      <!-- 分类Tab -->
      <scroll-view class="ep-cats" scroll-x :show-scrollbar="false">
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="ep-cat"
          :class="{ 'ep-cat--on': activeCategory === cat.id }"
          @tap="activeCategory = cat.id"
        >
          {{ cat.name }}
        </view>
      </scroll-view>

      <!-- 排序和筛选 -->
      <view class="ep-toolbar">
        <view class="ep-sort" @tap="showSortMenu = !showSortMenu">
          <text class="ep-sort-label">{{ currentSortName }}</text>
          <app-icon name="chevron-down" :size="28" color="#2C2C2C" :class="{ 'ep-rotate': showSortMenu }" />
        </view>
        <view class="ep-filter" @tap="showFilter = true">
          <app-icon name="filter" :size="28" color="#999999" />
          <text class="ep-filter-label">筛选</text>
        </view>

        <!-- 排序下拉 -->
        <view v-if="showSortMenu" class="ep-sort-mask" @tap="showSortMenu = false" />
        <view v-if="showSortMenu" class="ep-sort-menu">
          <view
            v-for="opt in sortOptions"
            :key="opt.id"
            class="ep-sort-item"
            :class="{ 'ep-sort-item--on': activeSort === opt.id }"
            @tap="onSelectSort(opt.id)"
          >
            {{ opt.name }}
          </view>
        </view>
      </view>
    </view>

    <!-- 讲师列表 -->
    <view class="ep-list">
      <template v-if="filteredExperts.length > 0">
        <view
          v-for="expert in filteredExperts"
          :key="expert.id"
          class="ep-card"
          @tap="goDetail(expert.id)"
        >
          <view class="ep-card-top">
            <!-- 头像 -->
            <view class="ep-avatar-wrap">
              <view class="ep-avatar">{{ expert.name[0] }}</view>
              <view v-if="expert.isOnline" class="ep-online-dot" />
            </view>
            <!-- 信息 -->
            <view class="ep-info">
              <view class="ep-name-row">
                <text class="ep-name">{{ expert.name }}</text>
                <view v-if="expert.isVerified" class="ep-verified">V</view>
                <text class="ep-title">{{ expert.title }}</text>
              </view>
              <view class="ep-tags">
                <view v-for="tag in expert.tags.slice(0, 3)" :key="tag" class="ep-tag">{{ tag }}</view>
              </view>
              <text class="ep-intro">{{ expert.intro }}</text>
              <view class="ep-stats">
                <view class="ep-rating">
                  <app-icon name="star" :size="26" color="#C9A96E" />
                  <text class="ep-rating-val">{{ expert.rating }}</text>
                </view>
                <text class="ep-stat-text">{{ expert.reviews }}条评价</text>
                <text class="ep-stat-text">{{ expert.consults }}次咨询</text>
              </view>
            </view>
          </view>

          <!-- 价格和操作 -->
          <view class="ep-card-bottom">
            <view class="ep-prices">
              <text class="ep-price-label">提问 <text class="ep-price-val">{{ expert.askPrice }}币/次</text></text>
              <text class="ep-price-label">连麦 <text class="ep-price-val">{{ expert.callPrice }}币/分钟</text></text>
            </view>
            <view class="ep-actions">
              <view class="ep-btn-ask" @tap.stop="onAsk(expert)">
                <app-icon name="message-circle" :size="24" color="#C41E3A" />
                <text>提问</text>
              </view>
              <view
                class="ep-btn-call"
                :class="{ 'ep-btn-call--off': !expert.isOnline }"
                @tap.stop="onCall(expert)"
              >
                <app-icon name="phone" :size="24" :color="expert.isOnline ? '#FFFFFF' : '#999999'" />
                <text>{{ expert.isOnline ? '连麦' : '离线' }}</text>
              </view>
            </view>
          </view>
        </view>
      </template>

      <!-- 空态 -->
      <view v-else class="ep-empty">
        <view class="ep-empty-icon">
          <app-icon name="search" :size="64" color="#999999" />
        </view>
        <text class="ep-empty-title">未找到相关讲师</text>
        <text class="ep-empty-sub">试试其他关键词或筛选条件</text>
      </view>
    </view>

    <!-- 筛选弹窗 -->
    <view v-if="showFilter" class="ep-modal-mask" @tap="showFilter = false">
      <view class="ep-filter-sheet" @tap.stop>
        <view class="ep-sheet-head">
          <text class="ep-sheet-title">筛选</text>
          <view @tap="showFilter = false">
            <app-icon name="x" :size="38" color="#999999" />
          </view>
        </view>
        <view class="ep-sheet-body">
          <view class="ep-filter-group">
            <text class="ep-filter-h">提问价格（币/次）</text>
            <view class="ep-chips">
              <view
                v-for="r in priceRanges"
                :key="r.label"
                class="ep-chip"
                :class="{ 'ep-chip--on': priceRange[0] === r.min && priceRange[1] === r.max }"
                @tap="priceRange = [r.min, r.max]"
              >
                {{ r.label }}
              </view>
            </view>
          </view>
          <view class="ep-filter-group">
            <text class="ep-filter-h">在线状态</text>
            <view class="ep-chips">
              <view class="ep-chip" :class="{ 'ep-chip--on': !onlyOnline }" @tap="onlyOnline = false">全部</view>
              <view class="ep-chip" :class="{ 'ep-chip--on': onlyOnline }" @tap="onlyOnline = true">仅看在线</view>
            </view>
          </view>
        </view>
        <view class="ep-sheet-foot">
          <view class="ep-sheet-reset" @tap="onResetFilter">重置</view>
          <view class="ep-sheet-confirm" @tap="showFilter = false">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateTo, navigateBack } from '@/utils/router'

const statusBarHeight = ref(20)
const systemInfo = uni.getSystemInfoSync()
statusBarHeight.value = systemInfo.statusBarHeight || 20

const searchQuery = ref('')
const activeCategory = ref('all')
const activeSort = ref('default')
const showSortMenu = ref(false)
const showFilter = ref(false)
const priceRange = ref<[number, number]>([0, 100])
const onlyOnline = ref(false)

const categories = [
  { id: 'all', name: '全部' },
  { id: 'bazi', name: '八字命理' },
  { id: 'ziwei', name: '紫微斗数' },
  { id: 'fengshui', name: '风水堪舆' },
  { id: 'name', name: '姓名学' },
  { id: 'health', name: '中医养生' },
  { id: 'taoism', name: '道家文化' },
]

const sortOptions = [
  { id: 'default', name: '综合排序' },
  { id: 'rating', name: '评分最高' },
  { id: 'consults', name: '咨询最多' },
  { id: 'price_low', name: '价格最低' },
]

const priceRanges = [
  { min: 0, max: 100, label: '不限' },
  { min: 0, max: 20, label: '0-20币' },
  { min: 20, max: 50, label: '20-50币' },
  { min: 50, max: 100, label: '50-100币' },
]

const expertsData = [
  { id: 1, name: '周易大师', isVerified: true, title: '资深命理师', tags: ['八字命理', '紫微斗数', '风水'], intro: '从业20年，擅长八字精批、流年运势分析，已服务超过10000位学员', rating: 4.9, reviews: 1286, consults: 3560, askPrice: 30, callPrice: 10, isOnline: true },
  { id: 2, name: '张玄风', isVerified: true, title: '紫微斗数传承人', tags: ['紫微斗数', '择日'], intro: '紫微斗数第四代传人，专注命盘分析与人生规划指导', rating: 4.8, reviews: 856, consults: 2180, askPrice: 50, callPrice: 15, isOnline: true },
  { id: 3, name: '陈风水', isVerified: true, title: '风水堪舆专家', tags: ['风水堪舆', '阳宅', '商业风水'], intro: '实战派风水师，擅长住宅、商铺、办公室风水布局', rating: 4.7, reviews: 628, consults: 1560, askPrice: 40, callPrice: 20, isOnline: false },
  { id: 4, name: '李姓名', isVerified: true, title: '姓名学研究者', tags: ['姓名学', '起名改名'], intro: '专注姓名学研究15年，起名改名案例超5000例', rating: 4.9, reviews: 1024, consults: 2860, askPrice: 25, callPrice: 8, isOnline: true },
  { id: 5, name: '王养生', isVerified: false, title: '中医养生顾问', tags: ['中医养生', '体质调理'], intro: '中医世家出身，擅长根据命理分析体质特点，给出养生建议', rating: 4.6, reviews: 420, consults: 980, askPrice: 20, callPrice: 10, isOnline: false },
  { id: 6, name: '道一真人', isVerified: true, title: '道家文化传播者', tags: ['道家文化', '修行指导'], intro: '武当山道士，专注道家养生与修行文化传播', rating: 4.8, reviews: 560, consults: 1280, askPrice: 35, callPrice: 12, isOnline: true },
]

const categoryMap: Record<string, string[]> = {
  bazi: ['八字命理'],
  ziwei: ['紫微斗数'],
  fengshui: ['风水堪舆', '风水', '阳宅'],
  name: ['姓名学', '起名改名'],
  health: ['中医养生', '体质调理'],
  taoism: ['道家文化', '修行指导'],
}

const currentSortName = computed(() => sortOptions.find((s) => s.id === activeSort.value)?.name || '综合排序')

const filteredExperts = computed(() => {
  return expertsData
    .filter((expert) => {
      if (searchQuery.value && !expert.name.includes(searchQuery.value) && !expert.tags.some((t) => t.includes(searchQuery.value))) return false
      if (activeCategory.value !== 'all') {
        if (!expert.tags.some((t) => categoryMap[activeCategory.value]?.some((c) => t.includes(c)))) return false
      }
      if (expert.askPrice < priceRange.value[0] || expert.askPrice > priceRange.value[1]) return false
      if (onlyOnline.value && !expert.isOnline) return false
      return true
    })
    .sort((a, b) => {
      switch (activeSort.value) {
        case 'rating': return b.rating - a.rating
        case 'consults': return b.consults - a.consults
        case 'price_low': return a.askPrice - b.askPrice
        default: return b.rating * b.consults - a.rating * a.consults
      }
    })
})

function onSelectSort(id: string) {
  activeSort.value = id
  showSortMenu.value = false
}

function onResetFilter() {
  priceRange.value = [0, 100]
  onlyOnline.value = false
}

function onAiSearch() {
  uni.showToast({ title: 'AI搜索', icon: 'none' })
}

function onAsk(expert: { name: string }) {
  uni.showToast({ title: `向${expert.name}提问`, icon: 'none' })
}

function onCall(expert: { isOnline: boolean; name: string }) {
  if (!expert.isOnline) return
  uni.showToast({ title: `与${expert.name}连麦`, icon: 'none' })
}

function goDetail(id: number) {
  navigateTo(`/expert/${id}`)
}

function goBack() {
  navigateBack()
}
</script>

<style lang="scss" scoped>
.ep-page {
  min-height: 100vh;
  background: #f7f7f7;
  padding-bottom: 24rpx;
}

/* 顶部导航 */
.ep-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(255, 255, 255, 0.97);
  border-bottom: 1rpx solid #ededed;
}
.ep-topbar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 24rpx;
  height: 96rpx;
}
.ep-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ep-search {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.ep-search-icon {
  position: absolute;
  left: 20rpx;
  z-index: 1;
}
.ep-search-input {
  width: 100%;
  height: 64rpx;
  padding: 0 64rpx;
  background: #f0f0f0;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #2c2c2c;
}
.ep-ph {
  color: #999999;
}
.ep-search-clear {
  position: absolute;
  right: 20rpx;
}
.ep-ai-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background: #faf6ee;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 分类Tab */
.ep-cats {
  white-space: nowrap;
  padding: 8rpx 24rpx;
}
.ep-cat {
  display: inline-block;
  padding: 12rpx 24rpx;
  margin-right: 16rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: #999999;
  background: #f0f0f0;
  border-radius: 999rpx;
}
.ep-cat--on {
  background: #c41e3a;
  color: #ffffff;
}

/* 排序筛选 */
.ep-toolbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  border-top: 1rpx solid #ededed;
}
.ep-sort {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.ep-sort-label {
  font-size: 26rpx;
  color: #2c2c2c;
}
.ep-rotate {
  transform: rotate(180deg);
}
.ep-filter {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.ep-filter-label {
  font-size: 26rpx;
  color: #999999;
}
.ep-sort-mask {
  position: fixed;
  inset: 0;
  z-index: 10;
}
.ep-sort-menu {
  position: absolute;
  top: 100%;
  left: 24rpx;
  margin-top: 8rpx;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.12);
  border: 1rpx solid #ededed;
  overflow: hidden;
  z-index: 20;
  min-width: 240rpx;
}
.ep-sort-item {
  padding: 22rpx 32rpx;
  font-size: 26rpx;
  color: #2c2c2c;
}
.ep-sort-item--on {
  color: #c41e3a;
  background: rgba(196, 30, 58, 0.05);
}

/* 列表 */
.ep-list {
  padding: 24rpx;
}
.ep-card {
  padding: 24rpx;
  margin-bottom: 16rpx;
  background: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.08);
}
.ep-card-top {
  display: flex;
  gap: 24rpx;
}
.ep-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.ep-avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 20rpx;
  background: #f5f1eb;
  color: #c41e3a;
  font-size: 40rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ep-online-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 28rpx;
  height: 28rpx;
  background: #22c55e;
  border-radius: 999rpx;
  border: 4rpx solid #ffffff;
}
.ep-info {
  flex: 1;
  min-width: 0;
}
.ep-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.ep-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.ep-verified {
  font-size: 18rpx;
  padding: 0 8rpx;
  background: rgba(201, 169, 110, 0.2);
  color: #c9a96e;
  border-radius: 6rpx;
  line-height: 28rpx;
}
.ep-title {
  font-size: 22rpx;
  color: #666666;
}
.ep-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 12rpx;
}
.ep-tag {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  background: #f5f1eb;
  color: #666666;
  border-radius: 6rpx;
}
.ep-intro {
  display: block;
  font-size: 22rpx;
  color: #666666;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ep-stats {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.ep-rating {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.ep-rating-val {
  font-size: 22rpx;
  color: #c9a96e;
}
.ep-stat-text {
  font-size: 22rpx;
  color: #999999;
}
.ep-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #f0ede8;
}
.ep-prices {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.ep-price-label {
  font-size: 22rpx;
  color: #666666;
}
.ep-price-val {
  color: #c41e3a;
  font-weight: 700;
}
.ep-actions {
  display: flex;
  gap: 16rpx;
}
.ep-btn-ask {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 24rpx;
  font-size: 22rpx;
  font-weight: 500;
  border: 1rpx solid #c41e3a;
  color: #c41e3a;
  border-radius: 999rpx;
}
.ep-btn-call {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 24rpx;
  font-size: 22rpx;
  font-weight: 500;
  background: #c41e3a;
  color: #ffffff;
  border-radius: 999rpx;
}
.ep-btn-call--off {
  background: #f5f1eb;
  color: #999999;
}

/* 空态 */
.ep-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
}
.ep-empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 999rpx;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.ep-empty-title {
  font-size: 26rpx;
  color: #999999;
}
.ep-empty-sub {
  font-size: 22rpx;
  color: #bbbbbb;
  margin-top: 8rpx;
}

/* 筛选弹窗 */
.ep-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
}
.ep-filter-sheet {
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
}
.ep-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid #ededed;
}
.ep-sheet-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.ep-sheet-body {
  padding: 32rpx;
}
.ep-filter-group {
  margin-bottom: 48rpx;
}
.ep-filter-h {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 24rpx;
}
.ep-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.ep-chip {
  padding: 16rpx 32rpx;
  font-size: 26rpx;
  background: #f0f0f0;
  color: #2c2c2c;
  border-radius: 16rpx;
}
.ep-chip--on {
  background: #c41e3a;
  color: #ffffff;
}
.ep-sheet-foot {
  display: flex;
  gap: 24rpx;
  padding: 32rpx;
  border-top: 1rpx solid #ededed;
}
.ep-sheet-reset {
  flex: 1;
  padding: 24rpx 0;
  text-align: center;
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
  background: #f0f0f0;
  border-radius: 20rpx;
}
.ep-sheet-confirm {
  flex: 1;
  padding: 24rpx 0;
  text-align: center;
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;
  background: #c41e3a;
  border-radius: 20rpx;
}
</style>
