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
          线下课程
        </text>
        <view class="header-spacer" />
      </view>
      <!-- 搜索栏 -->
      <view class="search-wrap">
        <text class="search-icon">
          🔍
        </text>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索课程、讲师..."
        >
      </view>
      <!-- 筛选栏 -->
      <view class="filter-row">
        <view
          class="filter-btn"
          @click="toggleStationPicker"
        >
          <text>🏛</text>
          <text class="filter-text">
            {{ selectedStationName }}
          </text>
          <text>▼</text>
        </view>
        <view
          class="filter-btn"
          @click="toggleDatePicker"
        >
          <text>📅</text>
          <text class="filter-text">
            {{ selectedDateLabel }}
          </text>
          <text>▼</text>
        </view>
      </view>
      <!-- 驿站下拉 -->
      <view
        v-if="showStationPicker"
        class="dropdown"
      >
        <view
          class="dropdown-item"
          :class="{ active: !selectedStation }"
          @click="selectStation(undefined)"
        >
          全部驿站
        </view>
        <view
          v-for="s in stations"
          :key="s.id"
          class="dropdown-item"
          :class="{ active: selectedStation === s.id }"
          @click="selectStation(s.id)"
        >
          <text class="dropdown-item-name">
            {{ s.name }}
          </text>
          <text class="dropdown-item-addr">
            {{ s.address }}
          </text>
        </view>
      </view>
      <!-- 日期下拉 -->
      <view
        v-if="showDatePicker"
        class="dropdown"
      >
        <view
          v-for="opt in dateFilterOptions"
          :key="opt.value"
          class="dropdown-item"
          :class="{ active: dateFilter === opt.value }"
          @click="selectDate(opt.value)"
        >
          {{ opt.label }}
        </view>
      </view>
      <!-- 下拉遮罩 -->
      <view
        v-if="showStationPicker || showDatePicker"
        class="dropdown-overlay"
        @click="closeDropdowns"
      />
    </view>

    <!-- 课程列表 -->
    <DataState
      :is-loading="loading && courses.length === 0"
      :is-empty="!loading && courses.length === 0"
      empty-icon="📅"
      empty-title="暂无课程"
      :empty-description="keyword ? '没有找到匹配的课程' : '该时间段暂无线下课程安排'"
      skeleton-type="list"
      @retry="loadCourses"
    >
      <view class="course-list">
        <view
          v-for="c in courses"
          :key="c.id"
          class="course-card"
          @click="goDetail(c)"
        >
          <view class="course-card-inner">
            <view class="course-cover-wrap">
              <image
                :src="c.cover"
                class="course-cover"
                mode="aspectFill"
              />
              <text
                v-if="c.price === 0"
                class="free-badge"
              >
                免费
              </text>
            </view>
            <view class="course-body">
              <view class="course-title-row">
                <text class="course-title">
                  {{ c.title }}
                </text>
                <text
                  class="course-status-tag"
                  :class="'status-' + c.status"
                >
                  {{ getCourseStatusLabel(c.status) }}
                </text>
              </view>
              <view class="course-teacher-row">
                <image
                  :src="c.instructor?.avatar"
                  class="course-teacher-avatar"
                  mode="aspectFill"
                />
                <text class="course-teacher-name">
                  {{ c.instructor?.name }}
                </text>
                <text
                  v-if="c.instructor?.title"
                  class="course-teacher-title"
                >
                  · {{ c.instructor.title }}
                </text>
              </view>
              <view class="course-meta-row">
                <text>🕐 {{ formatDate(c.startTime) }}</text>
                <text class="course-station">
                  📍 {{ c.stationName }}
                </text>
              </view>
              <view class="course-bottom-row">
                <view class="course-price-row">
                  <text
                    v-if="c.price > 0"
                    class="course-price"
                  >
                    ¥{{ c.price }}
                  </text>
                  <text
                    v-if="c.originalPrice && c.originalPrice > c.price"
                    class="course-original-price"
                  >
                    ¥{{ c.originalPrice }}
                  </text>
                  <text
                    v-else-if="c.price === 0"
                    class="course-free"
                  >
                    免费
                  </text>
                </view>
                <text class="course-participants">
                  👥 {{ c.currentParticipants || 0 }}/{{ c.maxParticipants || 0 }}人
                </text>
              </view>
            </view>
          </view>
          <view
            v-if="c.tags && c.tags.length"
            class="course-tags"
          >
            <text
              v-for="tag in c.tags.slice(0, 3)"
              :key="tag"
              class="course-tag"
            >
              {{ tag }}
            </text>
          </view>
        </view>
      </view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { offlineApi } from '../../api'
import DataState from '../../components/DataState.vue'

interface OfflineCourse {
  id: number
  title: string
  cover: string
  price: number
  originalPrice?: number
  status: string
  startTime: string
  stationName: string
  currentParticipants?: number
  maxParticipants?: number
  instructor?: { avatar: string; name: string; title?: string }
  tags?: string[]
}

interface Station {
  id: number
  name: string
  address: string
}

const dateFilterOptions = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
]

const courses = ref<OfflineCourse[]>([])
const stations = ref<Station[]>([])
const loading = ref(false)
const selectedStation = ref<number | undefined>()
const dateFilter = ref('all')
const showStationPicker = ref(false)
const showDatePicker = ref(false)
const keyword = ref('')

const selectedStationName = ref('全部驿站')
const selectedDateLabel = ref('全部时间')

