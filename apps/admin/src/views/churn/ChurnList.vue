<template>
  <div class="page">
    <div class="header">
      <h2>流失预测</h2>
      <el-button
        type="primary"
        :loading="scoring"
        @click="handleScore"
      >
        {{ scoring ? '评分中...' : '执行评分' }}
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <el-row
      :gutter="16"
      class="stats-row"
    >
      <el-col :span="6">
        <el-card
          shadow="hover"
          class="stat-card stat-low"
        >
          <div class="stat-label">
            低风险
          </div>
          <div class="stat-value">
            {{ stats.LOW || 0 }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card
          shadow="hover"
          class="stat-card stat-medium"
        >
          <div class="stat-label">
            中风险
          </div>
          <div class="stat-value">
            {{ stats.MEDIUM || 0 }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card
          shadow="hover"
          class="stat-card stat-high"
        >
          <div class="stat-label">
            高风险
          </div>
          <div class="stat-value">
            {{ stats.HIGH || 0 }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card
          shadow="hover"
          class="stat-card stat-critical"
        >
          <div class="stat-label">
            严重风险
          </div>
          <div class="stat-value">
            {{ stats.CRITICAL || 0 }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-form
      :inline="true"
      class="search-bar"
    >
      <el-form-item label="风险等级">
        <el-select
          v-model="filterRiskLevel"
          placeholder="全部"
          clearable
        >
          <el-option
            label="低风险"
            value="LOW"
          />
          <el-option
            label="中风险"
            value="MEDIUM"
          />
          <el-option
            label="高风险"
            value="HIGH"
          />
          <el-option
            label="严重风险"
            value="CRITICAL"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="page = 1; fetchList()"
        >
          搜索
        </el-button>
      </el-form-item>
    </el-form>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      title="加载流失预测列表失败"
      class="error-bar"
    >
      <el-button
        size="small"
        @click="fetchList"
      >
        重试
      </el-button>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <el-table-column
        label="用户ID"
        width="220"
      >
        <template #default="{ row }">
          <template v-if="row.userId">
            <el-link
              type="primary"
              :title="`${row.userId}（点击查看用户详情）`"
              @click="gotoUser(row.userId)"
            >
              {{ shortId(row.userId) }}
            </el-link>
            <el-button
              link
              size="small"
              type="primary"
              style="margin-left:4px"
              @click.stop="copyText(row.userId)"
            >
              复制
            </el-button>
            <el-tag
              v-if="isDemo(row.userId)"
              size="small"
              type="info"
              style="margin-left:4px"
            >
              测试数据
            </el-tag>
          </template>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="activityScore"
        label="活跃度评分"
        width="120"
        sortable
      />
      <el-table-column
        prop="riskLevel"
        label="风险等级"
        width="110"
      >
        <template #default="{ row }">
          <el-tag :type="riskTag(row.riskLevel)">
            {{ riskLabel(row.riskLevel) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="daysSinceActive"
        label="未活跃天数"
        width="120"
        sortable
      />
      <el-table-column
        label="流失因素"
        min-width="220"
      >
        <template #default="{ row }">
          <template v-if="factorList(row).length">
            <el-tag
              v-for="f in factorList(row)"
              :key="f"
              size="small"
              type="warning"
              style="margin:2px 4px 2px 0"
            >
              {{ f }}
            </el-tag>
          </template>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column
        label="预测时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.predictedAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="110"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            v-if="row.riskLevel === 'HIGH' || row.riskLevel === 'CRITICAL'"
            size="small"
            type="warning"
            title="挽回动作由流失规则自动触发，点击去配置规则"
            @click="goRetention"
          >
            发送挽回
          </el-button>
          <span v-else>—</span>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";
import { churnApi } from "@/api";

const router = useRouter();

// 流失预测行（按列配置与模板访问字段定义的宽松本地类型）
// churnFactors 后端为字符串数组（churn.service.ts:67-77），兼容字符串兜底
interface ChurnRow {
  userId?: string;
  activityScore?: number;
  riskLevel: string;
  daysSinceActive?: number;
  churnFactors?: string[] | string;
  predictedAt?: string;
}

const loading = ref(false);
const error = ref(false);
const scoring = ref(false);
const list = ref<ChurnRow[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterRiskLevel = ref("");
const stats = ref({ LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 });

function riskTag(level: string) {
  const map: Record<string, string> = { LOW: "success", MEDIUM: "warning", HIGH: "danger", CRITICAL: "danger" };
  return map[level] || "info";
}

function riskLabel(level: string) {
  const map: Record<string, string> = { LOW: "低风险", MEDIUM: "中风险", HIGH: "高风险", CRITICAL: "严重风险" };
  return map[level] || level;
}

// 流失因素词表（与后端 churn.service.ts 评分逻辑产出的枚举对齐）
const FACTOR_MAP: Record<string, string> = {
  LONG_INACTIVE: "长期未活跃（>7天）",
  VERY_LONG_INACTIVE: "超长未活跃（>14天）",
  SILENT_USER: "沉默用户（>30天）",
  LOW_ENGAGEMENT: "低参与度",
  ALMOST_GONE: "濒临流失",
};

function factorList(row: ChurnRow): string[] {
  const raw = row.churnFactors;
  const arr = Array.isArray(raw) ? raw : typeof raw === "string" && raw ? raw.split(",") : [];
  return arr.map((f) => FACTOR_MAP[f.trim()] || f.trim());
}

function formatDate(d?: string) {
  return d ? new Date(d).toLocaleString() : "-";
}

// 长ID截断显示（悬浮看全文，点击可跳/复制）
function shortId(id?: string): string {
  if (!id) return "-";
  return id.length > 10 ? id.slice(0, 8) + "…" : id;
}

// 演示种子账号标识（comp-demo-* 为赛事演示数据）
function isDemo(id?: string): boolean {
  return !!id && id.startsWith("comp-demo");
}

async function copyText(text?: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    ElMessage.error("复制失败");
  }
}

function gotoUser(id?: string) {
  if (id) router.push(`/users/${id}`);
}

// 挽回闭环的诚实引导：挽回动作由「流失规则」驱动，此处引导去配置规则
function goRetention() {
  ElMessage.info("挽回动作由流失规则自动触发：请配置对应风险等级的挽回规则（短信/优惠券），执行评分后系统自动下发");
  router.push("/churn/rules");
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: { riskLevel?: string; page?: number; pageSize?: number } = { page: page.value, pageSize: pageSize.value };
    if (filterRiskLevel.value) params.riskLevel = filterRiskLevel.value;
    const res = await churnApi.getPredictions(params);
    // 后端返回 { predictions, total, page, pageSize }（非标准分页键，拦截器不解包）
    list.value = res.data.predictions ?? res.data.items ?? res.data ?? [];
    total.value = res.data.total ?? 0;
  } catch {
    error.value = true;
    ElMessage.error("获取流失预测列表失败");
  } finally {
    loading.value = false;
  }
}

async function fetchStats() {
  try {
    const res = await churnApi.getStats();
    // 后端返回小写键 { low, medium, high, critical }
    const d = res.data || {};
    stats.value = {
      LOW: d.low ?? 0,
      MEDIUM: d.medium ?? 0,
      HIGH: d.high ?? 0,
      CRITICAL: d.critical ?? 0,
    };
  } catch {
    ElMessage.error("获取流失统计失败");
  }
}

async function handleScore() {
  if (scoring.value) return;
  // L3：全量评分会重算所有用户风险并按启用规则自动触发挽回动作，确认框写明影响
  try {
    await ElMessageBox.confirm(
      "将对全量用户重新计算流失评分，并按已启用的流失规则自动触发挽回动作（短信/优惠券）。确认执行？",
      "执行评分确认",
      { type: "warning", confirmButtonText: "确认执行", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  scoring.value = true;
  try {
    await churnApi.calculate();
    ElMessage.success("评分完成");
    fetchList();
    fetchStats();
  } catch {
    ElMessage.error("评分执行失败");
  } finally {
    scoring.value = false;
  }
}

onMounted(() => {
  fetchList();
  fetchStats();
});
</script>

<style scoped>
.page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.search-bar { margin-bottom: 20px; }
.error-bar { margin-bottom: 12px; }
.stats-row { margin-bottom: 20px; }
.stat-card { text-align: center; }
.stat-label { font-size: 14px; color: var(--color-text-secondary); margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: bold; }
.stat-low .stat-value { color: #67c23a; }
.stat-medium .stat-value { color: #e6a23c; }
.stat-high .stat-value { color: #f56c6c; }
.stat-critical .stat-value { color: #b71c1c; }
</style>
