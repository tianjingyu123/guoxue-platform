<script setup lang="ts">
/**
 * 圈子首页（圈子广场）— V0「两段式一屏」重构（2026-07-10）
 * 结构：我的圈子(横滑·回访) + 发现圈子(分类+推荐列表) + 动态(已加入圈子聚合)
 * 顶栏：标题 + 搜索 + 创建 + 「圈子·我的」头像入口（板块门户 4.3）
 * 数据层沿用原实现：circleApi.list/my/getHotPosts/getMyStats/join + joinedIds 标记 + onShow 刷新
 */
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { navigateTo } from '@/utils/router'
import {
  circleApi, circleCategories, formatMembers,
  type Circle, type HotPost, type MyCircleStats,
} from '@/lib/circle-data'

const category = ref('')
const circles = ref<Circle[]>([])
const myCircles = ref<Circle[]>([])
// 已加入圈子 id 集合（来自 my()）：给发现列表正确标「已加入」
const joinedIds = ref<Set<string>>(new Set())
function markJoined() {
  if (!joinedIds.value.size) return
  circles.value = circles.value.map((c) => (joinedIds.value.has(String(c.id)) ? { ...c, isJoined: true } : c))
}
const hotPosts = ref<HotPost[]>([])
const loading = ref(true)
const error = ref(false)
const myStats = ref<MyCircleStats>({ joinedCount: 0, postCount: 0, likeReceived: 0 })

/** 发现圈子网格（随分类变化，单独重载） */
async function loadCircles() {
  loading.value = true
  error.value = false
  try {
    const res = await circleApi.list({ category: category.value })
    circles.value = res.data
    markJoined()
  } catch {
    error.value = true
    circles.value = []
  } finally {
    loading.value = false
  }
}

/** 我的圈子 + 动态 + 统计（与分类无关，首屏加载一次；各自空数据走空态） */
async function loadExtras() {
  const [myRes, postRes, statsRes] = await Promise.allSettled([
    circleApi.my(),
    circleApi.getHotPosts(),
    circleApi.getMyStats(),
  ])
  myCircles.value = myRes.status === 'fulfilled' ? myRes.value : []
  joinedIds.value = new Set(myCircles.value.map((c) => String(c.id)))
  markJoined()
  hotPosts.value = postRes.status === 'fulfilled' ? postRes.value : []
  if (statsRes.status === 'fulfilled') myStats.value = statsRes.value
}

function selectCategory(id: string) {
  if (category.value === id) return
  category.value = id
  loadCircles()
}

async function handleJoin(id: string) {
  const idx = circles.value.findIndex((c) => c.id === id)
  if (idx < 0) return
  circles.value[idx] = { ...circles.value[idx], isJoined: true, members: circles.value[idx].members + 1 }
  joinedIds.value.add(String(id))
  try {
    await circleApi.join(id)
  } catch {
    circles.value[idx] = { ...circles.value[idx], isJoined: false, members: circles.value[idx].members - 1 }
    joinedIds.value.delete(String(id))
  }
}

function go(url: string) { navigateTo(url) }

onMounted(() => { loadCircles(); loadExtras() })
// 返回本页刷新「已加入」态（详情页加入/退出后回来即时反映）
let _firstShow = true
onShow(() => {
  if (_firstShow) { _firstShow = false; return }
  loadExtras()
})
</script>

