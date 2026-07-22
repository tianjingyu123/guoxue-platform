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

    <!-- 统计（口径讲真话：后端暂无客服会话维度统计，只有全平台 AI 调用数；
         自动解决率/转人工次数/平均响应三卡已删——/ai/usage-stats 返回体无对应字段，不显示假值） -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="8">
        <div class="stat-card">
          <span class="value">{{ stats.totalConversations?.toLocaleString() || 0 }}</span><span class="label">平台 AI 调用数（近30天·非仅客服）</span>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <span class="value">{{ stats.todayConversations?.toLocaleString() || 0 }}</span><span class="label">今日 AI 调用（全平台）</span>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card info">
          <span class="value">{{ stats.faqCount }}</span><span class="label">FAQ条目</span>
        </div>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab">
      <!-- FAQ 管理 -->
      <el-tab-pane
        label="FAQ管理"
        name="faq"
      >
        <el-alert
          type="success"
          :closable="false"
          show-icon
          title="FAQ 已接入智能客服"
          description="保存后实时生效：高度匹配的问题直接返回审核答案，相关问题会把 FAQ 作为高优先级上下文交给 AI。"
          style="margin-bottom:12px"
        />
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
                :class="{ active: editingCat === cat }"
                @click="editingCat = cat"
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
                    @click.stop="addFaqEntry(cat)"
                  >
                    + 条目
                  </el-button>
                  <el-button
                    size="small"
                    type="danger"
                    circle
                    @click.stop="deleteCategory(cat)"
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
                      :maxlength="240"
                      style="margin-bottom:4px"
                    />
                    <el-input
                      v-model="entry.a"
                      placeholder="答案"
                      type="textarea"
                      :rows="2"
                      :maxlength="2000"
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
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="人工协助提示规则已接入"
          description="命中后 AI 会先回答可确认的信息，再引导用户到「帮助与反馈」提交人工处理；不会虚假声称已经接通人工会话。"
          style="margin-bottom:12px"
        />
        <el-card>
          <template #header>
            <span>人工协助提示条件</span>
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
              <span style="font-size:11px;color:var(--color-text-secondary)">用户消息包含这些关键词时显示人工协助入口</span>
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
          <!-- 原"状态筛选/关键词搜索"已删：/ai/call-logs 仅支持 service 参数，
               status/keyword 后端不消费，筛选点了不生效属假交互（体验标准红线6） -->
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="客服会话明细后端暂未开放，以下为全平台 AI 调用记录（GET /ai/call-logs）"
            style="margin-bottom:12px"
          />
          <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
            <el-button
              size="small"
              :loading="convLoading"
              @click="fetchConversations"
            >
              刷新
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
            <!-- 列与 /ai/call-logs 真实返回体一一对应；原"问题/回答/已解决/转人工"列
                 取的字段（query/response/status/content）在返回体中不存在，永远显示"-"，已删 -->
            <el-table-column
              label="用户"
              width="160"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.userNickname || (row.userId === 'system' ? '系统' : '—') }}
              </template>
            </el-table-column>
            <el-table-column
              label="类型"
              width="130"
            >
              <template #default="{ row }">
                <el-tag
                  size="small"
                  type="info"
                >
                  {{ row.analyzeType || '—' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="模型"
              min-width="160"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.modelName || '—' }}
              </template>
            </el-table-column>
            <el-table-column
              label="缓存命中"
              width="90"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  v-if="row.isCached"
                  type="success"
                  size="small"
                >
                  命中
                </el-tag>
                <span
                  v-else
                  style="color:var(--color-text-secondary)"
                >否</span>
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
import { ElMessage, ElMessageBox } from "element-plus";
import { ChatUI } from '@/components/ChatUI'
import type { ChatUIConfig } from '@/components/ChatUI/types'
import { systemApi, api } from "@/api";
import { BRAND } from "@/lib/brand";

// 调用记录行（与 GET /ai/call-logs 真实返回体一致·ai.service.ts getAiCallLogs）
interface ConversationRow {
  id: string;
  userId?: string;
  userNickname?: string;
  analyzeType?: string;
  modelName?: string | null;
  isCached?: boolean;
  createdAt?: string;
}
// 系统配置项
interface SystemConfig { configKey?: string; configValue?: string }

const activeTab = ref("faq");
const savingFaq = ref(false);
const savingRules = ref(false);

const stats = reactive({ totalConversations: 0, todayConversations: 0, faqCount: 0 });

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
});

function parseWorkHour(value: unknown, fallbackHour: number): Date {
  const base = new Date(2024, 0, 1, fallbackHour, 0, 0, 0);
  if (typeof value === "string") {
    const clock = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (clock) {
      base.setHours(Number(clock[1]), Number(clock[2]), 0, 0);
      return base;
    }
  }
  const parsed = new Date(String(value || ""));
  if (!Number.isNaN(parsed.getTime())) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(parsed);
    base.setHours(
      Number(parts.find((part) => part.type === "hour")?.value || fallbackHour),
      Number(parts.find((part) => part.type === "minute")?.value || 0),
      0,
      0,
    );
  }
  return base;
}

