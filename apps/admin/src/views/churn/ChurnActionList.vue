<template>
  <div class="page">
    <div class="header">
      <h2>流失挽回动作记录</h2>
    </div>

    <el-form
      :inline="true"
      class="search-bar"
    >
      <el-form-item label="状态">
        <el-select
          v-model="filterStatus"
          placeholder="全部"
          clearable
        >
          <el-option
            label="待处理"
            value="PENDING"
          />
          <el-option
            label="已完成"
            value="COMPLETED"
          />
          <el-option
            label="失败"
            value="FAILED"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="fetchList"
        >
          搜索
        </el-button>
      </el-form-item>
    </el-form>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      title="加载动作记录失败"
      class="error-bar"
    >
      <el-button
        size="small"
        @click="fetchList"
      >
        重试
      </el-button>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <el-table-column
        prop="userId"
        label="用户ID"
        width="200"
      />
      <el-table-column
        label="动作类型"
        width="120"
      >
        <template #default="{ row }">
          <el-tag>{{ actionTypeLabel(row.actionType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="triggeredBy"
        label="触发方式"
        width="110"
      />
      <el-table-column
        label="结果/错误"
        min-width="200"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span :class="{ 'err-text': row.errorLog }">
            {{ row.result || row.errorLog || '--' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        prop="createdAt"
        label="创建时间"
        width="170"
      />
      <el-table-column
        prop="executedAt"
        label="执行时间"
        width="170"
      />
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
import { churnApi } from "@/api";

const loading = ref(false);
const error = ref(false);
const list = ref<any[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterStatus = ref("");

function actionTypeLabel(type: string) {
  const map: Record<string, string> = {
    SMS: "短信触达", COUPON: "发送优惠券", TEMPLATE_MSG: "模板消息", WEBHOOK: "回调通知",
  };
  return map[type] || type;
}

function statusTag(status: string) {
  const map: Record<string, string> = {
    PENDING: "info", COMPLETED: "success", FAILED: "danger",
  };
  return map[status] || "info";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: "待处理", COMPLETED: "已完成", FAILED: "失败",
  };
  return map[status] || status;
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: any = { page: page.value, pageSize: pageSize.value };
    if (filterStatus.value) params.status = filterStatus.value;
    const res = await churnApi.getActions(params);
    // 后端返回 { actions, total, page, pageSize }（非标准分页键）
    list.value = res.data.actions ?? res.data.items ?? res.data ?? [];
    total.value = res.data.total ?? 0;
  } catch {
    error.value = true;
    ElMessage.error("获取动作记录失败");
  } finally {
    loading.value = false;
  }
}

onMounted(fetchList);
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.search-bar { margin-bottom: 20px; }
.error-bar { margin-bottom: 12px; }
.err-text { color: var(--el-color-danger); }
</style>
