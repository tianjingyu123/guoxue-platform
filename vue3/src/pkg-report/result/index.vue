<template>
  <view class="rr-page">
    <!-- 导航栏 -->
    <view class="rr-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="rr-header-row">
        <view class="rr-icon-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#2c2c2c" />
        </view>
        <text class="rr-header-title">举报处理结果</text>
        <view class="rr-header-spacer" />
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="rr-stats">
      <view class="rr-stat-item">
        <text class="rr-stat-num">{{ stats.total }}</text>
        <text class="rr-stat-label">总举报</text>
      </view>
      <view class="rr-stat-item">
        <text class="rr-stat-num rr-amber">{{ stats.pending + stats.processing }}</text>
        <text class="rr-stat-label">处理中</text>
      </view>
      <view class="rr-stat-item">
        <text class="rr-stat-num rr-green">{{ stats.resolved }}</text>
        <text class="rr-stat-label">已处理</text>
      </view>
      <view class="rr-stat-item">
        <text class="rr-stat-num rr-red">{{ stats.rejected }}</text>
        <text class="rr-stat-label">已驳回</text>
      </view>
    </view>

    <!-- 状态筛选 -->
    <view class="rr-filter">
      <app-icon name="filter" :size="32" color="#999999" />
      <view
        v-for="f in statusFilters"
        :key="f.value"
        class="rr-filter-btn"
        :class="{ 'rr-filter-btn-active': statusFilter === f.value }"
        @tap="statusFilter = f.value"
      >
        <text class="rr-filter-text" :class="{ 'rr-filter-text-active': statusFilter === f.value }">{{ f.label }}</text>
      </view>
    </view>

    <!-- 记录列表 -->
    <view v-if="filteredRecords.length > 0" class="rr-list">
      <view
        v-for="record in filteredRecords"
        :key="record.id"
        class="rr-item"
        @tap="viewDetail(record)"
      >
        <view class="rr-item-row">
          <view class="rr-item-thumb">
            <app-icon :name="targetIcon(record.targetType)" :size="32" color="#999999" />
          </view>
          <view class="rr-item-main">
            <view class="rr-item-title-row">
              <text class="rr-item-title">{{ record.targetTitle }}</text>
              <text class="rr-badge-outline">{{ targetLabel(record.targetType) }}</text>
            </view>
            <text class="rr-item-reason">{{ typeLabel(record.reportType) }}：{{ record.reason }}</text>
            <view class="rr-item-foot">
              <text class="rr-item-time">{{ record.createdAt }}</text>
              <view class="rr-status" :class="'rr-status-' + record.status">
                <text class="rr-status-text" :class="'rr-status-text-' + record.status">{{ statusLabel(record.status) }}</text>
              </view>
            </view>
          </view>
          <app-icon name="chevron-right" :size="36" color="#cccccc" />
        </view>
      </view>
    </view>

    <!-- 空态 -->
    <view v-else class="rr-empty">
      <app-icon name="alert-circle" :size="96" color="#cccccc" />
      <text class="rr-empty-text">暂无举报记录</text>
    </view>

    <!-- 详情弹层 -->
    <view v-if="showDetail" class="rr-mask" @tap="showDetail = false">
      <view class="rr-sheet" @tap.stop>
        <view class="rr-sheet-handle" />
        <text class="rr-sheet-title">举报详情</text>
        <scroll-view scroll-y class="rr-sheet-body" v-if="selectedRecord">
          <!-- 举报对象 -->
          <view class="rr-block">
            <text class="rr-block-title">举报对象</text>
            <view class="rr-target">
              <view class="rr-target-thumb">
                <app-icon :name="targetIcon(selectedRecord.targetType)" :size="36" color="#999999" />
              </view>
              <view>
                <text class="rr-target-name">{{ selectedRecord.targetTitle }}</text>
                <text class="rr-target-type">{{ targetLabel(selectedRecord.targetType) }}</text>
              </view>
            </view>
          </view>

          <!-- 举报信息 -->
          <view class="rr-info">
            <text class="rr-block-title">举报信息</text>
            <view class="rr-info-grid">
              <view class="rr-info-cell">
                <text class="rr-info-key">举报类型：</text>
                <text class="rr-info-val">{{ typeLabel(selectedRecord.reportType) }}</text>
              </view>
              <view class="rr-info-cell">
                <text class="rr-info-key">提交时间：</text>
                <text class="rr-info-val">{{ selectedRecord.createdAt }}</text>
              </view>
            </view>
            <view class="rr-info-reason">
              <text class="rr-info-key">举报原因：</text>
              <text class="rr-info-reason-text">{{ selectedRecord.reason }}</text>
            </view>
          </view>

          <view class="rr-divider" />

          <!-- 处理状态 -->
          <view class="rr-block">
            <view class="rr-status-head">
              <text class="rr-block-title">处理状态</text>
              <view class="rr-status" :class="'rr-status-' + selectedRecord.status">
                <text class="rr-status-text" :class="'rr-status-text-' + selectedRecord.status">{{ statusLabel(selectedRecord.status) }}</text>
              </view>
            </view>

            <view v-if="selectedRecord.result" class="rr-result">
              <view class="rr-result-row">
                <text class="rr-info-key">处理结论：</text>
                <text class="rr-result-conclusion">{{ selectedRecord.result.conclusion }}</text>
              </view>
              <view v-if="selectedRecord.result.action" class="rr-result-item">
                <text class="rr-info-key">处理措施：</text>
                <text class="rr-result-text">{{ selectedRecord.result.action }}</text>
              </view>
              <view class="rr-result-item">
                <text class="rr-info-key">处理说明：</text>
                <text class="rr-result-text">{{ selectedRecord.result.description }}</text>
              </view>
              <view class="rr-result-foot">
                <text class="rr-result-foot-text">处理人：{{ selectedRecord.result.handler }}</text>
                <text class="rr-result-foot-text">{{ selectedRecord.result.handledAt }}</text>
              </view>
            </view>
            <view v-else class="rr-pending">
              <app-icon name="clock" :size="64" color="#f59e0b" />
              <text class="rr-pending-text">正在处理中，请耐心等待</text>
              <text class="rr-pending-sub">预计1-3个工作日内处理完成</text>
            </view>
          </view>

          <!-- 申诉入口 -->
          <view v-if="selectedRecord.status === 'rejected'" class="rr-appeal">
            <view class="rr-appeal-btn" @tap="goAppeal(selectedRecord.id)">
              <app-icon name="alert-triangle" :size="32" color="#2c2c2c" />
              <text class="rr-appeal-btn-text">我要申诉</text>
            </view>
            <text class="rr-appeal-tip">如对处理结果有异议，可提交申诉</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateBack, navigateTo } from '@/utils/router'

