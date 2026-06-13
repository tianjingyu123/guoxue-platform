<template>
  <!-- 加载状态 -->
  <view v-if="loading" class="min-h-screen bg-background flex items-center justify-center">
    <view class="text-center">
      <text class="inline-block text-lg text-primary animate-spin">⟳</text>
      <text class="text-sm text-muted-foreground mt-2 block">加载中...</text>
    </view>
  </view>

  <!-- 错误/空状态 -->
  <view v-else-if="error || !target" class="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
    <text class="text-muted-foreground text-sm">{{ error || '加载失败' }}</text>
    <view class="px-6 py-2 bg-primary text-white rounded-full text-sm" @click="loadChat">重试</view>
  </view>

  <!-- 主聊天界面 -->
  <view v-else class="min-h-screen flex flex-col" style="background-color: rgba(245, 241, 235, 0.3)">
    <!-- ===== 导航栏 ===== -->
    <header class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1 -ml-1"><text class="text-xl text-foreground">←</text></view>
          <view class="flex items-center gap-2">
            <view class="relative">
              <!-- 头像 -->
              <view v-if="!target.avatar" class="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center text-white text-sm">
                {{ (target.remark || target.nickname)[0] }}
              </view>
              <image v-else :src="target.avatar" class="w-9 h-9 rounded-full" />
              <view v-if="target.isOnline" class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
            </view>
            <view>
              <text class="font-medium text-sm text-foreground block">{{ target.remark || target.nickname }}</text>
              <text class="text-xs text-muted-foreground block">{{ target.isOnline ? '在线' : target.lastActiveAt || '离线' }}</text>
            </view>
          </view>
        </view>
        <view @click="showMoreMenu" class="p-1 -mr-1"><text class="text-xl text-ink-soft">⋮</text></view>
      </view>
    </header>

    <!-- ===== 消息列表 ===== -->
    <scroll-view
      scroll-y
      class="flex-1 px-4 pt-4"
      :scroll-into-view="scrollAnchor"
      :style="{ paddingBottom: '60px' }"
      @scroll="onScroll"
    >
      <!-- 加载更多指示器 -->
      <view v-if="loadingMore" class="flex justify-center py-2">
        <text class="inline-block text-muted-foreground animate-spin">⟳</text>
      </view>

      <!-- 手动加载更多按钮 -->
      <view
        v-if="hasMore && !loadingMore && messages.length > 0"
        class="w-full text-center py-2"
        @click="loadMoreMessages"
      >
        <text class="text-sm text-muted-foreground">加载更多消息</text>
      </view>

      <!-- 空消息提示 -->
      <view v-if="messages.length === 0 && !loadingMore" class="flex justify-center py-10">
        <text class="text-sm text-muted-foreground">暂无消息</text>
      </view>

      <!-- 消息循环 -->
      <template v-for="(msg, idx) in messages" :key="msg.id">
        <!-- 时间标签 -->
        <view v-if="showTimeLabel(msg, idx)" class="flex justify-center mb-4">
          <text class="text-xs text-muted-foreground bg-[#F0F0F0] px-2 py-1 rounded">{{ formatTime(msg.timestamp) }}</text>
        </view>

        <!-- 消息气泡 -->
        <view :class="['flex gap-2 mb-3', msg.senderId === CURRENT_USER_ID ? 'flex-row-reverse' : '']">
          <!-- 头像 -->
          <view @click="navigateToUser(msg.senderId)">
            <view class="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs shrink-0" :class="msg.senderId === CURRENT_USER_ID ? 'bg-gradient-to-br from-primary to-[#E74C3C]' : 'bg-gradient-to-br from-accent to-[#D4B87A]'">
              {{ msg.senderName[0] || '?' }}
            </view>
          </view>

          <!-- 消息主体 -->
          <view :class="['max-w-[70%] flex flex-col gap-1', msg.senderId === CURRENT_USER_ID ? 'items-end' : 'items-start']">
            <!-- 气泡 -->
            <view
              :class="getBubbleClass(msg)"
              @longpress="handleMessageLongPress(msg)"
            >
              <!-- 撤回消息 -->
              <text v-if="msg.isWithdrawn" class="text-muted-foreground text-sm italic">消息已撤回</text>

              <!-- 文本消息 -->
              <text v-else-if="msg.type === 'text'" class="whitespace-pre-wrap break-words text-sm">{{ msg.content }}</text>

              <!-- 图片消息 -->
              <image
                v-else-if="msg.type === 'image' && msg.image"
                :src="msg.image.url"
                mode="aspectFit"
                class="max-w-[200px] max-h-[200px] rounded-lg"
                @click="previewImage(msg.image!.url)"
              />

              <!-- 语音消息 -->
              <view v-else-if="msg.type === 'voice'" class="flex items-center gap-2 min-w-[100px]">
                <view class="w-8 h-8 rounded-full flex items-center justify-center">
                  <text class="text-sm">▶</text>
                </view>
                <text class="text-sm">{{ msg.voice?.duration }}″</text>
                <view class="flex-1 h-1 bg-[#F0F0F0] rounded-full overflow-hidden">
                  <view class="h-full w-0" style="background-color: currentColor" />
                </view>
              </view>

              <!-- 商品卡片 -->
              <view v-else-if="msg.type === 'card' && msg.product" class="bg-white rounded-lg overflow-hidden border border-border">
                <view class="flex gap-3 p-3" @click="navigateToProduct(msg.product!.id)">
                  <image
                    :src="msg.product.cover || ''"
                    mode="aspectFill"
                    class="w-16 h-16 rounded"
                  />
                  <view class="flex-1 min-w-0">
                    <text class="font-medium text-sm text-foreground line-clamp-2">{{ msg.product.title }}</text>
                    <view class="flex items-baseline gap-2 mt-1">
                      <text class="text-primary font-bold text-sm">¥{{ msg.product.price }}</text>
                      <text v-if="msg.product.originalPrice" class="text-xs text-muted-foreground line-through">¥{{ msg.product.originalPrice }}</text>
                    </view>
                  </view>
                </view>
              </view>

              <!-- 兜底 -->
              <text v-else class="text-sm">{{ msg.content }}</text>
            </view>

            <!-- 消息状态（仅自己发送） -->
            <view v-if="msg.senderId === CURRENT_USER_ID" class="flex items-center gap-1 px-1">
              <text v-if="msg.status === 'sending'" class="inline-block text-xs text-muted-foreground animate-spin">⟳</text>
              <text v-else-if="msg.status === 'sent'" class="text-xs text-muted-foreground">✓</text>
              <text v-else-if="msg.status === 'delivered'" class="text-xs text-muted-foreground">✓✓</text>
              <text v-else-if="msg.status === 'read'" class="text-xs text-primary">✓✓</text>
              <text v-else-if="msg.status === 'failed'" class="text-xs text-red-500">失败</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 底部锚点 -->
      <view id="endRef" />
    </scroll-view>

    <!-- ===== 底部输入区 ===== -->
    <view class="sticky bottom-0 bg-white border-t border-border p-3" :style="{ paddingBottom: envSafeArea }">
      <view class="flex items-end gap-2">
        <!-- 加号按钮 -->
        <view
          class="w-10 h-10 rounded-full flex items-center justify-center"
          :class="showMorePanel ? 'bg-primary' : 'bg-secondary'"
          @click="showMorePanel = !showMorePanel"
        >
          <text :class="['text-lg transition-transform', showMorePanel ? 'rotate-45 text-white' : 'text-foreground']">+</text>
        </view>

        <!-- 文本输入 -->
        <view class="flex-1 relative">
          <input
            v-model="inputText"
            placeholder="输入消息..."
            class="w-full px-4 py-2.5 bg-background rounded-full text-sm outline-none text-foreground"
            @confirm="handleSendText"
            @keydown="onInputKeydown"
          />
        </view>

        <!-- 发送/录音按钮 -->
        <view v-if="inputText.trim()">
          <view
            class="w-10 h-10 bg-primary rounded-full flex items-center justify-center"
            :class="{ 'opacity-50': sending }"
            @click="handleSendText"
          >
            <text v-if="sending" class="inline-block text-white text-lg animate-spin">⟳</text>
            <text v-else class="text-white text-lg">➤</text>
          </view>
        </view>
        <view v-else>
          <view
            class="w-10 h-10 rounded-full flex items-center justify-center"
            :class="isRecording ? 'bg-red-500' : 'bg-secondary'"
            @touchstart="onMicTouchStart"
            @touchend="onMicTouchEnd"
            @touchmove="onMicTouchMove"
          >
            <text :class="['text-lg', isRecording ? 'text-white' : 'text-foreground']"></text>
          </view>
        </view>
      </view>

      <!-- 更多功能面板 -->
      <view v-if="showMorePanel" class="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
        <view class="flex flex-col items-center gap-2" @click="handleImageSelect">
          <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <text class="text-primary text-lg"></text>
          </view>
          <text class="text-xs text-foreground">相册</text>
        </view>
        <view class="flex flex-col items-center gap-2" @click="handleCamera">
          <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <text class="text-primary text-lg"></text>
          </view>
          <text class="text-xs text-foreground">拍照</text>
        </view>
        <view class="flex flex-col items-center gap-2" @click="handleVoiceCall">
          <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <text class="text-primary text-lg"></text>
          </view>
          <text class="text-xs text-foreground">语音</text>
        </view>
        <view class="flex flex-col items-center gap-2" @click="openProductSearch">
          <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <text class="text-primary text-lg"></text>
          </view>
          <text class="text-xs text-foreground">商品</text>
        </view>
      </view>
    </view>

    <!-- ===== 消息操作底部菜单 ===== -->
    <view v-if="showMessageActions" class="fixed inset-0 z-50" @click="closeMessageActions">
      <view class="absolute inset-0 bg-black/20" />
      <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl animate-[slide-up_0.25s_ease-out]" @click.stop>
        <view class="w-10 h-1 bg-[#E8E0D5] rounded-full mx-auto mt-3" />
        <view class="grid grid-cols-4 gap-4 py-6 px-6">
          <!-- 复制（仅文本消息） -->
          <view v-if="selectedMessage?.type === 'text'" class="flex flex-col items-center gap-2" @click="handleCopyMessage">
            <view class="w-12 h-12 rounded-full bg-[#F0F0F0] flex items-center justify-center">
              <text class="text-lg"></text>
            </view>
            <text class="text-xs text-foreground">复制</text>
          </view>

          <!-- 撤回（仅自己的消息且在可撤回时间内） -->
          <view
            v-if="selectedMessage?.senderId === CURRENT_USER_ID && canWithdrawMessage(selectedMessage?.timestamp || 0)"
            class="flex flex-col items-center gap-2"
            @click="showWithdrawConfirm = true"
          >
            <view class="w-12 h-12 rounded-full bg-[#F0F0F0] flex items-center justify-center">
              <text class="text-lg"></text>
            </view>
            <text class="text-xs text-foreground">撤回</text>
          </view>

          <!-- 删除 -->
          <view class="flex flex-col items-center gap-2" @click="showDeleteConfirm = true">
            <view class="w-12 h-12 rounded-full bg-[#F0F0F0] flex items-center justify-center">
              <text class="text-lg text-red-500">🗑</text>
            </view>
            <text class="text-xs text-red-500">删除</text>
          </view>
        </view>
        <view class="pb-6" />
      </view>
    </view>

    <!-- ===== 商品搜索弹层 ===== -->
    <view v-if="showProductSearch" class="fixed inset-0 z-50" @click="showProductSearch = false">
      <view class="absolute inset-0 bg-black/20" />
      <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] flex flex-col animate-[slide-up_0.25s_ease-out]" @click.stop>
        <!-- 弹层头部 -->
        <view class="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border">
          <text class="text-base font-semibold text-foreground">选择商品</text>
          <view @click="showProductSearch = false"><text class="text-lg text-muted-foreground">✕</text></view>
        </view>

        <!-- 搜索框 -->
        <view class="flex gap-2 px-4 py-3">
          <input
            v-model="productKeyword"
            placeholder="搜索商品"
            class="flex-1 px-4 py-2 bg-background rounded-full text-sm outline-none text-foreground"
            @confirm="handleSearchProducts"
          />
          <view
            class="w-10 h-10 bg-primary rounded-full flex items-center justify-center"
            :class="{ 'opacity-50': searchingProducts }"
            @click="handleSearchProducts"
          >
            <text v-if="searchingProducts" class="inline-block text-white text-sm animate-spin">⟳</text>
            <text v-else class="text-white text-sm"></text>
          </view>
        </view>

        <!-- 商品列表 -->
        <scroll-view scroll-y class="flex-1 px-4 pb-4">
          <view v-for="product in products" :key="product.id" class="flex gap-3 p-3 rounded-lg mb-2 active:bg-background" @click="handleSendProduct(product)">
            <image :src="product.cover || ''" mode="aspectFill" class="w-16 h-16 rounded" />
            <view class="flex-1 min-w-0">
              <text class="font-medium text-sm text-foreground line-clamp-2">{{ product.title }}</text>
              <view class="flex items-baseline gap-2 mt-1">
                <text class="text-primary font-bold text-sm">¥{{ product.price }}</text>
                <text v-if="product.originalPrice" class="text-xs text-muted-foreground line-through">¥{{ product.originalPrice }}</text>
              </view>
            </view>
          </view>

          <!-- 暂无商品 -->
          <view v-if="products.length === 0 && !searchingProducts" class="text-center text-muted-foreground py-8">
            <text class="text-sm">暂无商品</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ===== 撤回确认对话框 ===== -->
    <view v-if="showWithdrawConfirm" class="fixed inset-0 z-50 flex items-center justify-center" @click="showWithdrawConfirm = false">
      <view class="absolute inset-0 bg-black/40" />
      <view class="relative bg-white rounded-2xl w-[85%] max-w-sm px-6 py-6" @click.stop>
        <text class="text-lg font-semibold text-foreground block">撤回消息</text>
        <text class="text-sm text-muted-foreground block mt-2 leading-relaxed">确定要撤回这条消息吗？撤回后对方将无法看到。</text>
        <view class="flex gap-3 mt-6">
          <view
            class="flex-1 h-11 rounded-xl bg-secondary flex items-center justify-center"
            @click="showWithdrawConfirm = false"
          >
            <text class="text-sm text-foreground">取消</text>
          </view>
          <view
            class="flex-1 h-11 rounded-xl bg-primary flex items-center justify-center"
            @click="handleWithdrawMessage"
          >
            <text class="text-sm text-white">撤回</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 删除确认对话框 ===== -->
    <view v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center" @click="showDeleteConfirm = false">
      <view class="absolute inset-0 bg-black/40" />
      <view class="relative bg-white rounded-2xl w-[85%] max-w-sm px-6 py-6" @click.stop>
        <text class="text-lg font-semibold text-foreground block">删除消息</text>
        <text class="text-sm text-muted-foreground block mt-2 leading-relaxed">确定要删除这条消息吗？删除后仅自己不可见。</text>
        <view class="flex gap-3 mt-6">
          <view
            class="flex-1 h-11 rounded-xl bg-secondary flex items-center justify-center"
            @click="showDeleteConfirm = false"
          >
            <text class="text-sm text-foreground">取消</text>
          </view>
          <view
            class="flex-1 h-11 rounded-xl bg-red-500 flex items-center justify-center"
            @click="handleDeleteMessage"
          >
            <text class="text-sm text-white">删除</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

