<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-row">
        <text
          class="back-btn"
          @click="goBack"
        >
          ←
        </text>
        <text class="header-title">
          线下驿站
        </text>
        <view class="header-right">
          <text
            class="view-toggle"
            @click="viewMode = viewMode === 'list' ? 'map' : 'list'"
          >
            {{ viewMode === 'list' ? '🗺' : '☰' }}
          </text>
        </view>
      </view>
      <!-- 搜索栏 -->
      <view class="search-wrap">
        <text class="search-icon">
          🔍
        </text>
        <input
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索驿站名称或地址"
        >
      </view>
      <!-- 类型筛选 -->
      <scroll-view
        scroll-x
        class="type-scroll"
        show-scrollbar="false"
      >
        <view class="type-inner">
          <text
            v-for="t in stationTypes"
            :key="t.value"
            class="type-tab"
            :class="{ active: selectedType === t.value }"
            @click="selectedType = t.value"
          >
            {{ t.label }}
          </text>
        </view>
      </scroll-view>
    </view>

    <!-- 地图视图 -->
    <view
      v-if="viewMode === 'map'"
      class="map-view"
    >
      <map
        :latitude="userLocation?.lat || 39.9042"
        :longitude="userLocation?.lng || 116.4074"
        :markers="mapMarkers"
        class="map-inner"
        @markertap="onMarkerTap"
      />
    </view>

    <!-- 列表视图 -->
    <view
      v-else
      class="content"
    >
      <!-- 附近推荐 -->
      <view
        v-if="nearbyStations.length && !searchKeyword && selectedType === 'all'"
        class="section"
      >
        <view class="section-title-row">
          <text class="section-title">
            📍 附近驿站
          </text>
        </view>
        <scroll-view
          scroll-x
          class="nearby-scroll"
          show-scrollbar="false"
        >
          <view class="nearby-inner">
            <view
              v-for="s in nearbyStations"
              :key="s.id"
              class="nearby-card"
              @click="goStation(s)"
            >
              <image
                :src="s.cover"
                class="nearby-cover"
                mode="aspectFill"
              />
              <view class="nearby-dist">
                {{ formatDistance(s.distance) }}
              </view>
              <view class="nearby-info">
                <text class="nearby-name">
                  {{ s.name }}
                </text>
                <text class="nearby-addr">
                  {{ s.address }}
                </text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 驿站列表 -->
      <view class="section">
        <view class="section-title-row">
          <text class="section-title">
            {{ searchKeyword ? '搜索结果' : '全部驿站' }}
          </text>
          <text
            v-if="!isLoading"
            class="section-count"
          >
            ({{ stations.length }})
          </text>
        </view>

        <DataState
          :is-loading="isLoading && stations.length === 0"
          :is-empty="!isLoading && stations.length === 0"
          empty-icon="📍"
          empty-title="暂无驿站"
          skeleton-type="list"
          @retry="loadStations"
        >
          <view class="station-list">
            <view
              v-for="s in stations"
              :key="s.id"
              class="station-card"
              @click="goStation(s)"
            >
              <view class="station-cover-wrap">
                <image
                  :src="s.cover"
                  class="station-cover"
                  mode="aspectFill"
                />
                <view
                  v-if="s.status !== 'open'"
                  class="station-status-overlay"
                >
                  <text class="station-status-text">
                    {{ s.status === 'closed' ? '暂停营业' : '装修中' }}
                  </text>
                </view>
              </view>
              <view class="station-body">
                <view class="station-top">
                  <view class="station-name-row">
                    <text class="station-name">
                      {{ s.name }}
                    </text>
                    <text class="station-type-tag">
                      {{ getStationTypeLabel(s.type) }}
                    </text>
                  </view>
                  <view class="station-rating">
                    <text class="star">
                      ⭐
                    </text>
                    <text class="rating-num">
                      {{ s.rating }}
                    </text>
                    <text class="rating-count">
                      ({{ s.reviewCount }}评价)
                    </text>
                  </view>
                </view>
                <view class="station-addr-row">
                  <text>📍 {{ s.address }}</text>
                </view>
                <view class="station-facilities">
                  <text
                    v-for="f in s.facilities?.slice(0, 4)"
                    :key="f"
                    class="facility-icon"
                    :title="f"
                  >
                    {{ facilityIcons[f] || '•' }}
                  </text>
                  <text
                    v-if="s.facilities?.length > 4"
                    class="facility-more"
                  >
                    +{{ s.facilities.length - 4 }}
                  </text>
                </view>
                <view class="station-bottom">
                  <text
                    v-if="s.distance"
                    class="station-dist"
                  >
                    {{ formatDistance(s.distance) }}
                  </text>
                  <text
                    class="station-nav"
                    @click.stop="handleNavigate(s)"
                  >
                    🧭 导航
                  </text>
                </view>
              </view>
            </view>
          </view>
        </DataState>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { offlineApi } from '../../api'
