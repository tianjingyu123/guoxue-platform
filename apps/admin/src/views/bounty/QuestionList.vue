<template>
  <div class="page">
    <div class="header">
      <h2>赏金问题管理</h2>
    </div>

    <el-form
      :inline="true"
      class="search-bar"
    >
      <el-form-item label="分类">
        <el-select
          v-model="filterCategory"
          placeholder="全部"
          clearable
        >
          <el-option
            label="八字"
            value="BAZI"
          />
          <el-option
            label="紫微"
            value="ZIWEI"
          />
          <el-option
            label="风水"
            value="FENGSHUI"
          />
          <el-option
            label="事业"
            value="CAREER"
          />
          <el-option
            label="情感"
            value="LOVE"
          />
          <el-option
            label="综合"
            value="GENERAL"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select
          v-model="filterStatus"
          placeholder="全部"
          clearable
        >
          <el-option
            label="悬赏中"
            value="OPEN"
          />
          <el-option
            label="已认领"
            value="CLAIMED"
          />
          <el-option
            label="已回答"
            value="ANSWERED"
          />
          <el-option
            label="已结算"
            value="SETTLED"
          />
          <el-option
            label="已退款"
            value="REFUNDED"
          />
          <el-option
            label="已关闭"
            value="CLOSED"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="handleSearch"
        >
          搜索
        </el-button>
        <el-button @click="resetFilter">
          重置
        </el-button>
        <el-button @click="fetchList">
          刷新
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 错误态 -->
    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="无法获取赏金问题列表，请重试"
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
      >
        <template #empty>
          <el-empty description="暂无赏金问题" />
        </template>
        <el-table-column
          prop="title"
          label="问题标题"
          min-width="200"
          show-overflow-tooltip
        />
      <el-table-column
        prop="category"
        label="分类"
        width="90"
      >
        <template #default="{ row }">
          <el-tag>{{ categoryLabel(row.category) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="bountyCoin"
        label="赏金"
        width="90"
        sortable
      >
        <template #default="{ row }">
          {{ row.bountyCoin }} 币
        </template>
      </el-table-column>
      <el-table-column
        prop="asker"
        label="提问者"
        width="130"
      >
        <template #default="{ row }">
          <!-- 后端列表未 include 用户对象，仅有 ID：截断显示防撑爆列 -->
          <el-tooltip
            v-if="!row.asker?.nickname && row.askerId"
            :content="row.askerId"
            placement="top"
          >
            <span>{{ row.askerId.slice(0, 8) }}…</span>
          </el-tooltip>
          <span v-else>{{ row.asker?.nickname || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="answerer"
        label="回答者"
        width="130"
      >
        <template #default="{ row }">
          <el-tooltip
            v-if="!row.answerer?.nickname && row.answererId"
            :content="row.answererId"
            placement="top"
          >
            <span>{{ row.answererId.slice(0, 8) }}…</span>
          </el-tooltip>
          <span v-else>{{ row.answerer?.nickname || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="status"
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        width="150"
      >
        <template #default="{ row }">
          <el-tooltip
            v-if="row.createdAt"
            :content="formatDateFull(row.createdAt)"
            placement="top"
          >
            <span>{{ formatDate(row.createdAt) }}</span>
          </el-tooltip>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="120"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            v-if="['OPEN', 'CLAIMED'].includes(row.status || '')"
            size="small"
            type="danger"
            :loading="closingId === row.id"
            @click="handleClose(row)"
          >
            关闭
          </el-button>
          <span
            v-else
            style="color: var(--color-text-placeholder); font-size: 12px"
          >—</span>
        </template>
      </el-table-column>
    </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @current-change="fetchList"
        @size-change="fetchList"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import api, { bountyApi } from "@/api";

const loading = ref(false);
const error = ref(false);
const closingId = ref<string | null>(null);
/** 赏金问题行（字段宽松 optional） */
interface QuestionRow {
  id: string;
  title?: string;
  category?: string;
  bountyCoin?: number;
  asker?: { nickname?: string };
  askerId?: string;
  answerer?: { nickname?: string };
  answererId?: string;
  status?: string;
  createdAt?: string;
}
const list = ref<QuestionRow[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterCategory = ref("");
const filterStatus = ref("");

// 后端真实枚举（prisma BountyQuestion.category）：BAZI/ZIWEI/FENGSHUI/CAREER/LOVE/GENERAL
function categoryLabel(cat: string) {
  const map: Record<string, string> = { BAZI: "八字", ZIWEI: "紫微", FENGSHUI: "风水", CAREER: "事业", LOVE: "情感", GENERAL: "综合" };
  return map[cat] || cat;
}

// 后端真实状态机（prisma BountyQuestion.status）：OPEN/CLAIMED/ANSWERED/SETTLED/REFUNDED/CLOSED
function statusTag(status: string) {
  const map: Record<string, string> = { OPEN: "warning", CLAIMED: "warning", ANSWERED: "primary", SETTLED: "success", REFUNDED: "info", CLOSED: "info" };
  return map[status] || "info";
}

function statusLabel(status: string) {
  const map: Record<string, string> = { OPEN: "悬赏中", CLAIMED: "已认领", ANSWERED: "已回答", SETTLED: "已结算", REFUNDED: "已退款", CLOSED: "已关闭" };
  return map[status] || status;
}

/** 列表时间：MM-DD HH:mm，悬浮给完整时间 */
function formatDate(d: string) {
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`;
}

function formatDateFull(d: string) {
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return d;
  return t.toLocaleString("zh-CN", { hour12: false });
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: pageSize.value };
    if (filterCategory.value) params.category = filterCategory.value;
    if (filterStatus.value) params.status = filterStatus.value;
    const res = await bountyApi.listQuestions(params);
    // 后端返回 { questions, total }（"questions" 不在响应拦截器分页键白名单内，不会被规范化为 items）
    list.value = res.data.questions || res.data.items || res.data.list || res.data.rows || [];
    total.value = res.data.total || 0;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

/** 搜索：重置页码回第一页再查询（翻到后页改筛选不落空页） */
function handleSearch() {
  page.value = 1;
  fetchList();
}

function resetFilter() {
  filterCategory.value = "";
  filterStatus.value = "";
  page.value = 1;
  fetchList();
}

async function handleClose(row: QuestionRow) {
  if (closingId.value) return;
  // L2 理由必填：关闭悬赏属下架类危险操作；未回答（悬赏中/已认领）会退还提问者赏金
  let reason = "";
  try {
    const refundHint = "关闭后赏金将按本悬赏业务单号解冻退还提问者。";
    const { value } = await ElMessageBox.prompt(
      `确定关闭悬赏"${row.title}"吗？${refundHint}请填写关闭理由：`,
      "确认关闭",
      {
        type: "warning",
        confirmButtonText: "确认关闭",
        confirmButtonClass: "el-button--danger",
        inputPlaceholder: "如：违规内容 / 提问者申请撤销 / 长期无人回答",
        inputValidator: (v: string) => (v && v.trim().length > 0) || "关闭理由必填",
      },
    );
    reason = value.trim();
  } catch { return; /* 用户取消 */ }
  closingId.value = row.id;
  try {
    await api.post(`/admin/bounty/questions/${row.id}/close`, { reason });
    ElMessage.success("已关闭");
    fetchList();
  } catch {
    ElMessage.error("关闭失败");
  } finally {
    closingId.value = null;
  }
}

onMounted(fetchList);
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.search-bar { margin-bottom: 20px; }
</style>
