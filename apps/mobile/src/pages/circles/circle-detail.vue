<template>
  <view class="page">
    <!-- 加载状态 -->
    <view v-if="loading && !circle" class="skeleton-page">
      <view class="skeleton-header" />
      <view class="skeleton-section">
        <view v-for="i in 3" :key="i" class="skeleton-post" />
      </view>
    </view>

    <!-- 内容区 -->
    <template v-else-if="circle">
      <!-- 圈子头部 -->
      <view class="header">
        <image v-if="circle.cover" :src="circle.cover" class="cover" mode="aspectFill" />
        <view v-else class="cover-placeholder">
          <text class="placeholder-icon">👥</text>
        </view>
        <view class="header-info">
          <text class="name">{{ circle.name }}</text>
          <text class="intro">{{ circle.intro || '暂无简介' }}</text>
          <view class="stats">
            <text class="stat-item">👤 {{ circle.memberCount || 0 }} 成员</text>
            <text class="stat-item">📝 {{ circle.postCount || 0 }} 帖子</text>
          </view>
          <view class="tags" v-if="circle.tags?.length">
            <text v-for="t in circle.tags" :key="t" class="tag">{{ t }}</text>
          </view>
          <!-- 加入/退出按钮 -->
          <button
            v-if="!joined"
            class="action-btn join"
            @click="joinCircle"
            :disabled="joining"
          >
            {{ joining ? '加入中...' : '加入圈子' }}
          </button>
          <button
            v-else
            class="action-btn leave"
            @click="leaveCircle"
            :disabled="leaving"
          >
            {{ leaving ? '退出中...' : '退出圈子' }}
          </button>
        </view>
      </view>

      <!-- 发帖区域（仅已加入） -->
      <view v-if="joined" class="post-box">
        <view class="post-box-header">
          <text class="post-box-title">发表帖子</text>
        </view>
        <textarea
          v-model="postText"
          placeholder="分享你的见解..."
          class="post-input"
          :maxlength="500"
          @input="onPostInput"
        />
        <!-- 图片预览 -->
        <view class="post-images-preview" v-if="postImages.length > 0">
          <view
            v-for="(img, idx) in postImages"
            :key="idx"
            class="preview-img-wrap"
          >
            <image :src="img" mode="aspectFill" class="preview-img" />
            <text class="remove-img" @click="removeImage(idx)">×</text>
          </view>
        </view>
        <view class="post-actions">
          <view class="post-left">
            <text class="img-add-btn" @click="chooseImage">
              <text class="img-add-icon">🖼</text>
              <text class="img-add-text">图片</text>
              <text class="img-count" v-if="postImages.length > 0">({{ postImages.length }})</text>
            </text>
          </view>
          <view class="post-right">
            <text class="char-count">{{ postText.length }}/500</text>
            <button
              size="mini"
              class="submit-btn"
              @click="submitPost"
              :disabled="!postText.trim() || submitting"
            >
              {{ submitting ? '发布中...' : '发布' }}
            </button>
          </view>
        </view>
      </view>

      <!-- 帖子列表标题 -->
      <view class="section-title">
        帖子
        <text class="section-badge">共 {{ totalPosts }} 条</text>
      </view>

      <!-- 下拉刷新提示 -->
      <view v-if="refreshingPosts" class="refresh-tip">刷新中...</view>

      <!-- 帖子列表 -->
      <view v-if="loadingPosts && posts.length === 0" class="post-loading">
        <view v-for="i in 3" :key="i" class="skeleton-post" />
      </view>
      <view v-else-if="posts.length > 0">
        <view v-for="post in posts" :key="post.id" class="post-card">
          <view class="post-header">
            <view class="post-user-info">
              <image
                v-if="post.user?.avatar"
                :src="post.user.avatar"
                class="post-avatar"
                mode="aspectFill"
              />
              <view class="post-user-meta">
                <text class="post-user">{{ post.user?.nickname || '匿名' }}</text>
                <text class="post-time">{{ formatTime(post.createdAt) }}</text>
              </view>
            </view>
            <text v-if="post.isTop" class="top-tag">置顶</text>
          </view>
          <text class="post-title" v-if="post.title">{{ post.title }}</text>
          <text class="post-body">{{ post.content }}</text>
          <!-- 帖子图片 -->
          <view v-if="post.images?.length" class="post-images">
            <image
              v-for="(img, idx) in post.images"
              :key="idx"
              :src="img"
              mode="aspectFill"
              class="post-img"
              @click="previewImage(post.images, idx)"
            />
          </view>
          <!-- 互动 -->
          <view class="post-footer">
            <view class="footer-item" @click="toggleLike(post)">
              <text>{{ post.liked ? '❤️' : '🤍' }}</text>
              <text class="footer-count">{{ post.likeCount || 0 }}</text>
            </view>
            <view class="footer-item">
              <text>💬</text>
              <text class="footer-count">{{ post.commentCount || 0 }}</text>
            </view>
          </view>
        </view>
      </view>
      <view v-else-if="!loadingPosts && posts.length === 0" class="empty">
        <text class="empty-icon">📝</text>
        <text class="empty-text">暂无帖子，快来发表第一条吧</text>
      </view>

      <!-- 加载更多 -->
      <view v-if="loadingMorePosts" class="load-more">加载更多...</view>
      <view v-if="!hasMorePosts && posts.length > 0" class="no-more">— 已全部加载 —</view>
    </template>

    <!-- 异常状态 -->
    <view v-if="!loading && !circle" class="error-page">
      <text class="error-icon">⚠️</text>
      <text class="error-text">圈子加载失败</text>
      <button class="retry-btn" @click="initData">重新加载</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onPullDownRefresh, onReachBottom } from "@dcloudio/uni-app";
