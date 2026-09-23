/**
 * 圈子助理按成员角色调整回答角度（2026-09-18）
 *
 * 决策人要求：「他要能区分圈成员角色，根据不同角色有不同的回答问题的角度。」
 *
 * 同一个问题，不同身份的人问，想要的东西不一样：
 * 圈主问「最近大家在关心什么」是想找运营抓手，普通成员问同一句只是想找话题跟上；
 * 管理员问「这条能不能发」是要判规矩，新成员问同一句是怕自己踩雷。
 * 答得一样，对谁都不算贴心。
 *
 * 做法上有两条边界：
 * 1. **只调整角度，不调整口径**。圈子的规矩、圈主的服务、知识库的内容对谁都一样，
 *    不能因为对方是圈主就多讲一层、对普通成员就藏着掖着——那不是分角色，是差别对待。
 * 2. **不泄露成员隐私与经营数据**。圈主视角可以讲「本圈的内容与服务」，
 *    但助理不掌握也不应转述具体成员的付费、私聊、举报等信息。
 */

/** 与 Prisma 的 CircleMemberRole 一致 */
export type CircleMemberRole = "OWNER" | "PARTNER" | "ADMIN" | "GUEST" | "VOLUNTEER" | "MEMBER";

interface RoleAngle {
  /** 对模型说明「现在问话的是谁」 */
  who: string;
  /** 回答时优先给什么 */
  angle: string;
  /** 这个角色特别需要留意的 */
  caution?: string;
}

const ANGLES: Record<CircleMemberRole, RoleAngle> = {
  OWNER: {
    who: "本圈圈主（这个助理由他出资开通，你是他的助理）",
    angle:
      "先给能用于经营的判断：本圈已有哪些内容与服务可以对上他问的这件事、还缺什么、可以怎么补。" +
      "涉及圈内规则或服务介绍时，按他设定的口径讲，不要替他改主张。",
    caution: "不掌握也不转述具体成员的付费、私聊、举报等个人信息；经营建议点到为止，不越俎代庖替他做决定。",
  },
  PARTNER: {
    who: "本圈合伙人（与圈主共同经营）",
    angle: "与圈主同一视角，偏重协作与分工：这件事圈里谁在做、现有资源在哪、怎么接上去。",
    caution: "同样不涉及具体成员的个人信息。",
  },
  ADMIN: {
    who: "本圈管理员（负责日常秩序与内容管理）",
    angle:
      "先给能照着执行的依据：本圈的规则怎么定的、同类情况通常怎么处理、该引导到哪个板块。" +
      "遇到判断题（能不能发、算不算违规）先讲规则原文或圈内惯例，再给建议。",
    caution: "不替平台下处罚结论，只说规则与惯例；拿不准的建议他与圈主确认。",
  },
  GUEST: {
    who: "本圈嘉宾（受邀来分享的老师或专业人士）",
    angle:
      "当作同行来对话：可以直接用专业口径，不必从零解释基础概念；" +
      "涉及他要分享的内容时，先说清本圈成员的构成与关注点，帮他把话说到听众心上。",
    caution: "不评价其他嘉宾，不比较高下。",
  },
  VOLUNTEER: {
    who: "本圈志愿者（帮圈主做事的热心成员）",
    angle: "偏重「怎么帮上忙」：这件事圈里通常谁负责、流程是什么、他能从哪一步接手。",
    caution: "涉及权限内的事直接说，超出权限的引导他找管理员或圈主。",
  },
  MEMBER: {
    who: "本圈普通成员",
    angle:
      "先解决他眼前的问题：用他听得懂的话讲清楚，再指出圈里哪一篇内容、哪一项服务能进一步帮到他。" +
      "术语第一次出现时用一句话解释。",
    caution: "不要求他懂行话，不因为他问得浅就敷衍。",
  },
};

/**
 * 刚进圈不久的**普通成员**另外加一层引导——他最需要的是「从哪开始」。
 *
 * 只对 MEMBER 生效：圈主是圈子的创建者，合伙人、管理员、志愿者都是熟人，
 * 嘉宾是受邀来分享的——给这些人推送「圈内从哪里入门」既没用也失礼。
 * （这个坑是实测时踩到的：圈主的 joinedAt 也是最近，差点被当成新人引导一番。）
 */
const NEWCOMER_ROLES: CircleMemberRole[] = ["MEMBER"];

const NEWCOMER_HINT =
  "他刚加入本圈不久：回答完问题后，用一句话告诉他圈内从哪里入门（置顶内容、常用板块或圈主的招呼），帮他尽快融入，不要长篇介绍。";

/** 加入多久算「新成员」 */
export const NEWCOMER_DAYS = 7;

/**
 * 生成角色视角提示词。
 * @param role 成员角色；取不到时按普通成员处理（最保守的那一档）
 * @param joinedAt 入圈时间，用于判断是否新成员
 */
export function buildRoleAnglePrompt(role: string | null | undefined, joinedAt?: Date | null): string {
  const key = (role && role in ANGLES ? role : "MEMBER") as CircleMemberRole;
  const a = ANGLES[key];
  const isNew =
    NEWCOMER_ROLES.includes(key) &&
    !!joinedAt &&
    Date.now() - new Date(joinedAt).getTime() < NEWCOMER_DAYS * 86400_000;

  const lines = [
    `【问话人身份】${a.who}`,
    `【回答角度】${a.angle}`,
    a.caution ? `【留意】${a.caution}` : "",
    isNew ? `【新成员】${NEWCOMER_HINT}` : "",
    // 这条对所有角色都适用，防止「分角色」被做成「区别对待」
    "【一视同仁】圈子的规矩、圈主提供的服务、知识库里的内容，对谁都是同一套口径——按身份调整的是切入角度与详略，不是给不同的人不同的答案。",
  ];
  return lines.filter(Boolean).join("\n");
}
