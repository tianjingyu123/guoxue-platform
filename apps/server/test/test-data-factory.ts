/**
 * 测试数据工厂 — 为单元测试和集成测试提供可复用、可定制的测试数据
 *
 * 设计原则：
 * 1. 每个工厂函数返回一个"合理默认值"对象，调用方通过 overrides 参数覆盖特定字段
 * 2. 所有 ID 和关联字段使用确定性生成，便于在测试断言中追踪
 * 3. 支持嵌套创建：user → auth → order 自动关联
 */

let _seq = 0
function seq(): string {
  return String((++_seq).toString().padStart(4, "0"))
}

function now(): Date {
  return new Date("2026-05-10T00:00:00.000Z")
}

// ───────────────────────────── 核心实体 ─────────────────────────────

export function buildUser(overrides: Record<string, unknown> = {}) {
  const id = `u-${seq()}`
  return {
    id,
    nickname: `测试用户${id}`,
    phone: `138${seq().padStart(8, "0")}`,
    email: null,
    avatar: null,
    gender: "UNKNOWN",
    birthday: null,
    memberLevel: 0,
    memberExpire: null,
    status: "ACTIVE",
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null,
    lastLoginAt: null,
    avatarKey: null,
    intro: null,
    ...overrides,
  }
}

export function buildAuth(overrides: Record<string, unknown> = {}) {
  const user = buildUser()
  return {
    id: `auth-${seq()}`,
    userId: user.id,
    provider: "PASSWORD",
    credential: "$2a$10$dummyhashedpassword",
    openId: null,
    unionId: null,
    createdAt: now(),
    ...overrides,
    user: overrides.user ?? user,
  }
}

export function buildArticle(overrides: Record<string, unknown> = {}) {
  const id = `art-${seq()}`
  const userId = `u-${seq()}`
  return {
    id,
    title: `测试文章_${id}`,
    content: "测试正文内容，至少50字以上的模拟文本用于文章内容填充。这是第二句。第三句接续。",
    excerpt: "测试摘要",
    type: "ARTICLE",
    cover: null,
    tags: ["测试"],
    author: "测试作者",
    dynasty: null,
    viewCount: 0,
    likeCount: 0,
    auditStatus: "APPROVED",
    status: "PUBLISHED",
    userId,
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  }
}

export function buildContent(overrides: Record<string, unknown> = {}) {
  const id = `con-${seq()}`
  return {
    id,
    title: `测试内容_${id}`,
    type: "ARTICLE",
    body: "正文内容",
    excerpt: "摘要",
    author: "作者名",
    dynasty: null,
    tags: ["国学"],
    cover: null,
    status: "PUBLISHED",
    viewCount: 0,
    likeCount: 0,
    authorId: null,
    stationId: null,
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  }
}

export function buildCourse(overrides: Record<string, unknown> = {}) {
  const id = `cou-${seq()}`
  const teacherId = `u-${seq()}`
  return {
    id,
    title: `测试课程_${id}`,
    description: "课程简介",
    cover: null,
    price: 19900, // 单位：分
    originalPrice: 29900,
    type: "VIDEO",
    tags: ["入门"],
    teacherId,
    chapterCount: 10,
    studentCount: 0,
    auditStatus: "APPROVED",
    status: "PUBLISHED",
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  }
}

export function buildCircle(overrides: Record<string, unknown> = {}) {
  const id = `cir-${seq()}`
  const ownerId = `u-${seq()}`
  return {
    id,
    name: `测试圈子_${id}`,
    intro: "圈子简介",
    cover: null,
    tags: ["学习"],
    type: "FREE",
    price: 0,
    depositAmount: 0,
    status: "ACTIVE",
    ownerId,
    memberCount: 0,
    postCount: 0,
    stationId: null,
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  }
}

export function buildCircleMember(overrides: Record<string, unknown> = {}) {
  const circle = buildCircle()
  const user = buildUser()
  return {
    id: `cm-${seq()}`,
    circleId: circle.id,
    userId: user.id,
    role: "MEMBER",
    joinedAt: now(),
    ...overrides,
    circle: overrides.circle ?? circle,
    user: overrides.user ?? user,
  }
}

// ───────────────────────────── 电商实体 ─────────────────────────────

export function buildProduct(overrides: Record<string, unknown> = {}) {
  const id = `prd-${seq()}`
  return {
    id,
    title: `测试商品_${id}`,
    description: "商品描述",
    cover: null,
    price: 9900,
    originalPrice: 19900,
    stock: 100,
    type: "PHYSICAL",
    tags: ["热销"],
    status: "ON_SALE",
    salesCount: 0,
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  }
}

export function buildOrder(overrides: Record<string, unknown> = {}) {
  const id = `ord-${seq()}`
  const orderNo = `ORD${Date.now()}${seq()}`
  const userId = `u-${seq()}`
  const product = buildProduct()
  return {
    id,
    orderNo,
    userId,
    totalAmount: product.price,
    payAmount: product.price,
    discountAmount: 0,
    coinAmount: 0,
    status: "PENDING",
    payMethod: null,
    paidAt: null,
    goodsName: product.title,
    goodsId: product.id,
    goodsCount: 1,
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
    product: overrides.product ?? product,
  }
}

export function buildPaymentResult(overrides: Record<string, unknown> = {}) {
  return {
    payMethod: "WECHAT",
    prepayId: `prepay-${seq()}`,
    codeUrl: `weixin://wxpay/bizpayurl?pr=${seq()}`,
    totalFen: 9900,
    orderNo: `ORD${Date.now()}${seq()}`,
    ...overrides,
  }
}

