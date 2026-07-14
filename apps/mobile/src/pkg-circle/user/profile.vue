<script setup lang="ts">
/**
 * 用户主页 — V0 circle-profile.html + circle-profile-relations.html 还原（2026-07-10）
 * 结构：封面(渐变兜底)+返回/分享/更多 → 身份区(-34px 上叠头像+金色认证徽章+昵称+头衔徽章+bio)
 *       → 统计横排(关注/粉丝/获赞) → 操作按钮区(四关系态) → sticky 内容Tab → 内容卡/空态
 * 四关系态（本页灵魂，按真实数据分支）：
 *   ① isSelf                          → 单钮 btn-outline「编辑资料」
 *   ② canDM 且无付费咨询               → 「发私信」btn-primary +「已关注/关注」btn-outline
 *   ③ canDM 且 hasConsult             → 「发私信」btn-primary +「付费咨询 X金币起」btn-gold
 *      （取舍说明：以 V0 ③ 双按钮为准，关注/已关注收进次要位置=统计行右侧小胶囊按钮）
 *   ③' 陌生但 hasConsult（策略B补充态）→ 「关注」btn-primary +「付费咨询」btn-gold + relation-note
 *   ④ 陌生人(!canDM && !hasConsult)   → 「关注」btn-primary 单钮 + relation-note 灰字说明
 *      （V0 明确：不做可点的灰按钮，原 up-btn--locked 已删）
 * 降级（后端无字段，不渲染）：封面 coverImage(渐变兜底)/Lv.等级行/圈内身份行/已答数/好评率/内容卡「来自圈子名」
 * 内容列表走 getPosts（诚实降级恒空 → 空态），卡片结构已按 V0 .item 写好等后端聚合端点接入。
 * query: id
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo, toastComingSoon } from '@/utils/router'
import {
  userProfileApi,
  formatCount,
  getContentUrl,
  getContentTypeName,
  type UserProfileResponse,
  type UserPostItem,
} from '@/lib/user-profile-data'
import { imApi, type ImRelation } from '@/lib/im-data'
import { consultApi, type UserConsultService } from '@/lib/circle-consult-data'

/** 真实用户 id（uuid string），来源 query.id */
const userIdStr = ref('')
const profile = ref<UserProfileResponse | null>(null)

// ── 私信关系 + 付费咨询（策略B：陌生人隐藏私信入口）──
const relation = ref<ImRelation | ''>('')
/** 能否私信：圈友/付费/互关/单向关注均可（关注后即时态不刷新，保持现状） */
const canDM = ref(false)
const consultServices = ref<UserConsultService[]>([])
/** 可发起图文付费咨询的服务（需提问价>0） */
const consultable = computed(() => consultServices.value.filter((s) => s.questionPrice > 0))
const hasConsult = computed(() => consultable.value.length > 0)
/** 付费咨询最低价（金币）：consultable 中 questionPrice 最小值（真实字段，不写死） */
const minConsultPrice = computed(() =>
  consultable.value.length ? Math.min(...consultable.value.map((s) => s.questionPrice)) : 0,
)
const posts = ref<UserPostItem[]>([])
const loading = ref(true)
const error = ref('')
const postsLoading = ref(false)
const postsError = ref('')
const activeTab = ref<'all' | 'posts' | 'articles' | 'videos'>('all')
const followLoading = ref(false)
const showMoreMenu = ref(false)

const contentTabs = [
  { id: 'all', label: '动态' },
  { id: 'posts', label: '帖子' },
  { id: 'articles', label: '文章' },
  { id: 'videos', label: '短视频' },
] as const

const filteredPosts = computed(() => {
  if (activeTab.value === 'all') return posts.value
  const map: Record<string, string> = { posts: 'post', articles: 'article', videos: 'video' }
  const target = map[activeTab.value]
  return posts.value.filter((p) => p.type === target)
})

