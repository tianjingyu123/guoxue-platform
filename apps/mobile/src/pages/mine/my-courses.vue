<template>
  <view class="page">
    <view class="page-header">
      <text class="page-title">
        我的课程
      </text>
    </view>

    <view
      v-if="loading && courses.length === 0"
      class="skeleton-list"
    >
      <view
        v-for="i in 3"
        :key="i"
        class="course-card-skeleton"
      >
        <view class="sk-cover" />
        <view class="sk-body">
          <view class="sk-line w80" /><view class="sk-line w50" />
        </view>
      </view>
    </view>

    <view
      v-else-if="courses.length > 0"
      class="course-list"
    >
      <view
        v-for="item in courses"
        :key="item.orderId || item.course?.id"
        class="course-card"
        @click="goDetail(item.course)"
      >
        <view class="card-cover">
          <image
            v-if="item.course?.cover"
            :src="item.course.cover"
            class="cover-img"
            mode="aspectFill"
          />
          <view
            v-else
            class="cover-plc"
          >
            <text>📚</text>
          </view>
        </view>
        <view class="card-body">
          <text class="card-title">
            {{ item.course?.title || '未知课程' }}
          </text>
          <text class="card-type">
            {{ typeLabel(item.course?.type) }}
          </text>
          <view class="card-meta">
            <text
              v-if="item.remainingDays !== null"
              class="meta-expiry"
              :class="{ warning: item.remainingDays <= 3 }"
            >
              {{ item.remainingDays > 0 ? '剩余' + item.remainingDays + '天' : '已过期' }}
            </text>
            <text
              v-else
              class="meta-expiry permanent"
            >
              永久有效
            </text>
            <text class="meta-paid">
              {{ item.paidAt ? new Date(item.paidAt).toLocaleDateString() : '' }} 购买
            </text>
          </view>
        </view>
        <text class="card-arrow">
          ›
        </text>
      </view>
    </view>

    <EmptyState
      v-else
      icon="📚"
      text="还没有购买任何课程"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { courseApi } from '@/api'
import EmptyState from '@/components/EmptyState.vue'

const courses = ref<any[]>([])
const loading = ref(false)

const typeLabels: Record<string, string> = { VIDEO: '视频', AUDIO: '音频', TEXT: '文本', EBOOK: '电子书', COMBO: '组合' }
function typeLabel(t?: string) { return typeLabels[t || ''] || t || '-' }

onMounted(() => fetchCourses())

async function fetchCourses() {
  loading.value = true
  try {
    const res = await courseApi.myCourses(1, 50)
    courses.value = res.courses || res.list || res.items || []
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goDetail(course: any) {
  if (course?.id) {
    uni.navigateTo({ url: `/pages/courses/course-detail?id=${course.id}` })
  }
}
</script>

<style scoped>
.page { padding: 12px; background: #F5F0E8; min-height: 100vh; }
.page-header { margin-bottom: 12px; }
.page-title { font-size: 20px; font-weight: bold; color: #C41E3A; }

.course-list { display: flex; flex-direction: column; gap: 10px; }
.course-card {
  display: flex; align-items: center; gap: 12px;
  background: #fff; border-radius: 10px; padding: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
.course-card:active { transform: scale(0.985); }

.card-cover { width: 80px; height: 56px; border-radius: 6px; overflow: hidden; flex-shrink: 0; }
.cover-img { width: 100%; height: 100%; }
.cover-plc { width: 100%; height: 100%; background: #E8E0D5; display: flex; align-items: center; justify-content: center; font-size: 24px; }

.card-body { flex: 1; min-width: 0; }
.card-title { font-size: 15px; font-weight: 600; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.card-type { font-size: 11px; color: #999; }
.card-meta { display: flex; gap: 10px; margin-top: 4px; }
.meta-expiry { font-size: 11px; color: #2e7d32; background: #e8f5e9; padding: 1px 8px; border-radius: 4px; }
.meta-expiry.warning { color: #C41E3A; background: #fdf5f0; }
.meta-expiry.permanent { color: #2e7d32; background: #e8f5e9; }
.meta-paid { font-size: 11px; color: #bbb; }
.card-arrow { font-size: 18px; color: #ccc; flex-shrink: 0; }

.skeleton-list { display: flex; flex-direction: column; gap: 10px; }
.course-card-skeleton { display: flex; gap: 12px; background: #fff; border-radius: 10px; padding: 12px; }
.sk-cover { width: 80px; height: 56px; border-radius: 6px; background: #E8E0D5; animation: shimmer 1.5s infinite; }
.sk-body { flex: 1; display: flex; flex-direction: column; gap: 6px; padding-top: 4px; }
.sk-line { height: 12px; border-radius: 4px; background: #E8E0D5; animation: shimmer 1.5s infinite; }
.w80 { width: 80%; } .w50 { width: 50%; }
@keyframes shimmer { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
</style>
