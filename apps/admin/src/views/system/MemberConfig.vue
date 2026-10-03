<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";
import { createConfirmMessage } from "@/lib/confirm-message";

type PlanLevel = "MONTHLY" | "QUARTERLY" | "YEARLY" | "YEARLY_AUTO" | "LIFETIME";

interface MemberConfigRow {
  id: string;
  level: PlanLevel;
  name: string;
  price: number | string;
  coinBonus?: number;
  monthlyPoints?: number;
  monthlyCouponId?: string | null;
  sort?: number;
  benefits?: unknown;
  maxBorrowDays?: number;
  isActive?: boolean;
  updatedAt?: string;
  createdAt?: string;
}

interface LevelOption {
  value: PlanLevel;
  label: string;
  defaultName: string;
  defaultSort: number;
  disabled?: boolean;
}

const levelOptions: LevelOption[] = [
  { value: "MONTHLY", label: "月卡（MONTHLY）", defaultName: "书院会员·月卡", defaultSort: 1 },
  { value: "QUARTERLY", label: "季卡（QUARTERLY）", defaultName: "书院会员·季卡", defaultSort: 2 },
  { value: "YEARLY", label: "年卡（YEARLY）", defaultName: "书院会员·年卡", defaultSort: 3 },
  { value: "YEARLY_AUTO", label: "连续包年（YEARLY_AUTO）", defaultName: "书院会员·连续包年", defaultSort: 4 },
  { value: "LIFETIME", label: "终身会员（已停售）", defaultName: "终身会员", defaultSort: 9, disabled: true },
];

const durationLabel: Record<PlanLevel, string> = {
  MONTHLY: "30 天",
  QUARTERLY: "90 天",
  YEARLY: "365 天",
  YEARLY_AUTO: "365 天自动续费档",
  LIFETIME: "永久",
};

const BASE = "/system/member-configs";
const loading = ref(false);
const saving = ref(false);
const loadError = ref(false);
const list = ref<MemberConfigRow[]>([]);
const vis = ref(false);
const editingId = ref("");

const form = reactive({
  level: "MONTHLY" as PlanLevel,
  name: "书院会员·月卡",
  price: 0,
  monthlyPoints: 0,
  monthlyCouponId: "",
  sort: 1,
  benefitsText: "",
  maxBorrowDays: 30,
  isActive: true,
});

const sortedList = computed(() =>
  [...list.value].sort((a, b) => (a.sort ?? 9999) - (b.sort ?? 9999) || Number(a.price) - Number(b.price)),
);
const existingLevels = computed(() => new Set(list.value.map((row) => row.level)));

onMounted(fetchList);

function levelText(level?: string): string {
  return levelOptions.find((option) => option.value === level)?.label.replace(/（.*$/, "") || level || "-";
}

function durationText(level?: string): string {
  return level && level in durationLabel ? durationLabel[level as PlanLevel] : "-";
}

function formatDate(value?: string): string {
  return value ? new Date(value).toLocaleString() : "-";
}

function benefitList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
  } catch {
    // 兼容历史纯文本；按换行拆分，不把解析失败静默当成空权益。
  }
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function benefitsFromForm(): string[] {
  return [...new Set(form.benefitsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];
}

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    const { data } = await api.get(BASE);
    list.value = Array.isArray(data) ? data : (data?.data ?? data?.memberConfigs ?? []);
  } catch {
    loadError.value = true;
    list.value = [];
    ElMessage.error("会员套餐加载失败，请重试");
  } finally {
    loading.value = false;
  }
}

function applyLevelDefaults(level: PlanLevel) {
  const option = levelOptions.find((item) => item.value === level);
  if (!option || editingId.value) return;
  form.name = option.defaultName;
  form.sort = option.defaultSort;
}

function openCreate() {
  const available = levelOptions.find((option) => !option.disabled && !existingLevels.value.has(option.value));
  if (!available) {
    ElMessage.info("四个在售标准套餐均已配置，请直接编辑现有套餐");
    return;
  }
  editingId.value = "";
  Object.assign(form, {
    level: available.value,
    name: available.defaultName,
    price: 0,
    monthlyPoints: 0,
    monthlyCouponId: "",
    sort: available.defaultSort,
    benefitsText: "",
    maxBorrowDays: 30,
    isActive: true,
  });
  vis.value = true;
}

function openEdit(row: MemberConfigRow) {
  editingId.value = row.id;
  Object.assign(form, {
    level: row.level,
    name: row.name || levelText(row.level),
    price: Number(row.price) || 0,
    monthlyPoints: Number(row.monthlyPoints) || 0,
    monthlyCouponId: row.monthlyCouponId || "",
    sort: Number(row.sort) || 0,
    benefitsText: benefitList(row.benefits).join("\n"),
    maxBorrowDays: Number(row.maxBorrowDays) || 30,
    isActive: row.isActive !== false,
  });
  vis.value = true;
}

