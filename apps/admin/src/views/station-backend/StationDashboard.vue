<template>
  <div class="page">
    <div class="page-header">
      <h3>分站权益中心</h3>
      <span class="subtitle">选择分站后查看其经营数据（平台代查视角）</span>
      <el-select
        v-model="selectedStationId"
        placeholder="选择要查看的分站"
        filterable
        style="width: 260px; margin-left: auto"
        :loading="stationsLoading"
        @change="load"
      >
        <el-option
          v-for="s in stationOptions"
          :key="s.id"
          :label="s.name + (s.code ? '（' + s.code + '）' : '')"
          :value="s.id"
        />
      </el-select>
    </div>

    <!-- 未选择分站 -->
    <el-empty
      v-if="!selectedStationId && !loadError"
      description="请先在右上角选择一个分站，查看其本月佣金、成交与资格状态"
    />

    <!-- 404/降级说明 -->
    <el-result
      v-else-if="unavailable"
      icon="warning"
      title="该分站数据不可用"
      sub-title="指定的分站不存在，或后端代查契约（?stationId=）尚未部署。请换一个分站或稍后重试。"
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
      title="分站数据加载失败"
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

    <template v-else-if="selectedStationId">
      <!-- 资格状态提醒 -->
      <el-alert
        v-if="overview.qualification && overview.qualification.expired"
        type="error"
        :closable="false"
        show-icon
        title="该分站加盟资格已失效，新订单不再产生佣金"
        style="margin-bottom:16px"
      />
      <el-alert
        v-else-if="overview.qualification && overview.qualification.expiringSoon"
        type="warning"
        :closable="false"
        show-icon
        :title="`该分站加盟资格将在 ${overview.qualification.daysLeft} 天后到期`"
        style="margin-bottom:16px"
      />

      <!-- 指标卡（字段对齐 /station/dashboard/overview 真实返回体） -->
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
              style="background:#f0f9eb"
            >
              <el-icon :size="24">
                <Coin />
              </el-icon>
            </div>
            <div class="stat-body">
              <div class="stat-value">
                ¥{{ fmt(overview.monthEarned) }}
              </div>
              <div class="stat-label">
                本月佣金
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
              style="background:#ecf5ff"
            >
              <el-icon :size="24">
                <DataAnalysis />
              </el-icon>
            </div>
            <div class="stat-body">
              <div class="stat-value">
                ¥{{ fmt(overview.monthAmount) }}
              </div>
              <div class="stat-label">
                本月成交额
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
                {{ overview.monthOrders ?? 0 }}
              </div>
              <div class="stat-label">
                本月佣金笔数
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
                <CircleCheck />
              </el-icon>
            </div>
            <div class="stat-body">
              <div class="stat-value">
                {{ overview.qualification?.expired ? '已失效' : '正常' }}
              </div>
              <div class="stat-label">
                加盟资格{{ overview.qualification?.daysLeft != null ? `（剩 ${overview.qualification.daysLeft} 天）` : '' }}
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 近30天佣金趋势（真数据·轻量条形，无占位文案） -->
      <el-card style="margin-top:20px">
        <template #header>
          <span>近30天佣金趋势</span>
        </template>
        <div
          v-if="trends.length"
          class="trend-bars"
        >
          <el-tooltip
            v-for="t in trends"
            :key="t.date"
            :content="`${t.date}：¥${fmt(t.earned)}`"
            placement="top"
          >
            <div class="trend-col">
              <div
                class="trend-bar"
                :style="{ height: Math.max((t.earned / maxTrend) * 100, 2) + '%' }"
              />
            </div>
          </el-tooltip>
        </div>
        <el-empty
          v-else
          description="近30天该分站暂无佣金记录"
          :image-size="60"
        />
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 分站权益中心（平台代查视角）
 * 2026-07-18 改造：原页面调自视角端点（admin 无分站恒 404）且渲染假字段
 * （merchantCount/activeUsers/apiCalls 后端从未返回）→ 接 ?stationId= 代查契约，
 * 字段对齐 /station/dashboard/overview 真实返回体，占位图表块删除改真数据趋势。
 */
import { ref, reactive, computed, onMounted } from "vue";
import { Coin, DataAnalysis, Tickets, CircleCheck } from "@element-plus/icons-vue";
import { api, stationApi } from "@/api";

const loading = ref(false);
const loadError = ref(false);
const unavailable = ref(false);

// ── 分站选择器 ──
interface StationOption { id: string; name?: string; code?: string }
const stationOptions = ref<StationOption[]>([]);
const stationsLoading = ref(false);
const selectedStationId = ref("");

async function fetchStations() {
  stationsLoading.value = true;
  try {
    const { data } = await stationApi.list({ page: 1, pageSize: 200 });
    stationOptions.value = data.stations || [];
    // 默认选中第一个分站，进页即有数据
    if (!selectedStationId.value && stationOptions.value.length) {
      selectedStationId.value = stationOptions.value[0].id;
      load();
    }
  } catch {
    stationOptions.value = [];
  } finally {
    stationsLoading.value = false;
  }
}

// ── 概览（对齐真实返回体） ──
interface Qualification { status?: string; daysLeft?: number | null; expired?: boolean; expiringSoon?: boolean }
const overview = reactive<{ monthEarned: number; monthAmount: number; monthOrders: number; qualification: Qualification | null }>({
  monthEarned: 0,
  monthAmount: 0,
  monthOrders: 0,
  qualification: null,
});

interface TrendPoint { date: string; earned: number }
const trends = ref<TrendPoint[]>([]);
const maxTrend = computed(() => Math.max(...trends.value.map((t) => t.earned), 0.01));

function fmt(v: number | undefined) { return Number(v || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

async function load() {
  if (!selectedStationId.value) return;
  loading.value = true;
  loadError.value = false;
  unavailable.value = false;
  try {
    const [ov, tr] = await Promise.all([
      api.get("/station/dashboard/overview", { params: { stationId: selectedStationId.value } }),
      api.get("/station/dashboard/trends", { params: { stationId: selectedStationId.value } }).catch(() => ({ data: { trends: [] } })),
    ]);
    overview.monthEarned = Number(ov.data?.monthEarned || 0);
    overview.monthAmount = Number(ov.data?.monthAmount || 0);
    overview.monthOrders = Number(ov.data?.monthOrders || 0);
    overview.qualification = ov.data?.qualification || null;
    trends.value = tr.data?.trends || [];
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 404 || status === 403) unavailable.value = true;
    else loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchStations);
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
.trend-bars { display: flex; align-items: flex-end; gap: 4px; height: 160px; padding: 8px 0; }
.trend-col { flex: 1; height: 100%; display: flex; align-items: flex-end; }
.trend-bar { width: 100%; background: var(--color-warning, #e6a23c); border-radius: 3px 3px 0 0; min-height: 2px; }
</style>
