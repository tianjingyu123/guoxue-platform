<script setup lang="ts">
import { ref, onMounted, reactive } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { orderApi } from "@/api";
import { exportCSV } from "@/utils/export";
import DataTable from "@/components/DataTable.vue";

const orders = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const filterStatus = ref("");

// 物流弹窗
const logisticsVisible = ref(false);
const logisticsOrderId = ref("");
const logisticsForm = reactive({
  company: "", logisticsNo: "", contactName: "", contactPhone: "",
  province: "", city: "", district: "", address: "", zipCode: "", remark: "",
});

const detailVisible = ref(false);
const detailRow = ref<any>(null);

const statusLabels: Record<string, string> = {
  PENDING: "待支付", PAID: "已支付", SHIPPED: "已发货", COMPLETED: "已完成", REFUNDED: "已退款", CANCELLED: "已取消",
};
const typeLabels: Record<string, string> = {
  MEMBER: "会员", COURSE: "课程", PRODUCT: "商品", CIRCLE_JOIN: "入圈", PAIPAN: "排盘",
};

const columns = [
  { prop: "user", label: "用户", width: 100, slot: "user" },
  { prop: "type", label: "类型", width: 80, slot: "type" },
  { prop: "targetId", label: "目标ID", width: 280 },
  { prop: "amount", label: "金额", width: 100, slot: "amount" },
  { prop: "status", label: "状态", width: 90, slot: "status" },
  { prop: "createdAt", label: "时间", width: 170, slot: "createdAt" },
];

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await orderApi.list({
      page: page.value, pageSize: pageSize.value, status: filterStatus.value || undefined,
    });
    orders.value = data.orders;
    total.value = data.total;
  } finally { loading.value = false; }
}

function showDetail(row: any) { detailRow.value = row; detailVisible.value = true; }

async function handlePay(orderId: string) {
  try {
    await ElMessageBox.confirm(
      "确认该订单已收到用户付款？此操作将标记订单为已支付，涉及资金入账。",
      "支付确认",
      { type: "warning", confirmButtonText: "确认收款" },
    );
    await orderApi.pay(orderId);
    ElMessage.success("支付确认成功");
    fetchList();
  } catch { /* */ }
}

async function handleShip(orderId: string) {
  try {
    await ElMessageBox.confirm("确认要发货吗？", "操作确认", { type: "warning", confirmButtonText: "确认发货" });
    await orderApi.ship(orderId);
    ElMessage.success("发货成功");
    fetchList();
  } catch { /* */ }
}

async function handleRefund(orderId: string) {
  try {
    await ElMessageBox.confirm(
      "确认要退款吗？此操作不可撤销，退款后用户将收到对应金额。",
      "退款确认",
      { type: "warning", confirmButtonText: "确认退款", confirmButtonClass: "el-button--danger" },
    );
    await orderApi.refund(orderId);
    ElMessage.success("退款成功");
    fetchList();
  } catch { /* */ }
}

async function handleComplete(orderId: string) {
  try {
    await ElMessageBox.confirm("确认要完成该订单吗？", "操作确认", { type: "info", confirmButtonText: "确认完成" });
    await orderApi.complete(orderId);
    ElMessage.success("订单已完成");
    fetchList();
  } catch { /* */ }
}

async function openLogistics(row: any) {
  logisticsOrderId.value = row.id;
  try {
    const { data } = await orderApi.getLogistics(row.id);
    const init: Record<string, string> = {
      company: "", logisticsNo: "", contactName: "", contactPhone: "",
      province: "", city: "", district: "", address: "", zipCode: "", remark: "",
    };
    if (data.logistics) {
      Object.keys(init).forEach(k => {
        (logisticsForm as any)[k] = data.logistics[k] || "";
      });
    } else {
      Object.assign(logisticsForm, init);
    }
  } catch {
    Object.assign(logisticsForm, { company: "", logisticsNo: "", contactName: "", contactPhone: "", province: "", city: "", district: "", address: "", zipCode: "", remark: "" });
  }
  logisticsVisible.value = true;
}

async function saveLogistics() {
  try {
    const payload: any = {};
    Object.entries(logisticsForm).forEach(([k, v]) => { if (v) payload[k] = v; });
    await orderApi.updateLogistics(logisticsOrderId.value, payload);
    ElMessage.success("物流信息已保存");
    logisticsVisible.value = false;
    fetchList();
  } catch { /* */ }
}

function exportData() {
  exportCSV(
    "订单列表",
    [
      { label: "用户", key: "userName" }, { label: "类型", key: "typeLabel" },
      { label: "金额", key: "amount" }, { label: "状态", key: "statusLabel" },
      { label: "时间", key: "createdAt" },
    ],
    orders.value.map((o) => ({
      ...o,
      userName: o.user?.nickname || "-",
      typeLabel: typeLabels[o.type] || o.type,
      statusLabel: statusLabels[o.status] || o.status,
      createdAt: new Date(o.createdAt).toLocaleString(),
    })),
  );
}
</script>

