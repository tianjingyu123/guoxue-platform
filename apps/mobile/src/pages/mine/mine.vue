<template>
  <view class="page">
    <!-- ==================== 未登录 ==================== -->
    <view v-if="!userStore.isLogin" class="unlogin-page">
      <!-- 用户卡片区域（引导登录） -->
      <view class="user-card unlogin">
        <view class="unlogin-avatar">👤</view>
        <text class="unlogin-title">国学传统文化平台</text>
        <text class="unlogin-subtitle">登录后体验完整国学之旅</text>
        <button class="login-btn" @click="showLogin = true">登录 / 注册</button>
      </view>

      <!-- 功能预览 -->
      <view class="feature-preview">
        <text class="fp-title">登录后可使用</text>
        <view class="fp-grid">
          <view class="fp-item">
            <text class="fp-icon">📖</text>
            <text class="fp-label">古籍阅读</text>
            <text class="fp-desc">记录阅读进度与书签</text>
          </view>
          <view class="fp-item">
            <text class="fp-icon">☯</text>
            <text class="fp-label">八字排盘</text>
            <text class="fp-desc">保存排盘与AI解读</text>
          </view>
          <view class="fp-item">
            <text class="fp-icon">⭐</text>
            <text class="fp-label">收藏内容</text>
            <text class="fp-desc">收藏喜欢的文章课程</text>
          </view>
          <view class="fp-item">
            <text class="fp-icon">💬</text>
            <text class="fp-label">社区互动</text>
            <text class="fp-desc">发帖评论与圈子交流</text>
          </view>
          <view class="fp-item">
            <text class="fp-icon">📚</text>
            <text class="fp-label">学习记录</text>
            <text class="fp-desc">跟踪课程学习进度</text>
          </view>
          <view class="fp-item">
            <text class="fp-icon">🛒</text>
            <text class="fp-label">文创商城</text>
            <text class="fp-desc">购买国学相关商品</text>
          </view>
        </view>
      </view>

      <!-- 底部登录入口 -->
      <view class="bottom-login" @click="showLogin = true">
        <text class="bottom-login-text">已有账号？立即登录</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <!-- ==================== 已登录：用户信息卡片 ==================== -->
    <view v-if="userStore.isLogin" class="user-card">
      <image
        class="avatar"
        :src="userStore.userAvatar || '/static/default-avatar.png'"
        mode="aspectFill"
      />
      <text class="nickname">{{ userStore.userNickname || '国学爱好者' }}</text>
      <text v-if="profile.signature" class="bio">{{ profile.signature }}</text>
      <view class="stats-row">
        <view class="stat-item" @click="goPage('/pages/user/user')">
          <text class="stat-num">{{ profile.followingCount ?? 0 }}</text>
          <text class="stat-label">关注</text>
        </view>
        <view class="stat-item" @click="goPage('/pages/user/user')">
          <text class="stat-num">{{ profile.followerCount ?? 0 }}</text>
          <text class="stat-label">粉丝</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ profile.likeCount ?? 0 }}</text>
          <text class="stat-label">获赞</text>
        </view>
      </view>
    </view>

    <!-- ==================== 会员信息卡片 ==================== -->
    <view v-if="userStore.isLogin" class="vip-card">
      <view class="vip-left">
        <text class="vip-label" :class="{ active: userStore.isVip }">
          {{ userStore.isVip ? 'VIP会员' : '普通用户' }}
        </text>
        <text v-if="userStore.isVip && userStore.user?.vipExpireAt" class="vip-expire">
          到期时间：{{ formatDate(userStore.user.vipExpireAt) }}
        </text>
        <text v-else class="vip-expire">开通会员解锁更多内容</text>
      </view>
      <view v-if="!userStore.isVip" class="vip-right">
        <text class="vip-upgrade" @click="goVip">开通</text>
      </view>
    </view>

    <!-- ==================== Tab 切换 ==================== -->
    <view v-if="userStore.isLogin" class="tab-bar">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: currentTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- ==================== Tab 内容区域 ==================== -->
    <view v-if="userStore.isLogin" class="content-area">
      <!-- ====== 动态列表 ====== -->
      <template v-if="currentTab === 'posts'">
        <LoadingSkeleton v-if="loadingPosts && posts.length === 0" type="list" />
        <view v-else-if="posts.length > 0" class="post-list">
          <view v-for="post in posts" :key="post.id" class="post-card">
            <view class="post-header">
              <view class="post-user-info">
                <image
                  v-if="post.author?.avatar"
                  :src="post.author.avatar"
                  class="post-avatar"
                  mode="aspectFill"
                />
                <view class="post-user-meta">
                  <text class="post-user">{{ post.author?.nickname || '匿名' }}</text>
                  <text class="post-time">{{ formatTime(post.createdAt) }}</text>
                </view>
              </view>
              <view class="post-badges">
                <text v-if="post.isEssence" class="badge essence">精华</text>
              </view>
            </view>
            <text v-if="post.title" class="post-title">{{ post.title }}</text>
            <text class="post-body">{{ post.content }}</text>
            <view v-if="post.images?.length" class="post-images">
              <image
                v-for="(img, idx) in post.images"
                :key="idx"
                :src="img"
                mode="aspectFill"
                class="post-img"
                @click="previewImages(post.images, idx)"
              />
            </view>
            <view class="post-footer">
              <view class="footer-item">
                <text>❤️</text>
                <text class="footer-count">{{ post.likeCount || 0 }}</text>
              </view>
              <view class="footer-item">
                <text>💬</text>
                <text class="footer-count">{{ post.commentCount || 0 }}</text>
              </view>
            </view>
          </view>
        </view>
        <EmptyState v-else icon="📝" text="暂无动态" />
      </template>

      <!-- ====== 文章列表 ====== -->
      <template v-if="currentTab === 'articles'">
        <LoadingSkeleton v-if="loadingArticles && articles.length === 0" type="list" />
        <view v-else-if="articles.length > 0" class="article-list">
          <view
            v-for="article in articles"
            :key="article.id"
            class="article-card"
            @click="goArticle(article.id)"
          >
            <image
              v-if="article.cover"
              :src="article.cover"
              class="article-cover"
              mode="aspectFill"
            />
            <view class="article-info">
              <text class="article-title">{{ article.title }}</text>
              <text class="article-summary">{{ article.summary || article.content?.slice(0, 80) || '' }}</text>
              <view class="article-meta">
                <text class="meta-item">❤️ {{ article.likeCount ?? 0 }}</text>
                <text class="meta-item">💬 {{ article.commentCount ?? 0 }}</text>
                <text class="meta-item time">{{ formatTime(article.createdAt) }}</text>
              </view>
            </view>
          </view>
        </view>
        <EmptyState v-else icon="📖" text="暂无文章" />
      </template>

      <!-- ====== 收藏列表 ====== -->
      <template v-if="currentTab === 'collects'">
        <LoadingSkeleton v-if="loadingCollects && collects.length === 0" type="list" />
        <view v-else-if="collects.length > 0" class="collect-list">
          <view
            v-for="item in collects"
            :key="item.id"
            class="collect-card"
            @click="goCollectTarget(item)"
          >
            <image
              v-if="item.cover"
              :src="item.cover"
              class="collect-cover"
              mode="aspectFill"
            />
            <view class="collect-info">
              <text class="collect-title">{{ item.title || '收藏内容' }}</text>
              <view class="collect-meta">
                <text class="meta-type">{{ collectTypeLabel(item.targetType) }}</text>
                <text class="meta-time">{{ formatTime(item.createdAt) }}</text>
              </view>
            </view>
          </view>
        </view>
        <EmptyState v-else icon="⭐" text="暂无收藏" />
      </template>

      <!-- 加载更多 -->
      <view v-if="loadingMore" class="load-more">加载中...</view>
      <view v-if="!hasMore && currentListLength > 0" class="no-more">— 已全部加载 —</view>
    </view>

    <!-- ==================== 功能菜单列表 ==================== -->
    <view v-if="userStore.isLogin" class="menu">
      <view class="menu-item" @click="goPage('/pages/favorites/favorites')">
        <text class="menu-icon">⭐</text>
        <text class="menu-label">我的收藏</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/articles/drafts')">
        <text class="menu-icon">📝</text>
        <text class="menu-label">我的草稿</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/courses/courses')">
        <text class="menu-icon">📚</text>
        <text class="menu-label">学习记录</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/orders/orders')">
        <text class="menu-icon">📦</text>
        <text class="menu-label">我的订单</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/shop/cart')">
        <text class="menu-icon">🛒</text>
        <text class="menu-label">购物车</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/shop/address-list')">
        <text class="menu-icon">📍</text>
        <text class="menu-label">收货地址</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/shop/my-after-sales')">
        <text class="menu-icon">🔄</text>
        <text class="menu-label">我的售后</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/circles/circles')">
        <text class="menu-icon">👥</text>
        <text class="menu-label">我的圈子</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/classics/classics')">
        <text class="menu-icon">📜</text>
        <text class="menu-label">阅读记录</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/bazi/bazi')">
        <text class="menu-icon">☯</text>
        <text class="menu-label">八字排盘</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/ziwei/ziwei')">
        <text class="menu-icon">🌟</text>
        <text class="menu-label">紫微斗数</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/wallet/wallet')">
        <text class="menu-icon">🪙</text>
        <text class="menu-label">我的钱包</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/competition/competition')">
        <text class="menu-icon">🏆</text>
        <text class="menu-label">我的赛事</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/shop/coupons')">
        <text class="menu-icon">🎫</text>
        <text class="menu-label">优惠券</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/station/earnings')">
        <text class="menu-icon">💰</text>
        <text class="menu-label">推广收益</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPage('/pages/notifications/notifications')">
        <text class="menu-icon">🔔</text>
        <text class="menu-label">消息通知</text>
        <text v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <!-- ==================== 角色管理入口（根据用户角色显示） ==================== -->
    <view v-if="userStore.isLogin && showAdminEntry" class="menu" style="margin-top: 12px;">
      <view class="menu-section-title">管理功能</view>
      <view v-if="isSuperAdmin || isOperationAdmin" class="menu-item" @click="goPage('/pages/mine/role-panels/admin-panel')">
        <text class="menu-icon">🛠️</text>
        <text class="menu-label">管理后台</text>
        <text class="arrow">›</text>
      </view>
      <view v-if="isStationMaster" class="menu-item" @click="goPage('/pages/mine/role-panels/station-master-panel')">
        <text class="menu-icon">🏪</text>
        <text class="menu-label">分站管理</text>
        <text class="arrow">›</text>
      </view>
      <view v-if="isOperator" class="menu-item" @click="goPage('/pages/mine/role-panels/operator-panel')">
        <text class="menu-icon">📱</text>
        <text class="menu-label">运营商中心</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <!-- ==================== 退出登录 ==================== -->
    <view v-if="userStore.isLogin" class="logout-btn" @click="handleLogout">退出登录</view>

    <!-- ==================== 登录弹窗 ==================== -->
    <view v-if="showLogin" class="modal-overlay" @click="showLogin = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">登录</text>
        <input
          v-model="loginForm.phone"
          class="modal-input"
          placeholder="手机号"
          type="text"
          maxlength="11"
        />
        <input
          v-model="loginForm.password"
          class="modal-input"
          placeholder="密码"
          type="password"
        />
        <view v-if="loginError" class="login-error">{{ loginError }}</view>
        <button
          class="modal-btn"
          :disabled="loginLoading || !loginForm.phone || !loginForm.password"
          :loading="loginLoading"
          @click="handleLogin"
        >登录</button>
        <text class="modal-cancel" @click="showLogin = false">取消</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { onPullDownRefresh, onReachBottom } from "@dcloudio/uni-app";