import DataState from '../../components/DataState.vue'

interface Station {
  id: number
  name: string
  type: string
  cover: string
  address: string
  rating: number
  reviewCount: number
  distance?: number
  facilities?: string[]
  status?: string
  isFavorited?: boolean
  latitude?: number
  longitude?: number
}

const stationTypes = [
  { value: 'all', label: '全部' },
  { value: 'center', label: '国学中心' },
  { value: 'academy', label: '书院' },
  { value: 'studio', label: '工作室' },
  { value: 'partner', label: '合作点' },
]

const facilityIcons: Record<string, string> = {
  wifi: '📶',
  parking: '🚗',
  tea: '☕',
  library: '📖',
  classroom: '👥',
  consultation: '💬',
}

const viewMode = ref<'list' | 'map'>('list')
const selectedType = ref('all')
const searchKeyword = ref('')
const stations = ref<Station[]>([])
const nearbyStations = ref<Station[]>([])
const isLoading = ref(false)
const userLocation = ref<{ lat: number; lng: number } | null>(null)

onMounted(() => {
  uni.getLocation({
    type: 'gcj02',
    success: (res) => {
      userLocation.value = { lat: res.latitude, lng: res.longitude }
    },
    fail: () => {
      userLocation.value = { lat: 39.9042, lng: 116.4074 }
    },
  })
})

watch([selectedType, searchKeyword], () => { loadStations() })
watch(userLocation, (loc) => { if (loc) loadNearbyStations() })

const mapMarkers = computed(() =>
  stations.value.map(s => ({
    id: s.id,
    latitude: s.latitude || 39.9042,
    longitude: s.longitude || 116.4074,
    title: s.name,
  }))
)

