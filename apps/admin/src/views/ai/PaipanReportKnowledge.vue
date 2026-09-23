<template>
  <div class="prk-page">
    <div class="page-header">
      <div>
        <h3>排盘报告知识库</h3>
        <p class="sub">
          小卜八字报告只引用这里“已审核”的门派理论与指定古籍原文。修改已审核条目会退回草稿并升版本，重新审核后才会被新报告引用。
        </p>
      </div>
      <div class="actions">
        <el-button size="small" @click="previewOpen = true">试匹配</el-button>
        <el-button size="small" type="primary" @click="openCreate">新建条目</el-button>
      </div>
    </div>

    <div class="toolbar-row">
      <el-select v-model="query.status" placeholder="状态" clearable size="small" style="width:120px" @change="reload">
        <el-option label="草稿" value="DRAFT" />
        <el-option label="已审核" value="APPROVED" />
        <el-option label="已停用" value="RETIRED" />
      </el-select>
      <el-select v-model="query.kind" placeholder="类型" clearable size="small" style="width:130px" @change="reload">
        <el-option label="门派理论" value="school_theory" />
        <el-option label="古籍原文" value="classic_excerpt" />
        <el-option label="知识要点" value="knowledge_point" />
      </el-select>
      <el-select v-model="query.school" placeholder="门派" clearable size="small" style="width:130px" @change="reload">
        <el-option label="通用" value="_common" />
        <el-option v-for="s in SCHOOLS" :key="s.value" :label="s.label" :value="s.value" />
      </el-select>
      <el-input
        id="prk-keyword"
        v-model="query.keyword"
        placeholder="搜索标题、正文、书名或标签"
        size="small"
        clearable
        style="width:240px"
        @keyup.enter="reload"
        @clear="reload"
      />
      <el-button size="small" @click="reload">查询</el-button>
    </div>

    <el-alert v-if="loadError" type="error" :closable="false" :title="loadError" show-icon style="margin-bottom:12px" />

    <el-table v-loading="loading" :data="rows" size="small" border>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="STATUS[row.status]?.type" size="small">{{ STATUS[row.status]?.label || row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <el-tag v-if="row.kind === 'classic_excerpt'" size="small" type="warning">古籍原文</el-tag>
          <el-tag v-else-if="row.kind === 'knowledge_point'" size="small" type="info">知识要点</el-tag>
          <el-tag v-else size="small">门派理论</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="门派" width="90">
        <template #default="{ row }">{{ schoolLabel(row.school) }}</template>
      </el-table-column>
      <el-table-column prop="topic" label="主题" width="90" />
      <el-table-column label="标题 / 出处" min-width="220">
        <template #default="{ row }">
          <div class="title-cell">{{ row.title }}</div>
          <div v-if="row.bookTitle" class="muted">《{{ row.bookTitle }}》{{ row.chapterTitle ? `· ${row.chapterTitle}` : '' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="匹配标签" min-width="180">
        <template #default="{ row }">
          <el-tag v-for="t in row.tags" :key="t" size="small" effect="plain" class="tag">{{ t }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="version" label="版本" width="60" align="center" />
      <el-table-column label="更新时间" width="150">
        <template #default="{ row }">{{ fmtDate(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status !== 'RETIRED'" link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="row.status === 'DRAFT'" link type="success" size="small" @click="approve(row)">审核通过</el-button>
          <el-button v-if="row.status !== 'RETIRED'" link type="danger" size="small" @click="retire(row)">停用</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="query.page"
        :page-size="query.pageSize"
        :total="total"
        layout="total, prev, pager, next"
        small
        @current-change="load"
      />
    </div>

    <!-- 新建/编辑 -->
    <el-dialog v-model="formOpen" :title="editingId ? '编辑知识条目' : '新建知识条目'" width="640px">
      <el-alert
        v-if="editingStatus === 'APPROVED'"
        type="warning"
        :closable="false"
        show-icon
        title="该条目已审核。保存修改后会退回草稿、版本号加一，需要重新审核。"
        style="margin-bottom:12px"
      />
      <el-form label-width="90px" size="small">
        <el-form-item label="类型" required>
          <el-radio-group v-model="form.kind">
            <el-radio value="school_theory">门派理论</el-radio>
            <el-radio value="classic_excerpt">古籍原文</el-radio>
            <el-radio value="knowledge_point">知识要点</el-radio>
          </el-radio-group>
          <div class="muted">
            <b>古籍原文</b>只用于公版古籍白文（作者已去世很久），报告中可展示原文并跳转读原书。<br>
            <b>知识要点</b>用于从现代著作、网络资料、口传流派整理来的知识：<b>必须用自己的话重述</b>，报告中只作要点转述、不冒充某本书的原文。著作权保护表达而非思想——理论方法本身可以用，逐字复制他人文字则不行（注明来源也不免责）。
          </div>
        </el-form-item>
        <template v-if="form.kind !== 'classic_excerpt'">
          <el-form-item label="来源类别" required>
            <el-select id="prk-form-source-kind" v-model="form.sourceKind" style="width:200px">
              <el-option label="平台自行撰写" value="platform_expert" />
              <el-option label="网络资料整理" value="web" />
              <el-option label="现代著作整理" value="modern_work" />
              <el-option label="口传流派整理" value="oral" />
            </el-select>
            <div class="muted">除「平台自行撰写」外，须至少填一条来源线索，便于审核追溯与交叉验证。</div>
          </el-form-item>
          <el-form-item v-if="form.sourceKind !== 'platform_expert'" label="来源线索" required>
            <div v-for="(r, i) in form.sourceRefs" :key="i" class="srcrow">
              <el-input v-model="r.label" placeholder="来源名称，如书名 / 网站 / 栏目" style="width:32%" maxlength="200" />
              <el-input v-model="r.url" placeholder="链接（可选）" style="width:32%" maxlength="500" />
              <el-input v-model="r.note" placeholder="备注：版本、查阅日期、交叉验证情况" style="width:26%" maxlength="300" />
              <el-button link type="danger" size="small" @click="form.sourceRefs!.splice(i, 1)">删除</el-button>
            </div>
            <el-button size="small" @click="form.sourceRefs!.push({ label: '', url: '', note: '' })">添加来源</el-button>
          </el-form-item>
          <el-form-item label="重述确认" required>
            <el-checkbox id="prk-form-restated" v-model="form.restated">本条已用自己的话重述，未逐字复制他人表达</el-checkbox>
          </el-form-item>
        </template>
        <el-form-item label="门派">
          <el-select id="prk-form-school" v-model="form.school" clearable placeholder="留空表示各派通用" style="width:200px">
            <el-option v-for="s in SCHOOLS" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="主题" required>
          <el-select id="prk-form-topic" v-model="form.topic" filterable allow-create placeholder="选择或输入" style="width:200px">
            <el-option v-for="t in TOPICS" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="匹配标签" required>
          <el-select
            id="prk-form-tags"
            v-model="form.tags"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入后回车，如 偏财格、庚、寅月、用神土、天乙贵人"
            style="width:100%"
          />
          <div class="muted">报告按格局、用神（写作“用神土”）、日主天干（如“庚”）、月令（如“寅月”）、神煞名精确匹配。</div>
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input id="prk-form-title" v-model="form.title" maxlength="120" />
        </el-form-item>
        <template v-if="form.kind === 'classic_excerpt'">
          <el-form-item label="书名" required>
            <el-input id="prk-form-book" v-model="form.bookTitle" maxlength="80" placeholder="不含书名号" />
          </el-form-item>
          <el-form-item label="篇名">
            <el-input id="prk-form-chapter" v-model="form.chapterTitle" maxlength="120" />
          </el-form-item>
          <el-form-item label="古籍库关联">
            <el-input id="prk-form-book-id" v-model="form.classicBookId" placeholder="书籍 ID（可选，用于读原书）" style="margin-bottom:6px" />
            <el-input id="prk-form-chapter-id" v-model="form.classicChapterId" placeholder="章节 ID（可选）" />
          </el-form-item>
        </template>
        <el-form-item :label="form.kind === 'classic_excerpt' ? '原文' : '知识要点'" required>
          <el-input
            id="prk-form-content"
            v-model="form.content"
            type="textarea"
            :rows="7"
            maxlength="4000"
            show-word-limit
            :placeholder="form.kind === 'classic_excerpt' ? '与底本逐字一致，不做改写' : '用自己的话写：什么盘面特征，按本派怎么判断。一条只讲一件事'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="formOpen = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" @click="save">保存为草稿</el-button>
      </template>
    </el-dialog>

    <!-- 试匹配 -->
    <el-drawer v-model="previewOpen" title="试匹配：这个盘会引用哪些条目" size="520px">
      <el-form label-width="80px" size="small">
        <el-form-item label="门派">
          <el-select id="prk-preview-school" v-model="preview.school" clearable placeholder="不指定则只用通用条目" style="width:200px">
            <el-option v-for="s in SCHOOLS" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="格局"><el-input id="prk-preview-geju" v-model="preview.geJu" placeholder="如 偏财格" /></el-form-item>
        <el-form-item label="用神"><el-input id="prk-preview-yong" v-model="preview.yongShen" placeholder="如 土" /></el-form-item>
        <el-form-item label="日主"><el-input id="prk-preview-day" v-model="preview.dayGan" placeholder="如 庚" /></el-form-item>
        <el-form-item label="月令"><el-input id="prk-preview-month" v-model="preview.monthZhi" placeholder="如 寅" /></el-form-item>
        <el-form-item label="神煞"><el-input id="prk-preview-shensha" v-model="preview.shenSha" placeholder="逗号分隔，如 天乙贵人,文昌" /></el-form-item>
        <el-form-item><el-button type="primary" :loading="previewing" @click="runPreview">试匹配</el-button></el-form-item>
      </el-form>
      <div v-if="previewResult">
        <div class="muted" style="margin-bottom:8px">匹配信号：{{ previewResult.signals.map((s) => s.value).join('、') || '无' }}</div>
        <el-empty v-if="!previewResult.hits.length" description="没有命中已审核条目，报告会写明“暂无依据”" />
        <div v-for="h in previewResult.hits" :key="h.id" class="hit">
          <div class="title-cell">{{ h.title }} <span class="muted">· {{ schoolLabel(h.school) }} · 得分 {{ h.score }}</span></div>
          <div class="muted">{{ h.matchedOn.join('、') }}</div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { paipanReportKnowledgeApi, type ReportKnowledgeRow, type ReportKnowledgeForm } from "@/api/paipan-report-knowledge";

const SCHOOLS = [
  { value: "ziping", label: "子平" },
  { value: "mangpai", label: "盲派" },
  { value: "xinpai", label: "新派" },
];
const TOPICS = ["格局", "用神", "十神", "日主", "月令", "神煞", "大运流年", "性格", "事业", "财富", "感情"];
const STATUS: Record<string, { label: string; type: "info" | "success" | "danger" }> = {
  DRAFT: { label: "草稿", type: "info" },
  APPROVED: { label: "已审核", type: "success" },
  RETIRED: { label: "已停用", type: "danger" },
};

const query = reactive({ status: "", kind: "", school: "", keyword: "", page: 1, pageSize: 20 });
const rows = ref<ReportKnowledgeRow[]>([]);
const total = ref(0);
const loading = ref(false);
const loadError = ref("");

const emptyForm = (): ReportKnowledgeForm => ({
  kind: "school_theory", school: null, topic: "", tags: [], title: "", content: "",
  bookTitle: "", chapterTitle: "", classicBookId: "", classicChapterId: "",
  sourceKind: "platform_expert", sourceRefs: [], restated: true,
});
const form = reactive<ReportKnowledgeForm>(emptyForm());
const formOpen = ref(false);
const editingId = ref("");
const editingStatus = ref("");
const saving = ref(false);

const previewOpen = ref(false);
const preview = reactive({ school: "", geJu: "", yongShen: "", dayGan: "", monthZhi: "", shenSha: "" });
const previewing = ref(false);
const previewResult = ref<Awaited<ReturnType<typeof paipanReportKnowledgeApi.previewMatch>> | null>(null);

function schoolLabel(s: string | null) {
  if (!s) return "通用";
  return SCHOOLS.find((x) => x.value === s)?.label || s;
}
function fmtDate(d: string) {
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
    const res = await paipanReportKnowledgeApi.list({ ...query });
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

function openCreate() {
  Object.assign(form, emptyForm());
  editingId.value = "";
  editingStatus.value = "";
  formOpen.value = true;
}
function openEdit(row: ReportKnowledgeRow) {
  Object.assign(form, emptyForm(), {
    kind: row.kind, school: row.school, topic: row.topic, tags: [...row.tags], title: row.title, content: row.content,
    bookTitle: row.bookTitle || "", chapterTitle: row.chapterTitle || "",
    classicBookId: row.classicBookId || "", classicChapterId: row.classicChapterId || "",
    sourceKind: row.sourceKind || (row.kind === "classic_excerpt" ? "classic_public" : "platform_expert"),
    sourceRefs: (row.sourceRefs || []).map((r) => ({ label: r.label, url: r.url || "", note: r.note || "" })),
    restated: row.restated ?? row.kind !== "classic_excerpt",
  });
  editingId.value = row.id;
  editingStatus.value = row.status;
  formOpen.value = true;
}

async function save() {
  if (!form.title.trim() || !form.topic || !form.content.trim() || !form.tags.length) {
    ElMessage.warning("请填写主题、至少一个匹配标签、标题和正文");
    return;
  }
  if (form.kind === "classic_excerpt" && !form.bookTitle?.trim()) {
    ElMessage.warning("古籍原文条目需要填写书名");
    return;
  }
  // 著作权红线：非公版来源必须重述并留来源线索（服务端同样校验，此处只做即时提示）
  if (form.kind !== "classic_excerpt") {
    if (!form.restated) {
      ElMessage.warning("请确认本条已用自己的话重述——逐字复制他人表达，注明来源也不免责");
      return;
    }
    if (form.sourceKind !== "platform_expert" && !(form.sourceRefs || []).some((r) => r.label.trim())) {
      ElMessage.warning("请至少填写一条来源线索，便于审核追溯与交叉验证");
      return;
    }
  }
  saving.value = true;
  try {
    const payload = { ...form, school: form.school || null };
    if (editingId.value) await paipanReportKnowledgeApi.update(editingId.value, payload);
    else await paipanReportKnowledgeApi.create(payload);
    ElMessage.success(editingStatus.value === "APPROVED" ? "已保存，条目已退回草稿等待重新审核" : "已保存为草稿");
    formOpen.value = false;
    load();
  } catch (e) {
    ElMessage.error(errMsg(e, "保存失败"));
  } finally {
    saving.value = false;
  }
}

async function approve(row: ReportKnowledgeRow) {
  try {
    const { value } = await ElMessageBox.prompt(
      `审核通过后，《${row.title}》会被新生成的报告引用。请确认内容与出处无误。`,
      "审核通过",
      { inputPlaceholder: "审核备注（可选）", confirmButtonText: "审核通过", cancelButtonText: "取消" },
    );
    await paipanReportKnowledgeApi.approve(row.id, value || undefined);
    ElMessage.success("已审核通过");
    load();
  } catch (e) {
    if (e !== "cancel" && e !== "close") ElMessage.error(errMsg(e, "审核失败"));
  }
}

async function retire(row: ReportKnowledgeRow) {
  try {
    const { value } = await ElMessageBox.prompt(
      `停用后《${row.title}》不再被新报告引用，已生成的报告不受影响。`,
      "停用条目",
      { inputPlaceholder: "停用原因（可选）", confirmButtonText: "停用", cancelButtonText: "取消", confirmButtonClass: "el-button--danger" },
    );
    await paipanReportKnowledgeApi.retire(row.id, value || undefined);
    ElMessage.success("已停用");
    load();
  } catch (e) {
    if (e !== "cancel" && e !== "close") ElMessage.error(errMsg(e, "停用失败"));
  }
}

async function runPreview() {
  previewing.value = true;
  try {
    previewResult.value = await paipanReportKnowledgeApi.previewMatch({
      school: preview.school || undefined,
      geJu: preview.geJu || undefined,
      yongShen: preview.yongShen || undefined,
      dayGan: preview.dayGan || undefined,
      monthZhi: preview.monthZhi || undefined,
      shenShaNames: preview.shenSha.split(/[,，、\s]+/).filter(Boolean),
    });
  } catch (e) {
    ElMessage.error(errMsg(e, "试匹配失败"));
  } finally {
    previewing.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.prk-page { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.page-header h3 { margin: 0 0 6px; }
.sub { margin: 0; max-width: 70ch; color: var(--color-text-body, #606266); font-size: 13px; line-height: 1.6; }
.actions { display: flex; gap: 8px; }
.toolbar-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.title-cell { font-weight: 500; }
.muted { color: var(--color-text-secondary, #909399); font-size: 12px; line-height: 1.6; }
.srcrow { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; width: 100%; }
.tag { margin: 0 4px 4px 0; }
.pager { display: flex; justify-content: flex-end; margin-top: 12px; }
.hit { padding: 10px 0; border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5); }
</style>
