<template>
  <div class="page">
    <div class="toolbar">
      <h3>评价管理</h3>
      <div class="filter-row">
        <el-input
          v-model="productIdFilter"
          placeholder="输入商品ID搜索"
          style="width:260px"
          clearable
          @clear="fetchList"
          @keyup.enter="fetchList"
        />
        <el-select v-model="ratingFilter" placeholder="评分筛选" clearable style="width:120px;margin-left:8px" @change="fetchList">
          <el-option label="全部" value="" />
          <el-option label="5星" value="5" /><el-option label="4星" value="4" />
          <el-option label="3星" value="3" /><el-option label="2星" value="2" /><el-option label="1星" value="1" />
        </el-select>
        <el-button type="primary" style="margin-left:8px" @click="fetchList">搜索</el-button>
        <el-button style="margin-left:8px" @click="checkAbnormal">异常检测</el-button>
      </div>
    </div>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <template #title>
        加载失败，请
        <el-button link type="primary" @click="fetchList">重试</el-button>
      </template>
    </el-alert>

    <el-table v-loading="loading" :data="reviews" stripe>
      <template #empty>
        <el-empty :description="productIdFilter ? '暂无评价' : '请搜索商品ID查看评价'" />
      </template>
      <el-table-column label="商品" min-width="160">
        <template #default="{ row }">
          <span v-if="row.product">{{ row.product.title || row.productId }}</span>
          <span v-else>{{ row.productId?.slice(0, 8) }}...</span>
        </template>
      </el-table-column>
      <el-table-column label="评分" width="80">
        <template #default="{ row }">
          {{ '★'.repeat(row.rating) }}{{ '☆'.repeat(5 - row.rating) }}
        </template>
      </el-table-column>
      <el-table-column prop="content" label="评价内容" min-width="180" show-overflow-tooltip />
      <el-table-column label="图片" width="60">
        <template #default="{ row }">
          <span v-if="row.images?.length">{{ row.images.length }}张</span>
          <span v-else>无</span>
        </template>
      </el-table-column>
      <el-table-column label="投票" width="140" align="center">
        <template #default="{ row }">
          <div class="vote-row">
            <span class="vote-up">👍 {{ row.usefulCount ?? 0 }}</span>
            <span class="vote-down" style="margin-left:8px">👎 {{ row.uselessCount ?? 0 }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="异常" width="70" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.isAbnormal" size="small" type="danger" effect="dark">异常</el-tag>
          <span v-else style="color:#ccc">-</span>
        </template>
      </el-table-column>
      <el-table-column label="回复" width="80">
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
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openReply(row)">回复</el-button>
          <el-button size="small" type="warning" @click="toggleHide(row)">
            {{ row.status === 'PUBLISHED' ? '隐藏' : '显示' }}
          </el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 回复弹窗 -->
    <el-dialog v-model="replyVisible" title="回复评价" width="480px">
      <el-input v-model="replyContent" type="textarea" :rows="4" placeholder="输入回复内容..." />
      <template #footer>
        <el-button @click="replyVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReply">提交回复</el-button>
      </template>
    </el-dialog>

    <!-- 异常评价弹窗 -->
    <el-dialog v-model="abnormalVisible" title="异常评价检测" width="600px">
      <el-alert
        v-if="abnormalList.length === 0"
        title="未检测到异常评价"
        type="success"
        :closable="false"
        show-icon
      />
      <el-table v-else :data="abnormalList" stripe>
        <el-table-column prop="reviewId" label="评价ID" width="120" />
        <el-table-column prop="content" label="内容" minWidth="200" show-overflow-tooltip />
        <el-table-column label="异常类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" type="danger">{{ row.abnormalType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="score" label="异常度" width="80" align="center" sortable />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";

/** 评价行（字段宽松 optional） */
interface ReviewRow {
  id?: string;
  productId?: string;
  product?: { title?: string };
  rating?: number;
  content?: string;
  images?: string[];
  usefulCount?: number;
  uselessCount?: number;
  upvotes?: number;
  downvotes?: number;
  isAbnormal?: boolean;
  reply?: string;
  status?: string;
  createdAt?: string;
}
/** 异常评价行（字段宽松 optional） */
interface AbnormalRow {
  reviewId?: string;
  content?: string;
  abnormalType?: string;
  score?: number;
}

const loading = ref(false);
const error = ref(false);
const submitting = ref(false);
const acting = ref(false);
const reviews = ref<ReviewRow[]>([]);
const productIdFilter = ref("");
const ratingFilter = ref("");
const replyVisible = ref(false);
const replyContent = ref("");
const replyReviewId = ref("");
const abnormalVisible = ref(false);
const abnormalList = ref<AbnormalRow[]>([]);

async function fetchList() {
  error.value = false;
  if (!productIdFilter.value.trim()) {
    reviews.value = [];
    return;
  }
  loading.value = true;
  try {
    const params: Record<string, string | number> = { page: 1, pageSize: 50 };
    if (ratingFilter.value) params.rating = Number(ratingFilter.value);
    const { data } = await api.get(`/shop/products/${productIdFilter.value}/reviews`, { params });
    reviews.value = (data?.reviews || []).map((r: ReviewRow) => ({
      ...r,
      usefulCount: r.usefulCount ?? r.upvotes ?? 0,
      uselessCount: r.uselessCount ?? r.downvotes ?? 0,
      isAbnormal: r.isAbnormal ?? false,
    }));
  } catch (e) {
    reviews.value = [];
    error.value = true;
    ElMessage.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "查询失败");
  } finally {
    loading.value = false;
  }
}

function openReply(row: ReviewRow) {
  replyReviewId.value = row.id ?? "";
  replyContent.value = row.reply || "";
  replyVisible.value = true;
}

async function submitReply() {
  if (!replyContent.value.trim()) {
    ElMessage.warning("请输入回复内容");
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    await api.post(`/shop/reviews/${replyReviewId.value}/reply`, { reply: replyContent.value.trim() });
    ElMessage.success("回复成功");
    replyVisible.value = false;
    fetchList();
  } catch (e) {
    ElMessage.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "回复失败");
  } finally {
    submitting.value = false;
  }
}

async function toggleHide(row: ReviewRow) {
  if (acting.value) return;
  acting.value = true;
  try {
    const newStatus = row.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED';
    await api.put(`/shop/reviews/${row.id}/toggle`, { status: newStatus });
    ElMessage.success(newStatus === 'HIDDEN' ? '已隐藏' : '已显示');
    fetchList();
  } catch { /* */ } finally { acting.value = false; }
}

async function handleDelete(row: ReviewRow) {
  try {
    await ElMessageBox.confirm("确定删除该评价吗？", "删除确认", { type: "warning" });
    if (acting.value) return;
    acting.value = true;
    await api.delete(`/shop/reviews/${row.id}`);
    ElMessage.success("已删除");
    fetchList();
  } catch { /* 取消 */ } finally { acting.value = false; }
}

async function checkAbnormal() {
  if (!productIdFilter.value.trim()) {
    ElMessage.warning("请先搜索商品ID");
    return;
  }
  try {
    const { data } = await api.get(`/shop/products/${productIdFilter.value}/reviews/abnormal`);
    abnormalList.value = data?.list ?? data?.data ?? [];
    abnormalVisible.value = true;
  } catch {
    abnormalList.value = [];
    abnormalVisible.value = true;
  }
}
</script>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 16px; }
.filter-row { display: flex; align-items: center; }
.vote-row { font-size: 13px; }
.vote-up { color: var(--color-success); }
.vote-down { color: var(--color-error); }
</style>
