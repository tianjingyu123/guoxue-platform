<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="header">
      <text class="header-title">通知</text>
      <text v-if="unreadCount > 0" class="read-all-btn" @click="handleReadAll">全部已读</text>
    </view>

    <!-- 未读计数提示 -->
    <view v-if="unreadCount > 0" class="unread-bar">
      你有 {{ unreadCount }} 条未读通知
    </view>

    <!-- 通知列表 -->
    <view class="list">
      <!-- 空状态 -->
      <view v-if="list.length === 0 && !loading" class="empty">
        <text class="empty-icon">📬</text>
        <text class="empty-text">暂无通知</text>
      </view>

      <!-- 通知项 -->
      <view
        v-for="item in list"
        :key="item.id"
        class="notify-item"
        :class="{ 'notify-unread': !item.isRead }"
        @click="handleClick(item)"
      >
        <view class="left-col">
          <view v-if="!item.isRead" class="red-dot" />
          <view class="icon-wrap" :class="'icon-' + item.type">
            <text>{{ iconMap[item.type] }}</text>
          </view>
        </view>

        <view class="content-col">
          <view class="title-line">
            <text class="notify-title">{{ item.title }}</text>
            <text class="notify-time">{{ timeAgo(item.createdAt) }}</text>
          </view>
          <text class="notify-summary">{{ item.content }}</text>
        </view>
      </view>

      <!-- 加载/结束指示 -->
      <view v-if="loadingMore" class="load-hint">加载中...</view>
      <view v-if="noMore && list.length > 0" class="load-hint">没有更多了</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { onPullDownRefresh, onReachBottom } from "@dcloudio/uni-app";
import { notifyApi } from "../../api";

interface NotificationItem {
  id: string;
  type: "system" | "like" | "comment" | "follow";
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  targetId?: string;
  targetType?: string;
  fromUserId?: string;
}

const list = ref<NotificationItem[]>([]);
const unreadCount = ref(0);
const loading = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
const page = ref(1);
const pageSize = 20;
const currentType = ref<string | undefined>(undefined);

const iconMap: Record<string, string> = {
  system: "系统",
  like: "赞",
  comment: "评",
  follow: "关",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const time = new Date(dateStr).getTime();
  const diff = Math.floor((now - time) / 1000);
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`;
  return `${Math.floor(diff / 2592000)}个月前`;
}

async function fetchList(append = false) {
  if (append) {
    loadingMore.value = true;
  } else {
    loading.value = true;
  }
  try {
    const params: any = { page: page.value, pageSize };
    if (currentType.value) params.type = currentType.value;
    const data = await notifyApi.list(params);
    const items = data.list || data.records || data || [];
    if (append) {
      list.value.push(...items);
    } else {
      list.value = items;
    }
    noMore.value = items.length < pageSize;
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

async function fetchUnread() {
  try {
    const data = await notifyApi.unreadCount();
    unreadCount.value = typeof data === "number" ? data : data.count ?? data.unreadCount ?? 0;
  } catch {
    // 静默失败
  }
}

async function handleReadAll() {
  await notifyApi.readAll();
  unreadCount.value = 0;
  list.value.forEach((item) => (item.isRead = true));
  uni.showToast({ title: "已全部标记已读", icon: "none" });
}

async function handleClick(item: NotificationItem) {
  // 标记已读
  if (!item.isRead) {
    try {
      await notifyApi.markRead(item.id);
      item.isRead = true;
      if (unreadCount.value > 0) unreadCount.value--;
    } catch {
      // 静默失败
    }
  }

  // 跳转
  switch (item.type) {
    case "system":
      // 系统消息无跳转
      break;
    case "like":
    case "comment":
      if (item.targetId && item.targetType) {
        uni.navigateTo({
          url: `/pages/detail/detail?id=${item.targetId}&type=${item.targetType}`,
        });
      }
      break;
    case "follow":
      if (item.fromUserId) {
        uni.navigateTo({
          url: `/pages/user/user?id=${item.fromUserId}`,
        });
      }
      break;
  }
}

function loadMore() {
  if (noMore.value || loadingMore.value) return;
  page.value++;
  fetchList(true);
}

onMounted(async () => {
  fetchUnread();
  fetchList(false);
});

// 页面级下拉刷新
onPullDownRefresh(async () => {
  page.value = 1;
  noMore.value = false;
  await fetchList(false);
  await fetchUnread();
  uni.stopPullDownRefresh();
});

// 页面级触底加载更多
onReachBottom(() => {
  loadMore();
});
</script>

<style>
.page {
  padding: 0;
  background: #F5F0E8;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 顶部 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #E8E0D5;
}
.header-title {
  font-size: 18px;
  font-weight: bold;
  color: #C41E3A;
}
.read-all-btn {
  font-size: 13px;
  color: #C41E3A;
  padding: 4px 12px;
  border: 1px solid #C41E3A;
  border-radius: 12px;
}
.read-all-btn:active {
  opacity: 0.7;
}

/* 未读计数 */
.unread-bar {
  background: #fff8e7;
  color: #C41E3A;
  font-size: 12px;
  padding: 6px 16px;
  border-bottom: 1px solid #f0e6d6;
}

/* 列表 */
.list {
  padding-bottom: 20px;
}

/* 通知卡片 */
.notify-item {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  background: #fff;
  border-bottom: 1px solid #f0e6d6;
}
.notify-item:active {
  background: #faf5ee;
}
.notify-unread {
  background: #fffcf5;
}

/* 左侧 */
.left-col {
  position: relative;
  width: 36px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.red-dot {
  position: absolute;
  top: 0;
  left: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #C41E3A;
}
.icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #fff;
}
.icon-system { background: #999; }
.icon-like { background: #C41E3A; }
.icon-comment { background: #3498db; }
.icon-follow { background: #2ecc71; }

/* 右侧内容 */
.content-col {
  flex: 1;
  min-width: 0;
}
.title-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.notify-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}
.notify-time {
  font-size: 11px;
  color: #bbb;
  flex-shrink: 0;
}
.notify-summary {
  font-size: 13px;
  color: #999;
  display: block;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 空状态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 0;
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
}
.empty-text {
  font-size: 14px;
  color: #ccc;
}

/* 底部加载状态 */
.load-hint {
  text-align: center;
  font-size: 13px;
  color: #ccc;
  padding: 16px 0;
}
</style>
