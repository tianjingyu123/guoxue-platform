<template>
  <view class="page">
    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!group"
      skeleton-type="detail"
      @retry="loadData"
    >
      <view class="content">
        <!-- 导航 -->
        <view class="nav">
          <text class="nav-back" @click="goBack">←</text>
          <text class="nav-title">群聊设置</text>
          <view class="nav-placeholder" />
        </view>

        <!-- 群基本信息 -->
        <view v-if="group" class="card">
          <view class="group-header">
            <image :src="group.avatar || ''" class="group-avatar" mode="aspectFill" />
            <view class="group-info">
              <view class="group-name-row">
                <text class="group-name">{{ group.name }}</text>
                <text v-if="perms?.canUpdateNotice" class="group-edit">✎</text>
              </view>
              <view class="group-id-row">
                <text class="group-id">群号: {{ groupId }}</text>
                <text class="group-copy" @click="copyGroupId">📋</text>
              </view>
            </view>
            <text class="group-qr" @click="showQr">📱</text>
          </view>
        </view>

        <!-- 群成员 -->
        <view v-if="group" class="card">
          <view class="member-header">
            <text class="member-title">群成员 ({{ group.memberCount }}人)</text>
            <text class="member-all" @click="showAllMembers = true">查看全部 ›</text>
          </view>
          <view class="member-avatars">
            <view
              v-for="m in memberList.slice(0, 8)"
              :key="m.id"
              class="member-avatar-item"
              @click="selectMemberAction(m)"
            >
              <view class="member-avatar-wrap">
                <image :src="m.avatar || ''" class="member-avatar-sm" mode="aspectFill" />
                <text v-if="m.role === 'owner'" class="m-role-icon">👑</text>
                <text v-if="m.role === 'admin'" class="m-role-icon">🛡</text>
              </view>
              <text class="member-avatar-name">{{ m.remark || m.nickname }}</text>
            </view>
            <view v-if="perms?.canInvite" class="member-avatar-item" @click="goInvite">
              <view class="member-add-wrap">
                <text class="member-add-icon">＋</text>
              </view>
              <text class="member-avatar-name">邀请</text>
            </view>
          </view>
        </view>

        <!-- 群公告 -->
        <view v-if="group?.noticeDetail" class="card">
          <view class="card-header-row">
            <text class="card-title">群公告</text>
            <text v-if="perms?.canUpdateNotice" class="card-action">编辑</text>
          </view>
          <text class="card-text">{{ group.noticeDetail.content }}</text>
          <text class="card-meta">{{ group.noticeDetail.publisher }} 发布于 {{ group.noticeDetail.publishedAt }}</text>
        </view>

        <!-- 我的设置 -->
        <view class="card">
          <!-- 我的群昵称 -->
          <view class="setting-item">
            <text class="setting-label">我在本群的昵称</text>
            <view v-if="editingNickname" class="setting-edit-row">
              <input v-model="nicknameInput" class="setting-input" placeholder="请输入昵称" maxlength="20" />
              <text class="setting-save" @click="saveNickname">✓</text>
              <text class="setting-cancel" @click="editingNickname = false">✕</text>
            </view>
            <text v-else class="setting-value" @click="startEditNickname">
              {{ settings?.myNickname || '未设置' }} ›
            </text>
          </view>
          <!-- 消息免打扰 -->
          <view class="setting-item">
            <view class="setting-label-row">
              <text>{{ settings?.isMuted ? '🔕' : '🔔' }}</text>
              <text class="setting-label">消息免打扰</text>
            </view>
            <switch :checked="settings?.isMuted || false" color="#C41E3A" @change="toggleMute" />
          </view>
          <!-- 置顶聊天 -->
          <view class="setting-item">
            <view class="setting-label-row">
              <text>{{ settings?.isPinned ? '📌' : '📌' }}</text>
              <text class="setting-label">置顶聊天</text>
            </view>
            <switch :checked="settings?.isPinned || false" color="#C41E3A" @change="togglePin" />
          </view>
        </view>

        <!-- 退出/解散 -->
        <view class="card">
          <view v-if="group?.myRole === 'owner'" class="danger-btn" @click="showDismissConfirm = true">
            <text>🗑 解散群聊</text>
          </view>
          <view v-else class="danger-btn" @click="showQuitConfirm = true">
            <text>🚪 退出群聊</text>
          </view>
        </view>
      </view>

      <!-- 全部成员抽屉 -->
      <view v-if="showAllMembers" class="sheet-mask" @click="showAllMembers = false">
        <view class="sheet-side" @click.stop>
          <view class="sheet-side-header">
            <text class="sheet-side-title">群成员 ({{ memberList.length }})</text>
          </view>
          <scroll-view scroll-y class="sheet-side-body">
            <view v-for="m in memberList" :key="m.id" class="member-row">
              <view class="member-row-left">
                <image :src="m.avatar || ''" class="member-row-avatar" mode="aspectFill" />
                <view class="member-row-info">
                  <view class="member-row-name-row">
                    <text class="member-row-name">{{ m.remark || m.nickname }}</text>
                    <text v-if="m.role === 'owner'" class="role-badge owner">👑 群主</text>
                    <text v-else-if="m.role === 'admin'" class="role-badge admin">🛡 管理员</text>
                  </view>
                  <text v-if="m.remark" class="member-row-sub">{{ m.nickname }}</text>
                </view>
              </view>
              <view v-if="m.id !== currentUserId && perms && (perms.canRemoveMember || perms.canSetAdmin) && m.role !== 'owner'" class="member-row-right">
                <text class="member-row-more" @click="openMemberMenu(m)">⋮</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 二维码弹窗 -->
      <view v-if="showQrCode" class="dialog-mask" @click="showQrCode = false">
        <view class="dialog-box" @click.stop>
          <text class="dialog-title">群二维码</text>
          <view class="qr-wrap">
            <view class="qr-placeholder">📱</view>
          </view>
          <text class="qr-hint">扫一扫，加入群聊</text>
          <text class="qr-expire">二维码7天内有效</text>
        </view>
      </view>

      <!-- 成员操作弹窗 -->
      <view v-if="memberActionTarget" class="sheet-mask" @click="memberActionTarget = null">
        <view class="sheet-content sheet-bottom" @click.stop>
          <view v-if="perms?.canSetAdmin" class="action-item" @click="toggleAdmin(memberActionTarget)">
            <text>{{ memberActionTarget.role === 'admin' ? '取消管理员' : '设为管理员' }}</text>
          </view>
          <view v-if="perms?.canTransfer && memberActionTarget?.role !== 'owner'" class="action-item" @click="showTransferConfirm = true">
            <text>转让群主</text>
          </view>
          <view v-if="perms?.canRemoveMember && memberActionTarget?.role !== 'owner'" class="action-item action-danger-text" @click="showRemoveConfirm = true">
            <text>移除成员</text>
          </view>
        </view>
      </view>

      <!-- 退出确认 -->
      <view v-if="showQuitConfirm" class="dialog-mask" @click="showQuitConfirm = false">
        <view class="dialog-box" @click.stop>
          <text class="dialog-title">退出群聊</text>
          <text class="dialog-desc">确定要退出群聊「{{ group?.name }}」吗？退出后将不再接收此群消息。</text>
          <view class="dialog-btns">
            <text class="dialog-btn dialog-btn-cancel" @click="showQuitConfirm = false">取消</text>
            <text class="dialog-btn dialog-btn-danger" @click="doQuit">退出</text>
          </view>
        </view>
      </view>

      <!-- 解散确认 -->
      <view v-if="showDismissConfirm" class="dialog-mask" @click="showDismissConfirm = false">
        <view class="dialog-box" @click.stop>
          <text class="dialog-title">解散群聊</text>
          <text class="dialog-desc">确定要解散群聊「{{ group?.name }}」吗？解散后所有成员将被移出，此操作不可撤销。</text>
          <view class="dialog-btns">
            <text class="dialog-btn dialog-btn-cancel" @click="showDismissConfirm = false">取消</text>
            <text class="dialog-btn dialog-btn-danger" @click="doDismiss">解散</text>
          </view>
        </view>
      </view>

      <!-- 转让确认 -->
      <view v-if="showTransferConfirm" class="dialog-mask" @click="showTransferConfirm = false">
        <view class="dialog-box" @click.stop>
          <text class="dialog-title">转让群主</text>
          <text class="dialog-desc">确定要将群主转让给「{{ memberActionTarget?.nickname }}」吗？转让后您将成为普通成员。</text>
          <view class="dialog-btns">
            <text class="dialog-btn dialog-btn-cancel" @click="showTransferConfirm = false">取消</text>
            <text class="dialog-btn dialog-btn-primary" @click="doTransfer">确认转让</text>
          </view>
        </view>
      </view>

      <!-- 移除确认 -->
      <view v-if="showRemoveConfirm" class="dialog-mask" @click="showRemoveConfirm = false">
        <view class="dialog-box" @click.stop>
          <text class="dialog-title">移除成员</text>
          <text class="dialog-desc">确定要将「{{ memberActionTarget?.nickname }}」移出群聊吗？</text>
          <view class="dialog-btns">
            <text class="dialog-btn dialog-btn-cancel" @click="showRemoveConfirm = false">取消</text>
            <text class="dialog-btn dialog-btn-danger" @click="doRemoveMember">移除</text>
          </view>
        </view>
      </view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { imApi } from '../../api'

