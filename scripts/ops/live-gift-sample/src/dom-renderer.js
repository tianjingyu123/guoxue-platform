/**
 * 样例页渲染适配层（Web DOM）
 *
 * GiftStage 只调用这层的方法；换到 uni-app 时只需要重写这个文件：
 * L1/L2 在 vue/nvue 里都是普通列表 + CSS/animation，L3 在 H5 用 lottie-web、
 * 在 App 用 uni-app 内置 <animation-view>（nvue 才支持）。
 *
 * 播放器按需加载：首次出现 L3 才注入 lottie，L1/L2 全程零依赖。
 */

const LOTTIE_SRC = '../vendor/lottie_light.min.js'

let lottiePromise = null
export const loaderStats = { requested: false, loadMs: 0, bytesHint: 168394 }

function loadLottie() {
  if (lottiePromise) return lottiePromise
  loaderStats.requested = true
  const t0 = performance.now()
  lottiePromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = new URL(LOTTIE_SRC, import.meta.url).href
    s.onload = () => {
      loaderStats.loadMs = Math.round(performance.now() - t0)
      if (window.lottie) resolve(window.lottie)
      else reject(new Error('lottie 已加载但未挂载全局对象'))
    }
    s.onerror = () => reject(new Error('lottie 播放器脚本不可达'))
    document.head.appendChild(s)
  }).catch((err) => {
    // 失败后允许下次重试，不把 Promise 永久钉死在 rejected
    lottiePromise = null
    throw err
  })
  return lottiePromise
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

