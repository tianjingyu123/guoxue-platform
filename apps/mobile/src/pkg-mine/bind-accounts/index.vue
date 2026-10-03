<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import { mineApi, type BoundAccount } from '@/lib/mine-data'
import { subscribeAuthContext } from '@/utils/storage'
import { currentBindingUser, requestBindingWechatCode, submitWechatBinding } from '@/utils/wechat-account-binding'
// #ifdef APP-PLUS
import { hydrateRemoteConfig, isClientFeatureEnabled } from '@/lib/remote-config'
// #endif
// #ifdef H5
import { authApi } from '@/lib/auth-data'
import { createBindingAttempt, consumeBindingAttempt, clearBindingAttempt } from '@/utils/wechat-account-binding'
import { navigateWechatAuthorization } from '@/utils/wechat-top-level'
// #endif

const accounts = ref<BoundAccount[]>([])
const loading = ref(true)
const error = ref('')
const processing = ref(false)
const notice = ref('')
const unbindTarget = ref<BoundAccount | null>(null)
const authorizationUrl = ref('')
let authorizationUser = ''
let pageUser = ''
let disposed = false
let fetchSequence = 0
const wechatAvailable = ref(false)
const providerIcon: Record<string, string> = { wechat: 'message-circle', qq: 'message-square', apple: 'smartphone' }
const boundCount = computed(() => accounts.value.filter((account) => account.isBound).length)
const busy = computed(() => processing.value || Boolean(authorizationUrl.value))

function cancelAuthorization() {
  authorizationUrl.value = ''
  authorizationUser = ''
  // #ifdef H5
  clearBindingAttempt(window.sessionStorage)
  // #endif
}

async function fetchData() {
  const userId = currentBindingUser()
  const sequence = ++fetchSequence
  loading.value = true
  error.value = ''
  try {
    if (!userId) throw new Error('请先登录后再管理绑定账号')
    const data = await mineApi.getBoundAccounts()
    if (disposed || sequence !== fetchSequence || currentBindingUser() !== userId) return
    accounts.value = data
  } catch (cause) {
    if (!disposed && sequence === fetchSequence) error.value = (cause as Error).message || '加载失败，请重试'
  } finally {
    if (!disposed && sequence === fetchSequence) loading.value = false
  }
}

const unsubscribe = subscribeAuthContext(() => {
  const currentUser = currentBindingUser()
  if (currentUser === pageUser) return
  pageUser = currentUser
  accounts.value = []
  unbindTarget.value = null
  cancelAuthorization()
  notice.value = '登录账号已变化，请重新发起操作'
  void fetchData()
})
onUnmounted(() => { disposed = true; ++fetchSequence; unsubscribe() })

async function handleBind() {
  if (busy.value || !wechatAvailable.value) return
  const userId = currentBindingUser()
  processing.value = true
  notice.value = ''
  try {
    if (!userId) throw new Error('请先登录后再绑定微信')
    // #ifdef APP-PLUS
    await hydrateRemoteConfig(true)
    if (!isClientFeatureEnabled('client_wechat_app_login')) throw new Error('APP微信授权暂不可用，请稍后重试')
    // #endif
    // #ifdef H5
    const attempt = createBindingAttempt(userId, window.sessionStorage, window.crypto)
    authorizationUser = userId
    const url = await authApi.getWechatOAuthUrl(new URL('/h5/wechat-oauth-callback.html', window.location.origin).toString(), attempt.state)
    if (disposed || currentBindingUser() !== userId) { cancelAuthorization(); return }
    authorizationUrl.value = url
    return
    // #endif
    // #ifdef APP-PLUS || MP-WEIXIN
    if (disposed || currentBindingUser() !== userId) return
    const code = await requestBindingWechatCode()
    let channel: 'app' | 'miniprogram' = 'miniprogram'
    // #ifdef APP-PLUS
    channel = 'app'
    // #endif
    await submitWechatBinding(userId, code, channel)
    if (disposed || currentBindingUser() !== userId) return
    await fetchData()
    notice.value = error.value ? '绑定已完成，状态加载失败，请重试' : '微信已绑定，可用于登录当前账号'
    // #endif
  } catch (cause) {
    if (!disposed && currentBindingUser() === userId) {
      cancelAuthorization()
      notice.value = (cause as Error).message || '微信绑定失败，请重试'
    }
  } finally { processing.value = false }
}

function continueAuthorization() {
  // #ifdef H5
  try {
    if (currentBindingUser() !== authorizationUser) throw new Error('登录账号已变化，请重新发起微信绑定')
    // 同步用户手势进入微信授权，避免 XWeb 异步跳转白屏。
    navigateWechatAuthorization(window, authorizationUrl.value)
  } catch (cause) { cancelAuthorization(); notice.value = (cause as Error).message }
  // #endif
}

