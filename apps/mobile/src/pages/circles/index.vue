<script setup lang="ts">
/**
 * 圈子主列表页（从原型 app/circles/page.tsx 557行 1:1 高保真迁移）
 * 自定义顶栏(标题+搜索+日历+创建，创建按钮在右上角) + 主Tab(发现/动态/我的)
 * 发现: 直播预告横幅 + 今日活动横滚 + 分类Tab + 排行榜入口 + 圈子2列网格
 * 动态: 沉浸式帖子信息流(空态引导)
 * 我的: 数据卡片 + 我加入的圈子列表
 */
import { ref, onMounted } from 'vue'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import CircleCard from '@/components/circle/circle-card.vue'
import { navigateTo } from '@/utils/router'
import {
  circleApi, circleCategories, formatMembers,
  type Circle, type UpcomingLive, type TodayActivity, type HotPost, type MyCircleStats, type RankingCircle,
} from '@/lib/circle-data'

type Tab = 'discover' | 'feed' | 'mine'

const category = ref('')
const circles = ref<Circle[]>([])
const myCircles = ref<Circle[]>([])
const ranking = ref<RankingCircle[]>([])
const upcomingLives = ref<UpcomingLive[]>([])
const todayActivities = ref<TodayActivity[]>([])
const hotPosts = ref<HotPost[]>([])
const loading = ref(true)
const error = ref(false)
const activeTab = ref<Tab>('discover')
const myStats = ref<MyCircleStats>({ joinedCount: 0, postCount: 0, likeReceived: 0 })

const mainTabs: { id: Tab; label: string }[] = [
  { id: 'discover', label: '发现' },
  { id: 'feed', label: '动态' },
  { id: 'mine', label: '我的' },
]

/** 圈子网格（随分类变化，单独重载） */
async function loadCircles() {
  loading.value = true
  error.value = false
  try {
    const res = await circleApi.list({ category: category.value })
    circles.value = res.data
  } catch {
    error.value = true
    circles.value = []
  } finally {
    loading.value = false
  }
}

/** 发现/我的页的其余板块（与分类无关，仅首屏加载一次；各自空数据走空态隐藏） */
async function loadExtras() {
  const [myRes, rankRes, liveRes, actRes, postRes, statsRes] = await Promise.allSettled([
    circleApi.my(),
    circleApi.getRanking(),
    circleApi.getUpcomingLives(),
    circleApi.getActivities(),
    circleApi.getHotPosts(),
    circleApi.getMyStats(),
  ])
  myCircles.value = myRes.status === 'fulfilled' ? myRes.value : []
  ranking.value = rankRes.status === 'fulfilled' ? rankRes.value : []
  upcomingLives.value = liveRes.status === 'fulfilled' ? liveRes.value : []
  todayActivities.value = actRes.status === 'fulfilled' ? actRes.value : []
  hotPosts.value = postRes.status === 'fulfilled' ? postRes.value : []
  if (statsRes.status === 'fulfilled') myStats.value = statsRes.value
}

function selectCategory(id: string) {
  if (category.value === id) return
  category.value = id
  loadCircles()
}

async function handleJoin(id: string) {
  // 乐观更新
  const idx = circles.value.findIndex(c => c.id === id)
  if (idx < 0) return
  circles.value[idx] = { ...circles.value[idx], isJoined: true, members: circles.value[idx].members + 1 }
  try {
    await circleApi.join(id)
  } catch {
    circles.value[idx] = { ...circles.value[idx], isJoined: false, members: circles.value[idx].members - 1 }
  }
}

function activityTypeLabel(t: string) {
  return t === 'checkin' ? '打卡' : t === 'homework' ? '作业' : t === 'qa' ? '问答' : '动态'
}
function activityTypeIcon(t: string) {
  return t === 'checkin' ? 'book-open' : t === 'homework' ? 'award' : t === 'qa' ? 'message-square' : 'zap'
}
function activityTypeColor(t: string) {
  return t === 'checkin' ? '#52C41A' : t === 'homework' ? '#C41E3A' : t === 'qa' ? '#1890FF' : '#FF6B35'
}