/** 当前 Tab 中文名（空态标题用） */
const activeTabLabel = computed(
  () => contentTabs.find((t) => t.id === activeTab.value)?.label || '内容',
)

/** 内容卡 1:1 三图网格数据：帖子取 images 前3张，文章/视频取封面（无则不渲染网格） */
function itemImages(item: UserPostItem): string[] {
  if (item.type === 'post') return (item.images || []).slice(0, 3)
  return item.cover ? [item.cover] : []
}

onLoad((q) => {
  if (q?.id) {
    userIdStr.value = String(q.id)
  }
  loadProfile()
  loadRelationAndConsult()
})

// 加载私信关系 + 付费咨询服务（独立于资料展示，失败保守降级，不阻塞页面）
async function loadRelationAndConsult() {
  if (!userIdStr.value) return
  try {
    const p = await imApi.getRelationPolicy(userIdStr.value)
    relation.value = p.relation
    // IM 私信暂未开放（待腾讯 TIM 打通）：董事长拍板全平台暂时隐藏发私信入口，避免用户进入收发不了的私信流。
    // TIM 集成完成后恢复下行原判定即可。付费咨询/关注不受影响。
    canDM.value = false
  } catch {
    // 拿不到关系：保守按"不可私信"处理（策略B 下隐藏私信入口）
    canDM.value = false
  }
  consultServices.value = await consultApi.getUserConsultServices(userIdStr.value)
}

