import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

export interface BehaviorEventPayload {
  userId: string;
  targetType: string;
  targetId: string;
  behavior: string;
  weight?: number;
  scene?: string;
}

@Injectable()
export class BehaviorService {
  private readonly logger = new Logger(BehaviorService.name);
  constructor(private prisma: PrismaService) {}

  // 异步记录用户行为（fire-and-forget，不阻塞主流程）
  async record(payload: BehaviorEventPayload) {
    this.prisma.userBehavior
      .create({
        data: {
          userId: payload.userId,
          targetType: payload.targetType,
          targetId: payload.targetId,
          behavior: payload.behavior as any,
          weight: payload.weight ?? this.defaultWeight(payload.behavior),
          scene: payload.scene,
        },
      })
      .catch((err) => this.logger.warn("用户行为写入失败", err));
  }

  private defaultWeight(behavior: string): number {
    const weights: Record<string, number> = {
      VIEW: 0.5,
      LIKE: 1,
      COLLECT: 2,
      COMMENT: 1.5,
      PURCHASE: 5,
      LEARN: 3,
      SEARCH: 0.5,
      SHARE: 2,
      FOLLOW: 1,
    };
    return weights[behavior] ?? 1;
  }
}
