<template>
  <view class="cc-page">
    <!-- 自定义导航 -->
    <view class="cc-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="cc-nav-inner">
        <view class="cc-nav-btn" hover-class="cc-hover" @tap="goBack">
          <AppIcon name="arrow-left" :size="40" color="#2C2C2C" :stroke-width="2" />
        </view>
        <text class="cc-nav-title">创作中心</text>
        <view class="cc-nav-btn" hover-class="cc-hover" @tap="go('/videos/creator/settings')">
          <AppIcon name="settings" :size="38" color="#6E6E73" :stroke-width="1.8" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="cc-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- ===== 骨架态 ===== -->
      <view v-if="loading" class="cc-body">
        <view class="cc-sk-head">
          <view class="cc-sk cc-sk-avatar" />
          <view class="cc-sk-head-lines">
            <view class="cc-sk cc-sk-line" style="width: 220rpx; height: 32rpx;" />
            <view class="cc-sk cc-sk-line" style="width: 152rpx; height: 22rpx;" />
          </view>
        </view>
        <view class="cc-sk cc-sk-card" />
        <view class="cc-sk-quick">
          <view class="cc-sk cc-sk-quick-item" />
          <view class="cc-sk cc-sk-quick-item" />
          <view class="cc-sk cc-sk-quick-item" />
        </view>
        <view class="cc-sk-work">
          <view class="cc-sk cc-sk-cover" />
          <view class="cc-sk-work-lines">
            <view class="cc-sk cc-sk-line" style="width: 90%; height: 28rpx;" />
            <view class="cc-sk cc-sk-line" style="width: 50%; height: 22rpx;" />
            <view class="cc-sk cc-sk-line" style="width: 70%; height: 22rpx;" />
          </view>
        </view>
      </view>

      <!-- ===== 错误态 ===== -->
      <view v-else-if="errMsg" class="cc-state">
        <AppIcon name="alert-circle" :size="120" color="#D8D0C4" />
        <text class="cc-state-txt">{{ errMsg }}</text>
        <view class="cc-ghost-btn" hover-class="cc-hover" @tap="loadAll">
          <text class="cc-ghost-txt">重试</text>
        </view>
      </view>

      <template v-else-if="stats">
        <view class="cc-body">
          <!-- ===== 头部：头像 + 昵称 + 认证头衔 ===== -->
          <view class="cc-head">
            <!-- 头像本地兜底：原用 dicebear 外部URL，H5 网络/CSP 挡掉即空白圆圈（2026-07-16 深度走查修） -->
            <smart-avatar class="cc-avatar" :src="profile.avatar" :name="profile.nickname || '创'" />
            <view class="cc-head-info">
              <text class="cc-name">{{ profile.nickname }}</text>
              <view v-if="verifiedTitle" class="cc-badge">
                <AppIcon name="award" :size="20" color="#A8823F" :stroke-width="2" />
                <text class="cc-badge-txt">{{ verifiedTitle }}</text>
              </view>
              <text v-else class="cc-followers num">{{ fmt(stats.followers) }} 粉丝</text>
            </view>
          </view>

          <!-- ===== 数据概览卡 ===== -->
          <view class="cc-stats">
            <!-- 概览头：点击展开/收起 -->
            <view class="cc-stats-top" hover-class="cc-hover" @tap="toggleExpand">
              <text class="cc-stats-t">{{ expanded ? '详细数据' : '数据总览（累计）' }}</text>
              <view class="cc-stats-op">
                <text class="cc-stats-op-txt">{{ expanded ? '收起' : '查看详细' }}</text>
                <AppIcon :name="expanded ? 'chevron-up' : 'chevron-down'" :size="26" color="#999" :stroke-width="2" />
              </view>
            </view>

            <!-- 四格数据：累计口径（后端无近7天快照，诚实展示累计，不造「较上周」）-->
            <view class="cc-grid">
              <view class="cc-grid-item">
                <text class="cc-grid-n num">{{ fmt(stats.totalViews) }}</text>
                <text class="cc-grid-cap">总播放</text>
              </view>
              <view class="cc-grid-item">
                <text class="cc-grid-n num">{{ fmt(stats.totalLikes) }}</text>
                <text class="cc-grid-cap">总点赞</text>
              </view>
              <view class="cc-grid-item">
                <text class="cc-grid-n num">{{ fmt(stats.followers) }}</text>
                <text class="cc-grid-cap">粉丝数</text>
              </view>
              <view class="cc-grid-item">
                <text class="cc-grid-n cc-gold num">¥{{ formatPrice(stats.totalEarnings) }}</text>
                <text class="cc-grid-cap">累计收益</text>
              </view>
            </view>

            <!-- 概览趋势小图（无近7天快照数据→柱全为 0 虚线，不造假）-->
            <view v-if="!expanded" class="cc-chart">
              <view
                v-for="(bar, i) in miniBars"
                :key="i"
                class="cc-bar"
                :class="{ 'cc-bar-zero': bar <= 0 }"
                :style="bar > 0 ? { height: bar + '%' } : {}"
              />
            </view>

            <!-- ===== 展开态：详细数据（合并自 analytics 页）===== -->
            <template v-else>
              <!-- 时间范围切换 -->
              <view class="cc-pill-row">
                <view
                  v-for="r in ranges"
                  :key="r.id"
                  class="cc-pill"
                  :class="{ 'cc-pill-on': range === r.id }"
                  hover-class="cc-hover"
                  @tap="range = r.id"
                >
                  <text class="cc-pill-txt">{{ r.label }}</text>
                </view>
              </view>
              <!-- 指标切换 -->
              <view class="cc-pill-row">
                <view
                  v-for="m in metrics"
                  :key="m.id"
                  class="cc-pill"
                  :class="{ 'cc-pill-on': metric === m.id }"
                  hover-class="cc-hover"
                  @tap="metric = m.id"
                >
                  <text class="cc-pill-txt">{{ m.label }}</text>
                </view>
              </view>

              <!-- 趋势大图（真连 analytics.viewTrend；缺快照→0 虚线柱不造假）-->
              <view class="cc-chart cc-chart-lg">
                <view
                  v-for="(bar, i) in trendBars"
                  :key="i"
                  class="cc-bar"
                  :class="{ 'cc-bar-zero': bar <= 0 }"
                  :style="bar > 0 ? { height: bar + '%' } : {}"
                />
              </view>
              <text v-if="!hasTrend" class="cc-chart-note">暂无每日趋势数据</text>
            </template>
          </view>

          <!-- ===== 展开态：单作品排行 ===== -->
          <template v-if="expanded">
            <view class="cc-sec-t">
              <text class="cc-sec-tt">单作品排行</text>
              <text class="cc-sec-tc">按{{ metricLabel }}</text>
            </view>
            <view v-if="rankList.length === 0" class="cc-rank-empty">
              <text class="cc-rank-empty-txt">还没有作品数据</text>
            </view>
            <view
              v-for="(v, idx) in rankList"
              :key="v.id"
              class="cc-rank"
              hover-class="cc-hover"
              @tap="go('/video/' + v.id)"
            >
              <text class="cc-rank-no num" :class="{ 'cc-rank-no-plain': idx > 1 }">{{ idx + 1 }}</text>
              <view class="cc-rank-cover">
                <smart-cover class="cc-rank-img" :src="v.cover" :title="v.title" type="video" />
              </view>
              <view class="cc-rank-body">
                <text class="cc-rank-title">{{ v.title }}</text>
                <view class="cc-rank-data num">
                  <view class="cc-rank-stat"><AppIcon name="play" :size="22" color="#999" :fill="true" /><text>{{ fmt(v.views) }}</text></view>
                  <view class="cc-rank-stat"><AppIcon name="heart" :size="22" color="#999" :stroke-width="1.8" /><text>{{ fmt(v.likes) }}</text></view>
                </view>
              </view>
            </view>
          </template>

          <!-- ===== 快捷入口行 ===== -->
          <view class="cc-quick">
            <view class="cc-quick-item" hover-class="cc-hover" @tap="go('/videos/creator/earnings-history')">
              <AppIcon name="wallet" :size="40" color="#A8823F" :stroke-width="1.7" />
              <text class="cc-quick-l">收益</text>
            </view>
            <view class="cc-quick-item" hover-class="cc-hover" @tap="go('/videos/creator/settings')">
              <AppIcon name="settings" :size="40" color="#6E6E73" :stroke-width="1.7" />
              <text class="cc-quick-l">设置</text>
            </view>
            <view class="cc-quick-item" hover-class="cc-hover" @tap="go('/videos/publish')">
              <AppIcon name="plus" :size="40" color="#C41E3A" :stroke-width="2" />
              <text class="cc-quick-l cc-quick-l-red">发布新视频</text>
            </view>
          </view>

          <!-- ===== 我的作品 ===== -->
          <view class="cc-sec-t">
            <text class="cc-sec-tt">我的作品</text>
            <text class="cc-sec-tc num">（{{ videos.length }}）</text>
          </view>

          <!-- 空态 -->
          <view v-if="videos.length === 0" class="cc-empty">
            <AppIcon name="file-video" :size="120" color="#D8D0C4" />
            <text class="cc-empty-msg">还没有作品，发布第一条短视频吧</text>
            <view class="cc-primary-btn" hover-class="cc-primary-hover" @tap="go('/videos/publish')">
              <text class="cc-primary-txt">发布第一条视频</text>
            </view>
          </view>

          <!-- 作品卡列表 -->
          <view
            v-for="video in videos"
            :key="video.id"
            class="cc-work"
          >
            <view class="cc-work-cover" hover-class="cc-hover" @tap="go('/video/' + video.id)">
              <smart-cover class="cc-work-img" :src="video.cover" :title="video.title" type="video" />
            </view>
            <view class="cc-work-body">
              <text class="cc-work-title">{{ video.title }}</text>
              <text class="cc-work-time num">{{ video.publishTime }} 发布</text>
              <view class="cc-work-data num">
                <view class="cc-work-stat"><AppIcon name="play" :size="20" color="#6E6E73" :fill="true" /><text>{{ fmt(video.views) }}</text></view>
                <view class="cc-work-stat"><AppIcon name="heart" :size="20" color="#6E6E73" :stroke-width="1.8" /><text>{{ fmt(video.likes) }}</text></view>
                <view class="cc-work-stat"><AppIcon name="message-square" :size="20" color="#6E6E73" :stroke-width="1.8" /><text>{{ video.comments }}</text></view>
              </view>
              <view class="cc-work-foot">
                <!-- 状态标：正常 / 仅自己可见（点看申诉指引）/ 已下架（红标） -->
                <text
                  v-if="video.status === 'removed'"
                  class="cc-st cc-st-down"
                  @tap.stop="showRemovedTip"
                >已下架</text>
                <view
                  v-else-if="video.selfOnly"
                  class="cc-st cc-st-self"
                  @tap.stop="showSelfOnlyTip"
                >
                  <text class="cc-st-self-txt">仅自己可见</text>
                  <AppIcon name="info" :size="20" color="#6E6E73" :stroke-width="1.8" />
                </view>
                <text v-else class="cc-st cc-st-ok">正常</text>

                <!-- 操作：已下架仅留删除 -->
                <view class="cc-work-ops">
                  <text
                    v-if="video.status !== 'removed'"
                    class="cc-op"
                    hover-class="cc-op-hover"
                    @tap.stop="editVideo(video)"
                  >编辑</text>
                  <text class="cc-op" hover-class="cc-op-hover" @tap.stop="deleteVideo(video)">删除</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="cc-bottom-pad" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { navigateTo, goBack } from '@/utils/router'