onMounted(() => {
  loadStations()
  loadCourses()
})

watch([selectedStation, dateFilter, keyword], () => { loadCourses() })

async function loadStations() {
  try {
    const res: any = await offlineApi.stations()
    stations.value = Array.isArray(res) ? res : res?.list || res?.data || []
  } catch (e: any) {
    console.error(e)
  }
}

async function loadCourses() {
  loading.value = true
  try {
    const params: any = {}
    if (selectedStation.value) params.stationId = selectedStation.value
    if (dateFilter.value !== 'all') params.dateFilter = dateFilter.value
    if (keyword.value) params.keyword = keyword.value
    const res: any = await offlineApi.courses(params)
    courses.value = Array.isArray(res) ? res : res?.list || res?.data || []
  } catch (e: any) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function selectStation(id: number | undefined) {
  selectedStation.value = id
  selectedStationName.value = id
    ? stations.value.find(s => s.id === id)?.name || '选择驿站'
    : '全部驿站'
  showStationPicker.value = false
}

function selectDate(val: string) {
  dateFilter.value = val
  selectedDateLabel.value = dateFilterOptions.find(d => d.value === val)?.label || '全部时间'
  showDatePicker.value = false
}

function toggleStationPicker() {
  showStationPicker.value = !showStationPicker.value
  showDatePicker.value = false
}

function toggleDatePicker() {
  showDatePicker.value = !showDatePicker.value
  showStationPicker.value = false
}

function closeDropdowns() {
  showStationPicker.value = false
  showDatePicker.value = false
}

function goDetail(c: OfflineCourse) {
  uni.navigateTo({ url: `/pages/offline/course-detail?id=${c.id}` })
}

function goBack() {
  uni.navigateBack()
}

function getCourseStatusLabel(status: string): string {
  const map: Record<string, string> = {
    enrolling: '报名中',
    ongoing: '进行中',
    upcoming: '即将开始',
    full: '已满员',
    ended: '已结束',
  }
  return map[status] || status
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 40rpx;
}
.header {
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1rpx solid #E5E1DB;
  position: sticky;
  top: 0;
  z-index: 50;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
}
.back-btn { font-size: 36rpx; }
.header-title { font-size: 32rpx; font-weight: 600; }
.header-spacer { width: 60rpx; }

.search-wrap {
  position: relative;
  margin: 0 24rpx 12rpx;
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

.filter-row {
  display: flex;
  gap: 12rpx;
  padding: 0 24rpx 16rpx;
}
.filter-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 20rpx;
  background: #F5F0E8;
  border-radius: 28rpx;
  font-size: 24rpx;
}
.filter-text { max-width: 140rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.dropdown {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  top: auto;
  background: #fff;
  border: 1rpx solid #E5E1DB;
  border-radius: 12rpx;
  max-height: 400rpx;
  overflow-y: auto;
  z-index: 55;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.1);
}
.dropdown-item {
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #f5f0e8;
  font-size: 24rpx;
  color: #666;
}
.dropdown-item.active { color: #C41E3A; font-weight: 500; background: rgba(196,30,58,0.03); }
.dropdown-item-name { display: block; }
.dropdown-item-addr { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }
.dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 49;
}

.course-list { padding: 20rpx 24rpx; }
.course-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}
.course-card-inner { display: flex; gap: 16rpx; padding: 16rpx; }
.course-cover-wrap { position: relative; width: 168rpx; height: 120rpx; flex-shrink: 0; }
.course-cover { width: 100%; height: 100%; border-radius: 12rpx; }
.free-badge {
  position: absolute;
  top: 6rpx;
  left: 6rpx;
  font-size: 18rpx;
  background: #27ae60;
  color: #fff;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
}
.course-body { flex: 1; min-width: 0; }
.course-title-row { display: flex; justify-content: space-between; gap: 8rpx; margin-bottom: 8rpx; }
.course-title { font-size: 26rpx; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.course-status-tag { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 6rpx; flex-shrink: 0; }
.status-enrolling { background: rgba(196,30,58,0.1); color: #C41E3A; }
.status-ongoing { background: rgba(39,174,96,0.1); color: #27ae60; }
.status-full { background: #F5F0E8; color: #999; }
.status-ended { background: #F5F0E8; color: #999; }

.course-teacher-row { display: flex; align-items: center; gap: 6rpx; margin-bottom: 8rpx; }
.course-teacher-avatar { width: 28rpx; height: 28rpx; border-radius: 50%; }
.course-teacher-name { font-size: 22rpx; color: #666; }
.course-teacher-title { font-size: 18rpx; color: #999; }

.course-meta-row { display: flex; gap: 16rpx; font-size: 20rpx; color: #999; margin-bottom: 8rpx; }
.course-station { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.course-bottom-row { display: flex; justify-content: space-between; align-items: center; }
.course-price-row { display: flex; align-items: baseline; gap: 6rpx; }
.course-price { font-size: 26rpx; color: #C41E3A; font-weight: 600; }
.course-original-price { font-size: 18rpx; color: #999; text-decoration: line-through; }
.course-free { font-size: 24rpx; color: #27ae60; font-weight: 600; }
.course-participants { font-size: 20rpx; color: #999; }

.course-tags { display: flex; gap: 8rpx; padding: 0 16rpx 16rpx; }
.course-tag { font-size: 18rpx; color: #666; background: #F5F0E8; padding: 4rpx 10rpx; border-radius: 6rpx; }
</style>
