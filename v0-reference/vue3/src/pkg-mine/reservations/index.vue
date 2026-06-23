<template>
  <view class="rsv-page">
    <!-- 顶部导航 -->
    <view class="rsv-header">
      <view class="rsv-header-bar">
        <view class="rsv-back" @tap="goBack">
          <app-icon name="chevron-left" :size="44" color="#374151" />
        </view>
        <text class="rsv-title">我的预约</text>
        <view class="rsv-placeholder" />
      </view>
      <!-- 类型 Tab -->
      <view class="rsv-tabs-wrap">
        <scroll-view scroll-x class="rsv-tabs-scroll" :show-scrollbar="false">
          <view class="rsv-tabs">
            <view
              v-for="tab in tabs"
              :key="tab.id"
              class="rsv-tab"
              :class="{ active: activeTab === tab.id }"
              @tap="activeTab = tab.id"
            >
              <text class="rsv-tab-text" :class="{ active: activeTab === tab.id }">{{ tab.label }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 预约列表 -->
    <scroll-view scroll-y class="rsv-scroll">
      <view class="rsv-list">
        <block v-if="filteredReservations.length > 0">
          <view v-for="rsv in filteredReservations" :key="rsv.id" class="rsv-card">
            <!-- 卡片头部 -->
            <view class="rsv-card-head">
              <view class="rsv-card-head-left">
                <view class="rsv-type-icon" :style="{ background: typeBg(rsv.type) }">
                  <app-icon :name="typeIcon(rsv.type)" :size="28" :color="typeColor(rsv.type)" />
                </view>
                <text class="rsv-type-label">{{ typeLabel(rsv.type) }}</text>
              </view>
              <text class="rsv-status-badge" :class="'status-' + rsv.status">{{ statusLabel(rsv.status) }}</text>
            </view>

            <!-- 卡片内容 -->
            <view class="rsv-card-body">
              <text class="rsv-card-title">{{ rsv.title }}</text>

              <!-- 预约对象 -->
              <view class="rsv-target">
                <view class="rsv-avatar">
                  <image v-if="rsv.target.avatar" class="rsv-avatar-img" :src="rsv.target.avatar" mode="aspectFill" />
                  <text v-else class="rsv-avatar-fallback">{{ rsv.target.name.charAt(0) }}</text>
                </view>
                <view class="rsv-target-info">
                  <view class="rsv-target-name-row">
                    <text class="rsv-target-name">{{ rsv.target.name }}</text>
                    <text v-if="rsv.target.isVerified" class="rsv-verified">V</text>
                  </view>
                  <view v-if="rsv.type === 'call'" class="rsv-call-meta">
                    <app-icon :name="rsv.callType === 'video' ? 'video' : 'mic'" :size="24" color="#999999" />
                    <text class="rsv-call-meta-text">{{ rsv.callType === 'video' ? '视频连麦' : '语音连麦' }}</text>
                    <text class="rsv-call-meta-text">· {{ rsv.duration }}分钟</text>
                  </view>
                </view>
              </view>

              <!-- 时间地点信息 -->
              <view class="rsv-meta">
                <view class="rsv-meta-row">
                  <app-icon name="calendar" :size="28" color="#999999" />
                  <text class="rsv-meta-text">{{ rsv.date }}</text>
                  <app-icon name="clock" :size="28" color="#999999" style="margin-left: 16rpx;" />
                  <text class="rsv-meta-text">{{ rsv.time }}</text>
                </view>
                <view v-if="rsv.location" class="rsv-meta-row align-start">
                  <app-icon name="map-pin" :size="28" color="#999999" />
                  <text class="rsv-meta-text line-clamp">{{ rsv.location }}</text>
                </view>
                <view v-if="rsv.status === 'cancelled' && rsv.cancelReason" class="rsv-cancel-reason">
                  <app-icon name="x" :size="24" color="#ef4444" />
                  <text class="rsv-cancel-reason-text">取消原因：{{ rsv.cancelReason }}</text>
                </view>
              </view>

              <!-- 价格 -->
              <view v-if="rsv.price > 0" class="rsv-price-row">
                <text class="rsv-price-label">预约费用</text>
                <text class="rsv-price-value">¥{{ rsv.price }}</text>
              </view>
            </view>

            <!-- 操作按钮 -->
            <view class="rsv-card-foot">
              <block v-if="rsv.status === 'pending' || rsv.status === 'confirmed'">
                <view class="rsv-btn-text-only" @tap="handleCancel(rsv.id)">
                  <text class="rsv-btn-text-only-label">取消预约</text>
                </view>
                <view
                  v-if="rsv.status === 'confirmed' && rsv.type === 'call'"
                  class="rsv-btn-primary"
                  @tap="goCall(rsv.id)"
                >
                  <text class="rsv-btn-primary-label">进入连麦</text>
                </view>
                <view
                  v-if="rsv.status === 'confirmed' && rsv.type === 'offline'"
                  class="rsv-btn-primary"
                  @tap="goCourse(rsv.id)"
                >
                  <text class="rsv-btn-primary-label">查看详情</text>
                  <app-icon name="chevron-right" :size="28" color="#ffffff" />
                </view>
              </block>
              <view
                v-else-if="rsv.status === 'completed'"
                class="rsv-btn-ghost"
                @tap="goDetail(rsv.id)"
              >
                <text class="rsv-btn-ghost-label">查看详情</text>
                <app-icon name="chevron-right" :size="28" color="#2c2c2c" />
              </view>
              <view v-else-if="rsv.status === 'cancelled'" class="rsv-btn-primary" @tap="handleRebook">
                <app-icon name="refresh-cw" :size="28" color="#ffffff" />
                <text class="rsv-btn-primary-label">再次预约</text>
              </view>
            </view>
          </view>
        </block>

        <!-- 空态 -->
        <view v-else class="rsv-empty">
          <view class="rsv-empty-icon">
            <app-icon name="calendar" :size="64" color="#999999" />
          </view>
          <text class="rsv-empty-title">暂无预约记录</text>
          <text class="rsv-empty-sub">去找讲师咨询或报名线下课吧</text>
          <view class="rsv-empty-btn" @tap="goExperts">
            <text class="rsv-empty-btn-label">找讲师咨询</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 取消确认弹窗 -->
    <view v-if="showCancelModal" class="rsv-dialog-mask" @tap="showCancelModal = false">
      <view class="rsv-dialog" @tap.stop>
        <text class="rsv-dialog-title">确认取消预约？</text>
        <text class="rsv-dialog-desc">取消后预约费用将原路退回，如有疑问请联系客服</text>
        <view class="rsv-dialog-actions">
          <view class="rsv-dialog-btn cancel" @tap="showCancelModal = false">
            <text class="rsv-dialog-btn-label">再想想</text>
          </view>
          <view class="rsv-dialog-btn confirm" @tap="confirmCancel">
            <text class="rsv-dialog-btn-label confirm-label">确认取消</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { goBack, navigateTo } from '@/utils/router'

type ReservationType = 'call' | 'offline' | 'schedule'
type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

interface Reservation {
  id: number
  type: ReservationType
  title: string
  target: { name: string; avatar: string; isVerified?: boolean }
  date: string
  time: string
  duration?: number
  status: ReservationStatus
  callType?: string
  price: number
  location?: string
  seats?: number
  cancelReason?: string
}

const tabs = [
  { id: 'all', label: '全部' },
  { id: 'call', label: '连麦咨询' },
  { id: 'offline', label: '线下课程' },
  { id: 'schedule', label: '讲师排期' },
]

const reservationsData: Reservation[] = [
  {
    id: 1,
    type: 'call',
    title: '八字命理咨询',
    target: { name: '周易大师', avatar: '', isVerified: true },
    date: '2024-12-20',
    time: '14:00-14:30',
    duration: 30,
    status: 'confirmed',
    callType: 'video',
    price: 150,
  },
  {
    id: 2,
    type: 'offline',
    title: '八字入门实战班',
    target: { name: '热卜学院·北京中心', avatar: '' },
    date: '2024-12-22',
    time: '09:00-12:00',
    location: '北京市朝阳区望京SOHO T1',
    status: 'pending',
    price: 299,
    seats: 1,
  },
  {
    id: 3,
    type: 'schedule',
    title: '紫微斗数专项咨询',
    target: { name: '张玄风', avatar: '', isVerified: true },
    date: '2024-12-25',
    time: '10:00-11:00',
    status: 'pending',
    price: 200,
  },
  {
    id: 4,
    type: 'call',
    title: '风水布局指导',
    target: { name: '陈风水', avatar: '', isVerified: true },
    date: '2024-12-15',
    time: '15:00-15:45',
    duration: 45,
    status: 'completed',
    callType: 'audio',
    price: 180,
  },
  {
    id: 5,
    type: 'offline',
    title: '线下雅集·茶道与易理',
    target: { name: '热卜学院·上海中心', avatar: '' },
    date: '2024-12-10',
    time: '14:00-17:00',
    location: '上海市静安区南京西路1788号',
    status: 'cancelled',
    price: 0,
    cancelReason: '个人原因取消',
  },
]

const activeTab = ref('all')
const showCancelModal = ref(false)
const selectedReservation = ref<number | null>(null)

const filteredReservations = computed(() =>
  activeTab.value === 'all'
    ? reservationsData
    : reservationsData.filter((r) => r.type === activeTab.value)
)

const typeLabel = (t: ReservationType) =>
  ({ call: '连麦咨询', offline: '线下课程', schedule: '讲师排期' }[t])
const typeIcon = (t: ReservationType) =>
  ({ call: 'phone', offline: 'graduation-cap', schedule: 'calendar' }[t])
const typeColor = (t: ReservationType) =>
  ({ call: '#3b82f6', offline: '#22c55e', schedule: '#a855f7' }[t])
const typeBg = (t: ReservationType) =>
  ({ call: 'rgba(59,130,246,0.1)', offline: 'rgba(34,197,94,0.1)', schedule: 'rgba(168,85,247,0.1)' }[t])
const statusLabel = (s: ReservationStatus) =>
  ({ pending: '待确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消' }[s])

const handleCancel = (id: number) => {
  selectedReservation.value = id
  showCancelModal.value = true
}
const confirmCancel = () => {
  showCancelModal.value = false
  selectedReservation.value = null
}
const handleRebook = () => {}
const goCall = (id: number) => navigateTo(`/call/${id}`)
const goCourse = (id: number) => navigateTo(`/offline/courses/${id}`)
const goDetail = (id: number) => navigateTo(`/reservations/${id}`)
const goExperts = () => navigateTo('/experts')
</script>

<style scoped lang="scss">
.rsv-page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.rsv-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(250, 248, 245, 0.95);
  backdrop-filter: blur(20rpx);
  border-bottom: 2rpx solid #e8e0d5;
  padding-top: var(--status-bar-height, 0);
}
.rsv-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.rsv-back {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -16rpx;
}
.rsv-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.rsv-placeholder {
  width: 72rpx;
}

