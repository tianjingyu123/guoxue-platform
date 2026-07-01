/**
 * 腾讯云 IM（TIM / @tencentcloud/chat）接入 —— 方案A：收发走 SDK，管理走后端 REST。
 *
 * ## 登录链路
 * 1. `POST /im/user-sig` 取 { appId, userId, userSig }（后端 TLSSigAPIv2 签名）
 * 2. `POST /im/account/import` 幂等导入账号（TIM 要求 identifier 先导入才能收发；已存在则忽略错误）
 * 3. `chat.login({ userID: user.id, userSig })`
 *
 * ## 设计要点
 * - **单例**：chat 实例与登录态跨页面复用（module 级），避免每页重复 create/login。
 * - **动态 import**：@tencentcloud/chat 是 Web SDK，仅在真正用到（H5）时加载，避免非 H5 端构建期静态求值。
 * - **登录去重**：并发 ensureLogin 复用同一 Promise。
 * - identifier = 后端 user.id（字符串，非 number）。
 *
 * ⚠️ 沙箱无法运行验证：需真实 IM_APP_ID + 两个真账号在 H5 实时收发验证。
 */
import { ref } from 'vue'
import { apiPost } from '@/utils/request'

type TimModule = typeof import('@tencentcloud/chat').default
type TimChat = ReturnType<TimModule['create']>
/** SDK 消息对象（结构以 SDK 为准，这里只声明用到的字段） */
export interface TimMessage {
  ID: string
  conversationID: string
  conversationType: string
  from: string
  to: string
  flow: 'in' | 'out'
  time: number
  type: string
  payload: { text?: string }
  nick?: string
  avatar?: string
}

let TIM: TimModule | null = null
let chat: TimChat | null = null
let loginPromise: Promise<void> | null = null

const isReady = ref(false)
const isLoggedIn = ref(false)

type MsgHandler = (messages: TimMessage[]) => void
const messageHandlers = new Set<MsgHandler>()

async function loadSdk(): Promise<TimModule> {
  if (!TIM) TIM = (await import('@tencentcloud/chat')).default
  return TIM
}

function ensureClient(sdkAppId: number, sdk: TimModule): TimChat {
  if (chat) return chat
  chat = sdk.create({ SDKAppID: sdkAppId })
  chat.setLogLevel(1) // 1=release（仅告警/错误）
  chat.on(sdk.EVENT.SDK_READY, () => { isReady.value = true })
  chat.on(sdk.EVENT.KICKED_OUT, () => { isLoggedIn.value = false; loginPromise = null })
  chat.on(sdk.EVENT.MESSAGE_RECEIVED, (event: { data: TimMessage[] }) => {
    const msgs = event.data || []
    messageHandlers.forEach((h) => h(msgs))
  })
  return chat
}

export function useTim() {
  /** 确保已登录 TIM（取 user-sig → 导入账号 → login），并发复用同一 Promise */
  async function ensureLogin(): Promise<void> {
    if (isLoggedIn.value && chat) return
    if (loginPromise) return loginPromise
    loginPromise = (async () => {
      const sdk = await loadSdk()
      const { appId, userId, userSig } = await apiPost<{ appId: number; userId: string; userSig: string }>('/im/user-sig', {})
      const c = ensureClient(appId, sdk)
      // 账号导入幂等：已导入会报错，忽略即可，不阻断登录
      try { await apiPost('/im/account/import', {}) } catch { /* already imported */ }
      await c.login({ userID: userId, userSig })
      isLoggedIn.value = true
    })().catch((e) => { loginPromise = null; throw e })
    return loginPromise
  }

  /** 发送 1:1 文本消息，返回 SDK 落地的消息对象 */
  async function sendText(toUserId: string, text: string): Promise<TimMessage> {
    await ensureLogin()
    const sdk = TIM!
    const c = chat!
    const message = c.createTextMessage({
      to: toUserId,
      conversationType: sdk.TYPES.CONV_C2C,
      payload: { text },
    })
    const res = await c.sendMessage(message)
    return res.data.message as unknown as TimMessage
  }

  /** 拉取与某用户的单聊历史（分页游标 nextReqMessageID；SDK 每页固定条数） */
  async function getC2CHistory(toUserId: string, nextReqMessageID?: string): Promise<{ messageList: TimMessage[]; nextReqMessageID: string; isCompleted: boolean }> {
    await ensureLogin()
    const c = chat!
    const res = await c.getMessageList({ conversationID: `C2C${toUserId}`, nextReqMessageID })
    return res.data as unknown as { messageList: TimMessage[]; nextReqMessageID: string; isCompleted: boolean }
  }

  /** 将某会话标记为已读 */
  async function setC2CRead(toUserId: string): Promise<void> {
    if (!isLoggedIn.value || !chat) return
    try { await chat.setMessageRead({ conversationID: `C2C${toUserId}` }) } catch { /* ignore */ }
  }

  /** 订阅收到的新消息，返回取消订阅函数 */
  function onMessage(handler: MsgHandler): () => void {
    messageHandlers.add(handler)
    return () => { messageHandlers.delete(handler) }
  }

  // ───────── 直播弹幕：TIM 群消息（复用同一单例 + MESSAGE_RECEIVED 订阅）─────────

  /** 加入 TIM 群（直播弹幕群）；已在群内(10013)视为成功。groupId 空时静默跳过 */
  async function joinGroup(groupId: string): Promise<void> {
    if (!groupId) return
    await ensureLogin()
    try {
      await chat!.joinGroup({ groupID: groupId, type: TIM!.TYPES.GRP_AVCHATROOM })
    } catch (e: unknown) {
      // 10013=已是群成员；AVChatRoom 直播群允许匿名进出，其余错误吞掉不阻断观看
      const code = (e as { code?: number })?.code
      if (code !== 10013) { /* 进群失败不阻断：弹幕降级为只读/占位 */ }
    }
  }

  /** 退出 TIM 群（页面卸载时调用）；失败静默 */
  async function quitGroup(groupId: string): Promise<void> {
    if (!groupId || !isLoggedIn.value || !chat) return
    try { await chat.quitGroup(groupId) } catch { /* ignore */ }
  }

  /** 发送群弹幕文本，返回 SDK 落地消息对象 */
  async function sendGroupText(groupId: string, text: string): Promise<TimMessage> {
    await ensureLogin()
    const sdk = TIM!
    const c = chat!
    const message = c.createTextMessage({
      to: groupId,
      conversationType: sdk.TYPES.CONV_GROUP,
      payload: { text },
    })
    const res = await c.sendMessage(message)
    return res.data.message as unknown as TimMessage
  }

  /** 拉取群历史弹幕（分页游标 nextReqMessageID） */
  async function getGroupHistory(groupId: string, nextReqMessageID?: string): Promise<{ messageList: TimMessage[]; nextReqMessageID: string; isCompleted: boolean }> {
    await ensureLogin()
    const c = chat!
    const res = await c.getMessageList({ conversationID: `GROUP${groupId}`, nextReqMessageID })
    return res.data as unknown as { messageList: TimMessage[]; nextReqMessageID: string; isCompleted: boolean }
  }

  return {
    isReady, isLoggedIn, ensureLogin, sendText, getC2CHistory, setC2CRead, onMessage,
    joinGroup, quitGroup, sendGroupText, getGroupHistory,
  }
}
