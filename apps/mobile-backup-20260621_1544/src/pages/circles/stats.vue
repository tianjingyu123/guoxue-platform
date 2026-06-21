<script setup lang="ts">
/**
 * 圈子统计（从原型 app/circles/stats/page.tsx 高保真迁移）
 * KPI 卡片网格 + 成员增长折线图(canvas) + 帖子&浏览柱状图(CSS view 双柱)。
 * 跨端方案：recharts 无法用于 uni；折线用 canvas 适配层绘制，柱状用 view 高度还原。
 */
import { ref, onMounted, nextTick, getCurrentInstance } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import ErrorState from '@/components/common/error-state.vue'
import { goBack } from '@/utils/router'
import { getCanvas } from '@/utils/canvas/adapter'
import { circleManageApi } from '@/lib/circle-detail-data'

const circleId = ref('1')

onLoad((q) => { if (q?.id) circleId.value = q.id })

const loading = ref(true)
const error = ref('')

interface DayData { day: string; members: number; posts: number; views: number }

const weeklyData = ref<DayData[]>([])

interface Kpi { label: string; value: string; trend: number; icon: string; color: string; bg: string }
const kpis = ref<Kpi[]>([])

// 柱状图：以视图最大值归一，双柱(帖子/浏览)
const maxPosts = () => Math.max(...weeklyData.value.map((d) => d.posts))
const maxViews = () => Math.max(...weeklyData.value.map((d) => d.views))
function postH(v: number) { return Math.round((v / maxPosts()) * 100) }
function viewH(v: number) { return Math.round((v / maxViews()) * 100) }

const LINE_W = 320
const LINE_H = 180
const instance = getCurrentInstance()

