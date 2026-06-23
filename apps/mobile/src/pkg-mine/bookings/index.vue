<template>
  <view class="bookings-page">
    <!-- 顶部导航 -->
    <view class="bk-header">
      <view class="bk-header-bar">
        <view class="bk-back" @tap="goBack">
          <app-icon name="chevron-left" :size="44" color="#374151" />
        </view>
        <text class="bk-title">预约记录</text>
        <view class="bk-placeholder" />
      </view>
      <!-- 分段 Tab -->
      <view class="bk-tabs-wrap">
        <view class="bk-tabs">
          <view
            v-for="tab in tabs"
            :key="tab.value"
            class="bk-tab"
            :class="{ active: activeTab === tab.value }"
            @tap="activeTab = tab.value"
          >
            <text class="bk-tab-text">{{ tab.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view scroll-y class="bk-scroll">
      <view class="bk-list">
        <view v-if="filteredList.length === 0" class="bk-empty">
          <app-icon name="calendar" :size="96" color="rgba(0,0,0,0.15)" />
          <text class="bk-empty-text">暂无预约记录</text>
        </view>

        <view
          v-for="bk in filteredList"
          :key="bk.id"
          class="bk-card"
          :class="{ inactive: !isActive(bk) }"
        >
          <view class="bk-card-row">
            <!-- 头像/图标 -->
            <view v-if="bk.target.avatar" class="bk-avatar-wrap">
              <image class="bk-avatar" :src="bk.target.avatar" mode="aspectFill" />
            </view>
            <view v-else class="bk-icon-wrap">
              <app-icon :name="typeIcon(bk.type)" :size="40" :color="typeColor(bk.type)" />
            </view>

            <!-- 信息 -->
            <view class="bk-info">
              <view class="bk-tags">
                <text class="bk-type-tag">{{ typeName(bk.type) }}</text>
                <text class="bk-status-tag" :class="'status-' + bk.status">{{ statusName(bk.status) }}</text>
              </view>
              <text class="bk-name">{{ bk.target.name }}</text>
              <text v-if="bk.target.title" class="bk-target-title">{{ bk.target.title }}</text>
              <view class="bk-meta">
                <view class="bk-meta-item">
                  <app-icon name="calendar" :size="26" color="#9CA3AF" />
                  <text class="bk-meta-text">{{ bk.bookingTime }}</text>
                </view>
                <view v-if="bk.duration" class="bk-meta-item">
                  <app-icon name="clock" :size="26" color="#9CA3AF" />
                  <text class="bk-meta-text">{{ bk.duration }}分钟</text>
                </view>
              </view>
              <view v-if="bk.location" class="bk-loc">
                <app-icon name="map-pin" :size="26" color="#9CA3AF" />
                <text class="bk-loc-text">{{ bk.location }}</text>
              </view>
              <text v-if="bk.remark" class="bk-remark">备注：{{ bk.remark }}</text>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view v-if="isActive(bk)" class="bk-actions">
            <view class="bk-action-btn" @tap="addToCalendar(bk)">
              <app-icon name="plus" :size="26" color="#374151" />
              <text class="bk-action-text">添加到日历</text>
            </view>
            <view v-if="bk.canCancel" class="bk-action-btn cancel" @tap="openCancel(bk)">
              <app-icon name="x" :size="26" color="#EF4444" />
              <text class="bk-action-text cancel-text">取消预约</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 取消确认弹窗 -->
    <view v-if="cancelDialogOpen" class="dialog-mask" @tap="cancelDialogOpen = false">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">确认取消预约？</text>
        <view v-if="selectedBooking" class="dialog-desc">
          <text class="dialog-desc-line">预约对象：{{ selectedBooking.target.name }}</text>
          <text class="dialog-desc-line">预约时间：{{ selectedBooking.bookingTime }}</text>
          <text v-if="selectedBooking.cancelDeadline" class="dialog-desc-line warn">取消截止：{{ selectedBooking.cancelDeadline }}</text>
        </view>
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @tap="cancelDialogOpen = false"><text class="dialog-btn-text">再想想</text></view>
          <view class="dialog-btn confirm" @tap="doCancel"><text class="dialog-btn-text confirm-text">确认取消</text></view>
        </view>
      </view>
    </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { goBack } from '@/utils/router'

type BookingType = 'call' | 'offline_course' | 'instructor'
type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'expired'
interface BookingItem {
  id: number
  type: BookingType
  target: { id: number; name: string; avatar?: string; title?: string }
  bookingTime: string
  duration?: number
  location?: string
  status: BookingStatus
  remark?: string
  canCancel: boolean
  cancelDeadline?: string
}

const activeTab = ref<'all' | BookingType>('all')
const cancelDialogOpen = ref(false)
const selectedBooking = ref<BookingItem | null>(null)

const tabs = [
  { value: 'all', label: '全部' },
  { value: 'call', label: '连麦咨询' },
  { value: 'offline_course', label: '线下课程' },
  { value: 'instructor', label: '讲师排期' },
] as const

const bookings = ref<BookingItem[]>([
  { id: 1, type: 'call', target: { id: 101, name: '张玄明', avatar: '', title: '资深命理师' }, bookingTime: '2026-06-05 14:00', duration: 30, status: 'confirmed', remark: '咨询八字流年运势', canCancel: true, cancelDeadline: '2026-06-05 12:00' },
  { id: 2, type: 'offline_course', target: { id: 201, name: '国学经典读书会', title: '第三期·论语精读' }, bookingTime: '2026-06-08 09:00', duration: 180, location: '北京市朝阳区国学文化中心3层', status: 'pending', canCancel: true, cancelDeadline: '2026-06-07 18:00' },
  { id: 3, type: 'instructor', target: { id: 301, name: '李易阳', avatar: '', title: '风水大师·高级讲师' }, bookingTime: '2026-06-10 10:00', duration: 60, status: 'confirmed', remark: '预约风水堪舆指导', canCancel: true, cancelDeadline: '2026-06-09 18:00' },
  { id: 4, type: 'call', target: { id: 102, name: '王紫微', avatar: '', title: '紫微斗数专家' }, bookingTime: '2026-06-01 16:00', duration: 45, status: 'completed', remark: '紫微命盘详解', canCancel: false },
  { id: 5, type: 'offline_course', target: { id: 202, name: '八字命理实战班', title: '初级班·第一期' }, bookingTime: '2026-05-25 14:00', duration: 240, location: '上海市静安区易学研究院', status: 'completed', canCancel: false },
  { id: 6, type: 'instructor', target: { id: 302, name: '陈道长', avatar: '', title: '道家养生专家' }, bookingTime: '2026-05-20 09:00', duration: 90, status: 'cancelled', remark: '因个人原因取消', canCancel: false },
  { id: 7, type: 'call', target: { id: 103, name: '赵玄真', avatar: '', title: '六爻预测师' }, bookingTime: '2026-05-10 11:00', duration: 30, status: 'expired', canCancel: false },
])

const filteredList = computed(() => {
  if (activeTab.value === 'all') return bookings.value
  return bookings.value.filter((b) => b.type === activeTab.value)
})

function isActive(b: BookingItem) {
  return b.status === 'pending' || b.status === 'confirmed'
}
function typeName(type: BookingType) {
  return { call: '连麦咨询', offline_course: '线下课程', instructor: '讲师排期' }[type] || '预约'
}
function typeIcon(type: BookingType) {
  return { call: 'phone', offline_course: 'map-pin', instructor: 'user' }[type] || 'calendar'
}
function typeColor(type: BookingType) {
  return { call: '#3B82F6', offline_course: '#22C55E', instructor: '#A855F7' }[type] || '#999'
}
function statusName(status: BookingStatus) {
  return { pending: '待确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消', expired: '已过期' }[status] || '未知'
}

function openCancel(b: BookingItem) {
  selectedBooking.value = b
  cancelDialogOpen.value = true
}
function doCancel() {
  if (selectedBooking.value) {
    const b = bookings.value.find((x) => x.id === selectedBooking.value!.id)
    if (b) { b.status = 'cancelled'; b.canCancel = false }
    uni.showToast({ title: '预约已取消', icon: 'none' })
  }
  cancelDialogOpen.value = false
  selectedBooking.value = null
}
function addToCalendar(b: BookingItem) {
  uni.showToast({ title: '已生成日历文件', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.bookings-page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}

.bk-header {
  background: #fff;
  border-bottom: 2rpx solid #f3f4f6;
  padding-top: var(--status-bar-height, 0);
}
.bk-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
}
.bk-back { display: flex; align-items: center; }
.bk-title { font-size: 34rpx; font-weight: 600; color: #111827; }
.bk-placeholder { width: 44rpx; }

.bk-tabs-wrap { padding: 0 32rpx 24rpx; }
.bk-tabs {
  display: flex;
  background: #f3f4f6;
  padding: 8rpx;
  border-radius: 16rpx;
}
.bk-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14rpx 0;
  border-radius: 12rpx;
}
.bk-tab.active { background: #fff; }
.bk-tab-text { font-size: 26rpx; color: #6b7280; }
.bk-tab.active .bk-tab-text { color: #c41e3a; }

.bk-scroll { flex: 1; height: 0; }
.bk-list { padding: 32rpx; display: flex; flex-direction: column; gap: 24rpx; }

.bk-empty { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.bk-empty-text { font-size: 28rpx; color: #999; margin-top: 24rpx; }

.bk-card { background: #fff; border-radius: 24rpx; padding: 32rpx; }
.bk-card.inactive { opacity: 0.7; }
.bk-card-row { display: flex; align-items: flex-start; gap: 24rpx; }
.bk-avatar-wrap, .bk-icon-wrap { flex-shrink: 0; }
.bk-avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: #f3f4f6; }
.bk-icon-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bk-info { flex: 1; min-width: 0; }
.bk-tags { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.bk-type-tag {
  font-size: 22rpx;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}
.bk-status-tag { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 8rpx; }
.status-pending { background: #fffbeb; color: #d97706; }
.status-confirmed { background: #f0fdf4; color: #16a34a; }
.status-completed { background: #f3f4f6; color: #6b7280; }
.status-cancelled { background: #fef2f2; color: #ef4444; }
.status-expired { background: #f3f4f6; color: #9ca3af; }
.bk-name { display: block; font-size: 30rpx; font-weight: 500; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bk-target-title { display: block; font-size: 26rpx; color: #6b7280; margin-top: 2rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bk-meta { display: flex; align-items: center; gap: 32rpx; margin-top: 16rpx; }
.bk-meta-item { display: flex; align-items: center; gap: 8rpx; }
.bk-meta-text { font-size: 22rpx; color: #9ca3af; }
.bk-loc { display: flex; align-items: center; gap: 8rpx; margin-top: 8rpx; }
.bk-loc-text { font-size: 22rpx; color: #9ca3af; }
.bk-remark { display: block; font-size: 22rpx; color: #9ca3af; margin-top: 8rpx; }

.bk-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid #f3f4f6;
}
.bk-action-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 24rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
}
.bk-action-btn.cancel { border-color: #fecaca; }
.bk-action-text { font-size: 24rpx; color: #374151; }
.bk-action-text.cancel-text { color: #ef4444; }

/* 弹窗 */
.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.dialog { width: 600rpx; background: #fff; border-radius: 32rpx; padding: 40rpx; }
.dialog-title { display: block; font-size: 32rpx; font-weight: 600; color: #111827; margin-bottom: 16rpx; }
.dialog-desc { display: flex; flex-direction: column; gap: 6rpx; margin-bottom: 32rpx; }
.dialog-desc-line { font-size: 26rpx; color: #666; }
.dialog-desc-line.warn { color: #d97706; }
.dialog-actions { display: flex; gap: 24rpx; }
.dialog-btn { flex: 1; height: 80rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.dialog-btn.cancel { background: #f4f4f5; }
.dialog-btn.confirm { background: #ef4444; }
.dialog-btn-text { font-size: 28rpx; color: #666; }
.dialog-btn-text.confirm-text { color: #fff; }
</style>
