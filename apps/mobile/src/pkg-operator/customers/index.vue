<template>
  <view class="cus-page">
    <!-- 自定义导航（朱红渐变顶栏 + 状态栏留白） -->
    <view class="cus-topbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="cus-nav">
        <view class="cus-nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="40" color="#FFFFFF" />
        </view>
        <text class="cus-nav-title">客户洞察</text>
        <text v-if="!isEmpty && !loading && !error" class="cus-nav-act" @tap="onExport">导出</text>
      </view>
    </view>

    <scroll-view scroll-y class="cus-scroll" @scrolltolower="loadMore">
      <!-- Loading -->
      <view v-if="loading && !list.length" class="cus-state">
        <text class="cus-state-txt">加载中...</text>
      </view>

      <!-- Error：未开通分站走引导态，其余走重试 -->
      <view v-else-if="error" class="cus-state">
        <template v-if="notOpened">
          <view class="cus-state-ill"><app-icon name="store" :size="60" color="#C9A96E" /></view>
          <text class="cus-state-title">你还没有开通分站</text>
          <text class="cus-state-sub">开通分站后即可沉淀归属客户</text>
          <view class="cus-state-btn" @tap="navigateTo('/pkg-operator/join-station/index')">
            <text class="cus-state-btn-txt">去开通</text>
          </view>
        </template>
        <template v-else>
          <text class="cus-state-error">{{ error }}</text>
          <view class="cus-state-btn" @tap="refresh"><text class="cus-state-btn-txt">重试</text></view>
        </template>
      </view>

      <!-- Empty：无归属客户（按稿 · 金色人像插画） -->
      <view v-else-if="isEmpty" class="cus-state">
        <view class="cus-state-ill"><app-icon name="users" :size="60" color="#C9A96E" /></view>
        <text class="cus-state-title cus-serif">还没有归属客户</text>
        <text class="cus-state-sub">当用户通过您的推广内容下单，{{ '\n' }}会自动成为您的归属客户，在此沉淀。</text>
        <view class="cus-state-btn" @tap="navigateTo('/pkg-operator/pinned-manage/index')">
          <text class="cus-state-btn-txt">去主推位选内容</text>
        </view>
      </view>

      <!-- 正常态 -->
      <template v-else>
        <!-- 搜索（后端 list 无 q 参数 → 本地过滤已加载客户，昵称匹配） -->
        <view class="cus-search">
          <app-icon name="search" :size="30" color="#999999" />
          <input
            class="cus-search-input"
            v-model="keyword"
            type="text"
            placeholder="搜索客户昵称"
            placeholder-class="cus-search-ph"
            confirm-type="search"
          />
        </view>

        <!-- 筛选 Tab（前端按现有字段聚合：高价值/新客/沉寂） -->
        <scroll-view scroll-x class="cus-ftabs" :show-scrollbar="false">
          <view class="cus-ftabs-inner">
            <view
              v-for="t in filterTabs"
              :key="t.key"
              class="cus-ftab"
              :class="{ on: activeFilter === t.key }"
              @tap="activeFilter = t.key"
            >
              <text class="cus-ftab-txt">{{ t.label }}</text>
              <text class="cus-ftab-c">{{ t.count }}</text>
            </view>
          </view>
        </scroll-view>

        <!-- 统计条（归属客户真数；本月贡献/订单后端无字段 → 降级为累计口径并如实标注） -->
        <view class="cus-statbar">
          <view class="cus-st-cell">
            <text class="cus-st-num cus-serif">{{ total }}</text>
            <text class="cus-st-lbl">归属客户</text>
          </view>
          <view class="cus-st-div" />
          <view class="cus-st-cell">
            <text class="cus-st-num gold cus-serif">¥{{ fmtMoney(sumSpent) }}</text>
            <text class="cus-st-lbl">累计贡献</text>
          </view>
          <view class="cus-st-div" />
          <view class="cus-st-cell">
            <text class="cus-st-num cus-serif">{{ sumOrders }}</text>
            <text class="cus-st-lbl">累计订单</text>
          </view>
        </view>

        <!-- 客户列表 -->
        <view class="cus-list">
          <view
            v-for="c in shownList"
            :key="c.userId"
            class="cus-card"
            @tap="toggleTimeline(c)"
          >
            <view class="cus-cc-row">
              <!-- 头像：无则昵称首字圆底（金/绿/灰按标签） -->
              <image
                v-if="c.avatar"
                lazy-load
                class="cus-av"
                :src="c.avatar"
                mode="aspectFill"
              />
              <view v-else class="cus-av cus-av-fallback" :class="'av-' + (segOf(c) || 'normal')">
                <text class="cus-av-char cus-serif">{{ firstChar(c.nickname) }}</text>
                <view v-if="isHighValue(c)" class="cus-vip">
                  <app-icon name="star" :size="18" color="#FFFFFF" />
                </view>
              </view>

              <view class="cus-cc-info">
                <view class="cus-cc-name">
                  <text class="cus-cc-name-txt">{{ c.nickname }}</text>
                  <text v-if="segOf(c) === 'high'" class="cus-nt nt-high">高价值</text>
                  <text v-else-if="segOf(c) === 'new'" class="cus-nt nt-new">新客</text>
                  <text v-else-if="segOf(c) === 'dorm'" class="cus-nt nt-dorm">沉寂</text>
                </view>
                <text class="cus-cc-sub">{{ subLine(c) }}</text>
                <!-- 兴趣标签（后端聚合，最多3个） -->
                <view v-if="c.interests.length" class="cus-tags">
                  <view v-for="tag in c.interests.slice(0, 3)" :key="tag" class="cus-tag">
                    <text class="cus-tag-txt">{{ tag }}</text>
                  </view>
                </view>
              </view>

              <view class="cus-cc-right">
                <text class="cus-cc-amt cus-serif" :class="{ dim: segOf(c) === 'dorm' }">¥{{ fmtMoney(c.totalSpent) }}</text>
                <text class="cus-cc-ord">共 {{ c.orderCount }} 笔</text>
                <app-icon
                  class="cus-cc-chevron"
                  :name="expandedId === c.userId ? 'chevron-up' : 'chevron-down'"
                  :size="26"
                  color="#C7C0B4"
                />
              </view>
            </view>

            <!-- 行为时间线（就地展开·首次点击才请求） -->
            <view v-if="expandedId === c.userId" class="cus-timeline" @tap.stop>
              <view class="cus-tl-divider" />
              <text class="cus-tl-title">行为时间线</text>

              <view v-if="timelineOf(c.userId).loading" class="cus-tl-hint">
                <text class="cus-tl-hint-txt">时间线加载中...</text>
              </view>
              <view v-else-if="timelineOf(c.userId).error" class="cus-tl-hint">
                <text class="cus-tl-error-txt">{{ timelineOf(c.userId).error }}</text>
                <text class="cus-tl-retry" @tap.stop="fetchTimeline(c.userId)">重试</text>
              </view>
              <view v-else-if="!timelineOf(c.userId).events.length" class="cus-tl-hint">
                <text class="cus-tl-hint-txt">近期没有行为记录</text>
              </view>
              <template v-else>
                <view
                  v-for="(ev, i) in timelineOf(c.userId).events"
                  :key="i"
                  class="cus-tl-item"
                >
                  <view class="cus-tl-dotcol">
                    <view class="cus-tl-dot" :class="dotClass(ev.action)" />
                    <view v-if="i < timelineOf(c.userId).events.length - 1" class="cus-tl-line" />
                  </view>
                  <view class="cus-tl-content">
                    <text class="cus-tl-action">{{ ev.summary }}</text>
                    <text class="cus-tl-time">{{ fmtDateTime(ev.occurredAt) }}</text>
                  </view>
                </view>
              </template>
            </view>
          </view>

          <!-- 本地搜索/筛选后无匹配 -->
          <view v-if="!shownList.length" class="cus-nomatch">
            <text class="cus-nomatch-txt">没有符合条件的客户</text>
          </view>

          <app-load-more v-if="!keyword && activeFilter === 'all'" :status="loadStatus" />
          <view class="cus-bottom-pad" />
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/** 站长端「客户洞察」V0 重构：智能名片 + 行为时间线（真连 /station/my/customers） */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoadMore from '@/components/common/app-load-more.vue'
import { navigateTo } from '@/utils/router'
import { useList } from '@/composables/useList'
import { customerApi, type StationCustomer, type CustomerTimelineEvent } from '@/pkg-operator/lib/operator-data'

