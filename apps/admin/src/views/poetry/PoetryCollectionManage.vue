<template>
  <div class="poetry-coll-page">
    <PageHeader title="诗词合集管理">
      <template #actions>
        <el-button
          type="primary"
          @click="openEdit()"
        >
          添加合集
        </el-button>
      </template>
    </PageHeader>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select
        v-model="statusFilter"
        placeholder="全部状态"
        clearable
        style="width: 140px"
        @change="reload"
      >
        <el-option
          label="已发布"
          value="PUBLISHED"
        />
        <el-option
          label="草稿"
          value="DRAFT"
        />
        <el-option
          label="已隐藏"
          value="HIDDEN"
        />
      </el-select>
    </div>

    <!-- 错误态 -->
    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      :sub-title="error"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchCollections"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-table
      v-else
      v-loading="loading"
      :data="collections"
      border
      stripe
    >
      <template #empty>
        <el-empty
          description="暂无合集"
          :image-size="80"
        />
      </template>
      <el-table-column
        label="封面"
        width="90"
        align="center"
      >
        <template #default="{ row }">
          <el-image
            v-if="row.cover"
            :src="row.cover"
            fit="cover"
            class="cover-img"
            :preview-src-list="[row.cover]"
            preview-teleported
          />
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="title"
        label="标题"
        min-width="160"
        show-overflow-tooltip
      />
      <el-table-column
        prop="author"
        label="编者"
        width="120"
      >
        <template #default="{ row }">
          {{ row.author || "—" }}
        </template>
      </el-table-column>
      <el-table-column
        prop="dynasty"
        label="朝代"
        width="90"
      >
        <template #default="{ row }">
          {{ row.dynasty || "—" }}
        </template>
      </el-table-column>
      <el-table-column
        prop="category"
        label="分类"
        width="120"
      >
        <template #default="{ row }">
          {{ row.category || "—" }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="poemCount"
        label="诗词数"
        width="90"
        align="center"
      >
        <template #default="{ row }">
          {{ row.poemCount ?? 0 }}
        </template>
      </el-table-column>
      <el-table-column
        prop="sortOrder"
        label="排序"
        width="80"
        align="center"
      />
      <el-table-column
        label="操作"
        width="160"
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
            size="small"
            type="danger"
            @click="delCollection(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div
      v-if="!error"
      class="pager"
    >
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="fetchCollections"
        @size-change="reload"
      />
    </div>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editing.id ? '编辑合集' : '添加合集'"
      width="560px"
    >
      <el-form
        :model="form"
        label-width="72px"
      >
        <el-form-item
          label="标题"
          required
        >
          <el-input v-model="form.title" />
        </el-form-item>
        <div class="form-row">
          <el-form-item label="编者">
            <el-input v-model="form.author" />
          </el-form-item>
          <el-form-item label="朝代">
            <el-input v-model="form.dynasty" />
          </el-form-item>
        </div>
        <el-form-item label="分类">
          <el-input
            v-model="form.category"
            placeholder="合集分类标签"
          />
        </el-form-item>
        <el-form-item label="封面">
          <el-input
            v-model="form.cover"
            placeholder="封面图URL"
          />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="form.excerpt"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <div class="form-row">
          <el-form-item label="状态">
            <el-select v-model="form.status">
              <el-option
                label="草稿"
                value="DRAFT"
              />
              <el-option
                label="已发布"
                value="PUBLISHED"
              />
              <el-option
                label="已隐藏"
                value="HIDDEN"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number
              v-model="form.sortOrder"
              :min="0"
              controls-position="right"
            />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="saveCollection"
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
import { poetryAdminApi } from "@/api";
import PageHeader from "@/components/PageHeader.vue";

const collections = ref<any[]>([]);
const loading = ref(false);
const error = ref("");
const submitting = ref(false);

const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const statusFilter = ref("");

const dialogVisible = ref(false);
const editing = ref<any>({});
const form = reactive<any>({
  title: "", author: "", dynasty: "", excerpt: "",
  category: "", cover: "", status: "DRAFT", sortOrder: 0,
});

onMounted(fetchCollections);

function statusLabel(s: string) {
  return s === "PUBLISHED" ? "已发布" : s === "HIDDEN" ? "已隐藏" : "草稿";
}
function statusTag(s: string) {
  return s === "PUBLISHED" ? "success" : s === "HIDDEN" ? "info" : "warning";
}

function reload() {
  page.value = 1;
  fetchCollections();
}

async function fetchCollections() {
  loading.value = true;
  error.value = "";
  try {
    const params: any = { page: page.value, pageSize: pageSize.value };
    if (statusFilter.value) params.status = statusFilter.value;
    const { data } = await poetryAdminApi.listCollections(params);
    collections.value = data?.items || [];
    total.value = data?.total || 0;
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || "加载合集失败";
  } finally {
    loading.value = false;
  }
}

function openEdit(row?: any) {
  editing.value = row || {};
  if (row) {
    Object.assign(form, {
      title: row.title || "", author: row.author || "", dynasty: row.dynasty || "",
      excerpt: row.excerpt || "", category: row.category || "", cover: row.cover || "",
      status: row.status || "DRAFT", sortOrder: row.sortOrder ?? 0,
    });
  } else {
    Object.assign(form, {
      title: "", author: "", dynasty: "", excerpt: "",
      category: "", cover: "", status: "DRAFT", sortOrder: 0,
    });
  }
  dialogVisible.value = true;
}

async function saveCollection() {
  if (submitting.value) return;
  if (!form.title.trim()) {
    ElMessage.warning("请输入合集标题");
    return;
  }
  submitting.value = true;
  try {
    const payload = { ...form };
    if (editing.value.id) {
      await poetryAdminApi.updateCollection(editing.value.id, payload);
      ElMessage.success("已更新");
    } else {
      await poetryAdminApi.createCollection(payload);
      ElMessage.success("已添加");
    }
    dialogVisible.value = false;
    fetchCollections();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || "保存失败");
  } finally {
    submitting.value = false;
  }
}

function delCollection(id: string) {
  ElMessageBox.confirm("确定删除该合集？", "警告", { type: "warning" })
    .then(async () => {
      try {
        await poetryAdminApi.deleteCollection(id);
        ElMessage.success("已删除");
        fetchCollections();
      } catch (e: any) {
        ElMessage.error(e?.response?.data?.message || "删除失败");
      }
    })
    .catch(() => {});
}
</script>

<style scoped>
.poetry-coll-page { padding: 0; }
.filter-bar { display: flex; gap: 12px; margin-bottom: 16px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
.cover-img { width: 48px; height: 64px; border-radius: 4px; }
.form-row { display: flex; gap: 16px; }
.form-row :deep(.el-form-item) { flex: 1; }
</style>
