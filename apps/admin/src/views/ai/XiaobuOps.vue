<template>
  <div class="xo-page">
    <div class="page-header">
      <div>
        <h3>小卜运营</h3>
        <p class="sub">小卜各场景的模型调用、语音会话成本与语音额度。语音成本按供应商报价估算；结算来源为“客户端估算”的会话需与供应商账单对账后才能作为最终成本。</p>
      </div>
      <el-radio-group v-model="days" size="small" @change="loadUsage">
        <el-radio-button :value="1">今天</el-radio-button>
        <el-radio-button :value="7">近 7 天</el-radio-button>
        <el-radio-button :value="30">近 30 天</el-radio-button>
      </el-radio-group>
    </div>

    <el-alert v-if="usageError" type="error" :closable="false" :title="usageError" show-icon style="margin-bottom:12px" />

    <div v-loading="usageLoading" class="grid">
      <el-card shadow="never" class="block">
        <template #header><span>计费配置（当前生效）</span></template>
        <div v-if="usage" class="kv">
          <div><span class="k">向用户扣减额度</span><el-tag :type="usage.billing.chargeUsers ? 'danger' : 'info'" size="small">{{ usage.billing.chargeUsers ? '已开启' : '未开启（免费体验）' }}</el-tag></div>
          <div><span class="k">免费体验单次上限</span><span>{{ Math.round(usage.billing.freeSessionMaxSeconds / 60) }} 分钟</span></div>
          <div><span class="k">供应商报价（Lite / 标准版）</span><span class="num">{{ usage.billing.supplierYuanPerMinute.lite }} / {{ usage.billing.supplierYuanPerMinute.standard }} 元/分钟</span></div>
          <div><span class="k">配置版本</span><span class="num">{{ usage.billing.version }}</span></div>
          <p class="muted">费率与是否收费在系统配置 <code>voice_billing_config</code> 中维护。价格已拍板，向用户扣费开关待语音链路接通后再开启。</p>
        </div>
      </el-card>

      <el-card v-if="usage?.pricing" shadow="never" class="block block-wide">
        <template #header><span>售价与毛利（2026-09-17 定价）</span></template>
        <el-table :data="usage.pricing.items" size="small" border>
          <el-table-column prop="label" label="项目" min-width="180" />
          <el-table-column label="售价" width="110" align="right">
            <template #default="{ row }"><span class="num">{{ row.priceYuan }} 元</span></template>
          </el-table-column>
          <el-table-column label="供应商成本" width="120" align="right">
            <template #default="{ row }"><span class="num">{{ row.costYuan.toFixed(3) }} 元</span></template>
          </el-table-column>
          <el-table-column label="毛利率" width="100" align="right">
            <template #default="{ row }">
              <el-tag v-if="row.marginPercent !== null" :type="row.marginPercent < 40 ? 'danger' : 'success'" size="small">{{ row.marginPercent }}%</el-tag>
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>
          <el-table-column prop="note" label="口径" min-width="200" />
        </el-table>
        <div class="kv" style="margin-top:10px">
          <div><span class="k">每圈赠送成本</span><span class="num">{{ usage.pricing.circleGrantCostYuan.toFixed(2) }} 元</span></div>
          <div><span class="k">每用户试聊成本</span><span class="num">{{ usage.pricing.trialCostPerUserYuan.toFixed(3) }} 元</span></div>
          <div><span class="k">圈成员收费</span><el-tag size="small" type="info">{{ usage.pricing.chargeCircleMembers ? '已开启' : '暂不收费' }}</el-tag></div>
        </div>
        <el-alert v-for="(w, i) in usage.pricing.warnings" :key="i" type="warning" :closable="false" :title="w" show-icon style="margin-top:8px" />
      </el-card>

      <el-card shadow="never" class="block">
        <template #header><span>报告问答</span></template>
        <el-table :data="usage?.reportDialogue || []" size="small" empty-text="暂无问答">
          <el-table-column label="类型">
            <template #default="{ row }">{{ MODE_LABEL[row.mode] || row.mode }}</template>
          </el-table-column>
          <el-table-column prop="answers" label="回答数" width="90" align="right" />
        </el-table>
      </el-card>
    </div>

    <el-card shadow="never" class="block">
      <template #header><span>模型调用（按场景）</span></template>
      <el-table :data="usage?.modelCalls || []" size="small" border empty-text="所选时间内暂无调用">
        <el-table-column label="场景" min-width="140">
          <template #default="{ row }">{{ SCENE_LABEL[row.scene] || row.scene }}</template>
        </el-table-column>
        <el-table-column prop="model" label="实际模型" min-width="140" />
        <el-table-column prop="calls" label="调用次数" width="100" align="right" />
        <el-table-column label="输入 / 输出 token" min-width="160" align="right">
          <template #default="{ row }"><span class="num">{{ row.promptTokens.toLocaleString() }} / {{ row.completionTokens.toLocaleString() }}</span></template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="block">
      <template #header><span>语音会话</span></template>
      <el-table :data="usage?.voiceSessions || []" size="small" border empty-text="暂无语音会话（小卜语音尚未对用户开放）">
        <el-table-column prop="scene" label="场景" min-width="120" />
        <el-table-column label="档位" width="80">
          <template #default="{ row }">{{ row.tier === 'standard' ? '标准版' : 'Lite' }}</template>
        </el-table-column>
        <el-table-column label="结算来源" width="140">
          <template #default="{ row }">
            <el-tag :type="row.usageSource === 'vendor' ? 'success' : row.usageSource === 'estimate' ? 'warning' : 'info'" size="small">
              {{ SOURCE_LABEL[row.usageSource] || row.usageSource }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sessions" label="会话数" width="90" align="right" />
        <el-table-column label="时长" width="110" align="right">
          <template #default="{ row }"><span class="num">{{ (row.usedSeconds / 60).toFixed(1) }} 分钟</span></template>
        </el-table-column>
        <el-table-column label="供应商成本（估算）" width="160" align="right">
          <template #default="{ row }"><span class="num">¥{{ Number(row.supplierCostYuan).toFixed(2) }}</span></template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="block">
      <template #header><span>实时语音供应商</span></template>
      <div v-if="provider" class="kv">
        <div>
          <span class="k">当前供应商</span>
          <span>
            <el-tag :type="provider.available ? (provider.isMock ? 'warning' : 'success') : 'info'" size="small">
              {{ provider.isMock ? '模拟（仅测试）' : provider.available ? '已接通' : '暂未开放' }}
            </el-tag>
            <span class="num" style="margin-left:8px">{{ provider.providerId }}</span>
          </span>
        </div>
        <div><span class="k">说明</span><span>{{ provider.opsNote }}</span></div>
        <div><span class="k">用户化名密钥</span><el-tag :type="provider.userRefStable ? 'success' : 'warning'" size="small">{{ provider.userRefStable ? '已配置' : '未配置（上线前必须配置）' }}</el-tag></div>
        <el-table :data="capabilityRows" size="small" border>
          <el-table-column prop="label" label="能力" min-width="200" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="row.state === 'supported' ? 'success' : row.state === 'unsupported' ? 'danger' : 'info'" size="small">{{ CAP_STATE[row.state] }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <p class="muted">「待确认」表示尚无商业文档与联调证据，页面与业务一律按不可用处理。</p>
      </div>
      <el-empty v-else-if="!providerLoading" description="无权查看或加载失败" :image-size="60" />
    </el-card>

    <el-card shadow="never" class="block">
      <template #header><span>语音异常（需人工对账或排查）</span></template>
      <div v-if="anomalies" class="kv">
        <div><span class="k">时长未知的会话（未扣额度）</span><span class="num strong">{{ anomalies.unknownUsageSessions }}</span></div>
        <div><span class="k">按估算结算、待核对账单</span><span class="num">{{ anomalies.estimatedUsageSessions }}</span></div>
        <div><span class="k">未匹配到会话的用量回调</span><span class="num">{{ anomalies.unmatchedUsageEvents }}</span></div>
        <div><span class="k">卡住超过 15 分钟的会话</span><span class="num">{{ anomalies.stuckSessions }}</span></div>
        <el-table :data="anomalies.failedProviderAttempts" size="small" border empty-text="无失败的供应商调用">
          <el-table-column prop="operation" label="操作" width="90" />
          <el-table-column prop="outcome" label="结果" width="110" />
          <el-table-column prop="errorCode" label="错误码" min-width="120" />
          <el-table-column prop="count" label="次数" width="80" align="right" />
        </el-table>
      </div>
    </el-card>

    <el-card shadow="never" class="block">
      <template #header>
        <div class="card-head">
          <span>语音会话明细（用户标识已脱敏，不含对话内容）</span>
          <el-select v-model="sessionFilter.usageState" size="small" clearable placeholder="用量状态" style="width:150px" @change="loadSessions(1)">
            <el-option v-for="(v, k) in USAGE_LABEL" :key="k" :label="v" :value="k" />
          </el-select>
        </div>
      </template>
      <el-table v-loading="sessionsLoading" :data="sessions" size="small" border empty-text="暂无会话">
        <el-table-column label="开始时间" width="160"><template #default="{ row }">{{ fmtDate(row.startedAt) }}</template></el-table-column>
        <el-table-column prop="user" label="用户" width="100" />
        <el-table-column prop="scene" label="场景" width="130" />
        <el-table-column label="供应商" width="120"><template #default="{ row }">{{ row.provider }}<el-tag v-if="row.isMock" size="small" type="warning" style="margin-left:4px">模拟</el-tag></template></el-table-column>
        <el-table-column prop="status" label="状态" width="90" />
        <el-table-column label="用量" width="160"><template #default="{ row }">{{ USAGE_LABEL[row.usageState] || row.usageState }}<span v-if="row.usedSeconds != null" class="num"> · {{ row.usedSeconds }}s</span></template></el-table-column>
        <el-table-column prop="technicalOutcome" label="技术结果" width="100" />
        <el-table-column prop="answerCompleteness" label="回答完整" width="90" />
        <el-table-column prop="userSatisfaction" label="用户评价" width="100" />
        <el-table-column prop="endReason" label="结束原因" min-width="140" />
      </el-table>
      <el-pagination
        v-if="sessionTotal > 20"
        style="margin-top:8px"
        layout="prev, pager, next"
        :total="sessionTotal"
        :page-size="20"
        :current-page="sessionPage"
        @current-change="loadSessions"
      />
    </el-card>

    <el-card shadow="never" class="block">
      <template #header><span>语音额度</span></template>
      <el-form inline size="small" @submit.prevent>
        <el-form-item label="归属">
          <el-select id="xo-owner-type" v-model="quota.ownerType" style="width:110px">
            <el-option label="用户" value="user" />
            <el-option label="圈子" value="circle" />
          </el-select>
        </el-form-item>
        <el-form-item label="ID">
          <el-input id="xo-owner-id" v-model="quota.ownerId" placeholder="用户 ID 或圈子 ID" style="width:280px" clearable />
        </el-form-item>
        <el-form-item>
          <el-button :loading="quotaLoading" @click="loadQuota">查询</el-button>
        </el-form-item>
      </el-form>

      <template v-if="quotaInfo">
        <div class="kv inline">
          <div><span class="k">余额</span><span class="num">{{ minutes(quotaInfo.balanceSeconds) }}</span></div>
          <div><span class="k">通话中预留</span><span class="num">{{ minutes(quotaInfo.reservedSeconds) }}</span></div>
          <div><span class="k">可用</span><span class="num strong">{{ minutes(quotaInfo.availableSeconds) }}</span></div>
        </div>

        <el-form v-if="canGrant" inline size="small" class="grant" @submit.prevent>
          <el-form-item label="发放">
            <el-input-number id="xo-grant-minutes" v-model="grant.minutes" :min="1" :max="100000" controls-position="right" style="width:130px" />
            <span class="unit">分钟</span>
          </el-form-item>
          <el-form-item label="原因">
            <el-input id="xo-grant-reason" v-model="grant.reason" placeholder="如：内测补偿、圈主预付" style="width:240px" maxlength="200" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="granting" @click="doGrant">确认发放</el-button>
          </el-form-item>
        </el-form>

        <el-table :data="quotaInfo.ledger" size="small" border empty-text="暂无流水">
          <el-table-column label="时间" width="160">
            <template #default="{ row }">{{ fmtDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="类型" width="90">
            <template #default="{ row }">{{ LEDGER_LABEL[row.type] || row.type }}</template>
          </el-table-column>
          <el-table-column label="变动" width="110" align="right">
            <template #default="{ row }"><span class="num" :class="row.seconds < 0 ? 'neg' : 'pos'">{{ row.seconds > 0 ? '+' : '' }}{{ (row.seconds / 60).toFixed(1) }} 分</span></template>
          </el-table-column>
          <el-table-column label="变动后余额" width="120" align="right">
            <template #default="{ row }"><span class="num">{{ minutes(row.balanceAfter) }}</span></template>
          </el-table-column>
          <el-table-column prop="note" label="说明" min-width="200" />
        </el-table>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { xiaobuOpsApi, type XiaobuUsage, type QuotaInfo, type ProviderStatus, type VoiceAnomalies, type AdminVoiceSession } from "@/api/xiaobu-ops";
import { useAuthStore } from "@/store/auth";

const CAP_LABEL: Record<string, string> = {
  sessionIssue: "服务端签发会话（临时凭据）",
  sessionEnd: "服务端结束会话并停止计费",
  usageCallback: "真实用量回调",
  callbackSignature: "回调签名校验",
  userIdentityToMcp: "向 MCP 传递已验证用户身份",
  agentConfigPush: "按智能体下发角色/提示词/音色",
  deviceBinding: "商业固件设备映射",
  memoryControl: "记忆加载/删除/重置",
  answerCompleteness: "回答完整性信号",
  audioRecording: "实时对话录音（热卜默认不录不存）",
};
const CAP_STATE: Record<string, string> = { supported: "支持", unsupported: "不支持", unknown: "待确认" };
const USAGE_LABEL: Record<string, string> = {
  none: "无用量",
  pending: "等待回调",
  vendor: "供应商用量",
  estimated: "估算·待对账",
  unknown: "未知·待对账",
  mock: "模拟",
};

const SCENE_LABEL: Record<string, string> = {
  paipan_report: "排盘报告生成",
  paipan_report_dialogue: "报告问答",
  classic_translate: "古籍白话翻译",
  classic_punctuate: "古籍按需断句",
  classic_companion: "古籍伴读",
  circle_assistant: "圈主助理",
};
const SOURCE_LABEL: Record<string, string> = { vendor: "供应商用量", estimate: "估算·待对账", unsettled: "未结算" };
const MODE_LABEL: Record<string, string> = { answer: "正常回答", out_of_report: "超出报告范围", crisis_referral: "危机转介" };
const LEDGER_LABEL: Record<string, string> = { grant: "发放", consume: "通话消耗", refund: "退回", adjust: "调整" };

const days = ref(7);
const usage = ref<XiaobuUsage | null>(null);
const usageLoading = ref(false);
const usageError = ref("");

const quota = reactive({ ownerType: "user" as "user" | "circle", ownerId: "" });
/** 发放与对账分离：财务只读（后端同样拦截），界面上不给发放按钮 */
const auth = useAuthStore();
const canGrant = computed(() => auth.roles.includes("SUPER_ADMIN") || auth.roles.includes("OPERATION_ADMIN"));

const provider = ref<ProviderStatus | null>(null);
const providerLoading = ref(false);
const anomalies = ref<VoiceAnomalies | null>(null);
const sessions = ref<AdminVoiceSession[]>([]);
const sessionTotal = ref(0);
const sessionPage = ref(1);
const sessionsLoading = ref(false);
const sessionFilter = reactive({ usageState: "" });
const capabilityRows = computed(() =>
  provider.value ? Object.entries(provider.value.capabilities).map(([k, state]) => ({ label: CAP_LABEL[k] || k, state })) : [],
);
const quotaInfo = ref<QuotaInfo | null>(null);
const quotaLoading = ref(false);
const grant = reactive({ minutes: 30, reason: "" });
const granting = ref(false);

function minutes(sec: number) {
  return `${(sec / 60).toFixed(1)} 分钟`;
}
function fmtDate(d: string) {
  return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "-";
}
function errMsg(e: unknown, fallback: string) {
  const anyE = e as { response?: { data?: { message?: string } }; message?: string };
  return anyE?.response?.data?.message || anyE?.message || fallback;
}

async function loadUsage() {
  usageLoading.value = true;
  usageError.value = "";
  try {
    usage.value = await xiaobuOpsApi.usage(days.value);
  } catch (e) {
    usageError.value = errMsg(e, "统计加载失败，请刷新重试");
  } finally {
    usageLoading.value = false;
  }
}

async function loadQuota() {
  if (!quota.ownerId.trim()) {
    ElMessage.warning("请输入用户 ID 或圈子 ID");
    return;
  }
  quotaLoading.value = true;
  try {
    quotaInfo.value = await xiaobuOpsApi.quota(quota.ownerType, quota.ownerId.trim());
  } catch (e) {
    ElMessage.error(errMsg(e, "查询失败"));
  } finally {
    quotaLoading.value = false;
  }
}

async function doGrant() {
  if (!grant.reason.trim() || grant.reason.trim().length < 2) {
    ElMessage.warning("请填写发放原因");
    return;
  }
  try {
    await ElMessageBox.confirm(
      `向${quota.ownerType === "user" ? "用户" : "圈子"} ${quota.ownerId} 发放 ${grant.minutes} 分钟语音额度？`,
      "确认发放",
      { type: "warning", confirmButtonText: "发放", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  granting.value = true;
  // 同一次确认只生成一个请求号：网络重试不会重复发放
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    const r = await xiaobuOpsApi.grant({ ownerType: quota.ownerType, ownerId: quota.ownerId.trim(), minutes: grant.minutes, reason: grant.reason.trim(), requestId });
    ElMessage.success(r.duplicated ? "该请求已发放过，未重复发放" : "已发放");
    grant.reason = "";
    loadQuota();
  } catch (e) {
    ElMessage.error(errMsg(e, "发放失败"));
  } finally {
    granting.value = false;
  }
}

async function loadProvider() {
  providerLoading.value = true;
  try {
    provider.value = await xiaobuOpsApi.provider();
  } catch {
    provider.value = null;
  } finally {
    providerLoading.value = false;
  }
  try {
    anomalies.value = await xiaobuOpsApi.anomalies(days.value);
  } catch {
    anomalies.value = null;
  }
}

async function loadSessions(page = 1) {
  sessionsLoading.value = true;
  sessionPage.value = page;
  try {
    const r = await xiaobuOpsApi.sessions({ page, pageSize: 20, usageState: sessionFilter.usageState || undefined });
    sessions.value = r.items;
    sessionTotal.value = r.total;
  } catch (e) {
    sessions.value = [];
    ElMessage.error(errMsg(e, "会话加载失败"));
  } finally {
    sessionsLoading.value = false;
  }
}

onMounted(() => {
  loadUsage();
  loadProvider();
  loadSessions(1);
});
</script>

<style scoped>
.xo-page { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.page-header h3 { margin: 0 0 6px; }
.sub { margin: 0; max-width: 72ch; color: var(--color-text-body, #606266); font-size: 13px; line-height: 1.6; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
.block-wide { grid-column: 1 / -1; }
.kv { display: flex; flex-direction: column; gap: 10px; font-size: 13px; }
.kv > div { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.kv.inline { flex-direction: row; flex-wrap: wrap; gap: 28px; margin: 8px 0 16px; }
.kv.inline > div { justify-content: flex-start; }
.k { color: var(--color-text-secondary, #909399); }
.num { font-variant-numeric: tabular-nums; }
.strong { font-weight: 600; }
.neg { color: var(--el-color-danger, #f56c6c); }
.pos { color: var(--el-color-success, #67c23a); }
.muted { margin: 4px 0 0; color: var(--color-text-secondary, #909399); font-size: 12px; line-height: 1.6; }
.grant { margin-bottom: 12px; }
.unit { margin-left: 6px; color: var(--color-text-secondary, #909399); }
.card-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
</style>
