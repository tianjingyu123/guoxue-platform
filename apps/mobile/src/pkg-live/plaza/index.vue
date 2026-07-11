<script setup lang="ts">
/** 直播广场页 — H3 视觉稿 A 类逐像素还原（首页直播 Tab 进入）
 * 真连保留：直播中/预告 = liveApi.getPlaza(按 status 分组)；回放 = liveApi.getReplays；预约 = bookRoom/unbookRoom
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import DegradedBanner from '@/components/degraded-banner.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  liveApi,
  liveTabs,
  formatLiveDuration,
  formatLiveViews,
  type LiveItem,
  type LiveReplay,
} from '@/lib/live-data'

const activeTab = ref<string>('全部')
const loading = ref(true)
const error = ref('')
const list = ref<LiveItem[]>([])
const replays = ref<LiveReplay[]>([])
// 预约态本地会话乐观维护（后端无「我是否已约」查询）
const bookedMap = ref<Record<string, boolean>>({})
const booking = ref<Record<string, boolean>>({})

const filtered = computed<LiveItem[]>(() => {
  return list.value.filter((live) => {
    if (activeTab.value === '全部') return true
    if (activeTab.value === '知识授课') return live.type === 'knowledge'
    if (activeTab.value === '电商带货') return live.type === 'commerce'
    if (activeTab.value === '关注的') return false
    return true
  })
})

// 直播中：观看数倒序
const livesNow = computed(() =>
  filtered.value
    .filter((l) => l.status === 'live')
    .slice()
    .sort((a, b) => (b.viewerCount || 0) - (a.viewerCount || 0)),
)
const livesUpcoming = computed(() => filtered.value.filter((l) => l.status === 'upcoming'))

// 空态规则：直播中 0 场 → 预告首场放大为 16:9 大卡
const noLive = computed(() => livesNow.value.length === 0)
const featuredUpcoming = computed(() => (noLive.value ? livesUpcoming.value[0] : undefined))
const restUpcoming = computed(() =>
  noLive.value ? livesUpcoming.value.slice(1) : livesUpcoming.value,
)

// 双列均分（保持等高网格·左右两列）
function splitCols<T>(arr: T[]): [T[], T[]] {
  const l: T[] = []
  const r: T[] = []
  arr.forEach((it, i) => (i % 2 === 0 ? l : r).push(it))
  return [l, r]
}
const liveCols = computed(() => splitCols(livesNow.value))
const replayCols = computed(() => splitCols(replays.value))

// 预告「明日」判定（scheduledTime 含「明天/明日」→ 金色节点）
function isTomorrow(t?: string): boolean {
  return !!t && (t.includes('明天') || t.includes('明日'))
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [plaza, rp] = await Promise.all([
      liveApi.getPlaza(activeTab.value),
      liveApi.getReplays(),
    ])
    list.value = plaza
    replays.value = rp
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function onTabChange(tab: string) {
  activeTab.value = tab
  fetchData()
}

onMounted(() => {
  fetchData()
})

function onSearch() {
  navigateTo('/search')
}

function openLive(id: string) {
  navigateTo(`/live/${id}`)
}
function openReplay(id: string) {
  navigateTo(`/live/replay/${id}`)
}

// 预约真连（乐观切换·失败回滚 + toast）
async function toggleBook(item: LiveItem) {
  const id = item.id
  if (booking.value[id]) return
  const next = !bookedMap.value[id]
  booking.value[id] = true
  bookedMap.value[id] = next
  try {
    if (next) await liveApi.bookRoom(id)
    else await liveApi.unbookRoom(id)
  } catch (e) {
    bookedMap.value[id] = !next // 回滚
    uni.showToast({ title: (e as Error)?.message || '操作失败，请重试', icon: 'none' })
  } finally {
    booking.value[id] = false
  }
}
</script>

<template>
  <view class="page">
    <DegradedBanner dep="live" text="直播服务临时维护中，观看可能不稳定，请稍后再试" />

    <!-- 固定头部：返回 + 页题 + 搜索 -->
    <view class="header">
      <view class="nav-back" hover-class="tap" @tap="goBack">
        <AppIcon name="chevron-left" :size="36" color="#2B2620" />
      </view>
      <text class="nav-title">直播广场</text>
      <view class="nav-search" hover-class="tap" @tap="onSearch">
        <AppIcon name="search" :size="34" color="#8A8578" />
      </view>
    </view>

    <!-- 分类 tabs（下划线风格） -->
    <view class="tabs">
      <view
        v-for="tab in liveTabs"
        :key="tab"
        class="tab"
        :class="activeTab === tab && 'tab-on'"
        @tap="onTabChange(tab)"
      >
        <text class="tab-txt">{{ tab }}</text>
        <view v-if="activeTab === tab" class="tab-line" />
      </view>
    </view>

    <!-- 内容区 -->
    <scroll-view scroll-y class="content">
      <!-- 骨架 -->
      <view v-if="loading" class="skeleton">
        <view class="sk-grid">
          <view v-for="i in 4" :key="i" class="sk-card" />
        </view>
      </view>

      <!-- 错误 -->
      <view v-else-if="error" class="state">
        <view class="state-icon"><AppIcon name="alert-circle" :size="48" color="#B0A99A" /></view>
        <text class="state-txt">{{ error }}</text>
        <view class="retry-btn" hover-class="tap" @tap="fetchData">
          <text class="retry-txt">重新加载</text>
        </view>
      </view>

      <template v-else>
        <!-- ══ 直播中 ══（0 场时整区收起） -->
        <block v-if="livesNow.length > 0">
          <view class="sec">
            <text class="sec-h">直播中</text>
            <text class="sec-count">{{ livesNow.length }} 场</text>
          </view>
          <view class="grid">
            <view class="gcol">
              <view
                v-for="live in liveCols[0]"
                :key="live.id"
                class="card"
                hover-class="card-press"
                @tap="openLive(live.id)"
              >
                <view class="cov r34 live">
                  <smart-cover class="cov-img zoom" :src="live.cover" :title="live.title" type="live" />
                  <view class="badge tr live">
                    <view class="dot" />
                    <text class="badge-txt">LIVE</text>
                    <view class="eq"><view class="eq-i" /><view class="eq-i" /><view class="eq-i" /></view>
                  </view>
                  <view class="badge bl">
                    <AppIcon name="eye" :size="20" color="#ffffff" />
                    <text class="badge-txt">{{ formatLiveViews(live.viewerCount) }}</text>
                  </view>
                </view>
                <view class="cbody">
                  <text class="ctitle">{{ live.title }}</text>
                  <view class="cmeta">
                    <view class="mavatar">
                      <image v-if="live.hostAvatar" class="mavatar-img" :src="live.hostAvatar" mode="aspectFill" lazy-load />
                      <text v-else class="mavatar-ph">{{ live.hostName.charAt(0) }}</text>
                    </view>
                    <text class="mname">{{ live.hostName }}</text>
                    <text class="mmetric">直播中</text>
                  </view>
                </view>
              </view>
            </view>
            <view class="gcol">
              <view
                v-for="live in liveCols[1]"
                :key="live.id"
                class="card"
                hover-class="card-press"
                @tap="openLive(live.id)"
              >
                <view class="cov r34 live">
                  <smart-cover class="cov-img zoom" :src="live.cover" :title="live.title" type="live" />
                  <view class="badge tr live">
                    <view class="dot" />
                    <text class="badge-txt">LIVE</text>
                    <view class="eq"><view class="eq-i" /><view class="eq-i" /><view class="eq-i" /></view>
                  </view>
                  <view class="badge bl">
                    <AppIcon name="eye" :size="20" color="#ffffff" />
                    <text class="badge-txt">{{ formatLiveViews(live.viewerCount) }}</text>
                  </view>
                </view>
                <view class="cbody">
                  <text class="ctitle">{{ live.title }}</text>
                  <view class="cmeta">
                    <view class="mavatar">
                      <image v-if="live.hostAvatar" class="mavatar-img" :src="live.hostAvatar" mode="aspectFill" lazy-load />
                      <text v-else class="mavatar-ph">{{ live.hostName.charAt(0) }}</text>
                    </view>
                    <text class="mname">{{ live.hostName }}</text>
                    <text class="mmetric">直播中</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </block>

        <!-- ══ 直播预告 ══ 时间轴 + 预约钮双态 -->
        <block v-if="livesUpcoming.length > 0">
          <view class="sec">
            <text class="sec-h">直播预告</text>
            <text class="sec-count">{{ livesUpcoming.length }} 场</text>
          </view>

          <!-- 空态规则：直播中 0 场 → 首场预告放大为 16:9 大卡 -->
          <view
            v-if="featuredUpcoming"
            class="feat-card"
            hover-class="card-press"
            @tap="openLive(featuredUpcoming.id)"
          >
            <view class="feat-cov r169">
              <smart-cover class="cov-img" :src="featuredUpcoming.cover" :title="featuredUpcoming.title" type="live" />
              <view class="feat-mask" />
              <view class="badge tr up">
                <AppIcon name="clock" :size="20" color="#ffffff" />
                <text class="badge-txt">{{ featuredUpcoming.scheduledTime || '即将开播' }}</text>
              </view>
              <view class="feat-info">
                <text class="feat-title">{{ featuredUpcoming.title }}</text>
                <text class="feat-host">{{ featuredUpcoming.hostName }}</text>
              </view>
            </view>
            <view class="feat-bar">
              <view class="feat-book" @tap.stop="toggleBook(featuredUpcoming)">
                <view
                  class="rsv"
                  :class="bookedMap[featuredUpcoming.id] ? 'rsv-yes' : 'rsv-no'"
                >
                  <AppIcon
                    v-if="!bookedMap[featuredUpcoming.id]"
                    name="bell"
                    :size="22"
                    color="#C41E3A"
                  />
                  <text class="rsv-txt">{{ bookedMap[featuredUpcoming.id] ? '已预约' : '预约' }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 时间轴列表 -->
          <view v-if="restUpcoming.length > 0" class="tl">
            <view
              v-for="(item, idx) in restUpcoming"
              :key="item.id"
              class="tl-row"
              :class="idx > 0 && 'tl-divider'"
              hover-class="tl-press"
              @tap="openLive(item.id)"
            >
              <view class="tl-node" :class="isTomorrow(item.scheduledTime) && 'tl-node-tmr'" />
              <view class="tl-time" :class="isTomorrow(item.scheduledTime) && 'tl-time-tmr'">
                <text class="tl-time-b">{{ item.scheduledTime || '待定' }}</text>
                <text class="tl-time-s">{{ item.viewerCount }} 人预约</text>
              </view>
              <view class="tl-main">
                <text class="tl-t">{{ item.title }}</text>
                <text class="tl-a">{{ item.hostName }}</text>
              </view>
              <view
                class="rsv rsv-sm"
                :class="bookedMap[item.id] ? 'rsv-yes' : 'rsv-no'"
                @tap.stop="toggleBook(item)"
              >
                <text class="rsv-txt">{{ bookedMap[item.id] ? '已预约' : '预约' }}</text>
              </view>
            </view>
          </view>
        </block>

        <!-- ══ 直播回放 ══ 双列网格 -->
        <block v-if="replays.length > 0">
          <view class="sec">
            <text class="sec-h">直播回放</text>
            <text class="sec-count">结束时间倒序</text>
          </view>
          <view class="grid">
            <view class="gcol">
              <view
                v-for="rp in replayCols[0]"
                :key="rp.id"
                class="card"
                hover-class="card-press"
                @tap="openReplay(rp.id)"
              >
                <view class="cov r34">
                  <smart-cover class="cov-img" :src="rp.cover" :title="rp.title" type="live" />
                  <view class="badge tr rep"><text class="badge-txt">回放</text></view>
                  <view class="badge bl"><text class="badge-txt">{{ formatLiveDuration(rp.duration) }}</text></view>
                </view>
                <view class="cbody">
                  <text class="ctitle">{{ rp.title }}</text>
                  <view class="cmeta">
                    <view class="mavatar">
                      <image v-if="rp.hostAvatar" class="mavatar-img" :src="rp.hostAvatar" mode="aspectFill" lazy-load />
                      <text v-else class="mavatar-ph">{{ rp.hostName.charAt(0) }}</text>
                    </view>
                    <text class="mname">{{ rp.hostName }}</text>
                    <text class="mmetric">{{ formatLiveViews(rp.viewers) }}次</text>
                  </view>
                </view>
              </view>
            </view>
            <view class="gcol">
              <view
                v-for="rp in replayCols[1]"
                :key="rp.id"
                class="card"
                hover-class="card-press"
                @tap="openReplay(rp.id)"
              >
                <view class="cov r34">
                  <smart-cover class="cov-img" :src="rp.cover" :title="rp.title" type="live" />
                  <view class="badge tr rep"><text class="badge-txt">回放</text></view>
                  <view class="badge bl"><text class="badge-txt">{{ formatLiveDuration(rp.duration) }}</text></view>
                </view>
                <view class="cbody">
                  <text class="ctitle">{{ rp.title }}</text>
                  <view class="cmeta">
                    <view class="mavatar">
                      <image v-if="rp.hostAvatar" class="mavatar-img" :src="rp.hostAvatar" mode="aspectFill" lazy-load />
                      <text v-else class="mavatar-ph">{{ rp.hostName.charAt(0) }}</text>
                    </view>
                    <text class="mname">{{ rp.hostName }}</text>
                    <text class="mmetric">{{ formatLiveViews(rp.viewers) }}次</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
          <view class="foot-tip"><text class="foot-tip-txt">上滑加载更多回放</text></view>
        </block>

        <!-- 全空态 -->
        <view
          v-if="livesNow.length === 0 && livesUpcoming.length === 0 && replays.length === 0"
          class="empty"
        >
          <view class="empty-icon"><AppIcon name="calendar" :size="56" color="#B0A99A" /></view>
          <text class="empty-txt">暂无相关直播</text>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}

/* ── 头部 ── 导航行高 96rpx（48px）*/
.header {
  display: flex;
  align-items: center;
  height: 96rpx;
  padding: 0 24rpx;
  background: rgba(250, 248, 245, 0.94);
  backdrop-filter: blur(20rpx);
}
.nav-back,
.nav-search {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: #ffffff;
  box-shadow: 0 2rpx 6rpx rgba(60, 50, 40, 0.08);
}
.nav-title {
  flex: 1;
  text-align: center;
  font-family: var(--font-serif);
  font-size: 34rpx;
  font-weight: 700;
  color: #2b2620;
}
.tap {
  opacity: 0.6;
}

