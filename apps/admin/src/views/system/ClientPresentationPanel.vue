<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";
import { useAuthStore } from "@/store/auth";
import {
  APP_CHANNELS,
  CLIENT_CAPABILITY_PROFILES,
  EMPTY_PRESENTATION,
  PRESENTATION_ENTRIES,
  PRESENTATION_SURFACES,
  parseClientPresentation,
} from "@guoxue/shared";
interface RegisteredClient {
  clientKey: string;
  applicationId: string;
  platform: string;
  channelId: string;
  enabled: boolean;
}
const registeredClients = ref<RegisteredClient[]>([]);
const auth = useAuthStore();
const superAdmin = computed(() => auth.hasRole("SUPER_ADMIN"));
const reason = ref(""),
  clientKey = ref(""),
  nativeBuild = ref("254"),
  resourceVersion = ref("0"),
  userId = ref(""),
  draftId = ref("");
const editor = ref(
  JSON.stringify(
    {
      schemaVersion: 1,
      rules: [
        {
          id: "google-default",
          priority: 0,
          percentage: 100,
          applicationId: "rebu",
          platform: "android",
          channelId: "google-play",
          minNativeBuild: "254",
          maxNativeBuild: "254",
          minResourceVersion: "0",
          maxResourceVersion: "0",
          config: EMPTY_PRESENTATION,
        },
      ],
    },
    null,
    2,
  ),
);
const capabilityEditor = ref(""),
  capabilityRows = ref<any[]>([]);
const emptyCapabilityForm = () => ({
  clientKey: "",
  nativeBuild: "",
  minResourceVersion: "",
  maxResourceVersion: "",
  profileId: "",
  sourceSha: "",
  installedPackageSha256: "",
});
const capabilityForm = ref(emptyCapabilityForm());
const capabilityProfiles = Object.keys(CLIENT_CAPABILITY_PROFILES) as Array<
  keyof typeof CLIENT_CAPABILITY_PROFILES
>;
const capabilityProfile = computed(
  () =>
    CLIENT_CAPABILITY_PROFILES[
      capabilityForm.value.profileId as keyof typeof CLIENT_CAPABILITY_PROFILES
    ],
);
let capabilityRevision = 0;
watch(
  [capabilityForm, reason],
  () => {
    capabilityRevision++;
  },
  { deep: true, flush: "sync" },
);