function validateForm(): string | null {
  if (!form.name.trim()) return "请输入套餐展示名称";
  if (!Number.isFinite(form.price) || form.price < 0 || form.price > 999999.99) return "价格必须在 0 到 999999.99 元之间";
  if (!Number.isInteger(form.monthlyPoints) || form.monthlyPoints < 0 || form.monthlyPoints > 1000000) return "每月积分必须是 0 到 1000000 的整数";
  if (!Number.isInteger(form.sort) || form.sort < 0 || form.sort > 9999) return "展示排序必须是 0 到 9999 的整数";
  if (!Number.isInteger(form.maxBorrowDays) || form.maxBorrowDays < 1 || form.maxBorrowDays > 3650) return "借阅天数必须是 1 到 3650 的整数";
  if (benefitsFromForm().some((item) => item.length > 200)) return "单条权益文案不能超过 200 字";
  return null;
}

async function save() {
  const error = validateForm();
  if (error) {
    ElMessage.warning(error);
    return;
  }
  const benefits = benefitsFromForm();
  try {
    await ElMessageBox.confirm(
      createConfirmMessage({
        headline: "即将提交会员套餐配置审批",
        headlineTone: "warning",
        rows: [
          { label: "套餐", value: `${levelText(form.level)} · ${form.name}` },
          { label: "价格", value: `¥${Number(form.price).toFixed(2)}`, tone: "warning" },
          { label: "每月积分", value: form.monthlyPoints },
          { label: "状态", value: form.isActive ? "启用并在 C 端售卖" : "停用" },
        ],
        description: form.isActive
          ? "财务审批通过后，C 端会员购买页才会按该价格和权益展示，服务端后续下单也会按此价格收款。"
          : "财务审批通过后 C 端才会停止展示该套餐；已购买用户的现有会员权益不受影响。",
        warning: "资金配置变更：请再次核对价格、套餐标识和启停状态。",
        warningTone: "danger",
      }),
      "会员套餐审批确认",
      { type: "warning", confirmButtonText: "确认提交审批" },
    );
  } catch {
    return;
  }

  const payload = {
    level: form.level,
    name: form.name.trim(),
    price: Number(form.price),
    monthlyPoints: Number(form.monthlyPoints),
    monthlyCouponId: form.monthlyCouponId.trim() || null,
    sort: Number(form.sort),
    benefits,
    maxBorrowDays: Number(form.maxBorrowDays),
    isActive: form.isActive,
  };

  saving.value = true;
  try {
    const response = editingId.value
      ? await api.put(`${BASE}/${editingId.value}`, (({ level: _fixedLevel, ...rest }) => rest)(payload))
      : await api.post(BASE, payload);
    ElMessage.success(response.data?.message || "已提交审批，请在资金审批中心查看进度");
    vis.value = false;
    await fetchList();
  } finally {
    saving.value = false;
  }
}

