<template>
  <view class="downloads-page">
    <!-- 顶部导航 -->
    <view class="dl-header">
      <view class="dl-header-bar">
        <view class="dl-header-left">
          <view class="dl-back" @tap="goBack">
            <app-icon name="arrow-left" :size="44" color="#2D2A26" />
          </view>
          <text class="dl-title">下载管理</text>
        </view>
        <text v-if="completedCount > 0" class="dl-clear" @tap="showClearDialog = true">清除已完成</text>
      </view>

      <!-- 存储空间信息 -->
      <view class="dl-storage">
        <view class="storage-card">
          <view class="storage-top">
            <view class="storage-label">
              <app-icon name="hard-drive" :size="28" color="#5C5C5C" />
              <text class="storage-label-text">存储空间</text>
            </view>
            <text class="storage-val">{{ fmtSize(storage.downloadUsed) }} / {{ fmtSize(storage.totalSpace) }}</text>
          </view>
          <view class="storage-bar">
            <view class="storage-bar-fill" :style="{ width: storagePct + '%' }" />
          </view>
          <view class="storage-breakdown">
            <text
              v-for="b in storage.breakdown.filter((x) => x.count > 0)"
              :key="b.type"
              class="breakdown-item"
            >{{ fileTypeName(b.type) }} {{ fmtSize(b.size) }}</text>
          </view>
        </view>
      </view>

      <!-- Tab 切换 -->
      <view class="dl-tabs">
        <view
          v-for="tab in TABS"
          :key="tab.key"
          class="dl-tab"
          :class="{ active: activeTab === tab.key }"
          @tap="activeTab = tab.key"
        >
          <text class="dl-tab-text">{{ tab.label }}</text>
          <text v-if="tabCount(tab.key) > 0" class="dl-tab-count">({{ tabCount(tab.key) }})</text>
          <view v-if="activeTab === tab.key" class="dl-tab-underline" />
        </view>
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view scroll-y class="dl-scroll">
      <view v-if="filteredList.length === 0" class="dl-empty">
        <app-icon name="download" :size="96" color="rgba(201,169,110,0.5)" />
        <text class="dl-empty-text">{{ emptyMessage }}</text>
      </view>

      <view v-else class="dl-list">
        <view v-for="item in filteredList" :key="item.id" class="dl-item">
          <view class="dl-item-row">
            <!-- 封面/图标 -->
            <view class="dl-cover">
              <app-icon :name="fileTypeIcon(item.fileType)" :size="48" color="#C9A96E" />
            </view>
            <!-- 内容 -->
            <view class="dl-content">
              <view class="dl-content-top">
                <view class="dl-content-info">
                  <text class="dl-name">{{ item.fileName }}</text>
                  <text class="dl-source">{{ item.sourceTitle }}</text>
                </view>
                <view class="dl-more" @tap="openMenu(item)">
                  <app-icon name="more-vertical" :size="32" color="#999" />
                </view>
              </view>

              <!-- 进度信息 -->
              <view class="dl-progress-area">
                <template v-if="item.status === 'downloading'">
                  <view class="dl-bar"><view class="dl-bar-fill" :style="{ width: item.progress + '%' }" /></view>
                  <view class="dl-meta">
                    <text class="dl-meta-text">{{ item.progress }}% · {{ fmtSize(item.downloadedSize) }}/{{ fmtSize(item.fileSize) }}</text>
                    <text v-if="item.speed" class="dl-meta-text">{{ fmtSpeed(item.speed) }}</text>
                  </view>
                </template>

                <template v-else-if="item.status === 'paused'">
                  <view class="dl-bar"><view class="dl-bar-fill" :style="{ width: item.progress + '%' }" /></view>
                  <view class="dl-status-row paused">
                    <app-icon name="pause" :size="24" color="#CA8A04" />
                    <text class="dl-status-text">已暂停 · {{ item.progress }}%</text>
                  </view>
                </template>

                <view v-else-if="item.status === 'pending'" class="dl-status-row gray">
                  <app-icon name="clock" :size="24" color="#9CA3AF" />
                  <text class="dl-status-text">等待中 · {{ fmtSize(item.fileSize) }}</text>
                </view>

                <view v-else-if="item.status === 'completed'" class="dl-status-line">
                  <view class="dl-status-row green">
                    <app-icon name="check-circle" :size="24" color="#22C55E" />
                    <text class="dl-status-text">已完成 · {{ fmtSize(item.fileSize) }}</text>
                  </view>
                  <view class="dl-open-btn" @tap="openContent(item)">
                    <text class="dl-open-text">{{ item.fileType === 'video' || item.fileType === 'audio' ? '播放' : '阅读' }}</text>
                  </view>
                </view>

                <view v-else-if="item.status === 'failed'" class="dl-status-line">
                  <view class="dl-status-row red">
                    <app-icon name="alert-circle" :size="24" color="#EF4444" />
                    <text class="dl-status-text">{{ item.errorMsg || '下载失败' }}</text>
                  </view>
                  <view class="dl-retry-btn" @tap="retry(item)">
                    <app-icon name="refresh-cw" :size="22" color="#5C5C5C" />
                    <text class="dl-retry-text">重试</text>
                  </view>
                </view>
              </view>

              <!-- 下载中/暂停操作按钮 -->
              <view v-if="item.status === 'downloading' || item.status === 'paused'" class="dl-actions">
                <view v-if="item.status === 'downloading'" class="dl-action-btn flex1" @tap="pause(item)">
                  <app-icon name="pause" :size="22" color="#5C5C5C" />
                  <text class="dl-action-text">暂停</text>
                </view>
                <view v-else class="dl-action-btn flex1 primary" @tap="resume(item)">
                  <app-icon name="play" :size="22" color="#C41E3A" />
                  <text class="dl-action-text primary-text">继续</text>
                </view>
                <view class="dl-action-btn" @tap="deleteTarget = item">
                  <app-icon name="trash-2" :size="22" color="#5C5C5C" />
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 删除确认弹窗 -->
    <view v-if="deleteTarget" class="dialog-mask" @tap="deleteTarget = null">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">删除下载</text>
        <text class="dialog-desc">确定要删除「{{ deleteTarget.fileName }}」吗？{{ deleteTarget.status === 'completed' ? '本地文件也将被删除。' : '' }}</text>
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @tap="deleteTarget = null"><text class="dialog-btn-text">取消</text></view>
          <view class="dialog-btn confirm" :class="{ disabled: submitting }" @tap="doDelete"><text class="dialog-btn-text confirm-text">{{ submitting ? '删除中...' : '删除' }}</text></view>
        </view>
      </view>
    </view>

    <!-- 清除已完成确认弹窗 -->
    <view v-if="showClearDialog" class="dialog-mask" @tap="showClearDialog = false">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">清除已完成</text>
        <text class="dialog-desc">确定要清除所有已完成的下载记录吗？本地文件也将被删除。</text>
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @tap="showClearDialog = false"><text class="dialog-btn-text">取消</text></view>
          <view class="dialog-btn confirm" :class="{ disabled: submitting }" @tap="doClear"><text class="dialog-btn-text confirm-text">{{ submitting ? '清除中...' : '确定清除' }}</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { goBack, navigateTo } from '@/utils/router'
