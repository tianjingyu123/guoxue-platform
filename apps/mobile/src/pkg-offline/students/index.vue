<template>
  <view class="stu-page">
    <!-- 顶部导航 -->
    <app-nav-bar title="学员洞察" :show-back="true" background="#9a2e25" color="#ffffff" :no-border="true" />

    <scroll-view scroll-y class="stu-scroll" @scrolltolower="loadMore">
      <!-- 头部副标语 -->
      <view class="stu-hero">
        <text class="stu-hero-title">智能名片</text>
        <text class="stu-hero-sub">了解学员兴趣，精准运营驿站</text>
      </view>

      <!-- 合规提示 -->
      <view class="stu-privacy">
        <app-icon name="shield" :size="26" color="#A9741A" />
        <text class="stu-privacy-txt">仅可查看本驿站报名学员的学习经营分析数据，请勿外泄</text>
      </view>

      <!-- Loading -->
      <view v-if="loading" class="stu-state">
        <text class="stu-state-txt">加载中...</text>
      </view>

      <!-- Error：非驿站运营者走引导态，其余走重试 -->
      <view v-else-if="error" class="stu-state">
        <template v-if="noStation">
          <view class="stu-state-icon"><app-icon name="store" :size="60" color="#9a2e25" /></view>
          <text class="stu-state-title">你还不是驿站运营者</text>
          <text class="stu-state-sub">驿站以地级市为单位加盟经营，如需入驻请联系平台</text>
        </template>
        <template v-else>
          <text class="stu-state-error">{{ error }}</text>
          <view class="stu-state-btn" @tap="refresh"><text class="stu-state-btn-txt">重试</text></view>
        </template>
      </view>

      <!-- Empty -->
      <view v-else-if="isEmpty" class="stu-state">
        <view class="stu-state-icon"><app-icon name="users" :size="60" color="#9a2e25" /></view>
        <text class="stu-state-title">还没有报名学员</text>
        <text class="stu-state-sub">发布线下课程并推广，学员报名后即可沉淀洞察</text>
        <view class="stu-state-btn" @tap="goCourses"><text class="stu-state-btn-txt">去管理课程</text></view>
      </view>

      <!-- 学员列表 -->
      <template v-else>
        <view class="stu-total"><text class="stu-total-txt">共 {{ total }} 位报名学员 · 按最近活跃排序</text></view>

        <view v-for="s in list" :key="s.userId" class="stu-card" @tap="toggleTimeline(s)">
          <view class="stu-card-main">
            <!-- 头像：无则昵称首字圆底 -->
            <image v-if="s.avatar" lazy-load class="stu-avatar" :src="s.avatar" mode="aspectFill" />
            <view v-else class="stu-avatar stu-avatar-fallback"><text class="stu-avatar-char">{{ firstChar(s.nickname) }}</text></view>

            <view class="stu-info">
              <view class="stu-info-row">
                <text class="stu-name">{{ s.nickname }}</text>
                <text class="stu-active" :class="{ inactive: relTime(s.lastActiveAt) === '未活跃' }">{{ relTime(s.lastActiveAt) }}</text>
              </view>
              <!-- 兴趣标签（最多3个，赭金色调） -->
              <view v-if="s.interests.length" class="stu-tags">
                <view v-for="tag in s.interests.slice(0, 3)" :key="tag" class="stu-tag"><text class="stu-tag-txt">{{ tag }}</text></view>
              </view>
              <text v-else class="stu-no-tag">暂无兴趣画像</text>
            </view>

            <!-- 右侧消费概览 -->
            <view class="stu-spend">
              <text class="stu-spend-money">消费 ¥{{ fmtMoney(s.totalSpent) }}</text>
              <text class="stu-spend-orders">{{ s.orderCount }}单 · 30天{{ s.events30d }}次动作</text>
              <view class="stu-expand-hint">
                <app-icon :name="expandedId === s.userId ? 'chevron-up' : 'chevron-down'" :size="26" color="#bbb" />
              </view>
            </view>
          </view>

          <!-- 行为时间线（就地展开·首次点击才请求） -->
          <view v-if="expandedId === s.userId" class="stu-timeline" @tap.stop>
            <view v-if="timelineOf(s.userId).loading" class="stu-tl-loading"><text class="stu-tl-loading-txt">时间线加载中...</text></view>
            <view v-else-if="timelineOf(s.userId).error" class="stu-tl-loading">
              <text class="stu-tl-error-txt">{{ timelineOf(s.userId).error }}</text>
              <text class="stu-tl-retry" @tap.stop="fetchTimeline(s.userId)">重试</text>
            </view>
            <view v-else-if="!timelineOf(s.userId).events.length" class="stu-tl-loading"><text class="stu-tl-loading-txt">近期没有行为记录</text></view>
            <template v-else>
              <view v-for="(ev, i) in timelineOf(s.userId).events" :key="i" class="stu-tl-item">
                <view class="stu-tl-dot-col">
                  <view class="stu-tl-dot" />
                  <view v-if="i < timelineOf(s.userId).events.length - 1" class="stu-tl-line" />
                </view>
                <view class="stu-tl-body">
                  <text class="stu-tl-summary">{{ ev.summary }}</text>
                  <text class="stu-tl-time">{{ relTime(ev.occurredAt, true) }}</text>
                </view>
              </view>
            </template>
          </view>
        </view>

        <app-load-more :status="loadStatus" />
        <view class="stu-bottom-pad" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/** 驿站运营者端「学员洞察」：本驿站报名学员智能名片 + 行为时间线（真连 /offline/dashboard/students） */
