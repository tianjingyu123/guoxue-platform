<template>
  <div class="page">
    <div class="header">
      <h2>直播管理</h2>
      <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width:120px" @change="fetchList">
        <el-option label="全部" value="" />
        <el-option label="待开播" value="PENDING" />
        <el-option label="直播中" value="LIVING" />
        <el-option label="已结束" value="ENDED" />
        <el-option label="回放" value="REPLAY" />
      </el-select>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="title" label="直播间" min-width="180" show-overflow-tooltip />
      <el-table-column prop="host.nickname" label="主播" width="100" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'LIVING' ? 'danger' : row.status === 'ENDED' ? 'info' : row.status === 'REPLAY' ? 'success' : 'warning'" size="small">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="viewCount" label="观看" width="80" />
      <el-table-column prop="createdAt" label="创建时间" width="170">
        <template #default="{ row }">{{ row.createdAt?.slice(0,16).replace('T',' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'LIVING'" size="small" type="danger" @click="endRoom(row)">结束</el-button>
          <el-button size="small" type="primary" @click="viewDetail(row)">详情</el-button>
          <el-button size="small" type="danger" @click="del(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="detailVisible" title="直播详情" width="600px">
      <div v-if="detail" class="detail">
        <p><b>标题：</b>{{ detail.title }}</p>
        <p><b>主播：</b>{{ detail.host?.nickname }}</p>
        <p><b>状态：</b>{{ statusLabel(detail.status) }}</p>
        <p v-if="detail.coverUrl"><b>封面：</b>{{ detail.coverUrl }}</p>
        <p v-if="detail.replayUrl"><b>回放：</b>{{ detail.replayUrl }}</p>
        <p><b>观众数：</b>{{ detail.viewCount }}</p>
        <p><b>创建时间：</b>{{ detail.createdAt?.slice(0,16).replace('T',' ') }}</p>
        <p v-if="detail.startedAt"><b>开播时间：</b>{{ detail.startedAt?.slice(0,16).replace('T',' ') }}</p>
        <p v-if="detail.endedAt"><b>结束时间：</b>{{ detail.endedAt?.slice(0,16).replace('T',' ') }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { liveApi } from "@/api";

const list = ref<any[]>([]);
const loading = ref(false);
const statusFilter = ref("");
const detailVisible = ref(false);
const detail = ref<any>(null);

onMounted(() => fetchList());

function statusLabel(s: string) {
  const m: Record<string, string> = { PENDING: "待开播", LIVING: "直播中", ENDED: "已结束", REPLAY: "回放" };
  return m[s] || s;
}

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { pageSize: 100 };
    if (statusFilter.value) params.status = statusFilter.value;
    const { data } = await liveApi.rooms(params);
    list.value = data.rooms || data || [];
  } finally { loading.value = false; }
}

async function viewDetail(row: any) {
  try {
    const { data } = await liveApi.detail(row.id);
    detail.value = data;
    detailVisible.value = true;
  } catch { /* */ }
}

function endRoom(row: any) {
  ElMessageBox.confirm("确定结束该直播？", "警告", { type: "warning" }).then(async () => {
    await liveApi.endRoom(row.id);
    ElMessage.success("直播已结束");
    fetchList();
  }).catch(() => {});
}

function del(id: string) {
  ElMessageBox.confirm("确定删除？", "警告", { type: "warning" }).then(async () => {
    await liveApi.remove(id);
    ElMessage.success("已删除");
    fetchList();
  }).catch(() => {});
}
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; color: #8b4513; }
.detail p { margin: 6px 0; font-size: 14px; color: #333; }
</style>
