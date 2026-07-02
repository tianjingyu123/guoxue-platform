<template>
  <view class="cus-page">
    <!-- 顶部导航 -->
    <app-nav-bar title="客户洞察" :show-back="true" background="#C41E3A" color="#ffffff" :no-border="true" />

    <scroll-view scroll-y class="cus-scroll" @scrolltolower="loadMore">
      <!-- 头部副标语 -->
      <view class="cus-hero">
        <text class="cus-hero-title">智能名片</text>
        <text class="cus-hero-sub">了解客户兴趣，精准跟进</text>
      </view>

      <!-- 合规提示 -->
      <view class="cus-privacy">
        <app-icon name="shield" :size="26" color="#A9741A" />
        <text class="cus-privacy-txt">客户数据仅供经营分析，请勿外泄</text>
      </view>

      <!-- Loading -->
      <view v-if="loading" class="cus-state">
        <text class="cus-state-txt">加载中...</text>
      </view>

      <!-- Error：未开通分站走引导态，其余走重试 -->
      <view v-else-if="error" class="cus-state">
        <template v-if="notOpened">
          <view class="cus-state-icon"><app-icon name="store" :size="60" color="#C41E3A" /></view>
          <text class="cus-state-title">你还没有开通分站</text>
          <text class="cus-state-sub">开通分站后即可沉淀归属客户</text>
          <view class="cus-state-btn" @tap="navigateTo('/pkg-operator/join-station/index')"><text class="cus-state-btn-txt">去开通</text></view>
        </template>
        <template v-else>
          <text class="cus-state-error">{{ error }}</text>
          <view class="cus-state-btn" @tap="refresh"><text class="cus-state-btn-txt">重试</text></view>
        </template>
      </view>

      <!-- Empty -->
      <view v-else-if="isEmpty" class="cus-state">
        <view class="cus-state-icon"><app-icon name="users" :size="60" color="#C41E3A" /></view>
        <text class="cus-state-title">还没有归属客户，先去分享你的推广链接吧</text>
        <view class="cus-state-btn" @tap="navigateTo('/pkg-operator/station-poster/index')"><text class="cus-state-btn-txt">生成推广海报</text></view>
      </view>

      <!-- 客户列表 -->
      <template v-else>
        <view class="cus-total"><text class="cus-total-txt">共 {{ total }} 位归属客户 · 按最近活跃排序</text></view>

        <view v-for="c in list" :key="c.userId" class="cus-card" @tap="toggleTimeline(c)">
          <view class="cus-card-main">
            <!-- 头像：无则昵称首字圆底 -->
            <image v-if="c.avatar" lazy-load class="cus-avatar" :src="c.avatar" mode="aspectFill" />
            <view v-else class="cus-avatar cus-avatar-fallback"><text class="cus-avatar-char">{{ firstChar(c.nickname) }}</text></view>

            <view class="cus-info">
              <view class="cus-info-row">
                <text class="cus-name">{{ c.nickname }}</text>
                <text class="cus-active" :class="{ inactive: relTime(c.lastActiveAt) === '未活跃' }">{{ relTime(c.lastActiveAt) }}</text>
              </view>
              <!-- 兴趣标签（最多3个，赭金色调） -->
              <view v-if="c.interests.length" class="cus-tags">
                <view v-for="tag in c.interests.slice(0, 3)" :key="tag" class="cus-tag"><text class="cus-tag-txt">{{ tag }}</text></view>
              </view>
              <text v-else class="cus-no-tag">暂无兴趣画像</text>
            </view>

            <!-- 右侧消费概览 -->
            <view class="cus-spend">
              <text class="cus-spend-money">消费 ¥{{ fmtMoney(c.totalSpent) }}</text>
              <text class="cus-spend-orders">{{ c.orderCount }}单 · 30天{{ c.events30d }}次动作</text>
              <view class="cus-expand-hint">
                <app-icon :name="expandedId === c.userId ? 'chevron-up' : 'chevron-down'" :size="26" color="#bbb" />
              </view>
            </view>
          </view>

          <!-- 行为时间线（就地展开·首次点击才请求） -->
          <view v-if="expandedId === c.userId" class="cus-timeline" @tap.stop>
            <view v-if="timelineOf(c.userId).loading" class="cus-tl-loading"><text class="cus-tl-loading-txt">时间线加载中...</text></view>
            <view v-else-if="timelineOf(c.userId).error" class="cus-tl-loading">
              <text class="cus-tl-error-txt">{{ timelineOf(c.userId).error }}</text>
              <text class="cus-tl-retry" @tap.stop="fetchTimeline(c.userId)">重试</text>
            </view>
            <view v-else-if="!timelineOf(c.userId).events.length" class="cus-tl-loading"><text class="cus-tl-loading-txt">近期没有行为记录</text></view>
            <template v-else>
              <view v-for="(ev, i) in timelineOf(c.userId).events" :key="i" class="cus-tl-item">
                <view class="cus-tl-dot-col">
                  <view class="cus-tl-dot" />
                  <view v-if="i < timelineOf(c.userId).events.length - 1" class="cus-tl-line" />
                </view>
                <view class="cus-tl-body">
                  <text class="cus-tl-summary">{{ ev.summary }}</text>
                  <text class="cus-tl-time">{{ relTime(ev.occurredAt, true) }}</text>
                </view>
              </view>
            </template>
          </view>
        </view>

        <app-load-more :status="loadStatus" />
        <view class="cus-bottom-pad" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/** 站长端「客户洞察」：归属客户智能名片 + 行为时间线（真连 /station/my/customers） */
