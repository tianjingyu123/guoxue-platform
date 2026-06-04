<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { competitionApi } from "@/api";
import { exportCSV } from "@/utils/export";
import DataTable from "@/components/DataTable.vue";
import { useTable } from "@/composables/useTable";

const router = useRouter();

const typeLabels: Record<string, string> = {
  BAZI_PREDICT: "八字预测赛", LIUYAO: "六爻断卦赛", QIMEN_DUNJIA: "奇门遁甲赛",
  MEIHUA_YISHU: "梅花易数赛", ZIWEI_DOUSHU: "紫微斗数赛", FENGSHUI: "风水堪舆赛",
  NAME_ANALYSIS: "姓名学赛", POETRY: "诗词大赛", COUPLET: "对联大赛",
  CALLIGRAPHY: "书法大赛", PAINTING: "国画大赛", MUSIC: "民乐/古琴大赛",
  GO_CHESS: "围棋/象棋赛", TEA_CEREMONY: "茶道赛", INCENSE: "香道赛",
  MARTIAL_ARTS: "武术/太极赛", TCM_DIAGNOSIS: "中医辨证赛", CLASSIC_RECITE: "经典诵读赛",
  GEWU_PERCEIVE: "格物感知赛", UNKNOWN_PREDICT: "未知预测赛",
};

const statusLabels: Record<string, { text: string; type: string }> = {
  DRAFT: { text: "草稿", type: "info" },
  PUBLISHED: { text: "已发布", type: "success" },
  IN_PROGRESS: { text: "进行中", type: "warning" },
  FINISHED: { text: "已结束", type: "" },
};

const levelLabels: Record<string, string> = { S: "S级", A: "A级", B: "B级" };

const columns = [
  { prop: "title", label: "赛事名称", minWidth: 200, showOverflow: true },
  { prop: "type", label: "类型", width: 120, slot: "type" },
  { prop: "level", label: "级别", width: 70, slot: "level" },
  { prop: "scoringModel", label: "评分模型", width: 90, slot: "scoringModel" },
  { prop: "status", label: "状态", width: 90, slot: "status" },
  { prop: "_count.registrations", label: "报名数", width: 80, slot: "regCount" },
  { prop: "totalPrize", label: "奖金池", width: 100, slot: "prize" },
  { prop: "createdAt", label: "创建时间", width: 160, slot: "createdAt" },
];

const { loading, tableData, pagination, filters, fetchList, handleSearch, handleReset } = useTable({
  fetchApi: competitionApi.list,
  defaultPageSize: 20,
  transformResponse: (data: any) => ({
    items: data.data || [],
    total: data.total || 0,
  }),
});

function onPageChange() {
  fetchList();
}

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleString("zh-CN");
}

function formatPrize(v: number) {
  if (!v) return "-";
  return v >= 100 ? "¥" + (v / 100).toFixed(0) : v + "分";
}

async function handleDelete(id: string) {
  try {
    await ElMessageBox.confirm("确定删除该赛事？仅草稿状态可删除。", "提示", { type: "warning" });
    await competitionApi.delete(id);
    ElMessage.success("已删除");
    fetchList();
  } catch { /* cancelled */ }
}

async function handlePublish(id: string) {
  try {
    await competitionApi.publish(id);
    ElMessage.success("赛事已发布");
    fetchList();
  } catch { /* */ }
}

async function handleStart(id: string) {
  try {
    await competitionApi.start(id);
    ElMessage.success("赛事已开始");
    fetchList();
  } catch { /* */ }
}

async function handleFinish(id: string) {
  try {
    await ElMessageBox.confirm("确定结束该赛事？结束后不可恢复。", "提示", { type: "warning" });
    await competitionApi.finish(id);
    ElMessage.success("赛事已结束");
    fetchList();
  } catch { /* */ }
}

function exportData() {
  exportCSV(
    "赛事列表",
    [
      { label: "赛事名称", key: "title" }, { label: "类型", key: "typeLabel" },
      { label: "级别", key: "level" }, { label: "状态", key: "statusLabel" },
      { label: "报名数", key: "regCount" }, { label: "奖金池", key: "totalPrize" },
      { label: "创建时间", key: "createdAt" },
    ],
    tableData.value.map((c: any) => ({
      ...c,
      typeLabel: typeLabels[c.type] || c.type,
      statusLabel: statusLabels[c.status]?.text || c.status,
      regCount: c._count?.registrations || 0,
      createdAt: formatDate(c.createdAt),
    })),
  );
}
</script>

