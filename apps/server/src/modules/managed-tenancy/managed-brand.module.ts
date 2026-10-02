import { Body, Controller, Get, Module, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { ShopModule } from "../shop/shop.module";
import { ManagedBrandService } from "./managed-brand.service";

@Controller("managed/brand")
@UseGuards(JwtAuthGuard)
export class ManagedBrandController {
  constructor(private readonly service: ManagedBrandService) {}
  private key(req: Request) { return req.headers["x-app-client"] as string; }
  @Get("context") context(@Req() req: Request) { return this.service.context(this.key(req), req.user!.id); }
  @Get("products") products(@Req() req: Request) { return this.service.products(this.key(req), req.user!.id); }
  @Get("presentation") presentation(@Req() req: Request) { return this.service.presentation(this.key(req), req.user!.id, req.headers["x-native-build"] as string || "", req.headers["x-client-capabilities"] as string || "", req.headers["x-resource-version"] as string || "0"); }
  @Post("orders") create(@Req() req: Request, @Body() body: Parameters<ManagedBrandService["createOrder"]>[2]) { return this.service.createOrder(this.key(req), req.user!.id, body); }
  @Get("orders/:id") order(@Req() req: Request, @Param("id") id: string) { return this.service.order(this.key(req), req.user!.id, id); }
  @Get("operator-summary") summary(@Req() req: Request) { return this.service.operatorSummary(this.key(req), req.user!.id); }
}
@Module({ imports: [ShopModule], controllers: [ManagedBrandController], providers: [ManagedBrandService] })
export class ManagedBrandModule {}
