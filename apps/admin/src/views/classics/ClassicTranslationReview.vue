<template>
  <div class="tr-page">
    <div class="page-header">
      <div>
        <h3>白话译文复核</h3>
        <p class="sub">
          读者点「译文」时由模型生成并共享给所有人。这里人工把关：通过（可顺手改译）或驳回。驳回后读者看不到这条译文，下次请求会重新生成并回到待复核。
        </p>
      </div>
      <el-radio-group v-model="query.review" size="small" @change="reload">
        <el-radio-button value="pending">待复核</el-radio-button>
        <el-radio-button value="approved">已通过</el-radio-button>
        <el-radio-button value="rejected">已驳回</el-radio-button>
      </el-radio-group>
    </div>

    <div class="filters">
      <el-select v-model="query.sourceType" size="small" clearable placeholder="全部来源" style="width:160px" @change="reload">
        <el-option label="段落译文" value="classic_segment" />
        <el-option label="自由文本译文" value="classic_translation" />
      </el-select>
      <el-input v-model="query.keyword" size="small" clearable placeholder="搜索译文内容" style="width:220px" @keyup.enter="reload" @clear="reload" />
      <el-button size="small" type="primary" @click="reload">查询</el-button>
    </div>

    <el-alert v-if="loadError" type="error" :closable="false" :title="loadError" show-icon style="margin-bottom:12px" />

    <el-table v-loading="loading" :data="rows" size="small" border>
      <el-table-column label="出处" width="180">
        <template #default="{ row }">
          <template v-if="row.sourceType === 'classic_segment'">
            <div>{{ row.bookTitle || '（段落已删除）' }}</div>
            <div class="muted">{{ row.chapterTitle }}</div>
          </template>
          <div v-else class="muted">自由文本</div>
          <el-tag v-if="row.stale" type="info" size="small">原文已修订</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="原文" min-width="220">
        <template #default="{ row }"><div class="clip">{{ row.original || '—' }}</div></template>
      </el-table-column>
      <el-table-column label="译文" min-width="260">
        <template #default="{ row }"><div class="clip">{{ row.translation || '—' }}</div></template>
      </el-table-column>
      <el-table-column label="模型" width="120">
        <template #default="{ row }">
          <div>{{ row.model || '—' }}</div>
          <div class="muted">{{ row.promptVersion }}</div>
        </template>
      </el-table-column>
      <el-table-column :label="query.review === 'pending' ? '生成时间' : '复核时间'" width="150">
        <template #default="{ row }">{{ fmtDate(query.review === 'pending' ? row.createdAt : row.reviewedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row)">
            {{ row.reviewStatus === 'rejected' ? '查看' : '复核' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > query.pageSize"
      class="pager"
      layout="total, prev, pager, next"
      :total="total"
      :page-size="query.pageSize"
      :current-page="query.page"
      @current-change="onPage"
    />

    <el-drawer v-model="detailOpen" title="白话译文复核" size="640px">
      <template v-if="current">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="出处">
            {{ current.sourceType === 'classic_segment' ? `${current.bookTitle || '（段落已删除）'} · ${current.chapterTitle || ''}` : '自由文本' }}
          </el-descriptions-item>
          <el-descriptions-item label="复核状态">{{ REVIEW[current.reviewStatus] || current.reviewStatus }}</el-descriptions-item>
          <el-descriptions-item v-if="current.reviewNote" label="驳回原因">{{ current.reviewNote }}</el-descriptions-item>
          <el-descriptions-item label="原文"><div class="pre">{{ current.original || '—' }}</div></el-descriptions-item>
          <el-descriptions-item v-if="current.source" label="模型推测出处">{{ current.source }}</el-descriptions-item>
        </el-descriptions>
        <el-alert
          v-if="current.stale"
          type="info"
          :closable="false"
          show-icon
          title="这段原文已修订，读者看到的是新原文的译文；这条旧译文复核与否不影响读者。"
          style="margin-top:12px"
        />

        <div v-if="editable" class="review-box">
          <el-form label-width="80px" size="small">
            <el-form-item label="译文">
              <el-input id="tr-translation" v-model="form.translation" type="textarea" :autosize="{ minRows: 5, maxRows: 16 }" maxlength="6000" />
            </el-form-item>
            <el-form-item label="注释">
              <el-input id="tr-notes" v-model="form.notes" type="textarea" :autosize="{ minRows: 3, maxRows: 10 }" placeholder="每行一条" />
            </el-form-item>
            <el-form-item label="驳回原因">
              <el-input id="tr-note" v-model="form.note" type="textarea" :rows="2" maxlength="300" placeholder="驳回时必填" />
            </el-form-item>
          </el-form>
          <div class="review-actions">
            <el-button size="small" type="danger" plain :loading="acting" @click="reject">驳回</el-button>
            <el-button size="small" type="primary" :loading="acting" @click="approve">{{ changed ? '保存修改并通过' : '通过' }}</el-button>
          </div>
        </div>
        <div v-else class="review-box">
          <div class="label">译文</div>
          <div class="pre">{{ current.translation || '—' }}</div>
          <template v-if="current.notes.length">
            <div class="label">注释</div>
            <ul class="notes"><li v-for="(n, i) in current.notes" :key="i">{{ n }}</li></ul>
          </template>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { classicTranslationAdminApi, type TranslationReviewRow } from "@/api/classic-translations";

const REVIEW: Record<string, string> = { none: "待复核", pending_review: "待复核", approved: "已通过", rejected: "已驳回" };

const query = reactive({ review: "pending", sourceType: "", keyword: "", page: 1, pageSize: 20 });
const rows = ref<TranslationReviewRow[]>([]);
const total = ref(0);
const loading = ref(false);
const loadError = ref("");
const detailOpen = ref(false);
const current = ref<TranslationReviewRow | null>(null);
const form = reactive({ translation: "", notes: "", note: "" });
const acting = ref(false);

// 已驳回的译文已下线，只能查看；已通过的仍可再次改译
const editable = computed(() => !!current.value && current.value.reviewStatus !== "rejected" && current.value.processingStatus === "completed");
const editedNotes = computed(() => form.notes.split("\n").map((s) => s.trim()).filter(Boolean));
const changed = computed(() => {
  if (!current.value) return false;
  return form.translation.trim() !== current.value.translation.trim() || editedNotes.value.join("\n") !== current.value.notes.join("\n");
});

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
    const params: Record<string, unknown> = { review: query.review, page: query.page, pageSize: query.pageSize };
    if (query.sourceType) params.sourceType = query.sourceType;
    if (query.keyword.trim()) params.keyword = query.keyword.trim();
    const res = await classicTranslationAdminApi.list(params);
    rows.value = res.rows;
    total.value = res.total;
  } catch (e) {
    loadError.value = errMsg(e, "加载失败，请刷新重试");
  } finally {
    loading.value = false;
  }
}
function reload() {
  query.page = 1;
  load();
}
function onPage(p: number) {
  query.page = p;
  load();
}

