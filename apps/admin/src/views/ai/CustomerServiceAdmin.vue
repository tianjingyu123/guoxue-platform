<template>
  <div class="cs-page">
    <div class="page-header">
      <h3>智能客服管理</h3>
      <div>
        <el-button
          type="primary"
          :loading="savingFaq"
          @click="saveFaq"
        >
          保存FAQ
        </el-button>
        <el-button @click="refresh">
          刷新
        </el-button>
      </div>
    </div>

    <!-- 统计 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.totalConversations?.toLocaleString() || 0 }}</span><span class="label">总对话数</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.todayConversations?.toLocaleString() || 0 }}</span><span class="label">今日对话</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card info">
          <span class="value">{{ stats.faqCount }}</span><span class="label">FAQ条目</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.autoResolveRate || 0 }}%</span><span class="label">自动解决率</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card warn">
          <span class="value">{{ stats.humanTransferCount || 0 }}</span><span class="label">转人工次数</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.avgResponseMs || 0 }}ms</span><span class="label">平均响应</span>
        </div>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab">
      <!-- FAQ 管理 -->
      <el-tab-pane
        label="FAQ管理"
        name="faq"
      >
        <el-row :gutter="16">
          <el-col :span="10">
            <el-card>
              <template #header>
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span>FAQ分类列表</span>
                  <el-button
                    size="small"
                    @click="addCategory"
                  >
                    + 添加分类
                  </el-button>
                </div>
              </template>
              <div
                v-for="(entries, cat) in faqData"
                :key="cat"
                class="faq-cat-item"
              >
                <div class="faq-cat-header">
                  <el-input
                    v-model="faqCatNames[cat]"
                    size="small"
                    style="width:140px;font-weight:600"
                  />
                  <el-tag size="small">
                    {{ entries.length }}条
                  </el-tag>
                  <el-button
                    size="small"
                    type="primary"
                    @click="addFaqEntry(cat)"
                  >
                    + 条目
                  </el-button>
                  <el-button
                    size="small"
                    type="danger"
                    circle
                    @click="deleteCategory(cat)"
                  >
                    ✕
                  </el-button>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="14">
            <el-card v-if="editingCat">
              <template #header>
                <span>{{ faqCatNames[editingCat] || editingCat }} — 条目编辑</span>
              </template>
              <div
                v-for="(entry, idx) in (faqData[editingCat] || [])"
                :key="idx"
                class="faq-entry"
              >
                <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px">
                  <div style="flex:1">
                    <el-input
                      v-model="entry.q"
                      placeholder="问题"
                      size="small"
                      style="margin-bottom:4px"
                    />
                    <el-input
                      v-model="entry.a"
                      placeholder="答案"
                      type="textarea"
                      :rows="2"
                      size="small"
                    />
                  </div>
                  <el-button
                    size="small"
                    type="danger"
                    circle
                    @click="removeFaqEntry(editingCat!, idx)"
                  >
                    ✕
                  </el-button>
                </div>
              </div>
              <el-button
                v-if="(faqData[editingCat!] || []).length === 0"
                size="small"
                @click="addFaqEntry(editingCat!)"
              >
                添加第一条FAQ
              </el-button>
            </el-card>
            <el-empty
              v-else
              description="选择左侧分类进行编辑"
              :image-size="60"
            />
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 转人工规则 -->
      <el-tab-pane
        label="转人工规则"
        name="rules"
      >
        <el-card>
          <template #header>
            <span>转人工触发条件</span>
          </template>
          <el-form
            :model="transferRules"
            label-width="160px"
            size="small"
          >
            <el-form-item label="关键词触发">
              <el-input
                v-model="transferRules.keywordsStr"
                placeholder="逗号分隔，如：退款,投诉,举报,人工"
              />
              <span style="font-size:11px;color:var(--color-text-secondary)">用户消息包含这些关键词时自动转人工</span>
            </el-form-item>
            <el-form-item label="AI置信度低于阈值">
              <el-input-number
                v-model="transferRules.lowConfidenceThreshold"
                :min="0"
                :max="1"
                :step="0.1"
                :precision="2"
              />
              <span style="margin-left:8px;font-size:11px;color:var(--color-text-secondary)">当AI无法从知识库找到相关内容时</span>
            </el-form-item>
            <el-form-item label="连续无效回答次数">
              <el-input-number
                v-model="transferRules.maxEmptyResponses"
                :min="1"
                :max="10"
              />
              <span style="margin-left:8px;font-size:11px;color:var(--color-text-secondary)">同一会话中AI连续N次无有效回答时自动转人工</span>
            </el-form-item>
            <el-form-item label="人工客服工作时间">
              <el-time-picker
                v-model="transferRules.workHours"
                is-range
                range-separator="-"
                start-placeholder="开始"
                end-placeholder="结束"
              />
            </el-form-item>
            <el-form-item label="非工作时间提示语">
              <el-input
                v-model="transferRules.offHoursMessage"
                type="textarea"
                :rows="2"
              />
            </el-form-item>
            <el-form-item label="转人工后推送卡片">
              <el-switch
                v-model="transferRules.pushCard"
                active-text="推送内容推荐卡片"
              />
            </el-form-item>
          </el-form>
          <el-button
            type="primary"
            size="small"
            style="margin-top:12px"
            :loading="savingRules"
            @click="saveRules"
          >
            保存规则
          </el-button>
        </el-card>
      </el-tab-pane>

      <!-- 测试对话 -->
      <el-tab-pane
        label="测试对话"
        name="test"
      >
        <div style="height:500px;display:flex;flex-direction:column">
          <div style="flex:1;border:1px solid var(--color-border);border-radius:8px;overflow:hidden">
            <ChatUI
              ref="csChatRef"
              :config="csChatConfig"
            />
          </div>
        </div>
      </el-tab-pane>

      <!-- 对话监控 -->
      <el-tab-pane
        label="对话监控"
        name="monitor"
      >
        <el-card>
          <div style="display:flex;gap:10px;margin-bottom:12px;align-items:center">
            <el-input
              v-model="monitorKeyword"
              placeholder="搜索对话内容"
              size="small"
              style="width:240px"
              clearable
            />
            <el-select
              v-model="monitorStatus"
              placeholder="状态"
              size="small"
              clearable
              style="width:130px"
            >
              <el-option
                label="已解决"
                value="resolved"
              />
              <el-option
                label="转人工"
                value="transferred"
              />
              <el-option
                label="未解决"
                value="unresolved"
              />
            </el-select>
            <el-button
              size="small"
              @click="fetchConversations"
            >
              搜索
            </el-button>
          </div>
          <el-result
            v-if="convErr"
            icon="error"
            title="加载失败"
            sub-title="对话记录加载出错，请重试"
          >
            <template #extra>
              <el-button
                type="primary"
                @click="fetchConversations"
              >
                重试
              </el-button>
            </template>
          </el-result>
          <el-table
            v-else
            v-loading="convLoading"
            :data="conversations"
            stripe
            size="small"
            max-height="400"
            empty-text="暂无对话记录"
          >
            <el-table-column
              label="用户"
              width="150"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.userId || '匿名' }}
              </template>
            </el-table-column>
            <el-table-column
              label="问题"
              min-width="200"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.question?.substring(0, 80) || '-' }}
              </template>
            </el-table-column>
            <el-table-column
              label="回答"
              min-width="200"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.answer?.substring(0, 80) || '-' }}
              </template>
            </el-table-column>
            <el-table-column
              label="状态"
              width="90"
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.resolved ? 'success' : row.transferred ? 'warning' : 'info'"
                  size="small"
                >
                  {{ row.resolved ? '已解决' : row.transferred ? '转人工' : '未解决' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="时间"
              width="160"
            >
              <template #default="{ row }">
                {{ fmt(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { ChatUI } from '@/components/ChatUI'
import type { ChatUIConfig } from '@/components/ChatUI/types'
import { systemApi, api } from "@/api";
import { BRAND } from "@/lib/brand";

// 对话监控行
interface ConversationRow {
  userId?: string;
  question?: string;
  answer?: string;
  resolved?: boolean;
  transferred?: boolean;
  createdAt?: string;
}
// 系统配置项
interface SystemConfig { configKey?: string; configValue?: string }
// 后端调用日志原始结构
interface CallLogRaw {
  userId?: string;
  query?: string;
  prompt?: string;
  response?: string;
  content?: string;
  status?: string;
  createdAt?: string;
}

const activeTab = ref("faq");
const savingFaq = ref(false);
const savingRules = ref(false);

const stats = reactive({
  totalConversations: 0, todayConversations: 0, faqCount: 0,
  autoResolveRate: 0, humanTransferCount: 0, avgResponseMs: 0,
});

// FAQ
const faqData = ref<Record<string, Array<{ q: string; a: string }>>>({});
const faqCatNames = ref<Record<string, string>>({});
const editingCat = ref<string | null>(null);

// 转人工规则
const transferRules = reactive({
  keywordsStr: "退款,投诉,举报,人工,客服",
  lowConfidenceThreshold: 0.3,
  maxEmptyResponses: 3,
  workHours: [new Date(2024, 0, 1, 9, 0), new Date(2024, 0, 1, 18, 0)] as [Date, Date],
  offHoursMessage: "当前为非工作时间，客服将在工作日9:00-18:00为您服务，请先留言或查看帮助中心。",
  pushCard: true,
});

// 测试对话
const csChatRef = ref<InstanceType<typeof ChatUI>>()
const csChatConfig: ChatUIConfig = {
  apiEndpoint: '/api/v1/ai/customer-service/stream',
  fallbackEndpoint: '/api/v1/ai/customer-service',
  placeholder: '输入问题测试智能客服...',
  showSources: true,
  showFeedback: true,
  showRetry: true,
  welcomeMessage: '你好！我是平台智能客服，请问有什么可以帮助你的？',
  extraBody: { scene: 'customer_service' },
}

// 对话监控
const monitorKeyword = ref("");
const monitorStatus = ref("");
const conversations = ref<ConversationRow[]>([]);
const convLoading = ref(false);
const convErr = ref(false);

function fmt(d: string) { return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "-"; }

onMounted(() => refresh());

async function refresh() {
  await Promise.all([loadFaq(), loadRules(), fetchStats(), fetchConversations()]);
}

// ── FAQ CRUD ──
async function loadFaq() {
  try {
    const { data } = await systemApi.listConfigs();
    const configs = (data as { configs?: SystemConfig[] })?.configs || [];
    const faqCfg = configs.find((c) => c.configKey === "customer_service_faq");
    if (faqCfg?.configValue) {
      const parsed = JSON.parse(faqCfg.configValue);
      faqData.value = parsed.entries || {};
      faqCatNames.value = parsed.catNames || {};
      if (Object.keys(faqData.value).length > 0) {
        editingCat.value = Object.keys(faqData.value)[0];
      }
    }
    // 默认数据
    if (Object.keys(faqData.value).length === 0) {
      faqData.value = {
        "平台使用": [
          { q: "如何注册账号？", a: `打开${BRAND.name}APP，点击「我的」→「立即登录」→输入手机号获取验证码即可注册。` },
          { q: "忘记密码怎么办？", a: "登录页点击「忘记密码」→输入手机号→获取验证码→设置新密码即可。" },
          { q: "如何成为会员？", a: "进入「我的」→「会员中心」→选择适合您的会员等级→完成支付即可享受会员权益。" },
        ],
        "内容学习": [
          { q: "如何搜索古籍内容？", a: "在首页顶部搜索框输入关键词（如作者、篇名、名句）→系统会快速检索并展示相关结果。" },
          { q: "内容可以离线阅读吗？", a: "部分内容支持缓存，点击内容详情页的「下载」按钮即可离线阅读。会员用户享有更多缓存权限。" },
        ],
        "支付退款": [
          { q: "支持哪些支付方式？", a: `${BRAND.name}平台支持微信支付和汇付天下支付，未来将支持更多支付方式。` },
          { q: "如何申请退款？", a: "请在订单详情页点击「申请退款」，填写退款原因后提交。退款需人工审核，将在1-3个工作日内处理。" },
        ],
      };
      faqCatNames.value = { "平台使用": "平台使用", "内容学习": "内容学习", "支付退款": "支付退款" };
      editingCat.value = "平台使用";
    }
    stats.faqCount = Object.values(faqData.value).reduce((s, arr) => s + arr.length, 0);
  } catch { /* ignore */ }
}

async function saveFaq() {
  savingFaq.value = true;
  try {
    await systemApi.setConfig("customer_service_faq", {
      value: JSON.stringify({ entries: faqData.value, catNames: faqCatNames.value }),
      description: "智能客服FAQ",
    });
    ElMessage.success("FAQ已保存");
    stats.faqCount = Object.values(faqData.value).reduce((s, arr) => s + arr.length, 0);
  } finally { savingFaq.value = false; }
}

function addCategory() {
  const name = "新分类"; let n = 1;
  while (faqData.value[name + n]) n++;
  const key = name + n;
  faqData.value[key] = [];
  faqCatNames.value[key] = key;
  editingCat.value = key;
}

function deleteCategory(cat: string) {
  delete faqData.value[cat];
  delete faqCatNames.value[cat];
  if (editingCat.value === cat) {
    editingCat.value = Object.keys(faqData.value)[0] || null;
  }
}

function addFaqEntry(cat: string) {
  if (!faqData.value[cat]) faqData.value[cat] = [];
  faqData.value[cat].push({ q: "", a: "" });
}

function removeFaqEntry(cat: string, idx: number) {
  faqData.value[cat].splice(idx, 1);
}

// ── 转人工规则 ──
async function loadRules() {
  try {
    const { data } = await systemApi.listConfigs();
    const configs = (data as { configs?: SystemConfig[] })?.configs || [];
    const cfg = configs.find((c) => c.configKey === "customer_service_rules");
    if (cfg?.configValue) {
      const parsed = JSON.parse(cfg.configValue);
      Object.assign(transferRules, parsed);
      if (parsed.workHours) {
        transferRules.workHours = [new Date(parsed.workHours[0]), new Date(parsed.workHours[1])];
      }
    }
  } catch { /* ignore */ }
}

async function saveRules() {
  if (savingRules.value) return;
  savingRules.value = true;
  try {
    await systemApi.setConfig("customer_service_rules", {
      value: JSON.stringify({
        ...transferRules,
        workHours: transferRules.workHours?.map((d: Date) => d?.toISOString()),
      }),
      description: "智能客服转人工规则",
    });
    ElMessage.success("规则已保存");
  } catch {
    ElMessage.error("规则保存失败，请重试");
  } finally {
    savingRules.value = false;
  }
}

// ── 对话监控 ──
async function fetchConversations() {
  convLoading.value = true;
  convErr.value = false;
  try {
    const params: Record<string, string | number> = { page: 1, pageSize: 20, scene: "customer_service" };
    if (monitorKeyword.value) params.keyword = monitorKeyword.value;
    const { data } = await api.get("/ai/call-logs", { params });
    const d = data as { items?: CallLogRaw[]; list?: CallLogRaw[]; data?: CallLogRaw[] };
    conversations.value = (d?.items || d?.list || d?.data || []).map((log) => ({
      userId: log.userId,
      question: log.query || log.prompt,
      answer: log.response || log.content,
      resolved: log.status === "success" && !log.content?.includes("转人工"),
      transferred: log.content?.includes("转人工") || log.content?.includes("人工客服"),
      createdAt: log.createdAt,
    }));
  } catch { convErr.value = true; } finally { convLoading.value = false; }
}

async function fetchStats() {
  try {
    const { data } = await api.get("/ai/usage-stats", { params: { period: "month" } });
    const d = data as { totalCalls?: number; todayCalls?: number; successRate?: number; avgLatencyMs?: number };
    stats.totalConversations = d?.totalCalls || 0;
    stats.todayConversations = d?.todayCalls || 0;
    stats.autoResolveRate = d?.successRate || 0;
    stats.avgResponseMs = d?.avgLatencyMs || 0;
  } catch { /* ignore */ }
}
</script>

<style scoped>
.cs-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-card { background: var(--color-bg-page); border-radius: 8px; padding: 14px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: var(--color-text-title); }
.stat-card .label { display: block; font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }
.stat-card.warn .value { color: var(--color-warning); }
.stat-card.info .value { color: var(--color-info); }

.faq-cat-item { padding: 8px 12px; margin-bottom: 4px; background: var(--color-bg-page); border-radius: 6px; cursor: pointer; transition: all .2s; }
.faq-cat-item:hover { background: #ecf5ff; }
.faq-cat-header { display: flex; align-items: center; gap: 8px; }
.faq-entry { padding: 8px; margin-bottom: 4px; border-bottom: 1px solid var(--color-border); }
</style>
