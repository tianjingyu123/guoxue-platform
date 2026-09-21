import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PERSONAS } from "../dialogue/dialogue-personas";
import { PUBLIC_CLASSIC_BOOK_WHERE } from "../classic/classic-publication-policy";
import { MAX_CONTEXT_CHARS, MinimalVoiceContext, VoiceScene } from "./provider/voice-provider.types";

/**
 * 小卜语音场景上下文（S01/S02/S06/S07/S08）
 *
 * 职责只有两件：
 * 1. **归属校验**：报告只给本人、圈子只给有效成员、段落只给已发布古籍；身份一律来自 JWT，不接受客户端传 userId。
 * 2. **最小上下文**：只把当前场景必需的内容交给供应商，出生信息、手机号、笔记、完整聊天记录都不进。
 *
 * 语音由小智完整生成回答，这里给的是「正在讨论什么」，不是替它写答案。
 */

export interface VoiceContextRequest {
  scene: VoiceScene;
  /** report_dialogue: reportId；classic_companion: segmentId；circle_assistant: circleId；plaza: 角色 id */
  contextId?: string | null;
  /** 报告对话：当前讨论的小节编号（s1…） */
  sectionId?: string | null;
  /** 古籍伴读：用户选中的句子，必须是该段原文的子串 */
  selectedText?: string | null;
  /** 伴读：讲讲（主动开场）/ 问问题（等待提问） */
  intent?: "explain" | "ask" | null;
}

export interface ResolvedVoiceContext {
  contextType: string | null;
  contextId: string | null;
  agentId: string | null;
  tier: "lite" | "standard";
  /** 圈子场景：额度从圈主账户扣 */
  billingOwner: { ownerType: "user" | "circle"; ownerId: string } | null;
  context: MinimalVoiceContext;
  /** 给用户看的一句话（「正在讨论：…」）；context.topic 是给模型的指令，不展示给用户 */
  displayTopic: string;
  digest: string;
}

/** 出生信息、手机号、身份证号等：出现在任何文本字段里都要抹掉 */
const PRIVATE_PATTERNS: Array<[RegExp, string]> = [
  [/(?:19|20)\d{2}\s*[-/.年]\s*\d{1,2}\s*[-/.月]\s*\d{1,2}\s*日?(?:\s*\d{1,2}\s*[:：时点]\s*\d{0,2}\s*分?)?/g, "〔日期已隐去〕"],
  [/(?<!\d)1[3-9]\d{9}(?!\d)/g, "〔号码已隐去〕"],
  [/(?<![0-9A-Za-z])\d{17}[\dXx](?![0-9A-Za-z])/g, "〔证件号已隐去〕"],
];

export function scrubPrivate(text: string): string {
  let out = text;
  for (const [re, rep] of PRIVATE_PATTERNS) out = out.replace(re, rep);
  return out;
}