<template>
  <div class="competition-list">
    <DataTable
      v-model:page="pagination.page"
      v-model:page-size="pagination.pageSize"
      :columns="columns"
      :data="tableData"
      :loading="loading"
      :total="pagination.total"
      actions-width="280"
      @change="onPageChange"
    >
      <template #toolbar>
        <el-button
          type="primary"
          @click="router.push('/competitions/create')"
        >
          新建赛事
        </el-button>
        <el-button @click="exportData">
          导出CSV
        </el-button>
        <div style="display:flex;gap:10px;margin-left:auto">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索赛事名称..."
            clearable
            style="width:200px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
          <el-select
            v-model="filters.type"
            placeholder="赛事类型"
            clearable
            style="width:130px"
            @change="handleSearch"
          >
            <el-option
              v-for="(label, val) in typeLabels"
              :key="val"
              :label="label"
              :value="val"
            />
          </el-select>
          <el-select
            v-model="filters.status"
            placeholder="状态"
            clearable
            style="width:110px"
            @change="handleSearch"
          >
            <el-option
              label="草稿"
              value="DRAFT"
            />
            <el-option
              label="已发布"
              value="PUBLISHED"
            />
            <el-option
              label="进行中"
              value="IN_PROGRESS"
            />
            <el-option
              label="已结束"
              value="FINISHED"
            />
          </el-select>
          <el-select
            v-model="filters.level"
            placeholder="级别"
            clearable
            style="width:100px"
            @change="handleSearch"
          >
            <el-option
              label="S级"
              value="S"
            />
            <el-option
              label="A级"
              value="A"
            />
            <el-option
              label="B级"
              value="B"
            />
          </el-select>
        </div>
      </template>

      <template #type="{ row }">
        <span>{{ typeLabels[row.type] || row.type }}</span>
      </template>

      <template #level="{ row }">
        <el-tag
          v-if="row.level === 'S'"
          type="danger"
          size="small"
        >
          S级
        </el-tag>
        <el-tag
          v-else-if="row.level === 'A'"
          type="warning"
          size="small"
        >
          A级
        </el-tag>
        <el-tag
          v-else
          type="info"
          size="small"
        >
          B级
        </el-tag>
      </template>

      <template #scoringModel="{ row }">
        <span>{{ ({ A: "全自动", B: "AI+评委", C: "纯评委", D: "对弈引擎" } as Record<string, string>)[row.scoringModel] || row.scoringModel }}</span>
      </template>

      <template #status="{ row }">
        <el-tag
          :type="statusLabels[row.status]?.type || 'info'"
          size="small"
        >
          {{ statusLabels[row.status]?.text || row.status }}
        </el-tag>
      </template>

      <template #regCount="{ row }">
        {{ row._count?.registrations || 0 }}
      </template>

      <template #prize="{ row }">
        <span :style="{ color: row.totalPrize > 0 ? '#C41E3A' : '#999', fontWeight: row.totalPrize > 0 ? 'bold' : 'normal' }">
          {{ formatPrize(row.totalPrize) }}
        </span>
      </template>

      <template #createdAt="{ row }">
        {{ formatDate(row.createdAt) }}
      </template>

      <template #actions="{ row }">
        <el-button
          size="small"
          @click="router.push(`/competitions/${row.id}`)"
        >
          详情
        </el-button>
        <el-button
          size="small"
          @click="router.push(`/competitions/${row.id}/edit`)"
        >
          编辑
        </el-button>
        <el-button
          v-if="row.status === 'DRAFT'"
          size="small"
          type="success"
          @click="handlePublish(row.id)"
        >
          发布
        </el-button>
        <el-button
          v-if="row.status === 'PUBLISHED'"
          size="small"
          type="warning"
          @click="handleStart(row.id)"
        >
          开始
        </el-button>
        <el-button
          v-if="row.status === 'IN_PROGRESS'"
          size="small"
          type="danger"
          @click="handleFinish(row.id)"
        >
          结束
        </el-button>
        <el-button
          v-if="row.status === 'DRAFT'"
          size="small"
          type="danger"
          @click="handleDelete(row.id)"
        >
          删除
        </el-button>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.competition-list { padding: 16px; }
</style>
