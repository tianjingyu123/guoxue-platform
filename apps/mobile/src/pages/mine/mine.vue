<template>
  <view class="page">
    <!-- ==================== 未登录 ==================== -->
    <view v-if="!userStore.isLogin" class="user-card unlogin">
      <button class="login-btn" @click="showLogin = true">登录 / 注册</button>
      <text class="login-tip">登录后享受更多国学内容</text>
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
        <view class="stat-item" @click="goPage('/pages/user/user-list?type=following')">
          <text class="stat-num">{{ profile.followingCount ?? 0 }}</text>
          <text class="stat-label">关注</text>
        </view>
        <view class="stat-item" @click="goPage('/pages/user/user-list?type=followers')">
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
      <view class="menu-item" @click="goPage('/pages/notifications/notifications')">
        <text class="menu-icon">🔔</text>
        <text class="menu-label">消息通知</text>
        <text v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
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
import { ref, computed, onMounted, onShow } from "vue";
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
  uni.navigateTo({ url: "/pages/vip/vip" });
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
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; padding-bottom: 40px; }

/* ============================
   用户卡片
   ============================ */
.user-card {
  background: linear-gradient(135deg, #8b4513, #c4943a);
  border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 12px;
}
.user-card.unlogin { padding: 36px 28px; }
.avatar {
  width: 72px; height: 72px; border-radius: 50%;
  background: rgba(255,255,255,0.3); border: 2px solid rgba(255,255,255,0.5);
}
.nickname { color: #fff; font-size: 20px; margin-top: 10px; display: block; font-weight: 500; }
.bio {
  color: rgba(255,255,255,0.8); font-size: 13px; display: block;
  margin-top: 6px; line-height: 1.5; max-width: 260px; margin-left: auto; margin-right: auto;
}
.login-btn {
  background: rgba(255,255,255,0.2); color: #fff; font-size: 17px;
  border: 1px solid rgba(255,255,255,0.5); border-radius: 24px;
  padding: 10px 32px; display: inline-block;
}
.login-tip { color: rgba(255,255,255,0.6); font-size: 13px; display: block; margin-top: 12px; }

/* 统计数据行 */
.stats-row {
  display: flex; justify-content: center; gap: 32px; margin-top: 14px;
}
.stat-item { display: flex; flex-direction: column; align-items: center; }
.stat-num { color: #fff; font-size: 18px; font-weight: bold; }
.stat-label { color: rgba(255,255,255,0.7); font-size: 12px; margin-top: 2px; }

/* ============================
   会员卡片
   ============================ */
.vip-card {
  background: #fff; border-radius: 8px; padding: 16px;
  margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;
}
.vip-left { flex: 1; }
.vip-label {
  font-size: 16px; font-weight: bold; color: #999;
  padding: 2px 12px; border-radius: 12px; background: #f5f0e6;
}
.vip-label.active { color: #8b4513; background: #f5e6d0; }
.vip-expire { font-size: 12px; color: #bbb; display: block; margin-top: 6px; }
.vip-upgrade {
  font-size: 14px; color: #8b4513; font-weight: 500;
  padding: 6px 16px; border: 1px solid #8b4513; border-radius: 16px;
}

/* ============================
   Tab 栏
   ============================ */
.tab-bar {
  display: flex; background: #fff; border-radius: 8px; overflow: hidden;
  margin-bottom: 10px;
}
.tab-item {
  flex: 1; text-align: center; padding: 12px 0; font-size: 15px;
  color: #999; position: relative; transition: color 0.2s;
}
.tab-item.active { color: #8b4513; font-weight: bold; }
.tab-item.active::after {
  content: ""; position: absolute; bottom: 0; left: 20%; right: 20%;
  height: 2px; background: #8b4513; border-radius: 1px;
}

/* ============================
   内容区域
   ============================ */
.content-area { min-height: 120px; }

/* ===== 帖子卡片 ===== */
.post-list { display: flex; flex-direction: column; gap: 10px; }
.post-card {
  background: #fff; border-radius: 8px; padding: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.post-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
}
.post-user-info { display: flex; align-items: center; gap: 8px; }
.post-avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; }
.post-user-meta { display: flex; flex-direction: column; }
.post-user { font-size: 14px; font-weight: bold; color: #8b4513; }
.post-time { font-size: 11px; color: #ccc; }
.post-badges { display: flex; gap: 4px; }
.badge { font-size: 10px; padding: 1px 8px; border-radius: 8px; }
.badge.essence { color: #c4943a; background: #fdf5e6; }
.post-title {
  font-size: 15px; font-weight: bold; color: #333; display: block; margin-bottom: 4px;
}
.post-body {
  font-size: 14px; color: #444; line-height: 1.7; display: block;
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}
.post-images {
  display: flex; gap: 6px; margin-top: 10px; overflow-x: auto; flex-wrap: wrap;
}
.post-img {
  width: 100px; height: 100px; border-radius: 6px; flex-shrink: 0;
}
.post-footer {
  display: flex; gap: 24px; margin-top: 10px; padding-top: 8px;
  border-top: 1px solid #f5f0e6;
}
.footer-item { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #999; }
.footer-count { font-size: 12px; }

/* ===== 文章卡片 ===== */
.article-list { display: flex; flex-direction: column; gap: 10px; }
.article-card {
  background: #fff; border-radius: 8px; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.article-cover {
  width: 100%; height: 160px; display: block;
}
.article-info { padding: 12px 14px; }
.article-title {
  font-size: 16px; font-weight: bold; color: #333; display: block;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.article-summary {
  font-size: 13px; color: #888; display: block; margin-top: 6px; line-height: 1.6;
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.article-meta {
  display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: #bbb;
}
.meta-item.time { margin-left: auto; }

/* ===== 收藏卡片 ===== */
.collect-list { display: flex; flex-direction: column; gap: 10px; }
.collect-card {
  background: #fff; border-radius: 8px; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex;
}
.collect-cover { width: 100px; height: 80px; flex-shrink: 0; }
.collect-info { flex: 1; padding: 12px 14px; display: flex; flex-direction: column; }
.collect-title {
  font-size: 15px; font-weight: bold; color: #333;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.collect-meta {
  display: flex; gap: 8px; margin-top: auto; font-size: 12px; color: #bbb;
}
.meta-type {
  color: #8b4513; background: #f5ead6; padding: 1px 8px; border-radius: 8px; font-size: 11px;
}
.meta-time { margin-left: auto; align-self: center; }

/* ============================
   加载更多 / 没有更多
   ============================ */
.load-more {
  text-align: center; color: #c4943a; padding: 16px 0; font-size: 13px;
}
.no-more {
  text-align: center; color: #ccc; padding: 16px 0; font-size: 12px;
}

/* ============================
   菜单
   ============================ */
.menu { background: #fff; border-radius: 8px; overflow: hidden; margin-top: 12px; }
.menu-item {
  display: flex; align-items: center; padding: 14px 16px;
  border-bottom: 1px solid #f5f0e6; font-size: 15px;
}
.menu-item:last-child { border-bottom: none; }
.menu-icon { font-size: 18px; margin-right: 12px; width: 24px; text-align: center; }
.menu-label { flex: 1; color: #333; }
.arrow { color: #ccc; font-size: 20px; font-weight: bold; }
.badge {
  background: #e74c3c; color: #fff; font-size: 11px;
  padding: 2px 7px; border-radius: 10px; margin-right: 4px; min-width: 20px; text-align: center;
}

/* ============================
   退出登录
   ============================ */
.logout-btn {
  text-align: center; background: #fff; border-radius: 8px;
  padding: 14px; margin-top: 24px; color: #e74c3c; font-size: 15px; cursor: pointer;
}

/* ============================
   登录弹窗
   ============================ */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 999; display: flex;
  align-items: center; justify-content: center;
}
.modal-content {
  background: #fff; border-radius: 12px; padding: 28px 24px;
  width: 80%; max-width: 340px;
}
.modal-title { font-size: 20px; font-weight: bold; color: #333; text-align: center; margin-bottom: 20px; display: block; }
.modal-input {
  background: #f5f0e6; border-radius: 8px; padding: 12px 14px;
  font-size: 15px; margin-bottom: 12px; border: 1px solid #e0d5c1;
}
.login-error { color: #e74c3c; font-size: 13px; margin-bottom: 12px; }
.modal-btn {
  background: #8b4513; color: #fff; border-radius: 8px;
  font-size: 16px; padding: 12px; width: 100%; border: none; margin-top: 4px;
}
.modal-btn[disabled] { opacity: 0.5; }
.modal-cancel {
  display: block; text-align: center; color: #999; font-size: 14px;
  margin-top: 16px; cursor: pointer;
}
</style>
