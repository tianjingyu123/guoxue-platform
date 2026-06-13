<template>
  <div class="huifu-page">
    <div class="page-header">
      <h3>汇付天下支付管理</h3>
      <div>
        <el-tag
          :type="paymentStatus.enabled ? 'success' : 'danger'"
          size="small"
          style="margin-right:8px"
        >
          {{ paymentStatus.enabled ? '支付已启用' : '支付未启用' }}
        </el-tag>
        <el-button
          size="small"
          @click="refreshAll"
        >
          刷新
        </el-button>
      </div>
    </div>

    <!-- 核心指标 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="8">
        <div class="stat-card">
          <span class="label">商户余额</span>
          <span class="value">¥{{ balance }}</span>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <span class="label">今日分账笔数</span>
          <span class="value">{{ splitStats.todayCount }}</span>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <span class="label">待处理退款</span>
          <span class="value warn">{{ refundStats.pending }}</span>
        </div>
      </el-col>
    </el-row>

    <!-- Tab 切换 -->
    <el-tabs
      v-model="activeTab"
      @tab-change="onTabChange"
    >
      <!-- 配置管理 -->
      <el-tab-pane
        label="支付配置"
        name="config"
      >
        <el-table
          :data="configList"
          stripe
          size="small"
        >
          <el-table-column
            label="配置项"
            prop="key"
            width="220"
          />
          <el-table-column
            label="值"
            prop="value"
          >
            <template #default="{ row }">
              <template v-if="editingKey === row.key">
                <el-input
                  v-model="editValue"
                  size="small"
                  style="width:300px"
                />
                <el-button
                  size="small"
                  type="primary"
                  style="margin-left:8px"
                  @click="saveConfig(row)"
                >
                  保存
                </el-button>
                <el-button
                  size="small"
                  @click="editingKey = ''"
                >
                  取消
                </el-button>
              </template>
              <span v-else>{{ maskValue(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="说明"
            prop="description"
            min-width="200"
          />
          <el-table-column
            label="操作"
            width="100"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                @click="startEdit(row)"
              >
                编辑
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 分账管理 -->
      <el-tab-pane
        label="分账管理"
        name="split"
      >
        <div class="toolbar-row">
          <el-button
            type="primary"
            size="small"
            @click="splitVisible = true"
          >
            发起分账
          </el-button>
          <el-input
            v-model="splitQuery.orderId"
            placeholder="订单号查询"
            size="small"
            style="width:250px;margin-left:8px"
          />
          <el-button
            size="small"
            @click="querySplitResult"
          >
            查询分账
          </el-button>
        </div>
        <el-table
          :data="splitList"
          stripe
          size="small"
          style="margin-top:12px"
        >
          <el-table-column
            label="订单号"
            prop="orderId"
            width="200"
          />
          <el-table-column
            label="分账金额"
            width="120"
          >
            <template #default="{ row }">
              ¥{{ row.amount || 0 }}
            </template>
          </el-table-column>
          <el-table-column
            label="接收方"
            prop="receiverName"
            width="150"
          />
          <el-table-column
            label="状态"
            width="100"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'SUCCESS' ? 'success' : 'warning'"
                size="small"
              >
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="创建时间"
            width="170"
          >
            <template #default="{ row }">
              {{ fmtDate(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 退款管理 -->
      <el-tab-pane
        label="退款管理"
        name="refund"
      >
        <div class="toolbar-row">
          <el-button
            type="primary"
            size="small"
            @click="refundVisible = true"
          >
            发起退款
          </el-button>
        </div>
        <el-table
          :data="refundList"
          stripe
          size="small"
          style="margin-top:12px"
        >
          <el-table-column
            label="原交易号"
            prop="outTradeNo"
            width="200"
          />
          <el-table-column
            label="退款金额"
            width="120"
          >
            <template #default="{ row }">
              ¥{{ row.amount || row.refundAmount || 0 }}
            </template>
          </el-table-column>
          <el-table-column
            label="退款原因"
            prop="reason"
            min-width="150"
          />
          <el-table-column
            label="状态"
            width="100"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'SUCCESS' ? 'success' : row.status === 'FAIL' ? 'danger' : 'warning'"
                size="small"
              >
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="创建时间"
            width="170"
          >
            <template #default="{ row }">
              {{ fmtDate(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 账单下载 -->
      <el-tab-pane
        label="账单下载"
        name="bill"
      >
        <el-form inline>
          <el-form-item label="日期">
            <el-date-picker
              v-model="billDate"
              type="date"
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              @click="downloadBill"
            >
              下载账单
            </el-button>
          </el-form-item>
        </el-form>
        <div
          class="text-muted"
          style="margin-top:8px"
        >
          账单格式为 CSV，可用于对账核对
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 分账弹窗 -->
    <el-dialog
      v-model="splitVisible"
      title="发起分账"
      width="450px"
    >
      <el-form label-width="100px">
        <el-form-item
          label="订单号"
          required
        >
          <el-input v-model="splitForm.orderId" />
        </el-form-item>
        <el-form-item
          label="分账金额"
          required
        >
          <el-input
            v-model="splitForm.amount"
            placeholder="单位：元"
          />
        </el-form-item>
        <el-form-item label="接收方ID">
          <el-input v-model="splitForm.receiverId" />
        </el-form-item>
        <el-form-item label="接收方名称">
          <el-input v-model="splitForm.receiverName" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="splitVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="splitSubmitting"
          @click="submitSplit"
        >
          确认分账
        </el-button>
      </template>
    </el-dialog>

    <!-- 退款弹窗 -->
    <el-dialog
      v-model="refundVisible"
      title="发起退款"
      width="450px"
    >
      <el-form label-width="100px">
        <el-form-item
          label="原交易号"
          required
        >
          <el-input v-model="refundForm.outTradeNo" />
        </el-form-item>
        <el-form-item
          label="退款金额"
          required
        >
          <el-input
            v-model="refundForm.amount"
            placeholder="单位：元"
          />
        </el-form-item>
        <el-form-item label="退款原因">
          <el-input v-model="refundForm.reason" />
        </el-form-item>
      </el-form>
      <p style="color:#e6a23c; font-size:13px">
        ⚠️ 退款操作不可逆，请仔细核对信息
      </p>
      <template #footer>
        <el-button @click="refundVisible = false">
          取消
        </el-button>
        <el-button
          type="danger"
          :loading="refundSubmitting"
          @click="submitRefund"
        >
          确认退款
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { huifuApi } from "@/api";

const activeTab = ref("config");
const paymentStatus = reactive({ enabled: false });
const balance = ref("0.00");

const splitStats = reactive({ todayCount: 0 });
const refundStats = reactive({ pending: 0 });

const configList = ref<any[]>([]);
const editingKey = ref("");
const editValue = ref("");

const splitVisible = ref(false);
const splitSubmitting = ref(false);
const splitForm = reactive({ orderId: "", amount: "", receiverId: "", receiverName: "" });
const splitList = ref<any[]>([]);
const splitQuery = reactive({ orderId: "" });

const refundVisible = ref(false);
const refundSubmitting = ref(false);
const refundForm = reactive({ outTradeNo: "", amount: "", reason: "" });
const refundList = ref<any[]>([]);

const billDate = ref("");

function fmtDate(d: string) { return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "-"; }
function maskValue(row: any) {
  const v = row.value || "";
  if (row.key?.toLowerCase().includes("secret") || row.key?.toLowerCase().includes("key")) {
    return v.slice(0, 4) + "****" + v.slice(-4);
  }
  return v;
}

onMounted(() => refreshAll());

async function refreshAll() {
  try {
    const [statusRes, configRes, balanceRes] = await Promise.all([
      huifuApi.getStatus(),
      huifuApi.getConfigs(),
      huifuApi.getBalance().catch(() => ({ data: { balance: "0.00" } })),
    ]);
    paymentStatus.enabled = (statusRes.data as any)?.enabled || false;
    configList.value = (configRes.data as any)?.configs || [];
    balance.value = (balanceRes.data as any)?.balance || "0.00";
  } catch { /* ignore */ }
}

function startEdit(row: any) {
  editingKey.value = row.key;
  editValue.value = row.value;
}

async function saveConfig(row: any) {
  try {
    await huifuApi.updateConfig({ key: row.key, value: editValue.value, description: row.description });
    ElMessage.success("配置已更新");
    editingKey.value = "";
    refreshAll();
  } catch { /* ignore */ }
}

function onTabChange(tab: string) {
  if (tab === "split") fetchSplitList();
  if (tab === "refund") fetchRefundList();
}

async function fetchSplitList() {
  try {
    const { data } = await huifuApi.querySplit(splitQuery.orderId || "all");
    splitList.value = (data as any)?.splits || (data as any)?.data || [];
  } catch { splitList.value = []; }
}

async function querySplitResult() {
  if (!splitQuery.orderId) { ElMessage.warning("请输入订单号"); return; }
  fetchSplitList();
}

async function submitSplit() {
  if (!splitForm.orderId || !splitForm.amount) { ElMessage.warning("请填写完整信息"); return; }
  splitSubmitting.value = true;
  try {
    await huifuApi.createSplit({ ...splitForm, amount: Number(splitForm.amount) });
    ElMessage.success("分账已发起");
    splitVisible.value = false;
    fetchSplitList();
  } catch { /* ignore */ } finally { splitSubmitting.value = false; }
}

async function fetchRefundList() {
  try {
    refundList.value = [];
  } catch { refundList.value = []; }
}

async function submitRefund() {
  if (!refundForm.outTradeNo || !refundForm.amount) { ElMessage.warning("请填写完整信息"); return; }
  refundSubmitting.value = true;
  try {
    await huifuApi.createRefund({ ...refundForm, amount: Number(refundForm.amount) });
    ElMessage.success("退款已发起");
    refundVisible.value = false;
    fetchRefundList();
  } catch { /* ignore */ } finally { refundSubmitting.value = false; }
}

async function downloadBill() {
  if (!billDate.value) { ElMessage.warning("请选择日期"); return; }
  try {
    const { data } = await huifuApi.downloadBill(billDate.value);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `汇付账单_${billDate.value}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch { /* ignore */ }
}
</script>

<style scoped>
.huifu-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-card { background: #f5f7fa; border-radius: 8px; padding: 18px; text-align: center; }
.stat-card .value { display: block; font-size: 28px; font-weight: 700; color: #303133; }
.stat-card .value.warn { color: #f56c6c; }
.stat-card .label { display: block; font-size: 13px; color: #909399; }
.toolbar-row { display: flex; align-items: center; }
.text-muted { color: #909399; font-size: 13px; }
</style>
