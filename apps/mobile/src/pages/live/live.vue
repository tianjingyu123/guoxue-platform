<template>
  <view class="page">
    <view class="header">
      <view class="header-top">
        <text class="header-title">直播</text>
        <text class="header-create" @click="goCreate">✚ 开播</text>
      </view>
      <text class="header-sub">国学讲堂 · 在线互动</text>
    </view>

    <!-- 分类标签 -->
    <scroll-view scroll-x class="tabs-scroll">
      <text
        v-for="t in tabs"
        :key="t.value"
        class="tab"
        :class="{ active: activeTab === t.value }"
        @click="switchTab(t.value)"
      >{{ t.label }}</text>
    </scroll-view>

    <!-- 直播中横幅提示 -->
    <view v-if="livingCount > 0" class="living-bar" @click="switchTab('LIVING')">
      <view class="living-dot" />
      <text>{{ livingCount }} 场直播正在进行中</text>
      <text class="living-arrow">查看 →</text>
    </view>

    <!-- 直播列表 -->
    <scroll-view
      scroll-y
      class="room-list"
      refresher-enabled
      @refresherrefresh="onRefresh"
      :refresher-triggered="refreshing"
    >
      <view v-for="room in rooms" :key="room.id" class="room-card" @click="goRoom(room.id)">
        <view class="rc-cover-wrap">
          <image v-if="room.cover" :src="room.cover" class="rc-cover" mode="aspectFill" />
          <view v-else class="rc-placeholder">
            <text class="rc-placeholder-icon">📡</text>
          </view>
          <!-- 状态角标 -->
          <view class="rc-status" :class="'rc-' + room.status">
            <view v-if="room.status === 'LIVING'" class="rc-live-dot" />
            <text>{{ statusLabel(room.status) }}</text>
          </view>
          <!-- 观看人数 -->
          <view class="rc-viewers" v-if="room.status === 'LIVING'">
            <text>👁 {{ formatCount(room.viewCount) }}</text>
          </view>
        </view>

        <view class="rc-info">
          <view class="rc-title-row">
            <text class="rc-title">{{ room.title }}</text>
            <text v-if="room.isPinned" class="rc-pinned">📌 置顶</text>
          </view>

          <view class="rc-host-row">
            <image v-if="room.hostAvatar" :src="room.hostAvatar" class="rc-host-avatar" mode="aspectFill" />
            <view v-else class="rc-host-avatar-placeholder" />
            <text class="rc-host-name">{{ room.hostName || room.user?.nickname || '国学讲师' }}</text>
            <text v-if="room.hostTitle" class="rc-host-title">{{ room.hostTitle }}</text>
          </view>

          <view class="rc-bottom">
            <text class="rc-time" v-if="room.status === 'UPCOMING' && room.startAt">
              🕐 {{ formatDateTime(room.startAt) }}
            </text>
            <text class="rc-time" v-else-if="room.status === 'REPLAY'">
              ▶ 回放
            </text>
            <text class="rc-time" v-else>
              热度 {{ formatCount(room.viewCount || 0) }}
            </text>
            <text class="rc-tag" v-if="room.tags?.length">
              {{ room.tags[0] }}
            </text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="!loading && rooms.length === 0" class="empty">
        <text class="empty-icon">📡</text>
        <text>暂无直播</text>
      </view>
    </scroll-view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { liveApi } from "../../api";

const rooms = ref<any[]>([]);
const activeTab = ref("all");
const loading = ref(false);
const refreshing = ref(false);
const livingCount = ref(0);

const tabs = [
  { label: "全部", value: "all" },
  { label: "直播中", value: "LIVING" },
  { label: "预告", value: "UPCOMING" },
  { label: "回放", value: "REPLAY" },
];

onMounted(() => fetchRooms());

async function fetchRooms() {
  loading.value = true;
  try {
    const params: any = { pageSize: 50 };
    if (activeTab.value !== "all") params.status = activeTab.value;
    const data = await liveApi.rooms(params);
    rooms.value = data.rooms || data.list || data || [];

    // 统计直播中个数
    if (activeTab.value === "all") {
      livingCount.value = rooms.value.filter((r) => r.status === "LIVING").length;
    }
  } catch { /* */ }
  finally {
    loading.value = false;
    refreshing.value = false;
  }
}

