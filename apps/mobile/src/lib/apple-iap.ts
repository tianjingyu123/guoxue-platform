import { apiGet, apiPost } from '@/utils/request'
import { getUserInfo } from '@/utils/storage'

export interface AppleIapServerProduct {
  productId: string
  amountCoin: number
  popular: boolean
}

export interface AppleIapProduct extends AppleIapServerProduct {
  title: string
  description: string
  price: number
  currency?: string
  priceText: string
}

export interface AppleIapTransaction {
  transactionIdentifier?: string
  transactionReceipt?: string
  transactionState?: string | number
  productIdentifier?: string
  productid?: string
  payment?: {
    productIdentifier?: string
    productid?: string
  }
  [key: string]: unknown
}

interface AppleIapProductsResponse {
  ready: boolean
  bundleId: string
  products: AppleIapServerProduct[]
}

interface AppleIapVerifyResponse {
  success: boolean
  duplicate: boolean
  transactionId: string
  productId: string
  amountCoin: number
}

type IapChannel = {
  id: string
  requestProduct?: (ids: string[], success: (products: any[]) => void, fail: (error: any) => void) => void
  requestOrder?: (ids: string[], success: (products: any[]) => void, fail: (error: any) => void) => void
  restoreCompletedTransactions: (
    options: { manualFinishTransaction: boolean; username?: string },
    success: (transactions: AppleIapTransaction[]) => void,
    fail: (error: any) => void,
  ) => void
  finishTransaction: (
    transaction: AppleIapTransaction,
    success: () => void,
    fail: (error: any) => void,
  ) => void
}

let channelPromise: Promise<IapChannel> | null = null

function errorMessage(error: any, fallback: string): string {
  return String(error?.errMsg || error?.message || fallback)
    .replace(/^requestPayment:fail\s*/i, '')
    .replace(/^Payment_appleiap:/i, '')
}

function getChannel(): Promise<IapChannel> {
  if (channelPromise) return channelPromise
  const pending = new Promise<IapChannel>((resolve, reject) => {
    ;(uni as any).getProvider({
      service: 'payment',
      success: (result: { providers?: IapChannel[] }) => {
        const channel = result.providers?.find((item) => item.id === 'appleiap')
        if (channel) resolve(channel)
        else reject(new Error('当前安装包未包含 Apple 应用内购买模块，请安装最新测试包'))
      },
      fail: (error: any) => reject(new Error(errorMessage(error, '无法获取 Apple 支付通道'))),
    })
  })
  const resolved = pending.catch((error: unknown) => {
    channelPromise = null
    throw error
  })
  channelPromise = resolved
  return resolved
}

function currencyFromLocale(value: unknown): string | undefined {
  const matched = String(value || '').match(/currency=([A-Z]{3})/)
  return matched?.[1]
}

function formatStorePrice(price: number, currency?: string): string {
  if (!Number.isFinite(price)) return ''
  if (currency === 'CNY' || !currency) return `¥${price.toFixed(price % 1 === 0 ? 0 : 2)}`
  if (currency === 'USD') return `$${price.toFixed(2)}`
  return `${currency} ${price.toFixed(2)}`
}

async function requestStoreProducts(channel: IapChannel, productIds: string[]): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const request = channel.requestProduct || channel.requestOrder
    if (!request) {
      reject(new Error('当前 Apple 支付通道不支持查询商品，请更新安装包'))
      return
    }
    request.call(
      channel,
      productIds,
      (products: any[]) => resolve(products || []),
      (error: any) => reject(new Error(errorMessage(error, '无法从 App Store 获取商品'))),
    )
  })
}

