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
        <text class="header-title ellipsis">
          {{ station?.name || '驿站详情' }}
        </text>
        <view class="header-actions">
          <text
            class="action-btn"
            @click="handleShare"
          >
            ↗
          </text>
          <text
            class="action-btn"
            :class="{ favorited: station?.isFavorited }"
            @click="handleToggleFavorite"
          >
            ❤
          </text>
        </view>
      </view>
    </view>

    <!-- 加载中 -->
    <DataState
      v-if="isLoading"
      :is-loading="true"
      :is-empty="false"
      skeleton-type="detail"
    />

    <!-- 不存在 -->
    <view
      v-else-if="!station"
      class="error-state"
    >
      <text>驿站不存在</text>
    </view>

    <!-- 内容 -->
    <template v-else>
      <!-- 封面轮播 -->
      <view class="carousel">
        <view class="carousel-inner">
          <image
            :src="(station.images && station.images[currentImageIndex]) || station.cover || ''"
            class="carousel-img"
            mode="aspectFill"
          />
        </view>
        <view
          v-if="station.images && station.images.length > 1"
          class="carousel-dots"
        >
          <text
            v-for="(_, idx) in station.images"
            :key="idx"
            class="carousel-dot"
            :class="{ active: idx === currentImageIndex }"
            @click="currentImageIndex = idx"
          />
        </view>
        <view class="carousel-type-badge">
          {{ getStationTypeLabel(station.type) }}
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="info-section">
        <text class="info-title">
          {{ station.name }}
        </text>
        <view class="info-rating">
          <text>⭐</text>
          <text class="rating-num">
            {{ station.rating }}
          </text>
          <text class="rating-count">
            ({{ station.reviewCount }}条评价)
          </text>
          <text
            v-if="station.distance"
            class="info-dist"
          >
            {{ formatDistance(station.distance) }}
          </text>
        </view>
        <view class="info-row">
          <text>📍</text>
          <text class="info-text">
            {{ station.address }}
          </text>
        </view>
        <view
          class="info-row"
          @click="handleCall"
        >
          <text>📞</text>
          <text class="info-text info-phone">
            {{ station.phone }}
          </text>
        </view>
        <view
          v-if="station.businessHours && station.businessHours.length"
          class="info-row"
        >
          <text>🕐</text>
          <view class="biz-hours">
            <text
              v-for="(bh, idx) in station.businessHours"
              :key="idx"
              class="biz-hour"
              :class="{ closed: !bh.isOpen }"
            >
              {{ bh.day }}: {{ bh.isOpen ? bh.open + '-' + bh.close : '休息' }}
            </text>
          </view>
        </view>
        <view
          v-if="station.tags && station.tags.length"
          class="info-tags"
        >
          <text
            v-for="tag in station.tags"
            :key="tag"
            class="info-tag"
          >
            {{ tag }}
          </text>
        </view>
      </view>

      <!-- Tab 切换 -->
      <view class="tab-bar">
        <text
          v-for="tab in tabs"
          :key="tab.value"
          class="tab"
          :class="{ active: activeTab === tab.value }"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </text>
      </view>

      <!-- 介绍 Tab -->
      <view
        v-if="activeTab === 'intro'"
        class="tab-content"
      >
        <view
          v-if="station.manager"
          class="card"
        >
          <text class="card-title">
            驿站主理人
          </text>
          <view class="manager-row">
            <image
              :src="station.manager.avatar"
              class="manager-avatar"
              mode="aspectFill"
            />
            <view>
              <text class="manager-name">
                {{ station.manager.name }}
              </text>
              <text class="manager-title">
                {{ station.manager.title }}
              </text>
            </view>
          </view>
        </view>

        <view class="card">
          <text class="card-title">
            设施服务
          </text>
          <view class="facility-grid">
            <view
              v-for="f in station.facilities || []"
              :key="f"
              class="facility-item"
            >
              <view class="facility-icon-wrap">
                {{ facilityIconMap[f] || '•' }}
              </view>
              <text class="facility-label">
                {{ getFacilityLabel(f) }}
              </text>
            </view>
          </view>
        </view>

        <view class="card">
          <text class="card-title">
            驿站介绍
          </text>
          <text class="card-desc">
            {{ station.description }}
          </text>
        </view>

        <view
          v-if="station.upcomingEvents && station.upcomingEvents.length"
          class="card"
        >
          <view class="card-title-row">
            <text class="card-title">
              近期活动
            </text>
            <text
              class="card-more"
              @click="goEvents"
            >
              更多 ›
            </text>
          </view>
          <view class="event-list">
            <view
              v-for="evt in station.upcomingEvents"
              :key="evt.id"
              class="event-item"
            >
              <view class="event-icon">
                📅
              </view>
              <view class="event-info">
                <text class="event-title">
                  {{ evt.title }}
                </text>
                <text class="event-date">
                  {{ evt.date }}
                </text>
              </view>
              <text class="event-type-badge">
                {{ evt.type === 'course' ? '课程' : '活动' }}
              </text>
            </view>
          </view>
        </view>

        <view
          v-if="station.reviews && station.reviews.length"
          class="card"
        >
          <view class="card-title-row">
            <text class="card-title">
              用户评价
            </text>
            <text class="card-more">
              全部 ›
            </text>
          </view>
          <view class="review-list">
            <view
              v-for="rev in station.reviews"
              :key="rev.id"
              class="review-item"
            >
              <view class="review-header">
                <image
                  :src="rev.user?.avatar"
                  class="review-avatar"
                  mode="aspectFill"
                />
                <view>
                  <text class="review-name">
                    {{ rev.user?.name }}
                  </text>
                  <view class="review-stars">
                    <text
                      v-for="i in 5"
                      :key="i"
                    >
                      {{ i <= rev.rating ? '⭐' : '☆' }}
                    </text>
                  </view>
                </view>
                <text class="review-time">
                  {{ rev.time }}
                </text>
              </view>
              <text class="review-content">
                {{ rev.content }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 课程 Tab -->
      <view
        v-if="activeTab === 'courses'"
        class="tab-content"
      >
        <view
          v-for="i in 3"
          :key="i"
          class="course-card"
        >
          <view class="course-card-placeholder" />
          <view class="course-card-body">
            <text class="course-card-title">
              八字命理实战研修班（第{{ i }}期）
            </text>
            <text class="course-card-meta">
              张明德老师 · 2026年6月{{ 10 + i }}日
            </text>
            <view class="course-card-bottom">
              <text class="course-card-price">
                ¥1980
              </text>
              <text class="course-card-status">
                报名中
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 商品 Tab -->
      <view
        v-if="activeTab === 'products'"
        class="tab-content"
      >
        <view class="product-grid">
          <view
            v-for="i in 4"
            :key="i"
            class="product-item"
          >
            <view class="product-placeholder" />
            <view class="product-body">
              <text class="product-name">
                驿站特色商品{{ i }}
              </text>
              <text class="product-price">
                ¥{{ 99 * i }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 讲师 Tab -->
      <view
        v-if="activeTab === 'instructors'"
        class="tab-content"
      >
        <view
          v-for="t in (station.instructors || [])"
          :key="t.id"
          class="teacher-card"
        >
          <image
            :src="t.avatar"
            class="teacher-avatar"
            mode="aspectFill"
          />
          <view class="teacher-info">
            <text class="teacher-name">
              {{ t.name }}
            </text>
            <text class="teacher-specialty">
              {{ t.specialty }}
            </text>
          </view>
          <text
            class="teacher-book-btn"
            @click="goBooking(t)"
          >
            预约
          </text>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view class="bottom-bar">
        <view
          class="bottom-btn bottom-btn-muted"
          @click="handleCall"
        >
          <text>📞</text>
          <text>联系客服</text>
        </view>
        <view
          class="bottom-btn bottom-btn-primary"
          @click="handleNavigate"
        >
          <text>🧭</text>
          <text>导航到驿站</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { offlineApi } from '../../api'
import DataState from '../../components/DataState.vue'

interface StationDetail {
  id: number
  name: string
  type: string
  cover: string
  images?: string[]
  address: string
  phone?: string
  rating: number
  reviewCount: number
  distance?: number
  description: string
  facilities: string[]
  tags: string[]
  isFavorited?: boolean
  businessHours?: { day: string; isOpen: boolean; open?: string; close?: string }[]
  manager?: { avatar: string; name: string; title: string }
  instructors?: { id: number; avatar: string; name: string; specialty: string }[]
  upcomingEvents?: { id: number; title: string; date: string; type: string }[]
  reviews?: { id: number; user: { avatar: string; name: string }; rating: number; content: string; time: string }[]
  latitude?: number
  longitude?: number
}

const tabs = [
  { value: 'intro', label: '介绍' },
  { value: 'courses', label: '课程' },
  { value: 'products', label: '商品' },
  { value: 'instructors', label: '讲师' },
]

const facilityIconMap: Record<string, string> = {
  wifi: '📶',
  parking: '🚗',
  tea: '☕',
  library: '📖',
  meditation: '❤',
  classroom: '👥',
  consultation: '💬',
}

const station = ref<StationDetail | null>(null)
const isLoading = ref(true)
const activeTab = ref('intro')
const currentImageIndex = ref(0)
let stationId = 0

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.$page?.options || currentPage?.options || {}
  stationId = Number(options.id || 0)
  if (stationId) loadStationDetail()
})

