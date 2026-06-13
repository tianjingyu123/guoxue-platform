<template>
  <view class="ch-page">
    <!-- 顶部导航 -->
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="goBack()">‹</text>
        <view class="header-user" @click="goPage('/pages/user/id-detail/index?name=' + user.name)">
          <view class="hu-avatar">{{ user.name[0] }}</view>
          <view class="hu-info">
            <view class="hu-name-row">
              <text class="hu-name">{{ user.name }}</text>
              <text v-if="user.role === 'teacher'" class="hu-role teacher">讲师</text>
              <text v-if="user.role === 'circleOwner'" class="hu-role owner">圈主</text>
            </view>
            <view class="hu-status">
              <view class="hu-dot" :class="{ online: user.isOnline }" />
              <text>{{ user.isOnline ? '在线' : '离线' }}</text>
            </view>
          </view>
        </view>
        <view class="header-menu">
          <text class="hm-trigger" @click="showMenu = !showMenu">⋯</text>
          <view v-if="showMenu" class="hm-drop">
            <view class="hm-mask" @click="showMenu = false" />
            <view class="hm-list">
              <text class="hm-item" @click="showMenu = false">查看主页</text>
              <text class="hm-item" @click="showMenu = false">清空聊天记录</text>
              <text class="hm-item danger" @click="showMenu = false">举报</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 快捷功能入口 -->
    <view v-if="showQuickActions && (user.role === 'teacher' || user.role === 'circleOwner')" class="quick-bar">
      <view v-if="user.role === 'teacher'" class="qb-actions">
        <view class="qb-btn" @click="goPage('/pages/bounty/create/index')">
          <text>❓ 向TA提问</text>
          <text class="qb-tag">付费</text>
        </view>
        <view class="qb-btn" @click="goPage('/pages/call/id-detail/index')">
          <text>📞 音频连麦</text>
          <text class="qb-price">¥5/分钟</text>
        </view>
      </view>
      <view v-if="user.role === 'circleOwner' && user.circleName" class="qb-actions">
        <view class="qb-btn" @click="goPage('/pages/circle/id-detail/index')">
          <text>👥 查看TA的圈子</text>
        </view>
      </view>
      <text class="qb-close" @click="showQuickActions = false">✕</text>
    </view>

    <!-- 消息列表 -->
    <scroll-view scroll-y class="msg-area" :scroll-into-view="'msg-' + (messages.length - 1)" :scroll-with-animation="true">
      <view class="encrypt-tip"><text>消息已加密，仅对话双方可见</text></view>

      <template v-for="(msg, i) in messages" :key="msg.id">
        <!-- 时间分割线 -->
        <view v-if="shouldShowDivider(i)" class="time-divider"><text>{{ msg.time }}</text></view>

        <!-- 消息行 -->
        <view :id="'msg-' + i" class="msg-row" :class="{ sent: msg.type === 'sent' }" @longpress="handleLongPress(msg.id)">
          <view v-if="msg.type === 'received'" class="msg-avatar">{{ user.name[0] }}</view>
          <view class="msg-bubble-wrap" :class="{ sent: msg.type === 'sent' }">
            <view class="msg-bubble" :class="{ sent: msg.type === 'sent' }">
              <text>{{ msg.content }}</text>
            </view>
            <!-- 发送状态 -->
            <view v-if="msg.type === 'sent'" class="msg-status">
              <text v-if="msg.status === 'sending'" class="ms-spinner">⏳</text>
              <text v-else-if="msg.status === 'sent'" class="ms-sent">✓</text>
              <text v-else-if="msg.status === 'read'" class="ms-read">✓✓</text>
              <text v-else-if="msg.status === 'failed'" class="ms-failed">⚠️</text>
              <text v-if="msg.status === 'read'" class="ms-read-text">已读</text>
            </view>
            <!-- 失败重试 -->
            <text v-if="msg.status === 'failed'" class="msg-retry" @click="handleResend(msg.id)">⚠️</text>
          </view>
        </view>
      </template>
    </scroll-view>

    <!-- 消息长按菜单 -->
    <view v-if="showMsgMenu" class="msg-menu-mask" @click="showMsgMenu = false">
      <view class="msg-menu" @click.stop>
        <text class="mm-item" @click="handleCopy">复制</text>
        <text class="mm-item" @click="handleRecall">撤回</text>
        <text class="mm-item danger" @click="handleDelete">删除</text>
      </view>
    </view>

    <!-- 底部输入区 -->
    <view class="input-bar">
      <view class="ib-row">
        <text class="ib-btn" @click="handleVoice">🎤</text>
        <text class="ib-btn" @click="handleImage">🖼️</text>
        <text class="ib-btn" @click="handleEmoji">😊</text>
        <view class="ib-input-wrap">
          <input v-model="inputText" class="ib-input" placeholder="输入消息..." @confirm="handleSend" />
        </view>
        <view class="ib-send" :class="{ disabled: !inputText.trim() }" @click="handleSend">
          <text>➤</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const chatUsers: Record<string, any> = {
  '1': { name: '张易道', avatar: '', isOnline: true, role: 'teacher' },
  '2': { name: '李玄明', avatar: '', isOnline: false, role: 'circleOwner', circleName: '紫微斗数研习社' },
  '3': { name: '王小明', avatar: '', isOnline: true, role: 'user' },
}
const user = ref(chatUsers['1'])