import {
  creatorApi,
  formatCreatorNumber,
  type CreatorOverview,
  type CreatorVideo,
  type CreatorAnalytics,
} from '@/lib/creator-data'
import { videoApi } from '@/lib/video-data'
import { formatPrice } from '@/utils/format'

const statusBarHeight = ref(0)
const fmt = formatCreatorNumber

// ===== 三态数据 =====
const loading = ref(true)
const errMsg = ref('')
const stats = ref<CreatorOverview | null>(null)
const videos = ref<CreatorVideo[]>([])
const analytics = ref<CreatorAnalytics | null>(null)
const profile = ref({ nickname: '创作者', avatar: '', specialty: '' })

// 认证头衔：来自创作者设置的 specialty（无则隐藏胶囊）
const verifiedTitle = computed(() => profile.value.specialty?.trim() || '')

// ===== 详细数据展开（合并自 analytics 页）=====
const expanded = ref(false)
type RangeId = '7' | '30'
type MetricId = 'views' | 'likes' | 'followers' | 'earnings'
const ranges: { id: RangeId; label: string }[] = [
  { id: '7', label: '近 7 天' },
  { id: '30', label: '近 30 天' },
]
const metrics: { id: MetricId; label: string }[] = [
  { id: 'views', label: '播放' },
  { id: 'likes', label: '点赞' },
  { id: 'followers', label: '粉丝' },
  { id: 'earnings', label: '收益' },
]
const range = ref<RangeId>('7')
const metric = ref<MetricId>('views')
const metricLabel = computed(() => metrics.find((m) => m.id === metric.value)?.label ?? '播放')