export async function loadAppleIapProducts(): Promise<AppleIapProduct[]> {
  const config = await apiGet<AppleIapProductsResponse>('/apple-iap/products')
  if (!config.ready) throw new Error('Apple 应用内购买服务正在配置，请稍后再试')
  const channel = await getChannel()
  const storeProducts = await requestStoreProducts(channel, config.products.map((item) => item.productId))
  const storeMap = new Map(storeProducts.map((item) => [String(item.productid || item.productIdentifier), item]))
  const products = config.products.flatMap((item) => {
    const store = storeMap.get(item.productId)
    if (!store) return []
    const price = Number(store.price)
    const currency = currencyFromLocale(store.pricelocal || store.priceLocale)
    return [{
      ...item,
      title: String(store.title || `${item.amountCoin} 国学币`),
      description: String(store.description || ''),
      price,
      currency,
      priceText: formatStorePrice(price, currency),
    }]
  })
  if (products.length !== config.products.length) {
    throw new Error('App Store 商品尚未全部生效，请稍后再试')
  }
  return products
}

function currentIapUsername(): string {
  const user = getUserInfo<{ id?: string | number }>()
  const username = String(user?.id ?? '').trim()
  if (!username) throw new Error('登录状态已失效，请重新登录后再进行 Apple 支付')
  return username
}

function requestPayment(productId: string, username: string): Promise<AppleIapTransaction> {
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      provider: 'appleiap',
      orderInfo: {
        productid: productId,
        quantity: 1,
        manualFinishTransaction: true,
        // DCloud 会将该值透传到 Apple 交易，用于服务端验票关联用户与恢复未完成交易筛选。
        username,
      },
      success: (transaction: any) => resolve(transaction as AppleIapTransaction),
      fail: (error: any) => reject(new Error(errorMessage(error, 'Apple 支付未完成'))),
    } as any)
  })
}

function finishTransaction(channel: IapChannel, transaction: AppleIapTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    channel.finishTransaction(
      transaction,
      () => resolve(),
      (error: any) => reject(new Error(errorMessage(error, '关闭 Apple 交易失败'))),
    )
  })
}

function transactionProductId(transaction: AppleIapTransaction, fallback?: string): string {
  return String(
    transaction.productIdentifier
    || transaction.productid
    || transaction.payment?.productIdentifier
    || transaction.payment?.productid
    || fallback
    || '',
  )
}

async function verifyAndFinish(
  channel: IapChannel,
  transaction: AppleIapTransaction,
  fallbackProductId?: string,
): Promise<AppleIapVerifyResponse> {
  const transactionId = String(transaction.transactionIdentifier || '')
  const productId = transactionProductId(transaction, fallbackProductId)
  if (!transactionId || !productId) throw new Error('Apple 返回的交易信息不完整，订单将保留并自动重试')
  const verified = await apiPost<AppleIapVerifyResponse>('/apple-iap/verify', {
    transactionId,
    productId,
    transactionReceipt: transaction.transactionReceipt,
  }, undefined, 30000)
  if (!verified.success) throw new Error('Apple 交易验证未通过')
  await finishTransaction(channel, transaction)
  return verified
}

export async function purchaseAppleIap(productId: string): Promise<AppleIapVerifyResponse> {
  const channel = await getChannel()
  // StoreKit 要求先查询商品；页面加载时已查询，此处保持调用链中的通道实例一致。
  const transaction = await requestPayment(productId, currentIapUsername())
  return verifyAndFinish(channel, transaction, productId)
}

export async function recoverPendingAppleIapTransactions(): Promise<number> {
  const channel = await getChannel()
  const username = currentIapUsername()
  const transactions = await new Promise<AppleIapTransaction[]>((resolve, reject) => {
    channel.restoreCompletedTransactions(
      { manualFinishTransaction: true, username },
      (items) => resolve(items || []),
      (error) => reject(new Error(errorMessage(error, '恢复 Apple 未完成订单失败'))),
    )
  })
  let recovered = 0
  for (const transaction of transactions) {
    const state = String(transaction.transactionState ?? '')
    if (state === '1' || !state) {
      await verifyAndFinish(channel, transaction)
      recovered += 1
    } else if (state === '2') {
      await finishTransaction(channel, transaction)
    }
  }
  return recovered
}