import { circleApi } from "../../api";

interface CirclePost {
  id: string;
  title?: string;
  content: string;
  images?: string[];
  user?: { nickname?: string; avatar?: string };
  likeCount?: number;
  commentCount?: number;
  createdAt?: string;
  isTop?: boolean;
  liked?: boolean;
}

// 页面参数
const id = ref("");

// 圈子数据
const circle = ref<any>(null);
const joined = ref(false);
const loading = ref(false);

// 加入/退出状态
const joining = ref(false);
const leaving = ref(false);

// 发帖
const postText = ref("");
const postImages = ref<string[]>([]);
const submitting = ref(false);

// 帖子列表
const posts = ref<CirclePost[]>([]);
const totalPosts = ref(0);
const loadingPosts = ref(false);
const loadingMorePosts = ref(false);
const refreshingPosts = ref(false);
const hasMorePosts = ref(true);
const postPage = ref(1);
const pageSize = 10;

onMounted(() => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  const opts = page?.$page?.options || page?.options || {};
  id.value = opts.id || "";
  initData();
});

onPullDownRefresh(() => {
  refreshingPosts.value = true;
  postPage.value = 1;
  hasMorePosts.value = true;
  fetchPosts(true).finally(() => {
    refreshingPosts.value = false;
    uni.stopPullDownRefresh();
  });
});

onReachBottom(() => {
  if (!hasMorePosts.value || loadingMorePosts.value) return;
  loadingMorePosts.value = true;
  postPage.value++;
  fetchPosts(false).finally(() => {
    loadingMorePosts.value = false;
  });
});