// 趋势序列：真连 analytics.viewTrend（后端当前无每日快照 → 返空）
const trend = computed(() => analytics.value?.viewTrend ?? [])
const hasTrend = computed(() => trend.value.length > 0)

// 概览小图：7 根柱；有真实趋势按当前范围取尾部，否则全 0（虚线柱不造假）
function barsFromTrend(count: number): number[] {
  const src = trend.value
  if (!src.length) return new Array(count).fill(0)
  const slice = src.slice(-count)
  // followers 指标暂用 comments 近似（后端 viewTrend 无每日粉丝快照）
  const vals = slice.map((d) =>
    (metric.value === 'likes' ? d.likes : metric.value === 'followers' ? d.comments : d.views) ?? 0,
  )
  const max = Math.max(...vals, 1)
  const bars = vals.map((v) => (v > 0 ? Math.max(6, Math.round((v / max) * 100)) : 0))
  while (bars.length < count) bars.unshift(0)
  return bars
}
const miniBars = computed(() => barsFromTrend(7))
const trendBars = computed(() => barsFromTrend(range.value === '30' ? 30 : 7))

// 单作品排行：按当前指标降序取前 10（真连 analytics.videoMetrics，回退我的作品列表）
const rankList = computed(() => {
  const metricsList = analytics.value?.videoMetrics ?? []
  const source = metricsList.length
    ? metricsList.map((m) => ({
        id: m.id,
        title: m.title,
        cover: videos.value.find((v) => v.id === m.id)?.cover || '',
        views: m.views,
        likes: m.likes,
      }))
    : videos.value.map((v) => ({ id: v.id, title: v.title, cover: v.cover, views: v.views, likes: v.likes }))
  const metricVal = (o: { views: number; likes: number }) => (metric.value === 'likes' ? o.likes : o.views)
  return [...source].sort((a, b) => metricVal(b) - metricVal(a)).slice(0, 10)
})

