<template>
  <view class="hlive">
    <!-- 加载/错误覆盖层 -->
    <view v-if="loading" class="hlive-state">
      <view class="hlive-state__spinner" />
      <text class="hlive-state__txt">加载中...</text>
    </view>
    <view v-else-if="error" class="hlive-state">
      <text class="hlive-state__txt">{{ error }}</text>
      <view class="hlive-state__retry" @tap="fetchData(currentRoomId)"><text class="hlive-state__retry-txt">重试</text></view>
    </view>
    <template v-else>
    <!-- ============ 横屏主体（仅 ≥1024px 显示，照原型 lg:flex） ============ -->
    <view class="hlive-stage">
      <!-- 左：视频/课件主区 -->
      <view class="stage-main">
        <!-- 顶部信息栏 -->
        <view class="host-bar" :style="hostBarSafeStyle">
          <view class="host-bar__left">
            <view class="host-bar__close" @tap="goBack">
              <AppIcon name="x" :size="20" unit="px" color="rgba(255,255,255,0.8)" />
            </view>
            <smart-avatar :src="room.hostAvatar" :name="room.hostName" class="host-bar__avatar" />
            <view class="host-bar__info">
              <text class="host-bar__title">{{ room.title }}</text>
              <view class="host-bar__meta">
                <text class="host-bar__meta-item">{{ room.hostName }}</text>
                <template v-if="room.hostTitle">
                  <text class="host-bar__dot">·</text>
                  <text class="host-bar__meta-item">{{ room.hostTitle }}</text>
                </template>
              </view>
            </view>
          </view>
          <view class="host-bar__right">
            <view class="host-bar__viewers">
              <AppIcon name="users" :size="16" unit="px" color="rgba(255,255,255,0.8)" />
              <text class="host-bar__viewers-txt">{{ room.viewers.toLocaleString() }}</text>
            </view>
            <view class="host-bar__live">
              <view class="host-bar__live-dot" />
              <text class="host-bar__live-txt">直播中</text>
              <text class="host-bar__live-time">{{ room.duration }}</text>
            </view>
          </view>
        </view>

        <!-- 视频/课件区域 -->
        <view class="video-area">
          <!-- 课件展示（showVideo=false 时在上层） -->
          <view v-if="slides.length" class="slide-stage" :class="{ 'slide-stage--top': !showVideo }">
            <view class="slide-stage__inner">
              <text class="slide-stage__symbol">☯</text>
              <text class="slide-stage__title">{{ currentSlide?.title }}</text>
              <text class="slide-stage__page">第 {{ currentSlideNum }} / {{ slides.length }} 页</text>
            </view>
            <!-- 非跟随时显示翻页按钮 -->
            <template v-if="!followSlide">
              <view class="slide-nav slide-nav--prev" :style="{ left: safeLeft + 16 + 'px' }" @tap="onPrevSlide">
                <AppIcon name="chevron-left" :size="24" unit="px" color="#fff" />
              </view>
              <view class="slide-nav slide-nav--next" :style="{ right: safeRight + 16 + 'px' }" @tap="onNextSlide">
                <AppIcon name="chevron-right" :size="24" unit="px" color="#fff" />
              </view>
            </template>
          </view>

          <!-- 讲师视频画面（showVideo=true 铺满；否则缩为右下角小窗） -->
          <view class="teacher-cam" :class="{ 'teacher-cam--pip': !showVideo }" :style="!showVideo ? pipSafeStyle : undefined">
            <!-- 低延时直播画面（FLV）；未开播/加载时退回占位 -->
            <LivePlayer
              v-if="playUrl"
              :flv-url="playUrl.flv"
              :hls-url="playUrl.hls"
              object-fit="contain"
              class="teacher-cam__player"
            />
            <view v-else class="teacher-cam__inner">
              <view class="teacher-cam__avatar">
                <smart-avatar :src="room.hostAvatar" :name="room.hostName" class="teacher-cam__img" />
              </view>
              <text class="teacher-cam__label">讲师画面</text>
            </view>
          </view>

          <!-- 切换课件/视频 -->
          <view v-if="slides.length" class="switch-btn" :style="{ left: safeLeft + 16 + 'px', bottom: safeBottom + 16 + 'px' }" @tap="onToggleVideo">
            <AppIcon name="book-open" :size="16" unit="px" color="#fff" />
            <text class="switch-btn__txt">{{ showVideo ? '显示课件' : '显示视频' }}</text>
          </view>

          <!-- 全屏按钮 -->
          <view class="round-btn round-btn--fullscreen" :style="{ top: safeTop + 64 + 'px', right: safeRight + 16 + 'px' }" @tap="onToggleFullscreen">
            <AppIcon :name="isFullscreen ? 'minimize-2' : 'maximize-2'" :size="20" unit="px" color="#fff" />
          </view>

          <!-- 音量按钮 -->
          <view class="round-btn round-btn--volume" :style="{ top: safeTop + 64 + 'px', right: safeRight + 64 + 'px' }" @tap="onToggleMute">
            <AppIcon :name="isMuted ? 'volume-x' : 'volume-2'" :size="20" unit="px" color="#fff" />
          </view>

          <!-- 连麦中状态 -->
          <view v-if="supportsMic && micStatus === 'connected'" class="mic-badge" :style="{ top: safeTop + 64 + 'px', left: safeLeft + 16 + 'px' }">
            <AppIcon name="mic" :size="16" unit="px" color="#fff" />
            <text class="mic-badge__txt">连麦中</text>
            <view class="mic-badge__close" @tap="micStatus = 'none'">
              <AppIcon name="x" :size="12" unit="px" color="#fff" />
            </view>
          </view>
        </view>

        <!-- 底部课件缩略图横条 -->
        <view v-if="slides.length" class="slide-bar">
          <scroll-view scroll-x class="slide-bar__scroll">
            <view class="slide-bar__row">
              <view
                v-for="(s, idx) in slides"
                :key="s.id"
                class="thumb"
                :class="{ 'thumb--on': currentSlideNum === idx + 1 }"
                @tap="onSelectSlide(idx + 1)"
              >
                <view class="thumb__bg" />
                <text class="thumb__num">{{ idx + 1 }}</text>
                <view v-if="currentSlideNum === idx + 1" class="thumb__cur">
                  <text class="thumb__cur-txt">当前</text>
                </view>
              </view>
              <view class="slide-bar__divider" />
              <view
                class="follow-btn"
                :class="{ 'follow-btn--on': followSlide }"
                @tap="followSlide = true"
              >
                <text class="follow-btn__txt">跟随讲师</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 右：互动面板（320px） -->
      <view class="stage-panel" :style="{ paddingRight: safeRight + 'px', paddingBottom: safeBottom + 'px' }">
        <!-- Tab 头 -->
        <view class="panel-tabs">
          <view
            v-for="t in tabs"
            :key="t.key"
            class="panel-tab"
            @tap="activeTab = t.key"
          >
            <text class="panel-tab__txt" :class="{ 'panel-tab__txt--on': activeTab === t.key }">{{ t.label }}</text>
            <view v-if="activeTab === t.key" class="panel-tab__line" />
          </view>
        </view>

        <!-- 聊天 Tab -->
        <view v-if="activeTab === 'chat'" class="tab-chat">
          <scroll-view scroll-y class="tab-chat__list">
            <view v-if="!messages.length" class="chat-empty">
              <text class="chat-empty__txt">暂无聊天消息，发一条友善的消息吧</text>
            </view>
            <view v-for="m in messages" :key="m.id" class="chat-row">
              <view class="chat-row__avatar">
                <text class="chat-row__avatar-txt">{{ m.userName.charAt(0) }}</text>
              </view>
              <view class="chat-row__body">
                <view class="chat-row__head">
                  <text class="chat-row__name">{{ m.userName }}</text>
                  <text class="chat-row__time">{{ m.time }}</text>
                </view>
                <text class="chat-row__txt">{{ m.content }}</text>
              </view>
            </view>
          </scroll-view>
          <!-- 底部操作区 -->
          <view class="chat-foot">
            <view class="chat-foot__actions">
              <view class="like-btn" :class="{ 'like-btn--on': liked }" @tap="onLike">
                <AppIcon name="heart" :size="20" unit="px" :color="liked ? '#C41E3A' : 'rgba(255,255,255,0.6)'" :fill="liked" />
                <text class="like-btn__txt" :class="{ 'like-btn__txt--on': liked }">{{ likeCount.toLocaleString() }}</text>
              </view>
              <view v-if="supportsMic" class="mic-btn" :class="'mic-btn--' + micStatus" @tap="onApplyMic">
                <template v-if="micStatus === 'none'">
                  <AppIcon name="hand" :size="16" unit="px" color="#fff" />
                  <text class="mic-btn__txt">举手</text>
                </template>
                <text v-else-if="micStatus === 'applying'" class="mic-btn__txt mic-btn__txt--applying">申请中...</text>
                <template v-else-if="micStatus === 'waiting'">
                  <AppIcon name="clock" :size="16" unit="px" color="#60a5fa" />
                  <text class="mic-btn__txt mic-btn__txt--waiting">排队中</text>
                </template>
                <template v-else>
                  <AppIcon name="mic-off" :size="16" unit="px" color="#4ade80" />
                  <text class="mic-btn__txt mic-btn__txt--connected">结束</text>
                </template>
              </view>
              <view class="share-btn" @tap="onShare">
                <AppIcon name="share-2" :size="20" unit="px" color="rgba(255,255,255,0.6)" />
              </view>
            </view>
            <view class="chat-input">
              <input
                v-model="chatDraft"
                class="chat-input__field"
                placeholder="发送消息..."
                placeholder-class="input-ph"
                confirm-type="send"
                @confirm="onSendChat"
              />
              <view class="chat-input__send" @tap="onSendChat">
                <AppIcon name="send" :size="16" unit="px" color="#fff" />
              </view>
            </view>
          </view>
        </view>

        <!-- 问答 Tab -->
        <view v-else-if="activeTab === 'qa'" class="tab-qa">
          <view class="qa-subtabs">
            <view class="qa-subtab" :class="{ 'qa-subtab--on': questionTab === 'pending' }" @tap="questionTab = 'pending'">
              <text class="qa-subtab__txt">待解答 ({{ pendingCount }})</text>
            </view>
            <view class="qa-subtab" :class="{ 'qa-subtab--on': questionTab === 'answered' }" @tap="questionTab = 'answered'">
              <text class="qa-subtab__txt">已解答 ({{ answeredCount }})</text>
            </view>
          </view>
          <scroll-view scroll-y class="tab-qa__list">
            <view v-if="filteredQuestions.length === 0" class="qa-empty">
              <AppIcon name="help-circle" :size="40" unit="px" color="rgba(255,255,255,0.2)" />
              <text class="qa-empty__txt">暂无{{ questionTab === 'pending' ? '待解答' : '已解答' }}问题</text>
            </view>
            <view v-for="q in filteredQuestions" :key="q.id" class="qa-card">
              <view class="qa-card__head">
                <smart-avatar :src="q.userAvatar" :name="q.userName" class="qa-card__avatar" />
                <view class="qa-card__body">
                  <view class="qa-card__meta">
                    <text class="qa-card__name">{{ q.userName }}</text>
                    <text class="qa-card__time">{{ q.time }}</text>
                    <view v-if="!q.isPublic" class="qa-card__private">
                      <text class="qa-card__private-txt">私密</text>
                    </view>
                  </view>
                  <text class="qa-card__q">{{ q.content }}</text>
                  <view v-if="q.status === 'answered' && q.answer" class="qa-card__answer">
                    <view class="qa-card__answer-label">
                      <AppIcon name="check-circle-2" :size="12" unit="px" color="#4ade80" />
                      <text class="qa-card__answer-label-txt">讲师回复</text>
                    </view>
                    <text class="qa-card__answer-txt">{{ q.answer }}</text>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
          <view class="qa-ask">
            <view class="qa-ask__modes">
              <view class="qa-mode" :class="{ 'qa-mode--on': isPublicQuestion }" @tap="isPublicQuestion = true">
                <text class="qa-mode__txt">公开提问</text>
              </view>
              <view class="qa-mode" :class="{ 'qa-mode--on': !isPublicQuestion }" @tap="isPublicQuestion = false">
                <text class="qa-mode__txt">私密提问</text>
              </view>
            </view>
            <view class="qa-ask__row">
              <input
                v-model="questionDraft"
                class="qa-ask__field"
                placeholder="输入您的问题..."
                placeholder-class="input-ph"
                confirm-type="send"
                @confirm="onSubmitQuestion"
              />
              <view class="qa-ask__btn" :class="{ 'qa-ask__btn--disabled': !questionDraft.trim() }" @tap="onSubmitQuestion">
                <text class="qa-ask__btn-txt">提问</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 资料 Tab -->
        <view v-else-if="activeTab === 'files'" class="tab-files">
          <scroll-view scroll-y class="tab-files__list">
            <view v-for="f in files" :key="f.id" class="file-row">
              <view class="file-row__icon">
                <AppIcon name="file-text" :size="20" unit="px" color="#C41E3A" />
              </view>
              <view class="file-row__info">
                <text class="file-row__name">{{ f.name }}</text>
                <text class="file-row__size">{{ f.size }}</text>
              </view>
              <view class="file-row__dl" @tap="onDownloadFile(f.id)">
                <AppIcon name="download" :size="16" unit="px" color="rgba(255,255,255,0.6)" />
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 简介 Tab -->
        <view v-else class="tab-intro">
          <scroll-view scroll-y class="tab-intro__scroll">
            <view class="intro-host">
              <view class="intro-host__avatar">
                <smart-avatar :src="room.hostAvatar" :name="room.hostName" class="intro-host__img" />
              </view>
              <text class="intro-host__name">{{ room.hostName }}</text>
              <text v-if="room.hostTitle" class="intro-host__title">{{ room.hostTitle }}</text>
              <text class="intro-host__fans">{{ room.followers.toLocaleString() }} 粉丝</text>
            </view>
            <view class="intro-block">
              <text class="intro-block__h">课程介绍</text>
              <text class="intro-block__p">{{ room.title }}</text>
            </view>
            <view v-if="room.hostBio" class="intro-block">
              <text class="intro-block__h">讲师简介</text>
              <text class="intro-block__p intro-block__p--dim">{{ room.hostBio }}</text>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>

    <!-- ============ 窄屏（<1024px）旋转引导遮罩，照原型 lg:hidden ============ -->
    <view class="rotate-overlay" :style="{ paddingTop: safeTop + 'px', paddingRight: safeRight + 32 + 'px', paddingBottom: safeBottom + 'px', paddingLeft: safeLeft + 32 + 'px' }">
      <view class="rotate-overlay__icon">
        <AppIcon name="smartphone" :size="32" unit="px" color="#fff" />
      </view>
      <text class="rotate-overlay__title">请将手机横屏观看</text>
      <text class="rotate-overlay__sub">或使用平板/电脑获得更好的学习体验</text>
      <view class="rotate-overlay__back" @tap="goBack">
        <text class="rotate-overlay__back-txt">返回直播列表</text>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAppSafeArea } from '@/pkg-live/use-app-safe-area'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import LivePlayer from '@/components/live/live-player.vue'