function go(url: string) { navigateTo(url) }

onMounted(() => { loadCircles(); loadExtras() })
</script>

<template>
  <view class="page">
    <app-network-bar />
    <customer-service-fab />
    <!-- 自定义顶栏 -->
    <view class="topbar">
      <view class="topbar-head">
        <text class="title">圈子</text>
        <view class="actions">
          <view class="icon-btn" @tap="go('/pkg-circle/circles/search')"><app-icon name="search" :size="36" color="#666666" /></view>
          <view class="icon-btn" @tap="go('/pkg-circle/circles/calendar')"><app-icon name="calendar" :size="36" color="#666666" /></view>
          <!-- 创建圈子=重要入口：做成带文字的醒目按钮，不再混在灰色图标里 -->
          <view class="create-btn" @tap="go('/pkg-circle/circles/create')">
            <app-icon name="plus" :size="30" color="#ffffff" />
            <text class="create-btn-txt">创建</text>
          </view>
        </view>
      </view>
      <!-- 主Tab -->
      <view class="main-tabs">
        <view
          v-for="t in mainTabs" :key="t.id"
          class="main-tab" @tap="activeTab = t.id"
        >
          <text class="main-tab-text" :class="{ on: activeTab === t.id }">{{ t.label }}</text>
          <view v-if="activeTab === t.id" class="main-tab-underline" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="body">
      <!-- ════ 发现 Tab ════ -->
      <template v-if="activeTab === 'discover'">
        <!-- 直播预告横幅 -->
        <view v-if="upcomingLives.length" class="section">
          <view class="live-banner">
            <view class="live-badge">
              <app-icon name="radio" :size="20" color="#ffffff" />
              <text class="live-badge-text">直播预告</text>
            </view>
            <view class="live-row">
              <image lazy-load :src="upcomingLives[0].avatar" class="live-avatar" mode="aspectFill" />
              <view class="live-info">
                <text class="live-title">{{ upcomingLives[0].title }}</text>
                <text class="live-sub">{{ upcomingLives[0].host }} · {{ upcomingLives[0].circleName }}</text>
                <view class="live-meta">
                  <view class="live-time"><app-icon name="clock" :size="20" color="#FFD700" /><text class="live-time-text">{{ upcomingLives[0].startTime }}</text></view>
                  <text class="live-viewers">{{ upcomingLives[0].viewers }}人预约</text>
                </view>
              </view>
              <view class="live-btn"><app-icon name="bell" :size="24" color="#ffffff" /><text class="live-btn-text">预约</text></view>
            </view>
          </view>
        </view>

        <!-- 今日活动（后端今日无新动态时整块隐藏） -->
        <view v-if="todayActivities.length" class="section">
          <view class="sec-head">
            <view class="sec-title">
              <app-icon name="zap" :size="32" color="#FF6B35" />
              <text class="sec-title-text">今日活动</text>
            </view>
            <view class="sec-more" @tap="go('/pkg-circle/circles/activities')">
              <text class="sec-more-text">全部</text>
              <app-icon name="chevron-right" :size="28" color="#999999" />
            </view>
          </view>
          <scroll-view scroll-x class="act-scroll">
            <view class="act-row">
              <view
                v-for="act in todayActivities" :key="act.id"
                class="act-card" @tap="go(`/pkg-circle/circles/activity?id=${act.id}&circleId=${act.circleId}`)"
              >
                <view class="act-top">
                  <app-icon :name="activityTypeIcon(act.type)" :size="28" :color="activityTypeColor(act.type)" />
                  <text class="act-tag" :style="{ color: activityTypeColor(act.type), background: activityTypeColor(act.type) + '1a' }">{{ activityTypeLabel(act.type) }}</text>
                </view>
                <text class="act-title">{{ act.title }}</text>
                <view class="act-meta">
                  <text v-if="act.circleName" class="act-part">{{ act.circleName }}</text>
                  <text v-if="act.participants" class="act-reward">{{ act.participants }}人参与</text>
                  <text v-else-if="act.reward" class="act-reward">{{ act.reward }}</text>
                </view>
                <view v-if="act.deadline || act.time" class="act-deadline">
                  <text class="act-deadline-text">{{ act.deadline ? '截止: ' + act.deadline : act.time }}</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 分类 Tab -->
        <view class="cat-section">
          <scroll-view scroll-x class="cat-scroll">
            <view class="cat-row">
              <view
                v-for="cat in circleCategories" :key="cat.id"
                class="cat-chip" :class="{ on: category === cat.id }"
                @tap="selectCategory(cat.id)"
              >
                <text class="cat-text" :class="{ on: category === cat.id }">{{ cat.name }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 排行榜入口 -->
        <view v-if="ranking.length" class="rank-entry" @tap="go('/pkg-circle/circles/ranking')">
          <view class="rank-head">
            <view class="rank-head-left">
              <view class="rank-crown"><app-icon name="crown" :size="28" color="#ffffff" /></view>
              <text class="rank-title">热门圈子排行</text>
            </view>
            <app-icon name="chevron-right" :size="28" color="#999999" />
          </view>
          <scroll-view scroll-x class="rank-scroll">
            <view class="rank-row">
              <view v-for="(c, i) in ranking.slice(0, 5)" :key="c.id" class="rank-pill">
                <view class="rank-no" :class="'rank-no-' + (i + 1)">{{ i + 1 }}</view>
                <text class="rank-name">{{ c.name }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 圈子网格 -->
        <view v-if="loading" class="grid">
          <view v-for="i in 6" :key="i" class="skeleton">
            <view class="sk-cover" />
            <view class="sk-line w3" />
            <view class="sk-line w2" />
          </view>
        </view>
        <app-error v-else-if="error" title="圈子加载失败" desc="网络异常，请稍后重试" @retry="loadCircles" />
        <view v-else-if="circles.length" class="grid">
          <circle-card v-for="c in circles" :key="c.id" :circle="c" @join="handleJoin" />
        </view>
        <view v-else class="empty">
          <view class="empty-icon"><app-icon name="users" :size="56" color="#999999" /></view>
          <text class="empty-text">暂无相关圈子</text>
        </view>
      </template>

      <!-- ════ 动态 Tab（全平台热门动态）════ -->
      <template v-else-if="activeTab === 'feed'">
        <view v-if="hotPosts.length === 0" class="feed-empty">
          <view class="empty-icon big"><app-icon name="message-square" :size="64" color="#999999" /></view>
          <text class="empty-title">暂无圈子动态</text>
          <text class="empty-sub">加入感兴趣的圈子，参与话题讨论吧</text>
          <view class="go-btn" @tap="activeTab = 'discover'"><text class="go-btn-text">去发现圈子</text></view>
        </view>
        <view v-else class="feed">
          <view
            v-for="post in hotPosts" :key="post.id"
            class="post" @tap="go(`/pkg-circle/circles/post?id=${post.id}&circleId=${post.circleId}`)"
          >
            <view class="post-source">
              <view class="post-source-left" @tap.stop="go(`/pkg-circle/circles/detail?id=${post.circleId}`)">
                <text class="post-circle">#{{ post.circleName }}</text>
                <text v-if="post.isPinned" class="post-pin">置顶</text>
              </view>
              <text class="post-time">{{ post.time }}</text>
            </view>
            <view class="post-author">
              <image lazy-load :src="post.author.avatar" class="post-avatar" mode="aspectFill" />
              <view class="post-author-info">
                <text class="post-author-name">{{ post.author.name }}</text>
                <text v-if="post.author.title" class="post-author-title">{{ post.author.title }}</text>
              </view>
            </view>
            <view class="post-content"><text class="post-text">{{ post.content }}</text></view>
            <view v-if="post.images.length" class="post-imgs" :class="post.images.length === 1 ? 'one' : 'multi'">
              <image lazy-load
                v-for="(img, idx) in post.images" :key="idx" :src="img"
                class="post-img" :class="post.images.length === 1 ? 'single' : 'grid-img'" mode="aspectFill"
              />
            </view>
            <view class="post-actions">
              <view class="post-act"><app-icon name="message-square" :size="28" color="#666666" /><text class="post-act-num">{{ post.comments }}</text></view>
              <view class="post-act"><app-icon name="trending-up" :size="28" color="#666666" /><text class="post-act-num">{{ post.likes }}</text></view>
            </view>
          </view>
        </view>
      </template>

      <!-- ════ 我的 Tab ════ -->
      <template v-else>
        <view class="section">
          <!-- 数据卡片 -->
          <view class="mine-stats">
            <view class="mine-stats-head">
              <text class="mine-stats-title">我的圈子数据</text>
              <view class="mine-stats-more" @tap="go('/pkg-circle/circles/stats')">
                <text class="mine-stats-more-text">详情</text>
                <app-icon name="chevron-right" :size="28" color="#ffffff" />
              </view>
            </view>
            <view class="mine-stats-grid">
              <view class="mine-stat"><text class="mine-stat-num">{{ myStats.joinedCount }}</text><text class="mine-stat-label">已加入</text></view>
              <view class="mine-stat"><text class="mine-stat-num">{{ myStats.postCount }}</text><text class="mine-stat-label">发帖数</text></view>
              <view class="mine-stat"><text class="mine-stat-num">{{ formatMembers(myStats.likeReceived) }}</text><text class="mine-stat-label">获赞数</text></view>
            </view>
          </view>

          <!-- 我加入的圈子 -->
          <view class="mine-list-head" @tap="go('/pkg-circle/circles/mine')">
            <text class="mine-list-title">我加入的圈子</text>
            <view class="mine-list-more">
              <text class="mine-list-count">{{ myCircles.length }}个</text>
              <app-icon name="chevron-right" :size="28" color="#999999" />
            </view>
          </view>
          <view v-if="myCircles.length === 0" class="mine-empty">
            <view class="empty-icon"><app-icon name="users" :size="48" color="#999999" /></view>
            <text class="empty-text">还没有加入任何圈子</text>
            <view class="go-btn" @tap="activeTab = 'discover'"><text class="go-btn-text">去发现圈子</text></view>
          </view>
          <view v-else class="mine-list">
            <view
              v-for="c in myCircles" :key="c.id"
              class="mine-item" @tap="go(`/pkg-circle/circles/detail?id=${c.id}`)"
            >
              <smart-cover :src="c.cover" :title="c.name" type="circle" class="mine-cover" />
              <view class="mine-item-info">
                <text class="mine-item-name">{{ c.name }}</text>
                <text class="mine-item-meta">{{ formatMembers(c.members) }}成员 · {{ c.posts }}帖子</text>
                <view v-if="c.todayActive && c.todayActive > 0" class="mine-item-active">
                  <app-icon name="flame" :size="22" color="#FF6B35" />
                  <text class="mine-item-active-text">今日{{ c.todayActive }}条新动态</text>
                </view>
              </view>
              <app-icon name="chevron-right" :size="32" color="#cccccc" />
            </view>
          </view>
        </view>
      </template>

      <view class="bottom-spacer" />
    </scroll-view>

    <bottom-nav active="circle" />
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper, #faf8f5); display: flex; flex-direction: column; }

/* 顶栏 */
.topbar {
  position: sticky; top: 0; z-index: 40;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10rpx);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  padding-top: var(--status-bar-height, 0);
}
.topbar-head { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 32rpx; }
.title { font-size: 40rpx; font-weight: 700; color: var(--text-ink, #2c2c2c); }
.actions { display: flex; align-items: center; gap: 16rpx; }
.icon-btn {
  width: 72rpx; height: 72rpx; border-radius: 999rpx;
  background: var(--line-soft, #f5f0e8);
  display: flex; align-items: center; justify-content: center;
}
/* 创建圈子=醒目主按钮（brand 底 + 文字），突出重要入口 */
.create-btn {
  display: flex; align-items: center; gap: 6rpx;
  height: 72rpx; padding: 0 26rpx; border-radius: 999rpx;
  background: var(--brand);
  box-shadow: 0 4rpx 12rpx rgba(196, 30, 58, 0.28);
}
.create-btn-txt { font-size: 26rpx; color: #fff; font-weight: 600; }
.main-tabs { display: flex; align-items: center; border-bottom: 2rpx solid var(--line-nav, #e8e3db); }
.main-tab { flex: 1; padding: 24rpx 0; display: flex; flex-direction: column; align-items: center; position: relative; }
.main-tab-text { font-size: 28rpx; font-weight: 500; color: var(--text-faint, #999); }
.main-tab-text.on { color: var(--brand, var(--brand)); }
.main-tab-underline { position: absolute; bottom: 0; width: 48rpx; height: 4rpx; background: var(--brand, var(--brand)); border-radius: 999rpx; }

.body { flex: 1; }
.section { padding: 32rpx 32rpx 0; }
.bottom-spacer { height: 180rpx; }

/* 直播横幅 */
.live-banner { background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 32rpx; padding: 32rpx; position: relative; overflow: hidden; }
.live-badge { position: absolute; top: 16rpx; right: 16rpx; display: flex; align-items: center; gap: 6rpx; padding: 4rpx 16rpx; background: #ef4444; border-radius: 999rpx; }
.live-badge-text { font-size: 18rpx; color: #fff; font-weight: 500; }
.live-row { display: flex; align-items: center; gap: 24rpx; }
.live-avatar { width: 96rpx; height: 96rpx; border-radius: 999rpx; border: 4rpx solid rgba(255, 255, 255, 0.2); flex-shrink: 0; }
.live-info { flex: 1; min-width: 0; }
.live-title { display: block; color: #fff; font-weight: 500; font-size: 28rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.live-sub { display: block; color: rgba(255, 255, 255, 0.6); font-size: 24rpx; margin-top: 4rpx; }
.live-meta { display: flex; align-items: center; gap: 24rpx; margin-top: 12rpx; }
.live-time { display: flex; align-items: center; gap: 6rpx; }
.live-time-text { color: #FFD700; font-size: 24rpx; }
.live-viewers { color: rgba(255, 255, 255, 0.5); font-size: 22rpx; }
.live-btn { display: flex; align-items: center; gap: 6rpx; padding: 16rpx 28rpx; background: var(--brand, var(--brand)); border-radius: 999rpx; flex-shrink: 0; }
.live-btn-text { color: #fff; font-size: 24rpx; font-weight: 500; }

/* 区块标题 */
.sec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.sec-title { display: flex; align-items: center; gap: 12rpx; }
.sec-title-text { font-size: 30rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
.sec-more { display: flex; align-items: center; }
.sec-more-text { font-size: 24rpx; color: var(--text-faint, #999); }

/* 今日活动横滚 */
.act-scroll { width: 100%; white-space: nowrap; }
.act-row { display: inline-flex; gap: 24rpx; padding-bottom: 8rpx; }
.act-card { width: 400rpx; background: var(--card, #fff); border-radius: 24rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04); border: 2rpx solid var(--line-soft, #f5f0e8); white-space: normal; }
.act-top { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.act-tag { font-size: 18rpx; padding: 4rpx 12rpx; border-radius: 8rpx; }
.act-title { display: block; font-size: 26rpx; font-weight: 500; color: var(--text-ink, #2c2c2c); line-height: 1.5; min-height: 78rpx; }
.act-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 12rpx; }
.act-part { font-size: 22rpx; color: var(--text-faint, #999); }
.act-reward { font-size: 22rpx; color: #FF6B35; }
.act-deadline { margin-top: 16rpx; padding-top: 16rpx; border-top: 2rpx solid var(--line-soft, #f5f0e8); }
.act-deadline-text { font-size: 20rpx; color: var(--text-faint, #999); }

/* 分类 */
.cat-section { padding: 32rpx 32rpx 16rpx; }
.cat-scroll { width: 100%; white-space: nowrap; }
.cat-row { display: inline-flex; gap: 16rpx; }
.cat-chip { flex-shrink: 0; padding: 12rpx 28rpx; border-radius: 999rpx; background: var(--card, #fff); border: 2rpx solid var(--line-nav, #e8e3db); }
.cat-chip.on { background: var(--brand, var(--brand)); border-color: var(--brand, var(--brand)); }
.cat-text { font-size: 26rpx; font-weight: 500; color: var(--text-soft, #666); white-space: nowrap; }
.cat-text.on { color: #fff; }

/* 排行榜入口 */
.rank-entry { margin: 0 32rpx 32rpx; background: linear-gradient(90deg, #FFF9E6, #FFF5F5); border-radius: 24rpx; padding: 24rpx; border: 2rpx solid #F5E6D3; }
.rank-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.rank-head-left { display: flex; align-items: center; gap: 12rpx; }
.rank-crown { width: 48rpx; height: 48rpx; border-radius: 999rpx; background: linear-gradient(135deg, #facc15, #f97316); display: flex; align-items: center; justify-content: center; }
.rank-title { font-size: 28rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
.rank-scroll { width: 100%; white-space: nowrap; }
.rank-row { display: inline-flex; gap: 16rpx; }
.rank-pill { display: inline-flex; align-items: center; gap: 12rpx; background: var(--card, #fff); border-radius: 999rpx; padding: 6rpx 20rpx 6rpx 6rpx; }
.rank-no { width: 36rpx; height: 36rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; font-size: 18rpx; font-weight: 700; color: #fff; }
.rank-no-1 { background: linear-gradient(135deg, #facc15, #f97316); }
.rank-no-2 { background: linear-gradient(135deg, #d1d5db, #9ca3af); }
.rank-no-3 { background: linear-gradient(135deg, #fdba74, #fb923c); }
.rank-no-4, .rank-no-5 { background: #999; }
.rank-name { font-size: 22rpx; color: var(--text-ink, #2c2c2c); white-space: nowrap; }

/* 圈子网格 */
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; padding: 16rpx 32rpx 0; }
.skeleton { background: var(--card, #fff); border-radius: 24rpx; padding: 24rpx; }
.sk-cover { aspect-ratio: 4 / 3; background: var(--line-soft, #f2efea); border-radius: 16rpx; margin-bottom: 24rpx; }
.sk-line { height: 28rpx; background: var(--line-soft, #f2efea); border-radius: 8rpx; margin-bottom: 16rpx; }
.sk-line.w3 { width: 75%; }
.sk-line.w2 { width: 50%; }

/* 空态 */
.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { width: 128rpx; height: 128rpx; border-radius: 999rpx; background: var(--line-soft, #f5f0e8); display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.empty-icon.big { width: 128rpx; height: 128rpx; }
.empty-text { font-size: 28rpx; color: var(--text-faint, #999); }

/* 动态信息流 */
.feed { padding: 32rpx; display: flex; flex-direction: column; gap: 32rpx; }
.feed-empty { display: flex; flex-direction: column; align-items: center; padding: 140rpx 0; }
.empty-title { font-size: 28rpx; color: var(--text-faint, #999); margin-bottom: 12rpx; }
.empty-sub { font-size: 24rpx; color: #bbb; margin-bottom: 32rpx; }
.go-btn { padding: 16rpx 32rpx; background: var(--brand, var(--brand)); border-radius: 999rpx; margin-top: 8rpx; }
.go-btn-text { font-size: 26rpx; color: #fff; }
.post { background: var(--card, #fff); border-radius: 32rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04); }
.post-source { padding: 24rpx 32rpx 16rpx; display: flex; align-items: center; justify-content: space-between; border-bottom: 2rpx solid var(--line-soft, #f5f0e8); }
.post-source-left { display: flex; align-items: center; gap: 12rpx; }
.post-circle { font-size: 24rpx; color: var(--brand, var(--brand)); font-weight: 500; }
.post-pin { font-size: 18rpx; padding: 4rpx 12rpx; background: #FFF0F0; color: var(--brand, var(--brand)); border-radius: 6rpx; }
.post-time { font-size: 22rpx; color: #bbb; }
.post-author { padding: 24rpx 32rpx 0; display: flex; align-items: center; gap: 16rpx; }
.post-avatar { width: 80rpx; height: 80rpx; border-radius: 999rpx; }
.post-author-info { display: flex; align-items: center; gap: 12rpx; }
.post-author-name { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2c2c2c); }
.post-author-title { font-size: 18rpx; padding: 4rpx 12rpx; background: rgba(201, 169, 110, 0.1); color: var(--gold, #c9a96e); border-radius: 6rpx; }
.post-content { padding: 24rpx 32rpx; }
.post-text { font-size: 28rpx; color: var(--text-ink, #2c2c2c); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.post-imgs { padding: 0 32rpx 24rpx; display: grid; gap: 16rpx; }
.post-imgs.one { grid-template-columns: 1fr; }
.post-imgs.multi { grid-template-columns: 1fr 1fr; }
.post-img { width: 100%; border-radius: 16rpx; }
.post-img.single { height: 384rpx; }
.post-img.grid-img { aspect-ratio: 1 / 1; }
.post-actions { padding: 24rpx 32rpx; border-top: 2rpx solid var(--line-soft, #f5f0e8); display: flex; align-items: center; gap: 48rpx; }
.post-act { display: flex; align-items: center; gap: 12rpx; }
.post-act-num { font-size: 24rpx; color: var(--text-soft, #666); }

/* 我的 Tab */
.mine-stats { background: linear-gradient(135deg, var(--brand), #a01530); border-radius: 32rpx; padding: 32rpx; margin-bottom: 32rpx; }
.mine-stats-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.mine-stats-title { font-size: 28rpx; font-weight: 500; color: #fff; }
.mine-stats-more { display: flex; align-items: center; }
.mine-stats-more-text { font-size: 22rpx; color: rgba(255, 255, 255, 0.7); }
.mine-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.mine-stat { display: flex; flex-direction: column; align-items: center; }
.mine-stat-num { font-size: 40rpx; font-weight: 700; color: #fff; }
.mine-stat-label { font-size: 22rpx; color: rgba(255, 255, 255, 0.7); margin-top: 4rpx; }
.mine-list-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.mine-list-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
  .mine-list-count { font-size: 24rpx; color: var(--text-faint, #999); }
  .mine-list-more { display: flex; align-items: center; gap: 4rpx; }
.mine-empty { display: flex; flex-direction: column; align-items: center; padding: 80rpx 0; background: var(--card, #fff); border-radius: 32rpx; }
.mine-list { display: flex; flex-direction: column; gap: 24rpx; }
.mine-item { background: var(--card, #fff); border-radius: 24rpx; padding: 24rpx; display: flex; align-items: center; gap: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04); }
.mine-cover { width: 112rpx; height: 112rpx; border-radius: 24rpx; flex-shrink: 0; }
.mine-item-info { flex: 1; min-width: 0; }
.mine-item-name { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2c2c2c); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mine-item-meta { display: block; font-size: 24rpx; color: var(--text-faint, #999); margin-top: 4rpx; }
.mine-item-active { display: flex; align-items: center; gap: 6rpx; margin-top: 8rpx; }
.mine-item-active-text { font-size: 22rpx; color: #FF6B35; }

/* FAB */
</style>