import { useSubmitLock } from '@/composables/use-submit-lock'

type FileType = 'video' | 'ebook' | 'classic' | 'audio' | 'document'
type Status = 'downloading' | 'paused' | 'completed' | 'failed' | 'pending'
interface DownloadItem {
  id: number; fileName: string; fileType: FileType; fileSize: number
  sourceId: number; sourceTitle: string; sourceType: string
  status: Status; progress: number; downloadedSize: number
  speed?: number; errorMsg?: string
}

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'downloading', label: '下载中' },
  { key: 'completed', label: '已完成' },
] as const
type TabKey = (typeof TABS)[number]['key']

const activeTab = ref<TabKey>('all')
const deleteTarget = ref<DownloadItem | null>(null)
const showClearDialog = ref(false)
const { submitting, withLock } = useSubmitLock()

const downloads = ref<DownloadItem[]>([
  { id: 1, fileName: '周易入门精讲.mp4', fileType: 'video', fileSize: 524288000, sourceId: 101, sourceTitle: '周易六十四卦详解课程', sourceType: 'course', status: 'downloading', progress: 65, downloadedSize: 340787200, speed: 2097152 },
  { id: 2, fileName: '八字命理基础.pdf', fileType: 'ebook', fileSize: 15728640, sourceId: 201, sourceTitle: '八字命理入门到精通', sourceType: 'ebook', status: 'downloading', progress: 30, downloadedSize: 4718592, speed: 1048576 },
  { id: 3, fileName: '道德经注解.epub', fileType: 'classic', fileSize: 8388608, sourceId: 301, sourceTitle: '道德经', sourceType: 'classic', status: 'paused', progress: 45, downloadedSize: 3774873 },
  { id: 4, fileName: '紫微斗数实战讲座01.mp4', fileType: 'video', fileSize: 314572800, sourceId: 102, sourceTitle: '紫微斗数入门到精通', sourceType: 'course', status: 'completed', progress: 100, downloadedSize: 314572800 },
  { id: 5, fileName: '风水学基础教材.pdf', fileType: 'ebook', fileSize: 20971520, sourceId: 202, sourceTitle: '阳宅风水入门', sourceType: 'ebook', status: 'completed', progress: 100, downloadedSize: 20971520 },
  { id: 6, fileName: '论语全文.epub', fileType: 'classic', fileSize: 5242880, sourceId: 302, sourceTitle: '论语', sourceType: 'classic', status: 'completed', progress: 100, downloadedSize: 5242880 },
  { id: 7, fileName: '梅花易数讲座.mp3', fileType: 'audio', fileSize: 52428800, sourceId: 103, sourceTitle: '梅花易数精讲', sourceType: 'course', status: 'failed', progress: 20, downloadedSize: 10485760, errorMsg: '网络连接中断' },
  { id: 8, fileName: '六壬神课入门.pdf', fileType: 'document', fileSize: 12582912, sourceId: 203, sourceTitle: '大六壬预测学', sourceType: 'ebook', status: 'pending', progress: 0, downloadedSize: 0 },
])

