<script setup lang="ts">
/**
 * 圈内通知中心 — V0 circle-notifications.html 还原（2026-07-11 新建·待办 #36）
 * 只收圈子板块内事件（互动/交易/圈务/直播四类）；系统与账号类消息归个人中心消息中心。
 * 数据：circleNotificationsApi（真连 GET /notifications/circle·JWT）。
 * 行内直达：按 targetType 跳真实路由（帖子/圈子/直播间/违规与申诉），无映射的不渲染按钮不造死链。
 */
import { ref, onMounted } from 'vue'
import { onReachBottom } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  circleNotificationsApi,
  type CircleNotification,
  type CircleNotifCategory,
  type CircleNotifUnread,
} from '@/lib/circle-notifications-data'

type Filter = 'ALL' | CircleNotifCategory
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: '全部' },
  { id: 'INTERACT', label: '互动' },
  { id: 'TRADE', label: '交易' },
  { id: 'GOVERN', label: '圈务' },
  { id: 'LIVE', label: '直播' },
]

/** 分类 → 图标与配色（V0：互动/交易=暖底金字，圈务/直播=朱底红字） */
const CAT_ICON: Record<CircleNotifCategory, { name: string; cls: string; color: string }> = {
  INTERACT: { name: 'message-circle', cls: 'warm', color: '#c9a96e' },
  TRADE: { name: 'coins', cls: 'warm', color: '#c9a96e' },
  GOVERN: { name: 'shield-check', cls: 'brand', color: '#c41e3a' },
  LIVE: { name: 'video', cls: 'brand', color: '#c41e3a' },
}

/** targetType → 真实路由 + 行内直达文案（只映射确认存在的页面） */
const TARGET_ROUTE: Record<string, { url: (id: string) => string; action: string }> = {
  POST: { url: (id) => `/pkg-circle/circles/post?id=${id}`, action: '查看帖子' },
  CIRCLE: { url: (id) => `/pkg-circle/circles/detail?id=${id}`, action: '去逛逛' },
  LIVE_ROOM: { url: (id) => `/pkg-live/watch/index?id=${id}`, action: '进入直播间' },
  CIRCLE_VIOLATION: { url: () => '/pkg-circle/circles/sanction-notice', action: '查看详情' },
  ORDER: { url: (id) => `/pkg-order/detail/index?id=${id}`, action: '查看订单' },
}

const PAGE_SIZE = 20

const filter = ref<Filter>('ALL')
const loading = ref(true)
const error = ref('')
const list = ref<CircleNotification[]>([])
const total = ref(0)
const page = ref(1)
const loadingMore = ref(false)
const unread = ref<CircleNotifUnread>({ ALL: 0, INTERACT: 0, TRADE: 0, GOVERN: 0, LIVE: 0 })
const marking = ref(false) // 全部已读 submitting

async function load() {
  loading.value = true
  error.value = ''
  page.value = 1
  try {
    const r = await circleNotificationsApi.list({
      category: filter.value === 'ALL' ? undefined : filter.value,
      page: 1,
      pageSize: PAGE_SIZE,
    })
    list.value = r.items
    total.value = r.total
    unread.value = r.unread
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loading.value || loadingMore.value || list.value.length >= total.value) return
  loadingMore.value = true
  try {
    const r = await circleNotificationsApi.list({
      category: filter.value === 'ALL' ? undefined : filter.value,
      page: page.value + 1,
      pageSize: PAGE_SIZE,
    })
    page.value += 1
    list.value = list.value.concat(r.items)
    total.value = r.total
    unread.value = r.unread
  } catch {
    /* 加载更多失败静默，可再次上拉重试 */
  } finally {
    loadingMore.value = false
  }
}

onReachBottom(loadMore)

function switchFilter(f: Filter) {
  if (filter.value === f) return
  filter.value = f
  load()
}

/** 点通知：乐观置已读 + 有映射则直达 */
function openItem(n: CircleNotification) {
  if (!n.isRead) {
    n.isRead = true
    unread.value.ALL = Math.max(0, unread.value.ALL - 1)
    unread.value[n.category] = Math.max(0, (unread.value[n.category] ?? 0) - 1)
    circleNotificationsApi.markRead(n.id).catch(() => { /* 已读失败不打断浏览 */ })
  }
  const route = n.targetType ? TARGET_ROUTE[n.targetType] : undefined
  if (route && (n.targetId || n.targetType === 'CIRCLE_VIOLATION')) {
    uni.navigateTo({ url: route.url(n.targetId || '') })
  }
}

