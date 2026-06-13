<template>
  <!-- 横屏OBS知识授课布局 -->
  <template v-if="isHorizontal">
    <!-- 全屏模式 -->
    <template v-if="isFullscreen">
      <view class="obs-fullscreen" @click="resetControlsTimer" @touchmove="resetControlsTimer">
        <view class="obs-video-area">
          <view class="obs-video-placeholder">
            <text class="ovp-icon">📊</text>
            <text class="ovp-text">OBS课件直播画面</text>
            <text class="ovp-sub">16:9 横屏 · 沉浸式授课</text>
          </view>
        </view>

        <!-- 顶部控制栏 -->
        <view class="obs-top-bar" :class="{ hidden: !showObsControls }">
          <view class="otb-left">
            <view class="otb-avatar">{{ live.hostName[0] }}</view>
            <view class="otb-host-info">
              <view class="otb-host-row">
                <text class="otb-host-name">{{ live.hostName }}</text>
                <text class="otb-live-badge">直播中</text>
              </view>
              <text class="otb-title">{{ live.title }}</text>
            </view>
          </view>
          <view class="otb-mid">
            <text>👁️ {{ formatCount(live.viewerCount) }}人观看</text>
          </view>
          <view class="otb-right">
            <text class="otb-btn" @click.stop="noop()">📤 分享</text>
            <text class="otb-btn" @click.stop="isFullscreen = false">🗗 退出全屏</text>
          </view>
        </view>

        <!-- 底部控制栏 -->
        <view class="obs-bottom-bar" :class="{ hidden: !showObsControls }">
          <view class="obb-left">
            <text class="obb-play-btn">▶️</text>
            <view class="obb-volume">
              <text @click.stop="isVolumeMuted = !isVolumeMuted">{{ isVolumeMuted ? '🔇' : '🔊' }}</text>
              <view class="obb-vol-bar"><view class="obb-vol-fill" :style="{ width: isVolumeMuted ? '0%' : '70%' }" /></view>
            </view>
          </view>
          <view class="obb-mid">
            <text class="obb-danmaku-btn" :class="{ off: isMuted }" @click.stop="isMuted = !isMuted">{{ isMuted ? '弹幕已关' : '弹幕已开' }}</text>
          </view>
          <view class="obb-right">
            <text class="obb-chat-btn" @click.stop="showObsChatPanel = true">💬 讨论</text>
            <text class="obb-gift-btn" @click.stop="showGifts = true">🎁 打赏</text>
          </view>
        </view>

        <!-- 全屏弹幕 -->
        <view v-if="!isMuted && danmakuList.length" class="obs-danmaku">
          <view v-for="dm in danmakuList.slice(-4)" :key="dm?.id" class="od-item" v-show="dm">
            <text class="od-user">{{ dm.user }}</text>
            <text class="od-text">{{ dm.content }}</text>
          </view>
        </view>

        <!-- 讨论浮窗 -->
        <view v-if="showObsChatPanel" class="obs-chat-overlay" @click="showObsChatPanel = false">
          <view class="obs-chat-panel" @click.stop>
            <view class="ocp-header">
              <text class="ocp-title">实时讨论</text>
              <text class="ocp-close" @click="showObsChatPanel = false">✕</text>
            </view>
            <view class="ocp-list">
              <view v-for="dm in danmakuList" :key="dm?.id" class="ocp-item" v-show="dm">
                <view class="ocp-avatar">{{ dm.user[0] }}</view>
                <view class="ocp-info">
                  <text class="ocp-user">{{ dm.user }}</text>
                  <text class="ocp-msg">{{ dm.content }}</text>
                </view>
              </view>
            </view>
            <view class="ocp-input-row">
              <input v-model="message" class="ocp-input" placeholder="发送弹幕..." @confirm="handleSendMessage" />
              <text class="ocp-send" @click="handleSendMessage">📨</text>
            </view>
          </view>
        </view>

        <!-- 礼物面板 -->
        <view v-if="showGifts" class="vl-cover" @click="showGifts = false">
          <view class="gift-panel" @click.stop>
            <view class="gp-header">
              <view class="gph-title"><text>🎁 国学风礼物</text></view>
              <text class="gph-close" @click="showGifts = false">✕</text>
            </view>
            <view class="gp-grid">
              <view v-for="g in giftList" :key="g.id" class="gp-item">
                <text class="gpi-icon">{{ g.icon }}</text>
                <text class="gpi-name">{{ g.name }}</text>
                <text class="gpi-price">✨ {{ g.price }}</text>
              </view>
            </view>
            <view class="gp-footer">
              <text>✨ 余额: 1,288</text>
              <text class="gpf-btn">充值</text>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- 非全屏模式 -->
    <template v-else>
      <view class="obs-normal">
        <!-- 顶部栏 -->
        <view class="on-top">
          <view class="ont-left">
            <text class="ont-back" @click="uni.navigateBack()">‹</text>
            <view class="ont-avatar">{{ live.hostName[0] }}</view>
            <text class="ont-host">{{ live.hostName }}</text>
            <text class="ont-divider">|</text>
            <text class="ont-title">{{ live.title }}</text>
          </view>
          <view class="ont-right">
            <text>👁️ {{ formatCount(live.viewerCount) }}</text>
            <text class="ont-follow-btn" :class="{ followed: isFollowing }" @click="isFollowing = !isFollowing">{{ isFollowing ? '已关注' : '关注' }}</text>
            <text>📤</text>
          </view>
        </view>

        <!-- 视频区 -->
        <view class="on-video">
          <view class="onv-placeholder">
            <text class="onv-icon">📊</text>
            <text class="onv-text">OBS课件直播画面</text>
          </view>
          <text class="onv-fullscreen" @click="isFullscreen = true">⛶</text>
          <!-- 弹幕 -->
          <view v-if="!isMuted && danmakuList.length" class="onv-danmaku">
            <view v-for="dm in danmakuList.slice(-3)" :key="dm?.id" class="onvd-item" v-show="dm">
              <text class="onvd-user">{{ dm.user }}</text>
              <text class="onvd-text">{{ dm.content }}</text>
            </view>
          </view>
        </view>

        <!-- 底部Tab互动区 -->
        <view class="on-bottom">
          <view class="onb-tabs">
            <text v-for="tab in obsTabs" :key="tab.key" class="onb-tab" :class="{ active: obsActiveTab === tab.key }" @click="obsActiveTab = tab.key">{{ tab.label }}</text>
          </view>

          <view class="onb-content">
            <!-- 讨论 -->
            <template v-if="obsActiveTab === 'discussion'">
              <view class="onbc-chat-list">
                <view v-for="dm in danmakuList" :key="dm?.id" class="onbc-msg" v-show="dm">
                  <view class="onbc-avatar">{{ dm.user[0] }}</view>
                  <view>
                    <text class="onbc-user">{{ dm.user }}</text>
                    <text class="onbc-text">{{ dm.content }}</text>
                  </view>
                </view>
              </view>
              <view class="onbc-input-row">
                <input v-model="message" class="onbc-input" placeholder="发送弹幕..." @confirm="handleSendMessage" />
                <text class="onbc-send" @click="handleSendMessage">📨</text>
              </view>
            </template>

            <!-- 课件 -->
            <template v-if="obsActiveTab === 'slides'">
              <text class="onbc-section-hint">当前课件进度</text>
              <view v-for="slide in mockSlides" :key="slide.id" class="onbc-slide" :class="{ current: slide.isCurrent }">
                <view class="onbs-num" :class="{ current: slide.isCurrent }">
                  <text>{{ slide.id }}</text>
                </view>
                <text class="onbs-title">{{ slide.title }}</text>
                <text v-if="slide.isCurrent" class="onbs-badge">讲解中</text>
              </view>
            </template>

            <!-- 问答 -->
            <template v-if="obsActiveTab === 'qa'">
              <view class="onbc-qa-header">
                <text>观众提问</text>
                <text class="onbc-qa-ask-btn">💬 我要提问</text>
              </view>
              <view v-for="qa in mockQA" :key="qa.id" class="onbc-qa-item" :class="{ onwall: qa.isOnWall }">
                <view class="onbq-header">
                  <view class="onbq-avatar">{{ qa.user[0] }}</view>
                  <text class="onbq-user">{{ qa.user }}</text>
                  <text class="onbq-time">{{ qa.time }}</text>
                  <text v-if="qa.isOnWall" class="onbq-onwall">已上墙</text>
                </view>
                <text class="onbq-question">{{ qa.question }}</text>
              </view>
            </template>

            <!-- 资料 -->
            <template v-if="obsActiveTab === 'files'">
              <text class="onbc-section-hint">本课资料</text>
              <view v-for="file in mockFiles" :key="file.id" class="onbc-file">
                <view class="onbf-icon">📄</view>
                <view class="onbf-info">
                  <text class="onbf-name">{{ file.name }}</text>
                  <text class="onbf-size">{{ file.size }}</text>
                </view>
                <text class="onbf-download">下载</text>
              </view>
            </template>

            <!-- 简介 -->
            <template v-if="obsActiveTab === 'intro'">
              <view class="onbc-intro">
                <text class="onbi-section-title">课程介绍</text>
                <text class="onbi-text">本课程将深入讲解紫微斗数命盘的解读方法，包括十二宫位的含义、主星特性分析、四化飞星运用等核心内容。适合有一定基础的学员进阶学习。</text>
              </view>
              <view class="onbc-intro">
                <text class="onbi-section-title">讲师简介</text>
                <view class="onbi-host">
                  <view class="onbi-avatar">{{ live.hostName[0] }}</view>
                  <view>
                    <text class="onbi-name">{{ live.hostName }}</text>
                    <text class="onbi-role">{{ live.hostTitle }}</text>
                    <text class="onbi-fans">{{ formatCount(live.followerCount) }}粉丝</text>
                  </view>
                </view>
              </view>
            </template>
          </view>
        </view>

        <!-- 横屏提示 -->
        <view class="on-rotate-tip">
          <text>🔄 旋转手机获得最佳观看体验</text>
          <text class="onrt-fullscreen" @click="isFullscreen = true">全屏</text>
        </view>
      </view>
    </template>
  </template>

  <!-- 竖屏直播布局 -->
  <template v-else>
    <view class="vertical-live">
      <!-- 视频背景 -->
      <view class="vl-video-bg">
        <view class="vlv-placeholder">
          <text class="vlvp-icon">{{ isCommerce ? '🛍️' : '📖' }}</text>
          <text class="vlvp-text">直播画面</text>
        </view>
      </view>

      <!-- 顶部信息栏 -->
      <view class="vl-top" :class="{ collapsed: headerCollapsed }" @click="headerCollapsed = false">
        <view class="vlt-row">
          <!-- 主播信息胶囊 -->
          <view class="vlt-host-capsule" @click.stop="goPage('/pages/user/id-detail/index?id=' + live.id)">
            <view class="vlthc-avatar-wrap">
              <view class="vlthc-avatar">{{ live.hostName[0] }}</view>
              <view class="vlthc-live-dot" />
            </view>
            <view class="vlthc-info">
              <text class="vlthc-name">{{ live.hostName }}</text>
              <text class="vlthc-fans">{{ formatCount(live.followerCount) }} 粉丝</text>
            </view>
            <text class="vlthc-follow" :class="{ followed: isFollowing }" @click.stop="isFollowing = !isFollowing">{{ isFollowing ? '已关注' : '关注' }}</text>
          </view>

          <view class="vlt-right">
            <view class="vltr-viewers">
              <text>👥 {{ formatCount(live.viewerCount) }}</text>
            </view>
            <text class="vltr-close" @click="uni.navigateBack()">✕</text>
          </view>
        </view>
        <text class="vlt-title">{{ live.title }}</text>
      </view>

      <!-- 右上角人气榜 -->
      <view class="vl-rank-area">
        <text class="vlr-toggle" @click="showRank = !showRank">👑 榜单 {{ showRank ? '▲' : '▼' }}</text>
        <view v-if="showRank" class="vlr-list">
          <view v-for="item in mockRankList" :key="item.rank" class="vlr-item">
            <text class="vlr-rank" :class="'rank-' + item.rank">{{ item.rank }}</text>
            <text class="vlr-name">{{ item.user }}</text>
            <text class="vlr-amount">{{ item.amount }}</text>
          </view>
        </view>
      </view>

      <!-- 左侧弹幕 + 系统消息 -->
      <view class="vl-left-area">
        <!-- 系统消息 -->
        <view v-for="msg in systemMessages.slice(-1)" :key="msg?.id" class="vll-sys-msg" :class="'type-' + msg.type" v-show="msg">
          <text class="vlls-user">{{ msg.user }}</text>
          <text class="vlls-text">{{ msg.content }}</text>
          <text v-if="msg.giftIcon">{{ msg.giftIcon }}</text>
        </view>
        <!-- 弹幕 -->
        <view v-for="dm in danmakuList.slice(-3)" :key="dm?.id" class="vll-danmaku" v-show="dm">
          <text class="vlld-user">{{ dm.user }}</text>
          <text class="vlld-content">{{ dm.content }}</text>
        </view>
      </view>

      <!-- 右侧爱心动画 -->
      <view class="vl-hearts">
        <view v-for="heart in floatingHearts" :key="heart.id" class="vlh-heart" :style="{ left: heart.x + 'px' }">
          <text>❤️</text>
        </view>
      </view>

      <!-- 商品讲解小窗(电商直播) -->
      <view v-if="isCommerce && currentProduct" class="vl-product-bubble" @click="showProducts = true">
        <view class="vlpb-img">
          <text>📦</text>
          <text class="vlpb-badge">讲解中</text>
        </view>
        <text class="vlpb-price">¥{{ currentProduct.price }}</text>
      </view>

      <!-- 底部互动区 -->
      <view class="vl-bottom">
        <view class="vlb-row">
          <!-- 输入框 -->
          <view class="vlb-input-wrap">
            <input v-model="message" class="vlb-input" placeholder="说点什么..." @confirm="handleSendMessage" />
            <text class="vlb-send" @click="handleSendMessage">📨</text>
          </view>

          <text class="vlb-icon-btn" @click="handleLike">❤️</text>
          <text class="vlb-icon-btn gift" @click="showGifts = true">🎁</text>
          <text v-if="isCommerce" class="vlb-icon-btn cart" @click="showProducts = !showProducts">🛒<text v-if="mockProducts.length" class="vlb-cart-badge">{{ mockProducts.length }}</text></text>
          <text v-if="isKnowledge" class="vlb-icon-btn call">📞</text>
          <text class="vlb-icon-btn">📤</text>
          <text class="vlb-icon-btn">⋯</text>
        </view>
      </view>

      <!-- 礼物面板 -->
      <view v-if="showGifts" class="vl-cover" @click="showGifts = false">
        <view class="gift-panel" @click.stop>
          <view class="gp-header">
            <view class="gph-title"><text>🎁 国学风礼物</text></view>
            <text class="gph-close" @click="showGifts = false">✕</text>
          </view>
          <view class="gp-grid">
            <view v-for="g in giftList" :key="g.id" class="gp-item">
              <text class="gpi-icon">{{ g.icon }}</text>
              <text class="gpi-name">{{ g.name }}</text>
              <text class="gpi-price">✨ {{ g.price }}</text>
            </view>
          </view>
          <view class="gp-footer">
            <text>✨ 余额: 1,288</text>
            <text class="gpf-btn">充值</text>
          </view>
        </view>
      </view>

      <!-- 商品列表弹窗 -->
      <view v-if="showProducts" class="vl-cover" @click="showProducts = false">
        <view class="vl-products-panel" @click.stop>
          <view class="vlpp-header">
            <view class="vlpph-title">
              <text>🛒 商品列表</text>
              <text class="vlpph-count">{{ mockProducts.length }}件</text>
            </view>
            <text class="vlpph-close" @click="showProducts = false">✕</text>
          </view>
          <view class="vlpp-list">
            <view v-for="product in mockProducts" :key="product.id" class="vlpp-item" :class="{ explaining: product.isExplaining }">
              <view class="vlppi-img-wrap">
                <text class="vlppi-img">📦</text>
                <text v-if="product.isExplaining" class="vlppi-badge">讲解中</text>
              </view>
              <view class="vlppi-info">
                <text class="vlppi-name">{{ product.name }}</text>
                <view class="vlppi-price-row">
                  <text class="vlppi-price">¥{{ product.price }}</text>
                  <text class="vlppi-original">¥{{ product.originalPrice }}</text>
                </view>
                <view class="vlppi-meta">
                  <text>已售 {{ product.sales }}</text>
                  <text class="vlppi-stock">仅剩 {{ product.stock }} 件</text>
                </view>
              </view>
              <text class="vlppi-buy">{{ product.isExplaining ? '抢购' : '加购' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </template>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// ===== 直播数据 =====
const live = ref({
  id: '1',
  title: '八字命理入门：如何快速解读四柱八字',
  type: 'knowledge',
  orientation: 'vertical',
  hostName: '易道先生',
  hostTitle: '国学易经研究员',
  followerCount: 12800,
  viewerCount: 12580,
  likeCount: 58600,
  isFollowed: false,
})

const isCommerce = live.value.type === 'commerce'
const isKnowledge = live.value.type === 'knowledge'
const isHorizontal = live.value.orientation === 'horizontal'

// ===== 通用状态 =====
const isFollowing = ref(false)
const likeCount = ref(live.value.likeCount)
const showProducts = ref(false)
const showGifts = ref(false)
const showRank = ref(false)
const message = ref('')
const danmakuList = ref<any[]>([])
const systemMessages = ref<any[]>([])
const isMuted = ref(false)
const floatingHearts = ref<{ id: number; x: number }[]>([])
const headerCollapsed = ref(false)

// ===== 横屏OBS状态 =====
const isFullscreen = ref(false)
const showObsControls = ref(true)
const showObsChatPanel = ref(false)
const isVolumeMuted = ref(false)
const obsActiveTab = ref('discussion')
let obsControlsTimer: any = null

const obsTabs = [
  { key: 'discussion', label: '讨论' },
  { key: 'slides', label: '课件' },
  { key: 'qa', label: '问答' },
  { key: 'files', label: '资料' },
  { key: 'intro', label: '简介' },
]

const mockSlides = ref([
  { id: 1, title: '第一章：紫微斗数概述', isCurrent: false },
  { id: 2, title: '第二章：十二宫位详解', isCurrent: false },
  { id: 3, title: '第三章：主星特性分析', isCurrent: true },
  { id: 4, title: '第四章：四化飞星入门', isCurrent: false },
  { id: 5, title: '第五章：命盘实例解读', isCurrent: false },
])

const mockQA = ref([
  { id: 1, user: '易学小白', question: '老师，命宫化忌是不是一定不好？', time: '12:35', isOnWall: true },
  { id: 2, user: '紫微迷', question: '天机星在夫妻宫怎么解读？', time: '12:38', isOnWall: false },
  { id: 3, user: '命理爱好者', question: '太阳落陷需要注意什么？', time: '12:42', isOnWall: false },
])

const mockFiles = ref([
  { id: 1, name: '紫微斗数入门讲义.pdf', size: '2.3MB' },
  { id: 2, name: '命盘实例分析案例集.pdf', size: '5.1MB' },
  { id: 3, name: '本课思维导图.png', size: '890KB' },
])

// ===== 弹幕/消息数据 =====
const mockDanmaku = [
  { id: 1, user: '易学爱好者', content: '讲得太好了！', type: 'normal' },
  { id: 2, user: '命理初学', content: '老师这个怎么看大运？', type: 'normal' },
  { id: 3, user: '紫微门人', content: '666', type: 'normal' },
  { id: 4, user: '风水小白', content: '感谢老师分享', type: 'normal' },
  { id: 5, user: '国学传承', content: '受益匪浅', type: 'normal' },
]

const mockSystemMessages = [
  { id: 1, type: 'enter', user: '玄学新人', content: '进入了直播间' },
  { id: 2, type: 'gift', user: '易道弟子', content: '送出了 太极', giftIcon: '☯️' },
  { id: 3, type: 'buy', user: '福气满满', content: '购买了 开光招财貔貅摆件' },
]

const mockRankList = ref([
  { rank: 1, user: '易道传人', amount: 8888 },
  { rank: 2, user: '国学守护', amount: 5666 },
  { rank: 3, user: '玄学爱好', amount: 3288 },
])

const mockProducts = ref([
  { id: 'p1', name: '开光招财貔貅摆件', price: 299, originalPrice: 599, sales: 1280, stock: 56, isExplaining: true },
  { id: 'p2', name: '天然黄水晶转运葫芦', price: 168, originalPrice: 328, sales: 890, stock: 128, isExplaining: false },
  { id: 'p3', name: '紫檀木雕福禄寿三星', price: 1680, originalPrice: 2999, sales: 156, stock: 23, isExplaining: false },
])

const currentProduct = ref(mockProducts.value[0])

const giftList = ref([
  { id: 1, name: '太极', icon: '☯️', price: 1 },
  { id: 2, name: '梅花', icon: '🌸', price: 10 },
  { id: 3, name: '竹简', icon: '📜', price: 52 },
  { id: 4, name: '罗盘', icon: '🧭', price: 99 },
  { id: 5, name: '如意', icon: '🪬', price: 199 },
  { id: 6, name: '龙凤', icon: '🐉', price: 520 },
  { id: 7, name: '金元宝', icon: '🪙', price: 999 },
  { id: 8, name: '聚宝盆', icon: '🏆', price: 1888 },
])

// ===== 定时器 =====
let danmakuTimer: any = null
let sysMsgTimer: any = null
let headerTimer: any = null

onMounted(() => {
  let idx = 0
  danmakuTimer = setInterval(() => {
    if (idx < mockDanmaku.length) {
      danmakuList.value = [...danmakuList.value.slice(-3), mockDanmaku[idx]]
      idx++
    } else { idx = 0 }
  }, 2500)

  let si = 0
  sysMsgTimer = setInterval(() => {
    if (si < mockSystemMessages.length) {
      systemMessages.value = [...systemMessages.value.slice(-1), mockSystemMessages[si]]
      si++
    } else { si = 0 }
  }, 4000)

  headerTimer = setTimeout(() => { headerCollapsed.value = true }, 5000)
})

onUnmounted(() => {
  clearInterval(danmakuTimer)
  clearInterval(sysMsgTimer)
  clearTimeout(headerTimer)
  clearTimeout(obsControlsTimer)
})

// ===== 方法 =====
function handleLike() {
  likeCount.value++
  const heart = { id: Date.now(), x: Math.random() * 40 - 20 }
  floatingHearts.value = [...floatingHearts.value, heart]
  setTimeout(() => {
    floatingHearts.value = floatingHearts.value.filter(h => h.id !== heart.id)
  }, 1500)
}

function handleSendMessage() {
  if (!message.value.trim()) return
  danmakuList.value = [...danmakuList.value.slice(-3), { id: Date.now(), user: '我', content: message.value, type: 'normal' }]
  message.value = ''
}

function formatCount(count: number) {
  if (count >= 10000) return (count / 10000).toFixed(1) + '万'
  return String(count)
}

function resetControlsTimer() {
  clearTimeout(obsControlsTimer)
  showObsControls.value = true
  if (isFullscreen.value) {
    obsControlsTimer = setTimeout(() => { showObsControls.value = false }, 3000)
  }
}

function goPage(url: string) { uni.navigateTo({ url }) }
function noop() {}
</script>

<style scoped>
/* ========== 横屏OBS全屏模式 ========== */
.obs-fullscreen { position: fixed; inset: 0; background: #1a1a2e; overflow: hidden; z-index: 100; }
.obs-video-area { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: #000; }
.ovp-icon { font-size: 120rpx; }
.ovp-text { font-size: 32rpx; color: rgba(255,255,255,0.5); display: block; }
.ovp-sub { font-size: 24rpx; color: rgba(255,255,255,0.3); margin-top: 10rpx; display: block; }

.obs-top-bar { position: absolute; top: 0; left: 0; right: 0; z-index: 30; padding: 24rpx 32rpx; background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent); transition: all 0.3s; }
.obs-top-bar.hidden { opacity: 0; transform: translateY(-100%); pointer-events: none; }
.otb-left { display: flex; align-items: center; gap: 16rpx; }
.otb-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; border: 4rpx solid #C41E3A; background: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #fff; }
.otb-host-name { font-size: 28rpx; font-weight: 500; color: #fff; }
.otb-live-badge { font-size: 18rpx; padding: 4rpx 12rpx; border-radius: 4rpx; background: rgba(196,30,58,0.3); color: #C41E3A; }
.otb-title { font-size: 22rpx; color: rgba(255,255,255,0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 500rpx; display: block; }
.otb-mid { display: flex; align-items: center; gap: 10rpx; padding: 8rpx 20rpx; border-radius: 32rpx; background: rgba(255,255,255,0.1); color: #fff; font-size: 24rpx; }
.otb-right { display: flex; align-items: center; gap: 20rpx; }
.otb-btn { padding: 10rpx 20rpx; border-radius: 32rpx; background: rgba(255,255,255,0.1); color: #fff; font-size: 24rpx; }

.obs-bottom-bar { position: absolute; bottom: 0; left: 0; right: 0; z-index: 30; padding: 24rpx 32rpx; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); transition: all 0.3s; display: flex; justify-content: space-between; align-items: center; }
.obs-bottom-bar.hidden { opacity: 0; transform: translateY(100%); pointer-events: none; }
.obb-left { display: flex; align-items: center; gap: 24rpx; }
.obb-play-btn { font-size: 36rpx; }
.obb-volume { display: flex; align-items: center; gap: 12rpx; }
.obb-vol-bar { width: 180rpx; height: 6rpx; border-radius: 6rpx; background: rgba(255,255,255,0.2); overflow: hidden; }
.obb-vol-fill { height: 100%; background: #fff; border-radius: 6rpx; }
.obb-mid { display: flex; align-items: center; gap: 24rpx; }
.obb-danmaku-btn { padding: 10rpx 20rpx; border-radius: 32rpx; background: rgba(196,30,58,0.7); color: #fff; font-size: 24rpx; }
.obb-danmaku-btn.off { background: rgba(255,255,255,0.1); }
.obb-right { display: flex; align-items: center; gap: 20rpx; }
.obb-chat-btn { padding: 10rpx 24rpx; border-radius: 32rpx; background: rgba(255,255,255,0.1); color: #fff; font-size: 24rpx; }
.obb-gift-btn { padding: 10rpx 24rpx; border-radius: 32rpx; background: linear-gradient(to right, rgba(245,158,11,0.7), rgba(249,115,22,0.7)); color: #fff; font-size: 24rpx; }

.obs-danmaku { position: absolute; left: 24rpx; bottom: 140rpx; z-index: 20; max-width: 40%; display: flex; flex-direction: column; gap: 12rpx; }
.od-item { padding: 8rpx 20rpx; border-radius: 32rpx; background: rgba(0,0,0,0.6); }
.od-user { font-size: 24rpx; color: #C41E3A; }
.od-text { font-size: 24rpx; color: rgba(255,255,255,0.9); margin-left: 12rpx; }

.obs-chat-overlay { position: fixed; inset: 0; z-index: 40; }
.obs-chat-panel { position: absolute; right: 0; top: 0; bottom: 0; width: 500rpx; background: rgba(26,26,46,0.95); border-left: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; }
.ocp-header { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 24rpx; border-bottom: 1px solid rgba(255,255,255,0.1); }
.ocp-title { font-size: 28rpx; font-weight: 500; color: #fff; }
.ocp-close { font-size: 32rpx; color: rgba(255,255,255,0.6); }
.ocp-list { flex: 1; overflow-y: auto; padding: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.ocp-item { display: flex; gap: 12rpx; }
.ocp-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; background: rgba(196,30,58,0.2); display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #C41E3A; flex-shrink: 0; }
.ocp-user { font-size: 20rpx; color: rgba(255,255,255,0.5); display: block; }
.ocp-msg { font-size: 24rpx; color: rgba(255,255,255,0.9); }
.ocp-input-row { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 24rpx; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); }
.ocp-input { flex: 1; height: 72rpx; padding: 0 24rpx; border-radius: 36rpx; background: rgba(255,255,255,0.1); font-size: 24rpx; color: #fff; }
.ocp-send { width: 48rpx; height: 48rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 24rpx; }

/* ========== 横屏OBS非全屏 ========== */
.obs-normal { position: fixed; inset: 0; background: #1a1a2e; display: flex; flex-direction: column; overflow: hidden; z-index: 100; }
.on-top { height: 72rpx; background: #1a1a2e; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; flex-shrink: 0; }
.ont-left { display: flex; align-items: center; gap: 12rpx; }
.ont-back { font-size: 40rpx; color: #fff; }
.ont-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; border: 2rpx solid #C41E3A; background: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #fff; }
.ont-host { font-size: 24rpx; color: #fff; font-weight: 500; }
.ont-divider { font-size: 22rpx; color: rgba(255,255,255,0.3); }
.ont-title { font-size: 22rpx; color: rgba(255,255,255,0.5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 400rpx; }
.ont-right { display: flex; align-items: center; gap: 16rpx; color: rgba(255,255,255,0.6); font-size: 22rpx; }
.ont-follow-btn { padding: 6rpx 20rpx; border-radius: 32rpx; background: #C41E3A; color: #fff; font-size: 20rpx; }
.ont-follow-btn.followed { background: rgba(255,255,255,0.1); }

.on-video { position: relative; background: #000; flex-shrink: 0; padding-top: 56.25%; }
.onv-placeholder { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.onv-icon { font-size: 80rpx; }
.onv-text { font-size: 24rpx; color: rgba(255,255,255,0.3); }
.onv-fullscreen { position: absolute; right: 16rpx; bottom: 16rpx; width: 60rpx; height: 60rpx; border-radius: 12rpx; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-size: 32rpx; }
.onv-danmaku { position: absolute; left: 16rpx; bottom: 80rpx; max-width: 60%; display: flex; flex-direction: column; gap: 6rpx; }
.onvd-item { padding: 4rpx 16rpx; border-radius: 4rpx; background: rgba(0,0,0,0.4); }
.onvd-user { font-size: 22rpx; color: #C41E3A; opacity: 0.7; }
.onvd-text { font-size: 22rpx; color: #fff; opacity: 0.7; margin-left: 8rpx; }

.on-bottom { flex: 1; display: flex; flex-direction: column; min-height: 0; background: #fff; }
.onb-tabs { display: flex; border-bottom: 1px solid #E8E0D5; flex-shrink: 0; }
.onb-tab { flex: 1; text-align: center; padding: 18rpx 0; font-size: 24rpx; color: #999; position: relative; }
.onb-tab.active { color: #C41E3A; }
.onb-tab.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 36rpx; height: 4rpx; background: #C41E3A; border-radius: 4rpx; }
.onb-content { flex: 1; overflow-y: auto; padding: 16rpx; }

.onbc-chat-list { flex: 1; display: flex; flex-direction: column; gap: 12rpx; }
.onbc-msg { display: flex; gap: 10rpx; }
.onbc-avatar { width: 44rpx; height: 44rpx; border-radius: 50%; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; font-size: 18rpx; color: #C41E3A; flex-shrink: 0; }
.onbc-user { font-size: 20rpx; color: #999; display: block; }
.onbc-text { font-size: 24rpx; color: #333; }
.onbc-input-row { display: flex; align-items: center; gap: 10rpx; padding: 12rpx 0; }
.onbc-input { flex: 1; height: 64rpx; padding: 0 20rpx; border-radius: 32rpx; background: #F5F1EB; font-size: 24rpx; }
.onbc-send { width: 48rpx; height: 48rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 24rpx; }

.onbc-section-hint { font-size: 22rpx; color: #999; display: block; margin-bottom: 12rpx; }
.onbc-slide { display: flex; align-items: center; gap: 16rpx; padding: 16rpx; border-radius: 12rpx; border: 2rpx solid #E8E0D5; margin-bottom: 10rpx; }
.onbc-slide.current { border-color: #C41E3A; background: rgba(196,30,58,0.03); }
.onbs-num { width: 44rpx; height: 44rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #999; flex-shrink: 0; }
.onbs-num.current { background: #C41E3A; color: #fff; }
.onbs-title { flex: 1; font-size: 24rpx; color: #333; }
.onbs-badge { font-size: 18rpx; padding: 4rpx 12rpx; border-radius: 4rpx; background: rgba(196,30,58,0.08); color: #C41E3A; }

.onbc-qa-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; font-size: 22rpx; color: #999; }
.onbc-qa-ask-btn { font-size: 22rpx; color: #C41E3A; }
.onbc-qa-item { padding: 16rpx; border-radius: 12rpx; border: 2rpx solid #E8E0D5; margin-bottom: 12rpx; }
.onbc-qa-item.onwall { border-color: #C41E3A; background: rgba(196,30,58,0.03); }
.onbq-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.onbq-avatar { width: 36rpx; height: 36rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 16rpx; }
.onbq-user { font-size: 20rpx; color: #999; }
.onbq-time { font-size: 18rpx; color: #CCC; }
.onbq-onwall { font-size: 16rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: #C41E3A; color: #fff; }
.onbq-question { font-size: 24rpx; color: #333; }

.onbc-file { display: flex; align-items: center; gap: 16rpx; padding: 16rpx; border-radius: 12rpx; border: 2rpx solid #E8E0D5; margin-bottom: 10rpx; }
.onbf-icon { width: 72rpx; height: 72rpx; border-radius: 12rpx; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 36rpx; flex-shrink: 0; }
.onbf-info { flex: 1; min-width: 0; }
.onbf-name { font-size: 24rpx; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.onbf-size { font-size: 20rpx; color: #999; }
.onbf-download { padding: 10rpx 20rpx; border-radius: 8rpx; border: 2rpx solid #E8E0D5; font-size: 22rpx; color: #666; }

.onbc-intro { margin-bottom: 24rpx; }
.onbi-section-title { font-size: 26rpx; font-weight: 600; color: #333; display: block; margin-bottom: 10rpx; }
.onbi-text { font-size: 24rpx; color: #666; line-height: 1.6; }
.onbi-host { display: flex; gap: 16rpx; align-items: center; }
.onbi-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; border: 4rpx solid #C41E3A; background: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #fff; }
.onbi-name { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.onbi-role { font-size: 20rpx; color: #999; display: block; }
.onbi-fans { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }

.on-rotate-tip { position: fixed; top: 120rpx; left: 50%; transform: translateX(-50%); z-index: 50; padding: 12rpx 24rpx; border-radius: 32rpx; background: rgba(0,0,0,0.8); display: flex; align-items: center; gap: 16rpx; }
.on-rotate-tip > text { font-size: 22rpx; color: #fff; }
.onrt-fullscreen { padding: 6rpx 16rpx; border-radius: 32rpx; background: #C41E3A; color: #fff; font-size: 20rpx; }

/* ========== 竖屏直播 ========== */
.vertical-live { position: fixed; inset: 0; background: #000; overflow: hidden; z-index: 100; }
.vl-video-bg { position: absolute; inset: 0; background: linear-gradient(to bottom, #1a1a2e, #2d2d3f); }
.vlv-placeholder { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.vlvp-icon { font-size: 80rpx; }
.vlvp-text { font-size: 24rpx; color: rgba(255,255,255,0.3); margin-top: 10rpx; }

.vl-top { position: absolute; top: 0; left: 0; right: 0; z-index: 30; padding: 20rpx 24rpx; padding-top: calc(20rpx + env(safe-area-inset-top)); background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent); transition: opacity 0.3s; }
.vl-top.collapsed { opacity: 0.7; }
.vlt-row { display: flex; justify-content: space-between; align-items: center; }
.vlt-host-capsule { display: flex; align-items: center; gap: 12rpx; padding: 8rpx 20rpx 8rpx 10rpx; border-radius: 32rpx; background: rgba(0,0,0,0.4); }
.vlthc-avatar-wrap { position: relative; }
.vlthc-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; border: 4rpx solid #EF4444; background: #EF4444; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #fff; }
.vlthc-live-dot { position: absolute; bottom: 0; right: 0; width: 16rpx; height: 16rpx; border-radius: 50%; background: #EF4444; border: 2rpx solid #000; }
.vlthc-name { font-size: 26rpx; color: #fff; font-weight: 500; display: block; }
.vlthc-fans { font-size: 18rpx; color: rgba(255,255,255,0.6); }
.vlthc-follow { padding: 8rpx 20rpx; border-radius: 32rpx; background: #EF4444; color: #fff; font-size: 22rpx; margin-left: 8rpx; }
.vlthc-follow.followed { background: rgba(255,255,255,0.2); }
.vlt-right { display: flex; align-items: center; gap: 12rpx; }
.vltr-viewers { padding: 8rpx 16rpx; border-radius: 32rpx; background: rgba(0,0,0,0.4); color: #fff; font-size: 22rpx; }
.vltr-close { width: 56rpx; height: 56rpx; border-radius: 50%; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #fff; }
.vlt-title { font-size: 22rpx; color: rgba(255,255,255,0.8); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; margin-top: 10rpx; }

.vl-rank-area { position: absolute; top: 200rpx; right: 20rpx; z-index: 20; }
.vlr-toggle { padding: 6rpx 16rpx; border-radius: 32rpx; background: linear-gradient(to right, rgba(245,158,11,0.8), rgba(249,115,22,0.8)); color: #fff; font-size: 18rpx; }
.vlr-list { margin-top: 10rpx; width: 240rpx; background: rgba(0,0,0,0.6); border-radius: 20rpx; padding: 16rpx; display: flex; flex-direction: column; gap: 8rpx; }
.vlr-item { display: flex; align-items: center; gap: 10rpx; }
.vlr-rank { width: 36rpx; height: 36rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18rpx; font-weight: 700; }
.vlr-rank.rank-1 { background: #F59E0B; color: #fff; }
.vlr-rank.rank-2 { background: #9CA3AF; color: #374151; }
.vlr-rank.rank-3 { background: #92400E; color: #fff; }
.vlr-name { flex: 1; font-size: 22rpx; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vlr-amount { font-size: 18rpx; color: #F59E0B; }

.vl-left-area { position: absolute; left: 20rpx; bottom: 260rpx; right: 130rpx; z-index: 20; display: flex; flex-direction: column; gap: 10rpx; pointer-events: none; }
.vll-sys-msg { padding: 6rpx 20rpx; border-radius: 32rpx; font-size: 20rpx; color: rgba(255,255,255,0.8); max-width: fit-content; }
.vll-sys-msg.type-enter { background: rgba(255,255,255,0.1); }
.vll-sys-msg.type-gift { background: linear-gradient(to right, rgba(245,158,11,0.3), rgba(249,115,22,0.3)); color: #FDE68A; }
.vll-sys-msg.type-buy { background: linear-gradient(to right, rgba(239,68,68,0.3), rgba(236,72,153,0.3)); color: #F9A8D4; }
.vlls-user { font-weight: 500; }
.vlls-text { margin-left: 6rpx; }

.vll-danmaku { display: flex; align-items: flex-start; gap: 10rpx; }
.vlld-user { padding: 4rpx 16rpx; border-radius: 32rpx; background: rgba(196,30,58,0.3); color: #C41E3A; font-size: 18rpx; flex-shrink: 0; }
.vlld-content { font-size: 24rpx; color: rgba(255,255,255,0.9); }

.vl-hearts { position: absolute; right: 40rpx; bottom: 300rpx; z-index: 20; pointer-events: none; }
.vlh-heart { position: absolute; bottom: 0; animation: floatUp 1.5s ease-out forwards; font-size: 40rpx; }
@keyframes floatUp {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-160rpx) scale(0.5); }
}

.vl-product-bubble { position: absolute; right: 20rpx; bottom: 500rpx; z-index: 20; width: 140rpx; background: rgba(0,0,0,0.6); border-radius: 20rpx; border: 4rpx solid rgba(239,68,68,0.5); overflow: hidden; }
.vlpb-img { position: relative; aspect-ratio: 1; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 48rpx; }
.vlpb-badge { position: absolute; top: 6rpx; left: 6rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: #EF4444; color: #fff; font-size: 16rpx; }
.vlpb-price { display: block; text-align: center; padding: 8rpx; color: #EF4444; font-weight: 700; font-size: 24rpx; }

.vl-bottom { position: absolute; bottom: 0; left: 0; right: 0; z-index: 30; padding: 24rpx 16rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); }
.vlb-row { display: flex; align-items: center; gap: 16rpx; }
.vlb-input-wrap { flex: 1; display: flex; align-items: center; height: 72rpx; padding: 0 24rpx; border-radius: 36rpx; background: rgba(255,255,255,0.1); border: 2rpx solid rgba(255,255,255,0.1); }
.vlb-input { flex: 1; background: transparent; font-size: 24rpx; color: #fff; }
.vlb-send { width: 36rpx; height: 36rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 20rpx; flex-shrink: 0; }
.vlb-icon-btn { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 36rpx; position: relative; }
.vlb-icon-btn.gift { background: linear-gradient(135deg, rgba(245,158,11,0.3), rgba(249,115,22,0.3)); }
.vlb-icon-btn.cart { background: linear-gradient(135deg, rgba(239,68,68,0.3), rgba(236,72,153,0.3)); }
.vlb-cart-badge { position: absolute; top: -4rpx; right: -4rpx; width: 28rpx; height: 28rpx; border-radius: 50%; background: #EF4444; color: #fff; font-size: 16rpx; display: flex; align-items: center; justify-content: center; }

/* 商品面板 */
.vl-cover { position: absolute; inset: 0; z-index: 50; }
.vl-products-panel { position: absolute; bottom: 0; left: 0; right: 0; background: #fff; border-radius: 32rpx 32rpx 0 0; max-height: 60vh; display: flex; flex-direction: column; }
.vlpp-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; border-bottom: 1px solid #E8E0D5; flex-shrink: 0; }
.vlpph-title { display: flex; align-items: center; gap: 12rpx; font-size: 28rpx; font-weight: 600; color: #333; }
.vlpph-count { font-size: 22rpx; color: #999; }
.vlpph-close { font-size: 32rpx; color: #999; }
.vlpp-list { flex: 1; overflow-y: auto; padding: 16rpx 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.vlpp-item { display: flex; gap: 16rpx; padding: 16rpx; border-radius: 16rpx; border: 2rpx solid transparent; background: #FAF8F5; }
.vlpp-item.explaining { border-color: #EF4444; background: rgba(239,68,68,0.03); }
.vlppi-img-wrap { position: relative; width: 140rpx; height: 140rpx; border-radius: 12rpx; background: rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 48rpx; }
.vlppi-badge { position: absolute; top: -6rpx; left: -6rpx; padding: 4rpx 10rpx; border-radius: 4rpx; background: #EF4444; color: #fff; font-size: 16rpx; }
.vlppi-info { flex: 1; min-width: 0; }
.vlppi-name { font-size: 24rpx; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.vlppi-price-row { display: flex; align-items: baseline; gap: 10rpx; margin-top: 10rpx; }
.vlppi-price { font-size: 32rpx; font-weight: 700; color: #C41E3A; }
.vlppi-original { font-size: 22rpx; color: #999; text-decoration: line-through; }
.vlppi-meta { display: flex; gap: 12rpx; margin-top: 6rpx; font-size: 18rpx; color: #999; }
.vlppi-stock { color: #F97316; }
.vlppi-buy { padding: 12rpx 24rpx; border-radius: 12rpx; background: #C41E3A; color: #fff; font-size: 22rpx; align-self: center; flex-shrink: 0; }

/* ========== 礼物面板（共享） ========== */
.gift-panel { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to bottom, #1a1a2e, #000); border-radius: 32rpx 32rpx 0 0; padding: 24rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); }
.gp-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 20rpx; border-bottom: 1px solid rgba(255,255,255,0.1); }
.gph-title { display: flex; align-items: center; gap: 12rpx; font-size: 28rpx; font-weight: 600; color: #fff; }
.gph-close { font-size: 32rpx; color: rgba(255,255,255,0.6); }
.gp-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; padding: 24rpx 0; }
.gp-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 20rpx 12rpx; border-radius: 16rpx; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); }
.gpi-icon { font-size: 48rpx; }
.gpi-name { font-size: 22rpx; color: #fff; }
.gpi-price { font-size: 18rpx; color: #F59E0B; }
.gp-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 20rpx; border-top: 1px solid rgba(255,255,255,0.1); font-size: 24rpx; color: #fff; }
.gpf-btn { padding: 12rpx 32rpx; border-radius: 12rpx; background: linear-gradient(to right, #F59E0B, #F97316); color: #fff; font-size: 24rpx; }
</style>