// ===== 状态栏留白（自定义导航） =====
const statusBarHeight = ref(20)
onMounted(() => {
  try {
    const info = uni.getSystemInfoSync()
    if (info.statusBarHeight) statusBarHeight.value = info.statusBarHeight
  } catch (e) { /* 兜底默认值 */ }
})

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else navigateTo('/pkg-operator/station-workbench/index')
}

// ===== 客户列表（useList 统一分页 + 三态） =====
const { list, total, loading, error, isEmpty, loadStatus, refresh, loadMore } = useList<StationCustomer>({
  fetcher: ({ page, pageSize }) => customerApi.list(page, pageSize),
})

// 非站长后端报"你还没有开通分站" → 走开通引导态而非普通错误
const notOpened = computed(() => error.value.includes('开通'))

onMounted(() => { refresh() })

// ===== 客户分段（前端按现有字段聚合，后端无 segment 字段） =====
/** 高价值：累计消费 ≥ 500 元 */
function isHighValue(c: StationCustomer) {
  return c.totalSpent >= 500
}
/** 新客：归属 30 天内 */
function isNew(c: StationCustomer) {
  if (!c.boundAt) return false
  const t = new Date(c.boundAt).getTime()
  if (!Number.isFinite(t)) return false
  return (Date.now() - t) / 86400000 <= 30
}
/** 沉寂：超过 30 天无活跃 */
function isDormant(c: StationCustomer) {
  if (!c.lastActiveAt) return true
  const t = new Date(c.lastActiveAt).getTime()
  if (!Number.isFinite(t)) return true
  return (Date.now() - t) / 86400000 > 30
}
/** 单客户主分段（优先级：沉寂 > 高价值 > 新客 > 普通） */
function segOf(c: StationCustomer): 'high' | 'new' | 'dorm' | '' {
  if (isDormant(c)) return 'dorm'
  if (isHighValue(c)) return 'high'
  if (isNew(c)) return 'new'
  return ''
}

