<!--
  内容分析（从原型 app/circles/[id]/analytics/contents/page.tsx 高保真迁移）
  KPI四卡 + 本周浏览&点赞趋势柱状图(CSS双柱,跨端替代recharts) + 热门内容TOP5
-->
<template>
  <view class="page">
    <view
      class="hdr"
      :style="{ paddingTop: statusBarH + 'px' }"
    >
      <view
        class="hdr-btn"
        @tap="goBack"
      >
        <app-icon
          name="arrow-left"
          :size="36"
          color="#2C2C2C"
        />
      </view>
      <text class="hdr-title">
        内容分析
      </text>
    </view>

    <scroll-view
      scroll-y
      class="scroll"
    >
      <!-- 加载骨架 -->
      <view
        v-if="loading"
        class="an-skeleton"
      >
        <view class="an-sk-kpis">
          <view
            v-for="i in 4"
            :key="i"
            class="an-sk-kpi sk-anim"
          />
        </view>
        <view class="an-sk-chart sk-anim" />
        <view
          v-for="i in 5"
          :key="i"
          class="an-sk-post sk-anim"
        />
      </view>

      <error-state
        v-else-if="error"
        :message="error"
        @retry="loadData"
      />

      <view
        v-else
        class="body"
      >
        <!-- KPI -->
        <view class="kpis">
          <view
            v-for="k in kpis"
            :key="k.label"
            class="kpi"
          >
            <view
              class="kpi-icon"
              :style="{ background: k.bg }"
            >
              <app-icon
                :name="k.icon"
                :size="24"
                :color="k.color"
              />
            </view>
            <text class="kpi-val">
              {{ k.value }}
            </text>
            <text class="kpi-label">
              {{ k.label }}
            </text>
          </view>
        </view>

        <!-- 趋势图 -->
        <text class="sec-title">
          本周浏览 & 点赞趋势
        </text>
        <view class="chart-card">
          <view class="chart">
            <view
              v-for="d in chartData"
              :key="d.day"
              class="chart-col"
            >
              <view class="bars">
                <view
                  class="bar views"
                  :style="{ height: (d.views / maxVal * 100) + '%' }"
                />
                <view
                  class="bar likes"
                  :style="{ height: (d.likes / maxVal * 100) + '%' }"
                />
              </view>
              <text class="chart-x">
                {{ d.day }}
              </text>
            </view>
          </view>
          <view class="legend">
            <view class="lg">
              <view class="lg-dot views" /><text class="lg-t">
                浏览
              </text>
            </view>
            <view class="lg">
              <view class="lg-dot likes" /><text class="lg-t">
                点赞
              </text>
            </view>
          </view>
        </view>

        <!-- TOP5 -->
        <view class="top-title">
          <app-icon
            name="trending-up"
            :size="28"
            color="#C41E3A"
          /><text class="top-title-t">
            热门内容 TOP 5
          </text>
        </view>
        <view class="top-list">
          <view
            v-for="(post, idx) in topPosts"
            :key="post.id"
            class="post"
          >
            <text
              class="post-rank"
              :class="rankCls(idx)"
            >
              {{ idx + 1 }}
            </text>
            <view class="post-main">
              <text class="post-title">
                {{ post.title }}
              </text>
              <view class="post-meta">
                <view class="post-author">
                  <image
                    class="post-avatar"
                    :src="post.avatar"
                    mode="aspectFill"
                  /><text class="post-author-t">
                    {{ post.author }}
                  </text>
                </view>
                <view class="meta-item">
                  <app-icon
                    name="eye"
                    :size="20"
                    color="#999999"
                  /><text class="meta-t">
                    {{ post.views.toLocaleString() }}
                  </text>
                </view>
                <view class="meta-item">
                  <app-icon
                    name="heart"
                    :size="20"
                    color="#999999"
                  /><text class="meta-t">
                    {{ post.likes }}
                  </text>
                </view>
                <view class="meta-item">
                  <app-icon
                    name="message-circle"
                    :size="20"
                    color="#999999"
                  /><text class="meta-t">
                    {{ post.comments }}
                  </text>
                </view>
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
import { computed, ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import ErrorState from '@/components/common/error-state.vue'
import { goBack } from '@/utils/router'
import { circleManageApi } from '@/lib/circle-detail-data'

const loading = ref(true)
const error = ref('')
const circleId = ref('1')

onMounted(() => { loadData() })
async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res: any = await circleManageApi.getDashboard(circleId.value)
    const s = res.stats
    kpis.value = [
      { label: '总浏览', value: s.totalViews.toLocaleString(), icon: 'eye', color: '#2563EB', bg: '#EFF6FF' },
      { label: '总点赞', value: s.totalLikes.toLocaleString(), icon: 'heart', color: '#EF4444', bg: '#FEF2F2' },
      { label: '总评论', value: s.totalComments.toLocaleString(), icon: 'message-circle', color: '#16A34A', bg: '#F0FDF4' },
      { label: '总分享', value: s.totalShares.toLocaleString(), icon: 'share-2', color: '#9333EA', bg: '#FAF5FF' },
    ]
    topPosts.value = res.topPosts
  } catch (e: any) { error.value = e?.message || '加载失败' }
  finally { loading.value = false }
}