// ───────────────────────────── 社交/互动实体 ─────────────────────────────

export function buildComment(overrides: Record<string, unknown> = {}) {
  const user = buildUser()
  return {
    id: `cmt-${seq()}`,
    userId: user.id,
    targetType: "CONTENT",
    targetId: `con-${seq()}`,
    content: "测试评论内容",
    parentId: null,
    replyTo: null,
    status: "PUBLISHED",
    likeCount: 0,
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
    user: overrides.user ?? user,
  }
}

export function buildLike(overrides: Record<string, unknown> = {}) {
  return {
    id: `lk-${seq()}`,
    userId: `u-${seq()}`,
    targetType: "CONTENT",
    targetId: `con-${seq()}`,
    createdAt: now(),
    ...overrides,
  }
}

export function buildFollow(overrides: Record<string, unknown> = {}) {
  return {
    id: `flw-${seq()}`,
    userId: `u-${seq()}`,
    followedUserId: `u-${seq()}`,
    createdAt: now(),
    ...overrides,
  }
}

// ───────────────────────────── 虚拟币/金融 ─────────────────────────────

export function buildCoinAccount(overrides: Record<string, unknown> = {}) {
  const userId = `u-${seq()}`
  return {
    id: `vca-${seq()}`,
    userId,
    balance: 1000,
    totalRecharged: 1000,
    totalSpent: 0,
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  }
}

export function buildCoinTransaction(overrides: Record<string, unknown> = {}) {
  const account = buildCoinAccount()
  return {
    id: `vct-${seq()}`,
    userId: account.userId,
    type: "RECHARGE",
    amountCoin: 100,
    balanceAfter: 1100,
    scene: "RECHARGE",
    refId: null,
    description: "测试充值",
    createdAt: now(),
    ...overrides,
  }
}

export function buildGift(overrides: Record<string, unknown> = {}) {
  return {
    id: `gft-${seq()}`,
    name: `测试礼物_${seq()}`,
    icon: null,
    priceCoin: 50,
    level: "NORMAL",
    effectUrl: null,
    sortOrder: 1,
    status: "ACTIVE",
    createdAt: now(),
    ...overrides,
  }
}

// ───────────────────────────── 佣金/分佣 ─────────────────────────────

export function buildCommissionConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: `cc-${seq()}`,
    productType: "COURSE",
    rate: 30, // 30%
    level2Rate: 10, // 10%
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  }
}

export function buildReferralRelation(overrides: Record<string, unknown> = {}) {
  return {
    id: `ref-${seq()}`,
    userId: `u-${seq()}`,
    referrerId: `u-${seq()}`,
    referrerType: "USER",
    sourceChannel: "INVITE_CODE",
    createdAt: now(),
    ...overrides,
  }
}

export function buildWithdrawal(overrides: Record<string, unknown> = {}) {
  return {
    id: `wd-${seq()}`,
    userId: `u-${seq()}`,
    amount: 10000, // 100元
    status: "PENDING",
    payMethod: "WECHAT",
    accountInfo: "{}",
    appliedAt: now(),
    processedAt: null,
    ...overrides,
  }
}

// ───────────────────────────── 其他通用 ─────────────────────────────

export function buildNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: `nof-${seq()}`,
    userId: `u-${seq()}`,
    type: "SYSTEM",
    title: "系统通知",
    content: "通知内容",
    targetType: null,
    targetId: null,
    isRead: false,
    createdAt: now(),
    ...overrides,
  }
}

export function buildStation(overrides: Record<string, unknown> = {}) {
  const id = `sta-${seq()}`
  return {
    id,
    name: `测试分站_${id}`,
    code: `TEST_${id.toUpperCase()}`,
    logo: null,
    themeColor: "#1890ff",
    intro: "分站简介",
    userId: `u-${seq()}`,
    status: "ACTIVE",
    createdAt: now(),
    ...overrides,
  }
}

export function buildLiveRoom(overrides: Record<string, unknown> = {}) {
  const userId = `u-${seq()}`
  return {
    id: `liv-${seq()}`,
    title: `测试直播_${seq()}`,
    cover: null,
    userId,
    status: "LIVE",
    viewerCount: 0,
    likeCount: 0,
    giftTotalCoin: 0,
    streamUrl: null,
    playbackUrl: null,
    startedAt: now(),
    endedAt: null,
    createdAt: now(),
    ...overrides,
  }
}

// ───────────────────────────── 批量工厂 ─────────────────────────────

/** 批量创建 N 个实体（用于分页/列表测试） */
export function buildMany<T>(
  factory: (overrides?: Record<string, unknown>) => T,
  count: number,
  overridesFn?: (index: number) => Record<string, unknown>,
): T[] {
  return Array.from({ length: count }, (_, i) =>
    factory(overridesFn ? overridesFn(i) : undefined),
  )
}

/** 创建完整的注册-登录-购买-分佣链路测试数据 */
export function buildCommerceChain() {
  const inviter = buildUser()
  const newUser = buildUser()
  const referral = buildReferralRelation({ userId: newUser.id, referrerId: inviter.id })
  const course = buildCourse()
  const order = buildOrder({
    userId: newUser.id,
    goodsId: course.id,
    goodsName: course.title,
    totalAmount: course.price,
    payAmount: course.price,
    status: "PAID",
    paidAt: now(),
  })
  const account = buildCoinAccount({ userId: inviter.id, balance: 0, totalRecharged: 0 })
  const commissionConfig = buildCommissionConfig({ productType: "COURSE", rate: 30, level2Rate: 10 })

  return { inviter, newUser, referral, course, order, account, commissionConfig }
}
