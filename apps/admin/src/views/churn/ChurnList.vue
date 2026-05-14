<template>
  <div class="page">
    <div class="header">
      <h2>流失预测</h2>
      <el-button type="primary" :loading="scoring" @click="handleScore">
        {{ scoring ? '评分中...' : '执行评分' }}
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-low">
          <div class="stat-label">低风险</div>
          <div class="stat-value">{{ stats.LOW || 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-medium">
          <div class="stat-label">中风险</div>
          <div class="stat-value">{{ stats.MEDIUM || 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-high">
          <div class="stat-label">高风险</div>
          <div class="stat-value">{{ stats.HIGH || 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-critical">
          <div class="stat-label">严重风险</div>
          <div class="stat-value">{{ stats.CRITICAL || 0 }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-form :inline="true" class="search-bar">
      <el-form-item label="风险等级">
        <el-select v-model="filterRiskLevel" placeholder="全部" clearable>
          <el-option label="低风险" value="LOW" />
          <el-option label="中风险" value="MEDIUM" />
          <el-option label="高风险" value="HIGH" />
          <el-option label="严重风险" value="CRITICAL" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="fetchList">搜索</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="userId" label="用户ID" width="200" />
      <el-table-column prop="activityScore" label="活跃度评分" width="120" sortable />
      <el-table-column prop="riskLevel" label="风险等级" width="110">
        <template #default="{ row }">
          <el-tag :type="riskTag(row.riskLevel)">{{ riskLabel(row.riskLevel) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="daysSinceActive" label="未活跃天数" width="120" sortable />
      <el-table-column prop="churnFactors" label="流失因素" min-width="200" show-overflow-tooltip />
      <el-table-column prop="predictedAt" label="预测时间" width="170" />
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, sizes, prev, pager, next"
      @current-change="fetchList"
      @size-change="fetchList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";

const loading = ref(false);
const scoring = ref(false);
const list = ref<any[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterRiskLevel = ref("");
const stats = ref({ LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 });

function riskTag(level: string) {
  const map: Record<string, string> = { LOW: "success", MEDIUM: "warning", HIGH: "danger", CRITICAL: "danger" };
  return map[level] || "info";
}

function riskLabel(level: string) {
  const map: Record<string, string> = { LOW: "低风险", MEDIUM: "中风险", HIGH: "高风险", CRITICAL: "严重风险" };
  return map[level] || level;
}

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize: pageSize.value };
    if (filterRiskLevel.value) params.riskLevel = filterRiskLevel.value;
    const res = await axios.get("/admin/churn/predictions", { params });
    list.value = res.data.list || res.data.rows || [];
    total.value = res.data.total || 0;
  } catch {
    ElMessage.error("获取流失预测列表失败");
  } finally {
    loading.value = false;
  }
}

async function fetchStats() {
  try {
    const res = await axios.get("/admin/churn/stats");
    stats.value = res.data || { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  } catch {
    // ignore
  }
}

async function handleScore() {
  scoring.value = true;
  try {
    await axios.post("/admin/churn/score");
    ElMessage.success("评分完成");
    fetchList();
    fetchStats();
  } catch {
    ElMessage.error("评分执行失败");
  } finally {
    scoring.value = false;
  }
}

onMounted(() => {
  fetchList();
  fetchStats();
});
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.search-bar { margin-bottom: 20px; }
.stats-row { margin-bottom: 20px; }
.stat-card { text-align: center; }
.stat-label { font-size: 14px; color: #999; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: bold; }
.stat-low .stat-value { color: #67c23a; }
.stat-medium .stat-value { color: #e6a23c; }
.stat-high .stat-value { color: #f56c6c; }
.stat-critical .stat-value { color: #b71c1c; }
</style>
