<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <view class="header-left">
          <text
            class="back-btn"
            @click="goBack"
          >
            ←
          </text>
          <text class="header-title">
            下载管理
          </text>
        </view>
        <text
          v-if="completedCount > 0"
          class="header-clear"
          @click="showClearDialog = true"
        >
          清除已完成
        </text>
      </view>

      <!-- 存储空间 -->
      <view class="storage-card">
        <view class="storage-top">
          <view class="storage-label">
            <text class="storage-icon">
              💾
            </text>
            <text class="storage-text">
              存储空间
            </text>
          </view>
          <text class="storage-usage">
            {{ formatSize(storageUsed) }} / {{ formatSize(totalSpace) }}
          </text>
        </view>
        <view class="storage-track">
          <view
            class="storage-bar"
            :style="{ width: storagePercent + '%' }"
          />
        </view>
        <view class="storage-breakdown">
          <text
            v-for="b in breakdown"
            :key="b.type"
            class="storage-breakdown-item"
          >
            {{ b.label }} {{ formatSize(b.size) }}
          </text>
        </view>
      </view>

      <!-- Tab -->
      <view class="tabs">
        <view
          v-for="tb in tabList"
          :key="tb.key"
          class="tab"
          :class="{ active: activeTab === tb.key }"
          @click="switchTab(tb.key)"
        >
          <text>{{ tb.label }}</text>
          <text
            v-if="tabCount(tb.key) > 0"
            class="tab-count"
          >
            ({{ tabCount(tb.key) }})
          </text>
          <view
            v-if="activeTab === tb.key"
            class="tab-indicator"
          />
        </view>
      </view>
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!loading && downloads.length === 0"
      empty-icon="📥"
      :empty-title="emptyTitle"
      skeleton-type="card"
      @retry="loadData"
    >
      <view class="download-list">
        <view
          v-for="item in downloads"
          :key="item.id"
          class="download-card"
        >
          <view class="download-main">
            <view class="download-thumb">
              <image
                v-if="item.cover"
                :src="item.cover"
                class="download-thumb-img"
                mode="aspectFill"
              />
              <view
                v-else
                class="download-thumb-placeholder"
              >
                <text class="download-thumb-icon">
                  {{ fileTypeIcon(item.fileType) }}
                </text>
              </view>
            </view>
            <view class="download-info">
              <view class="download-info-top">
                <text class="download-name">
                  {{ item.fileName }}
                </text>
                <text
                  class="download-more"
                  @click="showActionSheet(item)"
                >
                  ⋯
                </text>
              </view>
              <text class="download-source">
                {{ item.sourceTitle }}
              </text>

              <!-- 下载中 -->
              <view
                v-if="item.status === 'downloading'"
                class="download-progress-area"
              >
                <view class="download-progress-track">
                  <view
                    class="download-progress-bar"
                    :style="{ width: item.progress + '%' }"
                  />
                </view>
                <view class="download-progress-info">
                  <text class="download-progress-text">
                    {{ item.progress }}% · {{ formatSize(item.downloadedSize) }}/{{ formatSize(item.fileSize) }}
                  </text>
                  <text
                    v-if="item.speed"
                    class="download-speed"
                  >
                    {{ item.speed }}
                  </text>
                </view>
                <view class="download-actions">
                  <view
                    class="download-act-btn"
                    @click="handlePause(item)"
                  >
                    ⏸ 暂停
                  </view>
                  <view
                    class="download-act-btn danger"
                    @click="confirmDelete(item)"
                  >
                    🗑 删除
                  </view>
                </view>
              </view>

              <!-- 暂停 -->
              <view
                v-if="item.status === 'paused'"
                class="download-progress-area"
              >
                <view class="download-progress-track">
                  <view
                    class="download-progress-bar"
                    :style="{ width: item.progress + '%' }"
                  />
                </view>
                <view class="download-status paused">
                  <text class="download-status-icon">
                    ⏸
                  </text>
                  <text>已暂停 · {{ item.progress }}%</text>
                </view>
                <view class="download-actions">
                  <view
                    class="download-act-btn primary"
                    @click="handleResume(item)"
                  >
                    ▶ 继续
                  </view>
                  <view
                    class="download-act-btn danger"
                    @click="confirmDelete(item)"
                  >
                    🗑 删除
                  </view>
                </view>
              </view>

              <!-- 等待中 -->
              <view
                v-if="item.status === 'pending'"
                class="download-status pending"
              >
                <text>⏳ 等待中 · {{ formatSize(item.fileSize) }}</text>
              </view>

              <!-- 已完成 -->
              <view
                v-if="item.status === 'completed'"
                class="download-completed"
              >
                <view class="download-status completed">
                  <text>✅ 已完成 · {{ formatSize(item.fileSize) }}</text>
                </view>
                <view
                  class="download-open-btn"
                  @click="openContent(item)"
                >
                  {{ item.fileType === 'video' || item.fileType === 'audio' ? '▶ 播放' : '📖 阅读' }}
                </view>
              </view>

              <!-- 失败 -->
              <view
                v-if="item.status === 'failed'"
                class="download-failed"
              >
                <view class="download-status failed">
                  <text>❌ {{ item.errorMsg || '下载失败' }}</text>
                </view>
                <view
                  class="download-retry-btn"
                  :class="{ disabled: actionLoading === item.id }"
                  @click="handleRetry(item)"
                >
                  🔄 重试
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </DataState>

    <!-- 删除确认弹窗 -->
    <view
      v-if="deleteTarget"
      class="dialog-overlay"
      @click="deleteTarget = null"
    >
      <view
        class="dialog-content"
        @click.stop
      >
        <text class="dialog-title">
          删除下载
        </text>
        <text class="dialog-desc">
          确定要删除「{{ deleteTarget.fileName }}」吗？{{ deleteTarget.status === 'completed' ? '本地文件也将被删除。' : '' }}
        </text>
        <view class="dialog-actions">
          <view
            class="dialog-btn dialog-btn-cancel"
            @click="deleteTarget = null"
          >
            取消
          </view>
          <view
            class="dialog-btn dialog-btn-confirm"
            :class="{ disabled: actionLoading === deleteTarget.id }"
            @click="handleDelete"
          >
            删除
          </view>
        </view>
      </view>
    </view>

    <!-- 清除已完成确认弹窗 -->
    <view
      v-if="showClearDialog"
      class="dialog-overlay"
      @click="showClearDialog = false"
    >
      <view
        class="dialog-content"
        @click.stop
      >
        <text class="dialog-title">
          清除已完成
        </text>
        <text class="dialog-desc">
          确定要清除所有已完成的下载记录吗？本地文件也将被删除。
        </text>
        <view class="dialog-actions">
          <view
            class="dialog-btn dialog-btn-cancel"
            @click="showClearDialog = false"
          >
            取消
          </view>
          <view
            class="dialog-btn dialog-btn-confirm"
            @click="handleClearCompleted"
          >
            确定清除
          </view>
        </view>
      </view>
    </view>

    <!-- 操作底部菜单 -->
    <view
      v-if="actionSheetTarget"
      class="sheet-overlay"
      @click="actionSheetTarget = null"
    >
      <view
        class="sheet-content"
        @click.stop
      >
        <view
          v-if="actionSheetTarget.status === 'completed'"
          class="sheet-item"
          @click="openContent(actionSheetTarget); actionSheetTarget = null"
        >
          📂 打开
        </view>
        <view
          class="sheet-item danger"
          @click="confirmDelete(actionSheetTarget); actionSheetTarget = null"
        >
          🗑 删除
        </view>
        <view
          class="sheet-item sheet-cancel"
          @click="actionSheetTarget = null"
        >
          取消
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DataState from '../../components/DataState.vue'

