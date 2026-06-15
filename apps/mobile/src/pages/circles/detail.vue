<script setup lang="ts">
/**
 * 圈子详情页（从原型 app/circles/[id]/page.tsx 843 行高保真迁移）
 * 封面+导航 / 信息卡 / 公告 / 6Tab(首页/帖子/文章/精华/专栏/成员) / 底部操作栏 / 会员权益弹窗
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import PostCard from '@/components/circle/post-card.vue'
import { goBack, navigateTo, toastComingSoon } from '@/utils/router'
import {
  circleDetailApi, memberBenefits, mockColumns, mockCircleArticles, mockActivities,
  type CircleDetail, type CirclePost, type CircleMember,
} from '@/lib/circle-detail-data'

const circleId = ref('1')
const circle = ref<CircleDetail | null>(null)
const posts = ref<CirclePost[]>([])
const members = ref<CircleMember[]>([])
const isLoading = ref(true)
const activeTab = ref<'home' | 'posts' | 'articles' | 'essence' | 'columns' | 'members'>('home')
const showAnnouncement = ref(true)
const isJoined = ref(false)
const isOwner = ref(true) // mock：当前用户是圈主
const likedPosts = ref<Set<string>>(new Set())
const showBenefits = ref(false)

const columns = mockColumns
const circleArticles = mockCircleArticles
const activities = mockActivities

const tabs = [
  { id: 'home', label: '首页' },
  { id: 'posts', label: '帖子' },
  { id: 'articles', label: '文章' },
  { id: 'essence', label: '精华' },
  { id: 'columns', label: '专栏' },
  { id: 'members', label: '成员' },
] as const

const pinnedPosts = computed(() => posts.value.filter(p => p.isPinned))
const essencePosts = computed(() => posts.value.filter(p => p.isEssence))

onLoad((q) => {
  if (q?.id) circleId.value = q.id
  loadData()
})

async function loadData() {
  isLoading.value = true
  try {
    const [c, p, m] = await Promise.all([
      circleDetailApi.detail(circleId.value),
      circleDetailApi.posts(circleId.value),
      circleDetailApi.listMembers(circleId.value),
    ])
    circle.value = c
    posts.value = p.data
    members.value = m.data
    isJoined.value = c.isJoined
    likedPosts.value = new Set(p.data.filter(x => x.isLiked).map(x => x.id))
  } finally {
    isLoading.value = false
  }
}

function handleJoin() {
  if (!isJoined.value) {
    showBenefits.value = true
  } else {
    isJoined.value = false
    circleDetailApi.leave(circleId.value).catch(() => { isJoined.value = true })
  }
}
function confirmJoin() {
  showBenefits.value = false
  isJoined.value = true
  circleDetailApi.join(circleId.value).catch(() => { isJoined.value = false })
}
function handleLikePost(postId: string) {
  const next = new Set(likedPosts.value)
  const wasLiked = next.has(postId)
  wasLiked ? next.delete(postId) : next.add(postId)
  likedPosts.value = next
  posts.value = posts.value.map(p => p.id === postId ? { ...p, likes: p.likes + (wasLiked ? -1 : 1) } : p)
}

function fmt(n: number) { return n.toLocaleString() }
function openShare() { navigateTo(`/pkg-circle/common/share-poster?type=circle&targetId=${circleId.value}`) }
function openPost(id: string) { navigateTo(`/pkg-circle/circles/post?circleId=${circleId.value}&id=${id}`) }
function openPublish() { navigateTo(`/pkg-circle/circles/publish?circleId=${circleId.value}`) }
function openAnnouncement() { navigateTo(`/pkg-circle/circles/announcements?id=1&circleId=${circleId.value}`) }
function openUser(id: string) { navigateTo(`/pkg-circle/user/profile?id=${id}`) }
function openManage() { navigateTo(`/pkg-circle/circles/manage?id=${circleId.value}`) }
</script>

<template>
  <view class="cd" v-if="!isLoading && circle">
    <!-- 顶部封面 -->
    <view class="cd-cover">
      <image :src="circle.cover" class="cd-cover-img" mode="aspectFill" />
      <view class="cd-cover-mask" />
      <view class="cd-nav">
        <view class="cd-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#ffffff" /></view>
        <view class="cd-nav-right">
          <view v-if="isOwner" class="cd-nav-btn" @tap="openManage"><app-icon name="settings" :size="40" color="#ffffff" /></view>
          <view class="cd-nav-btn" @tap="toastComingSoon"><app-icon name="bell" :size="40" color="#ffffff" /></view>
          <view class="cd-nav-btn" @tap="openShare"><app-icon name="share-2" :size="40" color="#ffffff" /></view>
        </view>
      </view>
      <view class="cd-level"><app-icon name="star" :size="26" color="#ffffff" :fill="true" /><text class="cd-level-txt">优质圈子</text></view>
    </view>

    <!-- 圈子信息卡 -->
    <view class="cd-info-wrap">
      <view class="cd-info">
        <view class="cd-info-top">
          <view class="cd-avatar"><image :src="circle.owner.avatar" class="cd-avatar-img" mode="aspectFill" /></view>
          <view class="cd-info-main">
            <view class="cd-name-row">
              <text class="cd-name">{{ circle.name }}</text>
              <text class="cd-paid">付费</text>
            </view>
            <view class="cd-stats">
              <view class="cd-stat"><app-icon name="users" :size="26" color="#999999" /><text class="cd-stat-txt">{{ fmt(circle.members) }} 成员</text></view>
              <view class="cd-stat"><app-icon name="file-text" :size="26" color="#999999" /><text class="cd-stat-txt">{{ fmt(circle.posts) }} 帖子</text></view>
              <view class="cd-stat"><app-icon name="flame" :size="26" color="#f97316" /><text class="cd-stat-txt">今日{{ circle.todayActive }}</text></view>
            </view>
          </view>
        </view>
        <text class="cd-desc">{{ circle.description }}</text>
        <view v-if="circle.tags && circle.tags.length" class="cd-tags">
          <text v-for="tag in circle.tags" :key="tag" class="cd-tag">#{{ tag }}</text>
        </view>
        <view class="cd-owner" @tap="openUser(circle.owner.id)">
          <image :src="circle.owner.avatar" class="cd-owner-avatar" mode="aspectFill" />
          <view class="cd-owner-info">
            <view class="cd-owner-name-row">
              <text class="cd-owner-name">{{ circle.owner.name }}</text>
              <app-icon name="crown" :size="26" color="#C9A96E" />
            </view>
            <text class="cd-owner-role">圈主</text>
          </view>
          <app-icon name="chevron-right" :size="28" color="#cccccc" />
        </view>
      </view>
    </view>

    <!-- 公告栏 -->
    <view v-if="circle.announcement" class="cd-ann">
      <view class="cd-ann-box">
        <view class="cd-ann-head" @tap="showAnnouncement = !showAnnouncement">
          <view class="cd-ann-title">
            <view class="cd-ann-icon"><app-icon name="bell" :size="20" color="#ffffff" /></view>
            <text class="cd-ann-label">圈子公告</text>
          </view>
          <app-icon :name="showAnnouncement ? 'chevron-up' : 'chevron-down'" :size="28" color="#999999" />
        </view>
        <view v-if="showAnnouncement" class="cd-ann-body">
          <text class="cd-ann-text">{{ circle.announcement }}</text>
          <view class="cd-ann-more" @tap="openAnnouncement">
            <text class="cd-ann-more-t">查看完整公告</text>
            <app-icon name="chevron-right" :size="24" color="#C41E3A" />
          </view>
        </view>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="cd-tabs">
      <scroll-view scroll-x class="cd-tabs-scroll">
        <view class="cd-tabs-row">
          <view v-for="tab in tabs" :key="tab.id" class="cd-tab" @tap="activeTab = tab.id">
            <text class="cd-tab-txt" :class="{ on: activeTab === tab.id }">{{ tab.label }}<text v-if="tab.id === 'members'">({{ circle.members }})</text></text>
            <view v-if="activeTab === tab.id" class="cd-tab-line" />
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 内容区 -->
    <view class="cd-content">
      <!-- 首页 Tab -->
      <view v-if="activeTab === 'home'" class="cd-home">
        <!-- 近期活动 -->
        <view v-if="activities.length" class="cd-sec">
          <view class="cd-sec-head">
            <view class="cd-sec-title"><app-icon name="zap" :size="28" color="#FF6B35" /><text class="cd-sec-label">近期活动</text></view>
            <view class="cd-sec-more" @tap="toastComingSoon"><text class="cd-more-txt">全部</text><app-icon name="chevron-right" :size="26" color="#999999" /></view>
          </view>
          <view class="cd-acts">
            <view v-for="act in activities.slice(0, 2)" :key="act.id" class="cd-act" @tap="toastComingSoon">
              <view class="cd-act-icon" :class="act.type">
                <app-icon :name="act.type === 'live' ? 'play' : act.type === 'checkin' ? 'check-circle' : 'book-open'" :size="32" :color="act.type === 'live' ? '#ef4444' : act.type === 'checkin' ? '#22c55e' : '#f97316'" />
              </view>
              <view class="cd-act-main">
                <text class="cd-act-title">{{ act.title }}</text>
                <view class="cd-act-meta"><text class="cd-act-time">{{ act.time }}</text><text v-if="act.participants" class="cd-act-time">{{ act.participants }}人参与</text></view>
              </view>
              <view v-if="act.status === 'upcoming'" class="cd-act-btn red"><text class="cd-act-btn-txt">预约</text></view>
              <view v-else class="cd-act-btn green"><text class="cd-act-btn-txt">参与</text></view>
            </view>
          </view>
        </view>

        <!-- 置顶内容 -->
        <view v-if="pinnedPosts.length" class="cd-sec">
          <view class="cd-sec-title mb"><app-icon name="pin" :size="28" color="#C41E3A" /><text class="cd-sec-label">置顶内容</text></view>
          <view class="cd-pinned-list">
            <view v-for="post in pinnedPosts" :key="post.id" class="cd-pinned" @tap="openPost(post.id)">
              <image :src="post.author.avatar" class="cd-pinned-avatar" mode="aspectFill" />
              <view class="cd-pinned-main">
                <view class="cd-pinned-tags">
                  <app-icon name="pin" :size="24" color="#C41E3A" /><text class="cd-pinned-pin">置顶</text>
                  <text v-if="post.isEssence" class="pc-essence">精华</text>
                </view>
                <text class="cd-pinned-content">{{ post.content }}</text>
                <view class="cd-pinned-meta">
                  <text class="cd-pinned-meta-txt">{{ post.author.name }}</text>
                  <view class="cd-pinned-stat"><app-icon name="heart" :size="22" color="#999999" /><text class="cd-pinned-meta-txt">{{ post.likes }}</text></view>
                  <view class="cd-pinned-stat"><app-icon name="message-circle" :size="22" color="#999999" /><text class="cd-pinned-meta-txt">{{ post.comments }}</text></view>
                </view>
              </view>
              <image v-if="post.images && post.images.length" :src="post.images[0]" class="cd-pinned-img" mode="aspectFill" />
            </view>
          </view>
        </view>

        <!-- 专栏推荐 -->
        <view v-if="columns.length" class="cd-sec">
          <view class="cd-sec-head">
            <view class="cd-sec-title"><app-icon name="book-open" :size="28" color="#C9A96E" /><text class="cd-sec-label">专栏推荐</text></view>
            <view class="cd-sec-more" @tap="toastComingSoon"><text class="cd-more-txt">全部</text><app-icon name="chevron-right" :size="26" color="#999999" /></view>
          </view>
          <scroll-view scroll-x class="cd-cols-scroll">
            <view class="cd-cols-row">
              <view v-for="col in columns" :key="col.id" class="cd-col" @tap="toastComingSoon">
                <view class="cd-col-cover">
                  <image :src="col.cover" class="cd-col-img" mode="aspectFill" />
                  <view v-if="col.isPremium" class="cd-col-lock"><app-icon name="lock" :size="20" color="#ffffff" /></view>
                </view>
                <view class="cd-col-body">
                  <text class="cd-col-title">{{ col.title }}</text>
                  <text class="cd-col-meta">{{ col.articles }}篇 · {{ col.views }}阅读</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 最新动态 -->
        <view class="cd-sec">
          <text class="cd-sec-label mb">最新动态</text>
          <view class="cd-post-list">
            <post-card v-for="post in posts.slice(0, 3)" :key="post.id" :post="post" :circle-id="circleId" :liked="likedPosts.has(post.id)" @like="handleLikePost" />
          </view>
        </view>
      </view>

      <!-- 帖子 Tab -->
      <view v-else-if="activeTab === 'posts'" class="cd-post-list">
        <post-card v-for="post in posts" :key="post.id" :post="post" :circle-id="circleId" :liked="likedPosts.has(post.id)" @like="handleLikePost" />
      </view>

      <!-- 精华 Tab -->
      <view v-else-if="activeTab === 'essence'" class="cd-post-list">
        <template v-if="essencePosts.length">
          <post-card v-for="post in essencePosts" :key="post.id" :post="post" :circle-id="circleId" :liked="likedPosts.has(post.id)" :show-essence="true" @like="handleLikePost" />
        </template>
        <view v-else class="cd-empty">
          <app-icon name="star" :size="96" color="#E8E3DB" />
          <text class="cd-empty-txt">暂无精华内容</text>
        </view>
      </view>

      <!-- 文章 Tab -->
      <view v-else-if="activeTab === 'articles'" class="cd-post-list">
        <template v-if="circleArticles.length">
          <view v-for="a in circleArticles" :key="a.id" class="cd-article" @tap="toastComingSoon">
            <image v-if="a.cover" :src="a.cover" class="cd-article-cover" mode="aspectFill" />
            <view class="cd-article-main">
              <view class="cd-article-title-row">
                <text v-if="a.isFeatured" class="cd-article-feat">精选</text>
                <text class="cd-article-title">{{ a.title }}</text>
              </view>
              <view class="cd-article-meta">
                <text class="cd-article-meta-txt">{{ a.author }}</text>
                <view class="cd-article-stat"><app-icon name="eye" :size="22" color="#999999" /><text class="cd-article-meta-txt">{{ a.views }}</text></view>
                <view class="cd-article-stat"><app-icon name="heart" :size="22" color="#999999" /><text class="cd-article-meta-txt">{{ a.likes }}</text></view>
              </view>
            </view>
          </view>
        </template>
        <view v-else class="cd-empty"><text class="cd-empty-txt">圈主还没有发布文章</text></view>
      </view>

      <!-- 专栏 Tab -->
      <view v-else-if="activeTab === 'columns'" class="cd-col-grid">
        <view v-for="col in columns" :key="col.id" class="cd-col-card" @tap="toastComingSoon">
          <view class="cd-col-cover">
            <image :src="col.cover" class="cd-col-card-img" mode="aspectFill" />
            <view v-if="col.isPremium" class="cd-col-lock"><app-icon name="lock" :size="20" color="#ffffff" /></view>
          </view>
          <view class="cd-col-body">
            <text class="cd-col-title">{{ col.title }}</text>
            <text class="cd-col-meta">{{ col.articles }}篇文章 · {{ col.views }}阅读</text>
          </view>
        </view>
      </view>

      <!-- 成员 Tab -->
      <view v-else-if="activeTab === 'members'" class="cd-member-list">
        <view v-for="m in members" :key="m.id" class="cd-member" @tap="openUser(m.id)">
          <image :src="m.avatar" class="cd-member-avatar" mode="aspectFill" />
          <view class="cd-member-main">
            <view class="cd-member-name-row">
              <text class="cd-member-name">{{ m.name }}</text>
              <view v-if="m.role === 'owner'" class="cd-role owner"><app-icon name="crown" :size="22" color="#C9A96E" /><text class="cd-role-txt owner">圈主</text></view>
              <view v-else-if="m.role === 'admin'" class="cd-role admin"><app-icon name="shield" :size="22" color="#4A90D9" /><text class="cd-role-txt admin">管理员</text></view>
            </view>
            <view class="cd-member-meta">
              <text v-if="m.title" class="cd-member-meta-txt">{{ m.title }}</text>
              <text class="cd-member-meta-txt">发帖 {{ m.posts }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="cd-foot">
      <view class="cd-join" :class="{ joined: isJoined }" @tap="handleJoin">
        <text class="cd-join-txt" :class="{ joined: isJoined }">{{ isJoined ? '已加入' : '¥199/年 加入圈子' }}</text>
      </view>
      <view v-if="isJoined" class="cd-post-btn" @tap="openPublish">
        <app-icon name="plus" :size="28" color="#ffffff" /><text class="cd-post-btn-txt">发帖</text>
      </view>
    </view>

    <!-- 会员权益弹窗 -->
    <view v-if="showBenefits" class="cd-mask" @tap="showBenefits = false">
      <view class="cd-sheet" @tap.stop>
        <view class="cd-sheet-body">
          <view class="cd-sheet-head">
            <view class="cd-sheet-icon"><app-icon name="sparkles" :size="44" color="#ffffff" /></view>
            <text class="cd-sheet-title">加入「{{ circle.name }}」</text>
            <text class="cd-sheet-sub">¥199/年，解锁以下专属权益</text>
          </view>
          <view class="cd-benefits">
            <view v-for="(b, i) in memberBenefits" :key="i" class="cd-benefit">
              <view class="cd-benefit-icon"><app-icon :name="b.icon" :size="28" color="#C41E3A" /></view>
              <view class="cd-benefit-main">
                <text class="cd-benefit-title">{{ b.title }}</text>
                <text class="cd-benefit-desc">{{ b.desc }}</text>
              </view>
            </view>
          </view>
          <view class="cd-sheet-actions">
            <view class="cd-sheet-btn cancel" @tap="showBenefits = false"><text class="cd-sheet-btn-txt cancel">再想想</text></view>
            <view class="cd-sheet-btn confirm" @tap="confirmJoin"><text class="cd-sheet-btn-txt confirm">立即加入</text></view>
          </view>
        </view>
      </view>
    </view>
  </view>

  <!-- 骨架屏 -->
  <view v-else class="cd-skeleton">
    <view class="sk-cover" />
    <view class="sk-info"><view class="sk-card" /></view>
  </view>
</template>

<style scoped lang="scss">
.cd { min-height: 100vh; background: var(--bg-paper, #FAF8F5); padding-bottom: 180rpx; }
/* 封面 */
.cd-cover { position: relative; height: 384rpx; }
.cd-cover-img { width: 100%; height: 100%; }
.cd-cover-mask { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.6), transparent); }
.cd-nav { position: absolute; top: 0; left: 0; right: 0; padding: 32rpx; padding-top: calc(32rpx + var(--status-bar-height, 0px)); display: flex; align-items: center; justify-content: space-between; }
.cd-nav-right { display: flex; gap: 16rpx; }
.cd-nav-btn { width: 72rpx; height: 72rpx; border-radius: 999rpx; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
.cd-level { position: absolute; bottom: 24rpx; right: 24rpx; padding: 8rpx 20rpx; background: linear-gradient(to right, #C9A96E, #E8D5B5); border-radius: 999rpx; display: flex; align-items: center; gap: 8rpx; }
.cd-level-txt { font-size: 22rpx; color: #fff; font-weight: 500; }
/* 信息卡 */
.cd-info-wrap { padding: 0 32rpx; margin-top: -96rpx; position: relative; z-index: 10; }
.cd-info { background: var(--card, #fff); border-radius: 32rpx; padding: 32rpx; box-shadow: 0 8rpx 40rpx rgba(0,0,0,0.08); }
.cd-info-top { display: flex; align-items: flex-start; gap: 24rpx; }
.cd-avatar { width: 128rpx; height: 128rpx; border-radius: 999rpx; border: 8rpx solid #fff; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1); overflow: hidden; flex-shrink: 0; background: #FAF8F5; }
.cd-avatar-img { width: 100%; height: 100%; }
.cd-info-main { flex: 1; min-width: 0; }
.cd-name-row { display: flex; align-items: center; gap: 16rpx; }
.cd-name { font-size: 36rpx; font-weight: 700; color: var(--text-ink, #2C2C2C); }
.cd-paid { font-size: 20rpx; padding: 2rpx 12rpx; background: rgba(196,30,58,0.1); color: var(--brand, #C41E3A); border-radius: 6rpx; }
.cd-stats { display: flex; align-items: center; gap: 24rpx; margin-top: 8rpx; }
.cd-stat { display: flex; align-items: center; gap: 6rpx; }
.cd-stat-txt { font-size: 24rpx; color: #999; }
.cd-desc { display: block; font-size: 26rpx; color: #666; line-height: 1.7; margin-top: 24rpx; }
.cd-tags { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 24rpx; }
.cd-tag { font-size: 22rpx; padding: 4rpx 16rpx; background: #F5F0E8; color: #999; border-radius: 999rpx; }
.cd-owner { display: flex; align-items: center; gap: 16rpx; margin-top: 24rpx; padding-top: 24rpx; border-top: 2rpx solid #F5F0E8; }
.cd-owner-avatar { width: 64rpx; height: 64rpx; border-radius: 999rpx; }
.cd-owner-info { flex: 1; }
.cd-owner-name-row { display: flex; align-items: center; gap: 8rpx; }
.cd-owner-name { font-size: 26rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cd-owner-role { font-size: 22rpx; color: #999; }
/* 公告 */
.cd-ann { margin: 24rpx 32rpx 0; }
.cd-ann-box { background: linear-gradient(to right, #FFF8E7, #FFFBF0); border-radius: 24rpx; border: 2rpx solid #F0E6D3; overflow: hidden; }
.cd-ann-head { padding: 24rpx 32rpx; display: flex; align-items: center; justify-content: space-between; }
.cd-ann-title { display: flex; align-items: center; gap: 16rpx; }
.cd-ann-icon { width: 40rpx; height: 40rpx; border-radius: 8rpx; background: #C9A96E; display: flex; align-items: center; justify-content: center; }
.cd-ann-label { font-size: 26rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cd-ann-body { padding: 0 32rpx 24rpx; }
.cd-ann-text { font-size: 24rpx; color: #666; line-height: 1.7; }
.cd-ann-more { display: flex; align-items: center; gap: 4rpx; margin-top: 16rpx; }
.cd-ann-more-t { font-size: 24rpx; color: #C41E3A; font-weight: 500; }
/* Tabs */
.cd-tabs { margin-top: 32rpx; padding: 0 32rpx; border-bottom: 2rpx solid #E8E3DB; }
.cd-tabs-scroll { white-space: nowrap; }
.cd-tabs-row { display: inline-flex; gap: 8rpx; }
.cd-tab { padding: 0 32rpx 24rpx; position: relative; }
.cd-tab-txt { font-size: 28rpx; font-weight: 500; color: #999; }
.cd-tab-txt.on { color: var(--brand, #C41E3A); }
.cd-tab-line { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40rpx; height: 4rpx; background: var(--brand, #C41E3A); border-radius: 999rpx; }
/* 内容 */
.cd-content { padding: 32rpx; }
.cd-home { display: flex; flex-direction: column; gap: 32rpx; }
.cd-sec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.cd-sec-title { display: flex; align-items: center; gap: 16rpx; }
.cd-sec-title.mb { margin-bottom: 24rpx; }
.cd-sec-label { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cd-sec-label.mb { display: block; margin-bottom: 24rpx; }
.cd-sec-more { display: flex; align-items: center; gap: 4rpx; }
.cd-more-txt { font-size: 24rpx; color: #999; }
/* 活动 */
.cd-acts { display: flex; flex-direction: column; gap: 16rpx; }
.cd-act { display: flex; align-items: center; gap: 24rpx; background: var(--card, #fff); border-radius: 24rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.cd-act-icon { width: 80rpx; height: 80rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cd-act-icon.live { background: rgba(239,68,68,0.1); }
.cd-act-icon.checkin { background: rgba(34,197,94,0.1); }
.cd-act-icon.homework { background: rgba(249,115,22,0.1); }
.cd-act-main { flex: 1; min-width: 0; }
.cd-act-title { font-size: 26rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cd-act-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 4rpx; }
.cd-act-time { font-size: 22rpx; color: #999; }
.cd-act-btn { padding: 12rpx 24rpx; border-radius: 999rpx; flex-shrink: 0; }
.cd-act-btn.red { background: var(--brand, #C41E3A); }
.cd-act-btn.green { background: #52C41A; }
.cd-act-btn-txt { font-size: 22rpx; color: #fff; }
/* 置顶 */
.cd-pinned-list { display: flex; flex-direction: column; gap: 16rpx; }
.cd-pinned { display: flex; align-items: flex-start; gap: 24rpx; background: linear-gradient(to right, #FFF8E7, #FFFBF0); border-radius: 24rpx; padding: 24rpx; border: 2rpx solid #F0E6D3; }
.cd-pinned-avatar { width: 80rpx; height: 80rpx; border-radius: 999rpx; flex-shrink: 0; }
.cd-pinned-main { flex: 1; min-width: 0; }
.cd-pinned-tags { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.cd-pinned-pin { font-size: 22rpx; color: var(--brand, #C41E3A); font-weight: 500; }
.cd-pinned-content { display: block; font-size: 24rpx; color: var(--text-ink, #2C2C2C); line-height: 1.6; }
.cd-pinned-meta { display: flex; align-items: center; gap: 24rpx; margin-top: 12rpx; }
.cd-pinned-stat { display: flex; align-items: center; gap: 6rpx; }
.cd-pinned-meta-txt { font-size: 22rpx; color: #999; }
.cd-pinned-img { width: 96rpx; height: 96rpx; border-radius: 16rpx; flex-shrink: 0; }
.pc-essence { font-size: 20rpx; padding: 2rpx 12rpx; background: rgba(201,169,110,0.1); color: #C9A96E; border-radius: 6rpx; }
/* 专栏横滚 */
.cd-cols-scroll { white-space: nowrap; }
.cd-cols-row { display: inline-flex; gap: 24rpx; }
.cd-col { width: 320rpx; background: var(--card, #fff); border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.cd-col-cover { position: relative; }
.cd-col-img { width: 100%; height: 160rpx; }
.cd-col-lock { position: absolute; top: 16rpx; right: 16rpx; width: 40rpx; height: 40rpx; background: #C9A96E; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.cd-col-body { padding: 20rpx; }
.cd-col-title { display: block; font-size: 26rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cd-col-meta { display: block; font-size: 22rpx; color: #999; margin-top: 8rpx; }
/* 专栏网格 */
.cd-col-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; }
.cd-col-card { background: var(--card, #fff); border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.cd-col-card-img { width: 100%; height: 192rpx; }
/* 文章列表 */
.cd-post-list { display: flex; flex-direction: column; gap: 24rpx; }
.cd-article { display: flex; gap: 24rpx; background: var(--card, #fff); border-radius: 24rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.cd-article-cover { width: 192rpx; height: 192rpx; border-radius: 16rpx; flex-shrink: 0; background: #F5F0E8; }
.cd-article-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.cd-article-title-row { display: flex; align-items: flex-start; gap: 12rpx; }
.cd-article-feat { margin-top: 4rpx; flex-shrink: 0; font-size: 20rpx; padding: 2rpx 12rpx; background: rgba(196,30,58,0.1); color: var(--brand, #C41E3A); border-radius: 6rpx; }
.cd-article-title { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); line-height: 1.4; }
.cd-article-meta { margin-top: auto; display: flex; align-items: center; gap: 24rpx; padding-top: 16rpx; }
.cd-article-stat { display: flex; align-items: center; gap: 6rpx; }
.cd-article-meta-txt { font-size: 22rpx; color: #999; }
/* 成员 */
.cd-member-list { display: flex; flex-direction: column; gap: 16rpx; }
.cd-member { display: flex; align-items: center; gap: 24rpx; background: var(--card, #fff); border-radius: 24rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.cd-member-avatar { width: 88rpx; height: 88rpx; border-radius: 999rpx; }
.cd-member-main { flex: 1; min-width: 0; }
.cd-member-name-row { display: flex; align-items: center; gap: 16rpx; }
.cd-member-name { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cd-role { display: flex; align-items: center; gap: 4rpx; padding: 2rpx 12rpx; border-radius: 6rpx; }
.cd-role.owner { background: rgba(201,169,110,0.1); }
.cd-role.admin { background: rgba(74,144,217,0.1); }
.cd-role-txt { font-size: 20rpx; }
.cd-role-txt.owner { color: #C9A96E; }
.cd-role-txt.admin { color: #4A90D9; }
.cd-member-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 4rpx; }
.cd-member-meta-txt { font-size: 22rpx; color: #999; }
/* 空态 */
.cd-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 128rpx 0; gap: 24rpx; }
.cd-empty-txt { font-size: 28rpx; color: #999; }
/* 底部操作栏 */
.cd-foot { position: fixed; bottom: 0; left: 0; right: 0; background: var(--card, #fff); border-top: 2rpx solid #E8E3DB; padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 24rpx; z-index: 50; }
.cd-join { flex: 1; padding: 24rpx 0; border-radius: 999rpx; text-align: center; background: linear-gradient(to right, #C41E3A, #E74C3C); box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); }
.cd-join.joined { background: #F5F0E8; box-shadow: none; }
.cd-join-txt { font-size: 28rpx; font-weight: 500; color: #fff; }
.cd-join-txt.joined { color: #666; }
.cd-post-btn { flex: 1; padding: 24rpx 0; border-radius: 999rpx; background: linear-gradient(to right, #C41E3A, #E74C3C); box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.cd-post-btn-txt { font-size: 28rpx; font-weight: 500; color: #fff; }
/* 会员弹窗 */
.cd-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.cd-sheet { width: 100%; background: var(--card, #fff); border-radius: 48rpx 48rpx 0 0; overflow: hidden; }
.cd-sheet-body { padding: 48rpx; }
.cd-sheet-head { text-align: center; margin-bottom: 48rpx; }
.cd-sheet-icon { width: 128rpx; height: 128rpx; margin: 0 auto 24rpx; border-radius: 999rpx; background: linear-gradient(135deg, #C9A96E, #E8D5B5); display: flex; align-items: center; justify-content: center; }
.cd-sheet-title { display: block; font-size: 36rpx; font-weight: 700; color: var(--text-ink, #2C2C2C); }
.cd-sheet-sub { display: block; font-size: 28rpx; color: #999; margin-top: 8rpx; }
.cd-benefits { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; margin-bottom: 48rpx; }
.cd-benefit { background: #FAF8F5; border-radius: 24rpx; padding: 24rpx; display: flex; align-items: flex-start; gap: 16rpx; }
.cd-benefit-icon { width: 64rpx; height: 64rpx; border-radius: 16rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cd-benefit-title { display: block; font-size: 26rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cd-benefit-desc { display: block; font-size: 22rpx; color: #999; }
.cd-sheet-actions { display: flex; gap: 24rpx; }
.cd-sheet-btn { flex: 1; padding: 24rpx 0; border-radius: 999rpx; text-align: center; }
.cd-sheet-btn.cancel { background: #F5F0E8; }
.cd-sheet-btn.confirm { background: linear-gradient(to right, #C41E3A, #E74C3C); }
.cd-sheet-btn-txt { font-size: 28rpx; font-weight: 500; }
.cd-sheet-btn-txt.cancel { color: #666; }
.cd-sheet-btn-txt.confirm { color: #fff; }
/* 骨架 */
.cd-skeleton { min-height: 100vh; background: var(--bg-paper, #FAF8F5); }
.sk-cover { height: 384rpx; background: #E8E3DB; }
.sk-info { padding: 0 32rpx; margin-top: -96rpx; }
.sk-card { height: 280rpx; background: #fff; border-radius: 32rpx; }
</style>