async function markAll() {
  if (marking.value || unread.value.ALL === 0) return
  marking.value = true
  try {
    await circleNotificationsApi.markAllRead()
    list.value.forEach((n) => { n.isRead = true })
    unread.value = { ALL: 0, INTERACT: 0, TRADE: 0, GOVERN: 0, LIVE: 0 }
    uni.showToast({ title: '已全部标为已读', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    marking.value = false
  }
}

/** 日期分组标签：今天 / 昨天 / M月D日 */
function dayLabel(s: string): string {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const t = d.getTime()
  if (t >= startOfToday) return '今天'
  if (t >= startOfToday - 86400000) return '昨天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 是否本组第一条（用于渲染日期标签与分卡） */
function isGroupHead(idx: number): boolean {
  if (idx === 0) return true
  return dayLabel(list.value[idx].createdAt) !== dayLabel(list.value[idx - 1].createdAt)
}

/** 相对时间：分钟/小时前，昨天 HH:mm，更早给日期 */
function fmtTime(s: string): string {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  const label = dayLabel(s)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (label === '今天') return `${Math.floor(diff / 3600000)} 小时前`
  return `${label} ${hm}`
}

function actionLabel(n: CircleNotification): string {
  return (n.targetType && TARGET_ROUTE[n.targetType]?.action) || ''
}

onMounted(load)
</script>

<template>
  <view class="cn-page">
    <!-- 顶栏：返回 + 标题 + 全部已读 -->
    <view class="cn-topbar">
      <view class="cn-back" @tap="goBack"><app-icon name="chevron-left" :size="32" color="#2C2C2C" /></view>
      <text class="cn-title">圈内通知</text>
      <view class="cn-mark" :class="{ disabled: marking || unread.ALL === 0 }" @tap="markAll">
        <text class="cn-mark-t">{{ marking ? '处理中…' : '全部已读' }}</text>
      </view>
    </view>
    <!-- 边界说明：本页只收圈子板块内事件 -->
    <text class="cn-scope">仅圈子板块内的动态；系统与账号类消息请前往个人中心 · 消息中心查看</text>

    <!-- 分类筛选 chips：互动 / 交易 / 圈务 / 直播 -->
    <scroll-view scroll-x class="cn-filters" :show-scrollbar="false">
      <view class="cn-filter-row">
        <view
          v-for="f in FILTERS" :key="f.id"
          class="cn-chip" :class="{ on: filter === f.id }"
          @tap="switchFilter(f.id)"
        >
          <text class="cn-chip-t" :class="{ on: filter === f.id }">{{ f.label }}</text>
          <view v-if="(f.id === 'ALL' ? unread.ALL : unread[f.id]) > 0" class="cn-cnt" :class="{ dim: filter !== f.id }">
            <text class="cn-cnt-t">{{ f.id === 'ALL' ? unread.ALL : unread[f.id] }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 加载态 -->
    <view v-if="loading" class="cn-state">
      <view class="cn-skel" /><view class="cn-skel" /><view class="cn-skel" />
    </view>
    <!-- 错误态 -->
    <view v-else-if="error" class="cn-state center">
      <text class="cn-state-t">{{ error }}</text>
      <view class="cn-retry" @tap="load"><text class="cn-retry-t">重试</text></view>
    </view>
    <!-- 空态（V0 状态 B） -->
    <view v-else-if="!list.length" class="cn-state center">
      <view class="cn-empty-icon"><app-icon name="bell" :size="52" color="#c9a96e" /></view>
      <text class="cn-empty-title">暂无圈内动态</text>
      <text class="cn-empty-sub">当有人回复你的帖子、回答你的提问，或圈子有新直播时，会在这里提醒你</text>
    </view>

    <!-- 通知列表（按 今天/昨天/日期 分组分卡） -->
    <template v-else>
      <template v-for="(n, idx) in list" :key="n.id">
        <text v-if="isGroupHead(idx)" class="cn-day">{{ dayLabel(n.createdAt) }}</text>
        <view class="cn-row" :class="{ 'group-head': isGroupHead(idx) }" @tap="openItem(n)">
          <view v-if="!n.isRead" class="cn-dot" />
          <view class="cn-icon" :class="CAT_ICON[n.category]?.cls || 'warm'">
            <app-icon :name="CAT_ICON[n.category]?.name || 'bell'" :size="34" :color="CAT_ICON[n.category]?.color || '#c9a96e'" />
          </view>
          <view class="cn-main">
            <text class="cn-text"><text class="cn-text-b">{{ n.title }}</text></text>
            <text class="cn-quote">{{ n.content }}</text>
            <view v-if="actionLabel(n)" class="cn-action" @tap.stop="openItem(n)">
              <text class="cn-action-t">{{ actionLabel(n) }}</text>
            </view>
            <text class="cn-time">{{ fmtTime(n.createdAt) }}</text>
          </view>
        </view>
      </template>
      <view v-if="loadingMore" class="cn-more"><text class="cn-more-t">加载中…</text></view>
      <view v-else-if="list.length >= total" class="cn-more"><text class="cn-more-t">没有更多了</text></view>
      <view class="cn-bottom-pad" />
    </template>
  </view>
</template>

<style scoped lang="scss">
.cn-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 64rpx; }

/* 顶栏 */
.cn-topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.88); backdrop-filter: blur(24rpx);
}
.cn-back {
  width: 64rpx; height: 64rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.cn-title { flex: 1; font-size: 34rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); }
.cn-mark { padding: 8rpx 4rpx; }
.cn-mark.disabled { opacity: 0.5; }
.cn-mark-t { font-size: 26rpx; color: var(--text-tertiary, #999); }

/* 边界说明 */
.cn-scope { display: block; margin: 8rpx 40rpx 0; font-size: 22rpx; color: var(--text-tertiary, #999); line-height: 1.6; }

/* 分类筛选 chips */
.cn-filters { padding: 24rpx 0 8rpx; white-space: nowrap; }
.cn-filter-row { display: inline-flex; gap: 16rpx; padding: 0 32rpx; }
.cn-chip {
  height: 60rpx; padding: 0 28rpx; border-radius: 30rpx; flex-shrink: 0;
  border: 1rpx solid var(--separator, #ede7dd); background: var(--bg-card, #fff);
  display: inline-flex; align-items: center; gap: 10rpx;
}
.cn-chip.on { border-color: var(--brand, #c41e3a); background: var(--brand-soft, rgba(196, 30, 58, 0.08)); }
.cn-chip-t { font-size: 25rpx; color: var(--text-secondary, #6e6e73); }
.cn-chip-t.on { color: var(--brand, #c41e3a); font-weight: 600; }
.cn-cnt {
  min-width: 32rpx; height: 32rpx; padding: 0 8rpx; border-radius: 16rpx;
  background: var(--brand, #c41e3a);
  display: inline-flex; align-items: center; justify-content: center;
}
.cn-cnt.dim { background: var(--text-tertiary, #999); }
.cn-cnt-t { font-size: 20rpx; font-weight: 700; color: #fff; }

/* 日期分组标签 */
.cn-day { display: block; margin: 32rpx 40rpx 12rpx; font-size: 24rpx; color: var(--text-tertiary, #999); }

/* 通知行（分组卡片：组内行间细分隔，组首行起新卡圆角） */
.cn-row {
  position: relative;
  display: flex; gap: 24rpx; padding: 26rpx 32rpx;
  margin: 0 32rpx; background: var(--bg-card, #fff);
  border-top: 1rpx solid var(--separator, #ede7dd);
}
.cn-row.group-head {
  border-top: none;
  border-top-left-radius: 36rpx; border-top-right-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.cn-row:not(.group-head) { box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); }

/* 未读点：左上角朱红小点 */
.cn-dot {
  position: absolute; top: 28rpx; left: 16rpx;
  width: 12rpx; height: 12rpx; border-radius: 999rpx;
  background: var(--brand, #c41e3a);
}

/* 分类图标 */
.cn-icon {
  width: 72rpx; height: 72rpx; border-radius: 999rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.cn-icon.warm { background: var(--bg-warm, #f8f4ec); }
.cn-icon.brand { background: var(--brand-soft, rgba(196, 30, 58, 0.08)); }

/* 正文 */
.cn-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.cn-text { font-size: 27rpx; color: var(--text-secondary, #6e6e73); line-height: 1.55; }
.cn-text-b { color: var(--text-primary, #2c2c2c); font-weight: 600; }
.cn-quote {
  margin-top: 12rpx; padding: 16rpx 24rpx;
  background: var(--bg-warm, #f8f4ec); border-radius: 16rpx;
  font-size: 24rpx; color: var(--text-tertiary, #999); line-height: 1.5;
}
.cn-time { font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 10rpx; }

/* 行内轻操作（直达按钮） */
.cn-action {
  margin-top: 16rpx; align-self: flex-start;
  height: 56rpx; padding: 0 28rpx;
  border: 2rpx solid var(--brand, #c41e3a); border-radius: 28rpx;
  display: inline-flex; align-items: center;
}
.cn-action-t { font-size: 24rpx; font-weight: 600; color: var(--brand, #c41e3a); }

/* 三态 */
.cn-state { padding: 24rpx 32rpx; }
.cn-state.center { padding: 160rpx 80rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.cn-skel { height: 150rpx; border-radius: 32rpx; background: #fff; margin-bottom: 24rpx; }
.cn-state-t { font-size: 28rpx; color: var(--text-tertiary, #999); }
.cn-retry { margin-top: 12rpx; padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.cn-retry-t { font-size: 26rpx; color: #fff; }
.cn-empty-icon {
  width: 128rpx; height: 128rpx; border-radius: 999rpx;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.cn-empty-title { font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); margin-top: 20rpx; }
.cn-empty-sub { font-size: 25rpx; color: var(--text-tertiary, #999); line-height: 1.7; text-align: center; }

/* 加载更多/到底 */
.cn-more { padding: 24rpx 0; display: flex; justify-content: center; }
.cn-more-t { font-size: 24rpx; color: var(--text-tertiary, #999); }

.cn-bottom-pad { height: 40rpx; }
</style>
