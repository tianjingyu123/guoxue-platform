<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import { mineApi, type ExportRecord, type ExportRecordStatus } from '@/lib/mine-data'

const activeTab = ref<'create' | 'records'>('create')
const selectedTypes = ref<string[]>([])
const exportDataTypes = ref<{ id: string; name: string; icon: string; description: string; estimatedSize: string }[]>([])
const records = ref<ExportRecord[]>([])
const submitting = ref(false)
const loading = ref(true)
const error = ref('')
const recordsLoading = ref(false)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [typesData, recordsData] = await Promise.all([
      mineApi.getExportTypes(),
      mineApi.getExportRecords(),
    ])
    exportDataTypes.value = typesData
    records.value = recordsData.map((r: ExportRecord) => ({ ...r }))
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function retry() {
  fetchData()
}

onMounted(() => {
  fetchData()
})

const completedCount = computed(() => records.value.filter((r) => r.status === 'completed').length)
const allSelected = computed(() => selectedTypes.value.length === exportDataTypes.value.length)

function toggleType(id: string) {
  if (selectedTypes.value.includes(id)) {
    selectedTypes.value = selectedTypes.value.filter((t) => t !== id)
  } else {
    selectedTypes.value = [...selectedTypes.value, id]
  }
}
function selectAll() {
  selectedTypes.value = allSelected.value ? [] : exportDataTypes.value.map((t) => t.id)
}

