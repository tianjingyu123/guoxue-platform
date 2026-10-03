<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { getUserInfo } from '@/utils/storage'
import {
  imApi,
  getGroupPermissions,
  getGroupRoleName,
  type GroupMember,
  type GroupSettings,
  type GroupRole,
} from '@/lib/im-data'

const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })

// 我的 userID（腾讯 IM identifier）：用于识别成员列表中的"我"，替代旧的固定 CURRENT_USER_ID=0
const myUserId = getUserInfo<{ id?: string }>()?.id || ''

const groupId = ref<string>('')
// group 为详情对象，模板裸访问多个字段（avatar/name/memberCount/myRole/noticeDetail 等），收敛 any 会触发大量字段/null 报错，保留 any
const group = ref<any>({})
const members = ref<GroupMember[]>([])
const settings = ref<GroupSettings>({} as GroupSettings)
const loading = ref(true)
const error = ref('')
const submitting = ref(false)

const permissions = computed(() => getGroupPermissions(group.value.myRole))

async function loadData() {
  if (!groupId.value) return
  loading.value = true
  error.value = ''
  try {
    const [detail, memberList, groupSettings] = await Promise.all([
      imApi.getGroupDetail(groupId.value),
      imApi.getGroupMembers(groupId.value),
      imApi.getGroupSettings(groupId.value),
    ])
    group.value = detail
    members.value = memberList
    settings.value = groupSettings
    nicknameInput.value = groupSettings.myNickname || ''
    groupNameInput.value = detail.name || ''
    noticeInput.value = detail.notice || ''
  } catch (e) {
    error.value = (e as Error)?.message || '加载群详情失败，请重试'
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  if (options && options.id) groupId.value = String(options.id)
  loadData()
})

// 编辑昵称
const editingNickname = ref(false)
const nicknameInput = ref(settings.value.myNickname || '')
const editingGroupName = ref(false)
const groupNameInput = ref('')
const editingNotice = ref(false)
const noticeInput = ref('')

// 成员管理
const showAllMembers = ref(false)
const selectedMember = ref<GroupMember | null>(null)
const showMemberMenu = ref(false)

// 确认弹窗
const showQuitConfirm = ref(false)
const showDismissConfirm = ref(false)
const showTransferConfirm = ref(false)
const showRemoveConfirm = ref(false)

const displayMembers = computed(() => members.value.slice(0, 8))

function roleIconName(role: GroupRole): string {
  if (role === 'owner') return 'crown'
  if (role === 'admin') return 'shield'
  return ''
}
function roleIconColor(role: GroupRole): string {
  if (role === 'owner') return '#f59e0b'
  if (role === 'admin') return '#3b82f6'
  return ''
}

function toast(title: string) {
  uni.showToast({ title, icon: 'none' })
}

function handleCopyGroupId() {
  uni.setClipboardData({ data: groupId.value, success: () => toast('群号已复制') })
}

function utf8ByteLength(value: string): number {
  return encodeURIComponent(value).replace(/%[0-9A-F]{2}|./g, 'x').length
}

function operationError(err: unknown, fallback: string): string {
  return (err as { message?: string })?.message?.trim() || fallback
}

function startEditGroupName() {
  groupNameInput.value = group.value.name || ''
  editingGroupName.value = true
}

async function handleSaveGroupName() {
  if (submitting.value) return
  const next = groupNameInput.value.trim()
  if (!next) return toast('群聊名称不能为空')
  if (utf8ByteLength(next) > 30) return toast('群聊名称不能超过 30 字节')
  if (next === group.value.name) { editingGroupName.value = false; return }
  submitting.value = true
  try {
    await imApi.updateGroupProfile(groupId.value, { name: next })
    group.value.name = next
    editingGroupName.value = false
    toast('群聊名称已更新')
  } catch (err) {
    toast(operationError(err, '名称修改失败，请重试'))
  } finally {
    submitting.value = false
  }
}

function startEditNotice() {
  noticeInput.value = group.value.notice || ''
  editingNotice.value = true
}

