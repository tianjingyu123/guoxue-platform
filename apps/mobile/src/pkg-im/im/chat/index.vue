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
          <AppIcon name="arrow-left" :size="40" color="#2c2c2c" />
        </view>
        <view class="target-info">
          <view class="target-avatar-wrap">
            <image lazy-load class="target-avatar" :src="target.avatar" mode="aspectFill" />
            <view v-if="target.isOnline" class="online-dot" />
          </view>
          <view class="target-text">
            <text class="target-name">{{ target.remark || target.nickname }}</text>
            <text class="target-status">{{ target.isOnline ? '在线' : target.lastActiveAt || '离线' }}</text>
          </view>
        </view>
      </view>
      <view class="icon-btn icon-btn-veil" @tap="showHeaderMenu = !showHeaderMenu">
        <AppIcon name="more-vertical" :size="40" color="#2c2c2c" />
      </view>
      <!-- 顶部下拉菜单 -->
      <view v-if="showHeaderMenu" class="header-menu">
        <text class="header-menu-item">查看主页</text>
        <text class="header-menu-item">清空聊天记录</text>
        <text class="header-menu-item header-menu-danger">{{ target.isBlocked ? '移出黑名单' : '加入黑名单' }}</text>
      </view>
    </view>

    <!-- 消息列表 -->
    <scroll-view class="msg-scroll" scroll-y :scroll-into-view="'msg-end'">
      <view class="msg-list">
        <view v-for="(message, index) in messages" :key="message.id">
          <!-- 时间标签 -->
          <view v-if="showTime(message, messages[index - 1])" class="time-label-row">
            <text class="time-label">{{ formatMessageTime(message.timestamp) }}</text>
          </view>

          <!-- 消息气泡 -->
          <view class="msg-row" :class="{ 'msg-mine': isMine(message) }">
            <image lazy-load class="msg-avatar" :src="message.senderAvatar" mode="aspectFill" />
            <view class="msg-content" :class="{ 'msg-content-mine': isMine(message) }">
              <view
                class="bubble"
                :class="[
                  isMine(message) ? 'bubble-mine' : 'bubble-other',
                  message.type === 'card' ? 'bubble-card' : '',
                  message.isWithdrawn ? 'bubble-withdrawn' : '',
                ]"
              >
                <!-- 撤回 -->
                <text v-if="message.isWithdrawn" class="withdrawn-text">消息已撤回</text>
                <!-- 文字 -->
                <text v-else-if="message.type === 'text'" class="bubble-text" :class="{ 'bubble-text-mine': isMine(message) }">{{ message.content }}</text>
                <!-- 图片 -->
                <image lazy-load v-else-if="message.type === 'image'" class="bubble-image" :src="message.image?.url" mode="widthFix" />
                <!-- 语音 -->
                <view v-else-if="message.type === 'voice'" class="voice-row">
                  <view class="voice-play">
                    <AppIcon name="play" :size="16" :color="isMine(message) ? '#ffffff' : '#2c2c2c'" />
                  </view>
                  <text class="voice-dur" :class="{ 'bubble-text-mine': isMine(message) }">{{ message.voice?.duration }}″</text>
                  <view class="voice-bar"><view class="voice-bar-fill" /></view>
                </view>
                <!-- 商品卡片 -->
                <view v-else-if="message.type === 'card'" class="product-card">
                  <image lazy-load class="product-cover" :src="message.product?.cover" mode="aspectFill" />
                  <view class="product-body">
                    <text class="product-title">{{ message.product?.title }}</text>
                    <view class="product-price-row">
                      <text class="product-price">¥{{ formatPrice(message.product?.price) }}</text>
                      <text v-if="message.product?.originalPrice" class="product-origin">¥{{ formatPrice(message.product?.originalPrice) }}</text>
                    </view>
                  </view>
                </view>
              </view>
              <!-- 消息状态 -->
              <view v-if="isMine(message)" class="msg-status">
                <AppIcon v-if="message.status === 'sent'" name="check" :size="12" color="#8a8178" />
                <AppIcon v-else-if="message.status === 'delivered'" name="check-check" :size="12" color="#8a8178" />
                <AppIcon v-else-if="message.status === 'read'" name="check-check" :size="12" color="#c41e3a" />
                <text v-else-if="message.status === 'failed'" class="status-failed">失败</text>
              </view>
            </view>
          </view>
        </view>
        <view id="msg-end" />
      </view>
    </scroll-view>

    <!-- 底部输入区 -->
    <view class="input-area">
      <!-- 权限提示条 -->
      <view
        v-if="permission.hint"
        class="hint-bar"
        :class="hintClass"
      >
        <AppIcon v-if="permission.state === 'unrestricted' || permission.state === 'replied'" name="check" :size="14" color="#16a34a" class="hint-icon" />
        <text class="hint-text" :class="hintTextClass">{{ permission.hint }}</text>
      </view>

      <view class="input-row">
        <view class="icon-btn icon-btn-veil" @tap="toggleMorePanel">
          <AppIcon name="plus" :size="40" :color="showMorePanel ? '#c41e3a' : '#2c2c2c'" :style="showMorePanel ? 'transform:rotate(45deg)' : ''" />
        </view>
        <view class="input-wrap">
          <input
            class="msg-input"
            :value="inputText"
            :placeholder="inputPlaceholder"
            placeholder-class="msg-input-ph"
            :disabled="!permission.canSend"
            @input="onInput"
          />
        </view>
        <view v-if="inputText.trim()" class="send-btn" :class="{ 'send-btn-disabled': submitting }" @tap="handleSendText">
          <AppIcon name="send" :size="36" color="#ffffff" />
        </view>
        <view v-else class="icon-btn icon-btn-veil">
          <AppIcon name="mic" :size="40" color="#2c2c2c" />
        </view>
      </view>

      <!-- 更多功能面板 -->
      <view v-if="showMorePanel && permission.canSend" class="more-panel">
        <view class="more-item">
          <view class="more-icon"><AppIcon name="image" :size="44" color="#c41e3a" /></view>
          <text class="more-label">相册</text>
        </view>
        <view class="more-item">
          <view class="more-icon"><AppIcon name="camera" :size="44" color="#c41e3a" /></view>
          <text class="more-label">拍照</text>
        </view>
        <view class="more-item">
          <view class="more-icon"><AppIcon name="mic" :size="44" color="#c41e3a" /></view>
          <text class="more-label">语音</text>
        </view>
        <view class="more-item">
          <view class="more-icon"><AppIcon name="shopping-bag" :size="44" color="#c41e3a" /></view>
          <text class="more-label">商品</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  imApi,
  formatMessageTime,
  shouldShowTimeLabel,
  toChatPermission,
  timToChatMessage,
  type ChatMessage,
  type ChatPermission,
} from '@/lib/im-data'
import { useTim, type TimMessage } from '@/composables/useTim'
import { formatPrice } from '@/utils/format'

