import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { createHash, createHmac } from "crypto";
import { RedisService } from "../../redis/redis.service";
import { maskPhone } from "../../common/crypto.util";

interface TencentCloudResponse {
  Response?: {
    Error?: { Code: string; Message: string };
    [key: string]: unknown;
  };
}

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

  constructor(private redis: RedisService) {
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
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const payload = JSON.stringify(params);
    const service = "sms";

    const canonicalRequest = `POST\n/\n\ncontent-type:application/json; charset=utf-8\nhost:${this.host}\n\ncontent-type;host\n${createHash("sha256").update(payload).digest("hex")}`;
    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${date}/${service}/tc3_request\n${createHash("sha256").update(canonicalRequest).digest("hex")}`;

    const kDate = createHmac("sha256", `TC3${this.secretKey}`).update(date).digest();
    const kService = createHmac("sha256", kDate).update(service).digest();
    const kSigning = createHmac("sha256", kService).update("tc3_request").digest();
    const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    const authorization = `TC3-HMAC-SHA256 Credential=${this.secretId}/${date}/${service}/tc3_request, SignedHeaders=content-type;host, Signature=${signature}`;

    const resp = await fetch(`https://${this.host}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Host": this.host,
        "X-TC-Action": action,
        "X-TC-Version": this.apiVersion,
        "X-TC-Timestamp": String(timestamp),
        "Authorization": authorization,
      },
      body: payload,
    });

    const data = await resp.json() as TencentCloudResponse;
    if (data.Response?.Error) {
      this.logger.error(`SMS API错误 [${action}]`, data.Response.Error);
      throw new Error(`短信发送失败: ${data.Response.Error.Message}`);
    }
    return data.Response!;
  }

  /** 发送短信验证码 */
  async sendVerifyCode(phone: string, scene: string = "LOGIN"): Promise<{ ok: boolean; message: string }> {
    // 频率限制：60秒内只能发一次
    const rateKey = `sms:rate:${phone}`;
    const lastSent = await this.redis.get(rateKey);
    if (lastSent) {
      throw new BadRequestException("验证码已发送，请60秒后再试");
    }

    // 生成6位验证码
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // 场景描述映射
    const sceneMap: Record<string, string> = {
      LOGIN: "登录",
      REGISTER: "注册",
      RESET_PASSWORD: "找回密码",
      BIND_PHONE: "绑定手机号",
      VERIFY: "身份验证",
    };

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

      this.logger.log(`验证码已发送到 ${maskPhone(phone)}，场景: ${scene}`);
      return { ok: true, message: "验证码已发送" };
    } catch (err: unknown) {
      this.logger.error(`短信发送失败: ${maskPhone(phone)}`, (err as Error).message);
      return { ok: false, message: (err as Error).message };
    }
  }

  /** 验证短信验证码 */
  async verifyCode(phone: string, code: string, scene: string = "LOGIN"): Promise<boolean> {
    const codeKey = `sms:code:${scene}:${phone}`;
    const storedCode = await this.redis.get(codeKey);

    if (!storedCode) {
      throw new BadRequestException("验证码已过期，请重新获取");
    }

    if (storedCode !== code) {
      throw new BadRequestException("验证码错误");
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
}