import { useUserStore } from "../../store/user";
import { userApi, interactApi, notifyApi } from "../../api";
import EmptyState from "../../components/EmptyState.vue";
import LoadingSkeleton from "../../components/LoadingSkeleton.vue";

/* ==================== 类型定义 ==================== */

interface PostItem {
  id: string;
  title?: string;
  content: string;
  images?: string[];
  author?: { id: string; nickname: string; avatar: string };
  likeCount?: number;
  commentCount?: number;
  isEssence?: boolean;
  createdAt?: string;
}

interface ArticleItem {
  id: string;
  title?: string;
  cover?: string;
  summary?: string;
  content?: string;
  likeCount?: number;
  commentCount?: number;
  createdAt?: string;
}

interface CollectItem {
  id: string;
  targetType: string;
  targetId: string;
  title?: string;
  cover?: string;
  createdAt: string;
}

/* ==================== 状态 ==================== */

const userStore = useUserStore();

// 用户附加资料（含统计数据）
const profile = computed(() => userStore.user as any);

// 登录相关
const showLogin = ref(false);
const loginLoading = ref(false);
const loginError = ref("");
const loginForm = ref({ phone: "", password: "" });
const unreadCount = ref(0);

// Tab
const tabs = [
  { key: "posts", label: "动态" },
  { key: "articles", label: "文章" },
  { key: "collects", label: "收藏" },
];
const currentTab = ref("posts");

