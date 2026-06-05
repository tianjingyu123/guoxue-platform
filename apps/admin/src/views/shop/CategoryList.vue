<template>
  <div class="page">
    <div class="toolbar">
      <h3>商品分类管理</h3>
      <el-button
        type="primary"
        @click="openCreate()"
      >
        添加分类
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="treeData"
      row-key="id"
      default-expand-all
      stripe
    >
      <el-table-column
        prop="name"
        label="分类名称"
        min-width="160"
      />
      <el-table-column
        prop="level"
        label="层级"
        width="60"
      />
      <el-table-column
        prop="sortOrder"
        label="排序"
        width="70"
      />
      <el-table-column
        prop="status"
        label="状态"
        width="80"
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
        label="操作"
        width="180"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            v-if="row.level < 2"
            size="small"
            @click="openCreate(row)"
          >
            加子类
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

    <!-- 弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑分类' : '新增分类'"
      width="480px"
    >
      <el-form
        :model="form"
        label-width="80px"
      >
        <el-form-item label="分类名称">
          <el-input
            v-model="form.name"
            placeholder="请输入分类名称"
          />
        </el-form-item>
        <el-form-item
          v-if="!isEdit && form.parentId"
          label="上级分类"
        >
          <el-input
            :value="parentName"
            disabled
          />
        </el-form-item>
        <el-form-item label="图标">
          <el-input
            v-model="form.icon"
            placeholder="emoji或图标URL"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="form.sortOrder"
            :min="0"
            :max="999"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option
              label="启用"
              value="ACTIVE"
            />
            <el-option
              label="停用"
              value="INACTIVE"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="handleSave"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";

const loading = ref(false);
const categories = ref<any[]>([]);
const dialogVisible = ref(false);
const isEdit = ref(false);
const parentName = ref("");
const form = ref({
  id: "", name: "", parentId: "", icon: "", sortOrder: 0, status: "ACTIVE",
});

const treeData = computed(() => buildTree(categories.value));

function buildTree(list: any[]): any[] {
  const roots = list.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  return roots.map((root) => ({
    ...root,
    children: list
      .filter((c) => c.parentId === root.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ ...c, children: [] })),
  }));
}

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await api.get("/shop/categories/tree");
    // 展平树
    const flat: any[] = [];
    // eslint-disable-next-line no-inner-declarations
    function walk(items: any[], level = 1) {
      for (const item of items) {
        flat.push({ ...item, level });
        if (item.children?.length) walk(item.children, level + 1);
      }
    }
    walk(data || []);
    categories.value = flat;
  } finally {
    loading.value = false;
  }
}

function openCreate(parent?: any) {
  isEdit.value = false;
  form.value = {
    id: "", name: "", parentId: parent?.id || "",
    icon: "", sortOrder: 0, status: "ACTIVE",
  };
  parentName.value = parent?.name || "";
  dialogVisible.value = true;
}

function openEdit(row: any) {
  isEdit.value = true;
  form.value = { ...row };
  dialogVisible.value = true;
}

async function handleSave() {
  if (!form.value.name.trim()) {
    ElMessage.warning("请输入分类名称");
    return;
  }
  try {
    if (isEdit.value) {
      await api.put(`/shop/categories/${form.value.id}`, {
        name: form.value.name, sortOrder: form.value.sortOrder,
        icon: form.value.icon, status: form.value.status,
      });
      ElMessage.success("更新成功");
    } else {
      await api.post("/shop/categories", {
        name: form.value.name, parentId: form.value.parentId || undefined,
        level: form.value.parentId ? 2 : 1,
        sortOrder: form.value.sortOrder, icon: form.value.icon,
      });
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
    await ElMessageBox.confirm(`确定删除分类「${row.name}」吗？`, "删除确认", { type: "warning" });
    await api.delete(`/shop/categories/${row.id}`);
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