async function handleUnbind() {
  if (!unbindTarget.value || busy.value) return
  const userId = currentBindingUser()
  const target = unbindTarget.value
  processing.value = true
  notice.value = ''
  try {
    await mineApi.toggleBind(target.provider, false, userId)
    if (disposed || currentBindingUser() !== userId) return
    await fetchData()
    notice.value = error.value ? '解绑已完成，状态加载失败，请重试' : target.name + '已解绑'
  } catch (cause) {
    if (!disposed && currentBindingUser() === userId) notice.value = (cause as Error).message || '解绑失败，请重试'
  } finally { processing.value = false; unbindTarget.value = null }
}

onLoad(async (query) => {
  pageUser = currentBindingUser()
  // #ifdef MP-WEIXIN
  wechatAvailable.value = true
  // #endif
  // #ifdef APP-PLUS
  try { await hydrateRemoteConfig(true); wechatAvailable.value = isClientFeatureEnabled('client_wechat_app_login') } catch { wechatAvailable.value = false }
  // #endif
  // #ifdef H5
  wechatAvailable.value = /MicroMessenger/i.test(navigator.userAgent)
  if (query?.wx_bind === '1') {
    const code = typeof query.code === 'string' ? query.code.trim() : ''
    const state = typeof query.state === 'string' ? query.state : ''
    const valid = consumeBindingAttempt(state, pageUser, window.sessionStorage)
    const cleanUrl = new URL(window.location.href)
    for (const key of ['code', 'state', 'wx_bind']) cleanUrl.searchParams.delete(key)
    window.history.replaceState(window.history.state, '', cleanUrl.toString())
    processing.value = true
    try {
      if (!valid || !code) throw new Error('微信授权已失效，请重新绑定')
      await submitWechatBinding(pageUser, code, 'h5')
      if (!disposed && currentBindingUser() === pageUser) notice.value = '微信已绑定，可用于登录当前账号'
    } catch (cause) { if (!disposed) notice.value = (cause as Error).message || '微信绑定失败，请重试' }
    finally { processing.value = false }
  }
  // #endif
  if (!disposed) await fetchData()
})
</script>