function openDetail(row: TranslationReviewRow) {
  current.value = row;
  form.translation = row.translation;
  form.notes = row.notes.join("\n");
  form.note = "";
  detailOpen.value = true;
}

async function approve() {
  if (!current.value) return;
  if (!form.translation.trim()) {
    ElMessage.warning("译文不能为空");
    return;
  }
  const edited = changed.value;
  acting.value = true;
  try {
    const body: { resultHash: string; edit?: { translation: string; notes: string[] } } = { resultHash: current.value.resultHash };
    if (edited) body.edit = { translation: form.translation.trim(), notes: editedNotes.value };
    await classicTranslationAdminApi.approve(current.value.id, body);
    ElMessage.success(edited ? "已保存修改并通过" : "已通过");
    detailOpen.value = false;
    load();
  } catch (e) {
    ElMessage.error(errMsg(e, "操作失败"));
  } finally {
    acting.value = false;
  }
}

async function reject() {
  if (!current.value) return;
  if (!form.note.trim()) {
    ElMessage.warning("请填写驳回原因");
    return;
  }
  acting.value = true;
  try {
    await classicTranslationAdminApi.reject(current.value.id, { resultHash: current.value.resultHash, note: form.note.trim() });
    ElMessage.success("已驳回，读者将看不到这条译文");
    detailOpen.value = false;
    load();
  } catch (e) {
    ElMessage.error(errMsg(e, "驳回失败"));
  } finally {
    acting.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.tr-page { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; }
.page-header h3 { margin: 0 0 6px; }
.sub { margin: 0; max-width: 70ch; color: var(--color-text-body, #606266); font-size: 13px; line-height: 1.6; }
.filters { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.muted { color: var(--color-text-secondary, #909399); font-size: 12px; }
.clip { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.6; }
.pre { white-space: pre-wrap; line-height: 1.7; }
.pager { margin-top: 12px; justify-content: flex-end; }
.review-box { margin-top: 16px; }
.review-actions { display: flex; justify-content: flex-end; gap: 8px; }
.label { margin: 12px 0 4px; color: var(--color-text-secondary, #909399); font-size: 12px; }
.notes { margin: 0; padding-left: 18px; line-height: 1.7; }
</style>
