<template>
  <view class="sh-page">
    <!-- 顶部导航 -->
    <view class="sh-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="sh-nav">
        <view class="sh-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="sh-nav-title">{{ home?.station.name || '驿站主页' }}</text>
        <view class="sh-icon-btn" @tap="posterVisible = true">
          <app-icon name="share-2" :size="20" color="#1a1a1a" />
        </view>
      </view>
    </view>

    <!-- 加载/错误态 -->
    <view v-if="loading" class="sh-state">
      <view class="spinner" />
      <text class="sh-state-text">加载中…</text>
    </view>
    <view v-else-if="!home" class="sh-state">
      <app-icon name="map-pin" :size="44" color="#d1d5db" />
      <text class="sh-state-text">{{ errMsg || '驿站不存在' }}</text>
      <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
    </view>

    <template v-else>
      <scroll-view scroll-y class="sh-body">
        <!-- 品牌头图相册（photos 优先 → images → cover 单图 → 图标占位） -->
        <view class="sh-hero">
          <swiper v-if="heroPhotos.length > 1" class="sh-swiper" circular autoplay :interval="4000" indicator-dots indicator-active-color="#fff">
            <swiper-item v-for="(p, i) in heroPhotos" :key="i">
              <image lazy-load :src="p" class="sh-hero-img" mode="aspectFill" @tap="previewPhoto(i)" />
            </swiper-item>
          </swiper>
          <image lazy-load v-else-if="heroPhotos.length === 1" :src="heroPhotos[0]" class="sh-hero-img" mode="aspectFill" @tap="previewPhoto(0)" />
          <view v-else class="sh-hero-empty"><app-icon name="map-pin" :size="48" color="#d8b48a" /></view>
          <text v-if="home.station.type" class="sh-hero-badge">{{ getStationTypeLabel(home.station.type) }}</text>
        </view>

        <!-- 名称 + 评分 + 标签 -->
        <view class="sh-info">
          <text class="sh-name">{{ home.station.name }}</text>
          <!-- 评分聚合（无 rating 字段=暂无评价 → 诚实不渲染） -->
          <view v-if="home.rating" class="sh-rating-row">
            <view class="sh-stars">
              <app-icon v-for="s in 5" :key="s" name="star" :size="14" :color="s <= ratingRounded ? '#f59e0b' : '#e5e7eb'" :fill="s <= ratingRounded" />
            </view>
            <text class="sh-rating-avg">{{ home.rating.avg.toFixed(1) }}</text>
            <text class="sh-rating-count">· {{ home.rating.count }} 条学员评价</text>
          </view>
          <text v-if="home.station.intro" class="sh-intro">{{ home.station.intro }}</text>
          <view v-if="home.station.tags.length" class="sh-tags">
            <text v-for="tag in home.station.tags" :key="tag" class="sh-tag">{{ tag }}</text>
          </view>
        </view>

        <!-- 驿站故事（未配置不渲染） -->
        <view v-if="home.station.brandStory" class="sh-card">
          <view class="sh-card-head">
            <app-icon name="book-open" :size="18" color="#9a2e25" />
            <text class="sh-card-title">驿站故事</text>
          </view>
          <text class="sh-story">{{ home.station.brandStory }}</text>
        </view>

        <!-- 讲师阵容（签约讲师挂 F1 认证徽章·空则不渲染） -->
        <view v-if="home.featuredTeachers.length" class="sh-card">
          <view class="sh-card-head">
            <app-icon name="users" :size="18" color="#9a2e25" />
            <text class="sh-card-title">讲师阵容</text>
          </view>
          <view v-for="t in home.featuredTeachers" :key="t.id" class="sh-teacher" @tap="goTeacherProfile(t)">
            <image lazy-load v-if="t.avatar" :src="t.avatar" class="sh-avatar-img" mode="aspectFill" />
            <view v-else class="sh-avatar"><text class="sh-avatar-text">{{ (t.name || '师')[0] }}</text></view>
            <view class="sh-teacher-info">
              <view class="sh-teacher-name-row">
                <text class="sh-teacher-name">{{ t.name }}</text>
                <app-icon v-if="t.sourceUserId" name="chevron-right" :size="14" color="#c9c4bb" />
              </view>
              <teacher-cert-badge :verified-title="t.verifiedTitle" :institute="t.institute" size="sm" />
              <text class="sh-teacher-spec">{{ t.specialties.length ? t.specialties.join(' · ') : '国学讲师' }}</text>
            </view>
          </view>
        </view>

        <!-- 特色课程表（近期已发布·空则不渲染） -->
        <view v-if="home.courses.length" class="sh-card">
          <view class="sh-card-head">
            <app-icon name="graduation-cap" :size="18" color="#9a2e25" />
            <text class="sh-card-title">近期课程</text>
            <text class="sh-card-more" @tap="goCourses">全部</text>
          </view>
          <view v-for="c in home.courses" :key="c.id" class="sh-course" @tap="goCourse(c.id)">
            <view class="sh-course-left">
              <text class="sh-course-name">{{ c.title }}</text>
              <text class="sh-course-meta">{{ c.teacher?.name || '待定讲师' }} · {{ fmtCourseTime(c.startTime) }}</text>
            </view>
            <view class="sh-course-right">
              <text class="sh-course-price">{{ num(c.price) === 0 ? '免费' : '¥' + num(c.price) }}</text>
              <text class="sh-course-tag" :style="{ color: courseStatusStyle[deriveCourseStatus(c)].color, background: courseStatusStyle[deriveCourseStatus(c)].bg }">{{ courseStatusLabel[deriveCourseStatus(c)] }}</text>
            </view>
          </view>
        </view>

        <!-- 学员评价墙（空则不渲染=诚实空） -->
        <view v-if="home.reviews.length" class="sh-card">
          <view class="sh-card-head">
            <app-icon name="message-square" :size="18" color="#9a2e25" />
            <text class="sh-card-title">学员评价</text>
          </view>
          <view v-for="r in home.reviews" :key="r.id" class="sh-review">
            <view class="sh-review-head">
              <image lazy-load v-if="r.user.avatar" :src="r.user.avatar" class="sh-review-avatar" mode="aspectFill" />
              <view v-else class="sh-review-avatar sh-review-avatar-ph"><text class="sh-review-avatar-txt">{{ (r.user.nickname || '学')[0] }}</text></view>
              <view class="sh-review-meta">
                <text class="sh-review-nick">{{ r.user.nickname }}</text>
                <view class="sh-stars">
                  <app-icon v-for="s in 5" :key="s" name="star" :size="11" :color="s <= r.rating ? '#f59e0b' : '#e5e7eb'" :fill="s <= r.rating" />
                </view>
              </view>
              <text class="sh-review-date">{{ fmtDate(r.createdAt) }}</text>
            </view>
            <text v-if="r.content" class="sh-review-content">{{ r.content }}</text>
            <text v-if="r.courseTitle" class="sh-review-course">《{{ r.courseTitle }}》</text>
          </view>
        </view>

        <!-- 位置与联系（StationOffline 无经纬度坐标 → 诚实降级为文本地址+复制+电话） -->
        <view class="sh-card">
          <view class="sh-card-head">
            <app-icon name="map-pin" :size="18" color="#9a2e25" />
            <text class="sh-card-title">位置与联系</text>
          </view>
          <view class="sh-loc-row" @tap="copyAddress">
            <text class="sh-loc-text">{{ home.station.city }} · {{ home.station.address }}</text>
            <text class="sh-loc-copy">复制</text>
          </view>
          <view class="sh-loc-row" @tap="onCall">
            <text class="sh-loc-phone">{{ home.station.phone }}</text>
            <app-icon name="phone" :size="16" color="#9a2e25" />
          </view>
          <view v-if="hoursList.length" class="sh-hours">
            <text v-for="(bh, i) in hoursList" :key="i" class="sh-hour" :class="{ closed: !bh.isOpen }">
              {{ bh.day }}: {{ bh.isOpen ? bh.open + '-' + bh.close : '休息' }}
            </text>
          </view>
        </view>

        <view class="sh-safe" />
      </scroll-view>

      <!-- 底部固定 CTA -->
      <view class="sh-footer">
        <view class="sh-foot-btn ghost" @tap="onCall">
          <app-icon name="phone" :size="16" color="#1a1a1a" />
          <text class="sh-foot-btn-text">联系驿站</text>
        </view>
        <view class="sh-foot-btn primary" @tap="onReserve">
          <app-icon name="calendar" :size="16" color="#fff" />
          <text class="sh-foot-btn-text primary">预约到店</text>
        </view>
      </view>

      <!-- 驿站分享海报（复用通用名片海报组件·扫码进主页带 ref 归因） -->
      <name-card-poster
        :visible="posterVisible"
        :name="home.station.name"
        :title="getStationTypeLabel(home.station.type)"
        :intro="posterIntro"
        :link="posterLink"
        qr-caption="扫码看驿站主页"
        @close="posterVisible = false"
      />
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 驿站品牌主页（驿-P1·对外"店面"·公开无登录）
 * 数据：GET /offline/stations/:id/home 单次聚合（品牌头图相册/故事/讲师阵容F1徽章/课程表/评价墙/位置联系）
 * 归因：onLoad captureRefFromQuery 落地归因；分享路径 useShare 自动带当前用户 ref（驿站长分享主页=获客）
 * 海报：复用 components/common/name-card-poster（通用 props 契约·驿站名/类型/特色/主页链接）
 */
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import TeacherCertBadge from '@/components/common/teacher-cert-badge.vue'
import NameCardPoster from '@/components/common/name-card-poster.vue'
import { goBack, navigateTo } from '@/utils/router'
import { useShare } from '@/composables/useShare'
import { captureRefFromQuery, withRef } from '@/utils/referral'
import {
  offlineApi, getStationTypeLabel, fmtCourseTime, fmtDate, num,
  deriveCourseStatus, courseStatusLabel, courseStatusStyle,
  type StationHomeData, type BrandTeacher, type BusinessHour,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

const loading = ref(true)
const errMsg = ref('')
const stationId = ref('')
const home = ref<StationHomeData | null>(null)
const posterVisible = ref(false)

async function load() {
  if (!stationId.value) { loading.value = false; errMsg.value = '缺少驿站参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    home.value = await offlineApi.getStationHome(stationId.value)
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
    home.value = null
  } finally {
    loading.value = false
  }
}

onLoad((q) => {
  captureRefFromQuery(q) // 主页即归因落地页（驿站分享自己主页=获客）
  stationId.value = q && q.id ? String(q.id) : ''
  load()
})

/** 头图相册：品牌相册 photos 优先 → 既有图集 images → 封面单图 */
const heroPhotos = computed(() => {
  const s = home.value?.station
  if (!s) return []
  if (s.photos.length) return s.photos
  if (s.images.length) return s.images
  return s.cover ? [s.cover] : []
})
const ratingRounded = computed(() => Math.round(home.value?.rating?.avg || 0))
const hoursList = computed<BusinessHour[]>(() => home.value?.station.businessHours || [])

function previewPhoto(index: number) {
  if (!heroPhotos.value.length) return
  uni.previewImage({ urls: heroPhotos.value, current: index })
}

// ── 海报（复用通用名片海报：驿站名/类型/特色/主页链接） ──
const posterIntro = computed(() => {
  const s = home.value?.station
  if (!s) return ''
  const feature = s.tags.length ? s.tags.slice(0, 3).join(' · ') : s.intro || ''
  return `${s.city} · ${feature}`.slice(0, 60)
})
const pagePath = computed(() => `/pkg-offline/station-home/index?id=${stationId.value}`)
const posterLink = computed(() => withRef(pagePath.value))

// ── 微信原生分享（路径由 useShare 自动携带分享者 ref → 归因） ──
const { toAppMessage, toTimeline } = useShare()
const shareTitle = () => home.value?.station.name || '国学驿站'
const shareSummary = () => {
  const t = home.value?.station.brandStory || home.value?.station.intro || ''
  return t.length > 40 ? t.slice(0, 40) + '…' : t || undefined
}
onShareAppMessage(() => toAppMessage({
  title: shareTitle(),
  summary: shareSummary(),
  path: pagePath.value,
  cover: heroPhotos.value[0] || undefined,
}))
onShareTimeline(() => toTimeline({
  title: shareTitle(),
  summary: shareSummary(),
  path: pagePath.value,
  cover: heroPhotos.value[0] || undefined,
}))

// ── 交互 ──
function onCall() {
  const phone = home.value?.station.phone
  if (phone) uni.makePhoneCall({ phoneNumber: phone }).catch(() => {})
}
function copyAddress() {
  const s = home.value?.station
  if (!s) return
  uni.setClipboardData({ data: `${s.city} ${s.address}`, success: () => uni.showToast({ title: '地址已复制', icon: 'none' }) })
}
/** 预约到店 CTA：有近期课程→跳报名（首个课程详情），无课程→师资预约 */
function onReserve() {
  const first = home.value?.courses[0]
  if (first) navigateTo(`/offline/courses/${first.id}`)
  else navigateTo(`/offline/teacher-booking?stationId=${stationId.value}`)
}
function goCourse(id: string) { navigateTo(`/offline/courses/${id}`) }
function goCourses() { navigateTo(`/offline/courses?stationId=${stationId.value}`) }
/** 签约讲师（sourceUserId 非空）可进讲师公开主页；自建讲师无主页不跳转 */
function goTeacherProfile(t: BrandTeacher) {
  if (!t.sourceUserId) return
  navigateTo(`/pkg-creator/teacher-profile/index?userId=${t.sourceUserId}`)
}
</script>

<style scoped>
.sh-page { min-height: 100vh; background: #f5f3ef; display: flex; flex-direction: column; }
.sh-header { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.92); backdrop-filter: blur(8px); border-bottom: 1px solid #ededed; }
.sh-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.sh-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.sh-nav-title { flex: 1; text-align: center; font-size: 16px; font-weight: 600; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 8px; }
.sh-body { flex: 1; }

.sh-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding-top: 120px; }
.sh-state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: #9a2e25; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid #9a2e25; border-radius: 999px; }
.retry-text { font-size: 13px; color: #9a2e25; }

.sh-hero { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #f0ebe2; }
.sh-swiper { width: 100%; height: 100%; }
.sh-hero-img { width: 100%; height: 100%; }
.sh-hero-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.sh-hero-badge { position: absolute; top: 12px; left: 12px; z-index: 5; padding: 3px 10px; font-size: 12px; color: #fff; background: #9a2e25; border-radius: 6px; }

.sh-info { padding: 16px; background: #fff; }
.sh-name { font-size: 20px; font-weight: 700; color: #1a1a1a; }
.sh-rating-row { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.sh-stars { display: flex; align-items: center; gap: 2px; }
.sh-rating-avg { font-size: 14px; font-weight: 700; color: #f59e0b; }
.sh-rating-count { font-size: 12px; color: #9ca3af; }
.sh-intro { display: block; font-size: 13px; color: #6b7280; line-height: 1.6; margin-top: 8px; }
.sh-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.sh-tag { padding: 3px 10px; font-size: 12px; color: #8a6d3b; background: #f7f0e3; border-radius: 6px; }

.sh-card { background: #fff; border-radius: 12px; padding: 16px; margin: 12px 12px 0; }
.sh-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.sh-card-title { flex: 1; font-size: 15px; font-weight: 600; color: #1a1a1a; }
.sh-card-more { font-size: 12px; color: #9a2e25; }
.sh-story { font-size: 14px; color: #4b5563; line-height: 1.8; white-space: pre-wrap; }

.sh-teacher { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f6f3ed; }
.sh-teacher:last-child { border-bottom: none; padding-bottom: 0; }
.sh-avatar { width: 52px; height: 52px; border-radius: 999px; background: #9a2e25; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sh-avatar-img { width: 52px; height: 52px; border-radius: 999px; flex-shrink: 0; }
.sh-avatar-text { font-size: 18px; color: #fff; font-weight: 600; }
.sh-teacher-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.sh-teacher-name-row { display: flex; align-items: center; justify-content: space-between; }
.sh-teacher-name { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.sh-teacher-spec { font-size: 12px; color: #9ca3af; }

.sh-course { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f6f3ed; }
.sh-course:last-child { border-bottom: none; padding-bottom: 0; }
.sh-course-left { flex: 1; min-width: 0; }
.sh-course-name { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sh-course-meta { display: block; font-size: 12px; color: #9ca3af; margin-top: 4px; }
.sh-course-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.sh-course-price { font-size: 14px; font-weight: 600; color: #9a2e25; }
.sh-course-tag { padding: 1px 8px; font-size: 11px; border-radius: 4px; }

.sh-review { padding: 10px 0; border-bottom: 1px solid #f6f3ed; }
.sh-review:last-child { border-bottom: none; padding-bottom: 0; }
.sh-review-head { display: flex; align-items: center; gap: 8px; }
.sh-review-avatar { width: 32px; height: 32px; border-radius: 999px; flex-shrink: 0; }
.sh-review-avatar-ph { background: #e8ded0; display: flex; align-items: center; justify-content: center; }
.sh-review-avatar-txt { font-size: 12px; color: #8a6d3b; }
.sh-review-meta { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.sh-review-nick { font-size: 13px; font-weight: 500; color: #1a1a1a; }
.sh-review-date { font-size: 11px; color: #c1bcb2; }
.sh-review-content { display: block; font-size: 13px; color: #4b5563; line-height: 1.6; margin-top: 8px; }
.sh-review-course { display: block; font-size: 11px; color: #9ca3af; margin-top: 4px; }

.sh-loc-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 0; }
.sh-loc-text { flex: 1; font-size: 13px; color: #4b5563; line-height: 1.5; }
.sh-loc-copy { font-size: 12px; color: #9a2e25; padding: 2px 10px; border: 1px solid rgba(154,46,37,0.35); border-radius: 999px; flex-shrink: 0; }
.sh-loc-phone { font-size: 13px; color: #9a2e25; }
.sh-hours { display: flex; flex-direction: column; gap: 2px; margin-top: 6px; }
.sh-hour { font-size: 12px; color: #6b7280; }
.sh-hour.closed { color: #b8b2a7; }

.sh-safe { height: 88px; }
.sh-footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 12px; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ededed; }
.sh-foot-btn { flex: 1; height: 44px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 8px; }
.sh-foot-btn.ghost { background: #f3f4f6; }
.sh-foot-btn.primary { background: #9a2e25; }
.sh-foot-btn-text { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.sh-foot-btn-text.primary { color: #fff; }
</style>
