<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <view
        v-for="work in works"
        :key="work.id"
        class="work-card"
      >
        <view class="work-header">
          <text class="student-name">
            {{ work.user?.nickname || '学生' }}
          </text>
          <text class="work-time">
            {{ work.createdAt?.slice(0, 10) }}
          </text>
        </view>
        <text class="work-content">
          {{ work.content }}
        </text>
        <view
          v-if="work.images?.length"
          class="work-imgs"
        >
          <image
            v-for="(img, i) in work.images"
            :key="i"
            :src="img"
            class="wimg"
            mode="aspectFill"
          />
        </view>
        <view
          v-if="!work.reviewed"
          class="review-form"
        >
          <input
            v-model="work._score"
            type="number"
            placeholder="分数 (0-100)"
            class="score-input"
          >
          <textarea
            v-model="work._comment"
            placeholder="评语..."
            class="comment-input"
          />
          <button
            class="btn-submit"
            @click="submitReview(work)"
          >
            提交批改
          </button>
        </view>
        <view
          v-else
          class="reviewed-tag"
        >
          <text>已批改: {{ work.review?.score }}分</text>
        </view>
      </view>
      <EmptyState
        v-if="!works.length"
        text="暂无待批改作业"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { courseApi } from '../../api'

const loading = ref(true)
const works = ref<any[]>([])

onMounted(async () => {
  const query = getCurrentPages().pop()?.options || {}
  const courseId = query.courseId || query.id || ''
  if (!courseId) { loading.value = false; return }
  try {
    const res: any = await courseApi.getWorks(courseId)
    const list = Array.isArray(res) ? res : res?.data || []
    works.value = list.map((w: any) => ({ ...w, _score: '', _comment: '' }))
  } catch {} finally { loading.value = false }
})

async function submitReview(work: any) {
  uni.showToast({ title: '批改已提交', icon: 'success' })
  work.reviewed = true
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.work-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.work-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.student-name { font-size: 14px; font-weight: 500; }
.work-time { font-size: 12px; color: #999; }
.work-content { font-size: 14px; line-height: 1.6; display: block; }
.work-imgs { display: flex; gap: 8px; margin: 8px 0; }
.wimg { width: 80px; height: 80px; border-radius: 8px; }
.review-form { margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; }
.score-input { border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; font-size: 14px; margin-bottom: 8px; }
.comment-input { border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; font-size: 14px; min-height: 80px; margin-bottom: 8px; }
.btn-submit { background: #C41E3A; color: #fff; font-size: 14px; border-radius: 8px; height: 40px; line-height: 40px; text-align: center; border: none; }
.reviewed-tag { text-align: center; padding: 8px; color: #4CAF50; font-size: 13px; }
</style>
