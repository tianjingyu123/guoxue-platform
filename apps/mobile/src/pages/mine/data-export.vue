<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <text class="back-btn" @click="goBack">←</text>
        <text class="header-title">数据导出</text>
        <view class="header-right" />
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="tabs">
      <view
        class="tab"
        :class="{ active: activeTab === 'create' }"
        @click="switchTab('create')"
      >申请导出</view>
      <view
        class="tab"
        :class="{ active: activeTab === 'records' }"
        @click="switchTab('records')"
      >
        导出记录
        <text v-if="completedCount > 0" class="tab-badge">{{ completedCount }}</text>
      </view>
    </view>

    <!-- 申请导出 -->
    <view v-if="activeTab === 'create'" class="create-content">
      <!-- 说明卡片 -->
      <view class="info-card">
        <text class="info-icon">ℹ️</text>
        <view class="info-body">
          <text class="info-title">数据导出说明</text>
          <text class="info-item">• 导出文件为 ZIP 压缩包格式</text>
          <text class="info-item">• 处理时间约 5-30 分钟，完成后通知您</text>
          <text class="info-item">• 文件有效期 7 天，请及时下载</text>
          <text class="info-item">• 每月最多申请 3 次导出</text>
        </view>
      </view>

      <!-- 数据类型选择 -->
      <view class="type-card">
        <view class="type-header">
          <text class="type-title">选择导出数据</text>
          <text class="type-select-all" @click="toggleSelectAll">
            {{ selectedTypes.length === dataTypes.length ? '取消全选' : '全选' }}
          </text>
        </view>

        <view class="type-list">
          <view
            v-for="t in dataTypes"
            :key="t.id"
            class="type-item"
            @click="toggleType(t.id)"
          >
            <view class="type-icon-wrap" :class="{ selected: selectedTypes.includes(t.id) }">
              <text class="type-icon">{{ t.icon }}</text>
            </view>
            <view class="type-info">
              <text class="type-name">{{ t.name }}</text>
              <text class="type-desc">{{ t.desc }}</text>
            </view>
            <view class="type-right">
              <text class="type-size">{{ t.size }}</text>
              <view class="type-check" :class="{ checked: selectedTypes.includes(t.id) }">
                <text v-if="selectedTypes.includes(t.id)" class="type-check-mark">✓</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 预估大小 -->
      <view v-if="selectedTypes.length > 0" class="estimate-bar">
        <text class="estimate-text">已选 {{ selectedTypes.length }} 项数据</text>
        <text class="estimate-size">预估大小：约 {{ selectedTypes.length * 2 }}MB</text>
      </view>

      <!-- 底部提交 -->
      <view class="bottom-action">
        <view
          class="btn-submit"
          :class="{ disabled: submitting || selectedTypes.length === 0 }"
          @click="handleSubmit"
        >
          {{ submitting ? '提交中...' : '申请导出（' + selectedTypes.length + ' 项）' }}
        </view>
      </view>
      <view class="bottom-spacer" />
    </view>

    <!-- 导出记录 -->
    <view v-if="activeTab === 'records'" class="records-content">
      <DataState
        :is-loading="loading"
        :error="loadError"
        :is-empty="!loading && records.length === 0"
        empty-icon="📥"
        empty-title="暂无导出记录"
        empty-description="还没有导出记录"
        empty-action-text="去申请导出"
        :empty-show-action="true"
        skeleton-type="card"
        @retry="loadRecords"
        @empty-action="switchTab('create')"
      >
        <view class="records-list">
          <view v-for="record in records" :key="record.id" class="record-card">
            <view class="record-top">
              <view class="record-status" :class="'rs-' + record.status">
                <text class="record-status-icon">{{ statusIcon(record.status) }}</text>
                <text class="record-status-label">{{ statusLabel(record.status) }}</text>
              </view>
              <text class="record-date">{{ formatDate(record.createdAt) }}</text>
            </view>

            <text class="record-types">{{ getTypeNames(record.types) }}</text>

            <text v-if="record.status === 'completed' && record.fileSize" class="record-meta">
              文件大小：{{ record.fileSize }} · 有效期至 {{ formatDate(record.expireAt) }}
            </text>

            <!-- 处理中进度条 -->
            <view v-if="record.status === 'processing'" class="record-progress">
              <view class="progress-track">
                <view class="progress-bar" />
              </view>
              <text class="progress-text">处理中...</text>
            </view>

            <!-- 已完成 -->
            <view
              v-if="record.status === 'completed'"
              class="record-download"
              @click="handleDownload(record)"
            >
              ⬇ 下载文件
            </view>

            <!-- 已过期 -->
            <view
              v-if="record.status === 'expired'"
              class="record-reapply"
              @click="reapply(record)"
            >
              重新申请
            </view>
          </view>
        </view>
      </DataState>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DataState from '../../components/DataState.vue'

