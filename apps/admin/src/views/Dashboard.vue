<template>
  <div class="dashboard">
    <h3>仪表盘</h3>

    <!-- 核心指标 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">文章总数</span>
            <span class="stat-val">{{ fmt(stats.articleCount) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">用户总数</span>
            <span class="stat-val blue">{{ fmt(stats.userCount) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">课程总数</span>
            <span class="stat-val green">{{ fmt(stats.courseCount) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">古籍总数</span>
            <span class="stat-val brown">{{ fmt(stats.classicBookCount) }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 互动指标 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">总浏览量</span>
            <span class="stat-val">{{ fmt(stats.totalViews) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">总点赞数</span>
            <span class="stat-val orange">{{ fmt(stats.totalLikes) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">总评论数</span>
            <span class="stat-val purple">{{ fmt(stats.totalComments) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">总收藏数</span>
            <span class="stat-val">{{ fmt(stats.totalCollects) }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 业务指标 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">圈子总数</span>
            <span class="stat-val">{{ fmt(stats.circleCount) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">商品总数</span>
            <span class="stat-val orange">{{ fmt(stats.productCount) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">订单总数</span>
            <span class="stat-val blue">{{ fmt(stats.orderCount) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">已支付订单</span>
            <span class="stat-val green">{{ fmt(stats.paidOrderCount) }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 今日/本月 + 多媒体 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card today">
          <div class="stat-inner">
            <span class="stat-label">今日新用户</span>
            <span class="stat-val blue">{{ fmt(stats.todayNewUsers) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">本月新用户</span>
            <span class="stat-val">{{ fmt(stats.monthNewUsers) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">本月新文章</span>
            <span class="stat-val green">{{ fmt(stats.monthNewArticles) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card alert">
          <div class="stat-inner">
            <span class="stat-label">待处理举报</span>
            <span class="stat-val warn">{{ fmt(stats.pendingReports) }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 多媒体 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">直播间</span>
            <span class="stat-val red">{{ fmt(stats.liveRoomCount) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner">
            <span class="stat-label">短视频</span>
            <span class="stat-val purple">{{ fmt(stats.videoCount) }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { dashboardApi } from "@/api";

const stats = ref<any>({});

function fmt(v: number | undefined): string {
  if (v === undefined || v === null) return "--";
  if (v >= 10000) return (v / 10000).toFixed(1) + "w";
  if (v >= 1000) return (v / 1000).toFixed(1) + "k";
  return String(v);
}

onMounted(async () => {
  try {
    const res = await dashboardApi.stats();
    stats.value = res.data ?? res;
  } catch { /* 忽略 */ }
});
</script>

<style scoped>
.dashboard h3 {
  margin: 0 0 16px;
  font-size: 18px;
  color: #333;
}

.stat-row {
  margin-bottom: 16px;
}

.stat-card {
  border-radius: 8px;
}
.stat-card.today {
  border-left: 3px solid #409eff;
}
.stat-card.alert {
  border-left: 3px solid #e6a23c;
}

.stat-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-size: 13px;
  color: #999;
}

.stat-val {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}
.stat-val.blue { color: #409eff; }
.stat-val.green { color: #67c23a; }
.stat-val.orange { color: #e6a23c; }
.stat-val.red { color: #f56c6c; }
.stat-val.purple { color: #9b59b6; }
.stat-val.brown { color: #8b4513; }
.stat-val.warn { color: #e6a23c; }
</style>
