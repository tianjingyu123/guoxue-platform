<template>
  <div class="marketplace-page">
    <div class="page-header">
      <h3>AI智能体广场</h3>
      <div style="display:flex;gap:8px">
        <el-button
          type="primary"
          :loading="loading"
          @click="refresh"
        >
          刷新
        </el-button>
        <el-button @click="goToBotManage">
          排盘Bot管理
        </el-button>
      </div>
    </div>

    <!-- 概览统计 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.totalAgents }}</span><span class="label">智能体总数</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card info">
          <span class="value">{{ stats.activeAgents }}</span><span class="label">活跃智能体</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.totalCalls?.toLocaleString() || 0 }}</span><span class="label">调用次数（近7天·全平台）</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.todayCalls?.toLocaleString() || 0 }}</span><span class="label">今日调用（全平台）</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card warn">
          <span class="value">{{ stats.errorCount || 0 }}</span><span class="label">异常智能体</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ categoryList.length }}</span><span class="label">类别数</span>
        </div>
      </el-col>
    </el-row>

    <!-- 类别筛选 -->
    <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center">
      <el-radio-group
        v-model="filterCategory"
        size="small"
        @change="applyFilter"
      >
        <el-radio-button label="">
          全部
        </el-radio-button>
        <el-radio-button
          v-for="cat in categoryList"
          :key="cat.value"
          :label="cat.value"
        >
          {{ cat.label }}
        </el-radio-button>
      </el-radio-group>
      <el-input
        v-model="searchKeyword"
        placeholder="搜索智能体名称"
        size="small"
        style="width:220px"
        clearable
        @input="applyFilter"
      />
    </div>

    <!-- 智能体卡片网格 -->
    <div
      v-if="loadErr && !loading"
      style="text-align:center;padding:60px 0"
    >
      <el-empty
        description="加载失败，请稍后重试"
        :image-size="80"
      >
        <el-button
          type="primary"
          @click="refresh"
        >
          重试
        </el-button>
      </el-empty>
    </div>
    <div
      v-else-if="filteredAgents.length === 0 && !loading"
      style="text-align:center;padding:60px 0"
    >
      <el-empty
        description="暂无智能体数据"
        :image-size="80"
      />
    </div>

    <el-row
      v-loading="loading"
      :gutter="16"
    >
      <el-col
        v-for="agent in filteredAgents"
        :key="agent.id"
        :span="6"
        style="margin-bottom:16px"
      >
        <el-card
          class="agent-card"
          :class="{ disabled: !agent.enabled }"
          shadow="hover"
        >
          <template #header>
            <div class="agent-header">
              <span class="agent-icon">{{ CAT_ICONS[agent.category] || '智' }}</span>
              <div style="flex:1;min-width:0">
                <div class="agent-name">
                  {{ agent.name }}
                </div>
                <div class="agent-cat">
                  {{ CAT_LABELS[agent.category] || agent.category }}
                </div>
              </div>
              <!-- 圈子助理暂无启停接口：禁用开关+说明，禁止假成功 toast -->
              <el-tooltip
                :content="agent.source === 'bot' ? (agent.enabled ? '点击停用' : '点击启用') : '圈子助理暂无启停接口（后端待接线），请到圈主助理页管理'"
                placement="top"
              >
                <el-switch
                  v-model="agent.enabled"
                  size="small"
                  :disabled="agent.source !== 'bot'"
                  :loading="agentToggling === agent.id"
                  @change="(v: boolean) => toggleAgent(agent, v)"
                />
              </el-tooltip>
            </div>
          </template>

          <div class="agent-body">
            <div class="agent-desc">
              {{ agent.description || '暂无描述' }}
            </div>
            <el-divider style="margin:8px 0" />
            <div class="agent-stats">
              <div class="agent-stat-item">
                <span class="stat-label">模型</span>
                <el-tag
                  size="small"
                  type="info"
                >
                  {{ agent.model || '默认' }}
                </el-tag>
              </div>
              <div class="agent-stat-item">
                <span class="stat-label">调用</span>
                <span class="stat-value">{{ (agent.callCount || 0).toLocaleString() }}</span>
              </div>
              <!-- 成功率指标已删：后端无逐智能体成功率真源（原 98%/95% 为硬编码假数据） -->
            </div>
            <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
              <el-tag
                v-if="agent.isFree"
                size="small"
                type="success"
              >
                免费
              </el-tag>
              <el-tag
                v-else
                size="small"
                type="warning"
              >
                ¥{{ agent.price }}
              </el-tag>
              <el-tag
                v-if="agent.type"
                size="small"
              >
                {{ botTypeLabel(agent.type) }}
              </el-tag>
              <el-tag
                v-if="agent.scene"
                size="small"
                type="info"
              >
                {{ agent.scene }}
              </el-tag>
            </div>
          </div>

          <div style="margin-top:10px;display:flex;gap:6px">
            <el-button
              size="small"
              type="primary"
              @click="viewDetail(agent)"
            >
              详情
            </el-button>
            <el-button
              size="small"
              @click="goCallCenter"
            >
              日志
            </el-button>
            <el-button
              v-if="agent.configurable"
              size="small"
              @click="configAgent(agent)"
            >
              配置
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 智能体详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="智能体详情"
      width="650px"
    >
      <template v-if="detailAgent">
        <el-descriptions
          :column="2"
          border
          size="small"
        >
          <el-descriptions-item
            label="名称"
            :span="2"
          >
            {{ detailAgent.name }}
          </el-descriptions-item>
          <el-descriptions-item label="类别">
            {{ CAT_LABELS[detailAgent.category] || detailAgent.category }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detailAgent.enabled ? 'success' : 'info'">
              {{ detailAgent.enabled ? '运行中' : '已停用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="模型">
            {{ detailAgent.model || '默认路由' }}
          </el-descriptions-item>
          <el-descriptions-item label="调用次数">
            {{ (detailAgent.callCount || 0).toLocaleString() }}
          </el-descriptions-item>
          <!-- 成功率/今日调用已删：后端无逐智能体真源，不显示估算值 -->
          <el-descriptions-item label="类型">
            {{ botTypeLabel(detailAgent.type) || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="免费/付费">
            <el-tag
              :type="detailAgent.isFree ? 'success' : 'warning'"
              size="small"
            >
              {{ detailAgent.isFree ? '免费' : '付费' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item
            v-if="!detailAgent.isFree"
            label="价格"
          >
            ¥{{ detailAgent.price }}
          </el-descriptions-item>
          <el-descriptions-item
            label="描述"
            :span="2"
          >
            {{ detailAgent.description || '暂无描述' }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="detailAgent.scene"
            label="AI场景"
          >
            {{ detailAgent.scene }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="detailAgent.frequency"
            label="执行频率"
          >
            {{ detailAgent.frequency }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>

    <!-- 调用日志弹窗已删：原弹窗展示的 query/response/latencyMs/status 字段在
         /ai/call-logs 真实返回体中均不存在（永远显示"-"的假表），且后端不支持按智能体
         过滤日志。"日志"按钮改为跳转 AI 调用中心统一查看。 -->
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { botApi, api } from "@/api";

const router = useRouter();

// 智能体卡片数据结构（聚合自 bot/圈子助理两源，字段宽松）
// successRate 已删：后端无逐智能体成功率真源，禁止硬编码估算值
interface Agent {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  type?: string;
  description?: string;
  isFree?: boolean;
  price?: number;
  model?: string;
  configurable?: boolean;
  source?: string;
  sourceId: string;
  scene?: string;
  frequency?: string;
  callCount?: number;
  todayCalls?: number;
}

const CAT_ICONS: Record<string, string> = { paipan: "排", customer_service: "客", content: "创", operation: "运", knowledge: "知", circle: "圈" };
const CAT_LABELS: Record<string, string> = { paipan: "排盘类", customer_service: "客服类", content: "内容类", operation: "运营类", knowledge: "知识类", circle: "圈子类" };
const CATEGORY_ORDER = ["paipan", "customer_service", "content", "knowledge", "circle"];

// 智能体类型标签中文映射（BotConfig.type 真实枚举·与 seed 14 款智能体对齐·圈子助理已是中文原样透传·未知值兜底显原文）
const BOT_TYPE_LABELS: Record<string, string> = {
  CUSTOMER_SERVICE: "智能客服",
  CIRCLE_ASSISTANT: "圈主助理",
  STATION_ASSISTANT: "站长助理",
  CONTENT_WRITER: "获客文案",
  REPORT_FACTORY: "报告工厂",
  GOODS_RECOMMENDER: "开运好物推荐",
  WHITE_LABEL_AI: "白标AI",
  MASTER_PRACTICE: "大师对练",
  CLASSIC_DICTIONARY: "古籍活字典",
  CRM_ASSISTANT: "客户关系管家",
  OFFICE_ASSISTANT: "办公助理",
  FORTUNE_CHECK: "运势自查",
  SCHEDULE_GUARDIAN: "时间守护",
  IP_INCUBATOR: "IP孵化",
};
function botTypeLabel(t?: string) {
  return t ? (BOT_TYPE_LABELS[t] || t) : "";
}

const loading = ref(false);
const loadErr = ref(false);
const agentToggling = ref("");
const filterCategory = ref("");
const searchKeyword = ref("");

const stats = reactive({ totalAgents: 0, activeAgents: 0, totalCalls: 0, todayCalls: 0, errorCount: 0 });
const agents = ref<Agent[]>([]);

const detailVisible = ref(false);
const detailAgent = ref<Agent | null>(null);

const categoryList = computed(() => {
  const cats = new Set(agents.value.map((a) => a.category));
  return CATEGORY_ORDER.filter((c) => cats.has(c)).map((c) => ({ label: CAT_LABELS[c], value: c }));
});

const filteredAgents = computed(() => {
  let list = agents.value;
  if (filterCategory.value) {
    list = list.filter((a) => a.category === filterCategory.value);
  }
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase();
    list = list.filter((a) => a.name.toLowerCase().includes(kw) || (a.description || "").toLowerCase().includes(kw));
  }
  return list.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
});

onMounted(() => refresh());

async function refresh() {
  loading.value = true;
  loadErr.value = false;
  agents.value = []; // 重置，避免重试时重复累加
  try {
    await Promise.all([loadBots(), loadCircleAssistants()]);
    await loadStats();
    stats.totalAgents = agents.value.length;
    stats.activeAgents = agents.value.filter((a) => a.enabled).length;
  } finally { loading.value = false; }
}

async function loadBots() {
  try {
    const { data } = await botApi.list({});
    const bots = Array.isArray(data) ? data : data?.data || [];
    for (const bot of bots) {
      agents.value.push({
        id: `bot-${bot.id}`,
        name: bot.name,
        category: "paipan",
        type: bot.type,
        description: bot.intro || `${bot.type} 排盘智能体`,
        enabled: bot.status !== "DISABLED",
        isFree: bot.isFree,
        price: bot.price,
        model: bot.modelName || "deepseek-v4-flash",
        configurable: true,
        source: "bot",
        sourceId: bot.id,
        callCount: bot.useCount || 0,
      });
    }
  } catch { loadErr.value = true; }
}

async function loadCircleAssistants() {
  try {
    const { data } = await api.get("/ai/circle-assistants", { params: { pageSize: 50 } });
    const assistants = data?.list || data?.data || [];
    for (const ca of assistants) {
      agents.value.push({
        id: `circle-${ca.id || ca.circleId}`,
        name: ca.name || ca.circle?.name || `圈子助理 #${ca.circleId}`,
        category: "circle",
        type: "圈主助理",
        description: `为圈子"${ca.circle?.name || ca.circleId}"提供AI知识库问答`,
        enabled: ca.status === "ACTIVE" || ca.enabled,
        isFree: true,
        configurable: true,
        source: "circle",
        sourceId: ca.id || ca.circleId,
        model: ca.modelName || "deepseek-v4-flash",
        callCount: ca.useCount || 0,
      });
    }
  } catch { loadErr.value = true; }
}

async function loadStats() {
  // /ai/usage-stats 返回体只有 totalCalls/totalTokens/estimatedCost（无 todayCalls 字段），
  // 今日数据需单独按 period=day 再取一次，禁止读不存在的字段假装有值
  try {
    const [{ data: week }, { data: day }] = await Promise.all([
      api.get("/ai/usage-stats", { params: { period: "week" } }),
      api.get("/ai/usage-stats", { params: { period: "day" } }),
    ]);
    stats.totalCalls = week?.totalCalls || 0;
    stats.todayCalls = day?.totalCalls || 0;
  } catch { /* 统计卡失败不阻塞列表 */ }
}

function applyFilter() { /* computed handles filtering */ }

function goToBotManage() { router.push("/bots"); }


async function toggleAgent(agent: Agent, enabled: boolean) {
  if (agentToggling.value === agent.id) return; // 防重复
  // 只有 bot 源有启停接口；其余源开关已禁用，这里兜底防御，绝不假成功
  if (agent.source !== "bot") {
    agent.enabled = !enabled;
    ElMessage.warning("该智能体暂无启停接口（后端待接线）");
    return;
  }
  agentToggling.value = agent.id;
  try {
    await botApi.update(agent.sourceId, { status: enabled ? "ACTIVE" : "DISABLED" });
    ElMessage.success(`「${agent.name}」已${enabled ? '启用' : '停用'}`);
  } catch {
    agent.enabled = !enabled;
    ElMessage.error("操作失败，请重试");
  } finally {
    agentToggling.value = "";
  }
}

function viewDetail(agent: Agent) {
  detailAgent.value = agent;
  detailVisible.value = true;
}

/** 后端不支持按智能体过滤日志，统一跳 AI 调用中心查看（原弹窗字段全为不存在字段的假表，已删） */
function goCallCenter() {
  router.push("/ai/usage");
}

function configAgent(agent: Agent) {
  if (agent.source === "bot") {
    router.push("/bots");
  } else if (agent.source === "circle") {
    router.push("/ai/circle-assistants");
  }
}
</script>

<style scoped>
.marketplace-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-card { background: var(--color-bg-page); border-radius: 8px; padding: 14px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: var(--color-text-title); }
.stat-card .label { display: block; font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }
.stat-card.warn .value { color: var(--color-warning); }
.stat-card.info .value { color: var(--color-info); }

.agent-card { transition: opacity .3s; }
.agent-card.disabled { opacity: 0.5; }
.agent-header { display: flex; align-items: center; gap: 8px; }
.agent-icon { font-size: 28px; flex-shrink: 0; }
.agent-name { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-cat { font-size: 11px; color: var(--color-text-secondary); }
.agent-body { font-size: 13px; }
.agent-desc { color: var(--color-text-body); line-height: 1.5; min-height: 36px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.agent-stats { display: flex; gap: 16px; }
.agent-stat-item { display: flex; flex-direction: column; gap: 2px; }
.agent-stat-item .stat-label { font-size: 10px; color: #c0c4cc; }
.agent-stat-item .stat-value { font-size: 13px; color: var(--color-text-title); font-weight: 600; }
</style>
