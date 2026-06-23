<template>
  <view class="st-page">
    <!-- 顶部导航 -->
    <view class="st-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="st-nav">
        <view class="st-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="st-title">线下驿站</text>
        <view class="st-icon-btn" @tap="toggleView">
          <app-icon :name="viewMode === 'list' ? 'map' : 'list'" :size="20" color="#1a1a1a" />
        </view>
      </view>
      <!-- 搜索栏 -->
      <view class="st-search-wrap">
        <view class="st-search">
          <app-icon name="search" :size="16" color="#9ca3af" />
          <input v-model="keyword" class="st-search-input" placeholder="搜索驿站名称或地址" placeholder-class="st-ph" />
        </view>
      </view>
      <!-- 类型筛选 -->
      <scroll-view scroll-x class="st-types" :show-scrollbar="false">
        <view
          v-for="t in stationTypeFilters"
          :key="t.value"
          class="st-type"
          :class="{ active: selectedType === t.value }"
          @tap="selectedType = t.value"
        >
          {{ t.label }}
        </view>
      </scroll-view>
    </view>

    <scroll-view scroll-y class="st-body">
      <!-- 加载骨架 -->
      <view v-if="loading" class="st-section">
        <view v-for="i in 3" :key="i" class="st-card sk">
          <view class="st-cover sk-bg" />
          <view class="st-card-info">
            <view class="sk-line w60" />
            <view class="sk-line w40" />
            <view class="sk-line w80" />
          </view>
        </view>
      </view>

      <!-- 错误状态 -->
      <view v-else-if="error" class="st-empty">
        <app-icon name="alert-circle" :size="48" color="#ef4444" />
        <text class="st-empty-text">加载失败，请重试</text>
        <view class="st-retry-btn" @tap="retry">
          <text class="st-retry-text">重新加载</text>
        </view>
      </view>

      <template v-else>
      <!-- 附近驿站 -->
      <view v-if="showNearby" class="st-section">
        <view class="st-sec-head">
          <app-icon name="map-pin" :size="16" color="#c41e3a" />
          <text class="st-sec-title">附近驿站</text>
        </view>
        <scroll-view scroll-x class="st-nearby" :show-scrollbar="false">
          <view
            v-for="s in nearbyStations"
            :key="s.id"
            class="st-near-card"
            @tap="goDetail(s.id)"
          >
            <view class="st-near-cover">
              <app-icon name="map-pin" :size="28" color="#d8b48a" />
              <text class="st-near-dist">{{ formatDistance(s.distance) }}</text>
            </view>
            <view class="st-near-info">
              <text class="st-near-name">{{ s.name }}</text>
              <text class="st-near-addr">{{ s.address }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 全部驿站 -->
      <view class="st-section">
        <text class="st-sec-title">
          {{ keyword ? '搜索结果' : '全部驿站' }}
          <text class="st-count">({{ filteredStations.length }})</text>
        </text>

        <view v-if="filteredStations.length === 0" class="st-empty">
          <app-icon name="map-pin" :size="48" color="#d1d5db" />
          <text class="st-empty-text">暂无驿站</text>
        </view>

        <view v-else class="st-list">
          <view
            v-for="s in filteredStations"
            :key="s.id"
            class="st-card"
            @tap="goDetail(s.id)"
          >
            <view class="st-cover">
              <app-icon name="map-pin" :size="32" color="#d8b48a" />
              <view v-if="s.status !== 'open'" class="st-cover-mask">
                <text class="st-cover-mask-text">{{ s.status === 'closed' ? '暂停营业' : '装修中' }}</text>
              </view>
            </view>
            <view class="st-card-info">
              <view class="st-card-top">
                <view class="st-card-titlerow">
                  <text class="st-card-name">{{ s.name }}</text>
                  <text class="st-card-typetag">{{ getStationTypeLabel(s.type) }}</text>
                </view>
                <view class="st-fav" @tap.stop="toggleFav(s)">
                  <app-icon name="heart" :size="20" :color="s.isFavorited ? '#ef4444' : '#9ca3af'" :fill="s.isFavorited" />
                </view>
              </view>
              <view class="st-rating">
                <app-icon name="star" :size="12" color="#f59e0b" :fill="true" />
                <text class="st-rating-val">{{ s.rating }}</text>
                <text class="st-rating-cnt">({{ s.reviewCount }}评价)</text>
              </view>
              <view class="st-addr">
                <app-icon name="map-pin" :size="12" color="#9ca3af" />
                <text class="st-addr-text">{{ s.address }}</text>
              </view>
              <view class="st-facilities">
                <app-icon
                  v-for="f in s.facilities.slice(0, 4)"
                  :key="f"
                  :name="getFacilityInfo(f).icon"
                  :size="16"
                  color="#9ca3af"
                />
                <text v-if="s.facilities.length > 4" class="st-fac-more">+{{ s.facilities.length - 4 }}</text>
              </view>
              <view class="st-card-bottom">
                <text v-if="s.distance" class="st-dist">{{ formatDistance(s.distance) }}</text>
                <view class="st-navbtn" @tap.stop="onNavigate(s)">
                  <app-icon name="navigation" :size="12" color="#c41e3a" />
                  <text class="st-navbtn-text">导航</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="st-safe" />
      </template>
    </scroll-view>
  </view>

  </view>
  </view>
  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  offlineApi,
  stationTypeFilters,
  getStationTypeLabel,
  getFacilityInfo,
  formatDistance,
  type Station,
  type StationType,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

const viewMode = ref<'list' | 'map'>('list')
const selectedType = ref<StationType | 'all'>('all')
const keyword = ref('')
const stationList = ref<Station[]>([])
const loading = ref(true)
const error = ref(false)

onMounted(async () => {
  try {
    stationList.value = await offlineApi.getStations()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

const filteredStations = computed(() => {
  let list = stationList.value
  if (selectedType.value !== 'all') list = list.filter((s) => s.type === selectedType.value)
  if (keyword.value) list = list.filter((s) => s.name.includes(keyword.value) || s.address.includes(keyword.value))
  return list
})

const nearbyStations = computed(() =>
  [...stationList.value].sort((a, b) => (a.distance || 0) - (b.distance || 0)).slice(0, 3)
)
const showNearby = computed(() => !keyword.value && selectedType.value === 'all')

function toggleView() {
  viewMode.value = viewMode.value === 'list' ? 'map' : 'list'
  if (viewMode.value === 'map') uni.showToast({ title: '地图视图开发中', icon: 'none' })
}
function toggleFav(s: Station) {
  s.isFavorited = !s.isFavorited
  uni.showToast({ title: s.isFavorited ? '已收藏' : '已取消收藏', icon: 'none' })
}
function onNavigate(s: Station) {
  uni.showToast({ title: `导航到「${s.name}」`, icon: 'none' })
}
function goDetail(id: number) {
  navigateTo(`/offline/stations/${id}`)
}
async function retry() {
  error.value = false
  loading.value = true
  try {
    stationList.value = await offlineApi.getStations()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.st-page { min-height: 100vh; background: #f5f5f7; display: flex; flex-direction: column; }
.st-header { position: sticky; top: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.st-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.st-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.st-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.st-search-wrap { padding: 0 16px 12px; }
.st-search { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px; background: #f3f4f6; border-radius: 999px; }
.st-search-input { flex: 1; font-size: 14px; color: #1a1a1a; }
.st-ph { color: #9ca3af; }
.st-types { white-space: nowrap; padding: 0 16px 12px; }
.st-type { display: inline-block; padding: 6px 16px; margin-right: 8px; font-size: 14px; color: #6b7280; background: #f3f4f6; border-radius: 999px; }
.st-type.active { color: #fff; background: #c41e3a; }
.st-body { flex: 1; }
.st-section { padding: 16px; }
.st-sec-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.st-sec-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.st-count { font-size: 13px; font-weight: 400; color: #9ca3af; margin-left: 6px; }
.st-nearby { white-space: nowrap; }
.st-near-card { display: inline-block; width: 256px; margin-right: 12px; background: #fff; border-radius: 12px; overflow: hidden; vertical-align: top; }
.st-near-cover { position: relative; height: 128px; background: #f3f0ea; display: flex; align-items: center; justify-content: center; }
.st-near-dist { position: absolute; top: 8px; left: 8px; padding: 2px 8px; font-size: 11px; color: #fff; background: rgba(196,30,58,0.9); border-radius: 6px; }
.st-near-info { padding: 12px; }
.st-near-name { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.st-near-addr { display: block; font-size: 12px; color: #9ca3af; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.st-empty { padding: 48px 0; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.st-empty-text { font-size: 14px; color: #9ca3af; }
.st-list { display: flex; flex-direction: column; gap: 16px; margin-top: 12px; }
.st-card { display: flex; background: #fff; border-radius: 12px; overflow: hidden; }
.st-cover { position: relative; width: 112px; height: 112px; flex-shrink: 0; background: #f3f0ea; display: flex; align-items: center; justify-content: center; }
.st-cover-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.st-cover-mask-text { font-size: 12px; color: #fff; }
.st-card-info { flex: 1; padding: 12px; display: flex; flex-direction: column; min-width: 0; }
.st-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.st-card-titlerow { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
.st-card-name { font-size: 14px; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.st-card-typetag { flex-shrink: 0; padding: 1px 6px; font-size: 11px; color: #6b7280; border: 1px solid #e5e7eb; border-radius: 4px; }
.st-fav { padding: 2px; }
.st-rating { display: flex; align-items: center; gap: 3px; margin-top: 4px; }
.st-rating-val { font-size: 12px; color: #f59e0b; }
.st-rating-cnt { font-size: 12px; color: #9ca3af; }
.st-addr { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
.st-addr-text { font-size: 12px; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.st-facilities { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.st-fac-more { font-size: 12px; color: #9ca3af; }
.st-card-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 8px; }
.st-dist { font-size: 12px; color: #c41e3a; }
.st-navbtn { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.st-navbtn-text { font-size: 12px; color: #c41e3a; }
.st-safe { height: 24px; }
/* 骨架屏 */
.sk-bg { background: #e5e7eb; animation: sk-pulse 1.5s ease-in-out infinite; }
.sk-line { height: 14px; background: #e5e7eb; border-radius: 4px; margin-top: 8px; animation: sk-pulse 1.5s ease-in-out infinite; }
.sk-line.w60 { width: 60%; }
.sk-line.w40 { width: 40%; }
.sk-line.w80 { width: 80%; }
@keyframes sk-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.st-retry-btn { margin-top: 8px; padding: 8px 24px; background: #c41e3a; border-radius: 8px; }
.st-retry-text { font-size: 14px; color: #fff; }
</style>
