<template>
  <view class="page">
    <view class="title-row">直播</view>

    <view class="tabs">
      <text v-for="t in tabs" :key="t.value" class="tab" :class="{ active: activeTab === t.value }" @click="switchTab(t.value)">{{ t.label }}</text>
    </view>

    <view v-if="loading" class="loading">加载中...</view>
    <view v-else>
      <view v-for="room in rooms" :key="room.id" class="room-card" @click="goRoom(room.id)">
        <image v-if="room.cover" :src="room.cover" class="room-cover" mode="aspectFill" />
        <view class="room-info">
          <view class="room-header">
            <text class="room-title">{{ room.title }}</text>
            <text class="room-status" :class="'status-' + room.status">
              {{ room.status === 'LIVING' ? '直播中' : room.status === 'UPCOMING' ? '预告' : '回放' }}
            </text>
          </view>
          <text class="room-host">{{ room.hostName || room.user?.nickname || '国学讲师' }}</text>
          <view class="room-stats">
            <text>{{ room.viewCount || 0 }} 观看</text>
            <text v-if="room.startAt && room.status === 'UPCOMING'">{{ formatDate(room.startAt) }}</text>
          </view>
        </view>
      </view>
    </view>
    <view v-if="!loading && rooms.length === 0" class="empty">暂无直播</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { liveApi } from "../../api";

const rooms = ref<any[]>([]);
const activeTab = ref("all");
const loading = ref(false);

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
    rooms.value = data.rooms || data || [];
  } catch { /* */ }
  finally { loading.value = false; }
}

function switchTab(tab: string) {
  activeTab.value = tab;
  fetchRooms();
}

function goRoom(id: string) {
  uni.navigateTo({ url: "/pages/live/live-room?id=" + id });
}

function formatDate(t: string) {
  if (!t) return "";
  const d = new Date(t);
  return (d.getMonth() + 1) + "/" + d.getDate() + " " + d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
}
</script>

<style>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; }
.title-row { font-size: 18px; font-weight: bold; color: #8b4513; margin-bottom: 12px; }
.tabs { display: flex; gap: 12px; margin-bottom: 12px; }
.tab { font-size: 14px; color: #666; padding: 4px 12px; border-radius: 14px; background: #fff; }
.tab.active { background: #8b4513; color: #fff; }
.room-card { background: #fff; border-radius: 8px; margin-bottom: 10px; overflow: hidden; }
.room-cover { width: 100%; height: 160px; }
.room-info { padding: 12px; }
.room-header { display: flex; justify-content: space-between; align-items: center; }
.room-title { font-size: 15px; font-weight: bold; color: #333; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.room-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; flex-shrink: 0; margin-left: 8px; }
.status-LIVING { background: #e74c3c; color: #fff; }
.status-UPCOMING { background: #f39c12; color: #fff; }
.status-REPLAY { background: #95a5a6; color: #fff; }
.room-host { font-size: 13px; color: #8b4513; margin-top: 4px; display: block; }
.room-stats { font-size: 12px; color: #999; margin-top: 6px; display: flex; gap: 12px; }
.loading, .empty { text-align: center; color: #999; padding: 40px; font-size: 14px; }
</style>