async function initData() {
  loading.value = true;
  try {
    const [circleData, postData] = await Promise.all([
      circleApi.detail(id.value).catch(() => null),
      circleApi.posts(id.value, { page: 1, pageSize }).catch(() => ({ posts: [] })),
    ]);

    circle.value = circleData;
    if (circleData) {
      joined.value = circleData.joined || false;
    }

    // 处理帖子
    const rawPosts: any[] = postData.posts || postData.data || postData || [];
    posts.value = rawPosts.map((p: any) => ({
      ...p,
      liked: p.liked || false,
    }));
    totalPosts.value = postData.total ?? rawPosts.length;
    hasMorePosts.value = rawPosts.length >= pageSize;
  } catch {
    uni.showToast({ title: "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

async function fetchPosts(reset: boolean) {
  if (reset) loadingPosts.value = true;
  try {
    const data = await circleApi.posts(id.value, { page: postPage.value, pageSize });
    const rawPosts: any[] = data.posts || data.data || data || [];
    const mapped = rawPosts.map((p: any) => ({ ...p, liked: p.liked || false }));
    if (reset) {
      posts.value = mapped;
    } else {
      posts.value.push(...mapped);
    }
    totalPosts.value = data.total ?? posts.value.length;
    hasMorePosts.value = rawPosts.length >= pageSize;
  } catch {
    if (reset) posts.value = [];
  } finally {
    if (reset) loadingPosts.value = false;
  }
}

// 图片选择
function chooseImage() {
  const remain = 9 - postImages.value.length;
  if (remain <= 0) {
    uni.showToast({ title: "最多9张图片", icon: "none" });
    return;
  }
  uni.chooseImage({
    count: remain,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      const tempPaths = res.tempFilePaths || [];
      postImages.value.push(...tempPaths);
    },
    fail: () => {
      // 用户取消选择，不做处理
    },
  });
}

function removeImage(idx: number) {
  postImages.value.splice(idx, 1);
}

function onPostInput(e: any) {
  postText.value = e.detail.value;
}

// 图片预览
function previewImage(images: string[], idx: number) {
  uni.previewImage({
    current: images[idx],
    urls: images,
  });
}

// 加入圈子
async function joinCircle() {
  if (joining.value) return;
  joining.value = true;
  try {
    await circleApi.join(id.value);
    joined.value = true;
    if (circle.value) {
      circle.value.memberCount = (circle.value.memberCount || 0) + 1;
    }
    uni.showToast({ title: "已加入圈子", icon: "success" });
  } catch {
    uni.showToast({ title: "加入失败", icon: "none" });
  } finally {
    joining.value = false;
  }
}

// 退出圈子
async function leaveCircle() {
  if (leaving.value) return;
  leaving.value = true;
  try {
    await circleApi.leave(id.value);
    joined.value = false;
    if (circle.value) {
      circle.value.memberCount = Math.max(0, (circle.value.memberCount || 1) - 1);
    }
    uni.showToast({ title: "已退出圈子" });
  } catch {
    uni.showToast({ title: "退出失败", icon: "none" });
  } finally {
    leaving.value = false;
  }
}

// 发布帖子
async function submitPost() {
  const text = postText.value.trim();
  if (!text) return;
  if (submitting.value) return;

  submitting.value = true;
  try {
    await circleApi.createPost(id.value, {
      content: text,
      images: postImages.value.length > 0 ? postImages.value : undefined,
    });
    uni.showToast({ title: "发布成功", icon: "success" });
    postText.value = "";
    postImages.value = [];

    // 刷新帖子列表
    postPage.value = 1;
    hasMorePosts.value = true;
    await fetchPosts(true);

    if (circle.value) {
      circle.value.postCount = (circle.value.postCount || 0) + 1;
    }
  } catch {
    uni.showToast({ title: "发布失败", icon: "none" });
  } finally {
    submitting.value = false;
  }
}

// 点赞
async function toggleLike(post: CirclePost) {
  if (!post.liked) {
    post.liked = true;
    post.likeCount = (post.likeCount || 0) + 1;
    try {
      await circleApi.createPost(id.value, {
        action: "like",
        postId: post.id,
      });
    } catch {
      post.liked = false;
      post.likeCount = Math.max(0, (post.likeCount || 1) - 1);
    }
  }
}

// 时间格式化
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
  background: #f5f0e6;
  min-height: 100vh;
  padding-bottom: 20px;
}

/* ===== 骨架屏 ===== */
.skeleton-page {
  padding: 12px;
}
.skeleton-header {
  height: 200px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f0e8d8 25%, #e8dcc8 50%, #f0e8d8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 16px;
}
.skeleton-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.skeleton-post,
.post-loading .skeleton-post {
  height: 120px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f0e8d8 25%, #e8dcc8 50%, #f0e8d8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ===== 圈子头部 ===== */
.header {
  background: #fff;
  padding: 16px;
  text-align: center;
}
.cover {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  margin: 0 auto 10px;
}
.cover-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  margin: 0 auto 10px;
  background: #f0e8d8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.placeholder-icon {
  font-size: 36px;
}
.name {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  display: block;
}
.intro {
  font-size: 13px;
  color: #888;
  margin: 6px 0;
  display: block;
}
.stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  font-size: 13px;
  color: #8b4513;
  margin: 8px 0;
}
.tags {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 6px 0;
  flex-wrap: wrap;
}
.tag {
  font-size: 12px;
  color: #8b4513;
  background: #f5ead6;
  padding: 2px 12px;
  border-radius: 12px;
}

/* 加入/退出按钮 */
.action-btn {
  display: inline-block;
  border-radius: 20px;
  padding: 8px 36px;
  font-size: 15px;
  margin-top: 12px;
  border: none;
  color: #fff;
}
.action-btn.join {
  background: #8b4513;
}
.action-btn.join:active {
  background: #7a3a0f;
}
.action-btn.leave {
  background: #e0d5c1;
  color: #666;
}
.action-btn:disabled {
  opacity: 0.6;
}

/* ===== 发帖区域 ===== */
.post-box {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.post-box-header {
  margin-bottom: 8px;
}
.post-box-title {
  font-size: 14px;
  font-weight: bold;
  color: #8b4513;
}
.post-input {
  width: 100%;
  min-height: 80px;
  font-size: 14px;
  color: #333;
  background: #fafaf5;
  border-radius: 6px;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #e0d5c1;
}
.post-input:focus {
  border-color: #c4943a;
}

/* 图片预览 */
.post-images-preview {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.preview-img-wrap {
  position: relative;
  width: 72px;
  height: 72px;
}
.preview-img {
  width: 100%;
  height: 100%;
  border-radius: 6px;
}
.remove-img {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  background: #e74c3c;
  color: #fff;
  border-radius: 50%;
  text-align: center;
  line-height: 18px;
  font-size: 14px;
  font-weight: bold;
}

.post-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}
.post-left {
  display: flex;
  align-items: center;
}
.img-add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 14px;
  border: 1px solid #e0d5c1;
  background: #fafaf5;
}
.img-add-icon {
  font-size: 16px;
}
.img-add-text {
  font-size: 12px;
  color: #888;
}
.img-count {
  font-size: 11px;
  color: #c4943a;
}
.post-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.char-count {
  font-size: 12px;
  color: #ccc;
}
.submit-btn {
  background: #8b4513;
  color: #fff;
  border-radius: 16px;
  padding: 4px 18px;
  font-size: 13px;
  border: none;
}
.submit-btn:disabled {
  background: #d0c8b8;
}
.submit-btn:active {
  background: #7a3a0f;
}

/* ===== 帖子列表 ===== */
.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #8b4513;
  margin: 12px 12px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-badge {
  font-size: 11px;
  color: #c4943a;
  font-weight: normal;
  background: #f5ead6;
  padding: 1px 8px;
  border-radius: 8px;
}

.refresh-tip {
  text-align: center;
  font-size: 12px;
  color: #c4943a;
  padding: 6px 0;
}

.post-card {
  background: #fff;
  border-radius: 8px;
  padding: 14px;
  margin: 0 12px 10px;
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
  color: #8b4513;
}
.post-time {
  font-size: 11px;
  color: #ccc;
}
.top-tag {
  font-size: 10px;
  color: #e74c3c;
  background: #fde8e8;
  padding: 1px 8px;
  border-radius: 8px;
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
  border-top: 1px solid #f5f0e6;
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

/* ===== 空状态 ===== */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 8px;
}
.empty-text {
  font-size: 14px;
  color: #bbb;
}

/* ===== 异常状态 ===== */
.error-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 0;
}
.error-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.error-text {
  font-size: 15px;
  color: #999;
  margin-bottom: 16px;
}
.retry-btn {
  background: #8b4513;
  color: #fff;
  border-radius: 20px;
  padding: 8px 32px;
  font-size: 14px;
  border: none;
}

/* ===== 加载更多 ===== */
.load-more {
  text-align: center;
  color: #c4943a;
  padding: 16px 0;
  font-size: 13px;
}
.no-more {
  text-align: center;
  color: #ccc;
  padding: 16px 0;
  font-size: 12px;
}
</style>
