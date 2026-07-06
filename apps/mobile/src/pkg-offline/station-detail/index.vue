<template>
  <view class="sd-page">
    <!-- 顶部导航 -->
    <view class="sd-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="sd-nav">
        <view class="sd-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="sd-nav-title">{{ station?.name || '驿站详情' }}</text>
        <view class="sd-icon-btn" />
      </view>
    </view>

    <!-- 加载/错误态 -->
    <view v-if="loading" class="sd-state">
      <view class="spinner" />
      <text class="sd-state-text">加载中…</text>
    </view>
    <view v-else-if="!station" class="sd-state">
      <app-icon name="map-pin" :size="44" color="#d1d5db" />
      <text class="sd-state-text">{{ errMsg || '驿站不存在' }}</text>
      <view class="retry-btn" @tap="load"><text class="retry-text">返回重试</text></view>
    </view>

    <template v-else>
      <scroll-view scroll-y class="sd-body">
        <!-- 封面 -->
        <view class="sd-cover">
          <image lazy-load v-if="station.cover" :src="station.cover" class="sd-cover-img" mode="aspectFill" />
          <app-icon v-else name="map-pin" :size="48" color="#d8b48a" />
          <text v-if="station.type" class="sd-cover-badge">{{ getStationTypeLabel(station.type) }}</text>
          <view v-if="station.status !== 'ACTIVE'" class="sd-cover-status">{{ stationStatusLabel[station.status] || '筹备中' }}</view>
        </view>

        <!-- 基本信息 -->
        <view class="sd-info">
          <text class="sd-name">{{ station.name }}</text>
          <!-- 评分聚合（无 rating 字段=暂无评价 → 诚实不渲染） -->
          <view v-if="station.rating" class="sd-rating-row">
            <view class="sd-stars">
              <app-icon v-for="s in 5" :key="s" name="star" :size="14" :color="s <= ratingRounded ? '#f59e0b' : '#e5e7eb'" :fill="s <= ratingRounded" />
            </view>
            <text class="sd-rating-avg">{{ station.rating.avg.toFixed(1) }}</text>
            <text class="sd-rating-count">· {{ station.rating.count }} 条评价</text>
          </view>
          <view class="sd-row">
            <app-icon name="map-pin" :size="16" color="#9ca3af" />
            <text class="sd-row-text">{{ station.city }} · {{ station.address }}</text>
          </view>
          <view class="sd-row sd-phone" @tap="onCall">
            <app-icon name="phone" :size="16" color="#c41e3a" />
            <text class="sd-phone-text">{{ station.phone }}</text>
          </view>
          <view v-if="station.businessHours && station.businessHours.length" class="sd-row sd-hours">
            <app-icon name="clock" :size="16" color="#9ca3af" />
            <view class="sd-hours-list">
              <text v-for="(bh, i) in station.businessHours" :key="i" class="sd-hour" :class="{ closed: !bh.isOpen }">
                {{ bh.day }}: {{ bh.isOpen ? bh.open + '-' + bh.close : '休息' }}
              </text>
            </view>
          </view>
          <view v-if="station.tags && station.tags.length" class="sd-tags">
            <text v-for="tag in station.tags" :key="tag" class="sd-tag">{{ tag }}</text>
          </view>
        </view>

        <!-- 近期活动（PUBLISHED 未结束前 5 场·横滑，空则不渲染） -->
        <view v-if="upcomingEvents.length" class="sd-events">
          <view class="sd-events-head">
            <text class="sd-events-title">近期活动</text>
            <text class="sd-events-more" @tap="goEvents">全部</text>
          </view>
          <scroll-view scroll-x class="sd-events-scroll" :show-scrollbar="false">
            <view class="sd-events-row">
              <view v-for="e in upcomingEvents" :key="e.id" class="sd-event-card" @tap="goEvent(e.id)">
                <view class="sd-event-cover">
                  <image lazy-load v-if="e.cover" :src="e.cover" class="sd-event-cover-img" mode="aspectFill" />
                  <app-icon v-else name="sparkles" :size="24" color="#d8b48a" />
                  <text class="sd-event-type" :style="{ color: getEventTypeStyle(e.type).color, background: getEventTypeStyle(e.type).bg }">{{ getEventTypeLabel(e.type) }}</text>
                </view>
                <view class="sd-event-info">
                  <text class="sd-event-name">{{ e.title }}</text>
                  <text class="sd-event-time">{{ fmtCourseTime(e.startTime) }}</text>
                  <view class="sd-event-bottom">
                    <text class="sd-event-price">{{ num(e.price) === 0 ? '免费' : '¥' + formatPrice(e.price) }}</text>
                    <text class="sd-event-reg">{{ e._count?.registrations ?? 0 }}/{{ e.maxAttendees }}</text>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- Tab 切换 -->
        <view class="sd-tabs">
          <view
            v-for="tab in tabs"
            :key="tab.value"
            class="sd-tab"
            :class="{ active: activeTab === tab.value }"
            @tap="activeTab = tab.value"
          >
            <app-icon :name="tab.icon" :size="16" :color="activeTab === tab.value ? '#c41e3a' : '#9ca3af'" />
            <text class="sd-tab-label" :class="{ active: activeTab === tab.value }">{{ tab.label }}</text>
          </view>
        </view>

        <!-- Tab 内容 -->
        <view class="sd-content">
          <!-- 介绍 -->
          <view v-if="activeTab === 'intro'" class="sd-intro">
            <view v-if="station.owner" class="sd-card">
              <text class="sd-card-title">驿站运营者</text>
              <view class="sd-manager">
                <image lazy-load v-if="station.owner.avatar" :src="station.owner.avatar" class="sd-avatar-img" mode="aspectFill" />
                <view v-else class="sd-avatar"><text class="sd-avatar-text">{{ (station.owner.nickname || '驿')[0] }}</text></view>
                <view>
                  <text class="sd-manager-name">{{ station.owner.nickname || '驿站运营者' }}</text>
                  <text class="sd-manager-title">驿站主理人</text>
                </view>
              </view>
            </view>

            <view v-if="station.facilities && station.facilities.length" class="sd-card">
              <text class="sd-card-title">设施服务</text>
              <view class="sd-facilities">
                <view v-for="f in station.facilities" :key="f" class="sd-facility">
                  <view class="sd-fac-icon"><app-icon :name="getFacilityInfo(f).icon" :size="20" color="#c41e3a" /></view>
                  <text class="sd-fac-label">{{ getFacilityInfo(f).label }}</text>
                </view>
              </view>
            </view>

            <view v-if="station.intro" class="sd-card">
              <text class="sd-card-title">驿站介绍</text>
              <text class="sd-desc">{{ station.intro }}</text>
            </view>
          </view>

          <!-- 课程 -->
          <view v-else-if="activeTab === 'courses'" class="sd-courses">
            <view v-if="station.courses.length === 0" class="sd-tab-empty"><text class="sd-tab-empty-text">暂无课程</text></view>
            <view v-for="c in station.courses" :key="c.id" class="sd-course" @tap="goCourse(c.id)">
              <view class="sd-course-thumb"><app-icon name="graduation-cap" :size="24" color="#d8b48a" /></view>
              <view class="sd-course-info">
                <text class="sd-course-name">{{ c.title }}</text>
                <text class="sd-course-meta">{{ c.teacher?.name || '待定讲师' }} · {{ fmtCourseTime(c.startTime) }}</text>
                <view class="sd-course-bottom">
                  <text class="sd-course-price">{{ num(c.price) === 0 ? '免费' : '¥' + formatPrice(c.price) }}</text>
                  <text class="sd-course-tag" :style="{ color: courseStatusStyle[deriveCourseStatus(c)].color, background: courseStatusStyle[deriveCourseStatus(c)].bg }">{{ courseStatusLabel[deriveCourseStatus(c)] }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 商品 -->
          <view v-else-if="activeTab === 'products'" class="sd-products">
            <view v-if="station.products.length === 0" class="sd-tab-empty"><text class="sd-tab-empty-text">暂无商品</text></view>
            <view v-for="p in station.products" :key="p.id" class="sd-product">
              <view class="sd-product-thumb"><app-icon name="shopping-bag" :size="28" color="#d8b48a" /></view>
              <view class="sd-product-info">
                <text class="sd-product-name">{{ p.name }}</text>
                <view class="sd-product-row">
                  <text class="sd-product-price">¥{{ formatPrice(p.price) }}</text>
                  <text class="sd-product-stock">库存 {{ p.stock }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 讲师 -->
          <view v-else class="sd-instructors">
            <view v-if="teachers.length === 0" class="sd-tab-empty"><text class="sd-tab-empty-text">暂无驻场讲师</text></view>
            <!-- 签约讲师（有平台 userId）可点击进讲师公开主页；驿站自建讲师无主页不可点 -->
            <view v-for="ins in teachers" :key="ins.id" class="sd-instructor" @tap="goTeacherProfile(ins)">
              <image lazy-load v-if="ins.avatar" :src="ins.avatar" class="sd-avatar-img lg" mode="aspectFill" />
              <view v-else class="sd-avatar lg"><text class="sd-avatar-text">{{ ins.name[0] }}</text></view>
              <view class="sd-ins-info">
                <view class="sd-ins-name-row">
                  <text class="sd-ins-name">{{ ins.name }}</text>
                  <text v-if="ins.sourceUserId" class="sd-signed-badge">研究院签约</text>
                </view>
                <text class="sd-ins-spec">{{ ins.specialties.length ? ins.specialties.join(' · ') : '国学讲师' }}</text>
              </view>
              <view class="sd-ins-btn" @tap.stop="goBooking(ins.id)"><text class="sd-ins-btn-text">预约</text></view>
            </view>
          </view>
        </view>
        <view class="sd-safe" />
      </scroll-view>

      <!-- 底部固定操作栏 -->
      <view class="sd-footer">
        <view class="sd-foot-btn ghost" @tap="onCall">
          <app-icon name="phone" :size="16" color="#1a1a1a" />
          <text class="sd-foot-btn-text">联系驿站</text>
        </view>
        <view class="sd-foot-btn primary" @tap="goBooking()">
          <app-icon name="calendar" :size="16" color="#fff" />
          <text class="sd-foot-btn-text primary">预约讲师</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { useShare } from '@/composables/useShare'
import {
  offlineApi, getStationTypeLabel, getFacilityInfo, stationStatusLabel,
  deriveCourseStatus, courseStatusLabel, courseStatusStyle, fmtCourseTime, num,
  getEventTypeLabel, getEventTypeStyle,
  type StationDetail, type StationTeacherLite, type StationEvent,
} from '@/lib/offline-data'
import { formatPrice } from '@/utils/format'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

const loading = ref(true)
const errMsg = ref('')
const stationId = ref('')
const station = ref<StationDetail | null>(null)
const teachers = ref<StationTeacherLite[]>([])
const upcomingEvents = ref<StationEvent[]>([])

type TabType = 'intro' | 'courses' | 'products' | 'instructors'
const tabs: { value: TabType; label: string; icon: string }[] = [
  { value: 'intro', label: '介绍', icon: 'image' },
  { value: 'courses', label: '课程', icon: 'graduation-cap' },
  { value: 'products', label: '商品', icon: 'shopping-bag' },
  { value: 'instructors', label: '讲师', icon: 'user' },
]
const activeTab = ref<TabType>('intro')

async function load() {
  if (!stationId.value) { loading.value = false; errMsg.value = '缺少驿站参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    const [s, t, ev] = await Promise.all([
      offlineApi.getStation(stationId.value),
      offlineApi.getStationTeachers(stationId.value).catch(() => []),
      // 近期活动为增益区块：失败/空不阻塞详情，不渲染即诚实降级
      offlineApi.getEvents({ stationId: stationId.value, page: 1, pageSize: 20 }).catch(() => ({ items: [] as StationEvent[], total: 0 })),
    ])
    station.value = s
    teachers.value = t
    const nowTs = Date.now()
    upcomingEvents.value = ev.items
      .filter((e) => e.status === 'PUBLISHED' && new Date(e.endTime).getTime() > nowTs)
      .slice(0, 5)
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
    station.value = null
  } finally {
    loading.value = false
  }
}
onLoad((q) => {
  stationId.value = q && q.id ? String(q.id) : ''
  load()
})

