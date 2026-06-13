<template>
  <view class="min-h-screen bg-background">
    <!-- ============ 加载状态 ============ -->
    <view v-if="loading" class="min-h-screen bg-background">
      <view class="sticky top-0 z-10 bg-background border-b border-border">
        <view class="flex items-center h-14 px-4">
          <view class="w-10"><text class="text-xl text-foreground">&#8592;</text></view>
          <view class="flex-1 h-4 rounded bg-[#E8E0D5] mx-4"></view>
          <view class="w-10"></view>
        </view>
      </view>
      <view class="p-4 space-y-4">
        <view class="bg-white rounded-2xl p-4 space-y-4">
          <view class="flex items-center gap-4">
            <view class="w-16 h-16 rounded-2xl bg-secondary animate-pulse"></view>
            <view class="flex-1 space-y-2">
              <view class="h-5 w-40 rounded bg-secondary animate-pulse"></view>
              <view class="h-4 w-24 rounded bg-secondary animate-pulse"></view>
            </view>
          </view>
          <view class="flex gap-3">
            <view v-for="i in 6" :key="i" class="flex flex-col items-center w-12 gap-1">
              <view class="w-12 h-12 rounded-full bg-secondary animate-pulse"></view>
              <view class="h-3 w-10 rounded bg-secondary animate-pulse"></view>
            </view>
          </view>
        </view>
        <view class="bg-white rounded-2xl p-4 space-y-2">
          <view class="h-4 w-16 rounded bg-secondary animate-pulse"></view>
          <view class="h-4 w-full rounded bg-secondary animate-pulse"></view>
          <view class="h-4 w-3/4 rounded bg-secondary animate-pulse"></view>
        </view>
        <view class="bg-white rounded-2xl divide-y divide-[#FAF8F5]">
          <view v-for="i in 3" :key="i" class="flex items-center justify-between p-4">
            <view class="h-4 w-24 rounded bg-secondary animate-pulse"></view>
            <view class="h-5 w-10 rounded-full bg-secondary animate-pulse"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- ============ 错误/空状态 ============ -->
    <view v-else-if="error || !group" class="min-h-screen bg-background flex flex-col items-center justify-center py-20">
      <text class="text-5xl block mb-4">😕</text>
      <text class="text-muted-foreground text-sm mb-6">{{ error || '暂无群聊信息' }}</text>
      <view @click="loadData" class="px-8 py-2.5 bg-primary text-white rounded-full text-sm">重新加载</view>
    </view>

    <!-- ============ 主内容 ============ -->
    <template v-else>
      <view class="min-h-screen bg-background">
        <!-- 导航栏 -->
        <view class="sticky top-0 z-10 bg-background border-b border-border">
          <view class="flex items-center h-14 px-4">
            <view @click="goBack" class="p-1 -ml-1">
              <text class="text-xl text-foreground">&#8592;</text>
            </view>
            <text class="flex-1 text-center font-medium text-foreground">群聊设置</text>
            <view class="w-10"></view>
          </view>
        </view>

        <view class="p-4 space-y-4">
          <!-- ===== 群基本信息 ===== -->
          <view class="bg-white rounded-2xl p-4 space-y-4">
            <!-- 群头像和名称 -->
            <view class="flex items-center gap-4">
              <view class="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center text-white text-2xl flex-shrink-0">
                <image v-if="group.avatar" :src="group.avatar" mode="aspectFill" class="w-full h-full" />
                <text v-else>{{ group.name[0] }}</text>
              </view>
              <view class="flex-1 min-w-0">
                <view class="flex items-center gap-2">
                  <text class="font-semibold text-lg text-foreground truncate block">{{ group.name }}</text>
                  <view v-if="permissions?.canUpdateNotice" class="h-6 w-6 flex items-center justify-center">
                    <text class="text-sm text-muted-foreground">&#9998;</text>
                  </view>
                </view>
                <view class="flex items-center gap-2 mt-1">
                  <text class="text-sm text-muted-foreground">群号: {{ group.id }}</text>
                  <view @click="handleCopyGroupId" class="inline-flex">
                    <text class="text-xs text-muted-foreground">&#128203;</text>
                  </view>
                </view>
              </view>
              <view @click="handleShowQrcode" class="w-10 h-10 rounded-xl border border-border flex items-center justify-center flex-shrink-0">
                <text class="text-lg">&#128241;</text>
              </view>
            </view>

            <!-- 群成员 -->
            <view>
              <view class="flex items-center justify-between mb-3">
                <text class="text-sm font-medium text-foreground">群成员 ({{ group.memberCount }}人)</text>
                <view @click="showAllMembers = true" class="flex items-center text-sm text-primary">
                  <text>查看全部</text>
                  <text class="ml-1">&#8250;</text>
                </view>
              </view>
              <view class="flex flex-wrap gap-3">
                <view
                  v-for="member in members.slice(0, 8)"
                  :key="member.id"
                  class="flex flex-col items-center w-12"
                  @click="handleMemberClick(member)"
                >
                  <view class="relative">
                    <view class="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center text-white text-sm">
                      <image v-if="member.avatar" :src="member.avatar" mode="aspectFill" class="w-full h-full" />
                      <text v-else>{{ member.nickname[0] }}</text>
                    </view>
                    <view v-if="member.role !== 'member'" class="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5">
                      <text class="text-xs">{{ getRoleIcon(member.role) }}</text>
                    </view>
                  </view>
                  <text class="text-xs text-muted-foreground mt-1 truncate w-full text-center block">{{ member.remark || member.nickname }}</text>
                </view>
                <!-- 邀请按钮 -->
                <view v-if="permissions?.canInvite" @click="goToInvite" class="flex flex-col items-center w-12">
                  <view class="w-12 h-12 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                    <text class="text-base text-muted-foreground">&#10133;</text>
                  </view>
                  <text class="text-xs text-muted-foreground mt-1 block">邀请</text>
                </view>
              </view>
            </view>
          </view>

          <!-- ===== 群公告 ===== -->
          <view v-if="group.noticeDetail" class="bg-white rounded-2xl p-4">
            <view class="flex items-center justify-between mb-2">
              <text class="text-sm font-medium text-foreground">群公告</text>
              <view v-if="permissions?.canUpdateNotice" class="text-sm text-primary">编辑</view>
            </view>
            <text class="text-sm text-ink-soft whitespace-pre-wrap leading-relaxed block">{{ group.noticeDetail.content }}</text>
            <view class="text-xs text-muted-foreground mt-2">
              <text>{{ group.noticeDetail.publisher }} 发布于 {{ group.noticeDetail.publishedAt }}</text>
            </view>
          </view>

          <!-- ===== 我的设置 ===== -->
          <view class="bg-white rounded-2xl">
            <!-- 我的群昵称 -->
            <view class="flex items-center justify-between p-4 border-b border-[#FAF8F5]">
              <text class="text-sm text-foreground">我在本群的昵称</text>
              <template v-if="editingNickname">
                <view class="flex items-center gap-2">
                  <input
                    v-model="nicknameInput"
                    class="w-32 h-8 text-sm border border-border rounded-lg px-2 text-foreground"
                    placeholder="请输入昵称"
                    maxlength="20"
                  />
                  <view @click="handleSaveNickname" class="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                    <text class="text-white text-sm">&#10003;</text>
                  </view>
                  <view @click="editingNickname = false" class="h-8 w-8 border border-border rounded-lg flex items-center justify-center">
                    <text class="text-muted-foreground text-sm">&#10005;</text>
                  </view>
                </view>
              </template>
              <template v-else>
                <view @click="startEditNickname" class="flex items-center text-sm text-muted-foreground">
                  <text>{{ settings?.myNickname || '未设置' }}</text>
                  <text class="ml-1">&#8250;</text>
                </view>
              </template>
            </view>

            <!-- 消息免打扰 -->
            <view class="flex items-center justify-between p-4 border-b border-[#FAF8F5]">
              <view class="flex items-center gap-3">
                <text class="text-lg">{{ settings?.isMuted ? '&#128276;' : '&#128276;' }}</text>
                <text class="text-sm text-foreground">消息免打扰</text>
              </view>
              <switch color="#C41E3A" :checked="settings?.isMuted || false" @change="toggleMute" />
            </view>

            <!-- 置顶聊天 -->
            <view class="flex items-center justify-between p-4">
              <view class="flex items-center gap-3">
                <text class="text-lg">{{ settings?.isPinned ? '&#128204;' : '&#128204;' }}</text>
                <text class="text-sm text-foreground">置顶聊天</text>
              </view>
              <switch color="#C41E3A" :checked="settings?.isPinned || false" @change="togglePin" />
            </view>
          </view>

          <!-- ===== 退出/解散群聊 ===== -->
          <view class="bg-white rounded-2xl">
            <view
              v-if="group.myRole === 'owner'"
              @click="showDismissConfirm = true"
              class="flex items-center justify-center w-full h-12 text-red-500"
            >
              <text class="mr-2">&#128465;</text>
              <text class="text-sm">解散群聊</text>
            </view>
            <view
              v-else
              @click="showQuitConfirm = true"
              class="flex items-center justify-center w-full h-12 text-red-500"
            >
              <text class="mr-2">&#128682;</text>
              <text class="text-sm">退出群聊</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ============ 全部成员抽屉 ============ -->
      <view v-if="showAllMembers" class="fixed inset-0 z-50 bg-black/40" @click="showAllMembers = false">
        <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh]" @click.stop>
          <view class="flex items-center justify-between p-4 border-b border-border">
            <text class="font-medium text-foreground">群成员 ({{ members.length }})</text>
            <text @click="showAllMembers = false" class="text-lg text-muted-foreground">&#10005;</text>
          </view>
          <view class="overflow-y-auto" :style="{ maxHeight: 'calc(70vh - 60px)' }">
            <view
              v-for="member in members"
              :key="member.id"
              class="flex items-center justify-between p-4 border-b border-[#FAF8F5]"
            >
              <view class="flex items-center gap-3 flex-1 min-w-0">
                <view class="relative">
                  <view class="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center text-white text-sm">
                    <image v-if="member.avatar" :src="member.avatar" mode="aspectFill" class="w-full h-full" />
                    <text v-else>{{ member.nickname[0] }}</text>
                  </view>
                </view>
                <view class="flex-1 min-w-0">
                  <view class="flex items-center gap-2">
                    <text class="text-sm font-medium text-foreground truncate block">{{ member.remark || member.nickname }}</text>
                    <text v-if="member.role !== 'member'" class="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex-shrink-0">{{ getGroupRoleName(member.role) }}</text>
                  </view>
                  <text v-if="member.remark" class="text-xs text-muted-foreground block">{{ member.nickname }}</text>
                </view>
              </view>
              <!-- 成员管理按钮 -->
              <view
                v-if="member.id !== 0 && permissions && (permissions.canRemoveMember || permissions.canSetAdmin) && member.role !== 'owner'"
                @click.stop="handleMoreActions(member)"
                class="h-8 w-8 flex items-center justify-center flex-shrink-0"
              >
                <text class="text-muted-foreground text-lg">&#8942;</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- ============ 成员操作菜单 ============ -->
      <view v-if="showMemberActions && actionMember" class="fixed inset-0 z-50 bg-black/40" @click="closeMemberActions">
        <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl" @click.stop>
          <view class="py-2">
            <view
              v-if="permissions?.canSetAdmin && actionMember.role !== 'owner'"
              @click="handleToggleAdmin(actionMember)"
              class="flex items-center gap-3 px-4 py-3.5 border-b border-[#FAF8F5]"
            >
              <text class="text-base w-5 text-center">&#9937;</text>
              <text class="text-sm text-foreground">{{ actionMember.role === 'admin' ? '取消管理员' : '设为管理员' }}</text>
            </view>
            <view
              v-if="permissions?.canTransfer && actionMember.role !== 'owner'"
              @click="confirmTransfer(actionMember)"
              class="flex items-center gap-3 px-4 py-3.5 border-b border-[#FAF8F5]"
            >
              <text class="text-base w-5 text-center">&#128081;</text>
              <text class="text-sm text-foreground">转让群主</text>
            </view>
            <view
              v-if="permissions?.canRemoveMember && actionMember.role !== 'owner'"
              @click="confirmRemove(actionMember)"
              class="flex items-center gap-3 px-4 py-3.5"
            >
              <text class="text-base w-5 text-center">&#128465;</text>
              <text class="text-sm text-red-500">移除成员</text>
            </view>
          </view>
          <view @click="closeMemberActions" class="border-t border-border py-3.5 text-center">
            <text class="text-sm text-muted-foreground">取消</text>
          </view>
        </view>
      </view>

      <!-- ============ 群二维码弹窗 ============ -->
      <view v-if="showQrcode" class="fixed inset-0 z-50 bg-black/40" @click="showQrcode = false">
        <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl px-8 py-6 flex flex-col items-center" @click.stop>
          <view class="w-full text-center mb-4">
            <text class="font-medium text-foreground">群二维码</text>
          </view>
          <view class="w-48 h-48 bg-white rounded-xl p-4 shadow-lg border border-border">
            <view class="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center rounded-lg">
              <text class="text-6xl">&#128241;</text>
            </view>
          </view>
          <text class="text-sm text-muted-foreground mt-4">扫一扫，加入群聊</text>
          <text class="text-xs text-muted-foreground mt-1">二维码7天内有效</text>
        </view>
      </view>

      <!-- ============ 退出确认弹窗 ============ -->
      <view v-if="showQuitConfirm" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6" @click="showQuitConfirm = false">
        <view class="bg-white rounded-2xl w-full max-w-sm p-6" @click.stop>
          <text class="text-lg font-semibold text-foreground block mb-2">退出群聊</text>
          <text class="text-sm text-ink-soft block mb-6 leading-relaxed">确定要退出群聊「{{ group.name }}」吗？退出后将不再接收此群消息。</text>
          <view class="flex items-center gap-3">
            <view @click="showQuitConfirm = false" class="flex-1 h-11 rounded-xl border border-border flex items-center justify-center">
              <text class="text-sm text-foreground">取消</text>
            </view>
            <view @click="handleQuit" class="flex-1 h-11 rounded-xl bg-red-500 flex items-center justify-center">
              <text class="text-sm text-white">退出</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ============ 解散确认弹窗 ============ -->
      <view v-if="showDismissConfirm" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6" @click="showDismissConfirm = false">
        <view class="bg-white rounded-2xl w-full max-w-sm p-6" @click.stop>
          <text class="text-lg font-semibold text-foreground block mb-2">解散群聊</text>
          <text class="text-sm text-ink-soft block mb-6 leading-relaxed">确定要解散群聊「{{ group.name }}」吗？解散后所有成员将被移出，此操作不可撤销。</text>
          <view class="flex items-center gap-3">
            <view @click="showDismissConfirm = false" class="flex-1 h-11 rounded-xl border border-border flex items-center justify-center">
              <text class="text-sm text-foreground">取消</text>
            </view>
            <view @click="handleDismiss" class="flex-1 h-11 rounded-xl bg-red-500 flex items-center justify-center">
              <text class="text-sm text-white">解散</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ============ 转让确认弹窗 ============ -->
      <view v-if="showTransferConfirm && actionMember" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6" @click="showTransferConfirm = false">
        <view class="bg-white rounded-2xl w-full max-w-sm p-6" @click.stop>
          <text class="text-lg font-semibold text-foreground block mb-2">转让群主</text>
          <text class="text-sm text-ink-soft block mb-6 leading-relaxed">确定要将群主转让给「{{ actionMember.nickname }}」吗？转让后您将成为普通成员。</text>
          <view class="flex items-center gap-3">
            <view @click="showTransferConfirm = false" class="flex-1 h-11 rounded-xl border border-border flex items-center justify-center">
              <text class="text-sm text-foreground">取消</text>
            </view>
            <view @click="handleTransfer" class="flex-1 h-11 rounded-xl bg-primary flex items-center justify-center">
              <text class="text-sm text-white">确认转让</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ============ 移除确认弹窗 ============ -->
      <view v-if="showRemoveConfirm && actionMember" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6" @click="showRemoveConfirm = false">
        <view class="bg-white rounded-2xl w-full max-w-sm p-6" @click.stop>
          <text class="text-lg font-semibold text-foreground block mb-2">移除成员</text>
          <text class="text-sm text-ink-soft block mb-6 leading-relaxed">确定要将「{{ actionMember.nickname }}」移出群聊吗？</text>
          <view class="flex items-center gap-3">
            <view @click="showRemoveConfirm = false" class="flex-1 h-11 rounded-xl border border-border flex items-center justify-center">
              <text class="text-sm text-foreground">取消</text>
            </view>
            <view @click="handleRemoveMember" class="flex-1 h-11 rounded-xl bg-red-500 flex items-center justify-center">
              <text class="text-sm text-white">移除</text>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// ============================================================
