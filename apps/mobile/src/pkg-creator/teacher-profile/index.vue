<script setup lang="ts">
/**
 * 讲师公开主页（T8-P1b·可分享品牌页 → 课-P2 升级为从业者智能名片页）
 * 数据源：GET /teachers/:userId/profile（公开·仅认证通过讲师，404=未开通）
 * 入口：课程详情讲师卡 / 驿站详情师资卡（签约讲师）/ 分享链接 / 名片海报二维码
 * 名片能力：进页 ref 归因（本页即归因落地页）+ 页首原生分享 + canvas 名片海报（真二维码带 ref）
 */
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { navigateTo, goBack } from '@/utils/router'
import { useShare } from '@/composables/useShare'
import { captureRefFromQuery, withRef } from '@/utils/referral'
import AppIcon from '@/components/common/app-icon.vue'
import TeacherCertBadge from '@/components/common/teacher-cert-badge.vue'
import NameCardPoster from '@/components/common/name-card-poster.vue'
import TeacherInfluenceCard from '@/components/common/teacher-influence-card.vue'
import { teacherApi, buildTeacherCardTitle, buildTeacherCardStats, type TeacherPublicProfile } from '@/lib/teacher-data'
import { formatPrice } from '@/utils/format'

const loading = ref(true)
const error = ref('')
const userId = ref('')
const profile = ref<TeacherPublicProfile | null>(null)

async function loadData() {
  if (!userId.value) {
    loading.value = false
    error.value = '缺少讲师参数'
    return
  }
  loading.value = true
  error.value = ''
  try {
    profile.value = await teacherApi.getPublicProfile(userId.value)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
    profile.value = null
  } finally {
    loading.value = false
  }
}

function fmtCount(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : String(n)
}

const stationTypeLabel: Record<string, string> = {
  center: '文化中心', academy: '书院', studio: '工作室', partner: '合作空间',
}

function goCourse(id: string) { navigateTo(`/courses/${id}`) }
function goStation(id: string) { navigateTo(`/offline/stations/${id}`) }

// ───────── 名片海报（课-P2·通用组件 name-card-poster） ─────────

const posterVisible = ref(false)
function openPoster() { posterVisible.value = true }
function closePoster() { posterVisible.value = false }

/** 认证头衔文字 + 招牌数据条（共享拼装·与工作台一致） */
const cardTitle = computed(() => (profile.value ? buildTeacherCardTitle(profile.value) : ''))
const cardStats = computed(() => (profile.value ? buildTeacherCardStats(profile.value.stats) : []))

/** 名片二维码内容 = 本名片页 H5 链接（withRef 追加分享者 ref·本页 onLoad captureRef 完成归因闭环） */
const cardLink = computed(() =>
  withRef(`https://api.rebugx.cn/h5/pkg-creator/teacher-profile/index?userId=${encodeURIComponent(userId.value)}`),
)

// 微信原生分享（好友/朋友圈），toAppMessage/toTimeline 内部自动携带分享者 ref（推荐归因）
const { toAppMessage, toTimeline } = useShare()
onShareAppMessage(() => toAppMessage({
  title: profile.value ? `${profile.value.nickname} · ${profile.value.verifiedTitle}` : '国学认证讲师',
  path: `/pkg-creator/teacher-profile/index?userId=${userId.value}`,
  cover: profile.value?.avatar,
}))
onShareTimeline(() => toTimeline({
  title: profile.value ? `${profile.value.nickname} · ${profile.value.verifiedTitle}` : '国学认证讲师',
  path: `/pkg-creator/teacher-profile/index?userId=${userId.value}`,
  cover: profile.value?.avatar,
}))

onLoad((options) => {
  // 名片页即归因落地页：扫码/点链进页先记录分享者 ref（7 天临时推荐人）
  captureRefFromQuery(options as Record<string, unknown>)
  userId.value = options?.userId ? String(options.userId) : ''
  loadData()
})
</script>

