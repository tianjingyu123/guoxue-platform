<template>
  <div class="interest-page">
    <div class="page-header">
      <h3>用户兴趣品类分析</h3>
      <el-button
        size="small"
        :loading="loading"
        @click="refresh"
      >
        刷新
      </el-button>
    </div>

    <!-- 错误态：给重试，不吞错 -->
    <el-result
      v-if="error && !loading"
      icon="error"
      title="兴趣数据加载失败"
      sub-title="请检查网络后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="refresh"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <div
      v-else
      v-loading="loading"
      class="content"
    >
      <!-- 概览：与下方品类分布同源（同一端点 /users/stats/interests 一次返回） -->
      <el-row
        :gutter="16"
        style="margin-bottom:16px"
      >
        <el-col :span="6">
          <div class="stat-card">
            <span class="value">{{ stats.totalUsers?.toLocaleString() || 0 }}</span><span class="label">活跃用户总数</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card info">
            <span class="value">{{ stats.usersWithInterests?.toLocaleString() || 0 }}</span><span class="label">有兴趣标签用户</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <span class="value">{{ stats.coverageRate || 0 }}%</span><span class="label">兴趣覆盖率</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card warn">
            <span class="value">{{ stats.distribution?.length || 0 }}</span><span class="label">涉及品类数</span>
          </div>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <!-- 品类分布 -->
        <el-col :span="14">
          <el-card>
            <template #header>
              <span>兴趣品类分布</span>
            </template>
            <div
              v-if="stats.distribution?.length"
              ref="pieChartRef"
              style="height:380px"
            />
            <el-empty
              v-else-if="!loading"
              description="暂无兴趣数据，可通过注册引导让用户选择兴趣品类"
              :image-size="60"
            />
          </el-card>
        </el-col>

        <!-- 品类排行 -->
        <el-col :span="10">
          <el-card>
            <template #header>
              <span>品类排行</span>
              <!-- 口径说明：占比与顶部卡同源同分母；用户可多选兴趣，占比合计可超100% -->
              <el-tooltip
                content="占比 = 该品类用户数 ÷ 活跃用户总数（与顶部卡同源）。一个用户可选多个兴趣品类，各品类占比合计可能超过100%。"
                placement="top"
              >
                <span class="caliber-note">占比口径?</span>
              </el-tooltip>
            </template>
            <el-table
              :data="stats.distribution || []"
              stripe
              size="small"
              max-height="380"
            >
              <el-table-column
                type="index"
                label="#"
                width="45"
              />
              <el-table-column
                prop="name"
                label="品类"
                min-width="100"
              />
              <el-table-column
                label="用户数"
                width="80"
                align="right"
              >
                <template #default="{ row }">
                  {{ row.count?.toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column
                label="占比"
                width="75"
                align="right"
              >
                <template #default="{ row }">
                  <span :style="{ color: row.percentage > 20 ? '#f56c6c' : row.percentage > 10 ? '#e6a23c' : '#67c23a' }">
                    {{ row.percentage }}%
                  </span>
                </template>
              </el-table-column>
              <template #empty>
                <el-empty
                  v-if="!loading"
                  description="暂无品类数据"
                  :image-size="60"
                />
              </template>
            </el-table>
          </el-card>
        </el-col>
      </el-row>

      <!-- 行为兴趣标签 -->
      <el-card
        v-if="stats.behaviorTags?.length"
        style="margin-top:16px"
      >
        <template #header>
          <span>行为兴趣标签 TOP30</span>
          <el-tooltip
            content="兴趣分是行为权重累计值（浏览/点赞/购买等加权求和），不是百分比。进度条按本榜最高分归一，仅示相对强弱。"
            placement="top"
          >
            <span class="caliber-note">兴趣分口径?</span>
          </el-tooltip>
        </template>
        <el-table
          :data="stats.behaviorTags"
          stripe
          size="small"
          max-height="350"
        >
          <el-table-column
            type="index"
            label="#"
            width="45"
          />
          <el-table-column
            prop="tag"
            label="标签"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column
            label="用户数"
            width="100"
            align="right"
          >
            <template #default="{ row }">
              {{ row.userCount?.toLocaleString() }}
            </template>
          </el-table-column>
          <el-table-column
            label="平均兴趣分"
            width="180"
            align="center"
          >
            <template #default="{ row }">
              <!-- 兴趣分为累计权重（可>1），按榜内最高分归一画条，文字显示真实数值，杜绝 300% -->
              <el-progress
                :percentage="scoreBarPercent(row.avgScore)"
                :stroke-width="14"
                :format="() => (row.avgScore ?? 0).toFixed(2) + ' 分'"
                :color="scoreBarColor(row.avgScore)"
              />
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 个性化推荐建议 -->
      <el-card style="margin-top:16px">
        <template #header>
          <span>运营建议</span>
        </template>
        <el-row :gutter="16">
          <el-col :span="8">
            <div class="tip-card">
              <div class="tip-title">
                📊 品类覆盖
              </div>
              <div class="tip-body">
                兴趣覆盖率 {{ stats.coverageRate || 0 }}%，{{ (stats.coverageRate || 0) >= 50 ? '用户兴趣标签覆盖良好' : '建议通过注册引导和活动提升用户兴趣标签填写率' }}
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="tip-card">
              <div class="tip-title">
                🎯 热门品类
              </div>
              <div class="tip-body">
                <template v-if="topCategories">
                  {{ topCategories }} 是最受欢迎的品类，建议优先在这些品类投入内容和运营资源。
                </template>
                <template v-else>
                  暂无品类数据，先引导用户填写兴趣标签，再回来看热门品类。
                </template>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="tip-card">
              <div class="tip-title">
                💡 个性化推荐
              </div>
              <div class="tip-body">
                基于用户兴趣标签可实现个性化内容推荐、首页定制、推送分群。建议开启AI推荐引擎。
              </div>
            </div>
          </el-col>
        </el-row>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { api } from "@/api";
import echarts from "@/utils/echarts";
import type { EChartsType } from "echarts/core";

const stats = reactive({
  totalUsers: 0, usersWithInterests: 0, coverageRate: 0,
  distribution: [] as Array<{ name: string; count: number; percentage: number }>,
  behaviorTags: [] as Array<{ tag: string; userCount: number; avgScore: number }>,
});

const loading = ref(false);
const error = ref(false);
const pieChartRef = ref<HTMLElement | null>(null);
let pieChart: EChartsType | null = null;

/** 前三热门品类文案；无数据返回空串（模板走"暂无"分支，杜绝"暂无 是最受欢迎"拼接病句） */
const topCategories = computed(() => {
  const top = (stats.distribution || []).slice(0, 3).map((d) => d.name).filter(Boolean);
  return top.length ? top.join("、") : "";
});

/** 兴趣分 = 行为权重累计值（非 0-1 百分比，user-interest.task.ts 累加 interaction.weight），按榜内最高分归一 */
const maxAvgScore = computed(() => {
  const scores = (stats.behaviorTags || []).map((t) => t.avgScore || 0);
  return scores.length ? Math.max(...scores) : 0;
});

function scoreBarPercent(avgScore?: number): number {
  if (!maxAvgScore.value) return 0;
  return Math.min(100, Math.round(((avgScore || 0) / maxAvgScore.value) * 100));
}

function scoreBarColor(avgScore?: number): string {
  const p = scoreBarPercent(avgScore);
  return p >= 70 ? "#67c23a" : p >= 40 ? "#e6a23c" : "#f56c6c";
}

onMounted(() => {
  refresh();
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  if (pieChart) { pieChart.dispose(); pieChart = null; }
});

function handleResize() {
  pieChart?.resize();
}

async function refresh() {
  loading.value = true;
  error.value = false;
  try {
    const { data } = await api.get("/users/stats/interests");
    const d = data as any;
    if (d) Object.assign(stats, d);
    await nextTick();
    renderPie();
  } catch {
    error.value = true;
    ElMessage.error("兴趣数据加载失败，请重试");
  } finally {
    loading.value = false;
  }
}

function renderPie() {
  if (!pieChartRef.value || !stats.distribution.length) return;
  if (pieChart) pieChart.dispose();
  pieChart = echarts.init(pieChartRef.value);

  const pieData = stats.distribution.map((d) => ({
    name: d.name,
    value: d.count,
  }));

  pieChart.setOption({
    tooltip: { trigger: "item", formatter: "{b}: {c}人 ({d}%)" },
    legend: { type: "scroll", bottom: 0, textStyle: { fontSize: 11 } },
    series: [{
      type: "pie",
      radius: ["45%", "75%"],
      center: ["50%", "45%"],
      data: pieData,
      label: { fontSize: 10, formatter: "{b}\n{d}%" },
      emphasis: { label: { fontSize: 16, fontWeight: "bold" } },
    }],
  });
}
</script>

<style scoped>
.interest-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.caliber-note {
  margin-left: 8px; font-size: 12px; color: var(--el-text-color-secondary);
  border-bottom: 1px dashed var(--el-text-color-secondary); cursor: help;
}
.stat-card { background: #f5f7fa; border-radius: 8px; padding: 14px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: #303133; }
.stat-card .label { display: block; font-size: 12px; color: #909399; margin-top: 2px; }
.stat-card.warn .value { color: #e6a23c; }
.stat-card.info .value { color: #409eff; }
.tip-card { background: #f5f7fa; border-radius: 8px; padding: 14px; }
.tip-title { font-size: 14px; font-weight: 600; margin-bottom: 6px; color: #303133; }
.tip-body { font-size: 12px; color: #606266; line-height: 1.6; }
</style>
