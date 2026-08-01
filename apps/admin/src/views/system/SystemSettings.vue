<template>
  <div class="page">
    <PageHeader title="系统配置">
      <template #actions>
        <el-button
          type="primary"
          @click="openAdd"
        >
          添加配置
        </el-button>
      </template>
    </PageHeader>

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="加载失败"
      style="margin-bottom:12px"
    >
      <el-button
        size="small"
        @click="fetchConfigs"
      >
        重试
      </el-button>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="configs"
      border
      stripe
    >
      <el-table-column
        prop="configKey"
        label="配置键"
        width="220"
      >
        <template #default="{ row }">
          <span>{{ row.configKey }}</span>
          <el-tooltip
            v-if="isProtectedKey(row.configKey)"
            content="平台命门配置：删除会导致官方内容归属/结算断链，已禁止删除"
            placement="top"
          >
            <el-tag
              type="danger"
              size="small"
              effect="plain"
              style="margin-left:6px"
            >
              命门
            </el-tag>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column
        label="值"
        min-width="320"
      >
        <template #default="{ row }">
          <!-- 字符串数组：标签化展示 -->
          <template v-if="parseValue(row).kind === 'tags'">
            <el-tag
              v-for="(w, i) in parseValue(row).tags"
              :key="i"
              size="small"
              style="margin:2px"
            >
              {{ w }}
            </el-tag>
          </template>
          <!-- JSON 对象：键值表格化展示（默认收起，只展示前几项） -->
          <template v-else-if="parseValue(row).kind === 'object'">
            <div class="kv-box">
              <div
                v-for="([k, v], i) in visibleEntries(row)"
                :key="i"
                class="kv-row"
              >
                <span class="kv-key">{{ k }}</span>
                <span class="kv-val">{{ v }}</span>
              </div>
              <el-button
                v-if="parseValue(row).entries!.length > 3"
                link
                type="primary"
                size="small"
                @click="toggleExpand(row.configKey)"
              >
                {{ expandedKeys.has(row.configKey) ? '收起' : `展开全部 ${parseValue(row).entries!.length} 项` }}
              </el-button>
            </div>
          </template>
          <!-- 对象数组：摘要展示（结构化数据·N 项），可展开看格式化原文，不铺原始 JSON -->
          <template v-else-if="parseValue(row).kind === 'summary'">
            <span class="summary-text">（结构化数据 · {{ parseValue(row).count }} 项）</span>
            <el-button
              link
              type="primary"
              size="small"
              @click="toggleExpand(row.configKey)"
            >
              {{ expandedKeys.has(row.configKey) ? '收起' : '展开' }}
            </el-button>
            <pre
              v-if="expandedKeys.has(row.configKey)"
              class="summary-raw"
            >{{ parseValue(row).raw }}</pre>
          </template>
          <!-- 长文本：折叠展示 -->
          <template v-else-if="(row.configValue || '').length > 150">
            <span>{{ expandedKeys.has(row.configKey) ? row.configValue : row.configValue.slice(0, 150) + '…' }}</span>
            <el-button
              link
              type="primary"
              size="small"
              @click="toggleExpand(row.configKey)"
            >
              {{ expandedKeys.has(row.configKey) ? '收起' : '展开' }}
            </el-button>
          </template>
          <span v-else>{{ row.configValue }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="说明"
        width="200"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span
            v-if="isMojibake(row.description)"
            style="color:var(--el-text-color-secondary)"
          >（说明乱码·待数据修复）</span>
          <span v-else>{{ row.description || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="更新时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatTime(row.updatedAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="160"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            type="primary"
            size="small"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-tooltip
            :disabled="!isProtectedKey(row.configKey)"
            content="命门配置禁止删除"
            placement="top"
          >
            <el-button
              type="danger"
              size="small"
              :disabled="isProtectedKey(row.configKey)"
              :loading="deletingKey === row.configKey"
              @click="remove(row)"
            >
              删除
            </el-button>
          </el-tooltip>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无系统配置" />
      </template>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑配置' : '添加配置'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        :model="form"
        label-width="100px"
      >
        <el-form-item
          label="配置键"
          required
        >
          <el-input
            v-model="form.configKey"
            :disabled="isEdit"
            placeholder="如 search_hot_words"
          />
        </el-form-item>
        <el-form-item
          label="配置值"
          required
        >
          <el-input
            v-model="form.configValue"
            type="textarea"
            :rows="4"
            placeholder="配置值"
          />
        </el-form-item>
        <el-form-item label="说明">
          <el-input
            v-model="form.description"
            placeholder="配置说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="save"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { systemApi } from "@/api";
import { ElMessage, ElMessageBox } from "element-plus";
import PageHeader from "@/components/PageHeader.vue";
import { formatDateTime } from "@/utils/datetime";

// 系统配置行（依据列表列/编辑表单实际访问字段声明）
interface SysConfig {
  configKey: string;
  configValue: string;
  description?: string;
  updatedAt?: string;
}

const configs = ref<SysConfig[]>([]);
const loading = ref(false);
const loadError = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const deletingKey = ref("");
const form = ref({ configKey: "", configValue: "", description: "" });

// 命门键白名单：删除会导致官方内容归属/结算断链，前端禁删（后端同样有保护为宜）
const PROTECTED_KEYS = ["official_circle_id", "official_merchant_id"];
function isProtectedKey(key: string) {
  return PROTECTED_KEYS.includes(key) || key.startsWith("official_");
}

// 机器人运行日志类键不属于"配置"，前端过滤不显示（后端并行清理中）
function isLogKey(key: string) {
  return /^operation_robot_logs?/.test(key) || /_logs?(_\d|$)/.test(key);
}

// 展开态（JSON 对象/长文本折叠）
const expandedKeys = ref(new Set<string>());
function toggleExpand(key: string) {
  const s = new Set(expandedKeys.value);
  if (s.has(key)) s.delete(key); else s.add(key);
  expandedKeys.value = s;
}

interface ParsedValue {
  kind: "tags" | "object" | "summary" | "text";
  tags?: string[];
  entries?: Array<[string, string]>;
  count?: number; // summary：结构化数据项数
  raw?: string; // summary：展开时呈现的格式化原文
}
const parseCache = new Map<string, ParsedValue>();
function parseValue(row: SysConfig): ParsedValue {
  const cacheKey = row.configKey + "::" + (row.configValue || "");
  const hit = parseCache.get(cacheKey);
  if (hit) return hit;
  let result: ParsedValue = { kind: "text" };
  const v = row.configValue;
  if (v && (v.trim().startsWith("{") || v.trim().startsWith("["))) {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string" || typeof x === "number")) {
        result = { kind: "tags", tags: parsed.map((x) => formatIsoish(String(x))) };
      } else if (Array.isArray(parsed)) {
        // 对象数组（如 operation_robots 运行配置）：不铺原文，摘要 + 可展开格式化原文
        result = { kind: "summary", count: parsed.length, raw: JSON.stringify(parsed, null, 2) };
      } else if (parsed && typeof parsed === "object") {
        // ISO 裸时间（如 hot_content_pool 的 updatedAt）格式化为中式，其余原样
        result = {
          kind: "object",
          entries: Object.entries(parsed).map(([k, val]) => [
            k,
            typeof val === "object" && val !== null ? JSON.stringify(val) : formatIsoish(String(val)),
          ]),
        };
      }
    } catch { /* 非合法 JSON 按文本展示 */ }
  }
  parseCache.set(cacheKey, result);
  return result;
}
function visibleEntries(row: SysConfig): Array<[string, string]> {
  const entries = parseValue(row).entries || [];
  return expandedKeys.value.has(row.configKey) ? entries : entries.slice(0, 3);
}

// 乱码检测：替换符或高密度 Latin-1 补充区字符（UTF-8 被按 GBK/Latin-1 误读的典型形态）
function isMojibake(text?: string) {
  if (!text) return false;
  if (text.includes("�")) return true;
  const suspect = (text.match(/[À-ÿ†-›ˆ-˜]/g) || []).length;
  return suspect >= 3 && suspect / text.length > 0.3;
}

function formatTime(t?: string) {
  return formatDateTime(t);
}

// ISO 8601 裸时间字符串 → 中式 "YYYY-MM-DD HH:mm"（如 hot_content_pool 内的 updatedAt/generatedAt），非时间原样返回
function formatIsoish(v: string): string {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) ? formatDateTime(v) : v;
}

