<template>
  <view class="downloads-page">
    <!-- 头部 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">下载管理</text>
        <text v-if="downloadingTasks.length > 0" class="header-action" @click="toggleAllTasks">
          {{ allPaused ? '全部开始' : '全部暂停' }}
        </text>
        <view v-else class="header-spacer" />
      </view>
    </view>

    <view class="page-body">
      <!-- 下载中列表 -->
      <view v-if="downloadingTasks.length > 0" class="section">
        <text class="section-title">⏱️ 下载中 ({{ downloadingTasks.length }})</text>
        <view class="task-list">
          <view v-for="task in downloadingTasks" :key="task.id" class="task-card">
            <view class="tc-row">
              <!-- 类型图标 -->
              <view class="tc-icon" :class="'type-' + task.type">
                <text>{{ typeIcon(task.type) }}</text>
              </view>

              <!-- 内容 -->
              <view class="tc-info">
                <text class="tc-name">{{ task.name }}</text>
                <text class="tc-source">{{ task.source }}</text>

                <!-- 进度条 -->
                <view class="tc-progress">
                  <view class="tcp-bar">
                    <view
                      class="tcp-fill"
                      :class="{
                        'paused': task.status === 'paused',
                        'failed': task.status === 'failed'
                      }"
                      :style="{ width: task.progress + '%' }"
                    />
                  </view>
                  <view class="tcp-stats">
                    <text class="tcp-size">{{ formatSize(task.downloaded) }} / {{ formatSize(task.size) }}</text>
                    <view class="tcp-right">
                      <text v-if="task.status === 'downloading'" class="tcp-speed">{{ formatSpeed(task.speed) }}</text>
                      <text class="tcp-badge" :class="'status-' + task.status">{{ statusLabel(task.status) }}</text>
                    </view>
                  </view>
                </view>
              </view>

              <!-- 操作按钮 -->
              <view class="tc-actions">
                <view class="tca-btn" :class="{ pause: task.status === 'downloading' }" @click="toggleTask(task.id)">
                  <text>{{ task.status === 'downloading' ? '⏸️' : '▶️' }}</text>
                </view>
                <view class="tca-btn cancel" @click="cancelTask(task.id)">
                  <text>✕</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 已完成列表 -->
      <view v-if="completedTasks.length > 0" class="section">
        <view class="section-header" @click="showCompleted = !showCompleted">
          <view class="sh-left">
            <text class="sh-icon">✅</text>
            <text class="sh-label">已完成 ({{ completedTasks.length }})</text>
          </view>
          <text class="sh-arrow">{{ showCompleted ? '▲' : '▼' }}</text>
        </view>

        <view v-if="showCompleted" class="task-list">
          <view v-for="task in completedTasks" :key="task.id" class="task-card completed-card">
            <view class="tc-row">
              <view class="tc-icon" :class="'type-' + task.type">
                <text>{{ typeIcon(task.type) }}</text>
              </view>
              <view class="tc-info">
                <text class="tc-name">{{ task.name }}</text>
                <view class="tc-meta">
                  <text class="tc-meta-item">{{ formatSize(task.size) }}</text>
                  <text class="tc-meta-divider">|</text>
                  <text class="tc-meta-item">{{ task.createdAt.split(' ')[0] }}</text>
                </view>
              </view>

              <view class="tc-actions">
                <view class="tca-open" @click="openTask(task)">
                  <text>{{ task.type === 'ebook' ? '阅读' : '播放' }}</text>
                </view>
                <view class="tca-more" @click="showMenu = showMenu === task.id ? null : task.id">
                  <text>⋯</text>
                </view>
                <!-- 菜单 -->
                <view v-if="showMenu === task.id" class="tca-menu">
                  <view class="tcam-overlay" @click="showMenu = null" />
                  <view class="tcam-popup">
                    <text class="tcam-item" @click="deleteCompleted(task.id)">🗑️ 删除文件</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="tasks.length === 0" class="empty-state">
        <text class="empty-icon">📂</text>
        <text class="empty-text">暂无下载任务</text>
        <view class="empty-btn" @click="goPage('/pages/discover/index')">
          <text>去发现内容</text>
        </view>
      </view>
    </view>

    <!-- 底部存储空间 -->
    <view class="storage-bar">
      <view class="sb-head">
        <view class="sbh-left">
          <text>💾</text>
          <text>存储空间</text>
        </view>
        <text class="sbh-value">{{ formatSize(storageInfo.used) }} / {{ formatSize(storageInfo.total) }}</text>
      </view>
      <view class="sb-bar">
        <view class="sbb-seg video" :style="{ width: (storageInfo.videoSize / storageInfo.total * 100) + '%' }" />
        <view class="sbb-seg ebook" :style="{ width: (storageInfo.ebookSize / storageInfo.total * 100) + '%' }" />
        <view class="sbb-seg audio" :style="{ width: (storageInfo.audioSize / storageInfo.total * 100) + '%' }" />
      </view>
      <view class="sb-legend">
        <view class="sbl-item">
          <view class="sbl-dot video" />
          <text class="sbl-text">视频 {{ formatSize(storageInfo.videoSize) }}</text>
        </view>
        <view class="sbl-item">
          <view class="sbl-dot ebook" />
          <text class="sbl-text">电子书 {{ formatSize(storageInfo.ebookSize) }}</text>
        </view>
        <view class="sbl-item">
          <view class="sbl-dot audio" />
          <text class="sbl-text">音频 {{ formatSize(storageInfo.audioSize) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface DownloadTask {
  id: number
  name: string
  type: string
  size: number
  downloaded: number
  speed: number
  status: string
  progress: number
  source: string
  createdAt: string
}

const tasks = ref<DownloadTask[]>([
  { id: 1, name: '八字命理入门精讲 - 第1章', type: 'video', size: 256, downloaded: 168, speed: 1024, status: 'downloading', progress: 65, source: '八字命理入门', createdAt: '2026-05-10 14:30' },
  { id: 2, name: '渊海子平（完整版）', type: 'ebook', size: 48, downloaded: 24, speed: 0, status: 'paused', progress: 50, source: '古籍书库', createdAt: '2026-05-10 14:25' },
  { id: 3, name: '紫微斗数基础课 - 第3章', type: 'video', size: 180, downloaded: 36, speed: 512, status: 'downloading', progress: 20, source: '紫微斗数基础', createdAt: '2026-05-10 14:20' },
  { id: 4, name: '滴天髓精解', type: 'ebook', size: 32, downloaded: 32, speed: 0, status: 'completed', progress: 100, source: '古籍书库', createdAt: '2026-05-09 10:15' },
  { id: 5, name: '八字命理入门精讲 - 第2章', type: 'video', size: 220, downloaded: 220, speed: 0, status: 'completed', progress: 100, source: '八字命理入门', createdAt: '2026-05-09 09:30' },
  { id: 6, name: '风水堪舆讲座音频', type: 'audio', size: 86, downloaded: 86, speed: 0, status: 'completed', progress: 100, source: '风水研习圈', createdAt: '2026-05-08 16:20' },
  { id: 7, name: '奇门遁甲入门 - 第1章', type: 'video', size: 150, downloaded: 0, speed: 0, status: 'failed', progress: 0, source: '奇门遁甲课程', createdAt: '2026-05-10 14:00' }
])

const showCompleted = ref(true)
const showMenu = ref<number | null>(null)
const allPaused = ref(false)

const storageInfo = ref({
  used: 846, total: 2048, videoSize: 620, ebookSize: 156, audioSize: 70
})

const downloadingTasks = computed(() => tasks.value.filter(t => t.status !== 'completed'))
const completedTasks = computed(() => tasks.value.filter(t => t.status === 'completed'))

let simTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  simTimer = setInterval(() => {
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
  if (simTimer) clearInterval(simTimer)
})

function typeIcon(type: string) {
  const icons: Record<string, string> = { video: '🎬', ebook: '📖', audio: '🎵', document: '📄' }
  return icons[type] || '📄'
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    downloading: '下载中', paused: '已暂停', completed: '已完成', failed: '下载失败', waiting: '等待中'
  }
  return labels[status] || status
}

function toggleTask(id: number) {
  tasks.value = tasks.value.map(task => {
    if (task.id === id) {
      if (task.status === 'downloading') {
        return { ...task, status: 'paused', speed: 0 }
      } else if (task.status === 'paused' || task.status === 'failed') {
        return { ...task, status: 'downloading', speed: Math.floor(Math.random() * 1024) + 512 }
      }
    }
    return task
  })
}

function cancelTask(id: number) {
  tasks.value = tasks.value.filter(t => t.id !== id)
}

function deleteCompleted(id: number) {
  tasks.value = tasks.value.filter(t => t.id !== id)
  showMenu.value = null
}

function toggleAllTasks() {
  allPaused.value = !allPaused.value
  tasks.value = tasks.value.map(task => {
    if (task.status === 'downloading' || task.status === 'paused') {
      return {
        ...task,
        status: allPaused.value ? 'paused' : 'downloading',
        speed: allPaused.value ? 0 : Math.floor(Math.random() * 1024) + 512
      }
    }
    return task
  })
}

function openTask(task: DownloadTask) {
  const url = task.type === 'ebook' ? '/pages/reader/index' : '/pages/learn/id-detail/index'
  uni.navigateTo({ url: url + '?id=' + task.id })
}

function formatSpeed(speed: number) {
  if (speed >= 1024) return (speed / 1024).toFixed(1) + ' MB/s'
  return speed + ' KB/s'
}

function formatSize(mb: number) {
  if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB'
  return mb + ' MB'
}

function goPage(url: string) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.downloads-page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 200rpx;
}

