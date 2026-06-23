<script setup lang="ts">
/** 课程学习中心页 - 从原型 app/courses/[id]/learn/page.tsx 迁移 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateTo, goBack } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import { courseApi, type LearnChapter, type LearnLesson } from '@/lib/course-data'

const loading = ref(true)
const error = ref('')
const courseId = ref('')

const course = ref<any>(null)
const progress = ref<any>(null)
const chapters = ref<any[]>([])
const notes = ref<any[]>([])
const questions = ref<any[]>([])

type TabKey = 'catalog' | 'notes' | 'questions'
const activeTab = ref<TabKey>('catalog')
const expanded = ref<Record<string, boolean>>({ c1: true, c2: true })
const showAskModal = ref(false)
const askContent = ref('')

// 进度环参数
const ringSize = 80
const ringStroke = 6
const ringRadius = (ringSize - ringStroke) / 2
const ringCircumference = ringRadius * 2 * Math.PI
const ringOffset = computed(() => ringCircumference - ((progress.value?.progressPercent ?? 0) / 100) * ringCircumference)

const tabs = computed(() => [
  { id: 'catalog' as TabKey, label: '目录', icon: 'book-open', count: chapters.value.length },
  { id: 'notes' as TabKey, label: '笔记', icon: 'file-text', count: notes.value.length },
  { id: 'questions' as TabKey, label: '问答', icon: 'message-circle', count: questions.value.length },
])

function toggleChapter(id: string) { expanded.value[id] = !expanded.value[id] }
function chapterDone(c: LearnChapter) { return c.lessons.filter((l) => l.isCompleted).length }
function onLessonClick(lessonId: string) { navigateTo(`/courses/${course.value?.id}/player?lesson=${lessonId}`) }
function fmtTimestamp(s: number) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}` }
function fmtStudyTime(min: number) { return `${Math.floor(min / 60)}小时${min % 60}分钟` }
function submitQuestion() {
  if (!askContent.value.trim()) return
  uni.showToast({ title: '问题已提交', icon: 'success' })
  askContent.value = ''
  showAskModal.value = false
}
function lessonIcon(chapter: LearnChapter, lesson: LearnLesson) {
  if (lesson.isCompleted) return { name: 'check-circle', color: '#C41E3A' }
  if (!chapter.isFree && !lesson.isFree) return { name: 'lock', color: '#999999' }
  return { name: 'play', color: '#666666' }
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await courseApi.getLearnData(courseId.value)
    course.value = res.course
    progress.value = res.progress
    chapters.value = res.chapters
    notes.value = res.notes
    questions.value = res.questions
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((options: any) => {
  courseId.value = options?.id || '1'
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <!-- Loading -->
  <view v-if="loading" class="loading-wrap">
    <text class="loading-text">加载中...</text>
  </view>
  <!-- Error -->
  <view v-else-if="error" class="error-wrap">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <!-- Content -->
  <view v-else class="page">
    <!-- 顶部导航 -->
    <view class="topnav">
      <view class="topnav-btn" @tap="goBack">
        <app-icon name="arrow-left" :size="40" color="#2C2C2C" />
      </view>
      <text class="topnav-title">{{ course.title }}</text>
      <view class="topnav-spacer" />
    </view>

    <!-- 课程信息 + 进度环 -->
    <view class="info-card">
      <view class="ring-wrap">
        <!-- #ifndef MP -->
        <view class="ring-svg">
          <view class="ring-bg" />
          <view class="ring-track" :style="{ background: `conic-gradient(#C41E3A ${progress.progressPercent}%, transparent 0)` }" />
          <view class="ring-hole" />
          <text class="ring-pct">{{ progress.progressPercent }}%</text>
        </view>
        <!-- #endif -->
      </view>
      <view class="info-meta">
        <text class="info-title">{{ course.title }}</text>
        <view class="info-inst">
          <image class="info-avatar" :src="course.instructor.avatar" mode="aspectFill" />
          <text class="info-inst-name">{{ course.instructor.name }}</text>
        </view>
        <view class="info-stats">
          <text class="info-stat">已学 {{ progress.completedLessons.length }}/{{ progress.totalLessons }} 节</text>
          <text class="info-dot">·</text>
          <view class="info-stat-time">
            <app-icon name="clock" :size="22" color="#999999" />
            <text class="info-stat">{{ fmtStudyTime(progress.studyTime) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="tabs">
      <view
        v-for="tab in tabs" :key="tab.id"
        class="tab-item" :class="{ active: activeTab === tab.id }"
        @tap="activeTab = tab.id"
      >
        <app-icon :name="tab.icon" :size="28" :color="activeTab === tab.id ? '#C41E3A' : '#666666'" />
        <text class="tab-label">{{ tab.label }}</text>
        <text class="tab-count" :class="{ active: activeTab === tab.id }">{{ tab.count }}</text>
      </view>
    </view>

    <!-- Tab 内容 -->
    <view class="content">
      <!-- 目录 -->
      <view v-if="activeTab === 'catalog'" class="catalog-card">
        <view v-for="chapter in chapters" :key="chapter.id" class="cat-chapter">
          <view class="cat-hdr" @tap="toggleChapter(chapter.id)">
            <view class="cat-hdr-left">
              <view
                class="cat-badge"
                :class="chapterDone(chapter) === chapter.lessons.length ? 'done' : 'partial'"
              >
                <app-icon v-if="chapterDone(chapter) === chapter.lessons.length" name="check-circle" :size="26" color="#C41E3A" />
                <text v-else class="cat-badge-txt">{{ chapterDone(chapter) }}/{{ chapter.lessons.length }}</text>
              </view>
              <view class="cat-meta">
                <text class="cat-title">{{ chapter.title }}</text>
                <text class="cat-sub">{{ chapter.lessons.length }}节 · {{ chapter.duration }}分钟</text>
              </view>
            </view>
            <app-icon :name="expanded[chapter.id] ? 'chevron-up' : 'chevron-down'" :size="36" color="#999999" />
          </view>
          <view v-if="expanded[chapter.id]" class="cat-lessons">
            <view
              v-for="(lesson, idx) in chapter.lessons" :key="lesson.id"
              class="cat-lesson" @tap="onLessonClick(lesson.id)"
            >
              <view class="cat-lesson-ico">
                <app-icon :name="lessonIcon(chapter, lesson).name" :size="28" :color="lessonIcon(chapter, lesson).color" />
              </view>
              <text class="cat-lesson-title" :class="{ completed: lesson.isCompleted }">{{ idx + 1 }}. {{ lesson.title }}</text>
              <view class="cat-lesson-right">
                <text v-if="lesson.isFree" class="cat-free">试看</text>
                <text class="cat-lesson-dur">{{ lesson.duration }}分钟</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 笔记 -->
      <view v-else-if="activeTab === 'notes'" class="notes">
        <view v-if="notes.length" class="notes-list">
          <view v-for="note in notes" :key="note.id" class="note-card">
            <view class="note-hdr">
              <app-icon name="file-text" :size="28" color="#C9A96E" />
              <view class="note-hdr-meta">
                <text class="note-chapter">{{ note.chapterTitle }}</text>
                <text class="note-lesson">{{ note.lessonTitle }}{{ note.timestamp ? ` · ${fmtTimestamp(note.timestamp)}` : '' }}</text>
              </view>
            </view>
            <text class="note-content">{{ note.content }}</text>
            <text class="note-date">{{ note.createdAt }}</text>
          </view>
        </view>
        <view v-else class="empty">
          <app-icon name="file-text" :size="96" color="#E8E3DB" />
          <text class="empty-title">暂无笔记</text>
          <text class="empty-sub">学习时可以随时记录笔记</text>
        </view>
      </view>

      <!-- 问答 -->
      <view v-else class="questions">
        <view class="ask-btn" @tap="showAskModal = true">
          <app-icon name="message-circle" :size="28" color="#C41E3A" />
          <text class="ask-btn-txt">我要提问</text>
        </view>
        <view v-for="q in questions" :key="q.id" class="q-card">
          <image class="q-avatar" :src="q.author.avatar" mode="aspectFill" />
          <view class="q-body">
            <view class="q-hdr">
              <text class="q-name">{{ q.author.name }}</text>
              <text class="q-date">{{ q.createdAt }}</text>
            </view>
            <text class="q-content">{{ q.content }}</text>
            <view class="q-foot">
              <text class="q-chapter">{{ q.chapterTitle }}</text>
              <text class="q-answers">{{ q.answers }}条回答</text>
              <text v-if="q.isAnswered" class="q-answered">已解答</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部继续学习 -->
    <view class="bottom-bar">
      <view class="continue-btn" @tap="onLessonClick(progress.lastLesson.id)">
        <app-icon name="play" :size="36" color="#ffffff" :fill="true" />
        <text class="continue-txt">继续学习 · {{ progress.lastLesson.title }}</text>
      </view>
    </view>

    <!-- 提问弹窗 -->
    <view v-if="showAskModal" class="modal">
      <view class="modal-mask" @tap="showAskModal = false" />
      <view class="sheet">
        <view class="sheet-hdr">
          <text class="sheet-title">我要提问</text>
          <view @tap="showAskModal = false"><app-icon name="x" :size="40" color="#999999" /></view>
        </view>
        <textarea
          v-model="askContent" class="ask-input" placeholder="请输入您的问题..."
          placeholder-class="ask-ph" :maxlength="-1"
        />
        <view class="submit-btn" :class="{ disabled: !askContent.trim() }" @tap="submitQuestion">
          <app-icon name="send" :size="28" color="#ffffff" />
          <text class="submit-txt">提交问题</text>
        </view>
      </view>
    </view>
  </view>

  </view>
  </view>
  </view>
  </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; padding-bottom: 192rpx; }

/* 顶部导航 */
.topnav { position: sticky; top: 0; z-index: 40; background: #fff; border-bottom: 1rpx solid #E8E3DB; height: 88rpx; padding: 0 32rpx; display: flex; align-items: center; }
.topnav-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; }
.topnav-title { flex: 1; text-align: center; font-size: 32rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; padding: 0 16rpx; }
.topnav-spacer { width: 48rpx; }