import { goBack } from '@/utils/router'
import { withRef } from '@/utils/referral'
import { buildH5Url } from '@/utils/share'
import { useTim, type TimMessage } from '@/composables/useTim'
import { liveApi } from '@/lib/live-data'

// ===== 直播间数据 =====
const loading = ref(true)
const error = ref('')
const currentRoomId = ref('')
const { safeTop, safeRight, safeBottom, safeLeft } = useAppSafeArea()
const hostBarSafeStyle = computed(() => ({
  paddingTop: `${safeTop.value + 12}px`,
  paddingRight: `${safeRight.value + 16}px`,
  paddingBottom: '12px',
  paddingLeft: `${safeLeft.value + 16}px`,
}))
const pipSafeStyle = computed(() => ({
  right: `${safeRight.value + 16}px`,
  bottom: `${safeBottom.value + 16}px`,
}))
// 模板裸访问大量房间字段，保留 any 避免收敛触发大量报错
const room = ref<any>({})
// 幻灯片/问答/消息/资料列表，元素结构由后端返回，保留 any[]
const slides = ref<any[]>([])
const questions = ref<any[]>([])
const messages = ref<any[]>([])
const files = ref<any[]>([])

// ===== 实时聊天：TIM 群收发（容错降级：TIM 未就绪不崩，聊天区留空）=====
const tim = useTim()
let danmakuGroupId = ''
let offTimMessage: (() => void) | null = null

