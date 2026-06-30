<template>
  <div class="poetry-cat-page">
    <PageHeader title="诗词分类管理">
      <template #actions>
        <el-button
          type="primary"
          @click="openEdit()"
        >
          添加分类
        </el-button>
      </template>
    </PageHeader>

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
          @click="fetchCategories"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-table
      v-else
      v-loading="loading"
      :data="categories"
      border
      stripe
    >
      <template #empty>
        <el-empty
          description="暂无分类"
          :image-size="80"
        />
      </template>
      <el-table-column
        label="图标"
        width="80"
        align="center"
      >
        <template #default="{ row }">
          <span class="cat-icon">{{ row.icon || "—" }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="name"
        label="名称"
        width="160"
      />
      <el-table-column
        prop="intro"
        label="简介"
        min-width="240"
        show-overflow-tooltip
      />
      <el-table-column
        prop="poemCount"
        label="作品数"
        width="100"
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
            @click="delCategory(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editing.id ? '编辑分类' : '添加分类'"
      width="480px"
    >
      <el-form
        :model="form"
        label-width="72px"
      >
        <el-form-item
          label="名称"
          required
        >
          <el-input
            v-model="form.name"
            placeholder="分类名称（唯一）"
          />
        </el-form-item>
        <el-form-item label="图标">
          <el-input
            v-model="form.icon"
            placeholder="emoji 图标，如 🌸"
          />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="form.intro"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="form.sortOrder"
            :min="0"
            controls-position="right"
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
          @click="saveCategory"
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

/** 分类行（宽松 optional，按模板访问声明） */
interface CategoryRow {
  id?: string; name?: string; icon?: string; intro?: string;
  sortOrder?: number; poemCount?: number;
}
/** 编辑表单（字段均有默认值，故为必填） */
interface CategoryForm { name: string; icon: string; intro: string; sortOrder: number }
/** axios 错误对象（无类型来源，本地声明） */
interface ApiError { response?: { data?: { message?: string } }; message?: string }

const categories = ref<CategoryRow[]>([]);
const loading = ref(false);
const error = ref("");
const submitting = ref(false);

const dialogVisible = ref(false);
const editing = ref<CategoryRow>({});
const form = reactive<CategoryForm>({ name: "", icon: "", intro: "", sortOrder: 0 });

onMounted(fetchCategories);

async function fetchCategories() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await poetryAdminApi.listCategories();
    categories.value = data || [];
  } catch (e) {
    error.value = (e as ApiError)?.response?.data?.message || (e as ApiError)?.message || "加载分类失败";
  } finally {
    loading.value = false;
  }
}

function openEdit(row?: CategoryRow) {
  editing.value = row || {};
  if (row) {
    Object.assign(form, {
      name: row.name || "", icon: row.icon || "",
      intro: row.intro || "", sortOrder: row.sortOrder ?? 0,
    });
  } else {
    Object.assign(form, { name: "", icon: "", intro: "", sortOrder: 0 });
  }
  dialogVisible.value = true;
}

async function saveCategory() {
  if (submitting.value) return;
  if (!form.name.trim()) {
    ElMessage.warning("请输入分类名称");
    return;
  }
  submitting.value = true;
  try {
    const payload = { ...form };
    if (editing.value.id) {
      await poetryAdminApi.updateCategory(editing.value.id, payload);
      ElMessage.success("已更新");
    } else {
      await poetryAdminApi.createCategory(payload);
      ElMessage.success("已添加");
    }
    dialogVisible.value = false;
    fetchCategories();
  } catch (e) {
    ElMessage.error((e as ApiError)?.response?.data?.message || "保存失败");
  } finally {
    submitting.value = false;
  }
}

function delCategory(id: string) {
  ElMessageBox.confirm("确定删除该分类？（含作品的分类无法删除）", "警告", { type: "warning" })
    .then(async () => {
      try {
        await poetryAdminApi.deleteCategory(id);
        ElMessage.success("已删除");
        fetchCategories();
      } catch (e) {
        ElMessage.error((e as ApiError)?.response?.data?.message || "删除失败");
      }
    })
    .catch(() => {});
}
</script>

<style scoped>
.poetry-cat-page { padding: 0; }
.cat-icon { font-size: 20px; }
</style>
