<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { userApi } from "@/api";

const list = ref<any[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const form = ref({ userId: "", reason: "" });

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await userApi.listWhitelist();
    list.value = (data as any)?.entries ?? data ?? [];
  } finally {
    loading.value = false;
  }
}

async function handleAdd() {
  if (!form.value.userId.trim()) return;
  try {
    await userApi.addWhitelist({ userId: form.value.userId.trim(), reason: form.value.reason || undefined });
    ElMessage.success("添加成功");
    dialogVisible.value = false;
    form.value = { userId: "", reason: "" };
    fetchList();
  } catch { /* handled by interceptor */ }
}

async function handleRemove(userId: string) {
  try {
    await ElMessageBox.confirm("确认移除该IP白名单？", "操作确认", { type: "warning" });
    await userApi.removeWhitelist(userId);
    ElMessage.success("已移除");
    fetchList();
  } catch { /* 用户取消 */ }
}
</script>

<template>
  <div class="page">
    <div class="header">
      <h2>IP白名单管理</h2>
      <el-button type="primary" @click="dialogVisible = true">添加白名单</el-button>
    </div>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="userId" label="用户ID" width="280" />
      <el-table-column prop="userName" label="用户名" width="150">
        <template #default="{ row }">{{ row.user?.nickname || row.userName || '-' }}</template>
      </el-table-column>
      <el-table-column prop="ip" label="IP地址" width="180" />
      <el-table-column prop="reason" label="原因" min-width="200">
        <template #default="{ row }">{{ row.reason || '-' }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="添加时间" width="180">
        <template #default="{ row }">{{ row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="danger" link @click="handleRemove(row.userId)">移除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="添加IP白名单" width="450px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="用户ID" required>
          <el-input v-model="form.userId" placeholder="输入用户ID" />
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="form.reason" placeholder="可选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; }
</style>
