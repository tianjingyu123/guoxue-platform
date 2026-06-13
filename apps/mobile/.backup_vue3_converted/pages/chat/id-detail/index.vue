<template>
  <view class="min-h-screen flex flex-col" style="background-color: #FAF8F5; max-width: 750rpx; margin: 0 auto;">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50" style="background-color: rgba(255,255,255,0.95); border-bottom: 2rpx solid #E8E0D5; backdrop-filter: blur(20rpx);">
      <view class="flex items-center justify-between" style="padding: 0 32rpx; height: 112rpx;">
        <view @click="goBack" style="padding: 16rpx;">
          <text style="font-size: 36rpx; color: #2C2C2C;">←</text>
        </view>

        <view class="flex items-center" style="gap: 16rpx;">
          <view style="width: 64rpx; height: 64rpx; border-radius: 50%; background-color: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center;">
            <text style="font-size: 22rpx; color: #C41E3A; font-weight: 500;">{{ user.name[0] }}</text>
          </view>
          <view>
            <view class="flex items-center" style="gap: 12rpx;">
              <text style="font-size: 28rpx; font-weight: 500; color: #2C2C2C;">{{ user.name }}</text>
              <text v-if="user.role === 'teacher'"
                style="font-size: 16rpx; padding: 2rpx 8rpx; background-color: rgba(201,169,110,0.2); color: #C9A96E; border-radius: 4rpx;">讲师</text>
              <text v-if="user.role === 'circleOwner'"
                style="font-size: 16rpx; padding: 2rpx 8rpx; background-color: rgba(196,30,58,0.2); color: #C41E3A; border-radius: 4rpx;">圈主</text>
            </view>
            <view class="flex items-center" style="gap: 8rpx;">
              <view :style="{ width: '12rpx', height: '12rpx', borderRadius: '50%', backgroundColor: user.isOnline ? '#22C55E' : 'rgba(153,153,153,0.5)' }" />
              <text style="font-size: 18rpx; color: #999999;">{{ user.isOnline ? '在线' : '离线' }}</text>
            </view>
          </view>
        </view>

        <!-- 更多菜单 -->
        <view style="position: relative;">
          <view @click="showMenu = !showMenu" style="padding: 16rpx;">
            <text style="font-size: 36rpx; color: #2C2C2C;">⋮</text>
          </view>
          <view v-if="showMenu"
            style="position: absolute; right: 0; top: 100%; margin-top: 16rpx; width: 320rpx; background-color: #FFFFFF; border-radius: 16rpx; border: 2rpx solid #E8E0D5; z-index: 999; overflow: hidden; box-shadow: 0 16rpx 64rpx rgba(0,0,0,0.1);">
            <view @click="goTo('/pages/profile/' + userId + '/index')" style="display: flex; align-items: center; gap: 16rpx; padding: 24rpx 32rpx; font-size: 26rpx; color: #2C2C2C;">
              <text style="font-size: 28rpx;"></text>
              <text>查看主页</text>
            </view>
            <view @click="clearChat" style="display: flex; align-items: center; gap: 16rpx; padding: 24rpx 32rpx; font-size: 26rpx; color: #2C2C2C;">
              <text style="font-size: 28rpx;">🗑️</text>
              <text>清空聊天记录</text>
            </view>
            <view @click="goTo('/pages/report/index?type=user&id=' + userId)" style="display: flex; align-items: center; gap: 16rpx; padding: 24rpx 32rpx; font-size: 26rpx; color: #DC2626;">
              <text style="font-size: 28rpx;"></text>
              <text>举报</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 快捷功能入口 -->
      <view v-if="showQuickActions && (user.role === 'teacher' || user.role === 'circleOwner')"
        style="padding: 16rpx 32rpx; background-color: rgba(245,241,235,0.3); border-bottom: 2rpx solid #E8E0D5;">
        <view class="flex items-center justify-between">
          <view class="flex items-center" style="gap: 16rpx;">
            <!-- 向TA提问 -->
            <view v-if="user.role === 'teacher'"
              style="display: flex; align-items: center; gap: 12rpx; padding: 12rpx 24rpx; background-color: rgba(196,30,58,0.1); color: #C41E3A; font-size: 22rpx; font-weight: 500; border-radius: 999rpx;">
              <text style="font-size: 26rpx;"></text>
              <text>向TA提问</text>
              <text style="font-size: 16rpx; padding: 4rpx 8rpx; background-color: #C9A96E; color: #FFFFFF; border-radius: 4rpx; margin-left: 8rpx;">付费</text>
            </view>
            <!-- 音频连麦 -->
            <view v-if="user.role === 'teacher'"
              style="display: flex; align-items: center; gap: 12rpx; padding: 12rpx 24rpx; background-color: rgba(201,169,110,0.1); color: #C9A96E; font-size: 22rpx; font-weight: 500; border-radius: 999rpx;">
              <text style="font-size: 26rpx;">📞</text>
              <text>音频连麦</text>
              <text style="font-size: 18rpx; color: #999999; margin-left: 8rpx;">¥5/分钟</text>
            </view>
            <!-- 查看圈子 -->
            <view v-if="user.role === 'circleOwner' && user.circleName" @click="goTo('/pages/circle/1')"
              style="display: flex; align-items: center; gap: 12rpx; padding: 12rpx 24rpx; background-color: rgba(196,30,58,0.1); color: #C41E3A; font-size: 22rpx; font-weight: 500; border-radius: 999rpx;">
              <text style="font-size: 26rpx;"></text>
              <text>查看TA的圈子</text>
            </view>
          </view>
          <view @click="showQuickActions = false" style="padding: 8rpx; color: #999999;">
            <text style="font-size: 28rpx;">✕</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 消息列表 -->
    <scroll-view scroll-y class="flex-1" style="padding: 32rpx; height: 0;" :scroll-into-view="'msg-' + lastMsgId">
      <!-- 加密提示 -->
      <view class="flex justify-center" style="margin-bottom: 32rpx;">
        <text style="font-size: 16rpx; color: rgba(153,153,153,0.7); background-color: rgba(245,241,235,0.5); padding: 8rpx 24rpx; border-radius: 999rpx;">
          消息已加密，仅对话双方可见
        </text>
      </view>

      <view v-for="(msg, index) in messages" :key="msg.id" :id="'msg-' + msg.id">
        <!-- 时间分割线 -->
        <view v-if="shouldShowTimeDivider(index)" class="flex justify-center" style="margin: 32rpx 0;">
          <text style="font-size: 16rpx; color: #999999; background-color: rgba(245,241,235,0.5); padding: 8rpx 24rpx; border-radius: 999rpx;">
            {{ msg.time }}
          </text>
        </view>

        <!-- 消息气泡 -->
        <view :class="['flex items-end', msg.type === 'sent' ? 'justify-end' : 'justify-start']" style="gap: 16rpx; margin-bottom: 24rpx;"
          @longpress="handleMessageLongPress(msg.id)">
          <!-- 接收方头像 -->
          <view v-if="msg.type === 'received'"
            style="width: 64rpx; height: 64rpx; border-radius: 50%; background-color: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <text style="font-size: 22rpx; color: #C41E3A;">{{ user.name[0] }}</text>
          </view>

          <!-- 气泡内容 -->
          <view :style="{
            maxWidth: '70%',
            padding: '16rpx 24rpx',
            borderRadius: '24rpx',
            fontSize: '26rpx',
            lineHeight: 1.6,
            backgroundColor: msg.type === 'sent' ? '#C41E3A' : '#F0EBE5',
            color: msg.type === 'sent' ? '#FFFFFF' : '#2C2C2C',
            borderBottomLeftRadius: msg.type === 'sent' ? '24rpx' : '8rpx',
            borderBottomRightRadius: msg.type === 'sent' ? '8rpx' : '24rpx'
          }">
            <text>{{ msg.content }}</text>
          </view>

          <!-- 发送状态（仅自己发的） -->
          <view v-if="msg.type === 'sent'" style="font-size: 20rpx; display: flex; align-items: center; gap: 4rpx;">
            <text v-if="msg.status === 'sending'" style="font-size: 20rpx; color: #999999;">⟳</text>
            <text v-else-if="msg.status === 'sent'" style="font-size: 22rpx; color: rgba(255,255,255,0.7);">✓</text>
            <text v-else-if="msg.status === 'read'" style="font-size: 22rpx; color: #C9A96E;">✓✓</text>
            <text v-else-if="msg.status === 'failed'" style="font-size: 22rpx; color: #DC2626;">⚠</text>
          </view>

          <!-- 失败重试按钮 -->
          <view v-if="msg.status === 'failed'"
            style="color: #DC2626; font-size: 28rpx; padding: 8rpx;">
            <text>⚠</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 消息长按菜单 -->
    <view v-if="showMessageMenu && selectedMessage !== null" style="position: fixed; inset: 0; z-index: 999;">
      <view style="position: fixed; inset: 0; background-color: rgba(0,0,0,0.2);" @click="showMessageMenu = false" />
      <view style="position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 999; background-color: #FFFFFF; border-radius: 16rpx; border: 2rpx solid #E8E0D5; overflow: hidden; box-shadow: 0 16rpx 64rpx rgba(0,0,0,0.15);">
        <view @click="handleCopy" class="flex items-center" style="gap: 24rpx; padding: 24rpx 48rpx; font-size: 26rpx; color: #2C2C2C;">
          <text style="font-size: 28rpx;"></text>
          <text>复制</text>
        </view>
        <view @click="handleRevoke" class="flex items-center" style="gap: 24rpx; padding: 24rpx 48rpx; font-size: 26rpx; color: #2C2C2C;">
          <text style="font-size: 28rpx;"></text>
          <text>撤回</text>
        </view>
        <view @click="handleDelete" class="flex items-center" style="gap: 24rpx; padding: 24rpx 48rpx; font-size: 26rpx; color: #DC2626;">
          <text style="font-size: 28rpx;">🗑️</text>
          <text>删除</text>
        </view>
      </view>
    </view>

    <!-- 底部输入区 -->
    <view style="border-top: 2rpx solid #E8E0D5; background-color: rgba(255,255,255,0.95); padding: 24rpx 32rpx; padding-bottom: calc(env(safe-area-inset-bottom) + 24rpx);">
      <view class="flex items-end" style="gap: 16rpx;">
        <!-- 附件按钮 -->
        <view class="flex items-center" style="gap: 8rpx;">
          <view style="padding: 16rpx; border-radius: 50%; color: #999999;">
            <text style="font-size: 36rpx;"></text>
          </view>
          <view style="padding: 16rpx; border-radius: 50%; color: #999999;">
            <text style="font-size: 36rpx;">️</text>
          </view>
          <view style="padding: 16rpx; border-radius: 50%; color: #999999;">
            <text style="font-size: 36rpx;">😊</text>
          </view>
        </view>

        <!-- 输入框 -->
        <view style="flex: 1; position: relative;">
          <input v-model="inputText" @confirm="handleSend" placeholder="输入消息..."
            style="width: 100%; height: 80rpx; padding: 0 32rpx; background-color: #F5F1EB; border-radius: 999rpx; font-size: 26rpx; color: #2C2C2C;"
            placeholder-style="color: #999999;" />
        </view>

        <!-- 发送按钮 -->
        <view @click="handleSend"
          :style="{
            width: '80rpx',
            height: '80rpx',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: inputText.trim() ? '#C41E3A' : '#F5F1EB'
          }">
          <text :style="{ fontSize: '32rpx', color: inputText.trim() ? '#FFFFFF' : '#999999' }">➤</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

