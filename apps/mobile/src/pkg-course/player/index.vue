<script setup lang="ts">
/** 课程视频播放页 - 从原型 app/courses/[id]/player/page.tsx 迁移 */
import { ref, computed } from 'vue'
import { navigateTo, goBack } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
// @data-needs: 课时播放内容+目录, 参数 lessonId/courseId, 返回 { content:ChapterContent, chapters:PlayerChapter[] }
// mock 见 @/lib/course-data.ts，交付时由 Claude Code 替换为真实接口(含视频流地址/播放进度)
import {
  playerContent as content, playerChapters as chapters,
  type PlayerChapter, type PlayerChapterLesson,
} from '@/lib/course-data'

// 纯 UI 播放状态
const isPlaying = ref(false)
const isMuted = ref(false)
const isFullscreen = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playbackRate = ref(1)
const showControls = ref(true)
const showChapterDrawer = ref(false)
const showNotePanel = ref(false)
const showQuestionPanel = ref(false)
const showSpeedMenu = ref(false)
const isAudioMode = ref(false)
const isPipMode = ref(false)
const noteContent = ref('')
const questionContent = ref('')
const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]
const currentLessonId = ref('1')

const progressPercent = computed(() => duration.value ? (currentTime.value / duration.value) * 100 : 0)

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
function togglePlay() { isPlaying.value = !isPlaying.value }
function changeSpeed(rate: number) { playbackRate.value = rate; showSpeedMenu.value = false }
function switchLesson(id: string) {
  currentLessonId.value = id
  showChapterDrawer.value = false
  navigateTo(`/courses/${content.courseId}/player?lesson=${id}`)
}
function submitNote() {
  if (!noteContent.value.trim()) return
  uni.showToast({ title: '笔记已保存', icon: 'success' }); noteContent.value = ''; showNotePanel.value = false
}
function submitQuestion() {
  if (!questionContent.value.trim()) return
  uni.showToast({ title: '问题已提交', icon: 'success' }); questionContent.value = ''; showQuestionPanel.value = false
}
function lessonLocked(chapter: PlayerChapter, lesson: PlayerChapterLesson) { return !lesson.isFree && !chapter.isFree }
</script>

