<template>
  <div class="page">
    <div class="header">
      <h2>流失规则管理</h2>
      <el-button
        type="primary"
        @click="openAddDialog"
      >
        添加规则
      </el-button>
    </div>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      title="加载规则列表失败"
      class="error-bar"
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
      border
      stripe
    >
      <el-table-column
        prop="name"
        label="规则名称"
        min-width="140"
      />
      <el-table-column
        prop="riskLevel"
        label="风险等级"
        width="110"
      >
        <template #default="{ row }">
          <el-tag :type="riskTag(row.riskLevel)">
            {{ riskLabel(row.riskLevel) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="scoreThreshold"
        label="最高活跃分"
        width="110"
        sortable
      />
      <el-table-column
        prop="daysThreshold"
        label="最少沉默天数"
        width="110"
      />
      <el-table-column
        prop="actionType"
        label="动作类型"
        width="150"
      >
        <template #default="{ row }">
          <el-tag
            v-if="ACTION_TYPE_MAP[row.actionType]"
            :title="row.actionType"
          >
            {{ ACTION_TYPE_MAP[row.actionType] }}
          </el-tag>
          <el-tag
            v-else
            type="info"
            :title="`动作类型 ${row.actionType} 暂无执行器支持，规则命中后不会真正执行`"
          >
            {{ row.actionType }}（暂不可用）
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="isActive"
        label="启用状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'">
            {{ row.isActive ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="180"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="openEditDialog(row)"
          >
            编辑
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 后端 listRules 返回全量（最多100条）无分页，此处只显示总数，不做假分页 -->
    <div class="total-hint">
      共 {{ total }} 条规则{{ total >= 100 ? '（最多显示 100 条）' : '' }}
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑规则' : '添加规则'"
      width="550px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item
          label="规则名称"
          prop="name"
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item
          label="风险等级"
          prop="riskLevel"
        >
          <el-select
            v-model="form.riskLevel"
            style="width:100%"
          >
            <el-option
              label="低风险"
              value="LOW"
            />
            <el-option
              label="中风险"
              value="MEDIUM"
            />
            <el-option
              label="高风险"
              value="HIGH"
            />
            <el-option
              label="严重风险"
              value="CRITICAL"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="最高活跃分"
          prop="scoreThreshold"
        >
          <el-input-number
            v-model="form.scoreThreshold"
            :min="0"
            :max="100"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item
          label="最少沉默天数"
          prop="daysThreshold"
        >
          <el-input-number
            v-model="form.daysThreshold"
            :min="1"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item
          label="动作类型"
          prop="actionType"
        >
          <!-- 只保留后端执行器真实现的动作（churn.service 仅支持 SMS/COUPON），不上假选项 -->
          <el-select
            v-model="form.actionType"
            style="width:100%"
            @change="handleActionTypeChange"
          >
            <el-option
              label="短信触达"
              value="SMS"
            />
            <el-option
              label="发送优惠券"
              value="COUPON"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="动作配置"
          prop="actionConfig"
        >
          <div style="width:100%">
            <el-input
              v-model="form.actionConfig"
              type="textarea"
              :rows="3"
              :placeholder="actionConfigPlaceholder"
            />
            <div class="config-hint">
              {{ form.actionType === 'SMS'
                ? '短信只发给已在 C 端主动开启“活动与福利短信”的用户；号码取用户主数据。需先配置审核通过的召回模板，默认 7 天冷却。'
                : '填写商城优惠券 couponId 后自动发放并可在下单时真实核销；缺失或失效会诚实转人工/失败。' }}
            </div>
          </div>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="form.isActive" />
          <span
            class="config-hint"
            style="margin-left:8px"
          >
            禁用后规则不参与评分后的自动挽回
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { churnApi } from "@/api";

interface ChurnRule {
  id: string;
  name: string;
  riskLevel: string;
  scoreThreshold: number;
  daysThreshold: number;
  actionType: string;
  actionConfig: unknown;
  isActive: boolean;
}

const loading = ref(false);
const error = ref(false);
const list = ref<ChurnRule[]>([]);
const total = ref(0);
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const currentRow = ref<ChurnRule | null>(null);

// 动作类型词表：仅 SMS/COUPON 有后端执行器（churn.service.ts 执行 switch 只实现这两类）
const ACTION_TYPE_MAP: Record<string, string> = {
  SMS: "短信触达",
  COUPON: "发送优惠券",
};

const SMS_ACTION_CONFIG = '{\n  "cooldownDays": 7,\n  "templateParams": []\n}';
const COUPON_ACTION_CONFIG = '{\n  "couponId": "",\n  "cooldownDays": 7\n}';
const form = reactive({
  name: "",
  riskLevel: "HIGH",
  scoreThreshold: 30,
  daysThreshold: 14,
  actionType: "SMS",
  actionConfig: SMS_ACTION_CONFIG,
  isActive: true,
});
const actionConfigPlaceholder = computed(() => form.actionType === "SMS"
  ? '如 {"cooldownDays":7,"templateParams":[]}'
  : '如 {"couponId":"商城优惠券ID","cooldownDays":7}',
);

const rules = {
  name: [{ required: true, message: "请输入规则名称", trigger: "blur" }],
};

function riskTag(level: string) {
  const map: Record<string, string> = { LOW: "success", MEDIUM: "warning", HIGH: "danger", CRITICAL: "danger" };
  return map[level] || "info";
}

function riskLabel(level: string) {
  const map: Record<string, string> = { LOW: "低风险", MEDIUM: "中风险", HIGH: "高风险", CRITICAL: "严重风险" };
  return map[level] || level;
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    // 后端 listRules 无分页（take:100 全量返回），不传假分页参数
    const res = await churnApi.listRules();
    const rows = Array.isArray(res.data) ? res.data : (res.data.items ?? res.data.rules ?? []);
    list.value = rows;
    total.value = rows.length;
  } catch {
    error.value = true;
    ElMessage.error("获取规则列表失败");
  } finally {
    loading.value = false;
  }
}

function openAddDialog() {
  isEdit.value = false;
  form.name = "";
  form.riskLevel = "HIGH";
  form.scoreThreshold = 30;
  form.daysThreshold = 14;
  form.actionType = "SMS";
  form.actionConfig = SMS_ACTION_CONFIG;
  form.isActive = true;
  dialogVisible.value = true;
}

function handleActionTypeChange(actionType: string) {
  form.actionConfig = actionType === "COUPON" ? COUPON_ACTION_CONFIG : SMS_ACTION_CONFIG;
}

function openEditDialog(row: ChurnRule) {
  isEdit.value = true;
  currentRow.value = row;
  form.name = row.name;
  form.riskLevel = row.riskLevel;
  form.scoreThreshold = row.scoreThreshold;
  form.daysThreshold = row.daysThreshold;
  form.actionType = row.actionType;
  form.isActive = row.isActive ?? true;
  // 后端 actionConfig 为对象，回填到 JSON 文本域
  form.actionConfig =
    row.actionConfig && typeof row.actionConfig === "object"
      ? JSON.stringify(row.actionConfig, null, 2)
      : (row.actionConfig as unknown as string) || "";
  dialogVisible.value = true;
}

async function handleSubmit() {
  if (submitting.value) return;
  // actionConfig 后端要求对象（@IsObject），文本域内容需解析为 JSON
  let actionConfig: Record<string, unknown> = {};
  if (form.actionConfig && form.actionConfig.trim()) {
    try {
      const parsed: unknown = JSON.parse(form.actionConfig);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not-object");
      actionConfig = parsed as Record<string, unknown>;
    } catch {
      ElMessage.error("动作配置必须是合法的 JSON 对象");
      return;
    }
  }
  if (form.actionType === "COUPON"
    && (typeof actionConfig.couponId !== "string" || !actionConfig.couponId.trim())) {
    ElMessage.error("发送优惠券必须填写有效的 couponId");
    return;
  }
  const payload = { ...form, actionConfig };
  submitting.value = true;
  try {
    if (isEdit.value && currentRow.value) {
      await churnApi.updateRule(currentRow.value.id, payload);
      ElMessage.success("更新成功");
    } else {
      await churnApi.createRule(payload);
      ElMessage.success("创建成功");
    }
    dialogVisible.value = false;
    fetchList();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(row: ChurnRule) {
  try {
    await ElMessageBox.confirm(`确定删除规则"${row.name}"吗？`, "确认删除", { type: "warning" });
    await churnApi.deleteRule(row.id);
    ElMessage.success("删除成功");
    fetchList();
  } catch {
    // cancelled or error
  }
}

onMounted(fetchList);
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.error-bar { margin-bottom: 12px; }
.total-hint { margin-top: 12px; font-size: 13px; color: var(--color-text-secondary, #909399); text-align: right; }
.config-hint { font-size: 12px; color: var(--color-text-secondary, #909399); margin-top: 4px; line-height: 1.5; }
</style>