import { ref, computed, onMounted } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoadMore from '@/components/common/app-load-more.vue'
import { navigateTo } from '@/utils/router'
import { useList } from '@/composables/useList'
import { studentInsightApi, type StationStudent, type StudentTimelineEvent } from '@/lib/offline-data'

// ===== 学员列表（useList 统一分页 + 三态） =====
const { list, total, loading, error, isEmpty, loadStatus, refresh, loadMore } = useList<StationStudent>({
  fetcher: ({ page, pageSize }) => studentInsightApi.list(page, pageSize),
})

// 非驿站运营者后端报「未找到关联驿站」→ 走入驻引导态而非普通错误
const noStation = computed(() => error.value.includes('关联驿站'))

onMounted(() => { refresh() })

function goCourses() {
  navigateTo('/pkg-offline/manage/index')
}

// ===== 行为时间线（就地展开，按需懒加载） =====
interface TimelineState {
  loading: boolean
  loaded: boolean
  error: string
  events: StudentTimelineEvent[]
}
const EMPTY_TL: TimelineState = { loading: false, loaded: false, error: '', events: [] }
const expandedId = ref('')
const timelines = ref<Record<string, TimelineState>>({})

function timelineOf(userId: string): TimelineState {
  return timelines.value[userId] || EMPTY_TL
}

/** 点击卡片展开/收起；首次展开才请求时间线 */
function toggleTimeline(s: StationStudent) {
  if (expandedId.value === s.userId) {
    expandedId.value = ''
    return
  }
  expandedId.value = s.userId
  const st = timelines.value[s.userId]
  if (!st || (!st.loaded && !st.loading)) void fetchTimeline(s.userId)
}

async function fetchTimeline(userId: string) {
  const cur = timelines.value[userId]
  if (cur?.loading) return // 防重复请求
  timelines.value[userId] = { loading: true, loaded: false, error: '', events: [] }
  try {
    const events = await studentInsightApi.timeline(userId)
    timelines.value[userId] = { loading: false, loaded: true, error: '', events }
  } catch (e) {
    timelines.value[userId] = { loading: false, loaded: false, error: (e as Error)?.message || '时间线加载失败', events: [] }
  }
}

// ===== 展示格式化 =====
/** 昵称首字（头像兜底圆底） */
function firstChar(name: string) {
  return (name || '学').trim().charAt(0) || '学'
}

