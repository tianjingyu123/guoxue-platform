<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  mockGroupDetail,
  mockGroupDetailMembers,
  mockGroupSettings,
  getGroupPermissions,
  getGroupRoleName,
  CURRENT_USER_ID,
  type GroupMember,
  type GroupSettings,
  type GroupRole,
} from '@/lib/im-data'

const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })

const groupId = ref<number>(mockGroupDetail.id)
onLoad((options) => {
  if (options && options.id) groupId.value = Number(options.id)
})

const group = ref({ ...mockGroupDetail })
const members = ref<GroupMember[]>([...mockGroupDetailMembers])
const settings = ref<GroupSettings>({ ...mockGroupSettings })
const permissions = computed(() => getGroupPermissions(group.value.myRole))

// 编辑昵称
const editingNickname = ref(false)
const nicknameInput = ref(settings.value.myNickname || '')

// 成员管理
const showAllMembers = ref(false)
const selectedMember = ref<GroupMember | null>(null)
const showMemberMenu = ref(false)

// 确认弹窗
const showQuitConfirm = ref(false)
const showDismissConfirm = ref(false)
const showTransferConfirm = ref(false)
const showRemoveConfirm = ref(false)

// 二维码
const showQrcode = ref(false)

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
  uni.setClipboardData({ data: String(groupId.value), success: () => toast('群号已复制') })
}

function handleSaveNickname() {
  settings.value.myNickname = nicknameInput.value
  editingNickname.value = false
  toast('昵称已更新')
}

function handleToggleMute(e: any) {
  settings.value.isMuted = e.detail.value
  toast(settings.value.isMuted ? '已开启消息免打扰' : '已开启消息通知')
}

function handleTogglePin(e: any) {
  settings.value.isPinned = e.detail.value
  toast(settings.value.isPinned ? '已置顶' : '已取消置顶')
}

function handleQuit() {
  showQuitConfirm.value = false
  toast('已退出群聊')
  setTimeout(() => navigateTo('/im/group-list'), 600)
}

function handleDismiss() {
  showDismissConfirm.value = false
  toast('群聊已解散')
  setTimeout(() => navigateTo('/im/group-list'), 600)
}

function openMemberMenu(member: GroupMember) {
  if (member.id === CURRENT_USER_ID || member.role === 'owner') return
  if (!permissions.value.canRemoveMember && !permissions.value.canSetAdmin) return
  selectedMember.value = member
  showMemberMenu.value = true
}

function handleToggleAdmin() {
  const m = selectedMember.value
  if (!m) return
  const isAdmin = m.role === 'admin'
  members.value = members.value.map((x) =>
    x.id === m.id ? { ...x, role: isAdmin ? 'member' : 'admin' } : x,
  )
  showMemberMenu.value = false
  toast(isAdmin ? '已取消管理员' : '已设为管理员')
}

function openTransfer() {
  showMemberMenu.value = false
  showTransferConfirm.value = true
}
function handleTransfer() {
  showTransferConfirm.value = false
  toast('群主已转让')
}

function openRemove() {
  showMemberMenu.value = false
  showRemoveConfirm.value = true
}
function handleRemoveMember() {
  const m = selectedMember.value
  if (!m) return
  members.value = members.value.filter((x) => x.id !== m.id)
  showRemoveConfirm.value = false
  selectedMember.value = null
  toast('已移除成员')
}

function handleShowQrcode() {
  showQrcode.value = true
}

function goInvite() {
  navigateTo(`/im/invite?groupId=${groupId.value}`)
}
</script>

<template>
  <view class="page">
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
            <image class="group-avatar" :src="group.avatar" mode="aspectFill" />
            <view class="info-main">
              <view class="info-name-row">
                <text class="group-name">{{ group.name }}</text>
                <view v-if="permissions.canUpdateNotice" class="icon-mini">
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
            <view class="qr-btn" @tap="handleShowQrcode">
              <AppIcon name="qr-code" :size="20" color="#2c2c2c" />
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
                  <image class="member-avatar" :src="member.avatar" mode="aspectFill" />
                  <view v-if="member.role !== 'member'" class="role-badge">
                    <AppIcon :name="roleIconName(member.role)" :size="12" :color="roleIconColor(member.role)" />
                  </view>
                </view>
                <text class="member-name">{{ member.remark || member.nickname }}</text>
              </view>
              <view v-if="permissions.canInvite" class="member-cell" @tap="goInvite">
                <view class="invite-avatar">
                  <AppIcon name="user-plus" :size="20" color="#999999" />
                </view>
                <text class="member-name">邀请</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 群公告 -->
        <view v-if="group.noticeDetail" class="card notice-card">
          <view class="notice-head">
            <text class="notice-title">群公告</text>
            <text v-if="permissions.canUpdateNotice" class="notice-edit">编辑</text>
          </view>
          <text class="notice-content">{{ group.noticeDetail.content }}</text>
          <text class="notice-meta">{{ group.noticeDetail.publisher }} 发布于 {{ group.noticeDetail.publishedAt }}</text>
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
            <view v-else class="setting-value" @tap="editingNickname = true">
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
              <image class="drawer-avatar" :src="member.avatar" mode="aspectFill" />
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
              v-if="member.id !== CURRENT_USER_ID && member.role !== 'owner' && (permissions.canRemoveMember || permissions.canSetAdmin)"
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

    <!-- 二维码弹窗 -->
    <view v-if="showQrcode" class="mask" @tap="showQrcode = false">
      <view class="qr-sheet" @tap.stop>
        <view class="qr-sheet-head">
          <text class="qr-sheet-title">群二维码</text>
        </view>
        <view class="qr-body">
          <view class="qr-box">
            <AppIcon name="qr-code" :size="140" color="#2c2c2c" />
          </view>
          <text class="qr-tip">扫一扫，加入群聊</text>
          <text class="qr-sub">二维码7天内有效</text>
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
          <view class="dialog-btn danger" @tap="handleQuit"><text class="dialog-btn-text light">退出</text></view>
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
          <view class="dialog-btn danger" @tap="handleDismiss"><text class="dialog-btn-text light">解散</text></view>
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
          <view class="dialog-btn primary" @tap="handleTransfer"><text class="dialog-btn-text light">确认转让</text></view>
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
          <view class="dialog-btn danger" @tap="handleRemoveMember"><text class="dialog-btn-text light">移除</text></view>
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
.qr-btn {
  width: 72rpx;
  height: 72rpx;
  border: 1rpx solid #e8e0d5;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
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
  color: #c41e3a;
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
  color: #c41e3a;
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
  background: #c41e3a;
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

/* 二维码 */
.qr-sheet {
  margin-top: auto;
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  padding-bottom: 48rpx;
}
.qr-sheet-head {
  padding: 28rpx;
  text-align: center;
}
.qr-sheet-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.qr-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 0;
}
.qr-box {
  width: 320rpx;
  height: 320rpx;
  background: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.qr-tip {
  font-size: 26rpx;
  color: #999999;
  margin-top: 32rpx;
}
.qr-sub {
  font-size: 22rpx;
  color: #999999;
  margin-top: 8rpx;
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
  background: #c41e3a;
}
.dialog-btn-text {
  font-size: 28rpx;
  color: #666666;
}
.dialog-btn-text.light {
  color: #ffffff;
}
</style>