// 动态
const posts = ref<PostItem[]>([]);
const loadingPosts = ref(false);

// 文章
const articles = ref<ArticleItem[]>([]);
const loadingArticles = ref(false);

// 收藏
const collects = ref<CollectItem[]>([]);
const loadingCollects = ref(false);

// 分页与加载
const loadingMore = ref(false);
const hasMore = ref(true);
const page = ref(1);
const pageSize = 10;

// 角色管理
const showAdminEntry = computed(() => {
  return isSuperAdmin.value || isOperationAdmin.value || isStationMaster.value || isOperator.value
})
const isSuperAdmin = computed(() => {
  const u = userStore.user as any
  return u?.role === 'SUPER_ADMIN' || u?.roles?.includes?.('SUPER_ADMIN')
})
const isOperationAdmin = computed(() => {
  const u = userStore.user as any
  return u?.role === 'OPERATION_ADMIN' || u?.roles?.includes?.('OPERATION_ADMIN')
})
const isStationMaster = computed(() => {
  const u = userStore.user as any
  return u?.role === 'STATION_MASTER' || u?.roles?.includes?.('STATION_MASTER')
})
const isOperator = computed(() => {
  const u = userStore.user as any
  return u?.role === 'OPERATOR' || u?.roles?.includes?.('OPERATOR')
})

