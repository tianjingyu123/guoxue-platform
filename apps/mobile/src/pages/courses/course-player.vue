<template>
  <view class="page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-icon">⏳</text>
      <text>加载章节内容...</text>
    </view>

    <template v-else-if="chapter">
      <!-- 导航栏 -->
      <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="nav-inner">
          <text class="nav-back" @click="goBack">‹ 返回</text>
          <text class="nav-title">{{ chapter.title }}</text>
          <text class="nav-placeholder" />
        </view>
      </view>

      <!-- 视频播放器 -->
      <view v-if="isVideo" class="video-area">
        <video
          :src="chapter.mediaUrl"
          :controls="true"
          :autoplay="false"
          class="video-player"
          @play="startTracking"
          @ended="onVideoEnd"
          @timeupdate="onTimeUpdate"
        />
      </view>

      <!-- 音频播放器 -->
      <view v-else-if="isAudio" class="audio-area">
        <view class="audio-card">
          <view class="audio-cover" @click="toggleAudio">
            <text class="audio-cover-icon">{{ audioPlaying ? '🔊' : '🎧' }}</text>
          </view>
          <text class="audio-title">{{ chapter.title }}</text>
          <text class="audio-hint">{{ audioPlaying ? '正在播放...' : '点击图标播放' }}</text>
          <view class="audio-progress-bar">
            <view class="audio-progress-fill" :style="{ width: audioProgress + '%' }" />
          </view>
        </view>
      </view>

      <!-- 文本/Markdown 内容区 -->
      <scroll-view v-if="chapter.content" class="content-scroll" scroll-y>
        <view class="content-body">
          <rich-text :nodes="chapter.content" />
        </view>
      </scroll-view>

      <!-- 空内容提示 -->
      <view v-if="!chapter.content && !isVideo && !isAudio" class="empty-content">
        <text class="empty-icon">📄</text>
        <text>本章暂无内容</text>
      </view>

      <!-- 底部操作栏 -->
      <view class="bottom-bar">
        <!-- 章节导航 -->
        <view class="chapter-nav">
          <view class="nav-btn" :class="{ disabled: !hasPrev }" @click="prevChapter">
            <text>‹ 上一章</text>
          </view>
          <view class="chapter-indicator">
            <text>{{ currentIdx + 1 }} / {{ totalChapters }}</text>
          </view>
          <view class="nav-btn" :class="{ disabled: !hasNext }" @click="nextChapter">
            <text>下一章 ›</text>
          </view>
        </view>

        <!-- 进度 + 操作 -->
        <view class="action-row">
          <view class="progress-info">
            <text>学习进度</text>
            <view class="mini-progress">
              <view class="mini-progress-fill" :style="{ width: localProgress + '%' }" />
            </view>
            <text class="progress-text">{{ localProgress }}%</text>
          </view>

          <view class="action-btns">
            <button v-if="isVideo || isAudio" class="mark-btn" @click="markComplete">
              {{ localProgress >= 90 ? '✓ 已完成' : '标记完成' }}
            </button>
            <button v-if="chapter.hasWork" class="work-btn" @click="goSubmitWork">提交作业</button>
          </view>
        </view>
      </view>
    </template>

    <!-- 异常状态 -->
    <view v-else class="error-state">
      <text class="error-icon">⚠️</text>
      <text>内容加载失败</text>
      <button class="retry-btn" @click="fetchChapter">重试</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { courseApi } from '../../api'

const courseId = ref('')
const chapterId = ref('')
const currentIdx = ref(0)
const totalChapters = ref(0)
const chapters = ref<{ id: string; title: string }[]>([])
const chapter = ref<any>(null)
const loading = ref(true)
const localProgress = ref(0)
const statusBarHeight = ref(20)

// 音频播放
const audioCtx = ref<any>(null)
const audioPlaying = ref(false)
const audioProgress = ref(0)

// 媒体类型判断
const isVideo = computed(() => {
  const url = chapter.value?.mediaUrl || ''
  return url && /\.(mp4|m3u8|flv)(\?|$)/i.test(url)
})
const isAudio = computed(() => {
  const url = chapter.value?.mediaUrl || ''
  return url && /\.(mp3|wav|ogg|aac|m4a)(\?|$)/i.test(url)
})
const hasPrev = computed(() => currentIdx.value > 0)
const hasNext = computed(() => currentIdx.value < totalChapters.value - 1)
const progressTimer = ref<any>(null)

