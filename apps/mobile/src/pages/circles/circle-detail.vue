<template>
  <view class="page">
    <!-- 圈子头部 -->
    <view v-if="circle" class="header">
      <image v-if="circle.cover" :src="circle.cover" class="cover" mode="aspectFill" />
      <text class="name">{{ circle.name }}</text>
      <text class="intro">{{ circle.intro }}</text>
      <view class="stats">
        <text>{{ circle.memberCount }} 成员</text>
        <text>{{ circle.postCount }} 帖子</text>
      </view>
      <view class="tags" v-if="circle.tags?.length">
        <text v-for="t in circle.tags" :key="t" class="tag">{{ t }}</text>
      </view>
      <button v-if="!joined" class="join-btn" @click="joinCircle">加入圈子</button>
      <button v-else class="join-btn leave" @click="leaveCircle">退出圈子</button>
    </view>

    <!-- 发帖 -->
    <view v-if="joined" class="post-box">
      <textarea v-model="postText" placeholder="分享你的见解..." class="post-input" :maxlength="500" />
      <view class="post-actions">
        <text class="char-count">{{ postText.length }}/500</text>
        <button size="mini" class="submit-btn" @click="submitPost" :disabled="!postText.trim()">发布</button>
      </view>
    </view>

    <!-- 帖子列表 -->
    <view class="section-title">帖子</view>
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else>
      <view v-for="post in posts" :key="post.id" class="post-card">
        <view class="post-header">
          <text class="post-user">{{ post.user?.nickname }}</text>
          <text class="post-time">{{ post.createdAt?.slice(0,10) }}</text>
        </view>
        <text class="post-title" v-if="post.title">{{ post.title }}</text>
        <text class="post-body">{{ post.content }}</text>
        <view v-if="post.images?.length" class="post-images">
          <image v-for="(img, idx) in post.images" :key="idx" :src="img" mode="aspectFill" class="post-img" />
        </view>
        <view class="post-footer">
          <text>👍 {{ post.likeCount || 0 }}</text>
          <text>💬 {{ post.commentCount || 0 }}</text>
        </view>
      </view>
    </view>
    <view v-if="!loading && posts.length === 0" class="empty">暂无帖子</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { circleApi } from "../../api";

const id = ref("");
const circle = ref<any>(null);
const posts = ref<any[]>([]);
const loading = ref(false);
const joined = ref(false);
const postText = ref("");

onMounted(() => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  const opts = page?.$page?.options || page?.options || {};
  id.value = opts.id || "";
  fetchCircle();
  fetchPosts();
});

async function fetchCircle() {
  try {
    circle.value = await circleApi.detail(id.value);
  } catch { /* */ }
}

async function fetchPosts() {
  loading.value = true;
  try {
    const data = await circleApi.posts(id.value, { pageSize: 50 });
    posts.value = data.posts || data || [];
  } finally { loading.value = false; }
}

async function joinCircle() {
  try {
    await circleApi.join(id.value);
    joined.value = true;
    if (circle.value) circle.value.memberCount = (circle.value.memberCount || 0) + 1;
    uni.showToast({ title: "已加入" });
  } catch { /* */ }
}

async function leaveCircle() {
  try {
    await circleApi.leave(id.value);
    joined.value = false;
    if (circle.value) circle.value.memberCount = Math.max(0, (circle.value.memberCount || 1) - 1);
    uni.showToast({ title: "已退出" });
  } catch { /* */ }
}

async function submitPost() {
  if (!postText.value.trim()) return;
  try {
    await circleApi.createPost(id.value, { content: postText.value.trim() });
    uni.showToast({ title: "发布成功" });
    postText.value = "";
    fetchPosts();
    if (circle.value) circle.value.postCount = (circle.value.postCount || 0) + 1;
  } catch { /* */ }
}
</script>

<style>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; }
.header { text-align: center; padding: 20px 0; }
.cover { width: 80px; height: 80px; border-radius: 12px; margin-bottom: 8px; }
.name { font-size: 20px; font-weight: bold; color: #333; display: block; }
.intro { font-size: 14px; color: #888; margin: 6px 0; display: block; }
.stats { display: flex; justify-content: center; gap: 24px; font-size: 13px; color: #8b4513; margin: 8px 0; }
.tags { display: flex; justify-content: center; gap: 8px; margin: 6px 0; }
.tag { font-size: 12px; color: #8b4513; background: #f5ead6; padding: 2px 10px; border-radius: 10px; }
.join-btn { display: inline-block; background: #8b4513; color: #fff; border-radius: 20px; padding: 8px 32px; font-size: 15px; margin-top: 12px; }
.join-btn.leave { background: #ccc; color: #666; }

.post-box { background: #fff; border-radius: 8px; padding: 12px; margin: 16px 0; }
.post-input { width: 100%; min-height: 80px; font-size: 14px; background: #fafafa; border-radius: 6px; padding: 8px; box-sizing: border-box; }
.post-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.char-count { font-size: 12px; color: #ccc; }
.submit-btn { background: #8b4513; color: #fff; border-radius: 14px; }

.section-title { font-size: 16px; font-weight: bold; color: #8b4513; margin: 12px 0 8px; }

.post-card { background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.post-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
.post-user { font-size: 14px; font-weight: bold; color: #8b4513; }
.post-time { font-size: 12px; color: #ccc; }
.post-title { font-size: 15px; font-weight: bold; color: #333; display: block; margin-bottom: 4px; }
.post-body { font-size: 14px; color: #444; line-height: 1.6; display: block; }
.post-images { display: flex; gap: 6px; margin-top: 8px; overflow-x: auto; }
.post-img { width: 100px; height: 100px; border-radius: 4px; flex-shrink: 0; }
.post-footer { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: #999; }

.empty { text-align: center; color: #999; padding: 40px 0; font-size: 14px; }
</style>
