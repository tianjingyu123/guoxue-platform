<template>
  <div class="page">
    <div class="header">
      <h2>续费管理</h2>
    </div>

    <!-- 即将到期用户 -->
    <el-card
      class="section-card"
      shadow="never"
    >
      <template #header>
        <span style="font-weight:600">即将到期（30天内）</span>
      </template>
      <el-result
        v-if="expiringError"
        icon="error"
        title="加载失败"
        sub-title="无法获取即将到期数据，请重试"
      >
        <template #extra>
          <el-button
            type="primary"
            @click="fetchExpiring"
          >
            重试
          </el-button>
        </template>
      </el-result>
      <el-table
        v-else
        v-loading="expiringLoading"
        :data="expiringData"
        border
        stripe
        size="small"
      >
        <template #empty>
          <el-empty description="暂无即将到期数据" />
        </template>
        <el-table-column
          label="类型"
          width="120"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row._type === 'STATION' ? 'warning' : row._type === 'VIP' ? 'danger' : ''"
            >
              {{ typeLabel(row._type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="名称/用户"
          min-width="160"
        >
          <template #default="{ row }">
            {{ row.name || row.nickname || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="到期日"
          width="170"
        >
          <template #default="{ row }">
            {{ row.expireAt ? new Date(row.expireAt).toLocaleString('zh-CN') : '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="剩余天数"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.daysLeft <= 7 ? 'danger' : 'warning'"
            >
              {{ row.daysLeft || 0 }}天
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 续费记录 -->
    <el-card
      class="section-card"
      shadow="never"
      style="margin-top:16px"
    >
      <template #header>
        <span style="font-weight:600">续费记录</span>
      </template>
      <div
        class="search-row"
        style="margin-bottom:12px"
      >
        <el-select
          v-model="typeFilter"
          placeholder="类型"
          clearable
          style="width:140px"
          @change="fetchHistory"
        >
          <el-option
            label="全部"
            value=""
          />
          <el-option
            label="分站"
            value="STATION"
          />
          <el-option
            label="圈子"
            value="CIRCLE_MEMBER"
          />
          <el-option
            label="研究院"
            value="INSTITUTE_MEMBER"
          />
          <el-option
            label="VIP"
            value="VIP_MEMBER"
          />
          <el-option
            label="运营商"
            value="OPERATOR"
          />
        </el-select>
        <el-button
          type="primary"
          @click="fetchHistory"
        >
          查询
        </el-button>
      </div>
      <el-result
        v-if="historyError"
        icon="error"
        title="加载失败"
        sub-title="无法获取续费记录，请重试"
      >
        <template #extra>
          <el-button
            type="primary"
            @click="fetchHistory"
          >
            重试
          </el-button>
        </template>
      </el-result>
      <template v-else>
        <el-table
          v-loading="historyLoading"
          :data="historyList"
          border
          stripe
        >
          <template #empty>
            <el-empty description="暂无续费记录" />
          </template>
          <el-table-column
            label="用户"
            width="120"
            prop="user.nickname"
          />
        <el-table-column
          label="类型"
          width="120"
        >
          <template #default="{ row }">
            <el-tag size="small">
              {{ typeLabel(row.targetType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="金额"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            ¥{{ row.amount || 0 }}
          </template>
        </el-table-column>
        <el-table-column
          label="续费天数"
          width="100"
          align="center"
          prop="periodDays"
        />
        <el-table-column
          label="原到期"
          width="170"
        >
          <template #default="{ row }">
            {{ row.prevExpireAt ? new Date(row.prevExpireAt).toLocaleString('zh-CN') : '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="新到期"
          width="170"
        >
          <template #default="{ row }">
            {{ row.newExpireAt ? new Date(row.newExpireAt).toLocaleString('zh-CN') : '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="时间"
          width="170"
        >
          <template #default="{ row }">
            {{ row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-' }}
          </template>
        </el-table-column>
        </el-table>
        <div
          v-if="historyTotal > pageSize"
          class="pagination"
        >
          <el-pagination
            v-model:current-page="page"
            layout="prev, pager, next"
            :total="historyTotal"
            :page-size="pageSize"
            @current-change="fetchHistory"
          />
        </div>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { renewalApi } from "@/api";

// 即将到期项 / 续费记录（按列配置与模板访问字段定义的宽松本地类型）
interface ExpiringRow {
  _type: string;
  name?: string;
  nickname?: string;
  memberLevel?: string;
  expireAt?: string;
  daysLeft: number;
}
interface HistoryRow {
  user?: { nickname?: string };
  targetType: string;
  amount?: number;
  periodDays?: number;
  prevExpireAt?: string;
  newExpireAt?: string;
  createdAt?: string;
}

const expiringLoading = ref(false);
const expiringError = ref(false);
const expiringData = ref<ExpiringRow[]>([]);

const historyLoading = ref(false);
const historyError = ref(false);
const historyList = ref<HistoryRow[]>([]);
const typeFilter = ref("");
const page = ref(1);
const pageSize = 20;
const historyTotal = ref(0);

function typeLabel(t: string) {
  const m: Record<string,string> = {
    STATION: "分站", CIRCLE_MEMBER: "圈子", INSTITUTE_MEMBER: "研究院",
    VIP_MEMBER: "VIP会员", OPERATOR: "运营商",
  };
  return m[t] || t;
}

onMounted(() => { fetchExpiring(); fetchHistory(); });

async function fetchExpiring() {
  expiringLoading.value = true;
  expiringError.value = false;
  try {
    const { data } = await renewalApi.getExpiringUsers();
    const items: ExpiringRow[] = [];
    (data.expiringStations || []).forEach((s: any) => items.push({ _type: "STATION", name: s.name, expireAt: s.expireAt, daysLeft: calcDays(s.expireAt) }));
    (data.expiringInstituteMembers || []).forEach((m: any) => items.push({ _type: "INSTITUTE_MEMBER", name: m.institute?.name || m.id, expireAt: m.expireAt, daysLeft: calcDays(m.expireAt) }));
    (data.expiringVip || []).forEach((u: any) => items.push({ _type: "VIP", nickname: u.nickname, memberLevel: u.memberLevel, expireAt: u.memberExpire, daysLeft: calcDays(u.memberExpire) }));
    expiringData.value = items.sort((a, b) => (a.daysLeft || 999) - (b.daysLeft || 999));
  } catch {
    expiringData.value = [];
    expiringError.value = true;
  } finally { expiringLoading.value = false; }
}

function calcDays(date: string | null) {
  if (!date) return 0;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

async function fetchHistory() {
  historyLoading.value = true;
  historyError.value = false;
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize };
    if (typeFilter.value) params.type = typeFilter.value;
    const { data } = await renewalApi.getAdminHistory(params);
    historyList.value = data.records || [];
    historyTotal.value = data.total || 0;
  } catch {
    historyList.value = [];
    historyTotal.value = 0;
    historyError.value = true;
  } finally { historyLoading.value = false; }
}
</script>

<style scoped>
.page { padding: 20px; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.search-row { display: flex; gap: 8px; align-items: center; }
.section-card { margin-bottom: 16px; }
.pagination { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>
