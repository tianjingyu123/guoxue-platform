<script setup lang="ts">
/** 运营反馈汇总（管理层专属）：员工经运营助手反馈的问题→审阅、批复、拍板→技术团队优化。 */
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { adminAssistantApi } from "@/api";
import PageHeader from "@/components/PageHeader.vue";

interface FeedbackRow {
  id: string; userName: string; userId: string; page: string; category: string;
  title: string; detail: string; status: string; reply: string; source: string; createdAt: string; images?: string[];
}

const catMeta: Record<string, { label: string; type: string }> = {
  BUG: { label: "程序问题", type: "danger" },
  OPTIMIZE: { label: "优化建议", type: "warning" },
  QUESTION: { label: "操作疑问", type: "info" },
  OTHER: { label: "其他", type: "" },
};
const statusMeta: Record<string, { label: string; type: string }> = {
  PENDING: { label: "待审", type: "danger" },
  REVIEWED: { label: "已阅", type: "info" },
  ADOPTED: { label: "采纳", type: "success" },
  REJECTED: { label: "不采纳", type: "info" },
  DONE: { label: "已优化", type: "success" },
};
const statusOptions = Object.keys(statusMeta);

const loading = ref(false);
const rows = ref<FeedbackRow[]>([]);
const total = ref(0);
const summary = ref<{ statusCounts?: Record<string, number>; categoryCounts?: Record<string, number>; pendingCount?: number }>({});
const filters = reactive<{ status?: string; category?: string; page: number; pageSize: number }>({ status: undefined, category: undefined, page: 1, pageSize: 20 });

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await adminAssistantApi.listFeedback({ ...filters });
    rows.value = data.items || [];
    total.value = data.total || 0;
  } catch { ElMessage.error("加载失败"); } finally { loading.value = false; }
}
async function fetchSummary() {
  try { const { data } = await adminAssistantApi.summary(); summary.value = data || {}; } catch { /* ignore */ }
}

const editing = ref<FeedbackRow | null>(null);
const editForm = reactive({ status: "", reply: "" });
function openEdit(row: FeedbackRow) {
  editing.value = row;
  editForm.status = row.status;
  editForm.reply = row.reply || "";
}
async function saveEdit() {
  if (!editing.value) return;
  try {
    await adminAssistantApi.updateFeedback(editing.value.id, { status: editForm.status, reply: editForm.reply });
    ElMessage.success("已保存");
    editing.value = null;
    fetchList(); fetchSummary();
  } catch { ElMessage.error("保存失败"); }
}

