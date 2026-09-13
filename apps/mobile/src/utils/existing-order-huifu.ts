/** H5 原订单汇付收银：只初始化支付，不创建业务订单。 */
export type HuifuChannel = 'alipay' | 'unionpay'
export interface ExistingPayOrder {
  id: string
  status: string
  amount: string | number
  type?: string
  payMethod?: string | null
  payTransactionId?: string | null
}
export interface HuifuAttempt {
  orderId: string
  channel: HuifuChannel
  requestedAt: number
  outTradeNo?: string
  qrCode?: string
  lastFailureMessage?: string
}
export interface HuifuCashierView {
  phase: 'loading' | 'ready' | 'pending' | 'unknown' | 'success' | 'closed' | 'error'
  amount: string
  channel: HuifuChannel
  qrCode: string
  busy: boolean
  message: string
  canStart: boolean
}
interface Dependencies {
  orderId: string
  channel: HuifuChannel
  readOrder(): Promise<ExistingPayOrder>
  createPayment(orderId: string, channel: HuifuChannel): Promise<{ outTradeNo?: string; qrCode?: string; codeUrl?: string }>
  queryPayment(outTradeNo: string): Promise<unknown>
  loadAttempt(): HuifuAttempt | null
  saveAttempt(attempt: HuifuAttempt): void
  now(): number
  update(view: HuifuCashierView): void
}
export function isHuifuChannel(value: unknown): value is HuifuChannel {
  return value === 'alipay' || value === 'unionpay'
}
/** 两个入口共用同一路由；付款金额最终从本人订单读取，不信任URL显示值。 */
export function existingOrderCashierRoute(orderId: string, channel: HuifuChannel): string {
  if (!orderId || !isHuifuChannel(channel)) throw new Error('支付入口参数无效')
  return `/pkg-shop/huifu-paying/index?orderId=${encodeURIComponent(orderId)}&method=${channel}`
}
export function createExistingOrderHuifu(d: Dependencies) {
  let disposed = false
  let busy = false
  let attempted = false
  let order: ExistingPayOrder | null = null
  let saved: HuifuAttempt | null = null
  let terminal = false
  let view: HuifuCashierView = { phase: 'loading', amount: '', channel: d.channel, qrCode: '', busy: false, message: '正在读取订单', canStart: false }
  function show(phase: HuifuCashierView['phase'], message: string, canStart = false, qrCode = '') {
    view = { ...view, phase, message, canStart, qrCode, busy }
    if (!disposed) d.update({ ...view })
  }
  function loadAttempt() {
    const record = d.loadAttempt()
    if (record && (record.orderId !== d.orderId || !isHuifuChannel(record.channel) || !Number.isFinite(record.requestedAt))) throw new Error('支付记录无法确认，请保留原单并查询结果')
    saved = record
    if (record) attempted = true
  }
  async function read() {
    if (disposed) return false
    const value = await d.readOrder()
    if (disposed) return false
    if (value.id !== d.orderId || !Number.isFinite(Number(value.amount)) || Number(value.amount) <= 0) throw new Error('订单信息无效，请返回订单核对')
    order = value
    view.amount = Number(value.amount).toFixed(2)
    if (['PAID', 'SHIPPED', 'COMPLETED'].includes(value.status)) {
      terminal = true
      show('success', '支付结果已由服务端确认')
      return false
    }
    if (value.status !== 'PENDING') {
      terminal = true
      show('closed', '订单当前不可支付，请返回订单查看')
      return false
    }
    if (d.channel === 'unionpay' && value.type !== 'PRODUCT' && value.type !== 'COURSE') {
      show('closed', '此类订单暂不支持云闪付，请返回订单选择其他方式')
      terminal = true
      return false
    }
    return true
  }
  function pendingView() {
    const hasReference = Boolean(order?.payTransactionId)
    const referenceMatches = !order?.payTransactionId || (order.payMethod === 'HUIFU' && saved?.outTradeNo === order.payTransactionId)
    const qr = saved?.outTradeNo && saved.qrCode && saved.channel === d.channel && referenceMatches
      && d.now() >= saved.requestedAt && d.now() - saved.requestedAt < 2 * 60 * 60 * 1000 ? saved.qrCode : ''
    if (qr) show('pending', '请使用对应支付应用扫码；完成后点击查询结果', false, qr)
    else if (hasReference || attempted) show('unknown', pendingMessage('该订单已有付款记录或提交结果待确认，请查询原单结果，不要重复付款'))
    else show('ready', '点击生成本订单的付款二维码', true)
  }
  function pendingMessage(fallback: string) {
    return typeof saved?.lastFailureMessage === 'string' && saved.lastFailureMessage.trim()
      ? `${saved.lastFailureMessage}\n支付结果待核对，请查询原订单，不要重复付款` : fallback
  }
  async function run(action: () => Promise<void>) {
    if (disposed || busy || terminal) return
    busy = true
    if (!disposed) d.update({ ...view, busy: true })
    try { await action() }
    catch (e) { show(attempted ? 'unknown' : 'error', pendingMessage((e as Error)?.message || '支付信息暂不可用，请查询订单结果')) }
    finally { busy = false; if (!disposed) d.update({ ...view, busy: false }) }
  }
  async function load() {
    await run(async () => { loadAttempt(); if (await read()) pendingView() })
  }
  async function check() {
    await run(async () => {
      loadAttempt()
      if (!await read()) return
      // 详情可能有缓存；使用订单汇付流水或本账号此次初始化返回的流水，查询接口仍校验归属。
      const reference = order?.payTransactionId
        ? (order.payMethod === 'HUIFU' ? order.payTransactionId : '') : saved?.outTradeNo
      if (reference) {
        let failed = false
        try { await d.queryPayment(reference) } catch { failed = true }
        if (!await read()) return
        pendingView()
        if (failed) show('unknown', pendingMessage('通道查询暂不可用，请稍后继续查询原单'))
      } else pendingView()
    })
  }
  async function start() {
    await run(async () => {
      loadAttempt()
      if (!await read()) return
      if (order?.payTransactionId || attempted) { pendingView(); return }
      // 先保存提交标记。保存失败不发请求；请求结果未知时不提供自动再次初始化。
      attempted = true
      const record: HuifuAttempt = { orderId: d.orderId, channel: d.channel, requestedAt: d.now() }
      d.saveAttempt(record)
      saved = record
      let result: Awaited<ReturnType<Dependencies['createPayment']>>
      let qr: string
      try {
        result = await d.createPayment(d.orderId, d.channel)
        const credential = result.qrCode || result.codeUrl
        if (!result.outTradeNo || typeof credential !== 'string' || !credential.trim()) throw new Error('未取得付款二维码，请查询原订单，不要重复提交')
        qr = credential
      } catch (e) {
        // 保留本次初始化的原始失败说明；轮询/重开仍只能核对，不能解锁重发。
        saved = { ...record, lastFailureMessage: (e as Error)?.message || '支付提交结果无法确认' }
        try { d.saveAttempt(saved) } catch { /* 保存失败仍保留已有提交标记和当前页面原始提示。 */ }
        throw e
      }
      saved = { ...record, outTradeNo: result.outTradeNo, qrCode: qr }
      d.saveAttempt(saved)
      if (!await read()) return
      pendingView()
    })
  }
  return { load, start, check, dispose() { disposed = true }, get state() { return { ...view, busy } } }
}
