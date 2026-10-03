/**
 * 运营种子内容选题库（内容生成自动化·北极星域1 首个真实用例 · 上线前种子内容填充）
 *
 * 与「品类种子内容」（国学知识科普）不同，这里是**运营型**内容：介绍平台玩法 / 招运营商 / 教操作 / 讲愿景。
 *
 * 核心要求（董事长定·不浮于表面）：
 *   ① 接**真实平台知识**（下面 knowledgePoints 是平台真实玩法事实，非通用填充）；
 *   ② 生成即草稿（DRAFT），对外发布走人工闸（EXTERNAL_PUBLISH 红线）——这是初期的质量闸；
 *   ③ 易变数字（会员价/分佣比例等）不写死，让文案引导"详见平台内页/后台"，避免过时与误导。
 */

export type SeedForm = "article" | "post" | "video_script";

export const SEED_FORM_LABEL: Record<SeedForm, string> = {
  article: "文章",
  post: "社区帖子",
  video_script: "短视频脚本",
};

export interface SeedTopic {
  key: string;
  title: string; // 选题名（也作生成标题兜底）
  audience: string; // 目标受众
  purpose: string; // 内容目的
  knowledgePoints: string[]; // 真实平台知识点（注入 prompt·杜绝浮于表面）
  recommendedForms: SeedForm[]; // 建议形式（选型见 pilot 记忆）
  note?: string; // 合规/口径注意
}

export const SEED_TOPICS: SeedTopic[] = [
  {
    key: "recruit_operator",
    title: "什么是分站运营商，如何加入",
    audience: "有本地资源、想借平台创业的用户/机构",
    purpose: "招募分站运营商，讲清角色与加入路径",
    knowledgePoints: [
      "平台是国学传统文化综合平台，已有大量注册用户的存量生态",
      "分站运营商=区域团队管理者，区别于'站长'（内容推广者）",
      "运营商可管理团队、用微页面赋能自己的分站、承接线上线下业务",
      "平台战略是'存量用户 B 端化'，与站长/驿站/研究院/供应商共创生态",
      "分佣与结算规则以平台后台配置与协议为准（不承诺具体比例数字）",
    ],
    recommendedForms: ["video_script", "article"],
    note: "信任重内容，短视频建议用数字人口播；不得承诺收益数字，一切以协议为准",
  },
  {
    key: "tutorial_paipan",
    title: "三分钟学会在平台用排盘工具",
    audience: "新用户、对命理文化感兴趣的人",
    purpose: "教操作，降低上手门槛，引导深度内容",
    knowledgePoints: [
      "平台提供八字、紫微斗数、风水堪舆、姓名学等传统排盘工具",
      "排盘是很多用户的高频入口，用完可引导到课程/圈子/电子书等深度内容",
      "结果基于传统命理研究视角，提供人生智慧参考，不作绝对断言",
    ],
    recommendedForms: ["video_script", "article"],
    note: "命理内容须带'仅供文化参考、不构成决策依据'的理性定位声明",
  },
  {
    key: "member_benefits",
    title: "平台会员能享受哪些权益",
    audience: "活跃用户、深度学习者",
    purpose: "介绍会员玩法，促进转化",
    knowledgePoints: [
      "平台设有书院会员（月/季/年多档），具体价格以平台内页为准",
      "会员权益含每日更多免费 AI 分析次数、电子书畅读等",
      "会员定位是深度学习与权益增值，而非单纯折扣",
    ],
    recommendedForms: ["post", "article"],
    note: "不写死具体价格（易过时），引导'详见会员页'",
  },
  {
    key: "circle_play",
    title: "圈子怎么玩：找到同好，跟着圈主深度学习",
    audience: "希望社群化学习的用户、想开圈的达人",
    purpose: "介绍圈子玩法，激活社群",
    knowledgePoints: [
      "圈子是兴趣社群，圈主可开圈、设会员门槛、配置'圈主助理'AI 答疑",
      "圈内可发帖、问答、约达人咨询，形成深度互动",
      "入圈/购买为现金支付（不使用虚拟币），保障交易清晰",
    ],
    recommendedForms: ["post", "article"],
  },
  {
    key: "station_offline",
    title: "线下驿站是什么：把线上学习带到身边",
    audience: "本地学员、想做线下运营的合作者",
    purpose: "介绍驿站玩法，线上引流线下",
    knowledgePoints: [
      "线下驿站是平台的线下服务终端，线上引流、线下交付",
      "驿站运营者有专属后台，可管课程、签到核销、约讲师",
      "驿站与研究院签约讲师体系打通，供给优质线下师资",
    ],
    recommendedForms: ["article", "video_script"],
  },
  {
    key: "platform_vision",
    title: "平台的未来：共创国学生态",
    audience: "潜在合作者、忠实用户",
    purpose: "讲愿景，建立信任与认同",
    knowledgePoints: [
      "平台愿景是传承国学传统文化、涵养文化自信",
      "路径是把庞大的存量用户做 B 端化，与站长/驿站/研究院/供应商共创生态",
      "强调长期主义与内容质量，而非短期流量",
    ],
    recommendedForms: ["video_script"],
    note: "愿景类信任重，建议数字人口播（真人形象）",
  },
];

export function findSeedTopic(key: string): SeedTopic | undefined {
  return SEED_TOPICS.find((t) => t.key === key);
}
