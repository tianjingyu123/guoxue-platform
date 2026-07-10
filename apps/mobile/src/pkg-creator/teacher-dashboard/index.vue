<template>
  <view class="td-page">
    <!-- 头部 -->
    <view class="td-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="td-header-bar">
        <view class="td-left">
          <view class="td-icon-btn" @tap="back">
            <AppIcon name="chevron-left" :size="22" color="#fff" />
          </view>
          <text class="td-title">讲师工作台</text>
        </view>
        <view class="td-right">
          <view class="td-icon-btn td-bell" @tap="go('/notifications')">
            <AppIcon name="bell" :size="20" color="#fff" />
            <view class="td-dot" />
          </view>
          <view class="td-icon-btn" @tap="go('/pkg-creator/my-qualifications/index')">
            <AppIcon name="award" :size="20" color="#fff" />
          </view>
        </view>
      </view>

      <!-- 身份卡 -->
      <view v-if="isTeacher" class="td-identity">
        <view class="td-avatar">
          <AppIcon name="award" :size="32" color="#fff" />
        </view>
        <view class="td-id-info">
          <view class="td-id-name-row">
            <text class="td-id-name">{{ teacherName || '认证讲师' }}</text>
            <text class="td-id-badge">认证讲师</text>
          </view>
          <text v-if="teacherTitle" class="td-id-sub">{{ teacherTitle }}</text>
          <view class="td-id-poster" @tap="openPoster">
            <AppIcon :name="posterLoading ? 'loader' : 'image'" :size="14" color="#fff" />
            <text class="td-id-poster-txt">{{ posterLoading ? '生成中...' : '生成品牌海报' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="td-body">
      <view class="td-grid">
        <view v-for="i in 4" :key="i" class="td-skeleton td-skeleton-card" />
      </view>
      <view class="td-skeleton td-skeleton-block-lg" />
    </view>

    <!-- 加载失败 -->
    <view v-else-if="error" class="td-empty">
      <AppIcon name="alert-circle" :size="56" color="#f97316" />
      <text class="td-empty-title">加载失败</text>
      <button class="td-empty-btn" @tap="loadData">重试</button>
    </view>

    <!-- 资格门控：非认证讲师 -->
    <view v-else-if="!isTeacher" class="td-empty">
      <AppIcon name="award" :size="56" color="#c41e3a" />
      <text class="td-empty-title">
        {{ certStatus === 'pending' ? '认证审核中' : certStatus === 'rejected' ? '认证未通过' : '成为认证讲师' }}
      </text>
      <text class="td-empty-desc">
        {{ certStatus === 'pending'
          ? '您的讲师认证正在审核，通过后即可在此管理线上课程。'
          : certStatus === 'rejected'
            ? '很抱歉，您的认证未通过，可重新提交申请。'
            : '通过讲师认证后，方可在圈子内上传与管理线上课程。' }}
      </text>
      <button class="td-empty-btn" @tap="goCertify">
        {{ certStatus === 'pending' ? '查看认证进度' : certStatus === 'rejected' ? '重新申请' : '去认证' }}
      </button>
    </view>

    <!-- 认证讲师：课程管理台 -->
    <view v-else class="td-body">
      <!-- 今日宜忌轻栏（自包含拉取，失败自动隐藏；td-body 自带 24rpx 内边距，故去掉左右外边距） -->
      <almanac-bar margin="0 0 20rpx" />

      <!-- 经营顾问（自包含，无建议自动隐藏） -->
      <advisor-card role-type="LECTURER" />

      <!-- 影响力指数（课题二工作台 P3·预取公开主页数据·失败则不显示） -->
      <teacher-influence-card
        v-if="posterProfile"
        class="td-influence"
        :influence="posterProfile.influence"
      />

      <!-- 数据概览（全部来自真实课程数据） -->
      <view class="td-grid">
        <view class="td-stat">
          <view class="td-stat-label">
            <AppIcon name="users" :size="16" color="#999" />
            <text class="td-stat-label-text">累计学员</text>
          </view>
          <text class="td-stat-num">{{ formatNum(stats.studentCount) }}</text>
        </view>
        <view class="td-stat">
          <view class="td-stat-label">
            <AppIcon name="book-open" :size="16" color="#999" />
            <text class="td-stat-label-text">课程总数</text>
          </view>
          <text class="td-stat-num">{{ stats.courseCount }}</text>
        </view>
        <view class="td-stat">
          <view class="td-stat-label">
            <AppIcon name="check-circle" :size="16" color="#999" />
            <text class="td-stat-label-text">已发布</text>
          </view>
          <text class="td-stat-num td-green">{{ stats.published }}</text>
        </view>
        <view class="td-stat">
          <view class="td-stat-label">
            <AppIcon name="eye" :size="16" color="#999" />
            <text class="td-stat-label-text">仅自己可见</text>
          </view>
          <text class="td-stat-num">{{ stats.selfOnly }}</text>
        </view>
      </view>

      <!-- 我的课程 -->
      <view class="td-card">
        <view class="td-card-head">
          <text class="td-card-title">我的课程</text>
          <view class="td-link" @tap="goCreate">
            <AppIcon name="plus" :size="14" color="#c41e3a" />
            <text class="td-link-text">发布课程</text>
          </view>
        </view>

        <!-- 空态 -->
        <view v-if="courses.length === 0" class="td-course-empty">
          <AppIcon name="book-open" :size="40" color="#ddd" />
          <text class="td-course-empty-text">还没有课程，点击右上角发布第一门课程</text>
        </view>

        <view v-else class="td-list">
          <view
            v-for="course in courses"
            :key="course.id"
            class="td-list-item"
            @tap="go('/pkg-course/detail/index?id=' + course.id)"
          >
            <view class="td-course-cover">
              <image lazy-load v-if="course.cover" class="td-course-img" :src="course.cover" mode="aspectFill" />
              <AppIcon v-else name="video" :size="24" color="#c41e3a" />
            </view>
            <view class="td-list-main">
              <view class="td-course-title-row">
                <text class="td-list-title">{{ course.title }}</text>
                <text
                  class="td-draft-tag"
                  :style="{ color: courseStatus(course).color, background: courseStatus(course).bg }"
                  @tap.stop="onStatusTagTap(course)"
                >{{ courseStatus(course).label }}</text>
              </view>
              <view class="td-course-meta">
                <view class="td-meta-item">
                  <AppIcon name="users" :size="12" color="#999" />
                  <text class="td-meta-text">{{ course.studentCount }} 学员</text>
                </view>
                <view class="td-meta-item">
                  <AppIcon name="layers" :size="12" color="#999" />
                  <text class="td-meta-text">{{ course.chapterCount }} 章</text>
                </view>
                <view class="td-meta-item td-meta-link" @tap.stop="goReviews(course)">
                  <AppIcon name="message-square" :size="12" color="#c41e3a" />
                  <text class="td-meta-text td-meta-text-link">{{ course.reviewCount }} 评价</text>
                </view>
              </view>
            </view>
            <AppIcon name="chevron-right" :size="16" color="#bbb" />
          </view>
        </view>
      </view>
    </view>

    <!-- 品牌海报弹层（通用组件·招牌数据条 + 真二维码带本人 ref 归因） -->
    <name-card-poster
      :visible="posterVisible"
      :name="cardName"
      :title="cardTitle"
      :intro="cardIntro"
      :stats="cardStats"
      :link="cardLink"
      qr-caption="扫码找 TA 学习/咨询"
      @close="closePoster"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AlmanacBar from '@/components/workbench/almanac-bar.vue'
import AdvisorCard from '@/components/workbench/advisor-card.vue'
import NameCardPoster from '@/components/common/name-card-poster.vue'
import TeacherInfluenceCard from '@/components/common/teacher-influence-card.vue'
import { navigateTo, goBack } from '@/utils/router'
import { useShare } from '@/composables/useShare'
import { withRef } from '@/utils/referral'
import { teacherApi, buildTeacherCardTitle, buildTeacherCardStats, type CertStatus, type TeacherPublicProfile } from '@/lib/teacher-data'
import { courseApi, type CreatedCourse } from '@/lib/course-data'

const statusBarHeight = ref(0)
const loading = ref(true)
const error = ref(false)

// 资格门控：仅 APPROVED 讲师可进入管理台
const certStatus = ref<CertStatus>('none')
const isTeacher = computed(() => certStatus.value === 'approved')
const teacherName = ref('')
const teacherTitle = ref('')
const teacherIntro = ref('')
const myUserId = ref('')

// 我创建的课程（真连 GET /courses/created）
const courses = ref<CreatedCourse[]>([])

// 派生统计（全部来自真实课程数据，无虚构）
const stats = computed(() => {
  const list = courses.value
  return {
    studentCount: list.reduce((s, c) => s + (c.studentCount || 0), 0),
    courseCount: list.length,
    published: list.filter((c) => c.auditStatus === 'APPROVED' && c.visibility !== 'SELF_ONLY').length,
    selfOnly: list.filter((c) => c.visibility === 'SELF_ONLY').length,
  }
})

function formatNum(n: number) {
  return n.toLocaleString('en-US')
}

// ───────── 品牌海报（一键生成·复用 name-card-poster 通用组件） ─────────

const posterVisible = ref(false)
const posterLoading = ref(false)
// 点海报时懒加载公开主页完整数据（昵称/头衔/评分），失败降级用工作台已有 cert + 课程统计
const posterProfile = ref<TeacherPublicProfile | null>(null)

/** 海报姓名：优先对外昵称（与公开主页一致），降级用实名 */
const cardName = computed(() => posterProfile.value?.nickname || teacherName.value || '认证讲师')
const cardTitle = computed(() => (posterProfile.value ? buildTeacherCardTitle(posterProfile.value) : teacherTitle.value))
const cardIntro = computed(() => posterProfile.value?.intro || teacherIntro.value)
/** 招牌数据条：有公开主页数据用其（含评分），否则用工作台课程统计降级 */
const cardStats = computed(() =>
  posterProfile.value
    ? buildTeacherCardStats(posterProfile.value.stats)
    : [
        { num: String(stats.value.courseCount), label: '门课程' },
        { num: formatNum(stats.value.studentCount), label: '位学员' },
      ],
)
/** 二维码 = 我的公开主页 H5 链接（withRef 带本人 ref 归因·扫码进页完成推荐闭环） */
const cardLink = computed(() =>
  withRef(`https://api.rebugx.cn/h5/#/pkg-creator/teacher-profile/index?userId=${encodeURIComponent(myUserId.value)}`),
)

async function openPoster() {
  if (!posterProfile.value && myUserId.value && !posterLoading.value) {
    posterLoading.value = true
    try {
      posterProfile.value = await teacherApi.getPublicProfile(myUserId.value)
    } catch {
      /* 公开主页未开通/请求失败：降级用 cert + 课程统计，不阻塞海报 */
    } finally {
      posterLoading.value = false
    }
  }
  posterVisible.value = true
}
function closePoster() {
  posterVisible.value = false
}

// 微信原生分享（海报弹层内「分享给好友」走此·自动携带本人 ref 归因）
const { toAppMessage } = useShare()
onShareAppMessage(() => toAppMessage({
  title: `${cardName.value} · 邀您一同研习国学`,
  path: `/pkg-creator/teacher-profile/index?userId=${myUserId.value}`,
  cover: posterProfile.value?.avatar,
}))

// 审核无感化（20260711 第八节）：去「审核中/未通过」感知——存量 PENDING 显「未上架」；SELF_ONLY 优先显「仅自己可见」
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: '草稿', color: '#6b7280', bg: '#f3f4f6' },
  PENDING: { label: '未上架', color: '#6b7280', bg: '#f3f4f6' },
  APPROVED: { label: '已发布', color: '#16a34a', bg: '#f0fdf4' },
  REJECTED: { label: '已下架', color: '#ef4444', bg: '#fef2f2' },
}
const SELF_ONLY_TAG = { label: '仅自己可见', color: '#8c8c8c', bg: '#f0f0f0' }
function courseStatus(course: CreatedCourse) {
  if (course.visibility === 'SELF_ONLY') return SELF_ONLY_TAG
  return STATUS_MAP[course.auditStatus] || STATUS_MAP.PENDING
}
/** 点状态标：仅自己可见/已下架给说明与申诉指引 */
function onStatusTagTap(course: CreatedCourse) {
  if (course.visibility === 'SELF_ONLY') {
    uni.showModal({
      title: '仅自己可见',
      content: '该课程经系统复核暂时调整为仅自己可见，其他用户看不到，不影响您查看和管理。如有疑问，请联系客服申诉，我们会尽快为您复核。',
      showCancel: false,
      confirmText: '知道了',
    })
  } else if (course.auditStatus === 'REJECTED') {
    uni.showModal({
      title: '已下架',
      content: '该课程因涉及违规内容已被下架，具体原因可在消息中心查看。如有疑问，请联系客服申诉。',
      showCancel: false,
      confirmText: '知道了',
    })
  }
}

