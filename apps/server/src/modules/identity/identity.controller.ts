import { Controller, Post, Get, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { IdentityService } from "./identity.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { IdCardOcrDto, IdCardVerifyDto, FaceTokenDto } from "./identity.dto";

@ApiTags("实名认证")
@ApiBearerAuth()
@Controller("identity")
@UseGuards(JwtAuthGuard)
export class IdentityController {
  constructor(private svc: IdentityService) {}

  @Post("ocr")
  @ApiOperation({ summary: "身份证OCR识别" })
  ocr(@Body() body: IdCardOcrDto) {
    return this.svc.idCardOcr(body);
  }

  @Post("verify")
  @ApiOperation({ summary: "身份证二要素核验（姓名+身份证号）" })
  verify(@Body() body: IdCardVerifyDto) {
    return this.svc.idCardVerification(body.name, body.idCard);
  }

  @Post("face/token")
  @ApiOperation({ summary: "获取人脸核身URL" })
  faceToken(@Body() body: FaceTokenDto) {
    return this.svc.getFaceIdToken(body.name, body.idCard, body.returnUrl);
  }

  @Get("face/result/:token")
  @ApiOperation({ summary: "查询人脸核身结果" })
  faceResult(@Param("token") token: string) {
    return this.svc.getFaceIdResult(token);
  }
}
