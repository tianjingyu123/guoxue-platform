<template>
  <view class="page">
    <view class="header">
      <view class="header-inner">
        <text class="back-btn" @click="goBack">‹</text>
        <text class="header-title">举报处理结果</text>
        <view style="width:60rpx" />
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-bar">
      <view class="stat-item"><text class="stat-num">{{ stats.total }}</text><text class="stat-label">总举报</text></view>
      <view class="stat-item"><text class="stat-num orange">{{ stats.pending + stats.processing }}</text><text class="stat-label">处理中</text></view>
      <view class="stat-item"><text class="stat-num green">{{ stats.resolved }}</text><text class="stat-label">已处理</text></view>
      <view class="stat-item"><text class="stat-num red">{{ stats.rejected }}</text><text class="stat-label">已驳回</text></view>
    </view>

    <!-- 状态筛选 -->
    <scroll-view scroll-x class="filter-scroll" show-scrollbar="false">
      <view class="filter-row">
        <text v-for="f in statusFilters" :key="f.value" class="filter-tag" :class="{ active: statusFilter === f.value }" @click="statusFilter = f.value">{{ f.label }}</text>
      </view>
    </scroll-view>

    <view v-if="!filteredRecords.length" class="empty-state">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无举报记录</text>
    </view>

    <view v-else class="record-list">
      <view v-for="r in filteredRecords" :key="r.id" class="record-item" @click="selectedRecord = r; showDetail = true">
        <view class="ri-left">
          <view class="ri-icon">{{ typeIcon(r.targetType) }}</view>
          <view class="ri-info">
            <view class="ri-title-row">
              <text class="ri-title">{{ r.targetTitle }}</text>
              <text class="ri-type-tag">{{ typeLabel(r.targetType) }}</text>
            </view>
            <text class="ri-reason">{{ reasonLabel(r.reportType) }}：{{ r.reason }}</text>
            <view class="ri-bottom">
              <text class="ri-time">{{ r.createdAt }}</text>
              <text class="ri-status" :class="'s-' + r.status">{{ statusLabel(r.status) }}</text>
            </view>
          </view>
        </view>
        <text class="ri-arrow">›</text>
      </view>
    </view>

    <!-- 详情弹层 -->
    <view v-if="showDetail && selectedRecord" class="overlay" @click="showDetail = false">
      <view class="detail-sheet" @click.stop>
        <view class="ds-header"><text class="ds-title">举报详情</text><text class="ds-close" @click="showDetail = false">✕</text></view>
        <scroll-view scroll-y class="ds-body">
          <view class="ds-section">
            <text class="ds-section-title">举报对象</text>
            <view class="ds-target">
              <text class="ds-target-icon">{{ typeIcon(selectedRecord.targetType) }}</text>
              <view><text class="ds-target-name">{{ selectedRecord.targetTitle }}</text><text class="ds-target-type">{{ typeLabel(selectedRecord.targetType) }}</text></view>
            </view>
          </view>
          <view class="ds-section">
            <text class="ds-section-title">举报信息</text>
            <view class="ds-info-grid">
              <text class="ds-info-label">举报类型：<text class="ds-info-val">{{ reasonLabel(selectedRecord.reportType) }}</text></text>
              <text class="ds-info-label">提交时间：<text class="ds-info-val">{{ selectedRecord.createdAt }}</text></text>
            </view>
            <text class="ds-info-label">举报原因：</text>
            <text class="ds-info-text">{{ selectedRecord.reason }}</text>
          </view>
          <view class="ds-section">
            <text class="ds-section-title">处理状态</text>
            <text class="ds-status" :class="'s-' + selectedRecord.status">{{ statusLabel(selectedRecord.status) }}</text>
            <view v-if="selectedRecord.result" class="ds-result">
              <text class="ds-result-label">处理结论：<text :class="'c-' + selectedRecord.result.conclusion">{{ conclusionLabel(selectedRecord.result.conclusion) }}</text></text>
              <text class="ds-result-text">{{ selectedRecord.result.description }}</text>
              <view class="ds-result-meta"><text>处理人：{{ selectedRecord.result.handler }}</text><text>{{ selectedRecord.result.handledAt }}</text></view>
            </view>
            <view v-else class="ds-waiting">
              <text class="ds-waiting-icon">🕐</text>
              <text>正在处理中，请耐心等待</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { reportApi } from '../../api'

interface ReportResult { conclusion: string; description: string; handler: string; handledAt: string }
interface ReportRecord { id: string; targetType: string; targetTitle: string; reportType: string; reason: string; status: string; createdAt: string; result?: ReportResult }

const selectedRecord = ref<ReportRecord | null>(null); const showDetail = ref(false)
const statusFilter = ref<string>('all')

const stats = ref({ total: 0, pending: 0, processing: 0, resolved: 0, rejected: 0 })
const records = ref<ReportRecord[]>([])

const statusFilters = [{ value: 'all', label: '全部' }, { value: 'pending', label: '待处理' }, { value: 'processing', label: '处理中' }, { value: 'resolved', label: '已处理' }, { value: 'rejected', label: '已驳回' }]

const filteredRecords = computed(() => {
  if (statusFilter.value === 'all') return records.value
  return records.value.filter(r => r.status === statusFilter.value)
})

onMounted(async () => {
  try {
    const res = await reportApi.list({}) as any
    const list = Array.isArray(res) ? res : res?.data || res?.list || []
    records.value = list
    stats.value = { total: list.length, pending: list.filter((r: any) => r.status === 'pending').length, processing: list.filter((r: any) => r.status === 'processing').length, resolved: list.filter((r: any) => r.status === 'resolved').length, rejected: list.filter((r: any) => r.status === 'rejected').length }
  } catch {}
})

