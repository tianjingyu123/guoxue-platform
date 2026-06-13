<template>
  <view class="exp-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input v-model="searchQuery" class="search-input" placeholder="搜索讲师/达人" />
          <text v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</text>
        </view>
      </view>
      <scroll-view scroll-x class="cat-row">
        <text v-for="c in categories" :key="c.id" class="cat-chip" :class="{ active: activeCat === c.id }" @click="activeCat = c.id">{{ c.name }}</text>
      </scroll-view>
      <view class="filter-row">
        <view class="sort-btn" @click="showSort = !showSort">
          <text>{{ sortLabel }}</text>
          <text class="sort-arrow" :class="{ open: showSort }">›</text>
        </view>
        <view class="filter-btn" @click="showFilter = true">
          <text>筛选</text>
        </view>
      </view>
      <view v-if="showSort" class="sort-menu">
        <view class="sort-mask" @click="showSort = false" />
        <view class="sort-list">
          <text v-for="o in sortOptions" :key="o.id" class="sort-item" :class="{ active: activeSort === o.id }" @click="activeSort = o.id; showSort = false">{{ o.name }}</text>
        </view>
      </view>
    </view>

    <view class="exp-list">
      <view v-for="e in filteredExperts" :key="e.id" class="exp-card" @click="goPage('/pages/experts/detail/index?id=' + e.id)">
        <view class="ec-top">
          <view class="ec-avatar-wrap">
            <view class="ec-avatar">{{ e.name[0] }}</view>
            <view v-if="e.isOnline" class="ec-dot" />
          </view>
          <view class="ec-info">
            <view class="ec-name-row">
              <text class="ec-name">{{ e.name }}</text>
              <text v-if="e.isVerified" class="ec-v">V</text>
              <text class="ec-title">{{ e.title }}</text>
            </view>
            <view class="ec-tags">
              <text v-for="t in e.tags.slice(0, 3)" :key="t" class="ec-tag">{{ t }}</text>
            </view>
            <text class="ec-intro">{{ e.intro }}</text>
            <view class="ec-stats">
              <text class="ec-stat">⭐ {{ e.rating }}</text>
              <text class="ec-stat">{{ e.reviews }}条评价</text>
              <text class="ec-stat">{{ e.consults }}次咨询</text>
            </view>
          </view>
        </view>
        <view class="ec-bottom">
          <view class="ec-prices">
            <text class="ec-price">提问 <text class="ec-price-val">{{ e.askPrice }}币/次</text></text>
            <text class="ec-price">连麦 <text class="ec-price-val">{{ e.callPrice }}币/分钟</text></text>
          </view>
          <view class="ec-actions">
            <view class="ec-btn ask">💬 提问</view>
            <view class="ec-btn call" :class="{ off: !e.isOnline }">{{ e.isOnline ? '📞 连麦' : '离线' }}</view>
          </view>
        </view>
      </view>

      <view v-if="filteredExperts.length === 0" class="empty-wrap">
        <text class="empty-icon">🔍</text>
        <text class="empty-text">未找到相关讲师</text>
        <text class="empty-sub">试试其他关键词或筛选条件</text>
      </view>
    </view>

    <!-- 筛选弹窗 -->
    <view v-if="showFilter" class="filter-modal" @click="showFilter = false">
      <view class="fm-panel" @click.stop>
        <view class="fm-head">
          <text class="fm-title">筛选</text>
          <text class="fm-close" @click="showFilter = false">✕</text>
        </view>
        <view class="fm-body">
          <text class="fm-label">提问价格（币/次）</text>
          <view class="fm-chips">
            <text v-for="(r, i) in priceRanges" :key="i" class="fm-chip" :class="{ active: priceRange[0] === r[0] && priceRange[1] === r[1] }" @click="priceRange = r">{{ r[0] === 0 && r[1] === 100 ? '不限' : r[0] + '-' + r[1] + '币' }}</text>
          </view>
          <text class="fm-label">在线状态</text>
          <view class="fm-chips">
            <text class="fm-chip" :class="{ active: !onlyOnline }" @click="onlyOnline = false">全部</text>
            <text class="fm-chip" :class="{ active: onlyOnline }" @click="onlyOnline = true">仅看在线</text>
          </view>
        </view>
        <view class="fm-foot">
          <view class="fm-reset" @click="priceRange = [0, 100]; onlyOnline = false">重置</view>
          <view class="fm-confirm" @click="showFilter = false">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const searchQuery = ref('')
