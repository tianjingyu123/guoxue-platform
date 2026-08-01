<template>
  <div class="page">
    <div class="header">
      <h2>佣金配置管理</h2>
      <p class="desc">
        调整各业务场景的分佣比例/定价，提交后需财务在资金审批中心审批通过方可生效。
      </p>
    </div>

    <el-result
      v-if="error && !loading"
      icon="error"
      title="加载失败"
      sub-title="佣金配置加载出错，请重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchConfigs"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-table
      v-else
      v-loading="loading"
      :data="configs"
      border
      stripe
    >
      <template #empty>
        <el-empty
          v-if="!loading"
          description="暂无佣金配置"
          :image-size="80"
        />
      </template>
      <el-table-column
        prop="configKey"
        label="配置键"
        width="180"
        show-overflow-tooltip
      />
      <el-table-column
        label="名称"
        width="200"
      >
        <template #default="{ row }">
          {{ row.configName || row.configKey }}
          <el-tag
            v-if="pendingKeys.has(row.configKey)"
            type="warning"
            size="small"
            style="margin-left:6px"
          >
            变更审批中
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        width="130"
        align="right"
      >
        <template #header>
          <el-tooltip
            content="分成方（讲师/圈主/站长等受益人）的比例；定价类配置此列为金额/币数"
            placement="top"
          >
            <span>受益方(A)</span>
          </el-tooltip>
        </template>
        <template #default="{ row }">
          {{ formatVal(row, 'rateA') }}
        </template>
      </el-table-column>
      <el-table-column
        width="120"
        align="right"
      >
        <template #header>
          <el-tooltip
            content="平台留存比例；运营商档位此列为包含名额（个）"
            placement="top"
          >
            <span>平台(B)</span>
          </el-tooltip>
        </template>
        <template #default="{ row }">
          {{ formatVal(row, 'rateB') }}
        </template>
      </el-table-column>
      <el-table-column
        width="120"
        align="right"
      >
        <template #header>
          <el-tooltip
            content="第三角色（驿站等）比例，无则为 —"
            placement="top"
          >
            <span>第三方(C)</span>
          </el-tooltip>
        </template>
        <template #default="{ row }">
          {{ row.rateC != null ? formatVal(row, 'rateC') : '—' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="description"
        label="场景说明"
        min-width="240"
        show-overflow-tooltip
      />
      <el-table-column
        label="操作"
        width="80"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            type="primary"
            size="small"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="编辑佣金配置"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="提交后进入资金审批中心，财务审批通过才生效"
        style="margin-bottom:12px"
      />
      <el-form
        v-if="editRow"
        :model="form"
        label-position="left"
        label-width="150px"
      >
        <el-form-item label="配置名称">
          <el-input
            :model-value="editRow.configName || editRow.configKey"
            disabled
          />
        </el-form-item>
        <el-form-item :label="fieldMeta.labelA">
          <el-input-number
            v-model="form.rateA"
            :min="0"
            :max="fieldMeta.isPrice ? 999999 : 100"
            :step="fieldMeta.isPrice ? 10 : 0.5"
            :precision="fieldMeta.isPrice ? (fieldMeta.unitA === '币' ? 0 : 2) : 1"
            controls-position="right"
            style="width:200px"
          />
          <span class="rate-unit">{{ fieldMeta.isPrice ? fieldMeta.unitA : '%' }}</span>
        </el-form-item>
        <el-form-item
          v-if="fieldMeta.showB"
          :label="fieldMeta.labelB"
        >
          <el-input-number
            v-model="form.rateB"
            :min="0"
            :max="fieldMeta.isQuotaB ? 9999 : 100"
            :step="fieldMeta.isQuotaB ? 1 : 0.5"
            :precision="fieldMeta.isQuotaB ? 0 : 1"
            controls-position="right"
            style="width:200px"
          />
          <span class="rate-unit">{{ fieldMeta.isQuotaB ? '个' : '%' }}</span>
        </el-form-item>
        <el-form-item
          v-if="fieldMeta.showC"
          label="第三方比例(C)"
        >
          <el-input-number
            v-model="form.rateC"
            :min="0"
            :max="100"
            :step="0.5"
            :precision="1"
            controls-position="right"
            style="width:200px"
          />
          <span class="rate-unit">%</span>
        </el-form-item>
        <el-form-item label="说明">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="配置说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
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

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { commissionApi } from "@/api";
import { ElMessage, ElMessageBox } from "element-plus";

// 佣金配置行：依据表格列与编辑表单访问字段声明（含动态键索引以便 formatVal 取值）
interface CommissionConfigRow {
  configKey: string
  configName?: string
  rateA?: number | string
  rateB?: number | string
  rateC?: number | string
  description?: string
  [k: string]: unknown
}

// ── 定价类配置白名单（只读核实自后端代码，rateA 存的是价格/币数而非比例）──
// withdrawal_min          最低提现金额（¥·commission.service 读 rateA 判提现下限）
// practitioner_pro_monthly 从业者会员月费（¥·practitioner.service 读 rateA 作价格）
// station_master_price    分站年租（¥·shop-order.service resolveBillingPrice）
// operator_SILVER/GOLD/DIAMOND/BLACK_GOLD 运营商档位加盟费（¥ rateA + 名额 rateB·shop-payment.service）
// case_reward_basic/good/premium 案例投稿奖励（国学币·bazi-case.service 读 rateA 作币数）
interface PriceMeta { label: string; unit: "¥" | "币"; quotaB?: boolean }
const PRICE_KEYS: Record<string, PriceMeta> = {
  withdrawal_min: { label: "最低提现金额", unit: "¥" },
  practitioner_pro_monthly: { label: "从业者会员月费", unit: "¥" },
  station_master_price: { label: "分站年租", unit: "¥" },
  operator_SILVER: { label: "运营商加盟费(白银)", unit: "¥", quotaB: true },
  operator_GOLD: { label: "运营商加盟费(黄金)", unit: "¥", quotaB: true },
  operator_DIAMOND: { label: "运营商加盟费(钻石)", unit: "¥", quotaB: true },
  operator_BLACK_GOLD: { label: "运营商加盟费(黑金)", unit: "¥", quotaB: true },
  case_reward_basic: { label: "案例投稿奖励(基础)", unit: "币" },
  case_reward_good: { label: "案例投稿奖励(良好)", unit: "币" },
  case_reward_premium: { label: "案例投稿奖励(精品)", unit: "币" },
};

const configs = ref<CommissionConfigRow[]>([]);
const loading = ref(false);
const error = ref(false);
const dialogVisible = ref(false);
const editRow = ref<CommissionConfigRow | null>(null);
const saving = ref(false);
const form = ref({ rateA: 0, rateB: 0, rateC: 0, description: "" });
// 本地标记：本会话内已提交审批的配置键（审批通过前列表仍显示旧值）
const pendingKeys = ref<Set<string>>(new Set());

const fieldMeta = computed(() => {
  const key = editRow.value?.configKey || "";
  const price = PRICE_KEYS[key];
  if (price) {
    return {
      isPrice: true,
      unitA: price.unit,
      labelA: `${price.label}(${price.unit === "¥" ? "元" : "国学币"})`,
      showB: !!price.quotaB,
      labelB: "包含名额(个)",
      isQuotaB: !!price.quotaB,
      showC: false,
    };
  }
  return {
    isPrice: false,
    unitA: "%" as const,
    labelA: "受益方比例(A)(%)",
    showB: true,
    labelB: "平台比例(B)(%)",
    isQuotaB: false,
    showC: true,
  };
});

onMounted(() => fetchConfigs());

async function fetchConfigs() {
  loading.value = true;
  error.value = false;
  try {
    const { data } = await commissionApi.getConfigs();
    configs.value = data || [];
  } catch {
    error.value = true;
    configs.value = [];
  } finally {
    loading.value = false;
  }
}

/**
 * 列显示：比例类 → 0~1 小数换算成 %；定价类（白名单）→ 显示 ¥/币，绝不乘 100
 * （黑盒实锤的「99900.0%」= 把 999 元年租当比例 ×100 显示，此处根治）
 */
function formatVal(row: CommissionConfigRow, field: string) {
  const val = row[field];
  if (val == null) return "—";
  const price = PRICE_KEYS[row.configKey];
  if (price) {
    if (field === "rateA") {
      const n = Number(val);
      return price.unit === "¥"
        ? `¥${n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `${n.toLocaleString("zh-CN")} 币`;
    }
    if (field === "rateB") {
      if (price.quotaB) return `${Number(val)} 个名额`;
      return Number(val) ? `${(Number(val) * 100).toFixed(1)}%` : "—";
    }
    return "—";
  }
  return `${(Number(val) * 100).toFixed(1)}%`;
}

function openEdit(row: CommissionConfigRow) {
  editRow.value = row;
  const price = PRICE_KEYS[row.configKey];
  if (price) {
    form.value = {
      rateA: Number(row.rateA) || 0, // 定价原值，不做 ×100
      rateB: price.quotaB ? Number(row.rateB) || 0 : 0,
      rateC: 0,
      description: row.description || "",
    };
  } else {
    form.value = {
      rateA: Number(row.rateA) * 100,
      rateB: Number(row.rateB) * 100,
      rateC: row.rateC != null ? Number(row.rateC) * 100 : 0,
      description: row.description || "",
    };
  }
  dialogVisible.value = true;
}

async function save() {
  if (!editRow.value || saving.value) return;
  const key = editRow.value.configKey;
  const price = PRICE_KEYS[key];
  // L3 影响预告：分佣/定价变更直接影响资金结算
  try {
    await ElMessageBox.confirm(
      price
        ? `将「${editRow.value.configName || key}」调整为 ${form.value.rateA} ${price.unit === "¥" ? "元" : "国学币"}${price.quotaB ? `（名额 ${form.value.rateB} 个）` : ""}，提交财务审批？`
        : `将「${editRow.value.configName || key}」分成调整为 A ${form.value.rateA}% / B ${form.value.rateB}% / C ${form.value.rateC}%，该变更影响后续所有相关订单的资金结算。提交财务审批？`,
      "提交变更审批",
      { type: "warning", confirmButtonText: "提交审批", cancelButtonText: "取消" },
    );
  } catch { return; }
  saving.value = true;
  try {
    const data: Record<string, unknown> = { description: form.value.description };
    if (price) {
      data.rateA = form.value.rateA; // 定价原值直传（不 /100）
      if (price.quotaB) data.rateB = form.value.rateB;
    } else {
      data.rateA = form.value.rateA / 100;
      data.rateB = form.value.rateB / 100;
      data.rateC = form.value.rateC / 100;
    }
    await commissionApi.updateConfig(key, data);
    pendingKeys.value.add(key);
    ElMessage.success("已提交审批，待财务审批通过后生效（列表在审批通过前仍显示旧值）");
    dialogVisible.value = false;
    await fetchConfigs();
  } catch {
    // 拦截器已处理
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0 0 4px; font-size: 18px; color: var(--color-text-title); }
.desc { margin: 0; font-size: 13px; color: var(--color-text-secondary); }
.rate-unit { margin-left: 8px; color: var(--color-text-body); }
</style>
