<template>
  <view class="page">
    <!-- 加载骨架 -->
    <LoadingSkeleton v-if="initialLoading" type="detail" />

    <!-- 错误状态 -->
    <EmptyState
      v-if="!initialLoading && errorMsg"
      icon="⚠️"
      :text="errorMsg"
    >
      <button class="retry-btn" @click="fetchDetail">重新加载</button>
    </EmptyState>

    <!-- 顶部返回按钮（有封面时悬浮） -->
    <view v-if="!initialLoading && content" class="nav-back" @click="goBack">
      <text class="nav-back-icon">‹</text>
    </view>

    <!-- ==================== 文章/内容详情 ==================== -->
    <template v-if="!initialLoading && content && (type === 'ARTICLE' || type === 'CONTENT')">
      <!-- 封面图 -->
      <view class="cover-wrap">
        <image v-if="content.cover" :src="content.cover" class="cover-img" mode="aspectFill" />
        <view v-else class="cover-plc">
          <text class="plc-icon">📜</text>
        </view>
        <view class="cover-overlay" />
      </view>

      <!-- 标题区域 -->
      <view class="title-section">
        <text class="article-title">{{ content.title }}</text>
        <view class="article-meta">
          <view class="meta-left">
            <text v-if="content.author" class="meta-author">{{ content.author }}</text>
            <text v-if="content.dynasty" class="meta-dynasty">{{ content.dynasty }}</text>
            <text class="meta-time">{{ formatTime(content.createdAt) }}</text>
          </view>
          <view class="meta-stats">
            <text class="meta-stat">👁 {{ formatCount(content.viewCount || 0) }}</text>
            <text class="meta-stat">♥ {{ formatCount(likeCount) }}</text>
          </view>
        </view>
      </view>

      <!-- 标签 -->
      <view v-if="content.tags?.length" class="tags-row">
        <text v-for="t in content.tags" :key="t" class="content-tag">{{ t }}</text>
      </view>

      <!-- 正文 -->
      <view class="content-body">
        <rich-text v-if="content.body" class="rich-content" :nodes="content.body" />
        <rich-text v-else-if="content.content" class="rich-content" :nodes="content.content" />
        <text v-else class="no-content">暂无正文内容</text>
      </view>
    </template>

    <!-- ==================== 课程详情 ==================== -->
    <template v-if="!initialLoading && content && type === 'COURSE'">
      <view class="cover-wrap">
        <image v-if="content.cover" :src="content.cover" class="cover-img" mode="aspectFill" />
        <view v-else class="cover-plc">
          <text class="plc-icon">📚</text>
        </view>
        <view class="cover-overlay" />
      </view>

      <view class="title-section">
        <text class="article-title">{{ content.title }}</text>
        <view class="course-type-row">
          <text v-if="content.type" class="course-type-tag">{{ typeLabel(content.type) }}</text>
          <text v-if="content.level" class="course-level-tag">{{ content.level }}</text>
        </view>
      </view>

      <!-- 价格 -->
      <view class="price-card">
        <view class="price-left">
          <text class="price-now" :class="{ free: !content.price }">
            {{ content.price > 0 ? '¥' + content.price : '免费' }}
          </text>
          <text v-if="content.originalPrice && content.originalPrice > (content.price || 0)" class="price-old">
            ¥{{ content.originalPrice }}
          </text>
        </view>
        <view class="price-right">
          <text class="price-stat">👤 {{ formatCount(content.studentCount || 0) }} 学员</text>
        </view>
      </view>

      <!-- 教师信息 -->
      <view v-if="content.teacher || content.teacherName" class="teacher-block">
        <view class="block-title">授课讲师</view>
        <view class="teacher-row">
          <image v-if="content.teacherAvatar" :src="content.teacherAvatar" class="teacher-avatar" />
          <view v-else class="teacher-avatar-plc">👨‍🏫</view>
          <view class="teacher-text">
            <text class="teacher-name">{{ content.teacher || content.teacherName }}</text>
            <text v-if="content.teacherBio || content.teacherDesc" class="teacher-bio">
              {{ content.teacherBio || content.teacherDesc }}
            </text>
          </view>
        </view>
      </view>

      <!-- 简介 -->
      <view class="desc-block">
        <view class="block-title">课程简介</view>
        <text class="desc-text">{{ content.description || content.intro || '暂无详细介绍' }}</text>
      </view>

      <!-- 章节 -->
      <view v-if="chapters.length" class="chapters-block">
        <view class="block-title">
          课程目录
          <text class="block-badge">{{ chapters.length }} 章</text>
        </view>
        <view class="chapter-list">
          <view v-for="(ch, idx) in chapters" :key="ch.id" class="chapter-row">
            <view class="ch-num">{{ idx + 1 }}</view>
            <text class="ch-name">{{ ch.title }}</text>
            <view class="ch-right">
              <text v-if="ch.duration" class="ch-dur">⏱ {{ formatDuration(ch.duration) }}</text>
              <text v-if="ch.isFree" class="ch-free">免费</text>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- ==================== 圈子详情 ==================== -->
    <template v-if="!initialLoading && content && type === 'CIRCLE'">
      <view class="cover-wrap">
        <image v-if="content.cover" :src="content.cover" class="cover-img" mode="aspectFill" />
        <view v-else class="cover-plc">
          <text class="plc-icon">🏘️</text>
        </view>
        <view class="cover-overlay" />
      </view>

      <view class="title-section">
        <text class="article-title">{{ content.name || content.title }}</text>
        <view class="circle-stats-row">
          <view class="circle-stat-item">
            <text class="cs-val">{{ formatCount(content.memberCount || 0) }}</text>
            <text class="cs-label">成员</text>
          </view>
          <view class="circle-stat-item">
            <text class="cs-val">{{ formatCount(content.postCount || 0) }}</text>
            <text class="cs-label">帖子</text>
          </view>
        </view>
      </view>

      <view class="desc-block">
        <view class="block-title">圈子简介</view>
        <text class="desc-text">{{ content.intro || content.description || '暂无简介' }}</text>
      </view>

      <view class="circle-action-wrap">
        <button
          v-if="!joined"
          class="circle-join-btn"
          @click="joinCircle"
          :loading="joinLoading"
        >加入圈子</button>
        <button v-else class="circle-joined-btn" disabled>✓ 已加入</button>
      </view>
    </template>

    <!-- ==================== 底部操作栏 ==================== -->
    <view v-if="content" class="action-bar">
      <view class="action-item" @click="toggleLike">
        <text class="action-icon">{{ liked ? '❤️' : '🤍' }}</text>
        <text class="action-label">{{ liked ? '已赞' : '点赞' }}</text>
        <text v-if="likeCount > 0" class="action-num">{{ likeCount }}</text>
      </view>
      <view class="action-item" @click="toggleCollect">
        <text class="action-icon">{{ collected ? '⭐' : '☆' }}</text>
        <text class="action-label">{{ collected ? '已收藏' : '收藏' }}</text>
      </view>
      <view class="action-item" @click="scrollToComment">
        <text class="action-icon">💬</text>
        <text class="action-label">评论</text>
        <text v-if="commentCount > 0" class="action-num">{{ commentCount }}</text>
      </view>
      <view class="action-item" @click="handleShare">
        <text class="action-icon">📤</text>
        <text class="action-label">分享</text>
      </view>
    </view>

    <!-- ==================== 评论 ==================== -->
    <view v-if="content && (type === 'ARTICLE' || type === 'CONTENT')" class="comment-section" id="comment-section">
      <view class="section-header">评论</view>
      <CommentList :target-type="type" :target-id="id" />
    </view>

    <!-- ==================== 相关推荐 ==================== -->
    <view v-if="related.length > 0 && (type === 'ARTICLE' || type === 'CONTENT')" class="related-section">
      <view class="section-header">相关推荐</view>
      <scroll-view scroll-x class="related-scroll" show-scrollbar="false">
        <view
          v-for="item in related"
          :key="item.id"
          class="related-card"
          @click="goDetail(item.id, type)"
        >
          <image v-if="item.cover" :src="item.cover" class="related-cover" mode="aspectFill" />
          <view v-else class="related-cover-plc">
            <text class="r-plc-icon">📜</text>
          </view>
          <view class="related-body">
            <text class="related-title">{{ item.title }}</text>
            <text class="related-author">{{ item.author || '' }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部安全区 -->
    <view class="bottom-safe" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { contentApi, contentsApi, courseApi, circleApi, interactApi } from "../../api";
import CommentList from "../../components/CommentList.vue";
import LoadingSkeleton from "../../components/LoadingSkeleton.vue";
import EmptyState from "../../components/EmptyState.vue";

const id = ref("");
const type = ref("ARTICLE");
const content = ref<any>(null);
const initialLoading = ref(false);
const errorMsg = ref("");
const chapters = ref<any[]>([]);
const joined = ref(false);
const joinLoading = ref(false);
const related = ref<any[]>([]);

const liked = ref(false);
const collected = ref(false);
const likeCount = ref(0);
const commentCount = ref(0);

onMounted(() => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  const opts = page?.$page?.options || page?.options || {};
  id.value = opts.id || "";
  type.value = (opts.type || "ARTICLE").toUpperCase();
  fetchDetail();
});