function clip(text: unknown, max: number, names: string[] = []): string {
  let s = scrubPrivate(String(text ?? "").replace(/\s+/g, " ").trim());
  // 命主/客户姓名也是身份信息：给供应商的文本里一律换成「命主」
  for (const n of names) if (n && n.length >= 2) s = s.split(n).join("命主");
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export function digestContext(ctx: MinimalVoiceContext): string {
  return createHash("sha256").update(JSON.stringify(ctx), "utf8").digest("hex").slice(0, 32);
}

/** 总长兜底：超出上限时从最长的字段开始截，保证不会把整本书/整份报告塞给供应商 */
function enforceBudget(ctx: MinimalVoiceContext): MinimalVoiceContext {
  const size = () => JSON.stringify(ctx.facts).length + ctx.topic.length;
  let guard = 0;
  while (size() > MAX_CONTEXT_CHARS && guard++ < 50) {
    const [key] = Object.entries(ctx.facts)
      .map(([k, v]) => [k, JSON.stringify(v).length] as const)
      .sort((a, b) => b[1] - a[1])[0];
    const v = ctx.facts[key];
    if (Array.isArray(v)) ctx.facts[key] = v.slice(0, Math.max(1, Math.floor(v.length / 2)));
    else if (typeof v === "string") ctx.facts[key] = `${v.slice(0, Math.floor(v.length / 2))}…`;
    else ctx.facts[key] = null;
  }
  return ctx;
}

@Injectable()
export class VoiceContextBuilder {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string, req: VoiceContextRequest): Promise<ResolvedVoiceContext> {
    switch (req.scene) {
      case "report_dialogue":
        return this.forReport(userId, req);
      case "classic_companion":
        return this.forSegment(req);
      case "circle_assistant":
        return this.forCircle(userId, req);
      case "plaza":
        return this.forPlaza(req);
      case "content_guide":
        return this.finish({
          contextType: null,
          contextId: null,
          agentId: "xiaore",
          tier: "lite",
          billingOwner: null,
          displayTopic: "帮你在热卜找文章、古籍、课程与圈子",
          context: {
            scene: "content_guide",
            topic: "帮用户在热卜找文章、古籍、课程与圈子；只推荐平台真实存在、用户有权访问的内容",
            facts: { linkPolicy: "只能通过热卜内容工具返回的卡片推荐，不得自造链接" },
            version: "content-guide-v1",
            redactions: [],
          },
        });
      case "device":
        // 硬件会话由设备服务建立（需要设备绑定校验），不经此入口
        throw new BusinessException(ErrorCode.BAD_REQUEST, "硬件会话请从设备入口发起");
      default:
        throw new BusinessException(ErrorCode.BAD_REQUEST, "不支持的语音场景");
    }
  }

  private finish(r: Omit<ResolvedVoiceContext, "digest">): ResolvedVoiceContext {
    const context = enforceBudget(r.context);
    return { ...r, context, digest: digestContext(context) };
  }

  /** S07：只能是本人的报告；盘面事实不重算、不下发出生信息 */
  private async forReport(userId: string, req: VoiceContextRequest): Promise<ResolvedVoiceContext> {
    if (!req.contextId) throw new BusinessException(ErrorCode.BAD_REQUEST, "缺少报告编号");
    const report = await this.prisma.aiAnalysisRecord.findUnique({
      where: { id: req.contextId },
      select: { id: true, userId: true, scene: true, analysisContent: true, paipanRecordId: true, paipanRecord: { select: { clientName: true } } },
    });
    if (!report || report.scene !== "paipan_report") throw new BusinessException(ErrorCode.NOT_FOUND, "报告不存在");
    if (report.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权访问该报告");

    let content: any = null;
    try {
      content = JSON.parse(report.analysisContent);
    } catch {
      throw new BusinessException(ErrorCode.INTERNAL_ERROR, "报告内容解析失败");
    }
    const sections: any[] = Array.isArray(content?.sections) ? content.sections : [];
    const outline: any[] = Array.isArray(content?.dialogueOutline) ? content.dialogueOutline : [];
    const current = req.sectionId ? outline.find((o) => o?.sectionId === req.sectionId) : null;
    if (req.sectionId && !current && !sections.some((s) => s?.id === req.sectionId)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "报告里没有这个小节");
    }
    const paipanType = String(content?.metadata?.paipanType || "bazi");
    // 可能出现在标题、摘要、要点里的姓名：排盘记录的被排盘人、报告事实里的姓名字段
    const names = [report.paipanRecord?.clientName, content?.facts?.name, content?.facts?.clientName]
      .filter((n): n is string => typeof n === "string" && n.trim().length >= 2)
      .map((n) => n.trim());
    const version = String(content?.metadata?.version || content?.metadata?.generatedAt || report.id);

    return this.finish({
      contextType: "paipan_report",
      contextId: report.id,
      agentId: ["liuyao", "meihua", "qimen", "daliuren", "xiaoliuren", "jinkoujue"].includes(paipanType) ? "xiaoyao" : "xiaobu",
      tier: "lite",
      billingOwner: { ownerType: "user", ownerId: userId },
      displayTopic: `《${clip(content?.title, 30)}》${current ? ` · ${clip(current.title, 20)}` : ""}`,
      context: {
        scene: "report_dialogue",
        // 不带报告标题：标题常含命主姓名
        topic: "围绕用户自己的排盘报告交流：只讲报告里已有的盘面事实与依据，不重新排盘、不改结论、不编书名原句",
        facts: {
          paipanType,
          reportVersion: version,
          summary: clip(content?.summary, 500, names),
          sections: outline.slice(0, 12).map((o) => `${o.sectionId} ${clip(o.title, 20, names)}：${(o.keyPoints || []).slice(0, 3).map((k: string) => clip(k, 60, names)).join("；")}`),
          currentSection: current ? `${current.sectionId} ${clip(current.title, 20)}` : null,
          boundary: "资料不足或门派分歧时直说；不作疾病、投资、婚姻的确定性结论；不推销化解",
        },
        version,
        // 报告里的四柱/起盘校验/起运时刻都能反推出生时间，一律不下发
        redactions: ["title", "clientName", "facts", "chartView", "provenance", "references.fullText", "paipanRecord.input"],
      },
    });
  }

  /** S06：只接受已发布古籍的稳定段落；选中句必须是原文子串 */
  private async forSegment(req: VoiceContextRequest): Promise<ResolvedVoiceContext> {
    if (!req.contextId) throw new BusinessException(ErrorCode.BAD_REQUEST, "缺少段落编号");
    // 与古籍正文接口同一公开口径：已发布、未删除、有已审计的可商用版权记录
    const seg = await this.prisma.classicSegment.findFirst({
      where: { id: req.contextId, deletedAt: null, chapter: { deletedAt: null, book: PUBLIC_CLASSIC_BOOK_WHERE } },
      select: {
        id: true, chapterId: true, sortOrder: true, content: true, contentHash: true,
        chapter: { select: { title: true, book: { select: { title: true } } } },
      },
    });
    const book = seg?.chapter?.book;
    if (!seg || !book) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "段落不存在或古籍未公开");
    }
    const selected = (req.selectedText || "").trim();
    if (selected && !seg.content.includes(selected)) {
      // 不能让客户端把任意文字当成「原文」塞给模型
      throw new BusinessException(ErrorCode.BAD_REQUEST, "选中的句子不在当前段落原文中");
    }
    const [prev, next] = await Promise.all([
      this.prisma.classicSegment.findFirst({ where: { chapterId: seg.chapterId, sortOrder: seg.sortOrder - 1, deletedAt: null }, select: { content: true } }),
      this.prisma.classicSegment.findFirst({ where: { chapterId: seg.chapterId, sortOrder: seg.sortOrder + 1, deletedAt: null }, select: { content: true } }),
    ]);

    return this.finish({
      contextType: "classic_segment",
      contextId: seg.id,
      agentId: "xiaojian",
      tier: "lite",
      billingOwner: null,
      displayTopic: `《${clip(book.title, 30)}·${clip(seg.chapter?.title, 30)}》第 ${seg.sortOrder + 1} 段${selected ? `「${clip(selected, 24)}」` : ""}`,
      context: {
        scene: "classic_companion",
        topic: `正在讨论《${clip(book.title, 30)}·${clip(seg.chapter?.title, 30)}》第 ${seg.sortOrder + 1} 段` +
          (req.intent === "explain" ? "；用户点了「讲讲」，先用两三句话简短讲解再等提问" : "；等用户提问，不要主动长篇朗读"),
        facts: {
          segmentText: clip(seg.content, 600),
          selectedText: selected ? clip(selected, 200) : null,
          previous: prev ? clip(prev.content, 160) : null,
          next: next ? clip(next.content, 160) : null,
          answerStyle: "短句、分轮；原文之外的说法要说明是通行说法",
        },
        version: seg.contentHash,
        redactions: ["userNotes", "companionHistory", "readingProgress"],
      },
    });
  }

  /** S02：有效成员才可进入；圈子私有知识不随上下文下发 */
  private async forCircle(userId: string, req: VoiceContextRequest): Promise<ResolvedVoiceContext> {
    if (!req.contextId) throw new BusinessException(ErrorCode.BAD_REQUEST, "缺少圈子编号");
    const circleId = req.contextId;
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
      select: { role: true, expireAt: true, circle: { select: { name: true, status: true, deletedAt: true } } },
    });
    if (!member) throw new BusinessException(ErrorCode.FORBIDDEN, "请先加入该圈子");
    if (!member.circle || member.circle.deletedAt || member.circle.status !== "ACTIVE") {
      throw new BusinessException(ErrorCode.FORBIDDEN, "该圈子当前不可用");
    }
    if (member.expireAt && new Date(member.expireAt) < new Date()) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "圈子会员已过期，请续费后使用");
    }
    const profile = await this.prisma.voiceAgentProfile.findUnique({
      where: { ownerType_ownerId: { ownerType: "circle", ownerId: circleId } },
      select: { id: true, status: true, activeVersion: true, name: true },
    });
    if (!profile || profile.status === "DISABLED" || profile.activeVersion == null) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "圈主尚未开通语音助理");
    }
    const version = await this.prisma.voiceAgentProfileVersion.findUnique({
      where: { profileId_version: { profileId: profile.id, version: profile.activeVersion } },
      select: { name: true, tier: true, version: true },
    });

    return this.finish({
      contextType: "circle",
      contextId: circleId,
      agentId: profile.id,
      // 档位以平台审核通过的版本为准，圈主无权自行升档
      tier: version?.tier === "standard" ? "standard" : "lite",
      billingOwner: { ownerType: "circle", ownerId: circleId },
      displayTopic: `「${clip(member.circle.name, 30)}」语音助理 · ${clip(version?.name ?? profile.name, 20)}`,
      context: {
        scene: "circle_assistant",
        topic: `你是「${clip(member.circle.name, 30)}」圈的语音助理「${clip(version?.name ?? profile.name, 20)}」`,
        facts: {
          memberRole: member.role,
          // 圈子私有知识需要供应商把用户身份安全传给 MCP 才能开放；在那之前只允许公开知识
          knowledgeAccess: "public_only_until_verified_identity",
          referralPolicy: "圈内资源优先，不把成员介绍到其他老师、其他圈子或站外",
        },
        version: `profile-v${version?.version ?? profile.activeVersion}`,
        redactions: ["circleKnowledge", "memberList", "ownerContact"],
      },
    });
  }

  /** S01：广场角色只能是平台角色谱里的已知角色 */
  private async forPlaza(req: VoiceContextRequest): Promise<ResolvedVoiceContext> {
    const persona = req.contextId ? PERSONAS[req.contextId] : undefined;
    if (!persona) throw new BusinessException(ErrorCode.NOT_FOUND, "智能体不存在");
    return this.finish({
      contextType: "plaza_agent",
      contextId: persona.id,
      agentId: persona.id,
      tier: "lite",
      billingOwner: null,
      displayTopic: `${persona.name} · ${persona.tagline}`,
      context: {
        scene: "plaza",
        topic: `你是热卜的「${persona.name}」：${persona.tagline}`,
        facts: { good: persona.good, handsOff: persona.handsOff },
        version: `persona-${persona.id}-v1`,
        redactions: [],
      },
    });
  }
}