function capabilityVersion(value: string) {
  const normalized = value.trim();
  if (!/^\d{1,15}$/.test(normalized)) throw new Error("构建号和资源版本须为最多15位的非负整数");
  return BigInt(normalized).toString();
}
function buildCapabilityPayload() {
  const form = capabilityForm.value;
  const client = registeredClients.value.find((item) => item.clientKey === form.clientKey);
  if (!client || !client.enabled) throw new Error("请选择已登记并启用的应用渠道");
  if (
    !/^[a-z][a-z0-9-]{1,47}$/.test(client.applicationId) ||
    !APP_CHANNELS.some(
      (channel) =>
        channel.id === client.channelId &&
        (channel.platforms as readonly string[]).includes(client.platform),
    )
  )
    throw new Error("已登记的应用、平台或商店范围无效");
  const nativeBuild = capabilityVersion(form.nativeBuild),
    minResourceVersion = capabilityVersion(form.minResourceVersion),
    maxResourceVersion = capabilityVersion(form.maxResourceVersion);
  if (BigInt(minResourceVersion) > BigInt(maxResourceVersion))
    throw new Error("最低资源版本不能高于最高资源版本");
  if (!Object.hasOwn(CLIENT_CAPABILITY_PROFILES, form.profileId))
    throw new Error("请选择完整包内实际具备的能力清单");
  const sourceSha = form.sourceSha.trim().toLowerCase(),
    installedPackageSha256 = form.installedPackageSha256.trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(sourceSha)) throw new Error("请填写40位源码提交摘要");
  if (!/^[a-f0-9]{64}$/.test(installedPackageSha256))
    throw new Error("请填写64位完整安装包SHA-256摘要");
  return {
    applicationId: client.applicationId,
    platform: client.platform,
    channelId: client.channelId,
    nativeBuild,
    minResourceVersion,
    maxResourceVersion,
    profileId: form.profileId,
    sourceSha,
    installedPackageSha256,
    verificationLevel: "formal-package" as const,
  };
}
const capabilityValidation = computed(() => {
  try {
    return { payload: buildCapabilityPayload(), error: "" };
  } catch (error) {
    return { payload: null, error: (error as Error).message };
  }
});
function chooseCapabilityClient(key: string) {
  // 切换范围后不沿用另一完整包的版本、能力或核验摘要。
  capabilityForm.value = { ...emptyCapabilityForm(), clientKey: key };
}
function importCapabilities() {
  try {
    const raw = JSON.parse(capabilityEditor.value);
    const fields = [
      "applicationId",
      "platform",
      "channelId",
      "nativeBuild",
      "minResourceVersion",
      "maxResourceVersion",
      "profileId",
      "sourceSha",
      "installedPackageSha256",
      "verificationLevel",
    ];
    if (
      !raw ||
      Array.isArray(raw) ||
      typeof raw !== "object" ||
      Object.keys(raw).some((key) => !fields.includes(key)) ||
      fields.some((key) => typeof raw[key] !== "string")
    )
      throw new Error("能力登记JSON字段缺失或含未知字段");
    if (raw.verificationLevel !== "formal-package")
      throw new Error("表单仅登记实际核验的正式完整包，合成测试记录不可导入");
    const client = registeredClients.value.find(
      (item) =>
        item.applicationId === raw.applicationId &&
        item.platform === raw.platform &&
        item.channelId === raw.channelId,
    );
    if (!client || !client.enabled) throw new Error("JSON对应的应用渠道未登记或已停用");
    const candidate = {
      clientKey: client.clientKey,
      nativeBuild: capabilityVersion(raw.nativeBuild),
      minResourceVersion: capabilityVersion(raw.minResourceVersion),
      maxResourceVersion: capabilityVersion(raw.maxResourceVersion),
      profileId: raw.profileId,
      sourceSha: raw.sourceSha.trim().toLowerCase(),
      installedPackageSha256: raw.installedPackageSha256.trim().toLowerCase(),
    };
    if (
      BigInt(candidate.minResourceVersion) > BigInt(candidate.maxResourceVersion) ||
      !Object.hasOwn(CLIENT_CAPABILITY_PROFILES, candidate.profileId) ||
      !/^[a-f0-9]{40}$/.test(candidate.sourceSha) ||
      !/^[a-f0-9]{64}$/.test(candidate.installedPackageSha256)
    )
      throw new Error("JSON中的版本范围、能力或摘要无效");
    capabilityForm.value = candidate;
    ElMessage.success("已导入表单，请核对完整包后登记");
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
}
const preview = ref<any>(null),
  rows = ref<any[]>([]),
  busy = ref(false);
const base = "/admin/client-presentation";

const selectedRule = ref(0),
  selectedSurface = ref("home");
const editablePayload = computed<any>(() => {
  try {
    return JSON.parse(editor.value);
  } catch {
    return null;
  }
});
const currentRule = computed<any>(() => editablePayload.value?.rules?.[selectedRule.value]);
const currentConfig = computed<any>(() => currentRule.value?.config ?? EMPTY_PRESENTATION);
const entryRows = computed(() =>
  PRESENTATION_ENTRIES.map((entry, index) => ({
    ...entry,
    visible:
      currentConfig.value.entries?.find((item: any) => item.id === entry.id)?.visible !== false,
    order: currentConfig.value.entries?.find((item: any) => item.id === entry.id)?.order ?? index,
    label:
      currentConfig.value.entries?.find((item: any) => item.id === entry.id)?.label || entry.label,
  })),
);
const ruleClientKey = computed(
  () =>
    registeredClients.value.find(
      (client) =>
        client.applicationId === currentRule.value?.applicationId &&
        client.platform === currentRule.value?.platform &&
        client.channelId === currentRule.value?.channelId,
    )?.clientKey ?? "",
);
function clientLabel(client: RegisteredClient) {
  const channel =
    APP_CHANNELS.find((item) => item.id === client.channelId)?.name ?? client.channelId;
  return client.applicationId + " / " + client.platform + " / " + channel;
}
function chooseRuleClient(key: string) {
  const client = registeredClients.value.find((item) => item.clientKey === key);
  const payload = editablePayload.value;
  if (!client || !payload?.rules?.[selectedRule.value]) return;
  Object.assign(payload.rules[selectedRule.value], {
    applicationId: client.applicationId,
    platform: client.platform,
    channelId: client.channelId,
  });
  editor.value = JSON.stringify(payload, null, 2);
  clientKey.value = key;
}
function addRule() {
  const payload = editablePayload.value;
  const client =
    registeredClients.value.find((item) => item.clientKey === clientKey.value) ??
    registeredClients.value[0];
  if (!Array.isArray(payload?.rules) || !client) {
    ElMessage.warning("请先修复规则 JSON，并登记可用的应用渠道");
    return;
  }
  if (payload.rules.length >= 50) {
    ElMessage.warning("最多 50 条运营规则");
    return;
  }
  payload.rules.push({
    id: "rule-" + Date.now().toString(36),
    priority: 0,
    percentage: 100,
    applicationId: client.applicationId,
    platform: client.platform,
    channelId: client.channelId,
    minNativeBuild: nativeBuild.value,
    maxNativeBuild: nativeBuild.value,
    minResourceVersion: resourceVersion.value,
    maxResourceVersion: resourceVersion.value,
    config: JSON.parse(JSON.stringify(EMPTY_PRESENTATION)),
  });
  selectedRule.value = payload.rules.length - 1;
  editor.value = JSON.stringify(payload, null, 2);
  clientKey.value = client.clientKey;
}
function removeRule() {
  const payload = editablePayload.value;
  if (!Array.isArray(payload?.rules) || !currentRule.value) return;
  payload.rules.splice(selectedRule.value, 1);
  selectedRule.value = Math.max(0, selectedRule.value - 1);
  editor.value = JSON.stringify(payload, null, 2);
}
function editRule(field: string, value: unknown) {
  const payload = editablePayload.value;
  if (!payload?.rules?.[selectedRule.value]) return;
  payload.rules[selectedRule.value][field] = value;
  editor.value = JSON.stringify(payload, null, 2);
}
function editConfig(change: (config: any) => void) {
  const payload = editablePayload.value;
  if (!payload?.rules?.[selectedRule.value]) return;
  const config = payload.rules[selectedRule.value].config;
  change(config);
  editor.value = JSON.stringify(payload, null, 2);
}
function editEntry(id: string, field: string, value: unknown, navigation = false) {
  editConfig((config) => {
    const key = navigation ? "navigation" : "entries";
    config[key] ||= [];
    let entry = config[key].find((item: any) => item.id === id);
    if (!entry) {
      entry = {
        id,
        visible: true,
        order: navigation
          ? ["circle", "discover", "paipan"].indexOf(id)
          : PRESENTATION_ENTRIES.findIndex((item) => item.id === id),
      };
      config[key].push(entry);
    }
    entry[field] = value;
  });
}
function editBlock(index: number, field: string, value: unknown) {
  editConfig((config) => {
    config.pages[selectedSurface.value][index][field] = value;
  });
}
function moveBlock(index: number, offset: number) {
  editConfig((config) => {
    const blocks = config.pages[selectedSurface.value];
    const to = index + offset;
    if (to >= 0 && to < blocks.length) [blocks[index], blocks[to]] = [blocks[to], blocks[index]];
  });
}
function removeBlock(index: number) {
  editConfig((config) => {
    config.pages[selectedSurface.value].splice(index, 1);
  });
}
function addBlock(type: string) {
  editConfig((config) => {
    config.pages ||= {};
    const blocks = (config.pages[selectedSurface.value] ||= []);
    if (blocks.length >= 12) {
      ElMessage.warning("每页最多 12 个运营模块");
      return;
    }
    blocks.push({
      id: "module-" + Date.now().toString(36),
      type,
      title: "",
      text: "",
      entries: [],
      ...(type === "banner" ? { imagePath: "" } : {}),
      ...(type === "entry-grid" ? { columns: 5 } : {}),
    });
  });
}

let revision = 0;
watch(
  [editor, reason, clientKey, nativeBuild, resourceVersion, userId],
  () => {
    revision++;
    draftId.value = "";
    preview.value = null;
  },
  { flush: "sync" },
);
async function refresh() {
  const [history, capabilities, clients] = await Promise.all([
    api.get(base),
    api.get(base + "/capabilities"),
    api.get("/system/distributions"),
  ]);
  rows.value = history.data || [];
  capabilityRows.value = capabilities.data || [];
  registeredClients.value = (Array.isArray(clients.data) ? clients.data : []).filter(
    (client: RegisteredClient) => client.enabled,
  );
}
async function run(action: () => Promise<void>) {
  busy.value = true;
  try {
    await action();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || error.message || "操作失败");
  } finally {
    busy.value = false;
  }
}
async function savePreview() {
  await run(async () => {
    const requestedRevision = revision;
    const payload = JSON.parse(editor.value);
    for (const rule of payload.rules) parseClientPresentation(rule.config);
    const result = (await api.post(base + "/draft", { payload, reason: reason.value })).data;
    if (revision !== requestedRevision) return;
    const rendered = (
      await api.get(base + "/draft/" + result.id + "/preview", {
        params: {
          clientKey: clientKey.value,
          nativeBuild: nativeBuild.value,
          resourceVersion: resourceVersion.value,
          userId: userId.value,
        },
      })
    ).data;
    if (revision !== requestedRevision) return;
    draftId.value = result.id;
    preview.value = rendered;
  });
}
async function registerCapabilities() {
  if (busy.value) return;
  await run(async () => {
    if (!superAdmin.value) throw new Error("仅超级管理员可登记完整包能力");
    const payload = buildCapabilityPayload(),
      comment = reason.value.trim(),
      requestedRevision = capabilityRevision;
    if (comment.length < 2) throw new Error("请填写至少两个字的登记理由");
    try {
      await ElMessageBox.confirm(
        `登记 ${payload.applicationId} / ${payload.platform} / ${APP_CHANNELS.find((channel) => channel.id === payload.channelId)?.name ?? payload.channelId}，构建 ${payload.nativeBuild}，资源 ${payload.minResourceVersion}至${payload.maxResourceVersion}，能力 ${payload.profileId}？请确认已从对应完整包核验能力清单、源码与安装包摘要。登记不提供安装鉴权或自动渠道许可。`,
        "能力登记确认",
      );
    } catch (error) {
      if (error === "cancel" || error === "close") return;
      throw error;
    }
    if (capabilityRevision !== requestedRevision || !superAdmin.value)
      throw new Error("登记内容或权限已变化，请重新核验后登记");
    await api.post(base + "/capabilities", {
      payload,
      reason: comment,
    });
    ElMessage.success("完整包能力已登记");
    if (capabilityRevision === requestedRevision) {
      capabilityForm.value = emptyCapabilityForm();
      capabilityEditor.value = "";
    }
    try {
      await refresh();
    } catch {
      ElMessage.warning("能力已登记，列表刷新失败，请刷新列表核对");
    }
  });
}
async function publish() {
  await run(async () => {
    await ElMessageBox.confirm(
      "发布该声明式配置？仅影响已内置且报告 presentation-v1 能力的匹配版本。",
      "发布确认",
    );
    await api.post(base + "/draft/" + draftId.value + "/publish", { reason: reason.value });
    draftId.value = "";
    preview.value = null;
    await refresh();
    ElMessage.success("配置已发布");
  });
}
async function rollback(version: number) {
  await run(async () => {
    await ElMessageBox.confirm(
      "恢复版本 " + version + " 的声明式配置？业务开关及用户权益分别管理。",
      "回退确认",
    );
    await api.post(base + "/rollback/" + version, { reason: reason.value });
    await refresh();
  });
}
onMounted(() => run(refresh));
</script>
<template>
  <el-card>
    <template #header>
      包内声明式运营配置
    </template>
    <el-alert
      type="info"
      :closable="false"
      title="独立于 WGT：调整已内置入口、内容频道、文案和模块顺序；隐藏入口不取消历史订单、退款或已购阅读。新业务状态仍在功能开关中管理。"
    />
    <p>
      可配置页面：{{ PRESENTATION_SURFACES.join("、") }}；入口：{{
        PRESENTATION_ENTRIES.map((entry) => entry.id).join("、")
      }}。模块：notice、richtext、entry-grid、banner，数组顺序即展示顺序。重叠规则按优先级、较窄原生范围、较窄资源范围、ID
      顺序选择。
    </p>
    <el-select
      v-model="clientKey"
      clearable
      filterable
      placeholder="选择已登记的预览应用渠道"
    >
      <el-option
        v-for="client in registeredClients"
        :key="client.clientKey"
        :label="clientLabel(client)"
        :value="client.clientKey"
      />
    </el-select>
    <el-input
      v-model="nativeBuild"
      placeholder="预览原生构建号"
    />
    <el-input
      v-model="resourceVersion"
      placeholder="预览资源版本"
    />
    <el-input
      v-model="userId"
      placeholder="预览灰度用户（可选）"
    />
    <el-input
      v-model="reason"
      placeholder="变更理由，至少两个字"
    />

    <el-divider>常用配置表单</el-divider>
    <el-select
      v-model="selectedRule"
      placeholder="选择已有渠道规则"
    >
      <el-option
        v-for="(rule, index) in editablePayload?.rules || []"
        :key="rule.id"
        :label="rule.id + ' · ' + rule.channelId"
        :value="index"
      />
    </el-select>
    <el-button
      :disabled="busy || !registeredClients.length"
      @click="addRule"
    >
      新增渠道规则
    </el-button>
    <el-button
      :disabled="busy || !currentRule"
      @click="removeRule"
    >
      删除当前草稿规则
    </el-button>
    <template v-if="currentRule">
      <el-form
        label-width="120px"
        inline
      >
        <el-form-item label="应用渠道">
          <el-select
            :model-value="ruleClientKey"
            filterable
            placeholder="选择已登记的应用 / 平台 / 商店"
            @update:model-value="chooseRuleClient"
          >
            <el-option
              v-for="client in registeredClients"
              :key="client.clientKey"
              :label="clientLabel(client)"
              :value="client.clientKey"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="规则标识">
          <el-input
            :model-value="currentRule.id"
            :maxlength="48"
            @update:model-value="(value: string) => editRule('id', value)"
          />
        </el-form-item>
        <el-form-item label="优先级">
          <el-input-number
            :model-value="currentRule.priority"
            :min="0"
            :max="100"
            @update:model-value="(value: any) => editRule('priority', value)"
          />
        </el-form-item>
        <el-form-item label="灰度比例 %">
          <el-input-number
            :model-value="currentRule.percentage"
            :min="0"
            :max="100"
            @update:model-value="(value: any) => editRule('percentage', value)"
          />
        </el-form-item>
        <el-form-item
          v-for="field in [
            { key: 'minNativeBuild', label: '最低原生构建' },
            { key: 'maxNativeBuild', label: '最高原生构建' },
            { key: 'minResourceVersion', label: '最低资源版本' },
            { key: 'maxResourceVersion', label: '最高资源版本' },
          ]"
          :key="field.key"
          :label="field.label"
        >
          <el-input
            :model-value="currentRule[field.key]"
            @update:model-value="(value: any) => editRule(field.key, value)"
          />
        </el-form-item>
      </el-form>
      <el-table
        :data="entryRows"
        size="small"
      >
        <el-table-column
          prop="id"
          label="入口"
          width="120"
        />
        <el-table-column
          label="展示"
          width="90"
        >
          <template #default="{ row }">
            <el-switch
              :model-value="row.visible"
              @update:model-value="(value: any) => editEntry(row.id, 'visible', value)"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="顺序"
          width="160"
        >
          <template #default="{ row }">
            <el-input-number
              :model-value="row.order"
              :min="0"
              :max="100"
              @update:model-value="(value: any) => editEntry(row.id, 'order', value)"
            />
          </template>
        </el-table-column>
        <el-table-column label="文案">
          <template #default="{ row }">
            <el-input
              :model-value="row.label"
              :maxlength="24"
              @update:model-value="(value: any) => editEntry(row.id, 'label', value)"
            />
          </template>
        </el-table-column>
      </el-table>
      <p>底部首页和“我的”固定保留。其他导航：</p>
      <el-form inline>
        <el-form-item
          v-for="id in ['circle', 'discover', 'paipan']"
          :key="id"
          :label="id"
        >
          <el-switch
            :model-value="
              currentConfig.navigation?.find((item: any) => item.id === id)?.visible !== false
            "
            @update:model-value="(value: any) => editEntry(id, 'visible', value, true)"
          />
          <el-input-number
            :model-value="
              currentConfig.navigation?.find((item: any) => item.id === id)?.order ??
                ['circle', 'discover', 'paipan'].indexOf(id)
            "
            :min="0"
            :max="100"
            @update:model-value="(value: any) => editEntry(id, 'order', value, true)"
          />
          <el-input
            :model-value="
              currentConfig.navigation?.find((item: any) => item.id === id)?.label || ''
            "
            placeholder="导航文案（可选）"
            :maxlength="24"
            @update:model-value="(value: any) => editEntry(id, 'label', value, true)"
          />
        </el-form-item>
      </el-form>
      <p>首页内容频道（顺序按所选列表，可在高级配置中调整）：</p>
      <el-select
        :model-value="currentConfig.homeChannels"
        multiple
        @update:model-value="
          (value: any) =>
            editConfig((config) => {
              config.homeChannels = value;
            })
        "
      >
        <el-option
          v-for="channel in [
            { id: 'recommend', label: '推荐' },
            { id: 'following', label: '关注' },
            { id: 'hot', label: '热门' },
            { id: 'local', label: '本地' },
          ]"
          :key="channel.id"
          :label="channel.label"
          :value="channel.id"
        />
      </el-select>
      <el-divider>页面运营模块</el-divider>
      <el-select v-model="selectedSurface">
        <el-option
          v-for="surface in PRESENTATION_SURFACES"
          :key="surface"
          :label="surface"
          :value="surface"
        />
      </el-select>
      <el-button
        v-for="type in ['notice', 'richtext', 'entry-grid', 'banner']"
        :key="type"
        @click="addBlock(type)"
      >
        添加 {{ type }}
      </el-button>
      <el-card
        v-for="(block, index) in currentConfig.pages?.[selectedSurface] || []"
        :key="block.id"
        style="margin-top: 12px"
      >
        <p>
          {{ block.type }} · {{ block.id }}
          <el-button
            :disabled="index === 0"
            @click="moveBlock(index, -1)"
          >
            上移
          </el-button><el-button @click="moveBlock(index, 1)">
            下移
          </el-button><el-button @click="removeBlock(index)">
            删除草稿模块
          </el-button>
        </p>
        <el-input
          :model-value="block.title"
          :maxlength="60"
          placeholder="标题"
          @update:model-value="(value: any) => editBlock(index, 'title', value)"
        />
        <el-input
          :model-value="block.text"
          type="textarea"
          :maxlength="1000"
          placeholder="正文（纯文本）"
          @update:model-value="(value: any) => editBlock(index, 'text', value)"
        />
        <el-input
          v-if="block.type === 'banner'"
          :model-value="block.imagePath"
          placeholder="图片路径 /assets/…png（公开资产源）"
          @update:model-value="(value: any) => editBlock(index, 'imagePath', value)"
        />
        <el-select
          v-if="block.type === 'entry-grid'"
          :model-value="block.entries"
          multiple
          @update:model-value="(value: any) => editBlock(index, 'entries', value)"
        >
          <el-option
            v-for="entry in PRESENTATION_ENTRIES"
            :key="entry.id"
            :label="entry.label"
            :value="entry.id"
          />
        </el-select>
        <el-select
          v-if="block.type === 'entry-grid'"
          :model-value="block.columns || 5"
          @update:model-value="(value: any) => editBlock(index, 'columns', value)"
        >
          <el-option
            v-for="count in [3, 4, 5]"
            :key="count"
            :label="count + ' 列'"
            :value="count"
          />
        </el-select>
        <el-select
          :model-value="block.targetEntryId"
          clearable
          placeholder="跳转到包内入口（可选）"
          @update:model-value="
            (value: any) => editBlock(index, 'targetEntryId', value || undefined)
          "
        >
          <el-option
            v-for="entry in PRESENTATION_ENTRIES"
            :key="entry.id"
            :label="entry.label"
            :value="entry.id"
          />
        </el-select>
      </el-card>
    </template>
    <el-divider>高级规则配置</el-divider>

    <el-input
      v-model="editor"
      type="textarea"
      :rows="12"
      aria-label="声明式配置 JSON"
    />
    <el-button
      :loading="busy"
      @click="savePreview"
    >
      保存草稿并预览
    </el-button>
    <el-button
      v-if="superAdmin"
      type="primary"
      :disabled="!draftId || !preview?.config || busy"
      @click="publish"
    >
      发布已预览草稿
    </el-button>
    <pre v-if="preview">{{ JSON.stringify(preview, null, 2) }}</pre>
    <el-collapse>
      <el-collapse-item title="独立完整包能力登记与历史">
        <p>
          仅登记实际核验的完整包，不把候选资源/AAR 或客户端请求当作完整包证明。旧包与新包分别使用
          legacy-v1 / presentation-v1；资源范围不得重叠。
        </p>
        <template v-if="superAdmin">
          <el-form
            class="capability-form"
            label-position="top"
            :disabled="busy"
          >
            <el-form-item
              label="应用 / 平台 / 商店"
              class="capability-wide"
            >
              <el-select
                :model-value="capabilityForm.clientKey"
                filterable
                clearable
                placeholder="选择能力登记的应用渠道"
                @update:model-value="chooseCapabilityClient"
              >
                <el-option
                  v-for="client in registeredClients"
                  :key="client.clientKey"
                  :label="clientLabel(client)"
                  :value="client.clientKey"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="完整包原生构建号">
              <el-input
                v-model="capabilityForm.nativeBuild"
                placeholder="完整包原生构建号"
                :maxlength="15"
              />
            </el-form-item>
            <el-form-item label="包内实际能力">
              <el-select
                v-model="capabilityForm.profileId"
                placeholder="选择已核验的包内能力"
              >
                <el-option
                  v-for="profile in capabilityProfiles"
                  :key="profile"
                  :value="profile"
                  :label="
                    profile === 'legacy-v1'
                      ? '旧包能力（legacy-v1）'
                      : '声明式运营能力（presentation-v1）'
                  "
                />
              </el-select>
            </el-form-item>
            <el-form-item label="最低资源版本">
              <el-input
                v-model="capabilityForm.minResourceVersion"
                placeholder="登记范围最低资源版本"
                :maxlength="15"
              />
            </el-form-item>
            <el-form-item label="最高资源版本">
              <el-input
                v-model="capabilityForm.maxResourceVersion"
                placeholder="登记范围最高资源版本"
                :maxlength="15"
              />
            </el-form-item>
            <el-form-item
              label="源码提交摘要（40位）"
              class="capability-wide"
            >
              <el-input
                v-model="capabilityForm.sourceSha"
                placeholder="实际完整包源码提交SHA"
              />
            </el-form-item>
            <el-form-item
              label="完整安装包SHA-256（64位）"
              class="capability-wide"
            >
              <el-input
                v-model="capabilityForm.installedPackageSha256"
                placeholder="实际完整安装包SHA-256"
              />
            </el-form-item>
          </el-form>
          <p
            v-if="capabilityProfile"
            class="capability-hint"
          >
            对应包内页面：{{
              capabilityProfile.surfaces.join("、") || "无声明式运营页面"
            }}；模块：{{ capabilityProfile.components.join("、") || "无声明式运营模块" }}。
          </p>
          <p
            v-if="!capabilityValidation.payload"
            class="capability-hint"
            role="status"
          >
            {{ capabilityValidation.error }}
          </p>
          <pre
            v-else
            class="capability-payload"
            aria-label="待登记完整包能力"
          >{{
            JSON.stringify(capabilityValidation.payload, null, 2)
          }}</pre>
          <el-button
            :disabled="busy || !capabilityValidation.payload || reason.trim().length < 2"
            @click="registerCapabilities"
          >
            登记已核验完整包
          </el-button>
          <el-collapse class="capability-import">
            <el-collapse-item title="从JSON导入登记表单">
              <el-input
                v-model="capabilityEditor"
                type="textarea"
                :rows="6"
                :disabled="busy"
                placeholder="完整包能力登记JSON（导入后仍需核对表单）"
              />
              <el-button
                :disabled="busy || !capabilityEditor"
                @click="importCapabilities"
              >
                导入能力登记表单
              </el-button>
            </el-collapse-item>
          </el-collapse>
        </template>
        <pre>{{ JSON.stringify(capabilityRows, null, 2) }}</pre>
      </el-collapse-item>
    </el-collapse>
    <el-table :data="rows">
      <el-table-column
        prop="version"
        label="版本"
      />
      <el-table-column
        prop="changedBy"
        label="操作者"
      />
      <el-table-column
        prop="comment"
        label="理由"
      />
      <el-table-column label="操作">
        <template #default="{ row }">
          <el-button
            v-if="superAdmin"
            :disabled="busy || reason.length < 2"
            @click="rollback(row.version)"
          >
            回退
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>
<style scoped>
.capability-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
  max-width: 880px;
}
.capability-wide {
  grid-column: 1 / -1;
}
.capability-form :deep(.el-select) {
  width: 100%;
}
.capability-hint {
  color: var(--el-text-color-secondary);
  max-width: 880px;
}
.capability-payload {
  max-width: 880px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.capability-import {
  margin-top: 16px;
  max-width: 880px;
}
@media (max-width: 640px) {
  .capability-form {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
