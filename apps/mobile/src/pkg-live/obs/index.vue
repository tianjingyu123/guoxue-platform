<template>
  <!-- 加载骨架屏 -->
  <view v-if="loading" class="page">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-btn" @tap="onBack">
          <AppIcon name="chevron-left" :size="40" color="#2C2C2C" />
        </view>
        <text class="nav-title">OBS 开播流程</text>
        <view class="nav-placeholder" />
      </view>
    </view>
    <view class="sk-summary"><view class="sk sk-line sk-w200" /></view>
    <view class="sk-steps"><view class="sk sk-line sk-w280" /></view>
    <view class="card"><view class="sk sk-line sk-w160 sk-mb" /><view class="sk sk-h72 sk-mb" /><view class="sk sk-h72" /></view>
    <view class="card"><view class="sk sk-line sk-w160 sk-mb" /><view class="sk sk-h84 sk-mb" /><view class="sk sk-h84" /></view>
    <view class="card"><view class="sk sk-line sk-w160 sk-mb" /><view class="sk sk-cta" /></view>
  </view>

  <!-- 错误状态 -->
  <view v-else-if="error" class="error-state">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="fetchData">重试</view>
  </view>

  <!-- 正常内容 -->
  <view v-else class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-btn" @tap="onBack">
          <AppIcon name="chevron-left" :size="40" color="#2C2C2C" />
        </view>
        <text class="nav-title">OBS 开播流程</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <!-- ============ 未创建房间态 ============ -->
    <view v-if="stage === 'none'" class="empty">
      <view class="empty-icon">
        <AppIcon name="monitor" :size="88" color="#C9A96E" />
      </view>
      <text class="empty-title">还没有可开播的 OBS 直播间</text>
      <text class="empty-desc">先创建一个「OBS 电脑直播」形态的直播间，再回到这里获取推流码</text>
      <view class="cta empty-cta" @tap="goCreate">去创建直播间</view>
    </view>

    <!-- ============ 待开播 / 已开播 ============ -->
    <template v-else>
      <!-- 直播间概要 -->
      <view class="summary">
        <text class="summary-txt">当前直播间：<text class="summary-title">{{ roomTitle || '直播间' }}</text></text>
        <view v-if="stage === 'living'" class="livebadge">
          <view class="live-dot" />
          <text class="livebadge-txt">直播中</text>
        </view>
        <text v-else-if="qualityLabel" class="summary-quality">{{ qualityLabel }}</text>
      </view>

      <!-- 步骤指示条 -->
      <view class="steps">
        <view class="stepn" :class="{ on: true }"><text class="stepn-txt">1</text></view>
        <text :class="stage === 'ready' ? 'steplab' : 'steptxt'">获取推流码</text>
        <view class="stepline" :class="{ done: stage === 'living' }" />
        <view class="stepn" :class="{ on: stage === 'living' }"><text class="stepn-txt">2</text></view>
        <text class="steptxt">配置 OBS</text>
        <view class="stepline" :class="{ done: stage === 'living' }" />
        <view class="stepn" :class="{ on: stage === 'living' }"><text class="stepn-txt">3</text></view>
        <text :class="stage === 'living' ? 'steplab' : 'steptxt'">{{ stage === 'living' ? '直播中' : '开始直播' }}</text>
      </view>

      <!-- ===== 待开播主态 ===== -->
      <template v-if="stage === 'ready'">
        <!-- 第一步 · 推流码 -->
        <view class="card">
          <view class="card-h">
            <view class="no"><text class="no-txt">1</text></view>
            <text class="card-h-txt">获取推流码</text>
          </view>

          <!-- 服务器地址 -->
          <view class="krow">
            <text class="k">服务器地址</text>
            <view class="v"><text class="v-txt mono">{{ serverUrl || '未配置' }}</text></view>
            <view class="copy-btn" @tap="copy(serverUrl, 'server')">
              <text class="copy-txt">{{ copiedField === 'server' ? '已复制' : '复制' }}</text>
            </view>
          </view>

          <!-- 推流密钥 -->
          <view class="krow">
            <text class="k">推流密钥</text>
            <view class="v">
              <text class="v-txt mono">{{ streamKey ? (showKey ? streamKey : maskedKey) : '未配置' }}</text>
              <view class="eye" @tap="showKey = !showKey">
                <AppIcon :name="showKey ? 'eye-off' : 'eye'" :size="30" color="#999" />
              </view>
            </view>
            <view class="copy-btn" @tap="copy(streamKey, 'key')">
              <text class="copy-txt">{{ copiedField === 'key' ? '已复制' : '复制' }}</text>
            </view>
          </view>

          <text class="tip">密钥请勿泄露给他人，泄露可能被冒名开播</text>
        </view>

        <!-- 第二步 · 配置 OBS -->
        <view class="card">
          <view class="card-h">
            <view class="no"><text class="no-txt">2</text></view>
            <text class="card-h-txt">配置 OBS</text>
          </view>
          <view class="fold" @tap="navigateTo('/pkg-live/obs-guide/index')">
            <text class="fold-txt">① 下载安装 OBS Studio</text>
            <view class="fold-x"><text class="fold-x-txt">查看</text></view>
          </view>
          <view class="fold" @tap="navigateTo('/pkg-live/obs-guide/index')">
            <text class="fold-txt">② 设置串流：粘贴地址与密钥</text>
            <view class="fold-x"><text class="fold-x-txt">查看</text></view>
          </view>
          <view class="fold last" @tap="navigateTo('/pkg-live/obs-guide/index')">
            <text class="fold-txt">③ 推荐输出参数</text>
            <view class="fold-x"><text class="fold-x-txt">查看</text></view>
          </view>
          <view class="guide-more" @tap="navigateTo('/pkg-live/obs-guide/index')">
            <text class="guide-more-txt">查看完整图文配置教程 ›</text>
          </view>
        </view>

        <!-- 第三步 · 开始直播 -->
        <view class="card">
          <view class="card-h">
            <view class="no"><text class="no-txt">3</text></view>
            <text class="card-h-txt">开始直播</text>
          </view>
          <text class="step3-desc">在电脑 OBS 上点击「开始推流」，然后回到本页点击下方按钮正式开播。</text>
          <view class="cta card-cta" :class="{ dis: starting }" @tap="onStart">
            {{ starting ? '开播中…' : '开始直播' }}
          </view>
        </view>
      </template>

      <!-- ===== 已开播态 ===== -->
      <template v-else>
        <view class="card">
          <view class="card-h">
            <view class="no ok"><AppIcon name="check" :size="24" color="#fff" /></view>
            <text class="card-h-txt">推流已连接</text>
          </view>
          <view class="living-row" @tap="showKeyLiving = !showKeyLiving">
            <text class="living-desc">直播已开始，推流码可展开查看</text>
            <view class="fold-x"><text class="fold-x-txt">{{ showKeyLiving ? '收起' : '展开' }}</text></view>
          </view>
          <template v-if="showKeyLiving">
            <view class="krow living-krow">
              <text class="k">服务器地址</text>
              <view class="v"><text class="v-txt mono">{{ serverUrl || '未配置' }}</text></view>
              <view class="copy-btn" @tap="copy(serverUrl, 'server')">
                <text class="copy-txt">{{ copiedField === 'server' ? '已复制' : '复制' }}</text>
              </view>
            </view>
            <view class="krow">
              <text class="k">推流密钥</text>
              <view class="v"><text class="v-txt mono">{{ streamKey ? maskedKey : '未配置' }}</text></view>
              <view class="copy-btn" @tap="copy(streamKey, 'key')">
                <text class="copy-txt">{{ copiedField === 'key' ? '已复制' : '复制' }}</text>
              </view>
            </view>
          </template>
        </view>

        <view class="card">
          <view class="card-h">
            <view class="no"><text class="no-txt">3</text></view>
            <text class="card-h-txt">管理直播</text>
          </view>
          <text class="step3-desc">前往控制台查看实时数据、弹幕与带货操作。</text>
          <view class="cta card-cta" @tap="goConsole">进入控制台</view>
        </view>
      </template>

      <view class="safe" />
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { liveApi } from '@/lib/live-data'

