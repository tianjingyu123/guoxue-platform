<script setup lang="ts">
/**
 * 同城发现·Feed（从原型 app/same-city/feed/page.tsx 575行 分级迁移）
 * 头部(城市切换+刷新) + 类型筛选tab + 内容卡片列表 + 城市选择弹层(热门城市)
 * 分级说明：主列表/筛选/城市切换完整；卡片详情跳转→toast占位(详情页未迁)
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  mockFeedItems, mockHotCities, filterTabs,
  getContentTypeLabel, getContentTypeColor, getTypeIconName, formatDistance,
  type SameCityItem, type SameCityContentType,
} from '@/lib/same-city-data'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch (e) { statusBarHeight.value = 0 }

const currentCity = ref('北京')
const activeTab = ref<SameCityContentType | 'all'>('all')
const refreshing = ref(false)
const showCityPicker = ref(false)
// 定位失败提示（H5/小程序预览无真实定位，默认 true，与原型预览态一致；原型 locationError 控制）
const locationError = ref(true)

function requestLocation() {
  locationError.value = false
  uni.getLocation({
    type: 'gcj02',
    success: () => { locationError.value = false },
    fail: () => { locationError.value = true },
  })
}

const items = computed(() =>
  activeTab.value === 'all'
    ? mockFeedItems
    : mockFeedItems.filter((i) => i.type === activeTab.value),
)

function onRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  setTimeout(() => {
    refreshing.value = false
    uni.showToast({ title: '已刷新', icon: 'none' })
  }, 800)
}

function pickCity(name: string) {
  currentCity.value = name
  showCityPicker.value = false
}

function openDetail(item: SameCityItem) {
  uni.showToast({ title: `${getContentTypeLabel(item.type)}详情待迁移`, icon: 'none' })
}

function onNavigate(item: SameCityItem) {
  uni.showToast({ title: `导航前往「${item.location.name}」`, icon: 'none' })
}

function dateOnly(t?: string) { return t ? t.split(' ')[0] : '' }
</script>

<template>
  <view class="sc">
    <!-- 头部 -->
    <view class="sc-header" :style="{ paddingTop: statusBarHeight + 12 + 'px' }">
      <view class="sc-header-row">
        <view class="sc-back" @tap="goBack">
          <app-icon name="chevron-left" :size="40" color="#2C2C2C" />
        </view>
        <view class="sc-city" @tap="showCityPicker = true">
          <app-icon name="map-pin" :size="30" color="#C9A86A" />
          <text class="sc-city-name">{{ currentCity }}</text>
          <app-icon name="chevron-down" :size="28" color="#999999" />
        </view>
        <view class="sc-flex" />
        <view class="sc-refresh" :class="{ spinning: refreshing }" @tap="onRefresh">
          <app-icon name="refresh-cw" :size="36" color="#666666" />
        </view>
      </view>

      <!-- 定位失败提示（对应原型 locationError，bg-amber-50 text-amber-800） -->
      <view v-if="locationError" class="sc-locerr">
        <text class="sc-locerr-txt">定位失败，请手动选择城市</text>
        <text class="sc-locerr-retry" @tap="requestLocation">重试</text>
      </view>

      <!-- 类型筛选 tab -->
      <scroll-view scroll-x class="sc-tabs" :show-scrollbar="false">
        <view class="sc-tabs-row">
          <view
            v-for="t in filterTabs"
            :key="t.key"
            class="sc-tab"
            :class="{ on: activeTab === t.key }"
            @tap="activeTab = t.key"
          >
            <text class="sc-tab-txt" :class="{ on: activeTab === t.key }">{{ t.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 内容列表 -->
    <scroll-view scroll-y class="sc-scroll">
      <view v-if="items.length === 0" class="sc-empty">
        <app-icon name="compass" :size="80" color="#CCCCCC" />
        <text class="sc-empty-txt">暂无附近内容</text>
        <text class="sc-empty-sub">换个城市或类型试试</text>
      </view>

      <view v-else class="sc-list">
        <view v-for="item in items" :key="item.id" class="sc-card" @tap="openDetail(item)">
          <view class="sc-cover-wrap">
            <image :src="item.cover" class="sc-cover" mode="aspectFill" />
            <view class="sc-type" :style="{ color: getContentTypeColor(item.type).color, background: getContentTypeColor(item.type).bg }">
              <text class="sc-type-txt" :style="{ color: getContentTypeColor(item.type).color }">{{ getContentTypeLabel(item.type) }}</text>
            </view>
            <view v-if="item.location.distance !== undefined" class="sc-dist" @tap.stop="onNavigate(item)">
              <app-icon name="navigation" :size="22" color="#FFFFFF" />
              <text class="sc-dist-txt">{{ formatDistance(item.location.distance) }}</text>
            </view>
            <view v-if="item.type === 'video'" class="sc-play">
              <app-icon name="play" :size="44" color="#FFFFFF" />
            </view>
            <view v-if="item.price !== undefined || item.isFree" class="sc-price">
              <text class="sc-price-txt">{{ item.isFree ? '免费' : '¥' + item.price }}</text>
            </view>
          </view>

          <view class="sc-body">
            <text class="sc-card-title">{{ item.title }}</text>
            <text v-if="item.description" class="sc-card-desc">{{ item.description }}</text>

            <view v-if="item.startTime" class="sc-meta-row">
              <app-icon name="calendar" :size="24" color="#999999" />
              <text class="sc-meta-txt">{{ dateOnly(item.startTime) }}</text>
              <text v-if="item.status" class="sc-status">· {{ item.status }}</text>
            </view>

            <view class="sc-meta-row">
              <app-icon name="map-pin" :size="24" color="#999999" />
              <text class="sc-meta-txt sc-ellipsis">{{ item.location.name }}</text>
            </view>

            <view class="sc-foot">
              <view class="sc-stats">
                <view v-if="item.participantCount !== undefined" class="sc-stat">
                  <app-icon name="users" :size="22" color="#999999" />
                  <text class="sc-stat-txt">{{ item.participantCount }}</text>
                </view>
                <view v-if="item.viewCount !== undefined" class="sc-stat">
                  <app-icon name="eye" :size="22" color="#999999" />
                  <text class="sc-stat-txt">{{ item.viewCount }}</text>
                </view>
                <view v-if="item.likeCount !== undefined" class="sc-stat">
                  <app-icon name="heart" :size="22" color="#999999" />
                  <text class="sc-stat-txt">{{ item.likeCount }}</text>
                </view>
              </view>
              <view v-if="item.author" class="sc-author">
                <image :src="item.author.avatar" class="sc-author-avatar" mode="aspectFill" />
                <text class="sc-author-name">{{ item.author.name }}</text>
              </view>
            </view>

            <view v-if="item.tags && item.tags.length" class="sc-tags">
              <view v-for="(tag, i) in item.tags.slice(0, 3)" :key="i" class="sc-tag">
                <text class="sc-tag-txt">{{ tag }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="sc-bottom" />
    </scroll-view>

    <!-- 城市选择弹层 -->
    <view v-if="showCityPicker" class="sc-mask" @tap="showCityPicker = false">
      <view class="sc-sheet" @tap.stop>
        <view class="sc-sheet-head">
          <text class="sc-sheet-title">选择城市</text>
          <view @tap="showCityPicker = false"><app-icon name="x" :size="36" color="#999999" /></view>
        </view>
        <view class="sc-cur">
          <app-icon name="map-pin" :size="28" color="#C9A86A" />
          <text class="sc-cur-txt">当前定位：{{ currentCity }}</text>
        </view>
        <text class="sc-sheet-label">热门城市</text>
        <view class="sc-city-grid">
          <view
            v-for="c in mockHotCities"
            :key="c.code"
            class="sc-city-item"
            :class="{ on: currentCity === c.name }"
            @tap="pickCity(c.name)"
          >
            <text class="sc-city-item-txt" :class="{ on: currentCity === c.name }">{{ c.name }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.sc {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F5F5F5;
}
.sc-header {
  background: #FFFFFF;
  border-bottom: 2rpx solid #EEEEEE;
}
.sc-header-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 24rpx;
}
.sc-back { padding: 6rpx; }
.sc-city {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.sc-city-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.sc-flex { flex: 1; }
.sc-refresh { padding: 10rpx; }
.sc-refresh.spinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

  /* 定位失败提示条：对应原型 bg-amber-50 text-amber-800 */
  .sc-locerr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background-color: #FFFBEB;
  }
  .sc-locerr-txt { font-size: 26rpx; color: #92400E; }
  .sc-locerr-retry { font-size: 24rpx; color: #C9A86A; }

  .sc-tabs { white-space: nowrap; }
.sc-tabs-row {
  display: flex;
  gap: 16rpx;
  padding: 8rpx 24rpx 20rpx;
}
.sc-tab {
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background: #F0F0F0;
}
.sc-tab.on { background: #C9A86A; }
.sc-tab-txt {
  font-size: 26rpx;
  color: #666666;
}
.sc-tab-txt.on { color: #FFFFFF; }

.sc-scroll { flex: 1; }
.sc-list {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.sc-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
  border: 2rpx solid #EEEEEE;
}
.sc-cover-wrap {
  position: relative;
  width: 100%;
  height: 340rpx;
  background-color: #E5E5E5; /* 空封面时显示灰底占位，匹配原型 placeholder.svg 观感 */
}
.sc-cover { width: 100%; height: 100%; }
.sc-type {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}
.sc-type-txt { font-size: 22rpx; font-weight: 500; }
.sc-dist {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: rgba(0, 0, 0, 0.6);
}
.sc-dist-txt { font-size: 22rpx; color: #FFFFFF; }
.sc-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.sc-price {
  position: absolute;
  bottom: 16rpx;
  right: 16rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  background: #C9A86A;
}
.sc-price-txt { font-size: 24rpx; font-weight: 600; color: #FFFFFF; }

.sc-body { padding: 20rpx; }
.sc-card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #2C2C2C;
  line-height: 1.4;
  margin-bottom: 8rpx;
}
.sc-card-desc {
  display: block;
  font-size: 26rpx;
  color: #888888;
  line-height: 1.5;
  margin-bottom: 14rpx;
}
.sc-meta-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 10rpx;
}
.sc-meta-txt { font-size: 24rpx; color: #999999; }
.sc-ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 480rpx;
}
.sc-status { font-size: 24rpx; color: #C9A86A; }
.sc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6rpx;
}
.sc-stats { display: flex; gap: 24rpx; }
.sc-stat { display: flex; align-items: center; gap: 4rpx; }
.sc-stat-txt { font-size: 22rpx; color: #999999; }
.sc-author { display: flex; align-items: center; gap: 8rpx; }
.sc-author-avatar { width: 36rpx; height: 36rpx; border-radius: 50%; background-color: #E5E5E5; }
.sc-author-name { font-size: 22rpx; color: #999999; }
.sc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 14rpx;
}
.sc-tag {
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  background: #F5F5F5;
}
.sc-tag-txt { font-size: 22rpx; color: #999999; }

.sc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  gap: 16rpx;
}
.sc-empty-txt { font-size: 28rpx; color: #999999; }
.sc-empty-sub { font-size: 24rpx; color: #CCCCCC; }
.sc-bottom { height: 40rpx; }

.sc-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.sc-sheet {
  width: 100%;
  background: #FFFFFF;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 24rpx calc(40rpx + env(safe-area-inset-bottom));
}
.sc-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.sc-sheet-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.sc-cur {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 20rpx;
  background: rgba(201, 168, 106, 0.08);
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}
.sc-cur-txt { font-size: 26rpx; color: #2C2C2C; }
.sc-sheet-label { display: block; font-size: 24rpx; color: #999999; margin-bottom: 16rpx; }
.sc-city-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.sc-city-item {
  padding: 18rpx 0;
  text-align: center;
  border-radius: 12rpx;
  border: 2rpx solid #EEEEEE;
}
.sc-city-item.on { border-color: #C9A86A; background: rgba(201, 168, 106, 0.08); }
.sc-city-item-txt { font-size: 26rpx; color: #2C2C2C; }
.sc-city-item-txt.on { color: #C9A86A; }
</style>
