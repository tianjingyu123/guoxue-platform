<template>
  <view class="mi-page">
    <!-- 顶部导航 -->
    <app-nav-bar title="成员洞察" :show-back="true" background="#C41E3A" color="#ffffff" :no-border="true" />

    <scroll-view scroll-y class="mi-scroll" @scrolltolower="loadMore">
      <!-- 头部副标语 -->
      <view class="mi-hero">
        <text class="mi-hero-title">智能名片</text>
        <text class="mi-hero-sub">了解成员兴趣，精准运营你的圈子</text>
      </view>

      <!-- 合规提示 -->
      <view class="mi-privacy">
        <app-icon name="shield" :size="26" color="#A9741A" />
        <text class="mi-privacy-txt">仅圈主可查看本圈成员的社群经营分析数据，请勿外泄</text>
      </view>

      <!-- Loading -->
      <view v-if="loading" class="mi-state">
        <AppLoading />
      </view>

      <!-- Error：无权限走提示态，其余走重试 -->
      <view v-else-if="error" class="mi-state">
        <template v-if="forbidden">
          <view class="mi-state-icon"><app-icon name="lock" :size="60" color="#C41E3A" /></view>
          <text class="mi-state-title">仅圈主/管理员可查看成员洞察</text>
          <text class="mi-state-sub">经营数据涉及成员隐私，已做访问保护</text>
        </template>
        <template v-else>
          <text class="mi-state-error">{{ error }}</text>
          <view class="mi-state-btn" @tap="refresh"><text class="mi-state-btn-txt">重试</text></view>
        </template>
      </view>

      <!-- Empty -->
      <view v-else-if="isEmpty" class="mi-state">
        <view class="mi-state-icon"><app-icon name="users" :size="60" color="#C41E3A" /></view>
        <text class="mi-state-title">圈子里还没有其他成员</text>
        <text class="mi-state-sub">邀请首批成员加入后，这里会沉淀他们的兴趣画像</text>
      </view>

      <!-- 成员列表 -->
      <template v-else>
        <view class="mi-total"><text class="mi-total-txt">共 {{ total }} 位成员 · 按最近活跃排序</text></view>

        <view v-for="m in list" :key="m.userId" class="mi-card" @tap="toggleTimeline(m)">
          <view class="mi-card-main">
            <!-- 头像：无则昵称首字圆底 -->
            <image v-if="m.avatar" lazy-load class="mi-avatar" :src="m.avatar" mode="aspectFill" />
            <view v-else class="mi-avatar mi-avatar-fallback"><text class="mi-avatar-char">{{ firstChar(m.nickname) }}</text></view>

            <view class="mi-info">
              <view class="mi-info-row">
                <text class="mi-name">{{ m.nickname }}</text>
                <!-- 圈内角色标签（普通成员不打标，减少噪音） -->
                <view v-if="roleLabel(m.role)" class="mi-role"><text class="mi-role-txt">{{ roleLabel(m.role) }}</text></view>
                <text class="mi-active" :class="{ inactive: relTime(m.lastActiveAt) === '未活跃' }">{{ relTime(m.lastActiveAt) }}</text>
              </view>
              <!-- 兴趣标签（最多3个，赭金色调） -->
              <view v-if="m.interests.length" class="mi-tags">
                <view v-for="tag in m.interests.slice(0, 3)" :key="tag" class="mi-tag"><text class="mi-tag-txt">{{ tag }}</text></view>
              </view>
              <text v-else class="mi-no-tag">暂无兴趣画像</text>
            </view>

            <!-- 右侧消费概览 -->
            <view class="mi-spend">
              <text class="mi-spend-money">消费 ¥{{ fmtMoney(m.totalSpent) }}</text>
              <text class="mi-spend-orders">{{ m.orderCount }}单 · 30天{{ m.events30d }}次动作</text>
              <view class="mi-expand-hint">
                <app-icon :name="expandedId === m.userId ? 'chevron-up' : 'chevron-down'" :size="26" color="#bbb" />
              </view>
            </view>
          </view>

          <!-- 行为时间线（就地展开·首次点击才请求） -->
          <view v-if="expandedId === m.userId" class="mi-timeline" @tap.stop>
            <view v-if="timelineOf(m.userId).loading" class="mi-tl-loading"><text class="mi-tl-loading-txt">时间线加载中...</text></view>
            <view v-else-if="timelineOf(m.userId).error" class="mi-tl-loading">
              <text class="mi-tl-error-txt">{{ timelineOf(m.userId).error }}</text>
              <text class="mi-tl-retry" @tap.stop="fetchTimeline(m.userId)">重试</text>
            </view>
            <view v-else-if="!timelineOf(m.userId).events.length" class="mi-tl-loading"><text class="mi-tl-loading-txt">近期没有行为记录</text></view>
            <template v-else>
              <view v-for="(ev, i) in timelineOf(m.userId).events" :key="i" class="mi-tl-item">
                <view class="mi-tl-dot-col">
                  <view class="mi-tl-dot" />
                  <view v-if="i < timelineOf(m.userId).events.length - 1" class="mi-tl-line" />
                </view>
                <view class="mi-tl-body">
                  <text class="mi-tl-summary">{{ ev.summary }}</text>
                  <text class="mi-tl-time">{{ relTime(ev.occurredAt, true) }}</text>
                </view>
              </view>
            </template>
          </view>
        </view>

        <app-load-more :status="loadStatus" />
        <view class="mi-bottom-pad" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/**
 * 圈主端「成员洞察」：本圈成员智能名片 + 行为时间线
 * （真连 /circles/:id/dashboard/members-insight，复制自站长客户洞察，改为圈子语境）
 * 路由：/pkg-circle/circles/members-insight?id=圈子id
 */