// 三态 UI
const loading = ref(true)
const error = ref('')

// 从 L1 创建 OBS 房后跳来带 ?id=；无 id 则走「未创建房间态」
const id = ref('')
onLoad((q) => {
  id.value = (q as Record<string, string> | undefined)?.id || ''
})

const statusBarHeight = ref(0)

// 推流码（真连 getObsStream，缺失诚实降级为空 → 模板显示「未配置」）
const serverUrl = ref('')
const streamKey = ref('')

// 直播间概要与阶段
const roomTitle = ref('')
const qualityLabel = ref('')
// stage：none=无可开播 OBS 房 / ready=待开播 / living=已开播
const stage = ref<'none' | 'ready' | 'living'>('none')

// 交互态
const showKey = ref(false)
const showKeyLiving = ref(false)
const copiedField = ref<string | null>(null)
const starting = ref(false)

const maskedKey = computed(() => '•'.repeat(Math.min(streamKey.value.length, 24)) || '••••••••••••')

const qualityMap: Record<string, string> = {
  basic: '标清',
  hd: '高清 720P',
  uhd: '超清 1080P',
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    // 无 id → 未创建可开播房间态，引导去 L1；不请求推流码
    if (!id.value) {
      stage.value = 'none'
      loading.value = false
      return
    }

    // 房间详情：判定待开播 / 已开播；推流码：真实推流地址+密钥
    const [room, cfg] = await Promise.all([
      liveApi.getWatch(id.value).catch(() => undefined),
      liveApi.getObsStream().catch(() => ({ serverUrl: '', streamKey: '' })),
    ])

    serverUrl.value = cfg?.serverUrl || ''
    streamKey.value = cfg?.streamKey || ''

    if (room) {
      roomTitle.value = room.title || ''
      qualityLabel.value = qualityMap[String((room as { quality?: string }).quality || '')] || ''
      // live=已开播；upcoming=待开播；replay/已结束仍按待开播引导（避免误挡）
      stage.value = room.status === 'live' ? 'living' : 'ready'
    } else {
      // 拿不到房间但带了 id：仍展示待开播流程（推流码为主）
      stage.value = 'ready'
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
  } catch (e) {}
  fetchData()
})

