<template>
  <!-- 加载骨架屏 -->
  <view v-if="loading" class="skeleton-page">
    <view class="skeleton-header" />
    <view class="skeleton-main">
      <view class="skeleton-left">
        <view class="skeleton-stats" />
        <view class="skeleton-tab" />
      </view>
      <view class="skeleton-right" />
    </view>
  </view>
  <!-- 错误状态 -->
  <view v-else-if="error" class="error-state">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="fetchData">重试</view>
  </view>
  <!-- 正常内容 -->
  <view v-else class="page">
    <!-- 顶部控制栏 -->
    <view class="header">
      <view class="header-left">
        <view class="nav-btn" @tap="goBack">
          <AppIcon name="chevron-left" :size="40" color="#2C2C2C" />
        </view>
        <view class="title-group">
          <view v-if="isLive" class="badge-live">
            <AppIcon name="radio" :size="24" color="#fff" />
            <text class="badge-live-txt">直播中</text>
          </view>
          <view v-else class="badge-ended">已结束</view>
          <text class="room-name">{{ roomTitle }}</text>
        </view>
      </view>

      <view class="header-right">
        <!-- 直播时长 -->
        <view class="timer">
          <AppIcon name="clock" :size="32" color="#999" />
          <text class="timer-txt">{{ formatTime(liveTime) }}</text>
        </view>
        <!-- 控制按钮 -->
        <view class="ctrl-group">
          <view class="ctrl-btn" @tap="isMuted = !isMuted">
            <AppIcon :name="isMuted ? 'volume-x' : 'volume-2'" :size="32" color="#2C2C2C" />
          </view>
          <view class="ctrl-btn" @tap="showTeleprompter = !showTeleprompter">
            <AppIcon name="file-text" :size="32" color="#2C2C2C" />
          </view>
          <view class="ctrl-btn">
            <AppIcon name="settings" :size="32" color="#2C2C2C" />
          </view>
          <view class="end-btn" @tap="showEndDialog = true">
            <AppIcon name="stop-circle" :size="32" color="#fff" />
            <text class="end-btn-txt">结束直播</text>
          </view>
        </view>
      </view>
    </view>

    <view class="main">
      <!-- 左侧：核心数据 + 弹幕/连麦 -->
      <view class="left">
        <!-- 核心数据区 -->
        <view class="stats-area">
          <view class="stats-grid">
            <view class="stat-card blue">
              <view class="stat-head">
                <AppIcon name="users" :size="32" color="#3b82f6" />
                <text class="stat-label">在线人数</text>
              </view>
              <view class="stat-value-row">
                <text class="stat-value c-blue">{{ formatNum(stats.onlineCount) }}</text>
                <text class="stat-delta">+12</text>
              </view>
            </view>

            <view class="stat-card purple">
              <view class="stat-head">
                <AppIcon name="eye" :size="32" color="#a855f7" />
                <text class="stat-label">累计观看</text>
              </view>
              <view class="stat-value-row">
                <text class="stat-value c-purple">{{ formatNum(stats.totalViews) }}</text>
              </view>
            </view>

            <view class="stat-card amber">
              <view class="stat-head">
                <AppIcon name="gift" :size="32" color="#f59e0b" />
                <text class="stat-label">打赏收入</text>
              </view>
              <view class="stat-value-row">
                <text class="stat-value c-amber">¥{{ formatNum(stats.totalGift) }}</text>
              </view>
            </view>

            <view class="stat-card red">
              <view class="stat-head">
                <AppIcon name="shopping-bag" :size="32" color="#ef4444" />
                <text class="stat-label">带货成交</text>
              </view>
              <view class="stat-value-row">
                <text class="stat-value c-red">¥{{ formatNum(stats.totalSales) }}</text>
              </view>
            </view>
          </view>

          <!-- 次要数据 -->
          <view class="sub-stats">
            <text class="sub-item">峰值在线: <text class="sub-strong">{{ stats.peakOnline }}</text></text>
            <text class="sub-item">新增粉丝: <text class="sub-strong c-green">+{{ stats.newFollowers }}</text></text>
            <text class="sub-item">平均观看: <text class="sub-strong">{{ stats.avgWatchTime }}</text></text>
            <text class="sub-item">互动率: <text class="sub-strong">{{ stats.interactionRate }}</text></text>
          </view>
        </view>

        <!-- 弹幕/连麦 Tab区 -->
        <view class="tab-area">
          <view class="tab-bar">
            <view class="tab" :class="{ active: activeTab === 'danmaku' }" @tap="activeTab = 'danmaku'">
              <AppIcon name="message-circle" :size="28" :color="activeTab === 'danmaku' ? '#2C2C2C' : '#999'" />
              <text class="tab-txt">实时弹幕</text>
              <view class="tab-badge">{{ danmakuList.length }}</view>
            </view>
            <view class="tab" :class="{ active: activeTab === 'connect' }" @tap="activeTab = 'connect'">
              <AppIcon name="phone" :size="28" :color="activeTab === 'connect' ? '#2C2C2C' : '#999'" />
              <text class="tab-txt">连麦申请</text>
              <view v-if="connectRequests.length > 0" class="tab-badge red">{{ connectRequests.length }}</view>
            </view>
          </view>

          <!-- 弹幕列表 -->
          <view v-show="activeTab === 'danmaku'" class="danmaku-panel">
            <scroll-view scroll-y class="danmaku-list" :scroll-top="danmakuScrollTop" :scroll-with-animation="false">
              <view v-for="item in danmakuList" :key="item.id" class="danmaku-item">
                <view class="dm-level">{{ item.level }}</view>
                <view class="dm-body">
                  <view class="dm-head">
                    <text class="dm-user" :class="{ vip: item.isVip }">
                      <AppIcon v-if="item.isVip" name="crown" :size="24" color="#f59e0b" class="dm-crown" />{{ item.user }}
                    </text>
                    <text class="dm-time">{{ item.time }}</text>
                  </view>
                  <text class="dm-content">{{ item.content }}</text>
                </view>
                <view class="dm-actions">
                  <view class="dm-act" @tap="onPinDanmaku(item.id)"><AppIcon name="pin" :size="24" color="#666" /></view>
                  <view class="dm-act" @tap="onReplyDanmaku(item.id)"><AppIcon name="reply" :size="24" color="#666" /></view>
                  <view class="dm-act" @tap="handleDeleteDanmaku(item.id)"><AppIcon name="trash-2" :size="24" color="#ef4444" /></view>
                  <view class="dm-act" @tap="handleBanUser(item.id)"><AppIcon name="ban" :size="24" color="#ef4444" /></view>
                </view>
              </view>
            </scroll-view>

            <!-- 快捷回复 -->
            <view class="danmaku-input-area">
              <view class="input-row">
                <input v-model="danmakuDraft" class="dm-input" placeholder="发送弹幕..." placeholder-class="dm-input-ph" />
                <view class="send-btn" @tap="onSendDanmaku">
                  <AppIcon name="send" :size="32" color="#fff" />
                </view>
              </view>
              <view class="quick-replies">
                <view v-for="text in quickReplies" :key="text" class="quick-reply" @tap="onQuickReply(text)">
                  {{ text }}
                </view>
              </view>
            </view>
          </view>

          <!-- 连麦申请 -->
          <scroll-view v-show="activeTab === 'connect'" scroll-y class="connect-panel">
            <view v-if="connectRequests.length === 0" class="connect-empty">
              <AppIcon name="phone" :size="96" color="#ccc" />
              <text class="empty-txt">暂无连麦申请</text>
            </view>
            <view v-else class="connect-list">
              <view v-for="request in connectRequests" :key="request.id" class="connect-card">
                <view class="connect-avatar">{{ request.user[0] }}</view>
                <view class="connect-body">
                  <view class="connect-head">
                    <text class="connect-user">{{ request.user }}</text>
                    <text class="connect-wait">等待 {{ request.waitTime }}</text>
                  </view>
                  <text class="connect-reason">{{ request.reason }}</text>
                  <view class="connect-actions">
                    <view class="connect-accept" @tap="handleAcceptConnect(request.id)">
                      <AppIcon name="phone" :size="24" color="#fff" />
                      <text class="connect-accept-txt">接通</text>
                    </view>
                    <view class="connect-reject" @tap="handleRejectConnect(request.id)">
                      <AppIcon name="phone-off" :size="24" color="#2C2C2C" />
                      <text class="connect-reject-txt">拒绝</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 右侧：商品管理 + 营销工具 + 提词器 -->
      <view class="right">
        <!-- 商品管理区 -->
        <view class="product-area">
          <view class="product-head">
            <view class="product-head-left">
              <AppIcon name="shopping-bag" :size="32" color="#C41E3A" />
              <text class="product-head-title">商品管理</text>
              <view class="product-count">{{ products.length }}件</view>
            </view>
            <view class="refresh-stock" @tap="onRefreshStock">
              <AppIcon name="refresh-cw" :size="24" color="#666" />
              <text class="refresh-stock-txt">刷新库存</text>
            </view>
          </view>

          <!-- 当前讲解商品 -->
          <view v-if="liveProduct" class="live-product">
            <view class="live-product-tag">
              <AppIcon name="radio" :size="24" color="#C41E3A" />
              <text class="live-product-tag-txt">正在讲解</text>
            </view>
            <view class="live-product-row">
              <view class="live-product-img">
                <AppIcon name="package" :size="48" color="#ccc" />
              </view>
              <view class="live-product-info">
                <text class="live-product-name">{{ liveProduct.name }}</text>
                <view class="live-product-meta">
                  <text class="live-product-price">¥{{ liveProduct.price }}</text>
                  <text class="live-product-sold">已售{{ liveProduct.sold }}</text>
                </view>
              </view>
              <view class="live-product-stop" @tap="handleProductLive(0)">结束讲解</view>
            </view>
          </view>

          <!-- 商品列表 -->
          <scroll-view scroll-y class="product-list">
            <view v-for="product in offlineProducts" :key="product.id" class="product-item">
              <view class="product-img">
                <AppIcon name="package" :size="32" color="#ccc" />
              </view>
              <view class="product-info">
                <view class="product-name-row">
                  <text class="product-name">{{ product.name }}</text>
                  <view v-if="product.isHot" class="product-hot">爆</view>
                </view>
                <view class="product-meta">
                  <text class="product-price">¥{{ product.price }}</text>
                  <text class="product-stock">库存: <text :class="{ 'c-red': product.stock <= 10 }">{{ product.stock }}</text></text>
                </view>
              </view>
              <view class="product-on" @tap="handleProductLive(product.id)">上架讲解</view>
            </view>
          </scroll-view>

          <!-- 库存预警 -->
          <view v-if="lowStockCount > 0" class="stock-warn">
            <AppIcon name="alert-triangle" :size="28" color="#d97706" />
            <text class="stock-warn-txt">{{ lowStockCount }}件商品库存不足</text>
            <text class="stock-warn-link" @tap="onRestock">去补货</text>
          </view>
        </view>

        <!-- 营销工具 -->
        <view class="marketing-area">
          <view class="marketing-head">
            <AppIcon name="sparkles" :size="32" color="#f59e0b" />
            <text class="marketing-title">营销工具</text>
          </view>
          <view class="marketing-grid">
            <view class="marketing-btn" @tap="showLotteryDialog = true">
              <AppIcon name="gift" :size="40" color="#a855f7" />
              <text class="marketing-btn-txt">发起抽奖</text>
            </view>
            <view class="marketing-btn" @tap="showCouponDialog = true">
              <AppIcon name="ticket" :size="40" color="#ef4444" />
              <text class="marketing-btn-txt">发放优惠券</text>
            </view>
            <view class="marketing-btn" @tap="onPushFlashSale">
              <AppIcon name="zap" :size="40" color="#f59e0b" />
              <text class="marketing-btn-txt">推送秒杀</text>
            </view>
          </view>
        </view>

        <!-- 提词器 -->
        <view v-if="showTeleprompter" class="teleprompter-area">
          <view class="teleprompter-head">
            <view class="teleprompter-head-left">
              <AppIcon name="file-text" :size="32" color="#3b82f6" />
              <text class="teleprompter-title">提词器</text>
            </view>
            <view class="teleprompter-collapse" @tap="showTeleprompter = false">
              <AppIcon name="chevron-down" :size="32" color="#666" />
            </view>
          </view>
          <scroll-view scroll-y class="teleprompter-list">
            <view
              v-for="item in script"
              :key="item.id"
              class="script-item"
              :class="{ current: item.isCurrent, done: item.done }"
            >
              <view class="script-meta">
                <text class="script-time" :class="{ current: item.isCurrent }">{{ item.time }}</text>
                <view v-if="item.isCurrent" class="script-tag-current">当前</view>
                <view v-if="item.done" class="script-tag-done">已完成</view>
              </view>
              <text class="script-content" :class="{ current: item.isCurrent }">{{ item.content }}</text>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>

    <!-- 抽奖对话框 -->
    <view v-if="showLotteryDialog" class="dialog-mask" @tap="showLotteryDialog = false">
      <view class="dialog" @tap.stop>
        <view class="dialog-header">
          <text class="dialog-title">发起抽奖</text>
          <text class="dialog-desc">设置抽奖规则和奖品</text>
        </view>
        <view class="dialog-body">
          <view class="field">
            <text class="field-label">奖品名称</text>
            <input class="field-input" placeholder="如：八字精批课程" placeholder-class="field-ph" />
          </view>
          <view class="field-grid">
            <view class="field">
              <text class="field-label">中奖人数</text>
              <input type="number" class="field-input" placeholder="1" placeholder-class="field-ph" />
            </view>
            <view class="field">
              <text class="field-label">参与条件</text>
              <input class="field-input" placeholder="如：发送弹幕" placeholder-class="field-ph" />
            </view>
          </view>
          <view class="field">
            <text class="field-label">开奖时间（分钟后）</text>
            <input type="number" class="field-input" placeholder="5" placeholder-class="field-ph" />
          </view>
        </view>
        <view class="dialog-footer">
          <view class="dialog-btn outline" @tap="showLotteryDialog = false">取消</view>
          <view class="dialog-btn primary" @tap="showLotteryDialog = false">开始抽奖</view>
        </view>
      </view>
    </view>

    <!-- 优惠券对话框 -->
    <view v-if="showCouponDialog" class="dialog-mask" @tap="showCouponDialog = false">
      <view class="dialog" @tap.stop>
        <view class="dialog-header">
          <text class="dialog-title">发放优惠券</text>
          <text class="dialog-desc">向直播间观众发放优惠券</text>
        </view>
        <view class="dialog-body">
          <view class="field">
            <text class="field-label">选择优惠券</text>
            <view class="coupon-grid">
              <view v-for="coupon in coupons" :key="coupon.name" class="coupon-card">
                <text class="coupon-name">{{ coupon.name }}</text>
                <text class="coupon-count">剩余{{ coupon.count }}张</text>
              </view>
            </view>
          </view>
          <view class="field">
            <text class="field-label">发放数量</text>
            <input type="number" class="field-input" placeholder="10" placeholder-class="field-ph" />
          </view>
        </view>
        <view class="dialog-footer">
          <view class="dialog-btn outline" @tap="showCouponDialog = false">取消</view>
          <view class="dialog-btn primary" @tap="showCouponDialog = false">立即发放</view>
        </view>
      </view>
    </view>

    <!-- 结束直播确认 -->
    <view v-if="showEndDialog" class="dialog-mask" @tap="showEndDialog = false">
      <view class="dialog" @tap.stop>
        <view class="dialog-header">
          <text class="dialog-title">确认结束直播？</text>
          <text class="dialog-desc">本场直播已进行 {{ formatTime(liveTime) }}，累计观看 {{ stats.totalViews }} 人次</text>
        </view>
        <view class="dialog-body">
          <view class="end-stats">
            <view class="end-stat-card">
              <text class="end-stat-value c-primary">{{ stats.newFollowers }}</text>
              <text class="end-stat-label">新增粉丝</text>
            </view>
            <view class="end-stat-card">
              <text class="end-stat-value c-amber">¥{{ stats.totalGift + stats.totalSales }}</text>
              <text class="end-stat-label">总收入</text>
            </view>
          </view>
        </view>
        <view class="dialog-footer">
          <view class="dialog-btn outline" @tap="showEndDialog = false">继续直播</view>
          <view class="dialog-btn danger" @tap="onConfirmEnd">确认结束</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  liveApi,
  consoleCoupons,
  type ConsoleDanmaku,
  type ConsoleConnectRequest,
  type ConsoleProduct,
  type ConsoleScript,
} from '@/lib/live-data'