// ==================== Types ====================
interface ChatTarget {
  id: number
  nickname: string
  avatar: string
  remark: string
  isOnline: boolean
  lastActiveAt: string
  isBlocked: boolean
}

interface ChatMessage {
  id: string | number
  senderId: number
  senderName: string
  senderAvatar: string
  type: 'text' | 'image' | 'voice' | 'card'
  content: string
  image?: { url: string; width: number; height: number }
  voice?: { duration: number }
  product?: ProductCard
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  isWithdrawn: boolean
  createdAt: string
  timestamp: number
}

interface ProductCard {
  id: number
  title: string
  cover: string
  price: number
  originalPrice?: number
}

// ==================== Constants ====================
const CURRENT_USER_ID = 0

// ==================== Mock Data & API ====================
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const MOCK_PRODUCTS: ProductCard[] = [
  { id: 1, title: '八字命理全科教程', cover: '', price: 299, originalPrice: 399 },
  { id: 2, title: '风水罗盘专业版', cover: '', price: 159, originalPrice: 199 },
  { id: 3, title: '周易六爻占卜入门', cover: '', price: 99 },
  { id: 4, title: '紫微斗数精解', cover: '', price: 199, originalPrice: 259 },
  { id: 5, title: '奇门遁甲实用技法', cover: '', price: 359, originalPrice: 459 },
]

