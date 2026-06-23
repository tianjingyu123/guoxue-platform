<template>
  <view class="schedule-page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-left">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="48" color="#1a1a1a" />
        </view>
        <text class="nav-title">直播排期管理</text>
      </view>
      <view class="nav-right">
        <view class="nav-btn nav-btn-outline" @tap="showImportDialog = true">
          <app-icon name="upload" :size="32" color="#1a1a1a" />
          <text class="nav-btn-text">导入</text>
        </view>
        <view class="nav-btn nav-btn-primary" @tap="goCreate()">
          <app-icon name="plus" :size="32" color="#fff" />
          <text class="nav-btn-text nav-btn-text-light">新建场次</text>
        </view>
      </view>
    </view>

    <!-- 视图切换 & 搜索 -->
    <view class="toolbar">
      <view class="toolbar-row">
        <view class="view-switch">
          <view
            class="view-tab"
            :class="{ 'view-tab-active': viewMode === 'calendar' }"
            @tap="viewMode = 'calendar'"
          >
            <app-icon name="calendar-days" :size="32" :color="viewMode === 'calendar' ? '#1a1a1a' : '#999'" />
            <text class="view-tab-text" :class="{ 'view-tab-text-active': viewMode === 'calendar' }">日历</text>
          </view>
          <view
            class="view-tab"
            :class="{ 'view-tab-active': viewMode === 'list' }"
            @tap="viewMode = 'list'"
          >
            <app-icon name="list" :size="32" :color="viewMode === 'list' ? '#1a1a1a' : '#999'" />
            <text class="view-tab-text" :class="{ 'view-tab-text-active': viewMode === 'list' }">列表</text>
          </view>
        </view>
        <view class="search-box">
          <app-icon name="search" :size="32" color="#999" class="search-icon" />
          <input v-model="searchQuery" class="search-input" placeholder="搜索直播..." placeholder-class="search-ph" />
        </view>
      </view>
      <!-- 状态筛选 -->
      <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
        <view class="filter-row">
          <view
            v-for="item in statusFilters"
            :key="item.key"
            class="filter-chip"
            :class="{ 'filter-chip-active': filterStatus === item.key }"
            @tap="filterStatus = item.key"
          >
            {{ item.label }}
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 日历视图 -->
    <view v-if="viewMode === 'calendar'" class="calendar-view">
      <view class="month-switch">
        <view class="month-arrow" @tap="changeMonth(-1)">
          <app-icon name="chevron-left" :size="40" color="#1a1a1a" />
        </view>
        <text class="month-title">{{ year }}年{{ monthNames[month] }}</text>
        <view class="month-arrow" @tap="changeMonth(1)">
          <app-icon name="chevron-right" :size="40" color="#1a1a1a" />
        </view>
      </view>

      <view class="week-head">
        <view v-for="d in weekDays" :key="d" class="week-cell">{{ d }}</view>
      </view>

      <view class="cal-grid">
        <view
          v-for="(day, index) in calendarDays"
          :key="index"
          class="cal-cell"
          :class="{
            'cal-cell-selected': day && dateStrOf(day) === selectedDate,
            'cal-cell-today': day && dateStrOf(day) === todayStr && dateStrOf(day) !== selectedDate,
          }"
          @tap="day && toggleDate(day)"
        >
          <template v-if="day">
            <text class="cal-day" :class="{ 'cal-day-today': dateStrOf(day) === todayStr }">{{ day }}</text>
            <view v-if="getSchedulesForDate(day).length" class="cal-dots">
              <view
                v-for="(s, i) in getSchedulesForDate(day).slice(0, 3)"
                :key="i"
                class="cal-dot"
                :style="{ background: statusConfig[s.status].dot }"
              />
              <text v-if="getSchedulesForDate(day).length > 3" class="cal-dot-more">+{{ getSchedulesForDate(day).length - 3 }}</text>
            </view>
          </template>
        </view>
      </view>

      <!-- 选中日期场次 -->
      <view v-if="selectedDate" class="selected-section">
        <text class="selected-title">{{ formatDate(selectedDate) }} 的直播 ({{ filteredSchedules.length }}场)</text>
        <view v-if="filteredSchedules.length === 0" class="empty-day">
          <app-icon name="calendar" :size="64" color="#ccc" />
          <text class="empty-day-text">当日暂无直播排期</text>
          <view class="empty-btn" @tap="goCreate()">
            <app-icon name="plus" :size="32" color="#1a1a1a" />
            <text class="empty-btn-text">新建场次</text>
          </view>
        </view>
        <view v-else class="card-list">
          <schedule-card
            v-for="s in filteredSchedules"
            :key="s.id"
            :schedule="s"
            @edit="goCreate(s.id)"
            @copy="onCopy(s)"
            @del="onDelete(s)"
          />
        </view>
      </view>
    </view>

    <!-- 列表视图 -->
    <view v-if="viewMode === 'list'" class="list-view">
      <view class="stat-grid">
        <view class="stat-card">
          <text class="stat-num stat-num-blue">{{ countByStatus('scheduled') }}</text>
          <text class="stat-label">待开播</text>
        </view>
        <view class="stat-card">
          <text class="stat-num stat-num-red">{{ countByStatus('live') }}</text>
          <text class="stat-label">直播中</text>
        </view>
        <view class="stat-card">
          <text class="stat-num stat-num-gray">{{ countByStatus('completed') }}</text>
          <text class="stat-label">已结束</text>
        </view>
      </view>

      <view v-if="filteredSchedules.length === 0" class="empty-list">
        <app-icon name="calendar-days" :size="96" color="#e0e0e0" />
        <text class="empty-list-text">暂无直播排期</text>
        <view class="empty-list-btn" @tap="goCreate()">
          <app-icon name="plus" :size="32" color="#fff" />
          <text class="empty-list-btn-text">创建第一场直播</text>
        </view>
      </view>
      <view v-else class="card-list">
        <schedule-card
          v-for="s in filteredSchedules"
          :key="s.id"
          :schedule="s"
          show-date
          @edit="goCreate(s.id)"
          @copy="onCopy(s)"
          @del="onDelete(s)"
        />
      </view>
    </view>

    <!-- 导入对话框 -->
    <view v-if="showImportDialog" class="dialog-mask" @tap="showImportDialog = false">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">批量导入场次</text>
        <text class="dialog-desc">通过Excel文件批量导入直播排期</text>
        <view class="tpl-row">
          <view class="tpl-left">
            <app-icon name="file-spreadsheet" :size="40" color="#16a34a" />
            <text class="tpl-name">排期导入模板.xlsx</text>
          </view>
          <view class="tpl-dl">
            <app-icon name="download" :size="32" color="#1a1a1a" />
            <text class="tpl-dl-text">下载模板</text>
          </view>
        </view>
        <view class="upload-zone">
          <app-icon name="upload" :size="80" color="#999" />
          <text class="upload-main">点击或拖拽文件到此处</text>
          <text class="upload-sub">支持 .xlsx, .xls 格式，单次最多100条</text>
        </view>
        <view class="dialog-footer">
          <view class="dlg-btn dlg-btn-outline" @tap="showImportDialog = false">取消</view>
          <view class="dlg-btn dlg-btn-primary">开始导入</view>
        </view>
      </view>
    </view>

    <!-- 删除确认对话框 -->
    <view v-if="showDeleteDialog" class="dialog-mask" @tap="showDeleteDialog = false">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">确认删除</text>
        <text class="dialog-desc">确定要删除直播「{{ selectedSchedule?.title }}」吗？此操作不可恢复。</text>
        <view class="dialog-footer">
          <view class="dlg-btn dlg-btn-outline" @tap="showDeleteDialog = false">取消</view>
          <view class="dlg-btn dlg-btn-danger" @tap="confirmDelete">确认删除</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { scheduleList, scheduleStatusConfig, type ScheduleItem } from '@/lib/live-data'
