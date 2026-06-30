<template>
  <div class="operation-engine">
    <div class="page-header">
      <h2>运营引擎</h2>
      <span class="subtitle">自动化内容运营策略控制中心</span>
    </div>

    <!-- 错误态 -->
    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="运营数据加载失败"
      style="margin-bottom:16px"
    >
      <el-button
        size="small"
        type="primary"
        @click="refresh"
      >
        重试
      </el-button>
    </el-alert>

    <!-- 运营概览 -->
    <el-row
      v-loading="loading"
      :gutter="16"
      class="stats-row"
    >
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ overview.totalContent }}</span><span class="label">已发布内容</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ overview.totalUsers }}</span><span class="label">活跃用户</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ overview.totalCircles }}</span><span class="label">活跃圈子</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ overview.recentContent }}</span><span class="label">近7日新增内容</span>
        </div>
      </el-col>
    </el-row>

    <!-- 快捷操作 -->
    <el-card class="section-card">
      <template #header>
        <h3>快捷操作</h3>
      </template>
      <el-row :gutter="12">
        <el-col :span="6">
          <el-button
            type="primary"
            :loading="rotating"
            style="width:100%; height:80px"
            @click="rotateContent"
          >
            <div>
              <el-icon style="font-size:20px">
                <RefreshRight />
              </el-icon>
              <div style="margin-top:4px">
                首页内容轮换
              </div>
            </div>
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button
            type="warning"
            :loading="detecting"
            style="width:100%; height:80px"
            @click="detectEmpty"
          >
            <div>
              <el-icon style="font-size:20px">
                <Search />
              </el-icon>
              <div style="margin-top:4px">
                空板块检测
              </div>
            </div>
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button
            type="success"
            :loading="generating"
            style="width:100%; height:80px"
            @click="generateBrief"
          >
            <div>
              <el-icon style="font-size:20px">
                <DocumentCopy />
              </el-icon>
              <div style="margin-top:4px">
                生成运营周报
              </div>
            </div>
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button
            style="width:100%; height:80px"
            @click="refresh"
          >
            <div>
              <el-icon style="font-size:20px">
                <Refresh />
              </el-icon>
              <div style="margin-top:4px">
                刷新数据
              </div>
            </div>
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 运营周报 -->
    <el-card
      v-if="weeklyBrief"
      class="section-card"
    >
      <template #header>
        <h3>📊 最新运营周报</h3>
      </template>
      <el-descriptions
        :column="3"
        border
        size="small"
      >
        <el-descriptions-item label="统计周期">
          {{ weeklyBrief.period }}
        </el-descriptions-item>
        <el-descriptions-item label="新增内容">
          {{ weeklyBrief.newContent }} 篇
        </el-descriptions-item>
        <el-descriptions-item label="新增用户">
          {{ weeklyBrief.newUsers }} 人
        </el-descriptions-item>
        <el-descriptions-item label="总点赞数">
          {{ weeklyBrief.totalLikes }}
        </el-descriptions-item>
        <el-descriptions-item label="总浏览量">
          {{ weeklyBrief.totalViews }}
        </el-descriptions-item>
        <el-descriptions-item label="生成时间">
          {{ formatDate(weeklyBrief.generatedAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 今日推荐池 -->
    <el-card class="section-card">
      <template #header>
        <h3>📌 今日首页推荐池</h3>
      </template>
      <div v-if="hotPool?.contentIds?.length">
        <el-tag
          v-for="id in hotPool.contentIds.slice(0, 20)"
          :key="id"
          style="margin:4px"
          size="small"
        >
          {{ id }}
        </el-tag>
        <div
          style="margin-top:8px"
          class="text-muted"
        >
          共 {{ hotPool.contentIds.length }} 条，更新于 {{ formatDate(hotPool.updatedAt) }}
        </div>
      </div>
      <div
        v-else
        class="text-muted"
      >
        暂无推荐池数据，请先执行"首页内容轮换"
      </div>
    </el-card>

    <!-- 空板块告警 -->
    <el-card
      v-if="emptyAlerts?.categories?.length"
      class="section-card"
    >
      <template #header>
        <h3>⚠️ 内容不足的品类（少于3篇）</h3>
      </template>
      <el-table
        :data="emptyAlerts.categories"
        size="small"
      >
        <el-table-column
          prop="level1"
          label="一级分类"
        />
        <el-table-column
          prop="level2"
          label="二级分类"
        />
        <el-table-column
          prop="count"
          label="当前内容数"
          width="120"
        />
      </el-table>
      <div
        style="margin-top:8px"
        class="text-muted"
      >
        检测时间：{{ formatDate(emptyAlerts.updatedAt) }}
      </div>
    </el-card>

    <!-- 关联推荐查询 -->
    <el-card class="section-card">
      <template #header>
        <h3>🔗 关联推荐查询</h3>
      </template>
      <div style="display:flex; gap:10px; margin-bottom:16px">
        <el-input
          v-model="relateL1"
          placeholder="一级分类（必填）"
          style="width:200px"
        />
        <el-input
          v-model="relateL2"
          placeholder="二级分类（选填）"
          style="width:200px"
        />
        <el-button
          type="primary"
          @click="fetchRelated"
        >
          查询
        </el-button>
      </div>
      <el-table
        v-if="relatedResult"
        :data="relatedResult.recommendations"
        size="small"
      >
        <el-table-column
          prop="title"
          label="标题"
          show-overflow-tooltip
        />
        <el-table-column
          prop="categoryLevel2"
          label="二级分类"
          width="120"
        />
        <el-table-column
          prop="viewCount"
          label="浏览量"
          width="100"
        />
        <el-table-column
          prop="likeCount"
          label="点赞"
          width="80"
        />
      </el-table>
      <div
        v-if="relatedResult"
        class="text-muted"
        style="margin-top:8px"
      >
        共 {{ relatedResult.total }} 条结果
      </div>
    </el-card>

    <!-- 个性化推荐调试 -->
    <el-card class="section-card">
      <template #header>
        <h3>🎯 个性化推荐调试（输入用户ID查看）</h3>
      </template>
      <div style="display:flex; gap:10px; margin-bottom:16px">
        <el-input
          v-model="personalUserId"
          placeholder="用户ID"
          style="width:300px"
        />
        <el-button
          type="primary"
          @click="fetchPersonal"
        >
          查询
        </el-button>
      </div>
      <div v-if="personalResult">
        <div
          class="text-muted"
          style="margin-bottom:8px"
        >
          用户兴趣品类：{{ (personalResult.interests || []).join('、') || '无' }}
        </div>
        <div
          v-for="cat in personalResult.results"
          :key="cat.category"
          style="margin-bottom:12px"
        >
          <el-tag>{{ cat.category }}</el-tag>
          <span
            v-for="item in cat.items"
            :key="item.id"
            style="margin-left:8px; font-size:13px"
          >{{ item.title }} ({{ item.likeCount }}👍)</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { api } from "@/api";

function formatDate(d: string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleString("zh-CN", { hour12: false });
}

const overview = reactive({ totalContent: 0, totalUsers: 0, totalCircles: 0, recentContent: 0 });

const loading = ref(false);
const loadError = ref(false);

// 快捷操作状态
const rotating = ref(false);
const detecting = ref(false);
const generating = ref(false);

// 周报
const weeklyBrief = ref<any>(null);

// 推荐池
const hotPool = ref<any>(null);

// 空板块
const emptyAlerts = ref<any>(null);

// 关联推荐
const relateL1 = ref("");
const relateL2 = ref("");
const relatedResult = ref<any>(null);

// 个性化推荐
const personalUserId = ref("");
const personalResult = ref<any>(null);

async function fetchOverview() {
  const { data } = await api.get("/operation-engine/overview");
  Object.assign(overview, data);
}

async function loadConfig(key: string) {
  try {
    const { data } = await api.get("/system/configs");
    const config = (data as any[])?.find((c: any) => c.configKey === key);
    if (config?.configValue) {
      try { return JSON.parse(config.configValue); } catch { return config.configValue; }
    }
  } catch { /* ignore */ }
  return null;
}

async function refresh() {
  loading.value = true;
  loadError.value = false;
  try {
    await fetchOverview();
    weeklyBrief.value = await loadConfig("weekly_operation_brief");
    hotPool.value = await loadConfig("homepage_recommendations");
    emptyAlerts.value = await loadConfig("empty_category_alerts");
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

async function rotateContent() {
  rotating.value = true;
  try {
    const { data } = await api.post("/operation-engine/rotate");
    ElMessage.success((data as any)?.message || "首页内容轮换已完成");
    await refresh();
  } finally { rotating.value = false; }
}

async function detectEmpty() {
  detecting.value = true;
  try {
    const { data } = await api.post("/operation-engine/detect-empty");
    ElMessage.success((data as any)?.message || "空板块检测已完成");
    await refresh();
  } finally { detecting.value = false; }
}

async function generateBrief() {
  generating.value = true;
  try {
    const { data } = await api.post("/operation-engine/brief");
    weeklyBrief.value = data;
    ElMessage.success("运营周报已生成");
  } finally { generating.value = false; }
}

async function fetchRelated() {
  if (!relateL1.value.trim()) return ElMessage.warning("请输入一级分类");
  try {
    const { data } = await api.get("/operation-engine/recommendations/related", {
      params: { categoryLevel1: relateL1.value, categoryLevel2: relateL2.value || undefined },
    });
    relatedResult.value = data;
  } catch { ElMessage.error("查询失败，请稍后重试"); }
}

async function fetchPersonal() {
  if (!personalUserId.value.trim()) return ElMessage.warning("请输入用户ID");
  try {
    const { data } = await api.get("/operation-engine/recommendations/personalized", {
      params: { userId: personalUserId.value },
    });
    personalResult.value = data;
  } catch { ElMessage.error("查询失败，请稍后重试"); }
}

onMounted(() => refresh());
</script>

<style scoped>
.operation-engine { padding: 0; }
.page-header { margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 20px; }
.subtitle { color: var(--color-text-secondary); font-size: 14px; }

.stats-row { margin-bottom: 16px; }
.stat-card { background: var(--color-bg-page); border-radius: 8px; padding: 16px; text-align: center; }
.stat-card .value { display: block; font-size: 28px; font-weight: 700; color: var(--color-text-title); }
.stat-card .label { display: block; font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; }

.section-card { margin-bottom: 16px; }

.text-muted { color: var(--color-text-secondary); font-size: 13px; }
</style>