// 当前 tab 的列表长度（用于判断是否显示 "已全部加载"）
const currentListLength = computed(() => {
  switch (currentTab.value) {
    case "posts": return posts.value.length;
    case "articles": return articles.value.length;
    case "collects": return collects.value.length;
    default: return 0;
  }
});

/* ==================== 生命周期 ==================== */

onMounted(() => {
  if (userStore.isLogin) {
    initProfile();
    fetchUnreadCount();
    fetchTabData(true);
  }
});

onShow(() => {
  if (userStore.isLogin) {
    fetchUnreadCount();
    // 收藏列表每次显示都刷新（可能在其他页面操作了收藏）
    if (currentTab.value === "collects") {
      fetchCollects(true);
    }
  }
});

// 下拉刷新
onPullDownRefresh(() => {
  if (!userStore.isLogin) {
    uni.stopPullDownRefresh();
    return;
  }
  Promise.all([
    userStore.fetchProfile(),
    fetchTabData(true),
  ]).finally(() => {
    uni.stopPullDownRefresh();
  });
});

// 上拉加载更多
onReachBottom(() => {
  if (!hasMore.value || loadingMore.value || !userStore.isLogin) return;
  loadingMore.value = true;
  page.value++;
  loadMoreData().finally(() => {
    loadingMore.value = false;
  });
});