.header-sticky {
  position: sticky;
  top: 0;
  z-index: 30;
  background: #fff;
  border-bottom: 1px solid #E8E0D5;
}
.header-row {
  display: flex;
  align-items: center;
  padding: 10rpx 24rpx;
  height: 80rpx;
}
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-action { font-size: 26rpx; color: #C41E3A; font-weight: 500; }
.header-spacer { width: 100rpx; }

.page-body { padding: 24rpx; }

.section { margin-bottom: 48rpx; }
.section-title { font-size: 26rpx; font-weight: 500; color: #999; display: block; margin-bottom: 20rpx; }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.sh-left { display: flex; align-items: center; gap: 12rpx; }
.sh-icon { font-size: 28rpx; }
.sh-label { font-size: 26rpx; font-weight: 500; color: #999; }
.sh-arrow { font-size: 24rpx; color: #999; }

.task-list { display: flex; flex-direction: column; gap: 16rpx; }

.task-card { background: #fff; border-radius: 16rpx; padding: 20rpx; }
.tc-row { display: flex; align-items: flex-start; gap: 16rpx; }

.tc-icon {
  width: 72rpx; height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  flex-shrink: 0;
}
.tc-icon.type-video { background: rgba(59,130,246,0.1); }
.tc-icon.type-ebook { background: rgba(217,119,6,0.1); }
.tc-icon.type-audio { background: rgba(168,85,247,0.1); }
.tc-icon.type-document { background: rgba(168,85,247,0.1); }

.tc-info { flex: 1; min-width: 0; }
.tc-name {
  font-size: 26rpx; font-weight: 500; color: #2C2C2C;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  display: block;
}
.tc-source { font-size: 20rpx; color: #BBB; display: block; margin-top: 4rpx; }

.tc-progress { margin-top: 16rpx; }
.tcp-bar { height: 10rpx; background: #F5F1EB; border-radius: 5rpx; overflow: hidden; margin-bottom: 8rpx; }
.tcp-fill { height: 100%; background: #C41E3A; border-radius: 5rpx; transition: width 0.3s; }
.tcp-fill.paused { background: #BBB; }
.tcp-fill.failed { background: #EF4444; }
.tcp-stats { display: flex; justify-content: space-between; align-items: center; }
.tcp-size { font-size: 20rpx; color: #BBB; }
.tcp-right { display: flex; align-items: center; gap: 12rpx; }
.tcp-speed { font-size: 20rpx; color: #C41E3A; }
.tcp-badge {
  font-size: 18rpx;
  padding: 2rpx 12rpx;
  border-radius: 4rpx;
}
.tcp-badge.status-downloading { background: rgba(196,30,58,0.08); color: #C41E3A; }
.tcp-badge.status-paused { background: #F5F1EB; color: #999; }
.tcp-badge.status-failed { background: rgba(239,68,68,0.1); color: #EF4444; }
.tcp-badge.status-waiting { background: rgba(245,158,11,0.1); color: #F59E0B; }

.tc-actions { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; position: relative; }
.tca-btn {
  width: 56rpx; height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
}
.tca-btn.pause { background: rgba(196,30,58,0.08); }
.tca-btn:not(.pause) { background: #F5F1EB; }
.tca-btn.cancel { background: #F5F1EB; color: #999; }

.tca-open {
  padding: 10rpx 20rpx;
  background: #C41E3A;
  color: #fff;
  font-size: 22rpx;
  font-weight: 500;
  border-radius: 30rpx;
}

.tca-more {
  width: 56rpx; height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #999;
}

.tca-menu { position: relative; }
.tcam-overlay { position: fixed; inset: 0; z-index: 40; }
.tcam-popup {
  position: absolute;
  right: 0;
  top: 44rpx;
  width: 240rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
  z-index: 50;
  padding: 12rpx 0;
}
.tcam-item {
  display: block;
  padding: 20rpx 24rpx;
  font-size: 26rpx;
  color: #EF4444;
}

/* 已完成卡片 */
.completed-card .tc-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 6rpx; }
.tc-meta-item { font-size: 20rpx; color: #BBB; }
.tc-meta-divider { color: #E8E0D5; }

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 0;
}
.empty-icon { font-size: 100rpx; }
.empty-text { font-size: 26rpx; color: #999; margin-top: 16rpx; }
.empty-btn {
  margin-top: 28rpx;
  padding: 16rpx 48rpx;
  background: #C41E3A;
  color: #fff;
  font-size: 26rpx;
  font-weight: 500;
  border-radius: 40rpx;
}

/* 存储空间 */
.storage-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(20rpx);
  border-top: 1px solid #E8E0D5;
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.sb-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.sbh-left { display: flex; align-items: center; gap: 12rpx; font-size: 26rpx; color: #2C2C2C; }
.sbh-value { font-size: 24rpx; color: #999; }

.sb-bar { height: 14rpx; background: #F5F1EB; border-radius: 7rpx; overflow: hidden; display: flex; }
.sbb-seg { height: 100%; }
.sbb-seg.video { background: #3B82F6; }
.sbb-seg.ebook { background: #D97706; }
.sbb-seg.audio { background: #A855F7; }

.sb-legend { display: flex; align-items: center; gap: 32rpx; margin-top: 12rpx; }
.sbl-item { display: flex; align-items: center; gap: 8rpx; }
.sbl-dot { width: 14rpx; height: 14rpx; border-radius: 50%; }
.sbl-dot.video { background: #3B82F6; }
.sbl-dot.ebook { background: #D97706; }
.sbl-dot.audio { background: #A855F7; }
.sbl-text { font-size: 20rpx; color: #999; }
</style>