const ratingRounded = computed(() => Math.round(station.value?.rating?.avg || 0))

// 微信原生分享（好友/朋友圈）—— 路径由 useShare 自动携带分享者 ref（推广归因）
const { toAppMessage, toTimeline } = useShare()
const shareTitle = () => station.value?.name || '国学驿站'
const shareSummary = () => {
  const intro = station.value?.intro || ''
  return intro.length > 40 ? intro.slice(0, 40) + '…' : intro || undefined
}
onShareAppMessage(() => toAppMessage({
  title: shareTitle(),
  summary: shareSummary(),
  path: `/offline/stations/${stationId.value}`,
  cover: station.value?.cover || undefined,
}))
onShareTimeline(() => toTimeline({
  title: shareTitle(),
  summary: shareSummary(),
  path: `/offline/stations/${stationId.value}`,
  cover: station.value?.cover || undefined,
}))

function onCall() {
  if (station.value?.phone) uni.makePhoneCall({ phoneNumber: station.value.phone }).catch(() => {})
}
function goCourse(id: string) { navigateTo(`/offline/courses/${id}`) }
function goEvent(id: string) { navigateTo(`/pkg-offline/events/detail?id=${id}`) }
function goEvents() { navigateTo(`/offline/events?stationId=${stationId.value}`) }
/** 讲师公开主页：仅签约讲师（sourceUserId 非空=平台认证讲师）可点，自建讲师无主页不跳转 */
function goTeacherProfile(ins: StationTeacherLite) {
  if (!ins.sourceUserId) return
  navigateTo(`/pkg-creator/teacher-profile/index?userId=${ins.sourceUserId}`)
}

