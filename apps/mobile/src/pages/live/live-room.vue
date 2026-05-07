<template>
  <view class="page">
    <view v-if="room" class="room-body">
      <!-- 视频区 -->
      <view class="player-area">
        <image v-if="room.cover" :src="room.cover" class="cover" mode="aspectFill" />
        <view class="player-mask">
          <text class="player-hint">{{ room.status === 'LIVING' ? '直播中' : room.status === 'REPLAY' ? '回放' : '即将开始' }}</text>
          <text class="player-count">{{ room.viewCount || 0 }} 人观看</text>
        </view>
      </view>

      <!-- 房间信息 -->
      <view class="room-detail">
        <text class="room-title">{{ room.title }}</text>
        <text class="room-host">{{ room.hostName || room.user?.nickname }}</text>
        <text class="room-intro" v-if="room.intro">{{ room.intro }}</text>
      </view>
    </view>

    <view v-else-if="loading" class="empty">加载中...</view>
    <view v-else class="empty">房间不存在</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { liveApi } from "../../api";

const id = ref("");
const room = ref<any>(null);
const loading = ref(true);

onMounted(() => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  const opts = page?.$page?.options || page?.options || {};
  id.value = opts.id || "";
  if (id.value) fetchRoom();
  else loading.value = false;
});

async function fetchRoom() {
  try {
    room.value = await liveApi.roomDetail(id.value);
  } catch { /* */ }
  finally { loading.value = false; }
}
</script>

<style>
.page { background: #1a1a2e; min-height: 100vh; }
.room-body { color: #fff; }
.player-area { position: relative; width: 100%; height: 240px; }
.cover { width: 100%; height: 100%; }
.player-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
.player-hint { font-size: 20px; color: #fff; }
.player-count { font-size: 13px; color: rgba(255,255,255,0.7); }
.room-detail { padding: 16px; }
.room-title { font-size: 18px; font-weight: bold; display: block; }
.room-host { font-size: 14px; color: #c4943a; margin-top: 4px; display: block; }
.room-intro { font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 8px; display: block; line-height: 1.6; }
.empty { text-align: center; color: rgba(255,255,255,0.5); padding: 80px; font-size: 14px; }
</style>