/* ── tabs 下划线 ── */
.tabs {
  display: flex;
  align-items: center;
  height: 80rpx;
  padding: 0 24rpx;
  gap: 48rpx;
  background: #faf8f5;
}
.tab {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
}
.tab-txt {
  font-size: 28rpx;
  color: #8a8578;
  white-space: nowrap;
}
.tab-on .tab-txt {
  color: #c41e3a;
  font-weight: 700;
}
.tab-line {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 12rpx;
  width: 40rpx;
  height: 6rpx;
  background: #c41e3a;
  border-radius: 999rpx;
}

/* ── 内容 ── */
.content {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  padding-bottom: 48rpx;
}

/* 区块头：上 36 下 20（18/10px），题 34rpx 衬线 700 + 计数右对齐 */
.sec {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 36rpx 24rpx 20rpx;
}
.sec-h {
  font-family: var(--font-serif);
  font-size: 34rpx;
  font-weight: 700;
  color: #2b2620;
}
.sec-count {
  font-size: 24rpx;
  color: #b0a99a;
}

/* 双列网格 */
.grid {
  display: flex;
  gap: 18rpx;
  padding: 0 24rpx;
}
.gcol {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  min-width: 0;
}
.card {
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(60, 50, 40, 0.06);
}
.card-press {
  transform: scale(0.98);
}