const statusBarHeight = ref(0)
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
} catch (e) {
  statusBarHeight.value = 0
}

const statusFilters = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'resolved', label: '已处理' },
  { value: 'rejected', label: '已驳回' },
]

const statusFilter = ref('all')
const showDetail = ref(false)
const selectedRecord = ref<any>(null)

const stats = ref({ total: 5, pending: 1, processing: 1, resolved: 2, rejected: 1 })

const records = ref<any[]>([
  {
    id: 1,
    targetType: 'post',
    targetTitle: '这个八字太神奇了，大家来看看',
    reportType: 'fraud',
    reason: '存在虚假宣传，夸大算命效果诱导消费',
    createdAt: '2024-01-15 10:30',
    status: 'resolved',
    result: {
      conclusion: '举报成立',
      action: '内容下架 + 账号警告',
      description: '经核实，该内容存在虚假宣传行为，已对相关内容进行下架处理。',
      handler: '审核员A',
      handledAt: '2024-01-16 14:22',
    },
  },
  {
    id: 2,
    targetType: 'user',
    targetTitle: '神棍大师',
    reportType: 'harassment',
    reason: '多次对他人进行人身攻击和骚扰',
    createdAt: '2024-01-16 15:45',
    status: 'rejected',
    result: {
      conclusion: '举报不成立',
      description: '经平台审核，被举报用户的行为未违反平台社区规范。',
      handler: '审核员B',
      handledAt: '2024-01-17 09:15',
    },
  },
  {
    id: 3,
    targetType: 'comment',
    targetTitle: '路人甲的评论',
    reportType: 'harassment',
    reason: '评论含有攻击性言论',
    createdAt: '2024-01-17 08:20',
    status: 'resolved',
    result: {
      conclusion: '举报成立',
      action: '评论删除 + 禁言3天',
      description: '经核实，该评论含有攻击性言论，已删除并对发布者禁言处理。',
      handler: '审核员A',
      handledAt: '2024-01-17 16:40',
    },
  },
  {
    id: 4,
    targetType: 'circle',
    targetTitle: '玄学交流圈',
    reportType: 'spam',
    reason: '圈内大量垃圾广告刷屏',
    createdAt: '2024-01-18 11:00',
    status: 'processing',
    result: null,
  },
  {
    id: 5,
    targetType: 'live',
    targetTitle: '今晚八点教你看手相',
    reportType: 'inappropriate',
    reason: '直播内容涉嫌违规',
    createdAt: '2024-01-18 20:15',
    status: 'pending',
    result: null,
  },
])