// ===== 三态UI =====
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
const connectRequests = ref<ConsoleConnectRequest[]>([])
const products = ref<ConsoleProduct[]>([])
const script = ref<ConsoleScript[]>([])
const coupons = ref(consoleCoupons)

// ===== UI 状态 ref =====
const isLive = ref(true)
const isMuted = ref(false)
const showTeleprompter = ref(true)
const activeTab = ref<'danmaku' | 'connect'>('danmaku')
const liveTime = ref(3892) // 秒
const showLotteryDialog = ref(false)
const showCouponDialog = ref(false)
const showEndDialog = ref(false)
const danmakuDraft = ref('')
const danmakuScrollTop = ref(0)

const quickReplies = ['欢迎新朋友', '感谢关注', '稍后解答', '请耐心等待']

// 派生
const liveProduct = computed(() => products.value.find((p) => p.isLive))
const offlineProducts = computed(() => products.value.filter((p) => !p.isLive))
const lowStockCount = computed(() => products.value.filter((p) => p.stock <= 10).length)

// 格式化（与原型 toLocaleString / formatTime 一致）
function formatNum(n: number) {
  return n.toLocaleString('en-US')
}
function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (v: number) => v.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

// ===== API 数据获取 =====
async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await liveApi.getConsoleData(consoleId.value)
    roomTitle.value = res.title || ''
    stats.value = res.stats
    danmakuList.value = res.danmaku
    connectRequests.value = res.requests
    products.value = res.products
    script.value = res.script
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

