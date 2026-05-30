<template>
  <div class="bigscreen platform">
    <header class="bs-header">
      <div class="bs-title">国学传统文化综合平台 · 实时数据大屏</div>
      <div class="bs-time">{{ nowStr }}</div>
    </header>

    <div class="bs-body">
      <!-- 核心数字 -->
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">累计用户</div>
          <div class="stat-value blue">{{ fmt(data.totalUsers) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">今日新增</div>
          <div class="stat-value green">{{ fmt(data.todayNewUsers) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">当前在线</div>
          <div class="stat-value orange">{{ fmt(data.dailyActiveUsers) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">课程总数</div>
          <div class="stat-value cyan">{{ fmt(data.totalCourses) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">圈子总数</div>
          <div class="stat-value purple">{{ fmt(data.totalCircles) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">商品总数</div>
          <div class="stat-value blue">{{ fmt(data.totalProducts) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">古籍总数</div>
          <div class="stat-value green">{{ fmt(data.totalClassicBooks) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">文章总数</div>
          <div class="stat-value orange">{{ fmt(data.totalArticles) }}</div>
        </div>
        <div class="stat-card accent">
          <div class="stat-label">累计交易额</div>
          <div class="stat-value gold">¥{{ (data.totalGmv || 0).toLocaleString() }}</div>
        </div>
      </div>
    </div>

    <footer class="bs-footer">
      <span>数据更新时间：{{ data.updatedAt ? new Date(data.updatedAt).toLocaleString('zh-CN') : '--' }}</span>
      <span class="watermark">热卜国学 · 数据大屏 · {{ nowStr.slice(0, 10) }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { bigscreenApi } from "@/api";

const route = useRoute();
const data = ref<Record<string, any>>({});
const nowStr = ref(new Date().toLocaleString("zh-CN"));

let timer: any = null;
let clockTimer: any = null;

function fmt(v: any) {
  return v != null ? Number(v).toLocaleString() : "0";
}

async function fetchData() {
  try {
    const token = (route.query.token as string) || undefined;
    const { data: d } = await bigscreenApi.platform(token);
    data.value = d || {};
  } catch { /* ignore */ }
}

onMounted(() => {
  fetchData();
  timer = setInterval(fetchData, 30000);
  clockTimer = setInterval(() => {
    nowStr.value = new Date().toLocaleString("zh-CN");
  }, 1000);
});

onBeforeUnmount(() => {
  clearInterval(timer);
  clearInterval(clockTimer);
});
</script>

<style scoped>
.bigscreen { background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%); color: #e0e6ff; min-height: 100vh; font-family: 'Microsoft YaHei', sans-serif; }
.bs-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 40px; border-bottom: 1px solid rgba(255,255,255,.1); }
.bs-title { font-size: 28px; letter-spacing: 4px; background: linear-gradient(90deg, #4facfe, #00f2fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.bs-time { font-size: 16px; color: #8892b0; }
.bs-body { padding: 30px 40px; }

.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.stat-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 8px; padding: 24px; text-align: center; transition: all .3s; }
.stat-card:hover { background: rgba(255,255,255,.08); transform: translateY(-2px); }
.stat-card.accent { grid-column: span 2; background: linear-gradient(135deg, rgba(255,193,7,.1), rgba(255,152,0,.1)); border-color: rgba(255,193,7,.3); }
.stat-label { font-size: 15px; color: #8892b0; margin-bottom: 10px; }
.stat-value { font-size: 36px; font-weight: 700; }
.stat-value.blue { color: #4facfe; }
.stat-value.green { color: #43e97b; }
.stat-value.orange { color: #fa8c16; }
.stat-value.cyan { color: #36cfc9; }
.stat-value.purple { color: #b37feb; }
.stat-value.gold { color: #ffc107; font-size: 42px; }

.bs-footer { display: flex; justify-content: space-between; padding: 12px 40px; font-size: 13px; color: #5a6380; border-top: 1px solid rgba(255,255,255,.06); }
.watermark { opacity: .3; }
</style>
