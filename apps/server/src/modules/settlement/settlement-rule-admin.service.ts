import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { SplitDef } from "./settlement.service";
import { CreateSettlementRuleDto, UpdateSettlementRuleDto } from "./settlement-rule.dto";

const VALID_BASIS = ["GROSS", "PARENT_SPLIT"];
const VALID_CATEGORY = ["COMMISSION", "SERVICE", "PLATFORM"];
/** 计酬合规硬约束（《禁止传销条例》）：推广计酬(COMMISSION)条目不得超过两条 —— 配置时即拒，与引擎 L1 同源 */
const MAX_COMMISSION_SPLITS = 2;
/** 浮点比较容差 */
const EPSILON = 1e-9;

/**
 * 结算规则后台管理（C7）—— 与结算引擎（SettlementService）职责分离：
 * 引擎只读规则执行分账，本服务负责规则的管理 CRUD 与资金安全强校验。
 * 规则只停用不删除（无 DELETE），防止引擎回退到错误默认行为。
 */
@Injectable()
export class SettlementRuleAdminService {
  private readonly logger = new Logger(SettlementRuleAdminService.name);

  constructor(private prisma: PrismaService) {}

  /** 规则列表（约12条场景，全量按 scene 排序，无需分页） */
  async listRules() {
    const items = await this.prisma.settlementRule.findMany({ orderBy: { scene: "asc" } });
    return { items };
  }

  /** 创建规则（scene 唯一；updatedBy 写管理员 userId，种子据此不覆盖人工配置） */
  async createRule(dto: CreateSettlementRuleDto, adminId: string) {
    const splits = this.validateSplits(dto.splits);
    const scene = dto.scene.trim();
    if (!scene) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "scene 不能为空");
    }

    const existing = await this.prisma.settlementRule.findUnique({ where: { scene } });
    if (existing) {
      throw new BusinessException(ErrorCode.CONFLICT, `场景 ${scene} 已存在结算规则，请编辑现有规则`);
    }

    const rule = await this.prisma.settlementRule.create({
      data: {
        scene,
        splits: splits as unknown as Prisma.InputJsonValue,
        bufferDays: dto.bufferDays ?? 7,
        requireApproval: dto.requireApproval ?? false,
        approvalThreshold: dto.approvalThreshold ?? null,
        enabled: dto.enabled ?? true,
        remark: dto.remark ?? null,
        updatedBy: adminId,
      },
    });
    this.logger.log(`[规则管理] 管理员 ${adminId} 创建结算规则 scene=${scene} splits=${JSON.stringify(splits)}`);
    return rule;
  }

  /** 更新规则（禁止改 scene —— scene 是引擎查找键；updatedBy 写管理员 userId） */
  async updateRule(id: string, dto: UpdateSettlementRuleDto, adminId: string) {
    // 防御性拒绝：DTO 层已不收 scene（forbidNonWhitelisted 400），此处再拦一道防止服务被绕过调用
    if ("scene" in (dto as Record<string, unknown>)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "scene 是结算引擎查找键，禁止修改");
    }

    const existing = await this.prisma.settlementRule.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "结算规则不存在");
    }

    const data: Prisma.SettlementRuleUpdateInput = { updatedBy: adminId };
    if (dto.splits !== undefined) {
      data.splits = this.validateSplits(dto.splits) as unknown as Prisma.InputJsonValue;
    }
    if (dto.bufferDays !== undefined) data.bufferDays = dto.bufferDays;
    if (dto.requireApproval !== undefined) data.requireApproval = dto.requireApproval;
    if (dto.approvalThreshold !== undefined) data.approvalThreshold = dto.approvalThreshold;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.remark !== undefined) data.remark = dto.remark;

    const rule = await this.prisma.settlementRule.update({ where: { id }, data });
    this.logger.log(
      `[规则管理] 管理员 ${adminId} 更新结算规则 scene=${existing.scene} 变更=${JSON.stringify(dto)}`,
    );
    return rule;
  }

  /**
   * splits 强校验（资金安全）：
   * - 非空数组，每项 { role, rate, basis, category, parentRole? }
   * - role 非空字符串；rate ∈ (0,1]；basis/category 枚举合法
   * - PARENT_SPLIT 的 parentRole 必须引用数组中先于本条出现的 role（引擎按序计算基数）
   * - 所有 rate 加总 ≤ 1（超发保护，PARENT_SPLIT 基数更小故该口径偏保守）
   * - COMMISSION 条目 ≤ 2（两级计酬合规红线，配置时即拒）
   */
  private validateSplits(splits: unknown): SplitDef[] {
    if (!Array.isArray(splits) || splits.length === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "splits 必须是非空数组");
    }

    const seenRoles: string[] = [];
    let rateSum = 0;
    let commissionCount = 0;

    for (let i = 0; i < splits.length; i++) {
      const item = splits[i] as Record<string, unknown>;
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, `splits[${i}] 必须是对象`);
      }
      const { role, rate, basis, category, parentRole } = item;
      if (typeof role !== "string" || role.trim() === "") {
        throw new BusinessException(ErrorCode.BAD_REQUEST, `splits[${i}].role 必须是非空字符串`);
      }
      if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0 || rate > 1) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, `splits[${i}].rate 必须在 (0, 1] 区间内`);
      }
      if (typeof basis !== "string" || !VALID_BASIS.includes(basis)) {
        throw new BusinessException(
          ErrorCode.BAD_REQUEST,
          `splits[${i}].basis 必须是 ${VALID_BASIS.join("/")} 之一`,
        );
      }
      if (typeof category !== "string" || !VALID_CATEGORY.includes(category)) {
        throw new BusinessException(
          ErrorCode.BAD_REQUEST,
          `splits[${i}].category 必须是 ${VALID_CATEGORY.join("/")} 之一`,
        );
      }
      if (basis === "PARENT_SPLIT") {
        if (typeof parentRole !== "string" || !seenRoles.includes(parentRole)) {
          throw new BusinessException(
            ErrorCode.BAD_REQUEST,
            `splits[${i}].parentRole 必须引用数组中先于本条出现的 role（引擎按序计算分账基数）`,
          );
        }
      }
      if (category === "COMMISSION") commissionCount++;
      rateSum += rate;
      seenRoles.push(role);
    }

    if (rateSum > 1 + EPSILON) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `splits 比例合计 ${rateSum} 超过 1，存在超发风险，拒绝保存`,
      );
    }
    if (commissionCount > MAX_COMMISSION_SPLITS) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `推广计酬(COMMISSION)条目 ${commissionCount} 条超过两级上限，违反计酬合规红线`,
      );
    }

    return splits as SplitDef[];
  }
}
