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
            label="已执行"
            value="EXECUTED"
          />
          <el-option
            label="已取消"
            value="CANCELLED"
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
        prop="remark"
        label="备注"
        min-width="200"
        show-overflow-tooltip
      />
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
import axios from "axios";

const loading = ref(false);
const list = ref<any[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterStatus = ref("");

function actionTypeLabel(type: string) {
  const map: Record<string, string> = {
    NOTIFY: "发送通知", COUPON: "发送优惠券", FLAG: "标记关注", SERVICE: "客服介入",
  };
  return map[type] || type;
}

function statusTag(status: string) {
  const map: Record<string, string> = {
    PENDING: "info", EXECUTED: "success", CANCELLED: "warning", FAILED: "danger",
  };
  return map[status] || "info";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: "待处理", EXECUTED: "已执行", CANCELLED: "已取消", FAILED: "失败",
  };
  return map[status] || status;
}

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize: pageSize.value };
    if (filterStatus.value) params.status = filterStatus.value;
    const res = await axios.get("/admin/churn/actions", { params });
    list.value = res.data.list || res.data.rows || [];
    total.value = res.data.total || 0;
  } catch {
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
</style>