const storage = ref({
  totalSpace: 10737418240,
  downloadUsed: 942669824,
  breakdown: [
    { type: 'video' as FileType, size: 629145600, count: 2 },
    { type: 'ebook' as FileType, size: 157286400, count: 3 },
    { type: 'classic' as FileType, size: 104857600, count: 2 },
    { type: 'audio' as FileType, size: 52428800, count: 1 },
    { type: 'document' as FileType, size: 0, count: 0 },
  ],
})

const storagePct = computed(() => (storage.value.downloadUsed / storage.value.totalSpace) * 100)
const downloadingCount = computed(() => downloads.value.filter((d) => ['downloading', 'paused', 'pending', 'failed'].includes(d.status)).length)
const completedCount = computed(() => downloads.value.filter((d) => d.status === 'completed').length)

const filteredList = computed(() => {
  if (activeTab.value === 'downloading') return downloads.value.filter((d) => ['downloading', 'paused', 'pending', 'failed'].includes(d.status))
  if (activeTab.value === 'completed') return downloads.value.filter((d) => d.status === 'completed')
  return downloads.value
})

const emptyMessage = computed(() => {
  if (activeTab.value === 'downloading') return '暂无下载中的内容'
  if (activeTab.value === 'completed') return '暂无已完成的下载'
  return '暂无下载记录'
})

function tabCount(key: TabKey) {
  if (key === 'downloading') return downloadingCount.value
  if (key === 'completed') return completedCount.value
  return downloads.value.length
}

function fmtSize(bytes: number) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i]
}
function fmtSpeed(bps: number) { return fmtSize(bps) + '/s' }

function fileTypeName(type: FileType) {
  return { video: '视频', ebook: '电子书', classic: '古籍', audio: '音频', document: '文档' }[type] || '文件'
}
function fileTypeIcon(type: FileType) {
  return { video: 'video', ebook: 'book-open', classic: 'scroll', audio: 'headphones', document: 'file-text' }[type] || 'file'
}

function pause(item: DownloadItem) { item.status = 'paused'; item.speed = undefined }
function resume(item: DownloadItem) { item.status = 'downloading' }
function retry(item: DownloadItem) { item.status = 'downloading'; item.errorMsg = undefined }
function doDelete() {
  if (!deleteTarget.value || submitting.value) return
  withLock(async () => {
    downloads.value = downloads.value.filter((d) => d.id !== deleteTarget.value!.id)
    deleteTarget.value = null
  })
}
function doClear() {
  if (submitting.value) return
  withLock(async () => {
    downloads.value = downloads.value.filter((d) => d.status !== 'completed')
    showClearDialog.value = false
  })
}
function openMenu(item: DownloadItem) {
  const items = item.status === 'completed' ? ['打开', '删除'] : ['删除']
  uni.showActionSheet({
    itemList: items,
    itemColor: '#EF4444',
    success: (res) => {
      const label = items[res.tapIndex]
      if (label === '打开') openContent(item)
      else if (label === '删除') deleteTarget.value = item
    },
  })
}
function openContent(item: DownloadItem) {
  const map: Record<string, string> = {
    course: `/course/${item.sourceId}`,
    ebook: `/ebook/${item.sourceId}/read`,
    classic: `/classics/${item.sourceId}/read`,
    video: `/video/${item.sourceId}`,
  }
  navigateTo(map[item.sourceType] || '#')
}
</script>

<style lang="scss" scoped>
.downloads-page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}