type MessageStatus = 'sending' | 'sent' | 'read' | 'failed'

interface Message {
  id: number
  type: 'sent' | 'received'
  content: string
  time: string
  status: MessageStatus
  isImage?: boolean
}

// 模拟聊天用户数据（与 V0 完全一致）
const chatUsers: Record<string, {
  name: string
  avatar: string
  isOnline: boolean
  role: 'teacher' | 'circleOwner' | 'user'
  circleName?: string
}> = {
  '1': { name: '张易道', avatar: '', isOnline: true, role: 'teacher' },
  '2': { name: '李玄明', avatar: '', isOnline: false, role: 'circleOwner', circleName: '紫微斗数研习社' },
  '3': { name: '王小明', avatar: '', isOnline: true, role: 'user' },
}

// 模拟消息数据（与 V0 完全一致）
const initialMessages: Message[] = [
  { id: 1, type: 'received', content: '你好，请问有什么可以帮助你的吗？', time: '09:30', status: 'read' },
  { id: 2, type: 'sent', content: '老师您好，我想请教一下关于八字中日主弱的问题', time: '09:31', status: 'read' },
  { id: 3, type: 'received', content: '好的，日主弱是指日干在整个命局中得到的生扶力量较少。你可以把你的八字发给我看看。', time: '09:32', status: 'read' },
  { id: 4, type: 'sent', content: '我的八字是：甲子年 丙寅月 己卯日 乙亥时', time: '09:35', status: 'read' },
  { id: 5, type: 'received', content: '从你的八字来看，己土日主生于寅月，寅中甲木为七杀，木旺土弱。时支亥水又泄土气，确实是日主偏弱的格局。建议你在大运和流年遇到火土旺的年份会比较顺利。', time: '09:38', status: 'read' },
  { id: 6, type: 'sent', content: '明白了，谢谢老师的指点！那我还想问一下...', time: '14:20', status: 'sent' },
]