async function loadData() {
  loading.value = true
  error.value = false
  try {
    const cert = await teacherApi.getMyCertification()
    certStatus.value = cert
      ? (cert.status === 'APPROVED' ? 'approved' : cert.status === 'PENDING' ? 'pending' : cert.status === 'REJECTED' ? 'rejected' : 'none')
      : 'none'
    teacherName.value = cert?.realName || ''
    teacherTitle.value = cert?.verifiedTitle || cert?.title || ''
    teacherIntro.value = cert?.intro || ''
    myUserId.value = cert?.userId || ''
    // 仅认证讲师加载课程 + 预取公开主页（含影响力指数·失败静默不阻塞工作台）
    if (certStatus.value === 'approved') {
      const [res] = await Promise.all([
        courseApi.getCreatedCourses(1, 50),
        myUserId.value
          ? teacherApi.getPublicProfile(myUserId.value).then((p) => { posterProfile.value = p }).catch(() => {})
          : Promise.resolve(),
      ])
      courses.value = res.items
    }
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

function go(path: string) {
  navigateTo(path)
}

/** 发布课程（仅认证讲师；后端 CourseCreatorGuard 二次拦截） */
function goCreate() {
  navigateTo('/pkg-course/publish-course/index')
}

/** 进入某课程的评价管理（回复评价） */
function goReviews(course: CreatedCourse) {
  navigateTo(`/pkg-creator/course-reviews/index?id=${course.id}&title=${encodeURIComponent(course.title)}`)
}

function goCertify() {
  navigateTo('/pkg-creator/teacher-certification/index')
}

function back() {
  goBack()
}

onLoad(() => {
  try {
    const info = uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
  } catch (e) {
    statusBarHeight.value = 0
  }
  loadData()
})
</script>

<style scoped>
.td-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 40rpx;
}

/* 头部 */
.td-header {
  background: var(--brand);
  color: #fff;
  padding-bottom: 48rpx;
}
.td-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
}
.td-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.td-icon-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.td-icon-btn:active {
  background: rgba(255, 255, 255, 0.15);
}
.td-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
}
.td-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.td-dot {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 14rpx;
  height: 14rpx;
  background: #ff3b30;
  border-radius: 50%;
}