// 复制（真连剪贴板 API + toast，修「复制没调 API」问题）
function copy(text: string, field: string) {
  if (!text) {
    uni.showToast({ title: '暂无可复制内容', icon: 'none' })
    return
  }
  uni.setClipboardData({
    data: text,
    success: () => {
      copiedField.value = field
      uni.showToast({ title: '已复制', icon: 'none' })
      setTimeout(() => (copiedField.value = null), 2000)
    },
  })
}

// 开始直播（真连 startLive → 进控制台）
async function onStart() {
  if (starting.value || !id.value) {
    if (!id.value) uni.showToast({ title: '缺少直播间信息', icon: 'none' })
    return
  }
  starting.value = true
  try {
    await liveApi.startLive(id.value)
    uni.showToast({ title: '已开播', icon: 'success' })
    setTimeout(() => navigateTo(`/pkg-live/console/index?id=${id.value}`), 600)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '开播失败，请重试', icon: 'none' })
  } finally {
    starting.value = false
  }
}

function goConsole() {
  navigateTo(`/pkg-live/console/index?id=${id.value}`)
}

function goCreate() {
  navigateTo('/pkg-live/create/index')
}

function onBack() {
  goBack()
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 48rpx;
}

/* 顶部导航 */
.nav {
  background: #FAF8F5;
  border-bottom: 1rpx solid #E8E2D8;
}
.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
}
.nav-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.nav-placeholder {
  width: 56rpx;
}

/* 直播间概要 */
.summary {
  background: #fff;
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid #F0EBE2;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.summary-txt {
  font-size: 24rpx;
  color: #6E6E73;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.summary-title {
  color: #2C2C2C;
  font-weight: 600;
}
.summary-quality {
  flex-shrink: 0;
  margin-left: 16rpx;
  font-size: 24rpx;
  color: #C9A96E;
  font-weight: 600;
}
.livebadge {
  flex-shrink: 0;
  margin-left: 16rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  background: #FBF0F2;
  border-radius: 999rpx;
  padding: 6rpx 20rpx;
}
.live-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #C41E3A;
  animation: breath 1.6s ease-in-out infinite;
}
@keyframes breath {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
.livebadge-txt {
  font-size: 24rpx;
  color: #C41E3A;
  font-weight: 600;
}

/* 步骤指示条 */
.steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 28rpx 20rpx;
  background: #FAF8F5;
}
.stepn {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  border: 1rpx solid #DDD5C8;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stepn.on {
  background: #C41E3A;
  border-color: #C41E3A;
}
.stepn-txt {
  font-size: 24rpx;
  color: #999;
}
.stepn.on .stepn-txt {
  color: #fff;
}
.steptxt {
  font-size: 24rpx;
  color: #999;
}
.steplab {
  font-size: 24rpx;
  color: #C41E3A;
  font-weight: 600;
}
.stepline {
  width: 48rpx;
  height: 2rpx;
  background: #E8E2D8;
}
.stepline.done {
  background: #C41E3A;
}