async function handleSaveNotice() {
  if (submitting.value) return
  const next = noticeInput.value.trim()
  if (utf8ByteLength(next) > 300) return toast('群公告不能超过 300 字节')
  if (next === (group.value.notice || '')) { editingNotice.value = false; return }
  submitting.value = true
  try {
    await imApi.updateGroupProfile(groupId.value, { notification: next })
    group.value.notice = next
    group.value.noticeDetail = next
      ? { publisher: '', publishedAt: '', content: next }
      : undefined
    editingNotice.value = false
    toast(next ? '群公告已更新' : '群公告已清空')
  } catch (err) {
    toast(operationError(err, '公告修改失败，请重试'))
  } finally {
    submitting.value = false
  }
}

function startEditNickname() {
  nicknameInput.value = settings.value.myNickname || ''
  editingNickname.value = true
}

async function handleSaveNickname() {
  if (submitting.value) return
  const next = nicknameInput.value.trim()
  if (next === (settings.value.myNickname || '')) { editingNickname.value = false; return }
  submitting.value = true
  try {
    await imApi.setMyGroupNickname(groupId.value, next)
    settings.value.myNickname = next
    editingNickname.value = false
    toast(next ? '群昵称已更新' : '已恢复默认昵称')
  } catch (err) {
    toast(operationError(err, '群昵称修改失败，请重试'))
  } finally {
    submitting.value = false
  }
}

// 消息免打扰：真连 TIM SDK（乐观更新 + 失败回滚）。绑定 uni <switch>，事件签名保留 any
async function handleToggleMute(e: any) {
  if (submitting.value) return
  const next = !!e.detail.value
  submitting.value = true
  settings.value.isMuted = next
  try {
    await imApi.setGroupMute(groupId.value, next)
    toast(next ? '已开启消息免打扰' : '已开启消息通知')
  } catch (err) {
    settings.value.isMuted = !next
    toast((err as Error)?.message || '操作失败，请重试')
  } finally {
    submitting.value = false
  }
}

// 置顶聊天：真连 TIM SDK（乐观更新 + 失败回滚）
async function handleTogglePin(e: any) {
  if (submitting.value) return
  const next = !!e.detail.value
  submitting.value = true
  settings.value.isPinned = next
  try {
    await imApi.setGroupPin(groupId.value, next)
    toast(next ? '已置顶' : '已取消置顶')
  } catch (err) {
    settings.value.isPinned = !next
    toast((err as Error)?.message || '操作失败，请重试')
  } finally {
    submitting.value = false
  }
}

// 退出群聊：真连 TIM SDK quitGroup（群主不可退出，走解散）
async function handleQuit() {
  if (submitting.value) return
  submitting.value = true
  try {
    await imApi.quitGroup(groupId.value)
    showQuitConfirm.value = false
    toast('已退出群聊')
    setTimeout(() => navigateTo('/im/group-list'), 600)
  } catch (err) {
    toast((err as Error)?.message || '退出失败，请重试')
  } finally {
    submitting.value = false
  }
}

// 解散群聊：腾讯 SDK 直接校验群主身份，失败保持弹窗并给出真实反馈
async function handleDismiss() {
  if (submitting.value) return
  submitting.value = true
  try {
    await imApi.dismissGroup(groupId.value)
    showDismissConfirm.value = false
    toast('群聊已解散')
    setTimeout(() => navigateTo('/im/group-list'), 600)
  } catch (err) {
    toast(operationError(err, '解散失败，请重试'))
  } finally {
    submitting.value = false
  }
}

function openMemberMenu(member: GroupMember) {
  if (member.id === myUserId || member.role === 'owner') return
  if (!permissions.value.canRemoveMember && !permissions.value.canSetAdmin) return
  selectedMember.value = member
  showMemberMenu.value = true
}

