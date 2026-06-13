<template>
  <view class="dl-page">
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

    <view class="dl-content">
      <!-- 下载中 -->
      <view v-if="downloadingTasks.length > 0" class="section">
        <text class="section-title">🕐 下载中 ({{ downloadingTasks.length }})</text>
        <view class="task-list">
          <view v-for="task in downloadingTasks" :key="task.id" class="task-card">
            <view class="task-main">
              <view class="task-icon" :class="typeIconClass(task.type)">
                <text>{{ typeEmoji(task.type) }}</text>
              </view>
              <view class="task-info">
                <text class="task-name">{{ task.name }}</text>
                <text class="task-source">{{ task.source }}</text>
                <view class="task-progress-wrap">
                  <view class="task-progress-bar">
                    <view
                      class="task-progress-fill"
                      :class="task.status === 'failed' ? 'fill-fail' : task.status === 'paused' ? 'fill-pause' : 'fill-active'"
                      :style="{ width: task.progress + '%' }"
                    />
                  </view>
                  <view class="task-progress-stats">
                    <text class="tps-size">{{ fmtSize(task.downloaded) }} / {{ fmtSize(task.size) }}</text>
                    <view class="tps-right">
                      <text v-if="task.status === 'downloading'" class="tps-speed">{{ fmtSpeed(task.speed) }}</text>
                      <text class="tps-status" :class="statusClass(task.status)">{{ statusLabel(task.status) }}</text>
                    </view>
                  </view>
                </view>
              </view>
              <view class="task-actions">
                <view class="ta-btn" :class="{ pause: task.status === 'downloading' }" @click="toggleTask(task.id)">
                  <text>{{ task.status === 'downloading' ? '⏸' : '▶' }}</text>
                </view>
                <view class="ta-btn del" @click="cancelTask(task.id)">
                  <text>✕</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 已完成 -->
      <view v-if="completedTasks.length > 0" class="section">
        <view class="section-head" @click="showCompleted = !showCompleted">
          <text class="section-title">✅ 已完成 ({{ completedTasks.length }})</text>
          <text class="section-arrow" :class="{ open: showCompleted }">›</text>
        </view>
        <view v-if="showCompleted" class="task-list">
          <view v-for="task in completedTasks" :key="task.id" class="task-card done">
            <view class="task-icon" :class="typeIconClass(task.type)">
              <text>{{ typeEmoji(task.type) }}</text>
            </view>
            <view class="task-info">
              <text class="task-name">{{ task.name }}</text>
              <text class="task-source">{{ fmtSize(task.size) }} | {{ task.createdAt.split(' ')[0] }}</text>
            </view>
            <view class="done-actions">
              <view class="da-open" @click="goPage(task.type === 'ebook' ? '/pages/reader/index' : '/pages/learn/index')">
                <text>{{ task.type === 'ebook' ? '阅读' : '播放' }}</text>
              </view>
              <view class="da-more" @click="showMenu = showMenu === task.id ? null : task.id">
                <text>⋯</text>
              </view>
              <view v-if="showMenu === task.id" class="menu-popup" @click.stop>
                <text class="menu-item del" @click="deleteCompleted(task.id)">删除文件</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="tasks.length === 0" class="empty-wrap">
        <text class="empty-icon">📂</text>
        <text class="empty-text">暂无下载任务</text>
        <view class="empty-btn" @click="goPage('/pages/discover/index')">
          <text>去发现内容</text>
        </view>
      </view>
    </view>

    <!-- 底部存储空间 -->
    <view class="storage-bar">
      <view class="storage-info">
        <text class="si-label">💾 存储空间</text>
        <text class="si-val">{{ fmtSize(storageInfo.used) }} / {{ fmtSize(storageInfo.total) }}</text>
      </view>
      <view class="storage-bar-track">
        <view class="sb-seg sb-video" :style="{ width: (storageInfo.videoSize / storageInfo.total * 100) + '%' }" />
        <view class="sb-seg sb-ebook" :style="{ width: (storageInfo.ebookSize / storageInfo.total * 100) + '%' }" />
        <view class="sb-seg sb-audio" :style="{ width: (storageInfo.audioSize / storageInfo.total * 100) + '%' }" />
      </view>
      <view class="storage-legend">
        <text class="sl-item"><view class="sl-dot sl-video" />视频 {{ fmtSize(storageInfo.videoSize) }}</text>
        <text class="sl-item"><view class="sl-dot sl-ebook" />电子书 {{ fmtSize(storageInfo.ebookSize) }}</text>
        <text class="sl-item"><view class="sl-dot sl-audio" />音频 {{ fmtSize(storageInfo.audioSize) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

type DownloadStatus = 'downloading' | 'paused' | 'completed' | 'failed' | 'waiting'

interface DownloadTask {
  id: number; name: string; type: string; size: number; downloaded: number
  speed: number; status: DownloadStatus; progress: number; source: string; createdAt: string
}

const tasks = ref<DownloadTask[]>([
  { id: 1, name: '八字命理入门精讲 - 第1章', type: 'video', size: 256, downloaded: 168, speed: 1024, status: 'downloading', progress: 65, source: '八字命理入门', createdAt: '2026-05-10 14:30' },
  { id: 2, name: '渊海子平（完整版）', type: 'ebook', size: 48, downloaded: 24, speed: 0, status: 'paused', progress: 50, source: '古籍书库', createdAt: '2026-05-10 14:25' },
  { id: 3, name: '紫微斗数基础课 - 第3章', type: 'video', size: 180, downloaded: 36, speed: 512, status: 'downloading', progress: 20, source: '紫微斗数基础', createdAt: '2026-05-10 14:20' },
  { id: 4, name: '滴天髓精解', type: 'ebook', size: 32, downloaded: 32, speed: 0, status: 'completed', progress: 100, source: '古籍书库', createdAt: '2026-05-09 10:15' },
  { id: 5, name: '八字命理入门精讲 - 第2章', type: 'video', size: 220, downloaded: 220, speed: 0, status: 'completed', progress: 100, source: '八字命理入门', createdAt: '2026-05-09 09:30' },
  { id: 6, name: '风水堪舆讲座音频', type: 'audio', size: 86, downloaded: 86, speed: 0, status: 'completed', progress: 100, source: '风水研习圈', createdAt: '2026-05-08 16:20' },
  { id: 7, name: '奇门遁甲入门 - 第1章', type: 'video', size: 150, downloaded: 0, speed: 0, status: 'failed', progress: 0, source: '奇门遁甲课程', createdAt: '2026-05-10 14:00' },
])

const showCompleted = ref(true)
const showMenu = ref<number | null>(null)
const allPaused = ref(false)
let timer: any = null

const storageInfo = { used: 846, total: 2048, videoSize: 620, ebookSize: 156, audioSize: 70 }

const downloadingTasks = computed(() => tasks.value.filter(t => t.status !== 'completed'))
const completedTasks = computed(() => tasks.value.filter(t => t.status === 'completed'))

onMounted(() => {
  timer = setInterval(() => {
    tasks.value = tasks.value.map(task => {
      if (task.status === 'downloading' && !allPaused.value) {
        const newDl = Math.min(task.downloaded + (task.speed / 1024) * 0.5, task.size)
        const newProgress = Math.round((newDl / task.size) * 100)
        return { ...task, downloaded: newDl, progress: newProgress, status: newProgress >= 100 ? 'completed' as const : 'downloading', speed: newProgress >= 100 ? 0 : task.speed }
      }
      return task
    })
  }, 500)
})

onUnmounted(() => { if (timer) clearInterval(timer) })

function toggleTask(id: number) {
  tasks.value = tasks.value.map(t => {
    if (t.id !== id) return t
    if (t.status === 'downloading') return { ...t, status: 'paused' as const, speed: 0 }
    if (t.status === 'paused' || t.status === 'failed') return { ...t, status: 'downloading' as const, speed: Math.floor(Math.random() * 1024) + 512 }
    return t
  })
}

function cancelTask(id: number) { tasks.value = tasks.value.filter(t => t.id !== id) }
function deleteCompleted(id: number) { tasks.value = tasks.value.filter(t => t.id !== id); showMenu.value = null }

function toggleAllTasks() {
  allPaused.value = !allPaused.value
  tasks.value = tasks.value.map(t => {
    if (t.status === 'downloading') return { ...t, status: 'paused' as const, speed: 0 }
    if (t.status === 'paused') return { ...t, status: 'downloading' as const, speed: Math.floor(Math.random() * 1024) + 512 }
    return t
  })
}

function typeEmoji(t: string) { return { ebook: '📖', video: '🎬', audio: '🎵', document: '📄' }[t] || '📄' }
function typeIconClass(t: string) { return { video: 'ic-blue', ebook: 'ic-amber', audio: 'ic-purple' }[t] || 'ic-purple' }

function statusLabel(s: string) {
  const m: Record<string, string> = { downloading: '下载中', paused: '已暂停', completed: '已完成', failed: '下载失败', waiting: '等待中' }
  return m[s] || s
}

function statusClass(s: string) {
  const m: Record<string, string> = { downloading: 'st-active', paused: 'st-muted', completed: 'st-green', failed: 'st-red', waiting: 'st-amber' }
  return m[s] || 'st-muted'
}

function fmtSpeed(s: number) { return s >= 1024 ? (s / 1024).toFixed(1) + ' MB/s' : s + ' KB/s' }
function fmtSize(mb: number) { return mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb + ' MB' }

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.dl-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 200rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.header-action { font-size: 26rpx; color: #C41E3A; font-weight: 500; }
.header-spacer { width: 64rpx; }

.dl-content { padding: 16rpx 24rpx; }
.section { margin-bottom: 28rpx; }
.section-title { font-size: 26rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 14rpx; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.section-arrow { font-size: 28rpx; color: #BBB; transition: transform 0.2s; display: inline-block; }
.section-arrow.open { transform: rotate(90deg); }

.task-list { }
.task-card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 12rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.task-card.done { display: flex; align-items: center; gap: 14rpx; }

.task-main { display: flex; align-items: flex-start; gap: 14rpx; }
.task-icon { width: 72rpx; height: 72rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; font-size: 32rpx; flex-shrink: 0; }
.ic-blue { background: rgba(22,119,255,0.08); }
.ic-amber { background: rgba(201,169,110,0.1); }
.ic-purple { background: rgba(114,46,209,0.08); }

.task-info { flex: 1; min-width: 0; }
.task-name { font-size: 26rpx; font-weight: 500; color: #333; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.task-source { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }

.task-progress-wrap { margin-top: 12rpx; }
.task-progress-bar { height: 6rpx; background: #F0EDE5; border-radius: 3rpx; overflow: hidden; }
.task-progress-fill { height: 100%; border-radius: 3rpx; transition: width 0.3s; }
.fill-active { background: #C41E3A; }
.fill-pause { background: #BBB; }
.fill-fail { background: #FF4D4F; }

.task-progress-stats { display: flex; justify-content: space-between; align-items: center; margin-top: 6rpx; }
.tps-size { font-size: 20rpx; color: #999; }
.tps-right { display: flex; align-items: center; gap: 8rpx; }
.tps-speed { font-size: 20rpx; color: #C41E3A; }
.tps-status { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 6rpx; }
.st-active { color: #C41E3A; background: rgba(196,30,58,0.06); }
.st-muted { color: #999; background: #F5F1EB; }
.st-green { color: #52C41A; background: rgba(82,196,26,0.06); }
.st-red { color: #FF4D4F; background: rgba(255,77,79,0.06); }
.st-amber { color: #E65100; background: rgba(230,81,0,0.06); }

.task-actions { display: flex; gap: 8rpx; flex-shrink: 0; }
.ta-btn { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx; background: #F5F1EB; color: #666; }
.ta-btn.pause { background: rgba(196,30,58,0.08); color: #C41E3A; }
.ta-btn.del { color: #999; }

.done-actions { display: flex; align-items: center; gap: 8rpx; flex-shrink: 0; position: relative; }
.da-open { padding: 8rpx 20rpx; border-radius: 24rpx; background: #C41E3A; color: #fff; font-size: 22rpx; }
.da-more { width: 48rpx; height: 48rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #999; background: #F5F1EB; }
.menu-popup { position: absolute; right: 0; top: 56rpx; background: #fff; border-radius: 12rpx; padding: 8rpx 16rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.12); z-index: 10; white-space: nowrap; }
.menu-item { font-size: 24rpx; color: #FF4D4F; }
.menu-item.del { color: #FF4D4F; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 120rpx 48rpx; }
.empty-icon { font-size: 88rpx; opacity: 0.3; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 24rpx; }
.empty-btn { padding: 14rpx 40rpx; border-radius: 40rpx; background: #C41E3A; color: #fff; font-size: 26rpx; }

.storage-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 24rpx 28rpx; background: rgba(255,255,255,0.95); backdrop-filter: blur(12rpx); border-top: 1px solid #E8E0D5; }
.storage-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; }
.si-label { font-size: 24rpx; color: #333; font-weight: 500; }
.si-val { font-size: 24rpx; color: #999; }
.storage-bar-track { height: 8rpx; background: #F0EDE5; border-radius: 4rpx; overflow: hidden; display: flex; }
.sb-seg { height: 100%; }
.sb-video { background: #1677FF; }
.sb-ebook { background: #C9A96E; }
.sb-audio { background: #722ED1; }
.storage-legend { display: flex; justify-content: center; gap: 24rpx; margin-top: 10rpx; }
.sl-item { font-size: 20rpx; color: #999; display: flex; align-items: center; gap: 6rpx; }
.sl-dot { width: 12rpx; height: 12rpx; border-radius: 50%; }
.sl-video { background: #1677FF; }
.sl-ebook { background: #C9A96E; }
.sl-audio { background: #722ED1; }
</style>
