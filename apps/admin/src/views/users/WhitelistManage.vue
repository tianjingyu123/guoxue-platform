<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { userApi } from "@/api";

interface WhitelistUser {
  id: string;
  nickname: string | null;
  avatar: string | null;
  phone: string | null;
}

interface WhitelistRow {
  userId: string;
  reason: string | null;
  createdAt: string | null;
  user: WhitelistUser | null;
}

interface WhitelistPayload {
  items?: unknown[];
  total?: number;
  page?: number;
  pageSize?: number;
}

const list = ref<WhitelistRow[]>([]);
const loading = ref(false);
const addLoading = ref(false);
const removingId = ref("");
const dialogVisible = ref(false);
const form = ref({ userId: "", reason: "" });
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

function normalizeRow(raw: unknown): WhitelistRow | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;

  if (typeof item.userId === "string" && item.userId) {
    return {
      userId: item.userId,
      reason: typeof item.reason === "string" ? item.reason : null,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : null,
      user: item.user && typeof item.user === "object" ? item.user as WhitelistUser : null,
    };
  }

  // 兼容服务端滚动发布期间的旧版响应；旧版 createdAt 是账号创建时间，不能冒充白名单添加时间。
  if (typeof item.id === "string" && item.id) {
    return {
      userId: item.id,
      reason: null,
      createdAt: null,
      user: {
        id: item.id,
        nickname: typeof item.nickname === "string" ? item.nickname : null,
        avatar: typeof item.avatar === "string" ? item.avatar : null,
        phone: typeof item.phone === "string" ? item.phone : null,
      },
    };
  }
  return null;
}

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await userApi.listWhitelist({ page: page.value, pageSize: pageSize.value });
    const payload = data as WhitelistPayload | unknown[];
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items) ? payload.items : [];
    list.value = rows.map(normalizeRow).filter((row): row is WhitelistRow => row !== null);
    total.value = Array.isArray(payload)
      ? list.value.length
      : typeof payload.total === "number" ? payload.total : list.value.length;

    const maxPage = Math.max(1, Math.ceil(total.value / pageSize.value));
    if (page.value > maxPage) {
      page.value = maxPage;
      await fetchList();
    }
  } finally {
    loading.value = false;
  }
}

function openAddDialog() {
  form.value = { userId: "", reason: "" };
  dialogVisible.value = true;
}

async function copyId(id: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(id);
    } else {
      const input = document.createElement("textarea");
      input.value = id;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    ElMessage.success("用户 ID 已复制");
  } catch {
    ElMessage.warning("复制失败，请手动复制");
  }
}

async function handleAdd() {
  const userId = form.value.userId.trim();
  if (!userId) {
    ElMessage.warning("请输入用户 ID");
    return;
  }

  addLoading.value = true;
  try {
    await userApi.addWhitelist({
      userId,
      reason: form.value.reason.trim() || undefined,
    });
    ElMessage.success("已加入用户限流白名单，数秒内生效");
    dialogVisible.value = false;
    page.value = 1;
    await fetchList();
  } finally {
    addLoading.value = false;
  }
}

async function handleRemove(row: WhitelistRow) {
  const who = row.user?.nickname || row.userId;
  try {
    await ElMessageBox.confirm(
      "确认将“" + who + "”移出用户限流白名单？移除后，该用户会恢复接口附加频率限制。",
      "移除白名单确认",
      {
        type: "warning",
        confirmButtonText: "确认移除",
        cancelButtonText: "取消",
      },
    );
  } catch {
    return;
  }

  removingId.value = row.userId;
  try {
    await userApi.removeWhitelist(row.userId);
    ElMessage.success("已移出用户限流白名单");
    await fetchList();
  } finally {
    removingId.value = "";
  }
}

function formatTime(value: string | null) {
  if (!value) return "历史数据";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "历史数据";
  return date.toLocaleString("zh-CN", { hour12: false });
}

onMounted(fetchList);
</script>

