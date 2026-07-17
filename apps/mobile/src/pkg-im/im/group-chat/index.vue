<template>
  <view v-if="loading" class="load-state"><text class="load-state-text">加载中...</text></view>
  <view v-else-if="error" class="load-state">
    <text class="load-state-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <view v-else class="page">
    <!-- 导航栏 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left">
        <view class="icon-btn" @tap="goBack">
          <AppIcon name="arrow-left" :size="20" color="#2c2c2c" />
        </view>
        <view class="group-text">
          <text class="group-name">{{ groupDetail.name }}</text>
          <text class="group-status">{{ groupDetail.memberCount }}人</text>
        </view>
      </view>
      <view class="icon-btn" @tap="showMembersSheet = true">
        <AppIcon name="more-vertical" :size="20" color="#2c2c2c" />
      </view>
    </view>

    <!-- 群公告 -->
    <view v-if="groupDetail.notice" class="notice-bar" @tap="showNoticeSheet = true">
      <AppIcon name="bell" :size="16" color="#d97706" />
      <text class="notice-text">{{ groupDetail.notice }}</text>
      <AppIcon name="chevron-right" :size="16" color="#d97706" />
    </view>

    <!-- 消息列表（scrollAnchor 清空再置回触发重新滚底，常量不会重触发） -->
    <scroll-view class="msg-scroll" scroll-y :scroll-into-view="scrollAnchor">
      <view class="msg-list">
        <view v-for="(message, index) in messages" :key="message.id">
          <!-- 时间标签 -->
          <view v-if="showTime(message, messages[index - 1])" class="time-label-row">
            <text class="time-label">{{ formatMessageTime(message.timestamp) }}</text>
          </view>

          <!-- 撤回提示 -->
          <view v-if="message.isWithdrawn" class="withdraw-row">
            <text class="withdraw-text">{{ isMine(message) ? '你' : message.senderName }}撤回了一条消息</text>
          </view>

          <!-- 消息气泡 -->
          <view v-else class="msg-row" :class="{ 'msg-mine': isMine(message) }">
            <view v-if="!isMine(message)" class="avatar-wrap">
              <image lazy-load class="msg-avatar" :src="message.senderAvatar" mode="aspectFill" />
              <view v-if="message.senderRole === 'owner'" class="role-badge role-owner">
                <AppIcon name="crown" :size="12" color="#f59e0b" />
              </view>
              <view v-else-if="message.senderRole === 'admin'" class="role-badge role-admin">
                <AppIcon name="shield" :size="12" color="#3b82f6" />
              </view>
            </view>

            <view class="msg-content" :class="{ 'msg-content-mine': isMine(message) }">
              <!-- 发送者名称 -->
              <text v-if="!isMine(message)" class="sender-name">
                {{ message.senderName }}<text v-if="message.senderRole && message.senderRole !== 'member'" class="sender-role">（{{ getGroupRoleName(message.senderRole) }}）</text>
              </text>

              <view
                class="bubble"
                :class="isMine(message) ? 'bubble-mine' : 'bubble-other'"
                @longpress="openMessageMenu(message)"
              >
                <!-- 文字 -->
                <text v-if="message.type === 'text'" class="bubble-text" :class="{ 'bubble-text-mine': isMine(message) }">
                  <text v-if="message.atAll" class="at-text">@所有人 </text>{{ message.content }}
                </text>
                <!-- 图片 -->
                <image lazy-load v-else-if="message.type === 'image'" class="bubble-image" :src="message.image?.url" mode="widthFix" />
                <!-- 语音 -->
                <view v-else-if="message.type === 'voice'" class="voice-row">
                  <AppIcon name="mic" :size="16" :color="isMine(message) ? '#ffffff' : '#2c2c2c'" />
                  <text class="voice-dur" :class="{ 'bubble-text-mine': isMine(message) }">{{ message.voice?.duration }}″</text>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view id="msg-end" />
      </view>
    </scroll-view>

    <!-- @成员列表 -->
    <view v-if="showAtList" class="at-panel">
      <view class="at-search">
        <input class="at-input" :value="atSearchKeyword" placeholder="搜索成员..." placeholder-class="at-input-ph" @input="onAtSearch" />
      </view>
      <scroll-view class="at-scroll" scroll-y>
        <view v-if="canAtAll" class="at-item" @tap="handleAtAll">
          <view class="at-all-icon"><AppIcon name="users" :size="20" color="#c41e3a" /></view>
          <text class="at-name at-name-bold">@所有人</text>
        </view>
        <view v-for="member in atSearchResults" :key="member.id" class="at-item" @tap="handleSelectAtMember(member)">
          <image lazy-load class="at-avatar" :src="member.avatar" mode="aspectFill" />
          <view class="at-info">
            <text class="at-name">{{ member.remark || member.nickname }}</text>
            <text v-if="member.role !== 'member'" class="at-role">{{ getGroupRoleName(member.role) }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部输入区 -->
    <view class="input-area">
      <view class="input-row">
        <view class="icon-btn" @tap="toggleMorePanel">
          <AppIcon name="plus" :size="20" :color="showMorePanel ? '#c41e3a' : '#2c2c2c'" :style="showMorePanel ? 'transform:rotate(45deg)' : ''" />
        </view>
        <view class="input-wrap">
          <input
            class="msg-input"
            :value="inputText"
            placeholder="发送消息..."
            placeholder-class="msg-input-ph"
            confirm-type="send"
            @input="onInput"
            @confirm="handleSend"
          />
        </view>
        <!-- 语音消息未实现：空输入时不再展示无响应的话筒占位按钮 -->
        <view v-if="inputText.trim()" class="send-btn" :class="{ 'send-btn-disabled': submitting }" @tap="handleSend">
          <AppIcon name="send" :size="20" color="#ffffff" />
        </view>
      </view>

      <!-- 更多功能面板（相册/拍照/语音未实现已隐藏，只保留已实现的 @成员） -->
      <view v-if="showMorePanel" class="more-panel">
        <view class="more-item" @tap="openAtFromPanel">
          <view class="more-icon"><AppIcon name="at-sign" :size="20" color="#9333ea" /></view>
          <text class="more-label">@成员</text>
        </view>
      </view>
    </view>

    <!-- 消息操作菜单 -->
    <view v-if="selectedMessage" class="menu-mask" @tap="selectedMessage = null">
      <view class="menu-pop" @tap.stop>
        <view v-if="selectedMessage.type === 'text'" class="menu-btn" @tap="handleCopy(selectedMessage.content)">
          <AppIcon name="copy" :size="20" color="#2c2c2c" />
          <text class="menu-label">复制</text>
        </view>
      </view>
    </view>

    <!-- 群成员侧边栏 -->
    <view v-if="showMembersSheet" class="sheet-mask" @tap="showMembersSheet = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-header">
          <text class="sheet-title">群聊信息</text>
          <view class="icon-btn" @tap="showMembersSheet = false"><AppIcon name="x" :size="20" color="#2c2c2c" /></view>
        </view>
        <scroll-view class="sheet-body" scroll-y>
          <view class="sheet-group-info">
            <image lazy-load class="sheet-group-avatar" :src="groupDetail.avatar" mode="aspectFill" />
            <view class="sheet-group-text">
              <text class="sheet-group-name">{{ groupDetail.name }}</text>
              <text class="sheet-group-count">{{ groupDetail.memberCount }}人</text>
            </view>
          </view>

          <view class="sheet-section">
            <view class="sheet-section-head">
              <text class="sheet-section-label">群成员</text>
              <text class="sheet-section-more" @tap="openGroupDetail">查看全部 ></text>
            </view>
            <view class="member-grid">
              <view v-for="member in members.slice(0, 10)" :key="member.id" class="member-cell">
                <view class="avatar-wrap">
                  <image lazy-load class="member-avatar" :src="member.avatar" mode="aspectFill" />
                  <view v-if="member.role === 'owner'" class="role-badge role-owner">
                    <AppIcon name="crown" :size="12" color="#f59e0b" />
                  </view>
                  <view v-else-if="member.role === 'admin'" class="role-badge role-admin">
                    <AppIcon name="shield" :size="12" color="#3b82f6" />
                  </view>
                </view>
                <text class="member-name">{{ member.nickname }}</text>
              </view>
            </view>
          </view>

          <view v-if="groupDetail.notice" class="sheet-section" @tap="openNoticeFromMembers">
            <view class="sheet-section-head">
              <text class="sheet-section-label">群公告</text>
              <AppIcon name="chevron-right" :size="16" color="#8a8178" />
            </view>
            <text class="sheet-notice-text">{{ groupDetail.notice }}</text>
          </view>

          <view class="sheet-section sheet-row">
            <text class="sheet-section-label">我在本群的身份</text>
            <text class="sheet-row-value">{{ getGroupRoleName(groupDetail.myRole) }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 群公告详情 -->
    <view v-if="showNoticeSheet" class="sheet-mask" @tap="showNoticeSheet = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-header">
          <text class="sheet-title">群公告</text>
          <view class="icon-btn" @tap="showNoticeSheet = false"><AppIcon name="x" :size="20" color="#2c2c2c" /></view>
        </view>
        <scroll-view class="sheet-body" scroll-y>
          <view v-if="groupDetail.noticeDetail" class="notice-detail">
            <view class="notice-meta">
              <text class="notice-publisher">{{ groupDetail.noticeDetail.publisher }}</text>
              <text class="notice-date">发布于 {{ groupDetail.noticeDetail.publishedAt }}</text>
            </view>
            <text class="notice-content">{{ groupDetail.noticeDetail.content }}</text>
          </view>
          <text v-else class="notice-empty">暂无群公告</text>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  imApi,
  searchGroupMembersForAt,
  getGroupRoleName,
  timToGroupChatMessage,
  formatMessageTime,
  shouldShowTimeLabel,
  type GroupChatMessage,
  type GroupMember,
  type GroupRole,
} from '@/lib/im-data'
import { useTim } from '@/composables/useTim'

// 兼容双入参：?groupId=（直连完整路径）与 ?id=（utils/router /im/group-chat/:id 映射为 id）
const props = defineProps<{ groupId?: string; id?: string }>()
const gid = computed(() => props.groupId || props.id || '')

const statusBarHeight = ref(0)
const tim = useTim()

// 数据状态
// groupDetail 为详情对象，模板裸访问多个字段（name/notice/memberCount/myRole/noticeDetail 等），收敛 any 会触发大量字段/null 报错，保留 any
const groupDetail = ref<any>({})
const members = ref<GroupMember[]>([])
const messages = ref<GroupChatMessage[]>([])
const loading = ref(true)
const error = ref('')
const submitting = ref(false)

// UI 临时状态
const inputText = ref('')
const showMorePanel = ref(false)
const showMembersSheet = ref(false)
const showNoticeSheet = ref(false)
const showAtList = ref(false)
const atSearchKeyword = ref('')
const selectedAtMembers = ref<string[]>([])
const selectedMessage = ref<GroupChatMessage | null>(null)

// scroll-into-view 需变化才触发滚动：清空一帧再置回锚点值，实现"新消息自动滚底"
const scrollAnchor = ref('msg-end')
async function scrollToBottom() {
  scrollAnchor.value = ''
  await nextTick()
  scrollAnchor.value = 'msg-end'
}

let unsubscribe: (() => void) | null = null

// userID → 角色映射（用于给消息气泡补齐发送者角色徽标）
const roleMap = computed(() => {
  const m = new Map<string, GroupRole>()
  members.value.forEach((x) => m.set(x.id, x.role))
  return m
})
function enrichRole(m: GroupChatMessage): GroupChatMessage {
  if (!m.senderRole) m.senderRole = roleMap.value.get(m.senderId)
  return m
}

async function loadData() {
  loading.value = true
  error.value = ''
  if (!gid.value) {
    error.value = '未指定群聊'
    loading.value = false
    return
  }
  try {
    // 登录 TIM（user-sig + account import + login）→ 并行拉群资料/成员/历史
    await tim.ensureLogin()
    const [detail, memberList, history] = await Promise.all([
      imApi.getGroupDetail(gid.value),
      imApi.getGroupMembers(gid.value),
      imApi.getGroupChatHistory(gid.value),
    ])
    groupDetail.value = detail
    members.value = memberList
    messages.value = history.messages.map(enrichRole)
    await imApi.markGroupRead(gid.value)
  } catch (e) {
    error.value = (e as Error)?.message || '加载群聊数据失败，请重试'
    loading.value = false
    return
  }
  // 订阅实时新消息（仅本群 GROUP{gid}）
  unsubscribe = tim.onMessage((msgs) => {
    const mine = msgs.filter((m) => m.conversationID === `GROUP${gid.value}`)
    if (!mine.length) return
    messages.value.push(...mine.map(timToGroupChatMessage).map(enrichRole))
    imApi.markGroupRead(gid.value)
    scrollToBottom()
  })
  loading.value = false
}

onMounted(() => {
  loadData()
})
onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

const canAtAll = computed(() => groupDetail.value.myRole === 'owner' || groupDetail.value.myRole === 'admin')
const atSearchResults = computed(() => searchGroupMembersForAt(members.value, atSearchKeyword.value))

function isMine(m: GroupChatMessage) {
  return !!m.isSelf
}
function showTime(m: GroupChatMessage, prev?: GroupChatMessage) {
  return shouldShowTimeLabel(m.timestamp, prev?.timestamp)
}

// 绑定到 uni <input>，vue-tsc 按原生 input 事件签名校验，保留 any
function onInput(e: any) {
  const val = e.detail.value
  inputText.value = val
  if (val.endsWith('@')) showAtList.value = true
}
// 同上，绑定到 uni <input>，保留 any
function onAtSearch(e: any) {
  atSearchKeyword.value = e.detail.value
}
function toggleMorePanel() {
  showMorePanel.value = !showMorePanel.value
}
function openAtFromPanel() {
  showMorePanel.value = false
  showAtList.value = true
}
function openNoticeFromMembers() {
  showMembersSheet.value = false
  showNoticeSheet.value = true
}
/** 群成员"查看全部" → 群聊设置页（DYNAMIC_ROUTES /im/group-detail/:id → pkg-im/im/group-detail，onLoad 收 id） */
function openGroupDetail() {
  showMembersSheet.value = false
  navigateTo(`/im/group-detail/${gid.value}`)
}

function handleSelectAtMember(member: GroupMember) {
  if (!selectedAtMembers.value.includes(member.id)) {
    selectedAtMembers.value.push(member.id)
    inputText.value += `@${member.nickname} `
  }
  showAtList.value = false
  atSearchKeyword.value = ''
}
function handleAtAll() {
  inputText.value += '@所有人 '
  showAtList.value = false
}

function openMessageMenu(m: GroupChatMessage) {
  if (m.isWithdrawn) return
  selectedMessage.value = m
}
function handleCopy(content: string) {
  uni.setClipboardData({ data: content, success: () => toast('已复制') })
  selectedMessage.value = null
}

function toast(title: string) {
  uni.showToast({ title, icon: 'none' })
}

// 发送群消息：走 TIM SDK sendMessage（实时下发群内成员）
async function handleSend() {
  if (submitting.value) return
  const content = inputText.value.trim()
  if (!content) return
  inputText.value = ''
  submitting.value = true
  try {
    const msg = await imApi.sendGroupMessage(gid.value, content)
    messages.value.push(enrichRole(msg))
    scrollToBottom()
  } catch (e) {
    inputText.value = content // 发送失败回填输入框
    toast((e as Error)?.message || '发送失败，请重试')
  } finally {
    submitting.value = false
  }
  selectedAtMembers.value = []
  showMorePanel.value = false
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: rgba(242, 236, 225, 0.3);
}

/* 导航栏 */
.navbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16rpx 0 8rpx;
  height: 112rpx;
  background: #faf8f5;
  border-bottom: 2rpx solid #ede7dc;
  flex-shrink: 0;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 0;
  flex: 1;
}
.icon-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.group-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.group-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.group-status {
  font-size: 22rpx;
  color: #8a8178;
}

