<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api as rawApi } from "@/api";

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

const list = ref<DeviceFp[]>([]);
const loading = ref(false);
const searchUserId = ref("");
const searchDeviceId = ref("");
const detailVisible = ref(false);
const detailData = ref<UserDevices>({});

onMounted(() => fetchList());

async function fetchList() {
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    if (searchUserId.value) params.userId = searchUserId.value;
    if (searchDeviceId.value) params.deviceId = searchDeviceId.value;
    const { data } = await rawApi.get("/risk-control/device-fingerprints", { params });
    list.value = data?.data ?? data ?? [];
  } finally {
    loading.value = false;
  }
}

async function showDetail(userId: string) {
  try {
    const { data } = await rawApi.get(`/risk-control/device-fingerprints/${userId}`);
    detailData.value = data ?? {};
    detailVisible.value = true;
  } catch { /* ignored */ }
}

function onSearch() {
  fetchList();
}

function formatTime(v?: string) {
  if (!v) return "-";
  try { return new Date(v).toLocaleString(); } catch { return v; }
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

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
      style="margin-top:12px"
    >
      <el-table-column
        prop="userId"
        label="用户ID"
        width="280"
      />
      <el-table-column
        prop="deviceId"
        label="设备ID"
        width="320"
      />
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
        prop="ip"
        label="IP"
        width="150"
      />
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
            {{ detailData.userId }}
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
            prop="deviceId"
            label="设备ID"
            width="200"
          />
          <el-table-column
            prop="platform"
            label="平台"
            width="80"
          />
          <el-table-column
            prop="ip"
            label="IP"
            width="140"
          />
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
</style>
