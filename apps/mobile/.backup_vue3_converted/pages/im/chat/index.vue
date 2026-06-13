<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- ====== 导航栏 ====== -->
    <header class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view class="p-1 -ml-1" @click="goBack"><text class="text-foreground text-xl">&#x2190;</text></view>
          <view class="flex items-center gap-2" @click="showUserInfo">
            <view class="relative">
              <view class="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center text-white text-sm font-semibold">
                {{ target.nickname[0] }}
              </view>
              <view v-if="target.isOnline" class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
            </view>
            <view>
              <text class="font-medium text-sm text-foreground">{{ target.remark || target.nickname }}</text>
              <text class="text-[10px] block" :class="target.isOnline ? 'text-green-500' : 'text-muted-foreground'">
                {{ target.isOnline ? '在线' : '离线' }}
              </text>
            </view>
          </view>
        </view>
        <view class="p-1" @click="showHeaderMenu">
          <text class="text-foreground text-xl">&#x22EE;</text>
        </view>
      </view>
    </header>

    <!-- ====== 加载状态 (DataState pattern) ====== -->
    <view v-if="loading" class="flex-1 flex items-center justify-center p-4">
      <view class="flex flex-col items-center gap-3">
        <view class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <text class="text-sm text-muted-foreground">加载中...</text>
      </view>
    </view>

    <!-- ====== 错误状态 (Error + Retry) ====== -->
    <view v-else-if="error" class="flex-1 flex items-center justify-center p-4">
      <view class="flex flex-col items-center gap-4">
        <text class="text-base text-muted-foreground">{{ error }}</text>
        <view class="px-6 py-2.5 bg-primary text-white rounded-full text-sm font-medium" @click="retryLoad">
          重试
        </view>
      </view>
    </view>

    <!-- ====== 消息列表 ====== -->
    <scroll-view
      v-else
      scroll-y
      class="flex-1"
      :scroll-into-view="scrollIntoView"
      :upper-threshold="50"
      @scrolltoupper="onScrollToTop"
      :style="{ paddingBottom: '0px' }"
    >
      <!-- 加载更多指示器 -->
      <view v-if="loadingMore" class="flex justify-center py-3">
        <view class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </view>

      <!-- 手动加载更多按钮 -->
      <view v-if="hasMore && !loadingMore && messages.length > 0" class="flex justify-center py-2">
        <text class="text-xs text-muted-foreground underline" @click="loadMoreMessages">加载更多消息</text>
      </view>

      <!-- 历史消息分割线 -->
      <view v-if="messages.length > 0" class="flex items-center gap-2 px-4 mb-4">
        <view class="flex-1 h-px bg-[#E8E0D5]" />
        <text class="text-[10px] text-muted-foreground shrink-0">以上为历史消息</text>
        <view class="flex-1 h-px bg-[#E8E0D5]" />
      </view>

      <view class="px-4 pb-4">
        <view v-for="(m, i) in messages" :key="m.id">
          <!-- 时间标签 -->
          <view v-if="shouldShowTimeLabel(m, i)" class="flex justify-center my-3">
            <view class="px-2 py-1 bg-muted rounded-full">
              <text class="text-[10px] text-muted-foreground">{{ formatMessageTime(m.timestamp) }}</text>
            </view>
          </view>

          <!-- 撤回消息提示 -->
          <view v-if="m.isWithdrawn" class="flex justify-center my-2">
            <view class="px-3 py-1 bg-muted/60 rounded">
              <text class="text-[11px] text-muted-foreground">
                {{ m.senderId === CURRENT_USER_ID ? '你' : m.senderName }}撤回了一条消息
              </text>
            </view>
          </view>

          <!-- 消息气泡 -->
          <view v-else :class="['flex gap-2.5 mb-4', m.senderId === CURRENT_USER_ID ? 'flex-row-reverse' : '']">
            <!-- 头像 -->
            <view
              class="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-semibold"
              :class="m.senderId === CURRENT_USER_ID ? 'bg-muted text-muted-foreground' : 'bg-gradient-to-br from-primary to-[#E74C3C]'"
            >
              {{ m.senderId === CURRENT_USER_ID ? '我' : m.senderName[0] }}
            </view>

            <!-- 消息内容区 -->
            <view :class="['max-w-[70%] flex flex-col gap-1', m.senderId === CURRENT_USER_ID ? 'items-end' : 'items-start']">
              <text v-if="!m.self" class="text-[10px] text-muted-foreground mb-0.5">{{ m.senderName }}</text>

              <!-- 长按触发操作菜单 -->
              <view
                :class="[
                  'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  m.type === 'card' ? 'p-0 bg-transparent' : '',
                  m.senderId === CURRENT_USER_ID
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-white text-foreground border border-border rounded-tl-sm',
                ]"
                @longpress="handleMessageLongPress(m)"
              >
                <!-- 文字消息 -->
                <text v-if="m.type === 'text'" class="whitespace-pre-wrap break-words">{{ m.content }}</text>

                <!-- 图片消息 -->
                <image
                  v-else-if="m.type === 'image'"
                  :src="m.image?.url"
                  mode="aspectFill"
                  class="w-40 h-40 rounded-lg"
                  @click="previewImage(m.image?.url || '')"
                />

                <!-- 语音消息 -->
                <view v-else-if="m.type === 'voice'" class="flex items-center gap-2 min-w-[100px]">
                  <view
                    class="w-8 h-8 rounded-full flex items-center justify-center"
                    :class="m.senderId === CURRENT_USER_ID ? 'bg-white/20' : 'bg-muted'"
                    @click.stop="playVoice(m)"
                  >
                    <text class="text-base">{{ m.voice?.playing ? '&#x23F8;' : '&#x25B6;' }}</text>
                  </view>
                  <text class="text-sm">{{ m.voice?.duration || 0 }}″</text>
                  <!-- 声波动画条（简化） -->
                  <view class="flex-1 h-1 bg-[#E8E0D5] rounded-full overflow-hidden">
                    <view
                      class="h-full rounded-full transition-all duration-300"
                      :class="m.senderId === CURRENT_USER_ID ? 'bg-white/60' : 'bg-primary'"
                      :style="{ width: m.voice?.playing ? '60%' : '0%' }"
                    />
                  </view>
                </view>

                <!-- 商品卡片 -->
                <view v-else-if="m.type === 'card' && m.product" class="w-52" @click="goToProduct(m.product.id)">
                  <view class="bg-white rounded-lg overflow-hidden border border-border">
                    <view class="flex gap-3 p-3">
                      <view class="w-16 h-16 rounded bg-muted flex items-center justify-center shrink-0">
                        <text class="text-2xl">&#x1F4E6;</text>
                      </view>
                      <view class="flex-1 min-w-0">
                        <text class="font-medium text-sm text-foreground line-clamp-2">{{ m.product.title }}</text>
                        <view class="flex items-baseline gap-2 mt-1">
                          <text class="text-primary font-bold text-sm">¥{{ m.product.price }}</text>
                          <text v-if="m.product.originalPrice" class="text-[10px] text-muted-foreground line-through">
                            ¥{{ m.product.originalPrice }}
                          </text>
                        </view>
                      </view>
                    </view>
                  </view>
                </view>
              </view>

              <!-- 消息状态指示器 (仅自己) -->
              <view v-if="m.senderId === CURRENT_USER_ID" class="flex items-center gap-1 px-1 h-4">
                <template v-if="m.status === 'sending'">
                  <view class="w-3 h-3 border-1.5 border-[#999] border-t-transparent rounded-full animate-spin" />
                </template>
                <text v-else-if="m.status === 'sent'" class="text-[10px] text-muted-foreground">&#x2713;</text>
                <text v-else-if="m.status === 'delivered'" class="text-[10px] text-muted-foreground">&#x2713;&#x2713;</text>
                <text v-else-if="m.status === 'read'" class="text-[10px] text-primary">&#x2713;&#x2713;</text>
                <view v-else-if="m.status === 'failed'" class="flex items-center gap-1">
                  <text class="text-[10px] text-[#E74C3C]">发送失败</text>
                  <text class="text-[10px] text-primary underline" @click.stop="resendMessage(m)">重发</text>
                </view>
              </view>

              <!-- 消息时间 (对方) -->
              <text v-if="m.senderId !== CURRENT_USER_ID" class="text-[9px] text-[#ccc]">{{ formatTimeOnly(m.timestamp) }}</text>
            </view>
          </view>
        </view>

        <!-- 正在输入 -->
        <view v-if="typing" class="flex items-start gap-2.5 mb-4">
          <view class="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {{ target.nickname[0] }}
          </view>
          <view class="bg-white rounded-xl px-4 py-3 border border-border rounded-tl-sm">
            <view class="flex gap-1">
              <view class="w-1.5 h-1.5 bg-[#999] rounded-full animate-bounce" style="animation-delay: 0s" />
              <view class="w-1.5 h-1.5 bg-[#999] rounded-full animate-bounce" style="animation-delay: 0.15s" />
              <view class="w-1.5 h-1.5 bg-[#999] rounded-full animate-bounce" style="animation-delay: 0.3s" />
            </view>
          </view>
        </view>

        <!-- 底部锚点 -->
        <view id="chat-bottom" />
      </view>
    </scroll-view>

    <!-- ====== 输入区域 ====== -->
    <view class="sticky bottom-0 left-0 right-0 bg-white border-t border-border z-30">
      <view class="flex items-end gap-2 px-3 py-2.5">
        <!-- "+" 切换更多面板 -->
        <view
          class="w-9 h-9 rounded-full flex items-center justify-center"
          :class="showMorePanel ? 'bg-primary/10' : ''"
          @click="showMorePanel = !showMorePanel"
        >
          <text :class="['text-xl transition-transform duration-200', showMorePanel ? 'rotate-45 text-primary' : 'text-muted-foreground']">+</text>
        </view>

        <!-- 输入框 -->
        <view class="flex-1">
          <input
            v-model="inputText"
            placeholder="输入消息..."
            @confirm="handleSendText"
            class="w-full px-4 py-2.5 bg-background rounded-full text-sm outline-none border border-border"
            :disabled="sending"
          />
        </view>

        <!-- 发送按钮 (有文字时) / 语音按钮 (无文字时) -->
        <template v-if="inputText.trim()">
          <view
            class="w-9 h-9 rounded-full bg-primary flex items-center justify-center"
            @click="handleSendText"
          >
            <template v-if="sending">
              <view class="w-4 h-4 border-1.5 border-white border-t-transparent rounded-full animate-spin" />
            </template>
            <text v-else class="text-white text-sm">&#x27A4;</text>
          </view>
        </template>
        <template v-else>
          <view
            class="w-9 h-9 rounded-full flex items-center justify-center"
            :class="isRecording ? 'bg-[#E74C3C]' : 'bg-muted'"
            @touchstart="onVoiceTouchStart"
            @touchend="onVoiceTouchEnd"
            @touchmove="onVoiceTouchMove"
          >
            <text :class="isRecording ? 'text-white' : 'text-muted-foreground' text-lg">&#x1F3A4;</text>
          </view>
        </template>
      </view>

      <!-- 录音状态提示 -->
      <view v-if="isRecording" class="px-3 pb-2">
        <view class="bg-[#E74C3C]/10 rounded-lg px-3 py-2 flex items-center gap-2">
          <view class="w-2 h-2 bg-[#E74C3C] rounded-full animate-pulse" />
          <text class="text-xs text-[#E74C3C]">
            {{ recordingCancelled ? '松开取消' : '录音中，上滑取消' }}
          </text>
        </view>
      </view>

      <!-- 更多功能面板 -->
      <view v-if="showMorePanel" class="border-t border-border px-4 py-4 bg-background">
        <view class="grid grid-cols-4 gap-4">
          <view class="flex flex-col items-center gap-2" @click="chooseImage">
            <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <text class="text-lg text-primary">&#x1F5BC;</text>
            </view>
            <text class="text-[10px] text-foreground">相册</text>
          </view>
          <view class="flex flex-col items-center gap-2" @click="takePhoto">
            <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <text class="text-lg text-primary">&#x1F4F7;</text>
            </view>
            <text class="text-[10px] text-foreground">拍照</text>
          </view>
          <view class="flex flex-col items-center gap-2" @click="startVoiceFromPanel">
            <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <text class="text-lg text-primary">&#x1F3A4;</text>
            </view>
            <text class="text-[10px] text-foreground">语音</text>
          </view>
          <view class="flex flex-col items-center gap-2" @click="openProductSearch">
            <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <text class="text-lg text-primary">&#x1F6D2;</text>
            </view>
            <text class="text-[10px] text-foreground">商品</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ====== 消息操作菜单 (ActionSheet) ====== -->
    <view v-if="showMessageActions" class="fixed inset-0 z-50" @click="closeMessageActions">
      <view class="absolute inset-0 bg-black/40" />
      <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl animate-slide-up" @click.stop>
        <view class="flex items-center justify-center pt-3 pb-1">
          <view class="w-8 h-1 bg-[#E8E0D5] rounded-full" />
        </view>
        <view class="px-6 py-4 border-b border-border">
          <text class="text-sm font-medium text-foreground">消息操作</text>
        </view>
        <view class="grid grid-cols-4 gap-4 px-6 py-6">
          <!-- 复制 (仅文字消息) -->
          <view
            v-if="selectedMessage?.type === 'text'"
            class="flex flex-col items-center gap-2"
            @click="handleCopyMessage"
          >
            <view class="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <text class="text-lg">&#x1F4CB;</text>
            </view>
            <text class="text-[10px] text-foreground">复制</text>
          </view>

          <!-- 撤回 (仅自己的消息 + 时间限制) -->
          <view
            v-if="selectedMessage?.senderId === CURRENT_USER_ID && canWithdrawMessage(selectedMessage?.timestamp)"
            class="flex flex-col items-center gap-2"
            @click="confirmWithdraw"
          >
            <view class="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <text class="text-lg">&#x1F504;</text>
            </view>
            <text class="text-[10px] text-foreground">撤回</text>
          </view>

          <!-- 删除 -->
          <view class="flex flex-col items-center gap-2" @click="confirmDelete">
            <view class="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <text class="text-lg text-[#E74C3C]">&#x1F5D1;</text>
            </view>
            <text class="text-[10px] text-[#E74C3C]">删除</text>
          </view>
        </view>
        <view class="px-6 pb-6">
          <view
            class="w-full py-3 bg-muted rounded-full flex items-center justify-center"
            @click="closeMessageActions"
          >
            <text class="text-sm text-foreground font-medium">取消</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ====== 商品搜索面板 (BottomSheet) ====== -->
    <view v-if="showProductSearch" class="fixed inset-0 z-50" @click="showProductSearch = false">
      <view class="absolute inset-0 bg-black/40" />
      <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] flex flex-col animate-slide-up" @click.stop>
        <view class="flex items-center justify-center pt-3 pb-1">
          <view class="w-8 h-1 bg-[#E8E0D5] rounded-full" />
        </view>
        <view class="px-4 py-3 border-b border-border">
          <text class="text-base font-semibold text-foreground">选择商品</text>
        </view>

        <!-- 搜索输入 -->
        <view class="flex items-center gap-2 px-4 py-3 border-b border-border">
          <input
            v-model="productKeyword"
            placeholder="搜索商品"
            @confirm="handleSearchProducts"
            class="flex-1 px-4 py-2 bg-background rounded-full text-sm outline-none border border-border"
          />
          <view
            class="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
            @click="handleSearchProducts"
          >
            <text class="text-white text-sm">&#x1F50D;</text>
          </view>
        </view>

        <!-- 商品列表 -->
        <scroll-view scroll-y class="flex-1 px-4 py-2" :style="{ maxHeight: '50vh' }">
          <view v-if="searchingProducts" class="flex justify-center py-8">
            <view class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </view>

          <view v-else-if="products.length === 0" class="flex items-center justify-center py-8">
            <text class="text-sm text-muted-foreground">暂无商品</text>
          </view>

          <view v-else class="space-y-2">
            <view
              v-for="p in products"
              :key="p.id"
              class="flex gap-3 p-3 rounded-lg active:bg-muted transition-colors"
              @click="handleSendProduct(p)"
            >
              <view class="w-16 h-16 rounded bg-muted flex items-center justify-center shrink-0">
                <text class="text-2xl">&#x1F4E6;</text>
              </view>
              <view class="flex-1 min-w-0">
                <text class="font-medium text-sm text-foreground line-clamp-2">{{ p.title }}</text>
                <view class="flex items-baseline gap-2 mt-1">
                  <text class="text-primary font-bold">¥{{ p.price }}</text>
                  <text v-if="p.originalPrice" class="text-[10px] text-muted-foreground line-through">¥{{ p.originalPrice }}</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'