<template>
  <view class="page">
    <app-network-bar />
    <customer-service-fab />

    <!-- 顶栏：标题 + 搜索 + 创建 + 圈子·我的入口 -->
    <view class="topbar">
      <text class="title">圈子</text>
      <view class="actions">
        <view class="icon-btn" @tap="go('/pkg-circle/circles/search')">
          <app-icon name="search" :size="36" color="#2C2C2C" />
        </view>
        <view class="create-btn" @tap="go('/pkg-circle/circles/create')">
          <app-icon name="plus" :size="28" color="#ffffff" />
          <text class="create-btn-txt">创建</text>
        </view>
        <!-- 「圈子·我的」板块门户入口（非全局个人中心） -->
        <view class="me-entry" @tap="go('/pkg-circle/circles/me')">
          <app-icon name="user" :size="34" color="#666666" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="body">
      <!-- ════ 区① 我的圈子 · 横滑 ════ -->
      <view v-if="myCircles.length" class="section">
        <view class="sec-head">
          <text class="sec-title">我的圈子</text>
          <view class="sec-more" @tap="go('/pkg-circle/circles/me')">
            <text class="sec-more-txt">更多</text>
            <app-icon name="chevron-right" :size="24" color="#6E6E73" />
          </view>
        </view>
        <scroll-view scroll-x class="mine-scroll">
          <view class="mine-row">
            <view
              v-for="c in myCircles" :key="c.id"
              class="mine-card" @tap="go(`/pkg-circle/circles/detail?id=${c.id}`)"
            >
              <view class="mine-cover-wrap">
                <smart-cover :src="c.cover" :title="c.name" type="circle" class="mine-cover" />
                <view v-if="c.todayActive && c.todayActive > 0" class="dot-new" />
              </view>
              <text class="mine-name">{{ c.name }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- ════ 区② 发现圈子 ════ -->
      <view class="section">
        <view class="sec-head"><text class="sec-title">发现圈子</text></view>
        <!-- 分类筛选 -->
        <scroll-view scroll-x class="cat-scroll">
          <view class="cat-row">
            <view
              class="cat-chip" :class="{ on: category === '' }"
              @tap="selectCategory('')"
            ><text class="cat-text" :class="{ on: category === '' }">推荐</text></view>
            <view
              v-for="cat in circleCategories" :key="cat.id"
              class="cat-chip" :class="{ on: category === cat.id }"
              @tap="selectCategory(cat.id)"
            ><text class="cat-text" :class="{ on: category === cat.id }">{{ cat.name }}</text></view>
          </view>
        </scroll-view>

        <!-- 加载态：骨架 -->
        <view v-if="loading" class="discover-list">
          <view v-for="i in 4" :key="i" class="sk-card">
            <view class="sk-cover" />
            <view class="sk-body"><view class="sk-line w3" /><view class="sk-line w2" /></view>
          </view>
        </view>
        <!-- 错误态 -->
        <app-error v-else-if="error" title="圈子加载失败" desc="网络异常，请稍后重试" @retry="loadCircles" />
        <!-- 列表 -->
        <view v-else-if="circles.length" class="discover-list">
          <view
            v-for="c in circles" :key="c.id"
            class="circle-card" @tap="go(`/pkg-circle/circles/detail?id=${c.id}`)"
          >
            <smart-cover :src="c.cover" :title="c.name" type="circle" class="card-cover" />
            <view class="card-body">
              <text class="card-title">{{ c.name }}</text>
              <text class="card-desc">{{ c.description }}</text>
              <view class="card-meta">
                <text>{{ formatMembers(c.members) }}成员</text>
                <template v-if="c.todayActive && c.todayActive > 0">
                  <view class="sep" /><text>今日 {{ c.todayActive }} 条新内容</text>
                </template>
              </view>
            </view>
            <view class="card-side">
              <text v-if="c.isPaid" class="join-price">¥{{ c.price }}/年</text>
              <text v-else class="join-free">免费</text>
              <view
                v-if="c.isJoined" class="btn-joined"
              ><text class="btn-joined-txt">已加入</text></view>
              <view
                v-else class="btn-join" @tap.stop="handleJoin(c.id)"
              ><text class="btn-join-txt">加入</text></view>
            </view>
          </view>
        </view>
        <!-- 空态 -->
        <view v-else class="empty">
          <view class="empty-icon"><app-icon name="users" :size="56" color="#999999" /></view>
          <text class="empty-text">暂无相关圈子</text>
        </view>
      </view>

      <!-- ════ 区③ 动态 · 已加入圈子聚合 ════ -->
      <view v-if="hotPosts.length" class="section">
        <view class="sec-head">
          <view class="sec-title-wrap">
            <text class="sec-title">动态</text>
            <text class="sec-sub">来自你加入的圈子</text>
          </view>
        </view>
        <view class="feed-list">
          <view
            v-for="post in hotPosts" :key="post.id"
            class="feed-item" @tap="go(`/pkg-circle/circles/post?id=${post.id}&circleId=${post.circleId}`)"
          >
            <image lazy-load :src="post.author.avatar" class="feed-avatar" mode="aspectFill" />
            <view class="feed-body">
              <view class="feed-source">
                <text class="feed-circle" @tap.stop="go(`/pkg-circle/circles/detail?id=${post.circleId}`)">{{ post.circleName }}</text>
                <text class="feed-dot">·</text>
                <text class="feed-author">{{ post.author.name }}</text>
                <text class="feed-dot">·</text>
                <text class="feed-time">{{ post.time }}</text>
                <text v-if="post.isPinned" class="tag-featured">置顶</text>
              </view>
              <text class="feed-text">{{ post.content }}</text>
            </view>
            <image v-if="post.images.length" lazy-load :src="post.images[0]" class="feed-thumb" mode="aspectFill" />
          </view>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <bottom-nav active="circle" />
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-page, #faf8f5); display: flex; flex-direction: column; }

/* 顶栏 */
.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20rpx 32rpx 12rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 20rpx);
  background: rgba(250, 248, 245, 0.92);
  backdrop-filter: blur(20rpx);
}
.title { font-size: 44rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); letter-spacing: 1rpx; }
.actions { display: flex; align-items: center; gap: 14rpx; }
/* 搜索入口：常显浅底衬+88rpx 触达区 */
.icon-btn { position: relative; width: 88rpx; height: 88rpx; border-radius: 999rpx; background: rgba(0, 0, 0, 0.04); display: flex; align-items: center; justify-content: center; }
.icon-btn:active { background: var(--separator, #ede7dd); }
/* 创建=关键动作·朱红实底 */
.create-btn {
  display: flex; align-items: center; gap: 6rpx;
  height: 60rpx; padding: 0 24rpx; border-radius: 30rpx;
  background: var(--brand, #c41e3a);
}
.create-btn-txt { font-size: 26rpx; color: #fff; font-weight: 500; }
.create-btn:active { opacity: 0.85; }
/* 圈子·我的入口 */
.me-entry {
  width: 88rpx; height: 88rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  background: #fff; box-shadow: 0 0 0 2rpx var(--separator, #ede7dd);
}
.me-entry:active { opacity: 0.8; }

.body { flex: 1; }
.section { margin-top: 40rpx; }
.bottom-spacer { height: 180rpx; }

/* 分区标题 */
.sec-head { display: flex; align-items: baseline; justify-content: space-between; padding: 0 32rpx; margin-bottom: 20rpx; }
.sec-title { font-size: 34rpx; font-weight: 650; color: var(--text-primary, #2c2c2c); }
.sec-title-wrap { display: flex; align-items: baseline; gap: 14rpx; }
.sec-sub { font-size: 22rpx; color: var(--text-tertiary, #999); }
.sec-more { display: flex; align-items: center; gap: 2rpx; }
.sec-more-txt { font-size: 24rpx; color: var(--text-secondary, #6e6e73); }

/* 区① 我的圈子横滑 */
.mine-scroll { width: 100%; white-space: nowrap; }
.mine-row { display: inline-flex; gap: 32rpx; padding: 8rpx 32rpx 16rpx; }
.mine-card { width: 132rpx; display: inline-flex; flex-direction: column; align-items: center; }
.mine-cover-wrap { position: relative; width: 120rpx; height: 120rpx; }
.mine-cover { width: 120rpx; height: 120rpx; border-radius: 36rpx; }
.dot-new {
  position: absolute; top: -4rpx; right: -4rpx;
  width: 20rpx; height: 20rpx; border-radius: 999rpx;
  background: var(--brand, #c41e3a); border: 4rpx solid var(--bg-page, #faf8f5);
}
.mine-name {
  margin-top: 14rpx; font-size: 24rpx; color: var(--text-primary, #2c2c2c);
  max-width: 132rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;
}

/* 区② 发现圈子 */
.cat-scroll { width: 100%; white-space: nowrap; }
.cat-row { display: inline-flex; gap: 16rpx; padding: 0 32rpx 24rpx; }
.cat-chip {
  flex-shrink: 0; height: 60rpx; padding: 0 30rpx; border-radius: 30rpx;
  display: flex; align-items: center;
  background: var(--bg-card, #fff); border: 1rpx solid var(--separator, #ede7dd);
}
.cat-chip.on { background: var(--text-primary, #2c2c2c); border-color: var(--text-primary, #2c2c2c); }
.cat-text { font-size: 26rpx; color: var(--text-secondary, #6e6e73); white-space: nowrap; }
.cat-text.on { color: #fff; font-weight: 500; }

.discover-list { display: flex; flex-direction: column; gap: 20rpx; padding: 0 32rpx; }
.circle-card {
  display: flex; gap: 24rpx; align-items: flex-start;
  background: var(--bg-card, #fff); border-radius: 32rpx; padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(44, 44, 44, 0.04);
}
.circle-card:active { transform: scale(0.99); }
.card-cover { width: 140rpx; height: 140rpx; border-radius: 24rpx; flex-shrink: 0; }
.card-body { flex: 1; min-width: 0; }
.card-title { display: block; font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-desc { display: block; font-size: 24rpx; color: var(--text-secondary, #6e6e73); margin-top: 6rpx; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
.card-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 14rpx; font-size: 22rpx; color: var(--text-tertiary, #999); }
.card-meta .sep { width: 4rpx; height: 4rpx; border-radius: 999rpx; background: var(--text-tertiary, #999); }
.card-side { display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; align-self: stretch; flex-shrink: 0; }
/* 付费价格·国学金（价值感） */
.join-price { font-size: 24rpx; font-weight: 650; color: var(--gold, #c9a96e); }
.join-free { font-size: 24rpx; color: var(--text-tertiary, #999); }
/* 加入·朱红软底 */
.btn-join { height: 56rpx; padding: 0 30rpx; border-radius: 28rpx; background: var(--brand-soft, rgba(196, 30, 58, 0.08)); display: flex; align-items: center; }
.btn-join-txt { font-size: 26rpx; font-weight: 600; color: var(--brand, #c41e3a); }
.btn-join:active { opacity: 0.8; }
.btn-joined { height: 56rpx; padding: 0 24rpx; border-radius: 28rpx; border: 1rpx solid var(--separator, #ede7dd); display: flex; align-items: center; }
.btn-joined-txt { font-size: 26rpx; color: var(--text-tertiary, #999); }

/* 骨架 */
.sk-card { display: flex; gap: 24rpx; background: var(--bg-card, #fff); border-radius: 32rpx; padding: 24rpx; }
.sk-cover { width: 140rpx; height: 140rpx; border-radius: 24rpx; background: #f2efea; flex-shrink: 0; }
.sk-body { flex: 1; padding-top: 12rpx; }
.sk-line { height: 28rpx; background: #f2efea; border-radius: 8rpx; margin-bottom: 16rpx; }
.sk-line.w3 { width: 70%; }
.sk-line.w2 { width: 45%; }

/* 空态 */
.empty { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { width: 128rpx; height: 128rpx; border-radius: 999rpx; background: var(--separator, #f5f0e8); display: flex; align-items: center; justify-content: center; margin-bottom: 28rpx; }
.empty-text { font-size: 28rpx; color: var(--text-tertiary, #999); }

/* 区③ 动态 */
.feed-list { padding: 0 32rpx; }
.feed-item { display: flex; gap: 20rpx; padding: 28rpx 0; border-bottom: 1rpx solid var(--separator, #ede7dd); }
.feed-item:last-child { border-bottom: none; }
.feed-avatar { width: 72rpx; height: 72rpx; border-radius: 22rpx; flex-shrink: 0; }
.feed-body { flex: 1; min-width: 0; }
.feed-source { display: flex; align-items: center; gap: 8rpx; flex-wrap: wrap; }
.feed-circle { font-size: 22rpx; color: var(--text-secondary, #6e6e73); font-weight: 500; }
.feed-dot { font-size: 22rpx; color: var(--text-tertiary, #999); }
.feed-author, .feed-time { font-size: 22rpx; color: var(--text-tertiary, #999); }
.tag-featured { font-size: 18rpx; color: var(--gold, #c9a96e); font-weight: 600; border: 1rpx solid var(--gold, #c9a96e); border-radius: 6rpx; padding: 0 8rpx; line-height: 28rpx; }
.feed-text { display: -webkit-box; margin-top: 8rpx; font-size: 27rpx; color: var(--text-primary, #2c2c2c); line-height: 1.55; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.feed-thumb { width: 104rpx; height: 104rpx; border-radius: 16rpx; flex-shrink: 0; align-self: center; }
</style>
