<template>
  <view class="course-card" @click="goDetail">
    <!-- 封面区（比例容器） -->
    <view class="cover-wrap" :style="{ paddingBottom: coverPadding }">
      <image
        v-if="data.cover"
        :src="data.cover"
        class="cover-img"
        mode="aspectFill"
      />
      <!-- 类型标签 -->
      <view class="type-badge">
        <text class="type-text">课程</text>
      </view>
      <!-- 热销/新品 -->
      <view v-if="hotKind" :class="['hot-badge', hotKind === 'hot' ? 'hot-badge--hot' : 'hot-badge--new']">
        <text class="hot-text">{{ hotKind === 'hot' ? '热销' : '新品' }}</text>
      </view>
    </view>

    <!-- 信息区 -->
    <view class="card-body">
      <text class="card-title">{{ data.title }}</text>

      <!-- 价格 -->
      <view class="price-row">
        <text v-if="data.free" class="price-free">免费</text>
        <text v-else class="price-num">{{ data.price ? '¥' + data.price : '' }}</text>
        <text v-if="data.originalPrice && data.originalPrice > (data.price || 0)" class="price-original">¥{{ data.originalPrice }}</text>
      </view>

      <!-- 教师行 -->
      <view v-if="data.teacher" class="teacher-row">
        <image v-if="data.teacherAvatar" :src="data.teacherAvatar" class="teacher-avatar" mode="aspectFill" />
        <text class="teacher-name">{{ data.teacher }}</text>
        <text v-if="data.students" class="students-count">{{ fmtCount(data.students) }}人学</text>
      </view>

      <!-- 无教师时显示统计数据 -->
      <view v-else class="meta-row">
        <text v-if="data.students" class="meta-item">{{ fmtCount(data.students) }}人学</text>
        <text v-if="data.lessons" class="meta-item">{{ data.lessons }}节</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface CourseCardData {
  id: number | string
  title: string
  cover?: string
  coverRatio?: string
  price?: number
  originalPrice?: number
  free?: boolean
  students?: number
  lessons?: number
  rating?: number
  teacher?: string
  teacherAvatar?: string
  tag?: string
}

const props = defineProps<{
  data: CourseCardData
  variant?: string
}>()

const hotKind = computed(() => {
  if (props.data.tag === '热销') return 'hot'
  if (props.data.tag === '新品') return 'new'
  return null
})

const coverPadding = computed(() => {
  const ratio = props.data.coverRatio || '1:1'
  const [w, h] = ratio.split(':').map(Number)
  return (h / w) * 100 + '%'
})

function fmtCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace('.0', '') + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k'
  return String(n)
}

function goDetail() {
  uni.navigateTo({
    url: `/pages/courses/id-detail/index?id=${props.data.id}`
  })
}
</script>

<style scoped>
.course-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  break-inside: avoid;
  margin-bottom: 8px;
}

.cover-wrap {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.cover-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.type-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  padding: 2px 8px;
  border-radius: 4px;
}

.type-text {
  font-size: 10px;
  color: #fff;
}

.hot-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 2px 8px;
  border-radius: 4px;
}

.hot-badge--hot {
  background: #C41E3A;
}

.hot-badge--new {
  background: #C9A96E;
}

.hot-text {
  font-size: 10px;
  color: #fff;
}

.card-body {
  padding: 10px 12px 12px;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: #2C2C2C;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}

.price-num {
  font-size: 16px;
  font-weight: 700;
  color: #C41E3A;
}

.price-free {
  font-size: 14px;
  font-weight: 700;
  color: #52C41A;
}

.price-original {
  font-size: 11px;
  color: #bbb;
  text-decoration: line-through;
}

.teacher-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.teacher-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

.teacher-name {
  font-size: 11px;
  color: #999;
  flex: 1;
}

.students-count {
  font-size: 11px;
  color: #999;
  flex-shrink: 0;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-item {
  font-size: 11px;
  color: #999;
}
</style>