async function loadAll() {
  loading.value = true
  errMsg.value = ''
  try {
    const [ov, vs, an, st] = await Promise.all([
      creatorApi.getOverview(),
      creatorApi.getMyVideos(),
      creatorApi.getAnalytics(),
      creatorApi.getSettings(),
    ])
    stats.value = ov
    videos.value = vs
    analytics.value = an
    if (st?.profile) {
      profile.value = {
        nickname: st.profile.nickname || '创作者',
        avatar: st.profile.avatar,
        specialty: st.profile.specialty || '',
      }
    }
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function toggleExpand() {
  expanded.value = !expanded.value
}

function go(url: string) {
  navigateTo(url)
}

// 编辑：跳发布页并带 videoId 回填（V4 发布页复用回填口径，按钮文案「保存修改」）
function editVideo(video: CreatorVideo) {
  navigateTo('/videos/publish?id=' + video.id)
}

// 删除：二次确认 → 真删（DELETE /videos/:id）→ 本地移除并刷新概览
const deleting = ref(false)
function deleteVideo(video: CreatorVideo) {
  uni.showModal({
    title: '删除作品',
    content: `确定删除「${video.title}」吗？删除后不可恢复。`,
    confirmText: '删除',
    confirmColor: '#C41E3A',
    success: async (res) => {
      if (!res.confirm || deleting.value) return
      deleting.value = true
      uni.showLoading({ title: '删除中', mask: true })
      try {
        const r = await videoApi.delete(video.id)
        uni.hideLoading()
        if (r?.success === false) {
          uni.showToast({ title: r.message || '删除失败', icon: 'none' })
          return
        }
        // 本地即时移除，避免整列表重拉的闪烁；概览计数后台刷新
        videos.value = videos.value.filter((v) => v.id !== video.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        creatorApi.getOverview().then((ov) => { stats.value = ov }).catch(() => {})
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: (e as { message?: string })?.message || '删除失败', icon: 'none' })
      } finally {
        deleting.value = false
      }
    },
  })
}

// 审核无感化：SELF_ONLY / 已下架说明 + 申诉指引
function showSelfOnlyTip() {
  uni.showModal({
    title: '仅自己可见',
    content: '该作品经系统复核暂时调整为仅自己可见，其他用户看不到，不影响您查看和管理。如有疑问，请联系客服申诉，我们会尽快为您复核。',
    showCancel: false,
    confirmText: '知道了',
  })
}
function showRemovedTip() {
  uni.showModal({
    title: '已下架',
    content: '该作品因涉及违规内容已被下架，具体原因可在消息中心查看。如有疑问，请联系客服申诉。',
    showCancel: false,
    confirmText: '知道了',
  })
}

onMounted(() => {
  uni.getSystemInfo({ success: (res) => { statusBarHeight.value = res.statusBarHeight || 0 } })
  loadAll()
})
</script>

<style scoped>
/* 视觉 token：宣纸白 #FAF8F5 / 卡片白 / 朱红 #C41E3A / 金 #C9A96E·深金 #A8823F / 文字 #2C2C2C·#6E6E73·#999 / 圆角 36·999 */
.cc-page {
  min-height: 100vh;
  background-color: #FAF8F5;
}
.num { font-variant-numeric: tabular-nums; }
.cc-hover { opacity: 0.6; }

/* 自定义导航 */
.cc-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  background-color: #FAF8F5;
}
.cc-nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 24rpx;
}
.cc-nav-btn {
  width: 68rpx;
  height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cc-nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2C2C2C;
  letter-spacing: 1rpx;
}
.cc-scroll {
  height: 100vh;
  box-sizing: border-box;
}
.cc-body { padding-bottom: 20rpx; }

