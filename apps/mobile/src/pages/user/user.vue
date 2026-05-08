<template>
  <view class="page">
    <!-- ==================== 加载状态 ==================== -->
    <LoadingSkeleton v-if="loading && !profile" type="detail" />

    <!-- ==================== 内容区 ==================== -->
    <template v-else-if="profile">
      <!-- 用户信息卡片 -->
      <view class="user-card">
        <image
          class="avatar"
          :src="profile.avatar || '/static/default-avatar.png'"
          mode="aspectFill"
        />
        <text class="nickname">{{ profile.nickname || '国学爱好者' }}</text>
        <text v-if="profile.signature" class="bio">{{ profile.signature }}</text>
        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-num">{{ profile.followingCount ?? 0 }}</text>
            <text class="stat-label">关注</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ profile.followerCount ?? 0 }}</text>
            <text class="stat-label">粉丝</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ profile.likeCount ?? 0 }}</text>
            <text class="stat-label">获赞</text>
          </view>
        </view>
        <!-- 关注/取消关注按钮 -->
        <view
          v-if="!isSelf"
          class="follow-btn"
          :class="{ followed: isFollowed }"
          @click="handleToggleFollow"
        >
          <text>{{ isFollowed ? '已关注' : (followLoading ? '处理中...' : '关注') }}</text>
        </view>
      </view>

      <!-- Tab 切换 -->
      <view class="tab-bar">
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

      <!-- Tab 内容 -->
      <view class="content-area">
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

        <!-- 加载更多 -->
        <view v-if="loadingMore" class="load-more">加载中...</view>
        <view v-if="!hasMore && currentListLength > 0" class="no-more">— 已全部加载 —</view>
      </view>
    </template>

    <!-- ==================== 异常状态 ==================== -->
    <view v-if="!loading && !profile" class="error-state">
      <EmptyState icon="⚠️" text="用户不存在或加载失败" />
      <button class="retry-btn" @click="initData">重新加载</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { onReachBottom } from "@dcloudio/uni-app";
import { useUserStore } from "../../store/user";
import { useInteractionStore } from "../../store/interaction";
import { userApi } from "../../api";
import EmptyState from "../../components/EmptyState.vue";
import LoadingSkeleton from "../../components/LoadingSkeleton.vue";

/* ==================== 类型定义 ==================== */

interface UserProfile {
  id: string;
  nickname: string;
  avatar?: string;
  signature?: string;
  followerCount?: number;
  followingCount?: number;
  likeCount?: number;
}

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

/* ==================== 状态 ==================== */

const userStore = useUserStore();
const interactionStore = useInteractionStore();

// 页面参数
const userId = ref("");
const isSelf = ref(false);

// 用户资料
const profile = ref<any>(null);
const loading = ref(false);

// 关注
const isFollowed = ref(false);
const followLoading = ref(false);

// Tab
const tabs = [
  { key: "posts", label: "动态" },
  { key: "articles", label: "文章" },
];
const currentTab = ref("posts");

// 动态
const posts = ref<PostItem[]>([]);
const loadingPosts = ref(false);

// 文章
const articles = ref<ArticleItem[]>([]);
const loadingArticles = ref(false);

// 分页
const loadingMore = ref(false);
const hasMore = ref(true);
const page = ref(1);
const pageSize = 10;

const currentListLength = computed(() => {
  switch (currentTab.value) {
    case "posts": return posts.value.length;
    case "articles": return articles.value.length;
    default: return 0;
  }
});

/* ==================== 生命周期 ==================== */

onMounted(() => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  const opts = page?.$page?.options || page?.options || {};
  userId.value = opts.id || "";
  if (userId.value) {
    initData();
  }
});

// 上拉加载更多
onReachBottom(() => {
  if (!hasMore.value || loadingMore.value) return;
  loadingMore.value = true;
  page.value++;
  loadMoreData().finally(() => {
    loadingMore.value = false;
  });
});

/* ==================== 数据获取 ==================== */

async function initData() {
  loading.value = true;
  try {
    // 检查是否是查看自己的主页
    isSelf.value = userStore.isLogin && userStore.user?.id === userId.value;

    const data = await userApi.getProfile(userId.value);
    profile.value = {
      id: data.id || userId.value,
      nickname: data.nickname || "国学爱好者",
      avatar: data.avatar,
      signature: data.signature,
      followerCount: data.followerCount ?? 0,
      followingCount: data.followingCount ?? 0,
      likeCount: data.likeCount ?? 0,
    };
    isFollowed.value = data.isFollowed ?? false;

    // 拉取 tab 数据
    await fetchTabData(true);
  } catch {
    profile.value = null;
    uni.showToast({ title: "用户信息加载失败", icon: "none" });
  } finally {
    loading.value = false;
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
  }
}