// ====== Types ======
interface ProductCard {
  id: number
  title: string
  cover: string
  price: number
  originalPrice?: number
}

interface VoiceInfo {
  duration: number
  playing?: boolean
}

interface ChatMessage {
  id: string
  senderId: number
  senderName: string
  senderAvatar: string
  type: 'text' | 'image' | 'voice' | 'card'
  content: string
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  isWithdrawn: boolean
  timestamp: number
  image?: { url: string; width: number; height: number }
  voice?: VoiceInfo
  product?: ProductCard
}

// ====== Constants ======
const CURRENT_USER_ID = 0
const WITHDRAW_TIME_LIMIT = 2 * 60 * 1000 // 2分钟

// 模拟商品数据
const MOCK_PRODUCTS: ProductCard[] = [
  { id: 1, title: '周易六十四卦详解 (珍藏版)', cover: '', price: 68, originalPrice: 88 },
  { id: 2, title: '梅花易数入门与进阶', cover: '', price: 45, originalPrice: 58 },
  { id: 3, title: '八字命理大全 四柱预测学', cover: '', price: 128, originalPrice: 168 },
  { id: 4, title: '风水罗盘 专业勘测版', cover: '', price: 298, originalPrice: 358 },
  { id: 5, title: '紫微斗数全书 精装版', cover: '', price: 88, originalPrice: 108 },
  { id: 6, title: '易经入门 珍藏版U盘套装', cover: '', price: 168, originalPrice: 198 },
]

