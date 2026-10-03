import "reflect-metadata";

import { FeedbackController } from "./feedback.controller";
import { ROLES_KEY } from "../../common/roles.decorator";

describe("反馈敏感信息权限边界", () => {
  const rolesOf = (method: keyof FeedbackController) =>
    Reflect.getMetadata(ROLES_KEY, FeedbackController.prototype[method]) as string[];

  it("客服可以按需查看联系方式和正文", () => {
    expect(rolesOf("adminRevealContact")).toContain("CUSTOMER_SERVICE");
    expect(rolesOf("adminRevealContent")).toContain("CUSTOMER_SERVICE");
  });

  it("客服不能查看截图", () => {
    expect(rolesOf("adminRevealImages")).toEqual(["SUPER_ADMIN", "OPERATION_ADMIN"]);
  });

  it("三类敏感查看都使用不受基础设施白名单绕过的专用限流守卫", () => {
    for (const method of ["adminRevealContact", "adminRevealContent", "adminRevealImages"] as const) {
      const guards = (Reflect.getMetadata("__guards__", FeedbackController.prototype[method]) ?? [])
        .map((guard: { name?: string }) => guard.name);
      expect(guards).toContain("SensitiveRedisThrottleGuard");
    }
  });
});
