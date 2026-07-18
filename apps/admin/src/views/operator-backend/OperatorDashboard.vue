<template>
  <div class="page">
    <div class="page-header">
      <h3>运营商权益中心</h3>
      <span class="subtitle">选择运营商后查看其团队数据（平台代查视角）</span>
      <el-select
        v-model="selectedOperatorId"
        placeholder="选择要查看的运营商"
        filterable
        style="width: 260px; margin-left: auto"
        :loading="operatorsLoading"
        @change="load"
      >
        <el-option
          v-for="o in operatorOptions"
          :key="o.id"
          :label="o.brandName || o.user?.nickname || o.id.slice(0, 8) + '…'"
          :value="o.id"
        />
      </el-select>
    </div>

    <!-- 未选择运营商 -->
    <el-empty
      v-if="!selectedOperatorId && !loadError"
      description="请先在右上角选择一个运营商，查看其团队佣金、站长与名额情况"
    />

    <!-- 404/降级说明 -->
    <el-result
      v-else-if="unavailable"
      icon="warning"
      title="该运营商数据不可用"
      sub-title="指定的运营商不存在，或后端代查契约（?operatorId=）尚未部署。请换一个运营商或稍后重试。"
    >
      <template #extra>
        <el-button
          type="primary"
          :loading="loading"
          @click="load"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-result
      v-else-if="loadError"
      icon="error"
      title="运营数据加载失败"
      sub-title="请检查网络后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          :loading="loading"
          @click="load"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <template v-else-if="selectedOperatorId">
      <!-- 指标卡（字段对齐 /station/operator-dashboard/overview 真实返回体） -->
      <el-row
        v-loading="loading"
        :gutter="16"
      >
        <el-col :span="6">
          <el-card
            class="stat-card"
            shadow="hover"
          >
            <div
              class="stat-icon"
              style="background:#ecf5ff"
            >
              <el-icon :size="24">
                <Monitor />
              </el-icon>
            </div>
            <div class="stat-body">
              <div class="stat-value">
                {{ overview.totalStations }}
              </div>
              <div class="stat-label">
                名下站长（活跃 {{ overview.activeStations }} / 沉默 {{ overview.silentStations }}）
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card
            class="stat-card"
            shadow="hover"
          >
            <div
              class="stat-icon"
              style="background:#f0f9eb"
            >
              <el-icon :size="24">
                <Coin />
              </el-icon>
            </div>
            <div class="stat-body">
              <div class="stat-value">
                ¥{{ fmt(overview.monthTeamEarned) }}
              </div>
              <div class="stat-label">
                本月团队佣金（成交 ¥{{ fmt(overview.monthTeamAmount) }}）
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card
            class="stat-card"
            shadow="hover"
          >
            <div
              class="stat-icon"
              style="background:#fdf6ec"
            >
              <el-icon :size="24">
                <Tickets />
              </el-icon>
            </div>
            <div class="stat-body">
              <div class="stat-value">
                {{ overview.monthTeamOrders }}
              </div>
              <div class="stat-label">
                本月团队订单数
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card
            class="stat-card"
            shadow="hover"
          >
            <div
              class="stat-icon"
              style="background:#f5f0e8"
            >
              <el-icon :size="24">
                <Odometer />
              </el-icon>
            </div>
            <div class="stat-body">
              <div class="stat-value">
                {{ overview.quotaUsed }} / {{ overview.quotaTotal }}
              </div>
              <div class="stat-label">
                站长名额（已用/总量）
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row
        :gutter="16"
        style="margin-top:20px"
      >
        <el-col :span="14">
          <el-card>
            <template #header>
              <span>名下站长业绩排行 Top10</span>
            </template>
            <el-table
              v-loading="loading"
              :data="ranking"
              size="small"
            >
              <el-table-column
                type="index"
                label="#"
                width="50"
              />
              <el-table-column
                prop="name"
                label="站长名称"
                min-width="140"
              />
              <el-table-column
                label="累计收益"
                width="140"
                align="right"
              >
                <template #default="{ row }">
                  ¥{{ fmt(row.totalEarning) }}
                </template>
              </el-table-column>
              <el-table-column
                label="状态"
                width="90"
              >
                <template #default="{ row }">
                  <el-tag
                    :type="row.status === 'ACTIVE' ? 'success' : 'info'"
                    size="small"
                  >
                    {{ row.status === 'ACTIVE' ? '活跃' : '沉默' }}
                  </el-tag>
                </template>
              </el-table-column>
              <template #empty>
                <el-empty description="该运营商名下暂无站长业绩数据" />
              </template>
            </el-table>
          </el-card>
        </el-col>
        <el-col :span="10">
          <el-card>
            <template #header>
              <span>团队健康度</span>
            </template>
            <div
              v-if="teamHealth"
              class="health-box"
            >
              <el-progress
                type="dashboard"
                :percentage="Math.min(Math.round(Number(teamHealth.score ?? 0)), 100)"
                :width="140"
              />
              <div
                v-if="teamHealth.level"
                class="health-level"
              >
                {{ teamHealth.level }}
              </div>
            </div>
            <el-empty
              v-else
              description="暂无健康度数据"
              :image-size="60"
            />
          </el-card>
        </el-col>
      </el-row>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 运营商权益中心（平台代查视角）
 * 2026-07-18 改造：原页面调自视角端点（admin 非运营商恒 403）且渲染假字段
 * （stationCount/totalRevenue/activeUsers/apiQuota/topStations 后端从未返回）
 * → 接 ?operatorId= 代查契约，字段对齐 overview/team-ranking 真实返回体，
 * "资源消耗概览"占位块删除。
 */
