<template>
  <view class="page">
    <!-- 文章详情 -->
    <view v-if="type==='ARTICLE' && content" class="article">
      <image v-if="content.cover" :src="content.cover" class="cover" mode="aspectFill" />
      <text class="title">{{ content.title }}</text>
      <view class="meta">
        <text>{{ content.user?.nickname }}</text>
        <text>{{ content.viewCount }} 浏览</text>
      </view>
      <view class="body" v-html="content.body"></view>
    </view>

    <!-- 课程详情 -->
    <view v-if="type==='COURSE' && content" class="course">
      <image v-if="content.cover" :src="content.cover" class="cover" mode="aspectFill" />
      <text class="title">{{ content.title }}</text>
      <text class="course-price" v-if="content.price>0">¥{{ content.price }}</text>
      <text class="course-price free" v-else>免费</text>
      <view class="body" v-html="content.intro"></view>
      <view v-if="chapters.length" class="chapters">
        <text class="section-title">课程目录</text>
        <view v-for="(ch,idx) in chapters" :key="ch.id" class="chapter-item">
          <text class="ch-index">{{ idx+1 }}</text>
          <text class="ch-title">{{ ch.title }}</text>
        </view>
      </view>
    </view>

    <!-- 圈子详情 -->
    <view v-if="type==='CIRCLE' && content" class="circle">
      <image v-if="content.cover" :src="content.cover" class="cover" mode="aspectFill" />
      <text class="title">{{ content.name }}</text>
      <text class="circle-intro">{{ content.intro }}</text>
      <view class="circle-stats">
        <text>{{ content.memberCount }} 成员</text>
        <text>{{ content.postCount }} 帖子</text>
      </view>
      <button v-if="!joined" class="join-btn" size="mini" @click="joinCircle">加入圈子</button>
    </view>

    <view v-if="!content && !loading" class="empty">内容不存在</view>
    <view v-if="loading" class="empty">加载中...</view>

    <!-- 互动栏 -->
    <view v-if="content" class="action-bar">
      <view class="action" @click="toggleLike">
        <text>{{ liked ? '❤️' : '🤍' }} {{ likeCount }}</text>
      </view>
      <view class="action" @click="toggleCollect">
        <text>{{ collected ? '⭐' : '☆' }} 收藏</text>
      </view>
      <view class="action" @click="scrollToComment">
        <text>💬 评论</text>
      </view>
    </view>

    <!-- 评论列表 -->
    <view v-if="content" class="comments">
      <text class="section-title">评论 ({{ comments.length }})</text>
      <view class="comment-input-row">
        <input v-model="commentText" placeholder="写评论..." class="comment-input" />
        <button size="mini" @click="submitComment">发送</button>
      </view>
      <view v-for="cmt in comments" :key="cmt.id" class="comment-item">
        <text class="cmt-user">{{ cmt.user?.nickname }}：</text>
        <text class="cmt-body">{{ cmt.content }}</text>
      </view>
    </view>

    <!-- 相关推荐 -->
    <view v-if="related.length" class="related">
      <text class="section-title">相关推荐</text>
      <view v-for="item in related" :key="item.id" class="rel-card" @click="goTo(item.id)">
        <image v-if="item.cover" :src="item.cover" class="rel-cover" mode="aspectFill" />
        <view class="rel-info">
          <text class="rel-title">{{ item.title }}</text>
          <text class="rel-circle" v-if="item.circle">{{ item.circle.name }}</text>
          <text class="rel-stats">{{ item.viewCount }} 浏览 · {{ item.likeCount }} 赞</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { contentApi, courseApi, circleApi, interactApi } from "../../api";

const id = ref("");
const type = ref("ARTICLE");
const content = ref<any>(null);
const loading = ref(false);
const chapters = ref<any[]>([]);
const joined = ref(false);
const related = ref<any[]>([]);

// 互动状态
const comments = ref<any[]>([]);
const commentText = ref("");
const liked = ref(false);
const collected = ref(false);
const likeCount = ref(0);