async function fetchDetail() {
  if (!id.value) {
    errorMsg.value = "缺少参数";
    return;
  }
  initialLoading.value = true;
  errorMsg.value = "";
  try {
    if (type.value === "ARTICLE") {
      const res = await contentApi.detail(id.value);
      content.value = res;
      likeCount.value = res.likeCount || 0;
      commentCount.value = res.commentCount || 0;
      if (res.interacted) {
        liked.value = !!res.interacted.liked;
        collected.value = !!res.interacted.collected;
      }
      fetchRelated();
    } else if (type.value === "CONTENT") {
      const res = await contentsApi.detail(id.value);
      content.value = res;
      likeCount.value = res.likeCount || 0;
      commentCount.value = res.commentCount || 0;
      fetchRelated();
    } else if (type.value === "COURSE") {
      content.value = await courseApi.detail(id.value);
      try {
        chapters.value = await courseApi.chapters(id.value);
      } catch { /* skip */ }
    } else if (type.value === "CIRCLE") {
      content.value = await circleApi.detail(id.value);
    } else {
      content.value = await contentApi.detail(id.value);
      likeCount.value = content.value.likeCount || 0;
      fetchRelated();
    }
  } catch (e: any) {
    errorMsg.value = e.errMsg || e.message || "加载失败";
    content.value = null;
  } finally {
    initialLoading.value = false;
  }
}

