/**
 * 第三方服务密钥配置契约 — 单一定义，驱动：
 * 1. 后端 ThirdPartyConfigLoader：把后台配置写回 process.env（env 可为数组，兼容代码里的多套命名）
 * 2. 前端 ThirdPartyConfig 配置页：按此动态渲染表单（无需硬编码）
 * 3. 密钥清单文档：契约即清单
 *
 * 字段 env 取自代码实际读取的变量名（grep process.env 校准）。多套命名用数组，loader 全部写入。
 * sensitive=true 的字段：加密存储 + 前端掩码显示。
 */

export interface ConfigField {
  key: string; // 配置字段标识（前端表单字段 + DB JSON key）
  label: string;
  env: string | string[]; // 对应 env 变量名（数组=兼容代码多套命名，全部写入）
  sensitive?: boolean; // 敏感字段：加密 + 掩码
  placeholder?: string;
}

export interface ThirdPartyService {
  key: string; // 服务标识，DB 存为 third_party.{key}
  label: string;
  category: string; // 分类
  enabled?: boolean; // 功能是否已实现（false=待开发，前端置灰）
  fields: ConfigField[];
}

const S = (key: string, label: string, env: string | string[], sensitive = false, placeholder = ""): ConfigField =>
  ({ key, label, env, sensitive, placeholder });

