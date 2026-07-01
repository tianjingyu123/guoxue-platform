<template>
  <div class="page">
    <div class="page-header">
      <h3>订单管理</h3>
      <el-select
        v-model="filterStatus"
        placeholder="全部状态"
        clearable
        style="width:140px"
        @change="fetchList"
      >
        <el-option
          label="待付款"
          value="PENDING_PAY"
        />
        <el-option
          label="已付款"
          value="PAID"
        />
        <el-option
          label="已发货"
          value="SHIPPED"
        />
        <el-option
          label="已完成"
          value="COMPLETED"
        />
        <el-option
          label="退款中"
          value="REFUNDING"
        />
        <el-option
          label="已退款"
          value="REFUNDED"
        />
      </el-select>
    </div>

    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="订单数据加载失败，请稍后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-table
      v-else
      v-loading="loading"
      :data="list"
      stripe
    >
      <template #empty>
        <el-empty description="暂无订单数据" />
      </template>
      <el-table-column type="expand">
        <template #default="{ row }">
          <div class="order-detail">
            <el-descriptions
              :column="3"
              border
              size="small"
            >
              <el-descriptions-item label="订单号">
                {{ row.orderNo }}
              </el-descriptions-item>
              <el-descriptions-item label="买家">
                {{ row.buyerName }}
              </el-descriptions-item>
              <el-descriptions-item label="金额">
                ¥{{ Number(row.totalAmount || 0).toFixed(2) }}
              </el-descriptions-item>
              <el-descriptions-item label="收件人">
                {{ row.receiverName }}
              </el-descriptions-item>
              <el-descriptions-item label="手机号">
                {{ row.receiverPhone }}
              </el-descriptions-item>
              <el-descriptions-item
                label="地址"
                :span="1"
              >
                {{ row.receiverAddress }}
              </el-descriptions-item>
              <el-descriptions-item
                v-if="row.trackingNo"
                label="物流"
              >
                {{ row.shipCompany }} / {{ row.trackingNo }}
              </el-descriptions-item>
            </el-descriptions>
            <div
              v-if="row.items?.length"
              style="margin-top:12px"
            >
              <h5 style="margin:0 0 8px">
                商品明细
              </h5>
              <el-table
                :data="row.items"
                size="small"
                border
              >
                <el-table-column
                  prop="productTitle"
                  label="商品"
                />
                <el-table-column
                  prop="price"
                  label="单价"
                  width="100"
                >
                  <template #default="{ row: item }">
                    ¥{{ Number(item.price || 0).toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column
                  prop="quantity"
                  label="数量"
                  width="70"
                />
                <el-table-column
                  label="小计"
                  width="100"
                >
                  <template #default="{ row: item }">
                    ¥{{ (Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2) }}
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="orderNo"
        label="订单号"
        width="180"
        show-overflow-tooltip
      />
      <el-table-column
        label="金额"
        width="100"
      >
        <template #default="{ row }">
          ¥{{ Number(row.totalAmount || 0).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="statusType(row.status)"
            size="small"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="buyerName"
        label="买家"
        width="100"
      />
      <el-table-column
        label="下单时间"
        width="160"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="200"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'PAID'"
            size="small"
            text
            type="primary"
            @click="openShip(row)"
          >
            发货
          </el-button>
          <el-button
            v-if="row.status === 'REFUNDING'"
            size="small"
            text
            type="success"
            @click="doApproveRefund(row)"
          >
            同意退款
          </el-button>
          <el-button
            v-if="row.status === 'REFUNDING'"
            size="small"
            text
            type="danger"
            @click="openRejectRefund(row)"
          >
            拒绝退款
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="!error"
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <!-- 发货 -->
    <el-dialog
      v-model="shipDialog"
      title="发货"
      width="450px"
    >
      <el-form label-width="80px">
        <el-form-item
          label="物流公司"
          required
        >
          <el-select
            v-model="shipForm.company"
            placeholder="选择物流公司"
            style="width:100%"
          >
            <el-option
              label="顺丰速运"
              value="顺丰速运"
            />
            <el-option
              label="中通快递"
              value="中通快递"
            />
            <el-option
              label="圆通速递"
              value="圆通速递"
            />
            <el-option
              label="申通快递"
              value="申通快递"
            />
            <el-option
              label="韵达快递"
              value="韵达快递"
            />
            <el-option
              label="EMS"
              value="EMS"
            />
            <el-option
              label="京东物流"
              value="京东物流"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="快递单号"
          required
        >
          <el-input
            v-model="shipForm.trackingNo"
            placeholder="请输入快递单号"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doShip"
        >
          确认发货
        </el-button>
      </template>
    </el-dialog>

    <!-- 拒绝退款 -->
    <el-dialog
      v-model="rejectDialog"
      title="拒绝退款"
      width="450px"
    >
      <el-form label-width="80px">
        <el-form-item
          label="拒绝原因"
          required
        >
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="3"
            placeholder="请输入拒绝退款原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="doRejectRefund"
        >
          确认拒绝
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { merchantBackendApi } from "@/api";

/** 订单商品明细行 */
interface OrderItem { productTitle?: string; price?: number; quantity?: number }
/** 订单行（字段宽松 optional） */
interface OrderRow {
  id: string;
  orderNo?: string;
  buyerName?: string;
  totalAmount?: number;
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  trackingNo?: string;
  shipCompany?: string;
  items?: OrderItem[];
  status?: string;
  createdAt?: string;
}

const list = ref<OrderRow[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const error = ref(false);
const saving = ref(false);
const filterStatus = ref("");

const shipDialog = ref(false);
const shipOrderId = ref("");
const shipForm = reactive({ company: "", trackingNo: "" });

const rejectDialog = ref(false);
const rejectOrderId = ref("");
const rejectReason = ref("");

const STATUS = {
  PENDING_PAY: ["待付款", "info"],
  PAID: ["已付款", "warning"],
  SHIPPED: ["已发货", ""],
  DELIVERED: ["已签收", ""],
  COMPLETED: ["已完成", "success"],
  REFUNDING: ["退款中", "danger"],
  REFUNDED: ["已退款", "info"],
  CANCELLED: ["已取消", "info"],
} as Record<string, [string, string]>;

function statusLabel(s: string) { return STATUS[s]?.[0] || s; }
function statusType(s: string) { return STATUS[s]?.[1] || "info"; }
function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";
}

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: 20 };
    if (filterStatus.value) params.status = filterStatus.value;
    const res = await merchantBackendApi.listOrders(params);
    // 兼容两种响应包装：{ data: {...} } 或直接返回 data
    const data = (res as { data?: { items?: OrderRow[]; list?: OrderRow[]; data?: OrderRow[]; total?: number } }).data ?? (res as { items?: OrderRow[]; list?: OrderRow[]; data?: OrderRow[]; total?: number });
    list.value = data.items || data.list || data.data || [];
    total.value = data.total || 0;
  } catch (e) {
    error.value = true;
  } finally { loading.value = false; }
}

function openShip(row: OrderRow) {
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

async function doApproveRefund(row: OrderRow) {
  try {
    await ElMessageBox.confirm("确定同意该退款申请？", "提示", { type: "warning" });
    await merchantBackendApi.approveRefund(row.id);
    ElMessage.success("已同意退款");
    fetchList();
  } catch { /* */ }
}

function openRejectRefund(row: OrderRow) {
  rejectOrderId.value = row.id;
  rejectReason.value = "";
  rejectDialog.value = true;
}

async function doRejectRefund() {
  if (!rejectReason.value) { ElMessage.warning("请填写拒绝原因"); return; }
  saving.value = true;
  try {
    await merchantBackendApi.rejectRefund(rejectOrderId.value, { reason: rejectReason.value });
    ElMessage.success("已拒绝退款");
    rejectDialog.value = false;
    fetchList();
  } catch { /* */ } finally { saving.value = false; }
}
</script>

<style scoped>
.page { padding: 20px; }
.page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.order-detail { padding: 12px 20px; }
</style>
