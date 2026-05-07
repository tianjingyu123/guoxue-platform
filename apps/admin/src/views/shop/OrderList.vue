<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import api from "../../api";

const orders = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const filterStatus = ref("");

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await api.get("/shop/orders", {
      params: { page: page.value, pageSize: 20, status: filterStatus.value || undefined },
    });
    orders.value = data.orders;
    total.value = data.total;
  } finally { loading.value = false; }
}

async function handleAction(orderId: string, action: string) {
  await api.put(`/shop/orders/${orderId}/${action}`);
  ElMessage.success("操作成功");
  fetchList();
}

const statusLabels: Record<string, string> = {
  PENDING: "待支付", PAID: "已支付", SHIPPED: "已发货", COMPLETED: "已完成", REFUNDED: "已退款", CANCELLED: "已取消",
};
const typeLabels: Record<string, string> = {
  MEMBER: "会员", COURSE: "课程", PRODUCT: "商品", CIRCLE_JOIN: "入圈", PAIPAN: "排盘",
};
</script>

<template>
  <div class="order-list">
    <div class="toolbar">
      <h3>订单管理</h3>
      <el-select v-model="filterStatus" placeholder="状态" clearable @change="fetchList" style="width:120px">
        <el-option v-for="(label, key) in statusLabels" :key="key" :label="label" :value="key" />
      </el-select>
    </div>
    <el-table :data="orders" v-loading="loading" stripe>
      <el-table-column label="用户" width="100">
        <template #default="{ row }">{{ row.user?.nickname || '-' }}</template>
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template #default="{ row }">{{ typeLabels[row.type] || row.type }}</template>
      </el-table-column>
      <el-table-column prop="targetId" label="目标ID" width="280" />
      <el-table-column label="金额" width="100">
        <template #default="{ row }">¥{{ row.amount }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 'PAID' ? 'warning' : row.status === 'COMPLETED' ? 'success' : row.status === 'REFUNDED' ? 'info' : ''">
            {{ statusLabels[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'PENDING'">
            <el-button size="small" type="success" @click="handleAction(row.id, 'pay')">确认支付</el-button>
          </template>
          <template v-if="row.status === 'PAID'">
            <el-button size="small" @click="handleAction(row.id, 'ship')">发货</el-button>
            <el-button size="small" type="danger" @click="handleAction(row.id, 'refund')">退款</el-button>
          </template>
          <template v-if="row.status === 'SHIPPED'">
            <el-button size="small" type="success" @click="handleAction(row.id, 'complete')">完成</el-button>
          </template>
          <span v-if="['COMPLETED','REFUNDED','CANCELLED'].includes(row.status)">-</span>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :total="total" @change="fetchList" layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end" />
  </div>
</template>

<style scoped>
.order-list { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; }
</style>