interface DataType {
  id: string
  name: string
  desc: string
  icon: string
  size: string
}

interface ExportRecord {
  id: string
  types: string[]
  status: 'processing' | 'completed' | 'expired' | 'failed'
  createdAt: string
  completedAt?: string
  expireAt?: string
  downloadUrl?: string
  fileSize?: string
}

const dataTypes: DataType[] = [
  { id: 'profile', name: '个人信息', desc: '账号资料、头像、昵称、简介等', icon: '👤', size: '< 1MB' },
  { id: 'posts', name: '帖子内容', desc: '发布的圈子帖子、评论、回复', icon: '📄', size: '约 5MB' },
  { id: 'comments', name: '评论互动', desc: '课程评论、视频评论、点赞记录', icon: '💬', size: '约 2MB' },
  { id: 'favorites', name: '收藏内容', desc: '收藏的课程、帖子、商品等', icon: '⭐', size: '约 1MB' },
  { id: 'orders', name: '订单数据', desc: '购买记录、支付信息、发票', icon: '🛍', size: '约 3MB' },
  { id: 'learning', name: '学习记录', desc: '课程进度、学习时长、测验成绩', icon: '🎓', size: '约 2MB' },
  { id: 'notes', name: '笔记内容', desc: '课程笔记、批注、高亮标记', icon: '📖', size: '约 4MB' },
  { id: 'follows', name: '关注列表', desc: '关注的用户、圈子、讲师', icon: '👥', size: '< 1MB' },
]

