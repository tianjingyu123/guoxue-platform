<template>
  <div class="page">
    <PageHeader title="创作者管理">
      <template #actions>
        <div style="display:flex;gap:8px">
          <el-input
            v-model="keyword"
            placeholder="昵称 / 手机号搜索"
            clearable
            style="width:200px"
            @keyup.enter="onSearch"
            @clear="onSearch"
          />
          <el-button
            type="primary"
            @click="onSearch"
          >
            搜索
          </el-button>
          <el-button
            :disabled="!list.length"
            @click="exportData"
          >
            导出CSV
          </el-button>
        </div>
      </template>
    </PageHeader>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <template #title>
        加载失败，请
        <el-button
          link
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-alert>

    <DataTable
      v-model:page="page"
      v-model:page-size="pageSize"
      :columns="columns"
      :data="list"
      :loading="loading"
      :total="total"
      actions-width="100"
      @change="fetchList"
    >
      <template #creator="{ row }">
        <div class="creator-cell">
          <el-avatar
            :size="32"
            :src="row.avatar"
          >
            {{ (row.nickname || '?').slice(0, 1) }}
          </el-avatar>
          <span class="creator-name">{{ row.nickname || '未命名' }}</span>
        </div>
      </template>
      <template #videoCount="{ row }">
        {{ row.publishedCount }} / {{ row.videoCount }}
      </template>
      <template #totalViews="{ row }">
        {{ formatNum(row.totalViews) }}
      </template>
      <template #totalLikes="{ row }">
        {{ formatNum(row.totalLikes) }}
      </template>
      <template #balance="{ row }">
        {{ formatNum(row.balance) }}
      </template>
      <template #totalEarnings="{ row }">
        {{ formatNum(row.totalEarnings) }}
      </template>
      <template #withdrawn="{ row }">
        {{ formatNum(row.withdrawn) }}
      </template>
      <template #actions="{ row }">
        <el-button
          size="small"
          type="primary"
          @click="openDetail(row)"
        >
          详情
        </el-button>
      </template>
    </DataTable>

    <el-drawer
      v-model="detailVisible"
      title="创作者详情"
      size="640px"
    >
      <div
        v-if="detailLoading"
        style="padding:40px 0"
      >
        <el-skeleton
          :rows="6"
          animated
        />
      </div>
      <el-result
        v-else-if="detailError"
        icon="error"
        title="详情加载失败"
      >
        <template #extra>
          <el-button
            type="primary"
            @click="reloadDetail"
          >
            重试
          </el-button>
        </template>
      </el-result>
      <div v-else-if="detail">
        <div class="d-profile">
          <el-avatar
            :size="56"
            :src="detail.profile.avatar"
          >
            {{ (detail.profile.nickname || '?').slice(0, 1) }}
          </el-avatar>
          <div class="d-profile-info">
            <div class="d-name">
              {{ detail.profile.nickname || '未命名' }}
            </div>
            <div class="d-meta">
              {{ detail.profile.phone || '--' }} · 加入于 {{ detail.profile.joinedAt }}
            </div>
            <div
              v-if="detail.profile.bio"
              class="d-bio"
            >
              {{ detail.profile.bio }}
            </div>
          </div>
        </div>

        <el-descriptions
          :column="3"
          border
          style="margin:16px 0"
        >
          <el-descriptions-item label="作品数">
            {{ detail.overview.videoCount }}
          </el-descriptions-item>
          <el-descriptions-item label="已发布">
            {{ detail.overview.publishedCount }}
          </el-descriptions-item>
          <el-descriptions-item label="粉丝">
            {{ formatNum(detail.overview.followers) }}
          </el-descriptions-item>
          <el-descriptions-item label="总播放">
            {{ formatNum(detail.overview.totalViews) }}
          </el-descriptions-item>
          <el-descriptions-item label="总点赞">
            {{ formatNum(detail.overview.totalLikes) }}
          </el-descriptions-item>
          <el-descriptions-item label="总评论">
            {{ formatNum(detail.overview.totalComments) }}
          </el-descriptions-item>
          <el-descriptions-item label="可用余额(币)">
            {{ formatNum(detail.overview.balance) }}
          </el-descriptions-item>
          <el-descriptions-item label="累计收益(币)">
            {{ formatNum(detail.overview.totalEarnings) }}
          </el-descriptions-item>
          <el-descriptions-item label="已提现(币)">
            {{ formatNum(detail.overview.withdrawn) }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="d-section-title">
          作品列表（近 {{ detail.videos.length }} 条）
        </div>
        <el-empty
          v-if="!detail.videos.length"
          description="暂无作品"
        />
        <el-table
          v-else
          :data="detail.videos"
          size="small"
          border
        >
          <el-table-column
            label="标题"
            prop="title"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column
            label="播放"
            prop="views"
            width="80"
          />
          <el-table-column
            label="点赞"
            prop="likes"
            width="80"
          />
          <el-table-column
            label="状态"
            width="90"
          >
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="videoStatusType(row.status)"
              >
                {{ videoStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="发布日期"
            prop="publishTime"
            width="110"
          />
        </el-table>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "@/api";
import { ElMessage } from "element-plus";
import { exportCSV } from "@/utils/export";
import DataTable from "@/components/DataTable.vue";
import PageHeader from "@/components/PageHeader.vue";

const list = ref<any[]>([]);
const loading = ref(false);
const error = ref(false);
const keyword = ref("");
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

const columns = [
  { prop: "creator", label: "创作者", minWidth: 160, slot: "creator" },
  { prop: "phone", label: "手机号", width: 130 },
  { prop: "followers", label: "粉丝", width: 90 },
  { prop: "videoCount", label: "已发布/作品", width: 110, slot: "videoCount" },
  { prop: "totalViews", label: "总播放", width: 100, slot: "totalViews" },
  { prop: "totalLikes", label: "总点赞", width: 100, slot: "totalLikes" },
  { prop: "balance", label: "余额(币)", width: 100, slot: "balance" },
  { prop: "totalEarnings", label: "累计收益(币)", width: 120, slot: "totalEarnings" },
  { prop: "withdrawn", label: "已提现(币)", width: 110, slot: "withdrawn" },
  { prop: "joinedAt", label: "加入时间", width: 110 },
];

onMounted(() => fetchList());

function onSearch() {
  page.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  error.value = false;
  try {
    const { data } = await api.get("/videos/creator/admin/creators", {
      params: { page: page.value, pageSize: pageSize.value, keyword: keyword.value || undefined },
    });
    list.value = data.items || [];
    total.value = data.total || 0;
  } catch {
    list.value = [];
    total.value = 0;
    error.value = true;
  } finally {
    loading.value = false;
  }
}

// ── 详情抽屉 ──
const detailVisible = ref(false);
const detailLoading = ref(false);
const detailError = ref(false);
const detail = ref<any>(null);
const currentId = ref("");

function openDetail(row: any) {
  currentId.value = row.userId;
  detailVisible.value = true;
  reloadDetail();
}

async function reloadDetail() {
  detailLoading.value = true;
  detailError.value = false;
  detail.value = null;
  try {
    const { data } = await api.get(`/videos/creator/admin/creators/${currentId.value}`);
    if (data?.notFound) {
      detailError.value = true;
      return;
    }
    detail.value = data;
  } catch {
    detailError.value = true;
  } finally {
    detailLoading.value = false;
  }
}

function formatNum(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return String(n ?? 0);
}

const VIDEO_STATUS: Record<string, { label: string; type: "success" | "warning" | "danger" | "info" }> = {
  PUBLISHED: { label: "已发布", type: "success" },
  AUDITING: { label: "待审核", type: "warning" },
  REJECTED: { label: "已驳回", type: "danger" },
  HIDDEN: { label: "已下架", type: "info" },
};
function videoStatusLabel(s: string) {
  return VIDEO_STATUS[s]?.label ?? s;
}
function videoStatusType(s: string) {
  return VIDEO_STATUS[s]?.type ?? "info";
}

function exportData() {
  exportCSV(
    "创作者列表",
    [
      { label: "创作者", key: "nickname" },
      { label: "手机号", key: "phone" },
      { label: "粉丝", key: "followers" },
      { label: "作品数", key: "videoCount" },
      { label: "已发布", key: "publishedCount" },
      { label: "总播放", key: "totalViews" },
      { label: "总点赞", key: "totalLikes" },
      { label: "余额(币)", key: "balance" },
      { label: "累计收益(币)", key: "totalEarnings" },
      { label: "已提现(币)", key: "withdrawn" },
      { label: "加入时间", key: "joinedAt" },
    ],
    list.value,
  );
}
</script>

<style scoped>
.page { padding: 20px; }
.creator-cell { display: flex; align-items: center; gap: 8px; }
.creator-name { color: var(--color-text-title); }
.d-profile { display: flex; gap: 16px; align-items: flex-start; }
.d-profile-info { flex: 1; min-width: 0; }
.d-name { font-size: 16px; font-weight: 700; color: var(--color-text-title); }
.d-meta { font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; }
.d-bio { font-size: 13px; color: var(--color-text-regular); margin-top: 8px; }
.d-section-title { font-weight: 600; color: var(--color-text-title); margin: 8px 0 12px; }
</style>