async function fetchRelated() {
  try {
    related.value = await contentApi.related(id.value);
  } catch {
    related.value = [];
  }
}

/* ==================== 互动 ==================== */

async function toggleLike() {
  liked.value = !liked.value;
  likeCount.value += liked.value ? 1 : -1;
  try {
    await interactApi.toggleLike(type.value, id.value);
  } catch {
    liked.value = !liked.value;
    likeCount.value += liked.value ? 1 : -1;
    uni.showToast({ title: "操作失败", icon: "none" });
  }
}

async function toggleCollect() {
  const prev = collected.value;
  collected.value = !collected.value;
  try {
    await interactApi.toggleCollect(type.value, id.value);
    uni.showToast({
      title: collected.value ? "已收藏" : "已取消收藏",
      icon: "none",
    });
  } catch {
    collected.value = prev;
    uni.showToast({ title: "操作失败", icon: "none" });
  }
}

function scrollToComment() {
  uni.pageScrollTo({ selector: "#comment-section", duration: 300 });
}

function handleShare() {
  if (!content.value) return;
  const title = content.value.title || "分享";
  uni.setClipboardData({
    data: `【热卜国学】${title} — 快来看看吧！`,
    success: () => uni.showToast({ title: "链接已复制，去粘贴分享吧", icon: "success" }),
  });
}

/* ==================== 圈子 ==================== */

async function joinCircle() {
  joinLoading.value = true;
  try {
    await circleApi.join(id.value);
    joined.value = true;
    uni.showToast({ title: "已加入圈子", icon: "success" });
  } catch (e: any) {
    uni.showToast({ title: e.errMsg || "加入失败", icon: "none" });
  } finally {
    joinLoading.value = false;
  }
}

