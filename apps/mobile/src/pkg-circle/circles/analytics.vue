<!--
  内容分析（从原型 app/circles/[id]/analytics/contents/page.tsx 高保真迁移）
  KPI四卡 + 本周浏览&点赞趋势柱状图(CSS双柱,跨端替代recharts) + 热门内容TOP5
-->
<template>
  <view class="page">
    <view class="hdr" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="hdr-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="hdr-title">内容分析</text>
    </view>

    <scroll-view scroll-y class="scroll">
      <view class="body">
        <!-- KPI -->
        <view class="kpis">
          <view v-for="k in kpis" :key="k.label" class="kpi">
            <view class="kpi-icon" :style="{ background: k.bg }"><app-icon :name="k.icon" :size="24" :color="k.color" /></view>
            <text class="kpi-val">{{ k.value }}</text>
            <text class="kpi-label">{{ k.label }}</text>
          </view>
        </view>

        <!-- 趋势图 -->
        <text class="sec-title">本周浏览 & 点赞趋势</text>
        <view class="chart-card">
          <view v-if="chartData.length" class="chart">
            <view v-for="d in chartData" :key="d.day" class="chart-col">
              <view class="bars">
                <view class="bar views" :style="{ height: (d.views / maxVal * 100) + '%' }" />
                <view class="bar likes" :style="{ height: (d.likes / maxVal * 100) + '%' }" />
              </view>
              <text class="chart-x">{{ d.day }}</text>
            </view>
          </view>
          <view v-else class="chart-empty"><text class="empty-t">暂无趋势数据</text></view>
          <view class="legend">
            <view class="lg"><view class="lg-dot views" /><text class="lg-t">浏览</text></view>
            <view class="lg"><view class="lg-dot likes" /><text class="lg-t">点赞</text></view>
          </view>
        </view>

        <!-- TOP5 -->
        <view class="top-title"><app-icon name="trending-up" :size="28" color="#C41E3A" /><text class="top-title-t">热门内容 TOP 5</text></view>
        <view v-if="!topPosts.length" class="top-empty">
          <app-icon name="trending-up" :size="72" color="#D9D4C8" />
          <text class="empty-t">暂无热门内容</text>
        </view>
        <view v-else class="top-list">
          <view v-for="(post, idx) in topPosts" :key="post.id" class="post">
            <text class="post-rank" :class="rankCls(idx)">{{ idx + 1 }}</text>
            <view class="post-main">
              <text class="post-title">{{ post.title }}</text>
              <view class="post-meta">
                <view class="post-author"><image lazy-load class="post-avatar" :src="post.avatar" mode="aspectFill" /><text class="post-author-t">{{ post.author }}</text></view>
                <view class="meta-item"><app-icon name="eye" :size="20" color="#999999" /><text class="meta-t">{{ post.views.toLocaleString() }}</text></view>
                <view class="meta-item"><app-icon name="heart" :size="20" color="#999999" /><text class="meta-t">{{ post.likes }}</text></view>
                <view class="meta-item"><app-icon name="message-circle" :size="20" color="#999999" /><text class="meta-t">{{ post.comments }}</text></view>
              </view>
            </view>
          </view>
        </view>
        <view style="height: 40rpx;" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/**
 * 内容分析页（纯展示）
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

const statusBarH = uni.getSystemInfoSync().statusBarHeight || 20

interface ChartPoint { day: string; views: number; likes: number }
interface TopPost { id: string; title: string; author: string; avatar: string; views: number; likes: number; comments: number; shares: number }

// 内容分析数据来源于圈子仪表盘（需 circleId + 圈主鉴权）。此页当前无入口/无 circleId 上下文，
// 为杜绝穿帮假数据（此前为「周易大师/张玄风」+ unsplash 真人头像 + 虚构统计），先置诚实空态。
// 接线路径已就绪：GET /circles/:id/dashboard/trends（趋势）+ /circles/:id/hot-content（热门 TOP5），
// 待本页接入 circleId 后改为真连即可。
const kpis = [
  { label: '总浏览', value: '0', icon: 'eye', color: '#2563EB', bg: '#EFF6FF' },
  { label: '总点赞', value: '0', icon: 'heart', color: '#EF4444', bg: '#FEF2F2' },
  { label: '总评论', value: '0', icon: 'message-circle', color: '#16A34A', bg: '#F0FDF4' },
  { label: '总分享', value: '0', icon: 'share-2', color: '#9333EA', bg: '#FAF5FF' },
]

const chartData: ChartPoint[] = []
const maxVal = computed(() => {
  const vals = chartData.flatMap(d => [d.views, d.likes])
  return vals.length ? Math.max(...vals) : 1
})

const topPosts: TopPost[] = []

function rankCls(idx: number) { return idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : '' }
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #F7F4EE; }
.hdr { background: #F7F4EE; position: sticky; top: 0; z-index: 10; border-bottom: 1rpx solid #ECE7DD; display: flex; align-items: center; gap: 18rpx; height: 88rpx; padding: 0 24rpx; }
.hdr-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.hdr-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.scroll { height: calc(100vh - 88rpx); }
.body { padding: 0 32rpx; }

.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14rpx; margin-top: 32rpx; }
.kpi { background: #ffffff; border: 1rpx solid #ECE7DD; border-radius: 16rpx; padding: 20rpx 8rpx; text-align: center; }
.kpi-icon { width: 52rpx; height: 52rpx; border-radius: 12rpx; margin: 0 auto 12rpx; display: flex; align-items: center; justify-content: center; }
.kpi-val { display: block; font-size: 26rpx; font-weight: 700; color: #2C2C2C; }
.kpi-label { display: block; font-size: 18rpx; color: #999999; margin-top: 4rpx; }

.sec-title { display: block; font-size: 26rpx; font-weight: 600; color: #2C2C2C; margin: 44rpx 0 20rpx; }
.chart-card { background: #ffffff; border: 1rpx solid #ECE7DD; border-radius: 20rpx; padding: 28rpx 20rpx 20rpx; }
.chart { display: flex; align-items: flex-end; justify-content: space-between; height: 280rpx; }
.chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.bars { flex: 1; display: flex; align-items: flex-end; justify-content: center; gap: 6rpx; width: 100%; }
.bar { width: 18rpx; border-radius: 4rpx 4rpx 0 0; }
.bar.views { background: var(--brand); }
.bar.likes { background: #C9A96E; }
.chart-x { font-size: 18rpx; color: #999999; margin-top: 12rpx; }
.legend { display: flex; justify-content: center; gap: 32rpx; margin-top: 16rpx; }
.lg { display: flex; align-items: center; gap: 8rpx; }
.lg-dot { width: 16rpx; height: 16rpx; border-radius: 4rpx; }
.lg-dot.views { background: var(--brand); }
.lg-dot.likes { background: #C9A96E; }
.lg-t { font-size: 20rpx; color: #999999; }

.top-title { display: flex; align-items: center; gap: 10rpx; margin: 44rpx 0 20rpx; }
.top-title-t { font-size: 26rpx; font-weight: 600; color: #2C2C2C; }
.top-list { display: flex; flex-direction: column; gap: 18rpx; }
.post { display: flex; gap: 18rpx; padding: 24rpx; background: #ffffff; border: 1rpx solid #ECE7DD; border-radius: 20rpx; }
.post-rank { font-size: 34rpx; font-weight: 900; width: 40rpx; flex-shrink: 0; color: #999999; }
.post-rank.gold { color: #F59E0B; }
.post-rank.silver { color: #94A3B8; }
.post-rank.bronze { color: #FB923C; }
.post-main { flex: 1; min-width: 0; }
.post-title { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; line-height: 1.5; margin-bottom: 14rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.post-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 18rpx; }
.post-author { display: flex; align-items: center; gap: 8rpx; }
.post-avatar { width: 32rpx; height: 32rpx; border-radius: 999rpx; background: #F0EDE6; }
.post-author-t { font-size: 20rpx; color: #999999; }
.meta-item { display: flex; align-items: center; gap: 4rpx; }
.meta-t { font-size: 20rpx; color: #999999; }
.chart-empty { height: 280rpx; display: flex; align-items: center; justify-content: center; }
.top-empty { display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 80rpx 0; background: #ffffff; border: 1rpx solid #ECE7DD; border-radius: 20rpx; }
.empty-t { font-size: 24rpx; color: #999999; }
</style>