onMounted(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
  } catch { /* use default */ }

  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  courseId.value = opts.courseId || ''
  chapterId.value = opts.chapterId || ''
  currentIdx.value = Number(opts.index || 0)
  totalChapters.value = Number(opts.total || 0)
  initPage()
})

onUnmounted(() => {
  stopTracking()
  destroyAudio()
})

async function initPage() {
  // 先拉取章节列表
  try {
    const chData = await courseApi.chapters(courseId.value)
    const raw = Array.isArray(chData) ? chData : chData?.list || []
    chapters.value = raw.map((c: any) => ({ id: c.id, title: c.title }))
    if (totalChapters.value === 0) totalChapters.value = chapters.value.length
  } catch { /* 继续用 URL 传入的 total */ }

  // 用 real chapterId 替换占位符
  if (chapterId.value === 'prev' && currentIdx.value >= 0 && chapters.value.length > 0) {
    chapterId.value = chapters.value[currentIdx.value]?.id || chapterId.value
  } else if (chapterId.value === 'next' && currentIdx.value >= 0 && chapters.value.length > 0) {
    chapterId.value = chapters.value[currentIdx.value]?.id || chapterId.value
  }

  if (chapterId.value && chapterId.value !== 'prev' && chapterId.value !== 'next') {
    fetchChapter()
  }
}

