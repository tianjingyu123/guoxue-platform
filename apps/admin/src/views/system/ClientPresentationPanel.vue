<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";
import { useAuthStore } from "@/store/auth";
import {
  EMPTY_PRESENTATION,
  PRESENTATION_ENTRIES,
  PRESENTATION_SURFACES,
  parseClientPresentation,
} from "@guoxue/shared";
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
  rows.value = (await api.get(base)).data.data || [];
  capabilityRows.value = (await api.get(base + "/capabilities")).data.data || [];
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
    const result = (await api.post(base + "/draft", { payload, reason: reason.value })).data.data;
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
    ).data.data;
    if (revision !== requestedRevision) return;
    draftId.value = result.id;
    preview.value = rendered;
  });
}
async function registerCapabilities() {
  await run(async () => {
    await ElMessageBox.confirm(
      "确认已从对应完整包核验能力清单、源码与安装包摘要？登记不提供安装鉴权或自动渠道许可。",
      "能力登记确认",
    );
    await api.post(base + "/capabilities", {
      payload: JSON.parse(capabilityEditor.value),
      reason: reason.value,
    });
    await refresh();
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
    <template #header>包内声明式运营配置</template>
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
    <el-input v-model="clientKey" placeholder="已登记渠道 clientKey（预览用）" />
    <el-input v-model="nativeBuild" placeholder="预览原生构建号" />
    <el-input v-model="resourceVersion" placeholder="预览资源版本" />
    <el-input v-model="userId" placeholder="预览灰度用户（可选）" />
    <el-input v-model="reason" placeholder="变更理由，至少两个字" />

    <el-divider>常用配置表单</el-divider>
    <el-select v-model="selectedRule" placeholder="选择已有渠道规则">
      <el-option
        v-for="(rule, index) in editablePayload?.rules || []"
        :key="rule.id"
        :label="rule.id + ' · ' + rule.channelId"
        :value="index"
      />
    </el-select>
    <template v-if="currentRule">
      <el-form label-width="120px" inline>
        <el-form-item label="优先级"
          ><el-input-number
            :model-value="currentRule.priority"
            :min="0"
            :max="100"
            @update:model-value="(value: any) => editRule('priority', value)"
        /></el-form-item>
        <el-form-item label="灰度比例 %"
          ><el-input-number
            :model-value="currentRule.percentage"
            :min="0"
            :max="100"
            @update:model-value="(value: any) => editRule('percentage', value)"
        /></el-form-item>
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
      <el-table :data="entryRows" size="small">
        <el-table-column prop="id" label="入口" width="120" />
        <el-table-column label="展示" width="90"
          ><template #default="{ row }"
            ><el-switch
              :model-value="row.visible"
              @update:model-value="(value: any) => editEntry(row.id, 'visible', value)" /></template
        ></el-table-column>
        <el-table-column label="顺序" width="160"
          ><template #default="{ row }"
            ><el-input-number
              :model-value="row.order"
              :min="0"
              :max="100"
              @update:model-value="(value: any) => editEntry(row.id, 'order', value)" /></template
        ></el-table-column>
        <el-table-column label="文案"
          ><template #default="{ row }"
            ><el-input
              :model-value="row.label"
              :maxlength="24"
              @update:model-value="(value: any) => editEntry(row.id, 'label', value)" /></template
        ></el-table-column>
      </el-table>
      <p>底部首页和“我的”固定保留。其他导航：</p>
      <el-form inline>
        <el-form-item v-for="id in ['circle', 'discover', 'paipan']" :key="id" :label="id">
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
      <el-select v-model="selectedSurface"
        ><el-option
          v-for="surface in PRESENTATION_SURFACES"
          :key="surface"
          :label="surface"
          :value="surface"
      /></el-select>
      <el-button
        v-for="type in ['notice', 'richtext', 'entry-grid', 'banner']"
        :key="type"
        @click="addBlock(type)"
        >添加 {{ type }}</el-button
      >
      <el-card
        v-for="(block, index) in currentConfig.pages?.[selectedSurface] || []"
        :key="block.id"
        style="margin-top: 12px"
      >
        <p>
          {{ block.type }} · {{ block.id }}
          <el-button :disabled="index === 0" @click="moveBlock(index, -1)">上移</el-button
          ><el-button @click="moveBlock(index, 1)">下移</el-button
          ><el-button @click="removeBlock(index)">删除草稿模块</el-button>
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
          ><el-option
            v-for="entry in PRESENTATION_ENTRIES"
            :key="entry.id"
            :label="entry.label"
            :value="entry.id"
        /></el-select>
        <el-select
          v-if="block.type === 'entry-grid'"
          :model-value="block.columns || 5"
          @update:model-value="(value: any) => editBlock(index, 'columns', value)"
          ><el-option v-for="count in [3, 4, 5]" :key="count" :label="count + ' 列'" :value="count"
        /></el-select>
        <el-select
          :model-value="block.targetEntryId"
          clearable
          placeholder="跳转到包内入口（可选）"
          @update:model-value="
            (value: any) => editBlock(index, 'targetEntryId', value || undefined)
          "
          ><el-option
            v-for="entry in PRESENTATION_ENTRIES"
            :key="entry.id"
            :label="entry.label"
            :value="entry.id"
        /></el-select>
      </el-card>
    </template>
    <el-divider>高级规则配置</el-divider>

    <el-input v-model="editor" type="textarea" :rows="12" aria-label="声明式配置 JSON" />
    <el-button :loading="busy" @click="savePreview">保存草稿并预览</el-button>
    <el-button
      v-if="superAdmin"
      type="primary"
      :disabled="!draftId || !preview?.config || busy"
      @click="publish"
      >发布已预览草稿</el-button
    >
    <pre v-if="preview">{{ JSON.stringify(preview, null, 2) }}</pre>
    <el-collapse
      ><el-collapse-item title="独立完整包能力登记与历史">
        <p>
          仅登记实际核验的完整包，不把候选资源/AAR 或客户端请求当作完整包证明。旧包与新包分别使用
          legacy-v1 / presentation-v1；资源范围不得重叠。
        </p>
        <el-input
          v-if="superAdmin"
          v-model="capabilityEditor"
          type="textarea"
          :rows="6"
          placeholder="完整包能力登记 JSON：applicationId/platform/channelId/nativeBuild/minResourceVersion/maxResourceVersion/profileId/sourceSha/installedPackageSha256/verificationLevel"
        />
        <el-button
          v-if="superAdmin"
          :disabled="busy || !capabilityEditor || reason.length < 2"
          @click="registerCapabilities"
          >登记已核验完整包</el-button
        >
        <pre>{{ JSON.stringify(capabilityRows, null, 2) }}</pre>
      </el-collapse-item></el-collapse
    >
    <el-table :data="rows">
      <el-table-column prop="version" label="版本" />
      <el-table-column prop="changedBy" label="操作者" />
      <el-table-column prop="comment" label="理由" />
      <el-table-column label="操作"
        ><template #default="{ row }"
          ><el-button
            v-if="superAdmin"
            :disabled="busy || reason.length < 2"
            @click="rollback(row.version)"
            >回退</el-button
          ></template
        ></el-table-column
      >
    </el-table>
  </el-card>
</template>
