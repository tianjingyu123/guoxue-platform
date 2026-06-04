<template>
  <view class="page">
    <!-- 加载态 -->
    <LoadingSkeleton v-if="loading" type="detail" />

    <!-- 错误态 -->
    <EmptyState
      v-else-if="loadError || !target"
      icon="⚠️"
      title="加载失败"
      :description="loadError || '聊天对象不存在'"
      action-text="重新加载"
      :show-action="true"
      @action="loadChat"
    />

    <!-- 聊天界面 -->
    <view v-else class="chat-layout">
      <!-- 导航栏 -->
      <view class="nav">
        <view class="nav-left">
          <text class="nav-back" @click="goBack">←</text>
          <view class="nav-user" @click="goUserProfile">
            <view class="nav-avatar-wrap">
              <image :src="target.avatar || ''" class="nav-avatar" mode="aspectFill" />
              <view v-if="target.isOnline" class="nav-online" />
            </view>
            <view class="nav-user-info">
              <text class="nav-user-name">{{ target.remark || target.nickname }}</text>
              <text class="nav-user-status">{{ target.isOnline ? '在线' : target.lastActiveAt || '离线' }}</text>
            </view>
          </view>
        </view>
        <text class="nav-more" @click="showNavMenu = !showNavMenu">⋮</text>
        <!-- 下拉菜单 -->
        <view v-if="showNavMenu" class="nav-dropdown">
          <view class="dropdown-item" @click="goUserProfile">查看主页</view>
          <view class="dropdown-item">清空聊天记录</view>
          <view class="dropdown-item dropdown-danger">{{ target.isBlocked ? '移出黑名单' : '加入黑名单' }}</view>
        </view>
      </view>

      <!-- 消息列表 -->
      <scroll-view
        ref="msgContainerRef"
        scroll-y
        class="msg-list"
        :scroll-top="scrollTop"
        @scrolltolower="loadMore"
      >
        <!-- 加载更多 -->
        <view v-if="loadingMore" class="load-more-indicator">加载中...</view>
        <view v-if="hasMore && !loadingMore && messages.length > 0" class="load-more-btn" @click="loadMore">
          加载更多消息
        </view>

        <view v-for="(msg, idx) in messages" :key="msg.id || idx" class="msg-item">
          <!-- 时间标签 -->
          <view v-if="shouldShowTime(msg, messages[idx - 1])" class="time-label">
            <text>{{ formatTime(msg.timestamp) }}</text>
          </view>
          <!-- 消息气泡 -->
          <view class="msg-row" :class="{ mine: msg.fromMe }">
            <!-- 头像 -->
            <image
              :src="msg.fromMe ? myAvatar : (msg.senderAvatar || targetAvatar)"
              class="msg-avatar"
              mode="aspectFill"
              @click="msg.fromMe ? null : goUserProfile"
            />
            <!-- 气泡 -->
            <view class="msg-bubble-wrap">
              <view
                class="msg-bubble"
                :class="{
                  mine: msg.fromMe,
                  withdrawn: msg.isWithdrawn,
                  'is-card': msg.type === 'card',
                }"
                @longpress="onMsgLongPress(msg)"
              >
                <!-- 已撤回 -->
                <text v-if="msg.isWithdrawn" class="withdrawn-text">消息已撤回</text>
                <!-- 文本 -->
                <text v-else-if="msg.type === 'text'" class="msg-text">{{ msg.content }}</text>
                <!-- 图片 -->
                <image
                  v-else-if="msg.type === 'image'"
                  :src="msg.image?.url"
                  class="msg-image"
                  mode="aspectFill"
                  @click="previewImage(msg.image?.url)"
                />
                <!-- 语音 -->
                <view v-else-if="msg.type === 'voice'" class="voice-wrap">
                  <text class="voice-play">▶</text>
                  <text class="voice-duration">{{ msg.voice?.duration || 0 }}″</text>
                  <view class="voice-bar"><view class="voice-progress" /></view>
                </view>
                <!-- 商品卡片 -->
                <view v-else-if="msg.type === 'card' && msg.product" class="card-wrap" @click="goProduct(msg.product)">
                  <image :src="msg.product.cover" class="card-cover" mode="aspectFill" />
                  <view class="card-info">
                    <text class="card-title">{{ msg.product.title }}</text>
                    <view class="card-price-row">
                      <text class="card-price">¥{{ msg.product.price }}</text>
                      <text v-if="msg.product.originalPrice" class="card-original">¥{{ msg.product.originalPrice }}</text>
                    </view>
                  </view>
                </view>
              </view>
              <!-- 消息状态 -->
              <text v-if="msg.fromMe" class="msg-status" :class="msg.status">
                {{ msg.status === 'sending' ? '发送中' : msg.status === 'failed' ? '失败' : msg.status === 'read' ? '✓✓' : '✓' }}
              </text>
            </view>
          </view>
        </view>
        <view id="msg-end" />
      </scroll-view>

      <!-- 底部输入区 -->
      <view class="input-area">
        <view class="input-row">
          <text class="input-plus" @click="showMorePanel = !showMorePanel">
            {{ showMorePanel ? '✕' : '＋' }}
          </text>
          <view class="input-wrap">
            <input
              v-model="inputText"
              class="input-field"
              placeholder="输入消息..."
              :confirm-type="'send'"
              @confirm="sendText"
            />
          </view>
          <text v-if="inputText.trim()" class="input-send" @click="sendText">
            {{ sending ? '...' : '➤' }}
          </text>
          <text v-else class="input-mic" @touchstart="onMicStart" @touchend="onMicEnd">🎤</text>
        </view>

        <!-- 更多功能面板 -->
        <view v-if="showMorePanel" class="more-panel">
          <view class="more-item" @click="pickImage">
            <view class="more-icon">🖼</view>
            <text class="more-label">相册</text>
          </view>
          <view class="more-item">
            <view class="more-icon">📷</view>
            <text class="more-label">拍照</text>
          </view>
          <view class="more-item">
            <view class="more-icon">🎤</view>
            <text class="more-label">语音</text>
          </view>
          <view class="more-item" @click="openProductSearch">
            <view class="more-icon">🛍</view>
            <text class="more-label">商品</text>
          </view>
        </view>
      </view>

      <!-- 消息操作菜单 -->
      <view v-if="showMsgActions" class="sheet-mask" @click="closeMsgActions">
        <view class="sheet-content sheet-bottom" @click.stop>
          <view class="action-row-sm">
            <view v-if="selectedMsg?.type === 'text'" class="action-item-sm" @click="copyMsg">
              <view class="action-icon-sm">📋</view>
              <text>复制</text>
            </view>
            <view v-if="selectedMsg?.fromMe && canWithdraw(selectedMsg.timestamp)" class="action-item-sm" @click="showWithdrawConfirm = true">
              <view class="action-icon-sm">↩</view>
              <text>撤回</text>
            </view>
            <view class="action-item-sm" @click="showDeleteConfirm = true">
              <view class="action-icon-sm">🗑</view>
              <text>删除</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 商品搜索弹层 -->
      <view v-if="showProductSearch" class="sheet-mask" @click="showProductSearch = false">
        <view class="sheet-content sheet-partial" @click.stop>
          <view class="product-search-header">
            <text class="product-search-title">选择商品</text>
          </view>
          <view class="product-search-body">
            <view class="product-search-input-wrap">
              <input v-model="productKeyword" class="product-search-input" placeholder="搜索商品" @confirm="searchProducts" />
              <text class="product-search-btn" @click="searchProducts">🔍</text>
            </view>
            <scroll-view scroll-y class="product-list">
              <view
                v-for="p in products"
                :key="p.id"
                class="product-item"
                @click="sendProductCard(p)"
              >
                <image :src="p.cover" class="product-cover" mode="aspectFill" />
                <view class="product-info">
                  <text class="product-title">{{ p.title }}</text>
                  <view class="product-price-row">
                    <text class="product-price">¥{{ p.price }}</text>
                    <text v-if="p.originalPrice" class="product-original">¥{{ p.originalPrice }}</text>
                  </view>
                </view>
              </view>
              <view v-if="products.length === 0 && !searchingProducts" class="product-empty">暂无商品</view>
            </scroll-view>
          </view>
        </view>
      </view>

      <!-- 撤回确认 -->
      <view v-if="showWithdrawConfirm" class="dialog-mask" @click="showWithdrawConfirm = false">
        <view class="dialog-box" @click.stop>
          <text class="dialog-title">撤回消息</text>
          <text class="dialog-desc">确定要撤回这条消息吗？撤回后对方将无法看到。</text>
          <view class="dialog-btns">
            <text class="dialog-btn dialog-btn-cancel" @click="showWithdrawConfirm = false">取消</text>
            <text class="dialog-btn dialog-btn-primary" @click="doWithdraw">撤回</text>
          </view>
        </view>
      </view>

      <!-- 删除确认 -->
      <view v-if="showDeleteConfirm" class="dialog-mask" @click="showDeleteConfirm = false">
        <view class="dialog-box" @click.stop>
          <text class="dialog-title">删除消息</text>
          <text class="dialog-desc">确定要删除这条消息吗？删除后仅自己不可见。</text>
          <view class="dialog-btns">
            <text class="dialog-btn dialog-btn-cancel" @click="showDeleteConfirm = false">取消</text>
            <text class="dialog-btn dialog-btn-danger" @click="doDelete">删除</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { api, imApi, uploadApi } from '../../api'

