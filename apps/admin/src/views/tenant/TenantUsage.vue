<template>
  <div class="page">
    <div class="header">
      <h2>租户使用统计 - {{ tenantName }}</h2>
      <el-button @click="$router.back()">
        返回
      </el-button>
    </div>

    <el-form
      :inline="true"
      class="search-bar"
    >
      <el-form-item label="统计周期">
        <el-select
          v-model="days"
          style="width: 140px"
          @change="fetchData"
        >
          <el-option
            label="近 7 天"
            :value="7"
          />
          <el-option
            label="近 30 天"
            :value="30"
          />
          <el-option
            label="近 90 天"
            :value="90"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="fetchData"
        >
          刷新
        </el-button>
      </el-form-item>
    </el-form>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      title="加载使用统计失败"
      class="error-bar"
    >
      <el-button
        size="small"
        @click="fetchData"
      >
        重试
      </el-button>
    </el-alert>

    <!-- 汇总卡片 -->
    <el-row
      :gutter="16"
      class="stats-row"
    >
      <el-col :span="8">
        <el-card
          shadow="hover"
          class="stat-card"
        >
          <div class="stat-label">
            总调用次数
          </div>
          <div class="stat-value">
            {{ totalCalls }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card
          shadow="hover"
          class="stat-card"
        >
          <div class="stat-label">
            统计天数
          </div>
          <div class="stat-value">
            {{ days }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card
          shadow="hover"
          class="stat-card"
        >
          <div class="stat-label">
            API 类型数
          </div>
          <div class="stat-value">
            {{ list.length }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 按 API 类型聚合 -->
    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <el-table-column
        prop="apiType"
        label="API 类型"
        min-width="180"
      />
      <el-table-column
        prop="count"
        label="调用次数"
        width="140"
        sortable
      />
      <el-table-column
        prop="cost"
        label="配额消耗"
        width="140"
        sortable
      />
      <el-table-column
        prop="tokensUsed"
        label="Token 消耗"
        width="140"
        sortable
      />
      <template #empty>
        <el-empty description="所选周期内暂无调用记录" />
      </template>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { tenantAdminApi } from "@/api";
import { useRoute } from "vue-router";

const route = useRoute();
const tenantId = route.params.id as string;

const tenantName = ref("");
const loading = ref(false);
const error = ref(false);
const list = ref<Array<{ apiType: string; count: number; cost: number; tokensUsed: number }>>([]);
const totalCalls = ref(0);
const days = ref(30);

async function fetchData() {
  loading.value = true;
  error.value = false;
  try {
    // 后端 getUsageStats 返回聚合结构 { calls, byType:[{apiType,_count,_sum:{cost,tokensUsed}}], days }
    const res = await tenantAdminApi.getUsage(tenantId, { days: days.value } as any);
    const data = res.data || {};
    totalCalls.value = data.calls ?? 0;
    const byType = Array.isArray(data.byType) ? data.byType : [];
    // 后端聚合结构：_count 可能是数字或 { _all }，_sum 含 cost/tokensUsed
    interface ByTypeRow { apiType: string; _count?: number | { _all?: number }; _sum?: { cost?: number; tokensUsed?: number } }
    list.value = byType.map((r: ByTypeRow) => ({
      apiType: r.apiType,
      count: typeof r._count === "number" ? r._count : (r._count?._all ?? 0),
      cost: r._sum?.cost ?? 0,
      tokensUsed: r._sum?.tokensUsed ?? 0,
    }));
  } catch {
    error.value = true;
    ElMessage.error("获取使用统计失败");
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    const res = await tenantAdminApi.detail(tenantId);
    tenantName.value = res.data?.name || "";
  } catch {
    // 名称获取失败不影响主统计
  }
  fetchData();
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
</style>
