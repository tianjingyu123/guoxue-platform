<script setup lang="ts">
/** 课程章节列表页(学习进度) - 从原型 app/courses/[id]/chapters/page.tsx 迁移 */
import { ref, computed } from 'vue'
import { navigateTo, goBack } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import AppSkeleton from '@/components/common/app-skeleton.vue'
import AppError from '@/components/common/app-error.vue'
import AppEmpty from '@/components/common/app-empty.vue'
import { useAsyncData } from '@/composables/useAsyncData'
// @data-needs: 章节学习进度, 参数 courseId, 返回 { progress:CourseProgress, chapters:ProgressChapter[] }
// mock 见 @/lib/course-data.ts，交付时由 Claude Code 替换为真实接口
import { courseProgress as _course, progressChapters as _chapters } from '@/lib/course-data'

const { data: pageData, isLoading, loadError, reload } = useAsyncData(async () => {
  return { course: _course, chapters: _chapters }
})

const course = computed(() => pageData.value?.course ?? {} as any)
const chapters = computed(() => pageData.value?.chapters ?? [])
const isEmpty = computed(() => !pageData.value?.course || chapters.value.length === 0)

const isRefreshing = ref(false)

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
function chapterDone(lessons: { status: string }[]) { return lessons.filter((l) => l.status === 'completed').length }
function onLessonClick(lesson: { id: string; status: string }) {
  if (lesson.status === 'locked') { uni.showToast({ title: '请先完成前面的课程或购买完整课程以解锁', icon: 'none' }); return }
  navigateTo(`/courses/${course.value.id}/player?lesson=${lesson.id}`)
}
function onRefresh() {
  if (isRefreshing.value) return
  isRefreshing.value = true
  setTimeout(() => { isRefreshing.value = false }, 500)
}
</script>

<template>
  <view v-if="isLoading" class="page">
    <view style="padding: 24rpx;">
      <AppSkeleton width="100%" height="120rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="160rpx" radius="24rpx" mb="24rpx" />
      <AppSkeleton width="100%" height="160rpx" radius="24rpx" />
    </view>
  </view>
  <AppError v-else-if="loadError" :desc="loadError" @retry="reload" />
  <AppEmpty v-else-if="isEmpty" title="暂无学习进度" />
  <view v-else class="page">
    <!-- 顶部导航 + 进度条 -->
    <view class="topbar">
      <view class="nav">
        <view
          class="nav-btn"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="40"
            color="#2C2C2C"
          />
        </view>
        <text class="nav-title">
          {{ course.title }}
        </text>
        <view
          class="nav-btn"
          @tap="onRefresh"
        >
          <app-icon
            name="refresh-cw"
            :size="32"
            color="#666666"
            :class="{ spinning: isRefreshing }"
          />
        </view>
      </view>
      <view class="progress-wrap">
        <view class="progress-hdr">
          <text class="progress-label">
            学习进度 <text class="progress-done">
              {{ course.completedLessons }}
            </text>/{{ course.totalLessons }}课时
          </text>
          <text class="progress-pct">
            {{ course.progressPercent }}%
          </text>
        </view>
        <view class="progress-track">
          <view
            class="progress-fill"
            :style="{ width: course.progressPercent + '%' }"
          />
        </view>
      </view>
    </view>

    <!-- 章节列表 -->
    <view class="list">
      <view
        v-for="chapter in chapters"
        :key="chapter.id"
        class="chapter-card"
      >
        <view class="chapter-hdr">
          <text class="chapter-title">
            {{ chapter.title }}
          </text>
          <text
            class="chapter-badge"
            :class="chapterDone(chapter.lessons) === chapter.lessons.length ? 'done' : 'normal'"
          >
            {{ chapterDone(chapter.lessons) }}/{{ chapter.lessons.length }}
          </text>
        </view>
        <view class="lesson-list">
          <view
            v-for="lesson in chapter.lessons"
            :key="lesson.id"
            class="lesson-item"
            :class="{ locked: lesson.status === 'locked' }"
            @tap="onLessonClick(lesson)"
          >
            <!-- 状态图标 -->
            <view
              class="status-ico"
              :class="lesson.status"
            >
              <app-icon
                v-if="lesson.status === 'completed'"
                name="check-circle"
                :size="32"
                color="#16A34A"
              />
              <view
                v-else-if="lesson.status === 'in-progress'"
                class="dot"
              />
              <app-icon
                v-else-if="lesson.status === 'available'"
                name="play"
                :size="26"
                color="#C41E3A"
                :fill="true"
              />
              <app-icon
                v-else
                name="lock"
                :size="26"
                color="#9CA3AF"
              />
            </view>
            <!-- 课时信息 -->
            <view class="lesson-meta">
              <text
                class="lesson-title"
                :class="{ completed: lesson.status === 'completed', active: lesson.status === 'in-progress' }"
              >
                {{ lesson.title }}
              </text>
              <view class="lesson-sub">
                <app-icon
                  name="clock"
                  :size="22"
                  color="#999999"
                />
                <text class="lesson-dur">
                  {{ formatDuration(lesson.duration) }}
                </text>
                <text
                  v-if="lesson.status === 'in-progress'"
                  class="lesson-learning"
                >
                  学习中
                </text>
              </view>
            </view>
            <!-- 右侧播放图标 -->
            <app-icon
              v-if="lesson.status !== 'locked' && lesson.status !== 'completed'"
              name="play"
              :size="28"
              color="#C41E3A"
            />
          </view>
        </view>
      </view>
    </view>
    <view class="safe-bottom" />
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; }

