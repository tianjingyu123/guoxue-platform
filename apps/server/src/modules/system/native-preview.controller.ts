import { Body, Controller, Get, Header, Put, Req, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, Matches } from "class-validator";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RedLine, RedLineGate } from "../../common/red-lines";
import { NativePreviewService } from "./native-preview.service";

export class SetNativePreviewDto {
  @IsOptional()
  @IsIn(["legacy", "native"])
  mode?: "legacy" | "native";

  @IsBoolean()
  enabled!: boolean;

  @Matches(/^[a-f0-9]{64}$/)
  expectedRevision!: string;
}

@ApiExcludeController()
@Controller("system/native-paipan-preview")
@UseGuards(JwtAuthGuard)
export class NativePreviewController {
  constructor(private readonly preview: NativePreviewService) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  get(@Req() req: { user: { id: string } }) {
    return this.preview.get(req.user.id);
  }

  @Put()
  @RedLineGate(RedLine.COMPLIANCE)
  @Header("Cache-Control", "private, no-store")
  set(@Req() req: { user: { id: string } }, @Body() body: SetNativePreviewDto) {
    return this.preview.set(req.user.id, body.enabled, body.expectedRevision, body.mode);
  }
}
