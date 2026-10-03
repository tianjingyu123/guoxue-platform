import { Reflector } from "@nestjs/core";
import { ExecutionContext } from "@nestjs/common";
import {
  RedLine,
  RED_LINE_META,
  RED_LINE_KEY,
  RedLineGuard,
  resolveExecutorType,
  assertHumanForRedLine,
} from "./red-lines";
import { BusinessException } from "./business.exception";
import { ErrorCode } from "./error-codes";

describe("四红线 RedLine（治理护栏 §2.2）", () => {
  it("五类红线齐备且各有中文档名", () => {
    expect(Object.keys(RED_LINE_META).sort()).toEqual(
      [
        RedLine.MONEY,
        RedLine.USER_DATA,
        RedLine.EXTERNAL_PUBLISH,
        RedLine.IRREVERSIBLE,
        RedLine.COMPLIANCE,
      ].sort(),
    );
    expect(RED_LINE_META[RedLine.MONEY].label).toBe("钱");
  });

  describe("resolveExecutorType 执行者判定", () => {
    it("显式头 x-executor-type=CLAUDE → 自动化", () => {
      expect(resolveExecutorType({ headers: { "x-executor-type": "CLAUDE" } })).toBe("AUTOMATION");
      expect(resolveExecutorType({ headers: { "x-executor-type": "automation" } })).toBe("AUTOMATION");
    });
    it("数字员工身份 → 自动化", () => {
      expect(resolveExecutorType({ user: { isDigitalEmployee: true } })).toBe("AUTOMATION");
      expect(resolveExecutorType({ user: { automationRole: "DIGITAL_EMPLOYEE" } })).toBe("AUTOMATION");
    });
    it("普通管理员/无标记 → 真人", () => {
      expect(resolveExecutorType({ user: { isDigitalEmployee: false } })).toBe("HUMAN");
      expect(resolveExecutorType({})).toBe("HUMAN");
    });
  });

  describe("assertHumanForRedLine 服务层兜底", () => {
    it("自动化触碰红线 → RED_LINE_HUMAN_ONLY", () => {
      try {
        assertHumanForRedLine("AUTOMATION", [RedLine.MONEY]);
        fail("应抛异常");
      } catch (e) {
        expect((e as BusinessException).errorCode).toBe(ErrorCode.RED_LINE_HUMAN_ONLY);
      }
    });
    it("真人触碰红线 → 放行", () => {
      expect(() => assertHumanForRedLine("HUMAN", [RedLine.MONEY, RedLine.IRREVERSIBLE])).not.toThrow();
    });
    it("自动化但无红线 → 放行", () => {
      expect(() => assertHumanForRedLine("AUTOMATION", [])).not.toThrow();
    });
  });

  describe("RedLineGuard HTTP 硬闸", () => {
    const reflector = new Reflector();
    const guard = new RedLineGuard(reflector);

    function ctx(marks: RedLine[] | undefined, req: unknown): ExecutionContext {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(marks);
      return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({ getRequest: () => req }),
      } as unknown as ExecutionContext;
    }

    it("未标红线端点 → 放行", () => {
      expect(guard.canActivate(ctx(undefined, {}))).toBe(true);
    });

    it("标红线 + 真人 → 放行", () => {
      expect(guard.canActivate(ctx([RedLine.MONEY], { user: {} }))).toBe(true);
    });

    it("标红线 + 自动化 → 永久 403", () => {
      try {
        guard.canActivate(ctx([RedLine.MONEY], { headers: { "x-executor-type": "CLAUDE" }, method: "POST", url: "/x" }));
        fail("应抛异常");
      } catch (e) {
        expect((e as BusinessException).errorCode).toBe(ErrorCode.RED_LINE_HUMAN_ONLY);
      }
    });
  });

  it("RED_LINE_KEY 元数据键稳定", () => {
    expect(RED_LINE_KEY).toBe("red_line");
  });
});