<template>
  <div class="order-list">
    <DataTable
      :columns="columns"
      :data="orders"
      :loading="loading"
      :total="total"
      v-model:page="page"
      v-model:page-size="pageSize"
      actions-width="300"
      @change="fetchList"
    >
      <template #toolbar>
        <h3>订单管理</h3>
        <el-select v-model="filterStatus" placeholder="状态" clearable style="width:120px" @change="fetchList">
          <el-option v-for="(label, key) in statusLabels" :key="key" :label="label" :value="key" />
        </el-select>
        <el-button @click="exportData">导出CSV</el-button>
      </template>

      <template #user="{ row }">{{ row.user?.nickname || '-' }}</template>
      <template #type="{ row }">{{ typeLabels[row.type] || row.type }}</template>
      <template #amount="{ row }">¥{{ row.amount }}</template>
      <template #status="{ row }">
        <el-tag size="small" :type="row.status === 'PAID' ? 'warning' : row.status === 'COMPLETED' ? 'success' : row.status === 'REFUNDED' ? 'info' : ''">
          {{ statusLabels[row.status] || row.status }}
        </el-tag>
      </template>
      <template #createdAt="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>

      <template #actions="{ row }">
        <el-button size="small" type="primary" link @click="showDetail(row)">详情</el-button>
        <template v-if="row.status === 'PENDING'">
          <el-button size="small" type="success" @click="handlePay(row.id)">确认支付</el-button>
        </template>
        <template v-if="row.status === 'PAID'">
          <el-button size="small" @click="handleShip(row.id)">发货</el-button>
          <el-button size="small" type="danger" @click="handleRefund(row.id)">退款</el-button>
        </template>
        <template v-if="row.status === 'SHIPPED'">
          <el-button size="small" type="success" @click="handleComplete(row.id)">完成</el-button>
        </template>
        <el-button v-if="['PAID','SHIPPED'].includes(row.status)" size="small" type="info" @click="openLogistics(row)">物流</el-button>
        <span v-if="['COMPLETED','REFUNDED','CANCELLED'].includes(row.status)" style="color:#999">-</span>
      </template>
    </DataTable>

    <!-- 物流信息弹窗 -->
    <el-dialog v-model="logisticsVisible" title="物流信息" width="550px">
      <el-form :model="logisticsForm" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="物流公司"><el-input v-model="logisticsForm.company" placeholder="如 顺丰速运" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="物流单号"><el-input v-model="logisticsForm.logisticsNo" placeholder="快递单号" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="联系人"><el-input v-model="logisticsForm.contactName" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="联系电话"><el-input v-model="logisticsForm.contactPhone" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="省"><el-input v-model="logisticsForm.province" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="市"><el-input v-model="logisticsForm.city" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="区"><el-input v-model="logisticsForm.district" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="详细地址"><el-input v-model="logisticsForm.address" placeholder="街道/门牌号" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="logisticsForm.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="logisticsVisible = false">取消</el-button>
        <el-button type="primary" @click="saveLogistics">保存</el-button>
      </template>
    </el-dialog>

    <!-- 订单详情弹窗 -->
    <el-dialog v-model="detailVisible" title="订单详情" width="640px">
      <template v-if="detailRow">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="订单编号" :span="2">{{ detailRow.id }}</el-descriptions-item>
          <el-descriptions-item label="用户">{{ detailRow.user?.nickname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ typeLabels[detailRow.type] || detailRow.type }}</el-descriptions-item>
          <el-descriptions-item label="金额">¥{{ detailRow.amount }}</el-descriptions-item>
          <el-descriptions-item label="虚拟币">{{ detailRow.coinAmount ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag size="small" :type="detailRow.status === 'PAID' ? 'warning' : detailRow.status === 'COMPLETED' ? 'success' : detailRow.status === 'REFUNDED' ? 'info' : ''">
              {{ statusLabels[detailRow.status] || detailRow.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">{{ new Date(detailRow.createdAt).toLocaleString() }}</el-descriptions-item>
          <el-descriptions-item v-if="detailRow.paidAt" label="支付时间" :span="2">{{ new Date(detailRow.paidAt).toLocaleString() }}</el-descriptions-item>
          <el-descriptions-item label="目标ID" :span="2">{{ detailRow.targetId || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">收货信息</el-divider>
        <el-descriptions v-if="detailRow.address" :column="2" border size="small">
          <el-descriptions-item label="收件人">{{ detailRow.address.contactName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detailRow.address.contactPhone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="收货地址" :span="2">
            {{ [detailRow.address.province, detailRow.address.city, detailRow.address.district, detailRow.address.address].filter(Boolean).join(' ') || '-' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detailRow.address.zipCode" label="邮编">{{ detailRow.address.zipCode }}</el-descriptions-item>
        </el-descriptions>
        <el-empty v-else description="暂无收货信息" :image-size="60" />

        <el-divider content-position="left">商品明细</el-divider>
        <template v-if="detailRow.items && detailRow.items.length > 0">
          <el-table :data="detailRow.items" border size="small">
            <el-table-column label="商品名称" prop="name" min-width="160" />
            <el-table-column label="单价" width="100"><template #default="{ row }">¥{{ row.price }}</template></el-table-column>
            <el-table-column label="数量" width="70" prop="quantity" />
            <el-table-column label="小计" width="100"><template #default="{ row }">¥{{ (row.price * row.quantity).toFixed(2) }}</template></el-table-column>
          </el-table>
        </template>
        <el-empty v-else description="暂无商品明细" :image-size="60" />
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.order-list { padding: 16px; }
</style>
