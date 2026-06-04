<template>
  <view class="page">
    <view
      v-if="loading"
      class="loading-state"
    >
      <text class="loading-text">
        加载中...
      </text>
    </view>

    <template v-else>
      <view
        v-if="list.length === 0"
        class="empty"
      >
        <text class="empty-icon">
          🔄
        </text>
        <text>暂无售后记录</text>
      </view>

      <view
        v-for="item in list"
        :key="item.id"
        class="card"
        @click="goDetail(item)"
      >
        <view class="card-header">
          <text class="card-type">
            {{ typeLabel(item.type) }}
          </text>
          <text
            class="card-status"
            :class="'status-' + (item.status || '').toLowerCase()"
          >
            {{ statusLabel(item.status) }}
          </text>
        </view>
        <text class="card-reason">
          {{ item.reason }}
        </text>
        <view class="card-footer">
          <text
            v-if="item.amount"
            class="card-amount"
          >
            ¥{{ Number(item.amount).toFixed(2) }}
          </text>
          <text class="card-time">
            {{ formatTime(item.createdAt) }}
          </text>
        </view>
      </view>

      <!-- 分页加载 -->
      <view
        v-if="hasMore"
        class="load-more"
        @click="loadMore"
      >
        <text>加载更多</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { shopApi } from "../../api";

const loading = ref(true);
const list = ref<any[]>([]);
const page = ref(1);
const hasMore = ref(false);

onMounted(() => fetchList());

async function fetchList(append = false) {
  try {
    const data = await shopApi.myAfterSales({ page: page.value, pageSize: 20 });
    const items = data?.items || data?.data || [];
    if (append) {
      list.value = [...list.value, ...items];
    } else {
      list.value = items;
    }
    hasMore.value = items.length === 20;
  } catch { /* */ } finally {
    loading.value = false;
  }
}

function loadMore() {
  page.value++;
  fetchList(true);
}

function typeLabel(t: string) {
  const map: Record<string, string> = { refund: "退款", return: "退货", exchange: "换货" };
  return map[t] || t;
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    PENDING: "待处理", APPROVED: "已同意", REJECTED: "已拒绝",
    CANCELLED: "已取消", COMPLETED: "已完成", PROCESSING: "处理中",
  };
  return map[s] || s;
}

function formatTime(t: string) {
  if (!t) return "";
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function goDetail(item: any) {
  uni.navigateTo({ url: `/pages/shop/after-sale?orderId=${item.orderId}` });
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 20px; }

.loading-state { display: flex; justify-content: center; padding: 80px 0; }
.loading-text { color: #999; font-size: 14px; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 80px 0; color: #999; font-size: 14px; }
.empty-icon { font-size: 40px; margin-bottom: 8px; }

.card { background: #fff; margin: 8px 10px; padding: 14px; border-radius: 10px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.card-type { font-size: 14px; font-weight: 600; color: #2C2C2C; }
.card-status { font-size: 12px; padding: 2px 10px; border-radius: 10px; }
.status-pending { background: #fef5e7; color: #C9A96E; }
.status-approved { background: #eafaf1; color: #27ae60; }
.status-rejected { background: #fdedec; color: #C41E3A; }
.status-cancelled { background: #F5F0E8; color: #bbb; }
.status-completed { background: #eafaf1; color: #27ae60; }
.card-reason { font-size: 13px; color: #666; display: block; }
.card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
.card-amount { font-size: 15px; font-weight: bold; color: #C41E3A; }
.card-time { font-size: 11px; color: #bbb; }

.load-more { text-align: center; padding: 16px; color: #C9A96E; font-size: 13px; }
</style>
