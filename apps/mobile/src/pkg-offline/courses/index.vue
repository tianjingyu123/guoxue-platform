<template>
  <view class="cl-page">
    <!-- 顶部导航 -->
    <view class="cl-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="cl-nav">
        <view class="cl-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="cl-title">线下课程</text>
        <view class="cl-icon-btn" />
      </view>
      <!-- 搜索 -->
      <view class="cl-search-wrap">
        <view class="cl-search">
          <app-icon name="search" :size="16" color="#9ca3af" />
          <input v-model="keyword" class="cl-search-input" placeholder="搜索课程、讲师..." placeholder-class="cl-ph" />
        </view>
      </view>
      <!-- 筛选栏 -->
      <view class="cl-filters">
        <view class="cl-filter" :class="{ active: selectedStation != null }" @tap="toggleStationPicker">
          <app-icon name="building-2" :size="14" :color="selectedStation != null ? '#fff' : '#6b7280'" />
          <text class="cl-filter-text" :class="{ active: selectedStation != null }">{{ selectedStationName }}</text>
          <app-icon name="chevron-down" :size="14" :color="selectedStation != null ? '#fff' : '#6b7280'" />
        </view>
        <view class="cl-filter" :class="{ active: dateFilter !== 'all' }" @tap="toggleDatePicker">
          <app-icon name="calendar" :size="14" :color="dateFilter !== 'all' ? '#fff' : '#6b7280'" />
          <text class="cl-filter-text" :class="{ active: dateFilter !== 'all' }">{{ selectedDateLabel }}</text>
          <app-icon name="chevron-down" :size="14" :color="dateFilter !== 'all' ? '#fff' : '#6b7280'" />
        </view>
      </view>

      <!-- 驿站下拉 -->
      <view v-if="showStationPicker" class="cl-dropdown">
        <view class="cl-drop-item" :class="{ active: selectedStation == null }" @tap="selectStation(undefined)">全部驿站</view>
        <view v-for="s in stationList" :key="s.id" class="cl-drop-item" :class="{ active: selectedStation === s.id }" @tap="selectStation(s.id)">
          <text class="cl-drop-name">{{ s.name }}</text>
          <text class="cl-drop-addr">{{ s.city }} · {{ s.address }}</text>
        </view>
      </view>
      <!-- 日期下拉 -->
      <view v-if="showDatePicker" class="cl-dropdown">
        <view v-for="o in dateFilters" :key="o.value" class="cl-drop-item" :class="{ active: dateFilter === o.value }" @tap="selectDate(o.value)">{{ o.label }}</view>
      </view>
    </view>

    <!-- 遮罩 -->
    <view v-if="showStationPicker || showDatePicker" class="cl-mask" @tap="closeDropdowns" />

    <scroll-view scroll-y class="cl-body">
      <view v-if="loading" class="cl-state">
        <view class="spinner" />
        <text class="cl-state-text">加载中…</text>
      </view>
      <view v-else-if="errMsg" class="cl-state">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" />
        <text class="cl-state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>

      <view v-else-if="filteredCourses.length === 0" class="cl-empty">
        <view class="cl-empty-icon"><app-icon name="calendar" :size="40" color="#9ca3af" /></view>
        <text class="cl-empty-title">暂无课程</text>
        <text class="cl-empty-sub">{{ keyword ? '没有找到匹配的课程' : '该筛选下暂无线下课程安排' }}</text>
      </view>

      <view v-else class="cl-list">
        <view v-for="c in filteredCourses" :key="c.id" class="cl-card" @tap="goDetail(c.id)">
          <view class="cl-card-main">
            <view class="cl-cover">
              <image lazy-load v-if="c.cover" :src="c.cover" class="cl-cover-img" mode="aspectFill" />
              <app-icon v-else name="graduation-cap" :size="24" color="#d8b48a" />
              <text v-if="num(c.price) === 0" class="cl-cover-free">免费</text>
            </view>
            <view class="cl-info">
              <view class="cl-info-top">
                <text class="cl-course-title">{{ c.title }}</text>
                <text class="cl-status" :style="{ color: courseStatusStyle[deriveCourseStatus(c)].color, background: courseStatusStyle[deriveCourseStatus(c)].bg }">{{ courseStatusLabel[deriveCourseStatus(c)] }}</text>
              </view>
              <view v-if="c.teacher" class="cl-teacher">
                <image lazy-load v-if="c.teacher.avatar" :src="c.teacher.avatar" class="cl-avatar-img" mode="aspectFill" />
                <view v-else class="cl-avatar"><text class="cl-avatar-text">{{ c.teacher.name[0] }}</text></view>
                <text class="cl-teacher-name">{{ c.teacher.name }}</text>
              </view>
              <view class="cl-meta">
                <view class="cl-meta-item">
                  <app-icon name="clock" :size="12" color="#9ca3af" />
                  <text class="cl-meta-text">{{ fmtCourseTime(c.startTime) }}</text>
                </view>
                <view class="cl-meta-item cl-meta-loc">
                  <app-icon name="map-pin" :size="12" color="#9ca3af" />
                  <text class="cl-meta-text cl-ellipsis">{{ c.station?.name || c.location }}</text>
                </view>
              </view>
              <view class="cl-bottom">
                <view class="cl-price-row">
                  <text v-if="num(c.price) > 0" class="cl-price">¥{{ num(c.price) }}</text>
                  <text v-else class="cl-price free">免费</text>
                </view>
                <view class="cl-people">
                  <app-icon name="users" :size="12" color="#9ca3af" />
                  <text class="cl-meta-text">{{ c._count?.registrations ?? 0 }}/{{ c.maxStudents }}人</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="cl-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  offlineApi, deriveCourseStatus, courseStatusLabel, courseStatusStyle, fmtCourseTime, num,
  type OfflineCourse, type Station,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