const MOCK_TARGET: ChatTarget = {
  id: 1,
  nickname: '周易大师',
  avatar: '',
  remark: '',
  isOnline: true,
  lastActiveAt: '在线',
  isBlocked: false,
}

const now = Date.now()

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 1, senderId: 2, senderName: '周易大师', senderAvatar: '',
    type: 'text', content: '你好，我是周易大师，有什么可以帮助你的？', status: 'read',
    isWithdrawn: false, createdAt: '', timestamp: now - 600000,
  },
  {
    id: 2, senderId: CURRENT_USER_ID, senderName: '我', senderAvatar: '',
    type: 'text', content: '你好，我想咨询八字问题', status: 'read',
    isWithdrawn: false, createdAt: '', timestamp: now - 570000,
  },
  {
    id: 3, senderId: 2, senderName: '周易大师', senderAvatar: '',
    type: 'text', content: '好的，请把你的出生时间告诉我', status: 'read',
    isWithdrawn: false, createdAt: '', timestamp: now - 540000,
  },
  {
    id: 4, senderId: CURRENT_USER_ID, senderName: '我', senderAvatar: '',
    type: 'text', content: '我是1990年8月15日下午3点出生的', status: 'read',
    isWithdrawn: false, createdAt: '', timestamp: now - 510000,
  },
  {
    id: 5, senderId: 2, senderName: '周易大师', senderAvatar: '',
    type: 'text', content: '好的，我来排盘分析一下。你的八字是庚午年甲申月丁亥日戊申时。日主丁火，生于申月财旺之地，正财透干，偏财藏支，属于财旺身弱的格局。', status: 'read',
    isWithdrawn: false, createdAt: '', timestamp: now - 480000,
  },
  {
    id: 6, senderId: 2, senderName: '周易大师', senderAvatar: '',
    type: 'text', content: '从大运来看，你目前正行辛巳大运，巳午未三会火局，比劫帮身，对财运和事业都有帮助。不过2024甲辰年，伤官见官，需注意口舌是非。', status: 'read',
    isWithdrawn: false, createdAt: '', timestamp: now - 450000,
  },
  {
    id: 7, senderId: CURRENT_USER_ID, senderName: '我', senderAvatar: '',
    type: 'text', content: '原来如此，那我的财运方面怎么样？', status: 'read',
    isWithdrawn: false, createdAt: '', timestamp: now - 300000,
  },
]

