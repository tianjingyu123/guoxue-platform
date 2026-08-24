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
import {
  getTencentCredentialMode,
  getTencentInstanceRoleCredentialProvider,
} from "../../common/tencent-instance-role-credentials";

interface TencentSendStatus {
  Code?: string;
  Message?: string;
  PhoneNumber?: string;
  SerialNo?: string;
}

export interface RetentionSmsResult {
  ok: boolean;
  disposition: "SENT" | "MANUAL" | "SKIPPED" | "FAILED";
  message: string;
}

/**
 * 腾讯云短信 SMS 服务（纯原生API，不依赖SDK）
 * 验证码与业务短信共用底层签名调用，但模板、频控和业务方法严格隔离。
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly appId: string;
  private readonly signName: string;
  private readonly churnTemplateId: string;
  private readonly templateId: string;
  private readonly host = "sms.tencentcloudapi.com";
  private readonly apiVersion = "2021-01-11";
  /** 腾讯云短信必需 Region（与短信应用 SdkAppId 所在地域一致；默认广州） */
  private readonly region: string;

  /**
   * 第三方短信错误只用于服务端日志；用户端始终返回稳定中文提示。
   * 腾讯云的顶层 Error 与 SendStatusSet.Message 均可能是英文，禁止原样透传。
   */
  private toUserFacingSendFailure(code?: string, message?: string): string {
    const source = `${code || ""} ${message || ""}`.toLowerCase();

    if (
      /phonenumberdailylimit|daily.?limit|day.?limit|exceed.*daily|daily.*exceed|发送.*上限/.test(
        source,
      )
    ) {
      return "今日验证码发送次数已达上限，请明日再试；您也可以使用密码登录";
    }
    if (
      /frequency|frequent|ratelimit|rate.?limit|limitexceeded.*phone|too many|频繁|60秒/.test(
        source,
      )
    ) {
      return "验证码请求过于频繁，请稍后再试；您也可以使用密码登录";
    }
    if (/insufficient|balance|arrears|欠费|余额/.test(source)) {
      return "短信服务暂不可用，请使用密码登录或稍后再试";
    }
    if (/template|sign(name)?|unapproved|incorrectorunapproved|模板|签名/.test(source)) {
      return "短信服务配置异常，请使用密码登录或稍后再试";
    }

    // 项目自身抛出的纯中文业务提示可以保留；中英混合或第三方未知错误统一降级。
    if (message && /[\u4e00-\u9fff]/.test(message) && !/[A-Za-z]{4,}/.test(message)) {
      return message;
    }
    return "短信发送失败，请稍后重试或使用密码登录";
  }

  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
    @Optional() @Inject(MetricsService) private metrics?: MetricsService,
  ) {
    this.appId = process.env.SMS_APP_ID || "";
    this.signName = process.env.SMS_SIGN_NAME || "国学平台";
    this.churnTemplateId = process.env.SMS_CHURN_TEMPLATE_ID || "";
    this.templateId = process.env.SMS_TEMPLATE_ID || "";
    this.region = process.env.SMS_REGION || process.env.COS_REGION || "ap-guangzhou";

    if (!this.hasCredentialConfiguration()) {
      this.logger.warn("腾讯云密钥未配置，短信服务将不可用");
    }
  }

  private hasCredentialConfiguration(): boolean {
    if (getTencentCredentialMode() === "instance-role") {
      return Boolean(process.env.TENCENT_CVM_ROLE_NAME?.trim());
    }
    return Boolean(
      (process.env.TENCENT_SECRET_ID || process.env.COS_SECRET_ID) &&
      (process.env.TENCENT_SECRET_KEY || process.env.COS_SECRET_KEY),
    );
  }

  private async resolveCredentials(): Promise<{
    secretId: string;
    secretKey: string;
    securityToken?: string;
  }> {
    if (getTencentCredentialMode() === "instance-role") {
      const credentials = await getTencentInstanceRoleCredentialProvider().getCredentials();
      return {
        secretId: credentials.TmpSecretId,
        secretKey: credentials.TmpSecretKey,
        securityToken: credentials.SecurityToken,
      };
    }

    const secretId = process.env.TENCENT_SECRET_ID || process.env.COS_SECRET_ID || "";
    const secretKey = process.env.TENCENT_SECRET_KEY || process.env.COS_SECRET_KEY || "";
    if (!secretId || !secretKey) {
      throw new BusinessException(ErrorCode.THIRD_SMS_FAILED, "腾讯云短信凭据未配置");
    }
    return { secretId, secretKey };
  }

  /** TC3-HMAC-SHA256 签名调用 */
  private async callApi(action: string, params: Record<string, unknown>) {
    const credentials = await this.resolveCredentials();
    const { host, headers, payloadStr } = tc3Sign({
      secretId: credentials.secretId,
      secretKey: credentials.secretKey,
      securityToken: credentials.securityToken,
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
      const data = (await resp.json()) as TencentCloudResponse;

      if (data.Response?.Error) {
        const reason = (data.Response.Error.Code || "unknown") as string;
        this.metrics?.recordExternalApi("sms", action, false, duration, reason);
        this.logger.error(`SMS API错误 [${action}]`, data.Response.Error);
        throw new BusinessException(
          ErrorCode.THIRD_SMS_FAILED,
          this.toUserFacingSendFailure(reason, data.Response.Error.Message),
        );
      }

      const response = data.Response!;
      if (action === "SendSms") {
        const statuses = (response as typeof response & { SendStatusSet?: TencentSendStatus[] })
          .SendStatusSet;
        const rejected =
          !Array.isArray(statuses) || statuses.length === 0
            ? { Code: "EMPTY_STATUS", Message: "短信服务未返回号码受理结果" }
            : statuses.find((status) => String(status.Code).toLowerCase() !== "ok");
        if (rejected) {
          const reason = rejected.Code || "recipient_rejected";
          this.metrics?.recordExternalApi("sms", action, false, duration, reason);
          this.logger.error(
            `SMS 号码未受理 [${reason}] ${rejected.PhoneNumber ?? ""}: ${rejected.Message ?? "未知原因"}`,
          );
          throw new BusinessException(
            ErrorCode.THIRD_SMS_FAILED,
            this.toUserFacingSendFailure(reason, rejected.Message),
          );
        }
      }

      this.metrics?.recordExternalApi("sms", action, true, duration);
      return response;
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
    return (
      process.env.NODE_ENV === "development" && (!this.hasCredentialConfiguration() || !this.appId)
    );
  }

  /** 发送短信验证码 */
  async sendVerifyCode(
    phone: string,
    scene: string = "LOGIN",
  ): Promise<{ ok: boolean; message: string }> {
    // 🔴 scene 归一化为大写：H5 发码传小写(login/register/reset)，而校验侧硬编码大写(LOGIN/RESET)，
    // 大小写不一致导致 Redis key(sms:code:{scene}:{phone}) 存读错位 → 码永远读不到 → "刚发就过期"
    // （2026-07-18 生产短信接通后首次真正走验证码登录时暴露）。
    scene = scene.toUpperCase();
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
      throw new BusinessException(
        ErrorCode.THIRD_SMS_FAILED,
        "今日验证码发送次数已达上限，请明日再试",
      );
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
    const _secsToMidnight = Math.ceil(
      (new Date(_now.getFullYear(), _now.getMonth(), _now.getDate() + 1).getTime() -
        _now.getTime()) /
        1000,
    );
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
      this.prisma.smsLog
        .create({
          data: { phone: maskPhone(phone), scene, status: "SUCCESS" },
        })
        .catch((e) => this.logger.warn("SMS日志写入失败", e));

      this.logger.log(`验证码已发送到 ${maskPhone(phone)}，场景: ${scene}`);
      return { ok: true, message: "验证码已发送" };
    } catch (err: unknown) {
      // 生产模式 API 调用失败时清除 Redis 中的验证码
      await this.redis.del(codeKey);
      await this.redis.del(rateKey);

      const rawErrorMsg = (err as Error).message;
      const errorMsg = this.toUserFacingSendFailure(undefined, rawErrorMsg);
      this.prisma.smsLog
        .create({
          data: {
            phone: maskPhone(phone),
            scene,
            status: "FAIL",
            errorMsg: errorMsg?.substring(0, 200),
          },
        })
        .catch((e) => this.logger.warn("SMS日志写入失败", e));

      this.logger.error(`短信发送失败: ${maskPhone(phone)}`, errorMsg);
      return { ok: false, message: errorMsg };
    }
  }

  /**
   * 发送流失召回短信。与验证码彻底隔离：不生成/存储验证码，只使用经审核的专用模板。
   * 未配置模板时返回 MANUAL，由流失动作转入人工待办，绝不借用验证码模板伪装成功。
   */
  async sendRetentionMessage(
    phone: string,
    templateParams: string[] = [],
    cooldownDays = 7,
  ): Promise<RetentionSmsResult> {
    if (
      !this.hasCredentialConfiguration() ||
      !this.appId ||
      !process.env.SMS_SIGN_NAME?.trim() ||
      !this.churnTemplateId
    ) {
      return {
        ok: false,
        disposition: "MANUAL",
        message: "召回短信专用模板未配置或短信基础配置不完整，待人工处理",
      };
    }
    if (!/^1\d{10}$/.test(phone)) {
      return { ok: false, disposition: "FAILED", message: "目标用户手机号格式无效" };
    }
    if (
      templateParams.length > 6 ||
      templateParams.some((value) => typeof value !== "string" || value.length > 32)
    ) {
      return { ok: false, disposition: "FAILED", message: "召回短信模板参数不合法" };
    }

    const safeCooldownDays = Math.min(90, Math.max(1, Math.trunc(cooldownDays) || 7));
    const cooldownKey = `sms:retention:cooldown:${phone}`;
    if (await this.redis.get(cooldownKey)) {
      return {
        ok: false,
        disposition: "SKIPPED",
        message: `用户仍在 ${safeCooldownDays} 天短信冷却期内，本次未重复发送`,
      };
    }

    try {
      await this.callApi("SendSms", {
        PhoneNumberSet: [`+86${phone}`],
        SmsSdkAppId: this.appId,
        SignName: this.signName,
        TemplateId: this.churnTemplateId,
        TemplateParamSet: templateParams,
      });
      await this.redis.set(cooldownKey, "1", safeCooldownDays * 86400);
      this.prisma.smsLog
        .create({
          data: { phone: maskPhone(phone), scene: "CHURN_RETENTION", status: "SUCCESS" },
        })
        .catch((err) => this.logger.warn("SMS日志写入失败", err));
      this.logger.log(`召回短信已发送到 ${maskPhone(phone)}`);
      return { ok: true, disposition: "SENT", message: "召回短信已发送" };
    } catch (err) {
      const message = (err as Error).message || "召回短信发送失败";
      this.prisma.smsLog
        .create({
          data: {
            phone: maskPhone(phone),
            scene: "CHURN_RETENTION",
            status: "FAIL",
            errorMsg: message.substring(0, 200),
          },
        })
        .catch((logErr) => this.logger.warn("SMS日志写入失败", logErr));
      this.logger.error(`召回短信发送失败: ${maskPhone(phone)}`, message);
      return { ok: false, disposition: "FAILED", message };
    }
  }

  /** 验证短信验证码（含爆破防护：5次失败后锁定30分钟） */
  async verifyCode(phone: string, code: string, scene: string = "LOGIN"): Promise<boolean> {
    scene = scene.toUpperCase(); // 与 sendVerifyCode 一致归一化，杜绝发码/校验大小写错位
    const codeKey = `sms:code:${scene}:${phone}`;
    const failKey = `sms:fail:${scene}:${phone}`;

    // 检查是否已被锁定
    const failCount = parseInt((await this.redis.get(failKey)) || "0", 10);
    if (failCount >= 5) {
      throw new BusinessException(
        ErrorCode.AUTH_SMS_CODE_INVALID,
        "验证码错误次数过多，请30分钟后再试",
      );
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
    await Promise.all([this.redis.del(codeKey), this.redis.del(failKey)]);

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
    // 出口兜底脱敏：新日志写入时已 maskPhone，但历史记录可能存过明文；
    // maskPhone 幂等（已脱敏的串再过一遍结果不变），管理端一律不吐完整手机号。
    return { logs: logs.map((l) => ({ ...l, phone: maskPhone(l.phone) })), total, page, pageSize };
  }

  /**
   * 短信配置状态（管理端只读·运营页判断"短信是否已配置可用"）。
   * 🔴 绝不返回密钥明文——密钥类字段只返回是否已配置的布尔值。
   * 现读 process.env：启动时与后台第三方配置保存后 ThirdPartyConfigLoader.syncToEnv 都会写回 env，
   * 此处实时读取即反映最新配置（不用构造器缓存的旧值）。
   * 实例角色模式会在每次调用前获取并缓存临时凭据；静态模式实时读取 env，避免配置状态与发送路径不一致。
   */
  async getConfigStatus() {
    const credentialMode = getTencentCredentialMode();
    const credentialConfigured = this.hasCredentialConfiguration();
    const appId = process.env.SMS_APP_ID || "";
    const signName = process.env.SMS_SIGN_NAME || "";
    const templateId = process.env.SMS_TEMPLATE_ID || "";
    const region = process.env.SMS_REGION || process.env.COS_REGION || "ap-guangzhou";

    const [lastSuccess, lastSend] = await Promise.all([
      this.prisma.smsLog.findFirst({
        where: { status: "SUCCESS" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      this.prisma.smsLog.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, status: true },
      }),
    ]);

    const churnTemplateId = process.env.SMS_CHURN_TEMPLATE_ID || "";
    const verificationItems = {
      secretId: credentialConfigured,
      secretKey: credentialConfigured,
      sdkAppId: !!appId,
      signName: !!signName,
      templateId: !!templateId,
    };
    const ready = Object.values(verificationItems).every(Boolean);
    const retentionReady = credentialConfigured && !!appId && !!signName && !!churnTemplateId;

    return {
      ready,
      retentionReady,
      credentialMode,
      devMode: this.isDevMode(),
      items: { ...verificationItems, churnTemplateId: !!churnTemplateId },
      signName: signName || null, // 签名内容非密钥·运营可读
      region,
      lastSuccessAt: lastSuccess?.createdAt ?? null,
      lastSendAt: lastSend?.createdAt ?? null,
      lastSendStatus: lastSend?.status ?? null,
    };
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