import { ref, reactive, onMounted } from "vue";
import { Coin, Monitor, Odometer, Tickets } from "@element-plus/icons-vue";
import { api, stationApi } from "@/api";

const loading = ref(false);
const loadError = ref(false);
const unavailable = ref(false);

// ── 运营商选择器 ──
interface OperatorOption { id: string; brandName?: string | null; user?: { nickname?: string } }
const operatorOptions = ref<OperatorOption[]>([]);
const operatorsLoading = ref(false);
const selectedOperatorId = ref("");

async function fetchOperators() {
  operatorsLoading.value = true;
  try {
    const { data } = await stationApi.operatorList({ page: 1, pageSize: 200 });
    operatorOptions.value = data.operators || [];
    if (!selectedOperatorId.value && operatorOptions.value.length) {
      selectedOperatorId.value = operatorOptions.value[0].id;
      load();
    }
  } catch {
    operatorOptions.value = [];
  } finally {
    operatorsLoading.value = false;
  }
}

// ── 概览（对齐真实返回体） ──
const overview = reactive({
  totalStations: 0,
  activeStations: 0,
  silentStations: 0,
  quotaUsed: 0,
  quotaTotal: 0,
  monthTeamEarned: 0,
  monthTeamAmount: 0,
  monthTeamOrders: 0,
});
interface TeamHealth { score?: number; level?: string }
const teamHealth = ref<TeamHealth | null>(null);

interface RankingRow { name?: string; totalEarning?: number; status?: string }
const ranking = ref<RankingRow[]>([]);

function fmt(v: number | undefined) { return Number(v || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

async function load() {
  if (!selectedOperatorId.value) return;
  loading.value = true;
  loadError.value = false;
  unavailable.value = false;
  try {
    const params = { operatorId: selectedOperatorId.value };
    const [ov, rk] = await Promise.all([
      api.get("/station/operator-dashboard/overview", { params }),
      api.get("/station/operator-dashboard/team-ranking", { params }).catch(() => ({ data: { ranking: [] } })),
    ]);
    overview.totalStations = ov.data?.totalStations || 0;
    overview.activeStations = ov.data?.activeStations || 0;
    overview.silentStations = ov.data?.silentStations || 0;
    overview.quotaUsed = ov.data?.quotaUsed || 0;
    overview.quotaTotal = ov.data?.quotaTotal || 0;
    overview.monthTeamEarned = Number(ov.data?.monthTeamEarned || 0);
    overview.monthTeamAmount = Number(ov.data?.monthTeamAmount || 0);
    overview.monthTeamOrders = ov.data?.monthTeamOrders || 0;
    teamHealth.value = ov.data?.teamHealth || null;
    ranking.value = rk.data?.ranking || [];
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 404 || status === 403) unavailable.value = true;
    else loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchOperators);
</script>

<style scoped>
.page { padding: 20px; }
.page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.page-header h3 { margin: 0; }
.subtitle { color: var(--color-text-secondary); font-size: 14px; }
.stat-card { display: flex; align-items: center; gap: 12px; padding: 16px; }
.stat-card :deep(.el-card__body) { display: flex; align-items: center; gap: 12px; padding: 0; width: 100%; }
.stat-icon { width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #8B4513; flex-shrink: 0; }
.stat-value { font-size: 22px; font-weight: bold; color: var(--color-text-title); }
.stat-label { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
.health-box { display: flex; flex-direction: column; align-items: center; padding: 12px 0; }
.health-level { margin-top: 8px; font-size: 14px; color: var(--color-text-secondary); }
</style>
