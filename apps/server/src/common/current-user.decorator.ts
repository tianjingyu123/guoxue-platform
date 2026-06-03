import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/** 从请求中提取当前登录用户ID */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: { id: string } }>();
    return req.user?.id;
  },
);