/** 金额展示（元，千分位，最多两位小数） */
function fmtMoney(v: number) {
  return v.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

/**
 * 人性化相对时间：刚刚 / N分钟前 / N小时前 / N天前 / 未活跃。
 * withDate=true（时间线用）时超过30天回落为具体日期而非"未活跃"。
 */
function relTime(iso: string, withDate = false): string {
  if (!iso) return withDate ? '' : '未活跃'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return withDate ? '' : '未活跃'
  const diffMin = Math.floor((Date.now() - t) / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  const h = Math.floor(diffMin / 60)
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  if (d <= 30) return `${d}天前`
  return withDate ? String(iso).slice(0, 10) : '未活跃'
}
</script>

<style lang="scss" scoped>
.stu-page { min-height: 100vh; background: #f5f2ed; }
.stu-scroll { height: calc(100vh - var(--nav-bar-height, 88rpx)); }

/* 头部副标语（驿站赭红暖色） */
.stu-hero { padding: 28rpx 32rpx 88rpx; background: linear-gradient(135deg, #9a2e25 0%, #b8453a 100%); }
.stu-hero-title { display: block; font-size: 40rpx; font-weight: 700; color: #ffffff; }
.stu-hero-sub { display: block; margin-top: 10rpx; font-size: 24rpx; color: rgba(255, 255, 255, 0.85); }

/* 合规提示（浅色） */
.stu-privacy { display: flex; align-items: center; gap: 10rpx; margin: -56rpx 24rpx 24rpx; padding: 18rpx 24rpx; border-radius: 16rpx; background: #FBF3E2; border: 1rpx solid #F0DFBB; }
.stu-privacy-txt { flex: 1; font-size: 22rpx; color: #A9741A; }

/* 三态 */
.stu-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 48rpx; }
.stu-state-txt { font-size: 28rpx; color: #999; }
.stu-state-error { font-size: 28rpx; color: #ef4444; text-align: center; }
.stu-state-icon { width: 120rpx; height: 120rpx; border-radius: 32rpx; background: #f6e8e2; display: flex; align-items: center; justify-content: center; margin-bottom: 28rpx; }
.stu-state-title { font-size: 28rpx; font-weight: 600; color: #2a1f1a; text-align: center; }
.stu-state-sub { margin-top: 12rpx; font-size: 24rpx; color: #999; text-align: center; line-height: 1.6; }
.stu-state-btn { margin-top: 36rpx; padding: 18rpx 56rpx; border-radius: 999rpx; background: #9a2e25; }
.stu-state-btn-txt { font-size: 26rpx; font-weight: 600; color: #ffffff; }

/* 列表汇总条 */
.stu-total { padding: 0 32rpx 16rpx; }
.stu-total-txt { font-size: 22rpx; color: #999; }

/* 学员卡片 */
.stu-card { margin: 0 24rpx 20rpx; padding: 26rpx; border-radius: 24rpx; background: #ffffff; }
.stu-card-main { display: flex; align-items: flex-start; gap: 20rpx; }
.stu-avatar { width: 88rpx; height: 88rpx; border-radius: 50%; flex-shrink: 0; background: #f0f0f0; }
.stu-avatar-fallback { display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #9a2e25 0%, #b8453a 100%); }
.stu-avatar-char { font-size: 36rpx; font-weight: 700; color: #ffffff; }
.stu-info { flex: 1; min-width: 0; }
.stu-info-row { display: flex; align-items: center; gap: 14rpx; }
.stu-name { font-size: 28rpx; font-weight: 600; color: #2a1f1a; max-width: 240rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stu-active { font-size: 20rpx; color: #16a34a; flex-shrink: 0; }
.stu-active.inactive { color: #bbb; }

/* 兴趣标签（赭金色调） */
.stu-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 14rpx; }
.stu-tag { padding: 4rpx 18rpx; border-radius: 999rpx; background: #FBF3E2; border: 1rpx solid #F0DFBB; }
.stu-tag-txt { font-size: 20rpx; color: #A9741A; }
.stu-no-tag { display: block; margin-top: 14rpx; font-size: 20rpx; color: #ccc; }

/* 右侧消费概览 */
.stu-spend { display: flex; flex-direction: column; align-items: flex-end; gap: 8rpx; flex-shrink: 0; }
.stu-spend-money { font-size: 24rpx; font-weight: 700; color: #9a2e25; }
.stu-spend-orders { font-size: 20rpx; color: #999; }
.stu-expand-hint { margin-top: 2rpx; }

/* 行为时间线 */
.stu-timeline { margin-top: 22rpx; padding-top: 22rpx; border-top: 1rpx solid #f0f0f0; }
.stu-tl-loading { display: flex; align-items: center; justify-content: center; gap: 16rpx; padding: 20rpx 0; }
.stu-tl-loading-txt { font-size: 24rpx; color: #999; }
.stu-tl-error-txt { font-size: 24rpx; color: #ef4444; }
.stu-tl-retry { font-size: 24rpx; color: #9a2e25; font-weight: 600; }
.stu-tl-item { display: flex; gap: 18rpx; }
.stu-tl-dot-col { display: flex; flex-direction: column; align-items: center; width: 24rpx; flex-shrink: 0; padding-top: 10rpx; }
.stu-tl-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #9a2e25; flex-shrink: 0; }
.stu-tl-line { flex: 1; width: 2rpx; background: #ecd9d3; margin-top: 4rpx; }
.stu-tl-body { flex: 1; min-width: 0; padding-bottom: 24rpx; }
.stu-tl-summary { display: block; font-size: 25rpx; color: #333; line-height: 1.5; }
.stu-tl-time { display: block; margin-top: 6rpx; font-size: 20rpx; color: #bbb; }
.stu-tl-item:last-child .stu-tl-body { padding-bottom: 0; }

.stu-bottom-pad { height: 40rpx; }
</style>