// ===== 定时器：直播计时 =====
let liveTimer: ReturnType<typeof setInterval> | null = null
let danmakuTimer: ReturnType<typeof setInterval> | null = null

function scrollDanmakuToBottom() {
  // uni scroll-view：改变 scroll-top 触发滚动到底部
  danmakuScrollTop.value = danmakuList.value.length * 9999
}

onLoad(async (options) => {
  if (options?.id) consoleId.value = String(options.id)
  await fetchData()
  liveTimer = setInterval(() => {
    if (isLive.value) liveTime.value += 1
  }, 1000)
  // 实时弹幕由直播推流/IM 推送，本地无实时流，仅展示真实初始弹幕（不再模拟假弹幕）
})

onUnmounted(() => {
  if (liveTimer) clearInterval(liveTimer)
  if (danmakuTimer) clearInterval(danmakuTimer)
})

// ===== 交互函数（UI 占位，业务逻辑由 Claude Code 对接）=====
// @data-needs: 发送弹幕，入参 content，成功后清空 danmakuDraft 并追加到 danmakuList
function onSendDanmaku() {}
function onQuickReply(_text: string) {}
// @data-needs: 置顶弹幕，入参 弹幕 id
function onPinDanmaku(_id: number) {}
// @data-needs: 回复弹幕，入参 弹幕 id
function onReplyDanmaku(_id: number) {}
// 删除弹幕（纯前端移除）
function handleDeleteDanmaku(id: number) {
  danmakuList.value = danmakuList.value.filter((d) => d.id !== id)
}
// @data-needs: 禁言用户，入参 userId
function handleBanUser(_id: number) {}
// 接受/拒绝连麦（纯前端移除，实际接通走后端 RTC）
// @data-needs: 接通连麦，入参 申请 id，建立 RTC 连接
function handleAcceptConnect(id: number) {
  connectRequests.value = connectRequests.value.filter((r) => r.id !== id)
}
function handleRejectConnect(id: number) {
  connectRequests.value = connectRequests.value.filter((r) => r.id !== id)
}
// 切换讲解商品（id=0 表示结束讲解）
function handleProductLive(productId: number) {
  products.value = products.value.map((p) => ({ ...p, isLive: p.id === productId }))
}
// @data-needs: 刷新商品库存
function onRefreshStock() {}
// @data-needs: 跳转补货页
function onRestock() {}
// @data-needs: 推送秒杀活动
function onPushFlashSale() {}
// @data-needs: 结束直播接口，落库本场数据后跳转直播管理首页
function onConfirmEnd() {
  isLive.value = false
  showEndDialog.value = false
  goBack()
}
</script>

