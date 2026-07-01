/**
 * 第三方服务密钥配置契约 — 单一定义，驱动：
 * 1. 后端 ThirdPartyConfigLoader：把后台配置写回 process.env（env 可为数组，兼容代码里的多套命名）
 * 2. 前端 ThirdPartyConfig 配置页：按此动态渲染表单（无需硬编码）
 * 3. 密钥清单文档：契约即清单
 *
 * 字段 env 取自代码实际读取的变量名（grep process.env 校准）。多套命名用数组，loader 全部写入。
 * sensitive=true 的字段：加密存储 + 前端掩码显示。
 * hint：「去哪找」指引，前端显示在字段下方，帮助非技术管理员填写。
 */

export interface ConfigField {
  key: string; // 配置字段标识（前端表单字段 + DB JSON key）
  label: string;
  env: string | string[]; // 对应 env 变量名（数组=兼容代码多套命名，全部写入）
  sensitive?: boolean; // 敏感字段：加密 + 掩码
  placeholder?: string;
  hint?: string; // 「去哪找/怎么填」说明，前端显示在字段下方
}

export interface ThirdPartyService {
  key: string; // 服务标识，DB 存为 third_party.{key}
  label: string;
  category: string; // 分类
  enabled?: boolean; // 功能是否已实现（false=待开发，前端置灰）
  note?: string; // 服务级说明，前端显示在卡片顶部
  fields: ConfigField[];
}

const S = (
  key: string,
  label: string,
  env: string | string[],
  sensitive = false,
  hint = "",
  placeholder = "",
): ConfigField => ({ key, label, env, sensitive, hint, placeholder });