// ====== State ======
const target = ref({
  id: 1,
  nickname: '周易大师',
  remark: '周易大师',
  isOnline: true,
})

const loading = ref(true)
const error = ref<string | null>(null)

const messages = ref<ChatMessage[]>([])
const loadingMore = ref(false)
const hasMore = ref(true)

const inputText = ref('')
const sending = ref(false)
const typing = ref(false)
const showMorePanel = ref(false)

const showProductSearch = ref(false)
const productKeyword = ref('')
const products = ref<ProductCard[]>([])
const searchingProducts = ref(false)

const selectedMessage = ref<ChatMessage | null>(null)
const showMessageActions = ref(false)

const isRecording = ref(false)
const recordingCancelled = ref(false)

const scrollIntoView = ref('')

// ====== Mock Data: 初始消息 ======
function buildMockMessages(): ChatMessage[] {
  const now = Date.now()
  return [
    { id: 'm1', senderId: 1, senderName: '周易大师', senderAvatar: '', type: 'text', content: '你好，欢迎咨询国学问题', status: 'read', isWithdrawn: false, timestamp: now - 7200000 },
    { id: 'm2', senderId: CURRENT_USER_ID, senderName: '我', senderAvatar: '', type: 'text', content: '大师您好，我想请教一下八字方面的问题', status: 'read', isWithdrawn: false, timestamp: now - 7140000 },
    { id: 'm3', senderId: 1, senderName: '周易大师', senderAvatar: '', type: 'text', content: '好的，请先把您的出生年月日时告诉我', status: 'read', isWithdrawn: false, timestamp: now - 7080000 },
    { id: 'm4', senderId: CURRENT_USER_ID, senderName: '我', senderAvatar: '', type: 'text', content: '我是1990年8月15日下午3点出生的，农历庚午年六月廿五日申时', status: 'read', isWithdrawn: false, timestamp: now - 7000000 },
    { id: 'm5', senderId: 1, senderName: '周易大师', senderAvatar: '', type: 'text', content: '好的，我来排一下您的八字。公历1990年8月15日15时：\n八字：庚午 甲申 癸丑 庚申\n日主癸水，生于申月得令，身旺。', status: 'read', isWithdrawn: false, timestamp: now - 6900000 },
    { id: 'm6', senderId: CURRENT_USER_ID, senderName: '我', senderAvatar: '', type: 'text', content: '能帮我看看事业运吗？', status: 'read', isWithdrawn: false, timestamp: now - 3600000 },
    { id: 'm7', senderId: 1, senderName: '周易大师', senderAvatar: '', type: 'voice', content: '', status: 'read', isWithdrawn: false, timestamp: now - 3540000, voice: { duration: 12 } },
    { id: 'm8', senderId: 1, senderName: '周易大师', senderAvatar: '', type: 'image', content: '', status: 'read', isWithdrawn: false, timestamp: now - 3480000, image: { url: 'https://picsum.photos/seed/bazi/400/400', width: 400, height: 400 } },
    { id: 'm9', senderId: 1, senderName: '周易大师', senderAvatar: '', type: 'card', content: '', status: 'read', isWithdrawn: false, timestamp: now - 3420000, product: MOCK_PRODUCTS[0] },
    { id: 'm10', senderId: CURRENT_USER_ID, senderName: '我', senderAvatar: '', type: 'text', content: '非常感谢！分析很详细，我已经下单了那本书', status: 'read', isWithdrawn: false, timestamp: now - 1800000 },
    { id: 'm11', senderId: 1, senderName: '周易大师', senderAvatar: '', type: 'text', content: '不客气，书到了可以先看前三章打好基础', status: 'delivered', isWithdrawn: false, timestamp: now - 1740000 },
    { id: 'm12', senderId: CURRENT_USER_ID, senderName: '我', senderAvatar: '', type: 'text', content: '好的，有问题再请教您', status: 'sent', isWithdrawn: false, timestamp: now - 600000 },
    { id: 'm13', senderId: 1, senderName: '周易大师', senderAvatar: '', type: 'text', content: '好的，随缘', status: 'sent', isWithdrawn: false, timestamp: now - 540000 },
    // 已撤回消息示例
    { id: 'm14', senderId: 1, senderName: '周易大师', senderAvatar: '', type: 'text', content: '消息已撤回', status: 'read', isWithdrawn: true, timestamp: now - 300000 },
    // 发送中的消息示例
    { id: 'm15', senderId: CURRENT_USER_ID, senderName: '我', senderAvatar: '', type: 'text', content: '这条消息还在发送中...', status: 'sending', isWithdrawn: false, timestamp: now - 120000 },
  ]
}