interface DownloadItem {
  id: number
  fileName: string
  sourceTitle: string
  fileType: string
  fileSize: number
  downloadedSize: number
  cover?: string
  status: 'downloading' | 'paused' | 'pending' | 'completed' | 'failed'
  progress: number
  speed?: string
  errorMsg?: string
}

interface StorageBreakdown {
  type: string
  label: string
  size: number
}

const activeTab = ref<'all' | 'downloading' | 'completed'>('all')
const downloads = ref<DownloadItem[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const actionLoading = ref<number | null>(null)
const deleteTarget = ref<DownloadItem | null>(null)
const showClearDialog = ref(false)
const actionSheetTarget = ref<DownloadItem | null>(null)

const storageUsed = ref(0)
const totalSpace = ref(0)
const breakdown = ref<StorageBreakdown[]>([])

const tabList = [
  { key: 'all', label: '全部' },
  { key: 'downloading', label: '下载中' },
  { key: 'completed', label: '已完成' },
]

const storagePercent = computed(() => {
  if (totalSpace.value === 0) return 0
  return Math.min((storageUsed.value / totalSpace.value) * 100, 100)
})

const completedCount = computed(() => downloads.value.filter((d) => d.status === 'completed').length)

const emptyTitle = computed(() => {
  if (activeTab.value === 'downloading') return '暂无下载中的内容'
  if (activeTab.value === 'completed') return '暂无已完成的下载'
  return '暂无下载记录'
})

const displayedDownloads = computed(() => {
  if (activeTab.value === 'all') return downloads.value
  if (activeTab.value === 'downloading') return downloads.value.filter((d) => ['downloading', 'paused', 'pending', 'failed'].includes(d.status))
  return downloads.value.filter((d) => d.status === 'completed')
})

function tabCount(key: string) {
  if (key === 'all') return downloads.value.length
  if (key === 'downloading') return downloads.value.filter((d) => ['downloading', 'paused', 'pending', 'failed'].includes(d.status)).length
  return completedCount.value
}

function switchTab(key: 'all' | 'downloading' | 'completed') {
  activeTab.value = key
}

function fileTypeIcon(type: string): string {
  const map: Record<string, string> = { video: '🎬', ebook: '📖', classic: '📜', audio: '🎧', document: '📄' }
  return map[type] || '📁'
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i]
}

