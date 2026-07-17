<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { useRouter } from "vue-router";
import { api as rawApi } from "@/api";

const router = useRouter();

// 设备指纹行（依据表格列/详情实际访问字段声明）
interface DeviceFp {
  userId?: string;
  deviceId?: string;
  platform?: string;
  browser?: string;
  userAgent?: string;
  ip?: string;
  createdAt?: string;
  firstSeenAt?: string;
  updatedAt?: string;
  lastSeenAt?: string;
}

// 用户设备详情聚合
interface UserDevices {
  userId?: string;
  devices?: DeviceFp[];
  totalDevices?: number;
  suspiciousCount?: number;
}

// 🔴 后端 listDeviceFingerprints（risk-control.service.ts:451）为全量 findMany，
// DeviceFingerprintQueryDto 仅支持 userId/deviceId 过滤、不支持 page/pageSize；
// 前端限制展示前 MAX_DISPLAY 条防全表灌入页面，全量分页已记后端待办清单。
const MAX_DISPLAY = 200;

const list = ref<DeviceFp[]>([]);
const rawTotal = ref(0);
const truncated = ref(false);
const loading = ref(false);
const error = ref(false);
const searchUserId = ref("");
const searchDeviceId = ref("");
const detailVisible = ref(false);
const detailData = ref<UserDevices>({});

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const params: Record<string, string> = {};
    if (searchUserId.value) params.userId = searchUserId.value;
    if (searchDeviceId.value) params.deviceId = searchDeviceId.value;
    const { data } = await rawApi.get("/risk-control/device-fingerprints", { params });
    const rows: DeviceFp[] = data?.data ?? data ?? [];
    rawTotal.value = rows.length;
    truncated.value = rows.length > MAX_DISPLAY;
    list.value = rows.slice(0, MAX_DISPLAY);
  } catch {
    list.value = [];
    rawTotal.value = 0;
    truncated.value = false;
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function showDetail(userId: string) {
  try {
    const { data } = await rawApi.get(`/risk-control/device-fingerprints/${userId}`);
    detailData.value = data ?? {};
    detailVisible.value = true;
  } catch {
    // 错误已由响应拦截器统一提示
  }
}

function onSearch() {
  fetchList();
}

function formatTime(v?: string) {
  if (!v) return "-";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}

// 隐私脱敏：IP / 用户ID / 设备ID 后端未脱敏，前端展示时掩码（写法对齐 FraudList.vue）
function maskIp(ip?: string): string {
  if (!ip) return "-";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return ip.length > 6 ? ip.slice(0, 4) + "****" : "****";
}

function maskId(id?: string): string {
  if (!id) return "-";
  if (id.length <= 8) return id.slice(0, 2) + "****";
  return id.slice(0, 4) + "****" + id.slice(-4);
}

function gotoUser(id?: string) {
  if (id) router.push(`/users/${id}`);
}

async function copyText(text?: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    ElMessage.error("复制失败");
  }
}
</script>

<template>
  <div class="page">
    <div class="header">
      <h2>设备指纹管理</h2>
    </div>

    <div class="search-bar">
      <el-input
        v-model="searchUserId"
        placeholder="用户ID"
        clearable
        style="width:240px"
        @clear="fetchList"
      />
      <el-input
        v-model="searchDeviceId"
        placeholder="设备ID"
        clearable
        style="width:280px;margin-left:12px"
        @clear="fetchList"
      />
      <el-button
        type="primary"
        style="margin-left:12px"
        @click="onSearch"
      >
        搜索
      </el-button>
    </div>

    <el-alert
      v-if="truncated"
      type="warning"
      :closable="false"
      show-icon
      style="margin-top:12px"
      :title="`结果共 ${rawTotal} 条，仅显示前 ${MAX_DISPLAY} 条 · 建议用用户ID/设备ID精确筛选；全量分页待后端支持`"
    />

    <div
      v-if="error"
      class="error-state"
    >
      <el-empty description="加载失败，请重试">
        <el-button
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </el-empty>
    </div>

    <el-table
      v-else
      v-loading="loading"
      :data="list"
      border
      stripe
      style="margin-top:12px"
    >
      <template #empty>
        <el-empty
          v-if="!loading"
          :description="searchUserId || searchDeviceId ? '未找到匹配的设备指纹，换个筛选条件试试' : '暂无设备指纹记录，用户登录后会自动采集'"
        />
        <span v-else />
      </template>
      <el-table-column
        label="用户ID"
        width="200"
      >
        <template #default="{ row }">
          <template v-if="row.userId">
            <el-link
              type="primary"
              title="点击查看用户详情"
              @click="gotoUser(row.userId)"
            >
              {{ maskId(row.userId) }}
            </el-link>
            <el-button
              link
              size="small"
              type="primary"
              style="margin-left:4px"
              @click.stop="copyText(row.userId)"
            >
              复制
            </el-button>
          </template>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column
        label="设备ID"
        width="200"
      >
        <template #default="{ row }">
          {{ maskId(row.deviceId) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="platform"
        label="平台"
        width="100"
      >
        <template #default="{ row }">
          {{ row.platform || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="browser"
        label="浏览器"
        width="150"
      >
        <template #default="{ row }">
          {{ row.browser || row.userAgent?.substring(0, 50) || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="IP"
        width="150"
      >
        <template #default="{ row }">
          {{ maskIp(row.ip) }}
        </template>
      </el-table-column>
      <el-table-column
        label="首次出现"
        width="170"
      >
        <template #default="{ row }">
          {{ formatTime(row.createdAt || row.firstSeenAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="最近活跃"
        width="170"
      >
        <template #default="{ row }">
          {{ formatTime(row.updatedAt || row.lastSeenAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="120"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            link
            @click="showDetail(row.userId)"
          >
            用户设备详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="detailVisible"
      title="用户设备详情"
      width="640px"
    >
      <template v-if="detailData.userId">
        <el-descriptions
          :column="2"
          border
          size="small"
        >
          <el-descriptions-item
            label="用户ID"
            :span="2"
          >
            <el-link
              type="primary"
              title="点击查看用户详情"
              @click="gotoUser(detailData.userId)"
            >
              {{ maskId(detailData.userId) }}
            </el-link>
            <el-button
              link
              size="small"
              type="primary"
              style="margin-left:4px"
              @click="copyText(detailData.userId)"
            >
              复制
            </el-button>
          </el-descriptions-item>
          <el-descriptions-item label="关联设备数">
            {{ detailData.devices?.length ?? detailData.totalDevices ?? 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="可疑设备数">
            {{ detailData.suspiciousCount ?? 0 }}
          </el-descriptions-item>
        </el-descriptions>
        <el-table
          v-if="detailData.devices?.length"
          :data="detailData.devices"
          border
          size="small"
          style="margin-top:12px"
        >
          <el-table-column
            label="设备ID"
            width="200"
          >
            <template #default="{ row }">
              {{ maskId(row.deviceId) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="platform"
            label="平台"
            width="80"
          />
          <el-table-column
            label="IP"
            width="140"
          >
            <template #default="{ row }">
              {{ maskIp(row.ip) }}
            </template>
          </el-table-column>
          <el-table-column
            label="首次出现"
            width="160"
          >
            <template #default="{ row }">
              {{ formatTime(row.createdAt || row.firstSeenAt) }}
            </template>
          </el-table-column>
        </el-table>
        <el-empty
          v-else
          description="暂无设备记录"
          :image-size="60"
        />
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0; }
.search-bar { display: flex; align-items: center; }
.error-state { padding: 40px 0; }
</style>
