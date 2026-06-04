<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <view class="course-header">
        <text class="course-title">
          {{ course.title }}
        </text>
        <view class="progress-bar">
          <view
            class="progress-fill"
            :style="{ width: progress + '%' }"
          />
        </view>
        <text class="progress-text">
          学习进度 {{ progress }}%
        </text>
      </view>
      <view class="chapter-list">
        <view
          v-for="(ch, i) in chapters"
          :key="ch.id"
          class="chapter-item"
          @click="goChapter(ch)"
        >
          <view class="ch-num">
            {{ i + 1 }}
          </view>
          <view class="ch-info">
            <text class="ch-title">
              {{ ch.title }}
            </text>
            <text class="ch-duration">
              {{ ch.duration ? ch.duration + '分钟' : '' }}
            </text>
          </view>
          <view class="ch-status">
            <text
              v-if="ch.completed"
              class="status-done"
            >
              ✓
            </text>
            <text
              v-else-if="ch.inProgress"
              class="status-doing"
            >
              学习中
            </text>
            <text
              v-else-if="ch.locked"
              class="status-lock"
            >
              🔒
            </text>
            <text
              v-else
              class="status-play"
            >
              ▶
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import { courseApi } from '../../api'

const loading = ref(true)
const course = ref<any>({})
const chapters = ref<any[]>([])
const progress = ref(0)

onMounted(async () => {
  const query = getCurrentPages().pop()?.options || {}
  const courseId = query.courseId || query.id || ''
  if (!courseId) { loading.value = false; return }
  try {
    const [detail, chs, prog] = await Promise.all([
      courseApi.detail(courseId),
      courseApi.chapters(courseId),
      courseApi.myProgress(courseId),
    ])
    course.value = detail || {}
    chapters.value = Array.isArray(chs) ? chs : chs?.data || chs?.list || []
    progress.value = (prog as any)?.progress || (prog as any)?.percentage || 0
  } catch {} finally { loading.value = false }
})

function goChapter(ch: any) {
  if (ch.locked) { uni.showToast({ title: '请先完成前面章节', icon: 'none' }); return }
  uni.navigateTo({ url: `/pages/courses/course-player?chapterId=${ch.id}` })
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.course-header { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.course-title { font-size: 18px; font-weight: bold; color: #2C2C2C; }
.progress-bar { height: 6px; background: #eee; border-radius: 3px; margin: 12px 0; }
.progress-fill { height: 100%; background: #C41E3A; border-radius: 3px; transition: width 0.3s; }
.progress-text { font-size: 12px; color: #999; }
.chapter-list { background: #fff; border-radius: 12px; overflow: hidden; }
.chapter-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.ch-item:last-child { border-bottom: none; }
.ch-num { width: 28px; height: 28px; border-radius: 50%; background: #F5F0E8; text-align: center; line-height: 28px; font-size: 13px; color: #666; flex-shrink: 0; }
.ch-info { flex: 1; min-width: 0; }
.ch-title { font-size: 14px; color: #2C2C2C; display: block; }
.ch-duration { font-size: 11px; color: #999; }
.ch-status { flex-shrink: 0; font-size: 13px; }
.status-done { color: #4CAF50; }
.status-doing { color: #FF9800; }
.status-lock { font-size: 14px; }
.status-play { color: #C41E3A; }
</style>
