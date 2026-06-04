<template>
  <view class="page">
    <!-- 顶部信息 -->
    <view
      v-if="book"
      class="header-section"
    >
      <view class="book-banner">
        <image
          :src="book.cover || '/static/default-book.png'"
          class="banner-cover"
          mode="aspectFill"
        />
        <view class="banner-info">
          <text class="banner-title">
            {{ book.title }}
          </text>
          <text class="banner-author">
            {{ book.author }}
          </text>
          <view class="banner-tags">
            <text
              v-if="book.category"
              class="tag"
            >
              {{ book.category.name }}
            </text>
            <text
              v-if="book.language"
              class="tag"
            >
              {{ book.language }}
            </text>
            <text
              v-if="book.fileType"
              class="tag"
            >
              {{ book.fileType }}
            </text>
          </view>
          <view class="banner-stats">
            <text class="stat">
              {{ formatCount(book.viewCount) }} 人阅读
            </text>
            <text class="stat">
              {{ book.totalChapters || 0 }} 章
            </text>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-row">
        <view
          v-if="book.purchased || Number(book.price) <= 0"
          class="btn-primary"
          @click="startReading"
        >
          <text>开始阅读</text>
        </view>
        <template v-else>
          <view
            class="btn-primary"
            @click="doPurchase"
          >
            <text>¥{{ book.price }} 购买</text>
          </view>
          <view
            v-if="book.memberFree"
            class="member-tip"
          >
            <text>会员免费</text>
          </view>
        </template>
        <view
          class="btn-secondary"
          @click="toggleCollect"
        >
          <text>{{ isCollected ? '已收藏 ♥' : '收藏 ♡' }}</text>
        </view>
      </view>
    </view>

    <!-- 简介 -->
    <view
      v-if="book?.description"
      class="section"
    >
      <text class="section-title">
        简介
      </text>
      <text
        class="desc-text"
        :class="{ expanded: descExpanded }"
      >
        {{ book.description }}
      </text>
      <text
        v-if="book.description.length > 100"
        class="expand-btn"
        @click="descExpanded = !descExpanded"
      >
        {{ descExpanded ? '收起' : '展开' }}
      </text>
    </view>

    <!-- 目录 -->
    <view class="section">
      <view class="section-hdr">
        <text class="section-title">
          目录
        </text>
        <text class="chapter-count">
          共{{ book?.chapters?.length || 0 }}章
        </text>
      </view>
      <view
        v-if="book?.chapters?.length"
        class="chapter-list"
      >
        <view
          v-for="ch in displayChapters"
          :key="ch.id"
          class="chapter-item"
          @click="goChapter(ch)"
        >
          <text class="ch-title">
            {{ ch.title }}
          </text>
          <view class="ch-right">
            <text
              v-if="ch.freeTrial"
              class="ch-free"
            >
              试读
            </text>
            <text
              v-else-if="!book.purchased && Number(book.price) > 0"
              class="ch-lock"
            >
              🔒
            </text>
          </view>
        </view>
        <view
          v-if="book.chapters.length > 10 && !showAllChapters"
          class="show-more"
          @click="showAllChapters = true"
        >
          <text>查看全部目录 ({{ book.chapters.length }}章)</text>
        </view>
      </view>
      <view
        v-else
        class="empty-chapters"
      >
        <text>暂无章节</text>
      </view>
    </view>

    <!-- 书籍信息 -->
    <view class="section">
      <text class="section-title">
        书籍信息
      </text>
      <view class="info-grid">
        <view class="info-item">
          <text class="info-label">
            分类
          </text>
          <text class="info-value">
            {{ book?.category?.name || '未分类' }}
          </text>
        </view>
        <view class="info-item">
          <text class="info-label">
            格式
          </text>
          <text class="info-value">
            {{ book?.fileType || '-' }}
          </text>
        </view>
        <view class="info-item">
          <text class="info-label">
            语言
          </text>
          <text class="info-value">
            {{ book?.language || '中文' }}
          </text>
        </view>
        <view class="info-item">
          <text class="info-label">
            购买人数
          </text>
          <text class="info-value">
            {{ formatCount(book?.purchaseCount) }}
          </text>
        </view>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view
      v-if="!book && loading"
      class="skeleton"
    >
      <view class="sk-cover" />
      <view class="sk-line w80" />
      <view class="sk-line w50" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { ebookApi, interactApi } from "../../api";

const book = ref<any>(null);
const loading = ref(true);
const isCollected = ref(false);
const descExpanded = ref(false);
const showAllChapters = ref(false);
let ebookId = "";

const displayChapters = computed(() => {
  if (!book.value?.chapters) return [];
  return showAllChapters.value ? book.value.chapters : book.value.chapters.slice(0, 10);
});

onLoad((opts: any) => {
  ebookId = opts.id;
  if (ebookId) fetchDetail();
});

