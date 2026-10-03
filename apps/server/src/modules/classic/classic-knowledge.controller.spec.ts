import "reflect-metadata";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../../common/roles.decorator";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { ClassicKnowledgeController } from "./classic-knowledge.controller";

describe("ClassicKnowledgeController 公开范围保护", () => {
  it("实体、统计、详情和路径查询统一要求平台管理角色", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ClassicKnowledgeController);
    const roles = Reflect.getMetadata(ROLES_KEY, ClassicKnowledgeController);

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual(["SUPER_ADMIN", "OPERATION_ADMIN"]);
  });

  it("普通用户不能读取混合来源的实体图谱", () => {
    const guard = new RolesGuard(new Reflector());
    const context = {
      getHandler: () => ClassicKnowledgeController.prototype.listEntities,
      getClass: () => ClassicKnowledgeController,
      switchToHttp: () => ({ getRequest: () => ({ user: { roles: ["USER"] } }) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(false);
  });

  it("平台管理员仍能读取实体图谱", () => {
    const guard = new RolesGuard(new Reflector());
    const context = {
      getHandler: () => ClassicKnowledgeController.prototype.listEntities,
      getClass: () => ClassicKnowledgeController,
      switchToHttp: () => ({ getRequest: () => ({ user: { roles: ["OPERATION_ADMIN"] } }) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });
});
