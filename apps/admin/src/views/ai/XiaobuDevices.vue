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
        <el-table-column prop="disabledReason" label="停用原因" min-width="140" />
        <el-table-column v-if="canWrite" label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'unbound'" link type="primary" size="small" @click="issueCode(row)">生成绑定码</el-button>
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

    <el-dialog v-model="registerOpen" title="登记设备" width="460px">
      <el-form label-width="90px" size="small" @submit.prevent>
        <el-form-item label="序列号"><el-input v-model="form.serial" maxlength="64" placeholder="设备铭牌序列号；小智协议终端填 MAC（带不带冒号均可）" /></el-form-item>
        <el-form-item label="SKU"><el-input v-model="form.productSku" maxlength="64" placeholder="公版硬件型号" /></el-form-item>
        <el-form-item label="所属圈子"><el-input v-model="form.circleId" maxlength="64" placeholder="可选：圈主产品对应的圈子 ID" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="registerOpen = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" @click="register">登记</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="codeOpen" title="一次性绑定码" width="420px">
      <p class="code">{{ code?.bindCode }}</p>
      <p class="muted">只显示这一次，请印入二维码或交给用户。有效期至 {{ code ? new Date(code.expiresAt).toLocaleString('zh-CN', { hour12: false }) : '' }}，用后即失效。</p>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { xiaobuOpsApi, type AdminDevice, type XiaozhiTerminal } from "@/api/xiaobu-ops";
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
const form = reactive({ serial: "", productSku: "", circleId: "" });
const codeOpen = ref(false);
const code = ref<{ bindCode: string; expiresAt: string } | null>(null);
const terminals = ref<XiaozhiTerminal[]>([]);
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
    await xiaobuOpsApi.registerDevice({ serial: form.serial.trim(), productSku: form.productSku.trim(), circleId: form.circleId.trim() || undefined });
    ElMessage.success("已登记");
    registerOpen.value = false;
    form.serial = "";
    load(1);
  } catch (e) {
    ElMessage.error(errMsg(e, "登记失败"));
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

async function enable(row: AdminDevice) {
  try {
    await xiaobuOpsApi.enableDevice(row.id);
    ElMessage.success("已恢复");
    load(page.value);
  } catch (e) {
    ElMessage.error(errMsg(e, "恢复失败"));
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

onMounted(() => {
  load(1);
  if (canWrite.value) loadTerminals();
});
</script>

<style scoped>
.xd-page { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.page-header h3 { margin: 0 0 6px; }
.sub { margin: 0; max-width: 80ch; color: var(--color-text-body, #606266); font-size: 13px; line-height: 1.6; }
.code { font-size: 22px; font-weight: 700; letter-spacing: 3px; font-variant-numeric: tabular-nums; word-break: break-all; }
.muted { color: var(--color-text-secondary, #909399); font-size: 12px; line-height: 1.6; }
.card-head { display: flex; justify-content: space-between; align-items: center; }
</style>
