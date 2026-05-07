import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import compression from "compression";
import { AppModule } from "./app.module";
import { ThrottleGuard } from "./common/throttle.guard";
import { AllExceptionsFilter } from "./common/http-exception.filter";
import { LoggingInterceptor } from "./common/logging.interceptor";
import { join } from "path";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 响应压缩
  app.use(compression());

  // 静态文件服务
  app.useStaticAssets(join(__dirname, "..", "uploads"), { prefix: "/uploads/" });
  app.useStaticAssets(join(__dirname, "..", "static"), { prefix: "/static/" });

  // Swagger 文档配置
  const config = new DocumentBuilder()
    .setTitle("国学平台 API")
    .setDescription("国学传统文化综合平台 RESTful API 文档")
    .setVersion("1.0")
    .addBearerAuth()
    .addServer("/api/v1")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document);

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  });
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalGuards(new ThrottleGuard());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 安全头中间件
  app.use((req: any, res: any, next: any) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
    // CSP: 仅允许本站和腾讯云资源
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https:",
      "connect-src 'self' https:",
      "frame-src 'self' https://*.qq.com",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");
    res.setHeader("Content-Security-Policy", csp);
    next();
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}

bootstrap();
