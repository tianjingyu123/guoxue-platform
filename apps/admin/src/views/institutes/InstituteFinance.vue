<template>
  <div class="page">
    <div class="header">
      <h2>研究院财务概览</h2>
      <el-select
        v-model="period"
        placeholder="周期"
        style="width:140px"
        @change="fetchFinance"
      >
        <el-option
          label="全部"
          value=""
        />
        <el-option
          label="2026-Q1"
          value="2026-Q1"
        />
        <el-option
          label="2026-Q2"
          value="2026-Q2"
        />
        <el-option
          label="2026-Q3"
          value="2026-Q3"
        />
        <el-option
          label="2026-Q4"
          value="2026-Q4"
        />
      </el-select>
    </div>

    <!-- 403：权限降级人话（后端已放行 SUPER/OPERATION/FINANCE_ADMIN 免会籍查账） -->
    <el-result
      v-if="forbidden && !loading"
      icon="warning"
      title="无权查看研究院财务"
      sub-title="本页仅限研究院管理层或平台管理员（超管/运营/财务）查看。若您应有权限，请联系超管确认账号角色。"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchFinance"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-result
      v-else-if="loadError && !loading"
      icon="error"
      title="加载失败"
      sub-title="请检查网络后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchFinance"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-row
      v-show="!loadError && !forbidden"
      v-loading="loading"
      :gutter="16"
      class="overview-row"
    >
      <el-col :span="6">
        <el-card shadow="never">
          <div class="stat-label">
            会费实际入账
          </div><div class="stat-value">
            ¥{{ fmt(finance.totalRevenue) }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div class="stat-label">
            研究院留存（50%）
          </div><div
            class="stat-value"
            style="color:#409eff"
          >
            ¥{{ fmt(finance.instituteShare) }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div class="stat-label">
            已确认分配
          </div><div
            class="stat-value"
            style="color:#e6a23c"
          >
            ¥{{ fmt(finance.totalDividends) }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div class="stat-label">
            可申请分配
          </div><div
            class="stat-value"
            style="color:#67c23a"
          >
            ¥{{ fmt(finance.remaining) }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-alert
      v-show="!loadError && !forbidden"
      type="info"
      :closable="false"
      show-icon
      :title="'待审批占用 ¥' + fmt(finance.pendingDividends) + '，已从可申请余额扣除'"
      description="审批通过后生成分配确认记录，不代表款项已到账；实际结算以平台资金流水为准。"
      style="margin-bottom:16px"
    />

    <!-- 分配审批 -->
    <el-card
      v-show="!loadError && !forbidden"
      class="section-card"
      shadow="never"
    >
      <template #header>
        <span style="font-weight:600">分红/奖励分配审批</span>
        <!-- 数据加载失败/加载中时禁发：防止在"剩余可分"未知的情况下盲发资金 -->
        <el-tooltip
          :content="loadError || loading ? '财务数据未加载成功，暂不能发起审批' : '发起分红/奖励分配审批（需财务审批后生效）'"
          placement="top"
        >
          <el-button
            type="primary"
            size="small"
            style="float:right"
            :disabled="loadError || loading || !finance.canRequestDividend || Number(finance.remaining || 0) <= 0 || memberOptions.length === 0"
            @click="openDividendDialog"
          >
            + 发起审批
          </el-button>
        </el-tooltip>
      </template>
      <el-table
        v-loading="loading"
        :data="finance.dividends || []"
        border
        stripe
      >
        <el-table-column
          label="成员"
          width="120"
          prop="user.nickname"
        />
        <el-table-column
          label="类型"
          width="120"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.type === 'MGMT_BONUS' ? 'warning' : row.type === 'TEACHER_AWARD' ? 'success' : ''"
            >
              {{ dividendTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="金额"
          width="120"
          align="right"
        >
          <template #default="{ row }">
            ¥{{ fmt(row.amount) }}
          </template>
        </el-table-column>
        <el-table-column
          label="说明"
          min-width="200"
          prop="description"
        />
        <el-table-column
          label="周期"
          width="100"
          prop="period"
        />
        <el-table-column
          label="时间"
          width="170"
        >
          <template #default="{ row }">
            {{ row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-' }}
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            description="暂无已确认分配"
            :image-size="80"
          />
        </template>
      </el-table>
    </el-card>

    <!-- 分配审批弹窗 -->
    <el-dialog
      v-model="showDividendDialog"
      title="发起分红/奖励分配审批"
      width="500px"
    >
      <el-form
        :model="dividendForm"
        label-width="80px"
      >
        <el-form-item
          label="成员"
          required
        >
          <el-select
            v-model="dividendForm.userId"
            placeholder="选择成员"
            filterable
            style="width:100%"
          >
            <el-option
              v-for="m in memberOptions"
              :key="m.id"
              :label="m.user?.nickname || m.id"
              :value="m.userId"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="类型"
          required
        >
          <el-select
            v-model="dividendForm.type"
            style="width:100%"
          >
            <el-option
              label="管理层分红"
              value="MGMT_BONUS"
            />
            <el-option
              label="优秀老师奖励"
              value="TEACHER_AWARD"
            />
            <el-option
              label="运营费用"
              value="OPERATION"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="金额"
          required
        >
          <el-input-number
            v-model="dividendForm.amount"
            :min="0.01"
            :max="Number(finance.remaining || 0)"
            :precision="2"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="周期">
          <el-input
            v-model="dividendForm.period"
            placeholder="如2026-Q2"
          />
        </el-form-item>
        <el-form-item label="说明">
          <el-input
            v-model="dividendForm.description"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDividendDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="savingDividend"
          @click="submitDividend"
        >
          提交审批
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { instituteApi } from "@/api";

const loading = ref(false);
const loadError = ref(false);
// 403：无权限（非研究院管理层且非平台管理角色），与网络错误分开降级
const forbidden = ref(false);
const period = ref("");

/** 金额千分位两位小数 */
function fmt(v: number | undefined) { return Number(v || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
/** 分红记录行（字段宽松 optional） */
interface DividendRow {
  user?: { nickname?: string };
  type?: string;
  amount?: number;
  description?: string;
  period?: string;
  createdAt?: string;
}
/** 研究院财务概览数据 */
interface FinanceData {
  totalRevenue?: number;
  instituteShare?: number;
  totalDividends?: number;
  pendingDividends?: number;
  canRequestDividend?: boolean;
  remaining?: number;
  dividends?: DividendRow[];
}
/** 成员下拉选项 */
interface MemberOption { id?: string; userId?: string; user?: { nickname?: string } }
const finance = ref<FinanceData>({});

const showDividendDialog = ref(false);
const savingDividend = ref(false);
const dividendForm = ref({ userId: "", type: "MGMT_BONUS", amount: 0, period: "", description: "" });
const memberOptions = ref<MemberOption[]>([]);

function dividendTypeLabel(t: string) {
  const m: Record<string,string> = { MGMT_BONUS: "管理层分红", TEACHER_AWARD: "优秀老师奖励", OPERATION: "运营费用" };
  return m[t] || t;
}

onMounted(() => { fetchFinance(); fetchMembers(); });

async function fetchFinance() {
  loading.value = true;
  loadError.value = false;
  forbidden.value = false;
  try {
    const { data } = await instituteApi.getFinance(period.value || undefined);
    finance.value = data;
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 403) forbidden.value = true;
    else loadError.value = true;
  } finally { loading.value = false; }
}

async function fetchMembers() {
  try {
    const { data } = await instituteApi.listMembers({ pageSize: 200 });
    memberOptions.value = data.items || data.members || data.data || [];
  } catch {}
}

function openDividendDialog() {
  if (!finance.value.canRequestDividend) { ElMessage.warning("仅本院在册管理层可发起分配审批"); return; }
  if (Number(finance.value.remaining || 0) <= 0) { ElMessage.warning("暂无可申请分配余额"); return; }
  if (!memberOptions.value.length) { ElMessage.warning("暂无可选择的在册成员"); return; }
  dividendForm.value = { userId: "", type: "MGMT_BONUS", amount: 0, period: "", description: "" };
  showDividendDialog.value = true;
}

async function submitDividend() {
  if (savingDividend.value) return;
  // 资金操作前置校验：成员必选、金额必须大于 0
  if (!dividendForm.value.userId) { ElMessage.warning("请选择分配成员"); return; }
  if (!dividendForm.value.amount || dividendForm.value.amount <= 0) { ElMessage.warning("分配金额必须大于 0"); return; }
  if (dividendForm.value.amount > Number(finance.value.remaining || 0)) { ElMessage.warning("分配金额不能超过可申请余额"); return; }
  // 确认框写明对象与金额（资金类操作，防误点）
  const memberName = memberOptions.value.find((m) => m.userId === dividendForm.value.userId)?.user?.nickname || dividendForm.value.userId;
  try {
    await ElMessageBox.confirm(
      `确认向「${memberName}」申请分配${dividendTypeLabel(dividendForm.value.type)} ¥${fmt(dividendForm.value.amount)}？提交后进入财务审批流。`,
      "确认分配审批",
      { type: "warning", confirmButtonText: "提交审批", cancelButtonText: "取消" },
    );
  } catch {
    return; // 用户取消
  }
  savingDividend.value = true;
  try {
    await instituteApi.createDividend(dividendForm.value);
    ElMessage.success("已提交审批；通过后生成分配确认记录");
    showDividendDialog.value = false;
    dividendForm.value = { userId: "", type: "MGMT_BONUS", amount: 0, period: "", description: "" };
    fetchFinance();
  } catch (e) { ElMessage.error((e as Error)?.message || "分配审批提交失败，请重试"); }
  finally { savingDividend.value = false; }
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
.header h2 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.overview-row { margin-bottom: 16px; }
.stat-label { font-size: 13px; color: var(--color-text-secondary); }
.stat-value { font-size: 22px; font-weight: 600; color: var(--color-text-title); margin-top: 4px; }
.section-card { margin-bottom: 16px; }
</style>