async function loadData() {
  loading.value = true
  loadError.value = null
  try {
    await new Promise((r) => setTimeout(r, 500))
    storageUsed.value = 2048 * 1024 * 1024
    totalSpace.value = 8192 * 1024 * 1024
    breakdown.value = [
      { type: 'video', label: '视频', size: 1024 * 1024 * 1024 },
      { type: 'ebook', label: '电子书', size: 512 * 1024 * 1024 },
      { type: 'audio', label: '音频', size: 256 * 1024 * 1024 },
    ]
    downloads.value = [
      { id: 1, fileName: '周易入门课程.mp4', sourceTitle: '周易入门：从零开始学习易经', fileType: 'video', fileSize: 512 * 1024 * 1024, downloadedSize: 256 * 1024 * 1024, progress: 50, status: 'downloading', speed: '2.5MB/s', cover: '' },
      { id: 2, fileName: '八字命理进阶.pdf', sourceTitle: '八字命理进阶班教材', fileType: 'ebook', fileSize: 128 * 1024 * 1024, downloadedSize: 128 * 1024 * 1024, progress: 100, status: 'completed', cover: '' },
      { id: 3, fileName: '六爻预测音频.mp3', sourceTitle: '六爻预测实战案例分析', fileType: 'audio', fileSize: 64 * 1024 * 1024, downloadedSize: 32 * 1024 * 1024, progress: 50, status: 'paused', cover: '' },
    ]
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function handlePause(item: DownloadItem) {
  actionLoading.value = item.id
  setTimeout(() => {
    const d = downloads.value.find((d) => d.id === item.id)
    if (d) d.status = 'paused'
    actionLoading.value = null
  }, 300)
}

function handleResume(item: DownloadItem) {
  actionLoading.value = item.id
  setTimeout(() => {
    const d = downloads.value.find((d) => d.id === item.id)
    if (d) d.status = 'downloading'
    actionLoading.value = null
  }, 300)
}

function handleRetry(item: DownloadItem) {
  actionLoading.value = item.id
  setTimeout(() => {
    const d = downloads.value.find((d) => d.id === item.id)
    if (d) { d.status = 'downloading'; d.errorMsg = undefined }
    actionLoading.value = null
  }, 300)
}

function confirmDelete(item: DownloadItem) {
  deleteTarget.value = item
}

function handleDelete() {
  if (!deleteTarget.value) return
  downloads.value = downloads.value.filter((d) => d.id !== deleteTarget.value!.id)
  deleteTarget.value = null
  uni.showToast({ title: '已删除', icon: 'success' })
}

function handleClearCompleted() {
  downloads.value = downloads.value.filter((d) => d.status !== 'completed')
  showClearDialog.value = false
  uni.showToast({ title: '已清除', icon: 'success' })
}

function openContent(item: DownloadItem) {
  uni.showToast({ title: '打开：' + item.fileName, icon: 'none' })
}

function showActionSheet(item: DownloadItem) {
  actionSheetTarget.value = item
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 40rpx; }
.header { background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; }
.header-left { display: flex; align-items: center; gap: 16rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; padding: 8rpx; }
.header-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.header-clear { font-size: 24rpx; color: #C41E3A; padding: 8rpx; }

.storage-card { margin: 16rpx 24rpx; background: #fff; border-radius: 16rpx; padding: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.storage-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.storage-label { display: flex; align-items: center; gap: 8rpx; }
.storage-icon { font-size: 24rpx; }
.storage-text { font-size: 24rpx; color: #666; }
.storage-usage { font-size: 24rpx; color: #2C2C2C; font-weight: 500; }
.storage-track { height: 16rpx; background: #E8E3DB; border-radius: 10rpx; overflow: hidden; }
.storage-bar { height: 100%; background: #C41E3A; border-radius: 10rpx; transition: width 0.3s; }
.storage-breakdown { display: flex; gap: 20rpx; margin-top: 12rpx; }
.storage-breakdown-item { font-size: 20rpx; color: #B8B0A4; }

.tabs { display: flex; border-top: 1rpx solid #E8E3DB; }
.tab { flex: 1; height: 80rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #666; position: relative; }
.tab.active { color: #C41E3A; font-weight: 500; }
.tab-count { font-size: 20rpx; color: inherit; margin-left: 4rpx; }
.tab-indicator { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 60rpx; height: 4rpx; background: #C41E3A; border-radius: 4rpx; }

.download-list { padding: 20rpx 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.download-card { background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.download-main { display: flex; gap: 16rpx; }
.download-thumb { width: 120rpx; height: 120rpx; border-radius: 12rpx; overflow: hidden; flex-shrink: 0; }
.download-thumb-img { width: 100%; height: 100%; }
.download-thumb-placeholder { width: 100%; height: 100%; background: #F5F0E8; display: flex; align-items: center; justify-content: center; }
.download-thumb-icon { font-size: 48rpx; }
.download-info { flex: 1; min-width: 0; }
.download-info-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8rpx; }
.download-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.download-more { font-size: 36rpx; color: #999; padding: 0 8rpx; }
.download-source { font-size: 22rpx; color: #B8B0A4; display: block; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.download-progress-area { margin-top: 12rpx; }
.download-progress-track { height: 12rpx; background: #F5F0E8; border-radius: 10rpx; overflow: hidden; }
.download-progress-bar { height: 100%; background: #C41E3A; border-radius: 10rpx; transition: width 0.3s; }
.download-progress-info { display: flex; justify-content: space-between; margin-top: 6rpx; }
.download-progress-text { font-size: 20rpx; color: #999; }
.download-speed { font-size: 20rpx; color: #C41E3A; }

.download-actions { display: flex; gap: 12rpx; margin-top: 10rpx; }
.download-act-btn { flex: 1; height: 56rpx; border-radius: 12rpx; background: #F5F0E8; color: #666; font-size: 22rpx; display: flex; align-items: center; justify-content: center; }
.download-act-btn.primary { background: #C41E3A; color: #fff; }
.download-act-btn.danger { border: 1rpx solid #FFCDD2; color: #EF4444; background: #FFF5F5; }

.download-status { display: flex; align-items: center; gap: 6rpx; font-size: 20rpx; margin-top: 8rpx; }
.download-status.paused { color: #F59E0B; }
.download-status.pending { color: #999; }
.download-status.completed { color: #22C55E; }
.download-status.failed { color: #EF4444; }
.download-status-icon { font-size: 24rpx; }

.download-completed { display: flex; justify-content: space-between; align-items: center; margin-top: 8rpx; }
.download-open-btn { padding: 8rpx 24rpx; border-radius: 20rpx; background: #C41E3A; color: #fff; font-size: 22rpx; }
.download-failed { display: flex; justify-content: space-between; align-items: center; margin-top: 8rpx; }
.download-retry-btn { padding: 8rpx 24rpx; border-radius: 20rpx; background: #F5F0E8; color: #666; font-size: 22rpx; }
.download-retry-btn.disabled { opacity: 0.5; }

/* 弹窗 */
.dialog-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 48rpx; }
.dialog-content { background: #fff; border-radius: 24rpx; padding: 40rpx 32rpx; width: 100%; max-width: 560rpx; }
.dialog-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; text-align: center; display: block; }
.dialog-desc { font-size: 24rpx; color: #666; margin-top: 12rpx; display: block; text-align: center; line-height: 1.6; }
.dialog-actions { display: flex; gap: 20rpx; margin-top: 28rpx; }
.dialog-btn { flex: 1; height: 80rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 500; }
.dialog-btn-cancel { background: #F5F0E8; color: #666; }
.dialog-btn-confirm { background: #EF4444; color: #fff; }
.dialog-btn-confirm.disabled { opacity: 0.5; }

/* 底部菜单 */
.sheet-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); }
.sheet-content { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 16rpx 24rpx 40rpx; animation: slideUp 0.3s ease; }
.sheet-item { height: 96rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #2C2C2C; border-bottom: 1rpx solid #F5F0E8; }
.sheet-item.danger { color: #EF4444; }
.sheet-cancel { color: #999; margin-top: 8rpx; border-bottom: none; background: #F5F0E8; border-radius: 16rpx; }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>