// 类型定义
// ============================================================
interface GroupNoticeDetail {
  content: string
  publisher: string
  publishedAt: string
}

interface GroupDetail {
  id: number
  name: string
  avatar: string
  memberCount: number
  myRole: 'owner' | 'admin' | 'member'
  noticeDetail: GroupNoticeDetail | null
}

interface GroupSettings {
  isMuted: boolean
  isPinned: boolean
  myNickname: string
}

interface GroupMember {
  id: number
  nickname: string
  avatar: string
  role: 'owner' | 'admin' | 'member'
  remark: string
}

interface GroupPermissions {
  canUpdateNotice: boolean
  canInvite: boolean
  canRemoveMember: boolean
  canSetAdmin: boolean
  canTransfer: boolean
}

// ============================================================
// Mock 数据
// ============================================================
const mockGroup: GroupDetail = {
  id: 10086,
  name: '国学堂交流群',
  avatar: '',
  memberCount: 128,
  myRole: 'member',
  noticeDetail: {
    content: '欢迎加入国学堂交流群，请遵守群规，文明交流，禁止广告和无关链接。违规者将被移出群聊。',
    publisher: '群主',
    publishedAt: '2024-01-15',
  },
}

const mockSettings: GroupSettings = {
  isMuted: false,
  isPinned: false,
  myNickname: '',
}

