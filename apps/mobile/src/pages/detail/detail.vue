<template>
  <view class="page">
    <!-- 加载骨架 -->
    <LoadingSkeleton v-if="initialLoading" type="detail" />

    <!-- 错误状态 -->
    <EmptyState
      v-if="!initialLoading && errorMsg"
      icon="⚠️"
      :text="errorMsg"
    />

    <!-- 内容详情 -->
    <template v-if="!initialLoading && content">
      <!-- 文章详情 -->
      <view v-if="type === 'ARTICLE'" class="article">
        <image v-if="content.cover" :src="content.cover" class="cover" mode="aspectFill" />
        <text class="title">{{ content.title }}</text>
        <view class="meta">
          <text v-if="content.author" class="meta-author">{{ content.author }}</text>
          <text v-if="content.dynasty" class="meta-dynasty">{{ content.dynasty }}</text>
          <text class="meta-time">{{ formatTime(content.createdAt) }}</text>
        </view>
        <rich-text v-if="content.body" class="body" :nodes="content.body"></rich-text>
        <view v-else-if="content.content" class="body">
          <rich-text :nodes="content.content"></rich-text>
        </view>
      </view>

      <!-- 课程详情 -->
      <view v-if="type === 'COURSE'" class="course">
        <image v-if="content.cover" :src="content.cover" class="cover" mode="aspectFill" />
        <text class="title">{{ content.title }}</text>
        <text class="course-price" v-if="content.price && content.price > 0">¥{{ content.price }}</text>
        <text class="course-price free" v-else>免费</text>
        <view class="body">
          <rich-text :nodes="content.intro || content.description || ''"></rich-text>
        </view>
        <view v-if="chapters.length" class="chapters">
          <text class="section-title">课程目录（{{ chapters.length }}章）</text>
          <view v-for="(ch, idx) in chapters" :key="ch.id" class="chapter-item">
            <text class="ch-index">{{ idx + 1 }}</text>
            <text class="ch-title">{{ ch.title }}</text>
          </view>
        </view>
      </view>

      <!-- 圈子详情 -->
      <view v-if="type === 'CIRCLE'" class="circle">
        <image v-if="content.cover" :src="content.cover" class="cover" mode="aspectFill" />
        <text class="title">{{ content.name }}</text>
        <text class="circle-intro">{{ content.intro || content.description }}</text>
        <view class="circle-stats">
          <text>👥 {{ content.memberCount || 0 }} 成员</text>
          <text>📝 {{ content.postCount || 0 }} 帖子</text>
        </view>
        <button
          v-if="!joined"
          class="join-btn"
          size="mini"
          @click="joinCircle"
          :loading="joinLoading"
        >加入圈子</button>
        <button v-else class="joined-btn" size="mini" disabled>已加入</button>
      </view>
    </template>

    <!-- 底部操作栏 -->
    <view v-if="content" class="action-bar">
      <view class="action-item" @click="toggleLike">
        <text class="action-icon">{{ liked ? '❤️' : '🤍' }}</text>
        <text class="action-text">点赞 {{ likeCount }}</text>
      </view>
      <view class="action-item" @click="toggleCollect">
        <text class="action-icon">{{ collected ? '⭐' : '☆' }}</text>
        <text class="action-text">收藏</text>
      </view>
      <view class="action-item" @click="scrollToComment">
        <text class="action-icon">💬</text>
        <text class="action-text">评论 {{ commentCount }}</text>
      </view>
      <view class="action-item" @click="handleShare">
        <text class="action-icon">🔗</text>
        <text class="action-text">分享</text>
      </view>
    </view>

    <!-- 评论区域 -->
    <view v-if="content && type === 'ARTICLE'" class="comment-section" id="comment-section">
      <text class="section-title">评论</text>
      <CommentList :target-type="type" :target-id="id" />
    </view>

    <!-- 相关推荐 -->
    <view v-if="related.length > 0" class="related">
      <text class="section-title">相关推荐</text>
      <ContentCard
        v-for="item in related"
        :key="item.id"
        :article="item"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { contentApi, courseApi, circleApi, interactApi } from "../../api";
