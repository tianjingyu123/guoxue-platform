<script setup lang="ts">
import { ref, onMounted, reactive } from "vue";
import { ElMessage } from "element-plus";
import api from "../../api";

const orders = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const filterStatus = ref("");

// 物流弹窗
const logisticsVisible = ref(false);
const logisticsOrderId = ref("");
const logisticsForm = reactive({
  company: "", logisticsNo: "", contactName: "", contactPhone: "",
  province: "", city: "", district: "", address: "", zipCode: "", remark: "",
});

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

/** 打开物流弹窗 */
async function openLogistics(row: any) {
  logisticsOrderId.value = row.id;
  try {
    const { data } = await api.get(`/shop/orders/${row.id}/logistics`);
    if (data.logistics) {
      Object.assign(logisticsForm, {
        company: data.logistics.company || "",
        logisticsNo: data.logistics.logisticsNo || "",
        contactName: data.logistics.contactName || "",
        contactPhone: data.logistics.contactPhone || "",
        province: data.logistics.province || "",
        city: data.logistics.city || "",
        district: data.logistics.district || "",
        address: data.logistics.address || "",
        zipCode: data.logistics.zipCode || "",
        remark: data.logistics.remark || "",
      });
    } else {
      // 清空表单
      Object.assign(logisticsForm, {
        company: "", logisticsNo: "", contactName: "", contactPhone: "",
        province: "", city: "", district: "", address: "", zipCode: "", remark: "",
      });
    }
  } catch {
    Object.assign(logisticsForm, {
      company: "", logisticsNo: "", contactName: "", contactPhone: "",
      province: "", city: "", district: "", address: "", zipCode: "", remark: "",
    });
  }
  logisticsVisible.value = true;
}

async function saveLogistics() {
  try {
    // 只发送非空字段
    const payload: any = {};
    Object.entries(logisticsForm).forEach(([k, v]) => {
      if (v) payload[k] = v;
    });
    await api.put(`/shop/orders/${logisticsOrderId.value}/logistics`, payload);
    ElMessage.success("物流信息已保存");
    logisticsVisible.value = false;
    fetchList();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "保存失败");
  }
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
      <el-table-column label="操作" width="260" fixed="right">
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
          <el-button size="small" type="info" @click="openLogistics(row)" v-if="['PAID','SHIPPED'].includes(row.status)">物流</el-button>
          <span v-if="['COMPLETED','REFUNDED','CANCELLED'].includes(row.status)">-</span>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :total="total" @change="fetchList" layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end" />

    <!-- 物流信息弹窗 -->
    <el-dialog v-model="logisticsVisible" title="物流信息" width="550px">
      <el-form :model="logisticsForm" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="物流公司">
              <el-input v-model="logisticsForm.company" placeholder="如 顺丰速运" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="物流单号">
              <el-input v-model="logisticsForm.logisticsNo" placeholder="快递单号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="联系人">
              <el-input v-model="logisticsForm.contactName" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="logisticsForm.contactPhone" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="省">
              <el-input v-model="logisticsForm.province" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="市">
              <el-input v-model="logisticsForm.city" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="区">
              <el-input v-model="logisticsForm.district" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="详细地址">
          <el-input v-model="logisticsForm.address" placeholder="街道/门牌号" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="logisticsForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="logisticsVisible = false">取消</el-button>
        <el-button type="primary" @click="saveLogistics">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.order-list { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; }
</style>
