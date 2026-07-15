import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { encrypt, decrypt } from "../../common/crypto.util";
import { HuifuService } from "../huifu/huifu.service";

/**
 * 收款主体（分账接收方）进件服务 —— 资金架构的地基。
 * 设计见 docs/design/资金与分账架构-设计文档-20260714.md
 *
 * 【一条铁律】平台永不做「收了再转」。
 * 二清的判定核心不是「钱有没有经过平台账户」，而是「资金的分发指令由谁执行」：
 *   - 平台把钱从自己账户转给商家/驿站/圈主 → 二清（无证清算，违法）
 *   - 平台只下达分账指令、由持牌机构（汇付）执行分发 → 合规
 * 进件就是让这些主体在汇付眼里「存在」（拿到 huifu_id），持牌机构才有分发对象。
 *
 * 【责任跟着钱走】
 * SELF_COLLECT：钱直接进主体自己的渠道账户，商品/服务/纠纷责任随之外移到主体。
 * PLATFORM_COLLECT：平台是收款主体，即法律意义上的经营者，要担全部责任。
 * 能否 SELF_COLLECT 的唯一硬条件是【有没有营业执照】——个人办不下商户号，这是物理前提。
 */
@Injectable()
export class PayeeAccountService {
  private readonly logger = new Logger(PayeeAccountService.name);

  /** 主体类型 → 平台分成比例（董事长 2026-07-14 拍板） */
  private static readonly PLATFORM_RATES: Record<string, { selfCollect: number; platformCollect: number }> = {
    // 圈子双轨：费率差本身就是治理工具 —— 圈主收入越大，30 个点的差价越肉疼，
    // 他自己会去办执照。平台背高风险时收高价，风险外移后主动降价，定价与风险严格对称。
    CIRCLE: { platformCollect: 0.5, selfCollect: 0.2 },
    // 驿站：松散赋能，驿站是独立经营者、平台是技术服务商。
    // 30% 正好卡在微信分账上限（且微信基数是扣费后金额，实际会超限）→ 默认走汇付。
    OFFLINE_STATION: { platformCollect: 0.3, selfCollect: 0.3 },
    // 商家：货款金额最大、二清风险最高，必须自收款。费率按类目，此处为兜底默认。
    MERCHANT: { platformCollect: 0.15, selfCollect: 0.15 },
    // 研究院：独立公司主体，平台不碰它的钱（关联交易，非二清）。
    INSTITUTE: { platformCollect: 0, selfCollect: 0 },
  };

  private static readonly SUBJECT_TYPES = ["MERCHANT", "OFFLINE_STATION", "CIRCLE", "INSTITUTE"];

  constructor(
    private prisma: PrismaService,
    private huifu: HuifuService,
  ) {}

  /**
   * 解析某主体的收款口径 —— 分账/下单时的唯一入口。
   * 没有 PayeeAccount 或未 ACTIVE，一律按 PLATFORM_COLLECT 处理（保守：钱先进平台，不会分错人）。
   */
  async resolveSettlement(subjectType: string, subjectId: string) {
    const acct = await this.prisma.payeeAccount.findUnique({
      where: { subjectType_subjectId: { subjectType, subjectId } },
    });

    const rates = PayeeAccountService.PLATFORM_RATES[subjectType];
    // 只有「进件通过(ACTIVE) + 拿到渠道商户号」才算真能自收款 ——
    // 状态是 SELF_COLLECT 但没有 huifuId，钱会无处可去。
    const canSelfCollect =
      acct?.settlementMode === "SELF_COLLECT" && acct.status === "ACTIVE" && !!acct.huifuId;

    // 费率必须跟着「谁收款」走，不能跟着历史状态走：
    // 圈主进件通过时 platformRate 被降到 0.2，若他之后被 DISABLED（或渠道号失效），
    // 钱重新由平台代收 —— 平台重新承担 100% 的经营者责任，费率就必须回到平台收款档 0.5。
    // 否则平台担全责却只抽 20%。
    const platformRate = canSelfCollect
      ? Number(acct!.platformRate)
      : (rates?.platformCollect ?? (acct ? Number(acct.platformRate) : 0));

    return {
      settlementMode: canSelfCollect ? "SELF_COLLECT" : "PLATFORM_COLLECT",
      /** SELF_COLLECT：钱进这个 huifuId，平台按 platformRate 分账取走服务费 */
      payeeHuifuId: canSelfCollect ? acct!.huifuId : null,
      platformRate,
      accountId: acct?.id ?? null,
      status: acct?.status ?? "NONE",
    };
  }