const activeTab = ref<'create' | 'records'>('create')
const selectedTypes = ref<string[]>([])
const records = ref<ExportRecord[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const submitting = ref(false)

const completedCount = ref(0)

function switchTab(tab: 'create' | 'records') {
  activeTab.value = tab
  if (tab === 'records' && records.value.length === 0) {
    loadRecords()
  }
}

function toggleType(id: string) {
  const idx = selectedTypes.value.indexOf(id)
  if (idx >= 0) {
    selectedTypes.value.splice(idx, 1)
  } else {
    selectedTypes.value.push(id)
  }
}

function toggleSelectAll() {
  if (selectedTypes.value.length === dataTypes.length) {
    selectedTypes.value = []
  } else {
    selectedTypes.value = dataTypes.map((t) => t.id)
  }
}

async function loadRecords() {
  loading.value = true
  loadError.value = null
  try {
    await new Promise((r) => setTimeout(r, 500))
    records.value = [
      {
        id: '1', types: ['profile', 'posts', 'comments'], status: 'completed',
        createdAt: '2026-06-01T10:30:00', completedAt: '2026-06-01T10:35:00',
        expireAt: '2026-06-08T10:35:00', downloadUrl: '/api/export/download/1', fileSize: '8.2MB',
      },
      {
        id: '2', types: ['orders', 'learning'], status: 'processing',
        createdAt: '2026-06-03T08:00:00',
      },
      {
        id: '3', types: ['profile', 'favorites', 'notes', 'follows'], status: 'expired',
        createdAt: '2026-05-20T14:00:00', completedAt: '2026-05-20T14:10:00',
        expireAt: '2026-05-27T14:10:00',
      },
    ]
    completedCount.value = records.value.filter((r) => r.status === 'completed').length
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (selectedTypes.value.length === 0) return
  submitting.value = true
  await new Promise((r) => setTimeout(r, 1000))
  const newRecord: ExportRecord = {
    id: Date.now().toString(),
    types: [...selectedTypes.value],
    status: 'processing',
    createdAt: new Date().toISOString(),
  }
  records.value.unshift(newRecord)
  selectedTypes.value = []
  submitting.value = false
  activeTab.value = 'records'
  uni.showToast({ title: '导出申请已提交', icon: 'success' })
}

function statusLabel(status: string) {
  const map: Record<string, string> = { processing: '处理中', completed: '已完成', expired: '已过期', failed: '失败' }
  return map[status] || status
}

function statusIcon(status: string) {
  const map: Record<string, string> = { processing: '⏳', completed: '✅', expired: '🕐', failed: '❌' }
  return map[status] || '❓'
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' +
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

function getTypeNames(typeIds: string[]) {
  return typeIds.map((id) => dataTypes.find((t) => t.id === id)?.name || id).join('、')
}

function handleDownload(record: ExportRecord) {
  uni.showToast({ title: '开始下载', icon: 'success' })
}

function reapply(record: ExportRecord) {
  selectedTypes.value = [...record.types]
  activeTab.value = 'create'
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

/* Tabs */
.tabs {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid #E8E3DB;
}
.tab {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: #999;
  border-bottom: 3rpx solid transparent;
  transition: all 0.2s;
}
.tab.active {
  color: #C41E3A;
  border-bottom-color: #C41E3A;
  font-weight: 500;
}
.tab-badge {
  margin-left: 6rpx;
  padding: 2rpx 12rpx;
  font-size: 18rpx;
  color: #fff;
  background: #C41E3A;
  border-radius: 20rpx;
}

/* 申请导出 */
.create-content { padding: 24rpx; }

.info-card {
  display: flex;
  gap: 16rpx;
  background: #E3F2FD;
  border: 1rpx solid #90CAF9;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.info-icon { font-size: 32rpx; flex-shrink: 0; margin-top: 2rpx; }
.info-body { flex: 1; }
.info-title { font-size: 26rpx; font-weight: 500; color: #1565C0; display: block; margin-bottom: 8rpx; }
.info-item { font-size: 22rpx; color: #1976D2; display: block; line-height: 1.7; }

.type-card {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
}
.type-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid #F5F0E8;
}
.type-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; }
.type-select-all { font-size: 24rpx; color: #C41E3A; }

.type-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  border-bottom: 1rpx solid #F5F0E8;
}
.type-item:last-child { border-bottom: none; }
.type-icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  background: #F5F0E8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}
.type-icon-wrap.selected {
  background: #C41E3A;
}
.type-icon { font-size: 32rpx; }
.type-info { flex: 1; min-width: 0; }
.type-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block; }
.type-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.type-right { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.type-size { font-size: 20rpx; color: #B8B0A4; }
.type-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #D0C8B8;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.type-check.checked {
  background: #C41E3A;
  border-color: #C41E3A;
}
.type-check-mark { font-size: 22rpx; color: #fff; font-weight: bold; }

.estimate-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #FAF8F5;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
}
.estimate-text { font-size: 24rpx; color: #666; }
.estimate-size { font-size: 24rpx; font-weight: 500; color: #2C2C2C; }

.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 24rpx;
  background: #F5F0E8;
  border-top: 1rpx solid #E8E3DB;
}
.btn-submit {
  width: 100%;
  height: 88rpx;
  border-radius: 44rpx;
  background: #C41E3A;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-submit.disabled { opacity: 0.5; }
.bottom-spacer { height: 140rpx; }

/* 导出记录 */
.records-content { padding: 24rpx; }
.records-list { display: flex; flex-direction: column; gap: 16rpx; }
.record-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.record-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.record-status {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 20rpx;
  font-weight: 500;
}
.record-status-icon { font-size: 22rpx; }
.record-status-label { font-size: 22rpx; }
.rs-processing { background: #E3F2FD; color: #1976D2; }
.rs-completed { background: #E8F5E9; color: #22C55E; }
.rs-expired { background: #F5F5F5; color: #999; }
.rs-failed { background: #FFEBEE; color: #EF4444; }
.record-date { font-size: 22rpx; color: #B8B0A4; }
.record-types { font-size: 24rpx; color: #2C2C2C; display: block; margin-bottom: 8rpx; }
.record-meta { font-size: 20rpx; color: #B8B0A4; display: block; }

.record-progress {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
}
.progress-track {
  flex: 1;
  height: 12rpx;
  background: #E3F2FD;
  border-radius: 10rpx;
  overflow: hidden;
}
.progress-bar {
  width: 30%;
  height: 100%;
  background: #1976D2;
  border-radius: 10rpx;
  animation: pulse 1.5s ease-in-out infinite;
}
.progress-text { font-size: 20rpx; color: #1976D2; white-space: nowrap; }

.record-download {
  width: 100%;
  height: 72rpx;
  background: #C41E3A;
  color: #fff;
  border-radius: 16rpx;
  font-size: 24rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16rpx;
}
.record-reapply {
  width: 100%;
  height: 72rpx;
  background: #F5F0E8;
  color: #666;
  border-radius: 16rpx;
  font-size: 24rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16rpx;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
