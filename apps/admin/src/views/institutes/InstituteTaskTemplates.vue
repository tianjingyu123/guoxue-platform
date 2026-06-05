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

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <el-table-column
        label="任务名称"
        min-width="180"
        prop="name"
      />
      <el-table-column
        label="类型"
        width="120"
      >
        <template #default="{ row }">
          <el-tag size="small">
            {{ row.taskType || '-' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="分值"
        width="80"
        align="center"
        prop="score"
      />
      <el-table-column
        label="截止天数"
        width="100"
        align="center"
      >
        <template #default="{ row }">
          {{ row.deadlineDays || '-' }}天
        </template>
      </el-table-column>
      <el-table-column
        label="保证金门槛"
        width="120"
        align="right"
      >
        <template #default="{ row }">
          ¥{{ row.depositThreshold || 0 }}
        </template>
      </el-table-column>
      <el-table-column
        label="描述"
        min-width="200"
        prop="description"
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
            type="danger"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
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
          label="任务名称"
          required
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="类型">
          <el-input
            v-model="form.taskType"
            placeholder="如 CONTENT/COURSE/INVITE"
          />
        </el-form-item>
        <el-form-item label="分值">
          <el-input-number
            v-model="form.score"
            :min="0"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="截止天数">
          <el-input-number
            v-model="form.deadlineDays"
            :min="1"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="保证金门槛">
          <el-input-number
            v-model="form.depositThreshold"
            :min="0"
            :precision="2"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="描述">
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

const list = ref<any[]>([]);
const loading = ref(false);

const dialogVisible = ref(false);
const saving = ref(false);
const isEdit = ref(false);
const editId = ref("");
const form = reactive({ name: "", taskType: "", score: 0, deadlineDays: 30, depositThreshold: 0, description: "" });

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await instituteApi.listTaskTemplates();
    list.value = data || [];
  } finally { loading.value = false; }
}

function resetForm() {
  Object.assign(form, { name: "", taskType: "", score: 0, deadlineDays: 30, depositThreshold: 0, description: "" });
}

function openCreate() { resetForm(); isEdit.value = false; dialogVisible.value = true; }
function openEdit(row: any) {
  isEdit.value = true; editId.value = row.id;
  Object.assign(form, {
    name: row.name, taskType: row.taskType || "", score: row.score || 0,
    deadlineDays: row.deadlineDays || 30, depositThreshold: row.depositThreshold || 0,
    description: row.description || "",
  });
  dialogVisible.value = true;
}

async function save() {
  saving.value = true;
  try {
    if (isEdit.value) {
      await instituteApi.updateTaskTemplate(editId.value, { ...form });
    } else {
      await instituteApi.createTaskTemplate({ ...form });
    }
    ElMessage.success(isEdit.value ? "已更新" : "已创建");
    dialogVisible.value = false;
    fetchList();
  } finally { saving.value = false; }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确定删除模板「${row.name}」？`, "提示", { type: "warning" });
  await instituteApi.deleteTaskTemplate(row.id);
  ElMessage.success("已删除");
  fetchList();
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
.header h2 { margin: 0; font-size: 18px; color: #8b4513; }
</style>