onMounted(() => fetchConfigs());

async function fetchConfigs() {
  loading.value = true;
  loadError.value = false;
  try {
    const { data } = await systemApi.listConfigs();
    const list: SysConfig[] = data.items || data.configs || [];
    configs.value = list.filter((c) => !isLogKey(c.configKey));
  } catch {
    loadError.value = true;
    configs.value = [];
    ElMessage.error("加载失败，请重试");
  } finally {
    loading.value = false;
  }
}

function openAdd() {
  isEdit.value = false;
  form.value = { configKey: "", configValue: "", description: "" };
  dialogVisible.value = true;
}

function openEdit(row: SysConfig) {
  isEdit.value = true;
  form.value = {
    configKey: row.configKey,
    configValue: row.configValue,
    description: row.description || "",
  };
  dialogVisible.value = true;
}

async function save() {
  if (!form.value.configKey || form.value.configValue === "") return;
  if (!isEdit.value) {
    // 新增任意 key 需确认：后端不校验 key 是否被消费，误增会成为配置垃圾
    try {
      await ElMessageBox.confirm(
        `将新增配置键「${form.value.configKey}」。系统不校验该键是否有消费方，请确认拼写与业务方均已就绪。`,
        "确认新增配置",
        { type: "warning", confirmButtonText: "确认新增" },
      );
    } catch {
      return; // 取消
    }
  }
  saving.value = true;
  try {
    await systemApi.setConfig(form.value.configKey, {
      value: form.value.configValue,
      description: form.value.description,
    });
    ElMessage.success(isEdit.value ? "已更新" : "已添加");
    dialogVisible.value = false;
    fetchConfigs();
  } finally {
    saving.value = false;
  }
}

async function remove(row: SysConfig) {
  if (isProtectedKey(row.configKey)) {
    ElMessageBox.alert(
      `「${row.configKey}」是平台命门配置（官方内容归属/结算依赖），删除会导致 C 端发布与结算断链，已禁止删除。如确需变更请走编辑。`,
      "禁止删除",
      { type: "error" },
    );
    return;
  }
  try {
    await ElMessageBox.confirm(`确定删除配置 "${row.configKey}"？删除后读取该键的业务将回落默认值。`, "确认删除", {
      type: "warning",
    });
  } catch {
    return; // cancel
  }
  if (deletingKey.value) return;
  deletingKey.value = row.configKey;
  try {
    await systemApi.deleteConfig(row.configKey);
    ElMessage.success("已删除");
    fetchConfigs();
  } finally {
    deletingKey.value = "";
  }
}
</script>

<style scoped>
.page { padding: 0; }
.summary-text { color: var(--el-text-color-secondary); }
.summary-raw {
  margin: 6px 0 0;
  padding: 8px;
  max-height: 260px;
  overflow: auto;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