async function del(row: MemberConfigRow) {
  if (row.isActive) {
    ElMessage.warning("启用中的套餐不能删除，请先编辑为停用状态");
    return;
  }
  try {
    await ElMessageBox.confirm(
      createConfirmMessage({
        headline: "即将提交删除已停售会员套餐审批",
        headlineTone: "danger",
        rows: [
          { label: "套餐", value: `${levelText(row.level)} · ${row.name}` },
          { label: "价格", value: `¥${Number(row.price).toFixed(2)}` },
        ],
        description: "财务审批通过后才会删除该套餐；已购用户权益不受影响。审批提交和执行时都会拦截仍被待支付订单引用的套餐。",
      }),
      "删除会员套餐审批确认",
      { type: "error", confirmButtonText: "确认提交删除审批", confirmButtonClass: "el-button--danger" },
    );
    const { data } = await api.delete(`${BASE}/${row.id}`);
    ElMessage.success(data?.message || "已提交删除审批，请在资金审批中心查看进度");
    await fetchList();
  } catch {
    // 用户取消或接口拦截器已提示。
  }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div>
        <h3>会员套餐配置</h3>
        <p>管理 C 端书院会员的售价、月度积分、权益与售卖状态。</p>
      </div>
      <el-button
        type="primary"
        @click="openCreate"
      >
        新增套餐
      </el-button>
    </div>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      title="价格、积分、赠券和启停状态提交后进入资金审批中心，审批通过才影响 C 端与后续订单；套餐有效期由标识自动确定。"
      class="impact-alert"
    />

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="加载失败"
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
      :data="sortedList"
      stripe
      row-key="id"
      empty-text=" "
    >
      <template #empty>
        <el-empty description="暂无会员套餐配置" />
      </template>
      <el-table-column
        label="套餐"
        min-width="220"
      >
        <template #default="{ row }">
          <div class="plan-cell">
            <el-tag
              :type="row.level === 'YEARLY' ? 'warning' : row.level === 'YEARLY_AUTO' ? 'danger' : 'info'"
              size="small"
            >
              {{ levelText(row.level) }}
            </el-tag>
            <span>{{ row.name }}</span>
            <small>{{ durationText(row.level) }}</small>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="价格"
        width="110"
      >
        <template #default="{ row }">
          <strong class="price">¥{{ Number(row.price).toFixed(2) }}</strong>
        </template>
      </el-table-column>
      <el-table-column
        label="每月积分"
        prop="monthlyPoints"
        width="100"
      />
      <el-table-column
        label="排序"
        prop="sort"
        width="70"
      />
      <el-table-column
        label="权益"
        min-width="300"
      >
        <template #default="{ row }">
          <div
            v-if="benefitList(row.benefits).length"
            class="benefit-list"
          >
            <el-tag
              v-for="item in benefitList(row.benefits)"
              :key="item"
              type="info"
              effect="plain"
              size="small"
            >
              {{ item }}
            </el-tag>
          </div>
          <span
            v-else
            class="muted"
          >未配置</span>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.isActive ? 'success' : 'info'"
            size="small"
          >
            {{ row.isActive ? '在售' : '停售' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="更新时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.updatedAt || row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="150"
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
            size="small"
            type="danger"
            :disabled="row.isActive"
            :title="row.isActive ? '请先停用套餐' : '删除停售套餐'"
            @click="del(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="vis"
      :title="editingId ? '编辑会员套餐' : '新增会员套餐'"
      width="640px"
      :close-on-click-modal="false"
    >
      <el-form
        :model="form"
        label-width="120px"
      >
        <el-form-item
          label="套餐标识"
          required
        >
          <el-select
            v-model="form.level"
            :disabled="!!editingId"
            style="width:100%"
            @change="applyLevelDefaults"
          >
            <el-option
              v-for="option in levelOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
              :disabled="option.disabled || (!editingId && existingLevels.has(option.value))"
            />
          </el-select>
          <div class="field-help">
            套餐标识决定开通时长和自动续费语义，创建后不可修改。
          </div>
        </el-form-item>
        <el-form-item
          label="展示名称"
          required
        >
          <el-input
            v-model="form.name"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item
              label="售价"
              required
            >
              <el-input-number
                v-model="form.price"
                :min="0"
                :max="999999.99"
                :precision="2"
                :step="10"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="每月积分">
              <el-input-number
                v-model="form.monthlyPoints"
                :min="0"
                :max="1000000"
                :precision="0"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="展示排序">
              <el-input-number
                v-model="form.sort"
                :min="0"
                :max="9999"
                :precision="0"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="借阅上限">
              <el-input-number
                v-model="form.maxBorrowDays"
                :min="1"
                :max="3650"
                :precision="0"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="每月赠券模板">
          <el-input
            v-model="form.monthlyCouponId"
            maxlength="100"
            clearable
            placeholder="可选：CouponTemplate ID；留空表示不发券"
          />
        </el-form-item>
        <el-form-item label="权益文案">
          <el-input
            v-model="form.benefitsText"
            type="textarea"
            :rows="6"
            placeholder="每行一条权益，C 端将按顺序展示"
          />
          <div class="field-help">
            自动去重空行；单条最多 200 字。
          </div>
        </el-form-item>
        <el-form-item label="售卖状态">
          <el-switch
            v-model="form.isActive"
            active-text="在售"
            inactive-text="停售"
          />
        </el-form-item>
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
.toolbar p { margin: 6px 0 0; color: var(--color-text-secondary); font-size: 13px; }
.impact-alert { margin-bottom: 14px; }
.plan-cell { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
.plan-cell span { color: var(--color-text-title); font-weight: 600; }
.plan-cell small { flex-basis: 100%; color: var(--color-text-secondary); }
.price { color: var(--color-gold); font-variant-numeric: tabular-nums; }
.benefit-list { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0; }
.muted, .field-help { color: var(--color-text-secondary); font-size: 12px; }
.field-help { width: 100%; margin-top: 4px; line-height: 1.5; }

@media (max-width: 760px) {
  .toolbar { flex-direction: column; }
  .toolbar .el-button { width: 100%; }
}
</style>