// ===== 筛选 Tab（数量按已加载列表聚合） =====
type FilterKey = 'all' | 'high' | 'new' | 'dorm'
const activeFilter = ref<FilterKey>('all')
const filterTabs = computed(() => [
  { key: 'all' as FilterKey, label: '全部', count: list.value.length },
  { key: 'high' as FilterKey, label: '高价值', count: list.value.filter(isHighValue).length },
  { key: 'new' as FilterKey, label: '新客', count: list.value.filter(isNew).length },
  { key: 'dorm' as FilterKey, label: '沉寂', count: list.value.filter(isDormant).length },
])

// ===== 搜索（后端无 q 参数 → 本地过滤已加载客户昵称） =====
const keyword = ref('')

/** 经筛选 + 搜索后的展示列表 */
const shownList = computed(() => {
  let arr = list.value
  if (activeFilter.value === 'high') arr = arr.filter(isHighValue)
  else if (activeFilter.value === 'new') arr = arr.filter(isNew)
  else if (activeFilter.value === 'dorm') arr = arr.filter(isDormant)
  const kw = keyword.value.trim().toLowerCase()
  if (kw) arr = arr.filter((c) => (c.nickname || '').toLowerCase().includes(kw))
  return arr
})

// ===== 统计条（累计口径：后端 total 为归属数；贡献/订单按已加载聚合） =====
const sumSpent = computed(() => list.value.reduce((s, c) => s + (c.totalSpent || 0), 0))
const sumOrders = computed(() => list.value.reduce((s, c) => s + (c.orderCount || 0), 0))

// ===== 导出（后端无导出接口 → 提示前往后台，不编造） =====
function onExport() {
  uni.showToast({ title: '导出功能请前往运营后台', icon: 'none' })
}

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

/** 时间线圆点色（按 action 语义：下单朱红 / 分享蓝 / 浏览金） */
function dotClass(action: string): string {
  const a = (action || '').toLowerCase()
  if (a.includes('order') || a.includes('buy') || a.includes('pay') || a.includes('purchase')) return 'order'
  if (a.includes('share')) return 'share'
  return 'view'
}

// ===== 展示格式化 =====
/** 昵称首字（头像兜底圆底） */
function firstChar(name: string) {
  return (name || '客').trim().charAt(0) || '客'
}

