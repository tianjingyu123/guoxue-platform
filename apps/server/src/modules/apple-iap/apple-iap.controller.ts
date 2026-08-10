import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { AppleIapNotificationDto, VerifyAppleIapPurchaseDto } from "./apple-iap.dto";
import { AppleIapService } from "./apple-iap.service";

@ApiTags("Apple 应用内购买")
@Controller("apple-iap")
export class AppleIapController {
  constructor(private readonly appleIap: AppleIapService) {}

  @Get("products")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @ApiOperation({ summary: "获取当前 iOS 可购买的国学币商品" })
  getProducts() {
    return this.appleIap.getProducts();
  }

  @Post("verify")
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ActiveUserGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "验证 Apple 交易并幂等发放国学币" })
  @ApiResponse({ status: 200, description: "验签成功并到账，或该账号已到账" })
  verify(@Req() req: Request, @Body() dto: VerifyAppleIapPurchaseDto) {
    return this.appleIap.verifyPurchase(req.user.id, dto);
  }

  @Post("notifications")
  @HttpCode(200)
  @ApiOperation({ summary: "接收 App Store Server Notifications V2" })
  @ApiResponse({ status: 200, description: "通知已验签并处理" })
  notifications(@Body() dto: AppleIapNotificationDto) {
    return this.appleIap.handleNotification(dto.signedPayload);
  }
}
