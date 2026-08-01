<template>
  <div class="page">
    <PageHeader
      title="统一订单中心"
      description="跨域订单查询台（只读）· 发货/退款等操作请到「电商 · 订单管理」"
    >
      <template #actions>
        <div class="search-row">
          <el-input
            v-model="keyword"
            placeholder="订单号/用户昵称"
            clearable
            style="width:200px"
            @keyup.enter="doSearch"
            @clear="doSearch"
          />
          <el-select
            v-model="typeFilter"
            placeholder="订单来源"
            clearable
            style="width:140px"
            @change="doSearch"
          >
            <!-- 后端 /orders/admin/all 仅支持两类来源过滤：商城订单库(Order) / 会员购买(MemberPurchase) -->
            <el-option
              label="全部来源"
              value=""
            />
            <el-option
              label="商城订单"
              value="SHOP"
            />
            <el-option
              label="会员购买"
              value="MEMBER"
            />
          </el-select>
          <el-select
            v-model="statusFilter"
            placeholder="状态"
            clearable
            style="width:120px"
            @change="doSearch"
          >
            <el-option
              label="全部"
              value=""
            />
            <el-option
              v-for="(label, key) in statusLabelsFilter"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
          <el-button
            type="primary"
            @click="doSearch"
          >
            查询
          </el-button>
        </div>
      </template>
    </PageHeader>

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
      :data="list"
      border
      stripe
    >
      <template #empty>
        <el-empty description="暂无订单，换个筛选条件试试" />
      </template>
      <el-table-column
        label="订单号"
        width="130"
      >
        <template #default="{ row }">
          <el-tooltip
            :content="row.id"
            placement="top"
          >
            <span
              class="order-no"
              @click="copyText(row.id)"
            >{{ (row.id || '').slice(0, 8) }}…</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column
        label="来源"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            size="small"
            :type="row.orderType === 'SHOP' ? 'primary' : 'success'"
          >
            {{ orderSourceLabel(row.orderType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="业务类型"
        width="110"
      >
        <template #default="{ row }">
          <!-- 商城来源行透传真实 OrderType（row.type）·会员来源行为书院会员购买 -->
          {{ bizTypeLabel(row) }}
        </template>
      </el-table-column>
      <el-table-column
        label="用户"
        width="120"
        prop="user.nickname"
      >
        <template #default="{ row }">
          {{ row.user?.nickname || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="金额"
        width="110"
        align="right"
      >
        <template #default="{ row }">
          ¥{{ fmtAmount(row.amount) }}
        </template>
      </el-table-column>
      <el-table-column
        label="实付"
        width="110"
        align="right"
      >
        <template #default="{ row }">
          ¥{{ fmtAmount(row.payAmount ?? row.amount) }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            size="small"
            :type="statusType(row.status)"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="时间"
        width="130"
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
    </el-table>

    <div class="table-footer">
      <span class="cap-note">数据口径：每类来源最多显示近 500 条，更早订单请到「电商 · 订单管理」按条件筛选。</span>
      <el-pagination
        v-if="total > pageSize"
        v-model:current-page="page"
        layout="total, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        @current-change="fetchList"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { orderCenterApi } from "@/api";
import PageHeader from "@/components/PageHeader.vue";

const list = ref<any[]>([]);
const loading = ref(false);
const error = ref(false);
const keyword = ref("");
const typeFilter = ref("");
const statusFilter = ref("");
const page = ref(1);
const pageSize = 20;
const total = ref(0);

/** 来源（后端聚合口径）：SHOP=商城订单库 Order / MEMBER=会员购买 MemberPurchase */
function orderSourceLabel(t: string) { const m: Record<string, string> = { SHOP: "商城", MEMBER: "会员" }; return m[t] || t; }

/** OrderType 全量 12 值翻译（schema enum OrderType·与订单管理页同映射·漏一个就英文枚举直出） */
const orderTypeLabels: Record<string, string> = {
  MEMBER: "书院会员", COURSE: "课程", PRODUCT: "商品", CIRCLE_JOIN: "入圈",
  CIRCLE_RENEW: "圈子续费", STATION_MASTER: "分站站长", OPERATOR: "运营商",
  BOT_SERVICE: "智能体服务", PAIPAN: "排盘", LIVESTREAM: "直播", BUNDLE: "课程组合包",
  PRACTITIONER_PRO: "从业者会员",
};

/** 业务类型：商城行读后端透传的真实 OrderType；会员行统一为书院会员购买 */
function bizTypeLabel(row: { orderType?: string; type?: string; memberType?: string }) {
  if (row.orderType === "MEMBER") return row.memberType ? `书院会员(${row.memberType})` : "书院会员";
  return orderTypeLabels[row.type ?? ""] || row.type || "—";
}

// 全量状态映射：漏一个就会英文枚举直出员工界面（2026-07-15 走查发现 SHIPPED/COMPLETED 裸奔）
function statusLabel(s: string) { const m: Record<string, string> = { PAID: "已支付", PENDING: "待支付", PENDING_PAY: "待支付", REFUNDED: "已退款", REFUNDING: "退款中", CANCELLED: "已取消", CLAIMED: "已领取", SHIPPED: "已发货", DELIVERED: "已送达", RECEIVED: "已收货", COMPLETED: "已完成", CLOSED: "已关闭", PENDING_SHIP: "待发货", AFTER_SALE: "售后中" }; return m[s] || s; }
function statusType(s: string) { const m: Record<string, string> = { PAID: "success", COMPLETED: "success", RECEIVED: "success", DELIVERED: "success", PENDING: "warning", PENDING_PAY: "warning", PENDING_SHIP: "warning", SHIPPED: "warning", REFUNDED: "info", REFUNDING: "info", AFTER_SALE: "info", CANCELLED: "danger", CLOSED: "danger" }; return m[s] ?? "info"; }

/** 状态筛选下拉（后端把 status 直接透传 Order.status，补齐真实枚举：原来漏 SHIPPED/COMPLETED） */
const statusLabelsFilter: Record<string, string> = {
  PENDING: "待支付", PAID: "已支付", SHIPPED: "已发货", COMPLETED: "已完成", REFUNDED: "已退款", CANCELLED: "已取消",
};

function fmtAmount(v: number | string | undefined | null) {
  if (v === null || v === undefined || v === "") return "0.00";
  return Number(v).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
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
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    ElMessage.success("已复制");
  }
}

onMounted(() => fetchList());

function doSearch() { page.value = 1; fetchList(); }

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: any = { page: page.value, pageSize };
    if (keyword.value) params.keyword = keyword.value;
    if (typeFilter.value) params.type = typeFilter.value;
    if (statusFilter.value) params.status = statusFilter.value;
    const { data } = await orderCenterApi.adminList(params);
    list.value = data.items || data.orders || [];
    total.value = data.total || 0;
  } catch {
    list.value = [];
    total.value = 0;
    error.value = true;
  } finally { loading.value = false; }
}
</script>

<style scoped>
.page { padding: 0; }
.search-row { display: flex; gap: var(--spacing-sm); align-items: center; }
.table-footer { margin-top: var(--spacing-md); display: flex; justify-content: space-between; align-items: center; gap: var(--spacing-md); flex-wrap: wrap; }
.cap-note { font-size: 12px; color: var(--color-text-secondary, #909399); }
.order-no { cursor: pointer; color: var(--el-color-primary, #409eff); font-family: monospace; }
</style>
