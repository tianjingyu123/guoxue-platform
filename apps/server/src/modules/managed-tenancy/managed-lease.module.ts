import { Body, CanActivate, Controller, ExecutionContext, Get, HttpCode, Inject, Injectable, Module, Param, Post, Put, Query, Req, UseGuards, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { ManagedLeaseRuntime, ManagedResourceKind, ManagedLeaseContext } from "./managed-lease.runtime";

type ManagedRequest = Request & { managedContext: ManagedLeaseContext };
function header(req: Request, name: string, fallback = "") {
  const value = req.headers[name];
  if (value !== undefined && typeof value !== "string") throw new UnauthorizedException("请求头必须为单一值");
  return value || fallback;
}

export const MANAGED_LEASE_RUNTIME = Symbol("MANAGED_LEASE_RUNTIME");
@Injectable()
export class ManagedLeaseGuard implements CanActivate {
  constructor(@Inject(MANAGED_LEASE_RUNTIME) private readonly runtime: ManagedLeaseRuntime) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<ManagedRequest>();
    const authorization = request.headers.authorization;
    const clientKey = request.headers["x-app-client"];
    if (typeof authorization !== "string" || !authorization.startsWith("Bearer ") || typeof clientKey !== "string") throw new UnauthorizedException("客户令牌与应用选择器缺失");
    request.managedContext = await this.runtime.authenticate(authorization.slice(7), clientKey);
    return true;
  }
}
@Controller("lease")
@UseGuards(ManagedLeaseGuard)
export class ManagedLeaseController {
  constructor(@Inject(MANAGED_LEASE_RUNTIME) private readonly runtime: ManagedLeaseRuntime) {}
  @Get("context") context(@Req() req: ManagedRequest) { return this.runtime.context(req.managedContext); }
  @Get("presentation") presentation(@Req() req: ManagedRequest) { return this.runtime.presentation(req.managedContext, header(req, "x-native-build"), header(req, "x-client-capabilities"), header(req, "x-resource-version", "0")); }
  @Get("resources") resources(@Req() req: ManagedRequest, @Query("kind") kind: ManagedResourceKind, @Query("q") q?: string) { return this.runtime.resources(req.managedContext, kind, q); }
  @Get("courses/:id/chapters") chapters(@Req() req: ManagedRequest, @Param("id") id: string) { return this.runtime.courseChapters(req.managedContext, id); }
  @Get("courses/:id/chapters/:chapterId") chapter(@Req() req: ManagedRequest, @Param("id") id: string, @Param("chapterId") chapterId: string) { return this.runtime.courseChapter(req.managedContext, id, chapterId); }
  @Get("courses/:id/progress") progress(@Req() req: ManagedRequest, @Param("id") id: string) { return this.runtime.courseProgress(req.managedContext, id); }
  @Put("courses/:id/chapters/:chapterId/progress") saveProgress(@Req() req: ManagedRequest, @Param("id") id: string, @Param("chapterId") chapterId: string, @Body() body: unknown) { return this.runtime.updateCourseProgress(req.managedContext, id, chapterId, body); }
  @Put("products") products(@Req() req: ManagedRequest, @Body() body: unknown) { return this.runtime.updateProducts(req.managedContext, body); }
  @Post("circles") circles(@Req() req: ManagedRequest, @Body() body: { name: string; intro: string }) { return this.runtime.createCircle(req.managedContext, body); }
  @Get("orders/:id") order(@Req() req: ManagedRequest, @Param("id") id: string) { return this.runtime.order(req.managedContext, id); }
  @Get("agents/:id/knowledge") knowledge(@Req() req: ManagedRequest, @Param("id") id: string, @Query("q") q: string) { return this.runtime.knowledge(req.managedContext, id, q); }
  @Post("aftercare") aftercare(@Req() req: ManagedRequest, @Body() body: { orderId: string; requestKey: string; reason: string }) { return this.runtime.aftercare(req.managedContext, body); }
  @Post("exports") export(@Req() req: ManagedRequest, @Body() body: unknown) {
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length) throw new UnauthorizedException("导出范围由服务端合同固定");
    return this.runtime.exportData(req.managedContext);
  }
  @Get("exports/:id") download(@Req() req: ManagedRequest, @Param("id") id: string) { return this.runtime.downloadExport(req.managedContext, id, header(req, "x-export-token")); }
  @Post("exports/paged") pagedExport(@Req() req: ManagedRequest, @Body() body: unknown) {
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length) throw new UnauthorizedException("导出范围由服务端合同固定");
    return this.runtime.exportPaged(req.managedContext);
  }
  @Get("exports/:id/pages/:collection/:page") page(@Req() req: ManagedRequest, @Param("id") id: string, @Param("collection") collection: string, @Param("page") page: string) { return this.runtime.downloadExportPage(req.managedContext, id, collection, page, header(req, "x-export-token")); }
  @Put("auth/password") password(@Req() req: ManagedRequest, @Body() body: unknown) { return this.runtime.changeLocalPassword(req.managedContext, body, req.socket.remoteAddress || "unknown"); }
  @Post("auth/logout") @HttpCode(200) logout(@Req() req: ManagedRequest, @Body() body: unknown) { return this.runtime.logoutLocal(req.managedContext, body); }
}
@Controller("lease/auth")
export class ManagedLeaseLoginController {
  constructor(@Inject(MANAGED_LEASE_RUNTIME) private readonly runtime: ManagedLeaseRuntime) {}
  @Post("register") register(@Req() req: Request, @Body() body: unknown) { return this.runtime.registerLocal(header(req, "x-app-client"), body, req.socket.remoteAddress || "unknown"); }
  @Post("login") @HttpCode(200) login(@Req() req: Request, @Body() body: unknown) { return this.runtime.loginLocal(header(req, "x-app-client"), body, req.socket.remoteAddress || "unknown"); }
  @Post("refresh") @HttpCode(200) refresh(@Req() req: Request, @Body() body: unknown) { return this.runtime.refreshLocal(header(req, "x-app-client"), body, req.socket.remoteAddress || "unknown"); }
}
@Module({})
export class ManagedLeaseModule {
  static register(runtime: ManagedLeaseRuntime) {
    return { module: ManagedLeaseModule, controllers: [ManagedLeaseController, ManagedLeaseLoginController], providers: [{ provide: MANAGED_LEASE_RUNTIME, useValue: runtime }, ManagedLeaseGuard] };
  }
}
