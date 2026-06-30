<template>
  <div class="page">
    <div class="header">
      <h2>圈子后台管理</h2>
    </div>

    <!-- 圈子列表 -->
    <el-card
      class="section-card"
      shadow="never"
    >
      <template #header>
        <span style="font-weight:600">圈子列表</span>
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
          prop="type"
        />
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
              :type="row.status === 'ACTIVE' ? 'success' : 'info'"
            >
              {{ row.status === 'ACTIVE' ? '活跃' : row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="创建时间"
          width="170"
        >
          <template #default="{ row }">
            {{ row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-' }}
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

      <!-- 嘉宾管理 -->
      <el-card
        class="section-card"
        shadow="never"
      >
        <template #header>
          <span style="font-weight:600">嘉宾分账管理</span>
        </template>
        <el-table
          v-loading="guestLoading"
          :data="guestList"
          border
          stripe
        >
          <template #empty>
            <el-empty
              description="暂无嘉宾"
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
              <el-input-number
                v-model="row.shareRate"
                :min="0"
                :max="100"
                size="small"
                style="width:100px"
                @change="(v: number) => updateShareRate(row.userId, v)"
              />
            </template>
          </el-table-column>
          <el-table-column
            label="累计收益"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              ¥{{ row.totalEarned || 0 }}
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
          <el-input
            v-model="revenuePeriod"
            placeholder="2026-06"
            style="width:120px;margin-left:12px"
            size="small"
            @change="fetchRevenue"
          />
        </template>
        <el-row :gutter="16">
          <el-col :span="8">
            <div class="rev-item">
              <span class="rev-label">交易额</span><span class="rev-num">¥{{ revenue.totalAmount || 0 }}</span>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="rev-item">
              <span class="rev-label">嘉宾分成</span><span
                class="rev-num"
                style="color:#e6a23c"
              >¥{{ revenue.totalGuestPayouts || 0 }}</span>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="rev-item">
              <span class="rev-label">圈主收益</span><span
                class="rev-num"
                style="color:#67c23a"
              >¥{{ revenue.ownerRevenue || 0 }}</span>
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
import { circleBackendApi } from "@/api";

const loading = ref(false);
const loadError = ref(false);
const savingRate = ref(false);
const circleList = ref<any[]>([]);
const page = ref(1);
const pageSize = 20;
const circleTotal = ref(0);

const selectedCircle = ref<any>(null);
const overview = ref<any>({});
const guestLoading = ref(false);
const guestList = ref<any[]>([]);
const revenue = ref<any>({});
const revenuePeriod = ref("");

onMounted(() => fetchCircles());

async function fetchCircles() {
  loading.value = true;
  loadError.value = false;
  try {
    const { data } = await circleBackendApi.adminCircles({ page: page.value, pageSize });
    circleList.value = data.circles || [];
    circleTotal.value = data.total || 0;
  } catch { loadError.value = true; } finally { loading.value = false; }
}

async function selectCircle(row: any) {
  selectedCircle.value = row;
  overview.value = {};
  guestList.value = [];
  revenue.value = {};
  try {
    const { data } = await circleBackendApi.adminOverview(row.id);
    overview.value = data;
  } catch {}
  fetchGuests();
  fetchRevenue();
}

async function fetchGuests() {
  if (!selectedCircle.value) return;
  guestLoading.value = true;
  try {
    const { data } = await circleBackendApi.guests();
    guestList.value = data || [];
  } catch {} finally { guestLoading.value = false; }
}

async function fetchRevenue() {
  if (!selectedCircle.value) return;
  try {
    const { data } = await circleBackendApi.revenue(revenuePeriod.value || undefined);
    revenue.value = data;
  } catch {}
}

async function updateShareRate(userId: string, shareRate: number) {
  if (savingRate.value) return;
  savingRate.value = true;
  try {
    await circleBackendApi.setGuestShareRate(userId, shareRate);
    ElMessage.success("已更新");
  } catch { ElMessage.error("更新失败"); } finally { savingRate.value = false; }
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.section-card { margin-bottom: 16px; }
.overview-row { margin-bottom: 16px; }
.stat-label { font-size: 13px; color: var(--color-text-secondary); }
.stat-value { font-size: 22px; font-weight: 600; color: var(--color-text-title); margin-top: 4px; }
.rev-item { display: flex; flex-direction: column; gap: 4px; padding: 8px 0; }
.rev-label { font-size: 13px; color: var(--color-text-secondary); }
.rev-num { font-size: 20px; font-weight: 600; }
.pagination { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>