import ContentCard from "../../components/ContentCard.vue";
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

// 互动状态
const liked = ref(false);
const collected = ref(false);
const likeCount = ref(0);
const commentCount = ref(0);

onMounted(() => {
  // 获取页面参数
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
      // 检查互动状态
      if (res.interacted) {
        liked.value = !!res.interacted.liked;
        collected.value = !!res.interacted.collected;
      }
      fetchRelated();
    } else if (type.value === "COURSE") {
      content.value = await courseApi.detail(id.value);
      try {
        chapters.value = await courseApi.chapters(id.value);
      } catch {
        // 目录可能不存在
      }
    } else if (type.value === "CIRCLE") {
      content.value = await circleApi.detail(id.value);
    } else {
      // 默认按文章处理
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
    // 回滚
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
  uni.pageScrollTo({
    selector: "#comment-section",
    duration: 300,
  });
}

function handleShare() {
  // uni-app 分享
  uni.share({
    provider: "weixin",
    title: content.value?.title || "分享",
    href: `https://guoxue.app/detail?id=${id.value}&type=${type.value}`,
  } as any);
}

/* ==================== 圈子加入 ==================== */

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
</script>

<style>
.page { padding: 12px 12px 80px; background: #f5f0e6; min-height: 100vh; }
.cover { width: 100%; height: 200px; border-radius: 8px; margin-bottom: 12px; }
.title { font-size: 22px; font-weight: bold; color: #333; display: block; margin-bottom: 8px; line-height: 1.4; }
.meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: #999; margin-bottom: 16px; align-items: center; }
.meta-author { color: #8b4513; font-weight: 500; }
.meta-dynasty {
  color: #8b4513; font-size: 11px; background: #f0ece4;
  padding: 2px 8px; border-radius: 4px;
}
.meta-time { font-size: 12px; }
.body { font-size: 16px; line-height: 1.8; color: #444; word-break: break-word; }
.body rich-text { font-size: 16px; line-height: 1.8; }
.body rich-text img { max-width: 100%; height: auto; }

/* 课程 */
.course-price { font-size: 20px; font-weight: bold; color: #e74c3c; margin-bottom: 12px; display: block; }
.course-price.free { color: #2e7d32; }

/* 圈子 */
.circle-intro { font-size: 14px; color: #666; margin-bottom: 8px; display: block; line-height: 1.6; }
.circle-stats { display: flex; gap: 16px; font-size: 13px; color: #8b4513; margin-bottom: 16px; }
.join-btn { background: #8b4513; color: #fff; border-radius: 18px; font-size: 14px; border: none; }
.joined-btn { background: #e0d5c1; color: #999; border-radius: 18px; font-size: 14px; border: none; }

.section-title { font-size: 16px; font-weight: bold; color: #8b4513; display: block; margin: 20px 0 12px; }

.chapters { margin-top: 12px; background: #fff; border-radius: 8px; padding: 4px 12px; }
.chapter-item { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f0ece4; }
.chapter-item:last-child { border-bottom: none; }
.ch-index { width: 20px; color: #999; font-size: 13px; text-align: center; }
.ch-title { font-size: 14px; color: #333; flex: 1; }

/* ========== 底部操作栏 ========== */
.action-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; justify-content: space-around; align-items: center;
  background: #fff; border-top: 1px solid #f0ece4;
  padding: 8px 12px; padding-bottom: calc(8px + env(safe-area-inset-bottom));
  z-index: 100;
}
.action-item {
  display: flex; flex-direction: column; align-items: center;
  min-width: 56px; cursor: pointer;
}
.action-icon { font-size: 20px; line-height: 1.3; }
.action-text { font-size: 11px; color: #999; margin-top: 2px; }

/* ========== 评论区域 ========== */
.comment-section { margin-top: 4px; }

/* ========== 相关推荐 ========== */
.related { margin-top: 8px; padding-bottom: 80px; }
</style>
