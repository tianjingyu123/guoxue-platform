import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { randomInt } from "crypto";
import { RedisService } from "../../redis/redis.service";
import { PrismaService } from "../../prisma/prisma.service";
import { maskPhone } from "../../common/crypto.util";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { tc3Sign, TencentCloudResponse } from "../../common/tc3.util";
import { MetricsService } from "../../common/metrics.service";
import { safePagination } from "../../common/pagination";

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
  /** 腾讯云短信必需 Region（与短信应用 SdkAppId 所在地域一致；默认广州） */
  private readonly region: string;

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
    this.region = process.env.SMS_REGION || process.env.COS_REGION || "ap-guangzhou";

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
      // 🔴 2026-07-14 生产实测修复：漏传 region → 腾讯云恒返回
      //    "The request is missing the required parameter `Region`" → 短信 100% 发不出去
      //    → 真实用户收不到验证码 → 注册/登录整条路断死（其余 tc3 调用方都传了，唯独短信漏了）
      region: this.region,
    });

    const start = Date.now();
    try {
      const resp = await fetch(`https://${host}`, {
        method: "POST",
        headers,
        body: payloadStr,
        signal: AbortSignal.timeout(10000), // 防腾讯短信无响应挂死请求线程
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

  /** 是否为开发模式（无腾讯云凭证时走本地验证码）。生产环境显式断言关闭，防误配组合导致验证码进日志 */
  private isDevMode(): boolean {
    if (process.env.NODE_ENV === "production") return false;
    return process.env.NODE_ENV === "development" && (!this.secretId || !this.secretKey || !this.appId);
  }

  /** 发送短信验证码 */
  async sendVerifyCode(phone: string, scene: string = "LOGIN"): Promise<{ ok: boolean; message: string }> {
    // 频率限制：60秒内只能发一次
    const rateKey = `sms:rate:${phone}`;
    const lastSent = await this.redis.get(rateKey);
    if (lastSent) {
      throw new BusinessException(ErrorCode.THIRD_SMS_FAILED, "验证码已发送，请60秒后再试");
    }

    // 同号每日发送上限（防短信轰炸与短信费消耗）
    const dailyKey = `sms:daily:${phone}`;
    const dailyCount = parseInt((await this.redis.get(dailyKey)) || "0", 10);
    if (dailyCount >= 10) {
      throw new BusinessException(ErrorCode.THIRD_SMS_FAILED, "今日验证码发送次数已达上限，请明日再试");
    }

    // 生成6位验证码（密码学安全随机数）
    const code = String(randomInt(100000, 1000000));

    // 存储验证码到 Redis（5分钟有效）
    const codeKey = `sms:code:${scene}:${phone}`;
    await this.redis.set(codeKey, code, 300);

    // 设置频率限制（60秒）
    await this.redis.set(rateKey, "1", 60);
    // 累加当日发送计数（TTL 到次日零点，跨天自动重置）
    const _now = new Date();
    const _secsToMidnight = Math.ceil((new Date(_now.getFullYear(), _now.getMonth(), _now.getDate() + 1).getTime() - _now.getTime()) / 1000);
    await this.redis.set(dailyKey, String(dailyCount + 1), _secsToMidnight);

    // 开发模式：跳过腾讯云 API，验证码直接打印到控制台
    if (this.isDevMode()) {
      this.logger.warn(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      this.logger.warn(`[DEV] 验证码: ${code} → 手机号: ${maskPhone(phone)} (场景: ${scene})`);
      this.logger.warn(`[DEV] 此验证码 5 分钟内有效，可在登录/注册页使用`);
      this.logger.warn(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      return { ok: true, message: "验证码已发送（开发模式，查看控制台获取验证码）" };
    }

    const templateParamSet = [code, "5"];
    const phoneNumberSet = [`+86${phone}`];

    try {
      await this.callApi("SendSms", {
        PhoneNumberSet: phoneNumberSet,
        SmsSdkAppId: this.appId,
        SignName: this.signName,
        TemplateId: this.templateId,
        TemplateParamSet: templateParamSet,
      });

      // 异步写日志
      this.prisma.smsLog.create({
        data: { phone: maskPhone(phone), scene, status: "SUCCESS" },
      }).catch((e) => this.logger.warn("SMS日志写入失败", e));

      this.logger.log(`验证码已发送到 ${maskPhone(phone)}，场景: ${scene}`);
      return { ok: true, message: "验证码已发送" };
    } catch (err: unknown) {
      // 生产模式 API 调用失败时清除 Redis 中的验证码
      await this.redis.del(codeKey);
      await this.redis.del(rateKey);

      const errorMsg = (err as Error).message;
      this.prisma.smsLog.create({
        data: { phone: maskPhone(phone), scene, status: "FAIL", errorMsg: errorMsg?.substring(0, 200) },
      }).catch((e) => this.logger.warn("SMS日志写入失败", e));

      this.logger.error(`短信发送失败: ${maskPhone(phone)}`, errorMsg);
      return { ok: false, message: errorMsg };
    }
  }

  /** 验证短信验证码（含爆破防护：5次失败后锁定30分钟） */
  async verifyCode(phone: string, code: string, scene: string = "LOGIN"): Promise<boolean> {
    const codeKey = `sms:code:${scene}:${phone}`;
    const failKey = `sms:fail:${scene}:${phone}`;

    // 检查是否已被锁定
    const failCount = parseInt(await this.redis.get(failKey) || "0", 10);
    if (failCount >= 5) {
      throw new BusinessException(ErrorCode.AUTH_SMS_CODE_INVALID, "验证码错误次数过多，请30分钟后再试");
    }

    const storedCode = await this.redis.get(codeKey);

    if (!storedCode) {
      throw new BusinessException(ErrorCode.AUTH_SMS_CODE_EXPIRED, "验证码已过期，请重新获取");
    }

    if (storedCode !== code) {
      // 验证失败：递增失败计数并消耗本次验证码
      await this.redis.set(failKey, String(failCount + 1), 1800); // 30分钟锁定
      await this.redis.del(codeKey); // 消耗验证码，防止继续爆破
      throw new BusinessException(ErrorCode.AUTH_SMS_CODE_INVALID, "验证码错误");
    }

    // 验证成功：清除验证码和失败计数
    await Promise.all([
      this.redis.del(codeKey),
      this.redis.del(failKey),
    ]);

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

  async getAdminLogs(rawPage = 1, rawPageSize = 20, status?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: any = {};
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      this.prisma.smsLog.findMany({
        where,
        skip,
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
