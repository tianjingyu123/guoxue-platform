<template>
  <view class="ev-page">
    <!-- 顶部导航 -->
    <view class="ev-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ev-nav">
        <view class="ev-icon-btn" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#1a1a1a" /></view>
        <text class="ev-nav-title">线下活动</text>
        <view class="ev-icon-btn" />
      </view>
      <!-- 类型筛选 tab -->
      <scroll-view scroll-x class="ev-tabs" :show-scrollbar="false">
        <view class="ev-tabs-row">
          <view
            v-for="f in eventTypeFilters"
            :key="f.value"
            class="ev-tab"
            :class="{ active: activeType === f.value }"
            @tap="switchType(f.value)"
          >
            <text class="ev-tab-text" :class="{ active: activeType === f.value }">{{ f.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <scroll-view scroll-y class="ev-body" @scrolltolower="loadMore">
      <!-- 三态 -->
      <view v-if="loading" class="ev-state"><view class="spinner" /><text class="ev-state-text">加载中…</text></view>
      <view v-else-if="error" class="ev-state">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" />
        <text class="ev-state-text">{{ error }}</text>
        <view class="retry-btn" @tap="refresh"><text class="retry-text">重试</text></view>
      </view>
      <view v-else-if="isEmpty" class="ev-state">
        <app-icon name="calendar" :size="48" color="#d1d5db" />
        <text class="ev-state-text">暂无{{ activeTypeLabel }}活动</text>
        <text class="ev-state-sub">各驿站的雅集、沙龙、读书会将在此发布，敬请期待</text>
      </view>

      <template v-else>
        <view class="ev-list">
          <view v-for="e in list" :key="e.id" class="ev-card" @tap="goDetail(e.id)">
            <view class="ev-cover">
              <image lazy-load v-if="e.cover" :src="e.cover" class="ev-cover-img" mode="aspectFill" />
              <app-icon v-else name="sparkles" :size="36" color="#d8b48a" />
              <text class="ev-type-tag" :style="{ color: getEventTypeStyle(e.type).color, background: getEventTypeStyle(e.type).bg }">{{ getEventTypeLabel(e.type) }}</text>
              <text v-if="num(e.price) === 0" class="ev-free-tag">免费</text>
            </view>
            <view class="ev-card-main">
              <text class="ev-card-title">{{ e.title }}</text>
              <view class="ev-card-row">
                <app-icon name="clock" :size="13" color="#9ca3af" />
                <text class="ev-card-meta">{{ eventTimeRange(e.startTime, e.endTime) }}</text>
              </view>
              <view class="ev-card-row">
                <app-icon name="map-pin" :size="13" color="#9ca3af" />
                <text class="ev-card-meta">{{ e.station?.name ? e.station.name + ' · ' : '' }}{{ e.location }}</text>
              </view>
              <!-- 报名进度 -->
              <view class="ev-progress-row">
                <view class="ev-progress-track">
                  <view class="ev-progress-fill" :style="{ width: progressPercent(e) + '%' }" />
                </view>
                <text class="ev-progress-text">{{ e._count?.registrations ?? 0 }}/{{ e.maxAttendees }}</text>
              </view>
              <view class="ev-card-foot">
                <text v-if="num(e.price) > 0" class="ev-price">¥{{ num(e.price) }}</text>
                <text v-else class="ev-price free">免费参加</text>
                <text class="ev-status" :style="{ color: courseStatusStyle[deriveEventStatus(e)].color, background: courseStatusStyle[deriveEventStatus(e)].bg }">{{ courseStatusLabel[deriveEventStatus(e)] }}</text>
              </view>
            </view>
          </view>
        </view>
        <app-load-more :status="loadStatus" />
      </template>
      <view class="ev-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoadMore from '@/components/common/app-load-more.vue'
import { goBack, navigateTo } from '@/utils/router'
import { useList } from '@/composables/useList'
import {
  offlineApi, eventTypeFilters, getEventTypeLabel, getEventTypeStyle,
  deriveEventStatus, courseStatusLabel, courseStatusStyle, eventTimeRange, num,
  type StationEvent, type StationEventType,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}

const stationId = ref('')
const activeType = ref<StationEventType | 'all'>('all')
const activeTypeLabel = computed(() => {
  const f = eventTypeFilters.find((x) => x.value === activeType.value)
  return f && f.value !== 'all' ? f.label : ''
})

const { list, loading, error, isEmpty, loadStatus, refresh, loadMore } = useList<StationEvent, { type: string; stationId: string }>({
  fetcher: ({ page, pageSize, type, stationId: sid }) =>
    offlineApi.getEvents({ page, pageSize, type, stationId: sid || undefined }),
  getParams: () => ({ type: activeType.value, stationId: stationId.value }),
})

onLoad((q) => {
  stationId.value = q && q.stationId ? String(q.stationId) : ''
  refresh()
})

function switchType(t: StationEventType | 'all') {
  if (activeType.value === t) return
  activeType.value = t
  refresh()
}

function progressPercent(e: StationEvent): number {
  if (!e.maxAttendees) return 0
  const p = ((e._count?.registrations ?? 0) / e.maxAttendees) * 100
  return Math.min(100, Math.max(0, Math.round(p)))
}

function goDetail(id: string) {
  navigateTo(`/pkg-offline/events/detail?id=${id}`)
}
</script>

<style scoped>
.ev-page { min-height: 100vh; background: #f5f5f7; display: flex; flex-direction: column; }
.ev-header { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #ededed; }
.ev-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.ev-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.ev-nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.ev-tabs { white-space: nowrap; }
.ev-tabs-row { display: flex; padding: 4px 12px 10px; gap: 8px; }
.ev-tab { flex-shrink: 0; padding: 6px 16px; background: #f3f4f6; border-radius: 999px; }
.ev-tab.active { background: var(--brand); }
.ev-tab-text { font-size: 13px; color: #6b7280; }
.ev-tab-text.active { color: #fff; font-weight: 500; }
.ev-body { flex: 1; height: 0; }

.ev-state { padding: 90px 40px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.ev-state-text { font-size: 13px; color: #9ca3af; }
.ev-state-sub { font-size: 12px; color: #c9beb2; text-align: center; line-height: 1.6; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 22px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }

.ev-list { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.ev-card { background: #fff; border-radius: 14px; overflow: hidden; }
.ev-cover { position: relative; width: 100%; aspect-ratio: 2 / 1; background: #f3f0ea; display: flex; align-items: center; justify-content: center; }
.ev-cover-img { width: 100%; height: 100%; }
.ev-type-tag { position: absolute; top: 10px; left: 10px; padding: 2px 10px; font-size: 11px; font-weight: 500; border-radius: 6px; }
.ev-free-tag { position: absolute; top: 10px; right: 10px; padding: 2px 10px; font-size: 11px; color: #fff; background: #22c55e; border-radius: 6px; }
.ev-card-main { padding: 12px 14px 14px; }
.ev-card-title { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; line-height: 1.4; }
.ev-card-row { display: flex; align-items: center; gap: 6px; margin-top: 7px; }
.ev-card-meta { flex: 1; font-size: 12px; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ev-progress-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.ev-progress-track { flex: 1; height: 6px; background: #f3f4f6; border-radius: 999px; overflow: hidden; }
.ev-progress-fill { height: 100%; background: linear-gradient(90deg, #d97706, #c41e3a); border-radius: 999px; }
.ev-progress-text { font-size: 11px; color: #9ca3af; flex-shrink: 0; }
.ev-card-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.ev-price { font-size: 16px; font-weight: 700; color: var(--brand); }
.ev-price.free { font-size: 13px; color: #16a34a; font-weight: 600; }
.ev-status { padding: 2px 8px; font-size: 11px; border-radius: 4px; }
.ev-safe { height: 24px; }
</style>