.cov {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #f6f1e7;
}
.r34 {
  padding-top: 133.33%;
}
.r169 {
  padding-top: 56.25%;
}
.cov-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
/* 封面呼吸变焦 14s（直播中） */
.cov.live .zoom {
  animation: slowzoom 14s ease-in-out infinite alternate;
}

/* 角标 */
.badge {
  position: absolute;
  height: 40rpx;
  padding: 0 12rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(0, 0, 0, 0.55);
}
.badge.tr {
  top: 16rpx;
  right: 16rpx;
}
.badge.bl {
  bottom: 16rpx;
  left: 16rpx;
}
.badge.live {
  background: #c41e3a;
}
.badge.up {
  background: #c41e3a;
}
.badge.rep {
  background: rgba(0, 0, 0, 0.55);
}
.badge-txt {
  font-size: 22rpx;
  line-height: 1;
  color: #ffffff;
  font-weight: 500;
  white-space: nowrap;
}
.badge.live .badge-txt {
  font-weight: 700;
}
/* 呼吸红点 */
.dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 6rpx;
  background: #ffffff;
  animation: breathe 1.6s ease-in-out infinite;
}
/* 音浪律动条 1.1s 错峰 */
.eq {
  display: flex;
  align-items: flex-end;
  gap: 3rpx;
  height: 20rpx;
}
.eq-i {
  width: 4rpx;
  border-radius: 2rpx;
  background: #ffffff;
  animation: eq 1.1s ease-in-out infinite;
}
.eq-i:nth-child(1) {
  height: 8rpx;
}
.eq-i:nth-child(2) {
  height: 18rpx;
  animation-delay: 0.25s;
}
.eq-i:nth-child(3) {
  height: 12rpx;
  animation-delay: 0.5s;
}