<template>
  <!-- Loading -->
  <view v-if="loading" class="state-wrap">
    <text class="state-text">加载中...</text>
  </view>
  <!-- Error（含未认证 404 → 诚实错误态） -->
  <view v-else-if="error || !profile" class="state-wrap">
    <app-icon name="user" :size="80" color="#D1D5DB" />
    <text class="state-text">{{ error || '该讲师暂未开通公开主页' }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <!-- Content -->
  <view v-else class="page">
    <!-- 顶栏 -->
    <view class="nav">
      <view class="nav-back" @tap="goBack">
        <app-icon name="chevron-left" :size="44" color="#1F1F1F" />
      </view>
      <text class="nav-title">讲师主页</text>
      <view class="nav-right" />
    </view>

    <!-- 头部：头像 / 昵称 / 认证头衔金标 / 简介 -->
    <view class="header">
      <view class="hd-top">
        <view class="avatar-wrap">
          <image v-if="profile.avatar" lazy-load class="avatar" :src="profile.avatar" mode="aspectFill" />
          <view v-else class="avatar avatar-fallback"><text class="avatar-char">{{ profile.nickname[0] }}</text></view>
          <view class="verified">
            <app-icon name="badge-check" :size="30" color="#C41E3A" />
          </view>
        </view>
        <view class="hd-info">
          <text class="hd-name">{{ profile.nickname }}</text>
          <!-- F1 认证分级：通用徽章组件（SIGNED 金标 / SENIOR·JUNIOR·PREPARATORY 等级标签 + verifiedTitle 头衔 chip） -->
          <view class="hd-badges">
            <teacher-cert-badge :verified-title="profile.verifiedTitle" :institute="profile.institute ?? null" />
          </view>
        </view>
      </view>
      <text v-if="profile.intro" class="hd-intro">{{ profile.intro }}</text>

      <!-- 数据条：课程数 / 学员数 / 评分（无评价省略） -->
      <view class="stats">
        <view class="stat">
          <text class="stat-num">{{ profile.stats.courseCount }}</text>
          <text class="stat-label">门课程</text>
        </view>
        <view class="stat-divider" />
        <view class="stat">
          <text class="stat-num">{{ fmtCount(profile.stats.studentCount) }}</text>
          <text class="stat-label">位学员</text>
        </view>
        <template v-if="profile.stats.avgRating != null">
          <view class="stat-divider" />
          <view class="stat">
            <view class="stat-num stat-rating">
              <app-icon name="star" :size="28" color="#F59E0B" :fill="true" />
              <text>{{ profile.stats.avgRating }}</text>
            </view>
            <text class="stat-label">{{ profile.stats.reviewCount }}条评价</text>
          </view>
        </template>
      </view>

      <!-- 名片动作（课-P2）：原生分享（withRef 归因）+ 保存名片海报 -->
      <view class="card-actions-row">
        <button class="share-btn" open-type="share">
          <app-icon name="share-2" :size="30" color="#ffffff" />
          <text class="share-btn-txt">分享名片</text>
        </button>
        <view class="poster-btn" @tap="openPoster">
          <app-icon name="image" :size="30" color="#8b5a2b" />
          <text class="poster-btn-txt">保存名片海报</text>
        </view>
      </view>
    </view>

    <!-- 影响力指数（课题二工作台 P3·公开主页也展示，增强讲师品牌可信度） -->
    <teacher-influence-card
      class="profile-influence"
      :influence="profile.influence"
    />

    <!-- 线上课程 -->
    <view class="section">
      <view class="sec-head">
        <text class="sec-title">TA 的课程</text>
        <text v-if="profile.stats.courseCount > profile.courses.length" class="sec-more">共{{ profile.stats.courseCount }}门</text>
      </view>
      <view v-if="profile.courses.length" class="course-list">
        <view v-for="c in profile.courses" :key="c.id" class="course-item" @tap="goCourse(c.id)">
          <image v-if="c.cover" lazy-load class="course-cover" :src="c.cover" mode="aspectFill" />
          <view v-else class="course-cover course-cover-fallback">
            <app-icon name="book-open" :size="40" color="#d8b48a" />
          </view>
          <view class="course-info">
            <text class="course-title">{{ c.title }}</text>
            <view class="course-bottom">
              <text class="course-price">{{ c.price === 0 ? '免费' : '¥' + formatPrice(c.price) }}</text>
              <view class="course-students">
                <app-icon name="users" :size="22" color="#9CA3AF" />
                <text class="course-students-txt">{{ fmtCount(c.studentCount) }}人学习</text>
              </view>
            </view>
          </view>
          <app-icon name="chevron-right" :size="32" color="#D1D5DB" />
        </view>
      </view>
      <view v-else class="empty">
        <app-icon name="book-open" :size="72" color="#D1D5DB" />
        <text class="empty-txt">暂无上线课程</text>
      </view>
    </view>

    <!-- 线下授课驿站（有则显示，诚实降级） -->
    <view v-if="profile.offlineStations.length" class="section">
      <view class="sec-head">
        <text class="sec-title">线下授课驿站</text>
      </view>
      <view class="station-list">
        <view v-for="s in profile.offlineStations" :key="s.id" class="station-item" @tap="goStation(s.id)">
          <image v-if="s.cover" lazy-load class="station-cover" :src="s.cover" mode="aspectFill" />
          <view v-else class="station-cover station-cover-fallback">
            <app-icon name="map-pin" :size="36" color="#d8b48a" />
          </view>
          <view class="station-info">
            <text class="station-name">{{ s.name }}</text>
            <view class="station-meta">
              <text v-if="s.city" class="station-city">{{ s.city }}</text>
              <text v-if="s.type && stationTypeLabel[s.type]" class="station-type">{{ stationTypeLabel[s.type] }}</text>
            </view>
          </view>
          <app-icon name="chevron-right" :size="32" color="#D1D5DB" />
        </view>
      </view>
    </view>

    <view class="safe-bottom" />

    <!-- 名片海报弹层（课-P2·通用组件·二维码=本页 H5 链接带 ref） -->
    <name-card-poster
      :visible="posterVisible"
      :name="profile.nickname"
      :title="cardTitle"
      :intro="profile.intro"
      :stats="cardStats"
      :link="cardLink"
      qr-caption="扫码找 TA 学习/咨询"
      @close="closePoster"
    />
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #F5F5F5;
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
.header { background: #ffffff; padding: 36rpx 32rpx 28rpx; }
.hd-top { display: flex; align-items: center; gap: 28rpx; }
.avatar-wrap { position: relative; flex-shrink: 0; }
.avatar { width: 144rpx; height: 144rpx; border-radius: 50%; background: #F0F0F0; }
.avatar-fallback { display: flex; align-items: center; justify-content: center; background: #FDF3E7; }
.avatar-char { font-size: 56rpx; font-weight: 600; color: #C09A5F; }
.verified {
  position: absolute; right: -4rpx; bottom: -4rpx;
  width: 44rpx; height: 44rpx; border-radius: 50%;
  background: #ffffff; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}
.hd-info { flex: 1; min-width: 0; }
.hd-name { font-size: 42rpx; font-weight: 700; color: #1F1F1F; display: block; }
.hd-badges { display: flex; flex-wrap: wrap; align-items: center; gap: 12rpx; margin-top: 14rpx; }
.hd-intro { font-size: 27rpx; line-height: 1.7; color: #6B7280; margin-top: 24rpx; display: block; }

/* 数据条 */
.stats {
  display: flex; align-items: center; margin-top: 28rpx; padding: 26rpx 0;
  background: #FAFAFA; border-radius: 16rpx;
}
.stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.stat-num { font-size: 34rpx; font-weight: 700; color: var(--brand, #C41E3A); }
.stat-rating { display: flex; align-items: center; gap: 4rpx; }
.stat-label { font-size: 20rpx; color: #9CA3AF; }
.stat-divider { width: 1rpx; height: 48rpx; background: #EBEBEB; }

/* 名片动作行（课-P2） */
.card-actions-row { display: flex; align-items: center; gap: 20rpx; margin-top: 24rpx; }
.share-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 10rpx;
  height: 76rpx; margin: 0; padding: 0; line-height: 1;
  background: #8b5a2b; border-radius: 999rpx;
}
.share-btn::after { border: none; }
.share-btn-txt { font-size: 28rpx; font-weight: 600; color: #ffffff; }
.poster-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 10rpx;
  height: 76rpx; background: #fdf3e7; border: 1rpx solid #e6d3a8; border-radius: 999rpx;
}
.poster-btn-txt { font-size: 28rpx; font-weight: 600; color: #8b5a2b; }

/* 影响力卡（组件自带白底·此处仅控外边距，与 section 节奏一致） */
.profile-influence { display: block; margin: 16rpx 24rpx 0; }

/* 分区 */
.section { margin-top: 16rpx; background: #ffffff; padding: 28rpx 32rpx; }
.sec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.sec-title { font-size: 32rpx; font-weight: 600; color: #1F1F1F; }
.sec-more { font-size: 24rpx; color: #9CA3AF; }

/* 课程 */
.course-list { display: flex; flex-direction: column; gap: 20rpx; }
.course-item {
  display: flex; align-items: center; gap: 20rpx; padding: 20rpx;
  background: #FAFAFA; border-radius: 16rpx;
}
.course-cover { width: 176rpx; height: 124rpx; border-radius: 12rpx; flex-shrink: 0; background: #F0F0F0; }
.course-cover-fallback { display: flex; align-items: center; justify-content: center; background: #FDF3E7; }
.course-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14rpx; }
.course-title {
  font-size: 28rpx; color: #1F1F1F; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.course-bottom { display: flex; align-items: center; justify-content: space-between; }
.course-price { font-size: 28rpx; font-weight: 700; color: var(--brand, #C41E3A); }
.course-students { display: flex; align-items: center; gap: 6rpx; }
.course-students-txt { font-size: 22rpx; color: #9CA3AF; }

/* 驿站 */
.station-list { display: flex; flex-direction: column; gap: 20rpx; }
.station-item {
  display: flex; align-items: center; gap: 20rpx; padding: 20rpx;
  background: #FAFAFA; border-radius: 16rpx;
}
.station-cover { width: 112rpx; height: 112rpx; border-radius: 12rpx; flex-shrink: 0; background: #F0F0F0; }
.station-cover-fallback { display: flex; align-items: center; justify-content: center; background: #FDF3E7; }
.station-info { flex: 1; min-width: 0; }
.station-name { font-size: 29rpx; font-weight: 600; color: #1F1F1F; display: block; }
.station-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 10rpx; }
.station-city { font-size: 22rpx; color: #6B7280; }
.station-type { font-size: 20rpx; padding: 2rpx 12rpx; background: #FDF3E7; color: #B8860B; border-radius: 6rpx; }

/* 空状态 */
.empty { display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 64rpx 0; }
.empty-txt { font-size: 26rpx; color: #9CA3AF; }

/* 加载 / 错误 */
.state-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; background: #F5F5F5; }
.state-text { font-size: 28rpx; color: #9CA3AF; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand, #C41E3A); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }

.safe-bottom { height: calc(32rpx + env(safe-area-inset-bottom)); }
</style>
