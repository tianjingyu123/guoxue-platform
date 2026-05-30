<template>
  <div class="page">
    <div class="toolbar">
      <h3>评价管理</h3>
      <div class="filter-row">
        <el-input v-model="productIdFilter" placeholder="输入商品ID搜索" style="width:260px" clearable @clear="fetchList" @keyup.enter="fetchList" />
        <el-button type="primary" @click="fetchList" style="margin-left:8px">搜索</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="reviews" stripe>
      <el-table-column label="商品" min-width="160">
        <template #default="{ row }">
          <span v-if="row.product">{{ row.product.title || row.productId }}</span>
          <span v-else>{{ row.productId?.slice(0, 8) }}...</span>
        </template>
      </el-table-column>
      <el-table-column label="评分" width="80">
        <template #default="{ row }">{{ '★'.repeat(row.rating) }}{{ '☆'.repeat(5 - row.rating) }}</template>
      </el-table-column>
      <el-table-column prop="content" label="评价内容" min-width="180" show-overflow-tooltip />
      <el-table-column label="图片" width="60">
        <template #default="{ row }">
          <span v-if="row.images?.length">{{ row.images.length }}张</span>
          <span v-else>无</span>
        </template>
      </el-table-column>
      <el-table-column label="回复" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.reply" size="small" type="success">已回复</el-tag>
          <el-tag v-else size="small" type="info">未回复</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'PUBLISHED' ? 'success' : 'warning'" size="small">
            {{ row.status === 'PUBLISHED' ? '已发布' : '已隐藏' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="100">
        <template #default="{ row }">{{ row.createdAt?.slice(0, 10) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openReply(row)">回复</el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && reviews.length === 0 && !productIdFilter" description="请搜索商品ID查看评价" />

    <!-- 回复弹窗 -->
    <el-dialog v-model="replyVisible" title="回复评价" width="480px">
      <el-input v-model="replyContent" type="textarea" :rows="4" placeholder="输入回复内容..." />
      <template #footer>
        <el-button @click="replyVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReply">提交回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";

const loading = ref(false);
const reviews = ref<any[]>([]);
const productIdFilter = ref("");
const replyVisible = ref(false);
const replyContent = ref("");
const replyReviewId = ref("");

async function fetchList() {
  if (!productIdFilter.value.trim()) {
    reviews.value = [];
    return;
  }
  loading.value = true;
  try {
    const { data } = await api.get(`/shop/products/${productIdFilter.value}/reviews`, {
      params: { page: 1, pageSize: 50 },
    });
    reviews.value = data?.reviews || [];
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || "查询失败");
  } finally {
    loading.value = false;
  }
}

function openReply(row: any) {
  replyReviewId.value = row.id;
  replyContent.value = row.reply || "";
  replyVisible.value = true;
}

async function submitReply() {
  if (!replyContent.value.trim()) {
    ElMessage.warning("请输入回复内容");
    return;
  }
  try {
    await api.post(`/shop/reviews/${replyReviewId.value}/reply`, {
      reply: replyContent.value.trim(),
    });
    ElMessage.success("回复成功");
    replyVisible.value = false;
    fetchList();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || "回复失败");
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm("确定删除该评价吗？", "删除确认", { type: "warning" });
    await api.delete(`/shop/reviews/${row.id}`);
    ElMessage.success("已删除");
    fetchList();
  } catch { /* 取消 */ }
}
</script>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 16px; }
.filter-row { display: flex; align-items: center; }
</style>
