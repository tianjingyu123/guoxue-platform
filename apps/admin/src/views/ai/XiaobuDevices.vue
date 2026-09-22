<template>
  <div class="xd-page">
    <div class="page-header">
      <div>
        <h3>小卜硬件台账</h3>
        <p class="sub">
          公版硬件登记、绑定码发放、停用与恢复。序列号只存密钥哈希与末四位；绑定人只显示脱敏标识。
          商业固件与语音接口接通前，设备语音一律为「待开通」，这里的状态流转只验证热卜侧台账，不等于真实硬件验收。
        </p>
      </div>
      <el-button v-if="canWrite" type="primary" size="small" @click="registerOpen = true">登记设备</el-button>
    </div>

    <el-card v-if="canWrite" shadow="never" data-testid="terminal-overview">
      <template #header>
        <div class="card-head">
          <span>运行概况</span>
          <el-button size="small" link type="primary" @click="loadOverview">刷新</el-button>
        </div>
      </template>
      <p class="muted" style="margin:0 0 10px">
        设备平时不保持长连接，只在开机检查和对话时联系服务器，所以这里看「近 24 小时/7 天联网过」而不是「实时在线」。
        计数按北京时间自然日，只计次数、不记设备与用户。
      </p>
      <div v-if="overview" class="ov-grid">
        <div class="ov-item"><div class="ov-num">{{ overview.ledger.bound ?? 0 }}</div><div class="muted">已绑定</div></div>
        <div class="ov-item"><div class="ov-num">{{ overview.ledger.unbound ?? 0 }}</div><div class="muted">未绑定</div></div>
        <div class="ov-item"><div class="ov-num">{{ overview.ledger.disabled ?? 0 }}</div><div class="muted">已停用</div></div>
        <div class="ov-item"><div class="ov-num">{{ overview.seen.last24h }}</div><div class="muted">近 24 小时联网</div></div>
        <div class="ov-item"><div class="ov-num">{{ overview.seen.last7d }}</div><div class="muted">近 7 天联网</div></div>
        <div class="ov-item"><div class="ov-num">{{ overview.talkingNow }}</div><div class="muted">正在对话</div></div>
        <div class="ov-item"><div class="ov-num" :class="{ bad: overview.seen.unregistered > 0 }">{{ overview.seen.unregistered }}</div><div class="muted">上报但未登记</div></div>
      </div>
      <div v-if="overview && Object.keys(overview.firmware).length" class="ov-fw">
        <span class="muted">固件分布（已登记）：</span>
        <el-tag v-for="(n, k) in overview.firmware" :key="k" size="small" type="info" style="margin:0 6px 6px 0">{{ k }} × {{ n }}</el-tag>
      </div>
      <el-table v-if="overview" :data="overview.days" size="small" border style="margin-top:8px">
        <el-table-column label="日期" width="100"><template #default="{ row }">{{ row.day.slice(4, 6) }}-{{ row.day.slice(6) }}</template></el-table-column>
        <el-table-column label="开机检查" width="90"><template #default="{ row }">{{ row.counts.ota ?? 0 }}</template></el-table-column>
        <el-table-column label="对话连接" width="90"><template #default="{ row }">{{ row.counts.ws_open ?? 0 }}</template></el-table-column>
        <el-table-column label="鉴权失败" width="90"><template #default="{ row }"><span :class="{ bad: (row.counts.auth_fail ?? 0) > 0 }">{{ row.counts.auth_fail ?? 0 }}</span></template></el-table-column>
        <el-table-column label="身份不符" width="90"><template #default="{ row }"><span :class="{ bad: (row.counts.identity_mismatch ?? 0) > 0 }">{{ row.counts.identity_mismatch ?? 0 }}</span></template></el-table-column>
        <el-table-column label="限流" width="70"><template #default="{ row }"><span :class="{ bad: (row.counts.ota_throttled ?? 0) > 0 }">{{ row.counts.ota_throttled ?? 0 }}</span></template></el-table-column>
        <el-table-column label="结束原因" min-width="320">
          <template #default="{ row }">
            <span v-for="(n, k) in endReasons(row.counts)" :key="k" class="reason" :class="{ bad: BAD_END.includes(String(k)) }">{{ END_TEXT[k] || k }} {{ n }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never">
      <el-form inline size="small" @submit.prevent>
        <el-form-item label="状态">
          <el-select v-model="filter.status" clearable placeholder="全部" style="width:140px" @change="load(1)">
            <el-option v-for="(v, k) in STATUS" :key="k" :label="v" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="圈子 ID">
          <el-input v-model="filter.circleId" clearable style="width:240px" @change="load(1)" />
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="items" size="small" border empty-text="暂无设备">
        <el-table-column label="序列号尾号" width="110"><template #default="{ row }">…{{ row.serialHint }}</template></el-table-column>
        <el-table-column prop="productSku" label="SKU" width="140" />
        <el-table-column prop="circleId" label="所属圈子" min-width="160" />
        <el-table-column label="状态" width="100"><template #default="{ row }">{{ STATUS[row.status] || row.status }}</template></el-table-column>
        <el-table-column prop="bindingVersion" label="绑定代次" width="90" align="right" />
        <el-table-column prop="currentUserMasked" label="绑定人" width="110" />
        <el-table-column label="语音" width="110">
          <template #default="{ row }"><el-tag :type="row.voiceReady ? 'success' : 'info'" size="small">{{ row.voiceReady ? '可用' : '待开通' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="设备身份" width="110">
          <template #default="{ row }">
            <el-tooltip :content="row.terminalPinned ? (row.terminalPinSource === 'factory' ? '出厂预置设备 ID，登记即锁定' : '首次联网时锁定') : '未锁定：下次联网时锁定（未绑定设备有被抢先激活的风险，量产请出厂预置）'" placement="top">
              <el-tag :type="row.terminalPinned ? 'success' : 'warning'" size="small">{{ row.terminalPinned ? (row.terminalPinSource === 'factory' ? '出厂锁定' : '已锁定') : '未锁定' }}</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="disabledReason" label="停用原因" min-width="140" />
        <el-table-column v-if="canWrite" label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'unbound'" link type="primary" size="small" @click="issueCode(row)">生成绑定码</el-button>
            <el-button v-if="row.terminalPinned" link type="warning" size="small" @click="resetIdentity(row)">重置身份</el-button>
            <el-button v-if="row.status !== 'disabled'" link type="danger" size="small" @click="disable(row)">停用</el-button>
            <el-button v-else link type="primary" size="small" @click="enable(row)">恢复</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-if="total > 20" style="margin-top:8px" layout="prev, pager, next" :total="total" :page-size="20" :current-page="page" @current-change="load" />
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-head">
          <span>终端上报（小智协议终端）</span>
          <el-button size="small" link type="primary" @click="loadTerminals">刷新</el-button>
        </div>
      </template>
      <p class="muted" style="margin:0 0 8px">
        设备 OTA 地址改为热卜后，开机会上报型号、芯片与固件版本（不含网络与位置信息）。未登记的终端连不上热卜、也不会回退到官方云；
        在这里核对后一键登记，设备重启后会播报数字激活码，用户在 App「我的硬件」输入即可绑定。
      </p>
      <el-table v-loading="terminalsLoading" :data="terminals" size="small" border empty-text="暂无终端上报">
        <el-table-column label="MAC 尾号" width="100"><template #default="{ row }">…{{ row.serialHint }}</template></el-table-column>
        <el-table-column label="芯片" width="110"><template #default="{ row }">{{ row.info.chipModel || "-" }}</template></el-table-column>
        <el-table-column label="板卡" min-width="160"><template #default="{ row }">{{ row.info.boardName || row.info.boardType || "-" }}</template></el-table-column>
        <el-table-column label="固件" min-width="150"><template #default="{ row }">{{ [row.info.firmwareName, row.info.firmwareVersion].filter(Boolean).join(" ") || "-" }}</template></el-table-column>
        <el-table-column label="最近上报" width="160"><template #default="{ row }">{{ new Date(row.lastSeenAt).toLocaleString("zh-CN", { hour12: false }) }}</template></el-table-column>
        <el-table-column label="台账" width="100"><template #default="{ row }">{{ row.registered ? STATUS[row.status] || row.status || "已登记" : "未登记" }}</template></el-table-column>
        <el-table-column v-if="canWrite" label="操作" width="100">
          <template #default="{ row }">
            <el-button v-if="row.canRegister" link type="primary" size="small" @click="registerTerminal(row)">登记</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-if="canWrite" shadow="never">
      <template #header>
        <div class="card-head">
          <span>固件发布（在线升级）</span>
          <el-button size="small" link type="primary" @click="loadFirmware">刷新</el-button>
        </div>
      </template>
      <p class="muted" style="margin:0 0 8px">
        上传 build 目录下的程序固件（xiaozhi.bin，不是合并镜像），版本号、芯片由系统从固件里读出。按板型发布、按比例灰度：
        设备开机检查时，只有已登记、在灰度范围内、版本更旧的设备会升级。设备端启动失败会自动退回旧版；同一台推 3 次仍没升上去就停止推送。
        建议先 1%—10% 观察成功率，再放量；有异常随时暂停。
      </p>
      <el-form inline size="small" @submit.prevent>
        <el-form-item label="板型"><el-input v-model="fwForm.boardName" style="width:200px" placeholder="如 xmini-c3-rebu-test" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="fwForm.notes" style="width:260px" maxlength="200" placeholder="本次更新内容" /></el-form-item>
        <el-form-item>
          <input ref="fwFileInput" type="file" accept=".bin" data-testid="fw-file" @change="onFwFile" />
        </el-form-item>
        <el-form-item><el-button type="primary" :loading="fwUploading" data-testid="fw-upload" @click="uploadFirmware">上传</el-button></el-form-item>
      </el-form>
      <el-table v-loading="fwLoading" :data="firmware" size="small" border empty-text="暂无固件发布">
        <el-table-column prop="boardName" label="板型" min-width="150" />
        <el-table-column prop="version" label="版本" width="90" />
        <el-table-column prop="chipName" label="芯片" width="90" />
        <el-table-column label="大小" width="90"><template #default="{ row }">{{ (row.size / 1048576).toFixed(2) }} MB</template></el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : row.status === 'paused' ? 'warning' : 'info'" size="small">{{ FW_STATUS[row.status] }}</el-tag>
            <span v-if="row.status === 'active'" class="muted"> {{ row.rolloutPercent }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="推送 / 成功 / 失败" width="140">
          <template #default="{ row }">{{ row.stats?.offered ?? 0 }} / {{ row.stats?.succeeded ?? 0 }} / <span :class="{ bad: (row.stats?.failed ?? 0) > 0 }">{{ row.stats?.failed ?? 0 }}</span></template>
        </el-table-column>
        <el-table-column prop="notes" label="说明" min-width="140" />
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status !== 'archived'" link type="primary" size="small" @click="rolloutFirmware(row)">{{ row.status === 'active' ? '调整灰度' : '开始灰度' }}</el-button>
            <el-button v-if="row.status === 'active'" link type="warning" size="small" @click="pauseFirmware(row)">暂停</el-button>
            <el-button v-if="row.status !== 'archived' && row.status !== 'active'" link type="danger" size="small" @click="archiveFirmware(row)">归档</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="registerOpen" title="登记设备" width="560px">
      <el-radio-group v-model="registerMode" size="small" style="margin-bottom:12px">
        <el-radio-button value="single">单台</el-radio-button>
        <el-radio-button value="batch">批量（出厂/入库）</el-radio-button>
      </el-radio-group>
      <el-form label-width="90px" size="small" @submit.prevent>
        <el-form-item v-if="registerMode === 'single'" label="序列号"><el-input v-model="form.serial" maxlength="64" placeholder="设备铭牌序列号；小智协议终端填 MAC（带不带冒号均可）" /></el-form-item>
        <el-form-item v-if="registerMode === 'single'" label="设备 ID"><el-input v-model="form.clientId" maxlength="64" placeholder="可选：出厂写入的设备 ID（UUID），填了即锁定身份，防止被抢先激活" /></el-form-item>
        <el-form-item v-else label="序列号">
          <el-input v-model="batchText" type="textarea" :rows="8" data-testid="batch-serials" placeholder="每行「MAC,设备ID」（设备 ID 为出厂写入的 UUID，可省略但建议带上），最多 500 行；可直接粘贴出厂清单 CSV，表头行自动跳过" />
          <div class="muted">识别到 {{ batchSerials.length }} 行</div>
        </el-form-item>
        <el-form-item label="SKU"><el-input v-model="form.productSku" maxlength="64" placeholder="公版硬件型号" /></el-form-item>
        <el-form-item label="所属圈子"><el-input v-model="form.circleId" maxlength="64" placeholder="可选：圈主产品对应的圈子 ID" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="registerOpen = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" data-testid="register-submit" @click="registerMode === 'single' ? register() : registerBatch()">登记</el-button>
      </template>
      <div v-if="batchResult" class="batch-result" data-testid="batch-result">
        <p>共 {{ batchResult.total }} 行，成功 {{ batchResult.succeeded }}，失败 {{ batchResult.total - batchResult.succeeded }}</p>
        <el-table v-if="batchResult.results.some((r) => !r.ok)" :data="batchResult.results.filter((r) => !r.ok)" size="small" border max-height="200">
          <el-table-column prop="line" label="行" width="60" />
          <el-table-column prop="serialHint" label="末四位" width="80" />
          <el-table-column prop="error" label="原因" />
        </el-table>
      </div>
    </el-dialog>

    <el-dialog v-model="codeOpen" title="一次性绑定码" width="420px">
      <p class="code">{{ code?.bindCode }}</p>
      <p class="muted">只显示这一次，请印入二维码或交给用户。有效期至 {{ code ? new Date(code.expiresAt).toLocaleString('zh-CN', { hour12: false }) : '' }}，用后即失效。</p>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { xiaobuOpsApi, type AdminDevice, type BatchRegisterResult, type FirmwareRelease, type TerminalOverview, type XiaozhiTerminal } from "@/api/xiaobu-ops";
import { useAuthStore } from "@/store/auth";

const STATUS: Record<string, string> = { unbound: "未绑定", bound: "已绑定", transfer_pending: "转赠中", disabled: "已停用" };

const auth = useAuthStore();
/** 客服只读；登记、发码、停用限运营与超管（后端同样拦截） */
const canWrite = computed(() => auth.roles.includes("SUPER_ADMIN") || auth.roles.includes("OPERATION_ADMIN"));

const items = ref<AdminDevice[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const filter = reactive({ status: "", circleId: "" });
const registerOpen = ref(false);
const saving = ref(false);
const form = reactive({ serial: "", clientId: "", productSku: "", circleId: "" });
const registerMode = ref<"single" | "batch">("single");
const batchText = ref("");
const batchResult = ref<BatchRegisterResult | null>(null);
/** 每行「MAC[,设备ID]」；CSV 取前两列；跳过明显的表头行 */
const batchSerials = computed(() =>
  batchText.value
    .split(/\r?\n/)
    .map((l) => l.split(/[,\t;]/).slice(0, 2).map((c) => c.trim().replace(/^"|"$/g, "")).filter(Boolean).join(","))
    .filter((l) => l && !/^(mac|serial|序列号|设备号|sn)(,|$)/i.test(l)),
);
const overview = ref<TerminalOverview | null>(null);
const END_TEXT: Record<string, string> = {
  "end:device_hangup": "设备挂断",
  "end:device_disconnect": "断线",
  "end:idle_timeout": "无语音超时",
  "end:session_limit": "时长到",
  "end:provider_unavailable": "服务未开放",
  "end:session_rejected": "开会话被拒",
  "end:relay_failed": "中继失败",
  "end:provider_error": "服务出错",
  "end:hello_timeout": "握手超时",
  "end:replaced_by_new_connection": "被新连接顶替",
};
/** 需要关注的结束原因 */
const BAD_END = ["end:device_disconnect", "end:relay_failed", "end:provider_error", "end:hello_timeout", "end:session_rejected"];
function endReasons(counts: Record<string, number>) {
  return Object.fromEntries(Object.entries(counts).filter(([k]) => k.startsWith("end:")));
}
async function loadOverview() {
  try {
    overview.value = await xiaobuOpsApi.terminalOverview();
  } catch (e) {
    ElMessage.error(errMsg(e, "运行概况加载失败"));
  }
}
const codeOpen = ref(false);
const code = ref<{ bindCode: string; expiresAt: string } | null>(null);
const terminals = ref<XiaozhiTerminal[]>([]);
const FW_STATUS: Record<string, string> = { draft: "草稿", active: "推送中", paused: "已暂停", archived: "已归档" };
const firmware = ref<FirmwareRelease[]>([]);
const fwLoading = ref(false);
const fwUploading = ref(false);
const fwForm = reactive({ boardName: "", notes: "" });
const fwFile = ref<File | null>(null);
const fwFileInput = ref<HTMLInputElement | null>(null);
const terminalsLoading = ref(false);

function errMsg(e: unknown, fallback: string) {
  const anyE = e as { response?: { data?: { message?: string } }; message?: string };
  return anyE?.response?.data?.message || anyE?.message || fallback;
}

async function load(p = 1) {
  loading.value = true;
  page.value = p;
  try {
    const r = await xiaobuOpsApi.devices({ page: p, pageSize: 20, status: filter.status || undefined, circleId: filter.circleId.trim() || undefined });
    items.value = r.items;
    total.value = r.total;
  } catch (e) {
    ElMessage.error(errMsg(e, "加载失败"));
  } finally {
    loading.value = false;
  }
}

async function register() {
  if (!form.serial.trim() || !form.productSku.trim()) {
    ElMessage.warning("请填写序列号与 SKU");
    return;
  }
  saving.value = true;
  try {
    await xiaobuOpsApi.registerDevice({
      serial: form.serial.trim(),
      productSku: form.productSku.trim(),
      circleId: form.circleId.trim() || undefined,
      clientId: form.clientId.trim() || undefined,
    });
    ElMessage.success("已登记");
    registerOpen.value = false;
    form.serial = "";
    form.clientId = "";
    load(1);
  } catch (e) {
    ElMessage.error(errMsg(e, "登记失败"));
  } finally {
    saving.value = false;
  }
}

async function registerBatch() {
  const serials = batchSerials.value;
  if (!serials.length || !form.productSku.trim()) {
    ElMessage.warning("请粘贴序列号并填写 SKU");
    return;
  }
  if (serials.length > 500) {
    ElMessage.warning("单次最多 500 行，请分批");
    return;
  }
  saving.value = true;
  batchResult.value = null;
  try {
    const r = await xiaobuOpsApi.registerDeviceBatch({ serials, productSku: form.productSku.trim(), circleId: form.circleId.trim() || undefined });
    batchResult.value = r;
    if (r.succeeded === r.total) {
      ElMessage.success(`已登记 ${r.succeeded} 台`);
      batchText.value = "";
    } else {
      ElMessage.warning(`成功 ${r.succeeded} 台，失败 ${r.total - r.succeeded} 行，见下方明细`);
      // 只留下失败的行，方便修正后重新提交
      const failed = new Set(r.results.filter((x) => !x.ok).map((x) => x.line));
      batchText.value = serials.filter((_, i) => failed.has(i + 1)).join("\n");
    }
    load(1);
    loadOverview();
  } catch (e) {
    ElMessage.error(errMsg(e, "批量登记失败"));
  } finally {
    saving.value = false;
  }
}

async function issueCode(row: AdminDevice) {
  try {
    code.value = await xiaobuOpsApi.bindCode(row.id);
    codeOpen.value = true;
  } catch (e) {
    ElMessage.error(errMsg(e, "生成失败"));
  }
}

async function disable(row: AdminDevice) {
  let reason = "";
  try {
    const r = await ElMessageBox.prompt("停用后该设备不能发起语音会话，也不能被解绑或转赠。请填写原因：", "停用设备", {
      inputValidator: (v: string) => (v && v.trim().length > 0) || "请填写原因",
    });
    reason = (r as { value: string }).value.trim();
  } catch {
    return;
  }
  try {
    await xiaobuOpsApi.disableDevice(row.id, reason);
    ElMessage.success("已停用");
    load(page.value);
  } catch (e) {
    ElMessage.error(errMsg(e, "停用失败"));
  }
}

async function resetIdentity(row: AdminDevice) {
  try {
    await ElMessageBox.confirm(
      `重置 …${row.serialHint} 的设备身份：现有连接立即失效，设备下次联网时按新的设备 ID 重新锁定。请先核实是机主本人且设备确实恢复出厂或换过主板。`,
      "重置设备身份",
      { type: "warning" },
    );
  } catch {
    return;
  }
  try {
    const r = await xiaobuOpsApi.resetDeviceIdentity(row.id);
    ElMessage.success(r.message || "已重置");
    load(page.value);
  } catch (e) {
    ElMessage.error(errMsg(e, "重置失败"));
  }
}

async function enable(row: AdminDevice) {
  try {
    await xiaobuOpsApi.enableDevice(row.id);
    ElMessage.success("已恢复");
    load(page.value);
  } catch (e) {
    ElMessage.error(errMsg(e, "恢复失败"));
  }
}

function onFwFile(e: Event) {
  fwFile.value = (e.target as HTMLInputElement).files?.[0] ?? null;
}

async function loadFirmware() {
  fwLoading.value = true;
  try {
    firmware.value = await xiaobuOpsApi.firmwareList();
  } catch (e) {
    ElMessage.error(errMsg(e, "固件列表加载失败"));
  } finally {
    fwLoading.value = false;
  }
}

async function uploadFirmware() {
  if (!fwFile.value || !fwForm.boardName.trim()) {
    ElMessage.warning("请选择固件文件并填写板型");
    return;
  }
  fwUploading.value = true;
  try {
    const r = await xiaobuOpsApi.firmwareUpload(fwFile.value, fwForm.boardName.trim(), fwForm.notes.trim() || undefined);
    ElMessage.success(`已上传：${r.boardName} ${r.version}（草稿，开始灰度后才会推送）`);
    fwForm.notes = "";
    fwFile.value = null;
    if (fwFileInput.value) fwFileInput.value.value = "";
    loadFirmware();
  } catch (e) {
    ElMessage.error(errMsg(e, "上传失败"));
  } finally {
    fwUploading.value = false;
  }
}

async function rolloutFirmware(row: FirmwareRelease) {
  let percent = 0;
  try {
    const r = await ElMessageBox.prompt(`${row.boardName} ${row.version}：推送给多少比例的设备？（1—100，建议先小比例观察）`, "灰度推送", {
      inputValue: String(row.status === "active" ? row.rolloutPercent : 10),
      inputPattern: /^(100|[1-9]\d?)$/,
      inputErrorMessage: "请输入 1—100 的整数",
    });
    percent = Number((r as { value: string }).value);
  } catch {
    return;
  }
  try {
    await xiaobuOpsApi.firmwareRollout(row.id, percent);
    ElMessage.success(`已设为 ${percent}%`);
    loadFirmware();
  } catch (e) {
    ElMessage.error(errMsg(e, "操作失败"));
  }
}

async function pauseFirmware(row: FirmwareRelease) {
  try {
    await xiaobuOpsApi.firmwarePause(row.id);
    ElMessage.success("已暂停推送（已升级的设备不受影响）");
    loadFirmware();
  } catch (e) {
    ElMessage.error(errMsg(e, "暂停失败"));
  }
}

async function archiveFirmware(row: FirmwareRelease) {
  try {
    await ElMessageBox.confirm(`归档后 ${row.boardName} ${row.version} 不再推送、下载链接失效。确定？`, "归档固件", { type: "warning" });
  } catch {
    return;
  }
  try {
    await xiaobuOpsApi.firmwareArchive(row.id);
    ElMessage.success("已归档");
    loadFirmware();
  } catch (e) {
    ElMessage.error(errMsg(e, "归档失败"));
  }
}

async function loadTerminals() {
  terminalsLoading.value = true;
  try {
    terminals.value = await xiaobuOpsApi.terminals();
  } catch (e) {
    ElMessage.error(errMsg(e, "终端列表加载失败"));
  } finally {
    terminalsLoading.value = false;
  }
}

async function registerTerminal(row: XiaozhiTerminal) {
  let sku = "";
  try {
    const r = await ElMessageBox.prompt(`登记 MAC 尾号 …${row.serialHint} 的终端（${row.info.boardName || row.info.boardType || "未知板卡"}）。请填写公版硬件 SKU：`, "登记终端", {
      inputValue: row.info.boardType || "",
      inputValidator: (v: string) => (v && v.trim().length > 0) || "请填写 SKU",
    });
    sku = (r as { value: string }).value.trim();
  } catch {
    return;
  }
  try {
    await xiaobuOpsApi.registerTerminal(row.seenId, { productSku: sku });
    ElMessage.success("已登记；设备重启后会播报激活码");
    loadTerminals();
    load(1);
  } catch (e) {
    ElMessage.error(errMsg(e, "登记失败"));
  }
}

onMounted(() => load(1));
// 角色可能在页面挂载后才从登录信息里载入：权限就绪时再拉运营数据
watch(
  canWrite,
  (ok) => {
    if (!ok) return;
    loadOverview();
    loadTerminals();
    loadFirmware();
  },
  { immediate: true },
);
</script>

<style scoped>
.xd-page { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.page-header h3 { margin: 0 0 6px; }
.sub { margin: 0; max-width: 80ch; color: var(--color-text-body, #606266); font-size: 13px; line-height: 1.6; }
.code { font-size: 22px; font-weight: 700; letter-spacing: 3px; font-variant-numeric: tabular-nums; word-break: break-all; }
.muted { color: var(--color-text-secondary, #909399); font-size: 12px; line-height: 1.6; }
.card-head { display: flex; justify-content: space-between; align-items: center; }
.bad { color: #c41e3a; font-weight: 600; }
.ov-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; }
.ov-item { padding: 10px 12px; border-radius: 8px; background: var(--el-fill-color-light, #f5f7fa); }
.ov-num { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.ov-fw { margin-top: 10px; }
.reason { margin-right: 12px; white-space: nowrap; }
.batch-result { margin-top: 12px; font-size: 13px; }
</style>
