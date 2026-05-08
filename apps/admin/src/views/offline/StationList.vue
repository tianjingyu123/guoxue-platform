<template>
  <div class="page">
    <div class="header">
      <h2>分站管理</h2>
      <div class="header-actions">
        <el-button @click="exportData">导出CSV</el-button>
        <el-button type="primary" @click="openCreate">新建分站</el-button>
      </div>
    </div>

    <el-table :data="stations" border stripe v-loading="loading">
      <el-table-column prop="name" label="名称" width="150" />
      <el-table-column prop="code" label="推广码" width="120" />
      <el-table-column prop="intro" label="简介" min-width="180" show-overflow-tooltip />
      <el-table-column label="负责人" width="120">
        <template #default="{ row }">{{ row.user?.nickname || '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'danger'" size="small">
            {{ row.status === 'ACTIVE' ? '正常' : '已禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="totalEarning" label="累计收益" width="120" />
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
      </el-table-column>
      <el-table-column label="操作" width="330" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" @click="openBrandEdit(row)">编辑品牌</el-button>
          <el-button size="small" @click="toggleOperators(row)">运营商</el-button>
          <el-button
            v-if="row.status === 'ACTIVE'"
            size="small" type="danger"
            @click="toggleStatus(row, 'DISABLED')"
          >禁用</el-button>
          <el-button v-else size="small" type="success" @click="toggleStatus(row, 'ACTIVE')">启用</el-button>
          <el-button size="small" type="danger" @click="delStation(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrap" v-if="total > pageSize">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="fetchList"
      />
    </div>

    <!-- 新建/编辑分站对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEditing ? '编辑分站' : '新建分站'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="推广码" required>
          <el-input v-model="form.code" :disabled="isEditing" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.intro" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="状态" v-if="isEditing">
          <el-select v-model="form.status">
            <el-option label="正常" value="ACTIVE" />
            <el-option label="禁用" value="DISABLED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 运营商管理对话框 -->
    <el-dialog v-model="operatorDialogVisible" title="运营商管理" width="700px">
      <div class="operator-header">
        <span v-if="currentStation">分站：{{ currentStation.name }}</span>
        <el-button type="primary" size="small" @click="openCreateOperator">新建运营商</el-button>
      </div>
      <el-table :data="operators" border stripe v-loading="operatorsLoading" size="small">
        <el-table-column label="用户" width="120">
          <template #default="{ row }">{{ row.user?.nickname || '-' }}</template>
        </el-table-column>
        <el-table-column prop="level" label="等级" width="100" />
        <el-table-column prop="containQuota" label="站长名额" width="100" />
        <el-table-column prop="usedQuota" label="已使用" width="80" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'danger'" size="small">
              {{ row.status === 'ACTIVE' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="到期时间" width="120">
          <template #default="{ row }">{{ row.expireAt ? new Date(row.expireAt).toLocaleDateString() : '永久' }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="140">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap" v-if="operatorTotal > operatorPageSize">
        <el-pagination
          v-model:current-page="operatorPage"
          :page-size="operatorPageSize"
          :total="operatorTotal"
          layout="prev, pager, next"
          small
          @current-change="fetchOperators"
        />
      </div>
    </el-dialog>

    <!-- 新建运营商对话框 -->
    <el-dialog v-model="operatorCreateVisible" title="新建运营商" width="500px">
      <el-form :model="operatorForm" label-width="110px">
        <el-form-item label="用户ID" required>
          <el-input v-model="operatorForm.userId" placeholder="输入用户ID" />
        </el-form-item>
        <el-form-item label="等级" required>
          <el-select v-model="operatorForm.level">
            <el-option label="一级运营商" value="LEVEL_1" />
            <el-option label="二级运营商" value="LEVEL_2" />
            <el-option label="三级运营商" value="LEVEL_3" />
          </el-select>
        </el-form-item>
        <el-form-item label="包含站长名额">
          <el-input-number v-model="operatorForm.containQuota" :min="0" />
        </el-form-item>
        <el-form-item label="上级运营商ID">
          <el-input v-model="operatorForm.parentOperatorId" placeholder="留空则为顶级" />
        </el-form-item>
        <el-form-item label="到期时间">
          <el-date-picker v-model="operatorForm.expireAt" type="date" placeholder="留空为永久" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="operatorCreateVisible = false">取消</el-button>
        <el-button type="primary" @click="saveOperator" :loading="operatorSaving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 品牌编辑对话框 -->
    <el-dialog v-model="brandDialogVisible" title="编辑品牌" width="500px">
      <el-form :model="brandForm" label-width="100px">
        <el-form-item label="分站名称">
          <el-input v-model="brandForm.name" placeholder="输入分站名称" />
        </el-form-item>
        <el-form-item label="Logo">
          <ImageUpload v-model="brandForm.logo" />
        </el-form-item>
        <el-form-item label="主题色">
          <el-color-picker v-model="brandForm.themeColor" show-alpha />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="brandDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveBrand" :loading="brandSaving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { stationApi } from "@/api";
import ImageUpload from "@/components/ImageUpload.vue";
import { exportCSV } from "@/utils/export";

const stations = ref<any[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = 20;
const total = ref(0);

// 分站表单
const dialogVisible = ref(false);
const saving = ref(false);
const isEditing = ref(false);
const editingId = ref("");
const form = reactive({ name: "", code: "", intro: "", status: "ACTIVE" });

// 运营商
const operatorDialogVisible = ref(false);
const operatorsLoading = ref(false);
const currentStation = ref<any>(null);
const operators = ref<any[]>([]);
const operatorPage = ref(1);
const operatorPageSize = 20;
const operatorTotal = ref(0);

// 新建运营商
const operatorCreateVisible = ref(false);
const operatorSaving = ref(false);
const operatorForm = reactive({
  userId: "",
  level: "LEVEL_1",
  containQuota: 0,
  parentOperatorId: "",
  expireAt: null as string | null,
});

// 品牌编辑
const brandDialogVisible = ref(false);
const brandSaving = ref(false);
const brandEditingId = ref("");
const brandForm = reactive({ name: "", logo: "", themeColor: "" });

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await stationApi.list({ page: page.value, pageSize });
    stations.value = data.stations || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  isEditing.value = false;
  editingId.value = "";
  form.name = "";
  form.code = "";
  form.intro = "";
  form.status = "ACTIVE";
  dialogVisible.value = true;
}

function openEdit(row: any) {
  isEditing.value = true;
  editingId.value = row.id;
  form.name = row.name;
  form.code = row.code;
  form.intro = row.intro || "";
  form.status = row.status;
  dialogVisible.value = true;
}

async function save() {
  saving.value = true;
  try {
    if (isEditing.value) {
      await stationApi.update(editingId.value, { name: form.name, intro: form.intro, status: form.status });
      ElMessage.success("已更新");
    } else {
      await stationApi.create({ name: form.name, code: form.code, intro: form.intro });
      ElMessage.success("已创建");
    }
    dialogVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row: any, status: string) {
  await stationApi.update(row.id, { status });
  ElMessage.success(status === "DISABLED" ? "已禁用" : "已启用");
  fetchList();
}

function delStation(id: string) {
  ElMessageBox.confirm("确定删除该分站？", "警告", { type: "warning" }).then(async () => {
    await stationApi.remove(id);
    ElMessage.success("已删除");
    fetchList();
  }).catch(() => {});
}

function exportData() {
  exportCSV(
    "分站列表",
    [
      { label: "名称", key: "name" },
      { label: "推广码", key: "code" },
      { label: "简介", key: "intro" },
      { label: "负责人", key: "ownerName" },
      { label: "状态", key: "statusLabel" },
      { label: "累计收益", key: "totalEarning" },
      { label: "创建时间", key: "createdAt" },
    ],
    stations.value.map((s) => ({
      ...s,
      ownerName: s.user?.nickname || "-",
      statusLabel: s.status === "ACTIVE" ? "正常" : "已禁用",
      createdAt: new Date(s.createdAt).toLocaleString(),
    })),
  );
}

// ── 品牌编辑 ──

function openBrandEdit(row: any) {
  brandEditingId.value = row.id;
  brandForm.name = row.name || "";
  brandForm.logo = row.logo || "";
  brandForm.themeColor = row.themeColor || "#409eff";
  brandDialogVisible.value = true;
}

async function saveBrand() {
  brandSaving.value = true;
  try {
    const payload: Record<string, any> = {};
    if (brandForm.name) payload.name = brandForm.name;
    if (brandForm.logo) payload.logo = brandForm.logo;
    if (brandForm.themeColor) payload.themeColor = brandForm.themeColor;
    await stationApi.update(brandEditingId.value, payload);
    ElMessage.success("品牌已更新");
    brandDialogVisible.value = false;
    fetchList();
  } finally {
    brandSaving.value = false;
  }
}

// ── 运营商管理 ──

async function toggleOperators(row: any) {
  currentStation.value = row;
  operatorPage.value = 1;
  operatorDialogVisible.value = true;
  await fetchOperators();
}

async function fetchOperators() {
  operatorsLoading.value = true;
  try {
    const { data } = await stationApi.operatorList({ page: operatorPage.value, pageSize: operatorPageSize });
    operators.value = data.operators || [];
    operatorTotal.value = data.total || 0;
  } finally {
    operatorsLoading.value = false;
  }
}

function openCreateOperator() {
  operatorForm.userId = "";
  operatorForm.level = "LEVEL_1";
  operatorForm.containQuota = 0;
  operatorForm.parentOperatorId = "";
  operatorForm.expireAt = null;
  operatorCreateVisible.value = true;
}

async function saveOperator() {
  if (!operatorForm.userId) {
    ElMessage.warning("请输入用户ID");
    return;
  }
  operatorSaving.value = true;
  try {
    await stationApi.createOperator({
      userId: operatorForm.userId,
      level: operatorForm.level,
      containQuota: operatorForm.containQuota,
      parentOperatorId: operatorForm.parentOperatorId || undefined,
      expireAt: operatorForm.expireAt || undefined,
    });
    ElMessage.success("运营商已创建");
    operatorCreateVisible.value = false;
    fetchOperators();
  } finally {
    operatorSaving.value = false;
  }
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
.header h2 { margin: 0; font-size: 18px; color: #8b4513; }
.pagination-wrap { margin-top: 16px; display: flex; justify-content: center; }
.operator-header { margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
</style>