<template>
  <div class="whitelist-page">
    <section class="page-heading">
      <div>
        <p class="eyebrow">
          安全与容量
        </p>
        <h2>用户限流白名单</h2>
        <p class="heading-desc">
          为内部联调、演示或特殊服务用户放宽登录后接口的附加频率限制。
        </p>
      </div>
      <el-button
        type="primary"
        @click="openAddDialog"
      >
        添加用户
      </el-button>
    </section>

    <el-alert
      class="scope-alert"
      type="info"
      :closable="false"
      show-icon
      title="白名单只作用于登录后的附加频率限制"
      description="全局基础防护、身份权限、内容审核、交易与资金风控始终保留，不会因加入此名单而绕过。变更通常在数秒内生效。"
    />

    <section class="table-card">
      <div class="table-card__header">
        <div>
          <h3>已加入用户</h3>
          <p>共 {{ total }} 人，仅超级管理员可管理</p>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="list"
        row-key="userId"
        stripe
      >
        <template #empty>
          <el-empty description="暂无用户限流白名单">
            <el-button
              type="primary"
              plain
              @click="openAddDialog"
            >
              添加第一位用户
            </el-button>
          </el-empty>
        </template>

        <el-table-column
          label="用户"
          min-width="210"
        >
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar
                :size="36"
                :src="row.user?.avatar || undefined"
              >
                {{ (row.user?.nickname || "用").slice(0, 1) }}
              </el-avatar>
              <div class="user-cell__meta">
                <strong>{{ row.user?.nickname || (row.user ? "未设置昵称" : "用户已不存在") }}</strong>
                <span>{{ row.user?.phone || "未绑定手机号" }}</span>
              </div>
              <el-tag
                v-if="!row.user"
                size="small"
                type="warning"
              >
                失效账号
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="用户 ID"
          min-width="250"
        >
          <template #default="{ row }">
            <div class="id-cell">
              <code :title="row.userId">{{ row.userId }}</code>
              <el-button
                link
                type="primary"
                @click="copyId(row.userId)"
              >
                复制
              </el-button>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          prop="reason"
          label="加入原因"
          min-width="180"
        >
          <template #default="{ row }">
            <span :class="{ muted: !row.reason }">{{ row.reason || "未填写" }}</span>
          </template>
        </el-table-column>

        <el-table-column
          label="添加时间"
          width="190"
        >
          <template #default="{ row }">
            <span :class="{ muted: !row.createdAt }">{{ formatTime(row.createdAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column
          label="操作"
          width="92"
          fixed="right"
          align="center"
        >
          <template #default="{ row }">
            <el-button
              link
              type="danger"
              :loading="removingId === row.userId"
              :disabled="Boolean(removingId) && removingId !== row.userId"
              @click="handleRemove(row)"
            >
              移除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div
        v-if="total > pageSize"
        class="pagination-wrap"
      >
        <el-pagination
          v-model:current-page="page"
          :total="total"
          :page-size="pageSize"
          layout="total, prev, pager, next"
          @current-change="fetchList"
        />
      </div>
    </section>

    <el-dialog
      v-model="dialogVisible"
      title="添加用户限流白名单"
      width="min(480px, calc(100vw - 32px))"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        :model="form"
        label-position="top"
      >
        <el-form-item
          label="用户 ID"
          required
        >
          <el-input
            v-model="form.userId"
            maxlength="64"
            clearable
            placeholder="从用户管理详情复制完整用户 ID"
            @keyup.enter="handleAdd"
          />
          <p class="field-help">
            只能添加已存在的平台用户；加入名单不会改变该用户的任何权限。
          </p>
        </el-form-item>
        <el-form-item label="加入原因">
          <el-input
            v-model="form.reason"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="例如：上线前 AI 连续对话联调"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button
          :disabled="addLoading"
          @click="dialogVisible = false"
        >
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="addLoading"
          @click="handleAdd"
        >
          确认添加
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.whitelist-page {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.page-heading,
.table-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: var(--el-bg-color);
  box-shadow: 0 8px 24px rgb(15 23 42 / 4%);
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 24px;
}

.eyebrow {
  margin: 0 0 6px;
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.page-heading h2,
.table-card h3 {
  margin: 0;
  color: var(--el-text-color-primary);
}

.page-heading h2 {
  font-size: 24px;
}

.heading-desc,
.table-card__header p,
.field-help {
  color: var(--el-text-color-secondary);
}

.heading-desc {
  margin: 8px 0 0;
  line-height: 1.6;
}

.scope-alert {
  border-radius: 10px;
}

.table-card {
  min-width: 0;
  overflow: hidden;
}

.table-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.table-card__header h3 {
  font-size: 16px;
}

.table-card__header p {
  margin: 5px 0 0;
  font-size: 13px;
}

.user-cell,
.id-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.user-cell__meta {
  display: grid;
  min-width: 0;
}

.user-cell__meta strong,
.user-cell__meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-cell__meta span {
  margin-top: 3px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.id-cell code {
  display: block;
  overflow: hidden;
  max-width: 180px;
  padding: 3px 7px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.muted {
  color: var(--el-text-color-placeholder);
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.field-help {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 720px) {
  .whitelist-page {
    padding: 12px;
  }

  .page-heading {
    align-items: stretch;
    flex-direction: column;
    padding: 18px;
  }

  .page-heading :deep(.el-button) {
    width: 100%;
  }

  .pagination-wrap {
    justify-content: center;
    overflow-x: auto;
  }
}
</style>