/* 卡片信息区 */
.cbody {
  padding: 20rpx;
}
.ctitle {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 28rpx;
  line-height: 1.45;
  font-weight: 500;
  color: #2b2620;
}
.cmeta {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.mavatar {
  width: 36rpx;
  height: 36rpx;
  border-radius: 18rpx;
  overflow: hidden;
  flex-shrink: 0;
  background: #f6f1e7;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mavatar-img {
  width: 100%;
  height: 100%;
}
.mavatar-ph {
  font-size: 20rpx;
  color: #8a8578;
}
.mname {
  flex: 1;
  font-size: 24rpx;
  color: #8a8578;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.mmetric {
  flex-shrink: 0;
  font-size: 22rpx;
  color: #b0a99a;
}

/* ── 预告放大大卡（空态规则）── */
.feat-card {
  margin: 0 24rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(60, 50, 40, 0.06);
}
.feat-cov {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #f6f1e7;
}
.feat-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.55), transparent 55%);
}
.feat-info {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: 20rpx;
}
.feat-title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.4;
}
.feat-host {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
}
.feat-bar {
  display: flex;
  justify-content: flex-end;
  padding: 20rpx 24rpx;
}
.feat-book {
  display: flex;
}

/* ── 预告时间轴 ── */
.tl {
  margin: 0 24rpx;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(60, 50, 40, 0.06);
  padding: 8rpx 0;
}
.tl-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 28rpx;
}
.tl-divider {
  border-top: 2rpx solid #f2ede4;
}
.tl-press {
  background: #faf8f5;
}
.tl-node {
  width: 16rpx;
  height: 16rpx;
  border-radius: 8rpx;
  background: #c41e3a;
  flex-shrink: 0;
}
.tl-node-tmr {
  background: #c9a96e;
}
.tl-time {
  width: 148rpx;
  flex-shrink: 0;
}
.tl-time-b {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #c41e3a;
}
.tl-time-tmr .tl-time-b {
  color: #c9a96e;
}
.tl-time-s {
  font-size: 20rpx;
  color: #b0a99a;
}
.tl-main {
  flex: 1;
  min-width: 0;
}
.tl-t {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 28rpx;
  font-weight: 500;
  line-height: 1.4;
  color: #2b2620;
}
.tl-a {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8a8578;
}