async function handleToggleAdmin() {
  if (submitting.value || !selectedMember.value) return
  const member = selectedMember.value
  const nextIsAdmin = member.role !== 'admin'
  showMemberMenu.value = false
  submitting.value = true
  try {
    await imApi.setGroupMemberAdmin(groupId.value, member.id, nextIsAdmin)
    member.role = nextIsAdmin ? 'admin' : 'member'
    toast(nextIsAdmin ? '已设为管理员' : '已取消管理员')
    selectedMember.value = null
  } catch (err) {
    toast(operationError(err, '管理员设置失败，请重试'))
  } finally {
    submitting.value = false
  }
}

function openTransfer() {
  showMemberMenu.value = false
  showTransferConfirm.value = true
}

async function handleTransfer() {
  if (submitting.value || !selectedMember.value) return
  const member = selectedMember.value
  submitting.value = true
  try {
    await imApi.transferGroupOwner(groupId.value, member.id)
    members.value = members.value.map((item) => {
      if (item.id === member.id) return { ...item, role: 'owner' }
      if (item.id === myUserId) return { ...item, role: 'member' }
      return item
    })
    group.value.myRole = 'member'
    group.value.ownerId = member.id
    showTransferConfirm.value = false
    selectedMember.value = null
    toast('群主已转让')
  } catch (err) {
    toast(operationError(err, '转让失败，请重试'))
  } finally {
    submitting.value = false
  }
}

function openRemove() {
  showMemberMenu.value = false
  showRemoveConfirm.value = true
}

async function handleRemoveMember() {
  if (submitting.value || !selectedMember.value) return
  const member = selectedMember.value
  submitting.value = true
  try {
    await imApi.removeGroupMember(groupId.value, member.id)
    members.value = members.value.filter((item) => item.id !== member.id)
    group.value.memberCount = members.value.length
    showRemoveConfirm.value = false
    selectedMember.value = null
    toast('成员已移出群聊')
  } catch (err) {
    toast(operationError(err, '移除失败，请重试'))
  } finally {
    submitting.value = false
  }
}

</script>

