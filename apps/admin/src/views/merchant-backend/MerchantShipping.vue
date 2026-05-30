<template>
  <div class="page">
    <div class="page-header">
      <h3>发货管理</h3>
      <div class="header-right">
        <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width:120px" @change="fetchList">
          <el-option label="待发货" value="PAID" />
          <el-option label="已发货" value="SHIPPED" />
          <el-option label="已签收" value="DELIVERED" />
        </el-select>
      </div>
    </div>

    <el-table v-loading="loading" :data="list" stripe @selection-change="handleSelection">
      <el-table-column type="selection" width="50" />
      <el-table-column prop="id" label="订单号" width="200" show-overflow-tooltip />
      <el-table-column label="金额" width="100">
        <template #default="{ row }">¥{{ Number(row.amount || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="buyerName" label="买家" width="100" />
      <el-table-column prop="receiverName" label="收件人" width="100" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'PAID' ? 'warning' : row.status === 'SHIPPED' ? '' : 'success'" size="small">
            {{ ({ PAID: "待发货", SHIPPED: "已发货", DELIVERED: "已签收" } as any)[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="物流信息" min-width="160">
        <template #default="{ row }">
          <span v-if="row.shipCompany">{{ row.shipCompany }} / {{ row.trackingNo || "无" }}</span>
          <span v-else style="color:#ccc">-</span>
        </template>
      </el-table-column>
      <el-table-column label="下单时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'PAID'" size="small" text type="primary" @click="openShip(row)">发货</el-button>
          <el-button v-if="row.shipCompany" size="small" text type="info" @click="openTrack(row)">物流</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      @current-change="fetchList"
      style="margin-top:16px;justify-content:flex-end"
    />

    <!-- 发货 -->
    <el-dialog v-model="shipDialog" title="发货" width="450px">
      <el-form label-width="80px">
        <el-form-item label="物流公司" required>
          <el-select v-model="shipForm.company" placeholder="选择物流公司" style="width:100%">
            <el-option v-for="c in couriers" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="快递单号" required>
          <el-input v-model="shipForm.trackingNo" placeholder="请输入快递单号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="doShip">确认发货</el-button>
      </template>
    </el-dialog>

    <!-- 物流轨迹 -->
    <el-dialog v-model="trackDialog" title="物流轨迹" width="550px">
      <template v-if="trackData">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="物流公司">{{ trackData.company }}</el-descriptions-item>
          <el-descriptions-item label="快递单号">{{ trackData.trackingNo }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ trackData.state }}</el-descriptions-item>
        </el-descriptions>
        <el-timeline v-if="trackData.tracks?.length" style="margin-top:16px">
          <el-timeline-item v-for="(t, idx) in trackData.tracks" :key="idx" :timestamp="t.time" placement="top">
            {{ t.status }}
          </el-timeline-item>
        </el-timeline>
        <div v-else style="text-align:center;color:#999;padding:20px">暂无物流信息</div>
      </template>
      <div v-else v-loading="trackLoading" style="min-height:100px" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { merchantBackendApi } from "@/api";

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const saving = ref(false);
const filterStatus = ref("PAID");
const selected = ref<any[]>([]);

const couriers = ["顺丰速运", "中通快递", "圆通速递", "申通快递", "韵达快递", "EMS", "京东物流", "极兔速递", "德邦快递"];

const shipDialog = ref(false);
const shipOrderId = ref("");
const shipForm = reactive({ company: "", trackingNo: "" });

const trackDialog = ref(false);
const trackData = ref<any>(null);
const trackLoading = ref(false);

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";
}

function handleSelection(rows: any[]) { selected.value = rows; }

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: page.value, pageSize: 20 };
    if (filterStatus.value) params.status = filterStatus.value;
    const res = await merchantBackendApi.listOrders(params);
    const data = (res as any).data ?? res;
    list.value = data.list || data.data || [];
    total.value = data.total || 0;
  } finally { loading.value = false; }
}

function openShip(row: any) {
  shipOrderId.value = row.id;
  shipForm.company = "";
  shipForm.trackingNo = "";
  shipDialog.value = true;
}

async function doShip() {
  if (!shipForm.company || !shipForm.trackingNo) { ElMessage.warning("请填写物流信息"); return; }
  saving.value = true;
  try {
    await merchantBackendApi.shipOrder(shipOrderId.value, { company: shipForm.company, trackingNo: shipForm.trackingNo });
    ElMessage.success("发货成功");
    shipDialog.value = false;
    fetchList();
  } catch { /* */ } finally { saving.value = false; }
}

function openTrack(row: any) {
  trackData.value = {
    company: row.shipCompany,
    trackingNo: row.trackingNo,
    state: ({ SHIPPED: "运输中", DELIVERED: "已签收" } as any)[row.status] || "运输中",
    tracks: row.tracks || [],
  };
  trackDialog.value = true;
}
</script>

<style scoped>
.page { padding: 20px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.header-right { display: flex; gap: 12px; }
</style>