interface GroupDetail {
  id: string
  name: string
  avatar?: string
  memberCount: number
  myRole: 'owner' | 'admin' | 'member'
  notice?: string
  noticeDetail?: { publisher: string; publishedAt: string; content: string }
}

interface GroupMember {
  id: string
  nickname: string
  remark?: string
  avatar?: string
  role: 'owner' | 'admin' | 'member'
}

interface GroupSettings {
  myNickname?: string
  isMuted: boolean
  isPinned: boolean
}

interface GroupPermissions {
  canUpdateNotice: boolean
  canInvite: boolean
  canRemoveMember: boolean
  canSetAdmin: boolean
  canTransfer: boolean
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const groupId = ref('')
const group = ref<GroupDetail | null>(null)
const settings = ref<GroupSettings>({ isMuted: false, isPinned: false })
const memberList = ref<GroupMember[]>([])
const perms = ref<GroupPermissions | null>(null)
const currentUserId = '0'

// 编辑昵称
const editingNickname = ref(false)
const nicknameInput = ref('')

// 成员管理
const showAllMembers = ref(false)
const memberActionTarget = ref<GroupMember | null>(null)

// 弹窗
const showQuitConfirm = ref(false)
const showDismissConfirm = ref(false)
const showTransferConfirm = ref(false)
const showRemoveConfirm = ref(false)
const showQrCode = ref(false)

function goBack() { uni.navigateBack() }

function goInvite() {
  uni.navigateTo({ url: `/pages/im/invite?groupId=${groupId.value}` })
}

onMounted(() => {
  const pages = getCurrentPages()
  const opts = (pages[pages.length - 1] as any)?.options || {}
  groupId.value = opts.groupId || ''
  loadData()
})

async function loadData() {
  if (!groupId.value) {
    loadError.value = '缺少群组ID'
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = null
  try {
    const [groupRes, membersRes] = await Promise.all([
      imApi.getGroupInfo(groupId.value),
      imApi.getGroupMembers(groupId.value),
    ])
    const g = groupRes || {}
    group.value = {
      id: groupId.value,
      name: g.name || '群聊',
      avatar: g.avatar || '',
      memberCount: g.memberCount || g.member_count || 0,
      myRole: g.myRole || g.my_role || 'member',
      notice: g.notice || '',
      noticeDetail: g.noticeDetail || null,
    }
    const mList = Array.isArray(membersRes) ? membersRes : []
    memberList.value = mList.map((m: any) => ({
      id: String(m.id || m.userId || ''),
      nickname: m.nickname || m.name || '',
      remark: m.remark || '',
      avatar: m.avatar || '',
      role: m.role || 'member',
    }))
    // 设置默认权限
    const role = group.value.myRole
    perms.value = {
      canUpdateNotice: role === 'owner' || role === 'admin',
      canInvite: true,
      canRemoveMember: role === 'owner' || role === 'admin',
      canSetAdmin: role === 'owner',
      canTransfer: role === 'owner',
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function copyGroupId() {
  uni.setClipboardData({ data: groupId.value })
  uni.showToast({ title: '群号已复制', icon: 'none' })
}

function startEditNickname() {
  editingNickname.value = true
  nicknameInput.value = settings.value.myNickname || ''
}

async function saveNickname() {
  const nickname = nicknameInput.value.trim()
  if (!nickname) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' })
    return
  }
  try {
    await imApi.updateGroupNickname(groupId.value, nickname)
    settings.value.myNickname = nickname
    editingNickname.value = false
    uni.showToast({ title: '昵称已更新', icon: 'success' })
  } catch {
    uni.showToast({ title: '更新失败', icon: 'none' })
  }
}

function toggleMute(e: any) {
  const muted = e.detail?.value ?? !settings.value.isMuted
  settings.value.isMuted = muted
  imApi.setGroupMuted(groupId.value, muted).catch(() => {
    settings.value.isMuted = !muted
  })
  uni.showToast({ title: muted ? '已开启消息免打扰' : '已关闭消息免打扰', icon: 'none' })
}

function togglePin(e: any) {
  const pinned = e.detail?.value ?? !settings.value.isPinned
  settings.value.isPinned = pinned
  uni.showToast({ title: pinned ? '已置顶' : '已取消置顶', icon: 'none' })
}

function selectMemberAction(m: GroupMember) {
  if (m.id === currentUserId) return
  memberActionTarget.value = m
}

function openMemberMenu(m: GroupMember) {
  memberActionTarget.value = m
  showAllMembers.value = false
}

async function toggleAdmin(m: GroupMember) {
  const makeAdmin = m.role !== 'admin'
  try {
    await imApi.setGroupAdmin(groupId.value, m.id, makeAdmin)
    m.role = makeAdmin ? 'admin' : 'member'
    memberActionTarget.value = null
    uni.showToast({ title: makeAdmin ? '已设为管理员' : '已取消管理员', icon: 'success' })
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function doTransfer() {
  showTransferConfirm.value = false
  if (!memberActionTarget.value) return
  const target = memberActionTarget.value
  memberActionTarget.value = null
  try {
    await imApi.transferGroupOwner(groupId.value, target.id)
    uni.showToast({ title: '群主已转让', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  } catch {
    uni.showToast({ title: '转让失败', icon: 'none' })
  }
}

async function doRemoveMember() {
  if (!memberActionTarget.value) return
  const target = memberActionTarget.value
  try {
    await imApi.removeGroupMember(groupId.value, target.id)
    memberList.value = memberList.value.filter(m => m.id !== target.id)
    showRemoveConfirm.value = false
    memberActionTarget.value = null
    uni.showToast({ title: '已移除成员', icon: 'success' })
  } catch {
    uni.showToast({ title: '移除失败', icon: 'none' })
  }
}

async function doQuit() {
  showQuitConfirm.value = false
  try {
    await imApi.quitGroup(groupId.value)
    uni.showToast({ title: '已退出群聊', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  } catch {
    uni.showToast({ title: '退出失败', icon: 'none' })
  }
}

async function doDismiss() {
  showDismissConfirm.value = false
  try {
    await imApi.dismissGroup(groupId.value)
    uni.showToast({ title: '群聊已解散', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  } catch {
    uni.showToast({ title: '解散失败', icon: 'none' })
  }
}

function showQr() {
  showQrCode.value = true
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.content { padding-bottom: 20px; }

/* 导航 */
.nav { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fff; border-bottom: 1px solid #E5E1DB; }
.nav-back { font-size: 22px; color: #2C2C2C; padding: 4px; }
.nav-title { flex: 1; text-align: center; font-size: 16px; font-weight: 500; }
.nav-placeholder { width: 30px; }

/* 卡片 */
.card { background: #fff; border-radius: 12px; margin: 12px 16px 0; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }

/* 群信息 */
.group-header { display: flex; align-items: center; gap: 14px; }
.group-avatar { width: 60px; height: 60px; border-radius: 12px; flex-shrink: 0; }
.group-info { flex: 1; min-width: 0; }
.group-name-row { display: flex; align-items: center; gap: 4px; }
.group-name { font-size: 17px; font-weight: 600; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.group-edit { font-size: 14px; color: #999; padding: 2px; }
.group-id-row { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.group-id { font-size: 13px; color: #999; }
.group-copy { font-size: 14px; color: #999; }
.group-qr { font-size: 22px; color: #999; padding: 8px; }

/* 成员 */
.member-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.member-title { font-size: 14px; font-weight: 500; color: #2C2C2C; }
.member-all { font-size: 13px; color: #C41E3A; }
.member-avatars { display: flex; flex-wrap: wrap; gap: 12px; }
.member-avatar-item { display: flex; flex-direction: column; align-items: center; width: 52px; }
.member-avatar-wrap { position: relative; }
.member-avatar-sm { width: 44px; height: 44px; border-radius: 50%; }
.m-role-icon { position: absolute; bottom: -2px; right: -2px; font-size: 12px; background: #fff; border-radius: 50%; padding: 1px; line-height: 1; }
.member-avatar-name { font-size: 10px; color: #666; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; text-align: center; }
.member-add-wrap { width: 44px; height: 44px; border-radius: 50%; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; }
.member-add-icon { font-size: 20px; color: #999; }

/* 公告 */
.card-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.card-title { font-size: 14px; font-weight: 500; }
.card-action { font-size: 13px; color: #C41E3A; }
.card-text { font-size: 13px; color: #666; line-height: 1.6; display: block; white-space: pre-wrap; }
.card-meta { font-size: 11px; color: #999; display: block; margin-top: 8px; }

/* 设置项 */
.setting-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f5f0e8; }
.setting-item:last-child { border-bottom: none; }
.setting-label { font-size: 14px; color: #2C2C2C; }
.setting-label-row { display: flex; align-items: center; gap: 8px; }
.setting-value { font-size: 13px; color: #999; padding: 4px; }
.setting-edit-row { display: flex; align-items: center; gap: 6px; }
.setting-input { border: 1px solid #E5E1DB; border-radius: 6px; padding: 6px 8px; font-size: 13px; width: 120px; background: #FAF8F5; }
.setting-save { color: #C41E3A; font-size: 16px; padding: 4px; }
.setting-cancel { color: #999; font-size: 16px; padding: 4px; }

/* 危险按钮 */
.danger-btn { padding: 14px; text-align: center; font-size: 15px; color: #C41E3A; }
.danger-btn:active { background: #FFF0F0; border-radius: 8px; }

/* Sheet */
.sheet-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; }
.sheet-side { width: 85vw; background: #fff; height: 100%; display: flex; flex-direction: column; margin-left: auto; }
.sheet-side-header { padding: 16px; border-bottom: 1px solid #E5E1DB; }
.sheet-side-title { font-size: 16px; font-weight: 600; }
.sheet-side-body { flex: 1; overflow-y: auto; }
.sheet-content { background: #fff; }
.sheet-bottom { margin-top: auto; border-radius: 16px 16px 0 0; padding: 8px 0 env(safe-area-inset-bottom); }

.member-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f5f0e8; }
.member-row-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.member-row-avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
.member-row-info { flex: 1; min-width: 0; }
.member-row-name-row { display: flex; align-items: center; gap: 6px; }
.member-row-name { font-size: 14px; font-weight: 500; color: #2C2C2C; }
.role-badge { font-size: 10px; padding: 1px 6px; border-radius: 4px; }
.role-badge.owner { color: #b8860b; background: #fef7e6; }
.role-badge.admin { color: #3b82f6; background: #eff6ff; }
.member-row-sub { font-size: 11px; color: #999; display: block; margin-top: 2px; }
.member-row-right { flex-shrink: 0; }
.member-row-more { font-size: 18px; color: #999; padding: 8px; }

.action-item { padding: 14px 20px; font-size: 15px; color: #2C2C2C; border-bottom: 1px solid #f5f5f5; }
.action-item:active { background: #F5F0E8; }
.action-danger-text { color: #C41E3A; }

/* 弹窗 */
.dialog-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 200; display: flex; align-items: center; justify-content: center;
}
.dialog-box { background: #fff; border-radius: 12px; width: 280px; padding: 24px; text-align: center; }
.dialog-title { font-size: 17px; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 10px; }
.dialog-desc { font-size: 14px; color: #666; line-height: 1.5; display: block; margin-bottom: 20px; }
.dialog-btns { display: flex; gap: 12px; }
.dialog-btn { flex: 1; padding: 10px; border-radius: 8px; font-size: 15px; text-align: center; }
.dialog-btn-cancel { background: #F5F0E8; color: #666; }
.dialog-btn-primary { background: #C41E3A; color: #fff; }
.dialog-btn-danger { background: #C41E3A; color: #fff; }

/* 二维码 */
.qr-wrap { display: flex; justify-content: center; padding: 16px 0; }
.qr-placeholder { width: 160px; height: 160px; background: #fff; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 64px; border: 1px solid #E5E1DB; }
.qr-hint { font-size: 13px; color: #999; display: block; margin-top: 8px; }
.qr-expire { font-size: 11px; color: #ccc; display: block; margin-top: 4px; }
</style>
