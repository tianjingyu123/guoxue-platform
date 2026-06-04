<template>
  <div class="im-page">
    <div class="page-header">
      <h3>IM 即时通讯管理</h3>
      <div>
        <el-tag
          :type="imStatus.connected ? 'success' : 'danger'"
          size="small"
        >
          {{ imStatus.connected ? '已连接' : '未连接' }}
        </el-tag>
        <el-button
          size="small"
          style="margin-left:8px"
          @click="refreshAll"
        >
          刷新
        </el-button>
      </div>
    </div>

    <!-- 概述卡片 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ imStats.onlineUsers }}</span><span class="label">当前在线</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ imStats.totalGroups }}</span><span class="label">群组总数</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ imStats.todayMessages }}</span><span class="label">今日消息</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ imStats.activeConversations }}</span><span class="label">活跃会话</span>
        </div>
      </el-col>
    </el-row>

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
          />
          <el-button
            type="primary"
            size="small"
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
                {{ row.state === 'Online' ? '在线' : row.state === 'Offline' ? '离线' : row.state }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="在线设备"
            prop="platform"
            width="120"
          >
            <template #default="{ row }">
              {{ row.platform || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="最近活跃"
            width="170"
          >
            <template #default="{ row }">
              {{ row.lastActiveTime ? fmtDate(row.lastActiveTime) : '-' }}
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 群组管理 -->
      <el-tab-pane
        label="群组管理"
        name="groups"
      >
        <div class="toolbar-row">
          <el-button
            type="primary"
            size="small"
            @click="showCreateGroup"
          >
            创建群组
          </el-button>
          <el-input
            v-model="groupSearch"
            placeholder="搜索群组名称/ID"
            size="small"
            style="width:250px;margin-left:8px"
            clearable
          />
        </div>
        <el-table
          :data="filteredGroups"
          stripe
          size="small"
          style="margin-top:12px"
          empty-text="暂无群组数据"
        >
          <el-table-column
            label="群组ID"
            prop="groupId"
            width="200"
            show-overflow-tooltip
          />
          <el-table-column
            label="群名称"
            prop="name"
            min-width="180"
          />
          <el-table-column
            label="类型"
            prop="type"
            width="100"
          >
            <template #default="{ row }">
              {{ row.type === 'CIRCLE' ? '圈子群' : row.type || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="成员数"
            prop="memberCount"
            width="90"
            align="center"
          />
          <el-table-column
            label="创建时间"
            width="170"
          >
            <template #default="{ row }">
              {{ fmtDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="280"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                @click="showGroupMembers(row)"
              >
                成员
              </el-button>
              <el-button
                size="small"
                type="primary"
                @click="showGroupHistory(row)"
              >
                消息
              </el-button>
              <el-button
                size="small"
                type="warning"
                @click="sendGroupMsg(row)"
              >
                发消息
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="destroyGroup(row)"
              >
                解散
              </el-button>
            </template>
          </el-table-column>
        </el-table>
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
          />
          <el-button
            type="primary"
            size="small"
            @click="fetchGroupHistory"
          >
            查询消息
          </el-button>
        </div>
        <el-table
          :data="msgList"
          stripe
          size="small"
          style="margin-top:12px"
          empty-text="请选择群组查询消息"
        >
          <el-table-column
            label="发送者"
            width="160"
          >
            <template #default="{ row }">
              {{ row.senderNickname || row.fromUserId || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="消息内容"
            min-width="300"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <span :class="{ 'text-muted': row.isRevoked }">
                {{ row.isRevoked ? '[消息已撤回]' : (row.text || row.content || '-') }}
              </span>
            </template>
          </el-table-column>
          <el-table-column
            label="类型"
            width="90"
          >
            <template #default="{ row }">
              {{ row.msgType || '文本' }}
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
          <el-input v-model="groupForm.groupId" />
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
      title="群成员管理"
      width="500px"
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
        :data="memberList"
        size="small"
        max-height="300"
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
            {{ fmtDate(row.joinTime) }}
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
        发送至：{{ msgTargetGroup?.name }} ({{ msgTargetGroup?.groupId }})
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
          @click="sendMsg"
        >
          发送
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { imApi } from "@/api";

const activeTab = ref("state");
const imStatus = reactive({ connected: false });
const imStats = reactive({ onlineUsers: 0, totalGroups: 0, todayMessages: 0, activeConversations: 0 });

const stateQuery = reactive({ userIds: "" });
const stateResults = ref<any[]>([]);

const groups = ref<any[]>([]);
const groupSearch = ref("");

const msgQuery = reactive({ groupId: "" });
const msgList = ref<any[]>([]);

const groupVisible = ref(false);
const groupSaving = ref(false);
const groupForm = reactive({ groupId: "", name: "", type: "CIRCLE", ownerId: "" });

const memberVisible = ref(false);
const memberList = ref<any[]>([]);
const currentGroup = ref<any>(null);
const addMemberId = ref("");

const msgSendVisible = ref(false);
const msgTargetGroup = ref<any>(null);
const msgText = ref("");

const filteredGroups = computed(() => {
  if (!groupSearch.value) return groups.value;
  const kw = groupSearch.value.toLowerCase();
  return groups.value.filter((g: any) => (g.groupId + g.name).toLowerCase().includes(kw));
});

function fmtDate(d: string) { return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "-"; }

onMounted(() => refreshAll());

async function refreshAll() {
  try {
    imStatus.connected = true;
  } catch { imStatus.connected = false; }
}

async function queryStates() {
  if (!stateQuery.userIds.trim()) { ElMessage.warning("请输入用户ID"); return; }
  try {
    const { data } = await imApi.queryAccountState(stateQuery.userIds);
    const result = data as any;
    stateResults.value = result?.results || result?.data || [];
    imStats.onlineUsers = stateResults.value.filter((r: any) => r.state === "Online").length;
  } catch { stateResults.value = []; }
}

function showCreateGroup() { groupForm.groupId = ""; groupForm.name = ""; groupForm.type = "CIRCLE"; groupForm.ownerId = ""; groupVisible.value = true; }

async function createGroup() {
  if (!groupForm.groupId || !groupForm.name) { ElMessage.warning("请填写群ID和群名称"); return; }
  groupSaving.value = true;
  try {
    await imApi.createGroup({ groupId: groupForm.groupId, name: groupForm.name, type: groupForm.type, ownerId: groupForm.ownerId });
    ElMessage.success("群组已创建");
    groupVisible.value = false;
  } catch { /* ignore */ } finally { groupSaving.value = false; }
}

async function showGroupMembers(row: any) {
  currentGroup.value = row;
  memberList.value = row.members || [];
  memberVisible.value = true;
}

async function addMember() {
  if (!addMemberId.value || !currentGroup.value) return;
  try {
    await imApi.addGroupMembers(currentGroup.value.groupId, [addMemberId.value]);
    ElMessage.success("成员已添加");
    memberList.value.push({ userId: addMemberId.value, joinTime: new Date().toISOString() });
    addMemberId.value = "";
  } catch { /* ignore */ }
}

async function removeMember(row: any) {
  try {
    await imApi.deleteGroupMembers(currentGroup.value.groupId, [row.userId]);
    ElMessage.success("成员已移除");
    memberList.value = memberList.value.filter((m: any) => m.userId !== row.userId);
  } catch { /* ignore */ }
}

async function destroyGroup(row: any) {
  await ElMessageBox.confirm(`确定解散群组「${row.name}」？此操作不可恢复`, "警告", { type: "warning" });
  try {
    await imApi.destroyGroup(row.groupId);
    ElMessage.success("群组已解散");
    groups.value = groups.value.filter((g: any) => g.groupId !== row.groupId);
  } catch { /* ignore */ }
}

function showGroupHistory(row: any) {
  msgQuery.groupId = row.groupId || row.id;
  activeTab.value = "messages";
  fetchGroupHistory();
}

async function fetchGroupHistory() {
  if (!msgQuery.groupId) { ElMessage.warning("请输入群组ID"); return; }
  try {
    const { data } = await imApi.getGroupHistory(msgQuery.groupId, 1, 100);
    msgList.value = (data as any)?.messages || (data as any)?.data || [];
  } catch { msgList.value = []; }
}

function sendGroupMsg(row: any) {
  msgTargetGroup.value = row;
  msgText.value = "";
  msgSendVisible.value = true;
}

async function sendMsg() {
  if (!msgTargetGroup.value || !msgText.value.trim()) return;
  try {
    await imApi.sendGroupMsg(msgTargetGroup.value.groupId, msgText.value);
    ElMessage.success("消息已发送");
    msgSendVisible.value = false;
  } catch { /* ignore */ }
}

async function withdrawMsg(row: any) {
  try {
    await imApi.withdrawMsg(row.fromUserId || row.senderId, row.msgKey || row.id);
    ElMessage.success("消息已撤回");
    row.isRevoked = true;
  } catch { /* ignore */ }
}
</script>

<style scoped>
.im-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: #8b4513; }
.stat-card { background: #f5f7fa; border-radius: 8px; padding: 16px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: #303133; }
.stat-card .label { display: block; font-size: 13px; color: #909399; margin-top: 4px; }
.toolbar-row { display: flex; align-items: center; gap: 8px; }
.text-muted { color: #909399; }
</style>