/* 群公告 */
.notice-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 16rpx 32rpx 0;
  padding: 20rpx 24rpx;
  background: #fef3c7;
  border-radius: 16rpx;
  flex-shrink: 0;
}
.notice-text {
  flex: 1;
  font-size: 24rpx;
  color: #92400e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 消息列表 */
.msg-scroll {
  flex: 1;
  overflow: hidden;
}
.msg-list {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.time-label-row {
  display: flex;
  justify-content: center;
  margin-bottom: 16rpx;
}
.time-label {
  font-size: 22rpx;
  color: #8a8178;
  background: #f2ece1;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}
.withdraw-row {
  display: flex;
  justify-content: center;
  padding: 8rpx 0;
}
.withdraw-text {
  font-size: 22rpx;
  color: #8a8178;
}

/* 消息气泡 */
.msg-row {
  display: flex;
  gap: 16rpx;
}
.msg-mine {
  flex-direction: row-reverse;
}
.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.msg-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f2ece1;
}
.role-badge {
  position: absolute;
  bottom: -4rpx;
  right: -4rpx;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: #faf8f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.msg-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  align-items: flex-start;
}
.msg-content-mine {
  align-items: flex-end;
}
.sender-name {
  font-size: 22rpx;
  color: #8a8178;
  margin-left: 8rpx;
}
.sender-role {
  color: var(--brand);
}
.bubble {
  border-radius: 32rpx;
  padding: 20rpx 32rpx;
}
.bubble-other {
  background: #faf8f5;
  border-top-left-radius: 4rpx;
}
.bubble-mine {
  background: var(--brand);
  border-top-right-radius: 4rpx;
}
.bubble-text {
  font-size: 28rpx;
  line-height: 1.5;
  color: #2c2c2c;
  word-break: break-word;
  white-space: pre-wrap;
}
.bubble-text-mine {
  color: #ffffff;
}
.at-text {
  color: #3b82f6;
}
.bubble-image {
  width: 320rpx;
  border-radius: 16rpx;
  display: block;
}
.voice-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-width: 140rpx;
}
.voice-dur {
  font-size: 28rpx;
  color: #2c2c2c;
}

/* @成员面板 */
.at-panel {
  position: absolute;
  left: 32rpx;
  right: 32rpx;
  bottom: 180rpx;
  background: #faf8f5;
  border: 2rpx solid #ede7dc;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
  max-height: 520rpx;
  z-index: 30;
  overflow: hidden;
}
.at-search {
  padding: 16rpx 24rpx;
  border-bottom: 2rpx solid #ede7dc;
}
.at-input {
  height: 64rpx;
  padding: 0 24rpx;
  background: #f2ece1;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #2c2c2c;
}
.at-input-ph {
  color: #8a8178;
}
.at-scroll {
  max-height: 380rpx;
}
.at-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 20rpx 24rpx;
}
.at-all-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.at-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #f2ece1;
}
.at-info {
  display: flex;
  flex-direction: column;
}
.at-name {
  font-size: 28rpx;
  color: #2c2c2c;
}
.at-name-bold {
  font-weight: 500;
}
.at-role {
  font-size: 22rpx;
  color: #8a8178;
}