/** 获取动态 */
async function fetchPosts(reset: boolean) {
  if (reset) loadingPosts.value = true;
  try {
    const data = await userApi.getPosts(userId.value, {
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

/** 获取文章 */
async function fetchArticles(reset: boolean) {
  if (reset) loadingArticles.value = true;
  try {
    const data = await userApi.getArticles(userId.value, {
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

/* ==================== Tab 切换 ==================== */

function switchTab(key: string) {
  if (currentTab.value === key) return;
  currentTab.value = key;
  page.value = 1;
  hasMore.value = true;
  fetchTabData(true);
}

/* ==================== 关注 / 取消关注 ==================== */

async function handleToggleFollow() {
  if (followLoading.value) return;
  followLoading.value = true;
  try {
    await interactionStore.toggleFollow(userId.value);
    isFollowed.value = !isFollowed.value;
    if (profile.value) {
      profile.value.followerCount = Math.max(
        0,
        (profile.value.followerCount ?? 0) + (isFollowed.value ? 1 : -1),
      );
    }
  } catch {
    uni.showToast({ title: "操作失败", icon: "none" });
  } finally {
    followLoading.value = false;
  }
}

/* ==================== 导航 ==================== */

function goArticle(id: string) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}` });
}

/* ==================== 工具 ==================== */

function previewImages(images: string[], idx: number) {
  uni.previewImage({ current: images[idx], urls: images });
}

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
  padding: 12px;
  padding-bottom: 40px;
}

/* ============================
   用户卡片
   ============================ */
.user-card {
  background: linear-gradient(135deg, #C41E3A, #C9A96E);
  border-radius: 12px;
  padding: 28px;
  text-align: center;
  margin-bottom: 12px;
}
.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255,255,255,0.3);
  border: 2px solid rgba(255,255,255,0.5);
}
.nickname {
  color: #fff;
  font-size: 20px;
  margin-top: 10px;
  display: block;
  font-weight: 500;
}
.bio {
  color: rgba(255,255,255,0.8);
  font-size: 13px;
  display: block;
  margin-top: 6px;
  line-height: 1.5;
  max-width: 260px;
  margin-left: auto;
  margin-right: auto;
}

/* 统计数据 */
.stats-row {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 14px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-num {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}
.stat-label {
  color: rgba(255,255,255,0.7);
  font-size: 12px;
  margin-top: 2px;
}

/* 关注/取消关注按钮 */
.follow-btn {
  display: inline-block;
  margin-top: 14px;
  padding: 8px 32px;
  border-radius: 20px;
  font-size: 14px;
  border: 1px solid rgba(255,255,255,0.6);
  color: #fff;
  background: transparent;
}
.follow-btn.followed {
  background: rgba(255,255,255,0.2);
  border-color: rgba(255,255,255,0.4);
  color: rgba(255,255,255,0.9);
}

/* ============================
   Tab 栏
   ============================ */
.tab-bar {
  display: flex;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 10px;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 15px;
  color: #999;
  position: relative;
  transition: color 0.2s;
}
.tab-item.active {
  color: #C41E3A;
  font-weight: bold;
}
.tab-item.active::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: #C41E3A;
  border-radius: 1px;
}

/* ============================
   内容区域
   ============================ */
.content-area {
  min-height: 120px;
}

/* 帖子卡片 */
.post-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.post-card {
  background: #fff;
  border-radius: 8px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.post-user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.post-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}
.post-user-meta {
  display: flex;
  flex-direction: column;
}
.post-user {
  font-size: 14px;
  font-weight: bold;
  color: #C41E3A;
}
.post-time {
  font-size: 11px;
  color: #ccc;
}
.post-badges {
  display: flex;
  gap: 4px;
}
.badge {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 8px;
}
.badge.essence {
  color: #C9A96E;
  background: #fdf5e6;
}
.post-title {
  font-size: 15px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 4px;
}
.post-body {
  font-size: 14px;
  color: #444;
  line-height: 1.7;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}
.post-images {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  overflow-x: auto;
  flex-wrap: wrap;
}
.post-img {
  width: 100px;
  height: 100px;
  border-radius: 6px;
  flex-shrink: 0;
}
.post-footer {
  display: flex;
  gap: 24px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #F5F0E8;
}
.footer-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #999;
}
.footer-count {
  font-size: 12px;
}

/* 文章卡片 */
.article-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.article-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.article-cover {
  width: 100%;
  height: 160px;
  display: block;
}
.article-info {
  padding: 12px 14px;
}
.article-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.article-summary {
  font-size: 13px;
  color: #888;
  display: block;
  margin-top: 6px;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.article-meta {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
  color: #bbb;
}
.meta-item.time {
  margin-left: auto;
}

/* ============================
   加载更多
   ============================ */
.load-more {
  text-align: center;
  color: #C9A96E;
  padding: 16px 0;
  font-size: 13px;
}
.no-more {
  text-align: center;
  color: #ccc;
  padding: 16px 0;
  font-size: 12px;
}

/* ============================
   错误状态
   ============================ */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
}
.retry-btn {
  background: #C41E3A;
  color: #fff;
  border-radius: 20px;
  padding: 8px 32px;
  font-size: 14px;
  border: none;
  margin-top: 8px;
}
</style>
