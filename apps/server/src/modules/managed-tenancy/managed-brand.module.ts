import { Body, Controller, Get, Module, Param, Post, Put,Query,Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { ShopModule } from "../shop/shop.module";
import { ManagedBrandService } from "./managed-brand.service";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import {CourseModule} from "../course/course.module";

@Controller("managed/brand")
@UseGuards(JwtAuthGuard)
export class ManagedBrandController {
  constructor(private readonly service: ManagedBrandService) {}
  private key(req: Request) { return req.headers["x-app-client"] as string; }
  @Get("context") context(@Req() req: Request) { return this.service.context(this.key(req), req.user!.id); }
  @Get("products") products(@Req() req: Request) { return this.service.products(this.key(req), req.user!.id); }
  @Get("courses") courses(@Req() req:Request){return this.service.courses(this.key(req),req.user!.id);}
  @Post("orders/courses") purchase(@Req() req:Request,@Body() body:Parameters<ManagedBrandService["createCourseOrder"]>[2]){return this.service.createCourseOrder(this.key(req),req.user!.id,body);}
  @Get("courses/:id/chapters") chapters(@Req() req:Request,@Param("id") id:string){return this.service.courseChapters(this.key(req),req.user!.id,id);}
  @Get("courses/:id/chapters/:chapterId") chapter(@Req() req:Request,@Param("id") id:string,@Param("chapterId") chapterId:string){return this.service.courseChapter(this.key(req),req.user!.id,id,chapterId);}
  @Get("courses/:id/progress") progress(@Req() req:Request,@Param("id") id:string){return this.service.courseProgress(this.key(req),req.user!.id,id);}
  @Put("courses/:id/chapters/:chapterId/progress") updateProgress(@Req() req:Request,@Param("id") id:string,@Param("chapterId") chapterId:string,@Body() body:{progress:number}){return this.service.updateCourseProgress(this.key(req),req.user!.id,id,chapterId,body);}
  @Get("presentation") presentation(@Req() req: Request) { return this.service.presentation(this.key(req), req.user!.id, req.headers["x-native-build"] as string || "", req.headers["x-client-capabilities"] as string || "", req.headers["x-resource-version"] as string || "0"); }
  @Post("orders") create(@Req() req: Request, @Body() body: Parameters<ManagedBrandService["createOrder"]>[2]) { return this.service.createOrder(this.key(req), req.user!.id, body); }
  @Get("orders/:id") order(@Req() req: Request, @Param("id") id: string) { return this.service.order(this.key(req), req.user!.id, id); }
  @Get("orders") orders(@Req() req:Request,@Query("cursor") cursor?:string){return this.service.orderList(this.key(req),req.user!.id,cursor);}
  @Post("orders/:id/confirm") confirm(@Req() req:Request,@Param("id") id:string,@Body() body:unknown){return this.service.confirmOrder(this.key(req),req.user!.id,id,body);}
  @Post("orders/:id/cancel") cancel(@Req() req:Request,@Param("id") id:string,@Body() body:unknown){return this.service.cancelOrder(this.key(req),req.user!.id,id,body);}
  @Post("after-sales/:id/cancel") cancelAfterSale(@Req() req:Request,@Param("id") id:string,@Body() body:unknown){return this.service.cancelAfterSale(this.key(req),req.user!.id,id,body);}
  @Post("after-sales/:id/return-logistics") logistics(@Req() req:Request,@Param("id") id:string,@Body() body:Parameters<ManagedBrandService["returnLogistics"]>[3]){return this.service.returnLogistics(this.key(req),req.user!.id,id,body);}
  @Post("orders/:id/after-sale") aftersale(@Req() req:Request,@Param("id") id:string,@Body() body:Parameters<ManagedBrandService["applyAfterSale"]>[3]){return this.service.applyAfterSale(this.key(req),req.user!.id,id,body);}
  @Get("orders/:id/after-sales") aftersales(@Req() req:Request,@Param("id") id:string,@Query("page") page?:string){return this.service.afterSales(this.key(req),req.user!.id,id,page===undefined?1:Number(page));}
  @Get("operator-summary") summary(@Req() req: Request) { return this.service.operatorSummary(this.key(req), req.user!.id); }
}
@Controller("admin/managed-brand-orders")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN")
export class ManagedBrandMaintenanceController {
  constructor(private readonly service: ManagedBrandService) {}
  @Get(":customerId/pending") pending(@Param("customerId") customerId: string) { return this.service.pendingRequests(customerId); }
  @Post(":customerId/:id/reconcile") reconcile(@Param("customerId") customerId: string, @Param("id") id: string, @Body() payload: { reason: string }, @Req() req: Request) { return this.service.reconcileRequest(customerId, id, payload, req.user!.id); }
}
@Module({ imports: [ShopModule,CourseModule], controllers: [ManagedBrandController, ManagedBrandMaintenanceController], providers: [ManagedBrandService] })
export class ManagedBrandModule {}
