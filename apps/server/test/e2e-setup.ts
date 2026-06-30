import { Test, TestingModule } from "@nestjs/testing"
import { INestApplication, ValidationPipe } from "@nestjs/common"
import { AppModule } from "../src/app.module"
import { PrismaService } from "../src/prisma/prisma.service"
import { RedisService } from "../src/redis/redis.service"
import { WechatService } from "../src/modules/auth/wechat.service"
import { WechatPayService } from "../src/modules/shop/wechat-pay.service"
import { AlipayService } from "../src/modules/shop/alipay.service"
import { UnionpayService } from "../src/modules/shop/unionpay.service"
import { VodService } from "../src/modules/video/vod.service"
import { FeatureFlagService } from "../src/modules/feature-flag/feature-flag.service"

const modelMethods = [
  "findUnique", "findUniqueOrThrow", "findFirst", "findMany", "create",
  "update", "delete", "upsert", "count", "aggregate", "groupBy",
  "createMany", "updateMany", "deleteMany",
]

/** 为 Prisma 模型创建 mock——每个方法都是 jest.fn() */
function createModelMock() {
  const mock: Record<string, jest.Mock> = {}
  for (const m of modelMethods) {
    // findMany 返回空数组（避免 UnifiedPricingService 等遍历报错）
    // createMany/updateMany/deleteMany 返回 { count: N }
    mock[m] = jest.fn().mockResolvedValue(
      m === "findMany" || m === "aggregate" || m === "groupBy" ? [] :
      m === "create" || m === "upsert" ? { id: "mock-id" } :
      m === "createMany" || m === "updateMany" || m === "deleteMany" ? { count: 1 } :
      m === "count" ? 0 :
      undefined,
    )
  }
  return mock
}

/** 为交互式事务创建 tx 代理，转发到 prisma mock */
function createTransactionProxy(prismaMock: any): any {
  return new Proxy(prismaMock, {
    get(target, prop) {
      if (typeof prop === "symbol") return undefined;
      if (prop in target) return target[prop];
      // 动态创建未注册的模型 mock
      const modelMock = createModelMock();
      target[prop] = modelMock;
      return modelMock;
    },
  });
}

function createPrismaMock() {
  const mock: any = {
    $transaction: jest.fn((arg: any) => {
      if (typeof arg === "function") return arg(createTransactionProxy(mock));
      return Promise.all(Array.isArray(arg) ? arg : [arg]);
    }),
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    // needApproval 等绕过 generate 锁的列由 service 用原生 SQL 读写（默认非审批制）
    $queryRawUnsafe: jest.fn().mockResolvedValue([{ needApproval: false }]),
    $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  }

  // 常见模型名称，按需自动创建
  const modelNames = [
    "user", "auth", "article", "content", "course", "circle", "circleMember",
    "comment", "like", "collect", "follow", "report", "product", "order",
    "video", "liveRoom", "notification", "auditLog", "virtualCoinAccount",
    "virtualCoinTransaction", "virtualCoinRecharge", "gift", "giftRecord",
    "paidQuestion", "botConfig", "coupon", "userCoupon", "aiAnalysisRecord",
    "userEarning", "systemConfig", "classicBook", "searchHistory",
    "memberPurchase", "orderLogistics", "productSku", "productReview",
    "circleBot", "botKnowledgeBase", "paipanRecord", "station", "commissionConfig",
    "withdrawal", "referralLink", "upload", "userBehaviorLog", "featureFlag",
  ]

  for (const name of modelNames) {
    mock[name] = createModelMock()
  }

  // 对未预定义的模型名，动态创建
  return new Proxy(mock, {
    get(target, prop) {
      if (typeof prop === "symbol") return undefined
      if (!(prop in target)) {
        target[prop] = createModelMock()
      }
      return target[prop]
    },
  })
}

function createWechatMock() {
  return {
    getAccessToken: jest.fn().mockResolvedValue("mock-access-token"),
    buildOAuthUrl: jest.fn().mockReturnValue("https://open.weixin.qq.com/mock"),
    exchangeOAuthCode: jest.fn().mockResolvedValue({ openId: "mock-openid", unionId: "mock-unionid" }),
    exchangeMiniCode: jest.fn().mockResolvedValue({ openId: "mock-openid", sessionKey: "mock-session-key", unionId: "mock-unionid" }),
    getUserInfo: jest.fn().mockResolvedValue({ openid: "mock-openid", unionid: "mock-unionid", nickname: "mock-user" }),
  }
}