async function fetchDetail() {
  loading.value = true;
  try {
    const res = await ebookApi.detail(ebookId);
    book.value = (res as any)?.data || res;
  } catch {
    uni.showToast({ title: "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

async function doPurchase() {
  try {
    await ebookApi.purchase(ebookId);
    uni.showToast({ title: "购买成功", icon: "success" });
    book.value.purchased = true;
  } catch (e: any) {
    uni.showToast({ title: e?.message || "购买失败", icon: "none" });
  }
}

function startReading() {
  uni.navigateTo({ url: `/pages/ebook/ebook-reader?id=${ebookId}` });
}

function goChapter(ch: any) {
  if (!ch.freeTrial && !book.value.purchased && Number(book.value.price) > 0) {
    uni.showToast({ title: "请先购买", icon: "none" });
    return;
  }
  uni.navigateTo({ url: `/pages/ebook/ebook-reader?id=${ebookId}&chapterId=${ch.id}` });
}

async function toggleCollect() {
  try {
    await interactApi.toggleCollect("EBOOK", ebookId);
    isCollected.value = !isCollected.value;
    uni.showToast({ title: isCollected.value ? "已收藏" : "取消收藏", icon: "none" });
  } catch {}
}

function formatCount(n: number) {
  if (!n) return "0";
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return String(n);
}
</script>

<style scoped>
.page { background: #f8f5f0; min-height: 100vh; padding-bottom: 40rpx; }

.header-section { background: linear-gradient(135deg, #2c1810 0%, #5a3e2b 100%); padding: 40rpx 30rpx; }
.book-banner { display: flex; gap: 28rpx; }
.banner-cover { width: 220rpx; height: 300rpx; border-radius: 12rpx; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.3); }
.banner-info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.banner-title { font-size: 36rpx; font-weight: bold; color: #fff; margin-bottom: 12rpx; }
.banner-author { font-size: 26rpx; color: rgba(255,255,255,0.8); margin-bottom: 16rpx; }
.banner-tags { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 16rpx; }
.tag { font-size: 20rpx; color: #d4a574; background: rgba(212,165,116,0.15); padding: 4rpx 14rpx; border-radius: 6rpx; }
.banner-stats { display: flex; gap: 24rpx; }
.stat { font-size: 22rpx; color: rgba(255,255,255,0.7); }

.action-row { display: flex; align-items: center; gap: 20rpx; margin-top: 28rpx; }
.btn-primary { flex: 1; background: #d4a574; color: #2c1810; text-align: center; padding: 20rpx 0; border-radius: 40rpx; font-size: 30rpx; font-weight: bold; }
.btn-secondary { padding: 20rpx 32rpx; border: 2rpx solid rgba(255,255,255,0.5); border-radius: 40rpx; }
.btn-secondary text { font-size: 26rpx; color: #fff; }
.member-tip { font-size: 22rpx; color: #ffd700; }

.section { margin: 24rpx 30rpx; background: #fff; border-radius: 16rpx; padding: 28rpx; }
.section-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 16rpx; }
.chapter-count { font-size: 24rpx; color: #999; }

.desc-text { font-size: 26rpx; color: #666; line-height: 1.8; max-height: 160rpx; overflow: hidden; }
.desc-text.expanded { max-height: none; }
.expand-btn { font-size: 24rpx; color: #8b6914; margin-top: 8rpx; }

.chapter-list {}
.chapter-item { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.chapter-item:last-child { border-bottom: none; }
.ch-title { font-size: 28rpx; color: #333; flex: 1; }
.ch-right { display: flex; align-items: center; gap: 8rpx; }
.ch-free { font-size: 20rpx; color: #4caf50; background: #e8f5e9; padding: 4rpx 12rpx; border-radius: 6rpx; }
.ch-lock { font-size: 24rpx; }
.show-more { text-align: center; padding: 20rpx 0; }
.show-more text { font-size: 26rpx; color: #8b6914; }
.empty-chapters { text-align: center; padding: 40rpx; color: #999; font-size: 26rpx; }

.info-grid { display: flex; flex-wrap: wrap; gap: 20rpx; }
.info-item { width: calc(50% - 10rpx); }
.info-label { font-size: 22rpx; color: #999; display: block; }
.info-value { font-size: 26rpx; color: #333; margin-top: 6rpx; display: block; }

.skeleton { padding: 40rpx 30rpx; }
.sk-cover { width: 220rpx; height: 300rpx; background: #e8e8e8; border-radius: 12rpx; margin-bottom: 20rpx; }
.sk-line { height: 24rpx; background: #e8e8e8; border-radius: 4rpx; margin-bottom: 12rpx; }
.sk-line.w80 { width: 80%; }
.sk-line.w50 { width: 50%; }
</style>
