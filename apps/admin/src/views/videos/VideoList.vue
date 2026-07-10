<template>
  <div class="page">
    <PageHeader title="短视频管理">
      <template #actions>
        <div style="display:flex;gap:8px">
          <el-select
            v-model="statusFilter"
            placeholder="状态筛选"
            clearable
            style="width:120px"
            @change="fetchList"
          >
            <el-option
              label="全部"
              value=""
            />
            <el-option
              label="待审核"
              value="AUDITING"
            />
            <el-option
              label="已发布"
              value="PUBLISHED"
            />
            <el-option
              label="已驳回"
              value="REJECTED"
            />
            <el-option
              label="已下架"
              value="HIDDEN"
            />
          </el-select>
          <el-button
            type="primary"
            @click="openCreate()"
          >
            添加视频
          </el-button>
        </div>
      </template>
    </PageHeader>

    <!-- 错误态 -->
    <el-result
      v-if="loadError"
      icon="error"
      title="视频列表加载失败"
      sub-title="无法获取数据，请检查网络或稍后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-table
      v-else
      v-loading="loading"
      :data="list"
      border
      stripe
    >
      <template #empty>
        <el-empty description="暂无视频数据" />
      </template>
      <el-table-column
        prop="title"
        label="标题"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        prop="user.nickname"
        label="作者"
        width="100"
      />
      <el-table-column
        prop="duration"
        label="时长"
        width="80"
      />
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="statusType(row.status)"
            size="small"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="likeCount"
        label="点赞"
        width="70"
      />
      <el-table-column
        prop="createdAt"
        label="发布时间"
        width="170"
      >
        <template #default="{ row }">
          {{ row.createdAt?.slice(0,16).replace('T',' ') }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="340"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            v-if="row.status !== 'PUBLISHED'"
            size="small"
            type="success"
            :loading="auditingId === row.id"
            @click="approve(row)"
          >
            通过
          </el-button>
          <el-button
            v-if="row.status !== 'REJECTED'"
            size="small"
            type="warning"
            :loading="auditingId === row.id"
            @click="reject(row)"
          >
            驳回
          </el-button>
          <el-button
            size="small"
            @click="viewDetail(row)"
          >
            详情
          </el-button>
          <el-button
            size="small"
            type="primary"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="del(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="detailVisible"
      title="视频详情"
      width="600px"
    >
      <div
        v-if="detail"
        class="detail"
      >
        <video
          v-if="detail.url"
          :src="detail.url"
          controls
          style="width:100%;max-height:360px;border-radius:8px;margin-bottom:12px"
        />
        <p><b>标题：</b>{{ detail.title }}</p>
        <p><b>作者：</b>{{ detail.user?.nickname }}</p>
        <p><b>时长：</b>{{ detail.duration || '-' }}</p>
        <p v-if="detail.description">
          <b>描述：</b>{{ detail.description }}
        </p>
        <p><b>状态：</b>{{ statusLabel(detail.status) }}</p>
        <p v-if="detail.status === 'REJECTED' && detail.auditReason">
          <b>驳回原因：</b>{{ detail.auditReason }}
        </p>
      </div>
    </el-dialog>

    <!-- 创建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑视频' : '添加视频'"
      width="600px"
    >
      <el-form
        :model="form"
        label-width="80px"
      >
        <el-form-item label="标题">
          <el-input
            v-model="form.title"
            placeholder="视频标题"
          />
        </el-form-item>
        <el-form-item label="视频">
          <VodUpload
            v-model="form.videoUrl"
            @update:duration="form.duration = $event"
            @update:cover="v => { if (v) form.cover = v }"
          />
        </el-form-item>
        <el-form-item label="封面">
          <CosImageUpload
            v-model="form.cover"
            tip="上传视频后自动取第一帧，如需更换可点击"
          />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="时长">
              <el-input
                :model-value="form.duration ? form.duration + ' 秒' : ''"
                disabled
                placeholder="上传视频后自动获取"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="标签">
              <el-input
                v-model="form.tags"
                placeholder="逗号分隔"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
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
          @click="saveVideo"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import PageHeader from "@/components/PageHeader.vue";
import VodUpload from "@/components/upload/VodUpload.vue";
import CosImageUpload from "@/components/upload/CosImageUpload.vue";
import { videoApi, api } from "@/api";

const list = ref<any[]>([]);
const loading = ref(false);
const loadError = ref(false);
const statusFilter = ref("");
const detailVisible = ref(false);
const detail = ref<any>(null);
const auditingId = ref("");

const STATUS_MAP: Record<string, { label: string; type: "success" | "warning" | "danger" | "info" }> = {
  PUBLISHED: { label: "已发布", type: "success" },
  AUDITING: { label: "待审核", type: "warning" },
  REJECTED: { label: "已驳回", type: "danger" },
  HIDDEN: { label: "已下架", type: "info" },
  PROCESSING: { label: "处理中", type: "info" },
};

function statusLabel(s: string) {
  return STATUS_MAP[s]?.label ?? s;
}
function statusType(s: string) {
  return STATUS_MAP[s]?.type ?? "info";
}

// 创建/编辑弹窗
const dialogVisible = ref(false);
const editingId = ref('');
const saving = ref(false);
const form = reactive({
  title: '',
  cover: '',
  videoUrl: '',
  duration: 0, // 秒·由 VodUpload 选视频后自动读取
  description: '',
  tags: '',
});

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    // scope=all：管理端可见全部开放范围（仅圈内/全平台）的视频，公共池过滤只作用于 C 端
    const params: any = { pageSize: 100, scope: "all" };
    if (statusFilter.value) params.status = statusFilter.value;
    const { data } = await videoApi.list(params);
    list.value = data.items || data.videos || [];
  } catch {
    loadError.value = true;
    list.value = [];
  } finally { loading.value = false; }
}