/* 类型 Tab */
.rsv-tabs-wrap {
  background: #faf8f5;
  border-bottom: 2rpx solid #e8e0d5;
}
.rsv-tabs-scroll {
  width: 100%;
  white-space: nowrap;
}
.rsv-tabs {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 32rpx;
}
.rsv-tab {
  flex-shrink: 0;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background: #f5f1eb;
  white-space: nowrap;
}
.rsv-tab.active {
  background: #c41e3a;
}
.rsv-tab-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #999999;
  white-space: nowrap;
}
.rsv-tab-text.active {
  color: #ffffff;
}

/* 列表 */
.rsv-scroll {
  flex: 1;
  height: 0;
}
.rsv-list {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 卡片 */
.rsv-card {
  background: #ffffff;
  border: 2rpx solid #e8e0d5;
  border-radius: 24rpx;
  overflow: hidden;
}
.rsv-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid #e8e0d5;
}
.rsv-card-head-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.rsv-type-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rsv-type-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.rsv-status-badge {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  border: 2rpx solid;
}
.status-pending {
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
  border-color: rgba(249, 115, 22, 0.2);
}
.status-confirmed {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border-color: rgba(34, 197, 94, 0.2);
}
.status-completed {
  background: #f5f1eb;
  color: #999999;
  border-color: #e8e0d5;
}
.status-cancelled {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.2);
}