const filteredRecords = computed(() => {
  if (statusFilter.value === 'all') return records.value
  return records.value.filter((r) => r.status === statusFilter.value)
})

const typeMap: Record<string, string> = {
  inappropriate: '违规内容',
  pornography: '色情低俗',
  spam: '垃圾广告',
  inducement: '诱导分享',
  copyright: '侵权内容',
  harassment: '骚扰辱骂',
  fraud: '欺诈行为',
  other: '其他问题',
}
const targetMap: Record<string, string> = {
  user: '用户',
  post: '帖子',
  comment: '评论',
  course: '课程',
  circle: '圈子',
  live: '直播',
}
const statusMap: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已处理',
  rejected: '已驳回',
}
const iconMap: Record<string, string> = {
  user: 'user',
  post: 'file-text',
  comment: 'message-square',
  course: 'book-open',
  circle: 'users',
  live: 'radio',
}

function typeLabel(t: string) { return typeMap[t] || t }
function targetLabel(t: string) { return targetMap[t] || t }
function statusLabel(s: string) { return statusMap[s] || s }
function targetIcon(t: string) { return iconMap[t] || 'alert-circle' }

function viewDetail(record: any) {
  selectedRecord.value = record
  showDetail.value = true
}

function goAppeal(id: number) {
  navigateTo(`/report/appeal?id=${id}`)
}

function goBack() {
  navigateBack()
}
</script>

<style scoped>
.rr-page {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 40rpx;
}