const mockMembers: GroupMember[] = [
  { id: 1, nickname: '周易大师', avatar: '', role: 'owner', remark: '群主' },
  { id: 2, nickname: '张玄风', avatar: '', role: 'admin', remark: '' },
  { id: 3, nickname: '李玄机', avatar: '', role: 'admin', remark: '' },
  { id: 4, nickname: '王德华', avatar: '', role: 'member', remark: '' },
  { id: 5, nickname: '林奇门', avatar: '', role: 'member', remark: '' },
  { id: 6, nickname: '陈梅花', avatar: '', role: 'member', remark: '' },
  { id: 7, nickname: '易学新人', avatar: '', role: 'member', remark: '' },
  { id: 8, nickname: '风水小白', avatar: '', role: 'member', remark: '' },
  { id: 9, nickname: '命理初学', avatar: '', role: 'member', remark: '' },
  { id: 10, nickname: '国学传承', avatar: '', role: 'member', remark: '' },
  { id: 11, nickname: '紫微门人', avatar: '', role: 'member', remark: '' },
  { id: 12, nickname: '占卜达人', avatar: '', role: 'member', remark: '' },
]

// ============================================================
// 状态
// ============================================================
const loading = ref(true)
const error = ref<string | null>(null)
const group = ref<GroupDetail | null>(null)
const settings = ref<GroupSettings | null>(null)
const members = ref<GroupMember[]>([])
const permissions = ref<GroupPermissions | null>(null)