/* ==================== 工具 ==================== */

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "w";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function typeLabel(t: string): string {
  const map: Record<string, string> = {
    video: "视频课程", audio: "音频课程", text: "文本课程", ebook: "电子书",
  };
  return map[t] || t;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}时${m % 60}分`;
  }
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
}

function goDetail(detailId: string, detailType: string) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${detailId}&type=${detailType}` });
}

function goBack() {
  uni.navigateBack();
}
</script>

<style>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 80px;
}

/* ===== 返回按钮 ===== */
.nav-back {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 100;
  width: 34px;
  height: 34px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: calc(env(safe-area-inset-top));
}
.nav-back-icon {
  font-size: 26px;
  color: #fff;
  line-height: 1;
}

/* ===== 封面 ===== */
.cover-wrap {
  position: relative;
  width: 100%;
  height: 220px;
  overflow: hidden;
}
.cover-img {
  width: 100%;
  height: 100%;
}
.cover-plc {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #e0cfb5, #d4bfa5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.plc-icon {
  font-size: 56px;
}
.cover-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.4));
  pointer-events: none;
}

/* ===== 标题区域 ===== */
.title-section {
  padding: 16px;
  background: #fff;
  border-radius: 12px 12px 0 0;
  margin-top: -12px;
  position: relative;
  z-index: 2;
}
.article-title {
  font-size: 21px;
  font-weight: bold;
  color: #2C2C2C;
  font-family: 'Noto Serif SC', serif;
  line-height: 1.5;
  display: block;
}
.article-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  flex-wrap: wrap;
  gap: 8px;
}
.meta-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.meta-author {
  font-size: 14px;
  color: #C41E3A;
  font-weight: 500;
}
.meta-dynasty {
  font-size: 11px;
  color: #C41E3A;
  background: #F5F0E8;
  padding: 2px 10px;
  border-radius: 4px;
}
.meta-time {
  font-size: 12px;
  color: #bbb;
}
.meta-stats {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}
.meta-stat {
  font-size: 11px;
  color: #bbb;
}

/* ===== 标签 ===== */
.tags-row {
  padding: 0 16px 12px;
  background: #fff;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.content-tag {
  font-size: 11px;
  color: #C9A96E;
  background: rgba(201, 169, 110, 0.1);
  padding: 2px 10px;
  border-radius: 10px;
}

/* ===== 正文 ===== */
.content-body {
  padding: 0 16px 20px;
  background: #fff;
  border-radius: 0 0 12px 12px;
}
.rich-content {
  font-size: 16px;
  line-height: 2;
  color: #444;
  word-break: break-word;
}
.no-content {
  display: block;
  text-align: center;
  color: #ccc;
  font-size: 14px;
  padding: 40px 0;
}

/* ===== 课程类型标签 ===== */
.course-type-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.course-type-tag {
  font-size: 11px;
  color: #fff;
  background: #C41E3A;
  padding: 2px 10px;
  border-radius: 10px;
}
.course-level-tag {
  font-size: 11px;
  color: #C9A96E;
  background: rgba(201, 169, 110, 0.1);
  padding: 2px 10px;
  border-radius: 10px;
}

/* ===== 价格卡片 ===== */
.price-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #fff;
  margin-top: 1px;
}
.price-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.price-now {
  font-size: 26px;
  font-weight: bold;
  color: #C41E3A;
}
.price-now.free {
  color: #2e7d32;
  font-size: 18px;
}
.price-old {
  font-size: 13px;
  color: #bbb;
  text-decoration: line-through;
}
.price-stat {
  font-size: 12px;
  color: #999;
}