function formatWorkHour(value: Date): string {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

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

// 对话监控（状态/关键词筛选已删：后端不支持对应参数）
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
          { q: "如何注册账号？", a: `打开${BRAND.name}，点击「我的」→「立即登录」，输入手机号获取验证码即可注册。` },
          { q: "忘记密码怎么办？", a: "登录页点击「忘记密码」→输入手机号→获取验证码→设置新密码即可。" },
          { q: "如何成为会员？", a: "进入「我的」→「会员中心」→选择适合您的会员等级→完成支付即可享受会员权益。" },
        ],
        "内容学习": [
          { q: "如何搜索古籍内容？", a: "在首页顶部搜索框输入关键词（如作者、篇名、名句）→系统会快速检索并展示相关结果。" },
          { q: "内容可以离线阅读吗？", a: "部分内容支持缓存；如果详情页显示「下载」入口，可按页面提示缓存后离线阅读。" },
        ],
        "支付退款": [
          { q: "支持哪些支付方式？", a: "平台当前支持页面实际展示的支付方式；不同终端和业务可用渠道可能不同，请以下单页为准。" },
          { q: "如何申请退款？", a: "请进入对应订单详情，点击「申请退款」并填写原因。是否可退及处理进度以订单页面和平台审核结果为准。" },
        ],
      };
      faqCatNames.value = { "平台使用": "平台使用", "内容学习": "内容学习", "支付退款": "支付退款" };
      editingCat.value = "平台使用";
    }
    stats.faqCount = Object.values(faqData.value).reduce((s, arr) => s + arr.length, 0);
  } catch { /* ignore */ }
}

async function saveFaq() {
  const cleaned: Record<string, Array<{ q: string; a: string }>> = {};
  const seenQuestions = new Set<string>();
  let totalEntries = 0;
  for (const [category, entries] of Object.entries(faqData.value)) {
    cleaned[category] = [];
    for (const entry of entries) {
      const q = entry.q.trim();
      const a = entry.a.trim();
      if (!q || !a) {
        editingCat.value = category;
        ElMessage.warning("每条 FAQ 都必须同时填写问题和答案");
        return;
      }
      const fingerprint = q.normalize("NFKC").toLowerCase().replace(/\s/g, "");
      if (seenQuestions.has(fingerprint)) {
        editingCat.value = category;
        ElMessage.warning(`FAQ 问题重复：${q}`);
        return;
      }
      seenQuestions.add(fingerprint);
      cleaned[category].push({ q, a });
      totalEntries += 1;
    }
  }
  if (totalEntries > 100) {
    ElMessage.warning("FAQ 最多保存 100 条，请先合并或删除重复条目");
    return;
  }

  const cleanNames = Object.fromEntries(
    Object.keys(cleaned).map((category) => [category, faqCatNames.value[category]?.trim() || category]),
  );
  savingFaq.value = true;
  try {
    await systemApi.setConfig("customer_service_faq", {
      value: JSON.stringify({ entries: cleaned, catNames: cleanNames }),
      description: "智能客服FAQ",
    });
    faqData.value = cleaned;
    faqCatNames.value = cleanNames;
    ElMessage.success("FAQ已保存并实时生效");
    stats.faqCount = totalEntries;
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

async function deleteCategory(cat: string) {
  // L1 确认：删除分类连带删除其下全部条目，不可恢复（需再点保存才落库）
  const count = (faqData.value[cat] || []).length;
  try {
    await ElMessageBox.confirm(
      `删除分类「${faqCatNames.value[cat] || cat}」将连带删除其下 ${count} 条 FAQ，确定删除？（点击"保存FAQ"后生效）`,
      "删除确认",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" },
    );
  } catch { return; }
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
      if (typeof parsed.keywordsStr === "string") transferRules.keywordsStr = parsed.keywordsStr;
      if (Number.isFinite(Number(parsed.lowConfidenceThreshold))) transferRules.lowConfidenceThreshold = Number(parsed.lowConfidenceThreshold);
      if (Number.isInteger(Number(parsed.maxEmptyResponses))) transferRules.maxEmptyResponses = Number(parsed.maxEmptyResponses);
      if (typeof parsed.offHoursMessage === "string") transferRules.offHoursMessage = parsed.offHoursMessage;
      if (Array.isArray(parsed.workHours) && parsed.workHours.length >= 2) {
        transferRules.workHours = [parseWorkHour(parsed.workHours[0], 9), parseWorkHour(parsed.workHours[1], 18)];
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
        workHours: transferRules.workHours?.map(formatWorkHour),
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

// ── 对话监控（真实数据源：GET /ai/call-logs·仅支持 page/pageSize/service 参数）──
async function fetchConversations() {
  convLoading.value = true;
  convErr.value = false;
  try {
    const { data } = await api.get("/ai/call-logs", { params: { page: 1, pageSize: 20 } });
    const d = data as { items?: ConversationRow[] };
    conversations.value = d?.items || [];
  } catch { convErr.value = true; } finally { convLoading.value = false; }
}

async function fetchStats() {
  // /ai/usage-stats 返回体只有 totalCalls/totalTokens/estimatedCost；
  // 原 successRate/avgLatencyMs/todayCalls 均为不存在字段（恒0假数据），对应统计卡已删
  try {
    const [{ data: month }, { data: day }] = await Promise.all([
      api.get("/ai/usage-stats", { params: { period: "month" } }),
      api.get("/ai/usage-stats", { params: { period: "day" } }),
    ]);
    stats.totalConversations = (month as { totalCalls?: number })?.totalCalls || 0;
    stats.todayConversations = (day as { totalCalls?: number })?.totalCalls || 0;
  } catch { /* 统计卡失败不阻塞主体 */ }
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
.faq-cat-item.active { background: rgba(196, 30, 58, 0.08); box-shadow: inset 3px 0 0 var(--color-primary); }
.faq-cat-header { display: flex; align-items: center; gap: 8px; }
.faq-entry { padding: 8px; margin-bottom: 4px; border-bottom: 1px solid var(--color-border); }
</style>
