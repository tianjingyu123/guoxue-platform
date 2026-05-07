import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards,
} from "@nestjs/common";
import { InteractionService } from "./interaction.service";
import {
  LikeDto, CreateCommentDto, CollectDto,
  FollowDto, ReportDto, CommentListQueryDto, ReportListQueryDto,
} from "./interaction.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@Controller("interaction")
export class InteractionController {
  constructor(private svc: InteractionService) {}

  // ───────── 点赞 ─────────

  @Post("like")
  @UseGuards(JwtAuthGuard)
  toggleLike(@Req() req: any, @Body() dto: LikeDto) {
    return this.svc.toggleLike(req.user.id, dto);
  }

  @Get("like/check")
  @UseGuards(JwtAuthGuard)
  checkLiked(@Req() req: any, @Query("targetType") targetType: string, @Query("targetIds") targetIds: string) {
    return this.svc.isLiked(req.user.id, targetType, targetIds.split(","));
  }

  @Get("like/count")
  likeCount(@Query("targetType") targetType: string, @Query("targetId") targetId: string) {
    return this.svc.getLikeCount(targetType, targetId);
  }

  // ───────── 评论 ─────────

  @Post("comment")
  @UseGuards(JwtAuthGuard)
  createComment(@Req() req: any, @Body() dto: CreateCommentDto) {
    return this.svc.createComment(req.user.id, dto);
  }

  @Get("comment")
  listComments(@Query() q: CommentListQueryDto) {
    return this.svc.listComments(q);
  }

  @Delete("comment/:id")
  @UseGuards(JwtAuthGuard)
  deleteComment(@Param("id") id: string, @Req() req: any) {
    return this.svc.deleteComment(id, req.user.id);
  }

  @Put("comment/:id/hide")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  hideComment(@Param("id") id: string) {
    return this.svc.hideComment(id);
  }

  // ───────── 收藏 ─────────

  @Post("collect")
  @UseGuards(JwtAuthGuard)
  toggleCollect(@Req() req: any, @Body() dto: CollectDto) {
    return this.svc.toggleCollect(req.user.id, dto);
  }

  @Get("collect")
  @UseGuards(JwtAuthGuard)
  myCollects(@Req() req: any, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getUserCollects(req.user.id, +page, +pageSize);
  }

  // ───────── 关注 ─────────

  @Post("follow")
  @UseGuards(JwtAuthGuard)
  toggleFollow(@Req() req: any, @Body() dto: FollowDto) {
    return this.svc.toggleFollow(req.user.id, dto);
  }

  @Get("followers/:userId")
  getFollowers(@Param("userId") userId: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getFollowers(userId, +page, +pageSize);
  }

  @Get("following/:userId")
  getFollowing(@Param("userId") userId: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getFollowing(userId, +page, +pageSize);
  }

  // ───────── 举报 ─────────

  @Post("report")
  @UseGuards(JwtAuthGuard)
  report(@Req() req: any, @Body() dto: ReportDto) {
    return this.svc.report(req.user.id, dto);
  }

  @Get("report")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  listReports(@Query() q: ReportListQueryDto) {
    return this.svc.listReports(q);
  }

  @Put("report/:id/process")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  processReport(@Param("id") id: string, @Body("result") result?: string) {
    return this.svc.processReport(id, result);
  }

  @Put("report/:id/dismiss")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  dismissReport(@Param("id") id: string) {
    return this.svc.dismissReport(id);
  }
}