/* 顶部 */
.topbar { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 1rpx solid #E8E3DB; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.nav { height: 112rpx; padding: 0 32rpx; display: flex; align-items: center; gap: 24rpx; }
.nav-btn { width: 64rpx; height: 64rpx; border-radius: 50%; background: #F5F0E8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.nav-title { flex: 1; font-size: 30rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.progress-wrap { padding: 0 32rpx 32rpx; }
.progress-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.progress-label { font-size: 26rpx; color: #666; }
.progress-done { color: #C41E3A; font-weight: 500; }
.progress-pct { font-size: 26rpx; font-weight: 700; color: #C41E3A; }
.progress-track { height: 16rpx; background: #F2EFEA; border-radius: 999rpx; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(to right, #C41E3A, #E85A71); border-radius: 999rpx; transition: width 0.5s; }

/* 列表 */
.list { padding: 32rpx; display: flex; flex-direction: column; gap: 32rpx; }
.chapter-card { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.chapter-hdr { padding: 24rpx 32rpx; border-bottom: 1rpx solid #F2EFEA; display: flex; align-items: center; justify-content: space-between; }
.chapter-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.chapter-badge { font-size: 22rpx; padding: 2rpx 16rpx; border-radius: 999rpx; }
.chapter-badge.done { background: #DCFCE7; color: #16A34A; }
.chapter-badge.normal { background: #F5F0E8; color: #666; }

.lesson-list { display: flex; flex-direction: column; }
.lesson-item { padding: 24rpx 32rpx; display: flex; align-items: center; gap: 24rpx; border-top: 1rpx solid #F5F0E8; }
.lesson-item:first-child { border-top: none; }
.lesson-item.locked { opacity: 0.6; }
.status-ico { width: 64rpx; height: 64rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; }
.status-ico.completed { background: #DCFCE7; }
.status-ico.in-progress { background: rgba(196,30,58,0.1); }
.status-ico.available { background: rgba(196,30,58,0.1); }
.status-ico.locked { background: #F3F4F6; }
.dot { width: 24rpx; height: 24rpx; border-radius: 50%; background: #C41E3A; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.lesson-meta { flex: 1; min-width: 0; }
.lesson-title { display: block; font-size: 26rpx; color: #2C2C2C; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.lesson-title.completed { color: #999; }
.lesson-title.active { color: #C41E3A; font-weight: 500; }
.lesson-sub { display: flex; align-items: center; gap: 8rpx; margin-top: 4rpx; }
.lesson-dur { font-size: 22rpx; color: #999; }
.lesson-learning { font-size: 22rpx; color: #C41E3A; margin-left: 8rpx; }

.safe-bottom { height: 48rpx; }
</style>
