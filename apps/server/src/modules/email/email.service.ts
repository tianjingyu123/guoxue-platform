import { Injectable, Logger } from "@nestjs/common";
import { connect as tlsConnect } from "tls";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { decrypt } from "../../common/crypto.util";

/**
 * 邮件发送服务
 * 支持两种模式：
 * - SMTP（通过原始TLS Socket直接投递，无SDK依赖）
 * - HTTP API（SendGrid / Resend 兼容格式）
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly config: {
    mode: "smtp" | "api";
    smtp?: { host: string; port: number; user: string; pass: string };
    api?: { url: string; key: string; from: string };
    from: string;
  };

  constructor(private readonly prisma: PrismaService) {
    const mode = process.env.EMAIL_MODE || "smtp";
    this.config = {
      mode: mode as "smtp" | "api",
      from: process.env.EMAIL_FROM || "noreply@guoxue.com",
    };

    if (mode === "smtp") {
      const rawPass = process.env.SMTP_PASS || "";
      // 支持加密密码：以 "ENC:" 前缀存储的密码会自动解密
      const pass = rawPass.startsWith("ENC:") ? decrypt(rawPass.slice(4)) : rawPass;
      this.config.smtp = {
        host: process.env.SMTP_HOST || "",
        port: Number(process.env.SMTP_PORT) || 465,
        user: process.env.SMTP_USER || "",
        pass,
      };
    } else {
      this.config.api = {
        url: process.env.EMAIL_API_URL || "https://api.sendgrid.com/v3/mail/send",
        key: process.env.EMAIL_API_KEY || "",
        from: process.env.EMAIL_FROM || "noreply@guoxue.com",
      };
    }

    if (!this.isConfigured()) {
      this.logger.warn("邮件服务未配置，请在 .env 中设置 EMAIL_* 相关变量");
    }
  }

  isConfigured(): boolean {
    if (this.config.mode === "smtp") {
      return !!(this.config.smtp?.host && this.config.smtp?.user);
    }
    return !!(this.config.api?.key);
  }

  /** 发送邮件（主入口） */
  async send(params: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: "邮件服务未配置" };
    }

    if (this.config.mode === "smtp") {
      return this.sendSmtp(params);
    }
    return this.sendApi(params);
  }

  // ───────── SMTP 模式 ─────────

  private async sendSmtp(params: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const from = params.from || this.config.from;
    const to = Array.isArray(params.to) ? params.to.join(", ") : params.to;

    const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 8)}@guoxue.com>`;
    const boundary = `----=_Part_${Math.random().toString(36).substring(2, 12)}`;

    const bodyParts: string[] = [];
    bodyParts.push(`From: ${from}`);
    bodyParts.push(`To: ${to}`);
    bodyParts.push(`Subject: =?UTF-8?B?${Buffer.from(params.subject).toString("base64")}?=`);
    bodyParts.push(`Message-ID: ${messageId}`);
    bodyParts.push("MIME-Version: 1.0");
    bodyParts.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    bodyParts.push("");
    bodyParts.push(`--${boundary}`);
    bodyParts.push('Content-Type: text/plain; charset="UTF-8"');
    bodyParts.push("Content-Transfer-Encoding: base64");
    bodyParts.push("");
    bodyParts.push(Buffer.from(params.text || params.subject).toString("base64"));
    bodyParts.push(`--${boundary}`);
    bodyParts.push('Content-Type: text/html; charset="UTF-8"');
    bodyParts.push("Content-Transfer-Encoding: base64");
    bodyParts.push("");
    bodyParts.push(Buffer.from(params.html || params.text || params.subject).toString("base64"));
    bodyParts.push(`--${boundary}--`);
    bodyParts.push(".");

    const raw = bodyParts.join("\r\n");

    try {
      await this.smtpTransaction(from, to.split(", "), raw);
      return { success: true, messageId };
    } catch (err: unknown) {
      const msg = (err as Error).message;
      this.logger.error("SMTP发送失败", msg);
      return { success: false, error: msg };
    }
  }

  /** SMTP 事务（EHLO → AUTH LOGIN → MAIL → RCPT → DATA → QUIT） */
  private smtpTransaction(from: string, toList: string[], data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const smtp = this.config.smtp!;
      const socket = tlsConnect(smtp.port, smtp.host, {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false",
      });

      let buffer = "";
      let step = 0;

      const send = (cmd: string) => {
        socket.write(cmd + "\r\n");
      };

      socket.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\r\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const code = parseInt(line.substring(0, 3));
          if (isNaN(code)) continue;

          try {
            switch (step) {
              case 0: // 等待220
                if (code === 220) { send("EHLO guoxue.com"); step++; }
                break;
              case 1: // 等待250
                if (code === 250) { send("AUTH LOGIN"); step++; }
                break;
              case 2: // 等待334
                if (code === 334) {
                  send(Buffer.from(smtp.user).toString("base64"));
                  step++;
                }
                break;
              case 3: // 等待334（用户名已发送）
                if (code === 334) {
                  send(Buffer.from(smtp.pass).toString("base64"));
                  step++;
                }
                break;
              case 4: // 等待235
                if (code === 235) { send(`MAIL FROM:<${from}>`); step++; }
                break;
              case 5: // 等待250
                if (code === 250) {
                  const rcpt = toList.shift();
                  if (rcpt) {
                    send(`RCPT TO:<${rcpt.trim()}>`);
                    // stay in step 5
                  } else {
                    send("DATA"); step++;
                  }
                }
                break;
              case 6: // 等待354
                if (code === 354) { send(data); step++; }
                break;
              case 7: // 等待250（邮件已接收）
                if (code === 250) { send("QUIT"); step++; }
                break;
              case 8: // 等待221
                if (code === 221) { socket.end(); resolve(); }
                break;
            }
          } catch (err) {
            socket.end();
            reject(err);
          }
        }
      });

      socket.on("error", (err) => {
        socket.end();
        reject(err);
      });

      socket.on("end", () => {
        if (step < 8) reject(new Error(`SMTP 连接提前关闭 (step=${step})`));
      });

      socket.setTimeout(15000, () => {
        socket.end();
        reject(new Error("SMTP 连接超时"));
      });
    });
  }

  // ───────── HTTP API 模式（SendGrid/Resend 兼容） ─────────

  private async sendApi(params: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const api = this.config.api!;
    const toList = Array.isArray(params.to) ? params.to : [params.to];

    const body: Record<string, unknown> = {
      personalizations: [{
        to: toList.map((email) => ({ email })),
        subject: params.subject,
      }],
      from: { email: params.from || api.from },
      content: [] as Array<{ type: string; value: string }>,
    };

    if (params.text) (body.content as Array<{ type: string; value: string }>).push({ type: "text/plain", value: params.text });
    if (params.html) (body.content as Array<{ type: string; value: string }>).push({ type: "text/html", value: params.html });

    try {
      const resp = await fetch(api.url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${api.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (resp.status >= 400) {
        const err = await resp.text();
        this.logger.error("邮件API发送失败", err);
        return { success: false, error: err };
      }

      const messageId = resp.headers.get("x-message-id") || `<${Date.now()}@api>`;
      return { success: true, messageId };
    } catch (err: unknown) {
      this.logger.error("邮件API请求异常", (err as Error).message);
      return { success: false, error: (err as Error).message };
    }
  }

  // ───────── 模板管理 ─────────

  /** 获取模板列表 */
  async getTemplates() {
    try {
      const cfg = await this.prisma.configSystem.findUnique({ where: { configKey: "email_templates" } });
      if (cfg?.configValue) return JSON.parse(cfg.configValue) as EmailTemplate[];
    } catch { /* ignore */ }
    return [];
  }

  /** 创建模板 */
  async createTemplate(dto: { name: string; subject: string; html: string; description?: string }) {
    const templates = await this.getTemplates();
    const tpl: EmailTemplate = { id: randomUUID(), ...dto, createdAt: new Date().toISOString() };
    templates.push(tpl);
    await this.saveTemplates(templates);
    return tpl;
  }

  /** 更新模板 */
  async updateTemplate(id: string, dto: { name?: string; subject?: string; html?: string; description?: string }) {
    const templates = await this.getTemplates();
    const idx = templates.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    if (dto.name !== undefined) templates[idx].name = dto.name;
    if (dto.subject !== undefined) templates[idx].subject = dto.subject;
    if (dto.html !== undefined) templates[idx].html = dto.html;
    if (dto.description !== undefined) templates[idx].description = dto.description;
    await this.saveTemplates(templates);
    return templates[idx];
  }

  /** 删除模板 */
  async deleteTemplate(id: string) {
    const templates = await this.getTemplates();
    const filtered = templates.filter((t) => t.id !== id);
    if (filtered.length === templates.length) return false;
    await this.saveTemplates(filtered);
    return true;
  }

  /** 用模板发送邮件 */
  async sendWithTemplate(templateId: string, to: string | string[], vars: Record<string, string> = {}) {
    const templates = await this.getTemplates();
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return { success: false, error: "模板不存在" };

    let html = tpl.html;
    let subject = tpl.subject;
    for (const [key, val] of Object.entries(vars)) {
      const re = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      html = html.replace(re, val);
      subject = subject.replace(re, val);
    }
    return this.send({ to, subject, html });
  }

  private async saveTemplates(templates: EmailTemplate[]) {
    await this.prisma.configSystem.upsert({
      where: { configKey: "email_templates" },
      create: { configKey: "email_templates", configValue: JSON.stringify(templates) },
      update: { configValue: JSON.stringify(templates) },
    });
  }

  // ───────── 退订管理 ─────────

  /** 退订邮件 */
  async unsubscribe(email: string, reason?: string) {
    const list = await this.getUnsubscribeList();
    if (list.find((e) => e.email === email)) return { success: true, message: "已退订" };
    list.push({ email, reason: reason || "用户主动退订", createdAt: new Date().toISOString() });
    await this.saveUnsubscribeList(list);
    this.logger.log(`邮件退订: ${email}`);
    return { success: true, message: "退订成功" };
  }

  /** 重新订阅 */
  async resubscribe(email: string) {
    const list = await this.getUnsubscribeList();
    const filtered = list.filter((e) => e.email !== email);
    if (filtered.length === list.length) return { success: true, message: "该邮箱未退订" };
    await this.saveUnsubscribeList(filtered);
    this.logger.log(`邮件重新订阅: ${email}`);
    return { success: true, message: "已重新订阅" };
  }

  /** 检查是否已退订 */
  async isUnsubscribed(email: string): Promise<boolean> {
    const list = await this.getUnsubscribeList();
    return list.some((e) => e.email === email);
  }

  /** 获取退订列表 */
  async getUnsubscribeList(): Promise<UnsubscribeEntry[]> {
    try {
      const cfg = await this.prisma.configSystem.findUnique({ where: { configKey: "email_unsubscribes" } });
      if (cfg?.configValue) return JSON.parse(cfg.configValue);
    } catch { /* ignore */ }
    return [];
  }

  private async saveUnsubscribeList(list: UnsubscribeEntry[]) {
    await this.prisma.configSystem.upsert({
      where: { configKey: "email_unsubscribes" },
      create: { configKey: "email_unsubscribes", configValue: JSON.stringify(list) },
      update: { configValue: JSON.stringify(list) },
    });
  }

  // ───────── 快捷方法 ─────────

  /** 发送验证码邮件 */
  async sendVerifyCode(to: string, code: string, expireMinutes: number = 5) {
    const html = `
      <div style="max-width:480px;margin:0 auto;padding:32px;font-family:Arial,sans-serif;background:#fdf6ed;border-radius:8px;">
        <h2 style="color:#8B0000;text-align:center;">国学传统文化平台</h2>
        <p style="font-size:16px;">您的验证码是：</p>
        <div style="background:#8B0000;color:#fff;font-size:28px;text-align:center;padding:16px;border-radius:6px;letter-spacing:6px;margin:20px 0;">${code}</div>
        <p style="color:#666;">验证码 ${expireMinutes} 分钟内有效，请勿泄露给他人。</p>
        <hr style="border-color:#E8E0D5;">
        <p style="color:#999;font-size:12px;text-align:center;">这是一封自动发送的邮件，请勿回复。</p>
      </div>`;
    return this.send({ to, subject: `验证码：${code}`, html });
  }

  /** 发送密码重置邮件 */
  async sendPasswordReset(to: string, resetUrl: string, expireMinutes: number = 30) {
    const html = `
      <div style="max-width:480px;margin:0 auto;padding:32px;font-family:Arial,sans-serif;background:#fdf6ed;border-radius:8px;">
        <h2 style="color:#8B0000;text-align:center;">密码重置</h2>
        <p style="font-size:16px;">请点击下方按钮重置您的密码：</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${resetUrl}" style="background:#8B0000;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:16px;">重置密码</a>
        </div>
        <p style="color:#666;">该链接 ${expireMinutes} 分钟内有效。如非本人操作请忽略。</p>
      </div>`;
    return this.send({ to, subject: "密码重置", html });
  }

  /** 发送系统通知邮件 */
  async sendNotification(to: string, title: string, content: string, actionUrl?: string) {
    let html = `
      <div style="max-width:480px;margin:0 auto;padding:32px;font-family:Arial,sans-serif;background:#fdf6ed;border-radius:8px;">
        <h2 style="color:#8B0000;">${title}</h2>
        <p style="font-size:16px;line-height:1.6;">${content}</p>`;
    if (actionUrl) {
      html += `
        <div style="text-align:center;margin:24px 0;">
          <a href="${actionUrl}" style="background:#C9A96E;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:16px;">查看详情</a>
        </div>`;
    }
    html += `
        <hr style="border-color:#E8E0D5;">
        <p style="color:#999;font-size:12px;text-align:center;">国学传统文化平台 · 系统通知</p>
      </div>`;
    return this.send({ to, subject: title, html });
  }
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  description?: string;
  createdAt: string;
}

export interface UnsubscribeEntry {
  email: string;
  reason: string;
  createdAt: string;
}
