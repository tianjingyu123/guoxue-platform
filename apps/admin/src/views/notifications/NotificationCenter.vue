<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import axios from "axios";
import { notificationApi } from "@/api";

/**
 * 通知中心（重构 2026-07-18）
 * 后端事实（已亲核 notification.controller.ts）：
 * - GET /notifications = 当前管理员账号自己的收件箱（不是全平台通知列表）→ 页面改双 Tab 说清语义
 * - POST /notifications 必须带 userId（单发）·原"留空发全员"是假承诺，已删除
 * - POST /notifications/batch 传空 userIds = 一个人都发不出去的假成功 → 弃用
 * - 新契约（并行后端开发中·404 诚实降级）：
 *   POST /notifications/admin/broadcast {tag|userIds,title,content,type} 返回真实送达人数
 *   GET  /notifications/admin/sent 发送历史
 */

/** 免全局拦截器的探测请求：404 用于降级判断，避免弹英文 "Cannot GET" toast */
const probe = axios.create({ baseURL: "/api/v1", timeout: 15000, validateStatus: () => true });
probe.interceptors.request.use((c) => {
  const t = localStorage.getItem("token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
/** 解开后端 {code,data,pagination} 包装 */
function unwrap(d: unknown): any {
  if (d && typeof d === "object" && "code" in d && "data" in d) {
    const env = d as { data: unknown; pagination?: Record<string, unknown> };
    return env.pagination ? { items: env.data, ...env.pagination } : env.data;
  }
  return d;
}

/** 通知类型翻译（对齐 schema Notification.type 注释 + 管理端发送类型） */
const TYPE_LABEL: Record<string, string> = {
  SYSTEM: "系统",
  COMMENT: "评论",
  LIKE: "点赞",
  FOLLOW: "关注",
  PURCHASE: "购买",
  EARNING: "收益",
  AUDIT: "审核",
  CIRCLE: "圈子",
  PERSONAL: "个人",
  ANNOUNCE: "公告",
};
function typeLabel(t?: string) { return (t && TYPE_LABEL[t]) || t || "—"; }
function typeTagType(t?: string): "success" | "warning" | "danger" | "info" | "primary" {
  if (t === "AUDIT") return "warning";
  if (t === "EARNING" || t === "PURCHASE") return "success";
  if (t === "SYSTEM" || t === "ANNOUNCE") return "primary";
  return "info";
}

/** 时间人性化：列表 MM-DD HH:mm，tooltip 完整 */
function fmtShort(d?: string) {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}`;
}
function fmtFull(d?: string) {
  if (!d) return "";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "";
  return t.toLocaleString("zh-CN", { hour12: false });
}

// ───────── Tab：我的通知（管理员收件箱） ─────────
interface NotificationRow {
  id: string;
  type?: string;
  title?: string;
  content?: string;
  isRead?: boolean;
  createdAt?: string;
}
const activeTab = ref("inbox");
const notifications = ref<NotificationRow[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const loadError = ref(false);
const deletingId = ref("");
const markingId = ref("");

async function fetchList() {
  loading.value = true;
  loadError.value = false;
  try {
    const { data } = await notificationApi.list({ page: page.value, pageSize: 20 });
    notifications.value = data.notifications || data.items || [];
    total.value = data.total || 0;
  } catch { loadError.value = true; } finally { loading.value = false; }
}

async function handleMarkRead(row: NotificationRow) {
  if (markingId.value) return;
  markingId.value = row.id;
  try {
    await notificationApi.markRead(row.id);
    row.isRead = true;
    ElMessage.success("已标记为已读");
  } catch { /* 拦截器已提示错误 */ } finally { markingId.value = ""; }
}

async function handleMarkAllRead() {
  try {
    await ElMessageBox.confirm("将当前账号收件箱内所有未读通知标记为已读？", "全部已读", { type: "info" });
  } catch { return; }
  try {
    await notificationApi.markAllRead();
    ElMessage.success("已全部标记为已读");
    fetchList();
  } catch { /* 拦截器已提示错误 */ }
}

async function handleDelete(row: NotificationRow) {
  if (deletingId.value) return;
  try {
    await ElMessageBox.confirm("确定删除该条收件箱通知？仅删除自己收到的这一条。", "删除通知", { type: "warning" });
  } catch { return; }
  deletingId.value = row.id;
  try {
    await notificationApi.delete(row.id);
    ElMessage.success("已删除");
    fetchList();
  } catch { /* 拦截器已提示错误 */ } finally { deletingId.value = ""; }
}

// ───────── Tab：发送历史（新契约·404 隐藏） ─────────
interface SentRow {
  id?: string;
  title?: string;
  content?: string;
  type?: string;
  tag?: string;
  targetCount?: number;
  sentCount?: number;
  count?: number;
  createdAt?: string;
  sentAt?: string;
}
/** null=探测中 · true=可用 · false=端点未部署（隐藏 Tab） */
const sentSupported = ref<boolean | null>(null);
const sentList = ref<SentRow[]>([]);
const sentTotal = ref(0);
const sentPage = ref(1);
const sentLoading = ref(false);
const sentLoadError = ref(false);

async function fetchSent() {
  sentLoading.value = true;
  sentLoadError.value = false;
  try {
    const res = await probe.get("/notifications/admin/sent", { params: { page: sentPage.value, pageSize: 20 } });
    if (res.status === 404) { sentSupported.value = false; return; }
    if (res.status >= 400) { sentLoadError.value = true; return; }
    sentSupported.value = true;
    const d = unwrap(res.data) || {};
    sentList.value = d.items || d.records || d.list || (Array.isArray(d) ? d : []);
    sentTotal.value = d.total || sentList.value.length;
  } catch { sentLoadError.value = true; } finally { sentLoading.value = false; }
}

// ───────── 发送弹窗（目标三选一） ─────────
const showSend = ref(false);
const sending = ref(false);
const sendFormRef = ref<FormInstance>();
const sendForm = reactive({
  mode: "users" as "users" | "tag" | "all",
  userIdsText: "",
  tag: "",
  title: "",
  content: "",
  type: "SYSTEM",
});
const sendRules: FormRules = {
  title: [{ required: true, message: "请填写通知标题", trigger: "blur" }],
  content: [{ required: true, message: "请填写通知内容", trigger: "blur" }],
  userIdsText: [{
    validator: (_r, _v, cb) => {
      if (sendForm.mode === "users" && parseUserIds().length === 0) cb(new Error("请至少填写一个用户ID（每行一个）"));
      else cb();
    },
    trigger: "blur",
  }],
  tag: [{
    validator: (_r, _v, cb) => {
      if (sendForm.mode === "tag" && !sendForm.tag.trim()) cb(new Error("请填写目标标签"));
      else cb();
    },
    trigger: "blur",
  }],
};

function parseUserIds(): string[] {
  return sendForm.userIdsText
    .split(/[\n,，;；]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function openSend() {
  sendForm.mode = "users";
  sendForm.userIdsText = "";
  sendForm.tag = "";
  sendForm.title = "";
  sendForm.content = "";
  sendForm.type = "SYSTEM";
  showSend.value = true;
}

async function handleSend() {
  if (sending.value) return;
  const ok = await sendFormRef.value?.validate().catch(() => false);
  if (!ok) return;
  const userIds = parseUserIds();

  // L3 影响预告：按标签 / 全员必须确认影响范围
  try {
    if (sendForm.mode === "all") {
      await ElMessageBox.confirm(
        "将向【全平台所有用户】发送该通知，影响面为全体注册用户，发送后不可撤回。确定发送？",
        "全员发送确认",
        { type: "error", confirmButtonText: "确认全员发送", confirmButtonClass: "el-button--danger", cancelButtonText: "取消" },
      );
    } else if (sendForm.mode === "tag") {
      await ElMessageBox.confirm(
        `将向标签「${sendForm.tag.trim()}」匹配的所有用户发送该通知，确定发送？`,
        "按标签发送确认",
        { type: "warning", confirmButtonText: "确认发送" },
      );
    } else if (userIds.length > 1) {
      await ElMessageBox.confirm(`将向 ${userIds.length} 个指定用户发送该通知，确定发送？`, "批量发送确认", { type: "warning", confirmButtonText: "确认发送" });
    }
  } catch { return; }

  sending.value = true;
  try {
    const base = { title: sendForm.title.trim(), content: sendForm.content.trim(), type: sendForm.type };
    const body =
      sendForm.mode === "users" ? { ...base, userIds }
      : sendForm.mode === "tag" ? { ...base, tag: sendForm.tag.trim() }
      : base; // 全员：不带 userIds/tag
    const res = await probe.post("/notifications/admin/broadcast", body);

    if (res.status === 404) {
      // 降级：广播端点待部署，只保留单发（POST /notifications 带 userId 是已存在的真端点）
      if (sendForm.mode === "users" && userIds.length === 1) {
        await notificationApi.send({ userId: userIds[0], type: sendForm.type, title: base.title, content: base.content });
        ElMessage.success("已发送给 1 位用户（广播端点待部署，本次走单发通道）");
        showSend.value = false;
        fetchList();
      } else {
        ElMessage.warning("广播端点待后端部署：当前仅支持填写单个用户ID逐个发送，按标签/全员发送暂不可用");
      }
      return;
    }
    if (res.status >= 400) {
      const msg = (res.data && (res.data.message?.toString?.() || res.data.message)) || "发送失败，请重试";
      ElMessage.error(Array.isArray(msg) ? msg.join("；") : msg);
      return;
    }
    const d = unwrap(res.data) || {};
    const count = d.count ?? d.sentCount ?? d.total ?? (sendForm.mode === "users" ? userIds.length : undefined);
    ElMessage.success(count != null ? `发送成功，实际送达 ${count} 人` : "发送成功");
    showSend.value = false;
    fetchList();
    if (sentSupported.value) fetchSent();
  } catch {
    ElMessage.error("发送失败，请检查网络后重试");
  } finally {
    sending.value = false;
  }
}

onMounted(() => {
  fetchList();
  fetchSent(); // 顺带探测发送历史端点是否已部署
});
</script>

<template>
  <div class="notification-page">
    <div class="toolbar">
      <h3>通知中心</h3>
      <div>
        <el-button
          v-if="activeTab === 'inbox'"
          :disabled="!notifications.length"
          @click="handleMarkAllRead"
        >
          全部已读
        </el-button>
        <el-button
          type="primary"
          @click="openSend"
        >
          发送通知
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane
        label="我的通知"
        name="inbox"
      />
      <el-tab-pane
        v-if="sentSupported !== false"
        label="发送历史"
        name="sent"
      />
    </el-tabs>

    <!-- 我的通知 = 当前管理员账号的收件箱 -->
    <template v-if="activeTab === 'inbox'">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom:12px"
        title="此列表是当前管理员账号自己收到的通知（收件箱）；要给平台用户发通知请点右上角「发送通知」。"
      />
      <el-result
        v-if="loadError && !loading"
        icon="error"
        title="加载失败"
        sub-title="请检查网络后重试"
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
        v-show="!loadError"
        v-loading="loading"
        :data="notifications"
        stripe
      >
        <el-table-column
          label="类型"
          width="90"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="typeTagType(row.type)"
            >
              {{ typeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="title"
          label="标题"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="content"
          label="内容"
          min-width="240"
          show-overflow-tooltip
        />
        <el-table-column
          label="状态"
          width="80"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.isRead ? 'info' : 'warning'"
            >
              {{ row.isRead ? '已读' : '未读' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="时间"
          width="130"
        >
          <template #default="{ row }">
            <el-tooltip
              :content="fmtFull(row.createdAt)"
              placement="top"
            >
              <span>{{ fmtShort(row.createdAt) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="160"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              v-if="!row.isRead"
              size="small"
              link
              type="primary"
              :loading="markingId === row.id"
              @click="handleMarkRead(row)"
            >
              标记已读
            </el-button>
            <el-button
              size="small"
              link
              type="danger"
              :loading="deletingId === row.id"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            description="收件箱暂无通知"
            :image-size="80"
          />
        </template>
      </el-table>
      <el-pagination
        v-model:current-page="page"
        :total="total"
        :page-size="20"
        layout="total, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @current-change="fetchList"
      />
    </template>

    <!-- 发送历史（新契约端点） -->
    <template v-else-if="activeTab === 'sent'">
      <el-result
        v-if="sentLoadError && !sentLoading"
        icon="error"
        title="发送历史加载失败"
        sub-title="请重试"
      >
        <template #extra>
          <el-button
            type="primary"
            @click="fetchSent"
          >
            重试
          </el-button>
        </template>
      </el-result>
      <el-table
        v-show="!sentLoadError"
        v-loading="sentLoading"
        :data="sentList"
        stripe
      >
        <el-table-column
          label="类型"
          width="90"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="typeTagType(row.type)"
            >
              {{ typeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="title"
          label="标题"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="content"
          label="内容"
          min-width="240"
          show-overflow-tooltip
        />
        <el-table-column
          label="目标"
          width="120"
        >
          <template #default="{ row }">
            {{ row.tag ? `标签：${row.tag}` : '指定用户' }}
          </template>
        </el-table-column>
        <el-table-column
          label="送达人数"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            {{ (row.targetCount ?? row.sentCount ?? row.count ?? 0).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column
          label="发送时间"
          width="130"
        >
          <template #default="{ row }">
            <el-tooltip
              :content="fmtFull(row.sentAt || row.createdAt)"
              placement="top"
            >
              <span>{{ fmtShort(row.sentAt || row.createdAt) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            description="暂无发送记录，点右上角「发送通知」发出第一条"
            :image-size="80"
          />
        </template>
      </el-table>
      <el-pagination
        v-model:current-page="sentPage"
        :total="sentTotal"
        :page-size="20"
        layout="total, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @current-change="fetchSent"
      />
    </template>

    <!-- 发送弹窗：目标三选一（指定用户 / 按标签 / 全员） -->
    <el-dialog
      v-model="showSend"
      title="发送通知"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-alert
        v-if="sentSupported === false"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom:12px"
        title="广播端点待后端部署：当前仅「指定用户（单个ID）」可发送，按标签/全员发送会给出明确提示，不会假成功。"
      />
      <el-form
        ref="sendFormRef"
        :model="sendForm"
        :rules="sendRules"
        label-width="100px"
      >
        <el-form-item label="发送目标">
          <el-radio-group v-model="sendForm.mode">
            <el-radio-button value="users">
              指定用户
            </el-radio-button>
            <el-radio-button value="tag">
              按标签
            </el-radio-button>
            <el-radio-button value="all">
              全员
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="sendForm.mode === 'users'"
          label="用户ID列表"
          prop="userIdsText"
          required
        >
          <el-input
            v-model="sendForm.userIdsText"
            type="textarea"
            :rows="4"
            placeholder="每行一个用户ID（也支持逗号分隔）"
          />
        </el-form-item>
        <el-form-item
          v-if="sendForm.mode === 'tag'"
          label="目标标签"
          prop="tag"
          required
        >
          <el-input
            v-model="sendForm.tag"
            placeholder="填写用户标签，将发送给该标签匹配的全部用户"
          />
        </el-form-item>
        <el-form-item
          v-if="sendForm.mode === 'all'"
          label=" "
        >
          <el-alert
            type="error"
            :closable="false"
            show-icon
            title="全员发送将触达全平台所有注册用户，提交时会再次确认影响范围。"
          />
        </el-form-item>
        <el-form-item
          label="标题"
          prop="title"
          required
        >
          <el-input
            v-model="sendForm.title"
            maxlength="50"
            show-word-limit
            placeholder="通知标题"
          />
        </el-form-item>
        <el-form-item
          label="内容"
          prop="content"
          required
        >
          <el-input
            v-model="sendForm.content"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="通知内容"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="sendForm.type"
            style="width:100%"
          >
            <el-option
              label="系统通知"
              value="SYSTEM"
            />
            <el-option
              label="圈子通知"
              value="CIRCLE"
            />
            <el-option
              label="个人通知"
              value="PERSONAL"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSend = false">
          取消
        </el-button>
        <el-button
          :type="sendForm.mode === 'all' ? 'danger' : 'primary'"
          :loading="sending"
          @click="handleSend"
        >
          {{ sendForm.mode === 'all' ? '全员发送' : '发送' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.notification-page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.toolbar h3 { margin: 0; }
</style>