/* 信息卡 + 进度环 */
.info-card { background: #fff; padding: 32rpx; border-bottom: 1rpx solid #E8E3DB; display: flex; align-items: center; gap: 32rpx; }
.ring-wrap { width: 160rpx; height: 160rpx; flex-shrink: 0; }
.ring-svg { position: relative; width: 160rpx; height: 160rpx; }
.ring-bg { position: absolute; inset: 0; border-radius: 50%; background: #E8E3DB; }
.ring-track { position: absolute; inset: 0; border-radius: 50%; }
.ring-hole { position: absolute; inset: 12rpx; border-radius: 50%; background: #fff; }
.ring-pct { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 32rpx; font-weight: 700; color: #C41E3A; }
.info-meta { flex: 1; min-width: 0; }
.info-title { display: block; font-size: 30rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 8rpx; }
.info-inst { display: flex; align-items: center; gap: 8rpx; margin-bottom: 16rpx; }
.info-avatar { width: 40rpx; height: 40rpx; border-radius: 50%; background: #F2EFEA; }
.info-inst-name { font-size: 24rpx; color: #666; }
.info-stats { display: flex; align-items: center; gap: 12rpx; }
.info-stat { font-size: 22rpx; color: #999; }
.info-dot { font-size: 22rpx; color: #999; }
.info-stat-time { display: flex; align-items: center; gap: 4rpx; }

/* Tabs */
.tabs { background: #fff; border-bottom: 1rpx solid #E8E3DB; position: sticky; top: 88rpx; z-index: 30; display: flex; }
.tab-item { flex: 1; padding: 24rpx 0; display: flex; align-items: center; justify-content: center; gap: 8rpx; border-bottom: 4rpx solid transparent; }
.tab-item.active { border-bottom-color: #C41E3A; }
.tab-label { font-size: 26rpx; font-weight: 500; color: #666; }
.tab-item.active .tab-label { color: #C41E3A; }
.tab-count { font-size: 22rpx; padding: 2rpx 12rpx; border-radius: 999rpx; background: #F5F0E8; color: #666; }
.tab-count.active { background: rgba(196,30,58,0.1); color: #C41E3A; }

.content { padding: 32rpx; }

/* 目录 */
.catalog-card { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.cat-chapter { border-bottom: 1rpx solid #E8E3DB; }
.cat-chapter:last-child { border-bottom: none; }
.cat-hdr { padding: 24rpx 32rpx; display: flex; align-items: center; justify-content: space-between; }
.cat-hdr-left { display: flex; align-items: center; gap: 24rpx; }
.cat-badge { width: 48rpx; height: 48rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cat-badge.done { background: rgba(196,30,58,0.1); }
.cat-badge.partial { background: #E8E3DB; }
.cat-badge-txt { font-size: 20rpx; font-weight: 700; color: #666; }
.cat-title { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.cat-sub { display: block; font-size: 24rpx; color: #999; margin-top: 2rpx; }
.cat-lessons { background: #FAFAFA; padding: 0 32rpx 16rpx; }
.cat-lesson { padding: 20rpx 0; display: flex; align-items: center; gap: 24rpx; border-bottom: 1rpx solid rgba(232,227,219,0.5); }
.cat-lesson:last-child { border-bottom: none; }
.cat-lesson-ico { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cat-lesson-title { flex: 1; font-size: 26rpx; color: #2C2C2C; }
.cat-lesson-title.completed { color: #999; }
.cat-lesson-right { display: flex; align-items: center; gap: 16rpx; flex-shrink: 0; }
.cat-free { font-size: 20rpx; color: #52c41a; background: rgba(82,196,26,0.1); padding: 2rpx 12rpx; border-radius: 6rpx; }
.cat-lesson-dur { font-size: 22rpx; color: #999; }

/* 笔记 */
.notes-list { display: flex; flex-direction: column; gap: 24rpx; }
.note-card { background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.note-hdr { display: flex; align-items: flex-start; gap: 16rpx; margin-bottom: 16rpx; }
.note-hdr-meta { flex: 1; }
.note-chapter { display: block; font-size: 24rpx; color: #C41E3A; }
.note-lesson { display: block; font-size: 22rpx; color: #999; }
.note-content { display: block; font-size: 26rpx; color: #2C2C2C; line-height: 1.6; padding-left: 44rpx; }
.note-date { display: block; font-size: 22rpx; color: #999; margin-top: 16rpx; padding-left: 44rpx; }
.empty { text-align: center; padding: 96rpx 0; }
.empty-title { display: block; font-size: 28rpx; color: #999; margin-top: 24rpx; }
.empty-sub { display: block; font-size: 24rpx; color: #BBB; margin-top: 8rpx; }

/* 问答 */
.questions { display: flex; flex-direction: column; gap: 24rpx; }
.ask-btn { padding: 24rpx 0; background: #fff; border-radius: 24rpx; border: 1rpx dashed #C41E3A; display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.ask-btn-txt { font-size: 26rpx; font-weight: 500; color: #C41E3A; }
.q-card { background: #fff; border-radius: 16rpx; padding: 24rpx; display: flex; align-items: flex-start; gap: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.q-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: #F2EFEA; flex-shrink: 0; }
.q-body { flex: 1; min-width: 0; }
.q-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.q-name { font-size: 24rpx; font-weight: 500; color: #2C2C2C; }
.q-date { font-size: 22rpx; color: #999; }
.q-content { display: block; font-size: 26rpx; color: #2C2C2C; line-height: 1.6; margin-bottom: 16rpx; }
.q-foot { display: flex; align-items: center; gap: 24rpx; }
.q-chapter { font-size: 22rpx; color: #999; }
.q-answers { font-size: 22rpx; color: #C41E3A; }
.q-answered { font-size: 20rpx; color: #fff; background: #52c41a; padding: 2rpx 12rpx; border-radius: 6rpx; }

/* 底部 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E8E3DB; padding: 32rpx 32rpx 64rpx; z-index: 40; }
.continue-btn { width: 100%; height: 88rpx; background: linear-gradient(to right, #C41E3A, #E74C3C); border-radius: 999rpx; display: flex; align-items: center; justify-content: center; gap: 16rpx; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); }
.continue-txt { font-size: 30rpx; font-weight: 700; color: #fff; }

/* 提问弹窗 */
.modal { position: fixed; inset: 0; z-index: 50; }
.modal-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
.sheet { position: absolute; bottom: 0; left: 0; right: 0; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 32rpx 32rpx 64rpx; }
.sheet-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32rpx; }
.sheet-title { font-size: 32rpx; font-weight: 700; color: #2C2C2C; }
.ask-input { width: 100%; height: 256rpx; padding: 24rpx; background: #F5F0E8; border-radius: 16rpx; font-size: 28rpx; color: #2C2C2C; box-sizing: border-box; }
.ask-ph { color: #999; }
.submit-btn { margin-top: 32rpx; height: 88rpx; background: #C41E3A; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; gap: 16rpx; }
.submit-btn.disabled { background: #E8E3DB; }
.submit-txt { font-size: 28rpx; font-weight: 700; color: #fff; }
.submit-btn.disabled .submit-txt { color: #999; }

/* 加载 / 错误 */
.loading-wrap, .error-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.loading-text, .error-text { font-size: 28rpx; color: var(--text-soft); }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