/** 当前时刻 HH:MM（聊天消息时间戳，横屏消息结构含 time 字段） */
function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 加入聊天群 + 订阅群消息上屏（仅有 imGroupId 时） */
async function joinChat(groupId: string) {
  if (!groupId) return
  danmakuGroupId = groupId
  try {
    await tim.joinGroup(groupId)
    offTimMessage = tim.onMessage((msgs: TimMessage[]) => {
      const fresh = msgs.filter((m) => m.conversationType === 'GROUP' && m.to === danmakuGroupId && m.payload?.text)
      if (!fresh.length) return
      fresh.forEach((m) => {
        messages.value.push({ id: m.ID, userName: m.nick || '观众', content: m.payload.text || '', time: nowTime() })
      })
      if (messages.value.length > 80) messages.value.splice(0, messages.value.length - 80)
    })
  } catch { /* TIM 未就绪 → 聊天降级只读空态，不阻断授课观看 */ }
}

// 低延时播放地址（C1）；仅直播中后端返回，未开播抛错→保持占位
const playUrl = ref<{ flv: string; hls: string } | null>(null)
async function fetchPlayUrl(roomId: string) {
  try { playUrl.value = await liveApi.getPlayUrl(roomId) } catch { playUrl.value = null }
}

async function fetchData(roomId: string) {
  loading.value = true
  error.value = ''
  try {
    const data = await liveApi.getHorizontalRoom(roomId)
    room.value = data.room
    slides.value = data.slides
    questions.value = data.questions
    messages.value = data.messages
    files.value = data.files
    likeCount.value = data.room.likes || 0
    // 有聊天群 → 加入 TIM 群实时收发
    if (data.room.imGroupId) joinChat(data.room.imGroupId)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

// ===== UI 状态（照原型 useState 初值）=====
const currentSlideNum = ref(1)
const followSlide = ref(true)
const showVideo = ref(true)
const isFullscreen = ref(false)
const isMuted = ref(false)
const activeTab = ref<'chat' | 'qa' | 'files' | 'intro'>('chat')
const questionTab = ref<'pending' | 'answered'>('pending')
const chatDraft = ref('')
const questionDraft = ref('')
const isPublicQuestion = ref(true)
const micStatus = ref<'none' | 'applying' | 'waiting' | 'connected'>('none')
const liked = ref(false)
const supportsMic = false
const likeCount = ref(0)

const tabs = [
  { key: 'chat', label: '聊天' },
  { key: 'intro', label: '简介' },
] as const

const currentSlide = computed(() => slides.value[currentSlideNum.value - 1])
const filteredQuestions = computed(() => questions.value.filter(q => q.status === questionTab.value))
const pendingCount = computed(() => questions.value.filter(q => q.status === 'pending').length)
const answeredCount = computed(() => questions.value.filter(q => q.status === 'answered').length)

// ===== 交互（UI 占位，业务对接由 Claude Code 完成）=====
function onToggleVideo() { showVideo.value = !showVideo.value }
function onToggleFullscreen() { isFullscreen.value = !isFullscreen.value }
function onToggleMute() { isMuted.value = !isMuted.value }
function onSelectSlide(num: number) { followSlide.value = false; currentSlideNum.value = num }
function onPrevSlide() { currentSlideNum.value = Math.max(1, currentSlideNum.value - 1) }
function onNextSlide() { currentSlideNum.value = Math.min(slides.value.length, currentSlideNum.value + 1) }
async function onLike() {
  if (liked.value) return
  liked.value = true
  likeCount.value += 1
  try {
    await liveApi.likeRoom(room.value.id)
  } catch (e) {
    liked.value = false
    likeCount.value = Math.max(0, likeCount.value - 1)
    uni.showToast({ title: (e as Error)?.message || '点赞失败，请重试', icon: 'none' })
  }
}
// 后端暂无连麦信令，入口隐藏；保留诚实降级防未来误开放。
function onApplyMic() { uni.showToast({ title: '连麦功能暂未开放', icon: 'none' }) }
// 发送聊天消息：TIM 群实时下发给其他观众 + 后端持久化，乐观上屏
let sendingChat = false
async function onSendChat() {
  const text = chatDraft.value.trim()
  if (!text || sendingChat) return
  sendingChat = true
  const localId = 'local-' + Date.now()
  messages.value.push({ id: localId, userName: '我', content: text, time: nowTime() })
  chatDraft.value = ''
  try {
    let delivered = false
    if (danmakuGroupId) {
      try { await tim.sendGroupText(danmakuGroupId, text); delivered = true } catch { /* 继续尝试服务端 */ }
    }
    try { await liveApi.sendComment(room.value.id, text); delivered = true } catch { /* 由统一失败态处理 */ }
    if (!delivered) throw new Error('消息发送失败')
  } catch (e) {
    const index = messages.value.findIndex((item) => item.id === localId)
    if (index >= 0) messages.value.splice(index, 1)
    chatDraft.value = text
    uni.showToast({ title: (e as Error)?.message || '消息发送失败，请重试', icon: 'none' })
  } finally {
    sendingChat = false
  }
}
function onSubmitQuestion() { uni.showToast({ title: '直播问答功能暂未开放', icon: 'none' }) }
function buildShareUrl(): string {
  return withRef(buildH5Url('pkg-live/horizontal/index', { id: currentRoomId.value }))
}
function onShare() {
  uni.setClipboardData({ data: buildShareUrl(), success: () => uni.showToast({ title: '链接已复制，粘贴给好友吧', icon: 'none' }), fail: () => uni.showToast({ title: '复制失败，请重试', icon: 'none' }) })
}
function onDownloadFile(_id: string) { uni.showToast({ title: '直播资料暂未开放下载', icon: 'none' }) }

onLoad((opts) => {
  // #ifdef H5
  document.documentElement.classList.add('hlive-wide-mode')
  // #endif

  currentRoomId.value = String(opts?.id || '')
  if (!currentRoomId.value) {
    loading.value = false
    error.value = '缺少直播间信息，请返回后重新进入'
    return
  }
  fetchData(currentRoomId.value)
  fetchPlayUrl(currentRoomId.value)
})

onUnmounted(() => {
  // 退订 TIM 群消息 + 退出聊天群
  if (offTimMessage) offTimMessage()
  if (danmakuGroupId) tim.quitGroup(danmakuGroupId)
  // #ifdef H5
  document.documentElement.classList.remove('hlive-wide-mode')
  // #endif
})
</script>

<style scoped>
:global(html.hlive-wide-mode body) { overflow: hidden; background: #0f0f0f; }
:global(html.hlive-wide-mode uni-app) { max-width: none !important; margin: 0 !important; transform: none !important; box-shadow: none !important; }

.hlive {
  width: 100vw;
  height: 100vh;
  background-color: #0f0f0f;
  position: fixed;
  inset: 0;
  z-index: 1000;
  overflow: hidden;
}

/* 加载/错误覆盖层 */
.hlive-state { position: absolute; inset: 0; z-index: 200; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f0f0f; }
.hlive-state__spinner { width: 48px; height: 48px; border-radius: 50%; border: 4px solid rgba(255,255,255,0.2); border-top-color: var(--brand); animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.hlive-state__txt { font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 16px; }
.hlive-state__retry { margin-top: 24px; padding: 8px 32px; background: var(--brand); border-radius: 999px; }
.hlive-state__retry-txt { font-size: 14px; color: #fff; font-weight: 500; }

/* ===== 横屏主体：仅 ≥1024px 显示 ===== */
.hlive-stage {
  display: none;
  width: 100%;
  height: 100%;
}
.stage-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
}

/* ===== 顶部信息栏 ===== */
.host-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8), transparent);
}
.host-bar__left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.host-bar__close {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.host-bar__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--brand);
  flex-shrink: 0;
}
.host-bar__info {
  min-width: 0;
}
.host-bar__title {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  display: block;
  max-width: 420px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.host-bar__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.host-bar__meta-item {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}
.host-bar__dot {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}
.host-bar__right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.host-bar__viewers {
  display: flex;
  align-items: center;
  gap: 6px;
}
.host-bar__viewers-txt {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}
.host-bar__live {
  display: flex;
  align-items: center;
  gap: 6px;
}
.host-bar__live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--brand);
}
.host-bar__live-txt {
  font-size: 14px;
  color: var(--brand);
}
.host-bar__live-time {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-left: 4px;
}

