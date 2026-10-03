import {
  AutonomyLevel,
  AUTONOMY_META,
  isAutonomyLevel,
  assertAutonomyLevel,
  canPromote,
  assertPromote,
  isDemotion,
} from "./autonomy";
import { BusinessException } from "./business.exception";
import { ErrorCode } from "./error-codes";

describe("自主分级 AutonomyLevel（治理护栏 §2.1）", () => {
  it("三档取值与 rank 单调递增", () => {
    expect(AUTONOMY_META[AutonomyLevel.L1_SUGGEST].rank).toBe(1);
    expect(AUTONOMY_META[AutonomyLevel.L2_ONE_CLICK].rank).toBe(2);
    expect(AUTONOMY_META[AutonomyLevel.L3_AUTO_ROLLBACK].rank).toBe(3);
  });

  it("L1/L2 人在环内，L3 事后可查", () => {
    expect(AUTONOMY_META[AutonomyLevel.L1_SUGGEST].humanInLoop).toBe(true);
    expect(AUTONOMY_META[AutonomyLevel.L2_ONE_CLICK].humanInLoop).toBe(true);
    expect(AUTONOMY_META[AutonomyLevel.L3_AUTO_ROLLBACK].humanInLoop).toBe(false);
  });

  it("isAutonomyLevel 识别合法/非法取值", () => {
    expect(isAutonomyLevel("L1")).toBe(true);
    expect(isAutonomyLevel("L3")).toBe(true);
    expect(isAutonomyLevel("L4")).toBe(false);
    expect(isAutonomyLevel("")).toBe(false);
    expect(isAutonomyLevel(3)).toBe(false);
  });

  it("assertAutonomyLevel 非法抛 AUTONOMY_LEVEL_INVALID", () => {
    expect(assertAutonomyLevel("L2")).toBe(AutonomyLevel.L2_ONE_CLICK);
    try {
      assertAutonomyLevel("L9");
      fail("应抛异常");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessException);
      expect((e as BusinessException).errorCode).toBe(ErrorCode.AUTONOMY_LEVEL_INVALID);
    }
  });

  describe("逐级晋升 canPromote", () => {
    it("只允许升一级", () => {
      expect(canPromote(AutonomyLevel.L1_SUGGEST, AutonomyLevel.L2_ONE_CLICK)).toBe(true);
      expect(canPromote(AutonomyLevel.L2_ONE_CLICK, AutonomyLevel.L3_AUTO_ROLLBACK)).toBe(true);
    });
    it("禁止跳级 L1→L3", () => {
      expect(canPromote(AutonomyLevel.L1_SUGGEST, AutonomyLevel.L3_AUTO_ROLLBACK)).toBe(false);
    });
    it("禁止原地 L2→L2", () => {
      expect(canPromote(AutonomyLevel.L2_ONE_CLICK, AutonomyLevel.L2_ONE_CLICK)).toBe(false);
    });
    it("禁止用晋升通道降级 L3→L2", () => {
      expect(canPromote(AutonomyLevel.L3_AUTO_ROLLBACK, AutonomyLevel.L2_ONE_CLICK)).toBe(false);
    });
  });

  it("assertPromote 越级抛 AUTONOMY_ILLEGAL_PROMOTION", () => {
    expect(() =>
      assertPromote(AutonomyLevel.L1_SUGGEST, AutonomyLevel.L2_ONE_CLICK),
    ).not.toThrow();
    try {
      assertPromote(AutonomyLevel.L1_SUGGEST, AutonomyLevel.L3_AUTO_ROLLBACK);
      fail("应抛异常");
    } catch (e) {
      expect((e as BusinessException).errorCode).toBe(ErrorCode.AUTONOMY_ILLEGAL_PROMOTION);
    }
  });

  it("isDemotion 识别降级（收权始终允许）", () => {
    expect(isDemotion(AutonomyLevel.L3_AUTO_ROLLBACK, AutonomyLevel.L1_SUGGEST)).toBe(true);
    expect(isDemotion(AutonomyLevel.L2_ONE_CLICK, AutonomyLevel.L1_SUGGEST)).toBe(true);
    expect(isDemotion(AutonomyLevel.L1_SUGGEST, AutonomyLevel.L2_ONE_CLICK)).toBe(false);
  });
});
