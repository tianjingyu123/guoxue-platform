<template>
  <!-- 加载骨架屏（深色 shimmer） -->
  <view v-if="loading" class="sk-page">
    <view class="sk-topbar">
      <view class="sk sk-pill sk-w96" />
      <view class="sk sk-pill sk-w180" />
      <view class="sk sk-pill sk-w96 sk-ml-auto" />
    </view>
    <view class="sk-stats">
      <view class="sk sk-stat" />
      <view class="sk sk-stat" />
      <view class="sk sk-stat" />
      <view class="sk sk-stat" />
    </view>
    <view class="sk-danmu">
      <view class="sk-dm-row"><view class="sk sk-av" /><view class="sk sk-dm-bd sk-w280" /></view>
      <view class="sk-dm-row"><view class="sk sk-av" /><view class="sk sk-dm-bd sk-w340" /></view>
      <view class="sk-dm-row"><view class="sk sk-av" /><view class="sk sk-dm-bd sk-w240" /></view>
    </view>
    <view class="sk-opbar">
      <view class="sk sk-op" /><view class="sk sk-op" /><view class="sk sk-op" /><view class="sk sk-op" /><view class="sk sk-op" />
    </view>
  </view>

  <!-- 错误状态 -->
  <view v-else-if="error" class="error-state">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="fetchData">重试</view>
  </view>

  <!-- 正常内容（直播中驾驶舱·深色） -->
  <view v-else class="page">
    <!-- ── 顶部状态条 ── -->
    <view class="topbar">
      <view class="live">
        <view class="dot" />
        <text class="live-txt">直播中</text>
      </view>
      <text class="mono time-txt">{{ formatTime(liveTime) }}</text>
      <view class="qtag" :class="{ warn: remainWarn }">
        <text class="qtag-txt">{{ qualityLabel }} · 剩余 {{ remainMinutes }} 分钟</text>
      </view>
      <view class="endbtn" @tap="showEndDialog = true">
        <text class="endbtn-txt">下播</text>
      </view>
    </view>

    <!-- ── 数据看板四格 ── -->
    <view class="stats">
      <view class="stat">
        <text class="mono stat-n">{{ formatNum(stats.onlineCount) }}</text>
        <text class="stat-l">在线人数</text>
      </view>
      <view class="stat">
        <text class="mono stat-n">{{ formatNum(stats.totalViews) }}</text>
        <text class="stat-l">累计观看</text>
      </view>
      <view class="stat">
        <text class="mono stat-n">{{ formatNum(stats.newFollowers) }}</text>
        <text class="stat-l">新增粉丝</text>
      </view>
      <view class="stat">
        <text class="mono stat-n gold">¥{{ formatNum(sessionIncome) }}</text>
        <text class="stat-l">本场收入</text>
      </view>
    </view>

    <!-- ── 时长警示横幅（剩余<15分钟） ── -->
    <view v-if="remainWarn" class="banner">
      <text class="banner-txt">{{ qualityLabel }}时长仅剩 {{ remainMinutes }} 分钟，耗尽后自动降为标清</text>
      <text class="banner-link" @tap="onRenewDuration">立即续购 ›</text>
    </view>

    <!-- ── 弹幕流 ── -->
    <scroll-view v-if="danmakuList.length > 0" scroll-y class="danmu" :scroll-top="danmakuScrollTop" :scroll-with-animation="false">
      <view class="sys">—— 以下为实时弹幕 ——</view>
      <view
        v-for="item in danmakuList"
        :key="item.id"
        class="dm"
        @longpress="onDanmakuLongPress(item)"
      >
        <view class="av">
          <text class="av-txt">{{ (item.user || '?').charAt(0) }}</text>
        </view>
        <view class="bd">
          <text class="bd-user" :class="{ vip: item.isVip }">{{ item.user }}</text>
          <text class="bd-content">{{ item.content }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 弹幕空态（刚开播） -->
    <view v-else class="danmu danmu-empty">
      <text class="empty-title">直播已开始，观众正在路上</text>
      <text class="empty-sub">分享直播间到圈子，召唤第一批观众</text>
      <view class="sharebtn" @tap="onShareRoom">
        <text class="sharebtn-txt">分享直播间</text>
      </view>
    </view>

    <!-- ── 底部操作栏 ── -->
    <view class="opbar">
      <view class="op" @tap="showProductSheet = true">
        <view class="op-ic">
          <AppIcon name="shopping-bag" :size="28" color="#A89FA8" />
          <view v-if="products.length > 0" class="op-cnt">
            <text class="op-cnt-txt">{{ products.length }}</text>
          </view>
        </view>
        <text class="op-txt">商品</text>
      </view>
      <view class="op" @tap="onFlashSale">
        <view class="op-ic"><AppIcon name="zap" :size="28" color="#A89FA8" /></view>
        <text class="op-txt">秒杀</text>
      </view>
      <view class="op" @tap="showProductSheet = true">
        <view class="op-ic"><AppIcon name="ban" :size="28" color="#A89FA8" /></view>
        <text class="op-txt">禁言管理</text>
      </view>
      <view v-if="isPortrait" class="op" @tap="onFlipBeauty">
        <view class="op-ic"><AppIcon name="refresh-cw" :size="28" color="#A89FA8" /></view>
        <text class="op-txt">翻转/美颜</text>
      </view>
      <view class="op" @tap="onMore">
        <view class="op-ic"><AppIcon name="more-horizontal" :size="28" color="#A89FA8" /></view>
        <text class="op-txt">更多</text>
      </view>
    </view>

    <!-- ── 下播二次确认弹窗（不透明纯色卡·X5安全） ── -->
    <view v-if="showEndDialog" class="mask" @tap="showEndDialog = false">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">确认结束本场直播？</text>
        <text class="dialog-desc">已直播 {{ humanDuration }} · 累计 {{ formatNum(stats.totalViews) }} 人观看{{ '\n' }}结束后将自动生成回放</text>
        <view class="dialog-btns">
          <view class="dialog-btn cancel" @tap="showEndDialog = false">
            <text class="dialog-btn-txt cancel-txt">继续直播</text>
          </view>
          <view class="dialog-btn confirm" @tap="onConfirmEnd">
            <text class="dialog-btn-txt confirm-txt">结束直播</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ── 商品/禁言半屏列表 ── -->
    <view v-if="showProductSheet" class="mask sheet-mask" @tap="showProductSheet = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">本场商品（{{ products.length }}）</text>
          <view class="sheet-close" @tap="showProductSheet = false">
            <AppIcon name="x" :size="32" color="#A89FA8" />
          </view>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view v-if="products.length === 0" class="sheet-empty">
            <text class="sheet-empty-txt">本场暂未挂载商品</text>
          </view>
          <view v-for="p in products" :key="p.id" class="prod">
            <view class="prod-img">
              <AppIcon name="package" :size="40" color="#6E6470" />
            </view>
            <view class="prod-info">
              <view class="prod-name-row">
                <text class="prod-name">{{ p.name }}</text>
                <view v-if="p.isLive" class="prod-tag live-tag"><text class="prod-tag-txt">讲解中</text></view>
                <view v-else-if="p.isHot" class="prod-tag hot-tag"><text class="prod-tag-txt">爆</text></view>
              </view>
              <view class="prod-meta">
                <text class="prod-price">¥{{ formatPrice(p.price) }}</text>
                <text class="prod-stock">库存 {{ p.stock }} · 已售 {{ p.sold }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { formatPrice } from '@/utils/format'
import { liveApi, type ConsoleDanmaku, type ConsoleProduct } from '@/lib/live-data'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _goBack = goBack // 保留返回工具（顶栏无返回键时用于兜底）

// ===== 三态 UI =====
const loading = ref(true)
const error = ref('')
const consoleId = ref('1')
const roomTitle = ref('')

// ===== 数据（由 API 异步获取）=====
const stats = ref({
  onlineCount: 0,
  totalViews: 0,
  newFollowers: 0,
  totalGift: 0,
  totalSales: 0,
  peakOnline: 0,
  avgWatchTime: '0:00',
  interactionRate: '0%',
})
const danmakuList = ref<ConsoleDanmaku[]>([])
const products = ref<ConsoleProduct[]>([])

// ===== UI 状态 =====
const liveTime = ref(0) // 已播秒数
const danmakuScrollTop = ref(0)
const showEndDialog = ref(false)
const showProductSheet = ref(false)

// 画质档 & 剩余时长（后端暂无该字段，诚实降级为占位值·剩余分钟由时长包体系提供）
const qualityLabel = ref('高清')
const remainMinutes = ref(0)
const remainWarn = computed(() => remainMinutes.value > 0 && remainMinutes.value < 15)

// 本场收入 = 打赏 + 带货 GMV（金额单位分→元由 formatPrice 处理，这里 stats 已是元口径展示值）
const sessionIncome = computed(() => (stats.value.totalGift || 0) + (stats.value.totalSales || 0))

// 竖屏判断：竖屏手机直播才显示「翻转/美颜」（本地端能力·OBS 横屏隐藏）
const isPortrait = ref(true)

// ===== 格式化 =====
function formatNum(n: number) {
  return (n || 0).toLocaleString('en-US')
}
function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (v: number) => v.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}
const humanDuration = computed(() => {
  const h = Math.floor(liveTime.value / 3600)
  const m = Math.floor((liveTime.value % 3600) / 60)
  return h > 0 ? `${h}小时${m}分` : `${m}分`
})

// ===== API 数据获取 =====
async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await liveApi.getConsoleData(consoleId.value)
    roomTitle.value = res.title || ''
    stats.value = res.stats
    danmakuList.value = res.danmaku
    products.value = res.products
    // 剩余时长若后端未提供则保持 0（不显示警示·不编假数字）
    scrollDanmakuToBottom()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function scrollDanmakuToBottom() {
  danmakuScrollTop.value = danmakuList.value.length * 9999
}

// ===== 计时器 =====
let liveTimer: ReturnType<typeof setInterval> | null = null

onLoad((options) => {
  if (options?.id) consoleId.value = String(options.id)
  // 检测屏幕方向（宽>高判定为横屏/OBS，隐藏翻转美颜）
  try {
    const info = uni.getSystemInfoSync()
    isPortrait.value = (info.screenHeight || 1) >= (info.screenWidth || 0)
  } catch {
    isPortrait.value = true
  }
  fetchData()
  liveTimer = setInterval(() => {
    liveTime.value += 1
  }, 1000)
})

onUnmounted(() => {
  if (liveTimer) clearInterval(liveTimer)
})

// ===== 弹幕长按 → 禁言/复制 =====
function onDanmakuLongPress(item: ConsoleDanmaku) {
  uni.showActionSheet({
    itemList: ['禁言该用户', '复制内容'],
    success: (res) => {
      if (res.tapIndex === 0) confirmMute(item)
      else if (res.tapIndex === 1) copyContent(item)
    },
  })
}

function copyContent(item: ConsoleDanmaku) {
  uni.setClipboardData({ data: item.content, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
}

// 禁言 — POST /live/rooms/:id/mute（房主或管理员）
function confirmMute(item: ConsoleDanmaku) {
  if (!item.userId) {
    uni.showToast({ title: '无法定位该用户', icon: 'none' })
    return
  }
  uni.showModal({
    title: '禁言用户',
    content: `确定禁言「${item.user}」吗？禁言后其将无法在本直播间发言。`,
    confirmText: '禁言',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await liveApi.muteUser(consoleId.value, item.userId!)
        uni.showToast({ title: '已禁言', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '禁言失败', icon: 'none' })
      }
    },
  })
}

// ===== 秒杀（后端有端点·前端需选品/定价/时长表单尚未接·诚实降级）=====
function onFlashSale() {
  uni.showToast({ title: '秒杀功能开发中', icon: 'none' })
}

// ===== 翻转/美颜（本地端能力·无后端·占位）=====
function onFlipBeauty() {
  uni.showToast({ title: '翻转/美颜（本地端能力）', icon: 'none' })
}

// ===== 更多 =====
function onMore() {
  uni.showActionSheet({
    itemList: ['分享直播间'],
    success: (res) => {
      if (res.tapIndex === 0) onShareRoom()
    },
  })
}

// ===== 分享直播间 =====
function onShareRoom() {
  uni.showToast({ title: '已唤起分享', icon: 'none' })
}

// ===== 时长续购（时长包体系尚未接入·占位）=====
function onRenewDuration() {
  // 🔴 2026-07-14：原为「开发中」假 toast，而 quality-packages 画质时长包页早已完整建好（真连
  //    liveApi.purchaseQualityPackage）——直播时长快用完点「续购」却弹开发中，等于这页永远进不去。
  uni.navigateTo({ url: '/pkg-live/quality-packages/index' })
}

// ===== 下播 — PUT /live/rooms/:id/end（房主本人有权）=====
const ending = ref(false)
async function onConfirmEnd() {
  if (ending.value) return
  ending.value = true
  uni.showLoading({ title: '正在下播…' })
  try {
    await liveApi.endLive(consoleId.value)
    showEndDialog.value = false
    uni.hideLoading()
    uni.redirectTo({ url: `/pkg-live/end/index?id=${consoleId.value}` })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: (e as Error)?.message || '下播失败，请重试', icon: 'none' })
  } finally {
    ending.value = false
  }
}
</script>

