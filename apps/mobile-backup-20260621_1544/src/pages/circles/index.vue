<script setup lang="ts">
/**
 * 圈子主列表页（从原型 app/circles/page.tsx 557行 1:1 高保真迁移）
 * 自定义顶栏(标题+搜索+日历+创建) + 主Tab(发现/动态/我的)
 * 发现: 直播预告横幅 + 今日活动横滚 + 分类Tab + 排行榜入口 + 圈子2列网格
 * 动态: 沉浸式帖子信息流(空态引导)
 * 我的: 数据卡片 + 我加入的圈子列表
 */
import { ref, computed, onMounted } from 'vue'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppError from '@/components/common/app-error.vue'
import CircleCard from '@/components/circle/circle-card.vue'
import { navigateTo, toastComingSoon } from '@/utils/router'
import {
  circleApi, circleCategories, formatMembers,
  fetchUpcomingLives, fetchTodayActivities, fetchHotPosts,
  type Circle, type UpcomingLive, type TodayActivity, type HotPost,
} from '@/lib/circle-data'

type Tab = 'discover' | 'feed' | 'mine'

const category = ref('')
const circles = ref<Circle[]>([])
const myCircles = ref<Circle[]>([])
const ranking = ref<Circle[]>([])
const lives = ref<UpcomingLive[]>([])
const activities = ref<TodayActivity[]>([])
const hotPostsData = ref<HotPost[]>([])
const loading = ref(true)
const error = ref('')
const activeTab = ref<Tab>('discover')
const myCircleTab = ref<'joined' | 'created'>('joined')
const hotExpanded = ref(false)

const filteredMyCircles = computed(() =>
  myCircleTab.value === 'joined' ? myCircles.value : myCircles.value.filter(c => c.isOwner),
)
const displayedRanking = computed(() => hotExpanded.value ? ranking.value : ranking.value.slice(0, 5))

const mainTabs: { id: Tab; label: string }[] = [
  { id: 'discover', label: '发现' },
  { id: 'feed', label: '动态' },
  { id: 'mine', label: '我的' },
]

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [listRes, myRes, rankRes, liveRes, actRes, postRes] = await Promise.allSettled([
      circleApi.list({ category: category.value }),
      circleApi.my(),
      circleApi.getRanking(),
      fetchUpcomingLives(),
      fetchTodayActivities(),
      fetchHotPosts(),
    ])
    circles.value = listRes.status === 'fulfilled' ? listRes.value.data : []
    myCircles.value = myRes.status === 'fulfilled' ? myRes.value : []
    ranking.value = rankRes.status === 'fulfilled' ? rankRes.value : []
    lives.value = liveRes.status === 'fulfilled' ? liveRes.value : []
    activities.value = actRes.status === 'fulfilled' ? actRes.value : []
    hotPostsData.value = postRes.status === 'fulfilled' ? postRes.value : []
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function selectCategory(id: string) {
  if (category.value === id) return
  category.value = id
  loadData()
}

const joiningIds = ref<Set<string>>(new Set())

async function handleJoin(id: string) {
  if (joiningIds.value.has(id)) return
  const idx = circles.value.findIndex(c => c.id === id)
  if (idx < 0) return
  const c = circles.value[idx]
  if (c.isPaid || c.type === 'PAID' || c.type === 'YEARLY') {
    navigateTo(`/pages/circles/detail?id=${id}`)
    return
  }
  joiningIds.value = new Set([...joiningIds.value, id])
  circles.value[idx] = { ...c, isJoined: true, members: c.members + 1 }
  try {
    await circleApi.join(id)
  } catch {
    circles.value[idx] = { ...c, isJoined: false, members: c.members }
  } finally {
    const next = new Set(joiningIds.value)
    next.delete(id)
    joiningIds.value = next
  }
}

function activityTypeLabel(t: string) {
  return t === 'checkin' ? '打卡' : t === 'homework' ? '作业' : '问答'
}
function activityTypeIcon(t: string) {
  return t === 'checkin' ? 'book-open' : t === 'homework' ? 'award' : 'message-square'
}
function activityTypeColor(t: string) {
  return t === 'checkin' ? '#52C41A' : t === 'homework' ? '#C41E3A' : '#1890FF'
}