async function loadStations() {
  isLoading.value = true
  try {
    const res: any = await offlineApi.stations({
      type: selectedType.value === 'all' ? undefined : selectedType.value,
      keyword: searchKeyword.value || undefined,
    })
    stations.value = Array.isArray(res) ? res : res?.list || res?.data || []
  } catch (e: any) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

async function loadNearbyStations() {
  if (!userLocation.value) return
  try {
    const res: any = await offlineApi.discover({
      lat: userLocation.value.lat,
      lng: userLocation.value.lng,
      radius: 3,
    })
    nearbyStations.value = Array.isArray(res) ? res : res?.list || res?.data || []
  } catch (e: any) {
    console.error(e)
  }
}

function goStation(s: Station) {
  uni.navigateTo({ url: `/pages/offline/station-detail?id=${s.id}` })
}

function handleNavigate(s: Station) {
  if (s.latitude && s.longitude) {
    uni.openLocation({ latitude: s.latitude, longitude: s.longitude })
  }
}

function onMarkerTap(e: any) {
  const id = e?.detail?.markerId
  if (id) {
    const s = stations.value.find(st => st.id === id)
    if (s) goStation(s)
  }
}

function goBack() {
  uni.navigateBack()
}

function getStationTypeLabel(type: string): string {
  const map: Record<string, string> = {
    center: '国学中心',
    academy: '书院',
    studio: '工作室',
    partner: '合作点',
  }
  return map[type] || type
}

function formatDistance(dist?: number): string {
  if (dist === undefined || dist === null) return ''
  if (dist < 1) return `${Math.round(dist * 1000)}m`
  return `${dist.toFixed(1)}km`
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 20rpx;
}
.header {
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1rpx solid #E5E1DB;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 24rpx 0;
}
.back-btn { font-size: 36rpx; }
.header-title { font-size: 32rpx; font-weight: 600; }
.header-right { display: flex; gap: 12rpx; }
.view-toggle { font-size: 36rpx; padding: 8rpx; }

.search-wrap {
  position: relative;
  margin: 16rpx 24rpx;
}
.search-icon {
  position: absolute;
  left: 20rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 28rpx;
}
.search-input {
  width: 100%;
  height: 64rpx;
  background: #F5F0E8;
  border-radius: 32rpx;
  padding-left: 60rpx;
  font-size: 26rpx;
  border: none;
  box-sizing: border-box;
}

.type-scroll {
  white-space: nowrap;
  padding: 0 24rpx 16rpx;
}
.type-inner { display: inline-flex; gap: 12rpx; }
.type-tab {
  display: inline-block;
  font-size: 26rpx;
  color: #666;
  padding: 10rpx 28rpx;
  border-radius: 28rpx;
  background: #F5F0E8;
  border: 1rpx solid #E8E0D5;
}
.type-tab.active {
  background: linear-gradient(135deg, #C41E3A, #A01830);
  color: #fff;
  border-color: #C41E3A;
}

.map-view { padding: 0 24rpx 24rpx; }
.map-inner { width: 100%; height: 600rpx; border-radius: 16rpx; }

.content { padding: 0 24rpx; }
.section { margin-bottom: 24rpx; }
.section-title-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; }
.section-count { font-size: 24rpx; color: #999; }

.nearby-scroll { white-space: nowrap; margin: 0 -24rpx; padding: 0 24rpx; }
.nearby-inner { display: inline-flex; gap: 16rpx; }
.nearby-card {
  display: inline-block;
  width: 380rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.06);
}
.nearby-cover { width: 100%; height: 200rpx; }
.nearby-dist {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  background: rgba(196,30,58,0.9);
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}
.nearby-info { padding: 12rpx 16rpx; }
.nearby-name { font-size: 26rpx; font-weight: 500; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nearby-addr { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.station-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}
.station-cover-wrap {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  flex-shrink: 0;
}
.station-card { display: flex; }
.station-cover { width: 100%; height: 100%; }
.station-status-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.station-status-text { color: #fff; font-size: 22rpx; }
.station-body { flex: 1; padding: 16rpx 20rpx; display: flex; flex-direction: column; min-width: 0; }
.station-name-row { display: flex; align-items: center; gap: 8rpx; }
.station-name { font-size: 26rpx; font-weight: 500; }
.station-type-tag {
  font-size: 20rpx;
  color: #C41E3A;
  background: rgba(196,30,58,0.1);
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
}
.station-rating {
  display: flex;
  align-items: center;
  gap: 4rpx;
  margin-top: 4rpx;
}
.star { font-size: 20rpx; }
.rating-num { font-size: 22rpx; color: #C9A96E; font-weight: 500; }
.rating-count { font-size: 20rpx; color: #999; }
.station-addr-row { font-size: 22rpx; color: #999; margin-top: 8rpx; }
.station-facilities { display: flex; gap: 8rpx; margin-top: 8rpx; align-items: center; }
.facility-icon { font-size: 24rpx; }
.facility-more { font-size: 20rpx; color: #999; }
.station-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 8rpx;
}
.station-dist { font-size: 22rpx; color: #C41E3A; }
.station-nav { font-size: 22rpx; color: #C41E3A; }
</style>