// name/avatar 由跳转来源（会话列表/用户主页私信按钮）经 query 传入做对端展示；无则从收到的消息补齐
// 兼容两种入参：?targetId=（直连完整路径）与 ?id=（utils/router DYNAMIC_ROUTES /im/chat/:id 与用户主页私信按钮传的都是 id）
const props = defineProps<{ targetId?: string; id?: string; name?: string; avatar?: string }>()
const peerId = computed(() => props.targetId || props.id || '')

const statusBarHeight = ref(0)
const tim = useTim()

// 数据状态
// target 为对端展示对象，模板裸访问多个字段（avatar/nickname/isOnline/isBlocked 等），保留 any
const target = ref<any>({
  nickname: props.name ? decodeURIComponent(props.name) : '对方',
  avatar: props.avatar ? decodeURIComponent(props.avatar) : '',
  isOnline: false,
  isBlocked: false,
})
const messages = ref<ChatMessage[]>([])
const loading = ref(true)
const error = ref('')
const submitting = ref(false)

// UI 临时状态
const inputText = ref('')
const showMorePanel = ref(false)
const showHeaderMenu = ref(false)

let unsubscribe: (() => void) | null = null

async function loadData() {
  loading.value = true
  error.value = ''
  if (!peerId.value) {
    error.value = '未指定聊天对象'
    loading.value = false
    return
  }
  try {
    // 登录 TIM（user-sig + account import + login）→ 拉单聊历史
    await tim.ensureLogin()
    const res = await tim.getC2CHistory(peerId.value)
    messages.value = res.messageList.map(timToChatMessage)
    fillTargetFromMessages(res.messageList)
    await tim.setC2CRead(peerId.value)
  } catch (e) {
    error.value = (e as Error)?.message || '连接消息服务失败，请重试'
    loading.value = false
    return
  }
  // 订阅实时新消息（仅本会话对端发来的）
  unsubscribe = tim.onMessage((msgs) => {
    const mine = msgs.filter((m) => m.conversationID === `C2C${peerId.value}`)
    if (!mine.length) return
    messages.value.push(...mine.map(timToChatMessage))
    fillTargetFromMessages(mine)
    tim.setC2CRead(peerId.value)
  })
  // 私信权限真连后端 /im/relation/:id；单独获取，失败保守降级（禁止发送）不阻塞整页
  await refreshPermission()
  loading.value = false
}