/* ===== 头部 ===== */
.cc-head {
  display: flex;
  align-items: center;
  gap: 26rpx;
  padding: 36rpx 40rpx 28rpx;
}
.cc-avatar {
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  border: 4rpx solid #FFFFFF;
  box-shadow: 0 4rpx 16rpx rgba(44, 44, 44, 0.1);
  background-color: #E5E5E5;
  flex-shrink: 0;
}
.cc-head-info { display: flex; flex-direction: column; gap: 10rpx; min-width: 0; }
.cc-name { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.cc-badge {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  align-self: flex-start;
  background-color: rgba(201, 169, 110, 0.14);
  border: 1rpx solid rgba(201, 169, 110, 0.5);
  border-radius: 999rpx;
  padding: 5rpx 20rpx;
}
.cc-badge-txt { font-size: 21rpx; color: #A8823F; }
.cc-followers { font-size: 26rpx; color: #999; }

/* ===== 数据概览卡 ===== */
.cc-stats {
  margin: 0 40rpx;
  background-color: #FFFFFF;
  border-radius: 36rpx;
  box-shadow: 0 4rpx 24rpx rgba(44, 44, 44, 0.05);
  overflow: hidden;
}
.cc-stats-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx 8rpx;
}
.cc-stats-t { font-size: 26rpx; font-weight: 700; color: #2C2C2C; }
.cc-stats-op { display: flex; align-items: center; gap: 4rpx; }
.cc-stats-op-txt { font-size: 23rpx; color: #999; }
.cc-grid { display: flex; padding: 16rpx 12rpx 4rpx; }
.cc-grid-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 4rpx;
}
.cc-grid-n { font-size: 36rpx; font-weight: 700; color: #2C2C2C; }
.cc-gold { color: #A8823F; }
.cc-grid-cap { font-size: 21rpx; color: #999; }

/* 趋势柱图（CSS 柱，无 SVG/canvas）*/
.cc-chart {
  display: flex;
  align-items: flex-end;
  gap: 14rpx;
  height: 132rpx;
  padding: 16rpx 32rpx 28rpx;
}
.cc-chart-lg { height: 236rpx; padding-top: 28rpx; }
.cc-bar {
  flex: 1;
  min-height: 6rpx;
  background: linear-gradient(180deg, #D8899B, #C41E3A);
  border-radius: 6rpx 6rpx 0 0;
}
.cc-bar-zero {
  height: 6rpx;
  background: none;
  border: 1rpx dashed #E3DCD0;
  border-radius: 4rpx;
}
.cc-chart-note {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: #999;
  padding: 0 0 24rpx;
}

/* 时间/指标胶囊 */
.cc-pill-row { display: flex; gap: 16rpx; padding: 20rpx 32rpx 0; flex-wrap: wrap; }
.cc-pill {
  border: 1rpx solid #EDE7DD;
  background-color: #FFFFFF;
  border-radius: 999rpx;
  padding: 10rpx 26rpx;
}
.cc-pill-txt { font-size: 23rpx; color: #6E6E73; }
.cc-pill-on {
  border-color: #C41E3A;
  background-color: rgba(196, 30, 58, 0.05);
}
.cc-pill-on .cc-pill-txt { color: #C41E3A; font-weight: 700; }

/* ===== 单作品排行 ===== */
.cc-sec-t {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  padding: 24rpx 40rpx 16rpx;
}
.cc-sec-tt { font-size: 30rpx; font-weight: 700; color: #2C2C2C; }
.cc-sec-tc { font-size: 24rpx; color: #999; }
.cc-rank {
  display: flex;
  align-items: center;
  gap: 22rpx;
  background-color: #FFFFFF;
  border-radius: 28rpx;
  margin: 0 40rpx 16rpx;
  padding: 18rpx 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(44, 44, 44, 0.04);
}
.cc-rank-no {
  width: 40rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  font-style: italic;
  color: #C9A96E;
  flex-shrink: 0;
}
.cc-rank-no-plain { color: #C7C0B4; }
.cc-rank-cover {
  position: relative;
  width: 88rpx;
  height: 118rpx;
  border-radius: 16rpx;
  overflow: hidden;
  flex-shrink: 0;
}
.cc-rank-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.cc-rank-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.cc-rank-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #2C2C2C;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cc-rank-data { display: flex; gap: 20rpx; }
.cc-rank-stat { display: flex; align-items: center; gap: 6rpx; font-size: 22rpx; color: #999; }
.cc-rank-empty { padding: 40rpx; text-align: center; }
.cc-rank-empty-txt { font-size: 24rpx; color: #999; }

/* ===== 快捷入口行 ===== */
.cc-quick { display: flex; gap: 20rpx; padding: 24rpx 40rpx; }
.cc-quick-item {
  flex: 1;
  background-color: #FFFFFF;
  border-radius: 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(44, 44, 44, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 26rpx 8rpx;
}
.cc-quick-l { font-size: 23rpx; color: #6E6E73; }
.cc-quick-l-red { color: #C41E3A; font-weight: 600; }

/* ===== 作品卡 ===== */
.cc-work {
  display: flex;
  gap: 24rpx;
  background-color: #FFFFFF;
  border-radius: 32rpx;
  margin: 0 40rpx 20rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(44, 44, 44, 0.04);
}
.cc-work-cover {
  position: relative;
  width: 148rpx;
  height: 197rpx;
  border-radius: 20rpx;
  overflow: hidden;
  flex-shrink: 0;
}
.cc-work-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.cc-work-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10rpx; padding: 4rpx 0; }
.cc-work-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #2C2C2C;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cc-work-time { font-size: 22rpx; color: #999; }
.cc-work-data { display: flex; gap: 20rpx; }
.cc-work-stat { display: flex; align-items: center; gap: 6rpx; font-size: 22rpx; color: #6E6E73; }
.cc-work-foot {
  display: flex;
  align-items: center;
  margin-top: auto;
  padding-top: 8rpx;
}
.cc-work-ops { margin-left: auto; display: flex; gap: 28rpx; }
.cc-op { font-size: 23rpx; color: #6E6E73; }
.cc-op-hover { opacity: 0.5; }

/* 状态标三种 */
.cc-st { font-size: 20rpx; border-radius: 10rpx; padding: 4rpx 14rpx; }
.cc-st-ok { background-color: #F1EEE8; color: #999; }
.cc-st-self {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  background-color: rgba(110, 110, 115, 0.12);
}
.cc-st-self-txt { font-size: 20rpx; color: #6E6E73; }
.cc-st-down { background-color: rgba(214, 69, 65, 0.08); color: #D64541; }

/* ===== 空态 ===== */
.cc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28rpx;
  padding: 80rpx 80rpx 40rpx;
}
.cc-empty-msg { font-size: 28rpx; color: #6E6E73; text-align: center; }
.cc-primary-btn {
  width: 344rpx;
  height: 88rpx;
  border-radius: 999rpx;
  background-color: #C41E3A;
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cc-primary-hover { opacity: 0.85; }
.cc-primary-txt { font-size: 28rpx; color: #FFFFFF; font-weight: 600; }

/* ===== 状态：加载/错误 ===== */
.cc-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28rpx;
  padding: 180rpx 80rpx;
}
.cc-state-txt { font-size: 28rpx; color: #6E6E73; text-align: center; }
.cc-ghost-btn {
  width: 300rpx;
  height: 84rpx;
  border-radius: 999rpx;
  border: 1rpx solid #E5DED2;
  background-color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cc-ghost-txt { font-size: 28rpx; color: #2C2C2C; }

/* ===== 骨架态 ===== */
.cc-sk {
  background: linear-gradient(90deg, #EFEBE4 25%, #F7F4EF 37%, #EFEBE4 63%);
  background-size: 400% 100%;
  animation: cc-shimmer 1.4s ease infinite;
}
@keyframes cc-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
.cc-sk-head { display: flex; gap: 26rpx; padding: 36rpx 40rpx; }
.cc-sk-avatar { width: 104rpx; height: 104rpx; border-radius: 50%; flex-shrink: 0; }
.cc-sk-head-lines { display: flex; flex-direction: column; justify-content: center; gap: 16rpx; }
.cc-sk-line { border-radius: 8rpx; }
.cc-sk-card { margin: 0 40rpx; height: 296rpx; border-radius: 36rpx; }
.cc-sk-quick { display: flex; gap: 20rpx; padding: 24rpx 40rpx; }
.cc-sk-quick-item { flex: 1; height: 116rpx; border-radius: 28rpx; }
.cc-sk-work { display: flex; gap: 24rpx; padding: 12rpx 40rpx; }
.cc-sk-cover { width: 148rpx; height: 197rpx; border-radius: 20rpx; flex-shrink: 0; }
.cc-sk-work-lines { flex: 1; display: flex; flex-direction: column; gap: 18rpx; padding-top: 8rpx; }

.cc-bottom-pad { height: 60rpx; }
</style>
