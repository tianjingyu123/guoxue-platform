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
 * - **login ≠ ready**：真机实测 `chat.login()` resolve 后 SDK 仍处于"登录中"，立即调
 *   getMessageList 等接口报 "sdk not ready"（2999）。必须等 SDK_READY 事件后才可收发。
 *
 * ✅ 2026-07-04 真机联调通过（生产 H5 双账号 A/B 实时互发，appId 1600149724）。
 */
import { ref } from 'vue'
import { apiPost } from '@/utils/request'
import { getUserInfo } from '@/utils/storage'

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

/** SDK 会话对象（只声明用到的字段；conversationID 形如 C2C{userID} / GROUP{groupID} / @TIM#SYSTEM） */
export interface TimConversation {
  conversationID: string
  /** C2C | GROUP | @TIM#SYSTEM */
  type: string
  unreadCount: number
  isPinned: boolean
  /** AcceptAndNotify | AcceptNotNotify | Discard */
  messageRemindType: string
  remark?: string
  draftText?: string
  userProfile?: { userID: string; nick?: string; avatar?: string }
  groupProfile?: { groupID: string; name?: string; avatar?: string; memberNum?: number }
  lastMessage?: {
    lastTime: number
    messageForShow?: string
    fromAccount?: string
    type?: string
    nick?: string
  }
}

/** SDK 群资料对象（getGroupProfile 返回 group；只声明用到字段） */
export interface TimGroup {
  groupID: string
  name?: string
  avatar?: string
  type?: string
  ownerID?: string
  memberCount?: number
  maxMemberCount?: number
  notification?: string
  introduction?: string
  /** 我在本群的资料：role=Owner|Admin|Member；messageRemindType 免打扰态；nameCard 群昵称 */
  selfInfo?: { role?: string; messageRemindType?: string; nameCard?: string }
}

/** SDK 好友申请对象（getFriendApplicationList 返回；仅声明页面需要的字段） */
export interface TimFriendApplication {
  userID: string
  avatar?: string
  nick?: string
  time?: number
  source?: string
  wording?: string
  type: string
}

/** SDK 群成员对象（getGroupMemberList 返回 memberList；role=Owner|Admin|Member） */
export interface TimGroupMember {
  userID: string
  nick?: string
  nameCard?: string
  avatar?: string
  role?: string
}

let TIM: TimModule | null = null
let chat: TimChat | null = null
let loginPromise: Promise<void> | null = null

const isReady = ref(false)
const isLoggedIn = ref(false)

/** 等待 SDK_READY 的挂起回调（login resolve 后 SDK 仍未 ready，见文件头注释） */
let readyWaiters: Array<() => void> = []

type MsgHandler = (messages: TimMessage[]) => void
const messageHandlers = new Set<MsgHandler>()

type ConvHandler = (conversations: TimConversation[]) => void
const convHandlers = new Set<ConvHandler>()

async function loadSdk(): Promise<TimModule> {
  if (!TIM) TIM = (await import('@tencentcloud/chat')).default
  return TIM
}

function ensureClient(sdkAppId: number, sdk: TimModule): TimChat {
  if (chat) return chat
  chat = sdk.create({ SDKAppID: sdkAppId })
  chat.setLogLevel(1) // 1=release（仅告警/错误）
  chat.on(sdk.EVENT.SDK_READY, () => {
    isReady.value = true
    readyWaiters.forEach((r) => r())
    readyWaiters = []
  })
  chat.on(sdk.EVENT.SDK_NOT_READY, () => { isReady.value = false })
  chat.on(sdk.EVENT.KICKED_OUT, () => { isLoggedIn.value = false; isReady.value = false; loginPromise = null })
  chat.on(sdk.EVENT.MESSAGE_RECEIVED, (event: { data: TimMessage[] }) => {
    const msgs = event.data || []
    messageHandlers.forEach((h) => h(msgs))
  })
  chat.on(sdk.EVENT.CONVERSATION_LIST_UPDATED, (event: { data: TimConversation[] }) => {
    const list = event.data || []
    convHandlers.forEach((h) => h(list))
  })
  return chat
}

