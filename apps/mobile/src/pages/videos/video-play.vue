<template>
  <view class="page">
    <video
      v-if="video"
      :src="video.videoUrl || video.url"
      class="player"
      autoplay
      loop
      object-fit="contain"
      @error="onError"
    />
    <view class="right-actions">
      <view class="action" @click="onFollow">
        <image :src="video?.author?.avatar || ''" class="avatar" mode="aspectFill" />
        <text class="follow-btn">+关注</text>
      </view>
      <view class="action" @click="onLike">
        <text class="icon">♥</text>
        <text class="count">{{ video?.likeCount || 0 }}</text>
      </view>
      <view class="action" @click="onComment">
        <text class="icon">💬</text>
        <text class="count">{{ video?.commentCount || 0 }}</text>
      </view>
      <view class="action">
        <text class="icon">⭐</text>
        <text class="count">收藏</text>
      </view>
      <view class="action">
        <text class="icon">↗</text>
        <text class="count">分享</text>
      </view>
    </view>
    <view class="bottom-info">
      <text class="author-name">@{{ video?.author?.nickname || '国学作者' }}</text>
      <text class="desc">{{ video?.title }}</text>
      <text v-if="video?.description" class="desc-sub">{{ video.description }}</text>
    </view>
    <!-- 关联商品入口 -->
    <view v-if="video?.products?.length" class="product-tag" @click="showProducts = true">
      <text>🛒 相关好物</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { videoApi } from "../../api";

const video = ref<any>(null);
const showProducts = ref(false);

onMounted(async () => {
  const pages = getCurrentPages();
  const id = (pages[pages.length - 1] as any).options?.id;
  if (id) {
    video.value = await videoApi.detail(id);
  }
});

function onFollow() { uni.showToast({ title: "已关注", icon: "success" }); }
function onLike() { uni.showToast({ title: "已点赞", icon: "none" }); }
function onComment() { uni.showToast({ title: "评论功能开发中", icon: "none" }); }
function onError(e: any) { console.error("视频播放错误:", e); }
</script>

<style>
.page { background: #000; height: 100vh; position: relative; overflow: hidden; }
.player { width: 100%; height: 100%; }
.right-actions { position: absolute; right: 10px; bottom: 120px; display: flex; flex-direction: column; align-items: center; gap: 18px; z-index: 10; }
.action { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.avatar { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #fff; }
.follow-btn { font-size: 10px; color: #fff; background: #d03050; padding: 1px 8px; border-radius: 10px; }
.icon { font-size: 28px; color: #fff; text-shadow: 0 0 4px rgba(0,0,0,0.5); }
.count { font-size: 11px; color: #fff; text-shadow: 0 0 2px rgba(0,0,0,0.5); }
.bottom-info { position: absolute; left: 12px; right: 60px; bottom: 50px; z-index: 10; }
.author-name { font-size: 14px; font-weight: bold; color: #fff; display: block; margin-bottom: 4px; text-shadow: 0 0 4px rgba(0,0,0,0.8); }
.desc { font-size: 13px; color: #eee; display: block; text-shadow: 0 0 3px rgba(0,0,0,0.7); }
.desc-sub { font-size: 12px; color: #ccc; display: block; margin-top: 2px; }
.product-tag { position: absolute; left: 12px; bottom: 80px; background: #8b4513; padding: 4px 12px; border-radius: 14px; z-index: 10; }
.product-tag text { font-size: 12px; color: #fff; }
</style>