/* 顶部 */
.dl-header {
  background: #faf8f5;
  border-bottom: 2rpx solid rgba(201, 169, 110, 0.2);
  padding-top: var(--status-bar-height, 0);
}
.dl-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
}
.dl-header-left { display: flex; align-items: center; gap: 24rpx; }
.dl-back { display: flex; align-items: center; }
.dl-title { font-size: 34rpx; font-weight: 600; color: #2d2a26; }
.dl-clear { font-size: 26rpx; color: #c41e3a; }

/* 存储 */
.dl-storage { padding: 0 32rpx 24rpx; }
.storage-card { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.storage-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.storage-label { display: flex; align-items: center; gap: 12rpx; }
.storage-label-text { font-size: 26rpx; color: #5c5c5c; }
.storage-val { font-size: 26rpx; color: #2d2a26; }
.storage-bar { height: 16rpx; background: #f0ece6; border-radius: 999rpx; overflow: hidden; }
.storage-bar-fill { height: 100%; background: #c41e3a; border-radius: 999rpx; }
.storage-breakdown { display: flex; flex-wrap: wrap; gap: 24rpx; margin-top: 16rpx; }
.breakdown-item { font-size: 22rpx; color: #8c8c8c; }

/* Tab */
.dl-tabs { display: flex; border-bottom: 2rpx solid rgba(201, 169, 110, 0.2); }
.dl-tab {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 24rpx 0;
}
.dl-tab-text { font-size: 28rpx; font-weight: 500; color: #5c5c5c; }
.dl-tab.active .dl-tab-text { color: #c41e3a; }
.dl-tab-count { font-size: 22rpx; color: #8c8c8c; }
.dl-tab.active .dl-tab-count { color: #c41e3a; }
.dl-tab-underline {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 96rpx;
  height: 4rpx;
  background: #c41e3a;
}

/* 列表 */
.dl-scroll { flex: 1; height: 0; }
.dl-empty { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.dl-empty-text { font-size: 28rpx; color: #999; margin-top: 24rpx; }
.dl-list { padding: 32rpx; display: flex; flex-direction: column; gap: 24rpx; }
.dl-item { background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04); }
.dl-item-row { display: flex; gap: 24rpx; }
.dl-cover {
  width: 112rpx;
  height: 112rpx;
  background: #faf8f5;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dl-content { flex: 1; min-width: 0; }
.dl-content-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.dl-content-info { flex: 1; min-width: 0; }
.dl-name { display: block; font-size: 28rpx; font-weight: 500; color: #2d2a26; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dl-source { display: block; font-size: 22rpx; color: #8c8c8c; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dl-more { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.dl-progress-area { margin-top: 16rpx; }
.dl-bar { height: 12rpx; background: #f0ece6; border-radius: 999rpx; overflow: hidden; margin-bottom: 12rpx; }
.dl-bar-fill { height: 100%; background: #c41e3a; border-radius: 999rpx; }
.dl-meta { display: flex; align-items: center; justify-content: space-between; }
.dl-meta-text { font-size: 22rpx; color: #8c8c8c; }
.dl-status-row { display: flex; align-items: center; gap: 8rpx; }
.dl-status-text { font-size: 22rpx; }
.dl-status-row.paused .dl-status-text { color: #ca8a04; }
.dl-status-row.gray .dl-status-text { color: #8c8c8c; }
.dl-status-row.green .dl-status-text { color: #16a34a; }
.dl-status-row.red .dl-status-text { color: #ef4444; }
.dl-status-line { display: flex; align-items: center; justify-content: space-between; }
.dl-open-btn { padding: 8rpx 24rpx; border: 2rpx solid #c41e3a; border-radius: 12rpx; }
.dl-open-text { font-size: 22rpx; color: #c41e3a; }
.dl-retry-btn { display: flex; align-items: center; gap: 6rpx; padding: 8rpx 20rpx; border: 2rpx solid #e5e5e5; border-radius: 12rpx; }
.dl-retry-text { font-size: 22rpx; color: #5c5c5c; }

.dl-actions { display: flex; gap: 16rpx; margin-top: 16rpx; }
.dl-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 10rpx 20rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 12rpx;
}
.dl-action-btn.flex1 { flex: 1; }
.dl-action-btn.primary { border-color: #c41e3a; }
.dl-action-text { font-size: 22rpx; color: #5c5c5c; }
.dl-action-text.primary-text { color: #c41e3a; }

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
.dialog { width: 600rpx; background: #fff; border-radius: 24rpx; padding: 40rpx; }
.dialog-title { display: block; font-size: 32rpx; font-weight: 600; color: #2d2a26; margin-bottom: 16rpx; }
.dialog-desc { display: block; font-size: 26rpx; color: #666; line-height: 1.5; margin-bottom: 32rpx; }
.dialog-actions { display: flex; gap: 24rpx; }
.dialog-btn { flex: 1; height: 80rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.dialog-btn.cancel { background: #f4f4f5; }
.dialog-btn.confirm { background: #c41e3a; }
.dialog-btn.confirm.disabled { opacity: 0.5; }
.dialog-btn-text { font-size: 28rpx; color: #666; }
.dialog-btn-text.confirm-text { color: #fff; }
</style>