import { onLoad } from '@dcloudio/uni-app'
import { ref, computed } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import AppLoadMore from '@/components/common/app-load-more.vue'
import { useList } from '@/composables/useList'
import {
  dashboardApi,
  type CircleMemberInsight,
  type MemberTimelineEvent,
} from '@/lib/circle-dashboard-data'

const circleId = ref('')

// ===== 成员列表（useList 统一分页 + 三态） =====
const { list, total, loading, error, isEmpty, loadStatus, refresh, loadMore } = useList<CircleMemberInsight>({
  fetcher: ({ page, pageSize }) => dashboardApi.membersInsight(circleId.value, page, pageSize),
})

// 非圈主访问后端 403「无权访问该圈子数据」→ 走权限提示态而非普通错误
const forbidden = computed(() => error.value.includes('无权'))

onLoad((query) => {
  circleId.value = (query?.id as string) || ''
  if (!circleId.value) {
    // 缺参：落错误态，不静默白屏
    error.value = '缺少圈子参数，请从圈子数据看板进入'
    loading.value = false
    return
  }
  refresh()
})

// ===== 行为时间线（就地展开，按需懒加载） =====
interface TimelineState {
  loading: boolean
  loaded: boolean
  error: string
  events: MemberTimelineEvent[]
}
const EMPTY_TL: TimelineState = { loading: false, loaded: false, error: '', events: [] }
const expandedId = ref('')
const timelines = ref<Record<string, TimelineState>>({})

function timelineOf(userId: string): TimelineState {
  return timelines.value[userId] || EMPTY_TL
}

/** 点击卡片展开/收起；首次展开才请求时间线 */
function toggleTimeline(m: CircleMemberInsight) {
  if (expandedId.value === m.userId) {
    expandedId.value = ''
    return
  }
  expandedId.value = m.userId
  const st = timelines.value[m.userId]
  if (!st || (!st.loaded && !st.loading)) void fetchTimeline(m.userId)
}

async function fetchTimeline(userId: string) {
  const cur = timelines.value[userId]
  if (cur?.loading) return // 防重复请求
  timelines.value[userId] = { loading: true, loaded: false, error: '', events: [] }
  try {
    const events = await dashboardApi.memberTimeline(circleId.value, userId)
    timelines.value[userId] = { loading: false, loaded: true, error: '', events }
  } catch (e) {
    timelines.value[userId] = { loading: false, loaded: false, error: (e as Error)?.message || '时间线加载失败', events: [] }
  }
}

// ===== 展示格式化 =====
/** 圈内角色 → 中文标签（普通成员返回空串不打标） */
const ROLE_LABELS: Record<string, string> = {
  PARTNER: '合伙人',
  ADMIN: '管理员',
  GUEST: '嘉宾',
  VOLUNTEER: '志愿者',
}
function roleLabel(role: string) {
  return ROLE_LABELS[role] || ''
}

