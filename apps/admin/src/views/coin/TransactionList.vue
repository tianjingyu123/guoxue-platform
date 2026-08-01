<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { api as rawApi } from "@/api";
import PageHeader from "@/components/PageHeader.vue";
import { exportCSV } from "@/utils/export";

// 虚拟币交易流水行（后端 VirtualCoinTransaction：type/amountCoin/balanceAfter/scene/description）
interface TransactionRow {
  userId?: string;
  user?: { nickname?: string; phone?: string };
  type: string;
  amountCoin?: number;
  balanceAfter?: number;
  scene?: string;
  refId?: string;
  description?: string;
  createdAt: string;
}

const list = ref<TransactionRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const error = ref(false);
const searchUserId = ref("");
const filterType = ref("");
const filterScene = ref("");

// 🔴 只留后端真实枚举（CoinTransType）：RECHARGE/SPEND/REFUND/GRANT/INCOME
const typeLabels: Record<string, string> = {
  RECHARGE: "充值",
  SPEND: "消费",
  REFUND: "退款",
  GRANT: "平台赠送",
  INCOME: "收入",
};
function typeTagType(t: string) {
  const m: Record<string, string> = {
    RECHARGE: "success", SPEND: "warning", REFUND: "info", GRANT: "primary", INCOME: "success",
  };
  return m[t] || "info";
}

// 消费场景枚举翻译（后端 CoinScene）
const sceneLabels: Record<string, string> = {
  RECHARGE: "充值",
  CIRCLE_JOIN: "付费入圈",
  PAID_QUESTION: "付费提问",
  PEEK_ANSWER: "围观答案",
  AUDIO_CALL: "音频连麦",
  LIVE_GIFT: "直播打赏",
  LIVE_QUALITY_PACKAGE: "直播画质包",
  BOT_CALL: "智能体调用",
  REFUND: "退款",
  PLATFORM_GRANT: "平台赠送",
  BOUNTY: "悬赏咨询",
  BOUNTY_UNFREEZE: "悬赏解冻",
  POST_REWARD: "帖子打赏",
  CONSULT_CALL_PREPAY: "咨询通话预扣",
  LIVE_GIFT_INCOME: "打赏分成",
  EARNING_CONVERT: "收益转金币",
  CASE_CONTRIBUTION: "案例投稿奖励",
};
function sceneLabel(s?: string) { return s ? (sceneLabels[s] || s) : "—"; }

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: pageSize.value };
    if (searchUserId.value) params.userId = searchUserId.value;
    if (filterType.value) params.type = filterType.value;
    if (filterScene.value) params.scene = filterScene.value;
    const { data } = await rawApi.get("/coin/admin/transactions", { params });
    const payload = data ?? {};
    list.value = payload.transactions ?? payload.items ?? payload.data ?? [];
    total.value = payload.total ?? 0;
  } catch {
    list.value = [];
    total.value = 0;
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  page.value = 1;
  fetchList();
}

function maskPhone(phone?: string) {
  if (!phone) return "";
  const s = String(phone);
  if (s.length < 7) return s;
  return s.slice(0, 3) + "****" + s.slice(-4);
}

function userLabel(row: TransactionRow) {
  const nick = row.user?.nickname;
  const tail = row.user?.phone ? `(${String(row.user.phone).slice(-4)})` : "";
  if (nick) return `${nick}${tail}`;
  return row.userId ? row.userId.slice(0, 8) : "—";
}

