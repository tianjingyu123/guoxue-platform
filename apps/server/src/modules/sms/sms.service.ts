import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service";
import { PrismaService } from "../../prisma/prisma.service";
import { maskPhone } from "../../common/crypto.util";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { tc3Sign, TencentCloudResponse } from "../../common/tc3.util";
import { MetricsService } from "../../common/metrics.service";

/**
 * 腾讯云短信 SMS 服务（纯原生API，不依赖SDK）
 * 用于发送手机验证码，支持登录/注册/找回密码等场景
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly secretId: string;
  private readonly secretKey: string;
  private readonly appId: string;
  private readonly signName: string;
  private readonly templateId: string;
  private readonly host = "sms.tencentcloudapi.com";
  private readonly apiVersion = "2021-01-11";

  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
    @Optional() @Inject(MetricsService) private metrics?: MetricsService,
  ) {
    this.secretId = process.env.TENCENT_SECRET_ID || process.env.COS_SECRET_ID || "";
    this.secretKey = process.env.TENCENT_SECRET_KEY || process.env.COS_SECRET_KEY || "";
    this.appId = process.env.SMS_APP_ID || "";
    this.signName = process.env.SMS_SIGN_NAME || "国学平台";
    this.templateId = process.env.SMS_TEMPLATE_ID || "";

    if (!this.secretId || !this.secretKey) {
      this.logger.warn("腾讯云密钥未配置，短信服务将不可用");
    }
  }

  /** TC3-HMAC-SHA256 签名调用 */
  private async callApi(action: string, params: Record<string, unknown>) {
    const { host, headers, payloadStr } = tc3Sign({
      secretId: this.secretId,
      secretKey: this.secretKey,
      service: "sms",
      action,
      version: this.apiVersion,
      payload: params,
    });

    const start = Date.now();
    try {
      const resp = await fetch(`https://${host}`, {
        method: "POST",
        headers,
        body: payloadStr,
      });

      const duration = Date.now() - start;
      const data = await resp.json() as TencentCloudResponse;

      if (data.Response?.Error) {
        const reason = (data.Response.Error.Code || "unknown") as string;
        this.metrics?.recordExternalApi("sms", action, false, duration, reason);
        this.logger.error(`SMS API错误 [${action}]`, data.Response.Error);
        throw new BusinessException(ErrorCode.THIRD_SMS_FAILED, `短信发送失败: ${data.Response.Error.Message}`);
      }

      this.metrics?.recordExternalApi("sms", action, true, duration);
      return data.Response!;
    } catch (err) {
      const duration = Date.now() - start;
      if (err instanceof BusinessException) throw err;
      const reason = (err as Error).message?.substring(0, 50) ?? "network_error";
      this.metrics?.recordExternalApi("sms", action, false, duration, reason);
      throw err;
    }
  }

  /** 发送短信验证码 */
  async sendVerifyCode(phone: string, scene: string = "LOGIN"): Promise<{ ok: boolean; message: string }> {
    // 频率限制：60秒内只能发一次
    const rateKey = `sms:rate:${phone}`;
    const lastSent = await this.redis.get(rateKey);
    if (lastSent) {
      throw new BusinessException(ErrorCode.THIRD_SMS_FAILED, "验证码已发送，请60秒后再试");
    }

    // 生成6位验证码
    const code = String(Math.floor(100000 + Math.random() * 900000));

    const templateParamSet = [code, "5"]; // 验证码, 有效期5分钟
    const phoneNumberSet = [`+86${phone}`];

    try {
      await this.callApi("SendSms", {
        PhoneNumberSet: phoneNumberSet,
        SmsSdkAppId: this.appId,
        SignName: this.signName,
        TemplateId: this.templateId,
        TemplateParamSet: templateParamSet,
      });

      // 存储验证码到 Redis（5分钟有效）
      const codeKey = `sms:code:${scene}:${phone}`;
      await this.redis.set(codeKey, code, 300);

      // 设置频率限制（60秒）
      await this.redis.set(rateKey, "1", 60);

      // 异步写日志
      this.prisma.smsLog.create({
        data: { phone: maskPhone(phone), scene, status: "SUCCESS" },
      }).catch((e) => this.logger.warn("SMS日志写入失败", e));

      this.logger.log(`验证码已发送到 ${maskPhone(phone)}，场景: ${scene}`);
      return { ok: true, message: "验证码已发送" };
    } catch (err: unknown) {
      const errorMsg = (err as Error).message;
      // 异步写失败日志
      this.prisma.smsLog.create({
        data: { phone: maskPhone(phone), scene, status: "FAIL", errorMsg: errorMsg?.substring(0, 200) },
      }).catch((e) => this.logger.warn("SMS日志写入失败", e));

      this.logger.error(`短信发送失败: ${maskPhone(phone)}`, errorMsg);
      return { ok: false, message: errorMsg };
    }
  }

  /** 验证短信验证码 */
  async verifyCode(phone: string, code: string, scene: string = "LOGIN"): Promise<boolean> {
    const codeKey = `sms:code:${scene}:${phone}`;
    const storedCode = await this.redis.get(codeKey);

    if (!storedCode) {
      throw new BusinessException(ErrorCode.AUTH_SMS_CODE_EXPIRED, "验证码已过期，请重新获取");
    }

    if (storedCode !== code) {
      throw new BusinessException(ErrorCode.AUTH_SMS_CODE_INVALID, "验证码错误");
    }

    // 验证成功后删除验证码，防止重复使用
    await this.redis.del(codeKey);

    return true;
  }

  /** 检查是否已发送验证码（用于前端倒计时） */
  async getSendStatus(phone: string): Promise<{ canResend: boolean; countdown: number }> {
    const rateKey = `sms:rate:${phone}`;
    const ttl = await this.redis.ttl(rateKey);
    return {
      canResend: ttl <= 0,
      countdown: ttl > 0 ? ttl : 0,
    };
  }

  /** 查询短信发送状态 */
  async querySendStatus(phone: string, serialNo: string): Promise<any> {
    return this.callApi("DescribeSendStatus", {
      PhoneNumberSet: [`+86${phone}`],
      SerialNo: serialNo,
    });
  }

  // ───────── 管理端 ─────────

  async getAdminLogs(page = 1, pageSize = 20, status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      this.prisma.smsLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.smsLog.count({ where }),
    ]);
    return { logs, total, page, pageSize };
  }

  async getAdminStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 86400000);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [total, todayCount, yesterdayCount, monthCount, todaySuccess, todayFail, totalSuccess] =
      await Promise.all([
        this.prisma.smsLog.count(),
        this.prisma.smsLog.count({ where: { createdAt: { gte: today } } }),
        this.prisma.smsLog.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
        this.prisma.smsLog.count({ where: { createdAt: { gte: thisMonth } } }),
        this.prisma.smsLog.count({ where: { createdAt: { gte: today }, status: "SUCCESS" } }),
        this.prisma.smsLog.count({ where: { createdAt: { gte: today }, status: "FAIL" } }),
        this.prisma.smsLog.count({ where: { status: "SUCCESS" } }),
      ]);

    return {
      total,
      today: { total: todayCount, success: todaySuccess, fail: todayFail },
      yesterday: yesterdayCount,
      thisMonth: monthCount,
      successRate: total > 0 ? ((totalSuccess / total) * 100).toFixed(1) : "0",
    };
  }
}