/** 昵称首字（头像兜底圆底） */
function firstChar(name: string) {
  return (name || '友').trim().charAt(0) || '友'
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
.mi-page { min-height: 100vh; background: #f5f5f5; }
.mi-scroll { height: calc(100vh - var(--nav-bar-height, 88rpx)); }

/* 头部副标语 */
.mi-hero { padding: 28rpx 32rpx 88rpx; background: linear-gradient(135deg, #C41E3A 0%, #e85d75 100%); }
.mi-hero-title { display: block; font-size: 40rpx; font-weight: 700; color: #ffffff; }
.mi-hero-sub { display: block; margin-top: 10rpx; font-size: 24rpx; color: rgba(255, 255, 255, 0.85); }

/* 合规提示（浅色） */
.mi-privacy { display: flex; align-items: center; gap: 10rpx; margin: -56rpx 24rpx 24rpx; padding: 18rpx 24rpx; border-radius: 16rpx; background: #FBF3E2; border: 1rpx solid #F0DFBB; }
.mi-privacy-txt { font-size: 22rpx; color: #A9741A; }

/* 三态 */
.mi-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 48rpx; }
.mi-state-txt { font-size: 28rpx; color: #999; }
.mi-state-error { font-size: 28rpx; color: #ef4444; text-align: center; }
.mi-state-icon { width: 120rpx; height: 120rpx; border-radius: 32rpx; background: #fdecef; display: flex; align-items: center; justify-content: center; margin-bottom: 28rpx; }
.mi-state-title { font-size: 28rpx; font-weight: 600; color: #1a1a1a; text-align: center; }
.mi-state-sub { margin-top: 12rpx; font-size: 24rpx; color: #999; text-align: center; }
.mi-state-btn { margin-top: 36rpx; padding: 18rpx 56rpx; border-radius: 999rpx; background: #C41E3A; }
.mi-state-btn-txt { font-size: 26rpx; font-weight: 600; color: #ffffff; }

/* 列表汇总条 */
.mi-total { padding: 0 32rpx 16rpx; }
.mi-total-txt { font-size: 22rpx; color: #999; }

/* 成员卡片 */
.mi-card { margin: 0 24rpx 20rpx; padding: 26rpx; border-radius: 24rpx; background: #ffffff; }
.mi-card-main { display: flex; align-items: flex-start; gap: 20rpx; }
.mi-avatar { width: 88rpx; height: 88rpx; border-radius: 50%; flex-shrink: 0; background: #f0f0f0; }
.mi-avatar-fallback { display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #C41E3A 0%, #e85d75 100%); }
.mi-avatar-char { font-size: 36rpx; font-weight: 700; color: #ffffff; }
.mi-info { flex: 1; min-width: 0; }
.mi-info-row { display: flex; align-items: center; gap: 14rpx; }
.mi-name { font-size: 28rpx; font-weight: 600; color: #1a1a1a; max-width: 200rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mi-role { padding: 2rpx 14rpx; border-radius: 999rpx; background: #fdecef; flex-shrink: 0; }
.mi-role-txt { font-size: 20rpx; color: #C41E3A; }
.mi-active { font-size: 20rpx; color: #16a34a; flex-shrink: 0; }
.mi-active.inactive { color: #bbb; }

/* 兴趣标签（赭金色调） */
.mi-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 14rpx; }
.mi-tag { padding: 4rpx 18rpx; border-radius: 999rpx; background: #FBF3E2; border: 1rpx solid #F0DFBB; }
.mi-tag-txt { font-size: 20rpx; color: #A9741A; }
.mi-no-tag { display: block; margin-top: 14rpx; font-size: 20rpx; color: #ccc; }

/* 右侧消费概览 */
.mi-spend { display: flex; flex-direction: column; align-items: flex-end; gap: 8rpx; flex-shrink: 0; }
.mi-spend-money { font-size: 24rpx; font-weight: 700; color: #C41E3A; }
.mi-spend-orders { font-size: 20rpx; color: #999; }
.mi-expand-hint { margin-top: 2rpx; }

/* 行为时间线 */
.mi-timeline { margin-top: 22rpx; padding-top: 22rpx; border-top: 1rpx solid #f0f0f0; }
.mi-tl-loading { display: flex; align-items: center; justify-content: center; gap: 16rpx; padding: 20rpx 0; }
.mi-tl-loading-txt { font-size: 24rpx; color: #999; }
.mi-tl-error-txt { font-size: 24rpx; color: #ef4444; }
.mi-tl-retry { font-size: 24rpx; color: #C41E3A; font-weight: 600; }
.mi-tl-item { display: flex; gap: 18rpx; }
.mi-tl-dot-col { display: flex; flex-direction: column; align-items: center; width: 24rpx; flex-shrink: 0; padding-top: 10rpx; }
.mi-tl-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #C41E3A; flex-shrink: 0; }
.mi-tl-line { flex: 1; width: 2rpx; background: #f0dede; margin-top: 4rpx; }
.mi-tl-body { flex: 1; min-width: 0; padding-bottom: 24rpx; }
.mi-tl-summary { display: block; font-size: 25rpx; color: #333; line-height: 1.5; }
.mi-tl-time { display: block; margin-top: 6rpx; font-size: 20rpx; color: #bbb; }
.mi-tl-item:last-child .mi-tl-body { padding-bottom: 0; }

.mi-bottom-pad { height: 40rpx; }
</style>