export const THIRD_PARTY_SERVICES: ThirdPartyService[] = [
  // ───────── 支付 ─────────
  {
    key: "wechat_pay", label: "微信支付", category: "支付",
    note: "在微信支付商户平台 pay.weixin.qq.com 申请。注意：这是「商户号」体系，和小程序的 AppID 是两回事。",
    fields: [
      S("mchId", "商户号", "WECHAT_PAY_MCH_ID", false, "商户平台→账户中心→商户信息→商户号（10位数字）"),
      S("apiV3Key", "APIv3 密钥", "WECHAT_PAY_API_V3_KEY", true, "商户平台→账户中心→API安全→APIv3密钥（自己设一个32位字符串并牢记）"),
      S("serialNo", "证书序列号", "WECHAT_PAY_SERIAL_NO", false, "商户平台→账户中心→API安全→申请API证书后，证书详情里的序列号"),
      S("privateKey", "商户私钥内容", "WECHAT_PAY_PRIVATE_KEY", true, "用记事本打开申请证书时下载的 apiclient_key.pem 文件，把全部内容（含 -----BEGIN PRIVATE KEY----- 到 -----END PRIVATE KEY----- 所有行）复制粘贴进来"),
      S("notifyUrl", "支付回调地址", "WECHAT_PAY_NOTIFY_URL", false, "填 https://api.rebugx.cn/api/v1/pay/wechat/notify"),
      S("refundNotifyUrl", "退款回调地址", "WECHAT_PAY_REFUND_NOTIFY_URL", false, "填 https://api.rebugx.cn/api/v1/pay/wechat/refund-notify"),
    ],
  },
  {
    key: "alipay", label: "支付宝", category: "支付",
    note: "在支付宝开放平台 open.alipay.com 创建应用。密钥用官方「支付宝密钥工具」生成。",
    fields: [
      S("appId", "应用 AppID", "ALIPAY_APP_ID", false, "开放平台→控制台→我的应用→APPID（16位数字）"),
      S("privateKey", "应用私钥", "ALIPAY_PRIVATE_KEY", true, "用支付宝「密钥工具」生成的『应用私钥』（一长串，不是公钥）"),
      S("publicKey", "支付宝公钥", "ALIPAY_PUBLIC_KEY", true, "开放平台→应用→接口加签方式→『支付宝公钥』（平台给你的，不是你自己的公钥）"),
      S("notifyUrl", "异步通知地址", "ALIPAY_NOTIFY_URL", false, "填 https://api.rebugx.cn/api/v1/pay/alipay/notify"),
    ],
  },
  {
    key: "huifu", label: "汇付天下", category: "支付",
    note: "汇付天下（斗拱）分账支付。签约后在汇付商户后台获取，密钥找汇付对接人。",
    fields: [
      S("merchantId", "商户号", "HUIFU_MERCHANT_ID", false, "汇付分配的商户号（huifuId）"),
      S("appId", "应用号", "HUIFU_APP_ID", false, "汇付分配的应用号（sysId/appId）"),
      S("secretKey", "密钥", "HUIFU_SECRET_KEY", true, "汇付分配的密钥"),
      S("rsaPrivateKey", "RSA 私钥", "HUIFU_RSA_PRIVATE_KEY", true, "你方生成并在汇付后台登记公钥后，对应的RSA私钥"),
      S("rsaPublicKey", "RSA 公钥", "HUIFU_RSA_PUBLIC_KEY", true, "汇付的RSA公钥（用于验签）"),
      S("notifyUrl", "回调地址", "HUIFU_NOTIFY_URL", false, "填 https://api.rebugx.cn/api/v1/pay/huifu/notify"),
    ],
  },
  {
    key: "unionpay", label: "银联支付", category: "支付",
    note: "银联全渠道支付。证书在银联商户服务网站申请。",
    fields: [
      S("merId", "商户号", "UNIONPAY_MER_ID", false, "银联分配的商户号（15位）"),
      S("pfxPath", "证书路径(.pfx)", "UNIONPAY_PFX_PATH", true, "银联签名证书 .pfx 文件（需放服务器，路径找技术）"),
      S("pfxPassword", "证书密码", "UNIONPAY_PFX_PASSWORD", true, "申请 .pfx 证书时设置的密码"),
      S("notifyUrl", "后台通知地址", "UNIONPAY_NOTIFY_URL", false, "填 https://api.rebugx.cn/api/v1/pay/unionpay/notify"),
    ],
  },
  // ───────── 腾讯云全家桶 ─────────
  {
    key: "tencent_cloud", label: "腾讯云（通用）", category: "腾讯云",
    note: "★这是所有腾讯云服务共用的『账号级API密钥』。登录腾讯云控制台→右上角头像→访问管理(CAM)→API密钥管理→新建密钥。短信/COS等下面各服务的 SecretId/SecretKey 都用这同一对。",
    fields: [
      S("secretId", "SecretId", "TENCENT_SECRET_ID", false, "访问管理CAM→API密钥管理，AKID 开头的那串"),
      S("secretKey", "SecretKey", "TENCENT_SECRET_KEY", true, "与 SecretId 成对（仅新建时可完整查看，请务必保存）"),
      S("appId", "AppId", "TENCENT_APP_ID", false, "控制台→账号信息→APPID（10位数字，如 1300000000）"),
      S("callbackKey", "回调验签密钥", "TENCENT_CALLBACK_KEY", true, "自定义一串随机字符串，用于校验腾讯云回调；不用回调可留空"),
    ],
  },
  {
    key: "tencent_sms", label: "腾讯云短信", category: "腾讯云",
    note: "用于注册/登录验证码。★优先配这个。签名和模板都需在短信控制台提交审核、通过后才能用。",
    fields: [
      S("sdkAppId", "短信 SdkAppId", "SMS_APP_ID", false, "短信控制台→应用管理→应用列表→SDKAppID（纯数字）"),
      S("signName", "签名内容", "SMS_SIGN_NAME", false, "短信控制台→国内短信→签名管理，填『审核通过』的签名内容（如：某某国学）"),
      S("templateId", "模板 ID", "SMS_TEMPLATE_ID", false, "短信控制台→正文模板管理，填『审核通过』的模板ID（纯数字）"),
    ],
  },
  {
    key: "tencent_im", label: "腾讯云 IM（私信）", category: "腾讯云", enabled: false,
    note: "即时通讯IM。控制台：即时通信IM→应用列表。（私信功能尚在对接，可暂缓配置）",
    fields: [
      S("sdkAppId", "IM SdkAppId", "IM_APP_ID", false, "IM控制台→应用列表→SDKAppID"),
      S("adminKey", "管理员密钥", "IM_ADMIN_KEY", true, "IM控制台→应用→基本配置→密钥（SecretKey）"),
      S("adminId", "管理员账号", "IM_ADMIN_ID", false, "IM管理员账号，一般填 administrator"),
    ],
  },
  {
    key: "tencent_live", label: "腾讯云直播", category: "腾讯云", enabled: false,
    note: "云直播。控制台：云直播→域名管理（需先备案域名）。（直播功能尚在对接，可暂缓）",
    fields: [
      S("pushDomain", "推流域名", "LIVE_PUSH_DOMAIN", false, "直播控制台→域名管理→类型为『推流』的域名"),
      S("playDomain", "播放域名", "LIVE_PLAY_DOMAIN", false, "直播控制台→域名管理→类型为『播放』的域名"),
      S("pushKey", "推流鉴权 Key", "LIVE_PUSH_KEY", true, "推流域名→推流配置→鉴权配置里的Key"),
      S("playKey", "播放鉴权 Key", "LIVE_PLAY_KEY", true, "播放域名→访问控制→鉴权配置里的Key"),
      S("appName", "AppName", "LIVE_APP_NAME", false, "推流地址里的 AppName，默认填 live"),
    ],
  },
  {
    key: "tencent_trtc", label: "腾讯云 TRTC（连麦）", category: "腾讯云", enabled: false,
    note: "实时音视频TRTC（连麦/通话）。控制台：实时音视频→应用管理。（连麦功能尚在对接，可暂缓）",
    fields: [
      S("sdkAppId", "TRTC SdkAppId", "TRTC_SDK_APP_ID", false, "TRTC控制台→应用管理→SDKAppID"),
      S("secretKey", "密钥", "TRTC_SECRET_KEY", true, "TRTC控制台→应用→应用信息→SDKSecretKey"),
    ],
  },
  {
    key: "tencent_vod", label: "腾讯云点播 VOD", category: "腾讯云", enabled: false,
    note: "视频点播VOD（长视频存储/转码）。控制台：云点播→应用管理。（短视频功能尚在对接，可暂缓）",
    fields: [S("subAppId", "子应用 ID", "VOD_SUB_APP_ID", false, "云点播控制台→应用管理→子应用→应用ID")],
  },
  {
    key: "tencent_cos", label: "腾讯云 COS 存储", category: "腾讯云",
    note: "对象存储COS，用于图片/文件上传。★要用户上传头像/图片就配这个。SecretId/SecretKey 用上面『腾讯云(通用)』同一对。",
    fields: [
      S("secretId", "SecretId", "COS_SECRET_ID", false, "同『腾讯云(通用)』的 SecretId（CAM→API密钥管理）"),
      S("secretKey", "SecretKey", "COS_SECRET_KEY", true, "同『腾讯云(通用)』的 SecretKey"),
      S("bucket", "存储桶", "COS_BUCKET", false, "COS控制台→存储桶列表→桶名称（形如 guoxue-1300000000）"),
      S("region", "地域", "COS_REGION", false, "存储桶所属地域，如 ap-guangzhou / ap-shanghai / ap-beijing"),
      S("cdnBase", "CDN 域名", ["COS_CDN_BASE", "CDN_DOMAIN", "COS_DOMAIN"], false, "存储桶的默认访问域名或CDN加速域名；不确定可留空"),
    ],
  },
  {
    key: "tencent_map", label: "腾讯地图", category: "腾讯云", enabled: false,
    note: "腾讯位置服务，用于定位/选点。控制台：lbs.qq.com。（地图功能可暂缓）",
    fields: [
      S("key", "开发密钥 Key", "TENCENT_MAP_KEY", false, "腾讯位置服务控制台→应用管理→我的应用→Key"),
      S("sk", "签名 SK", "TENCENT_MAP_SK", true, "创建Key时若开启了『签名校验』，填对应SK；否则留空"),
    ],
  },
  // ───────── 微信 ─────────
  {
    key: "wechat_mini", label: "微信小程序", category: "微信",
    note: "★注意：这才是你说的 AppID+AppSecret！在微信公众平台 mp.weixin.qq.com（小程序后台）获取，和腾讯云无关。",
    fields: [
      S("appId", "小程序 AppID", ["WECHAT_MINI_APP_ID", "MINIPROGRAM_APP_ID", "WECHAT_MP_APP_ID"], false, "微信公众平台(小程序)→开发管理→开发设置→AppID(小程序ID)"),
      S("appSecret", "小程序 AppSecret", "MINIPROGRAM_APP_SECRET", true, "微信公众平台→开发设置→AppSecret（需管理员点『生成/重置』，只显示一次）"),
    ],
  },
  {
    key: "wechat_open", label: "微信开放平台（登录/分享）", category: "微信", enabled: false,
    note: "网站/APP的微信登录，在开放平台 open.weixin.qq.com 创建。（H5微信登录用到再配）",
    fields: [
      S("appId", "AppID", "WECHAT_APP_ID", false, "微信开放平台→管理中心→网站/移动应用→应用详情→AppID"),
      S("appSecret", "AppSecret", "WECHAT_APP_SECRET", true, "微信开放平台→应用详情→AppSecret"),
    ],
  },
  // ───────── AI ─────────
  {
    key: "deepseek", label: "DeepSeek（AI 推理/审核复审）", category: "AI",
    note: "AI推理与内容审核复审。★已配置并在运行。platform.deepseek.com 获取。",
    fields: [
      S("apiKey", "API Key", "DEEPSEEK_API_KEY", true, "DeepSeek开放平台 platform.deepseek.com→API keys→创建"),
      S("baseUrl", "Base URL", "DEEPSEEK_BASE_URL", false, "默认 https://api.deepseek.com，一般不用改", "https://api.deepseek.com"),
    ],
  },
  {
    key: "coze", label: "Coze（智能体）", category: "AI",
    note: "Coze智能体广场。coze.cn 获取访问令牌。",
    fields: [
      S("apiKey", "API Token", "COZE_API_KEY", true, "Coze平台 coze.cn→个人头像→设置→API授权→个人访问令牌"),
      S("botIds", "Bot IDs（逗号分隔）", "COZE_BOT_IDS", false, "已发布的Bot ID，多个用英文逗号分隔"),
    ],
  },
  // ───────── 其他 ─────────
  {
    key: "kuaidi100", label: "快递100（物流）", category: "物流",
    note: "物流轨迹查询。api.kuaidi100.com 注册获取。（有商城发货才需要）",
    fields: [
      S("apiKey", "授权 Key", "KUAIDI100_API_KEY", true, "快递100开放平台→我的→授权key（授权码）"),
      S("customer", "Customer", "KUAIDI100_CUSTOMER", false, "快递100→实时查询→customer 参数"),
    ],
  },
  {
    key: "email_smtp", label: "邮件（SMTP）", category: "通知",
    note: "系统邮件通知。用任意邮箱的SMTP服务，密码填『授权码』不是登录密码。",
    fields: [
      S("host", "SMTP 服务器", "SMTP_HOST", false, "邮箱服务商SMTP地址，如 smtp.qq.com / smtp.163.com / smtp.exmail.qq.com"),
      S("port", "端口", "SMTP_PORT", false, "SSL用465，STARTTLS用587", "587"),
      S("user", "账号", "SMTP_USER", false, "发信邮箱完整地址，如 noreply@yourdomain.com"),
      S("pass", "密码/授权码", "SMTP_PASS", true, "邮箱设置里开启SMTP后生成的『授权码』（非邮箱登录密码）"),
      S("from", "发件人", "EMAIL_FROM", false, "发件人显示，如 国学平台<noreply@yourdomain.com>"),
    ],
  },
  {
    key: "cron", label: "定时任务验签", category: "系统",
    note: "内部定时任务回调验签，自己设一串随机字符串即可，不用去任何平台申请。",
    fields: [S("webhookSecret", "Cron Webhook Secret", "CRON_WEBHOOK_SECRET", true, "自定义一串随机字符串（如32位字母数字），用于定时任务回调验签")],
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