<template>
  <view class="page">
    <app-nav-bar
      title="第三方账号"
      :back-size="40"
      background="#faf8f5"
    />
    <scroll-view
      scroll-y
      class="scroll"
    >
      <view class="intro">
        <text class="eyebrow">
          登录与账号
        </text><text class="title">
          连接你的账号
        </text><text class="description">
          绑定后可通过微信登录同一个热卜账号。已有内容与权益保留在当前账号。
        </text>
      </view>
      <view
        v-if="loading"
        class="loading"
      >
        <AppLoading />
      </view>
      <view
        v-else-if="error"
        class="error-state"
      >
        <text>{{ error }}</text><button
          class="primary"
          @tap="fetchData"
        >
          重新加载
        </button>
      </view>
      <view
        v-else
        class="section"
      >
        <text class="section-label">
          已绑定 {{ boundCount }} 个账号
        </text>
        <view class="list">
          <view
            v-for="acc in accounts"
            :key="acc.provider"
            class="account-row"
          >
            <view
              class="account-icon"
              :style="{ background: acc.color }"
            >
              <AppIcon
                :name="providerIcon[acc.provider]"
                :size="23"
                color="#fff"
              />
            </view>
            <view class="account-info">
              <text class="account-name">
                {{ acc.name }}
              </text><text class="account-sub">
                {{ acc.isBound ? (acc.accountInfo || '已绑定') : acc.provider === 'wechat' ? (wechatAvailable ? '授权后绑定当前账号' : '请在微信内或支持微信授权的客户端绑定') : '新绑定暂未开放' }}
              </text>
            </view>
            <button
              v-if="acc.isBound"
              class="row-action secondary"
              :disabled="busy"
              @tap="unbindTarget = acc"
            >
              解绑
            </button>
            <button
              v-else-if="acc.provider === 'wechat' && wechatAvailable"
              class="row-action primary"
              :disabled="busy"
              @tap="handleBind"
            >
              {{ processing ? '处理中' : '绑定' }}
            </button>
            <text
              v-else
              class="unavailable"
            >
              暂不可用
            </text>
          </view>
        </view>
        <text class="footnote">
          微信绑定不会合并其他账号。若微信已绑定另一账号，请先核对账号归属。
        </text>
      </view>
      <view
        v-if="authorizationUrl"
        class="authorization"
      >
        <AppIcon
          name="message-circle"
          :size="26"
          color="#16a34a"
        /><text class="authorization-title">
          前往微信完成授权
        </text><text class="description">
          授权完成后会自动返回这里，绑定到当前热卜账号。
        </text><button
          class="primary"
          @tap="continueAuthorization"
        >
          继续微信授权
        </button><button
          class="secondary"
          @tap="cancelAuthorization"
        >
          取消
        </button>
      </view>
      <view
        v-if="notice"
        class="notice"
        role="status"
        aria-live="polite"
      >
        <text>{{ notice }}</text>
      </view>
      <view class="help">
        <AppIcon
          name="shield"
          :size="18"
          color="#8a8178"
        /><text>解绑前请保留一种可用登录方式。不能解绑最后一种登录方式。</text>
      </view>
    </scroll-view>
    <view
      v-if="unbindTarget"
      class="mask"
      @tap="!processing && (unbindTarget = null)"
    >
      <view
        class="sheet"
        @tap.stop
      >
        <text class="sheet-title">
          解绑{{ unbindTarget.name }}？
        </text><text class="description">
          {{ unbindTarget.provider === 'wechat' ? '将解除当前账号在各微信客户端的绑定。' : '解绑后将不能使用该账号登录。' }}请确认还有其他可用的登录方式。
        </text><text
          v-if="unbindTarget.provider !== 'wechat'"
          class="description"
        >
          此渠道的新绑定尚未开放，解绑后暂不能重新绑定。
        </text><button
          class="danger"
          :disabled="processing"
          @tap="handleUnbind"
        >
          {{ processing ? '正在解绑…' : '确认解绑' }}
        </button><button
          class="secondary"
          :disabled="processing"
          @tap="unbindTarget = null"
        >
          保留绑定
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; color: #302a24; }
.scroll { height: calc(100vh - 112rpx - env(safe-area-inset-top)); }
.intro { padding: 42rpx 32rpx 36rpx; display: flex; flex-direction: column; gap: 16rpx; }
.eyebrow { color: #9b7360; font-size: 22rpx; letter-spacing: 2rpx; }
.title { font-size: 44rpx; font-weight: 650; letter-spacing: -1rpx; }
.description { font-size: 27rpx; color: #766c63; line-height: 1.65; overflow-wrap: anywhere; }
.section { padding: 0 24rpx; }
.section-label { display: block; padding: 0 12rpx 16rpx; color: #8a8178; font-size: 24rpx; }
.list { background: #fff; border: 1rpx solid #eee8e0; border-radius: 24rpx; overflow: hidden; }
.account-row { display: flex; align-items: center; gap: 20rpx; padding: 30rpx 24rpx; }
.account-row + .account-row { border-top: 1rpx solid #f2ece6; }
.account-icon { width: 76rpx; height: 76rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.account-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.account-name { font-size: 30rpx; font-weight: 600; }
.account-sub { font-size: 23rpx; color: #8a8178; line-height: 1.5; overflow-wrap: anywhere; }
button { margin: 0; border-radius: 18rpx; font-size: 28rpx; line-height: 1.5; padding: 22rpx 28rpx; font-weight: 550; }
button::after { border: 0; }
.primary { color: #fff; background: #c41e3a; }
.secondary { color: #64554a; background: #f4f0eb; }
.danger { color: #fff; background: #b91c32; }
button[disabled] { color: #877e75; background: #ece8e3; }
.row-action { flex-shrink: 0; padding: 18rpx 24rpx; font-size: 25rpx; min-width: 96rpx; }
.unavailable { color: #8a8178; font-size: 22rpx; flex-shrink: 0; }
.footnote { display: block; padding: 20rpx 12rpx; font-size: 24rpx; line-height: 1.6; color: #8a8178; }
.authorization { display: flex; flex-direction: column; gap: 20rpx; margin: 12rpx 24rpx 24rpx; padding: 30rpx; background: #fff; border: 1rpx solid #eee8e0; border-radius: 24rpx; }
.authorization-title, .sheet-title { font-size: 34rpx; font-weight: 600; }
.notice { margin: 20rpx 24rpx; padding: 24rpx; background: #f0ebe4; border-radius: 18rpx; font-size: 27rpx; line-height: 1.6; color: #5d5147; overflow-wrap: anywhere; }
.help { margin: 24rpx 36rpx; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); display: flex; gap: 14rpx; font-size: 24rpx; line-height: 1.65; color: #8a8178; }
.loading, .error-state { padding: 60rpx 32rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; color: #766c63; }
.mask { position: fixed; inset: 0; z-index: 999; background: rgba(32, 24, 18, .4); display: flex; align-items: flex-end; }
.sheet { width: 100%; box-sizing: border-box; padding: 40rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); background: #fffaf6; border-radius: 32rpx 32rpx 0 0; display: flex; flex-direction: column; gap: 24rpx; }
</style>
