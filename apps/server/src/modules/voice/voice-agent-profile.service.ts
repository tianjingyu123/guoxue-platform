import { Injectable, Logger, Optional } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { VoiceQuotaService } from "./voice-quota.service";
import { checkPersonaQuality, type PersonaSuggestion } from "./agent-persona-quality";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/**
 * 小卜语音角色申请与审核（S02 圈主语音助理 / S01 广场角色）
 *
 * 流程：圈主编辑草稿 → 提交审核 → 平台审核通过（生成版本快照并发布）/ 驳回（附原因）→ 圈主修改后重新提交；
 * 平台可停用、恢复、回滚到任一已审核版本。
 *
 * 边界：
 * - 只有圈主本人可申请/修改本圈角色，圈子须为 ACTIVE 且未删除
 * - 提交时做规则检查（付费化解、保证灵验、恐吓、医疗投资承诺、索要隐私等），命中项写入 riskFlags 供审核参考，
 *   不替代人工审核；腾讯云内容审核未在本次接通，不标记为机器审核通过
 * - 已发布版本与草稿分离：审核中或被驳回的修改不影响正在使用的已发布版本
 * - 角色提示词不承载知识库内容；知识通过受控检索按成员权限提供
 */

const RISK_RULES: Array<{ re: RegExp; flag: string }> = [
  { re: /化解|破解|转运|改运|开光|请符|消灾/, flag: "含付费化解/开运类表述" },
  { re: /保证|包准|百分之百|100%|一定灵验|必定/, flag: "含保证灵验类承诺" },
  { re: /血光|大凶|劫难|横死|克死/, flag: "含恐吓性表述" },
  { re: /治病|治愈|包治|药方|投资建议|买入|股票|理财收益/, flag: "含医疗或投资承诺" },
  { re: /身份证|银行卡|密码|转账|加微信|私下交易/, flag: "含索要隐私或站外交易引导" },
  { re: /忽略(以上|之前)|ignore (all|previous)|系统提示词/, flag: "含疑似提示词注入" },
];

export interface VoiceAgentDraft {
  name: string;
  persona: string;
  prompt: string;
  voiceId: string;
  tier?: "lite" | "standard";
  /** 圈主自己提供的服务名：成员问到相关需求时助理优先引导到这里，不外推给平台其他老师 */
  ownerServices?: string[];
}

@Injectable()
export class VoiceAgentProfileService {
  private readonly logger = new Logger(VoiceAgentProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    /** 可选：审核通过时给圈主赠送额度；缺它时只是不送，不影响审核本身 */
    @Optional() private readonly quota?: VoiceQuotaService,
  ) {}

  riskCheck(draft: Pick<VoiceAgentDraft, "name" | "persona" | "prompt">): string[] {
    const text = `${draft.name}\n${draft.persona}\n${draft.prompt}`;
    return RISK_RULES.filter((r) => r.re.test(text)).map((r) => r.flag);
  }