const messages = ref([
  { id: 1, type: 'received' as const, content: '你好，请问有什么可以帮助你的吗？', time: '09:30', status: 'read' as const },
  { id: 2, type: 'sent' as const, content: '老师您好，我想请教一下关于八字中日主弱的问题', time: '09:31', status: 'read' as const },
  { id: 3, type: 'received' as const, content: '好的，日主弱是指日干在整个命局中得到的生扶力量较少。你可以把你的八字发给我看看。', time: '09:32', status: 'read' as const },
  { id: 4, type: 'sent' as const, content: '我的八字是：甲子年 丙寅月 己卯日 乙亥时', time: '09:35', status: 'read' as const },
  { id: 5, type: 'received' as const, content: '从你的八字来看，己土日主生于寅月，寅中甲木为七杀，木旺土弱。时支亥水又泄土气，确实是日主偏弱的格局。', time: '09:38', status: 'read' as const },
  { id: 6, type: 'sent' as const, content: '明白了，谢谢老师的指点！那我还想问一下...', time: '14:20', status: 'sent' as const },
])

const inputText = ref('')
const showMenu = ref(false)
const showQuickActions = ref(true)
const showMsgMenu = ref(false)
const selectedMsgId = ref<number | null>(null)

function shouldShowDivider(index: number) {
  if (index === 0) return true
  const cur = messages.value[index].time
  const prev = messages.value[index - 1].time
  return cur.split(':')[0] !== prev.split(':')[0]
}

function handleSend() {
  if (!inputText.value.trim()) return
  const newMsg = {
    id: Date.now(),
    type: 'sent' as const,
    content: inputText.value,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    status: 'sending' as const,
  }
  messages.value.push(newMsg)
  inputText.value = ''
  setTimeout(() => {
    const m = messages.value.find(x => x.id === newMsg.id)
    if (m) m.status = 'sent'
  }, 1000)
  setTimeout(() => {
    const m = messages.value.find(x => x.id === newMsg.id)
    if (m) m.status = 'read'
  }, 3000)
}