async function drawLineChart() {
  try {
    const { ctx } = await getCanvas('#stats-line', LINE_W, LINE_H, instance)
    const padL = 44, padR = 12, padT = 16, padB = 28
    const w = LINE_W - padL - padR
    const h = LINE_H - padT - padB
    const vals = weeklyData.value.map((d) => d.members)
    const min = Math.min(...vals), max = Math.max(...vals)
    const range = max - min || 1
    ctx.clearRect(0, 0, LINE_W, LINE_H)
    // 网格 + Y 轴刻度
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.fillStyle = '#999999'
    ctx.font = '10px sans-serif'
    ctx.lineWidth = 1
    const ticks = 4
    for (let i = 0; i <= ticks; i++) {
      const y = padT + (h / ticks) * i
      ctx.beginPath()
      ctx.setLineDash([3, 3])
      ctx.moveTo(padL, y)
      ctx.lineTo(LINE_W - padR, y)
      ctx.stroke()
      const val = Math.round(max - (range / ticks) * i)
      ctx.fillText(String(val), 4, y + 3)
    }
    ctx.setLineDash([])
    // X 轴标签
    weeklyData.value.forEach((d, i) => {
      const x = padL + (w / (weeklyData.value.length - 1)) * i
      ctx.fillText(d.day, x - 10, LINE_H - 8)
    })
    // 折线
    ctx.strokeStyle = '#C41E3A'
    ctx.lineWidth = 2
    ctx.beginPath()
    weeklyData.value.forEach((d, i) => {
      const x = padL + (w / (weeklyData.value.length - 1)) * i
      const y = padT + h - ((d.members - min) / range) * h
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
    // 数据点
    ctx.fillStyle = '#C41E3A'
    weeklyData.value.forEach((d, i) => {
      const x = padL + (w / (weeklyData.value.length - 1)) * i
      const y = padT + h - ((d.members - min) / range) * h
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    })
  } catch (e) {
    console.log('[v0] stats line chart draw failed:', (e as Error).message)
  }
}

onMounted(() => { loadData() })

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res: any = await circleManageApi.getStats(circleId.value || '1')
    weeklyData.value = res.weeklyData
    kpis.value = res.kpis
    await nextTick()
    setTimeout(drawLineChart, 100)
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="st">
    <!-- 顶栏 -->
    <view class="st-hdr">
      <view
        class="st-hdr-btn"
        @tap="goBack"
      >
        <app-icon
          name="arrow-left"
          :size="40"
          color="#1a1a1a"
        />
      </view>
      <text class="st-hdr-title">
        圈子统计
      </text>
      <view class="st-hdr-btn" />
    </view>

    <scroll-view
      scroll-y
      class="st-body"
    >
      <!-- 骨架屏 -->
      <view
        v-if="loading"
        class="st-skeleton"
      >
        <view class="st-sk-kpis">
          <view
            v-for="i in 4"
            :key="i"
            class="st-sk-kpi sk-anim"
          />
        </view>
        <view class="st-sk-chart sk-anim" />
      </view>
      <error-state
        v-else-if="error"
        :message="error"
        @retry="loadData"
      />
      <template v-else>
        <!-- KPI 卡片 -->
        <view class="st-kpis">
          <view
            v-for="k in kpis"
            :key="k.label"
            class="st-kpi"
          >
            <view class="st-kpi-top">
              <view
                class="st-kpi-icon"
                :style="{ background: k.bg }"
              >
                <app-icon
                  :name="k.icon"
                  :size="28"
                  :color="k.color"
                />
              </view>
              <view
                class="st-kpi-trend"
                :class="{ up: k.trend >= 0 }"
              >
                <app-icon
                  :name="k.trend >= 0 ? 'trending-up' : 'trending-down'"
                  :size="22"
                  :color="k.trend >= 0 ? '#16a34a' : '#ef4444'"
                />
                <text
                  class="st-kpi-trend-t"
                  :class="{ up: k.trend >= 0 }"
                >
                  {{ Math.abs(k.trend) }}%
                </text>
              </view>
            </view>
            <text class="st-kpi-value">
              {{ k.value }}
            </text>
            <text class="st-kpi-label">
              {{ k.label }}
            </text>
          </view>
        </view>

        <!-- 成员增长折线 -->
        <view class="st-sec">
          <text class="st-sec-title">
            成员增长（本周）
          </text>
          <view class="st-card">
            <canvas
              id="stats-line"
              canvas-id="stats-line"
              type="2d"
              class="st-canvas"
              :style="{ width: LINE_W + 'px', height: LINE_H + 'px' }"
            />
          </view>
        </view>

        <!-- 帖子 & 浏览柱状 -->
        <view class="st-sec">
          <text class="st-sec-title">
            帖子 &amp; 浏览（本周）
          </text>
          <view class="st-card">
            <view class="st-bars">
              <view
                v-for="d in weeklyData"
                :key="d.day"
                class="st-bar-group"
              >
                <view class="st-bar-pair">
                  <view
                    class="st-bar posts"
                    :style="{ height: postH(d.posts) + '%' }"
                  />
                  <view
                    class="st-bar views"
                    :style="{ height: viewH(d.views) + '%' }"
                  />
                </view>
                <text class="st-bar-label">
                  {{ d.day }}
                </text>
              </view>
            </view>
            <view class="st-legend">
              <view class="st-legend-item">
                <view class="st-legend-dot posts" /><text class="st-legend-t">
                  帖子
                </text>
              </view>
              <view class="st-legend-item">
                <view class="st-legend-dot views" /><text class="st-legend-t">
                  浏览
                </text>
              </view>
            </view>
          </view>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.st { display: flex; flex-direction: column; height: 100vh; background: #faf6f0; }
.st-hdr { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; background: #faf6f0; border-bottom: 2rpx solid rgba(0,0,0,0.08); padding-top: var(--status-bar-height, 0); flex-shrink: 0; }
.st-hdr-btn { width: 72rpx; padding: 8rpx; display: flex; align-items: center; justify-content: center; }
.st-hdr-title { flex: 1; text-align: center; font-size: 32rpx; font-weight: 600; color: #1a1a1a; }
.st-body { flex: 1; overflow: hidden; padding: 24rpx 32rpx 48rpx; box-sizing: border-box; }
/* KPI */
.st-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
.st-kpi { background: #fff; border-radius: 24rpx; padding: 28rpx; border: 2rpx solid rgba(0,0,0,0.05); }
.st-kpi-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16rpx; }
.st-kpi-icon { width: 64rpx; height: 64rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.st-kpi-trend { display: flex; align-items: center; gap: 4rpx; }
.st-kpi-trend-t { font-size: 22rpx; font-weight: 500; color: #ef4444; }
.st-kpi-trend-t.up { color: #16a34a; }
.st-kpi-value { display: block; font-size: 40rpx; font-weight: 700; color: #1a1a1a; }
.st-kpi-label { display: block; font-size: 22rpx; color: #8a8378; margin-top: 6rpx; }
/* sections */
.st-sec { margin-top: 40rpx; }
.st-sec-title { display: block; font-size: 28rpx; font-weight: 600; color: #1a1a1a; margin-bottom: 20rpx; }
.st-card { background: #fff; border-radius: 24rpx; padding: 28rpx; border: 2rpx solid rgba(0,0,0,0.05); }
.st-canvas { display: block; margin: 0 auto; }
/* 柱状图 */
.st-bars { display: flex; align-items: flex-end; justify-content: space-between; height: 320rpx; padding-top: 16rpx; }
.st-bar-group { display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; }
.st-bar-pair { display: flex; align-items: flex-end; gap: 4rpx; flex: 1; height: 100%; }
.st-bar { width: 16rpx; border-radius: 4rpx 4rpx 0 0; }
.st-bar.posts { background: #C41E3A; }
.st-bar.views { background: #C9A96E; }
.st-bar-label { font-size: 20rpx; color: #8a8378; margin-top: 12rpx; }
.st-legend { display: flex; justify-content: center; gap: 32rpx; margin-top: 20rpx; }
.st-legend-item { display: flex; align-items: center; gap: 8rpx; }
.st-legend-dot { width: 20rpx; height: 20rpx; border-radius: 4rpx; }
.st-legend-dot.posts { background: #C41E3A; }
.st-legend-dot.views { background: #C9A96E; }
.st-legend-t { font-size: 22rpx; color: #666; }

/* 骨架屏 */
.st-skeleton { padding: 24rpx; }
.st-sk-kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; margin-bottom: 32rpx; }
.st-sk-kpi { height: 160rpx; border-radius: 20rpx; }
.st-sk-chart { height: 400rpx; border-radius: 20rpx; }
.sk-anim { background: linear-gradient(90deg, #E8E0D0 25%, #F0EDE6 50%, #E8E0D0 75%); background-size: 200% 100%; animation: sk-shimmer 1.5s infinite; }
@keyframes sk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