// ====== 格式化函数 ======
function formatMessageTime(timestamp: number): string {
  const d = new Date(timestamp)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  if (isToday) return `${h}:${min}`
  return `${y}年${mo}月${day}日 ${h}:${min}`
}

function formatTimeOnly(timestamp: number): string {
  const d = new Date(timestamp)
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

function shouldShowTimeLabel(m: ChatMessage, index: number): boolean {
  if (index === 0) return true
  const prev = messages.value[index - 1]
  return m.timestamp - prev.timestamp > 300000
}

function canWithdrawMessage(timestamp?: number): boolean {
  if (!timestamp) return false
  return Date.now() - timestamp < WITHDRAW_TIME_LIMIT
}

// ====== 生命周期 ======
onMounted(() => {
  // 模拟加载
  setTimeout(() => {
    loading.value = false
    messages.value = buildMockMessages()
    scrollToBottom()

    // 模拟对方正在输入
    setTimeout(() => {
      typing.value = true
    }, 3000)

    // 模拟对方发送消息
    setTimeout(() => {
      typing.value = false
      messages.value.push({
        id: 'm16_' + Date.now(),
        senderId: 1,
        senderName: '周易大师',
        senderAvatar: '',
        type: 'text',
        content: '补充一下，您当前正行戊子大运（25-34岁），子午冲事业变动较多。2024甲辰年，伤官见官注意口舌是非。',
        status: 'delivered',
        isWithdrawn: false,
        timestamp: Date.now(),
      })
      scrollToBottom()
    }, 6000)
  }, 1200)
})

// ====== 导航 ======
function goBack() {
  uni.navigateBack()
}

function showHeaderMenu() {
  uni.showActionSheet({
    itemList: ['查看主页', '清空聊天记录', target.value.isBlocked ? '移出黑名单' : '加入黑名单'],
    success(res) {
      if (res.tapIndex === 0) {
        uni.navigateTo({ url: `/pages/user/profile/index?id=${target.value.id}` })
      } else if (res.tapIndex === 1) {
        messages.value = []
        uni.showToast({ title: '聊天记录已清空', icon: 'none' })
      } else if (res.tapIndex === 2) {
        target.value.isBlocked = !target.value.isBlocked
        uni.showToast({ title: target.value.isBlocked ? '已加入黑名单' : '已移出黑名单', icon: 'none' })
      }
    },
  })
}

function showUserInfo() {
  uni.navigateTo({ url: `/pages/user/profile/index?id=${target.value.id}` })
}

// ====== 错误处理 / 重试 ======
function retryLoad() {
  loading.value = true
  error.value = null
  // 模拟重新加载
  setTimeout(() => {
    loading.value = false
    messages.value = buildMockMessages()
  }, 1000)
}

// ====== 消息列表滚动 ======
function scrollToBottom() {
  nextTick(() => {
    scrollIntoView.value = 'chat-bottom'
  })
}

// ====== 加载更多历史消息 ======
async function loadMoreMessages() {
  if (loadingMore.value || !hasMore.value || messages.value.length === 0) return
  loadingMore.value = true

  try {
    // 模拟加载更多
    await new Promise(resolve => setTimeout(resolve, 800))
    const oldestTimestamp = messages.value[0]?.timestamp || Date.now()
    const olderMessages: ChatMessage[] = [
      {
        id: 'old1_' + Date.now(),
        senderId: 1,
        senderName: '周易大师',
        senderAvatar: '',
        type: 'text',
        content: '早上好，我是周易大师，很高兴为您服务',
        status: 'read',
        isWithdrawn: false,
        timestamp: oldestTimestamp - 86400000,
      },
      {
        id: 'old2_' + Date.now(),
        senderId: CURRENT_USER_ID,
        senderName: '我',
        senderAvatar: '',
        type: 'text',
        content: '大师您好，我看到您的简介过来的',
        status: 'read',
        isWithdrawn: false,
        timestamp: oldestTimestamp - 85800000,
      },
      {
        id: 'old3_' + Date.now(),
        senderId: 1,
        senderName: '周易大师',
        senderAvatar: '',
        type: 'text',
        content: '欢迎，有什么问题尽管问',
        status: 'read',
        isWithdrawn: false,
        timestamp: oldestTimestamp - 85200000,
      },
    ]
    messages.value = [...olderMessages, ...messages.value]
    // 模拟没有更多数据了
    hasMore.value = false
  } catch {
    uni.showToast({ title: '加载失败', icon: 'error' })
  } finally {
    loadingMore.value = false
  }
}

function onScrollToTop() {
  if (hasMore.value && !loadingMore.value) {
    loadMoreMessages()
  }
}

// ====== 发送文字消息 ======
function handleSendText() {
  const content = inputText.value.trim()
  if (!content || sending.value) return

  inputText.value = ''
  sending.value = true
  showMorePanel.value = false

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
    timestamp: Date.now(),
  }
  messages.value.push(tempMessage)
  scrollToBottom()

  // 模拟发送
  setTimeout(() => {
    messages.value = messages.value.map(m =>
      m.id === tempMessage.id
        ? { ...m, id: 'sent_' + Date.now(), status: 'sent' as const }
        : m
    )

    // 模拟对方回复
    setTimeout(() => {
      typing.value = true
      setTimeout(() => {
        typing.value = false
        const replies = [
          '明白了，还有问题吗？',
          '好的，我记下了',
          '让我想想...',
          '请继续',
          '这个我需要查一下资料',
        ]
        messages.value.push({
          id: 'reply_' + Date.now(),
          senderId: 1,
          senderName: '周易大师',
          senderAvatar: '',
          type: 'text',
          content: replies[Math.floor(Math.random() * replies.length)],
          status: 'delivered',
          isWithdrawn: false,
          timestamp: Date.now(),
        })
        scrollToBottom()
      }, 1500)
    }, 500)
  }, 800)

  setTimeout(() => {
    sending.value = false
  }, 800)
}