// 对端昵称/头像：优先 query 传入，否则从收到的消息补齐（无独立资料端点时的诚实来源）
function fillTargetFromMessages(msgs: TimMessage[]) {
  const incoming = msgs.find((m) => m.flow === 'in')
  if (!incoming) return
  if (!props.name && incoming.nick) target.value.nickname = incoming.nick
  if (!props.avatar && incoming.avatar) target.value.avatar = incoming.avatar
}

// 拉取与目标用户的私信关系权限（驱动输入框可用态与提示）
async function refreshPermission() {
  try {
    permission.value = toChatPermission(await imApi.getRelationPolicy(peerId.value))
  } catch {
    permission.value = { state: 'blocked', canSend: false, hint: '暂时无法确认会话权限，请稍后重试', reason: 'error' }
  }
}

onMounted(() => {
  loadData()
})
onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

function isMine(m: ChatMessage) {
  return !!m.isSelf
}
function showTime(m: ChatMessage, prev?: ChatMessage) {
  return shouldShowTimeLabel(m.timestamp, prev?.timestamp)
}

// 私信权限：后端 /im/relation/:id 真相（替代旧的前端本地推断）。默认加载中禁止发送
const permission = ref<ChatPermission>({ state: 'waiting_reply', canSend: false, hint: '' })

const hintClass = computed(() => {
  const s = permission.value.state
  if (s === 'unrestricted' || s === 'replied') return 'hint-ok'
  if (s === 'blocked') return 'hint-blocked'
  return 'hint-muted'
})
const hintTextClass = computed(() => {
  const s = permission.value.state
  if (s === 'unrestricted' || s === 'replied') return 'hint-text-ok'
  if (s === 'blocked') return 'hint-text-blocked'
  return 'hint-text-muted'
})

const inputPlaceholder = computed(() => {
  switch (permission.value.state) {
    case 'waiting_reply':
      return '等待对方回复...'
    case 'blocked':
      return '已加入黑名单'
    case 'can_greet':
      return '发送一条打招呼消息...'
    default:
      return '输入消息...'
  }
})

// 绑定到 uni <input>，vue-tsc 按原生 input 事件签名校验，保留 any
function onInput(e: any) {
  inputText.value = e.detail.value
}
function toggleMorePanel() {
  showMorePanel.value = !showMorePanel.value
}

