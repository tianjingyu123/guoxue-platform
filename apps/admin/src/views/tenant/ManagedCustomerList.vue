<template>
  <div class="managed-page">
    <PageHeader title="托管客户与品牌应用" description="独立客户按合同授权；品牌分站保持平台交易与既有站长权限。">
      <template #actions><el-button type="primary" @click="openCreate">配置新客户</el-button></template>
    </PageHeader>
    <el-alert class="notice" type="info" :closable="false" title="保存合同配置后，应用仍需完成渠道登记与实例验证才能启用。未知金额可留空；本页不会扣款或自动部署。" />
    <el-alert v-if="error" class="notice" type="error" :closable="false" :title="error"><el-button @click="load">重试</el-button></el-alert>
    <el-table v-loading="loading" :data="customers" empty-text="尚未配置托管客户">
      <el-table-column prop="name" label="客户 / 机构" min-width="170" />
      <el-table-column label="模式" width="150"><template #default="{ row }">{{ row.mode === 'LEASE' ? '独立客户租赁' : '平台品牌分站' }}</template></el-table-column>
      <el-table-column prop="tradingSubject" label="交易服务提供方" min-width="190" />
      <el-table-column label="合同状态" width="150"><template #default="{ row }">{{ statusLabel[row.operatingStatus] || row.operatingStatus }}</template></el-table-column>
      <el-table-column label="合同到期" width="190"><template #default="{ row }">{{ new Date(row.endAt).toLocaleString('zh-CN') }}</template></el-table-column>
      <el-table-column label="操作" width="150"><template #default="{ row }"><el-button link type="primary" @click="inspect(row.id)">应用与审计</el-button></template></el-table-column>
    </el-table>
    <el-dialog v-model="creating" title="配置客户与品牌应用" width="760px" :close-on-click-modal="false" @closed="formError = ''">
      <el-alert v-if="formError" type="error" :title="formError" :closable="false" class="notice" />
      <el-form label-position="top" :model="form" @submit.prevent="save">
        <div class="form-grid">
          <el-form-item label="客户 / 机构名称"><el-input v-model="form.name" maxlength="120" /></el-form-item>
          <el-form-item label="经营模式"><el-select v-model="form.mode"><el-option label="独立客户租赁" value="LEASE" /><el-option label="平台品牌分站" value="BRAND" /></el-select></el-form-item>
          <el-form-item label="应用登记主体"><el-input v-model="form.applicationSubject" maxlength="120" /></el-form-item>
          <el-form-item label="实际交易主体"><el-input v-model="form.tradingSubject" maxlength="120" /><span class="hint">品牌站须填写平台现有协议主体。</span></el-form-item>
          <el-form-item label="应用标识"><el-input v-model="form.applicationId" placeholder="与公共应用登记保持一致" /></el-form-item>
          <el-form-item v-if="form.mode === 'BRAND'" label="既有分站 ID"><el-input v-model="form.stationId" /></el-form-item>
          <el-form-item label="品牌名称"><el-input v-model="form.brandName" maxlength="60" /></el-form-item>
          <el-form-item label="品牌主色"><el-color-picker v-model="form.themeColor" /></el-form-item>
          <el-form-item label="模板"><el-select v-model="form.templateId"><el-option label="圈子社群" value="community" /><el-option label="单智能体" value="single-agent" /></el-select></el-form-item>
          <el-form-item label="年维护金额（待确认可留空）"><el-input v-model="form.maintenancePrice" placeholder="留空表示未定价，不扣款" /></el-form-item>
        </div>
        <el-form-item label="应用平台"><el-checkbox-group v-model="form.platforms"><el-checkbox value="miniprogram">小程序</el-checkbox><el-checkbox value="h5">H5</el-checkbox><template v-if="form.mode === 'LEASE'"><el-checkbox value="android">Android</el-checkbox><el-checkbox value="ios">iOS</el-checkbox><el-checkbox value="harmony">鸿蒙</el-checkbox></template></el-checkbox-group></el-form-item>
        <el-form-item label="合同模块"><el-checkbox-group v-model="form.modules"><el-checkbox value="shop">商城</el-checkbox><el-checkbox value="course">课程</el-checkbox><el-checkbox value="circle">圈子</el-checkbox><el-checkbox value="agent">智能体</el-checkbox></el-checkbox-group></el-form-item>
        <div class="form-grid">
          <el-form-item v-for="kind in resourceKinds" :key="kind.id" :label="kind.label + '资源白名单（逗号分隔）'"><el-input v-model="form.resources[kind.id]" placeholder="留空表示未授权具体资源" /></el-form-item>
          <el-form-item label="允许创建圈子数量"><el-input-number v-model="form.circleLimit" :min="0" :max="10000" :disabled="form.mode === 'BRAND'" /></el-form-item>
          <el-form-item v-for="limit in creationFields" :key="limit.key" :label="limit.label"><el-input-number v-model="form.creationLimits[limit.key]" :min="0" :max="limit.max" :disabled="form.mode === 'BRAND'" /><span class="hint">留空表示未约定。商品、课程、智能体和附件须有明确限额才能新增。</span></el-form-item>
          <el-form-item label="下载授权有效秒数"><el-input-number v-model="form.downloadTtlSeconds" :min="1" :max="86400" /></el-form-item>
          <el-form-item v-for="item in termFields" :key="item.key" :label="item.label"><el-date-picker v-model="form[item.key]" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ" placeholder="按合同填写时间" /></el-form-item>
        </div>
        <template v-if="form.mode === 'LEASE'">
          <el-divider content-position="left">维护人员填写独立部署引用</el-divider>
          <div class="form-grid">
            <el-form-item label="数据空间标识"><el-input v-model="form.spaceKey" /></el-form-item>
            <el-form-item label="数据库名称"><el-input v-model="form.databaseName" /></el-form-item>
            <el-form-item label="最低权限数据库账号"><el-input v-model="form.databaseRole" /></el-form-item>
            <el-form-item label="受限凭据引用"><el-input v-model="form.credentialRef" placeholder="secret-ref:...，请勿输入密码" /></el-form-item>
            <el-form-item label="独立认证密钥 SHA-256 摘要" class="wide"><el-input v-model="form.authKeyFingerprint" placeholder="仅摘要，禁止填写密钥" /></el-form-item>
          </div>
        </template>
        <el-form-item label="配置依据 / 审计原因"><el-input v-model="form.reason" type="textarea" maxlength="500" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="creating = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存合同配置</el-button></template>
    </el-dialog>
    <el-drawer v-model="detailVisible" title="应用归属与操作审计" size="640px">
      <template v-if="selected">
        <p>{{ selected.name }} · {{ selected.mode === 'LEASE' ? '独立客户租赁' : '平台品牌分站' }}</p>
        <p>交易服务提供方：{{ selected.tradingSubject }}</p>
        <p v-if="selected.deployment">实例状态：{{ selected.deployment.state === 'READY' ? '数据库身份已核验' : '待维护核验' }} <el-button link type="primary" @click="verifyDeployment">核验实例</el-button></p>
        <el-table :data="selected.applications">
          <el-table-column prop="applicationId" label="应用" min-width="150" /><el-table-column prop="applicationSubject" label="登记主体" min-width="140" />
          <el-table-column label="状态 / 操作" width="130"><template #default="{ row }"><el-button v-if="row.enabled" link type="warning" @click="disable(row.id)">已启用 · 暂停</el-button><el-button v-else link type="primary" @click="enable(row.id)">核验后启用</el-button></template></el-table-column>
        </el-table>
        <el-collapse class="maintenance-panel">
          <el-collapse-item v-if="selected.mode === 'LEASE'" title="迁移或回退后的实例切换" name="cutover">
            <el-alert type="info" :closable="false" title="先冻结当前写入库，再从它恢复和核对新库。回退也必须携带切换后的新增数据；本操作不会恢复旧扣款或队列任务。" />
            <el-form label-position="top">
              <el-form-item v-for="field in cutoverFields" :key="field.key" :label="field.label"><el-input v-model="cutoverForm[field.key]" :maxlength="field.key === 'backupSha256' || field.key === 'authKeyFingerprint' ? 64 : 120" /></el-form-item>
              <el-form-item label="迁移、核对或回退依据"><el-input v-model="cutoverForm.reason" maxlength="400" /></el-form-item>
              <el-button type="primary" :loading="maintaining" @click="cutoverDeployment">核验并切换实例</el-button>
            </el-form>
          </el-collapse-item>
          <el-collapse-item v-if="selected.mode === 'BRAND'" title="待核对的品牌订单来源" name="brand-orders">
            <el-alert type="info" :closable="false" title="仅核对并补登记已经存在的订单；未提交的订单保持等待，不新建订单或付款。" />
            <el-button :loading="maintaining" @click="loadPendingBrandOrders">刷新待核对请求</el-button>
            <el-table :data="pendingBrandOrders" empty-text="没有待核对请求"><el-table-column prop="applicationId" label="应用" /><el-table-column prop="createdAt" label="请求时间" /><el-table-column label="操作"><template #default="{ row }"><el-button link type="primary" :disabled="maintaining" @click="reconcileBrandOrder(row.id)">核对并补登记</el-button></template></el-table-column></el-table>
          </el-collapse-item>
          <el-collapse-item title="更新合同期限" name="term">
            <el-alert type="info" :closable="false" title="仅更新期限；不会扣费，也不会恢复或重跑旧扣款任务。" />
            <el-form label-position="top">
              <el-form-item v-for="item in termFields" :key="item.key" :label="item.label"><el-date-picker v-model="renewal[item.key]" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ" /></el-form-item>
              <el-form-item label="下载授权有效秒数"><el-input-number v-model="renewal.downloadTtlSeconds" :min="1" :max="86400" /></el-form-item>
              <el-form-item label="合同更新依据"><el-input v-model="renewal.reason" maxlength="500" /></el-form-item>
              <el-button type="primary" :loading="maintaining" @click="renewContract">保存期限</el-button>
            </el-form>
          </el-collapse-item>
          <el-collapse-item title="模块、资源与数量授权" name="grant">
            <el-form label-position="top">
              <el-form-item label="授权模块"><el-checkbox-group v-model="grantForm.modules"><el-checkbox value="shop">商城</el-checkbox><el-checkbox value="course">课程</el-checkbox><el-checkbox value="circle">圈子</el-checkbox><el-checkbox value="agent">智能体</el-checkbox></el-checkbox-group></el-form-item>
              <el-form-item v-for="kind in resourceKinds" :key="kind.id" :label="kind.label + '资源白名单（逗号分隔）'"><el-input v-model="grantForm.resources[kind.id]" /></el-form-item>
              <el-form-item label="圈子数量上限"><el-input-number v-model="grantForm.circleLimit" :min="0" :max="10000" :disabled="selected.mode === 'BRAND'" /></el-form-item>
              <el-form-item v-for="limit in creationFields" :key="limit.key" :label="limit.label"><el-input-number v-model="grantForm.creationLimits[limit.key]" :min="0" :max="limit.max" :disabled="selected.mode === 'BRAND'" /><span class="hint">留空为未约定；零表示停止新增。用户数量未约定时沿用现有注册规则。</span></el-form-item>
              <el-form-item label="授权变更依据"><el-input v-model="grantForm.reason" maxlength="500" /></el-form-item>
              <el-button type="primary" :loading="maintaining" @click="saveGrant">保存授权</el-button>
            </el-form>
          </el-collapse-item>
          <el-collapse-item v-if="selected.mode === 'LEASE'" title="客户成员授权" name="member">
            <el-alert type="info" :closable="false" title="客户可独立注册普通账号，无需手机号；管理员与客服须在此明确授权，身份来源不能改换。" />
            <el-table :data="selected.memberships"><el-table-column prop="userId" label="用户 ID" /><el-table-column label="身份来源"><template #default="{ row }">{{ row.identityProvider === "LOCAL" ? "客户独立账号" : "平台登录身份" }}</template></el-table-column><el-table-column label="身份"><template #default="{ row }">{{ memberLabels[row.role] || row.role }}</template></el-table-column><el-table-column label="状态"><template #default="{ row }">{{ row.enabled ? '有效' : '已撤销' }}</template></el-table-column></el-table>
            <el-form label-position="top">
              <el-form-item label="身份来源"><el-select v-model="member.identityProvider"><el-option label="客户独立账号" value="LOCAL" /><el-option label="已有平台登录身份" value="PLATFORM" /></el-select></el-form-item>
              <el-form-item :label="member.identityProvider === 'LOCAL' ? '客户账号用户 ID' : '平台登录用户 ID'"><el-input v-model="member.userId" /></el-form-item>
              <el-form-item label="客户身份"><el-select v-model="member.role"><el-option v-for="(label, role) in memberLabels" :key="role" :label="label" :value="role" /></el-select></el-form-item>
              <el-form-item label="授权有效"><el-switch v-model="member.enabled" /></el-form-item>
              <el-form-item label="授权或撤销依据"><el-input v-model="member.reason" maxlength="500" /></el-form-item>
              <el-button type="primary" :loading="maintaining" @click="saveMember">保存成员授权</el-button>
            </el-form>
          </el-collapse-item>
        </el-collapse>
        <el-divider>操作记录</el-divider>
        <el-timeline><el-timeline-item v-for="item in selected.audit" :key="item.id" :timestamp="new Date(item.createdAt).toLocaleString('zh-CN')">{{ auditLabels[item.action] || item.action }} · {{ item.reason }}</el-timeline-item></el-timeline>
      </template>
    </el-drawer>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, reactive, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import PageHeader from "@/components/PageHeader.vue";
