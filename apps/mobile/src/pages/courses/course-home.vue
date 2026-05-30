<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <view class="top-info">
        <view class="progress-ring">
          <text class="ring-value">{{ progress }}%</text>
          <text class="ring-label">学习进度</text>
        </view>
        <view class="course-name">{{ course.title }}</view>
      </view>
      <view class="tabs">
        <view v-for="t in tabs" :key="t.key" class="tab" :class="{ active: activeTab === t.key }" @click="activeTab = t.key">
          <text>{{ t.label }}</text>
        </view>
      </view>
      <view v-if="activeTab === 'chapters'" class="list">
        <view v-for="(ch, i) in chapters" :key="ch.id" class="item" @click="goChapter(ch)">
          <text class="item-num">{{ i + 1 }}</text>
          <view class="item-info"><text class="item-title">{{ ch.title }}</text></view>
          <text v-if="ch.completed">✓</text>
          <text v-else>▶</text>
        </view>
        <EmptyState v-if="!chapters.length" text="暂无章节" />
      </view>
      <view v-if="activeTab === 'notes'" class="list">
        <EmptyState v-if="!notes.length" text="暂无笔记" />
        <view v-for="n in notes" :key="n.id" class="note-card"><text>{{ n.content }}</text></view>
      </view>
      <view v-if="activeTab === 'qa'" class="list">
        <EmptyState v-if="!questions.length" text="暂无问答" />
        <view v-for="q in questions" :key="q.id" class="qa-card">
          <text class="qa-q">{{ q.question }}</text>
          <text v-if="q.answer" class="qa-a">{{ q.answer }}</text>
        </view>
      </view>
    </view>
    <view class="bottom-btn" @click="continueLearn">
      <text>继续学习</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { courseApi } from '../../api'

const loading = ref(true)
const course = ref<any>({})
const chapters = ref<any[]>([])
const notes = ref<any[]>([])
const questions = ref<any[]>([])
const progress = ref(0)
const activeTab = ref('chapters')
const tabs = [{ key: 'chapters', label: '目录' }, { key: 'notes', label: '笔记' }, { key: 'qa', label: '问答' }]

onMounted(async () => {
  const query = getCurrentPages().pop()?.options || {}
  const courseId = query.courseId || query.id || ''
  if (!courseId) { loading.value = false; return }
  try {
    const [detail, chs, prog, qs] = await Promise.all([
      courseApi.detail(courseId),
      courseApi.chapters(courseId),
      courseApi.myProgress(courseId),
      courseApi.getQuestions(courseId),
    ])
    course.value = detail || {}
    chapters.value = Array.isArray(chs) ? chs : chs?.data || []
    questions.value = Array.isArray(qs) ? qs : qs?.data || []
    progress.value = (prog as any)?.progress || 0
  } catch {} finally { loading.value = false }
})

function goChapter(ch: any) { uni.navigateTo({ url: `/pages/courses/course-player?chapterId=${ch.id}` }) }
function continueLearn() { uni.navigateTo({ url: `/pages/courses/course-player?courseId=${course.value.id}` }) }
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 60px; }
.top-info { display: flex; align-items: center; gap: 16px; padding: 16px; background: linear-gradient(135deg, #C41E3A, #8B0000); color: #fff; }
.progress-ring { width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ring-value { font-size: 18px; font-weight: bold; }
.ring-label { font-size: 10px; opacity: 0.8; }
.course-name { font-size: 16px; font-weight: 500; flex: 1; }
.tabs { display: flex; background: #fff; padding: 0 16px; border-bottom: 1px solid #eee; }
.tab { padding: 12px 20px; font-size: 14px; color: #666; border-bottom: 2px solid transparent; }
.tab.active { color: #C41E3A; border-bottom-color: #C41E3A; font-weight: 600; }
.list { padding: 8px 0; }
.item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #fff; border-bottom: 1px solid #f5f5f5; }
.item-num { width: 24px; height: 24px; background: #F5F0E8; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; }
.item-info { flex: 1; }
.item-title { font-size: 14px; }
.note-card, .qa-card { background: #fff; margin: 8px 12px; padding: 12px; border-radius: 10px; }
.qa-q { font-size: 14px; font-weight: 500; display: block; }
.qa-a { font-size: 13px; color: #666; margin-top: 8px; display: block; padding: 8px; background: #F5F0E8; border-radius: 8px; }
.bottom-btn { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 20px 30px; background: #fff; border-top: 1px solid #eee; text-align: center; }
.bottom-btn text { display: inline-block; width: 200px; height: 44px; background: #C41E3A; color: #fff; border-radius: 22px; line-height: 44px; font-size: 15px; }
</style>
