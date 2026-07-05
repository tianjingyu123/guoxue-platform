<template>
  <div class="page">
    <PageHeader title="用户标签" />

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      class="tip"
      title="【R2 合规红线】标签仅可用于内容/商品推荐、优惠发放、运营圈人与触达。严禁将任何标签用于差异化定价（大数据杀熟）。"
    />

    <div class="filter-row">
      <el-button @click="fetchDistribution">
        刷新
      </el-button>
      <el-button
        type="primary"
        :loading="recomputing"
        @click="recompute"
      >
        全量重算
      </el-button>
      <span class="hint">标签每日 01:10 自动重算；重算为全量分批操作，用户较多时需等待片刻。</span>
    </div>

    <el-result
      v-if="error && !loading"
      icon="error"
      title="加载失败"
      sub-title="标签分布加载出错，请重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchDistribution"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <template v-else>
      <el-empty
        v-if="!loading && distribution.length === 0"
        description="暂无标签数据，可点「全量重算」立即生成"
      />

      <el-row
        v-else
        v-loading="loading"
        :gutter="16"
      >
        <el-col :span="10">
          <el-card shadow="never">
            <template #header>
              标签分布（点击标签查看用户）
            </template>
            <el-table
              :data="distribution"
              size="small"
              max-height="560"
              highlight-current-row
              @row-click="onTagClick"
            >
              <el-table-column
                label="标签"
                min-width="160"
              >
                <template #default="{ row }">
                  <el-tag
                    :type="tagColor(row.tag)"
                    size="small"
                    class="tag-clickable"
                  >
                    {{ tagLabel(row.tag) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column
                prop="tag"
                label="标签键"
                min-width="150"
                show-overflow-tooltip
              />
              <el-table-column
                prop="count"
                label="人数"
                width="80"
                align="right"
              />
            </el-table>
          </el-card>
        </el-col>
        <el-col :span="14">
          <el-card shadow="never">
            <template #header>
              <span v-if="activeTag">「{{ tagLabel(activeTag) }}」用户列表（圈人）</span>
              <span v-else>用户列表</span>
            </template>

            <el-empty
              v-if="!activeTag"
              description="点击左侧标签查看该标签下的用户"
              :image-size="80"
            />
            <template v-else>
              <el-table
                v-loading="usersLoading"
                :data="users"
                border
                stripe
                size="small"
              >
                <template #empty>
                  <el-empty
                    v-if="!usersLoading"
                    description="该标签下暂无用户"
                    :image-size="80"
                  />
                </template>
                <el-table-column
                  prop="nickname"
                  label="昵称"
                  min-width="140"
                  show-overflow-tooltip
                >
                  <template #default="{ row }">
                    {{ row.nickname || "（已注销）" }}
                  </template>
                </el-table-column>
                <el-table-column
                  prop="userId"
                  label="用户ID"
                  min-width="220"
                  show-overflow-tooltip
                />
                <el-table-column
                  label="类型"
                  width="90"
                >
                  <template #default="{ row }">
                    <el-tag
                      :type="row.type === 'DERIVED' ? 'warning' : 'info'"
                      size="small"
                    >
                      {{ row.type === 'DERIVED' ? '推导' : '事实' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column
                  label="更新时间"
                  width="160"
                >
                  <template #default="{ row }">
                    {{ fmtTime(row.updatedAt) }}
                  </template>
                </el-table-column>
              </el-table>
              <div
                v-if="usersTotal > usersPageSize"
                class="pagination"
              >
                <el-pagination
                  v-model:current-page="usersPage"
                  :page-size="usersPageSize"
                  :total="usersTotal"
                  layout="total, prev, pager, next"
                  @current-change="fetchUsers"
                />
              </div>
            </template>
          </el-card>
        </el-col>
      </el-row>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import PageHeader from "@/components/PageHeader.vue";
import { userTagApi } from "@/api";

interface TagCount { tag: string; count: number }
interface TagUser { userId: string; nickname?: string | null; type: string; updatedAt?: string }

/** 标签键 → 中文（与后端 UserTagService 标签清单对齐；pref_* 动态兜底） */
const TAG_LABELS: Record<string, string> = {
  active_7d: "7天活跃",
  silent_14d: "14天沉默",
  churned_30d: "30天流失",
  pay_none: "未付费",
  pay_once: "首购用户",
  pay_repeat: "复购用户",
  pay_member: "会员",
  role_creator: "创作者",
  role_station: "站长",
  role_merchant: "商家",
  role_offline_station: "驿站主",
  role_circle_owner: "圈主",
  price_sensitive: "价格敏感",
  high_potential_practitioner: "高潜从业者",
  churn_risk: "流失风险",
  whale: "高价值用户",
};

const distribution = ref<TagCount[]>([]);
const loading = ref(false);
const error = ref(false);
const recomputing = ref(false);

const activeTag = ref("");
const users = ref<TagUser[]>([]);
const usersLoading = ref(false);
const usersPage = ref(1);
const usersPageSize = ref(20);
const usersTotal = ref(0);

onMounted(fetchDistribution);

function tagLabel(tag: string): string {
  if (TAG_LABELS[tag]) return TAG_LABELS[tag];
  if (tag.startsWith("pref_")) return `偏好·${tag.slice(5)}`;
  return tag;
}

function tagColor(tag: string): "success" | "warning" | "danger" | "info" | "primary" {
  if (tag === "whale" || tag === "high_potential_practitioner") return "danger";
  if (tag === "churn_risk" || tag === "churned_30d") return "warning";
  if (tag.startsWith("role_")) return "primary";
  if (tag.startsWith("pay_")) return "success";
  return "info";
}

async function fetchDistribution() {
  loading.value = true;
  error.value = false;
  try {
    const { data } = await userTagApi.distribution();
    distribution.value = Array.isArray(data) ? data : [];
  } catch {
    error.value = true;
    distribution.value = [];
    ElMessage.error("加载标签分布失败");
  } finally {
    loading.value = false;
  }
}

function onTagClick(row: TagCount) {
  activeTag.value = row.tag;
  usersPage.value = 1;
  fetchUsers();
}

async function fetchUsers() {
  if (!activeTag.value) return;
  usersLoading.value = true;
  try {
    const { data } = await userTagApi.byTag(activeTag.value, usersPage.value, usersPageSize.value);
    users.value = data.items || [];
    usersTotal.value = data.total || 0;
  } catch {
    users.value = [];
    usersTotal.value = 0;
    ElMessage.error("加载用户列表失败");
  } finally {
    usersLoading.value = false;
  }
}

async function recompute() {
  if (recomputing.value) return;
  try {
    await ElMessageBox.confirm(
      "全量重算所有用户标签（分批 500 幂等）？用户较多时需等待片刻。",
      "全量重算",
      { type: "warning", confirmButtonText: "重算", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  recomputing.value = true;
  try {
    const { data } = await userTagApi.recompute();
    ElMessage.success(`重算完成：${data.users ?? 0} 用户`);
    fetchDistribution();
    if (activeTag.value) fetchUsers();
  } catch {
    ElMessage.error("重算失败（需 SUPER_ADMIN 权限）");
  } finally {
    recomputing.value = false;
  }
}

function fmtTime(t?: string): string {
  return t ? t.slice(0, 16).replace("T", " ") : "";
}
</script>

<style scoped>
.page { padding: 0; }
.tip { margin-bottom: var(--spacing-sm); }
.filter-row { display: flex; gap: var(--spacing-sm); align-items: center; margin-bottom: var(--spacing-lg); }
.hint { color: var(--el-text-color-secondary); font-size: 12px; }
.tag-clickable { cursor: pointer; }
.pagination { margin-top: var(--spacing-lg); display: flex; justify-content: flex-end; }
</style>
