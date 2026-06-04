<template>
  <div class="interest-page">
    <div class="page-header">
      <h3>用户兴趣品类分析</h3>
      <el-button
        size="small"
        @click="refresh"
      >
        刷新
      </el-button>
    </div>

    <!-- 概览 -->
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
            v-else
            description="暂无兴趣数据"
            :image-size="60"
          />
        </el-card>
      </el-col>

      <!-- 品类排行 -->
      <el-col :span="10">
        <el-card>
          <template #header>
            <span>品类排行</span>
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
              align="center"
            >
              <template #default="{ row }">
                {{ row.count?.toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column
              label="占比"
              width="75"
              align="center"
            >
              <template #default="{ row }">
                <span :style="{ color: row.percentage > 20 ? '#f56c6c' : row.percentage > 10 ? '#e6a23c' : '#67c23a' }">
                  {{ row.percentage }}%
                </span>
              </template>
            </el-table-column>
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
        />
        <el-table-column
          label="用户数"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            {{ row.userCount?.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column
          label="平均兴趣分"
          width="110"
          align="center"
        >
          <template #default="{ row }">
            <el-progress
              :percentage="Math.round((row.avgScore || 0) * 100)"
              :stroke-width="14"
              :color="row.avgScore >= 0.7 ? '#67c23a' : row.avgScore >= 0.4 ? '#e6a23c' : '#f56c6c'"
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
              兴趣覆盖率 {{ stats.coverageRate || 0 }}%，{{ stats.coverageRate >= 50 ? '用户兴趣标签覆盖良好' : '建议通过注册引导和活动提升用户兴趣标签填写率' }}
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="tip-card">
            <div class="tip-title">
              🎯 热门品类
            </div>
            <div class="tip-body">
              {{ stats.distribution?.slice(0, 3).map((d: any) => d.name).join('、') || '暂无' }} 是最受欢迎的品类，建议优先在这些品类投入内容和运营资源。
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
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from "vue";
import { api } from "@/api";
import * as echarts from "echarts";

const stats = reactive({
  totalUsers: 0, usersWithInterests: 0, coverageRate: 0,
  distribution: [] as Array<{ name: string; count: number; percentage: number }>,
  behaviorTags: [] as Array<{ tag: string; userCount: number; avgScore: number }>,
});

const pieChartRef = ref<HTMLElement | null>(null);
let pieChart: echarts.ECharts | null = null;

onMounted(() => refresh());

async function refresh() {
  try {
    const { data } = await api.get("/users/stats/interests");
    const d = data as any;
    if (d) Object.assign(stats, d);
    await nextTick();
    renderPie();
  } catch { /* ignore */ }
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
.page-header h3 { margin: 0; font-size: 18px; color: #8b4513; }
.stat-card { background: #f5f7fa; border-radius: 8px; padding: 14px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: #303133; }
.stat-card .label { display: block; font-size: 12px; color: #909399; margin-top: 2px; }
.stat-card.warn .value { color: #e6a23c; }
.stat-card.info .value { color: #409eff; }
.tip-card { background: #f5f7fa; border-radius: 8px; padding: 14px; }
.tip-title { font-size: 14px; font-weight: 600; margin-bottom: 6px; color: #303133; }
.tip-body { font-size: 12px; color: #606266; line-height: 1.6; }
</style>