/** login resolve 后等 SDK_READY（超时给出可重试的友好错误，而非透传 SDK 2999） */
function waitSdkReady(timeoutMs = 15000): Promise<void> {
  if (isReady.value) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('消息服务连接超时，请重试')), timeoutMs)
    readyWaiters.push(() => { clearTimeout(timer); resolve() })
  })
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
      // （后端 ImportAccountDto 要求 userId 必填——空 body 会被 ValidationPipe 400，真机联调实测）
      // ⚠️ 必须带昵称/头像：后端 Nick 兜底是 userId，不带会把腾讯侧昵称覆盖成 UUID（真机联调实测）
      const u = getUserInfo<{ nickname?: string; avatar?: string }>() || {}
      const body: Record<string, string> = { userId }
      if (u.nickname) body.nickname = u.nickname
      if (u.avatar) body.avatar = u.avatar
      try { await apiPost('/im/account/import', body) } catch { /* already imported */ }
      await c.login({ userID: userId, userSig })
      // 关键：login resolve ≠ ready，立即调消息接口会报 "sdk not ready"，必须等 SDK_READY
      await waitSdkReady()
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

  // ───────── 会话列表（SDK 为真源：列表/未读/置顶/免打扰/删除）─────────

  /** 拉取会话列表（含未读数/置顶/免打扰状态） */
  async function getConversationList(): Promise<TimConversation[]> {
    await ensureLogin()
    const res = await chat!.getConversationList()
    return ((res.data?.conversationList || []) as unknown) as TimConversation[]
  }

  /** 订阅会话列表变化（新消息/已读/置顶等都会触发），返回取消订阅函数 */
  function onConversationsUpdated(handler: ConvHandler): () => void {
    convHandlers.add(handler)
    return () => { convHandlers.delete(handler) }
  }

  /** 置顶/取消置顶会话 */
  async function pinConversation(conversationID: string, isPinned: boolean): Promise<void> {
    await ensureLogin()
    await chat!.pinConversation({ conversationID, isPinned })
  }

  /** 会话免打扰开关（C2C 用 userIDList，群聊用 groupID） */
  async function setConversationMute(target: { type: 'C2C' | 'GROUP'; id: string }, mute: boolean): Promise<void> {
    await ensureLogin()
    const messageRemindType = mute ? TIM!.TYPES.MSG_REMIND_ACPT_NOT_NOTE : TIM!.TYPES.MSG_REMIND_ACPT_AND_NOTE
    if (target.type === 'GROUP') {
      await chat!.setMessageRemindType({ groupID: target.id, messageRemindType })
    } else {
      await chat!.setMessageRemindType({ userIDList: [target.id], messageRemindType })
    }
  }

  /** 删除会话（同时清空本地聊天记录） */
  async function deleteConversation(conversationID: string): Promise<void> {
    await ensureLogin()
    await chat!.deleteConversation(conversationID)
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

  /** 用户主动退出群聊：错误必须向上抛，页面不得把失败误报为成功 */
  async function quitGroupStrict(groupId: string): Promise<void> {
    if (!groupId) throw new Error('群聊信息无效，请返回重试')
    await ensureLogin()
    await chat!.quitGroup(groupId)
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

  // ───────── 群聊社交：群资料/成员/名录/已读（群详情页 & 群聊页真源）─────────

  /** 拉取群资料（名称/头像/公告/成员数/我的角色）——群详情/群设置真源 */
  async function getGroupProfile(groupId: string): Promise<TimGroup> {
    await ensureLogin()
    const res = await chat!.getGroupProfile({ groupID: groupId })
    return (res.data?.group as unknown) as TimGroup
  }

  /** 拉取完整群成员列表：SDK 单页最多 100，自动分页并按 userID 去重 */
  async function getGroupMemberList(groupId: string, offset = 0, count = 100): Promise<TimGroupMember[]> {
    await ensureLogin()
    const pageSize = Math.min(100, Math.max(1, count))
    const result: TimGroupMember[] = []
    const seen = new Set<string>()
    let currentOffset = offset
    // 100 页是防御性上限；常规群远低于此值，避免异常服务响应造成死循环
    for (let page = 0; page < 100; page += 1) {
      const res = await chat!.getGroupMemberList({ groupID: groupId, count: pageSize, offset: currentOffset })
      const members = ((res.data?.memberList || []) as unknown) as TimGroupMember[]
      let added = 0
      for (const member of members) {
        if (!seen.has(member.userID)) {
          seen.add(member.userID)
          result.push(member)
          added += 1
        }
      }
      if (members.length < pageSize || added === 0) break
      currentOffset += members.length
    }
    return result
  }

  /** 拉取我加入的群名录（不含未读/最后一条，需与会话列表合并补齐） */
  async function getJoinedGroupList(): Promise<TimGroup[]> {
    await ensureLogin()
    const res = await chat!.getGroupList()
    return ((res.data?.groupList || []) as unknown) as TimGroup[]
  }

  /** 将某群会话标记为已读 */
  async function setGroupRead(groupId: string): Promise<void> {
    if (!isLoggedIn.value || !chat) return
    try { await chat.setMessageRead({ conversationID: `GROUP${groupId}` }) } catch { /* ignore */ }
  }

  /** 修改群名称或公告（腾讯权限规则由 SDK 服务端最终校验） */
  async function updateGroupProfile(
    groupId: string,
    profile: { name?: string; notification?: string },
  ): Promise<void> {
    await ensureLogin()
    await chat!.updateGroupProfile({ groupID: groupId, ...profile })
  }

  /** 修改本人群名片；普通成员也可修改自己的名片 */
  async function setGroupMemberNameCard(groupId: string, nameCard: string): Promise<void> {
    await ensureLogin()
    await chat!.setGroupMemberNameCard({ groupID: groupId, nameCard })
  }

  /** 设置或取消群管理员；仅群主可操作 */
  async function setGroupMemberAdmin(groupId: string, userId: string, isAdmin: boolean): Promise<void> {
    await ensureLogin()
    await chat!.setGroupMemberRole({
      groupID: groupId,
      userID: userId,
      role: isAdmin ? TIM!.TYPES.GRP_MBR_ROLE_ADMIN : TIM!.TYPES.GRP_MBR_ROLE_MEMBER,
    })
  }

  /** 转让群主；仅群主可操作 */
  async function changeGroupOwner(groupId: string, newOwnerId: string): Promise<void> {
    await ensureLogin()
    await chat!.changeGroupOwner({ groupID: groupId, newOwnerID: newOwnerId })
  }

  /** 移除群成员；仅群主可操作，具体权限由腾讯服务端校验 */
  async function deleteGroupMember(groupId: string, userId: string): Promise<void> {
    await ensureLogin()
    await chat!.deleteGroupMember({ groupID: groupId, userIDList: [userId], reason: '群管理员移除成员' })
  }

  /** 解散群聊；仅群主可操作 */
  async function dismissGroup(groupId: string): Promise<void> {
    await ensureLogin()
    await chat!.dismissGroup(groupId)
  }

  // ───────── 好友申请：腾讯仅在客户端 SDK 提供申请列表拉取 ─────────

  /** 拉取别人发给我的待处理好友申请（SDK 缓存会在 ready 前完成同步） */
  async function getFriendApplications(): Promise<TimFriendApplication[]> {
    await ensureLogin()
    const res = await chat!.getFriendApplicationList()
    const list = ((res.data?.friendApplicationList || []) as unknown) as TimFriendApplication[]
    return list.filter((item) => item.type === TIM!.TYPES.SNS_APPLICATION_SENT_TO_ME)
  }

  /** 同意或拒绝好友申请；同意时建立双向好友关系 */
  async function handleFriendApplication(userID: string, action: 'approve' | 'reject'): Promise<void> {
    await ensureLogin()
    if (action === 'approve') {
      await chat!.acceptFriendApplication({
        userID,
        type: TIM!.TYPES.SNS_APPLICATION_AGREE_AND_ADD,
      })
      return
    }
    await chat!.refuseFriendApplication({ userID })
  }

  /** 进入申请页后上报已读；失败不阻断已成功拉取的列表 */
  async function markFriendApplicationsRead(): Promise<void> {
    await ensureLogin()
    try { await chat!.setFriendApplicationRead() } catch { /* fail-open */ }
  }

  return {
    isReady, isLoggedIn, ensureLogin, sendText, getC2CHistory, setC2CRead, onMessage,
    getConversationList, onConversationsUpdated, pinConversation, setConversationMute, deleteConversation,
    joinGroup, quitGroup, quitGroupStrict, sendGroupText, getGroupHistory,
    getGroupProfile, getGroupMemberList, getJoinedGroupList, setGroupRead,
    updateGroupProfile, setGroupMemberNameCard, setGroupMemberAdmin,
    changeGroupOwner, deleteGroupMember, dismissGroup,
    getFriendApplications, handleFriendApplication, markFriendApplicationsRead,
  }
}
