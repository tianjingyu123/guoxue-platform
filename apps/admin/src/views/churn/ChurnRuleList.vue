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
        label="评分阈值"
        width="110"
        sortable
      />
      <el-table-column
        prop="daysThreshold"
        label="天数阈值"
        width="110"
      />
      <el-table-column
        prop="actionType"
        label="动作类型"
        width="120"
      >
        <template #default="{ row }">
          <el-tag>{{ row.actionType }}</el-tag>
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

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, sizes, prev, pager, next"
      @current-change="fetchList"
      @size-change="fetchList"
    />

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
          label="评分阈值"
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
          label="天数阈值"
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
          <el-select
            v-model="form.actionType"
            style="width:100%"
          >
            <el-option
              label="发送通知"
              value="NOTIFY"
            />
            <el-option
              label="发送优惠券"
              value="COUPON"
            />
            <el-option
              label="标记关注"
              value="FLAG"
            />
            <el-option
              label="客服介入"
              value="SERVICE"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="动作配置"
          prop="actionConfig"
        >
          <el-input
            v-model="form.actionConfig"
            type="textarea"
            :rows="3"
            placeholder="JSON格式配置"
          />
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
import { ref, onMounted, reactive } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import axios from "axios";

interface ChurnRule {
  id: string;
  name: string;
  riskLevel: string;
  scoreThreshold: number;
  daysThreshold: number;
  actionType: string;
  actionConfig: string;
  isActive: boolean;
}

const loading = ref(false);
const list = ref<ChurnRule[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const currentRow = ref<ChurnRule | null>(null);

const form = reactive({
  name: "",
  riskLevel: "LOW",
  scoreThreshold: 50,
  daysThreshold: 30,
  actionType: "NOTIFY",
  actionConfig: "",
});

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
  try {
    const res = await axios.get("/admin/churn/rules", {
      params: { page: page.value, pageSize: pageSize.value },
    });
    list.value = res.data.list || res.data.rows || [];
    total.value = res.data.total || 0;
  } catch {
    ElMessage.error("获取规则列表失败");
  } finally {
    loading.value = false;
  }
}

function openAddDialog() {
  isEdit.value = false;
  form.name = "";
  form.riskLevel = "LOW";
  form.scoreThreshold = 50;
  form.daysThreshold = 30;
  form.actionType = "NOTIFY";
  form.actionConfig = "";
  dialogVisible.value = true;
}

function openEditDialog(row: ChurnRule) {
  isEdit.value = true;
  currentRow.value = row;
  form.name = row.name;
  form.riskLevel = row.riskLevel;
  form.scoreThreshold = row.scoreThreshold;
  form.daysThreshold = row.daysThreshold;
  form.actionType = row.actionType;
  form.actionConfig = row.actionConfig;
  dialogVisible.value = true;
}

async function handleSubmit() {
  submitting.value = true;
  try {
    if (isEdit.value && currentRow.value) {
      await axios.put(`/admin/churn/rules/${currentRow.value.id}`, form);
      ElMessage.success("更新成功");
    } else {
      await axios.post("/admin/churn/rules", form);
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
    await axios.delete(`/admin/churn/rules/${row.id}`);
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
</style>