async function submit() {
  if (selectedTypes.value.length === 0 || submitting.value) return
  submitting.value = true
  try {
    // 后端暂无数据导出端点 → 诚实提示即将开放，不伪造导出记录
    const result = await mineApi.requestExport(selectedTypes.value)
    uni.showToast({ title: result.message || '数据导出功能即将开放', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function statusConfig(s: ExportRecordStatus) {
  return {
    processing: { label: '处理中', icon: 'refresh-cw', color: '#2563eb', bg: '#E8EEFB' },
    completed: { label: '已完成', icon: 'check', color: '#16a34a', bg: '#E7F6EC' },
    expired: { label: '已过期', icon: 'clock', color: '#8a8178', bg: '#F2ECE1' },
    failed: { label: '失败', icon: 'alert-circle', color: '#ef4444', bg: '#FCEBEB' },
  }[s]
}
function fmtDate(s: string) {
  const d = new Date(s)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function typeNames(ids: string[]) {
  return ids.map((id) => exportDataTypes.value.find((t) => t.id === id)?.name || id).join('、')
}
function download() {
  uni.showToast({ title: '开始下载文件', icon: 'none' })
}
function reapply(r: ExportRecord) {
  selectedTypes.value = [...r.types]
  activeTab.value = 'create'
}
</script>

<template>
  <view class="page">
    <app-nav-bar title="数据导出" />

    <!-- Tab -->
    <view class="tabs">
      <view class="tab" :class="{ active: activeTab === 'create' }" @tap="activeTab = 'create'">
        <text class="tab-text">申请导出</text>
      </view>
      <view class="tab" :class="{ active: activeTab === 'records' }" @tap="activeTab = 'records'">
        <text class="tab-text">导出记录</text>
        <text v-if="completedCount > 0" class="tab-badge">{{ completedCount }}</text>
      </view>
    </view>

    <!-- 加载/错误 -->
    <view v-if="loading" class="loading"><AppLoading /></view>
    <view v-else-if="error" class="error-state"><text>{{ error }}</text><view class="retry-btn" @tap="retry">重试</view></view>
    <scroll-view v-else scroll-y class="scroll">
      <!-- 申请导出 -->
      <template v-if="activeTab === 'create'">
        <view class="info">
          <AppIcon name="info" :size="18" color="#2563eb" />
          <view class="info-body">
            <text class="info-title">数据导出说明</text>
            <text class="info-item">· 导出文件为 ZIP 压缩包格式</text>
            <text class="info-item">· 处理时间约 5-30 分钟，完成后通知您</text>
            <text class="info-item">· 文件有效期 7 天，请及时下载</text>
            <text class="info-item">· 每月最多申请 3 次导出</text>
          </view>
        </view>

        <view class="card">
          <view class="card-head">
            <text class="card-head-title">选择导出数据</text>
            <text class="select-all" @tap="selectAll">{{ allSelected ? '取消全选' : '全选' }}</text>
          </view>
          <view v-for="t in exportDataTypes" :key="t.id" class="row" @tap="toggleType(t.id)">
            <view class="row-icon" :class="{ 'icon-active': selectedTypes.includes(t.id) }">
              <AppIcon :name="t.icon" :size="20" :color="selectedTypes.includes(t.id) ? '#fff' : '#9b948a'" />
            </view>
            <view class="row-body">
              <text class="row-name">{{ t.name }}</text>
              <text class="row-sub">{{ t.description }}</text>
            </view>
            <text class="row-size">{{ t.estimatedSize }}</text>
            <view class="check" :class="{ checked: selectedTypes.includes(t.id) }">
              <AppIcon v-if="selectedTypes.includes(t.id)" name="check" :size="14" color="#fff" />
            </view>
          </view>
        </view>

        <view v-if="selectedTypes.length > 0" class="estimate">
          <text class="estimate-left">已选 {{ selectedTypes.length }} 项数据</text>
          <text class="estimate-right">预估大小: 约 {{ selectedTypes.length * 2 }}MB</text>
        </view>

        <view class="safe-bottom-lg" />
      </template>

      <!-- 导出记录 -->
      <template v-else>
        <view v-if="records.length === 0" class="empty">
          <view class="empty-icon"><AppIcon name="download" :size="32" color="#C9C2B6" /></view>
          <text class="empty-text">暂无导出记录</text>
          <text class="empty-link" @tap="activeTab = 'create'">去申请导出</text>
        </view>
        <template v-else>
          <view v-for="r in records" :key="r.id" class="rec">
            <view class="rec-head">
              <view class="rec-status" :style="{ color: statusConfig(r.status).color, background: statusConfig(r.status).bg }">
                <AppIcon :name="statusConfig(r.status).icon" :size="14" :color="statusConfig(r.status).color" />
                <text class="rec-status-text">{{ statusConfig(r.status).label }}</text>
              </view>
              <text class="rec-time">{{ fmtDate(r.createdAt) }}</text>
            </view>
            <text class="rec-types">{{ typeNames(r.types) }}</text>
            <text v-if="r.status === 'completed' && r.expireAt" class="rec-meta">文件大小: {{ r.fileSize }} · 有效期至 {{ fmtDate(r.expireAt) }}</text>

            <view v-if="r.status === 'processing'" class="progress">
              <view class="progress-bar"><view class="progress-fill" /></view>
              <text class="progress-text">处理中...</text>
            </view>

            <view v-if="r.status === 'completed'" class="btn-download" @tap="download">
              <AppIcon name="download" :size="16" color="#fff" />
              <text class="btn-download-text">下载文件</text>
            </view>
            <view v-if="r.status === 'expired'" class="btn-reapply" @tap="reapply(r)">
              <text class="btn-reapply-text">重新申请</text>
            </view>
          </view>
        </template>
      </template>
    </scroll-view>

    <!-- 底部提交 -->
    <view v-if="activeTab === 'create'" class="footer-bar">
      <view class="btn-submit" :class="{ disabled: selectedTypes.length === 0 || submitting }" @tap="submit">
        <AppIcon name="download" :size="18" color="#fff" />
        <text class="btn-submit-text">{{ submitting ? '提交中...' : `申请导出 (${selectedTypes.length} 项)` }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

/* 三态 */
.loading { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: #8a8178; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); color: #fff; border-radius: 12rpx; font-size: 26rpx; }

.tabs { display: flex; background: #fff; border-bottom: 1rpx solid #EDE7DC; }
.tab { flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; border-bottom: 4rpx solid transparent; }
.tab.active { border-bottom-color: var(--brand); }
.tab-text { font-size: 28rpx; color: #8a8178; }
.tab.active .tab-text { color: var(--brand); font-weight: 600; }
.tab-badge { min-width: 32rpx; height: 32rpx; padding: 0 8rpx; border-radius: 999rpx; background: var(--brand); color: #fff; font-size: 20rpx; display: flex; align-items: center; justify-content: center; }

.scroll { flex: 1; padding: 24rpx; box-sizing: border-box; }

.info { display: flex; gap: 16rpx; background: #E8EEFB; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; }
.info-body { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.info-title { font-size: 26rpx; font-weight: 600; color: #1e40af; }
.info-item { font-size: 24rpx; color: #3b5bbd; line-height: 1.5; }

.card { background: #fff; border-radius: 24rpx; overflow: hidden; margin-bottom: 24rpx; }
.card-head { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 28rpx; border-bottom: 1rpx solid #F2ECE1; }
.card-head-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.select-all { font-size: 26rpx; color: var(--brand); }
.row { display: flex; align-items: center; gap: 20rpx; padding: 24rpx 28rpx; border-bottom: 1rpx solid #F6F1E8; }
.row:last-child { border-bottom: none; }
.row-icon { width: 76rpx; height: 76rpx; border-radius: 20rpx; background: #F2ECE1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.row-icon.icon-active { background: var(--brand); }
.row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.row-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.row-sub { font-size: 22rpx; color: #8a8178; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-size { font-size: 22rpx; color: #b8b0a4; flex-shrink: 0; }
.check { width: 40rpx; height: 40rpx; border-radius: 50%; border: 3rpx solid #D8D1C5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.check.checked { background: var(--brand); border-color: var(--brand); }

.estimate { display: flex; align-items: center; justify-content: space-between; background: #F2ECE1; border-radius: 20rpx; padding: 24rpx 28rpx; }
.estimate-left { font-size: 26rpx; color: #8a8178; }
.estimate-right { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }

.safe-bottom-lg { height: 60rpx; }

.empty { padding: 140rpx 0; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.empty-icon { width: 140rpx; height: 140rpx; border-radius: 50%; background: #F2ECE1; display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.empty-text { font-size: 28rpx; color: #8a8178; }
.empty-link { font-size: 26rpx; color: var(--brand); margin-top: 8rpx; }

.rec { background: #fff; border-radius: 24rpx; padding: 28rpx; margin-bottom: 24rpx; }
.rec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.rec-status { display: flex; align-items: center; gap: 8rpx; padding: 6rpx 18rpx; border-radius: 999rpx; }
.rec-status-text { font-size: 22rpx; font-weight: 500; }
.rec-time { font-size: 22rpx; color: #b8b0a4; }
.rec-types { display: block; font-size: 28rpx; color: #2C2C2C; line-height: 1.5; margin-bottom: 8rpx; }
.rec-meta { display: block; font-size: 22rpx; color: #8a8178; margin-bottom: 16rpx; }
.progress { display: flex; align-items: center; gap: 16rpx; margin-top: 12rpx; }
.progress-bar { flex: 1; height: 10rpx; background: #E8EEFB; border-radius: 999rpx; overflow: hidden; }
.progress-fill { width: 35%; height: 100%; background: #2563eb; border-radius: 999rpx; }
.progress-text { font-size: 22rpx; color: #2563eb; }
.btn-download { height: 80rpx; background: var(--brand); border-radius: 20rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-top: 20rpx; }
.btn-download-text { font-size: 28rpx; font-weight: 500; color: #fff; }
.btn-reapply { height: 80rpx; background: #F2ECE1; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; margin-top: 20rpx; }
.btn-reapply-text { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }

.footer-bar { padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom)); background: #fff; border-top: 1rpx solid #EDE7DC; }
.btn-submit { height: 92rpx; background: var(--brand); border-radius: 20rpx; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.btn-submit.disabled { opacity: 0.5; }
.btn-submit-text { font-size: 30rpx; font-weight: 600; color: #fff; }
</style>