/* 卡片 */
.card {
  background: #fff;
  margin: 24rpx 32rpx 0;
  border-radius: 24rpx;
  border: 1rpx solid #F0EBE2;
  padding: 32rpx;
}
.card-h {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 28rpx;
}
.no {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.no.ok {
  background: #C9A96E;
}
.no-txt {
  font-size: 24rpx;
  color: #fff;
  font-weight: 600;
}
.card-h-txt {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C2C2C;
}

/* 推流码行 */
.krow {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.k {
  width: 130rpx;
  flex-shrink: 0;
  font-size: 24rpx;
  color: #999;
}
.v {
  flex: 1;
  min-width: 0;
  height: 76rpx;
  box-sizing: border-box;
  background: #FAF8F5;
  border: 1rpx solid #F0EBE2;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
}
.v-txt {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  color: #6E6E73;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.mono {
  font-family: 'SF Mono', Menlo, Consolas, monospace;
}
.eye {
  flex-shrink: 0;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8rpx;
}
.copy-btn {
  flex-shrink: 0;
  height: 76rpx;
  padding: 0 24rpx;
  border: 1rpx solid #C41E3A;
  border-radius: 999rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.copy-txt {
  font-size: 24rpx;
  color: #C41E3A;
}
.tip {
  display: block;
  font-size: 22rpx;
  color: #C41E3A;
  margin-top: 8rpx;
}

/* 折叠教程 */
.fold {
  height: 84rpx;
  box-sizing: border-box;
  border: 1rpx solid #F0EBE2;
  border-radius: 20rpx;
  margin-bottom: 16rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.fold.last {
  margin-bottom: 0;
}
.fold-txt {
  font-size: 26rpx;
  color: #2C2C2C;
}
.fold-x {
  flex-shrink: 0;
  border: 1rpx solid #E8E2D8;
  border-radius: 999rpx;
  padding: 6rpx 18rpx;
}
.fold-x-txt {
  font-size: 22rpx;
  color: #999;
}
.guide-more {
  margin-top: 20rpx;
  display: flex;
  justify-content: center;
}
.guide-more-txt {
  font-size: 24rpx;
  color: #C41E3A;
  font-weight: 600;
}

/* 第三步说明 */
.step3-desc {
  display: block;
  font-size: 26rpx;
  color: #6E6E73;
  line-height: 1.7;
}
.card-cta {
  margin-top: 28rpx;
}

/* 已开播 */
.living-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.living-desc {
  font-size: 26rpx;
  color: #6E6E73;
}
.living-krow {
  margin-top: 24rpx;
}

/* 主按钮 */
.cta {
  height: 96rpx;
  border-radius: 999rpx;
  background: #C41E3A;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.25);
}
.cta.dis {
  background: #DDD5C8;
  box-shadow: none;
}

/* 未创建房间态 */
.empty {
  padding: 96rpx 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-icon {
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: #F0EBE2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
}
.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
  margin-bottom: 16rpx;
  text-align: center;
}
.empty-desc {
  font-size: 26rpx;
  color: #999;
  line-height: 1.7;
  text-align: center;
  margin-bottom: 48rpx;
}
.empty-cta {
  width: 100%;
}

.safe {
  height: 48rpx;
}

/* 骨架屏 */
.sk {
  background: linear-gradient(90deg, #EFEAE1 25%, #F7F4EE 50%, #EFEAE1 75%);
  background-size: 200% 100%;
  animation: sk 1.4s infinite;
  border-radius: 12rpx;
}
@keyframes sk {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.sk-summary {
  background: #fff;
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid #F0EBE2;
}
.sk-steps {
  padding: 28rpx 32rpx;
  display: flex;
  justify-content: center;
}
.sk-line {
  height: 28rpx;
}
.sk-w200 { width: 400rpx; }
.sk-w280 { width: 480rpx; }
.sk-w160 { width: 240rpx; }
.sk-mb { margin-bottom: 20rpx; }
.sk-h72 { height: 76rpx; }
.sk-h84 { height: 84rpx; }
.sk-cta { height: 96rpx; border-radius: 999rpx; }

/* 错误状态 */
.error-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #FAF8F5;
  padding: 48rpx;
}
.error-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 32rpx;
}
.retry-btn {
  padding: 20rpx 64rpx;
  background: #C41E3A;
  color: #fff;
  border-radius: 24rpx;
  font-size: 28rpx;
}
</style>