// 发送文字消息：走 TIM SDK sendMessage（实时下发对端）
async function handleSendText() {
  if (!inputText.value.trim() || !permission.value.canSend || submitting.value) return
  const content = inputText.value.trim()
  inputText.value = ''
  submitting.value = true
  try {
    const sdkMsg = await tim.sendText(peerId.value, content)
    messages.value.push(timToChatMessage(sdkMsg))
    // 发送成功后刷新权限：未互关时剩余条数会随发送递减
    await refreshPermission()
  } catch (e) {
    inputText.value = content // 发送失败回填输入框
    uni.showToast({ title: (e as Error)?.message || '发送失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
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
  gap: 16rpx;
}
/* 图标按钮：≥88rpx 触达区（X5 防御：容器 relative 承载内容层） */
.icon-btn {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
/* 输入区/导航操作位加浅色圆底衬，提示可点击 */
.icon-btn-veil {
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.04);
}
.target-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.target-avatar-wrap {
  position: relative;
}
.target-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #f2ece1;
}
.online-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #22c55e;
  border: 4rpx solid #faf8f5;
}
.target-text {
  display: flex;
  flex-direction: column;
}
.target-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.target-status {
  font-size: 22rpx;
  color: #8a8178;
}
.header-menu {
  position: absolute;
  top: 100rpx;
  right: 16rpx;
  background: #faf8f5;
  border: 2rpx solid #ede7dc;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
  padding: 8rpx 0;
  z-index: 20;
}
.header-menu-item {
  display: block;
  padding: 20rpx 32rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  white-space: nowrap;
}
.header-menu-danger {
  color: #dc2626;
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
  gap: 32rpx;
}
.time-label-row {
  display: flex;
  justify-content: center;
  margin-bottom: 32rpx;
}
.time-label {
  font-size: 22rpx;
  color: #8a8178;
  background: #f2ece1;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

/* 消息气泡 */
.msg-row {
  display: flex;
  gap: 16rpx;
}
.msg-mine {
  flex-direction: row-reverse;
}
.msg-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f2ece1;
  flex-shrink: 0;
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
.bubble-card {
  padding: 0;
  background: transparent;
}
.bubble-withdrawn {
  background: #f2ece1;
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
.withdrawn-text {
  font-size: 26rpx;
  font-style: italic;
  color: #8a8178;
}
.bubble-image {
  width: 320rpx;
  border-radius: 16rpx;
  display: block;
}

/* 语音 */
.voice-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-width: 200rpx;
}
.voice-play {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.voice-dur {
  font-size: 28rpx;
  color: #2c2c2c;
}
.voice-bar {
  flex: 1;
  height: 4rpx;
  background: rgba(138, 129, 120, 0.3);
  border-radius: 2rpx;
  overflow: hidden;
}
.voice-bar-fill {
  height: 100%;
  width: 0;
}

/* 商品卡片 */
.product-card {
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
  background: #faf8f5;
  border-radius: 16rpx;
  border: 2rpx solid #ede7dc;
  width: 440rpx;
}
.product-cover {
  width: 128rpx;
  height: 128rpx;
  border-radius: 8rpx;
  background: #f2ece1;
  flex-shrink: 0;
}
.product-body {
  flex: 1;
  min-width: 0;
}
.product-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.product-price-row {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  margin-top: 8rpx;
}
.product-price {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--brand);
}
.product-origin {
  font-size: 22rpx;
  color: #8a8178;
  text-decoration: line-through;
}

/* 消息状态 */
.msg-status {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 0 8rpx;
}
.status-failed {
  font-size: 22rpx;
  color: #dc2626;
}

/* 输入区 */
.input-area {
  flex-shrink: 0;
  background: #faf8f5;
  border-top: 2rpx solid #ede7dc;
  padding: 20rpx 24rpx;
}
.hint-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
}
.hint-ok {
  background: rgba(22, 163, 74, 0.08);
}
.hint-blocked {
  background: rgba(220, 38, 38, 0.1);
}
.hint-muted {
  background: #f2ece1;
}
.hint-icon {
  flex-shrink: 0;
}
.hint-text {
  font-size: 22rpx;
  line-height: 1.5;
}
.hint-text-ok {
  color: #16a34a;
}
.hint-text-blocked {
  color: #dc2626;
}
.hint-text-muted {
  color: #8a8178;
}
.input-row {
  display: flex;
  align-items: flex-end;
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

/* 更多面板 */
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
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.more-label {
  font-size: 22rpx;
  color: #2c2c2c;
}

/* 加载/错误状态 */
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }

/* 发送按钮禁用态 */
.send-btn-disabled { opacity: 0.5; pointer-events: none; }
</style>
