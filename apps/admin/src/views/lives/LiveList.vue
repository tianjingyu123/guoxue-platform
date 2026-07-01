<template>
  <div class="page">
    <PageHeader title="直播管理">
      <template #actions>
        <div>
          <el-select
            v-model="statusFilter"
            placeholder="状态筛选"
            clearable
            style="width:120px;margin-right:12px"
            @change="fetchList"
          >
            <el-option
              label="全部"
              value=""
            />
            <el-option
              label="待开播"
              value="WAITING"
            />
            <el-option
              label="直播中"
              value="LIVING"
            />
            <el-option
              label="已结束"
              value="ENDED"
            />
            <el-option
              label="回放"
              value="REPLAY"
            />
          </el-select>
          <el-button
            type="primary"
            @click="openEdit()"
          >
            添加直播
          </el-button>
        </div>
      </template>
    </PageHeader>

    <!-- 错误态 -->
    <el-result
      v-if="loadError"
      icon="error"
      title="直播列表加载失败"
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
        <el-empty description="暂无直播数据" />
      </template>
      <el-table-column
        prop="title"
        label="直播间"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        prop="host.nickname"
        label="主播"
        width="100"
      />
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'LIVING' ? 'danger' : row.status === 'ENDED' ? 'info' : row.status === 'REPLAY' ? 'success' : 'warning'"
            size="small"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="viewCount"
        label="观看"
        width="80"
      />
      <el-table-column
        prop="createdAt"
        label="创建时间"
        width="170"
      >
        <template #default="{ row }">
          {{ row.createdAt?.slice(0,16).replace('T',' ') }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="250"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            v-if="row.status === 'LIVING'"
            size="small"
            type="danger"
            @click="endRoom(row)"
          >
            结束
          </el-button>
          <el-button
            size="small"
            @click="viewDetail(row)"
          >
            详情
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

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑直播' : '添加直播'"
      width="500px"
    >
      <el-form
        ref="dialogFormRef"
        :model="form"
        :rules="dialogRules"
        label-width="100px"
      >
        <el-form-item label="标题">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="封面URL">
          <el-input
            v-model="form.cover"
            placeholder="封面图片地址"
          />
        </el-form-item>
        <el-form-item label="主播用户ID">
          <el-input
            v-model="form.hostUserId"
            placeholder="用户ID"
          />
        </el-form-item>
        <el-form-item label="收费类型">
          <el-select v-model="form.chargeType">
            <el-option
              label="免费"
              value="FREE"
            />
            <el-option
              label="付费"
              value="PAID"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="form.chargeType === 'PAID'"
          label="收费价格"
        >
          <el-input-number
            v-model="form.chargePrice"
            :min="0"
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
          @click="saveRoom"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 直播详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="直播详情"
      width="600px"
    >
      <div
        v-if="detail"
        class="detail"
      >
        <p><b>标题：</b>{{ detail.title }}</p>
        <p><b>主播：</b>{{ detail.host?.nickname }}</p>
        <p><b>状态：</b>{{ statusLabel(detail.status) }}</p>
        <p v-if="detail.coverUrl">
          <b>封面：</b>{{ detail.coverUrl }}
        </p>
        <p v-if="detail.replayUrl">
          <b>回放：</b>{{ detail.replayUrl }}
        </p>
        <p><b>观众数：</b>{{ detail.viewCount }}</p>
        <p><b>创建时间：</b>{{ detail.createdAt?.slice(0,16).replace('T',' ') }}</p>
        <p v-if="detail.startedAt">
          <b>开播时间：</b>{{ detail.startedAt?.slice(0,16).replace('T',' ') }}
        </p>
        <p v-if="detail.endedAt">
          <b>结束时间：</b>{{ detail.endedAt?.slice(0,16).replace('T',' ') }}
        </p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance } from "element-plus";
import PageHeader from "@/components/PageHeader.vue";
import { liveApi } from "@/api";

/** 直播主播信息 */
interface LiveHost { id?: string; nickname?: string }
/** 直播间行/详情（宽松 optional，按模板访问声明） */
interface LiveRow {
  id: string; title?: string; cover?: string; coverUrl?: string; replayUrl?: string;
  hostUserId?: string; host?: LiveHost; status?: string; viewCount?: number;
  chargeType?: string; chargePrice?: number; createdAt?: string;
  startedAt?: string; endedAt?: string;
}

const list = ref<LiveRow[]>([]);
const loading = ref(false);
const loadError = ref(false);
const statusFilter = ref("");
const detailVisible = ref(false);
const detail = ref<LiveRow | null>(null);

// 创建/编辑
const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref("");
const form = reactive({ title: "", cover: "", hostUserId: "", chargeType: "FREE", chargePrice: 0 });
const dialogFormRef = ref<FormInstance>();
const dialogRules = {
  title: [{ required: true, message: "请输入直播标题", trigger: "blur" }],
};

onMounted(() => fetchList());

function statusLabel(s?: string) {
  const m: Record<string, string> = { PENDING: "待开播", LIVING: "直播中", ENDED: "已结束", REPLAY: "回放" };
  return m[s ?? ""] || s;
}

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    const params: Record<string, string | number> = { pageSize: 100 };
    if (statusFilter.value) params.status = statusFilter.value;
    const { data } = await liveApi.rooms(params);
    list.value = data.items || data.rooms || [];
  } catch {
    loadError.value = true;
    list.value = [];
  } finally { loading.value = false; }
}

function openEdit(row?: LiveRow) {
  if (row) {
    editingId.value = row.id;
    form.title = row.title || "";
    form.cover = row.cover || "";
    form.hostUserId = row.hostUserId || (row.host?.id || "");
    form.chargeType = row.chargeType || "FREE";
    form.chargePrice = row.chargePrice ?? 0;
  } else {
    editingId.value = "";
    form.title = "";
    form.cover = "";
    form.hostUserId = "";
    form.chargeType = "FREE";
    form.chargePrice = 0;
  }
  dialogVisible.value = true;
}

async function saveRoom() {
  saving.value = true;
  try {
    const payload: Record<string, string | number> = { title: form.title };
    if (form.cover) payload.cover = form.cover;
    if (form.hostUserId) payload.hostUserId = form.hostUserId;
    if (form.chargeType) payload.chargeType = form.chargeType;
    if (form.chargeType === "PAID" && form.chargePrice > 0) payload.chargePrice = form.chargePrice;

    if (editingId.value) {
      // 编辑时只传允许的更新字段
      await liveApi.update(editingId.value, { title: form.title, cover: form.cover });
      ElMessage.success("已更新");
    } else {
      await liveApi.create(payload);
      ElMessage.success("已添加");
    }
    dialogVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function viewDetail(row: LiveRow) {
  try {
    const { data } = await liveApi.detail(row.id);
    detail.value = data;
    detailVisible.value = true;
  } catch { /* */ }
}

function endRoom(row: LiveRow) {
  ElMessageBox.confirm("确定结束该直播？", "警告", { type: "warning" }).then(async () => {
    await liveApi.endRoom(row.id);
    ElMessage.success("直播已结束");
    fetchList();
  }).catch(() => {});
}

function del(id: string) {
  ElMessageBox.confirm("确定删除该直播？", "警告", { type: "warning" }).then(async () => {
    await liveApi.remove(id);
    ElMessage.success("已删除");
    fetchList();
  }).catch(() => {});
}
</script>

<style scoped>
.page { padding: 0; }
.detail p { margin: 6px 0; font-size: 14px; color: var(--color-text-title); }
</style>
