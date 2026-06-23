<template>
  <view class="sd-page">
    <!-- 顶部导航 -->
    <view class="sd-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="sd-nav">
        <view class="sd-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="sd-nav-title">{{ station?.name || '驿站详情' }}</text>
        <view class="sd-nav-actions">
          <view class="sd-icon-btn" @tap="onShare">
            <app-icon name="share-2" :size="20" color="#1a1a1a" />
          </view>
          <view class="sd-icon-btn" @tap="toggleFav">
            <app-icon name="heart" :size="20" :color="station?.isFavorited ? '#ef4444' : '#1a1a1a'" :fill="station?.isFavorited" />
          </view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="sd-body">
      <!-- 加载骨架 -->
      <view v-if="loading" class="sd-skeleton">
        <view class="sd-sk-cover" />
        <view class="sd-sk-info">
          <view class="sd-sk-line w50" />
          <view class="sd-sk-line w30" />
          <view class="sd-sk-line w80" />
          <view class="sd-sk-line w60" />
        </view>
      </view>

      <!-- 错误状态 -->
      <view v-else-if="error" class="sd-error">
        <app-icon name="alert-circle" :size="48" color="#ef4444" />
        <text class="sd-error-text">加载失败，请重试</text>
        <view class="sd-retry-btn" @tap="retryLoad">
          <text class="sd-retry-text">重新加载</text>
        </view>
      </view>

      <!-- 正常内容 -->
      <template v-else-if="station">
      <!-- 封面 -->
      <view class="sd-cover">
        <app-icon name="map-pin" :size="48" color="#d8b48a" />
        <text class="sd-cover-badge">{{ getStationTypeLabel(station.type) }}</text>
      </view>

      <!-- 基本信息 -->
      <view class="sd-info">
        <text class="sd-name">{{ station.name }}</text>
        <view class="sd-rating">
          <app-icon name="star" :size="16" color="#f59e0b" :fill="true" />
          <text class="sd-rating-val">{{ station.rating }}</text>
          <text class="sd-rating-cnt">({{ station.reviewCount }}条评价)</text>
          <text v-if="station.distance" class="sd-dot">·</text>
          <text v-if="station.distance" class="sd-dist">{{ formatDistance(station.distance) }}</text>
        </view>
        <view class="sd-row">
          <app-icon name="map-pin" :size="16" color="#9ca3af" />
          <text class="sd-row-text">{{ station.address }}</text>
        </view>
        <view class="sd-row sd-phone" @tap="onCall">
          <app-icon name="phone" :size="16" color="#c41e3a" />
          <text class="sd-phone-text">{{ station.phone }}</text>
        </view>
        <view class="sd-row sd-hours">
          <app-icon name="clock" :size="16" color="#9ca3af" />
          <view class="sd-hours-list">
            <text v-for="(bh, i) in station.businessHours" :key="i" class="sd-hour" :class="{ closed: !bh.isOpen }">
              {{ bh.day }}: {{ bh.isOpen ? bh.open + '-' + bh.close : '休息' }}
            </text>
          </view>
        </view>
        <view class="sd-tags">
          <text v-for="tag in station.tags" :key="tag" class="sd-tag">{{ tag }}</text>
        </view>
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
          <view class="sd-card">
            <text class="sd-card-title">驿站主理人</text>
            <view class="sd-manager">
              <view class="sd-avatar"><text class="sd-avatar-text">{{ station.manager.name[0] }}</text></view>
              <view>
                <text class="sd-manager-name">{{ station.manager.name }}</text>
                <text class="sd-manager-title">{{ station.manager.title }}</text>
              </view>
            </view>
          </view>

          <view class="sd-card">
            <text class="sd-card-title">设施服务</text>
            <view class="sd-facilities">
              <view v-for="f in station.facilities" :key="f" class="sd-facility">
                <view class="sd-fac-icon"><app-icon :name="getFacilityInfo(f).icon" :size="20" color="#c41e3a" /></view>
                <text class="sd-fac-label">{{ getFacilityInfo(f).label }}</text>
              </view>
            </view>
          </view>

          <view class="sd-card">
            <text class="sd-card-title">驿站介绍</text>
            <text class="sd-desc">{{ station.description }}</text>
          </view>

          <view class="sd-card">
            <view class="sd-card-head">
              <text class="sd-card-title">近期活动</text>
              <view class="sd-more" @tap="goEvents">
                <text class="sd-more-text">更多</text>
                <app-icon name="chevron-right" :size="16" color="#c41e3a" />
              </view>
            </view>
            <view class="sd-events">
              <view v-for="e in station.upcomingEvents" :key="e.id" class="sd-event">
                <view class="sd-event-icon"><app-icon name="calendar" :size="20" color="#c41e3a" /></view>
                <view class="sd-event-info">
                  <text class="sd-event-title">{{ e.title }}</text>
                  <text class="sd-event-date">{{ e.date }}</text>
                </view>
                <text class="sd-event-tag">{{ e.type === 'course' ? '课程' : '活动' }}</text>
              </view>
            </view>
          </view>

          <view class="sd-card">
            <text class="sd-card-title">用户评价</text>
            <view class="sd-reviews">
              <view v-for="r in station.reviews" :key="r.id" class="sd-review">
                <view class="sd-review-head">
                  <view class="sd-avatar sm"><text class="sd-avatar-text">{{ r.user.name[0] }}</text></view>
                  <view class="sd-review-meta">
                    <text class="sd-review-name">{{ r.user.name }}</text>
                    <view class="sd-stars">
                      <app-icon v-for="i in 5" :key="i" name="star" :size="12" :color="i <= r.rating ? '#f59e0b' : '#d1d5db'" :fill="i <= r.rating" />
                    </view>
                  </view>
                  <text class="sd-review-time">{{ r.time }}</text>
                </view>
                <text class="sd-review-content">{{ r.content }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 课程 -->
        <view v-else-if="activeTab === 'courses'" class="sd-courses">
          <view v-for="i in 3" :key="i" class="sd-course">
            <view class="sd-course-thumb"><app-icon name="graduation-cap" :size="24" color="#d8b48a" /></view>
            <view class="sd-course-info">
              <text class="sd-course-name">八字命理实战研修班（第{{ i }}期）</text>
              <text class="sd-course-meta">张明德老师 · 2026年6月{{ 10 + i }}日</text>
              <view class="sd-course-bottom">
                <text class="sd-course-price">¥1980</text>
                <text class="sd-course-tag">报名中</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 商品 -->
        <view v-else-if="activeTab === 'products'" class="sd-products">
          <view v-for="i in 4" :key="i" class="sd-product">
            <view class="sd-product-thumb"><app-icon name="shopping-bag" :size="28" color="#d8b48a" /></view>
            <view class="sd-product-info">
              <text class="sd-product-name">驿站特色商品{{ i }}</text>
              <text class="sd-product-price">¥{{ 99 * i }}</text>
            </view>
          </view>
        </view>

        <!-- 讲师 -->
        <view v-else class="sd-instructors">
          <view v-for="ins in station.instructors" :key="ins.id" class="sd-instructor">
            <view class="sd-avatar lg"><text class="sd-avatar-text">{{ ins.name[0] }}</text></view>
            <view class="sd-ins-info">
              <text class="sd-ins-name">{{ ins.name }}</text>
              <text class="sd-ins-spec">{{ ins.specialty }}</text>
            </view>
            <view class="sd-ins-btn" @tap="onBook(ins)"><text class="sd-ins-btn-text">预约</text></view>
          </view>
        </view>
      </view>
      <view class="sd-safe" />
      </template>
    </scroll-view>

    <!-- 底部固定操作栏 -->
    <view class="sd-footer">
      <view class="sd-foot-btn ghost" @tap="onCall">
        <app-icon name="phone" :size="16" color="#1a1a1a" />
        <text class="sd-foot-btn-text">联系客服</text>
      </view>
      <view class="sd-foot-btn primary" @tap="onNavigate">
        <app-icon name="navigation" :size="16" color="#fff" />
        <text class="sd-foot-btn-text primary">导航到驿站</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  offlineApi,
  getStationTypeLabel,
  getFacilityInfo,
  formatDistance,
  type StationDetail,
  type StationInstructor,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

const station = ref<StationDetail | null>(null)
const loading = ref(true)
const error = ref(false)

onLoad(async (q) => {
  const id = q && q.id ? Number(q.id) : 1
  try {
    station.value = await offlineApi.getStation(id)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

type TabType = 'intro' | 'courses' | 'products' | 'instructors'
const tabs: { value: TabType; label: string; icon: string }[] = [
  { value: 'intro', label: '介绍', icon: 'image' },
  { value: 'courses', label: '课程', icon: 'graduation-cap' },
  { value: 'products', label: '商品', icon: 'shopping-bag' },
  { value: 'instructors', label: '讲师', icon: 'user' },
]
const activeTab = ref<TabType>('intro')

const submitting = ref(false)
function toggleFav() {
  if (!station.value) return
  station.value.isFavorited = !station.value.isFavorited
  uni.showToast({ title: station.value.isFavorited ? '已收藏' : '已取消收藏', icon: 'none' })
}
function onShare() { uni.showToast({ title: '链接已复制', icon: 'none' }) }
function onCall() { if (station.value) uni.makePhoneCall({ phoneNumber: station.value.phone }).catch(() => {}) }
function onNavigate() { if (station.value) uni.showToast({ title: `导航到「${station.value.name}」`, icon: 'none' }) }
function goEvents() { navigateTo('/offline/events') }
function onBook(ins: StationInstructor) { uni.showToast({ title: `预约「${ins.name}」`, icon: 'none' }) }
async function retryLoad() {
  error.value = false
  loading.value = true
  try {
    station.value = await offlineApi.getStation(station.value?.id || 1)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.sd-page { min-height: 100vh; background: #f5f5f7; display: flex; flex-direction: column; }
.sd-header { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.92); backdrop-filter: blur(8px); border-bottom: 1px solid #ededed; }
.sd-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.sd-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.sd-nav-title { flex: 1; text-align: center; font-size: 16px; font-weight: 600; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 8px; }
.sd-nav-actions { display: flex; align-items: center; }
.sd-body { flex: 1; }
.sd-cover { position: relative; width: 100%; aspect-ratio: 2 / 1; background: #f3f0ea; display: flex; align-items: center; justify-content: center; }
.sd-cover-badge { position: absolute; top: 12px; left: 12px; padding: 3px 10px; font-size: 12px; color: #fff; background: #c41e3a; border-radius: 6px; }
.sd-info { padding: 16px; background: #fff; }
.sd-name { font-size: 20px; font-weight: 700; color: #1a1a1a; }
.sd-rating { display: flex; align-items: center; gap: 4px; margin-top: 8px; }
.sd-rating-val { font-size: 14px; font-weight: 500; color: #f59e0b; }
.sd-rating-cnt { font-size: 13px; color: #9ca3af; }
.sd-dot { color: #9ca3af; }
.sd-dist { font-size: 13px; color: #c41e3a; }
.sd-row { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; }
.sd-row-text { flex: 1; font-size: 13px; color: #6b7280; line-height: 1.5; }
.sd-phone { margin-top: 8px; }
.sd-phone-text { font-size: 13px; color: #c41e3a; }
.sd-hours { margin-top: 8px; }
.sd-hours-list { display: flex; flex-direction: column; gap: 2px; }
.sd-hour { font-size: 13px; color: #6b7280; }
.sd-hour.closed { color: #9ca3af; }
.sd-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.sd-tag { padding: 3px 10px; font-size: 12px; color: #6b7280; background: #f3f4f6; border-radius: 6px; }
.sd-tabs { position: sticky; top: 48px; z-index: 40; display: flex; background: #fff; border-bottom: 1px solid #ededed; margin-top: 8px; }
.sd-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 12px 0; border-bottom: 2px solid transparent; }
.sd-tab.active { border-bottom-color: #c41e3a; }
.sd-tab-label { font-size: 14px; font-weight: 500; color: #9ca3af; }
.sd-tab-label.active { color: #c41e3a; }
.sd-content { padding: 16px; }
.sd-intro { display: flex; flex-direction: column; gap: 16px; }
.sd-card { background: #fff; border-radius: 12px; padding: 16px; }
.sd-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.sd-card-title { font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.sd-card-head .sd-card-title { margin-bottom: 0; }
.sd-more { display: flex; align-items: center; gap: 2px; }
.sd-more-text { font-size: 13px; color: #c41e3a; }
.sd-manager { display: flex; align-items: center; gap: 12px; }
.sd-avatar { width: 48px; height: 48px; border-radius: 999px; background: #c41e3a; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sd-avatar.sm { width: 32px; height: 32px; }
.sd-avatar.lg { width: 56px; height: 56px; }
.sd-avatar-text { font-size: 16px; color: #fff; font-weight: 600; }
.sd-manager-name { display: block; font-size: 15px; font-weight: 500; color: #1a1a1a; }
.sd-manager-title { display: block; font-size: 13px; color: #9ca3af; margin-top: 2px; }
.sd-facilities { display: flex; flex-wrap: wrap; }
.sd-facility { width: 25%; display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: 12px; }
.sd-fac-icon { width: 40px; height: 40px; border-radius: 999px; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; }
.sd-fac-label { font-size: 12px; color: #9ca3af; }
.sd-desc { font-size: 14px; color: #6b7280; line-height: 1.7; }
.sd-events { display: flex; flex-direction: column; gap: 12px; }
.sd-event { display: flex; align-items: center; gap: 12px; }
.sd-event-icon { width: 40px; height: 40px; border-radius: 8px; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; }
.sd-event-info { flex: 1; }
.sd-event-title { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.sd-event-date { display: block; font-size: 12px; color: #9ca3af; margin-top: 2px; }
.sd-event-tag { padding: 1px 8px; font-size: 11px; color: #6b7280; border: 1px solid #e5e7eb; border-radius: 4px; }
.sd-reviews { display: flex; flex-direction: column; gap: 16px; }
.sd-review { padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
.sd-review:last-child { padding-bottom: 0; border-bottom: none; }
.sd-review-head { display: flex; align-items: center; gap: 8px; }
.sd-review-meta { flex: 1; }
.sd-review-name { display: block; font-size: 13px; font-weight: 500; color: #1a1a1a; }
.sd-stars { display: flex; align-items: center; gap: 1px; margin-top: 2px; }
.sd-review-time { font-size: 12px; color: #9ca3af; }
.sd-review-content { display: block; font-size: 13px; color: #6b7280; margin-top: 8px; line-height: 1.6; }
.sd-courses { display: flex; flex-direction: column; gap: 16px; }
.sd-course { display: flex; gap: 12px; background: #fff; border-radius: 12px; padding: 16px; }
.sd-course-thumb { width: 80px; height: 80px; border-radius: 8px; background: #f3f0ea; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sd-course-info { flex: 1; }
.sd-course-name { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.sd-course-meta { display: block; font-size: 12px; color: #9ca3af; margin-top: 4px; }
.sd-course-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.sd-course-price { font-size: 15px; font-weight: 600; color: #c41e3a; }
.sd-course-tag { padding: 1px 8px; font-size: 11px; color: #6b7280; border: 1px solid #e5e7eb; border-radius: 4px; }
.sd-products { display: flex; flex-wrap: wrap; gap: 12px; }
.sd-product { width: calc(50% - 6px); background: #fff; border-radius: 12px; overflow: hidden; }
.sd-product-thumb { width: 100%; aspect-ratio: 1; background: #f3f0ea; display: flex; align-items: center; justify-content: center; }
.sd-product-info { padding: 12px; }
.sd-product-name { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; line-height: 1.4; }
.sd-product-price { display: block; font-size: 15px; font-weight: 600; color: #c41e3a; margin-top: 4px; }
.sd-instructors { display: flex; flex-direction: column; gap: 16px; }
.sd-instructor { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; padding: 16px; }
.sd-ins-info { flex: 1; }
.sd-ins-name { display: block; font-size: 15px; font-weight: 500; color: #1a1a1a; }
.sd-ins-spec { display: block; font-size: 13px; color: #9ca3af; margin-top: 2px; }
.sd-ins-btn { padding: 6px 18px; background: #c41e3a; border-radius: 999px; }
.sd-ins-btn-text { font-size: 14px; color: #fff; }
.sd-safe { height: 88px; }
.sd-footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 12px; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ededed; }
.sd-foot-btn { flex: 1; height: 44px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 8px; }
.sd-foot-btn.ghost { background: #f3f4f6; }
.sd-foot-btn.primary { background: #c41e3a; }
.sd-foot-btn-text { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.sd-foot-btn-text.primary { color: #fff; }
/* 骨架屏 */
.sd-skeleton { padding: 0; }
.sd-sk-cover { width: 100%; aspect-ratio: 2 / 1; background: #e5e7eb; animation: sd-sk-pulse 1.5s ease-in-out infinite; }
.sd-sk-info { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.sd-sk-line { height: 16px; background: #e5e7eb; border-radius: 4px; animation: sd-sk-pulse 1.5s ease-in-out infinite; }
.sd-sk-line.w50 { width: 50%; }
.sd-sk-line.w30 { width: 30%; }
.sd-sk-line.w60 { width: 60%; }
.sd-sk-line.w80 { width: 80%; }
@keyframes sd-sk-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
/* 错误/重试 */
.sd-error { padding: 80px 0; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.sd-error-text { font-size: 14px; color: #9ca3af; }
.sd-retry-btn { padding: 8px 24px; background: #c41e3a; border-radius: 8px; }
.sd-retry-text { font-size: 14px; color: #fff; }
</style>