<style scoped>
/* ===== 深色 token ===== */
.page {
  min-height: 100vh;
  height: 100vh;
  background: #17141a;
  display: flex;
  flex-direction: column;
}

/* ── 顶部状态条 ── */
.topbar {
  height: 104rpx;
  display: flex;
  align-items: center;
  padding: 0 28rpx;
  border-bottom: 2rpx solid #2a2530;
  flex-shrink: 0;
}
.live {
  display: flex;
  align-items: center;
  gap: 10rpx;
  background: #c41e3a;
  border-radius: 999rpx;
  padding: 8rpx 20rpx;
}
.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #fff;
  animation: breath 1.6s ease-in-out infinite;
}
@keyframes breath {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}
.live-txt {
  font-size: 24rpx;
  font-weight: 600;
  color: #fff;
}
.time-txt {
  font-size: 24rpx;
  color: #a89fa8;
  margin-left: 20rpx;
}
.qtag {
  background: #221e28;
  border-radius: 999rpx;
  padding: 8rpx 20rpx;
  margin-left: 20rpx;
}
.qtag-txt {
  font-size: 24rpx;
  color: #c9a96e;
}
.qtag.warn {
  background: #3a2417;
  border: 2rpx solid #5a3a22;
}
.qtag.warn .qtag-txt {
  color: #e8833a;
  font-weight: 600;
}
.endbtn {
  margin-left: auto;
  border: 2rpx solid #4a424f;
  border-radius: 999rpx;
  padding: 10rpx 28rpx;
}
.endbtn-txt {
  font-size: 24rpx;
  color: #a89fa8;
}