const userId = ref('')
const user = ref(chatUsers['1'])
const messages = ref<Message[]>(initialMessages)
const inputText = ref('')
const showMenu = ref(false)
const showQuickActions = ref(true)
const selectedMessage = ref<number | null>(null)
const showMessageMenu = ref(false)

const lastMsgId = computed(() => {
  if (messages.value.length === 0) return 0
  return messages.value[messages.value.length - 1].id
})

onLoad((options) => {
  if (options?.id) {
    userId.value = options.id as string
    user.value = chatUsers[userId.value] || chatUsers['1']
  }
})

function handleSend() {
  if (!inputText.value.trim()) return

  const newMessage: Message = {
    id: Date.now(),
    type: 'sent',
    content: inputText.value,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    status: 'sending',
  }

  messages.value = [...messages.value, newMessage]
  inputText.value = ''

  // 模拟发送成功
  setTimeout(() => {
    messages.value = messages.value.map(msg =>
      msg.id === newMessage.id ? { ...msg, status: 'sent' as MessageStatus } : msg
    )
  }, 1000)

  // 模拟已读
  setTimeout(() => {
    messages.value = messages.value.map(msg =>
      msg.id === newMessage.id ? { ...msg, status: 'read' as MessageStatus } : msg
    )
  }, 3000)
}

