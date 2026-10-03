import { CanActivate, ExecutionContext, Injectable, NotFoundException } from "@nestjs/common";
import { FeatureFlagService } from "../feature-flag/feature-flag.service";
import { PrismaService } from "../../prisma/prisma.service";

/** 新开播凭证受运营裁决；已在直播中的房间可续期凭证，房主权限仍由业务服务核验。 */
@Injectable()
export class LiveCredentialsGuard implements CanActivate {
  constructor(
    private readonly flags: FeatureFlagService,
    private readonly prisma: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const scope = await this.flags.requestScope(req);
    const state = await this.flags.getOperationState(
      "live_start",
      req.user?.id,
      scope,
      String(req.headers["x-native-build"] || ""),
    );
    if (state === "OPEN") return true;
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: req.params.id },
      select: { status: true },
    });
    if (room?.status === "LIVING") return true;
    throw new NotFoundException("当前暂不开放新开播凭证");
  }
}