const activeCat = ref('all')
const activeSort = ref('default')
const showSort = ref(false)
const showFilter = ref(false)
const priceRange = ref<[number, number]>([0, 100])
const onlyOnline = ref(false)

const categories = [
  { id: 'all', name: '全部' }, { id: 'bazi', name: '八字命理' }, { id: 'ziwei', name: '紫微斗数' },
  { id: 'fengshui', name: '风水堪舆' }, { id: 'name', name: '姓名学' }, { id: 'health', name: '中医养生' }, { id: 'taoism', name: '道家文化' },
]

const sortOptions = [
  { id: 'default', name: '综合排序' }, { id: 'rating', name: '评分最高' },
  { id: 'consults', name: '咨询最多' }, { id: 'price_low', name: '价格最低' },
]

const priceRanges: [number, number][] = [[0, 100], [0, 20], [20, 50], [50, 100]]

const expertsData = [
  { id: 1, name: '周易大师', isVerified: true, title: '资深命理师', tags: ['八字命理', '紫微斗数', '风水'], intro: '从业20年，擅长八字精批、流年运势分析，已服务超过10000位学员', rating: 4.9, reviews: 1286, consults: 3560, askPrice: 30, callPrice: 10, isOnline: true },
  { id: 2, name: '张玄风', isVerified: true, title: '紫微斗数传承人', tags: ['紫微斗数', '择日'], intro: '紫微斗数第四代传人，专注命盘分析与人生规划指导', rating: 4.8, reviews: 856, consults: 2180, askPrice: 50, callPrice: 15, isOnline: true },
  { id: 3, name: '陈风水', isVerified: true, title: '风水堪舆专家', tags: ['风水堪舆', '阳宅', '商业风水'], intro: '实战派风水师，擅长住宅、商铺、办公室风水布局', rating: 4.7, reviews: 628, consults: 1560, askPrice: 40, callPrice: 20, isOnline: false },
  { id: 4, name: '李姓名', isVerified: true, title: '姓名学研究者', tags: ['姓名学', '起名改名'], intro: '专注姓名学研究15年，起名改名案例超5000例', rating: 4.9, reviews: 1024, consults: 2860, askPrice: 25, callPrice: 8, isOnline: true },
  { id: 5, name: '王养生', isVerified: false, title: '中医养生顾问', tags: ['中医养生', '体质调理'], intro: '中医世家出身，擅长根据命理分析体质特点，给出养生建议', rating: 4.6, reviews: 420, consults: 980, askPrice: 20, callPrice: 10, isOnline: false },
  { id: 6, name: '道一真人', isVerified: true, title: '道家文化传播者', tags: ['道家文化', '修行指导'], intro: '武当山道士，专注道家养生与修行文化传播', rating: 4.8, reviews: 560, consults: 1280, askPrice: 35, callPrice: 12, isOnline: true },
]

const sortLabel = computed(() => sortOptions.find(s => s.id === activeSort.value)?.name || '综合排序')