import { managedTenancyApi, type ManagedCustomerSummary } from "@/api/managed-tenancy";
const customers = ref<ManagedCustomerSummary[]>([]);
const selected = ref<ManagedCustomerSummary>();
const loading = ref(false), saving = ref(false), creating = ref(false), detailVisible = ref(false);
const error = ref(""), formError = ref("");
const maintaining = ref(false);
const pendingBrandOrders = ref<Array<{ id: string; applicationId: string; state: string; createdAt: string }>>([]);
const renewal = reactive({ remindAt: "", endAt: "", exportUntil: "", downloadTtlSeconds: 1, reason: "" });
const member = reactive({ userId: "", identityProvider: "LOCAL", role: "USER", enabled: true, reason: "" });
const cutoverForm=reactive({spaceKey:"",databaseName:"",databaseRole:"",credentialRef:"",authKeyFingerprint:"",backupSha256:"",reason:""});
const cutoverFields=[{key:"spaceKey",label:"恢复目标的新空间标识"},{key:"databaseName",label:"新数据库名称"},{key:"databaseRole",label:"新最低权限运行账号"},{key:"credentialRef",label:"受限凭据引用（禁止输入密码）"},{key:"authKeyFingerprint",label:"新认证密钥SHA-256摘要"},{key:"backupSha256",label:"已核对备份文件SHA-256摘要"}] as const;
type CreationLimits=Partial<Record<"products"|"courses"|"agents"|"storageBytes"|"users",number>>;
const grantForm = reactive({ modules: [] as string[], resources: { product: "", course: "", circle: "", agent: "" }, circleLimit: 0,creationLimits:{} as CreationLimits, reason: "" });
const creationFields=[{key:"products",label:"商品总数上限",max:5000},{key:"courses",label:"课程总数上限",max:5000},{key:"agents",label:"智能体总数上限",max:1000},{key:"storageBytes",label:"附件总字节上限",max:64*1024*1024},{key:"users",label:"用户总数上限",max:200000}] as const;
function configuredLimits(value:CreationLimits){return Object.fromEntries(creationFields.filter(item=>value[item.key]!==undefined&&value[item.key]!==null).map(item=>[item.key,value[item.key]]));}
const memberLabels: Record<string, string> = { CUSTOMER_ADMIN: "客户管理员", CUSTOMER_SUPPORT: "客户客服", USER: "普通用户" };
const auditLabels: Record<string, string> = { RECONCILE_BRAND_ORDER: "核对并登记订单来源", CONFIGURE: "保存客户配置", RENEW_WITHOUT_JOB_REPLAY: "更新合同期限", MEMBERSHIP_CHANGE: "更新成员授权", CHANGE_GRANT: "更新合同授权", VERIFY_DATABASE_IDENTITY: "核验数据库身份", ENABLE_APPLICATION: "启用应用", DISABLE_APPLICATION: "暂停应用" };
const resourceKinds = [{ id: "product", label: "商品" }, { id: "course", label: "课程" }, { id: "circle", label: "圈子" }, { id: "agent", label: "智能体" }] as const;
const termFields = [{ key: "remindAt", label: "开始提醒时间" }, { key: "endAt", label: "合同到期时间" }, { key: "exportUntil", label: "导出保留截止" }] as const;
const statusLabel: Record<string, string> = { ACTIVE: "正常", REMINDER: "到期提醒", EXPIRED_RESTRICTED: "到期受限 / 可导出", ARCHIVED_RETAINED: "归档保留" };
const defaults = () => ({ requestKey: crypto.randomUUID(), name: "", mode: "LEASE", applicationSubject: "", tradingSubject: "", applicationId: "", stationId: "", brandName: "", themeColor: "#8B4513", templateId: "community", maintenancePrice: "", platforms: ["miniprogram", "h5"], modules: [] as string[], resources: { product: "", course: "", circle: "", agent: "" }, circleLimit: 0, creationLimits:{} as CreationLimits, downloadTtlSeconds: undefined as number | undefined, remindAt: "", endAt: "", exportUntil: "", spaceKey: "", databaseName: "", databaseRole: "", credentialRef: "", authKeyFingerprint: "", reason: "" });
const form = reactive(defaults());
watch(() => form.mode, mode => { if (mode === "BRAND") { form.circleLimit = 0;form.creationLimits={}; form.platforms = form.platforms.filter(p => ["h5", "miniprogram"].includes(p)); } });
function message(e: unknown) { return (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (e as Error)?.message || "操作失败，请检查配置"; }
async function load() { loading.value = true; error.value = ""; try { customers.value = (await managedTenancyApi.list()).data; } catch (e) { error.value = message(e); } finally { loading.value = false; } }
function openCreate() { Object.assign(form, defaults()); formError.value = ""; creating.value = true; }
async function save() {
  saving.value = true; formError.value = "";
  try {
    if (termFields.some(item => !form[item.key] || !Number.isFinite(Date.parse(form[item.key])))) throw new Error("请填写提醒、到期和导出截止时间");
    if (!form.downloadTtlSeconds) throw new Error("请填写下载授权有效秒数");
    const term = Object.fromEntries(termFields.map(item => [item.key, new Date(form[item.key]).toISOString()]));
    const resources = Object.fromEntries(resourceKinds.map(item => [item.id, form.resources[item.id].split(/[,，]/).map(s => s.trim()).filter(Boolean)]));
    await managedTenancyApi.create({ requestKey: form.requestKey, name: form.name, mode: form.mode, tradingSubject: form.tradingSubject, maintenancePrice: form.maintenancePrice || null, term: { ...term, downloadTtlSeconds: form.downloadTtlSeconds }, applications: [{ applicationId: form.applicationId, applicationSubject: form.applicationSubject, allowedPlatforms: form.platforms, brand: { name: form.brandName, themeColor: form.themeColor }, templateId: form.templateId, ...(form.mode === "BRAND" ? { stationId: form.stationId } : {}) }], modules: form.modules, resources, circleLimit: form.circleLimit, creationLimits:configuredLimits(form.creationLimits), ...(form.mode === "LEASE" ? { deployment: { spaceKey: form.spaceKey, databaseName: form.databaseName, databaseRole: form.databaseRole, credentialRef: form.credentialRef, authKeyFingerprint: form.authKeyFingerprint } } : {}), reason: form.reason });
    ElMessage.success("合同配置已保存，应用仍需登记与验证"); creating.value = false; await load();
  } catch (e) { formError.value = message(e); } finally { saving.value = false; }
}
async function inspect(id: string) { try {
  selected.value = (await managedTenancyApi.detail(id)).data; detailVisible.value = true;
  pendingBrandOrders.value = [];
  const row = selected.value; Object.assign(renewal, { remindAt: row.remindAt, endAt: row.endAt, exportUntil: row.exportUntil, downloadTtlSeconds: row.downloadTtlSeconds, reason: "" });
  grantForm.modules = [...row.grant.modules]; grantForm.circleLimit = row.grant.circleLimit; grantForm.reason = "";
  grantForm.creationLimits={...row.grant.creationLimits};
  Object.keys(cutoverForm).forEach(key=>{cutoverForm[key as keyof typeof cutoverForm]="";});
  for (const kind of resourceKinds) grantForm.resources[kind.id] = (row.grant.resources[kind.id] || []).join(", ");
  Object.assign(member, { userId: "", identityProvider: "LOCAL", role: "USER", enabled: true, reason: "" });
} catch (e) { ElMessage.error(message(e)); } }
async function maintain(action: (row: ManagedCustomerSummary) => Promise<unknown>) {
  if (!selected.value || maintaining.value) return;
  maintaining.value = true;
  try { await action(selected.value); ElMessage.success("更新已保存"); await inspect(selected.value.id); await load(); } catch (e) { ElMessage.error(message(e)); } finally { maintaining.value = false; }
}
async function renewContract() { await maintain(row => {
  if (termFields.some(item => !renewal[item.key] || !Number.isFinite(Date.parse(renewal[item.key])))) throw new Error("请填写完整合同期限");
  const term = Object.fromEntries(termFields.map(item => [item.key, new Date(renewal[item.key]).toISOString()]));
  return managedTenancyApi.renew(row.id, { term: { ...term, downloadTtlSeconds: renewal.downloadTtlSeconds }, expectedRevision: row.revision, reason: renewal.reason });
}); }
async function saveMember() { await maintain(row => managedTenancyApi.membership(row.id, { ...member })); }
async function loadPendingBrandOrders() {
  if (!selected.value || selected.value.mode !== "BRAND") return;
  try { pendingBrandOrders.value = (await managedTenancyApi.pendingBrandOrders(selected.value.id)).data; } catch (e) { ElMessage.error(message(e)); }
}
async function reconcileBrandOrder(requestId: string) {
  if (!selected.value || maintaining.value) return;
  try {
    const result = await ElMessageBox.prompt("填写核对依据；本操作只补登记已存在订单的品牌来源", "核对订单来源", { inputValidator: value => value.trim().length >= 2 || "请填写核对依据" });
    maintaining.value = true;
    const response = await managedTenancyApi.reconcileBrandOrder(selected.value.id, requestId, result.value);
    ElMessage.success(response.data.state === "LINKED" ? "已核对并登记订单来源" : "原订单尚未提交，保持等待");
    await loadPendingBrandOrders();
  } catch (e) { if (e !== "cancel" && e !== "close") ElMessage.error(message(e)); } finally { maintaining.value = false; }
}
async function saveGrant() { await maintain(row => managedTenancyApi.grant(row.id, { modules: grantForm.modules, resources: Object.fromEntries(resourceKinds.map(kind => [kind.id, grantForm.resources[kind.id].split(/[,，]/).map(id => id.trim()).filter(Boolean)])), circleLimit: grantForm.circleLimit, creationLimits:configuredLimits(grantForm.creationLimits), expectedRevision: row.revision, reason: grantForm.reason })); }
async function verifyDeployment() {
  try { const result = await ElMessageBox.prompt("填写本次实例身份核验依据；服务器只读取预先配置的受限凭据引用", "核验实例", { inputValidator: value => value.trim().length >= 2 || "请填写核验依据" }); await maintain(row => managedTenancyApi.verify(row.id, row.revision, result.value)); }
  catch (e) { if (e !== "cancel" && e !== "close") ElMessage.error(message(e)); }
}
async function cutoverDeployment(){await maintain(row=>{const {backupSha256,reason,...deployment}=cutoverForm;return managedTenancyApi.cutover(row.id,{expectedRevision:row.revision,deployment,backupSha256,reason});});}
async function enable(id: string) { try { const result = await ElMessageBox.prompt("填写公共登记和实例验证依据", "启用应用", { inputValidator: value => value.trim().length >= 2 || "请填写核验依据" }); await managedTenancyApi.enable(id, result.value); if (selected.value) await inspect(selected.value.id); await load(); } catch (e) { if (e !== "cancel" && e !== "close") ElMessage.error(message(e)); } }
async function disable(id: string) { try { const result = await ElMessageBox.prompt("填写暂停依据；保留数据库、订单与审计，不删除任何客户资料", "暂停应用", { inputValidator: value => value.trim().length >= 2 || "请填写暂停依据" }); await managedTenancyApi.disable(id, result.value); if (selected.value) await inspect(selected.value.id); await load(); } catch (e) { if (e !== "cancel" && e !== "close") ElMessage.error(message(e)); } }
onMounted(load);
</script>
<style scoped>
.managed-page { padding: 24px; }
.notice { margin-bottom: 18px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; }
.wide { grid-column: 1 / -1; }
.hint { font-size: 12px; color: var(--el-text-color-secondary); }
.maintenance-panel { margin-top: 20px; }
@media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } .managed-page { padding: 12px; } }
</style>
