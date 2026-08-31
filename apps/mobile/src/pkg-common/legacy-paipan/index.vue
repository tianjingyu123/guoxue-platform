<script setup lang="ts">
import { getCurrentInstance, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { onBackPress, onReady } from '@dcloudio/uni-app'
import { consumeLegacyPaipanEntry, legacyPaipanApi } from '@/lib/legacy-paipan-data'
import { navigateTo } from '@/utils/router'
import { getToken } from '@/utils/storage'

const loading = ref(true)
const error = ref('')
const legacyUrl = ref('')
const loginRequired = ref(false)
let bridgeTimers: Array<ReturnType<typeof setTimeout>> = []
let legacyChildWebview: any | null = null
const componentInstance = getCurrentInstance()
const legacyAppMounted = ref(false)
let appPageReady = false

/** 只允许对旧排盘官方域名的子 WebView 注入兼容桥，避免影响其他页面。 */
function isTrustedLegacyUrl(url: string): boolean {
  return /^https:\/\/(?:[^./]+\.)?yrydai\.(?:cn|com)(?:[/:?#]|$)/iu.test(url)
}

/**
 * 第三方旧站大量工具仍用 target=_blank/window.open；App 原生 WebView 不会自动创建新窗口。
 * 在受信任子 WebView 内把这些动作降级为同页导航，既保留工具可用性，也不泄露签名地址。
 */
function legacyNavigationBridgeScript(): string {
  return `;(function(){
    if(window.__rebuLegacyNavigationBridgeInstalled)return;
    window.__rebuLegacyNavigationBridgeInstalled=true;
    function trustedLegacyUrl(value){
      try{
        var resolved=new URL(String(value||''),window.location.href);
        var hostname=String(resolved.hostname||'').toLowerCase();
        var trusted=hostname==='yrydai.cn'||hostname.endsWith('.yrydai.cn')||hostname==='yrydai.com'||hostname.endsWith('.yrydai.com');
        return resolved.protocol==='https:'&&trusted?resolved.href:'';
      }catch(_error){return '';}
    }
    function openTrustedLegacyUrl(value){
      var resolved=trustedLegacyUrl(value);
      if(resolved)window.location.assign(resolved);
    }
    function openRebuAction(action){
      window.location.assign('rebu://'+action);
    }
    function openLegacyPayload(value){
      var match=String(value||'').match(/[?&]url=([^&#]+)/);
      if(match){
        try{openTrustedLegacyUrl(decodeURIComponent(match[1]));return;}catch(_error){}
      }
      openTrustedLegacyUrl(value);
    }
    function handleWebUniMessage(message){
      var data=message&&message.data?message.data:message||{};
      var action=String(data.action||'').toLowerCase();
      if(action==='pay')openRebuAction('legacy-payment');
      else if(action==='service')openRebuAction('customer-service');
      else if(action==='location'||action==='share')openRebuAction('unsupported');
    }
    function installWebkitCompatibility(){
      var webkit=window.webkit||(window.webkit={});
      var handlers=webkit.messageHandlers||(webkit.messageHandlers={});
      function add(name,callback){if(!handlers[name])handlers[name]={postMessage:callback};}
      add('openUrl',function(value){openLegacyPayload(value);});
      add('openBrowser',function(value){openTrustedLegacyUrl(value);});
      add('home',function(){openRebuAction('home');});
      add('serviceWX',function(){openRebuAction('customer-service');});
      add('location',function(){openRebuAction('unsupported');});
      add('openWXmini',function(){openRebuAction('unsupported');});
      add('payWX',function(){openRebuAction('legacy-payment');});
    }
    /*
     * 旧版官方 Android APK 通过 addJavascriptInterface 注入 webviewJS；工具宫格主要调用
     * webviewJS.openUrl，而不是 a[target=_blank]。新容器没有这个原生对象时必须提供最小
     * 等价接口，否则页面看似可点、实际完全不跳转。只允许站内 HTTPS，绝不执行网页传入
     * 的支付参数或任意外链。
     */
    if(!window.webviewJS){
      window.webviewJS={
        openUrl:function(url){openLegacyPayload(url);},
        openBrowser:function(url){openTrustedLegacyUrl(url);},
        home:function(){openRebuAction('home');},
        exitLogin:function(){openRebuAction('login');},
        mobileLogin:function(){openRebuAction('login');},
        serviceWX:function(){openRebuAction('customer-service');},
        payWX:function(){openRebuAction('legacy-payment');},
        openWXmini:function(){openRebuAction('unsupported');},
        shareWX:function(){openRebuAction('unsupported');},
        sharePicture:function(){openRebuAction('unsupported');},
        savePicture:function(){openRebuAction('unsupported');},
        location:function(){openRebuAction('unsupported');},
        openCompass:function(){openRebuAction('unsupported');},
        playVoice:function(){openRebuAction('unsupported');},
        stopVoice:function(){},
        voiceRecordReady:function(){openRebuAction('unsupported');},
        voiceRecordStart:function(){openRebuAction('unsupported');},
        voiceRecordStop:function(){},
        voiceUpload:function(){openRebuAction('unsupported');},
        errorBack:function(){if(window.history.length>1)window.history.back();else openRebuAction('home');},
        errorReload:function(){window.location.reload();},
        clearWeb:function(){},
        hideTitle:function(){},
        showTitle:function(){},
        setTitle:function(){},
        parentUpdate:function(){},
        redDot:function(){},
        cancelRedDot:function(){}
      };
    }
    installWebkitCompatibility();
    window.webUni={
      navigateTo:function(options){openLegacyPayload(options&&options.url);},
      navigateBack:function(){openRebuAction('home');},
      postMessage:function(message){handleWebUniMessage(message);}
    };
    function normalize(){
      var links=document.querySelectorAll('a[target="_blank"],a[target="_new"]');
      for(var i=0;i<links.length;i++)links[i].setAttribute('target','_self');
      var forms=document.querySelectorAll('form[target="_blank"],form[target="_new"]');
      for(var j=0;j<forms.length;j++)forms[j].setAttribute('target','_self');
    }
    document.addEventListener('click',function(event){
      var node=event.target;
      while(node&&node.tagName!=='A')node=node.parentNode;
      if(!node)return;
      if(node.href&&!trustedLegacyUrl(node.href)){
        event.preventDefault();
        openRebuAction('unsupported');
        return;
      }
      var target=String(node.getAttribute('target')||'').toLowerCase();
      if((target==='_blank'||target==='_new')&&node.href){
        event.preventDefault();
        window.location.assign(node.href);
      }
    },true);
    document.addEventListener('submit',function(event){
      var form=event.target;
      if(!form||form.tagName!=='FORM')return;
      if(!trustedLegacyUrl(form.action||window.location.href)){
        event.preventDefault();
        openRebuAction('unsupported');
        return;
      }
      var target=String(form.getAttribute('target')||'').toLowerCase();
      if(target==='_blank'||target==='_new')form.setAttribute('target','_self');
    },true);
    window.open=function(url){
      if(typeof url==='string'&&url)window.location.assign(url);
      return window;
    };
    var edgeStart=null;
    document.addEventListener('touchstart',function(event){
      var touch=event.touches&&event.touches[0];
      edgeStart=touch&&touch.clientX<=24?{x:touch.clientX,y:touch.clientY}:null;
    },true);
    document.addEventListener('touchend',function(event){
      if(!edgeStart)return;
      var touch=event.changedTouches&&event.changedTouches[0];
      var start=edgeStart;
      edgeStart=null;
      if(!touch)return;
      var dx=touch.clientX-start.x;
      var dy=Math.abs(touch.clientY-start.y);
      if(dx>=80&&dy<=Math.max(48,dx*0.55)&&window.history.length>1){
        window.history.back();
      }
    },true);
    normalize();
    if(window.MutationObserver){
      new MutationObserver(normalize).observe(document.documentElement,{childList:true,subtree:true});
    }
  })();`
}

// #ifdef APP-PLUS
/**
 * uni-app Vue 页面必须从当前页面实例取得承载 WebView；使用全局“当前 WebView”在页面脚本
 * 上下文中不保证返回该页面，曾导致旧排盘子 WebView 永远找不到、桥接脚本未注入。
 */
function getLegacyParentWebview(): any | null {
  try {
    const proxy = componentInstance?.proxy as any
    const fromScope = proxy?.$scope?.$getAppWebview?.()
    if (fromScope) return fromScope
    const pages = getCurrentPages() as any[]
    const page = pages[pages.length - 1]
    return page?.$getAppWebview?.() || page?.$scope?.$getAppWebview?.() || null
  } catch { return null }
}

function findLegacyChildWebview(): any | null {
  try {
    if (legacyChildWebview) {
      // 已绑定的子 WebView 可能暂时跳到微信/支付宝 HTTPS 收银页；返回动作仍应操作它，
      // 但脚本注入会在 installLegacyNavigationBridge 内继续受可信域名限制。
      try { legacyChildWebview.getURL?.(); return legacyChildWebview } catch { legacyChildWebview = null }
    }
    const parent = getLegacyParentWebview()
    const children = parent?.children?.() || []
    const trusted = children.find((child: any) => {
      try { return isTrustedLegacyUrl(String(child.getURL?.() || '')) } catch { return false }
    })
    if (trusted) {
      legacyChildWebview = trusted
      return trusted
    }
    // web-view 初建时常是 about:blank；先绑定 loaded，真正跳到旧站后再校验域名注入。
    const initialChild = children.find((child: any) => {
      try {
        const url = String(child.getURL?.() || '')
        return !url || url === 'about:blank'
      } catch { return false }
    }) || null
    if (initialChild) legacyChildWebview = initialChild
    return initialChild
  } catch { return null }
}

function installLegacyNavigationBridge(child = findLegacyChildWebview()) {
  if (!child) return false
  try {
    if (!isTrustedLegacyUrl(String(child.getURL?.() || ''))) return false
    child.evalJS(legacyNavigationBridgeScript())
    return true
  } catch { return false }
}

function bindLegacyChildWebview(child: any) {
  if (!child) return false
  try {
    legacyChildWebview = child
    const boundChild = child as any
    if (!boundChild.__rebuLoadedBridgeBound) {
      boundChild.__rebuLoadedBridgeBound = true
      const reinject = () => {
        // 第三方内部整页跳转会重建 JS 上下文，每次 loaded 都必须重新注入。
        return installLegacyNavigationBridge(child)
      }
      const reveal = () => {
        // create('') 可能先触发 about:blank 的 loaded，必须等受信旧站真正加载后再显示。
        if (!reinject()) return
        try { child.setContentVisible?.(true) } catch { /* 旧内核不支持时继续 */ }
        legacyAppMounted.value = true
      }
      child.addEventListener?.('loading', reinject)
      child.addEventListener?.('loaded', reveal)
      child.addEventListener?.('error', () => {
        try { child.setContentVisible?.(false) } catch { /* 失败页保持隐藏 */ }
        try { child.close?.('none') } catch { /* 父窗口仍会兜底回收 */ }
        if (legacyChildWebview === child) legacyChildWebview = null
        legacyAppMounted.value = false
        error.value = '排盘工具暂时无法打开，请稍后重试'
      })
      child.overrideUrlLoading?.(
        { mode: 'reject', match: '^(rebu|weixin|alipays|tel|mailto):.*' },
        (event: { url?: string }) => {
          const url = String(event?.url || '')
          if (/^rebu:\/\//iu.test(url)) {
            const action = url.slice('rebu://'.length).split(/[/?#]/u, 1)[0]
            if (action === 'home') returnToNewSystem()
            else if (action === 'login') openLogin()
            else if (action === 'customer-service') navigateTo('/customer-service')
            else if (action === 'legacy-payment') {
              uni.showModal({
                title: '旧排盘会员支付尚未接通',
                content: '为避免付款后权益无法同步，当前版本不会直接执行旧站支付。可先联系平台客服处理。',
                confirmText: '联系客服',
                cancelText: '稍后再说',
                success: (result) => { if (result.confirm) navigateTo('/customer-service') },
              })
            } else if (action === 'unsupported') {
              uni.showToast({ title: '该旧版扩展功能暂不支持', icon: 'none' })
            }
            return
          }
          if (/^(?:weixin|alipays|tel|mailto):/iu.test(url)) plus.runtime.openURL(url)
        },
      )
    }
    installLegacyNavigationBridge(child)
    return true
  } catch { return false }
}

/**
 * App 端先创建受控子 WebView、挂载本地兼容脚本，再加载第三方地址。
 * 这样 webviewJS 在旧站首屏脚本执行前就存在，避免八字、奇门等按钮首次点击失效。
 */
function mountLegacyAppWebview() {
  // #ifdef APP-PLUS
  if (!appPageReady || !legacyUrl.value || loading.value || error.value || legacyChildWebview) return false
  const parent = getLegacyParentWebview()
  if (!parent) return false
  let child: any | null = null
  try {
    const childStyle: any = {
      top: '0px',
      bottom: '0px',
      background: '#FAF8F5',
      scrollIndicator: 'none',
      plusrequire: 'none',
      'uni-app': 'none',
      popGesture: 'none',
    }
    child = plus.webview.create('', `rebu-legacy-paipan-${Date.now()}`, childStyle)
    legacyChildWebview = child
    try { child.setContentVisible?.(false) } catch { /* 旧内核不支持时继续 */ }
    child.setJsFile?.('_www/static/legacy-paipan-preload.js')
    bindLegacyChildWebview(child)
    parent.append(child)
    child.loadURL(legacyUrl.value)
    return true
  } catch {
    try { child?.close?.('none') } catch { /* 创建中断时尽力回收 */ }
    legacyChildWebview = null
    legacyAppMounted.value = false
    error.value = '排盘工具暂时无法打开，请稍后重试'
    return false
  }
  // #endif
  return false
}
// #endif

function scheduleLegacyNavigationBridge() {
  // #ifdef APP-PLUS
  bridgeTimers.forEach(clearTimeout)
  bridgeTimers = [0, 250, 700, 1500, 3000, 5000, 8000, 12000].map((delay) => setTimeout(() => {
    const child = findLegacyChildWebview()
    if (!child) return
    bindLegacyChildWebview(child)
  }, delay))
  // #endif
}

function navigateLegacyBack() {
  // #ifdef APP-PLUS
  const child = findLegacyChildWebview()
  if (!child) { returnToNewSystem(); return }
  try {
    child.canBack((event: { canBack?: boolean }) => {
      if (event?.canBack) child.back()
      else returnToNewSystem()
    })
  } catch { returnToNewSystem() }
  return undefined
  // #endif
  returnToNewSystem()
}

function returnToNewSystem() {
  navigateTo('/pages/index/index')
}

function openLogin() {
  try { uni.setStorageSync('login:redirect', '/pkg-common/legacy-paipan/index') } catch { /* 登录仍可继续 */ }
  navigateTo('/login')
}

async function loadEntry() {
  loading.value = true
  error.value = ''
  legacyUrl.value = ''
  loginRequired.value = false
  try {
    if (!getToken()) {
      loginRequired.value = true
      error.value = '登录后即可安全进入排盘工具；其他公开内容仍可直接浏览。'
      return
    }
    // 正常入口由上一页一次性交接已生成的地址；直接深链进入时才回源请求。
    const entry = consumeLegacyPaipanEntry() || await legacyPaipanApi.entry()
    if (entry.mode !== 'legacy') {
      uni.reLaunch({ url: '/pages/paipan/index' })
      return
    }
    if (!entry.url || !entry.url.startsWith('https://')) throw new Error('排盘工具地址未正确配置')
    legacyUrl.value = entry.url
  } catch (cause) {
    const message = (cause as Error)?.message || '排盘工具暂时无法打开'
    loginRequired.value = /未登录|登录已过期/u.test(message)
    error.value = loginRequired.value
      ? '登录后即可安全进入排盘工具；其他公开内容仍可直接浏览。'
      : message
  } finally {
    loading.value = false
    await nextTick()
    // #ifdef APP-PLUS
    mountLegacyAppWebview()
    // #endif
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
  uni.showToast({ title: '排盘工具暂时无法打开', icon: 'none' })
  returnToNewSystem()
}

function handleLegacyLoaded() { scheduleLegacyNavigationBridge() }

onMounted(() => { void loadEntry() })
onReady(() => {
  appPageReady = true
  // #ifdef APP-PLUS
  mountLegacyAppWebview()
  // #endif
  scheduleLegacyNavigationBridge()
})
onUnmounted(() => {
  bridgeTimers.forEach(clearTimeout)
  bridgeTimers = []
  try { legacyChildWebview?.close?.('none') } catch { /* 页面关闭时由父窗口兜底回收 */ }
  legacyChildWebview = null
  legacyAppMounted.value = false
})
onBackPress(() => {
  navigateLegacyBack()
  return true
})
</script>

<template>
  <view v-if="loading" class="state" role="status" aria-live="polite">
    <view class="spinner" />
    <text class="title">排盘工具</text>
    <text class="desc">正在安全连接，请稍候</text>
  </view>

  <view v-else-if="error" class="state" role="alert">
    <text class="title">{{ loginRequired ? '登录后进入排盘工具' : '暂时无法进入排盘工具' }}</text>
    <text class="desc">{{ error }}</text>
    <button v-if="loginRequired" class="action primary" @tap="openLogin">登录后进入排盘工具</button>
    <button v-else class="action primary" @tap="loadEntry">重试</button>
    <button class="action" @tap="returnToNewSystem">返回热卜首页</button>
  </view>

  <!-- #ifdef H5 -->
  <view v-if="!loading && !error" class="state legacy-gateway" role="main" aria-label="排盘工具入口">
    <view class="gateway-card">
      <view class="brand">热卜</view>
      <text class="title">排盘工具</text>
      <text class="desc">排盘工具将在新页面打开；当前热卜页面会保留，完成后关闭新页面即可返回。</text>
      <button class="action primary" @tap="openLegacyH5">打开排盘工具</button>
      <button class="action" @tap="returnToNewSystem">返回热卜首页</button>
      <text class="tip">若浏览器阻止新页面，将改在当前页打开，可使用浏览器返回键回到热卜。</text>
    </view>
  </view>
  <!-- #endif -->

  <!-- #ifdef APP-PLUS -->
  <view v-if="!loading && !error && legacyUrl && !legacyAppMounted" class="state" role="status" aria-live="polite">
    <view class="spinner" />
    <text class="title">排盘工具</text>
    <text class="desc">正在加载工具，请稍候</text>
  </view>
  <!-- #endif -->

  <!-- 小程序与 Harmony 继续使用标准 web-view；App 使用加载前预注入的受控原生子 WebView。 -->
  <!-- #ifndef H5 -->
  <!-- #ifndef APP-PLUS -->
  <web-view
    v-if="!loading && !error && legacyUrl"
    class="legacy-webview"
    :src="legacyUrl"
    @load="handleLegacyLoaded"
    @message="handleLegacyMessage"
    @error="handleLegacyLoadError"
  />
  <!-- #endif -->
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