// ====== 发送失败重试 ======
function resendMessage(m: ChatMessage) {
  m.status = 'sending'
  // 模拟重发
  setTimeout(() => {
    m.status = 'sent'
  }, 1500)
}

// ====== 图片选择与预览 ======
function chooseImage() {
  showMorePanel.value = false
  uni.chooseImage({
    count: 1,
    success(res) {
      const tempFilePath = res.tempFilePaths[0]
      // 乐观更新
      const tempMessage: ChatMessage = {
        id: 'img_' + Date.now(),
        senderId: CURRENT_USER_ID,
        senderName: '我',
        senderAvatar: '',
        type: 'image',
        content: '',
        status: 'sending',
        isWithdrawn: false,
        timestamp: Date.now(),
        image: { url: tempFilePath, width: 200, height: 200 },
      }
      messages.value.push(tempMessage)
      scrollToBottom()

      // 模拟上传完成
      setTimeout(() => {
        messages.value = messages.value.map(m =>
          m.id === tempMessage.id ? { ...m, status: 'sent' as const } : m
        )
      }, 1500)
    },
  })
}

function takePhoto() {
  showMorePanel.value = false
  uni.chooseImage({
    count: 1,
    sourceType: ['camera'],
    success(res) {
      const tempFilePath = res.tempFilePaths[0]
      const tempMessage: ChatMessage = {
        id: 'img_' + Date.now(),
        senderId: CURRENT_USER_ID,
        senderName: '我',
        senderAvatar: '',
        type: 'image',
        content: '',
        status: 'sending',
        isWithdrawn: false,
        timestamp: Date.now(),
        image: { url: tempFilePath, width: 200, height: 200 },
      }
      messages.value.push(tempMessage)
      scrollToBottom()

      setTimeout(() => {
        messages.value = messages.value.map(m =>
          m.id === tempMessage.id ? { ...m, status: 'sent' as const } : m
        )
      }, 1500)
    },
  })
}

