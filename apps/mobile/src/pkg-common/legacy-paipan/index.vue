<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { onBackPress } from '@dcloudio/uni-app'
import { legacyPaipanApi } from '@/lib/legacy-paipan-data'

const loading = ref(true)
const error = ref('')
const legacyUrl = ref('')

function returnToNewSystem() {
  uni.reLaunch({ url: '/pages/index/index' })
}

async function loadEntry() {
  loading.value = true
  error.value = ''
  legacyUrl.value = ''
  try {
    const entry = await legacyPaipanApi.entry()
    if (entry.mode !== 'legacy') {
      uni.reLaunch({ url: '/pages/paipan/index' })
      return
    }
    if (!entry.url || !entry.url.startsWith('https://')) throw new Error('旧排盘地址未正确配置')
    legacyUrl.value = entry.url
  } catch (cause) {
    error.value = (cause as Error)?.message || '旧排盘暂时无法打开'
  } finally {
    loading.value = false
  }
}

/** H5 不 iframe 第三方站点：新标签保留热卜，弹窗被拦截时才同页打开并保留历史返回。 */
function openLegacyH5() {
  // #ifdef H5
  if (!legacyUrl.value) return
  const opened = window.open('', '_blank')
  if (opened) {
    opened.opener = null
    opened.location.replace(legacyUrl.value)
    return
  }
  window.location.assign(legacyUrl.value)
  // #endif
}

/** 第三方未来接入消息桥时，只接受约定的返回动作，其他消息一律忽略。 */
function handleLegacyMessage(event: { detail?: { data?: unknown } }) {
  const payloads = Array.isArray(event?.detail?.data) ? event.detail.data : [event?.detail?.data]
  const payload = payloads[payloads.length - 1]
  if (!payload || typeof payload !== 'object') return
  const message = payload as Record<string, unknown>
  if (message.type === 'rebu:return' || message.action === 'return-to-rebu') returnToNewSystem()
}

function handleLegacyLoadError() {
  uni.showToast({ title: '旧排盘暂时无法打开', icon: 'none' })
  returnToNewSystem()
}

onMounted(() => { void loadEntry() })
onBackPress(() => {
  returnToNewSystem()
  return true
})
</script>

<template>
  <view v-if="loading" class="state" role="status" aria-live="polite">
    <view class="spinner" />
    <text class="title">正在连接旧版排盘</text>
    <text class="desc">连接期间不会向页面暴露热卜登录凭据</text>
  </view>

  <view v-else-if="error" class="state" role="alert">
    <text class="title">暂时无法进入旧版排盘</text>
    <text class="desc">{{ error }}</text>
    <button class="action primary" @tap="loadEntry">重试</button>
    <button class="action" @tap="returnToNewSystem">返回热卜首页</button>
  </view>

  <!-- #ifdef H5 -->
  <view v-if="!loading && !error" class="state legacy-gateway" role="main" aria-label="旧版排盘兼容入口">
    <view class="gateway-card">
      <view class="brand">热卜</view>
      <text class="title">旧版排盘兼容服务</text>
      <text class="desc">旧版排盘将在新页面打开；当前热卜页面会保留，完成后关闭新页面即可返回。</text>
      <button class="action primary" @tap="openLegacyH5">打开旧版排盘</button>
      <button class="action" @tap="returnToNewSystem">返回热卜首页</button>
      <text class="tip">若浏览器阻止新页面，将改在当前页打开，可使用浏览器返回键回到热卜。</text>
    </view>
  </view>
  <!-- #endif -->

  <!-- 默认原生导航栏由系统负责状态栏/刘海/挖孔安全区，WebView 只占正文窗口。 -->
  <!-- #ifndef H5 -->
  <web-view
    v-if="!loading && !error && legacyUrl"
    class="legacy-webview"
    :src="legacyUrl"
    @message="handleLegacyMessage"
    @error="handleLegacyLoadError"
  />
  <!-- #endif -->
</template>

<style scoped lang="scss">
.state {
  min-height: 100vh;
  padding: 48px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  box-sizing: border-box;
  background: #faf8f3;
  text-align: center;
}
.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(196, 30, 58, 0.16);
  border-top-color: #c41e3a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.title { color: #2c211a; font-size: 20px; font-weight: 700; }
.desc { max-width: 420px; color: #76695f; font-size: 14px; line-height: 1.7; }
.action {
  width: min(100%, 420px);
  height: 46px;
  margin: 4px 0 0;
  border: 1px solid #ddd4ca;
  border-radius: 23px;
  color: #2c211a;
  background: #fff;
  font-size: 15px;
  line-height: 44px;
}
.action::after { border: 0; }
.action.primary { border-color: #c41e3a; color: #fff; background: #c41e3a; }
.legacy-gateway {
  padding-top: calc(env(safe-area-inset-top) + 48px);
  padding-bottom: calc(env(safe-area-inset-bottom) + 48px);
  background: linear-gradient(180deg, #faf8f3 0%, #f3ede2 100%);
}
.gateway-card {
  width: min(100%, 440px);
  padding: 36px 28px 30px;
  border: 1px solid rgba(139, 94, 60, 0.16);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 50px rgba(74, 50, 30, 0.12);
  box-sizing: border-box;
}
.brand {
  width: 56px;
  height: 56px;
  margin: 0 auto 18px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #c41e3a;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 2px;
}
.gateway-card .desc { display: block; margin: 12px auto 20px; }
.gateway-card .action { display: block; margin: 12px auto 0; }
.tip { display: block; margin-top: 16px; color: #9a8d82; font-size: 12px; line-height: 1.6; }
.legacy-webview { width: 100%; height: 100%; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
