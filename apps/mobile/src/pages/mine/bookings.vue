<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <text class="back-btn" @click="goBack">←</text>
        <text class="header-title">预约记录</text>
        <view class="header-right" />
      </view>

      <!-- Tab 切换 -->
      <scroll-view scroll-x class="tabs-scroll" show-scrollbar="false">
        <view class="tabs-inner">
          <text
            v-for="t in tabs"
            :key="t.value"
            class="tab"
            :class="{ active: activeTab === t.value }"
            @click="switchTab(t.value)"
          >{{ t.label }}</text>
        </view>
      </scroll-view>
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!loading && bookings.length === 0"
      empty-icon="📅"
      empty-title="暂无预约记录"
      empty-description="还没有预约记录，去看看课程吧"
      skeleton-type="card"
      @retry="loadData"
    >
      <view class="content">
        <view
          v-for="booking in bookings"
          :key="booking.id"
          class="booking-card"
          :class="{ inactive: !isActive(booking.status) }"
        >
          <view class="booking-top">
            <view class="booking-avatar-wrap">
              <image
                v-if="booking.target?.avatar"
                :src="booking.target.avatar"
                class="booking-avatar"
                mode="aspectFill"
              />
              <view v-else class="booking-avatar-placeholder">
                <text class="booking-avatar-icon">📅</text>
              </view>
            </view>
            <view class="booking-info">
              <view class="booking-tags">
                <text class="booking-type-tag">{{ typeName(booking.type) }}</text>
                <text class="booking-status-tag" :class="'bs-' + booking.status">{{ statusName(booking.status) }}</text>
              </view>
              <text class="booking-name">{{ booking.target?.name }}</text>
              <text v-if="booking.target?.title" class="booking-title">{{ booking.target.title }}</text>
              <view class="booking-meta">
                <text class="booking-meta-item">🕐 {{ booking.bookingTime }}</text>
                <text v-if="booking.duration" class="booking-meta-item">⏱ {{ booking.duration }}分钟</text>
              </view>
              <text v-if="booking.location" class="booking-location">📍 {{ booking.location }}</text>
              <text v-if="booking.remark" class="booking-remark">备注：{{ booking.remark }}</text>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view v-if="isActive(booking.status)" class="booking-actions">
            <view class="booking-btn booking-btn-cal" @click="addToCalendar(booking)">＋ 添加到日历</view>
            <view
              v-if="booking.canCancel"
              class="booking-btn booking-btn-cancel"
              @click="confirmCancel(booking)"
            >取消预约</view>
          </view>
        </view>
      </view>
    </DataState>

    <!-- 取消确认弹窗 -->
    <view v-if="cancelDialogOpen" class="dialog-overlay" @click="closeCancelDialog">
      <view class="dialog-content" @click.stop>
        <text class="dialog-title">确认取消预约？</text>
        <view v-if="selectedBooking" class="dialog-info">
          <text class="dialog-info-item">预约对象：{{ selectedBooking.target?.name }}</text>
          <text class="dialog-info-item">预约时间：{{ selectedBooking.bookingTime }}</text>
          <text v-if="selectedBooking.cancelDeadline" class="dialog-info-item dialog-info-warn">
            取消截止：{{ selectedBooking.cancelDeadline }}
          </text>
        </view>
        <view class="dialog-actions">
          <view class="dialog-btn dialog-btn-cancel" @click="closeCancelDialog">再想想</view>
          <view
            class="dialog-btn dialog-btn-confirm"
            :class="{ disabled: cancelling }"
            @click="handleCancel"
          >
            {{ cancelling ? '取消中...' : '确认取消' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'

interface BookingItem {
  id: string
  type: string
  target?: { name?: string; title?: string; avatar?: string }
  status: string
  bookingTime: string
  duration?: number
  location?: string
  remark?: string
  canCancel?: boolean
  cancelDeadline?: string
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const bookings = ref<BookingItem[]>([])
const activeTab = ref('all')
const cancelDialogOpen = ref(false)
const selectedBooking = ref<BookingItem | null>(null)
const cancelling = ref(false)

const tabs = [
  { label: '全部', value: 'all' },
  { label: '连麦咨询', value: 'call' },
  { label: '线下课程', value: 'offline_course' },
  { label: '讲师排期', value: 'instructor' },
]

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  loadError.value = null
  try {
    await new Promise((r) => setTimeout(r, 600))
    bookings.value = [
      {
        id: '1', type: 'call', status: 'confirmed',
        target: { name: '易学大师王老师', title: '专注易经研究30年', avatar: '' },
        bookingTime: '2026-06-10 14:00', duration: 30, canCancel: true,
      },
      {
        id: '2', type: 'offline_course', status: 'pending',
        target: { name: '八字命理进阶班', title: '系统学习八字命理' },
        bookingTime: '2026-06-15 09:00', duration: 120, location: '北京市国学中心',
        canCancel: true, cancelDeadline: '2026-06-13 09:00',
      },
      {
        id: '3', type: 'instructor', status: 'completed',
        target: { name: '风水师李明', title: '阳宅风水专家' },
        bookingTime: '2026-06-01 10:00', duration: 60,
      },
    ]
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function switchTab(tab: string) {
  if (activeTab.value === tab) return
  activeTab.value = tab
  loadData()
}

function isActive(s: string) {
  return s === 'pending' || s === 'confirmed'
}

function typeName(type: string) {
  const map: Record<string, string> = { call: '连麦咨询', offline_course: '线下课程', instructor: '讲师排期' }
  return map[type] || type
}

function statusName(s: string) {
  const map: Record<string, string> = { pending: '待确认', confirmed: '已确认', cancelled: '已取消', completed: '已完成' }
  return map[s] || s
}

function confirmCancel(booking: BookingItem) {
  selectedBooking.value = booking
  cancelDialogOpen.value = true
}

function closeCancelDialog() {
  cancelDialogOpen.value = false
  selectedBooking.value = null
}

async function handleCancel() {
  if (!selectedBooking.value) return
  cancelling.value = true
  try {
    await new Promise((r) => setTimeout(r, 800))
    bookings.value = bookings.value.map((b) =>
      b.id === selectedBooking.value!.id ? { ...b, status: 'cancelled', canCancel: false } : b
    )
    cancelDialogOpen.value = false
    selectedBooking.value = null
    uni.showToast({ title: '预约已取消', icon: 'success' })
  } catch {
    uni.showToast({ title: '取消失败', icon: 'none' })
  } finally {
    cancelling.value = false
  }
}

function addToCalendar(booking: BookingItem) {
  uni.showToast({ title: '已添加到日历', icon: 'success' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
}

/* 顶部导航 */
.header {
  background: #fff;
  border-bottom: 1rpx solid #E8E3DB;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}
.back-btn { font-size: 36rpx; color: #2C2C2C; padding: 8rpx; }
.header-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.header-right { width: 80rpx; }

/* Tab 切换 */
.tabs-scroll { white-space: nowrap; padding: 0 24rpx 20rpx; }
.tabs-inner { display: inline-flex; gap: 16rpx; }
.tab {
  display: inline-block; font-size: 24rpx; color: #666;
  padding: 10rpx 28rpx; border-radius: 28rpx; background: #F5F0E8;
  transition: all 0.2s;
}
.tab.active {
  background: #C41E3A; color: #fff; font-weight: 500;
}

/* 内容 */
.content { padding: 20rpx 24rpx; }
.booking-card {
  background: #fff; border-radius: 20rpx; padding: 24rpx;
  margin-bottom: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}
.booking-card.inactive { opacity: 0.7; }
.booking-top { display: flex; gap: 16rpx; }
.booking-avatar-wrap { width: 80rpx; height: 80rpx; flex-shrink: 0; }
.booking-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; }
.booking-avatar-placeholder {
  width: 80rpx; height: 80rpx; border-radius: 50%;
  background: #F5F0E8; display: flex; align-items: center; justify-content: center;
}
.booking-avatar-icon { font-size: 32rpx; }
.booking-info { flex: 1; min-width: 0; }
.booking-tags { display: flex; gap: 8rpx; margin-bottom: 8rpx; }
.booking-type-tag {
  font-size: 20rpx; color: #999; background: #F5F0E8;
  padding: 2rpx 12rpx; border-radius: 8rpx;
}
.booking-status-tag {
  font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx;
}
.bs-pending { background: #FFF3E0; color: #FF9800; }
.bs-confirmed { background: #E8F5E9; color: #22C55E; }
.bs-cancelled { background: #F5F5F5; color: #999; }
.bs-completed { background: #E3F2FD; color: #2196F3; }
.booking-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.booking-title { font-size: 22rpx; color: #C9A96E; display: block; margin-top: 4rpx; }
.booking-meta { display: flex; gap: 20rpx; margin-top: 8rpx; }
.booking-meta-item { font-size: 22rpx; color: #999; }
.booking-location { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.booking-remark { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }

.booking-actions {
  display: flex; gap: 16rpx; margin-top: 16rpx; padding-top: 16rpx;
  border-top: 1rpx solid #F5F0E8;
}
.booking-btn {
  flex: 1; height: 64rpx; border-radius: 16rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 24rpx; font-weight: 500;
}
.booking-btn-cal { background: #F5F0E8; color: #666; }
.booking-btn-cancel { border: 1rpx solid #FFCDD2; color: #EF4444; background: #FFF5F5; }

/* 弹窗 */
.dialog-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; padding: 48rpx;
}
.dialog-content {
  background: #fff; border-radius: 24rpx; padding: 40rpx 32rpx;
  width: 100%; max-width: 560rpx;
}
.dialog-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; text-align: center; display: block; margin-bottom: 20rpx; }
.dialog-info { margin-bottom: 28rpx; }
.dialog-info-item { font-size: 24rpx; color: #666; display: block; line-height: 1.8; }
.dialog-info-warn { color: #F59E0B; }
.dialog-actions { display: flex; gap: 20rpx; }
.dialog-btn {
  flex: 1; height: 80rpx; border-radius: 16rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 26rpx; font-weight: 500;
}
.dialog-btn-cancel { background: #F5F0E8; color: #666; }
.dialog-btn-confirm { background: #EF4444; color: #fff; }
.dialog-btn-confirm.disabled { opacity: 0.5; }
</style>