// 模拟API：获取聊天对象
async function getChatTarget(id: number): Promise<{ code: number; data: ChatTarget | null }> {
  await delay(300)
  return { code: 200, data: { ...MOCK_TARGET, id } }
}

// 模拟API：获取聊天历史
async function getChatHistory(
  _targetId: number,
  oldestMsgId?: string | number
): Promise<{ code: number; data: { messages: ChatMessage[]; hasMore: boolean } | null }> {
  await delay(400)
  if (oldestMsgId) {
    // 加载更多历史消息
    const olderMessages: ChatMessage[] = [
      {
        id: 100, senderId: 2, senderName: '周易大师', senderAvatar: '',
        type: 'text', content: '欢迎咨询，请问有什么可以帮你的？', status: 'read',
        isWithdrawn: false, createdAt: '', timestamp: now - 86400000,
      },
    ]
    return { code: 200, data: { messages: olderMessages, hasMore: false } }
  }
  return { code: 200, data: { messages: [...MOCK_MESSAGES], hasMore: true } }
}

// 模拟API：发送C2C消息
async function sendC2CMessage(_params: {
  targetId: number
  type: string
  content?: string
  imageUrl?: string
  productId?: number
}): Promise<{ code: number; data: { messageId: number } }> {
  await delay(600)
  return { code: 200, data: { messageId: Date.now() } }
}