/* 身份卡 */
.td-identity {
  display: flex;
  align-items: center;
  gap: 28rpx;
  padding: 0 32rpx;
}
.td-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.td-id-info {
  flex: 1;
}
.td-id-name-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.td-id-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #fff;
}
.td-id-badge {
  font-size: 20rpx;
  padding: 2rpx 14rpx;
  background: rgba(240, 180, 0, 0.25);
  color: #ffe08a;
  border-radius: 20rpx;
}
.td-id-sub {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 8rpx;
}
.td-id-poster {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 16rpx;
  padding: 8rpx 22rpx;
  background: rgba(255, 255, 255, 0.18);
  border: 1rpx solid rgba(255, 255, 255, 0.35);
  border-radius: 999rpx;
}
.td-id-poster:active {
  background: rgba(255, 255, 255, 0.28);
}
.td-id-poster-txt {
  font-size: 22rpx;
  color: #fff;
  font-weight: 500;
}
.td-id-rating {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 8rpx;
}
.td-id-score {
  font-size: 24rpx;
  font-weight: 500;
  color: #fff;
}
.td-id-count {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
}

/* body */
.td-body {
  padding: 0 24rpx;
  margin-top: -24rpx;
}

/* 影响力卡外边距（组件自带白底） */
.td-influence { display: block; margin-bottom: 24rpx; }

