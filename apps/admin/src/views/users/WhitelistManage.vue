<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { userApi } from "@/api";

const list = ref<any[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const form = ref({ userId: "", reason: "" });

// 客户端分页（后端 /users/whitelist 一次性返回全部条目，无分页参数）
const page = ref(1);
const pageSize = ref(20);
const total = computed(() => list.value.length);
const pagedList = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return list.value.slice(start, start + pageSize.value);
});

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await userApi.listWhitelist();
    list.value = (data as any)?.entries ?? data ?? [];
    // 数据变动后修正当前页越界
    const maxPage = Math.max(1, Math.ceil(list.value.length / pageSize.value));
    if (page.value > maxPage) page.value = maxPage;
  } finally {
    loading.value = false;
  }
}

async function copyId(id?: string) {
  if (!id) return;
  try { await navigator.clipboard.writeText(id); ElMessage.success("已复制"); } catch { /* 忽略 */ }
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

async function handleRemove(row: any) {
  const who = row.user?.nickname || row.userName || row.userId;
  try {
    await ElMessageBox.confirm(`确认将用户「${who}」移出白名单？移出后该用户将恢复受风控/限流等策略约束。`, "移除白名单确认", { type: "warning", confirmButtonText: "确认移除" });
    await userApi.removeWhitelist(row.userId);
    ElMessage.success("已移除");
    fetchList();
  } catch { /* 用户取消 */ }
}
</script>

<template>
  <div class="page">
    <div class="header">
      <h2>用户白名单管理</h2>
      <el-button
        type="primary"
        @click="dialogVisible = true"
      >
        添加白名单
      </el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="用户白名单"
      description="白名单内的用户可豁免风控、限流等策略限制。按「用户」维度管理，非 IP 白名单。"
      style="margin-bottom:12px"
    />

    <el-table
      v-loading="loading"
      :data="pagedList"
      border
      stripe
    >
      <template #empty>
        <el-empty description="暂无白名单用户" />
      </template>
      <el-table-column
        label="用户"
        min-width="180"
      >
        <template #default="{ row }">
          {{ row.user?.nickname || row.userName || '（未知昵称）' }}
        </template>
      </el-table-column>
      <el-table-column
        label="用户ID"
        width="240"
      >
        <template #default="{ row }">
          <span
            style="cursor:pointer;font-family:monospace"
            title="点击复制完整ID"
            @click="copyId(row.userId)"
          >{{ row.userId ? row.userId.slice(0, 8) + '…' : '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="reason"
        label="原因"
        min-width="200"
      >
        <template #default="{ row }">
          {{ row.reason || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="createdAt"
        label="添加时间"
        width="180"
      >
        <template #default="{ row }">
          {{ row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="100"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="danger"
            link
            @click="handleRemove(row)"
          >
            移除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div
      v-if="total > pageSize"
      style="display:flex;justify-content:flex-end;margin-top:16px"
    >
      <el-pagination
        v-model:current-page="page"
        :total="total"
        :page-size="pageSize"
        layout="total, prev, pager, next"
      />
    </div>

    <el-dialog
      v-model="dialogVisible"
      title="添加用户白名单"
      width="450px"
    >
      <el-form
        :model="form"
        label-width="80px"
      >
        <el-form-item
          label="用户ID"
          required
        >
          <el-input
            v-model="form.userId"
            placeholder="输入用户ID"
          />
        </el-form-item>
        <el-form-item label="原因">
          <el-input
            v-model="form.reason"
            placeholder="可选填"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="handleAdd"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; }
</style>
