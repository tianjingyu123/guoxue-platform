<template>
  <div class="page">
    <div class="header">
      <h2>佣金配置管理</h2>
      <p class="desc">
        调整各业务场景的分佣比例，提交后需财务审批通过方可生效。
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
        width="160"
      />
      <el-table-column
        prop="configName"
        label="名称"
        width="180"
      />
      <el-table-column
        label="角色A比例"
        width="110"
      >
        <template #default="{ row }">
          {{ formatRate(row, 'rateA') }}
        </template>
      </el-table-column>
      <el-table-column
        label="角色B比例"
        width="110"
      >
        <template #default="{ row }">
          {{ formatRate(row, 'rateB') }}
        </template>
      </el-table-column>
      <el-table-column
        label="角色C比例"
        width="110"
      >
        <template #default="{ row }">
          {{ row.rateC != null ? formatRate(row, 'rateC') : '--' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="description"
        label="说明"
        min-width="240"
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
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        v-if="editRow"
        :model="form"
        label-position="left"
        label-width="130px"
      >
        <el-form-item label="配置名称">
          <el-input
            :model-value="editRow.configName"
            disabled
          />
        </el-form-item>
        <el-form-item :label="rateALabel">
          <el-input-number
            v-model="form.rateA"
            :min="0"
            :max="isWithdrawalMin ? 99999 : 100"
            :step="isWithdrawalMin ? 10 : 0.5"
            :precision="isWithdrawalMin ? 0 : 1"
            controls-position="right"
            style="width:200px"
          />
          <span
            v-if="!isWithdrawalMin"
            class="rate-unit"
          >%</span>
        </el-form-item>
        <el-form-item
          v-if="!isWithdrawalMin"
          label="角色B比例"
        >
          <el-input-number
            v-model="form.rateB"
            :min="0"
            :max="100"
            :step="0.5"
            :precision="1"
            controls-position="right"
            style="width:200px"
          />
          <span class="rate-unit">%</span>
        </el-form-item>
        <el-form-item
          v-if="!isWithdrawalMin"
          label="角色C比例"
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
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { commissionApi } from "@/api";
import { ElMessage } from "element-plus";

const configs = ref<any[]>([]);
const loading = ref(false);
const error = ref(false);
const dialogVisible = ref(false);
const editRow = ref<any>(null);
const saving = ref(false);
const form = ref({ rateA: 0, rateB: 0, rateC: 0, description: "" });

const isWithdrawalMin = computed(() => editRow.value?.configKey === "withdrawal_min");
const rateALabel = computed(() => isWithdrawalMin.value ? "最低提现金额(元)" : "角色A比例(%)");

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

function formatRate(row: any, field: string) {
  const val = row[field];
  if (val == null) return "--";
  if (row.configKey === "withdrawal_min") return `¥${Number(val)}`;
  return `${(Number(val) * 100).toFixed(1)}%`;
}

function openEdit(row: any) {
  editRow.value = row;
  form.value = {
    rateA: row.configKey === "withdrawal_min" ? Number(row.rateA) : Number(row.rateA) * 100,
    rateB: Number(row.rateB) * 100,
    rateC: row.rateC != null ? Number(row.rateC) * 100 : 0,
    description: row.description || "",
  };
  dialogVisible.value = true;
}

async function save() {
  if (!editRow.value) return;
  saving.value = true;
  try {
    const data: any = {};
    if (isWithdrawalMin.value) {
      data.rateA = form.value.rateA;
      data.description = form.value.description;
    } else {
      data.rateA = form.value.rateA / 100;
      data.rateB = form.value.rateB / 100;
      data.rateC = form.value.rateC / 100;
      data.description = form.value.description;
    }
    await commissionApi.updateConfig(editRow.value.configKey, data);
    ElMessage.success("已提交审批，待财务审批后生效");
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
