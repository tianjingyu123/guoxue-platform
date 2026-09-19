<script setup lang="ts">
/**
 * 用户反馈处理（任务包 A）。
 *
 * 与同目录 AdminFeedback.vue 是**两套不同的数据**：
 *  - AdminFeedback.vue = 员工经运营助手提的反馈（AdminFeedback 表）；
 *  - 本页 = C 端用户通过 App「意见反馈」提交的反馈（Feedback 表）。
 *
 * 敏感内容边界：列表与详情一律是**脱敏视图**；查看联系方式 / 正文原文 / 截图各走一次
 * 独立调用，服务端会写审计日志并单独限流。正则脱敏只降低偶然暴露概率，不构成保证，
 * 因此权限不因「已脱敏」而放宽。
 */
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { userFeedbackApi } from "@/api";
import PageHeader from "@/components/PageHeader.vue";

interface Diagnosis {
  id: string | null;
  source: string | null;
  state: "valid" | "all_zero" | "missing";
}
interface FeedbackRow {
  id: string;
  type: string;
  status: string;
  userRef: string;
  nickname: string;
  contentMasked: string;
  contactMasked: string;
  hasContact: boolean;
  imageCount: number;
  result: string;
  createdAt: string;
  updatedAt: string;
  diagnosis: Diagnosis;
}

const typeMeta: Record<string, { label: string; type: string }> = {
  bug: { label: "问题反馈", type: "danger" },
  suggestion: { label: "功能建议", type: "warning" },
  complaint: { label: "投诉举报", type: "danger" },
  course_rating: { label: "体验评价", type: "info" },
  other: { label: "其他", type: "" },
  feed_dislike: { label: "不感兴趣信号", type: "info" },
};
const statusMeta: Record<string, { label: string; type: string }> = {
  pending: { label: "待处理", type: "danger" },
  processing: { label: "处理中", type: "warning" },
  resolved: { label: "已解决", type: "success" },
};
const diagMeta: Record<string, { label: string; type: string }> = {
  valid: { label: "有编号", type: "success" },
  all_zero: { label: "编号全零", type: "warning" },
  missing: { label: "无编号", type: "info" },
};

const loading = ref(false);
const rows = ref<FeedbackRow[]>([]);
const total = ref(0);
const stats = ref<{
  byStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
  diagnosis: { valid: number; all_zero: number; missing: number; sampled: number };
} | null>(null);

const query = reactive({
  type: "",
  status: "",
  keyword: "",
  startDate: "",
  endDate: "",
  signalsOnly: false,
  page: 1,
  pageSize: 20,
});

const pendingCount = computed(
  () => stats.value?.byStatus.find((s) => s.status === "pending")?.count ?? 0,
);

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await userFeedbackApi.list({
      type: query.type || undefined,
      status: query.status || undefined,
      keyword: query.keyword || undefined,
      startDate: query.startDate || undefined,
      endDate: query.endDate || undefined,
      signalsOnly: query.signalsOnly ? "1" : undefined,
      page: query.page,
      pageSize: query.pageSize,
    });
    rows.value = data.items ?? [];
    total.value = data.total ?? 0;
  } catch (e) {
    ElMessage.error((e as Error)?.message || "加载失败");
  } finally {
    loading.value = false;
  }
}
async function fetchStats() {
  try {
    stats.value = (await userFeedbackApi.stats()).data;
  } catch {
    /* 统计失败不挡列表 */
  }
}
function search() {
  query.page = 1;
  fetchList();
}