import { ref, computed, onMounted } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoadMore from '@/components/common/app-load-more.vue'
import { navigateTo } from '@/utils/router'
import { useList } from '@/composables/useList'
import { customerApi, type StationCustomer, type CustomerTimelineEvent } from '@/lib/operator-data'

// ===== 客户列表（useList 统一分页 + 三态） =====
const { list, total, loading, error, isEmpty, loadStatus, refresh, loadMore } = useList<StationCustomer>({
  fetcher: ({ page, pageSize }) => customerApi.list(page, pageSize),
})

// 非站长后端报"你还没有开通分站" → 走开通引导态而非普通错误
const notOpened = computed(() => error.value.includes('开通'))

onMounted(() => { refresh() })

// ===== 行为时间线（就地展开，按需懒加载） =====
interface TimelineState {
  loading: boolean
  loaded: boolean
  error: string
  events: CustomerTimelineEvent[]
}
const EMPTY_TL: TimelineState = { loading: false, loaded: false, error: '', events: [] }
const expandedId = ref('')
const timelines = ref<Record<string, TimelineState>>({})

function timelineOf(userId: string): TimelineState {
  return timelines.value[userId] || EMPTY_TL
}

/** 点击卡片展开/收起；首次展开才请求时间线 */
function toggleTimeline(c: StationCustomer) {
  if (expandedId.value === c.userId) {
    expandedId.value = ''
    return
  }
  expandedId.value = c.userId
  const st = timelines.value[c.userId]
  if (!st || (!st.loaded && !st.loading)) void fetchTimeline(c.userId)
}

async function fetchTimeline(userId: string) {
  const cur = timelines.value[userId]
  if (cur?.loading) return // 防重复请求
  timelines.value[userId] = { loading: true, loaded: false, error: '', events: [] }
  try {
    const events = await customerApi.timeline(userId)
    timelines.value[userId] = { loading: false, loaded: true, error: '', events }
  } catch (e) {
    timelines.value[userId] = { loading: false, loaded: false, error: (e as Error)?.message || '时间线加载失败', events: [] }
  }
}