/* 数据概览 */
.td-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.td-stat {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.td-stat-label {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 14rpx;
}
.td-stat-label-text {
  font-size: 24rpx;
  color: #999;
}
.td-stat-num {
  font-size: 44rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.td-stat-num.td-brand {
  color: var(--brand);
}
.td-stat-extra {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}
.td-stat-extra.td-green {
  color: #16a34a;
}

/* 卡片 */
.td-card {
  background: #fff;
  border-radius: 20rpx;
  margin-top: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
.td-card-pad {
  padding: 28rpx;
}
.td-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  border-bottom: 2rpx solid #f0f0f0;
}
.td-card-pad .td-card-head {
  padding: 0 0 24rpx;
}
.td-no-border {
  border-bottom: none;
}
.td-card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.td-block-title {
  display: block;
  margin-bottom: 24rpx;
}
.td-card-sub {
  font-size: 22rpx;
  color: #999;
}
.td-link {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.td-link-text {
  font-size: 24rpx;
  color: var(--brand);
}

/* 列表 */
.td-list-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 28rpx;
  border-bottom: 2rpx solid #f5f5f5;
}
.td-list-item:last-child {
  border-bottom: none;
}
.td-list-item:active {
  background: #fafafa;
}
.td-list-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.td-list-main {
  flex: 1;
  min-width: 0;
}
.td-list-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.td-list-time {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}
.td-list-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.td-count-badge {
  font-size: 22rpx;
  font-weight: 500;
  padding: 4rpx 16rpx;
  background: rgba(196, 30, 58, 0.1);
  color: var(--brand);
  border-radius: 20rpx;
}

/* 收入图表 */
.td-chart {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  height: 240rpx;
}
.td-bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  height: 100%;
  justify-content: flex-end;
}
.td-bar {
  width: 100%;
  border-radius: 8rpx 8rpx 0 0;
  background: rgba(196, 30, 58, 0.3);
}
.td-bar-active {
  background: var(--brand);
}
.td-bar-label {
  font-size: 22rpx;
  color: #999;
}

/* 课程 */
.td-course-cover {
  width: 88rpx;
  height: 88rpx;
  border-radius: 16rpx;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.td-course-img {
  width: 100%;
  height: 100%;
}

/* 门控 / 空态 / 失败态 */
.td-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
  gap: 20rpx;
}
.td-empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.td-empty-desc {
  font-size: 26rpx;
  color: #999;
  text-align: center;
  line-height: 1.6;
}
.td-empty-btn {
  margin-top: 16rpx;
  padding: 0 64rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: var(--brand);
  color: #fff;
  font-size: 28rpx;
  border-radius: 999rpx;
}
.td-course-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 32rpx;
  gap: 16rpx;
}
.td-course-empty-text {
  font-size: 26rpx;
  color: #bbb;
}
.td-course-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.td-draft-tag {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  background: #fff0e6;
  color: #ea580c;
  border-radius: 8rpx;
  flex-shrink: 0;
}
.td-course-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 8rpx;
}
.td-meta-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.td-meta-text {
  font-size: 22rpx;
  color: #999;
}
.td-meta-link {
  padding: 4rpx 0;
}
.td-meta-text-link {
  color: var(--brand);
}

/* 快捷操作 */
.td-quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}
.td-quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  padding: 16rpx 0;
}
.td-quick-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.td-quick-label {
  font-size: 24rpx;
  color: #2c2c2c;
}

/* 骨架 */
.td-skeleton {
  background: #ececec;
  border-radius: 16rpx;
  animation: td-pulse 1.5s ease-in-out infinite;
}
.td-skeleton-card {
  height: 180rpx;
}
.td-skeleton-block {
  height: 320rpx;
  margin-top: 24rpx;
}
.td-skeleton-block-lg {
  height: 420rpx;
  margin-top: 24rpx;
}
@keyframes td-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