// 编辑昵称
const editingNickname = ref(false)
const nicknameInput = ref('')

// 成员管理
const showAllMembers = ref(false)
const actionMember = ref<GroupMember | null>(null)
const showMemberActions = ref(false)

// 确认弹窗
const showQuitConfirm = ref(false)
const showDismissConfirm = ref(false)
const showTransferConfirm = ref(false)
const showRemoveConfirm = ref(false)

// 二维码
const showQrcode = ref(false)

let loadTimer: ReturnType<typeof setTimeout> | null = null

// ============================================================
// 权限辅助
// ============================================================
function getGroupPermissions(role: string): GroupPermissions {
  if (role === 'owner') {
    return { canUpdateNotice: true, canInvite: true, canRemoveMember: true, canSetAdmin: true, canTransfer: false }
  }
  if (role === 'admin') {
    return { canUpdateNotice: true, canInvite: true, canRemoveMember: true, canSetAdmin: false, canTransfer: false }
  }
  return { canUpdateNotice: false, canInvite: false, canRemoveMember: false, canSetAdmin: false, canTransfer: false }
}

function getRoleIcon(role: string): string {
  if (role === 'owner') return '\u{1F451}'
  if (role === 'admin') return '\u{26E8}'
  return ''
}

function getGroupRoleName(role: string): string {
  return role === 'owner' ? '群主' : role === 'admin' ? '管理员' : '成员'
}

