<template>
  <div class="page">
    <PageHeader title="统一订单中心">
      <template #actions>
        <div class="search-row">
          <el-input
            v-model="keyword"
            placeholder="订单号/用户昵称"
            clearable
            style="width:200px"
            @keyup.enter="fetchList"
          />
          <el-select
            v-model="typeFilter"
            placeholder="订单类型"
            clearable
            style="width:140px"
            @change="fetchList"
          >
            <el-option
              label="全部"
              value=""
            />
            <el-option
              label="商城"
              value="SHOP"
            />
            <el-option
              label="会员"
              value="MEMBER"
            />
          </el-select>
          <el-select
            v-model="statusFilter"
            placeholder="状态"
            clearable
            style="width:120px"
            @change="fetchList"
          >
            <el-option
              label="全部"
              value=""
            />
            <el-option
              label="已支付"
              value="PAID"
            />
            <el-option
              label="待支付"
              value="PENDING"
            />
            <el-option
              label="已退款"
              value="REFUNDED"
            />
            <el-option
              label="已取消"
              value="CANCELLED"
            />
          </el-select>
          <el-button
            type="primary"
            @click="fetchList"
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
        <el-empty description="暂无订单" />
      </template>
      <el-table-column
        label="订单号"
        width="200"
        prop="id"
      />
      <el-table-column
        label="类型"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            size="small"
            :type="row.orderType === 'SHOP' ? '' : row.orderType === 'MEMBER' ? 'success' : 'info'"
          >
            {{ orderTypeLabel(row.orderType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="用户"
        width="120"
        prop="user.nickname"
      />
      <el-table-column
        label="金额"
        width="100"
        align="right"
      >
        <template #default="{ row }">
          ¥{{ row.amount || 0 }}
        </template>
      </el-table-column>
      <el-table-column
        label="实付"
        width="100"
        align="right"
      >
        <template #default="{ row }">
          ¥{{ row.payAmount || row.amount || 0 }}
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
        width="170"
      >
        <template #default="{ row }">
          {{ row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-' }}
        </template>
      </el-table-column>
    </el-table>

    <div
      v-if="total > pageSize"
      class="pagination"
    >
      <el-pagination
        v-model:current-page="page"
        layout="prev, pager, next"
        :total="total"
        :page-size="pageSize"
        @current-change="fetchList"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
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

function orderTypeLabel(t: string) { const m: Record<string,string> = { SHOP: "商城", MEMBER: "会员", BUNDLE: "组合包" }; return m[t] || t; }
// 全量状态映射：漏一个就会英文枚举直出员工界面（2026-07-15 走查发现 SHIPPED/COMPLETED 裸奔）
function statusLabel(s: string) { const m: Record<string,string> = { PAID: "已支付", PENDING: "待支付", PENDING_PAY: "待支付", REFUNDED: "已退款", REFUNDING: "退款中", CANCELLED: "已取消", CLAIMED: "已领取", SHIPPED: "已发货", DELIVERED: "已送达", RECEIVED: "已收货", COMPLETED: "已完成", CLOSED: "已关闭", PENDING_SHIP: "待发货", AFTER_SALE: "售后中" }; return m[s] || s; }
function statusType(s: string) { const m: Record<string,string> = { PAID: "success", COMPLETED: "success", RECEIVED: "success", DELIVERED: "success", PENDING: "warning", PENDING_PAY: "warning", PENDING_SHIP: "warning", SHIPPED: "warning", REFUNDED: "info", REFUNDING: "info", AFTER_SALE: "info", CANCELLED: "danger", CLOSED: "danger" }; return m[s] ?? ""; }

onMounted(() => fetchList());

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
.pagination { margin-top: var(--spacing-md); display: flex; justify-content: flex-end; }
</style>