  private async assertCircleOwner(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
      select: { role: true, circle: { select: { status: true, deletedAt: true } } },
    });
    if (!member || member.role !== "OWNER") {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只有圈主本人可以申请或修改本圈语音角色");
    }
    if (member.circle && (member.circle.deletedAt || member.circle.status !== "ACTIVE")) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "圈子当前不可用，暂不能申请语音角色");
    }
  }

  private validate(draft: VoiceAgentDraft) {
    const name = draft.name?.trim();
    if (!name || name.length > 20) throw new BusinessException(ErrorCode.BAD_REQUEST, "角色名需为 1—20 个字");
    if (!draft.persona?.trim() || draft.persona.length > 500) throw new BusinessException(ErrorCode.BAD_REQUEST, "性格描述需为 1—500 字");
    if (!draft.prompt?.trim() || draft.prompt.length > 3000) throw new BusinessException(ErrorCode.BAD_REQUEST, "角色提示词需为 1—3000 字");
    if (!draft.voiceId?.trim()) throw new BusinessException(ErrorCode.BAD_REQUEST, "请选择标准音色");
    if (draft.tier && draft.tier !== "lite" && draft.tier !== "standard") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "服务档位无效");
    }
  }

  async getForCircle(circleId: string, userId: string) {
    await this.assertCircleOwner(circleId, userId);
    return this.prisma.voiceAgentProfile.findUnique({
      where: { ownerType_ownerId: { ownerType: "circle", ownerId: circleId } },
      include: { versions: { orderBy: { version: "desc" }, take: 10 } },
    });
  }

  /**
   * 圈主看自己圈的语音额度：余额、近 7 天消耗、按当前速度还能撑几天。
   * 助理是圈主自掏腰包供养的，光给个余额数字不够——他要能判断烧得快不快。
   */
  async quotaForCircle(circleId: string, userId: string) {
    await this.assertCircleOwner(circleId, userId);
    if (!this.quota) throw new BusinessException(ErrorCode.INTERNAL_ERROR, "额度服务不可用");
    return this.quota.circleDashboard(circleId);
  }

  /**
   * 人设质检：给圈主的改进建议（不拦截，只提示）。
   *
   * 决策人要求各智能体「要有针对性的区别」；放任不管的结果是每个圈子都冒出一个
   * 「XX助手，热情专业，竭诚为您服务」。平台的位置是帮圈主把角色写好，不是卡着不让上，
   * 所以这里只出建议，保存与提交都照常进行。
   */
  async personaSuggestions(circleId: string, userId: string, draft?: VoiceAgentDraft) {
    await this.assertCircleOwner(circleId, userId);
    const profile = draft
      ? draft
      : await this.prisma.voiceAgentProfile.findUnique({
          where: { ownerType_ownerId: { ownerType: "circle", ownerId: circleId } },
        });
    if (!profile) return { suggestions: [] as PersonaSuggestion[] };

    // 同站其他圈子已在用的角色名，用于提示撞名（只取名字，不暴露是哪个圈）
    const others = await this.prisma.voiceAgentProfile.findMany({
      where: { ownerType: "circle", NOT: { ownerId: circleId }, status: { in: ["APPROVED", "PENDING_REVIEW"] } },
      select: { name: true },
      take: 200,
    });

    return {
      suggestions: checkPersonaQuality(
        {
          name: profile.name,
          persona: profile.persona,
          prompt: profile.prompt,
          ownerServices: (profile as { ownerServices?: string[] }).ownerServices ?? [],
        },
        others.map((o) => o.name),
      ),
    };
  }

  /** 保存草稿。已发布角色的修改只改草稿字段，不影响已发布版本快照 */
  async saveCircleDraft(circleId: string, userId: string, draft: VoiceAgentDraft) {
    await this.assertCircleOwner(circleId, userId);
    this.validate(draft);
    const data = {
      name: draft.name.trim(),
      persona: draft.persona.trim(),
      prompt: draft.prompt.trim(),
      voiceId: draft.voiceId.trim(),
      ownerServices: [...new Set((draft.ownerServices ?? []).map((x) => String(x).trim()).filter(Boolean))].slice(0, 8),
      // 圈主不能自行开启标准版，档位由平台审核时决定
      tier: "lite",
    };
    const existing = await this.prisma.voiceAgentProfile.findUnique({
      where: { ownerType_ownerId: { ownerType: "circle", ownerId: circleId } },
    });
    if (existing?.status === "PENDING_REVIEW") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "角色正在审核中，审核结束后才能修改");
    }
    if (!existing) {
      return this.prisma.voiceAgentProfile.create({ data: { ownerType: "circle", ownerId: circleId, ...data } });
    }
    return this.prisma.voiceAgentProfile.update({
      where: { id: existing.id },
      // 被驳回的草稿修改后回到 DRAFT；已发布/停用的角色保留状态，草稿待重新提交
      data: { ...data, status: existing.status === "REJECTED" ? "DRAFT" : existing.status },
    });
  }

  async submitCircleDraft(circleId: string, userId: string) {
    await this.assertCircleOwner(circleId, userId);
    const profile = await this.prisma.voiceAgentProfile.findUnique({
      where: { ownerType_ownerId: { ownerType: "circle", ownerId: circleId } },
    });
    if (!profile) throw new BusinessException(ErrorCode.NOT_FOUND, "请先保存语音角色草稿");
    if (profile.status === "PENDING_REVIEW") return profile;
    const result = await this.prisma.voiceAgentProfile.updateMany({
      where: { id: profile.id, status: profile.status, updatedAt: profile.updatedAt },
      data: {
        status: "PENDING_REVIEW",
        // 风险项（不许写什么）与人设建议（怎么写更好）一起给审核看：
        // 前者是红线，后者是「这个角色立不立得住」，两件事分开标
        riskFlags: [
          ...this.riskCheck(profile),
          ...(await this.personaSuggestions(circleId, userId))
            .suggestions.filter((x) => x.level === "warn")
            .map((x) => `人设待改进：${x.text.slice(0, 40)}`),
        ],
        submittedBy: userId,
        submittedAt: new Date(),
        reviewNote: null,
      },
    });
    if (result.count !== 1) throw new BusinessException(ErrorCode.CONFLICT, "角色已被修改，请刷新后再提交");
    return this.prisma.voiceAgentProfile.findUniqueOrThrow({ where: { id: profile.id } });
  }

  // ───────── 平台审核 ─────────

  async listForReview(status = "PENDING_REVIEW") {
    return this.prisma.voiceAgentProfile.findMany({
      where: { status },
      orderBy: { submittedAt: "asc" },
      take: 100,
    });
  }

  /** 审核通过：生成版本快照并发布；可指定档位（默认 lite） */
  async approve(profileId: string, reviewerId: string, options: { tier?: "lite" | "standard"; note?: string } = {}) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.voiceAgentProfile.findUnique({ where: { id: profileId } });
      if (!profile) throw new BusinessException(ErrorCode.NOT_FOUND, "语音角色不存在");
      if (profile.status !== "PENDING_REVIEW") {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "只有待审核的角色可以审核通过");
      }
      const tier = options.tier ?? "lite";
      const version = profile.draftVersion;
      await tx.voiceAgentProfileVersion.create({
        data: {
          profileId,
          version,
          name: profile.name,
          persona: profile.persona,
          prompt: profile.prompt,
          voiceId: profile.voiceId,
          tier,
          approvedBy: reviewerId,
        },
      });
      const updated = await tx.voiceAgentProfile.updateMany({
        where: { id: profileId, status: "PENDING_REVIEW", draftVersion: version },
        data: {
          status: "APPROVED",
          tier,
          activeVersion: version,
          draftVersion: version + 1,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNote: options.note?.trim() || null,
        },
      });
      if (updated.count !== 1) throw new BusinessException(ErrorCode.CONFLICT, "角色状态已变化，请刷新后重试");
      return tx.voiceAgentProfile.findUniqueOrThrow({ where: { id: profileId } });
    }).then(async (profile) => {
      // 圈子语音助理开通即赠送圈主 500 分钟（决策人定：前期默认开通、默认赠送）。
      // 幂等键绑 profileId：驳回后重新提交再通过，也只送这一次。
      // 发放失败只记日志——角色已经审核通过了，不能因为送额度出错把审核结果回滚掉。
      if (profile.ownerType === "circle") {
        try {
          await this.quota?.grantCircleWelcome(profile.ownerId, profile.id);
        } catch (error: any) {
          this.logger.warn(`圈子语音助理赠送额度失败（角色已通过，可后台补发）：${profile.id} ${error?.message || error}`);
        }
      }
      return profile;
    });
  }

  async reject(profileId: string, reviewerId: string, note: string) {
    if (!note?.trim()) throw new BusinessException(ErrorCode.BAD_REQUEST, "请填写驳回原因，方便圈主修改");
    const result = await this.prisma.voiceAgentProfile.updateMany({
      where: { id: profileId, status: "PENDING_REVIEW" },
      data: { status: "REJECTED", reviewedBy: reviewerId, reviewedAt: new Date(), reviewNote: note.trim() },
    });
    if (result.count !== 1) throw new BusinessException(ErrorCode.BAD_REQUEST, "只有待审核的角色可以驳回");
    return this.prisma.voiceAgentProfile.findUniqueOrThrow({ where: { id: profileId } });
  }

  async disable(profileId: string, operatorId: string, note?: string) {
    const profile = await this.prisma.voiceAgentProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new BusinessException(ErrorCode.NOT_FOUND, "语音角色不存在");
    return this.prisma.voiceAgentProfile.update({
      where: { id: profileId },
      data: { status: "DISABLED", reviewedBy: operatorId, reviewedAt: new Date(), reviewNote: note?.trim() || "平台停用" },
    });
  }

  /** 恢复或回滚到指定已审核版本：把快照写回当前字段并设为已发布 */
  async publishVersion(profileId: string, version: number, operatorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const snap = await tx.voiceAgentProfileVersion.findUnique({ where: { profileId_version: { profileId, version } } });
      if (!snap) throw new BusinessException(ErrorCode.NOT_FOUND, "该版本不存在或未审核通过");
      return tx.voiceAgentProfile.update({
        where: { id: profileId },
        data: {
          name: snap.name,
          persona: snap.persona,
          prompt: snap.prompt,
          voiceId: snap.voiceId,
          tier: snap.tier,
          status: "APPROVED",
          activeVersion: version,
          reviewedBy: operatorId,
          reviewedAt: new Date(),
          reviewNote: `发布版本 v${version}`,
        },
      });
    });
  }

  /** 运行时读取：只返回已发布版本快照；未发布或停用返回 null（调用方据此拒绝开始语音会话） */
  async getPublished(ownerType: "circle" | "platform", ownerId: string) {
    const profile = await this.prisma.voiceAgentProfile.findUnique({ where: { ownerType_ownerId: { ownerType, ownerId } } });
    if (!profile || profile.status === "DISABLED" || profile.activeVersion == null) return null;
    return this.prisma.voiceAgentProfileVersion.findUnique({
      where: { profileId_version: { profileId: profile.id, version: profile.activeVersion } },
    });
  }
}