/* ==================== 数据获取 ==================== */

async function initProfile() {
  try {
    await userStore.fetchProfile();
  } catch {
    // 静默处理
  }
}

async function fetchTabData(reset: boolean) {
  page.value = reset ? 1 : page.value;
  if (reset) hasMore.value = true;

  switch (currentTab.value) {
    case "posts":
      await fetchPosts(reset);
      break;
    case "articles":
      await fetchArticles(reset);
      break;
    case "collects":
      await fetchCollects(reset);
      break;
  }
}

async function loadMoreData() {
  switch (currentTab.value) {
    case "posts":
      await fetchPosts(false);
      break;
    case "articles":
      await fetchArticles(false);
      break;
    case "collects":
      // 收藏一般不分页，无更多
      hasMore.value = false;
      break;
  }
}

/** 获取动态（用户发布的帖子） */
async function fetchPosts(reset: boolean) {
  if (reset) loadingPosts.value = true;
  try {
    const data = await userApi.getPosts(userStore.user!.id, {
      page: page.value,
      pageSize,
    });
    const raw: any[] = data.list || data.items || data.data || data || [];
    const mapped: PostItem[] = raw
      .filter((p: any) => p && p.id)
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        images: p.images,
        author: p.author || p.user,
        likeCount: p.likeCount ?? 0,
        commentCount: p.commentCount ?? 0,
        isEssence: p.isEssence ?? false,
        createdAt: p.createdAt,
      }));
    if (reset) {
      posts.value = mapped;
    } else {
      const existIds = new Set(posts.value.map((x) => x.id));
      posts.value.push(...mapped.filter((x) => !existIds.has(x.id)));
    }
    hasMore.value = raw.length >= pageSize;
  } catch {
    if (reset) posts.value = [];
  } finally {
    if (reset) loadingPosts.value = false;
  }
}

/** 获取文章列表 */
async function fetchArticles(reset: boolean) {
  if (reset) loadingArticles.value = true;
  try {
    const data = await userApi.getArticles(userStore.user!.id, {
      page: page.value,
      pageSize,
    });
    const raw: any[] = data.list || data.items || data.data || data || [];
    const mapped: ArticleItem[] = raw
      .filter((a: any) => a && a.id)
      .map((a: any) => ({
        id: a.id,
        title: a.title,
        cover: a.cover,
        summary: a.summary,
        content: a.content,
        likeCount: a.likeCount ?? 0,
        commentCount: a.commentCount ?? 0,
        createdAt: a.createdAt,
      }));
    if (reset) {
      articles.value = mapped;
    } else {
      const existIds = new Set(articles.value.map((x) => x.id));
      articles.value.push(...mapped.filter((x) => !existIds.has(x.id)));
    }
    hasMore.value = raw.length >= pageSize;
  } catch {
    if (reset) articles.value = [];
  } finally {
    if (reset) loadingArticles.value = false;
  }
}

/** 获取收藏列表 */
async function fetchCollects(reset: boolean) {
  if (reset) loadingCollects.value = true;
  try {
    const data = await interactApi.myCollects();
    const raw: any[] = Array.isArray(data)
      ? data
      : data.list || data.items || data.data || [];
    const mapped: CollectItem[] = raw
      .filter((c: any) => c && c.id)
      .map((c: any) => ({
        id: c.id,
        targetType: c.targetType,
        targetId: c.targetId,
        title: c.title,
        cover: c.cover,
        createdAt: c.createdAt,
      }));
    collects.value = mapped;
    hasMore.value = false;
  } catch {
    if (reset) collects.value = [];
  } finally {
    if (reset) loadingCollects.value = false;
  }
}

/** 未读消息数 */
async function fetchUnreadCount() {
  try {
    const res = await notifyApi.unreadCount();
    unreadCount.value = (res as any).count ?? (res as any) ?? 0;
  } catch {
    unreadCount.value = 0;
  }
}

/* ==================== Tab 切换 ==================== */

