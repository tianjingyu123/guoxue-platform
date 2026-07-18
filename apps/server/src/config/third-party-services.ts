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
  multiline?: boolean; // 多行文本（如私钥/证书 PEM），前端用 textarea
  resolveFile?: boolean; // 值可为"内容"或"服务器文件路径"：加载时若检测为存在的文件路径，自动读取文件内容写入 env
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
  multiline = false,
  resolveFile = false,
): ConfigField => ({ key, label, env, sensitive, hint, placeholder, multiline, resolveFile });

export const THIRD_PARTY_SERVICES: ThirdPartyService[] = [
  // ───────── 支付 ─────────
  {
    key: "wechat_pay", label: "微信支付", category: "支付",
    note: "在微信支付商户平台 pay.weixin.qq.com 申请。注意：这是「商户号」体系，和小程序的 AppID 是两回事。",
    fields: [
      S("appId", "绑定 AppID", "WECHAT_PAY_APP_ID", false, "与商户号完成绑定的小程序/公众号 AppID（未填时自动使用「微信小程序」卡片的 AppID）"),
      S("mchId", "商户号", "WECHAT_PAY_MCH_ID", false, "商户平台→账户中心→商户信息→商户号（10位数字）"),
      S("apiV3Key", "APIv3 密钥", "WECHAT_PAY_API_V3_KEY", true, "商户平台→账户中心→API安全→APIv3密钥（自己设一个32位字符串并牢记）"),
      S("serialNo", "证书序列号", "WECHAT_PAY_SERIAL_NO", false, "商户平台→账户中心→API安全→申请API证书后，证书详情里的序列号"),
      S("privateKey", "商户私钥（内容或路径）", "WECHAT_PAY_PRIVATE_KEY", true, "两种填法任选其一：① 用记事本打开 apiclient_key.pem，全选复制内容粘贴进来；② 或直接填服务器上证书文件的完整路径（如 /opt/guoxue/certs/apiclient_key.pem）。系统会自动识别是内容还是路径。", "", true, true),
      S("publicKey", "微信支付公钥（内容或路径）", "WECHAT_PAY_PUBLIC_KEY", true, "2024年后的新商户号用「公钥模式」验回调：商户平台→账户中心→API安全→微信支付公钥→下载 pub_key.pem，粘贴内容进来。若你的商户号显示的是「平台证书」则此项留空。", "", true, true),
      S("notifyUrl", "支付回调地址", "WECHAT_PAY_NOTIFY_URL", false, "填 https://api.rebugx.cn/api/v1/shop/pay/notify"),
      S("refundNotifyUrl", "退款回调地址", "WECHAT_PAY_REFUND_NOTIFY_URL", false, "填 https://api.rebugx.cn/api/v1/shop/refund/notify"),
    ],
  },
  {
    key: "alipay", label: "支付宝", category: "支付",
    note: "在支付宝开放平台 open.alipay.com 创建应用。密钥用官方「支付宝密钥工具」生成。",
    fields: [
      S("appId", "应用 AppID", "ALIPAY_APP_ID", false, "开放平台→控制台→我的应用→APPID（16位数字）"),
      S("privateKey", "应用私钥（内容或路径）", "ALIPAY_PRIVATE_KEY", true, "填『应用私钥』内容（支付宝密钥工具生成，一长串），或服务器上私钥文件的完整路径。系统自动识别。", "", true, true),
      S("publicKey", "支付宝公钥（内容或路径）", "ALIPAY_PUBLIC_KEY", true, "填『支付宝公钥』内容（平台给你的），或服务器上公钥文件的完整路径。系统自动识别。", "", true, true),
      S("notifyUrl", "异步通知地址", "ALIPAY_NOTIFY_URL", false, "填 https://api.rebugx.cn/api/v1/shop/alipay/notify"),
    ],
  },
  {
    key: "huifu", label: "汇付天下", category: "支付",
    note: "汇付斗拱（BsPay）聚合支付+分账。斗拱控制台 console.huifu.com→开发设置→开发者信息 获取商户号(huifu_id)/系统号(sys_id)/产品号(product_id)与 RSA 密钥对；接口走 v2 JSON 网关，SHA256withRSA 签名。",
    fields: [
      S("merchantId", "商户号", "HUIFU_MERCHANT_ID", false, "汇付分配的商户号（huifuId）"),
      S("appId", "系统号 sys_id", "HUIFU_APP_ID", false, "斗拱控制台·开发设置·开发者信息中查看（直连商户常与商户号相同）"),
      S("productId", "产品号 product_id", "HUIFU_PRODUCT_ID", false, "斗拱控制台·开发设置·开发者信息中查看"),
      S("secretKey", "密钥", "HUIFU_SECRET_KEY", true, "斗拱走RSA签名·此字段暂留空即可"),
      S("rsaPrivateKey", "RSA 私钥（内容或路径）", "HUIFU_RSA_PRIVATE_KEY", true, "填 RSA 私钥内容，或服务器上私钥文件的完整路径。系统自动识别。", "", true, true),
      S("rsaPublicKey", "RSA 公钥（内容或路径）", "HUIFU_RSA_PUBLIC_KEY", true, "填汇付 RSA 公钥内容，或服务器上公钥文件的完整路径。系统自动识别。", "", true, true),
      S("notifyUrl", "回调地址", "HUIFU_NOTIFY_URL", false, "填 https://api.rebugx.cn/api/v1/huifu/notify"),
    ],
  },
  {
    key: "unionpay", label: "银联支付", category: "支付",
    note: "银联全渠道支付。证书在银联商户服务网站申请。",
    fields: [
      S("merId", "商户号", "UNIONPAY_MER_ID", false, "银联分配的商户号（15位）"),
      S("pfxPath", "证书路径(.pfx)", "UNIONPAY_PFX_PATH", true, "银联签名证书 .pfx 文件（需放服务器，路径找技术）"),
      S("pfxPassword", "证书密码", "UNIONPAY_PFX_PASSWORD", true, "申请 .pfx 证书时设置的密码"),
      S("notifyUrl", "后台通知地址", "UNIONPAY_NOTIFY_URL", false, "填 https://api.rebugx.cn/api/v1/shop/unionpay/notify"),
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
    note: "视频点播VOD（长视频/短视频的服务端存储与转码）。控制台：云点播→应用管理。与下方『短视频 SDK』配合使用（VOD 负责存储转码，SDK 负责端上采集编辑）。",
    fields: [S("subAppId", "子应用 ID", "VOD_SUB_APP_ID", false, "云点播控制台→应用管理→子应用→应用ID")],
  },
  {
    key: "tencent_ugsv", label: "腾讯云短视频 SDK（UGSV）", category: "腾讯云", enabled: false,
    note: "短视频客户端 SDK（腾讯云 UGSV，负责移动端/小程序的短视频采集、拍摄、剪辑、特效）。控制台：云点播→应用管理→分发播放设置→短视频 License（或 视立方 License 管理）申请后获取 Licence URL 与 Key。端上初始化 SDK 必填；配合上方『点播 VOD』做上传与转码。",
    fields: [
      S("licenceUrl", "Licence URL", ["UGSV_LICENCE_URL", "TENCENT_UGSV_LICENCE_URL"], false, "视立方/短视频 License 管理→申请后生成的授权 URL（形如 https://license.vod2.myqcloud.com/license/v2/xxxxx/v_cube.license）"),
      S("licenceKey", "Licence Key", ["UGSV_LICENCE_KEY", "TENCENT_UGSV_LICENCE_KEY"], true, "与 Licence URL 配对的授权 Key（License 管理页可查看）"),
    ],
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
    key: "tencent_content_security", label: "腾讯云内容安全（审核）", category: "腾讯云",
    note: "文本/图片内容审核（天御 TMS/IMS）。★复用上方「腾讯云(通用)」的 SecretId/SecretKey，无需单独填密钥；在腾讯云控制台开通『内容安全』即可用。下面地域一般不用改。",
    fields: [
      S("region", "服务地域", "CONTENT_MODERATION_REGION", false, "默认复用 COS 的地域（如 ap-guangzhou）；仅当内容安全在其它地域开通时才需改", "ap-guangzhou"),
    ],
  },
  {
    key: "tencent_identity", label: "腾讯云实名认证", category: "腾讯云",
    note: "身份证OCR / 人脸核身。★复用上方「腾讯云(通用)」的 SecretId/SecretKey，无需单独填密钥；在腾讯云控制台开通『慧眼/人脸核身』即可用。下面地域一般不用改。",
    fields: [
      S("region", "服务地域", "IDENTITY_REGION", false, "默认复用 COS 的地域（如 ap-guangzhou）", "ap-guangzhou"),
    ],
  },
  {
    key: "tencent_asr", label: "腾讯云语音识别（ASR·语音转写）", category: "腾讯云",
    note: "语音转文字（一句话识别），用于圈子/评论等语音内容转写。★复用上方「腾讯云(通用)」的 SecretId/SecretKey，无需在此单独填密钥；只需登录腾讯云控制台开通『语音识别 ASR』服务即可生效。未开通/未配通用密钥时，系统自动回退为 AI 网关文本模拟。",
    fields: [
      S("engineType", "识别引擎", ["TENCENT_ASR_ENGINE"], false, "一般不用改：中文填 16k_zh、英文填 16k_en（留空按语言自动选择）", "16k_zh"),
    ],
  },
  {
    key: "tencent_map", label: "腾讯地图", category: "腾讯云",
    note: "腾讯位置服务，用于定位/选点/同城。控制台：lbs.qq.com（创建 Key 时建议勾选 WebService API；若开了签名校验须同时填 SK）。",
    fields: [
      S("key", "开发密钥 Key", "TENCENT_MAP_KEY", false, "腾讯位置服务控制台→应用管理→我的应用→Key"),
      S("sk", "签名 SK", "TENCENT_MAP_SK", true, "创建Key时若开启了『签名校验』，填对应SK；否则留空"),
    ],
  },
  // ───────── 微信 ─────────
  {
    key: "wechat_official", label: "微信公众号", category: "微信",
    note: "公众号内H5支付(JSAPI)+网页授权用。在微信公众平台 mp.weixin.qq.com（公众号后台）→设置与开发→基本配置获取。前置：公众号后台已配网页授权域名/JS安全域名=api.rebugx.cn；商户平台已关联该公众号AppID并配置JSAPI支付授权目录 https://api.rebugx.cn/h5/",
    fields: [
      S("appId", "公众号 AppID", "WECHAT_OFFICIAL_APPID", false, "公众号后台→设置与开发→基本配置→开发者ID(AppID)，wx开头"),
      S("appSecret", "公众号 AppSecret", "WECHAT_OFFICIAL_APP_SECRET", true, "公众号后台→基本配置→开发者密码(AppSecret)，需管理员扫码生成，只显示一次"),
    ],
  },
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
    key: "coze", label: "Coze（智能体·个人令牌）", category: "AI",
    note: "【旧方式·个人访问令牌 PAT】coze.cn 获取访问令牌，最长30天需手动续期。★推荐改用下方「Coze OAuth（免维护授权）」，配好后本卡片可留空作过渡兜底。",
    fields: [
      S("apiKey", "API Token", "COZE_API_KEY", true, "Coze平台 coze.cn→个人头像→设置→API授权→个人访问令牌"),
      S("botIds", "Bot IDs（逗号分隔）", "COZE_BOT_IDS", false, "已发布的Bot ID，多个用英文逗号分隔"),
    ],
  },
  {
    key: "coze_oauth", label: "Coze OAuth（智能体·免维护授权）", category: "AI",
    note: "★【推荐·服务端应用授权·免维护】用「OAuth JWT」授权，后端自动签名换取访问令牌并自动刷新，无需再像个人令牌那样每30天手动续期。申请步骤：登录 coze.cn→右上角头像→扣子 API→授权→创建 OAuth 应用→应用类型选『服务类应用』（Service application）→创建后在应用详情『公钥管理』里新增公钥（系统会生成公私钥对，下载保存好私钥文件）→把下面四项填进来即可。配好后与上方「个人令牌」并存，系统优先用 OAuth，换取失败自动回退个人令牌，过渡不断服务。",
    fields: [
      S("clientId", "应用 ID（client_id）", ["COZE_OAUTH_CLIENT_ID"], false, "OAuth 应用详情页顶部的『应用ID / Client ID』（一串数字）"),
      S("publicKeyId", "公钥指纹（public_key_id）", ["COZE_OAUTH_PUBLIC_KEY_ID"], false, "OAuth 应用→公钥管理→新增公钥后生成的『公钥指纹 / 公钥ID』（一串字符）"),
      S("privateKey", "私钥（PEM·内容或路径）", ["COZE_OAUTH_PRIVATE_KEY"], true, "新增公钥时下载的私钥文件（形如 private_key.pem）：用记事本打开全选复制内容粘贴进来，或直接填服务器上私钥文件的完整路径。系统自动识别。私钥加密存储、掩码显示，留空不覆盖已存值。", "", true, true),
      S("apiBase", "Coze API 域名", ["COZE_API_BASE"], false, "国内版填 https://api.coze.cn（默认，一般不用改）；海外版填 https://api.coze.com", "https://api.coze.cn"),
    ],
  },
  // ───────── 其他 ─────────
  {
    key: "kuaidi100", label: "快递100（物流）", category: "物流",
    note: "物流轨迹查询只需前两项（签名=MD5(param+key+customer)）；secret/userid 是寄件、电子面单类接口才用到，平台当前不代发货可留空。",
    fields: [
      S("apiKey", "授权 Key", "KUAIDI100_API_KEY", true, "快递100开放平台→我的→授权key（授权码）"),
      S("customer", "Customer", "KUAIDI100_CUSTOMER", true, "快递100→实时查询→customer 参数（轨迹查询必需）"),
      S("secret", "Secret（可选）", "KUAIDI100_SECRET", false, "寄件/电子面单类接口鉴权用；仅做轨迹查询无需填写"),
      S("userid", "UserID（可选）", "KUAIDI100_USERID", false, "快递100云平台账号ID；寄件类接口用，当前可留空"),
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
  {
    key: "einvoice", label: "电子发票（诺诺/百望等）", category: "财务", enabled: false,
    note: "开票中心的第三方电子发票服务（如诺诺网/百望云/航信）。配置并启用后，用户线上申请开票可全自动开具并线上交付（回传 PDF/OFD 下载链接与发票号）；未配置时开票中心仍可由财务人工开票。请到票据服务商开通接口获取 AppKey/AppSecret 与销方信息。",
    fields: [
      S("provider", "服务商", ["EINVOICE_PROVIDER"], false, "票据服务商标识，如 nuonuo（诺诺）/ baiwang（百望）/ aisino（航信）"),
      S("appKey", "AppKey", ["EINVOICE_APP_KEY"], false, "服务商开放平台申请的应用 AppKey"),
      S("appSecret", "AppSecret", ["EINVOICE_APP_SECRET"], true, "与 AppKey 配对的密钥"),
      S("sellerTaxNo", "销方税号", ["EINVOICE_SELLER_TAX_NO"], false, "平台开票主体的统一社会信用代码/税号"),
      S("sellerName", "销方名称", ["EINVOICE_SELLER_NAME"], false, "平台开票主体的公司全称"),
      S("apiBase", "接口地址", ["EINVOICE_API_BASE"], false, "服务商开放接口的 Base URL（沙箱/生产按服务商文档填）"),
      S("autoIssue", "全自动开票", ["EINVOICE_AUTO_ISSUE"], false, "填 true 则用户申请后自动开票并交付；填 false 或留空则需财务人工确认后开票", "false"),
    ],
  },
];

/** 服务 key → 字段 env 映射（loader 用）。展开数组。 */
export function getEnvMappings(): Array<{ serviceKey: string; fieldKey: string; envNames: string[]; sensitive: boolean; resolveFile: boolean }> {
  const out: Array<{ serviceKey: string; fieldKey: string; envNames: string[]; sensitive: boolean; resolveFile: boolean }> = [];
  for (const svc of THIRD_PARTY_SERVICES) {
    for (const f of svc.fields) {
      out.push({
        serviceKey: svc.key,
        fieldKey: f.key,
        envNames: Array.isArray(f.env) ? f.env : [f.env],
        sensitive: !!f.sensitive,
        resolveFile: !!f.resolveFile,
      });
    }
  }
  return out;
}
