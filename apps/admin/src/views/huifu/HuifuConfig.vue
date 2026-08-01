<template>
  <div class="huifu-page">
    <div class="page-header">
      <h3>汇付天下支付管理</h3>
      <div>
        <el-tooltip
          :content="statusTip"
          placement="bottom"
        >
          <el-tag
            :type="paymentEnabled ? 'success' : 'danger'"
            size="small"
            style="margin-right:8px"
          >
            {{ statusText }}
          </el-tag>
        </el-tooltip>
        <el-button
          size="small"
          @click="refreshAll"
        >
          刷新
        </el-button>
      </div>
    </div>

    <!-- 商户余额（渠道原始返回字段解析不保证可靠，金额以汇付商户后台为准） -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="8">
        <div class="stat-card">
          <span class="label">商户余额（参考）</span>
          <span class="value">{{ balanceText }}</span>
          <span class="hint">以汇付商户后台为准</span>
        </div>
      </el-col>
    </el-row>

    <!-- Tab 切换 -->
    <el-tabs
      v-model="activeTab"
    >
      <!-- 配置统一在系统第三方配置维护，避免两个入口互相覆盖密钥 -->
      <el-tab-pane
        label="支付配置"
        name="config"
      >
        <el-result
          v-if="loadError && !loading"
          icon="error"
          title="加载失败"
          sub-title="支付配置加载失败，请检查网络后重试"
        >
          <template #extra>
            <el-button
              type="primary"
              @click="refreshAll"
            >
              重试
            </el-button>
          </template>
        </el-result>
        <template v-else>
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="汇付凭据已统一到“系统 → 第三方配置 → 汇付天下”维护"
            description="统一配置页会加密保存私钥和平台公钥、自动给出当前环境回调地址，并提供真实商户信息连通测试。这里仅保留支付、分账、退款和对账操作，避免从旧入口误覆盖脱敏密钥。"
            style="margin-bottom:12px"
          />
          <el-button
            type="primary"
            @click="router.push('/system/third-party')"
          >
            前往统一第三方配置
          </el-button>
        </template>
      </el-tab-pane>

      <!-- 分账管理：后端无分账列表端点，按订单号查询单条结果（诚实呈现，不放永远空的假列表） -->
      <el-tab-pane
        label="分账查询"
        name="split"
      >
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="发起分账已纳入资金审批：提交后需财务在「资金审批中心」审批通过才会真正向汇付发起"
          style="margin-bottom:12px"
        >
          <template #default>
            <el-link
              type="primary"
              @click="router.push('/finance/fund-approval')"
            >
              前往资金审批中心 →
            </el-link>
          </template>
        </el-alert>
        <div class="toolbar-row">
          <el-button
            type="primary"
            size="small"
            @click="splitVisible = true"
          >
            发起分账（走审批）
          </el-button>
          <el-input
            v-model="splitQuery.orderId"
            placeholder="输入订单号查询分账结果"
            size="small"
            clearable
            style="width:280px;margin-left:8px"
            @keyup.enter="querySplitResult"
          />
          <el-button
            size="small"
            :loading="splitLoading"
            @click="querySplitResult"
          >
            查询分账
          </el-button>
        </div>

        <el-descriptions
          v-if="splitResult"
          :column="2"
          border
          size="small"
          style="margin-top:12px;max-width:720px"
        >
          <el-descriptions-item label="订单号">
            {{ splitQuery.orderId }}
          </el-descriptions-item>
          <el-descriptions-item label="分账状态">
            <el-tag
              :type="splitStatusType(splitResult.splitStatus || splitResult.status)"
              size="small"
            >
              {{ splitStatusLabel(splitResult.splitStatus || splitResult.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item
            v-if="splitResult.outTradeNo"
            label="交易号"
          >
            {{ splitResult.outTradeNo }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="splitResult.amount != null"
            label="分账金额"
          >
            ¥{{ Number(splitResult.amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </el-descriptions-item>
          <el-descriptions-item
            label="渠道原始返回"
            :span="2"
          >
            <pre class="raw-pre">{{ JSON.stringify(splitResult, null, 2) }}</pre>
          </el-descriptions-item>
        </el-descriptions>
        <el-empty
          v-else-if="splitQueried && !splitLoading"
          description="未找到该订单的分账记录，请核对订单号"
          :image-size="80"
          style="margin-top:12px"
        />
      </el-tab-pane>

      <!-- 退款：统一走资金审批中心，不在此放永远空的假退款列表 -->
      <el-tab-pane
        label="退款管理"
        name="refund"
      >
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          title="汇付退款为资金支出操作，已统一纳入资金审批中心"
          description="在此发起退款申请后，需财务在「资金审批中心」审批通过才会真正向汇付发起退款；退款申请与处理进度请在审批中心查看（类型：汇付退款）。"
          style="margin-bottom:12px"
        />
        <div class="toolbar-row">
          <el-button
            type="primary"
            size="small"
            @click="refundVisible = true"
          >
            发起退款申请
          </el-button>
          <el-button
            size="small"
            style="margin-left:8px"
            @click="router.push('/finance/fund-approval')"
          >
            前往资金审批中心查看进度 →
          </el-button>
        </div>
      </el-tab-pane>

      <!-- 账单：斗拱对账单接口未接入，不放点了必报错的死按钮 -->
      <el-tab-pane
        label="账单下载"
        name="bill"
      >
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="账单下载待接入斗拱协议"
          description="汇付对账单下载接口尚未接入斗拱协议，请前往汇付斗拱控制台查看/下载对账文件。平台内对账请使用「财务-对账中心」。"
        >
          <template #default>
            <el-link
              type="primary"
              @click="router.push('/finance/reconciliation')"
            >
              前往对账中心 →
            </el-link>
          </template>
        </el-alert>
      </el-tab-pane>
    </el-tabs>

    <!-- 分账弹窗 -->
    <el-dialog
      v-model="splitVisible"
      title="发起分账（提交财务审批）"
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
          提交审批
        </el-button>
      </template>
    </el-dialog>

    <!-- 退款弹窗 -->
    <el-dialog
      v-model="refundVisible"
      title="发起退款申请（提交财务审批）"
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
        <el-form-item
          label="退款原因"
          required
        >
          <el-input
            v-model="refundForm.reason"
            placeholder="必填，供财务审批参考"
          />
        </el-form-item>
      </el-form>
      <p style="color:#e6a23c; font-size:13px">
        ⚠️ 审批通过后即向汇付发起真实退款，不可逆，请仔细核对信息
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
          提交审批
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { useRouter } from "vue-router";
import { huifuApi } from "@/api";

const router = useRouter();

const activeTab = ref("config");
const paymentEnabled = ref(false);
const loading = ref(false);
const loadError = ref(false);

const statusText = computed(() => (paymentEnabled.value ? "支付已启用" : "支付未启用"));
const statusTip = computed(() => {
  if (!paymentEnabled.value) return "请检查商户号、产品号、商户私钥和汇付平台公钥；平台公钥不能填写成商户公钥";
  return "已启用：商户号、产品号和RSA密钥方向检查通过";
});

// 商户余额：queryBalance 返回汇付渠道原始报文，字段解析不保证可靠 → 解析失败诚实显示 "—"
const balanceRaw = ref<Record<string, any> | null>(null);
const balanceText = computed(() => {
  const d = balanceRaw.value;
  if (!d) return "—";
  const cand = d.avl_bal ?? d.acct_bal ?? d.balance ?? d.data?.avl_bal ?? d.data?.balance;
  const n = Number(String(cand ?? "").replace(/,/g, ""));
  if (cand != null && Number.isFinite(n)) {
    return "¥" + n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return "—";
});

const splitVisible = ref(false);
const splitSubmitting = ref(false);
const splitLoading = ref(false);
const splitForm = reactive({ orderId: "", amount: "", receiverId: "", receiverName: "" });
const splitQuery = reactive({ orderId: "" });
const splitResult = ref<Record<string, any> | null>(null);
const splitQueried = ref(false);

const refundVisible = ref(false);
const refundSubmitting = ref(false);
const refundForm = reactive({ outTradeNo: "", amount: "", reason: "" });

function splitStatusLabel(s?: string) {
  const m: Record<string, string> = {
    SUCCESS: "分账成功", PROCESSING: "处理中", PENDING: "待处理", FAIL: "失败", FAILED: "失败", INIT: "未发起",
  };
  return s ? (m[s] || s) : "—";
}
function splitStatusType(s?: string) {
  const m: Record<string, string> = { SUCCESS: "success", PROCESSING: "warning", PENDING: "warning", FAIL: "danger", FAILED: "danger" };
  return (s && m[s]) || "info";
}

onMounted(() => refreshAll());

async function refreshAll() {
  loading.value = true;
  loadError.value = false;
  try {
    const [statusRes, balanceRes] = await Promise.all([
      huifuApi.getStatus(),
      huifuApi.getBalance().catch(() => ({ data: null })),
    ]);
    paymentEnabled.value = !!(statusRes.data as any)?.enabled;
    balanceRaw.value = (balanceRes.data as Record<string, any> | null) ?? null;
  } catch { loadError.value = true; } finally { loading.value = false; }
}

async function querySplitResult() {
  if (!splitQuery.orderId.trim()) { ElMessage.warning("请输入订单号"); return; }
  splitLoading.value = true;
  splitResult.value = null;
  try {
    const { data } = await huifuApi.querySplit(splitQuery.orderId.trim());
    splitResult.value = (data as Record<string, any>) ?? null;
  } catch {
    splitResult.value = null; // 404=无该订单分账记录，空态提示
  } finally {
    splitQueried.value = true;
    splitLoading.value = false;
  }
}

async function submitSplit() {
  if (!splitForm.orderId || !splitForm.amount) { ElMessage.warning("请填写完整信息"); return; }
  const amount = Number(splitForm.amount);
  if (!Number.isFinite(amount) || amount <= 0) { ElMessage.warning("请输入有效的分账金额（元）"); return; }
  splitSubmitting.value = true;
  try {
    await huifuApi.createSplit({ ...splitForm, amount });
    ElMessage.success("已提交审批，财务审批通过后才会真正向汇付发起分账");
    splitVisible.value = false;
  } catch { /* 拦截器已提示 */ } finally { splitSubmitting.value = false; }
}

async function submitRefund() {
  if (!refundForm.outTradeNo || !refundForm.amount) { ElMessage.warning("请填写完整信息"); return; }
  if (!refundForm.reason.trim()) { ElMessage.warning("请填写退款原因（供财务审批参考）"); return; }
  const amount = Number(refundForm.amount);
  if (!Number.isFinite(amount) || amount <= 0) { ElMessage.warning("请输入有效的退款金额（元）"); return; }
  refundSubmitting.value = true;
  try {
    await huifuApi.createRefund({ ...refundForm, amount });
    ElMessage.success("已提交审批，进度请在资金审批中心查看（类型：汇付退款）");
    refundVisible.value = false;
  } catch { /* 拦截器已提示 */ } finally { refundSubmitting.value = false; }
}
</script>

<style scoped>
.huifu-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-card { background: var(--color-bg-page); border-radius: 8px; padding: 18px; text-align: center; }
.stat-card .value { display: block; font-size: 28px; font-weight: 700; color: var(--color-text-title); }
.stat-card .label { display: block; font-size: 13px; color: var(--color-text-secondary); }
.stat-card .hint { display: block; font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
.toolbar-row { display: flex; align-items: center; flex-wrap: wrap; }
.raw-pre { margin: 0; max-height: 200px; overflow: auto; font-size: 12px; white-space: pre-wrap; word-break: break-all; color: var(--color-text-body); }
</style>