function switchTab(key: string) {
  if (currentTab.value === key) return;
  currentTab.value = key;
  page.value = 1;
  hasMore.value = true;
  fetchTabData(true);
}

/* ==================== 登录 ==================== */

async function handleLogin() {
  if (!loginForm.value.phone.trim() || !loginForm.value.password.trim()) return;
  loginLoading.value = true;
  loginError.value = "";
  try {
    await userStore.login(loginForm.value.phone.trim(), loginForm.value.password);
    showLogin.value = false;
    loginForm.value = { phone: "", password: "" };
    fetchUnreadCount();
    uni.showToast({ title: "登录成功", icon: "success" });
  } catch (e: any) {
    loginError.value = e.errMsg || e.message || "登录失败，请重试";
  } finally {
    loginLoading.value = false;
  }
}

/* ==================== 退出登录 ==================== */

async function handleLogout() {
  uni.showModal({
    title: "提示",
    content: "确定要退出登录吗？",
    success: (res) => {
      if (res.confirm) {
        userStore.logout();
      }
    },
  });
}

/* ==================== 导航 ==================== */

function goPage(url: string) {
  if (!userStore.isLogin) {
    showLogin.value = true;
    return;
  }
  uni.navigateTo({ url });
}

function goVip() {
  uni.navigateTo({ url: "/pages/vip/vip" })
}