// 模拟API：撤回消息
async function withdrawMessage(_messageId: string | number): Promise<{ code: number }> {
  await delay(300)
  return { code: 200 }
}

// 模拟API：删除消息
async function deleteMessage(_messageId: string | number): Promise<{ code: number }> {
  await delay(300)
  return { code: 200 }
}

// 模拟API：搜索商品
async function searchProducts(keyword: string): Promise<{ code: number; data: ProductCard[] }> {
  await delay(300)
  const filtered = keyword
    ? MOCK_PRODUCTS.filter(p => p.title.includes(keyword))
    : MOCK_PRODUCTS
  return { code: 200, data: filtered }
}

// 模拟API：上传图片
async function uploadChatImage(_filePath: string): Promise<{ code: number; data: { url: string } }> {
  await delay(500)
  return { code: 200, data: { url: _filePath } }
}

// ==================== State ====================
const target = ref<ChatTarget | null>(null)
const messages = ref<ChatMessage[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(true)
const error = ref<string | null>(null)

const inputText = ref('')
const sending = ref(false)
const showMorePanel = ref(false)
const showProductSearch = ref(false)
const productKeyword = ref('')
const products = ref<ProductCard[]>([])
const searchingProducts = ref(false)

const selectedMessage = ref<ChatMessage | null>(null)
const showMessageActions = ref(false)
const showWithdrawConfirm = ref(false)
const showDeleteConfirm = ref(false)

const isRecording = ref(false)
const recordingCancelled = ref(false)

// 滚动控制
const scrollAnchor = ref('')
let scrollCounter = 0

// 安全区域适配
const envSafeArea = ref('0px')

// ==================== Lifecycle ====================
onMounted(() => {
  // 获取安全区域高度
  uni.getSystemInfo({
    success: (res) => {
      const bottom = res.safeArea?.bottom || 0
      const height = res.windowHeight || 0
      const safeBottom = bottom > height ? 0 : height - bottom
      envSafeArea.value = safeBottom > 0 ? safeBottom + 'px' : '0px'
    },
  })

  loadChat()
})

// ==================== Data Loading ====================
async function loadChat() {
  loading.value = true
  error.value = null
  try {
    const targetId = getTargetId()
    const [targetRes, historyRes] = await Promise.all([
      getChatTarget(targetId),
      getChatHistory(targetId),
    ])

    if (targetRes.code === 200 && targetRes.data) {
      target.value = targetRes.data
    } else {
      throw new Error('加载失败')
    }

    if (historyRes.code === 200 && historyRes.data) {
      messages.value = historyRes.data.messages
      hasMore.value = historyRes.data.hasMore
    }
  } catch {
    error.value = '加载失败，请重试'
  } finally {
    loading.value = false
    nextTick(() => scrollToBottom())
  }
}

function getTargetId(): number {
  // 从页面路由参数获取targetId
  // 格式: /pages/im/chat/id-detail/index?id=1
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const id = currentPage?.options?.id
  return id ? Number(id) : 1
}

async function loadMoreMessages() {
  if (loadingMore.value || !hasMore.value || messages.value.length === 0) return

  loadingMore.value = true
  try {
    const oldestMsgId = messages.value[0]?.id
    const targetId = getTargetId()
    const res = await getChatHistory(targetId, oldestMsgId)
    if (res.code === 200 && res.data) {
      messages.value = [...res.data.messages, ...messages.value]
      hasMore.value = res.data.hasMore
    }
  } finally {
    loadingMore.value = false
  }
}

// ==================== Message Handling ====================
async function handleSendText() {
  const content = inputText.value.trim()
  if (!content || sending.value) return

  inputText.value = ''
  sending.value = true

  // 乐观更新
  const tempMessage: ChatMessage = {
    id: 'temp_' + Date.now(),
    senderId: CURRENT_USER_ID,
    senderName: '我',
    senderAvatar: '',
    type: 'text',
    content,
    status: 'sending',
    isWithdrawn: false,
    createdAt: '',
    timestamp: Date.now(),
  }
  messages.value.push(tempMessage)
  scrollToBottom()

  try {
    const targetId = getTargetId()
    const res = await sendC2CMessage({ targetId, type: 'text', content })
    if (res.code === 200) {
      const idx = messages.value.findIndex(m => m.id === tempMessage.id)
      if (idx !== -1) {
        messages.value[idx] = {
          ...messages.value[idx],
          id: res.data.messageId,
          status: 'sent',
        }
      }
    }
  } catch {
    const idx = messages.value.findIndex(m => m.id === tempMessage.id)
    if (idx !== -1) {
      messages.value[idx] = { ...messages.value[idx], status: 'failed' }
    }
    uni.showToast({ title: '发送失败', icon: 'none' })
  } finally {
    sending.value = false
  }
}

function handleImageSelect() {
  uni.chooseImage({
    count: 1,
    success: async (res) => {
      const tempFilePath = res.tempFilePaths[0]

      // 乐观更新
      const tempMessage: ChatMessage = {
        id: 'temp_' + Date.now(),
        senderId: CURRENT_USER_ID,
        senderName: '我',
        senderAvatar: '',
        type: 'image',
        content: '',
        image: { url: tempFilePath, width: 200, height: 200 },
        status: 'sending',
        isWithdrawn: false,
        createdAt: '',
        timestamp: Date.now(),
      }
      messages.value.push(tempMessage)
      showMorePanel.value = false
      scrollToBottom()

      try {
        const uploadRes = await uploadChatImage(tempFilePath)
        if (uploadRes.code === 200 && uploadRes.data) {
          const targetId = getTargetId()
          const sendRes = await sendC2CMessage({
            targetId,
            type: 'image',
            imageUrl: uploadRes.data.url,
          })
          if (sendRes.code === 200) {
            const idx = messages.value.findIndex(m => m.id === tempMessage.id)
            if (idx !== -1) {
              messages.value[idx] = {
                ...messages.value[idx],
                id: sendRes.data.messageId,
                status: 'sent',
                image: { url: uploadRes.data.url, width: 200, height: 200 },
              }
            }
          }
        }
      } catch {
        const idx = messages.value.findIndex(m => m.id === tempMessage.id)
        if (idx !== -1) {
          messages.value[idx] = { ...messages.value[idx], status: 'failed' }
        }
        uni.showToast({ title: '发送失败', icon: 'none' })
      }
    },
  })
}

async function handleSendProduct(product: ProductCard) {
  showProductSearch.value = false

  const tempMessage: ChatMessage = {
    id: 'temp_' + Date.now(),
    senderId: CURRENT_USER_ID,
    senderName: '我',
    senderAvatar: '',
    type: 'card',
    content: '',
    product,
    status: 'sending',
    isWithdrawn: false,
    createdAt: '',
    timestamp: Date.now(),
  }
  messages.value.push(tempMessage)
  scrollToBottom()

  try {
    const targetId = getTargetId()
    const res = await sendC2CMessage({ targetId, type: 'card', productId: product.id })
    if (res.code === 200) {
      const idx = messages.value.findIndex(m => m.id === tempMessage.id)
      if (idx !== -1) {
        messages.value[idx] = {
          ...messages.value[idx],
          id: res.data.messageId,
          status: 'sent',
        }
      }
    }
  } catch {
    const idx = messages.value.findIndex(m => m.id === tempMessage.id)
    if (idx !== -1) {
      messages.value[idx] = { ...messages.value[idx], status: 'failed' }
    }
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

async function handleSearchProducts() {
  searchingProducts.value = true
  try {
    const res = await searchProducts(productKeyword.value)
    if (res.code === 200 && res.data) {
      products.value = res.data
    }
  } finally {
    searchingProducts.value = false
  }
}

// ==================== Message Actions ====================
function handleMessageLongPress(message: ChatMessage) {
  if (message.isWithdrawn) return
  selectedMessage.value = message
  showMessageActions.value = true
}

function closeMessageActions() {
  showMessageActions.value = false
  selectedMessage.value = null
}

function handleCopyMessage() {
  if (selectedMessage.value?.content) {
    uni.setClipboardData({
      data: selectedMessage.value.content,
      success: () => {
        uni.showToast({ title: '已复制', icon: 'success' })
      },
    })
  }
  closeMessageActions()
}

async function handleWithdrawMessage() {
  if (!selectedMessage.value) return
  showWithdrawConfirm.value = false
  closeMessageActions()

  try {
    const res = await withdrawMessage(selectedMessage.value.id)
    if (res.code === 200) {
      const msgId = selectedMessage.value.id
      const idx = messages.value.findIndex(m => m.id === msgId)
      if (idx !== -1) {
        messages.value[idx] = {
          ...messages.value[idx],
          isWithdrawn: true,
          content: '消息已撤回',
        }
      }
      uni.showToast({ title: '已撤回', icon: 'success' })
    }
  } catch {
    uni.showToast({ title: '撤回失败', icon: 'none' })
  }
}

async function handleDeleteMessage() {
  if (!selectedMessage.value) return
  showDeleteConfirm.value = false
  closeMessageActions()

  try {
    const res = await deleteMessage(selectedMessage.value.id)
    if (res.code === 200) {
      messages.value = messages.value.filter(m => m.id !== selectedMessage.value!.id)
      uni.showToast({ title: '已删除', icon: 'success' })
    }
  } catch {
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

// ==================== Voice Recording ====================
function onMicTouchStart() {
  isRecording.value = true
  recordingCancelled.value = false
}

function onMicTouchEnd() {
  if (!recordingCancelled.value) {
    uni.showToast({ title: '语音功能开发中', icon: 'none' })
  }
  isRecording.value = false
}

function onMicTouchMove(e: any) {
  const touch = e.touches[0]
  const rect = e.currentTarget?.getBoundingClientRect?.()
  if (rect && touch.clientY < rect.top - 50) {
    recordingCancelled.value = true
  }
}

// ==================== Navigation & Helpers ====================
function goBack() {
  uni.navigateBack()
}

function navigateToUser(userId: number) {
  const url = userId === CURRENT_USER_ID
    ? '/pages/user/profile/index'
    : '/pages/user/profile/index?id=' + userId
  uni.navigateTo({ url })
}

function navigateToProduct(productId: number) {
  uni.navigateTo({ url: '/pages/shop/product/index?id=' + productId })
}

function previewImage(url: string) {
  uni.previewImage({ urls: [url] })
}

function handleCamera() {
  uni.chooseImage({
    count: 1,
    sourceType: ['camera'],
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0]
      handleImageFromCamera(tempFilePath)
    },
  })
}

async function handleImageFromCamera(tempFilePath: string) {
  const tempMessage: ChatMessage = {
    id: 'temp_' + Date.now(),
    senderId: CURRENT_USER_ID,
    senderName: '我',
    senderAvatar: '',
    type: 'image',
    content: '',
    image: { url: tempFilePath, width: 200, height: 200 },
    status: 'sending',
    isWithdrawn: false,
    createdAt: '',
    timestamp: Date.now(),
  }
  messages.value.push(tempMessage)
  showMorePanel.value = false
  scrollToBottom()

  try {
    const uploadRes = await uploadChatImage(tempFilePath)
    if (uploadRes.code === 200) {
      const targetId = getTargetId()
      const sendRes = await sendC2CMessage({ targetId, type: 'image', imageUrl: uploadRes.data.url })
      if (sendRes.code === 200) {
        const idx = messages.value.findIndex(m => m.id === tempMessage.id)
        if (idx !== -1) {
          messages.value[idx] = { ...messages.value[idx], id: sendRes.data.messageId, status: 'sent' }
        }
      }
    }
  } catch {
    const idx = messages.value.findIndex(m => m.id === tempMessage.id)
    if (idx !== -1) {
      messages.value[idx] = { ...messages.value[idx], status: 'failed' }
    }
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

function handleVoiceCall() {
  uni.showToast({ title: '语音功能开发中', icon: 'none' })
}

function openProductSearch() {
  showProductSearch.value = true
  showMorePanel.value = false
  handleSearchProducts()
}

// ==================== Dropdown Menu ====================
function showMoreMenu() {
  if (!target.value) return
  const items = ['查看主页', '清空聊天记录', target.value.isBlocked ? '移出黑名单' : '加入黑名单']
  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      switch (res.tapIndex) {
        case 0:
          uni.navigateTo({ url: '/pages/user/profile/index?id=' + target.value!.id })
          break
        case 1:
          messages.value = []
          uni.showToast({ title: '已清空', icon: 'success' })
          break
        case 2:
          if (target.value) {
            target.value.isBlocked = !target.value.isBlocked
            uni.showToast({
              title: target.value.isBlocked ? '已加入黑名单' : '已移出黑名单',
              icon: 'success',
            })
          }
          break
      }
    },
  })
}

// ==================== Scroll & Time ====================
function onScroll(e: any) {
  const scrollTop = e.detail?.scrollTop || 0
  if (scrollTop < 50 && hasMore.value && !loadingMore.value) {
    loadMoreMessages()
  }
}

function scrollToBottom() {
  nextTick(() => {
    scrollCounter++
    scrollAnchor.value = 'endRef'
    // 重置以便下次触发
    setTimeout(() => {
      scrollAnchor.value = ''
    }, 100)
  })
}

function showTimeLabel(msg: ChatMessage, idx: number): boolean {
  if (idx === 0) return true
  const prev = messages.value[idx - 1]
  if (!prev) return true
  return msg.timestamp - prev.timestamp > 300000 // 5分钟
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function canWithdrawMessage(timestamp: number): boolean {
  return Date.now() - timestamp < 120000 // 2分钟
}

function getBubbleClass(msg: ChatMessage): string {
  if (msg.isWithdrawn) {
    return 'rounded-2xl px-4 py-2.5 bg-[#F0F0F0]'
  }
  if (msg.type === 'card') {
    return 'rounded-2xl p-0 bg-transparent'
  }
  return msg.senderId === CURRENT_USER_ID
    ? 'rounded-2xl px-4 py-2.5 bg-primary text-white rounded-tr-sm'
    : 'rounded-2xl px-4 py-2.5 bg-white rounded-tl-sm'
}

// ==================== Keyboard Handler ====================
function onInputKeydown(e: any) {
  // Enter键发送（不含Shift）
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSendText()
  }
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */

/* 底部面板滑入动画 */
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