async function loadProfile() {
  loading.value = true
  error.value = ''
  try {
    const res = await userProfileApi.getProfile(userIdStr.value)
    if (res.code === 200 && res.data) {
      profile.value = res.data
      loadPosts()
    } else {
      error.value = res.message || '获取用户信息失败'
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

async function loadPosts() {
  postsLoading.value = true
  postsError.value = ''
  try {
    const res = await userProfileApi.getPosts(userIdStr.value, 'all')
    if (res.code === 200 && res.data) {
      posts.value = res.data.list
    } else {
      postsError.value = res.message || '加载内容失败'
    }
  } catch (e) {
    postsError.value = (e as Error)?.message || '加载内容失败，请重试'
  } finally {
    postsLoading.value = false
  }
}

// 关注/取关 — 乐观更新（followLoading 防重复）
async function handleFollow() {
  if (!profile.value || followLoading.value) return
  followLoading.value = true
  const wasFollowing = profile.value.isFollowing
  profile.value = {
    ...profile.value,
    isFollowing: !wasFollowing,
    stats: {
      ...profile.value.stats,
      followerCount: profile.value.stats.followerCount + (wasFollowing ? -1 : 1),
    },
  }
  try {
    const res = wasFollowing
      ? await userProfileApi.unfollow(userIdStr.value)
      : await userProfileApi.follow(userIdStr.value)
    if (res.code === 200) {
      uni.showToast({ title: wasFollowing ? '已取消关注' : '关注成功', icon: 'none' })
      if (!wasFollowing && 'isMutualFollow' in res.data && res.data.isMutualFollow && profile.value) {
        profile.value = { ...profile.value, isMutualFollow: true }
      }
    } else if (profile.value) {
      profile.value = {
        ...profile.value,
        isFollowing: wasFollowing,
        stats: {
          ...profile.value.stats,
          followerCount: profile.value.stats.followerCount + (wasFollowing ? 1 : -1),
        },
      }
      uni.showToast({ title: '操作失败', icon: 'none' })
    }
  } finally {
    followLoading.value = false
  }
}

function handleShare() {
  uni.showToast({ title: '链接已复制', icon: 'none' })
}

function goChat() {
  navigateTo(`/pkg-im/im/chat/index?id=${userIdStr.value}`)
}

/** 编辑资料（①自己态）：主包已有路由 /pages/profile/edit */
function goEditProfile() {
  navigateTo('/pages/profile/edit')
}

// 付费咨询：走图文付费提问（consult-ask）。多圈子开通时让用户选圈子
function goConsult() {
  const svcs = consultable.value
  if (svcs.length === 0) {
    uni.showToast({ title: '暂无可用咨询服务', icon: 'none' })
    return
  }
  const go = (s: UserConsultService) =>
    navigateTo(
      `/pkg-circle/circles/consult-ask?circleId=${s.circleId}&answererId=${userIdStr.value}&priceCoin=${s.questionPrice}&peekPriceCoin=${s.peekPrice}&expertName=${encodeURIComponent(s.expertName)}`,
    )
  if (svcs.length === 1) {
    go(svcs[0])
    return
  }
  uni.showActionSheet({
    itemList: svcs.map((s) => `${s.circleName}（${s.questionPrice}金币/次）`),
    success: (r) => go(svcs[r.tapIndex]),
  })
}

function openContent(item: UserPostItem) {
  navigateTo(getContentUrl(item))
}

function toggleMore() {
  showMoreMenu.value = !showMoreMenu.value
}

function avatarInitial(name?: string): string {
  return name ? name[0] : ''
}
</script>

<template>
  <view class="up-page">
    <!-- 骨架屏（三态保留，配色贴 token） -->
    <view v-if="loading" class="up-skeleton">
      <view class="up-skeleton-cover" />
      <view class="up-skeleton-avatar" />
      <view class="up-skeleton-lines">
        <view class="up-skeleton-line up-skeleton-line--short" />
        <view class="up-skeleton-line up-skeleton-line--long" />
        <view class="up-skeleton-line up-skeleton-line--med" />
      </view>
    </view>

    <!-- 错误态 + 重试 -->
    <view v-else-if="error" class="up-error">
      <text class="up-error-text">{{ error }}</text>
      <view class="up-retry-btn" @tap="loadProfile">
        <text class="up-retry-txt">重试</text>
      </view>
    </view>

    <template v-else>
      <!-- ============ 封面（coverImage 后端无字段 → 渐变兜底保留） ============ -->
      <view class="up-cover">
        <view
          class="up-cover-bg"
          :style="profile?.profile.coverImage ? { backgroundImage: `url(${profile.profile.coverImage})` } : {}"
        />
        <!-- 顶部渐变压暗（V0 .cover::after） -->
        <view class="up-cover-shade" />
        <!-- 左上圆形半透明返回钮 + 右上分享/更多（举报/拉黑 toastComingSoon 保留） -->
        <view class="up-nav">
          <view class="up-nav-btn" @tap="goBack">
            <app-icon name="arrow-left" :size="32" color="#ffffff" />
          </view>
          <view class="up-nav-right">
            <view class="up-nav-btn" @tap="handleShare">
              <app-icon name="share-2" :size="30" color="#ffffff" />
            </view>
            <view class="up-nav-more">
              <view class="up-nav-btn" @tap="toggleMore">
                <app-icon name="more-horizontal" :size="32" color="#ffffff" />
              </view>
              <template v-if="showMoreMenu">
                <view class="up-mask" @tap="showMoreMenu = false" />
                <view class="up-menu">
                  <view class="up-menu-item" @tap="() => { showMoreMenu = false; toastComingSoon() }">
                    <text class="up-menu-txt">举报</text>
                  </view>
                  <view class="up-menu-item" @tap="() => { showMoreMenu = false; toastComingSoon() }">
                    <text class="up-menu-txt up-menu-txt--danger">拉黑</text>
                  </view>
                </view>
              </template>
            </view>
          </view>
        </view>
      </view>

      <!-- ============ 身份区（-34px 上叠） ============ -->
      <view v-if="profile" class="up-identity">
        <view class="up-avatar-wrap">
          <image
            v-if="profile.profile.avatar"
            lazy-load
            class="up-avatar"
            :src="profile.profile.avatar"
            mode="aspectFill"
          />
          <view v-else class="up-avatar up-avatar--fallback">
            <text class="up-avatar-initial">{{ avatarInitial(profile.profile.nickname) }}</text>
          </view>
          <!-- 右下金色认证徽章 -->
          <view v-if="profile.profile.verified" class="up-verify-badge">
            <app-icon name="check" :size="22" color="#ffffff" />
          </view>
        </view>

        <!-- 昵称 + 认证头衔徽章（V0 title-badge：金色细描边金字） -->
        <view class="up-name-row">
          <text class="up-name">{{ profile.profile.nickname }}</text>
          <view v-if="profile.profile.verified && profile.profile.verifiedTitle" class="up-title-badge">
            <text class="up-title-badge-txt">认证 · {{ profile.profile.verifiedTitle }}</text>
          </view>
        </view>

        <!-- 简介一行段落 -->
        <text v-if="profile.profile.bio" class="up-bio">{{ profile.profile.bio }}</text>
        <!-- 「Lv.x · 某圈子 合伙人」行：level/levelName 后端无、圈内身份无字段 → 整行降级不渲染 -->

        <!-- 统计横排（V0 .stats：数字粗体+灰 label）；③态时关注按钮收进本行右侧小胶囊 -->
        <view class="up-stats">
          <view class="up-stat">
            <text class="up-stat-num">{{ formatCount(profile.stats.followingCount) }}</text>
            <text class="up-stat-label">关注</text>
          </view>
          <view class="up-stat">
            <text class="up-stat-num">{{ formatCount(profile.stats.followerCount) }}</text>
            <text class="up-stat-label">粉丝</text>
          </view>
          <view class="up-stat">
            <text class="up-stat-num">{{ formatCount(profile.stats.likeCount) }}</text>
            <text class="up-stat-label">获赞</text>
          </view>
          <!-- ③态取舍：以 V0 ③ 双按钮（发私信+付费咨询）为准，关注/已关注移到统计行右侧次要位置 -->
          <view v-if="!profile.isSelf && canDM && hasConsult" class="up-stats-spacer" />
          <view
            v-if="!profile.isSelf && canDM && hasConsult"
            class="up-follow-pill"
            :class="{ 'up-follow-pill--on': profile.isFollowing }"
            @tap="handleFollow"
          >
            <text class="up-follow-pill-txt" :class="{ 'up-follow-pill-txt--on': profile.isFollowing }">
              {{ profile.isFollowing ? '已关注' : '＋ 关注' }}
            </text>
          </view>
        </view>
      </view>

      <!-- ============ 操作按钮区（四关系态·本页灵魂） ============ -->
      <view v-if="profile" class="up-actions-area">
        <!-- ① 自己：仅编辑入口（弱样式单钮） -->
        <view v-if="profile.isSelf" class="up-actions">
          <view class="up-btn up-btn-outline" @tap="goEditProfile">
            <text class="up-btn-txt">编辑资料</text>
          </view>
        </view>

        <!-- ③ 可私信 + 有付费咨询：发私信(朱红) + 付费咨询(金描边·价格明码=最低提问价) -->
        <view v-else-if="canDM && hasConsult" class="up-actions">
          <view class="up-btn up-btn-primary" @tap="goChat">
            <text class="up-btn-txt up-btn-txt--primary">发私信</text>
          </view>
          <view class="up-btn up-btn-gold" @tap="goConsult">
            <text class="up-btn-txt">付费咨询 </text>
            <text class="up-btn-txt up-btn-txt--gold">{{ minConsultPrice }} 金币起</text>
          </view>
        </view>

        <!-- ② 可私信（互关/已关注/圈内/付费关系）：发私信 + 已关注/关注 -->
        <view v-else-if="canDM" class="up-actions">
          <view class="up-btn up-btn-primary" @tap="goChat">
            <text class="up-btn-txt up-btn-txt--primary">发私信</text>
          </view>
          <view class="up-btn up-btn-outline" @tap="handleFollow">
            <text class="up-btn-txt">{{ profile.isFollowing ? '已关注' : '关注' }}</text>
          </view>
        </view>

        <!-- ③' 陌生但开通付费咨询（策略B：隐藏私信，付费咨询价格明码） -->
        <template v-else-if="hasConsult">
          <view class="up-actions">
            <view class="up-btn up-btn-primary" @tap="handleFollow">
              <text class="up-btn-txt up-btn-txt--primary">{{ profile.isFollowing ? '已关注' : '关注' }}</text>
            </view>
            <view class="up-btn up-btn-gold" @tap="goConsult">
              <text class="up-btn-txt">付费咨询 </text>
              <text class="up-btn-txt up-btn-txt--gold">{{ minConsultPrice }} 金币起</text>
            </view>
          </view>
          <text class="up-relation-note">关注后可发私信；成为同圈成员或建立付费关系也可解锁私信</text>
        </template>

        <!-- ④ 陌生人：先关注（主钮），不做可点的灰按钮，灰字说明解锁路径 -->
        <template v-else>
          <view class="up-actions">
            <view class="up-btn up-btn-primary" @tap="handleFollow">
              <text class="up-btn-txt up-btn-txt--primary">{{ profile.isFollowing ? '已关注' : '关注' }}</text>
            </view>
          </view>
          <text class="up-relation-note">关注后可发私信；成为同圈成员或建立付费关系也可解锁私信</text>
        </template>
      </view>

      <!-- ============ 内容 Tab（sticky·暖底半透明+blur·选中加粗+朱红下划线） ============ -->
      <view class="up-tabs">
        <view
          v-for="tab in contentTabs"
          :key="tab.id"
          class="up-tab"
          :class="{ 'up-tab--active': activeTab === tab.id }"
          @tap="activeTab = tab.id"
        >
          <text class="up-tab-txt" :class="{ 'up-tab-txt--active': activeTab === tab.id }">{{ tab.label }}</text>
        </view>
      </view>

      <!-- ============ 内容列表 ============ -->
      <view class="up-content">
        <!-- 加载中 -->
        <view v-if="postsLoading" class="up-empty">
          <text class="up-empty-desc">加载中…</text>
        </view>
        <!-- 内容错误 + 重试 -->
        <view v-else-if="postsError" class="up-empty">
          <text class="up-empty-desc">{{ postsError }}</text>
          <view class="up-retry-btn" @tap="loadPosts">
            <text class="up-retry-txt">重试</text>
          </view>
        </view>
        <!-- 空态（V0 relations 稿「附」：圆暖底图标 + 主副文案；自己主页副文案改引导发布） -->
        <view v-else-if="filteredPosts.length === 0" class="up-empty">
          <view class="up-empty-icon">
            <app-icon name="file-text" :size="44" color="#999999" />
          </view>
          <text class="up-empty-title">还没有发布过{{ activeTabLabel }}</text>
          <text class="up-empty-desc">
            {{ profile?.isSelf ? '快去发布第一条内容吧' : 'TA 的其他内容可以切换上方标签查看' }}
          </text>
        </view>

        <!-- V0 .item 白卡：类型细描边小徽章 + 标题/正文 clamp + 三图 1:1 网格 + meta 行 -->
        <!-- （当前 getPosts 诚实降级恒空 → 走上方空态；卡片结构写好等后端「按用户聚合内容」端点接入） -->
        <template v-else>
          <view v-for="item in filteredPosts" :key="item.id" class="up-item" @tap="openContent(item)">
            <view class="up-item-type">
              <text class="up-item-type-txt">{{ getContentTypeName(item.type) }}</text>
            </view>
            <text v-if="item.title" class="up-item-title">{{ item.title }}</text>
            <text v-if="item.content" class="up-item-text">{{ item.content }}</text>
            <view v-if="itemImages(item).length" class="up-item-media">
              <view v-for="(img, idx) in itemImages(item)" :key="idx" class="up-item-media-cell">
                <image lazy-load class="up-item-media-img" :src="img" mode="aspectFill" />
              </view>
            </view>
            <!-- meta 行：「来自圈子名」后端 UserPostItem 无字段 → 不渲染 -->
            <view class="up-item-meta">
              <text class="up-item-meta-txt">{{ item.createdAt }}</text>
              <text class="up-item-meta-txt" :class="{ 'up-item-meta-txt--liked': item.isLiked }">赞 {{ item.likeCount }}</text>
              <text class="up-item-meta-txt">评论 {{ item.commentCount }}</text>
            </view>
          </view>
        </template>
      </view>
    </template>
  </view>
</template>

<style scoped>
/* ============ 页面（设计 token 见 V0 稿 :root） ============ */
.up-page {
  min-height: 100vh;
  background: var(--bg-page, #faf8f5);
  padding-bottom: 64rpx;
}

/* ============ 封面 148px→296rpx ============ */
.up-cover {
  position: relative;
  height: 296rpx;
}
.up-cover-bg {
  position: absolute;
  inset: 0;
  /* coverImage 后端无字段 → 品牌渐变兜底 */
  background-color: var(--gold, #c9a96e);
  background-image: linear-gradient(135deg, rgba(196, 30, 58, 0.3), rgba(201, 169, 110, 0.25), #e8e0d5);
  background-size: cover;
  background-position: center;
}
/* 顶部渐变压暗（V0 .cover::after） */
.up-cover-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(44, 44, 44, 0.18), transparent 55%);
}
.up-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  padding-top: calc(28rpx + var(--status-bar-height, 0px));
}
.up-nav-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
/* 圆形半透明按钮（V0 .back-btn 32px→64rpx） */
.up-nav-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(44, 44, 44, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
}
.up-nav-more {
  position: relative;
}
.up-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
}
.up-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 12rpx);
  width: 200rpx;
  background: var(--bg-card, #ffffff);
  border-radius: var(--radius-md, 28rpx);
  box-shadow: 0 8rpx 32rpx rgba(44, 44, 44, 0.12);
  padding: 8rpx 0;
  z-index: 50;
}
.up-menu-item {
  padding: 20rpx 28rpx;
}
.up-menu-txt {
  font-size: 28rpx;
  color: var(--text-primary, #2c2c2c);
}
.up-menu-txt--danger {
  color: #dc2626;
}

/* ============ 身份区（-34px→-68rpx 上叠） ============ */
.up-identity {
  padding: 0 40rpx;
  margin-top: -68rpx;
  position: relative;
}
.up-avatar-wrap {
  position: relative;
  width: 152rpx;
}
/* 头像 76px→152rpx，bg-page 描边 3px→6rpx */
.up-avatar {
  width: 152rpx;
  height: 152rpx;
  border-radius: 50%;
  border: 6rpx solid var(--bg-page, #faf8f5);
  background: var(--bg-warm, #f8f4ec);
  display: block;
}
.up-avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}
.up-avatar-initial {
  font-size: 52rpx;
  color: var(--brand, #c41e3a);
  font-weight: 600;
}
/* 金色认证徽章 22px→44rpx（V0 .verify-badge） */
.up-verify-badge {
  position: absolute;
  right: -2rpx;
  bottom: 2rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: var(--gold, #c9a96e);
  border: 4rpx solid var(--bg-page, #faf8f5);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 昵称 20px→40rpx 粗体 + 头衔徽章 */
.up-name-row {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-wrap: wrap;
}
.up-name {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--text-primary, #2c2c2c);
}
/* V0 title-badge：金色细描边金字（替换原红底样式） */
.up-title-badge {
  padding: 4rpx 16rpx;
  border-radius: 12rpx;
  border: 1rpx solid var(--gold, #c9a96e);
}
.up-title-badge-txt {
  font-size: 22rpx;
  font-weight: 500;
  color: var(--gold, #c9a96e);
}
/* 简介 13px→26rpx */
.up-bio {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: var(--text-secondary, #6e6e73);
  line-height: 1.6;
}

/* 统计横排（V0 .stats：gap 26px→52rpx，数字粗体 16px→32rpx，label 灰 12px→24rpx） */
.up-stats {
  display: flex;
  align-items: center;
  gap: 52rpx;
  margin-top: 28rpx;
}
.up-stat {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
}
.up-stat-num {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-primary, #2c2c2c);
}
.up-stat-label {
  font-size: 24rpx;
  color: var(--text-tertiary, #999999);
}
.up-stats-spacer {
  flex: 1;
}
/* ③态关注小胶囊（次要位置·统计行右侧） */
.up-follow-pill {
  padding: 8rpx 28rpx;
  border-radius: 999rpx;
  background: var(--brand, #c41e3a);
}
.up-follow-pill--on {
  background: var(--bg-card, #ffffff);
  box-shadow: inset 0 0 0 1rpx var(--separator, #ede7dd);
}
.up-follow-pill-txt {
  font-size: 24rpx;
  font-weight: 500;
  color: #ffffff;
}
.up-follow-pill-txt--on {
  color: var(--text-tertiary, #999999);
}

/* ============ 操作按钮区（V0 .actions：padding 16px 20px 0 / gap 10px / 高 42px 圆角 21px） ============ */
.up-actions-area {
  padding: 32rpx 40rpx 0;
}
.up-actions {
  display: flex;
  gap: 20rpx;
}
.up-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.up-btn:active {
  opacity: 0.88;
}
/* 朱红实底主按钮 */
.up-btn-primary {
  background: var(--brand, #c41e3a);
}
/* 白底细描边弱按钮 */
.up-btn-outline {
  background: var(--bg-card, #ffffff);
  box-shadow: inset 0 0 0 1rpx var(--separator, #ede7dd);
}
/* 白底金描边（付费咨询·价格金字明码） */
.up-btn-gold {
  background: var(--bg-card, #ffffff);
  box-shadow: inset 0 0 0 1rpx var(--gold, #c9a96e);
}
.up-btn-txt {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-primary, #2c2c2c);
}
.up-btn-txt--primary {
  color: #ffffff;
  font-weight: 600;
  font-size: 30rpx;
}
.up-btn-txt--gold {
  color: var(--gold, #c9a96e);
  font-weight: 600;
}
/* 关系说明灰字（V0 relation-note 11px→22rpx，不做可点灰按钮） */
.up-relation-note {
  display: block;
  margin-top: 16rpx;
  font-size: 22rpx;
  color: var(--text-tertiary, #999999);
  line-height: 1.6;
  text-align: center;
}

/* ============ 内容 Tab（sticky·V0 .tabs） ============ */
.up-tabs {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  gap: 48rpx;
  padding: 36rpx 40rpx 0;
  margin-top: 8rpx;
  background: rgba(250, 248, 245, 0.92);
  backdrop-filter: blur(24rpx);
  -webkit-backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.up-tab {
  padding-bottom: 20rpx;
  border-bottom: 4rpx solid transparent;
}
/* 选中：text-primary 加粗 + 2px→4rpx 朱红下划线 */
.up-tab--active {
  border-bottom-color: var(--brand, #c41e3a);
}
.up-tab-txt {
  font-size: 30rpx;
  color: var(--text-secondary, #6e6e73);
}
.up-tab-txt--active {
  color: var(--text-primary, #2c2c2c);
  font-weight: 600;
}

/* ============ 内容列表（V0 .item 白卡） ============ */
.up-content {
  padding-bottom: 8rpx;
}
.up-item {
  margin: 24rpx 32rpx 0;
  padding: 32rpx 36rpx;
  background: var(--bg-card, #ffffff);
  border-radius: var(--radius-lg, 36rpx);
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
/* 类型细描边小徽章（V0 .item-type 10px→20rpx） */
.up-item-type {
  display: inline-flex;
  padding: 2rpx 14rpx;
  border-radius: 10rpx;
  border: 1rpx solid var(--separator, #ede7dd);
}
.up-item-type-txt {
  font-size: 20rpx;
  line-height: 1.6;
  color: var(--text-tertiary, #999999);
}
.up-item-title {
  display: block;
  margin-top: 16rpx;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 1.55;
  color: var(--text-primary, #2c2c2c);
}
.up-item-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 12rpx;
  font-size: 27rpx;
  line-height: 1.7;
  color: var(--text-secondary, #6e6e73);
}
/* 三图 1:1 网格（V0 .item-media：gap 8px→16rpx） */
.up-item-media {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}
.up-item-media-cell {
  width: calc(33.33% - 11rpx);
  aspect-ratio: 1;
  border-radius: var(--radius-sm, 16rpx);
  overflow: hidden;
  background: var(--bg-warm, #f8f4ec);
}
.up-item-media-img {
  width: 100%;
  height: 100%;
  display: block;
}
/* meta 行（V0 .item-meta 11px→22rpx） */
.up-item-meta {
  display: flex;
  align-items: center;
  gap: 28rpx;
  margin-top: 20rpx;
}
.up-item-meta-txt {
  font-size: 22rpx;
  color: var(--text-tertiary, #999999);
}
.up-item-meta-txt--liked {
  color: var(--brand, #c41e3a);
}

/* ============ 空态（V0 relations 稿「附」：白卡+圆暖底图标+主副文案） ============ */
.up-empty {
  margin: 24rpx 32rpx 0;
  padding: 72rpx 40rpx;
  background: var(--bg-card, #ffffff);
  border-radius: var(--radius-lg, 36rpx);
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.up-empty-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: var(--bg-warm, #f8f4ec);
  display: flex;
  align-items: center;
  justify-content: center;
}
.up-empty-title {
  margin-top: 24rpx;
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-primary, #2c2c2c);
}
.up-empty-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--text-tertiary, #999999);
  line-height: 1.6;
  text-align: center;
}

/* ============ 三态：骨架屏 / 错误态（保留·配色贴 token） ============ */
.up-skeleton-cover {
  height: 296rpx;
  background: linear-gradient(90deg, #ede7dd 25%, #e3dccd 50%, #ede7dd 75%);
  background-size: 200% 100%;
  animation: up-shimmer 1.5s infinite;
}
.up-skeleton-avatar {
  width: 152rpx;
  height: 152rpx;
  border-radius: 50%;
  background: linear-gradient(90deg, #ede7dd 25%, #e3dccd 50%, #ede7dd 75%);
  background-size: 200% 100%;
  animation: up-shimmer 1.5s infinite;
  margin: -68rpx 0 0 40rpx;
}
.up-skeleton-lines {
  padding: 40rpx 40rpx 0;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.up-skeleton-line {
  height: 32rpx;
  border-radius: var(--radius-sm, 16rpx);
  background: linear-gradient(90deg, #ede7dd 25%, #e3dccd 50%, #ede7dd 75%);
  background-size: 200% 100%;
  animation: up-shimmer 1.5s infinite;
}
.up-skeleton-line--short { width: 40%; }
.up-skeleton-line--long { width: 80%; }
.up-skeleton-line--med { width: 60%; }
@keyframes up-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.up-error {
  padding: 200rpx 64rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
}
.up-error-text {
  font-size: 28rpx;
  color: var(--text-secondary, #6e6e73);
  text-align: center;
}
.up-retry-btn {
  padding: 16rpx 48rpx;
  border-radius: 999rpx;
  border: 1rpx solid var(--brand, #c41e3a);
  margin-top: 8rpx;
}
.up-retry-txt {
  font-size: 28rpx;
  color: var(--brand, #c41e3a);
}
</style>
