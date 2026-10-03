<template>
  <div class="va-page">
    <div class="page-header">
      <div>
        <h3>小卜语音角色审核</h3>
        <p class="sub">
          圈主提交的语音角色（名称、性格、提示词、音色）在这里审核。审核通过会生成版本快照并发布；服务档位默认 Lite，标准版需确认成本后再开放。规则检查提示仅供参考，不替代人工判断。
        </p>
      </div>
      <el-radio-group v-model="status" size="small" @change="load">
        <el-radio-button value="PENDING_REVIEW">待审核</el-radio-button>
        <el-radio-button value="APPROVED">已发布</el-radio-button>
        <el-radio-button value="REJECTED">已驳回</el-radio-button>
        <el-radio-button value="DISABLED">已停用</el-radio-button>
      </el-radio-group>
    </div>

    <el-alert v-if="loadError" type="error" :closable="false" :title="loadError" show-icon style="margin-bottom:12px" />

    <el-table v-loading="loading" :data="rows" size="small" border>
      <el-table-column label="归属" width="160">
        <template #default="{ row }">
          <div>{{ row.ownerType === 'circle' ? '圈子' : '平台' }}</div>
          <div class="muted">{{ row.ownerId }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="角色名" width="140" />
      <el-table-column label="规则检查" min-width="160">
        <template #default="{ row }">
          <el-tag v-for="f in row.riskFlags" :key="f" type="warning" size="small" class="tag">{{ f }}</el-tag>
          <span v-if="!row.riskFlags.length" class="muted">未命中</span>
        </template>
      </el-table-column>
      <el-table-column label="版本" width="110">
        <template #default="{ row }">
          <div>线上 {{ row.activeVersion ? `v${row.activeVersion}` : '—' }}</div>
          <div class="muted">草稿 v{{ row.draftVersion }}</div>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="150">
        <template #default="{ row }">{{ fmtDate(row.submittedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row)">查看</el-button>
          <el-button v-if="row.status === 'PENDING_REVIEW'" link type="success" size="small" @click="openDetail(row)">审核</el-button>
          <el-button v-if="row.status === 'APPROVED'" link type="danger" size="small" @click="disable(row)">停用</el-button>
          <el-button v-if="row.status !== 'PENDING_REVIEW' && row.activeVersion" link size="small" @click="republish(row)">发布指定版本</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer v-model="detailOpen" :title="current ? `语音角色：${current.name}` : ''" size="560px">
      <template v-if="current">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="状态">{{ STATUS[current.status] }}</el-descriptions-item>
          <el-descriptions-item label="音色">{{ current.voiceId }}</el-descriptions-item>
          <el-descriptions-item label="性格与风格"><div class="pre">{{ current.persona }}</div></el-descriptions-item>
          <el-descriptions-item label="角色提示词"><div class="pre">{{ current.prompt }}</div></el-descriptions-item>
          <el-descriptions-item v-if="current.reviewNote" label="审核备注">{{ current.reviewNote }}</el-descriptions-item>
        </el-descriptions>
        <el-alert
          v-if="current.riskFlags.length"
          type="warning"
          :closable="false"
          show-icon
          :title="`规则检查提示：${current.riskFlags.join('、')}`"
          style="margin-top:12px"
        />
        <div v-if="current.status === 'PENDING_REVIEW'" class="review-box">
          <el-form label-width="80px" size="small">
            <el-form-item label="服务档位">
              <el-radio-group v-model="review.tier">
                <el-radio value="lite">Lite</el-radio>
                <el-radio value="standard">标准版</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="审核意见">
              <el-input id="va-review-note" v-model="review.note" type="textarea" :rows="3" maxlength="300" placeholder="驳回时必填，说明需要修改的地方" />
            </el-form-item>
          </el-form>
          <div class="review-actions">
            <el-button size="small" type="danger" plain :loading="acting" @click="reject">驳回</el-button>
            <el-button size="small" type="primary" :loading="acting" @click="approve">审核通过并发布</el-button>
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { voiceAgentAdminApi, type VoiceAgentRow } from "@/api/voice-agents";

const STATUS: Record<string, string> = {
  DRAFT: "草稿", PENDING_REVIEW: "待审核", APPROVED: "已发布", REJECTED: "已驳回", DISABLED: "已停用",
};

const status = ref("PENDING_REVIEW");
const rows = ref<VoiceAgentRow[]>([]);
const loading = ref(false);
const loadError = ref("");
const detailOpen = ref(false);
const current = ref<VoiceAgentRow | null>(null);
const review = reactive<{ tier: "lite" | "standard"; note: string }>({ tier: "lite", note: "" });
const acting = ref(false);

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "-";
}
function errMsg(e: unknown, fallback: string) {
  const anyE = e as { response?: { data?: { message?: string } }; message?: string };
  return anyE?.response?.data?.message || anyE?.message || fallback;
}