<style scoped>
/* 骨架屏 */
.skeleton-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}
.skeleton-header {
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #eee;
}
.skeleton-main {
  flex: 1;
  display: flex;
}
.skeleton-left {
  flex: 1;
  padding: 16px;
}
.skeleton-stats {
  height: 160px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 16px;
}
.skeleton-tab {
  flex: 1;
  background: #fff;
  border-radius: 8px;
}
.skeleton-right {
  width: 300px;
  background: #fff;
}

/* 错误状态 */
.error-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  padding: 48rpx;
}
.error-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 32rpx;
}
.retry-btn {
  padding: 20rpx 64rpx;
  background: var(--brand);
  color: #fff;
  border-radius: 24rpx;
  font-size: 28rpx;
}

.page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* ===== 顶部控制栏 ===== */
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #fff;
  border-bottom: 1px solid #eee;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nav-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.badge-live {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #ef4444;
  border-radius: 499.5px;
  padding: 3px 8px;
}
.badge-live-txt {
  font-size: 11px;
  color: #fff;
}
.badge-ended {
  background: #eee;
  color: #666;
  border-radius: 499.5px;
  padding: 3px 8px;
  font-size: 11px;
}
.room-name {
  font-size: 14px;
  font-weight: 500;
  color: #2c2c2c;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.timer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: #f0f0f0;
  border-radius: 499.5px;
}
.timer-txt {
  font-size: 14px;
  font-weight: 500;
  font-family: monospace;
  color: #2c2c2c;
}
.ctrl-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ctrl-btn {
  width: 32px;
  height: 28px;
  border: 1px solid #ddd;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}
.end-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 12px;
  background: #ef4444;
  border-radius: 6px;
}
.end-btn-txt {
  font-size: 13px;
  color: #fff;
}

