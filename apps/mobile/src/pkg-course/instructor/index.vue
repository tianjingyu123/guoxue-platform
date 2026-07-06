<script setup lang="ts">
/** 讲师详情页 - 从原型 institute/instructors/[id]/page.tsx 迁移 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateTo, goBack } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { instructorApi, getInstructorLevelLabel, getInstructorLevelStyle } from '@/lib/instructor-data'

const loading = ref(true)
const error = ref('')
const instructorId = ref('')

// 讲师详情对象，模板 v-else 裸访问字段，保留 any 避免 null 链式报错
const detail = ref<any>(null)

const tab = ref<'intro' | 'courses' | 'reviews'>('intro')
const following = ref(false)
const levelStyle = computed(() => detail.value ? getInstructorLevelStyle(detail.value.level) : { color: '#999', bg: '#f0f0f0' })

const tabs = [
  { key: 'intro' as const, label: '简介' },
  { key: 'courses' as const, label: '课程' },
  { key: 'reviews' as const, label: '评价' },
]

function toggleFollow() {
  following.value = !following.value
}
function onBooking() {
  navigateTo(`/offline/teacher-booking?instructorId=${detail.value?.id}`)
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await instructorApi.getDetail(instructorId.value)
    detail.value = res
    following.value = res.isFollowing
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  instructorId.value = options?.id || '1'
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
    <!-- 顶栏 -->
    <view class="nav">
      <view class="nav-back" @tap="goBack">
        <app-icon name="chevron-left" :size="44" color="#1F1F1F" />
      </view>
      <text class="nav-title">讲师详情</text>
      <view class="nav-right" />
    </view>

    <!-- 头部信息 -->
    <view class="header">
      <view class="hd-top">
        <view class="avatar-wrap">
          <image lazy-load class="avatar" :src="detail.avatar" mode="aspectFill" />
          <view v-if="detail.verified" class="verified">
            <app-icon name="badge-check" :size="28" color="#C41E3A" />
          </view>
        </view>
        <view class="hd-info">
          <view class="hd-name-row">
            <text class="hd-name">{{ detail.name }}</text>
            <text v-if="detail.level" class="hd-level" :style="{ color: levelStyle.color, background: levelStyle.bg }">
              {{ getInstructorLevelLabel(detail.level) }}
            </text>
          </view>
          <text v-if="detail.title" class="hd-title">{{ detail.title }}</text>
          <view v-if="detail.specialties.length" class="hd-tags">
            <text v-for="s in detail.specialties" :key="s" class="hd-tag">{{ s }}</text>
          </view>
        </view>
      </view>

      <!-- 统计 -->
      <view class="stats">
        <view class="stat">
          <text class="stat-num">{{ detail.followerCount }}</text>
          <text class="stat-label">关注者</text>
        </view>
        <view class="stat">
          <text class="stat-num">{{ detail.courseCount }}</text>
          <text class="stat-label">课程</text>
        </view>
        <view v-if="detail.rating" class="stat">
          <view class="stat-num stat-rating">
            <app-icon name="star" :size="28" color="#F59E0B" :fill="true" />
            <text>{{ detail.rating }}</text>
          </view>
          <text class="stat-label">{{ detail.reviewCount }}条评价</text>
        </view>
      </view>
    </view>

    <!-- Tab -->
    <view class="tabs">
      <view
        v-for="t in tabs"
        :key="t.key"
        class="tab"
        :class="{ 'tab-active': tab === t.key }"
        @tap="tab = t.key"
      >
        <text>{{ t.label }}</text>
      </view>
    </view>

    <!-- 简介 -->
    <view v-if="tab === 'intro'" class="content">
      <view class="section">
        <text class="sec-title">个人简介</text>
        <text class="sec-text">{{ detail.introduction || '这位老师还没有填写简介' }}</text>
      </view>
      <view v-if="detail.education.length" class="section">
        <view class="sec-title sec-title-icon">
          <app-icon name="graduation-cap" :size="30" color="#C41E3A" />
          <text>学术背景</text>
        </view>
        <view class="sec-list">
          <text v-for="(e, i) in detail.education" :key="i" class="sec-li">· {{ e }}</text>
        </view>
      </view>
      <view v-if="detail.experience.length" class="section">
        <view class="sec-title sec-title-icon">
          <app-icon name="briefcase" :size="30" color="#C41E3A" />
          <text>从业经历</text>
        </view>
        <view class="sec-list">
          <text v-for="(e, i) in detail.experience" :key="i" class="sec-li">· {{ e }}</text>
        </view>
      </view>
      <view v-if="detail.certificates.length" class="section">
        <view class="sec-title sec-title-icon">
          <app-icon name="award" :size="30" color="#C41E3A" />
          <text>资质证书</text>
        </view>
        <view class="cert-list">
          <view v-for="(c, i) in detail.certificates" :key="i" class="cert-item">
            <text class="cert-name">{{ c.name }}</text>
            <text class="cert-meta">{{ c.issuer }} · {{ c.year }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 课程 -->
    <view v-else-if="tab === 'courses'" class="content">
      <view v-if="detail.featuredCourses.length" class="course-list">
        <view
          v-for="c in detail.featuredCourses"
          :key="c.id"
          class="course-item"
          @tap="navigateTo(`/courses/${c.id}`)"
        >
          <smart-cover class="course-cover" :src="c.cover" :title="c.title" type="course" />
          <view class="course-info">
            <text class="course-title">{{ c.title }}</text>
            <view class="course-meta">
              <view class="cm-item">
                <app-icon name="users" :size="24" color="#9CA3AF" />
                <text>{{ c.studentCount }}</text>
              </view>
              <view class="cm-item">
                <app-icon name="star" :size="24" color="#F59E0B" :fill="true" />
                <text>{{ c.rating }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="empty">
        <app-icon name="book-open" :size="80" color="#D1D5DB" />
        <text class="empty-txt">暂无公开课程</text>
      </view>
    </view>

    <!-- 评价 -->
    <view v-else class="content">
      <view v-if="detail.reviews.length" class="review-list">
        <view v-for="r in detail.reviews" :key="r.id" class="review-item">
          <view class="rv-head">
            <image lazy-load class="rv-avatar" :src="r.user.avatar" mode="aspectFill" />
            <view class="rv-meta">
              <text class="rv-name">{{ r.user.name }}</text>
              <view class="rv-stars">
                <app-icon
                  v-for="i in 5"
                  :key="i"
                  name="star"
                  :size="22"
                  :color="i <= r.rating ? '#F59E0B' : '#E5E7EB'"
                  :fill="i <= r.rating"
                />
              </view>
            </view>
            <text class="rv-time">{{ r.time }}</text>
          </view>
          <text class="rv-content">{{ r.content }}</text>
        </view>
      </view>
      <view v-else class="empty">
        <app-icon name="star" :size="80" color="#D1D5DB" />
        <text class="empty-txt">暂无评价</text>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="footer">
      <view class="ft-follow" :class="{ 'ft-follow-active': following }" @tap="toggleFollow">
        <app-icon name="heart" :size="32" :color="following ? '#C41E3A' : '#6B7280'" :fill="following" />
        <text>{{ following ? '已关注' : '关注' }}</text>
      </view>
      <view class="ft-book" @tap="onBooking">
        <app-icon name="calendar" :size="32" color="#ffffff" />
        <text>预约授课</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #F5F5F5;
  padding-bottom: 140rpx;
}

/* 顶栏 */
.nav {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 24rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #EBEBEB;
}
.nav-back { width: 56rpx; height: 56rpx; display: flex; align-items: center; }
.nav-title { flex: 1; text-align: center; font-size: 34rpx; font-weight: 600; color: #1F1F1F; }
.nav-right { width: 56rpx; }

/* 头部 */
.header { background: #ffffff; padding: 32rpx 32rpx 28rpx; }
.hd-top { display: flex; gap: 28rpx; }
.avatar-wrap { position: relative; flex-shrink: 0; }
.avatar { width: 144rpx; height: 144rpx; border-radius: 50%; background: #F0F0F0; }
.verified {
  position: absolute; right: -4rpx; bottom: -4rpx;
  width: 40rpx; height: 40rpx; border-radius: 50%;
  background: #ffffff; display: flex; align-items: center; justify-content: center;
}
.hd-info { flex: 1; min-width: 0; }
.hd-name-row { display: flex; align-items: center; gap: 12rpx; }
.hd-name { font-size: 40rpx; font-weight: 700; color: #1F1F1F; }
.hd-level { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 6rpx; }
.hd-title { font-size: 26rpx; color: #6B7280; margin-top: 6rpx; display: block; }
.hd-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 16rpx; }
.hd-tag { font-size: 20rpx; padding: 4rpx 14rpx; background: #F3F4F6; color: #4B5563; border-radius: 8rpx; }

/* 统计 */
.stats {
  display: flex; margin-top: 28rpx; padding: 24rpx;
  background: #FAFAFA; border-radius: 16rpx;
}
.stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.stat-num { font-size: 34rpx; font-weight: 700; color: var(--brand); }
.stat-rating { display: flex; align-items: center; gap: 4rpx; }
.stat-label { font-size: 20rpx; color: #9CA3AF; }

/* Tab */
.tabs {
  position: sticky; top: 88rpx; z-index: 10;
  display: flex; background: #ffffff; border-bottom: 1rpx solid #EBEBEB; margin-top: 16rpx;
}
.tab {
  flex: 1; text-align: center; padding: 26rpx 0;
  font-size: 28rpx; color: #9CA3AF;
  border-bottom: 4rpx solid transparent;
}
.tab-active { color: var(--brand); font-weight: 600; border-bottom-color: var(--brand); }

/* 内容 */
.content { padding: 28rpx 32rpx; }
.section { margin-bottom: 36rpx; }
.sec-title { font-size: 30rpx; font-weight: 600; color: #1F1F1F; margin-bottom: 16rpx; display: block; }
.sec-title-icon { display: flex; align-items: center; gap: 10rpx; }
.sec-text { font-size: 27rpx; line-height: 1.7; color: #6B7280; }
.sec-list { display: flex; flex-direction: column; gap: 10rpx; }
.sec-li { font-size: 27rpx; color: #6B7280; line-height: 1.5; }
.cert-list { display: flex; flex-direction: column; gap: 14rpx; }
.cert-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18rpx 22rpx; background: #FAFAFA; border-radius: 12rpx;
}
.cert-name { font-size: 27rpx; color: #1F1F1F; }
.cert-meta { font-size: 22rpx; color: #9CA3AF; }

/* 课程 */
.course-list { display: flex; flex-direction: column; gap: 20rpx; }
.course-item {
  display: flex; gap: 20rpx; padding: 20rpx;
  background: #ffffff; border: 1rpx solid #EFEFEF; border-radius: 16rpx;
}
.course-cover { width: 160rpx; height: 120rpx; border-radius: 12rpx; flex-shrink: 0; background: #F0F0F0; }
.course-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.course-title {
  font-size: 28rpx; color: #1F1F1F; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.course-meta { display: flex; gap: 28rpx; margin-top: auto; }
.cm-item { display: flex; align-items: center; gap: 6rpx; font-size: 22rpx; color: #9CA3AF; }

/* 评价 */
.review-list { display: flex; flex-direction: column; gap: 20rpx; }
.review-item { padding: 24rpx; background: #ffffff; border: 1rpx solid #EFEFEF; border-radius: 16rpx; }
.rv-head { display: flex; align-items: center; gap: 16rpx; }
.rv-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: #F0F0F0; }
.rv-meta { flex: 1; }
.rv-name { font-size: 27rpx; font-weight: 500; color: #1F1F1F; }
.rv-stars { display: flex; gap: 2rpx; margin-top: 4rpx; }
.rv-time { font-size: 20rpx; color: #9CA3AF; }
.rv-content { font-size: 26rpx; color: #6B7280; line-height: 1.6; margin-top: 16rpx; display: block; }

/* 空状态 */
.empty { display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 96rpx 0; }
.empty-txt { font-size: 26rpx; color: #9CA3AF; }

/* 底部操作栏 */
.footer {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
  display: flex; gap: 24rpx; padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #ffffff; border-top: 1rpx solid #EBEBEB;
}
.ft-follow {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2rpx;
  width: 140rpx; height: 88rpx; border: 1rpx solid #E5E7EB; border-radius: 16rpx;
  font-size: 22rpx; color: #6B7280;
}
.ft-follow-active { border-color: var(--brand); color: var(--brand); }
.ft-book {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 10rpx;
  height: 88rpx; background: var(--brand); border-radius: 16rpx;
  font-size: 30rpx; font-weight: 600; color: #ffffff;
}

/* 加载 / 错误 */
.loading-wrap, .error-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.loading-text, .error-text { font-size: 28rpx; color: var(--text-soft); }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
