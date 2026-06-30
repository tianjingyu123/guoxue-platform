<template>
  <div class="page">
    <div class="page-header">
      <h3>商品管理</h3>
      <div class="header-right">
        <el-select
          v-model="filterStatus"
          placeholder="全部状态"
          clearable
          style="width:130px"
          @change="fetchList"
        >
          <el-option
            label="在售"
            value="ON_SALE"
          />
          <el-option
            label="已下架"
            value="OFF_SHELF"
          />
        </el-select>
        <el-button
          type="primary"
          @click="openCreate"
        >
          发布商品
        </el-button>
      </div>
    </div>

    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="商品数据加载失败，请稍后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-table
      v-else
      v-loading="loading"
      :data="list"
      stripe
    >
      <template #empty>
        <el-empty description="暂无商品数据" />
      </template>
      <el-table-column
        label="图片"
        width="80"
      >
        <template #default="{ row }">
          <img
            v-if="row.images?.[0]"
            :src="row.images[0]"
            class="prod-img"
          >
          <div
            v-else
            class="prod-img-placeholder"
          >
            无图
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="title"
        label="商品名称"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        label="价格"
        width="100"
      >
        <template #default="{ row }">
          ¥{{ Number(row.price || 0).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column
        label="库存"
        width="70"
        prop="stock"
      />
      <el-table-column
        label="状态"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'ON_SALE' ? 'success' : 'info'"
            size="small"
          >
            {{ row.status === "ON_SALE" ? "在售" : "已下架" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        width="160"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="220"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            text
            type="primary"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            v-if="row.status === 'ON_SALE'"
            size="small"
            text
            type="warning"
            @click="toggleStatus(row, 'unlist')"
          >
            下架
          </el-button>
          <el-button
            v-else
            size="small"
            text
            type="success"
            @click="toggleStatus(row, 'list')"
          >
            上架
          </el-button>
          <el-button
            size="small"
            text
            type="danger"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="!error"
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <!-- 新建/编辑 dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑商品' : '发布商品'"
      width="650px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item
          label="商品名称"
          prop="title"
        >
          <el-input
            v-model="form.title"
            maxlength="100"
            placeholder="请输入商品名称"
          />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="form.intro"
            type="textarea"
            :rows="2"
            maxlength="200"
            placeholder="简短介绍"
          />
        </el-form-item>
        <el-form-item
          label="商品详情"
          prop="detail"
        >
          <el-input
            v-model="form.detail"
            type="textarea"
            :rows="5"
            placeholder="商品详情（支持HTML）"
          />
        </el-form-item>
        <el-form-item label="商品图片">
          <div class="images-section">
            <div
              v-for="(url, idx) in form.images"
              :key="idx"
              class="image-item"
            >
              <img :src="url">
              <el-button
                size="small"
                type="danger"
                class="img-remove"
                @click="form.images.splice(idx, 1)"
              >
                ×
              </el-button>
            </div>
            <div class="image-add">
              <el-input
                v-model="imageUrl"
                placeholder="图片URL"
                size="small"
                style="width:200px"
              />
              <el-button
                size="small"
                @click="addImage"
              >
                添加
              </el-button>
            </div>
          </div>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item
              label="价格"
              prop="price"
            >
              <el-input-number
                v-model="form.price"
                :min="0"
                :precision="2"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="库存"
              prop="stock"
            >
              <el-input-number
                v-model="form.stock"
                :min="0"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="分类">
          <el-input
            v-model="form.categoryId"
            placeholder="商品分类ID（可选）"
          />
        </el-form-item>
        <el-form-item label="标签">
          <el-tag
            v-for="(tag, idx) in form.tags"
            :key="idx"
            closable
            style="margin-right:4px"
            @close="form.tags.splice(idx, 1)"
          >
            {{ tag }}
          </el-tag>
          <el-input
            v-if="tagInputVisible"
            ref="tagInputRef"
            v-model="tagInputValue"
            size="small"
            style="width:80px"
            @keyup.enter="addTag"
            @blur="addTag"
          />
          <el-button
            v-else
            size="small"
            @click="showTagInput"
          >
            + 标签
          </el-button>
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
          {{ editingId ? "保存" : "发布" }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { merchantBackendApi } from "@/api";

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const error = ref(false);
const saving = ref(false);
const filterStatus = ref("");

const dialogVisible = ref(false);
const editingId = ref("");
const imageUrl = ref("");

const formRef = ref<any>(null);
const form = reactive({
  title: "", intro: "", detail: "",
  images: [] as string[], price: 0, stock: 0,
  categoryId: "", tags: [] as string[],
});

const rules = {
  title: [{ required: true, message: "请输入商品名称", trigger: "blur" }],
  detail: [{ required: true, message: "请输入商品详情", trigger: "blur" }],
  price: [{ required: true, message: "请输入价格", trigger: "blur" }],
  stock: [{ required: true, message: "请输入库存", trigger: "blur" }],
};

const tagInputVisible = ref(false);
const tagInputValue = ref("");
const tagInputRef = ref<any>(null);

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";
}

function showTagInput() { tagInputVisible.value = true; nextTick(() => tagInputRef.value?.focus?.()); }
function addTag() {
  const val = tagInputValue.value.trim();
  if (val && !form.tags.includes(val)) form.tags.push(val);
  tagInputValue.value = "";
  tagInputVisible.value = false;
}

function addImage() {
  const url = imageUrl.value.trim();
  if (url) { form.images.push(url); imageUrl.value = ""; }
}

function resetForm() {
  Object.assign(form, { title: "", intro: "", detail: "", images: [], price: 0, stock: 0, categoryId: "", tags: [] });
  imageUrl.value = "";
  editingId.value = "";
}

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: any = { page: page.value, pageSize: 20 };
    if (filterStatus.value) params.status = filterStatus.value;
    const res = await merchantBackendApi.listProducts(params);
    const data = (res as any).data ?? res;
    list.value = data.list || data.data || [];
    total.value = data.total || 0;
  } catch (e: any) {
    error.value = true;
  } finally { loading.value = false; }
}

function openCreate() {
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: any) {
  resetForm();
  editingId.value = row.id;
  form.title = row.title || "";
  form.intro = row.intro || "";
  form.detail = row.detail || "";
  form.images = [...(row.images || [])];
  form.price = Number(row.price) || 0;
  form.stock = Number(row.stock) || 0;
  form.categoryId = row.categoryId || "";
  form.tags = [...(row.tags || [])];
  dialogVisible.value = true;
}

async function save() {
  saving.value = true;
  try {
    const payload = { ...form, price: Number(form.price), stock: Number(form.stock) };
    if (editingId.value) {
      await merchantBackendApi.updateProduct(editingId.value, payload);
      ElMessage.success("保存成功");
    } else {
      await merchantBackendApi.createProduct(payload);
      ElMessage.success("发布成功");
    }
    dialogVisible.value = false;
    fetchList();
  } catch { /* */ } finally { saving.value = false; }
}

async function toggleStatus(row: any, action: string) {
  try {
    if (action === "list") {
      await merchantBackendApi.listProduct(row.id);
      ElMessage.success("已上架");
    } else {
      await merchantBackendApi.unlistProduct(row.id);
      ElMessage.success("已下架");
    }
    fetchList();
  } catch { /* */ }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除商品"${row.title}"？此操作不可恢复。`, "警告", { type: "error", confirmButtonClass: "el-button--danger" });
    await merchantBackendApi.deleteProduct(row.id);
    ElMessage.success("已删除");
    fetchList();
  } catch { /* */ }
}
</script>

<style scoped>
.page { padding: 20px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.header-right { display: flex; gap: 12px; }
.prod-img { width: 50px; height: 50px; border-radius: 4px; object-fit: cover; }
.prod-img-placeholder { width: 50px; height: 50px; border-radius: 4px; background: var(--color-bg-page); display: flex; align-items: center; justify-content: center; color: var(--color-text-placeholder); font-size: 12px; }
.images-section { display: flex; flex-wrap: wrap; gap: 8px; }
.image-item { position: relative; width: 80px; height: 80px; border-radius: 4px; overflow: hidden; }
.image-item img { width: 100%; height: 100%; object-fit: cover; }
.img-remove { position: absolute; top: 0; right: 0; padding: 2px 6px; border-radius: 0 4px 0 0; }
.image-add { display: flex; gap: 4px; align-items: center; }
</style>
