import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** 可选鉴权守卫：有 JWT 时解析用户，无 JWT 时放通（req.user = undefined） */
@Injectable()
export class OptionalAuthGuard extends AuthGuard("jwt") {
  // NestJS Passport 框架方法签名强制使用 any（父类泛型 TUser 无更具体约束）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(_err: any, user: any) {
    return user || undefined;
  }
}
