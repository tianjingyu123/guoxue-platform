<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ClassicsHeader from '@/components/classics/classics-header.vue'
import FlatCover from '@/components/classics/flat-cover.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { classicsApi, type BookListFull } from '@/lib/classics-data'
import { coverColorForBook } from '@/lib/classics-cover'

const lists = ref<BookListFull[]>([])
const loading = ref(true)
const error = ref('')

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const data = await classicsApi.lists()
    lists.value = data.map((l: BookListFull) => ({ ...l }))
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

function toggleLike(id: string) {
  const item = lists.value.find((l) => l.id === id)
  if (!item) return
  item.liked = !item.liked
  item.likes += item.liked ? 1 : -1
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pkg-classics/collection/index?id=${id}` }).catch(() => {
    uni.showToast({ title: '页面打开失败，请重试', icon: 'none' })
  })
}

// 对齐原型 list.likes.toLocaleString()
function fmtLikes(n: number): string {
  return n.toLocaleString('en-US')
}
</script>

<template>
  <app-safe-area-top />
  <view class="lp-page">
    <ClassicsHeader title="精选书单" />

    <!-- Hero -->
    <view class="lp-hero">
      <text class="lp-kicker">名家甄选</text>
      <text class="lp-hero-title">循路而读</text>
      <text class="lp-hero-sub">编辑与达人整理的主题书单，少走弯路。</text>
    </view>

    <!-- 书单列表 -->
    <view class="lp-list">
      <view v-if="loading" class="lp-card" style="text-align:center;padding:64rpx;">
        <text style="color:var(--muted-foreground);">加载中...</text>
      </view>
      <view v-else-if="error" class="lp-card" style="text-align:center;padding:64rpx;">
        <text style="color:#c41e3a;">{{ error }}</text>
        <view style="margin-top:16rpx;" @tap="fetchData">
          <text style="color:var(--muted-foreground);">重试</text>
        </view>
      </view>
      <!-- 真实空态：当前没有已发布书单 -->
      <view v-else-if="!lists.length" class="lp-card" style="text-align:center;padding:80rpx 48rpx;">
        <text style="display:block;font-size:30rpx;font-weight:600;color:var(--foreground);">暂无已发布书单</text>
        <text style="display:block;margin-top:16rpx;font-size:26rpx;line-height:1.6;color:var(--muted-foreground);">主题书单发布后将在这里展示。</text>
      </view>
      <view v-else v-for="list in lists" :key="list.id" class="lp-card">
        <!-- 卡片主体（可点击进入详情） -->
        <view class="lp-card-body" @tap="goDetail(list.id)">
          <text class="lp-card-title">{{ list.title }}</text>
          <text class="lp-card-author">@{{ list.author }} · {{ list.bookCount }} 本书</text>
          <text class="lp-card-desc">{{ list.desc }}</text>

          <!-- 书封堆叠 -->
          <view class="lp-covers">
            <view v-for="(b, i) in list.books" :key="i" class="lp-cover-item">
              <FlatCover :title="b.title" :cover-color="coverColorForBook(b.title)" title-size="28rpx" />
            </view>
            <view class="lp-cover-more">
              <text class="lp-cover-more-txt">+{{ list.bookCount - list.books.length }}</text>
              <text class="lp-cover-more-label">本</text>
            </view>
          </view>

          <!-- 标签 -->
          <view class="lp-tags">
            <view v-for="(t, i) in list.tags" :key="i" class="lp-tag">#{{ t }}</view>
          </view>
        </view>

        <!-- 底部操作栏 -->
        <view class="lp-card-foot">
          <view class="lp-foot-btn">
            <app-icon name="heart" :size="32" color="#999999" />
            <text class="lp-foot-txt">{{ fmtLikes(list.likes) }} 收藏</text>
          </view>
          <view class="lp-foot-view" @tap.stop="goDetail(list.id)">
            <text class="lp-foot-view-txt">查看书单</text>
            <app-icon name="chevron-right" :size="32" color="#c41e3a" />
          </view>
        </view>
      </view>
    </view>

    <view class="lp-bottom-safe" />
  </view>
</template>

<style scoped lang="scss">
.lp-page {
  min-height: 100vh;
  background: #f4f2ee;
}

/* 头部创建按钮 */
.lp-create {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 0 4rpx;
}
.lp-create-txt {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--brand);
}

/* Hero */
.lp-hero {
  display: flex;
  flex-direction: column;
  padding: 16rpx 40rpx 32rpx;
}
.lp-kicker {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--brand);
  letter-spacing: 1rpx;
  margin-bottom: 12rpx;
}
.lp-hero-title {
  font-size: 68rpx;
  font-weight: 700;
  color: var(--foreground);
  line-height: 1.1;
  letter-spacing: -0.5rpx;
}
.lp-hero-sub {
  margin-top: 16rpx;
  font-size: 28rpx;
  color: var(--muted-foreground);
}

/* 列表 */
.lp-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  padding: 0 40rpx;
}
.lp-card {
  background: var(--card);
  border-radius: 48rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  border: 1rpx solid rgba(0, 0, 0, 0.04);
}
.lp-card-body {
  padding: 40rpx;
}
.lp-card-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--foreground);
}
.lp-card-author {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--muted-foreground);
}
.lp-card-desc {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--muted-foreground);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 书封堆叠 */
.lp-covers {
  display: flex;
  /* 默认 stretch：封面高度由 flat-cover 内部 3:4 撑出（不受 stretch 影响），
     「+N本」占位块无固有高度，跟随行高与封面精确等高（替代 aspect-ratio·X5 兼容） */
  gap: 20rpx;
  margin-top: 32rpx;
}
.lp-cover-item {
  flex: 1;
  max-width: 160rpx;
}
.lp-cover-more {
  flex: 1;
  max-width: 144rpx;
  /* 高度随 flex 行 stretch 与封面等高（去 aspect-ratio：X5 老内核塌陷） */
  border-radius: 32rpx;
  background: var(--muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.lp-cover-more-txt {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--muted-foreground);
}
.lp-cover-more-label {
  font-size: 20rpx;
  color: var(--muted-foreground);
}

/* 标签 */
.lp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 32rpx;
}
.lp-tag {
  flex-shrink: 0;
  white-space: nowrap;
  padding: 4rpx 16rpx;
  border-radius: 9999rpx;
  background: var(--muted);
  font-size: 22rpx;
  color: var(--muted-foreground);
}

/* 底部操作栏 */
.lp-card-foot {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 24rpx 40rpx;
  border-top: 1rpx solid color-mix(in srgb, var(--border) 60%, transparent);
}
.lp-foot-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.lp-foot-txt {
  font-size: 26rpx;
  color: var(--muted-foreground);
}
.lp-foot-view {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.lp-foot-view-txt {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--brand);
}
.lp-bottom-safe {
  height: calc(40rpx + env(safe-area-inset-bottom));
}
</style>
