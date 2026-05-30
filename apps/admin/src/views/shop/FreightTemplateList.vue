<template>
  <div class="page">
    <div class="toolbar">
      <h3>运费模板管理</h3>
      <el-button type="primary" @click="openCreate()">添加模板</el-button>
    </div>

    <el-table v-loading="loading" :data="templates" stripe>
      <el-table-column prop="name" label="模板名称" min-width="150" />
      <el-table-column label="计费方式" width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ typeLabel(row.type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="默认运费" width="100">
        <template #default="{ row }">¥{{ Number(row.defaultFee).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="包邮条件" width="120">
        <template #default="{ row }">
          <span v-if="row.conditionFree && row.conditionFree.length">
            {{ row.conditionFree.map((c: any) => `满${c.threshold}`).join('、') }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
            {{ row.isActive ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑运费模板' : '新增运费模板'" width="520px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="模板名称">
          <el-input v-model="form.name" placeholder="如：全国包邮" />
        </el-form-item>
        <el-form-item label="计费方式">
          <el-select v-model="form.type">
            <el-option label="包邮" value="FREE" />
            <el-option label="固定运费" value="FIXED" />
            <el-option label="条件包邮" value="CONDITIONAL" />
          </el-select>
        </el-form-item>
        <el-form-item label="默认运费(元)" v-if="form.type !== 'FREE'">
          <el-input-number v-model="form.defaultFee" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="form.isActive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 分页 -->
    <el-pagination
      v-if="total > 0"
      layout="total, prev, pager, next"
      :total="total"
      :page-size="pageSize"
      v-model:current-page="page"
      @current-change="fetchList"
      style="margin-top:16px;justify-content:flex-end"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";

const loading = ref(false);
const templates = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const dialogVisible = ref(false);
const isEdit = ref(false);
const form = ref({
  id: "", name: "", type: "FIXED", defaultFee: 0, isActive: true,
});

function typeLabel(t: string) {
  const map: Record<string, string> = { FREE: "包邮", FIXED: "固定运费", CONDITIONAL: "条件包邮" };
  return map[t] || t;
}

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await api.get("/shop/freight-templates", { params: { page: page.value, pageSize: pageSize.value } });
    templates.value = data?.items || data?.data || [];
    total.value = data?.total || 0;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  isEdit.value = false;
  form.value = { id: "", name: "", type: "FIXED", defaultFee: 0, isActive: true };
  dialogVisible.value = true;
}

function openEdit(row: any) {
  isEdit.value = true;
  form.value = { ...row, defaultFee: Number(row.defaultFee) };
  dialogVisible.value = true;
}

async function handleSave() {
  if (!form.value.name.trim()) {
    ElMessage.warning("请输入模板名称");
    return;
  }
  try {
    const payload = {
      name: form.value.name, type: form.value.type,
      defaultFee: form.value.defaultFee, isActive: form.value.isActive,
    };
    if (isEdit.value) {
      await api.put(`/shop/freight-templates/${form.value.id}`, payload);
      ElMessage.success("更新成功");
    } else {
      await api.post("/shop/freight-templates", payload);
      ElMessage.success("添加成功");
    }
    dialogVisible.value = false;
    fetchList();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || "操作失败");
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除模板「${row.name}」吗？`, "删除确认", { type: "warning" });
    await api.delete(`/shop/freight-templates/${row.id}`);
    ElMessage.success("已删除");
    fetchList();
  } catch { /* 取消 */ }
}
</script>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 16px; }
</style>