function createWechatPayMock() {
  return {
    createNativeOrder: jest.fn().mockResolvedValue({ code_url: "weixin://wxpay/mock-qr-code" }),
    createJsapiOrder: jest.fn().mockResolvedValue({ prepay_id: "mock-prepay-id" }),
    queryOrder: jest.fn().mockResolvedValue({ trade_state: "SUCCESS" }),
    closeOrder: jest.fn().mockResolvedValue({}),
    verifyNotify: jest.fn().mockResolvedValue({ event_type: "TRANSACTION.SUCCESS", resource: {} }),
  }
}

function createAlipayMock() {
  return {
    verifyNotify: jest.fn().mockResolvedValue({ valid: true, data: { outTradeNo: "mock", tradeStatus: "TRADE_SUCCESS" } }),
    query: jest.fn().mockResolvedValue({}),
    refund: jest.fn().mockResolvedValue({}),
  }
}

function createUnionpayMock() {
  return {
    verifyNotify: jest.fn().mockResolvedValue({ valid: true, data: { outTradeNo: "mock", respCode: "00" } }),
    query: jest.fn().mockResolvedValue({}),
    refund: jest.fn().mockResolvedValue({}),
  }
}

function createRedisMock() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    getJson: jest.fn().mockResolvedValue(null),
    setJson: jest.fn().mockResolvedValue(undefined),
    delByPattern: jest.fn().mockResolvedValue(0),
    sadd: jest.fn().mockResolvedValue(1),
    srem: jest.fn().mockResolvedValue(1),
    scard: jest.fn().mockResolvedValue(5),
    incrWithTtl: jest.fn().mockResolvedValue({ count: 1, ttl: 60 }),
    setNX: jest.fn().mockResolvedValue(true),
  }
}

function createVodMock() {
  return {
    genUploadSignature: jest.fn().mockReturnValue({ signature: "mock-sig", expiredTime: 999999 }),
    genPlayerSignature: jest.fn().mockResolvedValue({ fileId: "mock", psign: "mock-psign", expireTime: 3600000 }),
    pullUpload: jest.fn().mockResolvedValue({ TaskId: "mock-task-1" }),
    processMedia: jest.fn().mockResolvedValue({ TaskId: "mock-task-2" }),
    clipVideo: jest.fn().mockResolvedValue({ TaskId: "mock-task-3" }),
    getMediaInfo: jest.fn().mockResolvedValue({ MediaInfoSet: [{ BasicInfo: { Name: "test" } }] }),
    deleteMedia: jest.fn().mockResolvedValue({}),
    modifyMediaInfo: jest.fn().mockResolvedValue({}),
    searchMedia: jest.fn().mockResolvedValue({ MediaInfoSet: [], TotalCount: 0 }),
    getDailyPlayStat: jest.fn().mockResolvedValue({ PlayStatFileSet: [] }),
    getPlayStatSummary: jest.fn().mockResolvedValue({ PlayStatFileSet: [] }),
    parseEventNotification: jest.fn().mockReturnValue(null),
    setEventNotificationUrl: jest.fn().mockResolvedValue({}),
    pullEvents: jest.fn().mockResolvedValue({ EventSet: [] }),
    confirmEvent: jest.fn().mockResolvedValue({}),
  }
}

function createFeatureFlagMock() {
  return {
    isEnabled: jest.fn().mockResolvedValue(true),
    list: jest.fn().mockResolvedValue([]),
    getByKey: jest.fn().mockResolvedValue({ key: "test", enabled: true, percentage: 100, targetUserIds: [] }),
    upsert: jest.fn().mockResolvedValue({ key: "test", enabled: true }),
    delete: jest.fn().mockResolvedValue(undefined),
  }
}

export async function createE2eApp(): Promise<{
  app: INestApplication
  prisma: ReturnType<typeof createPrismaMock>
  redis: ReturnType<typeof createRedisMock>
}> {
  const prisma = createPrismaMock()
  const redis = createRedisMock()
  const wechat = createWechatMock()
  const wechatPay = createWechatPayMock()
  const vod = createVodMock()

  const alipay = createAlipayMock()
  const unionpay = createUnionpayMock()
  const featureFlag = createFeatureFlagMock()

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(RedisService)
    .useValue(redis)
    .overrideProvider(WechatService)
    .useValue(wechat)
    .overrideProvider(WechatPayService)
    .useValue(wechatPay)
    .overrideProvider(AlipayService)
    .useValue(alipay)
    .overrideProvider(UnionpayService)
    .useValue(unionpay)
    .overrideProvider(VodService)
    .useValue(vod)
    .overrideProvider(FeatureFlagService)
    .useValue(featureFlag)
    .compile()

  const app = moduleFixture.createNestApplication()

  app.setGlobalPrefix("api/v1")
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  )

  await app.init()
  return { app, prisma, redis }
}