// 还原 SanitizePipe 的实体转义（老数据 page 存成 &#x2F;·纯文本展示安全）
function decodePath(s: string): string {
  return String(s || "").replace(/&#x2F;/gi, "/").replace(/&#47;/g, "/").replace(/&amp;/gi, "&").replace(/&#x27;/gi, "'").replace(/&#39;/g, "'");
}
// 点击页面路径→新标签打开对应后台页面（便于定位问题）
function jumpPage(page: string) {
  const path = decodePath(page || "").trim();
  if (!path.startsWith("/")) return;
  window.open("/admin" + path, "_blank");
}

function onSearch() { filters.page = 1; fetchList(); }
function onPageChange(p: number) { filters.page = p; fetchList(); }

onMounted(() => { fetchList(); fetchSummary(); });
</script>

<template>
  <div class="feedback-page">
    <PageHeader title="运营反馈" subtitle="员工经运营助手反馈的问题汇总·审阅拍板后交技术团队优化" />

    <!-- 汇总卡 -->
    <div class="stat-row">
      <div class="stat-card pending">
        <div class="stat-num">{{ summary.statusCounts?.PENDING || 0 }}</div>
        <div class="stat-label">待审处理</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ summary.categoryCounts?.BUG || 0 }}</div>
        <div class="stat-label">程序问题</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ summary.categoryCounts?.OPTIMIZE || 0 }}</div>
        <div class="stat-label">优化建议</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ summary.statusCounts?.ADOPTED || 0 }}</div>
        <div class="stat-label">已采纳</div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <el-select v-model="filters.status" placeholder="全部状态" clearable style="width:140px" @change="onSearch">
        <el-option v-for="s in statusOptions" :key="s" :label="statusMeta[s].label" :value="s" />
      </el-select>
      <el-select v-model="filters.category" placeholder="全部类型" clearable style="width:140px" @change="onSearch">
        <el-option v-for="(m, k) in catMeta" :key="k" :label="m.label" :value="k" />
      </el-select>
      <el-button @click="fetchList">刷新</el-button>
    </div>

    <!-- 列表 -->
    <el-table v-loading="loading" :data="rows" border style="width:100%">
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="catMeta[row.category]?.type || 'info'" size="small">{{ catMeta[row.category]?.label || row.category }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
      <el-table-column prop="detail" label="详情" min-width="240" show-overflow-tooltip />
      <el-table-column label="页面" width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link v-if="row.page" type="primary" :underline="false" @click="jumpPage(row.page)">{{ decodePath(row.page) }} ↗</el-link>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="userName" label="提交人" width="110">
        <template #default="{ row }">{{ row.userName || row.userId?.slice(0, 8) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusMeta[row.status]?.type || 'info'" size="small">{{ statusMeta[row.status]?.label || row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="时间" width="160">
        <template #default="{ row }">{{ String(row.createdAt).slice(0, 16).replace('T', ' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="openEdit(row)">处理</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination background layout="total, prev, pager, next" :total="total" :page-size="filters.pageSize" :current-page="filters.page" @current-change="onPageChange" />
    </div>

    <!-- 处理弹窗 -->
    <el-dialog v-model="editing" title="处理反馈" width="560px" :close-on-click-modal="false" @close="editing = null">
      <template v-if="editing">
        <div class="detail-block">
          <div class="d-title">{{ editing.title }}</div>
          <div class="d-meta">
            <el-tag :type="catMeta[editing.category]?.type || 'info'" size="small">{{ catMeta[editing.category]?.label }}</el-tag>
            <el-link v-if="editing.page" type="primary" :underline="false" @click="jumpPage(editing.page)">{{ decodePath(editing.page) }} ↗ 打开该页面</el-link>
          </div>
          <div class="d-detail">{{ decodePath(editing.detail) || '（无详情）' }}</div>
          <div v-if="editing.images && editing.images.length" class="d-shots">
            <el-image
              v-for="(img, i) in editing.images" :key="i"
              :src="img" :preview-src-list="editing.images" :initial-index="i"
              fit="cover" class="d-shot"
            />
          </div>
        </div>
        <el-form label-position="top">
          <el-form-item label="状态（拍板）">
            <el-select v-model="editForm.status" style="width:100%">
              <el-option v-for="s in statusOptions" :key="s" :label="statusMeta[s].label" :value="s" />
            </el-select>
          </el-form-item>
          <el-form-item label="批复/处理说明">
            <el-input v-model="editForm.reply" type="textarea" :rows="3" maxlength="2000" placeholder="如：采纳，交技术优化；或：非问题，是操作方式" />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="editing = null">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.feedback-page { padding: 4px; }
.stat-row { display: flex; gap: 16px; margin: 16px 0; }
.stat-card { flex: 1; background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 18px; text-align: center; }
.stat-card.pending { border-color: #f5c2c7; background: #fff5f5; }
.stat-num { font-size: 28px; font-weight: 700; color: #c41e3a; }
.stat-label { font-size: 13px; color: #888; margin-top: 4px; }
.filter-bar { display: flex; gap: 10px; margin-bottom: 14px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
.detail-block { background: #faf9f7; border: 1px solid #eee; border-radius: 8px; padding: 14px; margin-bottom: 16px; }
.d-title { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
.d-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.d-page { font-size: 12px; color: #999; }
.d-detail { font-size: 14px; color: #555; line-height: 1.6; white-space: pre-wrap; }
.d-shots { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
.d-shot { width: 90px; height: 90px; border-radius: 6px; border: 1px solid #eee; cursor: pointer; }
</style>
