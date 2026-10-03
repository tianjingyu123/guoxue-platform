<template>
  <div class="page">
    <div class="header">
      <h2>圈子后台管理</h2>
    </div>

    <!-- 诚实告知：收益链路真实状态（审计实锤 circleGuestEarning 全库无写入方，数据恒 0） -->
    <el-alert
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
      title="收益数据依赖结算引擎（在建）"
      description="交易额/嘉宾分成/圈主收益暂无写入来源，显示为 0 属已知状态、非页面故障；结算引擎上线后自动生效。"
    />

    <!-- 圈子列表 -->
    <el-card
      class="section-card"
      shadow="never"
    >
      <template #header>
        <span style="font-weight:600">圈子列表</span>
        <span class="header-tip">点击一行选中圈子，查看其概览 / 嘉宾分账 / 收益</span>
      </template>
      <el-result
        v-if="loadError && !loading"
        icon="error"
        title="加载失败"
        sub-title="圈子列表加载失败，请检查网络后重试"
      >
        <template #extra>
          <el-button
            type="primary"
            @click="fetchCircles"
          >
            重试
          </el-button>
        </template>
      </el-result>
      <el-table
        v-show="!loadError"
        v-loading="loading"
        :data="circleList"
        border
        stripe
        highlight-current-row
        @current-change="selectCircle"
      >
        <template #empty>
          <el-empty
            description="暂无圈子"
            :image-size="80"
          />
        </template>
        <el-table-column
          label="名称"
          min-width="160"
          prop="name"
        />
        <el-table-column
          label="类型"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.type === 'FREE' ? 'success' : 'warning'"
            >
              {{ typeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="成员数"
          width="80"
          align="center"
        >
          <template #default="{ row }">
            {{ row._count?.members || 0 }}
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="90"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.status === 'ACTIVE' ? 'success' : row.status === 'DISABLED' ? 'danger' : 'warning'"
            >
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="创建时间"
          width="170"
        >
          <template #default="{ row }">
            {{ row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN', { hour12: false }) : '-' }}
          </template>
        </el-table-column>
      </el-table>
      <div
        v-if="circleTotal > pageSize"
        class="pagination"
      >
        <el-pagination
          v-model:current-page="page"
          layout="prev, pager, next"
          :total="circleTotal"
          :page-size="pageSize"
          @current-change="fetchCircles"
        />
      </div>
    </el-card>

    <!-- 未选圈时的引导（下方区块依赖选中圈，未选中一律不展示/不请求） -->
    <el-empty
      v-if="!selectedCircle"
      description="先在上方列表点击选择一个圈子，再管理它的嘉宾分账与收益"
      :image-size="100"
    />

    <!-- 选中圈子的概览 -->
    <template v-if="selectedCircle">
      <el-row
        :gutter="16"
        class="overview-row"
      >
        <el-col :span="6">
          <el-card shadow="never">
            <div class="stat-label">
              圈子名称
            </div><div
              class="stat-value"
              style="font-size:16px"
            >
              {{ selectedCircle.name }}
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never">
            <div class="stat-label">
              成员总数
            </div><div class="stat-value">
              {{ overview.memberCount || 0 }}
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never">
            <div class="stat-label">
              活跃成员
            </div><div
              class="stat-value"
              style="color:#67c23a"
            >
              {{ overview.activeMembers || 0 }}
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never">
            <div class="stat-label">
              本月新增
            </div><div
              class="stat-value"
              style="color:#409eff"
            >
              {{ overview.monthNewMembers || 0 }}
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 新契约未部署时的降级提示：绝不展示错对象数据 -->
      <el-alert
        v-if="!circleIdSupported"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom:12px"
        title="嘉宾分账与收益暂不可用：待后端部署新端点（circle-backend 支持 circleId 参数）"
        description="旧端点只能返回当前登录账号自己圈子的数据（错对象），为避免误导已停用展示；后端部署后自动恢复。"
      />

      <!-- 嘉宾管理 -->
      <el-card
        class="section-card"
        shadow="never"
      >
        <template #header>
          <span style="font-weight:600">嘉宾分账管理</span>
        </template>
        <el-result
          v-if="guestError"
          icon="error"
          title="加载失败"
          sub-title="嘉宾列表加载失败，请重试"
        >
          <template #extra>
            <el-button
              type="primary"
              @click="fetchGuests"
            >
              重试
            </el-button>
          </template>
        </el-result>
        <el-table
          v-show="!guestError"
          v-loading="guestLoading"
          :data="guestList"
          border
          stripe
        >
          <template #empty>
            <el-empty
              :description="circleIdSupported ? '该圈暂无嘉宾（角色为「嘉宾」的成员会出现在这里）' : '待后端部署新端点后展示'"
              :image-size="80"
            />
          </template>
          <el-table-column
            label="嘉宾"
            min-width="150"
          >
            <template #default="{ row }">
              <div style="display:flex;align-items:center;gap:8px">
                <el-avatar
                  v-if="row.user?.avatar"
                  :src="row.user.avatar"
                  size="small"
                />
                <span>{{ row.user?.nickname || row.userId }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            label="分账比例(%)"
            width="140"
            align="center"
          >
            <template #default="{ row }">
              <el-tooltip
                :disabled="circleIdSupported"
                content="待后端部署新端点"
                placement="top"
              >
                <el-input-number
                  v-model="row.shareRate"
                  :min="0"
                  :max="100"
                  size="small"
                  style="width:100px"
                  :disabled="!circleIdSupported"
                  @change="(v: number) => updateShareRate(row.userId, v)"
                />
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column
            label="累计收益"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              ¥{{ Number(row.totalEarned || 0).toFixed(2) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 收益 -->
      <el-card
        class="section-card"
        shadow="never"
      >
        <template #header>
          <span style="font-weight:600">收益概览</span>
          <el-date-picker
            v-model="revenuePeriod"
            type="month"
            value-format="YYYY-MM"
            placeholder="选择月份"
            style="width:140px;margin-left:12px"
            size="small"
            :clearable="true"
            @change="fetchRevenue"
          />
        </template>
        <el-result
          v-if="revenueError"
          icon="error"
          title="加载失败"
          sub-title="收益数据加载失败，请重试"
        >
          <template #extra>
            <el-button
              type="primary"
              @click="fetchRevenue"
            >
              重试
            </el-button>
          </template>
        </el-result>
        <el-row
          v-show="!revenueError"
          :gutter="16"
        >
          <el-col :span="8">
            <div class="rev-item">
              <span class="rev-label">交易额</span><span class="rev-num">¥{{ Number(revenue.totalAmount || 0).toFixed(2) }}</span>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="rev-item">
              <span class="rev-label">嘉宾分成</span><span
                class="rev-num"
                style="color:#e6a23c"
              >¥{{ Number(revenue.totalGuestPayouts || 0).toFixed(2) }}</span>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="rev-item">
              <span class="rev-label">圈主收益</span><span
                class="rev-num"
                style="color:#67c23a"
              >¥{{ Number(revenue.ownerRevenue || 0).toFixed(2) }}</span>
            </div>
          </el-col>
        </el-row>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { api, circleBackendApi } from "@/api";

/** 圈子行（后端圈子列表项，字段宽松 optional） */
interface CircleRow {
  id: string;
  name?: string;
  type?: string;
  status?: string;
  createdAt?: string;
  _count?: { members?: number };
}
/** 圈子概览统计 */
interface OverviewData {
  memberCount?: number;
  activeMembers?: number;
  monthNewMembers?: number;
}
/** 嘉宾分账行 */
interface GuestRow {
  userId: string;
  user?: { nickname?: string; avatar?: string };
  shareRate?: number;
  totalEarned?: number;
}
/** 收益概览 */
interface RevenueData {
  circleId?: string;
  totalAmount?: number;
  totalGuestPayouts?: number;
  ownerRevenue?: number;
}

const loading = ref(false);
const loadError = ref(false);
const savingRate = ref(false);
const circleList = ref<CircleRow[]>([]);
const page = ref(1);
const pageSize = 20;
const circleTotal = ref(0);

const selectedCircle = ref<CircleRow | null>(null);
const overview = ref<OverviewData>({});
const guestLoading = ref(false);
const guestError = ref(false);
const guestList = ref<GuestRow[]>([]);
const revenue = ref<RevenueData>({});
const revenueError = ref(false);
const revenuePeriod = ref("");
// 新契约（guests/revenue/share-rate 支持 ?circleId=）是否已部署；
// 未部署时旧端点会返回「当前登录账号自己圈子」的数据（错对象·审计 P0），故一律降级不展示
const circleIdSupported = ref(true);

function typeLabel(t?: string) {
  return ({ FREE: "免费", PAID: "付费", YEARLY: "年费" } as Record<string, string>)[t || ""] || t || "-";
}
function statusLabel(s?: string) {
  return ({ ACTIVE: "正常", DISABLED: "已封禁", PENDING: "待审核" } as Record<string, string>)[s || ""] || s || "-";
}

onMounted(() => fetchCircles());

async function fetchCircles() {
  loading.value = true;
  loadError.value = false;
  try {
    const { data } = await circleBackendApi.adminCircles({ page: page.value, pageSize });
    circleList.value = data.items || data.circles || [];
    circleTotal.value = data.total || 0;
  } catch {
    loadError.value = true;
    ElMessage.error("加载圈子列表失败");
  } finally { loading.value = false; }
}

async function selectCircle(row: CircleRow | null) {
  if (!row) { selectedCircle.value = null; return; }
  selectedCircle.value = row;
  overview.value = {};
  guestList.value = [];
  revenue.value = {};
  guestError.value = false;
  revenueError.value = false;
  try {
    const { data } = await circleBackendApi.adminOverview(row.id);
    overview.value = data;
  } catch { ElMessage.error("加载圈子概览失败"); }
  // 先用 revenue 的 circleId 回显探测新契约是否已部署，再决定是否展示嘉宾数据（防错对象）
  await fetchRevenue();
  await fetchGuests();
}

async function fetchGuests() {
  const circle = selectedCircle.value;
  if (!circle) return;
  if (!circleIdSupported.value) { guestList.value = []; return; }
  guestLoading.value = true;
  guestError.value = false;
  try {
    // 新契约：GET /circle-backend/guests?circleId=（circleBackendApi.guests 未带参，页面内直连）
    const res = await api.get("/circle-backend/guests", { params: { circleId: circle.id } });
    guestList.value = res.data || [];
  } catch (e: unknown) {
    const st = (e as { response?: { status?: number } })?.response?.status;
    if (st === 404 || st === 403) {
      // 404=新端点未部署；403=旧端点按登录人鉴权（管理员非圈主）→ 同样视为契约未就绪
      circleIdSupported.value = false;
      guestList.value = [];
    } else {
      guestError.value = true;
      ElMessage.error("加载嘉宾列表失败，请重试");
    }
  } finally { guestLoading.value = false; }
}

async function fetchRevenue() {
  const circle = selectedCircle.value;
  if (!circle) return;
  revenueError.value = false;
  try {
    // 新契约：GET /circle-backend/revenue?circleId=
    const res = await api.get("/circle-backend/revenue", {
      params: { circleId: circle.id, period: revenuePeriod.value || undefined },
    });
    const data: RevenueData = res.data || {};
    // 回显校验：旧端点无视 circleId、返回登录人自己圈子的数据（错对象），circleId 不匹配即判定契约未部署
    if (data.circleId && data.circleId !== circle.id) {
      circleIdSupported.value = false;
      revenue.value = {};
      return;
    }
    circleIdSupported.value = true;
    revenue.value = data;
  } catch (e: unknown) {
    const st = (e as { response?: { status?: number } })?.response?.status;
    if (st === 404 || st === 403) {
      circleIdSupported.value = false;
      revenue.value = {};
    } else {
      revenueError.value = true;
      ElMessage.error("加载收益数据失败，请重试");
    }
  }
}

async function updateShareRate(userId: string, shareRate: number) {
  const circle = selectedCircle.value;
  if (!circle) return;
  if (!circleIdSupported.value) {
    ElMessage.warning("待后端部署新端点，分账比例暂不可修改");
    return;
  }
  if (savingRate.value) return;
  savingRate.value = true;
  try {
    // 新契约：PUT /circle-backend/guests/:userId/share-rate {shareRate, circleId}
    await api.put(`/circle-backend/guests/${userId}/share-rate`, { shareRate, circleId: circle.id });
    ElMessage.success("分账比例已更新");
  } catch (e: unknown) {
    const st = (e as { response?: { status?: number } })?.response?.status;
    if (st === 404 || st === 403) {
      circleIdSupported.value = false;
      ElMessage.warning("待后端部署新端点（share-rate 带 circleId），本次未生效");
    } else {
      ElMessage.error("更新失败，请重试");
    }
    fetchGuests(); // 回读还原输入框，避免界面显示未生效的值
  } finally { savingRate.value = false; }
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.header-tip { margin-left: 12px; font-size: 12px; color: var(--color-text-secondary); font-weight: 400; }
.section-card { margin-bottom: 16px; }
.overview-row { margin-bottom: 16px; }
.stat-label { font-size: 13px; color: var(--color-text-secondary); }
.stat-value { font-size: 22px; font-weight: 600; color: var(--color-text-title); margin-top: 4px; }
.rev-item { display: flex; flex-direction: column; gap: 4px; padding: 8px 0; }
.rev-label { font-size: 13px; color: var(--color-text-secondary); }
.rev-num { font-size: 20px; font-weight: 600; }
.pagination { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>
