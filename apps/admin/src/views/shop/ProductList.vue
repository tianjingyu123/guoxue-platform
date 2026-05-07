<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import api from "../../api";

const products = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await api.get("/shop/products", { params: { page: page.value, pageSize: 20 } });
    products.value = data.products;
    total.value = data.total;
  } finally { loading.value = false; }
}

async function handleStatus(id: string, status: string) {
  await api.put(`/shop/products/${id}`, { status });
  ElMessage.success(status === "ON_SALE" ? "已上架" : "已下架");
  fetchList();
}

async function handleDelete(id: string) {
  try {
    await ElMessageBox.confirm("确定删除？");
    await api.delete(`/shop/products/${id}`);
    ElMessage.success("已删除");
    fetchList();
  } catch { /* */ }
}
</script>

<template>
  <div class="product-list">
    <div class="toolbar">
      <h3>商品管理</h3>
    </div>
    <el-table :data="products" v-loading="loading" stripe>
      <el-table-column prop="title" label="商品名" min-width="200" />
      <el-table-column label="价格" width="100">
        <template #default="{ row }">¥{{ row.price }}</template>
      </el-table-column>
      <el-table-column prop="stock" label="库存" width="80" />
      <el-table-column prop="salesCount" label="销量" width="80" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'ON_SALE' ? 'success' : row.status === 'PENDING' ? 'warning' : 'info'" size="small">
            {{ row.status === 'ON_SALE' ? '在售' : row.status === 'PENDING' ? '待审' : '下架' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="success" @click="handleStatus(row.id, 'ON_SALE')" v-if="row.status !== 'ON_SALE'">上架</el-button>
          <el-button size="small" type="warning" @click="handleStatus(row.id, 'OFF_SHELF')" v-if="row.status === 'ON_SALE'">下架</el-button>
          <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :total="total" @change="fetchList" layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end" />
  </div>
</template>

<style scoped>
.product-list { padding: 16px; }
.toolbar { margin-bottom: 16px; }
</style>
