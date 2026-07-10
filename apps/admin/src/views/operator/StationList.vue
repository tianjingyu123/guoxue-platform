<template>
  <div class="page">
    <div class="header">
      <h2>运营商管理</h2>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <el-table-column
        prop="brandName"
        label="品牌名称"
        min-width="160"
      />
      <el-table-column
        prop="level"
        label="运营商等级"
        width="120"
      >
        <template #default="{ row }">
          <el-tag>{{ row.level }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="containQuota"
        label="总配额"
        width="100"
      />
      <el-table-column
        prop="usedQuota"
        label="已使用"
        width="100"
      />
      <el-table-column
        label="配额占比"
        width="120"
      >
        <template #default="{ row }">
          <el-progress
            :percentage="row.containQuota ? Math.round((row.usedQuota / row.containQuota) * 100) : 0"
            :status="row.containQuota && row.usedQuota / row.containQuota > 0.8 ? 'exception' : 'success'"
          />
        </template>
      </el-table-column>
      <el-table-column
        prop="status"
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'">
            {{ row.status === 'ACTIVE' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="120"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="openEditDialog(row)"
          >
            编辑品牌
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="loadError ? '加载失败' : '暂无运营商数据'">
          <el-button
            v-if="loadError"
            type="primary"
            @click="fetchList"
          >
            重试
          </el-button>
        </el-empty>
      </template>
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
      title="编辑品牌信息"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        label-width="110px"
      >
        <el-form-item label="品牌名称">
          <el-input v-model="form.brandName" />
        </el-form-item>
        <!-- 后端品牌端点（PUT /station/operator/:id/brand）仅支持品牌类字段；等级/配额/状态无对应更新端点 -->
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
import { ElMessage } from "element-plus";
import { operatorAdminApi } from "@/api";

interface OperatorStation {
  id: string;
  brandName: string;
  level: string;
  containQuota: number;
  usedQuota: number;
  status: string;
}

const loading = ref(false);
const loadError = ref(false);
const list = ref<OperatorStation[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const dialogVisible = ref(false);
const submitting = ref(false);
const currentRow = ref<OperatorStation | null>(null);

const form = reactive({
  brandName: "",
});

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    const res = await operatorAdminApi.list({ page: page.value, pageSize: pageSize.value });
    list.value = res.data.operators || res.data.items || res.data.list || [];
    total.value = res.data.total || 0;
  } catch {
    loadError.value = true;
    ElMessage.error("获取运营商列表失败");
  } finally {
    loading.value = false;
  }
}

function openEditDialog(row: OperatorStation) {
  currentRow.value = row;
  form.brandName = row.brandName;
  dialogVisible.value = true;
}

async function handleSubmit() {
  if (!currentRow.value) return;
  submitting.value = true;
  try {
    await operatorAdminApi.updateBrand(currentRow.value.id, { brandName: form.brandName });
    ElMessage.success("更新成功");
    dialogVisible.value = false;
    fetchList();
  } catch {
    ElMessage.error("更新失败");
  } finally {
    submitting.value = false;
  }
}

onMounted(fetchList);
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
</style>
