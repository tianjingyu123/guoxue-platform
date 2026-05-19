import { startTracing, stopTracing } from "./tracing";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { json, urlencoded } from "express";
import compression from "compression";
import helmet from "helmet";
import { AppGraphqlModule } from "./app-graphql.module";
import { RedisThrottleGuard } from "./common/redis-throttle.guard";
import { serverConfig } from "./config/server-config";
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

  const logger = PinoLoggerService.getInstance();
  const app = await NestFactory.create<NestExpressApplication>(AppGraphqlModule, { logger });

  // 请求体大小限制 — 防止大payload攻击
  app.use(json({ limit: "10mb" }));
  app.use(urlencoded({ limit: "10mb", extended: true }));
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

  const port = serverConfig.port;
  await app.listen(port);
  logger.raw().info({ port }, `Server running on http://localhost:${port}`);

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