function handleLongPress(id: number) { selectedMsgId.value = id; showMsgMenu.value = true }
function handleCopy() { showMsgMenu.value = false; uni.showToast({ title: '已复制', icon: 'success' }) }
function handleRecall() { showMsgMenu.value = false; uni.showToast({ title: '已撤回', icon: 'success' }) }
function handleDelete() { showMsgMenu.value = false; uni.showToast({ title: '已删除', icon: 'success' }) }
function handleResend(id: number) { uni.showToast({ title: '重新发送', icon: 'none' }) }
function handleVoice() { uni.showToast({ title: '语音输入开发中', icon: 'none' }) }
function handleImage() { uni.showToast({ title: '图片选择开发中', icon: 'none' }) }
function handleEmoji() { uni.showToast({ title: '表情选择开发中', icon: 'none' }) }
function goPage(url: string) { uni.navigateTo({ url }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.ch-page { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }

.header-sticky { flex-shrink: 0; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 20rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-user { display: flex; align-items: center; gap: 10rpx; flex: 1; }
.hu-avatar { width: 52rpx; height: 52rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #C41E3A; flex-shrink: 0; }
.hu-info { flex: 1; min-width: 0; }
.hu-name-row { display: flex; align-items: center; gap: 8rpx; }
.hu-name { font-size: 26rpx; font-weight: 500; color: #333; }
.hu-role { font-size: 16rpx; padding: 2rpx 8rpx; border-radius: 4rpx; }
.hu-role.teacher { background: rgba(240,160,48,0.12); color: #F0A030; }
.hu-role.owner { background: rgba(196,30,58,0.08); color: #C41E3A; }
.hu-status { display: flex; align-items: center; gap: 6rpx; }
.hu-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #CCC; }
.hu-dot.online { background: #52C41A; }
.hu-status text { font-size: 18rpx; color: #BBB; }

.header-menu { position: relative; }
.hm-trigger { font-size: 36rpx; color: #333; width: 56rpx; text-align: center; }
.hm-drop { position: absolute; right: 0; top: 50rpx; z-index: 50; }
.hm-mask { position: fixed; inset: 0; }
.hm-list { background: #fff; border-radius: 14rpx; padding: 8rpx 0; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.12); min-width: 220rpx; }
.hm-item { display: block; padding: 16rpx 24rpx; font-size: 24rpx; color: #333; }
.hm-item.danger { color: #C41E3A; }

/* 快捷栏 */
.quick-bar { display: flex; align-items: center; justify-content: space-between; padding: 12rpx 20rpx; background: #FFFBF5; border-bottom: 1px solid #F0E8D5; }
.qb-actions { display: flex; gap: 10rpx; }
.qb-btn { display: flex; align-items: center; gap: 6rpx; padding: 8rpx 16rpx; border-radius: 20rpx; background: rgba(196,30,58,0.06); }
.qb-btn text { font-size: 20rpx; color: #C41E3A; }
.qb-tag { font-size: 16rpx !important; padding: 2rpx 6rpx; border-radius: 4rpx; background: #F0A030; color: #fff !important; }
.qb-price { font-size: 16rpx !important; color: #BBB !important; }
.qb-close { font-size: 24rpx; color: #BBB; padding: 4rpx; }

/* 消息区域 */
.msg-area { flex: 1; padding: 16rpx 20rpx; }
.encrypt-tip { text-align: center; margin-bottom: 16rpx; }
.encrypt-tip text { font-size: 18rpx; color: #CCC; background: rgba(0,0,0,0.03); padding: 6rpx 18rpx; border-radius: 20rpx; }

.time-divider { text-align: center; margin: 20rpx 0; }
.time-divider text { font-size: 20rpx; color: #CCC; background: rgba(0,0,0,0.03); padding: 6rpx 16rpx; border-radius: 20rpx; }

.msg-row { display: flex; align-items: flex-end; gap: 10rpx; margin-bottom: 20rpx; }
.msg-row.sent { flex-direction: row-reverse; }
.msg-avatar { width: 52rpx; height: 52rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #C41E3A; flex-shrink: 0; }
.msg-bubble-wrap { max-width: 70%; position: relative; }
.msg-bubble-wrap.sent { display: flex; flex-direction: column; align-items: flex-end; }
.msg-bubble { padding: 14rpx 20rpx; border-radius: 16rpx; font-size: 24rpx; line-height: 1.6; color: #fff; }
.msg-bubble:not(.sent) { background: #fff; color: #333; border-radius: 16rpx 16rpx 16rpx 4rpx; }
.msg-bubble.sent { background: #C41E3A; border-radius: 16rpx 16rpx 4rpx 16rpx; }

.msg-status { display: flex; align-items: center; gap: 4rpx; margin-top: 4rpx; }
.ms-spinner { font-size: 16rpx; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.ms-sent { font-size: 16rpx; color: rgba(255,255,255,0.6); }
.ms-read { font-size: 16rpx; color: #F0A030; }
.ms-failed { font-size: 16rpx; color: #FF4D4F; }
.ms-read-text { font-size: 16rpx; color: #BBB; }
.msg-retry { font-size: 24rpx; position: absolute; left: -36rpx; top: 50%; transform: translateY(-50%); }

/* 长按菜单 */
.msg-menu-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; }
.msg-menu { background: #fff; border-radius: 16rpx; padding: 8rpx 0; min-width: 240rpx; box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.15); }
.mm-item { display: block; padding: 18rpx 32rpx; font-size: 24rpx; color: #333; text-align: center; }
.mm-item.danger { color: #C41E3A; }

/* 输入栏 */
.input-bar { flex-shrink: 0; background: #fff; border-top: 1px solid #E8E0D5; padding: 14rpx 16rpx; padding-bottom: calc(14rpx + env(safe-area-inset-bottom)); }
.ib-row { display: flex; align-items: center; gap: 8rpx; }
.ib-btn { font-size: 28rpx; width: 48rpx; text-align: center; }
.ib-input-wrap { flex: 1; }
.ib-input { width: 100%; height: 64rpx; background: #F5F1EB; border-radius: 32rpx; padding: 0 20rpx; font-size: 24rpx; color: #333; box-sizing: border-box; }
.ib-send { width: 60rpx; height: 60rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ib-send text { font-size: 24rpx; color: #fff; }
.ib-send.disabled { background: #F5F1EB; }
.ib-send.disabled text { color: #BBB; }
</style>