function handleMessageLongPress(msgId: number) {
  selectedMessage.value = msgId
  showMessageMenu.value = true
}

function handleCopy() {
  const msg = messages.value.find(m => m.id === selectedMessage.value)
  if (msg) {
    uni.setClipboardData({ data: msg.content })
    uni.showToast({ title: '已复制', icon: 'none' })
  }
  showMessageMenu.value = false
}

function handleRevoke() {
  if (selectedMessage.value !== null) {
    messages.value = messages.value.filter(m => m.id !== selectedMessage.value)
    uni.showToast({ title: '已撤回', icon: 'none' })
  }
  showMessageMenu.value = false
}

function handleDelete() {
  if (selectedMessage.value !== null) {
    const msg = messages.value.find(m => m.id === selectedMessage.value)
    if (msg) {
      // V0 only deletes for sent messages; here we delete any
      messages.value = messages.value.filter(m => m.id !== selectedMessage.value)
      uni.showToast({ title: '已删除', icon: 'none' })
    }
  }
  showMessageMenu.value = false
}

function clearChat() {
  messages.value = []
  showMenu.value = false
  uni.showToast({ title: '聊天记录已清空', icon: 'none' })
}

function shouldShowTimeDivider(index: number): boolean {
  if (index === 0) return true
  const currentTime = messages.value[index].time
  const prevTime = messages.value[index - 1].time
  return currentTime !== prevTime && (
    currentTime.split(':')[0] !== prevTime.split(':')[0] ||
    Math.abs(parseInt(currentTime.split(':')[1]) - parseInt(prevTime.split(':')[1])) >= 5
  )
}

function goBack() {
  uni.navigateBack()
}

function goTo(url: string) {
  showMenu.value = false
  uni.navigateTo({ url })
}
</script>

<style scoped>
.flex { display: flex; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.items-end { align-items: flex-end; }
.justify-end { justify-content: flex-end; }
.justify-start { justify-content: flex-start; }
</style>
