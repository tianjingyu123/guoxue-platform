<template>
  <div>
    <h3>仪表盘</h3>
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :span="6">
        <el-card><div class="stat">文章总数<br/><b>{{ stats.articleCount ?? '--' }}</b></div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card><div class="stat">用户总数<br/><b>{{ stats.userCount ?? '--' }}</b></div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card><div class="stat">课程总数<br/><b>{{ stats.courseCount ?? '--' }}</b></div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card><div class="stat">古籍总数<br/><b>{{ stats.classicBookCount ?? '--' }}</b></div></el-card>
      </el-col>
    </el-row>
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card><div class="stat">圈子总数<br/><b>{{ stats.circleCount ?? '--' }}</b></div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card><div class="stat">商品总数<br/><b>{{ stats.productCount ?? '--' }}</b></div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card><div class="stat">今日新用户<br/><b>{{ stats.todayNewUsers ?? '--' }}</b></div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card><div class="stat">待处理举报<br/><b style="color:#e6a23c">{{ stats.pendingReports ?? '--' }}</b></div></el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { dashboardApi } from "@/api";

const stats = ref<any>({});

onMounted(async () => {
  try {
    const { data } = await dashboardApi.stats();
    stats.value = data;
  } catch { /* 忽略 */ }
});
</script>

<style scoped>
.stat { text-align: center; font-size: 14px; color: #999; }
.stat b { font-size: 28px; color: #333; display: block; margin-top: 8px; }
</style>
