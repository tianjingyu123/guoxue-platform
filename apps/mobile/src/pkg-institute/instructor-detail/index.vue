<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">讲师详情</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <!-- 头部信息 -->
      <view class="header">
        <view class="header-row">
          <view class="avatar-wrap">
            <view class="avatar"><app-icon name="user" :size="34" color="#9ca3af" /></view>
            <view v-if="detail.verified" class="avatar-badge">
              <app-icon name="badge-check" :size="18" color="#c41e3a" />
            </view>
          </view>
          <view class="header-info">
            <view class="name-row">
              <text class="name">{{ detail.name }}</text>
              <text class="level" :style="{ color: instructorLevelColor[detail.level].color, background: instructorLevelColor[detail.level].bg }">{{ instructorLevelLabel[detail.level] }}</text>
            </view>
            <text class="title">{{ detail.title }}</text>
            <view class="tags">
              <text v-for="s in detail.specialties" :key="s" class="tag">{{ s }}</text>
            </view>
          </view>
        </view>

        <!-- 统计 -->
        <view class="stats">
          <view class="stat-item">
            <text class="stat-num">{{ detail.studentCount }}</text>
            <text class="stat-label">学员</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ detail.courseCount }}</text>
            <text class="stat-label">课程</text>
          </view>
          <view class="stat-item">
            <view class="stat-rating">
              <app-icon name="star" :size="16" color="#f59e0b" />
              <text class="stat-num">{{ detail.rating }}</text>
            </view>
            <text class="stat-label">{{ detail.reviewCount }}条评价</text>
          </view>
        </view>
      </view>

      <!-- Tab -->
      <view class="tabs">
        <view v-for="t in tabList" :key="t.key" class="tab" @tap="tab = t.key">
          <text class="tab-text" :class="{ 'tab-text-active': tab === t.key }">{{ t.label }}</text>
          <view v-if="tab === t.key" class="tab-line" />
        </view>
      </view>

      <view class="content">
        <!-- 简介 -->
        <view v-if="tab === 'intro'">
          <view class="sec">
            <text class="sec-title">个人简介</text>
            <text class="sec-desc">{{ detail.introduction }}</text>
          </view>
          <view class="sec">
            <view class="sec-title-row">
              <app-icon name="graduation-cap" :size="16" color="#c41e3a" />
              <text class="sec-title-inline">学术背景</text>
            </view>
            <text v-for="(e, i) in detail.education" :key="i" class="li">· {{ e }}</text>
          </view>
          <view class="sec">
            <view class="sec-title-row">
              <app-icon name="briefcase" :size="16" color="#c41e3a" />
              <text class="sec-title-inline">从业经历</text>
            </view>
            <text v-for="(e, i) in detail.experience" :key="i" class="li">· {{ e }}</text>
          </view>
          <view class="sec">
            <view class="sec-title-row">
              <app-icon name="award" :size="16" color="#c41e3a" />
              <text class="sec-title-inline">资质证书</text>
            </view>
            <view v-for="(c, i) in detail.certificates" :key="i" class="cert">
              <text class="cert-name">{{ c.name }}</text>
              <text class="cert-meta">{{ c.issuer }} · {{ c.year }}</text>
            </view>
          </view>
        </view>

        <!-- 课程 -->
        <view v-else-if="tab === 'courses'" class="course-list">
          <view v-for="c in detail.featuredCourses" :key="c.id" class="course-card">
            <view class="course-cover"><app-icon name="book-open" :size="24" color="#d1d5db" /></view>
            <view class="course-info">
              <text class="course-title">{{ c.title }}</text>
              <view class="course-stats">
                <view class="course-stat">
                  <app-icon name="users" :size="12" color="#9ca3af" />
                  <text class="course-stat-text">{{ c.studentCount }}</text>
                </view>
                <view class="course-stat">
                  <app-icon name="star" :size="12" color="#f59e0b" />
                  <text class="course-stat-text">{{ c.rating }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 评价 -->
        <view v-else class="review-list">
          <view v-for="r in detail.reviews" :key="r.id" class="review-card">
            <view class="review-head">
              <view class="review-avatar"><app-icon name="user" :size="16" color="#9ca3af" /></view>
              <view class="review-user">
                <text class="review-name">{{ r.user.name }}</text>
                <view class="review-stars">
                  <app-icon v-for="i in 5" :key="i" name="star" :size="12" :color="i <= r.rating ? '#f59e0b' : '#e5e7eb'" />
                </view>
              </view>
              <text class="review-time">{{ r.time }}</text>
            </view>
            <text class="review-content">{{ r.content }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-safe" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="footer" :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }">
      <view class="follow-btn" :class="{ 'follow-btn-active': following }" @tap="toggleFollow">
        <app-icon name="heart" :size="16" :color="following ? '#c41e3a' : '#4b5563'" />
        <text class="follow-text" :class="{ 'follow-text-active': following }">{{ following ? '已关注' : '关注' }}</text>
      </view>
      <view class="book-btn" @tap="bookTeaching">
        <app-icon name="calendar" :size="16" color="#fff" />
        <text class="book-text">预约授课</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { getInstructorDetail, instructorLevelLabel, instructorLevelColor } from '@/lib/institute-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const id = ref(1)
const detail = ref(getInstructorDetail(1))
const following = ref(false)
const tab = ref<'intro' | 'courses' | 'reviews'>('intro')
const tabList = [
  { key: 'intro' as const, label: '简介' },
  { key: 'courses' as const, label: '课程' },
  { key: 'reviews' as const, label: '评价' },
]

onLoad((q) => {
  const pid = q && q.id ? Number(q.id) : 1
  id.value = pid
  detail.value = getInstructorDetail(pid)
  following.value = !!detail.value.isFollowing
})

function toggleFollow() {
  following.value = !following.value
  uni.showToast({ title: following.value ? '已关注' : '已取消关注', icon: 'none' })
}
function bookTeaching() {
  navigateTo('/offline/teacher-booking?instructorId=' + id.value)
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #ececec; }
.nav-bar { height: 44px; display: flex; align-items: center; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; margin-left: -4px; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 32px; }
.scroll { height: 100vh; box-sizing: border-box; }

.header { background: #fff; padding: 16px; }
.header-row { display: flex; gap: 16px; }
.avatar-wrap { position: relative; flex-shrink: 0; }
.avatar { width: 72px; height: 72px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.avatar-badge { position: absolute; bottom: -2px; right: -2px; width: 20px; height: 20px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.header-info { flex: 1; min-width: 0; }
.name-row { display: flex; align-items: center; gap: 8px; }
.name { font-size: 20px; font-weight: 700; color: #1a1a1a; }
.level { font-size: 10px; padding: 1px 6px; border-radius: 4px; }
.title { display: block; font-size: 14px; color: #9ca3af; margin-top: 2px; }
.tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.tag { font-size: 10px; padding: 2px 6px; background: #f3f4f6; border-radius: 4px; color: #6b7280; }
.stats { display: flex; margin-top: 16px; padding: 12px 0; background: #fafafa; border-radius: 12px; }
.stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-rating { display: flex; align-items: center; gap: 2px; }
.stat-num { font-size: 18px; font-weight: 700; color: #c41e3a; }
.stat-label { font-size: 10px; color: #9ca3af; }

.tabs { display: flex; background: #fff; border-bottom: 1px solid #ececec; margin-top: 8px; position: sticky; top: 0; z-index: 5; }
.tab { flex: 1; padding: 12px 0; display: flex; flex-direction: column; align-items: center; position: relative; }
.tab-text { font-size: 14px; font-weight: 500; color: #9ca3af; }
.tab-text-active { color: #c41e3a; }
.tab-line { position: absolute; bottom: 0; width: 32px; height: 2px; background: #c41e3a; border-radius: 2px; }

.content { padding: 16px; }
.sec { margin-bottom: 20px; }
.sec-title { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
.sec-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.sec-title-inline { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.sec-desc { display: block; font-size: 13px; color: #6b7280; line-height: 1.6; }
.li { display: block; font-size: 13px; color: #6b7280; line-height: 1.8; }
.cert { display: flex; align-items: center; justify-content: space-between; padding: 8px; background: #fafafa; border-radius: 8px; margin-bottom: 8px; }
.cert-name { font-size: 13px; color: #1a1a1a; }
.cert-meta { font-size: 11px; color: #9ca3af; }

.course-list { display: flex; flex-direction: column; gap: 12px; }
.course-card { display: flex; gap: 12px; padding: 12px; background: #fff; border: 1px solid #ececec; border-radius: 12px; }
.course-cover { width: 80px; height: 64px; border-radius: 8px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.course-info { flex: 1; min-width: 0; }
.course-title { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; line-height: 1.4; }
.course-stats { display: flex; gap: 12px; margin-top: 8px; }
.course-stat { display: flex; align-items: center; gap: 4px; }
.course-stat-text { font-size: 11px; color: #9ca3af; }

.review-list { display: flex; flex-direction: column; gap: 12px; }
.review-card { padding: 12px; background: #fff; border: 1px solid #ececec; border-radius: 12px; }
.review-head { display: flex; align-items: center; gap: 8px; }
.review-avatar { width: 32px; height: 32px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.review-user { flex: 1; }
.review-name { display: block; font-size: 13px; font-weight: 500; color: #1a1a1a; }
.review-stars { display: flex; gap: 1px; margin-top: 2px; }
.review-time { font-size: 10px; color: #9ca3af; }
.review-content { display: block; font-size: 13px; color: #6b7280; margin-top: 8px; line-height: 1.5; }

.footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #ececec; padding: 12px 16px; display: flex; gap: 12px; }
.follow-btn { display: flex; align-items: center; gap: 4px; border: 1px solid #d1d5db; border-radius: 10px; padding: 10px 20px; }
.follow-btn-active { border-color: #c41e3a; }
.follow-text { font-size: 14px; color: #4b5563; }
.follow-text-active { color: #c41e3a; }
.book-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; background: #c41e3a; border-radius: 10px; padding: 10px 0; }
.book-text { font-size: 14px; font-weight: 500; color: #fff; }
.bottom-safe { height: 88px; }
</style>