<template>
  <view v-if="loading" class="load-state"><text class="load-state-text">加载中...</text></view>
  <view v-else-if="error" class="load-state">
    <text class="load-state-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <view v-else class="page">
    <!-- 导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-btn" @tap="goBack()">
          <AppIcon name="arrow-left" :size="20" color="#2c2c2c" />
        </view>
        <text class="nav-title">群聊设置</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll-area">
      <view class="content">
        <!-- 群基本信息 -->
        <view class="card info-card">
          <view class="info-head">
            <image lazy-load class="group-avatar" :src="group.avatar" mode="aspectFill" />
            <view class="info-main">
              <view v-if="editingGroupName" class="group-name-edit">
                <input
                  v-model="groupNameInput"
                  class="group-name-input"
                  :maxlength="30"
                  confirm-type="done"
                  @confirm="handleSaveGroupName"
                />
                <view class="edit-btn compact save" :class="{ disabled: submitting }" @tap="handleSaveGroupName">
                  <AppIcon name="check" :size="14" color="#ffffff" />
                </view>
                <view class="edit-btn compact cancel" @tap="editingGroupName = false">
                  <AppIcon name="x" :size="14" color="#999999" />
                </view>
              </view>
              <view v-else class="info-name-row">
                <text class="group-name">{{ group.name }}</text>
                <view v-if="permissions.canUpdateNotice" class="icon-mini" @tap="startEditGroupName">
                  <AppIcon name="edit-3" :size="14" color="#999999" />
                </view>
              </view>
              <view class="info-id-row">
                <text class="group-id">群号: {{ groupId }}</text>
                <view class="icon-mini" @tap="handleCopyGroupId">
                  <AppIcon name="copy" :size="12" color="#999999" />
                </view>
              </view>
            </view>
          </view>

          <!-- 群成员 -->
          <view class="member-section">
            <view class="member-head">
              <text class="member-title">群成员 ({{ group.memberCount }}人)</text>
              <view class="member-more" @tap="showAllMembers = true">
                <text class="more-text">查看全部</text>
                <AppIcon name="chevron-right" :size="16" color="#c41e3a" />
              </view>
            </view>
            <view class="member-grid">
              <view
                v-for="member in displayMembers"
                :key="member.id"
                class="member-cell"
                @tap="openMemberMenu(member)"
              >
                <view class="member-avatar-wrap">
                  <image lazy-load class="member-avatar" :src="member.avatar" mode="aspectFill" />
                  <view v-if="member.role !== 'member'" class="role-badge">
                    <AppIcon :name="roleIconName(member.role)" :size="12" :color="roleIconColor(member.role)" />
                  </view>
                </view>
                <text class="member-name">{{ member.remark || member.nickname }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 群公告 -->
        <view v-if="group.noticeDetail || permissions.canUpdateNotice" class="card notice-card">
          <view class="notice-head">
            <text class="notice-title">群公告</text>
            <text
              v-if="permissions.canUpdateNotice"
              class="notice-edit"
              @tap="editingNotice ? (editingNotice = false) : startEditNotice()"
            >{{ editingNotice ? '取消' : '编辑' }}</text>
          </view>
          <view v-if="editingNotice" class="notice-editor">
            <textarea
              v-model="noticeInput"
              class="notice-input"
              :maxlength="300"
              placeholder="输入群公告，留空可清除"
              auto-height
            />
            <view class="notice-actions">
              <text class="notice-count">{{ utf8ByteLength(noticeInput) }}/300 字节</text>
              <view class="notice-save" :class="{ disabled: submitting }" @tap="handleSaveNotice">
                <text class="notice-save-text">{{ submitting ? '保存中…' : '保存公告' }}</text>
              </view>
            </view>
          </view>
          <template v-else>
            <text class="notice-content" :class="{ empty: !group.noticeDetail }">
              {{ group.noticeDetail?.content || '暂无群公告' }}
            </text>
            <text
              v-if="group.noticeDetail?.publisher || group.noticeDetail?.publishedAt"
              class="notice-meta"
            >{{ group.noticeDetail.publisher }}{{ group.noticeDetail.publisher && group.noticeDetail.publishedAt ? ' · ' : '' }}{{ group.noticeDetail.publishedAt }}</text>
          </template>
        </view>

        <!-- 我的设置 -->
        <view class="card settings-card">
          <!-- 我的群昵称 -->
          <view class="setting-row">
            <text class="setting-label">我在本群的昵称</text>
            <view v-if="editingNickname" class="nickname-edit">
              <input
                v-model="nicknameInput"
                class="nickname-input"
                placeholder="请输入昵称"
                :maxlength="20"
              />
              <view class="edit-btn save" @tap="handleSaveNickname">
                <AppIcon name="check" :size="16" color="#ffffff" />
              </view>
              <view class="edit-btn cancel" @tap="editingNickname = false">
                <AppIcon name="x" :size="16" color="#999999" />
              </view>
            </view>
            <view v-else class="setting-value" @tap="startEditNickname">
              <text class="value-text">{{ settings.myNickname || '未设置' }}</text>
              <AppIcon name="chevron-right" :size="16" color="#999999" />
            </view>
          </view>

          <!-- 消息免打扰 -->
          <view class="setting-row">
            <view class="setting-left">
              <AppIcon :name="settings.isMuted ? 'bell-off' : 'bell'" :size="20" color="#999999" />
              <text class="setting-label">消息免打扰</text>
            </view>
            <switch :checked="settings.isMuted" color="#c41e3a" style="transform: scale(0.8)" @change="handleToggleMute" />
          </view>

          <!-- 置顶聊天 -->
          <view class="setting-row">
            <view class="setting-left">
              <AppIcon :name="settings.isPinned ? 'pin' : 'pin-off'" :size="20" :color="settings.isPinned ? '#c41e3a' : '#999999'" />
              <text class="setting-label">置顶聊天</text>
            </view>
            <switch :checked="settings.isPinned" color="#c41e3a" style="transform: scale(0.8)" @change="handleTogglePin" />
          </view>
        </view>

        <!-- 退出/解散群聊 -->
        <view class="card danger-card">
          <view v-if="group.myRole === 'owner'" class="danger-btn" @tap="showDismissConfirm = true">
            <AppIcon name="trash-2" :size="20" color="#ef4444" />
            <text class="danger-text">解散群聊</text>
          </view>
          <view v-else class="danger-btn" @tap="showQuitConfirm = true">
            <AppIcon name="log-out" :size="20" color="#ef4444" />
            <text class="danger-text">退出群聊</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 全部成员抽屉 -->
    <view v-if="showAllMembers" class="mask" @tap="showAllMembers = false">
      <view class="drawer" @tap.stop>
        <view class="drawer-head">
          <text class="drawer-title">群成员 ({{ members.length }})</text>
          <view class="nav-btn" @tap="showAllMembers = false">
            <AppIcon name="x" :size="20" color="#2c2c2c" />
          </view>
        </view>
        <scroll-view scroll-y class="drawer-list">
          <view v-for="member in members" :key="member.id" class="drawer-item">
            <view class="drawer-item-left">
              <image lazy-load class="drawer-avatar" :src="member.avatar" mode="aspectFill" />
              <view class="drawer-info">
                <view class="drawer-name-row">
                  <text class="drawer-name">{{ member.remark || member.nickname }}</text>
                  <view v-if="member.role !== 'member'" class="role-tag">
                    <AppIcon :name="roleIconName(member.role)" :size="11" :color="roleIconColor(member.role)" />
                    <text class="role-tag-text">{{ getGroupRoleName(member.role) }}</text>
                  </view>
                </view>
                <text v-if="member.remark" class="drawer-sub">{{ member.nickname }}</text>
              </view>
            </view>
            <view
              v-if="member.id !== myUserId && member.role !== 'owner' && (permissions.canRemoveMember || permissions.canSetAdmin)"
              class="drawer-more"
              @tap="openMemberMenu(member)"
            >
              <AppIcon name="more-vertical" :size="16" color="#999999" />
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 成员操作菜单 -->
    <view v-if="showMemberMenu" class="mask center" @tap="showMemberMenu = false">
      <view class="action-sheet" @tap.stop>
        <view class="sheet-header">
          <text class="sheet-name">{{ selectedMember?.remark || selectedMember?.nickname }}</text>
        </view>
        <view v-if="permissions.canSetAdmin" class="sheet-item" @tap="handleToggleAdmin">
          <AppIcon name="shield" :size="18" color="#2c2c2c" />
          <text class="sheet-text">{{ selectedMember?.role === 'admin' ? '取消管理员' : '设为管理员' }}</text>
        </view>
        <view v-if="permissions.canTransfer" class="sheet-item" @tap="openTransfer">
          <AppIcon name="crown" :size="18" color="#2c2c2c" />
          <text class="sheet-text">转让群主</text>
        </view>
        <view v-if="permissions.canRemoveMember" class="sheet-item" @tap="openRemove">
          <AppIcon name="trash-2" :size="18" color="#ef4444" />
          <text class="sheet-text danger">移除成员</text>
        </view>
        <view class="sheet-cancel" @tap="showMemberMenu = false">
          <text class="sheet-cancel-text">取消</text>
        </view>
      </view>
    </view>

    <!-- 退出确认 -->
    <view v-if="showQuitConfirm" class="mask center" @tap="showQuitConfirm = false">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">退出群聊</text>
        <text class="dialog-desc">确定要退出群聊「{{ group.name }}」吗？退出后将不再接收此群消息。</text>
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @tap="showQuitConfirm = false"><text class="dialog-btn-text">取消</text></view>
          <view class="dialog-btn danger" :class="{ disabled: submitting }" @tap="handleQuit"><text class="dialog-btn-text light">{{ submitting ? '退出中…' : '退出' }}</text></view>
        </view>
      </view>
    </view>

    <!-- 解散确认 -->
    <view v-if="showDismissConfirm" class="mask center" @tap="showDismissConfirm = false">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">解散群聊</text>
        <text class="dialog-desc">确定要解散群聊「{{ group.name }}」吗？解散后所有成员将被移出，此操作不可撤销。</text>
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @tap="showDismissConfirm = false"><text class="dialog-btn-text">取消</text></view>
          <view class="dialog-btn danger" :class="{ disabled: submitting }" @tap="handleDismiss"><text class="dialog-btn-text light">{{ submitting ? '解散中…' : '解散' }}</text></view>
        </view>
      </view>
    </view>

    <!-- 转让确认 -->
    <view v-if="showTransferConfirm" class="mask center" @tap="showTransferConfirm = false">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">转让群主</text>
        <text class="dialog-desc">确定要将群主转让给「{{ selectedMember?.nickname }}」吗？转让后您将成为普通成员。</text>
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @tap="showTransferConfirm = false"><text class="dialog-btn-text">取消</text></view>
          <view class="dialog-btn primary" :class="{ disabled: submitting }" @tap="handleTransfer"><text class="dialog-btn-text light">{{ submitting ? '转让中…' : '确认转让' }}</text></view>
        </view>
      </view>
    </view>

    <!-- 移除确认 -->
    <view v-if="showRemoveConfirm" class="mask center" @tap="showRemoveConfirm = false">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">移除成员</text>
        <text class="dialog-desc">确定要将「{{ selectedMember?.nickname }}」移出群聊吗？</text>
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @tap="showRemoveConfirm = false"><text class="dialog-btn-text">取消</text></view>
          <view class="dialog-btn danger" :class="{ disabled: submitting }" @tap="handleRemoveMember"><text class="dialog-btn-text light">{{ submitting ? '移除中…' : '移除' }}</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 导航栏 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #faf8f5;
  border-bottom: 1rpx solid #e8e0d5;
}
.nav-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 16rpx;
}
.nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.nav-placeholder {
  width: 64rpx;
}