async function load() {
  loading.value = true;
  loadError.value = "";
  try {
    rows.value = await voiceAgentAdminApi.list(status.value);
  } catch (e) {
    loadError.value = errMsg(e, "加载失败，请刷新重试");
  } finally {
    loading.value = false;
  }
}

function openDetail(row: VoiceAgentRow) {
  current.value = row;
  review.tier = "lite";
  review.note = "";
  detailOpen.value = true;
}

async function approve() {
  if (!current.value) return;
  if (review.tier === "standard") {
    try {
      await ElMessageBox.confirm("标准版每分钟成本约为 Lite 的两倍，确认为该角色开放标准版？", "确认档位", { type: "warning" });
    } catch {
      return;
    }
  }
  acting.value = true;
  try {
    await voiceAgentAdminApi.approve(current.value.id, { tier: review.tier, note: review.note || undefined });
    ElMessage.success("已审核通过并发布");
    detailOpen.value = false;
    load();
  } catch (e) {
    ElMessage.error(errMsg(e, "审核失败"));
  } finally {
    acting.value = false;
  }
}

async function reject() {
  if (!current.value) return;
  if (!review.note.trim()) {
    ElMessage.warning("请填写驳回原因，方便圈主修改");
    return;
  }
  acting.value = true;
  try {
    await voiceAgentAdminApi.reject(current.value.id, review.note.trim());
    ElMessage.success("已驳回");
    detailOpen.value = false;
    load();
  } catch (e) {
    ElMessage.error(errMsg(e, "驳回失败"));
  } finally {
    acting.value = false;
  }
}

async function disable(row: VoiceAgentRow) {
  try {
    const { value } = await ElMessageBox.prompt(`停用后「${row.name}」不能再发起语音会话。`, "停用语音角色", {
      inputPlaceholder: "停用原因（可选）", confirmButtonText: "停用", cancelButtonText: "取消",
    });
    await voiceAgentAdminApi.disable(row.id, value || undefined);
    ElMessage.success("已停用");
    load();
  } catch (e) {
    if (e !== "cancel" && e !== "close") ElMessage.error(errMsg(e, "停用失败"));
  }
}

async function republish(row: VoiceAgentRow) {
  try {
    const { value } = await ElMessageBox.prompt("输入要发布的已审核版本号（用于恢复或回滚）", "发布指定版本", {
      inputValue: String(row.activeVersion ?? ""), inputPattern: /^[1-9]\d*$/, inputErrorMessage: "请输入正整数版本号",
      confirmButtonText: "发布", cancelButtonText: "取消",
    });
    await voiceAgentAdminApi.publishVersion(row.id, Number(value));
    ElMessage.success(`已发布 v${value}`);
    load();
  } catch (e) {
    if (e !== "cancel" && e !== "close") ElMessage.error(errMsg(e, "发布失败"));
  }
}

onMounted(load);
</script>

<style scoped>
.va-page { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.page-header h3 { margin: 0 0 6px; }
.sub { margin: 0; max-width: 70ch; color: var(--color-text-body, #606266); font-size: 13px; line-height: 1.6; }
.muted { color: var(--color-text-secondary, #909399); font-size: 12px; }
.tag { margin: 0 4px 4px 0; }
.pre { white-space: pre-wrap; line-height: 1.6; }
.review-box { margin-top: 16px; }
.review-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