function previewImage(url: string) {
  uni.previewImage({ urls: [url] })
}

// ====== 语音消息处理 ======
function onVoiceTouchStart() {
  isRecording.value = true
  recordingCancelled.value = false
}

function onVoiceTouchEnd() {
  if (!recordingCancelled.value) {
    // 模拟语音发送
    const tempMessage: ChatMessage = {
      id: 'voice_' + Date.now(),
      senderId: CURRENT_USER_ID,
      senderName: '我',
      senderAvatar: '',
      type: 'voice',
      content: '',
      status: 'sent',
      isWithdrawn: false,
      timestamp: Date.now(),
      voice: { duration: Math.floor(Math.random() * 30) + 5 },
    }
    messages.value.push(tempMessage)
    scrollToBottom()
    uni.showToast({ title: '语音功能(Mock)', icon: 'none' })
  }
  isRecording.value = false
}

function onVoiceTouchMove(e: TouchEvent) {
  // 上滑取消录音：当手指上滑超过按钮上方50px时取消
  const touch = e.touches[0]
  // 在UniApp中无法直接获取元素位置，使用简化判断
  // 这里使用坐标判断：如果clientY < 某个阈值(屏幕底部上方)
  if (touch.clientY < uni.getSystemInfoSync().windowHeight - 120) {
    recordingCancelled.value = true
  }
}