export function createDomRenderer(els, hooks = {}) {
  const lightNodes = new Map()
  const comboNodes = new Map()
  let premiumAnim = null
  let progressRaf = 0
  let fallbackTimer = 0

  const log = hooks.log || (() => {})

  function stopProgress() {
    if (progressRaf) cancelAnimationFrame(progressRaf)
    progressRaf = 0
    els.premiumProgress.style.width = '0%'
  }

  function runProgress(maxMs) {
    const t0 = performance.now()
    let pausedAt = 0
    const tick = () => {
      if (hooks.isPaused && hooks.isPaused()) {
        if (!pausedAt) pausedAt = performance.now()
        progressRaf = requestAnimationFrame(tick)
        return
      }
      if (pausedAt) pausedAt = 0
      const pct = Math.min(100, ((performance.now() - t0) / maxMs) * 100)
      els.premiumProgress.style.width = pct.toFixed(1) + '%'
      if (pct < 100) progressRaf = requestAnimationFrame(tick)
    }
    progressRaf = requestAnimationFrame(tick)
  }

  return {
    // ── L1 ──
    showLight(evt) {
      const node = document.createElement('div')
      node.className = 'light'
      node.innerHTML = `<span class="light__icon">${esc(evt.icon || '🎁')}</span>
        <span class="light__txt">${esc(evt.userName)} 送出 ${esc(evt.giftName)} <b>×${evt.quantity}</b></span>`
      els.lightLane.appendChild(node)
      lightNodes.set(evt.recordId, node)
      // 车道满了就顶掉最旧的，DOM 节点不累积
      while (els.lightLane.children.length > 3) els.lightLane.firstElementChild.remove()
    },
    hideLight(recordId) {
      const node = lightNodes.get(recordId)
      if (!node) return
      lightNodes.delete(recordId)
      node.classList.add('light--out')
      setTimeout(() => node.remove(), 380)
    },

    // ── L2 ──
    showCombo(key, evt, count) {
      const node = document.createElement('div')
      node.className = 'combo'
      node.innerHTML = `<span class="combo__avatar">${esc((evt.userName || '观').slice(0, 1))}</span>
        <span class="combo__info"><span class="combo__user">${esc(evt.userName)}</span>
        <span class="combo__desc">送出 ${esc(evt.giftName)}</span></span>
        <span class="combo__icon">${esc(evt.icon || '🎁')}</span>
        <span class="combo__count" data-count>×${count}</span>`
      els.comboLane.appendChild(node)
      comboNodes.set(key, node)
    },
    updateCombo(key, count) {
      const node = comboNodes.get(key)
      if (!node) return
      const n = node.querySelector('[data-count]')
      n.textContent = '×' + count
      // 重放脉冲：先摘类再强制回流，避免连续连击时动画不触发
      n.classList.remove('bump')
      node.classList.remove('pulse')
      void n.offsetWidth
      n.classList.add('bump')
      node.classList.add('pulse')
    },
    hideCombo(key) {
      const node = comboNodes.get(key)
      if (!node) return
      comboNodes.delete(key)
      node.classList.add('combo--out')
      setTimeout(() => node.remove(), 280)
    },

    // ── 溢出摘要 ──
    showOverflow(dropped) {
      if (!dropped) {
        els.overflowChip.hidden = true
        return
      }
      els.overflowChip.hidden = false
      els.overflowChip.textContent = `另有 ${dropped} 份心意已合并`
    },

    // ── L3 ──
    async showPremium(evt, { onComplete, onError }) {
      els.premiumFallback.hidden = true
      els.giftLayer.classList.add('gift-layer--dimmed')
      els.premiumLayer.hidden = false
      els.premiumStage.innerHTML = ''
      els.premiumCaption.innerHTML = `${esc(evt.userName)} 送出 <b>${esc(evt.giftName)}</b> ×${evt.quantity}`
      runProgress(hooks.premiumMaxMs || 5000)

      try {
        const lottie = await loadLottie()
        const res = await fetch(new URL(evt.asset, import.meta.url).href, { cache: 'no-store' })
        if (!res.ok) throw new Error(`素材 ${res.status}`)
        const animationData = await res.json()
        const anim = lottie.loadAnimation({
          container: els.premiumStage,
          renderer: 'svg',
          loop: false,
          autoplay: true,
          animationData,
        })
        anim.addEventListener('complete', onComplete)
        anim.addEventListener('data_failed', () => onError(new Error('素材解析失败')))
        premiumAnim = anim
        log(`L3 起播 ${evt.giftName}：播放器加载 ${loaderStats.loadMs}ms`)
        return anim
      } catch (err) {
        onError(err)
        return null
      }
    },
    pausePremium(handle) {
      if (handle && handle.pause) handle.pause()
    },
    resumePremium(handle) {
      if (handle && handle.play) handle.play()
    },
    destroyPremium(handle) {
      if (handle && handle.destroy) handle.destroy()
      if (premiumAnim === handle) premiumAnim = null
    },
    hidePremium() {
      stopProgress()
      els.giftLayer.classList.remove('gift-layer--dimmed')
      els.premiumLayer.hidden = true
      els.premiumStage.innerHTML = ''
    },
    showPremiumFallback(evt, reason) {
      stopProgress()
      els.giftLayer.classList.remove('gift-layer--dimmed')
      els.premiumLayer.hidden = true
      els.premiumStage.innerHTML = ''
      els.premiumFallback.hidden = false
      const why = reason === 'reduced-motion' ? '已按“减少动态效果”显示文字版' : '特效素材未加载，已切文字版'
      els.premiumFallback.innerHTML =
        `${esc(evt.userName)} 送出 <b>${esc(evt.giftName)}</b> ×${evt.quantity}<small>${why}</small>`
      clearTimeout(fallbackTimer)
      fallbackTimer = setTimeout(() => { els.premiumFallback.hidden = true }, 1800)
    },

    // ── 统一释放 ──
    destroyAll() {
      stopProgress()
      clearTimeout(fallbackTimer)
      if (premiumAnim) {
        premiumAnim.destroy()
        premiumAnim = null
      }
      els.giftLayer.classList.remove('gift-layer--dimmed')
      els.lightLane.innerHTML = ''
      els.comboLane.innerHTML = ''
      els.premiumStage.innerHTML = ''
      els.premiumLayer.hidden = true
      els.premiumFallback.hidden = true
      els.overflowChip.hidden = true
      lightNodes.clear()
      comboNodes.clear()
    },
  }
}