onMounted(() => {
  const query = uni.getSystemInfoSync() as any;
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  const opts = page?.$page?.options || page?.options || {};
  id.value = opts.id || "";
  type.value = opts.type || "ARTICLE";
  fetchDetail();
  fetchComments();
});

async function fetchDetail() {
  loading.value = true;
  try {
    if (type.value === "ARTICLE") {
      content.value = await contentApi.detail(id.value);
      likeCount.value = content.value.likeCount || 0;
      fetchRelated();
    } else if (type.value === "COURSE") {
      content.value = await courseApi.detail(id.value);
      chapters.value = await courseApi.chapters(id.value);
    } else if (type.value === "CIRCLE") {
      content.value = await circleApi.detail(id.value);
    }
  } finally {
    loading.value = false;
  }
}

async function fetchRelated() {
  try {
    related.value = await contentApi.related(id.value);
  } catch { /* */ }
}

function goTo(aid: string) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${aid}&type=ARTICLE` });
}

async function fetchComments() {
  if (type.value === "ARTICLE") {
    const data = await interactApi.comments("ARTICLE", id.value);
    comments.value = data.comments || data || [];
  }
}

function toggleLike() {
  liked.value = !liked.value;
  likeCount.value += liked.value ? 1 : -1;
  interactApi.toggleLike(type.value, id.value);
}

async function toggleCollect() {
  collected.value = !collected.value;
  await interactApi.toggleCollect(type.value, id.value);
}

function scrollToComment() { /* anchor */ }

async function submitComment() {
  if (!commentText.value.trim()) return;
  await interactApi.addComment({ targetType: type.value, targetId: id.value, content: commentText.value });
  uni.showToast({ title: "已发送" });
  commentText.value = "";
  fetchComments();
}

async function joinCircle() {
  await circleApi.join(id.value);
  joined.value = true;
  uni.showToast({ title: "已加入" });
}
</script>

<style>
.page { padding: 12px 12px 80px; background: #f5f0e6; min-height: 100vh; }
.cover { width: 100%; height: 200px; border-radius: 8px; margin-bottom: 12px; }
.title { font-size: 22px; font-weight: bold; color: #333; display: block; margin-bottom: 8px; }
.meta { display: flex; gap: 16px; font-size: 13px; color: #999; margin-bottom: 16px; }
.body { font-size: 16px; line-height: 1.8; color: #444; }
.empty { text-align: center; color: #999; padding: 60px 0; }

.course-price { font-size: 20px; font-weight: bold; color: #e74c3c; margin-bottom: 12px; display: block; }
.course-price.free { color: #2e7d32; }
.circle-intro { font-size: 14px; color: #666; margin-bottom: 8px; display: block; }
.circle-stats { display: flex; gap: 16px; font-size: 13px; color: #8b4513; margin-bottom: 12px; }
.join-btn { background: #8b4513; color: #fff; border-radius: 14px; }

.section-title { font-size: 16px; font-weight: bold; color: #8b4513; display: block; margin: 16px 0 8px; }
.chapters { margin-top: 12px; }
.chapter-item { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid #eee; }
.ch-index { color: #999; font-size: 13px; }
.ch-title { font-size: 14px; color: #333; }

.action-bar { display: flex; justify-content: space-around; background: #fff; border-radius: 8px; padding: 12px; margin-top: 16px; }
.action { font-size: 15px; }

.comments { margin-top: 12px; }
.comment-input-row { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }
.comment-input { flex: 1; background: #fff; border-radius: 20px; padding: 8px 12px; font-size: 14px; }
.comment-item { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.cmt-user { font-size: 13px; color: #8b4513; }
.cmt-body { font-size: 14px; color: #333; }

.related { margin-top: 16px; }
.rel-card { display: flex; gap: 12px; background: #fff; border-radius: 8px; padding: 10px; margin-bottom: 8px; }
.rel-cover { width: 80px; height: 60px; border-radius: 4px; flex-shrink: 0; }
.rel-info { flex: 1; display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
.rel-title { font-size: 14px; font-weight: bold; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rel-circle { font-size: 12px; color: #8b4513; }
.rel-stats { font-size: 12px; color: #999; }
</style>