/* ===== 主体左右分栏 ===== */
.main {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #eee;
  background: #fff;
}
.right {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow: hidden;
}

/* ===== 核心数据区 ===== */
.stats-area {
  padding: 16px;
  border-bottom: 1px solid #eee;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.stat-card {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid;
}
.stat-card.blue {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1));
  border-color: rgba(59, 130, 246, 0.2);
}
.stat-card.purple {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1));
  border-color: rgba(168, 85, 247, 0.2);
}
.stat-card.amber {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(249, 115, 22, 0.1));
  border-color: rgba(245, 158, 11, 0.2);
}
.stat-card.red {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(236, 72, 153, 0.1));
  border-color: rgba(239, 68, 68, 0.2);
}
.stat-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.stat-label {
  font-size: 11px;
  color: #999;
}
.stat-value-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
}
.c-blue {
  color: #2563eb;
}
.c-purple {
  color: #9333ea;
}
.c-amber {
  color: #d97706;
}
.c-red {
  color: #dc2626;
}
.stat-delta {
  font-size: 11px;
  color: #22c55e;
}
.sub-stats {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.sub-item {
  font-size: 11px;
  color: #999;
}
.sub-strong {
  color: #2c2c2c;
  font-weight: 700;
}
.c-green {
  color: #22c55e;
}

/* ===== 弹幕/连麦 Tab ===== */
.tab-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.tab-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 16px;
  height: 40px;
  border-bottom: 1px solid #eee;
}
.tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 6px;
}
.tab.active {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.tab-txt {
  font-size: 12px;
  color: #999;
}
.tab.active .tab-txt {
  color: #2c2c2c;
}
.tab-badge {
  font-size: 10px;
  background: #eee;
  color: #666;
  border-radius: 4px;
  padding: 1px 4px;
}
.tab-badge.red {
  background: #ef4444;
  color: #fff;
}

.danmaku-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.danmaku-list {
  flex: 1;
  padding: 12px;
  height: 0;
}
.danmaku-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
}
.dm-level {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}
.dm-body {
  flex: 1;
  min-width: 0;
}
.dm-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dm-user {
  font-size: 12px;
  font-weight: 500;
  color: #999;
  display: flex;
  align-items: center;
}
.dm-user.vip {
  color: #f59e0b;
}
.dm-crown {
  margin-right: 2px;
}
.dm-time {
  font-size: 10px;
  color: #999;
}
.dm-content {
  font-size: 14px;
  color: #2c2c2c;
  margin-top: 2px;
  display: block;
}
.dm-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
.dm-act {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.danmaku-input-area {
  padding: 12px;
  border-top: 1px solid #eee;
}
.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dm-input {
  flex: 1;
  height: 36px;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 13px;
  background: #fff;
}
.dm-input-ph {
  color: #999;
}
.send-btn {
  width: 36px;
  height: 36px;
  background: var(--brand);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.quick-reply {
  height: 24px;
  line-height: 22px;
  padding: 0 8px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 10px;
  color: #2c2c2c;
  white-space: nowrap;
}

/* 连麦 */
.connect-panel {
  flex: 1;
  padding: 12px;
  height: 0;
}
.connect-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}
.empty-txt {
  font-size: 14px;
  color: #999;
  margin-top: 8px;
}
.connect-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.connect-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 8px;
}
.connect-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #666;
  flex-shrink: 0;
}
.connect-body {
  flex: 1;
  min-width: 0;
}
.connect-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.connect-user {
  font-size: 14px;
  font-weight: 500;
  color: #2c2c2c;
}
.connect-wait {
  font-size: 12px;
  color: #999;
}
.connect-reason {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  display: block;
}
.connect-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.connect-accept {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 12px;
  background: var(--brand);
  border-radius: 6px;
}
.connect-accept-txt {
  font-size: 12px;
  color: #fff;
}
.connect-reject {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
}
.connect-reject-txt {
  font-size: 12px;
  color: #2c2c2c;
}

