import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * 课程创建者资格守卫 — 校验用户是否已通过讲师认证(APPROVED)。
 *
 * 用法（须置于 JwtAuthGuard 之后，依赖 req.user）:
 * @UseGuards(JwtAuthGuard, CourseCreatorGuard)
 *
 * 只有讲师认证状态为 APPROVED 的用户才能发布/管理课程。
 * 未认证 / 审核中 / 已驳回 均抛出 403。
 */
@Injectable()
export class CourseCreatorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException("需通过讲师认证后才能发布或管理课程");

    const cert = await this.prisma.teacherCertification.findUnique({
      where: { userId: user.id },
      select: { status: true },
    });

    if (!cert || cert.status !== "APPROVED") {
      throw new ForbiddenException("需通过讲师认证后才能发布或管理课程");
    }

    return true;
  }
}