const filteredExperts = computed(() => {
  let list = expertsData.filter(e => {
    if (searchQuery.value && !e.name.includes(searchQuery.value) && !e.tags.some(t => t.includes(searchQuery.value))) return false
    if (e.askPrice < priceRange.value[0] || e.askPrice > priceRange.value[1]) return false
    if (onlyOnline.value && !e.isOnline) return false
    return true
  })
  if (activeSort.value === 'rating') list.sort((a, b) => b.rating - a.rating)
  else if (activeSort.value === 'consults') list.sort((a, b) => b.consults - a.consults)
  else if (activeSort.value === 'price_low') list.sort((a, b) => a.askPrice - b.askPrice)
  else list.sort((a, b) => b.rating * b.consults - a.rating * a.consults)
  return list
})

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.exp-page { min-height: 100vh; background: #FAF8F5; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; gap: 8rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.search-box { flex: 1; display: flex; align-items: center; height: 64rpx; background: #F0EDE5; border-radius: 32rpx; padding: 0 18rpx; }
.search-icon { font-size: 24rpx; margin-right: 6rpx; }
.search-input { flex: 1; font-size: 24rpx; color: #333; }
.search-clear { font-size: 20rpx; color: #999; padding: 6rpx; }

.cat-row { display: flex; padding: 6rpx 24rpx 10rpx; white-space: nowrap; }
.cat-chip { font-size: 22rpx; color: #666; background: #F5F1EB; padding: 6rpx 18rpx; border-radius: 24rpx; margin-right: 8rpx; display: inline-block; }
.cat-chip.active { background: #C41E3A; color: #fff; }

.filter-row { display: flex; justify-content: space-between; padding: 8rpx 24rpx 10rpx; border-top: 1px solid #F0EDE5; position: relative; }
.sort-btn { display: flex; align-items: center; gap: 4rpx; font-size: 22rpx; color: #333; }
.sort-arrow { font-size: 28rpx; color: #BBB; transition: transform 0.2s; display: inline-block; }
.sort-arrow.open { transform: rotate(90deg); }
.filter-btn { font-size: 22rpx; color: #999; }

.sort-menu { position: absolute; z-index: 20; }
.sort-mask { position: fixed; inset: 0; }
.sort-list { position: absolute; top: 0; left: 0; background: #fff; border-radius: 14rpx; box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1); overflow: hidden; min-width: 180rpx; }
.sort-item { display: block; padding: 14rpx 24rpx; font-size: 24rpx; color: #333; }
.sort-item.active { color: #C41E3A; background: rgba(196,30,58,0.04); }

.exp-list { padding: 8rpx 24rpx; }
.exp-card { background: #fff; border-radius: 16rpx; padding: 18rpx 20rpx; margin-bottom: 12rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.ec-top { display: flex; gap: 14rpx; }
.ec-avatar-wrap { position: relative; flex-shrink: 0; }
.ec-avatar { width: 88rpx; height: 88rpx; border-radius: 18rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #C41E3A; }
.ec-dot { position: absolute; bottom: 0; right: 0; width: 20rpx; height: 20rpx; border-radius: 50%; background: #52C41A; border: 3rpx solid #fff; }
.ec-info { flex: 1; min-width: 0; }
.ec-name-row { display: flex; align-items: center; gap: 6rpx; margin-bottom: 4rpx; }
.ec-name { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.ec-v { font-size: 18rpx; color: #C9A96E; background: rgba(201,169,110,0.15); padding: 1rpx 6rpx; border-radius: 4rpx; }
.ec-title { font-size: 20rpx; color: #999; }
.ec-tags { display: flex; gap: 6rpx; margin-bottom: 6rpx; }
.ec-tag { font-size: 18rpx; color: #666; background: #F5F1EB; padding: 1rpx 10rpx; border-radius: 4rpx; }
.ec-intro { font-size: 20rpx; color: #999; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 6rpx; }
.ec-stats { display: flex; gap: 16rpx; }
.ec-stat { font-size: 20rpx; color: #BBB; }

.ec-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 14rpx; padding-top: 12rpx; border-top: 1px solid #F5F1EB; }
.ec-prices { display: flex; gap: 14rpx; }
.ec-price { font-size: 20rpx; color: #999; }
.ec-price-val { color: #C41E3A; font-weight: 600; }
.ec-actions { display: flex; gap: 8rpx; }
.ec-btn { padding: 6rpx 18rpx; border-radius: 24rpx; font-size: 20rpx; }
.ec-btn.ask { border: 1px solid #C41E3A; color: #C41E3A; }
.ec-btn.call { background: #C41E3A; color: #fff; }
.ec-btn.call.off { background: #F5F1EB; color: #999; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; opacity: 0.4; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 4rpx; }
.empty-sub { font-size: 22rpx; color: #BBB; }

.filter-modal { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
.fm-panel { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; }
.fm-head { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 24rpx; border-bottom: 1px solid #F0EDE5; }
.fm-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.fm-close { font-size: 36rpx; color: #999; }
.fm-body { padding: 20rpx 24rpx; }
.fm-label { font-size: 24rpx; font-weight: 500; color: #333; display: block; margin-bottom: 12rpx; }
.fm-chips { display: flex; gap: 10rpx; margin-bottom: 24rpx; }
.fm-chip { font-size: 22rpx; color: #666; background: #F5F1EB; padding: 10rpx 24rpx; border-radius: 24rpx; }
.fm-chip.active { background: #C41E3A; color: #fff; }
.fm-foot { display: flex; gap: 16rpx; padding: 16rpx 24rpx 24rpx; border-top: 1px solid #F0EDE5; }
.fm-reset { flex: 1; padding: 16rpx; text-align: center; background: #F5F1EB; border-radius: 20rpx; font-size: 26rpx; color: #666; }
.fm-confirm { flex: 1; padding: 16rpx; text-align: center; background: #C41E3A; border-radius: 20rpx; font-size: 26rpx; color: #fff; }
</style>