/* ===== 视频/课件区 ===== */
.video-area {
  flex: 1;
  position: relative;
  background-color: #000;
  overflow: hidden;
}
.slide-stage {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
}
.slide-stage--top { z-index: 10; }
.slide-stage__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.slide-stage__symbol {
  font-size: 60px;
  line-height: 1;
  color: #fff;
  opacity: 0.2;
  margin-bottom: 16px;
}
.slide-stage__title {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.4);
}
.slide-stage__page {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.2);
  margin-top: 8px;
}
.slide-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.slide-nav--prev { left: 16px; }
.slide-nav--next { right: 16px; }

/* 讲师画面：默认铺满，PIP 时缩为右下小窗 */
.teacher-cam {
  position: absolute;
  inset: 0;
  z-index: 10;
}
.teacher-cam__inner {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1f2937, #111827);
}
.teacher-cam__player {
  width: 100%;
  height: 100%;
}
.teacher-cam__avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  overflow: hidden;
}
.teacher-cam__img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
}
.teacher-cam__label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
}
.teacher-cam--pip {
  inset: auto;
  bottom: 16px;
  right: 16px;
  width: 208px;
  height: 160px;
  z-index: 20;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}

/* 底部左侧切换 / 右上控制 */
.switch-btn {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background-color: rgba(0, 0, 0, 0.6);
}
.switch-btn__txt {
  font-size: 14px;
  color: #fff;
}
.round-btn {
  position: absolute;
  z-index: 30;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.mic-badge {
  position: absolute;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background-color: rgba(34, 197, 94, 0.9);
}
.mic-badge__txt {
  font-size: 14px;
  color: #fff;
}
.mic-badge__close {
  margin-left: 8px;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== 底部课件缩略图横条 ===== */
.slide-bar {
  height: 80px;
  background-color: #1a1a1a;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
}
.slide-bar__scroll {
  width: 100%;
  white-space: nowrap;
}
.slide-bar__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
}
.thumb {
  position: relative;
  flex-shrink: 0;
  width: 112px;
  height: 56px;
  border-radius: 8px;
  border: 2px solid transparent;
  overflow: hidden;
}
.thumb--on { border-color: var(--brand); }
.thumb__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
}
.thumb__num {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}
.thumb__cur {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--brand);
  padding: 1px 0;
}
.thumb__cur-txt {
  font-size: 10px;
  color: #fff;
  text-align: center;
  display: block;
}
.slide-bar__divider {
  flex-shrink: 0;
  width: 1px;
  height: 40px;
  background-color: rgba(255, 255, 255, 0.1);
}
.follow-btn {
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.1);
}
.follow-btn--on { background-color: var(--brand); }
.follow-btn__txt {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}
.follow-btn--on .follow-btn__txt { color: #fff; }

/* ===== 右侧面板（320px） ===== */
.stage-panel {
  width: 320px;
  flex-shrink: 0;
  height: 100%;
  background-color: #1a1a1a;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.panel-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.panel-tab {
  flex: 1;
  position: relative;
  padding: 12px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.panel-tab__txt {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
}
.panel-tab__txt--on { color: #fff; }
.panel-tab__line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 2px;
  border-radius: 999px;
  background-color: var(--brand);
}

/* ===== 聊天 Tab ===== */
.tab-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.tab-chat__list {
  flex: 1;
  padding: 12px;
}
.chat-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.chat-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}
.chat-empty__txt { font-size: 13px; color: rgba(255, 255, 255, 0.45); }
.chat-row__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.5), rgba(201, 169, 110, 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.chat-row__avatar-txt {
  font-size: 12px;
  color: #fff;
}
.chat-row__body { flex: 1; min-width: 0; }
.chat-row__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.chat-row__name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}
.chat-row__time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
}
.chat-row__txt {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 2px;
  display: block;
}
.chat-foot {
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.chat-foot__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.like-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}
.like-btn__txt {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}
.like-btn__txt--on { color: var(--brand); }
.mic-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.1);
}
.mic-btn--applying { background-color: rgba(245, 158, 11, 0.2); }
.mic-btn--waiting { background-color: rgba(59, 130, 246, 0.2); }
.mic-btn--connected { background-color: rgba(34, 197, 94, 0.2); }
.mic-btn__txt {
  font-size: 14px;
  color: #fff;
}
.mic-btn__txt--applying { color: #fbbf24; }
.mic-btn__txt--waiting { color: #60a5fa; }
.mic-btn__txt--connected { color: #4ade80; }
.share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}
.chat-input {
  display: flex;
  align-items: center;
  gap: 8px;
}
.chat-input__field {
  flex: 1;
  height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.1);
  font-size: 14px;
  color: #fff;
}
.input-ph { color: rgba(255, 255, 255, 0.4); }
.chat-input__send {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ===== 问答 Tab ===== */
.tab-qa {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.qa-subtabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.qa-subtab {
  flex: 1;
  padding: 10px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qa-subtab--on { background-color: rgba(255, 255, 255, 0.05); }
.qa-subtab__txt {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}
.qa-subtab--on .qa-subtab__txt { color: #fff; }
.tab-qa__list {
  flex: 1;
  padding: 12px;
}
.qa-empty {
  padding: 48px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.qa-empty__txt {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
}
.qa-card {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}
.qa-card__head {
  display: flex;
  gap: 8px;
}
.qa-card__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
}
.qa-card__body { flex: 1; min-width: 0; }
.qa-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.qa-card__name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}
.qa-card__time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
}
.qa-card__private {
  padding: 1px 6px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
}
.qa-card__private-txt {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}
.qa-card__q {
  font-size: 14px;
  color: #fff;
  margin-top: 4px;
  display: block;
  line-height: 1.5;
}
.qa-card__answer {
  margin-top: 8px;
  padding-left: 12px;
  border-left: 2px solid #22c55e;
}
.qa-card__answer-label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}
.qa-card__answer-label-txt {
  font-size: 12px;
  color: #4ade80;
}
.qa-card__answer-txt {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
}
.qa-ask {
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.qa-ask__modes {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.qa-mode {
  padding: 4px 10px;
  border-radius: 999px;
}
.qa-mode--on { background-color: rgba(255, 255, 255, 0.1); }
.qa-mode__txt {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}
.qa-mode--on .qa-mode__txt { color: #fff; }
.qa-ask__row {
  display: flex;
  gap: 8px;
}
.qa-ask__field {
  flex: 1;
  height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  font-size: 14px;
  color: #fff;
}
.qa-ask__btn {
  padding: 0 16px;
  height: 40px;
  border-radius: 8px;
  background-color: var(--brand);
  display: flex;
  align-items: center;
}
.qa-ask__btn--disabled { background-color: rgba(255, 255, 255, 0.1); }
.qa-ask__btn-txt {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}
.qa-ask__btn--disabled .qa-ask__btn-txt { color: rgba(255, 255, 255, 0.3); }

/* ===== 资料 Tab ===== */
.tab-files {
  flex: 1;
  min-height: 0;
}
.tab-files__list {
  height: 100%;
  padding: 12px;
}
.file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.05);
}
.file-row__icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: rgba(196, 30, 58, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.file-row__info { flex: 1; min-width: 0; }
.file-row__name {
  font-size: 14px;
  color: #fff;
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.file-row__size {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}
.file-row__dl {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ===== 简介 Tab ===== */
.tab-intro {
  flex: 1;
  min-height: 0;
}
.tab-intro__scroll {
  height: 100%;
  padding: 16px;
}
.intro-host {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}
.intro-host__avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid var(--brand);
  overflow: hidden;
}
.intro-host__img {
  width: 100%;
  height: 100%;
}
.intro-host__name {
  font-size: 16px;
  font-weight: 500;
  color: #fff;
  margin-top: 12px;
}
.intro-host__title {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}
.intro-host__fans {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 4px;
}
.intro-block {
  margin-bottom: 16px;
}
.intro-block__h {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
  display: block;
}
.intro-block__p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}
.intro-block__p--dim { color: rgba(255, 255, 255, 0.7); }

/* ===== 窄屏旋转引导遮罩 ===== */
.rotate-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 32px;
  box-sizing: border-box;
}
.rotate-overlay__icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.rotate-overlay__title {
  font-size: 18px;
  font-weight: 500;
  color: #fff;
  margin-bottom: 8px;
}
.rotate-overlay__sub {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}
.rotate-overlay__back {
  margin-top: 24px;
  padding: 8px 24px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.1);
}
.rotate-overlay__back-txt {
  font-size: 14px;
  color: #fff;
}

/* ===== 方向断点（照原型 lg: = 1024px）===== */
@media (min-width: 1024px) {
  .hlive-stage { display: flex; }
  .rotate-overlay { display: none; }
}
</style>
