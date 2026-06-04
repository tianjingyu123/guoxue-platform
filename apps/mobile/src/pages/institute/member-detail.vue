<template>
  <view class="page">
    <!-- 头部背景 -->
    <view class="profile-header-bg">
      <view class="profile-header-actions">
        <text class="action-btn" @click="goBack">←</text>
        <text class="action-btn" @click="handleShare">↗</text>
      </view>
      <view class="profile-avatar-wrap">
        <image :src="instructor?.avatar" mode="aspectFill" class="profile-avatar" />
        <text v-if="instructor?.verified" class="profile-verified">✓</text>
      </view>
    </view>

    <!-- 基本信息 -->
    <view class="profile-info">
      <text class="profile-name">{{ instructor?.name }}</text>
      <text class="profile-title">{{ instructor?.title }}</text>
      <text v-if="instructor?.level" class="profile-level">{{ getLevelLabel(instructor.level) }}</text>
      <view class="tag-group-center">
        <text v-for="(s, i) in instructor?.specialties" :key="i" class="tag">{{ s }}</text>
      </view>
      <view class="profile-stats">
        <view class="profile-stat"><text class="stat-num">{{ instructor?.studentCount }}</text><text class="stat-label">学员</text></view>
        <view class="stat-divider" />
        <view class="profile-stat"><text class="stat-num">{{ instructor?.courseCount }}</text><text class="stat-label">课程</text></view>
        <view class="stat-divider" />
        <view class="profile-stat"><text class="stat-num">⭐ {{ instructor?.rating?.toFixed(1) }}</text></view>
      </view>
    </view>

    <!-- Tabs -->
    <view class="tabs-bar">
      <view v-for="tab in tabs" :key="tab.key" class="tab" :class="{ 'tab-active': activeTab === tab.key }" @click="activeTab = tab.key">
        <text>{{ tab.label }}</text>
        <view v-if="activeTab === tab.key" class="tab-indicator" />
      </view>
    </view>

    <!-- Tab内容 -->
    <view class="tab-content">
      <!-- 简介 -->
      <view v-if="activeTab === 'intro'" class="intro-section">
        <view class="intro-block">
          <text class="block-title">👥 个人简介</text>
          <text class="block-text">{{ instructor?.introduction }}</text>
        </view>
        <view v-if="instructor?.education?.length" class="intro-block">
          <text class="block-title">🎓 教育背景</text>
          <view v-for="(edu, i) in instructor.education" :key="i" class="timeline-item">{{ edu }}</view>
        </view>
        <view v-if="instructor?.experience?.length" class="intro-block">
          <text class="block-title">💼 从业经历</text>
          <view v-for="(exp, i) in instructor.experience" :key="i" class="timeline-item">{{ exp }}</view>
        </view>
        <view v-if="instructor?.certificates?.length" class="intro-block">
          <text class="block-title">🏆 资质证书</text>
          <view class="cert-list">
            <view v-for="(cert, i) in instructor.certificates" :key="i" class="cert-card">
              <text class="cert-name">{{ cert.name }}</text>
              <text class="cert-meta">{{ cert.issuer }} · {{ cert.year }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 课程 -->
      <view v-if="activeTab === 'courses'" class="courses-section">
        <view v-if="instructor?.featuredCourses?.length" class="course-list">
          <view v-for="course in instructor.featuredCourses" :key="course.id" class="course-card" @click="goCourse(course.id)">
            <image :src="course.cover" mode="aspectFill" class="course-cover" />
            <view class="course-info">
              <text class="course-title">{{ course.title }}</text>
              <view class="course-meta">
                <text>👥 {{ course.studentCount }}人学习</text>
                <text>⭐ {{ course.rating?.toFixed(1) }}</text>
              </view>
            </view>
            <text class="course-arrow">›</text>
          </view>
        </view>
        <view v-else class="empty-state">
          <text>📖</text>
          <text class="empty-text">暂无课程</text>
        </view>
      </view>

      <!-- 评价 -->
      <view v-if="activeTab === 'reviews'" class="reviews-section">
        <view v-if="instructor?.reviews?.length" class="reviews-list">
          <view v-for="review in instructor.reviews" :key="review.id" class="review-card">
            <image :src="review.user.avatar" mode="aspectFill" class="review-avatar" />
            <view class="review-body">
              <view class="review-header">
                <text class="review-user">{{ review.user.name }}</text>
                <view class="review-stars">
                  <text v-for="n in 5" :key="n" :class="n <= review.rating ? 'star-active' : 'star-inactive'">⭐</text>
                </view>
              </view>
              <text class="review-content">{{ review.content }}</text>
              <text class="review-time">{{ review.time }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text>💬</text>
          <text class="empty-text">暂无评价</text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-bar-inner">
        <view class="bottom-action" :class="{ 'bottom-action-active': following }" @click="handleFollow">
          <text class="bottom-action-icon">{{ following ? '❤️' : '🤍' }}</text>
          <text class="bottom-action-label">{{ following ? '已关注' : '关注' }}</text>
        </view>
        <view class="btn btn-outline flex-1" @click="goChat">💬 发起提问</view>
        <view class="btn btn-primary flex-1" @click="goBooking">📅 预约授课</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { instituteApi } from '../../api'

interface InstructorDetail {
  id: number; name: string; avatar: string; title: string; bio?: string
  level: string; verified: boolean; specialties: string[]
  studentCount: number; courseCount: number; reviewCount: number; rating: number
  introduction: string; isFollowing?: boolean
  education?: string[]; experience?: string[]
  certificates?: { name: string; issuer: string; year: string }[]
  featuredCourses?: { id: number; title: string; cover: string; studentCount: number; rating: number }[]
  reviews?: { id: number; user: { name: string; avatar: string }; rating: number; content: string; time: string }[]
}

const instructor = ref<InstructorDetail | null>(null)
const activeTab = ref<'intro' | 'courses' | 'reviews'>('intro')
const following = ref(false)
const followLoading = ref(false)

const tabs = [
  { key: 'intro', label: '简介' },
  { key: 'courses', label: '课程' },
  { key: 'reviews', label: '评价' },
]

onMounted(() => loadInstructor())

function getInstructorId(): number {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  return Number((page as any)?.options?.id || 0)
}

async function loadInstructor() {
  try {
    const id = getInstructorId()
    if (!id) return
    const res = await instituteApi.memberDetail(String(id))
    if (res) {
      instructor.value = res as any
      following.value = (res as any).isFollowing || false
    }
  } catch (e) { console.error(e) }
}

async function handleFollow() {
  if (!instructor.value || followLoading.value) return
  followLoading.value = true
  try {
    const res = await instituteApi.apply({ memberId: instructor.value.id })
    if (res) following.value = !following.value
  } finally { followLoading.value = false }
}

function handleShare() {
  uni.share({ title: instructor.value?.name, content: instructor.value?.title })
}

function getLevelLabel(level: string): string {
  const map: Record<string, string> = { junior: '初级讲师', intermediate: '中级讲师', senior: '高级讲师', master: '特级讲师', academician: '院士' }
  return map[level] || level
}

function goBack() { uni.navigateBack() }
function goChat() { uni.navigateTo({ url: `/pages/message/chat?userId=${instructor.value?.id}` }) }
function goBooking() { uni.navigateTo({ url: `/pages/offline/teacher-booking?teacherId=${instructor.value?.id}` }) }
function goCourse(id: number) { uni.navigateTo({ url: `/pages/course/detail?id=${id}` }) }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 140rpx; }

/* 头部背景 */
.profile-header-bg { position: relative; height: 360rpx; background: linear-gradient(180deg, rgba(196,30,58,0.2), rgba(196,30,58,0.05)); }
.profile-header-actions { position: absolute; top: 0; left: 0; right: 0; z-index: 1; display: flex; justify-content: space-between; padding: 24rpx; }
.action-btn { width: 60rpx; height: 60rpx; border-radius: 50%; background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #2C2C2C; }
.profile-avatar-wrap { position: absolute; bottom: 0; left: 50%; transform: translate(-50%, 50%); }
.profile-avatar { width: 192rpx; height: 192rpx; border-radius: 50%; border: 6rpx solid #F5F0E8; }
.profile-verified { position: absolute; bottom: 0; right: 0; width: 48rpx; height: 48rpx; border-radius: 50%; background: #C41E3A; color: #fff; font-size: 28rpx; text-align: center; line-height: 48rpx; }

/* 基本信息 */
.profile-info { padding: 108rpx 24rpx 0; text-align: center; }
.profile-name { display: block; font-size: 36rpx; font-weight: bold; color: #2C2C2C; }
.profile-title { display: block; font-size: 26rpx; color: #666; margin-top: 8rpx; }
.profile-level { display: inline-block; font-size: 22rpx; padding: 6rpx 20rpx; border-radius: 24rpx; background: rgba(196,30,58,0.1); color: #C41E3A; margin-top: 8rpx; }
.tag-group-center { display: flex; flex-wrap: wrap; justify-content: center; gap: 12rpx; margin-top: 20rpx; }
.tag { font-size: 22rpx; padding: 6rpx 16rpx; background: #F5F0E8; border-radius: 6rpx; color: #666; }
.profile-stats { display: flex; align-items: center; justify-content: center; gap: 24rpx; margin-top: 24rpx; }
.profile-stat { text-align: center; }
.stat-num { display: block; font-size: 34rpx; font-weight: bold; color: #2C2C2C; }
.stat-label { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.stat-divider { width: 1rpx; height: 48rpx; background: #E5E1DB; }

/* Tabs */
.tabs-bar { position: sticky; top: 0; z-index: 10; background: #F5F0E8; border-bottom: 1rpx solid #E5E1DB; display: flex; margin-top: 24rpx; }
.tab { flex: 1; text-align: center; padding: 20rpx 0; font-size: 26rpx; color: #999; position: relative; }
.tab-active { color: #C41E3A; font-weight: 500; }
.tab-indicator { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 80rpx; height: 4rpx; background: #C41E3A; border-radius: 4rpx; }

/* Tab内容 */
.tab-content { padding: 24rpx; }
.intro-section { display: flex; flex-direction: column; gap: 24rpx; }
.intro-block { }
.block-title { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 16rpx; }
.block-text { display: block; font-size: 26rpx; color: #666; line-height: 1.6; }
.timeline-item { font-size: 26rpx; color: #666; padding: 8rpx 0 8rpx 24rpx; border-left: 4rpx solid rgba(196,30,58,0.3); margin-bottom: 8rpx; }
.cert-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.cert-card { padding: 20rpx; background: rgba(245,240,232,0.5); border: 1rpx solid #E5E1DB; border-radius: 12rpx; }
.cert-name { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 4rpx; }
.cert-meta { display: block; font-size: 22rpx; color: #999; }

/* 课程 */
.course-list { display: flex; flex-direction: column; gap: 16rpx; }
.course-card { display: flex; gap: 16rpx; padding: 20rpx; background: #fff; border: 1rpx solid #E5E1DB; border-radius: 12rpx; align-items: center; }
.course-cover { width: 160rpx; height: 120rpx; border-radius: 12rpx; flex-shrink: 0; }
.course-info { flex: 1; min-width: 0; }
.course-title { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 12rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.course-meta { display: flex; gap: 20rpx; font-size: 22rpx; color: #999; }
.course-arrow { font-size: 28rpx; color: #999; }

/* 评价 */
.reviews-list { display: flex; flex-direction: column; gap: 20rpx; }
.review-card { display: flex; gap: 16rpx; padding-bottom: 20rpx; border-bottom: 1rpx solid #E5E1DB; }
.review-avatar { width: 60rpx; height: 60rpx; border-radius: 50%; flex-shrink: 0; }
.review-body { flex: 1; }
.review-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.review-user { font-size: 24rpx; font-weight: 500; color: #2C2C2C; }
.review-stars { display: flex; gap: 4rpx; }
.star-active { font-size: 20rpx; }
.star-inactive { font-size: 20rpx; opacity: 0.3; }
.review-content { display: block; font-size: 26rpx; color: #666; line-height: 1.6; margin-bottom: 8rpx; }
.review-time { display: block; font-size: 22rpx; color: #ccc; }

/* 空状态 */
.empty-state { text-align: center; padding: 80rpx 0; }
.empty-state text:first-child { font-size: 80rpx; display: block; margin-bottom: 16rpx; }
.empty-text { font-size: 26rpx; color: #999; }

/* 底部 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1rpx solid #E5E1DB; padding: 16rpx 24rpx; padding-bottom: env(safe-area-inset-bottom); }
.bottom-bar-inner { display: flex; align-items: center; gap: 16rpx; }
.bottom-action { display: flex; flex-direction: column; align-items: center; gap: 4rpx; width: 100rpx; }
.bottom-action-icon { font-size: 36rpx; }
.bottom-action-label { font-size: 20rpx; color: #999; }
.bottom-action-active .bottom-action-label { color: #C41E3A; }
.flex-1 { flex: 1; }
.btn { display: flex; align-items: center; justify-content: center; padding: 20rpx; border-radius: 12rpx; font-size: 26rpx; font-weight: 500; }
.btn-primary { background: #C41E3A; color: #fff; }
.btn-outline { background: transparent; color: #C41E3A; border: 1rpx solid #C41E3A; }
</style>
