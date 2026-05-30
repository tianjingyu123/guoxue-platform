<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { systemApi } from "@/api";

const jobs = ref<any[]>([]);
const loading = ref(false);
const status = ref<any>({});

onMounted(() => fetchStatus());

async function fetchStatus() {
  loading.value = true;
  try {
    const { data } = await systemApi.getCronStatus();
    status.value = data ?? {};
    jobs.value = (data as any)?.jobs ?? [];
  } finally {
    loading.value = false;
  }
}

async function triggerJob(jobName: string) {
  try {
    await ElMessageBox.confirm(`确认手动触发 "${jobName}" 任务？`, "操作确认", { type: "warning" });
    await systemApi.triggerCron(jobName);
    ElMessage.success(`任务 ${jobName} 已触发`);
    fetchStatus();
  } catch { /* 用户取消 */ }
}

function getStatusTag(s: string) {
  if (s === "running" || s === "active") return "success";
  if (s === "idle" || s === "pending") return "info";
  if (s === "error" || s === "failed") return "danger";
  return "info";
}

function formatLastRun(v: any) {
  if (!v) return "-";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}
</script>

<template>
  <div class="page">
    <div class="header">
      <h2>Cron 定时任务管理</h2>
      <el-button @click="fetchStatus" :loading="loading">刷新</el-button>
    </div>

    <el-table v-loading="loading" :data="jobs" border stripe>
      <el-table-column prop="name" label="任务名称" width="250" />
      <el-table-column prop="schedule" label="调度规则" width="180">
        <template #default="{ row }">{{ row.schedule || row.cron || '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="getStatusTag(row.status)">{{ row.status || '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="上次执行" width="180">
        <template #default="{ row }">{{ formatLastRun(row.lastRun || row.lastRunAt) }}</template>
      </el-table-column>
      <el-table-column label="下次执行" width="180">
        <template #default="{ row }">{{ formatLastRun(row.nextRun || row.nextRunAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="triggerJob(row.name)">手动触发</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; }
</style>