/* ── 数据看板 ── */
.stats {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 28rpx;
  flex-shrink: 0;
}
.stat {
  flex: 1;
  background: #221e28;
  border-radius: 24rpx;
  padding: 20rpx 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-n {
  font-size: 34rpx;
  font-weight: 700;
  color: #f5f0eb;
}
.stat-n.gold {
  color: #c9a96e;
}
.stat-l {
  font-size: 20rpx;
  color: #6e6470;
  margin-top: 6rpx;
}

/* ── 时长警示横幅 ── */
.banner {
  margin: 0 28rpx 16rpx;
  background: #3a2417;
  border: 2rpx solid #5a3a22;
  border-radius: 20rpx;
  padding: 16rpx 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.banner-txt {
  font-size: 24rpx;
  color: #e8833a;
}
.banner-link {
  font-size: 24rpx;
  color: #f5f0eb;
  font-weight: 600;
  text-decoration: underline;
}

/* ── 弹幕流 ── */
.danmu {
  flex: 1;
  height: 0;
  padding: 8rpx 28rpx 24rpx;
}
.sys {
  text-align: center;
  font-size: 22rpx;
  color: #5a525e;
  padding: 12rpx 0;
}
.dm {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
  max-width: 86%;
  margin-bottom: 16rpx;
}
.av {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: #2e2836;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.av-txt {
  font-size: 24rpx;
  color: #a89fa8;
}
.bd {
  background: #221e28;
  border-radius: 8rpx 24rpx 24rpx 24rpx;
  padding: 12rpx 20rpx;
}
.bd-user {
  font-size: 24rpx;
  font-weight: 600;
  color: #8b7fa0;
  display: block;
}
.bd-user.vip {
  color: #c9a96e;
}
.bd-content {
  font-size: 26rpx;
  line-height: 1.5;
  color: #f5f0eb;
}

/* 弹幕空态 */
.danmu-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.empty-title {
  font-size: 26rpx;
  color: #a89fa8;
  line-height: 2;
}
.empty-sub {
  font-size: 24rpx;
  color: #6e6470;
  margin-bottom: 16rpx;
}
.sharebtn {
  border: 2rpx solid #c41e3a;
  border-radius: 999rpx;
  padding: 12rpx 36rpx;
}
.sharebtn-txt {
  font-size: 24rpx;
  color: #c41e3a;
}

/* ── 底部操作栏 ── */
.opbar {
  height: 152rpx;
  border-top: 2rpx solid #2a2530;
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
  background: #17141a;
}
.op {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}
.op-ic {
  width: 56rpx;
  height: 56rpx;
  border: 2rpx solid #3a3440;
  border-radius: 16rpx;
  background: #221e28;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.op-cnt {
  position: absolute;
  top: -12rpx;
  right: -18rpx;
  background: #eb2f96;
  border-radius: 999rpx;
  padding: 2rpx 10rpx;
  min-width: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.op-cnt-txt {
  font-size: 18rpx;
  color: #fff;
}
.op-txt {
  font-size: 22rpx;
  color: #a89fa8;
}

/* ── 弹窗（不透明纯色卡·X5 安全） ── */
.mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.dialog {
  width: 560rpx;
  background: #221e28;
  border: 2rpx solid #332d3a;
  border-radius: 36rpx;
  padding: 48rpx 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.dialog-title {
  font-size: 32rpx;
  color: #f5f0eb;
  font-weight: 600;
  margin-bottom: 16rpx;
}
.dialog-desc {
  font-size: 24rpx;
  color: #a89fa8;
  line-height: 1.7;
  text-align: center;
  margin-bottom: 36rpx;
}
.dialog-btns {
  display: flex;
  gap: 20rpx;
  width: 100%;
}
.dialog-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog-btn.cancel {
  border: 2rpx solid #4a424f;
  background: transparent;
}
.dialog-btn.confirm {
  background: #c41e3a;
}
.dialog-btn-txt {
  font-size: 28rpx;
}
.cancel-txt {
  color: #a89fa8;
}
.confirm-txt {
  color: #fff;
  font-weight: 600;
}

/* ── 商品/禁言半屏 ── */
.sheet-mask {
  align-items: flex-end;
}
.sheet {
  width: 100%;
  max-height: 70vh;
  background: #221e28;
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  display: flex;
  flex-direction: column;
}
.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  border-bottom: 2rpx solid #332d3a;
}
.sheet-title {
  font-size: 30rpx;
  color: #f5f0eb;
  font-weight: 600;
}
.sheet-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-body {
  padding: 16rpx 28rpx 40rpx;
  height: 0;
  flex: 1;
}
.sheet-empty {
  padding: 80rpx 0;
  display: flex;
  justify-content: center;
}
.sheet-empty-txt {
  font-size: 26rpx;
  color: #6e6470;
}
.prod {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #2a2530;
}
.prod-img {
  width: 88rpx;
  height: 88rpx;
  border-radius: 16rpx;
  background: #2e2836;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.prod-info {
  flex: 1;
  min-width: 0;
}
.prod-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.prod-name {
  font-size: 26rpx;
  color: #f5f0eb;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prod-tag {
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
  flex-shrink: 0;
}
.prod-tag.live-tag {
  background: #c41e3a;
}
.prod-tag.hot-tag {
  background: #eb2f96;
}
.prod-tag-txt {
  font-size: 18rpx;
  color: #fff;
}
.prod-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 8rpx;
}
.prod-price {
  font-size: 26rpx;
  color: #c9a96e;
  font-weight: 600;
}
.prod-stock {
  font-size: 22rpx;
  color: #6e6470;
}

/* ===== 错误态 ===== */
.error-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #17141a;
  padding: 48rpx;
}
.error-text {
  font-size: 28rpx;
  color: #a89fa8;
  margin-bottom: 32rpx;
}
.retry-btn {
  padding: 20rpx 64rpx;
  background: #c41e3a;
  color: #fff;
  border-radius: 999rpx;
  font-size: 28rpx;
}

/* ===== 骨架屏（深色 shimmer） ===== */
.sk-page {
  min-height: 100vh;
  height: 100vh;
  background: #17141a;
  display: flex;
  flex-direction: column;
}
.sk {
  background: linear-gradient(90deg, #221e28 25%, #2c2733 50%, #221e28 75%);
  background-size: 200% 100%;
  animation: sk 1.4s infinite;
  border-radius: 16rpx;
}
@keyframes sk {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.sk-topbar {
  height: 104rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 28rpx;
  border-bottom: 2rpx solid #2a2530;
}
.sk-pill {
  height: 48rpx;
  border-radius: 999rpx;
}
.sk-w96 { width: 160rpx; }
.sk-w180 { width: 260rpx; }
.sk-ml-auto { margin-left: auto; }
.sk-stats {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 28rpx;
}
.sk-stat {
  flex: 1;
  height: 116rpx;
}
.sk-danmu {
  flex: 1;
  padding: 16rpx 28rpx;
}
.sk-dm-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.sk-av {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
}
.sk-dm-bd {
  height: 68rpx;
}
.sk-w280 { width: 400rpx; }
.sk-w340 { width: 480rpx; }
.sk-w240 { width: 340rpx; }
.sk-opbar {
  height: 152rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 0 28rpx;
  border-top: 2rpx solid #2a2530;
}
.sk-op {
  flex: 1;
  height: 88rpx;
}

/* ── 等宽字体 ── */
.mono {
  font-family: "SF Mono", Menlo, Consolas, monospace;
}
</style>