/* ===== 右侧商品管理 ===== */
.product-area {
  border-bottom: 1px solid #eee;
}
.product-head {
  padding: 12px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.product-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.product-head-title {
  font-size: 14px;
  font-weight: 500;
  color: #2c2c2c;
}
.product-count {
  font-size: 10px;
  background: #eee;
  color: #666;
  border-radius: 4px;
  padding: 1px 5px;
}
.refresh-stock {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
}
.refresh-stock-txt {
  font-size: 12px;
  color: #666;
}
.live-product {
  padding: 12px;
  background: rgba(196, 30, 58, 0.05);
  border-bottom: 1px solid rgba(196, 30, 58, 0.2);
}
.live-product-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}
.live-product-tag-txt {
  font-size: 12px;
  color: var(--brand);
  font-weight: 500;
}
.live-product-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.live-product-img {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.live-product-info {
  flex: 1;
  min-width: 0;
}
.live-product-name {
  font-size: 14px;
  font-weight: 500;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.live-product-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.live-product-price {
  color: var(--brand);
  font-weight: 700;
  font-size: 14px;
}
.live-product-sold {
  font-size: 12px;
  color: #999;
}
.live-product-stop {
  height: 28px;
  line-height: 26px;
  padding: 0 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 12px;
  color: #2c2c2c;
  background: #fff;
  flex-shrink: 0;
}
.product-list {
  height: 180px;
  padding: 8px;
}
.product-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
}
.product-img {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.product-info {
  flex: 1;
  min-width: 0;
}
.product-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.product-name {
  font-size: 12px;
  font-weight: 500;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.product-hot {
  font-size: 8px;
  background: #ef4444;
  color: #fff;
  border-radius: 3px;
  padding: 0 3px;
  flex-shrink: 0;
}
.product-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: #999;
  margin-top: 2px;
}
.product-price {
  color: var(--brand);
  font-weight: 500;
}
.product-stock {
  font-size: 10px;
  color: #999;
}
.product-on {
  height: 24px;
  line-height: 22px;
  padding: 0 8px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 10px;
  color: #2c2c2c;
  background: #fff;
  flex-shrink: 0;
}
.stock-warn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: rgba(245, 158, 11, 0.1);
  border-top: 1px solid rgba(245, 158, 11, 0.2);
}
.stock-warn-txt {
  font-size: 12px;
  color: #d97706;
  font-weight: 500;
}
.stock-warn-link {
  font-size: 12px;
  color: #d97706;
}

/* ===== 营销工具 ===== */
.marketing-area {
  padding: 12px;
  border-bottom: 1px solid #eee;
}
.marketing-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.marketing-title {
  font-size: 14px;
  font-weight: 500;
  color: #2c2c2c;
}
.marketing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.marketing-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 0;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
}
.marketing-btn-txt {
  font-size: 10px;
  color: #2c2c2c;
}

