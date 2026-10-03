import { SetMetadata } from "@nestjs/common";
import { BusinessException } from "./business.exception";
import { ErrorCode } from "./error-codes";

/**
 * 三档自主分级（治理护栏 §2.1 · 自进化体系自主性阶梯 L1-L3 落地）
 *
 * 每个自动能力上线前必须显式标级，且**只能逐级晋升**（L1→L2→L3），不得跳级。
 * 这是"护栏先于放权"的第一道：先标清每个能力允许多大自主性，才谈得上放权。
 *
 *   L1 只建议     —— AI 出诊断+方案，人手动执行（默认级别·一切新能力起点）
 *   L2 一键执行   —— 人点一下，AI 执行（带前置校验+回滚）
 *   L3 带回滚自动 —— AI 在白名单+爆炸半径内自动执行，全程台账，异常自动熔断+告警
 *
 * 注意：L3 之上（L4 自愈自优化 / L5 自进化）不在护栏底座范围，且**永久不得触碰四红线**（见 red-lines.ts）。
 */
export enum AutonomyLevel {
  L1_SUGGEST = "L1",
  L2_ONE_CLICK = "L2",
  L3_AUTO_ROLLBACK = "L3",
}

export interface AutonomyMeta {
  /** 档位排序值（用于逐级晋升校验） */
  rank: number;
  /** 中文档名 */
  label: string;
  /** 谁动手 */
  actor: string;
  /** 一句话释义 */
  desc: string;
  /** 该档位人是否仍在环内（L1/L2 是，L3 事后可查） */
  humanInLoop: boolean;
}

export const AUTONOMY_META: Record<AutonomyLevel, AutonomyMeta> = {
  [AutonomyLevel.L1_SUGGEST]: {
    rank: 1,
    label: "只建议",
    actor: "AI建议·人执行",
    desc: "AI 给诊断+方案，人手动执行（默认级别）",
    humanInLoop: true,
  },
  [AutonomyLevel.L2_ONE_CLICK]: {
    rank: 2,
    label: "一键执行",
    actor: "人点·AI执行",
    desc: "人点一下，AI 执行（带前置校验+回滚）",
    humanInLoop: true,
  },
  [AutonomyLevel.L3_AUTO_ROLLBACK]: {
    rank: 3,
    label: "带回滚自动",
    actor: "AI自动（白名单+限半径）",
    desc: "白名单内自动执行，全程台账，异常自动熔断+告警",
    humanInLoop: false,
  },
};

/** 是否为合法分级取值 */
export function isAutonomyLevel(v: unknown): v is AutonomyLevel {
  return typeof v === "string" && (Object.values(AutonomyLevel) as string[]).includes(v);
}

/** 断言合法分级取值，非法抛 AUTONOMY_LEVEL_INVALID */
export function assertAutonomyLevel(v: unknown): AutonomyLevel {
  if (!isAutonomyLevel(v)) {
    throw new BusinessException(ErrorCode.AUTONOMY_LEVEL_INVALID, `非法自主分级：${String(v)}`);
  }
  return v;
}

/**
 * 逐级晋升校验：只能升一级（L1→L2→L3），不得跳级、不得原地、不得降级走此路。
 * 降级（收紧自主性）不受此约束，应始终允许——收权比放权安全。
 */
export function canPromote(from: AutonomyLevel, to: AutonomyLevel): boolean {
  return AUTONOMY_META[to].rank - AUTONOMY_META[from].rank === 1;
}

/** 断言晋升合法，越级抛 AUTONOMY_ILLEGAL_PROMOTION */
export function assertPromote(from: AutonomyLevel, to: AutonomyLevel): void {
  if (!canPromote(from, to)) {
    throw new BusinessException(
      ErrorCode.AUTONOMY_ILLEGAL_PROMOTION,
      `分级晋升越级：${from}(${AUTONOMY_META[from].label}) → ${to}(${AUTONOMY_META[to].label})，只能逐级 L1→L2→L3`,
    );
  }
}

/** 是否为降级/收权（始终允许） */
export function isDemotion(from: AutonomyLevel, to: AutonomyLevel): boolean {
  return AUTONOMY_META[to].rank < AUTONOMY_META[from].rank;
}

// ─────────────────────────────────────────────────
// @Autonomy(level) —— 给自动能力端点/处理器标级（元数据）
// 供审计与治理盘点读取："每个自动能力在代码里有明确 L1/L2/L3 标注"（验收标准一）
// ─────────────────────────────────────────────────

export const AUTONOMY_LEVEL_KEY = "autonomy_level";

export const Autonomy = (level: AutonomyLevel) => SetMetadata(AUTONOMY_LEVEL_KEY, level);
