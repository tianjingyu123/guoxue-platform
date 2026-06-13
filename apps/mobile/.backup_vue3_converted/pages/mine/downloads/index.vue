<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-accent/20">
      <view class="flex items-center justify-between px-4 py-3">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1">
            <text class="w-6 h-6 text-[#2D2A26] text-lg">&#8592;</text>
          </view>
          <text class="text-base font-semibold text-[#2D2A26]">下载管理</text>
        </view>
        <view v-if="completedCount > 0" @click="showClearDialog = true" class="text-sm text-primary px-3 py-1.5">
          <text>清除已完成</text>
        </view>
      </view>

      <!-- 存储空间信息 -->
      <view v-if="storageInfo" class="px-4 pb-3">
        <view class="bg-white rounded-xl p-3 border border-border">
          <view class="flex items-center justify-between mb-2">
            <view class="flex items-center gap-2 text-sm text-[#5C5C5C]">
              <text>💾</text>
              <text>存储空间</text>
            </view>
            <text class="text-sm text-[#2D2A26]">{{ storageInfo.usedDisplay }} / {{ storageInfo.totalDisplay }}</text>
          </view>
          <view class="h-2 bg-muted rounded-full overflow-hidden">
            <view :style="{ width: storagePercent + '%' }" class="h-full bg-primary rounded-full transition-all" />
          </view>
          <view class="flex gap-3 mt-2 text-xs text-[#8C8C8C]">
            <text v-for="b in storageBreakdown" :key="b.type">{{ b.label }} {{ b.size }}</text>
          </view>
        </view>
      </view>

      <!-- Tab 切换 -->
      <view class="flex border-b border-accent/20">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="flex-1 py-3 text-sm font-medium text-center relative"
          :class="activeTab === tab.key ? 'text-primary' : 'text-[#5C5C5C]'"
        >
          <text>{{ tab.label }}</text>
          <text v-if="tabCount(tab.key) > 0" :class="['text-xs ml-1', activeTab === tab.key ? 'text-primary' : 'text-[#8C8C8C]']">({{ tabCount(tab.key) }})</text>
          <view v-if="activeTab === tab.key" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary" />
        </view>
      </view>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="p-4 space-y-3">
      <view v-for="i in 4" :key="i" class="bg-white rounded-xl p-4 border border-border">
        <view class="flex gap-3 animate-pulse">
          <view class="w-16 h-16 bg-muted rounded-lg" />
          <view class="flex-1 space-y-2">
            <view class="h-4 bg-muted rounded w-3/4" />
            <view class="h-3 bg-muted rounded w-1/2" />
            <view class="h-2 bg-muted rounded w-full" />
          </view>
        </view>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="py-16 flex flex-col items-center">
      <text class="text-3xl text-muted-foreground mb-4"></text>
      <text class="text-sm text-muted-foreground mb-4">{{ error }}</text>
      <view @click="loadData" class="px-6 py-2 bg-primary text-white text-sm rounded-full">重试</view>
    </view>

    <!-- 内容区域 -->
    <view v-else class="pb-8">
      <view v-if="filteredDownloads.length === 0" class="py-16 flex flex-col items-center">
        <text class="text-4xl text-accent/50 mb-4">⬇️</text>
        <text class="text-sm text-muted-foreground">{{ emptyText }}</text>
      </view>

      <view v-else class="p-4 space-y-3">
        <view v-for="item in filteredDownloads" :key="item.id" class="bg-white rounded-xl p-4 shadow-sm border border-border/50">
          <view class="flex gap-3">
            <!-- 封面/图标 -->
            <view class="w-16 h-16 bg-background rounded-lg flex items-center justify-center shrink-0 relative">
              <image v-if="item.cover" :src="item.cover" mode="aspectFill" class="w-full h-full rounded-lg" />
              <text v-else class="text-2xl text-accent">{{ fileTypeIcon(item.fileType) }}</text>
            </view>

            <!-- 内容 -->
            <view class="flex-1 min-w-0">
              <view class="flex items-start justify-between gap-2">
                <view class="flex-1 min-w-0">
                  <text class="text-sm font-medium text-[#2D2A26] truncate block">{{ item.fileName }}</text>
                  <text class="text-xs text-[#8C8C8C] mt-0.5 truncate block">{{ item.sourceTitle }}</text>
                </view>
                <!-- 更多操作菜单 -->
                <view class="relative shrink-0" v-if="item.status === 'completed'">
                  <view @click="toggleMenu(item.id)" class="w-8 h-8 flex items-center justify-center">
                    <text class="text-[#8C8C8C]">⋮</text>
                  </view>
                  <view v-if="openMenuId === item.id" class="absolute right-0 top-8 bg-white rounded-xl shadow-lg z-20 py-1 min-w-[100px] border border-border">
                    <view @click="handleOpenContent(item); openMenuId = null" class="px-4 py-2 text-sm text-[#2D2A26]">打开</view>
                    <view @click="confirmDelete(item); openMenuId = null" class="px-4 py-2 text-sm text-danger">删除</view>
                  </view>
                  <view v-if="openMenuId === item.id" class="fixed inset-0 z-10" @click="openMenuId = null" />
                </view>
              </view>

              <!-- 进度信息 -->
              <view class="mt-2">
                <!-- 下载中 -->
                <template v-if="item.status === 'downloading'">
                  <view class="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
                    <view :style="{ width: item.progress + '%' }" class="h-full bg-primary rounded-full" />
                  </view>
                  <view class="flex items-center justify-between text-xs text-[#8C8C8C]">
                    <text>{{ item.progress }}% &middot; {{ item.downloadedSize }}/{{ item.fileSize }}</text>
                    <text v-if="item.speed">{{ item.speed }}/s</text>
                  </view>
                  <view class="flex gap-2 mt-2">
                    <view
                      @click="handlePause(item)"
                      :class="['flex-1 h-7 rounded-lg border border-border text-xs flex items-center justify-center', actionLoading === item.id ? 'opacity-50' : 'text-[#5C5C5C]']"
                    >
                      <text>暂停</text>
                    </view>
                    <view @click="confirmDelete(item)" :class="['h-7 w-7 rounded-lg border border-border flex items-center justify-center', actionLoading === item.id ? 'opacity-50' : '']">
                      <text class="text-xs">🗑️</text>
                    </view>
                  </view>
                </template>

                <!-- 已暂停 -->
                <template v-else-if="item.status === 'paused'">
                  <view class="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
                    <view :style="{ width: item.progress + '%' }" class="h-full bg-primary rounded-full" />
                  </view>
                  <view class="flex items-center gap-1 text-xs text-yellow-600 mb-2">
                    <text>⏸️</text>
                    <text>已暂停 &middot; {{ item.progress }}%</text>
                  </view>
                  <view class="flex gap-2">
                    <view
                      @click="handleResume(item)"
                      :class="['flex-1 h-7 rounded-lg border text-xs flex items-center justify-center', actionLoading === item.id ? 'opacity-50 border-border text-muted-foreground' : 'border-primary text-primary']"
                    >
                      <text>▶</text>
                      <text class="ml-1">继续</text>
                    </view>
                    <view @click="confirmDelete(item)" :class="['h-7 w-7 rounded-lg border border-border flex items-center justify-center', actionLoading === item.id ? 'opacity-50' : '']">
                      <text class="text-xs">🗑️</text>
                    </view>
                  </view>
                </template>

                <!-- 已完成 -->
                <template v-else-if="item.status === 'completed'">
                  <view class="flex items-center justify-between">
                    <view class="flex items-center gap-1 text-xs text-green-600">
                      <text></text>
                      <text>已完成 &middot; {{ item.fileSize }}</text>
                    </view>
                    <view
                      @click="handleOpenContent(item)"
                      class="px-2.5 py-1 rounded-lg border border-primary text-primary text-xs"
                    >
                      <text>{{ item.fileType === 'video' || item.fileType === 'audio' ? '播放' : '阅读' }}</text>
                    </view>
                  </view>
                </template>

                <!-- 失败 -->
                <template v-else-if="item.status === 'failed'">
                  <view class="flex items-center justify-between">
                    <view class="flex items-center gap-1 text-xs text-danger">
                      <text></text>
                      <text>{{ item.errorMsg || '下载失败' }}</text>
                    </view>
                    <view
                      @click="handleRetry(item)"
                      :class="['px-2.5 py-1 rounded-lg border border-border text-xs flex items-center gap-1', actionLoading === item.id ? 'opacity-50' : '']"
                    >
                      <text></text>
                      <text>重试</text>
                    </view>
                  </view>
                </template>

                <!-- 等待中 -->
                <template v-else-if="item.status === 'pending'">
                  <view class="flex items-center gap-1 text-xs text-[#8C8C8C]">
                    <text></text>
                    <text>等待中 &middot; {{ item.fileSize }}</text>
                  </view>
                </template>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 删除确认弹窗 -->
    <view v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <view class="bg-white rounded-2xl p-6 mx-6 max-w-xs w-full">
        <text class="text-base font-semibold text-[#2D2A26] block mb-2">删除下载</text>
        <text class="text-sm text-[#8C8C8C] block mb-4">确定要删除「{{ deleteTarget.fileName }}」吗？{{ deleteTarget.status === 'completed' ? '本地文件也将被删除。' : '' }}</text>
        <view class="flex gap-3">
          <view @click="deleteTarget = null" class="flex-1 h-11 bg-muted text-[#2D2A26] rounded-xl font-medium flex items-center justify-center text-sm">取消</view>
          <view @click="handleDelete" :class="['flex-1 h-11 rounded-xl font-medium flex items-center justify-center text-sm', actionLoading === deleteTarget?.id ? 'bg-muted text-muted-foreground' : 'bg-primary text-white']">
            <text>{{ actionLoading === deleteTarget?.id ? '删除中...' : '删除' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 清除已完成确认弹窗 -->
    <view v-if="showClearDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <view class="bg-white rounded-2xl p-6 mx-6 max-w-xs w-full">
        <text class="text-base font-semibold text-[#2D2A26] block mb-2">清除已完成</text>
        <text class="text-sm text-[#8C8C8C] block mb-4">确定要清除所有已完成的下载记录吗？本地文件也将被删除。</text>
        <view class="flex gap-3">
          <view @click="showClearDialog = false" class="flex-1 h-11 bg-muted text-[#2D2A26] rounded-xl font-medium flex items-center justify-center text-sm">取消</view>
          <view @click="handleClearCompleted" class="flex-1 h-11 bg-primary text-white rounded-xl font-medium flex items-center justify-center text-sm">确定清除</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 常量
const tabs = [
  { key: 'all', label: '全部' },
  { key: 'downloading', label: '下载中' },
  { key: 'completed', label: '已完成' },
]

// 类型
interface StorageInfo {
  usedDisplay: string
  totalDisplay: string
  downloadUsed: number
  totalSpace: number
  breakdown: { type: string; label: string; size: string; count: number }[]
}

interface DownloadItem {
  id: number
  fileName: string
  sourceTitle: string
  fileType: string
  fileSize: string
  downloadedSize: string
  progress: number
  status: 'downloading' | 'paused' | 'pending' | 'completed' | 'failed'
  speed?: string
  errorMsg?: string
  cover?: string
}

// 状态
const activeTab = ref('all')
const loading = ref(true)
const error = ref<string | null>(null)
const downloads = ref<DownloadItem[]>([])
const storageInfo = ref<StorageInfo | null>(null)
const actionLoading = ref<number | null>(null)
const deleteTarget = ref<DownloadItem | null>(null)
const showClearDialog = ref(false)
const openMenuId = ref<number | null>(null)

// 计算属性
const downloadingCount = computed(() =>
  downloads.value.filter(d => ['downloading', 'paused', 'pending', 'failed'].includes(d.status)).length
)
const completedCount = computed(() =>
  downloads.value.filter(d => d.status === 'completed').length
)

const filteredDownloads = computed(() => {
  if (activeTab.value === 'all') return downloads.value
  if (activeTab.value === 'downloading') return downloads.value.filter(d => ['downloading', 'paused', 'pending', 'failed'].includes(d.status))
  if (activeTab.value === 'completed') return downloads.value.filter(d => d.status === 'completed')
  return downloads.value
})

const storagePercent = computed(() => {
  if (!storageInfo.value || storageInfo.value.totalSpace === 0) return 0
  return (storageInfo.value.downloadUsed / storageInfo.value.totalSpace) * 100
})

const storageBreakdown = computed(() => {
  return (storageInfo.value?.breakdown || []).filter(b => b.count > 0)
})

const emptyText = computed(() => {
  if (activeTab.value === 'downloading') return '暂无下载中的内容'
  if (activeTab.value === 'completed') return '暂无已完成的下载'
  return '暂无下载记录'
})

// 方法
function fileTypeIcon(type: string): string {
  const icons: Record<string, string> = { video: '\u{1F3AC}', ebook: '\u{1F4D6}', classic: '\u{1F5DC}\u{FE0F}', audio: '\u{1F3A7}', document: '\u{1F4C4}' }
  return icons[type] || '\u{1F4C1}'
}

function tabCount(key: string): number {
  if (key === 'all') return downloads.value.length
  if (key === 'downloading') return downloadingCount.value
  if (key === 'completed') return completedCount.value
  return 0
}

function toggleMenu(id: number) {
  openMenuId.value = openMenuId.value === id ? null : id
}

// API模拟
function loadData() {
  loading.value = true
  error.value = null

  setTimeout(() => {
    // 模拟存储信息
    storageInfo.value = {
      usedDisplay: '1.2 GB',
      totalDisplay: '8 GB',
      downloadUsed: 1.2 * 1024 * 1024 * 1024,
      totalSpace: 8 * 1024 * 1024 * 1024,
      breakdown: [
        { type: 'video', label: '视频', size: '512 MB', count: 2 },
        { type: 'ebook', label: '电子书', size: '128 MB', count: 1 },
        { type: 'document', label: '文档', size: '5 MB', count: 1 },
        { type: 'audio', label: '音频', size: '48 MB', count: 1 },
      ],
    }

    // 模拟下载列表
    downloads.value = [
      { id: 1, fileName: '周易入门基础教程.mp4', sourceTitle: '易经基础课程', fileType: 'video', fileSize: '256 MB', downloadedSize: '192 MB', progress: 75, status: 'downloading', speed: '2.4 MB', cover: '' },
      { id: 2, fileName: '梅花易数精解.pdf', sourceTitle: '梅花易数', fileType: 'ebook', fileSize: '12 MB', downloadedSize: '12 MB', progress: 100, status: 'completed', cover: '' },
      { id: 3, fileName: '孙子兵法全文注释.doc', sourceTitle: '兵家经典', fileType: 'document', fileSize: '5 MB', downloadedSize: '3.2 MB', progress: 64, status: 'paused', cover: '' },
      { id: 4, fileName: '道德经诵读版.mp3', sourceTitle: '道家经典', fileType: 'audio', fileSize: '48 MB', downloadedSize: '48 MB', progress: 100, status: 'completed', cover: '' },
      { id: 5, fileName: '奇门遁甲排盘技巧.mp4', sourceTitle: '奇门遁甲', fileType: 'video', fileSize: '512 MB', downloadedSize: '128 MB', progress: 25, status: 'failed', errorMsg: '网络连接失败', cover: '' },
    ]
    loading.value = false
  }, 600)
}

function handlePause(item: DownloadItem) {
  actionLoading.value = item.id
  setTimeout(() => {
    item.status = 'paused'
    item.speed = undefined
    actionLoading.value = null
  }, 300)
}

function handleResume(item: DownloadItem) {
  actionLoading.value = item.id
  setTimeout(() => {
    item.status = 'downloading'
    actionLoading.value = null
  }, 300)
}

function handleRetry(item: DownloadItem) {
  actionLoading.value = item.id
  setTimeout(() => {
    item.status = 'downloading'
    item.errorMsg = undefined
    actionLoading.value = null
  }, 300)
}

function confirmDelete(item: DownloadItem) {
  deleteTarget.value = item
}

function handleDelete() {
  if (!deleteTarget.value) return
  actionLoading.value = deleteTarget.value.id
  setTimeout(() => {
    downloads.value = downloads.value.filter(d => d.id !== deleteTarget.value!.id)
    actionLoading.value = null
    deleteTarget.value = null
    uni.showToast({ title: '已删除', icon: 'success' })
  }, 300)
}

function handleClearCompleted() {
  downloads.value = downloads.value.filter(d => d.status !== 'completed')
  showClearDialog.value = false
  uni.showToast({ title: '已清除', icon: 'success' })
  loadData()
}

function handleOpenContent(item: DownloadItem) {
  uni.navigateTo({ url: `/pages/content/id-detail/index?id=${item.id}` })
}

function goBack() {
  uni.navigateBack()
}

onMounted(() => { loadData() })
</script>

<style scoped>
</style>