export const THIRD_PARTY_SERVICES: ThirdPartyService[] = [
  // ───────── 支付 ─────────
  {
    key: "wechat_pay", label: "微信支付", category: "支付",
    fields: [
      S("mchId", "商户号", "WECHAT_PAY_MCH_ID"),
      S("apiV3Key", "APIv3 密钥", "WECHAT_PAY_API_V3_KEY", true),
      S("serialNo", "证书序列号", "WECHAT_PAY_SERIAL_NO"),
      S("privateKeyPath", "商户私钥路径", "WECHAT_PAY_PRIVATE_KEY_PATH", true),
      S("notifyUrl", "支付回调地址", "WECHAT_PAY_NOTIFY_URL"),
      S("refundNotifyUrl", "退款回调地址", "WECHAT_PAY_REFUND_NOTIFY_URL"),
    ],
  },
  {
    key: "alipay", label: "支付宝", category: "支付",
    fields: [
      S("appId", "应用 AppID", "ALIPAY_APP_ID"),
      S("privateKey", "应用私钥", "ALIPAY_PRIVATE_KEY", true),
      S("publicKey", "支付宝公钥", "ALIPAY_PUBLIC_KEY", true),
      S("notifyUrl", "异步通知地址", "ALIPAY_NOTIFY_URL"),
    ],
  },
  {
    key: "huifu", label: "汇付天下", category: "支付",
    fields: [
      S("merchantId", "商户号", "HUIFU_MERCHANT_ID"),
      S("appId", "应用号", "HUIFU_APP_ID"),
      S("secretKey", "密钥", "HUIFU_SECRET_KEY", true),
      S("rsaPrivateKey", "RSA 私钥", "HUIFU_RSA_PRIVATE_KEY", true),
      S("rsaPublicKey", "RSA 公钥", "HUIFU_RSA_PUBLIC_KEY", true),
      S("notifyUrl", "回调地址", "HUIFU_NOTIFY_URL"),
    ],
  },
  {
    key: "unionpay", label: "银联支付", category: "支付",
    fields: [
      S("merId", "商户号", "UNIONPAY_MER_ID"),
      S("pfxPath", "证书路径(.pfx)", "UNIONPAY_PFX_PATH", true),
      S("pfxPassword", "证书密码", "UNIONPAY_PFX_PASSWORD", true),
      S("notifyUrl", "后台通知地址", "UNIONPAY_NOTIFY_URL"),
    ],
  },
  // ───────── 腾讯云全家桶 ─────────
  {
    key: "tencent_cloud", label: "腾讯云（通用）", category: "腾讯云",
    fields: [
      S("secretId", "SecretId", "TENCENT_SECRET_ID"),
      S("secretKey", "SecretKey", "TENCENT_SECRET_KEY", true),
      S("appId", "AppId", "TENCENT_APP_ID"),
      S("callbackKey", "回调验签密钥", "TENCENT_CALLBACK_KEY", true),
    ],
  },
  {
    key: "tencent_sms", label: "腾讯云短信", category: "腾讯云",
    fields: [
      S("sdkAppId", "短信 SdkAppId", "SMS_APP_ID"),
      S("signName", "签名", "SMS_SIGN_NAME"),
      S("templateId", "模板 ID", "SMS_TEMPLATE_ID"),
    ],
  },
  {
    key: "tencent_im", label: "腾讯云 IM", category: "腾讯云",
    fields: [
      S("sdkAppId", "IM SdkAppId", "IM_APP_ID"),
      S("adminKey", "管理员密钥", "IM_ADMIN_KEY", true),
      S("adminId", "管理员账号", "IM_ADMIN_ID"),
    ],
  },
  {
    key: "tencent_live", label: "腾讯云直播", category: "腾讯云",
    fields: [
      S("pushDomain", "推流域名", "LIVE_PUSH_DOMAIN"),
      S("playDomain", "播放域名", "LIVE_PLAY_DOMAIN"),
      S("pushKey", "推流鉴权 Key", "LIVE_PUSH_KEY", true),
      S("playKey", "播放鉴权 Key", "LIVE_PLAY_KEY", true),
      S("appName", "AppName", "LIVE_APP_NAME"),
    ],
  },
  {
    key: "tencent_trtc", label: "腾讯云 TRTC（连麦）", category: "腾讯云",
    fields: [
      S("sdkAppId", "TRTC SdkAppId", "TRTC_SDK_APP_ID"),
      S("secretKey", "密钥", "TRTC_SECRET_KEY", true),
    ],
  },
  {
    key: "tencent_vod", label: "腾讯云点播 VOD", category: "腾讯云",
    fields: [S("subAppId", "子应用 ID", "VOD_SUB_APP_ID")],
  },
  {
    key: "tencent_cos", label: "腾讯云 COS 存储", category: "腾讯云",
    fields: [
      S("secretId", "SecretId", "COS_SECRET_ID"),
      S("secretKey", "SecretKey", "COS_SECRET_KEY", true),
      S("bucket", "存储桶", "COS_BUCKET"),
      S("region", "地域", "COS_REGION"),
      S("cdnBase", "CDN 域名", ["COS_CDN_BASE", "CDN_DOMAIN", "COS_DOMAIN"]),
    ],
  },
  {
    key: "tencent_map", label: "腾讯地图", category: "腾讯云",
    fields: [
      S("key", "开发密钥 Key", "TENCENT_MAP_KEY"),
      S("sk", "签名 SK", "TENCENT_MAP_SK", true),
    ],
  },
  // ───────── 微信 ─────────
  {
    key: "wechat_mini", label: "微信小程序", category: "微信",
    fields: [
      // 代码里有 3 套命名，全部写入兼容
      S("appId", "小程序 AppID", ["WECHAT_MINI_APP_ID", "MINIPROGRAM_APP_ID", "WECHAT_MP_APP_ID"]),
      S("appSecret", "小程序 AppSecret", "MINIPROGRAM_APP_SECRET", true),
    ],
  },
  {
    key: "wechat_open", label: "微信开放平台（登录/分享）", category: "微信",
    fields: [
      S("appId", "AppID", "WECHAT_APP_ID"),
      S("appSecret", "AppSecret", "WECHAT_APP_SECRET", true),
    ],
  },
  // ───────── AI ─────────
  {
    key: "deepseek", label: "DeepSeek（AI 推理/审核复审）", category: "AI",
    fields: [
      S("apiKey", "API Key", "DEEPSEEK_API_KEY", true),
      S("baseUrl", "Base URL", "DEEPSEEK_BASE_URL", false, "https://api.deepseek.com"),
    ],
  },
  {
    key: "coze", label: "Coze（智能体）", category: "AI",
    fields: [
      S("apiKey", "API Token", "COZE_API_KEY", true),
      S("botIds", "Bot IDs（逗号分隔）", "COZE_BOT_IDS"),
    ],
  },
  // ───────── 其他 ─────────
  {
    key: "kuaidi100", label: "快递100（物流）", category: "物流",
    fields: [
      S("apiKey", "授权 Key", "KUAIDI100_API_KEY", true),
      S("customer", "Customer", "KUAIDI100_CUSTOMER"),
    ],
  },
  {
    key: "email_smtp", label: "邮件（SMTP）", category: "通知",
    fields: [
      S("host", "SMTP 服务器", "SMTP_HOST"),
      S("port", "端口", "SMTP_PORT", false, "587"),
      S("user", "账号", "SMTP_USER"),
      S("pass", "密码/授权码", "SMTP_PASS", true),
      S("from", "发件人", "EMAIL_FROM"),
    ],
  },
  {
    key: "cron", label: "定时任务验签", category: "系统",
    fields: [S("webhookSecret", "Cron Webhook Secret", "CRON_WEBHOOK_SECRET", true)],
  },
];

/** 服务 key → 字段 env 映射（loader 用）。展开数组。 */
export function getEnvMappings(): Array<{ serviceKey: string; fieldKey: string; envNames: string[]; sensitive: boolean }> {
  const out: Array<{ serviceKey: string; fieldKey: string; envNames: string[]; sensitive: boolean }> = [];
  for (const svc of THIRD_PARTY_SERVICES) {
    for (const f of svc.fields) {
      out.push({
        serviceKey: svc.key,
        fieldKey: f.key,
        envNames: Array.isArray(f.env) ? f.env : [f.env],
        sensitive: !!f.sensitive,
      });
    }
  }
  return out;
}