// ============================================================
// 数据加载
// ============================================================
function loadData() {
  loading.value = true
  error.value = null
  if (loadTimer) clearTimeout(loadTimer)
  loadTimer = setTimeout(() => {
    try {
      group.value = { ...mockGroup }
      settings.value = { ...mockSettings }
      members.value = mockMembers.map((m) => ({ ...m }))
      permissions.value = getGroupPermissions(mockGroup.myRole)
      nicknameInput.value = mockSettings.myNickname
    } catch {
      error.value = '加载失败'
    } finally {
      loading.value = false
    }
  }, 600)
}

onMounted(() => {
  loadData()
})

onUnmounted(() => {
  if (loadTimer) clearTimeout(loadTimer)
})

// ============================================================
// 事件处理
// ============================================================
function goBack() {
  uni.navigateBack()
}

function goToInvite() {
  uni.navigateTo({ url: '/pages/im/invite-members/index?groupId=' + group.value?.id })
}

function handleCopyGroupId() {
  uni.setClipboardData({
    data: String(group.value?.id ?? ''),
    success: () => {
      uni.showToast({ title: '群号已复制', icon: 'success' })
    },
  })
}

function startEditNickname() {
  nicknameInput.value = settings.value?.myNickname || ''
  editingNickname.value = true
}

