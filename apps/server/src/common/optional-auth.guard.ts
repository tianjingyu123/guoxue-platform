import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** 可选鉴权守卫：有 JWT 时解析用户，无 JWT 时放通（req.user = undefined） */
@Injectable()
export class OptionalAuthGuard extends AuthGuard("jwt") {
  handleRequest(err: any, user: any) {
    return user || undefined;
  }
}
