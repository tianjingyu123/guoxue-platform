import { startTracing, stopTracing } from "./tracing";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import compression from "compression";
import helmet from "helmet";
import { AppGraphqlModule } from "./app-graphql.module";
import { RedisThrottleGuard } from "./common/redis-throttle.guard";
import { RedisIoAdapter } from "./common/redis-io.adapter";
import { serverConfig } from "./config/server-config";
import { cryptoSelfTest, setDecryptAlertHandler } from "./common/crypto.util";
import { ThirdPartyConfigLoader } from "./modules/system/third-party-config.loader";
import { PrismaService } from "./prisma/prisma.service";
import { setAlertHandler } from "./common/alert";
import { WeworkService } from "./modules/notification/wework.service";
import { RedisService } from "./redis/redis.service";
import { AllExceptionsFilter } from "./common/http-exception.filter";
import { PrismaExceptionFilter } from "./common/prisma-exception.filter";
import { chineseValidationExceptionFactory } from "./common/validation-chinese";
import { LoggingInterceptor } from "./common/logging.interceptor";
import { TracingInterceptor } from "./common/tracing.interceptor";
import { ResponseInterceptor } from "./common/response.interceptor";
import { AuditInterceptor } from "./common/audit.interceptor";
import { AuditService } from "./modules/audit/audit.service";
import { SanitizePipe } from "./common/sanitize.pipe";
import { PinoLoggerService } from "./common/pino-logger.service";
import { join } from "path";

async function bootstrap() {
  await startTracing();

  // 启动前校验必需环境变量 — 一次性列出所有缺失项，避免逐个模块崩溃
  serverConfig.validateRequiredEnv();
  // B2: 安全配置强度校验（密钥长度/弱值，生产强制）+ 加密往返自检（fail fast，密钥错配则拒绝启动）
  serverConfig.validateSecurityConfig();
  cryptoSelfTest();

  const logger = PinoLoggerService.getInstance();

  // ⚠️ 在创建应用【之前】把后台第三方密钥(DB)同步到 process.env。
  // 原因：部分模块在实例化(create 期间)时就读 env 决定行为——如 upload 存储 provider 工厂
  // 按 COS_SECRET_ID 选 CosStorageProvider 还是本地存储、CosStorageProvider 构造时即建客户端。
  // 若同步晚于 create(原在 listen 前)，后台配置的 COS/等密钥永不生效(只会走 .env 兜底/本地存储)。
  try {
    const { PrismaClient } = await import("@prisma/client");
    const bootPrisma = new PrismaClient();
    try {
      const n = await new ThirdPartyConfigLoader(bootPrisma as unknown as PrismaService).syncToEnv();
      logger.raw().info(`启动前已同步 ${n} 项后台第三方密钥到 env`);
    } finally {
      await bootPrisma.$disconnect();
    }
  } catch (e) {
    logger.raw().warn(`启动前第三方密钥同步失败，使用 .env 兜底：${(e as Error)?.message}`);
  }

  // rawBody:true 保留请求原始字节到 req.rawBody（微信支付 V3 回调必须对原始报文验签，重构后的 JSON 会破坏签名）。
  // 不影响其它 controller：json/urlencoded 仍正常解析 req.body，仅额外缓存原始 Buffer。
  const app = await NestFactory.create<NestExpressApplication>(AppGraphqlModule, { logger, rawBody: true });

  // B2: 注入解密失败告警通道 — decrypt 遇 GCM 认证失败（疑似密钥错配）时经企微告警；无 webhook 时降级为日志
  try {
    const wework = app.get(WeworkService, { strict: false });
    const toWework = (title: string, detail: string) => { wework.notifyAlert(title, detail).catch(() => undefined); };
    setDecryptAlertHandler(toWework);
    // B4 可观测：5xx / 慢请求 / 队列积压统一告警通道注入企微
    setAlertHandler(toWework);
  } catch {
    logger.raw().warn("WeworkService 不可用，解密/可观测告警降级为 stderr 日志");
  }

  // 请求体大小限制 — 防止大payload攻击。
  // 用 useBodyParser 而非 app.use(json())：配合 rawBody:true 才能既自定义 10mb 上限、又保留 req.rawBody 原始字节
  // （直接 app.use(json()) 会先消费请求流，导致 rawBody 缓存不到，微信回调验签拿不到原文）。
  app.useBodyParser("json", { limit: "10mb" });
  app.useBodyParser("urlencoded", { limit: "10mb", extended: true });
  app.use(compression());

  // 静态文件服务
  app.useStaticAssets(join(__dirname, "..", "uploads"), { prefix: "/uploads/" });
  app.useStaticAssets(join(__dirname, "..", "static"), { prefix: "/static/" });

  // Swagger 文档配置 — 仅非生产环境启用
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("国学平台 API")
      .setDescription("国学传统文化综合平台 RESTful API 文档")
      .setVersion("1.0")
      .addBearerAuth()
      .addServer("/api/v1")
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api-docs", app, document);
  }

  app.setGlobalPrefix("api/v1");

  // 根路径欢迎页
  app.getHttpAdapter().get("/", (_req: any, res: any) => {
    res.json({
      code: 200,
      data: { app: "guoxue-server", version: "1.0", docs: "/api-docs" },
      message: "国学平台 API 运行中",
    });
  });
  app.enableCors({
    origin: serverConfig.corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  });
  app.useGlobalInterceptors(
    new TracingInterceptor(),
    new LoggingInterceptor(),
    new ResponseInterceptor(),
    new AuditInterceptor(app.get(AuditService)),
  );
  app.useGlobalGuards(new RedisThrottleGuard(app.get(RedisService)));

  // websocket 跨实例广播（H2·cluster 前提）：Redis adapter 接入，不可用时降级单实例
  const ioAdapter = new RedisIoAdapter(app);
  await ioAdapter.connectToRedis();
  app.useWebSocketAdapter(ioAdapter);
  app.useGlobalFilters(new PrismaExceptionFilter(), new AllExceptionsFilter());
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: chineseValidationExceptionFactory,
    }),
  );

  // 安全头 — Helmet 默认覆盖 OWASP 推荐的所有安全头
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        mediaSrc: ["'self'", "https:"],
        connectSrc: ["'self'", "https:"],
        frameSrc: ["'self'", "https://*.qq.com"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  }));

  // 启动时把后台配置的第三方密钥同步到 process.env（DB 优先、.env 兜底；保存时会再同步实现热生效）
  try {
    await app.get(ThirdPartyConfigLoader).syncToEnv();
  } catch (e) {
    logger.raw().warn(`第三方密钥同步失败，使用 .env 兜底：${(e as Error)?.message}`);
  }

  const port = serverConfig.port;
  const host = serverConfig.host;
  await app.listen(port, host);
  logger.raw().info({ host, port }, `Server running on http://${host}:${port}`);

  // 优雅关闭：捕获 SIGTERM/SIGINT，先关 HTTP 再断数据库
  const signals = ["SIGTERM", "SIGINT"];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.raw().info({ signal }, `收到 ${signal}，开始优雅关闭...`);
      await app.close();
      await stopTracing();
      logger.raw().info("服务已关闭");
      process.exit(0);
    });
  }
}

bootstrap();