const totalStats = computed(() => ({ joined: myCircles.value.length }))

function go(url: string) { navigateTo(url) }

onMounted(loadData)
</script>

<template>
  <view class="page">
    <!-- 自定义顶栏 -->
    <view class="topbar">
      <view class="topbar-head">
        <text class="title">
          圈子
        </text>
        <view class="actions">
          <view
            class="icon-btn"
            @tap="go('/pages/circles/search')"
          >
            <app-icon
              name="search"
              :size="36"
              color="#666666"
            />
          </view>
          <view
            class="ai-search-btn"
            @tap="navigateTo('/pages/agent/chat')"
          >
            <app-icon
              name="zap"
              :size="32"
              color="#ffffff"
            />
            <text class="ai-search-text">
              AI搜
            </text>
          </view>
          <view
            class="icon-btn"
            @tap="go('/pages/circles/calendar')"
          >
            <app-icon
              name="calendar"
              :size="36"
              color="#666666"
            />
          </view>
        </view>
      </view>
      <!-- 主Tab -->
      <view class="main-tabs">
        <view
          v-for="t in mainTabs"
          :key="t.id"
          class="main-tab"
          @tap="activeTab = t.id"
        >
          <text
            class="main-tab-text"
            :class="{ on: activeTab === t.id }"
          >
            {{ t.label }}
          </text>
          <view
            v-if="activeTab === t.id"
            class="main-tab-underline"
          />
        </view>
      </view>
    </view>

    <app-error
      v-if="error"
      :desc="error"
      @retry="loadData"
    />
    <scroll-view
      v-else
      scroll-y
      class="body"
    >
      <!-- ════ 发现 Tab ════ -->
      <template v-if="activeTab === 'discover'">
        <!-- 直播预告横幅 -->
        <view
          v-if="lives.length"
          class="section"
        >
          <view class="live-banner">
            <view class="live-badge">
              <app-icon
                name="radio"
                :size="20"
                color="#ffffff"
              />
              <text class="live-badge-text">
                直播预告
              </text>
            </view>
            <view class="live-row">
              <image
                :src="lives[0].avatar"
                class="live-avatar"
                mode="aspectFill"
              />
              <view class="live-info">
                <text class="live-title">
                  {{ lives[0].title }}
                </text>
                <text class="live-sub">
                  {{ lives[0].host }} · {{ lives[0].circleName }}
                </text>
                <view class="live-meta">
                  <view class="live-time">
                    <app-icon
                      name="clock"
                      :size="20"
                      color="#FFD700"
                    /><text class="live-time-text">
                      {{ lives[0].startTime }}
                    </text>
                  </view>
                  <text class="live-viewers">
                    {{ lives[0].viewers }}人预约
                  </text>
                </view>
              </view>
              <view class="live-btn">
                <app-icon
                  name="bell"
                  :size="24"
                  color="#ffffff"
                /><text class="live-btn-text">
                  预约
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- 我的圈子（发现页顶部） -->
        <view
          v-if="myCircles.length"
          class="section"
        >
          <view class="sec-head">
            <view class="mycircle-tabs">
              <view
                class="mycircle-tab"
                :class="{ on: myCircleTab === 'joined' }"
                @tap="myCircleTab = 'joined'"
              >
                <text
                  class="mycircle-tab-text"
                  :class="{ on: myCircleTab === 'joined' }"
                >
                  我加入的
                </text>
              </view>
              <view
                class="mycircle-tab"
                :class="{ on: myCircleTab === 'created' }"
                @tap="myCircleTab = 'created'"
              >
                <text
                  class="mycircle-tab-text"
                  :class="{ on: myCircleTab === 'created' }"
                >
                  我创建的
                </text>
              </view>
            </view>
            <view
              class="sec-more"
              @tap="go('/pages/circles/mine')"
            >
              <text class="sec-more-text">
                全部
              </text>
              <app-icon
                name="chevron-right"
                :size="28"
                color="#999999"
              />
            </view>
          </view>
          <scroll-view
            scroll-x
            class="mycircle-scroll"
          >
            <view class="mycircle-row">
              <view
                v-for="c in filteredMyCircles"
                :key="c.id"
                class="mycircle-card"
                @tap="go(`/pages/circles/detail?id=${c.id}`)"
              >
                <view class="mycircle-cover-wrap">
                  <image
                    :src="c.cover"
                    class="mycircle-cover"
                    mode="aspectFill"
                  />
                  <view
                    v-if="c.unread && c.unread > 0"
                    class="mycircle-badge"
                  >
                    <text class="mycircle-badge-text">
                      {{ c.unread > 99 ? '99+' : c.unread }}
                    </text>
                  </view>
                </view>
                <view class="mycircle-info">
                  <text class="mycircle-name">
                    {{ c.name }}
                  </text>
                  <text class="mycircle-meta">
                    {{ formatMembers(c.members) }}成员
                  </text>
                  <text
                    v-if="c.lastPost"
                    class="mycircle-last"
                  >
                    {{ c.lastPost }}
                  </text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 创建圈子推广卡片 -->
        <view class="section">
          <view
            class="create-promo"
            @tap="go('/pages/circles/create')"
          >
            <view class="create-promo-icon">
              <app-icon
                name="plus"
                :size="40"
                color="#ffffff"
              />
            </view>
            <view class="create-promo-body">
              <text class="create-promo-title">
                创建你的圈子
              </text>
              <text class="create-promo-sub">
                打造专属国学交流社区，聚集志同道合的朋友
              </text>
            </view>
            <app-icon
              name="chevron-right"
              :size="32"
              color="#c41e3a"
            />
          </view>
        </view>

        <!-- 今日活动 -->
        <view class="section">
          <view class="sec-head">
            <view class="sec-title">
              <app-icon
                name="zap"
                :size="32"
                color="#FF6B35"
              />
              <text class="sec-title-text">
                今日活动
              </text>
            </view>
            <view
              class="sec-more"
              @tap="go('/pages/circles/activities')"
            >
              <text class="sec-more-text">
                全部
              </text>
              <app-icon
                name="chevron-right"
                :size="28"
                color="#999999"
              />
            </view>
          </view>
          <scroll-view
            scroll-x
            class="act-scroll"
          >
            <view class="act-row">
              <view
                v-for="act in activities"
                :key="act.id"
                class="act-card"
                @tap="navigateTo(`/pages/circles/activities?activityId=${act.id}`)"
              >
                <view class="act-top">
                  <app-icon
                    :name="activityTypeIcon(act.type)"
                    :size="28"
                    :color="activityTypeColor(act.type)"
                  />
                  <text
                    class="act-tag"
                    :style="{ color: activityTypeColor(act.type), background: activityTypeColor(act.type) + '1a' }"
                  >
                    {{ activityTypeLabel(act.type) }}
                  </text>
                </view>
                <text class="act-title">
                  {{ act.title }}
                </text>
                <view class="act-meta">
                  <text class="act-part">
                    {{ act.participants }}人参与
                  </text>
                  <text class="act-reward">
                    {{ act.reward }}
                  </text>
                </view>
                <view class="act-deadline">
                  <text class="act-deadline-text">
                    截止: {{ act.deadline }}
                  </text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 分类 Tab -->
        <view class="cat-section">
          <scroll-view
            scroll-x
            class="cat-scroll"
          >
            <view class="cat-row">
              <view
                v-for="cat in circleCategories"
                :key="cat.id"
                class="cat-chip"
                :class="{ on: category === cat.id }"
                @tap="selectCategory(cat.id)"
              >
                <text
                  class="cat-text"
                  :class="{ on: category === cat.id }"
                >
                  {{ cat.name }}
                </text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 热门圈子排行 -->
        <view
          v-if="ranking.length"
          class="section"
        >
          <view class="sec-head">
            <view class="sec-title">
              <app-icon
                name="flame"
                :size="32"
                color="#c41e3a"
              />
              <text class="sec-title-text">
                热门圈子
              </text>
            </view>
            <text class="hot-badge">
              精选优质社群
            </text>
          </view>
          <view class="hot-grid">
            <view
              v-for="(c, i) in displayedRanking"
              :key="c.id"
              class="hot-card"
              @tap="go(`/pages/circles/detail?id=${c.id}`)"
            >
              <image
                :src="c.cover"
                class="hot-cover"
                mode="aspectFill"
              />
              <view
                v-if="i < 3"
                class="hot-rank-badge"
                :class="'hot-rank-' + (i + 1)"
              >
                {{ i + 1 }}
              </view>
              <view class="hot-body">
                <view class="hot-head-row">
                  <text class="hot-name">
                    {{ c.name }}
                  </text>
                  <view
                    v-if="c.tags && c.tags.length"
                    class="hot-tags"
                  >
                    <text
                      v-for="t in c.tags"
                      :key="t"
                      class="hot-tag"
                    >
                      {{ t }}
                    </text>
                  </view>
                </view>
                <text
                  v-if="c.description"
                  class="hot-desc"
                >
                  {{ c.description }}
                </text>
                <view class="hot-footer">
                  <text class="hot-members">
                    {{ formatMembers(c.members) }}成员 · {{ c.posts || 0 }}帖
                  </text>
                  <text
                    v-if="c.price"
                    class="hot-price"
                  >
                    ¥{{ c.price }}
                  </text>
                  <text
                    v-else
                    class="hot-price free"
                  >
                    免费
                  </text>
                </view>
              </view>
            </view>
          </view>
          <view
            v-if="ranking.length > 5"
            class="expand-btn"
            @tap="hotExpanded = !hotExpanded"
          >
            <text class="expand-btn-text">
              {{ hotExpanded ? '收起' : '查看更多热门圈子 (' + (ranking.length - 5) + ')' }}
            </text>
            <app-icon
              :name="hotExpanded ? 'chevron-up' : 'chevron-down'"
              :size="24"
              color="#c41e3a"
            />
          </view>
          <view
            class="rank-footer-link"
            @tap="go('/pages/circles/ranking')"
          >
            <text class="rank-footer-text">
              查看完整排行
            </text>
            <app-icon
              name="chevron-right"
              :size="24"
              color="#999999"
            />
          </view>
        </view>

        <!-- 圈子网格 -->
        <view
          v-if="loading"
          class="grid"
        >
          <view
            v-for="i in 6"
            :key="i"
            class="skeleton"
          >
            <view class="sk-cover" />
            <view class="sk-line w3" />
            <view class="sk-line w2" />
          </view>
        </view>
        <view
          v-else-if="circles.length"
          class="grid"
        >
          <circle-card
            v-for="c in circles"
            :key="c.id"
            :circle="c"
            @join="handleJoin"
          />
        </view>
        <view
          v-else
          class="empty"
        >
          <view class="empty-icon">
            <app-icon
              name="users"
              :size="56"
              color="#999999"
            />
          </view>
          <text class="empty-text">
            暂无相关圈子
          </text>
        </view>
      </template>

      <!-- ════ 动态 Tab ════ -->
      <template v-else-if="activeTab === 'feed'">
        <view
          v-if="myCircles.length === 0"
          class="feed-empty"
        >
          <view class="empty-icon big">
            <app-icon
              name="users"
              :size="64"
              color="#999999"
            />
          </view>
          <text class="empty-title">
            还没有加入任何圈子
          </text>
          <text class="empty-sub">
            加入圈子后，这里会显示最新动态
          </text>
          <view
            class="go-btn"
            @tap="activeTab = 'discover'"
          >
            <text class="go-btn-text">
              去发现圈子
            </text>
          </view>
        </view>
        <view
          v-else
          class="feed"
        >
          <view
            v-for="post in hotPostsData"
            :key="post.id"
            class="post"
            @tap="go(`/pages/circles/post?id=${post.id}&circleId=${post.circleId}`)"
          >
            <view class="post-source">
              <view
                class="post-source-left"
                @tap.stop="go(`/pages/circles/detail?id=${post.circleId}`)"
              >
                <text class="post-circle">
                  #{{ post.circleName }}
                </text>
                <text
                  v-if="post.isPinned"
                  class="post-pin"
                >
                  置顶
                </text>
              </view>
              <text class="post-time">
                {{ post.time }}
              </text>
            </view>
            <view class="post-author">
              <image
                :src="post.author.avatar"
                class="post-avatar"
                mode="aspectFill"
              />
              <view class="post-author-info">
                <text class="post-author-name">
                  {{ post.author.name }}
                </text>
                <text
                  v-if="post.author.title"
                  class="post-author-title"
                >
                  {{ post.author.title }}
                </text>
              </view>
            </view>
            <view class="post-content">
              <text class="post-text">
                {{ post.content }}
              </text>
            </view>
            <view
              v-if="post.images.length"
              class="post-imgs"
              :class="post.images.length === 1 ? 'one' : 'multi'"
            >
              <image
                v-for="(img, idx) in post.images"
                :key="idx"
                :src="img"
                class="post-img"
                :class="post.images.length === 1 ? 'single' : 'grid-img'"
                mode="aspectFill"
              />
            </view>
            <view class="post-actions">
              <view class="post-act">
                <app-icon
                  name="message-square"
                  :size="28"
                  color="#666666"
                /><text class="post-act-num">
                  {{ post.comments }}
                </text>
              </view>
              <view class="post-act">
                <app-icon
                  name="trending-up"
                  :size="28"
                  color="#666666"
                /><text class="post-act-num">
                  {{ post.likes }}
                </text>
              </view>
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
              <text class="mine-stats-title">
                我的圈子数据
              </text>
              <view
                class="mine-stats-more"
                @tap="go('/pages/circles/stats')"
              >
                <text class="mine-stats-more-text">
                  详情
                </text>
                <app-icon
                  name="chevron-right"
                  :size="28"
                  color="#ffffff"
                />
              </view>
            </view>
            <view class="mine-stats-grid">
              <view class="mine-stat">
                <text class="mine-stat-num">
                  {{ totalStats.joined }}
                </text><text class="mine-stat-label">
                  已加入
                </text>
              </view>
              <view class="mine-stat">
                <text class="mine-stat-num">
                  156
                </text><text class="mine-stat-label">
                  发帖数
                </text>
              </view>
              <view class="mine-stat">
                <text class="mine-stat-num">
                  2.8k
                </text><text class="mine-stat-label">
                  获赞数
                </text>
              </view>
              <view class="mine-stat">
                <text class="mine-stat-num">
                  Lv.5
                </text><text class="mine-stat-label">
                  等级
                </text>
              </view>
            </view>
          </view>

          <!-- 我加入的圈子 -->
          <view
            class="mine-list-head"
            @tap="go('/pages/circles/mine')"
          >
            <text class="mine-list-title">
              我加入的圈子
            </text>
            <view class="mine-list-more">
              <text class="mine-list-count">
                {{ myCircles.length }}个
              </text>
              <app-icon
                name="chevron-right"
                :size="28"
                color="#999999"
              />
            </view>
          </view>
          <view
            v-if="myCircles.length === 0"
            class="mine-empty"
          >
            <view class="empty-icon">
              <app-icon
                name="users"
                :size="48"
                color="#999999"
              />
            </view>
            <text class="empty-text">
              还没有加入任何圈子
            </text>
            <view
              class="go-btn"
              @tap="activeTab = 'discover'"
            >
              <text class="go-btn-text">
                去发现圈子
              </text>
            </view>
          </view>
          <view
            v-else
            class="mine-list"
          >
            <view
              v-for="c in myCircles"
              :key="c.id"
              class="mine-item"
              @tap="go(`/pages/circles/detail?id=${c.id}`)"
            >
              <image
                :src="c.cover"
                class="mine-cover"
                mode="aspectFill"
              />
              <view class="mine-item-info">
                <text class="mine-item-name">
                  {{ c.name }}
                </text>
                <text class="mine-item-meta">
                  {{ formatMembers(c.members) }}成员 · {{ c.posts }}帖子
                </text>
                <view
                  v-if="c.todayActive && c.todayActive > 0"
                  class="mine-item-active"
                >
                  <app-icon
                    name="flame"
                    :size="22"
                    color="#FF6B35"
                  />
                  <text class="mine-item-active-text">
                    今日{{ c.todayActive }}条新动态
                  </text>
                </view>
              </view>
              <app-icon
                name="chevron-right"
                :size="32"
                color="#cccccc"
              />
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
.main-tabs { display: flex; align-items: center; border-bottom: 2rpx solid var(--line-nav, #e8e3db); }
.main-tab { flex: 1; padding: 24rpx 0; display: flex; flex-direction: column; align-items: center; position: relative; }
.main-tab-text { font-size: 28rpx; font-weight: 500; color: var(--text-faint, #999); }
.main-tab-text.on { color: var(--brand, #c41e3a); }
.main-tab-underline { position: absolute; bottom: 0; width: 48rpx; height: 4rpx; background: var(--brand, #c41e3a); border-radius: 999rpx; }

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
.live-btn { display: flex; align-items: center; gap: 6rpx; padding: 16rpx 28rpx; background: var(--brand, #c41e3a); border-radius: 999rpx; flex-shrink: 0; }
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
.cat-chip { padding: 12rpx 28rpx; border-radius: 999rpx; background: var(--card, #fff); border: 2rpx solid var(--line-nav, #e8e3db); }
.cat-chip.on { background: var(--brand, #c41e3a); border-color: var(--brand, #c41e3a); }
.cat-text { font-size: 26rpx; font-weight: 500; color: var(--text-soft, #666); }
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
.go-btn { padding: 16rpx 32rpx; background: var(--brand, #c41e3a); border-radius: 999rpx; margin-top: 8rpx; }
.go-btn-text { font-size: 26rpx; color: #fff; }
.post { background: var(--card, #fff); border-radius: 32rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04); }
.post-source { padding: 24rpx 32rpx 16rpx; display: flex; align-items: center; justify-content: space-between; border-bottom: 2rpx solid var(--line-soft, #f5f0e8); }
.post-source-left { display: flex; align-items: center; gap: 12rpx; }
.post-circle { font-size: 24rpx; color: var(--brand, #c41e3a); font-weight: 500; }
.post-pin { font-size: 18rpx; padding: 4rpx 12rpx; background: #FFF0F0; color: var(--brand, #c41e3a); border-radius: 6rpx; }
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
.mine-stats { background: linear-gradient(135deg, #c41e3a, #a01530); border-radius: 32rpx; padding: 32rpx; margin-bottom: 32rpx; }
.mine-stats-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.mine-stats-title { font-size: 28rpx; font-weight: 500; color: #fff; }
.mine-stats-more { display: flex; align-items: center; }
.mine-stats-more-text { font-size: 22rpx; color: rgba(255, 255, 255, 0.7); }
.mine-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
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
.create-btn { display: flex; align-items: center; gap: 6rpx; padding: 0 22rpx; height: 60rpx; border-radius: 999rpx; background: linear-gradient(135deg, #c41e3a, #a01530); box-shadow: 0 4rpx 12rpx rgba(196, 30, 58, 0.28); }
.create-btn-text { font-size: 26rpx; color: #ffffff; font-weight: 600; }
.create-btn:active { opacity: 0.85; }

/* AI 搜索按钮 */
.ai-search-btn { display: flex; align-items: center; gap: 4rpx; padding: 0 22rpx; height: 60rpx; border-radius: 999rpx; background: linear-gradient(135deg, #c41e3a, #a01530); }
.ai-search-text { font-size: 24rpx; color: #ffffff; font-weight: 600; }

/* 我的圈子横滚 */
.mycircle-tabs { display: flex; align-items: center; gap: 4rpx; background: var(--line-soft, #f5f0e8); border-radius: 999rpx; padding: 4rpx; }
.mycircle-tab { padding: 8rpx 20rpx; border-radius: 999rpx; }
.mycircle-tab.on { background: #fff; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08); }
.mycircle-tab-text { font-size: 24rpx; font-weight: 500; color: var(--text-soft, #666); }
.mycircle-tab-text.on { color: var(--text-ink, #2c2c2c); }
.mycircle-scroll { width: 100%; white-space: nowrap; }
.mycircle-row { display: inline-flex; gap: 16rpx; padding-bottom: 8rpx; }
.mycircle-card { width: 260rpx; background: #fff; border-radius: 20rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06); white-space: normal; }
.mycircle-card:active { transform: scale(0.98); }
.mycircle-cover-wrap { position: relative; aspect-ratio: 4/3; overflow: hidden; }
.mycircle-cover { width: 100%; height: 100%; }
.mycircle-badge { position: absolute; top: 12rpx; right: 12rpx; min-width: 36rpx; height: 36rpx; padding: 0 8rpx; border-radius: 999rpx; background: #c41e3a; display: flex; align-items: center; justify-content: center; }
.mycircle-badge-text { font-size: 18rpx; font-weight: 700; color: #fff; }
.mycircle-info { padding: 16rpx; }
.mycircle-name { display: block; font-size: 24rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); line-clamp: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mycircle-meta { display: block; font-size: 20rpx; color: var(--text-faint, #999); margin-top: 4rpx; }
.mycircle-last { display: block; font-size: 20rpx; color: var(--text-soft, #666); margin-top: 8rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 创建圈子推广卡片 */
.create-promo { display: flex; align-items: center; gap: 24rpx; background: #fff; border: 2rpx solid rgba(196, 30, 58, 0.2); border-radius: 24rpx; padding: 28rpx 24rpx; box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05); }
.create-promo:active { transform: scale(0.98); }
.create-promo-icon { width: 96rpx; height: 96rpx; border-radius: 20rpx; background: linear-gradient(135deg, #c41e3a, #e02d4a); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4rpx 12rpx rgba(196, 30, 58, 0.25); }
.create-promo-body { flex: 1; min-width: 0; }
.create-promo-title { display: block; font-size: 30rpx; font-weight: 700; color: #c41e3a; }
.create-promo-sub { display: block; font-size: 24rpx; color: var(--text-soft, #666); margin-top: 6rpx; }

/* 热门圈子网格 */
.hot-badge { font-size: 22rpx; color: var(--text-faint, #999); background: var(--line-soft, #f5f0e8); padding: 4rpx 16rpx; border-radius: 999rpx; }
.hot-grid { display: flex; flex-direction: column; gap: 16rpx; }
.hot-card { position: relative; background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05); display: flex; }
.hot-card:active { background: #faf8f5; }
.hot-cover { width: 200rpx; height: 200rpx; flex-shrink: 0; }
.hot-rank-badge { position: absolute; top: 12rpx; left: 12rpx; width: 40rpx; height: 40rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; color: #fff; background: rgba(0, 0, 0, 0.4); }
.hot-rank-1 { background: linear-gradient(135deg, #facc15, #f97316); }
.hot-rank-2 { background: linear-gradient(135deg, #d1d5db, #9ca3af); }
.hot-rank-3 { background: linear-gradient(135deg, #fdba74, #fb923c); }
.hot-body { flex: 1; padding: 20rpx 24rpx; display: flex; flex-direction: column; gap: 8rpx; min-width: 0; }
.hot-head-row { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.hot-name { font-size: 28rpx; font-weight: 600; color: var(--text-ink, #2c2c2c); }
.hot-tags { display: flex; gap: 8rpx; }
.hot-tag { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 6rpx; background: rgba(196, 30, 58, 0.08); color: #c41e3a; }
.hot-desc { font-size: 24rpx; color: var(--text-soft, #666); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.hot-footer { display: flex; align-items: center; gap: 16rpx; margin-top: auto; }
.hot-members { font-size: 22rpx; color: var(--text-faint, #999); }
.hot-price { font-size: 24rpx; font-weight: 600; color: #c41e3a; }
.hot-price.free { color: #22c55e; }

/* 展开/收起按钮 */
.expand-btn { display: flex; align-items: center; justify-content: center; gap: 8rpx; margin-top: 16rpx; padding: 24rpx; background: #fff; border-radius: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05); }
.expand-btn:active { background: #faf8f5; }
.expand-btn-text { font-size: 26rpx; font-weight: 500; color: #c41e3a; }

/* 排行页脚链接 */
.rank-footer-link { display: flex; align-items: center; justify-content: center; gap: 4rpx; margin-top: 8rpx; padding: 16rpx; }
.rank-footer-text { font-size: 24rpx; color: var(--text-faint, #999); }
</style>
