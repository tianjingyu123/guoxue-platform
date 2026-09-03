;(function () {
  var trustedHost = /(^|\.)yrydai\.(cn|com)$/i.test(String(window.location.hostname || ''))
  if (!trustedHost || window.__rebuLegacyNavigationPreloadInstalled) return
  window.__rebuLegacyNavigationPreloadInstalled = true

  function trustedLegacyUrl(value) {
    try {
      var resolved = new URL(String(value || ''), window.location.href)
      var hostname = String(resolved.hostname || '').toLowerCase()
      var trusted = hostname === 'yrydai.cn' || hostname.endsWith('.yrydai.cn') || hostname === 'yrydai.com' || hostname.endsWith('.yrydai.com')
      return resolved.protocol === 'https:' && trusted ? resolved.href : ''
    } catch (_error) {
      return ''
    }
  }

  function openTrustedLegacyUrl(value) {
    var resolved = trustedLegacyUrl(value)
    if (resolved) window.location.assign(resolved)
  }

  function openRebuAction(action) {
    window.location.assign('rebu://' + action)
  }

  function openNativeLocation() { openRebuAction('location') }
  function openNativeCompass() { openRebuAction('compass-start') }

  function safeShareText(value, max) {
    return typeof value === 'string' && !/https?:[/][/]|(?:token|authorization|password|secret|signature|sign|key) *[:=]/i.test(value) ? value.slice(0, max) : ''
  }

  function safeShareUrl(value, image) {
    if (typeof value !== 'string' || value.length > 2048) return ''
    try {
      var url = new URL(value)
      if (url.protocol !== 'https:' || url.href !== value || url.username || url.password || url.port || url.hash) return ''
      if (['yrydai.cn', 'www.yrydai.cn', 'yrydai.com', 'www.yrydai.com', 'rebu.net.cn', 'www.rebu.net.cn'].indexOf(url.hostname) < 0) return ''
      if (url.pathname.indexOf('%') >= 0 || /guoxueApp|app_login|login|oauth|callback|payment|getTrade|token|auth|member|order|trade|my[.]php/i.test(url.pathname)) return ''
      if (image && (url.search || !/[.](png|jpe?g|webp)$/i.test(url.pathname))) return ''
      var valid = true
      var seen = {}
      url.searchParams.forEach(function (v, k) {
        if (['id', 'aid', 'cid', 'tid', 'shareId', 'type', 'mod', 'm', 'c', 'a', 'page'].indexOf(k) < 0 || !/^[A-Za-z0-9_-]{1,100}$/.test(v) || seen[k]) valid = false
        seen[k] = true
      })
      return valid ? url.href : ''
    } catch (_error) { return '' }
  }

  function openLegacyShare(kind, value) {
    var data = value && typeof value === 'object' ? value : {}
    var payload = JSON.stringify({
      kind: kind,
      title: safeShareText(data.title, 80),
      text: safeShareText(data.remark, 300),
      url: safeShareUrl(data.path, false),
      imageUrl: safeShareUrl(data.shareImgUrl, true),
    })
    openRebuAction('legacy-share?payload=' + encodeURIComponent(payload))
  }

  function shareLegacyPage(_type, _scene, _miniId, title, description) {
    // 旧 APK 的前三个参数是类型/场景/小程序标识，不是链接或图片路径。
    // 原生菜单明确提供当前页面截图，不伪造未配置的小程序卡片。
    openLegacyShare('page', { title: title, remark: description })
  }

  function shareLegacyPicture(url) { openLegacyShare('image', { shareImgUrl: url }) }
  function saveLegacyPicture(url) { openLegacyShare('save', { shareImgUrl: url }) }

  function openLegacyPayment(value) {
    var tradeNo = String(value || '').trim()
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(tradeNo)) {
      openRebuAction('unsupported')
      return
    }
    openRebuAction('legacy-payment?trade_no=' + tradeNo)
  }

  function openLegacyPayload(value) {
    var match = String(value || '').match(/[?&]url=([^&#]+)/)
    if (match) {
      try {
        openTrustedLegacyUrl(decodeURIComponent(match[1]))
        return
      } catch (_error) {}
    }
    openTrustedLegacyUrl(value)
  }

  function handleWebUniMessage(message) {
    var data = message && message.data ? message.data : message || {}
    var action = String(data.action || '').toLowerCase()
    if (action === 'pay') openLegacyPayment(data.payload && data.payload.trade_no)
    else if (action === 'service') openRebuAction('customer-service')
    else if (action === 'location') openNativeLocation()
    else if (action === 'compass' || action === 'opencompass') openNativeCompass()
    else if (action === 'share') openLegacyShare('page', data.payload)
  }

  function installWebkitCompatibility() {
    var webkit = window.webkit || (window.webkit = {})
    var handlers = webkit.messageHandlers || (webkit.messageHandlers = {})
    function add(name, callback) {
      if (!handlers[name]) handlers[name] = { postMessage: callback }
    }
    add('openUrl', function (value) { openLegacyPayload(value) })
    add('openBrowser', function (value) { openTrustedLegacyUrl(value) })
    add('home', function () { openRebuAction('home') })
    add('serviceWX', function () { openRebuAction('customer-service') })
    add('location', function () { openNativeLocation() })
    add('openCompass', function () { openNativeCompass() })
    add('openWXmini', function () { openRebuAction('unsupported') })
    add('payWX', function (value) { openLegacyPayment(value) })
    add('shareWX', function (value) {
      if (Array.isArray(value)) shareLegacyPage.apply(null, value)
      else openLegacyShare('page', value)
    })
    add('sharePicture', function (value) { shareLegacyPicture(value) })
    add('savePicture', function (value) { saveLegacyPicture(value) })
  }

  function sameWindowOpen(url) {
    if (typeof url === 'string' && url) openTrustedLegacyUrl(url)
    return window
  }

  function installLegacyNativeCompatibility() {
    if (!window.webviewJS) window.webviewJS = {
      openUrl: function (url) { openLegacyPayload(url) },
      openBrowser: function (url) { openTrustedLegacyUrl(url) },
      home: function () { openRebuAction('home') },
      exitLogin: function () { openRebuAction('login') },
      mobileLogin: function () { openRebuAction('login') },
      serviceWX: function () { openRebuAction('customer-service') },
      payWX: function (value) { openLegacyPayment(value) },
      openWXmini: function () { openRebuAction('unsupported') },
      shareWX: shareLegacyPage,
      sharePicture: shareLegacyPicture,
      savePicture: saveLegacyPicture,
      location: function () { openNativeLocation() },
      openCompass: function () { openNativeCompass() },
      playVoice: function () { openRebuAction('unsupported') },
      stopVoice: function () {},
      voiceRecordReady: function () { openRebuAction('unsupported') },
      voiceRecordStart: function () { openRebuAction('unsupported') },
      voiceRecordStop: function () {},
      voiceUpload: function () { openRebuAction('unsupported') },
      errorBack: function () {
        if (window.history.length > 1) window.history.back()
        else openRebuAction('home')
      },
      errorReload: function () { window.location.reload() },
      clearWeb: function () {},
      hideTitle: function () {},
      showTitle: function () {},
      setTitle: function () {},
      parentUpdate: function () {},
      redDot: function () {},
      cancelRedDot: function () {},
    }
    installWebkitCompatibility()
    window.webUni = {
      navigateTo: function (options) { openLegacyPayload(options && options.url) },
      navigateBack: function () { openRebuAction('home') },
      postMessage: function (message) { handleWebUniMessage(message) },
    }
  }

  function normalizeTargets() {
    var links = document.querySelectorAll('a[target="_blank"],a[target="_new"]')
    for (var i = 0; i < links.length; i += 1) links[i].setAttribute('target', '_self')
    var forms = document.querySelectorAll('form[target="_blank"],form[target="_new"]')
    for (var j = 0; j < forms.length; j += 1) forms[j].setAttribute('target', '_self')
    if (window.open !== sameWindowOpen) window.open = sameWindowOpen
    installLegacyNativeCompatibility()
  }

  normalizeTargets()

  document.addEventListener('click', function (event) {
    var node = event.target
    while (node && node.tagName !== 'A') node = node.parentNode
    if (!node) return
    var rawHref = String(node.getAttribute('href') || '').trim()
    if (!rawHref || rawHref.charAt(0) === '#' || /^javascript:/i.test(rawHref) || /^(?:rebu|weixin|alipays|tel|mailto):/i.test(rawHref)) return
    if (node.href && !trustedLegacyUrl(node.href)) {
      event.preventDefault()
      openRebuAction('unsupported')
      return
    }
    var target = String(node.getAttribute('target') || '').toLowerCase()
    if ((target === '_blank' || target === '_new') && node.href) {
      event.preventDefault()
      openTrustedLegacyUrl(node.href)
    }
  }, true)

  document.addEventListener('submit', function (event) {
    var form = event.target
    if (!form || form.tagName !== 'FORM') return
    if (!trustedLegacyUrl(form.action || window.location.href)) {
      event.preventDefault()
      openRebuAction('unsupported')
      return
    }
    var target = String(form.getAttribute('target') || '').toLowerCase()
    if (target !== '_blank' && target !== '_new') return
    form.setAttribute('target', '_self')
  }, true)

  var edgeStart = null
  document.addEventListener('touchstart', function (event) {
    var touch = event.touches && event.touches[0]
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0
    edgeStart = touch && touch.clientX <= 24 ? { x: touch.clientX, y: touch.clientY, side: 'left' }
      : touch && viewportWidth && touch.clientX >= viewportWidth - 24 ? { x: touch.clientX, y: touch.clientY, side: 'right' } : null
  }, true)
  document.addEventListener('touchend', function (event) {
    if (!edgeStart) return
    var touch = event.changedTouches && event.changedTouches[0]
    var start = edgeStart
    edgeStart = null
    if (!touch) return
    var dx = touch.clientX - start.x
    var dy = Math.abs(touch.clientY - start.y)
    var distance = Math.abs(dx)
    var isBack = (start.side === 'left' && dx >= 80) || (start.side === 'right' && dx <= -80)
    if (isBack && dy <= Math.max(48, distance * 0.55) && window.history.length > 1) window.history.back()
  }, true)

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', normalizeTargets, { once: true })
  if (window.MutationObserver) new MutationObserver(normalizeTargets).observe(document.documentElement, { childList: true, subtree: true })
})()
