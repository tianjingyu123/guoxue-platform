<template>
  <div class="page">
    <div class="header">
      <h2>小程序管理</h2>
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
        prop="miniAppId"
        label="小程序AppID"
        min-width="200"
      />
      <el-table-column
        prop="mpAppId"
        label="公众号AppID"
        min-width="200"
      />
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
            编辑
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="loadError ? '加载失败' : '暂无小程序配置'">
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
      title="编辑小程序配置"
      width="550px"
    >
      <el-form
        ref="formRef"
        :model="form"
        label-width="120px"
      >
        <el-form-item label="品牌名称">
          <el-input
            v-model="form.brandName"
            disabled
          />
        </el-form-item>
        <el-form-item label="小程序AppID">
          <el-input
            v-model="form.miniAppId"
            placeholder="微信小程序AppID"
          />
        </el-form-item>
        <el-form-item label="公众号AppID">
          <el-input
            v-model="form.mpAppId"
            placeholder="微信公众号AppID"
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
import { ElMessage } from "element-plus";
import { operatorAdminApi } from "@/api";

interface MiniAppConfig {
  id: string;
  brandName: string;
  miniAppId: string;
  mpAppId: string;
  status: string;
}

const loading = ref(false);
const loadError = ref(false);
const list = ref<MiniAppConfig[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const dialogVisible = ref(false);
const submitting = ref(false);
const currentRow = ref<MiniAppConfig | null>(null);

const form = reactive({
  brandName: "",
  miniAppId: "",
  mpAppId: "",
});

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    const res = await operatorAdminApi.listMiniApps({ page: page.value, pageSize: pageSize.value });
    list.value = res.data.items || res.data.list || res.data.rows || [];
    total.value = res.data.total || 0;
  } catch {
    loadError.value = true;
    ElMessage.error("获取小程序配置列表失败");
  } finally {
    loading.value = false;
  }
}

function openEditDialog(row: MiniAppConfig) {
  currentRow.value = row;
  form.brandName = row.brandName;
  form.miniAppId = row.miniAppId;
  form.mpAppId = row.mpAppId;
  dialogVisible.value = true;
}

async function handleSubmit() {
  if (!currentRow.value) return;
  submitting.value = true;
  try {
    await operatorAdminApi.updateMiniApp(currentRow.value.id, {
      miniAppId: form.miniAppId,
      mpAppId: form.mpAppId,
    });
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
