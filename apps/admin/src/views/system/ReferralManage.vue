<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";
import { createConfirmMessage } from "@/lib/confirm-message";
import { useAuthStore } from "@/store/auth";

interface ReferralConfig {
  id?: string;
  stationId?: string | null;
  operatorId?: string | null;
  commissionRate?: number | string;
  validFrom?: string;
  validTo?: string;
  createdBy?: string | null;
  createdAt?: string;
}

type TabName = "all" | "history";

const auth = useAuthStore();
const loading = ref(false);
const activeLoading = ref(false);
const saving = ref(false);
const loadError = ref(false);
const activeError = ref(false);
const list = ref<ReferralConfig[]>([]);
const activeConfigs = ref<ReferralConfig[]>([]);
const total = ref(0);
const allTotal = ref(0);
const page = ref(1);
const vis = ref(false);
const editingId = ref("");
const tab = ref<TabName>("all");
const form = reactive({
  stationId: "",
  operatorId: "",
  commissionRate: 10,
  validFrom: "",
  validTo: "",
});

const displayTotal = computed(() => Math.max(allTotal.value, activeConfigs.value.length));
const canDelete = computed(() => auth.isSuperAdmin);

onMounted(() => {
  void fetchList();
  void fetchActive();
});

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toPickerValue(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function toIso(value: string): string {
  return new Date(value.replace(" ", "T")).toISOString();
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function scopeText(config: ReferralConfig): string {
  if (config.stationId) return `分站「${config.stationId}」`;
  if (config.operatorId) return `运营商「${config.operatorId}」`;
  return "全局";
}

function scopeType(config: ReferralConfig): string {
  if (config.stationId) return "分站";
  if (config.operatorId) return "运营商";
  return "全局";
}

function statusOf(config: ReferralConfig): { text: string; type: "success" | "warning" | "info" } {
  const now = Date.now();
  const start = config.validFrom ? new Date(config.validFrom).getTime() : Number.NaN;
  const end = config.validTo ? new Date(config.validTo).getTime() : Number.NaN;
  if (Number.isNaN(start) || Number.isNaN(end)) return { text: "时间异常", type: "warning" };
  if (now < start) return { text: "待生效", type: "warning" };
  if (now <= end) return { text: "生效中", type: "success" };
  return { text: "已到期", type: "info" };
}

function defaultWindow() {
  const start = new Date();
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { validFrom: toPickerValue(start), validTo: toPickerValue(end) };
}

async function fetchActive() {
  activeLoading.value = true;
  activeError.value = false;
  try {
    const { data } = await api.get("/admin/referral/temp-configs/active");
    activeConfigs.value = Array.isArray(data) ? data : data ? [data] : [];
  } catch {
    activeError.value = true;
    activeConfigs.value = [];
  } finally {
    activeLoading.value = false;
  }
}

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  const url = tab.value === "history"
    ? "/admin/referral/temp-configs/history"
    : "/admin/referral/temp-configs";
  try {
    const { data } = await api.get(url, { params: { page: page.value, pageSize: 20 } });
    list.value = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    total.value = Number(data?.total ?? list.value.length) || 0;
    if (tab.value === "all") allTotal.value = total.value;
  } catch {
    loadError.value = true;
    list.value = [];
    total.value = 0;
    if (tab.value === "all") allTotal.value = 0;
    ElMessage.error("临时分佣配置加载失败，请重试");
  } finally {
    loading.value = false;
  }
}

function onTabChange() {
  page.value = 1;
  void fetchList();
}

function openCreate() {
  editingId.value = "";
  Object.assign(form, {
    stationId: "",
    operatorId: "",
    commissionRate: 10,
    ...defaultWindow(),
  });
  vis.value = true;
}

function openEdit(row: ReferralConfig) {
  editingId.value = row.id ?? "";
  Object.assign(form, {
    stationId: row.stationId || "",
    operatorId: row.operatorId || "",
    commissionRate: Number(row.commissionRate) || 0,
    validFrom: row.validFrom ? toPickerValue(row.validFrom) : "",
    validTo: row.validTo ? toPickerValue(row.validTo) : "",
  });
  vis.value = true;
}

function validateForm(): string | null {
  const stationId = form.stationId.trim();
  const operatorId = form.operatorId.trim();
  if (stationId && operatorId) return "分站 ID 和运营商 ID 只能填写一个";
  if (!Number.isFinite(form.commissionRate) || form.commissionRate < 0 || form.commissionRate > 100) {
    return "佣金比例必须在 0 到 100 之间";
  }
  if (!form.validFrom || !form.validTo) return "开始时间和结束时间都必须填写";
  const start = new Date(form.validFrom.replace(" ", "T"));
  const end = new Date(form.validTo.replace(" ", "T"));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "有效期格式不正确";
  if (start.getTime() >= end.getTime()) return "结束时间必须晚于开始时间";
  return null;
}

async function save() {
  const error = validateForm();
  if (error) {
    ElMessage.warning(error);
    return;
  }

  const stationId = form.stationId.trim();
  const operatorId = form.operatorId.trim();
  const scope = scopeText({ stationId, operatorId });
  const period = `${form.validFrom} ~ ${form.validTo}`;
  try {
    await ElMessageBox.confirm(
      createConfirmMessage({
        headline: "即将提交临时分佣配置审批",
        headlineTone: "warning",
        rows: [
          { label: "生效范围", value: scope },
          { label: "佣金比例", value: `${Number(form.commissionRate).toFixed(1)}%`, tone: "warning" },
          { label: "有效期", value: period },
        ],
        description: "提交后不会立即改变佣金；财务审批通过后，新支付的临时推荐订单才会使用新比例。",
        warning: "管理奖随本单实际获佣分站归属计算；分站规则优先于运营商规则，运营商规则优先于全局规则。",
        warningTone: "danger",
      }),
      "临时分佣配置审批确认",
      { type: "warning", confirmButtonText: "确认提交审批" },
    );
  } catch {
    return;
  }

  const payload = {
    commissionRate: Number(form.commissionRate),
    stationId: stationId || null,
    operatorId: operatorId || null,
    validFrom: toIso(form.validFrom),
    validTo: toIso(form.validTo),
  };

  saving.value = true;
  try {
    const response = editingId.value
      ? await api.put(`/admin/referral/temp-configs/${editingId.value}`, payload)
      : await api.post("/admin/referral/temp-configs", payload);
    ElMessage.success(response.data?.message || "已提交审批，请在资金审批中心查看进度");
    vis.value = false;
    await Promise.all([fetchList(), fetchActive()]);
  } finally {
    saving.value = false;
  }
}

async function del(row: ReferralConfig) {
  if (!row.id) return;
  try {
    await ElMessageBox.confirm(
      createConfirmMessage({
        headline: "即将提交删除临时分佣配置审批",
        headlineTone: "danger",
        rows: [
          { label: "生效范围", value: scopeText(row) },
          { label: "佣金比例", value: `${Number(row.commissionRate).toFixed(1)}%` },
          { label: "有效期", value: `${formatDate(row.validFrom)} ~ ${formatDate(row.validTo)}` },
        ],
        description: "审批通过并删除后，该范围将按下一条命中的临时配置或默认佣金规则计算。",
        warning: "删除生效中的配置会改变后续订单分佣，请确认回落规则符合预期。",
        warningTone: "danger",
      }),
      "删除临时分佣配置审批确认",
      { type: "error", confirmButtonText: "确认提交删除审批" },
    );
    const { data } = await api.delete(`/admin/referral/temp-configs/${row.id}`);
    ElMessage.success(data?.message || "已提交删除审批，请在资金审批中心查看进度");
    await Promise.all([fetchList(), fetchActive()]);
  } catch {
    // 用户取消或接口拦截器已提示错误。
  }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div>
        <h3>临时分佣配置</h3>
        <p>为临时推荐订单设置全局、运营商或分站佣金；到期自动回落，不改变用户永久归属。</p>
      </div>
      <el-button
        type="primary"
        @click="openCreate"
      >
        创建临时配置
      </el-button>
    </div>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      title="仅影响审批通过后新支付的临时推荐订单；管理奖随实际获佣分站归属计算，所有变更均须资金审批"
      class="impact-alert"
    />

    <el-row
      :gutter="16"
      class="summary-grid"
    >
      <el-col
        :xs="12"
        :sm="8"
        :md="6"
      >
        <el-card
          shadow="never"
          class="summary-card"
        >
          <el-statistic
            title="配置总数"
            :value="displayTotal"
          />
        </el-card>
      </el-col>
      <el-col
        :xs="12"
        :sm="8"
        :md="6"
      >
        <el-card
          shadow="never"
          class="summary-card active-summary"
        >
          <el-statistic
            title="当前生效"
            :value="activeConfigs.length"
          />
        </el-card>
      </el-col>
    </el-row>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="作用域优先级"
      description="分站配置优先于所属运营商配置，运营商配置优先于全局配置；同一层级同时生效时，以最新创建的配置为准。分站 ID 与运营商 ID 均留空表示全局。"
      class="impact-alert"
    />

    <el-alert
      v-if="activeError"
      type="error"
      :closable="false"
      show-icon
      title="当前生效配置加载失败"
      class="impact-alert"
    >
      <el-button
        size="small"
        @click="fetchActive"
      >
        重试
      </el-button>
    </el-alert>

    <el-card
      shadow="never"
      class="active-card"
    >
      <template #header>
        <div class="card-heading">
          <b>当前生效规则</b>
          <span>仅展示此刻位于有效期内的配置</span>
        </div>
      </template>
      <el-table
        v-loading="activeLoading"
        :data="activeConfigs"
        row-key="id"
        empty-text=" "
      >
        <template #empty>
          <el-empty
            description="当前没有临时分佣规则，订单使用默认佣金配置"
            :image-size="72"
          />
        </template>
        <el-table-column
          label="范围"
          min-width="220"
        >
          <template #default="{ row }">
            <div class="scope-cell">
              <el-tag
                type="success"
                size="small"
                effect="plain"
              >
                {{ scopeType(row) }}
              </el-tag>
              <span>{{ row.stationId || row.operatorId || '全局' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="佣金比例"
          width="110"
        >
          <template #default="{ row }">
            <strong class="rate">{{ Number(row.commissionRate).toFixed(1) }}%</strong>
          </template>
        </el-table-column>
        <el-table-column
          label="有效期"
          min-width="330"
        >
          <template #default="{ row }">
            {{ formatDate(row.validFrom) }} ~ {{ formatDate(row.validTo) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-tabs
      v-model="tab"
      class="config-tabs"
      @tab-change="onTabChange"
    >
      <el-tab-pane
        label="全部配置"
        name="all"
      />
      <el-tab-pane
        label="已到期记录"
        name="history"
      />
    </el-tabs>

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="配置列表加载失败"
      class="impact-alert"
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
      stripe
      row-key="id"
      empty-text=" "
    >
      <template #empty>
        <el-empty :description="tab === 'history' ? '暂无已到期配置' : '暂无临时分佣配置'" />
      </template>
      <el-table-column
        label="范围"
        min-width="230"
      >
        <template #default="{ row }">
          <div class="scope-cell">
            <el-tag
              size="small"
              effect="plain"
            >
              {{ scopeType(row) }}
            </el-tag>
            <span>{{ row.stationId || row.operatorId || '全局' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="佣金比例"
        width="110"
      >
        <template #default="{ row }">
          <strong class="rate">{{ Number(row.commissionRate).toFixed(1) }}%</strong>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="statusOf(row).type"
            size="small"
          >
            {{ statusOf(row).text }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="有效期"
        min-width="330"
      >
        <template #default="{ row }">
          {{ formatDate(row.validFrom) }} ~ {{ formatDate(row.validTo) }}
        </template>
      </el-table-column>
      <el-table-column
        label="创建人"
        prop="createdBy"
        width="130"
      >
        <template #default="{ row }">
          {{ row.createdBy || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        v-if="tab === 'all'"
        label="操作"
        width="160"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            v-if="canDelete"
            v-permission="['SUPER_ADMIN']"
            size="small"
            type="danger"
            @click="del(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div
      v-if="total > 20"
      class="pagination-wrap"
    >
      <el-pagination
        v-model:current-page="page"
        :total="total"
        :page-size="20"
        layout="total, prev, pager, next"
        @current-change="fetchList"
      />
    </div>

    <el-dialog
      v-model="vis"
      :title="editingId ? '编辑临时分佣配置' : '创建临时分佣配置'"
      width="min(680px, calc(100vw - 32px))"
      :close-on-click-modal="false"
    >
      <el-alert
        type="info"
        :closable="false"
        title="只填写一个作用域；两个 ID 均留空表示全局生效"
        class="dialog-alert"
      />
      <el-form
        :model="form"
        label-width="110px"
      >
        <el-row :gutter="16">
          <el-col
            :xs="24"
            :sm="12"
          >
            <el-form-item label="分站 ID">
              <el-input
                v-model="form.stationId"
                maxlength="64"
                clearable
                placeholder="与运营商 ID 二选一"
              />
            </el-form-item>
          </el-col>
          <el-col
            :xs="24"
            :sm="12"
          >
            <el-form-item label="运营商 ID">
              <el-input
                v-model="form.operatorId"
                maxlength="64"
                clearable
                placeholder="与分站 ID 二选一"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item
          label="佣金比例"
          required
        >
          <el-input-number
            v-model="form.commissionRate"
            :min="0"
            :max="100"
            :precision="1"
            :step="1"
            style="width:100%"
          />
          <div class="field-help">
            输入百分比，例如 10 表示订单实付金额的 10%。
          </div>
        </el-form-item>
        <el-row :gutter="16">
          <el-col
            :xs="24"
            :sm="12"
          >
            <el-form-item
              label="开始时间"
              required
            >
              <el-date-picker
                v-model="form.validFrom"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col
            :xs="24"
            :sm="12"
          >
            <el-form-item
              label="结束时间"
              required
            >
              <el-date-picker
                v-model="form.validTo"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="vis = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="save"
        >
          提交审批
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.toolbar h3 { margin: 0; color: var(--color-text-title); font-size: 20px; }
.toolbar p { margin: 6px 0 0; color: var(--color-text-secondary); font-size: 13px; line-height: 1.6; }
.impact-alert { margin-bottom: 14px; }
.summary-grid { margin-bottom: 14px; }
.summary-card { border-color: var(--color-border-light); }
.active-summary { border-left: 3px solid var(--color-success); }
.active-card { margin-bottom: 18px; border-left: 3px solid var(--color-success); }
.card-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.card-heading span { color: var(--color-text-secondary); font-size: 12px; }
.config-tabs { margin-top: 4px; }
.scope-cell { display: flex; align-items: center; gap: 8px; min-width: 0; }
.scope-cell span { overflow: hidden; color: var(--color-text-title); text-overflow: ellipsis; white-space: nowrap; }
.rate { color: var(--color-gold); font-variant-numeric: tabular-nums; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
.dialog-alert { margin-bottom: 16px; }
.field-help { width: 100%; margin-top: 4px; color: var(--color-text-secondary); font-size: 12px; line-height: 1.5; }

@media (max-width: 760px) {
  .toolbar { flex-direction: column; }
  .toolbar .el-button { width: 100%; }
  .card-heading { align-items: flex-start; flex-direction: column; }
  .pagination-wrap { overflow-x: auto; justify-content: flex-start; }
}
</style>