.scroll-area {
  height: calc(100vh - 88rpx);
}
.content {
  padding: 24rpx;
}
.card {
  background: #ffffff;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
}

/* 群信息 */
.info-card {
  padding: 28rpx;
}
.info-head {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.group-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 20rpx;
  background: #f0ebe5;
}
.info-main {
  flex: 1;
  min-width: 0;
}
.info-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.group-name {
  font-size: 34rpx;
  font-weight: 600;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.group-name-edit {
  display: flex;
  align-items: center;
  gap: 8rpx;
  width: 100%;
}
.group-name-input {
  flex: 1;
  min-width: 0;
  height: 60rpx;
  padding: 0 14rpx;
  border-radius: 12rpx;
  background: #f5f1eb;
  color: #2c2c2c;
  font-size: 28rpx;
}
.edit-btn.compact {
  width: 56rpx;
  height: 56rpx;
}
.icon-mini {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.info-id-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
}
.group-id {
  font-size: 26rpx;
  color: #999999;
}
/* 群成员 */
.member-section {
  margin-top: 32rpx;
}
.member-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.member-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.member-more {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.more-text {
  font-size: 26rpx;
  color: var(--brand);
}
.member-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}
.member-cell {
  width: 96rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.member-avatar-wrap {
  position: relative;
}
.member-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #f0ebe5;
}
.role-badge {
  position: absolute;
  bottom: -4rpx;
  right: -4rpx;
  background: #ffffff;
  border-radius: 50%;
  padding: 4rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.member-name {
  font-size: 22rpx;
  color: #999999;
  margin-top: 8rpx;
  width: 100%;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.invite-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  border: 2rpx dashed rgba(153, 153, 153, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 群公告 */
.notice-card {
  padding: 28rpx;
}
.notice-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.notice-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.notice-edit {
  font-size: 26rpx;
  color: var(--brand);
}
.notice-content {
  font-size: 26rpx;
  color: #999999;
  line-height: 1.6;
  white-space: pre-wrap;
  display: block;
}
.notice-meta {
  font-size: 22rpx;
  color: #999999;
  margin-top: 16rpx;
  display: block;
}
.notice-content.empty {
  color: #aaa29a;
}
.notice-editor {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.notice-input {
  width: 100%;
  min-height: 140rpx;
  box-sizing: border-box;
  padding: 20rpx;
  border-radius: 16rpx;
  background: #f8f5f0;
  color: #2c2c2c;
  font-size: 26rpx;
  line-height: 1.6;
}
.notice-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.notice-count {
  color: #999999;
  font-size: 22rpx;
}
.notice-save {
  padding: 14rpx 24rpx;
  border-radius: 999rpx;
  background: var(--brand);
}
.notice-save-text {
  color: #ffffff;
  font-size: 24rpx;
}

/* 我的设置 */
.settings-card {
  overflow: hidden;
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  border-bottom: 1rpx solid #f0ebe5;
}
.setting-row:last-child {
  border-bottom: none;
}
.setting-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.setting-label {
  font-size: 28rpx;
  color: #2c2c2c;
}
.setting-value {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.value-text {
  font-size: 28rpx;
  color: #999999;
}
.nickname-edit {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.nickname-input {
  width: 200rpx;
  height: 64rpx;
  background: #f5f1eb;
  border-radius: 12rpx;
  padding: 0 16rpx;
  font-size: 26rpx;
  color: #2c2c2c;
}
.edit-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.edit-btn.save {
  background: var(--brand);
}
.edit-btn.cancel {
  background: #f5f1eb;
}

/* 危险操作 */
.danger-card {
  overflow: hidden;
}
.danger-btn {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.danger-text {
  font-size: 30rpx;
  color: #ef4444;
}

/* 遮罩 */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 100;
  display: flex;
}
.mask.center {
  align-items: center;
  justify-content: center;
}

/* 成员抽屉 */
.drawer {
  margin-left: auto;
  width: 86%;
  max-width: 640rpx;
  height: 100%;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}
.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid #e8e0d5;
}
.drawer-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.drawer-list {
  flex: 1;
}
.drawer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
}
.drawer-item-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.drawer-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f0ebe5;
}
.drawer-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.drawer-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.role-tag {
  display: flex;
  align-items: center;
  gap: 4rpx;
  background: #f0ebe5;
  border-radius: 8rpx;
  padding: 2rpx 10rpx;
}
.role-tag-text {
  font-size: 20rpx;
  color: #666666;
}
.drawer-sub {
  font-size: 22rpx;
  color: #999999;
  margin-top: 4rpx;
  display: block;
}
.drawer-more {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 成员操作菜单 */
.action-sheet {
  width: 560rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
}
.sheet-header {
  padding: 28rpx;
  text-align: center;
  border-bottom: 1rpx solid #f0ebe5;
}
.sheet-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.sheet-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx;
  border-bottom: 1rpx solid #f0ebe5;
}
.sheet-text {
  font-size: 28rpx;
  color: #2c2c2c;
}
.sheet-text.danger {
  color: #ef4444;
}
.sheet-cancel {
  padding: 28rpx;
  text-align: center;
}
.sheet-cancel-text {
  font-size: 28rpx;
  color: #999999;
}

/* 确认弹窗 */
.dialog {
  width: 580rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx 24rpx;
}
.dialog-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
  text-align: center;
  display: block;
}
.dialog-desc {
  font-size: 27rpx;
  color: #666666;
  line-height: 1.6;
  margin-top: 20rpx;
  display: block;
}
.dialog-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
}
.dialog-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog-btn.cancel {
  background: #f5f1eb;
}
.dialog-btn.danger {
  background: #ef4444;
}
.dialog-btn.primary {
  background: var(--brand);
}
.disabled {
  opacity: 0.55;
  pointer-events: none;
}
.dialog-btn-text {
  font-size: 28rpx;
  color: #666666;
}
.dialog-btn-text.light {
  color: #ffffff;
}

/* 加载/错误状态 */
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