function typeIcon(t: string): string {
  const m: Record<string, string> = { user: '👤', post: '📄', comment: '💬', course: '📖', circle: '👥', live: '🔴' }
  return m[t] || '📄'
}
function typeLabel(t: string): string {
  const m: Record<string, string> = { user: '用户', post: '内容', comment: '评论', course: '课程', circle: '圈子', live: '直播' }
  return m[t] || t
}
function reasonLabel(t: string): string {
  const m: Record<string, string> = { inappropriate: '违规内容', pornography: '色情低俗', spam: '垃圾广告', inducement: '诱导分享', copyright: '侵权内容', harassment: '骚扰辱骂', fraud: '欺诈行为', other: '其他' }
  return m[t] || t
}
function statusLabel(s: string): string {
  const m: Record<string, string> = { pending: '待处理', processing: '处理中', resolved: '已处理', rejected: '已驳回' }
  return m[s] || s
}
function conclusionLabel(c: string): string {
  const m: Record<string, string> = { confirmed: '确认违规', dismissed: '不予处理', warning: '警告处理' }
  return m[c] || c
}
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.stats-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; padding: 16rpx 24rpx; background: #faf8f5; }
.stat-item { background: #fff; border-radius: 12rpx; padding: 16rpx; text-align: center; }
.stat-num { font-size: 36rpx; font-weight: bold; color: #2C2C2C; display: block; }
.stat-num.orange { color: #ff9800; }
.stat-num.green { color: #4CAF50; }
.stat-num.red { color: #e53935; }
.stat-label { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }
.filter-scroll { padding: 12rpx 24rpx; white-space: nowrap; background: #faf8f5; border-bottom: 1rpx solid #E5E1DB; }
.filter-row { display: inline-flex; gap: 12rpx; }
.filter-tag { display: inline-block; padding: 8rpx 24rpx; border-radius: 28rpx; font-size: 24rpx; background: #fff; color: #666; border: 1rpx solid #E5E1DB; }
.filter-tag.active { background: #C41E3A; color: #fff; border-color: #C41E3A; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }
.record-list { padding: 0 24rpx; margin-top: 8rpx; }
.record-item { display: flex; align-items: center; gap: 12rpx; background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 8rpx; }
.ri-left { display: flex; gap: 12rpx; flex: 1; min-width: 0; }
.ri-icon { font-size: 32rpx; width: 56rpx; height: 56rpx; background: #f5f0e8; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ri-info { flex: 1; }
.ri-title-row { display: flex; align-items: center; gap: 8rpx; }
.ri-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.ri-type-tag { font-size: 20rpx; padding: 0 10rpx; background: #f5f0e8; color: #C9A96E; border-radius: 8rpx; }
.ri-reason { font-size: 22rpx; color: #666; display: block; margin-top: 4rpx; }
.ri-bottom { display: flex; align-items: center; gap: 12rpx; margin-top: 6rpx; }
.ri-time { font-size: 20rpx; color: #ccc; }
.ri-status { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; }
.ri-status.s-pending { background: #fff3e0; color: #e65100; }
.ri-status.s-processing { background: #e3f2fd; color: #1976d2; }
.ri-status.s-resolved { background: #e8f5e9; color: #2e7d32; }
.ri-status.s-rejected { background: #fde8e8; color: #c62828; }
.ri-arrow { font-size: 32rpx; color: #ccc; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; }
.detail-sheet { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; max-height: 80vh; display: flex; flex-direction: column; }
.ds-header { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; border-bottom: 1rpx solid #E5E1DB; }
.ds-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.ds-close { font-size: 32rpx; color: #999; padding: 8rpx; }
.ds-body { flex: 1; overflow-y: auto; padding: 24rpx; }
.ds-section { margin-bottom: 24rpx; }
.ds-section-title { font-size: 24rpx; font-weight: 500; color: #999; display: block; margin-bottom: 12rpx; }
.ds-target { display: flex; align-items: center; gap: 12rpx; }
.ds-target-icon { font-size: 40rpx; width: 72rpx; height: 72rpx; background: #f5f0e8; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; }
.ds-target-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.ds-target-type { font-size: 22rpx; color: #999; }
.ds-info-grid { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 12rpx; }
.ds-info-label { font-size: 24rpx; color: #666; display: block; margin-bottom: 4rpx; }
.ds-info-val { color: #2C2C2C; }
.ds-info-text { font-size: 24rpx; color: #2C2C2C; display: block; }
.ds-status { font-size: 24rpx; padding: 4rpx 16rpx; border-radius: 8rpx; display: inline-block; }
.ds-status.s-pending { background: #fff3e0; color: #e65100; }
.ds-status.s-processing { background: #e3f2fd; color: #1976d2; }
.ds-status.s-resolved { background: #e8f5e9; color: #2e7d32; }
.ds-status.s-rejected { background: #fde8e8; color: #c62828; }
.ds-result { background: #faf8f5; border-radius: 12rpx; padding: 16rpx; margin-top: 12rpx; }
.ds-result-label { font-size: 24rpx; color: #666; display: block; margin-bottom: 8rpx; }
.c-confirmed { color: #e53935; font-weight: 500; }
.c-dismissed { color: #999; }
.c-warning { color: #ff9800; font-weight: 500; }
.ds-result-text { font-size: 24rpx; color: #2C2C2C; display: block; }
.ds-result-meta { display: flex; gap: 16rpx; font-size: 20rpx; color: #ccc; margin-top: 8rpx; }
.ds-waiting { text-align: center; padding: 20rpx; color: #999; font-size: 24rpx; }
.ds-waiting-icon { font-size: 48rpx; display: block; margin-bottom: 8rpx; }
</style>