function startVoiceFromPanel() {
  showMorePanel.value = false
  isRecording.value = true
  recordingCancelled.value = false
  setTimeout(() => {
    isRecording.value = false
    if (!recordingCancelled.value) {
      uni.showToast({ title: '语音功能(Mock)', icon: 'none' })
    }
  }, 2000)
}

function playVoice(m: ChatMessage) {
  // 模拟播放/暂停
  if (m.voice) {
    m.voice.playing = !m.voice.playing
    if (m.voice.playing) {
      setTimeout(() => {
        if (m.voice) m.voice.playing = false
      }, (m.voice.duration || 3) * 1000)
    }
  }
}

// ====== 商品卡片 ======
function openProductSearch() {
  showMorePanel.value = false
  showProductSearch.value = true
  productKeyword.value = ''
  products.value = MOCK_PRODUCTS
}

function handleSearchProducts() {
  const keyword = productKeyword.value.trim().toLowerCase()
  searchingProducts.value = true
  setTimeout(() => {
    if (!keyword) {
      products.value = MOCK_PRODUCTS
    } else {
      products.value = MOCK_PRODUCTS.filter(p =>
        p.title.toLowerCase().includes(keyword)
      )
    }
    searchingProducts.value = false
  }, 500)
}

function handleSendProduct(product: ProductCard) {
  showProductSearch.value = false
  showMorePanel.value = false

  const tempMessage: ChatMessage = {
    id: 'card_' + Date.now(),
    senderId: CURRENT_USER_ID,
    senderName: '我',
    senderAvatar: '',
    type: 'card',
    content: '',
    status: 'sending',
    isWithdrawn: false,
    timestamp: Date.now(),
    product,
  }
  messages.value.push(tempMessage)
  scrollToBottom()

  setTimeout(() => {
    messages.value = messages.value.map(m =>
      m.id === tempMessage.id ? { ...m, status: 'sent' as const } : m
    )
  }, 800)
}