/* 卡片内容 */
.rsv-card-body {
  padding: 32rpx;
}
.rsv-card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 24rpx;
  display: block;
}
.rsv-target {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 24rpx;
}
.rsv-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f5f1eb;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.rsv-avatar-img {
  width: 100%;
  height: 100%;
}
.rsv-avatar-fallback {
  font-size: 28rpx;
  color: #2c2c2c;
}
.rsv-target-info {
  flex: 1;
}
.rsv-target-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.rsv-target-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.rsv-verified {
  font-size: 20rpx;
  padding: 0 8rpx;
  line-height: 28rpx;
  background: rgba(201, 169, 110, 0.2);
  color: #c9a96e;
  border-radius: 8rpx;
}
.rsv-call-meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 4rpx;
}
.rsv-call-meta-text {
  font-size: 24rpx;
  color: #999999;
}

/* 时间地点 */
.rsv-meta {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.rsv-meta-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.rsv-meta-row.align-start {
  align-items: flex-start;
}
.rsv-meta-text {
  font-size: 28rpx;
  color: #999999;
}
.rsv-meta-text.line-clamp {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.rsv-cancel-reason {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.rsv-cancel-reason-text {
  font-size: 24rpx;
  color: #ef4444;
}

/* 价格 */
.rsv-price-row {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid #e8e0d5;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rsv-price-label {
  font-size: 24rpx;
  color: #999999;
}
.rsv-price-value {
  font-size: 30rpx;
  font-weight: 600;
  color: #c41e3a;
}

/* 操作按钮 */
.rsv-card-foot {
  padding: 24rpx 32rpx;
  background: rgba(245, 241, 235, 0.3);
  border-top: 2rpx solid #e8e0d5;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 24rpx;
}
.rsv-btn-text-only {
  padding: 12rpx 32rpx;
}
.rsv-btn-text-only-label {
  font-size: 28rpx;
  color: #999999;
}
.rsv-btn-primary {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 32rpx;
  background: #c41e3a;
  border-radius: 999rpx;
}
.rsv-btn-primary-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #ffffff;
}
.rsv-btn-ghost {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 32rpx;
}
.rsv-btn-ghost-label {
  font-size: 28rpx;
  color: #2c2c2c;
}

/* 空态 */
.rsv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 128rpx 0;
}
.rsv-empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #f5f1eb;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.rsv-empty-title {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 8rpx;
}
.rsv-empty-sub {
  font-size: 24rpx;
  color: rgba(153, 153, 153, 0.7);
  margin-bottom: 32rpx;
}
.rsv-empty-btn {
  padding: 16rpx 48rpx;
  background: #c41e3a;
  border-radius: 999rpx;
}
.rsv-empty-btn-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #ffffff;
}

/* 取消弹窗 */
.rsv-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  padding: 32rpx;
}
.rsv-dialog {
  width: 100%;
  max-width: 600rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 48rpx;
}
.rsv-dialog-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
  text-align: center;
  display: block;
  margin-bottom: 16rpx;
}
.rsv-dialog-desc {
  font-size: 28rpx;
  color: #999999;
  text-align: center;
  display: block;
  margin-bottom: 48rpx;
  line-height: 1.5;
}
.rsv-dialog-actions {
  display: flex;
  gap: 24rpx;
}
.rsv-dialog-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
}
.rsv-dialog-btn.cancel {
  background: #f5f1eb;
}
.rsv-dialog-btn.confirm {
  background: #ef4444;
}
.rsv-dialog-btn-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.rsv-dialog-btn-label.confirm-label {
  color: #ffffff;
}
</style>
