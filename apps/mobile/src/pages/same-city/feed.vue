<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <view class="header-row">
        <text
          class="back-btn"
          @click="goBack"
        >
          ←
        </text>
        <view
          class="city-selector"
          @click="showCitySelector = true"
        >
          <text class="city-icon">
            📍
          </text>
          <text class="city-name">
            {{ locating ? '定位中...' : currentCity }}
          </text>
          <text class="city-arrow">
            ▼
          </text>
        </view>
        <view class="header-spacer" />
        <text
          class="refresh-btn"
          :class="{ spinning: refreshing }"
          @click="loadData(true)"
        >
          🔄
        </text>
      </view>
      <!-- 定位失败提示 -->
      <view
        v-if="locationError"
        class="loc-error"
      >
        <text>定位失败，请手动选择城市</text>
        <text
          class="loc-retry"
          @click="requestLocation"
        >
          重试
        </text>
      </view>
      <!-- 筛选 Tab -->
      <scroll-view
        scroll-x
        class="tabs-scroll"
        show-scrollbar="false"
      >
        <view class="tabs-inner">
          <text
            v-for="tab in filterTabs"
            :key="tab.key"
            class="tab"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key; loadData()"
          >
            {{ tab.label }}
          </text>
        </view>
      </scroll-view>
    </view>

    <!-- 内容列表 -->
    <DataState
      :is-loading="loading && items.length === 0"
      :is-empty="!loading && items.length === 0"
      empty-icon="🧭"
      empty-title="暂无附近内容"
      empty-description="换个城市或类型试试"
      skeleton-type="card"
      @retry="loadData"
    >
      <view class="feed-list">
        <view
          v-for="item in items"
          :key="item.id"
          class="feed-card"
          @click="handleClick(item)"
        >
          <!-- 封面 -->
          <view class="fc-cover-wrap">
            <image
              :src="item.cover"
              class="fc-cover"
              mode="aspectFill"
            />
            <view
              class="fc-type-badge"
              :class="'type-' + item.type"
            >
              <text>{{ getContentTypeLabel(item.type) }}</text>
            </view>
            <view
              v-if="item.distance"
              class="fc-distance"
              @click.stop="handleNavigate(item)"
            >
              <text>🧭 {{ formatDistance(item.distance) }}</text>
            </view>
            <view
              v-if="item.type === 'video'"
              class="fc-play-btn"
            >
              <text class="fc-play-icon">
                ▶
              </text>
            </view>
            <view
              v-if="item.price !== undefined || item.isFree"
              class="fc-price-tag"
            >
              <text>{{ item.isFree ? '免费' : '¥' + item.price }}</text>
            </view>
          </view>
          <!-- 内容 -->
          <view class="fc-body">
            <text class="fc-title">
              {{ item.title }}
            </text>
            <text
              v-if="item.description"
              class="fc-desc"
            >
              {{ item.description }}
            </text>
            <view
              v-if="item.startTime"
              class="fc-meta-row"
            >
              <text>📅 {{ item.startTime.split(' ')[0] }}</text>
              <text
                v-if="item.status"
                class="fc-status-text"
              >
                · {{ item.status }}
              </text>
            </view>
            <view class="fc-meta-row">
              <text>📍 {{ item.location?.name || '' }}</text>
            </view>
            <view class="fc-footer">
              <view class="fc-stats">
                <text v-if="item.participantCount">
                  👥 {{ item.participantCount }}人
                </text>
                <text v-if="item.viewCount">
                  👁 {{ item.viewCount }}
                </text>
                <text v-if="item.likeCount">
                  ❤ {{ item.likeCount }}
                </text>
                <text v-if="item.commentCount">
                  💬 {{ item.commentCount }}
                </text>
              </view>
              <view
                v-if="item.author"
                class="fc-author"
              >
                <image
                  :src="item.author.avatar"
                  class="fc-avatar"
                  mode="aspectFill"
                />
                <text class="fc-author-name">
                  {{ item.author.name }}
                </text>
              </view>
            </view>
            <view
              v-if="item.tags?.length"
              class="fc-tags"
            >
              <text
                v-for="(tag, ti) in item.tags.slice(0, 3)"
                :key="ti"
                class="fc-tag"
              >
                {{ tag }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </DataState>

    <!-- 城市选择器 -->
    <view
      v-if="showCitySelector"
      class="city-mask"
      @click="showCitySelector = false"
    >
      <view
        class="city-sheet"
        @click.stop
      >
        <view class="city-header">
          <text class="city-title">
            选择城市
          </text>
          <text @click="showCitySelector = false">
            ✕
          </text>
        </view>
        <view class="city-search-wrap">
          <text class="city-search-icon">
            🔍
          </text>
          <input
            v-model="cityKeyword"
            class="city-search-input"
            placeholder="搜索城市"
          >
        </view>
        <scroll-view
          scroll-y
          class="city-list-scroll"
        >
          <view class="city-section">
            <text class="city-section-title">
              当前定位
            </text>
            <view class="city-current">
              <text>📍</text>
              <text class="city-current-name">
                {{ currentCity || '定位中...' }}
              </text>
            </view>
          </view>
          <view
            v-if="!cityKeyword"
            class="city-section"
          >
            <text class="city-section-title">
              热门城市
            </text>
            <view class="city-grid">
              <text
                v-for="c in hotCities"
                :key="c.code"
                class="city-item"
                :class="{ active: currentCity === c.name }"
                @click="selectCity(c.name)"
              >
                {{ c.name }}
              </text>
            </view>
          </view>
          <view class="city-section">
            <text class="city-section-title">
              {{ cityKeyword ? '搜索结果' : '全部城市' }}
            </text>
            <view
              v-if="filteredCities.length"
              class="city-grid"
            >
              <text
                v-for="c in filteredCities"
                :key="c.code"
                class="city-item"
                :class="{ active: currentCity === c.name }"
                @click="selectCity(c.name)"
              >
                {{ c.name }}
              </text>
            </view>
            <text
              v-else-if="cityKeyword"
              class="city-empty"
            >
              未找到相关城市
            </text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { sameCityApi } from '../../api'
import DataState from '../../components/DataState.vue'

interface FeedItem {
  id: number
  type: string
  title: string
  description?: string
  cover: string
  startTime?: string
  price?: number
  isFree?: boolean
  status?: string
  distance?: number
  viewCount?: number
  likeCount?: number
  commentCount?: number
  participantCount?: number
  location?: { name: string; distance?: number; latitude?: number; longitude?: number }
  author?: { avatar: string; name: string }
  tags?: string[]
}

const filterTabs = [
  { key: 'all', label: '全部' },
  { key: 'activity', label: '活动' },
  { key: 'course', label: '课程' },
  { key: 'circle', label: '圈子' },
  { key: 'station', label: '驿站' },
]

const items = ref<FeedItem[]>([])
const currentCity = ref('北京')
const activeTab = ref('all')
const loading = ref(false)
const refreshing = ref(false)
const locating = ref(false)
const locationError = ref(false)
const showCitySelector = ref(false)
const cityKeyword = ref('')
const location = ref<{ latitude: number; longitude: number } | null>(null)

const hotCities = [
  { code: '110000', name: '北京' },
  { code: '310000', name: '上海' },
  { code: '440100', name: '广州' },
  { code: '440300', name: '深圳' },
  { code: '330100', name: '杭州' },
  { code: '320500', name: '苏州' },
  { code: '510100', name: '成都' },
  { code: '420100', name: '武汉' },
]

const allCities = [
  { code: '110000', name: '北京' },
  { code: '310000', name: '上海' },
  { code: '440100', name: '广州' },
  { code: '440300', name: '深圳' },
  { code: '330100', name: '杭州' },
  { code: '320500', name: '苏州' },
  { code: '510100', name: '成都' },
  { code: '420100', name: '武汉' },
  { code: '120000', name: '天津' },
  { code: '500000', name: '重庆' },
  { code: '320100', name: '南京' },
  { code: '610100', name: '西安' },
  { code: '410100', name: '郑州' },
  { code: '430100', name: '长沙' },
  { code: '440600', name: '佛山' },
  { code: '350200', name: '厦门' },
  { code: '370200', name: '青岛' },
  { code: '440500', name: '汕头' },
  { code: '441900', name: '东莞' },
  { code: '330200', name: '宁波' },
]

const filteredCities = computed(() => {
  if (!cityKeyword.value) return allCities
  return allCities.filter(c => c.name.includes(cityKeyword.value))
})

onMounted(() => {
  requestLocation()
})

function requestLocation() {
  locating.value = true
  locationError.value = false
  // 在uni-app中使用uni.getLocation
  uni.getLocation({
    type: 'gcj02',
    success: (res) => {
      location.value = { latitude: res.latitude, longitude: res.longitude }
      currentCity.value = '北京' // 简化处理
      locating.value = false
      loadData()
    },
    fail: () => {
      locating.value = false
      locationError.value = true
      loadData()
    },
  })
}

async function loadData(refresh = false) {
  if (refresh) refreshing.value = true
  else loading.value = true
  try {
    const res: any = await sameCityApi.feed({
      lat: location.value?.latitude,
      lng: location.value?.longitude,
      type: activeTab.value === 'all' ? undefined : activeTab.value,
      page: 1,
    })
    items.value = Array.isArray(res) ? res : res?.list || res?.data || []
  } catch (e: any) {
    console.error(e)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function handleClick(item: FeedItem) {
  const routes: Record<string, string> = {
    activity: `/pages/activity/detail?id=${item.id}`,
    course: `/pages/offline/course-detail?id=${item.id}`,
    circle: `/pages/circles/detail?id=${item.id}`,
    station: `/pages/offline/station-detail?id=${item.id}`,
  }
  const url = routes[item.type] || `/pages/same-city/detail?id=${item.id}`
  uni.navigateTo({ url })
}

function handleNavigate(item: FeedItem) {
  const { latitude, longitude } = item.location || {}
  if (latitude && longitude) {
    uni.openLocation({ latitude, longitude })
  }
}

function selectCity(name: string) {
  currentCity.value = name
  showCitySelector.value = false
  loadData()
}

function goBack() {
  uni.navigateBack()
}

function getContentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    activity: '活动',
    course: '课程',
    circle: '圈子',
    station: '驿站',
    article: '文章',
    video: '视频',
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
}
.header {
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1rpx solid #E5E1DB;
}
.header-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 24rpx 0;
}
.back-btn { font-size: 36rpx; padding: 4rpx; }
.city-selector {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.city-icon { font-size: 28rpx; }
.city-name { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.city-arrow { font-size: 24rpx; color: #999; }
.header-spacer { flex: 1; }
.refresh-btn { font-size: 36rpx; padding: 8rpx; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
.loc-error {
  margin: 8rpx 24rpx 0;
  padding: 12rpx 16rpx;
  background: #fef3e2;
  border-radius: 8rpx;
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #b85c00;
}
.loc-retry { color: #C41E3A; font-size: 22rpx; }

.tabs-scroll {
  white-space: nowrap;
  padding: 16rpx 24rpx;
}
.tabs-inner {
  display: inline-flex;
  gap: 16rpx;
}
.tab {
  display: inline-block;
  font-size: 26rpx;
  color: #666;
  padding: 10rpx 28rpx;
  border-radius: 28rpx;
  background: #F5F0E8;
  border: 1rpx solid #E8E0D5;
}
.tab.active {
  background: linear-gradient(135deg, #C41E3A, #A01830);
  color: #fff;
  font-weight: 600;
  border-color: #C41E3A;
}

.feed-list { padding: 20rpx 24rpx; }

.feed-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}
.feed-card:active { transform: scale(0.98); }

.fc-cover-wrap {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
  background: #f0ebe3;
}
.fc-cover { width: 100%; height: 100%; }
.fc-type-badge {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-size: 22rpx;
  color: #fff;
}
.type-activity { background: #C41E3A; }
.type-course { background: #C9A96E; }
.type-circle { background: #2ecc71; }
.type-station { background: #3498db; }
.type-article { background: #9b59b6; }
.type-video { background: #e67e22; }

.fc-distance {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  background: rgba(0,0,0,0.6);
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-size: 22rpx;
  color: #fff;
}
.fc-play-btn {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fc-play-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  color: #fff;
}
.fc-price-tag {
  position: absolute;
  bottom: 16rpx;
  right: 16rpx;
  background: #C41E3A;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-size: 22rpx;
  color: #fff;
  font-weight: 500;
}
.fc-body { padding: 20rpx 24rpx; }
.fc-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 8rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.fc-desc { font-size: 24rpx; color: #666; display: block; margin-bottom: 12rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.fc-meta-row { display: flex; align-items: center; gap: 8rpx; font-size: 22rpx; color: #999; margin-bottom: 8rpx; }
.fc-status-text { color: #C41E3A; }
.fc-footer { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.fc-stats { display: flex; gap: 16rpx; font-size: 22rpx; color: #999; }
.fc-author { display: flex; align-items: center; gap: 6rpx; }
.fc-avatar { width: 28rpx; height: 28rpx; border-radius: 50%; }
.fc-author-name { font-size: 22rpx; color: #999; }
.fc-tags { display: flex; flex-wrap: wrap; gap: 8rpx; }
.fc-tag { font-size: 20rpx; color: #666; background: #F5F0E8; padding: 4rpx 12rpx; border-radius: 6rpx; }

/* 城市选择器 */
.city-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0,0,0,0.5);
}
.city-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.city-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #E5E1DB;
  font-size: 28rpx;
}
.city-title { font-weight: 600; }
.city-search-wrap {
  position: relative;
  margin: 16rpx 24rpx;
}
.city-search-icon {
  position: absolute;
  left: 20rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 28rpx;
}
.city-search-input {
  width: 100%;
  height: 64rpx;
  padding-left: 60rpx;
  background: #F5F0E8;
  border-radius: 32rpx;
  font-size: 26rpx;
  border: none;
  box-sizing: border-box;
}
.city-list-scroll { flex: 1; padding: 0 24rpx 40rpx; }
.city-section { margin-bottom: 24rpx; }
.city-section-title { font-size: 24rpx; color: #999; display: block; margin-bottom: 12rpx; }
.city-current {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx;
  background: rgba(196,30,58,0.05);
  border-radius: 12rpx;
  font-size: 26rpx;
}
.city-current-name { font-weight: 500; }
.city-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.city-item {
  text-align: center;
  padding: 12rpx;
  border: 1rpx solid #E5E1DB;
  border-radius: 12rpx;
  font-size: 24rpx;
}
.city-item.active { border-color: #C41E3A; background: rgba(196,30,58,0.05); color: #C41E3A; }
.city-empty { text-align: center; padding: 40rpx; color: #999; font-size: 24rpx; display: block; }
</style>