/* ===== 教师 ===== */
.teacher-block {
  padding: 0 16px 12px;
  background: #fff;
}
.block-title {
  font-size: 15px;
  font-weight: bold;
  color: #2C2C2C;
  padding: 10px 0 8px 8px;
  border-left: 3px solid #C41E3A;
  display: flex;
  align-items: center;
  gap: 8px;
}
.block-badge {
  font-size: 11px;
  color: #C9A96E;
  font-weight: normal;
  background: #F5F0E8;
  padding: 1px 8px;
  border-radius: 8px;
}
.teacher-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #F5F0E8;
  border-radius: 10px;
  padding: 12px;
}
.teacher-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
}
.teacher-avatar-plc {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.teacher-text {
  flex: 1;
  min-width: 0;
}
.teacher-name {
  font-size: 14px;
  font-weight: 500;
  color: #2C2C2C;
}
.teacher-bio {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 简介 ===== */
.desc-block {
  padding: 0 16px 12px;
  background: #fff;
}
.desc-text {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
  display: block;
}

/* ===== 章节 ===== */
.chapters-block {
  padding: 0 16px 16px;
  background: #fff;
  border-radius: 0 0 12px 12px;
}
.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.chapter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px;
  background: #F5F0E8;
  border-radius: 8px;
}
.chapter-row:active {
  background: #ede5d5;
}
.ch-num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #C41E3A;
  color: #fff;
  text-align: center;
  line-height: 26px;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}
.ch-name {
  flex: 1;
  font-size: 14px;
  color: #2C2C2C;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ch-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.ch-dur {
  font-size: 11px;
  color: #bbb;
}
.ch-free {
  font-size: 10px;
  color: #2e7d32;
  background: #e8f5e9;
  padding: 1px 8px;
  border-radius: 6px;
}

/* ===== 圈子 ===== */
.circle-stats-row {
  display: flex;
  gap: 24px;
  margin-top: 12px;
}
.circle-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cs-val {
  font-size: 20px;
  font-weight: bold;
  color: #C41E3A;
}
.cs-label {
  font-size: 11px;
  color: #bbb;
  margin-top: 2px;
}
.circle-action-wrap {
  padding: 16px;
  background: #fff;
  border-radius: 0 0 12px 12px;
}
.circle-join-btn {
  width: 100%;
  height: 46px;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  color: #fff;
  border-radius: 23px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.25);
}
.circle-joined-btn {
  width: 100%;
  height: 46px;
  background: #E8E0D5;
  color: #999;
  border-radius: 23px;
  font-size: 16px;
  border: none;
}

/* ===== 底部操作栏 ===== */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: #fff;
  border-top: 1px solid #E8E0D5;
  padding: 8px 0;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  z-index: 100;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
}
.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
  position: relative;
}
.action-icon {
  font-size: 22px;
  line-height: 1.2;
}
.action-label {
  font-size: 10px;
  color: #999;
}
.action-num {
  font-size: 9px;
  color: #C41E3A;
  position: absolute;
  top: 0;
  right: 2px;
}

/* ===== 评论区域 ===== */
.comment-section {
  margin-top: 12px;
  background: #fff;
  border-radius: 12px;
  margin: 12px 0;
  padding: 4px 0 12px;
}
.section-header {
  font-size: 15px;
  font-weight: bold;
  color: #2C2C2C;
  padding: 12px 16px 8px 20px;
  border-left: 3px solid #C41E3A;
  margin: 8px 16px;
}

/* ===== 相关推荐 ===== */
.related-section {
  margin-top: 12px;
  background: #fff;
  border-radius: 12px;
  padding-bottom: 16px;
}
.related-scroll {
  white-space: nowrap;
  padding: 0 16px;
}
.related-card {
  display: inline-block;
  width: 130px;
  background: #F5F0E8;
  border-radius: 10px;
  overflow: hidden;
  margin-right: 10px;
  vertical-align: top;
}
.related-cover {
  width: 100%;
  height: 85px;
}
.related-cover-plc {
  width: 100%;
  height: 85px;
  background: linear-gradient(135deg, #E8E0D5, #C9A96E);
  display: flex;
  align-items: center;
  justify-content: center;
}
.r-plc-icon {
  font-size: 28px;
}
.related-body {
  padding: 8px 10px 10px;
}
.related-title {
  font-size: 13px;
  color: #2C2C2C;
  font-weight: 500;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.related-author {
  font-size: 11px;
  color: #bbb;
  margin-top: 2px;
  display: block;
}

/* ===== 重试按钮 ===== */
.retry-btn {
  background: #C41E3A;
  color: #fff;
  border-radius: 20px;
  padding: 8px 32px;
  font-size: 14px;
  border: none;
  margin-top: 8px;
}

/* ===== 底部安全区 ===== */
.bottom-safe {
  height: 20px;
}
</style>