/* Header */
.rr-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 2rpx solid #ececec;
}
.rr-header-row {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 24rpx;
}
.rr-icon-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rr-header-title {
  flex: 1;
  text-align: center;
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.rr-header-spacer {
  width: 64rpx;
}

/* 统计 */
.rr-stats {
  display: flex;
  gap: 16rpx;
  padding: 24rpx;
  background: rgba(0, 0, 0, 0.02);
}
.rr-stat-item {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.rr-stat-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.rr-amber { color: #d97706; }
.rr-green { color: #16a34a; }
.rr-red { color: #dc2626; }
.rr-stat-label {
  font-size: 22rpx;
  color: #999;
}

/* 筛选 */
.rr-filter {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  border-bottom: 2rpx solid #ececec;
  overflow-x: auto;
  white-space: nowrap;
}
.rr-filter-btn {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 12rpx;
  border: 2rpx solid #ddd;
}
.rr-filter-btn-active {
  background: #C41E3A;
  border-color: #C41E3A;
}
.rr-filter-text {
  font-size: 26rpx;
  color: #666;
}
.rr-filter-text-active {
  color: #fff;
}

/* 列表 */
.rr-item {
  padding: 28rpx 24rpx;
  border-bottom: 2rpx solid #f0f0f0;
}
.rr-item-row {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}
.rr-item-thumb {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rr-item-main {
  flex: 1;
  min-width: 0;
}
.rr-item-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}
.rr-item-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 360rpx;
}
.rr-badge-outline {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border: 2rpx solid #ddd;
  border-radius: 8rpx;
  color: #888;
  flex-shrink: 0;
}
.rr-item-reason {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 26rpx;
  color: #888;
  line-height: 1.4;
  margin-bottom: 16rpx;
}
.rr-item-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rr-item-time {
  font-size: 22rpx;
  color: #aaa;
}

/* 状态徽章 */
.rr-status {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}
.rr-status-pending { background: rgba(245, 158, 11, 0.12); }
.rr-status-processing { background: rgba(59, 130, 246, 0.12); }
.rr-status-resolved { background: rgba(34, 197, 94, 0.12); }
.rr-status-rejected { background: rgba(239, 68, 68, 0.12); }
.rr-status-text {
  font-size: 22rpx;
}
.rr-status-text-pending { color: #d97706; }
.rr-status-text-processing { color: #2563eb; }
.rr-status-text-resolved { color: #16a34a; }
.rr-status-text-rejected { color: #dc2626; }

/* 空态 */
.rr-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
  gap: 24rpx;
}
.rr-empty-text {
  font-size: 28rpx;
  color: #aaa;
}

/* 详情弹层 */
.rr-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
}
.rr-sheet {
  width: 100%;
  height: 85vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 24rpx 32rpx;
  box-sizing: border-box;
}
.rr-sheet-handle {
  width: 72rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: #ddd;
  margin: 0 auto 24rpx;
}
.rr-sheet-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 24rpx;
}
.rr-sheet-body {
  height: calc(85vh - 140rpx);
}

.rr-block {
  margin-bottom: 28rpx;
}
.rr-block-title {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 20rpx;
}
.rr-target {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 16rpx;
  padding: 24rpx;
}
.rr-target-thumb {
  width: 88rpx;
  height: 88rpx;
  border-radius: 16rpx;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rr-target-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.rr-target-type {
  display: block;
  font-size: 24rpx;
  color: #888;
  margin-top: 4rpx;
}
.rr-info {
  margin-bottom: 28rpx;
}
.rr-info-grid {
  display: flex;
  gap: 24rpx;
  margin-bottom: 16rpx;
}
.rr-info-cell {
  flex: 1;
}
.rr-info-key {
  font-size: 26rpx;
  color: #888;
}
.rr-info-val {
  font-size: 26rpx;
  color: #2c2c2c;
}
.rr-info-reason {
  font-size: 26rpx;
}
.rr-info-reason-text {
  display: block;
  font-size: 26rpx;
  color: #2c2c2c;
  margin-top: 8rpx;
}
.rr-divider {
  height: 2rpx;
  background: #ececec;
  margin: 28rpx 0;
}
.rr-status-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.rr-result {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 16rpx;
  padding: 24rpx;
}
.rr-result-row {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}
.rr-result-conclusion {
  font-size: 26rpx;
  font-weight: 500;
  color: #C41E3A;
}
.rr-result-item {
  margin-bottom: 16rpx;
}
.rr-result-text {
  display: block;
  font-size: 26rpx;
  color: #2c2c2c;
  margin-top: 8rpx;
  line-height: 1.5;
}
.rr-result-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 2rpx solid #ececec;
}
.rr-result-foot-text {
  font-size: 22rpx;
  color: #999;
}
.rr-pending {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 16rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.rr-pending-text {
  font-size: 26rpx;
  color: #888;
}
.rr-pending-sub {
  font-size: 22rpx;
  color: #aaa;
}
.rr-appeal {
  padding-top: 24rpx;
}
.rr-appeal-btn {
  height: 88rpx;
  border: 2rpx solid #ddd;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.rr-appeal-btn-text {
  font-size: 28rpx;
  color: #2c2c2c;
}
.rr-appeal-tip {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: #aaa;
  margin-top: 16rpx;
}
</style>