import ScheduleCard from './schedule-card.vue'

const viewMode = ref<'calendar' | 'list'>('calendar')
const currentYear = ref(2026)
const currentMonth = ref(4) // 0-based，2026年5月
const selectedDate = ref<string | null>(null)
const showImportDialog = ref(false)
const showDeleteDialog = ref(false)
const selectedSchedule = ref<ScheduleItem | null>(null)
const filterStatus = ref('all')
const searchQuery = ref('')

const todayStr = '2026-05-10'
const statusConfig = scheduleStatusConfig
const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const statusFilters = [
  { key: 'all', label: '全部' },
  { key: 'scheduled', label: '待开播' },
  { key: 'live', label: '直播中' },
  { key: 'completed', label: '已结束' },
]

const year = computed(() => currentYear.value)
const month = computed(() => currentMonth.value)

const calendarDays = computed(() => {
  const firstDay = new Date(year.value, month.value, 1)
  const lastDay = new Date(year.value, month.value + 1, 0)
  const startDay = firstDay.getDay()
  const totalDays = lastDay.getDate()
  const days: (number | null)[] = []
  for (let i = 0; i < startDay; i++) days.push(null)
  for (let i = 1; i <= totalDays; i++) days.push(i)
  return days
})

function dateStrOf(day: number) {
  return `${year.value}-${String(month.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
function getSchedulesForDate(day: number) {
  const ds = dateStrOf(day)
  return scheduleList.filter((s) => s.date === ds)
}
function toggleDate(day: number) {
  const ds = dateStrOf(day)
  selectedDate.value = selectedDate.value === ds ? null : ds
}
function changeMonth(delta: number) {
  const d = new Date(year.value, month.value + delta, 1)
  currentYear.value = d.getFullYear()
  currentMonth.value = d.getMonth()
  selectedDate.value = null
}
function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
function countByStatus(status: string) {
  return scheduleList.filter((s) => s.status === status).length
}

const filteredSchedules = computed(() => {
  return scheduleList
    .filter((s) => {
      if (filterStatus.value !== 'all' && s.status !== filterStatus.value) return false
      if (searchQuery.value && !s.title.toLowerCase().includes(searchQuery.value.toLowerCase())) return false
      if (selectedDate.value && s.date !== selectedDate.value) return false
      return true
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
})

function goBack() {
  uni.navigateBack()
}
function goCreate(id?: number) {
  const url = id ? `/pkg-live/create/index?id=${id}` : '/pkg-live/create/index'
  uni.navigateTo({ url })
}
function onCopy(s: ScheduleItem) {
  console.log('[v0] 复制场次', s.id)
}
function onDelete(s: ScheduleItem) {
  selectedSchedule.value = s
  showDeleteDialog.value = true
}
function confirmDelete() {
  console.log('[v0] 删除场次', selectedSchedule.value?.id)
  showDeleteDialog.value = false
}
</script>

<style scoped>
.schedule-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 80rpx;
}

/* 顶部导航 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: rgba(250, 248, 245, 0.95);
  border-bottom: 1px solid #ece8e1;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.nav-back {
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.nav-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.nav-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  height: 56rpx;
  padding: 0 20rpx;
  border-radius: 12rpx;
}
.nav-btn-outline {
  border: 1px solid #d8d2c8;
  background: transparent;
}
.nav-btn-primary {
  background: #C41E3A;
}
.nav-btn-text {
  font-size: 26rpx;
  color: #1a1a1a;
}
.nav-btn-text-light {
  color: #fff;
}

/* 工具栏 */
.toolbar {
  padding: 24rpx;
  border-bottom: 1px solid #ece8e1;
}
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.view-switch {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx;
  background: #f0ece5;
  border-radius: 16rpx;
}
.view-tab {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 24rpx;
  border-radius: 12rpx;
}
.view-tab-active {
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.view-tab-text {
  font-size: 26rpx;
  color: #999;
}
.view-tab-text-active {
  color: #1a1a1a;
}
.search-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 20rpx;
  z-index: 1;
}
.search-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx 0 64rpx;
  background: #fff;
  border: 1px solid #e5e0d8;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #1a1a1a;
}
.search-ph {
  color: #b3b3b3;
}
.filter-scroll {
  margin-top: 24rpx;
  white-space: nowrap;
  width: 100%;
}
.filter-row {
  display: inline-flex;
  align-items: center;
  gap: 16rpx;
}
.filter-chip {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #999;
  background: #f0ece5;
}
.filter-chip-active {
  background: #C41E3A;
  color: #fff;
}

/* 日历视图 */
.calendar-view {
  padding: 32rpx 24rpx;
}
.month-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.month-arrow {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.month-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.week-head {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8rpx;
  margin-bottom: 16rpx;
}
.week-cell {
  text-align: center;
  font-size: 22rpx;
  color: #999;
  padding: 16rpx 0;
}
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8rpx;
}
.cal-cell {
  aspect-ratio: 1;
  border-radius: 16rpx;
  padding: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  position: relative;
}
.cal-cell-selected {
  background: rgba(196, 30, 58, 0.1);
  border: 2px solid #C41E3A;
}
.cal-cell-today {
  background: #f0ece5;
}
.cal-day {
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1a1a;
}
.cal-day-today {
  color: #C41E3A;
}
.cal-dots {
  display: flex;
  align-items: center;
  gap: 4rpx;
  margin-top: 4rpx;
}
.cal-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
}
.cal-dot-more {
  font-size: 16rpx;
  color: #999;
}

/* 选中日期场次 */
.selected-section {
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top: 1px solid #ece8e1;
}
.selected-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 24rpx;
  display: block;
}
.empty-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 0;
}
.empty-day-text {
  font-size: 26rpx;
  color: #999;
  margin-top: 16rpx;
}
.empty-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 24rpx;
  padding: 12rpx 28rpx;
  border: 1px solid #d8d2c8;
  border-radius: 12rpx;
}
.empty-btn-text {
  font-size: 26rpx;
  color: #1a1a1a;
}
.card-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 列表视图 */
.list-view {
  padding: 32rpx 24rpx;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
  margin-bottom: 32rpx;
}
.stat-card {
  background: #fff;
  border: 1px solid #ece8e1;
  border-radius: 16rpx;
  padding: 24rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-num {
  font-size: 48rpx;
  font-weight: 700;
  line-height: 1.2;
}
.stat-num-blue {
  color: #2563eb;
}
.stat-num-red {
  color: #dc2626;
}
.stat-num-gray {
  color: #4b5563;
}
.stat-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}
.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 96rpx 0;
}
.empty-list-text {
  font-size: 26rpx;
  color: #999;
  margin-top: 24rpx;
}
.empty-list-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 32rpx;
  padding: 16rpx 32rpx;
  background: #C41E3A;
  border-radius: 12rpx;
}
.empty-list-btn-text {
  font-size: 26rpx;
  color: #fff;
}

/* 对话框 */
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.dialog {
  width: 100%;
  max-width: 640rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
}
.dialog-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  display: block;
}
.dialog-desc {
  font-size: 26rpx;
  color: #999;
  margin-top: 12rpx;
  display: block;
  line-height: 1.5;
}
.tpl-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #f0ece5;
  border-radius: 16rpx;
  margin-top: 32rpx;
}
.tpl-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.tpl-name {
  font-size: 26rpx;
  color: #1a1a1a;
}
.tpl-dl {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.tpl-dl-text {
  font-size: 26rpx;
  color: #1a1a1a;
}
.upload-zone {
  border: 2px dashed #d8d2c8;
  border-radius: 16rpx;
  padding: 64rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 32rpx;
}
.upload-main {
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1a1a;
  margin-top: 24rpx;
}
.upload-sub {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 40rpx;
}
.dlg-btn {
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
}
.dlg-btn-outline {
  border: 1px solid #d8d2c8;
  color: #1a1a1a;
}
.dlg-btn-primary {
  background: #C41E3A;
  color: #fff;
}
.dlg-btn-danger {
  background: #dc2626;
  color: #fff;
}
</style>
