<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="p-2 -ml-2">
          <text class="text-lg text-foreground">&#8592;</text>
        </view>
        <text class="font-semibold text-base text-foreground">下载管理</text>
        <view v-if="downloadingTasks.length > 0" @click="toggleAllTasks" class="text-sm text-primary font-medium">{{ allPaused ? '全部开始' : '全部暂停' }}</view>
        <view v-else class="w-16" />
      </view>
    </header>

    <view class="p-4 space-y-6">
      <!-- 下载中列表 -->
      <view v-if="downloadingTasks.length > 0">
        <view class="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <text>&#128339;</text>
          <text>下载中 ({{ downloadingTasks.length }})</text>
        </view>
        <view class="space-y-3">
          <view v-for="task in downloadingTasks" :key="task.id" class="bg-white rounded-xl p-4 shadow-sm">
            <view class="flex items-start gap-3">
              <!-- 类型图标 -->
              <view :class="['w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', getIconBg(task.type)]">
                <text :class="[getIconColor(task.type), 'text-base']">{{ getTypeIcon(task.type) }}</text>
              </view>

              <!-- 内容区 -->
              <view class="flex-1 min-w-0">
                <text class="text-sm font-medium text-foreground line-clamp-1">{{ task.name }}</text>
                <text class="text-xs text-muted-foreground block mt-0.5">{{ task.source }}</text>

                <!-- 进度条 -->
                <view class="mt-2">
                  <view class="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <view :class="['h-full rounded-full transition-all duration-300', getProgressBarClass(task.status)]" :style="{ width: task.progress + '%' }"></view>
                  </view>
                  <view class="flex items-center justify-between mt-1">
                    <text class="text-xs text-muted-foreground">{{ formatSize(task.downloaded) }} / {{ formatSize(task.size) }}</text>
                    <view class="flex items-center gap-2">
                      <text v-if="task.status === 'downloading'" class="text-xs text-primary">{{ formatSpeed(task.speed) }}</text>
                      <text :class="['text-[10px] px-1.5 py-0.5 rounded', getStatusInfo(task.status).bgColor, getStatusInfo(task.status).color]">{{ getStatusInfo(task.status).label }}</text>
                    </view>
                  </view>
                </view>
              </view>

              <!-- 操作按钮 -->
              <view class="flex items-center gap-1 flex-shrink-0">
                <view @click="toggleTask(task.id)" :class="['p-2 rounded-full transition-colors', task.status === 'downloading' ? 'bg-primary/10 text-primary' : 'bg-secondary text-foreground']">
                  <text v-if="task.status === 'downloading'" class="text-xs">&#9646;&#9646;</text>
                  <text v-else class="text-xs">&#9654;</text>
                </view>
                <view @click="cancelTask(task.id)" class="p-2 rounded-full bg-secondary text-muted-foreground">
                  <text class="text-xs">&#10005;</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 已完成列表 -->
      <view v-if="completedTasks.length > 0">
        <view @click="showCompleted = !showCompleted" class="w-full flex items-center justify-between text-sm font-medium text-foreground mb-3">
          <view class="flex items-center gap-2">
            <text class="text-green-500">&#10003;</text>
            <text>已完成 ({{ completedTasks.length }})</text>
          </view>
          <view>
            <text v-if="showCompleted">&#9650;</text>
            <text v-else>&#9660;</text>
          </view>
        </view>

        <view v-if="showCompleted" class="space-y-2">
          <view v-for="task in completedTasks" :key="task.id" class="bg-white rounded-xl p-4 shadow-sm">
            <view class="flex items-center gap-3">
              <!-- 类型图标 -->
              <view :class="['w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', getIconBg(task.type)]">
                <text :class="[getIconColor(task.type), 'text-base']">{{ getTypeIcon(task.type) }}</text>
              </view>

              <!-- 内容 -->
              <view class="flex-1 min-w-0">
                <text class="text-sm font-medium text-foreground line-clamp-1">{{ task.name }}</text>
                <view class="flex items-center gap-2 mt-0.5">
                  <text class="text-xs text-muted-foreground">{{ formatSize(task.size) }}</text>
                  <text class="text-xs text-muted-foreground">|</text>
                  <text class="text-xs text-muted-foreground">{{ task.createdAt.split(' ')[0] }}</text>
                </view>
              </view>

              <!-- 操作 -->
              <view class="flex items-center gap-1 flex-shrink-0">
                <view @click="goToContent(task)" class="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-full">
                  {{ task.type === 'ebook' ? '阅读' : '播放' }}
                </view>
                <view class="relative">
                  <view @click="toggleMenu(task.id)" class="p-2 rounded-full">
                    <text class="text-muted-foreground">&#8942;</text>
                  </view>
                  <view v-if="showMenu === task.id" @click="closeMenu" class="fixed inset-0 z-40"></view>
                  <view v-if="showMenu === task.id" class="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-border z-50 py-1">
                    <view @click="deleteCompleted(task.id)" class="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger">
                      <text>&#128465;</text>
                      <text>删除文件</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="tasks.length === 0" class="flex flex-col items-center justify-center py-20">
        <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
          <text class="text-3xl text-muted-foreground">&#128194;</text>
        </view>
        <text class="text-muted-foreground text-sm">暂无下载任务</text>
        <view @click="goTo('/pages/discover/index')" class="mt-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-full">
          去发现内容
        </view>
      </view>
    </view>

    <!-- 底部存储空间 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-border p-4" style="padding-bottom: calc(16px + env(safe-area-inset-bottom));">
      <view class="max-w-lg mx-auto">
        <view class="flex items-center justify-between mb-2">
          <view class="flex items-center gap-2">
            <text class="text-base">&#128190;</text>
            <text class="text-sm text-foreground">存储空间</text>
          </view>
          <text class="text-sm text-muted-foreground">{{ formatSize(storageInfo.used) }} / {{ formatSize(storageInfo.total) }}</text>
        </view>
        <view class="h-2 bg-secondary rounded-full overflow-hidden flex">
          <view class="h-full bg-blue-500" :style="{ width: (storageInfo.videoSize / storageInfo.total * 100) + '%' }"></view>
          <view class="h-full bg-amber-500" :style="{ width: (storageInfo.ebookSize / storageInfo.total * 100) + '%' }"></view>
          <view class="h-full bg-purple-500" :style="{ width: (storageInfo.audioSize / storageInfo.total * 100) + '%' }"></view>
        </view>
        <view class="flex items-center gap-4 mt-2">
          <view class="flex items-center gap-1.5">
            <view class="w-2 h-2 rounded-full bg-blue-500"></view>
            <text class="text-xs text-muted-foreground">视频 {{ formatSize(storageInfo.videoSize) }}</text>
          </view>
          <view class="flex items-center gap-1.5">
            <view class="w-2 h-2 rounded-full bg-amber-500"></view>
            <text class="text-xs text-muted-foreground">电子书 {{ formatSize(storageInfo.ebookSize) }}</text>
          </view>
          <view class="flex items-center gap-1.5">
            <view class="w-2 h-2 rounded-full bg-purple-500"></view>
            <text class="text-xs text-muted-foreground">音频 {{ formatSize(storageInfo.audioSize) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

type DownloadStatus = 'downloading' | 'paused' | 'completed' | 'failed' | 'waiting'

interface DownloadTask {
  id: number
  name: string
  type: 'ebook' | 'video' | 'audio' | 'document'
  size: number
  downloaded: number
  speed: number
  status: DownloadStatus
  progress: number
  source: string
  createdAt: string
}

const initialTasks: DownloadTask[] = [
  { id: 1, name: '八字命理入门精讲 - 第1章', type: 'video', size: 256, downloaded: 168, speed: 1024, status: 'downloading', progress: 65, source: '八字命理入门', createdAt: '2026-05-10 14:30' },
  { id: 2, name: '渊海子平（完整版）', type: 'ebook', size: 48, downloaded: 24, speed: 0, status: 'paused', progress: 50, source: '古籍书库', createdAt: '2026-05-10 14:25' },
  { id: 3, name: '紫微斗数基础课 - 第3章', type: 'video', size: 180, downloaded: 36, speed: 512, status: 'downloading', progress: 20, source: '紫微斗数基础', createdAt: '2026-05-10 14:20' },
  { id: 4, name: '滴天髓精解', type: 'ebook', size: 32, downloaded: 32, speed: 0, status: 'completed', progress: 100, source: '古籍书库', createdAt: '2026-05-09 10:15' },
  { id: 5, name: '八字命理入门精讲 - 第2章', type: 'video', size: 220, downloaded: 220, speed: 0, status: 'completed', progress: 100, source: '八字命理入门', createdAt: '2026-05-09 09:30' },
  { id: 6, name: '风水堪舆讲座音频', type: 'audio', size: 86, downloaded: 86, speed: 0, status: 'completed', progress: 100, source: '风水研习圈', createdAt: '2026-05-08 16:20' },
  { id: 7, name: '奇门遁甲入门 - 第1章', type: 'video', size: 150, downloaded: 0, speed: 0, status: 'failed', progress: 0, source: '奇门遁甲课程', createdAt: '2026-05-10 14:00' },
]

const storageInfo = { used: 846, total: 2048, videoSize: 620, ebookSize: 156, audioSize: 70 }

const tasks = ref<DownloadTask[]>(initialTasks)
const showCompleted = ref(true)
const showMenu = ref<number | null>(null)
const allPaused = ref(false)

// 模拟下载进度更新
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => {
    tasks.value = tasks.value.map(task => {
      if (task.status === 'downloading' && !allPaused.value) {
        const newDownloaded = Math.min(task.downloaded + (task.speed / 1024) * 0.5, task.size)
        const newProgress = Math.round((newDownloaded / task.size) * 100)
        return {
          ...task,
          downloaded: newDownloaded,
          progress: newProgress,
          status: newProgress >= 100 ? 'completed' : 'downloading',
          speed: newProgress >= 100 ? 0 : task.speed
        }
      }
      return task
    })
  }, 500)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const downloadingTasks = computed(() => tasks.value.filter(t => t.status === 'downloading' || t.status === 'paused' || t.status === 'waiting' || t.status === 'failed'))
const completedTasks = computed(() => tasks.value.filter(t => t.status === 'completed'))

const toggleTask = (id: number) => {
  tasks.value = tasks.value.map(task => {
    if (task.id === id) {
      if (task.status === 'downloading') {
        return { ...task, status: 'paused' as DownloadStatus, speed: 0 }
      } else if (task.status === 'paused' || task.status === 'failed') {
        return { ...task, status: 'downloading' as DownloadStatus, speed: Math.floor(Math.random() * 1024) + 512 }
      }
    }
    return task
  })
}

const cancelTask = (id: number) => {
  tasks.value = tasks.value.filter(t => t.id !== id)
  showMenu.value = null
}

const deleteCompleted = (id: number) => {
  tasks.value = tasks.value.filter(t => t.id !== id)
  showMenu.value = null
}

const toggleAllTasks = () => {
  allPaused.value = !allPaused.value
  tasks.value = tasks.value.map(task => {
    if (task.status === 'downloading' || task.status === 'paused') {
      return {
        ...task,
        status: allPaused.value ? 'paused' as DownloadStatus : 'downloading' as DownloadStatus,
        speed: allPaused.value ? 0 : Math.floor(Math.random() * 1024) + 512
      }
    }
    return task
  })
}

const toggleMenu = (id: number) => {
  showMenu.value = showMenu.value === id ? null : id
}

const closeMenu = () => {
  showMenu.value = null
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'ebook': return ''
    case 'video': return '📹'
    case 'audio': return ''
    default: return ''
  }
}