function goArticle(id: string) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}` });
}

function goCollectTarget(item: CollectItem) {
  switch (item.targetType) {
    case "article":
      uni.navigateTo({ url: `/pages/detail/detail?id=${item.targetId}` });
      break;
    case "course":
      uni.navigateTo({ url: `/pages/courses/course-detail?id=${item.targetId}` });
      break;
    default:
      uni.showToast({ title: "暂不支持跳转", icon: "none" });
  }
}

/** 收藏类型中文标签 */
function collectTypeLabel(type: string): string {
  const map: Record<string, string> = {
    article: "文章",
    course: "课程",
    video: "视频",
    classic: "古籍",
  };
  return map[type] || type;
}

/* ==================== 工具 ==================== */

/** 图片预览 */
function previewImages(images: string[], idx: number) {
  uni.previewImage({ current: images[idx], urls: images });
}

/** 日期格式化为 yyyy-MM-dd */
function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 友好的相对时间 */
function formatTime(timeStr?: string): string {
  if (!timeStr) return "";
  try {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return minutes + "分钟前";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "小时前";
    const days = Math.floor(hours / 24);
    if (days < 7) return days + "天前";
    return timeStr.slice(0, 10);
  } catch {
    return timeStr.slice(0, 10);
  }
}
</script>

<style>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 80px;
}

/* ── 用户卡片 ── */
.user-card {
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  padding: 30px 15px 40px;
  color: #fff;
}
.user-card.unlogin {
  padding: 50px 20px 40px;
}
.avatar {
  width: 70px; height: 70px; border-radius: 50%;
  background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.4);
  display: block; margin: 0 auto;
}
.nickname {
  color: #fff; font-size: 20px; font-weight: bold;
  display: block; text-align: center; margin-top: 12px;
}
.bio {
  color: rgba(255,255,255,0.75); font-size: 13px; display: block;
  text-align: center; margin-top: 6px;
}
.stats-row {
  display: flex; justify-content: center; gap: 32px; margin-top: 16px;
}
.stat-item { display: flex; flex-direction: column; align-items: center; }
.stat-num { color: #fff; font-size: 18px; font-weight: bold; }
.stat-label { color: rgba(255,255,255,0.7); font-size: 12px; margin-top: 2px; }

/* ── 未登录 ── */
.unlogin-page { padding-bottom: 20px; }
.unlogin-avatar {
  width: 64px; height: 64px; border-radius: 50%;
  background: rgba(255,255,255,0.2); display: flex; align-items: center;
  justify-content: center; font-size: 32px; margin: 0 auto 12px;
}
.unlogin-title {
  color: #fff; font-size: 20px; font-weight: bold; display: block; text-align: center;
}
.unlogin-subtitle {
  color: rgba(255,255,255,0.7); font-size: 13px; display: block;
  text-align: center; margin-top: 6px; margin-bottom: 16px;
}
.login-btn {
  background: rgba(255,255,255,0.2); color: #fff; font-size: 16px;
  border: 1px solid rgba(255,255,255,0.5); border-radius: 24px;
  padding: 10px 32px; display: inline-block; text-align: center; margin: 0 auto;
}
.feature-preview {
  background: #fff; border-radius: 12px; padding: 20px 16px;
  margin: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.fp-title {
  font-size: 14px; font-weight: bold; color: #C41E3A;
  display: block; margin-bottom: 16px; padding-left: 8px;
  border-left: 3px solid #C9A96E;
}
.fp-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.fp-item {
  width: calc(33.33% - 8px); display: flex; flex-direction: column;
  align-items: center; text-align: center; padding: 8px 4px;
}
.fp-icon { font-size: 28px; display: block; margin-bottom: 6px; }
.fp-label { font-size: 13px; color: #333; font-weight: 500; display: block; }
.fp-desc { font-size: 10px; color: #999; display: block; margin-top: 2px; }
.bottom-login {
  background: #fff; border-radius: 12px; padding: 16px; margin: 0 15px;
  display: flex; align-items: center; justify-content: center;
  gap: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.bottom-login-text { font-size: 15px; color: #C41E3A; font-weight: 500; }

/* ── VIP 卡片 ── */
.vip-card {
  margin: -25px 15px 15px;
  background: linear-gradient(135deg, #2a2a2a, #3a3a3a);
  border-radius: 12px; padding: 15px; color: #fff;
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: space-between;
}
.vip-card::before {
  content: ''; position: absolute; top: -20px; right: -20px;
  width: 100px; height: 100px;
  background: linear-gradient(135deg, #C9A96E, #D4AF37);
  border-radius: 50%; opacity: 0.25;
}
.vip-left { flex: 1; position: relative; z-index: 1; }
.vip-label {
  font-size: 16px; font-weight: bold;
  color: #C9A96E; display: block;
}
.vip-label.active { color: #D4AF37; }
.vip-expire { font-size: 12px; color: rgba(255,255,255,0.6); display: block; margin-top: 4px; }
.vip-upgrade {
  font-size: 13px; color: #2a2a2a; font-weight: bold;
  padding: 6px 14px; background: linear-gradient(135deg, #C9A96E, #D4AF37);
  border-radius: 15px; position: relative; z-index: 1;
}

/* ── Tab 栏 ── */
.tab-bar {
  display: flex; background: #fff; border-radius: 12px; overflow: hidden;
  margin: 0 15px 10px;
}
.tab-item {
  flex: 1; text-align: center; padding: 14px 0; font-size: 14px;
  color: #666; position: relative; transition: color 0.2s;
}
.tab-item.active { color: #C41E3A; font-weight: 500; }
.tab-item.active::after {
  content: ""; position: absolute; bottom: 0; left: 25%; right: 25%;
  height: 2px; background: #C41E3A; border-radius: 1px;
}

/* ── 内容区域 ── */
.content-area { margin: 0 15px; min-height: 120px; }

/* 帖子 */
.post-list { display: flex; flex-direction: column; gap: 10px; }
.post-card {
  background: #fff; border-radius: 12px; padding: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.post-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.post-user-info { display: flex; align-items: center; gap: 8px; }
.post-avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; }
.post-user-meta { display: flex; flex-direction: column; }
.post-user { font-size: 14px; font-weight: bold; color: #C41E3A; }
.post-time { font-size: 11px; color: #999; }
.post-badges { display: flex; gap: 4px; }
.badge { font-size: 10px; padding: 1px 8px; border-radius: 8px; }
.badge.essence { color: #C9A96E; background: #fdf5e6; }
.post-title { font-size: 15px; font-weight: bold; color: #333; display: block; margin-bottom: 4px; }
.post-body {
  font-size: 14px; color: #444; line-height: 1.7; display: block;
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;
}
.post-images { display: flex; gap: 6px; margin-top: 10px; overflow-x: auto; flex-wrap: wrap; }
.post-img { width: 100px; height: 100px; border-radius: 8px; flex-shrink: 0; }
.post-footer {
  display: flex; gap: 24px; margin-top: 10px; padding-top: 8px;
  border-top: 1px solid #F5F0E8;
}
.footer-item { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #999; }
.footer-count { font-size: 12px; }

/* 文章 */
.article-list { display: flex; flex-direction: column; gap: 10px; }
.article-card {
  background: #fff; border-radius: 12px; overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.article-cover { width: 100%; height: 160px; display: block; }
.article-info { padding: 12px 14px; }
.article-title {
  font-size: 15px; font-weight: 500; color: #2C2C2C; display: block;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.article-summary {
  font-size: 13px; color: #888; display: block; margin-top: 6px; line-height: 1.6;
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.article-meta { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: #999; }
.meta-item.time { margin-left: auto; }

/* 收藏 */
.collect-list { display: flex; flex-direction: column; gap: 10px; }
.collect-card {
  background: #fff; border-radius: 12px; overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex;
}
.collect-cover { width: 100px; height: 80px; flex-shrink: 0; }
.collect-info { flex: 1; padding: 12px 14px; display: flex; flex-direction: column; }
.collect-title {
  font-size: 15px; font-weight: 500; color: #2C2C2C;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.collect-meta { display: flex; gap: 8px; margin-top: auto; font-size: 12px; color: #999; }
.meta-type { color: #C41E3A; background: #F5F0E8; padding: 1px 8px; border-radius: 8px; font-size: 11px; }
.meta-time { margin-left: auto; align-self: center; }

/* ── 加载更多 ── */
.load-more { text-align: center; color: #C9A96E; padding: 16px 0; font-size: 13px; }
.no-more { text-align: center; color: #999; padding: 16px 0; font-size: 12px; }

/* ── 菜单 ── */
.menu {
  margin: 15px;
}
.menu-item {
  display: flex; align-items: center; padding: 14px 16px;
  background: #fff; border-bottom: 1px solid #E8E0D5;
}
.menu-item:first-child { border-radius: 12px 12px 0 0; }
.menu-item:last-child { border-radius: 0 0 12px 12px; border-bottom: none; }
.menu-item:only-child { border-radius: 12px; }
.menu-icon { font-size: 18px; margin-right: 12px; width: 24px; text-align: center; }
.menu-label { flex: 1; color: #333; font-size: 15px; }
.arrow { color: #ccc; font-size: 20px; font-weight: bold; }
.menu-section-title { font-size: 13px; color: #999; padding: 8px 16px 4px; font-weight: 500; }

/* ── 退出登录 ── */
.logout-btn {
  text-align: center; background: #fff; border-radius: 12px;
  padding: 14px; margin: 20px 15px; color: #C41E3A; font-size: 15px;
}

/* ── 登录弹窗 ── */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 999; display: flex;
  align-items: center; justify-content: center;
}
.modal-content {
  background: #fff; border-radius: 16px; padding: 28px 24px;
  width: 80%; max-width: 340px;
}
.modal-title { font-size: 20px; font-weight: bold; color: #333; text-align: center; margin-bottom: 20px; display: block; }
.modal-input {
  background: #F5F0E8; border-radius: 10px; padding: 12px 14px;
  font-size: 15px; margin-bottom: 12px; border: 1px solid #E8E0D5; width: 100%; box-sizing: border-box;
}
.login-error { color: #C41E3A; font-size: 13px; margin-bottom: 12px; }
.modal-btn {
  background: linear-gradient(135deg, #C41E3A, #8B0000); color: #fff; border-radius: 24px;
  font-size: 16px; padding: 12px; width: 100%; border: none; margin-top: 4px;
}
.modal-btn[disabled] { opacity: 0.5; }
.modal-cancel { display: block; text-align: center; color: #999; font-size: 14px; margin-top: 16px; }
</style>
