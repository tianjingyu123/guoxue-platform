<template>
  <view class="page">
    <view class="title-row">圈子</view>
    <view v-for="c in circles" :key="c.id" class="circle-card" @click="goCircle(c.id)">
      <image v-if="c.cover" :src="c.cover" class="cover" mode="aspectFill" />
      <view class="info">
        <text class="name">{{ c.name }}</text>
        <text class="intro">{{ c.intro }}</text>
        <view class="bottom">
          <text class="count">{{ c.memberCount }} 成员</text>
          <text class="count">{{ c.postCount }} 帖子</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { circleApi } from "../../api";

const circles = ref<any[]>([]);

onMounted(async () => {
  const data = await circleApi.list();
  circles.value = data.circles || data;
});

function goCircle(id: string) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}&type=CIRCLE` });
}
</script>

<style>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; }
.title-row { font-size: 18px; font-weight: bold; color: #8b4513; margin-bottom: 12px; }
.circle-card { display: flex; gap: 12px; background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.cover { width: 64px; height: 64px; border-radius: 8px; flex-shrink: 0; }
.info { flex: 1; }
.name { font-size: 16px; font-weight: bold; color: #333; }
.intro { font-size: 12px; color: #999; margin: 4px 0; display: block; }
.bottom { display: flex; gap: 16px; margin-top: 4px; }
.count { font-size: 12px; color: #8b4513; }
</style>
