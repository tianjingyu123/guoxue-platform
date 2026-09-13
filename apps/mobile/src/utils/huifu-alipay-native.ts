/** 汇付官方 A_NATIVE Android 方案；二维码不是支付宝 SDK 的 orderString。
 * https://paas.huifu.com/help/dev_guide/zf/zfb/app.md
 */
export function buildAlipayNativeUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 1024 || /[\s\\\u0000-\u001f\u007f]/.test(value)) {
    throw new Error('支付宝支付链接无效')
  }
  // 严格原串匹配，避免 URL 规范化掩盖用户信息、端口、转义主机和混淆域名。
  if (!/^https:\/\/qr\.alipay\.com\/[A-Za-z0-9][A-Za-z0-9/_?=&%+.,~-]*$/.test(value)) {
    throw new Error('支付宝支付链接无效')
  }
  return `alipays://platformapi/startapp?saId=10000007&qrcode=${encodeURIComponent(value)}`
}

export interface AlipayOrderState {
  status: string
  payMethod?: string | null
  payTransactionId?: string | null
  type?: string
  targetId?: string
}
export interface AlipayAttempt {
  orderId: string
  requestedAt: number
  outTradeNo?: string
  qrCode?: string
}
export type AlipayPhase = 'ready' | 'checking' | 'pending' | 'openFailed' | 'unknown' | 'success' | 'closed' | 'unsupported'
export interface AlipayView { phase: AlipayPhase; busy: boolean; canOpen: boolean; message: string }
interface Dependencies {
  orderId: string
  platform: string
  readOrder(): Promise<AlipayOrderState>
  createPayment(): Promise<{ outTradeNo?: string; qrCode?: string }>
  queryPayment(outTradeNo: string): Promise<unknown>
  load(): AlipayAttempt | null
  save(attempt: AlipayAttempt): void
  openUrl(url: string, failed: () => void): void
  update(view: AlipayView): void
  paid(order: AlipayOrderState): void
  now(): number
  active(): boolean
}

/** 单订单状态机：只认服务端订单状态；重试只打开原凭据，未知下单结果不重发。 */
export function createAlipayNativePayment(d: Dependencies) {
  let busy = false
  let disposed = false
  let completed = false
  let openGeneration = 0
  let attempt: AlipayAttempt | null = null
  let phase: AlipayPhase = 'ready'
  let message = '请前往支付宝完成付款'
  try {
    const saved = d.load()
    if (saved?.orderId === d.orderId && Number.isFinite(saved.requestedAt)) attempt = saved
  } catch { /* 存储不可读时由服务端订单支付记录阻止重复发起 */ }
  const validQr = () => {
    try {
      if (!attempt?.outTradeNo || d.now() - attempt.requestedAt >= 2 * 60 * 60 * 1000 || d.now() < attempt.requestedAt) return false
      buildAlipayNativeUrl(attempt.qrCode)
      return true
    } catch { return false }
  }
  function show(next: AlipayPhase, text: string) {
    phase = next
    message = text
    if (!disposed) d.update({ phase, message, busy, canOpen: !completed && phase !== 'closed' && phase !== 'unsupported' && validQr() })
  }
  function acceptOrder(order: AlipayOrderState): boolean {
    if (disposed || !d.active()) return true
    if (['PAID', 'SHIPPED', 'COMPLETED'].includes(order.status)) {
      completed = true
      show('success', '支付结果已由服务端确认')
      d.paid(order)
      return true
    }
    if (order.status !== 'PENDING') {
      show('closed', '订单当前不可支付，请返回订单查看')
      return true
    }
    return false
  }
  async function run(action: () => Promise<void>) {
    if (disposed || busy || completed) return
    if (d.platform.toLowerCase() !== 'android') {
      show('unsupported', '当前设备暂不支持此支付宝付款方式，请返回订单选择其他方式')
      return
    }
    busy = true
    show('checking', '正在核对订单…')
    try { await action() } catch {
      show('unknown', '暂未确认支付结果，请查询原订单后再试')
    } finally {
      busy = false
      show(phase, message)
    }
  }
  async function check() {
    await run(async () => {
      const order = await d.readOrder()
      if (acceptOrder(order)) return
      // 只用本人订单保存的汇付交易号查单，不能使用任意本地缓存交易号。
      if (order.payMethod === 'HUIFU' && order.payTransactionId) {
        let queryFailed = false
        try { await d.queryPayment(order.payTransactionId) } catch { queryFailed = true }
        // 通道查单异常仍检查本地订单，异步通知可能已完成入账。
        if (acceptOrder(await d.readOrder())) return
        if (queryFailed) throw new Error('通道查单暂不可用')
      }
      show('pending', '尚未确认付款；如已付款请稍后再查，取消付款可重试原订单')
    })
  }
  async function open(allowCreate = false) {
    await run(async () => {
      let order = await d.readOrder()
      if (acceptOrder(order)) return
      if (order.payTransactionId && order.payMethod !== 'HUIFU') {
        show('closed', '订单已使用其他支付方式，请返回订单确认支付结果')
        return
      }
      // 同一订单的另一页面实例可能刚发起请求，创建前重新检查持久化标记。
      const latest = d.load()
      if (latest) {
        if (latest.orderId !== d.orderId || !Number.isFinite(latest.requestedAt)) throw new Error('支付缓存无效')
        attempt = latest
      }
      if (!attempt && !order.payTransactionId && allowCreate) {
        // 先持久化请求标记；网络超时或退出页面后再进，不创建第二笔支付。
        attempt = { orderId: d.orderId, requestedAt: d.now() }
        d.save(attempt)
        const pay = await d.createPayment()
        if (typeof pay.outTradeNo !== 'string' || !pay.outTradeNo) throw new Error('支付查询凭据缺失')
        buildAlipayNativeUrl(pay.qrCode)
        attempt = { ...attempt, outTradeNo: pay.outTradeNo, qrCode: pay.qrCode }
        d.save(attempt)
        if (disposed) return
        order = await d.readOrder()
        if (acceptOrder(order)) return
      }
      if (!validQr() || order.payMethod !== 'HUIFU' || order.payTransactionId !== attempt?.outTradeNo) {
        show('unknown', '支付凭据暂不可用，请查询原订单或返回订单处理；不会重复发起付款')
        return
      }
      if (disposed || !d.active()) return
      show('pending', '请在支付宝完成付款，返回后将自动核对结果')
      const generation = ++openGeneration
      // openURL 没有支付成功回调；错误回调可能异步到达。
      d.openUrl(buildAlipayNativeUrl(attempt?.qrCode), () => {
        if (!disposed && !completed && phase !== 'closed' && generation === openGeneration) show('openFailed', '未能打开支付宝，请确认已安装；可重试打开原订单')
      })
    })
  }
  return { start: () => open(true), reopen: () => open(false), check, dispose: () => { disposed = true } }
}