  /** 查主体的收款账户（不返回任何密文/明文敏感字段） */
  async getAccount(subjectType: string, subjectId: string) {
    const acct = await this.prisma.payeeAccount.findUnique({
      where: { subjectType_subjectId: { subjectType, subjectId } },
    });
    if (!acct) return null;
    return this.desensitize(acct);
  }

  /**
   * 提交/更新进件资质（DRAFT）。
   * 身份证号与银行账号加密落库（crypto.util），与 Merchant.idCardNumber 同一套 M4 加密体系。
   */
  async saveQualification(
    userId: string,
    dto: {
      subjectType: string;
      subjectId: string;
      subjectName: string;
      licenseNo: string;
      licenseImage?: string;
      legalName: string;
      legalIdCard: string;
      legalIdFront?: string;
      legalIdBack?: string;
      bankName?: string;
      bankBranch?: string;
      bankAccount: string;
      bankHolder: string;
    },
  ) {
    if (!PayeeAccountService.SUBJECT_TYPES.includes(dto.subjectType)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `不支持的主体类型：${dto.subjectType}`);
    }
    await this.assertSubjectOwner(userId, dto.subjectType, dto.subjectId);

    const existing = await this.prisma.payeeAccount.findUnique({
      where: { subjectType_subjectId: { subjectType: dto.subjectType, subjectId: dto.subjectId } },
    });
    // 已提交渠道的不允许再改资料 —— 改了会与渠道那边的档案不一致，出问题无从对账
    if (existing && !["DRAFT", "REJECTED"].includes(existing.status)) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "该主体已提交进件，资料不可修改。如需变更请先联系平台驳回。",
      );
    }

    const rates = PayeeAccountService.PLATFORM_RATES[dto.subjectType];
    const data = {
      subjectType: dto.subjectType,
      subjectId: dto.subjectId,
      userId,
      subjectName: dto.subjectName,
      licenseNo: dto.licenseNo,
      licenseImage: dto.licenseImage,
      legalName: dto.legalName,
      legalIdCard: encrypt(dto.legalIdCard),
      legalIdFront: dto.legalIdFront,
      legalIdBack: dto.legalIdBack,
      bankName: dto.bankName,
      bankBranch: dto.bankBranch,
      bankAccount: encrypt(dto.bankAccount),
      bankHolder: dto.bankHolder,
      status: "DRAFT",
      rejectReason: null,
    };

    const acct = await this.prisma.payeeAccount.upsert({
      where: { subjectType_subjectId: { subjectType: dto.subjectType, subjectId: dto.subjectId } },
      create: {
        ...data,
        // 资质未通过前一律平台收款；进件成功才切 SELF_COLLECT（见 activate）
        settlementMode: "PLATFORM_COLLECT",
        platformRate: rates?.platformCollect ?? 0,
      },
      update: data,
    });

    this.logger.log(`收款主体资质已保存：${dto.subjectType}/${dto.subjectId}（status=DRAFT）`);
    return this.desensitize(acct);
  }

  /**
   * 提交汇付进件（DRAFT/REJECTED → SUBMITTED）。
   * 敏感字段在此解密后传给渠道，不落任何明文。
   */
  async submitToChannel(accountId: string, operatorId: string) {
    const acct = await this.prisma.payeeAccount.findUnique({ where: { id: accountId } });
    if (!acct) throw new BusinessException(ErrorCode.NOT_FOUND, "收款账户不存在");
    if (!["DRAFT", "REJECTED"].includes(acct.status)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `当前状态 ${acct.status} 不可提交进件`);
    }
    // 无执照 = 无法进件 = 无法自收款 = 只能平台代收 = 二清。执照不是形式要求，是物理前提。
    if (!acct.licenseNo || !acct.subjectName || !acct.legalName || !acct.legalIdCard || !acct.bankAccount) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "进件资料不完整（营业执照/法人/结算账户为必填）");
    }

    // CAS：防两个管理员并发提交 → 渠道重复开户
    const claimed = await this.prisma.payeeAccount.updateMany({
      where: { id: accountId, status: acct.status },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });
    if (claimed.count === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该进件已被处理，请刷新后重试");
    }

    try {
      const res = await this.huifu.applyEntMerchant({
        subjectName: acct.subjectName,
        licenseNo: acct.licenseNo,
        legalName: acct.legalName,
        legalIdCard: decrypt(acct.legalIdCard),
        bankAccount: decrypt(acct.bankAccount),
        bankHolder: acct.bankHolder || acct.subjectName,
        bankName: acct.bankName || undefined,
        contactName: acct.legalName,
        contactPhone: "",
        entType: acct.subjectType === "CIRCLE" ? "2" : "1", // 圈主多为个体工商户
      } as never);

      if (!res.ok) {
        await this.prisma.payeeAccount.update({
          where: { id: accountId },
          data: { status: "REJECTED", rejectReason: `渠道拒绝：${res.respDesc || res.respCode}` },
        });
        throw new BusinessException(ErrorCode.BAD_REQUEST, `汇付进件失败：${res.respDesc || res.respCode}`);
      }

      // 汇付同步返回 huifu_id 则直接激活；否则进入审核中，等轮询/回调
      const updated = res.huifuId
        ? await this.activate(accountId, res.huifuId)
        : await this.prisma.payeeAccount.update({
            where: { id: accountId },
            data: { status: "APPROVING", channelApplyId: res.applyId },
          });

      this.logger.log(`进件已提交汇付：account=${accountId} applyId=${res.applyId} by=${operatorId}`);
      return this.desensitize(updated);
    } catch (e) {
      // 提交失败必须把状态放回去，否则会永久卡在 SUBMITTED（既不能改资料、也不能重提）
      if (!(e instanceof BusinessException)) {
        await this.prisma.payeeAccount.updateMany({
          where: { id: accountId, status: "SUBMITTED" },
          data: { status: acct.status, rejectReason: "渠道调用异常，请重试" },
        });
      }
      throw e;
    }
  }

  /**
   * 进件通过 —— 拿到渠道商户号，主体从此在汇付眼里「存在」，可以自收款、可以做分账接收方。
   * 同时切 SELF_COLLECT 并把平台分成降到自收款档（圈子 50% → 20%）。
   */
  async activate(accountId: string, huifuId: string) {
    const acct = await this.prisma.payeeAccount.findUnique({ where: { id: accountId } });
    if (!acct) throw new BusinessException(ErrorCode.NOT_FOUND, "收款账户不存在");

    const rates = PayeeAccountService.PLATFORM_RATES[acct.subjectType];
    const updated = await this.prisma.payeeAccount.update({
      where: { id: accountId },
      data: {
        status: "ACTIVE",
        huifuId,
        activatedAt: new Date(),
        rejectReason: null,
        settlementMode: "SELF_COLLECT",
        // 责任外移到主体了，平台分成随之降档（圈子 0.5 → 0.2）
        platformRate: rates?.selfCollect ?? Number(acct.platformRate),
      },
    });
    this.logger.log(
      `收款主体已激活：${acct.subjectType}/${acct.subjectId} huifuId=${huifuId} ` +
        `→ SELF_COLLECT，平台分成 ${Number(acct.platformRate)} → ${rates?.selfCollect}`,
    );
    return updated;
  }

  /** 轮询渠道审核进度（APPROVING → ACTIVE / REJECTED） */
  async syncChannelStatus(accountId: string) {
    const acct = await this.prisma.payeeAccount.findUnique({ where: { id: accountId } });
    if (!acct) throw new BusinessException(ErrorCode.NOT_FOUND, "收款账户不存在");
    if (acct.status !== "APPROVING" || !acct.channelApplyId) {
      return this.desensitize(acct);
    }

    const reqDate = (acct.submittedAt ?? new Date()).toISOString().slice(0, 10).replace(/-/g, "");
    const res = await this.huifu.queryMerchantApply(acct.channelApplyId, reqDate);

    if (res.status === "ACTIVE" && res.huifuId) {
      return this.desensitize(await this.activate(accountId, res.huifuId));
    }
    if (res.status === "REJECTED") {
      return this.desensitize(
        await this.prisma.payeeAccount.update({
          where: { id: accountId },
          data: { status: "REJECTED", rejectReason: res.rejectReason || "渠道审核未通过" },
        }),
      );
    }
    return this.desensitize(acct);
  }

  /** 主体归属校验：只有主体的负责人能提交自己的资质 */
  /** 解析主体负责人 userId（不存在返回 null） */
  private async resolveSubjectOwnerId(subjectType: string, subjectId: string): Promise<string | null> {
    switch (subjectType) {
      case "MERCHANT": {
        const m = await this.prisma.merchant.findUnique({ where: { id: subjectId }, select: { userId: true } });
        return m?.userId ?? null;
      }
      case "OFFLINE_STATION": {
        const s = await this.prisma.stationOffline.findUnique({ where: { id: subjectId }, select: { ownerUserId: true } });
        return s?.ownerUserId ?? null;
      }
      case "CIRCLE": {
        const c = await this.prisma.circle.findUnique({ where: { id: subjectId }, select: { ownerId: true } });
        return c?.ownerId ?? null;
      }
      case "INSTITUTE": {
        // 研究院的负责人 = 其挂靠圈子的圈主（Institute.circleId 可空 → 未挂圈子则无从校验归属）
        const i = await this.prisma.institute.findUnique({ where: { id: subjectId }, select: { circleId: true } });
        if (i?.circleId) {
          const c = await this.prisma.circle.findUnique({ where: { id: i.circleId }, select: { ownerId: true } });
          return c?.ownerId ?? null;
        }
        return null;
      }
      default:
        return null;
    }
  }

  private async assertSubjectOwner(userId: string, subjectType: string, subjectId: string) {
    const ownerId = await this.resolveSubjectOwnerId(subjectType, subjectId);
    if (!ownerId) throw new BusinessException(ErrorCode.NOT_FOUND, "主体不存在");
    if (ownerId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能提交自己主体的收款资质");
  }

  /**
   * 查看权校验(后端审计P2·越权)：getAccount/resolveSettlement 原仅 JwtAuthGuard，
   * 任意登录用户可枚举任意主体的 payeeHuifuId(汇付商户号)+platformRate。
   * 管理端角色放行(监督)，其余仅主体负责人可查。
   */
  async assertSubjectViewable(userId: string, roles: string[], subjectType: string, subjectId: string) {
    const ADMIN_ROLES = ["SUPER_ADMIN", "FINANCE_ADMIN", "OPERATION_ADMIN"];
    if (roles.some((r) => ADMIN_ROLES.includes(r))) return;
    const ownerId = await this.resolveSubjectOwnerId(subjectType, subjectId);
    if (!ownerId) throw new BusinessException(ErrorCode.NOT_FOUND, "主体不存在");
    if (ownerId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能查看自己主体的收款信息");
  }

  /** 对外一律脱敏：法人身份证与结算账号只回尾号，明文/密文都不出接口 */
  private desensitize<T extends { legalIdCard?: string | null; bankAccount?: string | null }>(acct: T) {
    const tail = (enc?: string | null) => {
      if (!enc) return null;
      try {
        const plain = decrypt(enc);
        return plain.length > 4 ? `****${plain.slice(-4)}` : "****";
      } catch {
        return "****";
      }
    };
    return { ...acct, legalIdCard: tail(acct.legalIdCard), bankAccount: tail(acct.bankAccount) };
  }
}
