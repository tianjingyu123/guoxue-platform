<template>
  <div class="page">
    <div class="page-header">
      <h3>客户管理</h3>
      <div class="header-right">
        <el-input v-model="search" placeholder="搜索客户昵称/手机号" clearable style="width:220px" @input="onSearch" />
      </div>
    </div>

    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="客户列表加载失败，请稍后重试"
    >
      <template #extra>
        <el-button type="primary" @click="fetchList">重试</el-button>
      </template>
    </el-result>

    <el-table v-else v-loading="loading" :data="displayList" stripe>
      <template #empty>
        <el-empty :description="search ? '没有匹配的客户，换个关键词试试' : '暂无客户，买家下单后会出现在这里'" />
      </template>
      <el-table-column label="客户ID" width="120">
        <template #default="{ row }">
          <el-tooltip :content="row.id + '（点击复制）'" placement="top">
            <span class="copy-id" @click="copyId(row.id)">{{ shortId(row.id) }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="昵称" width="130" show-overflow-tooltip>
        <template #default="{ row }">{{ row.nickname || "—" }}</template>
      </el-table-column>
      <el-table-column label="手机号" width="130">
        <template #default="{ row }">{{ row.phone || "—" }}</template>
      </el-table-column>
      <el-table-column label="累计消费" width="120" align="right">
        <template #default="{ row }">{{ fmtMoney(row.totalSpent) }}</template>
      </el-table-column>
      <el-table-column prop="orderCount" label="订单数" width="80" align="center" />
      <el-table-column label="最后下单" width="150">
        <template #default="{ row }">{{ fmtTime(row.lastOrderAt) }}</template>
      </el-table-column>
      <el-table-column label="注册时间" width="150">
        <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button size="small" text type="primary" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-if="!error" v-model:current-page="page" :total="total" :page-size="20" layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end" @current-change="fetchList" />

    <el-dialog v-model="detailDialog" title="客户详情" width="550px">
      <el-descriptions v-if="current" :column="2" border size="small">
        <el-descriptions-item label="客户ID">{{ current.id }}</el-descriptions-item>
        <el-descriptions-item label="昵称">{{ current.nickname || "—" }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ current.phone || "未绑定" }}</el-descriptions-item>
        <el-descriptions-item label="累计消费">{{ fmtMoney(current.totalSpent) }}</el-descriptions-item>
        <el-descriptions-item label="订单数">{{ current.orderCount ?? "—" }}</el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ fmtTime(current.createdAt) }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { merchantBackendApi } from "@/api";

/**
 * 客户行——后端 listCustomers 聚合返回：id/nickname/avatar/phone(已脱敏)/orderCount/totalSpent/lastOrderAt；
 * keyword 搜索与 createdAt 为新契约（后端补齐中）：keyword 未生效时前端过滤当前页兜底，createdAt 缺则"—"。
 */
interface CustomerRow {
  id: string;
  nickname?: string;
  phone?: string;
  totalSpent?: number | string;
  orderCount?: number;
  lastOrderAt?: string;
  createdAt?: string;
}

const list = ref<CustomerRow[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const error = ref(false);
const search = ref("");
const detailDialog = ref(false);
const current = ref<CustomerRow | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

/** 搜索降级：keyword 已随请求发给后端（新契约）；后端未支持时在当前页前端过滤兜底 */
const displayList = computed(() => {
  const kw = search.value.trim().toLowerCase();
  if (!kw) return list.value;
  return list.value.filter(
    (r) => (r.nickname || "").toLowerCase().includes(kw) || (r.phone || "").includes(kw),
  );
});

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

function shortId(id?: string) { return id ? id.slice(0, 8) + "…" : "—"; }

async function copyId(id: string) {
  try {
    await navigator.clipboard.writeText(id);
    ElMessage.success("已复制");
  } catch {
    ElMessage.warning("复制失败，请手动选择复制");
  }
}

function onSearch() {
  clearTimeout(timer);
  timer = setTimeout(() => { page.value = 1; fetchList(); }, 400);
}

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: 20 };
    if (search.value) params.keyword = search.value;
    const res = await merchantBackendApi.listCustomers(params);
    // 兼容两种响应包装：{ data: {...} } 或直接返回 data
    const data = (res as { data?: { items?: CustomerRow[]; list?: CustomerRow[]; data?: CustomerRow[]; total?: number } }).data ?? (res as { items?: CustomerRow[]; list?: CustomerRow[]; data?: CustomerRow[]; total?: number });
    list.value = data.items || data.list || data.data || [];
    total.value = data.total || 0;
  } catch (e) {
    error.value = true;
  } finally { loading.value = false; }
}

function openDetail(row: CustomerRow) { current.value = row; detailDialog.value = true; }
</script>

<style scoped>
.page { padding: 20px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.header-right { display: flex; gap: 12px; }
.copy-id { cursor: pointer; color: var(--el-color-primary, #409eff); font-family: monospace; }
</style>