/* ===== 提词器 ===== */
.teleprompter-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.teleprompter-head {
  padding: 12px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.teleprompter-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.teleprompter-title {
  font-size: 14px;
  font-weight: 500;
  color: #2c2c2c;
}
.teleprompter-collapse {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.teleprompter-list {
  flex: 1;
  height: 0;
  padding: 12px;
}
.script-item {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #eee;
  margin-bottom: 8px;
}
.script-item.current {
  background: rgba(196, 30, 58, 0.1);
  border-color: var(--brand);
}
.script-item.done {
  background: #f5f5f5;
  opacity: 0.6;
}
.script-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.script-time {
  font-size: 10px;
  font-family: monospace;
  background: #eee;
  color: #666;
  border-radius: 4px;
  padding: 2px 6px;
}
.script-time.current {
  background: var(--brand);
  color: #fff;
}
.script-tag-current {
  font-size: 10px;
  background: rgba(196, 30, 58, 0.2);
  color: var(--brand);
  border-radius: 4px;
  padding: 1px 5px;
}
.script-tag-done {
  font-size: 10px;
  background: #eee;
  color: #666;
  border-radius: 4px;
  padding: 1px 5px;
}
.script-content {
  font-size: 14px;
  color: #2c2c2c;
  display: block;
}
.script-content.current {
  font-weight: 500;
}

/* ===== 弹窗 ===== */
.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}
.dialog {
  width: 100%;
  max-width: 320px;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
}
.dialog-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dialog-title {
  font-size: 17px;
  font-weight: 600;
  color: #2c2c2c;
}
.dialog-desc {
  font-size: 13px;
  color: #999;
}
.dialog-body {
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.field-label {
  font-size: 13px;
  color: #2c2c2c;
  font-weight: 500;
}
.field-input {
  height: 36px;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 13px;
  background: #fff;
}
.field-ph {
  color: #999;
}
.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.coupon-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.coupon-card {
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.coupon-name {
  font-size: 13px;
  font-weight: 500;
  color: #2c2c2c;
}
.coupon-count {
  font-size: 11px;
  color: #999;
}
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.dialog-btn {
  height: 36px;
  line-height: 34px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
}
.dialog-btn.outline {
  border: 1px solid #ddd;
  color: #2c2c2c;
  background: #fff;
}
.dialog-btn.primary {
  background: var(--brand);
  color: #fff;
}
.dialog-btn.danger {
  background: #ef4444;
  color: #fff;
}
.end-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  text-align: center;
}
.end-stat-card {
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 8px;
}
.end-stat-value {
  font-size: 22px;
  font-weight: 700;
  display: block;
}
.c-primary {
  color: var(--brand);
}
.c-amber {
  color: #f59e0b;
}
.end-stat-label {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  display: block;
}
</style>
