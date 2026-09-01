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
          @change="handleFilterChange"
        >
          <el-option
            label="在售"
            value="ON_SALE"
          />
          <el-option
            label="待平台审核"
            value="PENDING"
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
        <el-empty description="暂无商品，点击右上角「发布商品」上架第一件商品" />
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
        width="110"
        align="right"
      >
        <template #default="{ row }">
          {{ fmtMoney(row.price) }}
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
            :type="statusMeta(row.status).type"
            size="small"
          >
            {{ statusMeta(row.status).label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        width="150"
      >
        <template #default="{ row }">
          {{ fmtTime(row.createdAt) }}
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
            v-else-if="row.status === 'OFF_SHELF'"
            size="small"
            text
            type="success"
            @click="toggleStatus(row, 'list')"
          >
            上架
          </el-button>
          <el-tooltip
            v-else-if="row.status === 'PENDING'"
            content="平台审核通过后才能上架"
            placement="top"
          >
            <span class="pending-hint">审核中</span>
          </el-tooltip>
          <el-button
            v-if="row.status !== 'ON_SALE'"
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

    <!-- 商品发布/编辑（全屏分区块编辑器·右侧手机实时预览·2026-07-11 重做） -->
    <ProductEditor
      v-model="editorVisible"
      :product-id="editingId"
      @saved="fetchList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { merchantBackendApi } from "@/api";
import ProductEditor from "./ProductEditor.vue";

/** 商品行（字段宽松 optional） */
interface ProductRow {
  id: string;
  title?: string;
  images?: string[];
  price?: number | string;
  stock?: number;
  status?: string;
  createdAt?: string;
}

const list = ref<ProductRow[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const error = ref(false);
const filterStatus = ref("");

const editorVisible = ref(false);
const editingId = ref("");

type TagType = "success" | "warning" | "info" | "danger";

function statusMeta(status?: string): { label: string; type: TagType } {
  const map: Record<string, { label: string; type: TagType }> = {
    ON_SALE: { label: "在售", type: "success" },
    PENDING: { label: "待审核", type: "warning" },
    OFF_SHELF: { label: "已下架", type: "info" },
  };
  return map[status || ""] || { label: status || "未知", type: "danger" };
}

/** 金额：千分位两位小数，空值显示 — */
function fmtMoney(v?: number | string | null): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return "¥" + n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 时间：YYYY-MM-DD HH:mm，空值显示 — */
function fmtTime(d?: string | null): string {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}`;
}

onMounted(() => fetchList());

function handleFilterChange() {
  page.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: 20 };
    if (filterStatus.value) params.status = filterStatus.value;
    const res = await merchantBackendApi.listProducts(params);
    // 兼容两种响应包装：{ data: {...} } 或直接返回 data
    const data = (res as { data?: { items?: ProductRow[]; list?: ProductRow[]; data?: ProductRow[]; total?: number } }).data ?? (res as { items?: ProductRow[]; list?: ProductRow[]; data?: ProductRow[]; total?: number });
    list.value = data.items || data.list || data.data || [];
    total.value = data.total || 0;
  } catch {
    error.value = true;
  } finally { loading.value = false; }
}

function openCreate() {
  editingId.value = "";
  editorVisible.value = true;
}

function openEdit(row: ProductRow) {
  editingId.value = row.id;
  editorVisible.value = true;
}

async function toggleStatus(row: ProductRow, action: string) {
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

async function handleDelete(row: ProductRow) {
  try {
    await ElMessageBox.confirm(
      `确定删除商品“${row.title || "未命名商品"}”吗？删除后不再展示，历史订单与审计记录仍会保留。`,
      "删除商品",
      { type: "warning", confirmButtonClass: "el-button--danger" },
    );
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
.pending-hint { color: var(--el-color-warning); font-size: 13px; margin: 0 8px; cursor: help; }
</style>