function handleSaveNickname() {
  if (settings.value) {
    settings.value.myNickname = nicknameInput.value
  }
  editingNickname.value = false
  uni.showToast({ title: '昵称已更新', icon: 'success' })
}

function toggleMute() {
  if (!settings.value) return
  settings.value.isMuted = !settings.value.isMuted
  uni.showToast({ title: settings.value.isMuted ? '已开启消息免打扰' : '已关闭消息免打扰', icon: 'success' })
}

function togglePin() {
  if (!settings.value) return
  settings.value.isPinned = !settings.value.isPinned
  uni.showToast({ title: settings.value.isPinned ? '已置顶' : '已取消置顶', icon: 'success' })
}

function handleMemberClick(member: GroupMember) {
  actionMember.value = member
  showMemberActions.value = true
}

function handleMoreActions(member: GroupMember) {
  actionMember.value = member
  showMemberActions.value = true
}

function closeMemberActions() {
  showMemberActions.value = false
  actionMember.value = null
}

function handleToggleAdmin(member: GroupMember) {
  const isCurrentlyAdmin = member.role === 'admin'
  members.value = members.value.map((m) =>
    m.id === member.id ? { ...m, role: isCurrentlyAdmin ? 'member' as const : 'admin' as const } : m,
  )
  uni.showToast({ title: isCurrentlyAdmin ? '已取消管理员' : '已设为管理员', icon: 'success' })
  closeMemberActions()
}

function confirmTransfer(member: GroupMember) {
  actionMember.value = member
  showMemberActions.value = false
  showTransferConfirm.value = true
}

function confirmRemove(member: GroupMember) {
  actionMember.value = member
  showMemberActions.value = false
  showRemoveConfirm.value = true
}

function handleQuit() {
  showQuitConfirm.value = false
  uni.showToast({ title: '已退出群聊', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 800)
}

function handleDismiss() {
  showDismissConfirm.value = false
  uni.showToast({ title: '群聊已解散', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 800)
}

function handleTransfer() {
  if (!actionMember.value) return
  showTransferConfirm.value = false
  uni.showToast({ title: '群主已转让', icon: 'success' })
  actionMember.value = null
  loadData()
}

function handleRemoveMember() {
  if (!actionMember.value) return
  members.value = members.value.filter((m) => m.id !== actionMember.value!.id)
  showRemoveConfirm.value = false
  uni.showToast({ title: '已移除成员', icon: 'success' })
  actionMember.value = null
}

function handleShowQrcode() {
  showQrcode.value = true
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