// ── 明文 / 截图：每次都是一次独立调用，服务端留痕 ──
const revealed = reactive<Record<string, { contact?: string; content?: string; images?: string[] }>>({});
async function reveal(row: FeedbackRow, what: "contact" | "content" | "images") {
  const tip =
    what === "contact" ? "查看联系方式明文" : what === "content" ? "查看正文原文" : "查看用户上传的截图";
  try {
    await ElMessageBox.confirm(
      `${tip}会记入审计日志（含操作人与时间）。仅在处理该工单确有必要时查看。`,
      "需要留痕的操作",
      { type: "warning", confirmButtonText: "确认查看", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  try {
    // 先在一个**普通对象**上取值，最后整体赋回 `revealed[row.id]`。
    //
    // 不能写成 `const cur = revealed[row.id] ?? (revealed[row.id] = {})` 再改 `cur.xxx`：
    // 赋值表达式的值是那个**原始对象**，不是 reactive 代理，后续 `cur.content = …`
    // 绕过代理写进原始对象，Vue 收不到通知，单元格不会更新。
    // 实测表现是：接口 201 正常返回原文、页面无任何报错、审计也照记，
    // 但界面始终显示脱敏串 —— 用户只会以为没点上，反复点，白白刷审计日志。
    const cur = { ...(revealed[row.id] ?? {}) };
    if (what === "contact") cur.contact = (await userFeedbackApi.revealContact(row.id)).data.contact;
    if (what === "content") cur.content = (await userFeedbackApi.revealContent(row.id)).data.content;
    if (what === "images") cur.images = (await userFeedbackApi.revealImages(row.id)).data.images;
    revealed[row.id] = cur; // 整体替换，走 reactive 的 set 陷阱，确保重渲染
  } catch (e) {
    ElMessage.error((e as Error)?.message || "获取失败");
  }
}

// ── 状态流转 ──
const flow = reactive({ open: false, id: "", target: "", result: "" });
function openFlow(row: FeedbackRow, target: string) {
  flow.open = true;
  flow.id = row.id;
  flow.target = target;
  flow.result = row.result || "";
}
const flowNeedsResult = computed(() => flow.target === "resolved" || flow.target === "pending");
async function submitFlow() {
  if (flowNeedsResult.value && !flow.result.trim()) {
    ElMessage.warning(flow.target === "resolved" ? "结案必须填写处理结果" : "回退必须填写原因");
    return;
  }
  try {
    await userFeedbackApi.updateStatus(flow.id, { status: flow.target, result: flow.result.trim() || undefined });
    ElMessage.success("已更新，用户端可立即看到新状态");
    flow.open = false;
    fetchList();
    fetchStats();
  } catch (e) {
    ElMessage.error((e as Error)?.message || "更新失败");
  }
}

onMounted(() => {
  fetchList();
  fetchStats();
});
</script>

<template>
  <div class="page">
    <PageHeader title="用户反馈处理">
      <template #subtitle>
        C 端用户提交的意见反馈与投诉。与「运营反馈」（员工侧）是两套数据。
      </template>
    </PageHeader>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="privacy-tip"
      title="列表与详情为脱敏视图"
      description="联系方式、正文原文、截图需单独点开，每次都会记入审计日志。正则脱敏只降低偶然暴露概率，不保证消除全部敏感内容，请按最小必要原则查看。"
    />

    <div
      v-if="stats"
      class="stat-row"
    >
      <el-card
        v-for="s in stats.byStatus"
        :key="s.status"
        shadow="never"
        class="stat-card"
      >
        <div class="stat-label">
          {{ statusMeta[s.status]?.label || s.status }}
        </div>
        <div class="stat-value">
          {{ s.count }}
        </div>
      </el-card>
      <el-card
        shadow="never"
        class="stat-card"
      >
        <div class="stat-label">
          诊断编号（近 {{ stats.diagnosis.sampled }} 条问题反馈）
        </div>
        <div class="stat-diag">
          <el-tag
            type="success"
            size="small"
          >有编号 {{ stats.diagnosis.valid }}</el-tag>
          <el-tag
            type="warning"
            size="small"
          >全零 {{ stats.diagnosis.all_zero }}</el-tag>
          <el-tag
            type="info"
            size="small"
          >无编号 {{ stats.diagnosis.missing }}</el-tag>
        </div>
      </el-card>
    </div>

    <div class="filter-row">
      <el-select
        v-model="query.status"
        placeholder="全部状态"
        clearable
        style="width:130px"
        @change="search"
      >
        <el-option
          v-for="(m, k) in statusMeta"
          :key="k"
          :label="m.label"
          :value="k"
        />
      </el-select>
      <el-select
        v-model="query.type"
        placeholder="全部类型"
        clearable
        style="width:150px"
        @change="search"
      >
        <el-option
          v-for="(m, k) in typeMeta"
          :key="k"
          :label="m.label"
          :value="k"
        />
      </el-select>
      <el-date-picker
        v-model="query.startDate"
        type="date"
        placeholder="开始日期"
        value-format="YYYY-MM-DD"
        style="width:150px"
      />
      <el-date-picker
        v-model="query.endDate"
        type="date"
        placeholder="结束日期"
        value-format="YYYY-MM-DD"
        style="width:150px"
      />
      <el-input
        v-model="query.keyword"
        placeholder="正文或反馈 ID"
        clearable
        style="width:220px"
        @keyup.enter="search"
      />
      <el-checkbox
        v-model="query.signalsOnly"
        @change="search"
      >
        只看「不感兴趣」信号
      </el-checkbox>
      <el-button
        type="primary"
        @click="search"
      >
        查询
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="rows"
      border
      style="width:100%"
    >
      <el-table-column
        label="类型"
        width="110"
      >
        <template #default="{ row }">
          <el-tag
            :type="(typeMeta[row.type]?.type as any) || ''"
            size="small"
          >
            {{ typeMeta[row.type]?.label || row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="(statusMeta[row.status]?.type as any) || ''"
            size="small"
          >
            {{ statusMeta[row.status]?.label || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="用户"
        width="150"
      >
        <template #default="{ row }">
          {{ row.nickname || "—" }}<br>
          <span class="dim">…{{ row.userRef }}</span>
        </template>
      </el-table-column>
      <el-table-column label="内容（已脱敏）">
        <template #default="{ row }">
          <div class="content">
            {{ revealed[row.id]?.content ?? row.contentMasked }}
          </div>
          <div class="row-actions">
            <el-button
              link
              type="primary"
              size="small"
              @click="reveal(row, 'content')"
            >
              查看原文
            </el-button>
            <el-button
              v-if="row.hasContact"
              link
              type="primary"
              size="small"
              @click="reveal(row, 'contact')"
            >
              联系方式：{{ revealed[row.id]?.contact ?? row.contactMasked }}
            </el-button>
            <el-button
              v-if="row.imageCount > 0"
              link
              type="primary"
              size="small"
              @click="reveal(row, 'images')"
            >
              {{ row.imageCount }} 张截图
            </el-button>
          </div>
          <div
            v-if="revealed[row.id]?.images?.length"
            class="imgs"
          >
            <el-image
              v-for="u in revealed[row.id]?.images"
              :key="u"
              :src="u"
              :preview-src-list="revealed[row.id]?.images"
              fit="cover"
              class="img"
            />
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="诊断编号"
        width="150"
      >
        <template #default="{ row }">
          <el-tag
            :type="(diagMeta[row.diagnosis.state]?.type as any) || ''"
            size="small"
          >
            {{ diagMeta[row.diagnosis.state]?.label }}
          </el-tag>
          <div
            v-if="row.diagnosis.id"
            class="dim mono"
          >
            {{ row.diagnosis.id.slice(0, 12) }}…
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="处理结果"
        width="180"
      >
        <template #default="{ row }">
          <span :class="{ dim: !row.result }">{{ row.result || "—" }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="提交时间"
        width="170"
      >
        <template #default="{ row }">
          {{ new Date(row.createdAt).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="180"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'pending'"
            size="small"
            type="primary"
            @click="openFlow(row, 'processing')"
          >
            认领
          </el-button>
          <el-button
            v-if="row.status !== 'resolved'"
            size="small"
            type="success"
            @click="openFlow(row, 'resolved')"
          >
            结案
          </el-button>
          <el-button
            v-if="row.status !== 'pending'"
            size="small"
            @click="openFlow(row, 'pending')"
          >
            退回
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="query.page"
      v-model:page-size="query.pageSize"
      :total="total"
      :page-sizes="[20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      class="pager"
      @current-change="fetchList"
      @size-change="search"
    />

    <el-dialog
      v-model="flow.open"
      :title="flow.target === 'resolved' ? '结案' : flow.target === 'pending' ? '退回待处理' : '认领'"
      width="520px"
    >
      <el-input
        v-model="flow.result"
        type="textarea"
        :rows="4"
        :placeholder="flow.target === 'resolved'
          ? '必填：写清怎么处理的，用户在 App 内能看到状态变化'
          : flow.target === 'pending' ? '必填：为什么退回' : '可选：备注'"
      />
      <template #footer>
        <el-button @click="flow.open = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="submitFlow"
        >
          确认
        </el-button>
      </template>
    </el-dialog>

    <div class="footnote">
      待处理 {{ pendingCount }} 条。操作记录（含查看明文）可在「系统管理 → 操作日志」按
      targetType=FEEDBACK 查询。
    </div>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.privacy-tip { margin-bottom: 12px; }
.stat-row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.stat-card { min-width: 150px; }
.stat-label { font-size: 12px; color: #909399; }
.stat-value { font-size: 26px; font-weight: 600; margin-top: 4px; }
.stat-diag { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.filter-row { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
.content { white-space: pre-wrap; word-break: break-word; line-height: 1.6; }
.row-actions { margin-top: 6px; display: flex; gap: 12px; flex-wrap: wrap; }
.imgs { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.img { width: 72px; height: 72px; border-radius: 4px; }
.dim { color: #909399; font-size: 12px; }
.mono { font-family: ui-monospace, Menlo, Consolas, monospace; }
.pager { margin-top: 12px; justify-content: flex-end; }
.footnote { margin-top: 12px; color: #909399; font-size: 12px; }
</style>