const statusBarH = uni.getSystemInfoSync().statusBarHeight || 20

const kpis = ref([
  { label: '总浏览', value: '44,690', icon: 'eye', color: '#2563EB', bg: '#EFF6FF' },
  { label: '总点赞', value: '2,824', icon: 'heart', color: '#EF4444', bg: '#FEF2F2' },
  { label: '总评论', value: '558', icon: 'message-circle', color: '#16A34A', bg: '#F0FDF4' },
  { label: '总分享', value: '687', icon: 'share-2', color: '#9333EA', bg: '#FAF5FF' },
])

const chartData = [
  { day: '周一', views: 4200, likes: 280 },
  { day: '周二', views: 5100, likes: 340 },
  { day: '周三', views: 4800, likes: 310 },
  { day: '周四', views: 6200, likes: 420 },
  { day: '周五', views: 7800, likes: 530 },
  { day: '周六', views: 9500, likes: 680 },
  { day: '周日', views: 8300, likes: 590 },
]
const maxVal = computed(() => Math.max(...chartData.flatMap(d => [d.views, d.likes])))

const topPosts = ref([
  { id: '1', title: '八字五行详解：从生克制化到格局分析', author: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60', views: 12580, likes: 864, comments: 203, shares: 156 },
  { id: '2', title: '紫微斗数十四主星性格分析全集', author: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=60', views: 9840, likes: 620, comments: 145, shares: 98 },
  { id: '3', title: '2024年甲辰年各生肖运势完整版', author: '李玄机', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60', views: 8720, likes: 512, comments: 89, shares: 234 },
  { id: '4', title: '风水布局实战：客厅财位的正确摆放', author: '王德华', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60', views: 7350, likes: 430, comments: 67, shares: 112 },
  { id: '5', title: '奇门遁甲基础：九宫八卦布局详解', author: '林奇门', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=60', views: 6200, likes: 398, comments: 54, shares: 87 },
])

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
.bar.views { background: #C41E3A; }
.bar.likes { background: #C9A96E; }
.chart-x { font-size: 18rpx; color: #999999; margin-top: 12rpx; }
.legend { display: flex; justify-content: center; gap: 32rpx; margin-top: 16rpx; }
.lg { display: flex; align-items: center; gap: 8rpx; }
.lg-dot { width: 16rpx; height: 16rpx; border-radius: 4rpx; }
.lg-dot.views { background: #C41E3A; }
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

/* 骨架屏 */
.an-skeleton { padding: 0 32rpx; display: flex; flex-direction: column; gap: 32rpx; }
.an-sk-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14rpx; margin-top: 32rpx; }
.an-sk-kpi { height: 120rpx; border-radius: 16rpx; }
.an-sk-chart { height: 360rpx; border-radius: 20rpx; margin-top: 12rpx; }
.an-sk-post { height: 100rpx; border-radius: 20rpx; }
.sk-anim { background: linear-gradient(90deg, #E8E0D0 25%, #F0EDE6 50%, #E8E0D0 75%); background-size: 200% 100%; animation: sk-shimmer 1.5s infinite; }
@keyframes sk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