interface ChatMessage {
  id: string | number
  fromMe: boolean
  senderAvatar?: string
  type: 'text' | 'image' | 'voice' | 'card'
  content: string
  image?: { url: string; width?: number; height?: number }
  voice?: { duration: number }
  product?: { id: string; title: string; cover: string; price: number; originalPrice?: number }
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  isWithdrawn: boolean
  timestamp: number
}

interface ChatTarget {
  id: string
  nickname: string
  remark?: string
  avatar?: string
  isOnline?: boolean
  lastActiveAt?: string
  isBlocked?: boolean
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const target = ref<ChatTarget | null>(null)
const messages = ref<ChatMessage[]>([])
const targetId = ref('')
const targetAvatar = ref('')
const myAvatar = ref('')
const loadingMore = ref(false)
const hasMore = ref(true)
const scrollTop = ref(0)

const inputText = ref('')
const sending = ref(false)
const showMorePanel = ref(false)
const showNavMenu = ref(false)
const showProductSearch = ref(false)
const productKeyword = ref('')
const products = ref<any[]>([])
const searchingProducts = ref(false)

const selectedMsg = ref<ChatMessage | null>(null)
const showMsgActions = ref(false)
const showWithdrawConfirm = ref(false)
const showDeleteConfirm = ref(false)
const isRecording = ref(false)

onMounted(() => {
  const pages = getCurrentPages()
  const opts = (pages[pages.length - 1] as any)?.options || {}
  targetId.value = opts.userId || ''
  myAvatar.value = uni.getStorageSync('myAvatar') || ''
  loadChat()
})

async function loadChat() {
  if (!targetId.value) {
    loadError.value = '缺少用户ID'
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = null
  try {
    const [profileData, historyData] = await Promise.all([
      api.get('/users/' + targetId.value),
      imApi.getC2CHistory(targetId.value),
    ])
    const user = profileData || {}
    target.value = {
      id: targetId.value,
      nickname: user.nickname || '用户' + targetId.value,
      remark: user.remark,
      avatar: user.avatar || '',
      isOnline: user.isOnline,
      lastActiveAt: user.lastActiveAt,
      isBlocked: user.isBlocked,
    }
    targetAvatar.value = target.value.avatar || ''
    const history = Array.isArray(historyData) ? historyData : []
    messages.value = history.map((m: any) => ({
      id: m.id || Date.now(),
      fromMe: m.fromMe || m.senderId === 0,
      senderAvatar: m.senderAvatar || '',
      type: m.type || 'text',
      content: m.content || '',
      status: m.status || 'sent',
      isWithdrawn: m.isWithdrawn || false,
      timestamp: m.timestamp || Date.now(),
    }))
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
    nextTick(() => scrollToBottom())
  }
}

function goBack() {
  uni.navigateBack()
}

function goUserProfile() {
  if (target.value) {
    uni.navigateTo({ url: `/pages/user/profile?userId=${target.value.id}` })
  }
}

function scrollToBottom() {
  nextTick(() => {
    const query = uni.createSelectorQuery()
    query.select('#msg-end').boundingClientRect((rect) => {
      if (rect) {
        scrollTop.value = rect.top
      }
    }).exec()
  })
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value || messages.value.length === 0) return
  loadingMore.value = true
  try {
    const oldestMsg = messages.value[0]
    const data = await imApi.getC2CHistory(targetId.value)
    const history = Array.isArray(data) ? data : []
    if (history.length > 0) {
      const newMsgs = history.filter((m: any) => !messages.value.find((em: any) => em.id === m.id))
      messages.value = [...newMsgs.map((m: any) => ({
        id: m.id || Date.now(),
        fromMe: m.fromMe || m.senderId === 0,
        senderAvatar: m.senderAvatar || '',
        type: m.type || 'text',
        content: m.content || '',
        status: m.status || 'sent',
        isWithdrawn: m.isWithdrawn || false,
        timestamp: m.timestamp || Date.now(),
      })), ...messages.value]
    } else {
      hasMore.value = false
    }
  } catch {
    hasMore.value = false
  } finally {
    loadingMore.value = false
  }
}

// 发送文字消息
async function sendText() {
  const text = inputText.value.trim()
  if (!text || sending.value) return
  inputText.value = ''
  sending.value = true

  const tempMsg: ChatMessage = {
    id: 'temp_' + Date.now(),
    fromMe: true,
    type: 'text',
    content: text,
    status: 'sending',
    isWithdrawn: false,
    timestamp: Date.now(),
  }
  messages.value.push(tempMsg)
  nextTick(() => scrollToBottom())

  try {
    const res = await imApi.sendC2CMsg(targetId.value, text) as any
    tempMsg.status = 'sent'
    // 用服务端返回的真实 msgKey 覆盖临时 ID，以便后续撤回使用
    if (res?.data?.msgKey) {
      tempMsg.id = res.data.msgKey
    }
  } catch {
    tempMsg.status = 'failed'
  } finally {
    sending.value = false
  }
}

// 选择图片
function pickImage() {
  uni.chooseImage({
    count: 1,
    success: async (res) => {
      const filePath = res.tempFilePaths[0]
      const tempMsg: ChatMessage = {
        id: 'temp_' + Date.now(),
        fromMe: true,
        type: 'image',
        content: '',
        image: { url: filePath },
        status: 'sending',
        isWithdrawn: false,
        timestamp: Date.now(),
      }
      messages.value.push(tempMsg)
      showMorePanel.value = false
      nextTick(() => scrollToBottom())

      try {
        const uploadRes = await uploadApi.image(filePath)
        const url = uploadRes?.data?.url || uploadRes?.url || ''
        await imApi.sendC2CMsg(targetId.value, '[图片]')
        tempMsg.status = 'sent'
        tempMsg.image = { url: url || filePath }
      } catch {
        tempMsg.status = 'failed'
      }
    }
  })
}

// 商品搜索
async function openProductSearch() {
  showProductSearch.value = true
  showMorePanel.value = false
  productKeyword.value = ''
  products.value = []
  searchProducts()
}

async function searchProducts() {
  searchingProducts.value = true
  try {
    const data = await api.get('/shop/products', { keyword: productKeyword.value, pageSize: 20 })
    products.value = Array.isArray(data) ? data : data?.list || data?.items || []
  } catch {
    products.value = []
  } finally {
    searchingProducts.value = false
  }
}

async function sendProductCard(product: any) {
  const tempMsg: ChatMessage = {
    id: 'temp_' + Date.now(),
    fromMe: true,
    type: 'card',
    content: '',
    product,
    status: 'sending',
    isWithdrawn: false,
    timestamp: Date.now(),
  }
  messages.value.push(tempMsg)
  showProductSearch.value = false
  nextTick(() => scrollToBottom())
  // 模拟发送
  try {
    await imApi.sendC2CMsg(targetId.value, '[商品]' + product.title)
    tempMsg.status = 'sent'
  } catch {
    tempMsg.status = 'failed'
  }
}

function goProduct(product: any) {
  if (product?.id) {
    uni.navigateTo({ url: `/pages/shop/product?id=${product.id}` })
  }
}

// 预览图片
function previewImage(url?: string) {
  if (url) uni.previewImage({ urls: [url] })
}

// 语音
function onMicStart() {
  isRecording.value = true
}
function onMicEnd() {
  isRecording.value = false
  uni.showToast({ title: '语音功能开发中', icon: 'none' })
}

// 消息操作
function onMsgLongPress(msg: ChatMessage) {
  if (msg.isWithdrawn) return
  selectedMsg.value = msg
  showMsgActions.value = true
}

function closeMsgActions() {
  showMsgActions.value = false
  selectedMsg.value = null
}

function copyMsg() {
  if (selectedMsg.value?.content) {
    uni.setClipboardData({ data: selectedMsg.value.content })
    uni.showToast({ title: '已复制', icon: 'none' })
  }
  closeMsgActions()
}

async function doWithdraw() {
  if (!selectedMsg.value) return
  showWithdrawConfirm.value = false
  closeMsgActions()
  try {
    await imApi.withdrawMsg(targetId.value, String(selectedMsg.value.id))
    selectedMsg.value.isWithdrawn = true
  } catch {
    uni.showToast({ title: '撤回失败', icon: 'none' })
  }
}

async function doDelete() {
  if (!selectedMsg.value) return
  showDeleteConfirm.value = false
  const msgId = selectedMsg.value.id
  messages.value = messages.value.filter(m => m.id !== msgId)
  closeMsgActions()
}

// 时间工具
function formatTime(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const time = pad(d.getHours()) + ':' + pad(d.getMinutes())
  if (d.toDateString() === now.toDateString()) return time
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return '昨天 ' + time
  return pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' ' + time
}

function shouldShowTime(msg: ChatMessage, prev?: ChatMessage): boolean {
  if (!prev) return true
  return msg.timestamp - prev.timestamp > 300000 // 5分钟
}

function canWithdraw(ts: number): boolean {
  return Date.now() - ts < 120000 // 2分钟
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.chat-layout { display: flex; flex-direction: column; height: 100vh; }

/* 导航 */
.nav {
  position: relative; display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: #fff; border-bottom: 1px solid #E5E1DB; z-index: 20;
}
.nav-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.nav-back { font-size: 22px; color: #2C2C2C; padding: 4px; }
.nav-user { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.nav-avatar-wrap { position: relative; flex-shrink: 0; }
.nav-avatar { width: 34px; height: 34px; border-radius: 50%; }
.nav-online {
  position: absolute; bottom: 0; right: 0;
  width: 8px; height: 8px; border-radius: 50%;
  background: #22c55e; border: 2px solid #fff;
}
.nav-user-info { flex: 1; min-width: 0; }
.nav-user-name { font-size: 15px; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav-user-status { font-size: 11px; color: #999; display: block; }
.nav-more { font-size: 20px; color: #999; padding: 4px; }
.nav-dropdown {
  position: absolute; top: 100%; right: 12px;
  background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  min-width: 140px; z-index: 30; overflow: hidden;
}
.dropdown-item { padding: 12px 16px; font-size: 14px; color: #2C2C2C; border-bottom: 1px solid #f5f5f5; }
.dropdown-item:active { background: #F5F0E8; }
.dropdown-danger { color: #C41E3A; }

/* 消息列表 */
.msg-list { flex: 1; overflow-y: auto; padding: 12px 16px; }
.load-more-indicator { text-align: center; font-size: 12px; color: #999; padding: 8px; }
.load-more-btn { text-align: center; font-size: 13px; color: #999; padding: 8px; }
.time-label { text-align: center; margin: 8px 0; }
.time-label text { font-size: 11px; color: #999; background: rgba(0,0,0,0.04); padding: 2px 10px; border-radius: 8px; }

.msg-row { display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-end; }
.msg-row.mine { flex-direction: row-reverse; }

.msg-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; }

.msg-bubble-wrap { max-width: 70%; display: flex; flex-direction: column; }
.msg-bubble {
  padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.5;
  background: #fff; word-break: break-word;
}
.msg-bubble.mine { background: #C41E3A; color: #fff; border-radius: 16px 16px 4px 16px; }
.msg-bubble.withdrawn { background: transparent; font-style: italic; color: #999; font-size: 12px; text-align: center; }
.msg-bubble.is-card { padding: 0; background: transparent; }
.withdrawn-text { display: block; text-align: center; }
.msg-text { white-space: pre-wrap; }
.msg-image { max-width: 180px; max-height: 200px; border-radius: 8px; }
.voice-wrap { display: flex; align-items: center; gap: 8px; min-width: 80px; }
.voice-play { font-size: 16px; }
.voice-duration { font-size: 13px; }
.voice-bar { flex: 1; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden; }
.voice-progress { height: 100%; width: 0; }

/* 商品卡片 */
.card-wrap { background: #fff; border-radius: 8px; overflow: hidden; width: 200px; }
.card-cover { width: 200px; height: 120px; }
.card-info { padding: 8px 10px; }
.card-title { font-size: 13px; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-price-row { display: flex; align-items: baseline; gap: 6px; margin-top: 4px; }
.card-price { font-size: 15px; font-weight: 600; color: #C41E3A; }
.card-original { font-size: 11px; color: #999; text-decoration: line-through; }

.msg-status { font-size: 10px; margin-top: 2px; text-align: right; }
.msg-status.sending { color: #999; }
.msg-status.sent { color: #bbb; }
.msg-status.read { color: #C41E3A; }
.msg-status.failed { color: #C41E3A; }

/* 输入区 */
.input-area { background: #fff; border-top: 1px solid #E5E1DB; padding-bottom: env(safe-area-inset-bottom); }
.input-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; }
.input-plus { font-size: 22px; color: #999; padding: 4px; }
.input-wrap { flex: 1; background: #F5F0E8; border-radius: 20px; padding: 0 12px; }
.input-field { height: 36px; font-size: 14px; width: 100%; }
.input-send { font-size: 22px; color: #C41E3A; padding: 4px 8px; }
.input-mic { font-size: 20px; color: #999; padding: 4px; }

.more-panel { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 12px 16px 16px; border-top: 1px solid #E5E1DB; }
.more-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.more-icon { width: 48px; height: 48px; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 22px; }
.more-label { font-size: 11px; color: #666; }

/* 操作菜单 */
.sheet-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 100; display: flex;
}
.sheet-content { background: #fff; }
.sheet-bottom { margin-top: auto; border-radius: 16px 16px 0 0; padding: 8px 0 env(safe-area-inset-bottom); }
.action-row-sm { display: flex; justify-content: space-around; padding: 16px 20px; }
.action-item-sm { display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 12px; color: #2C2C2C; }
.action-icon-sm { width: 44px; height: 44px; border-radius: 50%; background: #F5F0E8; display: flex; align-items: center; justify-content: center; font-size: 18px; }

/* 商品搜索 */
.sheet-partial { width: 100%; height: 70vh; border-radius: 16px 16px 0 0; overflow: hidden; display: flex; flex-direction: column; }
.product-search-header { padding: 16px; border-bottom: 1px solid #E5E1DB; }
.product-search-title { font-size: 16px; font-weight: 600; }
.product-search-body { flex: 1; padding: 12px 16px; display: flex; flex-direction: column; }
.product-search-input-wrap { display: flex; gap: 8px; }
.product-search-input { flex: 1; background: #F5F0E8; border-radius: 8px; padding: 8px 12px; font-size: 14px; }
.product-search-btn { padding: 8px 12px; font-size: 16px; background: #C41E3A; color: #fff; border-radius: 8px; }
.product-list { flex: 1; overflow-y: auto; margin-top: 12px; }
.product-item { display: flex; gap: 12px; padding: 12px; border-radius: 8px; border: 1px solid #E5E1DB; margin-bottom: 8px; }
.product-item:active { background: #F5F0E8; }
.product-cover { width: 60px; height: 60px; border-radius: 6px; flex-shrink: 0; }
.product-info { flex: 1; min-width: 0; }
.product-title { font-size: 13px; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.product-price-row { display: flex; align-items: baseline; gap: 6px; margin-top: 4px; }
.product-price { font-size: 15px; font-weight: 600; color: #C41E3A; }
.product-original { font-size: 11px; color: #999; text-decoration: line-through; }
.product-empty { text-align: center; padding: 32px; font-size: 14px; color: #999; }

/* 弹窗 */
.dialog-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 200; display: flex; align-items: center; justify-content: center;
}
.dialog-box { background: #fff; border-radius: 12px; width: 280px; padding: 24px; text-align: center; }
.dialog-title { font-size: 17px; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 12px; }
.dialog-desc { font-size: 14px; color: #666; line-height: 1.5; display: block; margin-bottom: 20px; }
.dialog-btns { display: flex; gap: 12px; }
.dialog-btn { flex: 1; padding: 10px; border-radius: 8px; font-size: 15px; text-align: center; }
.dialog-btn-cancel { background: #F5F0E8; color: #666; }
.dialog-btn-primary { background: #C41E3A; color: #fff; }
.dialog-btn-danger { background: #C41E3A; color: #fff; }
</style>
