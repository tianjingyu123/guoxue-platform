<template>
  <view class="page">
    <view class="title-row">课程</view>
    <view v-for="c in courses" :key="c.id" class="course-card" @click="goDetail(c.id)">
      <image v-if="c.cover" :src="c.cover" class="cover" mode="aspectFill" />
      <view class="info">
        <text class="name">{{ c.title }}</text>
        <text class="intro">{{ c.intro }}</text>
        <view class="bottom">
          <text class="price" v-if="c.price > 0">¥{{ c.price }}</text>
          <text class="price free" v-else>免费</text>
          <text class="students">{{ c.studentCount }} 学员</text>
        </view>
      </view>
    </view>
    <view v-if="courses.length === 0" class="empty">暂无课程</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { courseApi } from "../../api";

const courses = ref<any[]>([]);

onMounted(async () => {
  const data = await courseApi.list({ pageSize: 50 });
  courses.value = data.courses;
});

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}&type=COURSE` });
}
</script>

<style>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; }
.title-row { font-size: 18px; font-weight: bold; color: #8b4513; margin-bottom: 12px; }
.course-card { display: flex; gap: 12px; background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.cover { width: 100px; height: 70px; border-radius: 6px; flex-shrink: 0; }
.info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
.name { font-size: 15px; font-weight: bold; color: #333; }
.intro { font-size: 12px; color: #999; }
.bottom { display: flex; justify-content: space-between; align-items: center; }
.price { font-size: 16px; color: #e74c3c; font-weight: bold; }
.price.free { color: #2e7d32; }
.students { font-size: 12px; color: #999; }
.empty { text-align: center; color: #999; padding: 40px; }
</style>
