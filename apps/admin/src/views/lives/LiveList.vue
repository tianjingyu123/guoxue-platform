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
        label="主播"
        width="100"
      >
        <template #default="{ row }">
          <!-- 列表返回体主播字段为 user（live.service.listRooms include user），host 仅部分详情场景存在 -->
          {{ row.user?.nickname || row.host?.nickname || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="150"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'LIVING' ? 'danger' : row.status === 'ENDED' ? 'info' : row.status === 'REPLAY' ? 'success' : 'warning'"
            size="small"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
          <!-- 僵尸房间警示：LIVING 但开播超过 24h 大概率是未正常结束的挂机房 -->
          <el-tooltip
            v-if="isZombieLiving(row)"
            content="该直播间已连续处于「直播中」超过 24 小时，疑似推流中断后未正常结束，可点「结束」手动收尾"
          >
            <el-tag
              type="warning"
              size="small"
              effect="plain"
              style="margin-left:4px"
            >
              疑似未正常结束
            </el-tag>
          </el-tooltip>
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
        <el-form-item
          label="标题"
          prop="title"
        >
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="封面图片">
          <CosImageUpload v-model="form.cover" />
        </el-form-item>
        <!-- 编辑态只保留后端真收字段（UpdateRoomDto 仅 title/cover）；
             主播/收费仅创建时可设（CreateRoomDto），编辑传了也不会生效，不摆假表单 -->
        <template v-if="!editingId">
          <el-form-item label="主播用户ID">
            <el-input
              v-model="form.hostUserId"
              placeholder="不填则默认为当前账号"
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
        </template>
        <el-alert
          v-else
          type="info"
          :closable="false"
          show-icon
          title="编辑仅支持修改标题与封面；主播与收费设置在创建时确定，不可在此修改"
        />
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
        <p><b>主播：</b>{{ detail.user?.nickname || detail.host?.nickname || '—' }}</p>
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
import CosImageUpload from "@/components/upload/CosImageUpload.vue";
import { liveApi } from "@/api";

/** 直播主播信息 */
interface LiveHost { id?: string; nickname?: string }
/** 直播间行/详情（宽松 optional，按模板访问声明） */
interface LiveRow {
  id: string; title?: string; cover?: string; coverUrl?: string; replayUrl?: string;
  hostUserId?: string; host?: LiveHost; user?: LiveHost; status?: string; viewCount?: number;
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
  // 后端 LiveStatus 枚举为 WAITING/LIVING/ENDED/REPLAY（schema.prisma），此前误写 PENDING 致"WAITING"生肉直出
  const m: Record<string, string> = { WAITING: "待开播", LIVING: "直播中", ENDED: "已结束", REPLAY: "回放", CANCELLED: "已取消" };
  return m[s ?? ""] || s || "—";
}

/** LIVING 且开播超过 24h：大概率是推流断了没走正常结束流程的僵尸房间 */
function isZombieLiving(row: LiveRow) {
  if (row.status !== "LIVING") return false;
  const started = row.startedAt || row.createdAt;
  if (!started) return false;
  return Date.now() - new Date(started).getTime() > 24 * 60 * 60 * 1000;
}

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    // scope=all：管理端可见全部开放范围（仅圈内/全平台）的直播间，公共池过滤只作用于 C 端
    const params: Record<string, string | number> = { pageSize: 100, scope: "all" };
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
  if (!form.title || !form.title.trim()) { ElMessage.warning("请输入直播标题"); return; }
  saving.value = true;
  try {
    if (editingId.value) {
      // 编辑只传后端真收的字段（UpdateRoomDto 仅 title/cover）
      await liveApi.update(editingId.value, { title: form.title, cover: form.cover });
      ElMessage.success("已更新");
    } else {
      const payload: Record<string, string | number> = { title: form.title };
      if (form.cover) payload.cover = form.cover;
      if (form.hostUserId) payload.hostUserId = form.hostUserId;
      if (form.chargeType) payload.chargeType = form.chargeType;
      if (form.chargeType === "PAID" && form.chargePrice > 0) payload.chargePrice = form.chargePrice;
      await liveApi.create(payload);
      ElMessage.success("已添加");
    }
    dialogVisible.value = false;
    fetchList();
  } catch (e: any) {
    // 管理员编辑他人直播间可能 403（后端管理员豁免灰度中），给人话提示而非裸报错
    if (e?.response?.status === 403) {
      ElMessage.error("暂无权限编辑该直播间：目前仅主播本人可改，管理员编辑权限正在开通中");
    } else {
      ElMessage.error("保存失败，请重试");
    }
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
