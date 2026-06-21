<template>
  <view class="page">
    <view class="header">
      <view class="nav">
        <view
          class="nav-back"
          @tap="back"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="#2c2c2c"
          />
        </view>
        <text class="nav-title">
          下载管理
        </text>
        <text
          v-if="downloading.length"
          class="nav-action"
          @tap="toggleAll"
        >
          {{ allPaused ? '全部开始' : '全部暂停' }}
        </text>
        <view
          v-else
          class="nav-ph"
        />
      </view>
    </view>

    <view class="body">
      <!-- 下载中 -->
      <view
        v-if="downloading.length"
        class="section"
      >
        <view class="section-title">
          <app-icon
            name="clock"
            :size="28"
            color="#c41e3a"
          /><text>下载中 ({{ downloading.length }})</text>
        </view>
        <view
          v-for="t in downloading"
          :key="t.id"
          class="card"
        >
          <view class="task">
            <view
              class="type-icon"
              :class="t.type"
            >
              <app-icon
                :name="typeIcon(t.type)"
                :size="32"
                :color="typeColor(t.type)"
              />
            </view>
            <view class="task-main">
              <text class="task-name">
                {{ t.name }}
              </text>
              <text class="task-src">
                {{ t.source }}
              </text>
              <view class="progress">
                <view class="bar">
                  <view
                    class="bar-fill"
                    :class="t.status"
                    :style="{ width: t.progress + '%' }"
                  />
                </view>
                <view class="progress-info">
                  <text class="sz">
                    {{ fmtSize(t.downloaded) }} / {{ fmtSize(t.size) }}
                  </text>
                  <view class="status-right">
                    <text
                      v-if="t.status === 'downloading'"
                      class="speed"
                    >
                      {{ fmtSpeed(t.speed) }}
                    </text>
                    <text
                      class="badge"
                      :class="t.status"
                    >
                      {{ statusLabel(t.status) }}
                    </text>
                  </view>
                </view>
              </view>
            </view>
            <view class="actions">
              <view
                class="act-btn"
                :class="{ primary: t.status === 'downloading' }"
                @tap="toggle(t.id)"
              >
                <app-icon
                  :name="t.status === 'downloading' ? 'pause' : 'play'"
                  :size="28"
                  :color="t.status === 'downloading' ? '#c41e3a' : '#2c2c2c'"
                />
              </view>
              <view
                class="act-btn"
                @tap="cancel(t.id)"
              >
                <app-icon
                  name="x"
                  :size="28"
                  color="#8a8276"
                />
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 已完成 -->
      <view
        v-if="completed.length"
        class="section"
      >
        <view
          class="section-title fold"
          @tap="showCompleted = !showCompleted"
        >
          <view class="st-left">
            <app-icon
              name="check-circle"
              :size="28"
              color="#3a9d5d"
            /><text>已完成 ({{ completed.length }})</text>
          </view>
          <app-icon
            :name="showCompleted ? 'chevron-up' : 'chevron-down'"
            :size="28"
            color="#8a8276"
          />
        </view>
        <template v-if="showCompleted">
          <view
            v-for="t in completed"
            :key="t.id"
            class="card"
          >
            <view class="task done">
              <view
                class="type-icon"
                :class="t.type"
              >
                <app-icon
                  :name="typeIcon(t.type)"
                  :size="32"
                  :color="typeColor(t.type)"
                />
              </view>
              <view class="task-main">
                <text class="task-name">
                  {{ t.name }}
                </text>
                <view class="done-meta">
                  <text>{{ fmtSize(t.size) }}</text><text>|</text><text>{{ t.createdAt.split(' ')[0] }}</text>
                </view>
              </view>
              <view
                class="done-btn"
                @tap="open(t)"
              >
                {{ t.type === 'ebook' ? '阅读' : '播放' }}
              </view>
            </view>
          </view>
        </template>
      </view>

      <!-- 空态 -->
      <view
        v-if="!tasks.length"
        class="empty"
      >
        <view class="empty-icon">
          <app-icon
            name="folder-open"
            :size="64"
            color="#b5ad9f"
          />
        </view>
        <text class="empty-text">
          暂无下载任务
        </text>
        <view
          class="empty-btn"
          @tap="navigateTo('/discover')"
        >
          去发现内容
        </view>
      </view>
    </view>

    <!-- 存储空间 -->
    <view class="storage">
      <view class="storage-head">
        <view class="sh-left">
          <app-icon
            name="hard-drive"
            :size="28"
            color="#8a8276"
          /><text>存储空间</text>
        </view>
        <text class="sh-right">
          {{ fmtSize(storage.used) }} / {{ fmtSize(storage.total) }}
        </text>
      </view>
      <view class="storage-bar">
        <view
          class="seg video"
          :style="{ width: pct(storage.videoSize) }"
        />
        <view
          class="seg ebook"
          :style="{ width: pct(storage.ebookSize) }"
        />
        <view
          class="seg audio"
          :style="{ width: pct(storage.audioSize) }"
        />
      </view>
      <view class="legend">
        <view class="lg">
          <view class="dot video" /><text>视频 {{ fmtSize(storage.videoSize) }}</text>
        </view>
        <view class="lg">
          <view class="dot ebook" /><text>电子书 {{ fmtSize(storage.ebookSize) }}</text>
        </view>
        <view class="lg">
          <view class="dot audio" /><text>音频 {{ fmtSize(storage.audioSize) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateTo, navigateBack } from '@/utils/router'

type Status = 'downloading' | 'paused' | 'completed' | 'failed' | 'waiting'
interface Task { id: number; name: string; type: 'ebook' | 'video' | 'audio' | 'document'; size: number; downloaded: number; speed: number; status: Status; progress: number; source: string; createdAt: string }

const tasks = ref<Task[]>([
  { id: 1, name: '八字命理入门精讲 - 第1章', type: 'video', size: 256, downloaded: 168, speed: 1024, status: 'downloading', progress: 65, source: '八字命理入门', createdAt: '2026-05-10 14:30' },
  { id: 2, name: '渊海子平（完整版）', type: 'ebook', size: 48, downloaded: 24, speed: 0, status: 'paused', progress: 50, source: '古籍书库', createdAt: '2026-05-10 14:25' },
  { id: 3, name: '紫微斗数基础课 - 第3章', type: 'video', size: 180, downloaded: 36, speed: 512, status: 'downloading', progress: 20, source: '紫微斗数基础', createdAt: '2026-05-10 14:20' },
  { id: 4, name: '滴天髓精解', type: 'ebook', size: 32, downloaded: 32, speed: 0, status: 'completed', progress: 100, source: '古籍书库', createdAt: '2026-05-09 10:15' },
  { id: 5, name: '八字命理入门精讲 - 第2章', type: 'video', size: 220, downloaded: 220, speed: 0, status: 'completed', progress: 100, source: '八字命理入门', createdAt: '2026-05-09 09:30' },
  { id: 6, name: '风水堪舆讲座音频', type: 'audio', size: 86, downloaded: 86, speed: 0, status: 'completed', progress: 100, source: '风水研习圈', createdAt: '2026-05-08 16:20' },
  { id: 7, name: '奇门遁甲入门 - 第1章', type: 'video', size: 150, downloaded: 0, speed: 0, status: 'failed', progress: 0, source: '奇门遁甲课程', createdAt: '2026-05-10 14:00' },
])
const storage = { used: 846, total: 2048, videoSize: 620, ebookSize: 156, audioSize: 70 }
const showCompleted = ref(true)
const allPaused = ref(false)

const downloading = computed(() => tasks.value.filter(t => ['downloading', 'paused', 'waiting', 'failed'].includes(t.status)))
const completed = computed(() => tasks.value.filter(t => t.status === 'completed'))

function toggle(id: number) {
  const t = tasks.value.find(x => x.id === id); if (!t) return
  if (t.status === 'downloading') { t.status = 'paused'; t.speed = 0 }
  else if (t.status === 'paused' || t.status === 'failed') { t.status = 'downloading'; t.speed = 768 }
}
function cancel(id: number) { tasks.value = tasks.value.filter(t => t.id !== id) }
function toggleAll() {
  allPaused.value = !allPaused.value
  tasks.value.forEach(t => { if (t.status === 'downloading' || t.status === 'paused') { t.status = allPaused.value ? 'paused' : 'downloading'; t.speed = allPaused.value ? 0 : 768 } })
}
function open(t: Task) { navigateTo(t.type === 'ebook' ? '/reader/' + t.id : '/learn/' + t.id) }
function back() { navigateBack('/profile' as any) }
function typeIcon(tp: string) { return tp === 'ebook' ? 'book-open' : tp === 'video' ? 'video' : 'file-text' }
function typeColor(tp: string) { return tp === 'video' ? '#3b82f6' : tp === 'ebook' ? '#d99a2b' : '#8b5cf6' }
function statusLabel(s: Status) { return { downloading: '下载中', paused: '已暂停', completed: '已完成', failed: '下载失败', waiting: '等待中' }[s] }
function fmtSpeed(s: number) { return s >= 1024 ? (s / 1024).toFixed(1) + ' MB/s' : s + ' KB/s' }
function fmtSize(mb: number) { return mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : Math.round(mb) + ' MB' }
function pct(v: number) { return (v / storage.total * 100) + '%' }
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; padding-bottom: 240rpx; }
.header { position: sticky; top: 0; z-index: 50; background: rgba(250,248,245,0.95); border-bottom: 2rpx solid #e8e3db; }
.nav { display: flex; align-items: center; justify-content: space-between; height: 112rpx; padding: 0 32rpx; }
.nav-back { width: 56rpx; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2c2c2c; }
.nav-action { font-size: 28rpx; color: #c41e3a; font-weight: 500; }
.nav-ph { width: 56rpx; }
.body { padding: 32rpx; }
.section { margin-bottom: 48rpx; }
.section-title { display: flex; align-items: center; gap: 16rpx; font-size: 28rpx; font-weight: 500; color: #2c2c2c; margin-bottom: 24rpx; }
.section-title.fold { justify-content: space-between; }
.st-left { display: flex; align-items: center; gap: 16rpx; }
.card { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 20rpx; border: 2rpx solid #f0ece4; }
.task { display: flex; align-items: flex-start; gap: 24rpx; }
.task.done { align-items: center; }
.type-icon { width: 80rpx; height: 80rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.type-icon.video { background: rgba(59,130,246,0.1); }
.type-icon.ebook { background: rgba(217,154,43,0.1); }
.type-icon.audio { background: rgba(139,92,246,0.1); }
.task-main { flex: 1; min-width: 0; }
.task-name { font-size: 28rpx; font-weight: 500; color: #2c2c2c; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; display: block; }
.task-src { font-size: 24rpx; color: #8a8276; margin-top: 4rpx; display: block; }
.progress { margin-top: 16rpx; }
.bar { height: 12rpx; background: #f0ece4; border-radius: 999rpx; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 999rpx; background: #c41e3a; transition: width .3s; }
.bar-fill.failed { background: #d64545; }
.bar-fill.paused { background: #b5ad9f; }
.progress-info { display: flex; align-items: center; justify-content: space-between; margin-top: 8rpx; }
.sz { font-size: 22rpx; color: #8a8276; }
.status-right { display: flex; align-items: center; gap: 12rpx; }
.speed { font-size: 22rpx; color: #c41e3a; }
.badge { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; background: #f0ece4; color: #8a8276; }
.badge.downloading { background: rgba(196,30,58,0.1); color: #c41e3a; }
.badge.completed { background: rgba(58,157,93,0.1); color: #3a9d5d; }
.badge.failed { background: rgba(214,69,69,0.1); color: #d64545; }
.actions { display: flex; align-items: center; gap: 8rpx; flex-shrink: 0; }
.act-btn { width: 64rpx; height: 64rpx; border-radius: 50%; background: #f0ece4; display: flex; align-items: center; justify-content: center; }
.act-btn.primary { background: rgba(196,30,58,0.1); }
.done-meta { display: flex; align-items: center; gap: 12rpx; font-size: 24rpx; color: #8a8276; margin-top: 4rpx; }
.done-btn { padding: 12rpx 28rpx; background: #c41e3a; color: #fff; font-size: 24rpx; font-weight: 500; border-radius: 999rpx; flex-shrink: 0; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.empty-icon { width: 160rpx; height: 160rpx; border-radius: 50%; background: #f0ece4; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.empty-text { font-size: 28rpx; color: #8a8276; }
.empty-btn { margin-top: 32rpx; padding: 20rpx 48rpx; background: #c41e3a; color: #fff; font-size: 28rpx; font-weight: 500; border-radius: 999rpx; }
.storage { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); border-top: 2rpx solid #e8e3db; padding: 32rpx; }
.storage-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.sh-left { display: flex; align-items: center; gap: 16rpx; font-size: 28rpx; color: #2c2c2c; }
.sh-right { font-size: 28rpx; color: #8a8276; }
.storage-bar { height: 16rpx; background: #f0ece4; border-radius: 999rpx; overflow: hidden; display: flex; }
.seg.video { background: #3b82f6; }
.seg.ebook { background: #d99a2b; }
.seg.audio { background: #8b5cf6; }
.legend { display: flex; gap: 32rpx; margin-top: 16rpx; }
.lg { display: flex; align-items: center; gap: 12rpx; }
.dot { width: 16rpx; height: 16rpx; border-radius: 50%; }
.dot.video { background: #3b82f6; }
.dot.ebook { background: #d99a2b; }
.dot.audio { background: #8b5cf6; }
.lg text { font-size: 22rpx; color: #8a8276; }
</style>
