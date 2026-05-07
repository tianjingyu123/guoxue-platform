<template>
  <view class="course-card" @click="goDetail">
    <image v-if="course.cover" :src="course.cover" class="card-cover" mode="aspectFill" />
    <view class="card-overlay" v-if="course.type">
      <text class="type-tag">{{ typeLabel }}</text>
    </view>
    <view class="card-body">
      <view class="card-title">{{ course.title }}</view>
      <view class="card-intro" v-if="course.intro">{{ course.intro }}</view>
      <view class="card-footer">
        <text class="price" :class="{ free: course.price === 0 }">
          {{ course.price && course.price > 0 ? `¥${course.price}` : '免费' }}
        </text>
        <text v-if="course.originalPrice && course.originalPrice > course.price" class="original-price">
          ¥{{ course.originalPrice }}
        </text>
        <text class="student-count">👤 {{ course.studentCount ?? 0 }} 人</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Course {
  id: string
  title: string
  cover?: string
  intro?: string
  type?: string
  price?: number
  originalPrice?: number
  studentCount?: number
}

const props = defineProps<{
  course: Course
}>()

const typeLabel = computed(() => {
  const map: Record<string, string> = {
    video: '视频',
    audio: '音频',
    text: '文本',
  }
  return map[props.course.type ?? ''] || props.course.type
})

function goDetail() {
  uni.navigateTo({
    url: `/pages/courses/course-detail?id=${props.course.id}`
  })
}
</script>

<style scoped>
.course-card {
  background: #fff;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-cover {
  width: 100%;
  height: 150px;
  display: block;
}

.card-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
}

.type-tag {
  font-size: 11px;
  color: #fff;
  background: rgba(139, 69, 19, 0.85);
  padding: 2px 10px;
  border-radius: 10px;
}

.card-body {
  padding: 12px 14px 14px;
}

.card-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-intro {
  font-size: 13px;
  color: #888;
  line-height: 1.5;
  margin: 6px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.price {
  font-size: 18px;
  font-weight: bold;
  color: #e74c3c;
}

.price.free {
  color: #2e7d32;
  font-size: 15px;
}

.original-price {
  font-size: 12px;
  color: #bbb;
  text-decoration: line-through;
}

.student-count {
  margin-left: auto;
  font-size: 12px;
  color: #999;
}
</style>
