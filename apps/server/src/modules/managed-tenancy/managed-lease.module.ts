import { Body, CanActivate, Controller, ExecutionContext, Get, HttpCode, Inject, Injectable, Module, Param, Post, Put, Query, Req, UseGuards, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { ManagedLeaseRuntime, ManagedResourceKind, ManagedLeaseContext } from "./managed-lease.runtime";
import { ManagedContentKind } from "./managed-lease-content";
import {APP_FILTER} from "@nestjs/core";
import {ManagedLeaseExceptionFilter} from "./managed-lease-exception.filter";

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
  @Get("resources/paged") resourcesPage(@Req() req: ManagedRequest,@Query("kind") kind:ManagedResourceKind,@Query("q") q?:string,@Query("cursor") cursor?:string){return this.runtime.resourcesPage(req.managedContext,kind,q,cursor);}
  @Post("assets") uploadAsset(@Req() req: ManagedRequest, @Body() body: unknown) { return this.runtime.uploadAsset(req.managedContext,body); }
  @Get("assets/:id") asset(@Req() req: ManagedRequest, @Param("id") id: string) { return this.runtime.asset(req.managedContext,id); }
  @Get("manage/:kind") manageList(@Req() req: ManagedRequest, @Param("kind") kind: ManagedContentKind,@Query("cursor") cursor?: string) { return this.runtime.manageList(req.managedContext,kind,cursor); }
  @Post("manage/:kind") manageCreate(@Req() req: ManagedRequest, @Param("kind") kind: ManagedContentKind,@Body() body: unknown) { return this.runtime.manageCreate(req.managedContext,kind,body); }
  @Put("manage/:kind/:id") manageEdit(@Req() req: ManagedRequest, @Param("kind") kind: ManagedContentKind,@Param("id") id: string,@Body() body: unknown) { return this.runtime.manageEdit(req.managedContext,kind,id,body); }
  @Post("manage/:kind/:id/review") managePublish(@Req() req: ManagedRequest, @Param("kind") kind: ManagedContentKind,@Param("id") id: string,@Body() body: unknown) { return this.runtime.managePublish(req.managedContext,kind,id,body); }
  @Get("manage/course/:id/chapters") manageChapters(@Req() req: ManagedRequest,@Param("id") id: string) { return this.runtime.manageChapters(req.managedContext,id); }
  @Post("manage/course/:id/chapters") manageSaveChapter(@Req() req: ManagedRequest,@Param("id") id: string,@Body() body: unknown) { return this.runtime.manageSaveChapter(req.managedContext,id,body); }
  @Get("courses/:id/chapters") chapters(@Req() req: ManagedRequest, @Param("id") id: string) { return this.runtime.courseChapters(req.managedContext, id); }
  @Get("courses/:id/chapters/:chapterId") chapter(@Req() req: ManagedRequest, @Param("id") id: string, @Param("chapterId") chapterId: string) { return this.runtime.courseChapter(req.managedContext, id, chapterId); }
  @Get("courses/:id/progress") progress(@Req() req: ManagedRequest, @Param("id") id: string) { return this.runtime.courseProgress(req.managedContext, id); }
  @Put("courses/:id/chapters/:chapterId/progress") saveProgress(@Req() req: ManagedRequest, @Param("id") id: string, @Param("chapterId") chapterId: string, @Body() body: unknown) { return this.runtime.updateCourseProgress(req.managedContext, id, chapterId, body); }
  @Put("products") products(@Req() req: ManagedRequest, @Body() body: unknown) { return this.runtime.updateProducts(req.managedContext, body); }
  @Post("circles") circles(@Req() req: ManagedRequest, @Body() body: { name: string; intro: string }) { return this.runtime.createCircle(req.managedContext, body); }
  @Get("circles/:id") circle(@Req() req: ManagedRequest,@Param("id") id:string) {return this.runtime.circleOperation(req.managedContext,id,"detail");}
  @Post("circles/:id/join") joinCircle(@Req() req: ManagedRequest,@Param("id") id:string,@Body() body:unknown) {return this.runtime.circleOperation(req.managedContext,id,"join",body);}
  @Post("circles/:id/leave") leaveCircle(@Req() req: ManagedRequest,@Param("id") id:string,@Body() body:unknown) {return this.runtime.circleOperation(req.managedContext,id,"leave",body);}
  @Get("circles/:id/requests") circleRequests(@Req() req: ManagedRequest,@Param("id") id:string,@Query("cursor") cursor?:string) {return this.runtime.circleOperation(req.managedContext,id,"requests",undefined,"",cursor);}
  @Post("circles/:id/requests/:requestId/review") reviewCircleRequest(@Req() req: ManagedRequest,@Param("id") id:string,@Param("requestId") requestId:string,@Body() body:unknown) {return this.runtime.circleOperation(req.managedContext,id,"reviewJoin",body,requestId);}
  @Get("circles/:id/members") circleMembers(@Req() req: ManagedRequest,@Param("id") id:string,@Query("cursor") cursor?:string) {return this.runtime.circleOperation(req.managedContext,id,"members",undefined,"",cursor);}
  @Post("circles/:id/members/:userId/mute") muteCircleMember(@Req() req: ManagedRequest,@Param("id") id:string,@Param("userId") userId:string,@Body() body:unknown) {return this.runtime.circleOperation(req.managedContext,id,"mute",body,userId);}
  @Get("circles/:id/posts") circlePosts(@Req() req: ManagedRequest,@Param("id") id:string,@Query("cursor") cursor?:string) {return this.runtime.circleOperation(req.managedContext,id,"posts",undefined,"",cursor);}
  @Get("circles/:id/moderation") circleModeration(@Req() req: ManagedRequest,@Param("id") id:string,@Query("cursor") cursor?:string) {return this.runtime.circleOperation(req.managedContext,id,"moderation",undefined,"",cursor);}
  @Post("circles/:id/posts") createCirclePost(@Req() req: ManagedRequest,@Param("id") id:string,@Body() body:unknown) {return this.runtime.circleOperation(req.managedContext,id,"createPost",body);}
  @Put("circles/:id/posts/:postId") editCirclePost(@Req() req: ManagedRequest,@Param("id") id:string,@Param("postId") postId:string,@Body() body:unknown) {return this.runtime.circleOperation(req.managedContext,id,"editPost",body,postId);}
  @Post("circles/:id/posts/:postId/review") reviewCirclePost(@Req() req: ManagedRequest,@Param("id") id:string,@Param("postId") postId:string,@Body() body:unknown) {return this.runtime.circleOperation(req.managedContext,id,"reviewPost",body,postId);}
  @Get("orders/:id") order(@Req() req: ManagedRequest, @Param("id") id: string) { return this.runtime.order(req.managedContext, id); }
  @Get("orders") orders(@Req() req: ManagedRequest,@Query("cursor") cursor?:string) {return this.runtime.orders(req.managedContext,cursor);}
  @Post("orders/products") createProductOrder(@Req() req: ManagedRequest,@Body() body:unknown) {return this.runtime.createOrder(req.managedContext,"product",body);}
  @Post("orders/courses") createCourseOrder(@Req() req: ManagedRequest,@Body() body:unknown) {return this.runtime.createOrder(req.managedContext,"course",body);}
  @Post("orders/:id/cancel") cancelOrder(@Req() req: ManagedRequest,@Param("id") id:string,@Body() body:unknown) {return this.runtime.cancelOrder(req.managedContext,id,body);}
  @Get("addresses") addresses(@Req() req: ManagedRequest) {return this.runtime.addresses(req.managedContext);}
  @Post("addresses") createAddress(@Req() req: ManagedRequest,@Body() body:unknown) {return this.runtime.saveAddress(req.managedContext,body);}
  @Put("addresses/:id") editAddress(@Req() req: ManagedRequest,@Param("id") id:string,@Body() body:unknown) {return this.runtime.saveAddress(req.managedContext,body,id);}
  @Get("agents/:id/knowledge") knowledge(@Req() req: ManagedRequest, @Param("id") id: string, @Query("q") q: string) { return this.runtime.knowledge(req.managedContext, id, q); }
  @Post("chats") createChat(@Req() req: ManagedRequest,@Body() body:unknown) {return this.runtime.createChat(req.managedContext,body);}
  @Get("chats") chats(@Req() req: ManagedRequest,@Query("cursor") cursor?:string) {return this.runtime.chatList(req.managedContext,cursor);}
  @Get("chats/:id/messages") chatMessages(@Req() req: ManagedRequest,@Param("id") id:string,@Query("after") after?:string) {return this.runtime.chatMessages(req.managedContext,id,after);}
  @Post("chats/:id/messages") sendChat(@Req() req: ManagedRequest,@Param("id") id:string,@Body() body:unknown) {return this.runtime.sendChat(req.managedContext,id,body);}
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
@Controller("lease")
export class ManagedLeasePublicController{
  constructor(@Inject(MANAGED_LEASE_RUNTIME) private readonly runtime:ManagedLeaseRuntime){}
  @Get("bootstrap") bootstrap(@Req() req:Request){return this.runtime.bootstrap(header(req,"x-app-client"));}
}
@Module({})
export class ManagedLeaseModule {
  static register(runtime: ManagedLeaseRuntime) {
    return { module: ManagedLeaseModule, controllers: [ManagedLeaseController, ManagedLeaseLoginController,ManagedLeasePublicController], providers: [{ provide: MANAGED_LEASE_RUNTIME, useValue: runtime }, ManagedLeaseGuard,{provide:APP_FILTER,useClass:ManagedLeaseExceptionFilter}] };
  }
}