/* 输入区 */
.input-area {
  flex-shrink: 0;
  background: #faf8f5;
  border-top: 2rpx solid #ede7dc;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}
.input-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.input-wrap {
  flex: 1;
}
.msg-input {
  height: 72rpx;
  padding: 0 24rpx;
  background: #f2ece1;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #2c2c2c;
}
.msg-input-ph {
  color: #8a8178;
}
.send-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.more-panel {
  display: flex;
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top: 2rpx solid #ede7dc;
}
.more-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.more-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: #f2ece1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.more-label {
  font-size: 22rpx;
  color: #2c2c2c;
}

/* 消息操作菜单 */
.menu-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  z-index: 50;
}
.menu-pop {
  position: absolute;
  bottom: 200rpx;
  left: 50%;
  transform: translateX(-50%);
  background: #faf8f5;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.16);
  padding: 16rpx;
  display: flex;
  gap: 8rpx;
}
.menu-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
}
.menu-label {
  font-size: 22rpx;
  color: #2c2c2c;
}

/* 侧边栏 / 抽屉 */
.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 60;
}
.sheet {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 85vw;
  max-width: 600rpx;
  background: #f2ece1;
  display: flex;
  flex-direction: column;
}
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 24rpx 24rpx 32rpx;
  background: #faf8f5;
  border-bottom: 2rpx solid #ede7dc;
}
.sheet-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.sheet-body {
  flex: 1;
  overflow: hidden;
}
.sheet-group-info {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  background: #faf8f5;
  border-bottom: 2rpx solid #ede7dc;
}
.sheet-group-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 16rpx;
  background: #f2ece1;
}
.sheet-group-text {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.sheet-group-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.sheet-group-count {
  font-size: 26rpx;
  color: #8a8178;
}
.sheet-section {
  padding: 32rpx;
  background: #faf8f5;
  border-bottom: 2rpx solid #ede7dc;
}
.sheet-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.sheet-section-label {
  font-size: 26rpx;
  color: #8a8178;
}
.sheet-section-more {
  font-size: 26rpx;
  color: var(--brand);
}
.member-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 24rpx;
}
.member-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.member-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f2ece1;
}
.member-name {
  font-size: 20rpx;
  color: #2c2c2c;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}
.sheet-notice-text {
  font-size: 26rpx;
  color: #2c2c2c;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sheet-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sheet-row-value {
  font-size: 26rpx;
  color: #2c2c2c;
}

/* 群公告详情 */
.notice-detail {
  padding: 32rpx;
}
.notice-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.notice-publisher {
  font-size: 24rpx;
  color: #8a8178;
}
.notice-date {
  font-size: 24rpx;
  color: #8a8178;
}
.notice-content {
  font-size: 28rpx;
  color: #2c2c2c;
  line-height: 1.6;
  white-space: pre-wrap;
}
.notice-empty {
  display: block;
  padding: 32rpx;
  font-size: 26rpx;
  color: #8a8178;
}

/* 加载/错误状态 */
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }

/* 发送按钮禁用态 */
.send-btn-disabled { opacity: 0.5; pointer-events: none; }
</style>
