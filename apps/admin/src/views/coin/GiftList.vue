<template>
  <div class="page">
    <div class="header">
      <h2>礼物管理</h2>
      <div class="filter-row">
        <el-button type="primary" @click="openCreate">新增礼物</el-button>
        <el-button @click="exportData">导出CSV</el-button>
      </div>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="name" label="名称" min-width="140" />
      <el-table-column label="图标" width="80">
        <template #default="{ row }">
          <el-image
            v-if="row.icon"
            :src="row.icon"
            style="width: 36px; height: 36px; border-radius: 4px"
            fit="cover"
          />
          <span v-else style="color: #999">无</span>
        </template>
      </el-table-column>
      <el-table-column label="价格（币）" width="110">
        <template #default="{ row }">{{ row.price }} 币</template>
      </el-table-column>
      <el-table-column label="等级" width="100">
        <template #default="{ row }">
          <el-tag :type="levelType(row.level)" size="small">{{ levelLabel(row.level) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="70" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">
            {{ row.status === 'ACTIVE' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button
            size="small"
            :type="row.status === 'ACTIVE' ? 'warning' : 'success'"
            @click="toggleStatus(row)"
          >
            {{ row.status === 'ACTIVE' ? '禁用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > pageSize"
      v-model:current-page="page"
      :page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      @current-change="fetchList"
      style="margin-top: 16px; justify-content: flex-end"
    />

    <!-- 新增/编辑礼物弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑礼物' : '新增礼物'" width="550px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="礼物名称" />
        </el-form-item>
        <el-form-item label="图标URL" required>
          <el-input v-model="form.icon" placeholder="https://..." />
          <div v-if="form.icon" style="margin-top: 8px">
            <el-image :src="form.icon" style="width: 48px; height: 48px; border-radius: 4px" fit="cover" />
          </div>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="价格（币）" required>
              <el-input-number v-model="form.price" :min="1" :step="10" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="等级" required>
              <el-select v-model="form.level" style="width: 100%">
                <el-option label="基础" value="BASIC" />
                <el-option label="中级" value="MID" />
                <el-option label="高级" value="HIGH" />
                <el-option label="顶级" value="TOP" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="排序" required>
          <el-input-number v-model="form.sort" :min="0" :step="1" style="width: 100%" />
          <span style="color: #999; font-size: 12px; margin-left: 8px">数字越小越靠前</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveGift" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { coinApi } from "@/api";
import { ElMessage } from "element-plus";
import { exportCSV } from "@/utils/export";

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const saving = ref(false);

const dialogVisible = ref(false);
const editingId = ref("");

const form = reactive({
  name: "",
  icon: "",
  price: 10,
  level: "BASIC",
  sort: 0,
});

onMounted(() => fetchList());

function levelType(level: string) {
  const map: Record<string, string> = {
    BASIC: "info",
    MID: "primary",
    HIGH: "warning",
    TOP: "danger",
  };
  return map[level] || "info";
}

function levelLabel(level: string) {
  const map: Record<string, string> = {
    BASIC: "基础",
    MID: "中级",
    HIGH: "高级",
    TOP: "顶级",
  };
  return map[level] || level;
}

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await coinApi.getGifts();
    const items = data.gifts || data.list || data || [];
    list.value = Array.isArray(items) ? items : [];
    total.value = list.value.length;
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(form, { name: "", icon: "", price: 10, level: "BASIC", sort: 0 });
  editingId.value = "";
}

function openCreate() {
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: any) {
  resetForm();
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name || "",
    icon: row.icon || "",
    price: Number(row.price) || 10,
    level: row.level || "BASIC",
    sort: row.sort ?? 0,
  });
  dialogVisible.value = true;
}

async function saveGift() {
  if (!form.name) {
    ElMessage.warning("请输入礼物名称");
    return;
  }
  if (!form.icon) {
    ElMessage.warning("请输入图标URL");
    return;
  }
  saving.value = true;
  try {
    const payload = { ...form };
    if (editingId.value) {
      payload.id = editingId.value;
    }
    await coinApi.createGift(payload);
    ElMessage.success(editingId.value ? "已更新" : "已创建");
    dialogVisible.value = false;
    fetchList();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "保存失败");
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row: any) {
  const newStatus = row.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
  try {
    await coinApi.createGift({ ...row, status: newStatus, id: row.id });
    ElMessage.success(newStatus === "ACTIVE" ? "已启用" : "已禁用");
    fetchList();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || "操作失败");
  }
}

function exportData() {
  exportCSV(
    "礼物列表",
    [
      { label: "名称", key: "name" },
      { label: "图标", key: "icon" },
      { label: "价格(币)", key: "price" },
      { label: "等级", key: "level" },
      { label: "排序", key: "sort" },
      { label: "状态", key: "status" },
    ],
    list.value.map((g) => ({
      name: g.name,
      icon: g.icon || "--",
      price: g.price,
      level: levelLabel(g.level),
      sort: g.sort,
      status: g.status === "ACTIVE" ? "启用" : "禁用",
    })),
  );
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0 0 8px; font-size: 18px; color: #8b4513; }
.filter-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
</style>
