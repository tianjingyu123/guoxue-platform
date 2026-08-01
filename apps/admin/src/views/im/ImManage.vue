<template>
  <div class="im-page">
    <div class="page-header">
      <h3>IM 即时通讯管理</h3>
      <div>
        <el-tag
          :type="connState === 'ok' ? 'success' : connState === 'checking' ? 'info' : 'danger'"
          size="small"
        >
          {{ connState === 'ok' ? 'IM 服务可达' : connState === 'checking' ? '检测中…' : 'IM 服务异常' }}
        </el-tag>
        <el-button
          size="small"
          style="margin-left:8px"
          @click="probeConnectivity"
        >
          重新检测
        </el-button>
      </div>
    </div>

    <!-- 统计：仅保留有真实数据源的项（其余端点后端暂无，不摆假数字） -->
    <el-row
      :gutter="16"
      style="margin-bottom:8px"
    >
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ lastQueryOnline === null ? '—' : lastQueryOnline }}</span>
          <span class="label">在线人数（最近一次查询）</span>
        </div>
      </el-col>
    </el-row>
    <p class="stats-hint">
      更多统计（群组总数 / 今日消息 / 活跃会话）待后端提供统计端点后接入，不展示估算值。
    </p>

    <el-tabs v-model="activeTab">
      <!-- 在线状态 -->
      <el-tab-pane
        label="在线状态"
        name="state"
      >
        <div class="toolbar-row">
          <el-input
            v-model="stateQuery.userIds"
            placeholder="输入用户ID，逗号分隔多个"
            size="small"
            style="width:400px"
            @keyup.enter="queryStates"
          />
          <el-button
            type="primary"
            size="small"
            :loading="stateLoading"
            @click="queryStates"
          >
            查询状态
          </el-button>
          <el-button
            size="small"
            @click="stateQuery.userIds = ''; stateResults = []"
          >
            清空
          </el-button>
        </div>
        <el-table
          v-loading="stateLoading"
          :data="stateResults"
          stripe
          size="small"
          style="margin-top:12px"
          empty-text="输入用户ID查询在线状态"
        >
          <el-table-column
            label="用户ID"
            prop="userId"
            width="300"
            show-overflow-tooltip
          />
          <el-table-column
            label="状态"
            width="120"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.state === 'Online' ? 'success' : row.state === 'Offline' ? 'info' : 'warning'"
                size="small"
              >
                {{ row.state === 'Online' ? '在线' : row.state === 'Offline' ? '离线' : (row.state || '未知') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="在线设备"
            prop="platform"
            width="120"
          >
            <template #default="{ row }">
              {{ row.platform || '—' }}
            </template>
          </el-table-column>
          <el-table-column
            label="最近活跃"
            width="170"
          >
            <template #default="{ row }">
              {{ row.lastActiveTime ? fmtDate(row.lastActiveTime) : '—' }}
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 群组：后端无群组列表端点（亲核 im api 仅有按ID的详情/成员/历史），改为按ID精确查询·诚实降级 -->
      <el-tab-pane
        label="按群组ID查询"
        name="groups"
      >
        <el-alert
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom:12px"
          title="后端暂无「群组列表」端点，此处按群组ID精确查询（圈子群的群组ID一般与圈子ID一致）。群组列表端点已记入后端待办清单。"
        />
        <div class="toolbar-row">
          <el-input
            v-model="groupQueryId"
            placeholder="输入群组ID精确查询"
            size="small"
            style="width:320px"
            clearable
            @keyup.enter="queryGroup"
          />
          <el-button
            type="primary"
            size="small"
            :loading="groupLoading"
            @click="queryGroup"
          >
            查询群组
          </el-button>
          <el-button
            size="small"
            @click="showCreateGroup"
          >
            创建群组
          </el-button>
        </div>

        <el-empty
          v-if="!currentGroup && !groupLoading"
          description="输入群组ID后查询群组详情"
          :image-size="80"
          style="margin-top:12px"
        />
        <el-card
          v-else-if="currentGroup"
          shadow="never"
          style="margin-top:12px"
        >
          <el-descriptions
            :column="2"
            border
          >
            <el-descriptions-item label="群组ID">
              {{ currentGroup.groupId }}
            </el-descriptions-item>
            <el-descriptions-item label="群名称">
              {{ currentGroup.name || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="类型">
              {{ groupTypeLabel(currentGroup.type) }}
            </el-descriptions-item>
            <el-descriptions-item label="成员数">
              {{ currentGroup.memberCount ?? '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ currentGroup.createdAt ? fmtDate(currentGroup.createdAt) : '—' }}
            </el-descriptions-item>
          </el-descriptions>
          <div style="margin-top:12px;display:flex;gap:8px">
            <el-button
              size="small"
              @click="showGroupMembers"
            >
              成员管理
            </el-button>
            <el-button
              size="small"
              type="primary"
              @click="showGroupHistory"
            >
              查看消息
            </el-button>
            <el-button
              size="small"
              type="warning"
              @click="sendGroupMsg"
            >
              发消息
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="destroyGroup"
            >
              解散群组
            </el-button>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 消息监控 -->
      <el-tab-pane
        label="消息监控"
        name="messages"
      >
        <div class="toolbar-row">
          <el-input
            v-model="msgQuery.groupId"
            placeholder="群组ID"
            size="small"
            style="width:250px"
            @keyup.enter="fetchGroupHistory"
          />
          <el-button
            type="primary"
            size="small"
            :loading="msgLoading"
            @click="fetchGroupHistory"
          >
            查询消息
          </el-button>
        </div>
        <el-table
          v-loading="msgLoading"
          :data="msgList"
          stripe
          size="small"
          style="margin-top:12px"
          empty-text="输入群组ID查询消息记录"
        >
          <el-table-column
            label="发送者"
            width="160"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.senderNickname || row.fromUserId || '—' }}
            </template>
          </el-table-column>
          <el-table-column
            label="消息内容"
            min-width="300"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <span :class="{ 'text-muted': row.isRevoked }">
                {{ row.isRevoked ? '[消息已撤回]' : (row.text || row.content || '—') }}
              </span>
            </template>
          </el-table-column>
          <el-table-column
            label="类型"
            width="90"
          >
            <template #default="{ row }">
              {{ msgTypeLabel(row.msgType) }}
            </template>
          </el-table-column>
          <el-table-column
            label="时间"
            width="170"
          >
            <template #default="{ row }">
              {{ fmtDate(row.createdAt || row.sendTime) }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="100"
          >
            <template #default="{ row }">
              <el-button
                v-if="!row.isRevoked"
                size="small"
                type="danger"
                link
                @click="withdrawMsg(row)"
              >
                撤回
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 创建群组弹窗 -->
    <el-dialog
      v-model="groupVisible"
      title="创建群组"
      width="450px"
    >
      <el-form label-width="80px">
        <el-form-item
          label="群ID"
          required
        >
          <el-input
            v-model="groupForm.groupId"
            placeholder="自定义群组ID（如圈子ID）"
          />
        </el-form-item>
        <el-form-item
          label="群名称"
          required
        >
          <el-input v-model="groupForm.name" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="groupForm.type"
            style="width:100%"
          >
            <el-option
              label="圈子群"
              value="CIRCLE"
            />
            <el-option
              label="直播间群"
              value="LIVESTREAM"
            />
            <el-option
              label="课程群"
              value="COURSE"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="群主ID">
          <el-input v-model="groupForm.ownerId" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="groupSaving"
          @click="createGroup"
        >
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- 群成员弹窗 -->
    <el-dialog
      v-model="memberVisible"
      :title="`群成员管理${currentGroup ? '（' + (currentGroup.name || currentGroup.groupId) + '）' : ''}`"
      width="520px"
    >
      <div
        class="toolbar-row"
        style="margin-bottom:12px"
      >
        <el-input
          v-model="addMemberId"
          placeholder="输入用户ID"
          size="small"
          style="width:250px"
        />
        <el-button
          size="small"
          type="primary"
          @click="addMember"
        >
          添加成员
        </el-button>
      </div>
      <el-table
        v-loading="memberLoading"
        :data="memberList"
        size="small"
        max-height="300"
        empty-text="暂无成员数据"
      >
        <el-table-column
          label="用户ID"
          prop="userId"
          width="250"
          show-overflow-tooltip
        />
        <el-table-column
          label="加入时间"
          width="170"
        >
          <template #default="{ row }">
            {{ row.joinTime ? fmtDate(row.joinTime) : '—' }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="80"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              type="danger"
              link
              @click="removeMember(row)"
            >
              移除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 发群消息弹窗 -->
    <el-dialog
      v-model="msgSendVisible"
      title="发送群消息"
      width="450px"
    >
      <p style="color:#909399; margin-bottom:8px">
        发送至：{{ msgTargetGroup?.name || '—' }} ({{ msgTargetGroup?.groupId }})
      </p>
      <el-input
        v-model="msgText"
        type="textarea"
        :rows="4"
        placeholder="输入消息内容"
      />
      <template #footer>
        <el-button @click="msgSendVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :disabled="!msgText.trim()"
          :loading="msgSending"
          @click="sendMsg"
        >
          发送
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import axios from "axios";
import { imApi } from "@/api";
import { useAuthStore } from "@/store/auth";

/** 在线状态查询结果 */
interface ImStateResult { userId?: string; state?: string; platform?: string; lastActiveTime?: string }
/** 群成员（userId 为 api 入参，必填） */
interface ImMember { userId: string; joinTime?: string }
/** IM 群组 */
interface ImGroup {
  groupId: string; name?: string; type?: string;
  memberCount?: number; createdAt?: string;
}
/** IM 消息（宽松 optional，按模板访问声明） */
interface ImMessage {
  senderNickname?: string; fromUserId?: string; senderId?: string;
  text?: string; content?: string; msgType?: string;
  createdAt?: string; sendTime?: string; isRevoked?: boolean;
  msgKey?: string; id?: string;
}

/** 免全局拦截器的连通性探测（失败不弹全局错误 toast） */
const probeHttp = axios.create({ baseURL: "/api/v1", timeout: 10000, validateStatus: () => true });
probeHttp.interceptors.request.use((c) => {
  const t = localStorage.getItem("token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

const auth = useAuthStore();
const activeTab = ref("state");
/** 真探测的连接状态：调只读端点成功=可达（原实现是写死 true 的假"已连接"，已废除） */
const connState = ref<"checking" | "ok" | "fail">("checking");
/** 最近一次在线状态查询得出的在线人数（唯一有真实来源的统计值） */
const lastQueryOnline = ref<number | null>(null);

const stateQuery = reactive({ userIds: "" });
const stateResults = ref<ImStateResult[]>([]);
const stateLoading = ref(false);

const groupQueryId = ref("");
const groupLoading = ref(false);
const currentGroup = ref<ImGroup | null>(null);

const msgQuery = reactive({ groupId: "" });
const msgList = ref<ImMessage[]>([]);
const msgLoading = ref(false);

const groupVisible = ref(false);
const groupSaving = ref(false);
const groupForm = reactive({ groupId: "", name: "", type: "CIRCLE", ownerId: "" });

const memberVisible = ref(false);
const memberLoading = ref(false);
const memberList = ref<ImMember[]>([]);
const addMemberId = ref("");

const msgSendVisible = ref(false);
const msgSending = ref(false);
const msgTargetGroup = ref<ImGroup | null>(null);
const msgText = ref("");

function fmtDate(d?: string) { return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "—"; }
function groupTypeLabel(t?: string) {
  const m: Record<string, string> = { CIRCLE: "圈子群", LIVESTREAM: "直播间群", COURSE: "课程群" };
  return (t && m[t]) || t || "—";
}
function msgTypeLabel(t?: string) {
  const m: Record<string, string> = { TIMTextElem: "文本", TIMImageElem: "图片", TIMSoundElem: "语音", TIMVideoFileElem: "视频", TIMFileElem: "文件", TIMCustomElem: "自定义" };
  return (t && m[t]) || t || "文本";
}

onMounted(() => probeConnectivity());

/** 真探测：只查询当前管理员本人，避免用虚构账号触发后端隐私校验 403。 */
async function probeConnectivity() {
  connState.value = "checking";
  try {
    if (!auth.user?.id) await auth.fetchProfile();
    const selfId = String(auth.user?.id || "");
    if (!selfId) throw new Error("无法识别当前管理员");
    const res = await probeHttp.get("/im/account/state", { params: { userIds: selfId } });
    connState.value = res.status < 400 ? "ok" : "fail";
  } catch { connState.value = "fail"; }
}

async function queryStates() {
  if (!stateQuery.userIds.trim()) { ElMessage.warning("请输入用户ID"); return; }
  stateLoading.value = true;
  try {
    const { data } = await imApi.queryAccountState(stateQuery.userIds);
    const result = data as { results?: ImStateResult[]; data?: ImStateResult[] };
    stateResults.value = result?.results || result?.data || [];
    lastQueryOnline.value = stateResults.value.filter((r) => r.state === "Online").length;
    if (!stateResults.value.length) ElMessage.info("未查询到对应用户的在线状态");
  } catch {
    stateResults.value = [];
    /* 拦截器已提示错误 */
  } finally { stateLoading.value = false; }
}

async function queryGroup() {
  const id = groupQueryId.value.trim();
  if (!id) { ElMessage.warning("请输入群组ID"); return; }
  groupLoading.value = true;
  try {
    const { data } = await imApi.getGroupInfo(id);
    const d = (data as any)?.group ?? (data as any) ?? {};
    currentGroup.value = {
      groupId: d.groupId || d.GroupId || id,
      name: d.name || d.Name,
      type: d.type || d.Type,
      memberCount: d.memberCount ?? d.MemberNum,
      createdAt: d.createdAt,
    };
  } catch {
    currentGroup.value = null;
    ElMessage.error("查询群组失败：群组不存在或 IM 服务异常");
  } finally { groupLoading.value = false; }
}

function showCreateGroup() { groupForm.groupId = ""; groupForm.name = ""; groupForm.type = "CIRCLE"; groupForm.ownerId = ""; groupVisible.value = true; }

async function createGroup() {
  if (!groupForm.groupId || !groupForm.name) { ElMessage.warning("请填写群ID和群名称"); return; }
  groupSaving.value = true;
  try {
    await imApi.createGroup({ groupId: groupForm.groupId, name: groupForm.name, type: groupForm.type, ownerId: groupForm.ownerId });
    ElMessage.success("群组已创建");
    groupVisible.value = false;
    groupQueryId.value = groupForm.groupId;
    queryGroup();
  } catch { /* 拦截器已提示错误 */ } finally { groupSaving.value = false; }
}

async function showGroupMembers() {
  if (!currentGroup.value) return;
  memberVisible.value = true;
  memberLoading.value = true;
  memberList.value = [];
  try {
    const { data } = await imApi.getGroupMembers(currentGroup.value.groupId);
    const d = data as { members?: ImMember[]; data?: ImMember[] };
    memberList.value = d?.members || d?.data || (Array.isArray(data) ? (data as ImMember[]) : []);
  } catch {
    ElMessage.error("获取群成员失败，请重试");
  } finally { memberLoading.value = false; }
}

async function addMember() {
  if (!currentGroup.value) return;
  if (!addMemberId.value.trim()) { ElMessage.warning("请输入要添加的用户ID"); return; }
  try {
    await imApi.addGroupMembers(currentGroup.value.groupId, [addMemberId.value.trim()]);
    ElMessage.success("成员已添加");
    memberList.value.push({ userId: addMemberId.value.trim(), joinTime: new Date().toISOString() });
    addMemberId.value = "";
  } catch { /* 拦截器已提示错误 */ }
}

async function removeMember(row: ImMember) {
  if (!currentGroup.value) return;
  try {
    await ElMessageBox.confirm(`确定将用户 ${row.userId} 移出本群？`, "移除成员", { type: "warning" });
  } catch { return; }
  try {
    await imApi.deleteGroupMembers(currentGroup.value.groupId, [row.userId]);
    ElMessage.success("成员已移除");
    memberList.value = memberList.value.filter((m) => m.userId !== row.userId);
  } catch { /* 拦截器已提示错误 */ }
}

async function destroyGroup() {
  if (!currentGroup.value) return;
  const g = currentGroup.value;
  // confirm 放入 try：用户点取消是 reject，原实现取消会抛未捕获异常
  try {
    await ElMessageBox.confirm(`确定解散群组「${g.name || g.groupId}」？群内所有成员将被移出，此操作不可恢复。`, "解散群组", {
      type: "warning",
      confirmButtonText: "确认解散",
      confirmButtonClass: "el-button--danger",
    });
  } catch { return; }
  try {
    await imApi.destroyGroup(g.groupId);
    ElMessage.success("群组已解散");
    currentGroup.value = null;
  } catch { /* 拦截器已提示错误 */ }
}

function showGroupHistory() {
  if (!currentGroup.value) return;
  msgQuery.groupId = currentGroup.value.groupId;
  activeTab.value = "messages";
  fetchGroupHistory();
}

async function fetchGroupHistory() {
  if (!msgQuery.groupId.trim()) { ElMessage.warning("请输入群组ID"); return; }
  msgLoading.value = true;
  try {
    const { data } = await imApi.getGroupHistory(msgQuery.groupId.trim(), 1, 100);
    const d = data as { messages?: ImMessage[]; data?: ImMessage[] };
    msgList.value = d?.messages || d?.data || [];
    if (!msgList.value.length) ElMessage.info("该群组暂无消息记录");
  } catch {
    msgList.value = [];
    /* 拦截器已提示错误 */
  } finally { msgLoading.value = false; }
}

function sendGroupMsg() {
  if (!currentGroup.value) return;
  msgTargetGroup.value = currentGroup.value;
  msgText.value = "";
  msgSendVisible.value = true;
}

async function sendMsg() {
  if (!msgTargetGroup.value || !msgText.value.trim()) return;
  msgSending.value = true;
  try {
    await imApi.sendGroupMsg(msgTargetGroup.value.groupId, msgText.value);
    ElMessage.success("消息已发送");
    msgSendVisible.value = false;
  } catch { /* 拦截器已提示错误 */ } finally { msgSending.value = false; }
}

/** 撤回消息：L2 危险操作 = 理由必填 + 确认 */
async function withdrawMsg(row: ImMessage) {
  let reason = "";
  try {
    const res = await ElMessageBox.prompt(
      "撤回后该消息在用户端不可见。请填写撤回理由（必填；当前 IM 撤回接口不落库理由，请同步记录到运营工单）。",
      "撤回消息",
      {
        confirmButtonText: "确认撤回",
        cancelButtonText: "取消",
        inputPlaceholder: "如：违规内容 / 涉敏感信息",
        inputValidator: (v: string) => (String(v || "").trim() ? true : "撤回必须填写理由"),
        type: "warning",
      },
    );
    reason = String(res.value || "").trim();
  } catch { return; }
  try {
    // 发送者/消息 key 字段名因来源而异，回退取值后断言为 string（仅类型）
    await imApi.withdrawMsg((row.fromUserId || row.senderId) as string, (row.msgKey || row.id) as string);
    ElMessage.success(`消息已撤回（理由：${reason}）`);
    row.isRevoked = true;
  } catch {
    ElMessage.error("撤回失败，请重试");
  }
}
</script>

<style scoped>
.im-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-card { background: #f5f7fa; border-radius: 8px; padding: 16px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: #303133; }
.stat-card .label { display: block; font-size: 13px; color: #909399; margin-top: 4px; }
.stats-hint { margin: 0 0 12px; font-size: 13px; color: #909399; }
.toolbar-row { display: flex; align-items: center; gap: 8px; }
.text-muted { color: #909399; }
</style>
