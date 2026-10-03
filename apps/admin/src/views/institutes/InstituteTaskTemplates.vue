<template>
  <div class="page">
    <div class="header">
      <h2>研究院任务模板管理</h2>
      <el-button
        type="primary"
        @click="openCreate"
      >
        新增模板
      </el-button>
    </div>

    <el-result
      v-if="loadError && !loading"
      icon="error"
      title="加载失败"
      sub-title="请检查网络后重试"
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

    <!-- 字段对齐后端 InstituteTaskTemplate：title/taskType/requiredCount/periodUnit/sortOrder/status
         （原先用 name/score/deadlineDays/depositThreshold 假字段：列表恒空列、创建必 400） -->
    <el-table
      v-show="!loadError"
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <el-table-column
        label="任务标题"
        min-width="180"
        prop="title"
      />
      <el-table-column
        label="类型"
        width="130"
      >
        <template #default="{ row }">
          <el-tag size="small">
            {{ TASK_TYPES[row.taskType] || row.taskType || '—' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="要求次数"
        width="120"
        align="center"
      >
        <template #default="{ row }">
          {{ row.requiredCount ?? 1 }} 次 / {{ PERIOD_UNITS[row.periodUnit] || row.periodUnit || '年' }}
        </template>
      </el-table-column>
      <el-table-column
        label="排序"
        width="80"
        align="center"
        prop="sortOrder"
      />
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'ACTIVE' ? 'success' : 'info'"
            size="small"
          >
            {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="说明"
        min-width="200"
        prop="description"
        show-overflow-tooltip
      />
      <el-table-column
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
            size="small"
            :type="row.status === 'ACTIVE' ? 'warning' : 'success'"
            @click="toggleStatus(row)"
          >
            {{ row.status === 'ACTIVE' ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty
          description="暂无任务模板，点击右上角「新增模板」创建"
          :image-size="80"
        />
      </template>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑模板' : '新增模板'"
      width="500px"
    >
      <el-form
        :model="form"
        label-width="100px"
      >
        <el-form-item
          label="任务标题"
          required
        >
          <el-input
            v-model="form.title"
            placeholder="如：每季度开展一场线下沙龙"
          />
        </el-form-item>
        <el-form-item
          label="类型"
          required
        >
          <el-select
            v-model="form.taskType"
            style="width:100%"
          >
            <el-option
              v-for="(label, value) in TASK_TYPES"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="要求次数">
          <el-input-number
            v-model="form.requiredCount"
            :min="1"
            style="width:60%"
          />
          <div class="field-hint">
            每个周期内需完成的次数
          </div>
        </el-form-item>
        <el-form-item label="周期单位">
          <el-select
            v-model="form.periodUnit"
            style="width:100%"
          >
            <el-option
              v-for="(label, value) in PERIOD_UNITS"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="form.sortOrder"
            :min="0"
            style="width:60%"
          />
          <div class="field-hint">
            数字越小越靠前
          </div>
        </el-form-item>
        <el-form-item label="说明">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
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
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { instituteApi } from "@/api";

/** 任务类型翻译（对齐后端 CreateTaskTemplateDto 枚举） */
const TASK_TYPES: Record<string, string> = {
  SALON: "线下沙龙",
  LIVE: "直播分享",
  ARTICLE: "文章创作",
  OFFLINE_EVENT: "线下活动",
  CIRCLE_MEMBER_COUNT: "圈子人数达标",
  CIRCLE_DAYS: "圈子运营天数",
};

/** 周期单位翻译（MONTH/QUARTER/YEAR） */
const PERIOD_UNITS: Record<string, string> = {
  MONTH: "月",
  QUARTER: "季度",
  YEAR: "年",
};

/** 任务模板行（对齐后端 InstituteTaskTemplate 真实字段） */
interface TemplateRow {
  id: string;
  title?: string;
  taskType?: string;
  requiredCount?: number;
  periodUnit?: string;
  sortOrder?: number;
  status?: string;
  description?: string;
}
const list = ref<TemplateRow[]>([]);
const loading = ref(false);
const loadError = ref(false);

const dialogVisible = ref(false);
const saving = ref(false);
const isEdit = ref(false);
const editId = ref("");
const form = reactive({ title: "", taskType: "SALON", requiredCount: 1, periodUnit: "YEAR", sortOrder: 0, description: "" });

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    const { data } = await instituteApi.listTaskTemplates();
    list.value = Array.isArray(data) ? data : [];
  } catch { loadError.value = true; } finally { loading.value = false; }
}

function resetForm() {
  Object.assign(form, { title: "", taskType: "SALON", requiredCount: 1, periodUnit: "YEAR", sortOrder: 0, description: "" });
}

function openCreate() { resetForm(); isEdit.value = false; dialogVisible.value = true; }
function openEdit(row: TemplateRow) {
  isEdit.value = true; editId.value = row.id;
  Object.assign(form, {
    title: row.title || "", taskType: row.taskType || "SALON",
    requiredCount: row.requiredCount ?? 1, periodUnit: row.periodUnit || "YEAR",
    sortOrder: row.sortOrder ?? 0, description: row.description || "",
  });
  dialogVisible.value = true;
}

async function save() {
  if (saving.value) return;
  if (!form.title.trim()) { ElMessage.warning("请填写任务标题"); return; }
  if (!form.taskType) { ElMessage.warning("请选择任务类型"); return; }
  saving.value = true;
  try {
    const payload = {
      title: form.title.trim(),
      taskType: form.taskType,
      requiredCount: form.requiredCount,
      periodUnit: form.periodUnit,
      sortOrder: form.sortOrder,
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
    };
    if (isEdit.value) {
      await instituteApi.updateTaskTemplate(editId.value, payload);
    } else {
      await instituteApi.createTaskTemplate(payload);
    }
    ElMessage.success(isEdit.value ? "已更新" : "已创建");
    dialogVisible.value = false;
    fetchList();
  } catch {
    ElMessage.error("保存失败，请检查填写内容后重试");
  } finally { saving.value = false; }
}

/** 启用/停用（L3：停用会影响成员任务清单展示，确认后执行） */
async function toggleStatus(row: TemplateRow) {
  const next = row.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
  const label = next === "DISABLED" ? "停用" : "启用";
  try {
    await ElMessageBox.confirm(
      next === "DISABLED"
        ? `确定停用模板「${row.title}」？停用后成员任务清单中将不再显示该任务。`
        : `确定启用模板「${row.title}」？`,
      `${label}模板`,
      { type: "warning" },
    );
  } catch {
    return; // 用户取消
  }
  try {
    await instituteApi.updateTaskTemplate(row.id, { status: next });
    ElMessage.success(`已${label}`);
    fetchList();
  } catch {
    ElMessage.error("操作失败，请重试");
  }
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
.header h2 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.field-hint { font-size: 12px; color: var(--color-text-secondary); line-height: 1.5; margin-top: 2px; }
</style>