async function loadStationDetail() {
  isLoading.value = true
  try {
    const res: any = await offlineApi.stationDetail(String(stationId))
    station.value = (res && typeof res === 'object' && 'id' in res) ? res : null
  } catch (e: any) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

async function handleToggleFavorite() {
  if (!station.value) return
  station.value.isFavorited = !station.value.isFavorited
  uni.showToast({
    title: station.value.isFavorited ? '已收藏' : '已取消收藏',
    icon: 'none',
  })
}

function handleCall() {
  if (station.value?.phone) {
    uni.makePhoneCall({ phoneNumber: station.value.phone })
  }
}

function handleNavigate() {
  const s = station.value
  if (s?.latitude && s?.longitude) {
    uni.openLocation({ latitude: s.latitude, longitude: s.longitude })
  }
}

function handleShare() {
  uni.share({
    title: station.value?.name || '',
    content: station.value?.description || '',
  })
}

function goBooking(t: any) {
  uni.navigateTo({
    url: `/pages/offline/teacher-booking?stationId=${stationId}&teacherId=${t.id}`,
  })
}

function goEvents() {
  uni.navigateTo({ url: '/pages/offline/events' })
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

function getFacilityLabel(f: string): string {
  const map: Record<string, string> = {
    wifi: 'WiFi',
    parking: '停车',
    tea: '茶饮',
    library: '图书',
    meditation: '冥想',
    classroom: '教室',
    consultation: '咨询',
  }
  return map[f] || f
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
  padding-bottom: 120rpx;
}
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1rpx solid #E5E1DB;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
}
.back-btn, .action-btn { font-size: 32rpx; padding: 8rpx; }
.header-title { font-size: 32rpx; font-weight: 600; flex: 1; text-align: center; margin: 0 24rpx; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.header-actions { display: flex; gap: 8rpx; }
.favorited { color: #e74c3c; }
.error-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60vh;
  color: #999;
  font-size: 28rpx;
}

/* 轮播 */
.carousel {
  position: relative;
  aspect-ratio: 2/1;
  overflow: hidden;
  background: #f0ebe3;
}
.carousel-inner { width: 100%; height: 100%; }
.carousel-img { width: 100%; height: 100%; }
.carousel-dots {
  position: absolute;
  bottom: 20rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8rpx;
}
.carousel-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.5);
}
.carousel-dot.active { background: #fff; }
.carousel-type-badge {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  background: #C41E3A;
  color: #fff;
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
}

/* 信息 */
.info-section {
  background: #fff;
  padding: 24rpx;
}
.info-title { font-size: 36rpx; font-weight: bold; display: block; }
.info-rating { display: flex; align-items: center; gap: 6rpx; margin-top: 12rpx; }
.rating-num { font-size: 24rpx; font-weight: 500; color: #C9A96E; }
.rating-count { font-size: 22rpx; color: #999; }
.info-dist { font-size: 22rpx; color: #C41E3A; margin-left: 12rpx; }
.info-row { display: flex; align-items: flex-start; gap: 12rpx; margin-top: 12rpx; font-size: 24rpx; color: #666; }
.info-text { flex: 1; }
.info-phone { color: #C41E3A; }
.biz-hours { display: flex; flex-direction: column; gap: 4rpx; }
.biz-hour { font-size: 22rpx; }
.biz-hour.closed { color: #ccc; }
.info-tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 16rpx; }
.info-tag {
  font-size: 22rpx;
  color: #C41E3A;
  background: rgba(196,30,58,0.08);
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
}

/* Tab */
.tab-bar {
  position: sticky;
  top: 88rpx;
  z-index: 40;
  background: #fff;
  display: flex;
  border-bottom: 1rpx solid #E5E1DB;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 26rpx;
  color: #999;
  border-bottom: 4rpx solid transparent;
}
.tab.active { color: #C41E3A; border-bottom-color: #C41E3A; font-weight: 600; }

.tab-content { padding: 20rpx 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}
.card-title { font-size: 28rpx; font-weight: 500; display: block; margin-bottom: 16rpx; }
.card-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.card-more { font-size: 24rpx; color: #C41E3A; }
.card-desc { font-size: 24rpx; color: #666; line-height: 1.7; }

.manager-row { display: flex; align-items: center; gap: 16rpx; }
.manager-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; }
.manager-name { font-size: 26rpx; font-weight: 500; display: block; }
.manager-title { font-size: 22rpx; color: #999; }

.facility-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20rpx; }
.facility-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.facility-icon-wrap {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: rgba(196,30,58,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}
.facility-label { font-size: 20rpx; color: #999; }

.event-list { display: flex; flex-direction: column; gap: 16rpx; }
.event-item { display: flex; align-items: center; gap: 16rpx; }
.event-icon { font-size: 32rpx; }
.event-info { flex: 1; }
.event-title { font-size: 24rpx; font-weight: 500; display: block; }
.event-date { font-size: 20rpx; color: #999; display: block; }
.event-type-badge { font-size: 20rpx; color: #C41E3A; background: rgba(196,30,58,0.08); padding: 4rpx 12rpx; border-radius: 6rpx; }

.review-list { display: flex; flex-direction: column; gap: 20rpx; }
.review-item { padding-bottom: 16rpx; border-bottom: 1rpx solid #E5E1DB; }
.review-item:last-child { border-bottom: none; padding-bottom: 0; }
.review-header { display: flex; align-items: center; gap: 12rpx; }
.review-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; }
.review-name { font-size: 24rpx; font-weight: 500; display: block; }
.review-stars { font-size: 20rpx; }
.review-time { font-size: 20rpx; color: #999; margin-left: auto; flex-shrink: 0; }
.review-content { font-size: 24rpx; color: #666; margin-top: 8rpx; display: block; }

.course-card { display: flex; gap: 16rpx; background: #fff; border-radius: 16rpx; padding: 20rpx; }
.course-card-placeholder { width: 120rpx; height: 120rpx; border-radius: 12rpx; background: #F5F0E8; flex-shrink: 0; }
.course-card-body { flex: 1; }
.course-card-title { font-size: 26rpx; font-weight: 500; display: block; }
.course-card-meta { font-size: 22rpx; color: #999; display: block; margin-top: 8rpx; }
.course-card-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.course-card-price { font-size: 26rpx; color: #C41E3A; font-weight: 500; }
.course-card-status { font-size: 20rpx; color: #C41E3A; background: rgba(196,30,58,0.08); padding: 4rpx 12rpx; border-radius: 6rpx; }

.product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.product-item { background: #fff; border-radius: 16rpx; overflow: hidden; }
.product-placeholder { aspect-ratio: 1; background: #F5F0E8; }
.product-body { padding: 16rpx; }
.product-name { font-size: 24rpx; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 8rpx; }
.product-price { font-size: 26rpx; color: #C41E3A; font-weight: 500; }

.teacher-card { display: flex; align-items: center; gap: 16rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.teacher-avatar { width: 84rpx; height: 84rpx; border-radius: 50%; }
.teacher-info { flex: 1; }
.teacher-name { font-size: 26rpx; font-weight: 500; display: block; }
.teacher-specialty { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.teacher-book-btn {
  font-size: 24rpx;
  color: #fff;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  padding: 10rpx 28rpx;
  border-radius: 28rpx;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1rpx solid #E5E1DB;
  padding: 16rpx 24rpx;
  display: flex;
  gap: 16rpx;
}
.bottom-btn {
  flex: 1;
  padding: 20rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  font-size: 26rpx;
  font-weight: 500;
}
.bottom-btn-muted { background: #F5F0E8; color: #666; }
.bottom-btn-primary { background: linear-gradient(135deg, #C41E3A, #A01830); color: #fff; }
</style>