// ===== 展示格式化 =====
/** 昵称首字（头像兜底圆底） */
function firstChar(name: string) {
  return (name || '客').trim().charAt(0) || '客'
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
.cus-page { min-height: 100vh; background: #f5f5f5; }
.cus-scroll { height: calc(100vh - var(--nav-bar-height, 88rpx)); }

/* 头部副标语 */
.cus-hero { padding: 28rpx 32rpx 88rpx; background: linear-gradient(135deg, #C41E3A 0%, #e85d75 100%); }
.cus-hero-title { display: block; font-size: 40rpx; font-weight: 700; color: #ffffff; }
.cus-hero-sub { display: block; margin-top: 10rpx; font-size: 24rpx; color: rgba(255, 255, 255, 0.85); }

/* 合规提示（浅色） */
.cus-privacy { display: flex; align-items: center; gap: 10rpx; margin: -56rpx 24rpx 24rpx; padding: 18rpx 24rpx; border-radius: 16rpx; background: #FBF3E2; border: 1rpx solid #F0DFBB; }
.cus-privacy-txt { font-size: 22rpx; color: #A9741A; }

/* 三态 */
.cus-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 48rpx; }
.cus-state-txt { font-size: 28rpx; color: #999; }
.cus-state-error { font-size: 28rpx; color: #ef4444; text-align: center; }
.cus-state-icon { width: 120rpx; height: 120rpx; border-radius: 32rpx; background: #fdecef; display: flex; align-items: center; justify-content: center; margin-bottom: 28rpx; }
.cus-state-title { font-size: 28rpx; font-weight: 600; color: #1a1a1a; text-align: center; }
.cus-state-sub { margin-top: 12rpx; font-size: 24rpx; color: #999; text-align: center; }
.cus-state-btn { margin-top: 36rpx; padding: 18rpx 56rpx; border-radius: 999rpx; background: #C41E3A; }
.cus-state-btn-txt { font-size: 26rpx; font-weight: 600; color: #ffffff; }

/* 列表汇总条 */
.cus-total { padding: 0 32rpx 16rpx; }
.cus-total-txt { font-size: 22rpx; color: #999; }

/* 客户卡片 */
.cus-card { margin: 0 24rpx 20rpx; padding: 26rpx; border-radius: 24rpx; background: #ffffff; }
.cus-card-main { display: flex; align-items: flex-start; gap: 20rpx; }
.cus-avatar { width: 88rpx; height: 88rpx; border-radius: 50%; flex-shrink: 0; background: #f0f0f0; }
.cus-avatar-fallback { display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #C41E3A 0%, #e85d75 100%); }
.cus-avatar-char { font-size: 36rpx; font-weight: 700; color: #ffffff; }
.cus-info { flex: 1; min-width: 0; }
.cus-info-row { display: flex; align-items: center; gap: 14rpx; }
.cus-name { font-size: 28rpx; font-weight: 600; color: #1a1a1a; max-width: 240rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cus-active { font-size: 20rpx; color: #16a34a; flex-shrink: 0; }
.cus-active.inactive { color: #bbb; }

/* 兴趣标签（赭金色调） */
.cus-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 14rpx; }
.cus-tag { padding: 4rpx 18rpx; border-radius: 999rpx; background: #FBF3E2; border: 1rpx solid #F0DFBB; }
.cus-tag-txt { font-size: 20rpx; color: #A9741A; }
.cus-no-tag { display: block; margin-top: 14rpx; font-size: 20rpx; color: #ccc; }

/* 右侧消费概览 */
.cus-spend { display: flex; flex-direction: column; align-items: flex-end; gap: 8rpx; flex-shrink: 0; }
.cus-spend-money { font-size: 24rpx; font-weight: 700; color: #C41E3A; }
.cus-spend-orders { font-size: 20rpx; color: #999; }
.cus-expand-hint { margin-top: 2rpx; }

/* 行为时间线 */
.cus-timeline { margin-top: 22rpx; padding-top: 22rpx; border-top: 1rpx solid #f0f0f0; }
.cus-tl-loading { display: flex; align-items: center; justify-content: center; gap: 16rpx; padding: 20rpx 0; }
.cus-tl-loading-txt { font-size: 24rpx; color: #999; }
.cus-tl-error-txt { font-size: 24rpx; color: #ef4444; }
.cus-tl-retry { font-size: 24rpx; color: #C41E3A; font-weight: 600; }
.cus-tl-item { display: flex; gap: 18rpx; }
.cus-tl-dot-col { display: flex; flex-direction: column; align-items: center; width: 24rpx; flex-shrink: 0; padding-top: 10rpx; }
.cus-tl-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #C41E3A; flex-shrink: 0; }
.cus-tl-line { flex: 1; width: 2rpx; background: #f0dede; margin-top: 4rpx; }
.cus-tl-body { flex: 1; min-width: 0; padding-bottom: 24rpx; }
.cus-tl-summary { display: block; font-size: 25rpx; color: #333; line-height: 1.5; }
.cus-tl-time { display: block; margin-top: 6rpx; font-size: 20rpx; color: #bbb; }
.cus-tl-item:last-child .cus-tl-body { padding-bottom: 0; }

.cus-bottom-pad { height: 40rpx; }
</style>
