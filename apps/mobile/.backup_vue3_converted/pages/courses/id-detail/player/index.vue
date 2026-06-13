<template>
  <view class="min-h-screen bg-black text-white" @click="resetControlsTimer">
    <!-- 视频播放器 -->
    <view class="relative aspect-video bg-black">
      <video
        ref="videoRef"
        class="w-full h-full"
        :src="content?.videoUrl"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
        @ended="onEnded"
        playsinline
      />

      <!-- 加载骨架 -->
      <view v-if="isLoading" class="absolute inset-0 bg-zinc-900 flex items-center justify-center z-30">
        <view class="w-8 h-8 border-2 border-white/30 border-t-[#C41E3A] rounded-full animate-spin" />
      </view>

      <!-- 播放器控制层 -->
      <view
        :class="[
          'absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 transition-opacity',
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        ]"
      >
        <!-- 顶部导航 -->
        <view class="absolute top-0 left-0 right-0 p-4 flex items-center gap-3" style="padding-top: calc(env(safe-area-inset-top) + 16px)">
          <view class="p-2" @click="saveProgressAction(); goBack()"><text class="text-2xl">←</text></view>
          <view class="flex-1 min-w-0">
            <text class="text-sm font-medium truncate block">{{ content?.title || '加载中...' }}</text>
            <text class="text-xs text-white/60 truncate block">{{ content?.courseTitle }}</text>
          </view>
        </view>

        <!-- 中央播放按钮 -->
        <view
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
          @click.stop="togglePlay"
        >
          <text class="text-3xl">{{ isPlaying ? '⏸' : '▶' }}</text>
        </view>

        <!-- 底部控制栏 -->
        <view class="absolute bottom-0 left-0 right-0 p-4 space-y-2" style="padding-bottom: calc(env(safe-area-inset-bottom) + 16px)">
          <!-- 进度条 -->
          <view class="h-1 bg-white/30 rounded-full cursor-pointer group relative" @click.stop="handleProgressClick">
            <view
              class="h-full bg-primary rounded-full relative transition-all duration-100"
              :style="'width:' + (duration > 0 ? (currentTime / duration) * 100 + '%' : '0%')"
            >
              <view class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </view>
          </view>

          <!-- 控制按钮 -->
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-4">
              <view @click.stop="togglePlay"><text class="text-2xl">{{ isPlaying ? '⏸' : '▶' }}</text></view>
              <view :class="content?.prevLesson ? '' : 'opacity-30'" @click.stop="content?.prevLesson && switchLesson(content.prevLesson.id)">
                <text class="text-xl">⏮</text>
              </view>
              <view :class="content?.nextLesson ? '' : 'opacity-30'" @click.stop="content?.nextLesson && switchLesson(content.nextLesson.id)">
                <text class="text-xl">⏭</text>
              </view>
              <text class="text-xs tabular-nums">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</text>
            </view>

            <view class="flex items-center gap-4">
              <!-- 倍速切换 -->
              <view class="relative">
                <view class="text-xs px-1 py-1" @click.stop="showSpeedMenu = !showSpeedMenu">{{ playbackRate }}x</view>
                <view v-if="showSpeedMenu" class="absolute bottom-full right-0 mb-2 bg-zinc-800 rounded-lg py-1 min-w-[60px] z-20">
                  <view
                    v-for="rate in [0.5, 0.75, 1, 1.25, 1.5, 2]"
                    :key="rate"
                    :class="['px-3 py-1.5 text-xs', playbackRate === rate ? 'text-primary' : 'text-white']"
                    @click.stop="changeSpeed(rate)"
                  >{{ rate }}x</view>
                </view>
              </view>

              <!-- 纯音频模式 -->
              <view
                :class="['p-1 rounded', isAudioMode ? 'bg-primary' : '']"
                @click.stop="toggleAudioMode"
              ><text></text></view>

              <!-- 画中画 -->
              <view
                :class="['p-1 rounded', isPipMode ? 'bg-primary' : '']"
                @click.stop="togglePiP"
              ><text>️</text></view>

              <!-- 静音 -->
              <view @click.stop="toggleMute"><text class="text-lg">{{ isMuted ? '' : '' }}</text></view>

              <!-- 全屏 -->
              <view @click.stop="toggleFullscreen"><text class="text-lg">{{ isFullscreen ? '⛶' : '⛶' }}</text></view>
            </view>
          </view>
        </view>
      </view>

      <!-- 记忆播放提示 -->
      <view
        v-if="showResumeToast"
        class="absolute top-20 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur rounded-lg px-4 py-2 flex items-center gap-3 z-20"
      >
        <text class="text-primary"></text>
        <text class="text-sm">上次看到 {{ formatTime(resumePosition) }}</text>
        <view class="px-3 py-1 bg-primary text-white text-xs rounded-full" @click.stop="handleResume">继续</view>
        <view class="text-white/60 text-xs" @click.stop="showResumeToast = false">从头</view>
      </view>

      <!-- 纯音频模式遮罩 -->
      <view v-if="isAudioMode" class="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center z-10">
        <text class="text-4xl text-primary mb-4"></text>
        <text class="text-white/80 text-sm">纯音频模式</text>
        <text class="text-white/50 text-xs mt-1">已关闭视频画面，节省流量</text>
        <view class="mt-4 px-4 py-2 bg-white/10 rounded-full text-sm" @click="isAudioMode = false">恢复视频</view>
      </view>
    </view>

    <!-- 底部功能区 -->
    <view class="bg-zinc-900">
      <!-- 当前课程信息 -->
      <view class="p-4 border-b border-zinc-800">
        <text class="font-medium mb-1 block">{{ content?.title }}</text>
        <text class="text-sm text-zinc-400">{{ content?.courseTitle }}</text>
      </view>

      <!-- 功能按钮 -->
      <view class="flex border-b border-zinc-800">
        <view class="flex-1 flex items-center justify-center gap-2 py-3 text-sm" @click="showChapterDrawer = true"><text></text><text>目录</text></view>
        <view class="flex-1 flex items-center justify-center gap-2 py-3 text-sm" @click="showNotePanel = true"><text></text><text>笔记</text></view>
        <view class="flex-1 flex items-center justify-center gap-2 py-3 text-sm" @click="showQuestionPanel = true"><text></text><text>提问</text></view>
      </view>

      <!-- 下一课提示 -->
      <view
        v-if="content?.nextLesson"
        class="w-full p-4 flex items-center justify-between"
        hover-class="bg-zinc-800"
        @click="switchLesson(content.nextLesson!.id)"
      >
        <view>
          <text class="text-xs text-zinc-500 mb-1 block">下一课</text>
          <text class="text-sm">{{ content.nextLesson.title }}</text>
        </view>
        <text class="text-zinc-500 text-xl">›</text>
      </view>
    </view>

    <!-- 章节抽屉 -->
    <view v-if="showChapterDrawer" class="fixed inset-0 z-50">
      <view class="absolute inset-0 bg-black/60" @click="showChapterDrawer = false" />
      <view class="absolute right-0 top-0 bottom-0 w-80 bg-zinc-900 overflow-y-auto" style="padding-top: env(safe-area-inset-top)">
        <view class="sticky top-0 bg-zinc-900 p-4 border-b border-zinc-800 flex items-center justify-between z-10">
          <text class="font-medium">课程目录</text>
          <text @click="showChapterDrawer = false" class="p-1">✕</text>
        </view>
        <view class="p-4 space-y-4">
          <view v-for="chapter in chapters" :key="chapter.id">
            <text class="text-sm font-medium text-zinc-400 mb-2 block">{{ chapter.title }}</text>
            <view v-for="lesson in chapter.lessons" :key="lesson.id" class="space-y-1">
              <view
                :class="[
                  'w-full flex items-center gap-3 p-3 rounded-lg transition-colors',
                  lesson.id === activeLessonId ? 'bg-primary/20 text-primary' : 'hover:bg-zinc-800',
                  !lesson.isFree && !chapter.isFree ? 'opacity-50' : ''
                ]"
                @click="!lesson.isFree && !chapter.isFree ? undefined : switchLesson(lesson.id)"
              >
                <text v-if="lesson.isCompleted" class="text-green-500 flex-shrink-0"></text>
                <text v-else-if="!lesson.isFree && !chapter.isFree" class="text-zinc-500 flex-shrink-0"></text>
                <text v-else class="flex-shrink-0 text-xs">▶</text>
                <text class="flex-1 text-sm truncate">{{ lesson.title }}</text>
                <text class="text-xs text-zinc-500 flex-shrink-0">{{ formatTime(lesson.duration) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 笔记面板 -->
    <view v-if="showNotePanel" class="fixed inset-0 z-50">
      <view class="absolute inset-0 bg-black/60" @click="showNotePanel = false" />
      <view class="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-2xl max-h-[70vh] flex flex-col" style="padding-bottom: env(safe-area-inset-bottom)">
        <view class="p-4 border-b border-zinc-800 flex items-center justify-between">
          <text class="font-medium">记笔记</text>
          <text @click="showNotePanel = false" class="p-1">✕</text>
        </view>
        <view class="p-4 flex-1 overflow-y-auto">
          <text class="text-xs text-zinc-500 mb-2 block">当前时间点: {{ formatTime(currentTime) }}</text>
          <textarea
            v-model="noteContent"
            placeholder="写下你的学习笔记..."
            class="w-full h-32 bg-zinc-800 rounded-lg p-3 text-sm resize-none focus:outline-none"
            :style="{ borderColor: noteContent.trim() ? '#C41E3A' : 'transparent', borderWidth: '1px' }"
          />
          <view v-if="notes.length > 0" class="mt-4 space-y-2">
            <text class="text-xs text-zinc-500">我的笔记</text>
            <view v-for="note in notes" :key="note.id" class="bg-zinc-800 rounded-lg p-3">
              <text class="text-xs text-primary mb-1 block">{{ formatTime(note.timestamp || 0) }}</text>
              <text class="text-sm">{{ note.content }}</text>
            </view>
          </view>
        </view>
        <view class="p-4 border-t border-zinc-800">
          <view
            :class="['w-full py-3 rounded-lg font-medium text-center', noteContent.trim() ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-500']"
            @click="submitNote"
          >保存笔记</view>
        </view>
      </view>
    </view>

    <!-- 提问面板 -->
    <view v-if="showQuestionPanel" class="fixed inset-0 z-50">
      <view class="absolute inset-0 bg-black/60" @click="showQuestionPanel = false" />
      <view class="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-2xl" style="padding-bottom: env(safe-area-inset-bottom)">
        <view class="p-4 border-b border-zinc-800 flex items-center justify-between">
          <text class="font-medium">向老师提问</text>
          <text @click="showQuestionPanel = false" class="p-1">✕</text>
        </view>
        <view class="p-4">
          <textarea
            v-model="questionContent"
            placeholder="描述你的问题，老师会尽快回复..."
            class="w-full h-32 bg-zinc-800 rounded-lg p-3 text-sm resize-none focus:outline-none"
          />
        </view>
        <view class="p-4 border-t border-zinc-800">
          <view
            :class="['w-full py-3 rounded-lg font-medium text-center', questionContent.trim() ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-500']"
            @click="submitQuestion"
          >提交问题</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const lessonId = ref('')
const courseId = ref('')

interface ChapterContent {
  id: string
  title: string
  courseId: string
  courseTitle: string
  videoUrl: string
  duration: number
  currentProgress: number
  nextLesson?: { id: string; title: string; chapterId: string }
  prevLesson?: { id: string; title: string; chapterId: string }
}

interface Lesson {
  id: string
  title: string
  duration: number
  isFree: boolean
  isCompleted: boolean
}

interface Chapter {
  id: string
  title: string
  duration: number
  isFree: boolean
  lessons: Lesson[]
}

interface CourseNote {
  id: string
  content: string
  chapterId: string
  chapterTitle: string
  lessonId: string
  lessonTitle: string
  timestamp?: number
  createdAt: string
}

const content = ref<ChapterContent | null>(null)
const chapters = ref<Chapter[]>([])
const isLoading = ref(true)
const isPlaying = ref(false)
const isMuted = ref(false)
const isFullscreen = ref(false)
const isPipMode = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playbackRate = ref(1)
const showControls = ref(true)
const showChapterDrawer = ref(false)
const showNotePanel = ref(false)
const showQuestionPanel = ref(false)
const showSpeedMenu = ref(false)
const noteContent = ref('')
const questionContent = ref('')
const notes = ref<CourseNote[]>([])
const isAudioMode = ref(false)
const showResumeToast = ref(false)
const resumePosition = ref(0)
const activeLessonId = ref('')

let controlsTimer: ReturnType<typeof setTimeout> | null = null
let saveTimer: ReturnType<typeof setInterval> | null = null

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function resetControlsTimer() {
  showControls.value = true
  if (controlsTimer) clearTimeout(controlsTimer)
  if (isPlaying.value) {
    controlsTimer = setTimeout(() => { showControls.value = false }, 3000)
  }
}

onMounted(() => {
  // 获取路由参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  if (currentPage && currentPage.$page) {
    const query = currentPage.$page.options || currentPage.$page.query || {}
    lessonId.value = query.lesson || ''
    courseId.value = query.courseId || ''
  }
  activeLessonId.value = lessonId.value || '1'

  // 加载数据（模拟）
  loadContent()
})

onUnmounted(() => {
  if (controlsTimer) clearTimeout(controlsTimer)
  if (saveTimer) clearInterval(saveTimer)
})

function loadContent() {
  isLoading.value = true
  // 模拟API加载
  setTimeout(() => {
    content.value = {
      id: lessonId.value || '1',
      title: '第一课：八字基础概念',
      courseId: courseId.value || '1',
      courseTitle: '八字命理入门精讲',
      videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
      duration: 1800,
      currentProgress: 300,
      nextLesson: { id: '2', title: '第二课：天干地支', chapterId: 'ch1' },
      prevLesson: undefined
    }
    chapters.value = [
      {
        id: 'ch1', title: '第一章：基础入门', duration: 3600, isFree: true,
        lessons: [
          { id: '1', title: '八字基础概念', duration: 1800, isFree: true, isCompleted: true },
          { id: '2', title: '天干地支详解', duration: 1500, isFree: true, isCompleted: false },
          { id: '3', title: '五行生克关系', duration: 1200, isFree: false, isCompleted: false },
        ]
      },
      {
        id: 'ch2', title: '第二章：进阶应用', duration: 5400, isFree: false,
        lessons: [
          { id: '4', title: '八字排盘方法', duration: 1800, isFree: false, isCompleted: false },
          { id: '5', title: '十神详解', duration: 2000, isFree: false, isCompleted: false },
        ]
      }
    ]
    isLoading.value = false

    // 检查记忆播放
    checkResumeProgress()

    // 重置控制栏定时器
    resetControlsTimer()
  }, 300)
}

function checkResumeProgress() {
  try {
    const saved = uni.getStorageSync(`course_progress_${courseId.value}_${lessonId.value}`)
    if (saved) {
      const progress = JSON.parse(saved)
      if (progress.currentTime > 10 && progress.currentTime < progress.duration - 30) {
        resumePosition.value = progress.currentTime
        showResumeToast.value = true
        setTimeout(() => { showResumeToast.value = false }, 5000)
      }
    }
  } catch (e) {
    // 静默失败
  }
}

function handleResume() {
  showResumeToast.value = false
}

function togglePlay() {
  if (isPlaying.value) {
    if (saveTimer) clearInterval(saveTimer)
    saveTimer = null
  } else {
    saveTimer = setInterval(() => saveProgress(), 30000)
  }
  isPlaying.value = !isPlaying.value
  resetControlsTimer()
}

function toggleMute() {
  isMuted.value = !isMuted.value
}

function onTimeUpdate(e: any) {
  currentTime.value = e.detail?.currentTime || currentTime.value
}

function onLoadedMetadata(e: any) {
  duration.value = e.detail?.duration || 0
  resetControlsTimer()
}

function onEnded() {
  isPlaying.value = false
  saveProgress()
}

function handleProgressClick(e: any) {
  const rect = e.currentTarget?.getBoundingClientRect?.()
  if (!rect) return
  const x = e.detail?.x || e.clientX || 0
  const percent = (x - rect.left) / rect.width
  const newTime = percent * duration.value
  currentTime.value = Math.max(0, Math.min(newTime, duration.value))
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

function togglePiP() {
  isPipMode.value = !isPipMode.value
  uni.showToast({ title: isPipMode.value ? '已进入画中画' : '已退出画中画', icon: 'none' })
}

function toggleAudioMode() {
  isAudioMode.value = !isAudioMode.value
}

function changeSpeed(rate: number) {
  playbackRate.value = rate
  showSpeedMenu.value = false
}

function switchLesson(newLessonId: string) {
  // 检查是否免费
  for (const ch of chapters.value) {
    const lesson = ch.lessons.find(l => l.id === newLessonId)
    if (lesson && !lesson.isFree && !ch.isFree) return
  }

  saveProgress()
  activeLessonId.value = newLessonId
  showChapterDrawer.value = false
  uni.redirectTo({
    url: `/pages/courses/id-detail/player/index?lesson=${newLessonId}&courseId=${courseId.value}`
  })
}

function saveProgress() {
  try {
    uni.setStorageSync(`course_progress_${courseId.value}_${lessonId.value}`, {
      currentTime: currentTime.value,
      duration: duration.value,
      timestamp: Date.now()
    })
  } catch (e) {
    // 静默失败
  }
}

function saveProgressAction() {
  saveProgress()
}

function goBack() {
  uni.navigateBack()
}

function submitNote() {
  if (!noteContent.value.trim() || !content.value) return
  notes.value.unshift({
    id: Date.now().toString(),
    content: noteContent.value,
    chapterId: 'ch1',
    chapterTitle: content.value.title,
    lessonId: content.value.id,
    lessonTitle: content.value.title,
    timestamp: currentTime.value,
    createdAt: new Date().toISOString()
  })
  noteContent.value = ''
  showNotePanel.value = false
  uni.showToast({ title: '笔记已保存', icon: 'success' })
}

function submitQuestion() {
  if (!questionContent.value.trim()) return
  uni.showToast({ title: '问题已提交', icon: 'success' })
  questionContent.value = ''
  showQuestionPanel.value = false
}
</script>

<style scoped>
.group-hover\:opacity-100 {
  opacity: 0;
}
.group:active .group-hover\:opacity-100,
.group:hover .group-hover\:opacity-100 {
  opacity: 1;
}
</style>