const getIconBg = (type: string) => {
  switch (type) {
    case 'video': return 'bg-blue-500/10'
    case 'ebook': return 'bg-amber-500/10'
    case 'audio': return 'bg-purple-500/10'
    default: return 'bg-purple-500/10'
  }
}

const getIconColor = (type: string) => {
  switch (type) {
    case 'video': return 'text-blue-500'
    case 'ebook': return 'text-amber-500'
    case 'audio': return 'text-purple-500'
    default: return 'text-purple-500'
  }
}

const getProgressBarClass = (status: DownloadStatus) => {
  switch (status) {
    case 'failed': return 'bg-danger'
    case 'paused': return 'bg-[#999]'
    default: return 'bg-primary'
  }
}

const getStatusInfo = (status: DownloadStatus) => {
  switch (status) {
    case 'downloading': return { label: '下载中', color: 'text-primary', bgColor: 'bg-primary/10' }
    case 'paused': return { label: '已暂停', color: 'text-muted-foreground', bgColor: 'bg-secondary' }
    case 'completed': return { label: '已完成', color: 'text-green-500', bgColor: 'bg-green-500/10' }
    case 'failed': return { label: '下载失败', color: 'text-danger', bgColor: 'bg-danger/10' }
    case 'waiting': return { label: '等待中', color: 'text-amber-500', bgColor: 'bg-amber-500/10' }
  }
}

const formatSpeed = (speed: number) => {
  if (speed >= 1024) return `${(speed / 1024).toFixed(1)} MB/s`
  return `${speed} KB/s`
}

const formatSize = (mb: number) => {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

const goToContent = (task: DownloadTask) => {
  if (task.type === 'ebook') {
    uni.navigateTo({ url: `/pages/reader/${task.id}` })
  } else {
    uni.navigateTo({ url: `/pages/learn/${task.id}` })
  }
}
</script>

<style scoped>
</style>
