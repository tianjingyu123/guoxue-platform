import { Test, TestingModule } from "@nestjs/testing";
import { EmailService } from "./email.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  configSystem: {
    findUnique: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue({}),
  },
};

describe("EmailService", () => {
  let svc: EmailService;

  const buildModule = () =>
    Test.createTestingModule({
      providers: [
        EmailService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

  beforeEach(async () => {
    process.env.EMAIL_MODE = "smtp";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "test@example.com";
    process.env.SMTP_PASS = "password";

    const mod = await buildModule();
    svc = mod.get(EmailService);
  });

  it("应被定义", () => expect(svc).toBeDefined());

  it("SMTP模式配置后应可发送", () => {
    expect(svc.isConfigured()).toBe(true);
  });

  it("无SMTP_HOST时应为未配置", async () => {
    delete process.env.SMTP_HOST;
    const mod = await buildModule();
    const s = mod.get(EmailService);
    expect(s.isConfigured()).toBe(false);
  });

  it("未配置时send应返回错误", async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    const mod = await buildModule();
    const s = mod.get(EmailService);
    const result = await s.send({ to: "a@b.com", subject: "Test" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("邮件服务未配置");
  });

  it("API模式配置后应可用", async () => {
    process.env.EMAIL_MODE = "api";
    process.env.EMAIL_API_KEY = "test-api-key";
    const mod = await buildModule();
    const s = mod.get(EmailService);
    expect(s.isConfigured()).toBe(true);
  });
});