const dateFilters: { value: 'all' | 'today' | 'week' | 'month'; label: string }[] = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
]

const loading = ref(true)
const errMsg = ref('')
const courses = ref<OfflineCourse[]>([])
const stationList = ref<Station[]>([])
const keyword = ref('')
const selectedStation = ref<string | undefined>(undefined)
const dateFilter = ref<'all' | 'today' | 'week' | 'month'>('all')
const showStationPicker = ref(false)
const showDatePicker = ref(false)

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const [cs, ss] = await Promise.all([
      offlineApi.getCourses(),
      offlineApi.discoverStations().catch(() => []),
    ])
    courses.value = cs
    stationList.value = ss
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onLoad((q) => {
  if (q && q.stationId) selectedStation.value = String(q.stationId)
  load()
})

const selectedStationName = computed(() =>
  selectedStation.value != null ? stationList.value.find((s) => s.id === selectedStation.value)?.name || '选择驿站' : '全部驿站',
)
const selectedDateLabel = computed(() => dateFilters.find((d) => d.value === dateFilter.value)?.label || '全部时间')

function inDateRange(startTime: string): boolean {
  if (dateFilter.value === 'all') return true
  const d = new Date(startTime)
  const now = new Date()
  if (dateFilter.value === 'today') return d.toDateString() === now.toDateString()
  if (dateFilter.value === 'week') {
    const week = 7 * 86400000
    return d.getTime() >= now.getTime() && d.getTime() <= now.getTime() + week
  }
  if (dateFilter.value === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  return true
}

const filteredCourses = computed(() => {
  let list = courses.value
  if (selectedStation.value != null) list = list.filter((c) => c.stationId === selectedStation.value)
  if (keyword.value) list = list.filter((c) => c.title.includes(keyword.value) || (c.teacher?.name || '').includes(keyword.value))
  list = list.filter((c) => inDateRange(c.startTime))
  return list
})

function toggleStationPicker() { showStationPicker.value = !showStationPicker.value; showDatePicker.value = false }
function toggleDatePicker() { showDatePicker.value = !showDatePicker.value; showStationPicker.value = false }
function closeDropdowns() { showStationPicker.value = false; showDatePicker.value = false }
function selectStation(id?: string) { selectedStation.value = id; showStationPicker.value = false }
function selectDate(v: 'all' | 'today' | 'week' | 'month') { dateFilter.value = v; showDatePicker.value = false }
function goDetail(id: string) { navigateTo(`/offline/courses/${id}`) }
</script>

<style scoped>
.cl-page { min-height: 100vh; background: #f5f5f7; display: flex; flex-direction: column; }
.cl-header { position: sticky; top: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.cl-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.cl-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.cl-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.cl-search-wrap { padding: 0 16px 12px; }
.cl-search { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px; background: #f3f4f6; border-radius: 999px; }
.cl-search-input { flex: 1; font-size: 14px; color: #1a1a1a; }
.cl-ph { color: #9ca3af; }
.cl-filters { display: flex; align-items: center; gap: 8px; padding: 0 16px 12px; }
.cl-filter { display: flex; align-items: center; gap: 4px; padding: 6px 12px; background: #f3f4f6; border-radius: 999px; }
.cl-filter.active { background: var(--brand); }
.cl-filter-text { font-size: 13px; color: #6b7280; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cl-filter-text.active { color: #fff; }
.cl-dropdown { position: absolute; left: 0; right: 0; background: #fff; border-bottom: 1px solid #ededed; box-shadow: 0 8px 16px rgba(0,0,0,0.08); max-height: 280px; overflow-y: auto; z-index: 40; }
.cl-drop-item { display: flex; flex-direction: column; padding: 12px 16px; font-size: 14px; color: #1a1a1a; border-bottom: 1px solid #f3f4f6; }
.cl-drop-item.active { color: var(--brand); font-weight: 500; }
.cl-drop-name { font-size: 14px; font-weight: 500; }
.cl-drop-addr { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.cl-mask { position: fixed; inset: 0; z-index: 30; }
.cl-body { flex: 1; }
.cl-state { padding: 80px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.cl-state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }
.cl-empty { padding: 80px 0; display: flex; flex-direction: column; align-items: center; }
.cl-empty-icon { width: 80px; height: 80px; border-radius: 999px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.cl-empty-title { font-size: 14px; color: #6b7280; margin-bottom: 8px; }
.cl-empty-sub { font-size: 13px; color: #9ca3af; }
.cl-list { display: flex; flex-direction: column; gap: 16px; padding: 16px; }
.cl-card { background: #fff; border-radius: 12px; overflow: hidden; }
.cl-card-main { display: flex; gap: 12px; padding: 12px; }
.cl-cover { position: relative; width: 112px; height: 80px; flex-shrink: 0; border-radius: 8px; background: #f3f0ea; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.cl-cover-img { width: 100%; height: 100%; }
.cl-cover-free { position: absolute; top: 4px; left: 4px; padding: 1px 6px; font-size: 10px; color: #fff; background: #22c55e; border-radius: 4px; }
.cl-info { flex: 1; min-width: 0; }
.cl-info-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.cl-course-title { flex: 1; font-size: 14px; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cl-status { flex-shrink: 0; padding: 1px 6px; font-size: 10px; border-radius: 4px; }
.cl-teacher { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.cl-avatar { width: 16px; height: 16px; border-radius: 999px; background: var(--brand); display: flex; align-items: center; justify-content: center; }
.cl-avatar-img { width: 16px; height: 16px; border-radius: 999px; }
.cl-avatar-text { font-size: 9px; color: #fff; }
.cl-teacher-name { font-size: 12px; color: #6b7280; }
.cl-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.cl-meta-item { display: flex; align-items: center; gap: 3px; min-width: 0; }
.cl-meta-loc { flex: 1; }
.cl-meta-text { font-size: 11px; color: #9ca3af; }
.cl-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cl-bottom { display: flex; align-items: center; justify-content: space-between; }
.cl-price-row { display: flex; align-items: baseline; gap: 4px; }
.cl-price { font-size: 14px; font-weight: 600; color: var(--brand); }
.cl-price.free { color: #16a34a; }
.cl-people { display: flex; align-items: center; gap: 3px; }
.cl-safe { height: 24px; }
</style>