async function fetchChapter() {
  loading.value = true
  try {
    const data = await courseApi.chapterContent(chapterId.value)
    chapter.value = {
      id: data.id,
      title: data.title,
      content: data.content,
      mediaUrl: data.mediaUrl,
      duration: data.duration,
      hasWork: data.hasWork || false,
      workId: data.workId,
    }
    if (data.progress != null) {
      localProgress.value = Math.min(data.progress, 100)
    }
    // 音频自动初始化
    if (data.mediaUrl && /\.(mp3|wav|ogg|aac|m4a)(\?|$)/i.test(data.mediaUrl)) {
      initAudio(data.mediaUrl)
    }
  } catch {
    uni.showToast({ title: '内容加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// ==== 音频播放 ====
function initAudio(url: string) {
  destroyAudio()
  const ctx = uni.createInnerAudioContext()
  ctx.src = url
  ctx.autoplay = false
  ctx.onPlay(() => { audioPlaying.value = true; startTracking() })
  ctx.onPause(() => { audioPlaying.value = false })
  ctx.onStop(() => { audioPlaying.value = false; stopTracking() })
  ctx.onEnded(() => { audioPlaying.value = false; audioProgress.value = 100; onAudioEnd() })
  ctx.onTimeUpdate(() => {
    if (ctx.duration > 0) {
      audioProgress.value = Math.floor((ctx.currentTime / ctx.duration) * 100)
    }
  })
  ctx.onError((err: any) => {
    console.error('音频播放错误:', err)
    audioPlaying.value = false
  })
  audioCtx.value = ctx
}

function toggleAudio() {
  if (!audioCtx.value) return
  if (audioPlaying.value) {
    audioCtx.value.pause()
  } else {
    audioCtx.value.play()
  }
}

function destroyAudio() {
  if (audioCtx.value) {
    audioCtx.value.destroy()
    audioCtx.value = null
  }
  audioPlaying.value = false
  audioProgress.value = 0
}

function onAudioEnd() {
  localProgress.value = 100
  saveProgress()
  stopTracking()
}

// ==== 进度追踪 ====
function startTracking() {
  stopTracking()
  progressTimer.value = setInterval(() => {
    if (localProgress.value < 90) {
      localProgress.value = Math.min(localProgress.value + 5, 90)
    }
    saveProgress()
  }, 10000)
}

function stopTracking() {
  if (progressTimer.value) {
    clearInterval(progressTimer.value)
    progressTimer.value = null
  }
}

function onTimeUpdate(e: any) {
  if (!chapter.value?.duration) return
  const pct = Math.floor((e.detail.currentTime / chapter.value.duration) * 100)
  if (pct > localProgress.value) {
    localProgress.value = Math.min(pct, 100)
  }
}

function onVideoEnd() {
  localProgress.value = 100
  saveProgress()
  stopTracking()
}

async function saveProgress() {
  try {
    await courseApi.updateProgress(chapterId.value, localProgress.value)
  } catch { /* 静默失败 */ }
}

async function markComplete() {
  localProgress.value = 100
  await saveProgress()
  uni.showToast({ title: '已标记完成', icon: 'success' })
  stopTracking()
}

async function prevChapter() {
  if (!hasPrev.value) return
  await saveProgress()
  const idx = currentIdx.value - 1
  const chId = chapters.value[idx]?.id
  if (!chId) return
  destroyAudio()
  uni.redirectTo({
    url: `/pages/courses/course-player?courseId=${courseId.value}&chapterId=${chId}&index=${idx}&total=${totalChapters.value}`,
  })
}

async function nextChapter() {
  if (!hasNext.value) return
  await saveProgress()
  const idx = currentIdx.value + 1
  const chId = chapters.value[idx]?.id
  if (!chId) return
  destroyAudio()
  uni.redirectTo({
    url: `/pages/courses/course-player?courseId=${courseId.value}&chapterId=${chId}&index=${idx}&total=${totalChapters.value}`,
  })
}

function goSubmitWork() {
  uni.navigateTo({
    url: `/pages/courses/work-submit?courseId=${courseId.value}&chapterId=${chapterId.value}`,
  })
}

function goBack() {
  stopTracking()
  saveProgress()
  destroyAudio()
  uni.navigateBack()
}
</script>

<style>
.page {
  background: #1a1a2e;
  min-height: 100vh;
  padding-bottom: 140px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200px;
  color: #999;
  gap: 12px;
}
.loading-icon { font-size: 36px; }

/* 导航栏 */
.nav-bar {
  background: #16213e;
  padding-bottom: 10px;
}
.nav-inner {
  display: flex;
  align-items: center;
  padding: 0 12px;
}
.nav-back {
  font-size: 16px;
  color: #C9A96E;
  padding: 8px 4px;
  width: 70px;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 15px;
  color: #fff;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nav-placeholder { width: 70px; }

/* 视频 */
.video-area {
  width: 100%;
  background: #000;
}
.video-player {
  width: 100%;
  height: 220px;
}

/* 音频 */
.audio-area {
  padding: 40px 24px;
  display: flex;
  justify-content: center;
}
.audio-card {
  text-align: center;
  background: rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 40px 30px;
  border: 1px solid rgba(201, 169, 110, 0.2);
}
.audio-cover-icon {
  font-size: 52px;
}
.audio-title {
  display: block;
  font-size: 16px;
  color: #fff;
  margin-top: 14px;
  font-weight: 500;
}
.audio-hint {
  display: block;
  font-size: 12px;
  color: #888;
  margin-top: 8px;
}
.audio-progress-bar {
  width: 100%;
  height: 3px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  margin-top: 16px;
  overflow: hidden;
}
.audio-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #C9A96E, #C41E3A);
  border-radius: 2px;
  transition: width 0.3s;
}

/* 文本内容 */
.content-scroll {
  height: calc(100vh - 320px);
  padding: 16px;
}
.content-body {
  color: #ddd;
  font-size: 16px;
  line-height: 1.9;
  letter-spacing: 0.5px;
}

/* 空内容 */
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 0;
  color: #666;
  gap: 8px;
}
.empty-icon { font-size: 48px; }

/* 底部栏 */
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #16213e;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,0.08);
  z-index: 100;
}

.chapter-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.nav-btn {
  padding: 6px 14px;
  border-radius: 14px;
  background: rgba(201, 169, 110, 0.15);
  color: #C9A96E;
  font-size: 13px;
}
.nav-btn.disabled {
  opacity: 0.3;
}
.chapter-indicator {
  font-size: 12px;
  color: #888;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.progress-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #999;
}
.mini-progress {
  width: 80px;
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
}
.mini-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #C9A96E, #C41E3A);
  border-radius: 2px;
  transition: width 0.4s;
}
.progress-text {
  color: #C9A96E;
  font-weight: 600;
}

.action-btns {
  display: flex;
  gap: 8px;
}
.mark-btn {
  height: 32px;
  background: #C9A96E;
  color: #1a1a2e;
  border-radius: 16px;
  font-size: 12px;
  border: none;
  padding: 0 16px;
  font-weight: 600;
}
.work-btn {
  height: 32px;
  background: #C41E3A;
  color: #fff;
  border-radius: 16px;
  font-size: 12px;
  border: none;
  padding: 0 14px;
}

/* 异常状态 */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120px 0;
  color: #999;
  gap: 12px;
}
.error-icon { font-size: 48px; }
.retry-btn {
  background: #C9A96E;
  color: #1a1a2e;
  border-radius: 20px;
  padding: 8px 28px;
  font-size: 14px;
  border: none;
  margin-top: 8px;
}
</style>