/** 金额展示（元，千分位，最多两位小数） */
function fmtMoney(v: number) {
  return (v || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

/** 卡片副行：归属日期 + 分段状态（沉寂显示未活跃天数） */
function subLine(c: StationCustomer): string {
  const bound = c.boundAt ? `归属 ${String(c.boundAt).slice(0, 10)}` : '已归属'
  if (isDormant(c) && c.lastActiveAt) {
    const days = Math.floor((Date.now() - new Date(c.lastActiveAt).getTime()) / 86400000)
    if (Number.isFinite(days) && days > 30) return `${bound} · ${days}天未活跃`
  }
  return bound
}

/** 时间线时间：YYYY-MM-DD HH:mm */
function fmtDateTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const t = d.getTime()
  if (!Number.isFinite(t)) return String(iso).slice(0, 16)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
</script>

<style lang="scss" scoped>
/* ==== token ==== */
$paper: #FAF8F5;
$card: #FFFFFF;
$red: #C41E3A;
$red-deep: #A01828;
$gold: #C9A96E;
$gold-deep: #97794A;
$t1: #2C2C2C;
$t2: #6E6E73;
$t3: #999999;
$border: #ECE7DF;

.cus-page { min-height: 100vh; background: $paper; }
.cus-serif { font-family: 'Songti SC', 'STSong', 'SimSun', serif; }

/* 自定义导航（朱红渐变） */
.cus-topbar { background: linear-gradient(135deg, $red-deep, $red); }
.cus-nav { height: 88rpx; display: flex; align-items: center; padding: 0 38rpx; }
.cus-nav-back { width: 88rpx; height: 88rpx; margin-left: -20rpx; display: flex; align-items: center; }
.cus-nav-title { flex: 1; font-size: 34rpx; font-weight: 600; color: #FFFFFF; }
.cus-nav-act { font-size: 28rpx; color: rgba(255, 255, 255, 0.95); padding: 20rpx 0 20rpx 24rpx; }

.cus-scroll { height: calc(100vh - 88rpx); box-sizing: border-box; }

/* 三态 / 空态 */
.cus-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 76rpx 80rpx; }
.cus-state-txt { font-size: 28rpx; color: $t3; }
.cus-state-error { font-size: 28rpx; color: $red; text-align: center; }
.cus-state-ill { width: 184rpx; height: 184rpx; border-radius: 50%; background: linear-gradient(150deg, #FBF3E6, #F5E7CE); display: flex; align-items: center; justify-content: center; margin-bottom: 30rpx; }
.cus-state-title { font-size: 36rpx; font-weight: 700; color: $t1; text-align: center; }
.cus-state-sub { margin-top: 16rpx; font-size: 26rpx; color: $t2; line-height: 1.6; text-align: center; white-space: pre-line; }
.cus-state-btn { margin-top: 44rpx; height: 88rpx; padding: 0 58rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; background: linear-gradient(135deg, $red-deep, $red); box-shadow: 0 16rpx 40rpx rgba(196, 30, 58, 0.26); }
.cus-state-btn-txt { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }

/* 搜索 */
.cus-search { margin: 28rpx 38rpx 0; display: flex; align-items: center; gap: 18rpx; height: 82rpx; padding: 0 28rpx; background: $card; border: 1rpx solid $border; border-radius: 24rpx; box-shadow: 0 4rpx 16rpx rgba(60, 40, 20, 0.04); }
.cus-search-input { flex: 1; font-size: 26rpx; color: $t1; }
.cus-search-ph { color: $t3; font-size: 26rpx; }

/* 筛选 Tab */
.cus-ftabs { margin-top: 24rpx; white-space: nowrap; }
.cus-ftabs-inner { display: inline-flex; gap: 16rpx; padding: 0 38rpx; }
.cus-ftab { flex-shrink: 0; height: 64rpx; padding: 0 28rpx; display: flex; align-items: center; gap: 8rpx; border-radius: 999rpx; background: $card; border: 1rpx solid $border; }
.cus-ftab-txt { font-size: 26rpx; color: $t2; }
.cus-ftab-c { font-size: 24rpx; color: $t3; }
.cus-ftab.on { background: $red; border-color: $red; }
.cus-ftab.on .cus-ftab-txt { color: #FFFFFF; }
.cus-ftab.on .cus-ftab-c { color: rgba(255, 255, 255, 0.7); }

/* 统计条 */
.cus-statbar { margin: 28rpx 38rpx 0; display: flex; align-items: stretch; background: $card; border-radius: 35rpx; padding: 32rpx 24rpx; box-shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05); }
.cus-st-cell { flex: 1; display: flex; flex-direction: column; align-items: center; }
.cus-st-div { width: 1rpx; background: $border; margin: 4rpx 0; }
.cus-st-num { font-size: 42rpx; font-weight: 700; color: $t1; }
.cus-st-num.gold { color: $gold-deep; }
.cus-st-lbl { font-size: 22rpx; color: $t3; margin-top: 8rpx; }

/* 列表 */
.cus-list { padding: 28rpx 38rpx 0; }
.cus-card { background: $card; border-radius: 35rpx; padding: 30rpx 32rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05); }
.cus-cc-row { display: flex; align-items: flex-start; gap: 22rpx; }
.cus-av { width: 88rpx; height: 88rpx; border-radius: 50%; flex-shrink: 0; background: #f0f0f0; position: relative; display: flex; align-items: center; justify-content: center; }
.cus-av-fallback { }
.av-high { background: linear-gradient(135deg, #C9A96E, #B08D4A); }
.av-new { background: linear-gradient(135deg, #6AB98C, #4FA876); }
.av-dorm { background: #C7BFB2; }
.av-normal { background: linear-gradient(135deg, $red, #e85d75); }
.cus-av-char { font-size: 34rpx; font-weight: 700; color: #FFFFFF; }
.cus-vip { position: absolute; bottom: -4rpx; right: -4rpx; width: 34rpx; height: 34rpx; border-radius: 50%; background: $gold; border: 3rpx solid #FFFFFF; display: flex; align-items: center; justify-content: center; }

.cus-cc-info { flex: 1; min-width: 0; }
.cus-cc-name { display: flex; align-items: center; gap: 14rpx; }
.cus-cc-name-txt { font-size: 30rpx; font-weight: 600; color: $t1; max-width: 260rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cus-nt { font-size: 20rpx; font-weight: 600; padding: 3rpx 14rpx; border-radius: 10rpx; flex-shrink: 0; }
.nt-high { background: rgba(196, 30, 58, 0.1); color: $red; }
.nt-new { background: rgba(45, 174, 87, 0.12); color: #2DAE57; }
.nt-dorm { background: rgba(153, 153, 153, 0.14); color: $t3; }
.cus-cc-sub { display: block; font-size: 22rpx; color: $t3; margin-top: 8rpx; }

.cus-tags { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 14rpx; }
.cus-tag { padding: 4rpx 18rpx; border-radius: 999rpx; background: rgba(201, 169, 110, 0.12); }
.cus-tag-txt { font-size: 20rpx; color: $gold-deep; }

.cus-cc-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6rpx; flex-shrink: 0; }
.cus-cc-amt { font-size: 32rpx; font-weight: 700; color: $gold-deep; }
.cus-cc-amt.dim { color: $t3; }
.cus-cc-ord { font-size: 20rpx; color: $t3; }
.cus-cc-chevron { margin-top: 4rpx; }

/* 行为时间线 */
.cus-timeline { margin-top: 4rpx; }
.cus-tl-divider { height: 1rpx; background: #F4F0E9; margin: 28rpx 0; }
.cus-tl-title { display: block; font-size: 24rpx; color: $t3; margin-bottom: 22rpx; }
.cus-tl-hint { display: flex; align-items: center; justify-content: center; gap: 20rpx; padding: 24rpx 0; }
.cus-tl-hint-txt { font-size: 24rpx; color: $t3; }
.cus-tl-error-txt { font-size: 24rpx; color: $red; }
.cus-tl-retry { font-size: 24rpx; color: $red; font-weight: 600; }
.cus-tl-item { display: flex; gap: 22rpx; }
.cus-tl-dotcol { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 22rpx; padding-top: 6rpx; }
.cus-tl-dot { width: 22rpx; height: 22rpx; border-radius: 50%; border: 4rpx solid #FFFFFF; flex-shrink: 0; box-sizing: border-box; }
.cus-tl-dot.order { background: $red; }
.cus-tl-dot.share { background: #4A90D9; }
.cus-tl-dot.view { background: $gold; }
.cus-tl-line { width: 4rpx; flex: 1; background: #F0EBE3; margin: 4rpx 0; }
.cus-tl-content { flex: 1; min-width: 0; padding-bottom: 30rpx; }
.cus-tl-item:last-child .cus-tl-content { padding-bottom: 0; }
.cus-tl-action { display: block; font-size: 26rpx; font-weight: 600; color: $t1; line-height: 1.5; }
.cus-tl-time { display: block; font-size: 22rpx; color: $t3; margin-top: 6rpx; }

/* 本地无匹配 */
.cus-nomatch { padding: 80rpx 0; display: flex; justify-content: center; }
.cus-nomatch-txt { font-size: 26rpx; color: $t3; }

.cus-bottom-pad { height: 40rpx; }
</style>
