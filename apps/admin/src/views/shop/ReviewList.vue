<template>
  <div class="page">
    <div class="toolbar">
      <h3>评价管理</h3>
      <div class="filter-row">
        <el-input
          v-model="productIdFilter"
          placeholder="商品ID筛选（可选，留空看全平台）"
          style="width:280px"
          clearable
          @clear="doSearch"
          @keyup.enter="doSearch"
        />
        <el-select
          v-if="productIdFilter.trim()"
          v-model="ratingFilter"
          placeholder="评分筛选"
          clearable
          style="width:120px;margin-left:8px"
          @change="doSearch"
        >
          <el-option
            label="全部"
            value=""
          />
          <el-option
            label="5星"
            value="5"
          /><el-option
            label="4星"
            value="4"
          />
          <el-option
            label="3星"
            value="3"
          /><el-option
            label="2星"
            value="2"
          /><el-option
            label="1星"
            value="1"
          />
        </el-select>
        <el-button
          type="primary"
          style="margin-left:8px"
          @click="doSearch"
        >
          查询
        </el-button>
        <el-button @click="fetchList">
          刷新
        </el-button>
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
        <el-button
          link
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="reviews"
      stripe
    >
      <template #empty>
        <el-empty :description="productIdFilter ? '该商品暂无评价，换个商品ID或清空看全平台' : '全平台暂无评价'" />
      </template>
      <el-table-column
        label="商品"
        min-width="160"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span v-if="row.product">{{ row.product.title || row.productId }}</span>
          <el-tooltip
            v-else-if="row.productId"
            :content="row.productId"
            placement="top"
          >
            <span class="mono">{{ row.productId.slice(0, 8) }}…</span>
          </el-tooltip>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column
        label="评分"
        width="90"
      >
        <template #default="{ row }">
          {{ '★'.repeat(row.rating || 0) }}{{ '☆'.repeat(Math.max(0, 5 - (row.rating || 0))) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="content"
        label="评价内容"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        label="图片"
        width="70"
      >
        <template #default="{ row }">
          <el-image
            v-if="row.images?.length"
            :src="row.images[0]"
            :preview-src-list="row.images"
            fit="cover"
            preview-teleported
            style="width:36px;height:36px;border-radius:4px;cursor:pointer"
          />
          <span
            v-else
            style="color:#c0c4cc"
          >—</span>
        </template>
      </el-table-column>
      <el-table-column
        label="投票"
        width="140"
        align="center"
      >
        <template #default="{ row }">
          <div class="vote-row">
            <span class="vote-up">有用 {{ row.usefulCount ?? 0 }}</span>
            <span
              class="vote-down"
              style="margin-left:8px"
            >无用 {{ row.uselessCount ?? 0 }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="异常"
        width="70"
        align="center"
      >
        <template #default="{ row }">
          <el-tag
            v-if="row.isAbnormal"
            size="small"
            type="danger"
            effect="dark"
          >
            异常
          </el-tag>
          <span
            v-else
            style="color:#ccc"
          >-</span>
        </template>
      </el-table-column>
      <el-table-column
        label="回复"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            v-if="row.reply"
            size="small"
            type="success"
          >
            已回复
          </el-tag>
          <el-tag
            v-else
            size="small"
            type="info"
          >
            未回复
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'PUBLISHED' ? 'success' : 'warning'"
            size="small"
          >
            {{ row.status === 'PUBLISHED' ? '已发布' : '已隐藏' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="时间"
        width="120"
      >
        <template #default="{ row }">
          <el-tooltip
            :content="fmtFullTime(row.createdAt)"
            placement="top"
          >
            <span>{{ fmtTime(row.createdAt) }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="240"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            link
            @click="openReply(row)"
          >
            回复
          </el-button>
          <el-tooltip
            :content="moderationUnavailable ? '隐藏/恢复接口待后端部署' : (row.status === 'PUBLISHED' ? '隐藏后 C 端不再展示该评价' : '恢复后 C 端重新展示')"
            placement="top"
          >
            <el-button
              size="small"
              :type="row.status === 'PUBLISHED' ? 'warning' : 'success'"
              link
              :disabled="moderationUnavailable"
              @click="toggleVisibility(row)"
            >
              {{ row.status === 'PUBLISHED' ? '隐藏' : '恢复' }}
            </el-button>
          </el-tooltip>
          <el-button
            size="small"
            type="danger"
            link
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @change="fetchList"
      />
    </div>

    <!-- 回复弹窗 -->
    <el-dialog
      v-model="replyVisible"
      title="回复评价"
      width="480px"
    >
      <div
        v-if="replyRow"
        class="reply-quote"
      >
        <span>{{ '★'.repeat(replyRow.rating || 0) }}</span>
        {{ replyRow.content || '（无文字内容）' }}
      </div>
      <el-input
        v-model="replyContent"
        type="textarea"
        :rows="4"
        placeholder="输入回复内容..."
      />
      <template #footer>
        <el-button @click="replyVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="submitReply"
        >
          提交回复
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
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
const loading = ref(false);
const error = ref(false);
const submitting = ref(false);
const acting = ref(false);
const reviews = ref<ReviewRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const productIdFilter = ref("");
const ratingFilter = ref("");
const replyVisible = ref(false);
const replyContent = ref("");
const replyReviewId = ref("");
const replyRow = ref<ReviewRow | null>(null);
/** 隐藏/恢复端点（PUT /shop/admin/reviews/:id/hide|show·后端在建）404 时置位 → 按钮禁用+tooltip，绝不假成功 */
const moderationUnavailable = ref(false);

function fmtTime(d?: string) {
  if (!d) return "-";
  const t = new Date(d);
  if (isNaN(t.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}`;
}
function fmtFullTime(d?: string) {
  if (!d) return "-";
  const t = new Date(d);
  if (isNaN(t.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`;
}

onMounted(() => fetchList());

function doSearch() { page.value = 1; fetchList(); }

function normalize(list: ReviewRow[]): ReviewRow[] {
  return (list || []).map((r) => ({
    ...r,
    usefulCount: r.usefulCount ?? r.upvotes ?? 0,
    uselessCount: r.uselessCount ?? r.downvotes ?? 0,
    isAbnormal: r.isAbnormal ?? false,
  }));
}

/**
 * P1 修复：原实现必须先输入商品ID才能看到任何评价（运营从此从未看过全平台评价流）。
 * 现默认接聚合端点 GET /shop/reviews（后端 listShopReviews·分页·全商品），
 * 填了商品ID再走 GET /shop/products/:id/reviews（该端点额外支持评分筛选）。
 */
async function fetchList() {
  error.value = false;
  loading.value = true;
  try {
    const pid = productIdFilter.value.trim();
    if (pid) {
      const params: Record<string, string | number> = { page: page.value, pageSize: pageSize.value };
      if (ratingFilter.value) params.rating = Number(ratingFilter.value);
      const { data } = await api.get(`/shop/products/${pid}/reviews`, { params });
      reviews.value = normalize(data?.reviews || []);
      total.value = data?.total ?? reviews.value.length;
    } else {
      const { data } = await api.get("/shop/reviews", { params: { page: page.value, pageSize: pageSize.value } });
      reviews.value = normalize(data?.reviews || []);
      total.value = data?.total ?? reviews.value.length;
    }
  } catch (e) {
    reviews.value = [];
    total.value = 0;
    error.value = true;
    ElMessage.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "查询失败");
  } finally {
    loading.value = false;
  }
}

function openReply(row: ReviewRow) {
  replyReviewId.value = row.id ?? "";
  replyRow.value = row;
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

/** 隐藏/恢复（并行后端契约·404 降级禁用，不假成功） */
async function toggleVisibility(row: ReviewRow) {
  if (acting.value || moderationUnavailable.value) return;
  const hide = row.status === "PUBLISHED";
  try {
    await ElMessageBox.confirm(
      hide ? "隐藏后该评价在 C 端不再展示，可随时恢复。确定隐藏？" : "恢复后该评价将重新在 C 端展示。确定恢复？",
      hide ? "隐藏评价" : "恢复评价",
      { type: "warning" },
    );
  } catch { return; }
  acting.value = true;
  try {
    await api.put(`/shop/admin/reviews/${row.id}/${hide ? "hide" : "show"}`);
    ElMessage.success(hide ? "已隐藏" : "已恢复");
    fetchList();
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      moderationUnavailable.value = true;
      ElMessage.warning("隐藏/恢复接口待后端部署，暂不可用");
    } else {
      ElMessage.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "操作失败，请重试");
    }
  } finally {
    acting.value = false;
  }
}

async function handleDelete(row: ReviewRow) {
  try {
    await ElMessageBox.confirm(
      `确定删除该评价吗？删除后不可恢复；如只是暂不展示，请用"隐藏"。`,
      "删除确认",
      { type: "warning", confirmButtonText: "确认删除", confirmButtonClass: "el-button--danger" },
    );
    if (acting.value) return;
    acting.value = true;
    await api.delete(`/shop/reviews/${row.id}`);
    ElMessage.success("已删除");
    fetchList();
  } catch { /* 取消 */ } finally { acting.value = false; }
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
.mono { font-family: monospace; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
.reply-quote { background: var(--color-bg-page, #f5f7fa); border-radius: 6px; padding: 10px 12px; font-size: 13px; color: #606266; margin-bottom: 12px; }
</style>
