<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";
import { useAuthStore } from "@/store/auth";
const auth = useAuthStore();
const distributions = ref<any[]>([]);
const history = ref<any[]>([]);
const selected = ref("");
const signedJson = ref("");
const error = ref("");
async function load() {
  const [registrations, records] = await Promise.all([
    api.get("/system/distributions"),
    api.get("/system/wgt/admin"),
  ]);
  distributions.value = registrations.data || [];
  history.value = records.data || [];
}
async function run(action: () => Promise<unknown>) {
  error.value = "";
  try {
    await action();
    await load();
    ElMessage.success("操作已记录");
  } catch (e: any) {
    if (e !== "cancel" && e !== "close")
      error.value = e?.response?.data?.message || e?.message || "操作失败";
  }
}
function signed() {
  const value = JSON.parse(signedJson.value);
  if (!value.payload || typeof value.signature !== "string")
    throw new Error("需要根授权签名的 payload / signature");
  return value;
}
async function submit() {
  if (!selected.value) throw new Error("请先选择登记渠道");
  await api.post("/system/wgt/admin/distributions/" + selected.value + "/evidence", signed());
}
async function register() {
  await ElMessageBox.confirm("登记此根授权资源公钥？旧 keyId 不能覆盖或复活。", "公钥登记", {
    type: "warning",
  });
  await api.post("/system/wgt/admin/keys", signed());
}
async function enable(enabled: boolean) {
  if (!selected.value) throw new Error("请先选择登记渠道");
  await ElMessageBox.confirm(
    enabled
      ? "批准启用此渠道？服务端将复核环境、安装身份、原生恢复及商店策略的最新签名证据。"
      : "禁用此渠道？同时停发该渠道全部活动资源。",
    "渠道准入",
    { type: "warning" },
  );
  await api.post("/system/wgt/admin/distributions/" + selected.value + "/enable", { enabled });
}
async function approve(row: any) {
  await ElMessageBox.confirm(
    "批准此签名证据？只能批准最新待审核记录，合成证据不能用于正式环境。",
    "证据审核",
    { type: "warning" },
  );
  await api.post("/system/wgt/admin/evidence/" + row.id + "/approve");
}
async function revoke(row: any) {
  await ElMessageBox.confirm("撤销此公钥？后续查询及发布将拒绝所有依赖此钥的资源。", "撤销公钥", {
    type: "warning",
  });
  await api.post(
    "/system/wgt/admin/keys/" +
      encodeURIComponent(row.configKey.slice("wgt:key:".length)) +
      "/revoke",
  );
}
function latest(row: any) {
  return !history.value.some(
    (other) => other.configKey === row.configKey && other.version > row.version,
  );
}
onMounted(() => {
  void load().catch(() => {
    error.value = "准入记录加载失败";
  });
});
</script>
<template>
  <section>
    <h3>原生恢复与渠道准入</h3>
    <el-alert
      type="warning"
      :closable="false"
      title="默认禁发。需要同渠道正式匹配安装包的原生实测、商店策略审查和可信根签名；本页不生成私钥或替代真机验收。"
    />
    <el-select v-model="selected" placeholder="选择已登记渠道">
      <el-option
        v-for="row in distributions"
        :key="row.id"
        :value="row.id"
        :label="`${row.applicationId} / ${row.platform} / ${row.channelId} / ${row.wgtPolicy}`"
      />
    </el-select>
    <el-input
      v-model="signedJson"
      type="textarea"
      :rows="4"
      placeholder="粘贴离线根签名证据或公钥授权 JSON；不得粘贴私钥"
    />
    <el-button @click="run(submit)">提交证据待审核</el-button>
    <template v-if="auth.isSuperAdmin">
      <el-button @click="run(register)">登记新公钥</el-button>
      <el-button @click="run(() => enable(true))">审核后启用</el-button>
      <el-button @click="run(() => enable(false))">禁用并停发</el-button>
    </template>
    <el-alert v-if="error" type="error" :title="error" />
    <el-table :data="history">
      <el-table-column prop="configKey" label="证据 / 公钥" />
      <el-table-column prop="version" label="修订" width="70" />
      <el-table-column label="状态"
        ><template #default="{ row }">{{
          row.value.status || row.value.state || "记录"
        }}</template></el-table-column
      >
      <el-table-column prop="changedBy" label="操作人" />
      <el-table-column label="证据详情"
        ><template #default="{ row }"
          ><el-popover trigger="click" width="640"
            ><template #reference><el-button>查看</el-button></template>
            <pre>{{ JSON.stringify(row.value, null, 2) }}</pre>
          </el-popover></template
        ></el-table-column
      >
      <el-table-column label="审核操作"
        ><template #default="{ row }"
          ><template v-if="auth.isSuperAdmin && latest(row)">
            <el-button v-if="row.value.status === 'PENDING'" @click="run(() => approve(row))"
              >批准</el-button
            >
            <el-button v-if="row.value.state === 'ACTIVE'" @click="run(() => revoke(row))"
              >撤销</el-button
            >
          </template></template
        ></el-table-column
      >
    </el-table>
  </section>
</template>
<style scoped>
section {
  margin: 24px 0;
}
.el-select {
  width: 100%;
  margin: 12px 0;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 420px;
  overflow-y: auto;
}
</style>