function goToProduct(productId: number) {
  uni.navigateTo({ url: `/pages/shop/id-detail/index?id=${productId}` })
}

// ====== 消息长按操作菜单 ======
function handleMessageLongPress(m: ChatMessage) {
  if (m.isWithdrawn) return
  uni.vibrateShort({ type: 'medium' })
  selectedMessage.value = m
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
      success() {
        uni.showToast({ title: '已复制', icon: 'none' })
      },
    })
  }
  closeMessageActions()
}

function confirmWithdraw() {
  closeMessageActions()
  uni.showModal({
    title: '撤回消息',
    content: '确定要撤回这条消息吗？撤回后对方将无法看到。',
    success(res) {
      if (res.confirm) {
        handleWithdrawMessage()
      }
    },
  })
}

function handleWithdrawMessage() {
  const msg = messages.value.find(m => m.id === selectedMessage.value?.id)
  if (msg) {
    msg.isWithdrawn = true
    msg.content = '消息已撤回'
    uni.showToast({ title: '已撤回', icon: 'none' })
  }
}

function confirmDelete() {
  closeMessageActions()
  uni.showModal({
    title: '删除消息',
    content: '确定要删除这条消息吗？删除后仅自己不可见。',
    success(res) {
      if (res.confirm) {
        handleDeleteMessage()
      }
    },
  })
}

function handleDeleteMessage() {
  if (selectedMessage.value) {
    messages.value = messages.value.filter(m => m.id !== selectedMessage.value?.id)
    uni.showToast({ title: '已删除', icon: 'none' })
  }
}
</script>

<style scoped>
/* 动画 */
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.animate-slide-up {
  animation: slide-up 0.25s ease-out;
}

/* 加载旋转 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 0.8s linear infinite;
}

/* 脉冲 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.animate-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

/* 弹跳 */
@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}

.animate-bounce > view {
  animation: bounce 1.4s ease-in-out infinite;
}

/* line-clamp */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
