<template>
  <view class="page">
    <LoadingSkeleton
      v-if="loading"
      type="detail"
    />

    <EmptyState
      v-else-if="loadError || !groupDetail"
      icon="⚠️"
      title="加载失败"
      :description="loadError || '群聊不存在'"
      action-text="重新加载"
      :show-action="true"
      @action="loadData"
    />

    <view
      v-else
      class="chat-layout"
    >
      <!-- 导航 -->
      <view class="nav">
        <view class="nav-left">
          <text
            class="nav-back"
            @click="goBack"
          >
            ←
          </text>
          <view class="nav-group-info">
            <text class="nav-group-name">
              {{ groupDetail.name }}
            </text>
            <text class="nav-group-count">
              {{ onlineCount }}人在线 / {{ groupDetail.memberCount }}人
            </text>
          </view>
        </view>
        <text
          class="nav-more"
          @click="showMembersSheet = true"
        >
          👥
        </text>
      </view>

      <!-- 群公告 -->
      <view
        v-if="groupDetail.notice"
        class="notice-bar"
        @click="showNoticeSheet = true"
      >
        <text class="notice-icon">
          📢
        </text>
        <text class="notice-text">
          {{ groupDetail.notice }}
        </text>
        <text class="notice-arrow">
          ›
        </text>
      </view>

      <!-- 消息列表 -->
      <scroll-view
        scroll-y
        class="msg-list"
      >
        <view
          v-for="(msg, idx) in messages"
          :key="msg.id || idx"
        >
          <!-- 时间标签 -->
          <view
            v-if="shouldShowTime(msg, messages[idx - 1])"
            class="time-label"
          >
            <text>{{ formatTime(msg.timestamp) }}</text>
          </view>
          <!-- 消息气泡 -->
          <view
            v-if="msg.isWithdrawn"
            class="withdrawn-row"
          >
            <text class="withdrawn-text">
              {{ msg.fromMe ? '你' : msg.senderName }}撤回了一条消息
            </text>
          </view>
          <view
            v-else
            class="msg-row"
            :class="{ mine: msg.fromMe }"
          >
            <!-- 头像 -->
            <image
              v-if="!msg.fromMe"
              :src="msg.senderAvatar || ''"
              class="msg-avatar"
              mode="aspectFill"
              @click="goUser(msg.senderId)"
            />
            <view class="msg-content-wrap">
              <!-- 发送者名称 -->
              <text
                v-if="!msg.fromMe"
                class="msg-sender-name"
              >
                {{ msg.senderName }}
                <text
                  v-if="msg.role && msg.role !== 'member'"
                  class="msg-role"
                >
                  ({{ getRoleName(msg.role) }})
                </text>
              </text>
              <!-- 气泡 -->
              <view
                class="msg-bubble"
                :class="{ mine: msg.fromMe }"
                @longpress="selectMsg(msg)"
              >
                <text
                  v-if="msg.atAll"
                  class="at-all"
                >
                  @所有人
                </text>
                <text class="msg-text">
                  {{ msg.content }}
                </text>
              </view>
            </view>
          </view>
        </view>
        <view id="msg-end" />
      </scroll-view>

      <!-- 消息操作菜单 -->
      <view
        v-if="selectedMsg"
        class="msg-actions-overlay"
        @click="selectedMsg = null"
      >
        <view
          class="msg-actions-box"
          @click.stop
        >
          <view
            v-if="selectedMsg?.type === 'text'"
            class="msg-action-item"
            @click="copyMsg"
          >
            <text>📋 复制</text>
          </view>
          <view
            v-if="selectedMsg?.fromMe && canWithdraw(selectedMsg.timestamp)"
            class="msg-action-item"
            @click="doWithdraw"
          >
            <text>↩ 撤回</text>
          </view>
        </view>
      </view>

      <!-- @成员列表 -->
      <view
        v-if="showAtList"
        class="at-list-overlay"
        @click="showAtList = false"
      >
        <view
          class="at-list"
          @click.stop
        >
          <view class="at-search">
            <input
              v-model="atSearchKeyword"
              class="at-search-input"
              placeholder="搜索成员..."
            >
          </view>
          <view
            v-if="groupDetail.myRole === 'owner' || groupDetail.myRole === 'admin'"
            class="at-item"
            @click="atAll"
          >
            <view class="at-icon-wrap">
              👥
            </view>
            <text>@所有人</text>
          </view>
          <view
            v-for="m in atSearchResults"
            :key="m.id"
            class="at-item"
            @click="selectAtMember(m)"
          >
            <image
              :src="m.avatar || ''"
              class="at-avatar"
              mode="aspectFill"
            />
            <view class="at-info">
              <text class="at-name">
                {{ m.remark || m.nickname }}
              </text>
              <text
                v-if="m.role !== 'member'"
                class="at-role"
              >
                {{ getRoleName(m.role) }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 更多功能面板 -->
      <view
        v-if="showMorePanel"
        class="more-panel"
      >
        <view
          class="more-item"
          @click="uni.showToast({ title: '相册功能开发中', icon: 'none' })"
        >
          <view class="more-icon">
            🖼
          </view>
          <text class="more-label">
            相册
          </text>
        </view>
        <view
          class="more-item"
          @click="uni.showToast({ title: '拍照功能开发中', icon: 'none' })"
        >
          <view class="more-icon">
            📷
          </view>
          <text class="more-label">
            拍照
          </text>
        </view>
        <view
          class="more-item"
          @click="openAtList"
        >
          <view class="more-icon">
            @
          </view>
          <text class="more-label">
            @成员
          </text>
        </view>
        <view
          class="more-item"
          @click="uni.showToast({ title: '语音功能开发中', icon: 'none' })"
        >
          <view class="more-icon">
            🎤
          </view>
          <text class="more-label">
            语音
          </text>
        </view>
      </view>

      <!-- 底部输入 -->
      <view class="input-area">
        <view class="input-row">
          <text
            class="input-plus"
            @click="showMorePanel = !showMorePanel"
          >
            {{ showMorePanel ? '✕' : '＋' }}
          </text>
          <view class="input-wrap">
            <input
              v-model="inputText"
              class="input-field"
              placeholder="发送消息..."
              @confirm="sendMsg"
              @input="checkAt"
            >
          </view>
          <text
            class="input-send"
            :class="{ disabled: !inputText.trim() || sending }"
            @click="sendMsg"
          >
            {{ sending ? '...' : '➤' }}
          </text>
        </view>
      </view>

      <!-- 群成员侧边栏 -->
      <view
        v-if="showMembersSheet"
        class="sheet-mask"
        @click="showMembersSheet = false"
      >
        <view
          class="sheet-side"
          @click.stop
        >
          <view class="sheet-side-header">
            <text class="sheet-side-title">
              群聊信息
            </text>
          </view>
          <scroll-view
            scroll-y
            class="sheet-side-body"
          >
            <!-- 群信息 -->
            <view class="sheet-section">
              <view class="sheet-group-info">
                <image
                  :src="groupDetail.avatar || ''"
                  class="sheet-group-avatar"
                  mode="aspectFill"
                />
                <view class="sheet-group-detail">
                  <text class="sheet-group-name">
                    {{ groupDetail.name }}
                  </text>
                  <text class="sheet-group-count">
                    {{ groupDetail.memberCount }}人
                  </text>
                </view>
              </view>
            </view>
            <!-- 成员列表 -->
            <view class="sheet-section">
              <view class="sheet-section-title-row">
                <text class="sheet-section-title">
                  群成员
                </text>
                <text
                  class="sheet-section-link"
                  @click="showMembersSheet = false"
                >
                  查看全部 ›
                </text>
              </view>
              <view class="member-grid">
                <view
                  v-for="m in members.slice(0, 10)"
                  :key="m.id"
                  class="member-grid-item"
                >
                  <view class="member-grid-avatar-wrap">
                    <image
                      :src="m.avatar || ''"
                      class="member-grid-avatar"
                      mode="aspectFill"
                    />
                    <text
                      v-if="m.role === 'owner'"
                      class="role-icon owner"
                    >
                      👑
                    </text>
                    <text
                      v-if="m.role === 'admin'"
                      class="role-icon admin"
                    >
                      🛡
                    </text>
                  </view>
                  <text class="member-grid-name">
                    {{ m.nickname }}
                  </text>
                </view>
              </view>
            </view>
            <!-- 群公告 -->
            <view
              v-if="groupDetail.notice"
              class="sheet-section"
              @click="showMembersSheet = false; showNoticeSheet = true"
            >
              <view class="sheet-row">
                <text class="sheet-row-label">
                  群公告
                </text>
                <text class="sheet-row-arrow">
                  ›
                </text>
              </view>
              <text class="sheet-notice-preview">
                {{ groupDetail.notice }}
              </text>
            </view>
            <!-- 我的角色 -->
            <view class="sheet-section">
              <view class="sheet-row">
                <text class="sheet-row-label">
                  我在本群的身份
                </text>
                <text class="sheet-row-value">
                  {{ getRoleName(groupDetail.myRole) }}
                </text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 群公告详情 -->
      <view
        v-if="showNoticeSheet"
        class="sheet-mask"
        @click="showNoticeSheet = false"
      >
        <view
          class="sheet-side"
          @click.stop
        >
          <view class="sheet-side-header">
            <text class="sheet-side-title">
              群公告
            </text>
          </view>
          <scroll-view
            scroll-y
            class="sheet-side-body p-4"
          >
            <view v-if="groupDetail.noticeDetail">
              <view class="notice-meta">
                <text class="notice-publisher">
                  {{ groupDetail.noticeDetail.publisher }}
                </text>
                <text class="notice-date">
                  发布于 {{ groupDetail.noticeDetail.publishedAt }}
                </text>
              </view>
              <text class="notice-content">
                {{ groupDetail.noticeDetail.content }}
              </text>
            </view>
            <text
              v-else
              class="notice-empty"
            >
              暂无群公告
            </text>
          </scroll-view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { imApi } from '../../api'

interface GroupMember {
  id: string
  nickname: string
  remark?: string
  avatar?: string
  role: 'owner' | 'admin' | 'member'
}

interface GroupDetail {
  id: string
  name: string
  avatar?: string
  memberCount: number
  myRole: 'owner' | 'admin' | 'member'
  notice?: string
  noticeDetail?: { publisher: string; publishedAt: string; content: string }
}

interface GroupMessage {
  id: string | number
  fromMe: boolean
  senderId: string
  senderName: string
  senderAvatar?: string
  role?: string
  type: 'text' | 'image' | 'voice'
  content: string
  isWithdrawn: boolean
  timestamp: number
  atAll?: boolean
  atMembers?: number[]
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const groupId = ref('')
const groupDetail = ref<GroupDetail | null>(null)
const messages = ref<GroupMessage[]>([])
const members = ref<GroupMember[]>([])

const inputText = ref('')
const sending = ref(false)
const showMorePanel = ref(false)
const showMembersSheet = ref(false)
const showNoticeSheet = ref(false)
const showAtList = ref(false)
const atSearchKeyword = ref('')
const atSearchResults = ref<GroupMember[]>([])
const selectedAtMembers = ref<string[]>([])
const selectedMsg = ref<GroupMessage | null>(null)

const onlineCount = ref(0)

function goBack() { uni.navigateBack() }

function goUser(uid?: string) {
  if (uid) uni.navigateTo({ url: `/pages/user/user?userId=${uid}` })
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
    const [groupRes, membersRes, historyRes] = await Promise.all([
      imApi.getGroupInfo(groupId.value),
      imApi.getGroupMembers(groupId.value),
      imApi.getGroupHistory(groupId.value).catch(() => []),
    ])
    const g = groupRes || {}
    groupDetail.value = {
      id: groupId.value,
      name: g.name || '群聊',
      avatar: g.avatar || '',
      memberCount: g.memberCount || g.member_count || 0,
      myRole: g.myRole || g.my_role || 'member',
      notice: g.notice || '',
      noticeDetail: g.noticeDetail || null,
    }
    const mList = Array.isArray(membersRes) ? membersRes : []
    members.value = mList.map((m: any) => ({
      id: String(m.id || m.userId || ''),
      nickname: m.nickname || m.name || '',
      remark: m.remark || '',
      avatar: m.avatar || '',
      role: m.role || 'member',
    }))
    onlineCount.value = members.value.filter(m => m.role === 'owner' || m.role === 'admin').length || Math.min(members.value.length, 5)

    const h = Array.isArray(historyRes) ? historyRes : []
    messages.value = h.map((m: any) => ({
      id: m.id || Date.now(),
      fromMe: m.fromMe || m.senderId === 0,
      senderId: String(m.senderId || ''),
      senderName: m.senderName || '',
      senderAvatar: m.senderAvatar || '',
      role: m.role || m.senderRole || '',
      type: m.type || 'text',
      content: m.content || '',
      isWithdrawn: m.isWithdrawn || false,
      timestamp: m.timestamp || Date.now(),
      atAll: m.atAll || false,
    }))
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function sendMsg() {
  const text = inputText.value.trim()
  if (!text || sending.value) return
  inputText.value = ''
  sending.value = true

  const newMsg: GroupMessage = {
    id: 'temp_' + Date.now(),
    fromMe: true,
    senderId: '0',
    senderName: '我',
    type: 'text',
    content: text,
    isWithdrawn: false,
    timestamp: Date.now(),
  }
  messages.value.push(newMsg)

  try {
    await imApi.sendGroupMsg(groupId.value, {
      type: 'text', content: text,
      atMembers: selectedAtMembers.value.length > 0 ? selectedAtMembers.value : undefined,
    })
    selectedAtMembers.value = []
  } catch {
    uni.showToast({ title: '发送失败', icon: 'none' })
  } finally {
    sending.value = false
  }
}

function checkAt(e: any) {
  if (e.detail?.value?.endsWith('@')) {
    showAtList.value = true
    openAtList()
  }
}

function openAtList() {
  showMorePanel.value = false
  showAtList.value = true
  atSearchKeyword.value = ''
  atSearchResults.value = members.value.filter(m => m.id !== '0')
}

function selectAtMember(m: GroupMember) {
  if (!selectedAtMembers.value.includes(m.id)) {
    selectedAtMembers.value.push(m.id)
    inputText.value += '@' + m.nickname + ' '
  }
  showAtList.value = false
}

function atAll() {
  inputText.value += '@所有人 '
  showAtList.value = false
}

function selectMsg(msg: GroupMessage) {
  selectedMsg.value = msg
}

function copyMsg() {
  if (selectedMsg.value?.content) {
    uni.setClipboardData({ data: selectedMsg.value.content })
    uni.showToast({ title: '已复制', icon: 'none' })
  }
  selectedMsg.value = null
}

async function doWithdraw() {
  if (!selectedMsg.value) return
  try {
    await imApi.withdrawGroupMsg(groupId.value, String(selectedMsg.value.id))
    selectedMsg.value.isWithdrawn = true
  } catch {
    uni.showToast({ title: '撤回失败', icon: 'none' })
  }
  selectedMsg.value = null
}

function getRoleName(role?: string): string {
  const map: Record<string, string> = { owner: '群主', admin: '管理员', member: '成员' }
  return map[role || ''] || role || '成员'
}

function formatTime(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  const time = pad(d.getHours()) + ':' + pad(d.getMinutes())
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return time
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return '昨天 ' + time
  return pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' ' + time
}

function shouldShowTime(msg: GroupMessage, prev?: GroupMessage): boolean {
  if (!prev) return true
  return msg.timestamp - prev.timestamp > 300000
}

function canWithdraw(ts: number): boolean {
  return Date.now() - ts < 120000
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.chat-layout { display: flex; flex-direction: column; height: 100vh; }

/* 导航 */
.nav { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fff; border-bottom: 1px solid #E5E1DB; }
.nav-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.nav-back { font-size: 22px; color: #2C2C2C; padding: 4px; }
.nav-group-info { flex: 1; min-width: 0; }
.nav-group-name { font-size: 15px; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav-group-count { font-size: 11px; color: #999; display: block; }
.nav-more { font-size: 20px; padding: 4px; }

/* 公告 */
.notice-bar { display: flex; align-items: center; gap: 6px; margin: 8px 12px 0; padding: 10px 12px; background: #fef7e6; border-radius: 8px; }
.notice-icon { font-size: 14px; }
.notice-text { flex: 1; font-size: 12px; color: #b8860b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notice-arrow { font-size: 16px; color: #b8860b; }

/* 消息列表 */
.msg-list { flex: 1; overflow-y: auto; padding: 12px 16px; }
.time-label { text-align: center; margin: 8px 0; }
.time-label text { font-size: 11px; color: #999; background: rgba(0,0,0,0.04); padding: 2px 10px; border-radius: 8px; }
.withdrawn-row { text-align: center; padding: 8px 0; }
.withdrawn-text { font-size: 12px; color: #999; font-style: italic; }
.msg-row { display: flex; gap: 8px; margin-bottom: 14px; align-items: flex-start; }
.msg-row.mine { flex-direction: row-reverse; }
.msg-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; }
.msg-content-wrap { max-width: 70%; }
.msg-sender-name { font-size: 11px; color: #999; display: block; margin-bottom: 2px; margin-left: 4px; }
.msg-role { font-size: 10px; color: #C41E3A; }
.msg-bubble { padding: 10px 14px; border-radius: 16px; background: #fff; font-size: 14px; line-height: 1.5; word-break: break-word; }
.msg-bubble.mine { background: #C41E3A; color: #fff; border-radius: 16px 16px 4px 16px; }
.at-all { color: #60a5fa; }
.msg-text { white-space: pre-wrap; }

/* 消息操作 */
.msg-actions-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 50; display: flex; align-items: center; justify-content: center; }
.msg-actions-box { background: #fff; border-radius: 12px; padding: 8px; display: flex; gap: 4px; }
.msg-action-item { padding: 10px 16px; border-radius: 8px; font-size: 14px; }
.msg-action-item:active { background: #F5F0E8; }

/* @列表 */
.at-list-overlay { position: absolute; inset: 0; z-index: 40; display: flex; align-items: flex-end; }
.at-list { background: #fff; border-radius: 12px 12px 0 0; max-height: 50vh; overflow-y: auto; width: 100%; }
.at-search { padding: 12px 16px; border-bottom: 1px solid #E5E1DB; }
.at-search-input { background: #F5F0E8; border-radius: 8px; padding: 8px 12px; font-size: 13px; width: 100%; box-sizing: border-box; }
.at-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #f5f5f5; }
.at-item:active { background: #F5F0E8; }
.at-icon-wrap { width: 36px; height: 36px; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 18px; }
.at-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; }
.at-info { flex: 1; }
.at-name { font-size: 14px; font-weight: 500; color: #2C2C2C; display: block; }
.at-role { font-size: 11px; color: #999; }

/* 更多面板 */
.more-panel { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 12px 16px 16px; background: #fff; border-top: 1px solid #E5E1DB; }
.more-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.more-icon { width: 48px; height: 48px; border-radius: 12px; background: #F5F0E8; display: flex; align-items: center; justify-content: center; font-size: 22px; }
.more-label { font-size: 11px; color: #666; }

/* 输入区 */
.input-area { background: #fff; border-top: 1px solid #E5E1DB; padding-bottom: env(safe-area-inset-bottom); }
.input-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; }
.input-plus { font-size: 22px; color: #999; padding: 4px; }
.input-wrap { flex: 1; background: #F5F0E8; border-radius: 20px; padding: 0 12px; }
.input-field { height: 36px; font-size: 14px; width: 100%; }
.input-send { font-size: 22px; color: #C41E3A; padding: 4px 8px; }
.input-send.disabled { color: #ccc; }

/* Sheet */
.sheet-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; justify-content: flex-end; }
.sheet-side { width: 80vw; background: #fff; height: 100%; display: flex; flex-direction: column; }
.sheet-side-header { padding: 16px; border-bottom: 1px solid #E5E1DB; }
.sheet-side-title { font-size: 16px; font-weight: 600; }
.sheet-side-body { flex: 1; overflow-y: auto; }
.p-4 { padding: 16px; }
.sheet-section { padding: 16px; border-bottom: 1px solid #f5f0e8; }
.sheet-group-info { display: flex; align-items: center; gap: 12px; }
.sheet-group-avatar { width: 56px; height: 56px; border-radius: 8px; }
.sheet-group-detail { flex: 1; }
.sheet-group-name { font-size: 16px; font-weight: 500; display: block; }
.sheet-group-count { font-size: 13px; color: #999; display: block; margin-top: 2px; }
.sheet-section-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.sheet-section-title { font-size: 13px; color: #999; }
.sheet-section-link { font-size: 13px; color: #C41E3A; }
.sheet-row { display: flex; align-items: center; justify-content: space-between; }
.sheet-row-label { font-size: 14px; color: #2C2C2C; }
.sheet-row-value { font-size: 14px; color: #999; }
.sheet-row-arrow { font-size: 16px; color: #999; }
.sheet-notice-preview { font-size: 13px; color: #666; margin-top: 8px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.member-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.member-grid-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.member-grid-avatar-wrap { position: relative; }
.member-grid-avatar { width: 40px; height: 40px; border-radius: 50%; }
.role-icon { position: absolute; bottom: -2px; right: -2px; font-size: 12px; background: #fff; border-radius: 50%; padding: 1px; }
.member-grid-name { font-size: 11px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; text-align: center; }

/* 公告详情 */
.notice-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.notice-publisher { font-size: 13px; color: #999; }
.notice-date { font-size: 12px; color: #999; }
.notice-content { font-size: 14px; color: #2C2C2C; line-height: 1.7; white-space: pre-wrap; display: block; }
.notice-empty { font-size: 14px; color: #999; display: block; }
</style>