function resetForm() {
  Object.assign(form, { title: '', cover: '', videoUrl: '', duration: 0, description: '', tags: '' });
  editingId.value = '';
}

function openCreate() {
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: any) {
  resetForm();
  editingId.value = row.id;
  Object.assign(form, {
    title: row.title || '',
    cover: row.cover || '',
    videoUrl: row.videoUrl || row.url || '',
    duration: row.duration || 0,
    description: row.description || '',
    tags: Array.isArray(row.tags) ? row.tags.join(',') : (row.tags || ''),
  });
  dialogVisible.value = true;
}

async function saveVideo() {
  saving.value = true;
  try {
    const payload: any = { ...form };
    if (typeof payload.tags === 'string') {
      payload.tags = payload.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
    if (!payload.duration) delete payload.duration; // 未识别到时长则不传（后端可选）
    if (editingId.value) {
      await videoApi.update(editingId.value, payload);
      ElMessage.success('已更新');
    } else {
      await videoApi.create(payload);
      ElMessage.success('已创建');
    }
    dialogVisible.value = false;
    fetchList();
  } catch (e: any) {
  } finally { saving.value = false; }
}

async function viewDetail(row: any) {
  try {
    const { data } = await videoApi.detail(row.id);
    detail.value = data;
    detailVisible.value = true;
  } catch { /* */ }
}

async function approve(row: any) {
  if (auditingId.value) return;
  try {
    await ElMessageBox.confirm(`确定通过视频「${row.title || row.id}」？通过后将公开发布。`, "审核通过", { type: "success" });
  } catch { return; }
  auditingId.value = row.id;
  try {
    await api.put(`/videos/admin/${row.id}/audit`, { action: "approve" });
    ElMessage.success("已通过");
    fetchList();
  } catch {
    ElMessage.error("操作失败，请重试");
  } finally {
    auditingId.value = "";
  }
}

async function reject(row: any) {
  if (auditingId.value) return;
  let reason = "";
  try {
    const { value } = await ElMessageBox.prompt("请输入驳回原因（将告知作者）", "驳回视频", {
      type: "warning",
      inputType: "textarea",
      inputPlaceholder: "如：内容违规 / 画质不达标 / 涉及敏感信息",
      inputValidator: (v: string) => (v && v.trim() ? true : "请填写驳回原因"),
    });
    reason = (value || "").trim();
  } catch { return; }
  auditingId.value = row.id;
  try {
    await api.put(`/videos/admin/${row.id}/audit`, { action: "reject", reason });
    ElMessage.success("已驳回");
    fetchList();
  } catch {
    ElMessage.error("操作失败，请重试");
  } finally {
    auditingId.value = "";
  }
}

function del(id: string) {
  ElMessageBox.confirm("确定删除？", "警告", { type: "warning" }).then(async () => {
    await videoApi.remove(id);
    ElMessage.success("已删除");
    fetchList();
  }).catch(() => {});
}
</script>

<style scoped>
.page { padding: 0; }
.detail p { margin: 6px 0; font-size: 14px; color: var(--color-text-title); }
</style>