// 币数量：正数绿(+)、负数红(-)，千分位
function fmtCoin(v: number | null | undefined) {
  if (v === undefined || v === null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${Number(v).toLocaleString("zh-CN")}`;
}

function formatTime(v: string | undefined) {
  if (!v) return "—";
  return v.slice(5, 16).replace("T", " ");
}
function fullTime(v: string | undefined) {
  if (!v) return "—";
  return v.slice(0, 19).replace("T", " ");
}

async function copyText(text?: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    ElMessage.warning("复制失败，请手动复制");
  }
}

// 导出当前页（后端无导出端点，导出当前已加载数据）
function exportData() {
  exportCSV(
    "国学币交易流水",
    [
      { label: "用户", key: "user" },
      { label: "手机号", key: "phone" },
      { label: "用户ID", key: "userId" },
      { label: "类型", key: "type" },
      { label: "变动币数", key: "amount" },
      { label: "变动后余额", key: "balance" },
      { label: "场景", key: "scene" },
      { label: "备注", key: "desc" },
      { label: "时间", key: "time" },
    ],
    list.value.map((r) => ({
      user: r.user?.nickname || "—",
      phone: maskPhone(r.user?.phone) || "—",
      userId: r.userId || "—",
      type: typeLabels[r.type] || r.type,
      amount: r.amountCoin ?? "—",
      balance: r.balanceAfter ?? "—",
      scene: sceneLabel(r.scene),
      desc: r.description || "—",
      time: fullTime(r.createdAt),
    })),
  );
}
</script>

<template>
  <div class="page">
    <PageHeader title="国学币交易流水" />

    <div class="search-bar">
      <el-input
        v-model="searchUserId"
        placeholder="用户ID"
        clearable
        style="width:240px"
        @clear="onSearch"
        @keyup.enter="onSearch"
      />
      <el-select
        v-model="filterType"
        placeholder="类型"
        clearable
        style="width:130px;margin-left:12px"
        @change="onSearch"
      >
        <el-option
          v-for="(label, key) in typeLabels"
          :key="key"
          :label="label"
          :value="key"
        />
      </el-select>
      <el-select
        v-model="filterScene"
        placeholder="场景"
        clearable
        filterable
        style="width:150px;margin-left:12px"
        @change="onSearch"
      >
        <el-option
          v-for="(label, key) in sceneLabels"
          :key="key"
          :label="label"
          :value="key"
        />
      </el-select>
      <el-button
        type="primary"
        style="margin-left:12px"
        @click="onSearch"
      >
        搜索
      </el-button>
      <el-button @click="exportData">
        导出当前页
      </el-button>
      <el-button @click="fetchList">
        刷新
      </el-button>
    </div>

    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="无法获取交易流水，请重试"
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

    <template v-else>
      <el-table
        v-loading="loading"
        :data="list"
        border
        stripe
        style="margin-top:12px"
      >
        <template #empty>
          <el-empty description="暂无交易流水，可调整筛选条件后重试" />
        </template>
        <el-table-column
          label="用户"
          width="160"
          show-overflow-tooltip
        >
        <template #default="{ row }">
          <el-tooltip
            :content="row.userId || '-'"
            placement="top"
          >
            <span
              class="copyable"
              @click="copyText(row.userId)"
            >{{ userLabel(row) }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column
        label="类型"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            size="small"
            :type="typeTagType(row.type)"
          >
            {{ typeLabels[row.type] || row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="变动币数"
        width="110"
        align="right"
      >
        <template #default="{ row }">
          <span :class="Number(row.amountCoin) >= 0 ? 'coin-in' : 'coin-out'">{{ fmtCoin(row.amountCoin) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="变动后余额"
        width="110"
        align="right"
      >
        <template #default="{ row }">
          {{ row.balanceAfter != null ? Number(row.balanceAfter).toLocaleString('zh-CN') : '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="场景"
        width="120"
      >
        <template #default="{ row }">
          {{ sceneLabel(row.scene) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="description"
        label="备注"
        min-width="200"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.description || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="时间"
        width="130"
      >
        <template #default="{ row }">
          <el-tooltip
            :content="fullTime(row.createdAt)"
            placement="top"
          >
            <span>{{ formatTime(row.createdAt) }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @change="fetchList"
      />
    </template>
  </div>
</template>

<style scoped>
.page { padding: 0; }
.search-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 0; }
.copyable { cursor: pointer; }
.coin-in { color: var(--el-color-success); font-weight: 600; }
.coin-out { color: var(--el-color-danger); font-weight: 600; }
</style>