<template>
  <view class="page">
    <!-- 视频播放器 -->
    <view class="player">
      <view class="video-placeholder" />

      <!-- 控制层 -->
      <view class="control-layer" :class="{ hidden: !showControls }">
        <!-- 顶部导航 -->
        <view class="ctrl-top">
          <view class="ctrl-back" @tap="goBack">
            <app-icon name="arrow-left" :size="44" color="#ffffff" />
          </view>
          <view class="ctrl-titles">
            <text class="ctrl-title">{{ content.title }}</text>
            <text class="ctrl-subtitle">{{ content.courseTitle }}</text>
          </view>
        </view>

        <!-- 中央播放按钮 -->
        <view class="ctrl-center" @tap="togglePlay">
          <app-icon :name="isPlaying ? 'pause' : 'play'" :size="56" color="#ffffff" :fill="!isPlaying" />
        </view>

        <!-- 底部控制栏 -->
        <view class="ctrl-bottom">
          <view class="progress-track">
            <view class="progress-fill" :style="{ width: progressPercent + '%' }" />
          </view>
          <view class="ctrl-row">
            <view class="ctrl-left">
              <view @tap="togglePlay"><app-icon :name="isPlaying ? 'pause' : 'play'" :size="40" color="#ffffff" /></view>
              <view :class="{ disabled: !content.prevLesson }" @tap="content.prevLesson && switchLesson(content.prevLesson.id)">
                <app-icon name="skip-back" :size="34" color="#ffffff" />
              </view>
              <view :class="{ disabled: !content.nextLesson }" @tap="content.nextLesson && switchLesson(content.nextLesson.id)">
                <app-icon name="skip-forward" :size="34" color="#ffffff" />
              </view>
              <text class="ctrl-time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</text>
            </view>
            <view class="ctrl-rt">
              <view class="speed-wrap">
                <text class="speed-btn" @tap="showSpeedMenu = !showSpeedMenu">{{ playbackRate }}x</text>
                <view v-if="showSpeedMenu" class="speed-menu">
                  <text
                    v-for="r in speeds" :key="r"
                    class="speed-item" :class="{ active: playbackRate === r }"
                    @tap="changeSpeed(r)"
                  >{{ r }}x</text>
                </view>
              </view>
              <view class="ctrl-icon" :class="{ on: isAudioMode }" @tap="isAudioMode = !isAudioMode">
                <app-icon name="headphones" :size="34" color="#ffffff" />
              </view>
              <view class="ctrl-icon" :class="{ on: isPipMode }" @tap="isPipMode = !isPipMode">
                <app-icon name="picture-in-picture-2" :size="34" color="#ffffff" />
              </view>
              <view @tap="isMuted = !isMuted"><app-icon :name="isMuted ? 'volume-x' : 'volume-2'" :size="34" color="#ffffff" /></view>
              <view @tap="isFullscreen = !isFullscreen"><app-icon :name="isFullscreen ? 'minimize' : 'maximize'" :size="34" color="#ffffff" /></view>
            </view>
          </view>
        </view>
      </view>

      <!-- 纯音频模式遮罩 -->
      <view v-if="isAudioMode" class="audio-mask">
        <app-icon name="headphones" :size="96" color="#C41E3A" />
        <text class="audio-title">纯音频模式</text>
        <text class="audio-sub">已关闭视频画面，节省流量</text>
        <view class="audio-resume" @tap="isAudioMode = false"><text class="audio-resume-txt">恢复视频</text></view>
      </view>
    </view>

    <!-- 底部功能区 -->
    <view class="bottom">
      <view class="cur-info">
        <text class="cur-title">{{ content.title }}</text>
        <text class="cur-course">{{ content.courseTitle }}</text>
      </view>
      <view class="func-row">
        <view class="func-btn" @tap="showChapterDrawer = true">
          <app-icon name="list" :size="30" color="#ffffff" /><text class="func-txt">目录</text>
        </view>
        <view class="func-btn" @tap="showNotePanel = true">
          <app-icon name="file-text" :size="30" color="#ffffff" /><text class="func-txt">笔记</text>
        </view>
        <view class="func-btn" @tap="showQuestionPanel = true">
          <app-icon name="message-circle" :size="30" color="#ffffff" /><text class="func-txt">提问</text>
        </view>
      </view>
      <view v-if="content.nextLesson" class="next-lesson" @tap="switchLesson(content.nextLesson.id)">
        <view>
          <text class="next-label">下一课</text>
          <text class="next-title">{{ content.nextLesson.title }}</text>
        </view>
        <app-icon name="chevron-right" :size="36" color="#71717A" />
      </view>
    </view>

    <!-- 章节抽屉 -->
    <view v-if="showChapterDrawer" class="drawer-modal">
      <view class="drawer-mask" @tap="showChapterDrawer = false" />
      <view class="drawer">
        <view class="drawer-hdr">
          <text class="drawer-title">课程目录</text>
          <view @tap="showChapterDrawer = false"><app-icon name="x" :size="36" color="#ffffff" /></view>
        </view>
        <scroll-view scroll-y class="drawer-body">
          <view v-for="chapter in chapters" :key="chapter.id" class="dw-chapter">
            <text class="dw-chapter-title">{{ chapter.title }}</text>
            <view class="dw-lessons">
              <view
                v-for="lesson in chapter.lessons" :key="lesson.id"
                class="dw-lesson"
                :class="{ current: lesson.id === currentLessonId, locked: lessonLocked(chapter, lesson) }"
                @tap="!lessonLocked(chapter, lesson) && switchLesson(lesson.id)"
              >
                <app-icon v-if="lesson.isCompleted" name="check" :size="28" color="#22C55E" />
                <app-icon v-else-if="lessonLocked(chapter, lesson)" name="lock" :size="28" color="#71717A" />
                <app-icon v-else name="play" :size="28" color="#ffffff" />
                <text class="dw-lesson-title">{{ lesson.title }}</text>
                <text class="dw-lesson-dur">{{ formatTime(lesson.duration) }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 笔记面板 -->
    <view v-if="showNotePanel" class="sheet-modal">
      <view class="sheet-mask" @tap="showNotePanel = false" />
      <view class="dark-sheet">
        <view class="dark-sheet-hdr">
          <text class="dark-sheet-title">记笔记</text>
          <view @tap="showNotePanel = false"><app-icon name="x" :size="36" color="#ffffff" /></view>
        </view>
        <view class="dark-sheet-body">
          <text class="note-time">当前时间点: {{ formatTime(currentTime) }}</text>
          <textarea v-model="noteContent" class="dark-input" placeholder="写下你的学习笔记..." placeholder-class="dark-ph" />
        </view>
        <view class="dark-sheet-foot">
          <view class="dark-submit" :class="{ disabled: !noteContent.trim() }" @tap="submitNote">
            <text class="dark-submit-txt">保存笔记</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 提问面板 -->
    <view v-if="showQuestionPanel" class="sheet-modal">
      <view class="sheet-mask" @tap="showQuestionPanel = false" />
      <view class="dark-sheet">
        <view class="dark-sheet-hdr">
          <text class="dark-sheet-title">向老师提问</text>
          <view @tap="showQuestionPanel = false"><app-icon name="x" :size="36" color="#ffffff" /></view>
        </view>
        <view class="dark-sheet-body">
          <textarea v-model="questionContent" class="dark-input" placeholder="描述你的问题，老师会尽快回复..." placeholder-class="dark-ph" />
        </view>
        <view class="dark-sheet-foot">
          <view class="dark-submit" :class="{ disabled: !questionContent.trim() }" @tap="submitQuestion">
            <text class="dark-submit-txt">提交问题</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #000; }

/* 播放器 16:9 */
.player { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; }
.video-placeholder { position: absolute; inset: 0; background: #000; }

/* 控制层 */
.control-layer { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 35%, transparent 65%, rgba(0,0,0,0.8)); transition: opacity 0.3s; }
.control-layer.hidden { opacity: 0; pointer-events: none; }
.ctrl-top { position: absolute; top: 0; left: 0; right: 0; padding: 24rpx; display: flex; align-items: center; gap: 16rpx; }
.ctrl-back { padding: 8rpx; }
.ctrl-titles { flex: 1; min-width: 0; }
.ctrl-title { display: block; font-size: 26rpx; font-weight: 500; color: #fff; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.ctrl-subtitle { display: block; font-size: 22rpx; color: rgba(255,255,255,0.6); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.ctrl-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 112rpx; height: 112rpx; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.ctrl-bottom { position: absolute; bottom: 0; left: 0; right: 0; padding: 24rpx; }
.progress-track { height: 6rpx; background: rgba(255,255,255,0.3); border-radius: 999rpx; margin-bottom: 16rpx; }
.progress-fill { height: 100%; background: #C41E3A; border-radius: 999rpx; }
.ctrl-row { display: flex; align-items: center; justify-content: space-between; }
.ctrl-left { display: flex; align-items: center; gap: 28rpx; }
.ctrl-rt { display: flex; align-items: center; gap: 24rpx; }
.disabled { opacity: 0.3; }
.ctrl-time { font-size: 22rpx; color: #fff; font-variant-numeric: tabular-nums; }
.speed-wrap { position: relative; }
.speed-btn { font-size: 22rpx; color: #fff; }
.speed-menu { position: absolute; bottom: 100%; right: 0; margin-bottom: 16rpx; background: #27272A; border-radius: 16rpx; padding: 8rpx 0; min-width: 96rpx; }
.speed-item { display: block; padding: 12rpx 24rpx; font-size: 22rpx; color: #fff; }
.speed-item.active { color: #C41E3A; }
.ctrl-icon { padding: 6rpx; border-radius: 8rpx; }
.ctrl-icon.on { background: #C41E3A; }

/* 音频遮罩 */
.audio-mask { position: absolute; inset: 0; background: #18181B; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; }
.audio-title { font-size: 26rpx; color: rgba(255,255,255,0.8); margin-top: 24rpx; }
.audio-sub { font-size: 22rpx; color: rgba(255,255,255,0.5); margin-top: 8rpx; }
.audio-resume { margin-top: 24rpx; padding: 16rpx 32rpx; background: rgba(255,255,255,0.1); border-radius: 999rpx; }
.audio-resume-txt { font-size: 26rpx; color: #fff; }

/* 底部功能区 */
.bottom { background: #18181B; }
.cur-info { padding: 24rpx; border-bottom: 1rpx solid #27272A; }
.cur-title { display: block; font-size: 28rpx; font-weight: 500; color: #fff; margin-bottom: 8rpx; }
.cur-course { font-size: 26rpx; color: #A1A1AA; }
.func-row { display: flex; border-bottom: 1rpx solid #27272A; }
.func-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 24rpx 0; }
.func-txt { font-size: 26rpx; color: #fff; }
.next-lesson { padding: 24rpx; display: flex; align-items: center; justify-content: space-between; }
.next-label { display: block; font-size: 22rpx; color: #71717A; margin-bottom: 8rpx; }
.next-title { font-size: 26rpx; color: #fff; }

/* 章节抽屉 */
.drawer-modal { position: fixed; inset: 0; z-index: 50; }
.drawer-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.6); }
.drawer { position: absolute; right: 0; top: 0; bottom: 0; width: 560rpx; background: #18181B; display: flex; flex-direction: column; }
.drawer-hdr { padding: 24rpx; border-bottom: 1rpx solid #27272A; display: flex; align-items: center; justify-content: space-between; }
.drawer-title { font-size: 28rpx; font-weight: 500; color: #fff; }
.drawer-body { flex: 1; padding: 24rpx; }
.dw-chapter { margin-bottom: 32rpx; }
.dw-chapter-title { display: block; font-size: 26rpx; font-weight: 500; color: #A1A1AA; margin-bottom: 16rpx; }
.dw-lessons { display: flex; flex-direction: column; gap: 8rpx; }
.dw-lesson { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; border-radius: 16rpx; }
.dw-lesson.current { background: rgba(196,30,58,0.2); }
.dw-lesson.locked { opacity: 0.5; }
.dw-lesson-title { flex: 1; font-size: 26rpx; color: #fff; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.dw-lesson.current .dw-lesson-title { color: #C41E3A; }
.dw-lesson-dur { font-size: 22rpx; color: #71717A; }

/* 深色面板 */
.sheet-modal { position: fixed; inset: 0; z-index: 50; }
.sheet-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.6); }
.dark-sheet { position: absolute; bottom: 0; left: 0; right: 0; background: #18181B; border-radius: 32rpx 32rpx 0 0; }
.dark-sheet-hdr { padding: 24rpx; border-bottom: 1rpx solid #27272A; display: flex; align-items: center; justify-content: space-between; }
.dark-sheet-title { font-size: 28rpx; font-weight: 500; color: #fff; }
.dark-sheet-body { padding: 24rpx; }
.note-time { display: block; font-size: 22rpx; color: #71717A; margin-bottom: 16rpx; }
.dark-input { width: 100%; height: 256rpx; background: #27272A; border-radius: 16rpx; padding: 24rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.dark-ph { color: #71717A; }
.dark-sheet-foot { padding: 24rpx; border-top: 1rpx solid #27272A; }
.dark-submit { width: 100%; padding: 24rpx 0; background: #C41E3A; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.dark-submit.disabled { opacity: 0.5; }
.dark-submit-txt { font-size: 28rpx; font-weight: 500; color: #fff; }
</style>
