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

    <div class="duty-strip" aria-label="直播运营值班摘要">
      <div><span>待开播</span><strong>{{ dutySummary.waiting }}</strong></div>
      <div><span>直播中</span><strong class="living">{{ dutySummary.living }}</strong></div>
      <div><span>回放草稿待发布</span><strong class="draft">{{ dutySummary.replayDraft }}</strong></div>
      <div><span>已发布回放</span><strong>{{ dutySummary.published }}</strong></div>
      <p>运营顺序：排期与素材 → 推流预检 → 开播值守 → 结束 → 回放草稿复核 → 发布/下架</p>
    </div>

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
        label="排期 / 预约"
        width="185"
      >
        <template #default="{ row }">
          <div>{{ row.startTime ? row.startTime.slice(0,16).replace('T',' ') : '未排期' }}</div>
          <small v-if="row.status === 'WAITING'">{{ row.bookingCount || 0 }} 人预约</small>
        </template>
      </el-table-column>
      <el-table-column label="形态 / 商品" width="135">
        <template #default="{ row }">
          <div>{{ row.orientation === 'landscape' ? 'OBS 横屏' : '客户端竖屏' }}</div>
          <small>{{ row.quality || 'basic' }} · {{ row._count?.products || 0 }} 件商品</small>
        </template>
      </el-table-column>
      <el-table-column label="回放" width="105">
        <template #default="{ row }">
          <el-tag v-if="row.replayStatus === 'DRAFT'" size="small" type="warning">草稿</el-tag>
          <el-tag v-else-if="row.replayStatus === 'PUBLISHED'" size="small" type="success">已发布</el-tag>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="420"
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
            v-if="row.status === 'WAITING'"
            size="small"
            type="success"
            @click="openStreamConsole(row)"
          >
            开播准备
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
            v-if="row.status === 'ENDED' || row.replayStatus === 'DRAFT'"
            size="small"
            type="success"
            @click="openReplay(row)"
          >
            发布回放
          </el-button>
          <el-button
            v-if="row.status === 'REPLAY' && row.replayStatus === 'PUBLISHED'"
            size="small"
            type="warning"
            @click="unpublishReplay(row)"
          >
            下架回放
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
      width="720px"
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
        <el-form-item label="直播介绍">
          <el-input v-model="form.description" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="预约预告必填；说明主题、嘉宾和观众收益" />
        </el-form-item>
        <el-form-item label="预约开播">
          <el-date-picker
            v-model="form.startTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="不排期则不可被用户预约"
            clearable
            style="width:100%"
          />
          <div class="form-hint">填写排期后，封面和介绍必须完整；系统会在开播前约 15 分钟提醒已预约用户。</div>
        </el-form-item>
        <template v-if="!editingId">
          <el-form-item label="主播" required>
            <el-select
              v-model="form.hostUserId"
              filterable
              remote
              reserve-keyword
              :remote-method="searchHosts"
              :loading="hostSearching"
              placeholder="输入昵称或手机号查找主播"
              style="width:100%"
            >
              <el-option v-for="host in hostOptions" :key="host.id" :label="`${host.nickname || '未命名'} · ${host.phone || host.id}`" :value="host.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="所属圈子" required>
            <el-select
              v-model="form.circleId"
              filterable
              placeholder="请选择直播所属圈子"
              style="width:100%"
            >
              <el-option
                v-for="circle in circleOptions"
                :key="circle.id"
                :label="circle.name || circle.id"
                :value="circle.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="可见范围">
            <el-radio-group v-model="form.visibility">
              <el-radio value="CIRCLE_ONLY">仅本圈</el-radio>
              <el-radio value="PLATFORM">全平台可见</el-radio>
            </el-radio-group>
            <div v-if="form.visibility === 'PLATFORM'" class="form-hint">
              只有主动选择时才全平台可见，并受发布资格与内容审核规则约束。
            </div>
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
          <el-form-item label="回放范围">
            <el-radio-group v-model="form.replayVisibility">
              <el-radio value="CIRCLE_ONLY">仅本圈</el-radio>
              <el-radio value="PLATFORM">全平台</el-radio>
            </el-radio-group>
            <el-checkbox v-model="form.replayCharge" style="margin-left:16px">圈外观看收费</el-checkbox>
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="收费类型">
            <el-select v-model="form.chargeType">
              <el-option label="免费" value="FREE" />
              <el-option label="付费" value="PAID" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="form.chargeType === 'PAID'" label="收费价格">
            <el-input-number v-model="form.chargePrice" :min="0.01" :precision="2" />
          </el-form-item>
        </template>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="直播形态">
              <el-radio-group v-model="form.orientation">
                <el-radio value="portrait">客户端竖屏</el-radio>
                <el-radio value="landscape">OBS 横屏</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="画质档位">
              <el-select v-model="form.quality" style="width:100%">
                <el-option label="标清（basic）" value="basic" />
                <el-option label="高清 720p（hd）" value="hd" />
                <el-option label="超清 1080p（uhd）" value="uhd" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="带货商品">
          <el-select v-model="form.productIds" multiple :multiple-limit="5" filterable collapse-tags :max-collapse-tags="3" placeholder="最多 5 件在售商品" style="width:100%">
            <el-option v-for="product in productOptions" :key="product.id" :label="`${product.title || product.id} · 库存 ${product.stock ?? 0}`" :value="product.id" />
          </el-select>
        </el-form-item>
        <el-alert
          v-if="editingId"
          type="info"
          :closable="false"
          show-icon
          title="直播开始后，排期、收费、画质和形态将锁定；标题、介绍、封面仍可按权限修正并重新进入机审。"
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
        <p v-if="detail.cover || detail.coverUrl">
          <b>封面：</b>{{ detail.cover || detail.coverUrl }}
        </p>
        <p v-if="detail.description"><b>介绍：</b>{{ detail.description }}</p>
        <p><b>直播形态：</b>{{ detail.orientation === 'landscape' ? 'OBS 横屏' : '客户端竖屏' }} · {{ detail.quality || 'basic' }}</p>
        <p><b>预约人数：</b>{{ detail.bookingCount || 0 }}</p>
        <p v-if="detail.replayUrl">
          <b>回放：</b>{{ detail.replayUrl }}
        </p>
        <p><b>观众数：</b>{{ detail.viewCount }}</p>
        <p><b>创建时间：</b>{{ detail.createdAt?.slice(0,16).replace('T',' ') }}</p>
        <p v-if="detail.startTime">
          <b>开播/排期：</b>{{ detail.startTime?.slice(0,16).replace('T',' ') }}
        </p>
        <p v-if="detail.endTime">
          <b>结束时间：</b>{{ detail.endTime?.slice(0,16).replace('T',' ') }}
        </p>
      </div>
    </el-dialog>

    <el-dialog v-model="streamVisible" title="开播准备与推流值班" width="720px" @closed="stopStreamPolling">
      <div v-loading="streamLoading" class="stream-console">
        <el-alert
          :type="streamStatus?.status === 'online' ? 'success' : 'warning'"
          :closable="false"
          show-icon
          :title="streamStatus?.status === 'online' ? '已检测到真实媒体流，可以开播' : '尚未检测到推流，请先配置主播端或 OBS'"
        />
        <div class="evidence-grid">
          <div><span>房间</span><strong>{{ streamRoom?.title }}</strong></div>
          <div><span>形态</span><strong>{{ streamRoom?.orientation === 'landscape' ? 'OBS 横屏' : '客户端竖屏' }}</strong></div>
          <div><span>回调状态</span><strong>{{ streamStatus?.status || 'offline' }}</strong></div>
          <div><span>最近事件</span><strong>{{ streamStatus?.lastEventAt ? streamStatus.lastEventAt.slice(0,19).replace('T',' ') : '暂无' }}</strong></div>
        </div>
        <el-input v-if="streamInfo?.pushUrl" :model-value="streamInfo.pushUrl" readonly type="textarea" :rows="3">
          <template #append><el-button @click="copyPushUrl">复制</el-button></template>
        </el-input>
        <p class="secret-tip">推流地址含短期鉴权凭证，仅向本场主播/OBS 操作员提供；重新打开本窗口会重新签发。</p>
      </div>
      <template #footer>
        <el-button @click="refreshStreamStatus">刷新状态</el-button>
        <el-button @click="streamVisible = false">关闭</el-button>
        <el-button
          type="primary"
          :disabled="streamRoom?.orientation === 'landscape' && streamStatus?.status !== 'online'"
          @click="startPreparedRoom"
        >
          {{ streamRoom?.orientation === 'landscape' ? '确认 OBS 开播' : '确认切换为直播中' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="replayVisible" title="回放复核与发布" width="620px">
      <el-alert type="info" :closable="false" show-icon title="录制回调只生成草稿；确认内容、可见范围与地址后，才会对观众发布。" />
      <el-form label-position="top" style="margin-top:16px">
        <el-form-item label="直播场次"><el-input :model-value="replayRoom?.title" disabled /></el-form-item>
        <el-form-item label="HTTPS 回放地址" required>
          <el-input v-model="replayUrl" type="textarea" :rows="3" placeholder="https://.../replay.mp4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="replayVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="publishReplay">确认发布并进入机审</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance } from "element-plus";
import PageHeader from "@/components/PageHeader.vue";
import CosImageUpload from "@/components/upload/CosImageUpload.vue";
import { circleApi, liveApi, productApi, userApi } from "@/api";

/** 直播主播信息 */
interface LiveHost { id?: string; nickname?: string }
/** 直播间行/详情（宽松 optional，按模板访问声明） */
interface LiveRow {
  id: string; title?: string; cover?: string; coverUrl?: string; replayUrl?: string;
  hostUserId?: string; host?: LiveHost; user?: LiveHost; status?: string; viewCount?: number;
  chargeType?: string; chargePrice?: number; createdAt?: string;
  description?: string; startTime?: string; endTime?: string; orientation?: string; quality?: string;
  replayStatus?: string; bookingCount?: number; onlineCount?: number; visibility?: string;
  replayVisibility?: string; replayCharge?: boolean; _count?: { products?: number }; products?: Array<{ productId?: string }>;
}
interface CircleOption { id: string; name?: string }
interface ProductOption { id: string; title?: string; stock?: number }
interface UserOption { id: string; nickname?: string; phone?: string }

const list = ref<LiveRow[]>([]);
const loading = ref(false);
const loadError = ref(false);
const statusFilter = ref("");
const detailVisible = ref(false);
const detail = ref<LiveRow | null>(null);
const circleOptions = ref<CircleOption[]>([]);
const productOptions = ref<ProductOption[]>([]);
const hostOptions = ref<UserOption[]>([]);
const hostSearching = ref(false);

const dutySummary = computed(() => ({
  waiting: list.value.filter((room) => room.status === "WAITING").length,
  living: list.value.filter((room) => room.status === "LIVING").length,
  replayDraft: list.value.filter((room) => room.replayStatus === "DRAFT").length,
  published: list.value.filter((room) => room.status === "REPLAY" && room.replayStatus === "PUBLISHED").length,
}));

// 创建/编辑
const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref("");
const form = reactive({
  title: "",
  cover: "",
  description: "",
  startTime: "",
  hostUserId: "",
  circleId: "",
  visibility: "CIRCLE_ONLY" as "CIRCLE_ONLY" | "PLATFORM",
  chargeType: "FREE",
  chargePrice: 0,
  quality: "basic" as "basic" | "hd" | "uhd",
  orientation: "portrait" as "portrait" | "landscape",
  productIds: [] as string[],
  replayVisibility: "CIRCLE_ONLY" as "CIRCLE_ONLY" | "PLATFORM",
  replayCharge: false,
});
const dialogFormRef = ref<FormInstance>();
const dialogRules = {
  title: [{ required: true, message: "请输入直播标题", trigger: "blur" }],
};

onMounted(() => {
  fetchList();
  fetchCircleOptions();
  fetchProductOptions();
});

onUnmounted(() => stopStreamPolling());

async function fetchCircleOptions() {
  try {
    const { data } = await circleApi.list({ page: 1, pageSize: 200 });
    circleOptions.value = data.circles || data.items || [];
  } catch {
    circleOptions.value = [];
  }
}

async function fetchProductOptions() {
  try {
    const { data } = await productApi.list({ page: 1, pageSize: 100, status: "ON_SALE" });
    productOptions.value = data.items || data.products || [];
  } catch { productOptions.value = []; }
}

let hostSearchTimer: ReturnType<typeof setTimeout> | null = null;
function searchHosts(keyword: string) {
  if (hostSearchTimer) clearTimeout(hostSearchTimer);
  hostSearchTimer = setTimeout(async () => {
    hostSearching.value = true;
    try {
      const { data } = await userApi.list({ keyword: keyword.trim() || undefined, page: 1, pageSize: 30 });
      hostOptions.value = data.users || data.items || [];
    } catch { hostOptions.value = []; }
    finally { hostSearching.value = false; }
  }, 250);
}

function statusLabel(s?: string) {
  // 后端 LiveStatus 枚举为 WAITING/LIVING/ENDED/REPLAY（schema.prisma），此前误写 PENDING 致"WAITING"生肉直出
  const m: Record<string, string> = { WAITING: "待开播", LIVING: "直播中", ENDED: "已结束", REPLAY: "回放", CANCELLED: "已取消" };
  return m[s ?? ""] || s || "—";
}

/** LIVING 且开播超过 24h：大概率是推流断了没走正常结束流程的僵尸房间 */
function isZombieLiving(row: LiveRow) {
  if (row.status !== "LIVING") return false;
  const started = row.startTime || row.createdAt;
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

async function openEdit(row?: LiveRow) {
  if (row) {
    editingId.value = row.id;
    let source = row;
    try { source = (await liveApi.detail(row.id)).data || row; } catch { /* 使用列表已有字段 */ }
    form.title = source.title || "";
    form.cover = source.cover || "";
    form.description = source.description || "";
    form.startTime = source.startTime ? toLocalDateTime(source.startTime) : "";
    form.hostUserId = source.hostUserId || (source.host?.id || "");
    form.chargeType = source.chargeType || "FREE";
    form.chargePrice = source.chargePrice ?? 0;
    form.quality = (source.quality as "basic" | "hd" | "uhd") || "basic";
    form.orientation = (source.orientation as "portrait" | "landscape") || "portrait";
    form.productIds = source.products?.map((item) => item.productId || "").filter(Boolean) as string[] || [];
    form.replayVisibility = (source.replayVisibility as "CIRCLE_ONLY" | "PLATFORM") || "CIRCLE_ONLY";
    form.replayCharge = source.replayCharge || false;
  } else {
    editingId.value = "";
    form.title = "";
    form.cover = "";
    form.description = "";
    form.startTime = "";
    form.hostUserId = "";
    form.circleId = "";
    form.visibility = "CIRCLE_ONLY";
    form.chargeType = "FREE";
    form.chargePrice = 0;
    form.quality = "basic";
    form.orientation = "portrait";
    form.productIds = [];
    form.replayVisibility = "CIRCLE_ONLY";
    form.replayCharge = false;
  }
  dialogVisible.value = true;
}

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function saveRoom() {
  if (!form.title || !form.title.trim()) { ElMessage.warning("请输入直播标题"); return; }
  if (!editingId.value && !form.circleId) { ElMessage.warning("请选择直播所属圈子"); return; }
  if (!editingId.value && !form.hostUserId) { ElMessage.warning("请选择主播，避免直播归属到当前管理员账号"); return; }
  if (form.startTime && (!form.cover || !form.description.trim())) {
    ElMessage.warning("发布预约预告必须同时填写封面和直播介绍"); return;
  }
  const startTime = toIso(form.startTime);
  if (form.startTime && !startTime) { ElMessage.warning("开播时间格式错误"); return; }
  saving.value = true;
  try {
    if (editingId.value) {
      await liveApi.update(editingId.value, {
        title: form.title, cover: form.cover, description: form.description,
        startTime, chargeType: form.chargeType,
        chargePrice: form.chargeType === "PAID" ? form.chargePrice : null,
        quality: form.quality, orientation: form.orientation, productIds: form.productIds,
      });
      ElMessage.success("已更新");
    } else {
      const payload: Record<string, unknown> = {
        title: form.title,
        circleId: form.circleId,
        visibility: form.visibility,
      };
      if (form.cover) payload.cover = form.cover;
      if (form.description.trim()) payload.description = form.description.trim();
      if (startTime) payload.startTime = startTime;
      if (form.hostUserId) payload.hostUserId = form.hostUserId;
      if (form.chargeType) payload.chargeType = form.chargeType;
      if (form.chargeType === "PAID" && form.chargePrice > 0) payload.chargePrice = form.chargePrice;
      payload.quality = form.quality;
      payload.orientation = form.orientation;
      payload.productIds = form.productIds;
      payload.replayVisibility = form.replayVisibility;
      payload.replayCharge = form.replayCharge;
      await liveApi.create(payload);
      ElMessage.success("已添加");
    }
    dialogVisible.value = false;
    fetchList();
  } catch (e: any) {
    if (e?.response?.status === 403) {
      ElMessage.error("当前账号没有管理该直播间的权限");
    } else {
      ElMessage.error("保存失败，请重试");
    }
  } finally {
    saving.value = false;
  }
}

// ── 推流值班台：凭证短期签发，状态以腾讯回调为准 ──
const streamVisible = ref(false);
const streamRoom = ref<LiveRow | null>(null);
const streamInfo = ref<Record<string, any> | null>(null);
const streamStatus = ref<Record<string, any> | null>(null);
const streamLoading = ref(false);
let streamPollTimer: ReturnType<typeof setInterval> | null = null;
function stopStreamPolling() { if (streamPollTimer) clearInterval(streamPollTimer); streamPollTimer = null; }
async function openStreamConsole(row: LiveRow) {
  stopStreamPolling(); streamRoom.value = row; streamVisible.value = true; streamLoading.value = true;
  try {
    const [urls, status] = await Promise.all([liveApi.streamUrls(row.id), liveApi.streamStatus(row.id)]);
    streamInfo.value = urls.data || null; streamStatus.value = status.data || null;
    streamPollTimer = setInterval(() => refreshStreamStatus(), 5000);
  } catch { ElMessage.error("推流准备信息加载失败，请检查直播配置"); }
  finally { streamLoading.value = false; }
}
async function refreshStreamStatus() {
  if (!streamRoom.value) return;
  try { streamStatus.value = (await liveApi.streamStatus(streamRoom.value.id)).data || null; } catch { /* 保留上次状态 */ }
}
async function copyPushUrl() {
  const value = String(streamInfo.value?.pushUrl || "");
  if (!value) return;
  await navigator.clipboard.writeText(value);
  ElMessage.success("推流地址已复制；该地址含短期凭证，请勿外传");
}
async function startPreparedRoom() {
  if (!streamRoom.value) return;
  try {
    if (streamRoom.value.orientation === "landscape") await liveApi.startObsRoom(streamRoom.value.id);
    else {
      await ElMessageBox.confirm("竖屏直播通常由主播客户端发起。确认由后台将房间切换为直播中？", "确认开播", { type: "warning" });
      await liveApi.startRoom(streamRoom.value.id);
    }
    ElMessage.success("已开播"); streamVisible.value = false; stopStreamPolling(); fetchList();
  } catch (e: any) {
    if (e !== "cancel" && e !== "close") ElMessage.error(e?.response?.data?.message || "开播失败，请确认真实推流状态");
  }
}

// ── 回放发布台：录制回调只进草稿，运营明确发布后才对外可见 ──
const replayVisible = ref(false);
const replayRoom = ref<LiveRow | null>(null);
const replayUrl = ref("");
function openReplay(row: LiveRow) { replayRoom.value = row; replayUrl.value = row.replayUrl || ""; replayVisible.value = true; }
async function publishReplay() {
  if (!replayRoom.value || !/^https:\/\//i.test(replayUrl.value.trim())) { ElMessage.warning("请填写 HTTPS 回放地址"); return; }
  saving.value = true;
  try { await liveApi.publishReplay(replayRoom.value.id, replayUrl.value.trim()); ElMessage.success("回放已发布并进入内容机审"); replayVisible.value = false; fetchList(); }
  finally { saving.value = false; }
}
async function unpublishReplay(row: LiveRow) {
  try {
    await ElMessageBox.confirm("下架后观众端立即不可见，但录像地址会保留为草稿，确认下架？", "下架回放", { type: "warning" });
    await liveApi.unpublishReplay(row.id); ElMessage.success("回放已下架并保留草稿"); fetchList();
  } catch { /* 取消或请求拦截器提示 */ }
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
.duty-strip { display: grid; grid-template-columns: repeat(4, minmax(110px, 1fr)); gap: 1px; margin: 0 0 16px; padding: 1px; color: #f7f2e6; background: #b79a62; border-radius: 10px; overflow: hidden; box-shadow: 0 8px 24px rgba(22, 55, 43, .1); }
.duty-strip > div { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 15px 18px; background: #173c30; }
.duty-strip span { font-size: 12px; color: rgba(247, 242, 230, .72); }
.duty-strip strong { font: 600 24px/1 Georgia, "Times New Roman", serif; color: #f7f2e6; }
.duty-strip strong.living { color: #ff8a80; }
.duty-strip strong.draft { color: #f0c36a; }
.duty-strip p { grid-column: 1 / -1; margin: 0; padding: 9px 16px; color: #5d513b; background: #f7f2e6; font-size: 12px; }
.stream-console { min-height: 220px; }
.evidence-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; margin: 16px 0; padding: 1px; background: #e2ddd0; }
.evidence-grid > div { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; background: #fbfaf6; }
.evidence-grid span { color: #8a8171; font-size: 11px; letter-spacing: .08em; }
.evidence-grid strong { color: #173c30; font-size: 14px; }
.secret-tip { margin: 8px 0 0; color: #9a6b25; font-size: 12px; }
.detail p { margin: 6px 0; font-size: 14px; color: var(--color-text-title); }
.form-hint { width: 100%; margin-top: 6px; color: var(--el-color-warning); font-size: 12px; line-height: 1.5; }
@media (max-width: 900px) { .duty-strip { grid-template-columns: 1fr 1fr; } .evidence-grid { grid-template-columns: 1fr; } }
</style>
