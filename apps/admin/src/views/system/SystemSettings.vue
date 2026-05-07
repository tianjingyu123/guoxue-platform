<template>
  <div class="page">
    <div class="header">
      <h2>系统配置</h2>
      <el-button type="primary" @click="openAdd">添加配置</el-button>
    </div>

    <el-table :data="configs" border stripe v-loading="loading">
      <el-table-column prop="configKey" label="配置键" width="200" />
      <el-table-column prop="configValue" label="值" min-width="300">
        <template #default="{ row }">
          <template v-if="row.configKey === 'search_hot_words'">
            <el-tag v-for="(w, i) in tryParseJson(row.configValue)" :key="i" size="small" style="margin:2px">{{ w }}</el-tag>
          </template>
          <span v-else>{{ row.configValue }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="说明" width="200" show-overflow-tooltip />
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ row.updatedAt?.slice(0, 16).replace("T", " ") }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button type="danger" size="small" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑配置' : '添加配置'" width="500px" :close-on-click-modal="false">
      <el-form :model="form" label-width="100px">
        <el-form-item label="配置键" required>
          <el-input v-model="form.configKey" :disabled="isEdit" placeholder="如 search_hot_words" />
        </el-form-item>
        <el-form-item label="配置值" required>
          <el-input v-model="form.configValue" type="textarea" :rows="4" placeholder="配置值" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" placeholder="配置说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { systemApi } from "@/api";
import { ElMessage, ElMessageBox } from "element-plus";

const configs = ref<any[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const form = ref({ configKey: "", configValue: "", description: "" });

onMounted(() => fetchConfigs());

async function fetchConfigs() {
  loading.value = true;
  try {
    const { data } = await systemApi.listConfigs();
    configs.value = data.configs || [];
  } finally {
    loading.value = false;
  }
}

function tryParseJson(v: string): string[] {
  try {
    const arr = JSON.parse(v);
    return Array.isArray(arr) ? arr : [v];
  } catch {
    return v ? v.split(",") : [];
  }
}

function openAdd() {
  isEdit.value = false;
  form.value = { configKey: "", configValue: "", description: "" };
  dialogVisible.value = true;
}

function openEdit(row: any) {
  isEdit.value = true;
  form.value = {
    configKey: row.configKey,
    configValue: row.configValue,
    description: row.description || "",
  };
  dialogVisible.value = true;
}

async function save() {
  if (!form.value.configKey || form.value.configValue === "") return;
  saving.value = true;
  try {
    await systemApi.setConfig(form.value.configKey, {
      value: form.value.configValue,
      description: form.value.description,
    });
    ElMessage.success(isEdit.value ? "已更新" : "已添加");
    dialogVisible.value = false;
    fetchConfigs();
  } finally {
    saving.value = false;
  }
}

async function remove(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除配置 "${row.configKey}"？`, "确认删除", {
      type: "warning",
    });
    await systemApi.deleteConfig(row.configKey);
    ElMessage.success("已删除");
    fetchConfigs();
  } catch {
    // cancel
  }
}
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; color: #8b4513; }
</style>