/* 预约钮双态 */
.rsv {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 0 24rpx;
  height: 56rpx;
  border-radius: 28rpx;
}
.rsv-sm {
  min-width: 120rpx;
  padding: 0 20rpx;
}
.rsv-no {
  border: 2rpx solid #c41e3a;
  background: transparent;
}
.rsv-no .rsv-txt {
  color: #c41e3a;
  font-weight: 500;
}
.rsv-yes {
  background: #efeae2;
}
.rsv-yes .rsv-txt {
  color: #8a8578;
}
.rsv-txt {
  font-size: 24rpx;
  line-height: 1;
  white-space: nowrap;
}

/* 底部提示 */
.foot-tip {
  padding: 32rpx 0 40rpx;
  text-align: center;
}
.foot-tip-txt {
  font-size: 22rpx;
  color: #b0a99a;
}

/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
}
.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 160rpx;
  height: 160rpx;
  border-radius: 999rpx;
  background: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(60, 50, 40, 0.06);
  margin-bottom: 32rpx;
}
.empty-txt {
  font-size: 28rpx;
  color: #b0a99a;
}

/* 骨架 */
.skeleton {
  padding: 36rpx 24rpx;
}
.sk-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18rpx;
}
.sk-card {
  height: 420rpx;
  border-radius: 24rpx;
  background: linear-gradient(90deg, #efeae2 25%, #f6f1e7 50%, #efeae2 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

/* 错误/重试 */
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
}
.state-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 160rpx;
  height: 160rpx;
  border-radius: 999rpx;
  background: #ffffff;
  margin-bottom: 32rpx;
}
.state-txt {
  font-size: 28rpx;
  color: #8a8578;
  margin-bottom: 32rpx;
}
.retry-btn {
  padding: 16rpx 48rpx;
  background: #c41e3a;
  border-radius: 999rpx;
}
.retry-txt {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 500;
}

@keyframes breathe {
  0%,
  100% {
    transform: scale(0.75);
    opacity: 0.55;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes eq {
  0%,
  100% {
    transform: scaleY(0.4);
  }
  50% {
    transform: scaleY(1);
  }
}
@keyframes slowzoom {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.05);
  }
}
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