function goBooking(teacherId?: string) {
  const base = `/offline/teacher-booking?stationId=${stationId.value}`
  navigateTo(teacherId ? `${base}&teacherId=${teacherId}` : base)
}
</script>

<style scoped>
.sd-page { min-height: 100vh; background: #f5f5f7; display: flex; flex-direction: column; }
.sd-header { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.92); backdrop-filter: blur(8px); border-bottom: 1px solid #ededed; }
.sd-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.sd-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.sd-nav-title { flex: 1; text-align: center; font-size: 16px; font-weight: 600; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 8px; }
.sd-body { flex: 1; }

.sd-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding-top: 120px; }
.sd-state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }

.sd-cover { position: relative; width: 100%; aspect-ratio: 2 / 1; background: #f3f0ea; display: flex; align-items: center; justify-content: center; }
.sd-cover-img { width: 100%; height: 100%; }
.sd-cover-badge { position: absolute; top: 12px; left: 12px; padding: 3px 10px; font-size: 12px; color: #fff; background: var(--brand); border-radius: 6px; }
.sd-cover-status { position: absolute; top: 12px; right: 12px; padding: 3px 10px; font-size: 12px; color: #fff; background: rgba(0,0,0,0.5); border-radius: 6px; }
.sd-info { padding: 16px; background: #fff; }
.sd-name { font-size: 20px; font-weight: 700; color: #1a1a1a; }
.sd-rating-row { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.sd-stars { display: flex; align-items: center; gap: 2px; }
.sd-rating-avg { font-size: 14px; font-weight: 700; color: #f59e0b; }
.sd-rating-count { font-size: 12px; color: #9ca3af; }
.sd-row { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; }
.sd-row-text { flex: 1; font-size: 13px; color: #6b7280; line-height: 1.5; }
.sd-phone { margin-top: 8px; }
.sd-phone-text { font-size: 13px; color: var(--brand); }
.sd-hours { margin-top: 8px; }
.sd-hours-list { display: flex; flex-direction: column; gap: 2px; }
.sd-hour { font-size: 13px; color: #6b7280; }
.sd-hour.closed { color: #9ca3af; }
.sd-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.sd-tag { padding: 3px 10px; font-size: 12px; color: #6b7280; background: #f3f4f6; border-radius: 6px; }
/* ===== 近期活动横滑区 ===== */
.sd-events { background: #fff; margin-top: 8px; padding: 14px 0 16px; }
.sd-events-head { display: flex; align-items: center; justify-content: space-between; padding: 0 16px 10px; }
.sd-events-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.sd-events-more { font-size: 12px; color: var(--brand); }
.sd-events-scroll { white-space: nowrap; }
.sd-events-row { display: flex; gap: 10px; padding: 0 16px; }
.sd-event-card { flex-shrink: 0; width: 168px; background: #faf9f6; border: 1px solid #f0ece3; border-radius: 12px; overflow: hidden; }
.sd-event-cover { position: relative; width: 100%; height: 84px; background: #f3f0ea; display: flex; align-items: center; justify-content: center; }
.sd-event-cover-img { width: 100%; height: 100%; }
.sd-event-type { position: absolute; top: 6px; left: 6px; padding: 1px 8px; font-size: 10px; border-radius: 4px; }
.sd-event-info { padding: 8px 10px 10px; }
.sd-event-name { display: block; font-size: 13px; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-event-time { display: block; font-size: 11px; color: #9ca3af; margin-top: 3px; }
.sd-event-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
.sd-event-price { font-size: 13px; font-weight: 600; color: var(--brand); }
.sd-event-reg { font-size: 10px; color: #9ca3af; }
.sd-tabs { position: sticky; top: 48px; z-index: 40; display: flex; background: #fff; border-bottom: 1px solid #ededed; margin-top: 8px; }
.sd-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 12px 0; border-bottom: 2px solid transparent; }
.sd-tab.active { border-bottom-color: var(--brand); }
.sd-tab-label { font-size: 14px; font-weight: 500; color: #9ca3af; }
.sd-tab-label.active { color: var(--brand); }
.sd-content { padding: 16px; }
.sd-tab-empty { padding: 48px 0; display: flex; justify-content: center; }
.sd-tab-empty-text { font-size: 13px; color: #9ca3af; }
.sd-intro { display: flex; flex-direction: column; gap: 16px; }
.sd-card { background: #fff; border-radius: 12px; padding: 16px; }
.sd-card-title { font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.sd-manager { display: flex; align-items: center; gap: 12px; }
.sd-avatar { width: 48px; height: 48px; border-radius: 999px; background: var(--brand); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sd-avatar.lg { width: 56px; height: 56px; }
.sd-avatar-img { width: 48px; height: 48px; border-radius: 999px; flex-shrink: 0; }
.sd-avatar-img.lg { width: 56px; height: 56px; }
.sd-avatar-text { font-size: 16px; color: #fff; font-weight: 600; }
.sd-manager-name { display: block; font-size: 15px; font-weight: 500; color: #1a1a1a; }
.sd-manager-title { display: block; font-size: 13px; color: #9ca3af; margin-top: 2px; }
.sd-facilities { display: flex; flex-wrap: wrap; }
.sd-facility { width: 25%; display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: 12px; }
.sd-fac-icon { width: 40px; height: 40px; border-radius: 999px; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; }
.sd-fac-label { font-size: 12px; color: #9ca3af; }
.sd-desc { font-size: 14px; color: #6b7280; line-height: 1.7; }
.sd-courses { display: flex; flex-direction: column; gap: 16px; }
.sd-course { display: flex; gap: 12px; background: #fff; border-radius: 12px; padding: 16px; }
.sd-course-thumb { width: 80px; height: 80px; border-radius: 8px; background: #f3f0ea; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sd-course-info { flex: 1; min-width: 0; }
.sd-course-name { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.sd-course-meta { display: block; font-size: 12px; color: #9ca3af; margin-top: 4px; }
.sd-course-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.sd-course-price { font-size: 15px; font-weight: 600; color: var(--brand); }
.sd-course-tag { padding: 1px 8px; font-size: 11px; border-radius: 4px; }
.sd-products { display: flex; flex-wrap: wrap; gap: 12px; }
.sd-product { width: calc(50% - 6px); background: #fff; border-radius: 12px; overflow: hidden; }
.sd-product-thumb { width: 100%; aspect-ratio: 1; background: #f3f0ea; display: flex; align-items: center; justify-content: center; }
.sd-product-info { padding: 12px; }
.sd-product-name { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; line-height: 1.4; }
.sd-product-row { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
.sd-product-price { font-size: 15px; font-weight: 600; color: var(--brand); }
.sd-product-stock { font-size: 11px; color: #9ca3af; }
.sd-instructors { display: flex; flex-direction: column; gap: 16px; }
.sd-instructor { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; padding: 16px; }
.sd-ins-info { flex: 1; min-width: 0; }
.sd-ins-name-row { display: flex; align-items: center; gap: 6px; }
.sd-ins-name { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.sd-signed-badge { font-size: 10px; padding: 1px 6px; color: var(--brand); background: rgba(196,30,58,0.1); border-radius: 4px; }
.sd-ins-spec { display: block; font-size: 13px; color: #9ca3af; margin-top: 2px; }
.sd-ins-btn { padding: 6px 18px; background: var(--brand); border-radius: 999px; flex-shrink: 0; }
.sd-ins-btn-text { font-size: 14px; color: #fff; }
.sd-safe { height: 88px; }
.sd-footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 12px; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ededed; }
.sd-foot-btn { flex: 1; height: 44px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 8px; }
.sd-foot-btn.ghost { background: #f3f4f6; }
.sd-foot-btn.primary { background: var(--brand); }
.sd-foot-btn-text { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.sd-foot-btn-text.primary { color: #fff; }
</style>
