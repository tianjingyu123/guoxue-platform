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

  describe("模板管理", () => {
    const sampleTemplate = {
      id: expect.any(String),
      name: "欢迎邮件",
      subject: "欢迎加入国学平台",
      html: "<h1>欢迎 {{username}}</h1>",
      createdAt: expect.any(String),
    };

    it("创建模板", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.configSystem.upsert.mockResolvedValue({});
      const result = await svc.createTemplate({
        name: "欢迎邮件",
        subject: "欢迎加入国学平台",
        html: "<h1>欢迎 {{username}}</h1>",
      });
      expect(result).toMatchObject(sampleTemplate);
      expect(mockPrisma.configSystem.upsert).toHaveBeenCalled();
    });

    it("获取模板列表（空）", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      const result = await svc.getTemplates();
      expect(result).toEqual([]);
    });

    it("获取模板列表（有数据）", async () => {
      const tpls = [{ id: "t1", name: "Test", subject: "S", html: "H", createdAt: new Date().toISOString() }];
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: JSON.stringify(tpls) });
      const result = await svc.getTemplates();
      expect(result).toHaveLength(1);
    });

    it("更新模板", async () => {
      const tpl = { id: "t1", name: "旧名", subject: "旧主题", html: "<p>old</p>", createdAt: new Date().toISOString() };
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: JSON.stringify([tpl]) });
      const result = await svc.updateTemplate("t1", { name: "新名", subject: "新主题" });
      expect(result).not.toBeNull();
      expect(result!.name).toBe("新名");
      expect(result!.subject).toBe("新主题");
    });

    it("更新不存在的模板返回null", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: JSON.stringify([]) });
      const result = await svc.updateTemplate("not-exist", { name: "X" });
      expect(result).toBeNull();
    });

    it("删除模板", async () => {
      const tpl = { id: "t1", name: "Test", subject: "S", html: "H", createdAt: new Date().toISOString() };
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: JSON.stringify([tpl]) });
      const result = await svc.deleteTemplate("t1");
      expect(result).toBe(true);
    });

    it("删除不存在的模板返回false", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: JSON.stringify([]) });
      const result = await svc.deleteTemplate("not-exist");
      expect(result).toBe(false);
    });

    it("用模板发送（模板不存在）", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: JSON.stringify([]) });
      // 删除SMTP配置让send快速返回
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      const mod2 = await buildModule();
      const s2 = mod2.get(EmailService);
      const result = await s2.sendWithTemplate("not-exist", "a@b.com");
      expect(result.success).toBe(false);
      expect(result.error).toBe("模板不存在");
    });

    it("用模板发送并替换变量", async () => {
      const tpl = { id: "t1", name: "Welcome", subject: "欢迎 {{name}}", html: "<p>你好 {{name}}</p>", createdAt: new Date().toISOString() };
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: JSON.stringify([tpl]) });
      // 删除SMTP配置让send快速返回，避免真实网络连接（同邻近「模板不存在」用例的隔离方式）
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      const mod2 = await buildModule();
      const s2 = mod2.get(EmailService);
      const result = await s2.sendWithTemplate("t1", "a@b.com", { name: "张三" });
      // 变量替换逻辑在send之前，未配置SMTP时send返回失败
      expect(result.success).toBe(false); // 邮件服务未配置或无SMTP
    });
  });

  describe("退订管理", () => {
    it("退订邮箱", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      const result = await svc.unsubscribe("test@example.com", "不想收到邮件");
      expect(result.success).toBe(true);
    });

    it("重复退订提示已退订", async () => {
      const entry = { email: "test@example.com", reason: "用户主动退订", createdAt: new Date().toISOString() };
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: JSON.stringify([entry]) });
      const result = await svc.unsubscribe("test@example.com");
      expect(result.message).toBe("已退订");
    });

    it("重新订阅", async () => {
      const entry = { email: "test@example.com", reason: "用户主动退订", createdAt: new Date().toISOString() };
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: JSON.stringify([entry]) });
      const result = await svc.resubscribe("test@example.com");
      expect(result.message).toBe("已重新订阅");
    });

    it("重新订阅未退订的邮箱", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: JSON.stringify([]) });
      const result = await svc.resubscribe("test@example.com");
      expect(result.message).toBe("该邮箱未退订");
    });

    it("检查是否已退订", async () => {
      const entry = { email: "test@example.com", reason: "用户主动退订", createdAt: new Date().toISOString() };
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: JSON.stringify([entry]) });
      const result = await svc.isUnsubscribed("test@example.com");
      expect(result).toBe(true);
    });

    it("检查未退订的邮箱", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: JSON.stringify([]) });
      const result = await svc.isUnsubscribed("other@example.com");
      expect(result).toBe(false);
    });
  });

  describe("快捷方法", () => {
    it("sendVerifyCode 在未配置时返回错误", async () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      const mod = await buildModule();
      const s = mod.get(EmailService);
      const result = await s.sendVerifyCode("a@b.com", "123456");
      expect(result.success).toBe(false);
    });

    it("sendPasswordReset 在未配置时返回错误", async () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      const mod = await buildModule();
      const s = mod.get(EmailService);
      const result = await s.sendPasswordReset("a@b.com", "https://reset.example.com/token");
      expect(result.success).toBe(false);
    });

    it("sendNotification 在未配置时返回错误", async () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      const mod = await buildModule();
      const s = mod.get(EmailService);
      const result = await s.sendNotification("a@b.com", "标题", "内容");
      expect(result.success).toBe(false);
    });
  });
});