function onRefresh() {
  refreshing.value = true;
  fetchRooms();
}

function switchTab(tab: string) {
  activeTab.value = tab;
  fetchRooms();
}

function goCreate() {
  uni.navigateTo({ url: "/pages/live/create" });
}

function goRoom(id: string) {
  uni.navigateTo({ url: "/pages/live/live-room?id=" + id });
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    LIVING: "直播中",
    UPCOMING: "预告",
    REPLAY: "回放",
  };
  return map[s] || s;
}

function formatCount(n: number | undefined): string {
  if (!n) return "0";
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function formatDateTime(t: string): string {
  if (!t) return "";
  const d = new Date(t);
  const now = new Date();
  const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000);

  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const date = `${d.getMonth() + 1}/${d.getDate()}`;

  if (diffDays === 0) return `今天 ${time}`;
  if (diffDays === 1) return `明天 ${time}`;
  return `${date} ${time}`;
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding: 0;
}

.header {
  padding: 16px 12px 8px;
}
.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-title {
  font-size: 20px;
  font-weight: bold;
  color: #C41E3A;
}
.header-create {
  font-size: 13px;
  color: #fff;
  background: #C41E3A;
  padding: 5px 14px;
  border-radius: 14px;
  font-weight: 500;
}
.header-sub {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

/* 分类标签 */
.tabs-scroll {
  white-space: nowrap;
  padding: 8px 12px;
  display: flex;
  gap: 10px;
}
.tab {
  display: inline-block;
  font-size: 13px;
  color: #666;
  padding: 5px 14px;
  border-radius: 14px;
  background: #fff;
}
.tab.active {
  background: #C41E3A;
  color: #fff;
  font-weight: bold;
}

/* 直播中横幅 */
.living-bar {
  margin: 8px 12px;
  background: linear-gradient(90deg, #fef0f0, #fde2e2);
  border: 1px solid #f5c6c6;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #C41E3A;
}
.living-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #C41E3A;
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.living-arrow {
  margin-left: auto;
  font-weight: bold;
}

/* 直播列表 */
.room-list {
  padding: 0 12px;
}
.room-card {
  background: #fff;
  border-radius: 10px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.rc-cover-wrap {
  position: relative;
}
.rc-cover {
  width: 100%;
  height: 180px;
}
.rc-placeholder {
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, #1a1a3e, #2a2a5e);
  display: flex;
  align-items: center;
  justify-content: center;
}
.rc-placeholder-icon {
  font-size: 48px;
}

.rc-status {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 4px;
}
.rc-LIVING {
  background: #C41E3A;
}
.rc-UPCOMING {
  background: #f39c12;
}
.rc-REPLAY {
  background: rgba(0,0,0,0.5);
}
.rc-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  animation: pulse 1.5s infinite;
}

.rc-viewers {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 8px;
}

.rc-info {
  padding: 12px;
}
.rc-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.rc-title {
  font-size: 15px;
  font-weight: bold;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rc-pinned {
  font-size: 11px;
  color: #e6a23c;
  flex-shrink: 0;
}

.rc-host-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.rc-host-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
}
.rc-host-avatar-placeholder {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #E8E0D5;
}
.rc-host-name {
  font-size: 13px;
  color: #C41E3A;
}
.rc-host-title {
  font-size: 11px;
  color: #999;
  background: #F5F0E8;
  padding: 1px 6px;
  border-radius: 3px;
}

.rc-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rc-time {
  font-size: 12px;
  color: #999;
}
.rc-tag {
  font-size: 11px;
  color: #C9A96E;
  background: rgba(196,148,58,0.1);
  padding: 1px 8px;
  border-radius: 8px;
}

.empty {
  text-align: center;
  padding: 80px 0;
  color: #999;
}
.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 8px;
}
.loading {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 14px;
}
</style>
