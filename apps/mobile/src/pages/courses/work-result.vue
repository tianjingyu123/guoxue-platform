<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <view class="result-card">
        <text class="score">{{ result.score || 0 }}分</text>
        <text class="grade">{{ result.grade }}</text>
        <text class="comment-title">AI 评语</text>
        <text class="comment">{{ result.comment || result.feedback || '暂无评语' }}</text>
        <view v-if="result.suggestions" class="suggestions">
          <text class="sug-title">改进建议</text>
          <text class="sug-text">{{ result.suggestions }}</text>
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
const result = ref<any>({})

onMounted(async () => {
  const query = getCurrentPages().pop()?.options || {}
  const workId = query.workId || query.id || ''
  if (workId) {
    try {
      const [courseId] = [query.courseId || '']
      if (courseId) {
        const res: any = await courseApi.getWorks(courseId)
        const works = Array.isArray(res) ? res : res?.data || res?.list || []
        const work = works.find((w: any) => w.id === workId)
        result.value = work || {}
      }
    } catch {}
  }
  loading.value = false
})
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.result-card { background: #fff; border-radius: 12px; padding: 20px; text-align: center; }
.score { font-size: 48px; font-weight: bold; color: #C41E3A; display: block; }
.grade { font-size: 16px; color: #C9A96E; margin-top: 4px; display: block; }
.comment-title { font-size: 14px; color: #999; margin-top: 20px; display: block; text-align: left; }
.comment { font-size: 14px; color: #2C2C2C; margin-top: 8px; line-height: 1.8; display: block; text-align: left; }
.suggestions { background: #F5F0E8; border-radius: 8px; padding: 12px; margin-top: 12px; text-align: left; }
.sug-title { font-size: 13px; color: #C9A96E; font-weight: bold; display: block; }
.sug-text { font-size: 13px; color: #666; margin-top: 4px; }
</style>
